# Codegame arena contract

`core.mjs` and `tournament.mjs` contain no Tether rules. A game module supplies:

```js
{ CONSTANTS, createWorld({ seed }), step(world, [input1, input2]),
  percept(world, playerId, mode), hashWorld(world) }
```

`snapshotWorld(world)` and `restoreWorld(snapshot)` are optional. When provided, a replay log begins from an independent snapshot. Otherwise replay recreates the world with the logged seed. Agents receive only `act(percept, dt)`. An optional `trace()` adds agent records to a logged bout without affecting the game hash.

An adapter provides the game-specific shell:

```js
{
  game, playerIds, modes, variants, makeAgent(variant, seed, policy),
  simHz(constants), boutSeconds(constants), score(world), elapsed(world), ended(world),
  // Optional:
  defaultPolicy, variantsForPolicy(policy), isKeyPair(a, b),
  startMetrics(context), observeStep(state, context), finishMetrics(state, world),
  summarizeBehavior(results, variants), compactResult(bout), behaviorMarkdown(summary)
}
```

`runGameBout` receives the game module and adapter directly. `runTournament` loads an adapter path, schedules unordered pairs in every adapter mode, alternates seats, and runs up to eight worker threads. It owns only scores, win-rate intervals, margins, and the generic replay/trace record. The adapter owns behavior metrics, scripted agent families, key matchups, and extra report tables. `tether-adapter.mjs` is the Tether implementation.

`compare.mjs` pairs two tournament JSON files by seed, seat, pair, and mode and reports win-rate changes for one variant with descriptive 95% intervals. Example: `node arena/compare.mjs reports/phase2-before.json reports/phase2-after.json mind-normal`.

The generic replay verifies 20 Hz world hashes. Agents never receive the world object. Metric hooks are trusted post-step consumers and should be read-only. For another game, create a new adapter and pass its path with `--adapter`.
