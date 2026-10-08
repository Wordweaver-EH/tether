# Compact schema v2: explicit review map and acceptance gate

DESIGN ONLY, supplementing COMPACT-LOGGING-PROPOSAL.md. Original attempt001 and minimal-fix sources remain unchanged. No compact implementation begins until independent metric-map approval.

## Common representation

Use objects with named schema-v2 fields. Copy a source field only when Object.hasOwn(source,key); preserve explicit null, false and zero distinctly. Nonfinite numbers retain the existing tagged representation. An absent native field is absent/unknown, never inferred false/zero. Every decision row has integer receiptTick, sensorTick, decisionIndex and seat; serial comes from native diagnostic when present. Content-addressed dictionary objects use SHA256 of the complete tagged canonical object bytes, including all content/revision fields. Revision alone is never an identity. Source key order is preserved by a documented fixed projection; packet identity hashes the original full object.

## Field → source → retained representation

- receiptTick → simulation loop tick → decision.receiptTick
- sensorTick → actual logger capture tick → decision.sensorTick; require receiptTick−sensorTick=18
- receiptTime → simulation elapsedSec (tick×DT) → decision.simulatorReceiptTime
- interfaceReceiptTime → receiptTick/120 → decision.interfaceReceiptTime
- actual commitTime → observer wrapper's actual forwarded commitCommand argument → decision.commitTime
- sensorTime → delayed native diagnostic.time for mind, actual captured public percept elapsedSec for all arms → decision.sensorTime
- legal delivered percept identity → sensorPacket(captured legal percept) for each seat at sensorTick → decision.perceptHashes[P1/P2]
- pre-motor command → actual native act return captured without modification → decision.preMotorCommand
- actual actuator inputs → two interface.act returns passed to real step → decision.inputs[P1/P2], every decision, without filtering
- committed command → actual command forwarded to native commitCommand → decision.committedCommand
- motor sample/sigma → existing indexed motor transform observer → decision.motor.sample/sigma
- legal visibility → captured legal percept null/non-null fields → decision.visibility per seat (own spear/opponent body/opponent spear)
- decision wall → unchanged focal interface.act start/end → decision.focalInterfaceMs
- observer wall → existing post-act diagnostic/check/serialize scope → per-task aggregate; no movement of native work across timed boundary

### Native route/work fields (every mind decision)

- serial → diagnostic.serial → native.serial
- workspace focus → diagnostic.focus → native.focus
- tier, automatic, situation, tactic → cognition corresponding fields → native.tier/automatic/situation/issuedTactic
- habit tactic, n/support, value, predictedFailure, aware → cognition.habit.tactic/samples/value/predictedFailure/aware → native.habit same source fields
- native novelty valid/familiar/family/cell, features/count/minimum/novel/reason → cognition.novelty full small object → native.novelty without inferred replacements
- noveltyRequested/noveltyForced/monitorForced/handoffBlocked/planStatus/completedBranches/issuedLearningTier → cognition exact same-name fields → native same-name fields
- configured budget and nominal work → cognition.budget.limit/spent/remaining/byKind → native.budget full object
- fixed teacher due/opportunity/attempted/completed/issuedTeachingAction/every/phase → cognition.fixedTeacher → native.fixedTeacher full object if present
- branch completion bounds → cognition.branches each tactic/completion → native.branchCompletion array preserving order; selected branch's tactic/completion retained separately if present
- planned/invalidated recall state → diagnostic.pendingRecallPlan and cognition.coordination.pendingRecallPlan/invalidatedRecallPlan → native recall fields, not inferred from world truth
- conventional logical work → actual controller.diagnostics() → planner diagnostics full object (small), including fallback counts; ordinary policy uninstrumented is explicitly null/not available

### Calibration and support

- native pending issue → actual controller.cognition().pendingOutcome returned during the unchanged interface calibration capture → standalone native-pending-issue row on each new exact (key,tactic,time) identity, before any later settlement, including terminal unresolved issues
- exact native outcome/censor → existing interface.calibrationRecords()/finishCalibration() → unchanged complete calibration rows with origin/primary/censored labels
- shadow → unchanged existing evaluator shadow rows, never promoted to native
- pending identity → full key/tactic/time plus issue row hash; no dedup by tactic or key alone
- cold-start support → initial accepted learning table and native completed outcomes only. Preserve initial per-situation/per-tactic genuine sample counts in task-start support metadata; exclude modelN. Each native completed outcome increments the corresponding observed count in the observer ledger. At issuance, store situation-level and action-level prior genuine counts separately, plus their zero-support flags, explicitly evaluator-derived. This classifies support without modifying native predictedFailure. The protocol owner must confirm which zero-support flag defines the primary cold-start subgroup before implementation.
- training prevalence reference → frozen qualified learning table genuine successes/sample counts only → separate frozen reference artifact; no pilot/search/test fit

### C2/shared content/gaze

- selected packet and every non-null delivered attention/planner/memory/report packet → exact cognition.coordination packet/deliveries objects → content-addressed full-object dictionary and per-decision recipient references
- actual attention/planner recipient outcomes → cognition.coordination.receivers (attention used/proposed, planner used/proposed means etc.) → exact recipient object; no unseen belief state fabricated
- forecast issue → cognition.coordination.forecastIssue and monitor.pending → deduplicated exact full native object with full-object hash; per-decision reference
- assessment/censor → cognition.coordination.assessment and monitor.lastAssessment/lastDisposition → exact native object when full identity changes; per-decision reference
- reliability category/errorEWMA/assessed/request and proposed request → exact monitor/coordination state → per-decision small fields, preserving missingness
- terminal unresolved C2 → existing observer boundary-censor row, explicitly evaluator-boundary-censor, not native expiry
- shared target accuracy → packet mean/velocity at its documented time + exact physics replay at the same sensor tick; evaluator-only, descriptive

### Faithfulness

Read the actual controller.report() after act. Execute every existing check; add no causal claim. Each decision persists an ordered result for every check: pass, mismatch, not-applicable, or skipped-missing-report. Persist hashes of actual report and compared native/command values. Persist every complete mismatch witness, including actual report, native fields, intended/actual/committed commands and relevant times/ticks. Aggregate denominators are sums of these per-decision states. No conditional check silently disappears. Successful reports may be omitted only after preserving these reviewed invariant results, references and native metric fields.

## Exact physics reconstruction contract

The task-start locked config and exact initial world determine tick0. Both interfaces return six-field zero commands on ticks0..17. Decision ticks are18+4i; use both complete actual recorded actuator commands at those exact ticks. On every intervening tick, copy preceding continuous controls, force throw=false and recall=false. Never call a controller or regenerate motor noise during replay. Apply the unchanged production step through the experimental world adapter at120Hz. Record state hash after each120 ticks (1simsecond), plus initial and terminal; this cadence is fixed now and is independent of outcomes. Every physics event remains persisted with tick/time and full event content. Integer score bins come only from real HIT events on(start,end], with five60-second bins for300s bouts; partial pilot bouts do not claim the full recovery endpoint.

The compact stream need not retain repeated complete world truth. Offline replay supplies receipt/sensor-time physics truth and checks it against these fixed state hashes; legal percepts can be recomputed from that replay with the locked perception module and verified against retained delivered percept hashes. Thus future counterfactual physics branches may use reconstructed environment state and fixed recorded commands only; omitted internal rollout trajectories cannot be invented later.

## Transparent diagnostic reuse proof

If implemented, observer proxy methods must call the exact same native functions at the same points with the same argument identities/order, return the exact native result to the unchanged shared interface, and only retain that returned reference for post-act observation. Do not precompute, skip, duplicate, reorder, replace or move any existing native/shared-interface call inside focal act. Do not mutate cached return values. Existing post-act redundant clones alone may be removed. A synthetic spy-controller test must compare original vs proxy call sequence/arguments/results and actuator outputs; no gameplay is needed.

## Acceptance before a replacement runtime pilot

1. Independent approval of this complete field map, primary cold-start definition, dictionary identity, checkpoint cadence and omission list
2. Separate compact source revision with unchanged frozen src and benchmark/interface hashes, same tasks/configs/seeds/limits
3. Offline transform all181 completed attempt001 streams, preserving original bytes. Validate every chain and compare every retained metric/source field, exact native pending/calibration identities/outcomes/censors, every event, all invariant applicability states and original mismatch witnesses
4. Replay every completed task without controllers; compare every saved receipt-time and sensor-time world truth, both-seat legal percept hashes, all events and final state hash. No sampled-only replay acceptance
5. All initial/final acquired memory files remain exact originals; compact stream references cannot change session linkage
6. Synthetic proxy noninterference/call-sequence proof, compression roundtrip and resource/cancel guards pass. Offline compression timing/volume benchmark uses only preserved development data
7. Independently reviewed/published final source and explicit root release for the replacement development pilot. Full-study release still requires conservative runtime/volume feasibility within original16GiB/24CPUh/8h caps with all12clusters, not a favorable scientific outcome

### Scope and observer polling clarification

All native calibration identities additionally include taskId, focal seat and integer issueSensorTick (=round(native issue time×120)); the original floating native time remains authoritative and preserved. C2 dictionary/disposition/forecast identities are local to taskId and seat and include the full native identity/content, never just a revision number. Every original native novelty field, including reason/count/minimum, remains in the native novelty object.

The unchanged interface continues its original in-timer native getter and calibration logger calls. Outside that timer, repeated calibrationRecords() cloning of the entire accumulated history may be replaced by one terminal finishCalibration() extraction, but only when exact native pending issuance and native completed outcome objects are independently streamed from already-returned cached native snapshots at their actual decision. Final full native/shadow calibration rows must reconcile one-to-one with those contemporaneous native records. Shadow rows remain unchanged, non-primary, and need not pretend to have native issuance. This is an observer polling change, not a native learning/calibration change.
