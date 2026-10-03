/** Infrastructure only. No module import runs analysis or touches attempt data. */
import fs from 'node:fs';
import {resolve, relative, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
export const HERE=dirname(fileURLToPath(import.meta.url));
export const BASE=resolve(HERE,'..');
export const ANALYSIS=resolve(BASE,'tether-robustness-shifts/repo-evaluation/experimental/analysis');
export const ORIGINAL=resolve(BASE,'tether-robustness-shifts/evaluation-attempt-001');
export const RESUME=resolve(BASE,'tether-evaluation-recovery/resume-attempt-001');
export const LOCK_SHA='fbf3a3d825e71fea60dec040c67899bf3ff2da78b1ff334a5cbe38f5b1771033';
export const SCIENCE_MANIFEST_SHA='7d0cb0abe594be0f9ed267b02d4ae41951eaa128c5bb760cd6057f4f0b3f2632';
export const RECOVERY_RELEASE_SHA='a41cf4914193a4e2c52752cc45b74f1fc9d98169db6f0832a98bd972aac93fdc';
export const assert=(ok,message)=>{if(!ok)throw Error(message);};
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
export const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function regular(path){const s=fs.lstatSync(path);assert(s.isFile()&&!s.isSymbolicLink(),'not a regular file: '+path);return s;}
export function fileHash(path){regular(path);return hash(fs.readFileSync(path));}
export function evidence(ref,label){assert(ref?.path&&/^[a-f0-9]{64}$/.test(ref.sha256??''),'missing hashed '+label);assert(fileHash(ref.path)===ref.sha256,'changed '+label);return read(ref.path);}
export function exactSet(actual,wanted,label){assert(actual.length===new Set(actual).size,'duplicate '+label);assert(equal([...actual].sort(),[...wanted].sort()),'missing or unexpected '+label);}
export function safePath(root,path,expectedRelative){assert(path===resolve(root,expectedRelative),'artifact origin/path mismatch');const rel=relative(root,path);assert(rel&&!rel.startsWith('../')&&!rel.startsWith('/'),'path escape');let p=root;assert(fs.lstatSync(p).isDirectory()&&!fs.lstatSync(p).isSymbolicLink(),'symlink root');for(const part of rel.split('/')){p=resolve(p,part);assert(!fs.lstatSync(p).isSymbolicLink(),'symlink artifact');}regular(path);return path;}
export function inventory(root,{digests=true}={}){const files=[];function visit(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){assert(!e.isSymbolicLink(),'symlink in preserved tree');const path=resolve(dir,e.name);if(e.isDirectory())visit(path);else{assert(e.isFile(),'nonregular preserved tree entry');const s=fs.statSync(path,{bigint:true});files.push({path:relative(root,path),size:String(s.size),mtimeNs:String(s.mtimeNs),ctimeNs:String(s.ctimeNs),ino:String(s.ino),...(digests?{sha256:fileHash(path)}:{})});}}}visit(root);return files;}
export function validatePartition(expected,partition,union,counts){
 const known=expected.map(t=>t.id);exactSet([...partition.completedIds,...partition.remainingIds],known,'partition IDs');
 assert(partition.completedIds.length===counts.original&&partition.remainingIds.length===counts.resume,'partition counts');
 exactSet(union.entries.map(e=>e.taskId),known,'UNION IDs');
 exactSet(union.entries.filter(e=>e.origin==='original').map(e=>e.taskId),partition.completedIds,'original assignment');
 exactSet(union.entries.filter(e=>e.origin==='resume').map(e=>e.taskId),partition.remainingIds,'resume assignment');
 assert(union.entries.every(e=>['original','resume'].includes(e.origin)),'unknown origin');
 assert(union.acceptedOriginal===counts.original&&union.acceptedResume===counts.resume,'UNION counts');
 exactSet([...partition.partialIds,...partition.notStartedIds],partition.remainingIds,'unfinished classes');
}
export function validateTerminal({complete,terminal,exit,failed,uncertain,expectedTotal}){
 assert(!failed&&!uncertain,'failed or COMMIT-UNCERTAIN attempt');
 assert(complete.status==='COMPLETE_NEEDS_INDEPENDENT_ANALYSIS'&&complete.error===null&&complete.completed===expectedTotal&&complete.total===expectedTotal,'resume not genuinely complete');
 const {type,...body}=terminal;assert(type==='terminal'&&equal(body,complete),'terminal event/COMPLETE mismatch');
 assert(exit.status==='VERIFIED_SUCCESSFUL_PROCESS_EXIT'&&exit.exitCode===0&&exit.signal===null&&exit.observationSource==='execution-tool-terminal-response'&&Number.isInteger(exit.sessionId)&&typeof exit.observedAt==='string'&&Date.parse(exit.observedAt)>=Date.parse(complete.at),'missing verified supervisor process exit');
}
export function terminalResource(origin,entry,ipc,exit,receipt,serialize=JSON.stringify){
 if(origin==='original'){assert(entry.terminalResourceUsage==null,'unreviewed original terminal resource claim');return null;}
 assert(ipc?.message?.ok===true&&serialize(ipc.message.result)===serialize(receipt),'resumed IPC/result mismatch');
 assert(exit?.code===0&&exit.signal===null&&exit.ipcReceived===true&&exit.resourceSnapshotFresh===true&&exit.checkError===null&&exit.pid===ipc.pid,'unsuccessful resumed child exit');
 const usage=ipc.message.terminalResourceUsage;assert(usage&&['userCPUTime','systemCPUTime'].every(k=>Number.isFinite(usage[k])&&usage[k]>=0),'missing resumed terminal child CPU');
 assert(equal(usage,entry.terminalResourceUsage),'UNION/IPC terminal child CPU mismatch');return usage;
}
export function checkLineage(task,start,receipt,lock,lineage){
 if(task.arm.startsWith('mind-')){const key=JSON.stringify([task.cluster,task.condition,task.arm,task.seat]);
  if(task.bout===0)assert(start.inputMemorySha256===lock.trainingSnapshotObjectHashes[task.cluster],'bout0 input snapshot mismatch');
  else assert(task.bout===1&&lineage.has(key)&&start.inputMemorySha256===lineage.get(key),'cross-origin/missing memory lineage');
  lineage.set(key,receipt.outputMemorySha256);
  if(task.arm==='mind-learning-frozen')assert(receipt.freezeLearningInvariant?.unchanged===true&&receipt.outputMemorySha256===receipt.acceptedInitialMemorySha256,'frozen memory mismatch');
 }else assert(start.inputMemorySha256===null&&receipt.outputMemorySha256===null,'conventional received mind memory');
}
export function loadGate(releasePath){
 // Explicit external release is required before opening any attempt or outcome artifact.
 const release=read(releasePath);
 assert(release.authorized===true&&release.phase==='qualified-recovered-analysis'&&release.scientificAnalysisAuthorized===true,'root analysis release required');
 assert(release.lockSha256===LOCK_SHA&&release.frozenAnalysisManifestSha256===SCIENCE_MANIFEST_SHA,'analysis release lock mismatch');
 const manifest=evidence({path:resolve(HERE,'SOURCE-MANIFEST.json'),sha256:release.adapterManifestSha256},'adapter source manifest');
 for(const f of manifest.files)assert(fileHash(resolve(HERE,f.path))===f.sha256,'adapter source changed: '+f.path);
 const review=evidence(release.independentAdapterReview,'independent adapter review');
 assert(review.approved===true&&review.adapterManifestSha256===release.adapterManifestSha256&&review.frozenAnalysisManifestSha256===SCIENCE_MANIFEST_SHA,'adapter review gate closed');
 const science=evidence({path:resolve(ANALYSIS,'SOURCE-MANIFEST.json'),sha256:SCIENCE_MANIFEST_SHA},'frozen science manifest');
 for(const f of science.files)assert(fileHash(resolve(ANALYSIS,f.path))===f.sha256,'frozen scientific source altered: '+f.path);
 const lock=evidence({path:resolve(BASE,'tether-robustness-shifts/EVALUATION-LOCK.json'),sha256:LOCK_SHA},'evaluation source lock');
 for(const f of lock.inputs)assert(fileHash(f.path)===f.sha256,'locked source/input changed: '+f.path);
 const recovery=evidence({path:resolve(BASE,'tether-evaluation-recovery/RECOVERY-RELEASE-001.json'),sha256:RECOVERY_RELEASE_SHA},'recovery release');
 assert(recovery.output===RESUME&&recovery.lockSha256===LOCK_SHA&&recovery.authorized===true,'recovery release identity');
 assert(fileHash(resolve(BASE,'tether-evaluation-recovery/supervisor.mjs'))===recovery.supervisorSha256,'supervisor altered');
 assert(equal(read(resolve(RESUME,'RELEASE.json')),recovery),'resumed release copy mismatch');
 const consumedPath=resolve(BASE,'tether-evaluation-recovery/RECOVERY-RELEASE-001.json.consumed.json'),consumed=read(consumedPath);
 assert(consumed.releaseSha256===RECOVERY_RELEASE_SHA&&consumed.output===RESUME&&consumed.supervisorSha256===recovery.supervisorSha256,'consumed recovery release mismatch');
 const audit=evidence(recovery.audit,'original audit'),partition=evidence(recovery.partition,'partition'),originalManifest=evidence(recovery.originalManifest,'original manifest'),recoveryReview=evidence(recovery.independentReview,'recovery review');
 evidence(recovery.stabilityObservation,'original stability');evidence(recovery.gitCheckpoint,'recovery checkpoint');
 assert(recoveryReview.approved===true&&recoveryReview.lockSha256===LOCK_SHA&&recoveryReview.supervisorSha256===recovery.supervisorSha256,'recovery review identity');
 assert(partition.validationSha256===recovery.audit.sha256&&partition.originalManifestSha256===recovery.originalManifest.sha256,'partition evidence binding');
 assert(audit.rejectedCount===0&&audit.acceptedCount===805&&audit.accepted.length===805&&originalManifest.length===2131&&partition.partialIds.length===7,'original audit counts');
 assert(!fs.existsSync(resolve(ORIGINAL,'COMPLETE.json'))&&!fs.existsSync(resolve(ORIGINAL,'FINALIZATION-RECEIPT.json')),'unexpected manufactured original terminal artifact');
 const complete=evidence(release.complete,'resume COMPLETE'),union=evidence(release.union,'UNION'),exit=evidence(release.terminalExitAudit,'terminal exit audit');
 assert(release.complete.path===resolve(RESUME,'COMPLETE.json')&&release.union.path===resolve(RESUME,'UNION.json')&&release.supervisorLog.path===resolve(RESUME,'SUPERVISOR.jsonl'),'terminal evidence path mismatch');
 assert(fileHash(release.supervisorLog.path)===release.supervisorLog.sha256,'supervisor log altered');
 const events=fs.readFileSync(release.supervisorLog.path,'utf8').trim().split('\n').map(JSON.parse);
 assert(events.filter(e=>e.type==='terminal').length===1&&events.at(-1).type==='terminal'&&!events.some(e=>e.type==='stop'),'supervisor log not successful terminal');
 validateTerminal({complete,terminal:events.at(-1),exit,failed:fs.existsSync(resolve(RESUME,'FAILURE.json')),uncertain:fs.existsSync(resolve(RESUME,'COMMIT-UNCERTAIN.json')),expectedTotal:4224});
 assert(exit.completeSha256===release.complete.sha256&&exit.unionSha256===release.union.sha256&&exit.supervisorLogSha256===release.supervisorLog.sha256&&exit.recoveryReleaseSha256===RECOVERY_RELEASE_SHA&&exit.resume===RESUME,'terminal exit audit binding');
 const unionReview=evidence(release.independentUnionReview,'independent terminal union review');
 assert(unionReview.approved===true&&unionReview.completeSha256===release.complete.sha256&&unionReview.unionSha256===release.union.sha256&&unionReview.originalManifestSha256===recovery.originalManifest.sha256&&unionReview.recoveryReleaseSha256===RECOVERY_RELEASE_SHA&&unionReview.acceptedOriginal===805&&unionReview.acceptedResume===3419,'independent terminal union review binding');
 const launch=read(resolve(BASE,'tether-evaluation-recovery/LAUNCH-RECEIPT-001.json'));assert(exit.sessionId===launch.sessionId&&launch.releaseSha256===RECOVERY_RELEASE_SHA,'wrong supervisor process/session');
 const tree=inventory(ORIGINAL),baseline=read(resolve(RESUME,'ORIGINAL-TREE.json'));
 assert(equal(tree,baseline),'original inventory/hash/metadata changed');exactSet(tree.map(f=>f.path),originalManifest.map(f=>f.path),'original inventory');
 for(const m of originalManifest){const f=tree.find(f=>f.path===m.path);assert(f.sha256===m.sha256&&Number(f.size)===m.bytes&&Number(f.mtimeNs)===m.mtimeNs,'original audited manifest changed');}
 const expected=read(resolve(ANALYSIS,'frozen/EVALUATION-TASKS.json')).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 assert(expected.length===4224&&expected.every(t=>t.phase==='evaluation'&&t.seconds===300),'not frozen evaluation');
 assert(union.lockSha256===LOCK_SHA&&union.original===ORIGINAL&&union.resume===RESUME,'UNION identity');validatePartition(expected,partition,union,{original:805,resume:3419});
 exactSet(partition.completedIds,audit.accepted.map(e=>e.taskId),'accepted original audit');exactSet(partition.remainingIds,recovery.unfinishedIds,'released unfinished tasks');
 for(const origin of ['original','resume']){const root=origin==='original'?ORIGINAL:RESUME,tasks=expected.filter(t=>union.entries.find(e=>e.taskId===t.id).origin===origin);for(const [dir,ext,ids]of [['results','.json',tasks.map(t=>t.id)],['raw','.jsonl.gz',[...tasks.map(t=>t.id),...(origin==='original'?partition.partialIds:[])]],['memory','.json',tasks.filter(t=>t.arm.startsWith('mind-')).map(t=>t.id)]])exactSet(fs.readdirSync(resolve(root,dir)),ids.map(id=>id+ext),origin+' '+dir);if(origin==='resume'){exactSet(fs.readdirSync(resolve(root,'ipc')),tasks.map(t=>t.id+'.json'),'resume IPC');exactSet(fs.readdirSync(resolve(root,'tasks')),tasks.flatMap(t=>[t.id+'.start.json',t.id+'.exit.json']),'resume task evidence');}}
 const partials=partition.partialIds.map(taskId=>{const path=resolve(ORIGINAL,'raw',taskId+'.jsonl.gz'),m=tree.find(f=>f.path===relative(ORIGINAL,path));return {taskId,origin:'original-interrupted-excluded',path,sha256:m.sha256,bytes:Number(m.size),scientificSampleIncluded:false};});
 const provenance={adapterManifestSha256:release.adapterManifestSha256,analysisRelease:{path:releasePath,sha256:fileHash(releasePath)},independentAdapterReview:release.independentAdapterReview,frozenAnalysisManifestSha256:SCIENCE_MANIFEST_SHA,lockSha256:LOCK_SHA,recoveryReleaseSha256:RECOVERY_RELEASE_SHA,consumedRecoveryReleaseSha256:fileHash(consumedPath),supervisorSha256:recovery.supervisorSha256,complete:release.complete,union:release.union,supervisorLog:release.supervisorLog,terminalExitAudit:release.terminalExitAudit,independentUnionReview:release.independentUnionReview,originalAudit:recovery.audit,originalManifest:recovery.originalManifest,partition:recovery.partition,recoveryReview:recovery.independentReview,originalTreeSha256:fileHash(resolve(RESUME,'ORIGINAL-TREE.json'))};
 return {release,recovery,complete,union,expected,audit,partition,partials,provenance,originalTree:tree,resumeMetadata:inventory(RESUME,{digests:false})};
}
export function resolveTask(task,entry,audit){
 const root=entry.origin==='original'?ORIGINAL:RESUME;assert(entry.taskId===task.id&&/^[a-zA-Z0-9_-]+$/.test(task.id),'task identity');
 const artifacts={};for(const [kind,ext,key]of [['result','.json','resultFileSha256'],['raw','.jsonl.gz','rawFileSha256'],['memory','.json','memoryFileSha256']]){
  if(kind==='memory'&&!task.arm.startsWith('mind-')){assert(entry.memoryPath==null&&entry[key]==null,'unexpected conventional memory');continue;}
  const path=safePath(root,entry[kind+'Path'],(kind==='result'?'results':kind)+'/'+task.id+ext),sha256=fileHash(path);
  assert(sha256===entry[key],'UNION artifact hash mismatch');if(entry.origin==='original')assert(sha256===audit[key],'original audit artifact mismatch');
  artifacts[kind]={path,sha256,bytes:regular(path).size};
 }
 return artifacts;
}

export function recheckGate(gate){
 assert(equal(inventory(ORIGINAL),gate.originalTree),'original evidence changed during analysis');
 assert(equal(inventory(RESUME,{digests:false}),gate.resumeMetadata),'resume evidence metadata/inventory changed during analysis');
 for(const ref of [gate.release.complete,gate.release.union,gate.release.supervisorLog])assert(fileHash(ref.path)===ref.sha256,'terminal evidence changed during analysis');
 const adapter=evidence({path:resolve(HERE,'SOURCE-MANIFEST.json'),sha256:gate.release.adapterManifestSha256},'adapter manifest');
 for(const f of adapter.files)assert(fileHash(resolve(HERE,f.path))===f.sha256,'adapter changed during analysis');
 const science=evidence({path:resolve(ANALYSIS,'SOURCE-MANIFEST.json'),sha256:SCIENCE_MANIFEST_SHA},'frozen science manifest');
 for(const f of science.files)assert(fileHash(resolve(ANALYSIS,f.path))===f.sha256,'scientific module changed during analysis');
 const source=evidence({path:resolve(BASE,'tether-robustness-shifts/EVALUATION-LOCK.json'),sha256:LOCK_SHA},'evaluation source lock');
 for(const f of source.inputs)assert(fileHash(f.path)===f.sha256,'locked source/input changed during analysis');
 assert(!fs.existsSync(resolve(RESUME,'FAILURE.json'))&&!fs.existsSync(resolve(RESUME,'COMMIT-UNCERTAIN.json')),'late failure/uncertain marker');
}
