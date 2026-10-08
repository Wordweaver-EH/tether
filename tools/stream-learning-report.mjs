// Output-only recovery tool. Never runs agents or alters the evaluated source.
import { createReadStream, createWriteStream } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function parseArgs(argv) {
  const options={source:null,input:null,template:null,out:null};
  for(let i=0;i<argv.length;i+=2){
    const key=argv[i]?.replace(/^--/,'');
    if(!(key in options)||!argv[i+1])throw new Error(`unknown/missing option ${argv[i]}`);
    options[key]=resolve(argv[i+1]);
  }
  if(Object.values(options).some(x=>!x))throw new Error('--source, --input, --template, --out are required');
  return options;
}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function restoreLearningReport(options) {
  const started=performance.now();
  const {sourceFingerprint}=await import(pathToFileURL(resolve(options.source,'arena/audit.mjs')));
  const {learningJobs}=await import(pathToFileURL(resolve(options.source,'arena/learning-audit.mjs')));
  const {summarizeLearning}=await import(pathToFileURL(resolve(options.source,'arena/learning-stats.mjs')));
  const {learningMarkdown,learningHtml}=await import(pathToFileURL(resolve(options.source,'arena/learning-report.mjs')));
  const before=await sourceFingerprint(options.source);
  const progress=JSON.parse(await readFile(`${options.input}.progress.json`,'utf8'));
  const template=JSON.parse(await readFile(options.template,'utf8'));
  if(before.hash!==progress.source.hash)throw new Error('evaluated source fingerprint differs from checkpoint');
  if(template.sourceFingerprint.before!==before.hash||template.sourceFingerprint.after!==before.hash)
    throw new Error('methods template is not from the exact evaluated source');
  const rows=[],rawHash=createHash('sha256');
  const input=createReadStream(`${options.input}.rows.jsonl`);
  input.on('data',chunk=>rawHash.update(chunk));
  const lines=createInterface({input,crlfDelay:Infinity});
  for await(const line of lines)if(line)rows.push(JSON.parse(line));
  const rawSha256=rawHash.digest('hex');
  const jobs=learningJobs(progress.config),byJob=new Map();
  for(const row of rows){
    const job=jobs[row.id];
    if(!job||job.id!==row.id)throw new Error('unknown checkpoint job');
    for(const field of ['protocol','budget','mode','seat','opponent','clusterSeed','durationSec'])
      if(job[field]!==row[field])throw new Error(`checkpoint identity mismatch: ${field}`);
    if(job.protocol==='learning'){
      if(!job.variants.includes(row.variant))throw new Error('unknown learning arm');
      if(!Number.isInteger(row.episode)||row.episode<1||row.episode>job.episodes+job.heldout)
        throw new Error('invalid checkpoint episode');
      const training=row.episode<=job.episodes;
      if(row.phase!==(training?'training':'heldout'))throw new Error('checkpoint phase mismatch');
      const seed=training?job.clusterSeed*10000+row.episode:
        100000000+job.clusterSeed*10000+row.episode-job.episodes;
      if(row.seed!==seed)throw new Error('checkpoint seed mismatch');
    }else if(row.variant!==job.variant||row.seed!==job.seed||row.switching!==job.switching)
      throw new Error('adaptation checkpoint identity mismatch');
    const list=byJob.get(row.id)??[];list.push(row);byJob.set(row.id,list);
  }
  let expectedBouts=0;
  for(const job of jobs){
    const expected=job.protocol==='learning'?(job.episodes+job.heldout)*job.variants.length:1;
    const selected=byJob.get(job.id)??[];
    if(selected.length!==expected)throw new Error(`incomplete job ${job.id}: ${selected.length}/${expected}`);
    if(new Set(selected.map(r=>`${r.variant}/${r.phase??'adaptation'}/${r.episode??0}`)).size!==expected)
      throw new Error(`duplicate rows in job ${job.id}`);
    expectedBouts+=expected;
  }
  rows.sort((a,b)=>a.id-b.id||(a.episode??0)-(b.episode??0));
  const summary=summarizeLearning(rows),after=await sourceFingerprint(options.source);
  if(after.hash!==before.hash)throw new Error('source changed during report regeneration');
  const scriptPath=fileURLToPath(import.meta.url),scriptSha256=hash(await readFile(scriptPath));
  const report={...template,status:progress.config.label==='final'?
    'Full-length synthetic-proxy audit; descriptive evidence':'SMOKE ONLY; not final evidence',
    config:progress.config,expectedBouts,rows,summary,
    sourceFingerprint:{before:before.hash,after:after.hash,files:before.files},
    command:`node arena/learning-audit.mjs ${Object.entries(progress.config).map(([k,v])=>`--${k} ${Array.isArray(v)?v.join(','):v}`).join(' ')}`,
    runtime:{node:process.version,seconds:null,secondsMeaning:'The experiment process duration is in its log; this file was regenerated without rerunning experiments.',
      accumulatedSimulationSeconds:rows.reduce((n,r)=>n+r.simulationWallMs/1000,0),finishedAt:new Date().toISOString()},
    postprocessing:{purpose:'Streaming serialization recovery; complete checkpoint validation and original frozen summary/report functions, no experiment rerun',
      scriptPath,scriptSha256,rawRowsSha256:rawSha256,rawRowsPath:`${options.input}.rows.jsonl`,
      evaluatedCodeSha256:before.hash,methodTemplateSha256:hash(await readFile(options.template)),
      command:`node ${scriptPath} ${Object.entries(options).map(([k,v])=>`--${k} ${v}`).join(' ')}`,
      renderingAdjustment:'HTML curve series ordered to match config legend palette; measurements unchanged',
      seconds:(performance.now()-started)/1000}};
  await mkdir(dirname(options.out),{recursive:true});
  async function* chunks(){
    yield '{\n';
    for(const [key,value] of Object.entries(report))if(key!=='rows')
      yield `  ${JSON.stringify(key)}: ${JSON.stringify(value,null,2).replaceAll('\n','\n  ')},\n`;
    yield '  "rows": [\n';
    for(let i=0;i<rows.length;i++)yield `    ${JSON.stringify(rows[i],null,2).replaceAll('\n','\n    ')}${i<rows.length-1?',':''}\n`;
    yield '  ]\n}\n';
  }
  await pipeline(Readable.from(chunks()),createWriteStream(`${options.out}.json`));
  await writeFile(`${options.out}.md`,learningMarkdown(report));
  const renderReport={...report,summary:{...report.summary,curves:[...report.summary.curves].sort((a,b)=>report.config.variants.indexOf(a.variant)-report.config.variants.indexOf(b.variant))}};
  await writeFile(`${options.out}.html`,learningHtml(renderReport));
  await writeFile(`${options.out}.postprocessing.json`,JSON.stringify(report.postprocessing,null,2));
  console.log(JSON.stringify({status:report.status,bouts:rows.length,source:before.hash,scriptSha256,out:options.out}));
  return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await restoreLearningReport(parseArgs(process.argv.slice(2)));
