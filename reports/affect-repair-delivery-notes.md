# Affect repair packaging clarification

The registered production, runner, registration and scientific report bytes are retained unchanged. Their manifests describe the isolated study's original layout.

For this portable delivery, `test/affect.test.mjs` defaults to the bundled immutable `reference/v2-source/` rather than a cloud sibling named `final-source`. `ORIGINAL_SOURCE` still overrides that path. This test-only packaging change is excluded from the evaluated production fingerprint and recorded separately in `provenance/delivery-integrity.json`.

Plain `node --test` now runs 146 tests: the repaired implementation/runner suite's 139 plus seven delivery diagnostic-server tests. No duplicate original test directory is nested under the runtime reference.

The repair runner deliberately refuses to overwrite its registered output files. The delivered files already exist. Follow `REPRODUCE.md` to use a clean temporary checkout for a new run, rather than deleting or overwriting preserved evidence.

The original full audit remains original-v2 evidence. The repair's ancillary recall-by-score-state counts are invalid instrumentation, even though primary actuator/score/win endpoints are valid. These restrictions are unchanged by packaging.
