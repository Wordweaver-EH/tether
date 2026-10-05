import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step} from '../src/sim.js';
import {percept} from '../src/perception.js';
import {createHumanInterface} from './interface.mjs';
import {createHumanCounter,clearTravel} from './counter.mjs';
import {sensorPacket,noiseSample,motorTransform,createInterface,createBenchmarkController} from '../benchmark/interface.mjs';
import {createParamAgent} from '../src/agents/param.mjs';
import {verifyFrozenSource,seedTable} from './protocol.mjs';
import {classify,summarizeStudy} from './statistics.mjs';
const vec=(x,y)=>({x,y});
function view(tick=0){const v=percept(createWorld(),'P1','MODE_B');v.time.elapsedSec=tick/120;v.arena.obstacles=[];v.own.position=vec(0,0);v.own.facing=vec(1,0);v.opponent.position=vec(5.25,0);return v;}
function away(v){v.opponentSpear={state:'OUTBOUND',position:vec(7,0),direction:vec(1,0),embedSurfaceId:null,recallTarget:null};return v;}

test('frozen source/protocol/vector exact bytes; 32 new deterministic role-seed rows',()=>{
 verifyFrozenSource();assert.equal(seedTable().length,32);assert.deepEqual(seedTable(),seedTable());assert.equal(new Set(seedTable().flatMap(r=>[r.episodeId,r.counterSeed,r.ordinarySeed])).size,96);
});
test('250ms one-queue age, 30Hz cadence, pulses, canonical boundary, exact external noise and committed actuator',()=>{
 const calls=[],commits=[];
 const c={act(v,dt){calls.push({v,dt});return {moveX:1,aimX:1,aimY:0,throw:true,recall:true};},commitCommand(command,v,t){commits.push({command,v,t});}};
 const wrapper=createHumanInterface(c,{episode:123,seat:'P1',diagnostics:true});let previous=0;
 for(let tick=0;tick<100;tick++){
  const v=view(tick);v.truth={secret:true};v.own.position.secret=true;v.arena.bounds.secret=true;
  const cmd=wrapper.act(v,1/120);const isDecision=tick>=30&&(tick-30)%4===0;
  assert.equal(cmd.throw,isDecision);assert.equal(cmd.recall,isDecision);assert.equal(cmd.moveX,tick>=30?1:0);
  if(isDecision){const index=(tick-30)/4,expected=motorTransform({moveX:1,aimX:1,aimY:0,throw:true,recall:true},previous,noiseSample(123,'P1',index));assert.deepEqual(cmd,expected.command);previous=expected.previousAngle;assert.deepEqual(commits.at(-1).command,cmd);assert.equal(commits.at(-1).t,tick/120);}
 }
 assert.equal(calls.length,18);for(const c of calls){assert.equal(c.dt,1/30);assert.equal(c.v.truth,undefined);assert.equal(c.v.own.position.secret,undefined);assert.equal(c.v.arena.bounds.secret,undefined);}
 for(const r of wrapper.records())assert.ok(Math.abs(r.receiptTime-r.sensorTime-.25)<1e-12);
 assert.equal(calls[0].v.time.elapsedSec,0);assert.equal(commits[0].t,.25);
});
test('ordinary frozen constructor exact action parity with original benchmark parameters and 150ms wrapper',()=>{
 const {ordinary}=verifyFrozenSource(),a=createInterface(createBenchmarkController('param',{vector:ordinary.vector,seed:17}),{episode:9,seat:'P1',diagnostics:true}),b=createInterface(createParamAgent(ordinary.vector,{seed:17,benchmarkInterface:true,deferCommand:true,outboundSpeed:12,returnSpeed:12}),{episode:9,seat:'P1'});
 for(let tick=0;tick<600;tick++){const v=view(tick);if(tick%80>40){v.opponent=null;v.opponentSpear=null;}if(tick>400)v.scores.P2=1;assert.deepEqual(a.act(structuredClone(v),1/120),b.act(structuredClone(v),1/120));}
 for(const r of a.records())assert.ok(Math.abs(r.receiptTime-r.sensorTime-.15)<1e-12);
});
test('armed spacing retreats below 5.25 and advances above it; away target is 4.5',()=>{
 let v=view();v.opponent.position.x=4;let c=createHumanCounter();assert.ok(c.act(v,1/30).moveX<0);assert.equal(c.diagnostics().targetDistance,5.25);
 v=view();v.opponent.position.x=7;c=createHumanCounter();assert.ok(c.act(v,1/30).moveX>0);
 v=away(view());c=createHumanCounter();c.act(v,1/30);assert.equal(c.diagnostics().targetDistance,4.5);
});
test('hidden spear is unknown; stale away expires; close return rejected; hidden opponent cannot be chased/punished',()=>{
 let c=createHumanCounter(),v=view();v.opponentSpear=null;assert.equal(c.act(v,1/30).throw,false);assert.equal(c.diagnostics().supportedAway,false);
 c=createHumanCounter();v=away(view());assert.equal(c.act(v,1/30).throw,true);v=view(16);v.opponentSpear=null;assert.equal(c.act(v,1/30).throw,false);assert.equal(c.diagnostics().supportedAway,false);
 c=createHumanCounter();v=away(view());v.opponentSpear.state='RETURNING';v.opponentSpear.position=vec(5.5,0);assert.equal(c.act(v,1/30).throw,false);
 c=createHumanCounter();v=away(view());v.opponent=null;assert.equal(c.act(v,1/30).throw,false);assert.equal(c.diagnostics().supportedAway,false);
});
test('punishment requires aligned observed facing and owns command memory; score reset arrives only through delayed observation',()=>{
 const c=createHumanCounter();let v=away(view());v.own.facing=vec(0,1);assert.equal(c.act(v,1/30).throw,false);
 v=away(view());const input=c.act(v,1/30);assert.equal(input.throw,true);c.commitCommand(input,v,.25);
 v=away(view(4));assert.equal(c.act(v,1/30).throw,false);assert.notEqual(c.diagnostics().ownSpearState,'HELD');
 assert.equal(c.totals().scoreResets,0);v=away(view(8));v.scores.P2=1;assert.equal(c.act(v,1/30).throw,true);assert.equal(c.totals().scoreResets,1);
 const w=createHumanInterface(createHumanCounter(),{episode:1,seat:'P1'});for(let t=0;t<34;t++){const p=view(t);if(t>=1)p.scores.P2=1;w.act(p,1/120);}assert.equal(w.controller.totals().scoreResets,0);w.act({...view(34),scores:{P1:0,P2:1}},1/120);assert.equal(w.controller.totals().scoreResets,1);
});
test('embedded own spear recalls and commit prevents duplicate recall commands',()=>{
 const c=createHumanCounter(),v=view();v.own.spear={state:'EMBEDDED',position:vec(-5,0),direction:vec(-1,0),embedSurfaceId:'WALL_W',recallTarget:null};const cmd=c.act(v,1/30);assert.equal(cmd.recall,true);c.commitCommand(cmd,v,.25);v.time.elapsedSec=1/30;assert.equal(c.act(v,1/30).recall,false);
});
function threatView(){const v=view();v.opponent.position=vec(-5.25,0);v.own.facing=vec(-1,0);v.opponentSpear={state:'OUTBOUND',position:vec(-4,0),direction:vec(1,0),embedSurfaceId:null,recallTarget:null};return v;}
test('visible threatened spear sidesteps both ways with deterministic ties; blocked side chooses open side',()=>{
 for(const seed of [1,2]){const c=createHumanCounter({seed}),cmd=c.act(threatView(),1/30);assert.ok(Math.abs(cmd.moveY)>.9);assert.equal(Math.sign(cmd.moveY),seed===1?-1:1);assert.ok(c.diagnostics().threat);}
 for(const blockedSign of [-1,1]){const v=threatView();v.arena.bounds.minY=blockedSign<0?-.36:-5;v.arena.bounds.maxY=blockedSign>0?.36:5;const c=createHumanCounter({seed:blockedSign>0?1:2}),cmd=c.act(v,1/30);assert.equal(Math.sign(cmd.moveY),-blockedSign);assert.ok(c.diagnostics().threat.available>1);}
});
test('public geometry clearance and corner escape without oracle fields',()=>{
 const v=view();v.own.position=vec(7.65,4.65);v.opponent=null;v.opponentSpear=null;const c=createHumanCounter(),cmd=c.act(v,1/30);assert.ok(cmd.moveX<0&&cmd.moveY<0);assert.ok(Math.abs(clearTravel(vec(0,0),vec(1,0),1,{bounds:v.arena.bounds,obstacles:[{minX:.5,maxX:1,minY:-1,maxY:1}]})-.15)<1e-12);
 const a=createHumanCounter(),b=createHumanCounter(),p=threatView(),q=structuredClone(p);q.hiddenTruth={reset:true,nextSpear:'HIT'};q.futureWorld='forbidden';assert.deepEqual(a.act(sensorPacket(p),1/30),b.act(sensorPacket(q),1/30));
});
function scriptedDodge(separation,seed,{y=0,side=-1}={}){
 const w=createWorld();w.players[0].position=vec(0,y);w.players[0].facing=vec(side,0);w.players[1].position=vec(side*separation,y);w.players[1].facing=vec(-side,0);for(let i=0;i<2;i++){w.spears[i].position={...w.players[i].position};w.spears[i].direction={...w.players[i].facing};}
 const c=createHumanInterface(createHumanCounter({seed}),{episode:81,seat:'P1',diagnostics:true}),hits=[];
 for(let tick=0;tick<100;tick++){const input=c.act(percept(w,'P1','MODE_B'),1/120);const events=step(w,[input,{throw:tick===0,aimX:-side,aimY:0}]);hits.push(...events.filter(e=>e.type==='HIT'));if(hits.length)break;}
 return {hits,records:c.records()};
}
test('actual frozen-engine straight-on launch: 5.25 open dodges succeed; 4u close range is not assumed avoidable',()=>{
 for(const seed of [1,2]){const open=scriptedDodge(5.25,seed);assert.equal(open.hits.filter(h=>h.victim==='P1').length,0);assert.ok(open.records.some(r=>r.diagnostic.threat));const close=scriptedDodge(4,seed);assert.ok(close.hits.some(h=>h.victim==='P1'));}
});
test('classification bounds are mutually exclusive and paired cluster CI is deterministic',()=>{
 assert.equal(classify(.01,.1),'counter-beats-ordinary');assert.equal(classify(-1,.1),'counter-neutralizes-within-margin');assert.equal(classify(-2,-1.01),'ordinary-dominates-this-proxy');assert.equal(classify(-2,-1),'inconclusive');
 const bouts=seedTable().flatMap(({cluster})=>['P1','P2'].map(counterSeat=>({cluster,counterSeat,elapsedSec:300,counterHits:counterSeat==='P1'?15:0,ordinaryHits:counterSeat==='P1'?10:15,netHitsPerMin:counterSeat==='P1'?1:-3})));const result=summarizeStudy(bouts);assert.deepEqual(result.clusterBootstrap95,[-1,-1]);assert.equal(result.classification,'counter-neutralizes-within-margin');assert.equal(result.bySeat.P1.meanNetHitsPerMin,1);assert.equal(result.bySeat.P2.meanNetHitsPerMin,-3);assert.throws(()=>summarizeStudy(bouts.slice(1)));
});

test('threat onset preserves already-issued lateral direction in either bearing frame; default-wall blocked side still escapes',()=>{
 for(const seed of [1,2])for(const side of [-1,1]){const result=scriptedDodge(5.25,seed,{side});const before=result.records.find(r=>!r.diagnostic.threat),threat=result.records.find(r=>r.diagnostic.threat);assert.ok(before&&threat);assert.equal(Math.sign(before.command.moveY),Math.sign(threat.command.moveY));assert.equal(result.hits.filter(h=>h.victim==='P1').length,0);}
 for(const seed of [1,2])for(const y of [-4.6,4.6]){const result=scriptedDodge(5.25,seed,{y});assert.equal(result.hits.filter(h=>h.victim==='P1').length,0);assert.ok(result.records.some(r=>r.diagnostic.threat));}
});

test('hidden-body memory may reacquire/retreat but never intentionally chase a far last-seen body',()=>{
 const c=createHumanCounter(),visible=view();visible.opponent.position=vec(7,0);assert.ok(c.act(visible,1/30).moveX>0);
 const hidden=view(4);hidden.opponent=null;hidden.opponentSpear=null;const command=c.act(hidden,1/30);assert.ok(command.moveX<=1e-12);assert.equal(command.throw,false);assert.ok(c.diagnostics().estimatedEnemy);
 hidden.time.elapsedSec=1; c.act(hidden,1/30);assert.equal(c.diagnostics().estimatedEnemy,null);
});
