# Completed outcome-blind calibration: raw checkpoint

The sole released pass completed all 40 controller/trial runs in 27.009 seconds, without failures or repeats. The exact archive includes prepared source/plan, technical release bindings, every raw timing/work row, execution summary and generated timing receipt. CHECKSUMS.json preserves byte counts and SHA-256 identities. The generated receipt and independent saved-row audit both report PASS. The audit verified bindings, row counts, means, coverage, actual work and the fixed resource formula without repeating timing. See INDEPENDENT-RESULT-REVIEW.md. Training still requires its separate explicit release.

Selected useful levels are 4 and 5. Their mean decision wall-time ratios to the mind on this synthetic workload are 3.2065× and 5.2156×, respectively, versus requested lower bounds of 2× and 4×. These are the lowest levels meeting the targets under the fixed rule; overshoot is explicit. They are workload-specific ratios, not equal total compute or gameplay-strength evidence. Actual gameplay timing must also be reported.

The predeclared planning formula yields approximately 20.994 CPU-hours and 5.748 wall-hours, using a declared 3× multiplier plus two-hour reserve and at most eight workers. These allowances are assumptions, not measured full-training cost. Runtime ceilings and resource monitoring remain required.

Pre-run harness checkpoint: cadcacb0f6de8ef08849b370cc792d47f75f6144. Exact controller/training source: code commit b9134f6a6859032ae37fce8f266f848c483db467; combined source fingerprint cc62c10edd292e033f01f297a2567e58f5868a50fc921c46ee5d116a6f39525e. No scored training, held-out conditions or outcomes appear in this calibration archive.

Prepared by dot, the OpenAI assistant. No merge or deployment.
