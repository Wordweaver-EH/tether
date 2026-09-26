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
- **p2-mind landed** (commit ee086fa, Sol xhigh, ~2 h). Full report in reports/phase2-tournament.md; the tuned run was
  8,432 bouts in 480 s on 8 threads.
  - The normal mind vs scripts (tuned): camper 35%, spinner 13%, spearRusher 58%, **immediateRecaller 3%,
    directShooter 0.5%**, embedWaiter ~100%.
  - **immediateRecaller beats embedWaiter 384/384.** Suspected mechanism: a missed direct throw embeds in the wall
    behind the target, so an instant recall is a free second shot through the target's area. This is the SPEC's
    "immediate recall dominates" failure mode, but it is unconfirmed until a strong dodger and a best-response search
    exist.
  - Ablations (full mind vs ablated):
    - **clearly load-bearing:** singleUtility 99.6% and noAttentionSchema 75.7%;
    - **null:** noMetacog 50%, noToM 55%, noPrediction and noBelief ~46%;
    - **negative:** noWorkspace 25% and noHysteresis 29%. The bottleneck as designed is pure cost.
  - The mind scans at ~280 facing reversals per minute: it has become the degenerate scanner itself.
  - The tuned mind's embeds are 72% "second location" (median 8.2 s before recall), but many end at a hard-coded 8 s
    threshold.
- Launched **p1b-fixes** (Sol high) and **p3-client** (Sol high: web play + Mind View) in parallel. They touch
  disjoint files. Job folders now live in C:\arcx\research\codex-jobs\tether\.
- **Next (my design calls):**
  1. Strong dodger + best-response search (parametrised policy family, evolutionary search) to test whether the rules
     are degenerate. If they are, run minimal rule-repair candidates through the same search before touching the mind
     again.
  2. Make the workspace pay for itself as attention does in brains: focus should buy something (sharper aim, shorter
     latency or better prediction on the attended item), paid for with worse processing of the rest. The same goes for
     metacognition and ToM: give them decisions where they matter, or report them as negatives.
  3. Penalize or reason about scan thrashing: turning costs information (motion blur during fast turns?). This is a
     rule question, so log it as a decision if adopted.
- **p1b-fixes landed** (d98049f, Sol high): all six findings addressed (H2 partial: cloned percepts, shared intrinsics documented); 69 tests. The mind now keeps a private, fallible estimate of its own hidden spear (D13 consequence).
- Launched **p4-exploits** (Sol xhigh): strong dodger, parametrised policies, best-response search, verdict on degeneracy, repair candidates only if needed.
