# Pre-execution durability clarification

Added 2026-10-04 UTC before implementation or any smoke/main bout at root's request.
The predeclaration remains unchanged. This clarification governs infrastructure
recovery only, never outcome-dependent continuation or replacement.

Each bout writes an exclusive streaming lossless JSONL.gz attempt file. It starts
with a header; sampled permitted packets, decision/receipt truth, issued commands
and world events are journaled during the bout; full interface and measurement
records and the summary are appended at completion. Periodic compression flushes
and file fsyncs preserve useful prefixes. A completed bout is recognized only by
an exclusive summary, final gzip hash/uncompressed hash, verified end record and a
durable checkpoint. Incomplete attempts and their bytes are never removed.

The normal run refuses any existing output directory. An explicit `--resume`
command requires a new root release with `resumeApproved: true`, exact freeze and
original checkpoint identity. It validates all completed file hashes and retains
those rows without replay. A row with no completed checkpoint may be restarted
from its fixed original seed into a new numbered attempt, after the root reviews
the retained interruption. The same deterministic row may therefore be executed
again solely after an incomplete attempt; it is not a new sample. The report
lists all attempts and the interruption/release. There is no automatic crash
retry, alternative seed, outcome-based discard, policy change or budget expansion.
Completed rows cannot be re-executed through this path. Source changes invalidate
recovery. Statistics require exactly the same 128 unique manifest rows.

At most one bout is active; CPU only. Before the run, the smoke's compressed
bytes per simulated second are extrapolated to 640 minutes with an explicit
safety factor; free disk is checked. During execution free disk is checked
before each new bout with a 512-MiB reserve. Insufficient space stops before the
next row and preserves all bytes. No old raw data is deleted for this study.
