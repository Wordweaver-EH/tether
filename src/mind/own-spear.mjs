// The mind's private estimate. MODE_B can hide even the owner's non-held spear.
const copy = (p) => ({ x: p.x, y: p.y });
const SPEED = 12;

function firstContact(start, delta, arena) {
  let best = null;
  const offer = (t, surface) => {
    if (t < 0 || t > 1 || (best && t >= best.t)) return;
    best = { t, surface };
  };
  const b = arena.bounds;
  if (delta.x < 0) offer((b.minX - start.x) / delta.x, 'WALL_W');
  if (delta.x > 0) offer((b.maxX - start.x) / delta.x, 'WALL_E');
  if (delta.y < 0) offer((b.minY - start.y) / delta.y, 'WALL_S');
  if (delta.y > 0) offer((b.maxY - start.y) / delta.y, 'WALL_N');
  for (const box of arena.obstacles) {
    let entry = -Infinity, exit = Infinity, face = null;
    for (const axis of ['x', 'y']) {
      const d = delta[axis], s = start[axis];
      const lo = box[axis === 'x' ? 'minX' : 'minY'];
      const hi = box[axis === 'x' ? 'maxX' : 'maxY'];
      if (d === 0) { if (s < lo || s > hi) { exit = -Infinity; break; } }
      else {
        const near = d > 0 ? (lo - s) / d : (hi - s) / d;
        const far = d > 0 ? (hi - s) / d : (lo - s) / d;
        if (near > entry) { entry = near;
          face = axis === 'x' ? (d > 0 ? 'W' : 'E') : (d > 0 ? 'S' : 'N'); }
        exit = Math.min(exit, far);
      }
    }
    if (entry <= exit && exit >= 0) offer(Math.max(0, entry), `${box.id}_${face ?? 'W'}`);
  }
  return best;
}

export function createOwnSpearMemory() {
  let spear = null, at = -Infinity, commandedAt = -Infinity;
  function observe(view) {
    const now = view.time.elapsedSec;
    if (view.own.spear && now >= commandedAt) {
      spear = structuredClone(view.own.spear);
      at = now;
    } else if (spear && now > at) {
      const travel = SPEED * (now - at);
      if (spear.state === 'OUTBOUND' || spear.state === 'RETURNING') {
        const target = spear.recallTarget;
        const distance = target ? Math.hypot(target.x - spear.position.x,
          target.y - spear.position.y) : Infinity;
        const length = Math.min(travel, distance);
        const delta = { x: spear.direction.x * length, y: spear.direction.y * length };
        const hit = spear.state === 'OUTBOUND'
          ? firstContact(spear.position, delta, view.arena) : null;
        const t = hit?.t ?? 1;
        spear.position = { x: spear.position.x + delta.x * t,
          y: spear.position.y + delta.y * t };
        if (hit) { spear.state = 'EMBEDDED'; spear.embedSurfaceId = hit.surface; }
        else if (target && length >= distance) {
          spear = { state: 'HELD', position: copy(view.own.position),
            direction: copy(view.own.facing), embedSurfaceId: null, recallTarget: null };
        }
      }
      at = now;
    }
    return spear ?? { state: 'UNKNOWN', position: null, direction: null,
      embedSurfaceId: null, recallTarget: null };
  }
  function command(input, view, time) {
    if (input.throw) {
      const p = view.own.position, f = view.own.facing;
      spear = { state: 'OUTBOUND',
        position: { x: p.x + f.x * 0.35, y: p.y + f.y * 0.35 },
        direction: copy(f), embedSurfaceId: null, recallTarget: null };
      commandedAt = time;
      at = time;
    } else if (input.recall && spear?.state === 'EMBEDDED') {
      const target = copy(view.own.position);
      const distance = Math.hypot(target.x - spear.position.x, target.y - spear.position.y);
      spear = distance === 0 ? { state: 'HELD', position: target,
        direction: copy(view.own.facing), embedSurfaceId: null, recallTarget: null } :
        { ...spear, state: 'RETURNING', recallTarget: target, embedSurfaceId: null,
          direction: { x: (target.x - spear.position.x) / distance,
            y: (target.y - spear.position.y) / distance } };
      commandedAt = time;
      at = time;
    }
  }
  return { observe, command };
}
