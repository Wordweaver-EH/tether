import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step } from '../src/sim.js';
import { percept } from '../src/perception.js';
import { createSessionLogger } from '../src/log.js';
import { runBout } from '../src/headless.mjs';
import { createMind } from '../src/mind/index.mjs';
import { keyMovement, aimFromPointer, mapInput, createInputState } from '../client/input.mjs';
import { createAccumulator } from '../client/fixed-step.mjs';
import { renderModel } from '../client/render-model.mjs';
import { parseLog, nearestFrame, traceAt } from '../replay/log-data.mjs';
import { readTelemetry, recordBout, recordRematch, recordSessionDuration } from '../client/telemetry.mjs';
import { resolveRequest, makeServer } from '../serve.mjs';

test('keyboard, pointer, and gamepad map to the six raw input fields', () => {
  assert.deepEqual(keyMovement(new Set(['KeyW', 'KeyD'])), { moveX: 1, moveY: -1 });
  assert.deepEqual(aimFromPointer({ x: 3, y: -2 }, { x: 1, y: 1 }), { aimX: 2, aimY: -3 });
  const mapped = mapInput({ keys: new Set(['KeyA']), pointer: { x: 3, y: 0 },
    player: { x: 1, y: 0 }, presses: { throw: true },
    gamepad: { axes: [0.8, 0, 0, -1], buttons: [] } });
  assert.deepEqual(mapped, { moveX: 0.8, moveY: 0, aimX: 0, aimY: -1, throw: true, recall: false });
  const state = createInputState(); state.press('recall');
  assert.equal(state.take({ x: 0, y: 0 }).recall, true);
  assert.equal(state.take({ x: 0, y: 0 }).recall, false);
  const pad = { axes: [], buttons: Array.from({ length: 8 }, () => ({ pressed: false })) };
  pad.buttons[7].pressed = true;
  assert.equal(state.take({ x: 0, y: 0 }, pad).throw, true);
  assert.equal(state.take({ x: 0, y: 0 }, pad).throw, false);
});

test('accumulator advances fixed 120 Hz steps independent of render calls and retains debt', () => {
  const clock = createAccumulator(); let count = 0;
  assert.equal(clock.advance(1 / 240, () => count++), 0);
  assert.equal(clock.advance(1 / 240, () => count++), 1);
  assert.equal(clock.advance(1 / 30, () => count++), 4);
  assert.equal(count, 5);
  const limited = createAccumulator({ hz: 120, maxStepsPerFrame: 2 });
  assert.equal(limited.advance(1 / 30, () => {}), 2);
  assert.equal(limited.advance(0, () => {}), 2);
  assert.ok(limited.debt < 1 / 120);
  clock.reset(); assert.equal(clock.debt, 0);
});

test('play render input contains only visible percept entities', () => {
  const w = createWorld();
  w.players[1].position = { x: -7, y: 0 }; w.spears[1].position = { x: -7, y: 0 };
  w.spears[0].state = 'EMBEDDED'; w.spears[0].position = { x: -7, y: 0 };
  const v = percept(w, 'P1', 'MODE_B');
  assert.equal(v.opponent, null); assert.equal(v.own.spear, null);
  const model = renderModel(v, 'secret speech');
  assert.deepEqual(model.players.map((p) => p.id), ['P1']);
  assert.deepEqual(model.spears.map((s) => s.owner), []);
  assert.equal(model.npcCone, null); assert.equal(model.outerSpeech, null);
  const full = renderModel(percept(w, 'P1', 'MODE_A'));
  assert.equal(full.players.length, 2); assert.equal(full.spears.length, 2);
  assert.throws(() => renderModel(w), /percept required/);
});

test('log parser verifies raw inputs, builds frames, joins traces, and rejects a changed sample', () => {
  const world = createWorld(), logger = createSessionLogger({ world, mode: 'MODE_B' });
  for (let i = 0; i < 12; i++) {
    const inputs = [{ moveX: 1, throw: i === 0 }, {}];
    const events = step(world, inputs); logger.recordStep(world, inputs, events);
  }
  logger.records.push({ recordType: 'MIND_TRACE', mode: 'MODE_B', player: 'P2',
    step: 6, timestamp: 0.05, trace: { time: 0.05, focus: 'Search', ignition: true, surprise: 8 } });
  const parsed = parseLog(logger.toJSONL());
  assert.equal(parsed.verification.verifiedSamples, 3);
  assert.deepEqual(parsed.frames.map((f) => f.step), [0, 6, 12]);
  assert.equal(parsed.frames[1].sweeps.length > 0, true);
  assert.equal(nearestFrame(parsed.frames, 0.08).step, 6);
  assert.equal(traceAt(parsed.traces, 0.08).focus, 'Search');
  assert.ok(parsed.jumps.some((j) => j.type === 'IGNITION'));
  const tampered = logger.records.map((r) => ({ ...r }));
  const sample = tampered.find((r) => r.recordType === 'SAMPLE' && r.step === 6);
  sample.hash = 'bad';
  assert.throws(() => parseLog(tampered), /world hash mismatch/);
  assert.throws(() => parseLog(logger.records.filter((r) => r !== logger.records.find((x) =>
    x.recordType === 'SAMPLE' && x.step === 6))), /record count mismatch|Missing or out-of-order state samples/);
});

test('replay sweeps end at the hit point even when scoring resets the spear', () => {
  const world = createWorld(), logger = createSessionLogger({ world, mode: 'MODE_A' });
  for (let i = 0; i < 120; i++) {
    const inputs = [{ throw: i === 0 }, {}];
    logger.recordStep(world, inputs, step(world, inputs));
  }
  const parsed = parseLog(logger.toJSONL());
  const hit = parsed.events.find((r) => r.type === 'HIT');
  assert.ok(hit);
  const sweep = parsed.frames.flatMap((f) => f.sweeps).find((s) => s.step === hit.step && s.owner === 'P1');
  assert.ok(sweep);
  assert.deepEqual(sweep.to, hit.hit_pos);
  assert.notDeepEqual(sweep.to, world.spears[0].position);
});

test('Mind View parses a real mind trace log', () => {
  const result = runBout({ agents: [{ act: () => ({}) }, createMind({ seed: 11 })],
    mode: 'MODE_B', durationSec: 1, log: true, captureTraces: true });
  const parsed = parseLog(result.logLines);
  assert.equal(parsed.verification.verifiedSamples, 21);
  assert.ok(parsed.traces.length > 0);
  assert.ok(parsed.traces[0].belief.particles.length > 0);
});

test('telemetry records bouts, rematches, durations, and recovers from invalid storage', () => {
  const values = new Map(); const storage = { getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v) };
  assert.equal(readTelemetry(storage).boutsPlayed, 0);
  recordBout(storage, { score: { P1: 2, P2: 1 }, mode: 'MODE_B' });
  recordRematch(storage); recordSessionDuration(storage, 62.5);
  const result = readTelemetry(storage);
  assert.equal(result.boutsPlayed, 1); assert.equal(result.rematches, 1);
  assert.deepEqual(result.sessionDurationsSec, [62.5]);
  assert.equal(result.bouts[0].score.P1, 2);
  values.set('tether.telemetry.v1', '{bad');
  assert.equal(readTelemetry(storage).boutsPlayed, 0);
});

test('static server resolves local files and blocks traversal', () => {
  assert.ok(resolveRequest('/').replaceAll('\\', '/').endsWith('client/index.html'));
  assert.equal(resolveRequest('/../outside'), null);
  assert.equal(resolveRequest('/%2e%2e/%2e%2e/outside'), null);
});

test('static server serves play, replay, and ES modules over loopback', async () => {
  const server = makeServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const route of ['/', '/replay/', '/src/sim.js']) {
      const response = await fetch(`${base}${route}`);
      assert.equal(response.status, 200, route);
      assert.match(response.headers.get('content-type'), route.endsWith('.js') ? /javascript/ : /html/);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
