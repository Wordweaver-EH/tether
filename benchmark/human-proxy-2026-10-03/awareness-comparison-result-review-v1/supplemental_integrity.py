"""Additional read-only provenance, progression and HIT-context joins."""
import json,hashlib,gzip,collections,time
from pathlib import Path
B=Path(__file__).resolve().parent.parent;O=Path(__file__).resolve().parent;D=B/'awareness-comparison-primary-v1';P=B/'awareness-comparison-v1'
def read(p):return json.loads(p.read_text())
protected=read(B/'repo/human-proxy/FROZEN-SOURCE-MANIFEST.json')
for p,h in protected.items():assert hashlib.sha256((B/'repo'/p).read_bytes()).hexdigest()==h,p
blobs=read(B/'awareness-comparison-source-git-blobs.json')
for p,h in blobs.items():
 data=(B/'repo'/p).read_bytes();assert hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest()==h,p
identity=read(D/'RUN-IDENTITY.json');release=read(P/'ROOT-RELEASE.json');report=read(D/'REPORT.json');assert release==identity['release'];assert release['rootRelease'] and release['independentReviewAccepted'];assert release['releasedAt']<identity['startedAt']<report['completedAt'];assert (B/'awareness-comparison-MAIN-EXIT.txt').read_text().strip()=='0'
manifest=read(P/'RUN-MANIFEST.json');progress=list(D.glob('PROGRESS-*.json'));assert len(progress)==128
for i,row in enumerate(manifest):
 p=read(D/f'PROGRESS-{i+1:03d}.json');assert p['completedBouts']==i+1 and p['completedRows']==[r['boutId'] for r in manifest[:i+1]] and p['lastRow']==row['boutId'] and p['elapsedBudgetMinutes']==5*(i+1)
lines=(B/'awareness-comparison-MAIN-OUTPUT.txt').read_text().splitlines();execution=[]
for l in lines:
 try:d=json.loads(l)
 except json.JSONDecodeError:continue
 if 'completedBouts' in d:execution.append(d)
assert len(execution)==128
for i,(r,l) in enumerate(zip(manifest,execution)):assert l['boutId']==r['boutId'] and l['completedBouts']==i+1 and l['totalBouts']==128
print('PASS protected files, saved Git blobs, release/start/completion, 128 durable progress/log identities',flush=True)
c=collections.Counter();started=time.time()
for i,row in enumerate(manifest):
 current=None;lasttick=-1
 with gzip.open(D/(row['boutId']+'.attempt-1.jsonl.gz'),'rb') as f:
  for line in f:
   if line.startswith(b'{"type":"counterReceipt"'):
    d=json.loads(line);current=d['diagnostic'];lasttick=d['tick'];c['receiptsJoined']+=1
   elif line.startswith(b'{"type":"event"'):
    e=json.loads(line)['event']
    if e['type']=='HIT':
     assert current is not None and 0<=e['tick']-lasttick<4
     expected={'warning':current['assessment']['warning'],'scan':current['scan'],'movementOverride':current['movementOverride'],'baseSupportedAway':current['base']['supportedAway']}
     assert expected==e['counterContext'];c['hitContextsJoined']+=1
 if (i+1)%32==0:print(f'PASS HIT-context joins {i+1}/128',flush=True)
result={'status':'pass','protectedSourceFiles':len(protected),'savedGitBlobIdentities':len(blobs),'mainExit':0,'durableProgressEntries':len(progress),'executionLogRows':len(execution),'releasePrecededExecution':True,'hitContextJoins':dict(c),'elapsedSeconds':time.time()-started,'scope':'Checks saved Git blob identities and recorded root checkpoint; does not independently query a remote Git server'}
(O/'SUPPLEMENTAL-VERIFICATION.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result),flush=True)
