import test from 'node:test';
import assert from 'node:assert/strict';
import { createNoveltySupport, noveltyFeatures, noveltyCell, noveltyFamily,
  NOVELTY_MIN_EXPOSURES, NOVELTY_MAX_CELLS, NOVELTY_MAX_COUNT } from '../src/mind/novelty.mjs';

const family = noveltyFamily('HELD:seen:far', 'lead');
const feature = (distance = 6, radialSpeed = 0, tangentialSpeed = 0) =>
  ({ distance, radialSpeed, tangentialSpeed });
const completed = Object.freeze({ ordinary: true, completed: true });
const view = () => ({ own: { position: { x: 1, y: 2 }, velocity: { x: 1, y: -1 } },
  opponent: { position: { x: 4, y: 6 }, velocity: { x: 4, y: 3 } } });
const row = (overrides = {}) => ({ family, cell: '3:0:0', count: 4, ...overrides });
const snapshot = (cells = [row()]) => ({ version: 1, cells });

test('visible percept features use relative radial and signed tangential motion', () => {
  const diagonal = noveltyFeatures(view());
  assert.equal(diagonal.distance, 5);
  assert.equal(diagonal.radialSpeed, 5);
  assert.ok(Math.abs(diagonal.tangentialSpeed) < 1e-12);
  const v = view();
  v.own = { position: { x: 0, y: 0 }, velocity: { x: 1, y: 1 } };
  v.opponent = { position: { x: 6, y: 0 }, velocity: { x: -1, y: 5 } };
  assert.deepEqual(noveltyFeatures(v), feature(6, -2, 4));
  v.opponent.velocity.y = -3;
  assert.deepEqual(noveltyFeatures(v), feature(6, -2, -4));
});

test('translation, shared velocity and quarter-turn preserve the joint motion cell', () => {
  const a = view();
  a.opponent.velocity = { x: 2, y: 4 };
  const b = structuredClone(a);
  for (const body of [b.own, b.opponent]) {
    body.position = { x: -body.position.y + 100, y: body.position.x - 25 };
    body.velocity = { x: -body.velocity.y + 8, y: body.velocity.x - 2 };
  }
  assert.equal(noveltyCell(noveltyFeatures(a)), noveltyCell(noveltyFeatures(b)));
});

test('distance floors by two while both signed speeds round by two', () => {
  assert.equal(noveltyCell(feature(5.999, 0.999, -1.001)), '2:0:-1');
  assert.equal(noveltyCell(feature(6, 1, -1)), '3:1:0');
  assert.equal(noveltyCell(feature(6, -3, 3)), '3:-1:2');
  assert.equal(noveltyCell(feature(Number.MIN_VALUE, -0, -0)), '0:0:0');
});

test('hidden, coincident, missing and non-finite percepts cannot provide support', () => {
  const cases = [null, undefined, false, 1, 'view', {}, { own: {} }];
  for (const mutate of [
    v => { v.opponent = null; },
    v => { v.opponent.position = { ...v.own.position }; },
    v => { delete v.opponent.velocity; },
    v => { v.opponent.position.x = NaN; },
    v => { v.own.velocity.y = Infinity; },
    v => { v.own.position.x = '1'; },
    v => { v.opponent.position.x = Number.MAX_VALUE; },
    v => { v.opponent.velocity.x = Number.MAX_VALUE; v.own.velocity.x = -Number.MAX_VALUE; },
  ]) { const v = view(); mutate(v); cases.push(v); }
  for (const value of cases) assert.equal(noveltyFeatures(value), null);
});

test('feature extraction ignores metadata and cannot consult hidden or model state', () => {
  const plain = view(), labelled = view();
  for (const key of ['world', 'belief', 'scores', 'seed', 'scenario', 'fixtureId']) {
    Object.defineProperty(labelled, key, { get() { throw new Error(`read ${key}`); } });
  }
  assert.deepEqual(noveltyFeatures(labelled), noveltyFeatures(plain));
  labelled.opponent = null;
  assert.equal(noveltyFeatures(labelled), null);
});

test('invalid feature data fails closed without numeric coercion', () => {
  const invalid = [null, undefined, false, [], '3:0:0', {}, feature(0), feature(-1),
    feature(NaN), feature(Infinity), feature(6, NaN), feature(6, 0, Infinity),
    feature('6'), feature(6, '0'), feature(6, 0, '0'), feature(Number.MAX_VALUE),
    feature(6, Number.MAX_VALUE), feature(6, 0, Number.MAX_VALUE),
    { ...feature(), extra: 1 }, Object.create(feature())];
  const accessor = feature();
  Object.defineProperty(accessor, 'distance', { get() { throw new Error('accessor ran'); } });
  invalid.push(accessor);
  const support = createNoveltySupport(snapshot());
  for (const value of invalid) {
    assert.equal(noveltyCell(value), null);
    assert.equal(support.check(family, value).familiar, false);
    assert.equal(support.register(family, value, completed).registered, false);
  }
  assert.equal(support.check(family, feature()).count, 4);
});

test('families have exact situation and tactic grammar', () => {
  for (const state of ['HELD', 'OUTBOUND', 'EMBEDDED', 'RETURNING'])
    for (const visibility of ['seen', 'hidden']) for (const range of ['near', 'far'])
      for (const tactic of ['lead', 'direct', 'left', 'right'])
        assert.equal(noveltyFamily(`${state}:${visibility}:${range}`, tactic), `${state}:${visibility}:${range}:${tactic}`);
  for (const bad of ['', 'HELD:seen', 'HELD:seen:far\n', 'HELD:seen:far\r', 'held:seen:far',
    'HELD:other:far', '__proto__', {}, null, 1]) assert.equal(noveltyFamily(bad, 'lead'), null);
  for (const bad of ['LEAD', 'lead\n', '', null, {}, 1]) assert.equal(noveltyFamily('HELD:seen:far', bad), null);
});

test('four completed ordinary exposures establish familiarity, regardless of reward', () => {
  const support = createNoveltySupport();
  assert.equal(NOVELTY_MIN_EXPOSURES, 4);
  assert.equal(support.check(family, feature()).reason, 'unseen-cell');
  for (let count = 1; count <= 4; count++) {
    const packet = support.register(family, feature(), { ...completed, reward: count % 2 ? -1 : 0 });
    assert.equal(packet.registered, true);
    assert.equal(packet.count, count);
    assert.equal(packet.familiar, count === 4);
    assert.equal(packet.reason, count === 4 ? 'familiar' : 'insufficient-exposure');
  }
  assert.equal(support.check(family, feature()).novel, false);
});

test('inspection, incomplete actions and counterfactuals never accumulate exposure', () => {
  const support = createNoveltySupport();
  for (let i = 0; i < 10; i++) {
    support.check(family, feature());
    for (const exposure of [undefined, null, {}, true, 'ordinary',
      { ordinary: true }, { completed: true }, { ordinary: false, completed: true },
      { ordinary: true, completed: false }, { ordinary: 1, completed: true },
      { ordinary: true, completed: 'true' }])
      assert.equal(support.register(family, feature(), exposure).registered, false);
  }
  assert.deepEqual(support.snapshot(), snapshot([]));
});

test('familiar marginal values do not certify an unobserved joint cell', () => {
  const support = createNoveltySupport();
  for (const f of [feature(6, 0, 4), feature(6, 4, 0), feature(10, 0, 0)])
    for (let i = 0; i < 4; i++) support.register(family, f, completed);
  assert.equal(support.check(family, feature(6, 0, 0)).count, 0);
  assert.equal(support.check(family, feature(6, 0, 0)).familiar, false);
});

test('support remains separate across cells, situations and tactics', () => {
  const support = createNoveltySupport(snapshot());
  for (const other of ['HELD:seen:far:direct', 'EMBEDDED:seen:far:lead', 'HELD:seen:near:lead'])
    assert.equal(support.check(other, feature()).count, 0);
  for (const f of [feature(8), feature(6, 2), feature(6, 0, 2)])
    assert.equal(support.check(family, f).count, 0);
  assert.equal(support.check(family, feature(7.99, 0.99, -0.99)).familiar, true);
});

test('diagnostic packets and nested features are immutable detached values', () => {
  const support = createNoveltySupport(), f = feature();
  const extracted = noveltyFeatures(view());
  assert.equal(Object.isFrozen(extracted), true);
  const before = support.check(family, f);
  assert.equal(Object.isFrozen(before), true);
  assert.equal(Object.isFrozen(before.features), true);
  assert.throws(() => { before.count = 99; }, TypeError);
  assert.throws(() => { before.features.distance = 99; }, TypeError);
  f.distance = 99;
  assert.equal(before.features.distance, 6);
  const after = support.register(family, feature(), completed);
  assert.equal(Object.isFrozen(after), true);
  assert.equal(before.count, 0);
  assert.equal(after.count, 1);
});

test('invalid family or feature diagnostics remain unsupported', () => {
  const support = createNoveltySupport(snapshot());
  for (const bad of [undefined, null, {}, 0, '', '__proto__', `${family}\n`, `${family}\r`]) {
    const packet = support.check(bad, feature());
    assert.equal(packet.valid, false);
    assert.equal(packet.family, null);
    assert.equal(packet.reason, 'invalid-family');
    assert.equal(packet.familiar, false);
    assert.equal(packet.novel, true);
    assert.equal(support.register(bad, feature(), completed).registered, false);
  }
  const packet = support.check(family, null);
  assert.equal(packet.reason, 'invalid-features');
  assert.equal(packet.cell, null);
  assert.equal(packet.features, null);
});

test('snapshot round trips preserve support and snapshots are detached', () => {
  const original = snapshot();
  const support = createNoveltySupport(original);
  original.cells[0].count = 900;
  const saved = support.snapshot();
  assert.equal(saved.cells[0].count, 4);
  const restored = createNoveltySupport(saved);
  assert.deepEqual(restored.check(family, feature()), support.check(family, feature()));
  saved.cells[0].count = 800;
  saved.cells.push(row({ cell: '4:0:0' }));
  assert.equal(support.snapshot().cells.length, 1);
  assert.equal(restored.snapshot().cells.length, 1);
  assert.equal(restored.check(family, feature()).count, 4);
});

test('any malformed snapshot root or entry discards all support', () => {
  const malformed = [true, 1, 'snapshot', [], {}, { version: 1 },
    { cells: [row()] }, { version: '1', cells: [row()] }, { version: 2, cells: [row()] },
    { version: 1, cells: {} }, { version: 1, cells: null },
    { ...snapshot(), extra: true }, Object.create(snapshot()),
    snapshot([row(), null]), snapshot([row(), 1]), snapshot([row(), []]),
    snapshot([row(), {}]), snapshot([row(), { ...row(), extra: 1 }]),
    snapshot([row(), { family, count: 2 }]), snapshot([row(), Object.create(row())])];
  for (const invalid of malformed) assert.deepEqual(createNoveltySupport(invalid).snapshot(), snapshot([]));
});

test('one malformed count invalidates the entire snapshot without clamping or coercion', () => {
  for (const count of [-1, 0, 1.5, NaN, Infinity, -Infinity, NOVELTY_MAX_COUNT + 1,
    '4', null, undefined, true, {}, 4n]) {
    const support = createNoveltySupport(snapshot([row(), row({ cell: '4:0:0', count })]));
    assert.deepEqual(support.snapshot(), snapshot([]));
  }
});

test('noncanonical cells and families invalidate the entire snapshot', () => {
  for (const cell of [null, undefined, 300, [], '3:0', '3:0:0:0', '03:0:0', '3:-0:0',
    '3:0.0:0', '3:0:0\n', '-1:0:0', '3:NaN:0', '3:Infinity:0', '3:1e3:0',
    '3:+1:0', '3: 1:0', '3::0', '9007199254740992:0:0', `3:${'9'.repeat(100)}:0`])
    assert.deepEqual(createNoveltySupport(snapshot([row(), row({ cell })])).snapshot(), snapshot([]));
  for (const invalid of [null, undefined, {}, '', '__proto__', 'HELD:seen:far:unknown', `${family}\n`])
    assert.deepEqual(createNoveltySupport(snapshot([row(), row({ family: invalid, cell: '4:0:0' })])).snapshot(), snapshot([]));
});

test('duplicate joint cells, sparse arrays and accessor data discard all support', () => {
  const sparse = [row(), , row({ cell: '4:0:0' })];
  const augmented = [row()]; augmented.extra = true;
  const accessorArray = [row(), row({ cell: '4:0:0' })];
  Object.defineProperty(accessorArray, 1, { get() { throw new Error('array accessor ran'); } });
  const accessorRow = row({ cell: '4:0:0' });
  Object.defineProperty(accessorRow, 'count', { get() { throw new Error('row accessor ran'); } });
  const accessorRoot = snapshot();
  Object.defineProperty(accessorRoot, 'cells', { get() { throw new Error('root accessor ran'); } });
  for (const invalid of [snapshot([row(), row()]), snapshot(sparse), snapshot(augmented),
    snapshot(accessorArray), snapshot([row(), accessorRow]), accessorRoot])
    assert.deepEqual(createNoveltySupport(invalid).snapshot(), snapshot([]));
  assert.equal(createNoveltySupport(snapshot([row(), row({ family: 'HELD:seen:far:direct' })])).snapshot().cells.length, 2);
});

test('counts saturate at one million without changing support or insertion order', () => {
  const support = createNoveltySupport(snapshot([row({ count: NOVELTY_MAX_COUNT }), row({ cell: '4:0:0', count: 1 })]));
  for (let i = 0; i < 5; i++) assert.equal(support.register(family, feature(), completed).count, NOVELTY_MAX_COUNT);
  assert.equal(support.snapshot().cells[0].cell, '3:0:0');
  assert.equal(support.check(family, feature()).familiar, true);
});

test('global support is bounded with deterministic oldest-insertion eviction', () => {
  const support = createNoveltySupport();
  for (let i = 0; i < NOVELTY_MAX_CELLS; i++) support.register(family, feature(i * 2 + 1), completed);
  assert.equal(support.snapshot().cells.length, NOVELTY_MAX_CELLS);
  // Reading and registering an existing cell do not refresh its age.
  support.check(family, feature(1));
  support.register(family, feature(1), completed);
  const saved = support.snapshot(), restored = createNoveltySupport(saved);
  for (const instance of [support, restored]) {
    instance.register('HELD:seen:far:direct', feature(1), completed);
    assert.equal(instance.snapshot().cells.length, NOVELTY_MAX_CELLS);
    assert.equal(instance.check(family, feature(1)).count, 0);
    assert.equal(instance.check(family, feature(3)).count, 1);
    assert.equal(instance.snapshot().cells[0].cell, '1:0:0');
    assert.equal(instance.snapshot().cells.at(-1).family, 'HELD:seen:far:direct');
  }
  assert.deepEqual(support.snapshot(), restored.snapshot());
});

test('oversized snapshots fail closed rather than silently retaining a prefix', () => {
  const cells = Array.from({ length: NOVELTY_MAX_CELLS + 1 }, (_, i) => row({ cell: `${i}:0:0` }));
  assert.deepEqual(createNoveltySupport(snapshot(cells)).snapshot(), snapshot([]));
});
