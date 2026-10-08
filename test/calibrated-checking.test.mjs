import test from 'node:test';
import assert from 'node:assert/strict';
import {createCalibratedChecker,fitMotionModel,predictMotion,CHECKING_PRIORS} from '../src/mind/calibrated-checking.mjs';
import {observableCoverReset,createCoverCalibratedMonitor} from '../src/agents/cover-calibrated-monitor.mjs';
import {countYokedSchedule,createSubject} from '../benchmark/cover-uncertainty-v2/experiment.mjs';
import {createWorld,step} from '../src/sim.js';
import {percept} from '../src/perception.js';
const model={version:1,velocityGain:1,residualRateThreshold:.5,missingAfterSec:.5};
const obs=(time,x=0,v=0)=>({time,position:{x,y:0},velocity:{x:v,y:0}});
test('fits displacement coefficient and independent calibration residual rate',()=>{
 const samples=Array.from({length:30},()=>({position:{x:0,y:0},velocity:{x:2,y:0},horizon:.3,observed:{x:.3,y:0}}));
 const m=fitMotionModel(samples,samples,[.7,.9]);assert.equal(m.velocityGain,.5);assert.equal(m.residualRateThreshold,.05);assert.equal(m.fitSamples,30);assert.equal(m.missingAfterSec,.9);
});
test('insufficient training never silently creates calibrated model',()=>assert.throws(()=>fitMotionModel([],[],[])));
test('due boundary assesses fixed frozen forecast',()=>{const c=createCalibratedChecker(model);c.update({time:0,observation:obs(0,0,2)});const r=c.update({time:.3,observation:obs(.3,.6)});assert.equal(r.assessment.large,false);assert.equal(r.assessment.error,0);});
test('expiry boundary permits assessment, later censors',()=>{
 for(const t of [1,1.001]){const c=createCalibratedChecker(model);c.update({time:0,observation:obs(0)});const r=c.update({time:t,observation:obs(t,1)});assert.equal(!!r.assessment,t===1);assert.equal(r.censored,t===1?null:'expired-no-evidence');}
});
test('known reset censors lineage and never attributes reset jump to model',()=>{const c=createCalibratedChecker(model);c.update({time:0,observation:obs(0)});const r=c.update({time:.3,observation:obs(.3,8),knownReset:true});assert.equal(r.assessment,null);assert.equal(r.censored,'known-reset');assert.equal(r.pulse,false);assert.equal(r.pending.position.x,8);});
test('reset without observation discards all stale evidence',()=>{const c=createCalibratedChecker(model);c.update({time:0,observation:obs(0)});c.update({time:.2,knownReset:true});const r=c.update({time:2});assert.equal(r.target,null);assert.equal(r.pulse,false);assert.equal(r.category,'unknown');});
test('persistent absent evidence has bounded two-pulse lifecycle',()=>{const c=createCalibratedChecker(model);c.update({time:0,observation:obs(0)});let n=0;for(let i=1;i<=300;i++)n+=c.update({time:i/30}).pulse;assert.equal(n,CHECKING_PRIORS.maxPulsesPerAbsence);assert.equal(c.state().checking,false);assert.equal(c.state().category,'unresolved');});
test('large assessment emits pulse; fresh low closes checking; absent is not recovered',()=>{const c=createCalibratedChecker(model);c.update({time:0,observation:obs(0)});assert.equal(c.update({time:.3,observation:obs(.3,1)}).pulse,true);assert.equal(c.update({time:.4}).category,'unresolved');const r=c.update({time:.6,observation:obs(.6,1)});assert.equal(r.category,'low-error');assert.equal(r.checking,false);});
test('model immutable after construction, new bout has no pending state',()=>{const m={...model},c=createCalibratedChecker(m);m.velocityGain=0;c.update({time:0,observation:obs(0,0,1)});assert.equal(c.update({time:.3,observation:obs(.3,.3)}).assessment.error,0);assert.equal(createCalibratedChecker(model).state(),null);});
test('rejects bad times and observations',()=>{const c=createCalibratedChecker(model);c.update({time:0});assert.throws(()=>c.update({time:0}));assert.throws(()=>c.update({time:1,observation:obs(0)}));});
test('score alone is not reset; impossible own spawn displacement plus score is',()=>{
 const w=createWorld({gameMode:'COVER_CONTROL'});const a=percept(w,'P1','MODE_B');a.own.position={x:0,y:0};const b=structuredClone(a);b.time.elapsedSec=1/30;b.scores.P1++;assert.equal(observableCoverReset(a,b),false);b.own.position={x:-5.5,y:0};assert.equal(observableCoverReset(a,b),true);b.scores.P1--;assert.equal(observableCoverReset(a,b),false);
});
test('count yoking exact unique independent opportunities including zero/all',()=>{
 for(const n of [0,1,30,101]){const s=countYokedSchedule(n,101,991);assert.equal(s.length,n);assert.equal(new Set(s).size,n);assert.ok(s.every(x=>x>=0&&x<101));}assert.notDeepEqual(countYokedSchedule(30,101,1),countYokedSchedule(30,101,90001));
});
test('evaluator labels cannot alter adapter state',()=>{const w=createWorld({gameMode:'COVER_CONTROL'}),a=createCoverCalibratedMonitor({model}),b=createCoverCalibratedMonitor({model});for(let i=0;i<40;i++){const v=percept(w,'P1','MODE_B'),v2={...structuredClone(v),evaluationOnly:{reset:true,route:'south',condition:'switch',enemy:{x:99,y:99}}};assert.deepEqual(a.update(v),b.update(v2));for(let j=0;j<4;j++)step(w,[{},{}]);}});
test('identical legal percepts with altered evaluator labels yield identical commands',()=>{
 const a=createSubject({seed:991,variant:'full',model}),b=createSubject({seed:991,variant:'full',model});const w=createWorld({gameMode:'COVER_CONTROL'});
 for(let i=0;i<140;i++){const v=percept(w,'P1','MODE_B');assert.deepEqual(a.act(v),b.act({...structuredClone(v),evaluationOnly:{reset:true,route:'south'}}));step(w,[{},{}]);}assert.deepEqual(a.coordination(),b.coordination());
});

test('measured waypoint arrival advances despite divergent delay extrapolation',async()=>{
 const {createController,coverCircuitRoute}=await import('../benchmark/cover-uncertainty-v2/opponent.mjs');
 const {controlRoute}=await import('../src/agents/cover-control.mjs');
 const c=createController({seed:991,condition:'switch'}),w=createWorld({gameMode:'COVER_CONTROL'});
 const v=percept(w,'P1','MODE_B');v.opponent=null;v.opponentSpear=null;
 const route=controlRoute('P1','north');
 for(let i=0;i<route.length;i++){v.own.position={...route[i]};v.own.velocity={x:0,y:0};v.time.elapsedSec=i*.1;c.act(v);}
 v.time.elapsedSec=7;v.own.position={...route.at(-1)};c.act(v);assert.equal(c.diagnostics().pathKind,'circuit');
 v.time.elapsedSec=7.0333333333;v.own.position={...coverCircuitRoute('P1','north')[0]};v.own.velocity={x:4,y:0};c.act(v);
 assert.equal(c.diagnostics().waypoint,1);assert.equal(c.diagnostics().measuredWaypointArrivals,1);
});

test('fixed opportunities retain reset interruption and cannot credit later circuit completion',async()=>{
 const {summarizeOpportunities}=await import('../benchmark/cover-uncertainty-v2/audit.mjs');
 const row=(time,started,completed,visible=false)=>({time,evaluatorOccluded:!visible,opponentDiagnostic:{circuitsStarted:started,circuitsCompleted:completed,pathKind:completed?'hold':'circuit',route:'south'},sensor:{opponent:visible?{}:null,own:{position:{x:0,y:0}}},calibrated:{assessment:visible?{large:false}:null},coordination:{},focus:'Objective'});
 const rows=[row(6.9,0,0),row(7,1,0),row(8,1,0),row(9,1,0,true),row(10,2,0),row(11,2,1,true)];
 const op=summarizeOpportunities(rows,[8.5],20,'switch');assert.equal(op.length,2);assert.equal(op[0].status,'reset-interrupted');assert.equal(op[0].completedAt,null);assert.equal(op[0].recoveredByHorizon,false);assert.equal(op[1].startedAt,null);
});
test('summary clusters seats within seed and keeps interrupted opportunities as zeros',async()=>{
 const {pairedComparisons}=await import('../benchmark/cover-uncertainty-v2/audit.mjs');
 const reports=[];for(const seed of [1,2])for(const seat of ['P1','P2'])for(const condition of ['familiar','switch'])for(const variant of ['full','monitorOff','scheduled'])reports.push({seed,seat,condition,variant,opportunities:[{clock:31,recoveredByHorizon:variant==='full',routineResumedAt:null},{clock:43,recoveredByHorizon:false,routineResumedAt:null},{clock:55,recoveredByHorizon:false,routineResumedAt:null}],gameplay:{margin:0,subjectRingSeconds:0},dose:{proposed:2,delivered:variant==='monitorOff'?0:2}});
 const s=pairedComparisons(reports);assert.equal(s.effects[0].independentSeeds,2);assert.equal(s.effects[0].meanDifferences.recovery,1/3);assert.equal(s.seedClusters[0].seats,2);assert.equal(s.interactions[0].switchMinusFamiliar.recovery,0);
});

test('scheduled comparator cannot silently fall back to contingent control',()=>{
 assert.throws(()=>createSubject({seed:991,variant:'scheduled',model}));assert.throws(()=>createCoverCalibratedMonitor({model,schedule:[1,1]}));
});
test('learned coefficient causally changes discrepancy request on fixed evidence',()=>{
 const a=createCalibratedChecker({...model,velocityGain:.4,residualRateThreshold:.1}),b=createCalibratedChecker({...model,velocityGain:1,residualRateThreshold:.1});
 for(const c of [a,b])c.update({time:0,observation:obs(0,0,1)});
 assert.equal(a.update({time:.3,observation:obs(.3,.12,1)}).pulse,false);assert.equal(b.update({time:.3,observation:obs(.3,.12,1)}).pulse,true);
});
