# Checking action value v1

Read PROTOCOL.md and PILOT.md before interpreting anything. This is a restricted-processing experiment, not ordinary Tether or a claim of learned tactical habits. The negative development pilot is preserved.

Implementation:
- src/mind/checking-value.mjs: reusable frozen per-action ridge values; zero and shuffled controls.
- src/agents/cover-checking-value.mjs: paid refresh / actual bounded planner / cached routine, with real motor embargo.
- experiment.mjs: fixed splits and individually count-matched action schedules.
- opponents.mjs: legal-percept-only training/development/evaluation families.
- run.mjs: deterministic training/pilot, artifact freeze, explicitly released score runner.
- audit.mjs: complete input/event/world replay and legal endpoint/cost checks.

From repository root, all commands require a new output directory and preserve existing evidence:

    node --test test/*.test.mjs delivery-tests/*.test.mjs
    node benchmark/cover-checking-value-v1/run.mjs train NEW_TRAIN_DIR
    node benchmark/cover-checking-value-v1/run.mjs pilot NEW_PILOT_DIR TRAIN_DIR/training-bundle.json
    node benchmark/cover-checking-value-v1/audit.mjs TRAIN_DIR
    node benchmark/cover-checking-value-v1/audit.mjs PILOT_DIR
    node benchmark/cover-checking-value-v1/run.mjs freeze NEW_FREEZE_DIR TRAIN_DIR/training-bundle.json

Only after independent review AND a verified explicit parent release:

    node benchmark/cover-checking-value-v1/run.mjs score NEW_SCORE_DIR TRAIN_DIR/training-bundle.json FREEZE_DIR/source-manifest.json --parent-release=VERIFIED_REFERENCE

The reference records authorization; inventing one does not authorize a run. Scoring asserts byte-exact source and full training-bundle hashes. No heldout scoring has been run at this checkpoint. Do not call the development pilot heldout results.

Frozen models are provided as training-model.json and shuffled-model.json. source-manifest.json records prospective scoring source and the SHA256 of the archived LOCAL full training bundle. Raw training rows and full replay logs are retained locally and excluded from the compact publication package. They are not claimed to be available online.

To reproduce scientific fitting, run the public training script with the declared seeds, features and costs and compare the resulting model coefficients to the two published model files. A regenerated full bundle contains new runtime measurements, so its byte hash is expected to differ even when fitting rows and coefficients reproduce. Create a new local freeze for that regenerated bundle before an independently authorized replication; do not mislabel it the archived run. Exact archived scoring uses the locally retained original bundle matching the published hash.

No remote write, upload, PR modification, merge or deployment is part of this implementation. Raw rows/logs require separate explicit publication approval.
