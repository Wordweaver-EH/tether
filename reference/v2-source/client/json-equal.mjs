// Browser mapping for src/log.js's node:util import. Log records contain JSON values.
export function isDeepStrictEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== typeof right ||
      typeof left !== 'object') return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const a = Object.keys(left), b = Object.keys(right);
  return a.length === b.length && a.every(key => Object.hasOwn(right, key) &&
    isDeepStrictEqual(left[key], right[key]));
}
