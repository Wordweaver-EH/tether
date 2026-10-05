#!/usr/bin/env python3
"""Format the complete frozen runner's report; no bouts, fitting or new inference."""
import argparse,json,pathlib,hashlib
p=argparse.ArgumentParser();p.add_argument('primary_directory',type=pathlib.Path);p.add_argument('new_report',type=pathlib.Path);p.add_argument('--review',type=pathlib.Path);a=p.parse_args()
r=json.loads((a.primary_directory/'REPORT.json').read_text());s=r['statisticalResult'];primary=s['primary'];arms=s['perArm'];secondary=s['secondary']
review=json.loads(a.review.read_text()) if a.review else None
if review:
 assert review['status']=='pass' and review['reportSha256']==hashlib.sha256((a.primary_directory/'REPORT.json').read_bytes()).hexdigest()
 assert review['rawManifestSha256']==hashlib.sha256((a.primary_directory/'RAW-MANIFEST.json').read_bytes()).hexdigest()
 assert review['runIdentitySha256']==hashlib.sha256((a.primary_directory/'RUN-IDENTITY.json').read_bytes()).hexdigest()
assert s['design']['bouts']==128 and len(r['bouts'])==128 and len(r['rawFiles'])==128
fmt=lambda x:'null' if x is None else f'{x:.6f}'.rstrip('0').rstrip('.')
ci=lambda x:'unavailable' if x['ci95'] is None else '['+', '.join(fmt(v) for v in x['ci95'])+']'
metric=lambda arm,k:arms[arm]['metrics'][k]
lines=['# Frozen rear-awareness comparison v1: completed result','',
'## Primary finding','',(f"Independently reviewed classification: **{r['classificationProvisionalUntilReview']}**." if review else f"Provisional classification pending independent result review: **{r['classificationProvisionalUntilReview']}**."),
f"The combined awareness/scan/conditional-movement/scan-withheld-throw variant changed net physical HIT rate by **{fmt(primary['estimate'])} HIT/min**, paired-cluster 95% CI **{ci(primary)}**, versus the unchanged counter.",
f"The declared 0.5-HIT/min practical-clear-improvement qualifier is **{str(primary['practicallyClearImprovement']).lower()}**.",'',
'Exactly 32 fresh paired seed clusters, both counter seats and both arms completed: 128 five-minute bouts, 640 simulated minutes. The primary averages both seats inside each cluster; its 20,000-resample bootstrap resamples complete paired clusters. No optional stopping, parameter search or outcome tuning occurred.','',
'## Against the same frozen ordinary policy','',
'| Counter arm | Counter HITs | Ordinary HITs | Net HIT/min | Cluster 95% CI | Descriptive classification |',
'|---|---:|---:|---:|---|---|']
for arm in ['unchanged','awareness']:
 q=s['againstOrdinary'][arm];v=arms[arm];lines.append(f"| {arm} | {v['counterHits']} | {v['ordinaryHits']} | {fmt(q['estimate'])} | {ci(q)} | {q['classification']} |")
lines+=['',"The label neutralizes-within-margin means only that the cluster-CI lower endpoint meets the predeclared -1 HIT/min margin. Both observed net rates are negative; this does not establish equal performance or beating ordinary.",'','Both counter arms retain 250-ms perception, while ordinary retains its original 150-ms perception. Decisions remain 30 Hz and simulation 120 Hz. Arms share noise sample addresses within a seed/seat; scan-dependent aim speed changes noise magnitude, so realized aim errors need not match.','',
'## Return HITs and offense cost','']
for key,label in [('returningReceived','RETURNING HIT reduction, unchanged minus awareness'),('outboundReceived','OUTBOUND HIT reduction, unchanged minus awareness'),('totalReceived','Total received HIT reduction, unchanged minus awareness'),('delivered','Delivered HIT change, awareness minus unchanged'),('actualThrows','Actual THROW rate change, awareness minus unchanged'),('actualRecalls','Actual RECALL_START rate change, awareness minus unchanged')]:
 q=secondary[key];lines.append(f"- {label}: {fmt(q['estimate'])}/min, 95% CI {ci(q)}")
lines+=['',f"The transparent net arithmetic is {fmt(secondary['returningReceived']['estimate'])} fewer RETURNING HITs/min minus {fmt(-secondary['outboundReceived']['estimate'])} more OUTBOUND HITs/min = {fmt(secondary['totalReceived']['estimate'])} fewer total received HITs/min. That is offset by {fmt(-secondary['delivered']['estimate'])} fewer delivered HITs/min, leaving {fmt(primary['estimate'])} net HIT/min. Return reduction alone does not establish an overall benefit.",'',f"The awareness arm withheld {metric('awareness','withheldThrows')['total']} base-proposed throw commands specifically during scans. Base-proposed throws/opportunities also fell from {metric('unchanged','baseProposedThrows')['total']} to {metric('awareness','baseProposedThrows')['total']}. The awareness arm issued {metric('awareness','throwCommands')['total']} throw commands and produced {metric('awareness','actualThrows')['total']} actual THROW events; the unchanged arm issued {metric('unchanged','throwCommands')['total']} commands. These are distinct command/opportunity costs; changed trajectories also change later opportunities. The {metric('awareness','withheldThrows')['total']} withheld proposals cannot be equated with the {arms['unchanged']['counterHits']-arms['awareness']['counterHits']} fewer delivered HITs.",
'', 'Secondary intervals are descriptive and are not multiplicity-adjusted efficacy claims.','',
'## Warning, scan and visibility process','',
'| Process count | Unchanged (shadow awareness) | Awareness |','|---|---:|---:|']
for key,label in [('warnings','Warning decisions'),('warningEpisodes','Warning episodes'),('scans','Executed scans'),('movementOverrides','Exact certified movement overrides'),('scanOnly','Scan-only decisions retaining uncertified base movement'),('reacquisitions','Delayed spear visibility after a warning episode')]:
 lines.append(f"| {label} | {metric('unchanged',key)['total']} | {metric('awareness',key)['total']} |")
for arm in ['unchanged','awareness']:
 v=arms[arm];lines+=['',f"{arm}: warning occupancy {fmt(100*v['warningOccupancy']['fraction'])}% of full-bout time; delayed opponent-body visibility {fmt(100*v['conditional']['visibleOpponentFraction']['value'])}% of decisions; mean motor sigma {fmt(v['conditional']['meanMotorSigmaRad']['value'])} radians."]
q=arms['awareness']['conditional']['warningActualNotReturningFraction'];f=100*q['value'] if q['value'] is not None else None
lines+=['',f"At awareness warning receipts, the evaluator's current enemy state was non-RETURNING in {q['numerator']}/{q['denominator']} cases ({fmt(f)}%). This is a current-state complement, not a false-recall-prediction rate: the warning makes no claim that an unseen recall actually occurred.",
'', f"Scans use the single aim channel, and throws are withheld on those decisions. Mean executed-scan aim displacement was {fmt(arms['awareness']['conditional']['meanScanAimDisplacementRad']['value'])} radians; the no-scan control's conditional mean and the between-arm difference are null, not zero. Certified movement overrides are exact and immediate; scan-only decisions retain the base movement without a new clearance certificate. Post-scan source visibility is recorded at scan receipt +2 simulation ticks, the first later source-grid sample. These process associations do not isolate scan causality or identify the same spear across resets.",
'', '## Integrity and scope','',
(f"- Independent saved-evidence audit: PASS; {len(r['manipulation']['failures'])} manipulation failures. All 128 raw journals and every recorded decision/arbitration/noise check reconcile; independent bootstrap reproduces the primary, both arms and all 41 secondary metrics" if review else f"- Runner validity status: {r['status']}; {len(r['manipulation']['failures'])} recorded manipulation failures"),
f"- Freeze identity: `{r['freezeSha256']}`",
f"- Pre-match Git checkpoint: `{r['gitCheckpoint']}`",
'- Original 64 raw files, prior provenance files and protected/frozen source identities were verified before and after execution',
'- Raw preserves permitted source packets, delayed decisions, actual commands, assessment diagnostics, evaluator-only state, world events and exact HIT lineage; each completed gzip has compressed/uncompressed hashes and a durable checkpoint',
'- The earlier 64-bout result remains inconclusive under its own declared margin; this result does not release its conditional branches',
'- This estimates a combined engineered controller intervention, not awareness alone, prevented-hit counts, universal best response or human enjoyment',
'- No further experiment or rule/mind/default change is authorized by this report','',
'## Exact report artifacts','']
if review:
 lines+=['- Completed independent review: [verification](../awareness-comparison-result-review-v1/VERIFICATION.json)', '- The original sealed REPORT.json retains its historical pending-review status; this external report records the completed independent audit',f"- Independent verification SHA256: `{hashlib.sha256(a.review.read_bytes()).hexdigest()}`",'']
for name in ['REPORT.json','RAW-MANIFEST.json','RUN-IDENTITY.json']:
 data=(a.primary_directory/name).read_bytes();lines.append(f"- {name}: SHA256 `{hashlib.sha256(data).hexdigest()}`")
with a.new_report.open('x') as f:f.write('\n'.join(lines)+'\n')
print(json.dumps({'report':str(a.new_report),'classification':r['classificationProvisionalUntilReview'],'primary':primary['estimate'],'ci95':primary['ci95']},indent=2))
