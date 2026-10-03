# Human-proxy counterplay: independently audited v1 result

## Conclusion

**Inconclusive under the predeclared practical margin.** The human-paced counter scored 1,728 physical HITs and ordinary scored 1,977 across 64 five-minute bouts (320 simulated minutes). Counter net rate was **−0.778125 HIT/min**, with seat-paired cluster-bootstrap 95% CI **[−1.196875, −0.375]**. Counter won 18 bouts, tied 2 and lost 44. Gross rates were 5.4 versus 6.178125 HIT/min.

The interval is below zero but crosses the predeclared −1 HIT/min practical boundary. It therefore establishes neither counter noninferiority nor ordinary dominance under that protocol. Neither conditional follow-on branch is released. This does not establish human fun, universal best response, or game-rule failure.

## Frozen comparison

- Exactly 32 new controller-seed clusters, both seats, default MODE_B rules; 120-Hz simulation and 30-Hz decisions
- Counter receives 250-ms-old packets; ordinary receives 150-ms-old packets. This disadvantages the counter in latency and must remain explicit
- Same canonical percept fields and motor/noise functions; same noise model does not mean identical realized aim errors because aim speed and seat addressing differ
- Frozen spacing targets: 5.25 center units when enemy spear is armed/unknown and 4.5 in supported-away windows
- No outcome tuning, reruns, controller execution, rule changes, mind changes, or Git writes were performed by this audit

## Manipulation and integrity

All 64 raw-file SHA256 checks, 20 frozen-file checks and 31 protected source checks passed. Independently reconstructed counts match every final score. All recorded counter/ordinary packet ages and decision cadences passed. There were 10,735 supported aligned punishment throws, all linked to issued commands, and 30,293 threatened-spear decisions. Frozen source routes each threat through a lateral dodge; saved summaries report 30,293 dodges. No structural manipulation failures were found. This is a behavioral implementation check, not proof that each dodge succeeds.

## HIT geometry

All 3,705 HIT records were checked against original pre-reset HIT positions and original THROW lineage; returning HITs retain RECALL_START lineage. Launch and impact distances below are player-center separations in game/world units. Projectile origin and travel displacement are separately retained in the review JSON. Each row is median [Q1, Q3], followed by P10–P90.

| Side / phase | HITs | Launch center distance | Impact center distance |
|---|---:|---|---|
| counter / all | 1728 | 5.032 [4.828, 5.687]; 4.660–6.164 | 5.084 [4.705, 5.564]; 4.548–6.302 |
| counter / OUTBOUND | 1221 | 4.941 [4.766, 5.208]; 4.631–5.674 | 4.910 [4.635, 5.160]; 4.512–5.482 |
| counter / RETURNING | 507 | 5.787 [5.379, 6.234]; 4.898–9.035 | 5.966 [5.317, 6.379]; 5.055–6.822 |
| ordinary / all | 1977 | 6.140 [5.609, 6.575]; 5.307–7.401 | 5.738 [5.289, 6.218]; 4.944–6.608 |
| ordinary / OUTBOUND | 799 | 5.929 [5.405, 6.476]; 5.161–6.742 | 6.123 [5.015, 6.547]; 4.828–6.931 |
| ordinary / RETURNING | 1178 | 6.224 [5.763, 6.668]; 5.482–11.000 | 5.673 [5.386, 5.924]; 5.155–6.264 |

Full phase-split quantiles and distance bins (<2, 2–4, 4–5.25, ≥5.25) are in INDEPENDENT-RESULT-REVIEW-v1.json.

## Cornering

Cornering means no collision-free one-unit retreat direction among 32 sampled headings, opponent within 5.25 units, and largest free heading arc ≤π. Body radius is 0.35 units; arena is [−8,8] × [−5,5]. Expanded obstacles and inset bounds are used. Near-wall proximity alone is not cornering. This is a sampled straight-displacement definition, not a proof that all escape paths are blocked.

- counter: pressured-cornered 3.866667 s / 19,200 s (0.020139%); 14 episodes, 0 lasting ≥0.5 s; exits movement 8, hit/reset 6, termination 0; HITs delivered/received while cornered 6/0

- ordinary: pressured-cornered 3507.400000 s / 19,200 s (18.267708%); 7603 episodes, 2533 lasting ≥0.5 s; exits movement 6017, hit/reset 1576, termination 10; HITs delivered/received while cornered 460/1112

Occupancy is approximate 30-Hz pre-step sampling representing the following four ticks. HIT cornering uses exact pre-reset event geometry. All HIT-side geometry plus all representative audit states were independently recomputed (8,452 checks); time occupancy was independently aggregated from saved sample labels.

## Audit boundaries and publication

Saved logs report 314 passing preflight tests; this review did not rerun tests or matches. The source checkpoint is 854b173a8aedd0ba38f604985cdc16bb390155e4, supported by the prior VERIFIED receipt. This review checks saved source bytes and receipt identity but does not independently re-query the remote Git server. No result publication has been performed by this auditor.

Freeze identity: c79bcbd5dbf1f672b52f9c973c1c57c6c2432ed8c5df28ceaaad7177c71eda49

### Exact SHA256 hashes

- primary-v1/REPORT.json: 59b2657dfb12dda406977d00a4f8529d157a960a9296851efa40d2da0b3e720d
- primary-v1/RAW-MANIFEST.json: 428a4e96d7813ffa3604e28cff4230b799406b78a6f0c9e52c81e51d3fc48ce0
- primary-v1/RUN-IDENTITY.json: eabe2742d32827939b83f7d031900ae43642827f26137ca6ef3c4f3a5a65d9d7
- PROTOCOL-PROPOSAL.md: 704562f5d954f2ab602594239e1a01d273d715267a3c4e03ce0b4fe2cca7b370
- GIT-CHECKPOINT-RECEIPT.json: b7bca197520b59f07ba8fcc83051cda232498e764ae34ff0ae0b981dc0e2e038
- repo/human-proxy/FREEZE.json: d9abd3db7056b63c80175e4315368bc51e4d93fb94cc6afbda952db745ff5ca2
- audit_saved_v1.py: 4842fbc81089fefcc6843b4f46f30af27b0a84b79fa2ac7b92e1a78fdba38b6a

The original REPORT.json remains unchanged and retains its historical pending-review status. INDEPENDENT-RESULT-REVIEW-v1.json is the completed independent review, with zero failures.
