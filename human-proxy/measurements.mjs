import { CONSTANTS } from '../src/sim.js';

/** Evaluator-only truth logger. Never pass this module's output to a controller.
 *
 * const m = createMeasurements({ episodeId, boutId, counterPlayer: 'P1' },
 *   { bounds: CONSTANTS.experiment.ARENA, obstacles: CONSTANTS.experiment.OBSTACLES });
 * const pre = m.beforeStep(world); // immediately before EVERY simulation step
 * const events = step(world, inputs);
 * m.afterStep(pre, events, world);
 * const { summary, raw } = m.finish(world);
 *
 * Event tick numbers are zero-based pre-step indices. Launches/recalls occur at
 * that step's start. HIT impactFraction is reconstructed from the simulator's
 * straight spear sweep; impactTimeSec is (impactTick + impactFraction)/120.
 * Bodies in HIT geometry have already moved for that step, as in frozen sim.js.
 *
 * Pre-step multiples of four label the following four ticks. Occupancy is thus
 * explicitly approximate, even across a reset, and clips at measured termination.
 * Corner episodes begin/end at sample boundaries, except HIT/RESET exits use
 * that event step's end. Open episodes are right-censored at finish; they are
 * never counted as movement exits. Summary/raw accessors do not finalize state.
 */
const HZ = CONSTANTS.technical.SIM_HZ;
const SAMPLE_TICKS = 4;
const DIRECTIONS = 32;
const TAU = 2 * Math.PI;
const ANGLE_STEP = TAU / DIRECTIONS;
const EPS = 1e-9;
const PRESSURE_DISTANCE = 5.25;
const PROXIMITY_CLEARANCE = 1;
const PLAYERS = ['P1', 'P2'];
const PHASES = ['OUTBOUND', 'RETURNING'];
const UNIT_DIRECTIONS = Object.freeze(Array.from({ length: DIRECTIONS }, (_, i) =>
  Object.freeze({ x: Math.cos(i * ANGLE_STEP), y: Math.sin(i * ANGLE_STEP) })));
const clone = (x) => structuredClone(x);
const point = (p) => {
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y))
    throw new TypeError('measurement position must have finite x and y');
  return { x: p.x, y: p.y };
};
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const other = (owner) => owner === 'P1' ? 'P2' : 'P1';
const invariant = (ok, message) => {
  if (!ok) throw new Error(`Measurement invariant failed: ${message}`);
};
const freeze = (object) => {
  if (object && typeof object === 'object' && !Object.isFrozen(object)) {
    Object.values(object).forEach(freeze);
    Object.freeze(object);
  }
  return object;
};
const rectangle = (box) => {
  if (!box || !['minX', 'maxX', 'minY', 'maxY'].every((k) => Number.isFinite(box[k])) ||
      box.minX >= box.maxX || box.minY >= box.maxY)
    throw new TypeError('measurement geometry requires a valid rectangle');
  return { ...(box.id === undefined ? {} : { id: box.id }), minX: box.minX,
    maxX: box.maxX, minY: box.minY, maxY: box.maxY };
};
function normalizeGeometry(input = CONSTANTS.experiment) {
  const g = input.experiment ?? input;
  const bounds = rectangle(g.bounds ?? g.arena ?? g.ARENA ?? g);
  const obstacles = (g.obstacles ?? g.OBSTACLES ?? []).map(rectangle);
  const playerRadius = g.playerRadius ?? g.PLAYER_RADIUS ?? CONSTANTS.experiment.PLAYER_RADIUS;
  if (!Number.isFinite(playerRadius) || playerRadius <= 0 ||
      bounds.maxX - bounds.minX <= 2 * playerRadius || bounds.maxY - bounds.minY <= 2 * playerRadius)
    throw new TypeError('measurement geometry requires a valid player radius');
  return freeze({ bounds, obstacles, playerRadius });
}

// Segment intersects the open interior of an expanded rectangle. Contact-only
// endpoints and tangential/away motion on a face are legal; penetration is not.
function segmentEntersBox(start, end, box) {
  let lo = 0, hi = 1;
  for (const axis of ['x', 'y']) {
    const a = axis === 'x' ? box.minX : box.minY;
    const b = axis === 'x' ? box.maxX : box.maxY;
    const s = start[axis], d = end[axis] - s;
    if (Math.abs(d) <= EPS) {
      if (s <= a + EPS || s >= b - EPS) return false;
      continue;
    }
    const t1 = (a + EPS - s) / d, t2 = (b - EPS - s) / d;
    lo = Math.max(lo, Math.min(t1, t2));
    hi = Math.min(hi, Math.max(t1, t2));
    if (lo >= hi) return false;
  }
  return lo < hi && hi > 0 && lo < 1;
}
function freeSegment(start, end, g) {
  const r = g.playerRadius, b = g.bounds;
  for (const p of [start, end]) {
    if (p.x < b.minX + r - EPS || p.x > b.maxX - r + EPS ||
        p.y < b.minY + r - EPS || p.y > b.maxY - r + EPS) return false;
  }
  return !g.obstacles.some((b) => segmentEntersBox(start, end, {
    minX: b.minX - r, maxX: b.maxX + r, minY: b.minY - r, maxY: b.maxY + r,
  }));
}
function pointBoxDistance(p, box) {
  return Math.hypot(Math.max(box.minX - p.x, 0, p.x - box.maxX),
    Math.max(box.minY - p.y, 0, p.y - box.maxY));
}
function longestArc(free) {
  if (free.every(Boolean)) return TAU;
  let longest = 0, run = 0;
  for (let i = 0; i < 2 * DIRECTIONS; i++) {
    run = free[i % DIRECTIONS] ? run + 1 : 0;
    longest = Math.max(longest, Math.min(run, DIRECTIONS));
  }
  // Angular span between sampled headings, not count * sector width.
  return Math.max(0, longest - 1) * ANGLE_STEP;
}
function evaluateCorner(position, opponent, g) {
  const p = point(position), o = point(opponent), d = distance(p, o);
  const bearing = d > EPS ? { x: (o.x - p.x) / d, y: (o.y - p.y) / d } : null;
  const free = UNIT_DIRECTIONS.map((v) => freeSegment(p, { x: p.x + v.x, y: p.y + v.y }, g));
  const retreat = UNIT_DIRECTIONS.map((v) => bearing !== null &&
    v.x * bearing.x + v.y * bearing.y <= -0.5 + EPS);
  const freeCount = free.filter(Boolean).length;
  const retreatCount = retreat.filter(Boolean).length;
  const freeRetreatCount = free.filter((value, i) => value && retreat[i]).length;
  const largestFreeArc = longestArc(free);
  const retreatBlocked = retreatCount > 0 && freeRetreatCount === 0;
  const b = g.bounds, r = g.playerRadius;
  const wallCenterDistance = Math.min(p.x - b.minX, b.maxX - p.x, p.y - b.minY, b.maxY - p.y);
  const obstacleCenterDistance = g.obstacles.length ?
    Math.min(...g.obstacles.map((box) => pointBoxDistance(p, box))) : null;
  const wallClearance = wallCenterDistance - r;
  const obstacleClearance = obstacleCenterDistance === null ? null : obstacleCenterDistance - r;
  return {
    opponentDistance: d, directionCount: DIRECTIONS, freeDirectionCount: freeCount,
    freeDirectionFraction: freeCount / DIRECTIONS,
    retreatDirectionCount: retreatCount, freeRetreatDirectionCount: freeRetreatCount,
    freeRetreatFraction: retreatCount ? freeRetreatCount / retreatCount : null,
    largestFreeArc, retreatBlocked,
    pressuredCornered: retreatBlocked && d <= PRESSURE_DISTANCE + EPS && largestFreeArc <= Math.PI + EPS,
    freeDirections: free, retreatDirections: retreat,
    freeDirectionMask: free.map(Number).join(''), retreatDirectionMask: retreat.map(Number).join(''),
    wallCenterDistance, wallClearance, nearWall: wallClearance <= PROXIMITY_CLEARANCE + EPS,
    obstacleCenterDistance, obstacleClearance,
    nearObstacle: obstacleClearance !== null && obstacleClearance <= PROXIMITY_CLEARANCE + EPS,
    opponentCoincident: bearing === null,
  };
}

/** Static one-unit straight-displacement audit, not a pathwise escape proof.
 * Geometry accepts {bounds,obstacles,playerRadius?}, frozen experiment constants,
 * or a bounds rectangle (with no obstacles). Directions start at +x, CCW.
 * No body-body obstruction exists in the frozen simulator. Expanded obstacle
 * rectangles follow its collision geometry; proximity uses surface clearance.
 */
export function cornerGeometry(position, opponent, arena = CONSTANTS.experiment) {
  return evaluateCorner(position, opponent, normalizeGeometry(arena));
}

const quantile = (sorted, p) => {
  if (!sorted.length) return null;
  const i = (sorted.length - 1) * p, low = Math.floor(i), high = Math.ceil(i);
  return sorted[low] + (sorted[high] - sorted[low]) * (i - low);
};
/** Linear-interpolation quantiles; distance bins are lower-inclusive. */
export function distribution(values, withDistanceBins = true) {
  invariant(values.every(Number.isFinite), 'non-finite distribution observation');
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25), q3 = quantile(sorted, 0.75);
  const out = { count: sorted.length, median: quantile(sorted, 0.5), q1, q3,
    iqr: q1 === null ? null : q3 - q1, p10: quantile(sorted, 0.1), p90: quantile(sorted, 0.9),
    min: sorted.length ? sorted[0] : null, max: sorted.length ? sorted.at(-1) : null };
  if (withDistanceBins) {
    out.bins = { '<2': 0, '2–4': 0, '4–5.25': 0, '>=5.25': 0 };
    for (const value of sorted) out.bins[value < 2 ? '<2' : value < 4 ? '2–4' :
      value < 5.25 ? '4–5.25' : '>=5.25']++;
  }
  return out;
}

/** Pool only compatible physical HIT rows. Empty phase groups remain explicit. */
export function summarizeHits(hitRows) {
  for (const hit of hitRows) invariant(PHASES.includes(hit.phase), `unknown HIT phase ${hit.phase}`);
  const summarize = (rows) => ({ count: rows.length,
    ...Object.fromEntries(['launchCenterDistance', 'impactCenterDistance',
      'launchOriginToDefenderDistance', 'launchOriginToImpactDistance', 'projectileAgeSec']
      .map((field) => [field, distribution(rows.map((r) => r[field]), field !== 'projectileAgeSec')])) });
  return { all: summarize(hitRows), OUTBOUND: summarize(hitRows.filter((h) => h.phase === 'OUTBOUND')),
    RETURNING: summarize(hitRows.filter((h) => h.phase === 'RETURNING')) };
}

function counterPlayerOf(episode) {
  if (!episode || typeof episode !== 'object') return null;
  const value = episode.counterPlayer ?? episode.counterSeat;
  if (PLAYERS.includes(value)) return value;
  if (value === 0 || value === 1) return PLAYERS[value];
  return null;
}
function episodeNamespace(episode) {
  if (episode && typeof episode === 'object') {
    if (episode.boutId !== undefined) return String(episode.boutId);
    const id = episode.episodeId ?? episode.id;
    if (id === undefined) throw new TypeError('episode metadata needs boutId, episodeId, or id');
    return `${id}${counterPlayerOf(episode) ? `/counter-${counterPlayerOf(episode)}` : ''}`;
  }
  if (episode === undefined || episode === null) throw new TypeError('episode ID is required');
  return String(episode);
}
function worldSnapshot(world) {
  invariant(Number.isInteger(world?.tick) && world.tick >= 0, 'world tick must be a nonnegative integer');
  invariant(world.players?.length === 2 && world.spears?.length === 2, 'two players and spears required');
  const players = Object.fromEntries(world.players.map((p) => [p.id,
    { id: p.id, position: point(p.position), score: p.score }]));
  invariant(PLAYERS.every((id) => players[id] && Number.isInteger(players[id].score)), 'invalid player IDs/scores');
  const spears = Object.fromEntries(world.spears.map((s) => [s.owner,
    { owner: s.owner, state: s.state, position: point(s.position),
      recallTarget: s.recallTarget ? point(s.recallTarget) : null }]));
  invariant(PLAYERS.every((id) => spears[id]), 'invalid spear owners');
  const e = world.experiment ?? CONSTANTS.experiment;
  return { tick: world.tick, elapsedSec: world.elapsedSec, ended: Boolean(world.ended), players, spears,
    outboundSpeed: e.OUTBOUND_SPEED, returnSpeed: e.RETURN_SPEED };
}
function compactCorner(corner) {
  const { freeDirections, retreatDirections, ...compact } = corner;
  return compact;
}

export function createMeasurements(episode, arena = CONSTANTS.experiment) {
  const geometry = normalizeGeometry(arena), metadata = clone(episode), namespace = episodeNamespace(episode);
  const counterPlayer = counterPlayerOf(episode);
  const data = { episode: metadata, events: [], throws: [], hits: [], samples: [], cornerEpisodes: [], auditStates: [] };
  const activeThrows = new Map(), sequence = { P1: 0, P2: 0 };
  const activeCorners = { P1: null, P2: null }, auditKeys = new Set();
  let initial = null, latest = null, pending = null, currentSample = null, finished = null;

  function audit(key, tick, owner, position, opponent, corner, extra = {}) {
    const id = `${owner}/${key}`;
    if (auditKeys.has(id)) return;
    auditKeys.add(id);
    data.auditStates.push({ category: key, tick, owner, position: point(position), opponent: point(opponent),
      geometry: clone(geometry), corner: clone(corner), ...clone(extra) });
  }
  function closeCorner(owner, endTick, exit) {
    const active = activeCorners[owner];
    if (!active) return;
    data.cornerEpisodes.push({ ...active, endTick, durationSec: (endTick - active.startTick) / HZ,
      exit, rightCensored: exit === 'termination' });
    activeCorners[owner] = null;
  }
  function sampleWorld(pre) {
    const row = { tick: pre.tick, representedTicks: 0, representedSec: 0, players: {} };
    for (const owner of PLAYERS) {
      const position = pre.players[owner].position, opponent = pre.players[other(owner)].position;
      const c = evaluateCorner(position, opponent, geometry);
      row.players[owner] = { position: point(position), opponent: point(opponent), ...compactCorner(c) };
      if (c.pressuredCornered && !activeCorners[owner]) activeCorners[owner] = { owner, startTick: pre.tick,
        startPosition: point(position), startOpponent: point(opponent) };
      if (!c.pressuredCornered) closeCorner(owner, pre.tick, 'movement');
      if (c.pressuredCornered) audit('pressuredCornered', pre.tick, owner, position, opponent, c);
      if (c.retreatBlocked && !c.pressuredCornered) audit('retreatBlockedUnpressured', pre.tick, owner, position, opponent, c);
      if (c.nearWall && !c.pressuredCornered) audit('nearWallNotCornered', pre.tick, owner, position, opponent, c);
      if (c.nearObstacle && !c.pressuredCornered) audit('nearObstacleNotCornered', pre.tick, owner, position, opponent, c);
      if (c.freeDirectionCount === DIRECTIONS) audit('open', pre.tick, owner, position, opponent, c);
    }
    data.samples.push(row);
    currentSample = row;
  }
  function beforeStep(world) {
    invariant(!finished, 'cannot step finished measurement');
    invariant(!pending, 'beforeStep called twice without afterStep');
    const pre = worldSnapshot(world);
    invariant(!pre.ended, 'cannot measure a step on an ended world');
    if (!initial) {
      invariant(pre.tick % SAMPLE_TICKS === 0, 'first measured tick must be a multiple of four');
      invariant(PLAYERS.every((id) => pre.spears[id].state === 'HELD'), 'measurement must start before actual THROW lineage');
      initial = clone(pre);
      latest = clone(pre);
    }
    invariant(pre.tick === latest.tick, 'missing or repeated simulation step');
    invariant(PLAYERS.every((id) => pre.players[id].score === latest.players[id].score), 'scores changed between measured steps');
    if (pre.tick % SAMPLE_TICKS === 0) sampleWorld(pre);
    pending = freeze(pre);
    return pending;
  }
  function requireLineage(owner, eventType) {
    invariant(PLAYERS.includes(owner), `${eventType} has unknown owner ${owner}`);
    const row = activeThrows.get(owner);
    invariant(row, `${eventType} for ${owner} has no actual THROW lineage`);
    return row;
  }
  function terminateThrow(owner, tick, type) {
    const row = requireLineage(owner, type);
    row.termination = { type, tick, timeSec: (tick + 1) / HZ };
    activeThrows.delete(owner);
  }
  function hitFraction(pre, event, launch, recall) {
    let start = pre.spears[event.attacker].position;
    if (launch.launchTick === pre.tick) start = launch.launchOrigin;
    if (recall?.tick === pre.tick) start = recall.spearStart;
    const speed = event.phase === 'OUTBOUND' ? pre.outboundSpeed : pre.returnSpeed;
    const fraction = distance(start, event.hit_pos) / (speed / HZ);
    invariant(Number.isFinite(fraction) && fraction >= -EPS && fraction <= 1 + EPS,
      'HIT point lies outside the measured projectile step');
    return Math.max(0, Math.min(1, fraction));
  }
  function afterStep(pre, events, world) {
    invariant(pre === pending && pending !== null, 'afterStep needs its exact pending beforeStep snapshot');
    invariant(Array.isArray(events), 'events must be an array');
    const post = worldSnapshot(world);
    invariant(post.tick === pre.tick + 1, 'step must advance exactly one 120-Hz tick');
    const stepHits = { P1: 0, P2: 0 };
    for (const event of events) {
      data.events.push({ tick: pre.tick, event: clone(event) });
      switch (event.type) {
        case 'THROW': {
          const owner = event.player;
          invariant(PLAYERS.includes(owner), `THROW has unknown owner ${owner}`);
          invariant(!activeThrows.has(owner), `THROW overlaps active lineage for ${owner}`);
          invariant(pre.spears[owner].state === 'HELD', 'actual THROW did not start HELD');
          const attacker = pre.players[owner].position, defender = pre.players[other(owner)].position;
          const origin = point(event.origin);
          const row = { throwId: `${namespace}/${owner}/${++sequence[owner]}`, episode: clone(metadata),
            owner, attacker: owner, victim: other(owner), sequence: sequence[owner], launchTick: pre.tick,
            launchTimeSec: pre.tick / HZ, launchAttackerPosition: point(attacker), launchDefenderPosition: point(defender),
            launchOrigin: origin, launchFacing: point(event.facing), launchCenterDistance: distance(attacker, defender),
            launchOriginToDefenderDistance: distance(origin, defender), phase: 'OUTBOUND', embeds: [], recalls: [], termination: null };
          data.throws.push(row); activeThrows.set(owner, row);
          break;
        }
        case 'EMBED': {
          const row = requireLineage(event.owner, event.type);
          invariant(row.phase === 'OUTBOUND', 'EMBED outside OUTBOUND phase');
          row.phase = 'EMBEDDED'; row.embeds.push({ tick: pre.tick, position: point(event.position), surface: event.surface });
          break;
        }
        case 'RECALL_START': {
          const row = requireLineage(event.owner, event.type);
          invariant(row.phase === 'EMBEDDED', 'RECALL_START outside EMBEDDED phase');
          row.phase = 'RETURNING';
          row.recalls.push({ tick: pre.tick, timeSec: pre.tick / HZ, spearStart: point(event.spear_start),
            ownerPosition: point(event.recall_target), opponentPosition: point(event.opponent_pos),
            ownerFacing: point(event.owner_facing), centerDistance: distance(event.recall_target, event.opponent_pos),
            originToDefenderDistance: distance(event.spear_start, event.opponent_pos) });
          break;
        }
        case 'RECALL_COMPLETE':
          invariant(requireLineage(event.owner, event.type).phase === 'RETURNING', 'RECALL_COMPLETE outside RETURNING phase');
          terminateThrow(event.owner, pre.tick, 'RECALL_COMPLETE');
          break;
        case 'SPEAR_NEUTRALIZED':
          invariant(requireLineage(event.spear_owner, event.type).phase === 'EMBEDDED', 'neutralization outside EMBEDDED phase');
          terminateThrow(event.spear_owner, pre.tick, 'SPEAR_NEUTRALIZED');
          break;
        case 'HIT': {
          const row = requireLineage(event.attacker, event.type);
          invariant(PHASES.includes(event.phase) && row.phase === event.phase, 'HIT phase mismatches THROW lineage');
          invariant(event.victim === other(event.attacker), 'HIT victim does not match opponent');
          const recall = row.recalls.at(-1) ?? null;
          invariant(event.phase !== 'RETURNING' || recall, 'RETURNING HIT has no RECALL_START lineage');
          const impactFraction = hitFraction(pre, event, row, recall);
          const attackerPosition = point(event.attacker_pos), defenderPosition = point(event.victim_pos), hitPosition = point(event.hit_pos);
          const attackerCornering = evaluateCorner(attackerPosition, defenderPosition, geometry);
          const victimCornering = evaluateCorner(defenderPosition, attackerPosition, geometry);
          const hit = { throwId: row.throwId, attacker: event.attacker, victim: event.victim, phase: event.phase,
            launchTick: row.launchTick, impactTick: pre.tick, impactFraction, launchTimeSec: row.launchTimeSec,
            impactTimeSec: (pre.tick + impactFraction) / HZ,
            projectileAgeSec: (pre.tick - row.launchTick + impactFraction) / HZ,
            launchAttackerPosition: point(row.launchAttackerPosition), launchDefenderPosition: point(row.launchDefenderPosition),
            launchOrigin: point(row.launchOrigin), launchCenterDistance: row.launchCenterDistance,
            launchOriginToDefenderDistance: row.launchOriginToDefenderDistance,
            impactAttackerPosition: attackerPosition, impactDefenderPosition: defenderPosition, impactPosition: hitPosition,
            impactCenterDistance: distance(attackerPosition, defenderPosition),
            launchOriginToImpactDisplacement: { x: hitPosition.x - row.launchOrigin.x, y: hitPosition.y - row.launchOrigin.y },
            launchOriginToImpactDistance: distance(row.launchOrigin, hitPosition), recall: clone(recall),
            attackerCornering: compactCorner(attackerCornering), victimCornering: compactCorner(victimCornering) };
          data.hits.push(hit); stepHits[event.attacker]++;
          audit(`HIT_delivered_${event.phase}`, pre.tick, event.attacker, attackerPosition, defenderPosition,
            attackerCornering, { throwId: row.throwId, event: clone(event) });
          audit(`HIT_received_${event.phase}`, pre.tick, event.victim, defenderPosition, attackerPosition,
            victimCornering, { throwId: row.throwId, event: clone(event) });
          terminateThrow(event.attacker, pre.tick, 'HIT');
          break;
        }
        case 'RESET':
          for (const owner of PLAYERS) {
            if (activeThrows.has(owner)) terminateThrow(owner, pre.tick, 'RESET');
            closeCorner(owner, post.tick, 'hitReset');
            if (event.scores) invariant(event.scores[owner] === post.players[owner].score, 'RESET score mismatch');
          }
          break;
        default: throw new Error(`Measurement invariant failed: unknown simulator event ${event.type}`);
      }
    }
    for (const owner of PLAYERS) {
      invariant(post.players[owner].score - pre.players[owner].score === stepHits[owner], `HIT/score mismatch for ${owner}`);
      invariant((activeThrows.get(owner)?.phase ?? 'HELD') === post.spears[owner].state,
        `unrecorded spear state transition for ${owner}`);
    }
    invariant(!(stepHits.P1 + stepHits.P2) || events.some((e) => e.type === 'RESET'), 'HIT step lacks RESET');
    currentSample.representedTicks++;
    currentSample.representedSec = currentSample.representedTicks / HZ;
    invariant(currentSample.representedTicks <= SAMPLE_TICKS, 'occupancy sample exceeded four ticks');
    latest = post; pending = null;
  }
  function episodesAtEnd() {
    return [...data.cornerEpisodes, ...PLAYERS.flatMap((owner) => activeCorners[owner] && latest ? [{
      ...clone(activeCorners[owner]), endTick: latest.tick,
      durationSec: (latest.tick - activeCorners[owner].startTick) / HZ,
      exit: 'termination', rightCensored: true,
    }] : [])];
  }
  function raw() {
    return clone({ ...data, cornerEpisodes: episodesAtEnd(), activeThrowIds: [...activeThrows.values()].map((r) => r.throwId) });
  }
  function ownerSummary(owner, durationSec, episodes) {
    const hits = data.hits.filter((h) => h.attacker === owner), received = data.hits.filter((h) => h.victim === owner);
    const throws = data.throws.filter((t) => t.owner === owner), rows = data.samples;
    const ticks = latest && initial ? latest.tick - initial.tick : 0;
    const weighted = (fn) => rows.reduce((sum, r) => sum + r.representedTicks * fn(r.players[owner]), 0);
    const fraction = (fn) => ticks ? weighted(fn) / ticks : null;
    const definedRetreatTicks = weighted((p) => p.freeRetreatFraction === null ? 0 : 1);
    const ownerEpisodes = episodes.filter((e) => e.owner === owner);
    const qualifying = ownerEpisodes.filter((e) => e.durationSec >= 0.5 - EPS);
    const exits = (es) => Object.fromEntries(['movement', 'hitReset', 'termination'].map((type) =>
      [type, es.filter((e) => e.exit === type).length]));
    const mins = durationSec / 60;
    return { throws: throws.length, hits: hits.length, hitsReceived: received.length,
      hitsByPhase: Object.fromEntries(PHASES.map((phase) => [phase, hits.filter((h) => h.phase === phase).length])),
      grossHitsPerMinute: mins ? hits.length / mins : null,
      netHitsPerMinute: mins ? (hits.length - received.length) / mins : null,
      outcome: hits.length > received.length ? 'win' : hits.length < received.length ? 'loss' : 'tie',
      throwDistances: { launchCenterDistance: distribution(throws.map((t) => t.launchCenterDistance)),
        launchOriginToDefenderDistance: distribution(throws.map((t) => t.launchOriginToDefenderDistance)) },
      hitDistances: summarizeHits(hits),
      distanceOccupancy: { approximate: true, '<4': fraction((p) => p.opponentDistance < 4),
        '4–5.25': fraction((p) => p.opponentDistance >= 4 && p.opponentDistance < 5.25),
        '>=5.25': fraction((p) => p.opponentDistance >= 5.25) },
      cornering: { approximate: true, representedTicks: ticks, representedSec: ticks / HZ, samples: rows.length,
        pressuredCorneredTimeFraction: fraction((p) => p.pressuredCornered),
        retreatBlockedTimeFraction: fraction((p) => p.retreatBlocked),
        meanFreeDirectionFraction: fraction((p) => p.freeDirectionFraction),
        meanFreeRetreatFraction: definedRetreatTicks ? weighted((p) => p.freeRetreatFraction ?? 0) / definedRetreatTicks : null,
        retreatBearingDefinedTimeFraction: ticks ? definedRetreatTicks / ticks : null,
        episodes: ownerEpisodes.length, episodesAtLeastHalfSecond: qualifying.length,
        exits: exits(ownerEpisodes), qualifyingExits: exits(qualifying),
        hitsDeliveredWhilePressuredCornered: hits.filter((h) => h.attackerCornering.pressuredCornered).length,
        hitsReceivedWhilePressuredCornered: received.filter((h) => h.victimCornering.pressuredCornered).length,
        nearWallTimeFraction: fraction((p) => p.nearWall), nearObstacleTimeFraction: fraction((p) => p.nearObstacle),
        meanWallClearance: fraction((p) => p.wallClearance),
        meanObstacleClearance: geometry.obstacles.length ? fraction((p) => p.obstacleClearance) : null },
    };
  }
  function summary() {
    invariant(!pending, 'cannot summarize an unfinished simulation step');
    const elapsedSec = latest && initial ? (latest.tick - initial.tick) / HZ : 0;
    const episodes = episodesAtEnd();
    const byOwner = Object.fromEntries(PLAYERS.map((id) => [id, ownerSummary(id, elapsedSec, episodes)]));
    const finalScores = Object.fromEntries(PLAYERS.map((id) => [id, latest?.players[id].score ?? 0]));
    const initialScores = Object.fromEntries(PLAYERS.map((id) => [id, initial?.players[id].score ?? 0]));
    for (const id of PLAYERS) invariant(finalScores[id] - initialScores[id] === byOwner[id].hits, `final HIT/score mismatch for ${id}`);
    const sampleTicks = data.samples.reduce((sum, s) => sum + s.representedTicks, 0);
    invariant(sampleTicks === (latest && initial ? latest.tick - initial.tick : 0), 'occupancy exposure does not match elapsed ticks');
    return { schema: 'human-proxy-measurements-v1', episode: clone(metadata),
      startTick: initial?.tick ?? null, endTick: latest?.tick ?? null, elapsedSec, elapsedMinutes: elapsedSec / 60,
      initialScores, finalScores, byOwner,
      roles: counterPlayer ? { counter: counterPlayer, ordinary: other(counterPlayer) } : null,
      checks: { valid: true, hitScoreReconciled: true, missingThrowLineage: 0, representedTicks: sampleTicks,
        actualThrows: data.throws.length, physicalHits: data.hits.length },
      conventions: { simulationHz: HZ, sampleEveryTicks: SAMPLE_TICKS, occupancyApproximate: true,
        occupancy: 'Pre-step tick multiples of four represent following four ticks, clipped at termination; resets do not resample',
        cornerEpisodeExit: 'Movement at sampled transition; HIT/RESET at event-step end; termination is right-censored',
        freeArc: 'Span between contiguous free sampled headings: (run-1)*2*pi/32; all directions free gives 2*pi',
        segmentContact: 'Boundary contact is allowed if the full straight displacement never penetrates expanded geometry',
        proximityClearance: PROXIMITY_CLEARANCE, pressureDistance: PRESSURE_DISTANCE,
        eventTicks: 'Zero-based pre-step indices; HIT time uses within-step spear sweep fraction',
        projectileAge: 'Time since original actual THROW, including embedded waiting and recall',
        distanceBins: '<2, [2,4), [4,5.25), >=5.25; launch and impact center distances are distinct',
        quantiles: 'Linear interpolation at (n-1)*p' } };
  }
  function finish(world) {
    if (finished) return clone(finished);
    invariant(!pending, 'cannot finish an unfinished simulation step');
    if (world) {
      const final = worldSnapshot(world);
      invariant(latest && final.tick === latest.tick, 'finish world was not fully measured');
      invariant(PLAYERS.every((id) => final.players[id].score === latest.players[id].score), 'finish score mismatch');
    }
    finished = { summary: summary(), raw: raw() };
    return clone(finished);
  }
  return { beforeStep, afterStep, summary, raw, finish };
}
