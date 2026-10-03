import {writeFileSync,renameSync} from 'node:fs';import {finalizeSearch} from './search-finalization.mjs';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';import {resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
import {json,consumeRelease,verifyLock} from './lock.mjs';import {sha256,parse} from './raw-stream.mjs';import {validateSearch} from './search-validation.mjs';import {generation,tasksFor,reduceCandidate,select} from './search-core.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const save=(path,obj)=>writeFile(path,JSON.stringify(obj,null,2)+'\n',{flag:'wx',mode:0o444});
export async function runSearch({lockPath,releasePath,out,workers=1}){
 if(!lockPath||!releasePath||!out)throw Error('explicit lock, root release, fresh output required');out=resolve(out);lockPath=resolve(lockPath);releasePath=resolve(releasePath);
 const prepared=await json(lockPath);if(resolve(prepared.repo)!==resolve(here,'..'))throw Error('lock must cover this executable source tree');
 const {design,initial,snapshot,config,limits}=await validateSearch(prepared);
 if(!Number.isInteger(workers)||workers<1||workers>limits.workersMaximum)throw Error('worker ceiling');
 if(process.platform!=='linux')throw Error('Linux live procfs accounting required');
 const clockTicks=Number(execFileSync('getconf',['CLK_TCK'],{encoding:'utf8'}).trim());if(!(clockTicks>0))throw Error('CPU ticks unavailable');
 try{await stat(out);throw Error('fresh absent output directory required');}catch(e){if(e.code!=='ENOENT')throw e;}
 const {lock,release}=await consumeRelease(releasePath,lockPath,'opponent-search',out,workers);
 await mkdir(out);for(const d of ['raw','results','memory','generations'])await mkdir(resolve(out,d));
 await save(resolve(out,'LOCK.json'),lock);await save(resolve(out,'RELEASE.json'),release);
 const {execute,active,cancelActive,readLiveProcess,resourceTotals}=await import('./execution.mjs');
 let failure=null,supervising=false,completedCpu=0,completedRaw=0;const allCandidates=[],allTasks=[],allResults=[];
 const fail=e=>{failure??=e;cancelActive();};
 const phaseStarted=performance.now();
 const timer=setTimeout(()=>fail(Error('phase wall ceiling exceeded')),limits.maxPhaseWallSeconds*1000);
 const sample=setInterval(async()=>{if(supervising||failure)return;supervising=true;try{const baseCpu=completedCpu,baseRaw=completedRaw,children=[...active];let liveCpu=0,liveRaw=0;for(const child of children){let bytes=0;try{bytes=(await stat(child.rawPath)).size;}catch(e){if(e.code!=='ENOENT')throw e;}liveRaw+=bytes;if(bytes>limits.maxRawBytesPerTask)throw Error('task raw ceiling');const usage=await readLiveProcess(child.pid,readFile);if(!usage.exited){liveCpu+=(usage.userTicks+usage.systemTicks)/clockTicks;if(usage.rssBytes>limits.maxTaskRssBytes)throw Error('task RSS ceiling');}}resourceTotals({completedCpuSeconds:baseCpu,liveCpuSeconds:liveCpu,parentUsage:process.resourceUsage(),completedRawBytes:baseRaw,liveRawBytes:liveRaw},limits);}catch(e){fail(e);}finally{supervising=false;}},250);
 const stop=()=>fail(Error('external stop signal'));process.on('SIGINT',stop);process.on('SIGTERM',stop);
 const checkFinalBounds=()=>{if(failure)throw failure;if(performance.now()-phaseStarted>limits.maxPhaseWallSeconds*1000)throw Error('phase wall ceiling exceeded during finalization');resourceTotals({completedCpuSeconds:completedCpu,parentUsage:process.resourceUsage(),completedRawBytes:completedRaw},limits);};
 try{
  let previous=[];
  for(let g=0;g<8&&!failure;g++){
   const candidates=generation(design,initial,g,previous),tasks=candidates.flatMap(c=>tasksFor(design,c,snapshot.sha256));
   const manifest={generation:g,candidates,tasks,seeds:design.searchSeeds[g],seedSha256:sha256(design.searchSeeds[g]),lockSha256:release.lockSha256};
   await save(resolve(out,'generations',`g${g}-plan.json`),manifest);allTasks.push(...tasks);let cursor=0;const results=[];
   const loop=async()=>{while(!failure&&cursor<tasks.length){const task=tasks[cursor++];try{
    const candidate=candidates.find(c=>c.id===task.candidateId),arm=design.arms.find(a=>a.id===task.target);
    // Read and clone frozen snapshot afresh for EVERY task. Child output is never reused.
    const bytes=task.initialMemory?await readFile(resolve(lock.freeze,task.initialMemory)):null;if(bytes&&sha256(bytes)!==snapshot.sha256)throw Error('frozen snapshot changed');
    const response=await execute({task,arm,config,memorySnapshot:bytes?parse(bytes):null,opponentSpec:{id:candidate.id,vector:candidate.vector},limits,
     provenance:{lockSha256:release.lockSha256,qualifiedBaselineCommit:design.qualifiedBaselineCommit,sourceFingerprint:design.sourceFingerprint,configSha256:task.configSha256,snapshotSha256:task.snapshotSha256,taskSha256:sha256(task),candidate,parameterSha256:candidate.parameterSha256,seedSha256:sha256(design.searchSeeds[g]),generationManifestSha256:sha256(manifest)},
     rawPath:resolve(out,'raw',task.id+'.jsonl.gz'),resultPath:resolve(out,'results',task.id+'.json'),memoryPath:resolve(out,'memory',task.id+'.json')},{workerPath:resolve(here,'search-worker.mjs')});
    const result={...response.result,terminalResourceUsage:response.terminalResourceUsage};results.push(result);allResults.push(result);completedRaw+=result.raw.bytes;completedCpu+=(response.terminalResourceUsage.userCPUTime+response.terminalResourceUsage.systemCPUTime)/1e6;
    resourceTotals({completedCpuSeconds:completedCpu,parentUsage:process.resourceUsage(),completedRawBytes:completedRaw},limits);
   }catch(e){fail(e);}}};
   await Promise.all(Array.from({length:workers},loop));if(failure)throw failure;
   previous=candidates.map(c=>reduceCandidate(c,tasks.filter(t=>t.candidateId===c.id),results.filter(r=>tasks.find(t=>t.id===r.taskId)?.candidateId===c.id)));allCandidates.push(...previous);
   await save(resolve(out,'generations',`g${g}-results.json`),{candidates:previous,results:tasks.map(t=>results.find(r=>r.taskId===t.id))});
  }
  if(failure)throw failure;
  await finalizeSearch({stopSampling:()=>clearInterval(sample),drainSampling:async()=>{while(supervising)await new Promise(r=>setTimeout(r,10));},getFailure:()=>failure,prepare:async()=>{await verifyLock(lock);
  const winner=select(allCandidates,initial,design),manifest={candidates:allCandidates,tasks:allTasks,results:allTasks.map(t=>allResults.find(r=>r.taskId===t.id))};await save(resolve(out,'SEARCH-MANIFEST.json'),manifest);
  return JSON.stringify({status:winner?'COMPLETE_NEEDS_INDEPENDENT_REVIEW_AND_GIT':'NO_ELIGIBLE_CANDIDATE_STOP_NO_EVALUATION_RELEASE',qualifiedBaselineCommit:design.qualifiedBaselineCommit,lockSha256:release.lockSha256,sourceFingerprint:design.sourceFingerprint,seedSha256:sha256(design.searchSeeds),manifest:{path:resolve(out,'SEARCH-MANIFEST.json'),sha256:sha256(await readFile(resolve(out,'SEARCH-MANIFEST.json')))},styles:winner?[{id:'searched-style-1',vector:winner.vector,candidateId:winner.id,parameterSha256:winner.parameterSha256,totalIntegerNet:winner.totalNet}]:[],resources:{completedCpuSeconds:completedCpu,completedRawBytes:completedRaw,parentResourceUsage:process.resourceUsage(),samplingMs:250,scope:'isolated child lifetime through final IPC receipt plus parent; final child IPC/exit micro-overhead excluded',overshoot:'250ms sampling plus scheduler/I/O delay; no automatic resume'}},null,2)+'\n';},checkBounds:()=>checkFinalBounds(),publish:bytes=>{const path=resolve(out,'SEARCH-RESULT.json');writeFileSync(path,bytes,{flag:'wx',mode:0o444});try{checkFinalBounds();}catch(error){renameSync(path,resolve(out,'REJECTED-SEARCH-RESULT.json'));throw error;}}});
 }catch(e){fail(e);await save(resolve(out,'FAILURE.json'),{status:'FAILED_STOPPED_NO_AUTOMATIC_RETRY',error:String(failure.stack),completed:allResults.length,completedCpuSeconds:completedCpu,completedRawBytes:completedRaw,partialRaw:failure.partialRaw??null});throw failure;
 }finally{clearTimeout(timer);clearInterval(sample);while(supervising)await new Promise(r=>setTimeout(r,10));process.off('SIGINT',stop);process.off('SIGTERM',stop);}
}
export async function main(args=process.argv.slice(2)){if(!args.includes('--run')){console.log(JSON.stringify({status:'PLAN_ONLY_NO_EXECUTION',phase:'opponent-search',candidates:128,bouts:512,requires:'exact one-use root release plus independent review and verified Git checkpoint'}));return;}const options=Object.fromEntries(args.filter(a=>a.includes('=')).map(a=>{const i=a.indexOf('=');return[a.slice(2,i),a.slice(i+1)];}));await runSearch({lockPath:options.lock,releasePath:options.release,out:options.out,workers:Number(options.workers??1)});}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
