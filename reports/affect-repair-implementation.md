# Appraisal-driven persistence: isolated implementation repair

## Defect and scope

The previously frozen revision's affect path could not change action selection. Arousal moved the workspace admission threshold between 0.24 and 0.30, while a visible opponent always supplied Hunt above that interval and a hidden opponent supplied Search above it. Fixed refractory time and challenger margin ignored valence, confidence and score state. Consequently exact-zero noAffect results were a failed implementation of the intended feature, not a meaningful test of functioning appraisal-driven persistence.

The isolated repair leaves all specialist utilities, direct action outputs, simulation rules, belief, learning and budget allocation unchanged. It changes only how appraisals modulate workspace reorientation costs, through bounded refractory time and challenger margin. Exact formulas and the frozen targeted study appear in `affect-repair-preregistration.md`. `attentionControl` in each trace exposes the effective values; this new trace field is not itself behavioral evidence.

The initial broad audit remains evidence for the original v2 source. This revision changes the full controller and every arm except noAffect; it therefore cannot inherit all original broad-audit, budget-sweep, learning or exploit conclusions. The separate targeted study tests this repair against its unchanged neutral control.

## Source and test provenance

Production changes are only `src/mind/workspace.mjs` and `src/mind/index.mjs`. `affect-repair-source.patch` contains the complete diff against preserved `final-source`.

`affect-repair-targeted.manifest.json` records evaluated source, runner and preregistration hashes before the first evaluation job. The runner validates unchanged hashes at completion, exact duration, unique complete pairs and cognitive-budget bounds. Raw pair rows preserve action hashes, exact divergent-tick counts, physical outcomes and descriptive score-state exposure.

Before launch, all 139 tests passed. Six new affect tests establish bounded neutral-preserving controls, reachable competition effects, confidence/outcome-direction controls, noHysteresis independence, actual action differences on an identical percept stream, and original-versus-repaired noAffect replay equivalence across both modes and seats. Two runner tests cover actual action comparison and rejection of incomplete/duplicate results.

A test-only portability edit after study launch added the `ORIGINAL_SOURCE` environment override; it did not alter evaluated production, runner or preregistration bytes. The affected six tests passed again. `affect-repair-test-manifest.sha256` records these portable test files separately.

## Reproduce

Preserve or extract the original frozen repository. To run tests, set ORIGINAL_SOURCE to its repository root (absolute path recommended; cwd-relative is also supported):

    ORIGINAL_SOURCE=/path/to/original-repository node --test

Without the override, tests expect a sibling directory named `final-source`. The cross-build comparison discards only metadata wall-clock timestamps; all simulated input/sample/event records must match exactly.

To reproduce the registered experiment from a clean repair checkout without preexisting output files:

    node tools/affect-audit.mjs

This executes 384 matched pairs, 768 full-duration bouts, using the preregistered fixed seed range and four CPU workers. It intentionally refuses to overwrite existing output, rather than silently replacing a study. No source tuning based on intermediate outcomes is permitted.
