// Pre-specified Phase 4 study. One worker by default so other audits can run.
import { mkdir, writeFile } from 'node:fs/promises';
import { search, parseArgs } from './search.mjs';
import { evaluatePolicies } from './evaluate-policies.mjs';
import { POLICY_SEEDS } from '../src/agents/param.mjs';
import { opponents } from './tether-search-adapter.mjs';
import { evaluateDodger } from './dodger-eval.mjs';

await mkdir('reports', { recursive: true });
const save = (name, value) => writeFile(`reports/${name}.json`, JSON.stringify(value, null, 2) + '\n');
const progress = async (value) => {
  const status = { updatedUtc: new Date().toISOString(), ...value };
  await save('phase4a-final-progress', status);
  console.log(JSON.stringify(status));
};
const config = parseArgs(['--generations', '12', '--eval-seconds', '45',
  '--validation-seconds', '300', '--validation-seeds', '12', '--workers', '1',
  '--seed', '431', '--out', 'reports/phase4a-final-search.json']);
await progress({ stage: 'starting', config });
const result = await search(config, { onProgress: progress });
await save('phase4a-final-search', result);
if (!result.sourceUnchanged) throw new Error('source changed during search; confirmation not started');
const selected = [...result.champions].sort((a, b) =>
  b.overall.winRate.mean - a.overall.winRate.mean)[0];
const finalists = result.champions.map((c) => ({ kind: 'policy', name: c.name, vector: c.vector }));
const anchor = { kind: 'policy', name: 'seed-anchor-control', vector: POLICY_SEEDS.anchor };
const candidates = [finalists.find((c) => c.name === selected.name),
  { kind: 'named', name: 'directShooter' }, { kind: 'named', name: 'immediateRecaller' }, anchor];
const rivals = [...opponents.map((name) => ({ kind: 'named', name })), ...finalists, anchor];
await progress({ stage: 'confirmation', selected: selected.name, candidateCount: candidates.length,
  rivalCount: rivals.length, seeds: 16, seed: 1700431, seconds: 300, workers: 1 });
const confirmation = await evaluatePolicies({ candidates, rivals,
  workers: 1, seconds: 300, seeds: 16, seed: 1700431 });
await save('phase4a-final-confirmation', confirmation);
if (!confirmation.sourceUnchanged || confirmation.source.sha256 !== result.source.sha256)
  throw new Error('source changed between or during phases');
await save('phase4a-final-dodger', { source: confirmation.source.sha256,
  samples: 40, seconds: 12, results: evaluateDodger() });
await progress({ stage: 'complete', selected: selected.name,
  searchBouts: result.bouts, confirmationBouts: confirmation.bouts,
  source: result.source.sha256 });
