import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld} from '../src/sim.js';
import {percept} from '../src/perception.js';
import {createMind} from '../src/mind/index.mjs';
import {createParamAgent,POLICY_SEEDS} from '../src/agents/param.mjs';
import {createMind as originalMind} from '../fixtures/robustness-original/src/mind/index.mjs';
import {createParamAgent as originalParam} from '../fixtures/robustness-original/src/agents/param.mjs';
import {createLearning} from '../src/mind/cognition.mjs';
import {INTERFACE,noiseSample,motorTransform,sensorPacket,createInterface,createBenchmarkController,createCalibrationLogger,createNativeCalibrationLogger} from './interface.mjs';
const view=(tick,seat='P1')=>{const v=percept(createWorld(),seat,'MODE_A');v.time.elapsedSec=tick/120;return v;};

test('default source actions, diagnostics and state retain exact equivalence on synthetic percept streams',()=>{
  for(const difficulty of ['easy','normal','hard']) {
    const a=createMind({seed:87,difficulty,captureDiagnostics:true}),b=originalMind({seed:87,difficulty,captureDiagnostics:true});
    for(let t=0;t<300;t++) {const v=view(t);if(t%55>25){v.opponent=null;v.opponentSpear=null;}v.scores.P2=t>240?1:0;
      assert.deepEqual(a.act(structuredClone(v),1/120),b.act(structuredClone(v),1/120));}
    assert.deepEqual(a.memory(),b.memory());assert.deepEqual(a.trace(),b.trace());assert.deepEqual(a.cognition(),b.cognition());
  }
  for(const vector of Object.values(POLICY_SEEDS)) {
    const a=createParamAgent(vector,{seed:87}),b=originalParam(vector,{seed:87});
    for(let t=0;t<300;t++) assert.deepEqual(a.act(view(t),1/120),b.act(view(t),1/120));
  }
});
test('sensor contract retains original legal percept, drops extra top-level truth, detached copy',()=>{
  const v=view(0);assert.deepEqual(sensorPacket(v),v);v.shiftTruth={changedSpeed:50};v.physics={returnSpeed:50};
  const p=sensorPacket(v);assert.equal(p.shiftTruth,undefined);assert.equal(p.physics,undefined);p.own.position.x=100;assert.notEqual(v.own.position.x,100);
});
test('paired queues and cadence: exactly 150 ms old at 30 Hz; pulses do not repeat, continuous held',()=>{
  const callsA=[],callsB=[];
  const make=calls=>createInterface({act(v,dt){calls.push({time:v.time.elapsedSec,dt});return {moveX:1,aimX:1,throw:true,recall:true};}}, {episode:1,seat:'P1',diagnostics:true});
  const a=make(callsA),b=make(callsB);
  for(let tick=0;tick<100;tick++) {
    const x=a.act(view(tick),1/120),y=b.act(view(tick),1/120);assert.deepEqual(x,y);
    assert.equal(x.throw,tick>=18&&(tick-18)%4===0);assert.equal(x.recall,x.throw);assert.equal(x.moveX,tick>=18?1:0);
  }
  assert.deepEqual(callsA,callsB);assert.equal(callsA.length,21);
  for(const r of a.records())assert.ok(Math.abs(r.receiptTime-r.sensorTime-.15)<1e-12);
  assert.deepEqual(callsA.map(c=>c.dt),Array(21).fill(1/30));
});
test('stateless sample address and noise law have no branch-consumption privilege',()=>{
  const expected=noiseSample(10,'P1',20);for(let i=0;i<90;i++)noiseSample(10,'P1',i);assert.equal(noiseSample(10,'P1',20),expected);
  assert.notEqual(noiseSample(10,'P2',20),expected);
  const a=motorTransform({aimX:1,aimY:0},0,1);assert.equal(a.sigma,.034);assert.equal(a.command.aimX,Math.cos(.034));
  const b=motorTransform({aimX:-1,aimY:0},0,1);assert.equal(b.sigma,.18);
  const c=motorTransform({aimX:0,aimY:0},1,1);assert.equal(c.previousAngle,1);
});
test('native hooks have one cycle per call with no second latency or scheduler',()=>{
  const m=createBenchmarkController('mind',{mindOptions:{captureDiagnostics:true}});
  for(let i=0;i<8;i++)m.act(view(i*4),1/30);assert.equal(m.cognition().cycles,8);
  assert.throws(()=>createMind({benchmarkInterface:true,difficulty:'hard'}));
  assert.throws(()=>createBenchmarkController('mind',{mindOptions:{outboundSpeed:60}}));
});
test('baseline vector is copied, fixed and episode state resets',()=>{
  const vector=[...POLICY_SEEDS.direct], original=[...vector];const a=createBenchmarkController('param',{vector,seed:5});vector.fill(0);
  const b=createBenchmarkController('param',{vector:original,seed:5});const before=structuredClone(a.settings());
  for(let t=0;t<40;t++)assert.deepEqual(a.act(view(t*4),1/30),b.act(view(t*4),1/30));
  assert.deepEqual(a.settings(),before);
  const reset=createBenchmarkController('param',{vector:original,seed:5});assert.deepEqual(reset.act(view(0),1/30),createBenchmarkController('param',{vector:original,seed:5}).act(view(0),1/30));
});
test('diagnostic capture does not affect wrapped actions or learned state',()=>{
  const a=createBenchmarkController('mind',{seed:19,mindOptions:{captureDiagnostics:true}}),b=createBenchmarkController('mind',{seed:19,mindOptions:{captureDiagnostics:false}});
  const wa=createInterface(a,{episode:3,seat:'P1',diagnostics:true}),wb=createInterface(b,{episode:3,seat:'P1',diagnostics:false});
  for(let t=0;t<160;t++)assert.deepEqual(wa.act(view(t),1/120),wb.act(view(t),1/120));
  assert.deepEqual(a.memory(),b.memory());assert.deepEqual(wa.metadata(),wb.metadata());assert.equal(wb.records().length,0);
});
test('calibration mirrors native single-pending sparse-credit rule and censors unresolved terminal',()=>{
  const native=createLearning(),logger=createCalibrationLogger(),v=view(0),key='HELD:seen:far';
  const diag={cognition:{situation:key,tactic:'lead',issuedLearningTier:2,predictedFailure:0}};
  native.record(key,'lead',v,0,2);logger.record(v,diag,{throw:true},.15);
  logger.record(view(4),diag,{recall:true},.15+1/30);
  assert.equal(logger.observe(view(179)),null);assert.equal(native.observe(view(179),179/120),null);
  const l=logger.observe(view(180)),n=native.observe(view(180),1.5);
  for(const k of ['key','tactic','tier','time','reward','actualFailure','predictedFailure'])assert.equal(l[k],n[k]);
  const v2=view(200);diag.cognition.predictedFailure=native.select(key).predictedFailure;
  native.record(key,'lead',v2,v2.time.elapsedSec);logger.record(v2,diag,{throw:true},v2.time.elapsedSec+.15);
  const success=view(204);success.scores.P1=1;assert.equal(logger.observe(success).actualFailure,native.observe(success,success.time.elapsedSec).actualFailure);
  logger.record(view(208),diag,{throw:true},208/120+.15);assert.equal(logger.finish().at(-1).censored,true);
});
test('external frozen calibration is diagnostic only and no injected nested truth crosses',()=>{
  const a=createBenchmarkController('mind',{seed:31,mindOptions:{captureDiagnostics:true,freezeLearning:true}}),b=createBenchmarkController('mind',{seed:31,mindOptions:{captureDiagnostics:true,freezeLearning:true}});
  const wa=createInterface(a,{episode:3,seat:'P1',calibration:'shadow'}),wb=createInterface(b,{episode:3,seat:'P1'});
  for(let t=0;t<240;t++)assert.deepEqual(wa.act(view(t),1/120),wb.act(view(t),1/120));
  assert.deepEqual(a.memory(),b.memory());assert.equal(a.cognition().pendingOutcome,null);
  const v=view(0);v.arena.bounds.shiftSpeed=50;v.arena.obstacles[0].shift=true;v.own.spear.position.secret=50;
  const clean=sensorPacket(v);assert.equal(clean.arena.bounds.shiftSpeed,undefined);assert.equal(clean.arena.obstacles[0].shift,undefined);assert.equal(clean.own.spear.position.secret,undefined);
  assert.ok(wa.finishCalibration().length>0);
});
test('deferred command memory commits actual externally noised motor at receipt time',()=>{
  const commands=[];const controller={act:()=>({aimX:1,aimY:0,throw:true}),commitCommand:(input,v,time)=>commands.push({input:structuredClone(input),sensor:v.time.elapsedSec,time})};
  const wrapper=createInterface(controller,{episode:9,seat:'P1'});let actual;
  for(let t=0;t<=18;t++)actual=wrapper.act(view(t),1/120);
  assert.deepEqual(commands,[{input:actual,sensor:0,time:.15}]);assert.notEqual(actual.aimY,0);
  assert.throws(()=>createParamAgent(POLICY_SEEDS.direct,{deferCommand:true}));assert.throws(()=>createMind({deferCommand:true}));
  for(const factory of [opts=>createMind({seed:7,...opts}),opts=>createParamAgent(POLICY_SEEDS.direct,{seed:7,...opts})]) {
    const auto=factory({benchmarkInterface:true}),deferred=factory({benchmarkInterface:true,deferCommand:true});
    for(let t=0;t<80;t++) {const v=view(t*4);if(t>2){v.own.spear=null;v.opponent=null;v.opponentSpear=null;}
      const expected=auto.act(structuredClone(v),1/30),actual=deferred.act(structuredClone(v),1/30);assert.deepEqual(actual,expected);deferred.commitCommand(actual,v,v.time.elapsedSec+.15);}
  }
});

test('native primary calibration copies exact issued pending and keyed outcomes',()=>{
 const a=createBenchmarkController('mind',{seed:31,mindOptions:{captureDiagnostics:true}}),b=createBenchmarkController('mind',{seed:31,mindOptions:{captureDiagnostics:true}});
 const wa=createInterface(a,{episode:3,seat:'P1',calibration:'native'}),wb=createInterface(b,{episode:3,seat:'P1'});
 for(let t=0;t<400;t++)assert.deepEqual(wa.act(view(t),1/120),wb.act(view(t),1/120));
 const rows=wa.finishCalibration();assert.ok(rows.length>0);assert.ok(rows.every(r=>r.origin==='native-pending'&&r.primaryCalibration));
 assert.deepEqual(a.memory(),b.memory());
 const native=createNativeCalibrationLogger(),pending={key:'HELD:seen:far',tactic:'lead',time:0,predictedFailure:.375};
 native.capture(pending,null,.15);native.capture(null,{...pending,actualFailure:1},1.65);assert.equal(native.records()[0].predictedFailure,.375);
 assert.throws(()=>createNativeCalibrationLogger().capture(null,{...pending,actualFailure:1},1.65));
});
test('bypassing motor noise preserves shared cognitive RNG draw sequence',()=>{
  const original=originalMind({seed:44}),hook=createMind({seed:44,benchmarkInterface:true});
  const views=Array.from({length:105},(_,i)=>{const v=view(i*4);if(i%40>20){v.opponent=null;v.opponentSpear=null;}if(i>90)v.scores.P2=1;return v;});
  for(let i=0;i<views.length;i++) {
    original.act(structuredClone(views[i]),1/30);
    if(i>=5){hook.act(structuredClone(views[i-5]),1/30);assert.deepEqual(hook.trace().at(-1).belief,original.trace().at(-1).belief);}
  }
  assert.deepEqual(hook.memory(),original.memory());assert.deepEqual(hook.cognition(),original.cognition());
});
test('fixed teacher removes uncertainty control but preserves scheduled learning opportunities',()=>{
  assert.throws(()=>createMind({fixedTeacherSchedule:{every:4,phase:0}}));
  assert.throws(()=>createBenchmarkController('mind',{mindOptions:{ablations:{noMetacog:true},fixedTeacherSchedule:{every:4,phase:0}}}));
  const make=()=>createBenchmarkController('mind',{seed:4,mindOptions:{captureDiagnostics:true,ablations:{noMetacog:true},coordinationControls:{monitorControl:false},fixedTeacherSchedule:{every:4,phase:1}}});
  const visible=make(),hidden=make();let opportunities=0;
  for(let t=0;t<20;t++) {
    const v=view(t*4),h=structuredClone(v);h.opponent=null;h.opponentSpear=null;
    visible.act(v,1/30);hidden.act(h,1/30);
    const a=visible.lastDecision().cognition,b=hidden.lastDecision().cognition;
    assert.equal(a.fixedTeacher.due,t%4===1);assert.equal(b.fixedTeacher.due,a.fixedTeacher.due);
    assert.equal(a.monitorForced,false);assert.equal(a.noveltyForced,false);assert.equal(b.monitorForced,false);assert.equal(b.noveltyForced,false);
    assert.equal(a.tier===2,a.fixedTeacher.opportunity);opportunities+=a.fixedTeacher.opportunity;
  }
  assert.equal(opportunities,5);
});
test('broadcast delivery cuts retain coordination packet/projection work',()=>{
  const m=createBenchmarkController('mind',{mindOptions:{captureDiagnostics:true,coordinationControls:{deliver:{attention:false,planner:false,memory:false}}}});
  for(let t=0;t<12;t++)m.act(view(t*4),1/30);
  const c=m.lastDecision().cognition.coordination;
  assert.equal(c.active,true);assert.equal(c.work.reservedUnits,16);
  assert.equal(c.work.attentionProjections,1);assert.equal(c.work.plannerProjections,1);
});
