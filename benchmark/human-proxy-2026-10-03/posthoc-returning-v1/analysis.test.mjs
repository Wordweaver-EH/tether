import test from 'node:test';
import assert from 'node:assert/strict';
import {isVisible,firstReturningPacketTick,packetCanActByImpact,advanceFacing,victimStateAtCollision} from './analysis-math.mjs';
const o={x:0,y:0},f={x:1,y:0};
test('120-degree cone: front, rear, scaled facing and coincidence',()=>{
 assert.equal(isVisible(o,f,{x:1,y:0}),true);
 assert.equal(isVisible(o,f,{x:-1,y:0}),false);
 assert.equal(isVisible(o,f,{x:0,y:1}),false);
 assert.equal(isVisible(o,{x:4,y:0},{x:1,y:1}),true);
 assert.equal(isVisible(o,f,o),true);
});
test('near 60-degree FOV boundary',()=>{
 assert.equal(isVisible(o,f,{x:1,y:Math.sqrt(3)-1e-10}),true);
 assert.equal(isVisible(o,f,{x:1,y:Math.sqrt(3)+1e-10}),false);
});
test('recall step is too early for RETURNING sensor, including both seat phases',()=>{
 assert.equal(firstReturningPacketTick(168,30),202);
 assert.equal(firstReturningPacketTick(170,30),202);
 assert.equal(firstReturningPacketTick(171,30),202);
 assert.equal(firstReturningPacketTick(172,30),206);
 assert.equal(firstReturningPacketTick(170,18),190);
});
test('same-tick command may act before fractional collision',()=>{
 assert.equal(packetCanActByImpact(202,202),true);
 assert.equal(packetCanActByImpact(202,201),false);
});
test('facing honors turn cap, deadzone and counterclockwise half-turn tie',()=>{
 const r={cos:Math.cos(Math.PI/60),sin:Math.sin(Math.PI/60)};
 assert.deepEqual(advanceFacing(f,{aimX:0,aimY:0},Math.hypot,r),f);
 assert.ok(advanceFacing(f,{aimX:0,aimY:1},Math.hypot,r).y>0);
 assert.ok(advanceFacing(f,{aimX:0,aimY:-1},Math.hypot,r).y<0);
 assert.ok(advanceFacing(f,{aimX:-1,aimY:0},Math.hypot,r).y>0);
 const near={x:Math.cos(.01),y:Math.sin(.01)};
 const result=advanceFacing(f,{aimX:near.x,aimY:near.y},Math.hypot,r);
 assert.ok(Math.abs(result.x-near.x)<1e-14&&Math.abs(result.y-near.y)<1e-14);
});
test('reset boundary replaces old facing before next pre-step observation',()=>{
 const previous={x:0,y:1},reset={x:-1,y:0};
 const noAim={aimX:0,aimY:0},r={cos:Math.cos(Math.PI/60),sin:Math.sin(Math.PI/60)};
 assert.deepEqual(advanceFacing(reset,noAim,Math.hypot,r),reset);
 assert.notDeepEqual(advanceFacing(reset,noAim,Math.hypot,r),previous);
});

test('same-tick victim state honors neutralization and P1-before-P2 sweep ordering',()=>{
 const p1complete=[{type:'RECALL_COMPLETE',owner:'P1'}];
 assert.equal(victimStateAtCollision('RETURNING','P1','P2',p1complete),'HELD');
 const p2complete=[{type:'RECALL_COMPLETE',owner:'P2'}];
 assert.equal(victimStateAtCollision('RETURNING','P2','P1',p2complete),'RETURNING');
 assert.equal(victimStateAtCollision('EMBEDDED','P2','P1',[{type:'SPEAR_NEUTRALIZED',spear_owner:'P2'}]),'HELD');
 assert.equal(victimStateAtCollision('OUTBOUND','P1','P2',[{type:'EMBED',owner:'P1'}]),'EMBEDDED');
});
