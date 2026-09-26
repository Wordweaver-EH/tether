import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, hashWorld, step } from '../src/sim.js';
import { createSessionLogger, replayFromLog, serializeLog } from '../src/log.js';
import { runBout } from '../src/headless.mjs';
import { aimAndThrow, idle, randomWalker } from '../src/agents/basic.mjs';

const blank = () => ({ moveX: 0, moveY: 0, aimX: 0, aimY: 0, throw: false, recall: false });

test('metadata, every raw input, 20 Hz samples, and mode on every record', () => {
  const w = createWorld();
  const logger = createSessionLogger({ world: w, mode: 'MODE_A',
    sessionId: 's', boutId: 'b', timestampStart: '2026-09-26T00:00:00Z',
    renderRate: 60, buildId: 'test' });
  for (let i = 0; i < 120; i++) {
    const inputs = [blank(), blank()];
    logger.recordStep(w, inputs, step(w, inputs));
  }
  const records = logger.records;
  const meta = records[0];
  assert.equal(meta.session_id, 's');
  assert.equal(meta.bout_id, 'b');
  assert.equal(meta.timestamp_start, '2026-09-26T00:00:00Z');
  assert.equal(meta.experiment_mode, 'MODE_A');
  assert.equal(meta.sim_rate, 120);
  assert.equal(meta.render_rate, 60);
  assert.equal(meta.deadzones.move, 0.1);
  assert.equal(meta.build_id, 'test');
  assert.equal(meta.experiment_constants.BOUT_SECONDS, 300);
  assert.equal(records.filter((record) => record.recordType === 'INPUT').length, 240);
  const samples = records.filter((record) => record.recordType === 'SAMPLE');
  assert.equal(samples.length, 21);
  assert.deepEqual(samples.map((s) => s.step),
    Array.from({ length: 21 }, (_, index) => index * 6));
  assert.equal(samples[1].timestamp, 0.05);
  assert.equal(samples[20].bout_elapsed_time, 1);
  assert.deepEqual(samples[1].players.P1.position, w.players[0].position);
  assert.equal(samples[1].spears.P1.state, 'HELD');
  assert.equal(samples[1].spears.P1.embed_surface_id, null);
  assert.equal(samples[1].spears.P1.recall_target, null);
  assert.deepEqual(samples[1].visibility_from_P1,
    { opponent_visible: true, own_nonheld_spear_visible: false,
      enemy_nonheld_spear_visible: false });
  assert.ok(records.every((record) => record.mode === 'MODE_A'));
  assert.equal(records.filter((record) => record.type?.startsWith('VISIBILITY_')).length, 0);
  assert.equal(serializeLog(records), logger.toJSONL());
});

test('throw, embed, recall, neutralization, hit, and reset events have logged schemas', () => {
  const w = createWorld();
  w.players[0].facing = { x: -1, y: 0 };
  const logger = createSessionLogger({ world: w, mode: 'MODE_A' });
  const take = (p1, p2 = blank()) => {
    const inputs = [p1, p2];
    const events = step(w, inputs);
    logger.recordStep(w, inputs, events);
    return events;
  };
  take({ ...blank(), throw: true });
  for (let i = 0; i < 100 && w.spears[0].state !== 'EMBEDDED'; i++) take(blank());
  assert.equal(w.spears[0].state, 'EMBEDDED');
  take({ ...blank(), recall: true });
  for (let i = 0; i < 150 && w.spears[0].state !== 'HELD'; i++) take(blank());
  assert.equal(w.spears[0].state, 'HELD');
  w.spears[0] = { owner: 'P1', state: 'EMBEDDED', position: { x: 0, y: 0 },
    direction: { x: 1, y: 0 }, embedSurfaceId: 'WALL_E', recallTarget: null };
  w.players[1].position = { x: -0.34, y: 0 };
  take(blank());
  w.players[1].position = { x: 0, y: 0 };
  w.spears[0] = { owner: 'P1', state: 'OUTBOUND', position: { x: -0.43, y: 0 },
    direction: { x: 1, y: 0 }, embedSurfaceId: null, recallTarget: null };
  take(blank());
  const events = logger.records.filter((record) => record.recordType === 'EVENT');
  const byType = (type) => events.find((event) => event.type === type);
  assert.deepEqual(Object.keys(byType('THROW')).filter((key) => ['player', 'origin', 'facing'].includes(key)).sort(),
    ['facing', 'origin', 'player']);
  assert.ok(byType('EMBED').position);
  assert.ok(byType('EMBED').surface);
  for (const key of ['owner', 'spear_start', 'recall_target', 'opponent_pos', 'owner_facing']) {
    assert.ok(Object.hasOwn(byType('RECALL_START'), key), key);
  }
  for (const key of ['owner', 'fixed_target', 'owner_current']) {
    assert.ok(Object.hasOwn(byType('RECALL_COMPLETE'), key), key);
  }
  for (const key of ['spear_owner', 'neutralizer', 'embedded_pos', 'neutralizer_pos', 'owner_pos']) {
    assert.ok(Object.hasOwn(byType('SPEAR_NEUTRALIZED'), key), key);
  }
  for (const key of ['attacker', 'victim', 'phase', 'hit_pos', 'attacker_pos', 'victim_pos']) {
    assert.ok(Object.hasOwn(byType('HIT'), key), key);
  }
  assert.equal(byType('HIT').phase, 'OUTBOUND');
  assert.equal(byType('RESET').reason, 'SPEAR_HIT');
  assert.deepEqual(byType('RESET').scores, { P1: 1, P2: 0 });
  assert.ok(events.every((event) => event.mode === 'MODE_A'));
});

test('mode B emits visibility exits and entries with entity, position, and facing', () => {
  const w = createWorld();
  const logger = createSessionLogger({ world: w, mode: 'MODE_B' });
  const turnAway = { ...blank(), aimX: -1 };
  const turnBack = { ...blank(), aimX: 1 };
  for (let i = 0; i < 40; i++) {
    const inputs = [turnAway, blank()];
    logger.recordStep(w, inputs, step(w, inputs));
  }
  for (let i = 0; i < 40; i++) {
    const inputs = [turnBack, blank()];
    logger.recordStep(w, inputs, step(w, inputs));
  }
  const changes = logger.records.filter((record) => record.type?.startsWith('VISIBILITY_'));
  assert.ok(changes.some((record) => record.type === 'VISIBILITY_EXIT' &&
    record.viewer === 'P1' && record.entity_id === 'P2' && record.entity_type === 'PLAYER'));
  assert.ok(changes.some((record) => record.type === 'VISIBILITY_ENTER' &&
    record.viewer === 'P1' && record.entity_id === 'P2'));
  assert.ok(changes.some((record) => record.entity_id === 'P2_SPEAR'));
  assert.ok(changes.every((record) => record.mode === 'MODE_B' &&
    record.entity_pos && record.viewer_facing));
  const hiddenSample = logger.records.find((record) => record.recordType === 'SAMPLE' &&
    record.visibility_from_P1.opponent_visible === false);
  assert.ok(hiddenSample);
  assert.equal(hiddenSample.visibility_from_P1.enemy_nonheld_spear_visible, false);
});

test('JSONL replay reproduces all sample hashes and detects tampering', () => {
  const result = runBout({ agents: [randomWalker(1234), aimAndThrow()],
    mode: 'MODE_B', seed: 99, durationSec: 5, log: true });
  const replay = replayFromLog(result.logLines);
  assert.equal(replay.world.tick, 600);
  assert.equal(replay.verifiedSamples, 101);
  assert.equal(replay.finalHash, hashWorld(replay.world));
  assert.deepEqual(result.score, { P1: replay.world.players[0].score,
    P2: replay.world.players[1].score });
  const text = `${result.logLines.join('\n')}\n`;
  assert.equal(replayFromLog(text).finalHash, replay.finalHash);
  const tampered = [...result.logLines];
  const sampleIndex = tampered.findIndex((line) => JSON.parse(line).recordType === 'SAMPLE' &&
    JSON.parse(line).step === 6);
  tampered[sampleIndex] = JSON.stringify({ ...JSON.parse(tampered[sampleIndex]), hash: 'bad' });
  assert.throws(() => replayFromLog(tampered), /world hash mismatch at step 6/);
});

test('headless agents receive isolated percepts and the harness returns scores and events', () => {
  const mutator = { act(view) {
    view.own.position.x = 999;
    view.arena.obstacles[0].minX = 999;
    if (view.opponent) view.opponent.position.x = 999;
    return blank();
  } };
  const result = runBout({ agents: [mutator, idle], mode: 'MODE_B', durationSec: 1 });
  assert.deepEqual(result.score, { P1: 0, P2: 0 });
  assert.deepEqual(result.events, []);
  assert.equal(result.elapsedSec, 1);
  assert.equal(result.winner, null);
  assert.equal(Object.hasOwn(result, 'logLines'), false);
});
