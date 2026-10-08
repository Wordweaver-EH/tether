// CPU-only, paired, budget-matched mechanism audit. No external packages.
import {Worker} from 'node:worker_threads';
import {createHash} from 'node:crypto';
import {readFile,readdir,writeFile,mkdir,appendFile} from 'node:fs/promises';
import {dirname,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as mindModule from '../src/mind/index.mjs';
import {summarizeAudit} from './audit-stats.mjs';
import {auditMarkdown,auditHtml} from './audit-report.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function parseAuditArgs(argv) {
 const o={seeds:2,workers:2,durationSec:30,budgets:[48,192,512],
  opponents:['immediateRecaller','embedWaiter','camper','spinner','reactiveDodger','mind'],
  variants:['full',...(mindModule.ABLATION_FLAGS??[])],modes:['MODE_A','MODE_B'],
  out:'reports/phase5-pilot',label:'pilot',seedStart:1,resume:false};
 for(let i=0;i<argv.length;i+=2){const key=argv[i]?.replace(/^--/,'');if(!(key in o)||argv[i+1]===undefined)throw new Error(`unknown or missing argument ${argv[i]}`);o[key]=['budgets','opponents','variants','modes'].includes(key)?argv[i+1].split(','):argv[i+1];}
 if(![true,false,'true','false'].includes(o.resume))throw new Error('resume must be true or false');o.resume=o.resume===true||o.resume==='true';
 for(const key of ['seeds','workers','durationSec','seedStart'])o[key]=Number(o[key]);o.budgets=o.budgets.map(Number);
 if(!Number.isInteger(o.seeds)||o.seeds<1||!Number.isInteger(o.workers)||o.workers<1||o.workers>8||!Number.isInteger(o.seedStart)||o.seedStart<1||!Number.isFinite(o.durationSec)||o.durationSec<=0||o.durationSec>300||o.budgets.some(b=>!Number.isInteger(b)||b<16||b>4096)||!o.budgets.length)throw new RangeError('invalid audit bounds');
 if(!o.variants.includes('full')||o.variants.length<2||o.variants.some(v=>v!=='full'&&!(mindModule.ABLATION_FLAGS??[]).includes(v)))throw new Error('audit requires full and known exported ablation flags');
 if(o.modes.some(m=>!['MODE_A','MODE_B'].includes(m))||!o.modes.length||!o.opponents.length)throw new Error('invalid modes/opponents');
 for(const key of ['budgets','opponents','variants','modes'])if(new Set(o[key]).size!==o[key].length)throw new Error(`duplicate ${key}`);
 return o;
}
export async function sourceFingerprint(base=root) {
 const files=[];
 async function walk(dir){for(const e of await readdir(resolve(base,dir),{withFileTypes:true})){const path=`${dir}/${e.name}`;if(e.isDirectory())await walk(path);else if(/\.(mjs|js|html|css)$/.test(path))files.push(path);}}
 for(const dir of ['src','arena','client','replay'])await walk(dir);
 files.push('serve.mjs');files.sort();const hash=createHash('sha256'),manifest={};
 for(const path of files){const data=await readFile(resolve(base,path));manifest[path]=createHash('sha256').update(data).digest('hex');hash.update(path+'\0').update(data).update('\0');}
 return {hash:hash.digest('hex'),files:manifest};
}
export function auditJobs(config) {
 const jobs=[];for(const budget of config.budgets)for(let seed=config.seedStart;seed<config.seedStart+config.seeds;seed++)for(const mode of config.modes)for(const seat of [1,2])for(const opponent of config.opponents)for(const variant of config.variants)jobs.push({id:jobs.length,budget,seed,mode,seat,opponent,variant,durationSec:config.durationSec});return jobs;
}
export function readCheckpoint(text, jobs) {
 // A process can stop midway through the final append. Only newline-terminated
 // rows are committed; complete malformed lines still fail loudly.
 const committed=text.slice(0,text.lastIndexOf('\n')+1), rows=[],seen=new Set();
 for(const line of committed.split('\n').filter(Boolean)){
  const row=JSON.parse(line),job=jobs[row.id];
  if(!job||Object.entries(job).some(([key,value])=>row[key]!==value))throw new Error('checkpoint job mismatch');
  if(seen.has(row.id))throw new Error('duplicate checkpoint job');
  seen.add(row.id);rows.push(row);
 }
 return {rows,committed};
}
export async function runAudit(config) {
 const started=performance.now(),before=await sourceFingerprint(),allJobs=auditJobs(config);let rows=[];
 const out=resolve(root,config.out);await mkdir(dirname(out),{recursive:true});
 let manifest={config,jobs:allJobs.length,source:before,startedAt:new Date().toISOString()};
 if(config.resume){
  manifest=JSON.parse(await readFile(`${out}.progress.json`,'utf8'));
  if(manifest.source.hash!==before.hash)throw new Error('cannot resume: source fingerprint changed');
  for(const key of ['seeds','seedStart','durationSec','budgets','opponents','variants','modes'])if(JSON.stringify(manifest.config[key])!==JSON.stringify(config[key]))throw new Error(`cannot resume: ${key} changed`);
  const checkpoint=readCheckpoint(await readFile(`${out}.rows.jsonl`,'utf8'),allJobs);rows=checkpoint.rows;
  await writeFile(`${out}.rows.jsonl`,checkpoint.committed);
 }else{
  await writeFile(`${out}.progress.json`,JSON.stringify(manifest),{flag:'wx'});
  await writeFile(`${out}.rows.jsonl`,'',{flag:'wx'});
 }
 const completed=new Set(rows.map(r=>r.id)),jobs=allJobs.filter(j=>!completed.has(j.id)),total=allJobs.length;
 let next=0,done=rows.length;const resumedBouts=done,workers=[];let writing=Promise.resolve();
 console.log(`Audit: ${total} bouts (${done} resumed); ${config.workers} workers; ${config.durationSec}s; source ${before.hash}`);
 try{if(jobs.length)await new Promise((resolveRun,reject)=>{
  const dispatch=(worker)=>{if(next<jobs.length)worker.postMessage(jobs[next++]);else if(done===total)resolveRun();};
  for(let i=0;i<Math.min(config.workers,jobs.length);i++){
   const worker=new Worker(new URL('./audit-worker.mjs',import.meta.url));workers.push(worker);
   worker.on('error',reject);worker.on('exit',code=>{if(code!==0&&done<total)reject(new Error(`audit worker exit ${code}`));});
   worker.on('message',message=>{
    if(message.error){reject(new Error(message.error));return;}
    rows.push(message.row);done++;
    writing=writing.then(()=>appendFile(`${out}.rows.jsonl`,JSON.stringify(message.row)+'\n'));writing.catch(reject);
    if(done%50===0||done===total)console.log(`${done}/${total} bouts; ${((performance.now()-started)/1000).toFixed(1)}s this invocation`);
    dispatch(worker);
   });dispatch(worker);
  }
 });}finally{await Promise.all(workers.map(w=>w.terminate()));await writing;}
 rows.sort((a,b)=>a.id-b.id);const after=await sourceFingerprint();
 const report={status:before.hash!==after.hash?'INVALID: SOURCE CHANGED DURING RUN':config.label==='final'&&config.durationSec===300?'Full-length matched audit; descriptive evidence':'PILOT / partial or limited audit; not decisive',config,rows,summary:summarizeAudit(rows,config),
  command:`node arena/audit.mjs ${Object.entries({...config,resume:false}).map(([k,v])=>`--${k} ${Array.isArray(v)?v.join(','):v}`).join(' ')}`,
  sourceFingerprint:{before:before.hash,after:after.hash,files:before.files},
  runtime:{node:process.version,resumedBouts,startedAt:manifest.startedAt,invocationSeconds:(performance.now()-started)/1000,seconds:(Date.now()-Date.parse(manifest.startedAt))/1000,finishedAt:new Date().toISOString()},
  limitations:['No human playtest data','Speech/bluff outcomes untested','Embodiment-specific switch absent unless exported by mind','Seed-cluster bootstrap CIs are descriptive and unadjusted for multiplicity','General audit resets memory; learning/adaptation identification in separate protocol']};
 await writeFile(`${out}.json`,JSON.stringify(report,null,2));await writeFile(`${out}.md`,auditMarkdown(report));await writeFile(`${out}.html`,auditHtml(report));
 console.log(JSON.stringify({status:report.status,bouts:rows.length,seconds:report.runtime.seconds,out:relative(root,out),fingerprint:before.hash}));
 if(before.hash!==after.hash)throw new Error('Source changed: results marked invalid; rerun stable snapshot');
 return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await runAudit(parseAuditArgs(process.argv.slice(2)));
