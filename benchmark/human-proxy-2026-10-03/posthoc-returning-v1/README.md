# Saved-evidence returning-HIT analysis

`PUBLIC-REPORT.md` is the compact public interpretation. Publish these files plus `results-final/` and `VALIDATION-OUTPUT.json` / `UNIT-TEST-OUTPUT.txt`; intermediate `results/`, `results-v2/`, `results-pre-*/` and their progress logs are development outputs, not the publication package.

## Inputs

Use the preserved original study directory containing `primary-v1/`, `repo/`, and `PUBLIC-REPORT-v1.md`. The analysis loads no controller or simulator module. Its only original-code import is `repo/src/deterministic-math.js`, for exact frozen facing arithmetic. It uses Node built-ins and Python's standard library.

## Reproduce

From this analysis directory:

```sh
node --test analysis.test.mjs
node analyze-returning.mjs /path/to/tether-human-proxy /path/to/new-analysis-output
python validate-summary.py /path/to/tether-human-proxy /path/to/new-analysis-output
```

The analyzer refuses an existing output directory. It rehashes all 64 input raw files and all 51 protected/frozen source entries before accepting their data. Original input files are never written. No Git operation, gameplay, game preflight test, controller act call, parameter tuning, or rule/mind change occurs.

## Outputs and audit trail

- `results-final/SUMMARY.json`: aggregate timing, reconstruction checks, lineage, attack/visibility landmark groups and explicit limitations
- `results-final/RETURNING-HITS.jsonl`: all 1,685 returning-HIT rows, including exact source identity, recall/impact ticks, visibility at eligible sensor/receipt ticks, saved decision context and counter-throw lineage
- `results-final/RECALLS.jsonl`: all 22,981 recalls, including the 14,105 ordinary recall denominator and outcomes
- `results-final/BOUT-SUMMARIES.json`: per-bout headline counts
- `results-final/INPUT-MANIFEST.json`: raw SHA256 identity and original report/freeze identity
- `analysis-math.mjs`, `analysis.test.mjs`: standalone FOV, turn-update and packet-grid helpers and seven tests
- `validate-summary.py`: independent aggregation/timing/attack-link checks. It does not reimplement visibility and is not a substitute for an external review

`counterContextAtHit` is the saved diagnostic, potentially based on a pre-recall delayed packet. `victimSpearStateAtImpact` is event-derived actual state before collision/reset; those two fields are intentionally distinct.

Raw `spearVisibleBeforeRecall` uses the exact event's pre-movement opponent position and reconstructed post-turn facing, immediately before the recall state transition. The event's owner facing is at the same phase and serves as a facing-update checkpoint. Impact arrival direction uses the post-turn facing, matching the collision phase. Return direction is fixed toward the recall-start target; there is no homing update. Event termination and all 3,705 resets prevent trajectories crossing reset boundaries.

An eligible RETURNING sensor tick is a multiple of four strictly greater than recall tick. Available-before-impact means source tick plus victim latency is no greater than impact tick. Samples between those decision-source frames are not reconstructed. MODE_B's no-occlusion cone is evaluated geometrically; obstacles do not block sight.

All rate associations in this report are descriptive and posthoc. Hits/recalls are not independent randomized samples; no new confidence intervals or causal tests are claimed. The original 32-cluster primary inference is unchanged.
