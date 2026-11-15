# Clover Hollow outdoor town contract

This package owns the **outdoor view and pedestrian/NPC simulation only**. It does not own saves, inventory, house interiors, interaction UI, or a game's render loop.

## Entry point

`import { createTown } from './town.js';`

`const town = createTown(scene)` adds the outdoor art and NPCs to the supplied Three.js scene and returns:

| Property/method | Contract |
| --- | --- |
| `player` | Existing Three.js player group; caller controls movement and camera. |
| `actors` | Stable array of NPC view records, with `name`, `lines`, `model`, `x`, `z`, `activity`, `intention`, `visible` and `moving`. |
| `focusables` | All 17 outdoor doors (4 public, 10 existing/resident homes, 3 player plots), each `{id,x,z,r,name,kind,lotIndex,entrance}`. |
| `buildings` | Building info with legacy entrance-centered `z`; `centerZ` is actual center. |
| `walkable(x,z)` | True when a character may occupy the point, including a clearance margin around walls, water and the well. |
| `update(dt,t,daySeconds)` | Advance simulation and refresh NPC meshes and natural day lighting. `dt` and `t` are in seconds. `daySeconds` is the existing 0–1320 clock (or longer continuous total). |
| `useLot(deed)` | Highlight the owned `lot-0..2`; pass `null` to show available-house signs. Does not persist anything or modify `LOTS`. |
| `locations` | Shared named pedestrian destinations (`PLACES`). |
| `getNearestBuilding(x,z,radius=3.5)` | Nearest door focusable within interaction range, or `null`; does not enter it. |
| `getNearestInteractable(x,z,radius=3.5)` | Alias for `getNearestBuilding`. |
| `getPlayerLot(deed?)` | Stable `{id,index,x,z,entrance,name,roof}`, or `null`. Without an argument uses last `useLot` selection. |
| `getNpcState(id)` | Read-only plain snapshot by resident/visitor ID or NPC display name; `null` if missing. |
| `findRoute([x,z],[x,z])` | Array of `{x,z}` sidewalk/porch waypoints, or `null` when blocked. |
| `updateNpcSimulation(dt,daySeconds)` | Advances only the plain-data simulator; use `update` for normal gameplay rendering. Avoid calling both for the same frame. |
| `pedestrianGraph` | Navigation graph for diagnostics/planning; treat as read-only. |
| `obstacles` | Collision rectangles used to build `walkable`; treat as read-only. |

## Design and MVVM separation

- `world/layout.js`: immutable building metadata, neighborhood paths and physical collision. Lot indices and positions derive from `rules.js` without mutation.
- `world/navigation.js`: collision-tested one-unit pedestrian graph and A* route planning. Road crossings form shared vertices; NPCs do not route straight through buildings or the town well.
- `simulation/town-life.js`: plain JavaScript resident personalities and day schedules, visiting characters, movement and action state. **No Three.js, DOM, storage or UI imports.**
- `town.js`: view adapter; builds the Three.js town and reads simulation positions to animate meshes. Entrance interactions are emitted as metadata; the caller chooses how to handle them.
- `art.js`: shared primitive geometries/materials and proportionate, gabled cottage art.

The 22-minute simulated day follows resting → morning walking → work → shopping → socializing → an evening walk → returning home → resting. Different residents have small offsets and familiar outdoor destinations. Five ambient visitors maximum are active during the day. Offscreen/inactive visitor meshes are hidden; the pure simulation can keep running without UI.

## Integration guidance

Pass `state.daySeconds` through the existing update loop. Continue using the existing `focusables` IDs for stores, mayor and `lot-0..2`. Call `useLot(state.deed)` after a deed changes; do not rely on the town to write state. Use `getNearestBuilding` for contextual outdoor entrance prompts, and dispatch the selected `id` into your viewmodel/interior router. There is deliberately no automatic teleport into interiors.

The player and NPCs use the same `walkable` geometry; camera control and collision against `player` remain owned by the game integration layer. NPC states are time-dependent, but do not create quests, mutate inventory, save to localStorage, or open interface panels.

## Checks

Standalone module tests (kept inside our allowed source area):

```sh
node --test src/simulation/living-town.test.js
```

These cover all 17 entrances, safe routes and deterministic navigation, plot identity, residents, six schedule activities, visitor budget, and a sampled full day of collision-free movement.

The repository's `npm test` script currently only selects `test/*.test.js`. Updating that script or relocating the new test would exceed the file ownership for this parallel task. Integrators can include `src/simulation/*.test.js` in the common test command after merging.

## Integration status

This branch provides the outdoor module. The source branch currently has no `index.html` or `src/main.js`, and the separate interior, game-state and UI branches are outside this PR. Browser playability and visual/interactive integration are **not verified** until those branches are merged and exercised together.
