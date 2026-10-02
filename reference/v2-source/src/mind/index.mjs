import { createBelief } from './belief.mjs';
import { specialists, singleUtility } from './specialists.mjs';
import { createWorkspace } from './workspace.mjs';
import { createAttentionSchema, createAffect, createMemory, createReflection,
  createSpeech, planMove, planGaze } from './components.mjs';
import { rng, point, add, clamp, dot, unit, sub } from './math.mjs';
import { createOwnSpearMemory } from './own-spear.mjs';

export const ABLATION_FLAGS = ['noBelief', 'noPrediction', 'singleUtility', 'noWorkspace',
  'noHysteresis', 'noMetacog', 'noAttentionSchema', 'noToM',
  'noReflex', 'noIntuition', 'noDeliberation', 'noLearning', 'noAutomatization',
  'noAdaptation', 'noCounterfactual', 'noAffect'];
import { createBudget, createLearning, createAdaptation, situation, TACTICS,
  tacticTarget, rolloutTactic, reflex } from './cognition.mjs';

const EMPTY = () => ({ moveX: 0, moveY: 0, aimX: 0, aimY: 0,
  throw: false, recall: false });

function settings(difficulty) {
  if (typeof difficulty === 'number' && !Number.isFinite(difficulty))
    throw new RangeError('difficulty must be finite');
  const level = typeof difficulty === 'number' ? clamp(difficulty, 0, 1) :
    ({ easy: 0, normal: 0.5, medium: 0.5, hard: 1 })[difficulty ?? 'normal'];
  if (level === undefined) throw new RangeError('difficulty must be easy, normal, hard, or 0..1');
  return { difficulty: level, latencySec: 0.2 - level * 0.1,
    baseAimNoise: 0.055 - level * 0.042,
    speedAimNoise: 0.012 - level * 0.009,
    throwConfidence: 0.63 - level * 0.31,
    throwAngleRad: 0.09 + level * 0.035 };
}

export function createMind({ seed = 1, difficulty = 'normal', ablations = {},
  captureTrace = true, memorySnapshot = null, policy = 'tuned', cognitionBudget = 192, outboundSpeed = 12, returnSpeed = 12 } = {}) {
  if (policy !== 'tuned' && policy !== 'baseline')
    throw new RangeError('policy must be tuned or baseline');
  for (const key of Object.keys(ablations)) {
    if (!ABLATION_FLAGS.includes(key)) throw new RangeError(`unknown ablation: ${key}`);
  }
  createBudget(cognitionBudget);
  if (![outboundSpeed,returnSpeed].every(n => Number.isFinite(n) && n > 0 && n <= 100))
    throw new RangeError('spear speeds must be finite, positive and at most 100');
  const random = rng(seed), learningRandom = rng((seed ^ 0x5a71c3) >>> 0);
  const particleCount = Math.min(48, Math.max(4, Math.floor((cognitionBudget - 8) / 4)));
  const learning = createLearning(memorySnapshot?.learning, ablations);
  const adaptation = createAdaptation(memorySnapshot?.adaptation, ablations);
  const totals = { cycles: 0, budgetSpent: 0, budgetLimit: cognitionBudget, maxBudgetSpent: 0, escalations: 0,
    reflexes: 0, automaticDecisions: 0, learningUpdates: 0, counterfactualBranches: 0,
    decisionLatencySec: 0, bySituation: {} };
  const config = settings(difficulty);
  const belief = createBelief(random, ablations, particleCount);
  const workspace = createWorkspace(ablations);
  const attention = createAttentionSchema(ablations);
  const affect = createAffect();
  const memory = createMemory();
  memory.load(memorySnapshot);
  const reflection = createReflection();
  const speech = createSpeech();
  const ownSpearMemory = createOwnSpearMemory({ outboundSpeed, returnSpeed });
  const records = [];
  let tick = 0, recallPlan = null, cachedBelief = null;
  let queue = [];
  let output = EMPTY();
  let previousSpearState = 'HELD';
  let embedSince = -Infinity, lastThrowAt = -Infinity, lastVisibleAt = -Infinity;
  const model = { ...config, outboundSpeed, returnSpeed, previousGazeAngle: 0, opponentAttention: null,
    scanTarget: point(0, 0), searchTarget: point(0, 0),
    embedAge: 0, unseenFor: 0, timeSinceThrow: Infinity, orbitSign: -1,
    policy };

  function cycle(view) {
    const now = view.time.elapsedSec;
    const budget = createBudget(cognitionBudget);
    budget.spend('control', 8);

    const visibleOwnSpear = !!view.own.spear;
    const rememberedSpear = ownSpearMemory.observe(view);
    view = { ...view, physics: { outboundSpeed, returnSpeed }, own: { ...view.own, spear: rememberedSpear },
      ownSpearVisible: visibleOwnSpear };
    if (!ablations.noLearning) memory.observePercept(view, now);
    const outcome = learning.observe(view, now);
    adaptation.observe(view, now);
    const opponentModel = adaptation.model(learningRandom);
    if (view.opponent) lastVisibleAt = now;
    if (view.own.spear.state !== previousSpearState) {
      if (view.own.spear.state === 'EMBEDDED') embedSince = now;
      if (view.own.spear.state === 'OUTBOUND') lastThrowAt = now;
      previousSpearState = view.own.spear.state;
    }
    model.embedAge = now - embedSince;
    model.unseenFor = now - lastVisibleAt;
    model.timeSinceThrow = now - lastThrowAt;
    const flinch = ablations.noReflex ? null : reflex(view);
    if (!flinch) budget.spend('belief', particleCount * 2);
    const b = flinch ? (cachedBelief ?? belief.summary(now)) : belief.update(view, now);
    if (!flinch) cachedBelief = b;
    const planningBelief = ablations.noPrediction ? { ...b, velocity: point(0,0) } : b;
    const planningAdaptation = ablations.noPrediction ? { ...opponentModel, drift: point(0,0) } : opponentModel;
    const schedule = attention.update(view, b, now);
    if (opponentModel.enabled && opponentModel.scanRate > 0) {
      const item = schedule.find(s => s.item === 'opponent');
      item.dueSec = clamp(0.8 / (1 + opponentModel.scanRate), 0.2, 0.8);
      item.due = item.priority > 0 && item.stalenessSec > item.dueSec && !!item.target;
    }
    model.opponentAttention = ablations.noToM ? null : attention.opponentCone();
    const scanAngle = now * (Math.PI * 0.7);
    model.scanTarget = add(view.own.position,
      point(Math.cos(scanAngle) * 5, Math.sin(scanAngle) * 5));
    model.searchTarget = b.confidence > 0.1 ? b.mean :
      point(view.own.position.x > 0 ? -2 : 2, Math.sin(now * 0.4) * 3);
    const candidates = specialists(view, b, model, { arousal: 0 }, ablations);
    let mood = affect.update(view, b, ablations.singleUtility ?
      { Threat: { salience: 0 } } : candidates);
    if (ablations.noAffect) mood = { arousal: 0, valence: 0, confidenceMood: 0, scoreMargin: 0 };
    if (opponentModel.enabled && opponentModel.recallDelay !== null && b.spear.state === 'EMBEDDED' && candidates.Threat.salience > 0) {
      candidates.Threat.salience = clamp(candidates.Threat.salience + 0.12 / (0.2 + opponentModel.recallDelay), 0, 1);
    }
    const chosen = flinch ? { focus:null,ignition:false,broadcast:null,outputs:{ gaze:view.opponentSpear.position } } : workspace.choose((ablations.singleUtility || ablations.noIntuition) ?
      { Utility: singleUtility(view, b, model) } : candidates, now, mood);
    if (ablations.noIntuition) chosen.outputs = singleUtility(view, b, model).wants;
    const key = situation(view, b), habit = learning.select(key);
    if (ablations.noIntuition) habit.automatic = false;
    const sorted = Object.values(candidates).map(c => c.salience).sort((a,b) => b-a);
    const conflict = sorted[0] - sorted[1] < 0.12;
    const escalate = !flinch && !ablations.noDeliberation && !ablations.noMetacog &&
      (!habit.automatic || habit.aware) && (conflict || b.confidence < 0.6 || b.surprise > 5 || habit.aware);
    let tactic = ablations.noIntuition ? 'direct' : habit.automatic ? habit.tactic : 'lead';
    if (!ablations.noIntuition && !habit.automatic && opponentModel.enabled && opponentModel.samples >= 3)
      tactic = opponentModel.sampledSide > 0 ? 'left' : 'right';
    if (view.own.spear.state === 'EMBEDDED') tactic = chosen.outputs.recall ? 'direct' : 'lead';
    let branches = [], tier = flinch ? 0 : 1;
    if (escalate && budget.remaining >= 4) {
      tier = 2;
      // Shared intercept hypotheses are computed once in both arms. No artificial
      // compute tax is imposed on noWorkspace: it uses the same planning kernel.
      const branchAllowance = budget.remaining;
      const local = budget;
      const alternatives = ablations.noCounterfactual ? [tactic] : view.own.spear.state === 'EMBEDDED' ? ['direct','lead'] : [tactic, ...TACTICS.filter(t => t !== tactic)];
      // Interleave hypotheses so a scarce budget does not privilege the first option.
      const n = Math.max(1, Math.min(8, Math.floor(branchAllowance / (alternatives.length * 4))));
      for (const t of alternatives) {
        const branch = rolloutTactic(t, view, { ...planningBelief, particles: b.particles.slice(0, n) }, planningAdaptation, local);
        if (branch.trials) branches.push(branch);
      }
      if (branches.length) {
        branches.sort((a,b) => (b.value + learning.prior(key,b.tactic)*0.1) - (a.value + learning.prior(key,a.tactic)*0.1));
        tactic = branches[0].tactic;
        for (const branch of branches) learning.counterfactual(key,branch.tactic,branch.value);
      }

    }
    if (!flinch && (ablations.noWorkspace || ['Hunt','Threat','Deceive','Utility'].includes(chosen.focus)) && view.own.spear.state === 'HELD') {
      const target = tacticTarget(tactic,view,planningBelief,planningAdaptation);
      chosen.outputs.gaze = target;
      chosen.outputs.throw = !!chosen.outputs.throw && dot(view.own.facing,unit(sub(target,view.own.position))) > Math.cos(model.throwAngleRad);
    }
    const anchorControl = !flinch && (ablations.noWorkspace || chosen.focus === 'Anchor');
    if (view.own.spear.state !== 'EMBEDDED') recallPlan = null;
    if (anchorControl && view.own.spear.state === 'EMBEDDED') {
      if (recallPlan && now >= recallPlan.due) { chosen.outputs.recall = true; tactic = recallPlan.tactic; recallPlan = null; }
      else if (!recallPlan && branches.length && branches[0].value > 0.25) {
        chosen.outputs.recall = branches[0].tactic === 'direct';
        if (!chosen.outputs.recall) recallPlan = { due:now + 0.3,tactic:branches[0].tactic };
      } else if (recallPlan) chosen.outputs.recall = false;
      if (recallPlan) chosen.outputs.move = { ...view.own.position };
      if (opponentModel.enabled && opponentModel.neutralization > 0.7 && model.embedAge > 2) chosen.outputs.recall = true;
    }
    const input = EMPTY();
    const gaze = planGaze(view, chosen.outputs.gaze, schedule, now, model, random, ablations);
    input.aimX = gaze.x; input.aimY = gaze.y;
    const move = planMove(view.own.position, chosen.outputs.move, view.arena);
    input.moveX = move.x; input.moveY = move.y;
    if (flinch) { input.moveX = flinch.x; input.moveY = flinch.y; tier = 0; }
    input.throw = !!chosen.outputs.throw && view.own.spear.state === 'HELD';
    input.recall = !!chosen.outputs.recall && view.own.spear.state === 'EMBEDDED';
    ownSpearMemory.command(input, view, now + config.latencySec);
    const counterfactualNote = !ablations.noCounterfactual && (input.recall ||
      (chosen.ignition && chosen.focus === 'Anchor')) ?
      reflection.considerRecall({ time: now, spear: view.own.spear,
        own: view.own.position, particles: b.particles }) : null;
    if (input.throw || input.recall) learning.record(key,tactic,view,now,tier);
    const cognition = { budget: budget.report(), tier, situation: key, tactic, automatic: habit.automatic,
      predictedFailure: habit.predictedFailure, outcome, adaptation: opponentModel, branches,
      decisionLatencySec: config.latencySec };
    totals.cycles++; totals.budgetSpent += cognition.budget.spent;
    totals.maxBudgetSpent = Math.max(totals.maxBudgetSpent,cognition.budget.spent);
    totals.escalations += tier === 2 ? 1 : 0; totals.reflexes += flinch ? 1 : 0;
    totals.automaticDecisions += habit.automatic ? 1 : 0;
    totals.learningUpdates += outcome ? 1 : 0; totals.counterfactualBranches += branches.length;
    totals.decisionLatencySec += cognition.decisionLatencySec;
    const cell = totals.bySituation[key] ??= { decisions:0, successes:0, failures:0, outcomes:0,
      escalations:0, budgetSpent:0, decisionLatencySec:0, predictedFailure:0, automaticDecisions:0 };
    cell.decisions++; cell.escalations += tier === 2 ? 1 : 0; cell.budgetSpent += cognition.budget.spent;
    cell.decisionLatencySec += cognition.decisionLatencySec; cell.predictedFailure += habit.predictedFailure;
    cell.automaticDecisions += habit.automatic ? 1 : 0;
    if (outcome) { const completed = totals.bySituation[outcome.key];
      if (completed) { completed.outcomes++; completed.successes += outcome.reward > 0 ? 1 : 0; completed.failures += outcome.actualFailure; } }
    const innerSpeech = speech.transition(chosen);
    const outerSpeech = speech.outer(chosen);
    if (chosen.ignition) memory.remember({ kind: 'workspace', time: now,
      focus: chosen.focus, content: chosen.broadcast?.content ?? null, innerSpeech });
    if (captureTrace) records.push({ time: now, focus: chosen.focus,
      content: chosen.broadcast?.content ?? null,
      saliences: Object.fromEntries(Object.entries(candidates).map(([k, c]) => [k, c.salience])),
      ignition: chosen.ignition, belief: {
        mean: b.mean, velocity: b.velocity, covariance: b.covariance,
        entropy: b.entropy, particles: b.particles, spear: b.spear,
        stalenessSec: b.stalenessSec },
      confidence: { opponent: b.confidence, spear: b.spear.confidence,
        calibration: b.calibration }, surprise: b.surprise,
      selfAttention: schedule, opponentCone: model.opponentAttention,
      cognition, affect: mood, innerSpeech, outerSpeech, counterfactualNote,
      input: { ...input } });
    return input;
  }

  return {
    act(view, dt) {
      if (!view || !view.own || !view.arena || !view.cone) {
        throw new TypeError('act requires a percept');
      }
      if (!Number.isFinite(dt) || dt <= 0) throw new RangeError('dt must be positive');
      queue.push(view);
      const latencyTicks = Math.round(config.latencySec / dt);
      if (queue.length <= latencyTicks) { tick++; return EMPTY(); }
      const delayed = queue.shift();
      if (tick % Math.max(1, Math.round(1 / (30 * dt))) === 0) output = cycle(delayed);
      tick++;
      const result = { ...output };
      // Presses are momentary. The sim never receives a held/repeated press.
      output.throw = false; output.recall = false;
      return result;
    },
    finish(view) {
      const outcome = learning.observe(view, view.time.elapsedSec);
      if (outcome) {
        totals.learningUpdates++;
        const cell = totals.bySituation[outcome.key];
        if (cell) { cell.outcomes++; cell.successes += outcome.reward > 0 ? 1 : 0; cell.failures += outcome.actualFailure; }
        totals.terminalOutcome = outcome;
      }
      return outcome;
    },
    trace: () => structuredClone(records),
    settings: () => ({ ...config, ablations: { ...ablations }, cycleHz: 30, policy, cognitionBudget, outboundSpeed, returnSpeed }),
    cognition: () => structuredClone({ ...totals, pendingOutcome: learning.diagnostics().pending }),
    memory: () => ({ version: 2, episodes: memory.episodes(), playerModel: memory.playerModel(),
      learning: learning.snapshot(), adaptation: adaptation.snapshot() }),
    reflect: (moment, alternative) => reflection.reflect(moment, alternative),
    reflectionNotes: () => reflection.notes(),
    selfReport(time) {
      const record = records.findLast((r) => r.time <= time);
      return record ? { time: record.time, focus: record.focus,
        reason: record.content, saliences: { ...record.saliences },
        confidence: { ...record.confidence }, innerSpeech: record.innerSpeech } : null;
    },
  };
}
