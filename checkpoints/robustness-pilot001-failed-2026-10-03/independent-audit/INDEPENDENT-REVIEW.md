# Pilot attempt 001: independent saved-data audit

Disposition: FAILED AND INCOMPLETE. Preserve this attempt unchanged. It does not pass the pilot gate and does not authorize evaluation. No gameplay or timing was rerun for this audit; no policy comparison or tuning was performed.

## Integrity and stop

The single invocation ran for 55.885692778 seconds and exited 1. FAILURE.json records 181/192 completed tasks and an ESRCH read failure at the runner's /proc process monitor when a child disappeared. There is no COMPLETE.json. All 98 closed input hashes matched the original lock during this audit. Original lock SHA256: 0aa5e25d83226a1962ee8830bc1fa684302d3e90248b7defbb8aa4c1427ba717.

There are 188 raw files: 181 complete, three valid but incomplete gzip-member streams (512, 512, and 768 persisted rows), and four empty streams. Four planned tasks never started. Partial streams have no success/result attribution. Their unflushed final rows and killed-child final resource usage are unknown.

All 181 completed stream chain tails, per-row sequences/digests, physical file hashes, decompressed hashes, byte counts and row counts match their result receipts. They contain 197,866 rows, including 162,176 decisions and 34,424 events. Every completed bout has 896 decisions and 30 seconds simulated duration. Saved task assignments match the locked pilot grid. Final score totals for all 181 completed bouts independently agree with their recorded score/reset events; no comparative score analysis was performed.

## Timing and logger diagnosis

Every saved decision has tick = 18 + 4*decisionIndex, sensorTruth.tick = tick - 18, and sensorTime = (tick - 18)/120. The 14,661 faithfulness mismatches (81 per completed bout) are exclusively commit-timestamp comparisons. Actual commit time equals tick/120 exactly; world receipt time is calculated with a differently rounded floating-point expression. Maximum discrepancy is 3.552713678800501e-15 seconds. This is observer arithmetic, with no observed additional sensor delay, changed cadence, command discrepancy or motor transform discrepancy. All other recorded faithfulness mismatch counters are zero. A corrected observer must preserve exact integer-tick checks and must not weaken unrelated checks.

## Native records and memory

All 640 native calibration records match previously logged native pending forecasts by key, tactic and time, with identical predictedFailure. Noncensored rows match logged native completion reward/actualFailure; 26 are censored. All 148 evaluator-derived shadow rows are explicitly nonprimary. There are 116 separate evaluator-boundary C2 pending censors. No native expiry or physical-hit probability is inferred.

All 24 completed freeze-learning bouts preserve their accepted initial memory hash. All available 60 mind bout-1 input links match the corresponding bout-0 output hash. Output memory files match recorded hashes. Constructor normalization remains separately represented by accepted initial state.

## Resources and limitations

Completed raw data occupy 131,751,581 compressed bytes and 1,877,173,017 uncompressed bytes. Including partial streams, physical raw data total 132,743,281 bytes. Maximum sampled completed-child RSS is 148,234,240 bytes; maximum completed task wall time is 8.242061 seconds. Summed completed task wall times are 411.549440 seconds and must not be mistaken for elapsed wall time. Summed focal decision time is 275.030640 seconds; separately measured post-act observer time is 74.706488 seconds.

FAILURE.json records 415.823475 seconds of completed isolated-child CPU plus 2.013757 seconds of parent CPU. Saved per-result CPU measurements occur slightly before terminal IPC measurements, summing to 415.684914 seconds. The terminal failure aggregate cannot be independently reconstructed exactly from those earlier endpoints. Killed/incomplete children have no terminal CPU receipt; therefore 417.837232 seconds is accounted completed-child plus parent CPU, not certified whole-attempt CPU. The observed failure is ESRCH, not a recorded resource ceiling breach. Available measurements are below declared limits, but absence of a breach receipt is not a complete final resource certificate.

Replacement requires a narrowly scoped infrastructure amendment, new exact-source review, verified Git publication and explicit single-use root release. Preserve agents, configurations, seeds, frozen parameters, snapshots and criteria. Full evaluation and opponent search remain unapproved.
