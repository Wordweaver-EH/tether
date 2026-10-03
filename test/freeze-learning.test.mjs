import test from 'node:test';
import assert from 'node:assert/strict';
import {createMind} from '../src/mind/index.mjs';
import {createLearning} from '../src/mind/cognition.mjs';
import {createWorld,step} from '../src/sim.js';
import {percept} from '../src/perception.js';
test('read-only learner preserves habit lookup without materializing unseen rows or model/outcome writes',()=>{
 const v=percept(createWorld(),'P1','MODE_B'),l=createLearning();
 for(let i=0;i<4;i++){l.record('HELD:seen:far','lead',v,2*i,2);v.scores.P1++;l.observe(v,2*i+.1);}
 const snapshot=l.snapshot(),r=createLearning(snapshot,{}, {readOnly:true});assert.equal(r.select('HELD:seen:far').automatic,true);
 r.select('EMBEDDED:hidden:near');r.prior('RETURNING:hidden:far','direct');r.counterfactual('HELD:seen:far','lead',1);r.record('HELD:seen:far','lead',v,20,2);r.observe(v,22);
 assert.deepEqual(r.snapshot(),snapshot);assert.equal(r.diagnostics().pending,null);
});
test('frozen-learning live legal continuation preserves complete memory including support and adaptation',()=>{
 const m=createMind({seed:731,freezeLearning:true,captureDiagnostics:true}),w=createWorld(),before=m.memory();
 for(let i=0;i<240;i++)step(w,[m.act(percept(w,'P1','MODE_B'),1/120),{}]);
 m.finish(percept(w,'P1','MODE_B'));assert.deepEqual(m.memory(),before);assert.ok(m.cognition().cycles>0);assert.equal(m.settings().freezeLearning,true);
});
