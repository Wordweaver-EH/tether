> Publication note (2026-10-03): This report is preserved from its reviewed checkpoint. Its publication status, next-step discussion, and test counts refer to that time. See [current checkpoint](../../CURRENT_STATUS.md) for current scope and evidence links.

# C1 legal visibility-gap probe: memory and attention effects, planner null

## Bottom line

Ordinary visible observations were selected and stored, then retrieved during two legally produced visibility gaps. Independently cutting memory writes or reads removed retrieval and changed actual emitted movement and gaze commands in both fixed seeds. A separate attention-delivery cut changed gaze in the first gap. The planner-delivery cut had no emitted-action effect, and attention delivery had no effect in the second gap. Those nulls remain part of the result.

This is a single externally generated legal sensor trajectory replayed to the controller, not autonomous closed-loop play. Candidate commands were recorded but did not determine its subsequent observations. The result establishes a narrow input-conditioned causal contribution, not successful gameplay, broad generalization, subjective experience, or completion of the whole C1/C2 milestone.

## Fixed scope and integrity

One four-second, 480-tick MODE_B tape; two fixed controller seeds (51041, 51047); eight prespecified arms per seed; exactly 16 evaluations, run once. The tape and its two real field-of-view gaps were verified using simulator/perception alone before any candidate outcomes. There were no visibility masks, edited percepts, content overrides, seeded memory, controller feature changes, or favorable-case retries.

All 16 evaluations completed. The frozen saved-record validator reported no failures. Its 187,530 individual record assertions are integrity checks, not independent behavioral tests. An independent raw audit verified all artifact hashes, same-arm earlier-write/root/time/parent/TTL lineage and projection arithmetic, and identical actual delayed-input streams within each seed. Both clean-restoration identities passed for inputs, emitted actions, native decision payloads and exposed final state.

Candidate source fingerprint: d490afd30119c0d6bfe03373055aeb21a797c6138f1ee744961988238b8948e7. Execution manifest SHA-256: 4aaa4c0a4a49afd6545cd1e46be9623192514ca1610315379cdbaf3d2349aebd. The separate arm-only amendment preserved the original sensor design and first preflight unchanged.

## All arm results

The following counts were identical in both seeds. Each gap contains 12 native hidden decision slots. All-tick differences use the entire 480-tick tape and compare with intact; windows overlap and must not be pooled as independent samples.

| Arm | Committed writes | Delivered reads, gap 1 / gap 2 | Hidden decision slots with different actions, gap 1 / gap 2 | Total different-action ticks |
|---|---:|---:|---:|---:|
| Intact | 90 | 12 / 12 | 0 / 0 | 0 |
| Memory-write cut | 0 | 0 / 0 | 12 / 12 | 104 |
| Memory-read cut | 90 | 0 / 0 | 12 / 12 | 104 |
| Memory-write reconnect | 54 | 0 / 12 | 12 / 0 | 52 |
| Memory-read reconnect | 90 | 6 / 12 | 7 / 0 | 28 |
| Restored from start | 90 | 12 / 12 | 0 / 0 | 0 |
| Attention-delivery cut | 90 | 12 / 12 | 7 / 0 | 28 |
| Planner-delivery cut | 90 | 12 / 12 | 0 / 0 | 0 |

Memory-write and memory-read cuts changed both movement components at 96 total ticks and both aim components at 104 ticks per seed. All 24 hidden decision slots changed movement and gaze. Throw and recall button values did not change. Attention-cut differences were gaze-only; memory encoding/retrieval remained intact. Planner-cut zero output effect is retained without treating receipt of a packet as demonstrated behavioral necessity.

## Causal lineage and effect size

The first memory-cut and attention-cut differences occurred at external tick 170 in both seeds. All earlier emitted actions and actual delayed sensory inputs matched, and the selected focus remained Hunt. Intact retrieval traced to ordinary observed evidence 36, committed at external tick 166. At the first hidden decision that evidence was 0.03333 seconds old, with 0.96667 seconds of TTL remaining. Read-cut retained ordinarily written, TTL-valid entries but delivered no read; write-cut had no entries. Blocked-read eligibility reconstructed from exposed snapshots is explicitly a derived check, not an unavailable native private diagnostic.

At the first attention divergence, selected packet plus planner and memory recipients matched intact, while attention delivery changed. This supports a separate attention effect at that boundary. Later trajectory differences are not all claimed to be immediate isolated effects.

Initial memory-cut differences were small: maximum absolute movement-component difference was about 0.00620 in seed 51041 and 0.00343 in seed 51047; maximum aim-component difference was about 0.000336. Later full-tape movement differences reached 1.06865 and 1.07588 in a component; maximum aim-component differences were 0.01370 and 0.00996. The attention cut's largest aim-component differences were 0.42800 and 0.35368. These are input-component magnitudes, not measured game benefit, probabilities, or angles.

## Ordinary restoration, not injected replacement

Both reconnect arms restored their boundary before tick 192 and exactly matched their respective continuing-cut histories before that point.

- Read reconnection exposed already ordinarily stored content: its first changed output versus the continuing read-cut arm was tick 194, and it delivered six reads in the remainder of gap 1 plus all 12 in gap 2. Early state history was not erased; one additional first-gap output difference from intact remained
- Write reconnection could not recreate missed history during gap 1. It made 54 later ordinary observed writes and delivered all 12 second-gap reads. Its first changed output versus the continuing write-cut arm was tick 350
- Both reconnect arms matched intact at every second-gap hidden decision slot. The separate enabled-from-start control reproduced intact throughout

## Limits and next decision

Both seeds shared one sensor trajectory and are controller-randomness checks, not independent worlds. Exogenous ego motion/spear state can disagree with unexecuted candidate commands. This probe does not establish that the candidate's own actions naturally generate a useful disappearance/reacquisition loop, nor that memory or attention improves task outcomes. It also does not resolve the genuine planner-delivery null or the missing native pending-recall-plan invalidation witness.

The previous ordinary-experience C2 panel remains unchanged: monitor feedback/control affected gaze, with no forecasting-accuracy benefit and no episodic-read opportunity in that panel. This targeted probe is a separate preregistration, not a replacement or pooled success score.

A next proposal may use fixed natural closed-loop episodes in which actual emitted commands determine later ordinary observations. That requires a separately frozen and reviewed protocol; there is no authorization here to search outcomes for favorable fixtures or change the candidate.

Source is durably backed up. This protocol and result are retained in read-only local archive copies with the disclosed same-environment durability limit; neither new protocol nor results have been publicly published.
