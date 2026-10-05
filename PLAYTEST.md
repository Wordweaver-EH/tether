# Browser play check

Start `node serve.mjs`, then open `http://localhost:8765/` (redirects to `/client/`). No dependency install is needed. The root redirect and relative module/CSS/import-map paths pass automated HTTP checks. Actual play below remains **unverified**.

1. **Controls and spear:** start a normal Mode B bout; move with WASD, face with the mouse, left-click throw, right-click or Space recall. Check spear states, recall-line readability and score feedback.
2. **Visibility/readability:** test forward-cone Mode B and full-view Mode A. Check that hidden opponents are not leaked and that the spear, score, timer and mind cues remain readable at the intended window size.
3. **Interruptions:** pause/resume with Esc, switch tabs, return, resize and rematch. Check for stuck input, unexpected simulation jumps and duplicate sound. Toggle mute on/off.
4. **Mind View:** finish a bout, download the log, open `/replay/`, load it, seek backward/forward, pause, step and change speed. Check world state, overlays, focus and trace agreement. Verify the downloaded log with `node tools/verify-browser-replay.mjs /path/to/log.jsonl` as appropriate to its duration.
5. **Learning persistence/reset:** finish or interrupt play, reload, and check the local memory status/rematch behavior. Confirm reset cancels safely when declined and clears the intended local profile when accepted. Check storage-failure behavior separately.

Record browser/version, mode/difficulty, exact reproduction steps and expected versus observed behavior for each failure. A passing downloaded replay verifies determinism for that fixture; it does not establish live controls, audio, persistence or human enjoyment.
