import * as sim from '../src/sim.js';
import { percept } from '../src/perception.js';
import { createMind } from '../src/mind/index.mjs';
import { createHabitProxy, createShotCohorts, thirdIndex } from './learning-proxy.mjs';

const quantile = (xs, p) => xs.length ? [...xs].sort((a,b)=>a-b)[Math.floor((xs.length-1)*p)] : null;
const average = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
export function summarizeCognition(records, totals, durationSec, switchAt = null, cycleWallMs = []) {
  const cells = {}, runtime = {};
  let cycleIndex = 0;
  const adaptationWindows = Array.from({ length: 3 }, () => []);
  const adaptationSamples = [];
  for (const record of records) {
    const c = record.cognition;
    if (!c) throw new Error('cognition trace missing');
    const measured = cycleWallMs[cycleIndex++];
    if (measured !== undefined) {
      if (!Number.isFinite(measured) || measured < 0) throw new Error('invalid cycle wall time');
      (runtime[c.situation] ??= []).push(measured);
    }
    if (c.budget.spent > c.budget.limit) throw new Error('per-cycle budget exceeded');
    if (c.outcome) {
      const o = c.outcome;
      const cell = cells[o.key] ??= [];
      cell.push(o);
    }
    if (c.adaptation?.enabled) {
      const sample = { time: record.time, probability: c.adaptation.sideProbability,
        confidence: c.adaptation.confidence, samples: c.adaptation.samples,
        reversals: c.adaptation.reversals };
      adaptationWindows[thirdIndex(record.time, durationSec)].push(sample);
      // Compact 1 Hz record is sufficient to inspect posterior widening. Keep
      // every reversal as well, because a brief reopen may last <1 second.
      const prior = adaptationSamples.at(-1);
      if (!prior || sample.time - prior.time >= 1 || sample.reversals !== prior.reversals)
        adaptationSamples.push(sample);
    }
  }
  if (totals.terminalOutcome) {
    const o = totals.terminalOutcome;
    (cells[o.key] ??= []).push(o);
  }
  const situations = Object.fromEntries(Object.entries(totals.bySituation).map(([key, v]) => {
    const outcomes = cells[key] ?? [];
    if (outcomes.length !== v.outcomes) throw new Error(`outcome count mismatch for ${key}`);
    return [key, { ...v, successRate: v.outcomes ? v.successes / v.outcomes : null,
      type2Share: v.decisions ? v.escalations / v.decisions : null,
      computePerDecision: v.decisions ? v.budgetSpent / v.decisions : null,
      modeledLatencySec: v.decisions ? v.decisionLatencySec / v.decisions : null,
      automaticShare: v.decisions ? v.automaticDecisions / v.decisions : null,
      measuredCycles: (runtime[key] ?? []).length,
      decisionWallMeanMs: average(runtime[key] ?? []),
      decisionWallMedianMs: quantile(runtime[key] ?? [], .5),
      decisionWallP95Ms: quantile(runtime[key] ?? [], .95),
      predictedFailureOnOutcomes: average(outcomes.map(o => o.predictedFailure)),
      actualFailure: average(outcomes.map(o => o.actualFailure)),
      failureBrier: average(outcomes.map(o => (o.actualFailure - o.predictedFailure) ** 2)),
      failureAbsoluteError: average(outcomes.map(o => Math.abs(o.actualFailure - o.predictedFailure))) }];
  }));
  const before = switchAt === null ? null : adaptationSamples.filter(s => s.time < switchAt).at(-1) ?? null;
  const after = switchAt === null ? [] : adaptationSamples.filter(s => s.time >= switchAt);
  const reopened = before ? after.find(s => s.reversals > before.reversals) ?? null : null;
  return { situations, adaptationWindows: adaptationWindows.map(xs => ({
    samples: xs.length, meanConfidence: average(xs.map(s => s.confidence)),
    meanSideProbability: average(xs.map(s => s.probability)),
    lastReversals: xs.at(-1)?.reversals ?? null })), adaptationSamples,
    reversal: { switchAt, before, firstReopen: reopened,
      reopenDelaySec: reopened ? reopened.time - switchAt : null,
      minConfidenceAfterSwitch: after.length ? Math.min(...after.map(s => s.confidence)) : null } };
}

export function runLearningBout(job, memorySnapshot = null) {
  const { seed, seat, budget, variant, durationSec, opponent, mode, protocol } = job;
  const ablations = variant === 'full' ? {} : { [variant]: true };
  const mind = createMind({ seed, cognitionBudget: budget, memorySnapshot,
    captureTrace: true, ablations });
  const switchAt = protocol === 'adaptation' && job.switching ? durationSec / 2 : null;
  const proxy = createHabitProxy({ seed: seed + 917, family: opponent,
    side: job.side ?? (seed % 2 ? 1 : -1), switchAt: switchAt ?? Infinity });
  const world = sim.createWorld({ seed }), dt = 1 / sim.CONSTANTS.technical.SIM_HZ;
  const id = seat === 1 ? 'P1' : 'P2', enemyId = seat === 1 ? 'P2' : 'P1';
  const agents = seat === 1 ? [mind, proxy] : [proxy, mind];
  const shots = createShotCohorts(id, durationSec);
  const started = performance.now(), actWallMs = [];
  for (let tick = 0; tick < Math.round(durationSec / dt) && !world.ended; tick++) {
    const inputs = agents.map((agent, index) => {
      const view=percept(world, index === 0 ? 'P1' : 'P2', mode);
      if(agent!==mind)return agent.act(view,dt);
      const began=performance.now(), input=agent.act(view,dt);
      actWallMs.push(performance.now()-began);
      return input;
    });
    const events = sim.step(world, inputs);
    shots.observe(events, world.elapsedSec, world.spears[seat - 1].state);
  }
  mind.finish(percept(world, id, mode));
  const simulationWallMs = performance.now() - started;
  const totals = mind.cognition();
  if (totals.budgetLimit !== budget) throw new Error('requested budget not applied');
  const records=mind.trace(), latencyTicks=Math.round(mind.settings().latencySec/dt);
  // Every traced cycle consumes a delayed percept. Recover its invocation tick
  // from that percept timestamp and the configured queue delay; measure only
  // act(), excluding percept construction, simulation, proxy, and trace clone.
  const cycleWallMs=records.map(r=>{
    const elapsedTick=Math.round(r.time/dt)+latencyTicks;
    const measured=actWallMs[elapsedTick];
    if(measured===undefined)throw new Error('cannot match traced cognitive cycle to act timing');
    return measured;
  });
  const compact = summarizeCognition(records, totals, durationSec, protocol === 'adaptation' ? durationSec / 2 : null, cycleWallMs);
  const ownScore = world.players[seat - 1].score, enemyScore = world.players[2 - seat].score;
  const row = { ...job, score: { [id]: ownScore, [enemyId]: enemyScore },
    scoreMargin: ownScore - enemyScore, win: ownScore > enemyScore ? 1 : ownScore < enemyScore ? 0 : 0.5,
    elapsedSec: world.elapsedSec, totals, ...compact, shots: shots.finish(),
    simulationWallMs, simulationWallMsPerCycle: totals.cycles ? simulationWallMs / totals.cycles : null };
  return { row, memory: mind.memory() };
}

export function runLearningJob(job) {
  if (job.protocol === 'adaptation') return [runLearningBout(job).row];
  const rows = [], variants=job.variants??[job.variant], memories=new Map();
  const order=episode=>variants.map((_,i)=>variants[(i+episode+job.clusterSeed)%variants.length]);
  // Interleave variants every episode; counterbalance the first variant by
  // independent seed and episode. Each arm owns a separate persistent memory.
  for (let episode = 1; episode <= job.episodes; episode++) {
    for(const variant of order(episode)) {
      const result = runLearningBout({ ...job, variant, seed: job.clusterSeed * 10000 + episode,
        episode, phase: 'training' }, memories.get(variant)??null);
      rows.push(result.row); memories.set(variant,result.memory);
    }
  }
  // Evaluation seeds are disjoint from every training seed; each held-out bout
  // begins from the same final training snapshot. It can adapt within the bout,
  // but its memory never leaks to the next held-out replicate.
  for (let heldout = 1; heldout <= job.heldout; heldout++) {
    for(const variant of order(job.episodes+heldout)) {
      const result = runLearningBout({ ...job, variant, seed: 100000000 + job.clusterSeed * 10000 + heldout,
        episode: job.episodes + heldout, phase: 'heldout' }, memories.get(variant)??null);
      rows.push(result.row);
    }
  }
  return rows;
}
