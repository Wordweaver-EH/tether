// Game-agnostic, two-player exploit search. Game details live in a search adapter.
import { Worker } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const workerUrl = new URL('./search-worker.mjs', import.meta.url);
const clamp = (x) => Math.max(0, Math.min(1, x));
const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
export function wilson(outcomes) {
  const n = outcomes.length;
  if (!n) return { mean: null, lo: null, hi: null, n: 0 };
  const p = mean(outcomes), z = 1.96, den = 1 + z * z / n;
  const centre = (p + z * z / (2 * n)) / den;
  const half = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den;
  return { mean: p, lo: Math.max(0, centre - half),
    hi: Math.min(1, centre + half), n };
}
export function parseArgs(argv) {
  const o = { adapter: './arena/tether-search-adapter.mjs', condition: 'baseline',
    mode: 'both', seed: 431, workers: Math.min(8, Math.max(1, availableParallelism() - 2)),
    budgetMin: 25, generations: 0, evalSeconds: 45, validationSeconds: 300, validationSeeds: 12,
    out: './reports/phase4a-search-baseline.json' };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (!Object.hasOwn(o, key)) throw new RangeError(`unknown search option ${argv[i]}`);
    o[key] = argv[++i];
  }
  for (const key of ['seed', 'workers', 'budgetMin', 'generations', 'evalSeconds', 'validationSeconds', 'validationSeeds'])
    o[key] = Number(o[key]);
  if (!['es', 'coevo', 'both'].includes(o.mode) || !Number.isInteger(o.workers) ||
      o.workers < 1 || o.workers > 8 || !Number.isSafeInteger(o.seed) ||
      !Number.isFinite(o.budgetMin) || o.budgetMin <= 0 ||
      !Number.isInteger(o.generations) || o.generations < 0 ||
      !Number.isFinite(o.evalSeconds) || o.evalSeconds <= 0 ||
      !Number.isFinite(o.validationSeconds) || o.validationSeconds <= 0 ||
      !Number.isInteger(o.validationSeeds) || o.validationSeeds < 1)
    throw new RangeError('invalid search options');
  return o;
}
function randomSource(seed) {
  let x = (seed >>> 0) || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 0x100000000; };
}
function mutate(vector, random, sigma = 0.16) {
  return vector.map((v) => clamp(v + sigma * (random() + random() + random() + random() - 2)));
}
export function workerPool(adapterUrl, condition, n) {
  const workers = Array.from({ length: n }, () => new Worker(workerUrl,
    { workerData: { adapterUrl, condition } }));
  return {
    async run(tasks) {
      if (!tasks.length) return [];
      const groups = Array.from({ length: workers.length }, () => []);
      tasks.forEach((task, i) => groups[i % workers.length].push(task));
      const portions = await Promise.all(workers.map((worker, i) => new Promise((ok, fail) => {
        if (!groups[i].length) { ok([]); return; }
        const onError = (error) => { worker.off('message', onMessage); fail(error); };
        const onMessage = (message) => { worker.off('error', onError);
          message.error ? fail(new Error(message.error)) : ok(message.results); };
        worker.once('message', onMessage);
        worker.once('error', onError);
        worker.postMessage(groups[i]);
      })));
      return portions.flat();
    },
    async close() { await Promise.all(workers.map((worker) => worker.terminate())); },
  };
}
function task(candidate, opponent, seed, seconds, mode, seat = seed % 2 ? 0 : 1) {
  const first = seat === 0 ? candidate : opponent;
  const second = seat === 0 ? opponent : candidate;
  return { first, second, seed, seconds, mode, candidateName: candidate.name };
}
// Every held-out seed occurs in both seats in EVERY mode. Seed parity must
// never choose mode: doing so confounds perception with spawn-side advantage.
export function balancedTasks(candidate, opponents, baseSeed, seconds, modes, count) {
  return opponents.flatMap((opponent) => Array.from({ length: count }, (_, k) =>
    modes.flatMap((mode) => [0, 1].map((seat) =>
      task(candidate, opponent, baseSeed + k, seconds, mode, seat)))).flat());
}
// Seed-cluster bootstrap respects matched mode/seat/opponent observations.
// The statistic is win points (win=1, draw=.5), NOT Bernoulli win probability.
export function pairedInterval(rows, name, ids) {
  const groups = new Map();
  for (const row of rows) {
    const scores = groups.get(row.seed) ?? [];
    scores.push(candidateOutcome(row, name, ids)); groups.set(row.seed, scores);
  }
  const values = [...groups.values()].map(mean), random = randomSource(98317);
  if (!values.length) return { mean: null, lo: null, hi: null, n: 0, clusters: 0 };
  const samples = Array.from({ length: 2000 }, () => mean(values.map(() =>
    values[Math.floor(random() * values.length)]))).sort((a, b) => a - b);
  return { mean: mean(values), lo: values.length < 2 ? null : samples[49],
    hi: values.length < 2 ? null : samples[1949], n: rows.length,
    clusters: values.length, method: 'seed-cluster percentile bootstrap, 2000 replicates; win=1 draw=0.5' };
}
export async function sourceFingerprint(root) {
  const hash = createHash('sha256'), files = [];
  async function visit(dir) {
    for (const entry of (await readdir(resolve(root, dir), { withFileTypes: true }))
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) await visit(path);
      else if (/\.(mjs|js)$/.test(entry.name)) {
        const contents = await readFile(resolve(root, path));
        files.push({ path, sha256: createHash('sha256').update(contents).digest('hex') });
        hash.update(path).update('\0').update(contents).update('\0');
      }
    }
  }
  await visit('src'); await visit('arena');
  return { sha256: hash.digest('hex'), files };
}
function spec(candidate) { return { kind: 'policy', vector: candidate.vector, name: candidate.name }; }
export function trainingTasks(candidate, opponents, baseSeed, seconds, modes, count = 1) {
  return balancedTasks(spec(candidate), opponents.filter((opponent) => opponent.name !== candidate.name),
    baseSeed, seconds, Array.isArray(modes) ? modes : [modes], count);
}
export const assignedRows = (rows, name) => rows.filter((row) => row.candidateName === name);
function candidateOutcome(row, candidateName, ids) {
  const firstWins = row.score[ids[0]] > row.score[ids[1]] ? 1 :
    row.score[ids[0]] < row.score[ids[1]] ? 0 : 0.5;
  return row.first.name === candidateName ? firstWins : 1 - firstWins;
}
export function summarizeRows(rows, name, ids, summarizeMetrics) {
  const outcomes = rows.map((row) => candidateOutcome(row, name, ids));
  return { winRate: pairedInterval(rows, name, ids),
    wins: outcomes.filter((x) => x === 1).length, draws: outcomes.filter((x) => x === 0.5).length,
    losses: outcomes.filter((x) => x === 0).length, metrics: summarizeMetrics(rows, name),
    exampleSeeds: rows.filter((r) => candidateOutcome(r, name, ids) !== 0.5)
    .slice(0, 3).map((r) => ({ seed: r.seed, mode: r.mode,
      seat: r.first.name === name ? 'P1' : 'P2', score: r.score })) };
}

export async function search(config, { onProgress } = {}) {
  const started = Date.now(), random = randomSource(config.seed);
  const adapterUrl = pathToFileURL(resolve(config.adapter)).href;
  const searchAdapter = await import(adapterUrl);
  const source = await sourceFingerprint(resolve(dirname(fileURLToPath(adapterUrl)), '..'));
  if (!searchAdapter.conditions[config.condition]) throw new RangeError('unknown condition');
  const ids = searchAdapter.adapter.playerIds;
  const visionModes = searchAdapter.adapter.modes;
  const pool = workerPool(adapterUrl, config.condition, config.workers);
  const named = searchAdapter.opponents.map((name) => ({ kind: 'named', name }));
  const hall = [], generations = [], modes = config.mode === 'both' ? ['es', 'coevo'] : [config.mode];
  let bouts = 0, serial = 0;
  const budgetMs = config.budgetMin * 60000;
  try {
    const seedPolicies = Object.entries(searchAdapter.policy.seeds).map(([name, vector]) =>
      ({ name: `seed-${name}`, vector }));
    const initial = [...seedPolicies];
    for (const mode of modes) {
      const deadline = started + budgetMs * (mode === 'es' && modes.length === 2 ? 0.4 : 0.8);
      let centre = seedPolicies[mode === 'es' ? 0 : 1];
      let gen = 0;
      do {
        const candidates = gen === 0 ? initial : Array.from({ length: 8 }, (_, i) => ({
          name: `${mode}-${++serial}`,
          vector: mutate((i < 5 ? centre : hall[Math.floor(random() * hall.length)] ?? centre).vector,
            random, Math.max(0.07, 0.2 - gen * 0.004)),
        }));
        const opponents = mode === 'es' ?
          [named.find((x) => x.name === 'directShooter'),
            named.find((x) => x.name === 'immediateRecaller'),
            named.find((x) => x.name === 'reactiveDodger'),
            named.find((x) => x.name === 'embedWaiter'),
            named.find((x) => x.name === 'mind-tuned')].filter(Boolean) :
          [...named.filter((x) => ['directShooter', 'immediateRecaller',
            'reactiveDodger', 'mind-tuned'].includes(x.name)), ...hall.slice(0, 3).map(spec)];
        const tasks = candidates.flatMap((candidate, i) =>
          trainingTasks(candidate, opponents, config.seed + gen * 10000,
            config.evalSeconds, visionModes, 1));
        const rows = await pool.run(tasks); bouts += rows.length;
        const ranked = candidates.map((candidate) => {
          const mine = assignedRows(rows, candidate.name);
          const wins = mine.map((r) => candidateOutcome(r, candidate.name, ids));
          const margin = mean(mine.map((r) => (r.first.name === candidate.name ? 1 : -1) *
            (r.score[ids[0]] - r.score[ids[1]])));
          return { ...candidate, fitness: mean(wins) + 0.003 * Math.tanh(margin / 12),
            trainWinRate: mean(wins), trainMargin: margin };
        }).sort((a, b) => b.fitness - a.fitness);
        centre = ranked[0];
        for (const c of ranked.slice(0, 2)) {
          if (!hall.some((h) => h.vector.every((v, i) => v === c.vector[i]))) hall.push(c);
        }
        hall.sort((a, b) => b.fitness - a.fitness);
        hall.length = Math.min(8, hall.length);
        generations.push({ mode, generation: gen++, best: centre.name,
          fitness: centre.fitness, bouts: rows.length });
        await onProgress?.({ stage: 'training', mode, generation: gen, bouts, elapsedSec: (Date.now() - started) / 1000 });
      } while (config.generations > 0 ? gen < config.generations : Date.now() < deadline);
    }
    const finalists = [...new Map([...hall, ...seedPolicies].map((p) =>
      [p.name, p])).values()].slice(0, 3);
    const champions = [];
    for (const candidate of finalists) {
      const rivals = [...named, ...hall.filter((x) => x.name !== candidate.name).map(spec)];
      const tasks = balancedTasks(spec(candidate), rivals, config.seed + 900000,
        config.validationSeconds ?? searchAdapter.validationSeconds, visionModes, config.validationSeeds);
      const rows = await pool.run(tasks); bouts += rows.length;
      await onProgress?.({ stage: 'validation', candidate: candidate.name, bouts, elapsedSec: (Date.now() - started) / 1000 });
      const byOpponent = Object.fromEntries(rivals.map((opponent) =>
        [opponent.name, summarizeRows(rows.filter((r) =>
          r.first.name === opponent.name || r.second.name === opponent.name),
        candidate.name, ids, searchAdapter.summarizeSearchMetrics)]));
      champions.push({ name: candidate.name, vector: candidate.vector,
        parameters: searchAdapter.policy.interpret(candidate.vector),
        training: { winRate: candidate.trainWinRate, margin: candidate.trainMargin },
        validation: byOpponent,
        byMode: Object.fromEntries(visionModes.map((mode) => [mode,
          summarizeRows(rows.filter((r) => r.mode === mode), candidate.name, ids, searchAdapter.summarizeSearchMetrics)])),
        overall: summarizeRows(rows, candidate.name, ids,
          searchAdapter.summarizeSearchMetrics) });
    }
    const sourceAtEnd = await sourceFingerprint(resolve(dirname(fileURLToPath(adapterUrl)), '..'));
    return { schema: 'codegame-search-v2-balanced', source,
      sourceUnchanged: source.sha256 === sourceAtEnd.sha256, sourceAtEnd: sourceAtEnd.sha256, metricVersion: searchAdapter.metricVersion,
      condition: config.condition, override: searchAdapter.conditions[config.condition],
      config, startedUtc: new Date(started).toISOString(),
      elapsedSec: (Date.now() - started) / 1000, bouts,
      generations, hallOfFame: hall, champions };
  } finally { await pool.close(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = parseArgs(process.argv.slice(2));
  const result = await search(config);
  await mkdir(dirname(resolve(config.out)), { recursive: true });
  await writeFile(config.out, `${JSON.stringify(result, null, 2)}\n`);
  if (!result.sourceUnchanged) process.exitCode = 1;
  console.log(JSON.stringify({ condition: result.condition, sourceUnchanged: result.sourceUnchanged, bouts: result.bouts,
    elapsedSec: result.elapsedSec, champions: result.champions.map((c) =>
      ({ name: c.name, overall: c.overall.winRate,
        spear: c.overall.metrics })) }, null, 2));
}
