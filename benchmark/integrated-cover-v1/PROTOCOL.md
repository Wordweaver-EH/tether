# Integrated Cover milestone: fixed development acceptance

Declared before implementation or bout outcomes on 2026-10-07. This is a bounded engineering milestone, not a held-out performance study. Do not change parameters to optimize bout results.

- Add a separately selectable, optional integrated Cover controller. Default Duel, Cover baseline, and existing Cover mind behavior must be preserved.
- Ring approach/hold/contest, threat, and search proposals must enter the existing workspace before selection. No final baseline-action overlay.
- Use the same public percept, 150 ms complete-percept latency, 30 Hz decisions, and seeded motor noise wrapper as other Cover controllers.
- Reconsider actionable tactical conflicts or changed evidence, with a 0.5 s minimum replan interval. Unfinished planning must identify its status and execute a labeled fallback without teacher credit. Low confidence alone must not cause continuous replanning.
- Tactical score-credit learning is disabled in this option because ring scores cannot safely train shot/recall credit. The session-only engineered route cache records successful traversals; it is not a learned tactical policy or four-stage competence result.

## Targeted fixtures

1. From both default spawns, capture an unattended ring within 10 seconds.
2. An immediate observed incoming spear interrupts ring pursuit; after danger passes ring pursuit resumes. Cutting threat processing must change the relevant action.
3. A public opponent-held ring with no visible opponent promotes contest, without inventing the opponent's location or endlessly searching elsewhere.
4. After a successful traversal and ordinary hit reset, route-cache reuse saves declared work while preserving route completion. A threat interrupts reuse. Cache-off is a compute/control comparison, not a claim that cache removal must weaken play.
5. At the minimum 16-unit budget, unfinished route/tactical planning stays labeled and safe fallback continues movement or recall. In an unattended 10-second bout, deliberation occupies less than 10% of decision cycles.
6. Hidden-world substitution with equal percepts gives equal commands. Report-off changes no commands. Removing objective proposals changes focus and issued movement on an otherwise identical decision.
7. Default Duel and existing Cover mind inputs/traces/memory remain exact against their unchanged reference; repeated seed replay stays deterministic.

## Short closed-loop characterization

Freeze seeds 101, 307, 509, 911, both seats, 30 seconds per bout, Mode B. Compare full integrated, objective-off, threat-off, route-cache-off, and report-off against the unchanged Cover baseline, using common embodiment seeds. Report points by source, throws/recalls, focus time, actual route-cache use, unresolved fallback, planning attempts/completions, and compute. No headline superiority claim; trajectories may diverge after interventions. Equal percept streams are checked separately in fixtures. Keep only compact per-bout summaries and brief decision excerpts, not large raw traces.

Stop after implementation, tests, and this fixed characterization. Fix genuine implementation failures, document any fix, rerun affected checks, and do not alter the bout matrix or retune for positive results. Human engagement/readability still require actual play. No subjective consciousness claim.
