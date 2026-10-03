# Independent saved-row calibration audit

PASS. No timing or controller execution was repeated. Completed result archive SHA-256: `67e5dca229bb7734a718cd5a65e8a25874f683be56678cf8e3db08d6c2a1a50f`.

Verified unchanged source/harness bytes and source-manifest binding; reviewed source fingerprint remains `cc62c10edd292e033f01f297a2567e58f5868a50fc921c46ee5d116a6f39525e`. Review/publication receipt hashes and bindings match the reserved release. All40 unique controller/trial runs completed in27.008749 seconds. Each has484 rows:4 setup,80 warmup,400 measured. Total16,000 measured decisions and160 setup rows;2,000 measurements per controller. Raw hashes, exact fixture/decision assignments, advancing120Hz clocks,150ms delay and cross-arm delivered-percept hashes agree.

Independently recomputed overall/per-fixture/per-trial wall means, medians, p95s, CPU means, selected levels, target ratios, coverage fractions and actual work aggregates. Lowest qualifying levels are4 and5; level3 mean1.197460ms is below2×mind mean1.317622ms, and level4 mean2.112492ms is below4×mind mean2.635243ms.

- Mind mean0.658811ms, median0.588762ms, p95 1.080207ms
- Selected2x label: level4, mean2.112492ms, actual mean ratio3.206523, median1.826365ms, p95 4.304556ms,84.65% of individual decisions above2×overall mind mean
- Selected4x label: level5, mean3.436067ms, actual mean ratio5.215560, median2.956747ms, p95 7.139499ms,69.05% above4×overall mind mean
- Mind routes:1,345 tier1 and655 tier2 decisions, no tier0;655 real deliberations,2,360 branches,1,410 completed branches,10,480 trials and34,075 branch steps
- All conventional planner work/fallback aggregates match raw rows; no measured fallback decisions

Frozen formula reproduces controller-only serial wall allowance6.331197h, planning CPU allowance20.993590h and planned-eight-worker wall allowance5.748397h. These are below monitored24CPU-hour/8wall-hour thresholds. The multiplier/reserve are declared planning assumptions, not measured total CPU. Natural training states, opponents, logging, scheduling and controller routes can change actual costs; stopping rules remain necessary.

This is a workload-specific timing calibration using yoked legal snapshots with empty memory per fixture/trial and imperfect order balancing. It establishes neither universal cost ratios nor gameplay strength. The study's separate training release, subsequent baseline lock, mirrored all-arm pilot and final-study gates remain in force.
