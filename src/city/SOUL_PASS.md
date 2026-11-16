# Clover Hollow — Living Storybook Town

This is an implementation pass, not a declaration that the town has reached
its final art direction. The major goal is to replace the feel of an empty,
perfectly ordered city grid with meaningful spaces and observable daily life.

## Playable changes

- Old Market's northern row of four businesses now faces inward, south toward
  the opposite row. Shopfronts and their decorative awnings rotate together.
- Sites are subtly staggered without moving legacy resident homes or any of
  the three player deed lots. District IDs and service action IDs remain stable.
- Downtown has a gently bending market lane. Navigation and paving both support
  diagonals; collision checks still validate each sampled sidewalk segment.
- Residents favor real occupational stations, including the older bakery,
  carpenter's workshop and general store. Dot and Biscuit can work at the
  post office, while the orchard and creek have their own job positions.
- Neighbor pairs share daily meeting places and conversations last long enough
  to be visible. Individual schedules vary rather than lining up on one clock.
- Five small animated public vignettes give the streets day-to-night changes:
  tea tables, a parcel-cart mishap, bakery steam and pastry deliveries,
  florist butterflies, and an evening music rehearsal.
- Existing character dialogue gains familiar lines after repeated visits using
  the already-saved conversation counts, without a save-schema migration.
- The southern districts receive tree and flower scatter, previously limited
  to the original north village.

## Verify before merging

1. Run `npm test`.
2. Run `npm run test:browser` (Playwright + Chromium).
3. Examine the actual market from character height and aerial camera. Confirm
   the inverted row's signs, storefronts, doorway prompts and collision behave
   correctly; review rendered storefront density, not merely object counts.
4. Visit the market in morning and evening, observe the short parcel mishap,
   repeat conversations, and verify the citizen station diagnostics.
5. Compare actual iPhone portrait and landscape screenshots and frame timings.
6. Keep the baseline localStorage key `clover-hollow-v1`; do not reset saves.

## Still worth doing

The strongest follow-up is a full visual-art-direction pass on all old village
commercial facades, non-repeating shop interiors, more layered environmental
sound with mute controls, persistent multi-day events, and authored story arcs.
These features need actual gameplay and mobile visual review; code-only merge
validation cannot claim that a town now feels like Busytown.
