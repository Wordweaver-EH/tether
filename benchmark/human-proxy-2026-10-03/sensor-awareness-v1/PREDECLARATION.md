# Sensor-only rear-spear awareness: synthetic feasibility declaration v1

Declared before prototype implementation or fixture execution, 2026-10-03 UTC.

## Purpose and exclusions

Test whether permitted delayed MODE_B evidence can support an honestly labelled
rear-spear uncertainty warning and a bounded defensive suggestion. This is a
separate synthetic feasibility study. It runs no matches, saved-outcome replay,
simulator, existing controller, mind, tuning, fitting, or parameter search.
Nothing is installed into the active game or frozen repository. The original
inconclusive match result and both unreleased conditional branches stay unchanged.

The primary reports were read to identify the interface-gate problem. No saved
hit coordinates, trajectories, seed outcomes, or counts will select thresholds
or supply fixture inputs. All fixture coordinates below are hand-built from
public arena/speed limits. Fixtures establish mechanism/conformance, not efficacy.

## Fixed design

- Only copied fields from a canonical MODE_B packet: viewer ID, source time/end,
  delayed scores, delayed own position/facing, public arena, and visible enemy
  spear state/position/direction. No opponent body, enemy recall target, own
  recall target, true world, events, current scores, or current enemy inputs
- Known timing: source grid every four 120-Hz ticks, receipt exactly 30 ticks
  later. A separate synthetic queue will check startup and delayed resets
- Remember the last visible non-HELD spear for at most 0.8 source seconds (24
  decisions). This is a declared engineering horizon, not a fitted recall model
- For EMBEDDED, retain its observed landmark. For OUTBOUND, use constant public
  speed 12 along its observed direction, stopping at public point/terrain
  contact. For RETURNING, retain the observed-direction continuation without
  inferring its unavailable endpoint. Both moving projections are explicitly
  conditional hypotheses and use source age only, never label current truth
- Warn only when spear is now absent and the retained/projected landmark is
  strictly behind delayed facing. Visible spear cases remain for a separate
  existing visible-threat policy. A coincident/undefined bearing abstains
- Every warning means possible blind-side spear/return risk; unseen recall
  onset, present state, target, trajectory, and hit probability remain unknown
- Suggest a scan toward the hypothesized landmark plus one perpendicular move.
  Preserve an issued lateral direction in a tie; otherwise use a fixed side.
  Use the other side if only that side clears. If neither clears, scan only
- Certify only static-geometry clearance for a single 1/30-second command under
  conservative own-position uncertainty: public speed 4 times the 0.25-second
  delay, plus body radius 0.35, with AABB expansion. Include both the delayed
  position envelope and the viewer's public reset-spawn envelope, since an
  unobserved reset can teleport the body. A ray segment of length 4/30 must clear
  every envelope. This is not a certificate against moving spears or players
- Clear old spear and command memory upon a received score change, a new visible
  HELD spear, expiration, or ended packet. Do not clear on an unobserved reset
- Return an assessment and optional movement/scan suggestion, not a full agent
  command. There are no throw/recall fields and no punishment-attack suppression
- Reject MODE_A, invalid vectors/times/states, wrong receiver/age/grid, reversed
  source time and viewer changes. Ignore all unused/extra fields without reading
  them; mutate neither caller packets nor diagnostics already returned

## Predeclared checks

All checks must pass for a bounded sensor-only feasibility claim. Failures are
retained and reported; any implementation repair is documented without changing
these checks or optimizing match outcomes.

1. F01: No evidence means no warning or suggested override
2. F02: Visible HELD is quiet and clears remembered-away evidence
3. F03: Visible OUTBOUND/EMBEDDED/RETURNING are quiet in this blind-side module
4. F04: Previously visible west-wall embedded spear, then a physically possible
   half-turn, yields a rear uncertainty warning, scan west and lateral suggestion
5. F05: A visible outbound spear at (-2,-0.6), direction east, seen while facing
   west, has a rear no-recall landmark after 1/3 second; stop at default obstacle
   B's x=1.5 face instead of extrapolating through it
6. F06: A non-rear remembered landmark remains quiet; this narrower detector does
   not claim all out-of-cone spears are harmless
7. F07: Previously seen RETURNING later hidden/rear gets an uncertainty warning,
   never an actual unseen-return classification or guessed recall target
8. F08: The 0.8-second memory boundary is included; the next 30-Hz frame expires
9. F09: Fresh observed HELD, changed delayed score and ended packets clear memory
10. F10: West/east rear bearing and either previously issued lateral sign preserve
    that world-space direction when both perpendicular options clear
11. F11: Near north/south wall, choose the side whose entire uncertainty envelope
    and one-decision segment clear; independently verify the segment geometry
12. F12: A public obstacle blocks one lateral side, so choose the open side
13. F13: Both sides blocked, or the uncertainty envelope overlaps static geometry,
    gives scan-only and no claim of certified movement
14. F14: A reset-spawn envelope obstruction prevents movement even if the delayed
    position envelope alone would clear
15. F15: Coincident projected landmark abstains without NaNs or invented bearing
16. F16: Synthetic queue emits no result before tick 30, then only at ticks
    30+4k using source tick 4k, with exactly 250-ms age and no second queue
17. F17: A score change at source tick 61 first resets awareness at receipt tick
    94 (source tick 64); the module cannot react at the true reset time
18. F18: Two distinct hidden worlds (still embedded vs recalled/returning with
    different hidden endpoints), with identical allowed histories, produce
    identical assessments. Hidden metadata/getters cannot affect/read inputs
19. F19: Malformed timing/mode/viewer/state/nonfinite data fail closed, and normal
    extra unused fields are ignored without reaching forbidden getters
20. F20: Deterministic replay, caller-input immutability, diagnostic snapshot
    isolation and no throw/recall output fields
21. F21: A separate independent geometric checker samples boundary/interior
    uncertainty positions and checks every suggested segment, including possible
    reset positions, in the declared wall/obstacle fixtures
22. F22: Every pre-existing study file and all frozen/protected source hashes are
    unchanged after the suite; source audit confirms no simulator/controller
    imports, filesystem reads, network, randomness, or hidden-data access in the
    prototype

## Decision rule

Passing supports feasibility of this warning/suggestion interface only. It does
not establish accuracy, recall detection, evasion, win rate, human pacing quality,
or improvement over the original controller. A separately preregistered fresh-seed
comparison is worth considering only after these checks and independent review
pass. Any match comparison needs its own exact integration, source freeze,
seed/budget/statistical plan, false-warning/opportunity-cost diagnostics, timing
and motor-noise treatment, independent review and release. Awareness must be
isolated from an intentional punishment-attack-suppression intervention. This
declaration neither authorizes nor runs that comparison.
