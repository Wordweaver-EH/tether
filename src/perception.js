import { CONSTANTS } from './sim.js';
import { hasLineOfSight } from './visibility.js';

const E = CONSTANTS.experiment;
const copy = (point) => ({ x: point.x, y: point.y });

export function isVisible(viewerPos, viewerFacing, targetPos) {
  const dx = targetPos.x - viewerPos.x;
  const dy = targetPos.y - viewerPos.y;
  const distanceSquared = dx * dx + dy * dy;
  if (distanceSquared === 0) return true;
  const facingSquared = viewerFacing.x ** 2 + viewerFacing.y ** 2;
  if (facingSquared === 0) throw new RangeError('viewerFacing must be nonzero');
  const projection = viewerFacing.x * dx + viewerFacing.y * dy;
  // cos(60°)^2 = 1/4. Squaring avoids an absolute distance allowance.
  return projection >= 0 && 4 * projection * projection >= facingSquared * distanceSquared;
}

export function pointVisible(world, viewer, target, mode = 'MODE_B') {
  return mode === 'MODE_A' || (isVisible(viewer.position, viewer.facing, target) &&
    (world.gameMode !== 'COVER_CONTROL' ||
      hasLineOfSight(viewer.position, target, world.experiment.OBSTACLES)));
}

function spearView(spear, own) {
  const view = {
    state: spear.state,
    position: copy(spear.position),
    direction: copy(spear.direction),
  };
  if (own) {
    view.embedSurfaceId = spear.embedSurfaceId;
    view.recallTarget = spear.recallTarget ? copy(spear.recallTarget) : null;
  }
  return view;
}

export function percept(world, viewerId, mode) {
  if (mode !== 'MODE_A' && mode !== 'MODE_B') throw new RangeError('mode must be MODE_A or MODE_B');
  const index = viewerId === 'P1' ? 0 : viewerId === 'P2' ? 1 : -1;
  if (index < 0) throw new RangeError('viewerId must be P1 or P2');
  const E = world.experiment ?? CONSTANTS.experiment;
  const own = world.players[index];
  const enemy = world.players[1 - index];
  const ownSpear = world.spears[index];
  const enemySpear = world.spears[1 - index];
  const bodyVisible = pointVisible(world, own, enemy.position, mode);
  const ownSpearVisible = mode === 'MODE_A' || ownSpear.state === 'HELD' ||
    pointVisible(world, own, ownSpear.position, mode);
  const spearVisible = mode === 'MODE_A' || (enemySpear.state === 'HELD'
    ? bodyVisible : pointVisible(world, own, enemySpear.position, mode));
  return {
    viewerId, mode,
    ...(world.gameMode ? { gameMode: world.gameMode,
      // The beacon's coarse controller/contest/progress is public to both
      // actors. It never reports an unseen actor's exact position or facing.
      objective: { ...E.OBJECTIVE, position: copy(E.OBJECTIVE.position), ...world.objective } } : {}),
    own: {
      position: copy(own.position), facing: copy(own.facing),
      velocity: copy(own.velocity),
      spear: ownSpearVisible ? spearView(ownSpear, true) : null,
    },
    scores: { P1: world.players[0].score, P2: world.players[1].score },
    time: { elapsedSec: world.elapsedSec, remainingSec: world.remainingSec,
      ended: world.ended },
    arena: {
      bounds: { ...E.ARENA },
      obstacles: E.OBSTACLES.map((obstacle) => ({ ...obstacle })),
    },
    opponent: bodyVisible ? {
      position: copy(enemy.position), facing: copy(enemy.facing),
      velocity: copy(enemy.velocity),
    } : null,
    opponentSpear: spearVisible ? spearView(enemySpear, mode === 'MODE_A') : null,
    cone: { halfAngleRad: E.FOV_HALF_ANGLE_RAD,
      totalAngleRad: 2 * E.FOV_HALF_ANGLE_RAD,
      origin: copy(own.position), facing: copy(own.facing),
      occlusion: world.gameMode === 'COVER_CONTROL' && mode === 'MODE_B', maxDistance: null },
  };
}
