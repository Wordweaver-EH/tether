# Mind v2: implemented mechanisms and limits

This is an implementation report, not a positive consciousness or performance finding. The broader cognitive-architecture document motivates Tether's experiment; Tether does not implement a personal assistant, neural workspace instrumentation, self-modifying weights, or subjective consciousness.

## Acceptance scope

D14–D17 require finite compute, separable processing tiers, behavior-changing outcome learning, opponent adaptation, counterfactuals, and falsifiable measurements. The implementation provides those mechanisms and switches. Whether they improve play, produce four competence stages, or benefit a workspace under scarcity is an empirical question for the separate final audit reports. A synthetic causal test is not evidence of tournament improvement.

## Processing and finite effort

`createMind({cognitionBudget:192})` accepts integer budgets 16–4096. Every cycle owns a fresh hard ledger. Costs are **declared deterministic logical work units**, not measured CPU instructions, equal runtime, energy, or wall-clock milliseconds:

- 8 units reserve bounded control, observation bookkeeping, specialist proposals, motor planning and adaptation sampling
- 2 units per belief particle update; particle count is `min(48,max(4,floor((budget-8)/4)))`
- 4 units per forward-model hypothesis, with four time steps, at most eight hypotheses per tactic

There is no unbounded planning loop. The reserve combines bounded kernels of different actual runtime; the accounting is a reproducible cost model, not a hardware profiler. Full and ablated arms have the same limit and update-size rule. `noWorkspace` receives the same shared intercept computation, without a fabricated parallel-compute penalty. Workspace superiority or a scarce-to-plentiful crossover is not assumed.

Type 0 is a visible imminent spear-line flinch. It bypasses belief updating, workspace arbitration and deliberation, using a cached belief solely for trace/cheap bookkeeping. Type 1 is the fixed cheap specialist proposal layer and compiled successful tactical habits. Type 2 is a bounded forward-model comparison recruited by conflict, uncertainty, prediction surprise or learned error awareness. All tiers have the same configured sensory delay. Reported decision latency is that real delay; there is no invented additional Type 2 delay. Budget use, rather than fake latency, measures deliberative effort.

## Outcome learning and memory

The contextual table partitions own-spear state, opponent visibility and range. Four tactical choices are direct aim, velocity lead and lateral-offset leads. An attack opens a pending credit window. The next observed score difference within that window supplies reward clamped to [-1,1]; no score for 1.5 seconds is a failed opportunity with reward zero. Rewards update tabular values and prediction-error awareness. This is sparse short-horizon attack credit, not a full causal attribution of every point, terminal-only reinforcement learning, or a claim that all delayed consequences are captured.

Only choices with at least four actual outcomes, positive learned value, and at least two successful Type 2 teaching outcomes can compile to automatic Type 1 execution. Model rollouts update separately named model priors and **cannot themselves certify competence**. `noAutomatization` prevents this cheap execution; it retains learned preferences and model priors for deliberation. `noLearning` disables training and use of learned policy/adaptation.

`memory()` returns version-2 plain data: bounded episodes, legacy player observations, learned table/error awareness, and adaptation state. `memorySnapshot` accepts prior data and validates bounded numeric fields. No code or authority is loaded from memory. Episodes are retained as history; the learned table and opponent model, rather than textual narration, affect behavior. `finish(finalPercept)` settles an observed final score once without another action. Unresolved no-score attacks remain visible as right-censored `pendingOutcome`; callers must invoke finish before exporting memory.

## Percept-only adaptation

Discounted Beta-style pseudo-counts model the sign of observed lateral motion, with bounded integer-shape approximate Thompson sampling. These are visible-motion tendencies, **not labeled observed dodge choices**. Contradictions to a strong tendency reduce accumulated evidence and reopen exploration. Other statistics track visible velocity, fully witnessed embed-to-recall delay, visible facing-turn rate, and approach-to-own-embedded-spear tendency.

Their control paths are respectively lateral aiming probes, hidden-motion extrapolation, threat salience, attention refresh interval, and anchor retrieval. Scan rate and approach rate are estimates of witnessed behavior, not privileged knowledge. Missing spear sightings invalidate recall-delay transition timing. Persistent counts and discounted evidence must not be described as new-match exact sample counts. `noAdaptation` removes these controls while leaving the separate outcome learner intact.

## Counterfactuals

Forward branches start from the current belief particles and public geometry, never a true-world snapshot. A bounded four-step local model advances a hypothetical spear and moving target. Held-spear branches compare direct/lead/lateral aims. Embedded-spear branches compare recall now with holding position for 0.3 seconds and recalling; the latter installs an executable delayed recall plan and freezes planned movement until release. Returning trajectories ignore obstacles as required by the game. Outbound collision approximation, fixed horizon, sensory delay and simplified target dynamics can still make model predictions wrong.

Branches affect selected gaze/throw permission, recall timing and separately stored model priors. `noCounterfactual` evaluates only the attempted tactic and disables model-prior learning; `noDeliberation` removes model simulation entirely. The older `reflect(moment,alternative)` arithmetic and static recall-line note remain compatibility diagnostics, not the evidence for the new counterfactual mechanism. Known alternate physics can be supplied through public `outboundSpeed`/`returnSpeed` options (defaults 12).

## Observation and ablation API

`ABLATION_FLAGS` exports all supported interventions: noBelief, noPrediction, singleUtility, noWorkspace, noHysteresis, noMetacog, noAttentionSchema, noToM, noReflex, noIntuition, noDeliberation, noLearning, noAutomatization, noAdaptation, noCounterfactual, noAffect.

`cognition()` exposes cumulative cycles/work, requested limit, maximum per-cycle work, escalations, reflexes, automatic decisions, actual learning outcomes, model branches, latency sum, per-situation totals, terminal settlement and pending credit. Traces add the individual ledger, tier, situation, tactic, outcome/prediction error, opponent model and branch estimates. Maximum per-cycle and aggregate caps can both be checked independently. Final audit runners should persist source fingerprints, pair seeds/seats/modes, and report uncertainty and nulls.

No claim is made that speech is causally useful, that an attention schema is metacognitive consciousness, or that every indicator in the motivating architecture is implemented. Optional D18 terminal-reward-only emergence/mesa-objective experiments remain outside the completed D14–D17 mechanism implementation.

## Causal regression coverage

`test/cognition.test.mjs` checks every ablation under multiple budgets, true reflex compute bypass, outcome-vs-model certification, persisted habit control of emitted aim, learned error awareness, adaptation/reversal, hidden-transition invalidation, distinct recall branches, malformed-memory safety, idempotent terminal settlement and prediction-ablation isolation. Existing mind/perception/replay tests remain part of the full suite.
