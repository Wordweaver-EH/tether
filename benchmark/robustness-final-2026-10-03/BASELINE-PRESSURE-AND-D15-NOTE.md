# Tether: baseline pressure and D15 control note

This addendum is a descriptive, post-hoc reading of frozen source and existing saved evaluation events. It is not a new simulation, causal experiment, tuning result, or test of counterplay. No controller fixes or game-rule changes were implemented.

## Ordinary baseline: rapid lead throws and immediate recycling

The selected ordinary controller is `conventional-g5-c0`, recorded in the evaluation task headers against qualified baseline commit `36398123d89881576443145b0b7826c8cf2203c9`.

Its decoded `throwMode` is 0.44655, below the 0.65 threshold for any intentional embed-target selection. It therefore aims at the opponent with velocity lead, rather than mixing direct and intentional embedding tactics. Explicit lead is approximately 0.243 seconds, with additional distance compensation. Its minimum throw interval is approximately 0.583 seconds. Its `recallMode` is approximately 0.218, selecting recall immediately after its spear estimate becomes EMBEDDED, without requiring crossing geometry.

This is more than an isolated throw button: the policy also strafes, manages distance, dodges and avoids recall lines. Source: frozen `tether-robustness-shifts/repo-evaluation/src/agents/param.mjs`, especially lines 102–143 and the movement/dodging logic below them.

## Existing physical events

All 48 default-condition ordinary-baseline bouts were read: 12 clusters × 2 seats × 2 bouts, 300 seconds per bout, totaling 240 simulated minutes.

- Physical THROW events: **18,157**
- Physical RECALL_START events: **13,491**
- Own HIT events: **4,677**; opponent HIT events: **361**; net: **4,316**
- Own OUTBOUND HITs: **4,480 (95.79%)**
- Own RETURNING HITs: **197 (4.21%)**
- Consecutive within-bout THROW gaps: median **0.667 seconds**, mean **0.756 seconds**; 18,109 intervals
- Consecutive within-bout own-HIT gaps: median **2.642 seconds**, mean **2.918 seconds**; 4,629 intervals
- Physical EMBED to RECALL_START gaps: median **0.167 seconds**, mean **0.171 seconds**, range **0.158–0.183 seconds**; 13,491 matched intervals

Gap statistics exclude bout boundaries. They are not the reciprocal of the aggregate scoring rate. Recall timing is compatible with the imposed perception/command latency. These are physical-event counts, not proposed-command counts or learning-credit episodes.

Sources: 12 `evaluation-*-default-conventional-s*.jsonl.gz` files in `tether-robustness-shifts/evaluation-attempt-001/raw` and 36 in `tether-evaluation-recovery/resume-attempt-001/raw`. Event records were attributed to the focal player using the task seat; HIT phase separates outbound from returning scores. Own/opponent HIT totals reconcile exactly with `tether-qualified-analysis-v2/analysis-attempt-001/scores.json`.

For like-for-like rate comparisons over 240 minutes:

- Ordinary: 4,677 own / 361 against; **19.4875 own HITs/minute**, **17.9833 net/minute**
- 2× conventional planner: 267 own / 16 against; **1.1125 own/minute**, **1.0458 net/minute**
- 4× conventional planner: 377 own / 6 against; **1.5708 own/minute**, **1.5458 net/minute**

Source: default-condition rows of the same saved score analysis. These descriptive totals add no new significance claim.

## D15 intent and the implemented control bottleneck

Frozen `notes/decisions.md`, D15, specifies Type 0 reflexes that bypass the workspace, cheap Type 1 intuitions/habits, and Type 2 deliberation recruited by conflict, uncertainty or surprise. D16 explicitly expects successful automatization to reduce escalation, workspace occupancy and latency while preserving success.

The frozen implementation can instead force deliberation despite an automatic habit:

- `src/mind/index.mjs:153–163`: novelty and prediction-monitor requests override habitual execution
- `src/mind/index.mjs:215–216`: a forced handoff with no matching selected branch clears throw and recall; movement and gaze still run
- `src/mind/cognition.mjs:139–169`: rollout propagation is four 0.15-second steps, a 0.6-second travel horizon
- `src/mind/rollout-completion.mjs:13–21`: even a completed best branch is not selected if an unfinished alternative's upper bound could beat it
- `src/mind/prediction-monitor.mjs`, `request()`: replanning can follow either fresh large prediction error or a persistent high-error reliability category

All source paths in this section are relative to `tether-robustness-shifts/repo-evaluation`.

This establishes a plausible uncertainty-to-offensive-veto mechanism, not its causal contribution to the scoring gap. It does not imply the entire agent freezes. The already reported high escalation and unresolved-decision rates are consistent with the intended transition to habitual execution not being realized in these evaluations.

Training-only calibration of novelty, an interruptible best-so-far/habit fallback, and explicit expected-value recruitment of Type 2 are reasonable hypotheses for a future controlled study. A novelty target below 10% is a proposed operating target, not an established false-alarm rate: `src/mind/novelty.mjs` measures joint percept-cell and situation/tactic exposure, not whether the arena is familiar. A fallback must also remain distinguishable from completed, teacher-backed evidence. No proposed fix was implemented or validated here, and low positive credit alone does not prove avoidance prevented learning.

## What this says about the game

The Sep 26 Phase-2 entry in frozen `notes/log.md` recorded immediateRecaller beating embedWaiter 384/384 and hypothesized that a missed direct throw gives a returning “free second shot.” That entry explicitly left degeneracy unconfirmed pending stronger counterplay. The current ordinary baseline scores overwhelmingly on the outbound leg, so these events do not specifically confirm that old returning-hit explanation.

Current default opposition is a four-script ecology. Each opponent family accounts for 12 bouts and 60 minutes:

- immediateRecaller: ordinary scored 909, received 178
- spearRusher: ordinary scored 882, received 78
- embedWaiter: ordinary scored 1,695, received 4
- directShooter: ordinary scored 1,191, received 101

The scripts in frozen `src/agents/strategies.mjs` lack the ordinary controller's reactive dodger. Frozen `src/sim.js:250–260` also resets both players to fixed starts with held spears after a hit, allowing encounters to repeat. These are relevant properties of the tested setting, not isolated causal explanations.

The supported finding is rapid lead-shot/recycle pressure succeeding against these scripted opponents. Universal strategic dominance, game-rule degeneracy and human enjoyment remain unestablished. Human engagement requires a separate evaluation; no human playtest was performed for this addendum.
