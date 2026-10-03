import test from 'node:test';import assert from 'node:assert/strict';import {createObservedController} from './observer-proxy.mjs';import {createInterface} from '../benchmark/interface.mjs';import {createWorld} from '../src/sim.js';import {percept} from '../src/perception.js';
function fake(){let time=0;const calls=[];const native={act(view,dt){calls.push(['act',structuredClone(view),dt]);time=view.time.elapsedSec;return {moveX:0,moveY:0,aimX:1,aimY:.1,throw:false,recall:false};},lastDecision(){calls.push(['lastDecision']);return {time,cognition:{outcome:null}};},cognition(){calls.push(['cognition']);return {pendingOutcome:null};},commitCommand(...args){calls.push(['commitCommand',...structuredClone(args)]);}};return {native,calls};}
test('transparent proxy keeps timed native call order, arguments, results and commands',()=>{
 const a=fake(),b=fake(),{proxy,observed}=createObservedController(b.native);
 const plain=createInterface(a.native,{episode:123,seat:'P1',calibration:'native'}),wrapped=createInterface(proxy,{episode:123,seat:'P1',calibration:'native'}),world=createWorld();
 for(let tick=0;tick<100;tick++){world.tick=tick;world.elapsedSec=tick/120;const view=percept(world,'P1','MODE_B');assert.deepEqual(plain.act(structuredClone(view),1/120),wrapped.act(structuredClone(view),1/120));}
 assert.deepEqual(a.calls,b.calls);assert.deepEqual(plain.finishCalibration(),wrapped.finishCalibration());assert.ok(observed.lastDecision);assert.ok(observed.cognition);
 const command={x:1},view={x:2};let received;const direct={act(...args){received=args;return command;},commitCommand(){}};const cached=createObservedController(direct);assert.equal(cached.proxy.act(view,.1),command);assert.equal(cached.observed.proposed,command);assert.equal(received[0],view);
});
