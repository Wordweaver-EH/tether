export const TELEMETRY_KEY = 'tether.telemetry.v1';
const empty = () => ({ boutsPlayed: 0, rematches: 0, sessionDurationsSec: [], bouts: [] });
export function readTelemetry(storage) {
  try {
    const value = JSON.parse(storage.getItem(TELEMETRY_KEY));
    return value && Number.isInteger(value.boutsPlayed) && Number.isInteger(value.rematches) &&
      Array.isArray(value.bouts) &&
      Array.isArray(value.sessionDurationsSec) ? value : empty();
  } catch { return empty(); }
}
export function recordBout(storage, summary) {
  const data = readTelemetry(storage);
  data.boutsPlayed++;
  data.bouts.push(summary);
  try { storage?.setItem(TELEMETRY_KEY, JSON.stringify(data)); } catch { /* Optional local telemetry. */ }
  return data;
}
export function recordRematch(storage) {
  const data = readTelemetry(storage);
  data.rematches++;
  try { storage?.setItem(TELEMETRY_KEY, JSON.stringify(data)); } catch { /* Optional local telemetry. */ }
  return data;
}
export function recordSessionDuration(storage, seconds) {
  const data = readTelemetry(storage);
  data.sessionDurationsSec.push(Math.max(0, seconds));
  try { storage?.setItem(TELEMETRY_KEY, JSON.stringify(data)); } catch { /* Optional local telemetry. */ }
  return data;
}
