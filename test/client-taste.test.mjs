import test from 'node:test';
import assert from 'node:assert/strict';
import { drawOutsideCone, spearGlyph, PALETTE } from '../client/canvas.mjs';
import { traceAt } from '../replay/log-data.mjs';

test('outside-cone shading cuts an even-odd visible wedge without exposing entities', () => {
  const calls = [];
  const ctx = new Proxy({}, { get: (_, name) => (...args) => calls.push([name, ...args]),
    set: (_, name, value) => { calls.push([name, value]); return true; } });
  const bounds = { minX: -8, minY: -5, maxX: 8, maxY: 5 };
  drawOutsideCone(ctx, { origin: { x: -5, y: 0 }, facing: { x: 1, y: 0 }, halfAngleRad: Math.PI / 3 }, bounds);
  assert.deepEqual(calls.find(c => c[0] === 'rect'), ['rect', -8, -5, 16, 10]);
  assert.deepEqual(calls.find(c => c[0] === 'fill'), ['fill', 'evenodd']);
  assert.deepEqual(calls.at(-1), ['restore']);
  assert.ok(calls.some(c => c[0] === 'globalAlpha' && c[1] > 0.5));
  assert.equal(PALETTE.P2, '#f0a875');
});

test('held spear stays off the facing axis at every orientation; free spear remains exact', () => {
  for (const direction of [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }]) {
    const position = { x: 2, y: -1 };
    const held = spearGlyph({ position, direction, state: 'HELD' });
    const cross = (held.x - position.x) * direction.y - (held.y - position.y) * direction.x;
    assert.ok(Math.abs(Math.abs(cross) - 0.25) < 1e-10);
    const free = spearGlyph({ position, direction, state: 'OUTBOUND' });
    assert.equal(free.x, position.x); assert.equal(free.y, position.y);
  }
});

test('Mind View selection leaves Deceive and supports backward and forward seeks', () => {
  const traces = [{ time: 1, focus: 'Hunt' }, { time: 2, focus: 'Deceive' },
    { time: 3, focus: 'Threat' }, { time: 4, focus: 'Search' }];
  for (const [time, focus] of [[2.5, 'Deceive'], [3, 'Threat'], [4.5, 'Search'], [1.5, 'Hunt'], [2, 'Deceive']])
    assert.equal(traceAt(traces, time).focus, focus);
  assert.equal(traceAt(traces, 0), null);
});

import { MEMORY_KEY, readMemory, saveMemory, resetMemory } from '../client/memory-store.mjs';
import { recordBout, recordRematch, recordSessionDuration } from '../client/telemetry.mjs';

test('opponent memory round-trips across sessions and resetting leaves telemetry alone', () => {
  const values = new Map([['tether.telemetry.v1', 'keep']]);
  const storage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v),
    removeItem: k => values.delete(k) };
  const snapshot = { version: 2, playerModel: { scanReversals: 4 }, learning: { table: {} } };
  assert.equal(readMemory(storage), null);
  assert.equal(saveMemory(storage, snapshot), true);
  assert.deepEqual(readMemory(storage), snapshot);
  snapshot.playerModel.scanReversals = 99;
  assert.equal(readMemory(storage).playerModel.scanReversals, 4);
  assert.equal(resetMemory(storage), true);
  assert.equal(readMemory(storage), null);
  assert.equal(values.get('tether.telemetry.v1'), 'keep');
  for (const corrupt of ['{bad', 'null', '{"version":1,"snapshot":{}}', '{"version":2,"snapshot":[]}']) {
    values.set(MEMORY_KEY, corrupt); assert.equal(readMemory(storage), null);
  }
});

test('unavailable or full storage cannot interrupt a bout or memory reset', () => {
  const blocked = { getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('quota'); }, removeItem() { throw new Error('blocked'); } };
  for (const storage of [null, blocked]) {
    assert.equal(readMemory(storage), null);
    assert.equal(saveMemory(storage, { version: 2 }), false);
    assert.equal(resetMemory(storage), false);
    assert.doesNotThrow(() => recordBout(storage, { score: { P1: 1, P2: 0 } }));
    assert.doesNotThrow(() => recordRematch(storage));
    assert.doesNotThrow(() => recordSessionDuration(storage, 10));
  }
});

import { learnedSummary, cognitionReadouts, adaptationReadouts } from '../client/mind-readouts.mjs';

test('learning summary describes evidence without inventing observations', () => {
  assert.match(learnedSummary(null), /Not enough/);
  assert.match(learnedSummary({ adaptation: { drift: { n: 0 } } }), /Not enough/);
  const summary = learnedSummary({ adaptation: { drift: { n: 12 }, recall: { mean: 1.2, n: 3 },
    scan: { mean: 0.4, n: 10 }, side: { a: 8, b: 2 }, reversals: 2 } });
  assert.match(summary, /12 visible movement observations/);
  assert.match(summary, /1.20 s \(3 observations\)/);
  assert.match(summary, /0.40 rad\/s/);
  assert.match(summary, /80%/);
  assert.match(summary, /what the mind could see/);
  assert.doesNotMatch(summary, /dodg|always|intent|neutralized/);
});

test('Mind View distinguishes missing, disabled and recorded cognition/adaptation', () => {
  assert.deepEqual(cognitionReadouts({}), [['Status', 'Not recorded in this log']]);
  assert.deepEqual(adaptationReadouts({}), [['Status', 'Not recorded in this log']]);
  assert.deepEqual(adaptationReadouts({ adaptation: { enabled: false } }), [['Status', 'Ablated / disabled']]);
  assert.deepEqual(cognitionReadouts({ cognition: { tier: 'deliberate', budget: { spent: 42, limit: 192 }, tactic: 'left', automatic: false } }),
    [['Tier', 'deliberate'], ['Work units', '42 / 192'], ['Tactic', 'left'], ['Learned automatic response', 'No']]);
  const rows = adaptationReadouts({ cognition: { adaptation: { sideProbability: 0.7, confidence: 0.4, samples: 9.23,
    recallDelay: null, neutralization: 0.6 } } });
  assert.ok(rows.some(([label, value]) => label === 'Effective side evidence' && value === '9.2'));
  assert.ok(rows.some(([label]) => label === 'Approach-to-spear estimate'));
  assert.ok(!rows.some(([label]) => label === 'Observed recall delay'));
});

import { createMind } from '../src/mind/index.mjs';
import { runBout } from '../src/headless.mjs';
test('client consumes real v2 memory and nested cognition trace schemas', () => {
  const mind = createMind({ seed: 73 });
  runBout({ agents: [{ act: () => ({ moveY: 1 }) }, mind], mode: 'MODE_A', durationSec: 1 });
  const snapshot = mind.memory();
  assert.equal(snapshot.version, 2);
  assert.match(learnedSummary(snapshot), /visible movement observations/);
  const trace = mind.trace().at(-1);
  assert.ok(cognitionReadouts(trace).some(([label]) => label === 'Work units'));
  assert.ok(adaptationReadouts(trace).some(([label]) => label === 'Effective side evidence'));
  let stored = null;
  const storage = { getItem: () => stored, setItem: (_k, value) => { stored = value; } };
  assert.equal(saveMemory(storage, snapshot), true);
  const resumed = createMind({ seed: 74, memorySnapshot: readMemory(storage) });
  assert.deepEqual(resumed.memory().adaptation, snapshot.adaptation);
});

import { counterfactualReadout } from '../client/mind-readouts.mjs';
test('counterfactual panel separates rollout hypotheses from legacy diagnostics', () => {
  assert.match(counterfactualReadout({}), /No counterfactual/);
  assert.match(counterfactualReadout({}, { choice: 'recall', alternative: 'wait' }), /not recorded/);
  const text = counterfactualReadout({ cognition: { situation: 'EMBEDDED:hidden:near',
    branches: [{ tactic: 'direct', value: 0.5, trials: 8 }, { tactic: 'lead', value: 0.25, trials: 8 }] } });
  assert.match(text, /Recall now: model hit estimate 50% \(8 hypotheses\)/);
  assert.match(text, /Wait 0.3 s, then recall/);
  assert.match(text, /not measured outcomes/);
});
