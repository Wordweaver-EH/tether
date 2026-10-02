# Evidence on the data branch

Raw evidence and the frozen original-v2 source are preserved losslessly on [data/tether-evidence-2026-10-02](https://github.com/Wordweaver-EH/tether/tree/data/tether-evidence-2026-10-02), pinned at commit `c3b8814bb92e4086d273e2c525b722de4144a17a`, tree `f6c3a61ce28468d4024a6e98c741e7df1e26e85f`.

The branch was created and fetched back before cleanup. Its tree exactly equals the former PR snapshot: all 306 tracked files, unchanged. This includes Phase 4 confirmation, general-audit transport parts, complete targeted affect rows, large generated reports, historical/provisional evidence, source archives, patches, manifests and the former duplicate reference tree. The PR tip retains code, concise reports and small reproduction/source manifests. No history was rewritten; old large objects remain in Git history.

- [Original evidence index](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/README.md)
- [Full file SHA-256 manifest](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/FILE_SHA256SUMS.txt)
- [Raw-data reconstruction and checksums](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/RAW_DATA.md)
- [Exact original experiment reproduction commands](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/REPRODUCE.md)

## Access

```sh
git fetch origin data/tether-evidence-2026-10-02
git worktree add --detach ../tether-evidence c3b8814bb92e4086d273e2c525b722de4144a17a
cd ../tether-evidence
sha256sum -c FILE_SHA256SUMS.txt
node tools/reassemble-phase5.mjs
```

The historical whole-tree checksum manifest predates the transport-publication packaging; use its matching entries plus the transport manifest for later packaging files. Git tree equality is the authoritative lossless-snapshot check.

## Learning raw-data limit remains open

The four separately prepared learning JSONL gzip parts were never published in the original PR and are therefore **not on this data branch**. This cleanup does not claim their delivery. Their manifest, compressed hashes and exact reconstruction instructions are preserved at the pinned links above. Expected combined raw SHA-256: `892f2e66eba6f1e404a2bceca82828c58649f60613708d9ec6daf70f4338cc7a`, 8,704 rows. Compact learning statistics and interpretations are preserved.
