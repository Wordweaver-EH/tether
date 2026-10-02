// Same deterministic input sequence in browser and Node. No agent/mind libm:
// raw-input replay verifies the simulation, not regeneration of NPC decisions.
import { createWorld, step, hashWorld } from '../src/sim.js';
import { createSessionLogger } from '../src/log.js';
export function replayProbe({ ticks = 3600, mode = 'MODE_B', experiment = {} } = {}) {
  const world = createWorld({ experiment });
  const logger = createSessionLogger({ world, mode, timestampStart: '2026-10-01T00:00:00.000Z',
    sessionId: 'cross-runtime-probe', buildId: 'deterministic-math-v1', seed: 739 });
  let seed = 739;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  let aims = [{ aimX: -1, aimY: 0 }, { aimX: 1, aimY: -0 }];
  for (let i = 0; i < ticks; i++) {
    if (i % 31 === 0) aims = aims.map(() => ({ aimX: random() * 2 - 1, aimY: random() * 2 - 1 }));
    const inputs = aims.map((aim, p) => ({ ...aim,
      moveX: ((i + p * 37) % 97) / 48 - 1,
      moveY: ((i * 3 + p * 23) % 89) / 44 - 1,
      throw: i % 53 === p, recall: i % 67 === p }));
    logger.recordStep(world, inputs, step(world, inputs));
  }
  return { log: logger.toJSONL(), finalHash: hashWorld(world) };
}
