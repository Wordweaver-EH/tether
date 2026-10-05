// Symmetric segment/closed-box intersection. An endpoint on a surface is
// visible; intermediate tangencies (including corners) block sight. This
// prevents diagonal cracks without hiding a spear on the near cover face.
export function hasLineOfSight(from, to, obstacles) {
  const epsilon = 1e-10;
  return !obstacles.some((box) => {
    let enter = 0, exit = 1;
    for (const axis of ['x', 'y']) {
      const lo = axis === 'x' ? box.minX : box.minY;
      const hi = axis === 'x' ? box.maxX : box.maxY;
      const delta = to[axis] - from[axis];
      if (delta === 0) {
        if (from[axis] < lo || from[axis] > hi) return false;
      } else {
        const a = (lo - from[axis]) / delta, b = (hi - from[axis]) / delta;
        enter = Math.max(enter, Math.min(a, b));
        exit = Math.min(exit, Math.max(a, b));
      }
    }
    return enter <= exit + epsilon && exit > epsilon && enter < 1 - epsilon;
  });
}
