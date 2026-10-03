import test from 'node:test';import assert from 'node:assert/strict';
import * as original from '../src/sim.js';import {percept as originalPercept} from '../src/perception.js';
import {createExperimentalWorld,DEFAULT_CONFIG,mirrorObstacles,step,hashWorld,percept,isVisible,snapshotWorld,restoreWorld} from './world.mjs';
test('nominal world and percept have exact regression parity under synthetic commands',()=>{
 const a=original.createWorld(),b=createExperimentalWorld();assert.deepEqual(a,b);
 for(let i=0;i<720;i++){
  for(const seat of ['P1','P2'])for(const mode of ['MODE_A','MODE_B'])assert.deepEqual(percept(b,seat,mode),originalPercept(a,seat,mode));
  const commands=[{moveY:i<360?1:-1,aimX:1,aimY:.2,throw:i===20,recall:i===100},{moveY:i<360?-1:1,aimX:-1,aimY:-.2,throw:i===40,recall:i===150}];
  assert.deepEqual(step(a,commands),step(b,commands));assert.equal(hashWorld(a),hashWorld(b));
 }
 assert.deepEqual(a,b);
});
test('mirror geometry is involutive and physically/publicly consistent',()=>{
 const mirrored=mirrorObstacles();assert.deepEqual(mirrorObstacles(mirrored),DEFAULT_CONFIG.obstacles);
 const w=createExperimentalWorld({id:'mirror',obstacles:mirrored});assert.deepEqual(w.experiment.OBSTACLES,mirrored);
 assert.deepEqual(percept(w,'P1','MODE_B').arena.obstacles,mirrored);assert.deepEqual(w.players,original.createWorld().players);
});
test('physics scales both projectile directions and player turn, FOV uses total angle',()=>{
 for(const scale of [.75,1.25]){const w=createExperimentalWorld({spearSpeedScale:scale,turnScale:scale});assert.equal(w.experiment.OUTBOUND_SPEED,12*scale);assert.equal(w.experiment.RETURN_SPEED,12*scale);assert.equal(w.experiment.TURN_RATE_RAD,2*Math.PI*scale);
  step(w,[{aimX:1,throw:true},{}]);const x=w.spears[0].position.x;step(w,[{},{}]);assert.ok(Math.abs(w.spears[0].position.x-x-12*scale/120)<1e-12);
 }
 for(const delta of [-20,20]){const w=createExperimentalWorld({fovDeltaDegrees:delta});assert.ok(Math.abs(percept(w,'P1','MODE_B').cone.totalAngleRad-(120+delta)*Math.PI/180)<1e-12);}
 const target={x:Math.cos(65*Math.PI/180),y:Math.sin(65*Math.PI/180)};
 assert.equal(isVisible({x:0,y:0},{x:1,y:0},target),false);assert.equal(isVisible({x:0,y:0},{x:1,y:0},target,70*Math.PI/180),true);
});
test('shift serialization retains geometry and rule identity',()=>{const w=createExperimentalWorld({obstacles:mirrorObstacles(),spearSpeedScale:.75,fovDeltaDegrees:20});const restored=restoreWorld(JSON.parse(JSON.stringify(snapshotWorld(w))));assert.deepEqual(w,restored);assert.equal(hashWorld(w),hashWorld(restored));assert.notEqual(hashWorld(w),hashWorld(original.createWorld()));});
test('reject unknown metadata and invalid geometry',()=>{assert.throws(()=>createExperimentalWorld({hiddenTruth:1}));assert.throws(()=>createExperimentalWorld({fovDeltaDegrees:40}));assert.throws(()=>createExperimentalWorld({obstacles:[{id:'A',minX:-6,maxX:-5,minY:-1,maxY:1},DEFAULT_CONFIG.obstacles[1]]}));});
test('actual turning and recall displacement follow shifted physics',()=>{
 for(const scale of [.75,1,1.25]){
  const w=createExperimentalWorld({turnScale:scale,spearSpeedScale:scale});step(w,[{aimX:0,aimY:1},{}]);
  assert.ok(Math.abs(Math.atan2(w.players[0].facing.y,w.players[0].facing.x)-2*Math.PI*scale/120)<1e-13);
  w.spears[0]={owner:'P1',state:'EMBEDDED',position:{x:-8,y:0},direction:{x:-1,y:0},embedSurfaceId:'WALL_W',recallTarget:null};
  const events=step(w,[{recall:true},{}]);assert.equal(w.spears[0].state,'RETURNING');assert.ok(events.some(e=>e.type==='RECALL_START'));
  assert.ok(Math.abs(w.spears[0].position.x-(-8+12*scale/120))<1e-13);assert.equal(w.spears[0].position.y,0);
 }
});
