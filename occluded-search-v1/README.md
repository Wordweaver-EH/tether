# Byte-identical forensic reconstruction, 2026-10-06

The original execution-filesystem copies became unavailable before their raw Git
publication was verified. One authorized forensic reproduction used exactly
published source b1516040b116eb771ba75c53a9586c4ad60ef510, the unchanged
38-file freeze and Node v24.19.0 on Linux/x64. No code, seeds, scenes, thresholds
or settings changed. No retry or tuning occurred.

The resulting raw JSONL, its gzip (mtime=0) and the base64 ASCII transport all
match the retained original hashes exactly. These files are newly computed
byte-identical reconstructions, not the original disk copies or a new independent
scientific study. The original post-run audit files were not recovered.

Raw JSONL: 9,342,976 bytes
SHA-256: 23780c413849d9810245b9fbe3782852b5033ca30b371ff4f3df8f61ee89fa36

Gzip: 2,611,389 bytes
SHA-256: cb1c933f4cd11b76b1d40bfa7fb112f5336967f06d8a7d15e137a9ae0bf39192

Base64 ASCII, including one final LF: 3,481,853 bytes
SHA-256: b6f75806f274b5eca43f2bc68ae3feb1f0715307b36b9331b2368d1b211dd5b2
Git blob SHA-1: 9d7f4e430bde8f4d90bde6b0f6f4739af84cba47

Decode base64 to gzip, decompress, and verify the raw SHA-256 before use.
The original raw header has no wall-clock timestamp. The separate new
reproduction-receipt.json records when and why the reconstruction occurred.

## Lossless chunked transport

The complete base64 transport is stored as 27 ordered ASCII files under
`transport-chunks/`, described by `raw-transport-manifest.json`. Concatenation
reconstructs the exact base64 bytes above, including the single final LF.
The parts are transport packaging only; no scientific data was edited and
packaging does not execute the study. The manifest records each part's byte
length, SHA-256, and Git blob SHA-1.

After checking out this data branch, run the following from `occluded-search-v1/`.
It uses only Python's standard library, validates every part and every assembled
representation, and writes the three reconstructed files only after all checks
pass. It does not run agents, policies, tests, scenes, or any new study.

```sh
python3 - <<'PYCODE'
import base64, gzip, hashlib, json
from pathlib import Path

m = json.loads(Path("raw-transport-manifest.json").read_text())
parts = []
offset = 0
for item in m["chunks"]:
    data = Path(item["path"]).read_bytes()
    assert item["offset"] == offset, item["path"]
    assert len(data) == item["bytes"], item["path"]
    assert hashlib.sha256(data).hexdigest() == item["sha256"], item["path"]
    header = b"blob " + str(len(data)).encode() + b"\0"
    assert hashlib.sha1(header + data).hexdigest() == item["gitBlobSha1"], item["path"]
    parts.append(data)
    offset += len(data)
encoded = b"".join(parts)
assert encoded.endswith(b"\n") and b"\n" not in encoded[:-1]
compressed = base64.b64decode(encoded[:-1], validate=True)
raw = gzip.decompress(compressed)
for kind, data in [("base64", encoded), ("gzip", compressed), ("raw", raw)]:
    assert len(data) == m[kind]["bytes"], kind
    assert hashlib.sha256(data).hexdigest() == m[kind]["sha256"], kind
for kind, data in [("base64", encoded), ("gzip", compressed), ("raw", raw)]:
    Path(m[kind]["path"]).write_bytes(data)
print("Verified: all 27 parts and all three reconstructed hashes match")
PYCODE
```

`reproduction-receipt.json` and `source-verification.json` document the
reconstruction and unchanged source freeze. `raw-transport-receipt.json` is the
original reconstruction-packaging receipt; its `result/` paths refer to the
reconstruction workspace. `summary.json` is the byte-identical reproduction's
summary. These materials do not recover the missing original post-run audit
files or upgrade the scientific interpretation of the result.
