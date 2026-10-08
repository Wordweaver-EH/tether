// Opt-in, domain-independent action-value experiment. The adapter owns features,
// observed rewards, action costs, and the separation of training/evaluation data.
// No outcome metadata or hidden labels are read here. Randomized logged actions
// justify unweighted conditional regression; propensity is validated and audited,
// not used for inverse-propensity evaluation or a causal claim.
export const CHECKING_ACTIONS = Object.freeze(['continue', 'check', 'reconsider']);
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const finite = (x, label) => {
  if (!Number.isFinite(x)) throw new Error(`${label} must be finite`);
  return x;
};
function dimension(n) {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('invalid feature count');
  return n;
}
function vector(features, n) {
  if (!Array.isArray(features) || features.length !== n) throw new Error('feature dimension mismatch');
  return [1, ...Array.from(features, x => finite(x, 'feature'))];
}
function random(seed) {
  if (!Number.isSafeInteger(seed)) throw new Error('seed must be a safe integer');
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = Math.imul(state ^ (state >>> 15), 1 | state);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
// Deliberately accepts no features: assignment is independent of current state.
export function createUniformActionChooser(seed = 1) {
  const rng = random(seed);
  return () => Object.freeze({action: CHECKING_ACTIONS[Math.floor(rng() * 3)], propensity: 1 / 3});
}
function emptyModel(featureCount, ridge, control) {
  dimension(featureCount);
  return {
    version: 1, kind: 'checking-action-value-ridge', featureCount, ridge,
    control, trainingRows: 0,
    coefficients: Object.fromEntries(CHECKING_ACTIONS.map(a => [a, Array(featureCount + 1).fill(0)])),
    actionCounts: Object.fromEntries(CHECKING_ACTIONS.map(a => [a, 0])),
    support: Object.fromEntries(CHECKING_ACTIONS.map(a => [a, {count: 0, trained: false, minPropensity: null, maxPropensity: null}]))
  };
}
export function zeroCheckingValueModel(featureCount) {
  return freeze(emptyModel(featureCount, 0, 'zero-untrained'));
}
// Incremental QR with Givens rotations avoids squaring the condition number in
// normal equations. sqrt(ridge) I supplies regularization, including intercept.
function ridgeFit(rows, n, ridge) {
  const p = n + 1;
  const R = Array.from({length: p}, (_, i) => Array.from({length: p}, (_, j) => i === j ? Math.sqrt(ridge) : 0));
  const b = Array(p).fill(0);
  for (const row of rows) {
    const x = vector(row.features, n);
    let y = row.reward;
    for (let j = 0; j < p; j++) {
      const h = finite(Math.hypot(R[j][j], x[j]), 'ridge rotation');
      const c = R[j][j] / h, s = x[j] / h;
      R[j][j] = h;
      for (let k = j + 1; k < p; k++) {
        const previous = R[j][k];
        R[j][k] = finite(c * previous + s * x[k], 'ridge matrix');
        x[k] = finite(-s * previous + c * x[k], 'ridge matrix');
      }
      const previous = b[j];
      b[j] = finite(c * previous + s * y, 'ridge response');
      y = finite(-s * previous + c * y, 'ridge response');
    }
  }
  const beta = Array(p).fill(0);
  for (let j = p - 1; j >= 0; j--) {
    let value = b[j];
    for (let k = j + 1; k < p; k++) value = finite(value - R[j][k] * beta[k], 'ridge solution');
    beta[j] = finite(value / R[j][j], 'ridge solution');
  }
  return beta;
}
export function fitCheckingValueModel(rows, {ridge = 1, featureCount, shuffleRewards = false, seed = 1} = {}) {
  if (!Array.isArray(rows)) throw new Error('training rows must be an array');
  if (!Number.isFinite(ridge) || ridge <= 0) throw new Error('ridge must be positive and finite');
  if (typeof shuffleRewards !== 'boolean') throw new Error('shuffleRewards must be boolean');
  const n = dimension(featureCount ?? rows[0]?.features?.length);
  // Snapshot only the declared learning inputs; never inspect ancillary fields.
  const samples = Array.from(rows, row => {
    if (!row || !CHECKING_ACTIONS.includes(row.action)) throw new Error('invalid training action');
    const features = vector(row.features, n).slice(1);
    if (!Number.isFinite(row.propensity) || row.propensity <= 0 || row.propensity > 1) throw new Error('invalid action propensity');
    return {features, action: row.action, propensity: row.propensity, reward: finite(row.reward, 'reward')};
  });
  if (shuffleRewards) {
    const rng = random(seed), rewards = samples.map(row => row.reward);
    for (let i = rewards.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [rewards[i], rewards[j]] = [rewards[j], rewards[i]];
    }
    samples.forEach((row, i) => { row.reward = rewards[i]; });
  }
  const model = emptyModel(n, ridge, shuffleRewards ? 'shuffled-reward' : 'trained');
  if (shuffleRewards) model.shuffleSeed = seed;
  model.trainingRows = samples.length;
  for (const action of CHECKING_ACTIONS) {
    const selected = samples.filter(row => row.action === action);
    model.actionCounts[action] = selected.length;
    const support = model.support[action];
    for (const row of selected) {
      support.minPropensity = Math.min(support.minPropensity ?? row.propensity, row.propensity);
      support.maxPropensity = Math.max(support.maxPropensity ?? row.propensity, row.propensity);
    }
    support.count = selected.length;
    support.trained = selected.length > 0;
    model.coefficients[action] = ridgeFit(selected, n, ridge);
  }
  return freeze(model);
}
function validateModel(model) {
  if (model?.version !== 1 || model.kind !== 'checking-action-value-ridge') throw new Error('invalid action-value model');
  dimension(model.featureCount);
  for (const action of CHECKING_ACTIONS) {
    const beta = model.coefficients?.[action];
    if (!Array.isArray(beta) || beta.length !== model.featureCount + 1) throw new Error('invalid coefficients');
    for (const x of beta) finite(x, 'coefficient');
  }
}
export function predictCheckingValues(model, features) {
  validateModel(model);
  const x = vector(features, model.featureCount);
  return Object.freeze(Object.fromEntries(CHECKING_ACTIONS.map(action => [action,
    finite(model.coefficients[action].reduce((sum, weight, i) => sum + weight * x[i], 0), 'prediction')])));
}
export function chooseCheckingAction(model, features) {
  const values = predictCheckingValues(model, features);
  // Strict comparison preserves declared tie order, with continue first.
  return CHECKING_ACTIONS.reduce((best, action) => values[action] > values[best] ? action : best, 'continue');
}
export function createCheckingValuePolicy(model) {
  validateModel(model);
  const frozen = freeze(structuredClone(model));
  return Object.freeze({
    predict: features => predictCheckingValues(frozen, features),
    choose: features => chooseCheckingAction(frozen, features),
    model: () => freeze(structuredClone(frozen))
  });
}
