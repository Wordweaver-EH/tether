import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHECKING_ACTIONS, fitCheckingValueModel, zeroCheckingValueModel,
  predictCheckingValues, chooseCheckingAction, createCheckingValuePolicy,
  createUniformActionChooser
} from '../src/mind/checking-value.mjs';
const row = (action, features, reward, propensity = 1 / 3) => ({action, features, reward, propensity});
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} vs ${expected}`);

test('fits each action independently with regularized intercept and exact support', () => {
  const model = fitCheckingValueModel([
    row('continue', [], 1), row('continue', [], 3, .5),
    row('check', [], 9), row('reconsider', [], -6)
  ], {ridge: 2});
  assert.equal(model.featureCount, 0);
  assert.equal(model.trainingRows, 4);
  assert.deepEqual(model.actionCounts, {continue: 2, check: 1, reconsider: 1});
  assert.deepEqual(model.support.continue, {count: 2, trained: true, minPropensity: 1/3, maxPropensity: .5});
  const values = predictCheckingValues(model, []);
  close(values.continue, 1); close(values.check, 3); close(values.reconsider, -2);
  assert.equal(chooseCheckingAction(model, []), 'check');
});

test('learns context-dependent action values from all logged numeric inputs', () => {
  const rows = [];
  for (const x of [-2, -1, 0, 1, 2]) {
    rows.push(row('continue', [x], 0), row('check', [x], x), row('reconsider', [x], -x));
  }
  const model = fitCheckingValueModel(rows, {ridge: 1});
  close(model.coefficients.check[0], 0);
  close(model.coefficients.check[1], 10 / 11);
  assert.equal(chooseCheckingAction(model, [2]), 'check');
  assert.equal(chooseCheckingAction(model, [-2]), 'reconsider');
  close(predictCheckingValues(model, [0]).check, 0);
  close(predictCheckingValues(model, [0]).reconsider, 0);
});

test('does not inspect hidden labels or drop outcomes marked as failures/censored', () => {
  const rows = [row('check', [1], 8), row('check', [1], -4)];
  for (const sample of rows) {
    Object.defineProperty(sample, 'hiddenTruth', {get() { throw Error('hidden label read'); }});
    sample.censored = true;
    sample.success = false;
  }
  const model = fitCheckingValueModel(rows);
  assert.equal(model.trainingRows, 2);
  assert.equal(model.actionCounts.check, 2);
  close(predictCheckingValues(model, [1]).check, 1.6);
});

test('zero and unsupported models retain zero values and expose missing support', () => {
  const zero = zeroCheckingValueModel(2);
  assert.deepEqual(predictCheckingValues(zero, [500, -100]), {continue: 0, check: 0, reconsider: 0});
  assert.equal(chooseCheckingAction(zero, [1, 2]), 'continue');
  const empty = fitCheckingValueModel([], {featureCount: 2});
  assert.deepEqual(empty.actionCounts, {continue: 0, check: 0, reconsider: 0});
  assert.equal(empty.support.check.trained, false);
  assert.equal(empty.support.check.minPropensity, null);
  assert.equal(chooseCheckingAction(empty, [0, 0]), 'continue');
});

test('shuffled control is reproducible, retains every row and does not mutate input', () => {
  const rows = Array.from({length: 30}, (_, i) => row(CHECKING_ACTIONS[i % 3], [i, i % 2], i * i));
  const before = structuredClone(rows);
  const one = fitCheckingValueModel(rows, {shuffleRewards: true, seed: 73});
  assert.deepEqual(one, fitCheckingValueModel(rows, {shuffleRewards: true, seed: 73}));
  assert.notDeepEqual(one.coefficients, fitCheckingValueModel(rows).coefficients);
  assert.notDeepEqual(one.coefficients, fitCheckingValueModel(rows, {shuffleRewards: true, seed: 74}).coefficients);
  assert.equal(one.trainingRows, rows.length);
  assert.deepEqual(one.actionCounts, {continue: 10, check: 10, reconsider: 10});
  assert.deepEqual(rows, before);
});

test('fit and policy use frozen independent snapshots, with deterministic inference', () => {
  const rows = [row('check', [1], 2)];
  const model = fitCheckingValueModel(rows);
  const before = predictCheckingValues(model, [1]);
  rows[0].features[0] = 999; rows[0].reward = -999;
  assert.deepEqual(predictCheckingValues(model, [1]), before);
  assert.throws(() => { model.coefficients.check[0] = 9; }, TypeError);
  assert.throws(() => { model.support.check.count = 9; }, TypeError);
  const mutable = structuredClone(model), policy = createCheckingValuePolicy(mutable);
  mutable.coefficients.check[0] = -999;
  assert.deepEqual(policy.predict([1]), before);
  assert.equal(policy.choose([1]), 'check');
  assert.deepEqual(policy.predict([1]), policy.predict([1]));
  assert.notEqual(policy.model(), policy.model());
  assert.ok(Object.isFrozen(policy.model().coefficients.check));
});

test('ridge QR handles repeated/collinear features without singular inversion', () => {
  const model = fitCheckingValueModel(Array.from({length: 40}, (_, i) => row('check', [i, i, 0], i)), {ridge: 1e-6});
  const values = predictCheckingValues(model, [3, 3, 0]);
  close(values.check, 3, 1e-6);
  close(model.coefficients.check[1], model.coefficients.check[2], 1e-6);
  assert.equal(model.coefficients.check[3], 0);
});

test('rejects malformed rows rather than filtering them out', () => {
  const valid = row('check', [1], 2);
  for (const invalid of [
    {...valid, features: [NaN]}, {...valid, features: [Infinity]},
    {...valid, features: Array(1)}, {...valid, features: ['1']},
    {...valid, features: [1, 2]}, {...valid, reward: NaN},
    {...valid, reward: Infinity}, {...valid, propensity: 0},
    {...valid, propensity: -1}, {...valid, propensity: 1.1},
    {...valid, propensity: NaN}, {...valid, propensity: undefined},
    {...valid, action: 'other'}, null
  ]) assert.throws(() => fitCheckingValueModel([valid, invalid]));
  for (const ridge of [0, -1, NaN, Infinity]) assert.throws(() => fitCheckingValueModel([valid], {ridge}));
  assert.throws(() => fitCheckingValueModel([]));
  assert.throws(() => fitCheckingValueModel([valid, ...Array(1)]));
  const sparse = [valid]; sparse.length = 2;
  assert.throws(() => fitCheckingValueModel(sparse));
  assert.throws(() => fitCheckingValueModel([valid], {featureCount: 2}));
  assert.throws(() => zeroCheckingValueModel(-1));
  assert.throws(() => fitCheckingValueModel([valid], {shuffleRewards: true, seed: NaN}));
});

test('rejects bad inference inputs and numeric overflow explicitly', () => {
  const model = zeroCheckingValueModel(1);
  for (const input of [[], [Infinity], ['1'], Array(1)]) assert.throws(() => predictCheckingValues(model, input));
  const invalid = structuredClone(model);
  invalid.coefficients.check = Array(2);
  assert.throws(() => createCheckingValuePolicy(invalid));
  invalid.coefficients.check = [0, Number.MAX_VALUE];
  assert.throws(() => predictCheckingValues(invalid, [2]), /prediction must be finite/);
  assert.throws(() => fitCheckingValueModel([
    row('check', [Number.MAX_VALUE], 1), row('check', [Number.MAX_VALUE], 1)
  ]), /finite/);
});

test('uniform randomized assignments are reproducible and context-independent', () => {
  const a = createUniformActionChooser(32), b = createUniformActionChooser(32);
  const counts = {continue: 0, check: 0, reconsider: 0};
  for (let i = 0; i < 3000; i++) {
    const choice = a({hidden: 'not an input'});
    assert.deepEqual(choice, b());
    assert.equal(choice.propensity, 1 / 3);
    counts[choice.action]++;
  }
  for (const count of Object.values(counts)) assert.ok(count > 850 && count < 1150);
  assert.throws(() => createUniformActionChooser(NaN));
});

test('exact positive ties use continue first, then check', () => {
  const model = structuredClone(zeroCheckingValueModel(0));
  for (const action of CHECKING_ACTIONS) model.coefficients[action][0] = 3;
  assert.equal(chooseCheckingAction(model, []), 'continue');
  model.coefficients.continue[0] = 2;
  assert.equal(chooseCheckingAction(model, []), 'check');
});
