# Terminal UNION backup selector

Read-only selector for completed evaluation records. This tool does not publish, run controllers, aggregate scientific results, or alter either attempt. Publication needs separate root approval after independent review.

## Usage

From the workspace root:

```
python tether-github-update/recovered-raw-selector/select_union.py "$PWD" \
 "$PWD/tether-github-update/evaluation-batches/REMOTE-VERIFIED-EXCLUSION-128.json" \
 0c6ace790469b9cac38b516013045c1a3f1c3d526c92b40ef280ca04d42f1ae9 \
 0 64 /absolute/new/output-directory
```

The offset is 0, 64, …, 4032 in the frozen plan after filtering exactly the live-verified original128 remote IDs. These correspond to publisher batches b002…b065. Never derive offsets from SUPERVISOR or completed-progress order. Each call requires a new output directory and exactly64 tasks. REMAINING-TASK-IDS.json gives the complete fixed 4096-ID order; its canonical compact JSON hash is recorded in each manifest.

LOCAL-MEMBERS.json uses the existing stream_archive.py interface: archiveName and files[{source,member,bytes,sha256}]. The publisher may stream this one batch into <=8,000,000-byte parts, then remove staged transport only after remote verification under its existing protocol. Do not construct a whole-run archive. Transport assembly independently rechecks every byte before and after archival.

The approved full-union review and every shard are pinned and rehashed. Selected raw/result/output-memory file hashes must match both UNION and the reviewed shard. This byte identity carries the existing full block/sequence/proof/terminal/memory audit; the selector does not pretend to rerun that audit. All frozen lock inputs are rehashed and included under closure/<original workspace-relative path>. All selected input memory dependencies are included even when their predecessor is from the other origin or one of the previously published128 tasks. Per-task binding paths explain reassembly; duplicate member paths are deduplicated, and separate original/resume namespaces prevent collision.

SEPARATE-PARTIALS-MEMBERS.json is a separately streamable manifest for the seven original interrupted partial raw files, explicitly excluded from the primary scientific sample and task count. Publish this separately once, not once per completed batch. Zero-byte partial is retained exactly.

The example-b002-v2 manifest is the reviewed candidate sample. example-b002 is an obsolete preparation sample, not a publication candidate. Original805 missing terminal IPC and resource qualifications remain in every public manifest. No private assistant conversations, notes, or tool context are included; only scientific source closure and evidence files are selected.

Run tests: python -m unittest discover -s tether-github-update/recovered-raw-selector -p test_selector.py -v
