import {readFile,readdir} from 'node:fs/promises';import {resolve,relative} from 'node:path';import {createHash} from 'node:crypto';
export const sha256=value=>createHash('sha256').update(value).digest('hex');
export const serialize=value=>JSON.stringify(value,(_key,v)=>typeof v==='number'&&!Number.isFinite(v)?{$tetherNumber:String(v)}:v);
export const parse=value=>JSON.parse(value,(_key,v)=>v&&typeof v==='object'&&Object.keys(v).length===1&&Object.hasOwn(v,'$tetherNumber')?({'NaN':NaN,'Infinity':Infinity,'-Infinity':-Infinity}[v.$tetherNumber]??v):v);
async function filesBelow(dir){let result=[];for(const entry of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,entry.name);if(entry.isDirectory())result.push(...await filesBelow(p));else if(entry.isFile())result.push(p);}return result;}
export function sourceFingerprint(files){return sha256(JSON.stringify([...files].map(f=>({key:f.key,sha256:f.sha256})).sort((a,b)=>a.key.localeCompare(b.key))));}
export async function verifyTrainingLock(path,here,planId){
 const lock=JSON.parse(await readFile(path,'utf8'));
 if(lock.status!=='TRAINING_ONLY_LOCKED'||lock.allowTraining!==true||lock.planId!==planId)throw new Error('reviewed training-only lock required');
 if(!/^[0-9a-f]{40}$/.test(lock.remoteVerifiedCommit??'')||!lock.repo||!Array.isArray(lock.files))throw new Error('incomplete source/remote lock');
 const required=['training-plan.mjs','training-runner.mjs','training-worker.mjs','runtime-controls.mjs','lock-contract.mjs','initial-vectors.json','TRAINING-PROTOCOL.md','TRAINING-SEEDS.json'].map(name=>resolve(here,name));
 required.push(...await filesBelow(resolve(lock.repo,'src')),resolve(lock.repo,'benchmark/interface.mjs'),resolve(lock.repo,'package.json'));
 const paths=new Set(lock.files.map(f=>resolve(f.path))),keys=new Set(lock.files.map(f=>f.key));
 if(paths.size!==lock.files.length||keys.size!==lock.files.length)throw new Error('duplicate lock files');
 for(const p of required)if(!paths.has(p))throw new Error(`missing source dependency: ${p}`);
 for(const item of lock.files){const p=resolve(item.path);const expected=p.startsWith(resolve(here)+'/')?'training/'+relative(here,p):p.startsWith(resolve(lock.repo)+'/')?'repo/'+relative(lock.repo,p):null;
  if(item.key!==expected||sha256(await readFile(p))!==item.sha256)throw new Error(`source key/hash mismatch: ${item.path}`);}
 const fingerprint=sourceFingerprint(lock.files);if(lock.sourceFingerprint!==fingerprint)throw new Error('source manifest fingerprint mismatch');
 async function receipt(which,status){const reference=lock[which];if(!reference?.path||!reference.sha256)throw new Error(`missing ${which}`);const bytes=await readFile(reference.path);if(sha256(bytes)!==reference.sha256)throw new Error(`${which} hash mismatch`);
  const record=JSON.parse(bytes);if(record.status!==status||record.sourceFingerprint!==fingerprint)throw new Error(`${which} invalid status/source`);return record;}
 await receipt('reviewReceipt','PASS');const timing=await receipt('timingReceipt','PASS'),publication=await receipt('publicationReceipt','VERIFIED');
 if(publication.commit!==lock.remoteVerifiedCommit)throw new Error('remote commit mismatch');
 for(const arm of ['conventional-useful-2x','conventional-useful-4x'])if(!Number.isInteger(lock.levels?.[arm])||lock.levels[arm]<0||lock.levels[arm]>4||timing.levels?.[arm]!==lock.levels[arm])throw new Error('calibrated levels missing/mismatched');
 if(!timing.hardwareScope||!timing.measurementScope||!timing.targetStatus||!Number.isFinite(timing.estimatedCPUHours)||!Number.isFinite(timing.estimatedWallHours))throw new Error('timing evidence incomplete');
 if(timing.estimatedCPUHours>24||timing.estimatedWallHours>8)throw new Error('resource estimate exceeds hard protocol ceiling; amendment/review required');
 return lock;
}
