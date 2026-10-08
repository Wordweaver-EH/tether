#!/usr/bin/env python3
"""Read-only audit of saved journals; never imports/executes simulation or policies."""
import collections, gzip, hashlib, json, math, time
from pathlib import Path
import numpy as np
BASE=Path(__file__).resolve().parent.parent
OUT=Path(__file__).resolve().parent
PKG=BASE/'awareness-comparison-v1'
DATA=BASE/'awareness-comparison-primary-v1'
def read(p):return json.loads(p.read_text())
def sha(b):return hashlib.sha256(b).hexdigest()
def jbytes(x):return json.dumps(x,separators=(',',':'),ensure_ascii=False).encode()
def close(a,b):return math.isclose(a,b,rel_tol=2e-12,abs_tol=2e-10)
def check(v,msg):
 if not v:raise AssertionError(msg)
def equal_num(a,b,msg):
 if isinstance(a,(int,float)) and isinstance(b,(int,float)):check(close(a,b),f'{msg}: {a} != {b}')
 else:check(a==b,f'{msg}: {a} != {b}')
manifest=read(PKG/'RUN-MANIFEST.json');freeze=read(PKG/'FREEZE.json');report=read(DATA/'REPORT.json');rawmanifest=read(DATA/'RAW-MANIFEST.json');identity=read(DATA/'RUN-IDENTITY.json')
checks={};start=time.time()
check(len(manifest)==len(rawmanifest)==len(report['bouts'])==128,'128 rows')
check(report['rawFiles']==rawmanifest,'report raw manifest')
check(identity['freeze']==freeze,'identity freeze')
check(identity['manifest']==manifest,'identity manifest')
check(report['freezeSha256']==freeze['freezeSha256']=='356e9f22241dcd44429041eccc6680c7c0d31d3483ea6051eb7c3980f9f43343','exact freeze')
check(report['gitCheckpoint']==identity['release']['gitCheckpoint']=='58834179a6bc2efa62b208e33149e877b62cdade','git checkpoint')
check(sha(jbytes({k:freeze[k] for k in ['files','dependencies','budget']}))==freeze['freezeSha256'],'freeze reconstruction')
for k,v in freeze['files'].items():check(sha((PKG/k).read_bytes())==v,'frozen file '+k)
for k,v in freeze['dependencies'].items():check(sha((BASE/k).read_bytes())==v,'dependency '+k)
check(set(freeze['files'])=={p.name for p in PKG.iterdir() if p.suffix in ['.mjs','.md','.json','.txt'] and p.name not in ['FREEZE.json','ROOT-RELEASE.json']},'unexpected source package files')
prior=read(PKG/'PRIOR-FILES.json')
for k,v in prior.items():check(sha((BASE/k).read_bytes())==v,'prior '+k)
oldraw=read(BASE/'primary-v1/RAW-MANIFEST.json')
for r in oldraw:check(sha((BASE/'primary-v1'/r['file']).read_bytes())==r['sha256'],'old raw '+r['file'])
oldfreeze=read(BASE/'repo/human-proxy/FREEZE.json')
for k,v in oldfreeze['files'].items():check(sha((BASE/'repo'/k).read_bytes())==v,'old frozen '+k)
checks['frozenFiles']=len(freeze['files']);checks['dependencies']=len(freeze['dependencies']);checks['priorFiles']=len(prior);checks['originalRawFiles']=len(oldraw);checks['originalFrozenFiles']=len(oldfreeze['files'])
def uint(ns,c,role):return int.from_bytes(hashlib.sha256(jbytes([ns,c,role])).digest()[:4],'big')
seeds=[dict(cluster=c,episodeId=uint('tether-rear-awareness-comparison-v1',c,'episode'),counterSeed=uint('tether-rear-awareness-comparison-v1',c,'counter'),ordinarySeed=uint('tether-rear-awareness-comparison-v1',c,'ordinary')) for c in range(32)]
check(seeds==read(PKG/'seeds.json'),'seed table')
expected=[dict(**s,counterSeat=seat,arm=arm,boutId=f"cluster-{s['cluster']:02d}-{seat}-{arm}") for s in seeds for seat in ['P1','P2'] for arm in (['awareness','unchanged'] if s['cluster']%2 else ['unchanged','awareness'])]
check(manifest==expected,'manifest exact deterministic order')
oldseed=read(BASE/'repo/human-proxy/seeds.json');sv={v for s in seeds for k,v in s.items() if k!='cluster'};ov={v for s in oldseed for k,v in s.items() if k!='cluster'};sm={uint('tether-rear-awareness-structural-smoke-v1',0,r) for r in ['episode','counter','ordinary']}
check(len(sv)==96 and not sv&ov and not sm&sv and not sm&ov,'seed freshness')
check(not list(DATA.glob('*attempt-[2-9]*')) and not list(DATA.glob('*pending*')) and not list(DATA.glob('RESUME*')),'only initial completed attempts')
check(len(list(DATA.glob('*.started.json')))==len(list(DATA.glob('*.checkpoint.json')))==len(list(DATA.glob('*.jsonl.gz')))==128,'artifact inventory')
checks['identityAndFreshness']='pass';checks['attemptsPerRow']=1
print('PASS source integrity, prior files, original raw, identity and seed freshness',flush=True)
counts=collections.Counter();recomputed=[];rawchecks=[];lastcompleted=identity['startedAt'];max_motor_error=0;noise_checked=0
for ix,(row,rm,rs) in enumerate(zip(manifest,rawmanifest,report['bouts'])):
 bid=row['boutId'];check(rm['file']==bid+'.attempt-1.jsonl.gz','raw order');cp=read(DATA/(bid+'.checkpoint.json'));started=read(DATA/(bid+'.attempt-1.started.json'));summary=read(DATA/cp['summaryFile'])
 check(cp['row']==row and started['row']==row and cp['attempt']==started['attempt']==1,'checkpoint identity')
 check(started['freezeSha256']==freeze['freezeSha256'],'start freeze');check(started['startedAt']>=lastcompleted and cp['completedAt']>=started['startedAt'],'serial chronology');lastcompleted=cp['completedAt']
 check(cp['rawIdentity']==rm and sha((DATA/cp['summaryFile']).read_bytes())==cp['summarySha256'],'checkpoint hashes');check(summary==rs,'report summary equality')
 compressed=(DATA/rm['file']).read_bytes();check(sha(compressed)==rm['compressedSha256'] and len(compressed)==rm['compressedBytes'],'compressed integrity')
 types=collections.Counter();uh=hashlib.sha256();ub=0;sources={};receipts=[];ordinary=[];events=[];post=[];interfaces=None;measure=None;end=None
 with gzip.open(DATA/rm['file'],'rb') as f:
  for n,line in enumerate(f):
   uh.update(line);ub+=len(line);d=json.loads(line);t=d['type'];types[t]+=1
   if t=='header':check(n==0 and d['row']==row and d['durationSec']==300 and d['format']=='tether-awareness-lossless-jsonl-v1','header')
   elif t=='sourcePacket':sources[d['tick']]=d['packet']
   elif t=='counterReceipt':receipts.append(d)
   elif t=='ordinaryIssued':ordinary.append(d)
   elif t=='event':events.append(d['event'])
   elif t=='postScanSource':post.append({k:v for k,v in d.items() if k!='type'})
   elif t=='interfaces':interfaces=d
   elif t=='measurements':measure=d['raw']
   elif t=='end':end=d
   else:raise AssertionError('unknown raw type '+t)
 check(t=='end' and types['end']==types['header']==types['interfaces']==types['measurements']==1,'exact terminal records')
 check(uh.hexdigest()==rm['uncompressedSha256'] and ub==rm['uncompressedBytes'],'uncompressed integrity')
 check(end['summary']==summary and end['receiptTruth']==[r['truth'] for r in receipts] and end['postScanSamples']==post,'end duplicate equality')
 check(list(sources)==list(range(0,36000,4)) and len(receipts)==8993 and len(ordinary)==8996,'packet and decision cadence')
 for tick,p in sources.items():
  check(p['viewerId']==row['counterSeat'] and p['mode']=='MODE_B' and close(p['time']['elapsedSec'],tick/120),'source identity/time')
  check(set(p)=={'viewerId','mode','own','scores','time','arena','opponent','opponentSpear','cone'},'source contract')
  check(p['opponentSpear'] is None or set(p['opponentSpear'])<={'state','position','direction','embedSurfaceId','recallTarget'},'spear contract')
 m={k:0 for k in summary['metrics']};reason=collections.Counter();hc={k:0 for k in summary['hitContext']};warning_active=False;wsec=0;ssec=0;priorangle=0
 rec=interfaces['counterDecisions'];ordrec=interfaces['ordinaryDecisions'];check(len(rec)==len(receipts) and len(ordrec)==len(ordinary),'interface decision counts')
 for i,(r,journal) in enumerate(zip(rec,receipts)):
  tick=30+4*i;d=r['diagnostic'];a=d['assessment'];cmd=r['command'];bc=d['baseCommand'];proposal=d['command'];sp=sources[4*i];truth=journal['truth'];scan=(row['arm']=='awareness' and a['warning'])
  check(r['decision']==i and journal['tick']==tick and close(r['receiptTime'],tick/120) and close(r['sensorTime'],i/30),'counter timing')
  check(cmd==journal['command'] and d==journal['diagnostic'],'counter duplicate equality')
  check(d['arm']==row['arm'] and close(a['sensorTime'],r['sensorTime']) and close(a['receiptTime'],r['receiptTime']),'assessment identity')
  vis={'opponent':sp['opponent'] is not None,'enemySpear':sp['opponentSpear'] is not None,'enemySpearState':None if sp['opponentSpear'] is None else sp['opponentSpear']['state']}
  check(d['visibility']==vis,'source delayed visibility')
  check(d['scan']==scan and d['withheldThrow']==(scan and bc['throw']),'scan and throw arbitration')
  check(cmd['recall']==bc['recall'] and proposal['recall']==bc['recall'],'recall preserved')
  expectedcommand=dict(bc)
  if scan:
   expectedcommand.update(aimX=a['proposal']['scanAim']['x'],aimY=a['proposal']['scanAim']['y'],throw=False)
   if a['proposal']['movement']:expectedcommand.update(moveX=a['proposal']['movement']['x'],moveY=a['proposal']['movement']['y'])
  check(proposal==expectedcommand,'arbitration exact')
  check(d['movementOverride']==(scan and bool(a['proposal']['movement'])),'movement classification')
  for k in ['moveX','moveY','throw','recall']:check(cmd[k]==proposal[k],'only aim receives noise')
  bs=hashlib.sha256(jbytes(['tether-motor-v1',row['episodeId'],row['counterSeat'],i])).digest();u=(int.from_bytes(bs[:4],'big')+.5)/2**32;v=(int.from_bytes(bs[4:8],'big')+.5)/2**32;sample=math.sqrt(-2*math.log(u))*math.cos(2*math.pi*v)
  equal_num(sample,r['sample'],'indexed noise');angle=math.atan2(proposal['aimY'],proposal['aimX']);delta=math.atan2(math.sin(angle-priorangle),math.cos(angle-priorangle));sigma=min(.18,.034+.0075*abs(delta)*30) if math.hypot(proposal['aimX'],proposal['aimY']) else 0
  equal_num(sigma,r['sigma'],'sigma');
  if sigma:
   ax=math.cos(angle+sample*sigma);ay=math.sin(angle+sample*sigma);equal_num(ax,cmd['aimX'],'single motor aim x');equal_num(ay,cmd['aimY'],'single motor aim y');max_motor_error=max(max_motor_error,abs(ax-cmd['aimX']),abs(ay-cmd['aimY']));priorangle=angle
  noise_checked+=1;m['decisions']+=1;m['motorSigmaTotal']+=r['sigma'];reason[a['reason']]+=1
  m['warnings']+=a['warning'];m['warningEpisodes']+=bool(a['warning'] and not warning_active)
  if a['warning']:
   m['warningActualReturning' if truth['enemySpearState']=='RETURNING' else 'warningActualNotReturning']+=1;wsec+=min(1/30,300-r['receiptTime'])
  elif warning_active and vis['enemySpear']:m['reacquisitions']+=1
  warning_active=a['warning'];m['warningExpired']+=a['reason']=='evidence-expired';m['warningScoreResets']+=a['observedScoreChange']
  m['visibleOpponentDecisions']+=vis['opponent'];m['visibleSpearDecisions']+=vis['enemySpear'];m['visibleReturningDecisions']+=vis['enemySpearState']=='RETURNING';m['baseProposedThrows']+=bc['throw'];m['throwCommands']+=cmd['throw'];m['withheldThrows']+=d['withheldThrow'];m['alignedAwayOpportunities']+=bool(d['base']['opportunity'] and d['base']['aligned'] and d['base']['supportedAway'])
  check(not cmd['throw'] or (d['base']['opportunity'] and d['base']['aligned'] and d['base']['supportedAway']),'throw opportunity')
  if scan:
   m['scans']+=1;m['movementOverrides' if d['movementOverride'] else 'scanOnly']+=1;ssec+=min(1/30,300-r['receiptTime']);delta=math.atan2(proposal['aimY'],proposal['aimX'])-math.atan2(bc['aimY'],bc['aimX']);disp=abs(math.atan2(math.sin(delta),math.cos(delta)));equal_num(disp,d['scanAimDisplacementRad'],'scan displacement');m['scanAimDisplacementRadTotal']+=disp
 for i,(r,j) in enumerate(zip(ordrec,ordinary)):
  check(r['decision']==i and j['tick']==18+4*i and close(r['receiptTime'],(18+4*i)/120) and close(r['sensorTime'],i/30) and r['command']==j['command'],'ordinary cadence/command')
  seat='P2' if row['counterSeat']=='P1' else 'P1';bs=hashlib.sha256(jbytes(['tether-motor-v1',row['episodeId'],seat,i])).digest();u=(int.from_bytes(bs[:4],'big')+.5)/2**32;v=(int.from_bytes(bs[4:8],'big')+.5)/2**32;sample=math.sqrt(-2*math.log(u))*math.cos(2*math.pi*v);equal_num(sample,r['sample'],'ordinary indexed noise');noise_checked+=1
 scans={r['tick']:r for r in receipts if r['diagnostic']['scan']};expectedpost={t+2 for t in scans if t+2<36000};check({p['tick'] for p in post}==expectedpost and len(post)==len(expectedpost),'post-scan completeness')
 for p in post:
  check(p['tick']==p['scanTick']+2 and p['scanTick'] in scans,'post-scan grid');sp=sources[p['tick']];check(p['enemySpearVisible']==(sp['opponentSpear'] is not None) and p['opponentVisible']==(sp['opponent'] is not None) and p['scores']==sp['scores'],'post-scan visibility');check(p['scoreChanged']==(p['scores']!=scans[p['scanTick']]['truth']['scores']),'post-scan score transition');m['postScanSamples']+=1;m['postScanSpearVisible']+=p['enemySpearVisible'];m['postScanReturningVisible']+=p['enemySpearVisible'] and p['enemySpearState']=='RETURNING';m['postScanOpponentVisible']+=p['opponentVisible']
 ehits=[e for e in events if e['type']=='HIT'];mhits=measure['hits'];check(len(ehits)==len(mhits),'event/measurement hits')
 for e,h in zip(ehits,mhits):
  check(e['attacker']==h['attacker'] and e['victim']==h['victim'] and e['phase']==h['phase'] and e['tick']==h['impactTick'],'hit lineage cross-check');check(h['phase'] in ['OUTBOUND','RETURNING'],'hit phase');own=e['attacker']==row['counterSeat'];m['delivered' if own else 'totalReceived']+=1;m[('returning' if e['phase']=='RETURNING' else 'outbound')+('Delivered' if own else 'Received')]+=1
  throws={t['throwId']:t for t in measure['throws']};check(h['throwId'] in throws and throws[h['throwId']]['launchTick']==h['launchTick'],'throw lineage')
  if not own:
   for condition,key in [('warning','receivedWhileWarning'),('scan','receivedWhileScanning')]:
    if e['counterContext'][condition]:hc[key]+=1;hc[('returningReceivedWhileWarning' if condition=='warning' else 'returningReceivedWhileScanning')]+=e['phase']=='RETURNING'
 for e in events:
  if e['type']=='THROW' and e['player']==row['counterSeat']:
   m['actualThrows']+=1;check(e['tick']>=30 and (e['tick']-30)%4==0 and rec[(e['tick']-30)//4]['command']['throw'],'actual throw link')
  if e['type']=='RECALL_START' and e['owner']==row['counterSeat']:m['actualRecalls']+=1
 for k,v in m.items():equal_num(v,summary['metrics'][k],bid+' metric '+k)
 check(reason==summary['reasonCounts'] and hc==summary['hitContext'],'process contexts')
 equal_num(wsec,summary['warningExposureSec'],'warning exposure');equal_num(ssec,summary['scanExposureSec'],'scan exposure')
 check(summary['elapsedSec']==300 and summary['counterHits']==m['delivered'] and summary['ordinaryHits']==m['totalReceived'] and summary['scores'][row['counterSeat']]==m['delivered'],'score exposure');check(summary['failures']==[],'recorded failures');equal_num(summary['netHitsPerMin'],(m['delivered']-m['totalReceived'])/5,'net rate')
 recomputed.append(dict(**row,metrics=m,warningExposureSec=wsec,scanExposureSec=ssec,hitContext=hc));counts.update(types);rawchecks.append(dict(file=rm['file'],compressedSha256=rm['compressedSha256'],uncompressedSha256=rm['uncompressedSha256'],status='pass'))
 if (ix+1)%8==0:print(f'PASS raw {ix+1}/128; elapsed {time.time()-start:.1f}s',flush=True)
(OUT/'RECONSTRUCTED-BOUT-METRICS.json').write_text(json.dumps(recomputed,indent=2)+'\n')
checks['rawRecordTypes']=dict(counts);checks['rawFiles']=rawchecks;checks['indexedNoiseSamplesVerified']=noise_checked;checks['maxMotorAimReconstructionError']=max_motor_error
# An independent NumPy bootstrap with the exact preregistered SHA256 draw addresses.
draw=np.array([[uint('tether-rear-awareness-bootstrap-v1',r,i)%32 for i in range(32)] for r in range(20000)],dtype=np.int64)
by={(r['cluster'],r['counterSeat'],r['arm']):r for r in recomputed};arms=['unchanged','awareness'];cluster={a:{k:np.array([sum(by[c,s,a]['metrics'][k] for s in ['P1','P2']) for c in range(32)],dtype=float) for k in recomputed[0]['metrics']} for a in arms}
def interval(values):return dict(estimate=float(np.mean(values)),ci95=np.quantile(np.mean(values[draw],axis=1),[.025,.975],method='linear').tolist(),undefinedResamples=0)
def checkstat(got,expected,label):
 equal_num(got['estimate'],expected['estimate'],label+' estimate');check(got['undefinedResamples']==expected['undefinedResamples'],label+' undefined')
 if got['ci95'] is None:check(expected['ci95'] is None,label+' CI null')
 else:
  for x,y in zip(got['ci95'],expected['ci95']):equal_num(x,y,label+' CI')
net={a:(cluster[a]['delivered']-cluster[a]['totalReceived'])/10 for a in arms};primary=interval(net['awareness']-net['unchanged']);checkstat(primary,report['statisticalResult']['primary'],'primary');stats={'primary':primary,'againstOrdinary':{},'secondary':{}}
for a in arms:
 stat=interval(net[a]);checkstat(stat,report['statisticalResult']['againstOrdinary'][a],a);stats['againstOrdinary'][a]=stat
for k,expected in report['statisticalResult']['secondary'].items():
 if 'numeratorMetric' not in expected:
  rates={a:cluster[a][k]/10 for a in arms};sign=-1 if k in ['returningReceived','outboundReceived','totalReceived'] else 1;stat=interval(sign*(rates['awareness']-rates['unchanged']));stat['arms']={a:interval(rates[a]) for a in arms}
 else:
  n=expected['numeratorMetric'];d=expected['denominatorMetric'];rep={};est={};undef={};a_stats={}
  for a in arms:
   num=cluster[a][n];den=cluster[a][d];est[a]=float(num.sum()/den.sum()) if den.sum() else None;bn=num[draw].sum(axis=1);bd=den[draw].sum(axis=1);undef[a]=int(np.count_nonzero(bd==0));rep[a]=np.divide(bn,bd,out=np.full(20000,np.nan),where=bd!=0);a_stats[a]={'estimate':est[a],'ci95':None if undef[a] else np.quantile(rep[a],[.025,.975],method='linear').tolist(),'undefinedResamples':undef[a]}
  invalid=int(np.count_nonzero(np.isnan(rep['awareness'])|np.isnan(rep['unchanged'])));stat={'estimate':None if any(est[a] is None for a in arms) else est['awareness']-est['unchanged'],'ci95':None if invalid else np.quantile(rep['awareness']-rep['unchanged'],[.025,.975],method='linear').tolist(),'undefinedResamples':invalid,'arms':a_stats}
 checkstat(stat,expected,k)
 for a in arms:checkstat(stat['arms'][a],expected['arms'][a],k+' '+a)
 stats['secondary'][k]=stat
checks['statistics']={'primaryAndArmIntervals':'pass','secondaryMetricsChecked':len(stats['secondary']),'resamples':20000,'clusters':32,'independentImplementation':'Python/NumPy; no original statistic function imported'}
totals={a:{k:float(v.sum()) for k,v in cluster[a].items()} for a in arms}
for a in arms:
 for k,v in totals[a].items():equal_num(v,report['statisticalResult']['perArm'][a]['metrics'][k]['total'],'per-arm total '+k)
checks['elapsedSeconds']=time.time()-start
result={'status':'pass','scope':'Saved-data-only independent audit; no controllers, new matches, searches or outcome tuning executed','reportSha256':sha((DATA/'REPORT.json').read_bytes()),'rawManifestSha256':sha((DATA/'RAW-MANIFEST.json').read_bytes()),'runIdentitySha256':sha((DATA/'RUN-IDENTITY.json').read_bytes()),'checks':checks,'totals':totals,'statistics':stats}
(OUT/'VERIFICATION.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'status':'pass','elapsedSeconds':checks['elapsedSeconds'],'primary':primary,'totals':{a:{k:totals[a][k] for k in ['delivered','totalReceived','returningReceived','outboundReceived','actualThrows','actualRecalls','warnings','scans']} for a in arms}}),flush=True)
