// Post-run accounting/replay audit; does not run new bouts or alter policy.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {restoreWorld,step,hashWorld} from '../../src/sim.js';
import {fileURLToPath} from 'node:url';
const root=process.argv[2]??fileURLToPath(new URL('./results',import.meta.url));
const summary=JSON.parse(readFileSync(`${root}/summary.json`));const parsed=new Map();
const replay=[];
for(const bout of summary.bouts){
 const bytes=readFileSync(`${root}/${bout.logFile}`);assert.equal(createHash('sha256').update(bytes).digest('hex'),bout.logSha256);
 const lines=gunzipSync(bytes).toString().trim().split('\n').map(JSON.parse);const w=restoreWorld(lines[0].initialWorld);
 let frames=0,decisions=0;
 for(const row of lines){
  if(row.record==='step'){assert.deepEqual(step(w,row.inputs),row.events);if(row.worldHash)assert.equal(hashWorld(w),row.worldHash);frames++;}
  if(row.record==='decision')decisions++;
 }
 assert.equal(frames,3600);assert.equal(decisions,896);assert.equal(hashWorld(w),bout.finalWorldHash);
 replay.push({log:bout.logFile,frames,decisions,eventsExact:true,finalWorldExact:true});parsed.set(`${bout.variant}-${bout.seed}-${bout.seat}`,lines);
}
const pairs=[];
for(const a of summary.bouts.filter(b=>b.variant==='v1')){
 const b=summary.bouts.find(b=>b.variant==='repaired'&&b.seed===a.seed&&b.seat===a.seat),i=a.seat==='P1'?0:1;
 const old=parsed.get(`v1-${a.seed}-${a.seat}`),fresh=parsed.get(`repaired-${a.seed}-${a.seat}`);
 const x=old.filter(r=>r.record==='step'),y=fresh.filter(r=>r.record==='step');
 const differences=x.flatMap((r,n)=>JSON.stringify(r.inputs)===JSON.stringify(y[n].inputs)?[]:[n]);
 const weaponDifferences=x.flatMap((r,n)=>r.inputs.some((c,i)=>c.throw!==y[n].inputs[i].throw||c.recall!==y[n].inputs[i].recall)?[n]:[]);
 const at=(rows,tick)=>rows.filter(r=>r.record==='decision'&&r.tick<=tick).at(-1);
 pairs.push({seed:a.seed,seat:a.seat,inputEqual:a.inputSha256===b.inputSha256,worldEqual:a.finalWorldHash===b.finalWorldHash,scoreEqual:JSON.stringify(a.score)===JSON.stringify(b.score),
  changedInputTicks:differences.length,weaponDifferenceTicks:weaponDifferences,
  firstDifference:differences.length?{tick:differences[0],v1:at(old,differences[0]),repaired:at(fresh,differences[0])}:null});
}
const records=[...parsed.entries()].flatMap(([id,rs])=>rs.filter(r=>r.record==='decision').map(d=>({id,...d})));
const embedded=records.filter(d=>(d.tier===0||d.focus==='Threat')&&d.situation.startsWith('EMBEDDED:')).map(d=>({id:d.id,tick:d.tick,time:d.sensorTime,tier:d.tier,focus:d.focus,input:d.input,actual:d.actualCommand,cover:d.cover}));
const guards={};for(const d of records.filter(d=>d.id.startsWith('repaired')&&d.cover.arbitration.defensive)){const reason=d.cover.arbitration.guard.reason??'allowed';guards[reason]=(guards[reason]??0)+1;}
const result={replay,pairs,defensiveEmbedded:embedded,defensiveShotGuardReasons:guards,maxBudget:Math.max(...summary.bouts.map(b=>b.maxBudgetSpent)),
  sourceCommit:summary.reviewedCommit,scope:'Post-run replay/accounting audit only; no policy edits or extra bouts'};
writeFileSync(`${root}/audit.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({replayBouts:replay.length,pairs:pairs.map(({firstDifference,...p})=>({...p,firstDifference:firstDifference&&{tick:firstDifference.tick,v1:{focus:firstDifference.v1.focus,tier:firstDifference.v1.tier,input:firstDifference.v1.input},repaired:{focus:firstDifference.repaired.focus,tier:firstDifference.repaired.tier,input:firstDifference.repaired.input,guard:firstDifference.repaired.cover.arbitration.guard}}})),embedded:embedded.map(({cover,...e})=>e),guards,maxBudget:result.maxBudget},null,2));
