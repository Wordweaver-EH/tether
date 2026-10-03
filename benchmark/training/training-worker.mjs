import {createHash} from 'node:crypto';
import {parentPort,workerData} from 'node:worker_threads';
import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';
const root=workerData.repo;
const sim=await import(pathToFileURL(resolve(root,'src/sim.js')));
const {percept}=await import(pathToFileURL(resolve(root,'src/perception.js')));
const {STRATEGIES}=await import(pathToFileURL(resolve(root,'src/agents/strategies.mjs')));
const {createBenchmarkController,createInterface}=await import(pathToFileURL(resolve(root,'benchmark/interface.mjs')));
const memoryHash=value=>value?createHash('sha256').update(JSON.stringify(value)).digest('hex'):null;
const q=(a,p)=>a.length?a[Math.min(a.length-1,Math.floor(p*(a.length-1)))]:null;
export function runTrainingTask(task){
  if(task.mode!=='MODE_B'||!STRATEGIES[task.opponent]||![45,300].includes(task.seconds)||![0,1].includes(task.seat))throw new Error('unsupported default-training task');
  const mind=task.kind==='mind',kind=mind?'mind':task.arm==='conventional'?'param':'robust';
  const controller=createBenchmarkController(kind,{seed:task.controllerSeed,vector:task.vector,level:task.level,
    mindOptions:{memorySnapshot:task.memorySnapshot??null,cognitionBudget:192,captureTrace:false,captureDiagnostics:true}});
  const opponent=STRATEGIES[task.opponent]({outboundSpeed:12,returnSpeed:12});
  const ids=['P1','P2']; const focalId=ids[task.seat];
  const wrapped=createInterface(controller,{episode:task.episodeSeed,seat:focalId,diagnostics:false,calibration:false});
  const other=createInterface(opponent,{episode:task.episodeSeed,seat:ids[1-task.seat],diagnostics:false,calibration:false});
  const agents=task.seat===0?[wrapped,other]:[other,wrapped];
  const world=sim.createWorld(); // Current engine is deterministic and ignores createWorld seed.
  // Only default createWorld is permitted: no experiment overrides or hidden-state controller arguments.
  const initialHash=sim.hashWorld(world),times=[],scoreEvents=[];let spentWall=0,nonDecisionWall=0,cycles=0,tier2=0,nonreflex=0,nominalWork=0;
  const plannerWork={candidates:0,hypotheses:0,completedTrajectories:0,integrationSteps:0,fallbackDecisions:0};
  let peakRss=process.memoryUsage().rss;const cpu=process.cpuUsage(),started=performance.now();
  for(let tick=0;tick<Math.round(task.seconds*120);tick++){
    if(world.ended)throw new Error('training world ended earlier than requested');
    const views=ids.map(id=>percept(world,id,'MODE_B'));const decision=tick>=18&&(tick-18)%4===0;
    const inputs=agents.map((agent,index)=>{if(index!==task.seat)return agent.act(views[index],1/120);
      const start=performance.now();const answer=agent.act(views[index],1/120);const duration=performance.now()-start;
      spentWall+=duration;if(decision)times.push(duration);else nonDecisionWall+=duration;return answer;});
    const events=sim.step(world,inputs);
    for(const event of events)if(event.type==='HIT'||event.type==='RESET')scoreEvents.push({tick:world.tick,event});
    if(decision){cycles++;if(mind){const d=controller.lastDecision();if(!d)throw new Error('missing native training diagnostics');
      if(d.cognition.tier===2)tier2++;if(d.cognition.tier!==0)nonreflex++;nominalWork+=d.cognition.budget.spent;}else if(kind==='robust'){const work=controller.diagnostics();if(!work)throw new Error('missing conventional planner work report');for(const key of ['candidates','hypotheses','completedTrajectories','integrationSteps']){if(!Number.isFinite(work[key])||work[key]<0)throw new Error('invalid planner work count');plannerWork[key]+=work[key];}if(work.fallback)plannerWork.fallbackDecisions++;}}
    if(tick%120===0)peakRss=Math.max(peakRss,process.memoryUsage().rss);
  }
  // No finish(worldTruth) call: delayed, unresolved terminal action remains censored.
  const score=world.players.map(p=>p.score),duration=performance.now()-started,cpuUse=process.cpuUsage(cpu);times.sort((a,b)=>a-b);
  const memorySnapshot=mind?controller.memory():null;
  return {task:{...task,memorySnapshot:task.memorySnapshot?'provided-training-parent':null},inputMemorySHA256:memoryHash(task.memorySnapshot),outputMemorySHA256:memoryHash(memorySnapshot),initialHash,finalHash:sim.hashWorld(world),score,
    randomness:{worldSeedUsed:false,opponentSeedUsed:false,controllerSeedUsed:true,motorSeedUsed:true},elapsedSec:world.elapsedSec,netScorePerMinute:60*(score[task.seat]-score[1-task.seat])/world.elapsedSec,scoreEvents,
    resources:{wallMs:duration,processCpuUserUs:cpuUse.user,processCpuSystemUs:cpuUse.system,processCpuScope:'process-wide; overlapping workers not additive',
      sampledProcessRssMaxBytes:peakRss,rssSampleIntervalSimSeconds:1,decisionTimingScope:'focal interface act including sensor queue/filter, native act, motor transform, command commit; excludes later diagnostic clone and simulation',decisionCount:cycles,decisionMedianMs:q(times,.5),decisionP95Ms:q(times,.95),decisionWallSumMs:times.reduce((a,b)=>a+b,0),
      focalInterfaceWallMs:spentWall,nonDecisionInterfaceWallMs:nonDecisionWall,nominalMindWork:mind?nominalWork:null,nominalWorkIsPartial:true,plannerWork:kind==='robust'?plannerWork:null,plannerWorkScope:'existing model trajectory counters only; excludes base policy/interface/runtime',processLifetimeRssHighWaterKB:process.resourceUsage().maxRSS,highWaterScope:'entire Node process lifetime, not attributable to one worker/task'},
    teaching:mind?{cycles,tier2,nonreflex}:null,memorySnapshot,
    nativePending:mind?controller.cognition().pendingOutcome:null};
}
parentPort.on('message',task=>{try{parentPort.postMessage({ok:true,result:runTrainingTask(task)});}catch(error){parentPort.postMessage({ok:false,error:error.stack,taskId:task.id});}});
