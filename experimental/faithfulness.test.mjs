import test from 'node:test';import assert from 'node:assert/strict';import {createFaithfulnessObserver} from './faithfulness.mjs';import {motorTransform,noiseSample} from '../benchmark/interface.mjs';
test('faithfulness retains actual report mismatches and separates motor noise',()=>{
 const proposed={moveX:0,moveY:0,aimX:1,aimY:0,throw:true,recall:false},monitor={category:'unknown',assessed:0,errorEWMA:null,pending:null,lastAssessment:null,lastDisposition:null};
 const cognition={novelty:{valid:true},planStatus:'none',branches:[],coordination:{monitor,deliveries:{report:null}}};
 const diagnostic={time:0,focus:'Hunt',input:proposed,cognition};
 const report={focus:'Hunt',content:null,novelty:cognition.novelty,prediction:{...monitor},completion:{status:'none',bounds:[]},emittedInput:proposed};
 const actuator=motorTransform(proposed,0,noiseSample(1,'P1',0)).command;assert.notDeepEqual(actuator,proposed);
 const observer=createFaithfulnessObserver({episode:1,seat:'P1'});const result=observer.observe({decision:0,diagnostic,report,proposed,actuator,committed:actuator,commitTime:.15,receiptTime:.15,receiptTick:18,sensorTick:0});assert.equal(result.mismatches.length,0);
 const bad=createFaithfulnessObserver({episode:1,seat:'P1'});bad.observe({decision:0,diagnostic,report:{...report,focus:'Wrong'},proposed,actuator,committed:actuator,commitTime:.15,receiptTime:.15,receiptTick:18,sensorTick:0});assert.equal(bad.summary().counts['workspace-focus'].mismatched,1);assert.equal(bad.summary().mismatches[0].actual,'Wrong');
});
test('wrapper tick clock distinguishes harmless world roundoff from wrong latency',()=>{
 const proposed={moveX:0,moveY:0,aimX:0,aimY:0,throw:false,recall:false};
 const observe=({receiptTick=46,sensorTick=28,commitTime=46/120,receiptTime=46*(1/120)}={})=>{const observer=createFaithfulnessObserver({episode:1,seat:'P1'});observer.observe({decision:7,diagnostic:null,report:null,proposed,actuator:proposed,committed:proposed,commitTime,receiptTime,receiptTick,sensorTick});return observer.summary();};
 assert.equal(observe().mismatches.length,0);
 assert.equal(observe({sensorTick:27}).counts['exact-sensor-delay-ticks'].mismatched,1);
 assert.equal(observe({commitTime:46/120+.001}).counts['commit-timestamp'].mismatched,1);
 assert.equal(observe({receiptTime:46/120+.001}).counts['receipt-clock-roundoff-only'].mismatched,1);
});
