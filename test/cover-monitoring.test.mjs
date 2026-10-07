import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createWorld, step } from '../src/sim.js';
import { percept } from '../src/perception.js';
import { createMind } from '../src/mind/index.mjs';
import { createCoverMind } from '../src/agents/cover-mind.mjs';
import { createCoverInterface } from '../src/agents/cover-interface.mjs';
import { createCoordination, COORDINATION_NOMINAL_UNITS } from '../src/mind/coordination.mjs';
import { createCoverPolicy, COVER_REPLAN_SEC } from '../src/mind/cover-policy.mjs';

// These are bounded wiring fixtures, not scored performance experiments. Initial
// positions are legal test setups; all subsequent states and visibility come
// from the simulator. Replay arms get the same percept bytes, including the
// same 150ms sensor delay and 30Hz cadence. Their different commands are observed
// but never misrepresented as independent closed-loop game trajectories.
function position(w, i, x, y) {
  w.players[i].position = { x, y };
  w.spears[i].position = { x, y };
}
function legalCoverViews({ ticks = 420, lookAway = true, stationary = false, offAxis = false } = {}) {
  const w = createWorld({ gameMode: 'COVER_CONTROL' });
  position(w, 0, -1.5, 0); position(w, 1, .5, 0);
  if (offAxis) w.players[0].facing = { x: Math.SQRT1_2, y: Math.SQRT1_2 };
  step(w, [offAxis ? { aimX: 1, aimY: 1 } : {}, {}]); // The simulator, not a fixture edit, establishes P2's beacon.
  const views = [];
  for (let t = 0; t < ticks; t++) {
    views.push(percept(w, 'P1', 'MODE_B'));
    const phase = t % 88;
    const opponent = stationary ? {} : phase < 22 ? { moveY: -1 } :
      phase < 44 ? { moveX: -1 } : phase < 66 ? { moveY: 1 } : { moveX: 1 };
    step(w, [offAxis ? { aimX: 1, aimY: 1 } : { aimX: lookAway && t >= 180 ? -1 : 1 }, opponent]);
  }
  return views;
}
function replayCover(views, coordinationControls = {}, coverControl = {}, extra = {}, factory = createMind) {
  const mind = factory({ seed: 101, benchmarkInterface: true, deferCommand: true,
    captureTrace: true, captureDiagnostics: true, ablations: { noLearning: true },
    coverControl, coordinationControls, ...extra });
  const embodied = createCoverInterface(mind, { seed: 101 });
  const inputs = [], rows = [];
  for (const view of views) {
    inputs.push(embodied.act(structuredClone(view)));
    const decision = mind.lastDecision();
    if (decision && rows.at(-1)?.serial !== decision.serial) rows.push(decision);
  }
  return { mind, inputs, rows, trace: mind.trace() };
}
const opponentAttention = row => row.selfAttention.find(item => item.item === 'opponent');
const legal = legalCoverViews();
const full = replayCover(legal);
const controlCut = replayCover(legal, { monitorControl: false });

// Golden behavioral digests were independently generated from untouched source
// commit 9361222, then compared byte-for-byte with the current replay outputs.
// New opt-in settings fields are deliberately outside the behavioral payload;
// no action, trace, report, memory, or cognition field is normalized or removed.
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function behavioralPayload(run) {
  return { inputs: run.inputs, trace: run.trace, cognition: run.mind.cognition(),
    memory: run.mind.memory(), coordination: run.mind.coordination(), report: run.mind.report() };
}

test('Cover beacon-only input never manufactures opponent content or a forecast', () => {
  const w = createWorld({ gameMode: 'COVER_CONTROL' });
  position(w, 1, 0, 0);
  const views = [];
  for (let t = 0; t < 100; t++) {
    step(w, [{}, {}]);
    views.push(percept(w, 'P1', 'MODE_B'));
  }
  assert.ok(views.every(v => v.opponent === null && v.objective.controller === 'P2'));
  for (const controls of [{}, { targetMonitoring: false }]) {
    const result = replayCover(views, {}, controls);
    assert.ok(result.rows.length > 0);
    for (const row of result.rows) {
      assert.equal(row.focus, 'Objective');
      assert.equal(row.cognition.cover.evidence.opponent, 'unobserved');
      assert.equal(row.cognition.coordination.packet, null);
      assert.equal(row.cognition.coordination.forecastIssue.issued, false);
      assert.equal(row.cognition.coordination.forecastIssue.reason, 'no-selected-target');
    }
    assert.equal(result.mind.coordination().monitor.assessed, 0);
  }
});

test('Objective carries its already-selected visible target into a real forecast; legacy control omits it', () => {
  const first = full.rows[0], old = replayCover(legal.slice(0, 120), {}, { targetMonitoring: false });
  const cycle = first.cognition.coordination;
  assert.equal(first.focus, 'Objective');
  assert.equal(first.cognition.cover.evidence.opponent, 'visible');
  assert.equal(cycle.packet.focus, 'Objective');
  assert.equal(cycle.packet.entity, 'opponent');
  assert.equal(cycle.packet.source, 'observed');
  assert.equal(cycle.forecastIssue.issued, true);
  assert.equal(cycle.forecastIssue.forecast.issuedAt, first.time);
  assert.ok(cycle.forecastIssue.forecast.dueAt > first.time);
  assert.equal(cycle.work.reservedUnits, COORDINATION_NOMINAL_UNITS);
  assert.ok(old.rows.every(r => r.focus === 'Objective' && r.cognition.cover.evidence.opponent === 'visible'));
  assert.ok(old.rows.every(r => r.cognition.coordination.packet === null));
  assert.ok(old.rows.every(r => r.cognition.coordination.forecastIssue.issued === false));
  assert.equal(old.mind.coordination().monitor.assessed, 0);
});

test('remembered Objective hypotheses retain their observed lineage and expire without hidden target refresh', () => {
  const memories = full.rows.filter(r => r.cognition.coordination.packet?.source !== 'observed' &&
    r.cognition.coordination.packet !== null);
  assert.ok(memories.length > 0);
  const byTime = new Map(legal.map(v => [v.time.elapsedSec, v]));
  for (const row of memories) {
    const packet = row.cognition.coordination.packet;
    assert.equal(byTime.get(row.time).opponent, null);
    assert.ok(packet.originalEvidenceTime < row.time);
    assert.ok(packet.issuedAt >= packet.originalEvidenceTime);
    const original = full.rows.find(r => r.cognition.coordination.packet?.source === 'observed' &&
      r.cognition.coordination.packet.evidenceId === packet.evidenceId);
    assert.ok(original);
    assert.equal(packet.originalEvidenceTime, original.time);
  }
  const stale = full.trace.filter(r => r.belief.stalenessSec >= 1);
  assert.ok(stale.length > 0);
  assert.ok(stale.every(r => r.cognition.coordination.packet === null));
});

test('fresh legal prediction mismatch changes actual Objective gaze and later bounded planning; control and feedback lesions are distinct', () => {
  const feedback = replayCover(legal, { monitorFeedback: false });
  const restored = replayCover(legal, { monitorFeedback: true, monitorControl: true });
  assert.deepEqual(restored.inputs, full.inputs);
  assert.deepEqual(restored.trace, full.trace);
  assert.deepEqual(controlCut.mind.memory().predictionReliability, full.mind.memory().predictionReliability);
  assert.equal(feedback.mind.memory().predictionReliability.assessed, 0);
  assert.ok(controlCut.rows.every(r => !r.cognition.monitorForced));
  assert.ok(feedback.rows.every(r => !r.cognition.monitorForced));
  const i = full.rows.findIndex(r => r.cognition.coordination.assessment?.discrepancy > .5);
  assert.ok(i >= 0);
  const actual = full.rows[i], cut = controlCut.rows[i];
  const assessed = actual.cognition.coordination.assessment.assessment;
  const issued = full.rows.find(r => r.cognition.coordination.forecastIssue?.issued &&
    r.cognition.coordination.forecastIssue.forecast.revision === assessed.revision);
  assert.ok(issued && issued.time < actual.time);
  assert.equal(issued.focus, 'Objective');
  assert.equal(actual.focus, 'Objective');
  assert.deepEqual(assessed.observed, legal.find(v => v.time.elapsedSec === actual.time).opponent.position);
  assert.equal(assessed.error, Math.hypot(assessed.predicted.x - assessed.observed.x,
    assessed.predicted.y - assessed.observed.y));
  assert.deepEqual(full.rows.slice(0, i).map(r => r.input), controlCut.rows.slice(0, i).map(r => r.input));
  assert.equal(actual.cognition.coordination.request.reason, 'fresh-large-error');
  assert.equal(opponentAttention(full.trace[i]).due, true);
  assert.equal(opponentAttention(controlCut.trace[i]).due, false);
  assert.notDeepEqual({ x: actual.input.aimX, y: actual.input.aimY }, { x: cut.input.aimX, y: cut.input.aimY });
  assert.notDeepEqual(actual.actualCommand, cut.actualCommand);
  const changedPlan = full.rows.findIndex((r, n) => r.cognition.cover.planning.requested &&
    r.cognition.cover.planning.reason === 'prediction mismatch' && !controlCut.rows[n].cognition.cover.planning.requested);
  assert.ok(changedPlan > i);
  assert.equal(full.rows[changedPlan].cognition.tier, 2);
  assert.ok(full.rows[changedPlan].cognition.branches.length > 0);
  assert.equal(controlCut.rows[changedPlan].cognition.branches.length, 0);
  const requested = full.rows.filter(r => r.cognition.cover.planning.requested);
  for (let n = 1; n < requested.length; n++) assert.ok(requested[n].time - requested[n - 1].time >= COVER_REPLAN_SEC - 1e-9);
  assert.ok(full.rows.every(r => r.cognition.budget.spent <= 192));
});

test('stale Objective suppression preserves real monitor reacquisition and changes the final gaze command', () => {
  const i = full.trace.findIndex(r => r.focus === 'Objective' && r.belief.stalenessSec >= 1 &&
    r.cognition.coordination.request?.reacquire);
  assert.ok(i >= 0);
  const intact = full.trace[i], cut = controlCut.trace[i];
  assert.equal(intact.cognition.coordination.packet, null);
  assert.equal(intact.cognition.cover.evidence.opponent, 'unobserved');
  assert.equal(opponentAttention(intact).due, true);
  assert.equal(opponentAttention(intact).reason, 'prediction-monitor');
  assert.equal(opponentAttention(cut).due, false);
  assert.notDeepEqual(intact.input, cut.input);
  assert.notDeepEqual(intact.actualCommand, cut.actualCommand);
});

test('fixed monitor schedule uses declared decision phase and normal Cover cooldown without error-gated timing', () => {
  const schedule = { every: 6, phase: 1 };
  const run = replayCover(legalCoverViews({ stationary: true, lookAway: false, ticks: 180, offAxis: true }),
    { monitorControl: false, fixedMonitorSchedule: schedule });
  assert.ok(run.rows.some(r => r.cognition.coordination.request));
  assert.ok(run.rows.every(r => !r.cognition.coordination.proposedRequest.replan));
  assert.ok(run.rows.some(r => r.cognition.cover.planning.reason === 'fixed monitoring schedule'));
  for (const row of run.rows) {
    const cycle = row.cognition.coordination;
    assert.equal(!!cycle.request, (cycle.revision - 1) % schedule.every === schedule.phase);
    if (cycle.request) {
      assert.equal(cycle.request.reason, 'fixed-monitor-schedule');
      assert.equal(opponentAttention(run.trace[row.serial - 1]).due, true);
      assert.equal(row.cognition.monitorForced, true);
    }
  }
  const requested = run.rows.filter(r => r.cognition.cover.planning.requested);
  for (let n = 1; n < requested.length; n++) assert.ok(requested[n].time - requested[n - 1].time >= COVER_REPLAN_SEC - 1e-9);
  assert.ok(run.rows.some(r => r.cognition.coordination.request && r.cognition.cover.planning.reason === 'cooldown'));
  assert.ok(run.rows.every(r => r.cognition.budget.spent <= 192));
});

test('monitor schedule and Cover switches reject malformed or conflicting controls', () => {
  for (const fixedMonitorSchedule of [false, 0, '', true, [], { every: 0, phase: 0 }, { every: 1001, phase: 0 },
    { every: 3.5, phase: 0 }, { every: 3, phase: -1 }, { every: 3, phase: 3 },
    { every: 3, phase: .5 }, { every: 3, phase: 0, hidden: true }]) {
    assert.throws(() => createCoordination({ researchControls: { monitorControl: false, fixedMonitorSchedule } }), /fixed monitor schedule/);
  }
  assert.throws(() => createCoordination({ researchControls: { fixedMonitorSchedule: { every: 3, phase: 0 } } }), /disabled monitor control/);
  assert.throws(() => createMind({ coordinationControls: { monitorControl: false, fixedMonitorSchedule: { every: 3, phase: 0 } } }), /benchmark interface/);
  assert.throws(() => createCoverPolicy({ targetMonitoring: 'false' }), /invalid Cover controls/);
  assert.equal(createCoverPolicy().enabled.targetMonitoring, true);
  assert.equal(createCoverPolicy({ targetMonitoring: false }).enabled.targetMonitoring, false);
});

test('targetMonitoring false exactly reproduces pinned old Integrated behavioral payload', () => {
  const oldBehavior = replayCover(legal, {}, { targetMonitoring: false });
  assert.equal(digest(behavioralPayload(oldBehavior)), 'e40ab6e3035e39aa3d8fa28d7a5905af3c0a3967b645a9f152e41cdcc4bea89e');
});

function legalDuelViews() {
  const world = createWorld(), views = [];
  for (let t = 0; t < 240; t++) {
    views.push(percept(world, 'P1', 'MODE_B'));
    step(world, [{ aimX: t < 120 ? 1 : -1, moveY: t < 30 ? -1 : 0 },
      t % 100 < 50 ? { moveY: -1 } : { moveX: -1 }]);
  }
  return views;
}
function replayDuel(views, factory = createMind) {
  const mind = factory({ seed: 731, captureTrace: true, captureDiagnostics: true });
  const inputs = views.map(v => mind.act(structuredClone(v), 1 / 120));
  return { mind, inputs, trace: mind.trace() };
}
test('default Duel exactly reproduces pinned old actions, trace, feedback, memory, cognition and report', () => {
  const run = replayDuel(legalDuelViews());
  assert.equal(digest(behavioralPayload(run)), '5d7403250a5e695d85cd0e0960dd38d8585adb3e5e86d26e40d38d59fe17f324');
});

function replayExistingCover(views, factory = createCoverMind) {
  const mind = factory({ seed: 101, captureTrace: true });
  const inputs = views.map(v => mind.act(structuredClone(v)));
  return { mind, inputs, trace: mind.trace() };
}
test('Existing Cover factory exactly reproduces pinned old actions, trace, feedback, memory, cognition, report and settings', () => {
  const run = replayExistingCover(legal);
  assert.equal(digest({ ...behavioralPayload(run), settings: run.mind.settings() }), '2676f1d113212e1ae7d942cd1b5c90e9d81301e79ec45197f4f032a706007f80');
});
