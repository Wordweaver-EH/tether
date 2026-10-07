import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createWorld,step,hashWorld,snapshotWorld} from '../../src/sim.js';
import {percept} from '../../src/perception.js';
import {createSubject,PROTOCOL} from './experiment.mjs';
import {createSwitchingCoverOpponent} from './opponent.mjs';
const root=resolve(new URL('../..',import.meta.url).pathname),sha=b=>createHash('sha256').update(b).digest('hex');
export function sourceManifest(){
 const files=[];function walk(dir){for(const e of readdirSync(resolve(root,dir),{withFileTypes:true})){const p=`${dir}/${e.name}`;if(e.isDirectory())walk(p);else if(/\.(mjs|js|md)$/.test(p)&&!/(RESULTS|summary)/.test(p))files.push(p);}}
 walk('src');walk('benchmark/cover-uncertainty-v1');for(const p of ['test/cover-monitoring.test.mjs','test/cover-uncertainty-opponent.test.mjs','replay/app.mjs','test/cover-integrated-client.test.mjs'])files.push(p);
 return Object.fromEntries(files.sort().map(p=>[p,sha(readFileSync(resolve(root,p)))]));
}
const blank=()=>({decisions:0,visible:0,hidden:0,staleSamples:0,staleErrorSum:0,staleLarge:0,commandErrorSum:0,packets:0,forecasts:0,assessments:0,censoredForecasts:0,largeAssessments:0,assessmentErrorSum:0,assessmentsNearReset:0,largeAssessmentsNearReset:0,highErrorDecisions:0,requests:0,fixedRequests:0,checkAimMatches:0,checksAwayFromVisible:0,checksOutsideRing:0,planning:0,completed:0,unfinished:0,budget:0,visibilityLosses:0,reacquisitions:0});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),align=(input,from,to)=>{const x=to.x-from.x,y=to.y-from.y;return (input.aimX*x+input.aimY*y)/(Math.hypot(input.aimX,input.aimY)*Math.hypot(x,y)||1);};
export function runBout({seed,seat,condition,variant,durationSec=PROTOCOL.durationSec}){
 const w=createWorld({gameMode:'COVER_CONTROL'}),i=seat==='P1'?0:1;
 const subject=createSubject({seed,variant}),opponent=createSwitchingCoverOpponent({seed:seed+101,condition});
 const agents=i===0?[subject,opponent]:[opponent,subject],history=[],rows=[];
 const r={seed,seat,condition,variant,durationSec,score:[0,0],points:{hit:[0,0],ring:[0,0]},ringTicks:[0,0],contestedTicks:0,throws:[0,0],recalls:[0,0],phases:{before:blank(),after:blank()},recoveries:[],focus:{},maxBudget:0};
 rows.push({record:'header',seed,seat,condition,variant,durationSec,initialWorld:snapshotWorld(w),subjectSettings:subject.settings(),opponentSettings:opponent.settings()});
 let previousVisible=null,recoveryStart=null,lastSerial=0,lastHitTime=null;const inputsHash=createHash('sha256');
 for(let tick=0;tick<durationSec*120;tick++){
  const views=[percept(w,'P1','MODE_B'),percept(w,'P2','MODE_B')];
  history.push({sensor:views[i],enemy:{...w.players[1-i].position},lastHitTime});
  const inputs=agents.map((a,j)=>a.act(views[j]));inputsHash.update(JSON.stringify(inputs));
  for(let j=0;j<2;j++)r.ringTicks[j]+=dist(w.players[j].position,w.experiment.OBJECTIVE.position)<=w.experiment.OBJECTIVE.radius;
  r.contestedTicks+=w.objective.contested;
  if(tick>=18&&(tick-18)%4===0){
   const d=subject.lastDecision(),c=d.cognition,co=c.coordination,cv=c.cover,old=history[tick-18],sensor=old.sensor;
   assert.equal(d.serial,lastSerial+1);lastSerial=d.serial;assert.deepEqual(d.actualCommand,inputs[i]);assert.ok(Math.abs(d.commandTime-d.time-.15)<1e-8);assert.ok(c.budget.spent<=192);
   const q=r.phases[d.time<PROTOCOL.switchSec?'before':'after'],seen=!!sensor.opponent;q.decisions++;q.visible+=seen;q.hidden+=!seen;
   if(previousVisible===true&&!seen)q.visibilityLosses++;if(previousVisible===false&&seen)q.reacquisitions++;previousVisible=seen;
   const b=cv.evidence.opponentHypothesis;
   if(!seen&&b.stalenessSec!==null){q.staleSamples++;const e=dist(b.mean,old.enemy);q.staleErrorSum+=e;q.staleLarge+=e>.5;q.commandErrorSum+=dist(b.mean,w.players[1-i].position);}
   q.packets+=!!co.packet;q.forecasts+=!!co.forecastIssue?.issued;q.assessments+=co.assessment?.status==='assessed';q.censoredForecasts+=co.assessment?.status==='censored';
   if(co.assessment?.status==='assessed'){q.largeAssessments+=co.assessment.discrepancy>.5;q.assessmentErrorSum+=co.assessment.discrepancy;const nearReset=old.lastHitTime!==null&&d.time-old.lastHitTime<=1;q.assessmentsNearReset+=nearReset;q.largeAssessmentsNearReset+=nearReset&&co.assessment.discrepancy>.5;}
   const high=co.monitor?.category==='high-error';q.highErrorDecisions+=high;
   if(high&&recoveryStart===null)recoveryStart=d.time;
   if(recoveryStart!==null&&co.assessment?.status==='assessed'&&co.monitor.category==='low-error'){r.recoveries.push({start:recoveryStart,end:d.time,seconds:d.time-recoveryStart,censored:false});recoveryStart=null;}
   const request=!!co.request?.reacquire;q.requests+=request;q.fixedRequests+=request&&co.request.reason==='fixed-monitor-schedule';
   const target=co.receivers?.attention?.used?.find(s=>s.item==='opponent')?.target;
   const checking=request&&target&&align(d.input,sensor.own.position,target)>1-1e-8;
   q.checkAimMatches+=!!checking;q.checksAwayFromVisible+=!!checking&&seen&&align(d.input,sensor.own.position,sensor.opponent.position)<Math.cos(.18);
   q.checksOutsideRing+=!!checking&&dist(w.players[i].position,w.experiment.OBJECTIVE.position)>w.experiment.OBJECTIVE.radius;
   q.planning+=c.tier===2;q.completed+=cv.planning.requested&&cv.planning.status==='completed';q.unfinished+=cv.planning.requested&&cv.planning.status==='unfinished';q.budget+=c.budget.spent;r.maxBudget=Math.max(r.maxBudget,c.budget.spent);
   const focus=c.tier===0?'Reflex':d.focus??'None';r.focus[focus]=(r.focus[focus]??0)+1;
   rows.push({record:'decision',tick,serial:d.serial,time:d.time,commandTime:d.commandTime,sensor,evaluationOnly:{secondsSinceHit:old.lastHitTime===null?null:d.time-old.lastHitTime,sensorEnemy:old.enemy,commandEnemy:{...w.players[1-i].position},own:{...w.players[i].position}},focus:d.focus,input:d.input,actualCommand:d.actualCommand,budget:c.budget,tier:c.tier,cover:cv,coordination:co,planStatus:c.planStatus,monitorForced:c.monitorForced,selectedBranch:c.selectedBranch,opponentDiagnostic:opponent.diagnostics?.()??null});
  }
  const events=step(w,inputs);
  for(const e of events){if(e.type==='HIT')lastHitTime=w.elapsedSec;if(e.type==='CONTROL_POINT')r.points.ring[e.player==='P1'?0:1]++;if(e.type==='HIT')r.points.hit[(e.attacker??e.player??e.owner)==='P1'?0:1]++;if(e.type==='THROW')r.throws[e.player==='P1'?0:1]++;if(e.type==='RECALL_START')r.recalls[e.owner==='P1'?0:1]++;}
  rows.push({record:'step',tick,inputs,events,...(tick%120===119?{worldHash:hashWorld(w)}:{})});
 }
 if(recoveryStart!==null)r.recoveries.push({start:recoveryStart,end:null,seconds:durationSec-.15-recoveryStart,censored:true});
 r.score=w.players.map(p=>p.score);r.subjectScore=r.score[i];r.opponentScore=r.score[1-i];r.margin=r.subjectScore-r.opponentScore;r.inputSha256=inputsHash.digest('hex');r.finalWorldHash=hashWorld(w);r.cognition=subject.cognition();
 assert.equal(r.cognition.learningUpdates,0);assert.equal(r.cognition.automaticDecisions,0);for(let j=0;j<2;j++)assert.equal(r.score[j],r.points.hit[j]+r.points.ring[j]);
 rows.push({record:'summary',...r,finalWorld:snapshotWorld(w)});return {summary:r,rows};
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const [mode,out,checkpoint]=process.argv.slice(2);if(!['freeze','pilot','score'].includes(mode)||!out)throw Error('Usage: run.mjs freeze|pilot|score NEW_OUTPUT_DIRECTORY [CHECKPOINT_COMMIT]');
 const output=resolve(out);mkdirSync(output);const current=sourceManifest();
 if(mode==='freeze'){writeFileSync(resolve(output,'source-manifest.json'),JSON.stringify({protocol:PROTOCOL,files:current},null,2)+'\n');console.log(output);}
 else{
  const frozen=JSON.parse(readFileSync(resolve(root,'benchmark/cover-uncertainty-v1/source-manifest.json')));assert.deepEqual(current,frozen.files,'source must match freeze');
  if(mode==='score'&&!/^[a-f0-9]{40}$/.test(checkpoint??''))throw Error('Score mode requires published checkpoint commit');
  writeFileSync(resolve(output,'source-before-run.json'),JSON.stringify({mode,checkpoint:checkpoint??null,...frozen,node:process.version},null,2)+'\n');
  const bouts=[],seeds=mode==='pilot'?[PROTOCOL.pilotSeed]:PROTOCOL.seeds;
  for(const seed of seeds)for(const seat of PROTOCOL.seats)for(const condition of PROTOCOL.conditions)for(const variant of PROTOCOL.variants){
   const {summary:r,rows}=runBout({seed,seat,condition,variant,durationSec:mode==='pilot'?8:PROTOCOL.durationSec});
   const name=`${seed}-${seat}-${condition}-${variant}.jsonl.gz`,bytes=gzipSync(rows.map(JSON.stringify).join('\n')+'\n');writeFileSync(resolve(output,name),bytes);r.logFile=name;r.logSha256=sha(bytes);r.logBytes=bytes.length;bouts.push(r);
   writeFileSync(resolve(output,'summary.json'),JSON.stringify({mode,checkpoint,protocol:PROTOCOL,bouts},null,2)+'\n');
   console.log(mode==='pilot'?`${name}: correctness complete`:`${name}: ${r.subjectScore}:${r.opponentScore}`);
  }
  assert.deepEqual(sourceManifest(),current,'source changed during run');console.log(`Finished ${bouts.length} bouts; source unchanged`);
 }
}
