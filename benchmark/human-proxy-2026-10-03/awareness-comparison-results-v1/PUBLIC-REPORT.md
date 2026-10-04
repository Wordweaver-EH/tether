# Frozen rear-awareness comparison v1: completed result

## Primary finding

Independently reviewed classification: **inconclusive**.
The combined awareness/scan/conditional-movement/scan-withheld-throw variant changed net physical HIT rate by **-0.121875 HIT/min**, paired-cluster 95% CI **[-0.546875, 0.290625]**, versus the unchanged counter.
The declared 0.5-HIT/min practical-clear-improvement qualifier is **false**.

Exactly 32 fresh paired seed clusters, both counter seats and both arms completed: 128 five-minute bouts, 640 simulated minutes. The primary averages both seats inside each cluster; its 20,000-resample bootstrap resamples complete paired clusters. No optional stopping, parameter search or outcome tuning occurred.

## Against the same frozen ordinary policy

| Counter arm | Counter HITs | Ordinary HITs | Net HIT/min | Cluster 95% CI | Descriptive classification |
|---|---:|---:|---:|---|---|
| unchanged | 1741 | 1923 | -0.56875 | [-0.921875, -0.203047] | neutralizes-within-margin |
| awareness | 1341 | 1562 | -0.690625 | [-0.9125, -0.46875] | neutralizes-within-margin |

The label neutralizes-within-margin means only that the cluster-CI lower endpoint meets the predeclared -1 HIT/min margin. Both observed net rates are negative; this does not establish equal performance or beating ordinary.

Both counter arms retain 250-ms perception, while ordinary retains its original 150-ms perception. Decisions remain 30 Hz and simulation 120 Hz. Arms share noise sample addresses within a seed/seat; scan-dependent aim speed changes noise magnitude, so realized aim errors need not match.

## Return HITs and offense cost

- RETURNING HIT reduction, unchanged minus awareness: 1.665625/min, 95% CI [1.4625, 1.86875]
- OUTBOUND HIT reduction, unchanged minus awareness: -0.5375/min, 95% CI [-0.821875, -0.25625]
- Total received HIT reduction, unchanged minus awareness: 1.128125/min, 95% CI [0.834375, 1.428125]
- Delivered HIT change, awareness minus unchanged: -1.25/min, 95% CI [-1.446875, -1.065625]
- Actual THROW rate change, awareness minus unchanged: -1.83125/min, 95% CI [-2.225, -1.440625]
- Actual RECALL_START rate change, awareness minus unchanged: -0.978125/min, 95% CI [-1.3, -0.65625]

The transparent net arithmetic is 1.665625 fewer RETURNING HITs/min minus 0.5375 more OUTBOUND HITs/min = 1.128125 fewer total received HITs/min. That is offset by 1.25 fewer delivered HITs/min, leaving -0.121875 net HIT/min. Return reduction alone does not establish an overall benefit.

The awareness arm withheld 91 base-proposed throw commands specifically during scans. Base-proposed throws/opportunities also fell from 10692 to 10200. The awareness arm issued 10109 throw commands and produced 10106 actual THROW events; the unchanged arm issued 10692 commands. These are distinct command/opportunity costs; changed trajectories also change later opportunities. The 91 withheld proposals cannot be equated with the 400 fewer delivered HITs.

Secondary intervals are descriptive and are not multiplicity-adjusted efficacy claims.

## Warning, scan and visibility process

| Process count | Unchanged (shadow awareness) | Awareness |
|---|---:|---:|
| Warning decisions | 94922 | 100254 |
| Warning episodes | 6490 | 9317 |
| Executed scans | 0 | 100254 |
| Exact certified movement overrides | 0 | 38781 |
| Scan-only decisions retaining uncertified base movement | 0 | 61473 |
| Delayed spear visibility after a warning episode | 2959 | 2139 |

unchanged: warning occupancy 16.478646% of full-bout time; delayed opponent-body visibility 99.99305% of decisions; mean motor sigma 0.044081 radians.

awareness: warning occupancy 17.403472% of full-bout time; delayed opponent-body visibility 83.117598% of decisions; mean motor sigma 0.049315 radians.

At awareness warning receipts, the evaluator's current enemy state was non-RETURNING in 53606/100254 cases (53.470186%). This is a current-state complement, not a false-recall-prediction rate: the warning makes no claim that an unseen recall actually occurred.

Scans use the single aim channel, and throws are withheld on those decisions. Mean executed-scan aim displacement was 2.350462 radians; the no-scan control's conditional mean and the between-arm difference are null, not zero. Certified movement overrides are exact and immediate; scan-only decisions retain the base movement without a new clearance certificate. Post-scan source visibility is recorded at scan receipt +2 simulation ticks, the first later source-grid sample. These process associations do not isolate scan causality or identify the same spear across resets.

## Integrity and scope

- Independent saved-evidence audit: PASS; 0 manipulation failures. All 128 raw journals and every recorded decision/arbitration/noise check reconcile; independent bootstrap reproduces the primary, both arms and all 41 secondary metrics
- Freeze identity: `356e9f22241dcd44429041eccc6680c7c0d31d3483ea6051eb7c3980f9f43343`
- Pre-match Git checkpoint: `58834179a6bc2efa62b208e33149e877b62cdade`
- Original 64 raw files, prior provenance files and protected/frozen source identities were verified before and after execution
- Raw preserves permitted source packets, delayed decisions, actual commands, assessment diagnostics, evaluator-only state, world events and exact HIT lineage; each completed gzip has compressed/uncompressed hashes and a durable checkpoint
- The earlier 64-bout result remains inconclusive under its own declared margin; this result does not release its conditional branches
- This estimates a combined engineered controller intervention, not awareness alone, prevented-hit counts, universal best response or human enjoyment
- No further experiment or rule/mind/default change is authorized by this report

## Exact report artifacts

- Completed independent review: [verification](../awareness-comparison-result-review-v1/VERIFICATION.json)
- The original sealed REPORT.json retains its historical pending-review status; this external report records the completed independent audit
- Independent verification SHA256: `be170ed86667c881e741580383544b121b201d28ea7e93df4c31ebe664d1c425`

- REPORT.json: SHA256 `87e62a7ebcb16358034087a118ddbe04e542ee0da6f7588ec1b2a6c2cdf2c774`
- RAW-MANIFEST.json: SHA256 `43574fb305e4b364375184865ea240b89e13b1e375bc05325b3a931c2b04ce4e`
- RUN-IDENTITY.json: SHA256 `f2732962804460e15ef6419e1e70e4c6688e26476595e3a79852ae57bf3c5c40`
