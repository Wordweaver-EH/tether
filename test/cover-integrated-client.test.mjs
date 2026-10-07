import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createWorld, hashWorld, step } from '../src/sim.js';
import { percept } from '../src/perception.js';
import { createMind } from '../src/mind/index.mjs';
import { createIntegratedCoverMind } from '../src/agents/cover-integrated.mjs';
import { createSessionLogger } from '../src/log.js';
import { COVER_GUIDE, COVER_MIND_GUIDE, COVER_INTEGRATED_GUIDE } from '../client/cover-display.mjs';
import { cognitionReadouts } from '../client/mind-readouts.mjs';
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

test('Integrated mind remains an explicit Cover choice with accurate experimental guidance', async () => {
  const html = await readFile(new URL('../client/index.html', import.meta.url), 'utf8');
  assert.match(html, /value="DUEL" selected/);
  assert.match(html, /value="baseline" selected/);
  assert.match(html, /value="mind">Existing mind/);
  assert.match(html, /value="integrated">Integrated mind/);
  assert.doesNotMatch(html, /value="integrated" selected/);
  assert.match(COVER_INTEGRATED_GUIDE, /ring, threat and search goals compete/);
  assert.match(COVER_INTEGRATED_GUIDE, /bounded planning and an explicit fallback/);
  assert.match(COVER_INTEGRATED_GUIDE, /session-only procedural route cache/);
  assert.match(COVER_INTEGRATED_GUIDE, /same 150ms perception delay, 30Hz decisions and aim noise/);
  assert.match(COVER_INTEGRATED_GUIDE, /Tactical score-credit learning is disabled/);
  assert.match(COVER_INTEGRATED_GUIDE, /no saved Duel profile/);
});

test('Cover cognition exposes recorded decisions, cache reuse, fallback and post-noise commands', () => {
  const input = { moveX: 1, moveY: 0, aimX: 0, aimY: 1, throw: true, recall: false };
  const actualCommand = { ...input, aimX: 0.125, aimY: 0.992 };
  const trace = { input, actualCommand, cognition: { tier: 2, cover: {
    intent: 'ring', reason: 'public ring open', actionSource: 'bounded-planner',
    routeCache: { reused: false }, planning: { status: 'budget-exhausted', fallback: 'known-route' },
  } } };
  const rows = Object.fromEntries(cognitionReadouts(trace));
  assert.equal(rows['Cover intent'], 'ring');
  assert.equal(rows['Cover reason'], 'public ring open');
  assert.equal(rows['Command source'], 'bounded-planner');
  assert.equal(rows['Route cache reused'], 'No');
  assert.equal(rows['Planning status'], 'budget-exhausted');
  assert.equal(rows['Planning fallback'], 'known-route');
  assert.match(rows['Requested input (before noise)'], /aim \(0\.000, 1\.000\)/);
  assert.match(rows['Actual command (post-noise)'], /aim \(0\.125, 0\.992\)/);
  trace.cognition.cover.routeCache.reused = true;
  trace.cognition.cover.planning.fallback = null;
  const reused = Object.fromEntries(cognitionReadouts(trace));
  assert.equal(reused['Route cache reused'], 'Yes');
  assert.equal(reused['Planning fallback'], 'None');
  assert.deepEqual(cognitionReadouts({ cognition: { tier: 0 } }), [['Tier', 'Reflex']], 'older logs do not gain invented Cover or command data');
  assert.deepEqual(cognitionReadouts({}), [['Status', 'Not recorded in this log']]);
});

test('integrated selection restores its deterministic controller and logs its actual traces and inputs', async () => {
  const dom = await appHarness();
  try {
    const originalMemory = dom.values.get(MEMORY_KEY);
    assert.equal(dom.el('gameMode').value, 'DUEL');
    assert.equal(dom.el('coverOpponent').value, 'baseline');
    const world = createWorld({ gameMode: 'COVER_CONTROL' });
    const mind = createIntegratedCoverMind({ seed: 137, captureTrace: true });
    const inputs = Array.from({ length: 480 }, (_, i) => ({ moveY: i < 240 ? -1 : 1, throw: i === 160 }));
    dom.api.reset(137, 'COVER_CONTROL', 'integrated');
    for (const input of inputs) step(world, [input, mind.act(percept(world, 'P2', 'MODE_B'), 1 / 120)]);
    assert.equal(dom.api.advance(inputs.length, inputs).hash, hashWorld(world));
    const snapshot = dom.api.snapshot();
    assert.equal(snapshot.coverOpponent, 'integrated');
    assert.equal(snapshot.gameMode, 'COVER_CONTROL');
    dom.api.reset(137);
    assert.equal(dom.el('opponentLabel').textContent, 'MIND');
    assert.equal(dom.api.restore(snapshot), snapshot.hash);
    assert.equal(dom.el('coverOpponent').value, 'integrated');
    assert.equal(dom.el('opponentLabel').textContent, 'INTEGRATED MIND');
    assert.match(dom.el('objectiveTitle').textContent, /integrated mind \(experimental\)/);
    const continuation = Array.from({ length: 120 }, () => ({ moveX: 1 }));
    for (const input of continuation) step(world, [input, mind.act(percept(world, 'P2', 'MODE_B'), 1 / 120)]);
    assert.equal(dom.api.advance(continuation.length, continuation).hash, hashWorld(world));
    await dom.window.dispatch('keydown', { code: 'Escape' });
    await dom.el('endEarly').dispatch('click');
    mind.finish(percept(world, 'P2', 'MODE_B'));
    await dom.el('download').dispatch('click');
    const text = await (await fetch(dom.downloads[0].href)).text();
    const parsed = parseLog(text), records = text.trim().split('\n').map(JSON.parse);
    assert.equal(parsed.metadata.agent_technical[1].controller, 'cover-integrated-mind-v2');
    assert.ok(parsed.traces.length > 0);
    assert.deepEqual(parsed.traces, JSON.parse(JSON.stringify(mind.trace())));
    assert.ok(parsed.traces.every(row => row.cognition?.cover && row.actualCommand));
    for (const trace of parsed.traces) {
      const commandStep = Math.round(trace.commandTime * 120) + 1;
      const actual = records.find(row => row.recordType === 'INPUT' && row.player === 'P2' && row.step === commandStep);
      assert.ok(actual, `command log at step ${commandStep}`);
      assert.deepEqual(trace.actualCommand, {
        moveX: actual.raw_move_x, moveY: actual.raw_move_y,
        aimX: actual.raw_aim_x, aimY: actual.raw_aim_y,
        throw: actual.throw_pressed, recall: actual.recall_pressed,
      }, 'recorded post-noise command is the real input consumed by the simulation');
    }
    assert.match(dom.el('learnedSummary').textContent, /session-only/);
    assert.match(dom.el('resultScore').textContent, /Integrated mind/);
    assert.equal(JSON.parse(dom.values.get(TELEMETRY_KEY)).bouts.at(-1).opponent, 'cover-control-integrated');
    assert.equal(dom.values.get(MEMORY_KEY), originalMemory);
    assert.ok(!dom.writes.includes(MEMORY_KEY)); assert.ok(!dom.removes.includes(MEMORY_KEY));
  } finally { dom.cleanup(); }
});

test('Integrated mind handles interrupted, repeated and changed-mode flows without touching Duel learning', async () => {
  const dom = await appHarness({ testMode: false });
  try {
    const originalMemory = dom.values.get(MEMORY_KEY);
    dom.el('gameMode').value = 'COVER_CONTROL'; await dom.el('gameMode').dispatch('change');
    dom.el('coverOpponent').value = 'integrated'; await dom.el('coverOpponent').dispatch('change');
    assert.equal(dom.el('coverGuide').textContent, COVER_INTEGRATED_GUIDE);
    assert.equal(dom.el('difficulty').disabled, true);
    assert.equal(dom.el('resetMemory').disabled, true);
    assert.match(dom.el('memoryStatus').textContent, /No learning is loaded from or saved to your Duel profile/);
    await dom.el('resetMemory').dispatch('click');
    await dom.el('begin').dispatch('click'); await dom.el('begin').dispatch('click');
    dom.frame(0); dom.frame(500);
    await dom.window.dispatch('pagehide');
    await dom.window.dispatch('blur');
    assert.equal(dom.el('pause').hidden, false);
    await dom.el('resume').dispatch('click');
    dom.frame(600); dom.frame(1100);
    dom.document.hidden = true; await dom.document.dispatch('visibilitychange');
    await dom.el('endEarly').dispatch('click'); await dom.el('endEarly').dispatch('click');
    assert.equal(dom.el('result').hidden, false);
    assert.equal(JSON.parse(dom.values.get(TELEMETRY_KEY)).boutsPlayed, 1);
    await dom.el('resetMemory').dispatch('click');
    await dom.el('rematch').dispatch('click'); await dom.el('rematch').dispatch('click');
    assert.equal(dom.el('coverOpponent').value, 'integrated');
    assert.equal(dom.el('opponentLabel').textContent, 'INTEGRATED MIND');
    assert.equal(JSON.parse(dom.values.get(TELEMETRY_KEY)).rematches, 1);
    await dom.window.dispatch('keydown', { code: 'Escape' }); await dom.el('endEarly').dispatch('click');
    await dom.el('changeMode').dispatch('click');
    for (const [value, guide, label] of [
      ['mind', COVER_MIND_GUIDE, 'EXISTING MIND'], ['baseline', COVER_GUIDE, 'BASELINE NPC'],
    ]) {
      dom.el('coverOpponent').value = value; await dom.el('coverOpponent').dispatch('change');
      assert.equal(dom.el('coverGuide').textContent, guide);
      await dom.el('begin').dispatch('click'); assert.equal(dom.el('opponentLabel').textContent, label);
      await dom.window.dispatch('keydown', { code: 'Escape' }); await dom.el('endEarly').dispatch('click');
      await dom.el('changeMode').dispatch('click');
    }
    assert.equal(dom.values.get(MEMORY_KEY), originalMemory);
    assert.ok(!dom.writes.includes(MEMORY_KEY)); assert.ok(!dom.removes.includes(MEMORY_KEY));
    dom.el('gameMode').value = 'DUEL'; await dom.el('gameMode').dispatch('change');
    assert.equal(dom.el('difficulty').disabled, false);
    assert.equal(dom.el('coverOpponentSelector').hidden, true);
    await dom.el('begin').dispatch('click');
    assert.equal(dom.el('opponentLabel').textContent, 'MIND');
    await dom.window.dispatch('pagehide');
    assert.ok(dom.writes.includes(MEMORY_KEY), 'Duel retains its original persistence path');
  } finally { dom.cleanup(); }
});

test('Integrated mind rematch snapshots retain only their fresh seed and input history', async () => {
  const dom = await appHarness();
  try {
    dom.api.reset(7, 'COVER_CONTROL', 'integrated');
    dom.api.advance(360, Array.from({ length: 360 }, () => ({ moveY: -1 })));
    await dom.window.dispatch('keydown', { code: 'Escape' }); await dom.el('endEarly').dispatch('click');
    await dom.el('rematch').dispatch('click');
    const inputs = Array.from({ length: 240 }, () => ({ moveY: 1 }));
    dom.api.advance(inputs.length, inputs);
    const snapshot = dom.api.snapshot();
    assert.equal(snapshot.coverOpponent, 'integrated');
    assert.equal(snapshot.inputs.length, snapshot.world.tick);
    assert.deepEqual(snapshot.inputs, inputs);
    const world = createWorld({ gameMode: 'COVER_CONTROL' });
    const mind = createIntegratedCoverMind({ seed: snapshot.seed });
    for (const input of inputs) step(world, [input, mind.act(percept(world, 'P2', 'MODE_B'), 1 / 120)]);
    assert.equal(snapshot.hash, hashWorld(world), 'rematch uses a fresh controller and the logged seed');
    assert.equal(dom.api.restore(snapshot), snapshot.hash);
    assert.equal(dom.el('coverOpponent').value, 'integrated');
  } finally { dom.cleanup(); }
});

test('Integrated mind reaches a natural full-bout result with its own telemetry and no Duel memory writes', async () => {
  const dom = await appHarness();
  try {
    const originalMemory = dom.values.get(MEMORY_KEY);
    dom.api.reset(13, 'COVER_CONTROL', 'integrated');
    const result = dom.api.advance(36000);
    assert.equal(result.phase, 'result');
    assert.equal(result.tick, 36000);
    assert.equal(dom.el('result').hidden, false);
    assert.match(dom.el('resultScore').textContent, /Integrated mind/);
    assert.match(dom.el('learnedSummary').textContent, /post-noise commands/);
    assert.equal(JSON.parse(dom.values.get(TELEMETRY_KEY)).bouts.at(-1).opponent, 'cover-control-integrated');
    assert.equal(dom.values.get(MEMORY_KEY), originalMemory);
    assert.ok(!dom.writes.includes(MEMORY_KEY)); assert.ok(!dom.removes.includes(MEMORY_KEY));
  } finally { dom.cleanup(); }
});

test('Mind View labels integrated traces, renders evidence, and clears labels on legacy reload', async () => {
  const world = createWorld({ gameMode: 'COVER_CONTROL' });
  const mind = createIntegratedCoverMind({ seed: 137, captureTrace: true });
  const logger = createSessionLogger({ world, mode: 'MODE_B' });
  logger.records[0].agent_technical = [null, mind.settings()];
  for (let i = 0; i < 240; i++) {
    const inputs = [{}, mind.act(percept(world, 'P2', 'MODE_B'), 1 / 120)];
    logger.recordStep(world, inputs, step(world, inputs));
  }
  for (const trace of mind.trace()) logger.records.push({ recordType: 'MIND_TRACE', mode: 'MODE_B',
    player: 'P2', step: Math.round(trace.time * 120), timestamp: trace.time, trace });
  const dom = await appHarness({ page: 'replay' });
  try {
    const load = text => dom.el('file').dispatch('change', { target: { files: [{ text: async () => text }] } });
    const readoutText = node => [node.textContent, ...(node.children ?? []).map(readoutText)].join(' ');
    await load(logger.toJSONL());
    assert.match(dom.el('verification').textContent, /^VERIFIED/);
    assert.match(dom.el('focus').textContent, /Integrated mind \(experimental\)/);
    assert.match(dom.el('traceTime').textContent, /ring\/threat\/search goals/);
    assert.doesNotMatch(dom.el('traceTime').textContent, /not yet taught ring capture/);
    dom.el('scrub').value = '2'; await dom.el('scrub').dispatch('input');
    assert.match(dom.el('traceTime').textContent, /Cognitive cycle/);
    assert.ok(dom.el('saliences').children.length > 0);
    const cognition = readoutText(dom.el('cognition'));
    assert.match(cognition, /Cover intent/);
    assert.match(cognition, /Planning status/);
    assert.match(cognition, /Movement source/);
    assert.match(cognition, /Weapon intention source/);
    assert.match(cognition, /Pre-noise shot guard/);
    assert.match(cognition, /Weapon execution/);
    assert.match(cognition, /Route cache reused/);
    assert.match(cognition, /Requested input \(before noise\)/);
    assert.match(cognition, /Actual command \(post-noise\)/);
    dom.el('scrub').value = '0'; await dom.el('scrub').dispatch('input');
    assert.match(dom.el('focus').textContent, /Integrated mind \(experimental\)/);
    await load(logger.records.filter(row => row.recordType !== 'MIND_TRACE').map(JSON.stringify).join('\n'));
    assert.match(dom.el('focus').textContent, /Integrated mind \(experimental\) · No focus/);
    assert.match(dom.el('saliences').textContent, /No recorded mind trace/);
    assert.equal(dom.el('saliences').children.length, 0);
    const oldIntegrated = structuredClone(logger.records);
    oldIntegrated[0].agent_technical[1].controller = 'cover-integrated-mind-v1';
    for (const row of oldIntegrated) if (row.trace?.cognition?.cover) {
      delete row.trace.cognition.cover.arbitration;
      delete row.trace.cognition.cover.planning.execution;
    }
    await load(oldIntegrated.map(JSON.stringify).join('\n'));
    assert.match(dom.el('focus').textContent, /Integrated mind \(experimental\)/);
    dom.el('scrub').value = '2'; await dom.el('scrub').dispatch('input');
    assert.doesNotMatch(readoutText(dom.el('cognition')), /Weapon intention source/);
    const legacy = createSessionLogger({ world: createWorld({ gameMode: 'COVER_CONTROL' }), mode: 'MODE_B' });
    legacy.records[0].agent_technical = [null, { controller: 'cover-existing-mind-v1' }];
    await load(legacy.toJSONL());
    assert.match(dom.el('focus').textContent, /Existing mind \(experimental\)/);
    assert.match(dom.el('traceTime').textContent, /not yet taught ring capture/);
    await load(createSessionLogger({ world: createWorld({ gameMode: 'COVER_CONTROL' }), mode: 'MODE_B' }).toJSONL());
    assert.equal(dom.el('focus').textContent, 'Cover Control · baseline NPC');
    assert.match(dom.el('saliences').textContent, /does not produce a mind trace/);
    await load(createSessionLogger({ world: createWorld(), mode: 'MODE_A' }).toJSONL());
    assert.equal(dom.el('focus').textContent, 'No focus');
    assert.doesNotMatch(dom.el('traceTime').textContent, /procedural route cache/);
  } finally { dom.cleanup(); }
});
