import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createWorld, hashWorld, step } from '../src/sim.js';
import { percept } from '../src/perception.js';
import { createMind } from '../src/mind/index.mjs';
import { createCoverAgent } from '../src/agents/cover-control.mjs';
import { createCoverMind } from '../src/agents/cover-mind.mjs';
import { createSessionLogger } from '../src/log.js';
import { renderModel } from '../client/render-model.mjs';
import { drawCone, drawOutsideCone, drawObjective } from '../client/canvas.mjs';
import { COVER_RULES, COVER_GUIDE, COVER_MIND_GUIDE, objectiveProgress, objectiveStatus, visibilityPolygon } from '../client/cover-display.mjs';
import { MEMORY_KEY } from '../client/memory-store.mjs';
import { TELEMETRY_KEY } from '../client/telemetry.mjs';
import { parseLog } from '../replay/log-data.mjs';

function recordingContext() {
  const calls = [];
  const ctx = new Proxy({}, {
    get: (_, name) => name === 'measureText' ? (text) => ({ width: text.length * 0.1 })
      : (...args) => calls.push([name, ...args]),
    set: (_, name, value) => { calls.push([name, value]); return true; },
  });
  return { ctx, calls };
}

function withinPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) &&
        point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

test('Cover renderer carries public ring state but cannot recover hidden bodies, spears or speech', () => {
  const world = createWorld({ gameMode: 'COVER_CONTROL' });
  world.players[1].position = { x: 0, y: 0 };
  world.spears[1].position = { x: 0, y: 0 };
  world.spears[0].state = 'EMBEDDED'; world.spears[0].position = { x: 1, y: 0 };
  world.objective = { controller: 'P2', contested: false, holdTicks: 120 };
  const view = percept(world, 'P1', 'MODE_B'), model = renderModel(view, 'not visible');
  assert.equal(view.opponent, null);
  assert.deepEqual(model.players.map((p) => p.id), ['P1']);
  assert.deepEqual(model.spears, []);
  assert.equal(model.npcCone, null); assert.equal(model.outerSpeech, null);
  assert.equal(model.gameMode, 'COVER_CONTROL');
  assert.equal(model.objective.controller, 'P2');
  assert.equal(objectiveProgress(model.objective), 0.5);
  assert.equal(objectiveStatus(model.objective), 'Baseline NPC holding · 50%');
  const full = renderModel(percept(world, 'P1', 'MODE_A'));
  assert.equal(full.players.length, 2); assert.equal(full.spears.length, 2);
  assert.equal(full.cone.occlusion, false);
  assert.equal(renderModel(percept(createWorld(), 'P1', 'MODE_B')).objective, undefined);
});

test('Cover cone polygon stops at walls and keeps the exposed route visible', () => {
  const world = createWorld({ gameMode: 'COVER_CONTROL' });
  const view = percept(world, 'P1', 'MODE_B');
  const polygon = visibilityPolygon(view.cone, view.arena);
  assert.equal(withinPolygon({ x: -4.5, y: 0 }, polygon), true);
  assert.equal(withinPolygon({ x: -2.5, y: 0 }, polygon), false);
  assert.equal(withinPolygon({ x: 0, y: 0 }, polygon), false);
  assert.equal(withinPolygon({ x: -2.9, y: -2.3 }, polygon), true);
  for (const point of polygon) {
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
    assert.ok(point.x >= -8 - 1e-10 && point.x <= 8 + 1e-10);
    assert.ok(point.y >= -5 - 1e-10 && point.y <= 5 + 1e-10);
  }
  const { ctx, calls } = recordingContext();
  drawCone(ctx, view.cone, '#fff', 0.1, view.arena);
  assert.ok(calls.some(([name]) => name === 'lineTo'));
  assert.ok(!calls.some(([name]) => name === 'arc'));
  calls.length = 0;
  drawOutsideCone(ctx, view.cone, view.arena.bounds, 0.62, view.arena.obstacles);
  assert.ok(calls.some(([name, rule]) => name === 'fill' && rule === 'evenodd'));
  assert.ok(!calls.some(([name]) => name === 'arc'));
  calls.length = 0;
  drawCone(ctx, { ...view.cone, occlusion: false }, '#fff', 0.1, view.arena);
  assert.ok(calls.some(([name]) => name === 'arc'), 'Mode A/default wedge remains unoccluded');
});

test('public objective text and drawing distinguish open, held and contested states', () => {
  const objective = { id: 'CONTROL', position: { x: 0, y: 0 }, radius: 1.05,
    holdTicksRequired: 240, holdTicks: 0, controller: null, contested: false };
  assert.match(objectiveStatus(objective), /Ring open/);
  assert.equal(objectiveStatus({ ...objective, contested: true }), 'Both inside: progress resets');
  assert.equal(objectiveStatus({ ...objective, controller: 'P1', holdTicks: 239 }), 'You holding · 99%');
  assert.equal(objectiveStatus({ ...objective, controller: 'P2', holdTicks: 120 }, { P1: 'You', P2: 'Existing mind' }), 'Existing mind holding · 50%');
  assert.match(COVER_RULES, /without a reset/); assert.match(COVER_RULES, /Both inside/);
  assert.match(COVER_GUIDE, /returning spears pass through/);
  assert.match(COVER_MIND_GUIDE, /Experimental existing hunt\/search policy, not yet taught ring capture/);
  const { ctx, calls } = recordingContext();
  drawObjective(ctx, { ...objective, controller: 'P1', holdTicks: 120 });
  assert.equal(calls.filter(([name]) => name === 'arc').length, 2);
  assert.ok(calls.some(([name, text]) => name === 'fillText' && text === 'CONTROL'));
});

// This is a DOM/canvas-call integration harness, not a live browser or a
// screenshot test. It exercises the actual app module, controller and logger.
async function appHarness({ testMode = true, page = 'client' } = {}) {
  const html = await readFile(new URL(`../${page}/index.html`, import.meta.url), 'utf8');
  const { ctx, calls } = recordingContext(), elements = new Map(), downloads = [];
  function element(id) {
    const listeners = new Map();
    return { id, value: '', textContent: '', hidden: false, disabled: false, children: [], style: {},
      dataset: {}, checked: true, classList: { add() {}, remove() {} },
      addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(fn); },
      async dispatch(name, event = {}) { for (const fn of listeners.get(name) ?? []) await fn({ target: this, currentTarget: this, preventDefault() {}, ...event }); },
      setAttribute() {}, getContext: () => ctx,
      getBoundingClientRect: () => ({ width: 1200, height: 700, left: 0, top: 0 }),
      append(...children) { this.children.push(...children); },
      replaceChildren(...children) { this.children = children; },
      add(child) { this.children.push(child); },
      click() { if (this.href) downloads.push(this); },
    };
  }
  for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) elements.set(id, element(id));
  const layers = [...html.matchAll(/\bdata-layer="([^"]+)"/g)].map(([, layer]) => {
    const el = element(layer); el.dataset.layer = layer; return el;
  });
  const values = new Map([[MEMORY_KEY, JSON.stringify({ version: 2, snapshot: createMind({ seed: 17 }).memory() })]]);
  const writes = [], removes = [];
  const storage = { getItem: (key) => values.get(key) ?? null,
    setItem(key, value) { values.set(key, value); writes.push(key); },
    removeItem(key) { values.delete(key); removes.push(key); } };
  const window = { ...element('window'), localStorage: storage, devicePixelRatio: 1, confirm: () => true };
  const document = { ...element('document'), getElementById(id) { assert.ok(elements.has(id), id); return elements.get(id); },
    createElement: (tag) => element(tag), createTextNode: (text) => ({ textContent: text }),
    querySelectorAll: () => layers, querySelector: () => element('canvas-wrap') };
  let callback = null;
  const globals = { window, document, location: { search: testMode ? '?test=1' : '' },
    navigator: { getGamepads: () => [] }, requestAnimationFrame: (fn) => { callback = fn; },
    Option: function Option(text, value) { this.text = text; this.value = value; } };
  const previous = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const cleanup = () => { for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  } };
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  for (const [id, value] of [['mode', 'MODE_B'], ['difficulty', 'normal'], ['gameMode', 'DUEL'], ['coverOpponent', 'baseline'], ['speed', '1']])
    if (elements.has(id)) elements.get(id).value = value;
  try { await import(`../${page}/app.mjs?harness=${Math.random()}`); }
  catch (error) { cleanup(); throw error; }
  return { window, document, elements, values, writes, removes, downloads, calls, cleanup,
    el: (id) => elements.get(id), frame: (now) => callback(now), api: window.__codegame };
}

test('client API keeps Cover mode through restore and reset(seed) retains the exact default path', async () => {
  const dom = await appHarness();
  try {
    const originalMemory = dom.values.get(MEMORY_KEY);
    assert.equal(dom.el('coverOpponentSelector').hidden, true);
    assert.equal(dom.el('coverOpponent').value, 'baseline');
    assert.equal(dom.api.reset(73, 'COVER_CONTROL'), hashWorld(createWorld({ gameMode: 'COVER_CONTROL' })));
    const baselineWorld = createWorld({ gameMode: 'COVER_CONTROL' }), baseline = createCoverAgent({ seed: 73 });
    const coverInputs = Array.from({ length: 180 }, () => ({ moveY: -1 }));
    for (const input of coverInputs) step(baselineWorld, [input, baseline.act(percept(baselineWorld, 'P2', 'MODE_B'), 1 / 120)]);
    assert.equal(dom.api.advance(180, coverInputs).hash, hashWorld(baselineWorld));
    const snapshot = dom.api.snapshot();
    assert.equal(snapshot.gameMode, 'COVER_CONTROL');
    assert.equal(snapshot.coverOpponent, undefined, 'default Cover snapshots preserve their existing shape');
    assert.equal(snapshot.world.gameMode, 'COVER_CONTROL');
    assert.equal(dom.api.restore(snapshot), snapshot.hash);
    dom.api.render();
    assert.match(dom.el('objectiveStatus').textContent, /Ring open|holding|Both inside/);
    assert.equal(dom.el('opponentLabel').textContent, 'BASELINE NPC');
    assert.equal(dom.values.get(MEMORY_KEY), originalMemory);
    assert.ok(!dom.writes.includes(MEMORY_KEY)); assert.ok(!dom.removes.includes(MEMORY_KEY));
    const world = createWorld(), mind = createMind({ seed: 73, difficulty: 'normal', captureTrace: true, memorySnapshot: null });
    assert.equal(dom.api.reset(73), hashWorld(world));
    const inputs = Array.from({ length: 60 }, (_, i) => ({ moveY: i < 30 ? -1 : 1, throw: i === 0 }));
    for (const input of inputs) step(world, [input, mind.act(percept(world, 'P2', 'MODE_B'), 1 / 120)]);
    assert.equal(dom.api.advance(inputs.length, inputs).hash, hashWorld(world));
    const duel = dom.api.snapshot();
    assert.equal(duel.gameMode, undefined); assert.equal(duel.world.gameMode, undefined);
    assert.equal(duel.coverOpponent, undefined);
    assert.equal(dom.api.restore(duel), duel.hash);
    assert.throws(() => dom.api.reset(1, 'OTHER'), /invalid game mode/);
    assert.throws(() => dom.api.reset(1, 'COVER_CONTROL', 'OTHER'), /invalid Cover opponent/);
  } finally { dom.cleanup(); }
});

test('Cover UI handles pause, early-end, download, rematch and mode changes without touching Duel memory', async () => {
  const dom = await appHarness({ testMode: false });
  try {
    const originalMemory = dom.values.get(MEMORY_KEY);
    dom.el('gameMode').value = 'COVER_CONTROL'; await dom.el('gameMode').dispatch('change');
    assert.equal(dom.el('difficulty').disabled, true); assert.equal(dom.el('coverInfo').hidden, false);
    assert.equal(dom.el('coverOpponentSelector').hidden, false); assert.equal(dom.el('coverOpponent').value, 'baseline');
    assert.equal(dom.el('coverGuide').textContent, COVER_GUIDE);
    await dom.el('resetMemory').dispatch('click');
    assert.equal(dom.values.get(MEMORY_KEY), originalMemory);
    await dom.el('begin').dispatch('click'); dom.frame(0); dom.frame(100);
    await dom.window.dispatch('pagehide');
    await dom.window.dispatch('keydown', { code: 'Escape' });
    assert.equal(dom.el('pause').hidden, false);
    await dom.el('resume').dispatch('click'); dom.frame(110); dom.frame(210);
    await dom.window.dispatch('blur'); await dom.el('endEarly').dispatch('click');
    assert.equal(dom.el('result').hidden, false);
    assert.match(dom.el('resultScore').textContent, /Baseline NPC/);
    assert.match(dom.el('learnedSummary').textContent, /does not learn/);
    await dom.el('download').dispatch('click');
    const parsed = parseLog(await (await fetch(dom.downloads[0].href)).text());
    assert.equal(parsed.metadata.game_mode, 'COVER_CONTROL'); assert.deepEqual(parsed.traces, []);
    assert.equal(parsed.metadata.agent_technical[1].controller, 'cover-control-baseline-v1');
    assert.ok(parsed.duration > 0);
    await dom.el('rematch').dispatch('click');
    await dom.el('rematch').dispatch('click');
    assert.equal(dom.el('result').hidden, true);
    assert.equal(JSON.parse(dom.values.get(TELEMETRY_KEY)).rematches, 1);
    await dom.window.dispatch('keydown', { code: 'Escape' }); await dom.el('endEarly').dispatch('click');
    await dom.el('changeMode').dispatch('click');
    assert.equal(dom.el('start').hidden, false);
    assert.equal(dom.values.get(MEMORY_KEY), originalMemory);
    assert.ok(!dom.writes.includes(MEMORY_KEY)); assert.ok(!dom.removes.includes(MEMORY_KEY));
    dom.el('gameMode').value = 'DUEL'; await dom.el('gameMode').dispatch('change');
    assert.equal(dom.el('difficulty').disabled, false); assert.equal(dom.el('coverInfo').hidden, true);
    await dom.el('begin').dispatch('click');
    await dom.window.dispatch('keydown', { code: 'Escape' }); await dom.el('endEarly').dispatch('click');
    assert.equal(dom.el('opponentLabel').textContent, 'MIND');
    assert.ok(dom.writes.includes(MEMORY_KEY), 'Duel still saves its learning');
  } finally { dom.cleanup(); }
});

test('Cover baseline reaches the natural result screen without missing mind methods', async () => {
  const dom = await appHarness();
  try {
    dom.api.reset(8, 'COVER_CONTROL');
    const result = dom.api.advance(36000);
    assert.equal(result.phase, 'result'); assert.equal(result.tick, 36000);
    assert.equal(dom.el('result').hidden, false);
    assert.match(dom.el('resultScore').textContent, /Baseline NPC/);
    assert.ok(!dom.writes.includes(MEMORY_KEY)); assert.ok(!dom.removes.includes(MEMORY_KEY));
  } finally { dom.cleanup(); }
});

test('optional Cover mind uses its fresh controller, restores the choice and logs only its actual traces', async () => {
  const dom = await appHarness();
  try {
    const originalMemory = dom.values.get(MEMORY_KEY);
    const world = createWorld({ gameMode: 'COVER_CONTROL' });
    const mind = createCoverMind({ seed: 37, captureTrace: true });
    const inputs = Array.from({ length: 300 }, (_, i) => ({ moveY: i < 180 ? -1 : 1, throw: i === 160 }));
    dom.api.reset(37, 'COVER_CONTROL', 'mind');
    for (const input of inputs) step(world, [input, mind.act(percept(world, 'P2', 'MODE_B'), 1 / 120)]);
    assert.equal(dom.api.advance(inputs.length, inputs).hash, hashWorld(world));
    const snapshot = dom.api.snapshot();
    assert.equal(snapshot.coverOpponent, 'mind');
    dom.api.reset(37, 'COVER_CONTROL');
    assert.equal(dom.el('opponentLabel').textContent, 'BASELINE NPC');
    assert.equal(dom.api.restore(snapshot), snapshot.hash);
    assert.equal(dom.el('coverOpponent').value, 'mind');
    assert.equal(dom.el('opponentLabel').textContent, 'EXISTING MIND');
    assert.match(dom.el('objectiveTitle').textContent, /existing mind \(experimental\)/);
    const continuation = Array.from({ length: 120 }, () => ({ moveX: 1 }));
    for (const input of continuation) step(world, [input, mind.act(percept(world, 'P2', 'MODE_B'), 1 / 120)]);
    assert.equal(dom.api.advance(continuation.length, continuation).hash, hashWorld(world));
    await dom.window.dispatch('keydown', { code: 'Escape' }); await dom.el('endEarly').dispatch('click');
    mind.finish(percept(world, 'P2', 'MODE_B'));
    await dom.el('download').dispatch('click');
    const parsed = parseLog(await (await fetch(dom.downloads[0].href)).text());
    assert.equal(parsed.metadata.agent_technical[1].controller, 'cover-existing-mind-v1');
    assert.ok(parsed.traces.length > 0);
    assert.deepEqual(parsed.traces, JSON.parse(JSON.stringify(mind.trace())), 'downloaded traces come from the selected controller');
    assert.match(dom.el('learnedSummary').textContent, /not yet taught ring capture/);
    assert.match(dom.el('resultScore').textContent, /Existing mind/);
    assert.equal(JSON.parse(dom.values.get(TELEMETRY_KEY)).bouts.at(-1).opponent, 'cover-control-mind');
    assert.equal(dom.values.get(MEMORY_KEY), originalMemory);
    assert.ok(!dom.writes.includes(MEMORY_KEY)); assert.ok(!dom.removes.includes(MEMORY_KEY));
  } finally { dom.cleanup(); }
});

test('Cover mind UI remains experimental through rematch and cannot save or clear Duel memory', async () => {
  const dom = await appHarness({ testMode: false });
  try {
    const originalMemory = dom.values.get(MEMORY_KEY);
    dom.el('gameMode').value = 'COVER_CONTROL'; await dom.el('gameMode').dispatch('change');
    dom.el('coverOpponent').value = 'mind'; await dom.el('coverOpponent').dispatch('change');
    assert.equal(dom.el('difficulty').disabled, true);
    assert.equal(dom.el('resetMemory').disabled, true);
    assert.equal(dom.el('coverGuide').textContent, COVER_MIND_GUIDE);
    assert.match(dom.el('memoryStatus').textContent, /never loaded from or saved to your Duel profile/);
    await dom.el('resetMemory').dispatch('click'); await dom.el('begin').dispatch('click');
    dom.frame(0); dom.frame(500);
    await dom.window.dispatch('pagehide');
    await dom.window.dispatch('blur'); await dom.el('endEarly').dispatch('click');
    await dom.el('resetMemory').dispatch('click');
    await dom.el('rematch').dispatch('click'); await dom.el('rematch').dispatch('click');
    assert.equal(dom.el('coverOpponent').value, 'mind');
    assert.equal(dom.el('opponentLabel').textContent, 'EXISTING MIND');
    assert.equal(JSON.parse(dom.values.get(TELEMETRY_KEY)).rematches, 1);
    dom.frame(600); dom.frame(1100);
    await dom.window.dispatch('keydown', { code: 'Escape' }); await dom.el('endEarly').dispatch('click');
    await dom.el('changeMode').dispatch('click');
    assert.equal(dom.el('coverOpponent').value, 'mind');
    dom.el('coverOpponent').value = 'baseline'; await dom.el('coverOpponent').dispatch('change');
    assert.equal(dom.el('coverGuide').textContent, COVER_GUIDE);
    await dom.el('begin').dispatch('click');
    assert.equal(dom.el('opponentLabel').textContent, 'BASELINE NPC');
    await dom.window.dispatch('keydown', { code: 'Escape' }); await dom.el('endEarly').dispatch('click');
    assert.equal(JSON.parse(dom.values.get(TELEMETRY_KEY)).bouts.at(-1).opponent, 'cover-control-baseline');
    assert.equal(dom.values.get(MEMORY_KEY), originalMemory);
    assert.ok(!dom.writes.includes(MEMORY_KEY)); assert.ok(!dom.removes.includes(MEMORY_KEY));
    await dom.el('changeMode').dispatch('click');
    dom.el('gameMode').value = 'DUEL'; await dom.el('gameMode').dispatch('change');
    assert.equal(dom.el('difficulty').disabled, false); assert.equal(dom.el('coverOpponentSelector').hidden, true);
    await dom.el('begin').dispatch('click');
    assert.equal(dom.el('opponentLabel').textContent, 'MIND');
    await dom.window.dispatch('pagehide');
    assert.ok(dom.writes.includes(MEMORY_KEY), 'Duel retains its original persistence path');
  } finally { dom.cleanup(); }
});

test('Cover test-mode rematches snapshot their new seed and input history for either opponent', async () => {
  const dom = await appHarness();
  try {
    const originalMemory = dom.values.get(MEMORY_KEY);
    for (const opponent of ['baseline', 'mind']) {
      dom.api.reset(7, 'COVER_CONTROL', opponent);
      dom.api.advance(120, Array.from({ length: 120 }, () => ({ moveY: -1 })));
      await dom.window.dispatch('keydown', { code: 'Escape' }); await dom.el('endEarly').dispatch('click');
      await dom.el('rematch').dispatch('click');
      const inputs = Array.from({ length: 180 }, () => ({ moveY: 1 }));
      dom.api.advance(inputs.length, inputs);
      const snapshot = dom.api.snapshot();
      assert.equal(snapshot.coverOpponent, opponent === 'mind' ? 'mind' : undefined);
      assert.equal(snapshot.inputs.length, snapshot.world.tick);
      assert.deepEqual(snapshot.inputs, inputs, 'prior bout input history is discarded');
      const world = createWorld({ gameMode: 'COVER_CONTROL' });
      const agent = opponent === 'mind' ? createCoverMind({ seed: snapshot.seed }) : createCoverAgent({ seed: snapshot.seed });
      for (const input of inputs) step(world, [input, agent.act(percept(world, 'P2', 'MODE_B'), 1 / 120)]);
      assert.equal(snapshot.hash, hashWorld(world), 'snapshot records the rematch seed');
      assert.equal(dom.api.restore(snapshot), snapshot.hash);
      assert.equal(dom.el('coverOpponent').value, opponent);
      assert.equal(dom.el('opponentLabel').textContent, opponent === 'mind' ? 'EXISTING MIND' : 'BASELINE NPC');
    }
    assert.equal(dom.values.get(MEMORY_KEY), originalMemory);
    assert.ok(!dom.writes.includes(MEMORY_KEY)); assert.ok(!dom.removes.includes(MEMORY_KEY));
  } finally { dom.cleanup(); }
});

test('Mind View distinguishes experimental Cover traces and restores baseline labels on reload', async () => {
  const world = createWorld({ gameMode: 'COVER_CONTROL' });
  const mind = createCoverMind({ seed: 37, captureTrace: true });
  const logger = createSessionLogger({ world, mode: 'MODE_B' });
  logger.records[0].agent_technical = [null, mind.settings()];
  for (let i = 0; i < 180; i++) {
    const inputs = [{}, mind.act(percept(world, 'P2', 'MODE_B'), 1 / 120)];
    logger.recordStep(world, inputs, step(world, inputs));
  }
  for (const row of mind.trace()) logger.records.push({ recordType: 'MIND_TRACE', mode: 'MODE_B',
    player: 'P2', step: Math.round(row.time * 120), timestamp: row.time, trace: row });
  const dom = await appHarness({ page: 'replay' });
  try {
    const load = (text) => dom.el('file').dispatch('change', { target: { files: [{ text: async () => text }] } });
    await load(logger.toJSONL());
    assert.match(dom.el('verification').textContent, /^VERIFIED/);
    assert.match(dom.el('focus').textContent, /Existing mind \(experimental\)/);
    assert.match(dom.el('traceTime').textContent, /not yet taught ring capture/);
    dom.el('scrub').value = '1.5'; await dom.el('scrub').dispatch('input');
    assert.match(dom.el('focus').textContent, new RegExp(mind.trace().at(-1).focus));
    assert.match(dom.el('traceTime').textContent, /Cognitive cycle/);
    assert.ok(dom.el('saliences').children.length > 0, 'recorded specialists are rendered');
    assert.ok(dom.el('cognition').children.length > 1, 'recorded processing readouts are rendered');
    dom.el('scrub').value = '0'; await dom.el('scrub').dispatch('input');
    assert.match(dom.el('focus').textContent, /Existing mind \(experimental\)/);
    await load(logger.records.filter((row) => row.recordType !== 'MIND_TRACE').map((row) => JSON.stringify(row)).join('\n'));
    assert.match(dom.el('focus').textContent, /Existing mind \(experimental\) · No focus/);
    assert.match(dom.el('saliences').textContent, /No recorded mind trace at this time/);
    assert.equal(dom.el('saliences').children.length, 0, 'missing traces are never synthesized');
    await load(createSessionLogger({ world: createWorld({ gameMode: 'COVER_CONTROL' }), mode: 'MODE_B' }).toJSONL());
    assert.equal(dom.el('focus').textContent, 'Cover Control · baseline NPC');
    assert.match(dom.el('saliences').textContent, /does not produce a mind trace/);
    assert.doesNotMatch(dom.el('traceTime').textContent, /hunt\/search|Cognitive cycle/);
  } finally { dom.cleanup(); }
});

test('replay UI renders the Cover map/objective, seeks both ways and reloads an original Duel', async () => {
  const world = createWorld({ gameMode: 'COVER_CONTROL' });
  const npc = createCoverAgent({ seed: 3 }), logger = createSessionLogger({ world, mode: 'MODE_B' });
  for (let i = 0; i < 1800; i++) {
    const inputs = [{}, npc.act(percept(world, 'P2', 'MODE_B'), 1 / 120)];
    logger.recordStep(world, inputs, step(world, inputs));
  }
  const dom = await appHarness({ page: 'replay' });
  try {
    const load = (text) => dom.el('file').dispatch('change', { target: { files: [{ text: async () => text }] } });
    await load(logger.toJSONL());
    assert.match(dom.el('verification').textContent, /^VERIFIED/);
    assert.equal(dom.el('focus').textContent, 'Cover Control · baseline NPC');
    assert.match(dom.el('saliences').textContent, /does not produce a mind trace/);
    assert.ok(dom.calls.some(([name, x, y, width, height]) => name === 'fillRect' &&
      x === -3.8 && y === -1 && width === 1 && height === 3.2));
    assert.ok(dom.calls.some(([name, text]) => name === 'fillText' && text === 'CONTROL'));
    dom.el('scrub').value = '15'; await dom.el('scrub').dispatch('input');
    assert.match(dom.el('traceTime').textContent, /P1 0 : [1-9]\d* P2/);
    dom.el('scrub').value = '0'; await dom.el('scrub').dispatch('input');
    assert.match(dom.el('traceTime').textContent, /P1 0 : 0 P2/);
    dom.calls.length = 0;
    await load(createSessionLogger({ world: createWorld(), mode: 'MODE_A' }).toJSONL());
    assert.match(dom.el('verification').textContent, /^VERIFIED/);
    assert.equal(dom.el('focus').textContent, 'No focus');
    assert.ok(!dom.calls.some(([name, text]) => name === 'fillText' && text === 'CONTROL'));
  } finally { dom.cleanup(); }
});
