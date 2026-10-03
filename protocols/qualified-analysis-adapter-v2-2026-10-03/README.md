# Qualified recovered-union adapter

This separately reviewed infrastructure adapter leaves all frozen scientific modules, original evidence, recovery supervisor and gameplay/controller source untouched. Preparation and tests do not open task results, raw streams, memory outputs, or interim policy aggregates. No study execution or scientific analysis is authorized by these files.

## Scope and invariants

- Resolve the genuine UNION's 805 accepted original plus 3419 resumed tasks directly, with exact IDs, paths, filenames and SHA256s. No copying or hardlinks and no fabricated COMPLETE/finalization.
- Verify the original 2131-file manifest and metadata, the complete recovery release/evidence chain, consumed recovery token, genuine terminal COMPLETE/log and observed successful supervisor process exit. FAILURE or COMMIT-UNCERTAIN blocks analysis.
- Validate every task with the unchanged frozen decodeTask, raw proof checks, scoreEvents and extractDiagnostics. All memory artifacts and all bout0-to-bout1 links cross attempt boundaries unchanged. Seven preserved original raw-only partials are excluded from primary records and inventoried separately.
- Preserve frozen lexical order, training references, seeds, 20,000 bootstrap draws, endpoint hierarchy, weighting, statistical corrections, calibration, novelty summaries and timing/RSS/work expressions.
- After every task validates, independently recheck original full hashes/metadata, resume inventory/metadata, scientific and adapter source manifests, and terminal evidence before aggregate calls. Recheck again before qualified report publication. Metadata checks include inode, ctime, mtime and size; raw/result/memory content hashes are checked individually during the validated pass.
- Original terminal child usage, parent CPU and partial-worker totals are explicit nulls. Genuine worker receipt processLifetimeCpu is a separate earlier endpoint lower bound in microseconds. Resumed terminal IPC is a resumed-only sum. No synthetic combined full-phase CPU exists. Capacity reservation is never measured CPU or allocated to tasks/arms.
- Public report status is COMPLETE_RECOVERED_QUALIFIED and includes all limitations, missing resource fields and provenance. Per-task outputs carry VALIDATED_TASK_UNAGGREGATED until acceptance by the final report. qualification.json explicitly records statusAtCreation, preserving the initial validation stage; report.json is the sole acceptance authority. On error, no output is scientifically accepted, including any already written aggregate files.

## Required release and exit audit

Only the root may write an authorized analysis release, after genuine terminal execution and full-union independent review. ANALYSIS-RELEASE-TEMPLATE.json is deliberately unauthorized. The independent adapter review must contain approved=true, adapterManifestSha256 and frozenAnalysisManifestSha256 matching the root release. The independent terminal-union review must contain approved=true, acceptedOriginal=805, acceptedResume=3419, completeSha256, unionSha256, originalManifestSha256, and recoveryReleaseSha256 matching the exact released evidence. Every {path,sha256} reference names exact genuine evidence. Output must be a fresh immediate child directory of this adapter directory, outside original/resume/frozen source.

The root-observed terminal-exit audit must contain:

- status: VERIFIED_SUCCESSFUL_PROCESS_EXIT
- observationSource: execution-tool-terminal-response
- sessionId: exact original launch-receipt session ID
- exitCode: 0, signal: null, observedAt: an actual observation timestamp at or after COMPLETE
- resume: exact resumed attempt directory
- completeSha256, unionSha256, supervisorLogSha256, recoveryReleaseSha256
- Recommended: exact tool terminal response or durable evidence reference, process identity and observation notes. A process disappearing or a COMPLETE file alone is insufficient evidence of successful exit.

Run only after all gates and explicit approval:

    node analyze-qualified.mjs ROOT_ANALYSIS_RELEASE.json NEW_OUTPUT_DIRECTORY

The release is consumed exclusively. A failed run requires a separately approved fresh output/release; never overwrite failed evidence. Source manifest hashes bind this entry point, gate, interface resource adapter, tests and documentation. The manifest itself is bound by independent review and root release.

## Synthetic tests

    node --test adapter.test.mjs
    node --test ../tether-robustness-shifts/repo-evaluation/experimental/analysis/*.test.mjs

Tests exercise missing/duplicate/unknown/overlapping IDs, origin substitution, failed and uncertain termination, missing/nonzero supervisor exit, result/IPC inconsistency, missing resumed terminal usage, historical null serialization, fake historical CPU rejection, artifact escapes/symlinks/tampering, cross-origin memory and frozen-learning invariants, resource separation, and unchanged score/calibration/native output with recovery metadata. Synthetic fixtures are copied from frozen tests, never read from the running study. The per-arm resource expression is checked byte-for-byte against frozen orchestration.

## Files and acceptance

- gate.mjs: source/release/terminal/partition/inventory/path/resource/lineage infrastructure
- analyze-qualified.mjs: orchestration using frozen scientific exports
- interface-resources.mjs: exact frozen per-arm timing/RSS/work expression
- adapter.test.mjs: synthetic-only tests
- SYNTHETIC-TEST-RESULTS.txt: synthetic test run, not study results
- SOURCE-MANIFEST.json: infrastructure source closure (not execution authority)

No repository changes, commits, publication, retuning, gameplay or autonomous next study are authorized. Stop and report after the requested study.

## Version 2 infrastructure-only correction

Version 1 stopped before release consumption, output creation, task decoding or aggregate calls: inherited orchestration selected the first lexically sorted task in each cluster, which is conventional and correctly has snapshotSha256=null. Its comparison against a mind training snapshot always failed. Version 2 checks every mind-arm task against its frozen cluster training-reference snapshot, requires every conventional snapshot to be null, and requires mind tasks in each referenced cluster. Frozen scientific source, task order, selection, reference values, scoring, diagnostics and statistics are unchanged. A metadata-only mixed-arm regression covers the actual frozen task roster. Original version 1 source, release and failed-start evidence remain preserved in the sibling directory.
