# Tether, phase 2

This repository contains the deterministic rules, visibility filter, raw session log, a CPU-only headless harness, and the phase 2 NPC mind and tournament. `SPEC.md` defines the rules. `DESIGN.md` defines the mind and later phases. Node 24 is required; there are no packages to install.

## Run

```sh
node --test
```

Run the CPU tournament (up to eight worker threads):

```sh
node arena/tournament.mjs --n 8 --keyN 192 --workers 8 --durationSec 300 --out reports/tournament
```

`n` is bouts per unordered pair per mode. `keyN` replaces it for pairs containing the normal mind and for immediateRecaller versus embedWaiter. Seats alternate across seeds. The outputs are `<out>.json` (individual bout results and aggregate statistics) and `<out>.md` (tables). At `keyN=192`, each key pair has 384 bouts across A and B, giving a worst-case sampling half-width near five percentage points when the modes are combined. Per-mode intervals are wider. The full round robin includes three difficulties, eight ablations, and six scripted strategies.

`--policy tuned` is the default mind. `--policy baseline` reproduces the before-tuning policy used in `reports/phase2-before.*` with the same strategy scripts and corrected metric adapter. Both policies use the same percept boundary, rules, difficulty settings, and ablation interface.

The tournament JSON stores scores and behavior aggregates for every bout. It does not store 120 Hz world states. Use `runGameBout({log:true,captureTraces:true})` or `runBout({log:true,captureTraces:true})` for a replayable single-bout record.

Run a five-second scripted bout and verify its log:

```sh
node --input-type=module -e "import {runBout} from './src/headless.mjs'; import {replayFromLog} from './src/log.js'; import {idle,aimAndThrow} from './src/agents/basic.mjs'; const result=runBout({agents:[aimAndThrow(),idle],mode:'MODE_B',seed:1,durationSec:5,log:true}); console.log(result.score,result.events.length,replayFromLog(result.logLines).verifiedSamples)"
```

The sample benchmark used 20 full, unlogged MODE_B bouts with two idle agents on one core, after two warmup bouts:

```sh
node --input-type=module -e "import {runBout} from './src/headless.mjs'; import {idle} from './src/agents/basic.mjs'; for(let i=0;i<2;i++) runBout({agents:[idle,idle],durationSec:300}); const n=20,t=process.hrtime.bigint(); for(let i=0;i<n;i++) runBout({agents:[idle,idle],durationSec:300}); console.log(Math.round(n*300*120/(Number(process.hrtime.bigint()-t)/1e9))+' steps/s')"
```

## API

- `src/sim.js`: `CONSTANTS.experiment`, `CONSTANTS.technical`, `createWorld(config?)`, `step(world, [p1, p2])`, `hashWorld(world)`, `snapshotWorld(world)`, and `restoreWorld(snapshot)`. A step is exactly 1/120 s. Each input has `moveX`, `moveY`, `aimX`, `aimY`, `throw`, and `recall`; the booleans mean a press on that step. `step` mutates the world and returns that step's events. `createWorld` accepts optional technical `moveDeadzone`, `aimDeadzone`, and `epsilon` values. `hashWorld` returns a 16-character hexadecimal FNV-1a hash of all mutable rule state. Snapshots are independent deep copies. The simulation never reads a mode.
- `src/perception.js`: `percept(world, 'P1'|'P2', 'MODE_A'|'MODE_B')` and `isVisible(viewerPos, viewerFacing, targetPos)`. Percepts are deep copies. A hidden opponent and its HELD spear are `null`; a visible non-HELD spear can appear without its owner. In MODE_B, either player's off-cone non-HELD spear is `null`; an own HELD spear remains visible.
- `src/log.js`: `createSessionLogger({world,mode,sessionId,boutId,timestampStart,renderRate,buildId,seed})`, `serializeLog(records)`, and `replayFromLog(lines)`. Create the logger at tick 0, then call `logger.recordStep(world, inputs, events)` after each `step`. `logger.records`, `logger.lines()`, and `logger.toJSONL()` expose the log. Replay accepts an array of JSONL lines or a JSONL string, replays paired raw inputs, verifies sampled hashes plus every logged sample field and event, and returns `{world, verifiedSamples, finalHash}`. A replayable session begins at the normal `createWorld` start state.
- `src/headless.mjs`: `runBout({agents:[a1,a2],mode,seed,durationSec,log,captureTraces})`. Each agent has `act(percept, dt)`. The return value contains `score`, `winner` (`null` for a tie), `elapsedSec`, `events`, and `logLines` when logging is enabled. `captureTraces:true` adds `traces` and, with `log:true`, `MIND_TRACE` records; replay ignores these annotations while verifying samples and events. `durationSec` defaults to 300 and may shorten a run; the rule-level bout still ends at 300 seconds. `seed` is recorded in metadata and does not affect the seedless simulation.

`runBout` and the arena runner structured-clone each percept before calling an agent and clone each returned input before stepping. Arena worker threads therefore pass agents cloned percepts, even when an adapter returns references into its world. Agent functions still execute in the simulation's JavaScript realm within each thread. They can alter shared intrinsics such as `Array.prototype` or `Math`; the clone boundary is not a security sandbox for untrusted code.
- `src/mind/index.mjs`: `createMind({seed,difficulty,ablations,captureTrace,memorySnapshot,policy})`. Difficulties are `easy`, `normal`, and `hard` (or 0..1). `act(percept,dt)` runs a 30 Hz cognitive cycle after a queued percept latency (200/150/100 ms respectively), then emits the six standard input fields. Aim noise and action thresholds scale with difficulty; visibility never does. `policy` is `tuned` (default) or `baseline`. `trace()` returns cycle records; `settings()`, `memory()`, `reflect()`, `reflectionNotes()`, and `selfReport(time)` expose the phase 4 extension points. A caller can persist `memory()` and pass it back as `memorySnapshot` in a later bout. `captureTrace:false` avoids retaining large particle traces during tournaments. Supported ablations: `noBelief`, `noPrediction`, `singleUtility`, `noWorkspace`, `noHysteresis`, `noMetacog`, `noAttentionSchema`, `noToM`.
- `src/agents/strategies.mjs`: perception-only factories `immediateRecaller`, `camper`, `spinner`, `spearRusher`, `directShooter`, and `embedWaiter`.
- `arena/core.mjs`: generic `runGameBout({game,adapter,agents,mode,seed,durationSec,log,captureTraces})` and `replayGameLog(game,adapter,records)`. The game module supplies `{CONSTANTS,createWorld,step,percept,hashWorld}`. An adapter supplies player IDs, clock/score access, agents, and optional metrics. `arena/tether-adapter.mjs` is the only arena module that imports Tether. `arena/tournament.mjs` distributes bouts over worker threads and writes JSON and Markdown. [arena/README.md](arena/README.md) gives the full adapter contract.

### Mind and behavior measurements

The particle belief contains 48 position/velocity samples and a separate remembered spear state/position. An unseen opponent downweights and replaces particles in the current cone. Surprise is the negative log of an observation's kernel likelihood under the predicted particles. Confidence falls with dispersion and time since sighting. Six specialists compete for one workspace focus; its broadcast drives gaze, movement, actions, memory, and transition-only inner speech. Gaze has a per-item refresh schedule, and the opponent-attention model enables Deceive. V1 memory learns visible recall delays and scan reversals from percepts, and v1 reflection estimates recall hit chance from belief particles. Policy learning from persisted memory and snapshot-driven counterfactuals remain phase 4 work.

`secondLocationFraction` counts embeds that last **more than 2 seconds** and, while embedded, have at least **2 world units of owner path** and at least **1 world unit of maximum displacement from the body position at embed time**. The denominator is all embeds, including those neutralized or cut short by a reset. `lookAwayFraction` measures time the opponent lies outside the physical 120° cone in either mode. `hitsWithinOneSecLookAway` counts hits within one second after a visible-to-hidden cone transition. `scanReversalsPerMinute` counts turn-sign changes separated by at least 0.15 seconds. Recall delays are recorded from EMBED to RECALL_START, with p25/p50/p75/p90 in the JSON.

### Performance

Before the clone boundary and D13 spear visibility change, local 20-bout, 300-second, unlogged MODE_B runs measured **0.018 s/bout (2.00 million ticks/s)** for idle versus idle and **0.508 s/bout (70,829 ticks/s)** for the tuned normal mind versus immediateRecaller. The two 8,432-bout, eight-worker tournaments took **473.4 s** (baseline) and **480.5 s** (tuned). These are historical measurements; run the benchmark above for the current build. Trace capture and raw JSONL logging cost memory and time and are disabled for tournament workers.

## SPEC checklist coverage

| Checklist area | Automated coverage |
| --- | --- |
| Movement, facing, outbound, embedded, recall | Exact speed, turn, contact, slide, state transition, and timing checks; near miss and TOI tie cases; all static face IDs. |
| Scoring, reset, arena, bout | Outbound and returning scores, simultaneous hits, one reset, starts, dimensions, obstacle symmetry, 300-second tie, and no forced resolution. |
| Modes and perception | Exact cone boundary, no occlusion or range cutoff, hidden HELD spear, deep scan for hidden values, mutation isolation, and A/B hash equality. |
| Logging | Required metadata, raw inputs, event fields, 20 Hz samples, visibility transitions, mode on every record, replay equality and tamper detection. |
| Contamination | Legal spear states, no spear interaction, no auto recall, and seeded 20,000-step fuzz runs in **each** mode checking geometry, state, scoring, and stationary embeds. |

The rendering and privacy checklist items (two separate participant displays, wedge drawing, hidden markers, arrows, camera, debug overlays, and audio) require a client. Phase 2 has no browser view, display, camera, or audio path, so they cannot be exercised here.

## Interpretations

- The unspecified technical deadzones are both **0.1**. Inputs must exceed the deadzone. Collision and TOI tie epsilon is **1e-9**. The sim rate is fixed at **120 Hz**; these values are included in metadata.
- A HELD spear's stored point is its owner's center, with direction following the owner's facing. Throw starts at the owner's edge, before movement; a newly thrown or recalled spear advances during that same step.
- Player velocity records the requested full-speed movement vector even when a wall blocks some displacement. Movement slides along AABBs expanded by the player radius. Neutralization tests the straight previous-center-to-current-center segment, as the spec phrases it, even if sliding made the actual route bent.
- At an exact obstacle corner, X entry selects the face before Y entry. If two static surfaces have equal TOI within epsilon, the lexicographically first surface ID wins. A player hit wins over static contact within epsilon.
- An exact 180-degree aim tie turns counterclockwise for either player; signed zero is normalized so mirrored positions behave the same way.
- A zero-distance recall completes immediately only when the stored point and owner center are exactly equal. Returning travel clamps to the fixed target within collision epsilon to avoid a one-tick floating-point overrun.
- MODE_B returns visible opponent spear state, point, and direction, while keeping its embed surface and fixed recall target private. MODE_A includes those fields. Own non-HELD spear metadata is available only while that spear is in the cone. The mind keeps a private estimate from its prior sightings and actions while it is hidden; that estimate can be wrong until the spear reappears.
- Logs include an initial state sample at time 0, then one every six steps. Input timestamps mark the start of the step; event and sample timestamps mark its end. Visibility enter/exit events compare each end-of-step view with the initial view, so already-visible entities do not generate an initial enter event.
- Visibility events track the opponent body and both spears. An own HELD spear is always visible; an enemy HELD spear follows enemy body visibility. No last-known object is retained in percepts.
- `durationSec` is rounded to the nearest 120 Hz tick. A shorter headless run is a partial bout. Scripted agent PRNG state comes from `randomWalker(seed)`; the harness `seed` is metadata only.
