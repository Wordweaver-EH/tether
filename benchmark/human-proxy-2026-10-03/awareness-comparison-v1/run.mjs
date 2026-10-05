// Evaluator-only engine, truth and logging. Controllers receive canonical percepts only.
import {readFileSync,writeFileSync,mkdirSync,existsSync,createWriteStream,statfsSync,openSync,closeSync,fsyncSync,readdirSync,linkSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createGzip,gunzipSync,constants} from 'node:zlib';
import {once} from 'node:events';
import {pipeline} from 'node:stream/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createWorld,step} from '../repo/src/sim.js';
import {percept} from '../repo/src/perception.js';
import {createInterface,createBenchmarkController,sensorPacket} from '../repo/benchmark/interface.mjs';
import {createHumanInterface} from '../repo/human-proxy/interface.mjs';
import {createMeasurements} from '../repo/human-proxy/measurements.mjs';
import {createComparisonCounter} from './controller.mjs';
import {ROOT,BUDGET,verifyIntegrity,runManifest,smokeSeed,freeze,checkRelease,hash} from './protocol.mjs';
import {summarizeStudy} from './statistics.mjs';
const clone=x=>structuredClone(x);
let writeSequence=0;
export function writeDurable(file,data){
 let pending;do{pending=`${file}.pending-${process.pid}-${++writeSequence}`;}while(existsSync(pending));const fd=openSync(pending,'wx');
 try{writeFileSync(fd,JSON.stringify(data,null,2)+'\n');fsyncSync(fd);}finally{closeSync(fd);}
 linkSync(pending,file);const dir=openSync(path.dirname(file),'r');try{fsyncSync(dir);}finally{closeSync(dir);}
 unlinkSync(pending);
}
const write=writeDurable;
export function nextAttempt(outputDir,boutId){
 const prefix=`${boutId}.attempt-`;let max=0;
 for(const name of readdirSync(outputDir)){if(!name.startsWith(prefix))continue;const match=name.slice(prefix.length).match(/^(\d+)\./);if(match)max=Math.max(max,Number(match[1]));}
 return max+1;
}
export function writeFinal(file,data,{ignoreKeys=[]}={}){
 if(!existsSync(file)){write(file,data);return data;}
 const existing=JSON.parse(readFileSync(file));const omit=x=>Object.fromEntries(Object.entries(x).filter(([k])=>!ignoreKeys.includes(k)));
 if(JSON.stringify(omit(existing))!==JSON.stringify(omit(data)))throw Error('existing final artifact differs');
 return existing;
}
export const DISK_RESERVE_BYTES=512*1024*1024;
export function freeBytes(dir){const s=statfsSync(dir);return Number(s.bavail)*Number(s.bsize);}
export function assertDisk(dir,additional=0){const bytes=freeBytes(dir);if(bytes<DISK_RESERVE_BYTES+additional)throw Error(`disk reserve: ${bytes} bytes available; need ${DISK_RESERVE_BYTES+additional}`);return bytes;}
async function journal(file,header){
 const sink=createWriteStream(file,{flags:'wx'}),zip=createGzip({level:6});
 let error=null;const finished=pipeline(zip,sink).catch(e=>{error=e;});
 await once(sink,'open');const rawHash=createHash('sha256');let uncompressedBytes=0;
 async function record(value){if(error)throw error;const text=JSON.stringify(value)+'\n';rawHash.update(text);uncompressedBytes+=Buffer.byteLength(text);if(!zip.write(text))await once(zip,'drain');if(error)throw error;}
 async function flush(){if(error)throw error;await new Promise((resolve,reject)=>zip.flush(constants.Z_SYNC_FLUSH,e=>e?reject(e):resolve()));if(sink.writableLength)await new Promise((resolve,reject)=>sink.write('',e=>e?reject(e):resolve()));fsyncSync(sink.fd);if(error)throw error;}
 await record(header);
 return {record,flush,async finish(){zip.end();await finished;if(error)throw error;const fd=openSync(file,'r');try{fsyncSync(fd);}finally{closeSync(fd);}const bytes=readFileSync(file);return {compressedSha256:hash(bytes),uncompressedSha256:rawHash.digest('hex'),compressedBytes:bytes.length,uncompressedBytes};},abort(){zip.destroy();sink.destroy();}};
}
export function summarizeProcess({records,ordinaryRecords,receiptTruth,postScanSamples,events,measured,counterSeat,arm,elapsedSec}){
 const ordinarySeat=counterSeat==='P1'?'P2':'P1';
 const metrics=Object.fromEntries(['returningReceived','outboundReceived','totalReceived','delivered','returningDelivered','outboundDelivered','actualThrows','actualRecalls','baseProposedThrows','throwCommands','withheldThrows','alignedAwayOpportunities','warnings','warningEpisodes','scans','movementOverrides','scanOnly','warningExpired','warningScoreResets','reacquisitions','visibleOpponentDecisions','visibleSpearDecisions','visibleReturningDecisions','decisions','scanAimDisplacementRadTotal','motorSigmaTotal','warningActualReturning','warningActualNotReturning','postScanSamples','postScanSpearVisible','postScanReturningVisible','postScanOpponentVisible'].map(k=>[k,0]));
 const failures=[],reasonCounts={};let warningEpisode=false;
 const expected=Math.max(0,Math.floor((elapsedSec*120-1-30)/4)+1),expectedOrdinary=Math.max(0,Math.floor((elapsedSec*120-1-18)/4)+1);
 if(records.length!==expected||ordinaryRecords.length!==expectedOrdinary||receiptTruth.length!==records.length)failures.push('decision count mismatch');
 for(let i=0;i<records.length;i++){
  const r=records[i],d=r.diagnostic,a=d.assessment,t=receiptTruth[i];metrics.decisions++;
  if(Math.abs(r.receiptTime-r.sensorTime-.25)>1e-10||Math.round(r.receiptTime*120)!==30+4*i||Math.round(r.sensorTime*120)!==4*i)failures.push('counter timing');
  if(d.arm!==arm||Math.abs(a.sensorTime-r.sensorTime)>1e-10||Math.abs(a.receiptTime-r.receiptTime)>1e-10)failures.push('assessment identity/timing');
  reasonCounts[a.reason]=(reasonCounts[a.reason]??0)+1;
  if(a.warning){metrics.warnings++;if(!warningEpisode)metrics.warningEpisodes++;warningEpisode=true;
   if(t.enemySpearState==='RETURNING')metrics.warningActualReturning++;else metrics.warningActualNotReturning++;
  }else if(warningEpisode){if(d.visibility.enemySpear)metrics.reacquisitions++;warningEpisode=false;}
  if(a.reason==='evidence-expired')metrics.warningExpired++;
  if(a.observedScoreChange)metrics.warningScoreResets++;
  if(d.visibility.opponent)metrics.visibleOpponentDecisions++;
  if(d.visibility.enemySpear)metrics.visibleSpearDecisions++;
  if(d.visibility.enemySpearState==='RETURNING')metrics.visibleReturningDecisions++;
  if(d.baseCommand.throw)metrics.baseProposedThrows++;
  if(r.command.throw)metrics.throwCommands++;
  if(d.base.opportunity&&d.base.aligned&&d.base.supportedAway)metrics.alignedAwayOpportunities++;
  if(d.withheldThrow)metrics.withheldThrows++;
  if(d.scan){metrics.scans++;metrics.scanAimDisplacementRadTotal+=d.scanAimDisplacementRad;
   if(r.command.throw||r.command.recall!==d.baseCommand.recall)failures.push('scan throw/recall arbitration');
   if(d.movementOverride){metrics.movementOverrides++;if(r.command.moveX!==a.proposal.movement.x||r.command.moveY!==a.proposal.movement.y)failures.push('certified movement changed');}
   else{metrics.scanOnly++;if(r.command.moveX!==d.baseCommand.moveX||r.command.moveY!==d.baseCommand.moveY)failures.push('scan-only base movement changed');}
  }
  if(d.scan!==(arm==='awareness'&&a.warning)||d.withheldThrow!==(d.scan&&d.baseCommand.throw))failures.push('scan/withholding rule');
  if(!d.scan&&(d.command.throw!==d.baseCommand.throw||d.command.recall!==d.baseCommand.recall||['moveX','moveY','aimX','aimY'].some(k=>d.command[k]!==d.baseCommand[k])))failures.push('no-scan arbitration changed');
  if(r.command.throw&&!(d.base.opportunity&&d.base.aligned&&d.base.supportedAway))failures.push('throw outside original opportunity');
  metrics.motorSigmaTotal+=r.sigma;
 }
 for(let i=0;i<ordinaryRecords.length;i++){const r=ordinaryRecords[i];if(Math.abs(r.receiptTime-r.sensorTime-.15)>1e-10||Math.round(r.receiptTime*120)!==18+4*i||Math.round(r.sensorTime*120)!==4*i)failures.push('ordinary timing');}
 for(const s of postScanSamples){metrics.postScanSamples++;if(s.tick!==s.scanTick+2)failures.push('post-scan source grid');if(s.enemySpearVisible)metrics.postScanSpearVisible++;if(s.enemySpearVisible&&s.enemySpearState==='RETURNING')metrics.postScanReturningVisible++;if(s.opponentVisible)metrics.postScanOpponentVisible++;}
 for(const e of events){if(e.type==='THROW'&&e.player===counterSeat){metrics.actualThrows++;if(!records.find(r=>Math.round(r.receiptTime*120)===e.tick)?.command.throw)failures.push('unlinked actual throw');}if(e.type==='RECALL_START'&&e.owner===counterSeat)metrics.actualRecalls++;}
 for(const h of measured.raw.hits){const own=h.attacker===counterSeat;if(own){metrics.delivered++;metrics[h.phase==='RETURNING'?'returningDelivered':'outboundDelivered']++;}else{metrics.totalReceived++;metrics[h.phase==='RETURNING'?'returningReceived':'outboundReceived']++;}}
 const warningExposureSec=records.reduce((n,r)=>n+(r.diagnostic.assessment.warning?Math.min(1/30,elapsedSec-r.receiptTime):0),0);
 const scanExposureSec=records.reduce((n,r)=>n+(r.diagnostic.scan?Math.min(1/30,elapsedSec-r.receiptTime):0),0);
 const hitContext={receivedWhileWarning:0,receivedWhileScanning:0,returningReceivedWhileWarning:0,returningReceivedWhileScanning:0};
 for(const e of events.filter(e=>e.type==='HIT'&&e.victim===counterSeat)){
  if(e.counterContext?.warning){hitContext.receivedWhileWarning++;if(e.phase==='RETURNING')hitContext.returningReceivedWhileWarning++;}
  if(e.counterContext?.scan){hitContext.receivedWhileScanning++;if(e.phase==='RETURNING')hitContext.returningReceivedWhileScanning++;}
 }
 return {metrics,failures:[...new Set(failures)],reasonCounts,warningExposureSec,scanExposureSec,hitContext,
  phaseReconciliation:{counter:metrics.delivered,ordinary:metrics.totalReceived},ordinarySeat};
}
export async function runBout({row,durationSec,ordinaryVector,rawFile}){
 const world=createWorld(),ordinarySeat=row.counterSeat==='P1'?'P2':'P1',counterIndex=row.counterSeat==='P1'?0:1;
 const counter=createComparisonCounter({seed:row.counterSeed,arm:row.arm});
 const proxy=createHumanInterface(counter,{episode:row.episodeId,seat:row.counterSeat,diagnostics:true});
 const ordinary=createInterface(createBenchmarkController('param',{vector:ordinaryVector,seed:row.ordinarySeed}),{episode:row.episodeId,seat:ordinarySeat,diagnostics:true});
 const agents=counterIndex===0?[proxy,ordinary]:[ordinary,proxy];
 const m=createMeasurements({episodeId:row.episodeId,boutId:row.boutId,counterPlayer:row.counterSeat},{bounds:world.experiment.ARENA,obstacles:world.experiment.OBSTACLES});
 const events=[],receiptTruth=[],postScanSamples=[];let pendingScan=null;
 const log=await journal(rawFile,{type:'header',schema:1,row,durationSec,format:'tether-awareness-lossless-jsonl-v1'});
 const started=performance.now();
 try{
  for(let tick=0;tick<durationSec*120&&!world.ended;tick++){
   const views=agents.map((_,i)=>percept(world,`P${i+1}`,'MODE_B')),view=views[counterIndex];
   if(tick%4===0){
    await log.record({type:'sourcePacket',tick,packet:sensorPacket(view)});
    if(pendingScan){const sample={tick,scanTick:pendingScan.tick,elapsedSec:tick/120,enemySpearVisible:view.opponentSpear!==null,enemySpearState:world.spears[1-counterIndex].state,opponentVisible:view.opponent!==null,scores:clone(view.scores),scoreChanged:JSON.stringify(view.scores)!==JSON.stringify(pendingScan.scores)};postScanSamples.push(sample);await log.record({type:'postScanSource',...sample});pendingScan=null;}
   }
   const inputs=agents.map((agent,i)=>clone(agent.act(clone(views[i]),1/120)));
   if(tick>=30&&(tick-30)%4===0){const d=counter.diagnostics(),truth={tick,elapsedSec:tick/120,enemySpearState:world.spears[1-counterIndex].state,enemySpearVisible:view.opponentSpear!==null,opponentVisible:view.opponent!==null,scores:clone(view.scores)};
    receiptTruth.push(truth);await log.record({type:'counterReceipt',tick,command:inputs[counterIndex],diagnostic:d,truth});if(d.scan)pendingScan={tick,scores:clone(view.scores)};
   }
   if(tick>=18&&(tick-18)%4===0)await log.record({type:'ordinaryIssued',tick,command:inputs[1-counterIndex]});
   const pre=m.beforeStep(world),currentEvents=step(world,inputs);m.afterStep(pre,currentEvents,world);
   for(const e of currentEvents){const d=e.type==='HIT'?counter.diagnostics():null;const event={...e,tick,timestamp:world.elapsedSec,...(d?{counterContext:{warning:d.assessment.warning,scan:d.scan,movementOverride:d.movementOverride,baseSupportedAway:d.base.supportedAway}}:{})};events.push(event);await log.record({type:'event',event});}
   if(tick%3600===3599)await log.flush();
  }
  const measured=m.finish(world),records=proxy.records(),ordinaryRecords=ordinary.records();
  const process=summarizeProcess({records,ordinaryRecords,receiptTruth,postScanSamples,events,measured,counterSeat:row.counterSeat,arm:row.arm,elapsedSec:world.elapsedSec});
  const scores=Object.fromEntries(world.players.map(p=>[p.id,p.score]));
  if(scores[row.counterSeat]!==process.metrics.delivered||scores[ordinarySeat]!==process.metrics.totalReceived)throw Error('HIT/score mismatch');
  const summary={...row,ordinarySeat,elapsedSec:world.elapsedSec,counterHits:process.metrics.delivered,ordinaryHits:process.metrics.totalReceived,netHitsPerMin:(process.metrics.delivered-process.metrics.totalReceived)/(world.elapsedSec/60),scores,...process,measurements:measured.summary};
  await log.record({type:'interfaces',counterDecisions:records,ordinaryDecisions:ordinaryRecords});
  await log.record({type:'measurements',raw:measured.raw});
  await log.record({type:'end',summary,receiptTruth,postScanSamples});
  const identity=await log.finish();return {summary,rawIdentity:{...identity,file:path.basename(rawFile)},wallSeconds:(performance.now()-started)/1000};
 }catch(e){log.abort();throw e;}
}
export function verifyRaw(file,identity,{roundtrip=false}={}){
 const compressed=readFileSync(file);if(hash(compressed)!==identity.compressedSha256||compressed.length!==identity.compressedBytes)throw Error('compressed raw mismatch');
 if(roundtrip){const bytes=gunzipSync(compressed);if(hash(bytes)!==identity.uncompressedSha256||bytes.length!==identity.uncompressedBytes)throw Error('roundtrip mismatch');const lines=bytes.toString('utf8').trimEnd().split('\n');if(JSON.parse(lines[0]).type!=='header'||JSON.parse(lines.at(-1)).type!=='end')throw Error('incomplete raw');}
}
export async function runSmoke(outputDir){
 if(existsSync(outputDir))throw Error('smoke output already exists');mkdirSync(outputDir,{recursive:true});
 const {ordinary}=verifyIntegrity(),results=[],seed=smokeSeed();
 for(const counterSeat of ['P1','P2'])for(const arm of ['unchanged','awareness']){
  const row={...seed,counterSeat,arm,boutId:`smoke-${counterSeat}-${arm}`};
  const result=await runBout({row,durationSec:3,ordinaryVector:ordinary.vector,rawFile:path.join(outputDir,`${row.boutId}.jsonl.gz`)});
  if(result.summary.failures.length)throw Error('structural smoke validity failed');verifyRaw(path.join(outputDir,result.rawIdentity.file),result.rawIdentity,{roundtrip:true});
  // Deliberately do not expose, read or aggregate smoke scores/hit counts.
  results.push({boutId:row.boutId,structuralChecks:'pass',durationSec:3,wallSeconds:result.wallSeconds,rawIdentity:result.rawIdentity});
 }
 const wallSeconds=results.reduce((n,r)=>n+r.wallSeconds,0),compressedBytes=results.reduce((n,r)=>n+r.rawIdentity.compressedBytes,0);
 const result={purpose:'wiring/cadence/logging/compression only; no efficacy interpretation',rows:results,wallSeconds,compressedBytes,
  projectedMainWallSeconds:wallSeconds*(128*300/12),projectedCompressedBytes:compressedBytes*(128*300/12),safetyFactor:3,
  projectedStorageWithSafetyBytes:Math.ceil(compressedBytes*(128*300/12)*3),freeBytes:freeBytes(outputDir)};
 assertDisk(outputDir,result.projectedStorageWithSafetyBytes);write(path.join(outputDir,'SMOKE-STRUCTURAL-RESULT.json'),result);return result;
}
export function validateOutputBinding(release,outputDir){
 if(typeof outputDir!=='string'||!outputDir)throw Error('explicit output required');
 if(typeof release?.outputDir!=='string'||!path.isAbsolute(release.outputDir)||path.resolve(release.outputDir)!==path.resolve(outputDir))throw Error('release output directory binding mismatch');
}
export function recoverStartupIdentity({outputDir,release,frozen,manifest,integrity,smoke}){
 if(release.resumeApproved!==true)throw Error('startup recovery requires root approval');
 validateOutputBinding(release,outputDir);
 if(readdirSync(outputDir).some(name=>name.includes('.attempt-')||name.includes('.checkpoint.json')||name.startsWith('PROGRESS-')||['REPORT.json','RAW-MANIFEST.json'].includes(name)))throw Error('missing run identity after gameplay artifacts; manual review required');
 const claimPath=path.join(outputDir,'MAIN-CLAIM.json');let originalRelease=release;
 if(existsSync(claimPath)){
  const claim=JSON.parse(readFileSync(claimPath));validateOutputBinding(claim.release,outputDir);
  if(claim.release.freezeSha256!==frozen.freezeSha256||claim.release.gitCheckpoint!==release.gitCheckpoint||claim.release.rootRelease!==true||claim.release.independentReviewAccepted!==true)throw Error('startup claim identity mismatch');
  originalRelease=claim.release;
 }
 assertDisk(outputDir,smoke.projectedStorageWithSafetyBytes);
 const result={freeze:frozen,release:originalRelease,manifest,node:process.version,startedAt:new Date().toISOString(),budget:BUDGET,integrity,smoke,startupRecovery:{resumeId:release.resumeId,priorEvidenceRetained:true}};
 write(path.join(outputDir,'RUN-IDENTITY.json'),result);return result;
}
export async function runStudy({release,outputDir,resume=false}){
 const frozen=checkRelease(release),integrity=verifyIntegrity(),manifest=runManifest();
 validateOutputBinding(release,outputDir);
 if(resume){if(release.resumeApproved!==true||!existsSync(outputDir))throw Error('explicit root resume approval and existing output required');}
 else {if(existsSync(outputDir))throw Error('output already exists; no replacement run');mkdirSync(outputDir);}
 if(resume&&(!/^[a-zA-Z0-9_-]{1,80}$/.test(release.resumeId??'')))throw Error('unique root resumeId required');
 write(path.join(outputDir,resume?`RESUME-CLAIM-${release.resumeId}.json`:'MAIN-CLAIM.json'),{at:new Date().toISOString(),release,processId:process.pid});
 const identityPath=path.join(outputDir,'RUN-IDENTITY.json');
 const smoke=JSON.parse(readFileSync(path.join(ROOT,'SMOKE-STRUCTURAL-RESULT.json')));
 if(resume){
  const original=existsSync(identityPath)?JSON.parse(readFileSync(identityPath)):recoverStartupIdentity({outputDir,release,frozen,manifest,integrity,smoke});
  validateOutputBinding(original.release,outputDir);
  if(original.freeze.freezeSha256!==frozen.freezeSha256||original.release.gitCheckpoint!==release.gitCheckpoint||JSON.stringify(original.manifest)!==JSON.stringify(manifest))throw Error('resume identity mismatch');
  write(path.join(outputDir,`RESUME-RELEASE-${release.resumeId}.json`),release);
 }else{
  assertDisk(outputDir,smoke.projectedStorageWithSafetyBytes);
  write(identityPath,{freeze:frozen,release,manifest,node:process.version,startedAt:new Date().toISOString(),budget:BUDGET,integrity,smoke});
 }
 const summaries=[],rawFiles=[];
 for(const row of manifest){
  const checkpointPath=path.join(outputDir,`${row.boutId}.checkpoint.json`);
  if(existsSync(checkpointPath)){
   if(!resume)throw Error('unexpected existing row');const saved=JSON.parse(readFileSync(checkpointPath));
   if(JSON.stringify(saved.row)!==JSON.stringify(row))throw Error('checkpoint row mismatch');
   verifyRaw(path.join(outputDir,saved.rawIdentity.file),saved.rawIdentity,{roundtrip:true});
   const summaryBytes=readFileSync(path.join(outputDir,saved.summaryFile));if(hash(summaryBytes)!==saved.summarySha256)throw Error('summary hash mismatch');
   summaries.push(JSON.parse(summaryBytes));rawFiles.push(saved.rawIdentity);continue;
  }
  assertDisk(outputDir);
  const attempt=nextAttempt(outputDir,row.boutId);
  const rawFile=path.join(outputDir,`${row.boutId}.attempt-${attempt}.jsonl.gz`);
  write(path.join(outputDir,`${row.boutId}.attempt-${attempt}.started.json`),{row,attempt,startedAt:new Date().toISOString(),freezeSha256:frozen.freezeSha256});
  const result=await runBout({row,durationSec:BUDGET.durationSec,ordinaryVector:integrity.ordinary.vector,rawFile});
  verifyRaw(rawFile,result.rawIdentity,{roundtrip:true});
  const summaryFile=`${row.boutId}.attempt-${attempt}.summary.json`;write(path.join(outputDir,summaryFile),result.summary);
  write(checkpointPath,{row,attempt,rawIdentity:result.rawIdentity,summaryFile,summarySha256:hash(readFileSync(path.join(outputDir,summaryFile))),wallSeconds:result.wallSeconds,completedAt:new Date().toISOString()});
  summaries.push(result.summary);rawFiles.push(result.rawIdentity);
  write(path.join(outputDir,`PROGRESS-${String(summaries.length).padStart(3,'0')}.json`),{completedBouts:summaries.length,completedRows:summaries.map(s=>s.boutId),lastRow:row.boutId,elapsedBudgetMinutes:summaries.length*5,freeBytes:freeBytes(outputDir),at:new Date().toISOString()});
  globalThis.process.stdout.write(JSON.stringify({completedBouts:summaries.length,totalBouts:128,boutId:row.boutId,wallSeconds:result.wallSeconds})+'\n');
 }
 const after=verifyIntegrity(),statisticalResult=summarizeStudy(summaries),failures=summaries.flatMap(s=>s.failures.map(reason=>({boutId:s.boutId,reason})));
 const awareness=summaries.filter(s=>s.arm==='awareness'),warnings=awareness.reduce((n,s)=>n+s.metrics.warnings,0),scans=awareness.reduce((n,s)=>n+s.metrics.scans,0);
 const invalid=failures.length||!warnings||!scans;
 const report={status:invalid?'invalid-for-intended-awareness-effect-claim':'pending-independent-result-review',classificationProvisionalUntilReview:invalid?'invalid':statisticalResult.primary.classification,statisticalResult,
  integrity:{before:integrity,after},manipulation:{failures,warnings,scans},bouts:summaries,rawFiles,freezeSha256:frozen.freezeSha256,gitCheckpoint:release.gitCheckpoint,
  attempts:readdirSync(outputDir).filter(n=>n.endsWith('.started.json')).sort(),completedAt:new Date().toISOString(),scope:'Combined frozen awareness + scan + conditional movement + scan-withheld-throw package; no awareness-alone effect or human enjoyment claim; no further research authorized.'};
 writeFinal(path.join(outputDir,'RAW-MANIFEST.json'),rawFiles);return writeFinal(path.join(outputDir,'REPORT.json'),report,{ignoreKeys:['completedAt']});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const flag=process.argv[2];
 if(flag==='--freeze')console.log(JSON.stringify(freeze(),null,2));
 else if(flag==='--smoke'&&process.argv.length===4)console.log(JSON.stringify(await runSmoke(path.resolve(process.argv[3])),null,2));
 else if(['--run','--resume'].includes(flag)&&process.argv.length===5)await runStudy({release:JSON.parse(readFileSync(process.argv[3])),outputDir:path.resolve(process.argv[4]),resume:flag==='--resume'});
 else {console.error('No matches by default. --freeze; --smoke NEW_OUTPUT; --run RELEASE NEW_OUTPUT; explicit recovery --resume RELEASE EXISTING_OUTPUT.');process.exitCode=2;}
}
