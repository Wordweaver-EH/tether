import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createWorld,step,hashWorld,snapshotWorld} from '../../src/sim.js';
import {percept} from '../../src/perception.js';
import {createValueAgent,VALUE_FEATURES,VALUE_EMBODIMENT} from '../../src/agents/cover-checking-value.mjs';
import {fitCheckingValueModel,predictCheckingValues} from '../../src/mind/checking-value.mjs';
import {createValueOpponent,OPPONENT_SPLITS} from './opponents.mjs';
import {PROTOCOL,selector,countMatchedActions} from './experiment.mjs';
const root=resolve(new URL('../..',import.meta.url).pathname),sha=x=>createHash('sha256').update(x).digest('hex');
export function sourceManifest(){const paths=[];for(const dir of ['src','benchmark/cover-checking-value-v1']){const walk=d=>{for(const e of readdirSync(resolve(root,d),{withFileTypes:true})){const p=`${d}/${e.name}`;if(e.isDirectory())continue;if(/\.(mjs|js|md)$/.test(p))paths.push(p);} };if(dir==='src'){const walkAll=d=>{for(const e of readdirSync(resolve(root,d),{withFileTypes:true})){const p=`${d}/${e.name}`;if(e.isDirectory())walkAll(p);else if(/\.(mjs|js)$/.test(p))paths.push(p);}};walkAll(dir);}else walk(dir);}for(const p of ['test/checking-value-core.test.mjs','test/checking-value-adapter.test.mjs','benchmark/cover-uncertainty-v2/training-model.json'])paths.push(p);return Object.fromEntries(paths.sort().map(p=>[p,sha(readFileSync(resolve(root,p)))]));}
export function runBout({seed,seat,family,variant,model=null,shuffledModel=null,schedule=null,monitorModel=null,windows=PROTOCOL.windows}){
 const wall=process.hrtime.bigint(),cpu=process.cpuUsage(),w=createWorld({gameMode:'COVER_CONTROL'}),i=seat==='P1'?0:1;
 const subject=createValueAgent({seed,variant,selectAction:selector({variant,seed:seed+(i*179),model,shuffledModel,schedule}),monitorModel,windows});
 const opponent=createValueOpponent({seed:seed+101,family}),agents=i===0?[subject,opponent]:[opponent,subject],rows=[{record:'header',seed,seat,family,variant,initialWorld:snapshotWorld(w),settings:subject.settings(),schedule,model,shuffledModel}],points={hit:[0,0],ring:[0,0]};
 let controllerNs=0n;const sensorHistory=[];
 const ticks=windows*VALUE_EMBODIMENT.windowTicks*4+19;
 for(let tick=0;tick<ticks;tick++){
  const views=[percept(w,'P1','MODE_B'),percept(w,'P2','MODE_B')],inputs=[];sensorHistory.push(views[i]);
  for(let j=0;j<2;j++){const start=process.hrtime.bigint();inputs.push(agents[j].act(views[j]));if(j===i)controllerNs+=process.hrtime.bigint()-start;}
  if(tick>=18&&(tick-18)%4===0)rows.push({record:'decision',appliedTick:tick,appliedTime:w.elapsedSec,sensor:sensorHistory[tick-18],...subject.lastDecision(),actualCommand:inputs[i]});
  const events=step(w,inputs);for(const e of events){if(e.type==='HIT')points.hit[e.attacker==='P1'?0:1]++;if(e.type==='CONTROL_POINT')points.ring[e.player==='P1'?0:1]++;}
  rows.push({record:'step',tick,inputs,events,...(tick%120===119?{worldHash:hashWorld(w)}:{})});
 }
 const completed=subject.completed();assert.equal(completed.length,windows);
 for(const row of completed){assert.ok(Math.abs(row.endTime-row.startTime-PROTOCOL.windowSeconds)<1e-7);assert.equal(row.reward,row.taskReward-VALUE_EMBODIMENT.computePrice*row.extraWork);}
 assert.deepEqual(w.players.map(p=>p.score),points.hit.map((x,j)=>x+points.ring[j]));
 const usage=process.cpuUsage(cpu),counts=Object.fromEntries(['continue','check','reconsider'].map(a=>[a,completed.filter(r=>r.action===a).length]));
 const summary={seed,seat,family,variant,windows:completed.length,counts,score:w.players.map(p=>p.score),points,taskReward:completed.reduce((s,r)=>s+r.taskReward,0),valueReward:completed.reduce((s,r)=>s+r.reward,0),extraWork:completed.reduce((s,r)=>s+r.extraWork,0),embargoSeconds:completed.reduce((s,r)=>s+r.embargoTicks/30,0),reconsiderCompleted:completed.filter(r=>r.reconsiderCompleted).length,planChanged:completed.filter(r=>r.planChanged).length,commandChangedTicks:completed.reduce((s,r)=>s+r.commandChangedTicks,0),acquisitions:completed.reduce((s,r)=>s+r.acquisitions,0),finalWorldHash:hashWorld(w),runtime:{wallSeconds:Number(process.hrtime.bigint()-wall)/1e9,cpuUserMs:usage.user/1000,cpuSystemMs:usage.system/1000,subjectInterfaceWallMs:Number(controllerNs)/1e6,scope:'subject interface includes sensor queue, controller and telemetry; not isolated planner time'}};
 rows.push(...completed.map(r=>({record:'training-window',...r})),{record:'summary',...summary,finalWorld:snapshotWorld(w)});return {summary,windows:completed,rows};
}
function saveBout(out,b){const s=b.summary,name=`${s.seed}-${s.seat}-${s.family}-${s.variant}.jsonl.gz`,bytes=gzipSync(b.rows.map(JSON.stringify).join('\n')+'\n');writeFileSync(resolve(out,name),bytes);return {...s,logFile:name,logSha256:sha(bytes),logBytes:bytes.length};}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const [mode,path,artifact,frozenPath,release]=process.argv.slice(2);if(!['train','pilot','freeze','score'].includes(mode)||!path)throw Error('Usage run.mjs train|pilot|freeze NEW_OUTPUT_DIR [TRAINING_BUNDLE]; score NEW_OUTPUT_DIR TRAINING_BUNDLE FROZEN_MANIFEST --parent-release=VERIFIED_RELEASE_REFERENCE.');
 const out=resolve(path);mkdirSync(out);const before=sourceManifest();writeFileSync(resolve(out,'source-before.json'),JSON.stringify({mode,node:process.version,files:before},null,2));
 if(mode==='train'){
  const data=[],bouts=[];for(const seed of PROTOCOL.trainSeeds)for(const seat of PROTOCOL.seats)for(const family of OPPONENT_SPLITS.train){const b=runBout({seed,seat,family,variant:'training'});const boutId=`${seed}/${seat}/${family}`;data.push(...b.windows.map(row=>({...row,boutId,seed,seat,family})));bouts.push(saveBout(out,b));writeFileSync(resolve(out,'progress.json'),JSON.stringify({bouts},null,2));console.log(`${boutId}: ${b.windows.length} windows; ${JSON.stringify(b.summary.counts)}`);}
  const options={ridge:PROTOCOL.ridge,featureCount:VALUE_FEATURES.length},model=fitCheckingValueModel(data,options),shuffledModel=fitCheckingValueModel(data,{...options,shuffleRewards:true,seed:PROTOCOL.shuffleSeed});
  writeFileSync(resolve(out,'training-bundle.json'),JSON.stringify({protocol:PROTOCOL,opponentSplits:OPPONENT_SPLITS,features:VALUE_FEATURES,model,shuffledModel,bouts,rows:data},null,2));
 }
 if(mode==='pilot'||mode==='score'){
  if(mode==='score'){assert.ok(release?.startsWith('--parent-release=')&&release.length>17,'explicit parent release reference required');const frozen=JSON.parse(readFileSync(frozenPath));assert.deepEqual(before,frozen.files,'source differs from frozen protocol');assert.equal(sha(readFileSync(artifact)),frozen.trainingBundleSha256,'training artifact differs from freeze');}
  const bundle=JSON.parse(readFileSync(artifact)),monitorModel=JSON.parse(readFileSync(resolve(root,'benchmark/cover-uncertainty-v2/training-model.json'))),bouts=[];
  for(const seed of (mode==='pilot'?PROTOCOL.developmentSeeds:PROTOCOL.evaluationSeeds))for(const seat of PROTOCOL.seats)for(const family of (mode==='pilot'?OPPONENT_SPLITS.development:OPPONENT_SPLITS.evaluation)){
   const learned=runBout({seed,seat,family,variant:'learned',...bundle,monitorModel});bouts.push(saveBout(out,learned));const schedule=countMatchedActions(learned.windows.map(r=>r.action),seed+771);
   for(const variant of PROTOCOL.variants.filter(v=>v!=='learned'))bouts.push(saveBout(out,runBout({seed,seat,family,variant,model:bundle.model,shuffledModel:bundle.shuffledModel,monitorModel,schedule})));
   writeFileSync(resolve(out,`${mode}-summary.json`),JSON.stringify({mode,release:release??null,protocol:PROTOCOL,bouts},null,2));console.log(`${mode} ${seed}/${seat}/${family}: complete`);
  }
  if(mode==='pilot'){
  // Learning curve uses fixed training bout prefixes, evaluated prediction MSE
  // only on untouched development random-policy windows, not pilot score fits.
  const validation=[];for(const seed of PROTOCOL.developmentSeeds)for(const seat of PROTOCOL.seats){const b=runBout({seed,seat,family:'weave',variant:'training'});validation.push(...b.windows);bouts.push(saveBout(out,b));}
  const ids=[...new Set(bundle.rows.map(r=>r.boutId))],curves=[];for(const count of [12,24,48]){const rows=bundle.rows.filter(r=>ids.slice(0,count).includes(r.boutId)),model=fitCheckingValueModel(rows,{ridge:PROTOCOL.ridge,featureCount:VALUE_FEATURES.length});curves.push({trainingBouts:count,trainingRows:rows.length,validationRows:validation.length,mse:validation.reduce((s,r)=>s+(predictCheckingValues(model,r.features)[r.action]-r.reward)**2,0)/validation.length});}
  writeFileSync(resolve(out,'pilot-summary.json'),JSON.stringify({protocol:PROTOCOL,bouts,learningCurves:curves},null,2));
  }
 }
 if(mode==='freeze')writeFileSync(resolve(out,'source-manifest.json'),JSON.stringify({protocol:PROTOCOL,files:before,trainingBundleSha256:artifact?sha(readFileSync(artifact)):null},null,2));
 assert.deepEqual(sourceManifest(),before);console.log(`Finished ${mode}; source unchanged.`);
}
