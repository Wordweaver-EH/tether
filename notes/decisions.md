# Tether decisions (one entry per decision; newest at the bottom; the log has the narrative)

| # | Date | Decision | Why | Revisit if |
|---|---|---|---|---|
| D1 | 2026-09-26 | Human vs NPC; the two-human A/B is replaced | Owner: only one human | a second regular player appears |
| D2 | 2026-09-26 | Webpage (plain JS), no engine | Owner: webpage is fine; Node tournaments need a fast headless sim | Version C (first person) is justified by results |
| D3 | 2026-09-26 | No LLM in the NPC | 30 Hz deterministic decisions; ablations need seedable runs; inner speech = workspace readout | a language layer can be shown load-bearing by ablation |
| D4 | 2026-09-26 | Indicators count only with a behavior-changing ablation | owner's no-tick-box rule; claim is functional only | - |
| D5 | 2026-09-26 | Symmetric perception: both players under the Mode-B cone; NPC sees only `percept()` | fairness; the mind cannot cheat; its attention is what the player exploits | playtests show B feels arbitrary (then Mode A for the human) |
| D6 | 2026-09-26 | Human-like embodiment: ~150 ms percept latency, aim noise, same turn rate; difficulty scales these, never information | believable, beatable, fair | - |
| D7 | 2026-09-26 | Game rules stay as SPEC.md; only the NPC and presentation are new | keeps the owner's core hypothesis testable | tournaments show a degenerate dominant strategy |
| D8 | 2026-09-26 | Working name "Tether" | the spear is tethered to its owner by the fixed recall line | owner prefers another |
| D9 | 2026-09-26 | Model routing: p1 sim on Sol max; p2 mind on Astra max (first Astra trial); Claude reviews and owns design/taste | AA II calibration (Sol 48, Astra 53); Zvi review: Astra for ambitious long coding | ledger outcomes |
| D10 | 2026-09-26 | This session is the pilot for a reusable codegame harness (codefilm for games); lessons go in notes/codegame.md; arena/replay are built game-agnostic | owner: this session is for the skills, taste and plumbing | - |
| D11 | 2026-09-26 | Prior-art repos cloned read-only to C:rcx	hird_party\codegame (godot-mcp, godot-agent-loop, gua, awesome-gamedev-agent-skills, vitric, godogen); fork or vendor only after r1 + Tether phases show what we need | owner: install/fork freely; avoid adopting before evidence | - |
