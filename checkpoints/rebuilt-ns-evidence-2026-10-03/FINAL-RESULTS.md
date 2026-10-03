# Tether measurement: no demonstrated gameplay gain from the stricter planner

**The bounded measurement is complete.** The stricter controller produced the same primary actions and hit totals, while its median within-pair decision-time ratio was **1.1134: about 11.3% slower**. This does not complete the broader cognitive milestone. The stricter candidate remains outside the published PR.

The sources are **new rebuilds**, N (novelty-only) and S (stricter completion/contact handling). They are distinct from the lost unpublished candidate; earlier A results and its historical test counts are not evidence for these revisions.

## Primary matched first decisions

All 256 paired emitted input objects were exactly equal.

| Endpoint | N | S |
|---|---:|---:|
| Assigned opportunities | 256 | 256 |
| Physical attempts / hits | 125 / 81 | 125 / 81 |
| Hits per opportunity / attempt | 31.64% / 64.8% | 31.64% / 64.8% |
| No-command decisions | 131 | 131 |
| Actual proposed attacks withheld | 0 | 0 |
| Real deliberations | 219 | 219 |
| Median first-decision time | 0.194443 ms | 0.220221 ms |
| Individual-decision p95 | 0.352248 ms | 0.412233 ms |

The ratio of marginal medians was 1.1326, distinct from the median paired ratio above. S's marginal p95 was 17.0% higher. S was slower in 181/256 pairs. Its 32 unresolved-block flags did **not** suppress an otherwise proposed attack here; flags are not withheld-shot counts. Each arm had 44 terminal misses, with no censored flights, rejected emitted commands or background hits.

## Familiar and novel cases

Predeclared shared predecision strata, identical in both arms:
- **Familiar and automatically eligible:** 96 opportunities, 93 attempts, 49 hits, 64 deliberations
- **Novel and automatically eligible:** 96 opportunities, zero attacks, 96 real deliberations
- **Not automatically eligible:** 64 opportunities, 32 attempts, 32 hits
- No invalid familiarity classifications

Familiarity did not always produce a fast route: awareness triggered deliberation in 64/96 familiar eligible cases. Across all 96, S's median paired time ratio was 1.0984; marginal median ratio 1.1229 and p95 ratio 0.8704. These timings do not establish a general familiar-case speed guarantee.

A **post-hoc descriptive route slice** contained all 32 baseline familiar, eligible tier-1 decisions with zero branches. S retained that route in every case. All were the same near-clear geometry; each arm executed 29 shots and hit 29, with three non-emissions retained. The selected tactic matched the learned tactic throughout. Median paired S/N time ratio was 1.0235. This slice is not a predeclared speed pass or held-out transfer result.

## Ordinary acquisition and five-second continuations

Common training started from null memory and used ordinary N experience: 16 fixed six-second episodes, 27 completed feedback/support updates, eight support cells, and no pending feedback at episode end. The near/seen/held lead habit acquired four ordinary successes and four teacher successes. No competence counters were seeded. Together with the 32 executed fast-route cases, this supports **narrow acquisition and familiar execution in the actual mind**, not general transfer or acquisition under S.

The separate eight-pair, five-second closed-loop appendix kept persisted learning fixed while belief, workspace, inference and plans remained active. Each arm made 1,200 decisions and executed 13 attacks with four hits, in three of eight contexts. N deliberated 69 times; S deliberated 82 times and actually withheld two proposed attacks. Both had nine terminal misses and no flight censoring or background hits. No deferred recall plan arose, so this sample provides no positive delayed-plan execution witness. Full persisted-memory equality was verified throughout.

## Scope and provenance

Eight fixed legal geometry variants were repeated with prespecified controller seeds. Primary moving targets stopped at the first evaluated delivery tick. Both arms shared N-acquired memory; closed-loop histories could diverge after their matched start. Timings are instrumented first-decision costs in one Node v24.19.0 runtime, not steady-state performance or certified full-operation accounting. No tournament, broad transfer or consciousness claim follows.

All 16 training episodes, 32 warmup pairs, 256 primary pairs and eight continuation pairs completed without failed rows in the replacement attempt. An earlier exact-floating-point settings assertion failed **before any controller act**; its immutable failure evidence is retained separately. The reviewed replacement changed only that validation and its regression tests, not policy, latency, seeds or geometry. Raw timing, commands, branches, outcomes, warmups and denominators are preserved; no outcome-based tuning or rerun occurred.

Fresh full suites passed N 175/175 and S 185/185; corrected runner/configuration tests passed 20/20. Independent saved-artifact review verified the headline findings. The measurement supports more honest model-completion semantics, but **no gameplay improvement was demonstrated here**.

### Exact source identifiers

- N commit: `7c4ab294c5dcc8496c3ba6ecd06efd1d059f9b3f`
- N source SHA256: `404562ae94656607dc9e31761b8fba7cb215c7d40320038befdfb3424f4ddc13`
- S commit: `a514c0f7f95f6df1bb987bee315830261b5c6188`
- S source SHA256: `fb1ac97f638637e91467b9eef699d1c50933e7b81adee9aee4bd88422de3d223`
- Released measurement manifest SHA256: `3d3029e2ec1f4bf03b44d65ed50f8b296677e9e46126260e969b2060b95ae596`
