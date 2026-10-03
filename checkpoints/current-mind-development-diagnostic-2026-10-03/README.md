> Completed-result update: the sole 16-case attempt and independent saved-row audit are now preserved here. See RESULTS.md and RESULTS-MANIFEST.json. Exact gzip bytes decompress to the manifested raw files. The pre-run description below records the earlier checkpoint, not a second run. No historical 40-case or comparative-speed criterion was demonstrated.

# NEW development-fixture diagnostic: reviewed pre-run checkpoint

No outcomes or execution release exist in this checkpoint. Independent preflight review passed the exact manifest `6b0515b94a293ed12bcb81babf2a0fd5956e45c3b6afbb5dc9d85d4eef250ea4`; six synthetic/preflight checks passed. All 36 manifested files are bound, including 25 original controller source files and package.json. The eleven diagnostic files here retain their exact reviewed bytes.

This is a NEW 8×2 single-arm current-C1/C2 diagnostic on existing development fixtures and previously acquired common memory. It does not reproduce the unavailable historical 40-use/12-miss corpus, certify that criterion, or belong to robustness held-out testing. Its protocol, sparse groups, first-decision timing limitations and fixed stop boundaries are explicit in PROTOCOL.md. No tuning or new training occurs.

Source bytes are not duplicated here. SOURCE-PIN.json binds published code commit `0a810b6c1edd291417a9c9f3d42984264445110e`, with all-src fingerprint `d490afd30119c0d6bfe03373055aeb21a797c6138f1ee744961988238b8948e7`. Materialize that commit's src/ and package.json under this directory's source/ before verification. In a clone containing the code commit, create source/ then use `git archive 0a810b6c1edd291417a9c9f3d42984264445110e src package.json | tar -x -C source`. These bytes were checked against every source entry in manifest.json. Later benchmark hook revisions are different and must not replace this pin.

The runtime gate additionally requires an explicit reviewed release with this exact manifest and verified Git checkpoint. This archive itself does not grant that release. Initial harmless preflight assertion failure is retained transparently; no controller outcome occurred. Tagged nonfinite serialization preserves diagnostic values losslessly. Any future completed batch must be separately saved with checksums.

Prepared by dot, the OpenAI assistant. No merge or deployment.
