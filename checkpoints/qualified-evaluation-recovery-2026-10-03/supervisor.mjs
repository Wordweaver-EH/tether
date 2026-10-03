/** Separate, single-use recovery supervisor. Importing this module never executes a study. */
import fs from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {fork,execFileSync} from 'node:child_process';
export const LOCK_SHA256='fbf3a3d825e71fea60dec040c67899bf3ff2da78b1ff334a5cbe38f5b1771033';
export const DEADLINE='2026-10-03T14:52:26.760Z';
export const ORIGINAL_START='2026-10-03T06:52:26.760Z';
export const CAPACITY_DEADLINE='2026-10-03T10:52:26.760Z';
export const CAPACITY=9;
const HOME=dirname(fileURLToPath(import.meta.url));
const BASE=resolve(HOME,'..');
const ORIGINAL=resolve(BASE,'tether-robustness-shifts/evaluation-attempt-001');
const LOCK=resolve(BASE,'tether-robustness-shifts/EVALUATION-LOCK.json');
const REPO=resolve(BASE,'tether-robustness-shifts/repo-evaluation');
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=path=>fs.readFileSync(path);
const json=path=>JSON.parse(read(path));
function assert(value,message){if(!value)throw new Error(message);}
export function durable(path,value,{exclusive=true}={}) {
 const fd=fs.openSync(path,exclusive?'wx':'w',0o444);
 try{fs.writeFileSync(fd,JSON.stringify(value,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 const d=fs.openSync(dirname(path),'r');try{fs.fsyncSync(d);}finally{fs.closeSync(d);}
}
export function tree(root,{digests=false}={}) {
 const files=[];
 function visit(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  const path=resolve(dir,e.name);assert(!e.isSymbolicLink(),'symlink in preserved tree');
  if(e.isDirectory())visit(path);else{assert(e.isFile(),'nonregular preserved file');const s=fs.statSync(path,{bigint:true});files.push({path:relative(root,path),size:String(s.size),mtimeNs:String(s.mtimeNs),ctimeNs:String(s.ctimeNs),ino:String(s.ino),...(digests?{sha256:hash(read(path))}:{})});}
 }}visit(root);return files;
}
export function sessionKey(t){return JSON.stringify([t.phase,t.cluster,t.condition,t.arm,t.seat]);}
export function makeSchedule(tasks,acceptedIds,unfinishedIds){
 const accepted=new Set(acceptedIds),unfinished=new Set(unfinishedIds),known=new Set(tasks.map(t=>t.id));
 assert(accepted.size===acceptedIds.length&&unfinished.size===unfinishedIds.length,'duplicate audit IDs');
 assert(accepted.size+unfinished.size===tasks.length,'incomplete audit partition');
 for(const id of known)assert(accepted.has(id)!==unfinished.has(id),'overlapping or missing audit ID');
 for(const id of [...accepted,...unfinished])assert(known.has(id),'unknown audit ID');
 const groups=new Map();for(const t of tasks){assert(/^[a-zA-Z0-9_-]+$/.test(t.id),'invalid task ID');const k=sessionKey(t);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(t);}
 const schedule=[];for(const group of groups.values()){
  group.sort((a,b)=>a.bout-b.bout);assert(group.every((t,i)=>t.bout===i),'nonconsecutive bout history');
  for(let i=1;i<group.length;i++)assert(!(accepted.has(group[i].id)&&unfinished.has(group[i-1].id)),'accepted descendant of unfinished predecessor');
  if(group.some(t=>unfinished.has(t.id)))schedule.push(group);
 }return schedule;
}
function evidence(e,name){assert(e?.path&&e.sha256,`missing ${name}`);assert(hash(read(e.path))===e.sha256,`changed ${name}`);return json(e.path);}
export function parseProc(text){const f=text.slice(text.lastIndexOf(')')+2).trim().split(/\s+/);const values={state:f[0],user:Number(f[11]),system:Number(f[12]),childrenUser:Number(f[13]),childrenSystem:Number(f[14])};assert(Object.values(values).slice(1).every(Number.isFinite),'invalid proc accounting');return values;}
/** Stable reaped-child counter brackets child snapshots, so a child is never charged twice. */
export function cpuSnapshot(pids,ticks,reader=path=>fs.readFileSync(path,'utf8')) {
 for(let retry=0;retry<100;retry++){
  const before=parseProc(reader(`/proc/${process.pid}/stat`));let liveTicks=0;const live=[];
  for(const pid of pids){try{const p=parseProc(reader(`/proc/${pid}/stat`));liveTicks+=p.user+p.system;live.push({pid,...p});}catch(e){if(e.code!=='ENOENT'&&e.code!=='ESRCH')throw e;}}
  const after=parseProc(reader(`/proc/${process.pid}/stat`));
  if(before.childrenUser===after.childrenUser&&before.childrenSystem===after.childrenSystem){
   const own=process.resourceUsage();return {parentCpuSeconds:(own.userCPUTime+own.systemCPUTime)/1e6,reapedChildrenCpuSeconds:(after.childrenUser+after.childrenSystem)/ticks,liveChildrenCpuSeconds:liveTicks/ticks,live,parentResourceUsage:own};
  }
 }throw new Error('unstable process accounting');
}
export function totals(snapshot,historicalCpuUpperBoundSeconds,rawBytes,tickMarginSeconds,now=Date.now()){const measuredCpuSeconds=historicalCpuUpperBoundSeconds+snapshot.parentCpuSeconds+snapshot.reapedChildrenCpuSeconds+snapshot.liveChildrenCpuSeconds+tickMarginSeconds; const capacityReservationSeconds=CAPACITY*Math.max(0,now-Date.parse(ORIGINAL_START))/1000; return {cpuSeconds:Math.max(measuredCpuSeconds,capacityReservationSeconds),measuredCpuSeconds,capacityReservationSeconds,rawBytes};}
export function enforce(t,limits,now=Date.now()){
 assert(now<Date.parse(DEADLINE),'original phase wall deadline reached');
 assert(now<Date.parse(CAPACITY_DEADLINE),'conditional whole-runtime capacity deadline reached');
 assert(t.cpuSeconds<=limits.maxPhaseCpuSeconds,'cumulative CPU cap reached');
 assert(t.rawBytes<=limits.maxPhaseRawBytes,'cumulative raw-byte cap reached');
}
export function createHashSweep(root,files,chunkBytes=16*1024*1024){
 let index=0,fd=null,digest=null,position=0,cycles=0;const buffer=Buffer.alloc(chunkBytes);
 return {step(){let budget=chunkBytes,finished=0;
 while(budget>0&&finished<128){if(fd===null){fd=fs.openSync(resolve(root,files[index].path),'r');digest=createHash('sha256');position=0;}
 const wanted=Math.min(buffer.length,budget),n=fs.readSync(fd,buffer,0,wanted,position);if(n){digest.update(buffer.subarray(0,n));position+=n;budget-=n;}
 if(n<wanted){fs.closeSync(fd);fd=null;assert(digest.digest('hex')===files[index].sha256,'original periodic content mismatch: '+files[index].path);index=(index+1)%files.length;finished++;if(index===0){cycles++;break;}}
 }
 return {fileIndex:index,fileCount:files.length,position,cycles};},close(){if(fd!==null){fs.closeSync(fd);fd=null;}}};
}
function sizeRaw(root){return fs.readdirSync(root).reduce((sum,name)=>sum+fs.statSync(resolve(root,name)).size,0);}
export async function preflight(releasePath,out) {
 const r=json(releasePath);assert(r.authorized===true&&r.phase==='evaluation-recovery','missing explicit parent recovery release');
 assert(r.workers===8&&r.deadline===DEADLINE&&r.lockSha256===LOCK_SHA256,'changed workers/deadline/lock');
 assert(resolve(r.output)===out&&dirname(out)===HOME&&!fs.existsSync(out),'fresh separate recovery output required');
 assert(Number.isFinite(r.historicalCpuUpperBoundSeconds)&&r.historicalCpuUpperBoundSeconds>0,'explicit positive historical CPU upper bound required');
 assert(r.sharedAggregateNineCpuAssumptionAccepted===true&&r.originalMetadataPollMs===250&&r.originalHashChunkBytes===16777216&&r.fullOriginalHashesAtStartAndEnd===true,'watchdog and shared capacity qualifications required');
 assert(r.capacityLogicalCpus===CAPACITY&&r.capacityStart===ORIGINAL_START&&r.capacityDeadline===CAPACITY_DEADLINE&&r.historicalCapacityUnchangedAssumptionAccepted===true&&r.orphanUncertaintyAccepted===true,'explicit qualified capacity/orphan uncertainty disposition required');
 assert(typeof r.originalStableEvidence==='string'&&r.originalStableEvidence.length>10&&Date.now()>=Date.parse('2026-10-03T07:57:00.024Z'),'completed original stability observation required');
 assert(hash(read(LOCK))===LOCK_SHA256,'original lock changed');
 assert(hash(read(fileURLToPath(import.meta.url)))===r.supervisorSha256,'supervisor source changed');
 const audit=evidence(r.audit,'audit'),partition=evidence(r.partition,'partition'),manifest=evidence(r.originalManifest,'original manifest'),stability=evidence(r.stabilityObservation,'stability observation'),review=evidence(r.independentReview,'independent review'),git=evidence(r.gitCheckpoint,'Git checkpoint');
 for(const d of [review,git])assert(d.lockSha256===LOCK_SHA256&&d.supervisorSha256===r.supervisorSha256&&d.auditSha256===r.audit.sha256&&d.partitionSha256===r.partition.sha256,'review/Git evidence scope mismatch');
 assert(review.approved===true&&git.status==='VERIFIED','review/Git gate closed');
 assert(partition.status==='PARTITION_FULLY_VALIDATED_NO_EXECUTION_AUTHORIZATION'&&partition.validationSha256===r.audit.sha256&&partition.originalManifestSha256===r.originalManifest.sha256,'partition audit binding mismatch');
 assert(stability.status==='UNCHANGED_PAST_30_MINUTE_THRESHOLD_NOT_PROOF_OF_EXTINCTION'&&stability.fullManifestSha256===r.originalManifest.sha256&&stability.inventoryMatches===true,'stability evidence mismatch');
 assert(audit.rejectedCount===0&&audit.acceptedCount===805&&audit.accepted.length===805,'all 805 historical receipts must validate');
 const lock=json(LOCK);
 for(const input of lock.inputs)assert(hash(read(input.path))===input.sha256,'locked source/input changed before importing verifier: '+input.path);
 const frozen=await import(pathToFileURL(resolve(REPO,'experimental/lock.mjs')));
 const plan=await import(pathToFileURL(resolve(REPO,'experimental/plan-validation.mjs')));
 const raw=await import(pathToFileURL(resolve(REPO,'experimental/raw-stream.mjs')));
 await frozen.verifyLock(lock);const design=await plan.validatePlan(lock),tasks=await frozen.json(resolve(lock.prereg,'EVALUATION-TASKS.json'));await plan.validateTasks(lock,design,tasks,'evaluation');
 const acceptedIds=audit.accepted.map(x=>x.taskId);
 assert(JSON.stringify([...partition.completedIds].sort())===JSON.stringify([...acceptedIds].sort()),'partition/validated receipts disagree');
 assert(JSON.stringify([...r.unfinishedIds].sort())===JSON.stringify([...partition.remainingIds].sort()),'release/audit unfinished IDs disagree');
 const schedule=makeSchedule(tasks,acceptedIds,partition.remainingIds);
 const originalTree=tree(ORIGINAL,{digests:true});assert(originalTree.length===manifest.length,'original audited file inventory changed');
 for(const a of manifest){const s=originalTree.find(f=>f.path===a.path);assert(s&&Number(s.size)===a.bytes&&Number(s.mtimeNs)===a.mtimeNs&&s.sha256===a.sha256,'original differs from audited manifest: '+a.path);}
 for(const a of audit.accepted){for(const [dir,ext,key] of [['results','.json','resultFileSha256'],['raw','.jsonl.gz','rawFileSha256'],['memory','.json','memoryFileSha256']])if(a[key])assert(hash(read(resolve(ORIGINAL,dir,a.taskId+ext)))===a[key],`accepted ${dir} changed`);}
 const originalRawBytes=sizeRaw(resolve(ORIGINAL,'raw'));assert(originalRawBytes===manifest.filter(f=>f.path.startsWith('raw/')).reduce((sum,f)=>sum+f.bytes,0),'original raw total mismatch');
 assert(r.historicalCpuUpperBoundSeconds>=34859.376&&r.historicalCpuUpperBoundSeconds>=audit.receiptCpuLowerBound,'historical bound below recorded lower bound');
 const limits=json(resolve(lock.prereg,'RUNTIME-LIMITS.json')).evaluation;
 assert(limits.maxPhaseCpuSeconds===129600&&limits.maxPhaseRawBytes===17179869184&&limits.workersMaximum===8,'original caps changed');
 enforce({cpuSeconds:r.historicalCpuUpperBoundSeconds,rawBytes:originalRawBytes},limits);
 return {r,audit,partition,lock,design,tasks,schedule,originalTree,originalRawBytes,limits,frozen,raw};
}
export async function run(releasePath,out) {
 const p=await preflight(releasePath,out),{r,audit,lock,design,tasks,schedule,originalTree,originalRawBytes,limits,frozen,raw}=p;
 durable(releasePath+'.consumed.json',{at:new Date().toISOString(),releaseSha256:hash(read(releasePath)),output:out,supervisorSha256:r.supervisorSha256});
 fs.mkdirSync(out);for(const d of ['raw','results','memory','ipc','tasks'])fs.mkdirSync(resolve(out,d));
 durable(resolve(out,'RELEASE.json'),r);durable(resolve(out,'ORIGINAL-TREE.json'),originalTree);
 const baselineStat=JSON.stringify(originalTree.map(({sha256,...s})=>s));
 const logFd=fs.openSync(resolve(out,'SUPERVISOR.jsonl'),'wx',0o444);
 const event=(type,detail={})=>{fs.writeSync(logFd,JSON.stringify({at:new Date().toISOString(),type,...detail})+'\n');fs.fsyncSync(logFd);};
 const ticks=Number(execFileSync('getconf',['CLK_TCK'],{encoding:'utf8'}).trim());assert(ticks>0,'invalid CPU tick frequency');
 const sweep=createHashSweep(ORIGINAL,originalTree);
 const active=new Map(),newResults=new Map(),accepted=new Map(audit.accepted.map(a=>[a.taskId,a]));let spawned=0,cursor=0,failure=null,lastUsage=null;
 const stop=error=>{if(!failure){failure=error;event('stop',{reason:error.stack});}for(const c of active.values())c.kill('SIGKILL');};
 const originalCheck=()=>assert(JSON.stringify(tree(ORIGINAL))===baselineStat,'original attempt received new writes; possible old worker');
 const check=()=>{
  originalCheck();const snapshot=cpuSnapshot([...active.keys()],ticks);
  // One tick per own/reaped/live counter, deliberately reserved rather than rounded away.
  const measured=totals(snapshot,r.historicalCpuUpperBoundSeconds,originalRawBytes+sizeRaw(resolve(out,'raw')),2*(spawned+active.size+1)/ticks);
  for(const entry of snapshot.live){try{const status=fs.readFileSync(`/proc/${entry.pid}/status`,'utf8'),rss=status.match(/^VmRSS:\s+(\d+)/m);if(rss)assert(Number(rss[1])*1024<=limits.maxTaskRssBytes,'child RSS cap reached');}catch(e){if(e.code!=='ENOENT'&&e.code!=='ESRCH')throw e;}}
  lastUsage={...measured,...snapshot,historicalCpuUpperBoundSeconds:r.historicalCpuUpperBoundSeconds,originalRawBytes,spawned,completedResume:newResults.size};enforce(measured,limits);return lastUsage;
 };
 const heartbeat=setInterval(()=>{try{const sweepProgress=sweep.step();event('heartbeat',{...check(),sweepProgress});}catch(e){stop(e);}},250);
 const deadlineTimer=setTimeout(()=>stop(new Error('conditional whole-runtime capacity deadline reached')),Math.max(0,Date.parse(CAPACITY_DEADLINE)-Date.now()));
 const onSignal=()=>stop(new Error('external stop signal'));process.on('SIGTERM',onSignal);process.on('SIGINT',onSignal);
 const launch=payload=>new Promise((res,rej)=>{
  if(failure)return rej(failure);check();const start=new Date().toISOString();
  const child=fork(resolve(REPO,'experimental/worker.mjs'),[],{stdio:['ignore','inherit','inherit','ipc']});active.set(child.pid,child);spawned++;
  event('task-start',{taskId:payload.task.id,pid:child.pid,start,inputMemorySha256:payload.memorySnapshot?raw.sha256(payload.memorySnapshot):null});
  durable(resolve(out,'tasks',payload.task.id+'.start.json'),{task:payload.task,pid:child.pid,start,inputMemorySha256:payload.memorySnapshot?raw.sha256(payload.memorySnapshot):null});
  let response=null,error=null;const timer=setTimeout(()=>{error=new Error('task wall cap reached');stop(error);},limits.maxTaskWallSeconds*1000);
  child.on('message',message=>{try{assert(response===null,'duplicate worker IPC');response=message;durable(resolve(out,'ipc',payload.task.id+'.json'),{at:new Date().toISOString(),pid:child.pid,message});}catch(e){error=e;stop(e);}});
  child.on('error',e=>{error=e;stop(e);if(!child.pid){clearTimeout(timer);active.delete(child.pid);rej(e);}});
  child.on('exit',(code,signal)=>{clearTimeout(timer);active.delete(child.pid);try{
   let exitUsage=null,exitCheckError=null;try{exitUsage=check();}catch(e){exitCheckError=e;}
   durable(resolve(out,'tasks',payload.task.id+'.exit.json'),{at:new Date().toISOString(),pid:child.pid,code,signal,ipcReceived:response!==null,resourceSnapshot:exitUsage??lastUsage,resourceSnapshotFresh:exitUsage!==null,checkError:exitCheckError?.stack??null});
   if(exitCheckError)throw exitCheckError;
   assert(!error&&code===0&&response?.ok,'worker incomplete: '+(error?.message||response?.error||signal||code));res(response);
  }catch(e){stop(e);rej(e);}});
  child.send(payload,e=>{if(e){error=e;stop(e);}});
 });
 event('start',{pid:process.pid,total:tasks.length,acceptedOriginal:accepted.size,unfinished:r.unfinishedIds.length,deadline:DEADLINE,capacityDeadline:CAPACITY_DEADLINE});
 const work=async()=>{while(!failure&&cursor<schedule.length){const group=schedule[cursor++];let memory=null;
  for(const task of group){if(failure)return;try{
   const arm=design.arms.find(a=>a.id===task.arm);
   if(accepted.has(task.id)){const a=accepted.get(task.id);if(arm.kind==='mind'){assert(a.memoryFileSha256,'accepted mind predecessor lacks validated memory');const path=resolve(ORIGINAL,'memory',task.id+'.json');assert(hash(read(path))===a.memoryFileSha256,'accepted predecessor memory changed');memory=raw.parse(read(path));}continue;}
   assert(r.unfinishedIds.includes(task.id),'task not approved unfinished');
   if(task.bout===0&&arm.kind==='mind'){const bytes=read(resolve(lock.freeze,task.initialMemory));assert(raw.sha256(bytes)===task.snapshotSha256,'initial snapshot changed');memory=raw.parse(bytes);}
   if(task.bout>0&&arm.kind==='mind')assert(memory!==null,'missing verified predecessor memory');
   const bytes=read(resolve(lock.prereg,'configs',task.condition+'.json'));assert(raw.sha256(bytes)===task.configSha256,'task config changed');const config=JSON.parse(bytes);
   let opponentSpec=null;if(config.pendingOpponentFreeze){opponentSpec=json(lock.opponentFreeze).styles?.find(s=>s.id===task.opponent);assert(opponentSpec,'missing frozen opponent');}
   const response=await launch({task,arm,config,memorySnapshot:memory,opponentSpec,limits,provenance:{lockSha256:LOCK_SHA256,qualifiedBaselineCommit:design.qualifiedBaselineCommit,sourceFingerprint:design.sourceFingerprint,configSha256:task.configSha256,snapshotSha256:task.snapshotSha256,taskSha256:raw.sha256(task)},rawPath:resolve(out,'raw',task.id+'.jsonl.gz'),resultPath:resolve(out,'results',task.id+'.json'),memoryPath:resolve(out,'memory',task.id+'.json')});
   const resultPath=resolve(out,'results',task.id+'.json'),rawPath=resolve(out,'raw',task.id+'.jsonl.gz');
   assert(hash(read(rawPath))===response.result.raw.fileSha256,'new raw physical hash mismatch');
   assert(raw.serialize(raw.parse(read(resultPath)))===raw.serialize(response.result),'result/IPC mismatch');
   if(arm.kind==='mind'){assert(response.memoryPath===resolve(out,'memory',task.id+'.json'),'missing new predecessor memory');memory=raw.parse(read(response.memoryPath));assert(raw.sha256(memory)===response.result.outputMemorySha256,'new predecessor memory/result mismatch');}
   newResults.set(task.id,{taskId:task.id,origin:'resume',resultPath,rawPath,resultFileSha256:hash(read(resultPath)),rawFileSha256:hash(read(rawPath)),memoryPath:response.memoryPath,memoryFileSha256:response.memoryPath?hash(read(response.memoryPath)):null,terminalResourceUsage:response.terminalResourceUsage});
   event('task-accepted',{taskId:task.id,...check()});
  }catch(e){stop(e);return;}}
 }};
 try{check();await Promise.all(Array.from({length:8},work));
  if(!failure){await frozen.verifyLock(lock);originalCheck();assert(JSON.stringify(tree(ORIGINAL,{digests:true}))===JSON.stringify(originalTree),'original content changed');check();}
 }catch(e){stop(e);}
 const union=tasks.filter(t=>accepted.has(t.id)||newResults.has(t.id)).map(t=>accepted.has(t.id)?{...accepted.get(t.id),origin:'original',resultPath:resolve(ORIGINAL,'results',t.id+'.json'),rawPath:resolve(ORIGINAL,'raw',t.id+'.jsonl.gz'),memoryPath:accepted.get(t.id).memoryFileSha256?resolve(ORIGINAL,'memory',t.id+'.json'):null}:newResults.get(t.id));
 durable(resolve(out,'UNION.json'),{lockSha256:LOCK_SHA256,original:ORIGINAL,resume:out,acceptedOriginal:accepted.size,acceptedResume:newResults.size,entries:union});
 try{check();if(!failure){assert(union.length===tasks.length&&newResults.size===r.unfinishedIds.length,'incomplete union cannot complete');}}catch(e){failure??=e;}
 const terminal={at:new Date().toISOString(),status:failure?'STOPPED_PARTIALS_PRESERVED':'COMPLETE_NEEDS_INDEPENDENT_ANALYSIS',error:failure?.stack??null,resources:lastUsage,completed:union.length,total:tasks.length,accounting:'CPU enforcement is max(conditional 9 CPU whole-runtime elapsed reservation from original launch, historical reservation plus measured resumed parent and child CPU with tick margin). These two bounds are not added. Kernel reaped and live child CPU counted once. Hidden original worker extinction and global 8-worker/exactly-once-partial execution cannot be certified. Raw includes original partials and all resume raw. Terminal excludes final receipt/event/fsync and process exit overhead.'};
 let commitLinked=false;
 try{
  if(!failure){durable(resolve(out,'.COMPLETE.pending.json'),terminal);event('precommit',check());check();assert(!failure,'supervisor failure before commit');fs.linkSync(resolve(out,'.COMPLETE.pending.json'),resolve(out,'COMPLETE.json'));commitLinked=true;fs.unlinkSync(resolve(out,'.COMPLETE.pending.json'));const d=fs.openSync(out,'r');try{fs.fsyncSync(d);}finally{fs.closeSync(d);}}
 }catch(e){failure??=e;}
 clearInterval(heartbeat);clearTimeout(deadlineTimer);process.off('SIGTERM',onSignal);process.off('SIGINT',onSignal);sweep.close();
 if(failure){terminal.status=commitLinked?'COMMIT_DURABILITY_UNCERTAIN_REQUIRES_AUDIT':'STOPPED_PARTIALS_PRESERVED';terminal.error=failure.stack;durable(resolve(out,commitLinked?'COMMIT-UNCERTAIN.json':'FAILURE.json'),terminal);}
 event('terminal',terminal);fs.closeSync(logFd);
 if(failure)throw failure;return terminal;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=Object.fromEntries(process.argv.slice(2).map(a=>{const [k,...v]=a.replace(/^--/,'').split('=');return[k,v.join('=')||true];}));
 if(args.run){assert(args.release&&args.out,'--release and --out required');await run(resolve(args.release),resolve(args.out));}
 else console.log(JSON.stringify({status:'PLAN_ONLY_NO_EXECUTION',requires:'--run --release=parent-signed-exact-release.json --out=fresh-directory',deadline:DEADLINE}));
}
