import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, hashWorld } from '../src/sim.js';
import { percept } from '../src/perception.js';
import { createMind } from '../src/mind/index.mjs';
import { createIntegratedCoverMind } from '../src/agents/cover-integrated.mjs';
import { createCoverAgent } from '../src/agents/cover-control.mjs';
import { COVER_REPLAN_SEC } from '../src/mind/cover-policy.mjs';
const world = () => createWorld({ gameMode: 'COVER_CONTROL' });
const bare = (controls = {}, budget = 192) => createMind({ seed: 101, benchmarkInterface: true,
  deferCommand: true, captureTrace: true, captureDiagnostics: true, cognitionBudget: budget,
  ablations: { noLearning: true }, coverControl: controls });
function place(w, i, x, y, fx = i ? -1 : 1, fy = 0) {
  w.players[i].position = { x, y }; w.players[i].facing = { x: fx, y: fy };
  w.spears[i].position = { x, y }; w.spears[i].direction = { x: fx, y: fy };
}
function runPassive(id, controls = {}, ticks = 1200) {
  const w = world(), a = createIntegratedCoverMind({ seed: 101, controls, captureDiagnostics: true });
  let firstPoint = null;
  for (let tick = 0; tick < ticks; tick++) {
    const inputs = [{}, {}]; inputs[id === 'P1' ? 0 : 1] = a.act(percept(w, id, 'MODE_B'));
    const events = step(w, inputs);
    if (events.some(e => e.type === 'CONTROL_POINT' && e.player === id)) firstPoint ??= w.elapsedSec;
  }
  return { w, a, firstPoint };
}

test('integrated opponent captures unattended ring on both sides, then holds without continual thought', () => {
  for (const id of ['P1', 'P2']) {
    const { w, a, firstPoint } = runPassive(id);
    assert.ok(firstPoint < 10, `${id}: ${firstPoint}`);
    assert.ok(w.players[id === 'P1' ? 0 : 1].score > 0);
    assert.ok(a.cognition().escalations / a.cognition().cycles < .1);
    assert.equal(a.lastDecision().focus, 'Objective');
    assert.equal(a.cognition().learningUpdates, 0);
    assert.equal(a.cognition().automaticDecisions, 0);
    assert.equal(a.memory().learning.table && Object.keys(a.memory().learning.table).length >= 0, true);
    const trace = a.trace();
    assert.ok(trace.some(t => t.cognition.cover.routeCache.successfulTraversals > 0));
    assert.deepEqual(trace.at(-1).actualCommand, a.lastDecision().actualCommand);
    assert.ok(Math.abs(trace.at(-1).commandTime - trace.at(-1).time - .15) < 1e-12);
    assert.ok(trace.every(t => typeof t.innerSpeech !== 'undefined'));
  }
});

test('ring proposal changes actual workspace focus and movement on identical public input', () => {
  const v = percept(world(), 'P1', 'MODE_B');
  const full = bare(), cut = bare({ objective: false });
  const a = full.act(v, 1/30), b = cut.act(v, 1/30);
  assert.equal(full.lastDecision().focus, 'Objective');
  assert.notEqual(cut.lastDecision().focus, 'Objective');
  assert.notDeepEqual({ x:a.moveX,y:a.moveY }, { x:b.moveX,y:b.moveY });
});

test('observed immediate spear interrupts objective; threat cut changes command and pursuit resumes', () => {
  const w = world(); place(w, 0, -.55, 0, -1, 0); place(w, 1, 5.5, 0);
  w.objective = { controller: 'P1', contested: false, holdTicks: 60 };
  w.spears[1].state = 'OUTBOUND'; w.spears[1].position = { x: -2, y: 0 }; w.spears[1].direction = { x: 1, y: 0 };
  const v = percept(w, 'P1', 'MODE_B'); assert.ok(v.opponentSpear);
  const full = bare(), cut = bare({ threat:false });
  const a = full.act(v, 1/30), b = cut.act(v, 1/30);
  assert.equal(full.lastDecision().cognition.tier, 0);
  assert.equal(full.lastDecision().cognition.cover.actionSource, 'observed-spear reflex');
  assert.equal(full.lastDecision().cognition.cover.routeCache.reused, false);
  assert.notDeepEqual({ x:a.moveX,y:a.moveY }, { x:b.moveX,y:b.moveY });
  w.spears[1].state = 'HELD'; w.spears[1].position = { ...w.players[1].position };
  w.elapsedSec = 1;
  full.act(percept(w,'P1','MODE_B'),1/30);
  assert.equal(full.lastDecision().focus, 'Objective');
});

test('remembered embedded return line competes in workspace before actuation', () => {
  const w = world(); place(w,0,0,0); place(w,1,2,0);
  w.objective = { controller:'P1',contested:false,holdTicks:80 };
  w.spears[1].state='EMBEDDED'; w.spears[1].position={x:-2,y:0};
  const v=percept(w,'P1','MODE_A'), full=bare(), cut=bare({threat:false});
  const a=full.act(v,1/30), b=cut.act(v,1/30);
  assert.equal(full.lastDecision().focus,'Threat');
  assert.equal(full.lastDecision().cognition.cover.actionSource,'workspace winner');
  assert.notDeepEqual({x:a.moveX,y:a.moveY},{x:b.moveX,y:b.moveY});
});

test('public occupied ring drives contest while exact hidden opponent stays unknown', () => {
  const w=world();place(w,1,0,0);w.objective={controller:'P2',contested:false,holdTicks:220};
  const v=percept(w,'P1','MODE_B'); assert.equal(v.opponent,null);
  const a=bare(); a.act(v,1/30);const d=a.lastDecision();
  assert.equal(d.focus,'Objective');assert.equal(d.cognition.cover.intent,'Contest the public ring');
  assert.equal(d.cognition.cover.evidence.opponent,'unobserved');
  assert.equal(d.cognition.cover.planning.requested,false);
});

test('minimum budget reports unfinished planning and continues safe movement and spear recovery', () => {
  const a=bare({},16), w=world();
  const move=a.act(percept(w,'P1','MODE_B'),1/30);
  assert.ok(Math.hypot(move.moveX,move.moveY)>0);
  assert.equal(a.lastDecision().cognition.cover.planning.status,'unfinished-budget');
  assert.equal(a.lastDecision().cognition.budget.spent,16);
  place(w,0,-.5,0);place(w,1,2,0);w.spears[0].state='EMBEDDED';w.spears[0].position={x:-1,y:0};w.elapsedSec=1;
  const input=a.act(percept(w,'P1','MODE_A'),1/30), d=a.lastDecision();
  assert.equal(input.recall,true); assert.equal(d.cognition.cover.planning.status,'unfinished');
  assert.equal(d.cognition.handoffBlocked,false);assert.equal(d.cognition.issuedLearningTier,1);
  assert.ok(d.cognition.cover.planning.fallback);assert.ok(d.cognition.budget.spent<=16);
});

test('replanning is bounded and reports actual attempt/completion status', () => {
  const w=world();place(w,0,-.5,0);place(w,1,2,0);
  const a=bare(), requested=[];
  for(let t=0;t<90;t++) {w.elapsedSec=t/30;a.act(percept(w,'P1','MODE_A'),1/30);const d=a.lastDecision();
    if(d.cognition.cover.planning.requested)requested.push(d.time);
    assert.equal(d.cognition.cover.planning.attempted,d.cognition.tier===2);
    assert.ok(d.cognition.budget.spent<=192);
  }
  assert.ok(requested.length>0);
  for(let i=1;i<requested.length;i++)assert.ok(requested[i]-requested[i-1]>=COVER_REPLAN_SEC-1e-9);
});

test('successful route cache saves declared work, survives ordinary resets and does not fabricate tactical learning', () => {
  const full=runPassive('P1',{},700), cut=runPassive('P1',{routeCache:false},700);
  assert.equal(full.w.players[0].score,cut.w.players[0].score);
  assert.equal(full.a.cognition().budgetSpent,cut.a.cognition().budgetSpent);
  assert.equal(full.a.cognition().learningUpdates,0);
  const score=full.w.players[0].score;
  for(const run of [full,cut]) {
    run.w.spears[1].state='RETURNING';run.w.spears[1].position={...run.w.players[0].position};
    run.w.spears[1].direction={x:1,y:0};run.w.spears[1].recallTarget={x:6,y:0};
    assert.ok(step(run.w,[{},{}]).some(e=>e.type==='HIT'));
    for(let t=0;t<900;t++)step(run.w,[run.a.act(percept(run.w,'P1','MODE_B')),{}]);
  }
  assert.ok(full.w.players[0].score>score);
  assert.equal(full.w.players[0].score,cut.w.players[0].score);
  assert.equal(cut.a.cognition().budgetSpent-full.a.cognition().budgetSpent,7);
  assert.ok(full.a.trace().some(t=>t.cognition.cover.reset&&t.cognition.cover.routeCache.reused));
});

test('hidden truth and report-only intervention leave integrated commands unchanged', () => {
  const wa=world(),wb=world();place(wb,1,4.8,1.1,0,-1);
  const a=createIntegratedCoverMind({seed:509}),b=createIntegratedCoverMind({seed:509});
  const silent=createIntegratedCoverMind({seed:509,controls:{report:false}});
  for(let t=0;t<120;t++) {const va=percept(wa,'P1','MODE_B'),vb=percept(wb,'P1','MODE_B');
    assert.deepEqual(va,vb);const action=a.act(va);assert.deepEqual(action,b.act(vb));assert.deepEqual(action,silent.act(va));
    step(wa,[{},{}]);step(wb,[{},{}]);}
  assert.equal(silent.report(),null);
});

test('integrated closed-loop commands and world are exactly seeded-replay deterministic', () => {
  function run(){const w=world(),a=createIntegratedCoverMind({seed:307,captureTrace:false}),b=createCoverAgent({seed:911});
    const inputs=[];for(let t=0;t<1200;t++){const pair=[a.act(percept(w,'P1','MODE_B')),b.act(percept(w,'P2','MODE_B'))];inputs.push(pair);step(w,pair);}
    return {hash:hashWorld(w),inputs,cognition:a.cognition()};}
  assert.deepEqual(run(),run());
});

test('new non-reflex danger invalidates an established urgent-ring focus through the workspace', () => {
  const w=world();place(w,0,-1.5,0);place(w,1,.5,0);
  w.objective={controller:'P2',contested:false,holdTicks:180};
  const a=bare();a.act(percept(w,'P1','MODE_A'),1/30);
  assert.equal(a.lastDecision().focus,'Objective');
  w.spears[1].state='EMBEDDED';w.spears[1].position={x:-3,y:0};w.elapsedSec=1/30;
  const input=a.act(percept(w,'P1','MODE_A'),1/30);
  assert.equal(a.lastDecision().focus,'Threat');
  assert.notEqual(a.lastDecision().cognition.tier,0);
  assert.ok(Math.abs(input.moveY)>0);
});

test('Cover completion describes its executable immediate recall, never an unimplemented delayed branch', () => {
  const w=world();place(w,0,-2,0);place(w,1,0,-1.9);w.players[1].velocity={x:0,y:4};
  w.spears[0].state='EMBEDDED';w.spears[0].position={x:2,y:0};
  const a=createMind({seed:71,benchmarkInterface:true,deferCommand:true,captureDiagnostics:true,
    ablations:{noLearning:true},coverControl:{}});
  const input=a.act(percept(w,'P1','MODE_A'),1/30), d=a.lastDecision();
  assert.equal(input.recall,true);
  assert.ok(d.cognition.branches.every(b=>b.tactic==='direct'));
  if(d.cognition.selectedBranch)assert.equal(d.cognition.selectedBranch.tactic,'direct');
  assert.match(d.cognition.cover.planning.actionModel,/delayed recall unsupported/);
});
