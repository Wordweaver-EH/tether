# Complete original-v2 learning raw evidence

All four original independently compressed learning checkpoints are preserved losslessly in eleven ordered byte slices of at most 8,000,000 bytes, solely to fit publication transport limits. Slice files are not individually decompressible. No rows, source fingerprints or scientific measurements were edited.

The [transport manifest](transport-manifest.json) includes each slice's SHA-256, Git blob identity and byte count; each reconstructed gzip's original checksum; every part's raw-byte hash/row range; and the combined original hash. The earlier [raw manifest](../provenance/tether-learning-rows-manifest.json) remains unchanged.

From the root of this data-branch checkout:

```sh
node tools/reassemble-learning-raw.mjs
```

This validates every slice, reconstructs the four original `.jsonl.gz` files in this directory, validates decompressed per-part bytes and rows, and checks the ordered combined hash and row count. It never overwrites differing output. No dependencies beyond Node are required. Reconstructed files are ignored by Git.

Expected: **354,787,806 raw bytes; 8,704 rows; SHA-256 `892f2e66eba6f1e404a2bceca82828c58649f60613708d9ec6daf70f4338cc7a`**.

To write the combined raw JSONL, choose a fresh output path and concatenate the reconstructed members in part-01 through part-04 order with `gzip -dc`. See the original [RAW_DATA.md](../../RAW_DATA.md) for exact commands and original source identity. Its earlier “not committed” warning describes the original snapshot; this appended data commit closes that publication gap.

The pre-cleanup snapshot remains immutable at commit `c3b8814bb92e4086d273e2c525b722de4144a17a`. This appended data commit preserves all its files unchanged, apart from adding this transport dataset, reconstruction tool and ignored output patterns.
