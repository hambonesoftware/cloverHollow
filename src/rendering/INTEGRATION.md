# Clover Hollow 4.0 — storybook rendering worker

Branch baseline: `9f82a3ea4b2c288a17c6d88a6332c25d1fdb4cc9`.

## Modules

- `storybook-materials.js`: fifteen shared, cached MeshStandardMaterial presets with restrained tint variation. No external textures.
- `storybook-lighting.js`: smooth 22-minute color/brightness curve, atmospheric fog, warm sun, cool fill and single shadow-casting directional light.
- `../atmosphere/storybook-atmosphere.js`: lightweight instanced firefly glows with time-of-day visibility and reduced-motion support.
- `../performance/graphics-quality.js`: low/medium/high rendering presets, DPR cap and scene/frame statistics.

`src/town.js` retains the original town, routes, collisions, districts, deeds and gameplay, replaces its previous coarse brightness curve with `storybookLighting.update(daySeconds)`, and animates the atmospheric instance batch. The existing downtown factory is mounted exactly once. Its optional `activityAnchors` are forwarded to `createNpcSimulation(graph,{visitorCount:16,activityAnchors:downtownDistrict.activityAnchors??[]})`. Current simulation ignores unknown options; Worker 2 may consume the anchors after integration.

`src/main.js` selects a default graphics mode based on coarse pointer and device memory and applies a conservative DPR cap. It retains the original MVVM, persistence and camera behavior. The `?integration-test` probe exposes `window.__cloverTest.graphics()` with FPS, frame time, draw calls, triangles, texture and geometry counts, object count, quality and render resolution.

## Testing

Run `npm test` and `node --test src/rendering/storybook.test.js`. Browser acceptance: `npm run test:browser` after installing Playwright and Chromium.

## Boundaries and remaining work

This is a foundational rendering pass, **not** a complete visual overhaul. It does not yet replace the older landscape's tree geometry, introduce procedural texture maps, tune per-zone camera profiles, add settings UI for changing tiers, or implement adaptive quality. No mobile hardware measurements or actual screenshots were captured in this development environment. Do not claim 30 FPS on a physical iPhone based on the quality table.

The shared renderer does not create duplicate downtown or entertainment districts. Worker 1 can add optional `activityAnchors`; Worker 2 can read them through the existing simulation factory. Neither unfinished worker branch is required. Saved progress and localStorage keys are unchanged.
