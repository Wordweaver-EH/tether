// Familiarity is evidence for one joint percept cell and one situation/tactic
// family. It is not a confidence estimate or evidence of successful play.
export const NOVELTY_MIN_EXPOSURES = 4;
export const NOVELTY_MAX_CELLS = 4096;
export const NOVELTY_MAX_COUNT = 1e6;

const SITUATION = /^(HELD|OUTBOUND|EMBEDDED|RETURNING):(seen|hidden):(near|far)$/;
const FAMILY = /^(HELD|OUTBOUND|EMBEDDED|RETURNING):(seen|hidden):(near|far):(lead|direct|left|right)$/;
const TACTICS = new Set(['lead', 'direct', 'left', 'right']);
const FEATURE_KEYS = ['distance', 'radialSpeed', 'tangentialSpeed'];

// Persisted support has a deliberately small, exact data schema. In particular,
// accessors, inherited fields, numeric coercion and partially valid snapshots do
// not become evidence. A malformed snapshot is discarded in its entirety.
function dataRecord(value, keys) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.length !== keys.length || !keys.every(key =>
    Object.hasOwn(descriptors, key) && Object.hasOwn(descriptors[key], 'value'))) return null;
  return Object.fromEntries(keys.map(key => [key, descriptors[key].value]));
}

function copyFeatures(features) {
  const copy = dataRecord(features, FEATURE_KEYS);
  if (!copy || !FEATURE_KEYS.every(key => Number.isFinite(copy[key])) || copy.distance <= 0) return null;
  return Object.freeze(copy);
}

/** Visible body motion only; no belief, hidden-state or outcome fallback. */
export function noveltyFeatures(view) {
  const own = view?.own, opponent = view?.opponent;
  const points = [own?.position, own?.velocity, opponent?.position, opponent?.velocity];
  if (!points.every(point => point && Number.isFinite(point.x) && Number.isFinite(point.y))) return null;
  const dx = opponent.position.x - own.position.x, dy = opponent.position.y - own.position.y;
  const distance = Math.hypot(dx, dy);
  // At coincident positions there is no well-defined radial/tangential frame.
  if (!Number.isFinite(distance) || distance <= 0) return null;
  const vx = opponent.velocity.x - own.velocity.x, vy = opponent.velocity.y - own.velocity.y;
  const x = dx / distance, y = dy / distance;
  const features = copyFeatures({ distance,
    radialSpeed: vx * x + vy * y, tangentialSpeed: -vx * y + vy * x });
  return features && noveltyCell(features) !== null ? features : null;
}

/** A canonical tuple, not independent marginal familiarity counters. */
export function noveltyCell(features) {
  const f = copyFeatures(features);
  if (!f) return null;
  const bins = [Math.floor(f.distance / 2), Math.round(f.radialSpeed / 2), Math.round(f.tangentialSpeed / 2)];
  return bins.every(Number.isSafeInteger) ? bins.join(':') : null;
}

export function noveltyFamily(situation, tactic) {
  return typeof situation === 'string' && SITUATION.exec(situation)?.[0] === situation && TACTICS.has(tactic)
    ? `${situation}:${tactic}` : null;
}

function validFamily(family) {
  return typeof family === 'string' && FAMILY.exec(family)?.[0] === family;
}

function validCell(cell) {
  if (typeof cell !== 'string' || cell.length > 52) return false;
  const parts = cell.split(':');
  return parts.length === 3 && parts.every((part, index) => {
    const number = Number(part);
    return Number.isSafeInteger(number) && (index !== 0 || number >= 0) && String(number) === part;
  });
}

const jointKey = (family, cell) => `${family}|${cell}`;

function restore(snapshot) {
  const rows = new Map();
  if (snapshot === null || snapshot === undefined) return rows;
  try {
    const root = dataRecord(snapshot, ['version', 'cells']);
    if (!root || root.version !== 1 || !Array.isArray(root.cells) ||
        Object.getPrototypeOf(root.cells) !== Array.prototype || root.cells.length > NOVELTY_MAX_CELLS) return rows;
    // Require a dense array of data entries, with no side-channel properties.
    const descriptors = Object.getOwnPropertyDescriptors(root.cells);
    if (Reflect.ownKeys(descriptors).length !== root.cells.length + 1) return rows;
    for (let index = 0; index < root.cells.length; index++) {
      const item = descriptors[index];
      if (!item || !Object.hasOwn(item, 'value')) return new Map();
      const row = dataRecord(item.value, ['family', 'cell', 'count']);
      if (!row || !validFamily(row.family) || !validCell(row.cell) ||
          !Number.isInteger(row.count) || row.count < 1 || row.count > NOVELTY_MAX_COUNT) return new Map();
      const key = jointKey(row.family, row.cell);
      if (rows.has(key)) return new Map();
      rows.set(key, row);
    }
    return rows;
  } catch {
    return new Map();
  }
}

export function createNoveltySupport(snapshot = null) {
  const rows = restore(snapshot);

  function check(family, features) {
    const valid = validFamily(family);
    const copied = copyFeatures(features);
    const cell = copied ? noveltyCell(copied) : null;
    const count = valid && cell !== null ? rows.get(jointKey(family, cell))?.count ?? 0 : 0;
    const familiar = valid && cell !== null && count >= NOVELTY_MIN_EXPOSURES;
    return Object.freeze({ valid: valid && cell !== null, family: valid ? family : null,
      cell, features: cell !== null ? copied : null, count, minimum: NOVELTY_MIN_EXPOSURES,
      familiar, novel: !familiar,
      reason: !valid ? 'invalid-family' : cell === null ? 'invalid-features' : familiar
        ? 'familiar' : count === 0 ? 'unseen-cell' : 'insufficient-exposure' });
  }

  return Object.freeze({
    check,
    register(family, features, exposure) {
      const before = check(family, features);
      // Callers retain the original action's family/features and register once,
      // only when that accepted ordinary action has a completed outcome.
      if (!before.valid || exposure?.ordinary !== true || exposure?.completed !== true)
        return Object.freeze({ ...before, registered: false });
      const key = jointKey(before.family, before.cell);
      const row = rows.get(key);
      if (row) row.count = Math.min(NOVELTY_MAX_COUNT, row.count + 1);
      else {
        if (rows.size === NOVELTY_MAX_CELLS) rows.delete(rows.keys().next().value);
        rows.set(key, { family: before.family, cell: before.cell, count: 1 });
      }
      return Object.freeze({ ...check(family, before.features), registered: true });
    },
    snapshot: () => ({ version: 1, cells: [...rows.values()].map(row => ({ ...row })) }),
  });
}
