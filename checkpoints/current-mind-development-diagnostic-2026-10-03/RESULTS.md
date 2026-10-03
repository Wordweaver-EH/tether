# Current-mind development diagnostic: novelty recruits deliberation

**New diagnostic, not a rerun of the historical 40 shortcut uses or 12 misses.** The exact historical H inputs, trained snapshot and runner were not recovered. These sixteen cases use existing N/S development fixtures, an ordinary N-trained snapshot and unchanged current C1/C2 code.

All 6 novel, automatically eligible cases requested and forced the novelty handoff and executed real Type 2 rollouts. The two familiar near-clear cases used tier 1 with zero branches and hit. Four other familiar eligible cases still deliberated. This shows selective recruitment on these reused geometries; it does not establish rescue of the original misses, useful adaptation or a familiar-case speed advantage.

## Complete denominators

| Support | Automatic eligible | Cases | Real deliberation | Novelty forced | Tier 1/zero-branch | Attempts | Hits | Non-emissions |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| familiar | True | 6 | 4 | 0 | 2 | 6 | 3 | 0 |
| familiar | False | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| novel | True | 6 | 6 | 6 | 0 | 0 | 0 | 6 |
| novel | False | 4 | 4 | 0 | 0 | 2 | 2 | 2 |
| non-applicable | True | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| non-applicable | False | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Total: 16/16 completed; 14 real deliberations; 8 physical attempts, 5 hits and 3 terminal misses; 8 non-emissions. Zero emitted-but-not-executed commands, censored flights or background hits. Zero proposed attack commands were actually withheld. Novel eligible cases proposed no attack after deliberation; their non-emission is not an already-proposed attack being suppressed.

## Every assigned case

| Fixture | Seed | Support/count | Eligible | Tier | Branches | Novelty forced | Output | Physical outcome | First decision ms |
|---|---:|---|---|---:|---:|---|---|---|---:|
| near-clear-0 | 9220001 | familiar/4 | True | 1 | 0 | False | throw | hit | 5.644908 |
| near-clear-0 | 9220002 | familiar/4 | True | 1 | 0 | False | throw | hit | 1.176591 |
| near-clear-1 | 9220001 | novel/0 | True | 2 | 4 | True | none | non-emission | 2.159852 |
| near-clear-1 | 9220002 | novel/0 | True | 2 | 4 | True | none | non-emission | 0.903930 |
| far-clear-0 | 9220001 | familiar/9 | True | 2 | 4 | False | throw | hit | 0.856499 |
| far-clear-0 | 9220002 | familiar/9 | True | 2 | 4 | False | throw | terminal-miss | 0.801036 |
| far-clear-1 | 9220001 | novel/0 | True | 2 | 4 | True | none | non-emission | 0.723970 |
| far-clear-1 | 9220002 | novel/0 | True | 2 | 4 | True | none | non-emission | 1.294098 |
| obstructed-0 | 9220001 | familiar/9 | True | 2 | 4 | False | throw | terminal-miss | 0.950771 |
| obstructed-0 | 9220002 | familiar/9 | True | 2 | 4 | False | throw | terminal-miss | 0.692202 |
| obstructed-1 | 9220001 | novel/0 | True | 2 | 4 | True | none | non-emission | 0.503889 |
| obstructed-1 | 9220002 | novel/0 | True | 2 | 4 | True | none | non-emission | 0.610109 |
| outbound-retrievable-0 | 9220001 | novel/0 | False | 2 | 4 | False | none | non-emission | 0.684921 |
| outbound-retrievable-0 | 9220002 | novel/0 | False | 2 | 4 | False | none | non-emission | 0.599653 |
| outbound-retrievable-1 | 9220001 | novel/0 | False | 2 | 2 | False | recall | hit | 0.669217 |
| outbound-retrievable-1 | 9220002 | novel/0 | False | 2 | 2 | False | recall | hit | 0.466833 |

## Timing and interpretation limits

Overall descriptive median first-decision duration: 0.762503 ms; linearly interpolated p95: 3.031116 ms. All individual samples are above. No warmup and fixed case order were used, so early samples include code warmup effects; this tiny single-arm panel cannot establish route speed or a speed-saving comparison. Fresh controller state is not cold-code isolation for every case.

The exact eight pre-existing geometries are intentionally reused from N/S training/development. Two fixed development seeds are applied to each. No training, detector tuning, source edits, robustness-held-out inputs or baseline data were used. The four-tactic actual mind differs from the lost eleven-offset H assay. Current C1/C2 accepts the older N snapshot; it is not a newly acquired C1/C2 history.

Each fresh controller received 20 legal prefill calls and made its first decision on call 21, using the delayed percept at prefill index 2. Normal 150ms nominal latency, 30Hz cognition, 192-unit reported budget and default game apply. Emitted control was delivered for four ticks with one-shot pulses, followed by 360 neutral physical ticks and no further cognitive decision. Moving targets stop on first delivery. Deferred intentions cannot execute later in this window. Outcomes therefore do not represent interactive play or general transfer.

All raw diagnostic fields, support, rollouts, current/delayed percepts, physical events and raw nanosecond durations are retained. Nonfinite values are tagged explicitly. Source files and Node executable matched the frozen manifest before and after the sole attempt. No failure, retry, dropped case or later tuning occurred.

## Provenance

- Source: published C1/C2 commit 0a810b6c1edd291417a9c9f3d42984264445110e
- Frozen manifest SHA256: 6b0515b94a293ed12bcb81babf2a0fd5956e45c3b6afbb5dc9d85d4eef250ea4
- Prior Git checkpoint: b46606c697459275f5fb652434cbfb93c6eb01b0, checkpoints/current-mind-development-diagnostic-2026-10-03
- Outcome-free preflight: 6/6 checks; initial geometry-field typo corrected before freeze, original failure retained
- Saved-row independent review: PASS; 16 assignments, identical initial accepted memory, one cycle/24 act calls per case, delayed clocks, rollout evidence, physical attribution and 72 nonfinite tags verified without rerunning controllers
