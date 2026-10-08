# Learned checking value: design for review (not a scored protocol)

This is a new opt-in experimental sensor/computation embodiment, not a repair of ordinary Tether or a direct continuation of the v2 performance numbers. Default Duel, simulator and v2 files remain unchanged. The tactical routine is fixed; only allocation among continue/check/reconsider is learned. No claim of general cognition or learned action habits.

## Minimal meaningful action space

Every arm uses the same public 120 Hz simulation, delayed 30 Hz controller and motor noise. Own body/spear, public map/time/score/objective remain available. Opponent body and spear are admitted only by the sensor gate. A free passive sample every 1.0 seconds remains available to every arm, including no-extra-checking; this prevents a deliberately blind baseline. It is still an experimental sensing restriction and must be labeled as such.

Every 3.2 seconds choose one action. Between choices run the same inexpensive fixed tactical routine from cached belief plus current own/public state. Continue costs no embargo and performs no extra acquisition or rollout. Check makes a 0.4-second fresh legal sensing window, orienting toward predicted target (or a fixed scan when unknown); during the first 0.1 seconds movement and throw are suppressed. Reconsider acquires no extra opponent observation: it evaluates candidate local move/aim plans from cached belief, with fixed bounded forward computation, and suppresses movement/throw for 0.2 seconds. These explicit opportunity costs are imposed equally in all controls. Measured wall/CPU costs are reported separately; nominal work is not called measured computation.

A reconsideration must have separate requested/completed/changed-plan/changed-command telemetry. No post-action visibility or world state is available to action selection. Reset inference uses only impossible own-body displacement to public spawn with public score change; it clears old belief. The simulator is never passed to a controller or learner.

## Learning and attribution

A domain-independent per-action ridge value model receives a bounded numeric vector describing stored belief age/uncertainty, expected target geometry, routine intent, available own resources, and declared action costs. Features are declared before data collection. No current gated opponent fields, enemy world positions, evaluator events, prediction residual reward, or hand-authored desired-action labels enter the learner.

Training randomizes uniformly among all three actions at nonoverlapping 3.2-second windows, independently of context. The label is the subsequent public total score-margin delta, minus a declared small compute-work price. Total task score includes ring awards explicitly; it is never labeled hit success. All windows, zero outcomes, resets and terminal windows are retained. The full fixed 3.2-second window is the causal intention-to-treat unit: prior airborne spears can contribute noise, but randomized allocation is independent of them and own spear state is a feature. No further intervention occurs within the window. This estimates immediate 3.2-second value under the common routine, not lifetime optimal Q-values. Simulator hit/ring events are retained in evaluation-only diagnostics for separate attribution and never used as labels/features.

The action-time embargo already enters the game trajectory and score: report it separately, do not double-count it as a numerical reward subtraction. Compute price is an explicit preference in score units per executed rollout operation, not a claimed physical exchange rate. Report raw task score, cost-adjusted objective and costs separately.

## Controls and split

Frozen learned allocation, old calibrated monitor mapped to the same 3.2-second gated adapter (check on accumulated monitor request; no reconsider), no extra checking, count-matched scheduled check/reconsider using independently phased schedules, and always-check are required. A shuffled-training-value control tests learning contribution rather than architecture alone. All share passive sensing, tactical priors, embodiment and prices. Learned model and shuffled model are frozen before evaluation. The old monitor comparison is its decision rule under the new adapter, not a rerun of v2.

Training and pilot opponents, seeds and score-phase opponent families are disjoint. Training must include action diversity and useful event exposure before interpreting fits. No scored execution until independent review and explicit parent release. Pilot outcomes may guide feasibility but require a new freeze before scoring. Prior v2 scored data are background only, never fitting data.

## Open review choices

1. Is public total-score utility appropriate? It avoids falsely treating ring awards as hits. Separate hit/ring diagnostics remain evaluation-only.
2. Is 1 Hz free passive sensing and the chosen 0.1/0.2-second opportunity cost a defensible bounded experiment? Always-check guards against a starved baseline, but results are conditional on these priors.
3. Local rollout movement must use obstacle-aware candidates and actually affect held tactical decisions. The smallest first implementation will expose geometry/cost traces and run causal-cut tests before training.

Implementation details supersede draft timing: see PROTOCOL.md. OrdinaryRefresh is a separate uncharged full-delivered-percept diagnostic.
