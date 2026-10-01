You are building phase 1 of "Tether" in C:\arcx\games\tether. Read SPEC.md (the rules, authoritative) and DESIGN.md
(the project; this job is phase 1 only).

Deliver, as plain JavaScript ES modules with zero dependencies (Node 24 is installed; no npm installs):

1. `src/sim.js`: the complete deterministic simulation per SPEC.md.
   - Fixed 120 Hz. No DOM, no Date, no Math.random, and no knowledge of the experiment mode.
   - API: `createWorld(config?)`, `step(world, inputs)` where inputs is `[p1, p2]`, each
     `{moveX, moveY, aimX, aimY, throw: bool, recall: bool}` (throw and recall are "pressed this step").
   - `step` returns the step's events (SPEC event schemas).
   - `hashWorld(world)`.
   - Constants exported from one `CONSTANTS` object that separates experiment constants from technical ones.
   - Swept collisions exactly as specified: TOI ordering, ties go to the player hit, simultaneous hits, and the step
     order. Surface ids name the face (WALL_N/E/S/W, A_N/E/S/W, B_N/E/S/W).
2. `src/perception.js`: the ONLY way an agent or a view sees the world.
   - `percept(world, viewerId, mode)` returns a plain object with everything that viewer may know:
     - own state: position, facing, velocity, own spear state and position (you always know your own spear);
     - scores and time;
     - static arena;
     - visible opponent (position, facing, velocity) or absent;
     - opponent spear (state, position, direction) only if visible under the SPEC rule, including a HELD spear only
       when the opponent is visible;
     - the cone definition.
   - MODE_A returns everything.
   - Also export `isVisible(viewerPos, viewerFacing, targetPos)`: the exact 60-degree half-angle test. Include the
     boundary and the zero-offset case.
   - Percepts must be deep copies: mutating one must not affect the world.
3. `src/log.js`: session logger per SPEC Logging.
   - Metadata, raw inputs every step, 20 Hz samples, events, and VISIBILITY_ENTER/EXIT in MODE_B.
   - Every record carries the mode.
   - JSONL serialization, plus a `replayFromLog(lines)` that re-simulates from the raw inputs and verifies the hashes
     recorded at each 20 Hz sample.
4. `src/headless.mjs`: `runBout({agents:[a1,a2], mode, seed, durationSec, log:bool})`.
   - An agent is an object with `act(percept, dt) -> input`.
   - It must receive ONLY the output of `percept()`, and a deep copy.
   - Returns the final score, events and optional log lines.
   - Include three trivial scripted agents in `src/agents/basic.mjs`:
     - `idle`
     - `randomWalker(seed)`, which uses its own seeded PRNG
     - `aimAndThrow`, which faces the visible opponent, throws, and recalls on a timer
   - Performance target: at least 100k sim steps per second headless on one core. Report the measured number.
5. `test/*.test.mjs` (`node --test`).
   - Automate every applicable item in SPEC.md TESTS with exact numeric checks. Add:
     - replay determinism (log, replay, hash equality);
     - perception tests: exact 60-degree boundary, the hidden opponent's HELD spear, no leakage of hidden fields
       anywhere in the percept object (deep scan), mutation isolation;
     - A/B isolation (identical inputs give identical world hashes in A and B);
     - a seeded fuzz test (20k+ steps, random inputs, both modes) checking invariants: no player inside geometry, legal
       spear states only, scores change only with HIT events, and embedded spears never move.
6. `README.md`: how to run tests and the headless harness, the API, and an "Interpretations" list for every place
   where SPEC was ambiguous and you chose.

Rules:
- Write only inside C:\arcx\games\tether (never outside).
- No browser, no GPU work, no servers.
- Do not add gameplay systems beyond SPEC.
- When `node --test` passes, commit in this repo with a message ending in
  `Co-Authored-By: GPT-6 Sol <noreply@openai.com>`.

Final message: files created, test counts (pass/fail), measured steps/sec, SPEC checklist items automated vs not,
interpretations, open issues.
