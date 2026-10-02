# Phase 5: verified final findings

Completed 39,168 full 300-second bouts in 7.956 hours, using six workers. The design included the full mind plus 16 ablations; budgets 48, 192 and 512; both modes and seats; six fixed opponent families; 32 seeds. Each variant has 2,304 bouts. Each budget-specific paired row has 768 bouts, clustered into 32 independent seed means for descriptive bootstrap intervals.

The frozen source fingerprint is `19800346ef69e63f1917ee67d02f4f083285101cb4342ed39d323d195b0bc9e5`. All 131 frozen-source tests passed again after the experiment. Independent validation confirms complete unique jobs, balanced pairs, 300-second duration, matching budget limits, per-cycle and cumulative budget bounds, recomputed scores/wins and paired effect means. See `phase5-validation.json`.

## Findings

All effects below are ablated minus full. Win effects use half credit for ties. Intervals are seed-cluster bootstrap 95% intervals, unadjusted for multiple comparisons.

- Adaptive gaze versus forced open-loop rotation: the switch named `noAttentionSchema` reduced win score by 33.0–36.0 percentage points across budgets. At budget 192, effect −36.0 pp [−39.3, −33.1]. It increased look-away time by about 61 percentage points. This establishes a substantial advantage for the implemented adaptive gaze controller over that comparator; it is not selective validation of Attention Schema Theory.
- Prediction: removal reduced win score by 9.4–14.1 pp across budgets. At budget 192, −14.1 pp [−17.7, −10.8].
- Opponent-cone model / `noToM`: removal improved win score by 7.9–8.8 pp. At budget 192, +8.1 pp [+6.6, +9.7]. This particular opponent-attention heuristic was harmful against these opponents, even though it changed behavior. This is not a finding about theory of mind generally.
- Affect: all 2,304 paired bouts were identical on every recorded metric. Independent source review found the implemented affect intervention structurally unable to affect behavior in this revision. This is an observed null and failed mechanism test, not evidence that affect is generally useless. It must not count as a demonstrated load-bearing mechanism. Any repair belongs to a new source revision and a separately labeled follow-up study; these original results remain unchanged.
- Automatization: all 2,304 paired win outcomes were identical. Score changed in 41 bouts, with only small aggregate effects. This fresh-memory audit cannot establish the four-stage learning claim; use the separate repeated-bout learning evidence.
- Metacognition, deliberation and counterfactual removal had win intervals including zero at every budget, although some score and behavior effects were nonzero. A behavior change is not interchangeable with a winning advantage.

## D14 budget-scarcity claim

The switch named `noWorkspace` bypassed channel arbitration while retaining focus, hysteresis and serial planning. It changed behavior strongly and reduced mean score margin by approximately 13 points at every budget. It is not a clean removal of the entire workspace or serial bottleneck. Its paired win effects were:

| Budget | Win effect (percentage points) | 95% interval |
|---|---:|---:|
| 48 | −1.69 | [−4.43, +1.11] |
| 192 | −3.84 | [−7.29, −0.78] |
| 512 | −1.37 | [−3.71, +1.11] |

This restricted comparator does **not** establish D14 or demonstrate the expected scarce-compute advantage followed by convergence at abundant compute. It also cannot falsify the broad workspace hypothesis, because substantial workspace machinery remains active in the comparator. Score effects stayed substantial across the sweep; win evidence was clearest at the middle budget, not the smallest. The full mind spent a mean 39.75, 148.15 and 154.60 charged work units per cycle respectively. These are equal limits on deterministic algorithmic work counts, not equal realized spending or measured hardware instructions.

## Scope and limitations

This is task-specific, exploratory functional evidence for the implemented software comparators, not selective validation of consciousness theories or evidence of subjective experience. Ablation names are implementation labels and do not guarantee selective mechanism interventions. Multiple comparisons were not adjusted. General-audit bouts start with fresh memory; D16 competence and D17 adaptation require the separate learning protocols. No human-derived proxies were available. Human engagement, speech-induced deception and browser rendering/play were not established by this audit. Large confidence intervals or null-compatible effects are not proof of equivalence.

## Artifacts

- `phase5-final.html`: standalone static report
- `phase5-final.md`: full effect tables and methods
- `phase5-summary.json`: compact report without raw bouts
- `phase5-final.json.gz`: complete report plus every raw bout (about 16 MB)
- `phase5-final.rows.jsonl.gz`: redundant resumable raw checkpoint (about 13 MB)
- `phase5-checksums.txt`: artifact SHA-256 checksums
- `phase5-post-run-tests.txt`: 131/131 passing tests
- `validate-phase5.py`: independent validation script

Full raw JSON compressed SHA-256: `2eec0d8f78941cfba02ee0ff9301e1380b7959c2ec9d6fffbbc959a1ab3a189c`.
