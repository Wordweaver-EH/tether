# Handoff: continue Tether (for the owner's ChatGPT Dot, 2026-10-01)

Repo: github.com/Wordweaver-EH/tether (private). Work on your own cloud computer (clone the repo there); do not use the owner's PC or start Codex / Work tasks (those bill a different budget). Start by reading this file, then SPEC.md, DESIGN.md, notes/decisions.md and notes/log.md; docs/build-history/ has the briefs and summaries of every earlier build phase (p2-mind = the mind design, p4-exploits = task 1); docs/background/ has the owner's broader functional-consciousness design that Tether's mind is a test bed for (context, not a spec).

## The project
Tether is a deterministic spear-duel web game, human vs a non-LLM NPC "mind". Plain JS, Node >= 20, no dependencies, no build step. `SPEC.md` = the game rules (authoritative, do not change rules without a decision record). `DESIGN.md` = the plan and build phases. `notes/decisions.md` = D1-D18 (read before working). `notes/log.md` = history. Run `node --test` (84 tests, all green at the last commit); CPU tournaments: `node arena/tournament.mjs ...` (README).
Goal: show (a) the game is engaging and (b) the NPC has many mechanisms usually listed as parts of functional consciousness (attention, belief, working memory / workspace, metacognition, attention schema, theory of mind, affect, learning) - each counted ONLY if an ablation of that mechanism changes behavior in tournaments (D4, D14: under a finite per-cycle cognition budget).

## State at hand-off
Phases 1-3 done (sim + perception + tests, Mind v1, web client + Mind View replay, browser smoke test). Phase 4 started: `p4-exploits` (strong dodger, parametrised policies, best-response search, degeneracy verdict) was paused mid-search; its work-in-progress is on branch `wip/p4-exploits` (arena/search*, src/agents/dodger.mjs, param.mjs, spear-memory.mjs, reports/phase4a-*.json, edits to sim.js / perception / tether-adapter).

## Tasks, in order (one PR per item, each with tests green and a short report in reports/)
1. **Finish p4-exploits:** does any simple strategy (e.g. immediate recall) dominate? Best-response search against the tuned mind; verdict with numbers; repair candidates only if a degenerate strategy exists (rule changes need a decision record, not silent edits).
2. **Cross-runtime determinism (must-fix):** a browser-produced log diverges in Node's verifier at tick 132 (tiny float difference in facing). Make the sim's math deterministic across V8 builds (own trig / rotation or quantised facing), with a test that replays a browser log in Node.
3. **Phase 4 Mind v2:** metacognition, attention schema + theory of mind, affect, memory and learning (D16 four competence stages with light tabular / linear RL, D17 in-session Bayesian adaptation), counterfactuals; D15 processing tiers. Each mechanism behind a switch so it can be ablated.
4. **Phase 5 indicator audit:** tournaments with each mechanism ablated (equal cognition budget), effect sizes with confidence intervals, a static report page; mechanisms with no behavioral effect are reported as negatives, not dropped silently.
5. **Small taste fixes** from the smoke review: NPC cone tinted orange and fainter, darker outside-cone space, distinct held-spear vs facing notch, check Mind View focus lock on "Deceive".

## Rules
CPU only (the tournaments fit an 8-worker run). No LLM inside the NPC (D3). Keep replay determinism and the log format. Do not change SPEC rules without a decision entry. Work on branches, open PRs, never force-push master. Report progress with numbers (bouts, win rates, effect sizes), not adjectives; say plainly when something did not work.
