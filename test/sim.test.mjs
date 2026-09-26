import test from 'node:test';
import assert from 'node:assert/strict';
import { CONSTANTS, createWorld, step, hashWorld } from '../src/sim.js';

const blank = () => ({ moveX: 0, moveY: 0, aimX: 0, aimY: 0, throw: false, recall: false });
const near = (actual, expected, tolerance = 1e-11) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const putSpear = (world, index, state, x, y, dx, dy, surface = null) => {
  Object.assign(world.spears[index], { state, position: { x, y },
    direction: { x: dx, y: dy }, embedSurfaceId: surface, recallTarget: null });
};

test('arena dimensions, starts, obstacle sizes, and rotational symmetry', () => {
  const { experiment: e, technical: t } = CONSTANTS;
  assert.deepEqual(e.ARENA, { minX: -8, maxX: 8, minY: -5, maxY: 5 });
  assert.equal(e.ARENA.maxX - e.ARENA.minX, 16);
  assert.equal(e.ARENA.maxY - e.ARENA.minY, 10);
  assert.equal(t.SIM_HZ, 120);
  assert.equal(e.STATE_LOG_HZ, 20);
  assert.deepEqual(e.STARTS[0], { position: { x: -5.5, y: 0 }, facing: { x: 1, y: 0 } });
  assert.deepEqual(e.STARTS[1], { position: { x: 5.5, y: 0 }, facing: { x: -1, y: 0 } });
  const [a, b] = e.OBSTACLES;
  near((a.minX + a.maxX) / 2, -2.25);
  near((a.minY + a.maxY) / 2, 1.75);
  near(a.maxX - a.minX, 1.5);
  near(a.maxY - a.minY, 3);
  assert.deepEqual(b, { id: 'B', minX: -a.maxX, maxX: -a.minX,
    minY: -a.maxY, maxY: -a.minY });
  assert.notEqual(hashWorld(createWorld()), hashWorld((() => { const w = createWorld(); w.tick++; return w; })()));
});

test('movement is symmetric, full speed above deadzone, stops immediately, and ignores body overlap', () => {
  const w = createWorld();
  const input = { ...blank(), moveX: 0.101 };
  step(w, [input, input]);
  near(w.players[0].position.x, -5.5 + 4 / 120);
  near(w.players[1].position.x, 5.5 + 4 / 120);
  near(w.players[0].velocity.x, 4);
  near(w.players[1].velocity.x, 4);
  step(w, [blank(), blank()]);
  near(w.players[0].velocity.x, 0);
  near(w.players[0].position.x, -5.5 + 4 / 120);
  const slow = { ...blank(), moveX: 0.1 };
  step(w, [slow, slow]);
  near(w.players[0].velocity.x, 0);
  w.players[0].position = { x: -0.01, y: 0 };
  w.players[1].position = { x: 0.01, y: 0 };
  step(w, [{ ...blank(), moveX: 1 }, { ...blank(), moveX: -1 }]);
  assert.ok(w.players[0].position.x > w.players[1].position.x);
});

test('diagonal input is normalized and movement is independent of facing', () => {
  const w = createWorld();
  const originalFacing = { ...w.players[0].facing };
  step(w, [{ ...blank(), moveX: 1, moveY: 1 }, blank()]);
  near(Math.hypot(w.players[0].velocity.x, w.players[0].velocity.y), 4);
  near(w.players[0].position.x + 5.5, 4 / (120 * Math.SQRT2));
  near(w.players[0].position.y, 4 / (120 * Math.SQRT2));
  assert.deepEqual(w.players[0].facing, originalFacing);
});

test('wall and expanded obstacle contacts slide without penetrating', () => {
  const w = createWorld();
  w.players[0].position = { x: 7.64, y: 0 };
  w.players[1].position = { x: -3.36, y: 1 };
  const action = { ...blank(), moveX: 1, moveY: 1 };
  step(w, [action, action]);
  near(w.players[0].position.x, 7.65);
  near(w.players[0].position.y, 4 / (120 * Math.SQRT2));
  near(w.players[1].position.x, -3.35);
  near(w.players[1].position.y, 1 + 4 / (120 * Math.SQRT2));
});

test('facing turns at 360 degrees per second, never snaps, and throw uses actual facing', () => {
  const w = createWorld();
  const aimUp = { ...blank(), aimY: 1, throw: true };
  const events = step(w, [aimUp, blank()]);
  const angle = Math.PI / 60;
  near(w.players[0].facing.x, Math.cos(angle));
  near(w.players[0].facing.y, Math.sin(angle));
  near(events[0].facing.x, Math.cos(angle));
  near(events[0].origin.x, -5.5 + 0.35 * Math.cos(angle));
  near(events[0].origin.y, 0.35 * Math.sin(angle));
  near(w.spears[0].position.x, events[0].origin.x + 0.1 * Math.cos(angle));
  const prior = { ...w.players[0].facing };
  step(w, [blank(), blank()]);
  assert.deepEqual(w.players[0].facing, prior);
});

test('a 180-degree aim tie turns both rotationally mirrored players the same way', () => {
  const w = createWorld();
  step(w, [{ ...blank(), aimX: -1 }, { ...blank(), aimX: 1 }]);
  near(w.players[0].facing.x, Math.cos(Math.PI / 60));
  near(w.players[0].facing.y, Math.sin(Math.PI / 60));
  near(w.players[1].facing.x, -w.players[0].facing.x);
  near(w.players[1].facing.y, -w.players[0].facing.y);
});

test('outbound speed is 12, follows a straight line, and swept collision prevents tunnelling', () => {
  const w = createWorld();
  putSpear(w, 0, 'OUTBOUND', -1, 0, 1, 0);
  w.players[1].position = { x: 0, y: 0 };
  step(w, [blank(), blank()]);
  near(w.spears[0].position.x, -0.9);
  step(w, [blank(), blank()]);
  near(w.spears[0].position.x, -0.8);
  putSpear(w, 0, 'OUTBOUND', -0.43, 0, 1, 0);
  const events = step(w, [blank(), blank()]);
  const hit = events.find((event) => event.type === 'HIT');
  assert.equal(hit.phase, 'OUTBOUND');
  near(hit.hit_pos.x, -0.35);
  assert.equal(w.players[0].score, 1);
});

test('a near miss stays a near miss at swept precision', () => {
  const w = createWorld();
  putSpear(w, 0, 'OUTBOUND', -0.05, 0, 1, 0);
  w.players[1].position = { x: 0, y: 0.35000001 };
  const events = step(w, [blank(), blank()]);
  assert.ok(!events.some((event) => event.type === 'HIT'));
  near(w.spears[0].position.x, 0.05);
});

test('every static face has its own id and contact point', () => {
  const cases = [
    ['WALL_W', -7.95, 0, -1, 0, -8, 0],
    ['WALL_E', 7.95, 0, 1, 0, 8, 0],
    ['WALL_S', 0, -4.95, 0, -1, 0, -5],
    ['WALL_N', 0, 4.95, 0, 1, 0, 5],
    ['A_W', -3.05, 1.75, 1, 0, -3, 1.75],
    ['A_E', -1.45, 1.75, -1, 0, -1.5, 1.75],
    ['A_S', -2.25, 0.2, 0, 1, -2.25, 0.25],
    ['A_N', -2.25, 3.3, 0, -1, -2.25, 3.25],
    ['B_W', 1.45, -1.75, 1, 0, 1.5, -1.75],
    ['B_E', 3.05, -1.75, -1, 0, 3, -1.75],
    ['B_S', 2.25, -3.3, 0, 1, 2.25, -3.25],
    ['B_N', 2.25, -0.2, 0, -1, 2.25, -0.25],
  ];
  for (const [surface, x, y, dx, dy, contactX, contactY] of cases) {
    const w = createWorld();
    putSpear(w, 0, 'OUTBOUND', x, y, dx, dy);
    // A spear can be positioned by a fixture independently of its owner.
    const events = step(w, [blank(), blank()]);
    const embed = events.find((event) => event.type === 'EMBED');
    assert.ok(embed, surface);
    assert.equal(embed.surface, surface);
    near(embed.position.x, contactX);
    near(embed.position.y, contactY);
    assert.equal(w.spears[0].state, 'EMBEDDED');
  }
});

test('player impact wins a static TOI tie; earlier static contact wins', () => {
  const tie = createWorld();
  putSpear(tie, 0, 'OUTBOUND', -3.05, 0.25, 1, 0);
  tie.players[1].position = { x: -3, y: -0.1 };
  const tieEvents = step(tie, [blank(), blank()]);
  assert.equal(tieEvents.find((event) => event.type === 'HIT')?.phase, 'OUTBOUND');
  assert.ok(!tieEvents.some((event) => event.type === 'EMBED'));
  const staticFirst = createWorld();
  putSpear(staticFirst, 0, 'OUTBOUND', -3.05, 0.25, 1, 0);
  staticFirst.players[1].position = { x: -2.98, y: -0.1 };
  const events = step(staticFirst, [blank(), blank()]);
  assert.equal(events.find((event) => event.type === 'EMBED')?.surface, 'A_W');
  assert.ok(!events.some((event) => event.type === 'HIT'));
});

test('new embed waits one step for neutralization; embedded spear has no decay', () => {
  const w = createWorld();
  putSpear(w, 0, 'OUTBOUND', -3.05, 0.25, 1, 0);
  w.players[1].position = { x: -3, y: -0.1 };
  const first = step(w, [blank(), { ...blank(), moveY: -1 }]);
  assert.ok(first.some((event) => event.type === 'EMBED'));
  assert.ok(!first.some((event) => event.type === 'SPEAR_NEUTRALIZED'));
  const second = step(w, [blank(), { ...blank(), moveY: 1 }]);
  assert.equal(second.find((event) => event.type === 'SPEAR_NEUTRALIZED')?.neutralizer, 'P2');
  assert.equal(w.spears[0].state, 'HELD');
  assert.equal(w.players[0].score, 0);
  putSpear(w, 0, 'EMBEDDED', -3, 1, 1, 0, 'A_W');
  w.players[1].position = { x: 5.5, y: 0 };
  for (let i = 0; i < 1000; i++) step(w, [blank(), blank()]);
  assert.equal(w.spears[0].state, 'EMBEDDED');
  assert.deepEqual(w.spears[0].position, { x: -3, y: 1 });
  assert.equal(w.players[0].score, 0);
});

test('enemy movement sweep neutralizes an embed without score or movement', () => {
  const w = createWorld();
  putSpear(w, 0, 'EMBEDDED', 0, 0, 1, 0, 'WALL_E');
  w.players[1].position = { x: -0.37, y: 0 };
  const events = step(w, [blank(), { ...blank(), moveX: 1 }]);
  const event = events.find((item) => item.type === 'SPEAR_NEUTRALIZED');
  assert.equal(event.spear_owner, 'P1');
  assert.equal(event.neutralizer, 'P2');
  assert.deepEqual(event.embedded_pos, { x: 0, y: 0 });
  near(w.players[1].position.x, -0.37 + 4 / 120);
  assert.equal(w.spears[0].state, 'HELD');
  assert.deepEqual(w.spears[0].position, w.players[0].position);
  assert.equal(w.players[0].score, 0);
  assert.ok(!events.some((item) => item.type === 'HIT'));
});

test('outbound and returning spears cannot be neutralized by a movement sweep', () => {
  for (const phase of ['OUTBOUND', 'RETURNING']) {
    const w = createWorld();
    w.players[0].position = { x: 1, y: 0 };
    w.players[1].position = { x: -0.34, y: 0 };
    putSpear(w, 0, phase, 0, 0, 1, 0);
    if (phase === 'RETURNING') w.spears[0].recallTarget = { x: 1, y: 0 };
    const events = step(w, [blank(), { ...blank(), moveX: -1 }]);
    assert.equal(w.spears[0].state, phase);
    near(w.spears[0].position.x, 0.1);
    assert.ok(!events.some((event) => event.type === 'SPEAR_NEUTRALIZED'));
    assert.equal(w.players[0].score, 0);
  }
});

test('spears cross without interacting', () => {
  const w = createWorld();
  putSpear(w, 0, 'OUTBOUND', -0.05, 0, 1, 0);
  putSpear(w, 1, 'OUTBOUND', 0.05, 0, -1, 0);
  const events = step(w, [blank(), blank()]);
  near(w.spears[0].position.x, 0.05);
  near(w.spears[1].position.x, -0.05);
  assert.deepEqual(events, []);
  assert.deepEqual(w.players.map((p) => p.score), [0, 0]);
});

test('recall is legal only while embedded and is never buffered', () => {
  const w = createWorld();
  step(w, [{ ...blank(), recall: true }, blank()]);
  assert.equal(w.spears[0].state, 'HELD');
  step(w, [{ ...blank(), throw: true, recall: true }, blank()]);
  assert.equal(w.spears[0].state, 'OUTBOUND');
  step(w, [{ ...blank(), recall: true }, blank()]);
  assert.equal(w.spears[0].state, 'OUTBOUND');
  putSpear(w, 0, 'EMBEDDED', 8, 0, 1, 0, 'WALL_E');
  step(w, [blank(), blank()]);
  assert.equal(w.spears[0].state, 'EMBEDDED');
});

test('a recall press at step start wins over enemy contact with that embed', () => {
  const w = createWorld();
  w.players[0].position = { x: 1, y: 0 };
  w.players[1].position = { x: -0.34, y: 0 };
  putSpear(w, 0, 'EMBEDDED', 0, 0, -1, 0, 'A_W');
  const events = step(w, [{ ...blank(), recall: true },
    { ...blank(), moveX: -1 }]);
  assert.ok(events.some((event) => event.type === 'RECALL_START'));
  assert.ok(!events.some((event) => event.type === 'SPEAR_NEUTRALIZED'));
  assert.equal(w.spears[0].state, 'RETURNING');
  near(w.spears[0].position.x, 0.1);
});

test('zero-distance recall completes immediately', () => {
  const w = createWorld();
  putSpear(w, 0, 'EMBEDDED', -5.5, 0, 1, 0, 'WALL_W');
  const events = step(w, [{ ...blank(), recall: true }, blank()]);
  assert.deepEqual(events.map((event) => event.type),
    ['RECALL_START', 'RECALL_COMPLETE']);
  assert.equal(w.spears[0].state, 'HELD');
  assert.deepEqual(w.spears[0].position, w.players[0].position);
});

test('recall records a fixed target, travels straight through an obstacle, and attaches to moving owner', () => {
  const w = createWorld();
  w.players[0].position = { x: 0, y: -1 };
  putSpear(w, 0, 'EMBEDDED', 3, -1, 1, 0, 'B_E');
  const ownerMove = { ...blank(), moveY: 1, recall: true };
  const startEvents = step(w, [ownerMove, blank()]);
  const started = startEvents.find((event) => event.type === 'RECALL_START');
  assert.deepEqual(started.recall_target, { x: 0, y: -1 });
  assert.deepEqual(started.spear_start, { x: 3, y: -1 });
  near(w.spears[0].position.x, 2.9);
  near(w.spears[0].position.y, -1);
  assert.equal(w.spears[0].state, 'RETURNING');
  assert.equal(w.spears[0].embedSurfaceId, null);
  let complete;
  for (let i = 1; i < 30; i++) {
    const events = step(w, [{ ...blank(), moveY: 1 }, blank()]);
    complete = events.find((event) => event.type === 'RECALL_COMPLETE') ?? complete;
  }
  assert.ok(complete);
  assert.deepEqual(complete.fixed_target, { x: 0, y: -1 });
  near(complete.owner_current.y, 0);
  assert.equal(w.spears[0].state, 'HELD');
  assert.deepEqual(w.spears[0].position, w.players[0].position);
});

test('returning ignores walls, hits a player, cannot neutralize, and scores once', () => {
  const w = createWorld();
  w.players[0].position = { x: 5, y: 0 };
  w.players[1].position = { x: 6.5, y: 0 };
  putSpear(w, 0, 'EMBEDDED', 8, 0, 1, 0, 'WALL_E');
  let all = [];
  for (let i = 0; i < 20 && w.players[0].score === 0; i++) {
    const action = i === 0 ? { ...blank(), recall: true } : blank();
    all.push(...step(w, [action, blank()]));
  }
  assert.equal(all.find((event) => event.type === 'HIT')?.phase, 'RETURNING');
  assert.ok(!all.some((event) => event.type === 'SPEAR_NEUTRALIZED'));
  assert.equal(w.players[0].score, 1);
  const outside = createWorld();
  putSpear(outside, 0, 'RETURNING', 8.1, 0, -1, 0);
  outside.spears[0].recallTarget = { x: 0, y: 0 };
  step(outside, [blank(), blank()]);
  near(outside.spears[0].position.x, 8);
  assert.equal(outside.spears[0].state, 'RETURNING');
});

test('simultaneous hits award both players and reset only once, preserving score and time', () => {
  const w = createWorld();
  w.players[0].position = { x: -1, y: 0 };
  w.players[1].position = { x: 1, y: 0 };
  putSpear(w, 0, 'OUTBOUND', 0.57, 0, 1, 0);
  putSpear(w, 1, 'OUTBOUND', -0.57, 0, -1, 0);
  const events = step(w, [blank(), blank()]);
  assert.equal(events.filter((event) => event.type === 'HIT').length, 2);
  assert.equal(events.filter((event) => event.type === 'RESET').length, 1);
  assert.deepEqual(events.find((event) => event.type === 'RESET').scores, { P1: 1, P2: 1 });
  assert.deepEqual(w.players.map((p) => p.position),
    [{ x: -5.5, y: 0 }, { x: 5.5, y: 0 }]);
  assert.deepEqual(w.players.map((p) => p.facing),
    [{ x: 1, y: 0 }, { x: -1, y: 0 }]);
  assert.deepEqual(w.spears.map((s) => s.state), ['HELD', 'HELD']);
  assert.deepEqual(w.spears.map((s) => s.embedSurfaceId), [null, null]);
  assert.deepEqual(w.spears.map((s) => s.recallTarget), [null, null]);
  near(w.elapsedSec, 1 / 120);
  assert.equal(w.players[0].score, 1);
});

test('scores have no cap', () => {
  const w = createWorld();
  w.players[0].score = 100;
  w.players[1].position = { x: 0, y: 0 };
  putSpear(w, 0, 'OUTBOUND', -0.43, 0, 1, 0);
  step(w, [blank(), blank()]);
  assert.equal(w.players[0].score, 101);
});

test('bout ends at exactly 300 seconds, and a tied score does not force resolution', () => {
  const w = createWorld();
  for (let i = 0; i < 300 * 120; i++) step(w, [blank(), blank()]);
  assert.equal(w.tick, 36000);
  assert.equal(w.remainingSec, 0);
  assert.equal(w.ended, true);
  assert.deepEqual(w.players.map((p) => p.score), [0, 0]);
  const hash = hashWorld(w);
  assert.deepEqual(step(w, [blank(), blank()]), []);
  assert.equal(hashWorld(w), hash);
});
