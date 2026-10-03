/** Qualified recovered orchestration. No work on import; explicit reviewed root release required. */
import fs from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {HERE,ANALYSIS,ORIGINAL,RESUME,LOCK_SHA,assert,read,equal,fileHash,safePath,exactSet,loadGate,recheckGate,validateTrainingSnapshots,resolveTask,terminalResource,checkLineage} from './gate.mjs';
import {interfaceResources} from './interface-resources.mjs';
export const QUALIFICATIONS=[
 'Original evaluation interrupted after 805 accepted tasks, with seven raw-only partial artifacts preserved separately. The original attempt never obtained a COMPLETE receipt.',
 'Recovered scientific coverage is 805 original plus 3419 resumed original task IDs. Repeated partial IDs are excluded original evidence, not additional scientific observations.',
 'Original child terminalResourceUsage, original parent total CPU, and partial-worker total CPU are unavailable, represented as null, never zero or inferred from receipt endpoints.',
 'Receipt processLifetimeCpu is an earlier whole-process endpoint lower bound, not terminal CPU. Resumed terminal child usage is reported separately. Overlapping endpoints and parent/kernel snapshots must never be summed.',
 'Original process extinction is unproven. Global eight-worker concurrency, exactly-once partial execution and absence of simultaneous original/resumed partial execution cannot be certified.',
 'Shared aggregate capacity of at most nine logical CPUs across original and resumed executions is an accepted conditional assumption, not measured CPU or independently proven cross-namespace quota. Capacity reservation is never allocated to arms or tasks.',
 'Original wall deadline 2026-10-03T14:52:26.760Z and stricter conditional capacity deadline 2026-10-03T10:52:26.760Z remain distinct. Watchdog sampling/scheduling/full-content sweeps have finite detection latency.',
 'Terminal accounting excludes tiny final commit, receipt, event, fsync and process-exit overhead. Scientific proof retains the frozen compact-observer granularity limits; no latent trajectories are reconstructed.',
 'No controller/source changes, retuning, optional continuation or next study are authorized by this analysis. Stop and report after this study.'
];
export function resourceAccounting(diagnostics,gate){
 const original=diagnostics.filter(d=>d.recovery.origin==='original'),resumed=diagnostics.filter(d=>d.recovery.origin==='resume');
 const endpoint=rows=>({count:rows.length,unit:'microseconds',user:rows.reduce((s,d)=>s+d.resources.processLifetimeCpu.user,0),system:rows.reduce((s,d)=>s+d.resources.processLifetimeCpu.system,0),scope:'Genuine worker receipt processLifetimeCpu earlier endpoint, lower bound only; not terminal; do not add to terminal usage'});
 for(const d of diagnostics)assert(d.resources.processLifetimeCpu&&['user','system'].every(k=>Number.isFinite(d.resources.processLifetimeCpu[k])&&d.resources.processLifetimeCpu[k]>=0),'missing receipt CPU endpoint');
 assert(original.every(d=>d.resources.terminalResourceUsage===null),'original terminal CPU must be null');
 const terminal={count:resumed.length,user:resumed.reduce((s,d)=>s+d.resources.terminalResourceUsage.userCPUTime,0),system:resumed.reduce((s,d)=>s+d.resources.terminalResourceUsage.systemCPUTime,0),unit:'microseconds',scope:'Resumed accepted children only, genuine persisted terminal IPC; no original children or unknown partial workers'};
 return {historicalPhaseCpuAccounting:'INCOMPLETE_UNAVAILABLE',original:{acceptedTasks:original.length,terminalChildrenCpuSum:null,parentCpu:null,partialWorkersCpu:null,reason:'Original supervisor terminal IPC and parent terminal usage were not persisted',receiptEndpointCpuSum:endpoint(original)},resume:{acceptedTasks:resumed.length,terminalChildrenCpuSum:terminal,receiptEndpointCpuSum:endpoint(resumed),genuineSupervisorResourceSnapshot:gate.complete.resources,scope:gate.complete.accounting},combinedFullPhaseCpu:null,allAcceptedReceiptEndpointCpuSum:endpoint(diagnostics),capacityReservation:{logicalCpus:gate.recovery.capacityLogicalCpus,start:gate.recovery.capacityStart,deadline:gate.recovery.capacityDeadline,measuredCpu:false,conditionalSharedAggregateAssumption:true,scope:'Allowance/bound only; never distribute across tasks or arms'},acceptedRawBytes:diagnostics.reduce((s,d)=>s+d.recovery.rawBytes,0),originalPartialRawBytes:gate.partials.reduce((s,p)=>s+p.bytes,0),cumulativePhysicalAttemptRawBytes:diagnostics.reduce((s,d)=>s+d.recovery.rawBytes,0)+gate.partials.reduce((s,p)=>s+p.bytes,0),qualifications:QUALIFICATIONS};
}
export async function runQualifiedAnalysis({releasePath,outputDir}){
 const gate=loadGate(resolve(releasePath)); // Source, independent review, genuine terminal and infrastructure gates first.
 const {release,expected,union,provenance}=gate;
 assert(resolve(outputDir)===release.output&&dirname(resolve(outputDir))===HERE,'analysis output release mismatch');
 assert(!fs.existsSync(outputDir),'new output directory required');
 assert(!fs.existsSync(releasePath+'.consumed.json'),'analysis release already consumed');
 // Frozen modules are imported only after byte-level source verification. No monkey patching or rewriting.
 const frozen=await import(pathToFileURL(resolve(ANALYSIS,'analyze.mjs')));
 const {parse,serialize,sha256}=await import(pathToFileURL(resolve(ANALYSIS,'vendor/raw-stream.mjs')));
 const {scoreEvents,analyzeScores}=await import(pathToFileURL(resolve(ANALYSIS,'scores.mjs')));
 const {extractDiagnostics,aggregateCalibration,aggregateNativeDiagnostics}=await import(pathToFileURL(resolve(ANALYSIS,'diagnostics.mjs')));
 const lock=frozen.verifyFrozenInputs(),design=read(resolve(ANALYSIS,'frozen/DESIGN.json')),training=read(resolve(ANALYSIS,'frozen/TRAINING-FAILURE-REFERENCE.json'));
 assert(training.status==='FROZEN_FROM_QUALIFIED_TRAINING_BEFORE_EVALUATION'&&training.qualifiedBaselineCommit===design.qualifiedBaselineCommit,'unfrozen training reference');
 validateTrainingSnapshots(expected,training.clusters);
 const refs=Array(12);for(const r of training.clusters){assert(r.counterfactualModelCountsExcluded&&r.genuineCompletedActions>0&&r.failurePrevalence===1-r.genuineSuccesses/r.genuineCompletedActions,'invalid genuine training reference');refs[r.cluster]=r.failurePrevalence;}assert(refs.length===12&&refs.every(Number.isFinite),'missing training cluster');
 fs.writeFileSync(releasePath+'.consumed.json',JSON.stringify({at:new Date().toISOString(),releaseSha256:fileHash(releasePath),output:resolve(outputDir),adapterManifestSha256:release.adapterManifestSha256})+'\n',{flag:'wx'});
 fs.mkdirSync(outputDir,{recursive:false});
 const save=(name,value)=>fs.writeFileSync(resolve(outputDir,name),serialize(value)+'\n',{flag:'wx'});
 const coverage=frozen.completeness(expected,union.entries.map(e=>e.taskId));assert(coverage.status==='COMPLETE','incomplete union');save('completeness.json',coverage);
 save('qualification.json',{statusAtCreation:'VALIDATING_UNAGGREGATED',acceptanceAuthority:'report.json',provenance,qualifications:QUALIFICATIONS});save('excluded-original-partials.json',gate.partials);
 const entries=new Map(union.entries.map(e=>[e.taskId,e])),originalAudit=new Map(gate.audit.accepted.map(e=>[e.taskId,e])),scores=[],diagnostics=[],lineage=new Map(),rawInventory=[],memoryLinks=[];
 try{
  for(const t of expected){
   const entry=entries.get(t.id),artifacts=resolveTask(t,entry,originalAudit.get(t.id));
   const resultBytes=fs.readFileSync(artifacts.result.path);assert(sha256(resultBytes)===artifacts.result.sha256,'result changed between resolution and read');const receipt=parse(resultBytes);
   let usage=null,ipc=null,exit=null,startReceipt=null;
   if(entry.origin==='resume'){
    const ipcPath=safePath(RESUME,resolve(RESUME,'ipc',t.id+'.json'),'ipc/'+t.id+'.json');
    const exitPath=safePath(RESUME,resolve(RESUME,'tasks',t.id+'.exit.json'),'tasks/'+t.id+'.exit.json');
    const startPath=safePath(RESUME,resolve(RESUME,'tasks',t.id+'.start.json'),'tasks/'+t.id+'.start.json');
    ipc=parse(fs.readFileSync(ipcPath,'utf8'));exit=read(exitPath);startReceipt=read(startPath);
    assert(equal(startReceipt.task,t)&&startReceipt.pid===ipc.pid,'start task/PID mismatch');
    if(t.arm.startsWith('mind-'))assert(ipc.message.memoryPath===artifacts.memory.path,'IPC memory path mismatch');
    artifacts.ipc={path:ipcPath,sha256:fileHash(ipcPath)};artifacts.exit={path:exitPath,sha256:fileHash(exitPath)};artifacts.start={path:startPath,sha256:fileHash(startPath)};
   }
   usage=terminalResource(entry.origin,entry,ipc,exit,receipt,serialize);
   const bytes=fs.readFileSync(artifacts.raw.path);assert(sha256(bytes)===artifacts.raw.sha256&&receipt.raw.fileSha256===artifacts.raw.sha256&&receipt.raw.bytes===artifacts.raw.bytes,'raw read/receipt hash/bytes mismatch');
   const rows=frozen.decodeTask(bytes,receipt,t,design,LOCK_SHA),start=rows[0];
   if(startReceipt)assert(startReceipt.inputMemorySha256===start.inputMemorySha256,'persisted start/input memory mismatch');
   if(t.arm.startsWith('mind-')){
    frozen.validateMemoryArtifact(artifacts.memory.path,receipt.outputMemorySha256);
    memoryLinks.push({taskId:t.id,origin:entry.origin,bout:t.bout,session:[t.cluster,t.condition,t.arm,t.seat],inputMemorySha256:start.inputMemorySha256,outputMemorySha256:receipt.outputMemorySha256});
   }
   checkLineage(t,start,receipt,lock,lineage);
   scores.push(scoreEvents(rows,t));const d=extractDiagnostics(rows,t,refs[t.cluster]);
   d.resources.processLifetimeCpu=receipt.resources.processLifetimeCpu;d.resources.terminalResourceUsage=usage;
   d.recovery={origin:entry.origin,rawBytes:artifacts.raw.bytes,terminalResourceUsageUnavailableReason:entry.origin==='original'?'Original terminal IPC was not persisted':null,status:'VALIDATED_TASK_UNAGGREGATED'};
   diagnostics.push(d);rawInventory.push({taskId:t.id,origin:entry.origin,artifacts,raw:receipt.raw,taskSha256:sha256(t),terminalResourceUsage:usage,missingTerminalReason:d.recovery.terminalResourceUsageUnavailableReason});
   save(t.id+'.diagnostics.json',d);frozen.retainTaskSummary(d);
  }
  assert(scores.length===4224&&diagnostics.length===4224,'full scientific validation required');
  // Accounting consistency is checked before aggregation, rather than accepting partial aggregate files.
  const resources=resourceAccounting(diagnostics,gate);
  assert(resources.cumulativePhysicalAttemptRawBytes===gate.complete.resources.rawBytes,'genuine supervisor cumulative raw bytes mismatch');
  assert(resources.original.acceptedTasks===805&&resources.resume.acceptedTasks===3419,'resource origin counts');
  const snapshot=gate.complete.resources;
  assert(snapshot.completedResume===3419&&snapshot.spawned===3419&&snapshot.live.length===0,'incomplete resumed terminal accounting');
  assert(!fs.existsSync(resolve(RESUME,'FAILURE.json'))&&!fs.existsSync(resolve(RESUME,'COMMIT-UNCERTAIN.json')),'terminal state changed during validation');
  for(const ref of [release.complete,release.union,release.supervisorLog])assert(fileHash(ref.path)===ref.sha256,'terminal evidence changed during validation');
  recheckGate(gate);frozen.verifyFrozenInputs();
  save('recovery-audit.json',{status:'ALL_4224_TASKS_VALIDATED_BEFORE_AGGREGATION',coverage,provenance,counts:{original:805,resume:3419,accepted:4224,memoryArtifacts:memoryLinks.length,excludedOriginalPartials:7},memoryLinks,qualifications:QUALIFICATIONS,aggregateFunctionsCalled:false});
  // Scientific aggregation is byte-identical frozen functions, frozen lexical task order and frozen seeds.
  const results=analyzeScores(scores,design.arms.map(a=>a.id)),calibration=aggregateCalibration(diagnostics,refs),native=aggregateNativeDiagnostics(diagnostics);
  resources.byArm=interfaceResources(diagnostics,design);
  resources.actualMeanRatios=Object.fromEntries(Object.entries(resources.byArm).map(([arm,r])=>[arm,{versusFullMind:r.decisionMeanMs/resources.byArm['mind-full'].decisionMeanMs,versusOrdinary:r.decisionMeanMs/resources.byArm.conventional.decisionMeanMs}]));
  save('scores.json',scores);save('performance.json',results);save('calibration.json',calibration);save('novelty-teacher.json',native);save('raw-inventory.json',rawInventory);save('resources.json',resources);
  recheckGate(gate);
  save('report.json',{schemaVersion:2,status:'COMPLETE_RECOVERED_QUALIFIED',analysisLockSha256:fileHash(resolve(ANALYSIS,'ANALYSIS-LOCK.json')),releaseLockSha256:LOCK_SHA,provenance,coverage,historicalPhaseCpuAccounting:'INCOMPLETE_UNAVAILABLE',primary:results.panels.conventional,endpointHierarchy:lock.endpointHierarchy,files:['completeness.json','qualification.json','recovery-audit.json','excluded-original-partials.json','raw-inventory.json','scores.json','performance.json','calibration.json','novelty-teacher.json','resources.json','<taskId>.diagnostics.json'],limitations:[...lock.limitations,...QUALIFICATIONS],unsupportedMetrics:lock.unsupportedMetrics,trainingReference:training});
  return {status:'COMPLETE_RECOVERED_QUALIFIED',outputDir};
 }catch(error){save('report.json',{schemaVersion:2,status:'INVALID_INCOMPLETE_NO_AGGREGATE_ACCEPTANCE',verifiedTasks:scores.length,error:error.message,coverage,provenance,qualifications:QUALIFICATIONS});throw error;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [releasePath,outputDir]=process.argv.slice(2);assert(releasePath&&outputDir,'Usage: node analyze-qualified.mjs ROOT_ANALYSIS_RELEASE.json NEW_OUTPUT_DIRECTORY');
 console.log(JSON.stringify(await runQualifiedAnalysis({releasePath,outputDir})));
}
