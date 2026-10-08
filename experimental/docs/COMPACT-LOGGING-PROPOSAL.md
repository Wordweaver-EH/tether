# Proposed logging-only revision for the bounded full study

Status: DESIGN FOR REVIEW ONLY. No implementation, new gameplay, controller changes or increased resource ceiling is authorized by this document. Pilot001 and its original source stay immutable. Pilot002 first addresses only the two approved infrastructure defects.

## Why review is needed

The incomplete development pilot produced 181 completed tasks and 131,751,581 compressed raw bytes (1,877,173,017 uncompressed). An arm-balanced linear 30-to-300-second planning projection is about 27.95 GiB raw and 28.24 child CPU-hours, exceeding the 16 GiB/24 CPU-hour full-study caps before uncertainty. This projection is not an upper bound and is not scientific evidence about any policy. Killed-child CPU is missing from the failed attempt's terminal accounting.

## Invariants that will not change

- All frozen controller/engine/shared-interface bytes, vectors, acquired snapshots, mechanism options, physics/configs, seeds, tasks, 12 clusters, score definitions and statistical criteria
- Exactly the existing 120 Hz simulation, 18-tick sensor delay, 30 Hz decisions, indexed noise, pulse/hold semantics, and nominal public physics
- The focal interface.act decision-timing boundary. No controller work is removed, moved outside timing or replaced with observer work
- Native forecast issue/outcome semantics, missingness/censoring and separate shadow origins
- Exclusive task streams, ordered hash chains, stored/uncompressed hashes/byte counts, stopped-attempt preservation and independent audit

## Proposed persisted schema

1. Task start: complete task and provenance, configuration once, frozen/accepted memory hashes, initial world state/hash, actual runtime/hardware metadata, full arm settings and a schema dictionary.
2. Every actual decision, both seats: integer receipt/sensor ticks and their separate clocks; pre-motor focal command; actual two-seat actuator commands; indexed motor sample/sigma; committed focal command/time; legal delayed percept hash; visibility bits; decision act time and observer time. Held continuous inputs and single-frame pulses remain reconstructible at 120 Hz.
3. Every mind decision: serial, focus, situation, original habit tactic/sample count/value/predictedFailure/automatic, issued tactic/tier, exact valid/familiar/family/cell/native novelty fields and features, novelty/monitor forcing and blocked flags, plan status, completed-branch count, issued learning tier, fixed-teacher schedule and realization flags, configured/spent/remaining/by-kind work. Partial baseline planner counters and measured timing remain on every baseline decision.
4. Shared-content/C2 records: exact selected/delivered packet once per identity/revision, recipient delivery flags and actual attention/planner recipient fields needed by the metric contract. Exact native forecast issue, native assessment/censoring and reliability changes are recorded once per native identity; each decision references its active identities and preserves request/category/error values. No observer truth is fed back.
5. Learning rows: exact pending forecast issuance once per native key/tactic/time, complete native settled outcome and censored terminal row; optional shadow rows remain explicitly non-primary. No averaging or inferred replacement forecast.
6. Faithfulness: all specified checks still run on the actual native report and actual commands every decision. Persist per-decision invariant result bits, per-check applicability/missingness counts, hashes of the actual report/compared native fields, and the complete actual report/native/command witnesses for every mismatch. Full duplicate success-case report text is omitted, as permitted by the metric contract.
7. Physics/events: retain every actual simulator event (especially HIT with attacker/phase/tick), every final actuator command for both seats, initial and terminal world hashes, integer score increments and fixed window numerators/denominators. Optional periodic world hashes at a fixed preregistered cadence provide replay checkpoints. Environment replay can reconstruct receipt/sensor-time truth exactly without controllers from the locked config, initial state and complete command schedule. Validate that reconstruction against existing pilot raw truth before any full-study release.
8. Task end: final state/hash/scores, accepted/output memory hashes, native terminal pending states, exhaustive invariant totals/witness references, resource receipts and separate output memory artifact.

## Explicit omissions

Do not persist duplicate full branch rollout trajectories, repeated identical pending/outcome/packet/report objects, whole cognition aggregates every cycle, or duplicate full world/percept objects at every frame. These are redundant or outside the contracted metrics. Preserve branch completion summaries and exact selected/issued route. No invented latent belief or consciousness metric replaces an omitted object. If a later requested counterfactual diagnostic needs missing data, its feasibility must be declared rather than reconstructing a nonexistent internal state.

## Proposed observer-only efficiency changes

- Capture logger truth/percept identity only at sensor frames that will actually be delivered to a decision, instead of cloning all 120 frames per second. Alternatively reconstruct truth offline from the full action stream. This does not change the shared interface's own 120 Hz packet queue.
- Reuse immutable diagnostic snapshots already returned inside the unchanged shared interface through a transparent observer proxy, avoiding an additional post-act native clone. Never bypass or remove the original in-timer diagnostic/calibration calls.
- Serialize the compact schema above; retain all actual decisions and required metric records. No time-based or outcome-based subsampling.
- Consider lower-cost lossless gzip settings, selected solely by offline byte/time benchmarks on preserved development-pilot records. No gameplay performance is used to choose logging settings.

## Acceptance plan before implementation and release

First obtain independent review of this schema against every METRIC-CONTRACT field, including an explicit reconstructibility map and fixed replay-checkpoint cadence. Only after design approval, implement in a separate source revision. Offline-transform preserved pilot evidence to verify native row identities, events, clocks, exhaustive invariants and exact replay state hashes; compare all contracted metrics before/after. Measure logging/compression CPU and volume using saved data without running controllers. Keep process resource scopes and timing boundaries unchanged.

A newly reviewed, published replacement runtime pilot must still demonstrate feasibility of the final instrumentation. Preserve all 12 full-study clusters. If conservative runtime/volume projections remain over the original caps, do not run the full study; report a bounded runtime-only scope amendment or user decision. No outcome-based parameter tuning, sample selection, condition removal or automatic budget extension.
