# Current status

**The implementation/evaluation pass is delivered, with specific open architecture goals and external validation limits.** This is not an assertion that every original goal has been achieved.

## Delivered code and verification

- Default playable code: post-audit affect repair, evaluated fingerprint `c3ead812bf8a53ab91d7f335fee94839352fe382669dc9f812d0a2f2f7fc55cd`; current served tree `4a7fbb875395bb4f99658eb5b8c78f17558d2c98b6430eb0877e4f97d550b854` differs only by the HTTP root redirect
- Aggregate delivery tests: **148/148 passing** on Node v24.19.0; 139 implementation/runner tests plus nine diagnostic-helper tests
- Immutable original-v2 reference: fingerprint `19800346ef69e63f1917ee67d02f4f083285101cb4342ed39d323d195b0bc9e5`, all 55 runtime-file hashes verified; full original archive retained with its 131-test suite
- Cross-build noAffect regression materializes checksum-verified original source from the pinned data-branch commit; `ORIGINAL_SOURCE` remains available
- SPEC constants and mechanics unchanged; only workspace appraisal control and its trace wiring changed between the two evaluated versions

## Completed CPU evaluations

| Study | Version | Completed evidence |
| --- | --- | --- |
| Phase 4 adversarial study | Original v2 | 4,320 training + 2,160 selection-validation + 2,816 independent confirmation bouts; source and schedule checked |
| General mechanism audit | Original v2 | 39,168 full-length bouts; complete paired matrix, budget bounds, scores and seed-cluster intervals validated |
| Learning/adaptation audit | Original v2 | 8,704 full-length bouts; complete checkpoints validated; output-only recovery after serialization failure |
| Affect repair study | Post-audit repair | 768 full-length bouts / 384 pairs; independently verified primary endpoints, bounded narrow benefit |

The original evidence remains unchanged. No broad repaired-version audit or interaction sweep was silently substituted or inferred.

## Original task acceptance at a glance

1. **Phase 4 search:** completed computational study; no universal simple strategy or competitive anchor policy established; no rule adoption
2. **Cross-runtime determinism:** repair and Node/cross-JIT regressions implemented; the user-supplied Edge 154 fixture passes Node v24.19.0 verification: 3,600 ticks, 601 samples, hash `9b729b88b12f9d19`; browser identity is user-reported
3. **Mind v2:** mechanisms and explicit ablations implemented, with a repaired affect path. Several original ambitious learning/architecture goals remain unsupported or incomplete
4. **Indicator audit:** complete original-v2 general and learning datasets/reports delivered, preserving harms and nulls. Restricted comparators do not selectively validate broad consciousness theories; full repaired-code interaction coverage is unperformed
5. **Taste fixes:** rendering/selection code and automated tests completed; live visual, input, audio and browser-storage checks remain blocked

See the [detailed independent acceptance matrix](reports/independent-review/acceptance-matrix.md) and [results](RESULTS.md).

## Important limits

- Available cloud browser navigation returned `net::ERR_BLOCKED_BY_CLIENT`; no bypass was attempted. A later user-supplied replay fixture passes independent Node verification; live play and human engagement remain unverified
- The logical cognition cap is not exact hardware or wall-clock equality
- `noAttentionSchema`, `noWorkspace`, `noToM`, and `noLearning` are operational software interventions with limited selectivity
- Four-stage competence and primary within-bout adaptation benefits were not demonstrated; automatic labels are not executed learned-action coverage
- Original affect was structurally ineffective; repaired affect has only its separately labeled targeted evidence
- Affect-study recall-by-score-state counts are invalid instrumentation, not observed zeros
- Optional D18 terminal-reward-only emergence/mesa-objective experiments remain unimplemented
- Local delivery only: no remote push, PR, merge, deployment, or upload by the build worker
