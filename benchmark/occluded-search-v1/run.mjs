// Bounded behavioral diagnostic. Importing this file never runs scored scenes.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMind } from '../../src/mind/index.mjs';
import { createCoverInterface } from '../../src/agents/cover-interface.mjs';
import { planMove } from '../../src/mind/components.mjs';
import { legalPoint, rng } from '../../src/mind/math.mjs';
import { step } from '../../src/sim.js';
import { percept } from '../../src/perception.js';
import { generateScenes, createSceneWorld, scriptedTargetInput, setupObserverInput,
  scenesDigest, SCENE_SPEC } from './scenes.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const ARMS = Object.freeze(['full', 'full-history-cut', 'conventional', 'isolated', 'isolated-belief-cut']);
export const THRESHOLDS = Object.freeze({ fullSuccessRate: .70, successAdvantage: .20,
  meanCensoredLatencyAdvantageSec: .20, bootstrapLowerBoundExclusive: 0,
  sustainedVisibleDecisions: 3, deadlineSec: 2, bootstrapDraws: 10000,
  bootstrapSeed: 0x71cb234f, workCap: 192,
  historySuccessBenefit: .10, historyLatencyBenefitSec: .10,
  interactionSuccessBenefit: .10, interactionLatencyBenefitSec: .10 });
const copy = v => structuredClone(v);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const maskWeapons = c => ({ ...c, throw: false, recall: false });
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;

export function createConventionalTracker() {
  let last = null, decisions = 0;
  return {
    settings: () => ({ controller: 'conventional-constant-velocity-search-v1', workCap: 192,
      nominalWorkUnits: 16, accounting: 'declared logical units, not total operation or runtime equality' }),
    act(view) {
      decisions++;
      const now = view.time.elapsedSec, own = view.own.position;
      if (view.opponent) last = { position: { ...view.opponent.position },
        velocity: { ...view.opponent.velocity }, time: now };
      const target = last ? legalPoint({ x: last.position.x + last.velocity.x * (now - last.time),
        y: last.position.y + last.velocity.y * (now - last.time) }, view.arena) :
        { x: own.x > 0 ? -2 : 2, y: Math.sin(now * .4) * 3 };
      const move = planMove(own, target, view.arena);
      const angle = now * Math.PI * .7;
      const gaze = last ? { x: target.x - own.x, y: target.y - own.y } :
        { x: Math.cos(angle), y: Math.sin(angle) };
      return { moveX: move.x, moveY: move.y, aimX: gaze.x, aimY: gaze.y, throw: false, recall: false };
    },
    lastDecision: () => ({ serial: decisions, focus: 'Conventional search', cognition: {
      tier: 1, budget: { limit: 192, spent: 16 }, coordination: null } }),
    trace: () => [],
  };
}

// Existing controls only: no added target memory, search, route, or objective policy.
export function createAssayEngine(arm, seed) {
  if (!ARMS.includes(arm)) throw new RangeError('unknown assay arm');
  if (arm === 'conventional') return createConventionalTracker();
  const isolated = arm.startsWith('isolated'), cut = arm.endsWith('-cut');
  const ablations = isolated ? { noToM: true } : {};
  const engine = createMind({ seed, ablations, benchmarkInterface: true, deferCommand: true,
    captureTrace: true, captureDiagnostics: true, cognitionBudget: 192,
    ...(isolated ? { coordinationEnabled: false, freezeLearning: true } : {}) });
  return { ...engine, act(view, dt) {
    const hiddenCut = cut && !view.opponent;
    ablations.noBelief = hiddenCut;
    if (!isolated) {
      ablations.noToM = hiddenCut; ablations.noAdaptation = hiddenCut;
      engine.setCoordinationControls(hiddenCut ? { memoryRead: false,
        deliver: { attention: false, planner: false }, monitorControl: false } : {});
    }
    return engine.act(view, dt);
  } };
}

export const FRAME_FIELDS = Object.freeze(['receiptTick', 'sensorTick', 'bodyVisible',
  'ownX', 'ownY', 'ownFacingX', 'ownFacingY', 'observedTargetX', 'observedTargetY',
  'intentMoveX', 'intentMoveY', 'intentAimX', 'intentAimY', 'intentThrow', 'intentRecall',
  'executedMoveX', 'executedMoveY', 'executedAimX', 'executedAimY',
  'focus', 'beliefX', 'beliefY', 'beliefConfidence', 'episodicReadDelivered',
  'attentionContentDelivered', 'plannerContentDelivered', 'hiddenCut', 'logicalWork', 'tier',
  'physicalBodyVisible', 'physicalOwnX', 'physicalOwnY', 'physicalTargetX', 'physicalTargetY']);

export function runScene(scene, arm, { history = true, mode = 'MODE_B' } = {}) {
  const world = createSceneWorld(scene), engine = createAssayEngine(arm, scene.seed);
  const records = [];
  let tick = 0, serial = -1, streak = 0, successTick = null, firstReacquisitionTick = null;
  const controller = {
    settings: () => engine.settings(),
    act(view, dt) {
      const intent = engine.act(view, dt), diagnostic = engine.lastDecision();
      if (diagnostic.cognition.tier === 0) throw new Error('assay unexpectedly entered reflex');
      if (diagnostic.cognition.budget.spent > THRESHOLDS.workCap) throw new Error('work cap exceeded');
      serial++;
      records.push({ tick, view, intent: copy(intent), diagnostic, executed: null,
        physical: { bodyVisible: !!percept(world, scene.seat, mode).opponent,
          own: copy(world.players[scene.observerIndex].position),
          target: copy(world.players[scene.targetIndex].position) } });
      if (tick === scene.releaseTick && mode === 'MODE_B' && view.opponent)
        throw new Error('release must begin with the first delayed missing body');
      if (tick >= scene.releaseTick) {
        streak = view.opponent ? streak + 1 : 0;
        if (view.opponent && firstReacquisitionTick === null) firstReacquisitionTick = tick;
        if (streak >= THRESHOLDS.sustainedVisibleDecisions && successTick === null) successTick = tick;
      }
      return tick < scene.releaseTick ? setupObserverInput(scene, world) : maskWeapons(intent);
    },
    commitCommand(command, view, receiptTime) {
      const actual = tick < scene.releaseTick ? setupObserverInput(scene, world) : maskWeapons(command);
      engine.commitCommand?.(actual, view, receiptTime);
      records[serial].executed = copy(actual);
    },
  };
  const embodied = createCoverInterface(controller, { seed: scene.seed });
  const endTick = scene.releaseTick + scene.searchTicks;
  for (tick = 0; tick <= endTick; tick++) {
    let packet = percept(world, scene.seat, mode);
    if (!history && tick < scene.firstMissingSampleTick)
      packet = { ...packet, opponent: null, opponentSpear: null };
    const output = embodied.act(packet);
    if (tick === endTick) break;
    const actions = [{}, {}];
    actions[scene.observerIndex] = tick < scene.releaseTick ? setupObserverInput(scene, world) : maskWeapons(output);
    actions[scene.targetIndex] = scriptedTargetInput(scene, tick);
    const events = step(world, actions);
    if (events.some(e => e.type === 'HIT' || e.type === 'RESET')) throw new Error('unexpected combat event');
  }
  const traces = engine.trace();
  const frames = records.map((r, index) => {
    const v = r.view, d = r.diagnostic, t = traces[index], c = d.cognition.coordination;
    return [r.tick, Math.round(v.time.elapsedSec * 120), +!!v.opponent,
      v.own.position.x, v.own.position.y, v.own.facing.x, v.own.facing.y,
      v.opponent?.position.x ?? null, v.opponent?.position.y ?? null,
      r.intent.moveX, r.intent.moveY, r.intent.aimX, r.intent.aimY, +!!r.intent.throw, +!!r.intent.recall,
      r.executed.moveX, r.executed.moveY, r.executed.aimX, r.executed.aimY,
      d.focus, t?.belief.mean.x ?? null, t?.belief.mean.y ?? null, t?.confidence.opponent ?? null,
      +!!c?.recalled, +!!c?.receivers?.attention?.delivered, +!!c?.receivers?.planner?.delivered,
      +(arm.endsWith('-cut') && !v.opponent), d.cognition.budget.spent, d.cognition.tier,
      +r.physical.bodyVisible, r.physical.own.x, r.physical.own.y, r.physical.target.x, r.physical.target.y];
  });
  const latency = successTick === null ? THRESHOLDS.deadlineSec : (successTick - scene.releaseTick) / 120;
  return { sceneId: scene.id, clusterId: scene.clusterId, arm, history, mode,
    condition: mode === 'MODE_A' ? 'always-visible' : history ? 'scored' : 'never-observed',
    success: successTick !== null, successTick, firstReacquisitionTick,
    censoredLatencySec: latency, releaseTick: scene.releaseTick, endTick,
    initialVisibleDecisionCount: frames.filter(f => f[0] < scene.releaseTick && f[2]).length,
    maxWork: Math.max(...frames.map(f => f[27])), meanWork: mean(frames.map(f => f[27])),
    finalPosition: copy(world.players[scene.observerIndex].position), frames };
}

function quantile(values, p) {
  const sorted = [...values].sort((a, b) => a - b), index = (sorted.length - 1) * p;
  const lo = Math.floor(index); return sorted[lo] + (sorted[Math.ceil(index)] - sorted[lo]) * (index - lo);
}
function bootstrapInterval(pairs) {
  const strata = [...new Set(pairs.map(p => p.stratum))].map(stratum =>
    [...new Set(pairs.filter(p => p.stratum === stratum).map(p => p.cluster))].map(cluster => {
      const p = pairs.filter(p => p.cluster === cluster);
      return { latency: mean(p.map(x => x.latency)), success: mean(p.map(x => x.success)) };
    }));
  const random = rng(THRESHOLDS.bootstrapSeed), bootstrap = [];
  for (let i = 0; i < THRESHOLDS.bootstrapDraws; i++) {
    const sample = strata.flatMap(s => s.map(() => s[Math.floor(random() * s.length)]));
    bootstrap.push(mean(sample.map(x => x.latency)));
  }
  return [quantile(bootstrap, .025), quantile(bootstrap, .975)];
}
function pairedContrast(rows, intact, cut, scenes) {
  const pairs = scenes.map(s => {
    const a = rows.find(r => r.sceneId === s.id && r.arm === intact);
    const b = rows.find(r => r.sceneId === s.id && r.arm === cut);
    return { cluster: s.clusterId, stratum: `${s.entrance}-${s.observerSide}`,
      latency: b.censoredLatencySec - a.censoredLatencySec, success: +a.success - +b.success };
  });
  return { intact, cut, successAdvantage: mean(pairs.map(p => p.success)),
    meanCensoredLatencyAdvantageSec: mean(pairs.map(p => p.latency)),
    latency95PctClusterBootstrap: bootstrapInterval(pairs),
    intactOnlySuccesses: pairs.filter(p => p.success > 0).length,
    cutOnlySuccesses: pairs.filter(p => p.success < 0).length };
}

export function summarize(rows, scenes) {
  const expected = scenes.flatMap(s => [
    ...ARMS.map(arm => `${s.id}|scored|${arm}`),
    ...['never-observed', 'always-visible'].flatMap(condition =>
      ['full', 'full-history-cut'].map(arm => `${s.id}|${condition}|${arm}`)),
  ]).sort();
  const actual = rows.map(r => `${r.sceneId}|${r.condition}|${r.arm}`).sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error('missing, duplicate, or unexpected episode rows');
  const scored = rows.filter(r => r.condition === 'scored');
  const negative = rows.filter(r => r.condition === 'never-observed');
  const alwaysVisible = rows.filter(r => r.condition === 'always-visible');
  const byArm = Object.fromEntries(ARMS.map(arm => {
    const rs = scored.filter(r => r.arm === arm);
    return [arm, { n: rs.length, successes: rs.filter(r => r.success).length,
      successRate: mean(rs.map(r => +r.success)), meanCensoredLatencySec: mean(rs.map(r => r.censoredLatencySec)),
      meanWork: mean(rs.map(r => r.meanWork)), maxWork: Math.max(...rs.map(r => r.maxWork)) }];
  }));
  const primary = pairedContrast(scored, 'full', 'full-history-cut', scenes);
  const secondary = pairedContrast(scored, 'isolated', 'isolated-belief-cut', scenes);
  const conventionalComparison = pairedContrast(scored, 'full', 'conventional', scenes);
  const negativeContrast = pairedContrast(negative, 'full', 'full-history-cut', scenes);
  const historyPairs = scenes.map(s => {
    const full = scored.find(r => r.sceneId === s.id && r.arm === 'full');
    const absent = negative.find(r => r.sceneId === s.id && r.arm === 'full');
    return { cluster: s.clusterId, stratum: `${s.entrance}-${s.observerSide}`,
      success: +full.success - +absent.success,
      latency: absent.censoredLatencySec - full.censoredLatencySec };
  });
  const interactions = scenes.map(s => {
    const r = (set, arm) => set.find(r => r.sceneId === s.id && r.arm === arm);
    const a = r(scored, 'full'), b = r(scored, 'full-history-cut');
    const c = r(negative, 'full'), d = r(negative, 'full-history-cut');
    return { cluster: s.clusterId, stratum: `${s.entrance}-${s.observerSide}`,
      success: (+a.success - +b.success) - (+c.success - +d.success),
      latency: (b.censoredLatencySec - a.censoredLatencySec) - (d.censoredLatencySec - c.censoredLatencySec) };
  });
  const historyBenefit = { successAdvantage: mean(historyPairs.map(p => p.success)),
    meanCensoredLatencyAdvantageSec: mean(historyPairs.map(p => p.latency)),
    latency95PctClusterBootstrap: bootstrapInterval(historyPairs) };
  const historyInteraction = { successAdvantage: mean(interactions.map(p => p.success)),
    meanCensoredLatencyAdvantageSec: mean(interactions.map(p => p.latency)),
    latency95PctClusterBootstrap: bootstrapInterval(interactions) };
  const alwaysVisibleParity = scenes.every(s => {
    const rs = alwaysVisible.filter(r => r.sceneId === s.id);
    return rs.length === 2 && JSON.stringify(rs[0].frames) === JSON.stringify(rs[1].frames);
  });
  const fullFunctionalGate = byArm.full.successRate >= THRESHOLDS.fullSuccessRate &&
    primary.successAdvantage >= THRESHOLDS.successAdvantage &&
    primary.meanCensoredLatencyAdvantageSec >= THRESHOLDS.meanCensoredLatencyAdvantageSec &&
    primary.latency95PctClusterBootstrap[0] > THRESHOLDS.bootstrapLowerBoundExclusive;
  const historyAttributionGate = historyBenefit.successAdvantage >= THRESHOLDS.historySuccessBenefit &&
    historyBenefit.meanCensoredLatencyAdvantageSec >= THRESHOLDS.historyLatencyBenefitSec &&
    historyInteraction.successAdvantage >= THRESHOLDS.interactionSuccessBenefit &&
    historyInteraction.meanCensoredLatencyAdvantageSec >= THRESHOLDS.interactionLatencyBenefitSec &&
    historyInteraction.latency95PctClusterBootstrap[0] > 0;
  const conventionalSuperiorityGate = conventionalComparison.successAdvantage >= THRESHOLDS.successAdvantage &&
    conventionalComparison.meanCensoredLatencyAdvantageSec >= THRESHOLDS.meanCensoredLatencyAdvantageSec &&
    conventionalComparison.latency95PctClusterBootstrap[0] > 0;
  return { episodeCount: rows.length, byArm, primary, secondary, conventionalComparison, conventionalSuperiorityGate,
    fullFunctionalGate, historyAttributionGate, alwaysVisibleParity,
    positiveCriterionMet: fullFunctionalGate && historyAttributionGate && alwaysVisibleParity,
    neverObservedContrast: negativeContrast, historyBenefit, historyInteraction,
    neverObservedByArm: Object.fromEntries(['full', 'full-history-cut'].map(arm => {
      const rs = negative.filter(r => r.arm === arm);
      return [arm, { n: rs.length, successes: rs.filter(r => r.success).length,
        successRate: mean(rs.map(r => +r.success)), meanCensoredLatencySec: mean(rs.map(r => r.censoredLatencySec)) }];
    })),
    interpretation: 'Narrow generated corner-search assay; broad history-path intervention; no consciousness or general gameplay claim' };
}

function sourcePaths() {
  function walk(dir) { return readdirSync(resolve(ROOT, dir), { withFileTypes: true }).flatMap(x =>
    x.isDirectory() ? walk(`${dir}/${x.name}`) : [`${dir}/${x.name}`]); }
  return [...walk('src'), 'benchmark/occluded-search-v1/run.mjs',
    'benchmark/occluded-search-v1/scenes.mjs', 'benchmark/occluded-search-v1/protocol.md',
    'test/cover-mind.test.mjs', 'test/occluded-search.test.mjs'].sort();
}
export function makeFreeze() {
  return { version: 1, sourceBase: '91f0d7aefb756f96042c5424d498a2bfcbb6fae6',
    scenesDigest: scenesDigest(), thresholds: THRESHOLDS,
    files: Object.fromEntries(sourcePaths().map(p => [p, sha(readFileSync(resolve(ROOT, p)))])) };
}
function verifyFreeze(path) {
  const frozen = JSON.parse(readFileSync(path)), current = makeFreeze();
  if (JSON.stringify(frozen) !== JSON.stringify(current)) throw new Error('source/protocol/scenes freeze mismatch');
  return frozen;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args[0] === '--freeze' && args.length === 2) {
    writeFileSync(args[1], JSON.stringify(makeFreeze(), null, 2) + '\n');
    console.log(`Frozen source and geometry to ${args[1]}; no policies run`);
  } else if (args[0] === '--run' && args.length === 4 && /^[0-9a-f]{40}$/.test(args[3])) {
    const frozen = verifyFreeze(args[1]), out = resolve(args[2]), scenes = generateScenes();
    mkdirSync(out, { recursive: true });
    const rawPath = resolve(out, 'raw.jsonl');
    writeFileSync(rawPath, JSON.stringify({ record: 'header', version: SCENE_SPEC.version,
      runtime: process.version, sourceCommit: args[3], freezeSha256: sha(readFileSync(args[1])),
      frameFields: FRAME_FIELDS, sceneDigest: frozen.scenesDigest, thresholds: THRESHOLDS, scenes }) + '\n', { flag: 'wx' });
    const rows = [];
    for (const scene of scenes) for (const arm of ARMS) {
      const row = runScene(scene, arm); rows.push(row);
      appendFileSync(rawPath, JSON.stringify({ record: 'episode', ...row }) + '\n');
    }
    for (const scene of scenes) for (const arm of ['full', 'full-history-cut']) {
      const row = runScene(scene, arm, { history: false }); rows.push(row);
      appendFileSync(rawPath, JSON.stringify({ record: 'negative-control', ...row }) + '\n');
    }
    for (const scene of scenes) for (const arm of ['full', 'full-history-cut']) {
      const row = runScene(scene, arm, { mode: 'MODE_A' }); rows.push(row);
      appendFileSync(rawPath, JSON.stringify({ record: 'always-visible-control', ...row }) + '\n');
    }
    const summary = { sourceCommit: args[3], freezeSha256: sha(readFileSync(args[1])),
      rawSha256: sha(readFileSync(rawPath)), sceneDigest: frozen.scenesDigest, ...summarize(rows, scenes) };
    writeFileSync(resolve(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify(summary, null, 2));
  } else console.log('Usage: node benchmark/occluded-search-v1/run.mjs --freeze FREEZE.json\n' +
    '       node benchmark/occluded-search-v1/run.mjs --run FREEZE.json OUT_DIR VERIFIED_SOURCE_COMMIT');
}
