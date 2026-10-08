import {parentPort} from 'node:worker_threads';
import {createHash} from 'node:crypto';
import {runGameBout} from '../arena/core.mjs';
import * as tether from '../arena/tether-adapter.mjs';
import {createMind} from '../src/mind/index.mjs';
import {STRATEGIES} from '../src/agents/strategies.mjs';
import {reactiveDodger} from '../src/agents/dodger.mjs';
const action=a=>[a.moveX??0,a.moveY??0,a.aimX??0,a.aimY??0,!!a.throw,!!a.recall];
const stateOf=n=>n<0?'behind':n>0?'ahead':'tied';
function run(job,variant){
 const mind=createMind({seed:job.seed,cognitionBudget:192,captureTrace:true,ablations:variant==='full'?{}:{noAffect:true}});
 const rival=job.opponent==='reactiveDodger'?reactiveDodger():STRATEGIES[job.opponent]();
 const i=job.seat-1,id=`P${job.seat}`,other=`P${3-job.seat}`,actions=[],stateAtTick=[],hash=createHash('sha256');
 const strata=Object.fromEntries(['ahead','tied','behind'].map(k=>[k,{ticks:0,hits:0,taken:0,throws:0,recalls:0,focusSwitches:0,cycles:0}]));
 const adapter={...tether,observeStep(m,ctx){tether.observeStep(m,ctx);const a=JSON.stringify(action(ctx.inputs[i]));actions.push(a);hash.update(a+'\n');
  const scores=ctx.views[i].scores,state=stateOf(scores[id]-scores[other]);stateAtTick.push(state);const s=strata[state];s.ticks++;
  for(const e of ctx.events){if(e.type==='THROW'&&e.player===id)s.throws++;if(e.type==='RECALL'&&e.player===id)s.recalls++;if(e.type==='HIT'){if(e.attacker===id)s.hits++;if(e.victim===id)s.taken++;}}
 }};
 const result=runGameBout({game:tether.game,adapter,agents:i===0?[mind,rival]:[rival,mind],mode:job.mode,seed:job.seed,durationSec:job.durationSec});
 if(result.elapsedSec!==job.durationSec)throw Error('incomplete bout duration');
 let switches=0;for(const row of mind.trace()){const s=strata[stateAtTick[Math.min(stateAtTick.length-1,Math.max(0,Math.round(row.time*120)))]];s.cycles++;if(row.ignition){switches++;s.focusSwitches++;}}
 const c=mind.cognition();if(c.budgetLimit!==192||c.maxBudgetSpent>192||c.budgetSpent>c.cycles*192)throw Error('budget violation');
 const margin=result.score[id]-result.score[other];
 return {actions,record:{variant,actionHash:hash.digest('hex'),score:result.score,elapsedSec:result.elapsedSec,
  metrics:{scoreMargin:margin,win:margin===0?.5:margin>0?1:0,focusSwitchesPerMinute:switches/(result.elapsedSec/60)},strata,cognition:c}};
}
export function runPair(job){const a=run(job,'full'),b=run(job,'noAffect');if(a.actions.length!==b.actions.length)throw Error('unmatched action lengths');
 let differingTicks=0,differingDecisionTicks=0;for(let i=0;i<a.actions.length;i++)if(a.actions[i]!==b.actions[i]){differingTicks++;if(i%4===0)differingDecisionTicks++;}
 return {...job,full:a.record,noAffect:b.record,comparison:{sameActionHash:a.record.actionHash===b.record.actionHash,differingTicks,differingDecisionTicks,inputTicks:a.actions.length}};
}
parentPort?.on('message',job=>{try{parentPort.postMessage({row:runPair(job)});}catch(e){parentPort.postMessage({error:e.stack});}});
