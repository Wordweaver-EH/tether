# Integrated Cover mind: bounded prototype

Select **Cover Control → Integrated mind (experimental)**, then Enter arena.
The baseline and Existing mind remain selectable. Duel remains the default.
The new option uses the same 150 ms full-percept delay, 30 Hz decision cadence,
aim noise and public information as the other Cover controllers.

## What changed

Public ring approach, hold and contest proposals now compete with the existing
mind's threat, hunt and search proposals in its workspace. Imminent spear lines
withdraw unsafe competing plans, and the existing reflex still handles a directly
observed incoming spear. Ring information never supplies hidden enemy coordinates.

Tactical reconsideration requires an actionable change or prediction mismatch,
with at least 0.5 seconds between requests. An unfinished rollout is labeled as
unfinished and falls back to the selected workspace movement, a visible clear-line
shot or immediate spear recovery. It no longer stalls the integrated option's
commands behind an unresolved tactical handoff. Embedded-spear planning supports
immediate recovery only; delayed-recall tactics are deliberately unsupported here.

A session-only engineered route cache records successful traversal and can supply
the route after a reset. It is not learned tactical strategy. Cache lookup costs
one declared work unit instead of an eight-unit route comparison, only when that
comparison actually occurs. Continuing an active route does not claim a cache win.

Tactical score-credit learning is disabled in this option: a ring point must not
be miscredited as a successful shot or recall. Existing target memory and belief
remain functional, and all state starts fresh each bout. Duel memory is isolated.
Mind View records the winning intent, evidence, request/completion/fallback and
actual post-noise command separately from its pre-noise proposal.

## Fixed short-bout evidence

The [protocol](benchmark/integrated-cover-v1/PROTOCOL.md) was fixed locally before
implementation outcomes; it was not Git-preregistered. Four fixed seeds, both seats and five conditions ran
for 30 seconds each, for 40 bouts total. There was no tuning against these results.
See the [compact per-bout evidence](benchmark/integrated-cover-v1/results/compact-summary.json)
and [pre-run source identity](benchmark/integrated-cover-v1/results/source-before-run.json).

| Condition, eight bouts each | Integrated-side points | Baseline points | Baseline ring points |
| --- | ---: | ---: | ---: |
| Full integrated | 18 | 55 | 0 |
| Objective proposals removed | 19 | 72 | 60 |
| Threat processing removed | 35 | 43 | 0 |
| Route cache removed | 18 | 55 | 0 |
| Report delivery removed | 18 | 55 | 0 |

This supports a narrow, useful change: objective control now materially prevents
the baseline from freely collecting ring points. It does **not** establish a
stronger opponent. Full integrated combat was poor, and removing threat processing
improved these scores. The full option issued 24 throw and nine recall commands,
versus 46 and 26 with threat processing removed. The source explains a concrete
opportunity cost: reflex control supplies gaze and dodge but no throw/recall, while
workspace danger withdraws ring/hunt/search plans. Across 464 reflex/threat decisions
this can sacrifice offense, recovery and position. The combined intervention removes
both reflex and workspace avoidance, so it does not identify either one as the sole
cause. This diagnosis did not trigger retuning or a new performance run.

Neither actor collected ring points in the full condition;
they contested the ring and scored through spear hits instead.

Full integrated spent 6,684 of 7,168 decisions on Objective, 305 on Reflex, 159 on
Threat, eight on Search and 12 on Hunt. This is predominantly ring-focused behavior,
not evidence of rich multi-goal flexibility. It attempted tactical planning on
194 decisions (2.7%): 135 completed and 59 explicitly unfinished. No cycle exceeded
the 192-unit logical cap; the observed maximum across all conditions was 180.

The route-cache and report-off controls each preserved the complete input stream
and final world exactly in all eight pairs. Cache removal added only 511 declared
units, from 73 genuine cache selections. This is a small computational saving,
not a strength improvement or a CPU-time measurement. All 40 bouts had zero tactical
learning updates and zero learned automatic decisions.

## Reproduce

Run `node benchmark/integrated-cover-v1/run.mjs`, then
`node benchmark/integrated-cover-v1/compact.mjs`. The runner checks its source
identity before and after the fixed matrix and retains compact measures rather
than raw per-tick streams. Use a separate output directory as the first argument
to each script to preserve an existing result.

## Verification and limits

On Node v24.19.0:

- Application and delivery suite: **321/321 passed** with `node --test test/*.test.mjs delivery-tests/*.test.mjs`
- Twelve targeted integrated runtime fixtures cover unattended capture from both sides, threat interruption/resumption, actual objective/threat action changes, public-beacon contest, low-budget fallback, bounded replanning, genuine cache reuse after reset, hidden-truth/report parity, replay determinism and recall branch/action correspondence
- Seven new client/replay harness tests cover selection, actual command-to-log correspondence, deterministic restore, repeated/interrupted flows, natural bout completion, rematch and memory isolation
- Direct comparisons with the unchanged pre-integration mind preserve Duel and Existing Cover inputs, traces, memory and cognition exactly; independent review also checked 4,800 parity ticks
- Math audit passed; all frozen compatibility fixture bytes remain unchanged
- Recursive `node --test`: **447/454 passed**. Four historical checks require external snapshot/manifests absent from this repository; three historical human-proxy checks correctly reject the modern runtime through their original source freezes. Those inputs and freezes were not rewritten

Implementation bugs found during development were corrected before the fixed
bouts: holding-position jitter, tactical gaze overriding scanning, inflated cache
accounting, threat hysteresis retaining unsafe objectives, a completed delayed
recall branch with an immediate command, and a missing current dependency in the
workspace-swap test helper. No policy was changed after viewing the fixed bouts.

These are software and short bot-bout checks. Live browser input/layout/sound,
human engagement, readable human counterplay and subjective experience remain
unverified. This optional prototype is not a consciousness result or evidence for
a four-stage learned competence trajectory.
