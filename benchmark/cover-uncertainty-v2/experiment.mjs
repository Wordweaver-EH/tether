import {createMind} from '../../src/mind/index.mjs';
import {createCoverInterface} from '../../src/agents/cover-interface.mjs';
import {createCoverCalibratedMonitor} from '../../src/agents/cover-calibrated-monitor.mjs';
export const PROTOCOL=Object.freeze({version:2,fitSeeds:[1103,2203],calibrationSeeds:[3301,4409],pilotSeeds:[991],
  evaluationSeeds:[5107,6211,7307,8423],seats:['P1','P2'],conditions:['familiar','switch'],
  variants:['full','monitorOff','scheduled'],durationSec:60,switchSec:30,
  sourceBase:'386ad071ccc954550f81f624c3d309f23fe976a0',scope:'trained prediction and checking; no trained action habits'});
export function countYokedSchedule(count,total,seed){
  if(!Number.isInteger(count)||!Number.isInteger(total)||count<0||count>total||total<1)throw Error('invalid schedule dose');
  // One independently seeded phase; no full intervention times are inputs.
  const phase=((Math.imul(seed>>>0,1664525)+1013904223)>>>0)/4294967296;
  return Array.from({length:count},(_,i)=>Math.floor((i+phase)*total/count));
}
export function createSubject({seed,variant='full',model=null,schedule=null,embodied=true}){
  if(!['training',...PROTOCOL.variants].includes(variant))throw Error('invalid variant');
  if(variant==='scheduled'&&!Array.isArray(schedule))throw Error('scheduled arm requires explicit count-yoked schedule');
  const calibratedMonitoring=model?createCoverCalibratedMonitor({model,schedule:variant==='scheduled'?schedule:null}):null;
  if(variant!=='training'&&!model)throw Error('frozen model required');
  const mind=createMind({seed,benchmarkInterface:true,deferCommand:true,captureTrace:false,captureDiagnostics:true,
    ablations:{noLearning:true},coverControl:{},calibratedMonitoring,
    coordinationControls:{monitorControl:variant==='full'||variant==='scheduled'}});
  return embodied?{...mind,...createCoverInterface(mind,{seed})}:mind;
}
