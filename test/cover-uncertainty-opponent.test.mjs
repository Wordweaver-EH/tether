import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step } from '../src/sim.js';
import { percept } from '../src/perception.js';
import { hasLineOfSight } from '../src/visibility.js';
import { controlRoute } from '../src/agents/cover-control.mjs';
import { COVER_INTERFACE } from '../src/agents/cover-interface.mjs';
import { createSwitchingCoverOpponent, coverCircuitRoute,
  SWITCHING_COVER_OPPONENT as SETTINGS } from '../benchmark/cover-uncertainty-v1/opponent.mjs';

const cover = () => createWorld({ gameMode: 'COVER_CONTROL' });
const baseView = (elapsed = 0) => {
  const view = percept(cover(), 'P1', 'MODE_B');
  view.time.elapsedSec = elapsed;
  return view;
};
const outputs = (agent, view, ticks = 42) => Array.from({ length: ticks }, () => agent.act(view));

// These are correctness fixtures, not subject-arm bouts or performance tests.
// No final scores, winners, or treatment effect are inspected or reported.
test('opponent freezes ordinary tactics and uses the production fair embodiment', () => {
  const settings = createSwitchingCoverOpponent({ seed: 27, condition: 'familiar' }).settings();
  assert.equal(settings.switchSec, 30);
  assert.equal(settings.cycleSec, 12);
  assert.equal(settings.excursionOffsetSec, 7);
  assert.equal(settings.initialShotOffsetSec, 4);
  assert.equal(settings.switchedShotOffsetSec, 1.5);
  assert.equal(settings.condition, 'familiar');
  for (const [key, value] of Object.entries(COVER_INTERFACE)) assert.equal(settings.embodiment[key], value);
  assert.equal(settings.embodiment.noise, 'seeded-xorshift-normal-v1');
  assert.ok(Object.isFrozen(SETTINGS));
  assert.throws(() => createSwitchingCoverOpponent({ condition: 'oracle' }), /condition/);
  assert.throws(() => createSwitchingCoverOpponent({ seed: NaN }), /seed/);
  assert.throws(() => createSwitchingCoverOpponent().act(baseView(), 1 / 30), /120 Hz/);
  const bad = baseView(); bad.gameMode = 'DUEL';
  assert.throws(() => outputs(createSwitchingCoverOpponent(), bad), /Cover Control/);
});

test('both circuit directions have body-clear segments and genuinely leave and return to the ring', () => {
  const w = cover(), radius = w.experiment.PLAYER_RADIUS;
  const expanded = w.experiment.OBSTACLES.map(box => ({ ...box,
    minX: box.minX - radius, maxX: box.maxX + radius,
    minY: box.minY - radius, maxY: box.maxY + radius }));
  for (const id of ['P1', 'P2']) for (const route of ['north', 'south']) {
    const ring = controlRoute(id, route).at(-1);
    const circuit = [ring, ...coverCircuitRoute(id, route)];
    let length = 0;
    for (let i = 1; i < circuit.length; i++) {
      assert.ok(hasLineOfSight(circuit[i - 1], circuit[i], expanded), `${id}/${route}/${i}`);
      length += Math.hypot(circuit[i].x - circuit[i - 1].x, circuit[i].y - circuit[i - 1].y);
    }
    assert.deepEqual(circuit.at(-1), ring);
    assert.ok(Math.hypot(ring.x, ring.y) < w.experiment.OBJECTIVE.radius);
    assert.ok(circuit.some(point => Math.hypot(point.x, point.y) > 4));
    assert.ok(length / w.experiment.PLAYER_SPEED > 4 && length / w.experiment.PLAYER_SPEED < 5);
    assert.equal(Math.sign(circuit[2].y), route === 'north' ? -1 : 1);
  }
});

test('all input waits 150 ms; aligned visible shots are sparse edges, and the public clock changes the slot', () => {
  function shotFixture(condition, elapsed, { visible = true, aligned = true, held = true } = {}) {
    const view = baseView(elapsed);
    view.opponent = visible ? { position: { x: -4.5, y: 0 }, facing: { x: -1, y: 0 }, velocity: { x: 0, y: 0 } } : null;
    view.own.facing = aligned ? { x: 1, y: 0 } : { x: -1, y: 0 };
    if (!held) view.own.spear.state = 'OUTBOUND';
    const copy = structuredClone(view);
    const result = outputs(createSwitchingCoverOpponent({ seed: 91, condition }), view);
    assert.deepEqual(view, copy, 'controller must not mutate its caller percept');
    assert.ok(result.slice(0, 18).every(command => Object.values(command).every(value => !value)));
    assert.ok(result.every(command => Object.keys(command).sort().join(',') === 'aimX,aimY,moveX,moveY,recall,throw'));
    return result.map((command, tick) => command.throw ? tick : null).filter(tick => tick !== null);
  }
  for (const condition of ['familiar', 'switch']) assert.deepEqual(shotFixture(condition, 28.1), [18]);
  assert.deepEqual(shotFixture('switch', 37.6), [18]);
  assert.deepEqual(shotFixture('familiar', 37.6), []);
  assert.deepEqual(shotFixture('familiar', 40.1), [18]);
  assert.deepEqual(shotFixture('switch', 40.1), []);
  for (const flags of [{ visible: false }, { aligned: false }, { held: false }])
    assert.deepEqual(shotFixture('familiar', 4.1, flags), []);
});

test('hidden actor state and unrelated public fields cannot alter opponent commands', () => {
  const a = cover(), b = cover();
  b.players[1].position = { x: 5, y: 1 };
  b.players[1].facing = { x: 0, y: 1 };
  assert.deepEqual(percept(a, 'P1', 'MODE_B'), percept(b, 'P1', 'MODE_B'));
  const va = percept(a, 'P1', 'MODE_B'), vb = percept(b, 'P1', 'MODE_B');
  vb.scores = { P1: 100, P2: 300 };
  vb.objective.controller = 'P2'; vb.objective.holdTicks = 239;
  vb.opponentSpear = { state: 'OUTBOUND', position: { x: 1, y: 1 }, direction: { x: -1, y: 0 } };
  const aa = createSwitchingCoverOpponent({ seed: 8 }), ab = createSwitchingCoverOpponent({ seed: 8 });
  assert.deepEqual(outputs(aa, va), outputs(ab, vb));
});

test('neutral geometry smoke reaches, quietly holds, loops, and reverses after the delayed 30 s switch', () => {
  // Short neutral geometry runs only. We inspect positions, motion, and boundary
  // crossings, never the ordinary score fields generated by the simulator.
  for (const id of ['P1', 'P2']) {
    const i = id === 'P1' ? 0 : 1;
    const runs = {};
    for (const condition of ['familiar', 'switch']) {
      const world = cover(), actor = createSwitchingCoverOpponent({ seed: 991, condition });
      const frames = [], excursions = []; let outside = true, departure = null;
      for (let tick = 0; tick < 50 * 120; tick++) {
        const commands = [{}, {}]; commands[i] = actor.act(percept(world, id, 'MODE_B'));
        step(world, commands);
        const own = world.players[i], position = { ...own.position };
        frames.push({ position, velocity: { ...own.velocity }, command: commands[i] });
        const r = world.experiment.PLAYER_RADIUS;
        for (const box of world.experiment.OBSTACLES)
          assert.ok(position.x <= box.minX - r || position.x >= box.maxX + r ||
            position.y <= box.minY - r || position.y >= box.maxY + r, 'no body inside cover');
        const nextOutside = Math.hypot(position.x, position.y) > world.experiment.OBJECTIVE.radius;
        if (nextOutside && !outside) departure = world.elapsedSec;
        if (!nextOutside && outside && departure !== null) {
          excursions.push({ departure, arrival: world.elapsedSec }); departure = null;
        }
        outside = nextOutside;
      }
      for (const sec of [3, 5, 6, 12, 15, 18, 24, 27, 30, 36, 48, 49]) {
        const frame = frames[sec * 120 - 1];
        assert.ok(Math.hypot(frame.position.x, frame.position.y) < world.experiment.OBJECTIVE.radius);
        assert.deepEqual(frame.velocity, { x: 0, y: 0 }, `${id}/${condition} quiet hold at ${sec}`);
      }
      assert.equal(excursions.length, 4, `${id}/${condition} completes every requested loop`);
      for (let n = 0; n < excursions.length; n++) {
        const excursion = excursions[n];
        assert.ok(excursion.departure > 7 + 12 * n && excursion.departure < 7.6 + 12 * n);
        assert.ok(excursion.arrival - excursion.departure > 3.5 && excursion.arrival - excursion.departure < 4.5);
      }
      assert.ok(frames[8 * 120].position.y < -1, 'initial circuit takes north exit');
      assert.ok(frames[20 * 120].position.y < -1, 'second familiar circuit takes north exit');
      assert.equal(Math.sign(frames[32 * 120].position.y), condition === 'switch' ? 1 : -1);
      const diagnostic = actor.diagnostics();
      assert.equal(diagnostic.switched, condition === 'switch');
      assert.equal(diagnostic.phase, condition === 'switch' ? 'switched' : 'initial');
      assert.equal(diagnostic.route, condition === 'switch' ? 'south' : 'north');
      assert.equal(diagnostic.pathKind, 'hold'); assert.equal(diagnostic.holding, true);
      if (condition === 'switch') {
        assert.ok(diagnostic.firstSwitchedRouteObservedSec >= 31 && diagnostic.firstSwitchedRouteObservedSec < 31.1);
        assert.ok(Math.abs(diagnostic.firstSwitchedRouteAppliedSec - diagnostic.firstSwitchedRouteObservedSec - .15) < 1e-9);
      } else assert.equal(diagnostic.firstSwitchedRouteAppliedSec, null);
      diagnostic.route = 'corrupted';
      assert.notEqual(actor.diagnostics().route, 'corrupted', 'diagnostics are detached read-only snapshots');
      runs[condition] = frames;
    }
    assert.deepEqual(runs.familiar.slice(0, 30 * 120 + 18), runs.switch.slice(0, 30 * 120 + 18),
      'conditions are identical before the switch can arrive through the sensor delay');
  }
});

test('ordinary own-spawn teleport observations restart ingress without an external reset signal', () => {
  const actor = createSwitchingCoverOpponent({ seed: 4, condition: 'familiar' });
  const view = baseView();
  for (const [elapsed, point] of [[0, { x: -5.5, y: 0 }], [1, { x: -4.5, y: -1.7 }],
    [2, { x: -2.1, y: -1.7 }], [3, { x: -2.1, y: 0 }], [4, { x: -.55, y: 0 }]]) {
    view.time.elapsedSec = elapsed; view.own.position = { ...point }; outputs(actor, view);
  }
  const held = outputs(actor, view).at(-1);
  assert.equal(held.moveX, 0); assert.equal(held.moveY, 0);
  view.time.elapsedSec = 5; view.own.position = { x: -5.5, y: 0 };
  const resumed = outputs(actor, view).at(-1);
  assert.ok(resumed.moveX > 0 && resumed.moveY < 0, 'returns through the ordinary north ingress');
});
