# Maze transfer v1: result and limitations

**Result:** real unchanged-module reuse in a working second domain, with action-level causal fixtures. This small gameplay sample does **not** demonstrate a benefit from selected content or episodic memory. Contingent monitor control slightly reduced pellet collection compared with cutting that control. No code was tuned after scoring.

Pre-score checkpoint: `824f86d661eec93c0445be166de2c6e5d03a8e1d`. Frozen source fingerprint: `85d2cdf7753068cc3e82ad7761746746ca16e88052a536c3ce07b78c26dcec05`. The root verified the remote checkpoint and ten blob entries before authorizing scores. Runtime Node v24.19.0. All 36 preregistered episodes completed, every emitted-action replay reproduced every percept/outcome exactly, and source hashes matched before/after. Final pre-score regressions: 358/358, comprising 346 existing tests and 12 new maze tests. No inherited production file changed; the prior 44-file source manifest remains exact.

## What transferred

The actual existing workspace competition/hysteresis/channel routing, entire coordination pipeline, target-content schema/delivery controls, episodic memory, prediction-monitor feedback/control, and budget function execute in the maze. [The audit](../../maze/README.md) lists functions, inherited constants and couplings; [the frozen manifest](source-manifest.json) gives hashes and line spans. There is no copied replacement architecture bearing familiar labels.

This is not full-controller or learned-skill transfer. New maze code implements geometry, public pellet knowledge, partial observation, ghost motion assumptions, goal saliences, cardinal actuators and a two-step planner. Combat specialists, particle belief, tactical learning, novelty families, automatization and combat affect do not transfer. A single ghost uses the existing `opponent` referent; multiple ghosts require a real schema change. No consciousness, general intelligence or human-fun claim follows.

## Fixed gameplay outcomes

Seeds below are always ordered 1709, 3253, 6421. Each cell lists pellets before collision, completion or the 64-step cap. Maximum is 44.

| Arm | Familiar pellets | Switch pellets | Deaths / 6 episodes |
|---|---|---|---:|
| Full | 44, 32, 41 | 43, 26, 41 | 2 |
| Content delivery cut | 44, 32, 41 | 43, 26, 41 | 2 |
| Episodic read cut | 44, 32, 41 | 43, 26, 41 | 2 |
| Monitor control cut | 44, 32, 44 | 43, 26, 44 | 2 |
| Fixed four-tick control | 44, 32, 11 | 28, 26, 11 | 5 |
| Conventional tracker | 44, 32, 11 | 28, 26, 11 | 5 |

Full minus contentCut and memoryOff was zero pellets and zero deaths in all six pairs. Full minus monitorOff was `[0, 0, -3]` in each condition: mean **−1 pellet** familiar and **−1 pellet** switch; the switch-minus-familiar interaction is zero. Full's death count did not improve against these isolated cuts. Full completed one of six mazes; monitorOff completed three of six. ContentCut/memoryOff each completed one, fixed/conventional each one.

Full exceeded fixed/conventional by `[0, 0, 30]` familiar and `[15, 0, 30]` switch pellets. This is a bundled small-comparator difference, not an isolated workspace benefit or optimal-baseline result. The fixed schedule often requested control with an empty cache; actual invalidations were only four per condition. Conventional uses a simpler tracker/goal switch and no workspace/coordination decision pipeline. Both retain the same observation/action contract, domain planner, inherited legality projection and nominal cap.

All full/content/memory/monitor-cut episodes reached the shift boundary. Fixed and conventional each died at step16 on seed6421 in both conditions, before any shifted behavior; these failures were retained, not replaced. The three independent seed clusters, shared small map and intentionally tiny matrix support description only, not significance or general performance claims.

## Actual causal effects, with scope

Pre-score controlled fixtures establish more than packet counts:

- Existing workspace channel cut changes movement N→E with identical selected content, focus and logical work, under shared every-step replanning
- Episodic read cut changes movement E→W after occlusion on an identical three-percept stream; same Threat focus/work and no monitor request
- Selected-content delivery/override changes emitted gaze or movement without inventing fresher evidence or extending TTL
- Monitor control cut changes actual movement on identical pilot percepts while assessment/feedback state stays equal

These are functional intervention fixtures, not evidence of benefits or subjective experience.

In frozen common-percept replays of all six full trajectories (332 decisions), contentCut changed **24 gaze outputs and no movement outputs**; memoryOff changed **one movement and five gaze outputs**; monitorOff changed **eight movements and no gaze outputs**. These are conditional action divergences on full's recorded sensor stream. They are not counterfactual closed-loop outcomes. Gameplay outcomes above are from separate paired closed-loop episodes.

## Monitor activity, costs and recovery

| Full path metric | Familiar (3 episodes) | Switch (3 episodes) |
|---|---:|---:|
| Decisions | 166 | 166 |
| Observed ghost frames | 50 | 96 |
| Selected packets / episodic reads | 65 / 18 | 105 / 10 |
| Assessed forecasts / error >0.5 | 41 / 13 | 89 / 33 |
| Control requests | 31 (18.7%) | 63 (38.0%) |
| Fresh-error / sustained-high-error requests | 13 / 18 | 33 / 30 |
| Cache invalidations / planning calls | 28 / 100 | 56 / 115 |
| Nominal logical units | 6,484 | 6,859 |

After the nominal boundary, full requested control on 23/94 familiar decisions and 55/94 switch decisions. The switch increased visible evidence opportunities (34→80 post-boundary frames) as well as errors, so error/recovery summaries are on-policy diagnostics, not matched detector accuracy. Nominal budget is explicitly not CPU-operation matching; public-grid food preprocessing is separately counted in compact results. MonitorOff used 85 planning calls in each condition versus full's 100/115 and nevertheless collected more pellets on one seed.

Full had nine assessed-high→assessed-low recovery intervals in familiar, all closed within 0.5–6.5 seconds. Switch had ten closed intervals (0.5–9 seconds) and one still high at termination, right-censored after five seconds. These intervals measure inherited category changes conditional on receiving observations, not calibrated certainty or successful behavioral recovery.

First post-boundary large-error ticks for full were familiar `[null,30,24]`, switch `[34,30,24]`. **Tick24 observes pre-switch step23**: shifted policy first acts during step24 and is observable from tick25. Thus seed6421's tick24 error cannot be credited to detecting the switch. Seed3253 first errors at the same tick in both conditions. Using only assessments with observations after changed dynamics could be visible, the switch arm's first large-error ticks are `[34,30,26]`. There is no reliable change-detection claim.

## Limitations and stopping point

The planner ignores inherited uncertainty radius/confidence magnitude. Inherited memory linearly extrapolates and can cross maze walls; future maze prediction stops at walls. Continuous legality projection is rounded back to cells. The inherited 1-second TTL, 0.3-second due horizon, 0.5-unit error threshold and four-unit/sec body bound remain unchanged and are not maze-calibrated. Inspect never demonstrated ordinary focus selection under current hysteresis; actual checking comes through content/monitor scheduling.

Pilot seed991 informed correctness and initial visibility placement, so it is excluded from performance evidence. No additional seeds, maps, training or retuning followed these scored results. The bounded task stops here: a working headless prototype, explicit portability boundary, causal fixtures, and negative/null gameplay findings alongside a limited comparator advantage.

## Reproduction and evidence

```
node maze/run.mjs full familiar
node --test test/maze-transfer.test.mjs
node benchmark/maze-transfer-v1/run.mjs verify
node benchmark/maze-transfer-v1/run.mjs score /empty/external/evidence/path 824f86d661eec93c0445be166de2c6e5d03a8e1d
```

The runner's checkpoint argument is a provenance assertion; the remote checkpoint was independently verified by the publishing root for this run. The [compact summary](results/compact-summary.json) preserves every episode, paired difference, process denominator, recovery interval and common-percept contrast. The [log manifest](results/log-manifest.json) records hashes for 36 raw episode files (12,808,443 bytes). Raw data stays separate locally; it was not uploaded. No PR-body edit, merge or deployment was performed.
