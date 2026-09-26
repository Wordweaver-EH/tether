import { createBelief } from './belief.mjs';
import { specialists, singleUtility } from './specialists.mjs';
import { createWorkspace } from './workspace.mjs';
import { createAttentionSchema, createAffect, createMemory, createReflection,
  createSpeech, planMove, planGaze } from './components.mjs';
import { rng, point, add, clamp } from './math.mjs';
import { createOwnSpearMemory } from './own-spear.mjs';

const FLAGS = ['noBelief', 'noPrediction', 'singleUtility', 'noWorkspace',
  'noHysteresis', 'noMetacog', 'noAttentionSchema', 'noToM'];
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
  captureTrace = true, memorySnapshot = null, policy = 'tuned' } = {}) {
  if (policy !== 'tuned' && policy !== 'baseline')
    throw new RangeError('policy must be tuned or baseline');
  for (const key of Object.keys(ablations)) {
    if (!FLAGS.includes(key)) throw new RangeError(`unknown ablation: ${key}`);
  }
  const random = rng(seed);
  const config = settings(difficulty);
  const belief = createBelief(random, ablations);
  const workspace = createWorkspace(ablations);
  const attention = createAttentionSchema(ablations);
  const affect = createAffect();
  const memory = createMemory();
  memory.load(memorySnapshot);
  const reflection = createReflection();
  const speech = createSpeech();
  const ownSpearMemory = createOwnSpearMemory();
  const records = [];
  let tick = 0;
  let queue = [];
  let output = EMPTY();
  let previousSpearState = 'HELD';
  let embedSince = -Infinity, lastThrowAt = -Infinity, lastVisibleAt = -Infinity;
  const model = { ...config, previousGazeAngle: 0, opponentAttention: null,
    scanTarget: point(0, 0), searchTarget: point(0, 0),
    embedAge: 0, unseenFor: 0, timeSinceThrow: Infinity, orbitSign: -1,
    policy };

  function cycle(view) {
    const now = view.time.elapsedSec;
    const visibleOwnSpear = !!view.own.spear;
    const rememberedSpear = ownSpearMemory.observe(view);
    view = { ...view, own: { ...view.own, spear: rememberedSpear },
      ownSpearVisible: visibleOwnSpear };
    memory.observePercept(view, now);
    if (view.opponent) lastVisibleAt = now;
    if (view.own.spear.state !== previousSpearState) {
      if (view.own.spear.state === 'EMBEDDED') embedSince = now;
      if (view.own.spear.state === 'OUTBOUND') lastThrowAt = now;
      previousSpearState = view.own.spear.state;
    }
    model.embedAge = now - embedSince;
    model.unseenFor = now - lastVisibleAt;
    model.timeSinceThrow = now - lastThrowAt;
    const b = belief.update(view, now);
    const schedule = attention.update(view, b, now);
    model.opponentAttention = ablations.noToM ? null : attention.opponentCone();
    const scanAngle = now * (Math.PI * 0.7);
    model.scanTarget = add(view.own.position,
      point(Math.cos(scanAngle) * 5, Math.sin(scanAngle) * 5));
    model.searchTarget = b.confidence > 0.1 ? b.mean :
      point(view.own.position.x > 0 ? -2 : 2, Math.sin(now * 0.4) * 3);
    const candidates = specialists(view, b, model, { arousal: 0 }, ablations);
    const mood = affect.update(view, b, ablations.singleUtility ?
      { Threat: { salience: 0 } } : candidates);
    const chosen = workspace.choose(ablations.singleUtility ?
      { Utility: singleUtility(view, b, model) } : candidates, now, mood);
    const input = EMPTY();
    const gaze = planGaze(view, chosen.outputs.gaze, schedule, now, model, random, ablations);
    input.aimX = gaze.x; input.aimY = gaze.y;
    const move = planMove(view.own.position, chosen.outputs.move, view.arena);
    input.moveX = move.x; input.moveY = move.y;
    input.throw = !!chosen.outputs.throw && view.own.spear.state === 'HELD';
    input.recall = !!chosen.outputs.recall && view.own.spear.state === 'EMBEDDED';
    ownSpearMemory.command(input, view, now + config.latencySec);
    const counterfactualNote = input.recall ||
      (chosen.ignition && chosen.focus === 'Anchor') ?
      reflection.considerRecall({ time: now, spear: view.own.spear,
        own: view.own.position, particles: b.particles }) : null;
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
      affect: mood, innerSpeech, outerSpeech, counterfactualNote,
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
    trace: () => structuredClone(records),
    settings: () => ({ ...config, ablations: { ...ablations }, cycleHz: 30, policy }),
    memory: () => ({ episodes: memory.episodes(), playerModel: memory.playerModel() }),
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
