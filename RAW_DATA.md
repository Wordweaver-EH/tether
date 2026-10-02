# Raw data and lossless reconstruction

The repository includes complete raw Phase 4 confirmation (`reports/final/phase4a-final-confirmation.json.gz`), the full original-v2 general report/raw rows in lossless transport parts, and the complete repair dataset (`reports/affect-repair-targeted.rows.jsonl` and `.json`).

## General-audit transport parts

The 16,095,792-byte general-audit gzip exceeds the connected publication API's request-body limit after base64 encoding. It is therefore stored as three ordered byte slices, each at most 8,000,000 bytes. This is a transport-only change; no scientific evidence bytes were edited.

Reconstruct and verify the exact original gzip with Node, without installing anything:

```sh
node tools/reassemble-phase5.mjs
```

This checks each part and the combined original hash, writes `reports/final/phase5-final.json.gz`, and verifies the result. It accepts an already matching output and refuses to overwrite a different file. The reconstruction is ignored by Git so the large blob is not accidentally reintroduced. Parts are slices of one gzip stream, not independently decompressible files. [Transport manifest](reports/final/phase5-final.transport.json).

Expected gzip SHA-256: `2eec0d8f78941cfba02ee0ff9301e1380b7959c2ec9d6fffbbc959a1ab3a189c`.

The previously prepared native ZIP contains this same gzip as a whole file. The publication format differs only in transport packaging.

## Learning raw-data availability

The original-v2 learning raw checkpoint is larger: **354,787,806 bytes, 8,704 JSONL rows**. To keep each attachment under 32 MiB, four independently readable gzip files were prepared locally. **They are not committed in this repository, and their attachment delivery has not been verified.** The repository includes all compact summaries/methods and the reconstruction manifest. Once the four data artifacts are available, use the instructions below:

| File | Rows | Approximate compressed size |
| --- | ---:| ---:|
| `tether-learning-rows-part-01.jsonl.gz` | 2,514 | 20.2 MiB |
| `tether-learning-rows-part-02.jsonl.gz` | 2,432 | 22.0 MiB |
| `tether-learning-rows-part-03.jsonl.gz` | 2,476 | 20.9 MiB |
| `tether-learning-rows-part-04.jsonl.gz` | 1,282 | 11.8 MiB |

Each part ends at a row boundary and preserves the original bytes/order. Measurements were not edited. Part compression differs from the original single gzip; compare reconstructed **raw bytes**, not the compressed bytes, with the original raw hash.

## One-command reconstruction

Put all four parts in the same folder. In a shell with `gzip`, run:

```sh
gzip -dc tether-learning-rows-part-01.jsonl.gz tether-learning-rows-part-02.jsonl.gz tether-learning-rows-part-03.jsonl.gz tether-learning-rows-part-04.jsonl.gz > learning-final.rows.jsonl
```

Use a fresh destination; shell redirection replaces an existing file. The four files can also be individually decompressed and concatenated in numerical order with a binary-safe tool.

Expected reconstructed SHA-256:

`892f2e66eba6f1e404a2bceca82828c58649f60613708d9ec6daf70f4338cc7a`

```sh
sha256sum learning-final.rows.jsonl
wc -l learning-final.rows.jsonl
```

Expect the hash above and 8,704 lines. Exact per-part raw/compressed sizes, hashes and line ranges are in [the manifest](reports/provenance/tether-learning-rows-manifest.json). [Compressed-part checksums](reports/provenance/tether-learning-rows-SHA256SUMS.txt) can be checked from the folder containing the parts.

The compact learning report contains all summaries, methods, definitions and 960 curve points; it intentionally omits the large raw row array. Use the checkpoint and preserved progress manifest for output-only report regeneration, following [REPRODUCE.md](REPRODUCE.md). The raw source identity is original v2, not the delivered affect-repaired version.
