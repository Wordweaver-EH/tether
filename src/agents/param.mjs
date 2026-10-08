import { createSpearMemory } from './spear-memory.mjs';
import { createReactiveDodger } from './dodger.mjs';

// Search vectors are in [0,1]. Every field changes an observable decision.
export const PARAMETERS = Object.freeze([
  ['throwMode', 0, 2], ['leadSec', 0, 0.45], ['throwRange', 2, 15],
  ['throwAlignment', 0.015, 0.3], ['throwInterval', 0, 1.5],
  ['surfaceBias', -1, 1], ['embedOffset', -3, 3],
  ['recallMode', 0, 3], ['recallDelay', 0, 5],
  ['crossTolerance', 0.25, 2], ['anchorHold', 2, 15],
  ['preferredDistance', 1.2, 10], ['distanceGain', 0, 2],
  ['strafeSign', -1, 1], ['strafeStrength', 0, 1.5],
  ['dodgeStrength', 0, 2], ['recallAvoidance', 0, 2],
  ['coverUse', 0, 1.5], ['neutralization', 0, 1.5],
  ['gazeScanPeriod', 0.5, 6], ['gazeTrack', 0, 1],
]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a, k) => ({ x: a.x * k, y: a.y * k });
const norm = (a) => { const n = Math.hypot(a.x, a.y) || 1; return mul(a, 1 / n); };
const dot = (a, b) => a.x * b.x + a.y * b.y;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function decodePolicy(vector) {
  if (!Array.isArray(vector) || vector.length !== PARAMETERS.length ||
      vector.some((v) => !Number.isFinite(v) || v < 0 || v > 1))
    throw new RangeError(`policy vector needs ${PARAMETERS.length} values in [0,1]`);
  return Object.fromEntries(PARAMETERS.map(([name, lo, hi], i) =>
    [name, lo + (hi - lo) * vector[i]]));
}
export function encodePolicy(values) {
  return PARAMETERS.map(([name, lo, hi]) =>
    clamp((values[name] - lo) / (hi - lo), 0, 1));
}
export const POLICY_SEEDS = Object.freeze({
  direct: encodePolicy({ throwMode: 0, leadSec: 0.15, throwRange: 13,
    throwAlignment: 0.1, throwInterval: 0.1, surfaceBias: 0,
    embedOffset: 0, recallMode: 0, recallDelay: 0, crossTolerance: 0.6,
    anchorHold: 4, preferredDistance: 5, distanceGain: 1, strafeSign: 1,
    strafeStrength: 0.7, dodgeStrength: 1.5, recallAvoidance: 1.4,
    coverUse: 0, neutralization: 0.3, gazeScanPeriod: 2, gazeTrack: 1 }),
  anchor: encodePolicy({ throwMode: 2, leadSec: 0.05, throwRange: 13,
    throwAlignment: 0.08, throwInterval: 0.3, surfaceBias: 0.7,
    embedOffset: 2, recallMode: 2.5, recallDelay: 0.7,
    crossTolerance: 0.9, anchorHold: 9, preferredDistance: 5,
    distanceGain: 0.8, strafeSign: -1, strafeStrength: 1,
    dodgeStrength: 1.5, recallAvoidance: 1.4, coverUse: 0.5,
    neutralization: 0.4, gazeScanPeriod: 1.5, gazeTrack: 1 }),
});

export function createParamAgent(vector, { latencySec = 0.15, seed = 1,
  outboundSpeed = 12, returnSpeed = 12, benchmarkInterface = false, deferCommand = false } = {}) {
  if (deferCommand && !benchmarkInterface) throw new Error('deferCommand requires benchmark interface');
  if (typeof benchmarkInterface !== 'boolean') throw new TypeError('benchmarkInterface must be boolean');
  if (benchmarkInterface && latencySec !== 0.15) throw new Error('benchmark interface requires 150 ms timestamp compensation');
  const p = decodePolicy(vector), queue = [], ownSpear = createSpearMemory({
    outboundSpeed, returnSpeed });
  let rngState = (seed >>> 0) || 1;
  const random = () => { rngState ^= rngState << 13; rngState ^= rngState >>> 17;
    rngState ^= rngState << 5; return (rngState >>> 0) / 0x100000000; };
  const scanPhase = random() * Math.PI * 2;
  const dodger = createReactiveDodger({ strength: p.dodgeStrength,
    recallAvoidance: p.recallAvoidance });
  let lastOpponent = null, lastEnemySpear = null, embeddedAt = null;
  let previousState = null, lastThrow = -Infinity, previousScore = null;
  return {
    ...(deferCommand ? { commitCommand(input, view, commandTime) { ownSpear.command(input, view, commandTime); if (input.throw) lastThrow = view.time.elapsedSec; } } : {}),
    settings: () => ({ latencySec, policy: p }),
    act(view, dt) {
      if (!benchmarkInterface) {
        queue.push(view);
        if (queue.length <= Math.round(latencySec / dt)) return {};
      }
      const v = benchmarkInterface ? view : queue.shift(), now = v.time.elapsedSec, me = v.own.position;
      const input = { moveX: 0, moveY: 0, aimX: 0, aimY: 0,
        throw: false, recall: false };
      const spear = ownSpear.observe(v);
      if (v.opponent) lastOpponent = { position: { ...v.opponent.position },
        velocity: { ...v.opponent.velocity }, at: now };
      if (v.opponentSpear) lastEnemySpear = { ...v.opponentSpear,
        at: now };
      if (previousState !== spear.state) {
        if (spear.state === 'EMBEDDED') embeddedAt = now;
        if (spear.state === 'HELD') embeddedAt = null;
        previousState = spear.state;
      }
      const score = `${v.scores.P1}:${v.scores.P2}`;
      if (previousScore !== null && score !== previousScore) {
        embeddedAt = null; lastEnemySpear = null;
      }
      previousScore = score;
      const enemy = v.opponent?.position ??
        (lastOpponent && now - lastOpponent.at < 2.5 ?
          add(lastOpponent.position, mul(lastOpponent.velocity,
            Math.min(0.4, now - lastOpponent.at))) : null);
      const ev = v.opponent?.velocity ?? lastOpponent?.velocity ?? { x: 0, y: 0 };
      const d = enemy ? sub(enemy, me) : null;
      const distance = enemy ? dist(enemy, me) : Infinity;
      const toward = d ? norm(d) : v.own.facing;
      const lateral = { x: -toward.y, y: toward.x };
      const shotTarget = enemy ? add(enemy, mul(ev, p.leadSec + Math.min(distance / 12, 0.5) * 0.25)) : null;
      const farX = me.x < 0 ? v.arena.bounds.maxX : v.arena.bounds.minX;
      const edge = v.arena.bounds;
      const embedTarget = enemy ? Math.abs(p.surfaceBias) < 0.35
        ? { x: farX, y: clamp(enemy.y + p.embedOffset, edge.minY + 0.2, edge.maxY - 0.2) }
        : { x: clamp(enemy.x + p.embedOffset, edge.minX + 0.2, edge.maxX - 0.2),
          y: p.surfaceBias > 0 ? edge.maxY : edge.minY } : null;
      const useEmbed = p.throwMode >= 1.35 ||
        (p.throwMode >= 0.65 && distance > p.throwRange * 0.7);
      const target = useEmbed ? embedTarget : shotTarget;
      if (target) {
        const rawAim = norm(sub(target, me));
        const motorSample = random();
        const noise = (benchmarkInterface ? 0 : motorSample - 0.5) * 0.018 * (1 + Math.hypot(ev.x, ev.y) / 4);
        const aim = { x: rawAim.x * Math.cos(noise) - rawAim.y * Math.sin(noise),
          y: rawAim.x * Math.sin(noise) + rawAim.y * Math.cos(noise) };
        input.aimX = aim.x; input.aimY = aim.y;
        if (spear.state === 'HELD' && distance <= p.throwRange &&
            now - lastThrow >= p.throwInterval &&
            dot(v.own.facing, aim) >= Math.cos(p.throwAlignment)) {
          input.throw = true; if (!deferCommand) lastThrow = now;
        }
      } else {
        const base = lastOpponent ? sub(lastOpponent.position, me) :
          { x: v.viewerId === 'P1' ? 1 : -1, y: 0 };
        const angle = Math.atan2(base.y, base.x) +
          (1 - p.gazeTrack) * Math.sin(2 * Math.PI * now / p.gazeScanPeriod + scanPhase) * Math.PI;
        input.aimX = Math.cos(angle); input.aimY = Math.sin(angle);
      }
      if (spear.state === 'EMBEDDED' && embeddedAt !== null) {
        const age = now - embeddedAt;
        const mode = p.recallMode < 1 ? 0 : p.recallMode < 2 ? 1 : 2;
        let crossing = false;
        if (enemy && spear.position) {
          const line = sub(me, spear.position), rel = sub(enemy, spear.position);
          const t = dot(rel, line) / (dot(line, line) || 1);
          const side = Math.abs(line.x * rel.y - line.y * rel.x) /
            (Math.hypot(line.x, line.y) || 1);
          crossing = t > 0 && t < 1 && side < p.crossTolerance;
        }
        input.recall = mode === 0 || (mode === 1 && age >= p.recallDelay) ||
          (mode === 2 && age >= p.recallDelay && crossing) || age >= p.anchorHold;
      }
      let move = { x: 0, y: 0 };
      if (enemy) {
        const rangeError = (distance - p.preferredDistance) / 3;
        move = add(mul(toward, clamp(rangeError * p.distanceGain, -1.5, 1.5)),
          mul(lateral, p.strafeSign * p.strafeStrength));
      } else if (lastOpponent) move = norm(sub(lastOpponent.position, me));
      if (lastEnemySpear?.state === 'EMBEDDED' &&
          now - lastEnemySpear.at < 2 && p.neutralization > 0.8 &&
          (!enemy || distance > 3)) {
        move = add(move, mul(norm(sub(lastEnemySpear.position, me)),
          p.neutralization));
      }
      if (enemy && p.coverUse > 0) {
        const obstacle = v.arena.obstacles.reduce((best, box) => {
          const centre = { x: (box.minX + box.maxX) / 2,
            y: (box.minY + box.maxY) / 2 };
          return !best || dist(centre, me) < dist(best, me) ? centre : best;
        }, null);
        if (obstacle) move = add(move, mul(norm(sub(obstacle, me)), p.coverUse * 0.35));
      }
      const threat = dodger.movement(v);
      move = add(move, mul(threat.vector, threat.urgency * 3));
      const m = norm(move);
      if (Math.hypot(move.x, move.y) > 0.1) {
        input.moveX = m.x; input.moveY = m.y;
      }
      if (!deferCommand) ownSpear.command(input, v, now + latencySec);
      return input;
    },
  };
}
