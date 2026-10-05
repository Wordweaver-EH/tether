> Current version (2026-10-03): the default controller is now the experimental rebuilt N/S + C1/C2 checkpoint. Start with [CURRENT_STATUS.md](CURRENT_STATUS.md) for 264-test verification, source identity, completed new evidence and remaining gaps. The older study results and source manifests below apply only to their explicitly named historical versions.

# Tether: delivered results and scope

This pass delivers a working non-LLM implementation, reproducible CPU experiments, negative findings, and a narrowly repaired affect mechanism. It does **not** establish all of the proposed functional-consciousness architecture, subjective consciousness, or human engagement.

## Two source versions, different evidence

| Version | Source fingerprint | Evidence |
| --- | --- | --- |
| Original v2, immutable reference | `19800346ef69e63f1917ee67d02f4f083285101cb4342ed39d323d195b0bc9e5` | Phase 4 adversarial study; 39,168-bout general audit; 8,704-bout learning/adaptation audit; 131 original tests |
| Delivered default, affect-repaired | `c3ead812bf8a53ab91d7f335fee94839352fe382669dc9f812d0a2f2f7fc55cd` | Separate preregistered 768-bout full/noAffect study; 139 implementation/runner tests plus seven delivery-helper tests |

Only two production files differ: `src/mind/workspace.mjs` and `src/mind/index.mjs`. The repair changes full-model behavior, so the broad original-v2 findings cannot be treated as evaluations of the delivered revision. The full repaired-version ablation, budget, learning, and exploit studies were **not rerun**. Both source manifests, the original archive/runtime reference, and the exact repair patch are included.

## Main findings

### Original v2 general mechanism audit

The complete 39,168-bout study crossed 17 variants, three logical budgets, six opponents, 32 seeds, both modes and both seats. At budget 192, effects are ablated minus full, in win-value percentage points:

- `noPrediction`: −14.1 [−17.7, −10.8]
- `noAttentionSchema`: −36.0 [−39.3, −33.1], comparing adaptive gaze against forced open-loop rotation; this is not a selective test of Attention Schema Theory
- `noToM`: +8.1 [+6.6, +9.7]; the specific opponent-cone heuristic harmed results
- Original `noAffect`: every recorded metric matched in all 2,304 pairs. Source review found the control path structurally nonbinding. This was a failed mechanism implementation, not evidence against affect in general

The restricted `noWorkspace` intervention removes channel arbitration but retains focus, hysteresis, and serial planning. Its win effect was −1.69 pp at budget 48, −3.84 at 192, and −1.37 at 512. The hypothesized scarce-compute advantage/convergence pattern was not established, and this comparator cannot settle a broad workspace theory. Metacognition, deliberation, and counterfactual win intervals included zero at every budget, despite some score/behavior changes.

Intervals are descriptive seed-cluster bootstraps, unadjusted for multiplicity. Read the [corrected findings](reports/final/phase5-findings.md) and [independent review](reports/independent-review/evidence-review.md) for intervention scope and post hoc sensitivity checks.

### Original v2 learning and adaptation

The 8,704-bout study comprised 7,680 repeated-learning/held-out bouts and 1,024 fixed/switching-habit adaptation bouts.

- The four-stage competence trajectory was **not demonstrated**. Failure calibration improved, but Type 2 effort increased rather than yielding broad cheap automatic competence
- Automatic-state telemetry overstates executed learned-action coverage; embedded tactics can be overwritten downstream. Zero automatic labels in `noMetacog` also partly follow from the eligibility design
- Primary D17 hit-rate interactions were −1.90 pp [−5.01, +1.50] for fixed habits and +2.25 [−2.06, +6.26] for switching habits. Neither establishes benefit or equivalence
- A post hoc held-out comparison favored `noLearning` over full, but that switch jointly removes several mechanisms and does not isolate tabular learning

The experiment finished before a report-serialization limit was hit. Recovery validated every checkpoint identity and source hash, reused frozen statistics, and generated the report without rerunning agents. A report-only series-order correction aligned chart colors with their legends without changing measurements. See the [learning interpretation](reports/final/learning-interpretation.md).

### Post-audit affect repair

A separate 768-bout registered study evaluated bounded appraisal-driven reorientation costs after repairing the unreachable control path. All 384 matched pairs had different actual action streams; identical-percept regressions separately establish a causal control path.

Full minus noAffect:

- Score margin: +2.203 [1.315, 3.117]
- Win value: +5.469 pp [0.781, 10.156]; absolute means 35.55% versus 30.08%

Outcomes were heterogeneous. Mode B's score-margin effect was −0.719 [−1.677, +0.224], and reactiveDodger effects were null-compatible. These results do not establish a generally strong NPC. The ancillary recall-by-score-state counters are **invalid** because the runner listened for the wrong event fields; raw zeros were preserved and excluded from interpretation. Primary action, score, win, and focus endpoints were independently validated. See [targeted results](reports/affect-repair-results.md).

### Original v2 adversarial search

Phase 4 completed 4,320 short training bouts, 2,160 full-length selection-validation bouts, and 2,816 fresh confirmation bouts. The selected policy earned 89.6% confirmation win points [86.9, 91.8] on its specified panel. Simple-strategy counterexamples were found; persistent-anchor behavior was measurable in a weak control but absent in the searched finalists. No rule repair was adopted.

The adversaries differ from the mind in offline training, action rate, noise, and charged cognition, so victories do not isolate cognitive mechanisms or establish a consciousness deficit. See the [Phase 4 report](reports/final/phase4a-exploits.md).

## Still unestablished or incomplete

- Genuine browser-produced log replay in Node; cloud navigation was blocked with `ERR_BLOCKED_BY_CLIENT`
- Live visual/input/audio/browser-storage validation and human engagement
- D14's expected budget pattern, D16's four competence stages, and D17's primary performance benefit
- Full interaction/budget/learning/exploit evaluation of the repaired source
- Optional D18 emergence/mesa-objective work, richer self-model/theory-of-mind claims, and speech-induced deception

Logical budget equality is not exact CPU/energy/runtime equality. No subjective-consciousness claim is made. No remote push, PR, or deployment was performed. The [acceptance matrix](reports/independent-review/acceptance-matrix.md) distinguishes implemented, empirically supported, negative, incomplete, and externally blocked objectives.
