# Reproduce and verify

Use Node **v24.19.0**, the evaluated runtime, and record any version change. No package installation or build step is required. Examples use a POSIX shell; the app and tests themselves are plain Node/JavaScript.

The repository root is the **affect-repaired revision**. The broad completed studies used **original v2** in `reference/v2-source/`. Never run a new root-version experiment and label it a reproduction of original-v2 results without acknowledging the source change.

## 1. Verify both source versions and run tests

```sh
node --input-type=module -e "import {sourceFingerprint} from './arena/audit.mjs'; import {readFileSync} from 'node:fs'; for(const [base,manifest] of [['.','repaired-source-manifest.json'],['reference/v2-source','source-manifest.json']]) { const actual=await sourceFingerprint(base); const expected=JSON.parse(readFileSync('reports/provenance/'+manifest,'utf8')); if(JSON.stringify(actual)!==JSON.stringify(expected)) throw new Error('source mismatch: '+base); console.log(base,actual.hash,Object.keys(actual.files).length+' files verified'); }"
node --test                            # 146 delivery tests
node --test test/*.test.mjs            # 139 implementation/runner tests
node --test delivery-tests/*.test.mjs  # 7 diagnostic-server tests
node tools/math-audit.mjs
```

Expected fingerprints:

- Root: `c3ead812bf8a53ab91d7f335fee94839352fe382669dc9f812d0a2f2f7fc55cd`
- Original reference: `19800346ef69e63f1917ee67d02f4f083285101cb4342ed39d323d195b0bc9e5`

Each covers 55 files, with scope in [PROVENANCE.md](PROVENANCE.md). The cross-build test defaults to the bundled original reference; an optional `ORIGINAL_SOURCE=/absolute/original/repository` override remains supported. No duplicate old tests are discovered in the reference tree.

To run the original 131-test suite on its original source, extract the immutable archive into a fresh directory:

```sh
snapshot=$(mktemp -d)
tar -xzf reports/provenance/final-source.tar.gz -C "$snapshot"
(cd "$snapshot/final-source" && node --test)
```

The archive contains a top-level `final-source/`. Sampled math-approximation bounds are not a proof of equality with all historical trajectories.

## 2. Play and verify a genuine browser log

```sh
node serve.mjs
```

Open `http://localhost:8765/` in a browser allowed to access this local server. Complete a bout, download its JSONL log, and inspect it in `http://localhost:8765/replay/`. Verify the exact downloaded file in Node:

```sh
node tools/verify-browser-replay.mjs /path/to/downloaded-session.jsonl
```

Keep browser/Node versions, the actual exported fixture, final hash, and sample count. Human enjoyment and live presentation require real playtesting; replay correctness alone does not establish them.

### Fixed browser-to-Node probe

The game server intentionally exposes only `client/`, `replay/` and `src/`, returning 403 for `tools/`. Use the separately tested diagnostic helper on a **permitted local setup**:

```sh
node tools/serve-replay-probe.mjs
```

1. Open `http://localhost:8766/tools/replay-probe.html`
2. Click **Generate browser log**; save `tether-browser-replay.jsonl` and the displayed browser/hash details
3. Run `node tools/verify-browser-replay.mjs /path/to/tether-browser-replay.jsonl`
4. Require 3,600 ticks, 601 verified samples, and exact final-hash agreement with the browser
5. Repeat on the target browser/runtime pairs and a full human-session log

The helper binds only to `127.0.0.1`, serves only the fixed probe and `src/` JavaScript imports, and uploads nothing. It has not been used to bypass the cloud browser block. No browser-produced fixture is included or claimed to have passed. Node/`--jitless` agreement is separate evidence.

Legacy logs lacking `simulation_math: ieee-arithmetic-v1` need their original build/runtime. Do not edit metadata or hashes to force apparent compatibility.

## 3. Reproduce original-v2 Phase 4

The convenient frozen driver runs from the reference root:

```sh
(cd reference/v2-source && node arena/phase4-final.mjs)
```

It writes a new `reports/` directory inside that reference, leaving delivered evidence under the top-level `reports/final/` untouched. It uses the fixed 12-generation ES/coevolution search, 45-second training, 12-seed/300-second selection-validation and 16-seed/300-second confirmation, with both modes/seats and one worker. Expect several CPU hours and about 118 MB of uncompressed confirmation data. Do not tune on confirmation results.

For the exact archived external driver layout:

```sh
run=$(mktemp -d)
mkdir "$run/final-reports"
tar -xzf reports/provenance/final-source.tar.gz -C "$run"
cp reports/provenance/run-phase4-final.mjs "$run/final-reports/"
(cd "$run/final-source" && node ../final-reports/run-phase4-final.mjs)
```

Runner SHA-256: `414fe7f5c15f91d58932ef4443285d0b5fa73cdd8bc6f714b441e6d7dead584d`. The in-tree driver has identical experiment controls with different output/import layout.

Inspect delivered data without rerunning agents:

```sh
gzip -t reports/final/phase4a-final-confirmation.json.gz
gzip -dc reports/final/phase4a-final-confirmation.json.gz > /tmp/tether-phase4-confirmation.json
sha256sum /tmp/tether-phase4-confirmation.json
```

Expected raw SHA-256: `ab07c68f8a1259b467d40d1c04d8202d8b68d0b9ff72a025a2546de27df200d0`.

## 4. Reproduce the original-v2 general audit

This schedules 39,168 full-length bouts, resetting memory each bout. The command uses the immutable original modules and changes only the original output destination. `--out` is resolved relative to that module's repository root, hence the `../../` prefix:

```sh
node reference/v2-source/arena/audit.mjs \
  --seeds 32 --workers 6 --durationSec 300 --budgets 48,192,512 \
  --opponents immediateRecaller,embedWaiter,camper,spinner,reactiveDodger,mind \
  --variants full,noBelief,noPrediction,singleUtility,noWorkspace,noHysteresis,noMetacog,noAttentionSchema,noToM,noReflex,noIntuition,noDeliberation,noLearning,noAutomatization,noAdaptation,noCounterfactual,noAffect \
  --modes MODE_A,MODE_B --seedStart 1 --label final --resume false \
  --out ../../reports/reproduction/phase5
```

Use a fresh output prefix. `.progress.json` and `.rows.jsonl` are recovery checkpoints; final JSON/Markdown/HTML appear after every job completes. For an interrupted original run, `--resume true` requires unchanged experimental controls, output prefix and source. [Exact original config](reports/methods/general-audit-config.json).

The committed transport parts reconstruct `phase5-final.json.gz`, containing every raw bout plus summaries. Run `node tools/reassemble-phase5.mjs` before accessing that gzip; the helper verifies the exact original SHA-256. The separate resumable row gzip was omitted as redundant. Its checksum remains in the preserved original experiment manifest; the delivery manifest describes files actually included.

## 5. Reproduce original-v2 learning and adaptation

```sh
node reference/v2-source/arena/learning-audit.mjs \
  --seeds 32 --adaptationSeeds 64 --episodes 12 --heldout 3 \
  --workers 1 --durationSec 300 --budgets 192 --modes MODE_B \
  --opponents direct,anchor --variants full,noMetacog,noAutomatization,noLearning \
  --seedStart 101 --adaptationSeedStart 700001 --label final --resume false \
  --out ../../reports/reproduction/learning
```

This schedules 1,152 jobs / 8,704 full-length bouts. Training memory carries across episodes; held-out bouts begin from training memory but do not feed updated memory to each other. The separate adaptation protocol crosses fixed/switching habits and full/noAdaptation. These are synthetic proxy families, not fitted human players. [Exact original config](reports/methods/learning-audit-config.json).

### Output-only recovery and chart rendering

The completed long run exceeded Node's single-string limit during pretty-printed JSON output. The external helper validates complete checkpoint identities and source, invokes the frozen statistics, and writes JSON incrementally. It also aligns curve-series order with the fixed legend colors without changing measurements. It still holds parsed rows in memory, so allow sufficient RAM:

```sh
node --max-old-space-size=4096 tools/stream-learning-report.mjs \
  --source reference/v2-source --input reports/reproduction/learning \
  --template reports/provisional/learning-freeze-smoke.json \
  --out reports/reproduction/learning-recovered
```

For the **prepared separate** raw rows, first obtain all four parts and reconstruct them using [RAW_DATA.md](RAW_DATA.md). Those parts are not in this repository, and attachment delivery has not been verified. In a fresh directory, put the reconstructed file at `learning-final.rows.jsonl` and copy `reports/provenance/learning-final.progress.json` there as `learning-final.progress.json`. Use that directory's `learning-final` prefix as `--input`; keep `--out` separate.

The identical-source smoke template supplies definitions/limitations; its smoke measurements are replaced by the validated checkpoint summaries, never pooled. The recovery record hashes source, script, template and raw rows. Do not rerun experiments merely to fix serialization, or present incomplete checkpoints as final.

## 6. Reproduce the repaired affect study

The root runner is byte-identical to the registered one. Its output files already exist in the delivered repository, and it intentionally refuses to overwrite them. Use a fresh temporary study tree containing the repaired runtime, registered tools and registration:

```sh
run=$(mktemp -d)
cp -R src arena client replay tools "$run/"
cp package.json serve.mjs "$run/"
mkdir "$run/reports"
cp reports/affect-repair-preregistration.md "$run/reports/"
node "$run/tools/affect-audit.mjs"
```

This runs 384 matched pairs / 768 full 300-second bouts with four workers, fresh seeds 200001–200032, both modes/seats, three predeclared opponents and logical budget 192. It hashes production source, runner and registration before/after and rejects incomplete/mismatched pairs.

**Known ancillary instrumentation failure:** the preserved runner's score-state recall counters listen for `RECALL/player` instead of `RECALL_START/owner`. Those zeros are invalid. Reproduction of this frozen runner preserves that known failure; do not interpret its recall strata. Any corrected recall-state assay must be a separately labeled instrumentation revision. Primary action/score/win/focus endpoints are unaffected and independently checked.

The broader 16-ablation/budget/learning/exploit studies have not been rerun on this repaired source. Running the original commands against root modules instead would be a new-version study, not a reproduction of old evidence.

## Reporting rules

Keep implemented code, behavior change, performance improvement, and consciousness distinct. Preserve harms/nulls and comparator-scope limitations. Common logical caps are not equal realized CPU cost. Post hoc/multiplicity-sensitive analyses stay labeled. Historical screenshots do not close current browser/human checks.
