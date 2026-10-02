import { add, sub, scale, unit, distance, dot, lineDistance, legalPoint, clamp } from './math.mjs';
export function createBudget(limit = 192) {
  if (!Number.isInteger(limit) || limit < 16 || limit > 4096) throw new RangeError('cognitionBudget must be an integer from 16 to 4096');
  let spent = 0; const byKind = {};
  return { limit, get remaining() { return limit - spent; }, spend(kind, units = 1) {
    if (!Number.isInteger(units) || units < 0) throw new RangeError('invalid work cost');
    if (spent + units > limit) return false;
    spent += units; byKind[kind] = (byKind[kind] ?? 0) + units; return true;
  }, report: () => ({ limit, spent, remaining: limit - spent, byKind: { ...byKind } }) };
}
export const TACTICS = ['lead', 'direct', 'left', 'right'];
export function situation(view, belief) {
  return `${view.own.spear.state}:${view.opponent ? 'seen' : 'hidden'}:${distance(view.own.position, belief.mean) < 5 ? 'near' : 'far'}`;
}
export function createLearning(snapshot = null, ablations = {}) {
  const table = {}, awareness = {};
  // Treat persisted memory as data, never executable configuration. Ignore malformed cells.
  for (const [key, source] of Object.entries(snapshot?.table ?? {}).slice(0, 64)) {
    if (!/^(HELD|OUTBOUND|EMBEDDED|RETURNING):(seen|hidden):(near|far)$/.test(key)) continue;
    table[key] = {};
    for (const t of TACTICS) {
      const r = source?.[t] ?? {};
      table[key][t] = { n: Math.max(0, Math.min(1e6, Number.isFinite(r.n) ? r.n : 0)),
        value: clamp(Number.isFinite(r.value) ? r.value : 0, -1, 1),
        successes: Math.max(0, Number.isFinite(r.successes) ? r.successes : 0),
        modelN: Math.max(0, Number.isFinite(r.modelN) ? r.modelN : 0),
        teacherSuccesses: Math.max(0, Number.isFinite(r.teacherSuccesses) ? r.teacherSuccesses : 0),
        modelValue: clamp(Number.isFinite(r.modelValue) ? r.modelValue : 0, 0, 1) };
    }
    awareness[key] = clamp(Number.isFinite(snapshot?.awareness?.[key]) ? snapshot.awareness[key] : 0, 0, 1);
  }
  let pending = null, updates = 0;
  function row(key) { return table[key] ??= Object.fromEntries(TACTICS.map((t) => [t, { n: 0, value: 0, successes: 0, modelN: 0, modelValue: 0, teacherSuccesses: 0 }])); }
  return {
    observe(view, now) {
      if (!pending || ablations.noLearning) return null;
      const other = view.viewerId === 'P1' ? 'P2' : 'P1';
      const reward = clamp((view.scores[view.viewerId] - pending.ownScore) - (view.scores[other] - pending.otherScore), -1, 1);
      if (!reward && now - pending.time < 1.5) return null;
      const r = row(pending.key)[pending.tactic];
      r.n++; r.value += (reward - r.value) / Math.min(r.n, 12); r.successes += reward > 0 ? 1 : 0;
      r.teacherSuccesses += reward > 0 && pending.tier === 2 ? 1 : 0;
      const error = reward > 0 ? 0 : 1;
      awareness[pending.key] = (awareness[pending.key] ?? 0) * 0.75 + error * 0.25;
      const result = { ...pending, reward, actualFailure: error, predictionError: error - pending.predictedFailure };
      updates++; pending = null; return result;
    },
    select(key) {
      const entries = Object.entries(row(key)).sort((a, b) => b[1].value - a[1].value || b[1].n - a[1].n);
      const [tactic, r] = entries[0];
      return { tactic: ablations.noLearning ? 'lead' : tactic,
        automatic: !ablations.noLearning && !ablations.noAutomatization && r.n >= 4 && r.teacherSuccesses >= 2 && r.value > 0.1,
        samples: r.n, value: r.value, predictedFailure: ablations.noLearning ? 0 : awareness[key] ?? 0,
        aware: !ablations.noLearning && !ablations.noMetacog && (awareness[key] ?? 0) > 0.3 };
    },
    record(key, tactic, view, now, tier = 2) {
      if (pending || ablations.noLearning) return;
      const other = view.viewerId === 'P1' ? 'P2' : 'P1';
      pending = { key, tactic, tier, time: now, ownScore: view.scores[view.viewerId], otherScore: view.scores[other], predictedFailure: awareness[key] ?? 0 };
    },
    counterfactual(key, tactic, value) {
      if (ablations.noLearning || ablations.noCounterfactual) return;
      const r = row(key)[tactic]; r.modelN++; r.modelValue += (value - r.modelValue) / Math.min(12, r.modelN);
    },
    prior(key, tactic) { return ablations.noLearning || ablations.noCounterfactual ? 0 : row(key)[tactic].modelValue; },
    snapshot: () => structuredClone({ table, awareness }), diagnostics: () => ({ updates, pending: pending ? { ...pending } : null }),
  };
}
export function createAdaptation(snapshot = null, ablations = {}) {
  const state = { side: { a: 1, b: 1 }, drift: { x: 0, y: 0, n: 0 }, recall: { mean: 0, n: 0 }, scan: { mean: 0, n: 0 }, neutralize: { a: 1, b: 1 }, reversals: 0 };
  for (const [key, value] of Object.entries(state)) {
    if (typeof value === 'object') for (const name of Object.keys(value)) {
      const n = snapshot?.[key]?.[name];
      if (Number.isFinite(n)) value[name] = ['a', 'b'].includes(name) ? clamp(n, 1, 100) : ['x', 'y'].includes(name) ? clamp(n, -4, 4) : clamp(n, 0, 1e6);
    }
    else if (Number.isFinite(snapshot?.[key])) state[key] = clamp(snapshot[key], 0, 1e6);
  }
  let last = null, embedAt = null, lastSpear = null;
  const meanUpdate = (r, value) => { r.n++; r.mean += (value - r.mean) / Math.min(r.n, 8); };
  return {
    observe(view, now) {
      if (ablations.noLearning || ablations.noAdaptation) return;
      const spear = view.opponentSpear;
      if (spear?.state === 'EMBEDDED' && lastSpear !== 'EMBEDDED') embedAt = now;
      if (spear?.state === 'RETURNING' && lastSpear === 'EMBEDDED' && embedAt !== null) meanUpdate(state.recall, now - embedAt);
      if (!spear) embedAt = null;
      lastSpear = spear?.state ?? null;
      if (!view.opponent || (last && now - last.time < 0.2)) return;
      const o = view.opponent, toward = unit(sub(o.position, view.own.position));
      const lateral = dot(o.velocity, { x: -toward.y, y: toward.x });
      if (Math.abs(lateral) > 0.5) {
        const p = state.side.a / (state.side.a + state.side.b);
        if ((p > 0.8 && lateral < 0) || (p < 0.2 && lateral > 0)) {
          state.side.a = 1 + (state.side.a - 1) * 0.25; state.side.b = 1 + (state.side.b - 1) * 0.25; state.reversals++;
        }
        state.side.a = 1 + (state.side.a - 1) * 0.97 + (lateral > 0 ? 1 : 0);
        state.side.b = 1 + (state.side.b - 1) * 0.97 + (lateral < 0 ? 1 : 0);
      }
      state.drift.n++; state.drift.x += (o.velocity.x - state.drift.x) / Math.min(8, state.drift.n); state.drift.y += (o.velocity.y - state.drift.y) / Math.min(8, state.drift.n);
      if (last) meanUpdate(state.scan, Math.acos(clamp(dot(last.facing, o.facing), -1, 1)) / Math.max(0.01, now - last.time));
      if (view.own.spear.state === 'EMBEDDED') {
        const approaching = dot(o.velocity, unit(sub(view.own.spear.position, o.position))) > 0.5;
        state.neutralize.a = 1 + (state.neutralize.a - 1) * 0.97 + (approaching ? 1 : 0);
        state.neutralize.b = 1 + (state.neutralize.b - 1) * 0.97 + (approaching ? 0 : 1);
      }
      last = { time: now, facing: { ...o.facing } };
    },
    model(random) {
      if (ablations.noLearning || ablations.noAdaptation) return { enabled: false, confidence: 0 };
      // Integer-shape approximation to Beta posterior Thompson sampling, <=68 draws.
      const gamma = (shape) => { let sum = 0; for (let i = 0; i < Math.min(34, Math.max(1, Math.round(shape))); i++) sum -= Math.log(Math.max(1e-9, random())); return sum; };
      const a = gamma(state.side.a), b = gamma(state.side.b), p = state.side.a / (state.side.a + state.side.b);
      return { enabled: true, sideProbability: p, sampledSide: a / (a + b) > 0.5 ? 1 : -1, confidence: Math.abs(p - 0.5) * 2,
        samples: state.side.a + state.side.b - 2, drift: { ...state.drift }, recallDelay: state.recall.n ? state.recall.mean : null,
        scanRate: state.scan.mean, neutralization: state.neutralize.a / (state.neutralize.a + state.neutralize.b), reversals: state.reversals };
    }, snapshot: () => structuredClone(state),
  };
}
export function tacticTarget(tactic, view, belief, adaptation = {}) {
  const me = view.own.position, enemy = belief.mean, travel = Math.min(0.9, distance(me, enemy) / (view.physics?.outboundSpeed ?? 12) + 0.15);
  if (tactic === 'direct') return enemy;
  const v = !view.opponent && adaptation.confidence > 0.4 ? adaptation.drift : belief.velocity;
  const target = add(enemy, scale(v ?? { x: 0, y: 0 }, travel));
  if (tactic === 'lead') return target;
  const toward = unit(sub(enemy, me)), sign = tactic === 'left' ? 1 : -1;
  return legalPoint(add(target, scale({ x: -toward.y, y: toward.x }, sign * 0.8)), view.arena);
}
// Forward branches from percept hypotheses, never the privileged simulation state.
export function rolloutTactic(tactic, view, belief, adaptation, budget) {
  const target = tacticTarget(tactic, view, belief, adaptation);
  const origin = view.own.spear.state === 'EMBEDDED' ? view.own.spear.position : view.own.position;
  const embedded = view.own.spear.state === 'EMBEDDED';
  const end = embedded ? view.own.position : target;
  const direction = unit(sub(end, origin));
  const delay = embedded && tactic !== 'direct' ? 0.3 : 0;
  let hit = 0, trials = 0;
  for (const p of belief.particles.slice(0, 8)) {
    if (!budget.spend('rollout', 4)) break;
    trials++; let previous = origin;
    for (let step = 1; step <= 4; step++) {
      const t = step * 0.15 + delay;
      const projectile = add(origin, scale(direction, Math.min(embedded ? distance(origin, end) : Infinity, (embedded ? view.physics?.returnSpeed ?? 12 : view.physics?.outboundSpeed ?? 12) * (t - delay))));
      const enemy = legalPoint(add(p, scale(belief.velocity, t)), view.arena);
      if (!embedded && distance(legalPoint(projectile, view.arena, 0.01), projectile) > 0.05) break;
      if (lineDistance(enemy, previous, projectile).distance <= 0.4) { hit++; break; }
      previous = projectile;
    }
  }
  return { tactic, target, value: trials ? hit / trials : null, trials, source: 'percept-model rollout', horizonSec: 0.6 };
}
export function reflex(view) {
  const s = view.opponentSpear;
  if (!s || !['OUTBOUND', 'RETURNING'].includes(s.state)) return null;
  const direction = unit(s.direction ?? sub(view.own.position, s.position)), relative = sub(view.own.position, s.position), along = dot(relative, direction);
  if (along < 0 || along > 4 || Math.abs(relative.x * direction.y - relative.y * direction.x) > 0.65) return null;
  const side = relative.x * direction.y - relative.y * direction.x > 0 ? -1 : 1;
  return { x: -direction.y * side, y: direction.x * side };
}
