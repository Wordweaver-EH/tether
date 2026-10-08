// Evaluator truth is isolated here and in measurements.mjs; controllers receive canonical percepts only.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createWorld,step} from '../src/sim.js';
import {percept} from '../src/perception.js';
import {createInterface,createBenchmarkController} from '../benchmark/interface.mjs';
import {createHumanCounter} from './counter.mjs';
import {createHumanInterface} from './interface.mjs';
import {createMeasurements,summarizeHits,distribution} from './measurements.mjs';
import {ROOT,BUDGET,verifyFrozenSource,seedTable,writeFreeze,checkRelease,hash} from './protocol.mjs';
import {summarizeStudy} from './statistics.mjs';
const write=(file,data)=>writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});
function summarizeManipulation(records,counter,events,counterSeat,elapsedSec,distanceTicks){
 const ordinarySeat=counterSeat==='P1'?'P2':'P1';
 const mismatchedAges=records.filter(r=>Math.abs(r.receiptTime-r.sensorTime-.25)>1e-10).length;
 const invalidThrowDecisions=records.filter(r=>r.command.throw&&!(r.diagnostic.opportunity&&r.diagnostic.aligned&&r.diagnostic.supportedAway)).length;
 const actualThrows=events.filter(e=>e.type==='THROW'&&e.player===counterSeat);
 const decisionsByTick=new Map(records.map(r=>[Math.round(r.receiptTime*120),r]));
 const unlinkedActualThrows=actualThrows.filter(e=>!decisionsByTick.get(e.tick)?.command.throw).length;
 const totals=counter.totals();
 const contextHits={awayWindow:{delivered:0,received:0},threatDodge:{delivered:0,received:0}};
 for(const e of events.filter(e=>e.type==='HIT'))for(const [name,active] of [['awayWindow',e.counterDecisionContext?.supportedAway],['threatDodge',!!e.counterDecisionContext?.threat]])if(active)contextHits[name][e.attacker===counterSeat?'delivered':'received']++; 
 const validityFailures=[];
 if(mismatchedAges)validityFailures.push('incorrect packet age');
 if(invalidThrowDecisions)validityFailures.push('throw outside supported aligned opportunity');
 if(unlinkedActualThrows)validityFailures.push('actual throw without matching issued decision');
 if(records.length!==Math.floor((36000-1-30)/4)+1)validityFailures.push('incorrect decision count');
 if(totals.threats!==totals.dodges)validityFailures.push('threat without dodge decision');
 return {status:validityFailures.length?'invalid-proxy-implementation':'structural-manipulation-checks-pass',validityFailures,decisions:records.length,receiptAgeSec:.25,mismatchedAges,invalidThrowDecisions,unlinkedActualThrows,totals,contextHits,actualThrows:actualThrows.length,throwCommands:records.filter(r=>r.command.throw).length,recallCommands:records.filter(r=>r.command.recall).length,counterHits:events.filter(e=>e.type==='HIT'&&e.attacker===counterSeat).length,ordinaryHits:events.filter(e=>e.type==='HIT'&&e.attacker===ordinarySeat).length,distanceOccupancy:Object.fromEntries(Object.entries(distanceTicks).map(([k,v])=>[k,{ticks:v,seconds:v/120,fraction:v/(elapsedSec*120)}]))};
}
function runReleasedBout(row,counterSeat,ordinaryVector){
 const world=createWorld(),ordinarySeat=counterSeat==='P1'?'P2':'P1',counter=createHumanCounter({seed:row.counterSeed});
 const proxy=createHumanInterface(counter,{episode:row.episodeId,seat:counterSeat,diagnostics:true});
 const ordinary=createInterface(createBenchmarkController('param',{vector:ordinaryVector,seed:row.ordinarySeed}),{episode:row.episodeId,seat:ordinarySeat,diagnostics:true});
 const agents=counterSeat==='P1'?[proxy,ordinary]:[ordinary,proxy];
 const boutId=`cluster-${row.cluster}-counter-${counterSeat}`;
 const measurements=createMeasurements({episodeId:row.episodeId,boutId,counterPlayer:counterSeat},{bounds:world.experiment.ARENA,obstacles:world.experiment.OBSTACLES});
 const events=[],distanceTicks={below4:0,from4to5_25:0,atLeast5_25:0};
 for(let tick=0;tick<36000&&!world.ended;tick++){
  const d=Math.hypot(world.players[0].position.x-world.players[1].position.x,world.players[0].position.y-world.players[1].position.y);
  distanceTicks[d<4?'below4':d<5.25?'from4to5_25':'atLeast5_25']++;
  const inputs=agents.map((agent,i)=>structuredClone(agent.act(structuredClone(percept(world,`P${i+1}`,'MODE_B')),1/120)));
  const snapshot=measurements.beforeStep(world),currentEvents=step(world,inputs);measurements.afterStep(snapshot,currentEvents,world);
  for(const event of currentEvents)events.push({...event,tick,timestamp:world.elapsedSec,...(event.type==='HIT'?{counterDecisionContext:counter.diagnostics()}: {})});
 }
 const measured=measurements.finish(world),records=proxy.records(),ordinaryRecords=ordinary.records();
 const manipulation=summarizeManipulation(records,counter,events,counterSeat,world.elapsedSec,distanceTicks);
 const ordinaryBadAge=ordinaryRecords.filter(r=>Math.abs(r.receiptTime-r.sensorTime-.15)>1e-10).length;
 if(ordinaryBadAge)manipulation.validityFailures.push('ordinary age mismatch');
 manipulation.status=manipulation.validityFailures.length?'invalid-proxy-implementation':'structural-manipulation-checks-pass';
 const counterHits=manipulation.counterHits,ordinaryHits=manipulation.ordinaryHits;
 const scores=Object.fromEntries(world.players.map(p=>[p.id,p.score]));
 if(scores[counterSeat]!==counterHits||scores[ordinarySeat]!==ordinaryHits)throw Error('physical HIT/score mismatch');
 const summary={boutId,...row,counterSeat,ordinarySeat,elapsedSec:world.elapsedSec,scores,counterHits,ordinaryHits,netHitsPerMin:(counterHits-ordinaryHits)/(world.elapsedSec/60),manipulation,measurements:measured.summary,ordinaryInterface:{latencySec:.15,decisions:ordinaryRecords.length,ageMismatches:ordinaryBadAge}};
 return {summary,raw:{boutId,...row,counterSeat,ordinarySeat,events,counterDecisions:records,ordinaryDecisions:ordinaryRecords,measurements:measured.raw}};
}
export function poolGeometry(bouts,role,throws){
 const rows=bouts.map(b=>b.measurements.byOwner[role==='counter'?b.counterSeat:b.ordinarySeat]),corners=rows.map(r=>r.cornering),seconds=corners.reduce((n,c)=>n+c.representedSec,0);
 const average=key=>{const valid=corners.filter(c=>c[key]!==null);const exposure=valid.reduce((n,c)=>n+c.representedSec,0);return exposure?valid.reduce((n,c)=>n+c[key]*c.representedSec,0)/exposure:null;};
 const sum=key=>corners.reduce((n,c)=>n+c[key],0);
 return {throws:throws.length,throwDistances:{launchCenterDistance:distribution(throws.map(t=>t.launchCenterDistance)),launchOriginToDefenderDistance:distribution(throws.map(t=>t.launchOriginToDefenderDistance))},cornering:{approximate:true,representedSec:seconds,...Object.fromEntries(['pressuredCorneredTimeFraction','retreatBlockedTimeFraction','meanFreeDirectionFraction','nearWallTimeFraction','nearObstacleTimeFraction','meanWallClearance','meanObstacleClearance'].map(k=>[k,average(k)])),meanFreeRetreatFraction:(()=>{const denom=corners.reduce((n,c)=>n+c.representedSec*c.retreatBearingDefinedTimeFraction,0);return denom?corners.reduce((n,c)=>n+(c.meanFreeRetreatFraction??0)*c.representedSec*c.retreatBearingDefinedTimeFraction,0)/denom:null;})(),...Object.fromEntries(['episodes','episodesAtLeastHalfSecond','hitsDeliveredWhilePressuredCornered','hitsReceivedWhilePressuredCornered'].map(k=>[k,sum(k)])),exits:Object.fromEntries(['movement','hitReset','termination'].map(k=>[k,corners.reduce((n,c)=>n+c.exits[k],0)])),qualifyingExits:Object.fromEntries(['movement','hitReset','termination'].map(k=>[k,corners.reduce((n,c)=>n+c.qualifyingExits[k],0)]))}};
}
export function runStudy({release,outputDir}){
 const freeze=checkRelease(release),{ordinary}=verifyFrozenSource();
 if(!outputDir)throw Error('explicit output directory required');
 if(existsSync(outputDir))throw Error('output directory already exists; preserve raw results');
 mkdirSync(outputDir,{recursive:true});
 write(path.join(outputDir,'RUN-IDENTITY.json'),{freeze,release,node:process.version,startedAt:new Date().toISOString(),budget:BUDGET});
 const bouts=[],rawFiles=[],hitsByRole={counter:[],ordinary:[]},throwsByRole={counter:[],ordinary:[]};
 for(const row of seedTable())for(const counterSeat of ['P1','P2']){
  const {summary,raw}=runReleasedBout(row,counterSeat,ordinary.vector);
  const name=`${summary.boutId}.json`;write(path.join(outputDir,name),raw);write(path.join(outputDir,`${summary.boutId}.summary.json`),summary);
  rawFiles.push({file:name,sha256:hash(readFileSync(path.join(outputDir,name)))});bouts.push(summary);
  for(const hit of raw.measurements.hits)hitsByRole[hit.attacker===counterSeat?'counter':'ordinary'].push(hit);
  for(const launch of raw.measurements.throws)throwsByRole[launch.owner===counterSeat?'counter':'ordinary'].push(launch);
  process.stdout.write(JSON.stringify({completedBouts:bouts.length,boutId:summary.boutId})+'\n');
 }
 const statisticalResult=summarizeStudy(bouts),failures=bouts.flatMap(b=>b.manipulation.validityFailures.map(reason=>({boutId:b.boutId,reason})));
 const totals=bouts.reduce((a,b)=>{for(const k of ['awayOpportunities','alignedOpportunities','threats','dodges'])a[k]+=b.manipulation.totals[k];a.actualThrows+=b.manipulation.actualThrows;return a;},{awayOpportunities:0,alignedOpportunities:0,threats:0,dodges:0,actualThrows:0});
 // Absence of an intended behaviour is flagged for review, never reinterpreted as a rule defect.
 const missingBehaviour=Object.entries(totals).filter(([,value])=>value===0).map(([name])=>name);
 const validity=failures.length||missingBehaviour.length?'invalid-for-intended-counterplay-claim':'pending-independent-result-and-manipulation-review';
 const report={status:validity,classificationProvisionalUntilReview:statisticalResult.classification,statisticalResult,pooledGeometry:Object.fromEntries(['counter','ordinary'].map(role=>[role,poolGeometry(bouts,role,throwsByRole[role])])),distanceAndPhase:{counter:summarizeHits(hitsByRole.counter),ordinary:summarizeHits(hitsByRole.ordinary)},manipulation:{totals,failures,missingBehaviour},bouts,rawFiles,freezeSha256:freeze.freezeSha256,gitCheckpoint:release.gitCheckpoint,completedAt:new Date().toISOString(),scope:'Single frozen hand-designed human-paced counter. No tuning, no claim of human enjoyment or universal best response. No branch execution authorized by this runner.'};
 write(path.join(outputDir,'REPORT.json'),report);write(path.join(outputDir,'RAW-MANIFEST.json'),rawFiles);return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv[2]==='--freeze')console.log(JSON.stringify(writeFreeze(),null,2));
 else if(process.argv[2]==='--run'&&process.argv.length===5){const release=JSON.parse(readFileSync(process.argv[3]));runStudy({release,outputDir:path.resolve(process.argv[4])});}
 else {console.error('No matches by default. Use --freeze for preflight; --run RELEASE.json NEW_OUTPUT_DIR only after review, Git checkpoint and root release.');process.exitCode=2;}
}
