import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createWorld,observe,move,walkable,arena,STEP_SEC,MAP} from '../maze/world.mjs';
import {createMazeController} from '../maze/controller.mjs';
import {runEpisode} from '../maze/run.mjs';
const clone=structuredClone;
const pilot=()=>runEpisode({seed:991});

test('all 44 inherited frozen source files are byte-identical',()=>{
  const manifest=JSON.parse(fs.readFileSync(new URL('../benchmark/cover-uncertainty-v1/source-manifest.json',import.meta.url)));
  assert.equal(Object.keys(manifest.files).length,44);
  for(const[p,h]of Object.entries(manifest.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+p,import.meta.url))).digest('hex'),h,p);
});
test('sensor respects gaze, range and walls; hidden coordinates and policy cannot leak',()=>{
  const{world}=createWorld();world.ghost={x:4,y:1};assert.ok(observe(world).opponent);
  world.gaze='W';assert.equal(observe(world).opponent,null);
  world.ghost={x:9,y:1};world.gaze='E';assert.equal(observe(world).opponent,null);
  world.player={x:3,y:1};world.ghost={x:3,y:3};world.gaze='S';assert.equal(observe(world).opponent,null);
  world.player={x:1,y:1};world.ghost={x:2,y:1};world.gaze='W';assert.ok(observe(world).opponent);
  world.ghost={x:1,y:3};world.gaze='S';assert.ok(observe(world).opponent);
  world.ghost={x:3,y:3};assert.equal(observe(world).opponent,null);
  const a=observe(world);world.condition='switch';world.seed=77;world.switchTick=0;world.ghost={x:7,y:5};world.ghostVelocity={x:99,y:99};assert.deepEqual(observe(world),a);
  assert.deepEqual(Object.keys(a).sort(),['arena','gaze','map','opponent','own','pellets','tick','time']);
});
test('cardinal movement stops at walls and rejects unknown actions',()=>{
  assert.deepEqual(move(MAP,{x:1,y:1},'N'),{x:1,y:1});assert.deepEqual(move(MAP,{x:1,y:1},'E'),{x:2,y:1});assert.throws(()=>move(MAP,{x:1,y:1},'teleport'));
});
test('collision and edge swap are terminal, and death does not collect pellet',()=>{
  const sim=createWorld({condition:'switch',switchTick:0});sim.world.player={x:5,y:1};sim.world.ghost={x:4,y:1};sim.step({move:'W',gaze:'E'});assert.equal(sim.world.dead,true);assert.equal(sim.world.collected,0);assert.throws(()=>sim.step({move:'WAIT',gaze:'E'}));
});
test('pilot action replay exactly reproduces every public percept and outcome',()=>{
  const r=pilot(),sim=createWorld({seed:991});for(const row of r.rows){assert.deepEqual(observe(sim.world),row.percept);assert.deepEqual(sim.step(row.action),row.outcome);assert.ok(walkable(MAP,sim.world.player));assert.ok(walkable(MAP,sim.world.ghost));}assert.equal(sim.world.collected,r.collected);assert.equal(r.collected+r.remaining,44);
  assert.deepEqual(pilot(),r);
});
test('all pilot variants use bounded common domain planner and causal intervention gates',()=>{
  for(const variant of ['full','contentCut','memoryOff','monitorOff','fixed','conventional']){
    const r=runEpisode({seed:991,variant});for(const row of r.rows){const d=row.diagnostic;assert.ok(d.budget.spent<=64);assert.equal(d.budget.byKind.control,8);assert.equal(d.budget.byKind.coordination,16);assert.ok((d.calculation?.branches.length??0)<=25);if(variant==='conventional')assert.equal(d.coordination.reason,'conventional-bypass');}
  }
});
test('content delivery cut changes actual gaze on identical pilot percepts',()=>{
  const r=pilot(),cut=createMazeController({variant:'contentCut'});const rows=r.rows.map(x=>({full:x,cut:cut.step(x.percept)}));
  assert.ok(rows.some(x=>x.full.action.gaze!==x.cut.action.gaze));
  for(const x of rows){assert.deepEqual(x.full.diagnostic.coordination.packet,x.cut.diagnostic.coordination.packet);assert.equal(x.cut.diagnostic.coordination.deliveries?.planner??null,null);}
});
test('C2 control cut changes actual movement on identical pilot percepts with same feedback',()=>{
  const r=pilot(),cut=createMazeController({variant:'monitorOff'});let moveChanges=0,invalidations=0;
  for(const row of r.rows){const alt=cut.step(row.percept);assert.deepEqual(row.diagnostic.coordination.monitor,alt.diagnostic.coordination.monitor);if(row.action.move!==alt.action.move)moveChanges++;if(row.diagnostic.invalidated)invalidations++;assert.equal(alt.diagnostic.request,false);}
  assert.ok(moveChanges>0);assert.ok(invalidations>0);
});
// Scripted legal ghost turns. This is a causal route fixture, not efficacy data.
function memoryFixture(variant){
  const map=['#########',...Array(5).fill('#.......#'),'#########'];
  const c=createMazeController({variant}),world={map,player:{x:4,y:3},ghost:{x:5,y:3},ghostVelocity:{x:-2,y:0},tick:0,gaze:'E',pellets:new Set(['4,4','4,5','3,5','5,5'])},out=[];
  const ghosts=[{p:{x:5,y:3},v:{x:-2,y:0}},{p:{x:5,y:2},v:{x:0,y:-2}},{p:{x:6,y:2},v:{x:2,y:0}}];
  // First two moves are S in all arms: each actually sees the same stream.
  for(let t=0;t<3;t++){world.tick=t;world.ghost=ghosts[t].p;world.ghostVelocity=ghosts[t].v;const view=observe(world),r=c.step(view);out.push({view,...r});world.player=move(map,world.player,r.action.move);world.pellets.delete(`${world.player.x},${world.player.y}`);world.gaze=t===0?'E':'N';} // Replay the intact arm's gaze in all arms.
  return out;
}
test('episodic read cut changes gaze and then movement with matched evidence and work',()=>{
  const full=memoryFixture('full'),cut=memoryFixture('memoryOff');
  for(let i=0;i<3;i++){assert.deepEqual(full[i].view,cut[i].view);assert.deepEqual(full[i].diagnostic.budget,cut[i].diagnostic.budget);assert.equal(full[i].diagnostic.request,false);}
  assert.equal(full[0].action.move,'S');assert.equal(full[1].action.move,'S');assert.notEqual(full[1].action.gaze,cut[1].action.gaze);assert.notEqual(full[2].action.move,cut[2].action.move);
  assert.equal(full[2].diagnostic.coordination.recalled.source,'episodic');assert.equal(cut[2].diagnostic.coordination.recalled,null);
});
test('selected content intervention changes action without inventing fresh evidence',()=>{
  const{world}=createWorld();world.player={x:3,y:1};world.ghost={x:5,y:1};world.ghostVelocity={x:0,y:0};const view=observe(world);
  const full=createMazeController().step(view),changed=createMazeController({researchControls:{contentOverride:{mean:{x:1,y:1}}}}).step(view);
  assert.notDeepEqual(full.action,changed.action);assert.equal(full.diagnostic.coordination.packet.evidenceId,changed.diagnostic.coordination.packet.evidenceId);assert.equal(full.diagnostic.coordination.packet.validUntil,changed.diagnostic.coordination.packet.validUntil);assert.equal(changed.diagnostic.coordination.contentIntervened,true);
});
test('unchanged content TTL expires after one second without refreshed evidence',()=>{
  const c=createMazeController(),{world}=createWorld();c.step(observe(world));world.tick=3;world.ghost={x:7,y:5};const r=c.step(observe(world));assert.equal(r.diagnostic.coordination.recalled,null);assert.equal(r.diagnostic.coordination.packet,null);assert.equal(STEP_SEC,.5);
});
test('workspace channel routing changes movement under identical evidence, content and planning work',()=>{
  const map=['##########',...Array(7).fill('#........#'),'##########'];
  const world={map,player:{x:4,y:4},ghost:{x:7,y:4},ghostVelocity:{x:2,y:0},tick:0,gaze:'E',pellets:new Set(['4,3','4,2','5,3','6,3'])};
  const controls={monitorControl:false,fixedMonitorSchedule:{every:1,phase:0}},full=createMazeController({researchControls:controls}),cut=createMazeController({researchControls:controls,noWorkspace:true});
  const a=full.step(observe(world)),b=cut.step(observe(world));assert.deepEqual(a.action,b.action);assert.equal(a.action.move,'N');
  world.player=move(map,world.player,a.action.move);world.pellets.delete('4,3');world.gaze=a.action.gaze;world.ghost={x:8,y:4};world.tick=1;
  const c=full.step(observe(world)),d=cut.step(observe(world));assert.equal(c.diagnostic.focus,'Threat');assert.equal(d.diagnostic.focus,'Threat');assert.deepEqual(c.diagnostic.coordination.packet,d.diagnostic.coordination.packet);assert.deepEqual(c.diagnostic.budget,d.diagnostic.budget);assert.equal(c.action.move,'N');assert.equal(d.action.move,'E');assert.equal(c.diagnostic.workspace.outputs.move,'Threat');assert.equal(d.diagnostic.workspace.outputs.move,'Forage');
});
