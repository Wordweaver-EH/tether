# What the Phase 4 adversaries can and cannot establish

The searched policies are not hidden-state oracles: during play they consume the same `percept()` interface, with a 150 ms percept queue, and infer unseen positions from their own memory. Both controllers obey the same simulation movement, turn-rate, spear, scoring, and visibility rules.

They are nevertheless not a matched cognitive comparator:

- The search uses substantial offline evolutionary optimization and repeated tournament feedback. The final mind does not receive an equal offline training budget.
- The parameterized policy recomputes an action at the simulation's 120 Hz rate. The normal mind updates its controller at 30 Hz and is subject to its finite 192-unit cognition budget. The param policy has no equivalent charged cognition budget.
- Policy aim noise is uniform in ±0.009 × (1 + opponent speed / 4) radians. The normal mind's aim noise is Gaussian, with standard deviation 0.034 + 0.0075 × desired angular speed, capped at 0.18 radians. These distributions and effective motor precision are not matched.
- The named scripted opponents generally have no explicit percept-latency queue and no comparable aim-noise injection. They are stress-test baselines, not matched minds.
- The same policy parameter family, arena, and named opponents constrain what the search can discover. An offline-search victory does not establish a general cognitive superiority, a consciousness deficit, or a globally dominant strategy.

The justified Phase 4 claim is narrower: these game agents are exploitable under the tested controller configurations, and the tested policy population either did or did not find useful persistent-anchor play. Tests of whether a specific cognitive mechanism changes behavior belong to the separately matched full-vs-ablation study, not to this adversarial win-rate comparison.

A future motor- and training-budget-matched adversarial study would be a distinct, pre-specified experiment. It was not silently substituted into the running held-out confirmation.

Source: final frozen `src/agents/param.mjs` (latency, every-tick action and uniform noise), `src/mind/index.mjs` (normal-difficulty settings, cycle rate and cognition budget), `src/mind/components.mjs` (`planGaze` Gaussian noise), and `src/agents/strategies.mjs` (scripted baselines). File SHA256 values are included in the source manifest.
