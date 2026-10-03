// Adapter for the benchmark's external sensor/motor embodiment only.
import {createParamAgent,decodePolicy} from './param.mjs';
import {createConventionalPlanner} from './robust-baseline.mjs';
export function createRobustBaselineAgent(vector,{seed=1,level=0,publicRules={}}={}){
  const nominal={playerSpeed:4,outboundSpeed:12,returnSpeed:12,turnRate:2*Math.PI,playerRadius:.35};
  if(Object.keys(publicRules).some(k=>!(k in nominal)||publicRules[k]!==nominal[k]))throw new RangeError('benchmark model rules must remain nominal; shifted truth is forbidden');
  const policy=decodePolicy(vector);
  const base=createParamAgent(vector,{seed,latencySec:.15,benchmarkInterface:true,deferCommand:true,
    outboundSpeed:publicRules.outboundSpeed??12,returnSpeed:publicRules.returnSpeed??12});
  if(typeof base.commitCommand!=='function')throw new Error('robust baseline requires deferred-command benchmark interface');
  const planner=createConventionalPlanner({level,publicRules,preferredDistance:policy.preferredDistance,throwAlignment:policy.throwAlignment});
  return {
    act(view,dt){
      const proposed=base.act(view,dt);
      return planner.choose(view,proposed);
    },
    commitCommand(input,view,commandTime){base.commitCommand(input,view,commandTime);planner.commitCommand(input,view,commandTime);},
    settings:()=>({benchmarkInterface:true,latencySec:.15,base:base.settings(),planner:planner.settings()}),
    diagnostics:()=>planner.diagnostics(),
  };
}
