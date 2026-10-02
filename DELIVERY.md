# Delivery files

## Start here

Unzip `tether-code-and-reports.zip`, enter its `tether/` directory, and read `RESULTS.md` and `CURRENT_STATUS.md`.

```sh
node --test
node serve.mjs
```

The default code is the separately tested **post-audit affect repair**. The large general/learning/exploit evidence remains explicitly labeled **original v2**. The full project vision is not claimed complete: unsupported functional goals, unimplemented items, browser/human gaps and repaired-version evaluation limits remain listed.

## Included source patches and optional history

- `reports/provenance/tether-source-changes.patch`: source, tests, tools, reference runtime and current guides relative to base `95c0eda043be25bddc77d621e1c031ecdd4d1461`; large report/data files are excluded. Apply with `git apply --check` and then `git apply` in a clean checkout at that base. Use the code/report ZIP or Git bundle for the complete evidence set
- `reports/affect-repair-source.patch`: the separate two-file production delta from frozen original v2 to the delivered repaired controller. It is not the full integration patch or a replacement for the tests/evidence

The exact local delivery commit is recorded in `DELIVERY_COMMIT.json` inside the ZIP. All new commits are attributed to dot, the OpenAI assistant. No remote push, PR or deployment was performed. An optional Git bundle is retained separately, outside the five-file delivery batch; it is not needed to run or inspect this package.

## Large raw learning evidence

Four locally prepared `tether-learning-rows-part-01` through `-04.jsonl.gz` files carry all 8,704 original-v2 learning/adaptation rows losslessly. They are not in this repository, and attachment delivery has not been verified. See `RAW_DATA.md` for ordered reconstruction, row counts and exact hashes. The compact learning report and all methods are already in the main ZIP.

The prepared native ZIP includes full compressed original-v2 general and Phase 4 data, complete targeted repair data, original source archive, independent review, and historical/provisional material kept separate. For connected-API publication, the repository stores the general-audit gzip in three lossless byte parts; run `node tools/reassemble-phase5.mjs` to reconstruct it.

`FILE_SHA256SUMS.txt` verifies the project files. The raw-data manifest and checksums inside `reports/provenance/` verify all four separately supplied parts. The delivery batch is exactly the main ZIP followed by parts 01–04; every file is below 32 MiB. Optional local patch/history copies are not additional required attachments.
