# Independent review: sensor-only rear-spear awareness v1

Reviewed 2026-10-03 UTC. **Pass for the stated bounded synthetic feasibility
claim; no blocking issue found. Gameplay benefit remains untested.**

## Evidence and boundary

The reviewer read the predeclaration, complete prototype and final fixtures/tests,
retained failure and revisions, final results, development history and public
report. Public constants and MODE_B field availability were checked against the
frozen perception/rules source without importing or executing the game. The
reviewer reran the final author-written synthetic suite with `SENSOR_RESULTS`
unset: **22/22 groups passed**, exit 0. This is an independent review and rerun,
not a second independently authored test suite.

- Input handling copies only permitted packet identity, delayed time/scores,
  delayed own position/facing, public geometry and visible spear
  state/position/direction. The prototype does not read opponent body, own or
  enemy recall targets, true world, current scores, events or current enemy
  commands. The forbidden-property getter checks pass; source inspection agrees
- Queue cadence and the exact 250-ms age check are correct. Memory includes
  source age 0.8 s and expires on the next decision. HELD, received score changes
  and ended packets clear evidence. The hidden source-tick-61 reset cannot clear
  the warning before receipt tick 94. No hidden reset input is used
- Identical allowed histories in three different hidden worlds produce identical
  assessments, including the no-recall world. Neither the implementation nor
  final report labels this an actual unseen recall detector. Moving landmarks
  are explicitly conditional continuations, and quiet outputs do not claim safety
- There are no throw/recall command fields or controller integration. Source audit
  found no imports, filesystem/network access, randomness or hidden-state access
  in the prototype

## Static-clearance reasoning

Under the fixed public rules, the current body center is within speed × delay =
1 unit of the delayed position, or within 1 unit of the fixed reset spawn if an
unobserved reset occurred. Each body disc is therefore contained by an envelope
of radius 1 + 0.35 = 1.35 around the relevant center. Testing the same 4/30-unit
straight segment against inset walls and AABBs expanded by 1.35 is conservative
for both envelopes. The reset envelope also covers a reset during that immediate
command interval: the possible post-reset segment is a prefix of the checked
spawn segment. Uncertifiable envelopes lead to scan-only.

The separate circle-to-box sampling checker reports zero collisions across
11 fixtures, 11,286 uncertainty centers and 191,862 sampled swept positions.
That supports the analytical argument; sampling is not exhaustive proof. The
certificate requires immediate execution of the exact suggested direction for
one decision interval. It does not establish safety from players/spears, noisy or
delayed execution, successful scanning, evasion or better game outcomes. These
limits are stated in the final report.

## History, integrity and interpretation

The declaration hash is unchanged. The original 21/22 run and source are
preserved; its only failure is strict equality of -0 versus +0. The only
prototype repair canonicalizes zero coordinates. Subsequent fixture-realism
edits are preserved and explicitly disclosed: visible HELD includes its visible
body, a visible embedded fixture is placed on a wall, and an evaluator-only
hidden return position uses exact illustrative arithmetic. No expected result
or predeclared group changed. The final executable fixtures were not themselves
frozen before implementation, and the report correctly says so.

All 28 author-package entries match its manifest. Final results and the author's
fresh reproduction are byte-identical. F22 independently reran successfully,
checking all 516 original study files, 31 protected-source entries and 20 frozen
entries. This review changed no author-package, game, controller, default or mind
file and performed no match, saved-outcome replay, Git write or publication.

The result justifies considering a separately preregistered fresh-seed comparison.
It does not authorize or supply that experiment, release either earlier
conditional branch, or change the original inconclusive match conclusion.

## Reviewed identities

- Declaration SHA256: `6e32dd93d272a25a7918e3bd9e9e4d3e73136600b4a9a78cdcbb6d5b18a1cf71`
- Prototype SHA256: `bb78bce500b06697b3ab6c9320c55ce52691b43f4714dce224fad9cc3f409250`
- Final tests SHA256: `ece0d000b35dd755dd04d2a5335b75c4aaa5a6fdfdb2cf86056ce1c531d5bc1c`
- Final fixtures SHA256: `ca78c261affe38102eb91f58e362a37f40b63c061dfae90af92d030671166d24`
- Public report SHA256: `6ee38f173eac5feb90c33b4307e5445749e512b10916c3faff10fa69d2cccdd9`
- Author package manifest SHA256: `0f0c8792e39de41913afb723b767b5e4ee4a1e75852de722b4234e1094d5efbe`
- Final results SHA256: `d3fe54b02082952ae84bf0054b0fd3c4bb08e173c78325850c382b87380c9c7c`

Reviewer evidence is in sibling files `TEST-OUTPUT.txt`, `TEST-EXIT.txt` and
`VERIFICATION.json`. All review outputs are outside the sealed author package.
