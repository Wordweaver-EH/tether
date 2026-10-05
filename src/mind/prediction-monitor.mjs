// Percept-clock target-predictor monitoring only. These discrepancies are neither
// calibrated hit probabilities nor independent evidence of successful play.
export const PREDICTION_DUE_SEC = 0.3;
export const PREDICTION_EXPIRY_SEC = 1;
export const PREDICTION_ERROR_ALPHA = 0.25;
export const PREDICTION_MIN_ASSESSMENTS = 2;
export const PREDICTION_ERROR_THRESHOLD = 0.5;
export const PREDICTION_MAX_ASSESSMENTS = 1e6;

const SOURCES = new Set(['observed', 'predicted', 'episodic']);
const FORECAST_KEYS = ['revision', 'entity', 'mean', 'velocity', 'hypothesisTime',
  'originalEvidenceTime', 'source'];
const OBSERVATION_KEYS = ['evidenceId', 'entity', 'position', 'time', 'source'];
const finiteTime = value => Number.isFinite(value) && value >= 0;
const identifier = value => Number.isSafeInteger(value) && value >= 0;
const entityName = value => value === 'opponent';
const copy = value => structuredClone(value);

// Plain data schemas exclude inherited data, accessors and coercion. Persisted
// state, vectors and observations additionally require an exact set of fields.
function dataRecord(value, keys, exact = true) {
  try {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if ((exact && Reflect.ownKeys(descriptors).length !== keys.length) || !keys.every(key =>
      Object.hasOwn(descriptors, key) && Object.hasOwn(descriptors[key], 'value'))) return null;
    return Object.fromEntries(keys.map(key => [key, descriptors[key].value]));
  } catch {
    return null;
  }
}

function vector(value) {
  const result = dataRecord(value, ['x', 'y']);
  return result && Number.isFinite(result.x) && Number.isFinite(result.y) ? result : null;
}

function category(state) {
  return state.assessed < PREDICTION_MIN_ASSESSMENTS ? 'unknown'
    : state.errorEWMA > PREDICTION_ERROR_THRESHOLD ? 'high-error' : 'low-error';
}

function restore(snapshot) {
  const data = dataRecord(snapshot, ['version', 'assessed', 'errorEWMA']);
  if (!data || data.version !== 1 || !Number.isInteger(data.assessed) ||
      data.assessed < 0 || data.assessed > PREDICTION_MAX_ASSESSMENTS ||
      (data.assessed === 0 ? data.errorEWMA !== null :
        !Number.isFinite(data.errorEWMA) || data.errorEWMA < 0))
    return { assessed: 0, errorEWMA: null };
  return { assessed: data.assessed, errorEWMA: data.errorEWMA };
}

function forecastInput(value, now) {
  // Full validated workspace packets may carry unrelated recipient metadata.
  // Read only the monitor's own fields, never getters or hidden-state extras.
  const record = dataRecord(value, FORECAST_KEYS, false);
  if (!record || !identifier(record.revision) || !entityName(record.entity) ||
      !SOURCES.has(record.source) || !finiteTime(record.hypothesisTime) ||
      !finiteTime(record.originalEvidenceTime) || record.originalEvidenceTime > record.hypothesisTime ||
      record.hypothesisTime > now) return null;
  const mean = vector(record.mean), velocity = vector(record.velocity);
  if (!mean || !velocity) return null;
  const dueAt = now + PREDICTION_DUE_SEC, expiresAt = now + PREDICTION_EXPIRY_SEC;
  if (!Number.isFinite(expiresAt) || !(dueAt > now && expiresAt > dueAt)) return null;
  // Reject finite inputs whose projection would overflow within this forecast.
  for (const at of [now, expiresAt]) {
    const horizon = at - record.hypothesisTime;
    if (!['x', 'y'].every(axis => Number.isFinite(mean[axis] + velocity[axis] * horizon))) return null;
  }
  return { ...record, mean, velocity, issuedAt: now, dueAt, expiresAt };
}

function observationInput(value, now) {
  const record = dataRecord(value, OBSERVATION_KEYS);
  if (!record || !identifier(record.evidenceId) || !entityName(record.entity) ||
      record.source !== 'observed' || !finiteTime(record.time) || record.time !== now) return null;
  const position = vector(record.position);
  return position ? { ...record, position } : null;
}

/**
 * `now` and observation.time are the same delayed percept clock, in seconds.
 * Call settle before issue. The single pending forecast cannot be overwritten.
 * `readOnly` preserves persisted reliability aggregates, while accepted online
 * assessments can still trigger the transient fresh-error control request.
 * `committed` reports an aggregate write, not acceptance of a transient sample.
 * The feedback lesion computes a proposal without using it for either persisted
 * reliability or the transient assessment/fresh-error control request.
 */
export function createPredictionMonitor(snapshot = null, { readOnly = false } = {}) {
  let reliability = restore(snapshot);
  let pending = null, lastIssued = null, lastDisposition = null;
  let lastClock = null, lastObservation = null, lastAssessment = null;
  let lastRevision = -1, settlementToken = null, freshErrorToken = null;

  function request() {
    const freshLargeError = freshErrorToken === settlementToken && lastAssessment !== null &&
      lastAssessment.error > PREDICTION_ERROR_THRESHOLD;
    const highError = category(reliability) === 'high-error';
    return {
      reacquire: freshLargeError || highError,
      replan: freshLargeError || highError,
      reason: freshLargeError ? 'fresh-large-error' : highError ? 'high-error'
        : category(reliability) === 'unknown' ? 'unknown' : 'low-error',
      entity: lastIssued?.entity ?? null,
      revision: lastIssued?.revision ?? null,
    };
  }

  function reliabilityState() {
    return { ...reliability, category: category(reliability),
      lastError: lastAssessment?.error ?? null,
      lastAssessmentTime: lastAssessment?.assessmentTime ?? null };
  }

  function result(status, reason, assessment = null, proposed = null, committed = false) {
    return copy({ status, reason, discrepancy: assessment?.error ?? null,
      assessment, proposed, committed, request: request() });
  }

  return Object.freeze({
    issue(value, now) {
      if (!finiteTime(now) || (lastClock !== null && now < lastClock))
        return { issued: false, reason: 'invalid-clock', forecast: null };
      const forecast = forecastInput(value, now);
      if (!forecast) return { issued: false, reason: 'invalid-forecast', forecast: null };
      if (pending) return { issued: false, reason: 'forecast-pending', forecast: copy(pending) };
      if (forecast.revision <= lastRevision)
        return { issued: false, reason: 'non-increasing-revision', forecast: null };
      lastClock = now;
      pending = forecast;
      lastRevision = forecast.revision;
      lastIssued = { entity: forecast.entity, revision: forecast.revision };
      return { issued: true, reason: 'issued', forecast: copy(pending) };
    },

    settle(value, now, { commitFeedback = true } = {}) {
      if (!finiteTime(now) || (lastClock !== null && now < lastClock))
        return result('rejected', 'invalid-clock');
      lastClock = now;
      // Only the immediately accepted assessment can supply the one-update
      // large-error request; later calls use the empirical category alone.
      settlementToken = {};
      const observation = observationInput(value, now);
      const fresh = observation !== null && (lastObservation === null ||
        (observation.evidenceId > lastObservation.evidenceId && observation.time > lastObservation.time));
      if (fresh) lastObservation = { evidenceId: observation.evidenceId, time: observation.time };
      if (!pending) return result('idle', 'no-forecast');

      const forecast = pending;
      const eligible = fresh && observation.entity === forecast.entity &&
        observation.time > forecast.issuedAt;
      // Exactly expiry permits assessment, but after expiry always censors.
      if (now > forecast.expiresAt || (now === forecast.expiresAt && !eligible)) {
        pending = null;
        lastDisposition = { status: 'censored', reason: now > forecast.expiresAt
          ? 'expired' : 'missing-at-expiry', revision: forecast.revision,
          entity: forecast.entity, time: now, horizonSec: now - forecast.issuedAt };
        return result('censored', lastDisposition.reason);
      }
      if (now < forecast.dueAt) return result('pending', 'not-due');
      if (!eligible) return result('pending', observation === null ? 'no-valid-observation'
        : !fresh ? 'non-increasing-evidence' : 'different-entity');

      const hypothesisHorizonSec = now - forecast.hypothesisTime;
      const predicted = {
        x: forecast.mean.x + forecast.velocity.x * hypothesisHorizonSec,
        y: forecast.mean.y + forecast.velocity.y * hypothesisHorizonSec,
      };
      const error = Math.hypot(predicted.x - observation.position.x, predicted.y - observation.position.y);
      // Overflow must not turn non-evidence into success or poison the EWMA.
      if (!Number.isFinite(error)) {
        if (now === forecast.expiresAt) {
          pending = null;
          lastDisposition = { status: 'censored', reason: 'invalid-discrepancy-at-expiry',
            revision: forecast.revision, entity: forecast.entity, time: now,
            horizonSec: now - forecast.issuedAt };
          return result('censored', lastDisposition.reason);
        }
        return result('pending', 'invalid-discrepancy');
      }
      const assessment = { revision: forecast.revision, entity: forecast.entity,
        source: forecast.source, originalEvidenceTime: forecast.originalEvidenceTime,
        hypothesisTime: forecast.hypothesisTime, issuedAt: forecast.issuedAt,
        evidenceId: observation.evidenceId, assessmentTime: now,
        horizonSec: now - forecast.issuedAt, hypothesisHorizonSec,
        predicted, observed: { ...observation.position }, error };
      const next = { assessed: Math.min(PREDICTION_MAX_ASSESSMENTS, reliability.assessed + 1),
        errorEWMA: reliability.assessed === 0 ? error
          : (1 - PREDICTION_ERROR_ALPHA) * reliability.errorEWMA + PREDICTION_ERROR_ALPHA * error };
      const proposed = { ...next, category: category(next), lastError: error, lastAssessmentTime: now };
      const committed = commitFeedback === true && readOnly !== true;
      pending = null;
      if (committed) reliability = next;
      if (commitFeedback === true) {
        lastAssessment = assessment;
        freshErrorToken = settlementToken;
      }
      lastDisposition = { status: 'assessed', reason: committed ? 'committed'
        : commitFeedback !== true ? 'feedback-disconnected' : 'read-only',
        revision: forecast.revision, entity: forecast.entity, time: now,
        horizonSec: assessment.horizonSec, assessment, proposed, committed };
      return result('assessed', lastDisposition.reason, assessment, proposed, committed);
    },

    request,
    state: () => copy({ ...reliabilityState(), pending, lastObservation,
      lastAssessment, lastDisposition, request: request() }),
    snapshot: () => ({ version: 1, ...reliability }),
  });
}
