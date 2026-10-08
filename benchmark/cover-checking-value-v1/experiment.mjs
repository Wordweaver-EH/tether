import {createUniformActionChooser,chooseCheckingAction} from '../../src/mind/checking-value.mjs';
import {VALUE_EMBODIMENT} from '../../src/agents/cover-checking-value.mjs';
export const PROTOCOL=Object.freeze({version:1,windows:20,windowSeconds:VALUE_EMBODIMENT.windowTicks/30,durationSensorSec:64,durationSimulationTicks:64*120+19,
 trainSeeds:[12011,12037,12041,12043,12049,12071,12073,12097,12101,12107,12109,12113],developmentSeeds:[23003,23011,23017],evaluationSeeds:[34019,34031,34033,34039,34057,34061],seats:['P1','P2'],
 variants:['learned','monitor','off','scheduled','alwaysCheck','shuffled','ordinaryRefresh'],ridge:1,shuffleSeed:7241,primary:'raw public total score-margin delta over fixed 3.2-second sensor-time windows',trainingTarget:'raw public total score margin minus .0005 per extra executed operation',scope:'restricted-processing embodiment; fixed tactical routine; learned allocation only'});
export function countMatchedActions(actions,seed){
 // Uniform seeded permutation of the multiset. Receives action counts only,
 // deliberately discarding donor times/order before permutation.
 const counts={continue:0,check:0,reconsider:0};for(const a of actions){if(!(a in counts))throw Error('unknown action');counts[a]++;}
 const sequence=Object.entries(counts).flatMap(([a,n])=>Array(n).fill(a));let x=seed>>>0;
 for(let i=sequence.length-1;i>0;i--){x=(Math.imul(x,1664525)+1013904223)>>>0;const j=Math.floor(x/4294967296*(i+1));[sequence[i],sequence[j]]=[sequence[j],sequence[i]];}return sequence;
}
export function selector({variant,seed,model,shuffledModel,schedule}){
 if(variant==='training')return createUniformActionChooser((seed^0x739ae31)>>>0);
 if(variant==='learned'||variant==='shuffled')return features=>({action:chooseCheckingAction(variant==='learned'?model:shuffledModel,features),propensity:1});
 if(variant==='scheduled'){if(!schedule||schedule.length!==PROTOCOL.windows)throw Error('schedule needs complete dose');return(_,{window})=>({action:schedule[window],propensity:1});}
 if(variant==='alwaysCheck')return()=>({action:'check',propensity:1});
 if(['off','ordinaryRefresh','monitor'].includes(variant))return()=>({action:'continue',propensity:1});
 throw Error('unknown variant');
}
