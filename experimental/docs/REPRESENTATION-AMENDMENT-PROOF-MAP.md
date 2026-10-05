# Final representation-only amendment: proof map

DESIGN FOR INDEPENDENT REVIEW. No controller execution or implementation by this document. Preserve pilot002 and its exact source. Retain every scientific row, field, command, native forecast/outcome, support label, event, diagnostic detail and mismatch witness. Do not remove branch, recall, recipient-used/proposed or other retained details.

## Motivation and prospective bound

Pilot002 completed192/192 with zero invariant mismatches. Its observed linear full-study projection is22.176GiB raw and26.500 accounted CPU-hours including parent overhead. One bounded all192-task byte-attribution pass reproduced every original gzip member size. Replacing only redundant proof representation projected13.453GiB. This is a storage estimate, not guaranteed full-study volume or measured CPU improvement.

Root authorizes a prospective operational CPU ceiling36CPUh, retaining8wallh,16GiB raw,12clusters and all4224 full tasks. No full-study outcomes have run. The protocol owner records this as a separate prospective amendment; agents, parameters, seeds, configs, scientific endpoints and sample counts remain unchanged. A final runtime pilot is separately reviewed, published and released. No further optimization follows except corrections of defects.

## Omitted technical metadata and replacement

1. Per-row envelope `previous` and `digest` (not scientific fields) become ordered256-record block proofs. Each data line remains an explicit `{sequence,record}`. Each gzip member contains up to256 consecutive data lines followed by one proof envelope binding block index, first sequence, record count, previous block digest and the exact ordered data bytes. The final receipt binds every member with a complete physical file SHA256, full uncompressed SHA256, complete data-sequence SHA256, row/block counts and final chain tail. Any row change, insertion, deletion, reorder or block reorder fails verification. Row sequence remains explicit.
2. Per-decision `actualReportSha256` becomes one ordered task-level commitment to the exact original digest sequence, keyed by task, seat and decision index. Native check states and all complete mismatch witnesses remain per decision. No observed report value is invented or replaced. This is a change in proof granularity, not a losslessly reversible encoding of individual proof hashes; all scientific report metrics/witnesses remain intact.
3. Per-decision `comparedFieldsSha256` receives the same task-level ordered commitment. Every compared scientific native/command field and every check/mismatch remains; the current fixed projection definition remains documented.
4. Per-decision two-seat `perceptHashes` receive an ordered task-level commitment, with receipt/sensor ticks and decision index in the committed entry. Every actual two-seat command, sensor clock, visibility field, config and fixed120-tick physics checkpoint remains. Exact legal percepts can be reconstructed from the recorded control stream and compared with this complete sequence commitment, without controllers. No sampled-only percept validation is substituted.
5. Per-definition `contentHash` is omitted because its exact value is derivable as SHA256(tagged serialization of `[kind,value]`). Keep the complete kind/value plus task-local numeric dictionary index. Dictionary deduplication is keyed by the complete tagged serialized content, not by revision alone or a possibly colliding short key. Thus different content cannot silently alias; all exact content remains available, and the former digest reconstructs exactly.

No other scientific or diagnostic field is removed. Definitions stay where first used; native pending/outcome and calibration rows keep their identities, order and original values. Existing zero/missing/null/nonfinite semantics remain unchanged. Legacy commitment timestamps and every original mismatch witness remain as recorded; absence is never filled with an imagined observation.

## Ordered proof-sequence record

Before task-complete, emit one technical `observer-proof-sequences` row containing algorithm/version, task/seat identity, decision count and final SHA256 for each of report/native-comparison/two-seat-percept digest sequences. Each incremental entry is unambiguously tagged and length/framing-delimited (one tagged JSON array plus newline), including decision index, receipt tick, sensor tick, explicit presence and original value. Null and absence differ. No delimiter ambiguity or commutative aggregation is permitted.

The original per-decision proof values continue to be computed from the same sources; their storage is rolled into these ordered commitments. Original in-timer native diagnostic/calibration calls, controller behavior, RNG, public rules and focal-act measurement boundaries are unchanged. No evaluator information enters control.

## Raw integrity format and failure behavior

Use a new explicitly versioned block format, not a silent interpretation change to old streams. Gzip remains lossless with256-data-row members. Complete physical/logical/data-sequence hashes and the chained block tail are distinct fields. Baseline/file-size limits apply to stored bytes as before. Graceful abort flushes complete pending rows when within cap; partial/hard-killed member data remain explicitly incomplete and cannot receive success status. Old formats remain readable by their original verifiers. The new verifier validates full block content/count/sequence/chain and final file receipts before exposing records to analysis.

## Mandatory offline acceptance on all192 saved pilot002 tasks

- Original raw hashes/chains verified before conversion, no original file modified
- Compare every scientific record and nested field after excluding only the five explicitly listed redundant proof representations; preserve record order and every command/event/forecast/calibration/support/invariant/witness value
- Recompute all three ordered commitments independently from original individual proof values; compare to amended streams
- Reconstruct every removed dictionary contentHash from complete kind/value and compare exactly to its original digest; enforce unique integer aliases and no forward/missing references
- Validate corruption/reordering/truncation rejection for the new block format; verify original and amended data-sequence counts
- Replay all192 amended control streams with frozen physics only, no controllers; compare all available source120-tick/final hashes, full events, every sensor-time percept digest through its ordered commitment, and final scores
- Re-run source immutability, native call-sequence/timing-boundary and all existing synthetic tests
- Measure offline stored bytes only; CPU feasibility still needs the final separately released runtime pilot under the prospective caps

Only after independent map and implementation review, exact Git checkpoint and root release may the final development runtime pilot execute. Full evaluation and opponent search remain separately gated.
