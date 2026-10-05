// Opt-in rules. The original Duel constants and state shape stay untouched.
export const COVER_CONTROL = Object.freeze({
  OBSTACLES: Object.freeze([
    Object.freeze({ id: 'WEST', minX: -3.8, maxX: -2.8, minY: -1, maxY: 2.2 }),
    Object.freeze({ id: 'EAST', minX: 2.8, maxX: 3.8, minY: -1, maxY: 2.2 }),
    Object.freeze({ id: 'SOUTH', minX: -1.3, maxX: 1.3, minY: 1.4, maxY: 2.2 }),
  ]),
  OBJECTIVE: Object.freeze({ id: 'CONTROL', position: Object.freeze({ x: 0, y: 0 }),
    radius: 1.05, holdTicksRequired: 240 }),
});

export function emptyControl() {
  return { controller: null, contested: false, holdTicks: 0 };
}

export function stepControl(world, hadHit, events) {
  if (world.gameMode !== 'COVER_CONTROL') return;
  // A spear hit already awards its point and resets both players. No ring
  // award can occur on that tick, even if a hold was one tick from complete.
  if (hadHit) { world.objective = emptyControl(); return; }
  const spec = world.experiment.OBJECTIVE;
  const inside = world.players.filter(({ position }) =>
    (position.x - spec.position.x) ** 2 + (position.y - spec.position.y) ** 2 <= spec.radius ** 2);
  const controller = inside.length === 1 ? inside[0].id : null;
  const state = world.objective;
  state.holdTicks = controller ? (state.controller === controller ? state.holdTicks : 0) + 1 : 0;
  state.controller = controller;
  state.contested = inside.length === 2;
  if (state.holdTicks === spec.holdTicksRequired) {
    inside[0].score++;
    state.holdTicks = 0;
    events.push({ type: 'CONTROL_POINT', player: controller, objective: spec.id,
      scores: { P1: world.players[0].score, P2: world.players[1].score } });
  }
}
