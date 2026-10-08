# Prospective checking-value training and development protocol

Status: independent source review cleared fixed training and operational pilot; scored execution remains unauthorized. The scorer is implemented but has not been released or run.

## Scope

This opt-in experiment learns the allocation decision continue / check / reconsider. The task has an explicit restricted-processing gate and artificial but physically enacted action-time costs. It is not ordinary Tether perception, a v2 performance improvement claim, learned tactical habits, or general cognition. All prior source and evidence are preserved.

The common controller is a fixed north-route ring routine, stored-velocity aim, stale-memory throw cutoff, and legal own-spear recall. Every arm gets current own body/spear, public map/time/objective/score and a free opponent-processing sample each 1 s. OrdinaryRefresh instead processes every delivered legal opponent percept for free and has no embargo: it is an adequate-sensing diagnostic outside the paid-processing regime. No claims depend on excluding it.

## Actions and costs

At delayed sensor times 0, 3.2, 6.4, ... 60.8 s, choose exactly one of three actions. There are 20 fixed 3.2-second windows, with final endpoint sensor time 64 s. The simulation runs 7,699 ticks so that the final delayed observation is available. Trailing 0.15 s of unobserved simulator progress is reported only in the final-world diagnostic, not silently added to training reward. A new action is not selected at terminal endpoint.

- Continue: cached routine, normal motor execution; no extra processing or rollouts.
- Check: process the delivered legal opponent percept for 12 controller ticks (0.4 s); first three ticks (0.1 s) suppress movement and throwing. This buys processing of already-delivered data and potentially later gaze-dependent data. It never gives through-wall observations or an oracle. One unit of extra work is charged for each non-passive processed sample, including a legal absence. The immediate sample does not imply check-caused new visibility.
- Reconsider: no extra sensor acquisition. Perform 10 candidate directions × 12 geometric trajectory steps over 0.6 s, using cached belief, own state and public geometry. Select the highest fixed ring/route/threat utility and retain it for up to 24 ticks (0.8 s). First six ticks (0.2 s) suppress movement and throwing. Exactly 120 actual trajectory evaluations are charged. The planned 0.6-second movement horizon matches 0.8-second plan validity less the 0.2-second embargo, but uses the delayed own position and approximate fixed threat geometry, not an exact simulator. Request/completion, changed plan, and non-embargo changed movement ticks are separate.

Free passive sample occurs before pre-action features. 96-tick allocation periods and 30-tick passive periods produce phases 0/6/12/18/24 rather than coincident refresh at every choice. Check acquisition occurs after feature extraction and assignment. The artificial embargo is not added again as a reward penalty: its opportunity cost already acts through the game. Extra executed operation price is 0.0005 score units each, a declared preference rather than a physical exchange rate. Report task score and priced objective separately. Runtime records distinguish whole bout CPU/wall and subject-interface wall time including telemetry.

## Feature / outcome boundary

The generic model receives 13 bounded features: known belief, normalized age, declared age-and-speed uncertainty proxy, remembered target distance and angular gap, remembered speed, own held/outbound spear, own distance to objective, moving routine flag, previous check/reconsider action, and remaining plan duration. No residual-fitting reward, current unprocessed opponent field, hidden simulator truth, opponent diagnostics or desired-action oracle is used. Current public score is used only for outcome endpoints and observable reset inference, not as a target-identity leak. Reset clears cached belief and plans.

Primary evaluation is raw PUBLIC TOTAL SCORE MARGIN; cost-adjusted utility is a separate secondary evaluation measure and the training target. Training reward is endpoint minus starting PUBLIC TOTAL SCORE MARGIN, less the declared extra-operation cost. Total score includes ring awards intentionally. This is not a hit label. Full raw simulator logs separately retain hit and ring events for evaluation-only accounting; they never enter fitting. The adapter outputs training windows independently of simulator event access.

Training assignments are uniform probability 1/3 using an independent seeded RNG. All 960 windows from 48 bouts are retained, including zero outcome, reset, missed acquisition, unchanged plan and carryover projectile outcomes. A window estimates finite-horizon action value conditional on state under randomized behavior. Previous projectiles and plan effects can carry over; this is randomized intention-to-treat, not isolated per-shot causal attribution or lifetime Q-value. No intervention occurs between choices. A later full frozen-policy evaluation is necessary for cumulative value.

## Split, fitting and controls

Exact seeds and family names are in experiment.mjs and opponents.mjs. Train: 12 seeds × both seats × stationary/orbit opponents = 48 bouts in 12 seed clusters. Families and seats share seed clusters; same seed-seat assignments use the same randomized stream across families. Development: 3 seeds × both seats × weave family. Evaluation, not run: six untouched seeds × both seats × reactiveOrbit/reactiveFlank families. Training and development never execute evaluation families. Family code uses only ordinary legal percepts; reactive families add fixed threat-responsive dodging, and reactiveFlank changes radius over time. This is a small distribution shift, not broad generalization.

Ridge strength 1, feature schema and operation price are fixed before training. Fit three separate action value regressions with an intercept. Frozen policy chooses highest value, ties continue then check. No online updates. A second model uses globally shuffled training rewards with a fixed independent seed; it retains features, assignments and row counts. No fitting on development or scored outcomes.

Development matrix: learned, frozen v2 monitor mapped to check requests under the new adapter, no extra checking, individually count-matched check and reconsider schedule, always costly check, shuffled-value model, ordinary free refresh diagnostic. Count matching permutes only the donor action multiset using an independent seed, not donor event times. It matches interventions by type; executed acquisitions and command changes can still differ and must be reported. Monitor has no reconsider actuator preference, reflecting the prior rule.

Pilot purpose is functional: valid features/reward boundaries, action support, nonzero actual actuator effects, exact cost accounting, replay and model freezing. Pilot need not win. Report fixed training-budget 12/24/48-bout learning curves on separate randomized development bouts, with rows clustered by bout/seed and no false independence claims. Do not retune to pilot wins. Record model/source/data hashes and preserve raw logs. Independent audit and explicit parent release are required before running the implemented scored command.

## Required causal checks

Changing unprocessed opponent fields must not change continue commands/features. Reconsider must not process extra opponent observations. Check must use only ordinary legal percepts. Scores containing only a ring point must remain task reward without a false hit/reset label. Schedules must match each intervention count. Every window must have full endpoint exposure. Replay inputs must reproduce world hashes and separated event accounting. Old files must match their baseline hashes, and full repository tests must pass.

## Final exploratory heldout plan (not yet run)

Six new seed clusters × two seats × two untouched reactive opponent families × seven allocations = 168 bouts / 3,360 fixed windows. Prioritize learned versus individually count-matched schedule, shuffled values and no-extra-processing. Retain always-costly-check and ordinary-free-refresh diagnostics. Keep the zero-dose mapped old monitor as a descriptive comparator only; no superiority to active monitoring claim is permitted. No post-pilot tuning is made to policies, costs, features or opponents.

Report every seed × family × seat result, raw public margin first, priced utility second, then action counts, actual acquisitions, operation counts, embargo seconds, completed/changed planning and separate simulator hit/ring totals. Paired policy differences are clustered by seed across both seats and families; only six clusters exist. Report mean and all six cluster differences, including negative results, without treating 3,360 windows as independent policy replications or claiming confirmatory significance. Family-specific results remain exploratory. OrdinaryRefresh measures the handicap imposed by the new processing regime and must lead interpretation.

The scorer requires the saved source freeze, exact full training-bundle SHA256 and an explicit verified parent-release reference. A local command-line flag is only a provenance record and cannot grant authorization. Source changes to reporting/scorer metadata after pilot are recorded separately; no prior execution is overwritten. Runtime estimate from development is approximately 91 seconds in simulation plus compression, audits and tests, so budget several minutes rather than treating that estimate as a guarantee.
