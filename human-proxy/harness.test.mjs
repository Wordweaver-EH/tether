import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {ROOT,currentFreeze,checkRelease} from './protocol.mjs';
import {runStudy} from './run.mjs';
test('CLI default cannot run gameplay',()=>{
 const result=spawnSync(process.execPath,[path.join(ROOT,'human-proxy/run.mjs')],{encoding:'utf8'});
 assert.equal(result.status,2);assert.match(result.stderr,/No matches by default/);
});
test('missing or wrong release refuses before output creation; source freeze is explicitly blocked',()=>{
 const outputDir=path.join(ROOT,'human-proxy-must-not-be-created');assert.equal(existsSync(outputDir),false);
 assert.throws(()=>runStudy({release:null,outputDir}));assert.equal(existsSync(outputDir),false);
 assert.throws(()=>checkRelease({rootRelease:true,independentReviewAccepted:true,reviewer:'test',gitCheckpoint:'0'.repeat(40),freezeSha256:'incorrect'}));
 assert.equal(currentFreeze().status,'blocked-pending-independent-review-git-checkpoint-and-root-release');
});

test('pooled geometry uses role identity and time exposure, preserving separate proximity and exact hit counts',async()=>{
 const {createWorld,step}=await import('../src/sim.js');const {createMeasurements}=await import('./measurements.mjs');const {poolGeometry}=await import('./run.mjs');
 const world=createWorld(),m=createMeasurements({episodeId:1,boutId:'scripted-neutral',counterPlayer:'P1'});
 for(let i=0;i<8;i++){const pre=m.beforeStep(world);const events=step(world,[{},{}]);m.afterStep(pre,events,world);}
 const measured=m.finish(world),bout={counterSeat:'P1',ordinarySeat:'P2',measurements:measured.summary};
 const pooled=poolGeometry([bout],'counter',measured.raw.throws);
 assert.equal(pooled.throws,0);assert.equal(pooled.cornering.representedSec,8/120);assert.equal(pooled.cornering.pressuredCorneredTimeFraction,0);assert.equal(pooled.cornering.hitsDeliveredWhilePressuredCornered,0);assert.equal(pooled.cornering.approximate,true);
 assert.deepEqual(poolGeometry([bout],'ordinary',[]),pooled);
});
