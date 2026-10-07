// Replays retained outcomes, never starts new bouts or retunes any controller.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {restoreWorld,snapshotWorld,step,hashWorld} from '../../src/sim.js';
const root=resolve(process.argv[2]??'');if(!process.argv[2])throw Error('Usage: audit.mjs EVIDENCE_DIRECTORY');
const result=JSON.parse(readFileSync(resolve(root,'summary.json'))),replays=[];
for(const b of result.bouts){
 const bytes=readFileSync(resolve(root,b.logFile));assert.equal(createHash('sha256').update(bytes).digest('hex'),b.logSha256);
 const rows=gunzipSync(bytes).toString().trim().split('\n').map(JSON.parse),w=restoreWorld(rows[0].initialWorld),stream=createHash('sha256'),prefix=createHash('sha256');let frames=0,decisions=0;
 for(const row of rows){
  if(row.record==='decision'){
   decisions++;assert.ok(row.budget.spent<=192);assert.ok(Math.abs(row.commandTime-row.time-.15)<1e-8);
   assert.deepEqual(row.evaluationOnly.commandEnemy,w.players[b.seat==='P1'?1:0].position);
   if(b.variant==='monitorOff')assert.equal(row.coordination.request??null,null);
   if(b.variant==='fixed'&&row.coordination.request)assert.equal(row.coordination.request.reason,'fixed-monitor-schedule');
  }
  if(row.record==='step'){assert.equal(row.tick,frames);stream.update(JSON.stringify(row.inputs));if(row.tick<result.protocol.switchSec*120)prefix.update(JSON.stringify(row.inputs));assert.deepEqual(step(w,row.inputs),row.events);if(row.worldHash)assert.equal(hashWorld(w),row.worldHash);frames++;}
 }
 assert.equal(frames,b.durationSec*120);assert.equal(decisions,Math.ceil((frames-18)/4));assert.equal(hashWorld(w),b.finalWorldHash);assert.deepEqual(snapshotWorld(w),rows.at(-1).finalWorld);assert.equal(stream.digest('hex'),b.inputSha256);
 replays.push({file:b.logFile,seed:b.seed,seat:b.seat,condition:b.condition,variant:b.variant,frames,decisions,preSwitchInputsSha256:prefix.digest('hex'),exact:true});
}
for(const r of replays.filter(r=>r.condition==='familiar')){const other=replays.find(o=>o.condition==='switch'&&o.seed===r.seed&&o.seat===r.seat&&o.variant===r.variant);assert.equal(r.preSwitchInputsSha256,other.preSwitchInputsSha256,'familiar/switch must share pre-switch command prefix');}
const aggregates={};for(const condition of result.protocol.conditions)for(const variant of result.protocol.variants){
 const bs=result.bouts.filter(b=>b.condition===condition&&b.variant===variant),a={bouts:bs.length,subjectPoints:0,opponentPoints:0,subjectHitPoints:0,subjectRingPoints:0,opponentHitPoints:0,opponentRingPoints:0,subjectRingSeconds:0,opponentRingSeconds:0,contestedSeconds:0,phases:{before:{},after:{}},recoveries:{completed:0,censored:0,completedSeconds:[]}};
 for(const b of bs){const i=b.seat==='P1'?0:1;a.subjectPoints+=b.subjectScore;a.opponentPoints+=b.opponentScore;a.subjectHitPoints+=b.points.hit[i];a.subjectRingPoints+=b.points.ring[i];a.opponentHitPoints+=b.points.hit[1-i];a.opponentRingPoints+=b.points.ring[1-i];a.subjectRingSeconds+=b.ringTicks[i]/120;a.opponentRingSeconds+=b.ringTicks[1-i]/120;a.contestedSeconds+=b.contestedTicks/120;
  for(const p of ['before','after'])for(const [k,v]of Object.entries(b.phases[p]))a.phases[p][k]=(a.phases[p][k]??0)+v;
  for(const recovery of b.recoveries){a.recoveries[recovery.censored?'censored':'completed']++;if(!recovery.censored)a.recoveries.completedSeconds.push(recovery.seconds);}
 }
 for(const q of Object.values(a.phases)){q.meanStaleError=q.staleSamples?q.staleErrorSum/q.staleSamples:null;q.meanCommandTimeStaleError=q.staleSamples?q.commandErrorSum/q.staleSamples:null;q.meanAssessedError=q.assessments?q.assessmentErrorSum/q.assessments:null;}
 aggregates[`${condition}/${variant}`]=a;
}
const pairs=[];for(const full of result.bouts.filter(b=>b.variant==='full'))for(const comparator of ['monitorOff','fixed']){
 const other=result.bouts.find(b=>b.seed===full.seed&&b.seat===full.seat&&b.condition===full.condition&&b.variant===comparator);assert.ok(other);
 const sum=(b,key)=>b.phases.before[key]+b.phases.after[key];
 pairs.push({seed:full.seed,seat:full.seat,condition:full.condition,comparator,fullMargin:full.margin,comparatorMargin:other.margin,marginDifference:full.margin-other.margin,inputEqual:full.inputSha256===other.inputSha256,budgetDifference:sum(full,'budget')-sum(other,'budget'),planningDifference:sum(full,'planning')-sum(other,'planning')});
}
const clusters=[];for(const seed of [...new Set(result.bouts.map(b=>b.seed))])for(const comparator of ['monitorOff','fixed']){
 const mean=condition=>{const ps=pairs.filter(p=>p.seed===seed&&p.condition===condition&&p.comparator===comparator);return ps.reduce((s,p)=>s+p.marginDifference,0)/ps.length;};const familiar=mean('familiar'),switched=mean('switch');clusters.push({seed,comparator,familiar,switched,differenceInDifferences:switched-familiar});
}
const audit={mode:result.mode,checkpoint:result.checkpoint,protocol:result.protocol,replays,aggregates,pairs,seedClusters:clusters,scope:'Descriptive four-seed gameplay result; no equal-compute, C1 causal benefit, learned competence, human-fun or consciousness inference'};
writeFileSync(resolve(root,'audit.json'),JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify({replayed:replays.length,aggregates,seedClusters:clusters},null,2));
