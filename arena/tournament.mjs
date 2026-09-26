import { Worker } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

function options(argv) {
  const o = { n: 8, keyN: 192,
    workers: Math.min(8, Math.max(1, availableParallelism() - 2)),
    durationSec: null, out: 'reports/tournament', adapter: null, policy: null };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    if (!(key in o)) throw new Error(`unknown option ${argv[i]}`);
    o[key] = argv[++i];
  }
  for (const key of ['n', 'keyN', 'workers']) o[key] = Number(o[key]);
  if (o.durationSec !== null) o.durationSec = Number(o.durationSec);
  if (!Number.isInteger(o.n) || o.n < 1 || !Number.isInteger(o.keyN) || o.keyN < 1 ||
      !Number.isInteger(o.workers) || o.workers < 1 || o.workers > 8 ||
      (o.durationSec !== null && (!Number.isFinite(o.durationSec) || o.durationSec <= 0)))
    throw new RangeError('invalid tournament option');
  return o;
}

export function wilson(mean, n) {
  const z2 = 1.96 ** 2, denominator = 1 + z2 / n;
  const center = (mean + z2 / (2 * n)) / denominator;
  const half = 1.96 * Math.sqrt((mean * (1 - mean) + z2 / (4 * n)) / n) /
    denominator;
  return { mean, lo: Math.max(0, center - half),
    hi: Math.min(1, center + half), n };
}
const confidence = (values) => values.length ?
  wilson(values.reduce((a, b) => a + b, 0) / values.length, values.length) :
  { mean: null, lo: null, hi: null, n: 0 };
const average = (values) => values.length ?
  values.reduce((a, b) => a + b, 0) / values.length : 0;
const percent = (value) => value === null ? '—' : `${(value * 100).toFixed(1)}%`;

export function summarize(results, variants, config = {}, adapter = {}) {
  const [firstId, secondId] = adapter.playerIds ?? Object.keys(results[0]?.score ?? {});
  if (!firstId || !secondId) throw new TypeError('two player score keys are required');
  const pairs = {}, pairsCombined = {}, byVariant = {};
  const modes = adapter.modes ?? [...new Set(results.map((row) => row.mode))];
  for (const variant of variants)
    byVariant[variant.name] = { outcomes: [], margins: [] };
  for (const row of results) {
    const a = variants[row.first].name, b = variants[row.second].name;
    const sa = row.score[firstId], sb = row.score[secondId];
    const outcome = sa > sb ? 1 : sa < sb ? 0 : 0.5;
    const pairName = [a, b].sort().join(' vs ');
    const pairRow = { winner: sa === sb ? null : sa > sb ? a : b,
      a, b, outcome, margin: sa - sb };
    (pairs[`${pairName} ${row.mode}`] ??= []).push(pairRow);
    (pairsCombined[pairName] ??= []).push(pairRow);
    byVariant[a].outcomes.push(outcome);
    byVariant[a].margins.push(sa - sb);
    byVariant[b].outcomes.push(1 - outcome);
    byVariant[b].margins.push(sb - sa);
  }
  const pairSummary = (source) => Object.fromEntries(Object.entries(source).map(([key, rows]) => {
    const first = [rows[0].a, rows[0].b].sort()[0];
    return [key, { first,
      winRate: confidence(rows.map((row) => row.a === first ? row.outcome : 1 - row.outcome)),
      meanScoreMargin: average(rows.map((row) => row.a === first ? row.margin : -row.margin)),
      ties: rows.filter((row) => row.winner === null).length }];
  }));
  const behavior = adapter.summarizeBehavior?.(results, variants) ??
    { byVariant: {}, byMode: {} };
  const variantSummary = Object.fromEntries(Object.entries(byVariant).map(([name, value]) =>
    [name, { winRate: confidence(value.outcomes),
      meanScoreMargin: average(value.margins),
      ...(behavior.byVariant[name] ?? {}) }]));
  return { config, modes, bouts: results.length, pairs: pairSummary(pairs),
    pairsCombined: pairSummary(pairsCombined), variants: variantSummary,
    byMode: behavior.byMode };
}

export function markdown(summary, adapter = {}) {
  const lines = ['# Tournament summary', '',
    `Bouts: ${summary.bouts}; ${summary.config.durationSec}s each; modes ${summary.modes.join(', ')}.`, '',
    'A tie counts as half a win. 95% intervals use the Wilson score formula on fractional bout outcomes. ' +
    'They are descriptive intervals; seeded bouts and repeated opponents are not independent human playtests.', '',
    '## Overall', '',
    '| Variant | Win rate (95% CI) | Mean score margin | n |',
    '| --- | ---: | ---: | ---: |'];
  for (const [name, value] of Object.entries(summary.variants)) {
    const c = value.winRate;
    lines.push(`| ${name} | ${percent(c.mean)} (${percent(c.lo)}–${percent(c.hi)}) | ${value.meanScoreMargin.toFixed(2)} | ${c.n} |`);
  }
  lines.push('', '## Pairwise', '',
    '| Pair and mode | First listed win rate (95% CI) | Margin | Ties | n |',
    '| --- | ---: | ---: | ---: | ---: |');
  for (const [name, value] of Object.entries(summary.pairs)) {
    const c = value.winRate;
    lines.push(`| ${name} | ${percent(c.mean)} (${percent(c.lo)}–${percent(c.hi)}) | ${value.meanScoreMargin.toFixed(2)} | ${value.ties} | ${c.n} |`);
  }
  if (adapter.behaviorMarkdown) lines.push('', adapter.behaviorMarkdown(summary));
  return `${lines.join('\n').trimEnd()}\n`;
}

async function runWorker(url, adapterUrl, tasks, policy) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(url, { workerData: { adapterUrl, tasks, policy } });
    worker.once('message', resolve);
    worker.once('error', reject);
    worker.once('exit', (code) => { if (code !== 0) reject(new Error(`worker exited ${code}`)); });
  });
}

export async function runTournament(input = {}) {
  const config = { n: 8, keyN: 192,
    workers: Math.min(8, Math.max(1, availableParallelism() - 2)),
    durationSec: null, out: 'reports/tournament', adapter: null,
    policy: null, ...input };
  const adapterUrl = config.adapter ? pathToFileURL(resolve(config.adapter)).href :
    new URL('./tether-adapter.mjs', import.meta.url).href;
  const adapter = await import(adapterUrl);
  const policy = config.policy ?? adapter.defaultPolicy;
  const variants = adapter.variantsForPolicy?.(policy) ?? adapter.variants;
  const modes = adapter.modes;
  const durationSec = config.durationSec ?? adapter.boutSeconds(adapter.game.CONSTANTS);
  const actualConfig = { ...config, policy, durationSec,
    metricVersion: adapter.metricVersion ?? null };
  const tasks = [];
  for (let i = 0; i < variants.length; i++) {
    for (let j = i + 1; j < variants.length; j++) {
      const n = adapter.isKeyPair?.(variants[i], variants[j]) ? config.keyN : config.n;
      for (const mode of modes) for (let k = 0; k < n; k++) {
        tasks.push({ first: k % 2 ? j : i, second: k % 2 ? i : j,
          mode, seed: (i + 1) * 1000003 + (j + 1) * 1009 + k,
          durationSec });
      }
    }
  }
  const count = Math.min(config.workers, 8, tasks.length);
  const chunks = Array.from({ length: count }, () => []);
  tasks.forEach((task, index) => chunks[index % count].push(task));
  const workerUrl = new URL('./worker.mjs', import.meta.url);
  const nested = await Promise.all(chunks.map((chunk) =>
    runWorker(workerUrl, adapterUrl, chunk, policy)));
  const results = nested.flat();
  const summary = summarize(results, variants, actualConfig, adapter);
  const out = resolve(config.out);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(`${out}.json`, JSON.stringify({ summary, variants,
    results: results.map((row) => adapter.compactResult?.(row) ?? row) }));
  await writeFile(`${out}.md`, markdown(summary, adapter));
  return { summary, path: out };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = options(process.argv.slice(2));
  const start = performance.now();
  const { summary, path } = await runTournament(config);
  console.log(`${summary.bouts} bouts in ${((performance.now() - start) / 1000).toFixed(1)}s; ${path}.json and .md`);
}
