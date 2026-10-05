// Held-out geometry construction only. No policy, mind, or outcome imports.
import { createHash } from 'node:crypto';
import { createWorld, step } from '../../src/sim.js';
import { percept, isVisible } from '../../src/perception.js';
import { hasLineOfSight } from '../../src/visibility.js';

export const SCENE_SPEC = Object.freeze({
  version: 'occluded-search-v1', constructionSeed: '2026-10-05-heldout-geometry-8f19c72b',
  sceneCount: 32, independentGeometryClusters: 16,
  simulationHz: 120, decisionTicks: 4, latencyTicks: 18,
  visibleApproachTicks: 72, searchTicks: 240, revealClearance: 0.55,
});
const unit = p => { const d = Math.hypot(p.x, p.y); return { x: p.x / d, y: p.y / d }; };
const copy = p => ({ x: p.x, y: p.y });
const draw = (key, lane) => createHash('sha256')
  .update(JSON.stringify([SCENE_SPEC.constructionSeed, key, lane])).digest().readUInt32BE(0) / 2 ** 32;

export function createSceneWorld(scene) {
  const world = createWorld({ gameMode: 'COVER_CONTROL' });
  const own = world.players[scene.observerIndex], target = world.players[scene.targetIndex];
  own.position = copy(scene.observerPosition); target.position = copy(scene.targetStart);
  own.facing = copy(scene.setupFacing);
  target.facing = unit({ x: target.position.x - own.position.x, y: target.position.y - own.position.y });
  for (let index = 0; index < 2; index++) {
    world.spears[index].position = copy(world.players[index].position);
    world.spears[index].direction = copy(world.players[index].facing);
  }
  return world;
}

// These are evaluator/setup functions, never controller inputs. After release,
// only scriptedTargetInput is applied; the observer is controlled normally.
export function scriptedTargetInput(scene, tick) {
  return { moveX: 0, moveY: tick < scene.targetStopTick ? scene.travelSign : 0,
    aimX: scene.targetFacing.x, aimY: scene.targetFacing.y, throw: false, recall: false };
}
export function setupObserverInput(scene, world) {
  return { moveX: 0, moveY: 0,
    aimX: scene.setupFacing.x, aimY: scene.setupFacing.y,
    throw: false, recall: false };
}

function radiusClear(p, world, epsilon = 1e-7) {
  const radius = world.experiment.PLAYER_RADIUS, b = world.experiment.ARENA;
  return p.x >= b.minX + radius - epsilon && p.x <= b.maxX - radius + epsilon &&
    p.y >= b.minY + radius - epsilon && p.y <= b.maxY - radius + epsilon &&
    world.experiment.OBSTACLES.every(o => p.x <= o.minX - radius + epsilon ||
      p.x >= o.maxX + radius - epsilon || p.y <= o.minY - radius + epsilon ||
      p.y >= o.maxY + radius - epsilon);
}

/** Physics/geometry checks only. Does not construct, run, or score any policy. */
export function validateSceneGeometry(scene) {
  const world = createSceneWorld(scene), obstacles = world.experiment.OBSTACLES;
  let firstOccludedTick = null, firstMissingSampleTick = null, visibleSamples = 0;
  let legal = true, targetMotionError = 0, coneAtOcclusion = false;
  for (let tick = 0; tick <= 360; tick++) {
    const own = world.players[scene.observerIndex], target = world.players[scene.targetIndex];
    legal &&= radiusClear(own.position, world) && radiusClear(target.position, world);
    const expectedY = scene.targetStart.y + scene.travelSign * 4 * Math.min(tick, scene.targetStopTick) / 120;
    targetMotionError = Math.max(targetMotionError, Math.abs(target.position.y - expectedY),
      Math.abs(target.position.x - scene.targetStart.x));
    const los = hasLineOfSight(own.position, target.position, obstacles);
    if (!los && firstOccludedTick === null) {
      firstOccludedTick = tick;
      coneAtOcclusion = isVisible(own.position, own.facing, target.position);
    }
    if (tick % SCENE_SPEC.decisionTicks === 0) {
      const view = percept(world, scene.seat, 'MODE_B');
      if (firstMissingSampleTick === null && view.opponent) visibleSamples++;
      else if (firstMissingSampleTick === null) firstMissingSampleTick = tick;
    }
    if (tick < 360) {
      const inputs = [{}, {}];
      inputs[scene.observerIndex] = setupObserverInput(scene, world);
      inputs[scene.targetIndex] = scriptedTargetInput(scene, tick);
      step(world, inputs);
    }
  }
  const targetFinal = copy(world.players[scene.targetIndex].position);
  const releaseTick = firstMissingSampleTick === null ? null : firstMissingSampleTick + SCENE_SPEC.latencyTicks;
  const expanded = obstacles.map(o => ({ ...o, minX: o.minX - 0.35,
    maxX: o.maxX + 0.35, minY: o.minY - 0.35, maxY: o.maxY + 0.35 }));
  const revealVisible = hasLineOfSight(scene.revealPoint, targetFinal, obstacles);
  const revealReachable = radiusClear(scene.revealPoint, world) &&
    hasLineOfSight(scene.observerPosition, scene.revealPoint, expanded);
  const hiddenAtRest = !hasLineOfSight(scene.observerPosition, targetFinal, obstacles);
  const forcedLossTicks = releaseTick === null || firstOccludedTick === null ? null : releaseTick - firstOccludedTick;
  const valid = legal && targetMotionError < 1e-7 && visibleSamples >= 12 && coneAtOcclusion &&
    firstMissingSampleTick >= firstOccludedTick && firstMissingSampleTick - firstOccludedTick < 4 &&
    forcedLossTicks >= 18 && scene.targetStopTick <= releaseTick &&
    revealVisible && revealReachable && hiddenAtRest;
  return { valid, legal, targetMotionError, firstOccludedTick, firstMissingSampleTick,
    visibleSamples, coneAtOcclusion, releaseTick, forcedLossTicks, revealVisible,
    revealReachable, hiddenAtRest, targetFinal, validationTicks: 360 };
}

export function generateScenes() {
  const template = createWorld({ gameMode: 'COVER_CONTROL' }), scenes = [];
  for (const entrance of ['north', 'south']) for (const observerSide of ['outer', 'inner'])
    for (let replicate = 0; replicate < 4; replicate++) {
      const clusterId = `${entrance}-${observerSide}-${replicate}`;
      const horizontalClearance = 0.90 + 0.45 * draw(clusterId, 0);
      const edgeClearance = 0.42 + 0.08 * draw(clusterId, 1);
      const targetClearance = 0.65 + 0.20 * draw(clusterId, 2);
      for (const [boxIndex, boxId] of ['WEST', 'EAST'].entries()) {
        const box = template.experiment.OBSTACLES.find(o => o.id === boxId);
        const outerSign = boxId === 'WEST' ? -1 : 1;
        const observerSign = observerSide === 'outer' ? outerSign : -outerSign;
        const entranceSign = entrance === 'north' ? -1 : 1, travelSign = -entranceSign;
        const edge = entrance === 'north' ? box.minY : box.maxY;
        const ownFace = observerSign === -1 ? box.minX : box.maxX;
        const targetFace = observerSign === -1 ? box.maxX : box.minX;
        const width = box.maxX - box.minX;
        const tangentDepth = edgeClearance * targetClearance / (width + horizontalClearance);
        const revealTangentDepth = 0.55 * targetClearance / (width + 0.55);
        const stopStepsAfterTangent = Math.max(1,
          Math.floor(0.65 * (revealTangentDepth - tangentDepth) * 120 / 4));
        if (!(stopStepsAfterTangent * 4 / 120 < revealTangentDepth - tangentDepth))
          throw new Error('preregistered geometry has no interior physical stopping tick');
        const observerPosition = { x: ownFace + observerSign * horizontalClearance,
          y: edge + entranceSign * edgeClearance };
        const targetStart = { x: targetFace - observerSign * targetClearance,
          y: edge + travelSign * tangentDepth - travelSign * 2.4 };
        const observerIndex = (replicate + boxIndex) % 2;
        const id = `os1-${clusterId}-${boxId.toLowerCase()}`;
        const scene = { id, clusterId, index: scenes.length,
          seed: Math.floor(draw(id, 'motor-and-mind-seed') * 2 ** 32),
          boxId, entrance, observerSide, replicate, observerIndex, targetIndex: 1 - observerIndex,
          seat: `P${observerIndex + 1}`, observerPosition, targetStart, travelSign,
          setupFacing: { x: -observerSign, y: 0 },
          targetFacing: unit({ x: targetStart.x - observerPosition.x, y: targetStart.y - observerPosition.y }),
          targetStopTick: SCENE_SPEC.visibleApproachTicks + stopStepsAfterTangent,
          revealPoint: { x: ownFace + observerSign * 0.55, y: edge + entranceSign * 0.55 },
          tangentDepth, revealTangentDepth, searchTicks: SCENE_SPEC.searchTicks };
        const geometry = validateSceneGeometry(scene);
        if (!geometry.valid) throw new Error(`invalid preregistered geometry ${id}: ${JSON.stringify(geometry)}`);
        scenes.push({ ...scene, releaseTick: geometry.releaseTick,
          firstOccludedTick: geometry.firstOccludedTick,
          firstMissingSampleTick: geometry.firstMissingSampleTick, geometry });
      }
    }
  if (scenes.length !== SCENE_SPEC.sceneCount) throw new Error('scene count mismatch');
  return scenes;
}

export function scenesDigest(scenes = generateScenes()) {
  return createHash('sha256').update(JSON.stringify(scenes)).digest('hex');
}
