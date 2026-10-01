Phase 2 is built and committed as `ee086fa`. The working tree is clean, and **all 63 tests pass**.

The [mind](C:/arcx/games/tether/src/mind/index.mjs) runs a 30 Hz cycle with delayed percepts, particle and spear beliefs, six specialists, workspace competition, gaze and movement planning, confidence gates, and per-cycle traces. The [arena](C:/arcx/games/tether/arena/README.md) runs perception-only agents through a generic game and adapter contract. `snapshotWorld` and `restoreWorld` are in the sim contract.

Two CPU tournaments ran **8,432 full bouts each**, across both modes. Each key pairing has 384 bouts across modes. The full [report](C:/arcx/games/tether/reports/phase2-tournament.md) includes pairwise 95% CIs, margins, behavior metrics, and before/after data. Tuned normal-mind win rates were:

| Opponent | Win rate, 95% CI |
| --- | ---: |
| spearRusher | 57.6% (52.6–62.4) |
| camper | 35.2% (30.5–40.1) |
| spinner | 13.3% (10.2–17.0) |
| immediateRecaller | 2.9% (1.6–5.1) |
| directShooter | 0.5% (0.1–1.9) |

Tuning diagonal approaches, wall-aware orbit reversals, close-range retreat, threat handling, and unseen flanking improved several matchups. The mind remains **too vulnerable to simple shooting and immediate recall**. ImmediateRecaller beat embedWaiter in all 384 direct bouts. The tuned mind produced the defined second-location pattern on 72.1% of its embeds.

The ablations are mixed: the full mind beat `singleUtility` and `noAttentionSchema` clearly, while `noWorkspace` and `noHysteresis` beat the full mind. `noMetacog` showed no measured win effect; prediction and belief did not help the tuned policy in these pairings. These are honest negatives, not completed indicator claims.

Reusable work is the arena runner, workers, paired comparison, replay and trace plumbing, and snapshot contract. Tether-specific work is in the adapter, strategies, tactical mind, and behavior metrics. Tooling I wished for: live tournament progress and memory reporting, a CPU trace inspector, and automatic source-hash provenance for reports. Next I would build the human client and Mind View, then use owner playtests to judge readability and tune the remaining exploits.