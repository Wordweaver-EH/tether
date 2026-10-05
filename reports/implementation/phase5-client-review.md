# Client taste fixes and local learning integration

## Implemented

- Mode B now darkens the static arena outside the human cone with an even-odd wedge mask. The renderer still receives only the percept, never hidden world entities. Mode A remains unmasked.
- A held spear is offset perpendicular to the facing axis by 0.25 visual world units, separating its shaft from the player's central facing notch. This is rendering only; collision geometry and game rules are unchanged.
- The NPC cone already used orange `#f0a875` at 0.055 opacity, versus the human cone at 0.10. That part of the smoke-review request was already implemented.
- Opponent memory is loaded from a version-2 localStorage envelope, saved after completed bouts and on leaving interrupted play, and retained for rematches. The mind owns snapshot validation and migration. One local browser profile represents the human player; no account identity is inferred.
- Reset learning is available outside an active/paused bout and confirms before deleting the learned profile. Telemetry is retained. Storage denial/quota failures do not crash gameplay.
- The client calls `mind.finish(finalPercept)` before exporting memory so a terminal scoring outcome is incorporated.
- A post-bout summary describes only visible movement, recall-timing and turning observations plus the current lateral-motion estimate. Mind View shows processing tier, budget, tactic, automatic response, and adaptation estimates. Discounted pseudo-counts are labeled effective evidence; approach-to-spear is not mislabeled as successful neutralization. Older logs explicitly show missing fields as not recorded.
- Mind View displays the selected cognitive-cycle time. Seeking before the first trace now clears previous confidence/speech/counterfactual readouts instead of leaving stale values.

## Deceive focus review

No hard-coded Deceive focus lock was found in Mind View: focus comes from the most recent logged trace at the selected time. A regression covers Hunt → Deceive → Threat → Search and backward seeking. Persistent focus in a log can be genuine workspace behavior and should not be altered by the viewer. This verifies selection logic, not the visual browser flow.

## Verification

- `node --check client/app.mjs` and `node --check replay/app.mjs` passed.
- `node --test test/client.test.mjs test/client-taste.test.mjs`: 18/18 passed (including real v2 snapshot/trace integration and model-branch readouts).
- The latest whole-suite check passed 111/111; final aggregate checking remains coordinated with simultaneous changes in the mind and deterministic simulation.
- New checks cover the shading mask, held/free spear geometry, Deceive seek transitions, persistence/reset independence, corrupt storage, and denied/quota-full storage.
- Cloud browser navigation to the running local app returned `net::ERR_BLOCKED_BY_CLIENT`. No alternate route was used to bypass it. Therefore live rendering, interactive play, audio, storage across actual browser reloads and screenshot QA have **not been reverified**. Historical smoke screenshots are not evidence of these changes.
