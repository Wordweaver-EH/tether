# Compact pilot 002: independent saved-record audit

## Disposition

PILOT INTEGRITY PASS. FULL-STUDY FEASIBILITY GATE NOT PASSED under the original 16 GiB raw / 24 CPU-hour / 8 wall-hour ceilings. This audit neither reran controllers nor compared policy performance for tuning. No opponent search or full evaluation is approved here.

The single released attempt completed all 192 tasks in 60.523372900 seconds, exit 0. There is a COMPLETE receipt and no failure marker. All 107 closed inputs still match lock 8c38ff5d70726fe8177fc2e4beeae7095544a750a8699f221b772120d71a9584. Every task matches its exact locked assignment, covering all default/mirror, cluster, arm, seat and two-bout cells; arm counts are balanced at 24 each. Seeds and snapshots remain those of the locked paired design.

## Integrity and semantic checks

All 192 compressed-file and decompressed hashes, every row-chain digest/sequence, chain tail and row count pass. There are 215,165 rows and 172,032 decisions: exactly 896 decisions and 30 simulated seconds per task. All decision ticks are 18+4*i; sensor tick is exactly receipt tick minus 18; actual commit time is exactly receipt tick/120. The separate world-time expression differs by at most 3.552713678800501e-15 seconds.

Every recorded applicable faithfulness check passes, with no mismatches. There are 172,032 successful motor/commit/time/delay checks; 107,520 applicable mind-report checks. Evidence-age text has 95,706 applicable successes, with its remaining rows explicitly not applicable. These are consistency checks, not a causal explanation claim.

All 646 native forecast issue records match their native completed outcomes or terminal censors: 620 exact outcome links and 26 censors. The 148 shadow calibration records remain explicitly nonprimary. All native settlement rewards/failure labels match their calibration rows. Every full-content dictionary definition hash validates. All 34,812 simulator events are retained; final score totals agree with recorded score/reset events without comparative score analysis. There are 5,760 one-second checkpoint records.

All 24 freeze-learning bouts preserve accepted initial memory hashes. All 60 mind second-bout inputs link to first-bout outputs. Output memory files match recorded hashes. For all 181 tasks completed in both attempts, final world hashes and output memory hashes are exactly equal to pilot001, providing direct behavioral/output parity evidence over that overlap.

## Resource accounting and practical gate

- Compressed raw: 108,234,050 bytes; uncompressed: 967,946,143 bytes
- Child CPU: 431.679438 seconds, reproduced by summing each isolated terminal child receipt once
- Parent CPU: 1.952502 seconds, added separately
- Accounted total CPU: 433.631940 seconds; final child IPC/exit micro-overhead remains excluded as declared
- Maximum sampled child RSS: 141,611,008 bytes; maximum task wall time: 7.116800 seconds
- Focal decision wall sum: 311.100401 seconds; post-act observer sum: 61.084178 seconds; terminal observer sum: 0.269430 seconds

No CPU total is formed from overlapping wall measurements or by adding task-body CPU to lifetime CPU. This completed attempt has no missing killed-child terminal receipts.

The balanced linear scaling factor to the planned full study is (4224/192)*(300/30)=220. Applying it to observed totals gives:

- 22.176179 GiB compressed raw versus a 16 GiB ceiling
- 26.380410 child CPU-hours; 26.499730 hours including scaled measured parent CPU versus a 24 CPU-hour ceiling
- Approximately 3.699 wall-hours from launch-wall scaling versus an 8-hour ceiling

These are workload-specific planning estimates, not certified bounds. Only default/mirror development conditions and 30-second bouts were observed. Longer sessions, additional shifts, the future searched opponent, scheduling and phase/setup costs can change rates. The projection already exceeds two caps without a safety reserve; the full run therefore cannot be justified by this pilot under unchanged limits. A separately reviewed, explicitly authorized runtime/retention amendment or scope/budget decision is required. Do not reduce scientific coverage, tune policies, discard unfavorable rows or silently relax ceilings.

Original failed attempt001 and successful attempt002 must remain immutable and separately attributed. Full-study feasibility is an engineering gate, not a test of scientific robustness.
