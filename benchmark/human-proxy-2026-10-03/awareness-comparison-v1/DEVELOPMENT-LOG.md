# Pre-execution implementation record

2026-10-04 UTC. PREDECLARATION.md was written and hashed before implementation.
RECOVERY-POLICY.md was added before implementation at root's request. No saved
outcomes or hit coordinates selected thresholds; no main comparison has run.

The reviewed awareness prototype was copied byte-for-byte. Existing code is
imported read-only. Unit/integration tests use synthetic packets and events;
separate structural smoke is explicitly bounded to four 3-second rows and never
exposes or analyzes score outcomes. No Git writes are performed by this worker.

During source inspection before tests/smoke, RECALL_START was confirmed to use
`owner` (THROW uses `player`), and process accounting was corrected accordingly.
A synthetic regression test covers the distinction. This was not outcome-driven.
Independent review requested exact post-scan source-grid timing (scanTick+2),
exclusive/no-overwrite durable records, per-release output-directory binding,
completed gzip roundtrip checks, and external publication/review paths. These
were implemented before smoke. Recovery additionally requires a unique root
resumeId, used for an exclusive authorization claim, and proof the previous
process is no longer active before root releases recovery. Old attempts remain.

Main result validity combines source/raw integrity, cadence/age, exact arbitration,
actual-command linkage and nonzero exercised warning/scan behavior. Shadow warning
and scan metrics are diagnostic; combined intervention claims remain separate
from any unsupported awareness-alone or prevented-hit interpretation.

The first structural smoke stopped after its first 3-second row on an audit-only
assessment identity/timing failure. Inspection was restricted to failure labels
and time fields: five source-time differences, maximum 4.44e-16 seconds, arose
from the prototype canonicalizing tick/120 versus engine tick*(1/120). The audit
now uses the existing 1e-10 timing tolerance and an explicit regression. No
controller, prototype, parameter or arbitration changed; no scores/hit counts
were inspected. The failed raw attempt is preserved in awareness-comparison-smoke-v1.
A full four-row structural rerun uses awareness-comparison-smoke-v2.

Independent prerelease review found recovery edges before main outcomes: attempt
selection now includes all started/raw/summary/pending artifacts; checkpoints and
JSON outputs use fsynced temporary writes plus atomic no-overwrite hard links;
final raw manifest/report completion validates existing deterministic content
(only completedAt may differ) and fills missing outputs without replay. Synthetic
filesystem tests cover these cases. Final artifacts stay outside the code freeze.

Final prerelease review found a startup-only interruption gap between exclusive
output/claim creation and RUN-IDENTITY. A root-approved resume can now construct
that missing identity only if no gameplay attempt/checkpoint/progress/final-result
artifact exists, validating any completed main claim against exact source/Git/
output binding first. Pending evidence is retained and unique pending filenames
avoid collision with it. Existing identities also validate the exact row manifest.
This IO-only repair is covered by no-match synthetic filesystem tests; the prior
four-row structural smoke remains the only successful game-wiring smoke. No
controller, engine or statistical source changed after that smoke.
