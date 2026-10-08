# Integrated Cover v2: defensive action arbitration repair

The optional Integrated mind now preserves immediate spear recovery while dodging.
This fixes a concrete action conflict. It did **not** improve scoring in the fixed
fresh comparison: both v1 and repaired scored **19–49** against the baseline, and
all eight paired bout scores were unchanged.

The original [v1 characterization](COVER_INTEGRATED.md), protocol and results remain
intact. This report is a separate, bounded repair result, not a retuned replacement.

## What changed, and what did not

The v1 reflex supplied dodge movement and a gaze proposal but discarded its own
embedded-spear recovery intention. Recall is a separate control in the simulation;
it does not require sacrificing that defensive movement or gaze.

The repair carries the existing immediate-recovery intention into defensive action.
An already eligible visible-target shot may also survive defense, but only if the
final pre-noise aim, facing and clear line are compatible with the opponent in the
currently received delayed percept. The guard runs after attention selects gaze.
It does not invent a shot from a spear, a remembered target or privileged world data.

Reflex movement/gaze proposals, danger thresholds, workspace priorities, routes,
150 ms full-percept delay, 30 Hz decisions and the common seeded motor-noise wrapper
are unchanged. Attention can still redirect the reflex gaze proposal; the final
pre-noise aim is checked separately. Noise can still make the actual command miss.

The trace and Mind View distinguish movement source, weapon intention, guard result,
completed rollout, issued pre-noise action and actual post-noise command. A completed
rollout is not labeled executed when attention redirects its target or no weapon
command is issued. Reflex recovery remains tier 0 with no completed-plan credit.
Tactical score-credit learning stays disabled, and the route cache remains an
engineered session-only convenience.

Only the optional integrated controller changes. Duel, Existing Cover and the
baseline remain unchanged. Replay recognizes both v1 and v2 controller metadata.

## Verification before scores

- **330/330** application and delivery tests passed
- Nine repair fixtures cover mirrored real recall during defense, low budget,
  recovery without repeated button presses, ring resumption, compatible shots,
  incompatible final aim, actual attention redirection, stale/hidden/occluded
  targets, and rollout-versus-execution labeling
- The mirrored scripted bait/recovery sequence generates real RECALL_START events,
  finishes recovery and resumes objective movement without using points as its
  success criterion. It is a software behavior probe, not a human-readability test
- **4,800 ticks** preserve default Duel and Existing Cover inputs, traces, memory,
  cognition and settings exactly against unmodified v1
- **12 matched defensive fixtures** preserve v1 movement and final aim exactly
- Independent review passed **28 affected tests** and approved source before scores

Initial fixture mistakes were corrected before the final tests: attention can
redirect a reflex gaze proposal, and RECALL_START identifies the owner with the
`owner` field. Review also corrected the gaze-source wording and extended replay
metadata recognition to v2. These were pre-score fixes; no policy was adjusted
following the comparison.

## Fixed fresh comparison

The [protocol](benchmark/cover-arbitration-v2/PROTOCOL.md), runner and tested source
were published before the run at commit
`d767e9bd3be604791a5b7f2b61f8c86bad9e1f42`. Reference v1 was commit
`97cbc63a78f9a9d543f25d582e4078c4c9910ef2`.

Four fixed fresh seeds, both seats, Mode B, 30 seconds each, v1 and repaired against
the unchanged baseline: **eight paired groups, 16 bouts**. There were no extra seeds
or outcome-driven edits. Scores below are integrated-side points : baseline points.

| Seed | Integrated seat | v1 | Repaired |
| --- | --- | --- | --- |
| 1237 | P1 | 4:6 | 4:6 |
| 1237 | P2 | 2:6 | 2:6 |
| 2081 | P1 | 5:4 | 5:4 |
| 2081 | P2 | 2:6 | 2:6 |
| 3253 | P1 | 1:8 | 1:8 |
| 3253 | P2 | 4:4 | 4:4 |
| 4447 | P1 | 0:10 | 0:10 |
| 4447 | P2 | 1:5 | 1:5 |

Both conditions issued **26 throw commands and 11 recall commands**; the simulation
accepted **26 THROW and 10 RECALL_START events** each. Command counts and actual
weapon starts are distinct because decisions use delayed percepts/private spear
estimates. All points came from spear hits; neither side earned a ring point.

Seven pairs preserve the entire command stream and final world exactly. The only
changed pair, seed 4447/P2, first diverges at **27.050 s**: dodge and both pre-/post-noise
aim are identical, while repaired recalls and v1 withholds it during reflex. A real
RECALL_START occurs immediately; v1 recalls at **27.083 s**, one decision cycle later.
Both return to Objective and score the same returning-spear hit. Later trajectories
diverge, so this single event does not establish an overall combat advantage.

| Measure, eight bouts per condition | v1 | Repaired |
| --- | ---: | ---: |
| Decisions | 7,168 | 7,168 |
| Defensive decisions | 462 | 457 |
| Defensive embedded-spear decisions | 3 | 2 |
| Defensive embedded decisions withholding recall | 1 | 0 |
| Defensive throw commands | 2 | 1 |
| Defensive recall commands | 2 | 2 |
| Planning attempts | 213 | 212 |
| Completed / unfinished requests | 151 / 62 | 149 / 63 |
| Declared logical work units | 811,624 | 811,592 |

The new final-aim incompatibility rejection is demonstrated by fixtures, but no
fresh-bout decision exercised that specific rejection. The repaired defensive
checks recorded 435 cases without a shot intention, 21 facing rejections and one
allowed shot. This matrix barely exposes the recovery conflict; it cannot establish
broad strength or robust counterplay. Maximum decision work was 180 against a cap
of 192. All 16 bouts had zero tactical learning updates and learned automatic actions.

## Evidence and reproduction

The retained compact logs include every paired command and simulation event for
**57,600 steps**, and all **14,336 decisions** with their delayed public percept,
pre-noise input, post-noise command, intention, guard and planning evidence. Initial
and final worlds, per-second world hashes, source hashes and score ledgers are also
retained. Full per-step privileged snapshots and particle arrays are omitted; the
world trajectory is reconstructible from the initial state and complete commands.

All 16 logs were replayed through the simulator: every event, per-second hash and
final world matched exactly. Independent review also reconciled logs, input hashes,
score ledgers, source identities, focus, budget and defensive-action counts.

Raw-data publication was canceled. The complete logs and reassembly/hash manifest
remain in local workspace checkpoints; no remote raw backup or downloadable raw
archive is confirmed. Publication was stopped without another route or retry. The
small [summary](benchmark/cover-arbitration-v2/verification/summary.json) and
[replay audit](benchmark/cover-arbitration-v2/verification/log-audit.json) are included
with this report. The unchanged historical v1 evidence remains in its existing location.

To reproduce, use separate checkouts of the two named source commits. Run
`node benchmark/cover-arbitration-v2/verify.mjs /path/to/v1`, then
`node benchmark/cover-arbitration-v2/run.mjs /path/to/v1 /new/output/directory d767e9bd3be604791a5b7f2b61f8c86bad9e1f42`.
The runner validates reference/source identities and refuses to overwrite an output
directory. Use `node --test test/*.test.mjs delivery-tests/*.test.mjs` for the suite.

This repair is complete. No browser play, human engagement, subjective experience,
new architecture, learned strategy or consciousness result is claimed. No further
performance search or policy tuning was performed.
