# Tether: design (owner direction 2026-09-26)

Working name for the Recall Spear duel. `SPEC.md` holds the rules; this file says what we are building on top of them
and why.

## Goals and what counts as evidence

**(a) The game is engaging** for one human against the NPC.
- Owner playtests. Telemetry records bout count, voluntary rematches, session length, score margin over time, and
  which mechanics the player used (embed-and-wait vs immediate recall, neutralizations, plays while unseen).
- Bot tournaments show no dominant degenerate strategy. This is the owner's hostile-pass list turned into experiments:
  immediate recall, camping, spinning, and rushing the spear.
- The core hypothesis still holds: the embedded spear becomes a second contested location. It must show up in
  NPC-vs-NPC and human-vs-NPC logs as delayed recalls with positional play in between.

**(b) The NPC functionally ticks the indicators usually listed for functional consciousness.** Scope: Butlin et al.
2023 indicator properties plus a few classic extras (metacognition, theory of mind, affect, inner vs outer speech,
episodic memory, counterfactual reflection).
- **Rule: an indicator counts only if ablating it measurably changes behavior.** The measures are tournament win rate,
  specific behavior metrics, or the human's results against it.
- Mechanisms that make no difference are reported as honest negatives.
- The claim is functional only, not phenomenal.

## Game changes for one human (the rules themselves stay as in SPEC.md)

- **Human vs NPC, both under the Mode-B perception rule** (120-degree cone, no occlusion, no ghosts). This is symmetric
  and fair: the NPC receives exactly the filtered view a player would, through the same visibility function. It
  structurally cannot read hidden state.
- **Mode A stays** as a toggle, used for comparison and for the core-hypothesis check.
- **Controls:** WASD to move, mouse to aim (the desired facing; the actual facing still turns at 360 deg/s), left click
  to throw, right click or Space to recall. Gamepad is optional.
- **Sessions:** a bout is 300 s by default, with 180 s as an option. The whole session is logged per SPEC.
- **Audio:** only non-informative feedback (your own throw, score). No tactical audio, per SPEC.
- **The opponent's visible tells** are part of the design, because they are what make its mind exploitable. When it is
  in your cone you see:
  - its facing and cone,
  - a small posture cue when its workspace focus changes (startle on surprise, lean when committed),
  - its outer speech (short lines, which may be bluffs).

## Architecture

```
sim.js         deterministic rules (no DOM, no randomness, no mode); fixed 120 Hz
perception.js  the ONLY bridge from world to any agent: visibility-filtered percepts (SPEC rule) + own proprioception
mind/          the NPC: consumes percepts, emits the same 4 input channels a human emits (MOVE, AIM, THROW, RECALL)
client/        web page: human vs NPC, canvas 2D, both under Mode B (or A)
replay/        log replay with the Mind View (below)
arena/         Node tournaments: NPC vs NPC, NPC vs ablated NPC, NPC vs scripted strategy families, exploit search
```

The mind never imports `sim.js` state directly. The only exception is **its own world model**: a copy of the rules it
runs on its *beliefs* (mental simulation), never on the true state. A test enforces this by building the NPC with the
true state inaccessible.

**Human-like embodiment limits** (fairness and believability):
- perception latency of about 150 ms (percepts are queued);
- motor noise on aim that scales with target angular speed;
- the same 360 deg/s turn rate as the human.

All three are tunable as difficulty and logged as technical constants.

## The mind (no LLM; runs every tick, deterministic from a seed)

A cognitive cycle runs at 30 Hz: perceive, update beliefs, specialists propose, workspace competition, broadcast,
act.

1. **Belief (recurrent perception, predictive processing).**
   - A particle filter over the opponent's position and heading, plus a belief over their spear state and position.
   - Seen: particles reweight to the observation.
   - **Negative evidence:** looking at a region and seeing nothing removes the particles there.
   - Prediction: a motion model learned from this player.
   - **Surprise** = the observation's improbability under the prediction. It drives salience and a visible startle.
2. **Specialists (parallel modules)** propose workspace content, each with a salience:
   - Threat: incoming or predicted spear lines, including the recall line from their embedded spear through my belief
     of their body.
   - Hunt: shot opportunities from the belief and the predicted intercept.
   - Anchor: my embedded spear. Keep it, recall when the predicted opponent crosses the line, or bait with it.
   - Contest: neutralize their embedded spear.
   - Search: the opponent is lost (high belief entropy).
   - Deceive: act while the opponent is predicted to be looking away.
3. **Global workspace (limited capacity, ignition, broadcast).**
   - One focus at a time, with hysteresis (entry above the hold threshold, a refractory period).
   - The winner is broadcast at once to the gaze controller, motor planner, action gate, memory, and speech.
   - Gaze is the physical bottleneck: the cone goes where the focus needs information.
4. **Metacognition (higher-order monitoring).**
   - Per-belief confidence falls with staleness and dispersion. The mind knows what it does not know.
   - Low confidence on something that matters triggers a look-again.
   - Calibration is tracked: predicted confidence against what it saw on reacquiring. This retunes trust per player.
5. **Attention schema.**
   - A model of *its own* attention: where it is looking, what is going stale and when each item needs a refresh. This
     schedules gaze.
   - A model of *the opponent's* attention: their cone when seen, an inferred gaze target when not. This is used by
     Deceive (move or embed while unobserved) and by Threat (am I being watched?).
6. **Affect / appraisal.**
   - Arousal from threat and surprise; valence from score trend and outcomes; a confidence mood.
   - These modulate risk thresholds, switching speed and hysteresis (state-dependent attention).
7. **Memory.**
   - Episodic: raw events with context.
   - A per-player model persisted across bouts in localStorage: embed-to-recall delays, neutralization tendency,
     favorite surfaces, behavior when unseen, and turn-scanning rate.
   - This is its agency learning from feedback.
8. **Counterfactual reflection (mental time travel).**
   - Between points and between bouts, it replays key moments in its internal model with alternative choices.
   - The results update policy weights, e.g. "turning to my spear there cost me the point".
9. **Inner vs outer speech.**
   - Inner speech is a verbal readout of workspace transitions, logged and shown in the Mind View. It is a report of
     the focus log, never generated separately.
   - Outer speech is gated and strategic: taunts and bluffs, chosen by Deceive.
10. **Self-report.** After a bout, the Mind View can answer "why did you do X at t?" from the logged workspace (grounded
    introspection).

## Mind View (replay): the demonstration of (b)

A timeline scrubber over a bout log shows:
- the true world;
- the NPC's belief cloud and confidence;
- its model of your cone;
- the specialists' saliences as competing bars, with the ignition moment marked;
- the broadcast focus, surprise spikes, affect traces, and the inner-speech ticker;
- its counterfactual notes.

## Indicator audit (tournaments, CPU; the demonstration that the boxes are load-bearing)

| Indicator | Mechanism | Ablation | Expected measurable change |
|---|---|---|---|
| RPT (recurrent, integrated perception) | belief filter fuses history with the percept | react to the current percept only | loses you on every look-away; worse vs hide-and-reposition play |
| PP (predictive processing) | motion prediction, surprise | constant-position prior | slower reacquisition; no startle; misses leading shots |
| GWT-1 (specialists) | 6 modules | a single merged utility | worse at handling two locations at once (the core hypothesis) |
| GWT-2/3 (limited workspace, broadcast) | one focus, hysteresis, broadcast | no bottleneck (each output picks independently) / no hysteresis | incoherent gaze vs action; thrashing (scan-spam metric) |
| GWT-4 (state-dependent attention) | affect modulates thresholds | fixed thresholds | worse when behind or ahead (score-state split) |
| HOT (metacognition) | confidence, look-again, calibration | treat beliefs as certain | acts on stale info; more hits taken after look-aways |
| AST (attention schema, self + other) | gaze scheduling; model of the opponent's cone | random / fixed-interval gaze; no model of the opponent's cone | more staleness; no unseen repositioning; lower bait success |
| ToM | opponent attention and belief model | removed | Deceive never fires; easier to exploit |
| AE (agency, learning) | per-player model across bouts | frozen | the human's repeated exploit keeps working bout after bout |
| AE (embodiment) | forward models of own turn and spear | none | mistimed recalls and turns |
| Counterfactual reflection | replay with alternatives | off | slower adaptation curve |
| Inner/outer speech | report vs strategic bluff | no bluffing | bluff-induced opponent errors disappear |

Every row is a tournament of thousands of seeded bouts against fixed opponents: the full NPC, scripted strategy
families, and a human-behavior proxy fitted from the owner's logs once they exist. Results go on a report page with
confidence intervals. Rows whose ablation changes nothing are listed as negatives.

## Build phases

1. **sim + perception + full SPEC test suite** (CPU). Also a headless Node harness and a replay-determinism hash.
2. **Mind v1**: belief, specialists, workspace, gaze, action, embodiment limits. Scripted opponents, and a first
   exploit search (does immediate recall dominate?).
3. **Web client** (human vs NPC, Mode A/B toggle) and **Mind View** replay.
4. **Mind v2**: metacognition, attention schema and ToM, affect, memory and learning, counterfactuals, speech.
5. **Indicator audit** tournaments and a report page. Tune the difficulty curve.
6. **Owner playtests** (GPU clearance needed for the browser). Then iterate on engagement from the telemetry.
