import test from 'node:test';
import assert from 'node:assert/strict';
import {createConventionalPlanner,CONVENTIONAL_LEVELS} from '../src/agents/robust-baseline.mjs';
const view=()=>({viewerId:'P1',time:{elapsedSec:1},scores:{P1:0,P2:0},own:{position:{x:-3,y:0},facing:{x:1,y:0},spear:{state:'HELD',position:{x:-3,y:0},direction:{x:1,y:0}}},opponent:{position:{x:3,y:0},velocity:{x:0,y:.2},facing:{x:-1,y:0}},opponentSpear:{state:'HELD',position:{x:3,y:0},direction:{x:-1,y:0}},arena:{bounds:{minX:-8,maxX:8,minY:-5,maxY:5},obstacles:[]}});
const proposed={moveX:0,moveY:1,aimX:1,aimY:0,throw:true,recall:false};
test('configuration rejects invalid levels, rules, and utilities',()=>{
 for(const opt of [{level:9},{publicRules:{shiftTruth:1}},{publicRules:{playerSpeed:0}},{weights:{hit:-1}},{weights:{secret:1}},{horizonSec:0}])assert.throws(()=>createConventionalPlanner(opt));
});
test('synthetic percept yields deterministic finite commands without mutating inputs',()=>{
 const v=view(),snapshot=structuredClone(v),input={...proposed};
 const a=createConventionalPlanner(),b=createConventionalPlanner();
 const x=a.choose(v,input),y=b.choose(v,input);assert.deepEqual(x,y);assert.deepEqual(v,snapshot);assert.deepEqual(input,proposed);
 for(const k of ['moveX','moveY','aimX','aimY'])assert.ok(Number.isFinite(x[k]));
 assert.equal(typeof x.throw,'boolean');assert.equal(typeof x.recall,'boolean');
 const d=a.diagnostics();assert.equal(d.completedTrajectories,d.candidates*d.hypotheses);assert.equal(d.integrationSteps,d.completedTrajectories*CONVENTIONAL_LEVELS[0].steps);
});
test('larger useful grids complete more evaluated trajectories',()=>{
 const a=createConventionalPlanner({level:0}),b=createConventionalPlanner({level:1});a.choose(view(),proposed);b.choose(view(),proposed);
 assert.ok(b.diagnostics().completedTrajectories>a.diagnostics().completedTrajectories);assert.ok(b.diagnostics().integrationSteps>a.diagnostics().integrationSteps);
});
test('no opponent evidence uses incumbent without fictional trajectories',()=>{
 const v=view();v.opponent=null;v.opponentSpear=null;const a=createConventionalPlanner();assert.deepEqual(a.choose(v,proposed),proposed);assert.equal(a.diagnostics().completedTrajectories,0);
});
test('score reset clears stale opponent evidence before planning',()=>{
 const a=createConventionalPlanner();a.choose(view(),proposed);const v=view();v.time.elapsedSec=2;v.scores.P1=1;v.opponent=null;v.opponentSpear=null;a.choose(v,proposed);assert.equal(a.diagnostics().fallback,'no-recent-opponent');
});
test('embedded spear considers recall schedules without learning from outcomes',()=>{
 const v=view();v.own.spear={state:'EMBEDDED',position:{x:5,y:0},direction:{x:1,y:0}};const a=createConventionalPlanner();const settings=a.settings();const out=a.choose(v,{...proposed,throw:false});assert.equal(out.throw,false);assert.ok(a.diagnostics().candidates>0);assert.deepEqual(a.settings(),settings);
});

test('nominal-only composite refuses shifted physics and exposes final-command commit',async()=>{
 const {createRobustBaselineAgent}=await import('../src/agents/robust-baseline-agent.mjs');
 const {POLICY_SEEDS}=await import('../src/agents/param.mjs');
 assert.throws(()=>createRobustBaselineAgent(POLICY_SEEDS.direct,{publicRules:{returnSpeed:8}}),/nominal/);
 const agent=createRobustBaselineAgent(POLICY_SEEDS.direct),v=view();
 const out=agent.act(v,1/30);assert.equal(typeof agent.commitCommand,'function');
 agent.commitCommand({...out,throw:false,recall:false},v,1.15);
 assert.ok(agent.diagnostics().completedTrajectories>0);
});
