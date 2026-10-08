# Independent review: defensive action arbitration repair

## Disposition

Approved as a bounded, optional Integrated Cover control-conflict repair. The
fixtures establish compatible recovery and shot handling without changing defensive
movement. The fresh paired bouts establish no scoring improvement. This remains a
weak combat opponent; human engagement, human-readable counterplay, general strength
and learned tactical competence are unverified.

## Evaluated scope and provenance

- Evaluated source checkpoint recorded by the run:
  `d767e9bd3be604791a5b7f2b61f8c86bad9e1f42`
- Published v1 reference: `97cbc63a78f9a9d543f25d582e4078c4c9910ef2`
- Fixed comparison: seeds 1237, 2081, 3253 and 4447; both seats; v1 and repaired
  Integrated each against unchanged baseline; Mode B; 30 seconds; 16 bouts
- Independently matched all 42 current-source/protocol/runner/test hashes and all
  34 reference-source hashes against the pre-run and final receipts
- This independent outcome review added no bouts or simulator replays, selected no
  extra seeds and made no policy edits

The runtime diff is restricted to the Integrated policy, its conditional hooks
and its version label. Default Duel, Existing Cover, the baseline, danger
thresholds, reflex vector and 150 ms / 30 Hz / seeded-noise wrapper are unchanged.
Replay/readout changes recognize both Integrated v1 and v2 and show the new action
provenance. No hidden simulation state is read by the repaired controller.

## Implementation review and verification

The original reflex replacement discarded the embedded-spear recall button. The
repair carries the existing immediate recovery intention through that replacement;
recall targets the owner's position and does not require the defensive gaze to
point at the opponent. Only an already eligible visible-target shot intention can
survive defense. A guard after `planGaze` checks the actual pre-noise aim, visible
target, facing and public cover geometry. It does not promise post-noise alignment
or a hit.

Rollout completion and issuance are separate facts. The repaired trace retains
completed rollout status but grants selected-rollout command status only to an
issued compatible command. Reflex recovery stays tier 0 without a selected branch
or completed-plan credit. Tactical score-credit learning remains disabled.

- Independently ran 28 affected tests: all passed
- Reviewed final application/delivery result: 330/330 passed
- Reviewed nine focused arbitration tests, including mirrored real `RECALL_START`,
  no duplicate recall while returning, objective resumption, compatible and
  incompatible shots, hidden/stale/occluded targets, real attention redirection
  through `planGaze`, and completed-rollout versus executed-action labels
- Reviewed 4,800 exact default Duel/Existing Cover parity ticks covering both
  perception modes and seats, including inputs, traces, memory, cognition and settings
- Reviewed 12 matched defense fixtures against v1 with exact final movement and
  aim, spanning both seats, 16/192-unit budgets and held/embedded/returning states
- Independently reran Integrated replay/client tests, including v2 recognition,
  v1-log recognition, deterministic restore, repeated/interrupted flows, no Duel
  memory writes, and requested-versus-actual command correspondence

The full historical recursive suite was not rerun for this repair; the reported
330-test result is the application/delivery suite. Live browser/human play was not
performed.

## Independent retained-output audit

Every compressed log hash and byte count matched. All 57,600 stored simulation-step
records and 14,336 stored decisions were accounted for: 3,600 steps and 896 decisions
per bout. Recomputed command-stream hashes, command counts, event counts, score
ledgers, focus/defense counts, planning counts and budget totals matched the saved
summaries. Actual commands matched the step records. Recorded percept/command timing
matched the 150 ms delay. All recorded decisions stayed within 192 logical units;
learning updates and learned automatic decisions were zero in both conditions.

Both conditions scored 19–49 against baseline. All points were spear hits; neither
side scored ring points. Every one of the eight paired final scores was unchanged.
Both conditions issued 26 throw commands and 11 recall commands, corresponding to
26 actual throws and 10 actual recall-start events. Commands and successful events
must not be conflated.

Seven paired command streams were exactly identical. The only changed stream was
seed 4447, Integrated in P2. Its first difference was tick 3246:

- Both received the identical sensor snapshot from 26.900 s
- Both issued the identical dodge, pre-noise aim and post-noise aim at 27.050 s
- Repaired Integrated issued recall; v1 did not
- The repaired real `RECALL_START` occurred at 27.050 s; v1 recalled at its next
  decision, 27.083333 s, a one-decision / 33.333 ms delay
- The repaired trace correctly marked this as reflex recovery without a completed plan

That one earlier recall subsequently changed 316 paired step commands. Their
trajectories and final world hashes therefore differ, even though their scores do
not. Later changes must not be treated as independent repair successes.

Exposure was sparse: v1 had three defensive embedded-spear decisions, repaired had
two. The repaired final-aim rejection was established in targeted fixtures; the
fresh bouts did not contain a rejection attributed to that final-aim guard. The
single closed-loop recovery timing difference corroborates the narrow defect fix,
but this matrix neither establishes a broader benefit nor estimates its general
frequency. It provides no evidence that the repair solves the opponent's poor combat.

## Evidence

- [Frozen protocol](../PROTOCOL.md)
- [Source identity before the run](source-before-run.json)
- [Per-bout and aggregate outcomes](summary.json)
- [Parity receipt](parity.json)
- [Application/delivery test log](application-tests.txt)
- [Independent stored-output audit](independent-audit.json)

Stop at this bounded repair and report. No additional parameter tuning or validation
matrix is warranted by this completed protocol.
