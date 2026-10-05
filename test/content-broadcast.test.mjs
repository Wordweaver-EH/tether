import test from 'node:test';
import assert from 'node:assert/strict';
import { rng } from '../src/mind/math.mjs';
import { createContentPacket, validateContentPacket, overrideContentPacket,
  deliverContentPacket, CONTENT_PACKET_VERSION, CONTENT_ENTITIES,
  CONTENT_RECIPIENTS } from '../src/mind/content-broadcast.mjs';

// Explicit seeded wiring fixtures. These are neither acquired memories nor
// transfer/performance witnesses; no simulator or privileged world is used.
const FIXTURE_SEED = 41001;
function input(overrides = {}, seed = FIXTURE_SEED) {
  const random = rng(seed);
  return { revision: 1, focus: 'Hunt', entity: 'opponent',
    mean: { x: random() * 4, y: random() * 4 }, velocity: { x: 1, y: -2 },
    hypothesisTime: 2, originalEvidenceTime: 2, issuedAt: 2,
    evidenceId: 1, source: 'observed',
    uncertainty: { status: 'known', radius: 0.2 }, validUntil: 12, ...overrides };
}
const packet = overrides => createContentPacket(input(overrides), 2);
const predicted = overrides => input({ revision: 3, source: 'predicted', hypothesisTime: 4,
  issuedAt: 4, lineage: { rootEvidenceId: 1, parentRevision: 1 }, ...overrides });

test('selected packet is a detached immutable hypothesis with explicit original evidence and anchor times', () => {
  const source = input(), selected = createContentPacket(source, 2);
  assert.equal(CONTENT_PACKET_VERSION, 1);
  assert.equal(selected.version, 1);
  assert.equal(selected.ageSec, 0);
  assert.deepEqual(selected.lineage, { rootEvidenceId: source.evidenceId, parentRevision: null });
  assert.equal(validateContentPacket(selected, 2), true);
  for (const part of [selected, selected.mean, selected.velocity, selected.uncertainty, selected.lineage])
    assert.equal(Object.isFrozen(part), true);
  source.mean.x = 99; source.velocity.y = 77; source.uncertainty.radius = 0;
  assert.notEqual(selected.mean.x, 99);
  assert.equal(selected.velocity.y, -2);
  assert.equal(selected.uncertainty.radius, 0.2);
  assert.throws(() => { selected.mean.x = 99; }, TypeError);
  assert.throws(() => { selected.lineage.parentRevision = 9; }, TypeError);
});

test('predicted and episodic content keep old sensory time distinct from current hypothesis anchor', () => {
  for (const source of ['predicted', 'episodic']) {
    const selected = createContentPacket(predicted({ source }), 4);
    assert.equal(selected.originalEvidenceTime, 2);
    assert.equal(selected.hypothesisTime, 4);
    assert.equal(selected.issuedAt, 4);
    assert.equal(selected.ageSec, 2);
    assert.equal(selected.source, source);
    assert.equal(validateContentPacket(selected, 11), true);
    assert.equal(validateContentPacket(selected, 12), true);
    assert.equal(validateContentPacket(selected, 12.00001), false);
  }
});

test('uncertainty status is distinct from radius and does not invent a numeric certainty', () => {
  assert.deepEqual(packet({ uncertainty: { status: 'unknown', radius: null } }).uncertainty,
    { status: 'unknown', radius: null });
  assert.equal(packet({ uncertainty: { status: 'known', radius: 0 } }).uncertainty.radius, 0);
  for (const uncertainty of [null, {}, 1, { status: 'unknown', radius: 0 },
    { status: 'known', radius: null }, { status: 'known', radius: -1 },
    { status: 'known', radius: NaN }, { status: 'known', radius: Infinity },
    { status: 'known', radius: '0.2' }, { status: 'reliable', radius: 1 },
    { status: 'known', radius: 1, confidence: 0.99 }]) assert.equal(packet({ uncertainty }), null);
});

test('all supported symbolic entities are data and actuator wants are rejected', () => {
  assert.deepEqual(CONTENT_ENTITIES, ['opponent', 'ownSpear', 'enemySpear']);
  for (const entity of CONTENT_ENTITIES) assert.equal(packet({ entity }).entity, entity);
  for (const entity of ['', 'world', 'opponents', 1, null]) assert.equal(packet({ entity }), null);
  for (const extras of [{ wants: { throw: true } }, { throw: true }, { recall: true },
    { aimX: 1 }, { confidence: 1 }, { anchorTime: 2 }]) assert.equal(packet(extras), null);
});

test('evidence identities are nonnegative safe counters with exactly matching root provenance', () => {
  for (const evidenceId of [0, 1, Number.MAX_SAFE_INTEGER]) {
    const selected = packet({ evidenceId });
    assert.equal(selected.evidenceId, evidenceId);
    assert.equal(selected.lineage.rootEvidenceId, evidenceId);
  }
  for (const evidenceId of ['1', '', 'observation:1', null, NaN, Infinity, -1, 1.1,
    Number.MAX_SAFE_INTEGER + 1]) assert.equal(packet({ evidenceId }), null);
  assert.equal(packet({ lineage: { rootEvidenceId: '1', parentRevision: null } }), null);
});

test('constructor derives only version, age and observed lineage; validator requires a complete packet', () => {
  const source = input(), selected = packet();
  assert.equal(validateContentPacket(source, 2), false);
  for (const name of ['version', 'ageSec', 'lineage']) {
    const incomplete = structuredClone(selected); delete incomplete[name];
    assert.equal(validateContentPacket(incomplete, 2), false);
    assert.notEqual(createContentPacket(incomplete, 2), null);
  }
  assert.equal(packet({ version: 2 }), null);
  assert.equal(packet({ ageSec: 1 }), null);
  assert.equal(packet({ lineage: undefined }), null);
  assert.equal(createContentPacket(predicted({ lineage: undefined }), 4), null);
});

test('nonfinite, coerced and malformed coordinates and clock values fail closed', () => {
  for (const name of ['hypothesisTime', 'originalEvidenceTime', 'issuedAt', 'validUntil'])
    for (const value of [NaN, Infinity, -Infinity, '2', null, undefined, -1])
      assert.equal(packet({ [name]: value }), null, `${name}: ${String(value)}`);
  for (const name of ['mean', 'velocity']) {
    for (const value of [null, {}, [], { x: 1 }, { x: '1', y: 0 },
      { x: 1, y: Infinity }, { x: NaN, y: 0 }, { x: 1, y: 2, z: 3 }])
      assert.equal(packet({ [name]: value }), null);
  }
  for (const revision of [NaN, Infinity, '1', null, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])
    assert.equal(packet({ revision }), null);
  for (const now of [NaN, Infinity, '2', null, -1]) assert.equal(createContentPacket(input(), now), null);
});

test('future evidence, future anchors, future issuance and expired delivery are rejected', () => {
  assert.equal(packet({ originalEvidenceTime: 3 }), null);
  assert.equal(packet({ hypothesisTime: 3 }), null);
  assert.equal(packet({ issuedAt: 3 }), null);
  assert.equal(packet({ validUntil: 1 }), null);
  assert.equal(createContentPacket(input(), 1), null);
  assert.equal(createContentPacket(input(), 12.1), null);
  assert.equal(validateContentPacket(packet(), 1), false);
  assert.equal(validateContentPacket(packet(), 13), false);
  assert.equal(validateContentPacket(packet(), 12), true);
});

test('observed content cannot carry a projected anchor or derived lineage', () => {
  assert.equal(createContentPacket(input({ hypothesisTime: 3, issuedAt: 3 }), 3), null);
  assert.equal(packet({ lineage: { rootEvidenceId: 2, parentRevision: null } }), null);
  assert.equal(packet({ lineage: { rootEvidenceId: 1, parentRevision: 0 } }), null);
  for (const parentRevision of [null, -1, 3, 4, '1', NaN])
    assert.equal(createContentPacket(predicted({ lineage:
      { rootEvidenceId: 1, parentRevision } }), 4), null);
  assert.equal(createContentPacket(predicted({ source: 'inferred' }), 4), null);
});

test('data-only schema rejects accessors, inherited fields, extra keys and unbounded labels', () => {
  const badRoot = input(); Object.defineProperty(badRoot, 'issuedAt', { get() { throw Error('must not run'); } });
  const badPoint = { x: 1, y: 2 }; Object.defineProperty(badPoint, 'x', { get() { throw Error('must not run'); } });
  const symbol = input(); symbol[Symbol('hidden')] = true;
  const throwingProxy = new Proxy({}, { getPrototypeOf() { throw Error('invalid proxy'); } });
  for (const source of [null, undefined, 0, [], {}, Object.create(input()), badRoot, symbol,
    throwingProxy, input({ mean: badPoint }), input({ mean: Object.create({ x: 1, y: 2 }) }),
    input({ focus: '' }), input({ focus: ' Hunt' }), input({ focus: 'Hunt\n' }),
    input({ focus: 'x'.repeat(81) }), input({ evidenceId: 'x'.repeat(161) })])
    assert.equal(createContentPacket(source, 2), null);
});

test('valid intervention changes payload with identical focus and immutable provenance', () => {
  const before = packet();
  const changed = overrideContentPacket(before, { ...before, entity: 'ownSpear',
    mean: { x: 7, y: -3 }, velocity: { x: 0, y: 1 }, revision: 2 }, 2);
  assert.equal(changed.focus, before.focus);
  assert.equal(changed.entity, 'ownSpear');
  assert.deepEqual(changed.mean, { x: 7, y: -3 });
  assert.equal(changed.evidenceId, before.evidenceId);
  assert.equal(Object.isFrozen(changed), true);
  assert.deepEqual(before, packet());
});

test('interventions cannot launder old evidence, renew validity or relabel recalled content as observed', () => {
  const before = createContentPacket(predicted({ source: 'episodic' }), 4);
  for (const changes of [{ focus: 'Search' }, { evidenceId: 2,
    lineage: { rootEvidenceId: 2, parentRevision: 1 } },
    { originalEvidenceTime: 3, ageSec: 1 }, { hypothesisTime: 3 }, { issuedAt: 5, ageSec: 3 },
    { validUntil: 13 }, { revision: 2 }, { mean: { x: Infinity, y: 0 } },
    { source: 'observed', hypothesisTime: 2,
      lineage: { rootEvidenceId: before.evidenceId, parentRevision: null } }])
    assert.equal(overrideContentPacket(before, { ...before, ...changes }, 5), null);
});

test('all recipients get exactly the same immutable selected content through independent delivery switches', () => {
  const selected = packet(), intact = deliverContentPacket(selected, 2);
  assert.deepEqual(CONTENT_RECIPIENTS, ['attention', 'memory', 'planner', 'report']);
  for (const recipient of CONTENT_RECIPIENTS) assert.equal(intact[recipient], selected);
  assert.equal(Object.isFrozen(intact), true);
  for (const cut of CONTENT_RECIPIENTS) {
    const lesioned = deliverContentPacket(selected, 2, { [cut]: false });
    for (const recipient of CONTENT_RECIPIENTS)
      assert.equal(lesioned[recipient], recipient === cut ? null : selected);
    assert.deepEqual(deliverContentPacket(selected, 2, { [cut]: true }), intact);
  }
});

test('external packets are detached and frozen before delivery; invalid content or delivery options fail closed', () => {
  const external = structuredClone(packet()), delivery = deliverContentPacket(external, 2);
  assert.notEqual(delivery.attention, external);
  assert.equal(delivery.attention, delivery.memory);
  assert.equal(Object.isFrozen(delivery.attention.mean), true);
  external.mean.x = 999;
  assert.notEqual(delivery.planner.mean.x, 999);
  for (const result of [deliverContentPacket(input(), 2), deliverContentPacket(packet(), 13),
    deliverContentPacket(packet(), 2, { attention: 0 }), deliverContentPacket(packet(), 2, { typo: false }),
    deliverContentPacket(packet(), 2, null)])
    assert.deepEqual(result, { attention: null, memory: null, planner: null, report: null });
});
