import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPredictionMonitor, PREDICTION_DUE_SEC, PREDICTION_EXPIRY_SEC,
  PREDICTION_ERROR_ALPHA, PREDICTION_MIN_ASSESSMENTS, PREDICTION_ERROR_THRESHOLD,
  PREDICTION_MAX_ASSESSMENTS } from '../src/mind/prediction-monitor.mjs';

// Pure clock/geometry fixtures establish mechanism contracts, not acquisition,
// independent prediction evidence, calibrated probabilities or game outcomes.
const forecast = (overrides = {}) => ({ revision: 0, entity: 'opponent',
  mean: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, hypothesisTime: 0,
  originalEvidenceTime: 0, source: 'observed', ...overrides });
const observation = (time, overrides = {}) => ({ evidenceId: 0, entity: 'opponent',
  position: { x: 0, y: 0 }, time, source: 'observed', ...overrides });
const snapshot = (assessed = 0, errorEWMA = null) => ({ version: 1, assessed, errorEWMA });
const assess = (monitor, error, index = 0, options) => {
  const now = index * 2;
  const issued = monitor.issue(forecast({ revision: index, hypothesisTime: now,
    originalEvidenceTime: now }), now);
  assert.equal(issued.issued, true);
  const at = issued.forecast.dueAt;
  return monitor.settle(observation(at, { evidenceId: index, position: { x: error, y: 0 } }), at, options);
};

test('monitor uses the frozen engineering constants and starts explicitly unknown', () => {
  assert.equal(PREDICTION_DUE_SEC, 0.3);
  assert.equal(PREDICTION_EXPIRY_SEC, 1);
  assert.equal(PREDICTION_ERROR_ALPHA, 0.25);
  assert.equal(PREDICTION_MIN_ASSESSMENTS, 2);
  assert.equal(PREDICTION_ERROR_THRESHOLD, 0.5);
  const monitor = createPredictionMonitor();
  assert.deepEqual(monitor.snapshot(), snapshot());
  assert.equal(monitor.state().category, 'unknown');
  assert.equal(monitor.state().lastError, null);
  assert.equal(monitor.state().lastAssessmentTime, null);
  assert.equal(monitor.state().pending, null);
  assert.deepEqual(monitor.request(), { reacquire: false, replan: false, reason: 'unknown',
    entity: null, revision: null });
});

test('one forecast freezes before evidence and cannot be overwritten before settlement', () => {
  const monitor = createPredictionMonitor();
  const input = forecast({ mean: { x: 1, y: 2 }, velocity: { x: 2, y: -1 } });
  const issued = monitor.issue(input, 0);
  assert.equal(issued.issued, true);
  const frozen = monitor.state().pending;
  input.mean.x = 100;
  input.velocity.y = 100;
  issued.forecast.mean.x = 200;
  assert.deepEqual(monitor.state().pending, frozen);
  assert.equal(monitor.issue(forecast({ revision: 1 }), 0.3).reason, 'forecast-pending');
  const settled = monitor.settle(observation(0.3, { position: { x: 1.6, y: 1.7 } }), 0.3);
  assert.equal(settled.status, 'assessed');
  assert.equal(settled.discrepancy, 0);
  assert.deepEqual(settled.assessment.predicted, { x: 1.6, y: 1.7 });
});

test('prediction anchors at hypothesis time, distinct from older original evidence and issuance', () => {
  const monitor = createPredictionMonitor();
  monitor.issue(forecast({ mean: { x: 2, y: 3 }, velocity: { x: 4, y: -2 },
    hypothesisTime: 5, originalEvidenceTime: 1, source: 'episodic' }), 5.2);
  const result = monitor.settle(observation(5.7, { position: { x: 7.8, y: 5.6 } }), 5.7);
  assert.equal(result.status, 'assessed');
  assert.ok(Math.abs(result.discrepancy - 5) < 1e-12);
  assert.ok(Math.abs(result.assessment.predicted.x - 4.8) < 1e-12);
  assert.ok(Math.abs(result.assessment.predicted.y - 1.6) < 1e-12);
  assert.equal(result.assessment.horizonSec, 0.5);
  assert.ok(Math.abs(result.assessment.hypothesisHorizonSec - 0.7) < 1e-12);
  assert.equal(result.assessment.originalEvidenceTime, 1);
  assert.equal(result.assessment.source, 'episodic');
});

test('pre-due sightings remain unscored and the first eligible visible sample assesses', () => {
  const monitor = createPredictionMonitor();
  monitor.issue(forecast(), 0);
  for (const [index, now] of [0, 0.1, 0.299999999999].entries()) {
    const result = monitor.settle(observation(now, { evidenceId: index }), now);
    assert.equal(result.reason, 'not-due');
    assert.deepEqual(monitor.snapshot(), snapshot());
  }
  const result = monitor.settle(observation(0.3, { evidenceId: 3 }), 0.3);
  assert.equal(result.status, 'assessed');
  assert.equal(result.assessment.horizonSec, 0.3);
  assert.equal(monitor.state().pending, null);
  assert.deepEqual(monitor.snapshot(), snapshot(1, 0));
});

test('missing samples between due and expiry do not score or prematurely censor', () => {
  const monitor = createPredictionMonitor();
  monitor.issue(forecast({ velocity: { x: 2, y: 0 } }), 0);
  for (const now of [0.3, 0.5, 0.999999999999]) {
    assert.equal(monitor.settle(null, now).status, 'pending');
    assert.notEqual(monitor.state().pending, null);
  }
  const result = monitor.settle(observation(1, { position: { x: 2, y: 0 } }), 1);
  assert.equal(result.status, 'assessed');
  assert.equal(result.discrepancy, 0);
  assert.equal(result.assessment.horizonSec, 1);
});

test('a missing sample exactly at expiry censors once without reliability evidence', () => {
  const monitor = createPredictionMonitor(snapshot(2, 0.8));
  monitor.issue(forecast(), 0);
  assert.equal(monitor.settle(null, 1).status, 'censored');
  assert.equal(monitor.state().lastDisposition.reason, 'missing-at-expiry');
  const state = monitor.state();
  assert.equal(monitor.settle(null, 1.1).status, 'idle');
  assert.deepEqual(monitor.state().lastDisposition, state.lastDisposition);
  assert.deepEqual(monitor.snapshot(), snapshot(2, 0.8));
  assert.equal(monitor.request().replan, true);
});

test('a visible sample after expiry always censors instead of scoring', () => {
  const monitor = createPredictionMonitor();
  monitor.issue(forecast(), 0);
  const result = monitor.settle(observation(1.000000000001, { position: { x: 500, y: 0 } }), 1.000000000001);
  assert.equal(result.status, 'censored');
  assert.equal(result.reason, 'expired');
  assert.equal(result.discrepancy, null);
  assert.equal(result.proposed, null);
  assert.deepEqual(monitor.snapshot(), snapshot());
});

test('delayed-clock timestamps cannot be replaced by live, stale or future observation time', () => {
  const monitor = createPredictionMonitor();
  monitor.issue(forecast(), 10);
  for (const time of [0.3, 10.2999, 10.3001, 10.5]) {
    assert.equal(monitor.settle(observation(time), 10.3).status, 'pending');
    assert.equal(monitor.state().lastObservation, null);
  }
  const result = monitor.settle(observation(10.3), 10.3);
  assert.equal(result.status, 'assessed');
  assert.equal(result.assessment.assessmentTime, 10.3);
});

test('invalid or backward clock calls cannot mutate any monitor state', () => {
  const monitor = createPredictionMonitor();
  monitor.issue(forecast(), 2);
  const before = monitor.state();
  for (const now of [null, undefined, '2', NaN, Infinity, -Infinity, -1, 1.9]) {
    assert.equal(monitor.settle(observation(2), now).reason, 'invalid-clock');
    assert.equal(monitor.issue(forecast({ revision: 1 }), now).reason, 'invalid-clock');
    assert.deepEqual(monitor.state(), before);
  }
});

test('both evidence ID and time must increase, including earlier idle and pre-due observations', () => {
  const monitor = createPredictionMonitor();
  monitor.settle(observation(0, { evidenceId: 5 }), 0);
  monitor.issue(forecast(), 0);
  assert.equal(monitor.settle(observation(0.3, { evidenceId: 5 }), 0.3).reason, 'non-increasing-evidence');
  assert.equal(monitor.settle(observation(0.3, { evidenceId: 4 }), 0.3).reason, 'non-increasing-evidence');
  assert.equal(monitor.settle(observation(0.3, { evidenceId: 6 }), 0.3).status, 'assessed');
  monitor.issue(forecast({ revision: 1, hypothesisTime: 0.3 }), 0.3);
  assert.equal(monitor.settle(observation(0.3, { evidenceId: 7 }), 0.3).reason, 'not-due');
  assert.deepEqual(monitor.state().lastObservation, { evidenceId: 6, time: 0.3 });
  assert.equal(monitor.settle(observation(0.4, { evidenceId: 8 }), 0.4).reason, 'not-due');
  assert.equal(monitor.settle(observation(0.6, { evidenceId: 8 }), 0.6).reason, 'non-increasing-evidence');
  assert.equal(monitor.settle(observation(0.6, { evidenceId: 9 }), 0.6).status, 'assessed');
  assert.equal(monitor.state().assessed, 2);
});

test('a just-created forecast and repeated sensory ticks cannot be scored', () => {
  const monitor = createPredictionMonitor();
  monitor.issue(forecast(), 0);
  const sample = observation(0.3);
  assert.equal(monitor.settle(sample, 0.3).status, 'assessed');
  const baseline = monitor.snapshot();
  for (let i = 0; i < 10; i++) assert.equal(monitor.settle(sample, 0.3).status, 'idle');
  assert.deepEqual(monitor.snapshot(), baseline);
  monitor.issue(forecast({ revision: 1, hypothesisTime: 0.3 }), 0.3);
  assert.equal(monitor.settle(sample, 0.3).reason, 'not-due');
  assert.deepEqual(monitor.snapshot(), baseline);
});

test('recalled, predicted and unsupported entity observations never become sensory evidence', () => {
  const monitor = createPredictionMonitor();
  monitor.issue(forecast(), 0);
  for (const change of [{ source: 'episodic' }, { source: 'predicted' }, { entity: 'spear' },
    { source: 'OBSERVED' }, { source: null }]) {
    assert.equal(monitor.settle(observation(0.3, change), 0.3).reason, 'no-valid-observation');
    assert.equal(monitor.state().lastObservation, null);
  }
  assert.equal(monitor.settle(observation(0.3), 0.3).status, 'assessed');
});

test('forecast provenance may be observed, predicted or episodic without adding evidence', () => {
  for (const source of ['observed', 'predicted', 'episodic']) {
    const monitor = createPredictionMonitor();
    assert.equal(monitor.issue(forecast({ source }), 0).issued, true);
    assert.deepEqual(monitor.snapshot(), snapshot());
    assert.equal(monitor.settle(null, 1).status, 'censored');
    assert.deepEqual(monitor.snapshot(), snapshot());
  }
});

test('first actual error initializes EWMA and reliability stays unknown until two assessments', () => {
  const monitor = createPredictionMonitor();
  const first = assess(monitor, 4);
  assert.equal(first.proposed.errorEWMA, 4);
  assert.equal(monitor.state().errorEWMA, 4);
  assert.equal(monitor.state().category, 'unknown');
  assert.equal(monitor.request().reason, 'fresh-large-error');
  const second = assess(monitor, 0, 1);
  assert.equal(second.proposed.errorEWMA, 3);
  assert.equal(monitor.state().category, 'high-error');
  assert.equal(monitor.request().reason, 'high-error');
});

test('threshold equality is low-error and a fresh larger discrepancy has a one-update impulse', () => {
  const equality = createPredictionMonitor();
  assess(equality, 0.5);
  assert.equal(equality.request().replan, false);
  assess(equality, 0.5, 1);
  assert.equal(equality.state().category, 'low-error');
  assert.equal(equality.request().replan, false);
  const monitor = createPredictionMonitor();
  assess(monitor, 0.500000000001);
  assert.equal(monitor.state().category, 'unknown');
  assert.equal(monitor.request().reacquire, true);
  assert.equal(monitor.request().replan, true);
  monitor.settle(null, 0.4);
  assert.equal(monitor.request().reason, 'unknown');
  assert.equal(monitor.request().replan, false);
  assert.equal(monitor.state().assessed, 1);
});

test('sequential real discrepancies recover control through the frozen EWMA rule', () => {
  const monitor = createPredictionMonitor();
  assess(monitor, 1);
  assert.equal(monitor.request().replan, true);
  assess(monitor, 0, 1);
  assert.equal(monitor.state().errorEWMA, 0.75);
  assert.equal(monitor.request().replan, true);
  assess(monitor, 0, 2);
  assert.equal(monitor.state().errorEWMA, 0.5625);
  assert.equal(monitor.request().replan, true);
  assess(monitor, 0, 3);
  assert.equal(monitor.state().errorEWMA, 0.421875);
  assert.equal(monitor.state().category, 'low-error');
  assert.equal(monitor.request().reacquire, false);
  assert.equal(monitor.request().replan, false);
});

test('censoring neither improves nor worsens empirical reliability or creates proposals', () => {
  for (const initial of [snapshot(), snapshot(1, 4), snapshot(2, 0.2), snapshot(2, 4)]) {
    const monitor = createPredictionMonitor(initial);
    monitor.issue(forecast(), 0);
    const result = monitor.settle(null, 1);
    assert.equal(result.status, 'censored');
    assert.equal(result.discrepancy, null);
    assert.equal(result.proposed, null);
    assert.equal(result.committed, false);
    assert.deepEqual(monitor.snapshot(), initial);
  }
});

test('feedback cut computes discrepancy/proposal but cannot leak any new governing reliability', () => {
  const monitor = createPredictionMonitor(snapshot(2, 0.25));
  const before = monitor.snapshot();
  const result = assess(monitor, 5, 0, { commitFeedback: false });
  assert.equal(result.status, 'assessed');
  assert.equal(result.discrepancy, 5);
  assert.equal(result.proposed.assessed, 3);
  assert.equal(result.proposed.errorEWMA, 1.4375);
  assert.equal(result.proposed.category, 'high-error');
  assert.equal(result.committed, false);
  assert.equal(result.reason, 'feedback-disconnected');
  assert.deepEqual(monitor.snapshot(), before);
  assert.equal(monitor.state().lastError, null);
  assert.equal(monitor.state().lastAssessment, null);
  assert.equal(monitor.state().lastAssessmentTime, null);
  assert.equal(monitor.state().category, 'low-error');
  assert.equal(monitor.request().reacquire, false);
  assert.equal(monitor.request().replan, false);
  assert.equal(monitor.state().pending, null);
  assert.deepEqual(monitor.state().lastDisposition.proposed, result.proposed);
});

test('feedback cut cannot erase prior high-error evidence or produce false recovery', () => {
  const monitor = createPredictionMonitor(snapshot(2, 0.6));
  const result = assess(monitor, 0, 0, { commitFeedback: false });
  assert.equal(result.proposed.category, 'low-error');
  assert.equal(monitor.state().category, 'high-error');
  assert.equal(monitor.request().reason, 'high-error');
  assert.equal(monitor.request().replan, true);
});

test('feedback cut preserves previously committed error and assessment metadata', () => {
  const monitor = createPredictionMonitor();
  assess(monitor, 0.2);
  const before = monitor.state();
  assess(monitor, 9, 1, { commitFeedback: false });
  const after = monitor.state();
  for (const key of ['assessed', 'errorEWMA', 'category', 'lastError', 'lastAssessmentTime', 'lastAssessment'])
    assert.deepEqual(after[key], before[key], key);
  assert.equal(after.request.replan, false);
  assert.equal(after.lastDisposition.assessment.error, 9);
  assert.equal(after.lastDisposition.proposed.lastError, 9);
});

test('restoring feedback updates from governing evidence rather than accumulating shadow proposals', () => {
  const monitor = createPredictionMonitor();
  assess(monitor, 8, 0, { commitFeedback: false });
  assert.equal(monitor.state().assessed, 0);
  assert.equal(monitor.request().replan, false);
  const restored = assess(monitor, 0.2, 1, { commitFeedback: true });
  assert.equal(restored.committed, true);
  assert.equal(monitor.state().assessed, 1);
  assert.equal(monitor.state().errorEWMA, 0.2);
  assert.equal(monitor.state().category, 'unknown');
  assert.equal(monitor.request().replan, false);
});

test('read-only freezes persisted reliability but a fresh surprise still requests online correction', () => {
  for (const initial of [snapshot(), snapshot(2, 0.25), snapshot(2, 2)]) {
    const monitor = createPredictionMonitor(initial, { readOnly: true });
    const result = assess(monitor, 10);
    assert.equal(result.status, 'assessed');
    assert.equal(result.reason, 'read-only');
    assert.equal(result.discrepancy, 10);
    assert.equal(result.proposed.assessed, initial.assessed + 1);
    assert.equal(result.committed, false);
    assert.deepEqual(monitor.snapshot(), initial);
    assert.equal(monitor.state().lastError, 10);
    assert.equal(monitor.state().lastAssessmentTime, 0.3);
    assert.deepEqual(monitor.state().lastAssessment, result.assessment);
    assert.equal(monitor.request().reason, 'fresh-large-error');
    assert.equal(monitor.request().reacquire, true);
    assert.equal(monitor.request().replan, true);
    assert.equal(monitor.state().pending, null);
    monitor.settle(null, 0.4);
    assert.equal(monitor.request().replan, initial.assessed >= 2 && initial.errorEWMA > 0.5);
    assert.deepEqual(monitor.snapshot(), initial);
    assert.equal(monitor.issue(forecast({ revision: 1 }), 1).issued, true);
  }
});

test('read-only transient assessment can recover without accumulating proposed reliability', () => {
  const initial = snapshot(2, 0.25);
  const monitor = createPredictionMonitor(initial, { readOnly: true });
  const surprise = assess(monitor, 5);
  assert.equal(surprise.proposed.category, 'high-error');
  assert.equal(monitor.state().category, 'low-error');
  assert.equal(monitor.request().replan, true);
  const recovered = assess(monitor, 0.1, 1);
  assert.equal(recovered.proposed.assessed, initial.assessed + 1);
  assert.equal(recovered.proposed.errorEWMA, 0.75 * initial.errorEWMA + 0.25 * 0.1);
  assert.equal(monitor.state().lastError, 0.1);
  assert.equal(monitor.state().lastAssessmentTime, 2.3);
  assert.equal(monitor.request().reacquire, false);
  assert.equal(monitor.request().replan, false);
  assert.deepEqual(monitor.snapshot(), initial);
});

test('feedback lesion under read-only suppresses transient assessment and impulse until restored', () => {
  const initial = snapshot(), monitor = createPredictionMonitor(initial, { readOnly: true });
  const disconnected = assess(monitor, 8, 0, { commitFeedback: false });
  assert.equal(disconnected.reason, 'feedback-disconnected');
  assert.equal(disconnected.discrepancy, 8);
  assert.equal(disconnected.proposed.lastError, 8);
  assert.equal(disconnected.committed, false);
  assert.equal(monitor.state().lastAssessment, null);
  assert.equal(monitor.state().lastError, null);
  assert.equal(monitor.request().reacquire, false);
  assert.equal(monitor.request().replan, false);
  assert.deepEqual(monitor.snapshot(), initial);

  const restored = assess(monitor, 2, 1, { commitFeedback: true });
  assert.equal(restored.reason, 'read-only');
  assert.equal(restored.committed, false);
  assert.equal(monitor.state().lastError, 2);
  assert.equal(monitor.request().reason, 'fresh-large-error');
  assert.equal(monitor.request().reacquire, true);
  assert.equal(monitor.request().replan, true);
  assert.deepEqual(monitor.snapshot(), initial);

  const accepted = monitor.state().lastAssessment;
  assess(monitor, 9, 2, { commitFeedback: false });
  assert.deepEqual(monitor.state().lastAssessment, accepted);
  assert.equal(monitor.state().lastError, 2);
  assert.equal(monitor.request().replan, false);
  assert.deepEqual(monitor.snapshot(), initial);
});

test('strict persisted schema rejects malformed snapshots completely without invoking accessors', () => {
  const invalid = [undefined, null, false, 1, 'snapshot', [], {}, snapshot(-1, 0),
    snapshot(0, 0), snapshot(1, null), snapshot(2, -1), snapshot(2, NaN),
    snapshot(2, Infinity), snapshot('2', 0.5), snapshot(1.1, 0.5),
    snapshot(PREDICTION_MAX_ASSESSMENTS + 1, 0), { ...snapshot(2, 0.2), version: 2 },
    { ...snapshot(2, 0.2), extra: 1 }, Object.create(snapshot(2, 0.2))];
  const accessor = snapshot(2, 0.2);
  Object.defineProperty(accessor, 'assessed', { get() { throw new Error('must not run'); } });
  invalid.push(accessor);
  for (const value of invalid) assert.deepEqual(createPredictionMonitor(value).snapshot(), snapshot());
  const nullPrototype = Object.assign(Object.create(null), snapshot(2, 0.2));
  assert.deepEqual(createPredictionMonitor(nullPrototype).snapshot(), snapshot(2, 0.2));
});

test('storage stays constant-sized with a capped evidence count and no persisted clocks or forecasts', () => {
  const monitor = createPredictionMonitor(snapshot(PREDICTION_MAX_ASSESSMENTS, 0));
  for (let index = 0; index < 100; index++) assess(monitor, 0.2, index);
  const saved = monitor.snapshot();
  assert.deepEqual(Object.keys(saved).sort(), ['assessed', 'errorEWMA', 'version']);
  assert.equal(saved.assessed, PREDICTION_MAX_ASSESSMENTS);
  assert.ok(JSON.stringify(saved).length < 100);
  const loaded = createPredictionMonitor(saved);
  assert.equal(loaded.state().pending, null);
  assert.equal(loaded.state().lastObservation, null);
  assert.equal(loaded.state().lastDisposition, null);
  assert.equal(loaded.issue(forecast(), 0).issued, true);
});

test('state, request, issue results, settlement diagnostics and snapshots are fully detached', () => {
  const input = snapshot(2, 0.2), monitor = createPredictionMonitor(input);
  input.errorEWMA = 99;
  const result = assess(monitor, 1);
  const saved = monitor.snapshot(), state = monitor.state(), request = monitor.request();
  const baseline = monitor.state();
  saved.errorEWMA = 99;
  result.assessment.predicted.x = 99;
  result.assessment.observed.x = 99;
  result.proposed.errorEWMA = 99;
  state.lastAssessment.predicted.x = 99;
  state.lastDisposition.proposed.errorEWMA = 99;
  state.lastObservation.evidenceId = 99;
  request.replan = false;
  assert.deepEqual(monitor.state(), baseline);
});

test('forecast validation rejects non-finite, future, malformed and unsupported entities', () => {
  const invalid = [null, undefined, [], false, {},
    forecast({ revision: -1 }), forecast({ revision: 0.5 }), forecast({ revision: '0' }),
    forecast({ revision: Number.MAX_SAFE_INTEGER + 1 }), forecast({ entity: 'spear' }),
    forecast({ entity: {} }), forecast({ source: 'recalled' }),
    forecast({ mean: { x: NaN, y: 0 } }), forecast({ mean: { x: '1', y: 0 } }),
    forecast({ mean: { x: 0, y: Infinity } }), forecast({ velocity: { x: -Infinity, y: 0 } }),
    forecast({ velocity: { x: Number.MAX_VALUE, y: 0 }, mean: { x: Number.MAX_VALUE, y: 0 } }),
    forecast({ mean: Object.create({ x: 0, y: 0 }) }),
    forecast({ velocity: { x: 0, y: 0, extra: 1 } }),
    forecast({ hypothesisTime: -1 }), forecast({ hypothesisTime: NaN }),
    forecast({ hypothesisTime: 0.1 }), forecast({ originalEvidenceTime: 0.1 }),
    forecast({ originalEvidenceTime: -1 }), forecast({ originalEvidenceTime: '0' }),
    Object.create(forecast())];
  const accessor = forecast();
  Object.defineProperty(accessor, 'mean', { get() { throw new Error('must not run'); } });
  invalid.push(accessor);
  for (const value of invalid) {
    const monitor = createPredictionMonitor();
    assert.equal(monitor.issue(value, 0).issued, false);
    assert.equal(monitor.state().pending, null);
    assert.deepEqual(monitor.snapshot(), snapshot());
  }
  assert.equal(createPredictionMonitor().issue(forecast(), Number.MAX_VALUE).issued, false);
});

test('full packets may carry unrelated fields but the monitor never reads privileged metadata', () => {
  const monitor = createPredictionMonitor(), packet = forecast();
  for (const key of ['world', 'belief', 'scores', 'seed', 'scenario', 'fixtureId'])
    Object.defineProperty(packet, key, { get() { throw new Error(`read ${key}`); } });
  assert.equal(monitor.issue(packet, 0).issued, true);
  assert.equal(monitor.settle(observation(0.3), 0.3).discrepancy, 0);
});

test('malformed sensory records fail closed and cannot poison evidence deduplication', () => {
  const monitor = createPredictionMonitor();
  monitor.issue(forecast(), 0);
  const invalid = [null, undefined, [], {}, observation(0.3, { evidenceId: -1 }),
    observation(0.3, { evidenceId: 0.5 }), observation(0.3, { evidenceId: '0' }),
    observation(0.3, { evidenceId: Number.MAX_SAFE_INTEGER + 1 }),
    observation(0.3, { position: { x: Infinity, y: 0 } }),
    observation(0.3, { position: { x: 0, y: NaN } }),
    observation(0.3, { position: { x: '0', y: 0 } }),
    observation(0.3, { position: { x: 0, y: 0, extra: 1 } }),
    observation(0.3, { extra: 1 }), Object.create(observation(0.3))];
  const accessor = observation(0.3);
  Object.defineProperty(accessor, 'evidenceId', { get() { throw new Error('must not run'); } });
  invalid.push(accessor);
  for (const value of invalid) {
    assert.equal(monitor.settle(value, 0.3).reason, 'no-valid-observation');
    assert.equal(monitor.state().lastObservation, null);
    assert.deepEqual(monitor.snapshot(), snapshot());
  }
  assert.equal(monitor.settle(observation(0.3), 0.3).status, 'assessed');
});

test('overflowing discrepancy is not evidence and missing valid evidence at expiry censors', () => {
  const monitor = createPredictionMonitor();
  monitor.issue(forecast({ mean: { x: Number.MAX_VALUE, y: 0 } }), 0);
  const huge = { x: -Number.MAX_VALUE, y: 0 };
  assert.equal(monitor.settle(observation(0.3, { position: huge }), 0.3).reason, 'invalid-discrepancy');
  assert.deepEqual(monitor.snapshot(), snapshot());
  const result = monitor.settle(observation(1, { evidenceId: 1, position: huge }), 1);
  assert.equal(result.status, 'censored');
  assert.equal(result.reason, 'invalid-discrepancy-at-expiry');
  assert.deepEqual(monitor.snapshot(), snapshot());
});

test('revisions increase after terminal dispositions and expired forecasts must settle before replacement', () => {
  const monitor = createPredictionMonitor();
  monitor.issue(forecast({ revision: 4 }), 0);
  assert.equal(monitor.issue(forecast({ revision: 5 }), 2).reason, 'forecast-pending');
  assert.equal(monitor.settle(null, 2).status, 'censored');
  for (const revision of [0, 3, 4])
    assert.equal(monitor.issue(forecast({ revision }), 2).reason, 'non-increasing-revision');
  assert.equal(monitor.issue(forecast({ revision: 5 }), 2).issued, true);
  assert.deepEqual(monitor.request(), { reacquire: false, replan: false, reason: 'unknown',
    entity: 'opponent', revision: 5 });
});

test('monitor has no simulator, evaluator, wall-clock or hidden-state dependencies', () => {
  const source = readFileSync(new URL('../src/mind/prediction-monitor.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /^\s*import\s/m);
  assert.doesNotMatch(source, /\b(?:Date|performance|process|fetch)\s*[.(]/);
});
