> Current version (2026-10-03): the default controller is now the experimental rebuilt N/S + C1/C2 checkpoint. Start with [CURRENT_STATUS.md](CURRENT_STATUS.md) for 264-test verification, source identity, completed new evidence and remaining gaps. The older study results and source manifests below apply only to their explicitly named historical versions.

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

## Complete learning raw evidence

The four original learning gzip parts are now published losslessly as eleven ordered byte slices on the data branch, appended at commit `d5f743052916ed5925ea852eee09360097c95300`, tree `d2f2c100a0d66c53768a6b8642447c954e6cf7d6`. The original snapshot above remains its unchanged ancestor. [Reconstruction instructions and transport checksums](https://github.com/Wordweaver-EH/tether/blob/d5f743052916ed5925ea852eee09360097c95300/reports/raw-learning/README.md).

```sh
git fetch origin data/tether-evidence-2026-10-02
git worktree add --detach ../tether-learning-data d5f743052916ed5925ea852eee09360097c95300
cd ../tether-learning-data
node tools/reassemble-learning-raw.mjs
```

The helper validates all slices, reconstructs the four exact original gzip members, verifies every decompressed part, and checks the ordered combined raw hash and row count. It refuses to overwrite differing output. Verified both before publication and from the fetched remote commit: **354,787,806 raw bytes; 8,704 rows; SHA-256 `892f2e66eba6f1e404a2bceca82828c58649f60613708d9ec6daf70f4338cc7a`**. The compressed members total 78,540,309 bytes. Slices are at most 8,000,000 bytes solely for API transport; no scientific data was changed.

Earlier data-branch documents retain historical unpublished warnings from the original snapshot. This appended data commit closes that gap; no attachment delivery is needed to obtain the raw evidence from Git.

## Completed C1/C2 evidence

[Immutable data commit d8b8887](https://github.com/Wordweaver-EH/tether/tree/d8b8887bdf6218d64759f2e150a505fae92196ee/checkpoints/c1c2-evidence-2026-10-03) contains both result archives, transport manifest and checksum reassembler. C2 archive SHA-256: `457bd9a46b162b76e0a19786b865d9f79c9a29e2518be429783e2627ebf32631` (12,347,423 bytes). C1 gap archive SHA-256: `4f340e117baf21b410c38d29dced6ab4cd6cf6745b0722bb839577032f600162` (4,860,760 bytes). No raw archives are added to the code PR.
