import { CONSTANTS, createWorld, hashWorld, step } from './sim.js';
import { isVisible } from './perception.js';
import { MATH_VERSION } from './deterministic-math.js';

// Records are JSON values. Compare all keys recursively, independent of order.
function isDeepStrictEqual(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' ||
      Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) =>
    Object.hasOwn(b, key) && isDeepStrictEqual(a[key], b[key]));
}

const E = CONSTANTS.experiment;
const T = CONSTANTS.technical;
const clone = (value) => JSON.parse(JSON.stringify(value));
const copy = (point) => ({ x: point.x, y: point.y });

function visibility(world, index, mode) {
  const own = world.players[index];
  const enemy = world.players[1 - index];
  const ownSpear = world.spears[index];
  const enemySpear = world.spears[1 - index];
  const opponentVisible = mode === 'MODE_A' ||
    isVisible(own.position, own.facing, enemy.position);
  return {
    opponent_visible: opponentVisible,
    own_nonheld_spear_visible: ownSpear.state !== 'HELD' &&
      (mode === 'MODE_A' || isVisible(own.position, own.facing, ownSpear.position)),
    enemy_nonheld_spear_visible: enemySpear.state !== 'HELD' &&
      (mode === 'MODE_A' || isVisible(own.position, own.facing, enemySpear.position)),
  };
}

function sample(world, mode) {
  const players = {};
  const spears = {};
  for (let i = 0; i < 2; i++) {
    const p = world.players[i];
    const s = world.spears[i];
    players[p.id] = {
      position: copy(p.position), velocity: copy(p.velocity),
      facing: copy(p.facing), score: p.score,
    };
    spears[s.owner] = {
      state: s.state, position: copy(s.position), direction: copy(s.direction),
      embed_surface_id: s.embedSurfaceId,
      recall_target: s.recallTarget ? copy(s.recallTarget) : null,
    };
  }
  return {
    recordType: 'SAMPLE', mode, step: world.tick,
    timestamp: world.elapsedSec, bout_elapsed_time: world.elapsedSec,
    players, spears,
    visibility_from_P1: visibility(world, 0, mode),
    visibility_from_P2: visibility(world, 1, mode),
    hash: hashWorld(world),
  };
}

function trackedEntities(world, viewerIndex) {
  const own = world.players[viewerIndex];
  const enemy = world.players[1 - viewerIndex];
  const ownSpear = world.spears[viewerIndex];
  const enemySpear = world.spears[1 - viewerIndex];
  const opponentVisible = isVisible(own.position, own.facing, enemy.position);
  return [
    { entity_id: enemy.id, entity_type: 'PLAYER', entity_pos: copy(enemy.position),
      visible: opponentVisible },
    { entity_id: `${own.id}_SPEAR`, entity_type: 'SPEAR',
      entity_pos: copy(ownSpear.position), visible: ownSpear.state === 'HELD' ||
        isVisible(own.position, own.facing, ownSpear.position) },
    { entity_id: `${enemy.id}_SPEAR`, entity_type: 'SPEAR',
      entity_pos: copy(enemySpear.position), visible: enemySpear.state === 'HELD'
        ? opponentVisible : isVisible(own.position, own.facing, enemySpear.position) },
  ];
}

function loggedInput(raw, player, tick, mode) {
  const finite = (n) => Number.isFinite(n) ? n : 0;
  return {
    recordType: 'INPUT', mode, step: tick,
    timestamp: (tick - 1) / T.SIM_HZ, player,
    raw_move_x: finite(raw?.moveX), raw_move_y: finite(raw?.moveY),
    raw_aim_x: finite(raw?.aimX), raw_aim_y: finite(raw?.aimY),
    throw_pressed: raw?.throw === true, recall_pressed: raw?.recall === true,
  };
}

export function createSessionLogger({ world, mode, sessionId = 'session-1',
  boutId = 'bout-1', timestampStart = new Date().toISOString(),
  renderRate = null, buildId = 'phase2', seed = null } = {}) {
  if (!world) throw new TypeError('world is required');
  if (mode !== 'MODE_A' && mode !== 'MODE_B') throw new RangeError('invalid mode');
  if (world.tick !== 0) throw new RangeError('logger must start at step 0');
  const records = [{
    recordType: 'METADATA', mode, session_id: sessionId, bout_id: boutId,
    timestamp_start: timestampStart, experiment_mode: mode,
    experiment_constants: clone(world.experiment ?? E), simulation_math: MATH_VERSION, sim_rate: T.SIM_HZ,
    render_rate: renderRate,
    deadzones: { move: world.technical.moveDeadzone, aim: world.technical.aimDeadzone },
    epsilon: world.technical.epsilon, log_format: T.LOG_FORMAT,
    build_id: buildId, seed,
  }, sample(world, mode)];
  const previous = mode === 'MODE_B'
    ? [0, 1].map((index) => new Map(trackedEntities(world, index)
      .map((entity) => [entity.entity_id, entity.visible]))) : null;
  let recordedTick = 0;

  function recordStep(currentWorld, inputs, events) {
    if (currentWorld !== world || currentWorld.tick !== recordedTick + 1) {
      throw new RangeError('recordStep requires the next step of the original world');
    }
    const tick = currentWorld.tick;
    records.push(loggedInput(inputs[0], 'P1', tick, mode));
    records.push(loggedInput(inputs[1], 'P2', tick, mode));
    for (const event of events) {
      records.push({ recordType: 'EVENT', mode, step: tick,
        timestamp: currentWorld.elapsedSec, ...clone(event) });
    }
    if (mode === 'MODE_B') {
      for (let index = 0; index < 2; index++) {
        for (const entity of trackedEntities(currentWorld, index)) {
          const before = previous[index].get(entity.entity_id);
          if (before !== entity.visible) {
            records.push({ recordType: 'EVENT', mode, step: tick,
              timestamp: currentWorld.elapsedSec,
              type: entity.visible ? 'VISIBILITY_ENTER' : 'VISIBILITY_EXIT',
              viewer: currentWorld.players[index].id,
              entity_id: entity.entity_id, entity_type: entity.entity_type,
              entity_pos: entity.entity_pos,
              viewer_facing: copy(currentWorld.players[index].facing) });
          }
          previous[index].set(entity.entity_id, entity.visible);
        }
      }
    }
    if (tick % (T.SIM_HZ / E.STATE_LOG_HZ) === 0) records.push(sample(currentWorld, mode));
    recordedTick = tick;
  }

  return { records, recordStep, toJSONL: () => serializeLog(records),
    lines: () => records.map((record) => JSON.stringify(record)) };
}

export function serializeLog(records) {
  return `${records.map((record) => JSON.stringify(record)).join('\n')}\n`;
}

export function replayFromLog(lines) {
  const source = typeof lines === 'string' ? lines.split(/\r?\n/) : lines;
  if (!Array.isArray(source)) throw new TypeError('lines must be JSONL text or an array');
  const records = source.filter((line) => line !== '').map((line) =>
    typeof line === 'string' ? JSON.parse(line) : line);
  const metadata = records[0];
  if (metadata?.recordType !== 'METADATA') throw new Error('missing metadata');
  if (metadata.simulation_math !== MATH_VERSION)
    throw new Error(`log math version ${metadata.simulation_math ?? 'legacy-native (unversioned)'} does not match ${MATH_VERSION}; replay legacy logs with their original source build and producing runtime`);
  if (metadata.sim_rate !== T.SIM_HZ) throw new Error('log constants do not match this build');
  const overrides = {};
  for (const key of ['PLAYER_SPEED', 'TURN_RATE_RAD', 'OUTBOUND_SPEED', 'RETURN_SPEED']) {
    if (metadata.experiment_constants?.[key] !== E[key]) overrides[key] = metadata.experiment_constants?.[key];
  }
  if (!isDeepStrictEqual(metadata.experiment_constants, { ...E, ...overrides }))
    throw new Error('log constants do not match this build');
  const world = createWorld({ experiment: overrides, moveDeadzone: metadata.deadzones.move,
    aimDeadzone: metadata.deadzones.aim, epsilon: metadata.epsilon });
  const logger = createSessionLogger({ world, mode: metadata.mode });
  const actual = records.slice(1).filter((record) => record.recordType !== 'MIND_TRACE');
  let pending = {};
  for (const record of actual) {
    if (record.mode !== metadata.mode) throw new Error('mixed modes in log');
    if (record.recordType === 'INPUT') {
      if (record.step !== world.tick + 1 || !['P1', 'P2'].includes(record.player) ||
          pending[record.player]) {
        throw new Error(`unexpected input at step ${record.step}`);
      }
      pending[record.player] = {
        moveX: record.raw_move_x, moveY: record.raw_move_y,
        aimX: record.raw_aim_x, aimY: record.raw_aim_y,
        throw: record.throw_pressed, recall: record.recall_pressed,
      };
      if (pending.P1 && pending.P2) {
        const inputs = [pending.P1, pending.P2];
        const events = step(world, inputs);
        logger.recordStep(world, inputs, events);
        pending = {};
      }
    }
  }
  if (Object.keys(pending).length) throw new Error('incomplete input pair');
  const expected = logger.records.slice(1);
  if (actual.length !== expected.length) throw new Error('log record count mismatch');
  let verifiedSamples = 0;
  for (let index = 0; index < actual.length; index++) {
    const record = actual[index];
    const generated = expected[index];
    if (record.recordType === 'SAMPLE' && record.hash !== generated.hash)
      throw new Error(`world hash mismatch at step ${record.step}`);
    if (!isDeepStrictEqual(record, clone(generated)))
      throw new Error(`log ${record.recordType} mismatch at step ${record.step}`);
    if (record.recordType === 'SAMPLE') verifiedSamples++;
  }
  return { world, verifiedSamples, finalHash: hashWorld(world) };
}
