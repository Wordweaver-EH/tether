# Independent Cover uncertainty v2 results review

The frozen 48-bout study is numerically intact. It does **not establish a useful-checking or recovery benefit**. Sparse monitoring, real attention actuation, and reset-separated prediction assessment are demonstrated within this task. Learned action habits or broader general cognition are not established.

## Integrity

Checkpoint: `59a62eeb690ab8ffc3478ff688674bfbea11f84c`.

An independent Python reader recomputed endpoints directly from all retained compressed logs without running new simulations or outcomes. All 48 predetermined seed/seat/condition/arm cells occur exactly once; their hashes match the summary. All 48 frozen source entries and the frozen model remain unchanged. There are 345,600 step rows, 86,208 decision rows and 240 fixed excursion opportunities, including all 144 post-boundary opportunities across the three arms and two conditions. Failures and censored opportunities remain in denominators.

The reader independently reconstructed cover line-of-sight blocking, same-circuit identity, first actual reset cutoffs, observed returns, low-error assessments and uninterrupted routine intervals. Every opportunity result and timestamp agrees with the frozen auditor. Zero calibrated assessments straddle an actual reset.

The builder's completed frozen replay audit reports exact events, received percepts, periodic world hashes and final worlds for all 48 bouts. Its complete output was read and cross-checked; replay was performed by the builder, not this reviewer. All 16 full recorded-percept streams reproduce 28,736 desired commands. The original scoring session's terminal exit 0 was confirmed by the builder/coordinator; this reviewer did not own that session.

## Primary recovery and return to routine

Each condition/arm has 24 predetermined post-boundary opportunities (four seed clusters, two seats, three excursion clocks).

- Changed route: full 9/24 clean recoveries; monitorOff 10/24; scheduled 9/24.
- Familiar route: full 7/24; monitorOff 9/24; scheduled 10/24.
- Changed-route routine signatures: full 6/24; monitorOff 6/24; scheduled 7/24.
- Familiar routine signatures: full 5/24; monitorOff 6/24; scheduled 8/24.

There is no positive primary recovery effect against either comparator in the changed-route condition. The full-minus-off seed effects in successful recoveries per bout are −0.5, 0, +1 and −1, averaging −0.125. Full-minus-scheduled effects are +0.5, 0, −0.5 and 0, averaging zero. These are four seed clusters, not eight independent seat replicates. They support neither a general benefit nor a strong harm claim.

The endpoint is a bounded mission outcome: same-circuit completion plus true cover disappearance, observed return and subsequent low residual before the fixed horizon or reset. It is not an uncensored estimator-recovery latency. Reduced opponent exposure caused by hits remains part of the outcome rather than an exclusion.

## Checking and dose

- Full proposes and delivers 132 pulses across 28,736 decisions, about 0.46%.
- Scheduled proposes the identical 132 opportunities and delivers 131. Every one of the 16 paired schedules matches the frozen count-yoke formula exactly; no pair breaches the preregistered delivered-dose mismatch tolerance.
- Full has 115 already-visible pulses and 17 initially-hidden pulses. Nine meet the narrow proxy of observing the opponent within one second without reset.
- Scheduled has 80 already-visible pulses and 51 initially-hidden pulses; 32 meet the same proxy.
- In the changed-route condition alone, the proxy counts are full 5/69 delivered versus scheduled 21/69.

This shows sparse checking, but not superior contingent information gathering. The proxy is an association and the arms encounter different trajectories and visibility states. Count yoking uses full's post-intervention whole-bout count; it is a research comparator, not a deployable baseline or a pure equal-compute timing intervention. Whole-bout counts also allow scheduled familiar/switch behavior to differ before the switch.

## Gameplay and mechanism

Mean score-margin advantage of full over monitorOff is +1.125 points per familiar bout and +0.375 per changed-route bout. Against scheduled it is +1.125 and +0.5. These small, heterogeneous descriptive score differences do not rescue the nonpositive primary result.

Independent comparison of paired original logs finds all 16 first full/off command divergences under identical prior command histories and identical current received percepts. Every first divergence is a delivered calibrated pulse changing gaze only, with movement and weapon commands unchanged. Example: seed 5107, P1, familiar, tick 1142, sensor time 9.366667 s, a fresh calibrated-error pulse. This establishes a real attention actuator pathway, not that the check caused later information gain or score.

Later replay differences occur on an externally supplied common observation stream and are not independent counterfactual game outcomes. Tactical learning remains disabled; the trained quantity is a velocity predictor and empirical threshold. Return to routine is not acquired habit. Additional checker work is outside the inherited nominal budget, and logical counts are not total CPU matching.

## Artifacts

- `tether-c2-independent-results.json`: independent raw-row counts, all opportunity outcomes, paired count yokes, first divergences and seed effects.
- `audit-c2-v2-independent.py`: independent reader and recomputation code.
- `tether-c2-independent-audit-console.log`: completed independent audit log.
- `tether-c2-scored-audit-59a62eeb.json`: builder's frozen replay/lineage auditor output, independently cross-checked.

No frozen source, endpoint, calibration parameter, scored cell or retained raw log was changed by this reviewer.
