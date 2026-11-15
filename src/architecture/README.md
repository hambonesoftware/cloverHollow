# Clover Hollow fairy architecture

The public factory is `createFairyBuilding(buildingDefinition, config?)` from `src/architecture/generator.js`. It returns a positioned `THREE.Group` with `userData.buildingId`, `userData.family`, `userData.entrance`, and `userData.collisionFootprint`. Input definitions come directly from `BUILDINGS` in `src/world/layout.js`; their IDs, origins, dimensions, and entrances remain authoritative.

The pure `designBuilding(definition, options?)` factory in `src/architecture/design.js` returns deterministic configuration metadata. Available families: `storybook`, `toadstool`, `moonspire`, and `hobbit`. Options include `family`, `seed`, `wallHeight`, `roofCurvature`, `roofOverhang`, `palette`, `windows`, `door`, and `garden`. Passing the same definition and seed gives the same layout and detail positions. All roofs are procedural: swoop walls trace the roof profile, mushroom walls taper into the gill ring, moonspire towers intersect the roof volume, and hobbit houses use the grassy hill mesh itself as their roof.

```js
import { BUILDINGS } from '../world/layout.js';
import { createFairyBuilding } from './generator.js';
const cottage = createFairyBuilding(BUILDINGS.find(b => b.id === 'lot-0'), {
  family: 'hobbit',
  seed: 'south-meadow:hero',
  roofCurvature: 1.1,
  roofOverhang: .32
});
scene.add(cottage);
```

The landscape factory is `createFairyLandscape(scene, {buildings, walkable, routePoints, seed})` in `src/environment/landscape.js`. It batches canopy clusters, flowers, stones, hedges, and trunks into instanced meshes. It consults the original collision function before placing stems and ground decoration, and retains clearance around roads and entrances. It returns deterministic object counts for profiling. Existing town NPC schedules, saved lot positions, routes, and collisions are unchanged.

## Tests

Run `node --test src/architecture/architecture.test.js`. The tests cover family availability, seeded repeatability, dimensions, fixed property locations, and doorway walkability. This is an additional test suite; no workflow or package scripts were changed because those are outside this worker's ownership.

## Performance and visual acceptance

- One instanced mesh per color/shape batch for most ground flowers, stepping stones, trees, and leaf clusters; each cottage shingles batch is instanced.
- Building walls, roofs, mushroom caps, and hills use moderate-resolution custom BufferGeometry meshes. Individual chimneys, doors, windows, and branching vines are meshes and can become the main draw-call bottleneck.
- Town currently retains some older trees, flower decorations, and street props. A later profiling pass should remove duplicate legacy foliage if frame time or GPU memory is excessive.
- The mobile rendering target should be measured on real iPhone/iPad devices using frame-time and draw-call captures. No measured FPS claims are made here.
- Screenshots should be captured from the actual running Three.js renderer: one isolated view per family and one full-town aerial. Do not substitute concept art for gameplay evidence.

## Merge coordination

This branch changes `src/town.js` and adds only `src/architecture/` and `src/environment/` files. It does not modify `src/art.js`, the MVVM, interiors, rules, layout positions, or deployment. Integrate after reconciling any simultaneous town renderer changes. The contract `createTown(scene)` and its returned fields remain unchanged except for an additive `landscape` profiling object.
