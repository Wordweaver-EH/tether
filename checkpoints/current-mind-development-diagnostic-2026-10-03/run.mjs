// Only outcome/timing entry point. Requires exact manifest release and consumes one attempt.
import {readFileSync,writeFileSync,mkdirSync,openSync,writeSync,fsyncSync,closeSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
import {json as losslessJson} from './core.mjs';
const here=dirname(fileURLToPath(import.meta.url));
assert.deepEqual(process.argv.slice(2),['--execute-released-once']);
const hash=x=>createHash('sha256').update(x).digest('hex');
const bytes=readFileSync(resolve(here,'manifest.json')),manifest=JSON.parse(bytes),release=JSON.parse(readFileSync(resolve(here,'release.json')));
assert.equal(release.approved,true);assert.equal(release.manifestSha256,hash(bytes));assert.ok(release.parentApproval&&release.reviewerApproval);
assert.match(release.remoteCheckpoint?.commit??'',/^[0-9a-f]{40}$/);
assert.ok(release.remoteCheckpoint?.path);
assert.equal(release.remoteCheckpoint?.manifestSha256,hash(bytes));
assert.equal(release.remoteCheckpoint?.verified,true);
function verify(){for(const f of manifest.files)assert.equal(hash(readFileSync(resolve(here,f.path))),f.sha256,f.path);assert.equal(hash(readFileSync(process.execPath)),manifest.nodeSha256);}
verify();
const protocol=JSON.parse(readFileSync(resolve(here,'protocol.json')));
const assigned=JSON.parse(readFileSync(resolve(here,'assigned.json')));
assert.equal(assigned.length,16);
writeFileSync(resolve(here,'ATTEMPT'),JSON.stringify({manifestSha256:hash(bytes),at:new Date().toISOString(),assigned})+'\n',{flag:'wx'});
mkdirSync(resolve(here,'attempt'));
writeFileSync(resolve(here,'attempt/manifest.json'),bytes);
writeFileSync(resolve(here,'attempt/release.json'),JSON.stringify(release,null,2)+'\n');
const fd=openSync(resolve(here,'attempt/raw.jsonl'),'wx');const rows=[];let failure=null;
const emit=r=>writeSync(fd,losslessJson(r)+'\n');
try {
 const {runArm}=await import('./core.mjs');const {FIXTURES}=await import('./fixtures.mjs');
 const sim=await import('./source/src/sim.js');const {percept}=await import('./source/src/perception.js');
 const {createMind}=await import('./source/src/mind/index.mjs');
 const memorySnapshot=JSON.parse(readFileSync(resolve(here,'common-memory.json')));
 for(const pair of assigned){const fixture=FIXTURES.find(f=>f.id===pair.fixtureId);emit({type:'assigned',pair});const result=runArm({arm:'current',createMind,sim,percept,fixture,pair,memorySnapshot,protocol,emit:r=>emit({...r,case:pair.index})});rows.push(result);emit({type:'case-complete',case:pair.index,result});fsyncSync(fd);}
 verify();
} catch(e){failure={name:e.name,message:e.message,stack:e.stack};emit({type:'attempt-failure',failure});}
finally {fsyncSync(fd);closeSync(fd);writeFileSync(resolve(here,'attempt/results.json'),losslessJson({status:failure?'failed':'complete',assigned,rows,failure})+'\n');}
console.log(JSON.stringify({status:failure?'failed':'complete',completed:rows.length,assigned:16,failure}));if(failure)process.exitCode=1;
