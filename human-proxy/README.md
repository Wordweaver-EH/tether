# Human-paced counterplay v1

Implementation status: blocked pending final independent review, verified Git checkpoint, and root release. No counter-versus-ordinary bout has run during development. This is one hand-designed counter, not a searched best response or a human enjoyment test.

The approved protocol and frozen source manifest are `human-proxy/PROTOCOL-PROPOSAL.md` and `human-proxy/FROZEN-SOURCE-MANIFEST.json` relative to the repository root. These are exact copies of the approved inputs, retained inside this extension for reproducible publication. The unchanged initial partial files are preserved in `human-proxy/baseline-partial/`. Every existing `src/` and `benchmark/` byte must match that manifest. This directory is the only code extension.

## Preflight

From the copied repository root:

    node --test human-proxy/*.test.mjs benchmark/*.test.mjs
    node human-proxy/run.mjs --freeze

The first command exercises synthetic percept streams and scripted frozen-engine fixtures, never counter-versus-ordinary outcomes. The second expands the 32 seed clusters and hashes source/test files into `FREEZE.json`. Freeze status deliberately remains blocked: creating hashes is not independent review, a Git checkpoint, or release.

A pre-freeze synthetic fixture exposed one implementation defect: a lateral sign was used in two opposite coordinate frames, reversing a previously issued sidestep. The correction uses the previous issued world-space movement (then world-space lateral intent) for a centered spear tie, with geometric blocked-side override. Tests retain both orientations, both lateral directions, and top/bottom-wall fixtures. At 5.25 units these representative fixtures evade a single straight-on incoming spear; at 4 units the tested counter is hit. These tests establish no general dodge guarantee. A separate pre-freeze conformance check suppresses positive radial approach whenever the opponent body is currently hidden, while retaining bounded-memory aiming, retreat and lateral movement.

## Release and primary run

Only after the independent reviewer and root accept the exact freeze, the sole publisher must checkpoint the exact code and protocol, verify the actual Git tree/remote bytes, and provide the commit identity. The runner validates the stated checkpoint's format and source hashes; external publisher evidence verifies the actual Git commit and remote state. No automated string check establishes that publication itself happened.

The root release JSON must provide `rootRelease: true`, `independentReviewAccepted: true`, `reviewer`, the exact `freezeSha256`, and the verified 40-character `gitCheckpoint`.

    node human-proxy/run.mjs --run ROOT_RELEASE.json NEW_OUTPUT_DIRECTORY

No run or partial bout occurs without that gate. No outcome-dependent edits or replacement runs are allowed in v1. An existing output directory is refused, and files are created exclusively. A failed/incomplete run must be reviewed with its partial raw evidence preserved before any recovery; do not use a new output directory to silently rerun or replace outcomes.

The primary is exactly 32 paired seed clusters × both counter seats × 300 seconds. The original ordinary constructor and 150ms interface are unchanged; the proxy uses one 250ms queue with 30Hz decisions. Both import the same indexed noise function/motor transform. The seed table fixes separate role seeds and a shared episode ID within a cluster; noise addresses still include physical seat. The counter gets only canonical delayed MODE_B packets, not measurement truth.

`REPORT.json` includes the paired-cluster 20,000-resample percentile interval, provisional classification, manipulation checks, exact HIT/score reconciliation, and per-bout measurements. Raw JSON includes actual world events, both externally issued decision streams, and measurement lineage. `RAW-MANIFEST.json` hashes each bout's raw file. Result classification remains provisional pending independent source/result/manipulation review; absence or violation of intended behavior prevents a game-rule-defect claim.

No conditional opponent-set additions, rule-repair search, default rule changes, or mind changes are implemented here. Those are separate branches requiring the protocol's result condition and root release.
