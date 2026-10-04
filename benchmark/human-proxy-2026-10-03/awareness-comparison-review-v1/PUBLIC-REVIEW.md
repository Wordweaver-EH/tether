# Independent prerelease review: frozen rear-awareness comparison v1

Reviewed 2026-10-04 UTC. **PASS for execution of the specified preregistered
comparison, subject to the root's verified Git checkpoint and exact-source
release. No remaining prerelease blocker. Gameplay benefit is untested.**

## Scope and evidence

The reviewer inspected the earlier frozen human-proxy protocol/result, reviewed
sensor-awareness prototype/declaration, comparison protocol and recovery policy,
complete integration/runner/statistical code, fixtures, tests and development
record. No main comparison bout or Git write was performed by this reviewer.
No smoke scores, HIT counts or comparative outcomes were inspected.

Independent reruns passed **28 comparison tests, 50 existing base/interface tests,
and all 22 prototype groups: 100 passed, zero failures**. These include synthetic
packets, scripted engine fixtures and filesystem recovery checks, not full
counter-versus-ordinary matches. A reviewer-authored set of 128 synthetic summary
rows was also checked with a separate Python bootstrap implementation. It exactly
reproduced the 32-cluster mean and 20,000-resample percentile endpoints, including
the practical-threshold qualifier. The final statistics source was rechecked
against that evidence. All four completed structural-smoke compressed and
uncompressed hashes were independently verified without outcome inspection.

## Perception, arbitration and embodiment

- The awareness module remains byte-identical to the reviewed prototype. Only
  its permitted delayed MODE_B fields cross its narrow input boundary. The
  combined counter can use the original base policy's ordinary percept fields;
  current world, events, enemy commands and hidden recall endpoints remain in
  evaluator code. Score resets are learned through delayed packets
- Both arms call and commit to the same unchanged base counter. The unchanged
  arm's shadow assessment has no command effect. On an awareness warning,
  arbitration substitutes scan aim, withholds that decision's proposed throw,
  preserves recall and uses the exact certified lateral direction when available.
  Scan-only retains the uncertified base movement. Both memories receive the
  final issued command rather than a suppressed proposal
- The frozen interface applies one motor transform after arbitration. It changes
  aim only, so the certified movement direction is not quantized or rotated.
  Commands are recomputed at each 30-Hz decision. The certificate remains limited
  to static geometry over that immediate decision interval; it establishes
  neither successful evasion nor actual scan/reacquisition
- Counter latency is 250 ms, ordinary latency 150 ms. This asymmetry remains
  explicit and identical between comparison arms. Across arms a cluster shares
  episode/role seeds and physical-seat/decision noise samples; scan-induced aim
  changes can alter noise sigma, so realized errors need not match

The effect, if any, belongs to the **whole awareness, scan, conditional movement
and scan-withheld-throw package**. It cannot be attributed to awareness alone or
described as a count of prevented hits. Warnings remain uncertainty statements,
not detections of actual unseen recalls.

## Design, measurement and inference

The fixed manifest contains 32 fresh clusters, two counter seats and two arms:
128 five-minute bouts. Each cluster preserves paired seeds across both arms and
seats; cluster parity alternates arm order. Freshness against original and smoke
seeds is verified. No tuning, replacement seeds or outcome-dependent stopping is
permitted.

The primary is awareness-minus-unchanged net physical HITs/min, averaged across
the two seats within each cluster, then across 32 clusters. The deterministic
20,000-resample bootstrap resamples full paired clusters jointly. It does not
resample individual HITs or treat 128 bouts as independent. The strict zero
classification boundaries and the additional lower-bound >=0.5 practical
qualifier match the declaration. Arm-specific earlier margin classifications
remain descriptive and authorize no follow-on branch.

Returning-hit reduction, delivered-hit/throw costs, withheld proposals, scan and
visibility diagnostics have explicit denominators and direction conventions.
Empty conditional denominators are null. Reacquisition and warning-conditioned
true phase are process associations. The next strictly later source-grid sample
is receipt tick +2, correctly distinguished from the four-tick receipt cadence.
The README clarifies that warningExpired counts all evidence expirations and
warningScoreResets counts all received score changes, not solely endings of an
active warning episode.

## Durability and pre-execution repairs

The author retained a first structural-smoke failure caused by audit-only exact
floating-point source-time equality (maximum difference 4.44e-16 seconds). The
check now uses its existing 1e-10 timing tolerance; no policy or parameter changed.
The four-row structural rerun passes. Its projected compressed storage is
911,475,200 bytes, or 2,734,425,600 with the declared 3x safety factor; about
7.9 GB was free at review. The runner checks projected storage plus a 512-MiB
reserve at startup and the reserve before each new bout.

Review identified and resolved recovery edges before main execution: attempt
numbers now account for started-only and pending artifacts; JSON/checkpoints use
fsynced temporary files with atomic no-overwrite links; finalization validates
existing deterministic artifacts and fills missing outputs without replay;
startup-only interruption can recover only with explicit root approval and no
prior gameplay artifacts. Existing run identity and manifest must match. Every
completed resumed row requires compressed/uncompressed hashes, a completed raw
end record and matching summary hash. Partial attempts remain preserved. Recovery
is explicitly authorized, never automatic or outcome-dependent.

## Integrity and exact accepted identities

The current source equals the saved freeze: **30 package files and 52 dependency
files**. All **64 original raw files**, **91 prior package/result files**, original
frozen entries and protected-source checks pass. The prototype suite additionally
passes its original 516-file integrity group. No original controller, rules,
defaults, mind or original result was changed.

- Freeze identity: `356e9f22241dcd44429041eccc6680c7c0d31d3483ea6051eb7c3980f9f43343`
- FREEZE.json SHA256: `a1e2c41539d9f27374bdc353cbcffba031c7b5c8cb6b9e8ee3adb885345fbc89`
- PREDECLARATION.md: `c03221bc1cd607bb63ebcf628f66d4554ea73aa32a0d037424b6024c7ae13cfd`
- RECOVERY-POLICY.md: `0db339ff751bcc07f3b281aac6b466cc3e2ca0c09b255197bb2d9a84692808ad`
- controller.mjs: `95e1ddbd56a32847301f91048a46fdc7df5f03b92ee6c5b2385664e3248717e1`
- frozen-awareness.mjs: `bb78bce500b06697b3ab6c9320c55ce52691b43f4714dce224fad9cc3f409250`
- protocol.mjs: `9f10f6b60f246ede6417d211d76aa5d3a5b9cdfccd0f1cc1f383a62c4ee2b9bd`
- run.mjs: `7c00854cb97defbe36d81524ed89a67d6e0b563748b0ba327bbac1100566b23b`
- statistics.mjs: `1388b47ad8c942011ccda66c434ed1aa660e7b82b035472b9bdec97e657cd969`
- RUN-MANIFEST.json: `59fe962e36706a4f897535ffd69d4ea41c1ea7bdd1d6587e2c769c826a16515a`

`VERIFICATION.json` and the sibling test/check artifacts provide the review
receipt. This review does not itself supply the Git checkpoint or root release.
Independent saved-result review remains required before an efficacy claim.
