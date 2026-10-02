# Review delivery

[Draft PR #1](https://github.com/Wordweaver-EH/tether/pull/1) contains runnable code, tests and summary reports. Start with [RESULTS.md](RESULTS.md), [CURRENT_STATUS.md](CURRENT_STATUS.md), and [REPRODUCE.md](REPRODUCE.md).

The exact former snapshot is preserved on [the data branch](https://github.com/Wordweaver-EH/tether/tree/data/tether-evidence-2026-10-02). See [RAW_DATA.md](RAW_DATA.md) for the immutable commit, checksums, access commands and the complete learning-raw-data reconstruction.

The cleanup removes 159 tracked raw/archive/duplicate files (41,496,228 bytes) from the PR tip. It preserves Git history and every pre-cleanup blob on the data branch. It does not shrink existing clone history. Source fingerprint, game rules, scientific measurements and registered study artifacts are unchanged.

No merge or deployment is requested. New preparation work is by dot, the OpenAI assistant.

A subsequent serving-only commit fixes the root launch URL and adds two HTTP regressions (148/148 current tests). See [PLAYTEST.md](PLAYTEST.md) for outstanding live acceptance. The study fingerprint remains separately recorded; current serving fingerprint is in `reports/provenance/current-source-manifest.json`.
