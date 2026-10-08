import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {appraisalControl,createWorkspace} from '../src/mind/workspace.mjs';
import {createMind} from '../src/mind/index.mjs';
import {materializeCurrentMindWithOriginalWorkspace} from '../tools/compatibility-fixtures.mjs';
const swapped=await materializeCurrentMindWithOriginalWorkspace();
after(()=>swapped.cleanup());
import {createWorld,step} from '../src/sim.js';
import {percept} from '../src/perception.js';
import {runBout} from '../src/headless.mjs';
import {STRATEGIES} from '../src/agents/strategies.mjs';
const c=(salience,x)=>({salience,content:'fixture',wants:{move:{x,y:0}}});

test('neutral appraisal is exactly original control and modulation stays bounded',()=>{
 assert.deepEqual(appraisalControl(),{urgency:0,stability:0,entry:.3,hold:.18,refractorySec:.38,switchMargin:.13});
 for(const arousal of [0,.5,1])for(const valence of [-1,0,1])for(const confidenceMood of [0,.5,1])for(const scoreMargin of [-20,0,20]){
  const x=appraisalControl({arousal,valence,confidenceMood,scoreMargin});
  assert.ok(x.refractorySec>=.114-1e-12&&x.refractorySec<=.456+1e-12);assert.ok(x.switchMargin>=.0455-1e-12&&x.switchMargin<=.156+1e-12);
 }
});
test('appraisal controls reachable winner competition rather than irrelevant entry threshold',()=>{
 const full=createWorkspace(),off=createWorkspace({noAffect:true});
 const first={Hunt:c(.79,1),Threat:c(.2,-1)};
 for(const w of [full,off])assert.equal(w.choose(first,0,{}).focus,'Hunt');
 const next={Hunt:c(.79,1),Threat:c(.93,-1)};
 const mood={arousal:1,valence:-.5,confidenceMood:.8,scoreMargin:-2};
 const a=full.choose(next,.25,mood),b=off.choose(next,.25,mood);
 assert.equal(a.focus,'Threat');assert.equal(b.focus,'Hunt');assert.notDeepEqual(a.outputs.move,b.outputs.move);
 assert.ok(next.Hunt.salience>.3&&next.Threat.salience>.3);
});
test('confidence and favorable outcomes increase persistence; adverse trend and deficit lower it',()=>{
 const neutral=appraisalControl({arousal:.3});
 assert.ok(appraisalControl({arousal:.3,confidenceMood:1}).refractorySec>neutral.refractorySec);
 assert.ok(appraisalControl({arousal:.3,valence:.8}).switchMargin>neutral.switchMargin);
 assert.ok(appraisalControl({arousal:.3,valence:-.8}).switchMargin<neutral.switchMargin);
 assert.ok(appraisalControl({arousal:.3,scoreMargin:-5}).refractorySec<neutral.refractorySec);
});
test('noHysteresis remains independent of affect competition controls',()=>{
 const a=createWorkspace({noHysteresis:true}),b=createWorkspace({noHysteresis:true});
 for(const w of [a,b])w.choose({Hunt:c(.79,1),Threat:c(.2,-1)},0,{});
 const candidates={Hunt:c(.79,1),Threat:c(.93,-1)};
 assert.deepEqual(a.choose(candidates,.05,{arousal:1}).outputs,b.choose(candidates,.05,{}).outputs);
});
test('identical changing percept stream causes real emitted action differences with affect',()=>{
 const a=createMind({seed:991}),b=createMind({seed:991,ablations:{noAffect:true}}),driver=createMind({seed:991,ablations:{noAffect:true}}),bot=STRATEGIES.immediateRecaller(),world=createWorld();let differences=0;
 for(let tick=0;tick<1200;tick++){
  const v=percept(world,'P1','MODE_B');const x=a.act(structuredClone(v),1/120),y=b.act(structuredClone(v),1/120);
  if(JSON.stringify(x)!==JSON.stringify(y))differences++;
  step(world,[driver.act(structuredClone(v),1/120),bot.act(percept(world,'P2','MODE_B'),1/120)]);
 }
 assert.ok(differences>0);
});
test('noAffect current controller preserves action and replay logs when only its workspace is replaced by frozen original v2',()=>{
 for(const mode of ['MODE_A','MODE_B'])for(const seat of [0,1]){
  const run=factory=>{const m=factory({seed:991,ablations:{noAffect:true},captureTrace:false});const bot=STRATEGIES.immediateRecaller();return runBout({agents:seat===0?[m,bot]:[bot,m],mode,durationSec:5,log:true});};
  const a=run(createMind),b=run(swapped.createMind);assert.deepEqual(a.score,b.score);const normalize=lines=>lines.map(line=>{const r=JSON.parse(line);if(r.recordType==='METADATA')delete r.timestamp_start;return r;});assert.deepEqual(normalize(a.logLines),normalize(b.logLines));
 }
});
