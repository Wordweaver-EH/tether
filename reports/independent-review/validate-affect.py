import json,pathlib,hashlib,collections,math
root=pathlib.Path('/workspace/shared/tether-review/affect-repair');r=json.loads((root/'reports/affect-repair-targeted.json').read_text());rows=r['rows'];protocol=r['protocol'];before=r['manifest'];h=hashlib.sha256()
for p,want in sorted(before['source']['files'].items()):
 data=(root/p).read_bytes();assert hashlib.sha256(data).hexdigest()==want,p;h.update(p.encode()+b'\0'+data+b'\0')
assert h.hexdigest()==before['source']['hash']
for p,want in before['additional'].items():assert hashlib.sha256((root/p).read_bytes()).hexdigest()==want,p
keys={(x['seed'],x['mode'],x['seat'],x['opponent']) for x in rows}
expected={(seed,mode,seat,opp) for seed in range(200001,200033) for mode in ('MODE_A','MODE_B') for seat in (1,2) for opp in ('directShooter','immediateRecaller','reactiveDodger')}
assert len(rows)==384 and keys==expected and len({x['id'] for x in rows})==384
for x in rows:
 for arm in ('full','noAffect'):
  a=x[arm];c=a['cognition'];assert a['elapsedSec']==300 and c['budgetLimit']==192 and c['maxBudgetSpent']<=192 and c['budgetSpent']<=c['cycles']*192
  score=a['score'];margin=score[f"P{x['seat']}"]-score[f"P{3-x['seat']}"]
  assert margin==a['metrics']['scoreMargin'];assert a['metrics']['win']==(1 if margin>0 else .5 if margin==0 else 0)
 assert x['comparison']['inputTicks']==36000
 assert x['comparison']['sameActionHash']==(x['full']['actionHash']==x['noAffect']['actionHash'])
 assert x['comparison']['sameActionHash']==(x['comparison']['differingTicks']==0)
 assert 0<=x['comparison']['differingDecisionTicks']<=9000
 def summetric(m):return x['noAffect']['metrics'][m]-x['full']['metrics'][m]
def interval(xs):
 state=72931;means=[]
 for d in range(2000):
  z=0
  for i in range(len(xs)):
   state=(1664525*state+1013904223)&0xffffffff;z+=xs[int(state/4294967296*len(xs))]
  means.append(z/len(xs))
 means.sort();return dict(mean=sum(xs)/len(xs),lo=means[50],hi=means[1950],n=len(xs))
maxdiscrepancy=0;contrasts=[]
for group,predicate,summary in [('all',lambda x:True,r['summary']['effects'])]+[(mode,lambda x,m=mode:x['mode']==m,r['summary']['byMode'][mode]) for mode in protocol['modes']]+[(opp,lambda x,o=opp:x['opponent']==o,r['summary']['byOpponent'][opp]) for opp in protocol['opponents']]:
 for metric in ('scoreMargin','win','focusSwitchesPerMinute'):
  ds=collections.defaultdict(list)
  for x in rows:
   if predicate(x):ds[x['seed']].append(x['noAffect']['metrics'][metric]-x['full']['metrics'][metric])
  e=interval([sum(ds[k])/len(ds[k]) for k in sorted(ds)])
  for k in ('mean','lo','hi'):maxdiscrepancy=max(maxdiscrepancy,abs(e[k]-summary[metric][k]))
  contrasts.append(dict(group=group,metric=metric,direction='noAffect minus repaired full',**e))
assert maxdiscrepancy<1e-10
out=dict(status='PASS independent targeted affect validation',sourceFingerprint=h.hexdigest(),pairs=384,bouts=768,seedClusters=32,allActionStreamsDiffer=all(not x['comparison']['sameActionHash'] for x in rows),fullDuration=True,completeExpectedSchedule=True,allBudgetCaps=True,sourceAndProtocolUnchanged=True,maximumCIEndpointDiscrepancy=maxdiscrepancy,contrasts=contrasts)
p=pathlib.Path('/workspace/shared/tether-review/independent-review/affect-independent-validation.json');p.write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
