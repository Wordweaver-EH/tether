// Bounds describe only the assigned model particles, not the entire posterior or physical certainty.
export function summarizeRolloutCompletion({assigned,hit,terminalNoHit,horizonUnresolved,budgetUnresolved}) {
  const counts=[assigned,hit,terminalNoHit,horizonUnresolved,budgetUnresolved];
  if(!counts.every(n=>Number.isSafeInteger(n)&&n>=0) || hit+terminalNoHit+horizonUnresolved+budgetUnresolved!==assigned)
    throw new RangeError('every assigned particle must have one completion classification');
  const unresolved=horizonUnresolved+budgetUnresolved,complete=assigned>0&&unresolved===0;
  return {scope:'assigned-particle-sample',assigned,hit,terminalNoHit,horizonUnresolved,budgetUnresolved,unresolved,
    complete,lower:assigned?hit/assigned:0,upper:assigned?(hit+unresolved)/assigned:1,
    pointValue:complete?hit/assigned:null,canUpdateModel:complete,
    status:!assigned?'empty-sample':unresolved?'unresolved':hit?'resolved-modeled-hit':'resolved-modeled-no-hit'};
}
export function selectCompletedBranch(branches,priors={}) {
  const prior=t=>Number.isFinite(priors[t])?priors[t]:0;
  const score=b=>b.value+.1*prior(b.tactic);
  const completed=branches.filter(b=>b.completion?.complete&&Number.isFinite(b.value));
  completed.sort((a,b)=>score(b)-score(a));
  const best=completed[0]??null;
  if(!best)return {selected:null,status:'no-completed-branch'};
  const overlaps=branches.some(b=>!b.completion?.complete &&
    score(best)<(b.completion?.upper??1)+.1*prior(b.tactic));
  return {selected:overlaps?null:best,status:overlaps?'unresolved-overlap':'completed-dominates-bounds'};
}
