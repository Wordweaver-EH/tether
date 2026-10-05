import test from 'node:test';
import assert from 'node:assert/strict';
import { createHabitProxy, thirdIndex, createShotCohorts } from '../arena/learning-proxy.mjs';
import { createWorld } from '../src/sim.js';
import { percept } from '../src/perception.js';

test('learning proxy is synthetic, percept-only, and switches fixed habit profiles', () => {
  const bot = createHabitProxy({ side: -1, switchAt: 10 });
  const settings = bot.settings();
  assert.equal(settings.humanFitted, false);
  assert.equal(settings.profiles[0].strafeSign, -1);
  assert.equal(settings.profiles[1].strafeSign, 1);
  const a = createHabitProxy({ seed: 91, switchAt: 0.1 });
  const b = createHabitProxy({ seed: 91, switchAt: 0.1 });
  const view = percept(createWorld({ seed: 9 }), 'P1', 'MODE_B');
  for (let i = 0; i < 80; i++) {
    view.time.elapsedSec = i / 120;
    assert.deepEqual(a.act(structuredClone(view), 1/120), b.act(structuredClone(view), 1/120));
  }
});

test('within-bout windows use time boundaries and preserve shot-cohort attribution', () => {
  assert.deepEqual([0, 29.99, 30, 60, 90].map(t => thirdIndex(t, 90)), [0, 0, 1, 2, 2]);
  const shots = createShotCohorts('P1', 90);
  shots.observe([{ type: 'THROW', owner: 'P1' }], 29, 'OUTBOUND');
  shots.observe([{ type: 'HIT', attacker: 'P1' }, { type: 'RESET' }], 31, 'HELD');
  shots.observe([{ type: 'THROW', owner: 'P1' }], 88, 'OUTBOUND');
  const rows = shots.finish();
  assert.equal(rows[0].hits, 1); assert.equal(rows[0].hitRate, 1);
  assert.equal(rows[1].hitsInTimeWindow, 1);
  assert.equal(rows[2].censored, 1); assert.equal(rows[2].hitRate, null);
  assert.deepEqual(shots.finish(), rows);
});

test('neutralized and missed shots resolve without inventing a hit', () => {
  const shots = createShotCohorts('P2', 90);
  shots.observe([{ type: 'THROW', owner: 'P2' }], 1, 'OUTBOUND');
  shots.observe([], 3, 'HELD');
  assert.equal(shots.finish()[0].resolved, 1);
  assert.equal(shots.finish()[0].hitRate, 0);
});

test('simultaneous enemy-then-own hits preserve both seats successful cohorts', () => {
  for (const id of ['P1','P2']) {
    const other=id==='P1'?'P2':'P1',shots=createShotCohorts(id,90);
    shots.observe([{type:'THROW',player:id}],1,'OUTBOUND');
    shots.observe([{type:'HIT',attacker:other},{type:'HIT',attacker:id},{type:'RESET'}],2,'HELD');
    assert.equal(shots.finish()[0].hits,1);
    assert.equal(shots.finish()[0].resolved,1);
  }
});

import { clusterEstimate, adaptationEffects } from '../arena/learning-stats.mjs';
import { parseLearningArgs, learningJobs } from '../arena/learning-audit.mjs';
import { summarizeCognition, runLearningJob } from '../arena/learning-runner.mjs';

test('learning clusters repeated seats and families by independent seed', () => {
  const rows=[{clusterSeed:1,x:0},{clusterSeed:1,x:2},{clusterSeed:2,x:4}];
  const estimate=clusterEstimate(rows,r=>r.x);
  assert.equal(estimate.mean,2.5);assert.equal(estimate.n,2);assert.equal(estimate.observations,3);
});

test('adaptation contrasts preserve pairing, nulls, and correct difference-in-differences', () => {
  const make=(seed,variant)=>({protocol:'adaptation',budget:192,clusterSeed:seed,seat:1,opponent:'direct',mode:'MODE_B',switching:false,
    variant,scoreMargin:0,reversal:{firstReopen:null,reopenDelaySec:null},shots:[
      {hitRate:.1,hitsPerMinute:1,censored:0},{hitRate:null,hitsPerMinute:0,censored:0},
      {hitRate:variant==='full'?.4:.2,hitsPerMinute:variant==='full'?3:2,censored:0}]});
  const rows=[1,2,3].flatMap(seed=>['full','noAdaptation'].map(v=>make(seed,v)));
  const stats=adaptationEffects(rows)[0];
  assert.ok(Math.abs(stats.metrics.hitRate.differenceInDifferences.mean-.2)<1e-12);
  assert.equal(stats.metrics.hitsPerMinute.differenceInDifferences.mean,1);
  assert.throws(()=>adaptationEffects(rows.slice(1)),/unequal|missing/);
  assert.throws(()=>adaptationEffects([...rows,rows[0]]),/duplicate/);
});

test('final learning audit enforces full bout, controlled workers, and disjoint seeds', () => {
  assert.throws(()=>parseLearningArgs(['--label','final','--durationSec','30']),/full 300s/);
  assert.throws(()=>parseLearningArgs(['--workers','3']),/workers/);
  assert.throws(()=>parseLearningArgs(['--resume','maybe']),/resume/);
  const config=parseLearningArgs(['--seeds','1','--adaptationSeeds','1','--episodes','1','--heldout','1','--opponents','direct']);
  const jobs=learningJobs(config);
  assert.equal(jobs.filter(j=>j.protocol==='learning').length,2);
  assert.equal(jobs.filter(j=>j.protocol==='adaptation').length,8);
  assert.throws(()=>learningJobs({...config,adaptationSeedStart:config.seedStart*10000+1}),/overlap/);
});

test('compact cognition includes terminal credit and reports outcome calibration honestly', () => {
  const outcome={key:'HELD:seen:far',predictedFailure:.25,actualFailure:1};
  const totals={terminalOutcome:outcome,bySituation:{[outcome.key]:{decisions:2,outcomes:1,successes:0,failures:1,escalations:1,budgetSpent:20,decisionLatencySec:.3,automaticDecisions:0}}};
  const result=summarizeCognition([],totals,300);
  assert.equal(result.situations[outcome.key].failureBrier,.5625);
  assert.equal(result.situations[outcome.key].type2Share,.5);
  assert.equal(result.situations[outcome.key].modeledLatencySec,.15);
});

test('short learning chain persists memory and isolates held-out seeds (smoke only)', () => {
  const rows=runLearningJob({protocol:'learning',clusterSeed:10,seat:1,budget:48,variant:'full',durationSec:.5,opponent:'direct',mode:'MODE_B',episodes:2,heldout:2});
  assert.equal(rows.length,4);
  assert.equal(rows[0].phase,'training');assert.equal(rows[2].phase,'heldout');
  assert.equal(new Set(rows.map(r=>r.seed)).size,4);
  assert.ok(rows.every(r=>r.totals.budgetLimit===48));
  for(const row of rows)for(const cell of Object.values(row.situations)) {
    assert.equal(cell.measuredCycles,cell.decisions);
    assert.ok(cell.decisionWallMeanMs>=0);
    assert.ok(cell.decisionWallP95Ms>=cell.decisionWallMedianMs);
  }
});
