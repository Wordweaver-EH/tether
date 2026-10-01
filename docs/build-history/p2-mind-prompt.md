You are building phase 2 of "Tether" in C:\arcx\games\tether: the NPC mind, v1. Read SPEC.md (rules), DESIGN.md (the
project: the "mind" section, the indicator audit and the phases), and README.md plus src/ (phase 1: sim, perception,
headless harness, tests; already built and passing).

This is the heart of the project. The NPC must be:
- a fun, fair, readable opponent for a human;
- a mind whose parts are real and measurable.
Build DESIGN.md's mind items 1-3 fully, plus gaze/action and embodiment. Scaffold items 4-10 as interfaces with simple
first versions; phase 4 deepens them. Design choices are yours, within DESIGN.md's intent. Prefer clarity and
measurability over cleverness.

Requirements:
1. `src/mind/` as ES modules, no dependencies. `createMind({seed, difficulty, ablations})` returns an agent with
   `act(percept, dt) -> input` for `src/headless.mjs`.
   - It sees ONLY percepts. Add a test that proves this: the agent never touches the world object, and a percept with
     the opponent hidden gives it no information about the opponent.
   - Embodiment limits: percept queue latency (~150 ms by default), aim motor noise that scales with target angular
     speed, and the same input limits as a human. `difficulty` scales them and the decision thresholds, never its
     information access.
2. **Cognitive cycle at 30 Hz** (from the 120 Hz sim ticks): perceive, belief update, specialists, workspace, broadcast,
   act.
   - **Belief:** a particle filter over the opponent's position and velocity, including negative evidence (particles
     inside my current cone that are not observed get removed or downweighted). Also a belief over the opponent's spear
     (state and position, remembered with staleness).
   - Prediction and surprise: the observation's negative log-likelihood under the predicted belief.
   - **Specialists:** Threat, Hunt, Anchor (my embedded spear: hold, bait, recall when the predicted opponent crosses
     the fixed recall line), Contest (neutralize theirs), Search, Deceive (act when predicted unobserved). Each returns
     a candidate `{content, salience, wants: {gaze?, move?, throw?, recall?}}`.
   - **Workspace:** one focus, an ignition threshold, hysteresis (hold threshold below entry), and a refractory period.
     The winner is broadcast to the gaze controller, motor planner, action gate, memory and speech.
   - **Gaze controller:** turns toward what the focus needs. A simple attention schema: per-item staleness with a
     refresh schedule.
   - **Motor planner:** move targets that respect geometry. The mind may use its own copy of the rules to predict (e.g.
     spear lines), but only on beliefs.
   - **Metacognition v1:** confidence per belief (dispersion and staleness) that gates actions (no throws at
     low-confidence targets) and triggers look-agains.
3. **Mind trace** for the Mind View and the audit: `mind.trace()` returns per-cycle records with focus, all specialists'
   saliences, ignition events, a belief summary (mean, covariance, entropy, a particle sample capped at 64), confidence,
   surprise, the self-attention schedule, a simple model of the opponent's cone, affect scalars, and an inner-speech
   line generated ONLY from workspace transitions (a report, never invented separately). `headless.runBout` gets an
   option to capture traces into the log.
4. **Ablations:** `ablations` flags for every row of DESIGN.md's audit table that exists in v1:
   - `noBelief` (current percept only);
   - `noPrediction` (constant-position prior);
   - `singleUtility` (no specialists: one merged utility);
   - `noWorkspace` (no bottleneck: each output picks from its own best specialist);
   - `noHysteresis`;
   - `noMetacog` (beliefs treated as certain);
   - `noAttentionSchema` (fixed-interval gaze sweep);
   - `noToM` (no opponent-attention model, Deceive disabled).
   Each flag must be a real code path, not a no-op.
5. **Scripted strategy families** in `src/agents/strategies.mjs`. These are the owner's hostile-pass degenerate
   strategies:
   - immediateRecaller (throw at the opponent or wall, recall at once);
   - camper (holds a corner, throws only at the visible opponent);
   - spinner (constant 360-degree scanning);
   - spearRusher (always neutralizes when it knows where the enemy spear is);
   - directShooter (never embeds on purpose, only direct throws);
   - embedWaiter (embeds on geometry and waits for the recall line).
   All obey perception.
6. **`arena/tournament.mjs`** (Node, CPU, multi-process via worker_threads, up to 8 workers, to leave CPU for other sessions):
   - round robin: the mind at 3 difficulties, the ablated minds, and all strategies;
   - N seeded bouts per pair in both modes (A and B);
   - output JSON plus a markdown summary: win rate with 95% CIs, score margins, and behavior metrics. The metrics:
     - embed-to-recall delay distribution;
     - fraction of embeds left more than 2 s with positional play in between (the SPEC "second location" pattern:
       define a precise operational metric and document it);
     - neutralizations;
     - look-away time;
     - scan reversals per minute;
     - hits taken within 1 s of a look-away.
7. **Run a first tournament** (enough bouts for CIs of about ±5 pp on the key pairs; CPU only) and write
   `reports/phase2-tournament.md` answering:
   - Does any degenerate strategy dominate?
   - Does immediate recall beat embed-and-wait?
   - Does the full mind beat each ablation? Which ablations change nothing (honest negatives)?
   - Is the mind beatable by a simple strategy (a fun problem)?
   - Does Mode B change the behavior metrics?
   Then tune the mind (not the rules) as far as time allows, re-run, and report before/after.
8. Tests for all of the above (`node --test` must stay green, including phase 1). Keep the performance of the
   headless bouts documented.

Also add `snapshotWorld(world)` / `restoreWorld(snapshot)` to the sim contract (the mind's counterfactual reflection and the arena use them).

Generality (this project is also the pilot for a reusable "codegame" harness, like tools/codefilm for films):
- `arena/` and the replay/trace plumbing must take the game as a module implementing
  `{CONSTANTS, createWorld, step, percept, hashWorld}` plus agents `{act(percept, dt)}`, with no Tether-specific
  imports outside a small adapter. Tether-specific metrics go in an adapter file.
- In your final message, list what was reusable, what was game-specific, and what tooling you wished you had.

Rules:
- Write only inside C:\arcx\games\tether.
- Do not change SPEC rules or the sim's behavior. If you find a sim bug, fix it with a test and list it.
- No browser, no GPU, no servers.
- Commit when green, with the message ending in `Co-Authored-By: GPT-6 Sol <noreply@openai.com>`.

Final message: architecture summary, files, test counts, tournament headline results with CIs, honest negatives, tuning
done, open issues, and what you would build next.
