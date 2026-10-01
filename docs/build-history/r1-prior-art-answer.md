# Research notes

I treated each repository’s `main` branch as it stood on **2026-09-26**; I call out release and paper dates where available. These are source and maintainer-document findings, not independent tests of the projects. I made no workspace changes and ran no builds, servers, benchmarks, or GPU work.

## 1. `satelliteoflove/godot-mcp`

### Tools and input shapes

The current tool reference describes **21 tools and 86 actions**. This is an editor bridge: agents can inspect or edit Godot, drive a running game, and read live runtime state. The grouped inventory below gives the tool names, actions, and their principal argument fields; the linked per-tool docs have the full required/optional distinctions and defaults. ([tools reference](https://github.com/satelliteoflove/godot-mcp/blob/main/docs/tools/README.md), current main checked 2026-09-26)

| Tool(s) | Actions and principal parameters |
|---|---|
| `godot_scene` | `open(scene_path)`, `save(scene_path?)`, `reload(scene_path?)` |
| `godot_node_read` | `get_properties(node_path)`, `get_scene_tree(max_depth?, max_children?)`, `find(name_pattern?, type?, root_path?)` |
| `godot_node_edit` | `update(node_path, properties)`, `reparent(node_path, new_parent_path)` |
| `godot_editor_read` | `get_state()`, `get_selection()`, `get_log_messages(clear?, limit?, severity?, since?)`, `get_stack_trace()`, `screenshot_game(max_width?)`, `screenshot_editor(viewport?, max_width?)` |
| `godot_editor_edit` | `select(node_path)`, `run(scene_path?, frozen?)`, `stop()`, `restart(save?)`, `rescan(paths?)`, `set_viewport_2d(center_x?, center_y?, zoom?)` |
| `godot_project` | `get_info()`, `get_settings(category?, include_builtin?)`, `addon_status()`, `check_stale()` |
| `godot_animation_read` | `list_players(root_path?)`, `get_info(node_path)`, `get_details(node_path, animation_name)`, `get_keyframes(node_path, animation_name, track_index)` |
| `godot_animation_edit` | `play(node_path, animation_name, custom_blend?, custom_speed?, from_end?)`; `stop(node_path, keep_state?)`; `seek(node_path, seconds, update?)`; create/delete/update animations; add/remove tracks and keyframes; create RESET keys. Edit arguments include animation/library names, length, loop mode, step, track type/path/index, keyframe time/value/transition, and method name/args. |
| `godot_tilemap_read` | `list_layers(root_path?)`, `get_info(node_path)`, `get_tileset_info(node_path)`, `get_used_cells(node_path)`, `get_cell(node_path, coords)`, `get_cells_in_region(node_path, min_coords, max_coords)`, `convert_coords(node_path, local_position?, map_coords?)` |
| `godot_tilemap_edit` | `set_cell(node_path, coords, source_id?, atlas_coords?, alternative_tile?)`, `erase_cell(node_path, coords)`, `clear_layer(node_path)`, `set_cells_batch(node_path, cells)` |
| `godot_gridmap_read` | `list(root_path?)`, `get_info(node_path)`, `get_meshlib_info(node_path)`, `get_used_cells(node_path)`, `get_cell(node_path, coords)`, `get_cells_by_item(node_path, item)` |
| `godot_gridmap_edit` | `set_cell(node_path, coords, item, orientation?)`, `clear_cell(node_path, coords)`, `clear(node_path)`, `set_cells_batch(node_path, cells)` |
| `godot_resource` | `get_info(resource_path, max_depth?, include_internal?)` |
| `godot_scene3d` | `get_spatial_info(node_path, include_children?, type_filter?, max_results?, within_aabb?)`, `get_bounds(root_path?)` |
| `godot_docs` | `fetch_class(class_name, version?, section?)`, `fetch_page(path, version?)` |
| `godot_input` | `get_map()`, `sequence(inputs, report?, screenshot_at_ms?, screenshot_max_width?)`, `type_text(text, delay_ms?, submit?)` |
| `godot_profiler` | `snapshot()`, `start()`, `stop()`, `get_data()`, `get_active_processes()`, `get_signal_connections(node_path?)` |
| `godot_runtime_state` | `digest(select?, group?, paths?, name?, type?, max_nodes?, include?)`, `watch_start(specs?, signals?, hz?, duration_ms?)`, `watch_collect()`, `watch_stop()` |
| `godot_game_time` | `freeze()`, `step(duration_ms? xor frames?, inputs?, report?)`, `step_until(until, max_ms?, report?, inputs?)`, `thaw()`, `status()` |
| `godot_exec` | `run(source, budget_ms?)`, `list()`, `remove(name)`, `clear()` |
| `godot_validate_meshes` | `check()` with no arguments |

The grouped parameter list is intentionally compact; for example, the animation editor has typed track and value parameters, and the tile-map calls use structured coordinate objects. Full details are in the [animation](https://github.com/satelliteoflove/godot-mcp/blob/main/docs/tools/animation.md), [tile-map/GridMap](https://github.com/satelliteoflove/godot-mcp/blob/main/docs/tools/tilemap.md), [resource](https://github.com/satelliteoflove/godot-mcp/blob/main/docs/tools/resource.md), and [3D scene](https://github.com/satelliteoflove/godot-mcp/blob/main/docs/tools/scene3d.md) definitions.

### Playtest loop, observation, and profiling

`godot_input.sequence` accepts a timed list mixing named actions, joypad buttons and axes, stick vectors, raw keys with modifiers, and relative mouse-look. Optional `report` expressions compare state before and after input; `screenshot_at_ms` captures up to eight frames during a sequence. It supports **relative** mouse motion, not absolute cursor positioning. ([input API](https://github.com/satelliteoflove/godot-mcp/blob/main/docs/tools/input.md), current main checked 2026-09-26)

For deterministic inspection, `godot_game_time.freeze` stops game time while observations remain available. `step` advances either a duration (up to 50,000 ms) or frames (up to 1,200), optionally carrying inputs and report expressions; `step_until` re-evaluates a GDScript predicate per frame, up to a bounded timeout. Inputs must be part of the step window because injecting them while frozen misses edge-triggered presses; held inputs are released at the end. `thaw` resumes play while preserving the game’s own pause-menu state. ([game-time API](https://github.com/satelliteoflove/godot-mcp/blob/main/docs/tools/game-time.md), current main checked 2026-09-26)

`godot_runtime_state.digest` returns structured runtime data. Selection can use watched nodes, nodes with `_mcp_state()`, visible nodes, or explicit paths; filters include name/type, and `include` selects fields. The docs recommend exposing both changing values and the static context needed to interpret them. `watch_start` samples requested fields and signals; `watch_collect` summarizes numeric values and returns a timeline. The docs note that navigation-server path state is not exposed. ([runtime-state API](https://github.com/satelliteoflove/godot-mcp/blob/main/docs/tools/runtime-state.md), current main checked 2026-09-26)

`godot_editor_read` captures lossless game/editor PNGs; game screenshots require a running game. `godot_profiler` works only while a game is running: `snapshot` gives engine metrics, while `start → get_data` gives time-series summaries and spike detection. Per-frame detail is limited to the last 300 frames; run-level aggregates cover the whole profile. Active-process and signal-connection actions help identify likely sources of per-frame work. ([editor API](https://github.com/satelliteoflove/godot-mcp/blob/main/docs/tools/editor.md), [profiler API](https://github.com/satelliteoflove/godot-mcp/blob/main/docs/tools/profiler.md), current main checked 2026-09-26)

### Claude Code evaluation harness and limitations

The eval harness runs `claude -p` against a real project and already-open Godot editor; **it does not launch Godot**. A task contains a natural-language prompt and `required_calls` / `forbidden_calls` entries (`tool` or `tool.action`). It passes if all required calls appear in the transcript and none of the forbidden calls do. The result JSON includes calls, errors, token usage, cost, and turn count. This evaluates tool selection and call discipline; the documented pass rule does not itself prove that the resulting game behavior is correct. The eval costs real model tokens and is deliberately not wired into CI. ([eval source and format](https://github.com/satelliteoflove/godot-mcp/blob/main/server/evals/README.md), current main checked 2026-09-26)

Two issue threads clarify tradeoffs. In **issue #194, opened 2026-05-29**, the maintainer proposed structured state as a cheaper replacement for many screenshots; the issue’s estimated 50–200× reduction was a design estimate, not a measured result. In **issue #237, opened June 2026**, a user reported multiple MCP clients contending for one editor connection; the current docs state one client/editor at a time. ([#194](https://github.com/satelliteoflove/godot-mcp/issues/194), [#237](https://github.com/satelliteoflove/godot-mcp/issues/237), [current README](https://github.com/satelliteoflove/godot-mcp))

`godot_exec` is powerful scenario setup: its `run(source)` executes GDScript in the running game. Its static denylist is documented as an **accident guard, not a security boundary**; a synchronous infinite loop cannot be pre-empted by `budget_ms`. ([exec API](https://github.com/satelliteoflove/godot-mcp/blob/main/docs/tools/exec.md), current main checked 2026-09-26)

## 2. `beremaran/godot-agent-loop`

### Skills and loop

The project’s current `3.0.0` changelog entry is dated **2026-08-04**. The current surface is 16 core tools and 56 total tools, with 40 hidden behind `godot_catalog` / `godot_call`. The core loop is:

`author → validate → run → observe → playtest → verify → refine`

The four shipped skills are:

- [`build-godot-game`](https://github.com/beremaran/godot-agent-loop/tree/main/agent-plugin/skills/build-godot-game): author a meaningful game structure, validate it, and verify what was persisted.
- [`debug-godot-game`](https://github.com/beremaran/godot-agent-loop/tree/main/agent-plugin/skills/debug-godot-game): reproduce, gather evidence, form a testable hypothesis, change one variable, and replay the same scenario.
- [`verify-godot-change`](https://github.com/beremaran/godot-agent-loop/tree/main/agent-plugin/skills/verify-godot-change): run tests and runtime checks, report objective evidence, and disclose subjective or unsupported checks.
- [`ship-godot-game`](https://github.com/beremaran/godot-agent-loop/tree/main/agent-plugin/skills/ship-godot-game): check release/export readiness, evidence, warnings, and asset provenance.

The repository publishes a shared skill tree for Claude Code, Codex, OpenCode, and Pi. ([changelog](https://github.com/beremaran/godot-agent-loop/blob/main/CHANGELOG.md), [skill directory](https://github.com/beremaran/godot-agent-loop/tree/main/agent-plugin/skills), current main checked 2026-09-26)

### `game_scenario`, tests, and performance

`game_scenario` takes `name`, optional `projectPath` and `timeoutSeconds`, and 1–100 ordered `steps`. The step types are `input`, `wait`, `observe`, `assert`, `screenshot`, and `performance`. Input steps have an allowlisted tool plus nested `arguments`; waits/assertions carry a `game_wait_until`-compatible `condition`; observation steps use allowlisted observation tools. The scenario has a 120-second maximum timeout, default 60 seconds. ([tool schema](https://raw.githubusercontent.com/beremaran/godot-agent-loop/main/src/tool-definitions.ts), current main checked 2026-09-26)

```json
{
  "name": "start-and-check",
  "timeoutSeconds": 30,
  "steps": [
    {"type": "input", "tool": "game_key_press", "arguments": {"key": "Enter"}},
    {"type": "wait", "condition": {"condition": "scene", "scenePath": "res://level.tscn"}},
    {"type": "assert", "condition": {"condition": "log", "text": "ready", "fresh": true}},
    {"type": "screenshot"}
  ]
}
```

`run_project_tests({projectPath, action, framework?, testPaths?, artifactPaths?, timeoutSeconds?, failFast?})` supports `discover` and `run`, with `auto`, `native`, `gut`, and `gdunit4` framework selection. Discovery accepts only project/action/framework/test paths; runs additionally accept report artifact paths, timeout, and `failFast`. `verify_project` has bounded runtime assertions for node existence, group count, and log text, plus optional screenshot digest and deterministic teardown. `run_project` distinguishes real-time timing from fixed 60-FPS deterministic timing. ([tool schema](https://raw.githubusercontent.com/beremaran/godot-agent-loop/main/src/tool-definitions.ts), current main checked 2026-09-26)

`game_performance` has `sample`, `start`, `stop`, `report`, `stress`, and `leaks` actions, plus bounded `sampleCount`. The project’s TODO still calls for observed frame-time distributions, process/render/GPU timing where available, and baseline/stress/recovery comparisons. Treat those as desired evidence, not guaranteed current output. Its evaluation guide also says current-model behavioral artifacts stay `not_run` until a deliberate live-client run records them; deterministic checks are not presented as a substitute. ([tool schema](https://raw.githubusercontent.com/beremaran/godot-agent-loop/main/src/tool-definitions.ts), [performance TODO](https://github.com/beremaran/godot-agent-loop/blob/main/TODO.md), [evaluation guide](https://github.com/beremaran/godot-agent-loop/blob/main/docs/evaluation.md), current main checked 2026-09-26)

## 3. `link1345/gua`

### Semantic UI and world trees

The protocol schema separates UI controls from game-world objects. The UI-tree JSON schema is version 2; it carries frame/revision information and nodes with stable IDs, roles, labels/text/value, visibility/enabled state, bounds, state, and permitted actions. A shortened shape is:

```json
{
  "schemaVersion": 2,
  "frameSequence": 18,
  "revision": 4,
  "screen": {"id": "title"},
  "nodes": [{
    "id": "start", "role": "button", "label": "Start Game",
    "visible": true, "enabled": true,
    "bounds": {"x": 10, "y": 20, "w": 160, "h": 40},
    "state": {"focused": false, "pressed": false},
    "actions": ["click"]
  }]
}
```

The actual schema is the [UI-tree JSON Schema](https://github.com/link1345/gua/blob/main/protocol/schema/ui-tree.schema.json). For the world tree, games explicitly opt in objects with stable ID, kind, position, visibility, tags, and flat primitive state; Godot uses the `gua_world_object` group and `gua_world_*` metadata. It does not dump the complete engine scene tree. Player observation profiles can omit, redact, replace, or quantize fields and restrict actions. ([Gua protocol README](https://github.com/link1345/gua/blob/main/README.md), current main checked 2026-09-26)

### Time, recordings, visuals, and tool surfaces

`GuaClock` exposes `Install()`, `Schedule(TimeSpan, callback)`, `Pause()`, and `RunFor(TimeSpan)`; bridge calls are `get_clock`, `clock_install`, `clock_pause`, `clock_run_for`, and `clock_resume`. This only controls logic already wired to the clock. Native timers, physics, animations, audio, OS time, and networking continue normally. ([Gua README, virtual-time section](https://github.com/link1345/gua/blob/main/README.md), current main checked 2026-09-26)

`Gua.Testing.Recording` captures semantic operations and replays them with correlated host completion. The schema file is [`recording.schema.json`](https://github.com/link1345/gua/blob/main/protocol/schema/recording.schema.json). The Inspector also imports/downloads recordings; sensitive values can be supplied from an in-memory map. Its docs say schema-v1 coordinate fallback recordings may be accepted, but Inspector replay is semantic-target-only by default. I’m not guessing the recording schema’s exact property names from the MCP command format. ([Recording package and Inspector docs](https://github.com/link1345/gua/blob/main/README.md), current main checked 2026-09-26)

Visual comparison can use a screenshot or selected image as baseline; failures retain Expected, Actual, Diff, and a machine-readable manifest. The MCP/WebMCP surface includes semantic UI actions, world-tree queries, game input, waits, screenshots/logs, clock calls, recording/replay, visual comparison, and `run_test`. The full MCP surface is listed in the [README](https://github.com/link1345/gua/blob/main/README.md). Browser `document.modelContext` integration is explicitly experimental. WebMCP runs against an engine-owned same-page bridge without WebSocket; raw input tools are registered only when the host initializes input and cleanup, and player-facing input is separately denied by default. ([visual, MCP, WebMCP sections](https://github.com/link1345/gua/blob/main/README.md), current main checked 2026-09-26)

## 4. `awesome-gamedev-agent-skills`

The collection contains 73 skills organized by engine, discipline, genre, and workflow. Each skill is a directory with a required `SKILL.md` containing `name` and `description`; optional references are read on demand, and optional scripts hold repeatable helpers. The router detects one engine, classifies task/genre/workflow, loads only the selected skills, and reroutes when the task pivots. ([catalog](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/README.md), [skill format](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/docs/SKILL-FORMAT.md), [router](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/router/SKILL.md); current main checked 2026-09-26)

Among the requested topics, the actual catalog contains:

- [`game-feel`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/game-feel/SKILL.md): layer short, proportionate feedback—such as easing, hit-stop, shake, sound, and knockback—on top of an existing mechanic; verify that it settles and does not block input.
- [`performance-optimization`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/performance-optimization/SKILL.md): profile a representative case first, identify CPU/GPU bottleneck, fix and remeasure, then define subsystem and asset budgets.
- [`prototype-fast`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/workflows/prototype-fast/SKILL.md): build a time-boxed greybox to answer one question, playtest it immediately, and make an explicit keep/kill/refactor call.

**The named repository has no dedicated skill named `playtest`, `performance-budget`, or `verification`.** `prototype-fast` is its closest playtest workflow; `performance-optimization` does include budgets; there is no verification skill in its 73-skill catalog. ([catalog](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/README.md), current main checked 2026-09-26)

## 5. `BlackBearCC/vitric`

### Deterministic simulation and evidence

Vitric’s agent API uses HTTP JSON-RPC. Representative calls are `sim/pause`, `input/inject({action, phase})`, `sim/step({ticks})`, `world/get({entity})`, `render/describe({width?, height?})`, and `sim/hash()`. It supports `sim/snapshot()` and `sim/restore({snapshot})`; snapshots include world, tick, RNG, pending inputs, and carried-over events. Scripts use `ctx.random()` and `ctx.tick`; `Math.random`, `Date.now`, and implicit current time are blocked. Replay determinism is promised per platform/binary, **not across platforms**, since system math libraries can differ. ([agent guide](https://github.com/BlackBearCC/vitric/blob/main/docs/agent-guide.en.md), current main checked 2026-09-26)

`render/describe` provides semantic entities, screen/world coordinates, overlaps, off-screen direction/distance, declared action vocabulary, and subsequent-call diffs. If a focal entity exists, it adds relative direction/distance/line-of-sight and an ASCII map. `render/screenshot` provides a headless PNG. Rules support per-tick assertions such as:

```json
{"id": "hp-nonnegative", "if": [["@player.Health.hp", ">=", 0]]}
```

Assertion failures and entity/event budget overruns are reported during simulation. ([agent guide](https://github.com/BlackBearCC/vitric/blob/main/docs/agent-guide.en.md), current main checked 2026-09-26)

Delivery gates replay a recording from cold project data, require a terminal event such as `game-won`, and evaluate assertions each tick. A shortened manifest example is:

```json
{
  "gates": {
    "playthroughs": [{"recording": "qa/clear.json", "must_emit": "game-won"}],
    "assertions": "qa/asserts.json",
    "check": true,
    "max_ticks": 100000
  }
}
```

An empty playthrough-gate set does not pass; `vitric bundle` refuses to ship unless the gate passes. ([gate format and delivery behavior](https://github.com/BlackBearCC/vitric/blob/main/docs/agent-guide.en.md), current main checked 2026-09-26)

### Swarm playtests and limitations

`vitric playtest` supports strategies including `random`, `greedy`, `coverage`, `seed-perturb`, `economy`, and optional LLM sessions; reports can include clear/reachability, softlocks, unused content, pacing, dominant strategy, and economy failures. `seed-perturb` starts from a known winning recording and changes the sequence around decision points. Each result can link to a replayable trace. The maintainer’s **2026-06-16** design note reports six phases landed, dogfood fixes to false positives, 649 tests green, and an `echo` trial with 62.5% clears and full ending coverage. Those are maintainer-reported results, not an independent evaluation. The same document explicitly says the swarm checks mechanical foundations; it does not judge fun, feel, art, or story resonance. ([playtest design and reported dogfood results](https://github.com/BlackBearCC/vitric/blob/main/docs/design-agent-playtest.md), [agent guide](https://github.com/BlackBearCC/vitric/blob/main/docs/agent-guide.en.md))

The project is pre-1.0 and its README lists cross-platform determinism hardening, performance measurement, and stability/security work as areas needing further hardening. That matters if borrowing the approach as a codegame guarantee. ([Vitric status and roadmap](https://github.com/BlackBearCC/vitric), current main checked 2026-09-26)

## 6. Recent 2026 work

These are the closest primary-source results I found, newest first; this is a selected list, not an exhaustive literature review.

- **2026-09-18; revised 2026-09-21 — GameLogicBench.** 72 Godot gameplay tasks, 403 scenarios, and 1,451 seeded cases; checks game rules every simulation tick and validates its evaluator against mutants. The best reported model/scaffold run solved 52.78% of tasks. Authors also report public-network code copying, a warning that an evaluation harness must test behavior and control for external code access. ([paper](https://arxiv.org/abs/2609.21562))
- **2026-09-18 — GameASG-Bench.** Declares the evaluation interface *before* generation: legal starting cases, player actions, stable snapshots, rejection behavior, and invariants. It combines static compliance checks with browser checks using semantic observations and real input. Across 47 tasks, the strongest reported mean L2 pass rate was 93.2%, while strict all-check task success was 55.3%. ([paper](https://arxiv.org/abs/2609.21293))
- **2026-08-22 — GameXpert-Bench.** Separates game creation, bug discovery/repair, and multi-turn optimization; uses live interaction, deterministic behavioral tests, or final product checks with regression testing. Its 97 generation tasks, 100 repair tasks, and 17 optimization chains found agents more reliable at explicit requirements than at discovering defects and preserving behavior through changes. ([paper](https://arxiv.org/abs/2608.21833))
- **2026-07-17 — Compiled Agency.** Gives a coding agent a game description and raw observation/action API, lets it build a standalone controller, then freezes that controller for held-out evaluation without per-move model calls. The authors report held-out success ranging 0–86% on a procedural roguelike and successful controllers for other large games. ([paper](https://arxiv.org/abs/2609.18996))
- **2026-07-15 — “People use fast and flat simulation to reason about new games.”** In novel turn-based board games, a model using game balance, reward for strategic thinking, and expected game length predicted pre-play fun ratings with \(R^2=0.57\), versus human split-half \(R^2=0.60\). The 246-person funness study concerns small strategic board games and pre-play judgments; it is a candidate for a human-calibrated secondary measure, not a general fun score for a real-time duel. ([Nature paper](https://www.nature.com/articles/s41586-026-10722-1))
- **2026-05-27 — GUI Agents for Continual Game Generation.** PlaytestArena uses 200 browser game-generation tasks across eight genres and rubrics for expected in-play behavior; the paper reports Play2Code’s iterative coding-agent/GUI-playtester loop reached a 66.8% rubric pass rate. ([paper](https://arxiv.org/abs/2605.28258))
- **2026-05-17; revised 2026-05-21 — WebGameBench.** Evaluates the delivered browser game through real runtime interaction with `EXCELLENT` / `USABLE` / `UNUSABLE` labels. On a human-reviewed subset, runtime labels broadly aligned with human review under the usable-rate criterion; its best reported configuration had a 76.9% usable rate and 20.2% excellent rate. ([paper](https://arxiv.org/abs/2605.17637))

# Recommendations for codegame — inference

The following is design guidance inferred from the above interfaces and results, not an existing project fact.

## (a) Recommended contract

Keep the pilot’s four headless names as the stable core. Make `step` advance **exactly one fixed simulation tick**; define whether it mutates `world` or returns a replacement, and keep that behavior consistent. Avoid wall-clock reads, global randomness, and render state in simulation. Keep the per-viewer `percept` bounded and explicit about what the agent may know.

```js
// headless module
export function createWorld(seed) {}
export function step(world, inputs) {}          // one fixed tick
export function percept(world, viewer) {}
export function hashWorld(world) {}             // canonical simulation state

export function snapshotWorld(world) {}         // includes RNG/tick/input state
export function restoreWorld(snapshot) {}
export function render(world, canvas) {}        // presentation only
```

Wrap that same implementation for browser use:

```js
window.__codegame = {
  contractVersion: 1,
  ready: Promise.resolve(),
  tickRate: 60,
  reset(seed),
  advance(ticks, inputsByTick),
  percept(viewer),
  hashWorld(),
  snapshot(),
  restore(snapshot),
  render(canvas)
};
```

The browser wrapper should call the headless functions; rendering should never advance simulation. Keep `act(percept, dt)` as the policy interface, with `dt` fixed to the documented decision interval. Record each returned action so replay does not depend on re-running a stochastic or external agent.

## (b) Command set

Keep the film harness’s familiar commands and add game-specific replay and playtesting:

- `codegame new NAME [--template duel]`
- `codegame preview [--seed N]`
- `codegame verify [--scenario FILE] [--seeds N]`
- `codegame playtest [--seeds N] [--policies ...]`
- `codegame replay TRACE`
- `codegame review [--only ...]`
- `codegame status`
- `codegame ship` — a gate that requires the required checks to pass.

## (c) Per-game record

Use a versioned JSON sidecar such as `codegame.json`. Record the contract, source hashes, checks and missing checks, and point to evidence by path and digest. Keep run results immutable; update pointers to the latest run rather than overwriting old evidence.

```json
{
  "schemaVersion": 1,
  "game": {"id": "duel", "contractVersion": 1},
  "sources": {
    "treeSha256": "...",
    "files": [{"path": "src/sim.js", "sha256": "..."}],
    "assets": [{"path": "assets/arena.png", "sha256": "...", "license": "CC0"}]
  },
  "checks": {
    "contract": {"status": "pass", "evidence": ["runs/contract.json"]},
    "scenarios": [],
    "playtests": [],
    "reviews": [],
    "missing": [{"id": "human-feel-review", "status": "not_run"}]
  },
  "runs": [{
    "id": "...",
    "seed": 42,
    "simVersion": 1,
    "policyHashes": {},
    "trace": {"path": "runs/trace.json", "sha256": "..."},
    "status": "pass"
  }]
}
```

Use explicit statuses such as `pass`, `fail`, `unsupported`, `not_run`, and `stale`. A source-hash change should mark prior evidence stale.

## (d) Reviewers ranked by value per effort

1. **Contract and determinism checks** — same seed and inputs must reproduce the same `hashWorld`; test snapshot/restore and canonical serialization. High value, low effort.
2. **Tick-level rules and invariants** — bounds, health, cooldowns, legal transitions, and rejection behavior across seeded scenarios. High value, low-to-medium effort.
3. **Scenario verification** — prove ordinary play, damage, victory/loss, reset, and input-to-state effects with recorded traces. High value, low effort.
4. **Degenerate-strategy search** — seat-swapped policy matrices, mirror matches, seeded random search, action coverage, and best-response variants. Track win rate, match duration, damage, and unused actions. High value, medium effort.
5. **Semantic/UI and visual review** — verify visible controls and layout structurally, then use baseline diffs and screenshots for appearance. Medium value, low-to-medium effort.
6. **Performance review** — profile the same seeded trace and report simulation tick-time percentiles and memory growth. Medium value, low effort once evidence capture exists.
7. **Human-calibrated feel/fun review** — get blinded human judgments and retain them beside the objective reports. Potentially valuable, but expensive and unsuitable as an initial pass/fail gate. The 2026 funness result is too domain-specific to substitute for human feedback on the duel.

## (e) Borrow directly vs. reimplement

- **Good direct-adaptation candidates:** small JSON schemas and validation patterns, bounded scenario formats, replay/gate manifest structure, screenshot-diff artifact conventions, and skill routing/playbook structure. Gua, Godot Agent Loop, and Vitric are MIT-licensed; the skills collection is Apache-2.0. Preserve the applicable license and attribution notices when copying. ([Gua license](https://github.com/link1345/gua/blob/main/LICENSE), [Agent Loop license](https://github.com/beremaran/godot-agent-loop/blob/main/LICENSE), [Vitric license](https://github.com/BlackBearCC/vitric/blob/main/LICENSE), [skills license](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/LICENSE))
- **Reimplement for codegame:** the simulation adapter, duel-specific percepts, seeded policy search, and source-hash record integration. The Godot bridges are engine-bound; Vitric’s simulation is primarily Rust; Gua’s runtime centers on native/C ABI adapters. Their contracts and evidence patterns transfer better than their full runtimes.
- **Borrow the evaluation lesson:** grade behavior and invariants, not just whether an agent called the expected tools. Keep tool-use traces as diagnostic evidence, but make the required pass gate depend on replayable game outcomes and per-tick checks. ([GameLogicBench](https://arxiv.org/abs/2609.21562), [GameASG-Bench](https://arxiv.org/abs/2609.21293))

