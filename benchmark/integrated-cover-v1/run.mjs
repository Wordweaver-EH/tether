// Fixed short engineering characterization, not a held-out strength study.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createWorld, step, hashWorld } from '../../src/sim.js';
import { percept } from '../../src/perception.js';
import { createCoverAgent } from '../../src/agents/cover-control.mjs';
import { createIntegratedCoverMind } from '../../src/agents/cover-integrated.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const seeds=[101,307,509,911],durationSec=30;
const variants={full:{},objectiveOff:{objective:false},threatOff:{threat:false},routeCacheOff:{routeCache:false},reportOff:{report:false}};
const files=['src/mind/index.mjs','src/mind/cover-policy.mjs','src/agents/cover-integrated.mjs','src/agents/cover-control.mjs','src/agents/cover-interface.mjs','benchmark/integrated-cover-v1/PROTOCOL.md','benchmark/integrated-cover-v1/run.mjs'];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const identity=Object.fromEntries(files.map(path=>[path,sha(readFileSync(resolve(root,path)))]));
const output=resolve(process.argv[2]??resolve(root,'benchmark/integrated-cover-v1/results'));
mkdirSync(output,{recursive:true});
writeFileSync(resolve(output,'source-before-run.json'),JSON.stringify({declared:'2026-10-07',files:identity,seeds,durationSec,variants},null,2)+'\n');
const bouts=[];
for(const [variant,controls]of Object.entries(variants))for(const seed of seeds)for(const seat of [0,1]){
 const w=createWorld({gameMode:'COVER_CONTROL'}),id=`P${seat+1}`;
 const mind=createIntegratedCoverMind({seed,controls,captureTrace:false,captureDiagnostics:true});
 const baseline=createCoverAgent({seed:seed+1});
 const agents=seat===0?[mind,baseline]:[baseline,mind],stream=createHash('sha256');
 const row={variant,seed,seat:id,durationSec,score:null,points:{ring:[0,0],hit:[0,0]},throws:[0,0],recalls:[0,0],focus:{},decisions:0,
  planningRequests:0,planningAttempts:0,planningCompleted:0,planningUnfinished:0,fallbackDecisions:0,routeCacheUses:0,routeEvaluations:0,
  reflexes:0,budgetSpent:0,budgetByKind:{},examples:[]};
 let serial=0;const exampleKinds=new Set();
 for(let tick=0;tick<durationSec*120;tick++){
  const inputs=agents.map((a,i)=>a.act(percept(w,`P${i+1}`,'MODE_B')));
  stream.update(JSON.stringify(inputs));
  for(let i=0;i<2;i++){row.throws[i]+=!!inputs[i].throw;row.recalls[i]+=!!inputs[i].recall;}
  if(tick>=18&&(tick-18)%4===0){
   const d=mind.lastDecision();if(d&&d.serial!==serial){serial=d.serial;const c=d.cognition,cover=c.cover;row.decisions++;
    const focus=c.tier===0?'Reflex':d.focus??'None';row.focus[focus]=(row.focus[focus]??0)+1;
    row.planningRequests+=cover.planning.requested;row.planningAttempts+=cover.planning.attempted;
    row.planningCompleted+=cover.planning.requested&&cover.planning.status==='completed';
    row.planningUnfinished+=cover.planning.requested&&cover.planning.status==='unfinished';
    row.fallbackDecisions+=!!cover.planning.fallback;row.routeCacheUses+=cover.routeCache.reused;
    row.routeEvaluations+=(c.budget.byKind['cover-route']??0)>0;row.reflexes+=c.tier===0;
    row.budgetSpent+=c.budget.spent;for(const [kind,n]of Object.entries(c.budget.byKind))row.budgetByKind[kind]=(row.budgetByKind[kind]??0)+n;
    const kind=cover.planning.fallback?'fallback':focus;
    if(!exampleKinds.has(kind)&&row.examples.length<5){exampleKinds.add(kind);row.examples.push({time:d.time,focus,intent:cover.intent,reason:cover.reason,
     plan:cover.planning,requested:d.input,issued:d.actualCommand,evidence:cover.evidence});}
   }
  }
  for(const e of step(w,inputs)){
   if(e.type==='CONTROL_POINT')row.points.ring[e.player==='P1'?0:1]++;
   if(e.type==='HIT'){const scorer=e.attacker??e.scorer??e.player??e.owner;if(!['P1','P2'].includes(scorer))throw new Error('Unexpected HIT schema '+JSON.stringify(e));row.points.hit[scorer==='P1'?0:1]++;}
  }
 }
 row.score=w.players.map(p=>p.score);row.inputSha256=stream.digest('hex');row.finalWorldHash=hashWorld(w);row.cognition=mind.cognition();
 bouts.push(row);console.log(`${variant} seed=${seed} seat=${id} score=${row.score.join(':')} plans=${row.planningAttempts}/${row.decisions}`);
}
const aggregates=Object.fromEntries(Object.keys(variants).map(variant=>{
 const rows=bouts.filter(b=>b.variant===variant),a={bouts:rows.length,mindPoints:0,baselinePoints:0,mindRingPoints:0,mindHitPoints:0,
  baselineRingPoints:0,baselineHitPoints:0,decisions:0,planningAttempts:0,planningCompleted:0,planningUnfinished:0,routeCacheUses:0,budgetSpent:0,focus:{}};
 for(const r of rows){const i=r.seat==='P1'?0:1;a.mindPoints+=r.score[i];a.baselinePoints+=r.score[1-i];a.mindRingPoints+=r.points.ring[i];a.mindHitPoints+=r.points.hit[i];a.baselineRingPoints+=r.points.ring[1-i];a.baselineHitPoints+=r.points.hit[1-i];
  for(const k of ['decisions','planningAttempts','planningCompleted','planningUnfinished','routeCacheUses','budgetSpent'])a[k]+=r[k];
  for(const [k,n]of Object.entries(r.focus))a.focus[k]=(a.focus[k]??0)+n;}
 return [variant,a];
}));
const reportParity=bouts.filter(b=>b.variant==='full').map(b=>{const other=bouts.find(c=>c.variant==='reportOff'&&c.seed===b.seed&&c.seat===b.seat);return {seed:b.seed,seat:b.seat,equalInputs:b.inputSha256===other.inputSha256,equalWorld:b.finalWorldHash===other.finalWorldHash};});
const result={scope:'fixed short engineering characterization; no human fun, general strength, learned strategy or consciousness inference',node:process.version,seeds,durationSec,
 source:identity,aggregates,reportParity,bouts};
for(const [path,digest]of Object.entries(identity))if(sha(readFileSync(resolve(root,path)))!==digest)throw new Error('Source changed while running: '+path);
writeFileSync(resolve(output,'summary.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({aggregates,reportParity},null,2));
