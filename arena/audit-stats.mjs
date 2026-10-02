// Paired effects are clustered by seed: seats, modes and opponents are repeated
// measurements, not independent replicates. Bootstrap CIs are descriptive.
export const mean = (xs) => xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : null;
export function bootstrapMean(values, { draws=2000, seed=72931 }={}) {
  if (!values.length) return {mean:null,lo:null,hi:null,n:0};
  if(values.some(x=>!Number.isFinite(x))) throw new TypeError('finite observations required');
  let state=seed>>>0;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const means=[];
  for(let d=0;d<draws;d++) {let sum=0;for(let i=0;i<values.length;i++)sum+=values[Math.floor(random()*values.length)];means.push(sum/values.length);}
  means.sort((a,b)=>a-b);
  return {mean:mean(values),lo:means[Math.floor(draws*.025)],hi:means[Math.min(draws-1,Math.floor(draws*.975))],n:values.length};
}
export const PAIR_KEYS=['budget','seed','mode','seat','opponent','episode'];
export const pairKey=(row)=>PAIR_KEYS.map(k=>row[k]??0).join('|');
export function pairedEffect(rows, variant, metric, predicate=()=>true) {
  const originals=rows.filter(r=>r.variant==='full'&&predicate(r));
  const variants=rows.filter(r=>r.variant===variant&&predicate(r));
  const base=new Map(originals.map(r=>[pairKey(r),r]));
  const variantKeys=new Set(variants.map(pairKey));
  if(base.size!==originals.length||variantKeys.size!==variants.length)throw new Error('duplicate audit pair key');
  if(base.size!==variantKeys.size||[...base.keys()].some(k=>!variantKeys.has(k)))throw new Error(`unmatched audit key sets: ${variant}`);
  const clusters=new Map();let pairedBouts=0;
  for(const row of rows.filter(r=>r.variant===variant&&predicate(r))) {
    const full=base.get(pairKey(row));
    if(!full)throw new Error(`unmatched audit row: ${variant} ${pairKey(row)}`);
    const a=full.metrics[metric],b=row.metrics[metric];
    if(a===null||b===null||a===undefined||b===undefined)continue;
    if(!Number.isFinite(a)||!Number.isFinite(b))throw new Error('non-finite audit metric');
    const list=clusters.get(row.seed)??[];list.push(b-a);clusters.set(row.seed,list);pairedBouts++;
  }
  return {...bootstrapMean([...clusters.values()].map(mean)),pairedBouts,direction:'ablated minus full'};
}
export function summarizeAudit(rows, config) {
  const metrics=[...new Set(rows.flatMap(r=>Object.keys(r.metrics)))];
  return config.budgets.flatMap(budget=>config.variants.filter(v=>v!=='full').map(variant=>({
    budget,variant,effects:Object.fromEntries(metrics.map(metric=>[metric,pairedEffect(rows,variant,metric,r=>r.budget===budget)])),
    byOpponent:Object.fromEntries(config.opponents.map(opponent=>[opponent,Object.fromEntries(['win','scoreMargin'].map(metric=>[metric,pairedEffect(rows,variant,metric,r=>r.budget===budget&&r.opponent===opponent)]))])),
    byMode:Object.fromEntries(config.modes.map(mode=>[mode,Object.fromEntries(['win','scoreMargin','throwsPerMinute','lookAwayFraction','scanReversalsPerMinute'].map(metric=>[metric,pairedEffect(rows,variant,metric,r=>r.budget===budget&&r.mode===mode)]))])),
  })));
}
export function classifyEffect(effect, threshold=0) {
  if(!effect||effect.n<2||effect.mean===null)return 'insufficient';
  if(effect.lo>threshold)return 'increase';
  if(effect.hi< -threshold)return 'decrease';
  return 'inconclusive / null-compatible';
}
