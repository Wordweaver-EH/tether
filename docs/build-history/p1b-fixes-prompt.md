Fix the review findings for C:\arcx\games\tether. The review is in
C:\arcx\research\codex-jobs\tether\p1b-fixes\review.md. SPEC.md is authoritative; notes/decisions.md D13 says the owner's
own non-HELD spear is cone-filtered like any dynamic object in MODE_B (the p1 test asserting otherwise is wrong).

Fix:
- H1 (D13): own off-cone spear;
- H3 (shallow-slide penetration; a spear spawned on or inside geometry is contact at t=0);
- M4 (exact FOV boundary without a world-unit widening);
- M5 (replay verifies logged sample fields and events, not just hashes);
- L6 (hash an explicit ordered field sequence);
- the test gaps (grazing-segment tunnelling, corner contact, sustained shallow slide then throw, neutralize-and-hit
  reset step).
For H2, run agents in `src/headless.mjs` behind a structured-clone boundary where cheap. At minimum, the arena's
worker threads must receive only cloned percepts. Document the remaining realm-sharing limit in the README.

The phase 2 mind (src/mind) and arena depend on these APIs. Keep them working. Update the mind if the own-spear change
removes information it used: it must then remember its own spear itself. Keep every test green (`node --test`).

Rules:
- Write only inside C:\arcx\games\tether, except that your notes may go in this job folder.
- No browser, no GPU, no servers.
- Do not touch `client/` or `replay/` (another job is building them).
- Commit when green, with the message ending in `Co-Authored-By: GPT-6 Sol <noreply@openai.com>`.

Final message: each finding with fixed/not fixed, how it was verified, test counts, and any behavior change in the
mind.
