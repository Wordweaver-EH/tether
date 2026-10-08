# Pinned analyzer package and synthetic checks

The slim code PR includes the exact reviewed evaluation runner/finalization guard and preserves the reviewed search code. The prospective analyzer, its frozen fixtures and the full 2.8 MB task grid remain in the [immutable evaluation data checkpoint](https://github.com/Wordweaver-EH/tether/tree/291026df7effde2b24c8d36a1273b65295a41245/checkpoints/robustness-evaluation-preflight-2026-10-03). They are deliberately not duplicated in this source tree.

That checkpoint binds all 150 inputs and 94 source files, including the complete analyzer package (31 manifest-listed files plus its manifest). Independent evaluation review SHA-256: `13b7a8df609136a267b512e17804e7dc296ccd3bafdd2fc2c2d62014c5044818`. Evaluation lock SHA-256: `fbf3a3d825e71fea60dec040c67899bf3ff2da78b1ff334a5cbe38f5b1771033`. These source checks do not establish evaluation outcomes.

## Materialize outside the source checkout

Requirements: Node.js (tested with v24.19.0), `curl`, `tar`, and a POSIX shell. From the slim repository root, the following commands download the exact published archive part, verify its pinned bytes before extraction, and materialize a separate temporary package. No adjacent historical checkout, absolute development-workspace path or live evaluation directory is needed.

```sh
set -eu
work="$(mktemp -d)"
printf 'Materialization directory: %s\n' "$work"
archive="$work/evaluation-source-protocol-style.tar.gz"
curl --fail --location \
  'https://raw.githubusercontent.com/Wordweaver-EH/tether/291026df7effde2b24c8d36a1273b65295a41245/checkpoints/robustness-evaluation-preflight-2026-10-03/evaluation-source-protocol-style.tar.gz.part01' \
  --output "$archive"
node --input-type=module - "$archive" <<'JS'
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const bytes = readFileSync(process.argv[2]);
const hash = createHash('sha256').update(bytes).digest('hex');
if (bytes.length !== 229058 || hash !== 'b6e5bf53d6ab95a5d6eec14f7a882bfe896fe8e42a263d080755f4edd789c6dd') {
  throw new Error('Pinned evaluation archive hash/size mismatch; do not extract or use it');
}
console.log('Pinned archive verified');
JS
tar -xzf "$archive" -C "$work"
analyzer="$work/repo/experimental/analysis"
node tools/verify-analysis-package.mjs "$analyzer"
node --test "$analyzer"/*.test.mjs
```

The published archive currently consists of exactly one part. The checkpoint also supplies `transport.json`, `reassemble.mjs` and `LOCK-INPUT-REFERENCES.json` for inspecting its complete transport and provenance. The archive is the full reviewed source/protocol/style package; the analyzer's member prefix is `repo/experimental/analysis/`.

The read-only verifier pins `SOURCE-MANIFEST.json` to SHA-256 `7d0cb0abe594be0f9ed267b02d4ae41951eaa128c5bb760cd6057f4f0b3f2632`, then checks the byte size and SHA-256 of every listed member. Missing fixtures, changed files, a substituted manifest, unsafe paths or member symlinks fail clearly. It imports no analyzer or controller and reads no study outcomes. Its success verifies the 32 required package files, not arbitrary additional files in the supplied directory.

The exact analyzer's 23 synthetic tests exercise frozen inputs and invented records only. The slim repository's separate `node --test` run needs no downloaded analyzer package and does not silently skip those external-package checks. Run both commands when checking both distributions. Keep materialized data outside this source checkout, and preserve the printed temporary directory if you need to inspect it later.

## Execution and interpretation limits

Materialization, verification and synthetic tests do not authorize a simulation, search, evaluation, retry or analysis of live outcomes. The historical package README and manifests retain their original preparation-stage labels; subsequent independent review and publication are recorded in the pinned checkpoint, without rewriting those frozen bytes. Actual outcome analysis requires its separately authorized gate and the untouched complete runtime artifacts specified by the package README.

The qualified actual-output baseline freeze remains subject to its floating-tie/completion-order caveat: the realized final ranking is unchanged, but a counterfactual tie-corrected optimizer trajectory and seed-only exact optimizer reproduction are not certified. Individual report/comparison proof digests cannot all be reconstructed from the retained task commitments. This is an explicit reduction in proof inspectability, not lossless preservation of every proof byte. No robustness, equal-compute or causal-explanation conclusion follows from source/package checks.
