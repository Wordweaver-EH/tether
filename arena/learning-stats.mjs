import { bootstrapMean, mean } from './audit-stats.mjs';
export const CURVE_METRICS = ['successRate', 'type2Share', 'computePerDecision',
  'modeledLatencySec', 'automaticShare', 'predictedFailureOnOutcomes', 'actualFailure',
  'failureBrier', 'failureAbsoluteError', 'decisionWallMeanMs', 'decisionWallMedianMs', 'decisionWallP95Ms'];
const groups = (xs, key) => {
  const result = new Map();
  for (const x of xs) { const k = key(x), list = result.get(k) ?? []; list.push(x); result.set(k, list); }
  return result;
};
export function clusterEstimate(rows, value) {
  const clusters = groups(rows, r => r.clusterSeed);
  const values = [];
  let observations = 0;
  for (const list of clusters.values()) {
    const xs = list.map(value).filter(x => x !== null && x !== undefined);
    if (xs.some(x => !Number.isFinite(x))) throw new Error('nonfinite learning metric');
    if (xs.length) { values.push(mean(xs)); observations += xs.length; }
  }
  return { ...bootstrapMean(values), observations };
}
export function learningCurves(rows) {
  const output = [];
  const selected = rows.filter(r => r.protocol === 'learning');
  for (const [key, list] of groups(selected, r => JSON.stringify([r.budget, r.variant, r.phase, r.episode]))) {
    const [budget, variant, phase, episode] = JSON.parse(key);
    for (const situation of [...new Set(list.flatMap(r => Object.keys(r.situations)))].sort()) {
      const present = list.filter(r => r.situations[situation]);
      output.push({ budget, variant, phase, episode, situation,
        bouts: present.length, decisions: present.reduce((n, r) => n + r.situations[situation].decisions, 0),
        outcomes: present.reduce((n, r) => n + r.situations[situation].outcomes, 0),
        metrics: Object.fromEntries(CURVE_METRICS.map(metric => [metric,
          clusterEstimate(present, r => r.situations[situation][metric])])) });
    }
  }
  return output;
}
export const learningPairKey = r => JSON.stringify([r.budget,r.clusterSeed,r.mode,r.seat,r.opponent,r.switching,r.episode,r.phase]);
export function adaptationEffects(rows) {
  const result = [];
  for (const [key, list] of groups(rows.filter(r => r.protocol === 'adaptation'),
    r => JSON.stringify([r.budget, r.switching]))) {
    const [budget, switching] = JSON.parse(key), full = list.filter(r => r.variant === 'full');
    for(const variant of ['full','noAdaptation']) {
      const arm=list.filter(r=>r.variant===variant);
      if(new Set(arm.map(learningPairKey)).size!==arm.length)throw new Error('duplicate adaptation pair');
    }
    const off = new Map(list.filter(r => r.variant === 'noAdaptation').map(r => [learningPairKey(r),r]));
    if(full.length!==off.size)throw new Error('unequal adaptation arms');
    const delta = (r, metric) => {
      const a=r.shots[0][metric], b=r.shots[2][metric];
      return a === null || b === null ? null : b-a;
    };
    const metrics = {};
    for (const metric of ['hitRate','hitsPerMinute']) {
      const paired = full.map(a => {
        const b=off.get(learningPairKey(a)); if(!b)throw new Error('missing adaptation control');
        const x=delta(a,metric),y=delta(b,metric);
        return {...a,effect:x===null||y===null?null:x-y};
      });
      metrics[metric] = { fullLastMinusFirst:clusterEstimate(full,r=>delta(r,metric)),
        offLastMinusFirst:clusterEstimate([...off.values()],r=>delta(r,metric)),
        differenceInDifferences:clusterEstimate(paired,r=>r.effect),
        direction:'(full last minus first) minus (noAdaptation last minus first)' };
    }
    result.push({budget,switching,bouts:list.length,metrics,
      fullScoreMargin:clusterEstimate(full,r=>r.scoreMargin),
      posteriorReopen:clusterEstimate(full,r=>r.reversal.firstReopen?1:0),
      reopenDelaySec:clusterEstimate(full,r=>r.reversal.reopenDelaySec),
      censoredShots:list.reduce((n,r)=>n+r.shots.reduce((s,w)=>s+w.censored,0),0)});
  }
  return result;
}
export function summarizeLearning(rows) {
  return {curves:learningCurves(rows),adaptation:adaptationEffects(rows),
    boutResults:[...groups(rows,r=>JSON.stringify([r.protocol,r.budget,r.variant,r.phase??'heldout',r.episode??null,r.switching??null]))].map(([key,list])=>{
      const [protocol,budget,variant,phase,episode,switching]=JSON.parse(key);
      return {protocol,budget,variant,phase,episode,switching,bouts:list.length,
        win:clusterEstimate(list,r=>r.win),scoreMargin:clusterEstimate(list,r=>r.scoreMargin)};
    })};
}
