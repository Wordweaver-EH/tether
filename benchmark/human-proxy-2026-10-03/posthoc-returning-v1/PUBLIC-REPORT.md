# Tether returning-HIT diagnosis: saved-evidence posthoc v1

## Result

The strongest identified failure mode is **blind-side return detection**, not predominantly a recall-to-hit interval shorter than the counter's 250-ms sensor delay. This is a descriptive posthoc diagnosis of the same 64 frozen bouts, not a new experiment. The original practical-margin result remains **inconclusive**; it does not release either conditional follow-on branch.

Of ordinary's 1,178 RETURNING HITs against the counter:

- **44 (3.74%)** occurred less than 250 ms after recall. Median recall-to-impact was **746 ms**, IQR 661–830 ms, P10–P90 462–852 ms
- Accounting for the 30-Hz decision phase, **48 (4.07%)** landed before any post-recall RETURNING packet could arrive, even if visible. The other **1,130** had time for such a packet
- **All 1,178** had no visible RETURNING spear in the reconstructed decision-sampled percepts before impact, including samples too late to arrive before impact. All were outside the victim's cone at recall start, and all approached from behind its facing at impact
- No returning-threat diagnostic was active at impact, or in an eligible received RETURNING packet before those hits

The counter's 507 RETURNING HITs against ordinary had a different timing profile: median **43 ms**, IQR 18–76 ms, P10–P90 4–127 ms; all 507 were under 250 ms, and **470 (92.70%)** under ordinary's 150-ms delay. Decision phase raises the count before any post-recall packet to 481. These hits also had no visible RETURNING spear at decision-sampled times. These hit-conditioned distributions do not establish that every such hit was unavoidable: movement or recognition before recall can matter.

## Why the visible-return dodge did not help here

Frozen `human-proxy/counter.mjs:57–65` checks a threat only when the **current delayed packet contains** an OUTBOUND or RETURNING enemy spear. It then projects that spear 3 units (12 units/s × 250 ms) and applies its along/side thresholds. Enemy-spear memory is used for the short away-window heuristic at lines 37–39, not to drive this threat branch after visibility is lost. Aiming at the estimated opponent, lines 43–46, does not itself scan for a rear spear.

The recorded study has 181,876 counter decisions whose underlying enemy spear was RETURNING; 100,899 reconstruct as visible. **Zero** generated a returning-threat diagnostic. Thus the earlier 30,293 successful threat-to-dodge manipulation checks concern outbound threats. This does not overturn their structural validity, but they provide no empirical evidence of an exercised returning-threat dodge in these bouts.

For the 1,178 failures specifically, absence from the percept is the identified gate. The fixed-speed projection never received those return trajectories as visible inputs. This analysis therefore does **not** attribute those failures to its projection speed or threshold, nor prove what an alternative detector would achieve.

MODE_B has a 120-degree facing cone, unlimited range and **no obstacle occlusion** (`src/perception.js:6–15,39–43,62–66`). Hidden here means outside that cone. Enemy recall target is withheld; state, position and direction are available only when visible. Evaluator-only recall geometry was used to reconstruct trajectory, not supplied to any controller.

## Does attacking while the enemy spear is away create exposure?

There is an association with earlier attack cycles, but no causal test:

- In **736/1,178** hit-producing enemy throw cycles, the counter had thrown between the enemy's original throw and recall. **None** of these 1,178 cases had a counter throw from recall through impact
- The counter's own spear was HELD at **1,094/1,178 impacts (92.87%)**. Only 25 impacts had its last decision still label a supported-away window, and none had a throw command active
- Across all 14,105 ordinary recalls, returning HIT frequency was **736/6,360 (11.57%)** with an earlier counter attack in that enemy throw cycle, versus **442/7,745 (5.71%)** without one
- Those groups differ strongly in geometry/visibility: the enemy spear was hidden at recall in **4,408/6,360 (69.31%)** earlier-attack cases versus **2,309/7,745 (29.81%)** no-attack cases. Within hidden-at-recall cases, HIT frequencies were **16.70%** and **19.14%**, respectively

The data therefore do not support a simple “currently throwing or unarmed causes the returning deficit” claim. Earlier punishment attacks, movement, aiming and enemy trajectory are endogenous and could jointly produce different rear-spear situations. The crude attack association is not an intervention effect; the visibility-conditioned comparison is not a causal adjustment. A suppressed-attack comparison was not run.

## Evidence and limits

Recall time is the start of its logged tick; impact uses the recorded within-tick fraction. Both controllers consume source sensor ticks 0,4,8,…, with receipt offsets 30 and 18 ticks. A packet sampled on the recall tick precedes that recall; the first possible RETURNING packet uses the next strictly later four-tick boundary. Receipt on the impact tick can affect that tick's collision.

**Percept visibility was reconstructed, not directly logged.** Reconstruction uses saved 30-Hz pre-step body positions, saved motor commands plus frozen facing arithmetic, and logged throw/embed/recall/termination/reset events with constant-speed spear motion. No body movement, collision, controller, or match was simulated. All resets restore the documented facing before the next observation. “Behind at impact” means the return's arrival-origin direction has negative dot product with the victim's post-turn facing, not merely that it is outside the ±60-degree cone.

Transient visibility between the sampled 30-Hz source frames is not measured. These off-grid frames are not consumed by a decision, so no claim that the spear was continuously invisible is needed or made. Reconstruction is conditional on the frozen runtime/source identity; saved events are not cryptographic proof of runtime execution.

Validation: 64 raw hashes and 51 protected/frozen source entries verified; 576,000 sample-cadence and 1,151,296 decision-cadence/age checks passed. Reconstructed facing matched all 49,031 logged throw/recall checkpoints exactly; spear positions matched all 22,981 recall starts exactly. All 181,876 reconstructed RETURNING threat gates agreed with saved diagnostics. All 1,685 returning-HIT lineages/timings passed, plus seven analysis-only unit tests and a separate Python aggregation/attack-link check. The Python check does not independently reimplement visibility. Original files remain unchanged.

## Bounded next decision

Review a separate, preregistered **sensor-only blind-side return-awareness** diagnostic before choosing another match budget. It should test detection/defensive movement using permitted observations and memory, preserve hidden recall targets, and include rear-spear and delayed-reset fixtures. If a subsequent comparison is authorized, freeze it before fresh outcomes and isolate awareness from punishment-attack suppression so those hypotheses are not conflated. This report authorizes or executes neither experiment, tuning, default-rule change nor mind change.

Machine-readable evidence, source and reproduction instructions accompany this report. The original score remains counter 1,728 versus ordinary 1,977, with the original inconclusive classification.
