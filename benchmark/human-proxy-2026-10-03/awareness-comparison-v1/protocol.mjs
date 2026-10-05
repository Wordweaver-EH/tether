import {createHash} from 'node:crypto';
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {verifyFrozenSource} from '../repo/human-proxy/protocol.mjs';
export const ROOT = fileURLToPath(new URL('./', import.meta.url));
export const STUDY = path.dirname(ROOT.slice(0,-1));
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const BUDGET = Object.freeze({clusters:32,seats:2,arms:2,durationSec:300,simulationHz:120,decisionHz:30,bootstrapResamples:20000});
export const PROTOTYPE_SHA = 'bb78bce500b06697b3ab6c9320c55ce52691b43f4714dce224fad9cc3f409250';
export const DECLARATION_SHA = 'c03221bc1cd607bb63ebcf628f66d4554ea73aa32a0d037424b6024c7ae13cfd';
const uint = (namespace,cluster,role) => createHash('sha256').update(JSON.stringify([namespace,cluster,role])).digest().readUInt32BE(0);
export function seedTable() {
  return Array.from({length:32},(_,cluster)=>({cluster,
    episodeId:uint('tether-rear-awareness-comparison-v1',cluster,'episode'),
    counterSeed:uint('tether-rear-awareness-comparison-v1',cluster,'counter'),
    ordinarySeed:uint('tether-rear-awareness-comparison-v1',cluster,'ordinary')}));
}
export function smokeSeed() {
  return {cluster:-1,episodeId:uint('tether-rear-awareness-structural-smoke-v1',0,'episode'),
    counterSeed:uint('tether-rear-awareness-structural-smoke-v1',0,'counter'),
    ordinarySeed:uint('tether-rear-awareness-structural-smoke-v1',0,'ordinary')};
}
export function runManifest() {
  return seedTable().flatMap(row=>['P1','P2'].flatMap(counterSeat=>
    (row.cluster%2?['awareness','unchanged']:['unchanged','awareness']).map(arm=>
      ({...row,counterSeat,arm,boutId:`cluster-${String(row.cluster).padStart(2,'0')}-${counterSeat}-${arm}`}))));
}
export function verifyIntegrity({originalRaw = true} = {}) {
  const base = verifyFrozenSource();
  const oldFreeze = JSON.parse(readFileSync(path.join(STUDY,'repo/human-proxy/FREEZE.json')));
  for (const [file,sha] of Object.entries(oldFreeze.files))
    if(hash(readFileSync(path.join(STUDY,'repo',file)))!==sha) throw Error(`original frozen file changed: ${file}`);
  if (hash(readFileSync(path.join(ROOT,'frozen-awareness.mjs')))!==PROTOTYPE_SHA) throw Error('prototype changed');
  if (hash(readFileSync(path.join(ROOT,'PREDECLARATION.md')))!==DECLARATION_SHA) throw Error('predeclaration changed');
  for (const [file,sha] of Object.entries(JSON.parse(readFileSync(path.join(ROOT,'PRIOR-FILES.json')))))
    if(hash(readFileSync(path.join(STUDY,file)))!==sha) throw Error(`prior file changed: ${file}`);
  if(originalRaw) for(const row of JSON.parse(readFileSync(path.join(STUDY,'primary-v1/RAW-MANIFEST.json'))))
    if(hash(readFileSync(path.join(STUDY,'primary-v1',row.file)))!==row.sha256) throw Error(`original raw changed: ${row.file}`);
  const old = JSON.parse(readFileSync(path.join(STUDY,'repo/human-proxy/seeds.json')));
  const oldValues = new Set(old.flatMap(r=>[r.episodeId,r.counterSeed,r.ordinarySeed]));
  const fresh = seedTable().flatMap(r=>[r.episodeId,r.counterSeed,r.ordinarySeed]);
  if(fresh.some(n=>oldValues.has(n))||new Set(fresh).size!==fresh.length) throw Error('seed overlap');
  if(Object.entries(smokeSeed()).filter(([k])=>k!=='cluster').some(([,n])=>fresh.includes(n)||oldValues.has(n))) throw Error('smoke seed overlap');
  return {ordinary:base.ordinary,originalRawChecked:originalRaw,originalFrozenFiles:Object.keys(oldFreeze.files).length};
}
export function currentFreeze() {
  verifyIntegrity({originalRaw:false});
  const files = {};
  for(const name of readdirSync(ROOT).sort()) if(/\.(mjs|md|json|txt)$/.test(name)&&
    !['FREEZE.json','ROOT-RELEASE.json'].includes(name)) files[name]=hash(readFileSync(path.join(ROOT,name)));
  const dependencies = {};
  for(const dir of ['repo/src','repo/benchmark','repo/human-proxy']) {
    const walk = relative => { for(const item of readdirSync(path.join(STUDY,relative),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
      const file=`${relative}/${item.name}`; if(item.isDirectory())walk(file); else dependencies[file]=hash(readFileSync(path.join(STUDY,file)));
    }}; walk(dir);
  }
  return {schema:1,status:'blocked-pending-independent-review-git-checkpoint-and-root-release',budget:BUDGET,files,dependencies,
    freezeSha256:hash(JSON.stringify({files,dependencies,budget:BUDGET}))};
}
export function freeze() {
  writeFileSync(path.join(ROOT,'seeds.json'),JSON.stringify(seedTable(),null,2)+'\n');
  writeFileSync(path.join(ROOT,'RUN-MANIFEST.json'),JSON.stringify(runManifest(),null,2)+'\n');
  const result=currentFreeze();writeFileSync(path.join(ROOT,'FREEZE.json'),JSON.stringify(result,null,2)+'\n');return result;
}
export function checkRelease(release) {
  const expected=JSON.parse(readFileSync(path.join(ROOT,'FREEZE.json'))),actual=currentFreeze();
  if(JSON.stringify(expected)!==JSON.stringify(actual))throw Error('source freeze mismatch');
  if(!release||release.rootRelease!==true||release.independentReviewAccepted!==true||release.freezeSha256!==actual.freezeSha256||
    typeof release.reviewer!=='string'||!release.reviewer.trim()||! /^[a-f0-9]{40}$/.test(release.gitCheckpoint??''))
    throw Error('exact independent review, Git checkpoint and root release required');
  if(JSON.stringify(JSON.parse(readFileSync(path.join(ROOT,'RUN-MANIFEST.json'))))!==JSON.stringify(runManifest()))throw Error('manifest mismatch');
  return actual;
}
