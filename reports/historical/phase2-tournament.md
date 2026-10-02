# Phase 2: mind v1 tournament

## Method

The baseline and tuned policies each play a full round robin: three mind difficulties, eight one-at-a-time ablations of the normal mind, and six perception-only scripted strategies. Every bout lasts the full 300 seconds. Both Mode A and Mode B are run. There are eight seeded bouts per ordinary pair per mode and 192 per key pair per mode (all normal-mind pairings and immediateRecaller versus embedWaiter), with seats alternating. This is 8,432 bouts per policy. Key pairs have 384 bouts across modes; their Wilson 95% win-rate intervals have about a five-point worst-case half-width. Per-mode intervals are wider. Ties count as half a win. These are seeded-agent sampling intervals, not estimates of human playtest results.

The two runs use the same seeds, strategy scripts, sim, perception filter, metric adapter, and bout matrix. The only policy changes are in `src/mind`: the tuned version approaches diagonally, reverses orbit before an arena wall, backs away inside five units, treats a visibly aimed held spear as a threat, includes belief entropy in Search, and lets Deceive flank while its own spear is embedded. The baseline policy is still executable via `createMind({policy:'baseline'})` or `arena/tournament.mjs --policy baseline`.

The Tether adapter defines a **second-location embed** as one left in place for more than two seconds before recall, neutralization, reset, or bout end, during which its owner travels at least two units of path and gets at least one unit from its body position at embed time. The denominator is all embeds. A reset teleport is excluded from path length and facing reversals. Look-away time uses the physical 120-degree cone in both modes. A hit-after-look-away is a hit within one second after the victim's opponent leaves that cone. Scan reversals are facing turn-sign changes at least 0.15 seconds apart. Neutralizations are credited to the player who performs them. Recall delays run from EMBED to RECALL_START.

The generated [before summary](phase2-before.md), [after summary](phase2-after.md), and corresponding `.json` files contain the complete pairwise tables and per-bout scores and behavior aggregates. The JSON has the exact run settings, numeric mind difficulty settings, and metric version `tether-phase2-v1-reset-safe`. Pairwise comparisons below are the primary evidence; overall win rates mix different opponent weights and are less informative.

Both tournaments ran on CPU with eight worker threads, taking 473.4 s and 480.5 s respectively. A separate unlogged, one-core 20-bout headless benchmark of the tuned normal mind versus immediateRecaller averaged 0.508 s per 300-second bout (70,829 sim ticks/s). Trace capture is off in both measurements.

## Tuning and scope

The first prototype tournament exposed a scripted-opponent error: `embedWaiter` fired through the spawn opponent before reaching a wall. The strategy was corrected to fire vertically into geometry, and **both** reported policy runs use that corrected script. The first prototype results were discarded. A later audit found that a scoring reset was being counted as travel and a facing reversal. The metric adapter was fixed and both reported runs use the corrected metric. Neither issue changed the simulation rules.

The v1 mind uses only copied percepts and 120 Hz legal inputs. It has a 30 Hz cognitive cycle, 48-particle opponent belief, remembered spear belief, negative cone evidence, six specialists, one-focus workspace, delayed perception, noisy bounded aim, confidence gates, gaze refresh scheduling, a simple opponent-cone model, affect, percept-derived memory, belief-based recall counterfactual notes, and transition-only inner speech. Phase 4 still needs policy learning, calibrated confidence over many opponents, richer counterfactual branches, and human results.

## Hostile strategies and beatability

The table reports the **normal mind's** win rate against each fixed strategy across both modes. All entries have 384 bouts. Positive margins favor the mind.

| Opponent | Baseline win rate (95% CI) | Tuned win rate (95% CI) | Tuned mean score margin |
| --- | ---: | ---: | ---: |
| immediateRecaller | 1.8% (0.9–3.7) | 2.9% (1.6–5.1) | -12.59 |
| camper | 0.0% (0.0–1.0) | 35.2% (30.5–40.1) | -4.32 |
| spinner | 0.0% (0.0–1.0) | 13.3% (10.2–17.0) | -5.66 |
| spearRusher | 22.4% (18.5–26.8) | 57.6% (52.6–62.4) | +11.17 |
| directShooter | 0.0% (0.0–1.0) | 0.5% (0.1–1.9) | -22.48 |
| embedWaiter | 100.0% (99.0–100.0) | 99.9% (98.8–100.0) | +11.99 |

**No single script wins every script-versus-script pairing**, but camper and directShooter are very strong, and the normal mind is far too vulnerable to immediateRecaller and directShooter. Script-versus-script pairs outside the key set have only 16 bouts across modes, so this is a hostile-pass signal rather than a firm ranking. The mind is plainly beatable by a simple strategy; against directShooter it won only 2 of 384 bouts. This is currently an exploit to fix, not evidence of good human-facing difficulty.

**Immediate recall beats deliberate embed-and-wait** in all 384 direct bouts: immediateRecaller's win rate is 100.0% (Wilson 95% CI 99.0–100.0), with a mean margin of +371 points. The geometry-first embedWaiter is a weak policy against rapid direct throws. This does not refute the second-location hypothesis for all play: the full mind uses delayed embeds and positional play much more often than the fixed waiter does.

## Ablation audit

The table reports the **full normal mind's** head-to-head win rate against each ablation (384 bouts each) and its tuned mean score margin. A value below 50% means the ablation wins more often.

| Ablation | Baseline full-mind win rate (95% CI) | Tuned full-mind win rate (95% CI) | Tuned margin | Reading |
| --- | ---: | ---: | ---: | --- |
| noBelief | 56.9% (51.9–61.8) | 45.7% (40.8–50.7) | -0.22 | Baseline benefit; tuned result is negative or unresolved. |
| noPrediction | 48.3% (43.4–53.3) | 45.7% (40.8–50.7) | -0.38 | No measured benefit from motion prediction. |
| singleUtility | 98.3% (96.5–99.2) | 99.6% (98.3–99.9) | +20.39 | Specialists are strongly load-bearing. |
| noWorkspace | 27.9% (23.6–32.6) | 25.1% (21.1–29.7) | -2.48 | The one-focus bottleneck currently hurts. |
| noHysteresis | 33.2% (28.7–38.1) | 28.8% (24.5–33.5) | -2.27 | Current focus holding hurts. |
| noMetacog | 50.0% (45.0–55.0) | 50.1% (45.2–55.1) | +0.01 | Honest null: the confidence gate has no measured win effect here. |
| noAttentionSchema | 100.0% (99.0–100.0) | 75.7% (71.1–79.7) | +11.15 | Gaze refresh scheduling matters. |
| noToM | 50.4% (45.4–55.4) | 54.6% (49.6–59.5) | +0.43 | Deceive now ignites, but the win effect remains uncertain. |

**The full mind does not beat every ablation.** The most important negatives are noWorkspace and noHysteresis: independent outputs and rapid switching outperform this workspace policy. In Mode B, the tuned mind wins 100% against noAttentionSchema but only 40.1% against noBelief and 39.1% against noWorkspace. In Mode A, the noAttentionSchema pairing is about even (51.3%). The indicator mechanisms exist and are visible in traces; the audit counts only the specialists and attention schedule as clearly useful at this policy version. Belief, prediction, metacognition, and ToM need better calibration or tasks that expose their value. This is a functional audit, not a claim about phenomenal experience.

## Tuning effect

The paired comparison matches each seed, seat, opponent, and mode before and after. The following are changes in the normal mind's win rate; intervals are descriptive paired 95% intervals.

| Opponent | Paired win-rate change | Mean margin before → after |
| --- | ---: | ---: |
| camper | +35.2 pp (30.5 to 39.8) | -75.95 → -4.32 |
| spinner | +13.3 pp (10.0 to 16.5) | -112.05 → -5.66 |
| spearRusher | +35.2 pp (29.8 to 40.5) | -10.37 → +11.17 |
| immediateRecaller | +1.0 pp (-1.0 to 3.1) | -106.19 → -12.59 |
| directShooter | +0.5 pp (-0.1 to 1.1) | -128.98 → -22.48 |
| embedWaiter | -0.1 pp (-0.4 to 0.1) | +93.46 → +11.99 |

Defensive orbiting and wall reversals made the mind less trapped and narrowed the large score deficits. They did not solve immediate or direct shooting. The tuned policy also spends more time using its anchor: second-location embeds rose from 46.5% to 72.1% of its embeds, and median embed-to-recall delay rose from 2.94 s to 8.18 s. These long anchors are measurable, though a large share terminate at the current eight-second recall threshold rather than a crossing opportunity.

## Mode A versus B

The tuned normal mind's behavior differs by mode. The values below aggregate the same pair matrix in each mode; look-away is geometric in both, even though Mode A still reveals all objects to the agent.

| Metric | Mode A | Mode B |
| --- | ---: | ---: |
| Second-location fraction of embeds | 72.9% | 71.4% |
| Neutralizations performed per bout | 0.056 | 0.066 |
| Time opponent outside physical cone | 7.0% | 1.1% |
| Scan reversals per minute | 268.3 | 289.1 |
| Hits taken within 1 s of look-away, per bout | 3.95 | 0.96 |

Mode B **changes gaze and look-away behavior**, but the tuned second-location fraction is similar across modes. The baseline had a larger Mode B effect on that pattern (37.6% in A, 57.9% in B). Hit-after-look-away counts are also affected by each mode's total scoring rate; they should not be read as a risk probability without that denominator. The reversal metric counts small aim corrections as well as deliberate sweeps, so a smoothed gaze-turn metric is needed before making a strong claim about scan spam.

## Limits and next work

- The mind is measurable but not yet a reliably fun or fair opponent. Direct shooting and immediate recall remain dominant exploits against it; the scripted embed waiter is itself exploitable. The 8-bout non-key pairings are exploratory, and there are no owner playtests or human-behavior proxies yet.
- The tuned belief and prediction paths sometimes underperform their ablations, especially in Mode B. The workspace bottleneck and hysteresis also reduce win rate. Next policy work should calibrate motion after occluded intervals, adjust focus switching around incoming shots, and run targeted exploit search against direct shooters without changing `SPEC.md`.
- Phase 3 should build the human-versus-NPC client and Mind View from the replayed world and trace. Human sessions can then test readability, voluntary rematches, and whether delayed anchors create meaningful decisions. Phase 4 can use those logs for cross-bout memory learning, calibrated metacognition, and snapshot-based counterfactual policy updates.
- The sim rules were unchanged. The only bugs found were in the first strategy prototype and the tournament metric adapter; both were fixed with tests before the reported runs. The baseline policy remains executable, and a rerun after the metric fix reproduced the entire earlier score vector exactly, confirming that the metric fix changed no bout scores.
