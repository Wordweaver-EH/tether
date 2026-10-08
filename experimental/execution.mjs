import {fork} from 'node:child_process';
export const active=new Set();
export function cancelActive(){for(const child of active)child.kill('SIGKILL');}
export async function execute(payload,{workerPath}={}){return new Promise((resolveTask,reject)=>{
 const child=fork(workerPath,[],{stdio:['ignore','inherit','inherit','ipc']});child.rawPath=payload.rawPath;active.add(child);let response=null,timedOut=false;
 const timeout=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},payload.limits.maxTaskWallSeconds*1000);
 child.on('message',r=>{response=r;});child.on('error',error=>{clearTimeout(timeout);active.delete(child);reject(error);});
 child.on('exit',code=>{clearTimeout(timeout);active.delete(child);if(code===0&&response?.ok)resolveTask(response);else{const error=new Error(timedOut?'task wall ceiling exceeded':response?.error??`worker exit ${code}`);error.partialRaw=response?.partialRaw??{status:'UNKNOWN_AFTER_HARD_KILL_OR_ABRUPT_EXIT',rawPath:payload.rawPath};reject(error);}});child.send(payload);
});}

export function resourceTotals({completedCpuSeconds=0,liveCpuSeconds=0,parentUsage,completedRawBytes=0,liveRawBytes=0},limits){
 const cpuSeconds=completedCpuSeconds+liveCpuSeconds+(parentUsage.userCPUTime+parentUsage.systemCPUTime)/1e6,rawBytes=completedRawBytes+liveRawBytes;
 if(cpuSeconds>limits.maxPhaseCpuSeconds)throw new Error('phase aggregate child plus parent CPU ceiling exceeded');
 if(rawBytes>limits.maxPhaseRawBytes)throw new Error('phase aggregate raw-byte ceiling exceeded');
 return {cpuSeconds,rawBytes};
}

// Only a disappearing procfs process is tolerated. Permissions, malformed data,
// other I/O and raw-file errors remain failures.
export async function readLiveProcess(pid,read){
 let statText,statusText;
 try{statText=await read(`/proc/${pid}/stat`,'utf8');statusText=await read(`/proc/${pid}/status`,'utf8');}
 catch(error){if(error.code==='ENOENT'||error.code==='ESRCH')return {exited:true,reason:error.code};throw error;}
 const terminalState=statusText.match(/^State:\s+([ZXx])/m)?.[1];if(terminalState)return {exited:true,reason:`process-state-${terminalState}`};
 const fields=statText.slice(statText.lastIndexOf(')')+2).split(' '),userTicks=Number(fields[11]),systemTicks=Number(fields[12]),match=statusText.match(/^VmRSS:\s+(\d+)/m);
 if(!Number.isFinite(userTicks)||!Number.isFinite(systemTicks)||!match)throw new Error('invalid live process accounting data');
 return {exited:false,userTicks,systemTicks,rssBytes:Number(match[1])*1024};
}
