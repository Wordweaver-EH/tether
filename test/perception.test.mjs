import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, hashWorld, step } from '../src/sim.js';
import { isVisible, percept } from '../src/perception.js';

const blank = () => ({ moveX: 0, moveY: 0, aimX: 0, aimY: 0, throw: false, recall: false });

test('the cone includes exact 60 degree rays and zero offset, excludes just outside', () => {
  const origin = { x: 0, y: 0 };
  const facing = { x: 1, y: 0 };
  assert.equal(isVisible(origin, facing, origin), true);
  assert.equal(isVisible(origin, facing, { x: 1, y: Math.sqrt(3) }), true);
  assert.equal(isVisible(origin, facing, { x: 1, y: -Math.sqrt(3) }), true);
  const beyond = Math.PI / 3 + 1e-8;
  assert.equal(isVisible(origin, facing, { x: Math.cos(beyond), y: Math.sin(beyond) }), false);
  assert.equal(isVisible(origin, facing, { x: -1, y: 0 }), false);
  for (const distance of [1e-6, 1, 1e6]) {
    const outside = Math.PI / 3 + 1e-13;
    assert.equal(isVisible(origin, facing, { x: distance * Math.cos(outside),
      y: distance * Math.sin(outside) }), false, `outside at ${distance}`);
  }
  assert.equal(isVisible(origin, facing, { x: -1e-13, y: 0 }), false);
});

test('mode B hides the opponent and HELD spear completely, including nested fields', () => {
  const w = createWorld();
  w.players[0].facing = { x: -1, y: 0 };
  w.players[1].position = { x: 5.123456789, y: 0.987654321 };
  w.players[1].facing = { x: 0.123456789, y: -0.992349 };
  w.players[1].velocity = { x: -3.456789, y: 0.1234567 };
  w.spears[1].position = { ...w.players[1].position };
  w.spears[1].direction = { x: 0.6789123, y: 0.734217 };
  const view = percept(w, 'P1', 'MODE_B');
  assert.equal(view.opponent, null);
  assert.equal(view.opponentSpear, null);
  const serialized = JSON.stringify(view);
  for (const secret of ['5.123456789', '0.987654321', '0.123456789',
    '-3.456789', '0.6789123']) {
    assert.equal(serialized.includes(secret), false, secret);
  }
  assert.deepEqual(view.scores, { P1: 0, P2: 0 });
  assert.equal(view.arena.obstacles.length, 2);
  assert.equal(view.cone.totalAngleRad, 2 * Math.PI / 3);
  assert.equal(view.cone.maxDistance, null);
  assert.equal(view.cone.occlusion, false);
});

test('own and enemy non-held spears are independently cone filtered in mode B', () => {
  const w = createWorld();
  w.players[0].facing = { x: -1, y: 0 };
  w.spears[0].state = 'EMBEDDED';
  w.spears[0].position = { x: 2.22, y: 4.44 };
  w.spears[0].embedSurfaceId = 'A_N';
  w.spears[1].state = 'OUTBOUND';
  w.spears[1].position = { x: -6, y: 0 };
  w.spears[1].direction = { x: -1, y: 0 };
  const view = percept(w, 'P1', 'MODE_B');
  assert.equal(view.opponent, null);
  assert.equal(view.own.spear, null);
  assert.equal(view.opponentSpear.state, 'OUTBOUND');
  assert.deepEqual(view.opponentSpear.position, { x: -6, y: 0 });
  assert.equal(JSON.stringify(view).includes('2.22'), false);
  assert.equal(JSON.stringify(view).includes('A_N'), false);
  assert.equal(percept(w, 'P1', 'MODE_A').own.spear.embedSurfaceId, 'A_N');
  w.spears[0].position = { x: -7, y: 0 };
  assert.deepEqual(percept(w, 'P1', 'MODE_B').own.spear.position, { x: -7, y: 0 });
  w.spears[0].state = 'HELD';
  w.spears[0].position = { ...w.players[0].position };
  assert.equal(percept(w, 'P1', 'MODE_B').own.spear.state, 'HELD');
  w.players[1].facing = { x: 1, y: 0 };
  w.spears[1].state = 'EMBEDDED';
  w.spears[1].position = { x: -6, y: 0 };
  assert.equal(percept(w, 'P2', 'MODE_B').own.spear, null);
});

test('no obstacle occlusion or range cutoff; mode A sees both bodies and spears', () => {
  const w = createWorld();
  w.players[0].position = { x: -4, y: 1 };
  w.players[0].facing = { x: 1, y: 0 };
  w.players[1].position = { x: 4, y: 1 };
  w.spears[1].state = 'EMBEDDED';
  w.spears[1].position = { x: 8, y: 1 };
  w.spears[1].embedSurfaceId = 'WALL_E';
  const b = percept(w, 'P1', 'MODE_B');
  assert.deepEqual(b.opponent.position, { x: 4, y: 1 });
  assert.deepEqual(b.opponentSpear.position, { x: 8, y: 1 });
  w.players[0].facing = { x: -1, y: 0 };
  const a = percept(w, 'P1', 'MODE_A');
  assert.ok(a.opponent);
  assert.ok(a.opponentSpear);
  assert.deepEqual(a.opponent.facing, w.players[1].facing);
  assert.equal(a.opponentSpear.embedSurfaceId, 'WALL_E');
});

test('percepts are deep copies, including geometry, vectors, and recall targets', () => {
  const w = createWorld();
  w.spears[0].state = 'RETURNING';
  w.spears[0].recallTarget = { x: 1.25, y: -2.75 };
  const before = hashWorld(w);
  const first = percept(w, 'P1', 'MODE_A');
  first.own.position.x = 100;
  first.own.spear.position.y = 100;
  first.own.spear.recallTarget.x = 100;
  first.opponent.position.x = 100;
  first.opponentSpear.direction.x = 100;
  first.arena.bounds.minX = 100;
  first.arena.obstacles[0].minX = 100;
  first.cone.origin.x = 100;
  assert.equal(hashWorld(w), before);
  const second = percept(w, 'P1', 'MODE_A');
  assert.equal(second.own.spear.recallTarget.x, 1.25);
  assert.equal(second.arena.obstacles[0].minX, -3);
  assert.equal(second.opponent.position.x, 5.5);
});

test('identical inputs in A and B give identical hashes and trajectories', () => {
  const a = createWorld();
  const b = createWorld();
  let state = 0x91a2b3c4;
  const random = () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
  for (let i = 0; i < 1500; i++) {
    percept(a, 'P1', 'MODE_A');
    percept(a, 'P2', 'MODE_A');
    percept(b, 'P1', 'MODE_B');
    percept(b, 'P2', 'MODE_B');
    const inputs = [0, 1].map(() => ({ moveX: random() * 2 - 1,
      moveY: random() * 2 - 1, aimX: random() * 2 - 1,
      aimY: random() * 2 - 1, throw: random() < 0.01, recall: random() < 0.01 }));
    step(a, inputs);
    step(b, inputs);
    assert.equal(hashWorld(a), hashWorld(b), `step ${i + 1}`);
  }
});

test('a missing input does not expose world state through the agent interface', () => {
  const w = createWorld();
  const view = percept(w, 'P1', 'MODE_B');
  assert.equal(Object.hasOwn(view, 'world'), false);
  assert.equal(Object.hasOwn(view, 'players'), false);
  assert.equal(Object.hasOwn(view, 'spears'), false);
  step(w, [blank(), blank()]);
  assert.equal(view.time.elapsedSec, 0);
});
