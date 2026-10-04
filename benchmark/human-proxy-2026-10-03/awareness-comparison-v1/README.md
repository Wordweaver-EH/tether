# Frozen rear-awareness comparison

Separate experiment; original source/defaults/mind and all old raw files remain
unchanged. This tests the combined awareness-warning, noisy scan, conditional
certified movement and scan-withheld-throw policy package. It does not isolate
awareness alone or support claims about prevented HITs or human enjoyment.

Paths are relative to the containing tether-human-proxy study. Run:

    node --test awareness-comparison-v1/*.test.mjs
    node --test repo/human-proxy/*.test.mjs repo/benchmark/*.test.mjs
    node --test sensor-awareness-v1/awareness.test.mjs
    node awareness-comparison-v1/run.mjs --smoke NEW_SMOKE_DIRECTORY

The four 3-second smoke rows are structurally inspected without outcome analysis.
Its SMOKE-STRUCTURAL-RESULT.json is copied into this package before source freeze.
Then:

    node awareness-comparison-v1/run.mjs --freeze

Stop for independent exact-hash review and root publication. Root is sole Git
publisher. A release must include rootRelease, independentReviewAccepted,
reviewer, freezeSha256, verified gitCheckpoint, and the bound absolute outputDir.
Use ROOT-RELEASE.json in this package or a release outside the sealed package.
Review, publication receipts, later tests/logs, reports and results must remain
outside the sealed package: every root .mjs/.md/.json/.txt is frozen except
FREEZE.json and ROOT-RELEASE.json. Do not place resume releases inside it.

    node awareness-comparison-v1/run.mjs --run RELEASE.json BOUND_OUTPUT_DIR

The release is bound to that directory; main execution makes an exclusive claim
there before any outcome. Only one exact 128-row manifest is allowed. To recover
an infrastructure interruption, preserve all partial attempts, review them, and
obtain a new exact-source root release with resumeApproved:true and a unique resumeId. The root must first verify the
previous runner is stopped. Then:

    node awareness-comparison-v1/run.mjs --resume RESUME_RELEASE.json SAME_OUTPUT_DIR

Completed rows require compressed and uncompressed hash/end-record verification;
only uncompleted fixed rows restart into numbered attempts. See RECOVERY-POLICY.md.
No automatic retries or outcome-based replacements. Raw is lossless JSONL.gz with
header, sourcePacket, counterReceipt, ordinaryIssued, postScanSource, event,
interfaces, measurements and end records. The last three retain full original
interfaces/measurement data; earlier records provide durable progress prefixes.
Post-scan source sampling is the first strictly later source-grid tick: scanTick+2
because receipt ticks are 30+4k and source ticks 4k. Score changes are logged.

Process field naming: warningExpired counts all evidence-expired assessments,
and warningScoreResets counts all received score changes, even if no warning was
active. reasonCounts retains the complete source reasons. These are not counts
of warning episodes ended by each cause.
