Build phase 3 of "Tether" in C:\arcx\games\tether: the web client (human vs NPC) and the replay Mind View. Read
SPEC.md, DESIGN.md, notes/decisions.md, README.md and src/ (sim, perception, log, headless, mind; all built and tested).

Deliver as plain static files (ES modules, no build step, no dependencies), served by a tiny `serve.mjs` (Node static
server, port 8765, localhost only):

1. `client/index.html` (play).
   - Human (P1) vs the mind (P2). A difficulty selector (easy/normal/hard). A mode toggle (B default, A for comparison).
   - Controls: WASD move; mouse sets desired facing (actual facing still turns at 360 deg/s); left click throw; right
     click or Space recall. Esc pauses. Optional gamepad.
   - The sim runs on a fixed 120 Hz accumulator; rendering never advances it.
   - The human's view is rendered ONLY from `percept(world, 'P1', mode)`, exactly like the NPC. Include a test that
     render inputs come from the percept.
   - Visuals: clean, minimal and legible.
     - A dark arena with obstacles; players as circles with a facing notch.
     - The spear as a short line, with state shown by its look (held / flying / embedded / returning).
     - In MODE_B, the player's cone as a subtle wedge matching the visibility test exactly.
     - The NPC's cone is drawn only when the NPC is visible (it is a tell).
     - NPC outer speech (if the mind emits any) as a small caption near it, only when visible.
     - No trajectory previews, ghosts or off-screen arrows.
     - Score and timer at the top.
     - A short round-start countdown after each reset is NOT allowed (SPEC: no reset delay). Instead, flash the arena
       border for 150 ms on reset.
   - Audio: only non-informative feedback for your own actions and scores (WebAudio synthesized, subtle), with a mute
     toggle.
   - End of bout: a result screen with score, "rematch", and "download log" (full JSONL with mind traces).
   - Telemetry kept in localStorage: bouts played, rematches, session durations, per-bout summaries. Show a small
     stats panel on the start screen.
   - Performance: 60 fps canvas 2D with low CPU use; DPR-aware; resizes to the window with letterboxing.
2. `replay/index.html` (Mind View).
   - Load a JSONL log (file picker or drag and drop). Re-simulate from raw inputs via `replayFromLog` and show whether
     it verified.
   - Scrubber, play/pause, speed 0.25x-4x, frame step, and jump to events (hits, embeds, recalls, neutralizations,
     ignitions, surprise spikes).
   - Overlay layers, each toggleable:
     - the true world;
     - both cones;
     - the NPC belief particles and mean/covariance ellipse, coloured by confidence;
     - the NPC's model of the human's cone;
     - recall targets and lines;
     - swept spear segments.
   - Side panel for the selected time:
     - the specialists' saliences as bars, with the focus highlighted and ignition marked;
     - affect traces;
     - surprise;
     - confidence per belief;
     - the inner-speech ticker;
     - counterfactual notes.
   - A timeline strip at the bottom with the focus as coloured segments and event ticks.
3. Tests (`node --test`) for everything testable without a browser: input mapping, the accumulator, percept-only
   rendering inputs, log/replay parsing, and telemetry. Keep every existing test green.
4. README section: how to play, controls, and how to open the Mind View.

Rules:
- Write only inside C:\arcx\games\tether, in `client/`, `replay/`, `serve.mjs`, new test files and README. Do not
  modify `src/` (another job is fixing the sim right now). If you need an API change, write it into your final message
  instead.
- Do NOT open a browser, run a GPU workload or start a long-running server (the machine's GPU is reserved). A 2-second
  smoke test of serve.mjs (start, curl one file, stop) is fine.
- Commit only your own files when green (`git add client replay serve.mjs test/<yours> README.md`), with the message
  ending in `Co-Authored-By: GPT-6 Sol <noreply@openai.com>`.

Final message: files, test counts, screenshots-free description of the UI, what could not be verified without a
browser, and API requests.
