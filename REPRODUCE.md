# Reproduce and verify

Use Node v24.19.0, the evaluated runtime. No package installation or build is required.

## Current code and regression tests

```sh
git fetch origin data/tether-evidence-2026-10-02
node --test
node tools/math-audit.mjs
node serve.mjs
```

The cross-build affect regression automatically materializes the original runtime into a temporary directory from pinned evidence commit `c3b8814bb92e4086d273e2c525b722de4144a17a`. It checks all 55 runtime-file SHA-256 hashes before use and removes the temporary copy afterward. No duplicate runtime is tracked in this branch. Git and that commit's objects must be available; shallow clones should run the fetch above. Missing evidence is a hard error, never a silent skip or comparison against the current controller.

Alternatively, set `ORIGINAL_SOURCE=/absolute/path/to/tether-evidence/reference/v2-source` to use a separately checked-out frozen runtime. This override preserves the existing explicit comparison-source mechanism.

Current production fingerprint: `c3ead812bf8a53ab91d7f335fee94839352fe382669dc9f812d0a2f2f7fc55cd`. Original-v2 fingerprint: `19800346ef69e63f1917ee67d02f4f083285101cb4342ed39d323d195b0bc9e5`. Small source manifests remain in `reports/provenance/`. Production code and scientific measurements are unchanged by this cleanup.

## Historical experiments and raw evidence

Follow [RAW_DATA.md](RAW_DATA.md) to create a pinned evidence worktree. Run the full reproduction guide in that worktree: it retains every original path, runner, registered protocol, source snapshot and available raw-data artifact. This includes exact original-v2 Phase 4, general-audit and learning commands; affect-study reproduction; and output-only report recovery. Do not relabel those broad original-v2 results as repaired-version evaluations. The separately prepared learning raw parts remain an explicitly undelivered artifact.

## Browser replay

```sh
node tools/serve-replay-probe.mjs
# Open http://127.0.0.1:8766/tools/replay-probe.html and download its replay fixture
node tools/verify-browser-replay.mjs /path/to/tether-browser-replay.jsonl
```

A user-supplied fixture reported as Edge 154 was independently replayed with Node v24.19.0: 3,600 ticks, 601 samples, final hash `9b729b88b12f9d19`. Browser identity is user-reported. This verifies that fixture; live play, input, audio, storage persistence and human engagement remain unverified. Legacy logs without `simulation_math: ieee-arithmetic-v1` need their original source/runtime.
