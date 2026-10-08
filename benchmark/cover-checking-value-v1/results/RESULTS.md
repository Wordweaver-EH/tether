# Frozen learned-checking-value evaluation

## Result

Ordinary free refresh remains strongest. The imposed restricted-processing regime is a substantial handicap: its mean public score margin is **−2.042**, compared with **−10.792** for learned allocation. Even within the costful regime, always checking (**−7.583**) is better than the learned policy. Thus this experiment does not establish an optimal checking rule or an improvement to ordinary Tether.

Within that restricted regime, the frozen learned policy improves over its individually count-matched schedule by **3.333 public score points per bout**, and over both no-extra-processing and shuffled-value controls by **4.917**. This is exploratory evidence of useful allocation in this particular heldout setting. Timing benefit versus the schedule is positive in four of six seed clusters, negative in two, and one cluster contributes a large effect. The development pilot was negative and is preserved; no policy, feature, price, model or opponent was retuned afterward.

## Exact design and scope

- Published prospective source: [9715f508](https://github.com/Wordweaver-EH/tether/commit/9715f508f5eeeef4ee0893b7e1651f9ea798bb26).
- 168 bouts: six untouched seed clusters × both seats × two heldout reactive opponent families × seven allocations. Every cell ran once; no exclusions or reruns.
- 3,360 full 3.2-second windows. Each bout has 64 seconds of complete delayed-sensor outcome exposure.
- Primary outcome: raw PUBLIC TOTAL SCORE MARGIN, including ring objective points. Secondary: that margin minus the declared .0005 per additional executed operation.
- All costful arms share 1 Hz passive processing, fixed tactical priors, ordinary legal visibility, motor noise and latency. Check purchases a .4-second processing window with .1-second movement/throw embargo. Reconsider executes 120 geometric trajectory evaluations, with .2-second embargo and at most .6-second active plan execution.
- OrdinaryRefresh receives normal delivered legal observations at every decision without the artificial processing embargo. It is an adequate-information diagnostic outside the restricted-cost regime, not a cost-matched arm.
- Only allocation is learned. Tactical routines, uncertainty proxy and candidate-plan utility are fixed priors. No trained tactical habits, general cognition or transfer to another domain is established.

## Primary outcomes

Every row contains 24 bouts and the same six seed clusters. Higher margin is better; every policy has a negative mean margin against these opponents.

| Allocation | Mean raw margin | Mean priced utility | Continue / check / reconsider | Mean embargo seconds | Extra operations, total |
|---|---:|---:|---:|---:|---:|
| Ordinary free refresh (diagnostic) | -2.042 | -2.042 | 480 / 0 / 0 | 0.000 | 0 |
| Always costly check | -7.583 | -7.699 | 0 / 480 / 0 | 2.000 | 5568 |
| Learned allocation | -10.792 | -11.583 | 26 / 152 / 302 | 3.150 | 37998 |
| Count-matched schedule | -14.125 | -14.917 | 26 / 152 / 302 | 3.150 | 38000 |
| Shuffled-value model | -15.708 | -15.735 | 370 / 110 / 0 | 0.458 | 1281 |
| No extra processing / zero policy | -15.708 | -15.708 | 480 / 0 / 0 | 0.000 | 0 |
| Mapped frozen v2 monitor | -16.000 | -16.001 | 475 / 5 / 0 | 0.021 | 58 |

Learned and scheduled have identical intervention counts in every paired bout, not merely aggregate totals. They also average the same 3.15-second embargo. Executed extra operations differ slightly (37,998 versus 38,000) because passive overlap and trajectories can change acquisitions; this is reported rather than treated as perfect computational identity. The priced learned-minus-scheduled difference is 3.333 points per bout.

## Six independent seed-cluster summaries

Each difference averages both seats and both families within its seed. Values are learned minus comparator in raw public margin. Windows and bouts within a seed are not independent policy replications. No confirmatory significance claim is made.

| Seed | vs schedule | vs shuffled | vs no extra | vs always check | vs ordinary refresh |
|---|---:|---:|---:|---:|---:|
| 34019 | -2.250 | 1.250 | 1.250 | -10.250 | -17.000 |
| 34031 | 6.250 | 7.250 | 7.250 | -1.000 | -13.250 |
| 34033 | -1.750 | 1.250 | 1.250 | 1.250 | -9.000 |
| 34039 | 15.250 | 11.750 | 11.250 | 11.000 | -4.000 |
| 34057 | 2.000 | 3.000 | 3.000 | -3.250 | -4.000 |
| 34061 | 0.500 | 5.000 | 5.500 | -17.000 | -5.250 |

Learned beats shuffled and no-extra-processing in all six seed clusters, but the global shuffled-reward control destroys action averages and the association with compute penalties as well as contextual structure. It is a broad label-dependence control; that comparison alone does not establish context-sensitive timing. The count-matched comparison is the more direct timing test. Its action multiset is obtained from the learned bout after that bout runs, then independently permuted without using donor event times. This is a prespecified, retrospectively dose-matched comparator conditioned on a post-treatment whole-bout action count, using one fixed independently seeded schedule per pair. It is not an independently deployable prospective schedule or an unconditional optimal-policy test. Equal action dose does not imply equal acquired information or executed computation, and it does not isolate a same-state causal timing effect.

## Opponent-family breakdown

| Family | Learned mean | Schedule mean | Shuffled mean | No-extra mean | Always-check mean | Ordinary mean |
|---|---:|---:|---:|---:|---:|---:|
| reactiveOrbit | -10.000 | -14.417 | -14.333 | -14.167 | -7.083 | -1.333 |
| reactiveFlank | -11.583 | -13.833 | -17.083 | -17.250 | -8.083 | -2.750 |

Both families favor learned over schedule, with mean improvements 4.417 and 2.250 respectively. These are two related reactive variants, a modest distribution shift rather than broad generalization.

## Actual action effects and attribution

The learned policy completes 302 reconsiderations, changes the selected plan 177 times, and produces 4,686 non-embargo movement ticks different from its routine. Its 152 checks produce 1,758 additional processing samples; these include absent observations, not just successful sightings. These are actual actuator and acquisition facts, not labels saying an individual mistake was prevented.

The mapped v2 monitor emits only five checks across 480 choices. Its gating/sampling regime and frequent reset censoring make it weakly exposed, as already seen in the development pilot. Treat it descriptively; the result supports no superiority claim over an actively checking monitor in its original regime.

Raw simulator hit and ring components are separately preserved. Their totals include the fixed final .15-second tail that the controller has not yet observed, while the primary label ends at sensor time 64. Therefore these component sums can differ from the primary totals by small tail effects; they are diagnostics, not substituted training or primary labels.

| Allocation | Final simulator hit-margin total | Final simulator ring-margin total | Primary observed-margin total |
|---|---:|---:|---:|
| Ordinary free refresh (diagnostic) | -110 | 62 | -49 |
| Always costly check | -289 | 105 | -182 |
| Learned allocation | -275 | 15 | -259 |
| Count-matched schedule | -348 | 9 | -339 |
| Shuffled-value model | -391 | 15 | -377 |
| No extra processing / zero policy | -393 | 16 | -377 |
| Mapped frozen v2 monitor | -400 | 16 | -384 |

The learned policy's smaller hit deficit than always-check is offset by much less ring reward. The main task score, rather than a combat-only proxy, correctly ranks always-check above learned. Ring awards are never mislabeled as successful attacks.

## Learning evidence and limits

Training used 960 uniformly randomized windows from 48 bouts in 12 seed clusters. Action support: continue 310 / check 326 / reconsider 324; 818 nonzero public task outcomes. Per-action ridge values are frozen before this evaluation. The training target includes total public score and actual declared compute price, not prediction residual reduction or hand-authored desired-action labels.

Development action-value MSE fell .718907→.668225→.637404 with 12 / 24 / 48 training bouts, but a simple per-action-mean predictor was better at every budget (.626835/.627845/.631338). Convergence or superior contextual prediction is therefore not established. The development learned policy also failed to beat count-matched or shuffled controls. Both negative diagnostics remain part of the record.

Training randomization identifies a short-horizon action-value estimate under its behavior distribution. Prior airborne projectiles and plan effects can carry into windows; all outcomes and resets are retained. Frozen-policy evaluation is necessary for cumulative behavior, and still only has six seed clusters. There is no individual prevented-mistake claim, no optimality proof, and no ordinary-Tether advantage.

## Execution and audit

Original scoring session 75309 terminated exit0 on 2026-10-08 at 03:36:33 UTC. The scorer verified exact frozen source and full local training-bundle bytes before running and unchanged source afterward. Every one of the 168 cells is unique, every full window retained, all per-action count matches exact. Producer replay/endpoint/cost audit passes all 168 logs / 3,360 windows. Independent raw-data audit also passes all 168 cells and 3,360 windows: features, labels, frozen choices, executed costs, count matching and monitor behavior all reproduce. It independently detects all 3,625 actual resets through sensor time 64 with no false positives, missed resets or cache state spanning a reset; five additional tail resets are correctly outside the sensor outcome window. Details are in audit-summary.json. The source-bound full aggregate had 397/397 passing tests before execution; source is unchanged.

Measured bout wall time totals 96.468 seconds; subject-interface wall time totals 42.469 seconds. These include telemetry and shared-host scheduling, not isolated planner timings. Exact operation counts and enforced embargo durations are the reproducible cost measures.

- Frozen source-manifest SHA256:  1852197b5ab0ec0dace972ff22d9b649c08c2f07d2d0a7c6344cafece5817f98
- Archived LOCAL full training-bundle SHA256:  159ecabb7ead898652574c5341db899c3ced5c70fd861ff045693d664338e4de
- Full scored-summary SHA256: 2d61cacdc714174719f96b2fb34875eb37dc03913a70160e34437eafaa773fb7

compact-summary.json contains aggregate results, all six paired seed effects and per-bout compact records/hashes. execution-provenance.json records the release and original terminal execution. Full replay logs and per-window feature/reward rows remain local and are excluded from publication. Public source, fixed seeds and parameters support regeneration; new runtime-containing bundles will have different byte hashes and require their own recorded replication freeze.
