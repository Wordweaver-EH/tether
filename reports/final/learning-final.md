# D16/D17 learning audit

Full-length synthetic-proxy audit; descriptive evidence

Bouts: 8704; duration: 300s; repeated-learning seeds: 32; adaptation held-out seeds: 64; cognition cap(s): 192.
Source SHA-256: 19800346ef69e63f1917ee67d02f4f083285101cb4342ed39d323d195b0bc9e5; unchanged: true.

## Interpretation

These are synthetic-proxy measurements, not human playtests. The four competence stages are a hypothesis. No stage labels are assigned automatically. A convincing stage transition would require success to improve, calibrated failure awareness to precede improvement, and Type2 share/compute/latency to fall while held-out success holds. The report exposes the measurements even when this pattern is absent.
Confidence intervals are descriptive seed-cluster bootstrap intervals. Overlapping/null-compatible intervals do not establish equivalence. Latency below is the implementation’s modeled delay, not a measured timing advantage.

## D17 within-bout adaptation

| Proxy | Budget | Hit-rate difference in differences [95% CI] | Hits/min difference in differences [95% CI] | Reopen after midpoint |
| --- | ---: | --- | --- | --- |
| fixed | 192 | -0.019 [-0.050, 0.015], n=64 (null-compatible) | -0.080 [-0.431, 0.316], n=64 | 0.754 [0.707, 0.801], n=64 |
| switching | 192 | 0.022 [-0.021, 0.063], n=64 (null-compatible) | 0.105 [-0.312, 0.523], n=64 | 0.949 [0.922, 0.973], n=64 |

Difference in differences = (learning-on last third minus first third) minus (adaptation-off last third minus first third). Hit rate uses resolved throw cohorts; end-of-bout open throws remain censored. Full JSON retains all three windows, shot counts, point scores, posterior trajectories, and missing estimates.
Reopen counts include natural movement reversals; the fixed proxy is the midpoint control. A reopen alone is not proof of successful adaptation.

## D16 full-model first/last training episode, by situation

| Situation | Budget | Episode | Success [95% CI] | Type2 share | Work/cycle | Modeled latency (s) | Predicted failure / actual failure | Failure Brier | Outcomes |
| --- | ---: | ---: | --- | --- | --- | --- | --- | --- | ---: |
| EMBEDDED:hidden:far | 192 | 1 | 0.143 [0.024, 0.286], n=21 | 0.562 [0.507, 0.614], n=32 | 135.557 [132.088, 138.882], n=32 | 0.150 [0.150, 0.150], n=32 | 0.024 / 0.857 | 0.815 [0.667, 0.935], n=21 | 33 |
| EMBEDDED:hidden:near | 192 | 1 | 0.143 [0.057, 0.247], n=28 | 0.469 [0.366, 0.576], n=32 | 129.035 [122.514, 136.149], n=32 | 0.150 [0.150, 0.150], n=32 | 0.077 / 0.857 | 0.740 [0.644, 0.834], n=28 | 68 |
| EMBEDDED:seen:far | 192 | 1 | 0.258 [0.224, 0.295], n=32 | 0.836 [0.808, 0.862], n=32 | 152.223 [150.448, 153.987], n=32 | 0.150 [0.150, 0.150], n=32 | 0.514 / 0.742 | 0.330 [0.297, 0.366], n=32 | 2563 |
| EMBEDDED:seen:near | 192 | 1 | 0.316 [0.276, 0.360], n=32 | 0.636 [0.581, 0.687], n=32 | 138.769 [135.045, 142.198], n=32 | 0.150 [0.150, 0.150], n=32 | 0.335 / 0.684 | 0.405 [0.371, 0.441], n=32 | 1193 |
| HELD:hidden:far | 192 | 1 | insufficient (n=0) | 0.911 [0.862, 0.957], n=30 | 172.763 [168.702, 176.528], n=30 | 0.150 [0.150, 0.150], n=30 | not observed / not observed | insufficient (n=0) | 0 |
| HELD:hidden:near | 192 | 1 | insufficient (n=0) | 0.525 [0.402, 0.646], n=28 | 141.377 [131.543, 151.164], n=28 | 0.150 [0.150, 0.150], n=28 | not observed / not observed | insufficient (n=0) | 0 |
| HELD:seen:far | 192 | 1 | 0.070 [0.056, 0.083], n=32 | 0.957 [0.943, 0.970], n=32 | 175.581 [174.319, 176.750], n=32 | 0.150 [0.150, 0.150], n=32 | 0.730 / 0.930 | 0.207 [0.181, 0.236], n=32 | 3844 |
| HELD:seen:near | 192 | 1 | 0.426 [0.356, 0.499], n=32 | 0.408 [0.379, 0.439], n=32 | 130.329 [128.114, 132.757], n=32 | 0.150 [0.150, 0.150], n=32 | 0.123 / 0.574 | 0.479 [0.415, 0.540], n=32 | 380 |
| OUTBOUND:hidden:far | 192 | 1 | insufficient (n=0) | 0.395 [0.215, 0.589], n=17 | 130.948 [116.574, 146.546], n=17 | 0.150 [0.150, 0.150], n=17 | not observed / not observed | insufficient (n=0) | 0 |
| OUTBOUND:hidden:near | 192 | 1 | insufficient (n=0) | 0.329 [0.164, 0.511], n=20 | 124.282 [111.000, 139.308], n=20 | 0.150 [0.150, 0.150], n=20 | not observed / not observed | insufficient (n=0) | 0 |
| OUTBOUND:seen:far | 192 | 1 | insufficient (n=0) | 0.090 [0.081, 0.101], n=32 | 105.854 [105.023, 106.757], n=32 | 0.150 [0.150, 0.150], n=32 | not observed / not observed | insufficient (n=0) | 0 |
| OUTBOUND:seen:near | 192 | 1 | insufficient (n=0) | 0.321 [0.289, 0.353], n=32 | 123.747 [121.172, 126.305], n=32 | 0.150 [0.150, 0.150], n=32 | not observed / not observed | insufficient (n=0) | 0 |
| RETURNING:hidden:far | 192 | 1 | insufficient (n=0) | 0.433 [0.330, 0.546], n=28 | 133.553 [125.446, 142.411], n=28 | 0.150 [0.150, 0.150], n=28 | not observed / not observed | insufficient (n=0) | 0 |
| RETURNING:hidden:near | 192 | 1 | insufficient (n=0) | 0.500 [0.409, 0.590], n=31 | 140.006 [132.685, 147.159], n=31 | 0.150 [0.150, 0.150], n=31 | not observed / not observed | insufficient (n=0) | 0 |
| RETURNING:seen:far | 192 | 1 | insufficient (n=0) | 0.205 [0.179, 0.232], n=32 | 114.811 [112.712, 116.944], n=32 | 0.150 [0.150, 0.150], n=32 | not observed / not observed | insufficient (n=0) | 0 |
| RETURNING:seen:near | 192 | 1 | insufficient (n=0) | 0.299 [0.271, 0.328], n=32 | 121.800 [119.502, 124.231], n=32 | 0.150 [0.150, 0.150], n=32 | not observed / not observed | insufficient (n=0) | 0 |
| EMBEDDED:hidden:far | 192 | 12 | 0.094 [0.000, 0.250], n=16 | 0.884 [0.833, 0.932], n=32 | 155.432 [152.018, 158.682], n=32 | 0.150 [0.150, 0.150], n=32 | 0.476 / 0.906 | 0.364 [0.265, 0.489], n=16 | 25 |
| EMBEDDED:hidden:near | 192 | 12 | 0.280 [0.147, 0.427], n=25 | 0.774 [0.712, 0.832], n=32 | 148.150 [144.142, 152.035], n=32 | 0.150 [0.150, 0.150], n=32 | 0.668 / 0.720 | 0.254 [0.173, 0.340], n=25 | 52 |
| EMBEDDED:seen:far | 192 | 12 | 0.279 [0.252, 0.306], n=32 | 0.949 [0.937, 0.962], n=32 | 159.597 [158.751, 160.441], n=32 | 0.150 [0.150, 0.150], n=32 | 0.725 / 0.721 | 0.213 [0.196, 0.230], n=32 | 2472 |
| EMBEDDED:seen:near | 192 | 12 | 0.323 [0.294, 0.351], n=32 | 0.942 [0.921, 0.958], n=32 | 158.217 [156.957, 159.370], n=32 | 0.150 [0.150, 0.150], n=32 | 0.676 / 0.677 | 0.247 [0.228, 0.266], n=32 | 1198 |
| HELD:hidden:far | 192 | 12 | insufficient (n=0) | 0.926 [0.857, 0.978], n=30 | 173.294 [167.200, 178.113], n=30 | 0.150 [0.150, 0.150], n=30 | not observed / not observed | insufficient (n=0) | 0 |
| HELD:hidden:near | 192 | 12 | insufficient (n=0) | 0.539 [0.435, 0.641], n=30 | 141.298 [132.503, 149.999], n=30 | 0.150 [0.150, 0.150], n=30 | not observed / not observed | insufficient (n=0) | 0 |
| HELD:seen:far | 192 | 12 | 0.069 [0.055, 0.082], n=32 | 0.990 [0.985, 0.994], n=32 | 178.252 [177.468, 178.889], n=32 | 0.150 [0.150, 0.150], n=32 | 0.930 / 0.931 | 0.072 [0.059, 0.085], n=32 | 3849 |
| HELD:seen:near | 192 | 12 | 0.323 [0.281, 0.367], n=32 | 0.935 [0.913, 0.956], n=32 | 172.402 [170.664, 174.067], n=32 | 0.150 [0.150, 0.150], n=32 | 0.609 / 0.677 | 0.258 [0.233, 0.282], n=32 | 411 |
| OUTBOUND:hidden:far | 192 | 12 | insufficient (n=0) | 0.333 [0.154, 0.538], n=17 | 126.652 [112.325, 143.033], n=17 | 0.150 [0.150, 0.150], n=17 | not observed / not observed | insufficient (n=0) | 0 |
| OUTBOUND:hidden:near | 192 | 12 | insufficient (n=0) | 0.271 [0.115, 0.461], n=21 | 121.683 [109.206, 136.889], n=21 | 0.150 [0.150, 0.150], n=21 | not observed / not observed | insufficient (n=0) | 0 |
| OUTBOUND:seen:far | 192 | 12 | insufficient (n=0) | 0.092 [0.086, 0.099], n=32 | 105.466 [104.837, 106.159], n=32 | 0.150 [0.150, 0.150], n=32 | not observed / not observed | insufficient (n=0) | 0 |
| OUTBOUND:seen:near | 192 | 12 | insufficient (n=0) | 0.325 [0.304, 0.346], n=32 | 123.123 [120.836, 125.325], n=32 | 0.150 [0.150, 0.150], n=32 | not observed / not observed | insufficient (n=0) | 0 |
| RETURNING:hidden:far | 192 | 12 | insufficient (n=0) | 0.498 [0.370, 0.623], n=26 | 139.468 [128.860, 149.566], n=26 | 0.150 [0.150, 0.150], n=26 | not observed / not observed | insufficient (n=0) | 0 |
| RETURNING:hidden:near | 192 | 12 | insufficient (n=0) | 0.434 [0.328, 0.543], n=31 | 134.666 [126.136, 143.361], n=31 | 0.150 [0.150, 0.150], n=31 | not observed / not observed | insufficient (n=0) | 0 |
| RETURNING:seen:far | 192 | 12 | insufficient (n=0) | 0.188 [0.165, 0.211], n=32 | 113.487 [111.532, 115.444], n=32 | 0.150 [0.150, 0.150], n=32 | not observed / not observed | insufficient (n=0) | 0 |
| RETURNING:seen:near | 192 | 12 | insufficient (n=0) | 0.283 [0.264, 0.302], n=32 | 121.214 [119.681, 122.799], n=32 | 0.150 [0.150, 0.150], n=32 | not observed / not observed | insufficient (n=0) | 0 |

Per-situation curves for every training episode and ablation are in the HTML report and JSON. Held-out rows start from a final training snapshot, with fresh seeds and no memory carryover between held-out bouts. Sparse attack credit is not the same quantity as hit rate or bout win. Situation visitation changes under policy changes; missing outcome estimates remain null.

## Held-out bout results

| Variant | Budget | Episode | Win (ties 0.5) [95% CI] | Score margin [95% CI] |
| --- | ---: | ---: | --- | --- |
| noAutomatization | 192 | 13 | 0.660 [0.539, 0.781], n=32 | 7.203 [4.297, 10.133], n=32 |
| noLearning | 192 | 13 | 0.734 [0.629, 0.836], n=32 | 9.906 [6.430, 13.383], n=32 |
| full | 192 | 13 | 0.684 [0.570, 0.797], n=32 | 7.805 [4.844, 10.875], n=32 |
| noMetacog | 192 | 13 | 0.676 [0.563, 0.789], n=32 | 9.273 [5.375, 13.367], n=32 |
| noLearning | 192 | 14 | 0.723 [0.621, 0.824], n=32 | 10.820 [7.109, 14.500], n=32 |
| full | 192 | 14 | 0.695 [0.570, 0.813], n=32 | 7.047 [4.102, 10.039], n=32 |
| noMetacog | 192 | 14 | 0.688 [0.570, 0.805], n=32 | 9.523 [5.727, 13.500], n=32 |
| noAutomatization | 192 | 14 | 0.688 [0.563, 0.805], n=32 | 6.891 [3.781, 9.977], n=32 |
| full | 192 | 15 | 0.695 [0.590, 0.805], n=32 | 6.586 [3.891, 9.367], n=32 |
| noMetacog | 192 | 15 | 0.652 [0.523, 0.773], n=32 | 8.516 [5.023, 12.188], n=32 |
| noAutomatization | 192 | 15 | 0.695 [0.586, 0.809], n=32 | 6.805 [3.992, 9.648], n=32 |
| noLearning | 192 | 15 | 0.738 [0.637, 0.840], n=32 | 11.844 [7.703, 16.008], n=32 |

## Definitions

- **success:** Resolved sparse attack credit: positive score margin within 1.5s of attempted throw/recall. Neutral timeout is failure. Not bout win or verified geometric hit.
- **failureAwareness:** Predicted failure at attempt vs actual failure at resolved attack credit; Brier and absolute error on matching outcomes.
- **latency:** Configured sensory latency, equal across processing tiers. No fabricated Type2 increment and no empirical computation-latency advantage.
- **variantOrder:** Learning variants interleaved each episode and counterbalanced by seed/episode. Adaptation on/off order alternates by seed. Shared-host CPU contention remains a limitation.
- **wallTime:** Decision runtime is performance.now() around act() on traced cognitive-cycle ticks, matched by delayed percept timestamp plus queue delay. Per-situation mean/median/p95 milliseconds exclude sim/proxy/percept construction/trace copying. Concurrent CPU load, JIT, GC and measurement overhead remain; latency is not a human reaction-time estimate. Whole-simulation wall time is reported separately.
- **hitRate:** Successful resolved throw cohorts / resolved throw cohorts by throw-time third; returning hits credit original throw; unclosed final throws explicitly censored.
- **adaptationEffect:** (full last-third minus first-third) minus (noAdaptation last-third minus first-third), paired seeds/seats/families.
- **posteriorReopen:** First logged reversal after midpoint, with latency and probability/confidence trajectory; natural maneuver reversals can also trigger this, so fixed proxy is a control.
- **uncertainty:** Seed-cluster percentile bootstrap 2000 resamples, descriptive unadjusted 95% CI; repeated seats/families within a seed are averaged, not independent replicates.

## Limitations

- No human play data, no claim of subjective consciousness
- Four competence stages are a hypothesis, never assigned from episode number
- Selected synthetic fixed/switching habits are not fitted human proxies
- One cognition cap here; budget sweep is in separate indicator audit
- Held-out bouts may continue within-bout learning, but their memory never feeds another held-out bout
- Sparse credit is model-defined; delayed consequences past its horizon can be mislabeled
- Sensory latency is fixed; empirical act() timings are host-load/JIT/GC sensitive and measured with trace enabled
- Conditional situation rates may reflect changing situation visitation; all raw counts retained
- No multiple-testing correction; null-compatible intervals are not evidence of equivalence

## Reproduce

```sh
node arena/learning-audit.mjs --seeds 32 --adaptationSeeds 64 --episodes 12 --heldout 3 --workers 1 --durationSec 300 --budgets 192 --modes MODE_B --opponents direct,anchor --variants full,noMetacog,noAutomatization,noLearning --seedStart 101 --adaptationSeedStart 700001 --resume false --label final --out ../final-reports/learning-final
```
