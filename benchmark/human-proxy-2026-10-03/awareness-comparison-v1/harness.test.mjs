import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,existsSync,readFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {hash,ROOT,currentFreeze,checkRelease,verifyIntegrity} from './protocol.mjs';
import {runStudy,verifyRaw,validateOutputBinding,summarizeProcess,DISK_RESERVE_BYTES} from './run.mjs';
test('main is gated and CLI has no default gameplay',async()=>{
 const result=spawnSync(process.execPath,[path.join(ROOT,'run.mjs')],{encoding:'utf8'});assert.equal(result.status,2);assert.match(result.stderr,/No matches by default/);
 const dir=path.join(os.tmpdir(),`awareness-refused-${process.pid}`);assert.equal(existsSync(dir),false);await assert.rejects(runStudy({release:null,outputDir:dir}));assert.equal(existsSync(dir),false);
 assert.equal(currentFreeze().status,'blocked-pending-independent-review-git-checkpoint-and-root-release');assert.throws(()=>checkRelease({rootRelease:true,independentReviewAccepted:true,reviewer:'x',gitCheckpoint:'a'.repeat(40),freezeSha256:'wrong'}));
});
test('release is bound to exactly one absolute output and positive disk reserve',()=>{
 assert.doesNotThrow(()=>validateOutputBinding({outputDir:'/tmp/awareness-bound'},'/tmp/awareness-bound'));
 for(const release of [null,{}, {outputDir:'relative'},{outputDir:'/tmp/other'}])assert.throws(()=>validateOutputBinding(release,'/tmp/awareness-bound'));
 assert.equal(DISK_RESERVE_BYTES,512*1024*1024);
});
test('lossless completed-gzip identity rejects corruption and incomplete records',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'awareness-gzip-')),file=path.join(dir,'synthetic.jsonl.gz');
 const raw=Buffer.from('{"type":"header"}\n{"type":"end","synthetic":true}\n'),bytes=gzipSync(raw);writeFileSync(file,bytes);
 const identity={compressedSha256:hash(bytes),compressedBytes:bytes.length,uncompressedSha256:hash(raw),uncompressedBytes:raw.length};assert.doesNotThrow(()=>verifyRaw(file,identity,{roundtrip:true}));
 assert.throws(()=>verifyRaw(file,{...identity,uncompressedSha256:'0'.repeat(64)},{roundtrip:true}));
 assert.throws(()=>verifyRaw(file,{...identity,compressedSha256:'0'.repeat(64)}));
 const partial=Buffer.from('{"type":"header"}\n'),compressed=gzipSync(partial);writeFileSync(file,compressed);assert.throws(()=>verifyRaw(file,{compressedSha256:hash(compressed),compressedBytes:compressed.length,uncompressedSha256:hash(partial),uncompressedBytes:partial.length},{roundtrip:true}));
});
test('synthetic event accounting uses RECALL_START.owner and HIT phase rather than inferred state',()=>{
 const result=summarizeProcess({records:[],ordinaryRecords:[],receiptTruth:[],postScanSamples:[],events:[{type:'RECALL_START',owner:'P1'},{type:'RECALL_START',owner:'P2'}],measured:{raw:{hits:[{attacker:'P1',phase:'OUTBOUND'},{attacker:'P2',phase:'RETURNING'}]}},counterSeat:'P1',arm:'unchanged',elapsedSec:.1});
 assert.equal(result.metrics.actualRecalls,1);assert.equal(result.metrics.delivered,1);assert.equal(result.metrics.returningReceived,1);assert.equal(result.metrics.outboundReceived,0);
});
test('all prior raw and frozen source identities still verify',()=>{
 const result=verifyIntegrity();assert.equal(result.originalRawChecked,true);assert.ok(result.originalFrozenFiles>=20);
});

test('source-time canonicalization roundoff uses existing strict timing tolerance',()=>{
 const sensorTime=.7666666666666666,canonical=92/120;assert.notEqual(sensorTime,canonical);assert.ok(Math.abs(sensorTime-canonical)<1e-10);
 const code=readFileSync(new URL('./run.mjs',import.meta.url),'utf8');assert.match(code,/Math\.abs\(a\.sensorTime-r\.sensorTime\)>1e-10/);
});
test('attempt numbering preserves started-only crash and all pending artifacts',async()=>{
 const {nextAttempt}=await import('./run.mjs');const dir=mkdtempSync(path.join(os.tmpdir(),'awareness-attempt-'));assert.equal(nextAttempt(dir,'row'),1);
 writeFileSync(path.join(dir,'row.attempt-1.started.json'),'{}');assert.equal(nextAttempt(dir,'row'),2);
 writeFileSync(path.join(dir,'row.attempt-3.started.json.pending-123'),'{}');assert.equal(nextAttempt(dir,'row'),4);
 writeFileSync(path.join(dir,'other.attempt-99.jsonl.gz'),'');assert.equal(nextAttempt(dir,'row'),4);
});
test('atomic durable JSON refuses overwrite; interrupted finalization is idempotent',async()=>{
 const {writeDurable,writeFinal}=await import('./run.mjs');const dir=mkdtempSync(path.join(os.tmpdir(),'awareness-final-')),report=path.join(dir,'REPORT.json'),manifest=path.join(dir,'RAW-MANIFEST.json');
 writeDurable(report,{result:'synthetic',completedAt:'first'});assert.throws(()=>writeDurable(report,{result:'changed'}));assert.equal(JSON.parse(readFileSync(report)).result,'synthetic');
 const retained=writeFinal(report,{result:'synthetic',completedAt:'later'},{ignoreKeys:['completedAt']});assert.equal(retained.completedAt,'first');
 writeFinal(manifest,[{file:'test',sha:'synthetic'}]);assert.doesNotThrow(()=>writeFinal(manifest,[{file:'test',sha:'synthetic'}]));assert.throws(()=>writeFinal(manifest,[{file:'changed'}]));
});

test('root-approved startup-only recovery handles empty/claimed directories and preserves pending evidence',async()=>{
 const {recoverStartupIdentity,writeDurable}=await import('./run.mjs');
 for(const claimed of [false,true]){
  const dir=mkdtempSync(path.join(os.tmpdir(),'awareness-startup-'));const release={rootRelease:true,independentReviewAccepted:true,freezeSha256:'test-freeze',gitCheckpoint:'a'.repeat(40),outputDir:dir,resumeApproved:true,resumeId:'synthetic-recovery'};
  if(claimed)writeDurable(path.join(dir,'MAIN-CLAIM.json'),{release:{...release,resumeApproved:undefined,resumeId:undefined}});
  writeFileSync(path.join(dir,'RUN-IDENTITY.json.pending-prior'),'retained interrupted bytes');
  const identity=recoverStartupIdentity({outputDir:dir,release,frozen:{freezeSha256:'test-freeze'},manifest:[],integrity:{synthetic:true},smoke:{projectedStorageWithSafetyBytes:0}});
  assert.equal(identity.freeze.freezeSha256,'test-freeze');assert.equal(existsSync(path.join(dir,'RUN-IDENTITY.json')),true);assert.equal(readFileSync(path.join(dir,'RUN-IDENTITY.json.pending-prior'),'utf8'),'retained interrupted bytes');
 }
});
test('startup recovery refuses changed main claim or any prior gameplay artifact',async()=>{
 const {recoverStartupIdentity,writeDurable}=await import('./run.mjs');
 for(const kind of ['changed-claim','started-gameplay','unapproved']){
  const dir=mkdtempSync(path.join(os.tmpdir(),'awareness-startup-refuse-')),release={rootRelease:true,independentReviewAccepted:true,freezeSha256:'test-freeze',gitCheckpoint:'a'.repeat(40),outputDir:dir,resumeApproved:kind!=='unapproved',resumeId:'synthetic'};
  if(kind==='changed-claim')writeDurable(path.join(dir,'MAIN-CLAIM.json'),{release:{...release,freezeSha256:'wrong'}});
  if(kind==='started-gameplay')writeFileSync(path.join(dir,'cluster-00-P1-unchanged.attempt-1.started.json'),'{}');
  assert.throws(()=>recoverStartupIdentity({outputDir:dir,release,frozen:{freezeSha256:'test-freeze'},manifest:[],integrity:{},smoke:{projectedStorageWithSafetyBytes:0}}));assert.equal(existsSync(path.join(dir,'RUN-IDENTITY.json')),false);
 }
});
