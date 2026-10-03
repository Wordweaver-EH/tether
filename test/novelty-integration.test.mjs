import test from 'node:test';
import assert from 'node:assert/strict';
import {createMind} from '../src/mind/index.mjs';
import {createLearning} from '../src/mind/cognition.mjs';
import {createNoveltySupport,noveltyFamily,noveltyFeatures} from '../src/mind/novelty.mjs';
import {createWorld,step} from '../src/sim.js';
import {percept} from '../src/perception.js';
const dt=1/120;
function seededUnitMemory(familiar) {
 const v=percept(createWorld(),'P1','MODE_B'),l=createLearning(),key='HELD:seen:far';
 // Isolated synthetic reward fixture tests wiring; not acquisition study evidence.
 for(let i=0;i<4;i++){l.record(key,'lead',v,i*2,2);v.scores.P1++;l.observe(v,i*2+.1);}
 const n=createNoveltySupport();if(familiar)for(let i=0;i<4;i++)n.register(noveltyFamily(key,'lead'),noveltyFeatures(v),{ordinary:true,completed:true});
 return {learning:l.snapshot(),novelty:n.snapshot()};
}
function firstDecision(m){const w=createWorld();for(let i=0;i<21;i++){const input=m.act(percept(w,'P1','MODE_B'),dt);step(w,[input,{}]);}return m.lastDecision();}
test('unsupported automatic habit requests live deliberation; supported habit preserves fast route',()=>{
 const novel=firstDecision(createMind({seed:91,memorySnapshot:seededUnitMemory(false),captureDiagnostics:true}));
 const familiar=firstDecision(createMind({seed:91,memorySnapshot:seededUnitMemory(true),captureDiagnostics:true}));
 assert.equal(novel.serial,1);assert.equal(novel.cognition.habit.automatic,true);assert.equal(novel.cognition.noveltyForced,true);
 assert.equal(novel.cognition.tier,2);assert.ok(novel.cognition.branches.length>0);
 assert.equal(familiar.cognition.novelty.familiar,true);assert.equal(familiar.cognition.noveltyForced,false);assert.equal(familiar.cognition.tier,1);assert.equal(familiar.cognition.branches.length,0);
});
test('novelty ablation disables only handoff consumption and retains detector output',()=>{
 const r=firstDecision(createMind({seed:91,memorySnapshot:seededUnitMemory(false),captureDiagnostics:true,ablations:{noNoveltyHandoff:true}}));
 assert.equal(r.cognition.noveltyRequested,true);assert.equal(r.cognition.noveltyForced,false);assert.equal(r.cognition.novelty.count,0);assert.equal(r.cognition.tier,1);
});
test('diagnostics are detached and do not change default actuator or learned state',()=>{
 const a=createMind({seed:917,captureTrace:false}),b=createMind({seed:917,captureTrace:false,captureDiagnostics:true}),w=createWorld();
 for(let i=0;i<180;i++) {const v=percept(w,'P1','MODE_B'),x=a.act(structuredClone(v),dt),y=b.act(structuredClone(v),dt);assert.deepEqual(x,y);step(w,[x,{}]);}
 assert.deepEqual(a.memory(),b.memory());assert.equal(a.lastDecision(),null);const d=b.lastDecision();d.cognition.habit.value=999;assert.notEqual(b.lastDecision().cognition.habit.value,999);
});
test('ordinary accepted feedback registers support once, model branches do not',()=>{
 const m=createMind({seed:91,memorySnapshot:seededUnitMemory(false),captureDiagnostics:true,ablations:{noNoveltyHandoff:true}});firstDecision(m);
 assert.equal(m.memory().novelty.cells.length,0);
 const pending=m.cognition().pendingOutcome;assert.ok(pending,'fixture must emit a registered command');
 const v=percept(createWorld(),'P1','MODE_B');v.time.elapsedSec=pending.time+1.6;
 assert.ok(m.finish(v));const cells=m.memory().novelty.cells;assert.equal(cells.length,1);assert.equal(cells[0].count,1);
 assert.equal(m.finish(v),null);assert.deepEqual(m.memory().novelty.cells,cells);
});
