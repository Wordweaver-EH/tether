import { createMind } from '../src/mind/index.mjs';
import * as base from './tether-adapter.mjs';
import { createParamAgent, decodePolicy, POLICY_SEEDS, PARAMETERS } from '../src/agents/param.mjs';
import { reactiveDodger } from '../src/agents/dodger.mjs';
import { STRATEGIES } from '../src/agents/strategies.mjs';

export const conditions = Object.freeze({
  baseline: {},
  recall8: { RETURN_SPEED: 8 },
  recall6: { RETURN_SPEED: 6 },
  outbound8: { OUTBOUND_SPEED: 8 },
  move5: { PLAYER_SPEED: 5 },
  turn270: { TURN_RATE_RAD: 1.5 * Math.PI },
});
export const opponents = Object.freeze([...Object.keys(STRATEGIES), 'reactiveDodger', 'mind-tuned']);
export const policy = { dimension: PARAMETERS.length, seeds: POLICY_SEEDS,
  names: PARAMETERS.map((x) => x[0]), interpret: decodePolicy };
export const metricVersion = 'tether-phase4a-v2-balanced-reset-safe';
export const validationSeconds = 300;
export const adapter = base;
export function summarizeSearchMetrics(rows, name) {
  const metrics = { throws: 0, embeds: 0, outboundHits: 0,
    returningHits: 0, secondLocation: 0 };
  for (const row of rows) {
    const i = row.first.name === name ? 0 : 1;
    metrics.throws += row.metrics.throws[i];
    metrics.embeds += row.metrics.embedCounts[i];
    metrics.outboundHits += row.metrics.outboundHits[i];
    metrics.returningHits += row.metrics.returningHits[i];
    metrics.secondLocation += row.metrics.secondLocation[i];
  }
  return { ...metrics,
    directHitShare: metrics.outboundHits /
      (metrics.outboundHits + metrics.returningHits || 1),
    embedShare: metrics.embeds / (metrics.throws || 1),
    secondLocationFraction: metrics.secondLocation / (metrics.embeds || 1) };
}
export function gameFor(condition) {
  const experiment = conditions[condition];
  if (!experiment) throw new RangeError(`unknown condition: ${condition}`);
  return { ...base.game, createWorld: (config) =>
    base.game.createWorld({ ...config, experiment }) };
}
export function makeSearchAgent(spec, seed, condition = 'baseline') {
  if (spec.kind === 'named' && spec.name === 'mind-tuned')
    return createMind({ seed, difficulty: 'normal', policy: 'tuned', captureTrace: false,
      outboundSpeed: conditions[condition].OUTBOUND_SPEED ?? 12,
      returnSpeed: conditions[condition].RETURN_SPEED ?? 12 });
  if (spec.kind === 'policy') return createParamAgent(spec.vector, { seed,
    outboundSpeed: conditions[condition].OUTBOUND_SPEED ?? 12,
    returnSpeed: conditions[condition].RETURN_SPEED ?? 12 });
  if (spec.kind === 'named' && spec.name === 'reactiveDodger')
    return reactiveDodger();
  if (spec.kind === 'named' && STRATEGIES[spec.name]) {
    const o = conditions[condition];
    return STRATEGIES[spec.name](o.RETURN_SPEED || o.OUTBOUND_SPEED ? {
      outboundSpeed: o.OUTBOUND_SPEED ?? 12, returnSpeed: o.RETURN_SPEED ?? 12 } : null);
  }
  throw new RangeError(`unknown agent: ${JSON.stringify(spec)}`);
}
