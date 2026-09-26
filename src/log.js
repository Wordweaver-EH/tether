import { CONSTANTS, createWorld, hashWorld, step } from './sim.js';
import { isVisible } from './perception.js';

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
    experiment_constants: clone(E), sim_rate: T.SIM_HZ,
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
  if (metadata.sim_rate !== T.SIM_HZ ||
      JSON.stringify(metadata.experiment_constants) !== JSON.stringify(E)) {
    throw new Error('log constants do not match this build');
  }
  const world = createWorld({ moveDeadzone: metadata.deadzones.move,
    aimDeadzone: metadata.deadzones.aim, epsilon: metadata.epsilon });
  let pending = {};
  let verifiedSamples = 0;
  for (const record of records.slice(1)) {
    if (record.mode !== metadata.mode) throw new Error('mixed modes in log');
    if (record.recordType === 'INPUT') {
      if (record.step !== world.tick + 1 || pending[record.player]) {
        throw new Error(`unexpected input at step ${record.step}`);
      }
      pending[record.player] = {
        moveX: record.raw_move_x, moveY: record.raw_move_y,
        aimX: record.raw_aim_x, aimY: record.raw_aim_y,
        throw: record.throw_pressed, recall: record.recall_pressed,
      };
      if (pending.P1 && pending.P2) {
        step(world, [pending.P1, pending.P2]);
        pending = {};
      }
    } else if (record.recordType === 'SAMPLE') {
      if (record.step !== world.tick || record.hash !== hashWorld(world)) {
        throw new Error(`world hash mismatch at step ${record.step}`);
      }
      verifiedSamples++;
    }
  }
  if (Object.keys(pending).length) throw new Error('incomplete input pair');
  return { world, verifiedSamples, finalHash: hashWorld(world) };
}
