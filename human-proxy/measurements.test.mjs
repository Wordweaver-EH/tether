import test from 'node:test';
import assert from 'node:assert/strict';
import { CONSTANTS, createWorld, step, hashWorld } from '../src/sim.js';
import { cornerGeometry, createMeasurements, distribution, summarizeHits } from './measurements.mjs';

// These are bounded scripted physics fixtures, never controller-vs-controller bouts.
const arena = { bounds: CONSTANTS.experiment.ARENA, obstacles: CONSTANTS.experiment.OBSTACLES };
const blank = () => ({ moveX: 0, moveY: 0, aimX: 0, aimY: 0, throw: false, recall: false });
const close = (actual, expected, tolerance = 1e-10) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
function player(world, index, position, facing = { x: 1, y: 0 }) {
  world.players[index].position = { ...position };
  world.players[index].facing = { ...facing };
  world.spears[index].position = { ...position };
  world.spears[index].direction = { ...facing };
}
function fixture(id = 'synthetic') {
  const world = createWorld();
  const measure = createMeasurements({ episodeId: 7, boutId: id, counterPlayer: 'P1' }, arena);
  const run = (inputs = [blank(), blank()]) => {
    const beforeHash = hashWorld(world);
    const pre = measure.beforeStep(world);
    assert.equal(hashWorld(world), beforeHash, 'measurement must not mutate world');
    const events = step(world, inputs), afterHash = hashWorld(world);
    measure.afterStep(pre, events, world);
    assert.equal(hashWorld(world), afterHash, 'measurement must not mutate stepped world');
    return events;
  };
  return { world, measure, run };
}
function embeddedFixture(id) {
  const f = fixture(id);
  player(f.world, 0, { x: 0, y: 4 }, { x: 0, y: 1 });
  player(f.world, 1, { x: -3, y: 0 });
  f.run([{ ...blank(), throw: true }, blank()]);
  for (let n = 0; f.world.spears[0].state !== 'EMBEDDED' && n < 15; n++) f.run();
  assert.equal(f.world.spears[0].state, 'EMBEDDED');
  return f;
}

test('32-direction geometry distinguishes open, mere wall proximity, and pressured cornering', () => {
  const empty = { bounds: { minX: -20, maxX: 20, minY: -20, maxY: 20 }, obstacles: [] };
  const open = cornerGeometry({ x: 0, y: 0 }, { x: 4, y: 0 }, empty);
  assert.equal(open.freeDirectionCount, 32);
  assert.equal(open.freeDirectionFraction, 1);
  assert.equal(open.freeRetreatFraction, 1);
  close(open.largestFreeArc, 2 * Math.PI);
  assert.equal(open.pressuredCornered, false);
  assert.equal(open.obstacleClearance, null);

  const wall = cornerGeometry({ x: 7.65, y: 0 }, { x: 7.65, y: 3 }, arena);
  assert.equal(wall.nearWall, true);
  close(wall.wallClearance, 0);
  assert.ok(wall.freeRetreatDirectionCount > 0);
  assert.equal(wall.pressuredCornered, false);
  assert.equal(wall.freeDirectionCount, 17);
  close(wall.largestFreeArc, Math.PI);

  const corner = cornerGeometry({ x: 7.65, y: 4.65 }, { x: 5, y: 2 }, arena);
  assert.equal(corner.freeDirectionCount, 9);
  assert.equal(corner.freeRetreatDirectionCount, 0);
  assert.equal(corner.retreatBlocked, true);
  assert.equal(corner.pressuredCornered, true);
  close(corner.largestFreeArc, Math.PI / 2);
  const unpressured = cornerGeometry({ x: 7.65, y: 4.65 }, { x: -5, y: 0 }, arena);
  assert.equal(unpressured.retreatBlocked, true);
  assert.equal(unpressured.pressuredCornered, false);
});

test('unit segments test obstacle crossing, tangency, wrapping arcs, and undefined bearing', () => {
  const g = { bounds: { minX: -10, maxX: 10, minY: -10, maxY: 10 },
    obstacles: [{ id: 'thin', minX: 0.5, maxX: 0.6, minY: -1, maxY: 1 }] };
  const crossing = cornerGeometry({ x: 0, y: 0 }, { x: -4, y: 0 }, g);
  // End x=1 is beyond the expanded box; checking only its endpoint would fail.
  assert.equal(crossing.freeDirections[0], false);
  const tangent = cornerGeometry({ x: 0.15, y: 0 }, { x: -4, y: 0 }, g);
  assert.equal(tangent.freeDirections[8], true);
  assert.equal(tangent.freeDirections[0], false);
  assert.equal(tangent.freeDirections[16], true);
  const wrap = cornerGeometry({ x: -7.65, y: 0 }, { x: 0, y: 0 }, arena);
  close(wrap.largestFreeArc, Math.PI);
  const coincident = cornerGeometry({ x: 0, y: 0 }, { x: 0, y: 0 }, arena);
  assert.equal(coincident.freeRetreatFraction, null);
  assert.equal(coincident.retreatBlocked, false);
  assert.equal(coincident.opponentCoincident, true);
});

test('distance distributions preserve boundaries, quantiles, empty groups, and phase splits', () => {
  const d = distribution([0, 2, 4, 5.25, 8]);
  assert.deepEqual(d.bins, { '<2': 1, '2–4': 1, '4–5.25': 1, '>=5.25': 2 });
  assert.equal(d.median, 4);
  assert.equal(d.q1, 2);
  assert.equal(d.q3, 5.25);
  assert.equal(d.iqr, 3.25);
  close(d.p10, 0.8);
  close(d.p90, 6.9);
  const empty = summarizeHits([]);
  assert.equal(empty.all.launchCenterDistance.median, null);
  assert.equal(empty.RETURNING.count, 0);
  assert.throws(() => distribution([NaN]), /non-finite/);
  const row = { phase: 'RETURNING', launchCenterDistance: 5, impactCenterDistance: 3,
    launchOriginToDefenderDistance: 4.8, launchOriginToImpactDistance: 2.2, projectileAgeSec: 0.8 };
  assert.equal(summarizeHits([row]).RETURNING.count, 1);
  assert.equal(summarizeHits([row]).OUTBOUND.count, 0);
  assert.equal(summarizeHits([row]).all.projectileAgeSec.bins, undefined);
});

test('actual simultaneous THROW/HIT events retain separate lineage through the single reset', () => {
  const { world, measure, run } = fixture('simultaneous');
  player(world, 0, { x: 0, y: 0 });
  player(world, 1, { x: 0.75, y: 0 }, { x: -1, y: 0 });
  const events = run([{ ...blank(), throw: true }, { ...blank(), throw: true }]);
  assert.equal(events.filter((e) => e.type === 'HIT').length, 2);
  const { summary, raw } = measure.finish(world);
  assert.equal(raw.throws.length, 2);
  assert.equal(raw.hits.length, 2);
  assert.equal(new Set(raw.hits.map((h) => h.throwId)).size, 2);
  for (const hit of raw.hits) {
    assert.equal(hit.launchTick, 0);
    assert.equal(hit.impactTick, 0);
    close(hit.launchCenterDistance, 0.75);
    close(hit.launchOriginToDefenderDistance, 0.4);
    close(hit.impactCenterDistance, 0.75);
    close(hit.impactFraction, 0.5);
    close(hit.projectileAgeSec, 0.5 / 120);
    close(hit.launchOriginToImpactDistance, 0.05);
  }
  assert.deepEqual(raw.throws.map((t) => t.termination.type), ['HIT', 'HIT']);
  assert.deepEqual(summary.finalScores, { P1: 1, P2: 1 });
  assert.equal(summary.byOwner.P1.netHitsPerMinute, 0);
  assert.equal(summary.byOwner.P1.outcome, 'tie');
  assert.equal(summary.byOwner.P1.grossHitsPerMinute, 7200);
  assert.equal(summary.elapsedSec, 1 / 120);
  assert.equal(summary.checks.hitScoreReconciled, true);
  assert.equal(raw.activeThrowIds.length, 0);
});

test('launch and impact center distances are distinct and use THROW origin plus pre-reset HIT positions', () => {
  const { world, measure, run } = fixture('moving-target');
  player(world, 0, { x: 0, y: 0 });
  player(world, 1, { x: 0.75, y: 0 });
  run([{ ...blank(), throw: true }, { ...blank(), moveX: 1 }]);
  const hit = measure.raw().hits[0];
  close(hit.launchCenterDistance, 0.75);
  close(hit.impactCenterDistance, 0.75 + 4 / 120);
  close(hit.launchOrigin.x, 0.35);
  assert.deepEqual(world.players[0].position, CONSTANTS.experiment.STARTS[0].position);
  assert.notEqual(hit.impactCenterDistance, 11);
  assert.equal(measure.summary().byOwner.P1.throwDistances.launchCenterDistance.count, 1);
});

test('actual embed/recall/return HIT preserves original throw ID and recall geometry', () => {
  const { world, measure, run } = embeddedFixture('return-hit');
  for (let i = 0; i < 10; i++) run(); // Embedded waiting contributes to projectile age.
  player(world, 1, { x: 0, y: 4.3 });
  const recallTick = world.tick;
  run([{ ...blank(), recall: true }, blank()]);
  for (let n = 0; measure.raw().hits.length === 0 && n < 10; n++) run();
  const { summary, raw } = measure.finish(world);
  assert.equal(raw.throws.length, 1);
  assert.equal(raw.hits.length, 1);
  const hit = raw.hits[0], launch = raw.throws[0];
  assert.equal(hit.throwId, launch.throwId);
  assert.equal(hit.phase, 'RETURNING');
  assert.equal(hit.recall.tick, recallTick);
  close(hit.recall.spearStart.y, 5);
  close(hit.recall.ownerPosition.y, 4);
  close(hit.recall.opponentPosition.y, 4.3);
  close(hit.launchCenterDistance, 5);
  close(hit.impactCenterDistance, 0.3);
  assert.equal(launch.embeds.length, 1);
  assert.equal(launch.recalls.length, 1);
  assert.ok(hit.projectileAgeSec > 10 / 120);
  assert.equal(summary.byOwner.P1.hitDistances.RETURNING.count, 1);
  assert.equal(summary.byOwner.P1.hitDistances.OUTBOUND.count, 0);
  assert.equal(launch.termination.type, 'HIT');
});

test('return completion and neutralization end actual throw lineage without fabricating HITs', () => {
  const returning = embeddedFixture('return-complete');
  returning.run([{ ...blank(), recall: true }, blank()]);
  for (let n = 0; returning.world.spears[0].state !== 'HELD' && n < 20; n++) returning.run();
  assert.equal(returning.world.spears[0].state, 'HELD');
  let result = returning.measure.finish(returning.world);
  assert.equal(result.raw.throws[0].termination.type, 'RECALL_COMPLETE');
  assert.equal(result.raw.hits.length, 0);
  assert.equal(result.raw.activeThrowIds.length, 0);

  const neutralized = embeddedFixture('neutralized');
  player(neutralized.world, 1, { x: 0, y: 4.65 });
  const events = neutralized.run();
  assert.ok(events.some((e) => e.type === 'SPEAR_NEUTRALIZED'));
  result = neutralized.measure.finish(neutralized.world);
  assert.equal(result.raw.throws[0].termination.type, 'SPEAR_NEUTRALIZED');
  assert.equal(result.raw.hits.length, 0);
});

test('opponent HIT terminates an unhit active throw at RESET', () => {
  const { world, measure, run } = fixture('reset-unhit');
  player(world, 0, { x: 0, y: 0 });
  player(world, 1, { x: 0.75, y: 0 }, { x: 0, y: 1 });
  run([{ ...blank(), throw: true }, { ...blank(), throw: true }]);
  const { raw } = measure.finish(world);
  assert.equal(raw.hits.length, 1);
  assert.equal(raw.throws.find((t) => t.owner === 'P1').termination.type, 'HIT');
  assert.equal(raw.throws.find((t) => t.owner === 'P2').termination.type, 'RESET');
});

test('corner HIT geometry is recomputed from pre-reset event positions and HIT exit is exact', () => {
  const { world, measure, run } = fixture('corner-hit');
  player(world, 0, { x: 7, y: 4.65 });
  player(world, 1, { x: 7.65, y: 4.65 }, { x: -1, y: 0 });
  run([{ ...blank(), throw: true }, blank()]);
  for (let i = 0; i < 4; i++) run();
  const { summary, raw } = measure.finish(world), hit = raw.hits[0];
  assert.equal(hit.victimCornering.pressuredCornered, true);
  assert.equal(hit.attackerCornering.pressuredCornered, false);
  assert.deepEqual(hit.impactDefenderPosition, { x: 7.65, y: 4.65 });
  assert.deepEqual(world.players[1].position, { x: 5.5, y: 0 });
  const cornerEpisodes = raw.cornerEpisodes.filter((e) => e.owner === 'P2');
  assert.equal(cornerEpisodes.length, 1);
  assert.equal(cornerEpisodes[0].exit, 'hitReset');
  assert.equal(cornerEpisodes[0].endTick, 1);
  close(cornerEpisodes[0].durationSec, 1 / 120);
  assert.equal(summary.byOwner.P2.cornering.hitsReceivedWhilePressuredCornered, 1);
  // The t=0 regular sample still represents ticks 0..3, even across the reset.
  close(summary.byOwner.P2.cornering.pressuredCorneredTimeFraction, 4 / 5);
  assert.deepEqual(raw.samples.map((s) => s.representedTicks), [4, 1]);
  assert.ok(raw.auditStates.some((a) => a.category === 'HIT_received_OUTBOUND' && a.corner.pressuredCornered));
});

test('30-Hz occupancy clips to exposure and >=0.5-second episodes distinguish movement from censoring', () => {
  const { world, measure, run } = fixture('corner-movement');
  player(world, 0, { x: 7.65, y: 4.65 });
  player(world, 1, { x: 5, y: 2.5 });
  for (let i = 0; i < 60; i++) run();
  const mid = measure.summary();
  assert.equal(mid.byOwner.P1.cornering.episodesAtLeastHalfSecond, 1);
  assert.equal(mid.byOwner.P1.cornering.exits.termination, 1);
  // A scripted setup reposition is followed by an actual sim step at t=60.
  player(world, 0, { x: 0, y: 0 });
  run();
  const { summary, raw } = measure.finish(world);
  assert.equal(raw.samples.length, 16);
  assert.equal(raw.samples.at(-1).representedTicks, 1);
  assert.equal(summary.checks.representedTicks, 61);
  close(summary.byOwner.P1.cornering.pressuredCorneredTimeFraction, 60 / 61);
  const episode = raw.cornerEpisodes.find((e) => e.owner === 'P1');
  assert.equal(episode.durationSec, 0.5);
  assert.equal(episode.exit, 'movement');
  assert.equal(episode.rightCensored, false);
  assert.equal(summary.byOwner.P1.cornering.qualifyingExits.movement, 1);
  assert.equal(summary.byOwner.P1.cornering.qualifyingExits.termination, 0);

  const censored = fixture('clipped');
  player(censored.world, 0, { x: 7.65, y: 4.65 });
  player(censored.world, 1, { x: 5, y: 2.5 });
  for (let i = 0; i < 5; i++) censored.run();
  const end = censored.measure.finish(censored.world);
  assert.deepEqual(end.raw.samples.map((s) => s.representedTicks), [4, 1]);
  assert.equal(end.raw.cornerEpisodes[0].exit, 'termination');
  assert.equal(end.raw.cornerEpisodes[0].rightCensored, true);
  close(end.raw.cornerEpisodes[0].durationSec, 5 / 120);
  assert.equal(end.summary.byOwner.P1.cornering.episodesAtLeastHalfSecond, 0);
});

test('snapshots/output are independent, finish is idempotent, and continuation after finish is rejected', () => {
  const { world, measure } = fixture('immutability');
  const pre = measure.beforeStep(world);
  assert.ok(Object.isFrozen(pre));
  assert.ok(Object.isFrozen(pre.players.P1.position));
  assert.throws(() => { pre.players.P1.position.x = 100; }, TypeError);
  assert.throws(() => measure.beforeStep(world), /twice/);
  const events = step(world, [blank(), blank()]);
  measure.afterStep(pre, events, world);
  assert.throws(() => measure.afterStep(pre, events, world), /pending/);
  const raw = measure.raw();
  raw.samples[0].players.P1.position.x = 100;
  assert.notEqual(measure.raw().samples[0].players.P1.position.x, 100);
  const end = measure.finish(world);
  end.summary.finalScores.P1 = 999;
  assert.equal(measure.finish(world).summary.finalScores.P1, 0);
  assert.throws(() => measure.beforeStep(world), /finished/);
});

test('missing lineage and score/event mismatches fail instead of dropping observations', () => {
  const missing = fixture('missing-lineage');
  player(missing.world, 0, { x: -1, y: 0 });
  player(missing.world, 1, { x: 0, y: 0 });
  const pre = missing.measure.beforeStep(missing.world);
  // Deliberately inject an unlogged away spear after the logger snapshot.
  Object.assign(missing.world.spears[0], { state: 'OUTBOUND', position: { x: -0.4, y: 0 }, direction: { x: 1, y: 0 } });
  const events = step(missing.world, [blank(), blank()]);
  assert.ok(events.some((e) => e.type === 'HIT'));
  assert.throws(() => missing.measure.afterStep(pre, events, missing.world), /no actual THROW lineage/);

  const mismatch = fixture('score-mismatch');
  player(mismatch.world, 0, { x: 0, y: 0 });
  player(mismatch.world, 1, { x: 0.75, y: 0 });
  const before = mismatch.measure.beforeStep(mismatch.world);
  const actual = step(mismatch.world, [{ ...blank(), throw: true }, blank()]);
  assert.throws(() => mismatch.measure.afterStep(before, actual.filter((e) => e.type !== 'HIT'), mismatch.world), /HIT\/score mismatch/);
});

test('paired-seat namespaces differ without boutId and role labeling accepts physical player IDs', () => {
  const ids = [];
  for (const counterPlayer of ['P1', 'P2']) {
    const world = createWorld();
    const measure = createMeasurements({ episodeId: 9, counterPlayer }, arena);
    const pre = measure.beforeStep(world);
    const events = step(world, [{ ...blank(), throw: true }, blank()]);
    measure.afterStep(pre, events, world);
    const out = measure.finish(world);
    assert.equal(out.summary.roles.counter, counterPlayer);
    assert.equal(out.raw.activeThrowIds.length, 1);
    ids.push(out.raw.throws[0].throwId);
  }
  assert.notEqual(ids[0], ids[1]);
});
