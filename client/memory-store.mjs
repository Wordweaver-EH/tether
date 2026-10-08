// One local opponent profile for this browser. The mind validates its own
// snapshot schema; the storage envelope is independently versioned.
export const MEMORY_KEY = 'tether.opponent-memory.v2';
export function readMemory(storage) {
  try {
    const envelope = JSON.parse(storage?.getItem(MEMORY_KEY));
    if (envelope?.version !== 2 || !envelope.snapshot ||
        typeof envelope.snapshot !== 'object' || Array.isArray(envelope.snapshot)) return null;
    return envelope.snapshot;
  } catch { return null; }
}
export function saveMemory(storage, snapshot) {
  try {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return false;
    storage?.setItem(MEMORY_KEY, JSON.stringify({ version: 2, snapshot }));
    return !!storage;
  } catch { return false; }
}
export function resetMemory(storage) {
  try { storage?.removeItem(MEMORY_KEY); return !!storage; }
  catch { return false; }
}
