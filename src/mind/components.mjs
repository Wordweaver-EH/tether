import { add, sub, scale, unit, distance, lineDistance, legalPoint, angle, angleDiff, clamp, point, normal } from './math.mjs';

export function createAttentionSchema(ablations = {}) {
  const refreshed = { opponent: -Infinity, ownSpear: -Infinity, enemySpear: -Infinity };
  let lastOpponent = null;
  function update(view, belief, now) {
    if (view.opponent) refreshed.opponent = now;
    if (view.ownSpearVisible !== false && view.own.spear.state !== 'HELD')
      refreshed.ownSpear = now;
    if (view.opponentSpear) refreshed.enemySpear = now;
    if (view.opponent && !ablations.noToM) {
      lastOpponent = { origin: { ...view.opponent.position }, facing: { ...view.opponent.facing },
        seenAt: now, confidence: 1 };
    } else if (lastOpponent) {
      lastOpponent = { ...lastOpponent, confidence: Math.exp(-(now - lastOpponent.seenAt) / 1.5) };
      if (lastOpponent.confidence < 0.1 || ablations.noToM) lastOpponent = null;
    }
    return schedule(view, belief, now);
  }
  function schedule(view, belief, now) {
    const items = [
      { item: 'opponent', stalenessSec: now - refreshed.opponent,
        dueSec: 0.6, target: belief.mean, priority: 1 - belief.confidence },
      { item: 'ownSpear', stalenessSec: now - refreshed.ownSpear,
        dueSec: 1.3, target: view.own.spear.position,
        priority: view.own.spear.state === 'HELD' ? 0 : 0.45 },
      { item: 'enemySpear', stalenessSec: now - refreshed.enemySpear,
        dueSec: 1.1, target: belief.spear.position,
        priority: belief.spear.state === 'UNKNOWN' ? 0 : 0.65 },
    ];
    for (const item of items) item.due = item.priority > 0 &&
      item.stalenessSec > item.dueSec && !!item.target;
    return items;
  }
  return { update, schedule, opponentCone: () => lastOpponent };
}

export function createAffect() {
  let previousMargin = 0;
  let valence = 0;
  function update(view, belief, candidates) {
    const id = view.viewerId, other = id === 'P1' ? 'P2' : 'P1';
    const margin = view.scores[id] - view.scores[other];
    valence = clamp(valence * 0.95 + (margin - previousMargin) * 0.35, -1, 1);
    previousMargin = margin;
    return { arousal: clamp(0.12 + candidates.Threat.salience * 0.55 +
      belief.surprise * 0.035, 0, 1), valence,
    confidenceMood: belief.confidence, scoreMargin: margin };
  }
  return { update };
}

export function createMemory() {
  const episodes = [];
  const playerModel = { embedToRecallDelays: [], neutralizations: 0,
    favoriteSurfaces: {}, scanReversals: 0 };
  let observedSpearState = 'UNKNOWN', observedEmbedAt = null;
  let ownSpearState = 'HELD', priorScores = null;
  let observedFacing = null, observedTurnSign = 0;
  function remember(item) {
    episodes.push(item);
    if (episodes.length > 256) episodes.shift();
  }
  return { remember, episodes: () => structuredClone(episodes),
    playerModel: () => structuredClone(playerModel),
    load(snapshot) {
      if (!snapshot || typeof snapshot !== 'object') return;
      const source = snapshot.playerModel ?? {};
      if (Array.isArray(source.embedToRecallDelays)) playerModel.embedToRecallDelays =
        source.embedToRecallDelays.filter(n => Number.isFinite(n) && n >= 0 && n <= 300).slice(-128);
      for (const key of ['neutralizations','scanReversals']) if (Number.isFinite(source[key]))
        playerModel[key] = Math.max(0, Math.min(1e6, source[key]));
      for (const [surface,n] of Object.entries(source.favoriteSurfaces ?? {}).slice(0,64))
        if (/^[A-Za-z0-9_-]+$/.test(surface) && Number.isFinite(n) && n >= 0)
          Object.defineProperty(playerModel.favoriteSurfaces,surface,{ value:Math.min(n,1e6),enumerable:true,writable:true,configurable:true });
      if (Array.isArray(snapshot.episodes)) for (const e of snapshot.episodes.slice(-256)) {
        if (e?.kind === 'workspace' && Number.isFinite(e.time)) remember({ kind:'workspace',time:e.time,
          focus: typeof e.focus === 'string' ? e.focus.slice(0,32) : null,
          content:typeof e.content === 'string' ? e.content.slice(0,256) : null,
          innerSpeech:typeof e.innerSpeech === 'string' ? e.innerSpeech.slice(0,256) : null });
      }
    },
    observePercept(view, now) {
      if (ownSpearState === 'EMBEDDED' && view.own.spear.state === 'HELD' &&
          priorScores && priorScores.P1 === view.scores.P1 &&
          priorScores.P2 === view.scores.P2) playerModel.neutralizations++;
      ownSpearState = view.own.spear.state;
      priorScores = { ...view.scores };
      const spear = view.opponentSpear;
      if (spear) {
        if (spear.state === 'EMBEDDED' && observedSpearState !== 'EMBEDDED') {
          observedEmbedAt = now;
          if (spear.embedSurfaceId) playerModel.favoriteSurfaces[spear.embedSurfaceId] =
            (playerModel.favoriteSurfaces[spear.embedSurfaceId] ?? 0) + 1;
        }
        if (spear.state === 'RETURNING' && observedSpearState === 'EMBEDDED' &&
            observedEmbedAt !== null)
          { playerModel.embedToRecallDelays.push(now - observedEmbedAt);
            if (playerModel.embedToRecallDelays.length > 128) playerModel.embedToRecallDelays.shift(); }
        observedSpearState = spear.state;
      } else observedSpearState = 'UNKNOWN';
      if (view.opponent) {
        const facing = Math.atan2(view.opponent.facing.y, view.opponent.facing.x);
        if (observedFacing !== null) {
          const turn = angleDiff(facing, observedFacing);
          const sign = turn > 0.03 ? 1 : turn < -0.03 ? -1 : 0;
          if (sign && observedTurnSign && sign !== observedTurnSign)
            playerModel.scanReversals++;
          if (sign) observedTurnSign = sign;
        }
        observedFacing = facing;
      } else observedFacing = null;
    },
  };
}

export function createReflection() {
  const notes = [];
  return {
    considerRecall({ time, spear, own, particles }) {
      if (spear.state !== 'EMBEDDED' || !particles?.length) return null;
      const hitChance = particles.filter((p) =>
        lineDistance(p, spear.position, own).distance <= 0.35).length / particles.length;
      const note = { time, choice: 'recall', alternative: 'wait',
        estimatedHitChance: hitChance,
        estimatedDelta: hitChance - 0.2, source: 'belief particles' };
      notes.push(note);
      if (notes.length > 256) notes.shift();
      return note;
    },
    reflect(moment, alternative) {
      // V1 compares supplied predicted outcomes; v2 will run snapshot branches.
      const note = { time: moment.time, choice: moment.choice,
        alternative: alternative.choice,
        estimatedDelta: alternative.estimatedValue - moment.estimatedValue };
      notes.push(note);
      if (notes.length > 256) notes.shift();
      return note;
    },
    notes: () => notes.map((n) => ({ ...n })),
  };
}

export function createSpeech() {
  const lines = {
    Threat: 'A spear line. Move.', Hunt: 'I can take a shot.',
    Anchor: 'The anchor may pay off.', Contest: 'Their spear is exposed.',
    Search: 'I need another look.', Deceive: 'Their gaze is elsewhere.',
    Utility: 'I am weighing my options.',
  };
  function transition(workspace) {
    return workspace.ignition ? (workspace.focus ? lines[workspace.focus] : 'No focus.') : null;
  }
  function outer(workspace) {
    return workspace.ignition && workspace.focus === 'Deceive' ? 'I see you.' : null;
  }
  return { transition, outer };
}

function segmentIntersectsBox(a, b, box, margin = 0.36) {
  let lo = 0, hi = 1;
  for (const axis of ['x', 'y']) {
    const d = b[axis] - a[axis];
    const min = box[axis === 'x' ? 'minX' : 'minY'] - margin;
    const max = box[axis === 'x' ? 'maxX' : 'maxY'] + margin;
    if (Math.abs(d) < 1e-9) { if (a[axis] < min || a[axis] > max) return false; }
    else {
      const p = (min - a[axis]) / d, q = (max - a[axis]) / d;
      lo = Math.max(lo, Math.min(p, q)); hi = Math.min(hi, Math.max(p, q));
      if (lo > hi) return false;
    }
  }
  return hi >= 0 && lo <= 1;
}

export function planMove(origin, rawTarget, arena) {
  if (!rawTarget) return point(0, 0);
  const target = legalPoint(rawTarget, arena);
  let waypoint = target;
  for (const box of arena.obstacles) {
    if (!segmentIntersectsBox(origin, target, box)) continue;
    const corners = [
      point(box.minX - 0.55, box.minY - 0.55),
      point(box.minX - 0.55, box.maxY + 0.55),
      point(box.maxX + 0.55, box.minY - 0.55),
      point(box.maxX + 0.55, box.maxY + 0.55),
    ];
    corners.sort((a, b) => distance(origin, a) + distance(a, target) -
      distance(origin, b) - distance(b, target));
    waypoint = corners[0];
    break;
  }
  const delta = sub(waypoint, origin);
  return distance(origin, waypoint) < 0.25 ? point(0, 0) : unit(delta);
}

export function planGaze(view, desired, schedule, now, model, random, ablations, externalMotorNoise = false) {
  let target = desired;
  if (ablations.noAttentionSchema) {
    const theta = now * Math.PI * 0.9;
    target = add(view.own.position, point(Math.cos(theta) * 5, Math.sin(theta) * 5));
  } else {
    const due = schedule.filter((s) => s.due).sort((a, b) =>
      b.priority * b.stalenessSec - a.priority * a.stalenessSec)[0];
    if (due && (!target || (due.item === 'opponent' && due.priority > 0.7))) target = due.target;
  }
  if (!target) return point(0, 0);
  const desiredAngle = angle(sub(target, view.own.position));
  const angularSpeed = Math.abs(angleDiff(desiredAngle, model.previousGazeAngle)) * 30;
  model.previousGazeAngle = desiredAngle;
  const sigma = model.baseAimNoise + model.speedAimNoise * angularSpeed;
  // Preserve shared cognitive RNG advancement when the wrapper owns motor noise.
  const motorSample = normal(random);
  const noisy = desiredAngle + (externalMotorNoise ? 0 : motorSample) * Math.min(0.18, sigma);
  return point(Math.cos(noisy), Math.sin(noisy));
}
