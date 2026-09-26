# Tether research and decision log

## 2026-09-26

- **Direction (owner):** one human, so human vs NPC. A webpage is fine. Goals: (a) the game is engaging; (b) the NPC
  ticks many functional-consciousness boxes. LLM use is my call.
- **Decision: no LLM in the NPC.** The duel needs 30 Hz decisions, deterministic and seedable for ablation
  tournaments. A language layer would be theatre unless load-bearing. The inner speech is a readout of the workspace
  focus log instead.
- **Decision: designed fresh** from the game and the Butlin indicators. One rule is borrowed from the owner's
  cognitive-architecture work: an indicator counts only if ablating it changes behavior.
- **Decision: plain JS.** Sim, perception and mind run in Node for tournaments (target 100k+ steps/s) and in the
  browser for play. Godot 4.7.2 is installed (winget) but parked: no need for an engine; Version C (first person)
  only if results justify it.
- **Decision: symmetric perception.** Both human and NPC play under the Mode-B cone; the NPC gets only `percept()`
  output. Human-like embodiment: ~150 ms percept latency, aim noise, same turn rate.
- **Name:** Tether (working name). The spear is tethered to its owner by the fixed recall line.
- **Decisions** are tabulated in `decisions.md` (D1-D9).
- **Jobs:**
  - An earlier Sol max web-prototype build (two-human A/B) was killed by the owner after about 2 minutes ("first think
    it out"). Superseded.
  - p1-sim: Sol max (AA II 48), sim + perception + logging + tests. Launched 18:02.
  - p2-mind: Sol max (owner: avoid Astra). Brief drafted; it launches
    after p1 lands.
- **p1-sim landed** (commit 21a6a52, Sol max, 128k tokens, ~45 min). I re-ran the suite: 35/35 green. Headless speed
  2.5M steps/s idle and 870k with scripted agents, far above the 100k target, so tournaments of thousands of bouts are
  cheap. Interpretations are in the README: 0.1 deadzones, 1e-9 epsilon, HELD spear at the owner's centre.
- Launched **p2-mind** (Sol xhigh; snapshot/restore added to the brief) and **rv1-sim** (Sol high adversarial review
  of p1, read-only, scratch scripts only) in parallel.
- **rv1-sim review** (Sol high, ~730k tokens) found six issues. Its answer.md and codex.log vanished from jobs/rv1-sim
  (cause unknown; the report was recovered from the Codex session file). It is in research/2026-09-26-rv1-sim-review.md.
  - **H1: own off-cone non-HELD spear visible in MODE_B.** My p1 brief caused this ("you always know your own spear"),
    contradicting SPEC. Decision D13: follow SPEC.
  - **H2:** agents share the JS realm and could monkeypatch builtins to see the world. Irrelevant for our own mind;
    relevant to codegame (untrusted agents run in workers).
  - **H3, a real bug:** a sustained shallow wall slide accumulates penetration, and a throw from there passes through
    obstacle A.
  - **M4:** the FOV epsilon widens the cone. **M5:** replay verifies only hashes, not logged fields. **L6:** the hash
    depends on key order.
  - Test gaps: the "no tunnelling" test had its endpoint inside the victim; no corner, shallow-slide, or
    neutralize-and-hit reset tests.
  - Fix job p1b queued after p2 lands (p2 is editing sim.js now).
