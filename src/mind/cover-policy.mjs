// Optional, engineered Cover priorities. Every proposal competes in the normal
// workspace. Geometry, ring status and threat evidence come only from the percept.
import { add, sub, scale, unit, distance, dot } from './math.mjs';
import { hasLineOfSight } from '../visibility.js';
import { controlRoute } from '../agents/cover-control.mjs';

export const COVER_REPLAN_SEC = 0.5;
export function createCoverPolicy(controls = {}) {
  const allowed = ['objective', 'threat', 'routeCache', 'report', 'targetMonitoring'];
  if (!controls || typeof controls !== 'object' || Object.keys(controls).some(k =>
    !allowed.includes(k) || typeof controls[k] !== 'boolean')) throw new TypeError('invalid Cover controls');
  const enabled = Object.fromEntries(allowed.map(k => [k, controls[k] !== false]));
  let route = null, waypoint = 0, previous = null, traversing = false;
  let routeSource = null;
  let cachedRoute = null, successes = 0, nextPlan = -Infinity, lastSignature = null;
  let state = null, weaponIntent = null;
  function prepare(view, belief, model, original, budget, flinch = null) {
    if (view.gameMode !== 'COVER_CONTROL') throw new RangeError('integrated mind requires Cover Control');
    const now = view.time.elapsedSec, measured = view.own.position;
    const own = add(measured, scale(view.own.velocity, model.latencySec));
    const side = view.viewerId === 'P1' ? -1 : 1;
    const reset = previous && distance(measured, { x: side * 5.5, y: 0 }) < .15 && distance(measured, previous) > 1;
    if (reset) { route = null; routeSource = null; waypoint = 0; traversing = false; }
    previous = { ...measured };
    const spear = belief.spear;
    const movingDanger = ['OUTBOUND', 'RETURNING'].includes(spear.state);
    const recallDanger = spear.state === 'EMBEDDED';
    const threat = enabled.threat && (movingDanger || recallDanger) ? original.Threat :
      { content: 'No immediate spear line', salience: 0, wants: {} };
    const danger = !!flinch || threat.salience > .75;
    const cacheReused = !route && enabled.routeCache && !!cachedRoute && !danger && budget.spend('cover-route-cache', 1);
    const routeWork = !route && !cacheReused && budget.spend('cover-route', 8);
    if (!route) {
      // Both alternatives are public, body-clear routes. Exposure is assessed
      // only against a currently visible opponent, never privileged truth.
      const cost = name => {
        const path = controlRoute(view.viewerId, name);
        let length = 0, prior = own;
        for (const p of path) { length += distance(prior, p); prior = p; }
        const risk = view.opponent ? Math.max(0, 3 - distance(view.opponent.position, path[1])) * 2 : 0;
        return length + risk;
      };
      routeSource = cacheReused ? 'cached' : routeWork ? 'evaluated' : 'unfinished-budget-fallback';
      route = cacheReused ? cachedRoute : routeWork && cost('south') < cost('north') ? 'south' : 'north';
      waypoint = 0; traversing = Math.abs(measured.x) > 4;
    }
    const path = controlRoute(view.viewerId, route);
    while (waypoint < path.length - 1 && distance(own, path[waypoint]) < .24) waypoint++;
    // Once inside the wings, return directly to the ring after a dodge rather
    // than retracing old route waypoints. The south baffle remains excluded.
    const centerAccess = Math.abs(own.x) < 2.35 && own.y < 1.0;
    const destination = centerAccess ? path.at(-1) : path[waypoint];
    const inside = distance(measured, view.objective.position) < view.objective.radius;
    if (inside && traversing) { cachedRoute = route; successes++; traversing = false; }
    const holding = view.objective.controller === view.viewerId;
    const enemyHolding = !!view.objective.controller && !holding;
    const contested = view.objective.contested;
    const seen = !!view.opponent;
    const remembered = !seen && Number.isFinite(belief.stalenessSec) && belief.stalenessSec < 1 && belief.confidence > .1;
    const gaze = seen ? original.Hunt.wants.gaze : remembered ? belief.mean : model.scanTarget;
    const shot = seen && !!original.Hunt.wants.throw && hasLineOfSight(measured, gaze, view.arena.obstacles);
    const recall = view.own.spear.state === 'EMBEDDED';
    const action = { gaze, throw: shot, recall };
    weaponIntent = { throw: shot, recall };
    const objective = { content: enemyHolding || contested ? 'Contest the public ring' : holding ? 'Hold the public ring' : 'Reach the public ring',
      salience: enabled.objective ? enemyHolding ? .94 : holding ? .88 : .84 : 0,
      wants: { ...action, move: inside && !contested ? null : destination } };
    // Objective already uses this target for gaze and weapon choice. Preserve
    // that existing hypothesis for C1/C2; a public beacon alone is not evidence
    // of opponent position and must never manufacture a target forecast.
    if (enabled.targetMonitoring && (seen || remembered)) objective.hypothesis = original.Hunt.hypothesis;
    // Existing tactical proposals remain competitors. Cover pursuit does not
    // inherit the unrelated Duel flanking/anchor objectives.
    const hunt = { ...original.Hunt, wants: { ...original.Hunt.wants, throw: shot, recall } };
    const search = { ...original.Search, salience: remembered ? .89 : .45,
      wants: { gaze: remembered ? belief.mean : model.scanTarget,
        move: inside ? measured : remembered ? belief.mean : model.searchTarget, recall } };
    if (seen || enemyHolding) search.salience = .05;
    const candidates = { Threat: { ...threat, wants: { ...threat.wants, throw: shot, recall } },
      Hunt: hunt, Search: search, Objective: objective };
    // Immediate danger can beat even an urgent contested ring without changing
    // the old Duel threat weights. The reflex path remains the first safety tier.
    if (danger) {
      candidates.Threat.salience = 1;
      // A geometrically imminent spear line makes the competing plans unsafe.
      // Withdraw those proposals below the existing workspace's hold threshold,
      // so hysteresis cannot keep an invalidated objective or hunt in control.
      for (const key of ['Hunt', 'Search', 'Objective']) candidates[key].salience = Math.min(.1, candidates[key].salience);
    }
    state = { intent: objective.content, reason: enemyHolding ? 'opponent public control beacon' : holding ? 'own public control beacon' : 'public ring geometry',
      evidence: { sensorTime: now, opponent: seen ? 'visible' : remembered ? 'remembered hypothesis' : 'unobserved',
        objective: { controller: view.objective.controller, contested, holdTicks: view.objective.holdTicks } },
      routeCache: { reused: cacheReused, activeFromCache: routeSource === 'cached', route, successfulTraversals: successes,
        kind: 'engineered successful-route cache; not tactical learning' },
      routeStatus: routeSource,
      danger, destination: { ...destination }, inside, reset: !!reset };
    if (enabled.targetMonitoring) state.evidence.opponentHypothesis = {
      mean: { ...belief.mean }, velocity: { ...belief.velocity },
      stalenessSec: Number.isFinite(belief.stalenessSec) ? belief.stalenessSec : null,
      confidence: belief.confidence,
      scope: 'controller belief from delayed percepts; not current opponent truth' };
    return candidates;
  }
  function arbitrate(chosen, flinch) {
    const defensive = !!flinch || chosen.focus === 'Threat';
    // Defense owns locomotion and gaze. Recovery is an independent button;
    // a shot can survive only if its existing intention passes the final-aim
    // guard below. In particular a reflex never invents an aim from stale belief.
    if (defensive) {
      chosen.outputs.recall = weaponIntent.recall;
      chosen.outputs.throw = weaponIntent.throw;
    }
    state.arbitration = { defensive,
      locomotionSource: flinch ? 'observed-spear reflex' : 'workspace winner',
      gazeSource: flinch ? 'observed-spear reflex proposal; subject to unchanged attention selection' : 'workspace/tactical/attention selection',
      gazeProposal: chosen.outputs.gaze ? { ...chosen.outputs.gaze } : null,
      weaponSource: defensive ? 'existing Cover visible-shot or immediate-recovery intention' : 'workspace winner',
      intended: { throw: !!chosen.outputs.throw, recall: !!chosen.outputs.recall },
      guard: null, issued: null };
  }
  function branchMatches(view, input, branch) {
    if (!branch) return false;
    if (input.recall) return view.own.spear.state === 'EMBEDDED' && branch.tactic === 'direct';
    if (!input.throw || view.own.spear.state !== 'HELD' || !branch.target) return false;
    return dot(unit({ x: input.aimX, y: input.aimY }), unit(sub(branch.target, view.own.position))) > 1 - 1e-10;
  }
  function request(view, belief, chosen, monitorForced, flinch, budget, requestReason = null) {
    const now = view.time.elapsedSec;
    const actionable = !!view.opponent && ['HELD', 'EMBEDDED'].includes(view.own.spear.state);
    const signature = `${chosen.focus}:${view.own.spear.state}:${!!view.opponent}:${view.objective.controller}:${view.objective.contested}`;
    const changed = signature !== lastSignature;
    const reason = monitorForced ? requestReason === 'fixed-monitor-schedule' ? 'fixed monitoring schedule' : 'prediction mismatch' : changed ? 'changed tactical situation' : null;
    const requested = !flinch && actionable && !!reason && now >= nextPlan;
    if (requested) { nextPlan = now + COVER_REPLAN_SEC; lastSignature = signature; }
    // Signature changes during cooldown remain pending; uncertainty by itself
    // does not request work every cycle. No task-wide retry loop is introduced.
    state.planning = { requested, reason: requested ? reason : flinch ? 'reflex priority' : actionable && reason ? 'cooldown' : 'no actionable tactical change',
      nextEligible: Number.isFinite(nextPlan) ? nextPlan : null, status: requested ? 'requested' : state.routeStatus === 'unfinished-budget-fallback' ? 'unfinished-budget' : 'not-requested',
      fallback: state.routeStatus === 'unfinished-budget-fallback' ? 'known north route' : null,
      availableUnits: budget.remaining };
    return requested;
  }
  function finish(view, chosen, input, cognition) {
    const unresolved = state.planning.requested && !cognition.selectedBranch;
    state.planning.status = state.planning.requested ? cognition.selectedBranch ? 'completed' : 'unfinished' : state.planning.status;
    if (unresolved) state.planning.fallback = 'selected workspace movement; visible clear-line shot or spear recovery';
    state.planning.attempted = cognition.tier === 2;
    state.planning.completedBranches = cognition.completedBranches;
    // A completed rollout is not proof that its weapon command was issued.
    state.planning.weaponIssued = !!(input.throw || input.recall);
    state.planning.selectedRolloutCommandIssued = branchMatches(view, input, cognition.selectedBranch);
    state.planning.execution = !state.planning.weaponIssued ? 'no weapon command issued' :
      state.planning.selectedRolloutCommandIssued ? 'selected rollout command issued before motor noise' :
        'unplanned compatible weapon command; no completed-plan credit';
    state.intent = chosen.broadcast?.content ?? (cognition.tier === 0 ? 'Avoid the observed incoming spear' : 'No selected goal');
    if (cognition.tier === 0) state.reason = 'observed imminent moving spear';
    else if (chosen.focus === 'Threat') state.reason = `${view.opponentSpear ? 'observed' : 'remembered'} spear crossing line`;
    else if (chosen.focus === 'Hunt') state.reason = 'visible target and shot opportunity';
    else if (chosen.focus === 'Search') state.reason = state.evidence.opponent === 'remembered hypothesis' ? 'recently lost target hypothesis' : 'unobserved target; exploratory scan';
    state.planning.actionModel = view.own.spear.state === 'EMBEDDED' ? 'immediate recovery only; delayed recall unsupported' : 'bounded shot hypotheses';
    state.selectedFocus = chosen.focus;
    state.actionSource = cognition.tier === 0 ? 'observed-spear reflex' : 'workspace winner';
    state.requestedInput = { ...input };
    state.arbitration.issued = { throw: input.throw, recall: input.recall };
    state.tacticalScoreLearning = 'disabled: ring points are not shot outcomes';
    return structuredClone(state);
  }
  return { enabled, prepare, arbitrate, branchMatches, request, finish,
    state: () => structuredClone(state),
    move(view, target, planner) {
      const predicted = add(view.own.position, scale(view.own.velocity, .15));
      return planner(predicted, target, view.arena);
    },
    schedule(schedule, view, belief, chosen, monitorRequest = null) {
      return chosen.focus === 'Objective' && !view.opponent && belief.stalenessSec >= 1
        ? schedule.map(item => item.item === 'opponent' &&
          !(enabled.targetMonitoring && monitorRequest?.reacquire)
          ? { ...item, due: false } : item) : schedule;
    },
    safeShot(view, input) {
      const requested = input.throw;
      const target = view.opponent?.position;
      let reason = !requested ? state.arbitration.intended.throw ? 'earlier alignment gate' : 'no shot intention' :
        !target ? 'no currently received visible opponent' :
        !hasLineOfSight(view.own.position, target, view.arena.obstacles) ? 'blocked visible target line' :
        dot(view.own.facing, unit(sub(target, view.own.position))) <= Math.cos(.18) ? 'facing incompatible with visible target' : null;
      if (!reason && state.arbitration.defensive) {
        const aim = unit({ x: input.aimX, y: input.aimY });
        const aimEnd = add(view.own.position, scale(aim, distance(view.own.position, target)));
        if (dot(aim, unit(sub(target, view.own.position))) <= Math.cos(.18)) reason = 'final pre-noise aim incompatible with visible target';
        else if (!hasLineOfSight(view.own.position, aimEnd, view.arena.obstacles)) reason = 'final pre-noise aim crosses cover';
      }
      input.throw = !!requested && !reason;
      state.arbitration.guard = { shotRequestedBeforeGuard: !!requested, shotAllowed: input.throw, reason,
        evidence: 'currently received delayed percept; final pre-noise aim',
        aim: { x: input.aimX, y: input.aimY } };
    },
  };
}
