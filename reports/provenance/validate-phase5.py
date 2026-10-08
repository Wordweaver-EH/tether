import json, math, collections, pathlib
p=pathlib.Path(__file__).parent
assert (p/'phase5-final.exit').read_text().strip()=='0', 'runner did not exit successfully'
r=json.loads((p/'phase5-final.json').read_text())
rows=r['rows']; expected=39168
assert len(rows)==expected
assert len({x['id'] for x in rows})==expected and sorted(x['id'] for x in rows)==list(range(expected))
manifest=json.loads((p/'source-manifest.json').read_text())
assert r['sourceFingerprint']['before']==r['sourceFingerprint']['after']==manifest['hash']
variants=collections.Counter(x['variant'] for x in rows)
assert len(variants)==17 and set(variants.values())=={2304}
assert set(collections.Counter((x['variant'],x['budget']) for x in rows).values())=={768}
assert len(r['summary'])==48
keys=['budget','seed','mode','seat','opponent']
base={tuple(x[k] for k in keys):x for x in rows if x['variant']=='full'}
assert len(base)==2304
for x in rows:
 assert x['durationSec']==x['elapsedSec']==300
 b=x['budgetValidation']; assert b['requested']==b['reported']==x['budget']
 assert b['maxSpent']<=x['budget'] and b['spent']<=b['cycles']*x['budget']+1e-7
 a=x['score'][f"P{x['seat']}"];o=x['score'][f"P{3-x['seat']}"]
 assert x['metrics']['scoreMargin']==a-o
 assert x['metrics']['win']==(0.5 if a==o else 1 if a>o else 0)
 for value in x['metrics'].values():assert value is None or isinstance(value,(int,float)) and math.isfinite(value)
for s in r['summary']:
 for metric in ['win','scoreMargin']:
  e=s['effects'][metric];assert e['n']==32 and e['pairedBouts']==768 and e['lo']<=e['hi']
  deltas=[x['metrics'][metric]-base[tuple(x[k] for k in keys)]['metrics'][metric] for x in rows if x['variant']==s['variant'] and x['budget']==s['budget']]
  assert abs(sum(deltas)/len(deltas)-e['mean'])<1e-10
validation={'passed':True,'bouts':expected,'variants':len(variants),'boutsPerVariant':2304,'budgetRows':48,'pairedBoutsPerBudgetRow':768,'seedClusters':32,'sourceFingerprint':manifest['hash'],'runtimeHours':r['runtime']['seconds']/3600,'checks':['unique complete jobs','balanced variants/budgets','full300s bouts','per-cycle and cumulative budget caps','score/win recomputation','paired effect mean recomputation','32seed clusters per primary CI','unchanged source fingerprint']}
(p/'phase5-validation.json').write_text(json.dumps(validation,indent=2)+'\n')
print(json.dumps(validation,indent=2))
print('\nABLATION BUDGET WIN_EFFECT SCORE_EFFECT')
for s in r['summary']:
 def f(k):
  e=s['effects'][k];return f"{e['mean']:.6f} [{e['lo']:.6f}, {e['hi']:.6f}]"
 print(s['variant'],s['budget'],f('win'),f('scoreMargin'))
