# Appraisal-driven persistence repair: preregistered targeted evaluation

Registered locally before evaluation outcomes, 2026-10-02. Separate revision copied from final-source. Original source and its 39,168-bout evidence remain unchanged. Its affect entry-threshold modulation was structurally inactive: eligible Hunt/Search candidates always exceeded both admission thresholds. Its zero effect was an implementation defect, not proof that working appraisal control could never help.

## Fixed intervention

Only workspace appraisal-driven persistence and its trace change. Specialist utility, actions, reflexes, belief, learning, physics and budget accounting are unchanged. Coefficients are fixed before this study without outcome fitting:

- urgency = clamp(arousal + 0.25 max(0,-valence) + 0.2 clamp(-scoreMargin/5,0,1),0,1)
- stability = clamp(confidenceMood + max(0,valence),0,1)
- refractory seconds = 0.38 (1 - 0.70 urgency + 0.20 stability), bounded 0.114–0.456
- challenger margin = 0.13 (1 - 0.65 urgency + 0.20 stability), bounded 0.0455–0.156

Threat/surprise and adverse outcomes favor reorientation; confident favorable appraisals favor persistence. This implements DESIGN.md switching-speed/hysteresis requirements, as a hand-designed control hypothesis, not a validated emotion model. Zero appraisal exactly restores original noAffect constants. Entry/hold thresholds remain unchanged. noHysteresis still bypasses persistence.

Development tests use seeds 991 and 992, both excluded from evaluation. A 10-second development smoke with seed 991 established reachable divergence before registration. Excluded from evaluation, it supplies no benefit evidence and caused no tuning. Regression tests cover identical percept streams, control bounds, noHysteresis independence and cross-build noAffect action/replay equivalence ignoring only the wall-clock metadata timestamp.

## Design and stopping condition

32 fresh seeds 200001–200032 × modes A/B × both seats × fixed opponents directShooter, immediateRecaller, reactiveDodger × full/noAffect. No opponent mind. Fresh independent memory per bout, normal difficulty, budget 192, complete 300-second bouts. Total 384 matched pairs / 768 bouts; 4 CPU workers. Seeds disjoint from original audit and development smoke. Run all cases, no early stopping or coefficient changes. Errors abort without dropping cases; any correction requires disclosure and revised registration/restart.

## Endpoints

Primary causal endpoint: exact six-channel actuator-stream divergence, SHA-256 plus differing-input-tick count. Also count differing 30 Hz decision-boundary ticks (every fourth 120 Hz input tick). This measures actions, not trace labels. Influence is distinct from usefulness.

Focus-switch frequency is descriptive mechanism evidence. Secondary physical outcomes: paired score margin and win value (win 1, tie 0.5, loss 0). Sign: noAffect minus full; negative physical effects favor repaired full. Report 95% seed-cluster bootstrap intervals, 2,000 resamples, bootstrap seed 72931, over 32 seed means. Seats/modes/opponents are repeated measurements. Subgroups/outcomes are descriptive and multiplicity-unadjusted; no general benefit claim from selected favorable subgroup.

Ahead/tied/behind strata use actual pre-step observed scores, never the zeroed affect vector. Record time, throws, recalls, hits/taken, focus switches. These endogenous outcome-conditioned strata are descriptive, not randomized causal effects.

Verify requested/max/cumulative budgets in every row. Hash source, runner, registration before launch and after completion; retain all paired raw rows. Original v2 audit cannot be relabeled repaired evidence. All non-noAffect arms change; targeted results do not certify all mechanisms, old budget sweep, learning or exploit resistance for this revision. Wider reruns require separate stated decision.

## Reproducibility details

Validate unique, complete job IDs and exactly 300 seconds per arm before final aggregation. Focus-switch score-state strata use the original delayed percept timestamp, matching the state the mind was processing. The cross-build control regression imports the preserved sibling `final-source` directory; retain that original source beside this repair for reproducing the test.
