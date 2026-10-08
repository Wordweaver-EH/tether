# Calibrated Cover checking pilot

Read [PILOT.md](PILOT.md) for the operational result and limitations, and [PROTOCOL.md](PROTOCOL.md) for the prospective held-out study. No held-out score has been run at this checkpoint.

Training and calibration are distinct from tactical/habit learning. Default Duel, Existing Cover and legacy Integrated remain behaviorally unchanged; the optional calibrated monitor is created only by the new experiment.

Commands (from repository root):

```sh
node --test test/*.test.mjs delivery-tests/*.test.mjs
node benchmark/cover-uncertainty-v2/run.mjs train /new/local/training
node benchmark/cover-uncertainty-v2/run.mjs pilot /new/local/pilot /new/local/training/model.json
node benchmark/cover-uncertainty-v2/audit.mjs /new/local/pilot /new/local/pilot-audit.json
node benchmark/cover-uncertainty-v2/run.mjs freeze /new/local/freeze
```

Copy the reviewed freeze’s source-manifest.json into this directory before publishing the source checkpoint. Freeze excludes its own manifest and PILOT reports, but includes controller/runner/audit code, frozen model, protocol and exact changed-legacy-source hashes.

Only after independent review, publication verification and explicit parent release:

```sh
node benchmark/cover-uncertainty-v2/run.mjs score /new/local/scored-evidence benchmark/cover-uncertainty-v2/training-model.json PUBLISHED_40_HEX_CHECKPOINT
node benchmark/cover-uncertainty-v2/audit.mjs /new/local/scored-evidence /new/local/scored-audit.json
```

Score mode rejects missing/invalid checkpoint, modified frozen source, a different model or an existing output directory. A syntactically valid commit is not proof of publication or permission; verification and authorization remain external requirements.

The initial failed pilot’s historical telemetry contained an unused actualAimChanges=0 placeholder and a null circuit-completion alias. Do not interpret those fields. The revised independent audit derives command differences and circuit identity from retained raw decisions/events. Raw files are preserved unchanged. Model-v3 training and operational pilot use the corrected waypoint policy. Subsequent edits add tests, auditing, runtime telemetry, documentation, score admission and a test-only export without changing that policy or learned model.
