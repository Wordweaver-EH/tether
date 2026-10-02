import { createWorld, step, snapshotWorld, CONSTANTS } from '../src/sim.js';
import { replayFromLog } from '../src/log.js';

export function parseLog(text) {
  const records = (typeof text === 'string' ? text.split(/\r?\n/) : text)
    .filter((line) => line !== '').map((line) => typeof line === 'string' ? JSON.parse(line) : line);
  if (records[0]?.recordType !== 'METADATA') throw new Error('Missing metadata record');
  const verification = replayFromLog(records);
  const samples = records.filter((r) => r.recordType === 'SAMPLE');
  const expectedSamples = Math.floor(verification.world.tick /
    (CONSTANTS.technical.SIM_HZ / CONSTANTS.experiment.STATE_LOG_HZ)) + 1;
  if (samples.length !== expectedSamples || samples.some((r, i) =>
    r.step !== i * (CONSTANTS.technical.SIM_HZ / CONSTANTS.experiment.STATE_LOG_HZ)))
    throw new Error('Missing or out-of-order state samples');
  const metadata = records[0];
  const world = createWorld({ moveDeadzone: metadata.deadzones.move,
    aimDeadzone: metadata.deadzones.aim, epsilon: metadata.epsilon });
  const events = records.filter((r) => r.recordType === 'EVENT');
  const traces = records.filter((r) => r.recordType === 'MIND_TRACE' && r.player === 'P2')
    .map((r) => r.trace).sort((a, b) => a.time - b.time);
  const frames = [{ time: 0, step: 0, world: snapshotWorld(world), sweeps: [] }];
  const inputs = records.filter((r) => r.recordType === 'INPUT');
  let sweeps = [];
  for (let i = 0; i < inputs.length; i += 2) {
    const pair = inputs.slice(i, i + 2);
    if (pair.length !== 2 || pair[0].step !== pair[1].step ||
        !pair.some((r) => r.player === 'P1') || !pair.some((r) => r.player === 'P2'))
      throw new Error(`Malformed input pair at record ${i}`);
    const before = world.spears.map((s) => ({ owner: s.owner, state: s.state, point: { ...s.position } }));
    const mapped = ['P1', 'P2'].map((player) => {
      const r = pair.find((item) => item.player === player);
      return { moveX: r.raw_move_x, moveY: r.raw_move_y, aimX: r.raw_aim_x,
        aimY: r.raw_aim_y, throw: r.throw_pressed, recall: r.recall_pressed };
    });
    const simulatedEvents = step(world, mapped);
    for (let s = 0; s < 2; s++) {
      const after = world.spears[s];
      const ownEvent = (type) => simulatedEvents.find((event) => event.type === type &&
        (event.owner ?? event.player ?? event.attacker) === after.owner);
      const launch = ownEvent('THROW');
      const moving = ['OUTBOUND', 'RETURNING'].includes(before[s].state) ||
        launch || ownEvent('RECALL_START');
      if (moving) {
        const end = ownEvent('HIT')?.hit_pos ?? ownEvent('EMBED')?.position ??
          ownEvent('RECALL_COMPLETE')?.fixed_target ?? after.position;
        sweeps.push({ owner: after.owner, from: launch?.origin ?? before[s].point,
          to: { ...end }, state: before[s].state === 'RETURNING' ? 'RETURNING' : 'OUTBOUND',
          step: world.tick });
      }
    }
    if (world.tick % (CONSTANTS.technical.SIM_HZ / CONSTANTS.experiment.STATE_LOG_HZ) === 0 || i + 2 === inputs.length) {
      frames.push({ time: world.elapsedSec, step: world.tick, world: snapshotWorld(world), sweeps });
      sweeps = [];
    }
  }
  const jumps = events.filter((r) => ['HIT', 'EMBED', 'RECALL_START', 'RECALL_COMPLETE', 'SPEAR_NEUTRALIZED'].includes(r.type))
    .map((r) => ({ time: r.timestamp, label: r.type.replaceAll('_', ' '), type: r.type }));
  for (let i = 1; i < traces.length - 1; i++) {
    const value = traces[i].surprise ?? 0;
    if (value >= 5 && value >= (traces[i - 1].surprise ?? 0) && value > (traces[i + 1].surprise ?? 0))
      jumps.push({ time: traces[i].time, label: 'SURPRISE SPIKE', type: 'SURPRISE' });
  }
  for (const row of traces) if (row.ignition) jumps.push({ time: row.time, label: `IGNITION · ${row.focus ?? 'none'}`, type: 'IGNITION' });
  jumps.sort((a, b) => a.time - b.time);
  return { metadata, verification, frames, traces, events, jumps,
    duration: frames.at(-1).time };
}
export function nearestFrame(frames, time) {
  if (!frames.length) return null;
  let lo = 0, hi = frames.length - 1;
  while (lo < hi) { const mid = Math.floor((lo + hi + 1) / 2);
    if (frames[mid].time <= time) lo = mid; else hi = mid - 1; }
  return frames[lo];
}
export function traceAt(traces, time) {
  if (!traces.length || time < traces[0].time) return null;
  let lo = 0, hi = traces.length - 1;
  while (lo < hi) { const mid = Math.floor((lo + hi + 1) / 2);
    if (traces[mid].time <= time) lo = mid; else hi = mid - 1; }
  return traces[lo];
}
