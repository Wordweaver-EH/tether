import { CONSTANTS, createWorld, step } from './sim.js';
import { percept } from './perception.js';
import { createSessionLogger } from './log.js';

export function runBout({ agents, mode = 'MODE_B', seed = 1,
  durationSec = CONSTANTS.experiment.BOUT_SECONDS, log = false,
  captureTraces = false } = {}) {
  if (!Array.isArray(agents) || agents.length !== 2 ||
      agents.some((agent) => typeof agent?.act !== 'function')) {
    throw new TypeError('agents must contain two objects with act(percept, dt)');
  }
  if (mode !== 'MODE_A' && mode !== 'MODE_B') throw new RangeError('invalid mode');
  if (!Number.isFinite(durationSec) || durationSec < 0 ||
      durationSec > CONSTANTS.experiment.BOUT_SECONDS) {
    throw new RangeError('durationSec must be between 0 and 300');
  }
  const dt = 1 / CONSTANTS.technical.SIM_HZ;
  const ticks = Math.round(durationSec * CONSTANTS.technical.SIM_HZ);
  const world = createWorld();
  const logger = log ? createSessionLogger({ world, mode, seed }) : null;
  if (logger) logger.records[0].agent_technical = agents.map((agent) =>
    agent.settings?.() ?? null);
  const events = [];
  for (let tick = 0; tick < ticks && !world.ended; tick++) {
    // Clone across the agent boundary so neither a view nor returned input
    // shares object references with the simulation.
    const inputs = agents.map((agent, index) =>
      structuredClone(agent.act(structuredClone(percept(world, `P${index + 1}`, mode)), dt) ?? {}));
    const currentEvents = step(world, inputs);
    for (const event of currentEvents) {
      events.push({ ...event, step: world.tick, timestamp: world.elapsedSec });
    }
    logger?.recordStep(world, inputs, currentEvents);
  }
  const traces = captureTraces ? agents.map((agent) => agent.trace?.() ?? []) : null;
  if (logger && traces) {
    for (let index = 0; index < traces.length; index++) {
      for (const trace of traces[index]) logger.records.push({
        recordType: 'MIND_TRACE', mode, player: `P${index + 1}`,
        step: Math.round(trace.time / dt), timestamp: trace.time, trace,
      });
    }
  }
  return {
    score: { P1: world.players[0].score, P2: world.players[1].score },
    events,
    elapsedSec: world.elapsedSec,
    winner: world.players[0].score === world.players[1].score ? null :
      world.players[0].score > world.players[1].score ? 'P1' : 'P2',
    ...(traces ? { traces: { P1: traces[0], P2: traces[1] } } : {}),
    ...(logger ? { logLines: logger.lines() } : {}),
  };
}
