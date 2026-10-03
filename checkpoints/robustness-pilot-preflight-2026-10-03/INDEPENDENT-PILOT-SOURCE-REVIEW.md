# Independent pilot-source preflight

Status: PASS for pilot source and synthetic preflight; exact pilot-lock review, verified publication and explicit pilot release remain required. This is not an approval of opponent-search or final evaluation.

Reviewed source manifest SHA-256: `50691f33e692661f7857edc456a26bc6c7cce1c3e1f4cbd1151c4da51f4a7f6a`. All 47 listed files independently verified. Independently ran `node --test experimental/*.test.mjs benchmark/*.test.mjs`: 39 passed, none failed or skipped. Tests are synthetic/open-loop or mock-child checks; no agent-versus-agent bout or pilot outcome was produced.

## World, controller and session boundary

- Nominal world, event, hash and perception parity is exact under the synthetic command regression
- Actual scaled outward/return spear motion, perpendicular turning and FOV visibility checks pass
- Mirror changes obstacle X coordinates only; spawn positions/facing remain nominal
- Exactly eleven configured conditions now comprise default, mirror, two new obstacle layouts, two spear speeds, two turning speeds, two FOVs and one pending searched style
- Frozen production engine/controller and common interface bytes match the qualified training-source manifest. Public controller spear physics remain nominal 12/12; world truth and shift metadata are not controller arguments
- The common wrapper retains one 150ms sensor delay, 30Hz decisions at 120Hz simulation, one indexed motor transform, held continuous controls and single-frame button pulses
- All eight arms retain exact frozen definitions and three selected policy vectors/levels. The four mind lesions are novelty-handoff, fixed-metacognitive teaching Every=1, learning freeze preserving acquired habits, and partial attention/planner/memory broadcast delivery cut
- The actual 192-task pilot matrix validates: three development clusters, default/mirror, eight arms, two seats, two 30-second bouts. Pilot and evaluation seed sets are disjoint; seeds are paired across arms/conditions within cluster/seat/bout
- Memory histories are isolated by phase/cluster/condition/arm/seat and start from the appropriate frozen checkpoint. Later bouts receive only that history's output

Sixty constructor-only checks covered twelve snapshots and five mind arms, with zero act/finish calls. Every arm accepts the same canonical memory for each snapshot. Native loading adds one missing zero-valued awareness entry in snapshot 4 and snapshot 11; no frozen bytes were changed. Supplied/input and accepted-initial memory hashes are recorded separately. Learning-frozen output is checked against accepted initial memory rather than incorrectly treating this native normalization as learning.

## Evidence and accounting

Native learning pending forecasts and completed sparse-score outcomes remain primary; optional frozen-arm shadow records are labeled evaluator-derived/non-primary. There is no truth-informed terminal finish. C2 pending forecasts at the boundary receive a separately labeled evaluator censor, not an invented native expiry or settlement.

Actual controller reports, pre-motor, actuator and committed commands are retained. Observer-only checks compare actual focus, delivered content, evidence-age text, novelty, prediction, completion and motor/commit state, preserving witnesses and conditional NA/missing-report denominators. Checks execute outside decision timing and do not feed controllers. Sensor-time truth/percept identity is separately delayed; receipt-time truth is separately labeled.

Raw streams use lossless concatenated gzip members, row hash chains and physical/uncompressed hashes. Checked full writes and exclusive paths prevent silent successful overwrite. Graceful failure attempts to flush within its bound and reports unpersisted buffered rows; abrupt kill/truncated final members remain explicitly partial. Finished tasks are not manufactured from failed streams.

Phase/task timeouts, live child CPU/RSS, per-task and aggregate raw-byte bounds, cancellation and unexpected exit are guarded. Terminal child lifetime CPU is counted once, separately from parent CPU; active/completed accounting is tested. Final completion rechecks source and parent-inclusive ceilings. Sampling overshoot and final IPC/exit micro-overhead exclusion are disclosed. Decision timing is narrower than total task/phase cost.

## Release boundary and limitations

The closed lock must bind package metadata, all runtime source, full preregistration, qualified artifacts and any required opponent freeze. Independent review and publisher evidence must bind that exact lock; the explicit phase/output/worker release is single-use. Missing task/config/snapshot/style data is rejected before any worker starts.

The pilot is limited to runtime/data/invariant feasibility; mirror exposure is disclosed. Do not treat it as final recovery or robustness evidence. The separately implemented searched-opponent procedure, complete statistical evaluation and pilot-based full-run feasibility remain necessary before final evaluation. Preserve the earlier qualified optimizer tie deviation. Lock/review/publication receipts must stay outside locked input directories, and all locked files must remain unchanged while a phase runs.

## Exact pilot-lock approval

Pilot-only review approved for lock SHA-256 `0aa5e25d83226a1962ee8830bc1fa684302d3e90248b7defbb8aa4c1427ba717`. All98 closed input hashes, actual192-task grid, frozen source/snapshots/configuration and pilot/evaluation seed separation independently verified. Final evaluation task validation correctly refuses to proceed without the separately reviewed searched-opponent freeze. Source remains unchanged. Publisher verification and explicit single-use pilot release are still required; this receipt does not authorize execution or any later phase.
