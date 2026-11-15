# Clover Hollow — Dollhouse interiors

This entire feature is isolated under `src/interiors/`. It does **not** change `src/art.js`, `src/rules.js`, the town, the main application, UI, ViewModels, or workflows. It is intentionally safe to merge alongside the independent town and inventory branches.

## Try the room

From the repository root:

```sh
npm run serve
```

Open **http://localhost:8900/src/interiors/demo.html** in a browser with network access. The standalone demo imports Three.js 0.160.1 using an import map and runs without a bundler. It has a sample ViewModel in `demo.js` and does **not** save any state.

The room contains the starter bed, sofa, lamp, and rug from `src/rules.js`, with every other owned item available in the furniture tray.

## What the player can do

- **Decorate:** tap a furniture card, point at a floor spot, tap to place; the preview is transparent, and the footprint is **mint green** when the ViewModel accepts it and **rose red** when rejected.
- **Move:** drag already placed furniture, or tap it and choose **Move**. Tap furniture without dragging to select it.
- **Rotate:** use **Rotate** or **R** for 90-degree clockwise turns.
- **Fine position:** use arrow keys for quarter-unit nudges; placements also snap to 0.25-unit increments.
- **Commit:** **Place**, **Enter**, or tap the floor. **Esc** or **Cancel** abandons the edit.
- **Store:** select an object and choose **Put away**, **Delete**, or **Backspace**. Storing *only removes a placement*; it never reduces the number owned. The item becomes available again in the tray.
- **Walk:** toggle the top-right button to walk mode and tap anywhere on the floor. The chibi avatar navigates around furniture; blocked destinations resolve to the closest reachable cell.

All input uses Pointer Events (mouse, pen and touch); the buttons have accessible labels and the live status area announces changes. Decoration controls also work by keyboard alone.

## MVVM contract

`createDollhouse(scene, options?)` from `./dollhouse.js` creates **only a View**. It has no inventory, save files, ownership state, or localStorage access. All measurements are in Three.js units and use the actual `src/art.js` furniture meshes at their authored scale (no arbitrary scaling). A player from `makePerson('kid')` is approximately 2.2 units tall.

The returned object exposes:

| Method / property | Contract |
| --- | --- |
| `setVisible(boolean)` | Show or hide the whole room, including its lights. Initially hidden. |
| `sync(placements)` | Replace the visible placement snapshot. Items are diffed by stable `id`; unknown furniture types are ignored. Pass a full, authoritative array. |
| `preview(candidate, valid)` | Render a translucent ghost and a green/red footprint. `valid` comes **from the ViewModel**, not from the View. |
| `clearPreview()` | Remove transient ghost visuals without affecting the saved snapshot. |
| `pickFurniture(raycaster)` | Return a shallow copy of the closest picked placement, or `null`. Ignores the ghost. |
| `floorPosition(raycaster)` | Return local `{ x, z }` on the room floor or `null` outside the floor. |
| `root` | Scene group for additional character models. |
| `width`, `depth` | Exposed visual dimensions; defaults to `ROOM.width` and `ROOM.depth`. |
| `dispose()` | Release meshes and preview resources and detach the room from the scene. |

Placement shape (exactly the shared model): `{ id: string, type: string, x: number, z: number, r: 0 | 1 | 2 | 3 }`. `type` must exist in `FURNITURE`. Quarter-turns are in radians only while rendering; the model continues to store integer `r`.

`sync` does not mutate the caller's objects and can be called repeatedly after every state update. Objects that retain their ID and type reuse their existing render models.

**Interior placement coordinates:** floor at `y = 0`; room extends `x = -4.5 … +4.5` and `z = -4 … +4`. Front/open walk-in side is positive Z, behind the player-facing cutaway. The shared rules reserve a center-front doorway zone. Back wall is at `z = -4`, left wall at `x = -4.5`; there is no roof, front wall, or right wall. Suggested camera is orthographic, elevated, at positive X and positive Z, looking toward `(0, 1.5, 0)`.

## Integration: recommended host ViewModel

The controllers are adapters, not a second store. Pass an inventory-owned state and real commit/retrieve callbacks. The following example is complete enough to integrate into a host that already owns a Three.js scene, camera and canvas:

```js
import { createDollhouse } from './interiors/dollhouse.js';
import { createPlacementController } from './interiors/placement-controller.js';
import { createRoomWalker } from './interiors/room-walker.js';
import { initialSave, canPlace, unusedFurniture } from './rules.js';

const state = initialSave();
const house = createDollhouse(scene);
house.sync(state.placements);
house.setVisible(true);

const decorator = createPlacementController({
  dollhouse: house,
  camera,
  element: canvas,
  getPlacements: () => state.placements,
  canPlace,
  onCommit(candidate, replacingId) {
    if (!canPlace(candidate, state.placements, replacingId)) return false;
    if (replacingId) {
      if (!state.placements.some(p => p.id === replacingId)) return false;
      state.placements = state.placements.map(p =>
        p.id === replacingId ? { ...candidate } : p);
    } else {
      if (unusedFurniture(state, candidate.type) < 1) return false;
      state.placements = [...state.placements, { ...candidate }];
    }
    house.sync(state.placements);
    return true;
  },
  onRetrieve(id) {
    if (!state.placements.some(p => p.id === id)) return false;
    state.placements = state.placements.filter(p => p.id !== id);
    house.sync(state.placements);
    return true;
  }
});

const walker = createRoomWalker({
  dollhouse: house,
  camera,
  element: canvas,
  getPlacements: () => state.placements
});
walker.setEnabled(false);

// In the host animation loop:
// walker.update(deltaSeconds, elapsedSeconds);

// For the host "Walk" button:
// decorator.setEnabled(false);
// walker.setEnabled(true);

// For the host "Decorate" button:
// walker.setEnabled(false);
// decorator.setEnabled(true);

// For an available catalog item:
// decorator.startPlacing('chair');

// On leaving the interior:
// decorator.destroy();
// walker.dispose();
// house.dispose();
```

`createPlacementController` also accepts `idFactory(type)`, `onMessage(text)`, and `onStateChange(state)`. It exposes `startPlacing(type)`, `startMoving(id)`, `select(id)`, `reposition({x,z})`, `rotate(direction)`, `nudge(dx,dz)`, `place()`, `retrieve()`, `cancel()`, `setEnabled(boolean)`, `getState()`, and `destroy()`. Its candidate IDs are *proposals* until the ViewModel accepts a commit.

`createRoomWalker` optionally accepts an external `player`, `start`, `speed`, and `onMessage`. It exposes `player`, `routeTo({x,z})`, `update(dt,time)`, `setEnabled(boolean)`, `dispose()`. The player is parented under the interior root at its existing 2.2-unit scale, and only a visual/navigation actor is changed. For independent town and house avatars, pass a separate character model.

## Catalog adapters

Furniture meshes are reused directly from `src/art.js`. `teapot` is a tabletop item in `src/rules.js`; when placed within a table/dresser footprint it is automatically lifted onto the surface **for rendering only**. Its serialized placement still uses the same `{ id, type, x, z, r }` format. Outside those footprints, it remains floor-level as permitted by the current shared rules. Rugs never block avatar movement. These adaptations do not modify any shared asset file.

## Test command

Run the interior unit suite directly, without changing the repository's existing `package.json` scripts:

```sh
node --test src/interiors/placement.test.js
```

The tests cover the shared footprint catalog, grid snapping, quarter-turns, move identity, rule-engine collisions and front-door bounds, rug pass-through, walkable character-scale clearance, and A* navigation around placed furniture. The parent package's `npm test` still runs only `test/*.test.js`; the independent interior suite must be invoked explicitly until the integration owner updates the package script.

## Deliberately deferred to integration work

1. The main game entrypoint does not yet call `createDollhouse`. Merge this PR and wire it to house entry/exit and the authoritative inventory ViewModel.
2. Shops and villagers can instantiate independent rooms and reskin walls/floors later. `options.width/depth/wallHeight` affect **visual geometry only**; the current `rules.js` placement validator uses fixed `ROOM` bounds and must be extended before supporting other footprint dimensions.
3. If tabletop decorations should require a support surface, tighten `canPlace` in the shared rules, not this View.
4. Character navigation currently uses a small-grid A* suitable for one-room layouts. Multi-room portals and NPC navigation remain integration responsibilities.

No branch merges, deployment changes, shared-file edits, or ownership/persistence shortcuts are part of this feature.
