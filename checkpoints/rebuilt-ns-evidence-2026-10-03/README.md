# Rebuilt N/S source and completed measurement evidence

Published 2026-10-03. This archive set concerns the completed **new rebuilt N/S comparison**, not the lost historical candidate and not the later C1/C2 controller. All original archive bytes and member checksums are preserved.

## Result

See [FINAL-RESULTS.md](FINAL-RESULTS.md), the exact final independently audited report. All 256 primary paired emitted inputs were identical; both arms made 125 physical attempts with 81 hits. S's median paired first-decision time ratio to N was 1.1134 (about 11.3% slower). The separate eight-pair fixed-learning continuation appendix had 13 attacks/four hits per arm; S actually suppressed two proposed commands. No gameplay gain was demonstrated.

Common training was 16 fixed episodes under N, starting from null memory. The results support narrow ordinary acquisition and one familiar executed route, not superior acquisition under S or general transfer. Timing, policy, geometry and statistical limits remain in the report. These results must not be attributed to C1/C2.

## Reconstruct and verify

Run `node reassemble.mjs` in this directory. It checks each part and whole archive's byte count and SHA-256 before writing three ZIP files. Each ZIP also has its original member-hash manifest (`PUBLIC-CONTENTS.json` or `CONTENTS.json`). All 643 manifested members were independently verified during this publication, as were the final report's exact bytes. Each transport part is at most 8,000,000 bytes.

- `tether-rebuilt-policy-source-protocol-v2-2026-10-02.zip`: exact final released sources, protocol, runner, manifests and software checks. Released manifest SHA-256: `3d3029e2ec1f4bf03b44d65ed50f8b296677e9e46126260e969b2060b95ae596`
- `tether-rebuilt-policy-failed-startup-2026-10-02.zip`: separately retained first startup's exact-settings validation failure before any controller act/outcome exposure. This is not a failed behavioral trial
- `tether-rebuilt-policy-measurement-results-2026-10-02.zip`: complete successful replacement, including 16 training episodes, 32 warmup pairs, 256 primary pairs and eight continuation pairs. The immutable ZIP contains the then-preliminary report; the separately preserved FINAL-RESULTS.md is the audited interpretation

Extract source/protocol and successful results into the same scratch directory if inspecting them together; keep the failed startup in a separate directory. Frozen manifests retain original execution roots as provenance. The final runner lives in `measurement/` inside the source package, while successful raw outcomes retain their original `measurement-v2/attempt/` prefix. Consult the exact saved protocol/manifest before any new execution; a rerun would be new evidence, not reproduction of these timing samples. Archive status and publication statements describe their creation time.

## Source identities

- N local source commit: `7c4ab294c5dcc8496c3ba6ecd06efd1d059f9b3f`; source fingerprint `404562ae94656607dc9e31761b8fba7cb215c7d40320038befdfb3424f4ddc13`
- S local source commit: `a514c0f7f95f6df1bb987bee315830261b5c6188`; source fingerprint `fb1ac97f638637e91467b9eef699d1c50933e7b81adee9aee4bd88422de3d223`

Local source commit identifiers label the preserved snapshots; they do not imply those divergent local commits were pushed. Sources are included in the verified ZIP. Existing GitHub branch ancestry is preserved. No lost-workspace raw data, unfinished natural-loop work, private reviewer notes or tool transcripts are added here.

Prepared by dot, the OpenAI assistant. No merge or deployment.
