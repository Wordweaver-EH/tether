import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeRolloutCompletion as complete,selectCompletedBranch as choose} from '../src/mind/rollout-completion.mjs';
import {segmentCircleTime,segmentStaticTime} from '../src/mind/percept-contact.mjs';
import {createLearning,createBudget,rolloutTactic} from '../src/mind/cognition.mjs';
import {createWorld,step} from '../src/sim.js';
import {percept} from '../src/perception.js';
const c=(hit,terminalNoHit,horizonUnresolved,budgetUnresolved=0)=>complete({assigned:hit+terminalNoHit+horizonUnresolved+budgetUnresolved,hit,terminalNoHit,horizonUnresolved,budgetUnresolved});
test('completion includes every assigned particle and never fabricates a point value',()=>{
 assert.deepEqual([c(1,1,1,1).lower,c(1,1,1,1).upper,c(1,1,1,1).pointValue],[.25,.75,null]);
 assert.equal(c(1,1,0).pointValue,.5);assert.equal(c(0,0,0).pointValue,null);
 assert.throws(()=>complete({assigned:2,hit:1,terminalNoHit:0,horizonUnresolved:0,budgetUnresolved:0}));
});
test('selection requires complete branch to dominate unresolved upper bounds including priors',()=>{
 const b=(t,comp)=>({tactic:t,value:comp.pointValue,completion:comp});
 assert.equal(choose([b('lead',c(0,1,0)),b('direct',c(0,0,1))]).selected,null);
 assert.equal(choose([b('lead',c(1,0,0)),b('direct',c(0,0,1))]).selected.tactic,'lead');
 assert.equal(choose([b('lead',c(1,0,0)),b('direct',c(0,0,1))],{direct:1}).selected,null);
 assert.equal(choose([b('lead',c(0,1,0)),b('direct',c(0,1,0))]).selected.tactic,'lead');
});
test('unresolved/invalid counterfactual values cannot create learned evidence',()=>{
 const l=createLearning();for(const x of [null,NaN,Infinity,undefined,-.1,1.1])l.counterfactual('HELD:seen:far','lead',x);
 assert.deepEqual(l.snapshot().table,{});l.counterfactual('HELD:seen:far','lead',0);assert.equal(l.snapshot().table['HELD:seen:far'].lead.modelN,1);
});
test('point contacts handle boundary, obstacle, tangent, zero-length and tie geometry',()=>{
 const a={bounds:{minX:-8,maxX:8,minY:-5,maxY:5},obstacles:[]};
 assert.equal(segmentStaticTime({x:8,y:0},{x:7,y:0},a),0);
 assert.equal(segmentStaticTime({x:0,y:0},{x:0,y:0},a),null);
 assert.equal(segmentCircleTime({x:0,y:0},{x:2,y:0},{x:1,y:1},1),.5);
 assert.equal(segmentCircleTime({x:0,y:0},{x:0,y:0},{x:0,y:0},.4),0);
 assert.equal(segmentCircleTime({x:0,y:0},{x:0,y:0},{x:1,y:0},.4),null);
 a.obstacles=[{minX:1,maxX:2,minY:-1,maxY:1}];assert.equal(segmentStaticTime({x:0,y:0},{x:4,y:0},a),.25);
});
function legalLane(near=false) {
 const w=createWorld();for(let i=0;i<120;i++)step(w,[{moveY:1},{moveY:1}]);
 if(near){for(let i=0;i<360;i++)step(w,[{moveX:1},i<60?{moveX:1}:{}]);}
 for(let i=0;i<60;i++)step(w,[{aimX:1},{}]);return w;
}
function model(w,budget=createBudget()) {
 const v=percept(w,'P1','MODE_A');return rolloutTactic('direct',v,{mean:v.opponent.position,velocity:{x:0,y:0},particles:[v.opponent.position]}, {},budget);
}
function shoot(w){const events=[...step(w,[{throw:true},{}])];for(let i=0;i<240;i++)events.push(...step(w,[{},{}]));return events;}
test('legal near-wall hit precedes the wall inside a coarse predicted segment',()=>{
 const w=legalLane(true),r=model(w);assert.equal(r.value,1);assert.equal(r.completion.complete,true);
 assert.ok(shoot(w).some(e=>e.type==='HIT'&&e.attacker==='P1'));
});
test('legal far-lane shot can hit beyond unchanged model horizon and remains unknown',()=>{
 const w=legalLane(),r=model(w);assert.equal(r.value,null);assert.equal(r.completion.horizonUnresolved,1);
 assert.ok(shoot(w).some(e=>e.type==='HIT'&&e.attacker==='P1'));
});
test('unattempted budget particles remain in assigned bounds',()=>{
 const w=legalLane(),b=createBudget(16);b.spend('other',16);const r=model(w,b);
 assert.equal(r.trials,0);assert.equal(r.completion.budgetUnresolved,1);assert.equal(r.value,null);assert.equal(r.completion.upper,1);
});
test('legal obstacle-first trajectory resolves no-hit rather than horizon uncertainty',()=>{
 const w=createWorld();for(let i=0;i<54;i++)step(w,[{moveY:1},{moveY:1}]);
 const r=model(w);assert.equal(r.value,0);assert.equal(r.completion.terminalNoHit,1);
 const events=shoot(w);assert.ok(events.some(e=>e.type==='EMBED'));assert.ok(!events.some(e=>e.type==='HIT'));
});
test('legal short recall completes; long recall remains horizon-unresolved',()=>{
 const short=createWorld();for(let i=0;i<54;i++)step(short,[{moveY:1},{moveY:1}]);
 shoot(short);assert.equal(short.spears[0].state,'EMBEDDED');
 const sr=model(short);assert.equal(sr.value,0);assert.equal(sr.completion.terminalNoHit,1);
 const long=legalLane();for(let i=0;i<30;i++)step(long,[{},{moveY:-1}]);shoot(long);
 assert.equal(long.spears[0].state,'EMBEDDED');const lr=model(long);assert.equal(lr.value,null);assert.equal(lr.completion.horizonUnresolved,1);
 const events=[...step(long,[{recall:true},{}])];for(let i=0;i<240;i++)events.push(...step(long,[{},{}]));
 assert.ok(events.some(e=>e.type==='RECALL_COMPLETE'));assert.ok(!events.some(e=>e.type==='HIT'));
});
