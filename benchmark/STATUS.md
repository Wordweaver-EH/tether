# Robustness benchmark checkpoint: reviewed interface and training-only plan

One reviewed default-condition training-only attempt is now running with eight workers. Training has not completed, selected baseline parameters are not yet frozen, and no pilot, shifted-condition evaluation or final robustness result is claimed. The measured calibration and completed training batches are linked below.

## Reviewed and tested

The original-grid shared I/O interface and conventional useful-work baseline passed independent source/package review for exact aggregate `d8d29e608d6a315ede6f9186b229bc89254c71aa36a86ec548e5f673952ad6ee` (57 pinned files). See [interface-source-manifest.json](interface-source-manifest.json) and [README](README.md). This historical interface manifest pins the original-grid review. The six-level planner amendment is separately identified by the current combined source manifest; do not expect the historical planner hash to identify amended bytes.

The interface applies one 150 ms sensor delay, 30 Hz decisions, common counter-addressed motor noise and one-frame buttons on 120 Hz simulation packets. Benchmark-only hooks support common embodiment, actual-command memory commit and specified control removals. Normal game configuration remains unchanged; exact default action/state and cognitive-RNG parity are tested against pinned published C1/C2 source. Baseline MPC uses fixed nominal model rules and useful candidate rollouts; this does not establish equal compute, strength or robustness.

Fresh integrated suite: **294/294 tests passed, zero skips**, consisting of the prior 264 checks, 21 interface/baseline synthetic checks and nine pure/synthetic training plan, lock and runtime-control checks. Source-hook changes have their own [all-src manifest](../reports/provenance/robustness-hook-source-manifest.json); older performance belongs only to its historical source versions.

## Reviewed training-only material

[training/TRAINING-PROTOCOL.md](training/TRAINING-PROTOCOL.md), initial vectors, training seeds and pure candidate generator passed independent review. The proposed finite search covers current/default conditions only. Training runner/worker and hard resource/lock controls passed independent review and nine synthetic checks. The [reviewed file index](training/REVIEWED-FILES.json) and [combined source manifest](training/RELEASE-SOURCE-MANIFEST.json) identify this exact code. These checks do not authorize a run or establish gameplay validity. Combined source fingerprint: `cc62c10edd292e033f01f297a2567e58f5868a50fc921c46ee5d116a6f39525e`.

The pretraining gates were completed: source/protocol review, audited outcome-blind timing, verified Git source/raw evidence and an explicit one-attempt training-only lock. The execution source remains pinned to code `b9134f6a6859032ae37fce8f266f848c483db467`; later documentation updates do not change it. Original lock SHA-256: `15547657adbdeaaf76153d2c3103ace74c9c0d74d7eef98398d5a83f2aba5ec2`.

After bounded conventional training, commit selected baseline parameters and trained mind snapshots before writing/finalizing held-out conditions. Earlier exposed unexecuted proposal drafts remain historical disclosures and are not presented here as locked or unseen test conditions. This checkpoint excludes those draft configurations.

Reproduction: `node --test` from repository root runs software checks only. Running `node benchmark/training/training-runner.mjs` without `--run` prints the plan and does not execute training. The draft PR stays open; no merge or deployment.

The earlier explicitly WIP snapshot is preserved at [data checkpoint b46606c](https://github.com/Wordweaver-EH/tether/tree/b46606c697459275f5fb652434cbfb93c6eb01b0/checkpoints/robustness-pretraining-wip-2026-10-03T0055Z), without rewriting history. A separately reviewed NEW development-fixture diagnostic is [also pinned there](https://github.com/Wordweaver-EH/tether/tree/b46606c697459275f5fb652434cbfb93c6eb01b0/checkpoints/current-mind-development-diagnostic-2026-10-03); it is not the missing historical 40-case test or a robustness held-out condition.

## Later six-level amendment and preserved completed evidence

The independently reviewed amendment now uses six finer useful-work levels, and training lock/protocol validation recognizes levels 0–5. The resource formula fixes all training-decision counts and binds actual worker count to the reviewed estimate; target selection uses the lowest level reaching the required mean wall-time ratio. Integrated param/interface dependencies remain unchanged. [Exact synthetic feasibility evidence](https://github.com/Wordweaver-EH/tether/tree/8a80afb2544eddbfa442f5b0040195dac20c6700/checkpoints/baseline-grid-feasibility-2026-10-03) preserves the one-pass pre-timing plan/source, every timing/work row and summaries. All levels completed; this does not establish 2×/4× ratios to the mind or feasibility of the full training workload. The subsequent reviewed calibration and training-only release are recorded below; these synthetic feasibility timings alone did not authorize them.

The [completed NEW development diagnostic](DEVELOPMENT-DIAGNOSTIC.md) establishes selective recruitment on reused geometry, with nulls and full denominators retained. It does not reproduce the unavailable historical 40-case assay.

## Running training and verified checkpoints

The sole attempt started 2026-10-03 at 01:35 UTC. Scope: 4,224 default-condition training bouts, up to eight workers, selected useful levels 4/5, monitored 24-CPU-hour and eight-wall-hour ceilings. It includes finite conventional searches and twelve separate mind-memory histories. No source tuning or held-out configurations are added during the attempt.

[Audited calibration](https://github.com/Wordweaver-EH/tether/tree/01a6ea6cc23c44233a37dad5a9ed07fe8d455c7a/checkpoints/calibration-results-2026-10-03) completed all40 controller/trial runs. Selected levels4/5 achieved mean decision-wall ratios3.2065×/5.2156× on that yoked synthetic workload. Overshoot, hardware scope and limited coverage are explicit; gameplay timing ratios and strength remain unestablished. Fixed planning allowances are20.994 CPU-hours and5.748 wall-hours, not measured full-training cost.

[Initial immutable batch checkpoint bc99a0b](https://github.com/Wordweaver-EH/tether/tree/bc99a0b14eb15dd8e983503d33dcaf6761688026/training/robustness-attempt-001) preserves1408 complete task-level raw rows: all1280 ordinary-conventional screening/selection tasks and128 useful-2x generation0 tasks. Every file and reconstructed archive hash was verified. [The live checkpoint index](https://github.com/Wordweaver-EH/tether/blob/data/tether-evidence-2026-10-02/training/robustness-attempt-001/CHECKPOINT-INDEX.json) lists later completed batches as they are added. Partial batches are never presented as complete. No full-training-success claim is implied by a checkpoint.
