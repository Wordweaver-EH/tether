import test from 'node:test';
import assert from 'node:assert/strict';
import {createCoordination,COORDINATION_NOMINAL_UNITS} from '../src/mind/coordination.mjs';
import {createMind} from '../src/mind/index.mjs';
import {createWorld,step} from '../src/sim.js';
import {percept} from '../src/perception.js';
const arena=percept(createWorld(),'P1','MODE_A').arena;
function belief(mean={x:2,y:0},velocity={x:1,y:0}) {return {mean,velocity,covariance:{xx:.01,yy:0,xy:0},particles:[{x:mean.x-.1,y:mean.y},{x:mean.x+.1,y:mean.y}],confidence:.9,spear:{state:'HELD'},stalenessSec:0};}
const view=(time,visible=true)=>({opponent:visible?{position:{x:2,y:0},velocity:{x:1,y:0}}:null,arena,time:{elapsedSec:time}});
const chosen=b=>({focus:'Hunt',broadcast:{hypothesis:{entity:'opponent',mean:{...b.mean},velocity:{...b.velocity},uncertainty:{status:'known',radius:.1}}}});
const schedule=()=>[{item:'opponent',target:{x:-1,y:0},priority:.2,due:false}];
function cue(controls={}) {
 const c=createCoordination({researchControls:controls}),b=belief();c.begin(view(0),b,0);
 c.broadcast(chosen(b),view(0),b,0);const att=c.attend(schedule(),b.mean),p=c.plan(b,0,arena);
 return {c,att,p};
}
test('selected content, with fixed focus label, independently reaches attention, planner and episodic memory',()=>{
 const a=cue(),b=cue({contentOverride:{mean:{x:4,y:1}}});
 assert.equal(a.c.state().cycle.packet.focus,b.c.state().cycle.packet.focus);
 assert.deepEqual(a.att[0].target,{x:2,y:0});assert.deepEqual(b.att[0].target,{x:4,y:1});
 assert.notDeepEqual(a.p.mean,b.p.mean);
 const ar=a.c.begin(view(.5,false),belief({x:-3,y:0}),.5),br=b.c.begin(view(.5,false),belief({x:-3,y:0}),.5);
 // Existing planner legalPoint uses .37 margin: B's top -.25 becomes y=.12.
 assert.deepEqual(ar.belief.mean,{x:2.5,y:.12});assert.deepEqual(br.belief.mean,{x:4.5,y:1});
 assert.equal(a.c.state().targetMemory.entries[0].evidenceId,1);
});
test('recipient-specific cuts remove only delivered content effects and exact restoration recovers them',()=>{
 const full=cue({contentOverride:{mean:{x:4,y:1}}});
 const attention=cue({contentOverride:{mean:{x:4,y:1}},deliver:{attention:false}});
 assert.deepEqual(attention.att[0].target,{x:-1,y:0});assert.deepEqual(attention.p.mean,full.p.mean);assert.deepEqual(attention.c.state().targetMemory,full.c.state().targetMemory);
 const planner=cue({contentOverride:{mean:{x:4,y:1}},deliver:{planner:false}});
 assert.deepEqual(planner.p.mean,{x:2,y:0});assert.deepEqual(planner.att,full.att);
 const memory=cue({contentOverride:{mean:{x:4,y:1}},deliver:{memory:false}});
 assert.equal(memory.c.state().targetMemory.entries.length,0);assert.deepEqual(memory.att,full.att);assert.deepEqual(memory.p.mean,full.p.mean);
 assert.deepEqual(cue({contentOverride:{mean:{x:4,y:1}},deliver:{attention:true,planner:true,memory:true}}).c.state(),full.c.state());
});
test('independent episodic write/read lesions remove delayed working-hypothesis influence without inventing evidence',()=>{
 for(const controls of [{memoryWrite:false},{memoryRead:false}]) {
  const {c}=cue(controls),r=c.begin(view(.5,false),belief({x:-3,y:0}),.5);
  assert.deepEqual(r.belief.mean,{x:-3,y:0});assert.equal(c.state().monitor.assessed,0);
 }
 const {c}=cue();const r=c.begin(view(.5,false),belief({x:-3,y:0}),.5);
 assert.equal(r.belief.contentProvenance.source,'episodic');assert.equal(r.belief.contentProvenance.originalEvidenceTime,0);
 assert.ok(r.belief.confidence<=.9);assert.equal(c.state().targetMemory.entries.length,1);
});
function live(controls={},captureTrace=false,ticks=100) {
 const w=createWorld();step(w,[{throw:true},{moveY:1}]);
 const m=createMind({seed:731,captureTrace,captureDiagnostics:true,coordinationControls:controls});
 const rows=[],views=[];
 for(let tick=0;tick<ticks;tick++) {
  const v=percept(w,'P1','MODE_A');views.push(structuredClone(v));
  const input=m.act(v,1/120);
  step(w,[input,tick<24?{moveY:1}:{moveX:-1}]);
  const d=m.lastDecision();if(d&&rows.at(-1)?.serial!==d.serial)rows.push(d);
 }
 return {m,rows,views};
}
test('actual legal live cycles settle a pre-outcome target forecast and route its own error to attention and replanning',()=>{
 const {rows}=live();
 const assessed=rows.find(r=>r.cognition.coordination.assessment?.status==='assessed');
 assert.ok(assessed,'fixed legal turn fixture should assess its frozen prediction');
 assert.ok(assessed.cognition.coordination.assessment.assessment.issuedAt<assessed.time);
 assert.equal(assessed.cognition.budget.byKind.coordination,COORDINATION_NOMINAL_UNITS);
 const correction=rows.find(r=>r.cognition.monitorForced);
 assert.ok(correction,'fixed legal turn should request model correction');
 assert.ok(correction.cognition.branches.length>0);
 assert.equal(correction.cognition.coordination.receivers.attention.used[0].reason,'prediction-monitor');
});
test('feedback and control lesions are distinct in actual cycles; restored input sequence reproduces intact actions',()=>{
 const full=live(),feedback=live({monitorFeedback:false}),control=live({monitorControl:false}),restored=live({monitorFeedback:true,monitorControl:true});
 assert.equal(feedback.m.coordination().monitor.assessed,0);
 assert.ok(control.m.coordination().monitor.assessed>0);
 assert.ok(control.rows.every(r=>!r.cognition.monitorForced));
 assert.ok(feedback.rows.every(r=>!r.cognition.monitorForced));
 assert.ok(full.rows.some((r,i)=>JSON.stringify(r.input)!==JSON.stringify(control.rows[i]?.input)),'monitor delivery must alter actual emitted control');
 assert.deepEqual(restored.rows.map(r=>r.input),full.rows.map(r=>r.input));
});
test('grounded report remains available with trace off and report/trace sinks do not control action',()=>{
 const normal=live(),trace=live({},true),silent=live({reportEnabled:false});
 assert.deepEqual(normal.m.trace(),[]);assert.ok(normal.m.report());assert.ok(normal.m.report().prediction);assert.ok(normal.m.report().completion);
 assert.equal(silent.m.report(),null);
 assert.deepEqual(normal.rows.map(r=>r.input),trace.rows.map(r=>r.input));
 assert.deepEqual(normal.rows.map(r=>r.input),silent.rows.map(r=>r.input));
 assert.deepEqual(normal.m.memory(),trace.m.memory());
 assert.deepEqual(normal.m.memory(),silent.m.memory());
});
function firstNative(controls={}) {
 const w=createWorld(),m=createMind({seed:731,captureDiagnostics:true,captureTrace:false,coordinationControls:controls});
 for(let i=0;i<21;i++)step(w,[m.act(percept(w,'P1','MODE_B'),1/120),{}]);
 return {m,d:m.lastDecision()};
}
test('native selected-content intervention changes actual planner targets and emitted controls without changing the focus label',()=>{
 const base=firstNative(),full=firstNative({contentOverride:{mean:{x:4,y:1}}}),cut=firstNative({contentOverride:{mean:{x:4,y:1}},deliver:{planner:false}});
 assert.equal(full.d.focus,base.d.focus);assert.equal(full.d.focus,cut.d.focus);
 assert.deepEqual(full.d.cognition.coordination.packet.mean,{x:4,y:1});
 assert.notDeepEqual(full.d.cognition.branches[0].target,cut.d.cognition.branches[0].target);
 assert.notDeepEqual(full.d.input,cut.d.input);
 assert.deepEqual(full.m.report().content.mean,{x:4,y:1});
 assert.deepEqual(full.m.coordination().targetMemory.entries[0].mean,{x:4,y:1});
 const noReport=firstNative({contentOverride:{mean:{x:4,y:1}},deliver:{report:false}});
 assert.equal(noReport.m.report().content,null);assert.deepEqual(noReport.d.input,full.d.input);
});
function delayedNative(cuts={}) {
 // Single-encoding, seeded content intervention. Every physical state/visibility is simulator-produced.
 // Subsequent writes are disabled equally so later fresh views do not overwrite the encoded test cue.
 // The replacement is removed immediately after encoding; only episodic retrieval can recover it later.
 const w=createWorld();
 for(let i=0;i<18;i++)step(w,[{moveY:-1},{moveY:1}]);
 for(let i=0;i<135;i++)step(w,[{moveX:1},{moveX:-1}]);
 for(let i=0;i<36;i++)step(w,[{},{moveY:-1}]);
 for(let i=0;i<45;i++)step(w,[{},{moveX:-1}]);
 for(let i=0;i<60;i++)step(w,[{aimX:-1},{}]);
 step(w,[{throw:true},{}]);
 for(let i=0;i<60;i++)step(w,[{aimX:1},{}]);
 const m=createMind({seed:731,captureDiagnostics:true,captureTrace:false,
  coordinationControls:{...cuts,monitorControl:false,contentOverride:{mean:{x:-5,y:4},velocity:{x:4,y:0}}}});
 const rows=[],views=[];let encoded=false;
 for(let tick=0;tick<100;tick++) {
  const v=percept(w,'P1','MODE_B');views.push(structuredClone(v));
  const input=m.act(v,1/120);step(w,[input,{moveX:-1}]);
  const d=m.lastDecision();if(d&&rows.at(-1)?.d.serial!==d.serial) {
   const latencyTicks=Math.round(m.settings().latencySec/(1/120));
   rows.push({v,delayedView:views[tick-latencyTicks],d});
   if(!encoded){encoded=true;m.setCoordinationControls({...cuts,memoryWrite:false,monitorControl:false});}
  }
 }
 return rows;
}
test('native episodic write/read cuts remove the later control effect after legal visibility loss',()=>{
 const intact=delayedNative(),writeCut=delayedNative({memoryWrite:false}),readCut=delayedNative({memoryRead:false}),restored=delayedNative({memoryWrite:true,memoryRead:true});
 const i=intact.findIndex(r=>r.d.cognition.coordination.recalled!==null);
 assert.ok(i>=0,'fixed look-away content fixture must reach an actual episodic read');
 for(const cut of [writeCut,readCut]) {
  assert.deepEqual(intact.slice(0,i+1).map(r=>r.delayedView),cut.slice(0,i+1).map(r=>r.delayedView));
  assert.deepEqual(intact.slice(0,i).map(r=>r.d.input),cut.slice(0,i).map(r=>r.d.input));
 }
 assert.deepEqual(intact[i].delayedView,writeCut[i].delayedView);assert.deepEqual(intact[i].delayedView,readCut[i].delayedView);
 assert.equal(intact[i].d.cognition.coordination.contentIntervened,false);
 assert.equal(intact[i].delayedView.opponent,null);
 assert.equal(writeCut[i].d.cognition.coordination.recalled,null);assert.equal(readCut[i].d.cognition.coordination.recalled,null);
 assert.notDeepEqual(intact[i].d.input,writeCut[i].d.input);assert.notDeepEqual(intact[i].d.input,readCut[i].d.input);
 assert.deepEqual(restored.map(r=>r.d.input),intact.map(r=>r.d.input));
});

test('native attention delivery has an actual gaze-control effect on recalled content independently of planner and memory delivery',()=>{
 const full=delayedNative(),cut=delayedNative({deliver:{attention:false}}),restored=delayedNative({deliver:{attention:true}});
 const i=full.findIndex(r=>r.d.cognition.coordination.recalled!==null);
 assert.ok(i>=0);assert.deepEqual(full[i].delayedView,cut[i].delayedView);
 assert.deepEqual(full.slice(0,i+1).map(r=>r.delayedView),cut.slice(0,i+1).map(r=>r.delayedView));
 assert.deepEqual(full.slice(0,i).map(r=>r.d.input),cut.slice(0,i).map(r=>r.d.input));
 assert.deepEqual(full[i].d.cognition.coordination.receivers.planner,cut[i].d.cognition.coordination.receivers.planner);
 assert.deepEqual(full[i].d.cognition.coordination.receivers.memory,cut[i].d.cognition.coordination.receivers.memory);
 assert.notDeepEqual(full[i].d.input,cut[i].d.input);
 assert.deepEqual(restored.map(r=>r.d.input),full.map(r=>r.d.input));
});

function replayYoked(views,controls={},options={}) {
 const m=createMind({seed:731,captureTrace:false,captureDiagnostics:true,...options,coordinationControls:controls}),rows=[],before=m.memory();
 for(const v of views){m.act(structuredClone(v),1/120);const d=m.lastDecision();if(d&&rows.at(-1)?.serial!==d.serial)rows.push(d);}
 return {m,rows,before};
}
test('fixed legal-percept replay isolates monitor feedback/control and contains corrective evidence with recovery',()=>{
 // One actual legal run generates the sensory stream. Counterfactual replay arms receive it unchanged;
 // their outputs are inspected, not represented as independent closed-loop game trajectories.
 const legal=live({},false,168),full=replayYoked(legal.views),feedback=replayYoked(legal.views,{monitorFeedback:false}),control=replayYoked(legal.views,{monitorControl:false}),restored=replayYoked(legal.views,{monitorFeedback:true,monitorControl:true});
 assert.deepEqual(full.rows.map(r=>r.input),legal.rows.map(r=>r.input));
 assert.deepEqual(restored.rows.map(r=>r.input),full.rows.map(r=>r.input));
 assert.equal(feedback.m.memory().predictionReliability.assessed,0);
 assert.deepEqual(control.m.memory().predictionReliability,full.m.memory().predictionReliability);
 assert.ok(control.rows.every(r=>!r.cognition.monitorForced));
 assert.ok(full.rows.some((r,i)=>JSON.stringify(r.input)!==JSON.stringify(control.rows[i].input)));
 const scored=full.rows.filter(r=>r.cognition.coordination.assessment?.status==='assessed');
 const large=scored.find(r=>r.cognition.coordination.assessment.discrepancy>.5);
 assert.ok(large);
 const later=scored.find(r=>r.time>large.time&&r.cognition.coordination.monitor.category==='low-error'&&!r.cognition.coordination.request.replan);
 assert.ok(later,'fixed corrective observation must reduce the governing error state');
 assert.ok(later.cognition.coordination.assessment.discrepancy<large.cognition.coordination.assessment.discrepancy);
 const issuedFor=r=>full.rows.find(prior=>prior.cognition.coordination.forecastIssue?.forecast?.revision===r.cognition.coordination.assessment.assessment.revision).cognition.coordination.forecastIssue.forecast;
 const oldForecast=issuedFor(large),newForecast=issuedFor(later);
 assert.ok(oldForecast.issuedAt<large.time);assert.ok(newForecast.issuedAt<later.time);
 assert.notDeepEqual(newForecast.velocity,oldForecast.velocity);
});

test('native freezeLearning preserves memory while fresh percept error still changes online control',()=>{
 const legal=live({},false,168);
 const full=replayYoked(legal.views,{}, {freezeLearning:true});
 const control=replayYoked(legal.views,{monitorControl:false}, {freezeLearning:true});
 const feedback=replayYoked(legal.views,{monitorFeedback:false}, {freezeLearning:true});
 for(const arm of [full,control,feedback])assert.deepEqual(arm.m.memory(),arm.before);
 assert.ok(full.rows.some(r=>r.cognition.coordination.assessment?.status==='assessed'&&r.cognition.coordination.assessment.committed===false));
 assert.ok(full.rows.some(r=>r.cognition.monitorForced));
 assert.ok(control.rows.every(r=>!r.cognition.monitorForced));
 assert.ok(feedback.rows.every(r=>!r.cognition.monitorForced));
 assert.ok(full.rows.some((r,i)=>JSON.stringify(r.input)!==JSON.stringify(control.rows[i].input)));
 assert.equal(full.m.coordination().monitor.assessed,0);
 assert.equal(full.m.coordination().monitor.category,'unknown');
});
