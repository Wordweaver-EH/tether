# Preflight validation, 2026-10-03

Status: implementation validated; matches remain blocked until exact-freeze independent approval, a verified Git checkpoint, and root release. No counter-versus-ordinary match outcomes were viewed or generated during implementation.

## Results

- 29/29 new tests passed: 13 counter/interface/statistics, 13 measurements, 3 harness/integration-gate tests
- 21/21 existing benchmark tests passed
- Combined focused preflight: 50/50 passed (validation/preflight-tests.txt)
- Full baseline plus new tests: 314/314 passed (validation/all-tests-writable-copy.txt)

The first full-suite attempt directly in the read-only frozen copy had 279 passes and one test-file setup failure: the historical affect compatibility helper copied a read-only mind module into its temporary fixture, then tried to overwrite that copied module and received EACCES. That was not reported as a full-suite pass. The authorized rerun used a fresh temporary copy of identical repository bytes, making only copied mind-module permissions owner-writable so the existing helper could construct its temporary fixture. All 31 frozen source/benchmark byte hashes were verified before and after tests. No protected production bytes or permissions changed. The full baseline alone passed 285 tests; with the 29 new tests, 314 passed.

## Counter competence fixtures

- One external 250ms queue, exact 30Hz cadence, held continuous controls and one-tick pulses
- Canonical public sensor-field boundary, exact imported indexed motor noise, and committed issued commands
- Exact frozen ordinary constructor/action parity with its existing 150ms wrapper
- 5.25 armed/unknown spacing and 4.5 supported-away target
- Hidden/expired spear evidence does not authorize punishment; close return is rejected
- Hidden body does not authorize positive radial chasing; bounded aiming memory expires
- Aligned punishment and own-command duplicate suppression; score resets learned through delayed score packets
- Both lateral directions, opposite bearing frames, blocked-side override and corner escape
- Actual frozen-engine 5.25-unit straight-on fixtures evade the incoming spear in both orientations and beside both horizontal walls
- Actual 4-unit fixtures are hit, preserving the intended close-range limitation

A synthetic fixture exposed an initial sign-coordinate error that reversed a sidestep when a spear threat became visible. It was fixed before freeze and before any competitive outcome; the regression remains. Hidden-body positive radial approach was also suppressed to meet the approved no-blind-chase constraint. No coefficients were selected from match outcomes.

## Evaluator checks

- Actual THROW lineage, retained through embed/recall and simultaneous HITs
- Explicit termination on HIT/reset/neutralization/return completion
- Separate launch centers, true launch origin, impact centers and projectile displacement
- HIT corner geometry recomputed from exact event positions before reset
- 32-direction geometric confinement separate from wall/obstacle proximity
- Explicit approximate 30Hz occupancy, termination clipping, movement/hit-reset/censored episode exits
- Loud failure for missing lineage, score mismatch or unrecorded spear state changes
- Role-mapped pooled geometry weighted by exposure
- Seat-paired cluster bootstrap and mutually exclusive predeclared classification
- CLI default cannot run matches; missing/mismatched release fails before output creation

Measurement context-associated HIT counts are descriptive associations with the latest received counter decision, not causal attribution. Representative synthetic dodges establish implementation competence, not guaranteed evasion, universal strategy optimality, or human enjoyment.
