#!/usr/bin/env python3
"""Stage only frozen source from an existing Git checkout. No network or matches."""
import argparse, hashlib, json, pathlib
p=argparse.ArgumentParser();p.add_argument('checkout',type=pathlib.Path);p.add_argument('new_study_directory',type=pathlib.Path);a=p.parse_args()
source=a.checkout.resolve();dest=a.new_study_directory.resolve()
package=source/'benchmark/human-proxy-2026-10-03/awareness-comparison-v1'
freeze=json.loads((package/'FREEZE.json').read_text())
if dest.exists():raise SystemExit('Destination exists; choose a new staging directory')
files=[]
def checked(original,relative,expected):
 data=original.read_bytes();actual=hashlib.sha256(data).hexdigest()
 if actual!=expected:raise SystemExit(f'Frozen byte mismatch: {original}')
 files.append((relative,data,actual))
for relative,sha in freeze['files'].items():checked(package/relative,'awareness-comparison-v1/'+relative,sha)
for relative,sha in freeze['dependencies'].items():
 if not relative.startswith('repo/'):raise SystemExit('Unexpected dependency prefix')
 checked(source/relative[5:],relative,sha)
prior=json.loads((package/'PRIOR-FILES.json').read_text())
fixture='sensor-awareness-v1/fixtures.mjs'
checked(source/'benchmark/human-proxy-2026-10-03'/fixture,fixture,prior[fixture])
for relative in ['FREEZE.json']:
 data=(package/relative).read_bytes();files.append(('awareness-comparison-v1/'+relative,data,hashlib.sha256(data).hexdigest()))
# Package type metadata controls .js parsing, not controller behavior.
package_json=(source/'package.json').read_bytes();files.append(('repo/package.json',package_json,hashlib.sha256(package_json).hexdigest()))
dest.mkdir(parents=True)
for relative,data,_ in files:
 target=dest/relative;target.parent.mkdir(parents=True,exist_ok=True)
 with target.open('xb') as f:f.write(data)
report={'status':'FROZEN_SOURCE_STAGED','freezeSha256':freeze['freezeSha256'],'files':[{'path':r,'sha256':h} for r,_,h in files],
 'scope':'Controller/statistics synthetic tests only; full historical-integrity gate still needs prior raw/provenance data and an authorized exact release'}
(dest/'STAGING-VERIFICATION.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'status':report['status'],'freezeSha256':freeze['freezeSha256'],'files':len(files),'study':str(dest)},indent=2))
