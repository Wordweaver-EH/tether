// Hand-built sensor fixtures. These are not saved match frames or a game rollout.
export const vec = (x, y) => ({ x, y });
export const DEFAULT_ARENA = {
  bounds: { minX: -8, maxX: 8, minY: -5, maxY: 5 },
  obstacles: [
    { id: 'A', minX: -3, maxX: -1.5, minY: .25, maxY: 3.25 },
    { id: 'B', minX: 1.5, maxX: 3, minY: -3.25, maxY: -.25 },
  ],
};
export const emptyArena = () => ({ bounds: { ...DEFAULT_ARENA.bounds }, obstacles: [] });
export const spear = (state, x, y, dx = 1, dy = 0) => ({ state, position: vec(x, y), direction: vec(dx, dy) });
export function packet({ time = 0, position = vec(0, 0), facing = vec(1, 0), visible = null,
  arena = DEFAULT_ARENA, scores = { P1: 0, P2: 0 }, ended = false, viewerId = 'P1' } = {}) {
  return structuredClone({ viewerId, mode: 'MODE_B',
    time: { elapsedSec: time, remainingSec: 300 - time, ended }, scores,
    own: { position, facing, velocity: vec(0, 0), spear: { ...spear('HELD', position.x, position.y, facing.x, facing.y), embedSurfaceId: null, recallTarget: null } },
    arena, opponent: visible?.state === 'HELD' ? { position: visible.position, facing: visible.direction, velocity: vec(0, 0) } : null,
    opponentSpear: visible,
    cone: { halfAngleRad: Math.PI / 3, totalAngleRad: 2 * Math.PI / 3,
      origin: position, facing, occlusion: false, maxDistance: null },
  });
}
export function sourceCanSee(position, facing, target) {
  const dx = target.x - position.x, dy = target.y - position.y;
  const a = Math.atan2(dy, dx) - Math.atan2(facing.y, facing.x);
  return Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) <= Math.PI / 3 + 1e-12 || (dx === 0 && dy === 0);
}

// Independent geometric check: direct circle-to-AABB distances at sampled points,
// not the prototype's expanded-box ray code. Sampling supplements, not proves,
// the analytical envelope argument. Include circle boundary + interior radii.
export function sampledStaticSweepCertificate(assessment, arena) {
  const p = assessment.proposal;
  if (!p?.movement) return { sampledCenters: 0, sampledPositions: 0, violations: [] };
  const certificate = p.movementCertificate, r = certificate.bodyRadius;
  const violations = [];
  let sampledCenters = 0, sampledPositions = 0;
  for (const envelope of certificate.envelopes) {
    for (const radiusFraction of [0, .25, .5, .75, 1]) {
      const angles = radiusFraction === 0 ? [0] : Array.from({ length: 128 }, (_, k) => k * Math.PI / 64);
      for (const a of angles) {
        const center = vec(envelope.position.x + certificate.uncertaintyRadius * radiusFraction * Math.cos(a),
          envelope.position.y + certificate.uncertaintyRadius * radiusFraction * Math.sin(a));
        sampledCenters++;
        for (let j = 0; j <= 16; j++) {
          const t = j / 16;
          const q = vec(center.x + p.movement.x * certificate.travel * t, center.y + p.movement.y * certificate.travel * t);
          sampledPositions++;
          const b = arena.bounds;
          if (q.x - r < b.minX - 1e-9 || q.x + r > b.maxX + 1e-9 || q.y - r < b.minY - 1e-9 || q.y + r > b.maxY + 1e-9)
            violations.push({ envelope: envelope.kind, point: q, kind: 'wall' });
          for (const o of arena.obstacles) {
            const nearest = vec(Math.max(o.minX, Math.min(o.maxX, q.x)), Math.max(o.minY, Math.min(o.maxY, q.y)));
            if (Math.hypot(q.x - nearest.x, q.y - nearest.y) < r - 1e-9)
              violations.push({ envelope: envelope.kind, point: q, kind: 'obstacle' });
          }
        }
      }
    }
  }
  return { sampledCenters, sampledPositions, violations };
}
