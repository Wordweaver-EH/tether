// Run against a separate checkout of published v1; never alters that reference.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createWorld, step } from '../../src/sim.js';
import { percept } from '../../src/perception.js';
import { createMind } from '../../src/mind/index.mjs';
import { createCoverMind } from '../../src/agents/cover-mind.mjs';
const here = new URL('.', import.meta.url), root = resolve(new URL('../..',here).pathname);
const ref = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw Error('Pass the unmodified published v1 checkout root');
const originalMind = (await import(pathToFileURL(resolve(ref,'src/mind/index.mjs')))).createMind;
const originalCover = (await import(pathToFileURL(resolve(ref,'src/agents/cover-mind.mjs')))).createCoverMind;
const sha = b => createHash('sha256').update(b).digest('hex');
const manifest = JSON.parse(readFileSync(new URL('v1-source-manifest.json',here)));
for (const [p,digest] of Object.entries(manifest.files)) assert.equal(sha(readFileSync(resolve(ref,p))),digest,p);
const cases=[];
for (const gameMode of ['DUEL','COVER_CONTROL']) for (const mode of ['MODE_A','MODE_B']) for (const seat of [0,1]) {
  const w=createWorld({gameMode}), id=`P${seat+1}`, seed=79;
  const a=gameMode==='DUEL'?createMind({seed}):createCoverMind({seed});
  const b=gameMode==='DUEL'?originalMind({seed}):originalCover({seed});
  for(let t=0;t<600;t++) {
    const v=percept(w,id,mode), input=a.act(v,1/120);
    assert.deepEqual(input,b.act(v,1/120),`${gameMode} ${mode} ${id} ${t}`);
    const pair=[{moveY:t%160<80?-1:1,aimX:1,throw:t%80===0,recall:t%80===40},
      {moveY:t%160<80?1:-1,aimX:-1,throw:t%90===0,recall:t%90===45}];pair[seat]=input;step(w,pair);
  }
  for(const method of ['trace','memory','cognition','settings'])assert.deepEqual(a[method](),b[method](),method);
  cases.push({gameMode,mode,seat:id,ticks:600,equal:['inputs','trace','memory','cognition','settings']});
}
let defenseCases=0;
for (const seat of [0,1]) for(const budget of [16,192]) for(const ownState of ['HELD','EMBEDDED','RETURNING']) {
  const w=createWorld({gameMode:'COVER_CONTROL'}),i=seat,sign=i?-1:1;
  w.players[i].position={x:-.5*sign,y:-2};w.players[i].facing={x:-sign,y:0};
  w.spears[i].state=ownState;w.spears[i].position={x:-.8*sign,y:-2};
  w.spears[1-i].state='OUTBOUND';w.spears[1-i].position={x:-3.9*sign,y:-2};w.spears[1-i].direction={x:sign,y:0};
  const opts={seed:83,benchmarkInterface:true,deferCommand:true,captureDiagnostics:true,
    cognitionBudget:budget,ablations:{noLearning:true},coverControl:{}};
  const a=createMind(opts),b=originalMind(opts),v=percept(w,`P${i+1}`,'MODE_B');
  const x=a.act(v,1/30),y=b.act(v,1/30);
  for(const key of ['moveX','moveY','aimX','aimY'])assert.equal(x[key],y[key],key);
  assert.equal(a.lastDecision().cognition.tier,0);
  if(ownState==='EMBEDDED'){assert.equal(x.recall,true);assert.equal(y.recall,false);}
  else assert.equal(x.recall,false);
  defenseCases++;
}
const runtimeChanges=[];
for(const p of Object.keys(manifest.files))if(sha(readFileSync(resolve(root,p)))!==manifest.files[p])runtimeChanges.push(p);
assert.deepEqual(runtimeChanges.sort(),['src/agents/cover-integrated.mjs','src/mind/cover-policy.mjs','src/mind/index.mjs']);
const report={node:process.version,reference:manifest.reference,cases,totalParityTicks:4800,
  defenseCases,defensiveMovementAndFinalAimExact:true,runtimeChanges,
  scope:'Exact public-input replay and mirrored fixtures, not performance evidence'};
writeFileSync(new URL('verification/parity.json',here),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
