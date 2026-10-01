Goal: we are designing "codegame", a local harness that lets coding agents (Claude Code, Codex) build, test, playtest
and review games. It is the game counterpart of an existing film harness, whose shape is: a small contract the artefact
exposes (window.__film = {duration, ready, seek(t), ...}); one-command loops (new, preview, verify, review, status); a
per-artefact JSON record with source hashes and missing checks; and automated reviewers. The pilot game is a
deterministic plain-JS duel with a headless contract {createWorld(seed), step(world, inputs), percept(world, viewer),
hashWorld} and agents {act(percept, dt)}.

Read the actual source and docs (not only the READMEs) of these projects and extract their concrete interface designs:
1. satelliteoflove/godot-mcp: the full tool list with parameters; how input injection, time freeze/step, state query,
   screenshots and profiling work; the eval harness that runs tasks through headless Claude Code (task format,
   grading, metrics).
2. beremaran/godot-agent-loop: the skills; the `game_scenario` format; `run_project_tests`; performance evidence; how
   the build/debug/verify/ship loop is structured.
3. link1345/gua: the semantic UI/world tree schema, the virtual time API (GuaClock), the action record/replay format,
   the screenshot baseline/diff, and the MCP/WebMCP surface.
4. gamedev-skills/awesome-gamedev-agent-skills: how skills are structured and routed; list the playtest, performance
   budget, game-feel and verification skills with a one-line summary each.
5. BlackBearCC/vitric: deterministic stepping, snapshots, input record/replay, semantic screen descriptions, rule
   assertions, and the bot-swarm playtest / delivery gate.
6. Anything newer (2026, latest months first) that does agent playtesting, game-state contracts for agents,
   exploit/degenerate-strategy search, or fun/engagement metrics for agent-built games.

For each: exact function/tool names and signatures, data formats (quote short schema snippets), what worked per its
issues and discussions, and known limitations. Then synthesize:
(a) a recommended codegame contract (browser + headless), with names;
(b) a command set;
(c) the per-game record schema;
(d) reviewers worth building, ranked by value per effort;
(e) what to borrow directly (MIT/Apache code) vs re-implement.
Give sources with dates for every claim, and keep facts separate from inference.

Rules: do not create, modify or delete any file; no builds, servers, benchmarks or GPU work. You may clone nothing;
read via the web / GitHub raw URLs.
