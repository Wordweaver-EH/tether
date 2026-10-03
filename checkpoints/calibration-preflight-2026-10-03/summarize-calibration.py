# Saved-row analysis only. Does not instantiate any controller or run any timing.
import pathlib,json,hashlib,statistics,sys,math
root=pathlib.Path(__file__).resolve().parent;out=root/'receipts'
execution=json.loads((out/'EXECUTION.json').read_text());plan=json.loads((root/'CALIBRATION-PLAN.json').read_text())
if execution['status']!='COMPLETED' or len(execution['runs'])!=40:raise SystemExit('Incomplete calibration; cannot select levels')
assignments=[(r['trial'],r['controller']) for r in execution['runs']]
expected={(t,n) for t in range(5) for n in plan['controllers']}
if len(set(assignments))!=40 or set(assignments)!=expected or any(r['status']!='completed' for r in execution['runs']):raise SystemExit('Incorrect unique controller/trial assignments')
rows=[];setup=[];hashes={}
for run in execution['runs']:
 b=pathlib.Path(run['raw']).read_bytes()
 if hashlib.sha256(b).hexdigest()!=run['sha256']:raise SystemExit('Raw timing changed')
 chunk=[json.loads(x) for x in b.splitlines()]
 if len(chunk)!=484 or sum(x['phase']=='setup' for x in chunk)!=4 or sum(x['phase']=='measured' for x in chunk)!=400 or sum(x['phase']=='warmup' for x in chunk)!=80:raise SystemExit('Unexpected sample counts')
 for x in chunk:
  if x.get('name')!=run['controller'] or x.get('trial')!=run['trial'] or x.get('fixture') not in plan['fixtures']:raise SystemExit('Misassigned timing row')
  if not all(isinstance(x[k],(int,float)) and math.isfinite(x[k]) and x[k]>=0 for k in ['wallNs','cpuUserUs','cpuSystemUs']) or x['wallNs']<=0:raise SystemExit('Invalid timing values')
 for f in plan['fixtures']:
  fr=[x for x in chunk if x['fixture']==f];ds=[x for x in fr if x['phase']!='setup']
  if len(fr)!=121 or sum(x['phase']=='setup' for x in fr)!=1 or len(ds)!=120 or set(x['decision'] for x in ds)!=set(range(120)):raise SystemExit('Incorrect per-fixture decision indexes')
  for x in ds:
   if x['phase']!=('warmup' if x['decision']<20 else 'measured') or x['tick']!=18+4*x['decision']:raise SystemExit('Incorrect phase or decision clock')
 for x in chunk:
  if x['phase']=='setup':setup.append(x);continue
  key=(x['fixture'],x['decision'])
  if key in hashes and hashes[key]!=x['deliveredPerceptSHA256']:raise SystemExit('Controllers received different exogenous percepts')
  hashes[key]=x['deliveredPerceptSHA256']
  if x['receiptTime']<=x['sensorTime'] or abs(x['receiptTime']-x['sensorTime']-.15)>1e-8:raise SystemExit('Sensory delay mismatch')
  if x['phase']=='measured':rows.append(x)
def metrics(rs):
 a=sorted(x['wallNs']/1e6 for x in rs)
 return {'count':len(a),'meanWallMs':statistics.mean(a),'medianWallMs':statistics.median(a),'p95WallMs':a[int(.95*(len(a)-1))],'meanCPUms':statistics.mean((x['cpuUserUs']+x['cpuSystemUs'])/1000 for x in rs)}
stats={name:metrics([x for x in rows if x['name']==name]) for name in plan['controllers']}
if any(v['count']!=2000 for v in stats.values()):raise SystemExit('Unbalanced controller counts')
mind=stats['mind']['meanWallMs'];levels={};targets={}
for target in [2,4]:
 attaining=[i for i in range(6) if stats[f'robust-{i}']['meanWallMs']>=target*mind]
 level=attaining[0] if attaining else 5;arm=f'conventional-useful-{target}x';levels[arm]=level
 selected=[x for x in rows if x['name']==f'robust-{level}'];targets[arm]={'requestedRatio':target,'level':level,'achievedMeanWallRatio':stats[f'robust-{level}']['meanWallMs']/mind,'targetAttained':bool(attaining),'fractionDecisionsAtOrAboveTargetMindMean':sum(x['wallNs']/1e6>=target*mind for x in selected)/len(selected)}
C=(3681280*(stats['param']['meanWallMs']+sum(stats[f'robust-{levels[f"conventional-useful-{t}x"]}']['meanWallMs'] for t in [2,4]))+3454464*mind)/3600000
cpuAllowance=3*C+2;wallAllowance=cpuAllowance/min(8,4)+.5
scope=plan['decisionScope'];targetStatus={'scope':'outcome-blind yoked workload only; later gameplay ratios required','targets':targets,'duplicateSelectedLevels':len(set(levels.values()))<2}
resource={'controllerOnlySerialWallHours':C,'CPUHourPlanningAllowance':cpuAllowance,'wallHourPlanningAllowance':wallAllowance,'formula':'C=[3681280*(param+selected2x+selected4x)+3454464*mind]/3600000, input means in ms; allowance=3*C+2; wall=allowance/min(8,4)+.5','interpretation':'3x multiplier and2-hour reserve are declared planning assumptions for sim/opponents/serialization etc; not measured or certified total CPU. Runtime ceilings remain monitored stop thresholds.'}
record={'status':'PASS' if cpuAllowance<=24 and wallAllowance<=8 else 'BLOCKED_RESOURCE_ESTIMATE','sourceFingerprint':execution['sourceFingerprint'],'remoteVerifiedCommit':execution['remoteVerifiedCommit'],'selectionMetric':'meanWallMs','trials':5,'plannedWorkers':plan['resourceFormula']['plannedWorkers'],'levels':levels,'hardwareScope':execution['hardwareScope'],'measurementScope':scope,'targetStatus':targetStatus,'estimatedCPUHours':cpuAllowance,'estimatedWallHours':wallAllowance,'resourceEstimate':resource,'controllerMetrics':stats,'perFixture':{n:{f:metrics([x for x in rows if x['name']==n and x['fixture']==f]) for f in plan['fixtures']} for n in plan['controllers']},'perTrial':{n:{str(t):metrics([x for x in rows if x['name']==n and x['trial']==t]) for t in range(5)} for n in plan['controllers']},'setupMetrics':{n:metrics([x for x in setup if x['name']==n]) for n in plan['controllers']},'mindRoutes':{str(t):sum(x['name']=='mind' and x['cognition']['tier']==t for x in rows) for t in [0,1,2]},'mindBranchWork':{k:sum(x['cognition'].get(k,0) for x in rows if x['name']=='mind') for k in ['branches','completedBranches','branchTrials','branchSteps','realDeliberation']},'plannerTotals':{n:{k:sum((x['work'] or {}).get(k,0) for x in rows if x['name']==n) for k in ['candidates','hypotheses','completedTrajectories','integrationSteps']} for n in plan['controllers'] if n.startswith('robust-')},'plannerFallbackDecisions':{n:sum(bool((x['work'] or {}).get('fallback')) for x in rows if x['name']==n) for n in plan['controllers'] if n.startswith('robust-')},'limitations':[plan['workloadNature'],plan['mindSnapshot'],plan['controllerOrder'],'No gameplay strength or exact total compute claim.']}
(out/'TIMING-RECEIPT.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({'status':record['status'],'levels':levels,'targetStatus':targetStatus,'resourceEstimate':resource},indent=2))
