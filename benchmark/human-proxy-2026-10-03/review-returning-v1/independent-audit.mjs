// Independent saved-evidence audit. Reads raw JSON and frozen arithmetic only.
// No simulator/controller module, gameplay, body movement, or collision execution.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const [baseArg,resultsArg]=process.argv.slice(2),base=path.resolve(baseArg),results=path.resolve(resultsArg);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const {hypot,sinCosTurn}=await import(pathToFileURL(path.join(base,'repo/src/deterministic-math.js')));
const rot=sinCosTurn(2*Math.PI/120),norm=p=>{const n=hypot(p.x,p.y);return {x:p.x/n,y:p.y/n}},dot=(a,b)=>a.x*b.x+a.y*b.y;
const byHit=new Map(fs.readFileSync(path.join(results,'RETURNING-HITS.jsonl'),'utf8').trim().split('\n').map(x=>{const r=JSON.parse(x);return [r.throwId,r]}));
const byRecall=new Map(fs.readFileSync(path.join(results,'RECALLS.jsonl'),'utf8').trim().split('\n').map(x=>{const r=JSON.parse(x);return [r.throwId,r]}));
const counts={rawFiles:0,facingCheckpoints:0,maxFacingError:0,returningThreatChecks:0,visibleReturningThreatChecks:0,positiveReturningThreatChecks:0,returningHits:0,recalls:0,zeroLengthRecalls:0,hitVisibleSourceSamples:0,hitVisibleEligibleSamples:0,ordinaryReturningHits:0,ordinaryBefore250ms:0,ordinaryBeforeAnyPacket:0,ordinaryTimingOpportunity:0,ordinaryBehind:0,ordinarySpearHeldAtCollision:0,sourceSampleGeometryChecks:0,minAbsoluteFovBoundaryMargin:Infinity,maxRecordedBearingError:0,maxRecordedArrivalDotError:0};
const roles={};
function visible(position,facing,target){
 const v={x:target.x-position.x,y:target.y-position.y},len=Math.hypot(v.x,v.y);
 if(!len)return true;
 const cos=dot(v,facing)/(len*Math.hypot(facing.x,facing.y));
 counts.minAbsoluteFovBoundaryMargin=Math.min(counts.minAbsoluteFovBoundaryMargin,Math.abs(cos-.5));
 return cos>=.5;
}
for(const mf of read(path.join(base,'primary-v1/RAW-MANIFEST.json'))){
 const bytes=fs.readFileSync(path.join(base,'primary-v1',mf.file));assert.equal(sha(bytes),mf.sha256);counts.rawFiles++;
 const b=JSON.parse(bytes),cs=b.counterSeat,os=b.ordinarySeat,pre=new Map(),post=new Map(),faces={P1:{x:1,y:0},P2:{x:-1,y:0}},held={P1:{aimX:0,aimY:0},P2:{aimX:0,aimY:0}};
 const events=new Map(),commands={P1:new Map(),P2:new Map()},sample=new Map(b.measurements.samples.map(r=>[r.tick,r])),counter=new Map(b.counterDecisions.map(r=>[Math.round(r.sensorTime*120),r]));
 for(const e of b.events){if(!events.has(e.tick))events.set(e.tick,[]);events.get(e.tick).push(e)}
 for(const [p,rs,lag]of [[cs,b.counterDecisions,30],[os,b.ordinaryDecisions,18]])for(const [i,r]of rs.entries()){assert.equal(r.decision,i);assert.ok(Math.abs(r.sensorTime-i/30)<1e-10);assert.ok(Math.abs(r.receiptTime-(i*4+lag)/120)<1e-10);commands[p].set(i*4+lag,r.command)}
 for(let t=0;t<36000;t++){
  const es=events.get(t)||[];
  if(t%4===0)pre.set(t,structuredClone(faces));
  for(const p of ['P1','P2']){
   const c=commands[p].get(t);if(c)held[p]=c;
   const u=held[p],n=hypot(u.aimX,u.aimY);if(n<=.1)continue;
   const ax=u.aimX/n,ay=u.aimY/n,old=faces[p];
   if(old.x*ax+old.y*ay>=rot.cos){faces[p]={x:ax,y:ay};continue}
   const s=(old.x*ay-old.y*ax<0?-1:1)*rot.sin;
   const rx=old.x*rot.cos-old.y*s,ry=old.x*s+old.y*rot.cos,z=hypot(rx,ry);faces[p]={x:rx/z,y:ry/z};
  }
  if(es.some(e=>['HIT','RECALL_START'].includes(e.type)))post.set(t,structuredClone(faces));
  for(const e of es){
   if(e.type==='THROW'||e.type==='RECALL_START'){
    const f=faces[e.player||e.owner],a=e.facing||e.owner_facing,err=Math.hypot(f.x-a.x,f.y-a.y);counts.facingCheckpoints++;counts.maxFacingError=Math.max(counts.maxFacingError,err);assert.equal(err,0);
   }
   if(e.type==='RESET'){faces.P1={x:1,y:0};faces.P2={x:-1,y:0}}
  }
 }
 // State at the collision sweep, preserving the simulator's P1-before-P2 order.
 function victimStateAtImpact(victim,attacker,t){
  const throws=b.measurements.throws.filter(x=>x.owner===victim&&x.launchTick<=t&&(!x.termination||x.termination.tick>=t));
  assert.ok(throws.length<=1);if(!throws.length)return 'HELD';
  const tr=throws[0];let state='OUTBOUND';
  for(const e of tr.embeds)if(e.tick<t)state='EMBEDDED';
  for(const r of tr.recalls)if(r.tick<=t)state='RETURNING';
  const es=events.get(t)||[];
  const immediateComplete=es.some(e=>e.type==='RECALL_START'&&e.owner===victim&&e.recall_target.x===e.spear_start.x&&e.recall_target.y===e.spear_start.y);
  if(immediateComplete)return 'HELD';
  if(es.some(e=>e.type==='SPEAR_NEUTRALIZED'&&e.spear_owner===victim))return 'HELD';
  if(victim==='P1'&&attacker==='P2'){
   if(es.some(e=>e.type==='EMBED'&&e.owner===victim))state='EMBEDDED';
   if(es.some(e=>e.type==='RECALL_COMPLETE'&&e.owner===victim))state='HELD';
  }
  return state;
 }
 for(const tr of b.measurements.throws){
  assert.ok(tr.recalls.length<=1);
  for(const rec of tr.recalls){
   counts.recalls++;const rr=byRecall.get(tr.throwId);assert.ok(rr);
   const delta={x:rec.ownerPosition.x-rec.spearStart.x,y:rec.ownerPosition.y-rec.spearStart.y};
   if(!delta.x&&!delta.y){counts.zeroLengthRecalls++;continue}
   const d=norm(delta),last=tr.termination?.tick??35999,first=4*(Math.floor(rec.tick/4)+1),victim=tr.victim;
   const expectedAtRecall=visible(rec.opponentPosition,post.get(rec.tick)[victim],rec.spearStart);
   assert.equal(rr.spearVisibleBeforeRecall,expectedAtRecall,`Recall visibility ${tr.throwId}`);
   for(let st=first;st<=Math.min(last,35996);st+=4){
    // Closed form from recorded recall start, independent of the analyzer's iterative spear state.
    const pos={x:rec.spearStart.x+d.x*(st-rec.tick)/10,y:rec.spearStart.y+d.y*(st-rec.tick)/10};
    const body=sample.get(st).players[victim].position,face=pre.get(st)[victim],vis=visible(body,face,pos);counts.sourceSampleGeometryChecks++;
    if(tr.owner===os&&counter.has(st)){
     const record=counter.get(st),len=Math.hypot(d.x,d.y),sd={x:d.x/len,y:d.y/len},me=record.diagnostic.estimatedPosition;
     const rel={x:me.x-pos.x-3*sd.x,y:me.y-pos.y-3*sd.y},along=dot(rel,sd),side=rel.x*sd.y-rel.y*sd.x;
     const threat=vis&&along>=-.4&&along<=12*.55&&Math.abs(side)<.8;
     counts.returningThreatChecks++;counts.visibleReturningThreatChecks+=+vis;counts.positiveReturningThreatChecks+=+threat;assert.equal(threat,!!record.diagnostic.threat);
    }
   }
   const h=b.measurements.hits.find(h=>h.throwId===tr.throwId&&h.phase==='RETURNING');if(!h)continue;
   counts.returningHits++;const row=byHit.get(tr.throwId);assert.ok(row);const lag=tr.owner===os?30:18;
   const age=(h.impactTick-rec.tick+h.impactFraction)/120;assert.ok(Math.abs(age-row.recallToHitSec)<1e-10);
   assert.equal(row.firstPossibleReturningPacketReceiptTick,first+lag);let seen=0,eligible=0,seenEligible=0;
   for(let st=first;st<=h.impactTick;st+=4){
    const pos={x:rec.spearStart.x+d.x*(st-rec.tick)/10,y:rec.spearStart.y+d.y*(st-rec.tick)/10},body=sample.get(st).players[victim].position,face=pre.get(st)[victim];
    const vis=visible(body,face,pos);seen+=+vis;
    if(st+lag<=h.impactTick){const evidence=row.receivedReturningPacketEvidence[eligible];assert.equal(evidence.sensorTick,st);assert.equal(evidence.receiptTick,st+lag);assert.equal(evidence.visible,vis);seenEligible+=+vis;eligible++;
     const rel={x:pos.x-body.x,y:pos.y-body.y},len=Math.hypot(rel.x,rel.y),bearing=len?dot(face,{x:rel.x/len,y:rel.y/len}):null;
     counts.maxRecordedBearingError=Math.max(counts.maxRecordedBearingError,Math.abs(bearing-evidence.spearBearingFacingDot));
    }
   }
   assert.equal(row.visibleReturningSamplesBeforeImpact,seen);assert.equal(row.eligibleReturningPacketsBeforeHit,eligible);assert.equal(row.visibleReturningPacketsReceivedBeforeHit,seenEligible);
   const arrival=-dot(d,post.get(h.impactTick)[victim]);counts.maxRecordedArrivalDotError=Math.max(counts.maxRecordedArrivalDotError,Math.abs(arrival-row.arrivalOriginFacingDot));
   assert.ok(Math.abs(arrival-row.arrivalOriginFacingDot)<1e-12);
   const ownState=victimStateAtImpact(victim,tr.owner,h.impactTick);assert.equal(row.victimSpearStateAtCollision,ownState,`Own state ${tr.throwId}`);
   counts.hitVisibleSourceSamples+=seen;counts.hitVisibleEligibleSamples+=seenEligible;
   if(tr.owner===os){counts.ordinaryReturningHits++;counts.ordinaryBefore250ms+=+(age<.25);counts.ordinaryBeforeAnyPacket+=+(first+lag>h.impactTick);counts.ordinaryTimingOpportunity+=+(first+lag<=h.impactTick);counts.ordinaryBehind+=+(arrival<0);counts.ordinarySpearHeldAtCollision+=+(ownState==='HELD')}
  }
 }
 console.error(`Audited ${counts.rawFiles}/64: ${b.boutId}`);
}
assert.equal(counts.rawFiles,64);assert.equal(counts.ordinaryReturningHits,1178);assert.equal(counts.returningHits,1685);assert.equal(counts.facingCheckpoints,49031);assert.equal(counts.returningThreatChecks,181876);assert.equal(counts.visibleReturningThreatChecks,100899);assert.equal(counts.positiveReturningThreatChecks,0);assert.equal(counts.ordinaryBefore250ms,44);assert.equal(counts.ordinaryBeforeAnyPacket,48);assert.equal(counts.ordinaryTimingOpportunity,1130);assert.equal(counts.ordinaryBehind,1178);assert.equal(counts.ordinarySpearHeldAtCollision,1094);assert.equal(counts.hitVisibleSourceSamples,0);assert.equal(counts.hitVisibleEligibleSamples,0);
console.log(JSON.stringify({status:'passed',scope:'Independent raw-lineage and closed-form RETURNING geometry reconstruction; independent facing loop using frozen arithmetic; analysis only',counts},null,2));
