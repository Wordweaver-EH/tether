import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export const ROOT=fileURLToPath(new URL('../',import.meta.url));
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const APPROVED_PROTOCOL_SHA='704562f5d954f2ab602594239e1a01d273d715267a3c4e03ce0b4fe2cca7b370';
export const PARAMETER_SHA='eaa8c3a9b3dc539f13e8c9aae59b4160009b0ed351f1bf1a847dbc0eba29806a';
export const BUDGET=Object.freeze({clusters:32,seats:2,durationSec:300,simulationHz:120,decisionHz:30,bootstrapResamples:20000});
const uint=(cluster,role)=>createHash('sha256').update(JSON.stringify(['tether-human-proxy-v1',cluster,role])).digest().readUInt32BE(0);
export function seedTable(){return Array.from({length:32},(_,cluster)=>({cluster,episodeId:uint(cluster,'episode'),counterSeed:uint(cluster,'counter'),ordinarySeed:uint(cluster,'ordinary')}));}
export function verifyFrozenSource(){
 const manifest=JSON.parse(readFileSync(path.join(ROOT,'human-proxy/FROZEN-SOURCE-MANIFEST.json')));
 for(const [file,expected] of Object.entries(manifest))if(hash(readFileSync(path.join(ROOT,file)))!==expected)throw Error(`frozen source changed: ${file}`);
 const protocol=readFileSync(path.join(ROOT,'human-proxy/PROTOCOL-PROPOSAL.md'));
 if(hash(protocol)!==APPROVED_PROTOCOL_SHA)throw Error('approved protocol bytes changed');
 const ordinary=JSON.parse(readFileSync(path.join(ROOT,'human-proxy/ordinary-freeze.json')));
 if(hash(JSON.stringify(ordinary.vector))!==PARAMETER_SHA||ordinary.parameterSha256!==PARAMETER_SHA)throw Error('ordinary vector changed');
 return {manifestSha256:hash(JSON.stringify(manifest)),protocolSha256:hash(protocol),ordinary};
}
export function currentFreeze(){
 const source=verifyFrozenSource(),files={};
 const walk=(relative)=>{for(const item of readdirSync(path.join(ROOT,relative),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=`${relative}/${item.name}`;if(item.isDirectory())walk(file);else if(item.name!=='FREEZE.json')files[file]=hash(readFileSync(path.join(ROOT,file)));}};walk('human-proxy');
 return {schema:1,status:'blocked-pending-independent-review-git-checkpoint-and-root-release',budget:BUDGET,sourceManifestSha256:source.manifestSha256,protocolSha256:source.protocolSha256,files,freezeSha256:hash(JSON.stringify({files,budget:BUDGET,protocolSha256:source.protocolSha256,sourceManifestSha256:source.manifestSha256}))};
}
export function writeFreeze(){
 writeFileSync(path.join(ROOT,'human-proxy/seeds.json'),JSON.stringify(seedTable(),null,2)+'\n');
 const result=currentFreeze();writeFileSync(path.join(ROOT,'human-proxy/FREEZE.json'),JSON.stringify(result,null,2)+'\n');return result;
}
export function checkRelease(release){
 const expected=JSON.parse(readFileSync(path.join(ROOT,'human-proxy/FREEZE.json'))),actual=currentFreeze();
 if(JSON.stringify(expected)!==JSON.stringify(actual))throw Error('freeze source mismatch');
 if(JSON.stringify(JSON.parse(readFileSync(path.join(ROOT,'human-proxy/seeds.json'))))!==JSON.stringify(seedTable()))throw Error('seed table mismatch');
 if(!release||release.rootRelease!==true||release.independentReviewAccepted!==true||release.freezeSha256!==actual.freezeSha256||!/^\w[\w /.-]+$/.test(release.reviewer??'')||! /^[a-f0-9]{40}$/.test(release.gitCheckpoint??''))throw Error('matches blocked: exact reviewed freeze, Git checkpoint, and root release required');
 return actual;
}
