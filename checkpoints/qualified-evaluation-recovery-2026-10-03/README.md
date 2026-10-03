# Separate evaluation recovery supervisor

This directory contains recovery infrastructure only. Nothing here changes the frozen study, task objects, controllers, physics, seeds, conditions, worker, or analyzer. Importing the supervisor, running it without `--run`, and running the synthetic tests never execute controllers. No evaluation was executed to build/test this package.

## Scope and gates

The supervisor reuses the exact frozen `repo-evaluation/experimental/worker.mjs` through its original IPC payload. A single-use parent release is mandatory. It verifies the original exact lock and complete 150-input closure, 805 fully audited historical receipts, partition, original manifest and stability observation, independent review, Git checkpoint, and its own SHA256. A release is consumed with exclusive creation before making a fresh output directory. Output must be directly inside this separate recovery directory. Original output is never edited.

Historical complete IDs are never dispatched. Only exact partition `remainingIds` may execute. Session groups remain ordered: accepted predecessor memory is hash verified and loaded; two unfinished bouts are sequential; different groups may run on eight workers. New memory must match its terminal result before a later bout consumes it. Original seven partial files remain preserved and are charged to storage; resumed files have separate paths and provenance.

## Resource and uncertainty qualification

The original 14:52:26.760Z wall deadline is unchanged, but continuous capacity reservation `9 * elapsedSecondsSince(06:52:26.760Z)` imposes an EARLIER 10:52:26.760Z stop on October 3, 2026. This is conditional on the old and resumed executions sharing aggregate capacity at most nine logical CPUs throughout. Nine CPUs reported per process alone does not prove that shared quota across hidden process namespaces. The parent must explicitly accept that assumption and orphan uncertainty. Stability is not proof that original workers are extinct; global eight-worker concurrency and exactly-once execution of partials cannot be certified.

CPU enforcement uses the maximum of (a) that continuous whole-runtime capacity reservation and (b) an explicit historical upper bound plus resumed measured parent CPU, kernel reaped child CPU and live child CPU with tick margin. The bounds are alternatives, never summed. Stable reaped-counter brackets prevent counting a live child again as reaped. Historical recorded CPU lower bounds are never treated as total CPU. Original plus resumed raw storage, including all partials, remains capped at 16 GiB. Frozen per-task bounds and original 36 CPU-hour ceiling remain unchanged. Sampling overshoot and final tiny receipt/fsync/exit overhead remain disclosed.

## Original-write watchdog

Full hashes at preflight and finalization; inventory, size, mtime, ctime and inode before dispatch and every 250 ms. A continuous round-robin content scan processes up to 16 MiB and 128 files per poll. A complete sweep latency varies with storage and scheduling; recorded file position/cycle counters make it auditable. Any mismatch stops all resumed children. The same input closure is reverified before finalization.

## Durable output

Each task has start and exit receipts, persisted IPC response, original worker result/raw/memory files, and durable timestamped supervisor events every 250 ms. UNION.json assigns exactly one original or resumed provenance to each accepted ID. Completion requires all 4224 IDs and 3419 new accepted results. Success is an fsynced pending file followed by a bound-checked exclusive atomic link. Failure retains every partial and never retries automatically. If post-link directory fsync fails, COMMIT-UNCERTAIN.json overrides COMPLETE.json and independent audit is required; no success may be inferred from COMPLETE alone in that case. An interrupted recovery requires a new independent audit and new reviewed supervisor release; this release cannot be reused.

## Tests

`node --test supervisor.test.mjs` uses synthetic task objects, mocked procfs, and temporary files only. It covers partition exclusivity/order, predecessor constraints, bounds, no-double-count accounting, reaping transitions, failed read handling, one-use writes, metadata/content mutation and closed parent release gates. It does not certify real gameplay or benchmark results. Full new-output scientific chain validation belongs to the independent completion audit.

## Release fields

See `RELEASE-TEMPLATE.json`. It is deliberately unauthorized. Independent review and Git checkpoint must bind `lockSha256`, `supervisorSha256`, `auditSha256`, `partitionSha256`; review has `approved: true`, Git has `status: VERIFIED`. Evidence references are `{path, sha256}`. Only the parent may issue a real release after completing those gates.
