export function createAccumulator({ hz = 120, maxStepsPerFrame = 240 } = {}) {
  if (!(hz > 0) || !(maxStepsPerFrame > 0)) throw new RangeError('invalid clock');
  const dt = 1 / hz;
  let debt = 0;
  return {
    get dt() { return dt; },
    get debt() { return debt; },
    reset() { debt = 0; },
    advance(seconds, update) {
      if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('invalid elapsed time');
      debt += seconds;
      let steps = 0;
      while (debt + 1e-12 >= dt && steps < maxStepsPerFrame) {
        update(dt);
        debt -= dt;
        steps++;
      }
      return steps;
    },
  };
}
