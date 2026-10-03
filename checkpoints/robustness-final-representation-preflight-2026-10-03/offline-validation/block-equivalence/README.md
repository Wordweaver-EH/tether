# Independent offline representation acceptance

`acceptance.mjs` validates every saved pilot002 source file against `PILOT002-FILE-MANIFEST.json` before conversion and again after all tasks. The actual pilot source is `repo-compact`, checked against `COMPACT-SOURCE-MANIFEST.json`; `COMPACT-PILOT-LOCK.json` matches the saved pilot002 lock. The separate, unexecuted `repo-pilot002` minimal-fix candidate is not this run's source.

The run transforms saved compact records through the candidate proof reducer and block writer. It verifies the output with both the production reader and an independently implemented block reader, including gzip CRC/ISIZE, all explicit row sequences, each chained block proof and all physical/logical/data-sequence receipt hashes. It requires the final observer-proof record.

For every source record, it restores only the explicitly removed redundant proof fields and deeply compares the entire record against the original. Definition digests are reconstructed from the complete tagged `[kind,value]`; dictionary indices are unique/sequential and references cannot point forward or to a missing entry. All scientific/native/calibration/command/event/invariant/witness fields and record order must match exactly.

Report, native-comparison and two-seat-percept sequence commitments are computed independently from the original per-decision digest values using locally written seed/entry framing. The verifier does not import or invoke production `proofSeed` or `proofEntry`.

Physics replay imports the original frozen engine, never controllers. Both-seat actual commands are replayed with empty startup inputs at ticks0–17, decisions at18+4i, held move/aim between decisions and cleared throw/recall pulses. Every reconstructed delayed legal percept digest is checked against the original individual digest and added to an independently computed cumulative percept commitment. All saved120-tick checkpoints, exact events/timestamps, final world hashes and scores must match. Exact sensor times come from the queued original-engine elapsed time, preserving floating-point clock semantics.

## Artifacts

- `REPORT.json`: all192-task result, counts, byte totals and source hashes
- `raw/`: immutable amended block streams
- `receipts/`: per-task original integrity, amended receipts, independent commitments and replay evidence
- `SOURCE-AUDIT.json`: actual source/lock mapping, frozen-physics byte identity, full acceptance import closure and no-controller assertion
- `NEGATIVE-TESTS.json`:25 extra semantic/receipt/commitment mutation tests, in addition to10 block corruption/framing tests in the main report
- `run.log`, `source-audit.log`, `negative-tests.log`: execution output

`preflight-raw/` and `preflight-sensor-clock.log` retain a preliminary verifier run stopped by an overly strict verifier clock calculation (`tick / 120` rather than original engine elapsed time). They are excluded from acceptance output/byte totals. The verifier was corrected before the all192 run; producer and original files were not changed.

## Scope limitations

This is a change in proof granularity: individual report and compared-native-field digests cannot be recovered from a task-level commitment. Scientific fields remain exact; definition digests are reconstructible, and all legal percept digests are reconstructed. There is no claim that every old technical proof byte is retained losslessly.

No controllers, new bouts, tuning, selection or full evaluation run here. Offline stored bytes are measured; this does not measure future runtime CPU feasibility. The prospective36CPU-hour ceiling is for separately released later evaluation. This result grants no execution release. Independent native call/timing-boundary and wider synthetic-test reviews remain separate gates.

Scripts use exclusive creation for final outputs to avoid overwriting evidence. Re-running into this populated directory intentionally fails rather than replacing receipts.
