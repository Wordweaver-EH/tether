# Defensive action arbitration: bounded engineering repair

Fixed and approved before edits/outcomes on 2026-10-07. This follows the published
integrated Cover v1 characterization; its source, protocol and results stay intact.
This is a control-conflict repair, not retuning, a strength study or a new learner.

## Invariants and acceptance

- Change only optional integrated Cover behavior. Preserve default Duel, Existing
  Cover, baseline, danger thresholds, defensive movement and reflex gaze exactly.
- Carry the existing immediate recovery intention into defense when the own spear
  is EMBEDDED. Carry only an existing visible clear-line shot intention; defense
  never invents a shot or aim from spear tracking, hidden truth or stale belief.
- Check defensive shot compatibility after planGaze, using actual pre-noise aim,
  clear public geometry, facing and the opponent in the currently received delayed
  percept. Suppress conflicting aim. Never issue throw and recall together.
- Preserve the complete-percept 150 ms delay, 30 Hz decision cadence and common
  seeded noise wrapper. Pre-noise compatibility is not guaranteed noisy alignment
  or a guaranteed hit. Do not inspect the current privileged world to gate actions.
- Distinguish movement owner, weapon intention/source, guard reason, pre-noise
  command, actual post-noise command, completed rollout and its executed command.
  Reflex recovery remains tier 0 with no completed-plan or teacher credit.
- Tactical score-credit learning remains disabled; no new architecture or learning
  claims. Keep logical budget cap, prior route/cache behavior and replan interval.

## Fixed fixtures, before closed-loop outcomes

1. Mirrored incoming-spear defense plus embedded-own-spear recovery: preserve the
   defensive vector/gaze, produce real RECALL_START, avoid repeated recall while
   RETURNING and resume objective movement after threat removal.
2. Compatible visible Hunt shot intention survives defense; incompatible final
   aim, stale/hidden target, occlusion, non-held spear and conflicting buttons do
   not. Test final planGaze redirection, not only proposal gaze.
3. Low budget and completed rollout versus actual execution labels are accurate;
   branch target differs from redirected aim => no selected-rollout command credit.
4. Exact default Duel and Existing Cover parity against unmodified v1 source;
   identical wrapper timing/noise and requested/actual trace correspondence.
5. Scripted readable bait/recovery/objective sequence judged by observable dodge,
   recovery and objective resumption, independent of points. These are software
   observables, not evidence of human readability or engagement.

## Frozen fresh comparison

- Seeds: 1237, 2081, 3253, 4447; both seats; Mode B; 30 seconds per bout
- Conditions: published v1 and repaired integrated, each against unchanged baseline
- Eight paired seed-seat groups, 16 bouts total; common embodiment seeds
- Publish the reviewed source checkpoint before running the matrix
- Retain complete compact per-decision, actual command and event streams, source
  hashes and per-bout summaries: weapon opportunities/defensive actions, scores by
  source, ring occupancy, planning completion/execution, budget and learner state
- Source hash checks before and after. No extra seeds, outcome-driven edits or
  positive-results criterion. Report any regression or absence of benefit
- Stop after this repair report. Browser/human play remain unverified

Reference source: published commit 97cbc63a78f9a9d543f25d582e4078c4c9910ef2
(runtime matches published 240c844). The runner accepts a separate checkout of
that exact reference, checks every src file identity, and never edits it.
