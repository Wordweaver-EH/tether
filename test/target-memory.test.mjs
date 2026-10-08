import test from 'node:test';
import assert from 'node:assert/strict';
import { rng } from '../src/mind/math.mjs';
import { createContentPacket, validateContentPacket } from '../src/mind/content-broadcast.mjs';
import { createTargetMemory, TARGET_MEMORY_VERSION, TARGET_MEMORY_MAX_ENTRIES,
  TARGET_MEMORY_BODY_SPEED_BOUND } from '../src/mind/target-memory.mjs';

// Synthetic seeded wiring only: the snapshots below are explicitly fixtures,
// not learned/calibration data or results of acquisition/transfer runs.
const FIXTURE_SEED = 42001;
function observation(overrides = {}, seed = FIXTURE_SEED) {
  const random = rng(seed), time = overrides.originalEvidenceTime ?? 2;
  return createContentPacket({ revision: 1, focus: 'Hunt', entity: 'opponent',
    mean: { x: random() * 4, y: random() * 4 }, velocity: { x: 3, y: 4 },
    hypothesisTime: time, originalEvidenceTime: time, issuedAt: time,
    evidenceId: 1, source: 'observed',
    uncertainty: { status: 'known', radius: 0.25 }, validUntil: 100, ...overrides });
}
const snapshot = (entries = []) => ({ version: TARGET_MEMORY_VERSION, entries });

test('observation storage and later projection retain frozen original provenance and do not manufacture evidence', () => {
  const memory = createTargetMemory(), original = observation();
  assert.equal(memory.remember(original).stored, true);
  const recalled = memory.recall('opponent', 3);
  assert.equal(recalled.source, 'episodic');
  assert.equal(recalled.evidenceId, original.evidenceId);
  assert.equal(recalled.originalEvidenceTime, 2);
  assert.equal(recalled.hypothesisTime, 3);
  assert.equal(recalled.issuedAt, 3);
  assert.equal(recalled.ageSec, 1);
  assert.equal(recalled.validUntil, original.validUntil);
  assert.deepEqual(recalled.mean, { x: original.mean.x + 3, y: original.mean.y + 4 });
  assert.deepEqual(recalled.velocity, original.velocity);
  assert.deepEqual(recalled.lineage, { rootEvidenceId: original.evidenceId, parentRevision: original.revision });
  assert.equal(recalled.revision, original.revision + 1);
  assert.equal(validateContentPacket(recalled, 3), true);
  for (const part of [recalled, recalled.mean, recalled.velocity, recalled.lineage, recalled.uncertainty])
    assert.equal(Object.isFrozen(part), true);
  assert.deepEqual(memory.snapshot(), snapshot([original]));
});

test('recall expands the body radius conservatively from the original anchor without uncertainty improvement', () => {
  const original = observation(), memory = createTargetMemory(snapshot([original]));
  assert.equal(TARGET_MEMORY_BODY_SPEED_BOUND, 4);
  const at2 = memory.recall('opponent', 2), at3 = memory.recall('opponent', 3);
  assert.equal(at2.uncertainty.radius, original.uncertainty.radius);
  assert.equal(at3.uncertainty.radius, 0.25 + (4 + 5));
  const at5 = memory.recall('opponent', 5);
  assert.equal(at5.uncertainty.radius, 0.25 + (4 + 5) * 3);
  assert.deepEqual(at5.mean, { x: original.mean.x + 9, y: original.mean.y + 12 });
  assert.deepEqual(memory.snapshot(), snapshot([original]));
  const unknown = createTargetMemory(snapshot([observation({ uncertainty: { status: 'unknown', radius: null } })]));
  assert.deepEqual(unknown.recall('opponent', 5).uncertainty, { status: 'unknown', radius: null });
});

test('predictions, recollections and repeated evidence never become fresh memory observations', () => {
  const original = observation(), memory = createTargetMemory();
  memory.remember(original);
  const recalled = memory.recall('opponent', 3);
  assert.equal(memory.remember(recalled).reason, 'not-observation');
  const predicted = createContentPacket({ ...recalled, source: 'predicted' }, 3);
  assert.equal(memory.remember(predicted).reason, 'not-observation');
  const altered = createContentPacket({ ...original, mean: { x: 99, y: 99 }, revision: 2 }, 2);
  assert.equal(memory.remember(altered).reason, 'duplicate-evidence');
  assert.equal(memory.remember(original).eligible, false);
  assert.deepEqual(memory.snapshot(), snapshot([original]));
});

test('read and write lesions retain the computed proposal and restore independently', () => {
  const original = observation(), memory = createTargetMemory();
  const cutWrite = memory.remember(original, { enabled: false });
  assert.equal(cutWrite.eligible, true);
  assert.equal(cutWrite.stored, false);
  assert.equal(cutWrite.reason, 'write-disabled');
  assert.equal(memory.recall('opponent', 3), null);
  assert.equal(memory.remember(original, { enabled: true }).stored, true);
  const intact = memory.recall('opponent', 3);
  assert.equal(memory.recall('opponent', 3, { enabled: false }), null);
  assert.deepEqual(memory.diagnostics().lastRead.computed, intact);
  assert.equal(memory.diagnostics().lastRead.delivered, null);
  assert.equal(memory.diagnostics().lastRead.reason, 'read-disabled');
  assert.deepEqual(memory.recall('opponent', 3, { enabled: true }), intact);
  const newer = observation({ revision: 4, originalEvidenceTime: 4, evidenceId: 2 });
  memory.remember(newer, { enabled: false });
  assert.equal(memory.recall('opponent', 4).evidenceId, original.evidenceId);
  memory.remember(newer, { enabled: true });
  assert.equal(memory.recall('opponent', 4).evidenceId, newer.evidenceId);
});

test('readOnly freezes all persisted target fields while preserving computation and lookups', () => {
  const original = observation(), state = snapshot([original]);
  const memory = createTargetMemory(state, { readOnly: true });
  const before = memory.snapshot();
  const newer = observation({ revision: 4, originalEvidenceTime: 4, evidenceId: 2 });
  const proposal = memory.remember(newer);
  assert.equal(proposal.eligible, true);
  assert.equal(proposal.stored, false);
  assert.equal(proposal.reason, 'read-only');
  assert.equal(memory.recall('opponent', 4).evidenceId, original.evidenceId);
  memory.recall('opponent', 5, { enabled: false });
  assert.deepEqual(memory.snapshot(), before);
  assert.equal(memory.diagnostics().readOnly, true);
});

test('entity reads select newest original evidence rather than last insertion or rebroadcast', () => {
  const latest = observation({ revision: 9, originalEvidenceTime: 9, evidenceId: 9 });
  const older = observation({ revision: 1, originalEvidenceTime: 1, evidenceId: 1 });
  const own = observation({ entity: 'ownSpear', revision: 8, evidenceId: 8 });
  const enemy = observation({ entity: 'enemySpear', revision: 7, evidenceId: 7 });
  const memory = createTargetMemory(snapshot([latest, older, own, enemy]));
  assert.equal(memory.recall('opponent', 10).evidenceId, latest.evidenceId);
  assert.equal(memory.recall('ownSpear', 10).evidenceId, own.evidenceId);
  assert.equal(memory.recall('enemySpear', 10).evidenceId, enemy.evidenceId);
  assert.equal(memory.recall('unseenEntity', 10), null);
  const tie = observation({ revision: 10, originalEvidenceTime: 9, evidenceId: 10 });
  memory.remember(tie);
  assert.equal(memory.recall('opponent', 10).evidenceId, tie.evidenceId);
});

test('bounded capacity evicts oldest insertion; reads and duplicate writes cannot refresh its age', () => {
  assert.equal(TARGET_MEMORY_MAX_ENTRIES, 32);
  const originals = Array.from({ length: 32 }, (_, index) => observation({ revision: index,
    originalEvidenceTime: index, evidenceId: index }, FIXTURE_SEED + index));
  const memory = createTargetMemory(snapshot(originals));
  memory.recall('opponent', 32);
  memory.remember(originals[0]);
  const extra = observation({ revision: 32, originalEvidenceTime: 32, evidenceId: 32 });
  memory.remember(extra);
  assert.equal(memory.snapshot().entries.length, 32);
  assert.equal(memory.snapshot().entries[0].evidenceId, 1);
  assert.equal(memory.snapshot().entries.at(-1).evidenceId, extra.evidenceId);
  assert.equal(memory.diagnostics().size, 32);
});

test('high-water evidence identity rejects old rebroadcasts after eviction and survives snapshot restoration', () => {
  const memory = createTargetMemory(), first = observation({ evidenceId: 0, revision: 0 });
  memory.remember(first);
  for (let evidenceId = 1; evidenceId <= 32; evidenceId++)
    assert.equal(memory.remember(observation({ evidenceId, revision: evidenceId })).stored, true);
  assert.equal(memory.snapshot().entries.some(p => p.evidenceId === 0), false);
  const restored = createTargetMemory(memory.snapshot());
  for (const instance of [memory, restored]) {
    const before = instance.snapshot();
    const replay = instance.remember(first);
    assert.equal(replay.eligible, false);
    assert.equal(replay.stored, false);
    assert.equal(replay.reason, 'non-increasing-evidence');
    assert.equal(instance.diagnostics().highestEvidenceId, 32);
    assert.deepEqual(instance.snapshot(), before);
    assert.equal(instance.remember(observation({ evidenceId: 34 }), { enabled: false }).eligible, true);
    assert.equal(instance.diagnostics().highestEvidenceId, 32);
    assert.equal(instance.remember(observation({ evidenceId: 33 })).stored, true);
    assert.equal(instance.remember(observation({ evidenceId: 34 })).stored, true);
  }
  assert.deepEqual(memory.snapshot(), restored.snapshot());
});

test('snapshot restoration and export are detached at every nested field', () => {
  const state = structuredClone(snapshot([observation()]));
  const memory = createTargetMemory(state), before = memory.snapshot();
  state.entries[0].mean.x = 999; state.entries[0].lineage.rootEvidenceId = 'changed';
  state.entries[0].uncertainty.radius = 0; state.entries.length = 0;
  assert.deepEqual(memory.snapshot(), before);
  const exported = memory.snapshot();
  exported.entries[0].mean.x = 111; exported.entries[0].velocity.x = 111;
  exported.entries[0].uncertainty.radius = 111; exported.entries[0].lineage.parentRevision = 111;
  exported.entries.push(observation({ evidenceId: 100 }));
  assert.deepEqual(memory.snapshot(), before);
  const restored = createTargetMemory(before);
  assert.deepEqual(restored.recall('opponent', 3), memory.recall('opponent', 3));
  assert.equal(Object.isFrozen(memory.diagnostics()), true);
  assert.equal(Object.isFrozen(memory.diagnostics().lastRead), true);
});

test('malformed snapshots are discarded in full, never partially rescued or coerced', () => {
  const original = observation(), broken = { ...original, velocity: { x: Infinity, y: 0 } };
  const recalled = createTargetMemory(snapshot([original])).recall('opponent', 3);
  const missing = { ...original }; delete missing.ageSec;
  for (const state of [false, 1, [], {}, { version: 2, entries: [] },
    { version: 1, entries: 'x' }, { version: 1, entries: [], surprise: 1 },
    snapshot([original, broken]), snapshot([original, missing]), snapshot([original, recalled]),
    snapshot([original, { ...original }]), snapshot([null]),
    snapshot(Array.from({ length: 33 }, (_, i) => observation({ evidenceId: i })))])
    assert.deepEqual(createTargetMemory(state).snapshot(), snapshot());
});

test('snapshot accessors, sparse arrays, inherited fields and extra array properties fail closed', () => {
  const original = observation();
  const sparse = [original, , original], augmented = [original]; augmented.extra = 1;
  const getterArray = [original]; Object.defineProperty(getterArray, 0, { get() { throw Error('must not run'); } });
  const getterPacket = { ...original }; Object.defineProperty(getterPacket, 'issuedAt', { get() { throw Error('must not run'); } });
  const getterRoot = snapshot([original]); Object.defineProperty(getterRoot, 'entries', { get() { throw Error('must not run'); } });
  const inherited = Object.create(snapshot([original]));
  for (const state of [snapshot(sparse), snapshot(augmented), snapshot(getterArray),
    snapshot([original, getterPacket]), getterRoot, inherited,
    snapshot([Object.create(original)])]) assert.deepEqual(createTargetMemory(state).snapshot(), snapshot());
});

test('stale and future-clock reads fail closed without erasing archived observations or renewing TTL', () => {
  const original = observation({ validUntil: 3 }), memory = createTargetMemory(snapshot([original]));
  assert.notEqual(memory.recall('opponent', 3), null);
  for (const now of [1, 3.01, NaN, Infinity, '3', null, -1]) assert.equal(memory.recall('opponent', now), null);
  assert.deepEqual(memory.snapshot(), snapshot([original]));
  assert.equal(memory.remember(observation({ evidenceId: 2 }), { now: 1 }).reason, 'invalid');
  assert.equal(memory.remember(original, { now: 4 }).reason, 'invalid');
});

test('old but explicitly valid evidence is usable without pretending its sensory time is current', () => {
  const original = observation({ originalEvidenceTime: 0, validUntil: 1000 });
  const recalled = createTargetMemory(snapshot([original])).recall('opponent', 50);
  assert.equal(recalled.ageSec, 50);
  assert.equal(recalled.originalEvidenceTime, 0);
  assert.equal(recalled.hypothesisTime, 50);
  assert.equal(recalled.validUntil, 1000);
  assert.equal(recalled.evidenceId, original.evidenceId);
});

test('integration may supply an increasing revision but never reuse or decrease the parent revision', () => {
  const original = observation({ revision: 9 }), memory = createTargetMemory(snapshot([original]));
  assert.equal(memory.recall('opponent', 3, { revision: 20 }).revision, 20);
  for (const revision of [8, 9, -1, NaN, Infinity, 1.5, '20', null])
    assert.equal(memory.recall('opponent', 3, { revision }), null);
  const exhausted = createTargetMemory(snapshot([observation({ revision: Number.MAX_SAFE_INTEGER })]));
  assert.equal(exhausted.recall('opponent', 3), null);
});

test('projection and radius overflow fail closed instead of persisting nonfinite derived content', () => {
  const original = observation({ velocity: { x: Number.MAX_VALUE, y: Number.MAX_VALUE } });
  const memory = createTargetMemory(snapshot([original]));
  assert.equal(memory.recall('opponent', 4), null);
  assert.equal(memory.diagnostics().lastRead.computed, null);
  assert.deepEqual(memory.snapshot(), snapshot([original]));
});
