// No real-controller act/finish calls or behavioral outcomes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMind} from './source/src/mind/index.mjs';
import * as sim from './source/src/sim.js';
import {percept} from './source/src/perception.js';
import {FIXTURES,replayFixture,assertLegalGeometry,neutral,geometrySummary} from './fixtures.mjs';
import {checkedSettings,decisionSummary,summarizeConsequences,json} from './core.mjs';
const protocol=JSON.parse(readFileSync(new URL('./protocol.json',import.meta.url)));
const memory=JSON.parse(readFileSync(new URL('./common-memory.json',import.meta.url)));
test('exactly eight existing fixtures and two fixed development seeds',()=>{assert.equal(FIXTURES.length,8);assert.equal(new Set(FIXTURES.map(f=>f.id)).size,8);assert.deepEqual(protocol.seeds,[9220001,9220002]);assert.equal(protocol.cases,16);});
test('current source accepts preserved ordinary snapshot without acting',()=>{const mind=createMind({...protocol.mindOptions,memorySnapshot:structuredClone(memory)});checkedSettings(mind,protocol);assert.equal(mind.cognition().cycles,0);assert.equal(mind.lastDecision(),null);assert.deepEqual(mind.memory().learning,memory.learning);assert.deepEqual(mind.memory().novelty,memory.novelty);});
test('unchanged legal scripts and passive prefill satisfy geometry',()=>{for(const f of FIXTURES){const {world}=replayFixture(sim,f,assertLegalGeometry);for(let i=0;i<20;i++){sim.step(world,[neutral(),structuredClone(f.prefillOpponent)]);assertLegalGeometry(world);}const g=geometrySummary(world,percept(world,'P1','MODE_B'));assert.equal(g.opponentVisible,true,f.id);assert.equal(g.spear.state,f.state,f.id);}});
test('summary requires completed-cycle identity and real trial evidence',()=>{const input=neutral();const d={serial:1,time:0,input,cognition:{habit:{automatic:true},novelty:{valid:true,novel:true,familiar:false},proposedInput:{...input,throw:true},branches:[{trials:0,steps:0}],budget:{},tier:2}};const s=decisionSummary(d,input);assert.equal(s.automaticEligible,true);assert.equal(s.realDeliberation,false);assert.equal(s.withheldProposedCommand,true);d.cognition.branches[0].trials=1;assert.equal(decisionSummary(d,input).realDeliberation,true);assert.throws(()=>decisionSummary({...d,serial:0},input));});
test('non-emission is not a physical miss',()=>{const w={spears:[{state:'HELD'}],players:[{position:{x:0,y:0},score:0}]};const r=summarizeConsequences({input:neutral(),events:[],initialWorld:w,finalWorld:w});assert.equal(r.resolution,'non-emission');assert.equal(r.physicalAttempt,false);});

test('raw serialization retains nonfinite diagnostics',()=>{assert.deepEqual(JSON.parse(json({a:Infinity,b:-Infinity,c:NaN})),{a:{$number:'Infinity'},b:{$number:'-Infinity'},c:{$number:'NaN'}});});
