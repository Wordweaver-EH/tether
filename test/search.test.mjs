import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, CONSTANTS } from '../src/sim.js';
import { percept } from '../src/perception.js';
import { createParamAgent, decodePolicy, POLICY_SEEDS, PARAMETERS } from '../src/agents/param.mjs';
import { createReactiveDodger, reactiveDodger } from '../src/agents/dodger.mjs';
import { createSpearMemory } from '../src/agents/spear-memory.mjs';
import { wilson, parseArgs } from '../arena/search.mjs';

test('param family has independent bounded policy dimensions and delayed percepts', () => {
  assert.equal(PARAMETERS.length, 21);
  assert.equal(decodePolicy(POLICY_SEEDS.direct).throwMode, 0);
  assert.equal(decodePolicy(POLICY_SEEDS.anchor).throwMode, 2);
  assert.throws(() => createParamAgent([0, 1]));
  const world = createWorld();
  const agent = createParamAgent(POLICY_SEEDS.direct);
  const view = percept(world, 'P1', 'MODE_B');
  for (let i = 0; i < 18; i++) assert.deepEqual(agent.act(view, 1 / 120), {});
  assert.equal(typeof agent.act(view, 1 / 120).throw, 'boolean');
});

test('reactive dodger waits 150 ms then moves perpendicular to visible outbound line', () => {
  const world = createWorld();
  world.spears[1].state = 'OUTBOUND';
  world.spears[1].position = { x: 2, y: 0 };
  world.spears[1].direction = { x: -1, y: 0 };
  const view = percept(world, 'P1', 'MODE_A');
  const agent = reactiveDodger();
  for (let i = 0; i < 18; i++) assert.deepEqual(agent.act(view, 1 / 120), {});
  const action = agent.act(view, 1 / 120);
  assert.ok(Math.abs(action.moveY) > 0.9);
  assert.ok(Math.abs(action.moveX) < 0.01);
});

test('dodger avoids a believed embedded recall line without world state', () => {
  const world = createWorld();
  world.players[0].position = { x: 0, y: 0 };
  world.players[1].position = { x: -2, y: 0 };
  world.spears[1].state = 'EMBEDDED';
  world.spears[1].position = { x: 2, y: 0 };
  const d = createReactiveDodger();
  const view = percept(world, 'P1', 'MODE_A');
  const move = d.movement(view);
  assert.equal(move.kind, 'POSSIBLE_RECALL');
  assert.ok(Math.abs(move.vector.y) > 0.9);
});

test('config overrides affect only named worlds and both sim and perception', () => {
  const faster = createWorld({ experiment: { PLAYER_SPEED: 5,
    RETURN_SPEED: 6 } });
  const regular = createWorld();
  const action = { moveX: 1, moveY: 0 };
  step(faster, [action, {}]); step(regular, [action, {}]);
  assert.ok(faster.players[0].position.x > regular.players[0].position.x);
  assert.equal(percept(faster, 'P1', 'MODE_B').cone.halfAngleRad, Math.PI / 3);
  assert.equal(percept(regular, 'P1', 'MODE_B').cone.halfAngleRad,
    CONSTANTS.experiment.FOV_HALF_ANGLE_RAD);
  assert.equal(CONSTANTS.experiment.RETURN_SPEED, 12);
  assert.throws(() => createWorld({ experiment: { UNKNOWN: 1 } }));
});

test('search controls are bounded and Wilson CI is finite at both extremes', () => {
  assert.equal(parseArgs(['--mode', 'both', '--workers', '8']).workers, 8);
  assert.throws(() => parseArgs(['--workers', '9']));
  assert.ok(wilson([0, 0, 0, 0]).hi > 0);
  assert.ok(wilson([1, 1, 1, 1]).lo < 1);
});

test('own spear belief uses condition-specific public recall speed', () => {
  const base = { time: { elapsedSec: 0 }, own: { position: { x: 6, y: 0 },
    facing: { x: -1, y: 0 }, spear: { state: 'RETURNING',
      position: { x: 0, y: 0 }, direction: { x: 1, y: 0 },
      recallTarget: { x: 6, y: 0 } } },
  arena: { bounds: { minX: -8, maxX: 8, minY: -5, maxY: 5 }, obstacles: [] } };
  const slow = createSpearMemory({ returnSpeed: 6 });
  const fast = createSpearMemory({ returnSpeed: 12 });
  slow.observe(base); fast.observe(base);
  const hidden = structuredClone(base);
  hidden.time.elapsedSec = 0.5; hidden.own.spear = null;
  assert.equal(slow.observe(hidden).position.x, 3);
  assert.equal(fast.observe(hidden).state, 'HELD');
});

test('held-out scheduler crosses every seed with every mode and seat independently', async () => {
  const { balancedTasks } = await import('../arena/search.mjs');
  const a = { name: 'candidate' }, b = { name: 'opponent' };
  for (const start of [430, 431]) {
    const tasks = balancedTasks(a, [b], start, 300, ['MODE_A', 'MODE_B'], 3);
    assert.equal(tasks.length, 12);
    for (const seed of [start, start + 1, start + 2]) {
      const rows = tasks.filter((r) => r.seed === seed);
      assert.deepEqual(new Set(rows.map((r) => `${r.mode}/${r.first.name}`)),
        new Set(['MODE_A/candidate', 'MODE_A/opponent', 'MODE_B/candidate', 'MODE_B/opponent']));
    }
  }
});

test('paired interval treats draws as half points and clusters by seed', async () => {
  const { pairedInterval } = await import('../arena/search.mjs');
  const rows = [1, 2, 3].flatMap((seed) => [0, 1].map((i) => ({ seed,
    first: { name: 'a' }, second: { name: 'b' }, score: { P1: i, P2: 0 } })));
  const ci = pairedInterval(rows, 'a', ['P1', 'P2']);
  assert.equal(ci.mean, 0.75); assert.equal(ci.clusters, 3); assert.equal(ci.n, 6);
  assert.equal(ci.lo, 0.75); assert.equal(ci.hi, 0.75);
});

test('search rejects nonfinite budgets and supports reproducible generation counts', () => {
  assert.throws(() => parseArgs(['--budget-min', 'NaN']));
  assert.throws(() => parseArgs(['--validation-seconds', 'Infinity']));
  assert.throws(() => parseArgs(['--generations', '-1']));
  assert.equal(parseArgs(['--generations', '3']).generations, 3);
});

test('held-out evaluation rejects invalid controls before spawning workers', async () => {
  const { evaluatePolicies } = await import('../arena/evaluate-policies.mjs');
  await assert.rejects(() => evaluatePolicies({ candidates: [], workers: 1 }), RangeError);
  await assert.rejects(() => evaluatePolicies({ candidates: [{ name: 'x' }], workers: 9 }), RangeError);
});

test('training excludes self-play and does not count a candidate reused as a rival', async () => {
  const { trainingTasks, assignedRows } = await import('../arena/search.mjs');
  const a = { name: 'seed-direct', vector: POLICY_SEEDS.direct };
  const rows = trainingTasks(a, [{ name: a.name }, { name: 'rival' }], 431, 20, 'MODE_B');
  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => row.first.name !== row.second.name));
  const unrelated = { candidateName: 'other', first: { name: 'other' }, second: { name: a.name } };
  assert.equal(assignedRows([...rows, unrelated], a.name).length, 2);
});

test('training compares candidates on the same crossed seeds, modes and seats', async () => {
  const { trainingTasks } = await import('../arena/search.mjs');
  const rivals = [{ name: 'rival' }], modes = ['MODE_A', 'MODE_B'];
  const a = trainingTasks({ name: 'a', vector: POLICY_SEEDS.direct }, rivals, 431, 20, modes);
  const b = trainingTasks({ name: 'b', vector: POLICY_SEEDS.anchor }, rivals, 431, 20, modes);
  const schedule = (rows) => rows.map((r) => [r.seed, r.mode, r.first.name === r.candidateName]);
  assert.equal(a.length, 4); assert.deepEqual(schedule(a), schedule(b));
});
