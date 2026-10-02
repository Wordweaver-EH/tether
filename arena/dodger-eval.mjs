import { createWorld, step, CONSTANTS } from '../src/sim.js';
import { percept } from '../src/perception.js';
import { reactiveDodger } from '../src/agents/dodger.mjs';
import { directShooter } from '../src/agents/strategies.mjs';
import { wilson } from './search.mjs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// First engagement, varied initial lateral offsets, both seats. Count shots as
// well as bouts so long-range misses cannot hide behind a win-rate summary.
export function evaluateDodger({ samples = 40, seconds = 12,
  distances = [3, 5, 8, 11] } = {}) {
  const rows = [];
  for (const distance of distances) for (const defender of ['dodger', 'idle']) {
    let shots = 0, hits = 0, boutsHit = 0, exposures = 0;
    for (let k = 0; k < samples; k++) {
      const shooterIndex = k % 2, world = createWorld();
      const offset = (((k * 37) % samples) / samples - 0.5) * 0.5;
      const lane = distance <= 5 ? 4 : 0;
      world.players[0].position = { x: -distance / 2, y: lane + offset };
      world.players[1].position = { x: distance / 2, y: lane - offset };
      world.spears[0].position = { ...world.players[0].position };
      world.spears[1].position = { ...world.players[1].position };
      const defence = defender === 'dodger' ? reactiveDodger() : { act: () => ({}) };
      const agents = shooterIndex === 0 ? [directShooter(), defence] :
        [defence, directShooter()];
      let boutHit = false;
      for (let tick = 0; tick < seconds * CONSTANTS.technical.SIM_HZ; tick++) {
        const views = ['P1', 'P2'].map((id) => percept(world, id, 'MODE_B'));
        const events = step(world, agents.map((agent, i) => agent.act(views[i], 1 / 120)));
        shots += events.filter((e) => e.type === 'THROW' &&
          e.player === `P${shooterIndex + 1}`).length;
        if (events.some((e) => e.type === 'HIT' &&
            e.attacker === `P${shooterIndex + 1}`)) {
          hits++; boutHit = true; break;
        }
      }
      exposures++;
      if (boutHit) boutsHit++;
    }
    rows.push({ distance, defender, samples: exposures, shots, hits,
      hitPerShot: wilson(Array.from({ length: shots }, (_, i) => i < hits ? 1 : 0)),
      boutHit: wilson(Array.from({ length: exposures }, (_, i) => i < boutsHit ? 1 : 0)) });
  }
  return rows;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(evaluateDodger(), null, 2));
