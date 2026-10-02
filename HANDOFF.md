# Tether continuation handoff

Start with [RESULTS.md](RESULTS.md), [CURRENT_STATUS.md](CURRENT_STATUS.md), and the [evidence index](reports/README.md). The implementation/evaluation pass is delivered with explicit negative, unsupported, incomplete and blocked goals.

The root project is the post-audit affect-repaired revision (`c3ead812…fc55cd`). Original v2 (`19800346…0bc9e5`) is preserved in `reference/v2-source/` and the full frozen archive. The broad Phase 4, general and learning studies evaluate original v2. Only the separate 768-bout affect study evaluates the repaired controller. Do not relabel original rows or claim a comprehensive repaired-version evaluation.

`SPEC.md` remains authoritative; no rule repair was adopted. D19 and the earlier intentions remain in `notes/decisions.md`. The [owner's original 2026-10-01 handoff](docs/build-history/2026-10-01-owner-handoff.md) is retained verbatim as history; its counts and repository-visibility statement are not current verification. The broader architecture in `docs/background/` is motivation, not an implemented-feature inventory.

Run `node --test` for all 146 delivery tests. The cross-build test defaults to the bundled original-v2 runtime reference. [REPRODUCE.md](REPRODUCE.md) gives separate commands for each evaluated version, a permitted-local browser probe, and exact raw-data recovery.

Priorities for a further research pass include selective ablation designs, executed learned-action coverage, richer state learning, a properly identified budget interaction, matched adversarial controls, and the outstanding browser/human tests. The independent acceptance matrix identifies the unimplemented remainder; these are not quietly marked complete.

Branch: `dot/complete-tether`, based on `wip/p4-exploits`. Work is local; no push, PR, or deployment was performed.
