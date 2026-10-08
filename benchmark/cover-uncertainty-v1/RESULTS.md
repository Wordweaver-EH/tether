# Cover uncertainty v1: a scoring benefit, not selective monitoring

The intended gameplay demand was **not cleanly realized**: after the switch, the full arm completed only **1 of 11** opponent cover circuits; **10 were interrupted by resets**, and the opponent held quietly for only **3%** of sampled decisions.

The repaired existing monitor-control pathway improved scores against this particular scripted opponent. It did **not** establish the intended quiet-familiar / consequential-surprise pattern: monitor requests were nearly continuous, stale-belief error was worse on the resulting trajectories, and the scoring advantage was **smaller** in the tactic-switch condition.

## Fixed experiment

Source and protocol were published before scored outcomes at
[b7568f2c1fa1f969b811ac636db370cd1842108a](https://github.com/Wordweaver-EH/tether/commit/b7568f2c1fa1f969b811ac636db370cd1842108a).
Four fresh seeds × two subject seats × familiar/switch × full/monitor-off/fixed
produced the predetermined **48 sixty-second bouts**. There are four independent
seed clusters, not eight independent seat replicates. No controller, threshold,
seed, endpoint, or matrix size was tuned after scores.

Ordinary Cover rules, cover geometry, objective, 30 Hz decisions, full 150 ms
percept delay and common seeded motor-noise wrapper were retained. Evaluator
truth and the opponent's private tactic condition never entered the subject.
The opponent repeatedly approaches/holds the ring and takes legal cover circuits;
at its delayed 30 s clock it reverses future circuits and changes sparse shot
windows in the switch condition. Familiar means repeated behavior, not a learned
habit: tactical score-credit learning remains disabled.

The narrow repair carries an already-used opponent hypothesis into Objective
content only when visible or recently remembered, and allows actual monitor
reacquisition through stale-objective scan suppression. Beacon-only states create
no target forecast. Search already preserved its hypothesis. Default Duel and
Existing Cover remain unchanged; new Integrated sessions identify as v3.

## Scores and actual goals

Scores are subject : opponent totals, eight bouts per cell.

| Condition | Full | Monitor control off | Fixed one-second requests |
| --- | ---: | ---: | ---: |
| Familiar | 224 : 16 | 132 : 28 | 141 : 21 |
| Tactic switch | 196 : 17 | 141 : 19 | 139 : 17 |

Full minus monitor-off mean score-margin advantage was **+13.000** per familiar
bout and **+7.125** per switch bout. The preregistered exploratory difference of
those effects was **−5.875**, opposing the idea that this switch makes monitoring
more useful. Seed-cluster differences were −2, −10.5, −5.5 and −5.5. Against the
fixed comparator the corresponding advantages were +11.000 and +7.125, with a
−3.875 difference. No significance or broad strength claim follows from four seeds.
Full improved the margin in 15 of 16 full/off pairs; the remaining pair declined
by one point. Full/fixed had 15 improvements and one tie.

Most full-arm points were hits: **406 hits and 14 ring points** across both
conditions, versus **236 hits and 37 ring points** with monitor control off.
Full had **187.9 s** of ring occupancy across its sixteen bouts, versus **443.7 s**
off and **476.9 s** fixed. These are observed combat/objective tradeoffs, not proof
of intentional or well-calibrated multi-goal reasoning. The sparse scripted
opponent is weak and exploitable; outperforming it is not a general-competence test.

## Did active play produce the intended challenge?

Neutral geometry checks proved the routes and quiet holds work without combat,
but active play did not preserve that demand. In full/switch after30s there were
**11 circuit starts, 1 circuit-to-hold completion and 10 circuit-to-ingress
interruptions**. Quiet opponent holding occupied **214/7,168 decisions (2.99%)**.
All eight opponents adopted the south route, but four did so through a reset
spawn ingress rather than an excursion. Monitor-off completed 8 of24 post-switch
circuits and fixed completed 9 of24; their exposure also differed.

These are sampled route-state transitions on different closed-loop trajectories,
not identical matched surprise events. Frequent hits/resets dominated the full
condition. The protocol is useful for detecting this demand failure, but the
scores cannot validate the intended quiet-competence/occluded-surprise story.

## What actually happened inside the mechanism

A common-prefix check identifies a real causal action change. In seed5653/P1,
commands and the received percept are identical through the first divergence.
A fresh prediction discrepancy of **0.511004** at sensor time **0.766667 s**
triggers full's monitor request. Its command at **0.916667 s** changes **only gaze**;
movement and weapon buttons match, and neither controller replans at that moment.
This demonstrates monitor-to-attention actuation under common evidence/noise.
It does not isolate attention from replanning as the cause of later scores.

| Process, eight bouts per cell | Familiar full / off / fixed | Switch full / off / fixed |
| --- | --- | --- |
| Monitor/fixed requests | 13,295 / 0 / 480 | 13,533 / 0 / 478 |
| Actual planning attempts | 368 / 397 / 426 | 466 / 405 / 429 |
| Completed planning requests | 75 / 140 / 155 | 208 / 216 / 230 |
| Unfinished planning requests | 293 / 257 / 271 | 258 / 189 / 199 |
| Declared logical units | 1,677,556 / 1,669,453 / 1,675,025 | 1,684,939 / 1,677,326 / 1,680,626 |

Full requested control on **92.53%** of familiar decisions and **94.19%** of switch
decisions. After the nominal switch it requested on **98.07%** of decisions.
This is sustained high-error control, not economical surprise-triggered checking.
The fixed arm is deliberately **not** matched for realized checking or compute.
All arms use the same 192-unit cap; full used about 0.45–0.49% more declared units
than off. Those units are a nominal accounting scheme, not CPU-time measurements.

Unobserved working-belief mean error, measured against truth at the same sensor
time, was **3.524 vs 2.938 vs 2.895** world units in familiar bouts and
**4.113 vs 3.263 vs 3.264** in switch bouts (full/off/fixed). Sample counts were
5,208/3,408/3,227 and 6,621/5,286/5,301 respectively. Different trajectories yield
different evidence denominators; these are on-policy diagnostics, not matched
counterfactual errors or proof of worse calibration from the intervention alone.
Command-time errors are separately retained in the compact summary.

Completed high-error-to-low-error episodes had median durations **14.05 s** full
versus **5.27 s** off in familiar bouts, and **13.52 s** versus **4.90 s** in switch
bouts. There were respectively 20/48 and 8/25 completed episodes, plus 6/7 and
8/8 right-censored episodes. Completed-only durations are not unconditional
recovery rates; this does not demonstrate superior recovery.

Ordinary hit/reset teleports confound the error signal. In full, **356/617** large
assessments in familiar bouts and **180/544** in switch bouts occurred within one
sensor-second after a hit. Error/request counts cannot all be attributed to changed
opponent tactics. Full's request-matched gaze proxy was never directed more than
0.18 rad away from a currently visible opponent; the hypothesized visible-target
checking opportunity cost was therefore not demonstrated by that metric. Less ring
occupancy is real but does not isolate the cost of individual checks.

This gameplay matrix has no C1 content-delivery lesion. Additional Objective
packets demonstrate exposure, not a new causal C1 gameplay benefit. No new learned
strategy, calibrated uncertainty, human enjoyment or consciousness result is claimed.

## Verification and execution provenance

- 346/346 application/delivery tests and 37/37 focused checks passed before scoring
- Exact pristine-reference behavioral comparisons cover default Duel, Existing Cover, and old Integrated with targetMonitoring:false
- Twelve seed991 telemetry pilots replayed exactly; a separate 50 s neutral geometry check verified quiet holds, complete circuits and actual delayed route adoption on both seats/conditions
- All **48 bouts, 345,600 simulation steps and 86,208 decisions** were audited; events, periodic world hashes and final worlds replay exactly
- Familiar/switch command prefixes match exactly before the switch; all 44 frozen source files remained unchanged

**The stop attempt failed.** The initial run was interrupted after seven saved
bouts. Recovery began at **18:41:10 UTC on 2026-10-07**. A stop was attempted at
**18:41:19**, and execution was incorrectly reported as stopped after three more
saved bouts. It actually continued and completed the remaining matrix at
**18:42:43**, before renewed permission at **19:10:40**. This was discovered while
checking retained evidence at **19:11**, and disclosed. No new scored bouts were
started after renewed permission; the existing results were audited and reported.
The original execution session subsequently confirmed completed exit0. An isolated
shell process check had not established termination of that session.

The original seven logs and original summary are unchanged. All predetermined
cells are retained exactly once; no extra seeds, selective reruns, exclusions or
outcome-driven tuning were introduced. The permission/execution failure remains
part of the record and is not relabeled as an authorized post-approval run.

## Possible next design, not run

A future study would first verify that uninterrupted familiar holds and occluded
route changes actually survive active combat, separate reset-associated errors
from opponent-model failures, and compare rate-matched attention interventions.
That is a proposed next design, not a new experiment or a change made here.
Prior results against the stronger Cover baseline are not comparable to scores
against this different scripted opponent.

## Evidence and reproduction

See [compact summary](results/compact-summary.json),
[execution timeline](results/execution-provenance.json),
[independent audit](results/independent-audit.json),
[local log hashes](results/log-manifest.json),
[protocol](PROTOCOL.md), [source freeze](source-manifest.json), and
[reproduction commands](README.md). Full compressed logs total about **53.3 MB**
and remain local. Raw publication remains canceled; no remote raw backup or
public download is claimed. This bounded milestone stops here without another
performance run, policy tuning, merge or deployment.
