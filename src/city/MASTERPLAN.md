# Living Town master plan — Worker 1

## Geographic intent

Clover Hollow's original homes, Mayor's Hall, bakery, furniture store, river, pond, three player lots, save format, and all legacy building IDs remain fixed. The new playable bounds are x = -92 to 92, z = -143 to 82. Development extends **south**, avoiding displacement of homes.

**Clover Square & Old Town** occupies x -72 to 10, z -112 to -48. A southbound connection from the existing western residential street joins an east-west civic garden, merchant arcades, and two parallel rows of commercial and public buildings. The existing Mayor's Hall remains the story hub.

**Lantern Quarter** occupies x 14 to 59, z -132 to -65. Its central north-south lantern promenade links to Old Town's eastern frontage and the original market via x=9. An event green and a small fountain sit near the middle, with theatre, arcade, cafe, and music hall sites on both sides.

The districts are separated by a walkable promenade, not isolated by the river. The river at x=61–71 remains blocked except at the existing bridge. There are no additional unmodeled river crossings.

## Authoritative contract

Import `DISTRICT_SITES`, `DISTRICTS`, `DISTRICT_PATHS`, `DISTRICT_PLACES`, `DISTRICT_LANDMARKS`, and `WORLD_BOUNDS` from `src/world/district-plan.js`. Every site has:

```js
{
  id: 'lantern-theatre',
  district: 'entertainment',
  x: 21, z: -90, w: 12, d: 10,
  name: 'Starlight Theatre',
  kind: 'theatre',
  entrance: [21, -83.5],
  seed: 'lantern-theatre'
}
```

Coordinates are absolute world units. All entrances face +Z and sit 1.5 units outside their facade. Site objects and entrance arrays are frozen. Do not independently alter these positions in district renderer modules.

## Worker integration

Worker 2 should filter `DISTRICT_SITES.filter(s => s.district === 'downtown')` and export `createDowntownDistrict(scene,{sites,seed,quality})` from `src/districts/downtown/index.js`.

Worker 3 should filter `DISTRICT_SITES.filter(s => s.district === 'entertainment')` and export `createEntertainmentDistrict(scene,{sites,seed,quality})` from `src/districts/entertainment/index.js`.

Both return `{root,interactables,update(dt,daySeconds),dispose()}`; interactables use `{id,siteId,kind,label,x,z,radius,action}`.

Until those renderers are merged, `src/town.js` displays the reserved sites using the approved procedural architecture generator. This branch intentionally **does not import** either unfinished renderer. During integration, suppress the placeholder buildings for the relevant district to prevent duplicate architecture, then register each worker's interactables alongside the existing focusables without changing old interaction IDs. Keep the old `createTown(scene)` API.

## Navigation and population

`BUILDINGS`, `PATH_SEGMENTS`, `PLACES`, and `PLAZA_SOCIAL_SPOTS` are extended rather than replaced. The same walkability function and sampled pedestrian graph enforce building collision. District street centerlines and door thresholds are linked to the old route network.

The pure `src/simulation/town-life.js` now schedules morning deliveries, shop work, shopping, conversations, evening entertainment, and homebound returns. Sixteen visitors use district destinations; established resident IDs and dialogue lines are preserved. Rendering remains in `src/town.js`, not in the simulation.

## Performance and acceptance

The world ground, fog, and shadow frustum cover the new geography. District infrastructure uses small Three.js meshes and the existing landscape generator; larger mobile budgets may require instancing lantern posts and decorative planters and reducing shadow range. No measured iPhone FPS is claimed.

Run `node --test src/simulation/city-masterplan.test.js` and the repository's existing test command. Inspect the running scene on desktop and iPhone, test all old/new doors and the mayor deed ceremony, and capture **real renderer** screenshots of both districts and the town overview before marking the PR ready. Screenshots and device performance measurements are pending; generated illustrations are not gameplay evidence.
