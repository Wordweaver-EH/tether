# Independent review: Tether returning-HIT diagnosis

## Verdict

**Pass for the bounded, descriptive posthoc claim.** The sealed report's headline counts and reconstruction are supported by the frozen source and saved evidence. No blocking discrepancy remains. This review preserves the original **inconclusive** practical-margin classification and does not authorize fresh matches, tuning, or a conditional follow-on branch.

The final reviewed version has **1,094/1,178 counter spears HELD at collision (92.87%)** and **seven** analysis-only unit tests. Earlier development versions had 1,093 and six tests. The final recall landmark uses post-turn, pre-movement facing, separately from the pre-step facing used for decision-source packets.

## Independently established results

- All 64 raw-file hashes passed; the reproduced analysis verified all 51 protected/frozen source entries
- A fresh analysis run reproduced all five `results-final/` files **byte-for-byte**
- All seven standalone analysis tests and the separate Python raw-aggregation, timing, lineage, and attack-link validator passed
- An additional independent audit reconstructed facing from saved motor commands and RETURNING positions directly from recorded recall lineages, using a closed-form trajectory instead of the original analyzer's iterative spear-state reconstruction
- That audit checked 257,990 RETURNING source-frame geometries, all 22,981 recall landmarks, all 1,685 returning-HIT rows, and the event-order-dependent victim spear state at every returning collision
- Facing matched all **49,031** recorded throw/recall checkpoints exactly; all **181,876** RETURNING counter threat checks matched the saved diagnostics, with **100,899** visible source frames and **zero** positive returning-threat diagnostics
- Ordinary's **1,178** returning HITs had zero visible RETURNING spear samples at any decision-source frame through impact, including frames arriving too late. All 1,178 had rear arrival-origin directions relative to the victim's post-turn facing
- **44** hits were under 250 ms after recall; **48** occurred before any post-recall source packet could arrive; **1,130** had packet timing opportunity. Opportunity alone does not establish enough time or space to evade

The independent geometry audit used a normalized cosine visibility test rather than the analyzer's squared-dot implementation. The nearest tested cone-boundary margin was 0.0000121295 in cosine units; independently computed recorded bearing dots differed by at most 4.33e-15. Thus the visibility agreement is not explained by numerically borderline classifications.

## Timing and event-order review

The saved runner requests perception before each step. Both interfaces consume source ticks 0, 4, 8, …, with receipt offsets of 30 ticks for the counter and 18 for ordinary. A source sample on the recall tick precedes the recall transition and cannot show RETURNING. The first eligible source frame is the next strictly later multiple of four. A received command can act before the collision in that same tick, so receipt tick equal to impact tick correctly counts as available.

The facing update matches the frozen 120-Hz turn cap, aim deadzone, normalization, and counterclockwise half-turn tie. Saved commands already include motor transformation. Commands continue across resets as in the interfaces, while the game restores facing before the next pre-step observation. All 3,705 resets are applied.

Return direction is fixed toward the recorded recall-start target, with speed 12; no homing or obstacle occlusion is introduced. Source-frame body positions come from raw pre-step measurements. Trajectories terminate on logged completion, neutralization, or reset events. The source resolves neutralization before both spear sweeps and P1's sweep before P2's; the final victim-state helper correctly accounts for the observed same-tick transition. There were no zero-length recalls in these inputs.

## What is exact, reconstructed, and inferred

**Directly logged or exact arithmetic over saved records:** event phases, tick indices, hit/recall lineage, saved commands and diagnostics, sampled body positions, counts, packet-grid timing, and aggregation. Within-tick impact fractions are measurement-derived values in the original saved data; this review checks their consistency without rerunning collisions.

**Deterministically reconstructed, conditional on the frozen source/runtime identity:** intermediate facing, RETURNING spear positions, percept visibility at decision-source frames, recall landmark visibility, rear-arrival orientation, and state at collision. Their agreement is strong, but received percept packets were not directly logged. Neither hashes nor these checks prove the historical runtime executed those source bytes.

**Mechanistic interpretation:** those hit trajectories were excluded by the visible-spear input gate, so the visible-return threat branch did not receive them. This supports a blind-side awareness diagnosis for these saved failures. It does not show that a replacement detector would prevent them, that projection speed or thresholds caused them, or that reducing punishment attacks improves outcomes. The attack associations remain posthoc and endogenous.

Zero positive returning-threat checks also limit the validation: agreement with saved diagnostics establishes the negative gates in this dataset, not the success or correctness of an exercised positive returning-threat dodge. Visibility between the four-tick decision-source frames was not reconstructed and is not needed for the stated packet-availability claim.

## Reproduction and scope

From the original study directory:

```sh
node review-returning-v1/independent-audit.mjs . posthoc-returning-v1/results-final
```

The reviewed package's README gives its separate full reproduction commands. Review outputs are `INDEPENDENT-AUDIT.json`, `REPRODUCED-UNIT-TESTS.txt`, `REPRODUCED-PYTHON-VALIDATION.json`, and `REPRODUCTION-VERIFICATION.json`. The independent audit imports only frozen deterministic arithmetic from original code, never the simulator or controller.

No gameplay, controller calls, game preflight tests, rule/mind edits, or Git writes occurred in this review. Only audit scripts, analysis outputs, and this report were created. Original inputs and the sealed diagnosis package were not modified by the reviewer.

## Reviewed identities

- Publication manifest SHA256: `b4fd5e020b03a16ee8191da54a96600545e9cb6ad8aa84aafa935c7cf82be4ff`
- Public report SHA256: `ed43e5f52f94057af5df2638de114e0c5ac1e0f5a6cce08da32232f01e0cd00d`
- Final summary SHA256: `87aff741282f6171ffe58c0a287f0ab9a8752ca7deef4adb8f52ef1458c9a3d1`
- Source freeze identity: `c79bcbd5dbf1f672b52f9c973c1c57c6c2432ed8c5df28ceaaad7177c71eda49`
