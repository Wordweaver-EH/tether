// Fixed 16-bout comparison. No outcome-driven tuning or further seed search.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { createWorld, step, hashWorld, snapshotWorld } from '../../src/sim.js';
import { percept } from '../../src/perception.js';
import { createCoverAgent } from '../../src/agents/cover-control.mjs';
import { createIntegratedCoverMind } from '../../src/agents/cover-integrated.mjs';
const here=new URL('.',import.meta.url),root=resolve(new URL('../..',here).pathname);
const [referenceRoot,outputPath,reviewedCommit]=process.argv.slice(2);
if(!referenceRoot||!outputPath||!/^\w{40}$/.test(reviewedCommit??''))
 throw Error('Usage: node run.mjs V1_CHECKOUT NEW_OUTPUT_DIRECTORY REVIEWED_SOURCE_COMMIT');
const ref=resolve(referenceRoot),output=resolve(outputPath);
const sha=b=>createHash('sha256').update(b).digest('hex');
const reference=JSON.parse(readFileSync(new URL('v1-source-manifest.json',here)));
for(const [p,digest]of Object.entries(reference.files))assert.equal(sha(readFileSync(resolve(ref,p))),digest,`v1 source: ${p}`);
const paths=[...Object.keys(reference.files),'client/mind-readouts.mjs','replay/app.mjs',
 'test/cover-arbitration.test.mjs','test/cover-integrated-client.test.mjs',
 'benchmark/cover-arbitration-v2/PROTOCOL.md','benchmark/cover-arbitration-v2/run.mjs',
 'benchmark/cover-arbitration-v2/verify.mjs','benchmark/cover-arbitration-v2/v1-source-manifest.json'];
const source=Object.fromEntries(paths.map(p=>[p,sha(readFileSync(resolve(root,p)))]));
const createV1=(await import(pathToFileURL(resolve(ref,'src/agents/cover-integrated.mjs')))).createIntegratedCoverMind;
const seeds=[1237,2081,3253,4447],durationSec=30,variants={v1:createV1,repaired:createIntegratedCoverMind};
mkdirSync(output); // Refuse to overwrite any prior run.
writeFileSync(resolve(output,'source-before-run.json'),JSON.stringify({reference,reviewedCommit,source,seeds,durationSec,variants:Object.keys(variants)},null,2)+'\n');
const bouts=[];
for(const seed of seeds)for(const seat of [0,1])for(const [variant,factory]of Object.entries(variants)){
 const w=createWorld({gameMode:'COVER_CONTROL'}),id=`P${seat+1}`;
 const mind=factory({seed,captureTrace:false,captureDiagnostics:true}),baseline=createCoverAgent({seed:seed+1});
 const agents=seat===0?[mind,baseline]:[baseline,mind],sensorHistory=[],rows=[];
 const stream=createHash('sha256');let serial=0;
 const r={variant,seed,seat:id,durationSec,points:{ring:[0,0],hit:[0,0]},throws:[0,0],recalls:[0,0],
  throwEvents:[0,0],recallEvents:[0,0],ringOccupancyTicks:[0,0],contestedTicks:0,objectiveResumeAfterDefense:0,
  focus:{},decisions:0,defensiveDecisions:0,defensiveEmbeddedDecisions:0,defensiveThrows:0,defensiveRecalls:0,
  defensiveEmbeddedWithoutRecall:0,defensiveShotIntentions:variant==='repaired'?0:null,
  defensiveShotGuardReasons:variant==='repaired'?{}:null,
  planningRequests:0,planningAttempts:0,planningCompleted:0,planningUnfinished:0,
  selectedRolloutCommandsIssued:variant==='repaired'?0:null,budgetSpent:0,maxBudgetSpent:0,budgetByKind:{}};
 rows.push({record:'header',variant,seed,seat:id,durationSec,reviewedCommit,reference:reference.reference,
  initialWorld:snapshotWorld(w),mindSettings:mind.settings(),baselineSettings:baseline.settings(),
  scope:'All commands, events and decisions; evaluation world fields never supplied to controller'});
 let priorDefense=false;
 for(let tick=0;tick<durationSec*120;tick++){
  const views=[percept(w,'P1','MODE_B'),percept(w,'P2','MODE_B')];sensorHistory.push(views[seat]);
  const inputs=agents.map((a,i)=>a.act(views[i]));stream.update(JSON.stringify(inputs));
  for(let i=0;i<2;i++) {r.throws[i]+=!!inputs[i].throw;r.recalls[i]+=!!inputs[i].recall;
   assert.equal(inputs[i].throw&&inputs[i].recall,false);
   const p=w.players[i].position;if(Math.hypot(p.x-w.experiment.OBJECTIVE.position.x,p.y-w.experiment.OBJECTIVE.position.y)<w.experiment.OBJECTIVE.radius)r.ringOccupancyTicks[i]++;
  }
  r.contestedTicks+=w.objective.contested;
  if(tick>=18&&(tick-18)%4===0){
   const d=mind.lastDecision();assert.ok(d&&d.serial!==serial);serial=d.serial;
   const c=d.cognition,cover=c.cover,defense=c.tier===0||d.focus==='Threat',focus=c.tier===0?'Reflex':d.focus??'None';
   const sensor=sensorHistory[tick-18];
   assert.deepEqual(d.actualCommand,inputs[seat]);assert.ok(Math.abs(d.commandTime-d.time-.15)<1e-9);
   assert.ok(c.budget.spent<=192);r.decisions++;r.focus[focus]=(r.focus[focus]??0)+1;
   r.defensiveDecisions+=defense;
   const embedded=c.situation.startsWith('EMBEDDED:');r.defensiveEmbeddedDecisions+=defense&&embedded;
   r.defensiveEmbeddedWithoutRecall+=defense&&embedded&&!d.input.recall;
   r.defensiveThrows+=defense&&d.input.throw;r.defensiveRecalls+=defense&&d.input.recall;
   if(priorDefense&&!defense&&d.focus==='Objective')r.objectiveResumeAfterDefense++;
   priorDefense=defense;
   r.planningRequests+=cover.planning.requested;r.planningAttempts+=cover.planning.attempted;
   r.planningCompleted+=cover.planning.requested&&cover.planning.status==='completed';
   r.planningUnfinished+=cover.planning.requested&&cover.planning.status==='unfinished';
   if(variant==='repaired'){
    r.selectedRolloutCommandsIssued+=cover.planning.selectedRolloutCommandIssued;
    if(defense){r.defensiveShotIntentions+=cover.arbitration.intended.throw;
     const reason=cover.arbitration.guard.reason??'compatible visible-target shot';
     r.defensiveShotGuardReasons[reason]=(r.defensiveShotGuardReasons[reason]??0)+1;
     if(d.input.throw){assert.ok(sensor.opponent);assert.equal(cover.arbitration.guard.shotAllowed,true);}
    }
    if(c.tier===0){assert.equal(c.selectedBranch,null);assert.equal(c.issuedLearningTier,0);assert.equal(cover.planning.selectedRolloutCommandIssued,false);}
    if(cover.planning.selectedRolloutCommandIssued)assert.ok(c.selectedBranch&&(d.input.throw||d.input.recall));
   }
   r.budgetSpent+=c.budget.spent;r.maxBudgetSpent=Math.max(r.maxBudgetSpent,c.budget.spent);
   for(const [kind,n]of Object.entries(c.budget.byKind))r.budgetByKind[kind]=(r.budgetByKind[kind]??0)+n;
   rows.push({record:'decision',tick,serial:d.serial,sensorTime:d.time,commandTime:d.commandTime,
    sensor,focus:d.focus,tier:c.tier,situation:c.situation,tactic:c.tactic,issuedLearningTier:c.issuedLearningTier,
    automatic:c.automatic,budget:c.budget,cover,selectedBranch:c.selectedBranch,
    branches:c.branches.map(b=>({tactic:b.tactic,target:b.target,value:b.value,trials:b.trials,completion:b.completion})),
    input:d.input,actualCommand:d.actualCommand});
  }
  const events=step(w,inputs);
  for(const e of events){
   if(e.type==='CONTROL_POINT')r.points.ring[e.player==='P1'?0:1]++;
   if(e.type==='HIT'){const who=e.attacker??e.scorer??e.player??e.owner;assert.ok(['P1','P2'].includes(who));r.points.hit[who==='P1'?0:1]++;}
   if(e.type==='THROW')r.throwEvents[e.player==='P1'?0:1]++;
   if(e.type==='RECALL_START')r.recallEvents[e.owner==='P1'?0:1]++;
  }
  rows.push({record:'step',tick,inputs,events,...(tick%120===119?{worldHash:hashWorld(w)}:{})});
 }
 r.score=w.players.map(p=>p.score);r.inputSha256=stream.digest('hex');r.finalWorldHash=hashWorld(w);r.cognition=mind.cognition();
 assert.equal(r.cognition.learningUpdates,0);assert.equal(r.cognition.automaticDecisions,0);
 for(let i=0;i<2;i++)assert.equal(r.score[i],r.points.ring[i]+r.points.hit[i]);
 rows.push({record:'summary',...r,finalWorld:snapshotWorld(w)});
 r.logFile=`${variant}-${seed}-${id}.jsonl.gz`;
 const bytes=gzipSync(rows.map(JSON.stringify).join('\n')+'\n');r.logSha256=sha(bytes);r.logBytes=bytes.length;
 writeFileSync(resolve(output,r.logFile),bytes);bouts.push(r);
 writeFileSync(resolve(output,'completed-bouts.json'),JSON.stringify(bouts,null,2)+'\n');
 console.log(`${variant} seed=${seed} seat=${id} score=${r.score.join(':')} defense-recall=${r.defensiveRecalls}/${r.defensiveEmbeddedDecisions}`);
}
for(const [p,digest]of Object.entries(source))assert.equal(sha(readFileSync(resolve(root,p))),digest,`source changed: ${p}`);
for(const [p,digest]of Object.entries(reference.files))assert.equal(sha(readFileSync(resolve(ref,p))),digest,`v1 changed: ${p}`);
const aggregates=Object.fromEntries(Object.keys(variants).map(variant=>{
 const rows=bouts.filter(r=>r.variant===variant),a={bouts:rows.length,mindPoints:0,baselinePoints:0,mindRingPoints:0,baselineRingPoints:0,
  mindHitPoints:0,baselineHitPoints:0,mindThrows:0,mindRecalls:0,mindThrowEvents:0,mindRecallEvents:0,
  mindRingOccupancyTicks:0,baselineRingOccupancyTicks:0,contestedTicks:0,focus:{}};
 for(const r of rows){const i=r.seat==='P1'?0:1;
  for(const [k,val]of Object.entries({mindPoints:r.score[i],baselinePoints:r.score[1-i],mindRingPoints:r.points.ring[i],baselineRingPoints:r.points.ring[1-i],
   mindHitPoints:r.points.hit[i],baselineHitPoints:r.points.hit[1-i],mindThrows:r.throws[i],mindRecalls:r.recalls[i],mindThrowEvents:r.throwEvents[i],mindRecallEvents:r.recallEvents[i],
   mindRingOccupancyTicks:r.ringOccupancyTicks[i],baselineRingOccupancyTicks:r.ringOccupancyTicks[1-i],contestedTicks:r.contestedTicks}))a[k]+=val;
  for(const k of ['decisions','defensiveDecisions','defensiveEmbeddedDecisions','defensiveThrows','defensiveRecalls','defensiveEmbeddedWithoutRecall',
   'objectiveResumeAfterDefense','planningRequests','planningAttempts','planningCompleted','planningUnfinished','budgetSpent'])a[k]=(a[k]??0)+r[k];
  for(const [k,n]of Object.entries(r.focus))a.focus[k]=(a.focus[k]??0)+n;
 }
 return [variant,a];
}));
const result={scope:'fixed bounded repair characterization; no human engagement, general strength, learning or consciousness inference',
 node:process.version,seeds,durationSec,reviewedCommit,reference:reference.reference,source,aggregates,bouts,
 checks:{sourceUnchanged:true,referenceUnchanged:true,scoreReconciled:true,learnerDisabled:true,completeLogsRetained:true}};
writeFileSync(resolve(output,'summary.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(aggregates,null,2));
