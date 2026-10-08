// Selected workspace content describes a hypothesis, never an actuator request.
// All times are delayed percept elapsed seconds. hypothesisTime anchors mean;
// originalEvidenceTime remains the time of the originating sensory observation.
export const CONTENT_PACKET_VERSION = 1;
export const CONTENT_ENTITIES = Object.freeze(['opponent', 'ownSpear', 'enemySpear']);
export const CONTENT_RECIPIENTS = Object.freeze(['attention', 'memory', 'planner', 'report']);

const REQUIRED = ['revision', 'focus', 'entity', 'mean', 'velocity', 'hypothesisTime',
  'originalEvidenceTime', 'issuedAt', 'evidenceId', 'source', 'uncertainty', 'validUntil'];
const DERIVED = ['version', 'ageSec', 'lineage'];
const SOURCES = new Set(['observed', 'predicted', 'episodic']);
const ENTITIES = new Set(CONTENT_ENTITIES);
const ownedPackets = new WeakSet();

// Do not execute accessors, inherit fields, coerce numbers, or silently ignore
// extra fields (in particular a wants/throw/recall command masquerading as data).
function dataRecord(value, required, optional = []) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const allowed = new Set([...required, ...optional]);
  if (Reflect.ownKeys(descriptors).some(key => !allowed.has(key)) ||
      required.some(key => !Object.hasOwn(descriptors, key))) return null;
  const copy = {};
  for (const key of Reflect.ownKeys(descriptors)) {
    if (!Object.hasOwn(descriptors[key], 'value')) return null;
    copy[key] = descriptors[key].value;
  }
  return copy;
}

const timestamp = value => Number.isFinite(value) && value >= 0;
const revision = value => Number.isSafeInteger(value) && value >= 0;
const label = (value, max) => typeof value === 'string' && value.length > 0 &&
  value.length <= max && value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value);

function point(value) {
  const copy = dataRecord(value, ['x', 'y']);
  return copy && Number.isFinite(copy.x) && Number.isFinite(copy.y) ? Object.freeze(copy) : null;
}

function uncertainty(value) {
  const copy = dataRecord(value, ['status', 'radius']);
  if (!copy || !(copy.status === 'unknown' && copy.radius === null ||
      copy.status === 'known' && Number.isFinite(copy.radius) && copy.radius >= 0)) return null;
  return Object.freeze(copy);
}

function canonical(value, now, complete) {
  try {
    const input = dataRecord(value, complete ? [...REQUIRED, ...DERIVED] : REQUIRED,
      complete ? [] : DERIVED);
    if (!input || !revision(input.revision) || !label(input.focus, 80) ||
        !ENTITIES.has(input.entity) || !SOURCES.has(input.source) ||
        !revision(input.evidenceId)) return null;
    const version = Object.hasOwn(input, 'version') ? input.version : CONTENT_PACKET_VERSION;
    if (version !== CONTENT_PACKET_VERSION) return null;
    const mean = point(input.mean), velocity = point(input.velocity);
    const spread = uncertainty(input.uncertainty);
    if (!mean || !velocity || !spread) return null;
    const { originalEvidenceTime, hypothesisTime, issuedAt, validUntil } = input;
    // A caller with an external clock must supply it. Omitting now validates at
    // issuance, which is useful for an archived packet, not a current delivery.
    const at = now === undefined ? issuedAt : now;
    if (![originalEvidenceTime, hypothesisTime, issuedAt, validUntil, at].every(timestamp) ||
        originalEvidenceTime > hypothesisTime || hypothesisTime > issuedAt ||
        issuedAt > at || issuedAt > validUntil || at > validUntil) return null;
    const ageSec = issuedAt - originalEvidenceTime;
    if (!Number.isFinite(ageSec) || Object.hasOwn(input, 'ageSec') && input.ageSec !== ageSec) return null;
    let lineage;
    if (!Object.hasOwn(input, 'lineage') && input.source === 'observed') {
      lineage = { rootEvidenceId: input.evidenceId, parentRevision: null };
    } else lineage = dataRecord(input.lineage, ['rootEvidenceId', 'parentRevision']);
    if (!lineage || lineage.rootEvidenceId !== input.evidenceId) return null;
    if (input.source === 'observed') {
      if (hypothesisTime !== originalEvidenceTime || lineage.parentRevision !== null) return null;
    } else if (!revision(lineage.parentRevision) || lineage.parentRevision >= input.revision) return null;
    const packet = Object.freeze({ version, revision: input.revision, focus: input.focus,
      entity: input.entity, mean, velocity, hypothesisTime, originalEvidenceTime, issuedAt,
      evidenceId: input.evidenceId, source: input.source, uncertainty: spread,
      lineage: Object.freeze(lineage), ageSec, validUntil });
    ownedPackets.add(packet);
    return packet;
  } catch {
    return null;
  }
}

/** A detached, deeply frozen packet, or null. No partial repair of bad input. */
export function createContentPacket(input, now) {
  return canonical(input, now, false);
}

/** Validation requires the complete canonical schema, including derived fields. */
export function validateContentPacket(packet, now) {
  return canonical(packet, now, true) !== null;
}

/** Research replacement is a complete hypothesis with the same selected focus. */
export function overrideContentPacket(packet, replacement, now) {
  const original = canonical(packet, now, true);
  const changed = canonical(replacement, now, false);
  // A content intervention can move/change the selected referent, but cannot
  // manufacture fresher evidence, relabel recall as observation, or extend TTL.
  return original && changed && original.focus === changed.focus &&
    original.evidenceId === changed.evidenceId && original.source === changed.source &&
    original.originalEvidenceTime === changed.originalEvidenceTime &&
    original.hypothesisTime === changed.hypothesisTime && original.issuedAt === changed.issuedAt &&
    original.validUntil === changed.validUntil && original.lineage.parentRevision === changed.lineage.parentRevision &&
    changed.revision >= original.revision ? changed : null;
}

/** Compute once; independently cut only delivery, never rewrite the content. */
export function deliverContentPacket(packet, now, enabled = {}) {
  const checked = canonical(packet, now, true);
  const selected = checked && ownedPackets.has(packet) ? packet : checked;
  let switches;
  try {
    switches = dataRecord(enabled, [], CONTENT_RECIPIENTS);
    if (switches && Object.values(switches).some(value => typeof value !== 'boolean')) switches = null;
  } catch { switches = null; }
  return Object.freeze(Object.fromEntries(CONTENT_RECIPIENTS.map(recipient =>
    [recipient, selected && switches && switches[recipient] !== false ? selected : null])));
}
