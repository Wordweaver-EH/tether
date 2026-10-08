# Cover uncertainty v2: prospective frozen study

Status: training and operational pilot only. Held-out seeds have not been run. A published source/model checkpoint and explicit parent release are required before score mode. Pilot outcomes are not performance evidence.

## Bounded question

Does a training-fitted motion-discrepancy/missing-observation checker improve recovery and useful gameplay compared with cutting its delivery, and compared with the same number of independently scheduled intervention opportunities? This tests an engineered monitoring component toward more reusable cognition. It does not test whole-mind generality, consciousness, enjoyment, or acquisition of an action habit.

Integrated Cover still disables tactical score-credit learning. The acquired component is a motion predictor and empirical threshold; it is not a policy. A quiet interval or return to objective play is called **return to routine**, never return to a learned habit. The existing within-bout route cache is not a trained cross-bout policy.

## Training, frozen parameters and inputs

- Fit seeds 1103 and 2203, each subject seat, familiar opponent only: 4 sixty-second training bouts. Training subject is existing Integrated Cover with monitor delivery disabled.
- Calibration seeds 3301 and 4409, each seat: 4 further sixty-second familiar bouts. No training/control selection uses scored seeds.
- Nonoverlapping observed forecast intervals issue at a visible observation and assess at the first visible observation 0.3–1.0 sensor-seconds later. Known resets clear pending lineage. Missing/expired intervals do not become successful assessments.
- Fit one scalar velocity gain by least squares of observed displacement against velocity × horizon, clamped to [0,1.5]. Calibrate the 90th empirical quantile of Euclidean residual divided by horizon on the separate calibration sequences; floor 0.05 units/second. Serial dependence and distribution shift prevent a formal coverage guarantee.
- Missing-observation deadline is the 90th empirical quantile of **completed** calibration absence durations, clipped to [0.5,3] seconds. This is explicitly a completed-absence heuristic; reset/terminal-censored absences bias that sample and are separately reported. It is not a 90% probability of a future return.
- Final frozen model: velocity gain 0.46353059461360063; residual-rate threshold 3.57040372826879; missing deadline 2.5666666666666664 seconds. 532 fit samples; 545 calibration samples; 50 completed calibration absences. Empirical calibration containment 492/545 (90.275%). Model recomputes exactly from retained training provenance.
- An independent evaluator found zero actual-reset-straddling samples among all 1,077 included training samples. Actual RESET labels audit lineage only; they never enter training selection, the checker, opponent, or subject.
- The combat reset adapter requires a public score change plus impossible own-body displacement into the known spawn. A score alone may be a ring award and never clears a forecast. Some resets can be unidentifiable near spawn; held-out audit reports false negatives and reset-straddling assessments instead of pretending omniscience.

Every numeric bound, vector schema, public spawn coordinate, speed bound, sensor cadence, residual floor, cooldown, missing deadline limits and opponent policy constant is an engineered prior. The core has no simulator, map, ring, opponent tactic, score or route dependencies. The combat adapter owns reset inference. Changing domains still requires a legitimate observation/reset adapter and new training data; no second-domain calibration is claimed here.

Model parameters are frozen in each bout and across evaluation. Only transient pending forecast, evidence, unresolved flag, refractory clock and absence episode state change. The inherited legacy EWMA still computes for unchanged diagnostics but does not decide calibrated requests. No evaluation sample updates the learned coefficient or threshold.

## Actual intervention

A fresh residual rate above threshold or overdue missing observation can propose one intervention pulse. There is a one-second refractory interval and at most two overdue pulses per continuous absence. No fresh evidence means no endless high-EWMA work. Fresh low-error evidence closes the unresolved state; absent evidence never counts as recovery. The 0.4-second `checking` diagnostic label is not sustained motor control: delivery is a single decision pulse.

The existing coordination/attention/replanning pathway consumes the pulse, subject to unchanged reflex, budget, legality and Cover planning cooldown gates. A learned projected target can supply the monitor attention target when selected-content delivery does not overwrite it; a selected packet retains its usual target priority. The planner still uses inherited belief/content, not the new learned predictor. Long-stale linear target projections are extrapolations beyond the 0.3–1-second calibration range, not calibrated position estimates; no claim of an improved belief estimator follows.

All arms compute the same checker. Full delivers its contingent pulse. Monitor-off cuts delivery only. Scheduled replaces contingent delivery with the count-yoked schedule below. Other perception, controller logic, learning settings, seeded motor-noise sample stream, simulator and original 192-unit mind budget remain identical. That budget is a nominal inherited accounting convention, not a total CPU cap; the additional checker update/assessment work is explicitly outside it and executed in every arm. Report checker calls, assessments, planner calls, original nominal units and whole-bout CPU/wall time separately.

## Opponent and operational gate

Ordinary Cover rules, obstacle geometry, objective rewards, spear offense, defense, hit resets, MODE_B visibility, 150 ms percept delay and 30 Hz decisions are unchanged. The scripted opponent enters the ring, moves within it, undertakes legal home-cover circuits on nominal clocks 7,19,31,43,55 seconds, and returns. Familiar uses north excursions. Switch changes future routes to south after its delayed clock reaches 30 s and moves its sparse shooting window. It uses visible held-spear anticipation and projectile dodges; its full priors are in `opponent.mjs`. It remains a predictable, limited opponent.

The first operational candidate deadlocked at a physically reached waypoint because only extrapolated arrival was accepted. Deterministic world replay found 387 decisions in each P2/switch arm (365 also independently verified while visible) with measured position inside the existing 0.20 m radius but extrapolation outside. The principled correction accepts measured OR predicted arrival using that same radius. No scores, rules, weapons or subject changes motivated the repair. Old source, failed pilot and training are retained.

Exposure readiness is judged by a condition-blind fixed reference (monitor-disabled subject), not by requiring each intervention arm to win or complete a route. On the repaired seed 991 operational pilot, that reference completes 2 south circuits in each seat. All six switch bouts also happen to complete at least 1 south circuit. Interruptions caused by actual hits remain valid outcomes and never justify exclusions. Audit records all 5 nominal opportunities per bout, not just completed or observed surprises. Geometry and moving hold tests are supporting checks, not substitutes for combat.

## Count-yoked schedule

For each seed/seat/condition run full first and take N = its number of proposed intervention pulses on the fixed decision clock, including proposals blocked by reflex/budget delivery. Construct exactly N distinct integer opportunities among T=1796 decisions using floor((i+phase)*T/N), i=0..N−1; phase is the frozen linear-congruential hash of seed+177. N=0 schedules none; N=T schedules every decision. No full pulse timestamps, phase-specific counts, error values, score or route labels enter the schedule.

This is a **count-yoked research comparator**, not a deployable policy: it receives a post-intervention count from the paired full bout. The whole-bout count can differ between familiar and switch conditions and therefore change scheduled behavior even before 30 s; no anticipatory detection interpretation is valid. Different trajectories and delivery gates can create different realized gaze, replanning and information doses even with exactly matched opportunities. Report proposed, delivered, gaze-matched, command-changing and planning counts separately. If delivered requests differ by more than max(1,10% of full delivered requests) in any pair, label that pair delivery-unmatched and withhold an equal-delivered-checking claim. Retain it in every outcome comparison. Even matched delivered requests are not matched useful information or CPU work.

## Held-out matrix and stopping

Four fresh seed clusters 5107,6211,7307,8423 × both seats × familiar/switch × full/monitorOff/scheduled =48 predetermined sixty-second bouts. Seats are repeated conditions within a seed, not independent replications. All cells run once; every reset, failure, zero-exposure bout and terminal censor remains. No optional extra seeds, exclusions, threshold changes, opponent repairs or endpoint changes after scoring. Any implementation invalidity stops the run, preserves all evidence, and requires a disclosed new protocol rather than quietly replacing outcomes. Report descriptive seed-cluster effects, not significance from this tiny sample.

The proposed matrix does not automatically run. Source, model, protocol and score runner must be independently reviewed and published first. The checkpoint argument is a provenance assertion; the parent verifies the remote commit and grants release. Source hashes are checked before/after; output directory must be new. A running process is complete/stopped only when its original execution session reports terminal state.

## Prospective endpoints

Primary bounded recovery outcome: for **each** post-boundary nominal excursion opportunity (31,43,55 s), whether its own started circuit (same circuit identity, no intervening RESET or later circuit substitution) completes by min(nominal+12 s,bout-end−sensor-delay), has an actual cover-occluded hidden sample (evaluator-only geometry) followed by a fresh observed return, and has a subsequent assessed residual rate at/below the frozen threshold within that window. Unknown, not-started, reset-interrupted, ongoing and terminal-censored opportunities are retained as zero for this bounded mission outcome, with separate status counts. This is not an uncensored recovery-latency estimate.

Compare full−off and full−scheduled mean outcomes per seed, averaging seats; report familiar post 30 windows as well and switch-minus-familiar effect descriptively. Report every seed effect. No improvement means no recovery benefit claim, regardless of score.

Secondary outcomes:

1. Useful-checking proxy: delivered pulse while opponent absent followed by fresh observation within 1 sensor-second, without RESET. Already-visible pulses, no-new-observation, reset interruption and terminal truncation are distinct. This association is not causal information gain. Compare all fixed opportunity outcomes between arms and use common-percept action contrasts to establish mechanism.
2. Clean recovery latency and return-to-routine: latency only among clean completed intervals, alongside all noncompletions. After clean completion plus observed-low assessment, find 1 uninterrupted second without delivered checks and with at least one Objective-focus decision, within the same circuit episode and before any reset. This is a routine signature, not acquired habit.
3. Gameplay: subject score margin, hit/ring points separately, occupancy, opponent resets/throws/route exposure, and full−control paired differences. Scoring by repeatedly interrupting a route is legitimate gameplay but does not demonstrate recovery from its unexperienced occluded change.
4. Selectivity/cost: pulse fractions before/after 30 s, familiar quiet-run lengths, visible-target gaze changes, actual target gaze matches, planning attempts/completions, checker calls/assessments and nominal/runtime work. A monitor becoming quiet while failing to check is not competence.
5. Calibration diagnostics: empirical within-threshold fraction by forecast-horizon bin, visibility/missing status, and known/actual reset lineage. Report denominators; do not label on-policy samples as matched counterfactual calibration.
6. Mechanism: replay each full recorded percept stream through full/off controllers with identical motor noise samples. Verify full reproduces its emitted commands. Report first divergence with identical prior history; later action divergences are conditional responses to a shared externally supplied observation stream, not independent game outcomes.

All raw command/percept/evaluator logs remain local. Only source, protocol, frozen calibration artifact, compact reports and evidence hashes are eligible for the parent’s authorized publication. No raw upload, merge, deployment or PR-description edit is performed here.
