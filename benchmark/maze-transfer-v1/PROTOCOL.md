# Bounded maze module transfer v1: pre-score protocol

Scope: one small CPU-only headless domain, unchanged Tether workspace/coordination/memory/prediction monitor and budget, new disclosed maze adapters. No training, architecture superiority, consciousness or broad transfer claim. Freeze this protocol and source in a root-verified remote checkpoint before scoring. Pilot seed 991 and hand-built mechanism fixtures are excluded from scored evidence.

## Matrix and stopping condition

Seeds 1709, 3253, 6421; conditions familiar and switch; arms full, contentCut, memoryOff, monitorOff, fixed, conventional: 36 episodes. Every episode starts fresh on the single fixed maze, player (1,1), ghost (4,1). Stop on collision (including edge swaps), all 44 pellets, or 64 half-second steps. No respawn or reset. In switch only, after 24 completed steps the ghost changes from seeded non-reversing patrol to greedy pursuit. The shift is not disclosed in percepts. Familiar control retains patrol. Thus familiar means prior within-episode behavior, not trained skill. Deaths before the shift are retained and counted as unexposed; never extend, replace or cherry-pick them. No second scored maze or extra seeds after outcomes.

Full uses existing mechanisms. contentCut cuts selected-content delivery to attention/planner, preserving computation, memory and monitor. memoryOff cuts episodic read delivery, retaining the explicit local static one-second trace. monitorOff retains assessments/feedback and cuts only contingent control. fixed cuts contingent control and uses existing fixed schedule every4 ticks, phase0. Conventional bypasses workspace/coordination, uses a one-second linear local tracker, threshold threat goal, same planner, periodic requests and sensor/action/budget contracts. It is a practical small comparator, not an optimal baseline or actual-compute-matched control.

## Outcomes

Report all rows and paired full-minus-each-arm pellet counts, death indicators and steps, separately by condition. Primary descriptive endpoint: pellets collected before terminal; do not replace it after seeing survival. Death rate and completion rate contextualize it. Three independent seed clusters only; no significance claim. Report how many survive to the switch boundary and actual post-boundary steps. No result warrants a general learning or transfer-performance claim.

Report mechanism exposure and costs: packets, recalled deliveries, forecast assessments, errors >0.5, active/high-error requests, action-cache invalidations, planning calls and nominal logical work; pre/post boundary counts. High-error recovery episodes are assessed-high to next assessed-low, with unresolved intervals right-censored at episode end; lack of observation is not recovery. First post-boundary large error is an event count, not reliable novelty detection. Persistent high-error requests may continue without fresh evidence; report request saturation rather than crediting it as adaptive behavior.

Common-percept replay: replay each full episode's exact percepts through each alternative controller and compare actual move/gaze outputs, together with first divergence. This isolates module interventions conditional on full's sensor stream, not achievable closed-loop alternate worlds or proof of benefit. Also retain closed-loop paired outcomes.

## Integrity

Correctness fixtures must demonstrate sensor occlusion/non-leakage, legal movement/collision/pellet accounting, deterministic replay, unchanged source imports, unchanged existing test regressions, action-level content and monitor effects. Memory-action and workspace-action fixtures are reported honestly; unavailable effects are limitations, never replaced with packet-count claims. Interventions in fixtures may change selected hypothetical content but cannot introduce new sensory evidence or lengthen TTL.

Runner verifies the frozen manifest before/after, refuses nonempty output directories, stores every raw episode/percept/action/trace locally outside the repository, and replays all emitted actions into a fresh same-seed world to verify every percept and outcome. Only compact summaries/protocol/code go to the main branch through the root. Raw upload remains canceled; no PR-body editing, merging or deployment.

Freeze first, then execute this one matrix and stop. Repair correctness failures before scores; after scores, any invalidating bug is reported with affected evidence withdrawn, not silently fixed and relabeled. This tiny audit aims to expose portability and environment dependence, including null or negative results.
