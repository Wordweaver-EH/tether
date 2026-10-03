import pathlib,json,hashlib,subprocess,time,sys,platform,os
root=pathlib.Path(__file__).resolve().parent
if len(sys.argv)!=2:raise SystemExit('Explicit calibration release path required; no execution from defaults')
release=json.loads(pathlib.Path(sys.argv[1]).read_text())
if release.get('status')!='CALIBRATION_ONLY_RELEASED' or release.get('allowCalibration') is not True:raise SystemExit('Calibration-only release required')
commit=release.get('remoteVerifiedCommit','')
if len(commit)!=40 or any(c not in '0123456789abcdef' for c in commit):raise SystemExit('Verified Git commit required')
sha=lambda b:hashlib.sha256(b).hexdigest()
manifestBytes=pathlib.Path(release['sourceManifest']).read_bytes()
if sha(manifestBytes)!=release.get('sourceManifestSha256'):raise SystemExit('Source manifest bytes hash mismatch')
manifest=json.loads(manifestBytes)
if release['sourceFingerprint']!=manifest['sourceFingerprint']:raise SystemExit('Source fingerprint mismatch')
harnessNames=['CALIBRATION-PLAN.json','calibration-worker.mjs','run-calibration.py','calibration-workload.mjs','calibration-static.test.mjs','summarize-calibration.py']
repo=pathlib.Path(manifest['repo']).resolve()
required={p.resolve() for p in (repo/'src').rglob('*') if p.is_file()}|{repo/'benchmark/interface.mjs',repo/'package.json'}
listed=[pathlib.Path(item['path']).resolve() for item in manifest['files']]
if len(set(listed))!=len(listed) or not required.issubset(set(listed)):raise SystemExit('Incomplete or duplicate source dependency closure')
for key,status in [('reviewReceipt','PASS'),('publicationReceipt','VERIFIED')]:
 ref=release.get(key,{})
 if not ref.get('path') or not ref.get('sha256'):raise SystemExit('Missing '+key)
 data=pathlib.Path(ref['path']).read_bytes()
 if sha(data)!=ref['sha256']:raise SystemExit('Receipt bytes hash mismatch')
 receipt=json.loads(data)
 if receipt.get('status')!=status or receipt.get('sourceFingerprint')!=release['sourceFingerprint'] or receipt.get('sourceManifestSha256')!=release['sourceManifestSha256'] or receipt.get('harnessHashes')!=release['harnessHashes']:raise SystemExit('Receipt binding mismatch')
 if key=='publicationReceipt' and receipt.get('commit')!=commit:raise SystemExit('Publication commit mismatch')
def validate():
 if sha(pathlib.Path(release['sourceManifest']).read_bytes())!=release['sourceManifestSha256']:raise SystemExit('Source manifest changed')
 for item in manifest['files']:
  if sha(pathlib.Path(item['path']).read_bytes())!=item['sha256']:raise SystemExit('Source bytes changed: '+item['key'])
 for name in harnessNames:
  if sha((root/name).read_bytes())!=release['harnessHashes'][name]:raise SystemExit('Calibration harness changed: '+name)
 if sha((pathlib.Path(manifest['repo'])/'src/agents/robust-baseline.mjs').read_bytes())!='9441ac6041daea0d86be20ac6c1ab85711c20bc6c640dbdf15d48359e0d597e0':raise SystemExit('Wrong fine-grid planner')
validate();out=root/'receipts';out.mkdir(exist_ok=True)
try:(out/'ATTEMPT-RESERVED.json').open('x').write(json.dumps({'release':release,'startedUtc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}))
except FileExistsError:raise SystemExit('Single calibration attempt already reserved; no automatic retry')
plan=json.loads((root/'CALIBRATION-PLAN.json').read_text());started=time.monotonic();runs=[];stop=False
for trial in range(plan['trials']):
 offset=[0,2,4,6,1][trial];order=plan['controllers'][offset:]+plan['controllers'][:offset]
 for name in order:
  validate();remaining=plan['globalTimeoutSeconds']-(time.monotonic()-started)
  if remaining<=0:stop=True;break
  raw=out/f'trial-{trial}-{name}.jsonl';err=out/f'trial-{trial}-{name}.stderr';t=time.monotonic()
  with raw.open('x') as f,err.open('x') as e:
   try:r=subprocess.run(['node',str(root/'calibration-worker.mjs'),manifest['repo'],name,str(trial)],stdout=f,stderr=e,timeout=min(plan['perControllerTrialTimeoutSeconds'],remaining));status='completed' if r.returncode==0 else 'failed'
   except subprocess.TimeoutExpired:status='timeout'
  runs.append({'trial':trial,'controller':name,'status':status,'elapsedSeconds':time.monotonic()-t,'raw':str(raw),'sha256':sha(raw.read_bytes())})
  if status!='completed':stop=True;break
 if stop:break
validate();(out/'EXECUTION.json').write_text(json.dumps({'status':'INCOMPLETE' if stop else 'COMPLETED','sourceFingerprint':manifest['sourceFingerprint'],'remoteVerifiedCommit':commit,'elapsedSeconds':time.monotonic()-started,'hardwareScope':{'platform':platform.platform(),'machine':platform.machine(),'cpuCount':os.cpu_count()},'runs':runs},indent=2)+'\n')
if stop:raise SystemExit('Calibration incomplete; all partial evidence preserved')
