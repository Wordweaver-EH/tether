# D16/D17: terminal interpretation

## Bottom line

The requested four-stage competence trajectory is **not demonstrated**. Failure prediction becomes better calibrated, but the common attack situations recruit **more** Type 2 work after repeated training, without a corresponding broad success improvement. The Bayesian opponent model responds to deliberate switches, but **a within-bout hit-rate benefit is not established** by either primary D17 contrast.

These are functional measurements of a toy non-LLM controller against synthetic proxies. They are not human-play evidence or evidence of subjective consciousness.

## Completed experiment

- 8,704 bouts, each 300 seconds, Mode B, logical cognition cap 192 per cycle, both seats, direct/anchor synthetic habit families
- D16: 32 independent seed clusters, 12 training episodes and 3 separately seeded held-out episodes, full / noMetacog / noAutomatization / noLearning: 7,680 bouts
- D17: 64 disjoint held-out seed clusters, full / noAdaptation, fixed / midpoint-switching habits: 1,024 bouts
- Repeated seats/families are averaged within seed. Intervals are descriptive 95% percentile seed-cluster bootstraps with 2,000 resamples, without multiplicity adjustment
- Variants interleave by episode, with seed/episode-counterbalanced order and separate memory. Held-out bouts share the final training snapshot but never pass memory to another held-out bout
- Frozen executable source SHA-256: `19800346ef69e63f1917ee67d02f4f083285101cb4342ed39d323d195b0bc9e5`

## D16: calibration, not automatic competence

Selected common full-model situations illustrate the pattern; every situation, episode, ablation, null and outcome count remains in the HTML/compact JSON. These are endpoint estimates, not paired effect tests.

| Situation | Training episode | Sparse-credit success, % [95% CI] | Type 2 share, % | Logical work/decision | Failure Brier |
|---|---:|---:|---:|---:|---:|
| HELD:seen:far | 1 | 6.96 [5.61, 8.34] | 95.73 | 175.58 | 0.207 |
| HELD:seen:far | 12 | 6.88 [5.48, 8.20] | 98.98 | 178.25 | 0.072 |
| EMBEDDED:seen:far | 1 | 25.84 [22.38, 29.53] | 83.56 | 152.22 | 0.330 |
| EMBEDDED:seen:far | 12 | 27.91 [25.22, 30.56] | 94.94 | 159.60 | 0.213 |
| HELD:seen:near | 1 | 42.60 [35.60, 49.93] | 40.78 | 130.33 | 0.479 |
| HELD:seen:near | 12 | 32.31 [28.13, 36.73] | 93.54 | 172.40 | 0.258 |

Sparse credit means positive score-margin change within the implementation's 1.5-second attack-credit window; a no-score timeout is failure. It is not the cohort hit rate or bout-win rate. The improved Brier scores can reflect learning to predict persistent failure; they do not establish improved play. Outcome-free situations remain null rather than fabricated successes.

Configured sensory latency is fixed at 150 ms. Separate measured act() means/medians/p95 are included per situation, but they include shared-host contention, JIT, garbage collection and tracing overhead. There is no demonstrated learned sensory-latency reduction. For example, HELD:seen:far measured mean was 0.161 ms [0.149, 0.174] initially and 0.169 ms [0.156, 0.186] at episode 12; this is a CPU timing observation, not human reaction time.

### Mechanism limitations that block stronger stage claims

- The automatic label is not executed learned-action coverage. Embedded-state tactics are subsequently overwritten by the recall/direct-vs-lead rule. The flag can affect escalation, but an increase in that counter does not by itself demonstrate successful learned Type 1 control
- Automatic eligibility requires successful Type 2 teaching; noMetacog disables Type 2 by construction. Zero automatic labels in that arm are consequently not an independently discovered stage transition
- noLearning is a broad treatment: it also disables adaptation, learned priors and automatic retrieval. Its bout results cannot isolate tabular learning alone
- Situation visitation and available attack outcomes change with policy; conditional success rates do not hold state distribution fixed
- Held-out seeds assess fresh stochastic trajectories against the same selected proxy families, not unseen human habits or unrestricted generalization

## D17: posterior response without an established hit-rate benefit

Primary contrast: (full last-third minus first-third) minus (adaptation-off last-third minus first-third).

| Proxy | Resolved-shot hit-rate interaction, percentage points [95% CI] | Hits/min interaction [95% CI] |
|---|---:|---:|
| Fixed habits | -1.90 [-5.01, +1.50] | -0.080 [-0.431, +0.316] |
| Switching habits | +2.25 [-2.06, +6.26] | +0.105 [-0.312, +0.523] |

Both contrasts are null-compatible; they do not establish benefit or equivalence. Successful throws are attributed to their original launch-time third, including later recall hits. End-of-bout open throws remain explicitly censored. The paired hit-rate contrasts have 180 fixed and 200 switching seat/family observations, because both arms need resolved shots in both windows; all 64 seed clusters remain represented. Hits/min uses all 256 observations per condition and points in their actual time windows.

After the midpoint, a posterior reopen occurred in 94.92% [92.19, 97.27] of switched full-model bouts and 75.39% [70.70, 80.08] of fixed full-model bouts. Among reopened bouts, seed-cluster mean delay was 2.35 seconds [1.39, 3.41] after switches and 21.20 seconds [18.27, 24.65] in the fixed control. Natural maneuver reversals also cause reopening; these diagnostics cannot stand in for a performance effect.

## Verification and output recovery

All 8,704 expected job/variant/episode/seed identities were checked. The original runner completed experiments, then exceeded V8's single-string limit while pretty-printing the report. Complete JSONL checkpoints were intact. An external streaming postprocessor reused the original frozen summary/render functions, validated all rows and unchanged source, and produced the final reports without rerunning experiments. It also orders plotted series to match the fixed legend palette, without changing values.

See `learning-final.postprocessing.json` for recovery-script/raw-data/template hashes and command, `learning-final.checksums.sha256` for artifact integrity, and `learning-final.compact.json` for the full methods and 960 per-situation curve points. `learning-final.rows.jsonl.gz` retains all raw rows. Additional reviewer contrasts should be identified as post hoc rather than substituted for the primary contrasts above.

## Independent post hoc checks

An independent reviewer subsequently computed additional seed-paired aggregate contrasts (see `independent-review/learning-posthoc-diagnostics.json` and its analysis script). These were not the preselected primary contrasts and are unadjusted for multiple comparisons:

- Full model, training episode 12 minus 1: aggregate sparse-credit success +0.43 percentage points [−0.79, +1.65], Type 2 share +10.00 points [8.23, 11.71], and logical work +6.65 units/decision. This reinforces the absence of the predicted cheap automatic-competence transition
- Across the 384 held-out paired bouts (32 seed clusters), noLearning minus full: win credit +4.04 points [0.52, 7.81], score margin +3.71 [2.42, 5.06], and cohort hit rate +3.46 points [2.22, 4.73]. The broad learning/adaptation bundle did not demonstrate a held-out advantage here; this comparison does not identify which component is responsible
- noAutomatization minus full held-out win credit −1.04 points [−2.73, +0.39] and score margin −0.18 [−0.55, +0.21] remain null-compatible; Type 2 share and logical work increase slightly (+1.76 points and +1.18 units)
- A post hoc switching-minus-fixed hit-rate interaction was +6.98 points [1.45, 12.55] on only 136/256 complete-case pair sets. Conditioning on all necessary resolved-shot rates creates strong selection risk. The corresponding time-normalized comparison on all 256 pair sets remains null-compatible. This secondary, selected-data hint does not replace the two primary D17 results
