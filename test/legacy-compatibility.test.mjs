import test from 'node:test';
import assert from 'node:assert/strict';
import {cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createMind} from '../src/mind/index.mjs';
import {runBout} from '../src/headless.mjs';
import {STRATEGIES} from '../src/agents/strategies.mjs';
import {compatibilityFixtureRoot, loadFrozenRebuiltSMind, verifyCompatibilityFixtures} from '../tools/compatibility-fixtures.mjs';

const {createMind: rebuiltSMind} = await loadFrozenRebuiltSMind();

test('frozen compatibility fixtures and the verbatim historical affect test match the pinned manifest', () => {
  const manifest = verifyCompatibilityFixtures();
  assert.equal(manifest.origins['rebuilt-s'].commit, 'a514c0f7f95f6df1bb987bee315830261b5c6188');
  assert.equal(Object.keys(manifest.files).length, 12);
});

test('compatibility verification rejects changed fixture bytes and a rewritten manifest', () => {
  const path = mkdtempSync(resolve(tmpdir(), 'tether-fixture-integrity-'));
  try {
    cpSync(compatibilityFixtureRoot, path, {recursive: true});
    const workspace = resolve(path, 'original-v2/src/mind/workspace.mjs');
    const bytes = readFileSync(workspace);
    writeFileSync(workspace, Buffer.concat([bytes, Buffer.from('\n// modified\n')]));
    assert.throws(() => verifyCompatibilityFixtures(path), /fixture hash mismatch/);
    writeFileSync(workspace, bytes);
    const manifest = resolve(path, 'manifest.json');
    writeFileSync(manifest, Buffer.concat([readFileSync(manifest), Buffer.from('\n')]));
    assert.throws(() => verifyCompatibilityFixtures(path), /manifest hash mismatch/);
  } finally {
    rmSync(path, {recursive: true, force: true});
  }
});

function run(factory, options, mode, seat) {
  const mind = factory({...options, captureTrace: true, captureDiagnostics: true});
  const bot = STRATEGIES.immediateRecaller();
  const result = runBout({agents: seat === 0 ? [mind, bot] : [bot, mind], mode, durationSec: 5, log: true});
  return {mind, result};
}

function replayRecords(lines) {
  return lines.map(line => {
    const record = JSON.parse(line);
    // The sole normalization is the logger's wall-clock launch timestamp.
    if (record.recordType === 'METADATA') delete record.timestamp_start;
    return record;
  });
}

for (const [label, options] of [
  ['default', {seed: 991}],
  ['noAffect', {seed: 991, ablations: {noAffect: true}}],
  ['noPrediction', {seed: 731, ablations: {noPrediction: true}}],
  ['low budget and frozen learning', {seed: 731, cognitionBudget: 96, freezeLearning: true}],
]) {
  test(`coordination disabled exactly preserves rebuilt-S actions, replay, memory and cognition: ${label}`, () => {
    for (const mode of ['MODE_A', 'MODE_B']) for (const seat of [0, 1]) {
      const current = run(createMind, {...options, coordinationEnabled: false}, mode, seat);
      const frozen = run(rebuiltSMind, options, mode, seat);
      const context = `${label}, ${mode}, seat ${seat}`;
      assert.deepEqual(replayRecords(current.result.logLines), replayRecords(frozen.result.logLines), context);
      assert.deepEqual(current.result.score, frozen.result.score, context);
      assert.deepEqual(current.result.events, frozen.result.events, context);
      assert.deepEqual(current.mind.memory(), frozen.mind.memory(), context);
      assert.deepEqual(current.mind.cognition(), frozen.mind.cognition(), context);
      assert.deepEqual(current.mind.settings(), frozen.mind.settings(), context);
      assert.deepEqual(current.mind.selfReport(Infinity), frozen.mind.selfReport(Infinity), context);
      assert.ok(current.mind.cognition().cycles > 0, context);
      // Added diagnostic fields are inspected explicitly, never stripped from
      // the behavioral comparisons above or represented as old trace parity.
      assert.ok(current.mind.trace().every(row => row.cognition.coordination.active === false), context);
      assert.ok(current.mind.trace().every(row => row.cognition.monitorForced === false), context);
      assert.ok(current.mind.trace().every(row => !('coordination' in row.cognition.budget.byKind)), context);
    }
  });
}
