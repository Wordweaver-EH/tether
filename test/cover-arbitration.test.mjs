import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step } from '../src/sim.js';
import { percept } from '../src/perception.js';
import { createMind } from '../src/mind/index.mjs';
import { createCoverPolicy } from '../src/mind/cover-policy.mjs';
import { createIntegratedCoverMind } from '../src/agents/cover-integrated.mjs';
import { coverMotorTransform } from '../src/agents/cover-interface.mjs';
import { reflex } from '../src/mind/cognition.mjs';
import { createBudget } from '../src/mind/cognition.mjs';
import { planGaze } from '../src/mind/components.mjs';
import { rng } from '../src/mind/math.mjs';
const world = () => createWorld({ gameMode: 'COVER_CONTROL' });
const bare = (budget = 192) => createMind({ seed: 83, benchmarkInterface: true,
  deferCommand: true, captureTrace: true, captureDiagnostics: true, cognitionBudget: budget,
  ablations: { noLearning: true }, coverControl: {} });
function place(w, i, x, y, fx = i ? -1 : 1, fy = 0) {
  w.players[i].position = { x, y }; w.players[i].facing = { x: fx, y: fy };
  w.spears[i].position = { x, y }; w.spears[i].direction = { x: fx, y: fy };
}
function shotFixture(offset = 0) {
  const w = world(); place(w, 0, -.5, -2); place(w, 1, 1.5, -2);
  const a = bare(); a.act(percept(w, 'P1', 'MODE_A'), 1/30);
  w.elapsedSec = 1/30;
  w.spears[1].state = 'OUTBOUND'; w.spears[1].position = { x: .4, y: -2 + offset };
  w.spears[1].direction = { x: -1, y: 0 };
  return { w, a };
}

test('mirrored defense preserves dodge and gaze while an embedded own spear really starts returning', () => {
  for (const id of ['P1', 'P2']) for (const budget of [16, 192]) {
    const i = id === 'P1' ? 0 : 1, sign = i ? -1 : 1;
    const w = world(); place(w, i, -.5 * sign, -2, -sign);
    w.spears[i].state = 'EMBEDDED'; w.spears[i].position = { x: -.8 * sign, y: -2 };
    w.spears[1-i].state = 'OUTBOUND'; w.spears[1-i].position = { x: -3.9 * sign, y: -2 };
    w.spears[1-i].direction = { x: sign, y: 0 };
    const v = percept(w, id, 'MODE_B'), a = bare(budget), expected = reflex(v);
    assert.ok(expected); const input = a.act(v, 1/30), d = a.lastDecision();
    assert.deepEqual({ x: input.moveX, y: input.moveY }, expected);
    assert.deepEqual(d.cognition.cover.arbitration.gazeProposal, v.opponentSpear.position);
    assert.equal(input.recall, true); assert.equal(input.throw, false);
    assert.equal(d.cognition.tier, 0); assert.equal(d.cognition.issuedLearningTier, 0);
    assert.equal(d.cognition.selectedBranch, null);
    assert.equal(d.cognition.cover.planning.selectedRolloutCommandIssued, false);
    assert.equal(d.cognition.cover.planning.requested, false);
    assert.match(d.cognition.cover.planning.execution, /unplanned/);
    assert.deepEqual(d.cognition.cover.arbitration.issued, { throw: false, recall: true });
    const pair = [{}, {}]; pair[i] = input;
    assert.ok(step(w, pair).some(e => e.type === 'RECALL_START' && e.owner === id));
    assert.equal(w.spears[i].state, 'RETURNING');
  }
});

test('a baited incoming line permits real recovery through unchanged delay/noise, then objective resumes', () => {
  for (const id of ['P1', 'P2']) {
    const i = id === 'P1' ? 0 : 1, sign = i ? -1 : 1, w = world();
    place(w, i, -.5 * sign, -2, -sign);
    w.spears[i].state = 'EMBEDDED'; w.spears[i].position = { x: -.8 * sign, y: -2 };
    w.spears[1-i].state = 'OUTBOUND'; w.spears[1-i].position = { x: -3.9 * sign, y: -2 };
    w.spears[1-i].direction = { x: sign, y: 0 };
    const a = createIntegratedCoverMind({ seed: 83, captureDiagnostics: true });
    const events = [], commands = [];
    for (let tick = 0; tick < 120; tick++) {
      const pair = [{}, {}]; pair[i] = a.act(percept(w, id, 'MODE_B')); commands.push(pair[i]);
      events.push(...step(w, pair));
      if (tick === 18) {
        assert.equal(pair[i].recall, true);
        const d = a.lastDecision(); assert.equal(d.cognition.tier, 0);
        assert.equal(d.time, 0); assert.equal(d.commandTime, .15);
        assert.deepEqual(d.actualCommand, pair[i]);
        assert.deepEqual(d.cognition.cover.requestedInput, d.input);
        assert.notDeepEqual({ x: pair[i].aimX, y: pair[i].aimY }, { x: d.input.aimX, y: d.input.aimY });
        w.spears[1-i].state = 'HELD'; w.spears[1-i].position = { ...w.players[1-i].position };
      }
    }
    assert.equal(commands.slice(0,18).some(c => c.recall || c.throw), false);
    assert.equal(commands.filter(c => c.recall).length, 1);
    assert.equal(events.filter(e => e.type === 'RECALL_START' && e.owner === id).length, 1);
    assert.equal(w.spears[i].state, 'HELD');
    assert.ok(a.trace().some(d => d.time > .2 && d.focus === 'Objective' && Math.hypot(d.input.moveX,d.input.moveY) > 0));
    assert.ok(Math.abs(w.players[i].position.y) < 1.5, 'objective movement returns toward the ring');
    assert.equal(a.cognition().learningUpdates, 0); assert.equal(a.cognition().automaticDecisions, 0);
  }
});

test('reflex can retain an already eligible aligned visible shot without changing dodge or gaze', () => {
  const { w, a } = shotFixture(), v = percept(w, 'P1', 'MODE_A');
  const input = a.act(v, 1/30), d = a.lastDecision();
  assert.equal(d.cognition.cover.arbitration.intended.throw, true);
  assert.equal(input.throw, true); assert.equal(input.recall, false);
  assert.deepEqual({ x: input.moveX, y: input.moveY }, reflex(v));
  assert.equal(input.aimX, 1); assert.equal(input.aimY, 0);
  assert.equal(d.cognition.tier, 0); assert.equal(d.cognition.selectedBranch, null);
  assert.equal(d.cognition.cover.arbitration.guard.shotAllowed, true);
});

test('an eligible shot cannot follow incompatible final defensive gaze', () => {
  const { w, a } = shotFixture(.4), v = percept(w, 'P1', 'MODE_A');
  const input = a.act(v, 1/30), d = a.lastDecision();
  assert.equal(d.cognition.cover.arbitration.intended.throw, true);
  assert.equal(input.throw, false);
  assert.match(d.cognition.cover.arbitration.guard.reason, /final pre-noise aim incompatible/);
  assert.ok(input.aimY > .3);
  assert.deepEqual({ x: input.moveX, y: input.moveY }, reflex(v));
});

test('real attention redirection passes through planGaze before the defensive compatibility guard', () => {
  const w = world(); place(w, 0, -.5, -2); place(w, 1, 1.5, -2);
  const v = percept(w, 'P1', 'MODE_A'), target = v.opponent.position;
  const policy = createCoverPolicy(), model = { latencySec:.15, previousGazeAngle:0,
    baseAimNoise:.034,speedAimNoise:.0075,scanTarget:target,searchTarget:target };
  const belief = { mean:target,confidence:1,stalenessSec:0,spear:{state:'EMBEDDED'} };
  policy.prepare(v,belief,model,{ Hunt:{wants:{gaze:target,throw:true}},
    Search:{wants:{}},Threat:{salience:1,wants:{gaze:target}} },createBudget(192));
  const chosen = { focus:'Threat',outputs:{gaze:target} }; policy.arbitrate(chosen,null);
  assert.equal(chosen.outputs.throw,true);
  const redirected = { x:1.5,y:0 };
  const aim = planGaze(v,chosen.outputs.gaze,[{item:'opponent',due:true,priority:1,stalenessSec:1,target:redirected}],
    0,model,rng(9),{},true);
  assert.ok(aim.y > .7);
  const input = {throw:true,recall:false,aimX:aim.x,aimY:aim.y}; policy.safeShot(v,input);
  assert.equal(input.throw,false);
  assert.match(policy.state().arbitration.guard.reason,/final pre-noise aim incompatible/);
  assert.deepEqual(policy.state().arbitration.guard.aim,aim);
  assert.equal(policy.branchMatches(v,{...input,throw:true},{tactic:'direct',target}),false);
});

test('fresh visibility and facing guard reject a stale cached target during reflex', () => {
  const { w, a } = shotFixture(); place(w, 1, 1.5, -.5);
  w.spears[1].state = 'OUTBOUND'; w.spears[1].position = { x: .4, y: -2 };
  w.spears[1].direction = { x: -1, y: 0 };
  const input = a.act(percept(w, 'P1', 'MODE_A'), 1/30), d = a.lastDecision();
  assert.equal(d.cognition.cover.arbitration.intended.throw, true);
  assert.equal(input.throw, false); assert.match(d.cognition.cover.arbitration.guard.reason, /facing incompatible/);
});

test('hidden target, occluded shot, and non-held own spear cannot create defensive throws', () => {
  for (const kind of ['hidden', 'occluded', 'embedded', 'returning']) {
    const { w, a } = shotFixture(); let v;
    if (kind === 'hidden') { v = percept(w, 'P1', 'MODE_A'); v.opponent = null; }
    else if (kind === 'occluded') { v = percept(w, 'P1', 'MODE_A'); v.arena.obstacles.push({ id:'test-wall',minX:.8,maxX:1,minY:-3,maxY:-1 }); }
    else { w.spears[0].state = kind.toUpperCase(); w.spears[0].position = { x: 0, y: -2 }; v = percept(w, 'P1', 'MODE_A'); }
    const input = a.act(v, 1/30);
    assert.equal(input.throw, false, kind); assert.equal(input.throw && input.recall, false);
    if (kind === 'returning') assert.equal(input.recall, false);
  }
});

test('completed rollout without an executed weapon never earns completed-command credit', () => {
  const w = world(); place(w, 0, -.5, -2, -1); place(w, 1, 1.5, -2);
  const a = bare(), input = a.act(percept(w,'P1','MODE_A'),1/30), d = a.lastDecision();
  assert.ok(d.cognition.selectedBranch); assert.equal(d.cognition.cover.planning.status, 'completed');
  assert.equal(input.throw || input.recall, false);
  assert.equal(d.cognition.cover.planning.weaponIssued, false);
  assert.equal(d.cognition.cover.planning.selectedRolloutCommandIssued, false);
  assert.equal(d.cognition.cover.planning.execution, 'no weapon command issued');
  assert.equal(d.cognition.issuedLearningTier, 1);
  const policy = createCoverPolicy(), v = percept(w,'P1','MODE_A');
  const branch = { tactic:'left',target:{ x:1.5,y:-1.2 } };
  assert.equal(policy.branchMatches(v,{throw:true,aimX:1,aimY:0},branch),false);
  assert.equal(policy.branchMatches(v,{throw:false,recall:false,aimX:1,aimY:0},branch),false);
});

test('arbitration keeps common motor noise formula and leaves post-noise command distinct', () => {
  const requested = { moveX: 0, moveY: 1, aimX: 1, aimY: 0, throw: true, recall: false };
  const transformed = coverMotorTransform(requested, 0, 1.2);
  assert.equal(transformed.command.throw, true); assert.equal(transformed.command.moveY, 1);
  assert.equal(transformed.sigma, .034);
  assert.equal(transformed.command.aimX, Math.cos(1.2*.034));
  assert.equal(transformed.command.aimY, Math.sin(1.2*.034));
  assert.deepEqual(requested, { moveX: 0, moveY: 1, aimX: 1, aimY: 0, throw: true, recall: false });
});
