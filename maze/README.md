# Tiny headless maze transfer

This is an **honest module-reuse prototype**, not a transfer of the full Tether controller or learned competence. Default Tether is unchanged. Run with Node 24:

```
node maze/run.mjs full familiar
node maze/run.mjs full switch
node --test test/maze-transfer.test.mjs
```

The terminal displays a completed deterministic simulation: P player, G ghost, X caught player, dots pellets. This is not an interactive or complete Pac-Man game. It has one ghost, pellets, walls, competing survival/foraging/inspection goals, and partial visibility. There is no browser, training, power pellet, respawn or second full game.

## Exact unchanged computation reused

- `src/mind/workspace.mjs`: `createWorkspace().choose`, `appraisalControl`, existing focus competition, ignition, hysteresis, channel routing. Neutral appraisal; maze objectives use existing move/gaze channels.
- `src/mind/coordination.mjs`: complete `createCoordination` begin/broadcast/attend/plan/finish pipeline; `projectContentBelief`, `coordinateAttention`, content cuts, memory read/write controls, monitor feedback/control cuts, fixed schedule and reports. No cloned implementation.
- `src/mind/content-broadcast.mjs`: exact canonical packet validation, lineage, TTL, override constraints, recipient delivery gates.
- `src/mind/target-memory.mjs`: exact bounded episode memory, original evidence identity, extrapolation, expiry, uncertainty growth and recall delivery cut.
- `src/mind/prediction-monitor.mjs`: exact frozen forecast, due/expiry handling, fresh-observation discrepancy, EWMA, fresh/high-error request and feedback/control distinction.
- `src/mind/cognition.mjs`: `createBudget` only; its combat learner and rollout code are imported dependencies but NOT exercised.
- `src/mind/math.mjs`: geometry, legal projection and seeded PRNG helpers.

`benchmark/maze-transfer-v1/source-manifest.json` records exact source SHA-256 and function line spans. All 44 files in the preceding cover-uncertainty frozen source manifest were verified unchanged before work. No existing production file is edited.

## Real domain/core boundary and coupling

New domain code supplies grid geometry, public pellet map, sensor, cardinal movement/gaze, a minimal static local sensor trace, goal specialists and a 25-branch two-step planner. The planner scores pellet collection and predicted collision/distance, plus a public-grid food-distance BFS. It knows only observed velocity and a constant-direction, wall-stopping ghost model. The controller holds a two-step action cache; monitor control can invalidate it and redirect sensing. This is new world knowledge and skill, openly implemented rather than learned or claimed to transfer.

The existing full `createMind` cannot plug into this maze: its input contract, specialists, belief, affect, reflexes and rollouts assume continuous spear combat, scores and spear states. `createLearning` and novelty support validate `HELD|OUTBOUND|EMBEDDED|RETURNING` and `lead|direct|left|right`. We do not relabel maze states/tactics as those combat states. We do not claim to reuse their tactical learning, automatization, novelty detector, attention-schema model, affect dynamics or counterfactual learner. The broad motivating architecture document is an ambition, not a description of modules present here.

The content/monitor schema supports only the literal `opponent` for monitored bodies. **Exactly one ghost is mapped to that referent.** This is a genuine cardinality/schema coupling; multiple ghosts or pellet referents would need an explicit schema/core change. No general adapter framework is introduced.

## Observation, time and inherited assumptions

One tile is one world unit. One decision/simulation step is 0.5 seconds; ghost/player speeds are at most two units/second, below the inherited target-memory body bound of four. Existing content TTL = 1 second, forecast due = 0.3 seconds, forecast expiry = 1 second, error threshold = 0.5 world units, EWMA alpha = 0.25. These are unchanged and not calibrated for the maze. A fresh assessment can occur at the next 0.5-second sample.

The grid layout and remaining pellets are public. Ghost position and velocity are returned only on an unobstructed same row/column, within six tiles and in the gaze-facing half-plane; an adjacent ghost is visible regardless of facing. No sensor delay or observation noise is added in this tiny domain. All arms have this same observation/action contract. Policy, seed, switch condition and hidden position are absent from the percept. Evaluator-only state never returns to the controller.

The local belief retains a static last-seen position for at most one second, with confidence 0.25. The reused episode memory can supply a velocity-projected hypothesis and inherited radius through selected content. This additional local trace is disclosed: memoryOff is not total amnesia. The conventional control has the same one-second history, a straightforward linear tracker with the same inherited legalPoint projection, threshold goal switch and periodic replanning, without workspace or coordination execution.

Limitations: inherited `legalPoint` projection is continuous rectangle geometry and can yield off-center positions; the planner rounds to a cell and ignores a projection that rounds into a wall. Memory linear extrapolation can cross intervening walls, while planner future prediction stops at walls. Radius grows conservatively but this planner does not use it as a calibrated risk distribution. These limitations may make recall unhelpful. Hidden ghost plans and future junction choices are never supplied.

## Causal scope and budget

The Inspect candidate has no demonstrated selected-focus role: its modest salience cannot displace established Forage/Threat under current inherited hysteresis. Actual checking here comes from content/monitor scheduling.

The full path runs real workspace selection and uses its selected goal for planning. Selected ghost content changes actual attention and planning inputs. Existing monitor requests invalidate cached actions and target gaze. Fixtures compare emitted actions under controlled cuts and content interventions, not merely packet counts. Such fixtures establish functional causal routes, not consciousness, human-like access or general intelligence.

All arms have the same 64 nominal-unit cap, 8-unit control and 16-unit coordination reservation (including the conventional arm), and at most 25 one-unit two-step branches per replan. Food BFS is fixed public preprocessing and explicitly reported by visited cell count; nominal units are NOT CPU-operation matching. The conventional arm does not secretly execute coordination: its equal reservation is a cap convention. Fixed control uses every fourth tick, not rate-matched actual invalidations; a request with an empty cache has no invalidation cost. Actual logical work, replans and invalidations must be reported.

Only pilot seed 991 was used during implementation. It exposed an original far-ghost setup with no selected packets; the start was changed to (4,1) before freeze to exercise the interfaces. The main start is now player (1,1), ghost (4,1). Do not present that pilot as held-out performance.
