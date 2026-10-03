import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {makeSchedule,totals,enforce,parseProc,cpuSnapshot,hash,tree,createHashSweep,durable,preflight,ORIGINAL_START,CAPACITY_DEADLINE} from './supervisor.mjs';
const base={phase:'evaluation',cluster:0,condition:'default',arm:'mind-full',seat:0};
const tasks=[{...base,id:'a',bout:0},{...base,id:'b',bout:1},{...base,seat:1,id:'c',bout:0},{...base,seat:1,id:'d',bout:1}];
test('accepted predecessor retained, unfinished ordered exactly once',()=>{const groups=makeSchedule(tasks,['a'],['b','c','d']);assert.deepEqual(groups.map(g=>g.map(t=>t.id)),[['a','b'],['c','d']]);assert.equal(groups[0][0],tasks[0]);});
test('fully accepted groups skipped',()=>assert.deepEqual(makeSchedule(tasks,['a','b'],['c','d']).map(g=>g.map(t=>t.id)),[['c','d']]));
for(const [label,a,u] of [['unknown',['a'],['b','c','z']],['duplicate',['a','a'],['b','c']],['overlap',['a'],['a','c','d']],['gap',[],['a','b','c']],['invalid ancestry',['b'],['a','c','d']]])test('reject '+label,()=>assert.throws(()=>makeSchedule(tasks,a,u)));
test('capacity bound not added to measured bound',()=>{const s={parentCpuSeconds:2,reapedChildrenCpuSeconds:3,liveChildrenCpuSeconds:4};const t=totals(s,100,42,.5,Date.parse(ORIGINAL_START)+20000);assert.equal(t.cpuSeconds,180);assert.equal(t.measuredCpuSeconds,109.5);assert.equal(t.rawBytes,42);});
test('earlier capacity deadline and original caps retained',()=>{const limits={maxPhaseCpuSeconds:129600,maxPhaseRawBytes:17179869184};assert.throws(()=>enforce({cpuSeconds:0,rawBytes:0},limits,Date.parse(CAPACITY_DEADLINE)));assert.throws(()=>enforce({cpuSeconds:129601,rawBytes:0},limits,Date.parse(ORIGINAL_START)));assert.throws(()=>enforce({cpuSeconds:0,rawBytes:17179869185},limits,Date.parse(ORIGINAL_START)));});
function proc(u,s,cu=0,cs=0){const fields=Array(25).fill('0');fields[0]='S';fields[11]=u;fields[12]=s;fields[13]=cu;fields[14]=cs;return `1 (mock odd ) name) ${fields.join(' ')}`;}
test('proc parser respects parentheses',()=>assert.equal(parseProc(proc(13,17,19,23)).childrenSystem,23));
test('live and reaped CPU charged once',()=>{const s=cpuSnapshot([999],100,p=>p.includes('/999/')?proc(20,30):proc(0,0,100,200));assert.equal(s.liveChildrenCpuSeconds,.5);assert.equal(s.reapedChildrenCpuSeconds,3);});
test('accounting retries reap transition',()=>{let n=0;const s=cpuSnapshot([999],100,p=>{if(p.includes('/999/'))return proc(20,30);n++;return n===1?proc(0,0):proc(0,0,100,200);});assert.equal(n,4);assert.equal(s.reapedChildrenCpuSeconds,3);});
test('missing exited pid tolerated but permissions denied fail',()=>{assert.equal(cpuSnapshot([999],100,p=>{if(p.includes('/999/'))throw Object.assign(new Error(),{code:'ENOENT'});return proc(0,0,100,200);}).liveChildrenCpuSeconds,0);assert.throws(()=>cpuSnapshot([999],100,()=>{throw Object.assign(new Error(),{code:'EACCES'});}));});
test('durable one-use file, tree metadata and rolling hashes',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'recovery-test-'));try{durable(path.join(dir,'a'),{x:1});assert.throws(()=>durable(path.join(dir,'a'),{}));const manifest=tree(dir,{digests:true}),sweep=createHashSweep(dir,manifest,4);for(let i=0;i<8;i++)sweep.step();sweep.close();fs.chmodSync(path.join(dir,'a'),0o644);fs.writeFileSync(path.join(dir,'a'),'changed');assert.notDeepEqual(tree(dir),manifest.map(({sha256,...rest})=>rest));const bad=createHashSweep(dir,manifest,100);assert.throws(()=>bad.step());bad.close();}finally{fs.rmSync(dir,{recursive:true,force:true});}});
test('missing release authorization fails without importing or launching worker',async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'recovery-gate-'));try{const p=path.join(dir,'release.json');fs.writeFileSync(p,JSON.stringify({authorized:false}));await assert.rejects(preflight(p,path.join(dir,'out')),/explicit parent/);assert.equal(fs.existsSync(path.join(dir,'out')),false);}finally{fs.rmSync(dir,{recursive:true,force:true});}});
for(const [name,change,pattern] of [
 ['worker count',r=>r.workers=9,/workers/],
 ['original deadline',r=>r.deadline='2026-10-03T20:00:00Z',/deadline/],
 ['missing historical bound',r=>delete r.historicalCpuUpperBoundSeconds,/historical/],
 ['shared capacity missing',r=>r.sharedAggregateNineCpuAssumptionAccepted=false,/shared capacity/],
 ['orphan uncertainty undispositioned',r=>r.orphanUncertaintyAccepted=false,/uncertainty/],
 ['outside output',r=>r.output='/tmp/not-permitted-recovery-output',/fresh separate/]
])test('release rejects '+name+' before importing worker',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'recovery-gate-'));
 try{const r=JSON.parse(fs.readFileSync(new URL('./RELEASE-TEMPLATE.json',import.meta.url)));r.authorized=true;r.historicalCapacityUnchangedAssumptionAccepted=true;r.sharedAggregateNineCpuAssumptionAccepted=true;r.orphanUncertaintyAccepted=true;change(r);const p=path.join(dir,'release.json');fs.writeFileSync(p,JSON.stringify(r));await assert.rejects(preflight(p,r.output),pattern);assert.equal(fs.existsSync(p+'.consumed.json'),false);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
