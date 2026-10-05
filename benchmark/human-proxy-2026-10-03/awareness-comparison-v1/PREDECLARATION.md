# Frozen rear-awareness comparison v1

Declared 2026-10-04 UTC, before implementation, structural smoke, source freeze,
or any fresh comparison outcome. Prior studies motivated this one mechanism;
no saved trajectories, hit coordinates, seed outcomes or fitted parameters are
used to choose the implementation. The original 64 bouts remain unchanged and
inconclusive. This study does not release either earlier conditional branch.

## Question and fixed budget

Does adding the already reviewed sensor-only warning and scan/movement response
to the unchanged human-paced counter improve its net physical HIT rate against
the same frozen ordinary policy?

Exactly 32 fresh seed clusters × two counter seats × two arms = 128 five-minute
bouts, 640 simulated minutes. Arms are `unchanged` and `awareness`. Each seat/arm
within a cluster shares episode-noise, counter and ordinary role seeds. Thus
noise samples share addresses across arms at the same physical seat/decision;
realized errors can differ because aim-dependent noise sigma differs. The seat
swap also changes physical-seat noise. Seeds are SHA256-addressed by
`tether-rear-awareness-comparison-v1`, cluster and role and checked for overlap
with the original study and distinct structural-smoke namespace. All 128 rows,
including order, are published before main execution. Cluster parity alternates
arm order; seat order is P1 then P2. No outcome-dependent stopping, row deletion,
replacement seeds, tuning, model fitting, parameter search or repeated main run.

## Frozen mechanism and exact arbitration

The reviewed prototype is copied byte-for-byte (SHA256
bb78bce500b06697b3ab6c9320c55ce52691b43f4714dce224fad9cc3f409250).
Its 0.8-second source memory and all geometric/timing constants stay unchanged.
Both arms call the unchanged counter on each canonical delayed MODE_B packet and
commit only the actual issued command back into its existing own-spear/movement
memory. Both receive a shadow assessment from the frozen awareness module; this
allows common measurement and has no command effect in the unchanged arm.

On an awareness-arm warning only:
1. Replace the proposed aim with the exact scanAim toward the conditional rear
   landmark. There is no simultaneous aim at the opponent
2. Set throw=false for that decision, because the scan uses the same aim channel.
   Count any base-policy proposed throw thereby withheld. This is the declared
   scan opportunity cost, not a separate general punishment-suppression arm
3. Preserve the base recall bit exactly
4. If the prototype certifies a movement, replace movement with that exact unit
   direction for the next decision interval. Do not quantize or rotate it. If
   movement is uncertifiable, retain the base movement and label this scan-only
   as uncertified; make no clearance guarantee about the retained base movement
5. Apply the existing common motor transform once, after arbitration. It adds
   aim noise only. Commit actual movement to awareness for its existing tie rule

On no warning, the entire base proposed command passes unchanged. Visible enemy
spears abstain in this module, preserving the original visible-threat policy.
Scans are not latched: each new delayed packet alone plus permitted memory decides
whether to continue. No extra delay queue. No hidden reset, recall target, current
state, world events, enemy commands or evaluator truth reaches either controller.
The awareness assessment reads only its previously reviewed allowed fields.

The original human interface remains 250-ms delayed, decisions 30 Hz; ordinary
remains 150-ms delayed and 30 Hz. Both use the same original MODE_B perception,
indexed noise and motor transform. Simulation remains default 120 Hz, five
minutes, MODE_B, original rules/defaults/mind/source bytes unchanged. This is a
single engineered proxy comparison, not evidence of human fun or best response.

## Outcomes and analysis fixed before execution

Primary: for each cluster and seat calculate
[(awareness delivered - awareness received) -
 (unchanged delivered - unchanged received)] / 5 minutes.
Average its two seats, then average the 32 cluster differences. The inferential
unit is the paired cluster, not 128 independent bouts or individual HITs.
Use 20,000 SHA256-addressed cluster bootstrap resamples, percentile 2.5%/97.5%
endpoints with linear quantiles. Resample each full paired cluster jointly across
all metrics using namespace `tether-rear-awareness-bootstrap-v1`.

Classification, after integrity/manipulation review:
- `awareness-improves-net-rate` iff primary lower endpoint > 0
- `awareness-worsens-net-rate` iff primary upper endpoint < 0
- `inconclusive` otherwise
- Missing warnings/scans or any failed integrity/manipulation requirement makes
  the result invalid for the intended awareness-effect claim, regardless of score
A lower endpoint >= 0.5 HIT/min is additionally labelled a practically clear
improvement at the declared 0.5 threshold. This qualifier cannot replace primary
classification. No multiplicity-adjusted secondary efficacy claim is made.

Also report the unchanged and awareness net rate against ordinary with cluster
CIs. Preserve the earlier descriptive classification boundaries: lower>0 beats;
lower>=-1 neutralizes within margin; upper<-1 ordinary dominates; else inconclusive.
Those arm-specific classifications neither authorize another research branch nor
replace this study's paired primary question.

Predeclared secondary descriptive rate differences (with same paired cluster CIs):
- Reduction in RETURNING HITs received/min: unchanged minus awareness, positive
  means fewer return hits. Include OUTBOUND received and total received
- Offense cost: delivered HITs/min and RETURNING/OUTBOUND delivered, awareness
  minus unchanged; actual THROW and RECALL_START rates, proposed base throws,
  executed throw commands and scan-withheld base throws per minute
- Opportunity cost: base aligned-away opportunities, scans while a base throw
  was proposed, scan angular displacement from base aim, motor sigma, proportion
  of delayed packets with visible opponent body/enemy spear/RETURNING spear
- Process: shadow warnings/min and fraction of decision intervals, warning
  episodes, executed scans/min, certified movement overrides, uncertified
  scan-only decisions, warning expiration/reset reasons, delayed reacquisition
  following warning (next packet visible while an episode is active)

Evaluator-only diagnostics are saved separately from controller arguments:
- At receipt, true enemy spear phase and visibility before the issued scan, joined
  to that decision. Report warning-conditioned actual RETURNING fraction and the
  complement. The complement is only a current-state non-return warning fraction,
  not proof of a false prediction: the warning predicts no actual recall
- Warning/scanning exposure at received HITs; true body/spear visibility at the
  next 30-Hz source sample after an executed scan, with time/score transitions
  retained. These are process associations, not isolated causal scan effects
- Full source-sampled permitted packets, issued commands, assessment/decision
  diagnostics, events, exact HIT lineage/phase and measurement raw data support
  independent reconstruction. Event geometry may be inspected by evaluators only

Every rate uses actual fixed five-minute exposure. Warning decision occupancy is
number × 1/30 seconds clipped at bout end; no full-bout claim for initial startup.
Process decision proportions use recorded-decision denominators. Empty conditional
denominators are null, never zero. Reacquisition counts are descriptive and do not
assert that the scan caused visibility or that the same physical spear persisted.

## Integrity, testing and release

Before freeze: rerun existing relevant preflight tests; add exact no-warning and
unchanged-arm command equivalence, scan arbitration/throw cost/recall preservation,
certified and scan-only movement, actual-command commit, forbidden-input boundary,
250-ms/30-Hz/once-only noise, source hash, seed pairing/freshness, statistics and
release-gate tests. Rerun the existing 22-group synthetic prototype suite.
A separate smoke uses four 3-second bouts (both arms × both seats), distinct seeds,
only to test wiring, cadence, logging, compression and runtime. No scores, hit
counts, efficacy metrics or comparative outcomes are printed, read or used. It
cannot amend the policy. Any structural defect and repair is retained in the log.

Then freeze protocol, source, tests, seed manifest and dependency hashes. Stop for
independent review, root Git checkpoint and root release of that exact freeze.
Runner refuses main outcomes without all three, changed sources, or an existing
output directory. Serial CPU-only execution saves each raw bout losslessly as
JSON.gz with compressed and uncompressed SHA256, summaries and durable per-bout
progress. Raw goes to the data queue; code/protocol/report are prepared for the
root publisher. No Git writes by this worker and no upload without authorization.

An infrastructure interruption preserves partial evidence and requires review
before recovery; it does not permit a silent new-directory rerun. Statistical
classification is produced only after all 128 unique manifest rows complete.
All original 64 raw hashes, prior package hashes and protected/frozen source hashes
are verified before and after this study. No further research after this result.
