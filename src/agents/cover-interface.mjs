import { rng, normal } from '../mind/math.mjs';

// Browser-safe embodiment using the established benchmark timing and motor
// formula. Samples use the existing seeded RNG, not its Node-only SHA-256
// addressing; this is a playable prototype, not a matched benchmark arm.
export const COVER_INTERFACE = Object.freeze({ simulationHz: 120, decisionHz: 30,
  latencySec: 0.15, latencyTicks: 18, decisionTicks: 4,
  baseAimNoise: 0.034, speedAimNoise: 0.0075, maxAimSigma: 0.18 });
const empty = () => ({ moveX: 0, moveY: 0, aimX: 0, aimY: 0, throw: false, recall: false });

export function coverMotorTransform(command, previousAngle, sample) {
  const result = { ...empty(), ...command };
  if (!Math.hypot(result.aimX, result.aimY)) return { command: result, previousAngle, sigma: 0, sample };
  const angle = Math.atan2(result.aimY, result.aimX);
  const delta = Math.atan2(Math.sin(angle - previousAngle), Math.cos(angle - previousAngle));
  const sigma = Math.min(COVER_INTERFACE.maxAimSigma,
    COVER_INTERFACE.baseAimNoise + COVER_INTERFACE.speedAimNoise * Math.abs(delta) * COVER_INTERFACE.decisionHz);
  result.aimX = Math.cos(angle + sample * sigma); result.aimY = Math.sin(angle + sample * sigma);
  return { command: result, previousAngle: angle, sigma, sample };
}

export function createCoverInterface(controller, { seed = 1 } = {}) {
  let tick = 0, previousAngle = 0, held = empty(), random = null;
  const queue = [];
  return {
    settings: () => ({ ...controller.settings(), embodiment: { ...COVER_INTERFACE,
      noise: 'seeded-xorshift-normal-v1' } }),
    act(view, dt = 1 / 120) {
      if (dt !== 1 / 120) throw new RangeError('Cover interface requires 120 Hz');
      random ??= rng((seed ^ (view.viewerId === 'P1' ? 0x53c421 : 0x1f713a)) >>> 0);
      queue.push(structuredClone(view));
      let result = { ...held, throw: false, recall: false };
      if (tick >= COVER_INTERFACE.latencyTicks) {
        const delayed = queue.shift();
        if ((tick - COVER_INTERFACE.latencyTicks) % COVER_INTERFACE.decisionTicks === 0) {
          const transformed = coverMotorTransform(controller.act(delayed, 1 / 30), previousAngle, normal(random));
          previousAngle = transformed.previousAngle; result = transformed.command;
          held = { ...result, throw: false, recall: false };
        }
      }
      tick++;
      return result;
    },
  };
}
