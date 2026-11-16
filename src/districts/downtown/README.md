# Clover Square / Old Town — Worker 2

## Public API

```js
import {createDowntownDistrict} from './districts/downtown/index.js';
const downtown=createDowntownDistrict(scene,{sites:worker1Sites,seed:2026,quality:'medium'});
// Each frame:
downtown.update(deltaSeconds,daySeconds);
// When unloading:
downtown.dispose();
```

Each site is `{id,district,x,z,w,d,name,kind,entrance,seed}`. The `entrance` may be `{x,z}` in world coordinates. Absent entrances default to the positive-Z side. Sites are supplied externally; the district never allocates land or writes navigation, simulation, saves, or world files. Sites may face +Z (the usual north entrance) or -Z
(`site.facing === 'south'` for the inward-facing Old Market row); the entire
approved cottage and its shopfront decorations rotate as one. Provide sufficient spacing and footprint dimensions; the approved roof overhang and civic steps project beyond the structural wall footprint. Small footprints below approximately 6x6 are unsuitable.

Kinds: `town-hall`, `mayor-office`, `post-office`, `library`, `community-center`, `bakery`, `furniture`, `general-goods`, `florist`, `cafe`, `tailor`, `bookshop`, `market`. Common camelCase and short aliases are supported.

`root` is a Three.js Group. `interactables` is a plain array of `{id,siteId,kind,label,x,z,radius,action}`. The game shell should display these actions and dispatch them to its existing MVVM state/persistence implementation. The new service modules provide **descriptors**, not inventory mutation or mail storage. Import `serviceActions`, `validateDowntownAction`, `mailService`, `mayorService`, `noticeBoard`, `townCalendar`, `libraryService` from `src/services/downtown/index.js`.

**Mayor storyline:** use Worker 1's existing mayor site ID unchanged, and dispatch `mayor.deed` to the existing deed quest handler. This module does not replace Mayor Thistle's quest, building registry, or purchase logic. Similarly, `shop.furniture` should route to the existing furniture purchase screen.

## Art

The exterior **directly invokes** `buildApprovedCottage` from `src/architecture/approved-cottage.js`, retaining the approved `approvedSwoopHeight` curved roof, extruded roof-following shell, individual-colored instanced shingles, curved eaves, arches, lanterns, and flower boxes. District additions include tower clock, postbox, balcony railings, storefront awnings, market stands, civic steps, notice boards and distinct palettes. These are procedural geometry, not downloaded assets. Material and geometry caching is shared with the existing approved implementation.

Civic sites contain `group.userData.interior`: a two-wall dollhouse room with rear and left walls, an open front and right side, floor, bookshelves, desk and seating. It is **hidden by default** to avoid double geometry over the exterior; the integrating view can display it when entering the building. Collision and character navigation inside the room remain the shell's responsibility.

## Testing and screenshots

Run `node --test src/districts/downtown/downtown.test.js` in an environment with the repository's Three.js dependency installed. The tests cover service IDs, required destinations, seeded output, malformed sites, disposal, and interior construction.

The district does not automatically render screenshots. To capture **actual Three.js** street and aerial screenshots, mount a demonstration page that imports the module and constructs a `THREE.WebGLRenderer`, directional/ambient lights, ground, and camera, then capture the browser canvas twice (street: camera near the plaza at character height; aerial: elevated three-quarter camera). Screenshots have **not been captured or visually verified** in this worker environment.

## Integration limitations

This branch intentionally does not edit the world registry, navigation, town shell, UI, or save schema. Public services expose action IDs but do not implement stateful sending/receiving or persistent events until the MVVM shell connects them. Geometry is not a collision mesh; use the supplied site footprints for collisions. `dispose()` detaches scene objects without destroying cached geometries/materials shared with other districts.
