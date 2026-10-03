export const point = (x, y) => ({ x, y });
export const add = (a, b) => point(a.x + b.x, a.y + b.y);
export const sub = (a, b) => point(a.x - b.x, a.y - b.y);
export const scale = (a, s) => point(a.x * s, a.y * s);
export const dot = (a, b) => a.x * b.x + a.y * b.y;
export const length = (a) => Math.hypot(a.x, a.y);
export const distance = (a, b) => length(sub(a, b));
export const unit = (a) => { const n = length(a); return n > 1e-9 ? scale(a, 1 / n) : point(0, 0); };
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const angle = (a) => Math.atan2(a.y, a.x);
export const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export const lineDistance = (p, a, b) => {
  const v = sub(b, a), d = dot(v, v);
  const t = d < 1e-9 ? 0 : clamp(dot(sub(p, a), v) / d, 0, 1);
  return { distance: distance(p, add(a, scale(v, t))), t };
};
export function inCone(origin, facing, target, halfAngle = Math.PI / 3) {
  const v = sub(target, origin), n = length(v);
  return n < 1e-9 || dot(unit(facing), v) >= n * Math.cos(halfAngle) - 1e-9;
}
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 0x100000000; };
}
export function normal(random) {
  return Math.sqrt(-2 * Math.log(Math.max(1e-9, random()))) * Math.cos(2 * Math.PI * random());
}
export function legalPoint(p, arena, margin = 0.37) {
  const b = arena.bounds;
  let q = point(clamp(p.x, b.minX + margin, b.maxX - margin),
    clamp(p.y, b.minY + margin, b.maxY - margin));
  for (const o of arena.obstacles) {
    const loX = o.minX - margin, hiX = o.maxX + margin;
    const loY = o.minY - margin, hiY = o.maxY + margin;
    if (q.x > loX && q.x < hiX && q.y > loY && q.y < hiY) {
      const sides = [
        { d: q.x - loX, p: point(loX, q.y) },
        { d: hiX - q.x, p: point(hiX, q.y) },
        { d: q.y - loY, p: point(q.x, loY) },
        { d: hiY - q.y, p: point(q.x, hiY) },
      ];
      sides.sort((a, b) => a.d - b.d);
      q = sides[0].p;
    }
  }
  return q;
}
