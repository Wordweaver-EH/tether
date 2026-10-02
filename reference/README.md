# Immutable original-v2 runtime reference

`v2-source/` contains the 55 original fingerprinted runtime files and original `package.json`, copied byte-for-byte from the frozen v2 snapshot. There is deliberately no test directory, so the delivery test runner does not discover a second suite.

Fingerprint: `19800346ef69e63f1917ee67d02f4f083285101cb4342ed39d323d195b0bc9e5`. The full original archive, including its 131-test suite and original documentation/tools, remains at `reports/provenance/final-source.tar.gz` in the repository root.

Use this reference for original-v2 experiment reproduction and the repair's cross-build `noAffect` equivalence test. The playable delivery at the repository root is the later, separately evaluated affect-repaired revision. Do not edit this reference or relabel original results as repaired-version evidence.
