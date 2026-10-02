# Evidence index

The root app is the **post-audit affect-repaired version**. Most large completed studies evaluate the immutable **original v2**, not the repaired app. Keep the source/version distinction when citing any result.

## Lead interpretation and independent review

- [Results and scope](../RESULTS.md)
- [Independent evidence review](independent-review/evidence-review.md)
- [Detailed acceptance matrix](independent-review/acceptance-matrix.md)
- [Post hoc general diagnostics](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/independent-review/general-posthoc-diagnostics.json)
- [Post hoc learning diagnostics](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/independent-review/learning-posthoc-diagnostics.json)
- [Independent affect validation](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/independent-review/affect-independent-validation.json)

Scientific report content and scripts are preserved; links now resolve removed artifacts on the pinned evidence snapshot, including the original SHA-256 manifest. Their post hoc analyses do not replace the primary registered contrasts.

## Original-v2 final evidence: source 19800346…0bc9e5

### General mechanism audit: 39,168 full-length bouts

- [Corrected interpretation](final/phase5-findings.md), [complete static report](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/final/phase5-final.html), [tables/methods](final/phase5-final.md)
- [Compact JSON](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/final/phase5-summary.json)
- [Lossless full JSON transport manifest](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/final/phase5-final.transport.json), with all raw rows in three ordered compressed-byte parts; in the data-branch worktree, run `node tools/reassemble-phase5.mjs` to reconstruct the exact original gzip
- [Independent matrix/budget/score validation](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/final/phase5-validation.json)
- [Post-run 131-test transcript](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/provenance/phase5-post-run-tests.txt)

The generated original report is preserved on the data branch; use the corrected companion/review for selective-ablation, structurally ineffective affect, and D14 interpretation.

### Learning and adaptation: 8,704 full-length bouts

- [Terminal interpretation](final/learning-interpretation.md), [interactive-free static plots](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/final/learning-final.html), [summary tables](final/learning-final.md)
- [Compact report, all statistics/methods and curve points](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/final/learning-final.compact.json)
- [Output-recovery provenance](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/provenance/learning-final.postprocessing.json)
- All raw rows prepared as four separate lossless gzip artifacts; they are not in this repository and attachment delivery has not been verified. [Reassembly, availability and hashes](../RAW_DATA.md)

Complete experiments preceded a report-size failure. Output-only streaming recovery and a chart-series color-order correction are explicitly documented; no simulation was rerun or result value altered.

### Phase 4 adversarial search

- [Verdict and limits](final/phase4a-exploits.md)
- [Compact confirmation summary](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/final/phase4a-final-confirmation-summary.json)
- [Lossless full 2,816-bout confirmation](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/final/phase4a-final-confirmation.json.gz)
- [Search and selection-validation](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/final/phase4a-final-search.json), [dodger assay](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/final/phase4a-final-dodger.json)
- [Source/schedule verification](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/final/phase4-source-verification.json)

## Post-audit affect repair: source c3ead812…fc55cd

- [Targeted results](affect-repair-results.md) and [static page](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/affect-repair-results.html)
- [Registered protocol](affect-repair-preregistration.md), [implementation](affect-repair-implementation.md)
- [Complete 384 paired rows / 768 bouts](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/affect-repair-targeted.rows.jsonl) and [full result JSON](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/affect-repair-targeted.json)
- [Frozen source/runner/registration manifest](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/affect-repair-targeted.manifest.json), [delivery manifest](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/affect-repair-delivery-manifest.json)
- [Minimal production patch](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/affect-repair-source.patch)
- [Packaging test-portability clarification](affect-repair-delivery-notes.md)

Primary action/score/win endpoints were independently validated. Recall-by-score-state counters are invalid because of an event-filter mismatch and must not be interpreted as observed zero recalls. There is no full repaired-version general/learning/budget/exploit rerun.

## Engineering and provenance

- [Original mechanism implementation](implementation/cognitive-implementation.md), [replay repair](implementation/replay-determinism.md), [client changes](implementation/phase5-client-review.md)
- [Current delivery suite: 146/146](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/provenance/delivery-repaired-all-tests.txt)
- [Original frozen suite](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/provenance/final-tests.txt), [copied original suite](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/provenance/delivery-frozen-tests.txt), [diagnostic helper](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/provenance/delivery-helper-tests.txt)
- [Original source manifest](provenance/source-manifest.json), [repaired manifest](provenance/repaired-source-manifest.json), [original archive](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/provenance/final-source.tar.gz)
- [Current delivery integrity record](https://github.com/Wordweaver-EH/tether/blob/c3b8814bb92e4086d273e2c525b722de4144a17a/reports/provenance/delivery-integrity.json), [source/authorship/license explanation](../PROVENANCE.md)
- [Reproduction guide](../REPRODUCE.md), [general configuration](methods/general-audit-config.json), [learning configuration](methods/learning-audit-config.json), [Phase 4 plan](methods/phase4a-evaluation-plan.md)

Preserved reports may use their original output paths. This index and the reproduction guide map those paths to the delivery layout. Raw data, generated HTML/JSON and historical/provisional directories are now on the data branch (see [RAW_DATA.md](../RAW_DATA.md)). Historical implementation reports retain their checkpoint test counts; they are not the current aggregate test result.

## Not final evidence

- `historical/`: Phase 2 tournaments and September browser-smoke images from earlier builds
- `provisional/`: short pilots, learning smoke runs, six preliminary physics screens and their v1 snapshot
- `provisional/phase4a-superseded/`: superseded diagnostics, retained for traceability

Do not pool these with final samples or use historical screenshots to claim current browser validation.
