# D16/D17 learning audit

SMOKE ONLY; not final evidence

Bouts: 16; duration: 2s; repeated-learning seeds: 1; adaptation held-out seeds: 1; cognition cap(s): 192.
Source SHA-256: 67a6944f2d3a2cb9b58e8707804f46bfbbf1a077a17c89990b64fac81c34aaa3; unchanged: true.

## Interpretation

These are synthetic-proxy measurements, not human playtests. The four competence stages are a hypothesis. No stage labels are assigned automatically. A convincing stage transition would require success to improve, calibrated failure awareness to precede improvement, and Type2 share/compute/latency to fall while held-out success holds. The report exposes the measurements even when this pattern is absent.
Confidence intervals are descriptive seed-cluster bootstrap intervals. Overlapping/null-compatible intervals do not establish equivalence. Latency below is the implementation’s modeled delay, not a measured timing advantage.

## D17 within-bout adaptation

| Proxy | Budget | Hit-rate difference in differences [95% CI] | Hits/min difference in differences [95% CI] | Reopen after midpoint |
| --- | ---: | --- | --- | --- |
| fixed | 192 | insufficient (n=0) (insufficient) | insufficient (n=1) | insufficient (n=1) |
| switching | 192 | insufficient (n=0) (insufficient) | insufficient (n=1) | insufficient (n=1) |

Difference in differences = (learning-on last third minus first third) minus (adaptation-off last third minus first third). Hit rate uses resolved throw cohorts; end-of-bout open throws remain censored. Full JSON retains all three windows, shot counts, point scores, posterior trajectories, and missing estimates.
Reopen counts include natural movement reversals; the fixed proxy is the midpoint control. A reopen alone is not proof of successful adaptation.

## D16 full-model first/last training episode, by situation

| Situation | Budget | Episode | Success [95% CI] | Type2 share | Work/cycle | Modeled latency (s) | Predicted failure / actual failure | Failure Brier | Outcomes |
| --- | ---: | ---: | --- | --- | --- | --- | --- | --- | ---: |
| EMBEDDED:seen:far | 192 | 1 | insufficient (n=0) | insufficient (n=1) | insufficient (n=1) | insufficient (n=1) | not observed / not observed | insufficient (n=0) | 0 |
| HELD:seen:far | 192 | 1 | insufficient (n=1) | insufficient (n=1) | insufficient (n=1) | insufficient (n=1) | 0.000 / 1.000 | insufficient (n=1) | 2 |
| OUTBOUND:seen:far | 192 | 1 | insufficient (n=0) | insufficient (n=1) | insufficient (n=1) | insufficient (n=1) | not observed / not observed | insufficient (n=0) | 0 |

Per-situation curves for every training episode and ablation are in the HTML report and JSON. Held-out rows start from a final training snapshot, with fresh seeds and no memory carryover between held-out bouts. Sparse attack credit is not the same quantity as hit rate or bout win. Situation visitation changes under policy changes; missing outcome estimates remain null.

## Held-out bout results

| Variant | Budget | Episode | Win (ties 0.5) [95% CI] | Score margin [95% CI] |
| --- | ---: | ---: | --- | --- |
| noMetacog | 192 | 2 | insufficient (n=1) | insufficient (n=1) |
| full | 192 | 2 | insufficient (n=1) | insufficient (n=1) |

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
node arena/learning-audit.mjs --seeds 1 --adaptationSeeds 1 --episodes 1 --heldout 1 --workers 1 --durationSec 2 --budgets 192 --modes MODE_B --opponents direct --variants full,noMetacog --seedStart 101 --adaptationSeedStart 700001 --resume true --label smoke --out reports/learning-integration-smoke
```
