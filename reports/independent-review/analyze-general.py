"""Post-hoc independent terminal analysis. Does not run bouts or alter frozen source."""
import json, collections, pathlib, math
import numpy as np
from scipy.stats import t
root=pathlib.Path('/workspace/shared/tether-review')
rows={}; variants=set(); basestats=collections.defaultdict(lambda:collections.defaultdict(list)); situations=collections.defaultdict(lambda:collections.Counter())
for line in (root/'final-reports/phase5-final.rows.jsonl').open():
 r=json.loads(line); k=(r['budget'],r['seed'],r['mode'],r['seat'],r['opponent']); rows[(r['variant'],k)]=r; variants.add(r['variant'])
 if r['variant']=='full':
  for m,v in r['metrics'].items():
   if v is not None: basestats[r['budget']][m].append(v)
  basestats[r['budget']]['maxBudgetSpent'].append(r['cognition']['maxBudgetSpent'])
 if r['variant'] in ('full','noAutomatization'):
  for s,c in r['cognition']['bySituation'].items():
   for name in ('decisions','automaticDecisions','escalations','outcomes','successes','failures','budgetSpent'):
    situations[(r['variant'],r['budget'],s)][name]+=c[name]
variants=sorted(variants-{'full'})
metrics=list(next(iter(rows.values()))['metrics'])
behavior=('throwsPerMinute','recallsPerMinute','lookAwayFraction','scanReversalsPerMinute','hitsAfterLookAwayPerMinute','secondLocationFraction','meanMovementInput','aimChangePerTick')
cluster={}; changed={}; contrasts=[]
for v in variants:
 changed[v]={}
 for b in (48,192,512):
  changed[v][b]={'pairs':0,'metrics':collections.Counter(),'anyMetric':0,'anyCognition':0,'anyExternalBehavior':0}
  delta=collections.defaultdict(lambda:collections.defaultdict(list))
  for (variant,k),r in rows.items():
   if variant!=v or k[0]!=b: continue
   f=rows[('full',k)]; ch=changed[v][b]; ch['pairs']+=1
   ch['anyMetric']+=r['metrics']!=f['metrics']; ch['anyCognition']+=r['cognition']!=f['cognition']
   ch['anyExternalBehavior']+=any(r['metrics'][m]!=f['metrics'][m] for m in behavior)
   for m in metrics:
    a=f['metrics'][m]; z=r['metrics'][m]
    if a!=z: ch['metrics'][m]+=1
    if a is not None and z is not None: delta[m][k[1]].append(z-a)
  for m,ds in delta.items():
   cluster[(v,b,m)]=np.array([np.mean(ds[s]) for s in sorted(ds)])
  for m in ('win','scoreMargin'):
   x=cluster[(v,b,m)]; mu=float(np.mean(x)); se=float(np.std(x,ddof=1)/np.sqrt(len(x)))
   # Conservative approximate simultaneous family: all 16 ablations x 3 budgets x 2 outcomes.
   crit=float(t.ppf(1-.05/(2*96),len(x)-1))
   contrasts.append(dict(variant=v,budget=b,metric=m,mean=mu,n=len(x),se=se,
      bonferroni96tLo=mu-crit*se,bonferroni96tHi=mu+crit*se))
rng=np.random.default_rng(61020743)
interactions=[]
for m in ('win','scoreMargin'):
 for high,low in ((192,48),(512,48),(512,192)):
  x=cluster[('noWorkspace',high,m)]-cluster[('noWorkspace',low,m)]
  samples=np.mean(x[rng.integers(0,len(x),(20000,len(x)))],axis=1)
  interactions.append(dict(metric=m,high=high,low=low,contrast='(ablated-full) high minus low',mean=float(x.mean()),lo=float(np.quantile(samples,.025)),hi=float(np.quantile(samples,.975)),n=len(x)))
def original_bootstrap_ci(v):
 state=72931; means=[]
 for draw in range(2000):
  total=0
  for i in range(len(v)):
   state=(state*1664525+1013904223)&0xffffffff
   total+=v[math.floor((state/4294967296)*len(v))]
  means.append(total/len(v))
 means.sort(); return means[50],means[1950]
original_summary=json.loads((root/'final-reports/phase5-summary.json').read_text())
max_ci_discrepancy=0; ci_count=0
for item in original_summary['summary']:
 for metric in ('win','scoreMargin'):
  lo,hi=original_bootstrap_ci(cluster[(item['variant'],item['budget'],metric)])
  e=item['effects'][metric]
  max_ci_discrepancy=max(max_ci_discrepancy,abs(lo-e['lo']),abs(hi-e['hi']));ci_count+=1
assert max_ci_discrepancy<1e-10
output={'analysisStatus':'POST HOC after terminal general results; exploratory sensitivity and diagnostics, not preregistered confirmation',
'primaryCIVerification':{'contrasts':ci_count,'maximumEndpointDiscrepancy':max_ci_discrepancy,'method':'Independent Python reimplementation of original deterministic 2000draw seed-cluster bootstrap'},
'baseline':{b:{m:{'mean':float(np.mean(a)),'min':min(a),'max':max(a)} for m,a in ms.items()} for b,ms in basestats.items()},
'changedPairs':changed,'situations':[dict(variant=v,budget=b,situation=s,**c) for (v,b,s),c in situations.items()],
'outcomeMultiplicitySensitivity':contrasts,'workspaceBudgetInteractions':interactions,
'method':'Paired differences averaged within seed across two seats, two modes, six opponents; n=32. Post-hoc multiplicity sensitivity: approximate Bonferroni cluster-t 95% simultaneous intervals across 96 win/score contrasts (16x3x2). D14 interactions: paired same-seed cross-budget difference, percentile bootstrap 20000 draws, unadjusted; no equivalence margin specified.'}
p=root/'independent-review/general-posthoc-diagnostics.json'; p.write_text(json.dumps(output,indent=2)+'\n')
print('Artifact:',p)
for v in ('noAffect','noAutomatization'):
 print(v,json.dumps(changed[v],indent=2))
print('D14 interactions',json.dumps(interactions,indent=2))
for b in (48,192,512):
 print('budget',b,'full means:',{m:round(float(np.mean(basestats[b][m])),6) for m in ('win','scoreMargin','budgetSpentPerCycle','escalationFraction','automaticFraction')},'max spent',max(basestats[b]['maxBudgetSpent']))
 print('full automatic situation totals:',{s: c['automaticDecisions'] for (v,bb,s),c in situations.items() if v=='full' and bb==b and c['automaticDecisions']})
print('Contrasts excluding zero after96outcomeBonferroni:')
for r in contrasts:
 if r['bonferroni96tLo']>0 or r['bonferroni96tHi']<0: print(r['variant'],r['budget'],r['metric'],*[round(r[k],6) for k in ('mean','bonferroni96tLo','bonferroni96tHi')])
