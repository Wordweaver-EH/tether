import {createCompactor,learningSupport} from './compact.mjs';
import {createObservedController} from './observer-proxy.mjs';
import {createFaithfulnessObserver} from './faithfulness.mjs';
import {cpus} from 'node:os';
import {createResolvedWorld,step,percept,hashWorld} from './world.mjs';
import {createBenchmarkController,createInterface,sensorPacket} from '../benchmark/interface.mjs';
import {STRATEGIES} from '../src/agents/strategies.mjs';
import {sha256} from './raw-stream.mjs';
const q=(a,p)=>a.length?a[Math.floor((a.length-1)*p)]:null;
export function createFocal(arm,task,memorySnapshot) {
 return createBenchmarkController(arm.kind,{seed:task.controllerSeed,vector:arm.vector,level:arm.level??0,mindOptions:{...structuredClone(arm.mindOptions??{}),memorySnapshot:structuredClone(memorySnapshot),cognitionBudget:192,captureTrace:false,captureDiagnostics:true}});
}
export function runTask({task,arm,config,memorySnapshot,opponentSpec=null,provenance,limits},stream) {
 if(task.mode!=='MODE_B'||![0,1].includes(task.seat)||!Number.isFinite(task.seconds)||task.seconds<=0||task.seconds>300)throw new Error('invalid task');
 const mind=arm.kind==='mind',controller=createFocal(arm,task,memorySnapshot);
 const acceptedMemory=mind?controller.memory():null,acceptedInitialMemorySha256=acceptedMemory?sha256(acceptedMemory):null;
 const rawStream=stream,compactor=createCompactor();stream={append(record){for(const row of compactor.transform(record))rawStream.append(row);}};
 const opponent=opponentSpec?createBenchmarkController('param',{vector:opponentSpec.vector,seed:task.opponentSeed}):STRATEGIES[task.opponent]?.({outboundSpeed:12,returnSpeed:12});
 if(!opponent)throw new Error('missing frozen opponent');
 const ids=['P1','P2'],focalId=ids[task.seat];
 const {proxy:observedController,observed}=createObservedController(controller);
 const faithfulness=createFaithfulnessObserver({episode:task.episodeSeed,seat:focalId});
 const focal=createInterface(observedController,{episode:task.episodeSeed,seat:focalId,calibration:mind?(arm.mindOptions?.freezeLearning?'shadow':'native'):false});
 const other=createInterface(opponent,{episode:task.episodeSeed,seat:ids[1-task.seat]});const agents=task.seat===0?[focal,other]:[other,focal];
 const world=createResolvedWorld(config),initialHash=hashWorld(world),times=[],truthQueue=[];
 let peakRss=process.memoryUsage().rss,nominalWork=0,decisionCount=0,interfaceWallMs=0,nonDecisionWallMs=0,observerWallMs=0;
 const plannerWork={candidates:0,hypotheses:0,completedTrajectories:0,integrationSteps:0,fallbackDecisions:0};
 stream.append({type:'task-start',task,arm,config,provenance,runtime:{node:process.version,platform:process.platform,arch:process.arch,cpuModel:cpus()[0]?.model,logicalCpuCount:cpus().length,execArgv:process.execArgv},inputMemorySha256:memorySnapshot?sha256(memorySnapshot):null,acceptedInitialMemorySha256,initialLearningSupport:learningSupport(acceptedMemory),initialHash,initialTruth:{players:world.players,spears:world.spears},randomness:{worldSeedUsed:false,opponentSeedUsed:!!opponentSpec,controllerSeedUsed:true,motorSeedUsed:true}});
 const start=performance.now(),cpuStart=process.cpuUsage();
 for(let tick=0;tick<Math.round(task.seconds*120);tick++){
  if(world.ended)throw new Error('world ended early');
  const views=ids.map(id=>percept(world,id,task.mode));
  if(tick%4===0)truthQueue.push({tick,sensorTime:world.elapsedSec,perceptHashes:views.map(v=>sha256(sensorPacket(v))),visibility:views.map(v=>({opponent:!!v.opponent,opponentSpear:!!v.opponentSpear,ownSpear:!!v.own.spear}))});
  const decision=tick>=18&&(tick-18)%4===0;
  const inputs=agents.map((agent,index)=>{if(index!==task.seat)return agent.act(views[index],1/120);const t=performance.now();const result=agent.act(views[index],1/120);const elapsed=performance.now()-t;interfaceWallMs+=elapsed;if(decision)times.push(elapsed);else nonDecisionWallMs+=elapsed;return result;});
  if(decision){
   const observerStarted=performance.now(),sensorTruth=truthQueue.shift();if(sensorTruth?.tick!==tick-18)throw new Error('logger sensor capture schedule mismatch');
   const {proposed,committed,commitTime}=observed;
   decisionCount++;const diagnostic=mind?observed.lastDecision:arm.kind==='robust'?controller.diagnostics():null;
   if(mind)nominalWork+=diagnostic.cognition.budget.spent;
   if(arm.kind==='robust'){for(const k of ['candidates','hypotheses','completedTrajectories','integrationSteps'])plannerWork[k]+=diagnostic[k];if(diagnostic.fallback)plannerWork.fallbackDecisions++;}
   const report=mind?controller.report():null;const invariants=faithfulness.observe({decision:decisionCount-1,diagnostic:mind?diagnostic:null,report,proposed,actuator:inputs[task.seat],committed,commitTime,receiptTime:world.elapsedSec,receiptTick:tick,sensorTick:sensorTruth.tick});
   // Logger truth is captured only after both act calls, never passed to controllers.
   stream.append({type:'decision',tick,receiptTime:world.elapsedSec,sensorTime:sensorTruth.sensorTime,decisionIndex:decisionCount-1,inputs,preMotorCommand:proposed,committedCommand:committed,commitTime,report,invariants,diagnostic,nativePending:mind?(observed.cognition?.pendingOutcome??null):null,truth:{players:world.players,spears:world.spears},sensorTruth,currentVisibility:views.map(v=>({opponent:!!v.opponent,opponentSpear:!!v.opponentSpear,ownSpear:!!v.own.spear})),focalInterfaceMs:times.at(-1)});
   observerWallMs+=performance.now()-observerStarted;
  }
  const events=step(world,inputs);if(world.tick%120===0)stream.append({type:'world-checkpoint',tick:world.tick,time:world.elapsedSec,hash:hashWorld(world)});for(const event of events)stream.append({type:'event',tick:world.tick,time:world.elapsedSec,event});
  if(tick%120===0){peakRss=Math.max(peakRss,process.memoryUsage().rss);
   if(peakRss>limits.maxTaskRssBytes)throw new Error('task RSS ceiling exceeded');
   if(performance.now()-start>limits.maxTaskWallSeconds*1000)throw new Error('task wall ceiling exceeded');
  }
 }
 const terminalObserverStarted=performance.now();
 // No finish(percept/worldTruth): unresolved delayed records remain censored.
 for(const row of focal.finishCalibration())stream.append({type:'calibration',row});
 times.sort((a,b)=>a-b);const score=world.players.map(p=>p.score),memory=mind?controller.memory():null;
 const outputMemorySha256=memory?sha256(memory):null;
 const terminalCoordination=mind?controller.coordination():null;
 if(terminalCoordination?.monitor?.pending)stream.append({type:'c2-terminal-pending',origin:'evaluator-boundary-censor',censored:true,receiptTime:world.elapsedSec,pending:terminalCoordination.monitor.pending});
 if(arm.mindOptions?.freezeLearning&&outputMemorySha256!==acceptedInitialMemorySha256)throw new Error('freezeLearning persistent memory changed after accepted constructor state');
 const terminalObserverWallMs=performance.now()-terminalObserverStarted,cpu=process.cpuUsage(cpuStart);
 const result={taskId:task.id,acceptedInitialMemorySha256,freezeLearningInvariant:arm.mindOptions?.freezeLearning?{unchanged:outputMemorySha256===acceptedInitialMemorySha256}:null,score,elapsedSec:world.elapsedSec,netScorePerMinute:60*(score[task.seat]-score[1-task.seat])/world.elapsedSec,finalHash:hashWorld(world),outputMemorySha256,resources:{wallMs:performance.now()-start,processCpuUserUs:cpu.user,processCpuSystemUs:cpu.system,processCpuScope:'task body through terminal observer; includes both controllers and logging; excludes setup, final task-complete row/stream flush and receipts',decisionCount,decisionMeanMs:times.length?times.reduce((a,b)=>a+b,0)/times.length:null,decisionMedianMs:q(times,.5),decisionP95Ms:q(times,.95),interfaceWallMs,nonDecisionWallMs,observerWallMs,terminalObserverWallMs,observerTimingScope:'post-act focal diagnostic/report extraction, invariant checks and decision/native-record serialization/compression; excludes sensor capture and event rows',terminalObserverTimingScope:'post-loop calibration persistence, memory snapshot/hash, coordinator state and C2 censor persistence; excludes final task-complete row and stream flush',decisionWallSumMs:times.reduce((a,b)=>a+b,0),decisionTimingScope:'focal interface act including unchanged native diagnostic/calibration calls, motor transform and actual command commit; observer processing remains outside',sampledProcessRssMaxBytes:peakRss,processLifetimeRssHighWaterKB:process.resourceUsage().maxRSS,rssScope:'whole child process incl both controllers and logger; sampled once per sim second',nominalMindWork:mind?nominalWork:null,nominalWorkIsPartial:true,plannerWork:arm.kind==='robust'?plannerWork:null,plannerWorkScope:'model trajectory counters only; not total compute'},faithfulness:faithfulness.summary(),terminalCoordination,nativeCognition:mind?controller.cognition():null};
 stream.append({type:'task-complete',result});return {result,memorySnapshot:memory};
}
