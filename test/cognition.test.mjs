import test from 'node:test';
import assert from 'node:assert/strict';
import { createMind, ABLATION_FLAGS } from '../src/mind/index.mjs';
import { createBudget, createLearning, createAdaptation, rolloutTactic, reflex, situation } from '../src/mind/cognition.mjs';
import { createWorld } from '../src/sim.js';
import { percept } from '../src/perception.js';
import { rng } from '../src/mind/math.mjs';
const makeView = () => percept(createWorld(),'P1','MODE_A');
function run(mind, view, ticks=120) { for(let i=0;i<ticks;i++) {const v=structuredClone(view);v.time.elapsedSec=i/120;mind.act(v,1/120);} return mind.trace(); }

test('hard cognitive budgets are valid and shared across every ablation',()=>{
  assert.throws(()=>createMind({cognitionBudget:15}),/cognitionBudget/);
  for(const limit of [16,48,192,512]) for(const flag of [null,...ABLATION_FLAGS]) {
    const m=createMind({seed:8,cognitionBudget:limit,ablations:flag?{[flag]:true}:{}});
    const rows=run(m,makeView(),80);
    assert.ok(rows.length);
    for(const r of rows) {assert.equal(r.cognition.budget.limit,limit);assert.ok(r.cognition.budget.spent<=limit);assert.equal(Object.values(r.cognition.budget.byKind).reduce((a,b)=>a+b,0),r.cognition.budget.spent);}
    assert.ok(m.cognition().budgetSpent<=m.cognition().cycles*limit);
  }
});
test('a visible spear reflex bypasses both belief update and deliberation',()=>{
  const v=makeView();v.opponentSpear={state:'OUTBOUND',position:{x:v.own.position.x+2,y:v.own.position.y},direction:{x:-1,y:0}};
  assert.ok(reflex(v));
  const normal=run(createMind(),v),off=run(createMind({ablations:{noReflex:true}}),v);
  assert.ok(normal.every(r=>r.cognition.tier===0 && !r.cognition.budget.byKind.rollout && !r.cognition.budget.byKind.belief));
  assert.ok(off.every(r=>r.cognition.tier!==0));
  assert.notDeepEqual(normal.at(-1).input,off.at(-1).input);
});
test('actual score outcomes train persistent Type2 habits; model estimates alone cannot certify competence',()=>{
  const v=makeView(),learn=createLearning(),key='HELD:seen:far';
  for(let i=0;i<20;i++) learn.counterfactual(key,'right',1);
  assert.equal(learn.select(key).automatic,false);
  for(let i=0;i<4;i++){learn.record(key,'right',v,i*2,2);v.scores.P1++;learn.observe(v,i*2+0.2);}
  assert.equal(learn.select(key).automatic,true);assert.equal(learn.select(key).tactic,'right');
  const restored=createLearning(learn.snapshot());assert.deepEqual(restored.select(key),learn.select(key));
  assert.equal(createLearning(learn.snapshot(),{noAutomatization:true}).select(key).automatic,false);
  assert.equal(createLearning(learn.snapshot(),{noLearning:true}).select(key).tactic,'lead');
  const untrained=createLearning();for(let i=0;i<4;i++){untrained.record(key,'right',v,i*2,1);v.scores.P1++;untrained.observe(v,i*2+0.2);}assert.equal(untrained.select(key).automatic,false);
});
test('failed real attacks raise error awareness; noMetacog disables escalation knowledge',()=>{
  const v=makeView(),l=createLearning(),key='HELD:seen:far';
  for(let i=0;i<3;i++){l.record(key,'lead',v,i*2);l.observe(v,i*2+1.6);}
  assert.ok(l.select(key).aware);assert.ok(l.select(key).predictedFailure>0.3);
  assert.equal(createLearning(l.snapshot(),{noMetacog:true}).select(key).aware,false);
});
test('learned habit changes emitted aim rather than only a memory label',()=>{
  const v=makeView(),key=situation(v,{mean:v.opponent.position});
  const l=createLearning();for(let i=0;i<4;i++){l.record(key,'right',v,i*2);v.scores.P1++;l.observe(v,i*2+0.2);}
  const a=run(createMind({seed:8,memorySnapshot:{learning:l.snapshot()},ablations:{noDeliberation:true,noAdaptation:true}}),v);
  const b=run(createMind({seed:8,memorySnapshot:{learning:l.snapshot()},ablations:{noDeliberation:true,noAdaptation:true,noAutomatization:true}}),v);
  assert.ok(a.some((r,i)=>r.input.aimY!==b[i].input.aimY));
});
test('Bayesian visible-motion tendency adapts then reopens after a habit reversal',()=>{
  const v=makeView(),a=createAdaptation(),random=rng(4);v.opponent.velocity={x:0,y:3};
  for(let i=0;i<30;i++)a.observe(v,i*0.25);
  const before=a.model(random);assert.ok(before.sideProbability>0.8);
  v.opponent.velocity.y=-3;a.observe(v,8);
  const reopened=a.model(random);assert.ok(reopened.reversals>0);assert.ok(reopened.confidence<before.confidence);
  for(let i=0;i<30;i++)a.observe(v,9+i*0.25);
  assert.ok(a.model(random).sideProbability<0.2);
  assert.equal(createAdaptation(a.snapshot(),{noAdaptation:true}).model(random).enabled,false);
});
test('hidden spear transitions cannot establish recall-delay training evidence',()=>{
  const v=makeView(),a=createAdaptation();v.opponentSpear.state='EMBEDDED';a.observe(v,0);
  v.opponentSpear=null;a.observe(v,1);v.opponentSpear={state:'RETURNING'};a.observe(v,2);
  assert.equal(a.snapshot().recall.n,0);
});
test('counterfactuals simulate distinct executable recall-now and wait trajectories through obstacles',()=>{
  const v=makeView();v.own.position={x:3,y:0};v.own.spear={state:'EMBEDDED',position:{x:-3,y:0}};
  v.arena.obstacles=[{minX:-1,maxX:1,minY:-1,maxY:1}];
  const b={mean:{x:0,y:0},velocity:{x:0,y:0},particles:[{x:0,y:0}]};
  // Return ignores physical obstacles. Remove obstacle for target movement in the second comparison.
  b.mean=b.particles[0]={x:2,y:0};
  assert.equal(rolloutTactic('direct',v,b,{},createBudget()).value,1); // recall passes through obstacle
  v.arena.obstacles=[];assert.equal(rolloutTactic('direct',v,b,{},createBudget()).value,1);
  b.mean=b.particles[0]={x:0,y:0.6};b.velocity={x:0,y:-2};
  const now=rolloutTactic('direct',v,b,{},createBudget()),wait=rolloutTactic('lead',v,b,{},createBudget());
  assert.notEqual(now.value,wait.value);assert.equal(now.source,'percept-model rollout');
});
test('new memories are independent and malformed learned snapshots cannot inject NaN',()=>{
  const m=createMind({memorySnapshot:{learning:{table:{'HELD:seen:far':{lead:{value:NaN,n:Infinity}}}},adaptation:{side:{a:NaN,b:-3}}}});
  run(m,makeView(),60);const a=m.memory();a.adaptation.side.a=999;
  assert.notEqual(m.memory().adaptation.side.a,999);assert.equal(m.memory().version,2);
  assert.ok(m.trace().every(r=>Number.isFinite(r.input.aimX)&&Number.isFinite(r.input.moveX)));
});
test('terminal outcome settlement trains once and reports censored pending attacks',()=>{
  const v=makeView(),m=createMind({seed:4});run(m,v,60);
  assert.ok(m.cognition().pendingOutcome);
  const before=m.cognition().learningUpdates;v.scores.P1=1;v.time.elapsedSec=0.6;
  const outcome=m.finish(v);assert.equal(outcome.reward,1);
  assert.equal(m.cognition().learningUpdates,before+1);assert.equal(m.cognition().pendingOutcome,null);
  assert.equal(m.finish(v),null);assert.equal(m.cognition().learningUpdates,before+1);
});
test('noPrediction removes velocity extrapolation from deliberation branches',()=>{
  const v=makeView();v.opponent.velocity={x:0,y:3};
  const rows=run(createMind({seed:1,memorySnapshot:{learning:{table:{'HELD:seen:far':{}},awareness:{'HELD:seen:far':1}}},ablations:{noPrediction:true,noAdaptation:true}}),v,60);
  assert.ok(rows.some(r=>r.cognition.branches.some(b=>b.tactic==='lead')));
  for(const r of rows) for(const b of r.cognition.branches) if(b.tactic==='lead') {
    assert.ok(Math.abs(b.target.x-r.belief.mean.x)<1e-10);
    assert.ok(Math.abs(b.target.y-r.belief.mean.y)<1e-10);
  }
});
