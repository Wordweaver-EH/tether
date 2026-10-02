// Held-out policy evaluation. No fitting occurs in this program.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { balancedTasks, workerPool, summarizeRows, sourceFingerprint } from './search.mjs';

export async function evaluatePolicies({ condition = 'baseline', workers = 4,
  seconds = 300, seeds = 8, seed = 1700431, candidates, rivals,
  adapter = './arena/tether-search-adapter.mjs' } = {}) {
  if (!Number.isInteger(seeds) || seeds < 1 || !Number.isFinite(seconds) || seconds <= 0 ||
      !Number.isInteger(workers) || workers < 1 || workers > 8 || !Number.isSafeInteger(seed) ||
      !Array.isArray(candidates) || !candidates.length)
    throw new RangeError('invalid evaluation controls');
  const url = pathToFileURL(resolve(adapter)).href;
  const search = await import(url);
  if (!search.conditions[condition]) throw new RangeError('unknown condition');
  const pool = workerPool(url, condition, workers), start = Date.now();
  const source = await sourceFingerprint(resolve(dirname(fileURLToPath(url)), '..'));
  const named = search.opponents.map((name) => ({ kind: 'named', name }));
  const results = [];
  try {
    for (const candidate of candidates) {
      const opponents = (rivals ?? named).filter((r) => r.name !== candidate.name);
      const tasks = balancedTasks(candidate, opponents, seed, seconds, search.adapter.modes, seeds);
      const rows = await pool.run(tasks);
      const summarize = (selected) => summarizeRows(selected, candidate.name,
        search.adapter.playerIds, search.summarizeSearchMetrics);
      results.push({ candidate, overall: summarize(rows),
        byOpponent: Object.fromEntries(opponents.map((rival) => [rival.name,
          summarize(rows.filter((r) => r.first.name === rival.name || r.second.name === rival.name))])),
        bySeat: Object.fromEntries(['P1', 'P2'].map((seat) => [seat,
          summarize(rows.filter((r) => (r.first.name === candidate.name ? 'P1' : 'P2') === seat))])),
        byMode: Object.fromEntries(search.adapter.modes.map((mode) => [mode,
          summarize(rows.filter((r) => r.mode === mode))])),
        rows });
    }
    const sourceAtEnd = await sourceFingerprint(resolve(dirname(fileURLToPath(url)), '..'));
    return { schema: 'tether-heldout-balanced-v1', source,
      sourceUnchanged: source.sha256 === sourceAtEnd.sha256, sourceAtEnd: sourceAtEnd.sha256, condition,
      config: { workers, seconds, seeds, seed, adapter },
      elapsedSec: (Date.now() - start) / 1000,
      bouts: results.reduce((n, r) => n + r.rows.length, 0), results };
  } finally { await pool.close(); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = Object.fromEntries(Array.from({ length: (process.argv.length - 2) / 2 }, (_, i) =>
    [process.argv[2 + i * 2].replace(/^--/, ''), process.argv[3 + i * 2]]));
  const candidates = args.input ? JSON.parse(await readFile(args.input, 'utf8')).champions
    .map((c) => ({ kind: 'policy', name: c.name, vector: c.vector })) :
    ['directShooter', 'immediateRecaller', 'embedWaiter', 'mind-tuned'].map((name) => ({ kind: 'named', name }));
  const result = await evaluatePolicies({ candidates, condition: args.condition ?? 'baseline',
    seconds: Number(args.seconds ?? 300), seeds: Number(args.seeds ?? 8),
    seed: Number(args.seed ?? 1700431), workers: Number(args.workers ?? 4) });
  const out = args.out ?? 'reports/phase4a-heldout.json';
  await mkdir(dirname(resolve(out)), { recursive: true });
  await writeFile(out, JSON.stringify(result, null, 2) + '\n');
  if (!result.sourceUnchanged) process.exitCode = 1;
  console.log(JSON.stringify({ out, sourceUnchanged: result.sourceUnchanged, bouts: result.bouts, elapsedSec: result.elapsedSec,
    results: result.results.map((r) => ({ name: r.candidate.name, ...r.overall })) }, null, 2));
}
