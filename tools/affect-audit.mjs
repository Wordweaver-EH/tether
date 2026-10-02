import {Worker} from 'node:worker_threads';
import {createHash} from 'node:crypto';
import {readFile,writeFile,appendFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sourceFingerprint} from '../arena/audit.mjs';
import {bootstrapMean,mean,pairedEffect} from '../arena/audit-stats.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const protocol={seedStart:200001,seeds:32,modes:['MODE_A','MODE_B'],seats:[1,2],opponents:['directShooter','immediateRecaller','reactiveDodger'],durationSec:300,budget:192,workers:4};
async function manifest(){const source=await sourceFingerprint(root),additional={};for(const p of ['tools/affect-audit.mjs','tools/affect-audit-worker.mjs','reports/affect-repair-preregistration.md'])additional[p]=createHash('sha256').update(await readFile(resolve(root,p))).digest('hex');return{source,additional};}
export function summarize(rows){const flat=rows.flatMap(r=>['full','noAffect'].map(v=>({...r,...r[v],variant:v,budget:192})));const clusters=new Map();for(const r of rows){const list=clusters.get(r.seed)??[];list.push(r);clusters.set(r.seed,list);}return{pairs:rows.length,behaviorDivergence:{pairsDiffering:rows.filter(r=>!r.comparison.sameActionHash).length,pairedFractionCI:bootstrapMean([...clusters.values()].map(rs=>mean(rs.map(r=>r.comparison.sameActionHash?0:1)))),meanDifferingTickFractionCI:bootstrapMean([...clusters.values()].map(rs=>mean(rs.map(r=>r.comparison.differingTicks/r.comparison.inputTicks))))},effects:Object.fromEntries(['scoreMargin','win','focusSwitchesPerMinute'].map(k=>[k,pairedEffect(flat,'noAffect',k)])),byOpponent:Object.fromEntries(protocol.opponents.map(o=>[o,Object.fromEntries(['scoreMargin','win','focusSwitchesPerMinute'].map(k=>[k,pairedEffect(flat,'noAffect',k,r=>r.opponent===o)]))])),byMode:Object.fromEntries(protocol.modes.map(o=>[o,Object.fromEntries(['scoreMargin','win','focusSwitchesPerMinute'].map(k=>[k,pairedEffect(flat,'noAffect',k,r=>r.mode===o)]))]))};}
export function validateRows(rows,jobs){
 if(rows.length!==jobs.length)throw Error('incomplete paired matrix');
 const seen=new Set();for(const row of rows){const job=jobs[row.id];
  if(!job||seen.has(row.id)||Object.entries(job).some(([k,v])=>row[k]!==v))throw Error('duplicate or mismatched pair');
  if(row.full.elapsedSec!==job.durationSec||row.noAffect.elapsedSec!==job.durationSec)throw Error('incomplete bout duration');seen.add(row.id);
 }
}
export async function main(){const out=resolve(root,'reports/affect-repair-targeted'),before=await manifest();const jobs=[];for(let seed=protocol.seedStart;seed<protocol.seedStart+protocol.seeds;seed++)for(const mode of protocol.modes)for(const seat of protocol.seats)for(const opponent of protocol.opponents)jobs.push({id:jobs.length,seed,mode,seat,opponent,durationSec:protocol.durationSec});
 await mkdir(dirname(out),{recursive:true});await writeFile(out+'.manifest.json',JSON.stringify({protocol,before,startedAt:new Date().toISOString()},null,2),{flag:'wx'});await writeFile(out+'.rows.jsonl','',{flag:'wx'});let next=0,done=0,writing=Promise.resolve();const rows=[],workers=[];console.log(`Affect audit: ${jobs.length} pairs / ${jobs.length*2} bouts`);
 try{await new Promise((resolveRun,reject)=>{const dispatch=w=>{if(next<jobs.length)w.postMessage(jobs[next++]);else if(done===jobs.length)resolveRun();};for(let i=0;i<protocol.workers;i++){const w=new Worker(new URL('./affect-audit-worker.mjs',import.meta.url));workers.push(w);w.on('error',reject);w.on('exit',code=>{if(code&&done<jobs.length)reject(Error('worker exit '+code));});w.on('message',msg=>{if(msg.error){reject(Error(msg.error));return;}rows.push(msg.row);done++;writing=writing.then(()=>appendFile(out+'.rows.jsonl',JSON.stringify(msg.row)+'\n'));writing.catch(reject);if(done%16===0||done===jobs.length)console.log(`${done}/${jobs.length} pairs`);dispatch(w);});dispatch(w);}});}finally{await Promise.all(workers.map(w=>w.terminate()));await writing;}
 validateRows(rows,jobs);
 const after=await manifest();if(JSON.stringify(before)!==JSON.stringify(after))throw Error('source or protocol changed; invalid study');rows.sort((a,b)=>a.id-b.id);const result={protocol,manifest:before,finishedAt:new Date().toISOString(),summary:summarize(rows),rows};await writeFile(out+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result.summary,null,2));return result;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
