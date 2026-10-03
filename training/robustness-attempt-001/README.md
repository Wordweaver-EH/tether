# Robustness training attempt 001: immutable completed batches

Training is still in progress. CHECKPOINT-INDEX.json lists only fully completed, stable task batches already archived here. No final training success, baseline freeze, held-out study result or gameplay superiority is claimed.

Each generation archive contains all 128 screening-task JSON files, exact candidate vectors and completed ranking marker. The original conventional selection archive contains all 256 task files and the selection ranking. Later selections can be checkpointed incrementally in complete 32-task finalist blocks, explicitly labeled selection-in-progress; their final ranking is added separately with references to those immutable blocks. Raw rows are never duplicated when finalizing a selection. Mind-wave archives, when present, contain all twelve complete task rows for one sequential training-bout index; later waves are not implied complete.

Every raw file was parsed, checked against its exact task identity and read twice with unchanged size/mtime/bytes before snapshotting. Archive extraction was verified byte-for-byte. BATCH-MANIFEST.json lists IDs, per-file sizes and SHA-256. These are task-level raw outputs and recorded telemetry summaries, not unrecorded per-tick traces. All unfavorable rows and non-emissions remain included. No runner source or outcomes are modified by publication.

In a batch directory, run `node reassemble.mjs`. It checks transport-part and whole-archive byte counts/SHA-256 before reconstructing task-results.tar.gz. Parts are at most 8 MB. Extract into a separate directory; exact original raw filenames remain under raw/. Each batch is added once without overwriting previous batch files.

Source and training protocol: code b9134f6a6859032ae37fce8f266f848c483db467; combined fingerprint cc62c10edd292e033f01f297a2567e58f5868a50fc921c46ee5d116a6f39525e. Audited calibration: data01a6ea6cc23c44233a37dad5a9ed07fe8d455c7a. EXECUTION-INDEX.json includes selected levels, workers, execution scope and exact lock/review/publication receipt hashes. No shifted condition, new-style opponent search or final evaluation belongs to this attempt.

Prepared by dot, the OpenAI assistant. No merge or deployment.
