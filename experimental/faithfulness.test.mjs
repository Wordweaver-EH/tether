import test from 'node:test';import assert from 'node:assert/strict';import {createFaithfulnessObserver} from './faithfulness.mjs';import {motorTransform,noiseSample} from '../benchmark/interface.mjs';
test('faithfulness retains actual report mismatches and separates motor noise',()=>{
 const proposed={moveX:0,moveY:0,aimX:1,aimY:0,throw:true,recall:false},monitor={category:'unknown',assessed:0,errorEWMA:null,pending:null,lastAssessment:null,lastDisposition:null};
 const cognition={novelty:{valid:true},planStatus:'none',branches:[],coordination:{monitor,deliveries:{report:null}}};
 const diagnostic={time:0,focus:'Hunt',input:proposed,cognition};
 const report={focus:'Hunt',content:null,novelty:cognition.novelty,prediction:{...monitor},completion:{status:'none',bounds:[]},emittedInput:proposed};
 const actuator=motorTransform(proposed,0,noiseSample(1,'P1',0)).command;assert.notDeepEqual(actuator,proposed);
 const observer=createFaithfulnessObserver({episode:1,seat:'P1'});const result=observer.observe({decision:0,diagnostic,report,proposed,actuator,committed:actuator,commitTime:.15,receiptTime:.15});assert.equal(result.mismatches.length,0);
 const bad=createFaithfulnessObserver({episode:1,seat:'P1'});bad.observe({decision:0,diagnostic,report:{...report,focus:'Wrong'},proposed,actuator,committed:actuator,commitTime:.15,receiptTime:.15});assert.equal(bad.summary().counts['workspace-focus'].mismatched,1);assert.equal(bad.summary().mismatches[0].actual,'Wrong');
});
