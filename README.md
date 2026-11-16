# 🍀 Clover Hollow

**A little place to belong.** A cozy Three.js town-life game with a populated village, Mayor Thistle's deed ceremony, and a character-scale two-wall dollhouse that you can furnish.

**Game URL (when Pages is enabled):** https://hambonesoftware.github.io/cloverHollow/

## Play online

**Live game:** https://hambonesoftware.github.io/cloverHollow/

GitHub Actions checks source syntax, Node tests and a real desktop/iPhone
WebGL smoke test before publishing to GitHub Pages. See
[the deployment workflow](https://github.com/hambonesoftware/cloverHollow/actions/workflows/pages.yml).

## Clover Hollow 5.0 — now a playable storybook town

The main square has a **physical Apple Cart Rescue** instead of only shop
menus. Find Tilly's striped delivery cart on the east side of the original
square. Tap/press E beside her to start; chase three rolling apples, pick up
one at a time, and bring each back to the basket. The courier reacts and a
celebration stays visible after the rescue. Your ribbon is saved in the
existing keepsake inventory.

Follow the creek and you may spot a hidden four-leaf clover. It also saves
without requiring a quest or collecting resources.

In Lantern Quarter, visit the Moonring Toss pavilion near the Festival Green.
You can enter from the arcade/festival action menu or approach the actual
pavilion in-world. **Swipe across the game scene to aim, release to throw a
visible 3D ring, or use left/right/throw controls.** Land at least three of
five rings to earn the Moonring ribbon. No admission tickets or grinds.

The outdoor camera now favors readable characters and interactions at both
desktop and iPhone portrait sizes, and the new opt-in soundscape includes
an original little Clover Hollow melody with day/night arrangements.

## Play locally

Use Node.js 22+ and a local web server. The browser imports Three.js 0.170.0 from jsDelivr, so it needs an internet connection.

```bash
npm run serve
```

Open http://localhost:8900/.

Run all pure JavaScript tests:

```bash
npm test
```

To run the full Chromium/WebGL playthrough locally:

```bash
npm install --no-save playwright@1.56.1
npx playwright install chromium
npm run test:browser
```

## Play the game

Meet Mayor Thistle and choose one of three lots: South Meadow, Brookside, or Orchard Row. Your deed is permanent, and your cottage can be entered from its front doorstep. Inside, rearrange furniture with valid/invalid previews, move and rotate items, or return them to storage without losing ownership. Little Oak Furnishings sells additional pieces for petals. The housewarming ceremony and keepsakes are saved.

| Action | Keyboard / mouse | iPhone / iPad |
| --- | --- | --- |
| Walk | WASD or arrow keys | On-screen joystick |
| Interact / enter | E or Space | Talk / Enter |
| Apple cart / secret | E near highlighted object, or click object | Tap highlighted object or TALK |
| Moonring Toss | Left/right to aim, E/Space to throw, Esc to leave | Swipe and release on scene or use the aim/throw buttons |
| Satchel | I | Satchel |
| Decorate at home | B or Decorate | Decorate |
| Choose furniture | Click a model or catalog item | Tap model or catalog item |
| Preview location | Move cursor across room | Tap / drag floor |
| Rotate | R or Rotate | Rotate |
| Place / store / cancel | Decorating buttons / Escape | Decorating buttons |
| Leave cottage | Leave Cottage | Leave Cottage |

## Architecture

- **Town and NPCs:** src/town.js, src/world/, src/simulation/ provide pedestrian streets, shops, character schedules, visitors, and safe navigation.
- **Art:** src/art.js supplies original, stylized chibi characters, furniture, and procedural buildings.
- **Two-wall interiors:** src/interiors/dollhouse.js creates an open-front room. src/interiors/placement-logic.js supplies furniture and avatar collision rules.
- **MVVM:** src/viewmodels/ holds observable state and decorating rules. src/rules.js defines property lots, furniture, ownership, inventory, and save data.
- **Presentation:** src/ui/ and src/main.js connect responsive UI, Three.js rendering, cameras, story dialogs, touch movement, and indoor/outdoor transitions.
- **Saves:** Clover Hollow uses the distinct localStorage key clover-hollow-v1. Willowbend saves are untouched.

The current release is a **playable foundation**, not yet a complete Animal Crossing or Stardew Valley-scale game. Two authored, physical 3D experiences now demonstrate the intended direction. More fully enterable shops, dialogue scenes, environmental storytelling, and physical activities can be added through the same gameplay architecture.

## Quality checks

The GitHub Actions workflow in .github/workflows/pages.yml verifies the town, dollhouse, ViewModels, save/load and an end-to-end WebGL browser playthrough: town startup → deed → enter home → housewarming → furniture place/move/rotate → reload → leave home. Pages deployment only proceeds when these tests pass.
