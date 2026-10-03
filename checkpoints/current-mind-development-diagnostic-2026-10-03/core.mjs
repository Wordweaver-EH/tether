// Controller-source-independent runner mechanisms. Real agents are injected only
// by the release-gated CLI; unit tests inject deterministic mock agents.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {FIXTURES,neutral,replayFixture,schedule,geometrySummary} from './fixtures.mjs';

export const clone = value => structuredClone(value);
export const json = value => JSON.stringify(value, (_key,v) => typeof v === 'number' && !Number.isFinite(v) ? {$number:String(v)} : v);
export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value==='object') return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  return value;
}
export const digest = value => createHash('sha256').update(json(canonical(value))).digest('hex');
export const errorData = error => ({name:error.name,message:error.message,stack:error.stack});
const elapsed = start => performance.now()-start;
export function stamp(events,world,phase) {return events.map(event=>({...event,step:world.tick,timestamp:world.elapsedSec,phaseOfObservation:phase}));}
export function checkedSettings(mind,protocol,freezeLearning=false) {
  const settings=mind.settings();
  assert.equal(settings.difficulty,0.5,'default normal difficulty');
  assert.ok(Number.isFinite(settings.latencySec) && Math.abs(settings.latencySec-protocol.sensorLatencySeconds)<=Number.EPSILON*Math.max(1,Math.abs(protocol.sensorLatencySeconds)), 'default sensor latency within machine epsilon');
  assert.equal(Math.round(settings.latencySec*protocol.simulationHz),Math.round(protocol.sensorLatencySeconds*protocol.simulationHz),'same nominal default sensor queue ticks');
  assert.equal(settings.cycleHz,protocol.cognitionHz,'default cycle rate');
  assert.equal(settings.cognitionBudget,192,'default budget');
  assert.equal(settings.policy,'tuned','default policy');
  assert.equal(settings.outboundSpeed,12); assert.equal(settings.returnSpeed,12);
  assert.deepEqual(settings.ablations,{},'no ablations');
  assert.equal(settings.freezeLearning??false,freezeLearning,'explicit learning mode');
  return settings;
}
export function timedAct(mind,view,dt,label,emit=()=>{}) {
  // Clone before starting the timer. Diagnostics and persistence happen after it.
  const argument=clone(view), started=process.hrtime.bigint();
  let input, failure;
  try {input=mind.act(argument,dt)??{};} catch(error) {failure=error;}
  const durationNs=process.hrtime.bigint()-started;
  if (!failure) input=clone(input);
  const record={type:'act',label,percept:view,durationNs:String(durationNs),durationMs:Number(durationNs)/1e6,
    ...(failure?{error:errorData(failure)}:{input})};
  emit(record);
  if(failure) throw failure;
  assert.ok(Number.isFinite(record.durationMs)&&record.durationMs>0,'act timing must be finite and strictly positive');
  return {input,timing:{label,durationNs:String(durationNs),durationMs:Number(durationNs)/1e6}};
}
export function emission(input) {return input?.throw===true?'throw':input?.recall===true?'recall':null;}
export function summarizeConsequences({input,events,initialWorld,finalWorld}) {
  const kind=emission(input);
  const launches=events.filter(e=>(e.type==='THROW'&&e.player==='P1')||(e.type==='RECALL_START'&&e.owner==='P1'));
  assert.ok(launches.length<=1,'only one evaluated physical launch/retrieval is allowed');
  const launch=launches[0]??null;
  const launchIndex=launch?events.indexOf(launch):-1;
  const before=launch?events.slice(0,launchIndex):events;
  const after=launch?events.slice(launchIndex+1):[];
  const backgroundHits=before.filter(e=>e.type==='HIT'&&e.attacker==='P1');
  let resolution=null,terminalReason=null,attributedHit=null;
  if(!kind) {
    assert.equal(launch,null,'no physical launch is attributable to a non-emitted command');
    resolution='non-emission';
  } else if(!launch) resolution='non-execution';
  else {
    for(const event of after) {
      if(event.type==='HIT'&&event.attacker==='P1') {resolution='hit';attributedHit=event;break;}
      if(event.type==='EMBED'&&event.owner==='P1') {resolution='terminal-miss';terminalReason='static-embed';break;}
      if(event.type==='RECALL_COMPLETE'&&event.owner==='P1') {resolution='terminal-miss';terminalReason='return-complete-without-hit';break;}
      if(event.type==='RESET') {resolution='terminal-miss';terminalReason='reset-before-shot-hit';break;}
    }
    if(!resolution) {
      if(['OUTBOUND','RETURNING'].includes(finalWorld.spears[0].state)) resolution='censored';
      else throw new Error('Physical attempt has neither a recorded terminal event nor an in-flight state');
    }
  }
  return {emission:kind,emitted:!!kind,physicalAttempt:!!launch,launch,resolution,terminalReason,
    attributedHit,attributedHits:attributedHit?1:0,backgroundHits,
    physicalAttemptCompleted:resolution==='hit'||resolution==='terminal-miss',
    flightCensored:resolution==='censored',
    pendingDeliveryAtCutoff:false,physicalMotorDelayQueue:false,
    deliveryDisposition:!kind?'no-command':launch?'executed-immediately':'rejected-by-physical-state-not-buffered',
    initialSpearState:initialWorld.spears[0].state,finalSpearState:finalWorld.spears[0].state,
    ownDisplacement:{x:finalWorld.players[0].position.x-initialWorld.players[0].position.x,y:finalWorld.players[0].position.y-initialWorld.players[0].position.y},
    scoreChange:finalWorld.players[0].score-initialWorld.players[0].score};
}
export function decisionSummary(decision,input,expectedSerial=1) {
  assert.ok(decision&&decision.serial===expectedSerial,'decision instrumentation serial must match expected completed cycle');
  assert.deepEqual(decision.input,input,'instrumented emitted input must match first act output');
  const c=decision.cognition;
  for(const field of ['habit','novelty','proposedInput','branches','budget']) assert.ok(c&&c[field]!==undefined,`missing required diagnostic ${field}`);
  const rawBranches=c.branches??[];
  return {serial:decision.serial,time:decision.time,focus:decision.focus,pendingRecallPlan:clone(decision.pendingRecallPlan??null),
    automaticEligible:!!c.habit.automatic,habit:clone(c.habit),novelty:clone(c.novelty),
    stratum:c.novelty.valid===false?'non-applicable':c.novelty.familiar?'familiar':c.novelty.novel?'novel':'non-applicable',
    tier:c.tier,realDeliberation:rawBranches.some(branch=>branch.trials>0||branch.steps>0),tactic:c.tactic,
    branchCount:rawBranches.length,branches:clone(rawBranches),
    completedBranchCount:rawBranches.filter(b=>b.completion?.complete===true||b.complete===true||b.status==='complete').length,
    unresolvedBranchCount:rawBranches.filter(b=>b.completion?.complete===false||b.complete===false||b.status==='unresolved').length,
    // Undefined completion in N is preserved as unknown, never silently complete.
    completionDiagnostics:rawBranches.map(b=>b.completion??b.complete??b.status??null),
    unclassifiedCompletionBranchCount:rawBranches.filter(b=>b.completion===undefined&&b.complete===undefined&&b.status===undefined).length,
    budget:clone(c.budget),preInterventionIntent:clone(c.proposedInput),emittedInput:clone(input),
    preIntent:emission(c.proposedInput),emission:emission(input),
    withheldProposedCommand:!!emission(c.proposedInput)&&!emission(input),
    noCommand:!emission(input),explicitUnresolvedBlock:c.handoffBlocked===true,
    actuatorProvenance:{kind:'diagnostic-evidence-not-consumption-claim',emittedCommand:emission(input),preInterventionCommand:emission(c.proposedInput),finalTactic:c.tactic,eligibleHabitTactic:c.habit.tactic,automaticEligible:!!c.habit.automatic,tier:c.tier,selectedBranch:clone(c.selectedBranch??null),issuedLearningTier:c.issuedLearningTier??null,handoffBlocked:c.handoffBlocked===true,explicitSourceProvenance:clone(c.actuatorProvenance??c.provenance??null)},
    planStatus:c.planStatus??null,selection:clone(c.selection??null),selectedBranch:clone(c.selectedBranch??null),issuedLearningTier:c.issuedLearningTier??null,
    noveltyRequested:c.noveltyRequested??null,noveltyForced:c.noveltyForced??null,
    supportUpdate:clone(c.supportUpdate??null),raw:clone(decision)};
}

export function runArm({arm,createMind,sim,percept,fixture,pair,memorySnapshot,protocol,emit=()=>{}}) {
  const wholeStart=performance.now(),costs={},actTimings=[],events=[];
  let phase='snapshot-copy',world,decision,decisionView,currentView,initialWorld;
  try {
  const snapshotStart=performance.now(),memory=clone(memorySnapshot);
  costs.snapshotCopyMs=elapsed(snapshotStart);
  const initialMemoryDigest=digest(memory);
  phase='allocate'; const allocationStart=performance.now();
  const mind=createMind({...protocol.mindOptions,seed:pair.seed,memorySnapshot:memory});
  costs.mindAllocationMs=elapsed(allocationStart);
  const settings=checkedSettings(mind,protocol);
  const acceptedInitialMemory=mind.memory();
  emit({type:'arm-start',arm,pair,settings,initialMemoryDigest,acceptedInitialMemory});
    phase='replay'; const replayStart=performance.now();
    const replayed=replayFixture(sim,fixture,(world,inputs,found)=>emit({type:'history-step',tick:world.tick,inputs,events:found}));
    world=replayed.world;
    costs.legalHistoryReplayMs=elapsed(replayStart);
    const initialReplayWorld=sim.snapshotWorld(world),prefillViews=[];
    const historyDigest=digest(replayed.history);
    phase='prefill';const prefillStart=performance.now();
    const dt=1/protocol.simulationHz;
    for(let tick=0;tick<protocol.prefillTicks;tick++) {
      const view=percept(world,'P1',protocol.mode);prefillViews.push(clone(view));
      const {input,timing}=timedAct(mind,view,dt,`prefill-${tick}`,emit);actTimings.push(timing);
      assert.deepEqual(input,neutral(),'prefill must emit neutral input');
      assert.equal(mind.cognition().cycles,0,'prefill must not make any decision');
      assert.equal(mind.lastDecision(),null,'prefill must have no last decision');
      const inputs=[input,clone(fixture.prefillOpponent)];
      const found=stamp(sim.step(world,inputs),world,'prefill');
      emit({type:'prefill-step',tick:world.tick,inputs,events:found});
    }
    costs.prefillMs=elapsed(prefillStart);
    assert.deepEqual(mind.memory(),acceptedInitialMemory,'prefill must not mutate learned state');
    decisionView=clone(prefillViews[protocol.decisionPerceptPrefillIndex]);
    currentView=percept(world,'P1',protocol.mode);initialWorld=sim.snapshotWorld(world);
    emit({type:'predecision',arm,pair,fixtureId:fixture.id,historyDigest,initialMemoryDigest,
      initialReplayWorld,world:initialWorld,prefillViews,decisionView,currentView,
      geometry:geometrySummary(world,currentView)});
    phase='decision';
    const first=timedAct(mind,currentView,dt,'first-decision',emit);actTimings.push(first.timing);
    assert.equal(mind.cognition().cycles,1,'exactly one completed first decision required');
    decision=mind.lastDecision();
    assert.equal(decision?.time,decisionView.time.elapsedSec,'expected delayed percept time');
    const summary=decisionSummary(decision,first.input);
    emit({type:'decision',arm,pair,decision,summary,timing:first.timing});
    phase='delivery';const deliveryStart=performance.now();
    for(let tick=0;tick<protocol.deliveryTicks;tick++) {
      let input;
      if(tick===0) input=first.input;
      else {
        const cached=timedAct(mind,percept(world,'P1',protocol.mode),dt,`cached-${tick}`,emit);actTimings.push(cached.timing);input=cached.input;
        assert.equal(mind.cognition().cycles,1,'cached delivery must not make another decision');
        assert.deepEqual(input,{...first.input,throw:false,recall:false},'one pulse plus held cached movement and aim');
        assert.deepEqual(mind.lastDecision(),decision,'cached act must not alter decision instrumentation');
      }
      const inputs=[input,neutral()],found=stamp(sim.step(world,inputs),world,'delivery');events.push(...found);
      emit({type:'physical-step',phase,tick:world.tick,inputs,events:found});
    }
    costs.deliveryMs=elapsed(deliveryStart);
    phase='neutral-continuation';const continuationStart=performance.now();
    for(let tick=0;tick<protocol.neutralContinuationTicks;tick++) {
      const inputs=[neutral(),neutral()],found=stamp(sim.step(world,inputs),world,'continuation');events.push(...found);
      emit({type:'physical-step',phase,tick:world.tick,inputs,events:found});
    }
    costs.neutralContinuationMs=elapsed(continuationStart);
    const finalWorld=sim.snapshotWorld(world);
    const consequences=summarizeConsequences({input:first.input,events,initialWorld,finalWorld});
    const finalMemory=mind.memory(),finalCognition=mind.cognition();
    costs.wholeArmMs=elapsed(wholeStart);
    return {status:'complete',arm,pair,fixtureId:fixture.id,family:fixture.family,variant:fixture.variant,
      substrate:fixture.state,initialMemoryDigest,acceptedInitialMemoryDigest:digest(acceptedInitialMemory),
      historyDigest,decisionViewDigest:digest(decisionView),currentViewDigest:digest(currentView),prefillViewsDigest:digest(prefillViews),
      initialWorldDigest:digest(initialWorld),settings,decision:summary,consequences,events,initialWorld,finalWorld,
      decisionView,currentView,actTimings,decisionDurationMs:first.timing.durationMs,
      nominalCadenceOverrun:first.timing.durationMs>1000/protocol.cognitionHz,wallClockDeadlineEnforced:false,
      costs,finalMemory,finalCognition,unexecutedPlannedControlAtCutoff:clone(summary.pendingRecallPlan)};
  } catch(error) {
    costs.wholeArmMs=elapsed(wholeStart);
    const failure={type:'arm-failure',status:'failed',arm,pair,fixtureId:fixture.id,phase,error:errorData(error),costs,actTimings,events,
      partialWorld:world?sim.snapshotWorld(world):null,decision:decision??null,decisionView:decisionView??null,currentView:currentView??null};
    emit(failure);error.partialArm=failure;throw error;
  }
}

export function runPair({pair,factories,sim,percept,memorySnapshot,protocol,emit=()=>{}}) {
  const started=performance.now(),fixture=FIXTURES.find(f=>f.id===pair.fixtureId),arms={};
  assert.ok(fixture,'known fixed fixture required');
  emit({type:'pair-start',pair});
  try {
    for(const arm of pair.order) arms[arm]=runArm({arm,createMind:factories[arm],sim,percept,fixture,pair,memorySnapshot,protocol,
      emit:record=>emit({...record,arm,pair})});
    for(const field of ['initialMemoryDigest','acceptedInitialMemoryDigest','historyDigest','decisionViewDigest','currentViewDigest','prefillViewsDigest','initialWorldDigest']) assert.equal(arms.N[field],arms.S[field],`paired equal ${field}`);
    assert.deepEqual(arms.N.decision.novelty,arms.S.decision.novelty,'predecision detector equality');
    assert.deepEqual(arms.N.decision.habit,arms.S.decision.habit,'predecision habit eligibility equality');
    return {type:'pair',status:'complete',pair,fixtureId:fixture.id,family:fixture.family,variant:fixture.variant,arms,
      costs:{wholePairMs:elapsed(started)},baselineEmittedCandidateWithheld:!!arms.N.consequences.emitted&&!arms.S.consequences.emitted};
  } catch(error) {
    const row={type:'pair',status:'failed',pair,fixtureId:fixture.id,family:fixture.family,variant:fixture.variant,
      arms,partialArm:error.partialArm??null,error:errorData(error),costs:{wholePairMs:elapsed(started)}};
    emit(row);error.partialPair=row;throw error;
  }
}

export function trainCommon({createMind,sim,percept,protocol,emit=()=>{}}) {
  let memorySnapshot=null;const episodes=[];
  for(let episode=0;episode<protocol.training.episodes;episode++) {
    const seed=protocol.training.seedStart+episode,started=performance.now();
    const before=clone(memorySnapshot),fixture=FIXTURES[episode%FIXTURES.length];
    let tick=0,world,mind;
    try {
      const setupStart=performance.now();
      const replayed=replayFixture(sim,fixture,(world,inputs,events)=>emit({type:'training-history-step',episode,seed,fixtureId:fixture.id,tick:world.tick,inputs,events}));
      world=replayed.world;
      const setupMs=elapsed(setupStart);
      mind=createMind({...protocol.mindOptions,seed,memorySnapshot:clone(memorySnapshot)});
      const settings=checkedSettings(mind,protocol);
      emit({type:'training-start',episode,seed,fixtureId:fixture.id,setupMs,initialWorld:sim.snapshotWorld(world),memoryBefore:before,acceptedMemory:mind.memory(),settings});
      for(;tick<protocol.training.secondsPerEpisode*protocol.simulationHz&&!world.ended;tick++) {
        const view=percept(world,'P1',protocol.mode),memoryBefore=mind.memory();
        const {input,timing}=timedAct(mind,view,1/protocol.simulationHz,`training-${episode}-${tick}`,record=>emit({...record,episode,seed,tick}));
        const inputs=[input,neutral()],events=stamp(sim.step(world,inputs),world,'training');
        emit({type:'training-step',episode,seed,tick,percept:view,inputs,events,timing,
          memoryBefore,memoryAfter:mind.memory(),cognition:mind.cognition(),decision:mind.lastDecision()});
      }
      const finalPercept=percept(world,'P1',protocol.mode),pendingBeforeFinish=clone(mind.cognition().pendingOutcome);
      const finishResult=mind.finish(clone(finalPercept));
      memorySnapshot=mind.memory();
      const pendingAfterFinish=clone(mind.cognition().pendingOutcome);
      const result={type:'training-episode',episode,seed,fixtureId:fixture.id,ticks:tick,world:sim.snapshotWorld(world),
        finalPercept,finishResult,pendingBeforeFinish,pendingAfterFinish,memoryBefore:before,memoryAfter:clone(memorySnapshot),
        pendingPersistedInSnapshot:false,durationMs:elapsed(started),cognition:mind.cognition()};
      episodes.push(result);emit(result);
    } catch(error) {
      emit({type:'training-failure',episode,seed,tick,error:errorData(error),world:world?sim.snapshotWorld(world):null,memory:mind?mind.memory():null});throw error;
    }
  }
  return {memorySnapshot,episodes};
}

export function assignedSchedule(protocol) {
  return [...schedule(protocol.warmup.pairs,protocol.warmup.seedStart,'warmup'),
    ...schedule(protocol.measurement.pairs,protocol.measurement.seedStart,'measurement')];
}
