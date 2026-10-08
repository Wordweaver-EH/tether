import { createMind } from '../../src/mind/index.mjs';
import { createCoverInterface } from '../../src/agents/cover-interface.mjs';
export const PROTOCOL = Object.freeze({version:1,seeds:[5653,6761,7873,8923],seats:['P1','P2'],conditions:['familiar','switch'],variants:['full','monitorOff','fixed'],durationSec:60,switchSec:30,fixedSchedule:{every:30,phase:0},pilotSeed:991,sourceBase:'9361222ce9daaecab51ce3e09efc604d3b142db0'});
export function createSubject({seed,variant='full'}={}) {
 if(!PROTOCOL.variants.includes(variant))throw Error('unknown variant');
 const coordinationControls=variant==='full'?{}:variant==='monitorOff'?{monitorControl:false}:{monitorControl:false,fixedMonitorSchedule:PROTOCOL.fixedSchedule};
 const mind=createMind({seed,benchmarkInterface:true,deferCommand:true,captureTrace:false,captureDiagnostics:true,ablations:{noLearning:true},coverControl:{},coordinationControls});
 return {...mind,...createCoverInterface(mind,{seed})};
}
