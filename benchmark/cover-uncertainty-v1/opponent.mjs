import { controlRoute } from '../../src/agents/cover-control.mjs';
import { createCoverInterface, COVER_INTERFACE } from '../../src/agents/cover-interface.mjs';

// Fixed before any scored run. These are ordinary route/clock tactics, not
// feedback tuned to subject performance. The 12 s patrol cycle has a quiet
// seven-second ring/approach interval followed by a home-cover circuit (~4.3 s
// ideal travel). Leaving the ring really forfeits control time. Neither tactic
// is optimal: a player can exploit the predictable exit or simply contest it.
// A neutral-controller geometry check on both seats observes first ring entry
// around 2 s and completed circuits with ~3.8 s outside the ring: departures
// ~7.23/19.22/31.22 s, returns ~11.03/23.03/35.03 s. Corner tolerance and the
// ring boundary make off-ring time shorter than the full nominal path length.
// These are correctness observations, not score comparisons or tuned outcomes.
//
// In the switch condition only, the opponent's delayed public elapsed clock
// changes the preferred route at 30 s, and its sparse firing slot changes from
// +4 s to +1.5 s in the same 12 s cycle. A route already in progress finishes
// before adopting the new route, avoiding a discontinuous cut through cover.
// Familiar uses the original policy indefinitely. There is no injected reset,
// hidden state, subject-policy inspection, or switch signal in any percept.
export const SWITCHING_COVER_OPPONENT = Object.freeze({
  controller: 'cover-uncertainty-opponent-v1',
  switchSec: 30,
  cycleSec: 12,
  excursionOffsetSec: 7,
  initialRoute: 'north',
  switchedRoute: 'south',
  initialShotOffsetSec: 4,
  switchedShotOffsetSec: 1.5,
  shotWindowSec: 0.4,
  alignmentCosine: 0.985,
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

function createController({ seed, condition }) {
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
    firstSwitchedRouteObservedSec: null, firstSwitchedRouteAppliedSec: null };
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
      if (!path || observedReset) startRoute(controlRoute(view.viewerId, route), route, 'ingress', elapsed);
      previous = { ...measured };
      while (waypoint < path.length - 1 && distance2(own, path[waypoint]) < S.waypointRadius ** 2)
        waypoint++;
      // Latch a measured ring arrival rather than repeatedly correcting a
      // delayed final target. The latter creates a perpetual small orbit even
      // with zero motor noise. There is no momentum after a zero move command.
      if (waypoint === path.length - 1 && distance2(measured, path[waypoint]) < S.ringArrivalRadius ** 2)
        holding = true;
      // One legal excursion per global clock cycle, initiated only from the
      // ring. A hit can delay or skip a trip; it never teleports us to its start.
      if (holding && offset >= S.excursionOffsetSec && departedCycle !== cycle) {
        departedCycle = cycle;
        startRoute(coverCircuitRoute(view.viewerId, route), route, 'circuit', elapsed);
      }
      const target = path[waypoint];
      const dx = target.x - own.x, dy = target.y - own.y;
      const moving = !holding && dx * dx + dy * dy > S.stopRadius ** 2;
      const enemy = view.opponent?.position;
      const look = enemy ? { x: enemy.x - own.x, y: enemy.y - own.y } :
        moving ? { x: dx, y: dy } : { x: -side, y: 0 };
      const projection = look.x * view.own.facing.x + look.y * view.own.facing.y;
      const aligned = projection > 0 && projection ** 2 >=
        (look.x ** 2 + look.y ** 2) * S.alignmentCosine ** 2;
      const shotOffset = switched ? S.switchedShotOffsetSec : S.initialShotOffsetSec;
      const shotWindow = offset >= shotOffset && offset < shotOffset + S.shotWindowSec;
      const shouldThrow = !!enemy && view.own.spear?.state === 'HELD' && aligned &&
        shotWindow && attemptedShotCycle !== cycle;
      if (shouldThrow) attemptedShotCycle = cycle;
      Object.assign(diagnostic, { phase: switched ? 'switched' : 'initial', switched,
        route: adoptedRoute, pathKind: holding ? 'hold' : currentPathKind, holding,
        waypoint, observedElapsedSec: elapsed });
      return { moveX: moving ? dx : 0, moveY: moving ? dy : 0,
        aimX: look.x, aimY: look.y, throw: shouldThrow,
        // Same legal own-spear recall rule as the ordinary Cover baseline.
        recall: !view.own.spear || view.own.spear.state === 'EMBEDDED' };
    },
  };
}

export function createSwitchingCoverOpponent({ seed = 1, condition = 'switch' } = {}) {
  if (!['familiar', 'switch'].includes(condition)) throw new RangeError('invalid opponent condition');
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new RangeError('invalid opponent seed');
  const controller = createController({ seed, condition });
  return { ...createCoverInterface(controller, { seed }), diagnostics: controller.diagnostics };
}
