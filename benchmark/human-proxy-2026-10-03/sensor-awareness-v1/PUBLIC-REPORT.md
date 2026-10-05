# Sensor-only rear-spear awareness: bounded synthetic feasibility v1

## Result and decision

**Feasible as an uncertainty warning and defensive suggestion; gameplay benefit
is untested.** All **22 predeclared synthetic check groups pass**. The standalone
prototype can retain permitted visible spear evidence, warn when a conditional
landmark is behind delayed facing, and suggest a lateral move plus a scan. When
conservative static-geometry clearance cannot be certified, it suggests only a
scan.

It cannot distinguish an unseen recall from no recall. Three different hidden
worlds with identical permitted histories produce byte-identical assessments,
including a warning in the world where the spear is still embedded. The warning
is therefore explicitly **possible unseen rear-spear risk**, never a detected
actual recall, known current trajectory, or probability of being hit.

**A separately preregistered fresh-seed comparison is warranted as the next
research question, subject to independent acceptance and a separate release.**
The synthetic result supports testing this mechanism, not expecting improvement.
No comparison is authorized or executed here. The original match result remains
inconclusive; neither original conditional branch is released.

## What was built

`awareness.mjs` is a separate assessment module, outside the frozen repository.
It has no imports, filesystem/network access, randomness, simulator, active
controller, mind, saved-event reader, or access to the opponent body. Its input
copy reads only these permitted fields:

- MODE_B/viewer identity, delayed source time/end flag and delayed scores
- Delayed own position/facing and public arena bounds/obstacles
- A currently received, visible enemy spear's state/position/direction, if present

Previously issued own movement may be committed solely to preserve lateral
direction in a tie. Enemy recall endpoints, current enemy/body/state, world events,
current scores, and own-spear secrets are never inputs. Throwing getter sentinels
on unused/forbidden properties establish that those properties are not read in
the tested boundary. The source is also independently inspectable and tiny.

The fixed source-memory horizon is **0.8 seconds**, or 24 decisions. The actual
receipt of the last evidence can consequently be up to **1.05 seconds** after it
was sampled. This hand-declared engineering horizon was not selected using match
outcomes. Public constants are speed 4 for the player, 12 for either flying spear
phase, body radius 0.35, a 250-ms sensor delay and a 30-Hz decision rate.

For an observed embedded spear, the nominal landmark is the old position. For
outbound evidence, a *no unseen transition* branch advances in the observed
direction and stops at public terrain contact. For returning evidence, a
continuation in the observed direction is explicitly conditional on no unknown
completion or reset. Its endpoint is unavailable. These are landmarks for an
uncertainty heuristic, not estimates certified to match the current spear.

Only an absent spear with a strictly rear landmark triggers this module. Visible
spears are delegated to the separate visible-threat policy; no-evidence, expired,
front/side-landmark and coincident-bearing cases abstain. A fresh observed HELD
spear, received score change, or ended packet clears old memory. Quiet means
**no warning from this narrow module**, not evidence that the player is safe.

## What the fixtures establish

- A west-wall spear observed before a half-turn produces a rear warning and a
  westward scan suggestion at source time 0.5 s, received at 0.75 s. Its lateral
  suggestion is supported by the public static-geometry bound below
- An outbound spear first seen at (-2, -0.6), moving east while the player faces
  west, has a rear no-recall landmark after 1/3 s. That hypothetical branch stops
  at obstacle B's x=1.5 face instead of extrapolating through the obstacle
- Visible HELD/away cases, missing evidence, non-rear evidence, and expired
  memory remain quiet. The 0.8-second boundary and the next frame are distinct
- Both bearing frames preserve either previously issued world-space lateral
  direction. Wall/obstacle fixtures choose an open side; blocked or uncertifiable
  uncertainty envelopes yield scan-only
- The synthetic queue emits nothing before receipt tick 30 and then samples
  source ticks 0, 4, 8, … at receipt ticks 30, 34, 38, …, with exactly 250-ms age
- A reset at source tick 61 is first observed at receipt tick 94 through source
  tick 64. The old warning persists before that receipt. No hidden reset signal
  is supplied to clear it early
- Three masked hidden worlds, including no recall and two hidden returning
  worlds with different endpoints, have identical allowed histories and outputs
- Invalid mode, timing, vectors, states and receiver changes are rejected. Input
  packets and previously returned diagnostic snapshots remain isolated

These are hand-built fixtures, not historical hit cases, saved-outcome replay,
legal full-episode prefixes, or end-to-end game simulations. Their public geometry
and observation relationships are checked where relevant. No matches or existing
controllers were executed.

## Exact meaning of the movement certificate

An observed position can be wrong by up to 4 × 0.25 = **1 unit** at receipt solely
because of delay. An unobserved hit/reset can also teleport the player. Therefore
each proposed lateral command must clear two conservative envelopes: a unit
radius around delayed own position, and a unit radius around that viewer's public
reset spawn. Static obstacles are expanded by **1.35 units** and bounds inset by
the same amount; the proposed segment is **4/30 units** long.

If both envelopes and that entire segment clear, every body position within
either uncertainty disc clears static geometry for immediate execution of that
exact direction over one decision interval, under the public speed/reset
assumptions. Expanding boxes is
conservative relative to exact circle geometry. If an envelope itself intersects
expanded geometry, movement abstains even if some actual positions would allow a
move. An independent direct circle-to-box checker sampled **11 fixture cases,
11,286 uncertainty centers and 191,862 swept positions**, with zero collisions.
This sampling supplements the analytical envelope argument; it is not an
exhaustive proof or an independent implementation of the whole detector.

The certificate does **not** cover moving spears, collisions with another player,
successful evasion, or delayed execution of the suggestion. It does not certify
actual scanning/reacquisition. The scan aim is only a request: delayed facing,
the public turn-rate limit, motor aim noise and intervening movement/reset still
apply. A controller must recompute at the next decision. No full motor integration
or actual scan trajectory was tested here.

## Development, integrity and remaining limits

The check declaration was saved and hashed before implementation/evaluation.
Executable fixture code was written later; the final fixtures were not themselves
frozen before implementation. First
execution passed 21/22 groups; the sole failure was strict JavaScript comparison
of a lateral x coordinate of -0 with +0. Canonicalizing zeros in the prototype's
vector constructor fixed it without changing detector parameters or assertions.
The failed run and original source remain preserved. A later disclosed fixture
realism correction supplied the visible opponent body alongside HELD, moved a
visible embedded-only fixture onto a wall, and made one evaluator annotation's
return position exact. Prior fixture sources are retained; expected outcomes and
the 22 check groups were unchanged. See `DEVELOPMENT-LOG.md`.

All **516 pre-existing study files**, **31 protected source entries**, and
**20 frozen human-proxy entries** still match their original hashes. No frozen
controller, source, rule, ordinary policy, active default, or mind file changed.
No Git writes or publication were performed by this implementation task.

Important unmeasured costs and failure modes include false warnings, repeated
scan distraction from a visible opponent, stale/incorrect nominal landmarks,
unseen spears never observed, old evidence deliberately forgotten, threats not
strictly behind, unknown recall completion, and lost attack opportunities or
movement quality. Detection accuracy, prevented hits, rate changes and win rate
cannot be inferred from these fixtures. The hidden-world test positively shows
that some warning false positives are unavoidable for identical inputs.

The return value has optional movement/scan suggestions and **no throw or recall
fields**. It is not integrated into the original counter. A later comparison must
freeze exact arbitration with the existing visible-threat policy, command-memory
commitment, motor/noise timing and attack behavior. It should compare awareness
against its unchanged baseline on fresh seeds, preregister outcome/statistical
criteria and record both warning benefit and opportunity cost. Intentional
punishment-attack suppression would be a separate intervention. This package is
not a full match protocol or a claim that the new variant will improve play.

## Reproduction and identities

From the original study directory, with a fresh output directory:

    SENSOR_RESULTS=sensor-awareness-v1/results/reproduction node --test sensor-awareness-v1/awareness.test.mjs

The suite refuses to overwrite a results directory. Without SENSOR_RESULTS it
runs without creating a results file. It requires the original study inputs only
for read-only hash integrity checking. The prototype itself needs none of them.

- Declaration SHA256: `6e32dd93d272a25a7918e3bd9e9e4d3e73136600b4a9a78cdcbb6d5b18a1cf71`
- Prototype SHA256: `bb78bce500b06697b3ab6c9320c55ce52691b43f4714dce224fad9cc3f409250`
- Final fixture execution: `results/run-003/RESULTS.json`
- Reproduction: `results/run-004-reproduction/RESULTS.json`, byte-identical
- Source/history/output hashes: `PACKAGE-MANIFEST.json`

Independent review is separate from this author's tests; its final verdict and
reproduction evidence should accompany any publication.
