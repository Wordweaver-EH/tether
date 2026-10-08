import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createWorld} from '../repo/src/sim.js';
import {percept} from '../repo/src/perception.js';
import {sensorPacket,motorTransform,noiseSample} from '../repo/benchmark/interface.mjs';
import {createHumanCounter} from '../repo/human-proxy/counter.mjs';
import {createHumanInterface} from '../repo/human-proxy/interface.mjs';
import {createComparisonCounter,arbitrate} from './controller.mjs';
import {createAwareness} from './frozen-awareness.mjs';
import {packet,spear,vec,emptyArena} from '../sensor-awareness-v1/fixtures.mjs';
import {hash,PROTOTYPE_SHA,runManifest,seedTable,smokeSeed} from './protocol.mjs';
const baseCommand={moveX:.6,moveY:.8,aimX:1,aimY:0,throw:true,recall:true};
const assessment=movement=>({warning:true,proposal:{scanAim:{x:-1,y:0},movement}});
test('arbitration exact no warning and unchanged passthrough',()=>{
 for(const arm of ['unchanged','awareness']){const result=arbitrate(baseCommand,{warning:false},arm);assert.deepEqual(result.command,baseCommand);assert.equal(result.scan,false);}
 assert.deepEqual(arbitrate(baseCommand,assessment({x:0,y:1}),'unchanged').command,baseCommand);
 assert.throws(()=>arbitrate(baseCommand,{warning:false},'other'));
});
test('scan uses sole aim, withholds throw, preserves recall and exact certified movement',()=>{
 const movement={x:Math.SQRT1_2,y:-Math.SQRT1_2};const r=arbitrate(baseCommand,assessment(movement),'awareness');
 assert.deepEqual(r.command,{moveX:movement.x,moveY:movement.y,aimX:-1,aimY:0,throw:false,recall:true});assert.equal(r.withheldThrow,true);assert.equal(r.movementOverride,true);assert.equal(r.scanAimDisplacementRad,Math.PI);
 const tx=motorTransform(r.command,0,.75);assert.equal(tx.command.moveX,movement.x);assert.equal(tx.command.moveY,movement.y);assert.equal(tx.command.throw,false);assert.equal(tx.command.recall,true);assert.ok(tx.sigma>0);
 const scanOnly=arbitrate(baseCommand,assessment(null),'awareness');assert.equal(scanOnly.command.moveX,.6);assert.equal(scanOnly.command.moveY,.8);assert.equal(scanOnly.movementOverride,false);
});
test('unchanged wrapper byte-equivalent through actual motor commits on synthetic packet sequence',()=>{
 const wrapped=createComparisonCounter({seed:23,arm:'unchanged'}),original=createHumanCounter({seed:23});let angle=0;
 for(let i=0;i<40;i++){
  const p=packet({time:i/30,position:vec(-5.5,0),facing:i<15?vec(-1,0):vec(1,0),visible:i<3?spear('EMBEDDED',-8,0):null});
  const a=wrapped.act(p,1/30),b=original.act(p,1/30);assert.deepEqual(a,b);const tx=motorTransform(a,angle,noiseSample(9,'P1',i));angle=tx.previousAngle;
  wrapped.commitCommand(tx.command,p,p.time.elapsedSec+.25);original.commitCommand(tx.command,p,p.time.elapsedSec+.25);assert.deepEqual(wrapped.totals(),original.totals());
 }
});
test('quiet awareness is byte-equivalent; real frozen warning integrates exact scan/movement',()=>{
 const p0=packet({time:0,position:vec(-5.5,0),facing:vec(-1,0),visible:spear('EMBEDDED',-8,0),arena:emptyArena()});
 const p1=packet({time:.5,position:vec(-5.5,0),facing:vec(1,0),visible:null,arena:emptyArena()});
 const a=createComparisonCounter({seed:1,arm:'awareness'}),b=createHumanCounter({seed:1});
 const c=a.act(p0,1/30);assert.deepEqual(c,b.act(p0,1/30));a.commitCommand(c,p0,.25);b.commitCommand(c,p0,.25);
 const out=a.act(p1,1/30),d=a.diagnostics();assert.equal(d.assessment.warning,true);assert.equal(d.scan,true);assert.equal(out.aimX,-1);assert.equal(out.aimY,0);assert.equal(out.throw,false);assert.equal(out.moveX,d.assessment.proposal.movement.x);assert.equal(out.moveY,d.assessment.proposal.movement.y);
});
test('final issued movement reaches awareness tie memory, and suppressed throw is not committed as throw',()=>{
 const controller=createComparisonCounter({seed:1,arm:'awareness'});
 const p0=packet({time:0,position:vec(-5.5,0),facing:vec(-1,0),visible:spear('EMBEDDED',-8,0),arena:emptyArena()});
 controller.act(p0,1/30);controller.commitCommand({moveX:0,moveY:1,aimX:-1,aimY:0,throw:false,recall:false},p0,.25);
 const p1=packet({time:.5,position:vec(-5.5,0),facing:vec(1,0),visible:null,arena:emptyArena()});p1.own.spear=null;
 const c=controller.act(p1,1/30),d=controller.diagnostics();assert.equal(c.moveY,1);assert.equal(d.base.ownSpearState,'HELD');assert.equal(c.throw,false);
});
test('existing interface provides exactly one latency queue, cadence and motor sample',()=>{
 const wrapper=createComparisonCounter({seed:5,arm:'awareness'}),iface=createHumanInterface(wrapper,{episode:15,seat:'P1',diagnostics:true});
 for(let tick=0;tick<70;tick++){const p=packet({time:tick/120,position:vec(-5.5,0)});const c=iface.act(p,1/120);if(tick<30)assert.deepEqual(c,{moveX:0,moveY:0,aimX:0,aimY:0,throw:false,recall:false});}
 const rows=iface.records();assert.equal(rows.length,10);let previous=0;
 for(let i=0;i<rows.length;i++){const r=rows[i];assert.equal(r.receiptTime,(30+4*i)/120);assert.equal(r.sensorTime,4*i/120);const tx=motorTransform(r.diagnostic.command,previous,noiseSample(15,'P1',i));assert.deepEqual(tx.command,r.command);assert.equal(tx.sigma,r.sigma);assert.equal(tx.sample,r.sample);previous=tx.previousAngle;}
});
test('actual MODE_B packet excludes enemy target; unused truth sentinels cannot enter controllers',()=>{
 const world=createWorld();world.spears[1].recallTarget={x:123,y:456};const p=sensorPacket(percept(world,'P1','MODE_B'));
 assert.equal(Object.hasOwn(p.opponentSpear,'recallTarget'),false);
 for(const name of ['world','currentEnemyState','enemyRecallTarget','events','enemyCommands'])Object.defineProperty(p,name,{get(){throw Error(`forbidden ${name}`);}});
 const controller=createComparisonCounter({arm:'awareness'});assert.doesNotThrow(()=>controller.act(p,1/30));
 const q=packet({visible:spear('EMBEDDED',-8,0),facing:vec(-1,0)});
 for(const name of ['opponent','hiddenWorld'])Object.defineProperty(q,name,{get(){throw Error(`awareness forbidden ${name}`);}});
 Object.defineProperty(q.opponentSpear,'recallTarget',{get(){throw Error('enemy endpoint');}});
 assert.doesNotThrow(()=>createAwareness().observe(q,.25));
});
test('frozen prototype byte identity and exact fresh paired manifest',()=>{
 assert.equal(hash(readFileSync(new URL('./frozen-awareness.mjs',import.meta.url))),PROTOTYPE_SHA);
 const rows=runManifest();assert.equal(rows.length,128);assert.equal(new Set(rows.map(r=>r.boutId)).size,128);assert.equal(seedTable().length,32);
 for(let cluster=0;cluster<32;cluster++){const group=rows.filter(r=>r.cluster===cluster);assert.equal(group.length,4);for(const k of ['episodeId','counterSeed','ordinarySeed'])assert.equal(new Set(group.map(r=>r[k])).size,1);for(const seat of ['P1','P2'])assert.deepEqual(group.filter(r=>r.counterSeat===seat).map(r=>r.arm),cluster%2?['awareness','unchanged']:['unchanged','awareness']);}
 const values=rows.map(r=>r.episodeId);assert.equal(values.includes(smokeSeed().episodeId),false);
});
