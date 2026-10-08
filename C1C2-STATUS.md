> Publication note (2026-10-03): This report is preserved from its reviewed checkpoint. Its publication status, next-step discussion, and test counts refer to that time. See [current checkpoint](CURRENT_STATUS.md) for current scope and evidence links.

# Tether: bounded C1/C2 mechanism checkpoint

This is an implementation checkpoint for functional content sharing (C1) and prediction-error self-monitoring (C2). It is not evidence of subjective experience, a consciousness score, acquired transfer, or improved competitive performance. The previous closed N/S studies are unchanged and do not evaluate this candidate.

## Demonstrated in bounded tests

- One immutable, versioned opponent hypothesis is delivered to independent attention, planning, episodic-memory, and report consumers. Its position, velocity, uncertainty, evidence time, and provenance are distinct from actuator instructions.
- Fixed-focus content interventions affect actual planner targets and emitted control. Attention delivery has a separate actual gaze/control effect; planner and memory recipient diagnostics remain equal at that intervention.
- A single seeded content cue is encoded, then the intervention is removed. Following legally produced loss of visibility, stored retrieval affects a later emitted decision. Separate write/read cuts remove that effect; restoration reproduces intact actions. All delayed percepts and prior emitted decisions match through the causal comparison boundary. This is a seeded mechanism witness, not ordinary acquisition.
- Frozen predictions are issued before scoring observations, then assessed on the delayed percept clock. Actual legal movement produces prediction error that reaches attention and replanning and changes emitted control. Feedback and control-delivery cuts are distinct; restoration recovers actions.
- A fixed legal-percept replay contains subsequent corrective evidence, a later forecast with changed velocity, lower error, and recovery to the low-error/no-replan state. All replay arms receive identical observations. These are yoked counterfactual controller tests, not independent closed-loop game outcomes.
- Learning freeze preserves the entire persisted memory while a fresh error still triggers transient correction and changes emitted control. The feedback lesion also suppresses transient correction; it is not conflated with freezing learned aggregates.
- Reports remain available with tracing disabled. Turning off report delivery or trace capture preserves actions and complete memory.

## Fixed temporal contract

One pending forecast; due at 0.3 seconds; expiry at 1.0 seconds. Exactly-expiry fresh evidence may assess; missing or later evidence is censored. Assessments are once-only. First actual error initializes the aggregate, then EWMA alpha is 0.25. Reliability stays unknown until two assessments and is high-error only above 0.5 world units. Censoring does not improve or worsen reliability. This aggregate is not a calibrated probability.

Coordination reserves 16 declared nominal work units per eligible cycle. This makes its added cost visible but is not a full-engine operation audit or an equal-compute performance claim.

## Explicit gap

The code clears a pending recall plan when the monitor requires replanning. A native witness in which an organically created pending recall plan is subsequently invalidated has not been established. Native replanning and its action effects are established, but that narrower pre-existing-plan lifecycle claim remains unverified. No privileged actuator-state injection or expanded experiment was used to fill this gap. The full mechanism milestone is therefore not certified complete.

## Scope and next decision

No fresh acquisition/transfer study, remote publication, merge, deployment, or user-computer access has occurred. Before any small held-out ordinary-experience study, freeze its protocol separately, retain this candidate and review, and obtain the user's decision to proceed. Unit checks alone cannot establish learning generalization or subjective consciousness.

The full current suite passes 264/264 with zero skipped. The focused C1/C2 set passes 75/75. These passing tests do not close the explicit missing lifecycle witness above. The independent review accompanies the source checkpoint.

## Current verification and reproduction

Use Node v24.19.0. From this checkpoint's `repo` directory:

```
node --test
node --test test/coordination.test.mjs test/prediction-monitor.test.mjs test/content-broadcast.test.mjs test/target-memory.test.mjs test/freeze-learning.test.mjs
node tools/math-audit.mjs
```

The focused set has 75 passing checks, including 11 coordination checks with native-controller causal fixtures. The arithmetic audit passes its bounded sample checks; it is not a proof of correct rounding.

The old whole-controller noAffect/original-v2 identity assertion was no longer a valid invariant after N/S/C1/C2 changes. Its exact original bytes are preserved outside automatic discovery. Active checks now isolate the original workspace within otherwise-current modules, and compare coordination-disabled behavior against the frozen rebuilt-S controller at `a514c0f7f95f6df1bb987bee315830261b5c6188`. Fixtures and the archived test are hash-verified. See [compatibility fixture scope](fixtures/compatibility/README.md) for full details and the deliberately limited parity claims.

The repository's older README, REPRODUCE, provenance manifests, and study reports describe their respective historical versions. The C1/C2 verification commands and scope above supersede historical Git-fetch prerequisites for this checkpoint only; historical studies and their reproduction tools have not been rewritten.

A separate complete-copy run also passes 264/264 with no `.git` directory and `ORIGINAL_SOURCE` deliberately pointing to a nonexistent path. The saved source archive therefore does not depend on adjacent checkouts or historical Git objects for these current regression tests.
