const EMPTY = () => ({ moveX: 0, moveY: 0, aimX: 0, aimY: 0, throw: false, recall: false });
export function keyMovement(keys) {
  const has = (key) => keys.has(key);
  return { moveX: Number(has('KeyD')) - Number(has('KeyA')),
    moveY: Number(has('KeyS')) - Number(has('KeyW')) };
}
export function aimFromPointer(pointer, player) {
  if (!pointer || !player) return { aimX: 0, aimY: 0 };
  return { aimX: pointer.x - player.x, aimY: pointer.y - player.y };
}
export function mapInput({ keys, pointer, player, presses, gamepad = null }) {
  const input = { ...EMPTY(), ...keyMovement(keys), ...aimFromPointer(pointer, player) };
  if (gamepad) {
    const dead = (v) => Math.abs(v ?? 0) > 0.18 ? v : 0;
    const x = dead(gamepad.axes?.[0]), y = dead(gamepad.axes?.[1]);
    if (x || y) { input.moveX = x; input.moveY = y; }
    const ax = dead(gamepad.axes?.[2]), ay = dead(gamepad.axes?.[3]);
    if (ax || ay) { input.aimX = ax; input.aimY = ay; }
    input.throw = !!gamepad.buttons?.[7]?.pressed;
    input.recall = !!gamepad.buttons?.[6]?.pressed;
  }
  input.throw ||= !!presses.throw;
  input.recall ||= !!presses.recall;
  return input;
}
export function createInputState() {
  const keys = new Set();
  let pointer = null;
  let presses = { throw: false, recall: false };
  let priorPad = { throw: false, recall: false };
  return {
    keys,
    setPointer(p) { pointer = p; },
    press(action) { if (action in presses) presses[action] = true; },
    releaseAll() { keys.clear(); presses = { throw: false, recall: false }; },
    take(player, gamepad) {
      const result = mapInput({ keys, pointer, player, presses, gamepad });
      const padThrow = !!gamepad?.buttons?.[7]?.pressed;
      const padRecall = !!gamepad?.buttons?.[6]?.pressed;
      result.throw = !!presses.throw || (padThrow && !priorPad.throw);
      result.recall = !!presses.recall || (padRecall && !priorPad.recall);
      priorPad = { throw: padThrow, recall: padRecall };
      presses = { throw: false, recall: false };
      return result;
    },
  };
}
