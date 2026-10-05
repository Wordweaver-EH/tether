import test from 'node:test';
import assert from 'node:assert/strict';
import {createMind} from '../src/mind/index.mjs';
import {createLearning} from '../src/mind/cognition.mjs';
import {createWorld,step} from '../src/sim.js';
import {percept} from '../src/perception.js';
test('unresolved novel automatic request cannot emit or acquire teacher-backed evidence',()=>{
 const w=createWorld(),v=percept(w,'P1','MODE_B'),l=createLearning(),key='HELD:seen:far';
 // Synthetic competence isolates live gate mechanics; study training does not use this fixture.
 for(let i=0;i<4;i++){l.record(key,'lead',v,2*i,2);v.scores.P1++;l.observe(v,2*i+.1);}
 const before=l.snapshot(),m=createMind({seed:91,memorySnapshot:{learning:before},captureDiagnostics:true});
 for(let i=0;i<21;i++)step(w,[m.act(percept(w,'P1','MODE_B'),1/120),{}]);
 const d=m.lastDecision(),c=d.cognition;
 assert.equal(c.noveltyForced,true);assert.equal(c.handoffBlocked,true);assert.equal(c.selectedBranch,null);
 assert.equal(d.input.throw,false);assert.equal(d.input.recall,false);assert.equal(m.cognition().pendingOutcome,null);
 assert.equal(c.issuedLearningTier,1);
 for(const b of c.branches)if(!b.completion.complete){assert.equal(b.value,null);assert.equal(m.memory().learning.table[key][b.tactic].modelN,before.table[key][b.tactic].modelN);}
 assert.equal(m.memory().novelty.cells.length,0);
});
