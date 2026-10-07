import { cognitionReadouts, adaptationReadouts, counterfactualReadout } from '../client/mind-readouts.mjs';
import { CONSTANTS } from '../src/sim.js';
import { parseLog, nearestFrame, traceAt } from './log-data.mjs';
import { PALETTE, prepareCanvas, beginWorld, drawArena, drawCone,
  drawObjective, drawWorldEntities } from '../client/canvas.mjs';
import { objectiveStatus } from '../client/cover-display.mjs';

const $ = (id) => document.getElementById(id);
const colors = { Hunt: '#70dfc1', Threat: '#ed967c', Anchor: '#d1ba7a',
  Contest: '#b79be3', Search: '#81afd5', Deceive: '#dd9dcd', Utility: '#b4c4c8' };
let data = null, time = 0, playing = false, lastNow = null, lastFrame = null, lastTrace = null;
const layers = Object.fromEntries([...document.querySelectorAll('[data-layer]')].map((el) => [el.dataset.layer, el.checked]));
const fmt = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}.${String(Math.floor(t * 100 % 100)).padStart(2, '0')}`;
function jumpTo(t) { time = Math.max(0, Math.min(data?.duration ?? 0, t)); lastFrame = null; lastTrace = null; update(); }
function drawBelief(ctx, trace) {
  const b = trace?.belief; if (!b?.mean) return;
  const confidence = trace.confidence?.opponent ?? 0;
  const color = confidence > 0.67 ? '#70dfc1' : confidence > 0.33 ? '#d7c77b' : '#ed967c';
  ctx.fillStyle = color; ctx.globalAlpha = 0.35 + confidence * 0.35;
  for (const p of b.particles ?? []) { ctx.beginPath(); ctx.arc(p.x, p.y, 0.055, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  const { xx = 0, xy = 0, yy = 0 } = b.covariance ?? {};
  const angle = 0.5 * Math.atan2(2 * xy, xx - yy);
  const delta = Math.sqrt(Math.max(0, (xx - yy) ** 2 + 4 * xy ** 2));
  const major = Math.sqrt(Math.max(0.0001, (xx + yy + delta) / 2)) * 2;
  const minor = Math.sqrt(Math.max(0.0001, (xx + yy - delta) / 2)) * 2;
  ctx.beginPath(); ctx.ellipse(b.mean.x, b.mean.y, major, minor, angle, 0, Math.PI * 2);
  ctx.strokeStyle = color; ctx.lineWidth = 0.045; ctx.stroke();
  ctx.beginPath(); ctx.arc(b.mean.x, b.mean.y, 0.11, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
}
function drawReplay(frame, trace) {
  const { ctx, vp, width, height } = prepareCanvas($('arena'));
  beginWorld(ctx, vp, width, height);
  const w = frame.world;
  const experiment = w.experiment ?? CONSTANTS.experiment;
  const arena = { bounds: experiment.ARENA, obstacles: experiment.OBSTACLES };
  const cover = w.gameMode === 'COVER_CONTROL';
  drawArena(ctx, arena);
  if (layers.cones) for (const p of w.players) drawCone(ctx, {
    origin: p.position, facing: p.facing, halfAngleRad: CONSTANTS.experiment.FOV_HALF_ANGLE_RAD,
    occlusion: cover && data.metadata.mode === 'MODE_B',
  }, PALETTE[p.id], 0.075, arena);
  if (layers.humanCone && trace?.opponentCone) drawCone(ctx, {
    ...trace.opponentCone, halfAngleRad: CONSTANTS.experiment.FOV_HALF_ANGLE_RAD,
  }, '#f2d378', 0.065 * (trace.opponentCone.confidence ?? 1));
  if (layers.recall) for (const s of w.spears) if (s.state === 'RETURNING' && s.recallTarget) {
    ctx.beginPath(); ctx.moveTo(s.position.x, s.position.y);
    ctx.lineTo(s.recallTarget.x, s.recallTarget.y);
    ctx.setLineDash([0.09, 0.09]); ctx.strokeStyle = PALETTE[s.owner]; ctx.globalAlpha = 0.65;
    ctx.lineWidth = 0.035; ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(s.recallTarget.x, s.recallTarget.y, 0.12, 0, Math.PI * 2); ctx.stroke();
  }
  if (layers.sweeps) for (const segment of frame.sweeps) {
    ctx.beginPath(); ctx.moveTo(segment.from.x, segment.from.y); ctx.lineTo(segment.to.x, segment.to.y);
    ctx.strokeStyle = PALETTE[segment.owner]; ctx.globalAlpha = 0.38; ctx.lineWidth = 0.035; ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (cover) drawObjective(ctx, { ...experiment.OBJECTIVE, ...w.objective });
  if (layers.belief) drawBelief(ctx, trace);
  if (layers.world) drawWorldEntities(ctx, w.players, w.spears);
  ctx.restore();
}
function addReadout(parent, label, value) {
  const div = document.createElement('div'); div.append(document.createTextNode(`${label} `));
  const strong = document.createElement('strong'); strong.textContent = value; div.append(strong); parent.append(div);
}
function drawAffect(trace) {
  const canvas = $('affect'); const { ctx, width, height } = prepareCanvas(canvas);
  ctx.clearRect(0, 0, width, height); ctx.strokeStyle = '#2e4851'; ctx.lineWidth = 1;
  for (const y of [0.2, 0.5, 0.8]) { ctx.beginPath(); ctx.moveTo(0, height * y); ctx.lineTo(width, height * y); ctx.stroke(); }
  if (!trace) return;
  const start = Math.max(0, time - 12), end = Math.max(start + 0.1, time);
  const rows = data.traces.filter((r) => r.time >= start && r.time <= end);
  for (const [key, color, map] of [
    ['arousal', '#ed967c', (r) => r.affect?.arousal ?? 0],
    ['valence', '#70dfc1', (r) => ((r.affect?.valence ?? 0) + 1) / 2],
    ['surprise', '#d1ba7a', (r) => Math.min(1, (r.surprise ?? 0) / 20)],
  ]) {
    ctx.beginPath(); rows.forEach((r, i) => {
      const x = (r.time - start) / (end - start) * width;
      const y = height - 4 - map(r) * (height - 8);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }); ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
  }
}
function latestField(key, t) {
  for (let i = data.traces.length - 1; i >= 0; i--) {
    const row = data.traces[i];
    if (row.time <= t && row[key]) return row[key];
  }
  return null;
}
function recentSpeech(t) {
  const lines = [];
  for (let i = data.traces.length - 1; i >= 0 && lines.length < 3; i--) {
    const row = data.traces[i];
    if (row.time <= t && row.innerSpeech) lines.push(`${fmt(row.time)}  ${row.innerSpeech}`);
  }
  return lines.reverse().join('\n') || '—';
}
function updateSide(trace, frame) {
  const world = frame.world, cover = world.gameMode === 'COVER_CONTROL';
  const coverController = data.metadata.agent_technical?.[1]?.controller;
  const integratedMind = cover && coverController === 'cover-integrated-mind-v1';
  const coverMind = cover && ['cover-existing-mind-v1', 'cover-integrated-mind-v1'].includes(coverController);
  $('focus').textContent = integratedMind ? `Integrated mind (experimental) · ${trace?.focus ?? 'No focus'}`
    : coverMind ? `Existing mind (experimental) · ${trace?.focus ?? 'No focus'}`
    : cover ? 'Cover Control · baseline NPC' : trace?.focus ?? 'No focus';
  $('traceTime').textContent = cover
    ? `P1 ${world.players[0].score} : ${world.players[1].score} P2 · ${objectiveStatus({ ...world.experiment.OBJECTIVE, ...world.objective }, { P1: 'P1', P2: 'P2' })}`
    : trace ? `Cognitive cycle ${fmt(trace.time)}` : '';
  if (integratedMind) $('traceTime').textContent += ` · Competing ring/threat/search goals; bounded planning and session-only procedural route cache.${trace ? ` Cognitive cycle ${fmt(trace.time)}` : ''}`;
  else if (coverMind) $('traceTime').textContent += ` · Existing hunt/search policy, not yet taught ring capture.${trace ? ` Cognitive cycle ${fmt(trace.time)}` : ''}`;
  for (const [id, rows] of [['cognition', cognitionReadouts(trace)], ['adaptation', adaptationReadouts(trace)]]) {
    $(id).replaceChildren();
    for (const [label, value] of rows) addReadout($(id), label, value);
  }
  $('ignition').textContent = trace?.ignition ? '✦ IGNITION' : '';
  const bars = $('saliences'); bars.replaceChildren(); bars.classList.remove('empty');
  if (!trace) {
    bars.textContent = coverMind ? 'No recorded mind trace at this time. This experimental opponent starts fresh each bout.'
      : cover ? 'Deterministic, percept-only baseline. This opponent does not produce a mind trace or learn across bouts.' : 'No mind trace at this time.';
    drawAffect(null); $('readouts').replaceChildren(); $('confidence').replaceChildren();
    $('speech').textContent = '—'; $('counterfactual').textContent = '—';
    return;
  }
  for (const [name, value] of Object.entries(trace.saliences ?? {})) {
    const row = document.createElement('div'); row.className = `barrow${name === trace.focus ? ' active' : ''}`;
    const label = document.createElement('span'); label.textContent = name;
    const track = document.createElement('div'); track.className = 'track';
    const fill = document.createElement('div'); fill.className = 'fill'; fill.style.width = `${Math.min(100, Math.max(0, value * 100))}%`; track.append(fill);
    const output = document.createElement('output'); output.textContent = Number(value).toFixed(2);
    row.append(label, track, output); bars.append(row);
  }
  drawAffect(trace);
  const readouts = $('readouts'); readouts.replaceChildren();
  addReadout(readouts, 'Arousal', (trace.affect?.arousal ?? 0).toFixed(2));
  addReadout(readouts, 'Valence', (trace.affect?.valence ?? 0).toFixed(2));
  addReadout(readouts, 'Surprise', (trace.surprise ?? 0).toFixed(2));
  addReadout(readouts, 'Mood', (trace.affect?.confidenceMood ?? 0).toFixed(2));
  const conf = $('confidence'); conf.replaceChildren();
  for (const [label, value] of [['Opponent', trace.confidence?.opponent ?? 0], ['Spear', trace.confidence?.spear ?? 0]]) {
    const row = document.createElement('div'); row.className = 'row';
    const span = document.createElement('span'); span.textContent = label;
    const amount = document.createElement('b'); amount.textContent = `${Math.round(value * 100)}%`; span.append(amount);
    const meter = document.createElement('meter'); meter.min = 0; meter.max = 1; meter.value = value;
    row.append(span, meter); conf.append(row);
  }
  $('speech').textContent = recentSpeech(time);
  const note = latestField('counterfactualNote', time);
  $('counterfactual').textContent = counterfactualReadout(trace, note);
}
function drawTimeline() {
  const canvas = $('timeline'); const { ctx, width, height } = prepareCanvas(canvas);
  ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#1a3039'; ctx.fillRect(0, 5, width, 24);
  if (!data?.duration) return;
  for (let x = 0; x < width; x++) {
    const focus = traceAt(data.traces, x / width * data.duration)?.focus;
    ctx.fillStyle = colors[focus] ?? '#34505b'; ctx.fillRect(x, 5, 1.5, 24);
  }
  ctx.fillStyle = '#e8e4d8';
  for (const event of data.jumps) if (event.type !== 'IGNITION') {
    const x = event.time / data.duration * width; ctx.fillRect(x, 0, 1, 36);
  }
  const x = time / data.duration * width;
  ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, 0, 2, height);
}
function update() {
  if (!data) return;
  const frame = nearestFrame(data.frames, time), trace = traceAt(data.traces, time);
  if (frame !== lastFrame || trace !== lastTrace) {
    drawReplay(frame, trace); updateSide(trace, frame); drawTimeline();
    lastFrame = frame; lastTrace = trace;
  }
  $('scrub').value = String(time); $('clock').textContent = `${fmt(time)} / ${fmt(data.duration)}`;
  $('timelineTime').textContent = fmt(time);
}
function animate(now) {
  if (playing && data && lastNow !== null) {
    time = Math.min(data.duration, time + Math.max(0, (now - lastNow) / 1000) * Number($('speed').value));
    if (time >= data.duration) { playing = false; $('play').textContent = '▶'; }
    update();
  }
  lastNow = now; requestAnimationFrame(animate);
}
async function loadFile(file) {
  if (!file) return;
  playing = false; $('play').textContent = '▶';
  try {
    data = parseLog(await file.text()); time = 0; lastFrame = null; lastTrace = null;
    $('verification').textContent = `VERIFIED · ${data.verification.verifiedSamples} SAMPLES`;
    $('verification').className = 'good'; $('drop').hidden = true;
    $('scrub').max = String(data.duration);
    const jump = $('jump'); jump.replaceChildren(new Option('Select an event…', ''));
    data.jumps.forEach((event, index) => jump.add(new Option(`${fmt(event.time)} · ${event.label}`, String(index))));
    update();
  } catch (error) {
    data = null; $('verification').textContent = `NOT VERIFIED · ${error.message}`;
    $('verification').className = 'bad'; $('drop').hidden = false;
  }
}
$('file').addEventListener('change', (event) => loadFile(event.target.files[0]));
const target = document.querySelector('.canvas-wrap');
target.addEventListener('dragover', (event) => { event.preventDefault(); target.classList.add('drag'); });
target.addEventListener('dragleave', () => target.classList.remove('drag'));
target.addEventListener('drop', (event) => { event.preventDefault(); target.classList.remove('drag'); loadFile(event.dataTransfer.files[0]); });
$('play').addEventListener('click', () => { if (!data) return; if (time >= data.duration) jumpTo(0);
  playing = !playing; $('play').textContent = playing ? 'Ⅱ' : '▶'; lastNow = null; });
$('back').addEventListener('click', () => { if (data) jumpTo(nearestFrame(data.frames, time - 0.0001)?.time ?? 0); });
$('forward').addEventListener('click', () => { if (!data) return;
  const next = data.frames.find((frame) => frame.time > time + 0.0001); jumpTo(next?.time ?? data.duration); });
$('scrub').addEventListener('input', (event) => { playing = false; $('play').textContent = '▶'; jumpTo(Number(event.target.value)); });
$('jump').addEventListener('change', (event) => { if (event.target.value !== '') jumpTo(data.jumps[Number(event.target.value)].time); });
document.querySelectorAll('[data-layer]').forEach((el) => el.addEventListener('change', () => {
  layers[el.dataset.layer] = el.checked; lastFrame = null; update();
}));
$('timeline').addEventListener('pointerdown', (event) => { if (!data) return;
  const rect = event.currentTarget.getBoundingClientRect(); jumpTo((event.clientX - rect.left) / rect.width * data.duration); });
window.addEventListener('resize', () => { lastFrame = null; update(); });
requestAnimationFrame(animate);
