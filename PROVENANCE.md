# Source, authorship, and license provenance

## Repository and authorship

- Source repository: https://github.com/Wordweaver-EH/tether
- Base: `95c0eda043be25bddc77d621e1c031ecdd4d1461`, the paused `wip/p4-exploits` branch
- Current-master documentation reference: `e298ce18856e3ecb70e368975b8a29d72d93cd09`; background, build briefs, original handoff and D19 are preserved
- Delivery branch: `dot/complete-tether`; existing Git history is retained. Published in draft PR #1; no merge or deployment was performed
- New local commits are authored by `dot <dot@localhost>`, explicitly identified in commit messages as the OpenAI assistant. Earlier contributor authorship is preserved

## Two evaluated source versions

### Original v2

Fingerprint: `19800346ef69e63f1917ee67d02f4f083285101cb4342ed39d323d195b0bc9e5`.

The [original manifest](reports/provenance/source-manifest.json) covers 55 files. The Phase 4 adversarial study, 39,168-bout general audit, and 8,704-bout learning/adaptation audit evaluate this version. Its 131-test suite passed before and after evaluation.

On the pinned [data branch](RAW_DATA.md), `reference/v2-source/` contains those 55 runtime files and the original `package.json`, byte-for-byte, with no duplicate test directory. It supports direct original-study reproduction and portable cross-build tests. The [full frozen archive](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/provenance/final-source.tar.gz) also preserves the original tests, tools and documentation. Archive SHA-256: `f11e5053268d6a60caa7a74928b95bb1c590820d1c2efe8c77bd8b836600edc0`.

Phase 4 separately aggregates 39 arena/src modules as `d25f0abae0cddf4e03db9c7c7c5e8add99a9f019309c47b52ec0d2a0ac90ceb5`. Every overlapping file hash matches original v2; differing aggregate scope explains the different digest.

### Delivered post-audit affect repair

Fingerprint: `c3ead812bf8a53ab91d7f335fee94839352fe382669dc9f812d0a2f2f7fc55cd`.

The root project's [repaired manifest](reports/provenance/repaired-source-manifest.json) matches the separate preregistered 768-bout repair study. Only `src/mind/workspace.mjs` and `src/mind/index.mjs` differ in production from original v2. The [exact production patch](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/affect-repair-source.patch) has SHA-256 `d0d2acae8b22d25a439ea36ca81f9031e1c66696ca8d0d24e20117aa101e358e`.

The repair changes all non-noAffect arms. Original broad-audit, budget, learning, and exploit conclusions cannot be relabeled as repaired-version evaluations. The unchanged noAffect baseline has cross-build raw-action/replay equivalence regression coverage, not a claim that all original arms remain unchanged. The comprehensive repaired-version studies were not rerun.

The [repair delivery manifest](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/affect-repair-delivery-manifest.json) and [registered study manifest](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/affect-repair-targeted.manifest.json) retain original production/runner/registration hashes. Earlier packaging bundled `reference/v2-source/`. The slim PR instead materializes hash-verified source from the pinned evidence commit into a temporary directory; `ORIGINAL_SOURCE` remains supported. See `REPRODUCE.md`. The evaluated production, registered runner and registration bytes are untouched. That test-only delta and final test counts are recorded in [delivery integrity](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/provenance/delivery-integrity.json).

## Fingerprint scope

`sourceFingerprint()` recursively covers `.js`, `.mjs`, `.html`, and `.css` under `src/`, `arena/`, `client/`, and `replay/`, plus `serve.mjs`. Sorted relative paths and bytes are each NUL-delimited before SHA-256 hashing. Documentation, tests, package metadata, reports, references and `tools/` are excluded. It is not a whole-repository hash.

Tools outside that scope that affect experiments are separately hashed. The affect study includes its two tools and preregistration explicitly. The exact external Phase 4 runner is archived unchanged in `reports/provenance/`; it expects sibling `final-source/` and `final-reports/` directories. [REPRODUCE.md](REPRODUCE.md) gives working layouts.

## Report and delivery-only work

- `tools/serve-replay-probe.mjs`: localhost-only diagnostic server added because the game server intentionally excludes `tools/`; seven separate HTTP-routing tests. This provides no missing browser evidence
- `tools/stream-learning-report.mjs`: output-only recovery from complete original-v2 checkpoints. It validates identities/fingerprints, uses frozen statistics, writes incrementally, and orders rendered chart series to match legend colors. It does not rerun agents or change measured values
- Independent analysis scripts and diagnostics are post hoc review, labeled separately from original primary protocols
- Learning raw rows are split into four independent gzip files solely for transport; ordered decompression reconstructs exact original bytes. Per-part and full-row hashes are included. The parts are prepared locally but are not committed, and attachment delivery has not been verified
- For connected-API publication, the original general-audit gzip is split into three ordered compressed-byte parts of at most 8,000,000 bytes. `tools/reassemble-phase5.mjs` verifies each part and reconstructs the exact original gzip SHA-256. This changes transport only; original measurements and source fingerprints are unchanged
- Current guides and evidence organization are delivery edits. Original final data, generated reports, registered artifacts and independent-review files remain unchanged. An explicit correction to the implementation replay guide points to the working diagnostic-server command
- Original whitespace and line endings in frozen executable files were not cleaned up. Source identity takes precedence over cosmetic edits

## License and dependencies

No project `LICENSE`, `COPYING`, or equivalent grant was found in the checked branches/history. This delivery does not invent a license or grant public redistribution rights. Confirm rights with the repository owner before redistribution; repository visibility alone is not a license.

No third-party runtime packages or vendored external code were added. Node is an external runtime under its own license. Research/prior-art references do not imply their code was incorporated or that their licenses cover Tether.
