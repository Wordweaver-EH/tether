# Occluded-search v1: result and availability status

Updated 2026-10-07. Raw publication is complete: [verified data and reassembly instructions](https://github.com/Wordweaver-EH/tether/blob/b1314d0d9acdb08c3780841931c182f330524966/occluded-search-v1/README.md). All 27 remote parts were downloaded and reconstructed, matching the original raw, gzip and base64 hashes. This resolves this study's raw availability gap; it does not recover older studies' missing evidence.

Reconstruction history, recorded 2026-10-06: **One authorized forensic reproduction reconstructed the
raw JSONL byte-for-byte**, matching its retained original SHA-256 and byte count.
The original disk copies and post-run audit package remain unavailable. This is
newly written from retained run/audit messages and the newly completed exact-source
reproduction; it is not recovery of those original files or a new independent
study. No source, scene, criterion or seed was changed; no retry occurred.

## Retained reported result

The 2026-10-05 run reported 288 episodes: 160 scored episodes, 64 never-observed
controls and 64 always-visible controls, covering 32 scenes / 16 mirrored
clusters. The subsequent independent saved-data audit reported **20 passing
checks, zero failures**, examining all 288 episodes / 22,752 decision frames.
That audit was completed before the files became unavailable; the full
independent audit has not been repeated now. The one forensic run completed on
2026-10-06 at 04:55:11 UTC and regenerated the same raw bytes and reported results.

| Scored arm | Sustained reacquisition | Mean deadline-capped latency |
|---|---:|---:|
| Full existing mind | 32/32 | 0.3041666666666667 s |
| Full, broad history-path cut | 15/32 | 1.453125 s |
| Conventional constant-velocity tracker | 32/32 | 0.3145833333333334 s |
| Isolated particle-belief profile | 18/32 | 1.071875 s |
| Isolated profile, hidden-belief cut | 15/32 | 1.3489583333333335 s |

Success required three consecutive genuine received sightings within two seconds
of the delayed loss cue. Latency is measured from that cue to the third sighting;
failures receive the two-second cap. These are not means among successes only.

- Primary full-versus-cut advantage: **53.125 percentage points** and
  **1.1489583333333333 s**, 95% stratified mirror-cluster bootstrap interval
  **[1.128125, 1.165625] s**; 17 full-only successes, zero cut-only successes
- Never-observed full and cut: both **16/32**, both **1.1541666666666666 s**;
  measured endpoints matched in every pair, but gaze, movement and trajectories
  were not generally identical
- Intact observed-history benefit over intact never-observed: **50 points** and
  **0.8500000000000001 s**, interval **[0.8416666666666668, 0.8583333333333334] s**
- History interaction (difference-in-differences): **53.125 points** and
  **1.1489583333333333 s**, interval **[1.128125, 1.165625] s**
- Always-visible full/cut parity: reported exact across all 32 pairs
- All preregistered primary, history-attribution and negative-control gates:
  reported passed. The separate superiority gate over the conventional tracker:
  **failed**; it also achieved 32/32

The retained finding is useful prior-observation-dependent search in this
specific task. It does not demonstrate superiority to ordinary tracking,
consciousness, general intelligence, or general gameplay improvement. The
new reconstruction matches the original raw hash exactly, making those contents
available again. Raw Git publication is now verified at the data commit linked above; the
original post-run audit files have not been restored.

## Interpretation limits retained from the protocol and audit

- Deliberately narrow, shallow-corner scenes; the opponent stopped after hiding;
  weapons were suppressed. No tournament, adversarial-motion or human-play claim
- The full cut changed several history pathways, uncertainty/confidence, facing
  and drift inference, delivery, monitoring and random-number consumption. It
  was not a surgical episodic-memory lesion or total amnesia
- Common 150ms percept delay, 30Hz decisions, paired aim noise and a 192-unit
  logical cap did not mean equal actual computation. The conventional tracker
  used 16 declared units per decision, versus roughly 171 for the full mind
- Ordinary within-episode learning remained active. Its ledger could record
  intended throws even though executed weapon output was masked. The isolated
  profile froze learning, which also prevented new episodic writes
- Actual warm-up substituted fixed setup gaze **before** motor transformation;
  samples advanced but the prior motor angle followed fixed gaze. The protocol's
  phrase about running the complete interface normally was imprecise
- Explicit secondary failure-reason labels were not stored. The primary failure
  definition remained unambiguous; later descriptive classifications were post hoc
- Raw frames contained selected percept/command fields, not all complete
  percepts or executed-weapon flags. No-oracle/masking checks also relied on
  frozen-source inspection and pre-score tests
- The terminal decision at tick 330 was logged without a following physical
  step. Intervals describe this generated scene distribution, not broad transfer

## Original identifiers retained for verification

The raw JSONL identifier below now also verifies the newly computed reconstruction.
Other original identifiers are retained for comparison; the original disk copies
and audit archive were not recovered.

| Item | Original identifier |
|---|---|
| Source commit | `b1516040b116eb771ba75c53a9586c4ad60ef510` |
| Source tree | `9064bb68377076557ff9fb3d708aa4449a4b95ef` |
| Freeze SHA-256 | `74ee8d6f4c25f34b50642d4e217bc3dd04b933ca7895bd91330948d1e48f474f` |
| Runner SHA-256 | `f804bf7ffbe39df4cfac3586d2cfb70d863c87fac61a48a5e93be020ed738329` |
| Scene digest | `ca1851915c13cd65641cb7a8d617533591280df132738e4999260083adcae4d2` |
| Raw JSONL, 9,342,976 bytes | `23780c413849d9810245b9fbe3782852b5033ca30b371ff4f3df8f61ee89fa36` |
| Gzip, 2,611,389 bytes | `cb1c933f4cd11b76b1d40bfa7fb112f5336967f06d8a7d15e137a9ae0bf39192` |
| Base64-file SHA-256 | `b6f75806f274b5eca43f2bc68ae3feb1f0715307b36b9331b2368d1b211dd5b2` |
| Independent-audit hash-manifest SHA-256 | `b1dea235a91a1dc0839b40e4f279e298c3c1be9fa0ccf3f5c635dc1057c5148e` |

## Source inspection and completed forensic reproduction

The [published runner](https://github.com/Wordweaver-EH/tether/blob/b1516040b116eb771ba75c53a9586c4ad60ef510/benchmark/occluded-search-v1/run.mjs),
freeze, scene generator, embodiment, mind math and simulation were freshly read
at the pinned commit; these six files match their recorded SHA-256s.

**There is no wall-clock timestamp in the raw header.** It contains runtime
version, supplied source commit, freeze hash, fields, scene digest, thresholds
and scenes. The separate release receipt's timestamp does not affect raw SHA.
Scene seeds, controller seeds, bootstrap seed and episode order are fixed.

After that read-only assessment, all **38 frozen inputs** and freeze.json were
restored and SHA-256 verified. One explicitly authorized forensic run used the
unchanged source-commit argument and Node **v24.19.0 on Linux/x64**. It completed
288 episodes once and produced **9,342,976 raw bytes** with the exact retained
SHA-256 `23780c413849d9810245b9fbe3782852b5033ca30b371ff4f3df8f61ee89fa36`.
This is verified byte-identical computational reconstruction, not an original
disk copy or another independent scientific confirmation. Compression files
are regenerated transport artifacts and must have their own hashes checked.

The [new reproduction receipt](reconstruction-2026-10-06/reproduction-receipt.json),
[source verification](reconstruction-2026-10-06/source-verification.json) and
[regenerated summary](reconstruction-2026-10-06/summary.json) preserve that provenance.
Only this one forensic attempt was performed. No additional scored execution is
planned, and no reconstructed artifact is presented as the original disk copy.
