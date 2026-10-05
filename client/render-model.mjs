// The play renderer accepts a percept, never a world. Null means absent on
// screen, including the player's own non-held spear outside the cone.
export function renderModel(view, outerSpeech = null) {
  if (!view?.own || !view?.arena || !view?.cone || !view?.time) throw new TypeError('percept required');
  const ownSpear = view.own.spear;
  return {
    arena: view.arena, scores: view.scores, time: view.time, mode: view.mode,
    cone: view.cone,
    ...(view.gameMode === 'COVER_CONTROL' ? { gameMode: view.gameMode,
      objective: view.objective } : {}),
    players: [{ id: view.viewerId, ...view.own },
      ...(view.opponent ? [{ id: view.viewerId === 'P1' ? 'P2' : 'P1', ...view.opponent }] : [])],
    spears: [...(ownSpear ? [{ owner: view.viewerId, ...ownSpear }] : []),
      ...(view.opponentSpear ? [{ owner: view.viewerId === 'P1' ? 'P2' : 'P1', ...view.opponentSpear }] : [])],
    npcCone: view.opponent ? { origin: view.opponent.position, facing: view.opponent.facing,
      halfAngleRad: view.cone.halfAngleRad, occlusion: view.cone.occlusion } : null,
    outerSpeech: view.opponent ? outerSpeech : null,
  };
}
