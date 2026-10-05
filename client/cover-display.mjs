// The objective is explicitly public. These readouts use its coarse state,
// never a hidden opponent position or a simulation-world entity.
export const COVER_RULES = 'Hold the ring alone for 2 seconds = 1 point, without a reset. Both inside, leaving it empty, or changing holder resets progress. Spear hit = 1 point + reset.';
export const COVER_GUIDE = 'North is shorter and exposed; south is longer and sheltered. Mode B walls block sight. Thrown spears stop at cover; returning spears pass through it. Ring status is public. The baseline NPC has 150ms perception delay, 30Hz decisions and aim noise. It does not learn.';
export const COVER_MIND_GUIDE = 'North is shorter and exposed; south is longer and sheltered. Mode B walls block sight. Thrown spears stop at cover; returning spears pass through it. Ring status is public. Experimental existing hunt/search policy, not yet taught ring capture. It has 150ms perception delay, 30Hz decisions and aim noise. Records actual mind traces; starts fresh each bout, with no saved Duel learning.';

export function objectiveProgress(objective) {
  if (!objective?.holdTicksRequired) return 0;
  return Math.max(0, Math.min(1, objective.holdTicks / objective.holdTicksRequired));
}

export function objectiveStatus(objective, labels = { P1: 'You', P2: 'Baseline NPC' }) {
  if (!objective) return '';
  if (objective.contested) return 'Both inside: progress resets';
  if (!objective.controller) return 'Ring open · hold alone for 2 seconds';
  return `${labels[objective.controller]} holding · ${Math.floor(objectiveProgress(objective) * 100)}%`;
}

// Ray/box intersections are for drawing only. Gameplay visibility is decided
// by perception; no entity can be introduced by the visibility polygon.
function rayBox(origin, direction, box) {
  let entry = -Infinity, exit = Infinity;
  for (const [axis, lo, hi] of [['x', 'minX', 'maxX'], ['y', 'minY', 'maxY']]) {
    if (Math.abs(direction[axis]) < 1e-12) {
      if (origin[axis] < box[lo] || origin[axis] > box[hi]) return null;
      continue;
    }
    const a = (box[lo] - origin[axis]) / direction[axis];
    const b = (box[hi] - origin[axis]) / direction[axis];
    entry = Math.max(entry, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b));
  }
  return exit < Math.max(0, entry) ? null : { entry, exit };
}

export function visibilityPolygon(cone, arena) {
  const facing = Math.atan2(cone.facing.y, cone.facing.x);
  const half = cone.halfAngleRad;
  const angles = [-half, half];
  // Rays immediately beside every static corner preserve both the lit edge
  // and its shadow. Arena corners make open areas end exactly at the boundary.
  for (const box of [arena.bounds, ...arena.obstacles]) {
    for (const x of [box.minX, box.maxX]) for (const y of [box.minY, box.maxY]) {
      const theta = Math.atan2(y - cone.origin.y, x - cone.origin.x) - facing;
      const relative = Math.atan2(Math.sin(theta), Math.cos(theta));
      for (const offset of [-1e-7, 0, 1e-7]) {
        const angle = relative + offset;
        if (angle > -half && angle < half) angles.push(angle);
      }
    }
  }
  angles.sort((a, b) => a - b);
  return [{ ...cone.origin }, ...angles.map((angle) => {
    const direction = { x: Math.cos(facing + angle), y: Math.sin(facing + angle) };
    let distance = Math.max(0, rayBox(cone.origin, direction, arena.bounds)?.exit ?? 0);
    for (const box of arena.obstacles) {
      const hit = rayBox(cone.origin, direction, box);
      if (hit) distance = Math.min(distance, Math.max(0, hit.entry));
    }
    return { x: cone.origin.x + direction.x * distance,
      y: cone.origin.y + direction.y * distance };
  })];
}
