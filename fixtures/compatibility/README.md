# Frozen compatibility fixtures

These test-only inputs make the C1/C2 checkpoint portable without network access,
Git history, `ORIGINAL_SOURCE`, or a neighboring checkout. They are outside the
runtime source-fingerprint scope. No historical study or production manifest is
changed by their addition.

## Identities and scope

- `original-v2/src/mind/workspace.mjs` is the exact original workspace, verified
  against `reports/provenance/source-manifest.json`. Original-v2 runtime
  fingerprint: `19800346ef69e63f1917ee67d02f4f083285101cb4342ed39d323d195b0bc9e5`.
  This is only one module, not an original-v2 controller/runtime snapshot.
- `rebuilt-s/src/mind/` is the complete 11-module controller import closure from
  commit `a514c0f7f95f6df1bb987bee315830261b5c6188`. Its files were extracted from
  that commit, not reconstructed from the current working tree. Simulation,
  perception, logging and the comparison opponent are current and common to
  both test arms; these comparisons test controller compatibility.
- `manifest.json` hashes every frozen module and the verbatim historical affect
  test. Its SHA-256 is pinned in `tools/compatibility-fixtures.mjs` as
  `a472381f7ae72defadbcf522a715badb91eb1c820e6f3a86fe390faa9d290597`.
  Missing or changed bytes fail before baseline import. Integrity tests also
  demonstrate rejection of modified source and a modified manifest.

## What the regressions establish

Run with the repository's Node runtime:

```sh
node --test test/affect.test.mjs test/legacy-compatibility.test.mjs
node --test
```

1. **Workspace-only affect parity.** A temporary copy of every current mind
   module replaces only `workspace.mjs` with the verified original-v2 bytes.
   Both arms use `noAffect:true` and the current N/S/C1/C2 controller, simulator,
   percepts, opponent, budget and seed. Each copied module is byte-checked. Four
   closed-loop pairs cover both modes and seats for five simulated seconds each.
   Score and replay records, including emitted inputs, are exactly equal after
   removing only the wall-clock metadata start timestamp. The existing
   changing-percept affect test now gets its legal stream from a separate
   current `noAffect` driver; full/noAffect arms receive identical cloned views.
2. **C1/C2-disabled rebuilt-S compatibility.** Current `coordinationEnabled:false`
   is compared with the independently frozen rebuilt-S controller. Sixteen
   five-second closed-loop pairs cover both modes and seats for default,
   `noAffect`, `noPrediction`, and 96-unit/frozen-learning configurations, using
   seeds 991 or 731 as fixed in the test. Replay records, score, events, full
   memory, cognition totals, settings and the legacy self-report match exactly.
   The sole replay normalization is the wall-clock start timestamp. Added C1/C2
   trace fields are not represented as whole-trace parity; separate assertions
   require coordination to be inactive, monitor forcing false, and coordination
   budget charges absent on every recorded cycle.

These are bounded structural regression checks, not an efficacy study,
tournament result, proof for all possible trajectories, or evidence that the
current full controller matches original v2. They do not reopen or relabel the
closed original-v2, affect, N, or S studies.

## Historical test preservation

The pre-C1/C2 `test/affect.test.mjs` is preserved byte-for-byte at
`docs/build-history/affect-test.pre-c1c2.mjs.txt`, outside Node test discovery.
SHA-256: `3286197484c6b4d1bd910c52bf27b1a428dec9dfcd19e96f4fa12a71a1f99789`.

Its first four appraisal unit checks remain unchanged in the active test. The
fifth test retains its assertion but uses the current controller as its legal
stream driver. The sixth is replaced by workspace-only parity. The old sixth
test compared whole repaired and original-v2 controllers with `noAffect`; that
was appropriate to the historical affect-only revision but is no longer a valid
invariant after N/S/C1/C2 changes. The new disabled-coordination comparison
instead checks the immediately preceding rebuilt-S contract. The historical
file is an archival artifact, not directly executable at its new location; its
relative imports retain their original spelling intentionally.

`tools/materialize-original-source.mjs` remains untouched for historical
reproduction. Current regression tests no longer invoke it or require its
missing pinned evidence Git objects. The previous published reproduction and
source-manifest records retain their historical meanings.
