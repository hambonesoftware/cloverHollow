# ✿ Clover Hollow

A cozy 3D town-life game in Three.js: wander a busy village, meet Mayor Thistle, receive the deed to one of three cottages, and decorate your own miniature two-wall dollhouse.

**Game URL (after the Pages workflow succeeds on `main`):** https://hambonesoftware.github.io/cloverHollow/

> This feature branch is a draft integration PR. The URL is the expected repository Pages address, **not a verified live deployment**. Production Pages deploys only after tests pass on `main` and the repository's Pages source is set to **GitHub Actions**.

## Running locally

Use a local HTTP server, not `file://`, because the game uses ES modules and a CDN import map for Three.js.

```bash
npm run serve
```

Open http://localhost:8900. The application imports Three.js from the pinned jsDelivr `three@0.170.0` ES module; an internet connection is needed the first time it loads.

Run the full test suite:

```bash
node --test test/*.test.js src/viewmodels/*.test.js src/persistence/*.test.js
```

Existing `npm test` runs the original rules tests only; the CI workflow above includes the new MVVM and persistence suites without modifying the shared `package.json`.

## Controls

| Action | Keyboard / desktop | iPhone and iPad |
| --- | --- | --- |
| Move | WASD or arrow keys | Drag the lower-left joystick |
| Talk / use an entrance | E or Space | Tap **Talk** or **Talk / Enter** |
| Satchel | I or Satchel button | Tap **Satchel** |
| Decorating | B or Decorate button while home | Tap **Decorate** |
| Pick a placed item | Click it inside your cottage | Tap it inside your cottage |
| Preview new position | Move the pointer across the floor | Tap / drag across the floor |
| Rotate | R or **Rotate** | Tap **Rotate** |
| Confirm / store / cancel | Buttons / Escape to cancel | Buttons |
| Exit cottage | **Leave Cottage**, or interact | Tap **Leave Cottage** |

Story route: greet Mayor Thistle, choose **South Meadow**, **Brookside**, or **Orchard Row**; receive a permanent deed. Walk to the chosen cottage, use its entrance, enjoy the housewarming, then rearrange or store furniture. Shop at **Little Oak Furnishings** to purchase more furniture using petals. Your satchel also contains keepsakes and supplies.

## Architecture and boundaries

The application separates state from rendering:

- **Model / rules:** `src/rules.js` is authoritative for property definitions, furniture prices, initial state, legal room footprints, collision rules, and the `clover-hollow-v1` save key.
- **ViewModels:** `src/viewmodels/game-view-model.js` provides observable state and pure action logic. `src/viewmodels/decorating-view-model.js` drives selection, snapping, previews, rotation, valid placement, and safe storage. Neither imports Three.js, the DOM, or browser storage.
- **Persistence:** `src/persistence/save-store.js` resolves browser storage defensively and includes memory storage for tests. `loadSave` validates saved state and never reads Willowbend storage keys.
- **Views:** `src/ui/app-ui.js` and `src/ui/styles.css` provide story dialogs, inventory, purchasing, placement controls, and mobile input. `src/main.js` is the sole render loop and coordinates world changes.

The save includes a permanent `deed`, `inventory` ownership counts, `placements` with stable IDs, `petals`, story flags, keepsakes, supplies, and the last scene. Storing an object removes only its room placement; the corresponding inventory count never decreases.

## Independent branch integration contracts

These names/signatures are assumed for the two parallel features. **Coordinate with the other PR authors before merging this shell** if their implementations differ.

### Living town — `feature/living-town`

`createTown(outdoorScene)` from `src/town.js` returns:

- `player`: a positioned, animatable Three.js Group.
- `actors`: a list of residents with `name` and `model.position`.
- `focusables`: objects with `id`, `x`, `z`, and optional interaction radius `r`. Expected IDs: `mayor`, `bakery`, `furniture`, `general`, and `lot-0` / `lot-1` / `lot-2`.
- `walkable(x,z)`, `update(dt, elapsed, daySeconds)`, and `useLot(deedIndex)`.

### Two-wall dollhouse — `feature/dollhouse-interiors`

`createDollhouse(indoorScene)` from `src/interiors/dollhouse.js` should return:

- `setVisible(boolean)`: show / hide the interior.
- `sync(placements, gameState)`: reconcile render meshes with placement records `{id,type,x,z,r}`. The second argument is optional and can be ignored.
- `preview({type,x,z,r}, valid)`: render translucent green/red placement feedback (valid is passed separately).
- `clearPreview()`: remove the ghost object.
- `pickFurniture(raycaster)`: return a placement object with `id`, an ID string, or null.
- `floorPosition(raycaster)`: intersect the room floor and return `{x,z}` in room coordinates, or null.

The game shell creates a Three.js `Raycaster` from normalized screen coordinates before calling both picking methods. Room coordinates are centered at zero, the floor is `y=0`, and `r` is an integer quarter-turn in `0..3`. The renderer must not mutate inventories or decide whether an item is legally placeable: the authoritative `canPlace` in `rules.js` does that.

**Temporary preview adapter:** until the independent interior branch is merged, `src/main.js` catches a missing dynamic dollhouse import and renders a simple fallback two-wall room. This keeps the feature branch loadable while leaving `src/interiors/` entirely untouched. Final visual acceptance requires testing the real interior renderer.

## GitHub Pages setup

1. Make sure GitHub Actions are enabled for the repository.
2. In **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**.
3. After the three feature PRs are reconciled and merged to `main`, confirm that **Clover Hollow Checks and Pages** succeeds on `main`.
4. Open https://hambonesoftware.github.io/cloverHollow/ on desktop and a real iPhone/iPad. If a Pages project URL differs due to repository settings, use the URL in the successful deployment environment instead.

The workflow runs on PRs to catch unit and syntax regressions, but deploys only from `main`. It serves the repository directly; no bundler or hardcoded root-relative asset paths are required.

## Merge / manual acceptance gate

Do **not** merge this branch until both `feature/living-town` and `feature/dollhouse-interiors` are present on `main`. Rebase or update this PR afterward and review the integration contracts. Verify on desktop, iPhone, and iPad:

1. A new player loads the town and moves with keyboard or touch joystick without walking through buildings.
2. The welcome screen and Mayor Thistle offer exactly three properties; a chosen deed survives reload and cannot be swapped.
3. The player enters the owned cottage, sees the **real** dollhouse module, and triggers the first housewarming event exactly once.
4. Buying furniture debits petals; the item appears in storage. Valid positions display a valid preview, and blocked positions display an invalid preview.
5. Moving, rotating, placing, and storing objects changes the room correctly; no purchased object is lost.
6. Leaving, reloading, and returning to the cottage restores every piece in its exact location and orientation.
7. The Pages workflow succeeds and the published URL loads in browser consoles without module, asset, or storage errors.

This PR must remain unmerged until those checks are completed.
