import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {restoreWorld,step,hashWorld} from '../../src/sim.js';
import {VALUE_EMBODIMENT as E} from '../../src/agents/cover-checking-value.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
export function auditLog(path){
 const bytes=readFileSync(path),rows=gunzipSync(bytes).toString().trim().split('\n').map(JSON.parse),header=rows[0],summary=rows.at(-1);
 const w=restoreWorld(header.initialWorld),points={hit:[0,0],ring:[0,0]};let hashes=0;
 for(const r of rows.filter(r=>r.record==='step')){assert.deepEqual(step(w,r.inputs),r.events);for(const e of r.events){if(e.type==='HIT')points.hit[e.attacker==='P1'?0:1]++;if(e.type==='CONTROL_POINT')points.ring[e.player==='P1'?0:1]++;}if(r.worldHash){assert.equal(hashWorld(w),r.worldHash);hashes++;}}
 assert.equal(hashWorld(w),summary.finalWorldHash);assert.deepEqual(points,summary.points);
 const decisions=rows.filter(r=>r.record==='decision'),windows=rows.filter(r=>r.record==='training-window');assert.equal(windows.length,header.settings.windows);
 const margin=v=>v.scores[v.viewerId]-v.scores[v.viewerId==='P1'?'P2':'P1'];
 for(const row of windows){const ds=decisions.slice(row.window*E.windowTicks,(row.window+1)*E.windowTicks),start=ds[0],end=decisions[(row.window+1)*E.windowTicks];
  assert.ok(Math.abs(end.time-start.time-3.2)<1e-7);assert.equal(row.startScore,margin(start.sensor));assert.equal(row.taskReward,margin(end.sensor)-margin(start.sensor));assert.equal(row.reward,row.taskReward-E.computePrice*row.extraWork);
  assert.deepEqual(row.features,start.intervention.features);assert.equal(row.action,start.intervention.action);assert.equal(row.embargoTicks,ds.filter(d=>d.embargo).length);assert.equal(row.acquisitions,ds.filter(d=>d.acquired&&!d.passive).length);
  assert.equal(row.extraWork,row.acquisitions+(row.action==='reconsider'?120:0));
  if(header.variant==='training')assert.equal(row.propensity,1/3);
  for(const d of ds){if(d.embargo){assert.equal(d.command.moveX,0);assert.equal(d.command.moveY,0);assert.equal(d.command.throw,false);}if(d.acquired&&d.sensor.opponent){assert.deepEqual(d.belief.position,d.sensor.opponent.position);assert.equal(d.belief.time,d.sensor.time.elapsedSec);}if(row.action!=='check'&&header.variant!=='ordinaryRefresh')assert.equal(d.acquired,d.passive);}
 }
 return {file:path,sha256:sha(bytes),windows:windows.length,worldHashes:hashes,points,passed:true};
}
if(process.argv[1]===new URL(import.meta.url).pathname){const dir=resolve(process.argv[2]),logs=readdirSync(dir).filter(x=>x.endsWith('.jsonl.gz')).sort(),results=logs.map(p=>auditLog(resolve(dir,p)));writeFileSync(resolve(dir,'replay-audit.json'),JSON.stringify({logs:results.length,windows:results.reduce((s,r)=>s+r.windows,0),results},null,2));console.log(JSON.stringify({logs:results.length,windows:results.reduce((s,r)=>s+r.windows,0),passed:true}));}
