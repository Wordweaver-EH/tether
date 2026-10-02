import { createParamAgent, decodePolicy, encodePolicy, POLICY_SEEDS } from '../src/agents/param.mjs';

// Synthetic fixed/switching habits, never human-fitted data. Both internal
// policies receive only the same filtered percept and are advanced every tick,
// so switching a habit does not also reset percept latency or spear memory.
export function createHabitProxy({ seed = 1, side = 1, switchAt = Infinity,
  family = 'direct', latencySec = 0.15 } = {}) {
  if (![1, -1].includes(side)) throw new RangeError('side must be +1 or -1');
  if (!(switchAt > 0)) throw new RangeError('switchAt must be positive');
  if (!Object.hasOwn(POLICY_SEEDS, family)) throw new RangeError('unknown proxy family');
  const base = decodePolicy(POLICY_SEEDS[family]);
  const profiles = [side, -side].map(sign => encodePolicy({ ...base,
    strafeSign: sign, strafeStrength: 1, dodgeStrength: 0,
    recallMode: 1.5, recallDelay: sign > 0 ? 0.25 : 2,
    anchorHold: 5, neutralization: sign > 0 ? 0 : 1.2 }));
  const bots = profiles.map(vector => createParamAgent(vector, { seed, latencySec }));
  return {
    act(view, dt) {
      const actions = bots.map(bot => bot.act(view, dt));
      return actions[view.time.elapsedSec >= switchAt ? 1 : 0];
    },
    settings: () => ({ kind: 'synthetic-habit-proxy', family, side,
      switchAt: Number.isFinite(switchAt) ? switchAt : null, latencySec,
      profiles: profiles.map(decodePolicy), humanFitted: false }),
  };
}

export function thirdIndex(time, durationSec) {
  if (!Number.isFinite(time) || !Number.isFinite(durationSec) || durationSec <= 0)
    throw new RangeError('finite time and positive duration required');
  return Math.max(0, Math.min(2, Math.floor(time * 3 / durationSec)));
}

// Track the cohort of each throw. A later recall hit is credited to its original
// throw, not the window in which it lands. Unresolved end-of-bout shots remain
// explicitly censored instead of becoming fabricated misses.
export function createShotCohorts(player, durationSec) {
  const windows = Array.from({ length: 3 }, () => ({ throws: 0, hits: 0,
    resolved: 0, censored: 0, hitsInTimeWindow: 0 }));
  let open = null;
  const close = hit => {
    if (open === null) return;
    windows[open].resolved++;
    if (hit) windows[open].hits++;
    open = null;
  };
  return {
    observe(events, time, ownSpearState) {
      const ownHit = events.some(event => event.type === 'HIT' && event.attacker === player);
      for (const event of events) {
        if (event.type === 'THROW' && (event.owner ?? event.player) === player) {
          close(false);
          open = thirdIndex(time, durationSec); windows[open].throws++;
        }
        if (event.type === 'HIT') {
          if (event.attacker === player) {
            windows[thirdIndex(time, durationSec)].hitsInTimeWindow++;
            close(true);
          } else if (!ownHit) close(false);
        }
        if (event.type === 'RESET') close(ownHit);
      }
      if (ownSpearState === 'HELD') close(false);
    },
    finish() {
      const result = structuredClone(windows);
      if (open !== null) result[open].censored++;
      return result.map(w => ({ ...w, hitRate: w.resolved ? w.hits / w.resolved : null,
        hitsPerMinute: w.hitsInTimeWindow * 180 / durationSec }));
    },
  };
}
