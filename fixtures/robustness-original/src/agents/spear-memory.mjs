// Private dead-reckoning from own delayed spear observations and commanded inputs.
// Speeds are public rules, supplied per named experimental condition.
export function createSpearMemory({ outboundSpeed = 12, returnSpeed = 12 } = {}) {
  let spear = null, observedAt = -Infinity, commandedAt = -Infinity;
  const copy = (p) => ({ x: p.x, y: p.y });
  const contact = (start, direction, reach, arena) => {
    let best = null;
    const offer = (t, surface) => {
      if (t < 0 || t > reach || (best && t >= best.t)) return;
      best = { t, surface };
    };
    const b = arena.bounds;
    if (direction.x < 0) offer((b.minX - start.x) / direction.x, 'WALL_W');
    if (direction.x > 0) offer((b.maxX - start.x) / direction.x, 'WALL_E');
    if (direction.y < 0) offer((b.minY - start.y) / direction.y, 'WALL_S');
    if (direction.y > 0) offer((b.maxY - start.y) / direction.y, 'WALL_N');
    for (const box of arena.obstacles) {
      let entry = -Infinity, exit = Infinity, face = null;
      for (const axis of ['x', 'y']) {
        const d = direction[axis], s = start[axis];
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
      if (entry <= exit && exit >= 0) offer(Math.max(0, entry), `${box.id}_${face}`);
    }
    return best;
  };
  return {
    observe(view) {
      const now = view.time.elapsedSec;
      if (view.own.spear && now >= commandedAt) {
        spear = structuredClone(view.own.spear); observedAt = now;
      } else if (spear && now > observedAt) {
        if (spear.state === 'OUTBOUND' || spear.state === 'RETURNING') {
          const speed = spear.state === 'OUTBOUND' ? outboundSpeed : returnSpeed;
          let reach = speed * (now - observedAt);
          const target = spear.recallTarget;
          const distanceToTarget = target ? Math.hypot(target.x - spear.position.x,
            target.y - spear.position.y) : Infinity;
          const completed = reach >= distanceToTarget;
          if (target) reach = Math.min(reach, distanceToTarget);
          const hit = spear.state === 'OUTBOUND' ?
            contact(spear.position, spear.direction, reach, view.arena) : null;
          const travel = hit?.t ?? reach;
          spear.position = { x: spear.position.x + spear.direction.x * travel,
            y: spear.position.y + spear.direction.y * travel };
          if (hit) { spear.state = 'EMBEDDED'; spear.embedSurfaceId = hit.surface; }
          else if (target && completed) {
            spear = { state: 'HELD', position: copy(view.own.position),
              direction: copy(view.own.facing), embedSurfaceId: null,
              recallTarget: null };
          }
        }
        observedAt = now;
      }
      return spear ?? { state: 'UNKNOWN', position: null, direction: null };
    },
    command(input, view, time) {
      if (input.throw) {
        const p = view.own.position, f = view.own.facing;
        spear = { state: 'OUTBOUND',
          position: { x: p.x + f.x * 0.35, y: p.y + f.y * 0.35 },
          direction: copy(f), embedSurfaceId: null, recallTarget: null };
        commandedAt = time; observedAt = time;
      } else if (input.recall && spear?.state === 'EMBEDDED') {
        const target = copy(view.own.position);
        const length = Math.hypot(target.x - spear.position.x,
          target.y - spear.position.y);
        spear = length === 0 ? { state: 'HELD', position: target,
          direction: copy(view.own.facing), embedSurfaceId: null,
          recallTarget: null } : { ...spear, state: 'RETURNING',
          recallTarget: target, embedSurfaceId: null,
          direction: { x: (target.x - spear.position.x) / length,
            y: (target.y - spear.position.y) / length } };
        commandedAt = time; observedAt = time;
      }
    },
  };
}
