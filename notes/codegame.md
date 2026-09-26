# Toward "codegame": what Tether teaches (the tool is the real product of this session)

Owner, 2026-09-26: this session is used to figure out the skills, taste and plumbing needed to make something like
codefilm for games. Tether is the pilot. Every phase appends what it needed, what hurt, and what should become a
reusable part.

## codefilm's shape, to mirror (from tools/codefilm/README.md)
- **A contract** the work exposes: `window.__film = {duration, ready, seek(t), renderAudio, marks, shots}`.
- **One-command loops:** `new`, `preview`, `check`, `verify`, `review`, `status`, each printing the next command.
- **A record per artefact** (`<out>.json`): source/scene hashes, append-only history, which checks ran on the current
  hash, and `missing` checks.
- **Reviewers:** determinism verifier (repeat, cold-jump and reverse seeks), stillness analysis, contact sheet, audio
  report, offline player with scrubber.

## Candidate codegame equivalents (hypotheses; confirm or kill with Tether evidence)
- **Contract:** a headless game module `{CONSTANTS, createWorld(seed), step(world, inputs), percept(world, viewer, mode),
  hashWorld}`, plus agents `{act(percept, dt)}`. In the browser: `window.__game` exposing the same functions plus
  render(viewer).
- **Commands:** `new`, `test` (rules checklist), `play` (browser), `arena` (tournaments: strategies, ablations, exploit
  search), `replay` (log player plus overlays such as the Mind View), `review` (report: degenerate strategies,
  engagement proxies, perf), `status` (record + missing checks).
- **Record:** source hash, rules-constant hash, test results, tournament tables with CIs, playtest telemetry, the human
  sessions list.
- **Reviewers:** determinism/replay verifier; degenerate-strategy search; "second location"-style hypothesis metrics
  declared by the game; perception-leak scanner; feel metrics (time to first meaningful decision, dead time, score
  volatility); visual contact sheet of key moments (GPU, gated).

## Lessons by phase
### Phase 0 (spec to plan)
- A precise rules spec with a verification checklist (the owner's) was the single best input. Codegame's `new` should
  scaffold SPEC.md with sections for rules, constants, hypotheses, failure modes and checklist.
- The hostile pass (degenerate strategy, skill collapse, exploit search, ...) maps directly onto arena tournaments.
  That is a reusable reviewer, not a one-off.
- Taste call: keep the rules frozen and put the ambition in the opponent and the instruments. Resist adding systems.
- Plumbing gotcha: a fresh git repo has no identity, so agents' commits fail. `new` must set it.

## Prior art (from the earlier code-to-game research; my assessment of what each contributes)
- **Godot MCP (satelliteoflove, MIT).** Input injection, time freeze/step, structured state queries, screenshots,
  frame-time profiling, and an eval harness running tasks through headless Claude Code.
  - Borrow: the **state-first, screenshots-only-for-visual-questions** rule.
  - Borrow: the **eval harness idea**, i.e. measure how well agents build and fix games *with* codegame. This is the
    harness's own test.
- **Godot Agent Loop (MIT).** Deterministic `game_scenario`, input simulation, test runners, performance evidence.
  Borrow the scenario-as-test format. Windows coverage is runtime and input only.
- **Gua (MIT).** Semantic UI/world tree, virtual time, action record/replay, screenshot diff. The semantic tree matters
  for UI-heavy games; Tether's `percept()` is the same idea for world state.
- **Awesome GameDev Agent Skills (Apache-2.0).** 73 skills. The skills layer (game feel, perf budgets) is where
  *taste* can be packaged. Adopt selectively.
- **Vitric.** Bot-swarm playtests as a delivery gate. Tether's arena is the same idea plus ablations and exploit
  search.
- **Engine routes:** Tether runs as "route 0": a pure-JS deterministic core with any renderer (canvas now; Three.js or
  Pixi later). Codegame's contract should be engine-agnostic at the core. Godot enters as an adapter through its MCP,
  not as the foundation.
- Research job r1-prior-art (Luna max) is extracting their exact interfaces and formats (jobs/r1-prior-art/answer.md).

## r1 prior-art result (Luna max, 780k tokens; full report in research/2026-09-26-prior-art-interfaces.md)
- It confirms the headless core `{createWorld, step (one fixed tick), percept, hashWorld}`. It adds
  **snapshotWorld/restoreWorld**, which Tether's NPC counterfactual reflection needs anyway. Add these in p2.
- Browser wrapper: `window.__codegame = {contractVersion, ready, tickRate, reset, advance(ticks, inputsByTick), percept,
  hashWorld, snapshot, restore, render}`. Rendering never advances the sim.
- Commands: new, preview, verify, playtest, replay, review, status, ship (gate).
- Record: `codegame.json` with source tree hash, checks with statuses pass/fail/unsupported/not_run/**stale** (a
  source-hash change marks old evidence stale), and immutable runs.
- Reviewers by value per effort: determinism, invariants, scenarios, degenerate-strategy search, semantic/visual,
  perf, human feel.
- Borrow schemas and conventions (MIT/Apache, keep notices); reimplement runtimes. Eval lesson (GameLogicBench,
  GameASG-Bench, Sep 2026): grade replayable outcomes and invariants, not tool-call traces.
### Phase 1 (sim core)
- A spec with numeric constants plus a checklist let Sol build the full core in one shot (35 tests, 128k tokens).
  Codegame's `new` template should require exactly that shape.
- Separate "the tests pass" from "the tests check the rule": an adversarial review job (rv1) is part of the loop. It
  is a candidate `codegame review --tests` reviewer.

### Phase 2 (mind and arena)
- The reusable core is `arena/core.mjs`: inject a game module and adapter, step perception-only agents, record inputs/hashes/traces, and replay to verify. The arena never imports Tether; its adapter owns player IDs, score extraction, strategies, and behavior metrics.
- A generic `codegame arena` command needs a declarative pair matrix, shared seeded seat rotations, worker limits, and confidence intervals. The Tether first pass keeps raw bout results so new summaries can be computed without rerunning expensive simulations.
- A game-specific metric definition must travel with the report. Here, "second location" is an embed held more than 2 seconds while the owner travels at least 2 units and reaches 1 unit from its starting body position. This operational definition is reviewable and can be changed without touching rules.
- Replay hashes and mind traces are separate streams: the former verify simulation, the latter explain agent decisions. A generic scrubber can join them on tick. Snapshot/restore gives replay a starting state and later counterfactual branches.
- A scoring reset initially inflated the "second location" metric by treating the teleport as player travel and inflated scan reversals by treating reset facing as a turn. The adapter now uses HIT event positions for pre-reset travel and excludes reset facing. Codegame should scaffold transition-boundary metric tests and attach a metric-definition version to every run.
- Tooling still wanted: a progress-aware tournament dashboard with partial aggregates and worker memory monitoring; paired-seed confidence interval tooling; automatic metric version tags; a percept-leak fuzzer; and an interactive CPU-only trace inspector before any browser client exists.
- The adversarial test review paid off at once: 3 high, 2 medium, 1 low, plus weak tests. `review --tests` becomes a
  core reviewer.
- My own brief introduced a SPEC violation. Codegame should check briefs against SPEC, or better, generate the
  perception contract from the SPEC's visibility section.
- Agent isolation: percept deep copies are not enough in a shared realm. Codegame runs agents in worker threads with
  structured clone at the boundary.
- Plumbing: a job's files vanished inside the repo's gitignored jobs/ folder. Keep job logs outside the working tree
  that agents edit (e.g. C:\arcx\research\codex-jobs\<game>\).
- Rollout JSONL `task_complete.last_agent_message` recovers a final answer when answer.md is lost. Build this into
  job status tooling.
### Phase 2 (mind + arena)
- The arena immediately answered the design's biggest question (does immediate recall dominate?) with 8k bouts in 8
  minutes. **Tournaments are the core loop of codegame**, the equivalent of codefilm's preview.
- Scripted strategies need their own validation: Sol found `embedWaiter` shooting through the spawn opponent. Codegame
  should sanity-check strategy scripts (they do what their name says) before trusting tables.
- Metric definitions must be versioned (`metricVersion`) and must exclude teleports/resets.
- A named-strategy round robin is not a best-response search. Plan a parametrised-policy search as a standard reviewer
  (`codegame review --exploits`).
- The ablation table format (full vs ablated, paired seeds, Wilson CIs, a "reading" column) is reusable as-is.
