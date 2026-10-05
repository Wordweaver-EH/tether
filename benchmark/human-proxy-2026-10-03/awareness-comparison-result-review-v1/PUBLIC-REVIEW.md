# Independent completed-result review: frozen rear-awareness comparison v1

Reviewed 2026-10-04 UTC. **PASS for integrity, manipulation validity and the
preregistered completed-result analysis. Final primary classification:
inconclusive.** This is a valid inconclusive result, not evidence that the
awareness package improves net performance.

## Primary finding

An independent Python/NumPy implementation reconstructed all outcomes from the
saved raw journals and reproduced the declared 32-paired-cluster,
20,000-resample percentile bootstrap:

- Awareness-minus-unchanged net physical HIT rate: **-0.121875 HIT/min**
- Paired-cluster 95% confidence interval: **[-0.546875, 0.290625]**
- Declared practically-clear-improvement qualifier (lower bound >=0.5): **false**

The two seats are averaged inside each seed cluster. Whole paired clusters are
resampled jointly across both arms, both seats and all metrics. Neither 128 bouts
nor individual HIT events are treated as independent inferential units. The
review independently reproduced both arm-specific intervals and all **41
secondary rate/ratio metrics**, including their arm intervals and null conditional
denominators. Differences from the JavaScript report were only ordinary
floating-point rounding.

| Outcome | Unchanged | Awareness | Relevant paired change per minute |
|---|---:|---:|---:|
| Delivered HITs | 1741 | 1341 | -1.250000 |
| Received RETURNING HITs | 1144 | 611 | 1.665625 fewer |
| Received OUTBOUND HITs | 779 | 951 | 0.537500 more |
| Total received HITs | 1923 | 1562 | 1.128125 fewer |
| Net HITs | -182 | -221 | -0.121875 |

Each arm has 320 minutes of exposure. The accounting is explicit:
1.665625 fewer RETURNING HITs minus 0.537500 more OUTBOUND HITs equals 1.128125
fewer total HITs received per minute. Offense also falls by 1.250000 HIT/min,
leaving the -0.121875 net estimate. Return-hit reduction alone therefore cannot
establish a net improvement.

The unchanged arm's net rate is -0.568750, CI [-0.921875, -0.203047]; the awareness
arm's is -0.690625, CI [-0.912500, -0.468750]. Both meet the earlier descriptive
`neutralizes-within-margin` rule with its -1 HIT/min boundary. Both estimates and
intervals remain below zero; the margin label establishes neither equality with
nor superiority to ordinary. These arm labels do not replace the paired primary
question or authorize another research branch.

## Raw reconstruction and run completeness

All **128 unique declared rows** completed at exactly 300 seconds: 32 fresh seed
clusters × two counter seats × two arms, **640 simulated minutes**. The saved
record shows one initial attempt for every row, exit code 0, all 128 ordered
completion-log entries and durable progress entries, and no recovery, extra
attempt, pending file, omitted row or replacement seed.

For every bout the reviewer independently checked:

- Compressed SHA256 and byte length; complete gzip decoding; uncompressed SHA256
  and byte length; one initial header and one final end record
- Exact header, manifest, start record, summary, checkpoint and report identities;
  matching summary hashes and serial start/completion chronology
- All source packets at 120-Hz tick multiples of four; exactly 9000 source packets,
  8993 delayed counter decisions and 8996 delayed ordinary decisions per bout
- Exact 250-ms counter and 150-ms ordinary delays, both at 30 Hz; source-packet
  identity and the recorded permitted sensor contract
- Journal/interface duplicate-command and diagnostic equality; all recorded
  delayed visibility reconstructed from the matching source packets
- Exact scan/throw/recall arbitration, unmodified base commands on no-scan
  decisions, exact certified movement overrides, and retained base movement on
  uncertified scan-only decisions
- Indexed noise samples for both controllers, plus an independent reconstruction
  of the counter's single post-arbitration aim-noise transform and unchanged
  movement/throw/recall channels
- World HIT events against recorded measurement HIT phase, impact tick, attacker,
  victim and throw lineage; all score and rate reconciliations
- All process counts, reason counts, HIT contexts and end-clipped warning/scan
  exposure durations reconstructed without calling the original summarizer
- Every post-scan sample's first later source-grid tick (+2), visibility and score
  transition; final scans without a later in-bout source sample are retained
  correctly in scan counts but excluded from conditional post-scan denominators

This covers **1,151,104 counter decisions**, **1,151,488 ordinary decisions**,
**2,302,592 indexed noise samples** and **6,567 physical HITs**. A separate
streaming check joined every HIT's recorded context to the actual most recent
counter decision. No reconstruction or manipulation discrepancy was found.

## Process costs and interpretation

The intervention was actually exercised: awareness issued **100,254 scans** on
100,254 warnings. These contain 38,781 exact certified movement overrides and
61,473 scan-only decisions retaining uncertified base movement. Unchanged issued
zero scans; its 94,922 shadow warnings had no command effect. Warning/scan exposure
is end-clipped at bout termination, and full-bout occupancy differs correctly
from recorded-decision proportions.

There were 10,692 base throw proposals in unchanged and 10,200 in awareness.
Awareness withheld 91 proposals during scans, issued 10,109 throw commands and
produced 10,106 actual THROW events, versus 10,692 actual throws in unchanged.
The 91 withheld proposals cannot be equated with the 400 fewer delivered HITs;
changed trajectories also change subsequent opportunities and successful throws.

Mean scan aim displacement was 2.350462 radians. The no-scan arm's conditional
scan displacement and the corresponding between-arm difference are null, not
zero. Delayed opponent-body visibility fell from 99.993050% to 83.117598% of
recorded decisions, while mean aim-noise sigma rose from 0.044081 to 0.049315
radians. These observations characterize the combined package's costs and do not
isolate a causal contribution of any component.

At awareness-warning receipt, evaluator truth was non-RETURNING in
53,606/100,254 cases (53.470186%). This remains a current-state complement, not a
false-recall-prediction rate. The warning does not assert that an unseen recall
occurred. Post-scan visibility, delayed reacquisition and received-HIT contexts
are descriptive associations, not prevented-hit counts or isolated scan effects.
Secondary intervals remain descriptive and are not multiplicity-adjusted claims.

The supported estimand is the complete frozen awareness, scan, conditional
movement and scan-withheld-throw package against this frozen ordinary policy.
The study does not establish awareness-alone benefit, human enjoyment, an optimal
strategy or general superiority. Both comparison arms retain the same original
latency disadvantage against ordinary.

## Frozen source and provenance

Independent post-run hashing confirmed the exact pre-match freeze:

- 30 sealed comparison-package files and 52 dependencies
- 91 prior package/result files and all 64 original raw files
- 20 original frozen-package files and 31 protected-source entries
- 52 saved Git blob identities for the original source/dependency set
- Exact deterministic fresh-seed derivation, pairing and order; no overlap with
  original-study or structural-smoke seed values
- Root release before execution and matching recorded Git checkpoint throughout

Source inspection confirms default-world creation, unchanged protected source,
evaluator-only truth separation and the reviewed once-only motor transform. The
executed package remains byte-identical to the pre-match freeze. Saved provenance
shows no post-outcome policy change, altered rules/mind/defaults, replacement row,
rerun or outcome-dependent stopping. Pre-execution structural repairs are retained
in the already reviewed development record.

This was a **saved-data-only** review. No controller execution, full match, new
experiment, parameter search, policy edit or Git write was performed. The review
checks the saved Git identities and recorded root-verified checkpoint; it does
not independently contact the remote Git server. Raw HIT reconstruction relies
on the saved physical events and exact HIT lineage, not a new physics rerun.

The original machine `REPORT.json` is preserved unchanged with its historical
`pending-independent-result-review` status. This external review supplies the
completed integrity/manipulation verdict. The earlier 64-bout study remains
unchanged and inconclusive; no conditional branch or further experiment is
released by this result.

## Exact identities and reproducibility

- Freeze: `356e9f22241dcd44429041eccc6680c7c0d31d3483ea6051eb7c3980f9f43343`
- Recorded pre-match Git checkpoint: `58834179a6bc2efa62b208e33149e877b62cdade`
- Original REPORT.json SHA256: `87e62a7ebcb16358034087a118ddbe04e542ee0da6f7588ec1b2a6c2cdf2c774`
- RAW-MANIFEST.json SHA256: `43574fb305e4b364375184865ea240b89e13b1e375bc05325b3a931c2b04ce4e`
- RUN-IDENTITY.json SHA256: `f2732962804460e15ef6419e1e70e4c6688e26476595e3a79852ae57bf3c5c40`

The sibling `independent_audit.py`, `supplemental_integrity.py`, captured audit
outputs, reconstructed bout metrics and verification JSON files provide
reproducible evidence. They read saved data and do not import or execute the
simulator, controllers or original statistical implementation. This review and
its evidence remain outside the sealed source package.
