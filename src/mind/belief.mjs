import { add, sub, scale, distance, inCone, legalPoint, normal, point, clamp } from './math.mjs';

const COUNT = 48;
const MAX_SPEED = 4;
const copy = (p) => point(p.x, p.y);

export function createBelief(random, ablations = {}) {
  let particles = [];
  let initialized = false;
  let seenAt = -Infinity;
  let spear = { state: 'UNKNOWN', position: null, seenAt: -Infinity };
  let surprise = 0;
  let predictionError = 0;
  let predictedConfidence = 0;
  let observations = 0;
  let lastSeen = null;
  let hadMissing = false;
  let lastTime = 0;
  let arena;

  function uniform() {
    const b = arena.bounds;
    particles = Array.from({ length: COUNT }, () => ({
      position: legalPoint(point(b.minX + (b.maxX - b.minX) * random(),
        b.minY + (b.maxY - b.minY) * random()), arena),
      velocity: point(0, 0), weight: 1 / COUNT,
    }));
    initialized = true;
  }

  function resample(weights) {
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum < 1e-15) { uniform(); return; }
    const old = particles;
    const out = [];
    let i = 0, c = weights[0] / sum;
    const start = random() / COUNT;
    for (let j = 0; j < COUNT; j++) {
      const u = start + j / COUNT;
      while (u > c && i < COUNT - 1) c += weights[++i] / sum;
      out.push({ position: copy(old[i].position), velocity: copy(old[i].velocity), weight: 1 / COUNT });
    }
    particles = out;
  }

  function update(view, now) {
    arena = view.arena;
    if (!initialized) uniform();
    const elapsed = Math.max(0, Math.min(1, now - lastTime));
    lastTime = now;
    // Prediction uses the observed velocity, with process noise and wall/obstacle constraints.
    for (const p of particles) {
      if (!ablations.noPrediction) {
        p.position = legalPoint(add(p.position, scale(p.velocity, elapsed)), arena);
        p.velocity = point(clamp(p.velocity.x + normal(random) * 0.22, -MAX_SPEED, MAX_SPEED),
          clamp(p.velocity.y + normal(random) * 0.22, -MAX_SPEED, MAX_SPEED));
      }
      p.position = legalPoint(add(p.position,
        point(normal(random) * 0.025, normal(random) * 0.025)), arena);
    }
    const observed = view.opponent;
    if (ablations.noBelief) {
      if (observed) {
        particles = Array.from({ length: COUNT }, () => ({ position: copy(observed.position),
          velocity: copy(observed.velocity), weight: 1 / COUNT }));
        seenAt = now;
      } else { uniform(); seenAt = -Infinity; lastSeen = null; }
    } else if (observed) {
      const prior = summary(now);
      const variance = 0.35 * 0.35;
      const likelihoods = particles.map((p) =>
        Math.exp(-(distance(p.position, observed.position) ** 2) / (2 * variance)) + 1e-10);
      const evidence = likelihoods.reduce((a, b) => a + b, 0) / COUNT;
      surprise = ablations.noPrediction ? 0 : Math.min(20, -Math.log(Math.max(1e-9, evidence)));
      if (lastSeen && hadMissing) {
        predictionError += distance(prior.mean, observed.position);
        predictedConfidence += prior.confidence;
        observations++;
      }
      hadMissing = false;
      // Rejuvenation around the exact sighting prevents impoverishment after long gaps.
      resample(likelihoods);
      for (let i = 0; i < COUNT; i++) {
        const p = particles[i];
        const blend = i < COUNT / 2 ? 0.95 : 0.7;
        p.position = legalPoint(add(scale(p.position, 1 - blend),
          add(scale(observed.position, blend), point(normal(random) * 0.09, normal(random) * 0.09))), arena);
        p.velocity = copy(observed.velocity);
      }
      seenAt = now;
      lastSeen = { position: copy(observed.position), facing: copy(observed.facing),
        velocity: copy(observed.velocity), time: now };
    } else {
      hadMissing = true;
      surprise = 0;
      // A missing body is evidence: particles in the actual current cone are unlikely.
      const weights = particles.map((p) => inCone(view.own.position, view.own.facing,
        p.position, view.cone.halfAngleRad) ? 0.005 : 1);
      resample(weights);
      // If every particle was in the cone, resampling weights alone cannot
      // create an alternative hypothesis. Rejuvenate into the unseen region.
      const b = arena.bounds;
      for (const p of particles) {
        if (!inCone(view.own.position, view.own.facing, p.position,
          view.cone.halfAngleRad) || random() > 0.82) continue;
        for (let attempt = 0; attempt < 20; attempt++) {
          const q = legalPoint(point(b.minX + (b.maxX - b.minX) * random(),
            b.minY + (b.maxY - b.minY) * random()), arena);
          if (!inCone(view.own.position, view.own.facing, q,
            view.cone.halfAngleRad)) { p.position = q; p.velocity = point(0, 0); break; }
        }
      }
    }
    if (view.opponentSpear) {
      spear = { state: view.opponentSpear.state, position: copy(view.opponentSpear.position),
        direction: copy(view.opponentSpear.direction), seenAt: now };
    } else if (ablations.noBelief) {
      spear = { state: 'UNKNOWN', position: null, seenAt: -Infinity };
    } else if (spear.position && inCone(view.own.position, view.own.facing,
      spear.position, view.cone.halfAngleRad)) {
      spear = { ...spear, state: 'UNKNOWN' };
    }
    return summary(now);
  }

  function summary(now) {
    let mx = 0, my = 0, vx = 0, vy = 0;
    for (const p of particles) { mx += p.position.x / COUNT; my += p.position.y / COUNT;
      vx += p.velocity.x / COUNT; vy += p.velocity.y / COUNT; }
    let xx = 0, yy = 0, xy = 0;
    for (const p of particles) {
      const dx = p.position.x - mx, dy = p.position.y - my;
      xx += dx * dx / COUNT; yy += dy * dy / COUNT; xy += dx * dy / COUNT;
    }
    const stale = Number.isFinite(seenAt) ? Math.max(0, now - seenAt) : Infinity;
    const dispersion = Math.sqrt(xx + yy);
    const confidence = ablations.noMetacog ? 1 : Number.isFinite(stale) ?
      clamp(Math.exp(-stale / 1.7) / (1 + dispersion * 0.35), 0, 1) : 0;
    const spearStale = Number.isFinite(spear.seenAt) ? Math.max(0, now - spear.seenAt) : Infinity;
    const spearConfidence = ablations.noMetacog ? 1 : Number.isFinite(spearStale) ?
      Math.exp(-spearStale / 2.5) : 0;
    // Differential entropy of a 2D Gaussian with the sample covariance.
    const determinant = Math.max(1e-8, xx * yy - xy * xy);
    return { mean: point(mx, my), velocity: point(vx, vy),
      covariance: { xx, xy, yy }, entropy: Math.log(2 * Math.PI * Math.E) + 0.5 * Math.log(determinant),
      particles: particles.slice(0, 64).map((p) => copy(p.position)), confidence,
      spear: { state: spear.state, position: spear.position ? copy(spear.position) : null,
        stalenessSec: spearStale, confidence: spearConfidence },
      stalenessSec: stale, surprise, calibration: { observations,
        meanReacquisitionError: observations ? predictionError / observations : null,
        meanPredictedConfidence: observations ? predictedConfidence / observations : null },
      lastSeen: lastSeen ? { ...lastSeen, position: copy(lastSeen.position),
        facing: copy(lastSeen.facing), velocity: copy(lastSeen.velocity) } : null };
  }
  return { update, summary };
}
