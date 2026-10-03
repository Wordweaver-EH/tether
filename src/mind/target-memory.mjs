import { createContentPacket, validateContentPacket, CONTENT_ENTITIES } from './content-broadcast.mjs';

export const TARGET_MEMORY_VERSION = 1;
export const TARGET_MEMORY_MAX_ENTRIES = 32;
export const TARGET_MEMORY_BODY_SPEED_BOUND = 4;

function dataRecord(value, keys) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== keys.length || !keys.every(key =>
    Object.hasOwn(descriptors, key) && Object.hasOwn(descriptors[key], 'value'))) return null;
  return Object.fromEntries(keys.map(key => [key, descriptors[key].value]));
}

// Archived packets are checked at their own issuance. A subsequent read must
// additionally pass the caller's current delayed-percept clock and expiry.
function restore(snapshot) {
  const entries = new Map();
  if (snapshot === undefined || snapshot === null) return entries;
  try {
    const root = dataRecord(snapshot, ['version', 'entries']);
    if (!root || root.version !== TARGET_MEMORY_VERSION || !Array.isArray(root.entries) ||
        Object.getPrototypeOf(root.entries) !== Array.prototype ||
        root.entries.length > TARGET_MEMORY_MAX_ENTRIES) return entries;
    const descriptors = Object.getOwnPropertyDescriptors(root.entries);
    if (Reflect.ownKeys(descriptors).length !== root.entries.length + 1) return entries;
    for (let index = 0; index < root.entries.length; index++) {
      const item = descriptors[index];
      if (!item || !Object.hasOwn(item, 'value') || !validateContentPacket(item.value)) return new Map();
      const packet = createContentPacket(item.value);
      if (packet.source !== 'observed' || entries.has(packet.evidenceId)) return new Map();
      entries.set(packet.evidenceId, packet);
    }
    return entries;
  } catch { return new Map(); }
}

/** Bounded episodic observations. Recalling is a hypothesis, never new evidence. */
export function createTargetMemory(snapshot = null, { readOnly = false } = {}) {
  const entries = restore(snapshot);
  // The episode's sensory IDs are globally increasing. A high-water mark stops
  // an evicted observation being counted again without an unbounded seen-ID set.
  // The newest stored ID always survives eviction, so snapshots reconstruct it.
  let highestEvidenceId = Math.max(-1, ...entries.keys());
  let lastWrite = null, lastRead = null;

  return Object.freeze({
    remember(packet, { enabled = true, now } = {}) {
      const valid = validateContentPacket(packet, now);
      const original = valid ? createContentPacket(packet, now) : null;
      const eligible = !!original && original.source === 'observed' && original.evidenceId > highestEvidenceId;
      const stored = eligible && enabled === true && !readOnly;
      const reason = !original ? 'invalid' : original.source !== 'observed' ? 'not-observation' :
        entries.has(original.evidenceId) ? 'duplicate-evidence' : original.evidenceId <= highestEvidenceId ?
          'non-increasing-evidence' : readOnly ? 'read-only' :
          enabled !== true ? 'write-disabled' : 'stored';
      if (stored) {
        if (entries.size === TARGET_MEMORY_MAX_ENTRIES) entries.delete(entries.keys().next().value);
        entries.set(original.evidenceId, original);
        highestEvidenceId = original.evidenceId;
      }
      lastWrite = Object.freeze({ eligible, stored, reason,
        evidenceId: original?.evidenceId ?? null });
      return lastWrite;
    },

    recall(entity, now, { enabled = true, revision } = {}) {
      let original = null;
      if (CONTENT_ENTITIES.includes(entity) && Number.isFinite(now) && now >= 0) {
        for (const packet of entries.values()) {
          if (packet.entity !== entity || !validateContentPacket(packet, now)) continue;
          if (!original || packet.originalEvidenceTime > original.originalEvidenceTime ||
              packet.originalEvidenceTime === original.originalEvidenceTime && packet.revision > original.revision)
            original = packet;
        }
      }
      let computed = null;
      if (original && original.revision < Number.MAX_SAFE_INTEGER) {
        const elapsed = now - original.hypothesisTime;
        // A body can move at most four world units/sec. This is a deliberately
        // conservative engineering radius, not a learned probability estimate.
        // Other referents retain (never reduce) their original uncertainty;
        // this body-tracking milestone makes no calibrated spear-bound claim.
        const growth = entity === 'opponent'
          ? (TARGET_MEMORY_BODY_SPEED_BOUND + Math.hypot(original.velocity.x, original.velocity.y)) * elapsed : 0;
        const uncertainty = original.uncertainty.status === 'unknown' ? original.uncertainty :
          { status: 'known', radius: original.uncertainty.radius + growth };
        computed = createContentPacket({ ...original, revision: revision === undefined ? original.revision + 1 : revision,
          mean: { x: original.mean.x + original.velocity.x * elapsed,
            y: original.mean.y + original.velocity.y * elapsed },
          source: 'episodic', hypothesisTime: now, issuedAt: now,
          ageSec: now - original.originalEvidenceTime, uncertainty,
          lineage: { rootEvidenceId: original.evidenceId, parentRevision: original.revision } }, now);
      }
      const delivered = computed && enabled === true ? computed : null;
      lastRead = Object.freeze({ entity: CONTENT_ENTITIES.includes(entity) ? entity : null,
        computed, delivered, reason: !computed ? 'unavailable' : enabled !== true ? 'read-disabled' : 'recalled' });
      return delivered;
    },

    snapshot: () => ({ version: TARGET_MEMORY_VERSION,
      entries: [...entries.values()].map(packet => structuredClone(packet)) }),
    diagnostics: () => Object.freeze({ size: entries.size, highestEvidenceId,
      readOnly: !!readOnly, lastWrite, lastRead }),
  });
}
