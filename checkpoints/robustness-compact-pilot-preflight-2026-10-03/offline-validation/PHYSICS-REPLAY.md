# Saved-control physics replay

This is an independent offline replay runner using the original frozen physics engine, **not** an independently reimplemented physics engine. It never imports controller modules or invokes controller decisions, training, gameplay search, or policy selection. Only completed pilot-attempt-001 tasks are included. Incomplete attempts are not relabeled as complete.

Run from any working directory:

    node /workspace/scratch/75679def3745/tether-robustness-shifts/offline-validation/physics-replay.mjs
    node --test /workspace/scratch/75679def3745/tether-robustness-shifts/offline-validation/physics-replay.test.mjs

The runner writes only inside offline-validation/physics-replay. Original repo and saved pilot files are read-only inputs. Before replay it checks original simulator, deterministic math, world adapter, perception, task schedule and sensor projection against PILOT-SOURCE-MANIFEST.json. The sensorPacket pure projection is copied byte-for-byte from the frozen interface, with an exact source-range check; importing the full interface would load controller modules.

For each of 181 external result files:

1. Check raw and result bytes against the preserved PILOT-ATTEMPT001-FILE-MANIFEST.json.
2. Verify compressed physical SHA256/bytes, decompressed logical SHA256/bytes, every row's sequence/previous digest/chained digest, row count and final chain tail against the result receipt.
3. Reconstruct createResolvedWorld(task-start.config), then check initial truth and initialHash.
4. Tick the original engine exactly 3,600 times. Use empty inputs for both seats on ticks 0–17; consume each saved two-seat actual actuator input on tick 18+4i; hold move/aim and clear throw/recall between decision ticks.
5. At every saved decision, compare exact receipt truth, receipt time, decision index and tick, delayed sensorTruth at tick−18 (including both packet hashes and visibility), sensor time and current visibility. No numeric tolerance is used.
6. Compare every generated physics event against the saved ordered event stream, including its tick and elapsed time; reject extra or missing events.
7. Check scores, elapsed time and finalHash against both raw task-complete and external result.

## Reuse contract

physics-replay.mjs exports:
- verifyRaw(compressedBytes, result.raw) → {records, integrity}
- replayRecords(records, result, {onCheckpoint}) → per-task receipt
- verifySources() → verified frozen source hash entries
- sensorPacket(view), serialize(value), parse(text), sha256(value)

The optional onCheckpoint callback receives {tick,time,worldHash,snapshotSha256,snapshot}. There are 31 checkpoints per task: ticks 0,120,…,3600. The last fixed checkpoint is also the terminal checkpoint, not duplicated. These snapshots are derived validation artifacts, not preexisting original pilot evidence. Their SHA256 values use serialize(snapshot); worldHash uses the original engine's hashWorld. Snapshot files are newline-delimited JSON; the receipt also hashes the complete checkpoint file.

replayRecords is intended for verified inputs; use verifyRaw first when reading original raw streams. It does not itself verify raw-byte chains because it accepts already parsed records. The report's zero-controller-call claim follows the import/call structure: only world/sim/perception are executable task source dependencies.

Per-task receipts: physics-replay/tasks/{taskId}.json
Checkpoints: physics-replay/checkpoints/{taskId}.jsonl
Aggregate report: physics-replay/REPORT.json
Execution log: physics-replay.log
Mutation-test log: physics-replay.test.log

The tests require valid replay/checkpoint generation and reject corrupted physical/logical digests, chain tails, receipt truth, delayed truth/packet hashes, event time, missing events, decision tick and terminal hash. They perform only saved-control replays.
