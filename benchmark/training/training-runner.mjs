import {Worker} from 'node:worker_threads';import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {PLAN,ARMS,candidatesForGeneration,candidateTasks,mindTasks,rankCandidates} from './training-plan.mjs';
const here=dirname(fileURLToPath(import.meta.url));
import {verifyTrainingLock,serialize} from './lock-contract.mjs';
import {createPool,consumeRelease} from './runtime-controls.mjs';

const opts=Object.fromEntries(process.argv.slice(2).map(x=>{const[k,...v]=x.replace(/^--/,'').split('=');return[k,v.join('=')||true];}));
if(!opts.run){console.log(JSON.stringify({status:'PLAN_ONLY_NO_EXECUTION',plan:PLAN,requires:'--run --lock=reviewed-lock.json --out=fresh-attempt --workers=1..8'},null,2));}
else{
  if(!opts.lock||!opts.out)throw new Error('lock and fresh output required');
  const lock=await verifyTrainingLock(resolve(opts.lock),here,PLAN.id);
  const n=Number(opts.workers??lock.workers);if(!Number.isInteger(n)||n<1||n>8||n!==lock.workers)throw new Error('worker count must match reviewed estimate/release');
  const out=resolve(opts.out);await mkdir(out);await mkdir(resolve(out,'raw'));await mkdir(resolve(out,'snapshots'));
  await consumeRelease(resolve(opts.lock),{attempt:out,at:new Date().toISOString(),sourceFingerprint:lock.sourceFingerprint});
  await writeFile(resolve(out,'LOCK-COPY.json'),JSON.stringify(lock,null,2)+'\n',{flag:'wx'});
  const save=async r=>{await writeFile(resolve(out,'raw',`${r.task.id}.json`),serialize(r)+'\n',{flag:'wx'});};
  const p=createPool(lock.repo,n),initial=JSON.parse(await readFile(resolve(here,'initial-vectors.json'),'utf8')).candidates,selected=[];
  try{
    for(const arm of ARMS){let previous=[],all=[];
      for(let generation=0;generation<8;generation++){
        const candidates=candidatesForGeneration(arm,generation,initial,previous);
        await writeFile(resolve(out,`${arm}-generation-${generation}-candidates.json`),JSON.stringify(candidates,null,2)+'\n',{flag:'wx'});
        const tasks=candidates.flatMap(c=>candidateTasks(c).map(t=>({...t,level:lock.levels?.[arm]??null})));
        const rows=await p.map(tasks,save);previous=candidates.map(c=>{const rs=rows.filter(r=>r.task.candidateId===c.id);if(rs.length!==8)throw new Error('incomplete screening');return{...c,score:rs.reduce((s,r)=>s+r.netScorePerMinute,0)/8};});all.push(...previous);
        await writeFile(resolve(out,`${arm}-generation-${generation}-ranked.json`),JSON.stringify([...previous].sort(rankCandidates),null,2)+'\n',{flag:'wx'});
      }
      const finalists=[...all].sort(rankCandidates).slice(0,8);const rows=await p.map(finalists.flatMap(c=>candidateTasks(c,'selection').map(t=>({...t,level:lock.levels?.[arm]??null}))),save);
      const ranked=finalists.map(c=>{const rs=rows.filter(r=>r.task.candidateId===c.id);if(rs.length!==32)throw new Error('incomplete selection');return{...c,screeningScore:c.score,score:rs.reduce((s,r)=>s+r.netScorePerMinute,0)/32};}).sort(rankCandidates);
      selected.push({...ranked[0],level:lock.levels?.[arm]??null});await writeFile(resolve(out,`${arm}-selection-ranked.json`),JSON.stringify(ranked,null,2)+'\n',{flag:'wx'});
    }
    // Parallelize independent clusters, never bouts within one evolving memory history.
    const snapshots=Array(12).fill(null),teaching={cycles:0,tier2:0,nonreflex:0};
    for(let bout=0;bout<32;bout++){
      const tasks=Array.from({length:12},(_,cluster)=>({...mindTasks(cluster)[bout],memorySnapshot:snapshots[cluster]}));
      const rows=await p.map(tasks,save);for(const row of rows){snapshots[row.task.cluster]=row.memorySnapshot;for(const key of Object.keys(teaching))teaching[key]+=row.teaching[key];}
    }
    for(let cluster=0;cluster<12;cluster++)await writeFile(resolve(out,'snapshots',`mind-${cluster}.json`),serialize(snapshots[cluster])+'\n',{flag:'wx'});
    const r=teaching.nonreflex?teaching.tier2/teaching.nonreflex:0;
    try{await verifyTrainingLock(resolve(opts.lock),here,PLAN.id);}catch(error){await writeFile(resolve(out,'INVALID-SOURCE-CHANGED.json'),JSON.stringify({status:'INVALID_SOURCE_CHANGED',error:error.stack})+'\n',{flag:'wx'});throw error;}
    await writeFile(resolve(out,'TRAINING-RESULT.json'),JSON.stringify({status:'TRAINING_COMPLETE_NEEDS_FREEZE_REVIEW',selected,teaching,
      fixedTeacherEvery:Math.max(1,Math.min(1000,Math.round(1/Math.max(r,.001)))),plan:PLAN},null,2)+'\n',{flag:'wx'});
  }catch(error){await writeFile(resolve(out,'FAILURE.json'),JSON.stringify({error:error.stack,at:new Date().toISOString()},null,2)+'\n',{flag:'wx'});throw error;}
  finally{await p.close();}
}
