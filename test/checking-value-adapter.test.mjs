import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld} from '../src/sim.js';
import {percept} from '../src/perception.js';
import {createValueController,reconsiderMove,VALUE_EMBODIMENT} from '../src/agents/cover-checking-value.mjs';
import {countMatchedActions,PROTOCOL} from '../benchmark/cover-checking-value-v1/experiment.mjs';
import {runBout} from '../benchmark/cover-checking-value-v1/run.mjs';
const view=t=>{const v=percept(createWorld({gameMode:'COVER_CONTROL'}),'P1','MODE_B');v.time.elapsedSec=t;v.opponent={position:{x:0,y:0},velocity:{x:1,y:0},facing:{x:-1,y:0}};return v;};
const controller=action=>createValueController({selectAction:()=>({action,propensity:1/3}),windows:2});
test('unprocessed opponent fields cannot affect continue behavior or features',()=>{
 const a=controller('continue'),b=controller('continue');a.act(view(0));b.act(view(0));
 for(let i=1;i<30;i++){const x=view(i/30),y=view(i/30);y.opponent.position={x:999,y:-999};y.opponent.velocity={x:99,y:99};y.opponentSpear={state:'OUTBOUND',position:{x:-5,y:0},direction:{x:1,y:0}};assert.deepEqual(a.act(x),b.act(y));assert.deepEqual(a.lastDecision(),b.lastDecision());}
});
test('checking acquires only legal delivered observation and imposes exact embargo',()=>{
 const a=controller('check');for(let i=0;i<96;i++){const v=view(i/30);if(i===1)v.opponent.position.x=2;a.act(v);const d=a.lastDecision();if(i===1)assert.equal(d.belief.position.x,2);assert.equal(d.embargo,i<3);if(i<3){assert.equal(d.command.moveX,0);assert.equal(d.command.throw,false);}}
 a.act(view(96/30));const row=a.completed()[0];assert.equal(row.embargoTicks,3);assert.equal(row.acquisitions,11);assert.equal(row.extraWork,11);assert.equal(row.endTime-row.startTime,3.2);
});
test('reconsider performs actual bounded work and does not process unseen refresh',()=>{
 const a=controller('reconsider');a.act(view(0));const d=a.lastDecision();assert.equal(d.intervention.planner.work,120);assert.equal(d.intervention.planner.trajectories.length,10);
 for(let i=1;i<96;i++){const v=view(i/30);v.opponent.position.x=99;a.act(v);if(i<30)assert.equal(a.lastDecision().belief.position.x,0);}a.act(view(3.2));const row=a.completed()[0];assert.equal(row.extraWork,120);assert.equal(row.embargoTicks,6);assert.equal(row.acquisitions,0);assert.equal(row.reconsiderCompleted,true);
});
test('planner can genuinely change movement from cached threat geometry',()=>{
 const v=view(0),p=reconsiderMove({own:{...v.own,position:{x:0,y:0}},belief:{position:{x:-2,y:0},facing:{x:1,y:0},time:0},routine:{x:1,y:0},arena:v.arena,time:0});assert.equal(p.changed,true);assert.notDeepEqual(p.move,{x:1,y:0});
});
test('ring task reward is retained; reward never invents a hit label',()=>{
 const a=controller('continue');for(let i=0;i<=96;i++){const v=view(i/30);if(i===96)v.scores.P1=1;a.act(v);}assert.equal(a.completed()[0].taskReward,1);assert.equal(a.completed()[0].reward,1);assert.equal(a.completed()[0].resetCount,0);
});
test('schedules match both action counts without receiving donor order',()=>{
 const actions=['check','continue','reconsider','check','continue'];assert.deepEqual(countMatchedActions(actions,91),countMatchedActions([...actions].reverse(),91));assert.deepEqual([...countMatchedActions(actions,91)].sort(),[...actions].sort());
});
test('full-horizon endpoint observes all windows including final reset-free window',()=>{
 const b=runBout({seed:7,seat:'P1',family:'stationary',variant:'off',windows:2});assert.equal(b.windows.length,2);assert.equal(b.windows[1].endTime.toFixed(5),'6.40000');assert.equal(b.summary.embargoSeconds,0);assert.deepEqual(b.summary.counts,{continue:2,check:0,reconsider:0});
});
test('3.2s window phases do not lock to one-second passive refresh',()=>{assert.equal(VALUE_EMBODIMENT.windowTicks,96);assert.deepEqual(Array.from({length:5},(_,i)=>(i*96)%30),[0,6,12,18,24]);assert.equal(PROTOCOL.durationSensorSec,PROTOCOL.windows*PROTOCOL.windowSeconds);});

test('mapped monitor does not carry a request across an observed reset',()=>{
 const a=createValueController({variant:'monitor',monitorModel:{version:1,velocityGain:0,residualRateThreshold:.01,missingAfterSec:3},windows:2});
 for(let i=0;i<=96;i++){const v=view(i/30);v.opponent.position.x=i===30?2:0;v.own.position={x:i<36?0:-5.5,y:0};if(i>=36)v.scores.P1=1;a.act(v);}
 assert.equal(a.lastDecision().intervention.action,'continue');
});
