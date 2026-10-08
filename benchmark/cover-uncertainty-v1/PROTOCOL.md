# Cover uncertainty v1: fixed bounded protocol

This is a CPU-only gameplay characterization of a narrowly repaired existing C1/C2 route, not a new architecture, trained skill, consciousness measure, or human-fun test. Freeze source and this protocol in a remote checkpoint before the scored matrix. Correctness pilots use seed 991 and are not included. Do not change policy, thresholds, seeds, endpoints, or sample size after scored outcomes.

## Environment and mechanism

Unmodified ordinary Cover Control, Mode B, 120 Hz simulation, common 30 Hz decisions, full 150 ms percept delay, seeded existing motor-noise formula. Same public percept schema for both actors. No special checking button, shift flag, evaluator truth, opponent internal policy, privileged reset, or payoff designed to award monitoring. Checking consumes gaze, which can sacrifice target alignment/weapon opportunity; cover excursions spend ring time. These costs can be absent in a particular bout and will be reported rather than assumed.

The opponent pursues the ring, settles for familiar stretches, takes a legal circuit around home cover, and sparsely throws only at an observed aligned opponent. Its fixed 12 s clock triggers excursions at +7 s and shot eligibility at +4 s for 0.4 s. In the switch condition, at its received elapsed time 30 s, new circuits reverse from north-first to south-first and shot windows move to +1.5 s. In-progress routes finish; no teleport or immediate forced movement. Familiar control retains the first policy. Here familiar means repeated opponent behavior within a bout, not an acquired habitual policy; tactical learning remains disabled. The subject cannot access the condition, clock threshold, opponent settings, or route phase. The opponent cannot access hidden subject state. The hidden evaluator label is only used for output stratification.

Existing C2 freezes opponent forecasts, assesses fresh delayed observations once due, censors expired forecasts, maintains error EWMA, and requests attention/replanning after fresh large or sustained high error. Existing thresholds, budget and 0.5 s Cover replan cooldown are unchanged. Integrated Objective previously used opponent-derived gaze/shot content but omitted its hypothesis; it now carries the existing Hunt hypothesis only with visible or recent remembered opponent evidence. Beacon-only/ring-only states do not create a target forecast. Search already preserved its hypothesis. A real reacquisition request can now survive stale-objective scan suppression. No new uncertainty calibration is claimed.

## Three paired arms

- full: normal shadow forecasts, feedback and contingent C2 attention/replan control
- monitorOff: identical forecasts, feedback, C1 content, nominal monitor reservation, and ordinary changed-situation replanning; only C2 control delivery is cut
- fixed: monitorOff plus the same reacquisition/replan request paths on every 30th decision opportunity, phase zero, independent of reliability or switch. Reflex/budget-inactive opportunities are skipped, not deferred. Cover actionable/cooldown rules still apply

The fixed comparator is a predeclared one-second opportunity schedule, NOT matched actual compute. All arms have the same 192-unit cap and 16 nominal coordination reservation. Report realized requests, completed/unfinished planning and logical units; no equal-compute claim. Fixed pulses may cause extra useless checking; their rate will not be fitted to scored outcomes. The old Integrated controller remains a correctness/exposure reference, not a fourth scored performance arm.

## Frozen matrix and endpoints

Seeds 5653, 6761, 7873, 8923; both subject seats; familiar and switch; all three arms; 60 s each: 48 bouts (four independent seed clusters, not eight independent seat replicates). Fresh controller state each bout. No tactical score-credit learning. Persistent reliability updates within a bout remain active; no artificial transfer or seeded memory.

Primary exploratory effect: paired subject score-margin difference (full minus monitorOff), separately by condition; difference between those differences for switch versus familiar. Report all per-seed/seat values and seed-cluster means. Fixed comparisons contextualize extra or targeted work; this small matrix is descriptive, with no significance/general-strength claim.

Secondary actual goals: subject/opponent hit and ring points, ring occupancy and contested time, accepted throws/recalls. Process by pre/post nominal 30 s boundary: legal visibility and visibility losses/reacquisition, selected target packets/forecasts/assessments/censoring, fresh error >0.5, error EWMA recovery from high to low (right-censored intervals retained), monitor requests, actual planning attempts/completion, declared logical work, checks whose emitted pre-noise aim matches requested attention target, checks aimed away from a currently received visible opponent, and checking outside ring. These are operational proxies, not a privileged declaration of intent or proof that a particular check caused a score.

Stale-belief error is evaluator-only distance from the controller's delayed-percept working-belief mean to opponent truth at the SAME sensor time when opponent is unobserved and a finite prior evidence age exists. Also report command-time error separately; do not confuse sensor delay with belief error. Denominator/count, mean and >0.5 count are reported; forecasts and truth never return to agents. Recovery latency is from first observed high-error state to next assessed low-error state, conditional on receiving evidence; censoring is not successful recovery. Post-switch metrics use nominal clock, while completed-route switch timing is retained in opponent diagnostics where available.

## Integrity and stop

Before scores: source-manifest freeze, focused fixtures, application tests, exact old-controller comparisons, neutral geometry/correctness pilot. Runner refuses nonempty output paths and verifies frozen source before/after. Retain complete commands/events plus compact decisions, sensor-time and command-time evaluation positions, initial/final world, periodic world hashes and per-log hashes locally in a separate evidence directory. Replay every bout and reconcile scores. Publish only code/protocol/small summaries via parent; raw upload remains canceled. No PR-body change, merge or deployment. Stop after this matrix and report negative/inconclusive findings without tuning or extra seed search.

The three-arm gameplay comparison tests C2 control usefulness/timing. It has no C1 content-delivery lesion and does not newly establish a causal C1 gameplay benefit; packet exposure alone is not that evidence.

Stale-error and recovery aggregates come from different closed-loop trajectories and evidence opportunities across arms. They are on-policy diagnostics with explicit denominators, not matched counterfactual errors. The runner's checkpoint argument is a provenance assertion; the publishing parent independently verifies that exact remote commit before authorizing score mode. The 8 s telemetry pilot is complemented by a 50 s neutral geometry test that crosses the switch and checks actual route adoption without scoring the subject.

New Integrated sessions identify as cover-integrated-mind-v3; the old-wiring compatibility option retains v2. Replay continues rendering v1/v2/v3 recorded traces and replaying their logged inputs. This is metadata provenance, not a browser-play validation.

Prediction errors can follow ordinary hit/reset teleports as well as route changes. Count assessments and >0.5 discrepancies occurring within one sensor-time second after a HIT separately; this evaluator-only tag never reaches controllers. Do not attribute all monitor activity to the tactic switch.
