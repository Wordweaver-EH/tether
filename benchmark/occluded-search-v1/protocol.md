# Preregistered Cover Control occluded-search diagnostic v1

Status: specified before any scored policy run. This file and the scene,
controller, interface and runner sources must be hashed together before scoring.
Geometry-only checks are allowed before that freeze. The conventional tracker
settings below are fixed before scoring; do not tune them to outcomes.

## Question and permissible claims

Does prior target observation in the existing mind improve useful physical
reacquisition after real cover occlusion, compared with a matched broad cut to
target-history pathways? This is a short functional behavioral assay, not a
tournament, consciousness test, evidence of subjective experience, or proof of
general intelligence. The full existing mind pair gates the primary claim.
An isolated particle-belief pair is secondary; its success cannot rescue a
failure of the full-mind primary gate. A conventional tracking controller tests
whether ordinary tracking can explain equivalent or better task performance.

No new mind mechanism, additional pretraining or cross-scene training,
outcome-driven scene filtering, held-out tuning, or retry with changed thresholds
is permitted. Ordinary online learning inside each fresh full-mind episode is
retained. The allowed implementation change makes missing-body negative evidence
respect static line-of-sight in the already optional Cover mode. Default Duel
semantics must stay unchanged. All controller settings and that correctness
change precede the scored freeze.

## Fixed scenes and independent construction

`scenes.mjs` imports only simulation, perception, geometry and Node hashing. It
does not import a policy, inspect behavior, or select cases by score.

- 32 scenes: WEST/EAST cover × north/south entrance × outer/inner observer
  side × four jitter replicates
- 16 independently keyed geometry draws: entrance × observer side × replicate
- Each draw produces an exact WEST/EAST mirror with swapped player seat; these
  two scenes are one dependent cluster. Overall seats are balanced 16/16
- Independent draws use SHA-256 keyed by the new fixed construction seed
  `2026-10-05-heldout-geometry-8f19c72b`. The integer label "replicate" alone does
  not share randomness across entrance/side strata
- Observer edge clearance 0.42–0.50 units and horizontal clearance 0.90–1.35;
  target clearance beyond the opposite wall face 0.65–0.85
- Compute the target-path tangent from the observer and the tangent from a
  legal near-corner reveal point with 0.55 clearance. Choose an integer physical
  stopping tick strictly between those tangent lines, approximately 65% through
  their separation. This guarantees hidden-at-start and a reachable revealing
  viewpoint independently of policy outcomes
- Target moves at the normal 4 units/second along the opposite cover face. Its
  start is 2.4 units before the original tangent. It stops after 73 or 74 ticks
  and remains stationary. Only tick-zero initialization changes positions;
  every later change comes through ordinary simulator inputs
- Cover Control geometry, body radius, turn limits, collision rules, and public
  objective stay unchanged. No target passes through a wall. Neither target
  script nor reveal-point coordinates cross the controller percept boundary

The construction is intentionally a narrow, shallow-corner active-search assay.
It ensures a useful reveal point exists; it does not prove all hidden paths are
easy. Existing `planMove` can stall near its selected corner. Such a policy
failure counts as a failure, never a reason to replace a scene.

Geometry-only checks performed before scoring must pass for every case: legal
body positions and swept path, actual target motion agrees with prescribed
4-unit/second motion, at least 12 initially visible sampled percepts, loss is
line-of-sight occlusion while the target remains inside the field of view,
at least 18 physical ticks of forced loss before release, target stopped by
release, radius-clear direct movement to the reveal point, clear line-of-sight
there, and no spontaneous stationary-observer reappearance for 360 ticks.
The present fixed cases each have 18 visible samples, first loss at tick 72,
first missing sampled frame at 72, and release at tick 90. An unexpected geometry
failure aborts the preregistered run; it is not silently replaced.

## Common embodiment, setup, and release

Use the complete genuine MODE_B percept, including public map and objective.
Only ordinary percept fields may reach controllers. Evaluator ground truth is
available solely for validity checks and outcome measurement.

All arms receive the entire percept delayed by 18 simulation ticks (150 ms),
act every four ticks (30 Hz), and use the same predeclared motor samples paired
by scene/seat/decision. Aim-noise formula: base 0.034 + 0.0075 times angular
speed, capped at 0.18. The simulator runs at 120 Hz. Do not double-delay the
mind or add internal motor noise on top of the common wrapper.

Before release, run each controller and its complete interface normally, but
discard its physical output. Hold the observer stationary with a fixed
horizontal facing toward the opposite cover face. This fixed setup gaze never
reads target state, and the complete visible path remains within its cone.
The moving target follows the fixed scene script. Disable throw and recall for
all arms in the search assay; ensure the controller's deferred-command bookkeeping
receives the actually emitted no-weapon command, not an unexecuted throw. The
existing online-learning ledger may still record intended throws; it is not a
verified record of executed weapon use or learning from physical search success.

The first missing decision is determined from the fixed setup scene, not each
policy. Let `firstMissingSampleTick = 4 * ceil(firstOccludedTick / 4)`.
Release occurs at `firstMissingSampleTick + 18`; the interface's decision at
that exact physics tick therefore receives the first genuinely missing target
percept. Apply its physical output from that tick onward. Thereafter the observer
is autonomous and the target stays stopped. Score through exactly 240 elapsed
physics ticks (2 seconds) after release, inclusive of the decision at that final
state. There are 241 state frames from release through release+240, with no extra
physics step after the endpoint. No per-arm lost-target qualification or exclusion.

The terminal decision at release+240 is issued and logged, but has no following
physical step. Raw `physicalStepFollows` marks this distinction; the terminal
command columns describe issuance, not movement after the observation deadline.
Every raw episode preserves initial controller settings and embodiment settings;
the frozen intervention code defines the subsequent hidden-only switch changes.

## Five fixed arms

All minds are fresh per scene, normal difficulty, 192-unit declared cognition
cap, no carried cross-scene snapshot, and standard prediction and control
mechanisms unless specifically cut below. Report the work ledger; nominal
logical-work equality is not exact operation-count or wall-clock equality.

1. Full existing mind, including its ordinary coordination, learning and target
   memory. Do not use `freezeLearning:true` here: it also disables writes to the
   episode-local target memory and would change the intended full-mind question
2. Full mind with a broad hidden-only target-history cut. On received hidden
   percepts enable existing `noBelief`, `noToM`, and `noAdaptation`, and set
   coordination controls to `memoryRead:false`, attention/planner deliveries
   false, and `monitorControl:false`. Restore the normal switches on visible
   percepts. Visible-prefix behavior must match the intact arm exactly
3. Isolated existing-mind profile: coordination disabled, `noToM:true`, and
   `freezeLearning:true`, otherwise unchanged
4. Same isolated profile, with existing `noBelief` enabled only when the
   received target is absent. Restore normal visible updates
5. Fixed untrained conventional last-observation/constant-velocity tracker.
   Store the latest observed body position, velocity and sensory time. While
   unseen, extrapolate by elapsed sensory time without an extrapolation or
   memory-age cap, then apply existing `legalPoint`. Route using existing
   `planMove` and aim directly at that target. Without any observation, movement
   target is `(own.x > 0 ? -2 : 2, sin(now*0.4)*3)` and gaze angle is
   `now*PI*0.7`. No additional latency compensation. Use the same delayed
   percept timing, cadence and noise. Declared work cap 192, nominal work 16
   units per decision; actual compute is not matched. The exact source joins
   the pre-score freeze; no selection among tracker variants. This one simple
   control is not a test against the strongest conventional tracking algorithm

The full cut is intentionally broad. It changes particle persistence, inferred
uncertainty/confidence, remembered spear status, target-facing inference,
adaptation use, delivery and monitoring, and cognitive RNG consumption. It
does not surgically remove every history-dependent control variable. Differences
support usefulness of these combined target-history routes, not an attribution
to a single episodic module, a pure position register, or a unique architecture.
The isolated pair more narrowly probes particle-belief dependence but still
changes uncertainty and RNG paths. Report all caveats with the result.

## Outcomes and fixed primary gate

Success requires the release decision to receive a missing target and then
receive the genuine target body on at least three consecutive 30 Hz decision
opportunities by the two-second deadline. Physical visibility at an evaluator
tick alone is not success. A missing decision resets the consecutive count.
For latency, use the receipt time of the third confirming sighting minus the
release time; failures receive the cap of 2.0 seconds. Record first sighting,
confirmation receipt, movement, visibility history, and failure reason as
secondary diagnostics. A score or hit is not a search-success surrogate.

The primary functional-positive claim requires ALL:

1. Full intact sustained-reacquisition success rate ≥70%
2. Paired full intact minus full cut success advantage ≥20 percentage points
3. Paired mean capped-latency improvement (cut minus intact) ≥0.20 seconds
4. The 95% paired cluster-bootstrap interval lower endpoint for that mean
   latency improvement is strictly above zero
5. Both negative-control gates below pass

Average both mirrored scenes within each of the 16 independent geometry
clusters. For intervals, resample four clusters with replacement within each of
the four entrance × observer-side strata; keep every sampled cluster's mirror
pair and every controller together. Use 10,000 bootstrap draws, deterministic
seed `0x71cb234f`, percentile 2.5% and 97.5% endpoints, with linear interpolation
between adjacent order statistics at index `(draws - 1) * p`. This interval describes this fixed scenario
distribution; it is not evidence of generalization to all Cover play.

Report all five arms and paired effects. Intact superiority over the conventional
tracker is a separate stronger claim: apply the same ≥20-point success,
≥0.20-second latency and positive interval gates to that comparison. If this
comparison fails, say that an ordinary tracker matches or exceeds the measured
benefit, or that superiority was not demonstrated, according to the estimates.
Never use the secondary isolated pair to claim the full mind passed.

## Negative controls and claim invalidation

Run each control for all 32 fixed scenes, using full intact and full cut only.

- Always-visible: use MODE_A with the same physical setup/release clock. Since
  the hidden-only switches must never engage, the two arms must have identical
  commands throughout the run. Any command divergence invalidates the matched
  intervention/embodiment claim and triggers an implementation investigation
- Never observed: before the first missing scene sensory timestamp, redact both
  target body and held target spear before the common delay queue. Preserve
  ordinary own-state, map, timing and public beacon fields. Afterward restore
  ordinary perception, so useful search can still lead to real reacquisition.
  The fixed setup facing contains no hidden target bearing. This is an explicit
  synthetic history-redaction control, not a natural game episode. It supports
  the attribution guard below, rather than assuming a broad pathway cut cannot
  also affect ordinary priors in a never-observed episode

The history-attribution guard requires all three:

1. Seen-history full mind improves over never-observed full mind by at least
   10 percentage points in success and 0.10 seconds in mean capped latency
2. The seen-history full-versus-cut advantage exceeds the never-observed
   full-versus-cut advantage by at least 10 percentage points in success and
   0.10 seconds in mean capped latency (paired difference-in-differences)
3. The 95% bootstrap lower endpoint for the latency difference-in-differences
   is strictly above zero, using the same stratified 16-cluster procedure and
   retaining all four paired outcomes within every resampled scene

If either control fails, do not present a primary positive effect as specific
evidence that prior observation caused useful remembered-target search. Report
the failure even if the main effect is large. An uncertainty interval spanning
zero alone does not establish negative-control equivalence.

## Bound, provenance, and reporting

The scored allocation is fixed: 32 × five primary/secondary arms, plus
32 × two arms × two controls = 288 episodes, each 90 setup + 240 elapsed scored
ticks and the inclusive terminal decision frame.
Use a fixed deterministic run order or record the full order. Geometry validation
and code/unit tests are separate from scored outcomes. Preserve every raw row,
source hash, scene digest, controller setting, interval setting, runtime version,
and the final report. Do not rerun changed policies on this held-out set and
present the second pass as preregistered evidence. An implementation bug found
after scoring must be disclosed; affected results are invalidated and a new
independent preregistration is needed for a replacement performance claim.

State explicitly whether each gate passed, failed, or was not run. Null or
negative results are valid outcomes. Avoid replacing this behavioral question
with attractive traces, memory-wiring tests, a revised benchmark, or claims
based only on the successful scenes.

Recovery note: the execution filesystem reset before any scored outcomes were
run. Scene source was reconstructed byte-for-byte and verified against its
pre-reset SHA-256; expected scene digest remains
`ca1851915c13cd65641cb7a8d617533591280df132738e4999260083adcae4d2`.
This protocol was reconstructed with the already agreed settings and explicit
clarifications about ordinary online learning, pre-queue history redaction, and
intended-versus-executed throw bookkeeping. A new full source freeze is required
before the first scored run.
