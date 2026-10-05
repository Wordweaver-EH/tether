// Standalone synthetic prototype. No imports, simulator, controller, I/O or RNG.
// Every enemy-state statement is about a past visible observation or a hypothesis.
const freeze = x => { for (const v of Object.values(x)) if (v && typeof v === 'object') freeze(v); return Object.freeze(x); };
export const SETTINGS = freeze({
  version: 1, mode: 'MODE_B', simulationHz: 120, decisionTicks: 4,
  latencyTicks: 30, latencySec: .25, decisionSec: 1 / 30,
  sourceMemorySec: .8, playerSpeed: 4, spearSpeed: 12, bodyRadius: .35,
  resetStarts: { P1: { x: -5.5, y: 0 }, P2: { x: 5.5, y: 0 } },
});
const EPS = 1e-10;
const finite = n => typeof n === 'number' && Number.isFinite(n);
const vec = (x, y) => ({ x: x === 0 ? 0 : x, y: y === 0 ? 0 : y });
const add = (a, b) => vec(a.x + b.x, a.y + b.y);
const sub = (a, b) => vec(a.x - b.x, a.y - b.y);
const mul = (a, n) => vec(a.x * n, a.y * n);
const dot = (a, b) => a.x * b.x + a.y * b.y;
const norm = a => Math.hypot(a.x, a.y);
const unit = a => mul(a, 1 / norm(a));
const clone = x => structuredClone(x);

function point(p, name, nonzero = false) {
  if (!p || !finite(p.x) || !finite(p.y)) throw new TypeError(`${name}: finite vector required`);
  const out = vec(p.x, p.y);
  if (nonzero && norm(out) <= EPS) throw new TypeError(`${name}: nonzero vector required`);
  return out;
}
function box(b) {
  if (!b || ![b.minX, b.maxX, b.minY, b.maxY].every(finite) || b.minX >= b.maxX || b.minY >= b.maxY)
    throw new TypeError('finite ordered geometry required');
  return { minX: b.minX, maxX: b.maxX, minY: b.minY, maxY: b.maxY };
}
function sourceTick(time) {
  if (!finite(time) || time < 0) throw new TypeError('nonnegative source time required');
  const tick = Math.round(time * SETTINGS.simulationHz);
  if (!Number.isSafeInteger(tick) || Math.abs(time * SETTINGS.simulationHz - tick) > 1e-7)
    throw new RangeError('source time must be on 120-Hz grid');
  return tick;
}

// Deliberate property-by-property copy. Do not enumerate or clone the raw input:
// unused properties (including opponent body and extra hidden metadata) are unread.
export function copyAllowedPacket(raw) {
  if (!raw || raw.mode !== SETTINGS.mode) throw new RangeError('MODE_B required');
  if (!['P1', 'P2'].includes(raw.viewerId)) throw new RangeError('known viewer required');
  const tick = sourceTick(raw.time?.elapsedSec);
  if (typeof raw.time.ended !== 'boolean') throw new TypeError('ended flag required');
  const scores = { P1: raw.scores?.P1, P2: raw.scores?.P2 };
  if (!Object.values(scores).every(x => Number.isSafeInteger(x) && x >= 0)) throw new TypeError('nonnegative scores required');
  const own = { position: point(raw.own?.position, 'own.position'), facing: point(raw.own?.facing, 'own.facing', true) };
  if (!Array.isArray(raw.arena?.obstacles)) throw new TypeError('public obstacles required');
  const arena = { bounds: box(raw.arena.bounds), obstacles: raw.arena.obstacles.map(box) };
  const visible = raw.opponentSpear;
  let opponentSpear = null;
  if (visible !== null) {
    if (!visible || !['HELD', 'OUTBOUND', 'EMBEDDED', 'RETURNING'].includes(visible.state)) throw new RangeError('valid visible spear state required');
    opponentSpear = { state: visible.state, position: point(visible.position, 'visible spear position'), direction: point(visible.direction, 'visible spear direction', true) };
  }
  return { viewerId: raw.viewerId, mode: SETTINGS.mode, own, scores,
    time: { elapsedSec: tick / SETTINGS.simulationHz, ended: raw.time.ended }, arena, opponentSpear };
}

// Closed expanded boxes are conservative for a disc. Touching an obstacle at the
// start is not certified. Public bounds are inset; only straight segments count.
export function staticClearance(p, d, travel, arena, radius) {
  const b = arena.bounds;
  if (p.x < b.minX + radius || p.x > b.maxX - radius || p.y < b.minY + radius || p.y > b.maxY - radius) return 0;
  let limit = travel;
  for (const axis of ['x', 'y']) {
    const lo = b[axis === 'x' ? 'minX' : 'minY'] + radius;
    const hi = b[axis === 'x' ? 'maxX' : 'maxY'] - radius;
    if (d[axis] > EPS) limit = Math.min(limit, (hi - p[axis]) / d[axis]);
    else if (d[axis] < -EPS) limit = Math.min(limit, (lo - p[axis]) / d[axis]);
  }
  for (const obstacle of arena.obstacles) {
    let enter = -Infinity, exit = Infinity;
    for (const axis of ['x', 'y']) {
      const lo = obstacle[axis === 'x' ? 'minX' : 'minY'] - radius;
      const hi = obstacle[axis === 'x' ? 'maxX' : 'maxY'] + radius;
      if (Math.abs(d[axis]) <= EPS) {
        if (p[axis] < lo || p[axis] > hi) { enter = Infinity; exit = -Infinity; break; }
      } else {
        const a = (lo - p[axis]) / d[axis], z = (hi - p[axis]) / d[axis];
        enter = Math.max(enter, Math.min(a, z)); exit = Math.min(exit, Math.max(a, z));
      }
    }
    if (enter <= exit && exit >= 0) limit = Math.min(limit, Math.max(0, enter));
  }
  return Math.max(0, limit);
}

function landmark(seen, age, arena) {
  if (seen.state === 'EMBEDDED') return {
    position: { ...seen.position }, meaning: 'last-seen-embedded-landmark',
    condition: 'The spear may have recalled, completed, been neutralized, or reset since it was seen.',
  };
  const direction = unit(seen.direction), requested = SETTINGS.spearSpeed * age;
  const travel = seen.state === 'OUTBOUND' ? staticClearance(seen.position, direction, requested, arena, 0) : requested;
  return { position: add(seen.position, mul(direction, travel)),
    meaning: seen.state === 'OUTBOUND' ? 'outbound-no-unseen-transition-hypothesis' : 'observed-return-direction-continuation-hypothesis',
    condition: seen.state === 'OUTBOUND'
      ? 'Continuation ignores any unseen recall, hit, neutralization or reset; only public terrain stops this hypothetical branch.'
      : 'Continuation ignores the unknown return endpoint, completion, hit and reset; it is not a current-position estimate.',
  };
}

export function createAwareness() {
  let viewer = null, previousTick = null, previousScore = null, seen = null, issuedMove = vec(0, 0);
  function clear() { seen = null; issuedMove = vec(0, 0); }
  return {
    commitMovement(movement) { const m = point(movement, 'issued movement'); issuedMove = norm(m) > EPS ? unit(m) : vec(0, 0); },
    observe(raw, receiptTime) {
      const p = copyAllowedPacket(raw), tick = sourceTick(p.time.elapsedSec);
      if (tick % SETTINGS.decisionTicks !== 0) throw new RangeError('source is not on decision grid');
      if (!finite(receiptTime) || Math.abs(receiptTime - p.time.elapsedSec - SETTINGS.latencySec) > EPS) throw new RangeError('exactly 250-ms delayed receipt required');
      if (viewer !== null && viewer !== p.viewerId) throw new RangeError('viewer cannot change');
      if (previousTick !== null && tick <= previousTick) throw new RangeError('source time must increase');
      const score = `${p.scores.P1}:${p.scores.P2}`, reset = previousScore !== null && previousScore !== score;
      viewer = p.viewerId; previousTick = tick; previousScore = score;
      if (reset) clear();
      const out = { schema: 1, kind: 'sensor-only-rear-awareness', sensorTime: p.time.elapsedSec,
        receiptTime, packetAgeSec: SETTINGS.latencySec, observedScoreChange: reset,
        warning: false, reason: null, evidence: null, proposal: null,
        uncertainty: { unseenRecallOnsetKnown: false, enemyEndpointKnown: false, currentEnemyStateKnown: false } };
      if (p.time.ended) { clear(); out.reason = 'episode-ended'; return out; }
      if (p.opponentSpear?.state === 'HELD') { clear(); out.reason = 'observed-held'; return out; }
      if (p.opponentSpear) {
        seen = { ...p.opponentSpear, position: { ...p.opponentSpear.position }, direction: { ...p.opponentSpear.direction }, sourceTick: tick };
        out.reason = 'visible-away-delegated'; return out;
      }
      if (!seen) { out.reason = 'no-evidence'; return out; }
      const ageTicks = tick - seen.sourceTick;
      if (ageTicks > Math.round(SETTINGS.sourceMemorySec * SETTINGS.simulationHz)) {
        clear(); out.reason = 'evidence-expired'; return out;
      }
      const age = ageTicks / SETTINGS.simulationHz, hypothetical = landmark(seen, age, p.arena);
      out.evidence = { lastSeenState: seen.state, lastSeenPosition: { ...seen.position }, lastSeenDirection: { ...seen.direction },
        lastSeenSourceTime: seen.sourceTick / SETTINGS.simulationHz, sourceAgeSec: age,
        ageAtReceiptSec: age + SETTINGS.latencySec, nominalLandmark: hypothetical.position,
        landmarkMeaning: hypothetical.meaning, condition: hypothetical.condition,
        currentSpearPositionKnown: false };
      const towardLandmark = sub(hypothetical.position, p.own.position);
      if (norm(towardLandmark) <= EPS) { out.reason = 'coincident-landmark-abstain'; return out; }
      if (dot(towardLandmark, p.own.facing) >= 0) { out.reason = 'remembered-landmark-not-rear'; return out; }
      out.warning = true; out.reason = 'possible-unseen-rear-spear-risk';
      const bearing = unit(towardLandmark), perpendicular = vec(-bearing.y, bearing.x);
      const centers = [
        { kind: 'delayed-position-envelope', position: { ...p.own.position } },
        { kind: 'unobserved-reset-envelope', position: { ...SETTINGS.resetStarts[p.viewerId] } },
      ];
      const uncertaintyRadius = SETTINGS.playerSpeed * SETTINGS.latencySec;
      const expandedRadius = SETTINGS.bodyRadius + uncertaintyRadius;
      const travel = SETTINGS.playerSpeed * SETTINGS.decisionSec;
      const options = [1, -1].map(sign => {
        const direction = mul(perpendicular, sign);
        const clearance = Math.min(...centers.map(c => staticClearance(c.position, direction, travel, p.arena, expandedRadius)));
        return { sign, direction, clearance, clears: clearance >= travel - EPS };
      });
      const continued = dot(issuedMove, perpendicular);
      const preferred = Math.abs(continued) > EPS ? Math.sign(continued) : 1;
      const chosen = options.find(o => o.clears && o.sign === preferred) ?? options.find(o => o.clears) ?? null;
      out.proposal = { scanAim: bearing, movement: chosen ? chosen.direction : null,
        response: chosen ? 'lateral-plus-scan' : 'scan-only',
        movementCertificate: { certified: !!chosen,
          scope: 'static geometry only, for immediate execution over one decision interval under public movement/reset bounds',
          horizonSec: SETTINGS.decisionSec, travel, uncertaintyRadius, bodyRadius: SETTINGS.bodyRadius,
          envelopes: centers, candidateClearances: options.map(o => ({ sign: o.sign, distance: o.clearance })),
          coversSpearsOrPlayers: false, certifiesActualScan: false } };
      return out;
    },
  };
}

// Synthetic source queue only; unlike a game wrapper it issues no motor commands.
// Observation sampling is exactly the original human interface's public timing.
export function createDelayedAwarenessInterface(awareness = createAwareness()) {
  let tick = 0, viewer = null, latest = null;
  const queue = [], records = [];
  return {
    push(raw) {
      const packet = copyAllowedPacket(raw);
      if (sourceTick(packet.time.elapsedSec) !== tick) throw new RangeError('consecutive 120-Hz frames from zero required');
      if (viewer !== null && viewer !== packet.viewerId) throw new RangeError('viewer cannot change');
      viewer = packet.viewerId; queue.push(packet);
      let result = null;
      if (tick >= SETTINGS.latencyTicks) {
        const delayed = queue.shift();
        if ((tick - SETTINGS.latencyTicks) % SETTINGS.decisionTicks === 0) {
          result = awareness.observe(delayed, tick / SETTINGS.simulationHz);
          latest = clone(result); records.push(clone(result));
        }
      }
      tick++; return result;
    },
    latest: () => clone(latest), records: () => clone(records),
  };
}
