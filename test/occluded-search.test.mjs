// Integration fixtures only. Never call runScene or score generated scenes here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step } from '../src/sim.js';
import { percept } from '../src/perception.js';
import { createAssayEngine, createConventionalTracker, THRESHOLDS, FRAME_FIELDS, ARMS, summarize } from '../benchmark/occluded-search-v1/run.mjs';
import { generateScenes, scenesDigest } from '../benchmark/occluded-search-v1/scenes.mjs';

test('heldout construction is physics-valid, deterministic, mirrored and balanced without policy calls', () => {
  const scenes = generateScenes();
  assert.equal(scenes.length, 32); assert.deepEqual(scenes, generateScenes());
  assert.equal(scenesDigest(scenes), 'ca1851915c13cd65641cb7a8d617533591280df132738e4999260083adcae4d2');
  assert.equal(scenes.filter(s => s.seat === 'P1').length, 16);
  assert.equal(new Set(scenes.map(s => s.clusterId)).size, 16);
  for (const s of scenes) {
    assert.equal(s.geometry.valid, true); assert.equal(s.geometry.visibleSamples, 18);
    assert.equal(s.firstOccludedTick, 72); assert.equal(s.releaseTick, 90);
    const mirror = scenes.find(o => o.clusterId === s.clusterId && o.id !== s.id);
    assert.equal(s.observerPosition.x, -mirror.observerPosition.x);
    assert.equal(s.targetStart.y, mirror.targetStart.y);
    assert.notEqual(s.seat, mirror.seat);
  }
});

test('full and broad-cut engines are identical while synthetic percepts stay visible', () => {
  const a = createAssayEngine('full', 771), b = createAssayEngine('full-history-cut', 771);
  const world = createWorld({ gameMode: 'COVER_CONTROL' });
  for (let i = 0; i < 24; i++) {
    const v = percept(world, 'P1', 'MODE_A'); v.time.elapsedSec = i / 30;
    const ca = a.act(v, 1 / 30), cb = b.act(v, 1 / 30);
    assert.deepEqual(ca, cb); assert.deepEqual(a.lastDecision(), b.lastDecision());
    a.commitCommand({ ...ca, throw: false, recall: false }, v, v.time.elapsedSec + .15);
    b.commitCommand({ ...cb, throw: false, recall: false }, v, v.time.elapsedSec + .15);
  }
  assert.deepEqual(a.memory(), b.memory());
});

test('broad cut closes declared coordinate paths on a synthetic missing percept', () => {
  const a = createAssayEngine('full-history-cut', 81), world = createWorld({ gameMode: 'COVER_CONTROL' });
  for (let i = 0; i < 8; i++) {
    const v = percept(world, 'P1', 'MODE_A'); v.time.elapsedSec = i / 30; a.act(v, 1 / 30);
  }
  const hidden = percept(world, 'P1', 'MODE_B'); hidden.time.elapsedSec = 8 / 30;
  assert.equal(hidden.opponent, null); a.act(hidden, 1 / 30);
  const c = a.lastDecision().cognition.coordination;
  assert.equal(c.recalled, null); assert.equal(c.receivers.attention.delivered, false);
  assert.equal(c.receivers.planner.delivered, false); assert.equal(c.request, null);
  assert.equal(a.trace().at(-1).confidence.opponent, 0);
  assert.equal(a.trace().at(-1).opponentCone, null);
  assert.equal(a.lastDecision().cognition.adaptation.enabled, false);
  assert.notEqual(a.lastDecision().cognition.tier, 0);
});

test('never-observed hidden truth cannot alter a controller through the genuine percept', () => {
  const worlds = [createWorld({ gameMode: 'COVER_CONTROL' }), createWorld({ gameMode: 'COVER_CONTROL' })];
  worlds[1].players[1].position = { x: 4.8, y: 1 }; worlds[1].spears[1].position = { x: 4.8, y: 1 };
  const agents = [createAssayEngine('full', 93), createAssayEngine('full', 93)];
  for (let i = 0; i < 24; i++) {
    const views = worlds.map(w => percept(w, 'P1', 'MODE_B'));
    assert.deepEqual(views[0], views[1]);
    assert.deepEqual(agents[0].act(views[0], 1 / 30), agents[1].act(views[1], 1 / 30));
    for (const w of worlds) step(w, [{}, {}]);
  }
});

test('conventional tracker uses only a last observed constant-velocity hypothesis and bounded routing', () => {
  const tracker = createConventionalTracker(), world = createWorld({ gameMode: 'COVER_CONTROL' });
  const v = percept(world, 'P1', 'MODE_A');
  v.own.position = { x: -6, y: -3 }; v.opponent.position = { x: -4, y: -3 };
  v.opponent.velocity = { x: 0, y: 1 }; v.time.elapsedSec = 0;
  const visible = tracker.act(v);
  assert.equal(visible.aimX, 2); assert.equal(visible.aimY, 0);
  const hidden = tracker.act({ ...v, opponent: null, opponentSpear: null,
    time: { ...v.time, elapsedSec: .5 } });
  assert.equal(hidden.aimX, 2); assert.equal(hidden.aimY, .5);
  assert.equal(hidden.throw, false); assert.equal(hidden.recall, false);
  assert.ok(tracker.lastDecision().cognition.budget.spent <= THRESHOLDS.workCap);
  assert.equal(FRAME_FIELDS[27], 'logicalWork');
});

test('synthetic analysis fixture enforces complete rows and cannot rescue absent history benefit', () => {
  // Artificial outcomes, not any generated scene or policy behavior.
  const scenes = ['north', 'south'].flatMap(entrance => ['inner', 'outer'].map(observerSide => ({
    id: `synthetic-${entrance}-${observerSide}`, clusterId: `${entrance}-${observerSide}`, entrance, observerSide })));
  const rows = scenes.flatMap(s => {
    const common = { sceneId: s.id, clusterId: s.clusterId, meanWork: 20, maxWork: 30, frames: [] };
    return [
      ...ARMS.map(arm => ({ ...common, condition: 'scored', arm,
        success: arm === 'full' || arm === 'isolated', censoredLatencySec: arm === 'full' || arm === 'isolated' ? .4 : 2 })),
      ...['full', 'full-history-cut'].map(arm => ({ ...common, condition: 'never-observed', arm,
        success: false, censoredLatencySec: 2 })),
      ...['full', 'full-history-cut'].map(arm => ({ ...common, condition: 'always-visible', arm,
        success: true, censoredLatencySec: .1 })),
    ];
  });
  assert.equal(summarize(rows, scenes).positiveCriterionMet, true);
  assert.throws(() => summarize(rows.slice(1), scenes), /episode rows/);
  assert.throws(() => summarize([...rows, rows[0]], scenes), /episode rows/);
  const noBenefit = rows.map(r => r.condition === 'never-observed' && r.arm === 'full'
    ? { ...r, success: true, censoredLatencySec: .4 } : r);
  const result = summarize(noBenefit, scenes);
  assert.equal(result.fullFunctionalGate, true); assert.equal(result.historyAttributionGate, false);
  assert.equal(result.positiveCriterionMet, false);
  assert.equal(result.byArm.full.n, 4, 'always-visible rows cannot enter scored arm counts');
});
