# Tether, phase 1

This repository contains the deterministic rules, visibility filter, raw session log, and a CPU-only headless harness. `SPEC.md` defines the rules. `DESIGN.md` describes later phases, which are not implemented here. Node 24 is required; there are no packages to install.

## Run

```sh
node --test
```

Run a five-second scripted bout and verify its log:

```sh
node --input-type=module -e "import {runBout} from './src/headless.mjs'; import {replayFromLog} from './src/log.js'; import {idle,aimAndThrow} from './src/agents/basic.mjs'; const result=runBout({agents:[aimAndThrow(),idle],mode:'MODE_B',seed:1,durationSec:5,log:true}); console.log(result.score,result.events.length,replayFromLog(result.logLines).verifiedSamples)"
```

The sample benchmark used 20 full, unlogged MODE_B bouts with two idle agents on one core, after two warmup bouts:

```sh
node --input-type=module -e "import {runBout} from './src/headless.mjs'; import {idle} from './src/agents/basic.mjs'; for(let i=0;i<2;i++) runBout({agents:[idle,idle],durationSec:300}); const n=20,t=process.hrtime.bigint(); for(let i=0;i<n;i++) runBout({agents:[idle,idle],durationSec:300}); console.log(Math.round(n*300*120/(Number(process.hrtime.bigint()-t)/1e9))+' steps/s')"
```

## API

- `src/sim.js`: `CONSTANTS.experiment`, `CONSTANTS.technical`, `createWorld(config?)`, `step(world, [p1, p2])`, and `hashWorld(world)`. A step is exactly 1/120 s. Each input has `moveX`, `moveY`, `aimX`, `aimY`, `throw`, and `recall`; the booleans mean a press on that step. `step` mutates the world and returns that step's events. `createWorld` accepts optional technical `moveDeadzone`, `aimDeadzone`, and `epsilon` values. `hashWorld` returns a 16-character hexadecimal FNV-1a hash of all mutable rule state. The simulation never reads a mode.
- `src/perception.js`: `percept(world, 'P1'|'P2', 'MODE_A'|'MODE_B')` and `isVisible(viewerPos, viewerFacing, targetPos)`. Percepts are deep copies. Headless agents receive only percepts. A hidden opponent and its HELD spear are `null`; a visible non-HELD spear can appear without its owner. The own spear is always reported as proprioception.
- `src/log.js`: `createSessionLogger({world,mode,sessionId,boutId,timestampStart,renderRate,buildId,seed})`, `serializeLog(records)`, and `replayFromLog(lines)`. Create the logger at tick 0, then call `logger.recordStep(world, inputs, events)` after each `step`. `logger.records`, `logger.lines()`, and `logger.toJSONL()` expose the log. Replay accepts an array of JSONL lines or a JSONL string, replays paired raw inputs, verifies every sampled world hash, and returns `{world, verifiedSamples, finalHash}`. A replayable session begins at the normal `createWorld` start state.
- `src/headless.mjs`: `runBout({agents:[a1,a2],mode,seed,durationSec,log})`. Each agent has `act(percept, dt)`. The return value contains `score`, `winner` (`null` for a tie), `elapsedSec`, `events`, and `logLines` when logging is enabled. `durationSec` defaults to 300 and may shorten a run; the rule-level bout still ends at 300 seconds. `seed` is recorded in metadata and does not affect the seedless simulation. `src/agents/basic.mjs` exports `idle`, `randomWalker(seed)`, and `aimAndThrow()`.

## SPEC checklist coverage

| Checklist area | Automated coverage |
| --- | --- |
| Movement, facing, outbound, embedded, recall | Exact speed, turn, contact, slide, state transition, and timing checks; near miss and TOI tie cases; all static face IDs. |
| Scoring, reset, arena, bout | Outbound and returning scores, simultaneous hits, one reset, starts, dimensions, obstacle symmetry, 300-second tie, and no forced resolution. |
| Modes and perception | Exact cone boundary, no occlusion or range cutoff, hidden HELD spear, deep scan for hidden values, mutation isolation, and A/B hash equality. |
| Logging | Required metadata, raw inputs, event fields, 20 Hz samples, visibility transitions, mode on every record, replay equality and tamper detection. |
| Contamination | Legal spear states, no spear interaction, no auto recall, and seeded 20,000-step fuzz runs in **each** mode checking geometry, state, scoring, and stationary embeds. |

The rendering and privacy checklist items (two separate participant displays, wedge drawing, hidden markers, arrows, camera, debug overlays, and audio) require a client. Phase 1 has no browser view, display, camera, or audio path, so they cannot be exercised here.

## Interpretations

- The unspecified technical deadzones are both **0.1**. Inputs must exceed the deadzone. Collision and TOI tie epsilon is **1e-9**. The sim rate is fixed at **120 Hz**; these values are included in metadata.
- A HELD spear's stored point is its owner's center, with direction following the owner's facing. Throw starts at the owner's edge, before movement; a newly thrown or recalled spear advances during that same step.
- Player velocity records the requested full-speed movement vector even when a wall blocks some displacement. Movement slides along AABBs expanded by the player radius. Neutralization tests the straight previous-center-to-current-center segment, as the spec phrases it, even if sliding made the actual route bent.
- At an exact obstacle corner, X entry selects the face before Y entry. If two static surfaces have equal TOI within epsilon, the lexicographically first surface ID wins. A player hit wins over static contact within epsilon.
- An exact 180-degree aim tie turns counterclockwise for either player; signed zero is normalized so mirrored positions behave the same way.
- A zero-distance recall completes immediately only when the stored point and owner center are exactly equal. Returning travel clamps to the fixed target within collision epsilon to avoid a one-tick floating-point overrun.
- MODE_B returns visible opponent spear state, point, and direction, while keeping its embed surface and fixed recall target private. MODE_A includes those fields. Own spear metadata is always known. A spear's visual visibility in sampled state can therefore be false while its owner still knows its state.
- Logs include an initial state sample at time 0, then one every six steps. Input timestamps mark the start of the step; event and sample timestamps mark its end. Visibility enter/exit events compare each end-of-step view with the initial view, so already-visible entities do not generate an initial enter event.
- Visibility events track the opponent body and both spears. An own HELD spear is always visible; an enemy HELD spear follows enemy body visibility. No last-known object is retained in percepts.
- `durationSec` is rounded to the nearest 120 Hz tick. A shorter headless run is a partial bout. Scripted agent PRNG state comes from `randomWalker(seed)`; the harness `seed` is metadata only.
