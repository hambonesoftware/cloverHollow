# Clover Hollow character & graphics toolkit

## Implementation

This branch owns only `src/art.js`, `src/characters/` and `src/visual/`. It does not change the outdoor simulation, town, buildings, architecture generators, application shell or UI. Inspired by Willowbend's pivot-rig chibis and four-band shading, and Trash Panda Heist's reusable geometry and mobile quality tiers. Clover Hollow deliberately uses a softer five-step ramp and much thinner, optional outlines.

`makePerson(kind, colors)` and `animatePerson(group, time, moving, phase)` retain their signatures. Other existing `art.js` builders are untouched. Character rigs expose `group.userData.rig` with `body`, `head`, `legs`, `arms`, `eyes`, `ears`, `mouth`, and optional `tail`.

## New animation API

```js
import { updateCharacterAnimation } from './characters/animation.js';
const character = makePerson('cat', { shirt: 0xc58d9f });
updateCharacterAnimation(character, deltaSeconds, {
  velocity: { x: actualVelocityX, z: actualVelocityZ },
  heading: desiredHeadingRadians, // optional, otherwise inferred from velocity
  lookAt: { x: friendX, y: 1.5, z: friendZ }, // optional
  talking: false, sitting: false, carrying: false,
  expression: 'neutral', runThreshold: 2.5
});
```

Use real displacement divided by elapsed time to derive velocity; do not pass input-button state. The controller smooths speed, stride frequency, turns, bobbing, breathing, head direction, eyelids and gestures. It never moves the character root in world space: collision and movement remain owned by the game shell. `animatePerson` adapts the legacy moving flag to 1.7 world units/second (or accepts a numeric speed) and computes dt from its time argument. For best animation, Worker 3 should call the new velocity API directly and not call both animation functions in a single frame.

## Shared visuals

`visual/gfx.js` exports `PALETTE`, `QUALITY`, `TOON_RAMP`, `cachedGeometry`, `roundedBox`, `capsule`, `fairyMaterial`, `illustratedMesh`, `addFairyLights`, `configureFairyRenderer` and `chooseQuality`. The optional lighting and renderer configuration should be adopted by the shell only when it is ready; do not add duplicate lights to an existing scene. The five-step toon texture is nearest-filtered, cached geometry is reused, high-quality rim light is subtle, and outline shells are omitted at low quality.

`visual/character-comparison.js` exports `createCharacterComparison(scene)`, a self-contained old-vs-new 8-species 3D comparison display. Left column = legacy simple sphere character approximation; right column = updated character rig. Use the existing app renderer/camera, aim the camera toward the two banks (x≈-9 and x≈9), and call `comparison.update(dt)`. It intentionally contains no external model URLs or dependencies on deployment. **No actual browser screenshots were captured in this worker environment.**

## Asset pipeline decision

Blender is **not installed** in the available execution environment, so this PR uses procedural Three.js geometry rather than pretending to export GLBs. For a later Blender pass, author meshes at 1 unit = 1 meter with characters near 2.2 units tall, origin at the feet, facing +Z; separate head, limb, eye and accessory objects; apply modifiers and transforms; triangulate and export glTF 2.0 binary; optimize textures/meshes and load from committed local assets. Keep the procedural rig as a fallback and do not load external model URLs. Do not make runtime depend on Blender.

## Tests and review

```sh
node --test src/characters/characters.test.js
```

Tests cover eight species, rig scale and hierarchy, velocity-based gait, idle transitions, talking/carrying/sitting/looking, legacy calls and graphics caches. These require the same installed `three` dependency as the app. The current base repository has no `index.html` or package dependency declaration for Three.js, so browser render, GLB loading, full integration and automated Node test execution were **not** verified. JavaScript source syntax was checked. The comparison helper is provided for a reviewer to capture before/after images once a renderer is available.

## Integration boundary

Worker 1's architecture and Worker 3's movement/camera/UI are not modified. A parallel worker also changes `src/art.js`; expect a merge conflict and retain the character wrapper imports and exports while preserving Worker 1's architecture changes.
