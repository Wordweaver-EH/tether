import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createWorld,step,hashWorld,snapshotWorld} from '../../src/sim.js';
import {percept} from '../../src/perception.js';
import {observableCoverReset} from '../../src/agents/cover-calibrated-monitor.mjs';
import {fitMotionModel,CHECKING_PRIORS} from '../../src/mind/calibrated-checking.mjs';
import {createSubject,PROTOCOL,countYokedSchedule} from './experiment.mjs';
import {createOpponent} from './opponent.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const root=resolve(new URL('../..',import.meta.url).pathname);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function sourceManifest(){const files=[];for(const dir of ['src','benchmark/cover-uncertainty-v2']){const walk=d=>{for(const e of readdirSync(resolve(root,d),{withFileTypes:true})){const p=`${d}/${e.name}`;if(e.isDirectory())walk(p);else if(/\.(mjs|js|md|json)$/.test(p)&&!/(source-manifest|PILOT|RESULTS)/.test(p))files.push(p);}};walk(dir);}files.push('test/calibrated-checking.test.mjs','test/maze-transfer.test.mjs','test/cover-monitoring.test.mjs');return Object.fromEntries(files.sort().map(p=>[p,sha(readFileSync(resolve(root,p)))]));}
export function trainingSamples(rows){
 let previous=null,pending=null,lastVisible=null,missingStart=null;const samples=[],missingDurations=[];let resetCensors=0,expiryCensors=0,missingResetCensors=0;
 for(const row of rows.filter(r=>r.record==='decision')){
  const v=row.sensor,t=v.time.elapsedSec,reset=observableCoverReset(previous,v);
  if(reset){resetCensors+=!!pending;missingResetCensors+=missingStart!==null;pending=null;lastVisible=null;missingStart=null;}
  if(pending&&t-pending.time>CHECKING_PRIORS.expirySec+1e-8){pending=null;expiryCensors++;}
  if(v.opponent){
   if(missingStart!==null){missingDurations.push(t-missingStart);missingStart=null;}
   if(pending&&t-pending.time>=CHECKING_PRIORS.dueSec-1e-8){samples.push({position:pending.position,velocity:pending.velocity,horizon:t-pending.time,observed:{...v.opponent.position},issuedAt:pending.time,assessedAt:t});pending=null;}
   if(!pending)pending={time:t,position:{...v.opponent.position},velocity:{...v.opponent.velocity}};
   lastVisible=t;
  }else if(lastVisible!==null&&missingStart===null)missingStart=lastVisible;
  previous=v;
 }
 return {samples,missingDurations,resetCensors,expiryCensors,missingResetCensors,terminalMissingCensored:missingStart!==null};
}
export function runBout({seed,seat,condition,variant,model=null,schedule=null,durationSec=PROTOCOL.durationSec}){
 const wallStart=process.hrtime.bigint(),cpuStart=process.cpuUsage();
 const w=createWorld({gameMode:'COVER_CONTROL'}),i=seat==='P1'?0:1;
 const subject=createSubject({seed,variant,model,schedule}),opponent=createOpponent({seed:seed+101,condition});
 const agents=i===0?[subject,opponent]:[opponent,subject],history=[],rows=[];
 const summary={seed,seat,condition,variant,durationSec,decisions:0,visible:0,hidden:0,visibilityLosses:0,reacquisitions:0,
  proposedPulses:0,deliveredRequests:0,checkAimMatches:0,planning:0,nominalWork:0,knownResets:0,trueResets:0,
  assessments:0,largeAssessments:0,resetCensors:0,expiryCensors:0,ringTicks:[0,0],points:{hit:[0,0],ring:[0,0]},
  phases:{before:{decisions:0,pulses:0},after:{decisions:0,pulses:0}},quietRuns:[],recoveryEpisodes:[],exposure:[]};
 rows.push({record:'header',seed,seat,condition,variant,durationSec,model,schedule,initialWorld:snapshotWorld(w),subjectSettings:subject.settings(),opponentSettings:opponent.settings()});
 let previousVisible=null,quiet=0,recovery=null,lastDiagnostic=null,lastHitTime=null;
 for(let tick=0;tick<durationSec*120;tick++){
  const views=[percept(w,'P1','MODE_B'),percept(w,'P2','MODE_B')];
  history.push({sensor:views[i],enemy:{...w.players[1-i].position},lastHitTime});
  const inputs=agents.map((a,j)=>a.act(views[j]));
  for(let j=0;j<2;j++)summary.ringTicks[j]+=dist(w.players[j].position,w.experiment.OBJECTIVE.position)<=w.experiment.OBJECTIVE.radius;
  if(tick>=18&&(tick-18)%4===0){
   const d=subject.lastDecision(),c=d.cognition,co=c.coordination,cal=co.calibrated??null,old=history[tick-18],sensor=old.sensor;
   assert.deepEqual(d.actualCommand,inputs[i]);assert.ok(c.budget.spent<=192);
   const visible=!!sensor.opponent,pulse=!!cal?.request,delivered=!!co.request?.reacquire;
   summary.decisions++;summary.visible+=visible;summary.hidden+=!visible;
   summary.visibilityLosses+=previousVisible===true&&!visible;summary.reacquisitions+=previousVisible===false&&visible;previousVisible=visible;
   summary.proposedPulses+=pulse;summary.deliveredRequests+=delivered;summary.planning+=c.tier===2;summary.nominalWork+=c.budget.spent;
   summary.knownResets+=!!cal?.knownReset;summary.assessments+=!!cal?.assessment;summary.largeAssessments+=!!cal?.assessment?.large;summary.resetCensors+=cal?.censored==='known-reset';summary.expiryCensors+=cal?.censored==='expired-no-evidence';
   const phase=summary.phases[d.time<30?'before':'after'];phase.decisions++;phase.pulses+=pulse;
   if(pulse){if(quiet)summary.quietRuns.push(quiet/30);quiet=0;}else quiet++;
   if(cal?.assessment?.large&&recovery===null)recovery={start:d.time};
   if(recovery&&(cal?.knownReset||cal?.assessment&&!cal.assessment.large)){summary.recoveryEpisodes.push({...recovery,end:d.time,status:cal.knownReset?'reset-interrupted':'observed-low',seconds:d.time-recovery.start});recovery=null;}
   const attention=co.receivers?.attention?.used?.find(x=>x.item==='opponent');
   const target=attention?.target;
   const angle=(p)=>Math.atan2(p.y-sensor.own.position.y,p.x-sensor.own.position.x);
   if(delivered&&target){const delta=Math.atan2(Math.sin(Math.atan2(d.input.aimY,d.input.aimX)-angle(target)),Math.cos(Math.atan2(d.input.aimY,d.input.aimX)-angle(target)));summary.checkAimMatches+=Math.abs(delta)<1e-6;}
   const od=opponent.diagnostics();
   if(lastDiagnostic?.pathKind!==od.pathKind)summary.exposure.push({time:d.time,kind:od.pathKind,route:od.route,completedCircuits:od.circuitsCompleted??null});lastDiagnostic=od;
   rows.push({record:'decision',tick,time:d.time,serial:d.serial,sensor,calibrated:cal,coordination:co,cover:c.cover,tier:c.tier,budget:c.budget,input:d.input,actualCommand:d.actualCommand,focus:d.focus,opponentDiagnostic:od,evaluationOnly:{sensorEnemy:old.enemy,lastHitTime:old.lastHitTime}});
  }
  const events=step(w,inputs);
  for(const e of events){if(e.type==='HIT'){lastHitTime=w.elapsedSec;summary.points.hit[(e.attacker??e.player??e.owner)==='P1'?0:1]++;}if(e.type==='RESET')summary.trueResets++;if(e.type==='CONTROL_POINT')summary.points.ring[e.player==='P1'?0:1]++;}
  rows.push({record:'step',tick,inputs,events,...(tick%120===119?{worldHash:hashWorld(w)}:{})});
 }
 if(quiet)summary.quietRuns.push(quiet/30);
 if(recovery)summary.recoveryEpisodes.push({...recovery,end:null,status:'right-censored',seconds:durationSec-.15-recovery.start});
 summary.score=w.players.map(p=>p.score);summary.margin=summary.score[i]-summary.score[1-i];summary.opponent=opponent.diagnostics();summary.finalWorldHash=hashWorld(w);summary.cognition=subject.cognition();assert.equal(summary.cognition.learningUpdates,0);
 const cpu=process.cpuUsage(cpuStart);summary.runtime={wallSeconds:Number(process.hrtime.bigint()-wallStart)/1e9,cpuUserMs:cpu.user/1000,cpuSystemMs:cpu.system/1000,scope:'whole headless bout including simulator and telemetry; not isolated controller time'};
 rows.push({record:'summary',...summary,finalWorld:snapshotWorld(w)});return {summary,rows};
}
function saveBout(out,b){const s=b.summary,name=`${s.seed}-${s.seat}-${s.condition}-${s.variant}.jsonl.gz`;const bytes=gzipSync(b.rows.map(JSON.stringify).join('\n')+'\n');writeFileSync(resolve(out,name),bytes);return {...s,logFile:name,logSha256:sha(bytes),logBytes:bytes.length};}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const [mode,path,artifact,checkpoint]=process.argv.slice(2);
 if(!['train','pilot','freeze','score'].includes(mode)||!path)throw Error('Usage: run.mjs train|pilot|freeze|score NEW_OUTPUT_DIRECTORY [MODEL_JSON] [PUBLISHED_CHECKPOINT]. Score requires explicit parent release and published freeze.');
 const out=resolve(path);mkdirSync(out);const before=sourceManifest();
 writeFileSync(resolve(out,'source-before.json'),JSON.stringify({mode,node:process.version,files:before},null,2));
 if(mode==='freeze'){writeFileSync(resolve(out,'source-manifest.json'),JSON.stringify({protocol:PROTOCOL,files:before},null,2));}
 if(mode==='train'){
  const fit=[],calibration=[],missing=[],bouts=[],provenance=[];
  for(const [split,seeds]of [['fit',PROTOCOL.fitSeeds],['calibration',PROTOCOL.calibrationSeeds]])for(const seed of seeds)for(const seat of PROTOCOL.seats){
   const b=runBout({seed,seat,condition:'familiar',variant:'training'}),data=trainingSamples(b.rows);
   (split==='fit'?fit:calibration).push(...data.samples);if(split==='calibration')missing.push(...data.missingDurations);
   bouts.push(saveBout(out,b));provenance.push({split,seed,seat,...data});console.log(`${split} ${seed}/${seat}: ${data.samples.length} observable samples`);
  }
  const model=fitMotionModel(fit,calibration,missing);
  writeFileSync(resolve(out,'model.json'),JSON.stringify(model,null,2));writeFileSync(resolve(out,'training.json'),JSON.stringify({protocol:PROTOCOL,model,bouts,provenance},null,2));
  console.log(JSON.stringify(model));
 }
 if(mode==='pilot'||mode==='score'){
  if(mode==='score'){assert.match(checkpoint??'',/^[a-f0-9]{40}$/,'published checkpoint required');const frozen=JSON.parse(readFileSync(resolve(root,'benchmark/cover-uncertainty-v2/source-manifest.json')));assert.deepEqual(before,frozen.files,'source must match published freeze');assert.equal(sha(readFileSync(artifact)),sha(readFileSync(resolve(root,'benchmark/cover-uncertainty-v2/training-model.json'))),'model must match frozen training artifact');}

  const model=JSON.parse(readFileSync(artifact)),bouts=[];
  for(const seed of (mode==='pilot'?PROTOCOL.pilotSeeds:PROTOCOL.evaluationSeeds))for(const seat of PROTOCOL.seats)for(const condition of PROTOCOL.conditions){
   const full=runBout({seed,seat,condition,variant:'full',model});bouts.push(saveBout(out,full));
   for(const variant of ['monitorOff','scheduled'])bouts.push(saveBout(out,runBout({seed,seat,condition,variant,model,schedule:variant==='scheduled'?countYokedSchedule(full.summary.proposedPulses,full.summary.decisions,seed+177):null})));
   writeFileSync(resolve(out,`${mode}-summary.json`),JSON.stringify({mode,checkpoint:checkpoint??null,protocol:PROTOCOL,model,bouts},null,2));console.log(`${mode} ${seed}/${seat}/${condition}: complete`);
  }
 }
 assert.deepEqual(sourceManifest(),before,'source changed during execution');console.log(`Finished ${mode}; source unchanged`);
}
