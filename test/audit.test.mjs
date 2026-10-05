import test from 'node:test';
import assert from 'node:assert/strict';
import {bootstrapMean,pairedEffect,classifyEffect} from '../arena/audit-stats.mjs';
test('paired audit clusters repeated seats by seed and uses ablated-minus-full sign',()=>{
 const rows=[];for(let seed=1;seed<=3;seed++)for(const seat of [1,2])for(const variant of ['full','noWorkspace'])rows.push({budget:4,seed,mode:'MODE_B',seat,opponent:'bot',variant,metrics:{scoreMargin:variant==='full'?10:10+seed}});
 const effect=pairedEffect(rows,'noWorkspace','scoreMargin');assert.equal(effect.mean,2);assert.equal(effect.n,3);assert.equal(effect.pairedBouts,6);assert.equal(classifyEffect(effect),'increase');
});
test('audit rejects incomplete pairing and preserves honest nulls',()=>{
 assert.throws(()=>pairedEffect([{variant:'x',seed:1,metrics:{win:1}}],'x','win'),/unmatched/);
 const c=bootstrapMean([0,0,0,0]);assert.equal(c.mean,0);assert.equal(c.lo,0);assert.equal(c.hi,0);assert.equal(classifyEffect(c),'inconclusive / null-compatible');
 assert.equal(classifyEffect(bootstrapMean([1])),'insufficient');
 assert.deepEqual(bootstrapMean([1,2,3]),bootstrapMean([1,2,3]));
});
import {auditJobs,sourceFingerprint} from '../arena/audit.mjs';
import {auditHtml,auditMarkdown} from '../arena/audit-report.mjs';
test('audit matrix balances both seats for every matched condition',()=>{
 const config={budgets:[48,192],seedStart:1,seeds:2,modes:['MODE_A','MODE_B'],opponents:['bot'],variants:['full','noBelief'],durationSec:300};
 const jobs=auditJobs(config);assert.equal(jobs.length,32);
 for(const row of jobs.filter(r=>r.variant==='noBelief'))assert.equal(jobs.filter(r=>r.variant==='full'&&['budget','seed','mode','seat','opponent'].every(k=>r[k]===row[k])).length,1);
 assert.equal(new Set(jobs.map(r=>r.id)).size,jobs.length);
});
test('static audit report includes limitations and escapes supplied metadata',()=>{
 const report={status:'pilot <unsafe>',rows:[],config:{durationSec:30,seeds:1,budgets:[48],workers:1},summary:[],command:'node <bad>',sourceFingerprint:{before:'abc',after:'abc'},runtime:{node:'v24',seconds:1}};
 const html=auditHtml(report);assert.match(html,/pilot &lt;unsafe&gt;/);assert.doesNotMatch(html,/<unsafe>/);assert.match(html,/subjective experience/);assert.match(auditMarkdown(report),/Speech\/bluff effects are untested/);
});
test('source manifest fingerprint is stable and covers simulation plus audit code',async()=>{
 const a=await sourceFingerprint(),b=await sourceFingerprint();assert.equal(a.hash,b.hash);assert.match(a.hash,/^[a-f0-9]{64}$/);assert.ok(a.files['src/sim.js']);assert.ok(a.files['arena/audit.mjs']);
});
test('audit rejects missing ablation counterparts and duplicate rows',()=>{
 const base={variant:'full',seed:1,metrics:{win:1}};
 assert.throws(()=>pairedEffect([base],'x','win'),/unmatched/);
 assert.throws(()=>pairedEffect([base,base,{...base,variant:'x'}],'x','win'),/duplicate/);
});
import {readCheckpoint} from '../arena/audit.mjs';
test('checkpoint resumes only complete rows, rejects duplicate/mismatched data',()=>{
 const jobs=[{id:0,seed:1},{id:1,seed:2}],row={...jobs[0],metrics:{win:1}};
 const text=JSON.stringify(row)+'\n'+JSON.stringify(jobs[1]).slice(0,6);
 const result=readCheckpoint(text,jobs);assert.deepEqual(result.rows,[row]);assert.equal(result.committed,JSON.stringify(row)+'\n');
 assert.throws(()=>readCheckpoint(JSON.stringify(row)+'\n'+JSON.stringify(row)+'\n',jobs),/duplicate/);
 assert.throws(()=>readCheckpoint('{"id":0,"seed":4}\n',jobs),/mismatch/);
});
import {runGameBout} from '../arena/core.mjs';
import * as tetherAdapter from '../arena/tether-adapter.mjs';
test('generic arena calls optional final percept hook exactly once for each agent',()=>{
 const calls=[[],[]],agents=[0,1].map(i=>({act:()=>({}),finish:view=>calls[i].push(view)}));
 runGameBout({game:tetherAdapter.game,adapter:tetherAdapter,agents,mode:'MODE_B',durationSec:0.1});
 assert.equal(calls[0].length,1);assert.equal(calls[1].length,1);assert.equal(calls[0][0].time.elapsedSec,0.1);assert.equal(calls[0][0].viewerId,'P1');assert.equal(calls[1][0].viewerId,'P2');
});
