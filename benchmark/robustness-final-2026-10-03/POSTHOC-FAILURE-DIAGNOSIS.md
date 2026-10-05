# Tether: post-hoc failure diagnosis

This is a descriptive, post-hoc reading of the completed evaluation and frozen source, not a new experiment, confirmatory test, or isolated causal finding. No outcomes were generated or raw-event files re-extracted. Counts below cover all 48 default-condition bouts per named arm: 12 clusters × 2 seats × 2 bouts, 300 seconds each, totaling 240 simulated minutes per arm.

## Where the performance deficit came from

Full mind scored 306 physical HITs and received 230; conventional scored 4,677 and received 361. Full mind therefore scored 4,371 fewer HITs while receiving 131 fewer. The net-score gap was 4,240 HITs over 240 minutes. Its own scoring rate was 1.275 HITs/minute versus 19.4875, or 6.54% of conventional's offense. The dominant descriptive deficit was offense, not additional damage received.

Source: `tether-qualified-analysis-v2/analysis-attempt-001/scores.json`, rows with `task.condition="default"`, summing `own`, `opponent`, `net`, and `denominatorMinutes` separately for `mind-full` and `conventional`.

## Why learned habits did not produce an autopilot

Across the 48 full-mind default bouts:

- Automatic habits were available on 353,368/431,808 native decisions (81.83%), but Type-2 deliberation ran on 422,604/431,808 (97.87%)
- Among valid familiar automatic-habit decisions, 61,138/61,496 still ran Type 2 (99.42%)
- Monitor-forced replanning occurred on 337,420/431,808 decisions (78.14%); novelty-forced replanning on 290,207/431,808 (67.21%). These categories overlap; the summaries do not retain their intersection or trigger breakdown specifically within familiar decisions
- Of the 422,604 Type-2 decisions, 150,335 ended `unresolved-overlap` and 21,878 `no-completed-branch`: 172,213/422,604 (40.75%) lacked a selected completed branch
- `handoffBlocked` was true on 170,627/431,808 decisions (39.51%)

Source: the 48 `evaluation-*-default-mind-full-*.diagnostics.json` files in that same analysis directory; `novelty.nativeDecisions`, `automatic`, `type2`, `validFamiliar`, `planStatus`, and `counters`.

## The source-grounded bottleneck

In frozen `tether-robustness-shifts/repo-evaluation/src/mind/index.mjs` (lines 153–163), novelty and prediction-monitor requests can force deliberation despite an automatic habit. Lines 215–216 clear throw and recall when a forced handoff lacks a matching selected branch. In `cognition.mjs` (lines 139–169), each rollout has four 0.15-second simulation steps. In `rollout-completion.mjs` (lines 13–21), an unfinished branch whose upper bound overlaps the best completed candidate prevents selection.

This creates a concrete plausible failure mechanism: persistent replanning plus unresolved branch comparisons can turn uncertainty into an offensive veto. Learned familiarity was present, but it rarely translated into execution without deliberation. The recorded summaries do not identify how many unresolved comparisons were specifically caused by the short horizon, nor establish how much of the scoring deficit this mechanism caused.

## Weak successful feedback despite extensive deliberation

Full mind issued 1,385 native sparse-credit episodes: 1,384 completed and one was censored. Of the completed episodes, 289 had positive reward and 1,095 had nonpositive reward (79.12%). Of 1,213 issued teacher-tier episodes, all completed and 245 were positive (20.20%). These counts describe successful credited feedback available to learning, not physical attack conversion.

Source: the same 48 diagnostics, `calibration.native` and `calibration.nativeRows`. Frozen `cognition.mjs` (lines 43–69) credits net score changes over a window up to 1.5 seconds and ignores additional record requests while one episode is pending.

## Boundaries on the conclusion

`handoffBlocked` is not a count of withheld attacks: the gate can be active when no throw or recall was proposed. Native credit episodes are not physical attempts, and credit success is not hit accuracy. These derived diagnostics do not preserve the actual pre/post offensive-proposal or physical THROW/RECALL event counts, so exact attack opportunities, attempts, withheld attacks, and hit accuracy are unavailable from this bounded review.

The ablations do not isolate one sufficient cause. In the same default sample, no-novelty scored 352–270 (net 82), and broadcast-cut 359–267 (net 92), versus full mind's 306–230 (net 76); neither recovered conventional's 4,677–361 (net 4,316). These descriptive totals add no new significance claim. The supported interpretation is an offense-poor controller with near-continuous deliberation, frequent unresolved control, and limited successful action credit. A verified causal connection between modules is insufficient to establish useful adaptation or positive robustness contribution.
