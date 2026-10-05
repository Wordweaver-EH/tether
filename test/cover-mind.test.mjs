import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step } from '../src/sim.js';
import { percept } from '../src/perception.js';
import { createBelief, expectedVisible } from '../src/mind/belief.mjs';
import { rng } from '../src/mind/math.mjs';
import { createMind } from '../src/mind/index.mjs';
import { createCoverMind } from '../src/agents/cover-mind.mjs';
import { createCoverInterface } from '../src/agents/cover-interface.mjs';

const cover = () => createWorld({ gameMode: 'COVER_CONTROL' });
function place(w, i, p) { w.players[i].position = { ...p }; w.spears[i].position = { ...p }; }

test('Cover negative evidence respects blocked lines for both body and remembered spear', () => {
  const w = cover(); place(w, 0, { x: -5, y: 0 }); place(w, 1, { x: -2, y: 0 });
  const visible = percept(w, 'P1', 'MODE_A'), hidden = percept(w, 'P1', 'MODE_B');
  assert.equal(hidden.opponent, null);
  assert.equal(expectedVisible(hidden, { x: -2, y: 0 }), false);
  assert.equal(expectedVisible(hidden, { x: -4.5, y: 0 }), true);
  assert.equal(expectedVisible({ ...hidden, cone: { ...hidden.cone, occlusion: false } }, { x: -2, y: 0 }), true);
  const blocked = createBelief(rng(17)), coneOnly = createBelief(rng(17));
  for (let i = 0; i < 20; i++) { blocked.update(visible, i / 30); coneOnly.update(visible, i / 30); }
  const kept = blocked.update(hidden, 20 / 30);
  const rejected = coneOnly.update({ ...hidden, cone: { ...hidden.cone, occlusion: false } }, 20 / 30);
  assert.equal(kept.spear.state, 'HELD'); assert.equal(rejected.spear.state, 'UNKNOWN');
  assert.ok(kept.particles.filter(p => Math.hypot(p.x + 2, p.y) < .5).length >= 40);
  assert.ok(rejected.particles.filter(p => Math.hypot(p.x + 2, p.y) < .5).length < 20);
});

test('Cover mind is precisely the existing mind plus common embodiment', () => {
  const adapted = createCoverMind({ seed: 91 });
  const bare = createMind({ seed: 91, difficulty: 'normal', benchmarkInterface: true,
    deferCommand: true, captureTrace: true });
  const wrapped = createCoverInterface(bare, { seed: 91 });
  const w = cover();
  for (let tick = 0; tick < 240; tick++) {
    const v = percept(w, 'P1', 'MODE_B');
    const a = adapted.act(v), b = wrapped.act(v);
    assert.deepEqual(a, b);
    if (tick < 18) assert.deepEqual(a, { moveX: 0, moveY: 0, aimX: 0, aimY: 0, throw: false, recall: false });
    step(w, [a, { moveY: -.5, aimX: -1 }]);
  }
  assert.deepEqual(adapted.trace(), bare.trace());
  assert.deepEqual(adapted.memory(), bare.memory());
  assert.equal(adapted.settings().controller, 'cover-existing-mind-v1');
  assert.equal(adapted.settings().embodiment.latencyTicks, 18);
  assert.equal(adapted.settings().embodiment.decisionTicks, 4);
  assert.throws(() => adapted.act(percept(createWorld(), 'P1', 'MODE_B')), /Cover Control/);
});

test('Cover wrapper commits the actual noisy command at receipt time', () => {
  const commits = [];
  const agent = createCoverInterface({ settings: () => ({}), act: () => ({ aimX: 1, throw: true }),
    commitCommand: (command, view, time) => commits.push({ command, sensorTime: view.time.elapsedSec, time }) });
  const w = cover();
  for (let tick = 0; tick < 19; tick++) {
    const output = agent.act(percept(w, 'P1', 'MODE_B'));
    if (tick === 18) assert.deepEqual(commits[0].command, output);
    step(w, [{}, {}]);
  }
  assert.equal(commits.length, 1); assert.equal(commits[0].sensorTime, 0); assert.equal(commits[0].time, .15);
});

test('hidden opponent truth cannot enter the Cover mind through its adapter', () => {
  const a = cover(), b = cover(), ma = createCoverMind({ seed: 22 }), mb = createCoverMind({ seed: 22 });
  place(b, 1, { x: 4.8, y: 1.1 }); b.players[1].facing = { x: 0, y: -1 };
  for (let tick = 0; tick < 60; tick++) {
    const pa = percept(a, 'P1', 'MODE_B'), pb = percept(b, 'P1', 'MODE_B');
    assert.deepEqual(pa, pb); assert.deepEqual(ma.act(pa), mb.act(pb));
    step(a, [{}, {}]); step(b, [{}, {}]);
  }
});
