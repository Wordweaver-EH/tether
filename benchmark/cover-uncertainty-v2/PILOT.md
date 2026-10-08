# Calibrated Cover checking: operational readiness, not a performance result

The bounded pilot now produces real cover disappearances, changed-route returns and familiar stretches while retaining ordinary combat. It does **not** establish that calibrated checking improves gameplay or recovery, and it does not implement a learned action habit. Held-out evaluation has not run.

## What changed

An additive reusable core fits a motion-velocity coefficient on familiar training sequences and an empirical residual-rate threshold on separate calibration sequences. A Cover-specific adapter censors forecasts using only observable own-spawn displacement plus public score change. The existing attention/replanning path consumes bounded pulses; no evidence means no endless high-error request loop. All three arms still compute the checker, and disabled monitoring cuts delivery only.

The final frozen fit uses 532 samples and 545 separate calibration samples. Velocity gain is 0.46353, residual-rate threshold 3.57040 units/s, and the completed-absence deadline heuristic 2.56667 s. All 1,077 included samples were independently checked against actual RESET intervals: none straddled a reset. Actual evaluator labels never enter the subject or sample selection. The model reproduces exactly from retained training provenance.

The disappearance deadline is not a probabilistically calibrated guarantee. Its calibration sample has 50 completed absences,49 known-reset-censored absences and 1 terminal-censored absence. The completed-only deadline is potentially biased toward shorter returns. The empirical residual-rate containment is 492/545; held-out coverage and performance remain unknown.

## The initial failure and repair are retained

Moving holds and legitimate spear dodging preserved more combat exposure than the old stationary opponent, but the first candidate still failed. All three P2/switch pilot arms became stuck near an already-reached waypoint for about 27 s after the last reset. Reconstructed world logs show 387 measured arrivals inside the existing 0.20 m radius while velocity extrapolation fell outside it;365 were independently verifiable from visible samples. No score comparison was needed to identify this error.

The repair accepts measured OR predicted own-position arrival at the same radius. It changes no weapons, collision, objectives, timing or routes. A regression fixture exercises measured-in/predicted-out arrival. The failed candidate source, training data and 12-bout pilot remain unchanged locally. Training was rerun on the same declared training seeds after the repair. No held-out seed was used for development.

## Repaired operational exposure

Seed 991, both seats, familiar/switch, full/off/count-yoked scheduled:12 sixty-second bouts. The fixed monitor-disabled reference completed 2 switched south circuits in each seat. Full completed 3/1 and scheduled 1/2 by subject seat. All switch arms therefore encountered at least one complete changed route, but successful completion in every arm is not an inclusion criterion. Hit-interrupted attempts remain outcomes.

Each bout retains all 5 nominal excursion opportunities, including 3 after 30 s. Evaluator-only line-of-sight checks confirm real cover blocking, not just looking away. Completed switched circuits in the reference include 53–56 sampled cover-occluded decisions (about 1.8 s); they have observed returns and low-error reassessments. No true-reset-straddling online calibrated assessment was found in the 12 bouts.

Full emits 9/13/4/7 pulses in P1-familiar/P1-switch/P2-familiar/P2-switch:0.22–0.72% of 1,796 decisions, rather than the prior nearly continuous control. Scheduled proposes and delivers exactly those respective counts in this pilot. This count match is not equality of useful information, gaze consequences or compute, and the whole-bout yoking comparator is not deployable.

Only 3 of 33 full delivered pulses meet the narrow proxy “initially absent, fresh observation within 1 s, no intervening reset.” Most pulses occur while the opponent is already visible. Thus sparse checking has been implemented, but useful contingent information gathering remains an open empirical question.

## Mechanism and costs

Replaying the same full percept streams through full/off with common motor-noise samples changes 18/27/8/14 gaze commands, no movement or weapon commands. The first divergences occur on intervention pulses with identical prior history. Later differences are conditional responses to the shared recorded observation stream; they are not independent counterfactual game outcomes. Full reproduces all 7,184 recorded desired commands in these replays.

Pilot clean post-switch recovery outcomes, out of 6 fixed seat/opportunity combinations, are full 3, off 4 and scheduled 3. These descriptive pilot values provide no benefit claim and will not be used to select thresholds or held-out cells. Return-to-routine signatures are reported separately and are not evidence of acquired habits. Combat score and ring-occupancy tradeoffs are retained in [PILOT.json](PILOT.json), without presenting development-seed scores as held-out performance.

The old 192-unit mind accounting is preserved, while checker calls/assessments are additional work executed in all arms. It is not a total computational bound. Whole-bout CPU/runtime instrumentation is present for future runs; no runtime numbers were retroactively invented for earlier raw logs. Count-matched scheduled requests can still differ in gaze/planning delivery and observed information.

## Verification and boundaries

- 377/377 final application, delivery and calibrated-monitor tests pass (358 inherited plus 19 new).
- Three 3,600-tick pristine-reference comparisons match every command, percept, event and world hash, plus trace/memory/cognition/report: default Duel, Existing Cover, legacy Integrated.
- Final 8 training bouts and 12 operational bouts replay all 144,000 simulation steps exactly, including recorded events, percepts, periodic hashes and final worlds.
- Full and monitor-off familiar/switch command prefixes match through tick 3617, before the delayed switch can affect decisions. Scheduled prefixes need not match because its whole-bout yoked count may differ across conditions; this limitation is explicit.
- Fixed-opportunity/circuit-lineage fixtures prevent reset-interrupted or later circuits being mislabeled as clean recovery. Unknown/absent evidence never counts as recovered.
- Historical v1 freeze remains untouched. 42 inherited files remain byte-identical; the 2 opt-in integration files have exact old/new hashes, and default behavioral payloads remain pinned.

Raw evidence stays local; [training provenance](training-provenance.json) and [compact pilot evidence](PILOT.json) provide hashes and denominators. No raw upload, remote write, merge, deployment or PR-description edit was performed by the implementation task. The [prospective protocol](PROTOCOL.md) fixes a 48-bout,4-seed held-out study, but scoring is withheld pending independent review, published checkpoint verification and explicit release.
