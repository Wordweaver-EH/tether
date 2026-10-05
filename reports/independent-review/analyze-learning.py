"""Post-hoc review of terminal learning checkpoint; no bouts or source edits."""
import json, pathlib, collections
import numpy as np
root=pathlib.Path('/workspace/shared/tether-review'); path=root/'final-reports/learning-final.rows.jsonl'
rows=[]; unique=set(); counts=collections.Counter(); observed=collections.Counter()
for line in path.open():
 r=json.loads(line);key=tuple(r.get(k) for k in ('protocol','clusterSeed','mode','seat','opponent','switching','variant','episode','phase'))
 assert key not in unique,key;unique.add(key)
 assert abs(r['elapsedSec']-300)<1e-6
 counts[r['protocol']]+=1
 total=r['totals'];assert total['budgetLimit']==192 and total['maxBudgetSpent']<=192 and total['budgetSpent']<=total['cycles']*192
 cs=list(r['situations'].values()); n=sum(c['outcomes'] for c in cs)
 r['reviewMetrics']={'win':r['win'],'scoreMargin':r['scoreMargin'],
  'type2Share':total['escalations']/total['cycles'], 'automaticShare':total['automaticDecisions']/total['cycles'],
  'computePerDecision':total['budgetSpent']/total['cycles'],
  'sparseCreditSuccess':sum(c['successes'] for c in cs)/n if n else None,
  'failureBrier':sum(c['failureBrier']*c['outcomes'] for c in cs if c['failureBrier'] is not None)/n if n else None,
  'shotHitRate':sum(s['hits'] for s in r['shots'])/sum(s['resolved'] for s in r['shots']) if sum(s['resolved'] for s in r['shots']) else None}
 for s in r['shots']:
  assert s['hits']<=s['resolved'] and s['resolved']+s['censored']==s['throws']
 for name in ('adaptationSamples','totals','adaptationWindows'):r.pop(name,None)
 rows.append(r)
assert counts=={'learning':7680,'adaptation':1024},counts
rng=np.random.default_rng(61020810)
def estimate(values):
 x=np.array(values,dtype=float);assert np.isfinite(x).all()
 if not len(x):return dict(mean=None,lo=None,hi=None,n=0)
 means=x[rng.integers(0,len(x),(10000,len(x)))].mean(axis=1)
 return dict(mean=float(x.mean()),lo=float(np.quantile(means,.025)),hi=float(np.quantile(means,.975)),n=len(x))
def cluster(items,value):
 d=collections.defaultdict(list);n=0
 for r in items:
  x=value(r)
  if x is not None:d[r['clusterSeed']].append(x);n+=1
 return dict(estimate([np.mean(d[k]) for k in sorted(d)]),pairedObservations=n)
def matchkey(r):return tuple(r.get(k) for k in ('protocol','clusterSeed','mode','seat','opponent','switching','episode','phase'))
learning=[r for r in rows if r['protocol']=='learning']; adaptation=[r for r in rows if r['protocol']=='adaptation']
results={'status':'POST HOC terminal-only independent contrasts, 10000draw percentile bootstrap, seedclustered and unadjusted',
 'validation':dict(rows=len(rows),byProtocol=dict(counts),uniqueRows=len(unique),full300s=True,budgetBounds=True,shotCohortCountIdentities=True),
 'heldoutPaired':[],'trainingFirstLast':[],'trainingChangeVersusNoLearning':[],'fullSituationFirstLast':[],'adaptationSpecificity':[]}
held=[r for r in learning if r['phase']=='heldout']; base={matchkey(r):r for r in held if r['variant']=='full'}
for v in ('noMetacog','noAutomatization','noLearning'):
 arm=[r for r in held if r['variant']==v]
 for m in ('win','scoreMargin','shotHitRate','type2Share','automaticShare','computePerDecision'):
  def value(r):
   a=base[matchkey(r)]['reviewMetrics'][m];b=r['reviewMetrics'][m];return None if a is None or b is None else b-a
  results['heldoutPaired'].append(dict(variant=v,metric=m,direction='ablated minus full',**cluster(arm,value)))
ends=[r for r in learning if r['phase']=='training' and r['episode'] in (1,12)]
def trainingkey(r):return tuple(r[k] for k in ('clusterSeed','mode','seat','opponent','variant'))
first={trainingkey(r):r for r in ends if r['episode']==1}
last=[r for r in ends if r['episode']==12]
lastmap={trainingkey(r):r for r in last}
for v in ('full','noMetacog','noAutomatization','noLearning'):
 arm=[r for r in last if r['variant']==v]
 for m in ('win','scoreMargin','shotHitRate','type2Share','automaticShare','computePerDecision','sparseCreditSuccess','failureBrier'):
  def value(r):
   a=first[trainingkey(r)]['reviewMetrics'][m];b=r['reviewMetrics'][m];return None if a is None or b is None else b-a
  results['trainingFirstLast'].append(dict(variant=v,metric=m,direction='training episode12 minus1',**cluster(arm,value)))
for m in ('win','scoreMargin','shotHitRate'):
 def value(r):
  k=trainingkey(r); k0=(*k[:-1],'noLearning')
  numbers=[r['reviewMetrics'][m],first[k]['reviewMetrics'][m],lastmap[k0]['reviewMetrics'][m],first[k0]['reviewMetrics'][m]]
  return None if any(x is None for x in numbers) else numbers[0]-numbers[1]-numbers[2]+numbers[3]
 results['trainingChangeVersusNoLearning'].append(dict(metric=m,direction='(full episode12-1) minus (noLearning episode12-1)',**cluster([r for r in last if r['variant']=='full'],value)))
for situation in sorted(set(s for r in learning for s in r['situations'])):
 for m in ('successRate','type2Share','automaticShare','computePerDecision','failureBrier'):
  def value(r):
   a=first[trainingkey(r)]['situations'].get(situation,{}).get(m);b=r['situations'].get(situation,{}).get(m)
   return None if a is None or b is None else b-a
  results['fullSituationFirstLast'].append(dict(situation=situation,metric=m,**cluster([r for r in last if r['variant']=='full'],value)))
index={tuple(r[k] for k in ('clusterSeed','mode','seat','opponent','switching','variant')):r for r in adaptation}
for metric in ('hitRate','hitsPerMinute'):
 for switching in (False,True):
  arm=[r for r in adaptation if r['switching']==switching and r['variant']=='full']
  def value(r):
   k=tuple(r[x] for x in ('clusterSeed','mode','seat','opponent','switching')); b=index[(*k,'noAdaptation')]
   vals=[r['shots'][2][metric],r['shots'][0][metric],b['shots'][2][metric],b['shots'][0][metric]]
   return None if any(x is None for x in vals) else vals[0]-vals[1]-vals[2]+vals[3]
  results['adaptationSpecificity'].append(dict(metric=metric,switching=switching,contrast='full-minus-off last-minus-first',**cluster(arm,value)))
 arm=[r for r in adaptation if r['switching'] and r['variant']=='full']
 def specificity(r):
  k=tuple(r[x] for x in ('clusterSeed','mode','seat','opponent')); values=[]
  for switching in (True,False):
   a=index[(*k,switching,'full')];b=index[(*k,switching,'noAdaptation')]
   nums=[a['shots'][2][metric],a['shots'][0][metric],b['shots'][2][metric],b['shots'][0][metric]]
   if any(x is None for x in nums):return None
   values.append(nums[0]-nums[1]-nums[2]+nums[3])
  return values[0]-values[1]
 results['adaptationSpecificity'].append(dict(metric=metric,contrast='switching minus fixed of full-minus-off last-minus-first',**cluster(arm,specificity)))
# Sensitivity: subtract the original per-seed DID estimates using their available
# pairs, rather than selecting only pairsets with eight nonmissing window rates.
for metric in ('hitRate','hitsPerMinute'):
 cells=collections.defaultdict(lambda:collections.defaultdict(list))
 for r in adaptation:
  if r['variant']!='full': continue
  k=tuple(r[x] for x in ('clusterSeed','mode','seat','opponent','switching')); b=index[(*k,'noAdaptation')]
  values=[r['shots'][2][metric],r['shots'][0][metric],b['shots'][2][metric],b['shots'][0][metric]]
  if all(x is not None for x in values): cells[r['clusterSeed']][r['switching']].append(values[0]-values[1]-values[2]+values[3])
 xs=[np.mean(cells[k][True])-np.mean(cells[k][False]) for k in sorted(cells) if cells[k][True] and cells[k][False]]
 results['adaptationSpecificity'].append(dict(metric=metric,contrast='per-seed original available-pair DID switching minus fixed; different available pairsets retained',**estimate(xs)))
results['adaptationSpecificityCaveat']='The complete-case switching-minus-fixed hit-rate contrast conditions on only 136 of 256 paired seat/family sets; the original available-pair estimands use 180 fixed and 200 switching sets. Its positive interval is subset/weighting-sensitive, post hoc, and unadjusted. Both original primary hit-rate effects and the difference of their available-pair seedmeans are null-compatible. Hits-per-minute includes all256 sets.'
out=root/'independent-review/learning-posthoc-diagnostics.json';out.write_text(json.dumps(results,indent=2)+'\n')
print('Artifact',out)
for section in ('validation','heldoutPaired','trainingFirstLast','trainingChangeVersusNoLearning','adaptationSpecificity'):
 print(section,json.dumps(results[section],indent=2))
