# Bounded Cover uncertainty experiment

Read PROTOCOL.md before running. No dependencies beyond Node 24; CPU only. This isolates delivery of the existing prediction-error monitor into the optional Integrated Cover controller after a narrow Objective-content/attention wiring repair. Default Duel and Existing Cover are not modified. It does not claim new learning, C1 gameplay benefit, human engagement, or consciousness.

Source base: 9361222ce9daaecab51ce3e09efc604d3b142db0. The exact scored checkpoint is recorded in the evidence's source-before-run.json and final report. Original Integrated behavior can be selected for diagnostics with coverControl: { targetMonitoring: false } in createMind, or controls: { targetMonitoring: false } in createIntegratedCoverMind. That compatibility control is not a scored arm.

1. Run node --test test/*.test.mjs delivery-tests/*.test.mjs and node tools/math-audit.mjs
2. Run node benchmark/cover-uncertainty-v1/run.mjs freeze /new/freeze-directory, then copy its source-manifest.json into this directory
3. Run node benchmark/cover-uncertainty-v1/run.mjs pilot /new/pilot-directory and node benchmark/cover-uncertainty-v1/audit.mjs /new/pilot-directory
4. Publish/review the small source/protocol checkpoint and independently verify its exact remote commit before any scored outcomes
5. Run node benchmark/cover-uncertainty-v1/run.mjs score /new/local-evidence-directory VERIFIED_CHECKPOINT_SHA
6. Run node benchmark/cover-uncertainty-v1/audit.mjs /new/local-evidence-directory

Each run refuses to overwrite its output directory. Source manifests exclude result files and themselves. Complete compressed logs stay local; no raw-data publication is part of this milestone. A supplied commit string does not independently verify remote publication.

The fixed comparator supplies same-path checking/replanning requests once per second of decision opportunities. It is benchmark-only, requires disabled contingent monitor delivery, skips reflex/budget-inactive pulses, and respects the ordinary 192-unit cap and Cover cooldown. Actual work is deliberately measured rather than assumed equal. Opponent diagnostics are evaluator-only and never enter the subject's percept.
