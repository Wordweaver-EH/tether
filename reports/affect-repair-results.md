# Affect repair: targeted results

## Bottom line

Appraisal-driven persistence now changes actual actions, and the repaired controller improves average score margin in this fixed test panel. That is a repaired causal mechanism and bounded evidence of usefulness, not a universal benefit or consciousness finding.

- All 384 matched pairs had different six-channel raw action streams
- Full minus noAffect score margin: 2.203 [1.315, 3.117] points
- Full minus noAffect win value: 5.469 [0.781, 10.156] percentage points
- Absolute mean win values: full 35.55%, noAffect 30.08%; a tie counts as half a win
- Absolute score margins remain negative: full -3.271, noAffect -5.474

Intervals are descriptive 95% bootstrap intervals clustered over 32 seeds; secondary outcomes and subgroup comparisons are multiplicity-unadjusted. This panel does not establish a generally strong NPC.

## Complete registered study

Completed 2026-10-02T08:10:04.047Z: 768 full 300-second bouts / 384 matched pairs, 32 fresh seeds 200001–200032, both modes and seats, three fixed scripted opponents, normal difficulty and logical budget 192. There were no dropped pairs, duration failures or budget violations. Coefficients, production source, runner and registration remained unchanged during the study; source fingerprint:

    c3ead812bf8a53ab91d7f335fee94839352fe382669dc9f812d0a2f2f7fc55cd

Every pair's action hash differed; exact comparison found 13,712,052 differing input ticks and 3,428,013 differing 30-Hz decision-boundary ticks. Mean divergent input fraction was 99.19%. This large fraction includes downstream trajectory amplification: it does not mean affect directly changed that fraction of independent decisions. The identical-percept causal regression separately establishes a reachable action-control path.

Full produced 77.089 [73.604, 80.297] additional focus switches per minute. Switching is an explanatory mechanism measure, not a quality score; faster switching can help or hurt.

## Heterogeneous physical outcomes

Effects below are full minus noAffect, with descriptive 95% intervals. Win-value effects are percentage points.

| Opponent | Score-margin effect | Win-value effect |
|---|---:|---:|
| directShooter | 1.500 [0.273, 2.719] | 16.016 [6.641, 25.781] |
| immediateRecaller | 5.008 [2.766, 7.195] | -0.391 [-6.641, 5.469] |
| reactiveDodger | 0.102 [-0.188, 0.406] | 0.781 [-3.516, 4.688] |

| Mode | Score-margin effect | Win-value effect |
|---|---:|---:|
| MODE_A | 5.125 [3.922, 6.323] | 1.042 [-5.469, 7.552] |
| MODE_B | -0.719 [-1.677, 0.224] | 9.896 [4.948, 14.583] |

In particular, Mode B's score-margin interval crosses zero and its point estimate favors the control, while its win-value estimate favors full. ReactiveDodger effects are null-compatible. The pooled gain must not erase those limits.

## One ancillary measurement failure

The preregistered descriptive ahead/tied/behind recall counters are unavailable: the runner matched RECALL/player, whereas the simulator emits RECALL_START/owner. The preserved raw zeros are invalid measurements and must not be interpreted as no recalls. No frozen file or result was silently corrected. Primary actuator comparisons, final scores/wins, focus switches, budgets, exposure time and other event counters are unaffected. Reconstructing recall-by-score-state would require a separately identified instrumentation rerun.

Ahead/tied/behind raw exposure, hit and throw counts are descriptive, endogenous outcome-conditioned strata. They do not provide randomized state-specific effects; focus-switch strata refer to the original delayed percept timestamp.

## What may and may not be claimed

The previous frozen v2 implementation failed to connect affect to a reachable decision boundary. This repair implements DESIGN.md's appraisal-controlled persistence and shows actual behavioral influence. The separate preregistered study supports an average score benefit only for its panel, with heterogeneous outcomes.

Original v2's broad mechanism audit, budget sweep, learning curves and exploit study remain evidence for their original source. They cannot be relabeled as evaluations of this repaired revision. All non-noAffect arms change under the repair. A comprehensive repaired-version claim requires corresponding reruns. The neutral control's action and replay streams match the original noAffect controller exactly in cross-build regressions.

## Reproduction and artifacts

- [Frozen registration](affect-repair-preregistration.md)
- [Implementation and portability instructions](affect-repair-implementation.md)
- [Complete source/runner/registration manifest](affect-repair-targeted.manifest.json)
- [Complete paired raw rows](affect-repair-targeted.rows.jsonl)
- [Results and machine-readable intervals](affect-repair-targeted.json)
- [Production source patch](affect-repair-source.patch)
- [Separate portable-test hashes](affect-repair-test-manifest.sha256)

139 tests passed before launch. A postlaunch test-only ORIGINAL_SOURCE environment override was independently revalidated; production, runner and preregistration bytes were unchanged. No remote publishing or user-computer work was performed.
