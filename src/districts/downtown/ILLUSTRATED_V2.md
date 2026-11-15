# Illustrated Downtown v2 — Worker 1

This branch starts at integration commit `9f82a3ea4b2c288a17c6d88a6332c25d1fdb4cc9`. No worker-owned world, simulation, visual, town, UI, architecture source, or application files were changed.

## Implementation

The existing `createDowntownDistrict` entry point is the sole renderer. It still calls `buildApprovedCottage` from `src/architecture/approved-cottage.js` for the roof, roof-following walls, instanced shingles, original arched doorway, round windows, and Moonspire. New cornice splines use the exact exported `approvedSwoopHeight` function with the same roof width, rise and base values. No replacement roof shells are created.

`architectural-details.js` adds merchandise-filled shop bays, façade timbers, shop fascia, striped awnings, carved curved cornices, planters, hanging signs, upper balcony details at high quality, and context-specific public props. Every storefront identity selects coherent decorative content from its `kind`: bakery, post office, florist, furniture, general goods, café, tailor, bookshop, library, town hall, mayor's office, and community center. Existing `index.js` civic models, approved roof assembly, civic interiors, signage and service actions remain in use.

`src/props/downtown/index.js` exposes 30 named prop archetypes, each a recognizable composition of geometry rather than a recolored cube. Use `createDowntownProp(type,{seed,quality})` and `PROP_TYPES`.

## API

```js
const district=createDowntownDistrict(scene,{sites,seed:1,quality:'medium'});
// {
//   root,
//   interactables,
//   activityAnchors,
//   update(dt,daySeconds),
//   dispose()
// }
```

Existing `interactables` IDs and service actions are unchanged. New `activityAnchors` are optional, world-space `{id,siteId,role,x,z,facing,capacity,pose,activity}` objects. They are positioned on the reserved +Z entrance sidewalks, outside site footprints, and require no unpublished Worker 2 modules. Two anchors per site are provided: service and delivery. Worker 2 can consume the array after merging, without altering this branch.

## Quality and performance

- `low`: the approved roof, curved shingles, identity displays, recognizable window merchandise, and four scene props per building.
- `medium`: adds façade detail, hanging signs, and planters.
- `high`: adds balconies and extra ornamentation.

The approved roof's shingles remain instanced. Rounded geometry is reused through `roundedBox`'s existing cache, and materials through the shared `fairyMaterial` cache. Small distinct props remain separate meshes: they are visually rich but potentially expensive. Draw-call counts and iPhone frame rates **have not been measured**; additional batching is a performance follow-up.

## Verification

`node --test src/districts/downtown/illustrated-downtown.test.js` covers seeded props, distinct archetypes, unchanged entrance coordinates, district site identities, service action compatibility, activity anchors, quality levels, update, and disposal. The existing suite should also be run.

**Not yet verified:** real game screenshots (full street, bakery, post office, town hall, aerial, iPhone portrait/landscape, afternoon/evening), browser gameplay, actual mobile FPS, and baseline before/after comparison. The branch is a development increment, not visual-acceptance complete.

## Integration limitations

- The current site registry has eight Old Town reservations plus the existing mayor office. Pip's Bakery, Little Oak and General Goods remain outside those Old Town reservations; they are rendered by the original town adapter, not by this district renderer. Bringing them under the upgraded storefront renderer requires a Worker 3-owned `src/town.js` integration change. Do not duplicate them from this module.
- A new tailor/bookshop requires site reservations from the world-layout owner. This branch cannot modify `src/world/district-plan.js`.
- The current mayor interaction and deed ceremony remain untouched; no new actions replace them.
- The legacy town-hall tower geometry and existing civic interiors are retained. A larger bespoke civic art pass is still needed to meet the full landmark ambitions.
- Decorative props outside collision footprints must be checked against all walkable corridors in a running scene. Activity anchors use established entrance thresholds, not new pathfinding.
