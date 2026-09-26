import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, snapshotWorld, restoreWorld, hashWorld, step } from '../src/sim.js';
import { percept } from '../src/perception.js';
import { createMind } from '../src/mind/index.mjs';
import { createOwnSpearMemory } from '../src/mind/own-spear.mjs';
import { createBelief } from '../src/mind/belief.mjs';
import { createWorkspace } from '../src/mind/workspace.mjs';
import { specialists } from '../src/mind/specialists.mjs';
import { createReflection, createMemory } from '../src/mind/components.mjs';
import { rng, inCone } from '../src/mind/math.mjs';
import { runBout } from '../src/headless.mjs';
import { replayFromLog } from '../src/log.js';

const idle = { act: () => ({}) };

test('a hidden opponent provides no information to the mind, and it cannot access world', () => {
  const a = createWorld(), b = createWorld();
  a.players[0].facing = { x: 1, y: 0 };
  b.players[0].facing = { x: 1, y: 0 };
  a.players[1].position = { x: -7, y: 1 };
  b.players[1].position = { x: -7, y: -1 };
  a.spears[1].position = { ...a.players[1].position };
  b.spears[1].position = { ...b.players[1].position };
  const va = percept(a, 'P1', 'MODE_B'), vb = percept(b, 'P1', 'MODE_B');
  assert.equal(va.opponent, null);
  assert.equal(va.opponentSpear, null);
  assert.deepEqual(va, vb);
  const ma = createMind({ seed: 9 }), mb = createMind({ seed: 9 });
  // Once the bridge made the copy, the true state can become inaccessible.
  a.players = new Proxy([], { get() { throw new Error('world accessed'); } });
  for (let i = 0; i < 36; i++) {
    va.time.elapsedSec = vb.time.elapsedSec = i / 120;
    assert.deepEqual(ma.act(va, 1 / 120), mb.act(vb, 1 / 120));
  }
  assert.deepEqual(ma.trace(), mb.trace());
});

test('the mind keeps a private estimate when its own embedded spear leaves the cone', () => {
  const world = createWorld();
  world.players[0].facing = { x: -1, y: 0 };
  world.spears[0].state = 'EMBEDDED';
  world.spears[0].position = { x: -8, y: 0 };
  world.spears[0].embedSurfaceId = 'WALL_W';
  const memory = createOwnSpearMemory();
  const visible = percept(world, 'P1', 'MODE_B');
  assert.equal(memory.observe(visible).state, 'EMBEDDED');
  world.players[0].facing = { x: 1, y: 0 };
  const hidden = percept(world, 'P1', 'MODE_B');
  assert.equal(hidden.own.spear, null);
  hidden.time.elapsedSec = 1;
  assert.deepEqual(memory.observe(hidden).position, { x: -8, y: 0 });
  const thrown = createOwnSpearMemory();
  const held = percept(createWorld(), 'P1', 'MODE_B');
  held.own.facing = { x: -1, y: 0 };
  thrown.observe(held);
  thrown.command({ throw: true }, held, 0);
  const estimated = thrown.observe(hidden);
  assert.equal(estimated.state, 'EMBEDDED');
  assert.equal(estimated.embedSurfaceId, 'WALL_W');
  assert.deepEqual(estimated.position, { x: -8, y: 0 });
  const mind = createMind({ seed: 17 });
  for (let i = 0; i < 80; i++) {
    const view = structuredClone(i < 25 ? visible : hidden);
    view.time.elapsedSec = i / 120;
    mind.act(view, 1 / 120);
  }
  assert.ok(mind.trace().length > 0);
});

test('cognitive cycle is 30 Hz after latency; trace reports only focus transitions', () => {
  const mind = createMind({ seed: 2, difficulty: 'normal' });
  const view = percept(createWorld(), 'P1', 'MODE_B');
  for (let tick = 0; tick < 120; tick++) {
    view.time.elapsedSec = tick / 120;
    mind.act(structuredClone(view), 1 / 120);
  }
  const trace = mind.trace();
  assert.equal(trace.length, 25);
  assert.ok(Math.abs(trace[1].time - trace[0].time - 4 / 120) < 1e-10);
  for (const row of trace) {
    assert.deepEqual(Object.keys(row.saliences),
      ['Threat', 'Hunt', 'Anchor', 'Contest', 'Search', 'Deceive']);
    assert.ok(row.belief.particles.length <= 64);
    assert.equal(!!row.innerSpeech, row.ignition);
    assert.ok(row.selfAttention.length >= 3);
  }
  assert.equal(mind.selfReport(trace.at(-1).time).focus, trace.at(-1).focus);
});

test('difficulty changes latency, noise, and thresholds while press inputs remain momentary', () => {
  const easy = createMind({ seed: 5, difficulty: 'easy' });
  const hard = createMind({ seed: 5, difficulty: 'hard' });
  assert.ok(easy.settings().latencySec > hard.settings().latencySec);
  assert.ok(easy.settings().baseAimNoise > hard.settings().baseAimNoise);
  assert.ok(easy.settings().throwConfidence > hard.settings().throwConfidence);
  const mind = createMind({ seed: 5, difficulty: 'hard' });
  const view = percept(createWorld(), 'P1', 'MODE_A');
  let priorPress = false, seenPress = false;
  for (let tick = 0; tick < 120; tick++) {
    view.time.elapsedSec = tick / 120;
    const input = mind.act(structuredClone(view), 1 / 120);
    if (priorPress) assert.equal(input.throw, false);
    priorPress = input.throw;
    seenPress ||= input.throw;
  }
  assert.equal(seenPress, true);
});

test('missing sighting removes particles inside the current cone', () => {
  const world = createWorld();
  const view = percept(world, 'P1', 'MODE_B');
  const filter = createBelief(rng(12));
  const seen = filter.update(view, 0);
  const before = seen.particles.filter((p) => inCone(view.own.position,
    view.own.facing, p)).length;
  const hidden = { ...view, opponent: null, opponentSpear: null };
  const after = filter.update(hidden, 1 / 30).particles.filter((p) =>
    inCone(view.own.position, view.own.facing, p)).length;
  assert.ok(before > 35);
  assert.ok(after < before / 2, `${before} -> ${after}`);
});

test('unexpected reacquisition has greater negative log likelihood', () => {
  const view = percept(createWorld(), 'P1', 'MODE_A');
  const expected = createBelief(rng(17)), unexpected = createBelief(rng(17));
  expected.update(view, 0); unexpected.update(view, 0);
  const shifted = structuredClone(view);
  shifted.opponent.position.y += 3;
  const a = expected.update(view, 1 / 30).surprise;
  const b = unexpected.update(shifted, 1 / 30).surprise;
  assert.ok(b > a + 1, `${a} vs ${b}`);
});

test('noPrediction holds a position prior and noBelief discards hidden history', () => {
  const view = percept(createWorld(), 'P1', 'MODE_A');
  view.own.facing = { x: -1, y: 0 };
  view.opponent.velocity = { x: -4, y: 0 };
  const hidden = { ...view, opponent: null, opponentSpear: null };
  const predictive = createBelief(rng(31));
  const staticPrior = createBelief(rng(31), { noPrediction: true });
  const currentOnly = createBelief(rng(31), { noBelief: true });
  for (const filter of [predictive, staticPrior, currentOnly]) filter.update(view, 0);
  const moving = predictive.update(hidden, 0.5);
  const fixed = staticPrior.update(hidden, 0.5);
  const forgotten = currentOnly.update(hidden, 0.5);
  assert.ok(moving.mean.x < fixed.mean.x - 1);
  assert.equal(forgotten.confidence, 0);
});

test('spear memory grows stale and metacognition gates low confidence', () => {
  const world = createWorld();
  const view = percept(world, 'P1', 'MODE_A');
  const filter = createBelief(rng(3));
  const first = filter.update(view, 0);
  const hidden = { ...view, opponent: null, opponentSpear: null };
  const later = filter.update(hidden, 3);
  assert.ok(later.spear.confidence < first.spear.confidence);
  assert.ok(later.confidence < first.confidence);
  const certain = createBelief(rng(3), { noMetacog: true });
  assert.equal(certain.update(hidden, 3).confidence, 1);
});

test('workspace has one focus, hysteresis, and channel selection changes under ablation', () => {
  const c = (salience, wants) => ({ salience, wants, content: 'x' });
  const a = { Hunt: c(0.7, { gaze: 'enemy', throw: true }),
    Threat: c(0.69, { move: 'away' }) };
  const normal = createWorkspace();
  assert.equal(normal.choose(a, 0, { arousal: 0 }).focus, 'Hunt');
  a.Threat.salience = 0.76;
  assert.equal(normal.choose(a, 0.1, { arousal: 0 }).focus, 'Hunt');
  const open = createWorkspace({ noWorkspace: true });
  const output = open.choose(a, 1, { arousal: 0 }).outputs;
  assert.equal(output.gaze, 'enemy');
  assert.equal(output.move, 'away');
  const merged = createWorkspace({ singleUtility: true });
  assert.equal(merged.choose(a, 1, { arousal: 0 }).focus, 'Utility');
  const switcher = createWorkspace({ noHysteresis: true });
  switcher.choose({ Hunt: c(0.7, {}), Threat: c(0.69, {}) }, 0, { arousal: 0 });
  assert.equal(switcher.choose(a, 0.1, { arousal: 0 }).focus, 'Threat');
});

test('hunt orbit reverses at an arena boundary instead of pinning against it', () => {
  const view = percept(createWorld(), 'P1', 'MODE_A');
  view.own.position = { x: 0, y: -4.5 };
  view.own.facing = { x: 1, y: 0 };
  view.opponent = { position: { x: 4, y: -4.5 },
    facing: { x: -1, y: 0 }, velocity: { x: 0, y: 0 } };
  const belief = { mean: { x: 4, y: -4.5 }, velocity: { x: 0, y: 0 },
    confidence: 1, stalenessSec: 0,
    spear: { state: 'HELD', position: { x: 4, y: -4.5 }, confidence: 1 } };
  const model = { latencySec: 0.15, throwConfidence: 0.4,
    throwAngleRad: 0.1, orbitSign: -1 };
  const c = specialists(view, belief, model, {}, {});
  assert.equal(model.orbitSign, 1);
  assert.ok(c.Hunt.wants.move.y > view.own.position.y);
  const baseline = { ...model, orbitSign: -1, policy: 'baseline' };
  const prior = specialists(view, belief, baseline, {}, {});
  assert.equal(baseline.orbitSign, -1);
  assert.equal(prior.Hunt.wants.move.y, view.opponent.position.y);
});

test('uncertain targets are not thrown at; the metacognition ablation removes that gate', () => {
  const view = percept(createWorld(), 'P1', 'MODE_A');
  const belief = { mean: { ...view.opponent.position }, velocity: { x: 0, y: 0 },
    confidence: 0.1, stalenessSec: 0,
    spear: { state: 'UNKNOWN', position: null, confidence: 0 } };
  const model = { latencySec: 0.15, throwConfidence: 0.4,
    throwAngleRad: 0.1, orbitSign: -1 };
  assert.equal(specialists(view, belief, model, {}, {}).Hunt.wants.throw, false);
  belief.confidence = 1;
  assert.equal(specialists(view, belief, model, {}, { noMetacog: true }).Hunt.wants.throw, true);
});

test('Deceive proposes an unseen flank even while my spear is embedded; noToM disables it', () => {
  const view = percept(createWorld(), 'P1', 'MODE_A');
  view.own.spear.state = 'EMBEDDED';
  view.own.spear.position = { x: -4, y: 4 };
  view.opponent.facing = { x: 1, y: 0 };
  const belief = { mean: { ...view.opponent.position }, velocity: { x: 0, y: 0 },
    confidence: 1, stalenessSec: 0, entropy: 0,
    spear: { state: 'HELD', position: { ...view.opponent.position }, confidence: 1 } };
  const model = { latencySec: 0.15, throwConfidence: 0.4,
    throwAngleRad: 0.1, orbitSign: -1, embedAge: 1,
    opponentAttention: { facing: { x: 1, y: 0 } } };
  const active = specialists(view, belief, model, {}, {});
  assert.ok(active.Deceive.salience > active.Hunt.salience);
  assert.ok(active.Deceive.wants.move);
  assert.equal(specialists(view, belief, model, {}, { noToM: true }).Deceive.salience, 0);
});

test('counterfactual recall note is computed from belief particles', () => {
  const reflection = createReflection();
  const note = reflection.considerRecall({ time: 2,
    spear: { state: 'EMBEDDED', position: { x: 0, y: 0 } },
    own: { x: 4, y: 0 },
    particles: [{ x: 2, y: 0 }, { x: 2, y: 2 }] });
  assert.equal(note.estimatedHitChance, 0.5);
  assert.equal(note.source, 'belief particles');
  assert.deepEqual(reflection.notes()[0], note);
});

test('opponent model learns visible recall delay from percepts and can be loaded', () => {
  const memory = createMemory();
  const view = percept(createWorld(), 'P1', 'MODE_A');
  view.opponentSpear.state = 'EMBEDDED';
  view.opponentSpear.embedSurfaceId = 'WALL_N';
  memory.observePercept(view, 1);
  view.opponentSpear.state = 'RETURNING';
  memory.observePercept(view, 3.5);
  assert.deepEqual(memory.playerModel().embedToRecallDelays, [2.5]);
  const again = createMemory();
  again.load({ playerModel: memory.playerModel() });
  assert.deepEqual(again.playerModel().embedToRecallDelays, [2.5]);
});

test('all ablation flags run and alter their intended trace or action path', () => {
  const view = percept(createWorld(), 'P1', 'MODE_A');
  const baseline = createMind({ seed: 22 });
  for (let i = 0; i < 44; i++) { view.time.elapsedSec = i / 120; baseline.act(view, 1 / 120); }
  const base = baseline.trace();
  for (const flag of ['noBelief', 'noPrediction', 'singleUtility', 'noWorkspace',
    'noHysteresis', 'noMetacog', 'noAttentionSchema', 'noToM']) {
    const mind = createMind({ seed: 22, ablations: { [flag]: true } });
    for (let i = 0; i < 44; i++) { view.time.elapsedSec = i / 120; mind.act(view, 1 / 120); }
    assert.ok(mind.trace().length > 0, flag);
    assert.equal(mind.settings().ablations[flag], true);
    if (flag === 'singleUtility') assert.equal(mind.trace()[0].focus, 'Utility');
    if (flag === 'noPrediction') assert.equal(mind.trace().at(-1).surprise, 0);
    if (flag === 'noMetacog') assert.equal(mind.trace().at(-1).confidence.opponent, 1);
    if (flag === 'noToM') assert.equal(mind.trace().at(-1).opponentCone, null);
    if (flag === 'noAttentionSchema')
      assert.notDeepEqual(mind.trace().at(-1).input.aimX, base.at(-1).input.aimX);
  }
});

test('headless logs mind traces without breaking deterministic replay', () => {
  const mind = createMind({ seed: 1 });
  const result = runBout({ agents: [mind, idle], durationSec: 1,
    log: true, captureTraces: true });
  assert.ok(result.traces.P1.length > 0);
  assert.ok(Math.abs(JSON.parse(result.logLines[0]).agent_technical[0].latencySec - 0.15) < 1e-10);
  assert.ok(result.logLines.some((s) => JSON.parse(s).recordType === 'MIND_TRACE'));
  assert.ok(replayFromLog(result.logLines).verifiedSamples > 0);
});

test('snapshot/restore is exact, independent, and can branch at the same hash', () => {
  const world = createWorld();
  for (let i = 0; i < 31; i++) step(world, [{ aimX: 1, throw: i === 0 }, {}]);
  const snapshot = snapshotWorld(world);
  const branch = restoreWorld(snapshot);
  assert.equal(hashWorld(branch), hashWorld(world));
  branch.players[0].position.x += 1;
  assert.notEqual(hashWorld(branch), hashWorld(world));
  assert.equal(hashWorld(restoreWorld(snapshot)), hashWorld(world));
  assert.throws(() => restoreWorld({}), /invalid world snapshot/);
});
