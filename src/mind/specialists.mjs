import { add, sub, scale, unit, distance, lineDistance, clamp, dot, inCone } from './math.mjs';

function proposal(content, salience, wants = {}) {
  return { content, salience: clamp(salience, 0, 1), wants };
}

export function specialists(view, belief, model, affect, ablations) {
  const me = view.own.position, enemy = belief.mean;
  const mySpear = view.own.spear, theirSpear = belief.spear;
  const separation = distance(me, enemy);
  const seen = !!view.opponent;
  const leadTime = Math.min(0.9, separation / 12 + model.latencySec);
  const intercept = add(enemy, scale(belief.velocity, ablations.noPrediction ? 0 : leadTime));
  const aim = unit(sub(intercept, me));
  const facing = view.own.facing;
  const alignment = dot(facing, aim);
  const confident = belief.confidence >= model.throwConfidence;
  const baseline = model.policy === 'baseline';
  const shot = mySpear.state === 'HELD' && confident && separation < 13 &&
    alignment > Math.cos(model.throwAngleRad) &&
    (seen || belief.stalenessSec < 0.35 || ablations.noMetacog);
  // A straight rush along a visible spear line is easy to punish. Approach on
  // a diagonal, then orbit while keeping the target in the firing cone.
  const tangent = { x: -aim.y, y: aim.x };
  let sideways = scale(tangent, model.orbitSign ?? -1);
  const bounds = view.arena.bounds;
  if (!baseline && ((me.y < bounds.minY + 1.1 && sideways.y < -0.15) ||
      (me.y > bounds.maxY - 1.1 && sideways.y > 0.15) ||
      (me.x < bounds.minX + 1.1 && sideways.x < -0.15) ||
      (me.x > bounds.maxX - 1.1 && sideways.x > 0.15))) {
    model.orbitSign = -(model.orbitSign ?? -1);
    sideways = scale(tangent, model.orbitSign);
  }
  const pursuit = separation > 7 ? add(scale(aim, 0.62), scale(sideways, 0.78)) :
    separation < 5 ? add(scale(aim, -0.8), scale(sideways, 0.6)) :
      add(scale(aim, 0.08), scale(sideways, 0.95));
  const huntMove = baseline ? add(enemy, scale(unit(sub(me, enemy)), 2.2)) :
    add(me, scale(unit(pursuit), 4));
  const hunt = proposal('Track and intercept the opponent',
    (seen ? 0.59 : 0.27) + 0.2 * belief.confidence + (shot ? 0.12 : 0),
    { gaze: intercept, move: huntMove, throw: shot });

  let threatScore = 0, evade = null, threatGaze = null;
  if (theirSpear.position && theirSpear.confidence > 0.1) {
    if (!baseline && theirSpear.state === 'HELD' && view.opponent && separation < 9 &&
      dot(view.opponent.facing, unit(sub(me, enemy))) > Math.cos(0.4)) {
      threatScore = 0.93;
      evade = add(me, scale(unit(add(scale(aim, separation < 5 ? -0.8 : -0.2),
        scale(sideways, separation < 5 ? 0.6 : 0.98))), 4));
      threatGaze = intercept;
    } else if (theirSpear.state === 'OUTBOUND' || theirSpear.state === 'RETURNING') {
      const ahead = add(theirSpear.position, scale(theirSpear.direction ?? unit(sub(me, theirSpear.position)), 4));
      const proximity = lineDistance(me, theirSpear.position, ahead);
      if (proximity.distance < 1.4 && distance(me, theirSpear.position) < 5) {
        threatScore = 0.95 - 0.15 * proximity.distance;
        const away = unit(sub(me, theirSpear.position));
        evade = add(me, { x: -away.y * 2, y: away.x * 2 });
        threatGaze = theirSpear.position;
      }
    } else if (theirSpear.state === 'EMBEDDED') {
      const crossing = lineDistance(me, theirSpear.position, enemy);
      if (crossing.distance < 0.95 && crossing.t > 0.02 && crossing.t < 0.98) {
        threatScore = 0.82 * theirSpear.confidence;
        const line = unit(sub(enemy, theirSpear.position));
        evade = add(me, { x: -line.y * 2, y: line.x * 2 });
        threatGaze = theirSpear.position;
      }
    }
  }
  const threat = proposal('Avoid a spear line', threatScore,
    { gaze: threatGaze, move: evade, throw: baseline ? undefined : shot });

  let anchorSalience = 0, anchorWants = {};
  if (mySpear.state === 'EMBEDDED') {
    const line = lineDistance(enemy, mySpear.position, me);
    const imminent = line.distance < (seen ? 0.58 : 0.45) && line.t > 0.04 && line.t < 0.97;
    const enemyNearSpear = distance(enemy, mySpear.position) < 0.8;
    const recall = (imminent && belief.confidence > 0.3) ||
      (enemyNearSpear && belief.confidence > 0.5) ||
      (model.embedAge > 3.5 && belief.confidence < 0.25) || model.embedAge > 8;
    const bait = add(enemy, scale(unit(sub(enemy, mySpear.position)), 1.8));
    anchorSalience = recall ? 0.94 : 0.47 + 0.15 * belief.confidence;
    anchorWants = { gaze: intercept, move: bait, recall };
  } else if (mySpear.state === 'HELD' && !seen && model.unseenFor > 1.5 &&
      separation > 4 && model.timeSinceThrow > 1.8) {
    const wall = { x: me.x > 0 ? -7.9 : 7.9, y: clamp(enemy.y, -4.5, 4.5) };
    const lined = dot(facing, unit(sub(wall, me))) > Math.cos(0.11);
    anchorSalience = 0.52;
    anchorWants = { gaze: wall, move: me, throw: lined };
  }
  const anchor = proposal('Use my embedded spear as an anchor', anchorSalience, anchorWants);

  const contest = theirSpear.state === 'EMBEDDED' && theirSpear.position &&
    theirSpear.confidence > 0.3 ? proposal('Neutralize the embedded enemy spear',
      0.53 + 0.12 * theirSpear.confidence + (distance(me, theirSpear.position) < 2 ? 0.12 : 0),
      { gaze: theirSpear.position, move: theirSpear.position }) :
    proposal('Neutralize the embedded enemy spear', 0);

  const search = proposal('Reacquire the opponent',
    !seen ? 0.36 + Math.min(0.38, belief.stalenessSec * 0.09) +
      (ablations.noMetacog ? 0 : (1 - belief.confidence) * 0.14) +
      (baseline ? 0 : Math.min(0.08, Math.max(0, belief.entropy) / 20)) : 0.05,
    { gaze: belief.confidence > 0.1 ? enemy : model.scanTarget,
      move: belief.confidence > 0.1 ? enemy : model.searchTarget });

  const otherFacing = model.opponentAttention?.facing;
  const unseenByThem = otherFacing && !inCone(enemy, otherFacing, me);
  const deceive = !ablations.noToM && unseenByThem && belief.confidence > 0.25 &&
    (!baseline || mySpear.state === 'HELD') ?
    proposal('Flank while outside their gaze',
      baseline ? 0.53 + (seen ? 0.02 : 0.08) : seen ? 0.84 : 0.76,
      { gaze: intercept,
        move: add(enemy, { x: otherFacing.y * 1.8, y: -otherFacing.x * 1.8 }),
        throw: shot && seen }) : proposal('Flank while outside their gaze', 0);
  return { Threat: threat, Hunt: hunt, Anchor: anchor, Contest: contest,
    Search: search, Deceive: deceive };
}

// Monolithic policy for the GWT-1 ablation. It evaluates one combined priority
// and never competes specialist proposals for control of the outputs.
export function singleUtility(view, belief, model) {
  const me = view.own.position, enemy = belief.mean;
  const spear = view.own.spear;
  const their = belief.spear;
  const target = view.opponent?.position ?? enemy;
  const toTarget = unit(sub(target, me));
  let move = target, gaze = target, recall = false, throwSpear = false;
  if (their.state === 'EMBEDDED' && their.position && their.confidence > 0.4) {
    move = their.position; gaze = their.position;
  } else if (spear.state === 'EMBEDDED') {
    const crossing = lineDistance(enemy, spear.position, me);
    recall = crossing.distance < 0.6 && belief.confidence > 0.35 || model.embedAge > 5;
    move = enemy;
  } else if (spear.state === 'HELD' && view.opponent) {
    throwSpear = belief.confidence >= model.throwConfidence &&
      dot(view.own.facing, toTarget) > Math.cos(model.throwAngleRad);
  }
  return proposal('Pursue the highest immediate utility', 0.7,
    { gaze, move, throw: throwSpear, recall });
}
