# Robustness benchmark checkpoint: reviewed interface and training-only plan

This is a pretraining safety save, not an execution release or finalized held-out preregistration. No scored training, target-ratio calibration, comparative gameplay outcome, shifted-condition test or final robustness result is included. A separate completed synthetic feasibility pass and a NEW development-fixture diagnostic are linked below.

## Reviewed and tested

The original-grid shared I/O interface and conventional useful-work baseline passed independent source/package review for exact aggregate `d8d29e608d6a315ede6f9186b229bc89254c71aa36a86ec548e5f673952ad6ee` (57 pinned files). See [interface-source-manifest.json](interface-source-manifest.json) and [README](README.md). This historical interface manifest pins the original-grid review. The six-level planner amendment is separately identified by the current combined source manifest; do not expect the historical planner hash to identify amended bytes.

The interface applies one 150 ms sensor delay, 30 Hz decisions, common counter-addressed motor noise and one-frame buttons on 120 Hz simulation packets. Benchmark-only hooks support common embodiment, actual-command memory commit and specified control removals. Normal game configuration remains unchanged; exact default action/state and cognitive-RNG parity are tested against pinned published C1/C2 source. Baseline MPC uses fixed nominal model rules and useful candidate rollouts; this does not establish equal compute, strength or robustness.

Fresh integrated suite: **294/294 tests passed, zero skips**, consisting of the prior 264 checks, 21 interface/baseline synthetic checks and nine pure/synthetic training plan, lock and runtime-control checks. Source-hook changes have their own [all-src manifest](../reports/provenance/robustness-hook-source-manifest.json); older performance belongs only to its historical source versions.

## Reviewed training-only material

[training/TRAINING-PROTOCOL.md](training/TRAINING-PROTOCOL.md), initial vectors, training seeds and pure candidate generator passed independent review. The proposed finite search covers current/default conditions only. Training runner/worker and hard resource/lock controls passed independent review and nine synthetic checks. The [reviewed file index](training/REVIEWED-FILES.json) and [combined source manifest](training/RELEASE-SOURCE-MANIFEST.json) identify this exact code. These checks do not authorize a run or establish gameplay validity. Combined source fingerprint: `cc62c10edd292e033f01f297a2567e58f5868a50fc921c46ee5d116a6f39525e`.

Before scored training: use outcome-blind infrastructure timing, resolve any disclosed resource-budget issue, freeze exact source/configuration/calibration hashes, and verify the resulting Git checkpoint. No training lock or release exists here.

After bounded conventional training, commit selected baseline parameters and trained mind snapshots before writing/finalizing held-out conditions. Earlier exposed unexecuted proposal drafts remain historical disclosures and are not presented here as locked or unseen test conditions. This checkpoint excludes those draft configurations.

Reproduction: `node --test` from repository root runs software checks only. Running `node benchmark/training/training-runner.mjs` without `--run` prints the plan and does not execute training. The draft PR stays open; no merge or deployment.

The earlier explicitly WIP snapshot is preserved at [data checkpoint b46606c](https://github.com/Wordweaver-EH/tether/tree/b46606c697459275f5fb652434cbfb93c6eb01b0/checkpoints/robustness-pretraining-wip-2026-10-03T0055Z), without rewriting history. A separately reviewed NEW development-fixture diagnostic is [also pinned there](https://github.com/Wordweaver-EH/tether/tree/b46606c697459275f5fb652434cbfb93c6eb01b0/checkpoints/current-mind-development-diagnostic-2026-10-03); it is not the missing historical 40-case test or a robustness held-out condition.

## Later six-level amendment and preserved completed evidence

The independently reviewed amendment now uses six finer useful-work levels, and training lock/protocol validation recognizes levels 0–5. The resource formula fixes all training-decision counts and binds actual worker count to the reviewed estimate; target selection uses the lowest level reaching the required mean wall-time ratio. Integrated param/interface dependencies remain unchanged. [Exact synthetic feasibility evidence](https://github.com/Wordweaver-EH/tether/tree/8a80afb2544eddbfa442f5b0040195dac20c6700/checkpoints/baseline-grid-feasibility-2026-10-03) preserves the one-pass pre-timing plan/source, every timing/work row and summaries. All levels completed; this does not establish 2×/4× ratios to the mind or feasibility of the full training workload. Training timing/resource approval remains separate.

The [completed NEW development diagnostic](DEVELOPMENT-DIAGNOSTIC.md) establishes selective recruitment on reused geometry, with nulls and full denominators retained. It does not reproduce the unavailable historical 40-case assay.
