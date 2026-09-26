# Recall Spear: Version B + A/B experimental mode (authoritative spec, condensed from the owner's MVP)

Purpose: smallest local two-player prototype to test whether an **embedded spear becomes a second contested location**
(alongside the owner's body). Two modes, identical simulation; only tactical visibility differs.
- MODE_A: full information.
- MODE_B: each player sees dynamic tactical objects only inside a 120-degree forward cone; static geometry always visible.
No other gameplay systems. No AI, bots, network, audio cues, progression.

## Rules

**Players:** exactly two humans, P1 and P2. Collision circle radius 0.35. Bodies do not collide with each other (overlap
allowed); no body attacks.

**Movement:** input MOVE_2D. If |raw| > move deadzone: velocity = normalize(raw) x 4.0 u/s (analog magnitude ignored,
diagonals not faster). Else velocity 0 immediately. No acceleration, inertia, dash, knockback. Movement independent of facing.

**Facing:** persistent unit vector. AIM_2D: if |raw| > aim deadzone, desired = normalize(raw); facing rotates toward
desired by shortest direction at max 360 deg/s (never snaps). Else keep facing. Throw direction = actual facing.

**Spears:** each player owns exactly one, forever. States HELD, OUTBOUND, EMBEDDED, RETURNING. No LOOSE state. No
health, ammo, charge, cooldown.
- HELD: follows owner, no collision. Throw legal. Recall no effect.
- Throw (only from HELD): position = owner.pos + facing x 0.35; direction = facing; state OUTBOUND; speed 12 u/s, straight.
- OUTBOUND: may hit the opponent (owner scores 1, reset) or static geometry (stop at first contact point, EMBEDDED,
  record surface id and contact position). No bounce, no penetration. Cannot be recalled or neutralized.
- EMBEDDED: stays forever until owner recall or opponent neutralization. No timeout/decay.
- Recall (only from EMBEDDED, no input buffering): recall_target = owner's centre NOW; recall_start = spear pos;
  state RETURNING; direction normalize(target - start); speed 12 u/s straight. Fixed path: later owner movement changes
  nothing. If target == start: HELD immediately. RETURNING ignores walls and obstacles entirely. It can hit the
  opponent (owner scores, reset). On reaching the fixed target without a hit: HELD, attached to owner's CURRENT position.
- Neutralization: only an enemy EMBEDDED spear. If a player's movement sweep (circle r=0.35 from previous to current
  position) touches the spear point: spear -> HELD at its owner's current position; no score, no knockback, nothing
  moves. A spear embedded this step becomes neutralizable from the next step. Cannot neutralize OUTBOUND/RETURNING.
  Cannot carry/steal/move/throw an enemy spear.
- Spear vs spear: no interaction.

**Scoring:** a valid OUTBOUND or RETURNING hit = 1 point to the owner. Nothing else scores.
**Reset after any scoring hit in a step:** apply all scores for the step first (simultaneous hits: both score, one
reset, no player-index priority); then positions P1 (-5.5, 0), P2 (+5.5, 0); facing P1 +X, P2 -X; both spears HELD;
clear recall targets and embed data. Scores and bout timer persist. No reset delay.
**Bout:** exactly 300 s; ends immediately at 0; higher score wins; equal = tie. No score limit.

### Transition table
| State | Trigger | Result |
|---|---|---|
| HELD | throw | OUTBOUND |
| HELD | recall | no effect |
| OUTBOUND | static contact | EMBEDDED (neutralizable from next step) |
| OUTBOUND | opponent hit | score + reset |
| OUTBOUND | throw / recall | no effect |
| EMBEDDED | owner recall | RETURNING (not neutralizable after transition) |
| EMBEDDED | opponent contact | HELD at owner (neutralization) |
| EMBEDDED | throw | no effect |
| RETURNING | opponent hit | score + reset |
| RETURNING | fixed target reached | HELD at owner's current position |
| RETURNING | throw / recall | no effect |
Impossible: loose spear, opponent-owned spear, OUTBOUND->RETURNING directly, RETURNING embeds, RETURNING neutralized,
HELD scores.

## Space (world units, authoritative)
- Arena interior X -8..+8, Y -5..+5 (16 x 10). Outer walls solid for players and OUTBOUND spears; RETURNING ignores them.
- Obstacle A: centre (-2.25, +1.75), 1.5 x 3.0 -> X -3.00..-1.50, Y +0.25..+3.25.
- Obstacle B: centre (+2.25, -1.75), 1.5 x 3.0 -> X +1.50..+3.00, Y -3.25..-0.25.
- 180-degree rotational symmetry about (0,0). Surface ids should identify the face (e.g. `WALL_N`, `A_E`, `B_S`).

## Collision
- Spear = moving point (rendered as a short line; length has no gameplay effect).
- Player vs boundary / obstacles: circle r=0.35; obstacles = AABB expanded by radius for centre-point collision;
  slide (remove only the into-surface component), no bounce, never penetrate. Diagonal into a wall slides.
- OUTBOUND vs opponent: swept segment vs opponent's POST-movement circle; first time of impact (no tunnelling at 12 u/s).
- OUTBOUND vs static: swept point vs boundary, A, B; first hit. If both player and static hit in one step, earlier TOI
  wins; tie within epsilon -> player hit.
- RETURNING vs opponent: same swept test. RETURNING vs static: never queried.
- Player vs enemy EMBEDDED spear: swept circle vs point.
- Recall pressed at the start of a step happens before movement, so that spear is no longer neutralizable this step.

## Step (fixed timestep >= 60 Hz, independent of render rate)
1. read raw inputs  2. update facing  3. legal throw/recall presses  4. player movement with slide
5. neutralization  6. advance OUTBOUND/RETURNING  7. hits/embedding  8. scores  9. reset if any hit
10. visibility state for rendering/logging.

## Constants (experiment-defining; any change = new logged condition)
player radius 0.35; speed 4.0; turn 360 deg/s; FOV 120 deg total (half 60); outbound 12.0; recall 12.0; arena 16x10;
starts/facings above; obstacles above; bout 300 s; state logging 20 Hz.
Technical (may tune, must log): sim rate, deadzones, epsilon, render rate, spear draw size, colours, FOV overlay opacity,
log format.

## Controls
Per player, four logical channels: MOVE_2D, AIM_2D, THROW (momentary press), RECALL (momentary press). No specific
bindings required. Do not implement buffering, auto-aim, aim assist, charge, cooldown, repeat-fire, auto-recall,
auto-facing.

## A/B rendering
The simulation must not read the mode. Only rendering/logging visibility differs.
- MODE_A: each view renders both bodies, both facings, both spears in all states, geometry, scores.
- MODE_B, per player: always own body, own facing, own HELD spear, all static geometry, scores, a minimal FOV wedge
  that exactly matches the test. Opponent, opponent facing, and any NON-HELD spear (either player's) render only if
  visible: offset = obj - viewer; if |offset| == 0 visible; else angle(facing, normalize(offset)) <= 60 deg.
  Opponent's HELD spear visible only when the opponent is visible. No occlusion by obstacles. No distance cutoff.
  Hidden = not rendered at all: no ghosts, last-known markers, arrows, timestamps, UI hints, colour changes of the cone.
  No tactical audio at all.
- Privacy: each participant sees only their own view (separate windows on separate displays). Never both B views on one
  shared screen. Mode A should use the same display arrangement.
- Debug overlays (collision shapes, sweeps, recall targets, hidden entities) allowed only in dev/replay, off in play.

## Logging (raw only, never interpretations; every record carries the mode)
- Session metadata: session_id, bout_id, timestamp_start, experiment_mode, all experiment constants, sim rate, render
  rate if known, deadzones, build id.
- State samples at 20 Hz: timestamp, bout_elapsed_time, mode; per player position, velocity, facing, score; per spear
  state, position, direction, embed_surface_id|null, recall_target|null; visibility_from_P1/P2: opponent_visible,
  own_nonheld_spear_visible, enemy_nonheld_spear_visible (all true in A for existing entities).
- Raw input per player: timestamp, raw_move_x/y, raw_aim_x/y, throw_pressed, recall_pressed.
- Events: THROW(player, origin, facing); EMBED(owner, position, surface); RECALL_START(owner, spear_start, recall_target,
  opponent pos, owner facing); RECALL_COMPLETE(owner, fixed_target, owner_current); SPEAR_NEUTRALIZED(spear_owner,
  neutralizer, embedded pos, neutralizer pos, owner pos); HIT(attacker, victim, phase OUTBOUND|RETURNING, hit pos,
  attacker pos, victim pos); RESET(reason SPEAR_HIT, scores); VISIBILITY_ENTER / VISIBILITY_EXIT (mode B only;
  viewer, entity id, type, entity pos, viewer facing).

## Out of scope
Health, melee, body collision/blocking, dash, acceleration, inertia, knockback, stamina, cooldowns, charge, auto/homing
recall, bouncing, loose/stolen/carried spears, spear-vs-spear, multiple weapons, upgrades, abilities, hazards, moving
obstacles, extra maps, progression, AI/bots in play, matchmaking, network, procedural content, trajectory previews,
minimap, threat arrows, last-known markers, spatial audio, first-person camera, elaborate VFX/SFX.

The owner's full original text (observation protocol, hypotheses, failure modes, full checklist) is authoritative where
this condensation is silent; the checklist items are reproduced in TESTS below.

## TESTS: checklist to verify (automate every item that can be automated)
Movement: P1/P2 identical; cardinal exactly 4 u/s; diagonals not faster; any accepted input full speed; release stops;
no inertia; slide on walls/obstacles; players pass through each other.
Facing: independent of movement; rotates not snaps; max 360 deg/s; throw uses actual facing; A and B identical.
Outbound: leaves from player edge; exactly 12 u/s; straight; swept hit, no tunnelling; embeds at first static contact
and stops; cannot be recalled or neutralized.
Embedded: stationary indefinitely; no decay; opponent contact neutralizes; returns harmlessly; no score; no loose spear.
Recall: only from EMBEDDED; owner position recorded; straight; later owner movement changes neither path nor target;
12 u/s; passes through obstacles and outer walls; can hit opponent; cannot be neutralized; on target -> owner's current hand.
Scoring/reset: outbound hit 1; recall hit 1; neutralization 0; reset positions, facings, spears; score and timer
persist; simultaneous hits score both without index bias.
Arena: 16x10; starts; obstacle centres/sizes; 180-degree symmetry.
Mode A: both players, spears, facings always visible; normal facing mechanics.
Mode B: FOV exactly 120; geometry visible; exact angular rule for opponent and non-held spears; no occlusion; no
markers; no arrows; no audio; FOV wedge matches test; per-participant private views.
A/B isolation: switching mode changes only visibility (identical trajectories for identical inputs).
Logging: every field and event above; 20 Hz; HIT phase; visibility events in B; mode on every record.
Contamination: no accidental extra mechanic, no trajectory assist, no camera or audio leaking hidden info, no auto
recall, no timer forcing resolution.
