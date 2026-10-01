Smoke-test the Tether web client and Mind View in a headless browser with SOFTWARE rendering only (the GPU is reserved
for other sessions). The repo is C:\arcx\games\tether (client/, replay/, serve.mjs, README).

Use the existing tooling in C:\arcx\tools\codefilm:
- playwright-core is in its node_modules;
- lib/browser.mjs launches installed Edge;
- `CODEFILM_GPU=0` means `--disable-gpu`.
Launch Edge headless with `--disable-gpu`. Verify that the WebGL/renderer string (or the canvas 2D context) is software
(SwiftShader/basic), and abort if it reports the Radeon.

Write a reusable script `tools/smoke.mjs` in the tether repo. It imports playwright-core from the codefilm path (no
installs) and does the following:
1. Start serve.mjs on a free localhost port. Open client/index.html. Fail on any console error, page error or failed
   request.
2. Start a bout (MODE_B, normal). Drive input for about 20 s of game time: WASD moves, mouse moves to aim, clicks to
   throw, Space to recall. Take screenshots at named moments (start, after the first throw, an embedded spear, after
   a recall, and at a moment the NPC is visible or hidden) into `reports/smoke/`.
   - If the page has no deterministic hook, add a minimal `window.__codegame` test hook to the client, behind
     `?test=1` only. It must follow `{contractVersion, ready, tickRate, reset(seed), advance(ticks, inputsByTick),
     percept(viewer), hashWorld(), snapshot(), restore(), render()}`. Rendering must never advance the sim, and the
     hook must be absent in normal play.
   - With the hook, drive a seeded, reproducible scripted sequence and assert the state via
     `percept`/`hashWorld` (state first; screenshots only for visual questions).
3. The end screen: force the bout end via the hook (for example advance to 300 s) and check that the result screen and
   log download work (intercept the download and validate it with `replayFromLog`).
4. Load that log into replay/index.html. Check that it verifies, scrub to the middle, and screenshot with all overlays
   on.
5. Make a contact sheet PNG of all screenshots (use ffmpeg, which is on PATH, or a canvas page) at
   `reports/smoke/contact.png`, plus `reports/smoke/smoke.json` recording each check with pass/fail, the renderer
   string, timings, and the source tree hash.
Fix any client bugs you find, but only in client/, replay/ and tools/. Keep `node --test` green.

Rules:
- NO GPU: software rendering only, and verify it.
- Localhost server only, stopped at the end.
- Write only in C:\arcx\games\tether.
- Commit when green, with the message ending in `Co-Authored-By: GPT-6 Sol <noreply@openai.com>`. Commit only your
  files; another job is editing src/ and arena/ right now, so don't commit those.

Final message: checks with pass/fail, bugs fixed, the renderer string, the screenshot paths, and what a codegame
`preview` command should include based on this.
