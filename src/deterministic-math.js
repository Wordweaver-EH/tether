// Replay math version 1. Only specified IEEE-754 arithmetic and bit operations:
// no implementation-approximated Math transcendental functions in rule state.
export const MATH_VERSION = 'ieee-arithmetic-v1';
const bits = new DataView(new ArrayBuffer(8));
export function sqrt(x) {
  if (x === 0 || x === Infinity) return x;
  if (!(x > 0)) return NaN;
  // Bring subnormals into the normal range before extracting their exponent.
  if (x < 2.2250738585072014e-308) return sqrt(x * 18014398509481984) / 134217728;
  bits.setFloat64(0, x, false);
  const exponent = ((bits.getUint32(0, false) >>> 20) & 2047) - 1023;
  // Exact power-of-two initial estimate within a factor of two of the root.
  const half = Math.floor(exponent / 2);
  bits.setUint32(0, (half + 1023) << 20, false);
  bits.setUint32(4, 0, false);
  let y = bits.getFloat64(0, false);
  for (let i = 0; i < 8; i++) y = (y + x / y) * 0.5;
  return y;
}
export function hypot(x, y) {
  const a = Math.abs(x), b = Math.abs(y), m = Math.max(a, b);
  if (m === 0 || m === Infinity) return m;
  const u = a / m, v = b / m;
  return m * sqrt(u * u + v * v);
}
// Used only for the bounded per-tick turn (0..pi); fixed Taylor evaluation
// gives <2e-15 absolute error on this domain without host libm variation.
export function sinCosTurn(x) {
  if (!(x >= 0 && x <= Math.PI)) throw new RangeError('turn must be in [0, pi]');
  const xx = x * x;
  let s = x, c = 1, st = x, ct = 1;
  for (let n = 1; n <= 16; n++) {
    st *= -xx / ((2 * n) * (2 * n + 1));
    ct *= -xx / ((2 * n - 1) * (2 * n));
    s += st; c += ct;
  }
  return { sin: s, cos: c };
}
