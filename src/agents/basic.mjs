const noInput = () => ({ moveX: 0, moveY: 0, aimX: 0, aimY: 0,
  throw: false, recall: false });

export const idle = { act: noInput };

export function randomWalker(seed = 1) {
  let state = (seed >>> 0) || 1;
  let ticks = 0;
  let heading = { x: 1, y: 0 };
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
  return {
    act() {
      if (ticks++ % 30 === 0) {
        const angle = random() * 2 * Math.PI;
        heading = { x: Math.cos(angle), y: Math.sin(angle) };
      }
      return { moveX: heading.x, moveY: heading.y, aimX: heading.x,
        aimY: heading.y, throw: false, recall: false };
    },
  };
}

export function aimAndThrow() {
  let recallClock = 0;
  return {
    act(view, dt) {
      const input = noInput();
      if (view.opponent) {
        input.aimX = view.opponent.position.x - view.own.position.x;
        input.aimY = view.opponent.position.y - view.own.position.y;
      }
      if (view.own.spear.state === 'HELD' && view.opponent) {
        input.throw = true;
        recallClock = 0;
      } else if (view.own.spear.state === 'EMBEDDED') {
        recallClock += dt;
        if (recallClock >= 1) {
          input.recall = true;
          recallClock = 0;
        }
      } else {
        recallClock = 0;
      }
      return input;
    },
  };
}
