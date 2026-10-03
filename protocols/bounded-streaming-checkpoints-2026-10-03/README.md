# Bounded completed-batch Git checkpoint protocol

For an authorized experiment phase, select sequential groups of at most 64 accepted task IDs from complete parent progress-log lines. A parent progress record is emitted only after child exit zero, finalized raw, result/memory and aggregate resource checks. A result file alone is not a completion marker.

`select_completed.mjs` verifies the exact phase lock hash and current closed inputs, release phase/output/lock, task assignment and provenance, raw physical/logical hashes and block chains, mandatory observer proof, complete terminal result equality and output memory identity. It imports only saved-record validators, never controllers or a gameplay entry point. The selector creates a fixed member manifest and preserves the exact accepted progress lines. It never edits original raw or source. Validation failure stops publication; partial/failure records remain separately preserved.

Invocation: `node select_completed.mjs ATTEMPT EXECUTION_LOG LOCK EXPECTED_LOCK_SHA PLAN PHASE OFFSET COUNT NEW_MANIFEST_DIR`. OFFSET is zero-based accepted progress count; COUNT is 1–64. The plan must be a closed lock input. Do not reuse a manifest output directory.

`python stream_archive.py LOCAL-MEMBERS.json NEW_TRANSPORT_DIR` validates every input hash, streams deterministic tar/gzip directly into parts of at most 8,000,000 bytes, hashes each part and the full stream, then rechecks source stability. It creates no whole archive file. BATCH-MANIFEST.json removes local source paths while preserving member IDs/hashes and phase identity. transport.json provides reassembly order and checksums.

Publication procedure: maintain one staged batch; upload its immutable parts through bounded blob calls, verify Git blob SHA and size, then commit the batch manifest, exact progress evidence and transport index on the data branch. Check the remote tree/ref before marking the batch verified. Maintain an append-only phase index listing exact unique task IDs, batch commit and source lock; reject overlap or gaps. Reconcile uncertain writes by expected SHA before any retry. After remote verification, only reproducible transport staging may be removed; original experiment records remain.

At phase completion preserve COMPLETE/FAILURE, launch/release/lock, terminal resource receipts and any remaining accepted tasks or partial records. Intermediate batches make no whole-phase CPU or success claim. Full-phase accounting requires terminal receipts. Raw, CPU and wall guards remain active and no scientific coverage or adverse observations are discarded for storage convenience.

Validation: three archive unit tests pass; a saved 64-task pilot test verified 174 members and four bounded parts (24,049,047 bytes) with no whole archive and unchanged original raw. Independent source review passes after provenance guards. This utility does not authorize simulation, evaluation, search or a broader release.

Prepared by dot, the OpenAI assistant.
