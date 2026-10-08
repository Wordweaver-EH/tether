# Awareness comparison: source publication and staging

This guide is outside the sealed experimental package. It changes no experiment
source and grants no additional match or data-publication authorization.

## Git mapping, without a duplicate repository tree

Publish the sealed package at:

`benchmark/human-proxy-2026-10-03/awareness-comparison-v1/`

Every entry `repo/<path>` in its FREEZE.json dependencies maps to existing Git
root `<path>`. All 52 such source blobs were checked against the recursive tree
of commit `11d2eea69204c50ade532fcc9a9019b9bd6e8050`: **52 exact matches, zero missing**.
The source dependencies comprise 27 src files, four benchmark files and 21
human-proxy source/validation files. They need not be duplicated in Git.
The additional synthetic fixture is already published at
`benchmark/human-proxy-2026-10-03/sensor-awareness-v1/fixtures.mjs`.

The frozen code uses its historical study layout. A clean staging directory must
contain the package at `awareness-comparison-v1/` and only the named dependencies
under `repo/`. Do not symlink the entire public Git root as `repo`: its benchmark
folder contains other studies, whereas the freeze verifies an exact inventory.
The small local staging copy is not another checked-in repository tree.

## Source-only reproduction from a clone

Use Node v24.19.0 and Python 3. From a checkout containing the published package:

```sh
python3 benchmark/human-proxy-2026-10-03/awareness-comparison-publication-v1/materialize-source.py "$PWD" /tmp/tether-awareness-source-check
cd /tmp/tether-awareness-source-check
node --test awareness-comparison-v1/controller.test.mjs awareness-comparison-v1/statistics.test.mjs
```

The script validates every staged experimental/source byte against FREEZE.json
before writing, refuses an existing destination, and runs no matches. These
commands reproduce 18 synthetic controller/statistics tests using Git source
alone. Do not overwrite the sealed package or rewrite imports to make paths fit.
The full 28 comparison checks additionally include historical-integrity checks.

## Raw-data boundary and full-run reproduction

The original runner deliberately checks preservation of historical evidence,
beyond the source needed to execute the new policy. The complete historical
integrity gate requires:

- The original 64 raw files named by `primary-v1/RAW-MANIFEST.json`
- The 91 exact prior files named by this package's `PRIOR-FILES.json`, including
  previous prototype/posthoc/reviewer provenance and result artifacts
- Every package/dependency hash plus a separate reviewed root release, verified
  Git checkpoint and bound output directory

Some historical raw/provenance artifacts were still awaiting data-publication
approval at this source checkpoint. Therefore a source-only clone does not claim
to reproduce the historical integrity gate or authorize a fresh main comparison.
A missing historical file is a fail-closed evidence requirement, not permission
to omit or replace a check. When the separately authorized data checkpoint is
available, materialize those files at their exact study-relative paths and verify
the declared hashes. New comparison raw files likewise belong in the separate
data queue, not this source-only Git publication.

The sole main comparison is 128 fixed bouts. See the sealed PREDECLARATION.md,
RECOVERY-POLICY.md and README.md for release, disk, interruption and interpretation
rules. Recovery requires separate root approval, a unique resumeId, exact original
source/Git/output binding, retained attempts and confirmation the prior runner is
stopped. Publishing this guide does not relax any of those gates.
