import {active,cancelActive,execute,resourceTotals} from './execution.mjs';
import {execFileSync} from 'node:child_process';import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';import {resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
import {validatePlan,validateTasks} from './plan-validation.mjs';
import {json,consumeRelease,verifyLock} from './lock.mjs';import {sha256,parse} from './raw-stream.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const opts=Object.fromEntries(process.argv.slice(2).map(x=>{const [k,...v]=x.replace(/^--/,'').split('=');return[k,v.join('=')||true];}));
const historyKey=t=>JSON.stringify([t.phase,t.cluster,t.condition,t.arm,t.seat]);
function validateLimits(limits,workers){
 const keys=['workersMaximum','maxPhaseWallSeconds','maxTaskWallSeconds','maxTaskRssBytes','maxRawBytesPerTask','maxPhaseCpuSeconds','maxPhaseRawBytes'];
 if(!limits||keys.some(k=>!Number.isFinite(limits[k])||limits[k]<=0)||workers>limits.workersMaximum||limits.workersMaximum>8)throw new Error('reviewed phase ceilings required');
 return limits;
}
if(!opts.run)console.log(JSON.stringify({status:'PLAN_ONLY_NO_EXECUTION',requires:'--run --phase=pilot|evaluation --lock=... --release=... --out=fresh-directory --workers=1..8'}));
else {
 if(!['pilot','evaluation'].includes(opts.phase)||!opts.lock||!opts.release||!opts.out)throw new Error('explicit supported phase, lock, release, fresh out required');
 const out=resolve(opts.out),workers=Number(opts.workers??1);const {lock,release}=await consumeRelease(resolve(opts.release),resolve(opts.lock),opts.phase,out,workers);
 await mkdir(out);for(const dir of ['raw','results','memory'])await mkdir(resolve(out,dir));
 await writeFile(resolve(out,'LOCK.json'),JSON.stringify(lock,null,2)+'\n',{flag:'wx'});await writeFile(resolve(out,'RELEASE.json'),JSON.stringify(release,null,2)+'\n',{flag:'wx'});
 const design=await validatePlan(lock),tasks=await json(resolve(lock.prereg,opts.phase==='pilot'?'PILOT-TASKS.json':'EVALUATION-TASKS.json'));
 await validateTasks(lock,design,tasks,opts.phase);
 if(!tasks.length||new Set(tasks.map(t=>t.id)).size!==tasks.length||tasks.some(t=>t.phase!==opts.phase||!/^[a-zA-Z0-9_-]+$/.test(t.id)))throw new Error('invalid task list');
 const groups=new Map();for(const task of tasks){const key=historyKey(task);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(task);}
 for(const group of groups.values())if(group.some((t,i)=>t.bout!==i))throw new Error('memory history must start at bout zero and be consecutive');
 const limits=validateLimits((await json(resolve(lock.prereg,'RUNTIME-LIMITS.json')))[opts.phase],workers);
 if(opts.phase==='evaluation'){
  const metrics=await json(resolve(lock.prereg,'METRIC-CONTRACT.json'));if(metrics.version!==1)throw new Error('locked evaluation metric definitions required');
  if(!lock.opponentFreeze)throw new Error('evaluation requires separately reviewed opponent freeze');
 }
 let completed=0,cursor=0,totalCpuSeconds=0,totalRawBytes=0;const entries=[...groups.values()],results=[];let failure=null;
 if(process.platform!=='linux')throw new Error('live CPU/RSS ceiling enforcement requires Linux procfs');
 const clockTicks=Number(execFileSync('getconf',['CLK_TCK'],{encoding:'utf8'}).trim());if(!(clockTicks>0))throw new Error('missing CPU tick unit');
 let supervising=false;
 const supervisor=setInterval(async()=>{if(supervising||failure)return;supervising=true;try{
  let liveCpu=0,liveRawBytes=0;const completedRawAtSampleStart=totalRawBytes,completedCpuAtSampleStart=totalCpuSeconds,childrenAtSampleStart=[...active];
  for(const child of childrenAtSampleStart){try{
   liveRawBytes+=(await stat(child.rawPath)).size;
   const processStat=await readFile(`/proc/${child.pid}/stat`,'utf8'),fields=processStat.slice(processStat.lastIndexOf(')')+2).split(' ');liveCpu+=(Number(fields[11])+Number(fields[12]))/clockTicks;
   const status=await readFile(`/proc/${child.pid}/status`,'utf8'),rss=Number(status.match(/^VmRSS:\s+(\d+)/m)?.[1]??0)*1024;
   if(rss>limits.maxTaskRssBytes)throw new Error('live child RSS ceiling exceeded');
  }catch(error){if(error.code!=='ENOENT')throw error;}}
  resourceTotals({completedCpuSeconds:completedCpuAtSampleStart,liveCpuSeconds:liveCpu,parentUsage:process.resourceUsage(),completedRawBytes:completedRawAtSampleStart,liveRawBytes},limits);
 }catch(error){failure??=error;cancelActive();}finally{supervising=false;}},250);
 const timer=setTimeout(()=>{failure=new Error('phase wall ceiling exceeded');cancelActive();},limits.maxPhaseWallSeconds*1000);
 const stop=()=>{failure=new Error('external stop signal');cancelActive();};process.on('SIGTERM',stop);process.on('SIGINT',stop);
 const loop=async()=>{while(!failure&&cursor<entries.length){const group=entries[cursor++];let memory=null;
  for(const task of group){if(failure)return;try{
   const arm=design.arms.find(a=>a.id===task.arm);if(!arm)throw new Error('unknown locked arm');
   const configPath=resolve(lock.prereg,'configs',`${task.condition}.json`),configBytes=await readFile(configPath);if(sha256(configBytes)!==task.configSha256)throw new Error('task config hash mismatch');const config=JSON.parse(configBytes);
   if(task.bout===0&&arm.kind==='mind'){const bytes=await readFile(resolve(lock.freeze,task.initialMemory));if(sha256(bytes)!==task.snapshotSha256)throw new Error('frozen snapshot mismatch');memory=parse(bytes);}
   let opponentSpec=null;if(config.pendingOpponentFreeze){if(!lock.opponentFreeze)throw new Error('searched style requires separately reviewed opponent freeze');const frozen=await json(lock.opponentFreeze);opponentSpec=frozen.styles?.find(s=>s.id===task.opponent);if(!opponentSpec)throw new Error('frozen style missing');}
   const response=await execute({task,arm,config,memorySnapshot:memory,opponentSpec,limits,provenance:{lockSha256:release.lockSha256,qualifiedBaselineCommit:design.qualifiedBaselineCommit,sourceFingerprint:design.sourceFingerprint,configSha256:task.configSha256,snapshotSha256:task.snapshotSha256,taskSha256:sha256(task)},rawPath:resolve(out,'raw',task.id+'.jsonl.gz'),resultPath:resolve(out,'results',task.id+'.json'),memoryPath:resolve(out,'memory',task.id+'.json')},{workerPath:resolve(here,'worker.mjs')});
   if(response.memoryPath)memory=await json(response.memoryPath);response.result.terminalResourceUsage=response.terminalResourceUsage;results.push(response.result);completed++;totalRawBytes+=response.result.raw.bytes;if(totalRawBytes>limits.maxPhaseRawBytes)throw new Error('phase raw-byte ceiling exceeded');totalCpuSeconds+=(response.terminalResourceUsage.userCPUTime+response.terminalResourceUsage.systemCPUTime)/1e6;if(totalCpuSeconds>limits.maxPhaseCpuSeconds)throw new Error('phase aggregate completed-task CPU ceiling exceeded');console.log(JSON.stringify({type:'progress',phase:opts.phase,completed,total:tasks.length,taskId:task.id}));
  }catch(error){failure??=error;cancelActive();return;}}
 }};
 await Promise.all(Array.from({length:workers},loop));clearTimeout(timer);clearInterval(supervisor);while(supervising)await new Promise(resolveWait=>setTimeout(resolveWait,10));process.off('SIGTERM',stop);process.off('SIGINT',stop);
 if(!failure)try{await verifyLock(lock);resourceTotals({completedCpuSeconds:totalCpuSeconds,parentUsage:process.resourceUsage(),completedRawBytes:totalRawBytes},limits);}catch(error){failure=error;}
 if(failure){await writeFile(resolve(out,'FAILURE.json'),JSON.stringify({status:'FAILED_STOPPED_NO_AUTOMATIC_RETRY',completed,total:tasks.length,completedRawBytes:totalRawBytes,completedChildrenLifetimeCpuSeconds:totalCpuSeconds,parentResourceUsage:process.resourceUsage(),error:failure.stack,partialRaw:failure.partialRaw??null})+'\n',{flag:'wx'});throw failure;}
 await writeFile(resolve(out,'COMPLETE.json'),JSON.stringify({status:'COMPLETE_NEEDS_INDEPENDENT_ANALYSIS',phase:opts.phase,completed,total:tasks.length,lockSha256:release.lockSha256,resources:{completedRawBytes:totalRawBytes,completedChildrenLifetimeCpuSeconds:totalCpuSeconds,parentResourceUsage:process.resourceUsage(),scope:'isolated child lifetime through final IPC receipt plus parent own process; final child IPC/exit micro-overhead excluded',liveEnforcementSamplingMs:250},results},null,2)+'\n',{flag:'wx',mode:0o444});
}
