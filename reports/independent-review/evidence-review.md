# Tether independent evidence review

Status: final independent review of the completed original general/adversarial/learning evidence and the separate targeted affect repair. The bounded evaluation pass is complete; the full design, learning-stage hypothesis, browser acceptance, human engagement and PR delivery are not all complete.

## Scope and evidence integrity

This review concerns the frozen source fingerprint `19800346ef69e63f1917ee67d02f4f083285101cb4342ed39d323d195b0bc9e5`. It does not modify that source, rerun its experiments, or select a different model after seeing the results. The separately authorized affect repair is a new implementation, fingerprint `c3ead812bf8a53ab91d7f335fee94839352fe382669dc9f812d0a2f2f7fc55cd`, with its own fixed protocol and evidence. The planned final app uses this post-audit repair. The 39,168-bout general and 8,704-bout learning results apply to the original build only; the entire ablation/learning program was not rerun on the repaired app.

The completed general audit contains 39,168 full 300-second bouts: 17 variants, three logical work budgets, 32 seed clusters, two modes, two seats and six opponents. Every ablation has 2,304 bouts; each ablation–budget comparison has 768 matched pairs but only 32 independent seed clusters. The independent dataset validator checked unique complete schedules, full durations, all cap checks, raw score/win recomputation, effect means and source stability. Post-run tests passed 131/131. I independently read the intervention and inference code, recomputed paired contrasts and all 96 primary win/score bootstrap intervals from the raw JSONL (exact endpoint agreement), and compared the full/noAffect/noAutomatization rows.

“Win” is a win-points quantity: win = 1, tie = 0.5, loss = 0. Report changes as percentage points of win points, rather than silently calling them pure win probabilities.

## What helps, harms, and remains unestablished

The estimates below are effects of these particular implementation changes against this fixed six-opponent population. They do not establish necessity of a theoretical cognitive construct or general superiority outside this environment.

- **Clear useful control mechanisms in this implementation:** adaptive gaze rather than forced scanning, specialist/intuitive control rather than its monolithic fallback, prediction, reflexes, and hysteresis. Their large win-point and score differences have consistent signs at all three budgets. At budget 192, removing them changes win points by −36.0, approximately −21–22, −14.1, −11.7, and −12.2 percentage points, respectively. The two fallback comparisons are related interventions, not independent confirmations of two separate constructs.
- **Useful learning/adaptation package in the fresh-memory protocol:** noLearning reduces score by approximately 1.6–2.3 points per bout across budgets and win points by 2.9–5.7 percentage points. noAdaptation reduces score by approximately 1.5–2.0. The effect is strongly opponent-dependent and largely driven by immediateRecaller. This does not establish learning stages or across-bout generalization; those require the separate protocol. noLearning also disables adaptation and several priors, so it is a broader treatment.
- **Workspace coherence has a score benefit, but the requested scarcity signature is unestablished:** noWorkspace loses about 12.9–13.0 score points at every budget. Its win-point intervals include zero at 48 and 512; the 192-budget estimate is −3.84 pp, descriptive 95% CI [−7.29, −0.78]. Opponent effects differ markedly: channel-wise control helps against embedWaiter and the mind, and hurts sharply against camper and spinner. A population average is not universal benefit.
- **The current ToM/flanking policy is harmful on this population:** disabling it improves win points by 7.9–8.8 pp and score by 1.5–1.6 across budgets, primarily through spinner. At budget 192 the change is +8.14 pp [6.58, 9.70] and +1.64 score [1.36, 1.92]. This indicts this gaze-conditioned flanking policy, not opponent modeling in general.
- **Metacognition, deliberation and counterfactual computation:** behavioral and resource-use changes are real, but broad win benefit is unestablished. Some small score effects have unadjusted intervals excluding zero, yet are sensitive to multiplicity. Internal counters are not an independent functional-success endpoint.
- **Belief retention:** effects vary by budget/opponent; broad benefit remains unestablished. One 192-budget win interval excluding zero is not a robust cross-budget result.
- **Automatization:** weakly load-bearing, with no observed win-point change in any of the 2,304 matched pairs. Forty-one pairs differ in score. Only 52 pairs (2.26%), all versus embedWaiter, differ on any of the eight tracked external behavior metrics. It is not wholly dead, but the automatic counter greatly overstates how much executed control is altered.
- **Affect in the frozen version:** behaviorally inactive by source logic, not merely an underpowered empirical null. All 2,304 paired bouts have identical values for every recorded metric and cognition total. See the structural diagnosis below.

## Affect: structural diagnosis of the exact null

The original action path uses affect only to lower the workspace entry threshold from 0.30 toward 0.24 (`src/mind/workspace.mjs`, line 18). The candidate winner cannot enter that sensitive range: Hunt has salience at least 0.59 whenever the opponent is visible; Search has salience at least 0.36 when hidden (`src/mind/specialists.mjs`). Ordinary candidates therefore always exceed the threshold with affect on or off. Hysteresis hold, refractory time and challenger margin are fixed. Reflexes bypass workspace selection entirely.

Valence, confidenceMood and scoreMargin are logged but have no action-path consumer. `specialists()` receives a literal `{ arousal: 0 }` and does not use its affect argument (`src/mind/index.mjs:110–118`). The noAffect toggle zeroes a mood object but does not change any reachable decision predicate in the tested source. The observed null is therefore a genuine null of a disconnected/ineffective implementation. It cannot be used as evidence that a causally connected affect mechanism would or would not help.

A repair after this discovery must be described as a new implementation and tested on fresh pre-specified seeds. It cannot retroactively turn this null into a validated affect mechanism.

## Automatization: why the counter is misleading

The source has a reachable functional path: an acquired habit can choose a tactic and suppress escalation when error awareness is low. An existing deterministic test shows a learned habit changing emitted aim. It is therefore not the same dead-path problem as affect.

However, over 99.3% of automatic-labelled general-audit decisions occur in EMBEDDED situations. In that situation `src/mind/index.mjs:129` immediately replaces the selected learned tactic with direct/lead according to the current workspace recall output. An automatic label also does not prevent Type2 when `habit.aware` is true (`index.mjs:124–125`). The general audit's automatic fraction falls by approximately 20 pp when automatization is removed, while escalation rises by only approximately 0.2 pp and charged work increases by approximately 0.026/0.125/0.119 units per cycle at caps 48/192/512.

These diagnostics explain the near-null and identify a design limitation. They do not show a useful automatic competence stage. In addition, noMetacog prevents Tier2 entirely, while habit eligibility requires two positive Tier2 teaching outcomes. Zero automatic share under noMetacog is consequently built into the learner and is not independent evidence that a stage failed to emerge.

## Budget fairness and D14

Full and ablated minds have the same requested cap, 30 Hz control cycle, normal sensory latency/noise, seat, mode, opponent and initial seed. No hidden-state policy is used in these interventions. The cap checks pass. This is a properly matched intervention study at the level of the recorded logical-budget definition.

The ledger charges a constant control cost, particle-based belief work and rollout trials. It does not measure CPU instructions or all work: specialist proposal generation, attention bookkeeping, adaptation sampling and other overhead are not individually charged. noWorkspace retains focus/hysteresis and the same serial planning kernel, but permits channel-wise outputs. This tests coherent action selection under bounded planning, not a complete removal of global processing or a selective test of broadcast's computational-sharing advantage.

At cap 512 the implementation never spends more than 232 charged units in a cycle because particles and branch sampling are already capped. Mean full-mind spending is 39.75, 148.15 and 154.60 at caps 48, 192 and 512. The nominal high-cap arm is substantially saturated.

The requested pattern was greater workspace benefit under scarcity followed by convergence with ample compute. It is not established: the score disadvantage of noWorkspace remains approximately −13 across the sweep and win-point changes are nonmonotonic. Lack of significance at the ends does not establish convergence or equivalence.

**Explicitly post-hoc diagnostic:** using the same 32 seeds across budgets, the high-minus-low change in the noWorkspace-minus-full effect (512 minus 48) is +0.00326 win points, percentile bootstrap 95% CI [−0.03776, +0.04297], and −0.120 score, CI [−3.921, +3.810]. These 20,000-draw interaction intervals are exploratory and unadjusted. No equivalence margin was set.

## Inference, multiplicity and scope

The primary report correctly averages matched differences within each seed and bootstraps 32 seeds, keeping opponent, mode and seat repeats together. It does not pretend 39,168 bouts are independent samples. Fixed opponent identities are not sampled from an opponent population, so these intervals characterize seed variation for those opponents only.

The report's 2,000-draw percentile intervals are unadjusted. There are 48 ablation–budget comparisons, many outcomes, opponent/mode splits and learning curves. An “external difference” label is triggered if any one of eight behavior intervals excludes zero; it is exploratory, not a multiplicity-controlled validation or a benefit claim. A nonzero deterministic action change, a useful performance effect, and an internal counter change are distinct findings. Missing conditional ratios are omitted pairwise; win/score have complete observations.

**Explicitly post-hoc sensitivity analysis:** I calculated approximate Bonferroni cluster-t intervals across the full family of 96 win/score contrasts (16 ablations × three budgets × two outcomes). This assumes the usual cluster-mean t approximation and is not a new confirmatory experiment. The large adaptive-gaze, specialist-fallback, prediction, reflex, hysteresis and ToM effects persist; workspace score effects persist; noLearning/adaptation score effects persist. Isolated belief/workspace win signs and small metacognition/deliberation/counterfactual/automatization score signs do not. The exact values and reproducible analysis are in `general-posthoc-diagnostics.json` and `analyze-general.py`.

No equivalence margin or smallest useful effect was pre-specified. Null-compatible intervals are uncertainty, not proof of equivalence. The all-zero affect result is stronger as an implementation diagnosis because independent source analysis explains why the path cannot matter. Single-module interventions also do not estimate combinations or interactions among mechanisms.

## Comparison and access limits

The searched Phase 4 policies have different offline optimization, 120 Hz action selection, aim-noise distributions and computational accounting from the 30 Hz noisy mind. Their victories establish exploitability under those controller configurations, not evidence against this cognitive architecture. The internal full-vs-ablation comparisons are the relevant matched evidence for implemented mechanism effects.

The strongest gaze intervention forces open-loop rotation when disabled; it is not a selective test of a sophisticated attention self-model. The ToM intervention mainly removes one gaze-conditioned flanking rule. These operational definitions should accompany theoretical labels.

Several documented aspirations also exceed the implemented causal evidence. Belief calibration statistics are exposed in the trace but do not feed back to retune trust. Legacy episodic/playerModel fields are persisted/read out; active behavior uses the separate tabular learning and adaptation states. Reflection notes, self-report and inner speech are readouts, while the behaviorally active counterfactual intervention changes within-cycle rollout/prior computation. It does not establish that between-bout narrative reflection updates the policy. There is no dedicated embodiment ablation. These gaps should not be silently certified by another switch sharing a theoretical label.

Human engagement and owner playtests remain unverified because the required browser/play route is blocked. No hidden-state or unauthorized alternative was used. Speech is untested as an influence mechanism because the opponents do not consume it. There is no result about subjective experience.

## Terminal learning evidence: D16 is not demonstrated

All 8,704 full 300-second bouts are complete: 7,680 repeated-learning bouts over 32 seed clusters, plus 1,024 adaptation bouts over 64 disjoint seed clusters. I independently checked all 8,704 unique row identities, durations, budget bounds and resolved/censored shot-count identities. The learning worker also verified the exact expected job/variant/episode/seed schedule. No partial outcomes were used for this review or source tuning.

The original report writer exceeded V8's single-string size limit after all experiments finished. Complete raw checkpoints were preserved. A separate streaming postprocessor validated and rendered them without rerunning bouts or changing the frozen source. Recovery provenance is in `learning-final.postprocessing.json`.

The four-stage competence trajectory is **not demonstrated**. Prediction of failure improves, but in common attack situations Type2 use increases rather than falling, with little success improvement. For example, HELD:seen:far sparse-credit success is 6.96% in training episode 1 and 6.88% in episode 12; Type2 share rises 95.73% to 98.98%. Its Brier score improves 0.207 to 0.072, which can mean better prediction of continued failure rather than better play. Learning to predict a sparse-credit timeout is not the same as learning to win.

**Explicitly post-hoc aggregate paired contrasts, 10,000-draw seed-cluster bootstrap:** full episode 12 minus 1 sparse-credit success is +0.43 pp [−0.79, +1.65]; Type2 share is +10.00 pp [8.23, 11.71]; charged work is +6.65 units/decision [5.17, 8.06]; automatic labels rise +39.50 pp [35.29, 43.73]. Actual cohort hit-rate and score changes remain null-compatible. This is not the predicted transition to equally successful, cheaper automatic control.

In 384 paired held-out bouts, pooled across the three fresh-seed episodes within 32 clusters, **post-hoc noLearning minus full** is +4.04 win-point pp [0.52, 7.81], +3.71 score [2.42, 5.06], and +3.46 cohort-hit-rate pp [2.22, 4.73]. These intervals are unadjusted. The broad learning/adaptation bundle does not show a held-out advantage here, despite its benefit against some general-audit opponents. This is population-dependent evidence, not a contradiction to suppress or proof against learning generally.

Post-hoc noAutomatization minus full held-out win points are −1.04 pp [−2.73, +0.39] and score −0.18 [−0.55, +0.21]. Both remain null-compatible. Removing it increases Type2 by only 1.76 pp [1.28, 2.28] and charged work by 1.18 [0.83, 1.57] despite eliminating 61.69 pp of automatic labels. The proposed “stuck in costly competent stage” distinction is not established. noMetacog has a null-compatible win effect and a positive small descriptive score effect; no claim that it is trapped in an initial incompetence stage is justified.

Sparse credit is positive score-margin change within a 1.5-second attack window; no-score timeout counts as failure. It differs from successful resolved throw cohorts and bout outcome. noLearning records no such learning-credit outcomes, so missing success-rate/Brier values must not be converted to zero. Held-out seeds use the same two synthetic proxy families; within-bout learning can continue, so this is not held-out human behavior or a pure frozen-policy transfer assay. Fixed sensory latency stays 150 ms; measured act() times are affected by host contention, JIT, garbage collection and tracing and do not demonstrate a learned human-like latency advantage.

## Terminal adaptation evidence: D17 remains unestablished

The original primary effect is (full last-third minus first-third) minus (noAdaptation last-third minus first-third), clustered over 64 seeds:

- Fixed habits: cohort hit-rate effect −1.90 pp [−5.01, +1.50]; hits/min −0.080 [−0.431, +0.316]
- Switching habits: cohort hit-rate effect +2.25 pp [−2.06, +6.26]; hits/min +0.105 [−0.312, +0.523]

All four intervals are null-compatible. Posterior reopening is more frequent after an imposed switch (94.92%) than at the fixed-proxy midpoint (75.39%), but natural maneuver reversals also trigger it. Responsiveness of an internal estimate is not proof of successful adaptation.

The hit-rate effects condition on 180 fixed and 200 switching matched seat/family sets with resolved shots in both windows and both arms; all 64 seed clusters remain. Hits/min uses all 256 sets per condition. This outcome-dependent availability matters.

**Explicitly post-hoc sensitivity:** switching-minus-fixed on the 136/256 pair sets with every required rate yields +6.98 pp [1.45, 12.55]. That positive exploratory subset result is not robust to the estimand: subtracting the original per-seed available-pair effects gives +4.15 pp [−0.75, +8.99], while the all-set hits/min contrast remains null-compatible. Do not select the favorable restricted analysis as a replacement for the null-compatible primary results. All variants and denominators are preserved in `learning-posthoc-diagnostics.json`.

## Separate affect repair: functional path established, benefit limited

The repair changes appraisal-driven persistence: urgency shortens workspace refractory time and challenger margin; confidence/favorable appraisal increases stability. Coefficients were frozen before the targeted outcomes, and the neutral noAffect arm preserves the old control constants. Tests demonstrate different emitted actions under the same changing percept stream and cross-build noAffect action/replay equivalence.

The fresh protocol is 32 seeds × two modes × two seats × three fixed opponents × two arms: **768 full 300-second bouts / 384 pairs**, cap 192. I independently verified the exact Cartesian schedule, scores/wins, durations, cap checks, source/runner/registration hashes, and all 18 reported overall/mode/opponent metric intervals. Maximum interval discrepancy was roundoff, 1.5×10⁻¹⁴.

All 384 matched actuator streams differ, so this is a causally connected control mechanism rather than an internal display-only label. The secondary pooled repaired-full-minus-noAffect effects are **+2.20 score [1.32, 3.12] and +5.47 win-point pp [0.78, 10.16]**. These are descriptive unadjusted intervals, not proof of general benefit. Absolute pooled win points are 35.55% versus 30.08%, so the result also does not establish a strong NPC.

The effect is not uniform: Mode B score changes −0.72 [−1.68, +0.22], although its win points improve +9.90 pp [4.95, 14.58]. ReactiveDodger performance remains null-compatible. Focus switching increases approximately 77/min overall; that is a mechanism effect, not automatically a quality improvement. This remains a hand-designed appraisal/persistence rule, not a validated model of emotion.

**Known ancillary measurement defect:** ahead/tied/behind recall counts are invalid because the frozen targeted recorder checked RECALL/player instead of the simulation's RECALL_START/owner event. They are excluded from conclusions and preserved as invalid raw instrumentation, rather than silently corrected after the run. Actuator hashes/exact comparisons, scores/wins, focus counts, budget checks and the primary conclusion are unaffected.

This repair changes every non-noAffect arm's behavior, so the original sixteen-ablation sweep, learning curves and adversarial results cannot be presented as having validated the new final app. Its evidence is this targeted fresh study plus regression tests. No broad rerun is claimed.

## Final scope and artifacts

The result is a working, instrumented testbed with some useful causal control mechanisms, a repaired affect path, real adverse and null findings, and clear remaining implementation/acceptance gaps. It is not completion of all requested learning signatures or validation of every named cognitive theory. Browser-to-Node replay, current browser play/visual verification, owner engagement and remote PR delivery remain open.

- Scope map: `acceptance-matrix.md`
- General independent recomputation/sensitivity: `general-posthoc-diagnostics.json`, `analyze-general.py`
- Terminal learning independent validation/contrasts: `learning-posthoc-diagnostics.json`, `analyze-learning.py`
- Targeted repair independent validation: `affect-independent-validation.json`, `validate-affect.py`
- Original source-specific findings: `phase5-findings.md`, `learning-interpretation.md`, `phase4a-exploits.md`

All post-hoc analyses are explicitly marked. Original reports, raw evidence, source fingerprints and known measurement failures are retained. The next architecture decisions should use these gaps rather than redesigning mechanisms until significance appears.
