# Robustness embodiment interface: synthetic preflight only

This code supplies equal observation/motor rules, not equal total computation. It contains no benchmark run, training selection, held-out configuration, or outcome claim.

## Source identity

Original production bytes: published commit `0a810b6c1edd291417a9c9f3d42984264445110e`, all-src fingerprint `d490afd30119c0d6bfe03373055aeb21a797c6138f1ee744961988238b8948e7`. The durable `fixtures/robustness-original/src/` is the byte-frozen comparison source. The local publication checkout has no Git HEAD; the publication receipt and recomputed per-file source manifest identify its contents. Do not conflate the broader arena audit fingerprint with the all-src fingerprint.

## Fixed external I/O contract

- 120 Hz consecutive simulation packets starting at time zero, 150 ms latency (18 ticks), 30 Hz decision schedule starting on tick 18 and then every four ticks
- Exact 150 ms age at each decision; no second internal queue/cadence
- Same original public perception schema, cloned at capture; extra metadata is dropped. Seat-specific observations can differ because visibility differs; delivery rules do not
- Public controller projectile assumptions remain 12/12 throughout; no shift truth argument. Geometry comes from the public percept. Evaluator truth must stay outside controller input
- One common angular motor transform: Gaussian sample times `min(.18, .034 + .0075 * abs(wrapped desired-angle delta) * 30)`; previous desired angle starts at zero. Zero aim leaves previous angle unchanged
- Gaussian samples are SHA256 counter-addressed by version/episode/seat/decision via Box–Muller. The same episode/seat/decision uses the same sample across focal arms. This is reproducibility, not a cryptographic claim
- Original internal motor RNG draws are still consumed to preserve shared cognitive RNG advancement, but their motor effect is suppressed in benchmark mode. There is only one applied motor-noise transform
- Continuous controls are held between decisions; throw and recall exist only on the decision’s one simulation frame
- Both native controllers support deferred command-memory commit. The wrapper commits the final externally noised motor action with receipt timestamp. Param throw cooldown advances only on actually committed throws

## Factories

`createBenchmarkController('mind', {seed, mindOptions})`, `createBenchmarkController('param', {seed, vector})`, and `createBenchmarkController('robust', {seed, vector, level})` provide fresh episode state. Vectors are copied, never updated in-episode. Mind options are allowlisted; hard difficulty and changing controller physics are forbidden. The conventional planner is a separate new baseline module, not a change to mind mechanisms.

`createInterface(controller, {episode, seat, diagnostics, calibration})` exposes act, metadata, records, calibrationRecords and finishCalibration. Record extraction clones data; diagnostics have no controller feedback. Calibration requires captureDiagnostics on the mind. Runtime/memory measurement belongs to the experiment runner, not this I/O preflight.

## Calibration provenance

Native primary calibration (`calibration: 'native'`, or true) copies actual `cognition().pendingOutcome.predictedFailure` at issued learning records, and pairs the completed native outcome by exact situation/tactic/time identity, verifying the forecast is unchanged. Outcome is sparse score credit, not physical-hit probability: failure is one unless net score reward is positive, settled on the first nonzero net score change or after 1.5 percept-clock seconds. Terminal pending records are censored, not assigned failure.

Explicit shadow calibration (`calibration: 'shadow'`) copies the existing selected habit forecast and mirrors the single-pending settlement rule without feedback. This is for frozen/noLearning diagnostics only; rows carry `origin: evaluator-derived-shadow` and `primaryCalibration: false`. These are not native learning records, and noLearning’s zero forecasts are not an independently learned probability estimate. Native rows carry `origin: native-pending` and `primaryCalibration: true`. Never pool these origins. Prediction-monitor spatial error EWMA is not a probability and is never used here.

## Validation

From `repo/`: `node --test benchmark/*.test.mjs`. Fixtures provide synthetic, open-loop percept streams; no match outcome/search is executed. They check published-default exact action/state parity, shared RNG advancement, latency/cadence, noise addresses/law, pulses, legal packet copying, fixed vector/reset, actual-action commit, calibration and diagnostic noninterference. They also include the conventional planner’s separate synthetic checks. Passing these tests does not demonstrate robustness, game fun, causal functional benefit, or equal compute.

## Parent-authorized control-removal hooks

Broadcast cut uses the existing coordination delivery switches for attention/planner/memory, retaining coordination/projection work and report delivery. Fixed-teacher metacognitive cut requires benchmark mode, `noMetacog:true`, `monitorControl:false`, and a frozen `{every,phase}` schedule. The schedule index is all decision cycles, not condition-dependent eligible cycles. Deliberation is requested at the fixed index, subject to existing reflex/noDeliberation/budget exclusions. It cannot consult uncertainty, novelty, or monitor requests. Existing learning and completed-branch eligibility remain unchanged. Diagnostics distinguish scheduled due, nonreflex opportunity, realized tier-2 attempt, branch completion, and actually issued teaching action; equal teacher examples are not claimed. Training-only schedule calibration and final phase selection belong to the protocol runner; no schedule is estimated by these unit tests.
