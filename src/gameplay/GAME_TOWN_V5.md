# Clover Hollow 5.0 — a playable town, not a mathematical town

## Game design

The first five minutes should have real, readable things to DO:

1. From the starting square the player can see Tilly's courier cart and a warm, legible story prompt.
2. Tilly's runaway apple delivery is a short real-time 3D activity: start, chase,
   pick up, carry, deposit three physical objects, hear a response and see the
   cart decorated. No full-screen task list or resource costs.
3. A subtle glimmer near the creek rewards curiosity. This is optional and
   remains collected when the player reloads.
4. The Lantern Quarter has a physically rendered Moonring Toss pavilion.
   A visitor aims a thrown 3D ring with swipe, mouse drag, arrows or visible
   accessible buttons. Five throws, three hits for the familiar keepsake.
5. A resident is staged at each activity. The game helps the player see
   characters and interactables at desktop and portrait-phone scale.
6. Sound remains explicitly opt-in and now plays an original miniature melody
   whose arrangement changes with location and time of day.

## Independent module contracts

- `market-adventure.js`: pure rules. Coordinates, targets, interaction radius,
  story state, completion and keep-sakes are authoritative here.
- `market-scene.js`: 3D meshes, world-space animation, and raycast picking.
  Does not mutate save data.
- `moonring-toss.js`: pure game rules and independent 3D festival rendering.
  Scoring depends on the landing of an animated ring, not UI choices.
- `src/town.js`: mounts each activity, updates its animation, and exposes both
  adapters without reallocating resident homes or deed locations.
- `src/main.js`: routes gameplay actions into the scene, awards keepsakes
  through the existing ViewModel, and handles pointer/keyboard/touch input.
- `src/ui/app-ui.js`: small proximity and world-game HUD only. It does not
  own scoring or the coordinates of objects.
- `src/audio/clover-theme.js`: original reusable motif data, independent
  of the Web Audio implementation. The audio driver starts only on consent.

## Save compatibility

The save key remains `clover-hollow-v1`. Existing deeds, homes, rooms,
inventory, petals, dialogue counts and gifts retain their identity. Apple
rescue and the creek discovery persist through two distinct existing gifts:
`Apple Cart Rescue Ribbon` and `The Creekside Four-Leaf Clover`.
`Moonring ribbon` already existed in the game. In-progress activity state
is intentionally transient, so a reload cannot corrupt a saved scene.

## Acceptance

- `npm test`: rules, finite positions, story pickup/deliver invariants, ring
  outcomes, original music sampling and Three.js mesh construction.
- `npm run test:browser`: launch actual WebGL, keep old deed/home/shop flows,
  play five skill throws through real UI controls, complete every apple pickup,
  save both discovery rewards, reload, and test iPhone portrait interaction.
- Manual: verify signs and active objects are visible at normal game-camera
  angles and that mobile touch controls do not hide key visual clues.
- Performance: frame delta for movement is capped to avoid collision jumps,
  but cinematic actions use measured elapsed time to avoid slow-motion on
  lower frame-rate phones.

## Next content production (not claimed implemented)

Expand this same authoring pattern into non-modal bakery work, working
shop interiors, character-specific relationship encounters, a music hall
performance, neighborhood-specific discoveries, and animated vehicle routines.
Do not add new districts or anonymous NPCs simply to increase map size.
