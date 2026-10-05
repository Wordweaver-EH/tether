import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAwareness, createDelayedAwarenessInterface, SETTINGS, copyAllowedPacket } from './awareness.mjs';
import { packet, spear, vec, DEFAULT_ARENA, emptyArena, sourceCanSee, sampledStaticSweepCertificate } from './fixtures.mjs';

const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const checks = [], examples = {}, geometryCases = [];
function check(id, description, fn) {
  test(`${id}: ${description}`, () => {
    try { fn(); checks.push({ id, description, passed: true }); }
    catch (error) { checks.push({ id, description, passed: false, error: String(error) }); throw error; }
  });
}
const observe = (a, p) => a.observe(p, p.time.elapsedSec + .25);
function rear({ side = -1, y = 0, arena = DEFAULT_ARENA, time = .5, state = 'EMBEDDED', commit = null, viewerId = 'P1' } = {}) {
  const a = createAwareness(), position = vec(0, y), x = 8 * side;
  const initial = packet({ facing: vec(side, 0), position, visible: spear(state, x, y, -side, 0), arena, viewerId });
  assert.ok(sourceCanSee(initial.own.position, initial.own.facing, initial.opponentSpear.position));
  observe(a, initial);
  if (commit) a.commitMovement(commit);
  const next = packet({ time, facing: vec(-side, 0), position, arena, viewerId });
  const result = observe(a, next);
  return { a, result, next, arena };
}
function quiet(r) { assert.equal(r.warning, false); assert.equal(r.proposal, null); }
function uncertainty(r) {
  assert.equal(r.warning, true);
  assert.equal(r.reason, 'possible-unseen-rear-spear-risk');
  assert.deepEqual(r.uncertainty, { unseenRecallOnsetKnown: false, enemyEndpointKnown: false, currentEnemyStateKnown: false });
  assert.equal(r.evidence.currentSpearPositionKnown, false);
}

check('F01', 'no evidence is quiet', () => {
  const a = createAwareness(); for (const t of [0, 1 / 30, .8, 1]) quiet(observe(a, packet({ time: t })));
});
check('F02', 'visible HELD clears remembered-away evidence', () => {
  const { a } = rear();
  const held = observe(a, packet({ time: .6, visible: spear('HELD', 5.5, 0) }));
  quiet(held); assert.equal(held.reason, 'observed-held');
  const absent = observe(a, packet({ time: 2 / 3 })); quiet(absent); assert.equal(absent.reason, 'no-evidence');
});
check('F03', 'visible away states delegate rather than claim unseen return', () => {
  for (const state of ['OUTBOUND', 'EMBEDDED', 'RETURNING']) {
    const a = createAwareness(), r = observe(a, packet({ visible: spear(state, state === 'EMBEDDED' ? 8 : 4, 0) }));
    quiet(r); assert.equal(r.reason, 'visible-away-delegated');
  }
});
check('F04', 'remembered rear wall spear yields uncertain warning, scan and lateral suggestion', () => {
  const f = rear(), r = f.result; uncertainty(r);
  assert.deepEqual(r.evidence.nominalLandmark, vec(-8, 0));
  assert.equal(r.evidence.sourceAgeSec, .5); assert.equal(r.evidence.ageAtReceiptSec, .75);
  assert.deepEqual(r.proposal.scanAim, vec(-1, 0));
  assert.ok(Math.abs(r.proposal.movement.y) === 1); assert.equal(r.proposal.movement.x, 0);
  assert.equal(r.proposal.movementCertificate.certified, true);
  examples.rearEmbedded = r; geometryCases.push(f);
});
check('F05', 'outbound hypothesis stops at public obstacle and can become rear', () => {
  const a = createAwareness();
  const first = packet({ facing: vec(-1, 0), visible: spear('OUTBOUND', -2, -.6) });
  assert.ok(sourceCanSee(first.own.position, first.own.facing, first.opponentSpear.position));
  observe(a, first);
  const r = observe(a, packet({ time: 1 / 3, facing: vec(-1, 0) })); uncertainty(r);
  assert.deepEqual(r.evidence.nominalLandmark, vec(1.5, -.6));
  assert.equal(r.evidence.landmarkMeaning, 'outbound-no-unseen-transition-hypothesis');
  examples.passedOutbound = r; geometryCases.push({ result: r, arena: DEFAULT_ARENA });
});
check('F06', 'side/front remembered landmark stays quiet without claiming safety', () => {
  const a = createAwareness();
  observe(a, packet({ facing: vec(0, 1), visible: spear('EMBEDDED', .5, 5) }));
  const r = observe(a, packet({ time: .3, facing: vec(1, 0) })); quiet(r);
  assert.equal(r.reason, 'remembered-landmark-not-rear'); assert.equal(r.evidence.currentSpearPositionKnown, false);
});
check('F07', 'hidden remembered RETURNING remains an uncertain continuation, with no endpoint', () => {
  const a = createAwareness();
  observe(a, packet({ facing: vec(-1, 0), visible: spear('RETURNING', -8, 0) }));
  const r = observe(a, packet({ time: .5 })); uncertainty(r);
  assert.deepEqual(r.evidence.nominalLandmark, vec(-2, 0));
  assert.equal(r.evidence.landmarkMeaning, 'observed-return-direction-continuation-hypothesis');
  assert.match(r.evidence.condition, /unknown return endpoint/);
  assert.equal(JSON.stringify(r).includes('recallTarget'), false); examples.hiddenPriorReturn = r;
});
check('F08', 'memory includes exactly 0.8 source seconds and then expires', () => {
  const { a, result } = rear({ time: .8 }); uncertainty(result);
  assert.equal(result.evidence.sourceAgeSec, .8); assert.equal(result.evidence.ageAtReceiptSec, 1.05);
  const expired = observe(a, packet({ time: 25 / 30 })); quiet(expired); assert.equal(expired.reason, 'evidence-expired');
  assert.equal(observe(a, packet({ time: 26 / 30 })).reason, 'no-evidence');
});
check('F09', 'delayed score/end clears old evidence and snapshots', () => {
  for (const changed of [{ scores: { P1: 0, P2: 1 } }, { scores: { P1: 1, P2: 0 } }, { ended: true }]) {
    const { a } = rear(); const r = observe(a, packet({ time: .6, ...changed })); quiet(r);
    assert.equal(r.reason, changed.ended ? 'episode-ended' : 'no-evidence');
    assert.equal(r.observedScoreChange, !changed.ended);
  }
});
check('F10', 'both bearing frames preserve either issued world-space lateral direction', () => {
  for (const side of [-1, 1]) for (const y of [-1, 1]) {
    const f = rear({ side, commit: vec(0, y) }); uncertainty(f.result);
    assert.ok(Math.abs(f.result.proposal.movement.x) < 1e-12);
    assert.equal(f.result.proposal.movement.y, y); geometryCases.push(f);
  }
});
check('F11', 'both near-wall cases select the full-envelope open side', () => {
  for (const side of [-1, 1]) for (const y of [-3.6, 3.6]) {
    const f = rear({ side, y, commit: vec(0, Math.sign(y)) }); uncertainty(f.result);
    assert.equal(f.result.proposal.movement.y, -Math.sign(y)); geometryCases.push(f);
  }
});
check('F12', 'a public obstacle blocks one side and selects the other', () => {
  const arena = emptyArena(); arena.obstacles.push({ minX: -.2, maxX: .2, minY: 1.45, maxY: 2 });
  const f = rear({ arena, commit: vec(0, 1) }); uncertainty(f.result);
  assert.equal(f.result.proposal.movement.y, -1); geometryCases.push(f); examples.obstacleOneSide = f.result;
});
check('F13', 'blocked sides and overlapping uncertainty yield scan-only', () => {
  const arena = emptyArena();
  arena.obstacles.push({ minX: -.2, maxX: .2, minY: 1.4, maxY: 2 }, { minX: -.2, maxX: .2, minY: -2, maxY: -1.4 });
  for (const f of [rear({ arena }), rear({ y: 4.5 }), rear({ y: -4.5 })]) {
    uncertainty(f.result); assert.equal(f.result.proposal.response, 'scan-only');
    assert.equal(f.result.proposal.movement, null); assert.equal(f.result.proposal.movementCertificate.certified, false);
  }
  examples.scanOnly = rear({ arena }).result;
});
check('F14', 'unobserved reset-spawn envelope also constrains movement', () => {
  for (const viewerId of ['P1', 'P2']) {
    const arena = emptyArena(), spawnX = viewerId === 'P1' ? -5.5 : 5.5;
    arena.obstacles.push({ minX: spawnX - .2, maxX: spawnX + .2, minY: .8, maxY: 1.2 });
    const f = rear({ arena, viewerId }); uncertainty(f.result);
    assert.equal(f.result.proposal.movement, null);
    assert.equal(f.result.proposal.movementCertificate.envelopes[1].position.x, spawnX);
    examples[`resetEnvelope${viewerId}`] = f.result;
  }
});
check('F15', 'coincident nominal landmark abstains with finite data', () => {
  const a = createAwareness(); observe(a, packet({ facing: vec(-1, 0), visible: spear('RETURNING', -2, 0) }));
  const r = observe(a, packet({ time: 1 / 6 })); quiet(r); assert.equal(r.reason, 'coincident-landmark-abstain');
  assert.equal(JSON.stringify(r).includes('NaN'), false);
});
check('F16', 'one queue enforces 250-ms age, 30-Hz receipt cadence and startup', () => {
  const w = createDelayedAwarenessInterface();
  for (let tick = 0; tick < 121; tick++) {
    const r = w.push(packet({ time: tick / 120 }));
    const decision = tick >= 30 && (tick - 30) % 4 === 0;
    assert.equal(r !== null, decision);
    if (decision) { assert.equal(r.sensorTime, (tick - 30) / 120); assert.equal(r.receiptTime, tick / 120); }
  }
  assert.equal(w.records().length, 23);
  for (const r of w.records()) assert.ok(Math.abs(r.receiptTime - r.sensorTime - .25) < 1e-12);
  const records = w.records(); records[0].reason = 'mutated'; assert.notEqual(w.records()[0].reason, 'mutated');
  examples.queueTiming = w.records().map(r => ({ sensorTime: r.sensorTime, receiptTime: r.receiptTime }));
});
check('F17', 'source-tick-61 reset cannot clear memory until receipt tick 94', () => {
  const w = createDelayedAwarenessInterface(); let beforeResetArrival, afterResetArrival;
  for (let tick = 0; tick <= 94; tick++) {
    const reset = tick >= 61;
    const angle = Math.max(0, Math.PI - 2 * Math.PI * tick / 120);
    const position = reset ? vec(-5.5, 0) : vec(0, 0), facing = reset ? vec(1, 0) : vec(Math.cos(angle), Math.sin(angle));
    const oldSpear = spear('EMBEDDED', -8, 0);
    const visible = reset ? spear('HELD', 5.5, 0) : sourceCanSee(position, facing, oldSpear.position) ? oldSpear : null;
    const r = w.push(packet({ time: tick / 120, position, facing, visible, scores: { P1: 0, P2: reset ? 1 : 0 } }));
    if (r && tick < 94) assert.equal(r.observedScoreChange, false);
    if (tick === 90) beforeResetArrival = r;
    if (tick === 94) afterResetArrival = r;
  }
  uncertainty(beforeResetArrival); quiet(afterResetArrival);
  assert.equal(afterResetArrival.observedScoreChange, true); assert.equal(afterResetArrival.sensorTime, 64 / 120);
  assert.equal(afterResetArrival.reason, 'observed-held');
  examples.resetBoundary = { receiptTick90: beforeResetArrival, receiptTick94: afterResetArrival };
});
check('F18', 'hidden worlds and unused oracle getters are indistinguishable', () => {
  const hiddenWorlds = [
    { state: 'EMBEDDED', position: vec(-8, 0), hiddenRecallOnset: null, hiddenEndpoint: null },
    { state: 'RETURNING', position: vec(-5.6, 0), hiddenRecallOnset: .3, hiddenEndpoint: vec(5, 0) },
    { state: 'RETURNING', position: vec(-8 + 2.4 * 12 / Math.hypot(12, .5), 2.4 * .5 / Math.hypot(12, .5)), hiddenRecallOnset: .3, hiddenEndpoint: vec(4, .5) },
  ];
  const results = [], received = [];
  for (const world of hiddenWorlds) {
    const a = createAwareness(); observe(a, packet({ facing: vec(-1, 0), visible: spear('EMBEDDED', -8, 0) }));
    const p = packet({ time: .5 });
    assert.equal(sourceCanSee(p.own.position, p.own.facing, world.position), false);
    // The evaluator masks the absent spear. Hidden-world annotations stay here.
    received.push(copyAllowedPacket(p)); results.push(observe(a, p));
  }
  assert.deepEqual(received[0], received[1]); assert.deepEqual(received[0], received[2]);
  assert.deepEqual(results[0], results[1]); assert.deepEqual(results[0], results[2]); uncertainty(results[0]);
  const a = createAwareness(), p = packet({ facing: vec(-1, 0), visible: spear('EMBEDDED', -8, 0) });
  for (const key of ['truth', 'world', 'events', 'currentEnemy', 'currentScores', 'opponent'])
    Object.defineProperty(p, key, { get() { throw new Error(`forbidden read ${key}`); }, configurable: true, enumerable: true });
  Object.defineProperty(p.opponentSpear, 'recallTarget', { get() { throw new Error('forbidden enemy target read'); }, enumerable: true });
  Object.defineProperty(p.own, 'spear', { get() { throw new Error('unused own spear read'); }, enumerable: true });
  quiet(observe(a, p)); assert.deepEqual(observe(a, packet({ time: .5 })), results[0]);
  examples.hiddenWorldEquivalence = { distinctEvaluatorWorlds: hiddenWorlds.length, equalAllowedHistories: true, byteEqualAssessments: true,
    warningAlsoOccursWhenNoRecallHappened: true };
});
check('F19', 'malformed contracts fail closed; extra allowed-boundary noise is ignored', () => {
  const mutations = [
    p => { p.mode = 'MODE_A'; }, p => { p.viewerId = 'P3'; }, p => { p.own.position.x = NaN; },
    p => { p.own.facing = vec(0, 0); }, p => { p.time.elapsedSec = .001; },
    p => { p.time.elapsedSec = 1 / 120; }, p => { p.scores.P1 = -1; },
    p => { p.opponentSpear = spear('UNKNOWN', 4, 0); }, p => { p.opponentSpear = spear('OUTBOUND', 4, 0, 0, 0); },
    p => { p.arena.bounds.maxX = p.arena.bounds.minX; }, p => { p.time.ended = 'yes'; },
  ];
  for (const mutate of mutations) { const p = packet(); mutate(p); assert.throws(() => observe(createAwareness(), p)); }
  for (const receipt of [0, .249, .251, Infinity, NaN]) assert.throws(() => createAwareness().observe(packet(), receipt));
  const a = createAwareness(); observe(a, packet()); assert.throws(() => observe(a, packet()));
  assert.throws(() => observe(a, packet({ time: 1 / 30, viewerId: 'P2' })));
  const w = createDelayedAwarenessInterface(); assert.throws(() => w.push(packet({ time: 1 / 120 })));
  w.push(packet()); assert.throws(() => w.push(packet({ time: 2 / 120 })));
  const p = packet(), noisy = structuredClone(p); noisy.extra = { secret: true }; noisy.own.position.secret = 'ignored';
  assert.deepEqual(copyAllowedPacket(p), copyAllowedPacket(noisy));
});
check('F20', 'determinism, input/snapshot isolation and no attack command fields', () => {
  const a = createAwareness(), b = createAwareness();
  const stream = [packet({ facing: vec(-1, 0), visible: spear('EMBEDDED', -8, 0) }), packet({ time: .5 }), packet({ time: .6 })];
  const serialized = JSON.stringify(stream);
  const ar = stream.map(p => observe(a, p)), br = stream.map(p => observe(b, p));
  assert.equal(JSON.stringify(ar), JSON.stringify(br)); assert.equal(JSON.stringify(stream), serialized);
  ar[1].evidence.lastSeenPosition.x = 10000; ar[1].proposal.scanAim.x = 10000;
  assert.deepEqual(observe(a, packet({ time: .7 })), observe(b, packet({ time: .7 })));
  for (const r of br) {
    assert.equal(Object.hasOwn(r, 'throw'), false); assert.equal(Object.hasOwn(r, 'recall'), false);
    if (r.proposal) { assert.equal(Object.hasOwn(r.proposal, 'throw'), false); assert.equal(Object.hasOwn(r.proposal, 'recall'), false); }
  }
});
check('F21', 'independent sampled body/reset-envelope segment geometry has zero collisions', () => {
  const all = geometryCases.map(f => sampledStaticSweepCertificate(f.result, f.arena));
  assert.ok(all.length >= 10);
  for (const c of all) { assert.ok(c.sampledCenters > 1000); assert.equal(c.violations.length, 0); }
  examples.independentGeometry = { cases: all.length, sampledCenters: all.reduce((s, x) => s + x.sampledCenters, 0),
    sampledPositions: all.reduce((s, x) => s + x.sampledPositions, 0), violations: 0 };
});
check('F22', 'original bytes, frozen sources and prototype-only source boundary stay intact', () => {
  const original = JSON.parse(readFileSync(resolve(here, 'ORIGINAL-INPUT-MANIFEST.json'), 'utf8'));
  for (const [path, expected] of Object.entries(original.files)) assert.equal(sha(readFileSync(resolve(root, path))), expected, path);
  const source = JSON.parse(readFileSync(resolve(root, 'FROZEN-SOURCE-MANIFEST.json'), 'utf8'));
  const frozen = JSON.parse(readFileSync(resolve(root, 'repo/human-proxy/FREEZE.json'), 'utf8')).files;
  for (const [path, expected] of [...Object.entries(source), ...Object.entries(frozen)])
    assert.equal(sha(readFileSync(resolve(root, 'repo', path))), expected, path);
  const code = readFileSync(resolve(here, 'awareness.mjs'), 'utf8');
  assert.equal(/^\s*import\s/m.test(code), false);
  for (const forbidden of ['readFile', 'writeFile', 'fetch(', 'Math.random', 'recallTarget', 'createWorld(', 'step(', 'createHumanCounter(', '.opponent.'])
    assert.equal(code.includes(forbidden), false, forbidden);
  const declared = readFileSync(resolve(here, 'DECLARATION-HASHES.txt'), 'utf8').trim().split('\n');
  for (const line of declared) {
    const [expected, path] = line.split(/\s+/); assert.equal(sha(readFileSync(resolve(root, path))), expected, path);
  }
  examples.integrity = { originalFileCount: Object.keys(original.files).length,
    protectedSourceEntries: Object.keys(source).length, frozenSourceEntries: Object.keys(frozen).length,
    allPassed: true, noPrototypeImportsOrOracleAccess: true };
});

after(() => {
  if (!process.env.SENSOR_RESULTS) return;
  const destination = resolve(process.env.SENSOR_RESULTS);
  if (existsSync(destination)) throw new Error('Refuse to overwrite an existing results directory');
  mkdirSync(destination, { recursive: true });
  writeFileSync(resolve(destination, 'RESULTS.json'), JSON.stringify({ schema: 1,
    scope: 'synthetic sensor-only feasibility; no matches or saved-outcome replay',
    predeclarationSha256: sha(readFileSync(resolve(here, 'PREDECLARATION.md'))),
    prototypeSha256: sha(readFileSync(resolve(here, 'awareness.mjs'))),
    settings: SETTINGS, passed: checks.filter(c => c.passed).length, failed: checks.filter(c => !c.passed).length,
    checks, examples }, null, 2) + '\n', { flag: 'wx' });
});
