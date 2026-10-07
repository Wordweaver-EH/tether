# Independent implementation review

Reviewed 2026-10-07. **Approved as an optional, bounded engineering prototype.**
No remaining source blocker was found within the declared scope. This is not an
approval of competitive strength, human playability, or learned intelligence.

## Mechanism and corrected issues

The public-ring proposal participates in the existing workspace before action
selection. It is not a baseline controller overlaid after selection. The new
factory uses the unchanged complete-percept 150 ms delay, 30 Hz decisions and
seeded motor-noise wrapper. Default Duel and Existing Cover remain separate.

Review identified and checked corrections for:

- Ring scores being eligible for false tactical success credit: tactical
  score-credit learning is explicitly disabled in this option
- Route-cache savings charging work that was not actually repeated: comparison
  and lookup charges now occur only on genuine route selection
- Workspace hysteresis retaining an urgent objective despite a dangerous spear
  line: unsafe competing proposals are withdrawn before workspace selection
- A completed delayed-recall branch issuing an immediate recall: this option
  now models only executable immediate recovery and labels delayed recall unsupported
- Readout reasons not matching the selected threat/search intent

The priorities and successful-route cache are engineered mechanisms, not evidence
of a newly learned tactical strategy.

## Independently performed checks

- 23 focused runtime, client/replay and Existing Cover tests passed
- Eight original-source parity cases compared 4,800 ticks across both seats,
  both perception modes, and default Duel/Existing Cover; inputs, traces, memory,
  settings and cognition matched exactly
- All seven recorded source identities matched the pre-run snapshot and reviewed
  bytes; the fixed-run source remained unchanged after outcomes
- All 40 bout score totals reconciled with ring/hit events, planning attempts
  reconciled with completed/unfinished counts, and tactical learning updates and
  learned automatic decisions were zero
- Cache-off and report-off preserved input-stream and final-world hashes in all
  eight pairs each

The broader 321/321 application-suite result and 447/454 recursive result are
implementation-run checks recorded separately in `receipt.json`; they were not
independently rerun for this review.

## Interpretation and limits

The protocol was fixed locally, not Git-preregistered. Full integrated lost all
eight baseline bouts, 18–55. Removing objective proposals allowed 60 baseline
ring points, supporting a causal objective-control role. Removing the bundled
threat processing improved scoring to 35–43; this does not isolate reflex from
workspace avoidance or establish a single cause.

Planning occupied 194/7,168 decisions (2.7%), with 59 explicitly unfinished.
Cache removal added 511 declared units from 73 genuine lookups; this is not a
CPU-time or strength benefit. Search and Hunt were selected only eight and 12
times respectively, so rich multi-goal flexibility is not demonstrated.

The public report accurately retains these negative results and qualifications.
Live-browser behavior, readable human counterplay, engagement and subjective
experience remain unverified. No outcome-driven policy retuning was reviewed.
