Committed as `d98049f`. **`node --test`: 69 passed, 0 failed.**

| Finding | Status and verification |
| --- | --- |
| H1 (D13) | **Fixed.** MODE_B hides either player’s off-cone non-HELD spear; perception tests cover both owners. |
| H2 | **Partially fixed.** Headless and arena agents receive cloned percepts, and returned inputs are cloned. An arena test confirms an agent cannot mutate a world object through its percept. Agents still share JavaScript intrinsics with the simulation in each thread; this limit is documented in the README. |
| H3 | **Fixed.** Shallow slides stay outside geometry, and spears spawned on or inside it contact at `t=0`. Sustained-slide, spawn-contact, and corner tests pass. |
| M4 | **Fixed.** The FOV comparison has no fixed world-unit allowance; boundary and just-outside rays at several distances pass. |
| M5 | **Fixed.** Replay compares logged sample fields and events with regenerated records. Field, event, and hash tampering tests pass. |
| L6 | **Fixed.** The hash uses an explicit scalar field order; equivalent objects with different key insertion orders hash identically. |

The remaining test gaps—grazing-segment tunnelling, corner contact, sustained slide then throw, and neutralization followed by a hit and reset—are covered. The mind now keeps a private estimate of its own hidden spear from sightings and actions; that estimate can be wrong until the spear reappears.