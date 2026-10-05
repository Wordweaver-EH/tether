// Codegame runner: game supplies {CONSTANTS, createWorld, step, percept, hashWorld}.
// Adapter supplies player IDs, score/clock access, and optional metrics.
export function runGameBout({ game, adapter, agents, mode, seed = 1,
  durationSec, log = false, captureTraces = false } = {}) {
  if (!game || !adapter || !Array.isArray(agents) || agents.length !== 2)
    throw new TypeError('game, adapter and two agents are required');
  const hz = adapter.simHz(game.CONSTANTS);
  const dt = 1 / hz;
  const seconds = durationSec ?? adapter.boutSeconds(game.CONSTANTS);
  const world = game.createWorld({ seed });
  const metricState = adapter.startMetrics?.({ mode, seed, seconds }) ?? null;
  const records = log ? [{ type: 'metadata', mode, seed, durationSec: seconds,
    constants: game.CONSTANTS, initialHash: game.hashWorld(world),
    agentTechnical: agents.map((agent) => agent.settings?.() ?? null),
    ...(game.snapshotWorld ? { initialSnapshot: game.snapshotWorld(world) } : {}) }] : null;
  const ids = adapter.playerIds;
  for (let tick = 0; tick < Math.round(seconds * hz) && !adapter.ended(world); tick++) {
    const views = ids.map((id) => game.percept(world, id, mode));
    const inputs = agents.map((agent, index) =>
      structuredClone(agent.act(structuredClone(views[index]), dt) ?? {}));
    const currentEvents = game.step(world, inputs);
    adapter.observeStep?.(metricState, { world, views, inputs,
      events: currentEvents, dt, mode, tick: tick + 1 });
    if (records) {
      records.push({ type: 'step', tick: tick + 1, inputs, events: currentEvents });
      if ((tick + 1) % Math.max(1, Math.round(hz / 20)) === 0)
        records.push({ type: 'hash', tick: tick + 1, hash: game.hashWorld(world) });
    }
  }
  // Settle the last observed outcome, including the terminal scoring step.
  // Optional for scripted agents; minds expose an idempotent finish hook.
  agents.forEach((agent, index) => agent.finish?.(
    structuredClone(game.percept(world, ids[index], mode))));
  const traces = captureTraces ? agents.map((agent) => agent.trace?.() ?? []) : null;
  if (records && traces) {
    for (let i = 0; i < 2; i++) {
      for (const trace of traces[i]) records.push({ type: 'mindTrace',
        player: ids[i], tick: Math.round(trace.time * hz), trace });
    }
  }
  return { score: adapter.score(world), elapsedSec: adapter.elapsed(world),
    metrics: adapter.finishMetrics?.(metricState, world) ?? null,
    ...(records ? { log: records } : {}),
    ...(traces ? { traces: Object.fromEntries(ids.map((id, i) => [id, traces[i]])) } : {}) };
}

export function replayGameLog(game, adapter, records) {
  const meta = records[0];
  if (meta?.type !== 'metadata') throw new Error('missing metadata');
  const world = meta.initialSnapshot && game.restoreWorld ?
    game.restoreWorld(meta.initialSnapshot) : game.createWorld({ seed: meta.seed });
  if (game.hashWorld(world) !== meta.initialHash) throw new Error('initial hash mismatch');
  let verified = 0;
  for (const record of records.slice(1)) {
    if (record.type === 'step') game.step(world, record.inputs);
    if (record.type === 'hash') {
      if (game.hashWorld(world) !== record.hash) throw new Error(`hash mismatch at ${record.tick}`);
      verified++;
    }
  }
  return { score: adapter.score(world), verified, finalHash: game.hashWorld(world) };
}
