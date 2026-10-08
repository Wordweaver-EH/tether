import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createWorld,step,hashWorld,snapshotWorld} from '../../src/sim.js';
import {percept} from '../../src/perception.js';
import {hasLineOfSight} from '../../src/visibility.js';
import {createSubject} from './experiment.mjs';
import {observableCoverReset} from '../../src/agents/cover-calibrated-monitor.mjs';
import {trainingSamples} from './run.mjs';
import {rng,normal} from '../../src/mind/math.mjs';
import {coverMotorTransform} from '../../src/agents/cover-interface.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// One fixed denominator per nominal departure; never credit a later circuit.
export function summarizeOpportunities(decisions,resets,durationSec,condition){
 const opportunities=[];
 for(let clock=7;clock<durationSec;clock+=12){
  const end=Math.min(clock+12,durationSec-.15),window=decisions.filter(d=>d.time>=clock&&d.time<end),before=decisions.findLast(d=>d.time<clock);
  const startCount=before?.opponentDiagnostic.circuitsStarted??0;
  const start=window.find(d=>d.opponentDiagnostic.circuitsStarted>startCount);
  const intervalResets=resets.filter(t=>t>=clock&&t<end);
  const firstReset=start?resets.find(t=>t>start.time&&t<end):null;
  const identity=start?.opponentDiagnostic.circuitsStarted;
  const sameCircuit=start?window.filter(d=>d.time>=start.time&&d.opponentDiagnostic.circuitsStarted===identity&&(firstReset==null||d.time<firstReset)):[];
  const complete=sameCircuit.find(d=>d.opponentDiagnostic.circuitsCompleted>start.opponentDiagnostic.circuitsCompleted);
  const circuitRows=sameCircuit.filter(d=>d.opponentDiagnostic.pathKind==='circuit');
  const firstHidden=circuitRows.find(d=>!d.sensor.opponent&&d.evaluatorOccluded===true);
  const returned=firstHidden?sameCircuit.find(d=>d.time>firstHidden.time&&d.sensor.opponent):null;
  const lowAfterReturn=returned?sameCircuit.find(d=>d.time>=returned.time&&d.calibrated?.assessment&&!d.calibrated.assessment.large):null;
  let routineAt=null;
  if(complete&&lowAfterReturn)for(const candidate of sameCircuit.filter(d=>d.time>=Math.max(lowAfterReturn.time,complete.time)&&d.time+1<=Math.min(end,sameCircuit.at(-1)?.time??-Infinity))){
   const span=sameCircuit.filter(d=>d.time>=candidate.time&&d.time<candidate.time+1);
   if(span.length>=29&&span.every(d=>!d.coordination.request?.reacquire)&&span.some(d=>d.focus==='Objective')){routineAt=candidate.time+1;break;}
  }
  const terminal=end>=durationSec-.15;
  opportunities.push({clock,end,circuitIdentity:identity??null,switched:condition==='switch'&&clock>=30,startedAt:start?.time??null,
   route:start?.opponentDiagnostic.route??null,completedAt:complete?.time??null,
   status:complete?'returned':!start?before?.opponentDiagnostic.pathKind==='circuit'?'prior-circuit-ongoing':'not-started':firstReset!=null?'reset-interrupted':terminal?'terminal-censored':'not-returned-by-horizon',
   actualResets:intervalResets,firstResetAfterStart:firstReset??null,hiddenCircuitDecisions:circuitRows.filter(d=>!d.sensor.opponent).length,coverOccludedCircuitDecisions:circuitRows.filter(d=>d.evaluatorOccluded===true).length,
   firstHiddenAt:firstHidden?.time??null,firstObservedReturnAt:returned?.time??null,
   observedLowAfterReturnAt:lowAfterReturn?.time??null,routineResumedAt:routineAt,recoveredByHorizon:!!complete&&!!lowAfterReturn,
   observedReturnAfterInterruption:firstReset!=null&&window.some(d=>d.time>=firstReset&&d.sensor.opponent),
   pulseCount:window.filter(d=>d.calibrated?.request).length,
   ringOccupancyFraction:window.filter(d=>distance(d.sensor.own.position,{x:0,y:0})<=1.05).length/Math.max(1,window.length)});
 }
 return opportunities;
}
export function auditRows(rows){
 const h={...rows[0],durationSec:rows[0].durationSec??rows.at(-1).durationSec},w=createWorld({gameMode:'COVER_CONTROL'}),history=[],decisions=rows.filter(r=>r.record==='decision').map(d=>({...d,evaluatorOccluded:!hasLineOfSight(d.sensor.own.position,d.evaluationOnly.sensorEnemy,d.sensor.arena.obstacles)}));
 const resets=[],steps=rows.filter(r=>r.record==='step');
 assert.deepEqual(snapshotWorld(w),h.initialWorld);
 for(const row of steps){history.push(percept(w,h.seat,'MODE_B'));assert.deepEqual(step(w,row.inputs),row.events);if(row.worldHash)assert.equal(hashWorld(w),row.worldHash);if(row.events.some(e=>e.type==='RESET'))resets.push(w.elapsedSec);}
 assert.equal(hashWorld(w),rows.at(-1).finalWorldHash);
 for(const d of decisions)assert.deepEqual(d.sensor,history[d.tick-18]);
 const training=trainingSamples(rows);
 const straddles=(a,b)=>resets.filter(t=>t>a+1e-8&&t<=b+1e-8);
 const trainingContamination=training.samples.filter(s=>straddles(s.issuedAt,s.assessedAt).length);
 const assessments=decisions.filter(d=>d.calibrated?.assessment).map(d=>d.calibrated.assessment);
 const assessmentContamination=assessments.filter(a=>straddles(a.issuedAt,a.assessmentTime).length);
 const missingEpisodes=[];let missing=null,previous=null;
 for(const d of decisions){const seen=!!d.sensor.opponent,knownReset=observableCoverReset(previous?.sensor,d.sensor);if(!seen&&previous?.sensor.opponent)missing={start:previous.time};
  if(missing&&(knownReset||seen)){missingEpisodes.push({...missing,end:d.time,seconds:d.time-missing.start,status:knownReset?'known-reset-censored':'observed-return'});missing=null;}previous=d;}
 if(missing)missingEpisodes.push({...missing,end:null,seconds:decisions.at(-1).time-missing.start,status:'terminal-censored'});
 const opportunities=summarizeOpportunities(decisions,resets,h.durationSec,h.condition);
 const checks=decisions.filter(d=>d.coordination.request?.reacquire).map(d=>{
  const later=decisions.filter(e=>e.time>d.time&&e.time<=d.time+1),first=later.find(e=>e.sensor.opponent),reset=resets.some(t=>t>d.time&&t<=d.time+1);
  const nextAssessment=later.find(e=>e.calibrated?.assessment);
  return {time:d.time,reason:d.coordination.request.reason,initiallyVisible:!!d.sensor.opponent,
   reacquiredWithin1Sec:!d.sensor.opponent&&!!first&&!reset,
   resetInterrupted:reset,firstObservationAt:first?.time??null,
   nextAssessmentError:nextAssessment?.calibrated.assessment.error??null,
   status:reset?'reset-interrupted':d.sensor.opponent?'already-visible':first?'new-observation':later.length<30?'terminal-censored':'no-new-observation'};
 });
 let commonPercept=null;
 if(h.variant==='full'){
  const variants=['full','monitorOff'],agents=variants.map(variant=>createSubject({seed:h.seed,variant,model:h.model,embodied:false}));
  const random=rng((h.seed^(h.seat==='P1'?0x53c421:0x1f713a))>>>0),angles=[0,0];
  const differences=[];let fullReproduced=0;
  for(const d of decisions){const sample=normal(random),commands=agents.map((a,j)=>{const input=a.act(structuredClone(d.sensor),1/30);if(j===0){assert.deepEqual(input,d.input);fullReproduced++;}const tr=coverMotorTransform(input,angles[j],sample);angles[j]=tr.previousAngle;a.commitCommand(tr.command,d.sensor,d.time+.15);return {input,actual:tr.command};});
   const a=commands[0].actual,b=commands[1].actual;
   if(JSON.stringify(a)!==JSON.stringify(b))differences.push({time:d.time,monitorPulse:!!d.coordination.request?.reacquire,gaze:a.aimX!==b.aimX||a.aimY!==b.aimY,movement:a.moveX!==b.moveX||a.moveY!==b.moveY,weapon:a.throw!==b.throw||a.recall!==b.recall});
  }
  commonPercept={fullReproduced,differingDecisions:differences.length,gaze:differences.filter(d=>d.gaze).length,movement:differences.filter(d=>d.movement).length,weapon:differences.filter(d=>d.weapon).length,firstDifference:differences[0]??null,differences};
 }
 const saved=rows.at(-1),subjectIndex=h.seat==='P1'?0:1;
 return {seed:h.seed,seat:h.seat,condition:h.condition,variant:h.variant,gameplay:{score:saved.score,margin:saved.margin,points:saved.points,subjectRingSeconds:saved.ringTicks[subjectIndex]/120,opponentRingSeconds:saved.ringTicks[1-subjectIndex]/120,throws:['P1','P2'].map(id=>steps.flatMap(s=>s.events).filter(e=>e.type==='THROW'&&e.player===id).length)},dose:{proposed:saved.proposedPulses,delivered:saved.deliveredRequests,gazeMatched:saved.checkAimMatches,plannerCalls:saved.planning,nominalUnits:saved.nominalWork,checkerCalls:decisions.filter(d=>d.calibrated).length,runtime:saved.runtime??null},steps:steps.length,decisions:decisions.length,replayed:true,
  actualResets:resets.length,inferredResetDecisions:decisions.filter(d=>d.calibrated?.knownReset).length,
  trainingSamples:training.samples.length,trainingResetStraddles:trainingContamination,
  assessments:assessments.length,assessmentResetStraddles:assessmentContamination,
  horizonBins:[['.3-.4',.299999,.4],['.4-.7',.4,.7],['.7-1',.7,1.000001]].map(([name,lo,hi])=>{const a=assessments.filter(x=>x.horizon>=lo&&x.horizon<hi);return {name,count:a.length,withinThreshold:a.filter(x=>!x.large).length};}),
  missingEpisodes,opportunities,checks,commonPercept};
}
export function pairedComparisons(reports){
 const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
 const metric=r=>{const post=r.opportunities.filter(o=>o.clock>=30);return {recovery:post.filter(o=>o.recoveredByHorizon).length/post.length,routine:post.filter(o=>o.routineResumedAt!==null).length/post.length,margin:r.gameplay.margin,ringSeconds:r.gameplay.subjectRingSeconds};};
 const pairs=[];
 for(const full of reports.filter(r=>r.variant==='full'))for(const variant of ['monitorOff','scheduled']){
  const other=reports.find(r=>r.seed===full.seed&&r.seat===full.seat&&r.condition===full.condition&&r.variant===variant);if(!other)continue;
  const a=metric(full),b=metric(other);pairs.push({seed:full.seed,seat:full.seat,condition:full.condition,contrast:`full-${variant}`,differences:Object.fromEntries(Object.keys(a).map(k=>[k,a[k]-b[k]])),requestCounts:[full.dose.proposed,other.dose.proposed],deliveredCounts:[full.dose.delivered,other.dose.delivered],deliveryMatched:variant==='scheduled'?Math.abs(full.dose.delivered-other.dose.delivered)<=Math.max(1,.1*full.dose.delivered):null});
 }
 const seedClusters=[];for(const contrast of ['full-monitorOff','full-scheduled'])for(const condition of ['familiar','switch'])for(const seed of [...new Set(pairs.map(p=>p.seed))]){
  const ps=pairs.filter(p=>p.contrast===contrast&&p.condition===condition&&p.seed===seed);if(ps.length)seedClusters.push({seed,contrast,condition,seats:ps.length,meanDifferences:Object.fromEntries(['recovery','routine','margin','ringSeconds'].map(k=>[k,mean(ps.map(p=>p.differences[k]))]))});
 }
 const effects=[];for(const contrast of ['full-monitorOff','full-scheduled'])for(const condition of ['familiar','switch']){const cs=seedClusters.filter(c=>c.contrast===contrast&&c.condition===condition);if(cs.length)effects.push({contrast,condition,independentSeeds:cs.length,meanDifferences:Object.fromEntries(['recovery','routine','margin','ringSeconds'].map(k=>[k,mean(cs.map(c=>c.meanDifferences[k]))]))});}
 const interactions=[];for(const contrast of ['full-monitorOff','full-scheduled']){const a=effects.find(e=>e.contrast===contrast&&e.condition==='switch'),b=effects.find(e=>e.contrast===contrast&&e.condition==='familiar');if(a&&b)interactions.push({contrast,switchMinusFamiliar:Object.fromEntries(Object.keys(a.meanDifferences).map(k=>[k,a.meanDifferences[k]-b.meanDifferences[k]]))});}
 return {scope:'descriptive paired seed-cluster effects; pilot results are not held-out performance',pairs,seedClusters,effects,interactions};
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const [path,out]=process.argv.slice(2);if(!path||!out)throw Error('Usage: audit.mjs EVIDENCE_DIRECTORY NEW_REPORT_JSON');
 const reports=[];for(const name of readdirSync(path).filter(n=>n.endsWith('.jsonl.gz')).sort()){const bytes=readFileSync(resolve(path,name)),rows=gunzipSync(bytes).toString().trim().split('\n').map(JSON.parse);const r=auditRows(rows);reports.push({...r,file:name,sha256:sha(bytes)});console.log(`${name}: replay and lineage audit passed`);}
 writeFileSync(out,JSON.stringify({status:'complete',reports,comparisons:pairedComparisons(reports)},null,2));
}
