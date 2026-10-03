#!/usr/bin/env python3
"""Independent aggregation/timing validation, saved JSON only; no matches.
Usage: python validate-summary.py STUDY_DIR RESULT_DIR
Visibility reconstruction is not independently reimplemented by this validator.
"""
import hashlib,json,pathlib,sys,collections,math
base=pathlib.Path(sys.argv[1]);out=pathlib.Path(sys.argv[2])
read=lambda p:json.loads(p.read_text())
rows=[json.loads(l) for l in (out/'RETURNING-HITS.jsonl').read_text().splitlines()]
by_id={r['throwId']:r for r in rows}; summary=read(out/'SUMMARY.json')
assert len(rows)==len(by_id)==1685
counts=collections.Counter();maximum_error=0;files=0
for mf in read(base/'primary-v1/RAW-MANIFEST.json'):
 p=base/'primary-v1'/mf['file'];raw=p.read_bytes();assert hashlib.sha256(raw).hexdigest()==mf['sha256'];files+=1
 b=json.loads(raw);throws={t['throwId']:t for t in b['measurements']['throws']}
 for h in b['measurements']['hits']:
  if h['phase']!='RETURNING':continue
  row=by_id[h['throwId']];rec=h['recall'];att='counter' if h['attacker']==b['counterSeat'] else 'ordinary'
  assert row['attackerRole']==att
  age=(h['impactTick']-rec['tick']+h['impactFraction'])/120
  error=abs(age-row['recallToHitSec']);maximum_error=max(maximum_error,error);assert error<1e-10
  t=throws[h['throwId']];assert t['recalls'][-1]==rec
  assert row['firstPossibleReturningPacketReceiptTick']==4*(rec['tick']//4+1)+(30 if att=='ordinary' else 18)
  counts[att,'hits']+=1;counts[att,'before250ms']+=age<.25
  if att=='ordinary':
   attacks=[x['launchTick'] for x in throws.values() if x['owner']==b['counterSeat'] and t['launchTick']<=x['launchTick']<=h['impactTick']]
   assert len(attacks)==len(row['counterAttacksDuringEnemyThrow'])
   assert sum(x>=rec['tick'] for x in attacks)==row['counterAttacksDuringReturn']
for role in ['ordinary','counter']:
 assert summary['byAttacker'][role]['returningHits']==counts[role,'hits']
 assert summary['byAttacker'][role]['before250ms']==counts[role,'before250ms']
assert (counts['ordinary','hits'],counts['counter','hits'])==(1178,507)
assert (counts['ordinary','before250ms'],counts['counter','before250ms'])==(44,507)
print(json.dumps({'status':'passed','rawFilesRehashed':files,'returningHitRowsChecked':len(rows),'maxTimingErrorSec':maximum_error,'scope':'Independent raw aggregation, lineage, latency-grid and attack-link checks; visibility not independently reimplemented'},indent=2))
