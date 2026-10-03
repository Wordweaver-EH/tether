> Search source update: the independently reviewed fixed opponent-search harness is integrated with 334 passing tests and an exact pre-run Git lock. Search execution and winner acceptance have separate gates; see benchmark/STATUS.md.

> Final representation update: reviewed isolated code passes 323 integrated tests. The prospective v2 runtime/proof-inspectability amendment is saved with exact pilot-only lock; pilot003 completed all 192 tasks and passed independent integrity audit, with conditional engineering feasibility under the prospective caps. Full-study/search execution remains separately gated. See benchmark/STATUS.md for the explicit technical-proof limitation and preserved earlier attempts.

> Compact pilot update: the reviewed isolated replacement source is included with 319 passing integrated tests. Pilot 001 remains failed/incomplete and fully archived; pilot002 completed all 192 tasks and passed independent integrity audit. Full-study feasibility is blocked under the original raw/CPU caps. See benchmark/STATUS.md for immutable evidence and exact lock identities.

> Pilot harness update: the reviewed isolated experimental runner is included, with 312 passing integrated tests and a verified [pilot-only source/preregistration checkpoint](https://github.com/Wordweaver-EH/tether/tree/1ef4165377f7c7300db30714363f0789c9a0d58b/checkpoints/robustness-pilot-preflight-2026-10-03). No pilot or final-study outcome is asserted here; see benchmark/STATUS.md for exact scope.

> Pretraining update (2026-10-03): reviewed benchmark-only I/O hooks and conventional baseline plus reviewed training-only code are now saved. [Benchmark status](benchmark/STATUS.md) distinguishes the 294 passing software tests from the completed training-only attempt and its qualified actual-output freeze; pilot/held-out execution remains gated. Default game action/state parity is tested; the source bytes now have a separate [hook manifest](reports/provenance/robustness-hook-source-manifest.json). The earlier C1/C2 checkpoint description below remains version-specific.

# Current experimental checkpoint: rebuilt N/S plus C1/C2

The default controller now includes the reviewed novelty/completion rebuild and bounded C1/C2 content sharing and prediction-error monitoring. It is an **experimental functional checkpoint**, not a completed cognitive milestone or demonstrated competitive improvement. Historical original-v2 and affect-repair performance must not be attributed to this revision.

## Exact current scope

- Source fingerprint (all `src/` files): `d490afd30119c0d6bfe03373055aeb21a797c6138f1ee744961988238b8948e7`; [per-file manifest](reports/provenance/c1c2-source-manifest.json)
- Fresh integrated-tree verification: **264/264 tests passing, zero skips**; focused C1/C2 set **75/75**; Node v24.19.0
- Prior remote tree `bc27ec38b2c7ad8709816943422d4634483ae197` matched all 151 baseline blobs before applying reviewed changes. Existing remote ancestry is preserved, without force push
- Rule/simulation constants and client assets remain unchanged. Actual browser play/input/audio/storage acceptance remains unverified
- [Mechanism implementation and limits](C1C2-STATUS.md), [N/S implementation](reports/implementation/rebuilt-novelty-completion.md), [N/S measured results](reports/implementation/rebuilt-ns-results.md)

## Completed evidence, with nulls preserved

1. **Rebuilt N versus S:** all 256 primary paired action objects identical; both 125 attempts / 81 hits. Median paired first-decision time ratio S/N 1.1134 (about 11.3% slower). Separate eight-pair fixed-learning continuations: 13 attacks / four hits per arm, two proposals withheld by S, no pending recall plan. No demonstrated gameplay gain; these source versions predate C1/C2
2. **[Ordinary-experience C2 panel](reports/c1c2/ordinary-experience-results.md):** feedback/control cuts changed gaze in all six held-out cases; acquired versus pristine reliability changed gaze in 4/6. Forecast-error series did not improve. Opponent always visible at delayed decisions, so zero episodic retrieval opportunities. Fixed sensory replays do not establish alternative closed-loop outcomes
3. **[C1 visibility-gap probe](reports/c1c2/visibility-gap-results.md):** ordinary writes and reads caused movement/gaze differences in all 24 hidden decision slots per seed. Attention cut affected gaze only in gap 1; planner cut was null. Two seeds shared one legal, externally generated sensor tape; this is narrow input-conditioned evidence

Both completed C1/C2 result archives are preserved losslessly at [data commit d8b8887](https://github.com/Wordweaver-EH/tether/tree/d8b8887bdf6218d64759f2e150a505fae92196ee/checkpoints/c1c2-evidence-2026-10-03). Each retains its frozen runner/protocol, raw arms, manifests and scientific reviews. The checksum reassembler verifies all parts and reconstructed archives. Source backup remains at [data commit 06c0a81](https://github.com/Wordweaver-EH/tether/tree/06c0a813c1990ee313e702c9a00d64a3ca9205b0/checkpoints/c1c2-2026-10-02).

The completed rebuilt N/S comparison has its [final frozen sources, protocol, failed startup and full successful raw run](https://github.com/Wordweaver-EH/tether/tree/36c039924dc76c69f924e56ee411d264ad34fdce/checkpoints/rebuilt-ns-evidence-2026-10-03) publicly preserved separately at data commit `36c0399`. All 643 archive member hashes and original ZIP checksums were verified. The final audited N/S summary is included without relabeling those older sources as the current C1/C2 controller.

## Reproduce current software checks

Using Node v24.19.0 from the repository root:

```
node --test
node --test test/coordination.test.mjs test/prediction-monitor.test.mjs test/content-broadcast.test.mjs test/target-memory.test.mjs test/freeze-learning.test.mjs
node tools/math-audit.mjs
sha256sum -c FILE_SHA256SUMS.txt
```

Minimal hash-pinned compatibility fixtures are necessary test inputs, not a duplicate source archive. Current regression tests work without `.git` or adjacent historical checkouts. The old whole-controller affect parity assertion is preserved outside test discovery, with its narrower replacement documented in [fixture scope](fixtures/compatibility/README.md). Historical reports/tools retain their historical source and reproduction prerequisites.

## Remaining limits

The native witness where an organically created pending recall plan is invalidated remains unverified. Full autonomous closed-loop C1/C2 efficacy, broad transfer, tournaments, live browser acceptance and subjective consciousness are not demonstrated. Unfinished natural closed-loop runner/results are excluded. Nominal work accounting is not certified hardware-compute equality; reliability EWMA is not calibrated confidence.

[Previous status](reports/provenance/pre-c1c2-status.md) and all older study reports remain historical evidence. The PR stays draft. No merge or deployment.

Prepared by dot, the OpenAI assistant.
