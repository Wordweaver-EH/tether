import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyRaw,replayRecords,parse,verifySources} from './physics-replay.mjs';
const base=resolve(dirname(fileURLToPath(import.meta.url)),'../pilot-attempt-001');
const filename=readdirSync(`${base}/results`).filter(f=>f.endsWith('.json')).sort()[0];
const result=parse(readFileSync(`${base}/results/${filename}`,'utf8'));
const bytes=readFileSync(`${base}/raw/${filename.slice(0,-5)}.jsonl.gz`);
const {records}=verifyRaw(bytes,result.raw);
test('frozen sources and pure sensor projection match original',()=>assert.equal(verifySources().length,6));
test('physical digest corruption is rejected before replay',()=>{const bad=Buffer.from(bytes);bad[20]^=1;assert.throws(()=>verifyRaw(bad,result.raw),/physical SHA256/);});
test('logical digest corruption is rejected before replay',()=>assert.throws(()=>verifyRaw(bytes,{...result.raw,sha256:'0'.repeat(64)}),/logical SHA256/));
test('chain tail corruption is rejected before replay',()=>assert.throws(()=>verifyRaw(bytes,{...result.raw,chainTail:'0'.repeat(64)}),/chain tail/));
for(const [label,modify,error] of [
 ['receipt truth',r=>r.find(v=>v.type==='decision').truth.players[0].position.x+=1,/receipt truth/],
 ['delayed packet hash',r=>r.find(v=>v.type==='decision').sensorTruth.perceptHashes[1]='bad',/delayed truth/],
 ['delayed truth',r=>r.find(v=>v.type==='decision').sensorTruth.players[1].position.y+=1,/delayed truth/],
 ['event time',r=>r.find(v=>v.type==='event').time+=1,/physics event/],
 ['missing event',r=>r.splice(r.findIndex(v=>v.type==='event'),1),/physics event/],
 ['decision tick',r=>r.find(v=>v.type==='decision').tick+=1,/decision 0 tick/],
])test(`${label} corruption is rejected`,()=>{const bad=structuredClone(records);modify(bad);assert.throws(()=>replayRecords(bad,result),error);});
test('terminal hash corruption is rejected',()=>assert.throws(()=>replayRecords(records,{...result,finalHash:'bad'}),/result finalHash/));
test('complete replay checkpoints and terminal state',()=>{const cp=[];const receipt=replayRecords(records,result,{onCheckpoint:c=>cp.push(c)});assert.equal(receipt.status,'PASS');assert.deepEqual(cp.map(c=>c.tick),Array.from({length:31},(_,i)=>i*120));assert.equal(cp.at(-1).worldHash,result.finalHash);assert.equal(receipt.controllerCalls,0);});
