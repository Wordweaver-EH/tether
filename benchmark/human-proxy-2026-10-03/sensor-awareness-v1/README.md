# Separate sensor-awareness synthetic prototype

Start with `PUBLIC-REPORT.md`; the immutable scope/checks are in
`PREDECLARATION.md`. This is not a playable controller or a match runner.

- `awareness.mjs`: standalone assessment module and synthetic delay queue
- `fixtures.mjs`, `awareness.test.mjs`: the 22 predeclared deterministic groups
- `results/run-003/RESULTS.json`: final fixture-realism version's results
- `results/run-001/`: retained failed first execution; run-002 is its repaired run
- `revisions/`, `DEVELOPMENT-LOG.md`: preserved implementation/fixture history
- `ORIGINAL-INPUT-MANIFEST.json`: original input integrity snapshot, 516 files
- `PACKAGE-MANIFEST.json`: publication inventory, hashes and final identities

From the enclosing original study directory:

    SENSOR_RESULTS=sensor-awareness-v1/results/my-fresh-reproduction node --test sensor-awareness-v1/awareness.test.mjs

Or omit `SENSOR_RESULTS` for a no-output-file run. Existing result directories are
never overwritten. Tests require no dependencies beyond Node.js 24 and use CPU
only. F22 reads existing original study files to compare their hashes; it does
not parse/replay saved gameplay. The pure prototype has no filesystem imports.

Call `createAwareness().observe(delayedModeBPacket, receiptTime)` with source ticks
on the four-tick decision grid and receipt time exactly 0.25 s later. An optional
`commitMovement({x,y})` supplies the agent's own actually issued movement for tie
continuation. A return value is an assessment, not an action. Preserve its explicit
uncertainty labels; never label the warning an actual unseen recall.

`createDelayedAwarenessInterface().push(sourcePacket)` is only a synthetic source
queue for consecutive 120-Hz packets from time zero. It issues no commands and
does not replace the frozen game's existing interface.

No rule/default/mind changes, saved-outcome fitting, new bouts, Git writes or
publication are part of this package. Any fresh-seed comparison needs separate
preregistration, integration, independent review and release.
