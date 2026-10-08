import * as sim from '../src/sim.js';
import { percept, isVisible } from '../src/perception.js';
import { createMind } from '../src/mind/index.mjs';
import { STRATEGIES } from '../src/agents/strategies.mjs';
import { distance } from '../src/mind/math.mjs';

export const game = { ...sim, percept };
export const playerIds = ['P1', 'P2'];
export const modes = ['MODE_A', 'MODE_B'];
export const defaultPolicy = 'tuned';
export const metricVersion = 'tether-phase2-v1-reset-safe';
export const simHz = (constants) => constants.technical.SIM_HZ;
export const boutSeconds = (constants) => constants.experiment.BOUT_SECONDS;
export const score = (world) => ({ P1: world.players[0].score, P2: world.players[1].score });
export const elapsed = (world) => world.elapsedSec;
export const ended = (world) => world.ended;

const variantDefinitions = [
  ...['easy', 'normal', 'hard'].map((difficulty) => ({ name: `mind-${difficulty}`, difficulty })),
  ...['noBelief', 'noPrediction', 'singleUtility', 'noWorkspace', 'noHysteresis',
    'noMetacog', 'noAttentionSchema', 'noToM'].map((ablation) =>
    ({ name: `ablate-${ablation}`, difficulty: 'normal', ablation })),
  ...Object.keys(STRATEGIES).map((name) => ({ name })),
];
export function variantsForPolicy(policy = 'tuned') {
  return variantDefinitions.map((variant) => STRATEGIES[variant.name] ? variant : ({ ...variant,
    technical: createMind({ difficulty: variant.difficulty,
      ablations: variant.ablation ? { [variant.ablation]: true } : {},
      captureTrace: false, policy }).settings() }));
}
export const variants = variantsForPolicy();
export function isKeyPair(a, b) {
  return a.name === 'mind-normal' || b.name === 'mind-normal' ||
    [a.name, b.name].sort().join('/') === 'embedWaiter/immediateRecaller';
}
export function makeAgent(variant, seed, policy = 'tuned') {
  if (STRATEGIES[variant.name]) return STRATEGIES[variant.name]();
  return createMind({ seed, difficulty: variant.difficulty,
    ablations: variant.ablation ? { [variant.ablation]: true } : {},
    captureTrace: false, policy });
}

export function startMetrics() {
  return {
    throws: [0, 0], outboundHits: [0, 0], returningHits: [0, 0],
    elapsed: 0, embeds: [[], []], open: [null, null], delays: [[], []],
    secondLocation: [0, 0], neutralizations: [0, 0],
    lookAwaySec: [0, 0], lookAwayHit: [0, 0],
    reversals: [0, 0], previousVisible: [true, true],
    lookedAwayAt: [-Infinity, -Infinity], previousPosition: [null, null],
    previousFacing: [null, null], previousTurnSign: [0, 0],
    lastReversalAt: [-Infinity, -Infinity],
  };
}

function closeEmbed(m, i, now) {
  const e = m.open[i];
  if (!e) return;
  if (now - e.time > 2 && e.path >= 2 && e.maxDisplacement >= 1) m.secondLocation[i]++;
  m.open[i] = null;
}

export function observeStep(m, { world, events, dt }) {
  m.elapsed += dt;
  const reset = events.some((event) => event.type === 'RESET');
  const hit = events.find((event) => event.type === 'HIT');
  const preReset = hit ? {
    [hit.attacker]: hit.attacker_pos,
    [hit.victim]: hit.victim_pos,
  } : null;
  for (let i = 0; i < 2; i++) {
    const p = world.players[i];
    const e = m.open[i];
    const pathPosition = reset ? preReset?.[p.id] ?? m.previousPosition[i] ?? p.position :
      p.position;
    if (e) {
      if (m.previousPosition[i]) e.path += distance(pathPosition, m.previousPosition[i]);
      e.maxDisplacement = Math.max(e.maxDisplacement, distance(pathPosition, e.start));
    }
    m.previousPosition[i] = { ...p.position };
    const visible = isVisible(p.position, p.facing, world.players[1 - i].position);
    if (!visible) m.lookAwaySec[i] += dt;
    if (m.previousVisible[i] && !visible) m.lookedAwayAt[i] = m.elapsed;
    m.previousVisible[i] = visible;
    const facingAngle = Math.atan2(p.facing.y, p.facing.x);
    if (!reset && m.previousFacing[i] !== null) {
      const turn = Math.atan2(Math.sin(facingAngle - m.previousFacing[i]),
        Math.cos(facingAngle - m.previousFacing[i]));
      const sign = turn > 0.002 ? 1 : turn < -0.002 ? -1 : 0;
      if (sign && m.previousTurnSign[i] && sign !== m.previousTurnSign[i] &&
          m.elapsed - m.lastReversalAt[i] >= 0.15) {
        m.reversals[i]++; m.lastReversalAt[i] = m.elapsed;
      }
      if (sign) m.previousTurnSign[i] = sign;
    }
    m.previousFacing[i] = facingAngle;
  }
  for (const event of events) {
    const owner = event.owner ?? event.player ?? event.spear_owner ?? event.attacker;
    const i = owner === 'P1' ? 0 : 1;
    if (event.type === 'THROW') m.throws[i]++;
    if (event.type === 'HIT') {
      if (event.phase === 'OUTBOUND') m.outboundHits[i]++;
      else if (event.phase === 'RETURNING') m.returningHits[i]++;
    }
    if (event.type === 'EMBED') {
      m.embeds[i].push(m.elapsed);
      m.open[i] = { time: m.elapsed, start: { ...world.players[i].position },
        path: 0, maxDisplacement: 0 };
    }
    if (event.type === 'RECALL_START') {
      if (m.open[i]) m.delays[i].push(m.elapsed - m.open[i].time);
      closeEmbed(m, i, m.elapsed);
    }
    if (event.type === 'SPEAR_NEUTRALIZED') {
      const neutralizer = event.neutralizer === 'P1' ? 0 : 1;
      m.neutralizations[neutralizer]++;
      closeEmbed(m, i, m.elapsed);
    }
    if (event.type === 'HIT') {
      const victim = event.victim === 'P1' ? 0 : 1;
      if (m.elapsed - m.lookedAwayAt[victim] <= 1) m.lookAwayHit[victim]++;
    }
    if (event.type === 'RESET') {
      for (let j = 0; j < 2; j++) {
        closeEmbed(m, j, m.elapsed);
        m.previousTurnSign[j] = 0;
        m.lookedAwayAt[j] = -Infinity;
      }
    }
  }
}

export function finishMetrics(m) {
  for (let i = 0; i < 2; i++) closeEmbed(m, i, m.elapsed);
  return {
    throws: m.throws, outboundHits: m.outboundHits,
    returningHits: m.returningHits,
    embedCounts: m.embeds.map((v) => v.length),
    embedToRecallDelays: m.delays,
    secondLocation: m.secondLocation,
    neutralizations: m.neutralizations,
    lookAwaySec: m.lookAwaySec,
    scanReversals: m.reversals,
    hitsWithinOneSecLookAway: m.lookAwayHit,
  };
}

const quantile = (values, p) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * p)];
};
const percent = (value) => value === null ? '—' : `${(value * 100).toFixed(1)}%`;

export function compactResult(row) {
  return { ...row, metrics: { ...row.metrics,
    embedToRecallDelays: row.metrics.embedToRecallDelays.map((values) => ({
      n: values.length, p25: quantile(values, 0.25),
      median: quantile(values, 0.5), p75: quantile(values, 0.75),
      p90: quantile(values, 0.9) })) } };
}

function aggregate(rows, variants, name) {
  let embeds = 0, secondLocation = 0, neutralizations = 0, lookAway = 0,
    reversals = 0, hits = 0, seconds = 0;
  const delays = [];
  for (const row of rows) {
    const i = variants[row.first].name === name ? 0 : 1;
    const metric = row.metrics;
    embeds += metric.embedCounts[i];
    secondLocation += metric.secondLocation[i];
    neutralizations += metric.neutralizations[i];
    lookAway += metric.lookAwaySec[i];
    reversals += metric.scanReversals[i];
    hits += metric.hitsWithinOneSecLookAway[i];
    delays.push(...metric.embedToRecallDelays[i]);
    seconds += row.elapsedSec;
  }
  return { embeds,
    secondLocationFraction: embeds ? secondLocation / embeds : null,
    neutralizationsPerBout: rows.length ? neutralizations / rows.length : 0,
    lookAwayFraction: seconds ? lookAway / seconds : 0,
    scanReversalsPerMinute: seconds ? reversals * 60 / seconds : 0,
    hitsWithinOneSecLookAwayPerBout: rows.length ? hits / rows.length : 0,
    embedToRecallDelaySec: { n: delays.length, p25: quantile(delays, 0.25),
      median: quantile(delays, 0.5), p75: quantile(delays, 0.75),
      p90: quantile(delays, 0.9) } };
}

export function summarizeBehavior(results, variants) {
  const byVariant = {}, byMode = {};
  for (const variant of variants) {
    const all = results.filter((row) => variants[row.first].name === variant.name ||
      variants[row.second].name === variant.name);
    byVariant[variant.name] = aggregate(all, variants, variant.name);
    for (const mode of modes) {
      const selected = all.filter((row) => row.mode === mode);
      const metric = aggregate(selected, variants, variant.name);
      byMode[`${variant.name} ${mode}`] = { bouts: selected.length,
        secondLocationFraction: metric.secondLocationFraction,
        neutralizationsPerBout: metric.neutralizationsPerBout,
        lookAwayFraction: metric.lookAwayFraction,
        scanReversalsPerMinute: metric.scanReversalsPerMinute,
        hitsWithinOneSecLookAwayPerBout: metric.hitsWithinOneSecLookAwayPerBout };
    }
  }
  return { byVariant, byMode };
}

export function behaviorMarkdown(summary) {
  const lines = ['## Tether behavior', '',
    '| Variant | Embeds | Second location | Neutralizations/bout | Look away | Reversals/min | Hit after look away/bout | Recall delay p50/p90 (s) |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'];
  for (const [name, v] of Object.entries(summary.variants)) {
    const d = v.embedToRecallDelaySec;
    lines.push(`| ${name} | ${v.embeds} | ${percent(v.secondLocationFraction)} | ${v.neutralizationsPerBout.toFixed(2)} | ${percent(v.lookAwayFraction)} | ${v.scanReversalsPerMinute.toFixed(1)} | ${v.hitsWithinOneSecLookAwayPerBout.toFixed(2)} | ${d.median?.toFixed(2) ?? '—'}/${d.p90?.toFixed(2) ?? '—'} |`);
  }
  lines.push('', '## Tether behavior by mode', '',
    '| Variant and mode | Second location | Neutralizations/bout | Look away | Reversals/min | Hit after look away/bout | n |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const [name, v] of Object.entries(summary.byMode))
    lines.push(`| ${name} | ${percent(v.secondLocationFraction)} | ${v.neutralizationsPerBout.toFixed(2)} | ${percent(v.lookAwayFraction)} | ${v.scanReversalsPerMinute.toFixed(1)} | ${v.hitsWithinOneSecLookAwayPerBout.toFixed(2)} | ${v.bouts} |`);
  lines.push('', 'Second location: an embed remains for more than 2 s before recall, neutralization, reset, or bout end, while its owner travels at least 2 u of path and reaches at least 1 u from the embed-time body position. Denominator: all embeds. Reversals count facing turn-sign changes separated by at least 0.15 s. Look-away uses the physical 120° cone in both modes. A look-away hit is a HIT on the viewer within 1 s after a visible-to-hidden transition.', '');
  return lines.join('\n');
}
