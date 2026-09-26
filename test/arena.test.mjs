import test from 'node:test';
import assert from 'node:assert/strict';
import { runGameBout, replayGameLog } from '../arena/core.mjs';
import { summarize } from '../arena/tournament.mjs';
import { compareRuns } from '../arena/compare.mjs';
import * as adapter from '../arena/tether-adapter.mjs';
import { STRATEGIES } from '../src/agents/strategies.mjs';
import { createWorld } from '../src/sim.js';
import { percept } from '../src/perception.js';
import { runBout } from '../src/headless.mjs';
import { embedWaiter } from '../src/agents/strategies.mjs';

test('generic codegame runner and replay need only a game module and adapter', () => {
  const game = {
    CONSTANTS: { hz: 10 },
    createWorld: () => ({ tick: 0, value: 0 }),
    step(world, inputs) { world.tick++; world.value += inputs[0].moveX; return []; },
    percept(world, id) { return { id, tick: world.tick }; },
    hashWorld: (world) => `${world.tick}:${world.value}`,
  };
  const toyAdapter = {
    playerIds: ['one', 'two'], simHz: () => 10, boutSeconds: () => 2,
    ended: (w) => w.tick >= 20, score: (w) => ({ one: w.value, two: 0 }),
    elapsed: (w) => w.tick / 10,
  };
  const agents = [{ act: () => ({ moveX: 1 }), trace: () => [{ focus: 'go' }] },
    { act: () => ({ moveX: 0 }) }];
  const result = runGameBout({ game, adapter: toyAdapter, agents,
    mode: 'any', log: true, captureTraces: true });
  assert.equal(result.score.one, 20);
  assert.equal(result.traces.one[0].focus, 'go');
  assert.equal(replayGameLog(game, toyAdapter, result.log).verified, 20);
  const corrupted = structuredClone(result.log);
  corrupted.find((r) => r.type === 'hash').hash = 'bad';
  assert.throws(() => replayGameLog(game, toyAdapter, corrupted), /hash mismatch/);
});

test('Tether arena replay starts from a world snapshot', () => {
  const result = runGameBout({ game: adapter.game, adapter,
    agents: [{ act: () => ({}) }, { act: () => ({}) }],
    mode: 'MODE_B', durationSec: 0.1, log: true });
  assert.ok(result.log[0].initialSnapshot);
  assert.equal(replayGameLog(adapter.game, adapter, result.log).verified, 2);
});

test('generic runner passes the seed into a game and replays it without snapshots', () => {
  const game = {
    CONSTANTS: {}, createWorld: ({ seed }) => ({ tick: 0, score: seed }),
    step(world) { world.tick++; return []; },
    percept: (world) => ({ tick: world.tick }),
    hashWorld: (world) => `${world.tick}/${world.score}`,
  };
  const hooks = { playerIds: ['a', 'b'], simHz: () => 10,
    boutSeconds: () => 1, ended: (world) => world.tick === 10,
    score: (world) => ({ a: world.score, b: 0 }),
    elapsed: (world) => world.tick / 10 };
  const agents = [{ act: () => ({}) }, { act: () => ({}) }];
  const result = runGameBout({ game, adapter: hooks, agents, mode: 'X',
    seed: 19, log: true });
  assert.equal(result.score.a, 19);
  assert.equal(replayGameLog(game, hooks, result.log).score.a, 19);
});

test('scripted families receive only percepts and cannot distinguish hidden worlds', () => {
  const a = createWorld(), b = createWorld();
  for (const w of [a, b]) w.players[0].facing = { x: 1, y: 0 };
  a.players[1].position = { x: -7, y: 1 };
  b.players[1].position = { x: -7, y: -1 };
  a.spears[1].position = { ...a.players[1].position };
  b.spears[1].position = { ...b.players[1].position };
  const va = percept(a, 'P1', 'MODE_B'), vb = percept(b, 'P1', 'MODE_B');
  assert.deepEqual(va, vb);
  for (const [name, factory] of Object.entries(STRATEGIES)) {
    const first = factory(), second = factory();
    for (let i = 0; i < 5; i++)
      assert.deepEqual(first.act(va, 1 / 120), second.act(vb, 1 / 120), name);
  }
});

test('embedWaiter deliberately embeds on geometry before any direct hit', () => {
  const result = runBout({ agents: [embedWaiter(), { act: () => ({}) }],
    durationSec: 1, mode: 'MODE_B' });
  const tactical = result.events.filter((e) => e.type === 'EMBED' || e.type === 'HIT');
  assert.equal(tactical[0].type, 'EMBED');
  assert.equal(tactical[0].surface, 'WALL_N');
  assert.equal(result.score.P1, 0);
});

test('strategy controls match their declared perception-only behavior', () => {
  const visible = percept(createWorld(), 'P1', 'MODE_A');
  const hidden = structuredClone(visible);
  hidden.opponent = null; hidden.opponentSpear = null;
  assert.equal(STRATEGIES.camper().act(hidden, 1 / 120).throw, false);
  assert.equal(STRATEGIES.directShooter().act(hidden, 1 / 120).throw, false);
  assert.equal(STRATEGIES.directShooter().act(visible, 1 / 120).throw, true);
  const embedded = structuredClone(visible);
  embedded.own.spear.state = 'EMBEDDED';
  assert.equal(STRATEGIES.immediateRecaller().act(embedded, 1 / 120).recall, true);
  const scan = STRATEGIES.spinner();
  const first = scan.act(hidden, 0.25);
  const second = scan.act(hidden, 0.25);
  assert.ok(Math.abs(first.aimX - second.aimX) > 0.9);
  const rushing = STRATEGIES.spearRusher();
  const observed = structuredClone(visible);
  observed.opponentSpear = { state: 'EMBEDDED', position: { x: 0, y: 4 },
    direction: { x: 0, y: 1 } };
  rushing.act(observed, 1 / 120);
  hidden.own.facing = { x: -1, y: 0 };
  const remembered = rushing.act(hidden, 1 / 120);
  assert.ok(remembered.moveY > 0);
});

test('Tether metrics count delayed positional embeds and physical look-away', () => {
  const world = createWorld();
  const state = adapter.startMetrics();
  const dt = 1 / 120;
  adapter.observeStep(state, { world, events: [{ type: 'EMBED', owner: 'P1' }], dt });
  for (let i = 0; i < 360; i++) {
    world.players[0].position.x += 0.01;
    adapter.observeStep(state, { world, events: [], dt });
  }
  adapter.observeStep(state, { world, events: [{ type: 'RECALL_START', owner: 'P1' }], dt });
  const m = adapter.finishMetrics(state);
  assert.equal(m.embedCounts[0], 1);
  assert.equal(m.secondLocation[0], 1);
  assert.ok(m.embedToRecallDelays[0][0] > 2);
});

test('a scoring reset does not count as positional play or a scan reversal', () => {
  const world = createWorld();
  const state = adapter.startMetrics();
  const dt = 1 / 120;
  adapter.observeStep(state, { world, events: [{ type: 'EMBED', owner: 'P1' }], dt });
  for (let i = 0; i < 360; i++)
    adapter.observeStep(state, { world, events: [], dt });
  const before = state.reversals[0];
  const attacker = { ...world.players[1].position };
  const victim = { ...world.players[0].position };
  world.players[0].position = { x: 5.5, y: 0 };
  world.players[0].facing = { x: -1, y: 0 };
  adapter.observeStep(state, { world, dt, events: [
    { type: 'HIT', attacker: 'P2', victim: 'P1',
      attacker_pos: attacker, victim_pos: victim },
    { type: 'RESET' },
  ] });
  const m = adapter.finishMetrics(state);
  assert.equal(m.secondLocation[0], 0);
  assert.equal(m.scanReversals[0], before);
});

test('neutralizations are credited to the neutralizer', () => {
  const world = createWorld();
  const state = adapter.startMetrics();
  adapter.observeStep(state, { world, dt: 1 / 120,
    events: [{ type: 'EMBED', owner: 'P1' }] });
  adapter.observeStep(state, { world, dt: 1 / 120,
    events: [{ type: 'SPEAR_NEUTRALIZED', spear_owner: 'P1', neutralizer: 'P2' }] });
  assert.deepEqual(adapter.finishMetrics(state).neutralizations, [0, 1]);
});

test('summary reports paired outcomes and behavior distributions', () => {
  const variants = [{ name: 'a' }, { name: 'b' }];
  const result = { first: 0, second: 1, mode: 'MODE_A',
    score: { P1: 2, P2: 1 }, elapsedSec: 300,
    metrics: { embedCounts: [1, 0], secondLocation: [1, 0],
      neutralizations: [0, 1], lookAwaySec: [3, 4], scanReversals: [2, 3],
      hitsWithinOneSecLookAway: [0, 1], embedToRecallDelays: [[3], []] } };
  const summary = summarize([result], variants, { durationSec: 300 }, adapter);
  assert.equal(summary.variants.a.secondLocationFraction, 1);
  assert.equal(summary.variants.a.embedToRecallDelaySec.median, 3);
  assert.equal(summary.pairs['a vs b MODE_A'].winRate.mean, 1);
  assert.ok(summary.pairs['a vs b MODE_A'].winRate.lo < 1);
});

test('generic tournament summaries require no Tether metric fields', () => {
  const result = { first: 0, second: 1, mode: 'FOG',
    score: { red: 2, blue: 1 }, elapsedSec: 3, metrics: null };
  const summary = summarize([result], [{ name: 'fast' }, { name: 'slow' }],
    { durationSec: 3 }, { playerIds: ['red', 'blue'], modes: ['FOG'] });
  assert.equal(summary.pairsCombined['fast vs slow'].winRate.mean, 1);
  assert.deepEqual(summary.byMode, {});
});

test('paired comparison matches seeds and seats across policy runs', () => {
  const variants = [{ name: 'mind' }, { name: 'script' }];
  const before = { variants, results: [
    { first: 0, second: 1, mode: 'X', seed: 1, score: { a: 0, b: 1 } },
    { first: 1, second: 0, mode: 'X', seed: 2, score: { a: 1, b: 0 } },
  ] };
  const after = { variants, results: [
    { first: 0, second: 1, mode: 'X', seed: 1, score: { a: 2, b: 1 } },
    { first: 1, second: 0, mode: 'X', seed: 2, score: { a: 0, b: 1 } },
  ] };
  const paired = compareRuns(before, after, 'mind', ['a', 'b']);
  assert.equal(paired.script.before, 0);
  assert.equal(paired.script.after, 1);
  assert.equal(paired.script.delta, 1);
  assert.equal(paired['script X'].n, 2);
});
