import {parentPort} from 'node:worker_threads';
import {runGameBout} from './core.mjs';
import * as tether from './tether-adapter.mjs';
import {createMind} from '../src/mind/index.mjs';
import {STRATEGIES} from '../src/agents/strategies.mjs';
import {reactiveDodger} from '../src/agents/dodger.mjs';

export function runAuditJob(job) {
  const {variant,budget,seed,mode,seat,opponent,durationSec}=job;
  const mind=createMind({seed,difficulty:'normal',cognitionBudget:budget,
    ablations:variant==='full'?{}:{[variant]:true},captureTrace:false});
  const rival=opponent==='mind'?createMind({seed:seed+100000,difficulty:'normal',cognitionBudget:budget,captureTrace:false}):opponent==='reactiveDodger'?reactiveDodger():STRATEGIES[opponent]?.();
  if(!rival)throw new Error(`unknown audit opponent ${opponent}`);
  const i=seat-1, own=`P${seat}`;let inputTicks=0,movementSum=0,aimChanges=0,priorAim=null;
  const third=Array.from({length:3},()=>({throws:0,hits:0,taken:0}));
  const adapter={...tether,observeStep(m,ctx){
    tether.observeStep(m,ctx);inputTicks++;
    const input=ctx.inputs[i];movementSum+=Math.hypot(input.moveX??0,input.moveY??0);
    const aim=[input.aimX??0,input.aimY??0];
    if(priorAim)aimChanges+=Math.hypot(aim[0]-priorAim[0],aim[1]-priorAim[1]);
    priorAim=aim;
    const t=third[Math.min(2,Math.floor(ctx.world.elapsedSec/(durationSec/3)))];
    for(const e of ctx.events){if(e.type==='THROW'&&e.player===own)t.throws++;if(e.type==='HIT'){if(e.attacker===own)t.hits++;if(e.victim===own)t.taken++;}}
  }};
  const result=runGameBout({game:tether.game,adapter,agents:i===0?[mind,rival]:[rival,mind],mode,seed,durationSec});
  const m=result.metrics,c=mind.cognition?.()??null;
  if(!c)throw new Error('Mind v2 cognition() is required; audit cannot silently measure an unbudgeted mind');
  const a=result.score[own],b=result.score[`P${3-seat}`],minutes=result.elapsedSec/60;
  const sum=(xs)=>xs.reduce((s,x)=>s+x,0);
  const metrics={win:a===b ? 0.5 : a>b ? 1 : 0,scoreMargin:a-b,
    throwsPerMinute:m.throws[i]/minutes,recallsPerMinute:m.embedToRecallDelays[i].length/minutes,
    meanRecallDelaySec:m.embedToRecallDelays[i].length?sum(m.embedToRecallDelays[i])/m.embedToRecallDelays[i].length:null,
    lookAwayFraction:m.lookAwaySec[i]/result.elapsedSec,
    scanReversalsPerMinute:m.scanReversals[i]/minutes,
    hitsAfterLookAwayPerMinute:m.hitsWithinOneSecLookAway[i]/minutes,
    secondLocationFraction:m.embedCounts[i]?m.secondLocation[i]/m.embedCounts[i]:null,
    meanMovementInput:movementSum/inputTicks,aimChangePerTick:aimChanges/inputTicks,
    hitsPerThrowCountFirstThird:third[0].throws?third[0].hits/third[0].throws:null,
    hitsPerThrowCountLastThird:third[2].throws?third[2].hits/third[2].throws:null,
    scoreRateFirstThird:(third[0].hits-third[0].taken)/(minutes/3),
    scoreRateLastThird:(third[2].hits-third[2].taken)/(minutes/3),
    budgetSpentPerCycle:c.cycles?c.budgetSpent/c.cycles:0,
    escalationFraction:c.cycles?c.escalations/c.cycles:0,
    automaticFraction:c.cycles?c.automaticDecisions/c.cycles:0,
    reflexFraction:c.cycles?c.reflexes/c.cycles:0,
    learningUpdates:c.learningUpdates,counterfactualBranches:c.counterfactualBranches,
    decisionLatencySec:c.cycles?c.decisionLatencySec/c.cycles:0,
  };
  const limit=c.budgetLimit;
  if(limit!==budget)throw new Error(`requested budget ${budget} != reported ${limit}`);
  for(const key of ['cycles','budgetSpent','escalations','automaticDecisions','reflexes','learningUpdates','counterfactualBranches','decisionLatencySec'])if(!Number.isFinite(c[key]))throw new Error(`missing cognition metric ${key}`);
  if(!Number.isFinite(c.maxBudgetSpent)||c.maxBudgetSpent>budget)throw new Error('per-cycle budget bound unverified or exceeded');
  if(c.budgetSpent>c.cycles*budget+1e-7)throw new Error(`budget exceeded by ${variant}`);
  return {...job,score:result.score,elapsedSec:result.elapsedSec,metrics,cognition:c,thirds:third,budgetValidation:{requested:budget,reported:limit,spent:c.budgetSpent,maxSpent:c.maxBudgetSpent,cycles:c.cycles},technical:mind.settings()};
}
parentPort?.on('message',job=>{try{parentPort.postMessage({row:runAuditJob(job)});}catch(error){parentPort.postMessage({error:error.stack});}});
