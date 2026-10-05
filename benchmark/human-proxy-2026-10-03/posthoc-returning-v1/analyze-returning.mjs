#!/usr/bin/env node
// Saved-evidence-only posthoc analysis. Does not import/run sim.step or controllers.
// Usage: node analyze-returning.mjs INPUT_STUDY_DIR NEW_OUTPUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {isVisible as visible,firstReturningPacketTick,packetCanActByImpact,advanceFacing,victimStateAtCollision} from './analysis-math.mjs';
const [baseArg,outArg]=process.argv.slice(2);
if(!baseArg||!outArg)throw Error('Expected INPUT_STUDY_DIR and NEW_OUTPUT_DIR');
const base=path.resolve(baseArg),out=path.resolve(outArg);
if(fs.existsSync(out))throw Error('Output already exists; preserve previous artifacts');
fs.mkdirSync(out,{recursive:true});
// Only arithmetic primitives are imported; no simulator or policy code executes.
const {hypot,sinCosTurn}=await import(pathToFileURL(path.join(base,'repo/src/deterministic-math.js')));
const HZ=120,SPEED=12,DT=1/120,TURN=sinCosTurn(2*Math.PI*DT);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const startingScriptSha=sha(fs.readFileSync(process.argv[1])),startingHelperSha=sha(fs.readFileSync(new URL('./analysis-math.mjs',import.meta.url)));
const read=p=>JSON.parse(fs.readFileSync(path.join(base,p),'utf8'));
const write=(p,x)=>fs.writeFileSync(path.join(out,p),JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const clone=p=>({x:p.x,y:p.y}),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),dot=(a,b)=>a.x*b.x+a.y*b.y;
const unit=p=>{const n=hypot(p.x,p.y);return {x:p.x/n,y:p.y/n}};
const bearingDot=(pos,facing,target)=>{const dx=target.x-pos.x,dy=target.y-pos.y,n=Math.hypot(dx,dy);return n?dot(facing,{x:dx/n,y:dy/n}):null};
const quant=(a,q)=>{if(!a.length)return null;const j=(a.length-1)*q,l=Math.floor(j);return a[l]+(a[Math.ceil(j)]-a[l])*(j-l)};
const distribution=xs=>{const a=xs.filter(Number.isFinite).sort((a,b)=>a-b);return {count:a.length,min:a[0]??null,p10:quant(a,.1),q1:quant(a,.25),median:quant(a,.5),q3:quant(a,.75),p90:quant(a,.9),max:a.at(-1)??null}};
const groupCounts=(rows,key)=>rows.reduce((o,r)=>(o[String(r[key])]=(o[String(r[key])]??0)+1,o),{});
const tally=(rows,p)=>rows.filter(p).length;
const assert=(p,s)=>{if(!p)throw Error(s)};
const checks={rawFiles:0,frozenFiles:0,eventFacingComparisons:0,eventFacingMaxError:0,recallSpearPositionComparisons:0,recallSpearPositionMaxError:0,hitSpearDirectionComparisons:0,hitSpearDirectionMaxError:0,returnThreatChecks:0,returnThreatMismatches:0,returnVisibleChecks:0,returnThreatTrueChecks:0,returnHitLineageChecks:0,timingMaxErrorSec:0,sampleCadenceChecks:0,decisionCadenceAgeChecks:0,resetEventsApplied:0};
const manifest=read('primary-v1/RAW-MANIFEST.json');
for(const [p,expected] of Object.entries(read('repo/human-proxy/FROZEN-SOURCE-MANIFEST.json'))){assert(sha(fs.readFileSync(path.join(base,'repo',p)))===expected,`Frozen source mismatch ${p}`);checks.frozenFiles++;}
const freeze=read('repo/human-proxy/FREEZE.json');
for(const [p,expected] of Object.entries(freeze.files)){assert(sha(fs.readFileSync(path.join(base,'repo',p)))===expected,`Freeze mismatch ${p}`);checks.frozenFiles++;}
const allHits=[],allRecalls=[],boutRows=[],examples=[];let exposure={allTicks:0,supportedAwayTicks:0,threatTicks:0,attacks:0};
for(const mf of manifest){
 const bytes=fs.readFileSync(path.join(base,'primary-v1',mf.file));assert(sha(bytes)===mf.sha256,`Raw mismatch ${mf.file}`);checks.rawFiles++;
 const b=JSON.parse(bytes),cs=b.counterSeat,os=b.ordinarySeat,roles={};roles[cs]='counter';roles[os]='ordinary';
 assert(b.measurements.samples.length===9000,'Missing 30-Hz samples');
 for(const [i,r] of b.measurements.samples.entries()){assert(r.tick===4*i&&r.representedTicks===4,'Sample cadence mismatch');checks.sampleCadenceChecks++}
 for(const [records,lag,count] of [[b.counterDecisions,30,8993],[b.ordinaryDecisions,18,8996]]){
  assert(records.length===count,'Decision count mismatch');
  for(const [i,r] of records.entries()){assert(r.decision===i&&Math.abs(r.sensorTime-i*4/HZ)<1e-10&&Math.abs(r.receiptTime-(i*4+lag)/HZ)<1e-10,'Decision cadence or age mismatch');checks.decisionCadenceAgeChecks++}
 }
 const byTick=new Map(),cmds={P1:new Map(),P2:new Map()},facing={P1:{x:1,y:0},P2:{x:-1,y:0}},held={P1:{aimX:0,aimY:0},P2:{aimX:0,aimY:0}};
 for(const e of b.events){if(!byTick.has(e.tick))byTick.set(e.tick,[]);byTick.get(e.tick).push(e)}
 for(const r of b.counterDecisions)cmds[cs].set(Math.round(r.receiptTime*HZ),r.command);
 for(const r of b.ordinaryDecisions)cmds[os].set(Math.round(r.receiptTime*HZ),r.command);
 const samples=new Map(b.measurements.samples.map(r=>[r.tick,r])),counterBySensor=new Map(b.counterDecisions.map(r=>[Math.round(r.sensorTime*HZ),r])),counterByReceipt=new Map(b.counterDecisions.map(r=>[Math.round(r.receiptTime*HZ),r]));
 const spears={P1:{state:'HELD',direction:{x:1,y:0}},P2:{state:'HELD',direction:{x:-1,y:0}}};
 const snap=new Map(),recallState=new Map(),hitState=new Map();let latestCounter=null;
 for(let t=0;t<36000;t++){
  const ev=byTick.get(t)??[],sample=samples.get(t);
  if(sample){
   const row={};
   for(const p of ['P1','P2']){
    const s=spears[p];if(s.state==='HELD'){s.position=clone(sample.players[p].position);s.direction=clone(facing[p]);}
    row[p]={facing:clone(facing[p]),position:clone(sample.players[p].position),spear:{...s,position:clone(s.position),direction:clone(s.direction)}};
   }
   snap.set(t,row);
  }
  // Reconstruct only facing from saved issued motor commands. Positions and
  // collisions are never simulated; their recorded observations/events are used.
  for(const p of ['P1','P2']){
   if(cmds[p].has(t))held[p]=cmds[p].get(t);
   facing[p]=advanceFacing(facing[p],held[p],hypot,TURN);
  }
  for(const e of ev.filter(e=>e.type==='RECALL_START')){
   const p=e.owner,v=p==='P1'?'P2':'P1',s=spears[p];
   checks.recallSpearPositionComparisons++;checks.recallSpearPositionMaxError=Math.max(checks.recallSpearPositionMaxError,dist(s.position,e.spear_start));
   recallState.set(`${p}:${t}`,{victimFacing:clone(facing[v]),spearVisibleBeforeRecall:visible(e.opponent_pos,facing[v],e.spear_start),spearBearingFacingDot:bearingDot(e.opponent_pos,facing[v],e.spear_start),victimSpearStateBeforeActions:spears[v].state});
  }
  if(counterByReceipt.has(t))latestCounter=counterByReceipt.get(t);
  exposure.allTicks++;if(latestCounter?.diagnostic.supportedAway)exposure.supportedAwayTicks++;if(latestCounter?.diagnostic.threat)exposure.threatTicks++;
  for(const e of ev){
   const p=e.player??e.owner;
   if(e.type==='THROW'||e.type==='RECALL_START'){
    checks.eventFacingComparisons++;checks.eventFacingMaxError=Math.max(checks.eventFacingMaxError,dist(facing[p],e.facing??e.owner_facing));
   }
   if(e.type==='THROW'){
    spears[p]={state:'OUTBOUND',position:clone(e.origin),direction:clone(e.facing)};if(p===cs)exposure.attacks++;
   }else if(e.type==='RECALL_START'){
    spears[p]={state:'RETURNING',position:clone(e.spear_start),direction:unit({x:e.recall_target.x-e.spear_start.x,y:e.recall_target.y-e.spear_start.y})};
   }
  }
  for(const e of ev.filter(e=>e.type==='HIT')){
   hitState.set(`${e.attacker}:${t}`,{victimFacing:clone(facing[e.victim]),victimSpearStateAtCollision:victimStateAtCollision(spears[e.victim].state,e.victim,e.attacker,ev)});
   if(e.phase==='RETURNING'){
    const s=spears[e.attacker],d={x:e.hit_pos.x-s.position.x,y:e.hit_pos.y-s.position.y},len=Math.hypot(d.x,d.y);
    if(len>1e-10){checks.hitSpearDirectionComparisons++;checks.hitSpearDirectionMaxError=Math.max(checks.hitSpearDirectionMaxError,dist({x:d.x/len,y:d.y/len},s.direction))}
   }
  }
  for(const p of ['P1','P2']){
   const s=spears[p];if(s.state==='OUTBOUND'||s.state==='RETURNING'){s.position.x+=s.direction.x*(SPEED*DT);s.position.y+=s.direction.y*(SPEED*DT)}
  }
  for(const e of ev){
   if(e.type==='EMBED')spears[e.owner]={...spears[e.owner],state:'EMBEDDED',position:clone(e.position)};
   if(e.type==='RECALL_COMPLETE')spears[e.owner]={...spears[e.owner],state:'HELD'};
   if(e.type==='SPEAR_NEUTRALIZED')spears[e.spear_owner]={...spears[e.spear_owner],state:'HELD'};
   if(e.type==='RESET'){checks.resetEventsApplied++;}if(e.type==='RESET')for(const p of ['P1','P2']){facing[p]={x:p==='P1'?1:-1,y:0};spears[p]={state:'HELD',direction:clone(facing[p])}}
  }
 }
 // Validate reconstructed RETURNING percept gate against saved policy diagnostic.
 // Recompute only the documented scalar threat test, not policy decisions.
 for(const r of b.counterDecisions){
  const s=snap.get(Math.round(r.sensorTime*HZ)),a=s[cs],e=s[os].spear;
  if(e.state!=='RETURNING')continue;
  const vis=visible(a.position,a.facing,e.position),sd=unit(e.direction),me=r.diagnostic.estimatedPosition,sp={x:e.position.x+sd.x*3,y:e.position.y+sd.y*3},rel={x:me.x-sp.x,y:me.y-sp.y};
  const along=dot(rel,sd),side=rel.x*sd.y-rel.y*sd.x,threat=vis&&along>=-.4&&along<=6.6&&Math.abs(side)<.8;
  checks.returnThreatChecks++;if(vis)checks.returnVisibleChecks++;if(threat)checks.returnThreatTrueChecks++;if(threat!==!!r.diagnostic.threat)checks.returnThreatMismatches++;
 }
 const hitMap=new Map(b.measurements.hits.map(h=>[h.throwId,h]));
 const throwMap=new Map(b.measurements.throws.map(h=>[h.throwId,h]));
 const cthrows=b.measurements.throws.filter(t=>t.owner===cs),hitevents=new Map(b.events.filter(e=>e.type==='HIT').map(e=>[`${e.attacker}:${e.tick}`,e]));
 const boutHits=[];
 for(const tr of b.measurements.throws)for(const rec of tr.recalls){
  const h=hitMap.get(tr.throwId),returnHit=h?.phase==='RETURNING',v=tr.victim,ownerRole=roles[tr.owner],rs=recallState.get(`${tr.owner}:${rec.tick}`);
  const rr={boutId:b.boutId,cluster:b.cluster,counterSeat:cs,throwId:tr.throwId,attackerRole:ownerRole,recallTick:rec.tick,terminationTick:tr.termination?.tick??36000,termination:tr.termination?.type??'CENSORED',returningHit:returnHit,...rs};
  if(ownerRole==='ordinary'){
   rr.counterAttackedBeforeRecallInSameEnemyThrow=cthrows.some(t=>t.launchTick>=tr.launchTick&&t.launchTick<rec.tick);
   rr.counterAttackedDuringRecallToTermination=cthrows.some(t=>t.launchTick>=rec.tick&&t.launchTick<=(tr.termination?.tick??35999));
  }
  allRecalls.push(rr);
 }
 for(const h of b.measurements.hits){
  if(h.phase!=='RETURNING')continue;
  const tr=throwMap.get(h.throwId),r=h.recall,ownerRole=roles[h.attacker],lag=ownerRole==='ordinary'?30:18,rs=recallState.get(`${h.attacker}:${r.tick}`),hs=hitState.get(`${h.attacker}:${h.impactTick}`);
  assert(JSON.stringify(tr.recalls.at(-1))===JSON.stringify(r),'Returning hit recall mismatch');checks.returnHitLineageChecks++;
  const age=h.impactTimeSec-r.timeSec,travelAge=dist(r.spearStart,h.impactPosition)/SPEED;checks.timingMaxErrorSec=Math.max(checks.timingMaxErrorSec,Math.abs(age-travelAge));
  const firstSensor=Math.ceil((r.tick+1)/4)*4,firstPossibleReceipt=firstReturningPacketTick(r.tick,lag);
  const sd=unit({x:r.ownerPosition.x-r.spearStart.x,y:r.ownerPosition.y-r.spearStart.y});
  const received=[];
  for(let st=firstSensor;packetCanActByImpact(st+lag,h.impactTick);st+=4){
   const sn=snap.get(st),a=sn[h.victim],e=sn[h.attacker].spear;assert(e.state==='RETURNING','Return trajectory unexpectedly unavailable');
   const vis=visible(a.position,a.facing,e.position),cd=ownerRole==='ordinary'?counterBySensor.get(st):null;
   const me=cd?.diagnostic.estimatedPosition,sp={x:e.position.x+sd.x*3,y:e.position.y+sd.y*3};
   const rel=me?{x:me.x-sp.x,y:me.y-sp.y}:null,along=rel?dot(rel,sd):null,side=rel?rel.x*sd.y-rel.y*sd.x:null;
   received.push({sensorTick:st,receiptTick:st+lag,visible:vis,spearBearingFacingDot:bearingDot(a.position,a.facing,e.position),threat:cd?!!cd.diagnostic.threat:null,along,side,supportedAway:cd?.diagnostic.supportedAway??null,throwCommand:cd?.command.throw??null});
  }
  const allVisibleSensorTicks=[];
  for(let st=firstSensor;st<=h.impactTick;st+=4){const sn=snap.get(st),a=sn[h.victim],e=sn[h.attacker].spear;if(e.state==='RETURNING'&&visible(a.position,a.facing,e.position))allVisibleSensorTicks.push(st)}
  const visibleReceived=received.filter(x=>x.visible),threatReceived=received.filter(x=>x.threat),latest=hitevents.get(`${h.attacker}:${h.impactTick}`).counterDecisionContext;
  const row={boutId:b.boutId,cluster:b.cluster,counterSeat:cs,throwId:h.throwId,attackerRole:ownerRole,recallTick:r.tick,impactTick:h.impactTick,impactFraction:h.impactFraction,recallToHitSec:age,recallOriginToVictimDistance:r.originToDefenderDistance,firstPossibleReturningPacketReceiptTick:firstPossibleReceipt,hitBefore250ms:age<.25,hitBeforeVictimLatency:age<lag/HZ,noPostRecallPacketCouldArrive:firstPossibleReceipt>h.impactTick,eligibleReturningPacketsBeforeHit:received.length,visibleReturningPacketsReceivedBeforeHit:visibleReceived.length,visibleReturningSamplesBeforeImpact:allVisibleSensorTicks.length,firstVisibleReturningSensorTick:allVisibleSensorTicks[0]??null,firstVisibleReturningReceiptTick:visibleReceived[0]?.receiptTick??null,visibleReturningThreatPacketsBeforeHit:ownerRole==='ordinary'?threatReceived.length:null,firstReturningThreatReceiptTick:threatReceived[0]?.receiptTick??null,...rs,...hs,arrivalOriginFacingDot:dot({x:-sd.x,y:-sd.y},hs.victimFacing),counterContextAtHit:{supportedAway:latest.supportedAway,opportunity:latest.opportunity,threat:!!latest.threat,ownSpearState:latest.ownSpearState,throwCommand:latest.command.throw,targetDistance:latest.targetDistance},receivedReturningPacketEvidence:received};
  if(ownerRole==='ordinary'){
   row.counterAttacksDuringEnemyThrow=cthrows.filter(t=>t.launchTick>=tr.launchTick&&t.launchTick<=h.impactTick).map(t=>({throwId:t.throwId,launchTick:t.launchTick,relativeToRecallSec:(t.launchTick-r.tick)/HZ,termination:t.termination}));
   row.counterAttacksDuringReturn=row.counterAttacksDuringEnemyThrow.filter(t=>t.launchTick>=r.tick).length;
   row.visiblePacketsRejectedByAlong=visibleReceived.filter(x=>x.along<-.4||x.along>6.6).length;
   row.visiblePacketsRejectedBySide=visibleReceived.filter(x=>Math.abs(x.side)>=.8).length;
  }
  allHits.push(row);boutHits.push(row);
 }
 boutRows.push({boutId:b.boutId,cluster:b.cluster,counterSeat:cs,ordinaryReturningHits:boutHits.filter(h=>h.attackerRole==='ordinary').length,ordinaryReturningHitsBelow250ms:tally(boutHits,h=>h.attackerRole==='ordinary'&&h.hitBefore250ms),ordinaryReturningHitsWithoutVisibleReturnPacket:tally(boutHits,h=>h.attackerRole==='ordinary'&&h.visibleReturningPacketsReceivedBeforeHit===0)});
 console.log(JSON.stringify({analyzedBouts:checks.rawFiles,boutId:b.boutId}));
}
assert(checks.eventFacingMaxError<1e-12,'Facing reconstruction failed event cross-check');
assert(checks.recallSpearPositionMaxError<1e-10,'Trajectory reconstruction failed recall cross-check');
assert(checks.returnThreatMismatches===0,'Reconstructed returning threat gate mismatches logged diagnostic');
assert(checks.hitSpearDirectionMaxError<1e-9,'Return direction reconstruction mismatch');
assert(checks.timingMaxErrorSec<1e-9,'Recall timing inconsistency');
const summary={schema:1,status:'completed',scope:'posthoc descriptive analysis of saved events, commands, samples, and frozen source only; no matches, controller execution, rule or mind edits',checks,originalStudyClassification:'inconclusive; unchanged',timingConvention:'Recall at tick start; impact uses stored within-tick fraction. A sensor sampled on recall tick is pre-recall. First possible RETURNING sample is next multiple-of-four tick strictly after recall. Commands act at tick start, hence receiptTick <= impactTick counts as available.',provenance:{freezeSha256:freeze.freezeSha256,rawManifestSha256:sha(fs.readFileSync(path.join(base,'primary-v1/RAW-MANIFEST.json'))),reportSha256:sha(fs.readFileSync(path.join(base,'PUBLIC-REPORT-v1.md'))),scriptSha256:sha(fs.readFileSync(process.argv[1])),analysisMathSha256:sha(fs.readFileSync(new URL('./analysis-math.mjs',import.meta.url)))},byAttacker:{},counterDecisionExposure:{...exposure,totalSec:exposure.allTicks/HZ,supportedAwaySec:exposure.supportedAwayTicks/HZ,threatSec:exposure.threatTicks/HZ},recallLandmarkAssociations:{},limits:['Received percept packets were not logged. Visibility is reconstructed from saved sampled positions, saved issued aims plus frozen facing arithmetic, and event-derived spear trajectories; it is not a directly logged percept field.','Returning threat gate reconstruction uses logged counter estimatedPosition and checks against its saved threat diagnostic. It does not rerun the controller or reproduce its memory.','Observed associations are endogenous. There is no attack-suppression, latency-matched, or alternate-defence intervention here, so no causal claim about attack or rule failure follows.','250 ms is the counter sensor lag, not a guaranteed dodge window; decision alignment, visibility, projection, available lateral movement, and advance warning matter.','Hit-conditioned descriptions are not whole-strategy performance estimates, and recall-level groups are not randomized.','No game preflight tests or matches were rerun; only the analysis program, its assertions, and separate analysis-only unit checks execute.']};
for(const role of ['ordinary','counter']){
 const hs=allHits.filter(h=>h.attackerRole===role),rs=allRecalls.filter(r=>r.attackerRole===role);
 summary.byAttacker[role]={returningHits:hs.length,recalls:rs.length,returningHitPerRecall:hs.length/rs.length,recallToHitSec:distribution(hs.map(h=>h.recallToHitSec)),recallOriginToVictimDistance:distribution(hs.map(h=>h.recallOriginToVictimDistance)),before250ms:tally(hs,h=>h.hitBefore250ms),before150ms:tally(hs,h=>h.recallToHitSec<.15),beforeVictimLatency:tally(hs,h=>h.hitBeforeVictimLatency),beforeAnyPostRecallPacket:tally(hs,h=>h.noPostRecallPacketCouldArrive),noVisibleReturningPacketReceived:tally(hs,h=>h.visibleReturningPacketsReceivedBeforeHit===0),hasVisibleReturningPacketReceived:tally(hs,h=>h.visibleReturningPacketsReceivedBeforeHit>0),everVisibleInSampleBeforeImpact:tally(hs,h=>h.visibleReturningSamplesBeforeImpact>0),visibleOnlyTooLate:tally(hs,h=>h.visibleReturningSamplesBeforeImpact>0&&h.visibleReturningPacketsReceivedBeforeHit===0),visibleReturnPacketsReceived:hs.reduce((n,h)=>n+h.visibleReturningPacketsReceivedBeforeHit,0),spearInvisibleAtRecallStart:tally(hs,h=>!h.spearVisibleBeforeRecall),arrivalFromBehindFacing:tally(hs,h=>h.arrivalOriginFacingDot<0),victimSpearStateAtRecall:groupCounts(hs,'victimSpearStateBeforeActions'),victimSpearStateAtImpact:groupCounts(hs,'victimSpearStateAtCollision')};
 if(role==='ordinary')Object.assign(summary.byAttacker[role],{anyReturningThreatBeforeHit:tally(hs,h=>h.visibleReturningThreatPacketsBeforeHit>0),activeThreatAtHit:tally(hs,h=>h.counterContextAtHit.threat),supportedAwayAtHit:tally(hs,h=>h.counterContextAtHit.supportedAway),attackCommandAtHit:tally(hs,h=>h.counterContextAtHit.throwCommand),counterAttackDuringEnemyThrow:tally(hs,h=>h.counterAttacksDuringEnemyThrow.length>0),counterAttackDuringReturn:tally(hs,h=>h.counterAttacksDuringReturn>0),noVisibleReturnDespiteEligiblePacket:tally(hs,h=>h.eligibleReturningPacketsBeforeHit>0&&h.visibleReturningPacketsReceivedBeforeHit===0),visibleButNoThreat:tally(hs,h=>h.visibleReturningPacketsReceivedBeforeHit>0&&h.visibleReturningThreatPacketsBeforeHit===0),visiblePacketRejectionAlong:hs.reduce((n,h)=>n+h.visiblePacketsRejectedByAlong,0),visiblePacketRejectionSide:hs.reduce((n,h)=>n+h.visiblePacketsRejectedBySide,0)});
}
const or=allRecalls.filter(r=>r.attackerRole==='ordinary');
for(const key of ['spearVisibleBeforeRecall','victimSpearStateBeforeActions','counterAttackedBeforeRecallInSameEnemyThrow']){
 const groups={};for(const r of or){const k=String(r[key]);if(!groups[k])groups[k]={recalls:0,returningHits:0};groups[k].recalls++;groups[k].returningHits+=Number(r.returningHit)}
 for(const g of Object.values(groups))g.returningHitFraction=g.returningHits/g.recalls;
 summary.recallLandmarkAssociations[key]=groups;
}
for(const r of or){
 const k=`attackBeforeRecall=${r.counterAttackedBeforeRecallInSameEnemyThrow};visibleAtRecall=${r.spearVisibleBeforeRecall}`;
 const g=summary.recallLandmarkAssociations.attackByRecallVisibility??={};
 if(!g[k])g[k]={recalls:0,returningHits:0};g[k].recalls++;g[k].returningHits+=Number(r.returningHit);
 }
for(const g of Object.values(summary.recallLandmarkAssociations.attackByRecallVisibility))g.returningHitFraction=g.returningHits/g.recalls;
assert(summary.provenance.scriptSha256===startingScriptSha&&summary.provenance.analysisMathSha256===startingHelperSha,'Analysis source changed during run');
write('SUMMARY.json',summary);write('BOUT-SUMMARIES.json',boutRows);
fs.writeFileSync(path.join(out,'RETURNING-HITS.jsonl'),allHits.map(r=>JSON.stringify(r)).join('\n')+'\n',{flag:'wx'});
fs.writeFileSync(path.join(out,'RECALLS.jsonl'),allRecalls.map(r=>JSON.stringify(r)).join('\n')+'\n',{flag:'wx'});
write('INPUT-MANIFEST.json',{rawFiles:manifest,originalReportSha256:summary.provenance.reportSha256,freezeSha256:freeze.freezeSha256});
console.log(JSON.stringify(summary,null,2));
