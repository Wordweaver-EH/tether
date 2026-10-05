# Cover Control: optional prototype

Select **Cover Control** on the start screen, then Enter arena. `node serve.mjs`
serves the existing client at `http://localhost:8765/`. Duel remains selected by
default. This mode is a small environment prototype, not a new cognitive system
or a performance experiment. `SPEC.md` continues to govern default Duel; the
opt-in changes are described here.

## Rules and information

- Same 16×10 arena bounds, player starts, speed, turn limits, spears and five-minute clock
- Two symmetric wing walls block the direct spawn-to-ring approach. The north route
  is shorter and exposed. The south route is longer and its lower baffle shelters
  the approach from the center. Both are passable at the actual 0.35 body radius
- One central ring, radius 1.05. A player's **center** must be inside. Holding it
  alone for 240 simulation ticks (2 seconds) awards one point, then starts the
  next hold. This point does not reset either player
- Two players inside contest the ring and reset progress. An empty ring or change
  of holder also resets progress; partial credit is never retained
- Spear hits still give one point and reset both players/spears. A hit clears the
  ring's progress and suppresses a ring award on that tick, including at 239 ticks
- In Mode B, static cover blocks sight within the existing 120° forward cone.
  Bodies and each non-held spear are filtered independently. An embedded spear on
  the near cover face remains visible. Intermediate corner/edge tangencies block
  sight symmetrically; there is no diagonal crack
- Mode A remains full information. **Returning spears still pass through cover**;
  outbound spears stop and embed as before
- The map and ring are public. The ring's coarse holder, contested flag and progress
  are intentionally public to both actors, even behind cover. No exact hidden
  opponent position, direction or spear state is included in this beacon

Controls are unchanged: WASD, mouse facing, click to throw, right click/Space to
recall, Esc to pause. Pause offers End bout so its log can be downloaded; results
allow Rematch or Change mode. Replay draws the selected map, ring and scores.

## Baseline opponent

Cover Control uses a labeled, conventional route-and-contest baseline. It selects
one of the two routes reproducibly from the seed, approaches a spot in the ring,
aims at observed opponents, and attempts recalls. It receives only percepts.

Its embodiment delays the **entire percept, including public ring status**, by
18 ticks/150ms, makes decisions every 4 ticks/30Hz, and uses the established
benchmark's aim-noise formula (base 0.034, speed term 0.0075, cap 0.18). A test
compares that formula directly. Because the benchmark wrapper imports Node-only
crypto, this browser-safe wrapper uses the project's seeded xorshift/normal RNG
for samples rather than the benchmark's SHA-addressed sample sequence. It is not
a matched benchmark arm. The route controller predicts only its own movement
through the known sensor delay to avoid waypoint overshoot.

No learning, mind trace or new mind mechanism is added. Cover bouts cannot save,
clear or overwrite the Duel opponent-memory profile. Mind View identifies the
baseline and shows no invented cognitive trace. Default mind modules are unchanged.

## API, replay and compatibility

`createWorld({ gameMode: 'COVER_CONTROL' })` opts in; `createWorld()` and explicit
`DUEL` keep the old shape. `runBout` accepts the same optional `gameMode` argument.
New logs add `game_mode` only for Cover Control, record ring state in samples,
and emit `CONTROL_POINT`. Verification and frame reconstruction share the same
metadata-to-world configuration. Hashes include the optional objective state.
Old default log metadata, hashes and event behavior are preserved exactly.

## Verification and limits

On Node v24.19.0, the final current application suite passes **288/288** tests.
The final recursive discovery passes **414/421**, with the seven historical
failures classified below (clean baseline: **399/403**). Run:

```sh
node --test test/*.test.mjs delivery-tests/*.test.mjs
node tools/math-audit.mjs
```

The focused mode tests cover line-of-sight symmetry/tangency, near-face embedded
spears, hidden-data boundaries, public beacon semantics, both body-clear routes,
objective timing/contestation/hit precedence, delayed/noisy baseline timing,
route reset recovery, seeded determinism, JSONL/frame replay and exact default
world/percept/input/log parity. Client tests use a Node DOM/canvas harness for
selection, repeated controls, pause/result/rematch/change mode, storage isolation,
clipped shadows, objective readouts, seeded restore and replay seek/reload.
These are software checks, not real-browser visual or input verification.

Full recursive `node --test` also discovers historical frozen studies. Four
missing-archive failures reproduce on the untouched eba3d3c baseline (awareness
snapshot imports/manifests and an external experimental design file). Three
human-proxy tests additionally reject the changed runtime through their original
source-freeze guards. Those freezes remain unchanged; run old studies against
their pinned source/data rather than replacing their manifests with these bytes.

The cloud browser could not open localhost: `net::ERR_BLOCKED_BY_CLIENT`.
No tunnel, alternate browser route, deployment or bypass was used. Real-browser
layout, sound, actual input feel and human playability remain unverified.
No training, large benchmark, cognitive-benefit study or consciousness claim was
performed for this prototype.
