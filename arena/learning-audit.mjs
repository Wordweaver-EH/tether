// D16/D17 measurement protocol: repeated memory, held-out seeds, synthetic bots.
import { Worker } from 'node:worker_threads';
import { mkdir, writeFile, appendFile, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceFingerprint } from './audit.mjs';
import { summarizeLearning } from './learning-stats.mjs';
import { learningMarkdown, learningHtml } from './learning-report.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function parseLearningArgs(argv) {
  const config={seeds:32,adaptationSeeds:64,episodes:12,heldout:3,workers:1,
    durationSec:300,budgets:[192],modes:['MODE_B'],opponents:['direct','anchor'],
    variants:['full','noMetacog','noAutomatization','noLearning'],seedStart:101,
    adaptationSeedStart:700001,resume:false,label:'smoke',out:'reports/learning-smoke'};
  for(let i=0;i<argv.length;i+=2){
    const key=argv[i]?.replace(/^--/,'');
    if(!(key in config)||argv[i+1]===undefined)throw new Error(`unknown/missing argument ${argv[i]}`);
    config[key]=Array.isArray(config[key])?argv[i+1].split(','):argv[i+1];
  }
  for(const key of ['seeds','adaptationSeeds','episodes','heldout','workers','durationSec','seedStart','adaptationSeedStart'])config[key]=Number(config[key]);
  if(![true,false,'true','false'].includes(config.resume))throw new Error('resume must be true or false');
  config.resume=config.resume===true||config.resume==='true';
  for(const key of ['seeds','adaptationSeeds','episodes','heldout','workers','seedStart','adaptationSeedStart'])
    if(!Number.isInteger(config[key])||config[key]<1)throw new RangeError(`invalid ${key}`);
  config.budgets=config.budgets.map(Number);
  if(config.workers>2||!Number.isFinite(config.durationSec)||config.durationSec<=0||config.durationSec>300||
    config.budgets.some(b=>!Number.isInteger(b)||b<16||b>4096))throw new RangeError('invalid workers/duration/budget');
  for(const key of ['modes','opponents','variants','budgets'])if(!config[key].length||new Set(config[key]).size!==config[key].length)throw new Error(`invalid ${key}`);
  if(config.modes.some(x=>!['MODE_A','MODE_B'].includes(x))||config.opponents.some(x=>!['direct','anchor'].includes(x))||
    config.variants.some(x=>!['full','noMetacog','noAutomatization','noLearning'].includes(x))||!config.variants.includes('full'))throw new Error('unknown mode/proxy/variant');
  if(config.label==='final'&&config.durationSec!==300)throw new Error('final audit requires full 300s bouts');
  return config;
}
export function learningJobs(config) {
  const jobs=[];
  for(const budget of config.budgets)for(const mode of config.modes)for(const seat of [1,2])for(const opponent of config.opponents){
    for(let clusterSeed=config.seedStart;clusterSeed<config.seedStart+config.seeds;clusterSeed++)
      jobs.push({id:jobs.length,protocol:'learning',clusterSeed,budget,mode,seat,opponent,variants:config.variants,
        durationSec:config.durationSec,episodes:config.episodes,heldout:config.heldout,side:clusterSeed%2?1:-1});
    for(let seed=config.adaptationSeedStart;seed<config.adaptationSeedStart+config.adaptationSeeds;seed++)for(const switching of [false,true])for(const variant of (seed%2?['full','noAdaptation']:['noAdaptation','full']))
      jobs.push({id:jobs.length,protocol:'adaptation',clusterSeed:seed,seed,budget,mode,seat,opponent,variant,
        durationSec:config.durationSec,switching,side:seed%2?1:-1});
  }
  const trainingSeeds=new Set(jobs.filter(j=>j.protocol==='learning').flatMap(j=>Array.from({length:j.episodes},(_,i)=>j.clusterSeed*10000+i+1)));
  const heldoutSeeds=jobs.flatMap(j=>j.protocol==='adaptation'?[j.seed]:Array.from({length:j.heldout},(_,i)=>100000000+j.clusterSeed*10000+i+1));
  if(heldoutSeeds.some(seed=>trainingSeeds.has(seed)))throw new Error('training/heldout seed overlap');
  return jobs;
}
export async function runLearningAudit(config) {
  const before=await sourceFingerprint(),started=performance.now(),jobs=learningJobs(config),rows=[];
  const out=resolve(root,config.out);await mkdir(dirname(out),{recursive:true});
  const completed=new Set();
  if(config.resume){
    const prior=JSON.parse(await readFile(`${out}.progress.json`,'utf8'));
    const comparable=c=>JSON.stringify({...c,resume:false});
    if(prior.source.hash!==before.hash)throw new Error('cannot resume: source fingerprint differs');
    if(comparable(prior.config)!==comparable(config))throw new Error('cannot resume: configuration differs');
    const text=await readFile(`${out}.rows.jsonl`,'utf8'), lines=text.split('\n');
    const saved=[];
    for(let i=0;i<lines.length;i++)if(lines[i]){
      try{saved.push(JSON.parse(lines[i]));}catch(error){if(i!==lines.length-1)throw error;}
    }
    for(const job of jobs){
      const candidates=saved.filter(r=>r.id===job.id), count=job.protocol==='learning'?(job.episodes+job.heldout)*job.variants.length:1;
      if(candidates.length===count){
        const keys=new Set(candidates.map(r=>`${r.variant}/${r.phase??'adaptation'}/${r.episode??0}`));
        if(keys.size!==count)throw new Error('duplicate checkpoint rows');
        completed.add(job.id);rows.push(...candidates);
      }else if(candidates.length>count)throw new Error('duplicate completed checkpoint job');
    }
    await writeFile(`${out}.rows.jsonl`,rows.map(r=>JSON.stringify(r)+'\n').join(''));
  }else{
    await writeFile(`${out}.rows.jsonl`,'');
    await writeFile(`${out}.progress.json`,JSON.stringify({config,source:before,jobs:jobs.length,startedAt:new Date().toISOString()}));
  }
  const expectedBouts=jobs.reduce((n,j)=>n+(j.protocol==='learning'?(j.episodes+j.heldout)*j.variants.length:1),0);
  const pending=jobs.filter(j=>!completed.has(j.id));
  const workers=[];let next=0,done=completed.size,writing=Promise.resolve();
  console.log(`Learning audit: ${expectedBouts} bouts, ${jobs.length} jobs, source ${before.hash}`);
  try{await new Promise((ok,fail)=>{
    const dispatch=worker=>{if(next<pending.length)worker.postMessage(pending[next++]);else if(done===jobs.length)ok();};
    if(!pending.length){ok();return;}
    for(let i=0;i<Math.min(config.workers,pending.length);i++){
      const worker=new Worker(new URL('./learning-worker.mjs',import.meta.url));workers.push(worker);
      worker.on('error',fail);worker.on('exit',code=>{if(code!==0&&done<jobs.length)fail(new Error(`learning worker exit ${code}`));});
      worker.on('message',message=>{
        if(message.error){fail(new Error(message.error));return;}
        rows.push(...message.rows);done++;
        writing=writing.then(()=>appendFile(`${out}.rows.jsonl`,message.rows.map(r=>JSON.stringify(r)+'\n').join('')));
        if(done%10===0||done===jobs.length)console.log(`${rows.length}/${expectedBouts} bouts, ${((performance.now()-started)/1000).toFixed(1)}s`);
        dispatch(worker);
      });dispatch(worker);
    }
  });}finally{await Promise.all(workers.map(w=>w.terminate()));await writing;}
  rows.sort((a,b)=>a.id-b.id||(a.episode??0)-(b.episode??0));
  const after=await sourceFingerprint();
  const report={status:before.hash!==after.hash?'INVALID: SOURCE CHANGED':config.label==='final'?'Full-length synthetic-proxy audit; descriptive evidence':'SMOKE ONLY; not final evidence',
    config,expectedBouts,rows,summary:summarizeLearning(rows),
    sourceFingerprint:{before:before.hash,after:after.hash,files:before.files},
    command:`node arena/learning-audit.mjs ${Object.entries(config).map(([k,v])=>`--${k} ${Array.isArray(v)?v.join(','):v}`).join(' ')}`,
    runtime:{node:process.version,seconds:(performance.now()-started)/1000,secondsMeaning:'current invocation including aggregation; resume excludes prior invocation time',accumulatedSimulationSeconds:rows.reduce((sum,r)=>sum+r.simulationWallMs/1000,0),finishedAt:new Date().toISOString()},
    definitions:{success:'Resolved sparse attack credit: positive score margin within 1.5s of attempted throw/recall. Neutral timeout is failure. Not bout win or verified geometric hit.',
      failureAwareness:'Predicted failure at attempt vs actual failure at resolved attack credit; Brier and absolute error on matching outcomes.',
      latency:'Configured sensory latency, equal across processing tiers. No fabricated Type2 increment and no empirical computation-latency advantage.',
      variantOrder:'Learning variants interleaved each episode and counterbalanced by seed/episode. Adaptation on/off order alternates by seed. Shared-host CPU contention remains a limitation.',
      wallTime:'Decision runtime is performance.now() around act() on traced cognitive-cycle ticks, matched by delayed percept timestamp plus queue delay. Per-situation mean/median/p95 milliseconds exclude sim/proxy/percept construction/trace copying. Concurrent CPU load, JIT, GC and measurement overhead remain; latency is not a human reaction-time estimate. Whole-simulation wall time is reported separately.',
      hitRate:'Successful resolved throw cohorts / resolved throw cohorts by throw-time third; returning hits credit original throw; unclosed final throws explicitly censored.',
      adaptationEffect:'(full last-third minus first-third) minus (noAdaptation last-third minus first-third), paired seeds/seats/families.',
      posteriorReopen:'First logged reversal after midpoint, with latency and probability/confidence trajectory; natural maneuver reversals can also trigger this, so fixed proxy is a control.',
      uncertainty:'Seed-cluster percentile bootstrap 2000 resamples, descriptive unadjusted 95% CI; repeated seats/families within a seed are averaged, not independent replicates.'},
    limitations:['No human play data, no claim of subjective consciousness','Four competence stages are a hypothesis, never assigned from episode number','Selected synthetic fixed/switching habits are not fitted human proxies','One cognition cap here; budget sweep is in separate indicator audit','Held-out bouts may continue within-bout learning, but their memory never feeds another held-out bout','Sparse credit is model-defined; delayed consequences past its horizon can be mislabeled','Sensory latency is fixed; empirical act() timings are host-load/JIT/GC sensitive and measured with trace enabled','Conditional situation rates may reflect changing situation visitation; all raw counts retained','No multiple-testing correction; null-compatible intervals are not evidence of equivalence']};
  await writeFile(`${out}.json`,JSON.stringify(report,null,2));
  await writeFile(`${out}.md`,learningMarkdown(report));await writeFile(`${out}.html`,learningHtml(report));
  console.log(JSON.stringify({status:report.status,bouts:rows.length,seconds:report.runtime.seconds,out,source:before.hash}));
  if(before.hash!==after.hash)throw new Error('source changed; results invalid');
  return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await runLearningAudit(parseLearningArgs(process.argv.slice(2)));
