# Tether

A deterministic spear-duel web game and CPU-only test bed for a non-LLM cognitive architecture. Play a human against the NPC, inspect its recorded mind state, and test cognitive mechanisms through explicit ablations. Plain JavaScript, Node 24, no package dependencies and no build step.

`SPEC.md` governs the game rules. `DESIGN.md` describes the research plan. The motivating cognitive-architecture document in `docs/background/` is context, not a claim that the full design or subjective consciousness has been implemented.

## Current status

The implementation/evaluation pass is complete, with explicit unmet goals and verification limits. The playable code is the **post-audit affect-repaired revision**, source `c3ead812…fc55cd`. It passes **146/146** delivery tests and has a separate 768-bout targeted study.

The earlier **original v2** build, source `19800346…0bc9e5`, completed the Phase 4 search, 39,168-bout mechanism audit, and 8,704-bout learning/adaptation study. Those results are preserved under their original version. They must not be relabeled as full evaluations of the repaired controller; its full 16-ablation/budget/learning/exploit reruns remain unperformed.

Prediction and adaptive gaze helped in original v2; the narrow opponent-cone heuristic hurt. Its affect path was structurally ineffective, prompting the separately tested repair. The predicted workspace scarcity pattern, four-stage competence trajectory, and primary adaptation hit-rate benefits were not demonstrated. A user-supplied Edge 154 replay fixture passes Node verification (3,600 ticks, 601 samples); live presentation and human engagement remain unverified. No game-rule change was adopted.

- [Results and honest scope](RESULTS.md)
- [Acceptance status and open goals](CURRENT_STATUS.md)
- [Independent evidence review](reports/independent-review/evidence-review.md)
- [Reproduce tests, versioned experiments, and browser replay](REPRODUCE.md)
- [Evidence index](reports/README.md)
- [Source, authorship, and license provenance](PROVENANCE.md)
- [Original owner handoff and earlier build briefs](docs/build-history/README.md)

## Play

```sh
node serve.mjs
```

Open `http://localhost:8765/`. The server binds only to localhost. Choose easy, normal, or hard, and Mode B (forward cone, default) or Mode A (full view). Bouts last five minutes.

- WASD moves; the mouse sets desired facing, subject to the 360°/second turn limit
- Left click throws; right click or Space recalls an embedded spear
- Esc pauses; the sound button mutes action and score tones
- Optional gamepad: left stick moves, right stick faces, right trigger throws, left trigger recalls

The client keeps one local opponent-memory profile in browser storage, saves it after completed/interrupted play, and reuses it for rematches. The reset-learning control confirms before clearing that profile. Storage failures are handled in the code; actual browser-reload persistence has not been reverified in this environment.

After a bout, download the JSONL log. Open `http://localhost:8765/replay/` and choose or drag in the file. Mind View verifies raw-input replay and offers a scrubber, speed/frame controls, event jumps, world/belief overlays, and recorded cognitive readouts. An observed long-lived focus is not automatically a viewer bug.

## Tests

```sh
node --test                            # 146 tests: repaired implementation + delivery diagnostics
node --test test/*.test.mjs            # 139 repaired implementation/runner tests
node --test delivery-tests/*.test.mjs  # 7 diagnostic-server tests
```

The cross-build affect regression materializes checksum-verified original source from the pinned data-branch commit; run `git fetch origin data/tether-evidence-2026-10-02` first in shallow clones. `ORIGINAL_SOURCE` can override it. See [REPRODUCE.md](REPRODUCE.md). The original 131-test suite and its original source are retained in the frozen archive. Diagnostic helpers and portability-only test changes are documented separately from the evaluated production fingerprints.

## NPC architecture

The normal mind receives percepts after a 150 ms queue, runs a 30 Hz cognitive cycle, and has a default 192-unit declared logical-work cap. Difficulty changes delay and action noise, never visibility. The belief tracks uncertain opponent position/velocity and remembered spear state. Specialists compete for a workspace focus, which affects attention, movement, action, and recorded inner speech.

Mind v2 adds bounded reflex/intuition/deliberation tiers, outcome-trained tactical values, metacognitive error awareness, an automatic-habit candidate path, percept-only opponent adaptation, bounded counterfactual simulation, and persisted memory. The post-audit revision additionally repairs appraisal-driven workspace persistence. Automatic labels do not guarantee execution of the learned tactic: embedded-state choices can be overwritten by downstream action rules. Every claim of behavioral contribution depends on the corresponding ablation evidence. An implementation test is not evidence of improved tournament play or consciousness.

The work ledger is a reproducible **logical cost model**, not an assertion of exact CPU-time, energy, instruction-count, or wall-clock equality. Full and ablated minds share the same configured cap. The separate searched policy controllers are not matched for action rate, motor noise, cognition cap, or offline training; their win rates cannot isolate cognitive mechanisms.

Exported switches: `noBelief`, `noPrediction`, `singleUtility`, `noWorkspace`, `noHysteresis`, `noMetacog`, `noAttentionSchema`, `noToM`, `noReflex`, `noIntuition`, `noDeliberation`, `noLearning`, `noAutomatization`, `noAdaptation`, `noCounterfactual`, `noAffect`.

D18's optional terminal-reward-only emergent-objective experiment is not implemented. The actual learner uses sparse short-horizon score credit. The four competence stages and workspace advantage under scarce compute are hypotheses, not built-in labels or established findings.

## Main interfaces

- `src/sim.js`: `createWorld`, `step`, `hashWorld`, snapshots, and constants. Each step is 1/120 second. The six input fields are `moveX`, `moveY`, `aimX`, `aimY`, `throw`, and `recall`. Physics does not read the visibility mode
- `src/perception.js`: `percept(world, player, mode)` and `isVisible`. Hidden world entities are omitted; returned data is copied
- `src/log.js`: JSONL session logging and `replayFromLog`. Replay checks sampled state hashes, logged fields, and events. New logs identify `simulation_math: ieee-arithmetic-v1`; legacy logs need their original source/runtime
- `src/headless.mjs`: `runBout({agents, mode, seed, durationSec, log, captureTraces})`. Logging and particle-trace capture are optional and expensive
- `src/mind/index.mjs`: `createMind({seed, difficulty, ablations, captureTrace, memorySnapshot, policy, cognitionBudget, outboundSpeed, returnSpeed})`. `act` emits inputs; `trace`, `cognition`, and `memory` expose diagnostics/state. Call `finish(finalPercept)` before exporting final memory so terminal score credit is settled
- `arena/core.mjs`: generic `runGameBout` and `replayGameLog`. See [arena/README.md](arena/README.md) for the adapter contract
- `arena/audit.mjs`: paired single-bout mechanism audit and source fingerprinting
- `arena/learning-audit.mjs`: repeated-training, held-out-memory, and within-bout adaptation protocols
- `arena/phase4-final.mjs`: fixed search/validation/independent-confirmation protocol

Agents receive cloned percepts and inputs are cloned before simulation. They still execute in the same JavaScript realm within each worker: this is an experimental isolation boundary, **not a security sandbox for untrusted agent code**.

## Interpreting measurements

`secondLocationFraction` requires an embed longer than two seconds, more than two world units of owner path, and more than one world unit of maximum displacement since embedding. Its denominator includes all embeds, including early resets or neutralizations. High embed counts alone do not show persistent-anchor play.

Win points assign 1 to a win, 0.5 to a draw, and 0 to a loss. Report intervals are seed-cluster bootstrap intervals with their stated scope and limitations. They are descriptive and not multiplicity-adjusted; an interval compatible with zero does not establish equivalence. Human enjoyment, readability, speech usefulness, and subjective experience are not inferred from bot bouts.

Historical Phase 2 tournaments, old browser screenshots, smoke tests, preliminary physics screens, and superseded diagnostics are separated from final evidence under `reports/`. Do not pool them with the final frozen-source results.
