# Isolated robustness shift harness

**Implementation/preflight only. No pilot, search or held-out outcome has been run.**

Production `src/` and `benchmark/interface.mjs` are copied byte-for-byte from the frozen source. The world adapter uses the production engine's per-world physics; the experimental perception copy obtains geometry/FOV from that same world. The default configuration returns the exact original world and preserves original 120-degree visibility arithmetic. Neither adapter changes controllers or the default game.

## Configuration and agent boundary

The preregistered resolved config contains full `experiment` and `technical` constants. Validation permits only obstacles, common outbound/return spear speed ±25%, player turning ±25%, and total FOV ±20°. Arena, starts, player speed/radius, clock, physics frequency, and technical constants must remain nominal. X mirror changes only obstacle X bounds, with unchanged spawn positions and facing. Generated layouts come from the post-freeze preregistration, never this harness.

All controllers receive nominal public spear physics (12/12); geometry/FOV are only their ordinary observable percept fields. The shared frozen interface supplies 150 ms latency, 30 Hz decisions, common addressed motor-noise law and one-frame throw/recall pulses. Actual state is logged only after controller calls.

Eight arms are pinned by `plan-validation.mjs`. The learning-frozen arm preserves acquired memory and disables updates through `freezeLearning`, rather than `noLearning`. The delivery cut disables attention/planner/memory delivery, retaining computation/report delivery. Metacognitive cut uses the frozen Every=1, phase=0 schedule, retaining existing exclusions and teaching eligibility.

## Execution gates

`node experimental/runner.mjs` is plan-only. Actual execution requires all of:

- Exact source, preregistration and qualified-artifact lock produced by `buildLock`
- Separate independent-review JSON with `approved:true` and `lockSha256`
- Sole-publisher checkpoint receipt with `status:"VERIFIED"` and that `lockSha256`
- Explicit root release JSON with `authorized:true`, exact `phase`, `lockSha256`, fresh absolute `output`, `workers`, and the two evidence `{path,sha256}` references
- `--run --phase=pilot|evaluation --lock=... --release=... --out=... --workers=...`

The release is consumed via exclusive creation; it cannot be reused. No automatic next phase, retry, continuation, opponent update or training exists. A failure stops scheduling more histories, terminates active task children, and writes failure status. SIGINT/SIGTERM also terminate active children. Final source hashes are rechecked. The parent alone authorizes each phase after preregistration/review/publication.

Each history is `(phase,cluster,condition,arm,seat)` with strictly ordered bouts. Each starts from the specified frozen snapshot; subsequent bouts receive only that history's output memory. Different histories, conditions, arms and phases do not exchange memory. Every task runs in a fresh child process; histories run at the locked concurrency.

## Raw evidence and measurements

Every task gets an exclusive JSONL hash-chained stream, losslessly compressed as concatenated 256-row gzip members, an exclusive summary, and (for mind) a separate output memory file. Finished streams are fsynced and made read-only. Chain verification detects changes; operating-system permissions alone are not a cryptographic immutability claim. Partial streams from failed tasks remain, never success rows. Graceful abort attempts to flush buffered rows within the cap and reports persisted/unpersisted counts. Hard kill can lose the final buffered rows or truncate a gzip member; persistence is then explicitly unknown and no completion claim is made. Logical uncompressed and physical compressed SHA256/byte counts are distinct.

Rows include task/source/parameter/config/seed provenance, all simulator events, each decision's issued commands, native diagnostic branches, exact native pending forecast, calibration settlements/censoring, state truth and contemporaneous visibility. Native pending and evaluator-derived frozen-learning shadow calibration are labeled separately and must not be pooled. No terminal truth is supplied to controller finish; delayed unresolved records are censored. Nonfinite numeric values have explicit tagged serialization.

Timing includes focal interface work including calibration capture. Diagnostic extraction/logging after act is outside decision timing but within task wall/CPU. Whole-process peak/sampled memory includes both controllers and logger. Nominal mind work and conventional trajectory counts are partial, differently scoped logical counters, not equal total compute. `maxRSS` covers one isolated task-process lifetime. Runtime pilot and later analysis must assess practical costs.

## Preflight

`node --test experimental/*.test.mjs benchmark/*.test.mjs`

Tests are synthetic/open-loop, never agent-vs-agent bouts. They check original-default exact parity, mirror involution, physics/FOV scales, serialization, invalid geometry, shared frozen interface behavior, chained stream tamper detection and one-use release evidence checks.

Opponent search and counterfactual metric definitions must follow the final reviewed preregistration. A locked RUNTIME-LIMITS.json is mandatory: phase/task wall, task RSS/raw-byte and aggregate phase CPU ceilings are enforced. Linux procfs samples live child CPU/RSS every 250 ms, so a resource crossing can overshoot by that polling interval plus termination latency. Child lifetime CPU receipts plus parent-only CPU are retained; final child IPC/exit micro-overhead is explicitly excluded. Evaluation additionally requires locked METRIC-CONTRACT.json and a reviewed searched-opponent freeze before any bout is scheduled. No claims of demonstrated robustness or equal computation follow from these tests.

Actual native reports are read after controller calls. Exhaustive faithfulness checks separately compare pre-motor intent, actual motor transform and actual command commit, with applicable/NA/missing denominators and complete mismatches retained. Invariant success does not prove uniquely causal self-explanation.

## Pilot replacement infrastructure revision

Attempt001 remains preserved with its original source and failed records. The replacement source changes only procfs exit-race handling and timestamp verification, plus regression tests. ESRCH/ENOENT are accepted only while reading a disappearing child’s procfs accounting files; unrelated I/O errors still stop the run. Commit timestamps are checked against the exact interface tick/120 clock. The simulation’s tick×(1/120) clock is retained separately and checked within four floating-point epsilons; sensor delay must independently remain exactly18 ticks. This does not widen allowed latency or change any controller, physical rule, seed, task or selection criterion. A replacement pilot requires a new review, Git checkpoint and root release; it is not a resumed or automatic retry.

## Compact observer revision (no replacement execution yet)

The approved schema, explicit metric map, design reviews and exact representation supplement are included in `docs/`. This revision preserves both original failed-pilot source and the isolated minimal-fix source elsewhere. It changes only observer persistence, redundant post-act snapshot handling and sensor-identity capture. The unchanged shared interface still executes all original in-timer native getter/calibration calls. The proxy retains those already-returned immutable snapshots; it does not remove or move timed native work.

Every actual decision, both-seat commands, exact native forecast/outcome identities, support labels, required mechanism/work fields, calibration row, C2 record and invariant result/witness remain available. Full duplicate internal rollout trajectories and successful duplicate report text are omitted as documented. Exact physics truth and legal percepts reconstruct from recorded actual controls; fixed120-tick hashes verify replay. Numeric dictionary references are task-local aliases of full-content hashes; no revision-only identity is accepted. Original legacy timestamp mismatches remain in offline conversion and are never silently erased.

Per-decision observer and terminal-observer times are separate. The original focal act timing boundary remains unchanged. Full study stays blocked by actual runtime/volume feasibility and requires separate search/evaluation releases; development-pilot success alone cannot authorize it.

## Final proof-granularity amendment

This separate revision retains every scientific record, field, control, diagnostic detail and mismatch witness. It uses versioned ordered256-record block integrity, final physical/logical/record-sequence hashes, and task-level ordered commitments to the original per-decision report/comparison/percept proof values. Individual report/comparison proof hashes are no longer individually reconstructible: proof inspectability is deliberately coarser, as prospectively approved. Do not describe all removed proof metadata as losslessly encoded.

Exact dictionary content remains present; former content digests reconstruct from [kind,value], with collision-safe full-content deduplication and unique task-local numeric aliases. Exact legal percept identity remains independently replay-checkable from all retained controls, source/config and sensor ticks. A mandatory observer-proof row immediately precedes successful completion. Readers must run both verifyBlockRaw and validateProofStructure; old formats keep their original verifier.

The unchanged pilot cap remains2CPUh/30wallminutes with all previous per-task/RSS/raw limits. The prospective full-study CPU ceiling is36CPUh, while8wallh/16GiB/all12clusters/all4224tasks remain unchanged. Full outcomes have not run. Source review, exact Git checkpoint and a fresh root release are mandatory for the final runtime pilot; no automatic subsequent phase follows.
