# Independent training audit: qualified actual-output freeze

Disposition: **eligible to freeze the actual recorded policies and memory snapshots, with an explicit tie-policy deviation**. This is not a clean protocol-compliance or statistical pass. No controller execution, training, repair, reselection or rerun was performed during this audit. Preserve the original comparator and recorded outputs. New held-out condition design must wait until the parameter/snapshot manifest and this deviation are committed and the exact Git bytes are verified.

## Data integrity and source

All 4,224 planned task rows were independently checked: three conventional arms each have 1,024 screening and 256 selection bouts; twelve mind histories each have 32 bouts. All task IDs, regenerated candidate vectors, mutation parent references, seeds, opponent/seat assignments, default MODE_B settings,45/300-second durations, score events and net-score calculations agree. All 384 conventional proposals regenerate from their recorded preceding-generation parents using the locked code. No omitted/duplicate task, failure artifact or restart was found; process exit record is 0 and stderr is empty.

All 40 locked source/configuration file hashes remain unchanged, fingerprint `cc62c10edd292e033f01f297a2567e58f5868a50fc921c46ee5d116a6f39525e`. Locked source uses only default worlds and legal percepts through the common 150ms/30Hz interface, with no shifted condition or privileged terminal finish. Raw results support the configured information boundary; they do not independently reconstruct every unlogged controller input.

All 12 memory histories have 32 ordered hash-linked input/output snapshots, beginning from null. Every final snapshot matches its final raw row. Each45-second task has 1,346 focal decisions and each 300-second task has 8,996, totaling14,498,304 decisions. Existing planner integration counts and mind budget bounds check out.

## Verified ranking deviation

The protocol specifies mean net score with lexicographic vector then candidate-ID tie breaking. The implementation summed floating-point per-bout rates in asynchronous completion order. Mathematically tied rates sometimes differ by one or a few floating-point units, so the score comparator ran before the intended tie breaker.

Fourteen of 24 within-generation rankings differ from exact net-score ranking:
- Ordinary: generations 2 and 3
- Useful 2x: generations 0,1,4 and 7
- Useful 4x: generations 0 through7

Three generations change top-four parent membership:
- Ordinary generation 3: c11 and c13 each total 75 net points, mean 12.5. Stored c11 is 12.499999999999998 and c13 is 12.5, selecting c13 fourth; exact tie breaking selects c11
- Useful 4x generation 4: c1 and c2 each total 21, mean 3.5. Stored c1 is 3.4999999999999996 versus c2 at 3.5; exact tie breaking selects c1 fourth instead of c2
- Useful 4x generation 6: c3, c14, c7, c10 each total 25. Stored c3/c14 are4.166666666666666 while c7/c10 are4.166666666666667; exact tie breaking places c3/c14 in the selected parent set instead of c7/c10

Ordinary generation 2 and useful 4x generation 1 also change parent order, affecting the subsequent round-robin mutation allocation despite identical membership. Useful 4x generation 7 changes parent order but has no subsequent generation. Other discrepancies are below the consequential parent boundary.

All three actual finalist sets and complete final-selection rankings remain identical under exact integer-score reranking of the candidates that were actually evaluated. This does not establish what a counterfactual tie-corrected evolutionary search would have produced. Do not retrospectively change candidates, winners or scores, redefine the earlier protocol, or claim the hypothetical search would have had the same outcome.

The locked comparator reproduces recorded rankings from saved floating-point scores, and every 384 screening score is attainable by IEEE addition of its eight raw rates. However, the exact asynchronous reduction order was not logged. Reducing those raw cells in fixed task order changes nine generation rankings. **Seed-only deterministic optimizer replay is therefore not certified.** Detailed discrepancies are retained in AUDIT-DETAILS.json and IEEE-SCORE-AUDIT.json.

## Exact actual outputs eligible for qualified freeze

- Ordinary: conventional-g5-c0; no lookahead level; vector SHA-256 `eaa8c3a9b3dc539f13e8c9aae59b4160009b0ed351f1bf1a847dbc0eba29806a`
- Useful 2x: conventional-useful-2x-g7-c1; level 4; vector SHA-256 `5ddb4d7f80c4074baca2d5a4fe11d3d4dfb0a1d16a5223b18b97bf28369ffc30`
- Useful 4x: conventional-useful-4x-g0-c5; level 5; vector SHA-256 `a5c4659ad56f2b7681e09d6d2e184fadc9b3d1b6fa378d2ddc477e6abff8f284`

Vector hashes above use SHA-256 of JSON.stringify(vector). Full selected vectors and twelve exact snapshot hashes are bound in freeze/PARAMETER-SNAPSHOT-MANIFEST.json, independently verified SHA-256 `8d90d0e94f0d448f3d62eab8f1596e6380f090c3b692de13f83497f80d6d8e98`. TRAINING-RESULT.json SHA-256 is `22e55df015fd05f6f10ce60c61a8e938becf92b6c461e0b71b9cfbf6eb1cece4`.

Mind totals reproduce: 3,454,464 cycles,3,374,232 tier2 cycles and 3,437,124 non-reflex cycles. The predeclared formula gives fixedTeacherEvery=1. Thus this trained workload recruited Type2 nearly every non-reflex cycle; the teacher lesion is not a sparse scheduled intervention. Retain the actual totals and interpretation.

## Actual cost reporting and limits

Decision-weighted mean wall time over the recorded training mix:
- Ordinary: 0.010953ms across 3,681,280 decisions
- Useful 2x: 3.253778ms across 3,681,280 decisions
- Useful 4x: 5.383289ms across 3,681,280 decisions
- Mind: 0.596427ms across 3,454,464 decisions

These groups have different policy/state mixtures and screening/full-bout composition. They are descriptive actual-training costs, not paired universal2x/4x ratios. Sum of decision durations is additive work telemetry across worker calls, not elapsed wall time or CPU time. Task-wall sums likewise overlap.

Launch-record creation to process-exit record is approximately76.4 minutes; this is not a precision process-start measurement. Maximum sampled process RSS is 1,606,619,136 bytes (about1.50GiB). RSS is process-wide, sampled; it is not per-policy attributable memory.

Per-task process CPU intervals overlap across workers and were deliberately **not summed**. A unique whole-run CPU total and final threshold-monitor accounting receipt were not saved. Therefore no exact aggregate CPU claim is made, and the lack of that receipt is not evidence that a limit was exceeded. The process completed without a resource-ceiling error. Future evaluation should retain scoped whole-run accounting without altering these frozen training outputs.

## Required next boundary

Commit the exact actual parameters/snapshots and explicit deviation before held-out configuration design. Preserve all raw outcomes, rankings and source history. The subsequent mirrored all-arm development pilot remains mandatory after baseline lock and before the full study. This audit grants no pilot or held-out execution permission and makes no claim that the selected policy family is globally optimal or that training scores establish generalization.
