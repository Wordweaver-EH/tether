import test from 'node:test';import assert from 'node:assert/strict';
import {runPair} from '../tools/affect-audit-worker.mjs';import {summarize,protocol,validateRows} from '../tools/affect-audit.mjs';
test('targeted runner pairs actual action streams and uses real score-state exposure',()=>{
 const row=runPair({id:0,seed:992,mode:'MODE_B',seat:1,opponent:'immediateRecaller',durationSec:2});
 assert.equal(row.comparison.inputTicks,240);assert.equal(row.full.actionHash.length,64);assert.equal(row.noAffect.actionHash.length,64);
 assert.equal(row.comparison.sameActionHash,row.comparison.differingTicks===0);
 assert.ok(row.comparison.differingDecisionTicks<=row.comparison.differingTicks);
 for(const arm of ['full','noAffect'])assert.equal(Object.values(row[arm].strata).reduce((n,s)=>n+s.ticks,0),240);
 const summary=summarize([row]);assert.equal(summary.pairs,1);assert.equal(summary.effects.scoreMargin.mean,row.noAffect.metrics.scoreMargin-row.full.metrics.scoreMargin);
 assert.equal(protocol.seeds*protocol.modes.length*protocol.seats.length*protocol.opponents.length*2,768);
});

test('targeted matrix rejects missing, duplicate and partial bouts',()=>{
 const jobs=[{id:0,durationSec:300},{id:1,durationSec:300}],row=id=>({id,durationSec:300,full:{elapsedSec:300},noAffect:{elapsedSec:300}});
 assert.doesNotThrow(()=>validateRows([row(0),row(1)],jobs));assert.throws(()=>validateRows([row(0)],jobs),/incomplete/);assert.throws(()=>validateRows([row(0),row(0)],jobs),/duplicate/);const bad=row(1);bad.full.elapsedSec=299;assert.throws(()=>validateRows([row(0),bad],jobs),/duration/);
});
