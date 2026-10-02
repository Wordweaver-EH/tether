import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

function point(row, index, ids) {
  const own = row.first === index ? row.score[ids[0]] : row.score[ids[1]];
  const enemy = row.first === index ? row.score[ids[1]] : row.score[ids[0]];
  return own > enemy ? 1 : own < enemy ? 0 : 0.5;
}
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

// Paired seeds and seats isolate the policy change for a fixed opponent.
export function compareRuns(before, after, focus, playerIds) {
  const variants = before.variants;
  if (JSON.stringify(variants.map((variant) => variant.name)) !==
      JSON.stringify(after.variants.map((variant) => variant.name)))
    throw new Error('variant order differs between runs');
  const index = variants.findIndex((variant) => variant.name === focus);
  if (index < 0) throw new RangeError(`unknown variant: ${focus}`);
  const ids = playerIds ?? Object.keys(before.results[0].score);
  const key = (row) => `${row.first}/${row.second}/${row.mode}/${row.seed}`;
  const earlier = new Map(before.results.map((row) => [key(row), row]));
  const groups = new Map();
  for (const row of after.results) {
    if (row.first !== index && row.second !== index) continue;
    const prior = earlier.get(key(row));
    if (!prior) throw new Error(`unpaired bout: ${key(row)}`);
    const opponent = variants[row.first === index ? row.second : row.first].name;
    const item = { before: point(prior, index, ids), after: point(row, index, ids) };
    for (const label of [opponent, `${opponent} ${row.mode}`]) {
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(item);
    }
  }
  return Object.fromEntries([...groups.entries()].map(([name, rows]) => {
    const differences = rows.map((row) => row.after - row.before);
    const delta = mean(differences);
    const variance = rows.length > 1 ? differences.reduce((sum, value) =>
      sum + (value - delta) ** 2, 0) / (rows.length - 1) : 0;
    const half = 1.96 * Math.sqrt(variance / rows.length);
    return [name, { n: rows.length,
      before: mean(rows.map((row) => row.before)),
      after: mean(rows.map((row) => row.after)),
      delta, lo: Math.max(-1, delta - half), hi: Math.min(1, delta + half) }];
  }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [beforePath, afterPath, focus] = process.argv.slice(2);
  if (!beforePath || !afterPath || !focus)
    throw new Error('usage: node arena/compare.mjs before.json after.json variant-name');
  const before = JSON.parse(await readFile(beforePath, 'utf8'));
  const after = JSON.parse(await readFile(afterPath, 'utf8'));
  const rows = compareRuns(before, after, focus);
  console.log('| Opponent | Before | After | Paired change (95% CI) | n |');
  console.log('| --- | ---: | ---: | ---: | ---: |');
  for (const [name, row] of Object.entries(rows))
    console.log(`| ${name} | ${(row.before * 100).toFixed(1)}% | ${(row.after * 100).toFixed(1)}% | ${(row.delta * 100).toFixed(1)} pp (${(row.lo * 100).toFixed(1)} to ${(row.hi * 100).toFixed(1)}) | ${row.n} |`);
}
