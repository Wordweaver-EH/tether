import {Worker} from 'node:worker_threads';
import {writeFile} from 'node:fs/promises';
export async function consumeRelease(lockPath,record){await writeFile(lockPath+'.consumed.json',JSON.stringify(record)+'\n',{flag:'wx'});}
export function createPool(repo,n,{workerUrl=new URL('./training-worker.mjs',import.meta.url)}={}){if(!Number.isInteger(n)||n<1||n>8)throw new Error('at most eight workers');const started=performance.now(),cpuStart=process.cpuUsage();
  const resourceCheck=()=>{const cpu=process.cpuUsage(cpuStart);if(performance.now()-started>8*3600000||(cpu.user+cpu.system)/1e6>24*3600)throw new Error('predeclared training resource ceiling reached; partial attempt preserved');};const workers=Array.from({length:n},()=>new Worker(workerUrl,{workerData:{repo}}));
  return{async map(tasks,receive){let next=0;const result=[];await Promise.all(workers.map(async worker=>{while(next<tasks.length){resourceCheck();const task=tasks[next++];
    const message=await new Promise((resolve,reject)=>{
      const cleanup=()=>{worker.off('error',err);worker.off('message',done);worker.off('exit',exit);clearTimeout(timer);clearInterval(cpuTimer);};
      const err=e=>{cleanup();reject(e);};const done=r=>{cleanup();resolve(r);};const exit=code=>err(new Error(`worker exited during ${task.id}: ${code}`));
      const timer=setTimeout(()=>err(new Error('training wall ceiling reached; partial task unscored')),Math.max(1,8*3600000-(performance.now()-started)));
      const cpuTimer=setInterval(()=>{try{resourceCheck();}catch(error){err(error);}},1000);
      worker.once('error',err);worker.once('message',done);worker.once('exit',exit);worker.postMessage(task);
    });
    if(!message.ok)throw new Error(message.error);await receive(message.result);result.push(message.result);}}));return result;},async close(){await Promise.all(workers.map(w=>w.terminate()));}};
}
