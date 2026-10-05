// Deliberately small, untrained baseline. Only the same percept exposed to a
// human enters this controller; there is no world, opponent oracle or learning.
export function controlRoute(viewerId, route = 'north') {
  if (!['P1', 'P2'].includes(viewerId) || !['north', 'south'].includes(route))
    throw new RangeError('invalid control route');
  const side = viewerId === 'P1' ? -1 : 1;
  const y = route === 'north' ? -1.7 : 2.9;
  return [{ x: side * 4.5, y }, { x: side * 2.1, y },
    { x: side * 2.1, y: 0 }, { x: side * 0.55, y: 0 }];
}

export function createCoverAgent({ seed = 1, route = null } = {}) {
  if (route !== null && !['north', 'south'].includes(route)) throw new RangeError('invalid route');
  let waypoint = 0, previous = null;
  const selected = route ?? ((seed >>> 0) % 2 ? 'north' : 'south');
  return {
    settings: () => ({ controller: 'cover-control-baseline-v1', route: selected, seed }),
    act(view) {
      if (view.gameMode !== 'COVER_CONTROL') throw new RangeError('Cover Control percept required');
      const own = view.own.position;
      const side = view.viewerId === 'P1' ? -1 : 1;
      // Recognize the ordinary public reset from our own teleport, never from
      // hidden hit data. Keep the chosen route stable for seeded replay.
      if (previous && Math.abs(own.x - side * 5.5) < 0.1 && Math.abs(own.y) < 0.1 &&
          (own.x - previous.x) ** 2 + (own.y - previous.y) ** 2 > 1) waypoint = 0;
      previous = { ...own };
      const path = controlRoute(view.viewerId, selected);
      while (waypoint < path.length - 1 &&
          (own.x - path[waypoint].x) ** 2 + (own.y - path[waypoint].y) ** 2 < 0.10 ** 2) waypoint++;
      const target = path[waypoint];
      const dx = target.x - own.x, dy = target.y - own.y;
      const moving = dx * dx + dy * dy > 0.06 ** 2;
      const enemy = view.opponent?.position;
      const look = enemy ? { x: enemy.x - own.x, y: enemy.y - own.y } : moving ?
        { x: dx, y: dy } : [{ x: -side, y: 0 }, { x: 0, y: -1 },
          { x: -side, y: 0 }, { x: 0, y: 1 }][Math.floor(view.time.elapsedSec / 1.5) % 4];
      const distance2 = look.x ** 2 + look.y ** 2;
      const projection = look.x * view.own.facing.x + look.y * view.own.facing.y;
      const aligned = projection > 0 && projection ** 2 >= distance2 * 0.985 ** 2;
      return { moveX: moving ? dx : 0, moveY: moving ? dy : 0,
        aimX: look.x, aimY: look.y,
        throw: !!enemy && view.own.spear?.state === 'HELD' && aligned,
        // A harmless recall attempt is legal while our spear is unobserved.
        recall: !view.own.spear || view.own.spear.state === 'EMBEDDED' };
    },
  };
}
