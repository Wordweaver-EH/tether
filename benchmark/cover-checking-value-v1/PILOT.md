# Learned checking-value implementation and negative development pilot

## Bottom line

The mechanism really learns three action values from randomized game outcomes, and reconsideration really executes additional computation and changes motor decisions. This development pilot does **not** establish useful learned timing. The learned policy loses to count-matched scheduling and is effectively tied with shuffled values. Ordinary free percept processing is substantially stronger, so restricted processing is a major imposed handicap, not a demonstrated property of ordinary Tether.

No heldout results exist at this checkpoint. All numbers below are development data; do not relabel them heldout or confirmatory.

## Training

48 bouts / 12 seed clusters / 960 fixed-horizon windows, uniformly randomized assignments: continue 310, check 326, reconsider 324. 818 windows have nonzero public task-score changes. All outcomes, failures, resets and unchanged plans are retained. 166 reconsider decisions change the selected plan; 4,620 non-embargo movement ticks differ from the routine. These are actuator facts, not proven prevented mistakes.

Training target: public total score-margin delta less the declared .0005 per executed extra operation. Ring score is correctly included in task value, never mislabeled a hit. Primary evaluation is raw public total margin, with priced utility/costs separately reported.

A ridge value model, three per-action regressions, uses 13 bounded pre-action features. The uncertainty feature is a declared age/speed proxy, not learned epistemic uncertainty. The tactical routine and geometric planner are hand-coded priors. Only allocation is learned; no tactical habits are trained.

## Six-bout development totals (three seed clusters)

| Allocation | Raw public margin | Priced utility | Continue / check / reconsider |
|---|---:|---:|---:|
| Learned | -95 | -99.8235 | 8 / 35 / 77 |
| Count-matched schedule | -87 | -91.8220 | 8 / 35 / 77 |
| Shuffled rewards | -94 | -94.1050 | 102 / 18 / 0 |
| No extra checking | -110 | -110 | 120 / 0 / 0 |
| Mapped v2 monitor | -110 | -110 | 120 / 0 / 0 |
| Always costly check | -106 | -106.6960 | 0 / 120 / 0 |
| Ordinary free refresh diagnostic | -28 | -28 | 120 / 0 / 0 |

Margins use complete delayed-sensor windows. Final simulator hit/ring event totals can differ by a point because the final 0.15-second unobserved tail is deliberately outside labels. It is retained in raw replay and final-world diagnostics, not discarded based on its outcome.

Validation action-value MSE on separate randomized development bouts decreases from 0.71891 to 0.66822 to 0.63740 with 12, 24 and 48 training bouts (240/480/960 rows). This is a prediction-learning curve, not evidence of policy superiority. An independent non-tuning diagnostic finds that simple per-action mean prediction is better at every budget: MSE 0.626835 / 0.627845 / 0.631338, respectively. Thus even useful contextual prediction or convergence is not established. Rows are not independent examples; families and seats share seed clusters.

The shuffled model is a broad label-dependence control: global reward shuffling also destroys action means and the association with compute costs. Beating it alone would not isolate contextual timing. Count-matched schedules preserve each action's dose, but actual acquisitions and changed commands can differ through trajectory effects.

## Why the old monitor has zero delivered checks

Independent reconstruction finds 16 assessments, one above its frozen threshold. That pulse is cleared by an observed reset before the next allocation epoch. There are 141 observed resets and 63 reset-censored forecasts across the six bouts; maximum remembered staleness is only 1.133 seconds, below the fixed 2.567-second absence trigger. Sparse processing and frequent defeats prevent exposure to its triggers. This is a valid but unexposed mapping; it is descriptive only and supports no superiority claim over an actively checking monitor. No threshold or mapping was tuned to this outcome.

## Verification and provenance

- 397/397 tests pass using both test/*.test.mjs and delivery-tests/*.test.mjs. Prior 377 + 20 new = 397. The earlier 387 count omitted nine delivery tests and preceded the final added reset test.
- Every one of 48 historical v2 manifest entries matches byte-for-byte; none missing. Default simulator, Duel and previous experiment sources remain unchanged.
- Producer and independent feature/RNG/choice/endpoint/cost/replay audits pass all 48 training logs and 48 development logs, 1,920 windows total. Development contains 42 policy bouts plus six randomized validation bouts.
- Training terminal session 96531: exit 0, source unchanged. Pilot terminal session 62384: exit 0, source unchanged. No rerun overwrote either execution.
- Training bundle SHA256: 159ecabb7ead898652574c5341db899c3ced5c70fd861ff045693d664338e4de.
- Pretraining freeze manifest SHA256: 66233de1b6f830a288eb5633f9ddb9ce3b9ecbeeaf7c80521a51bc7ce4c3d000.
- Prepilot freeze manifest SHA256: 7f2a78cee26438e2d9a66161f6b7da5c01a4176a83d1c8548ee8dadb7f1fef6c.

Between completed training and pilot, an independently reviewed comparator-only fix clears pending old-monitor requests at observable resets, with a dedicated test. Training never instantiates the monitor, so its data are unaffected. The source transition is preserved. After pilot, only reporting and the gated scorer/freeze metadata are added; no policy, price, feature, model, opponent or outcome definition is retuned.

Local complete evidence directory: /workspace/shared/tether-checking-value-evidence. Raw logs are local only and have not been published. Explicit publication approval and separate heldout release are required.
