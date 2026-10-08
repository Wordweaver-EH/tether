import { controlRoute } from '../../src/agents/cover-control.mjs';
import { createCoverInterface, COVER_INTERFACE } from '../../src/agents/cover-interface.mjs';

// Operational v2 policy, fixed without score comparisons. All routes, movement,
// projectile speed/body radius and clocks below are declared public-map/rules
// priors. No world, subject policy, hidden opponent state or evaluator history
// is read. Both successful offense and defense still cause ordinary game resets.
// Moving ring holds and observed collision-course dodges improve survival;
// they cannot guarantee exposure. Circuit counters explicitly retain failures.
export const SWITCHING_COVER_OPPONENT = Object.freeze({
  controller: 'cover-uncertainty-opponent-v2',
  switchSec: 30,
  cycleSec: 12,
  excursionOffsetSec: 7,
  initialRoute: 'north',
  switchedRoute: 'south',
  alignmentCosine: 0.985,
  initialShotOffsetSec: 4,
  switchedShotOffsetSec: 1.5,
  shotWindowSec: 0.4,
  holdRadius: 0.66,
  dodgeHorizonSec: 0.5,
  heldThreatRange: 5,
  heldThreatAlignment: 0.94,
  dodgeCorridorRadius: 0.7,
  spearSpeed: 12,
  bodyRadius: 0.35,
  waypointRadius: 0.20,
  stopRadius: 0.16,
  ringArrivalRadius: 0.35,
});

// From the ring, travel around the home-side wall, then return through the
// opposite entrance. Every segment is clear at the ordinary 0.35 body radius.
// This is a geometric public-map utility, not a world-state input.
export function coverCircuitRoute(viewerId, exitRoute = 'north') {
  const outgoing = controlRoute(viewerId, exitRoute);
  const incoming = controlRoute(viewerId, exitRoute === 'north' ? 'south' : 'north');
  return [outgoing[2], outgoing[1], outgoing[0],
    incoming[0], incoming[1], incoming[2], incoming[3]].map(point => ({ ...point }));
}

export function createController({ seed, condition }) {
  const S = SWITCHING_COVER_OPPONENT;
  let path = null, waypoint = 0, previous = null, holding = false;
  let departedCycle = -1, attemptedShotCycle = -1;
  let adoptedRoute = null, currentPathKind = null, lastAppliedRoute = null;
  // Evaluator-only snapshots. Nothing in this record is read by the policy or
  // added to an actor percept. "Observed" uses the delayed decision clock;
  // "applied" records when the ordinary interface emits that decision.
  const diagnostic = { phase: 'initial', switched: false, route: null,
    pathKind: null, holding: false, waypoint: null,
    observedElapsedSec: null, appliedElapsedSec: null,
    routeAdoptedObservedSec: null, routeAdoptedAppliedSec: null,
    firstSwitchedRouteObservedSec: null, firstSwitchedRouteAppliedSec: null,
    circuitsStarted: 0, circuitsCompleted: 0, circuitsInterrupted: 0, measuredWaypointArrivals: 0,
    resetsObserved: 0, throwAttempts: 0, dodgeDecisions: 0, anticipatedDodgeDecisions: 0,
    lastCircuitCompletedObservedSec: null, completedByRoute: { north: 0, south: 0 } };
  const distance2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  function startRoute(next, route, kind, elapsed) {
    path = next; waypoint = 0; holding = false;
    if (adoptedRoute !== route) diagnostic.routeAdoptedObservedSec = elapsed;
    if (condition === 'switch' && route === S.switchedRoute && diagnostic.firstSwitchedRouteObservedSec === null)
      diagnostic.firstSwitchedRouteObservedSec = elapsed;
    adoptedRoute = route; currentPathKind = kind;
  }
  return {
    settings: () => ({ ...S, seed, condition,
      switchClock: 'own-delayed-public-elapsedSec',
      resetDetection: 'own-observed-spawn-teleport',
      subjectInputs: 'none',
      hardcodedPriors: ['public Cover map and routes', 'player body radius 0.35',
        'spear speed 12', 'held-spear facing threat within 5 m, cosine 0.94', 'own latency 0.15', '30 s route switch',
        '12 s excursion clock with 7 s offset', 'moving ring radius 0.66',
        'v1 firing windows: 4 s initial, 1.5 s switched, 0.4 s wide'],
    }),
    diagnostics: () => structuredClone(diagnostic),
    commitCommand(_command, _view, appliedElapsedSec) {
      diagnostic.appliedElapsedSec = appliedElapsedSec;
      if (lastAppliedRoute !== adoptedRoute) {
        diagnostic.routeAdoptedAppliedSec = appliedElapsedSec;
        lastAppliedRoute = adoptedRoute;
      }
      if (condition === 'switch' && adoptedRoute === S.switchedRoute && diagnostic.firstSwitchedRouteAppliedSec === null)
        diagnostic.firstSwitchedRouteAppliedSec = appliedElapsedSec;
    },
    act(view) {
      if (view.gameMode !== 'COVER_CONTROL') throw new RangeError('Cover Control percept required');
      const elapsed = view.time.elapsedSec;
      const cycle = Math.floor(elapsed / S.cycleSec);
      const offset = elapsed - cycle * S.cycleSec;
      const switched = condition === 'switch' && elapsed >= S.switchSec;
      const route = switched ? S.switchedRoute : S.initialRoute;
      const side = view.viewerId === 'P1' ? -1 : 1;
      const measured = view.own.position;
      // Extrapolate only our own measured velocity through the ordinary delay.
      const own = { x: measured.x + view.own.velocity.x * COVER_INTERFACE.latencySec,
        y: measured.y + view.own.velocity.y * COVER_INTERFACE.latencySec };
      const spawn = { x: side * 5.5, y: 0 };
      const observedReset = previous && distance2(measured, spawn) < 0.1 ** 2 &&
        distance2(measured, previous) > 1;
      if (observedReset) {
        diagnostic.resetsObserved++;
        if (currentPathKind === 'circuit' && !holding) diagnostic.circuitsInterrupted++;
      }
      if (!path || observedReset) startRoute(controlRoute(view.viewerId, route), route, 'ingress', elapsed);
      previous = { ...measured };
      // A lateral dodge can place the delayed body on a waypoint while its
      // linear prediction lies far beyond it. Accept either own-position
      // evidence; prediction alone can deadlock around an already reached
      // waypoint. The measured acceptance uses the same predeclared radius.
      while (waypoint < path.length - 1 &&
          (distance2(measured, path[waypoint]) < S.waypointRadius ** 2 ||
           distance2(own, path[waypoint]) < S.waypointRadius ** 2)) {
        if (distance2(measured, path[waypoint]) < S.waypointRadius ** 2 &&
            distance2(own, path[waypoint]) >= S.waypointRadius ** 2)
          diagnostic.measuredWaypointArrivals++;
        waypoint++;
      }
      // Latch a measured ring arrival rather than repeatedly correcting a
      // delayed final target. The latter creates a perpetual small orbit even
      // with zero motor noise. There is no momentum after a zero move command.
      if (!holding && waypoint === path.length - 1 && distance2(measured, path[waypoint]) < S.ringArrivalRadius ** 2) {
        holding = true;
        if (currentPathKind === 'circuit') {
          diagnostic.circuitsCompleted++;
          diagnostic.completedByRoute[adoptedRoute]++;
          diagnostic.lastCircuitCompletedObservedSec = elapsed;
        }
      }
      // One legal excursion per global clock cycle, initiated only from the
      // ring. A hit can delay or skip a trip; it never teleports us to its start.
      if (holding && offset >= S.excursionOffsetSec && departedCycle !== cycle) {
        departedCycle = cycle;
        diagnostic.circuitsStarted++;
        startRoute(coverCircuitRoute(view.viewerId, route), route, 'circuit', elapsed);
      }
      const target = path[waypoint];
      const dx = target.x - own.x, dy = target.y - own.y;
      const moving = !holding && dx * dx + dy * dy > S.stopRadius ** 2;
      let moveX = moving ? dx : 0, moveY = moving ? dy : 0;
      // Continuous tangential movement while retaining ring pressure. Radial
      // correction uses only delayed own position/velocity, never world state.
      if (holding) {
        const r = Math.max(0.05, Math.hypot(own.x, own.y));
        const radial = 5 * (S.holdRadius - r);
        moveX = -own.y / r + radial * own.x / r;
        moveY = own.x / r + radial * own.y / r;
      }
      // At close range an outbound spear travels farther than the ring's
      // diameter during sensor delay. Anticipate a visible held spear aimed
      // toward us; this uses the opponent's public facing, not future throws.
      const enemyBody = view.opponent;
      const heldThreat = enemyBody && view.opponentSpear?.state === 'HELD';
      if (heldThreat) {
        const ex = own.x - enemyBody.position.x, ey = own.y - enemyBody.position.y;
        const distance = Math.hypot(ex, ey);
        const alignment = (ex * enemyBody.facing.x + ey * enemyBody.facing.y) / Math.max(0.01, distance);
        if (distance < S.heldThreatRange && alignment > S.heldThreatAlignment) {
          const lateral = { x: -ey / Math.max(0.01, distance), y: ex / Math.max(0.01, distance) };
          const sign = moveX * lateral.x + moveY * lateral.y >= 0 ? 1 : -1;
          const q = { x: own.x + lateral.x * sign * 0.65, y: own.y + lateral.y * sign * 0.65 };
          if (!view.arena.obstacles.some(o => q.x > o.minX - S.bodyRadius && q.x < o.maxX + S.bodyRadius && q.y > o.minY - S.bodyRadius && q.y < o.maxY + S.bodyRadius)) {
            moveX = lateral.x * sign; moveY = lateral.y * sign;
            diagnostic.anticipatedDodgeDecisions++;
          }
        }
      }
      const spear = view.opponentSpear;
      let dodging = false;
      if (spear && ['OUTBOUND', 'RETURNING'].includes(spear.state)) {
        const v = { x: spear.direction.x * S.spearSpeed, y: spear.direction.y * S.spearSpeed };
        const rel = { x: spear.position.x + v.x * COVER_INTERFACE.latencySec - own.x,
          y: spear.position.y + v.y * COVER_INTERFACE.latencySec - own.y };
        const t = -(rel.x * v.x + rel.y * v.y) / (S.spearSpeed ** 2);
        const miss = Math.hypot(rel.x + t * v.x, rel.y + t * v.y);
        if (t > -0.06 && t < S.dodgeHorizonSec && miss < S.dodgeCorridorRadius) {
          const lateral = { x: -spear.direction.y, y: spear.direction.x };
          // Prefer the perpendicular side already containing our body, breaking
          // exact ties by desired route motion. Avoid known solid cover.
          let sign = -(rel.x * lateral.x + rel.y * lateral.y) >= 0 ? 1 : -1;
          if (Math.abs(rel.x * lateral.x + rel.y * lateral.y) < 0.05)
            sign = moveX * lateral.x + moveY * lateral.y >= 0 ? 1 : -1;
          const clear = dir => {
            const q = { x: own.x + lateral.x * dir * 0.65, y: own.y + lateral.y * dir * 0.65 };
            const B = view.arena.bounds, r = S.bodyRadius;
            return q.x > B.minX + r && q.x < B.maxX - r && q.y > B.minY + r && q.y < B.maxY - r &&
              !view.arena.obstacles.some(o => q.x > o.minX - r && q.x < o.maxX + r && q.y > o.minY - r && q.y < o.maxY + r);
          };
          if (!clear(sign) && clear(-sign)) sign = -sign;
          if (clear(sign)) {
            moveX = lateral.x * sign; moveY = lateral.y * sign;
            dodging = true; diagnostic.dodgeDecisions++;
          }
        }
      }
      const enemy = view.opponent?.position;
      const look = enemy ? { x: enemy.x - own.x, y: enemy.y - own.y } :
        moving ? { x: dx, y: dy } : { x: -side, y: 0 };
      const projection = look.x * view.own.facing.x + look.y * view.own.facing.y;
      const aligned = projection > 0 && projection ** 2 >=
        (look.x ** 2 + look.y ** 2) * S.alignmentCosine ** 2;
      const shotOffset = switched ? S.switchedShotOffsetSec : S.initialShotOffsetSec;
      const shouldThrow = !!enemy && view.own.spear?.state === 'HELD' && aligned &&
        offset >= shotOffset && offset < shotOffset + S.shotWindowSec && attemptedShotCycle !== cycle;
      if (shouldThrow) { attemptedShotCycle = cycle; diagnostic.throwAttempts++; }
      Object.assign(diagnostic, { phase: switched ? 'switched' : 'initial', switched,
        route: adoptedRoute, pathKind: holding ? 'hold' : currentPathKind, holding,
        waypoint, dodging, observedElapsedSec: elapsed });
      return { moveX, moveY,
        aimX: look.x, aimY: look.y, throw: shouldThrow,
        // Same legal own-spear recall rule as the ordinary Cover baseline.
        recall: !view.own.spear || view.own.spear.state === 'EMBEDDED' };
    },
  };
}

export function createOpponent({ seed = 1, condition = 'switch' } = {}) {
  if (!['familiar', 'switch'].includes(condition)) throw new RangeError('invalid opponent condition');
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new RangeError('invalid opponent seed');
  const controller = createController({ seed, condition });
  return { ...createCoverInterface(controller, { seed }), diagnostics: controller.diagnostics };
}
