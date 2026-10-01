Phase 1 is complete and committed as `21a6a52` with the requested co-author trailer. The working tree is clean.

**Files created:** [simulation](C:/arcx/games/tether/src/sim.js), [perception](C:/arcx/games/tether/src/perception.js), [logger and replay](C:/arcx/games/tether/src/log.js), [headless harness](C:/arcx/games/tether/src/headless.mjs), [scripted agents](C:/arcx/games/tether/src/agents/basic.mjs), [tests](C:/arcx/games/tether/test), [README](C:/arcx/games/tether/README.md), and `package.json`.

**Verification:** `node --test` passed **35/35**, with **0 failures**. The benchmark measured **2,482,194 steps/sec** with idle agents and **871,629 steps/sec** with scripted agents, both without logging.

The tests automate the rule-level SPEC checklist: movement, collisions, spear transitions, scoring and reset, arena and timer, perception and A/B isolation, logging and replay, plus 20,000 seeded steps in each mode. Display privacy, wedge drawing, markers, camera, and audio remain untested because phase 1 has no client.

The [README](C:/arcx/games/tether/README.md) lists the interpretations, including 0.1 deadzones, a `1e-9` collision epsilon, HELD spear position at the owner’s center, and deterministic collision and 180° aim ties. **Open phase 1 issues:** none.