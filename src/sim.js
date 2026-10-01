// Deterministic rules. This module has no rendering, experiment mode, or clock.
const freeze = (value) => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};

export const CONSTANTS = freeze({
  experiment: {
    PLAYER_RADIUS: 0.35,
    PLAYER_SPEED: 4,
    TURN_RATE_RAD: 2 * Math.PI,
    FOV_HALF_ANGLE_RAD: Math.PI / 3,
    OUTBOUND_SPEED: 12,
    RETURN_SPEED: 12,
    BOUT_SECONDS: 300,
    STATE_LOG_HZ: 20,
    ARENA: { minX: -8, maxX: 8, minY: -5, maxY: 5 },
    OBSTACLES: [
      { id: 'A', minX: -3, maxX: -1.5, minY: 0.25, maxY: 3.25 },
      { id: 'B', minX: 1.5, maxX: 3, minY: -3.25, maxY: -0.25 },
    ],
    STARTS: [
      { position: { x: -5.5, y: 0 }, facing: { x: 1, y: 0 } },
      { position: { x: 5.5, y: 0 }, facing: { x: -1, y: 0 } },
    ],
  },
  technical: {
    SIM_HZ: 120,
    MOVE_DEADZONE: 0.1,
    AIM_DEADZONE: 0.1,
    EPSILON: 1e-9,
    LOG_FORMAT: 'JSONL-v1',
  },
});

const E = CONSTANTS.experiment;
const T = CONSTANTS.technical;
const DT = 1 / T.SIM_HZ;
const vec = (x, y) => ({ x, y });
const copy = (p) => vec(p.x, p.y);
const dot = (a, b) => a.x * b.x + a.y * b.y;
const pointAt = (p, d, t) => vec(p.x + d.x * t, p.y + d.y * t);
const playerId = (i) => `P${i + 1}`;

function inputOf(raw) {
  const finite = (n) => Number.isFinite(n) ? n : 0;
  return {
    moveX: finite(raw?.moveX), moveY: finite(raw?.moveY),
    aimX: finite(raw?.aimX), aimY: finite(raw?.aimY),
    throw: raw?.throw === true, recall: raw?.recall === true,
  };
}

function unitInput(x, y, deadzone) {
  const length = Math.hypot(x, y);
  return length > deadzone ? vec(x / length, y / length) : null;
}

export function createWorld(config = {}) {
  const override = config.experiment ?? {};
  const allowed = ['PLAYER_SPEED', 'TURN_RATE_RAD',
    'OUTBOUND_SPEED', 'RETURN_SPEED'];
  if (Object.keys(override).some((key) => !allowed.includes(key)))
    throw new RangeError('unsupported experiment override');
  const experiment = { ...E, ...override };
  for (const key of allowed) {
    if (!Number.isFinite(experiment[key]) || experiment[key] <= 0)
      throw new RangeError(`invalid experiment override: ${key}`);
  }
  const technical = {
    moveDeadzone: config.moveDeadzone ?? T.MOVE_DEADZONE,
    aimDeadzone: config.aimDeadzone ?? T.AIM_DEADZONE,
    epsilon: config.epsilon ?? T.EPSILON,
  };
  for (const [name, value] of Object.entries(technical)) {
    if (!Number.isFinite(value) || value < 0 || (name === 'epsilon' && value === 0)) {
      throw new RangeError(`Invalid technical constant: ${name}`);
    }
  }
  const players = experiment.STARTS.map((start, i) => ({
    id: playerId(i), position: copy(start.position), velocity: vec(0, 0),
    facing: copy(start.facing), score: 0,
  }));
  const spears = players.map((player) => ({
    owner: player.id, state: 'HELD', position: copy(player.position),
    direction: copy(player.facing), embedSurfaceId: null, recallTarget: null,
  }));
  return { tick: 0, elapsedSec: 0, remainingSec: experiment.BOUT_SECONDS,
    ended: false, technical, experiment,
    experimentOverrides: Object.keys(override).length ? structuredClone(override) : null,
    players, spears };
}

// First entry into a closed axis-aligned box. The contact face names the box face.
function boxEntry(start, delta, box, epsilon) {
  let entry = -Infinity;
  let exit = Infinity;
  let face = null;
  let normal = null;
  for (const axis of ['x', 'y']) {
    const s = start[axis];
    const d = delta[axis];
    const lo = axis === 'x' ? box.minX : box.minY;
    const hi = axis === 'x' ? box.maxX : box.maxY;
    if (d === 0) {
      if (s < lo || s > hi) return null;
      continue;
    }
    const near = d > 0 ? (lo - s) / d : (hi - s) / d;
    const far = d > 0 ? (hi - s) / d : (lo - s) / d;
    if (entry === -Infinity || near > entry +
        16 * Number.EPSILON * Math.max(1, Math.abs(entry))) {
      entry = near;
      face = axis === 'x' ? (d > 0 ? 'W' : 'E') : (d > 0 ? 'S' : 'N');
      normal = axis === 'x' ? vec(d > 0 ? -1 : 1, 0) : vec(0, d > 0 ? -1 : 1);
    }
    exit = Math.min(exit, far);
  }
  if (entry > exit + epsilon || entry < -epsilon || entry > 1 + epsilon ||
      dot(delta, normal) >= 0) return null;
  return { t: Math.max(0, Math.min(1, entry)), face, normal };
}

function earliest(best, candidate, epsilon) {
  if (!candidate) return best;
  if (!best || candidate.t < best.t - epsilon ||
      (Math.abs(candidate.t - best.t) <= epsilon && candidate.surface < best.surface)) {
    return candidate;
  }
  return best;
}

function staticContact(start, delta, radius, epsilon, E) {
  let best = null;
  const arena = E.ARENA;
  if (radius === 0) {
    // A point spawned on or inside geometry has already made contact.
    for (const [inside, surface, normal] of [
      [start.x <= arena.minX, 'WALL_W', vec(1, 0)],
      [start.x >= arena.maxX, 'WALL_E', vec(-1, 0)],
      [start.y <= arena.minY, 'WALL_S', vec(0, 1)],
      [start.y >= arena.maxY, 'WALL_N', vec(0, -1)],
    ]) if (inside) best = earliest(best, { t: 0, surface, normal }, epsilon);
    for (const obstacle of E.OBSTACLES) {
      if (start.x < obstacle.minX || start.x > obstacle.maxX ||
          start.y < obstacle.minY || start.y > obstacle.maxY) continue;
      const faces = [
        [start.x - obstacle.minX, 'W', vec(-1, 0)],
        [obstacle.maxX - start.x, 'E', vec(1, 0)],
        [start.y - obstacle.minY, 'S', vec(0, -1)],
        [obstacle.maxY - start.y, 'N', vec(0, 1)],
      ];
      faces.sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]));
      best = earliest(best, { t: 0, surface: `${obstacle.id}_${faces[0][1]}`,
        normal: faces[0][2] }, epsilon);
    }
    if (best) return best;
  }
  const bounds = [
    [delta.x < 0, 'WALL_W', (arena.minX + radius - start.x) / delta.x, vec(1, 0)],
    [delta.x > 0, 'WALL_E', (arena.maxX - radius - start.x) / delta.x, vec(-1, 0)],
    [delta.y < 0, 'WALL_S', (arena.minY + radius - start.y) / delta.y, vec(0, 1)],
    [delta.y > 0, 'WALL_N', (arena.maxY - radius - start.y) / delta.y, vec(0, -1)],
  ];
  for (const [active, surface, t, normal] of bounds) {
    if (active && t >= -epsilon && t <= 1 + epsilon) {
      best = earliest(best, { t: Math.max(0, Math.min(1, t)), surface, normal }, epsilon);
    }
  }
  for (const obstacle of E.OBSTACLES) {
    const expanded = {
      minX: obstacle.minX - radius, maxX: obstacle.maxX + radius,
      minY: obstacle.minY - radius, maxY: obstacle.maxY + radius,
    };
    const hit = boxEntry(start, delta, expanded, epsilon);
    if (hit) best = earliest(best, { ...hit, surface: `${obstacle.id}_${hit.face}` }, epsilon);
  }
  return best;
}

function moveWithSlide(position, delta, epsilon, E) {
  let pos = copy(position);
  let remaining = copy(delta);
  for (let i = 0; i < 4; i++) {
    if (Math.abs(remaining.x) + Math.abs(remaining.y) <= epsilon) break;
    const hit = staticContact(pos, remaining, E.PLAYER_RADIUS, epsilon, E);
    if (!hit) { pos = pointAt(pos, remaining, 1); break; }
    pos = pointAt(pos, remaining, hit.t);
    remaining = vec(remaining.x * (1 - hit.t), remaining.y * (1 - hit.t));
    const inward = dot(remaining, hit.normal);
    if (inward < 0) {
      remaining.x -= inward * hit.normal.x;
      remaining.y -= inward * hit.normal.y;
    }
  }
  // Remove roundoff accumulated by long shallow slides on expanded faces.
  pos.x = Math.max(E.ARENA.minX + E.PLAYER_RADIUS,
    Math.min(E.ARENA.maxX - E.PLAYER_RADIUS, pos.x));
  pos.y = Math.max(E.ARENA.minY + E.PLAYER_RADIUS,
    Math.min(E.ARENA.maxY - E.PLAYER_RADIUS, pos.y));
  for (const box of E.OBSTACLES) {
    const minX = box.minX - E.PLAYER_RADIUS;
    const maxX = box.maxX + E.PLAYER_RADIUS;
    const minY = box.minY - E.PLAYER_RADIUS;
    const maxY = box.maxY + E.PLAYER_RADIUS;
    if (pos.x <= minX || pos.x >= maxX || pos.y <= minY || pos.y >= maxY) continue;
    const faces = [[pos.x - minX, 'x', minX], [maxX - pos.x, 'x', maxX],
      [pos.y - minY, 'y', minY], [maxY - pos.y, 'y', maxY]];
    faces.sort((a, b) => a[0] - b[0]);
    pos[faces[0][1]] = faces[0][2];
  }
  return pos;
}

function circleTOI(start, delta, centre, radius, epsilon) {
  const ox = start.x - centre.x;
  const oy = start.y - centre.y;
  const c = ox * ox + oy * oy - radius * radius;
  if (c <= 0) return 0;
  const a = dot(delta, delta);
  if (a <= epsilon * epsilon) return null;
  const b = 2 * (ox * delta.x + oy * delta.y);
  const discriminant = b * b - 4 * a * c;
  const roundoff = 16 * Number.EPSILON * Math.max(1, b * b, 4 * a * Math.abs(c));
  if (discriminant < -roundoff) return null;
  const t = (-b - Math.sqrt(Math.max(0, discriminant))) / (2 * a);
  return t >= -epsilon && t <= 1 + epsilon ? Math.max(0, Math.min(1, t)) : null;
}

function setHeld(spear, owner) {
  spear.state = 'HELD';
  spear.position = copy(owner.position);
  spear.direction = copy(owner.facing);
  spear.embedSurfaceId = null;
  spear.recallTarget = null;
}

function resetAfterHit(world) {
  const E = world.experiment ?? CONSTANTS.experiment;
  for (let i = 0; i < 2; i++) {
    const player = world.players[i];
    const start = E.STARTS[i];
    player.position = copy(start.position);
    player.velocity = vec(0, 0);
    player.facing = copy(start.facing);
    setHeld(world.spears[i], player);
  }
}

export function step(world, inputs) {
  if (world.ended) return [];
  if (!Array.isArray(inputs) || inputs.length !== 2) throw new TypeError('inputs must be [p1, p2]');
  const actions = inputs.map(inputOf);
  const E = world.experiment ?? CONSTANTS.experiment;
  const events = [];
  const epsilon = world.technical.epsilon;
  const previous = world.players.map((p) => copy(p.position));

  // 1-2. Read inputs and rotate facing at a bounded angular speed.
  for (let i = 0; i < 2; i++) {
    const player = world.players[i];
    const aim = unitInput(actions[i].aimX, actions[i].aimY, world.technical.aimDeadzone);
    if (!aim) continue;
    const cross = player.facing.x * aim.y - player.facing.y * aim.x;
    // Normalize signed zero: a 180-degree tie always turns counterclockwise.
    const angle = Math.atan2(cross === 0 ? 0 : cross, dot(player.facing, aim));
    const limit = E.TURN_RATE_RAD * DT;
    const turn = Math.max(-limit, Math.min(limit, angle));
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    player.facing = vec(player.facing.x * cos - player.facing.y * sin,
      player.facing.x * sin + player.facing.y * cos);
    const length = Math.hypot(player.facing.x, player.facing.y);
    player.facing.x /= length;
    player.facing.y /= length;
  }

  // 3. A recall removes the embedded spear before this step's neutralization.
  for (let i = 0; i < 2; i++) {
    const player = world.players[i];
    const spear = world.spears[i];
    const action = actions[i];
    if (spear.state === 'HELD' && action.throw) {
      const origin = vec(player.position.x + player.facing.x * E.PLAYER_RADIUS,
        player.position.y + player.facing.y * E.PLAYER_RADIUS);
      spear.state = 'OUTBOUND';
      spear.position = origin;
      spear.direction = copy(player.facing);
      events.push({ type: 'THROW', player: player.id, origin: copy(origin), facing: copy(player.facing) });
    } else if (spear.state === 'EMBEDDED' && action.recall) {
      const start = copy(spear.position);
      const target = copy(player.position);
      const distance = Math.hypot(target.x - start.x, target.y - start.y);
      events.push({ type: 'RECALL_START', owner: player.id, spear_start: start,
        recall_target: copy(target), opponent_pos: copy(world.players[1 - i].position),
        owner_facing: copy(player.facing) });
      if (distance === 0) {
        setHeld(spear, player);
        events.push({ type: 'RECALL_COMPLETE', owner: player.id,
          fixed_target: target, owner_current: copy(player.position) });
      } else {
        spear.state = 'RETURNING';
        spear.recallTarget = target;
        spear.embedSurfaceId = null;
        spear.direction = vec((target.x - start.x) / distance, (target.y - start.y) / distance);
      }
    }
  }

  // 4. Move bodies. Each body's velocity is the requested velocity, even at a wall.
  for (let i = 0; i < 2; i++) {
    const player = world.players[i];
    const move = unitInput(actions[i].moveX, actions[i].moveY, world.technical.moveDeadzone);
    player.velocity = move ? vec(move.x * E.PLAYER_SPEED, move.y * E.PLAYER_SPEED) : vec(0, 0);
    player.position = moveWithSlide(player.position,
      vec(player.velocity.x * DT, player.velocity.y * DT), epsilon, E);
  }

  // 5. Neutralization uses the previous-to-current centre sweep.
  for (let i = 0; i < 2; i++) {
    const spear = world.spears[i];
    if (spear.state !== 'EMBEDDED') continue;
    const enemyIndex = 1 - i;
    const enemy = world.players[enemyIndex];
    const displacement = vec(enemy.position.x - previous[enemyIndex].x,
      enemy.position.y - previous[enemyIndex].y);
    if (circleTOI(previous[enemyIndex], displacement, spear.position,
      E.PLAYER_RADIUS, epsilon) === null) continue;
    events.push({ type: 'SPEAR_NEUTRALIZED', spear_owner: playerId(i),
      neutralizer: enemy.id, embedded_pos: copy(spear.position),
      neutralizer_pos: copy(enemy.position), owner_pos: copy(world.players[i].position) });
    setHeld(spear, world.players[i]);
  }

  // 6-7. Resolve both spears before scoring, so simultaneous hits both count.
  const hits = [];
  for (let i = 0; i < 2; i++) {
    const spear = world.spears[i];
    const owner = world.players[i];
    if (spear.state === 'HELD') { setHeld(spear, owner); continue; }
    if (spear.state === 'EMBEDDED') continue;
    const phase = spear.state;
    const start = copy(spear.position);
    let travel = phase === 'OUTBOUND' ? E.OUTBOUND_SPEED * DT : E.RETURN_SPEED * DT;
    let completesReturn = false;
    if (phase === 'RETURNING') {
      const target = spear.recallTarget;
      const distance = Math.hypot(target.x - start.x, target.y - start.y);
      if (distance <= travel + epsilon) { travel = distance; completesReturn = true; }
    }
    const delta = vec(spear.direction.x * travel, spear.direction.y * travel);
    const victim = world.players[1 - i];
    const playerT = circleTOI(start, delta, victim.position, E.PLAYER_RADIUS, epsilon);
    const staticHit = phase === 'OUTBOUND' ? staticContact(start, delta, 0, epsilon, E) : null;
    if (playerT !== null && (!staticHit || playerT <= staticHit.t + epsilon)) {
      const hitPos = pointAt(start, delta, playerT);
      spear.position = hitPos;
      hits.push({ attackerIndex: i, event: { type: 'HIT', attacker: owner.id,
        victim: victim.id, phase, hit_pos: copy(hitPos),
        attacker_pos: copy(owner.position), victim_pos: copy(victim.position) } });
    } else if (staticHit) {
      spear.position = pointAt(start, delta, staticHit.t);
      spear.state = 'EMBEDDED';
      spear.embedSurfaceId = staticHit.surface;
      spear.recallTarget = null;
      events.push({ type: 'EMBED', owner: owner.id, position: copy(spear.position),
        surface: staticHit.surface });
    } else if (completesReturn) {
      const fixedTarget = copy(spear.recallTarget);
      setHeld(spear, owner);
      events.push({ type: 'RECALL_COMPLETE', owner: owner.id,
        fixed_target: fixedTarget,
        owner_current: copy(owner.position) });
    } else {
      spear.position = pointAt(start, delta, 1);
    }
  }

  // 8-9. Apply all point awards and do a single reset.
  for (const hit of hits) {
    world.players[hit.attackerIndex].score++;
    events.push(hit.event);
  }
  if (hits.length) {
    events.push({ type: 'RESET', reason: 'SPEAR_HIT',
      scores: { P1: world.players[0].score, P2: world.players[1].score } });
    resetAfterHit(world);
  }
  world.tick++;
  world.elapsedSec = world.tick * DT;
  world.remainingSec = Math.max(0, E.BOUT_SECONDS - world.elapsedSec);
  world.ended = world.tick >= E.BOUT_SECONDS * T.SIM_HZ;
  return events;
}

// Hash an explicit scalar sequence, independent of object insertion order.
export function hashWorld(world) {
  const state = [world.tick, world.elapsedSec, world.remainingSec, world.ended,
    ...(world.experimentOverrides ? [world.experimentOverrides] : []),
    world.technical.moveDeadzone, world.technical.aimDeadzone, world.technical.epsilon,
    ...world.players.flatMap((p) => [p.id, p.position.x, p.position.y,
      p.velocity.x, p.velocity.y, p.facing.x, p.facing.y, p.score]),
    ...world.spears.flatMap((s) => [s.owner, s.state, s.position.x, s.position.y,
      s.direction.x, s.direction.y, s.embedSurfaceId,
      s.recallTarget?.x ?? null, s.recallTarget?.y ?? null])];
  const json = JSON.stringify(state);
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < json.length; i++) {
    hash ^= BigInt(json.charCodeAt(i));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, '0');
}

// Snapshots are independent values. They include technical constants and every
// mutable rule field, so a restored world can be stepped or hashed immediately.
export function snapshotWorld(world) {
  return structuredClone(world);
}

export function restoreWorld(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.players) || snapshot.players.length !== 2 ||
      !Array.isArray(snapshot.spears) || snapshot.spears.length !== 2 ||
      !Number.isInteger(snapshot.tick) || !snapshot.technical) {
    throw new TypeError('invalid world snapshot');
  }
  return structuredClone(snapshot);
}
