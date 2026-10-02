import { CONSTANTS, createWorld, hashWorld, snapshotWorld, step } from '../src/sim.js';
import { percept } from '../src/perception.js';
import { createMind } from '../src/mind/index.mjs';
import { createSessionLogger } from '../src/log.js';
import { createAccumulator } from './fixed-step.mjs';
import { createInputState } from './input.mjs';
import { renderModel } from './render-model.mjs';
import { drawPlay, viewport, screenToWorld } from './canvas.mjs';
import { readTelemetry, recordBout, recordRematch, recordSessionDuration } from './telemetry.mjs';

import { readMemory, saveMemory, resetMemory } from './memory-store.mjs';
import { learnedSummary } from './mind-readouts.mjs';

// Storage can be disabled by browser privacy settings. Gameplay still works.
let storage = null;
try { storage = window.localStorage; } catch { /* Session-only learning. */ }
const $ = (id) => document.getElementById(id);
const canvas = $('arena'), input = createInputState(), clock = createAccumulator();
let world = createWorld(), mind = null, logger = null, mode = 'MODE_B';
let phase = 'start', lastFrame = null, lastPaint = -Infinity, startDirty = true;
let flashUntil = 0, audio = null, muted = false;
let outer = null, outerUntil = 0, lastSpeechReportTime = -1, sessionStart = performance.now();
let memorySnapshot = readMemory(storage), boutNumber = 0, embedAt = new Map(), stats = null;
const testMode = new URLSearchParams(location.search).get('test') === '1';
let testSeed = null, testInputs = [];

function show(phaseName) {
  phase = phaseName;
  for (const id of ['start', 'pause', 'result']) $(id).hidden = id !== phaseName;
  $('hud').hidden = phaseName === 'start';
  $('resetMemory').disabled = phaseName === 'playing' || phaseName === 'pause';
  lastFrame = null; clock.reset();
}
function updateStats() {
  const t = readTelemetry(storage);
  const total = t.sessionDurationsSec.reduce((a, b) => a + b, 0);
  $('stats').textContent = `${t.boutsPlayed} bouts played  ·  ${t.rematches} rematches  ·  ${Math.round(total / 60)} minutes played`;
}
function unlockAudio() {
  if (muted) return;
  try { audio ??= new AudioContext(); if (audio.state === 'suspended') void audio.resume(); }
  catch { /* Audio is optional. */ }
}
function tone(freq, duration = 0.065) {
  if (muted) return;
  try {
    unlockAudio();
    if (!audio) return;
    const osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = 'sine'; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.035, audio.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    osc.connect(gain).connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration + 0.01);
  } catch { /* Audio is optional. */ }
}
function startBout(rematch = false, seedOverride = null) {
  unlockAudio();
  if (rematch) recordRematch(storage);
  mode = $('mode').value; world = createWorld();
  const seed = seedOverride ?? (Date.now() + boutNumber) >>> 0;
  mind = createMind({ seed, difficulty: $('difficulty').value,
    captureTrace: true, memorySnapshot });
  logger = createSessionLogger({ world, mode, sessionId: String(sessionStart),
    boutId: `bout-${++boutNumber}`, renderRate: 60, buildId: 'phase3-web',
    seed });
  logger.records[0].agent_technical = [null, mind.settings()];
  embedAt = new Map(); stats = { throws: 0, recalls: 0, embeds: 0, neutralizations: 0,
    delayedRecalls: 0, unseenActions: 0, scoreMargins: [], hits: 0 };
  outer = null; outerUntil = 0; lastSpeechReportTime = -1; input.releaseAll();
  $('status').textContent = `${mode === 'MODE_B' ? 'MODE B' : 'MODE A'} / 120 HZ`;
  show('playing');
}
function endBout() {
  if (phase !== 'playing') return;
  mind.finish(percept(world, 'P2', mode));
  memorySnapshot = mind.memory();
  $('learnedSummary').textContent = learnedSummary(memorySnapshot);
  if (!testMode) {
    const saved = saveMemory(storage, memorySnapshot);
    if (!saved) $('learnedSummary').textContent += ' Browser storage is unavailable, so this learning is session-only.';
    $('memoryStatus').textContent = saved ? 'Opponent learning saved in this browser' : 'Learning is session-only (storage unavailable)';
  }
  const trace = mind.trace();
  for (const row of trace) logger.records.push({ recordType: 'MIND_TRACE', mode,
    player: 'P2', step: Math.round(row.time * 120), timestamp: row.time, trace: row });
  const score = { ...percept(world, 'P1', mode).scores };
  const winner = score.P1 === score.P2 ? 'Draw' : score.P1 > score.P2 ? 'You win' : 'Mind wins';
  $('resultTitle').textContent = winner;
  $('resultScore').textContent = `You ${score.P1} · ${score.P2} Mind`;
  recordBout(storage, { mode, difficulty: $('difficulty').value, score,
    elapsedSec: world.elapsedSec, finishedAt: new Date().toISOString(), ...stats });
  show('result'); updateStats();
}
function handleEvents(events) {
  for (const event of events) {
    if (event.type === 'THROW' && event.player === 'P1') { stats.throws++; tone(390); }
    if (event.type === 'EMBED' && event.owner === 'P1') { stats.embeds++; embedAt.set('P1', world.elapsedSec); }
    if (event.type === 'RECALL_START' && event.owner === 'P1') {
      stats.recalls++; if (world.elapsedSec - (embedAt.get('P1') ?? world.elapsedSec) > 2) stats.delayedRecalls++;
    }
    if (event.type === 'SPEAR_NEUTRALIZED' && event.neutralizer === 'P1') stats.neutralizations++;
    if (event.type === 'HIT') stats.hits++;
    if (event.type === 'RESET') { flashUntil = performance.now() + 150; tone(600, 0.12);
      stats.scoreMargins.push({ time: world.elapsedSec, margin: event.scores.P1 - event.scores.P2 }); }
  }
}
function tick(dt, override = null) {
  if (world.ended) { endBout(); return; }
  const view1 = percept(world, 'P1', mode);
  const view2 = percept(world, 'P2', mode);
  const pad = navigator.getGamepads?.()[0] ?? null;
  const actions = [override ?? input.take(view1.own.position, pad), mind.act(view2, dt)];
  if (testMode) testInputs.push({ ...actions[0] });
  if (!view2.opponent && (actions[0].throw || actions[0].recall)) stats.unseenActions++;
  const events = step(world, actions);
  logger.recordStep(world, actions, events);
  handleEvents(events);
  const report = mind.selfReport(world.elapsedSec);
  if (report && report.time !== lastSpeechReportTime) {
    lastSpeechReportTime = report.time;
    // The current mind emits outer speech only on a Deceive ignition.
    if (report.innerSpeech && report.focus === 'Deceive') {
      const line = mind.trace().at(-1)?.outerSpeech;
      if (line) { outer = line; outerUntil = performance.now() + 2200; }
    }
  }
  if (world.ended) endBout();
}
function paint(now) {
  const view = percept(world, 'P1', mode);
  if (!view.opponent) { outer = null; outerUntil = 0; }
  drawPlay(canvas, renderModel(view, now < outerUntil ? outer : null), now < flashUntil);
  $('p1Score').textContent = view.scores.P1; $('p2Score').textContent = view.scores.P2;
  const seconds = Math.ceil(view.time.remainingSec);
  $('timer').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  lastPaint = now;
}
function frame(now) {
  if (phase === 'playing') {
    if (!testMode && lastFrame !== null) clock.advance(Math.max(0, (now - lastFrame) / 1000), tick);
    lastFrame = now;
    if (!testMode && phase === 'playing' && now - lastPaint >= 1000 / 60) paint(now);
  } else if (phase === 'start' && startDirty) {
    drawPlay(canvas, renderModel(percept(world, 'P1', 'MODE_B')), false);
    startDirty = false;
  }
  requestAnimationFrame(frame);
}
$('resetMemory').addEventListener('click', () => {
  if (phase === 'playing' || phase === 'pause') return;
  if (!window.confirm('Forget the mind’s learned opponent profile in this browser? Match statistics will stay.')) return;
  const cleared = resetMemory(storage);
  memorySnapshot = null;
  const message = cleared ? 'Opponent learning reset; the next bout starts fresh.' : 'Session memory reset; browser storage could not be cleared.';
  $('memoryStatus').textContent = message;
  $('learnedSummary').textContent = message;
});
$('memoryStatus').textContent = memorySnapshot ? 'Opponent learning restored from this browser' : 'The mind learns your play across bouts in this browser';
$('begin').addEventListener('click', () => startBout());
$('rematch').addEventListener('click', () => startBout(true));
$('resume').addEventListener('click', () => show('playing'));
$('download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([logger.toJSONL()], { type: 'application/x-ndjson' }));
  const link = document.createElement('a'); link.href = url; link.download = `tether-${logger.records[0].bout_id}.jsonl`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('mute').addEventListener('click', () => { muted = !muted; if (!muted) unlockAudio();
  $('mute').textContent = muted ? 'Sound off' : 'Sound on'; $('mute').setAttribute('aria-pressed', String(muted)); });
window.addEventListener('keydown', (event) => {
  if (['Space', 'ArrowUp', 'ArrowDown'].includes(event.code)) event.preventDefault();
  if (event.code === 'Escape') { if (phase === 'playing') show('pause'); else if (phase === 'pause') show('playing'); return; }
  if (phase !== 'playing') return;
  input.keys.add(event.code);
  if (event.code === 'Space' && !event.repeat) input.press('recall');
});
window.addEventListener('keyup', (event) => input.keys.delete(event.code));
window.addEventListener('blur', () => { input.releaseAll(); if (phase === 'playing') show('pause'); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { input.releaseAll(); if (phase === 'playing') show('pause'); }
});
window.addEventListener('resize', () => { startDirty = true; lastPaint = -Infinity; });
canvas.addEventListener('contextmenu', (event) => event.preventDefault());
canvas.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect();
  input.setPointer(screenToWorld(event.clientX - rect.left, event.clientY - rect.top, viewport(rect.width, rect.height)));
});
canvas.addEventListener('pointerdown', (event) => {
  if (phase !== 'playing') return;
  if (event.button === 0) input.press('throw');
  if (event.button === 2) input.press('recall');
});
window.addEventListener('pagehide', () => {
  if (mind && !testMode && (phase === 'playing' || phase === 'pause')) saveMemory(storage, mind.memory());
  recordSessionDuration(storage, (performance.now() - sessionStart) / 1000);
});
updateStats(); requestAnimationFrame(frame);
if (testMode) window.__codegame = {
  contractVersion: 1, ready: true, tickRate: CONSTANTS.technical.SIM_HZ,
  reset(seed) {
    if (!Number.isSafeInteger(seed) || seed < 0) throw new RangeError('seed must be a nonnegative integer');
    testSeed = seed; testInputs = []; memorySnapshot = null;
    $('mode').value = 'MODE_B'; $('difficulty').value = 'normal';
    startBout(false, seed);
    this.render();
    return hashWorld(world);
  },
  advance(ticks, inputsByTick = []) {
    if (phase !== 'playing') throw new Error('bout is not playing');
    if (!Number.isSafeInteger(ticks) || ticks < 0 || !Array.isArray(inputsByTick) ||
        inputsByTick.length > ticks) throw new RangeError('invalid advance arguments');
    for (let i = 0; i < ticks && phase === 'playing'; i++) tick(clock.dt, inputsByTick[i] ?? null);
    return { tick: world.tick, hash: hashWorld(world), phase };
  },
  percept(viewer) { return percept(world, viewer, mode); },
  hashWorld() { return hashWorld(world); },
  snapshot() {
    if (testSeed === null) throw new Error('reset first');
    return { seed: testSeed, inputs: structuredClone(testInputs), world: snapshotWorld(world),
      hash: hashWorld(world) };
  },
  restore(state) {
    if (!state || !Array.isArray(state.inputs) || !Number.isSafeInteger(state.seed) ||
        state.inputs.length !== state.world?.tick) throw new TypeError('invalid snapshot');
    this.reset(state.seed);
    this.advance(state.inputs.length, state.inputs);
    if (hashWorld(world) !== state.hash) throw new Error('snapshot replay diverged');
    this.render();
    return hashWorld(world);
  },
  render() { if (phase === 'playing') paint(performance.now());
    return { tick: world.tick, hash: hashWorld(world) }; },
};
