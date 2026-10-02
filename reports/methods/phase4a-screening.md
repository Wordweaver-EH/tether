# Preliminary physics screening

These are exploratory candidate screens, not the final Phase 4 verdict. The frozen source uses Mind v1 and the new deterministic arithmetic, prior to the final fully balanced training scheduler. All held-out evaluations are crossed independently across mode and seat. Source and evaluation code were unchanged during all six runs.

## Protocol

- Two ES generations and two coevolution generations per condition; 20-second training bouts
- Two held-out seeds, each crossed with Mode A/B and P1/P2; 30-second validation bouts
- Four workers; 550 bouts per condition; 3,300 bouts total
- Seed-cluster percentile bootstrap intervals describe win points (wins + half draws); with only two clusters these are low-power descriptions, not population certainty
- Physics defaults remain unchanged. Overrides are not adopted
- The v1 mind assumes default projectile speeds. Its altered-speed results are fixed-controller robustness measurements, not a fair condition-aware mind comparison

## Results

| Condition | Selected finalist | Validation win points (95% interval) | Outbound hit share | Second-location events |
|---|---|---:|---:|---:|
| baseline | es-4 | 73.1% (66.3%–79.8%) | 82.2% | 0 |
| recall8 | coevo-10 | 68.8% (67.3%–70.2%) | 89.5% | 0 |
| recall6 | coevo-16 | 62.0% (61.5%–62.5%) | 79.9% | 0 |
| outbound8 | coevo-16 | 72.1% (67.3%–76.9%) | 76.3% | 0 |
| move5 | es-8 | 70.2% (70.2%–70.2%) | 73.9% | 0 |
| turn270 | coevo-14 | 75.0% (72.1%–77.9%) | 79.7% | 0 |

The best finalist is selected using these same validation points, so these estimates are selection-biased. They are not an unbiased estimate of a selected policy on an unseen population.

All 18 finalists recorded zero second-location events. Embeds per throw were often high, but these can be missed direct shots that are immediately recalled; this does not demonstrate persistent-anchor tactics. Lower outbound-hit share also does not, by itself, establish better game balance.

No repair earns adoption from these results. Ranking by the one limited proxy of lower direct-hit share places move5 first, then outbound8, turn270/recall6, baseline, and recall8; this is only a prioritization for future experiments and not a ranking of fun, fairness, or strategic richness. No human readability/playability conclusion was measured.

## Provenance

Total wall time: 226.681 seconds across six sequential conditions.

All six source digests: `7c4ec14becacb6c7c706069c05f6653e309d65428d6ebe59351d8b29c09ce100`.

Each `phase4a-screen-<condition>.json` contains the configuration, complete source-file SHA256 manifest, interpreted policies, per-opponent and per-mode validation, and unchanged-source verification. Exact snapshot: `phase4a-v1-source.tar.gz` with adjacent SHA256 file. Superseded diagnostic runs are kept separately and must not be pooled with this evidence.

These screens do not prove that a dominant strategy exists or that no useful anchor strategy can be learned. The definitive baseline and independently selected-policy confirmation use the final Mind v2 snapshot and full 300-second bouts.
