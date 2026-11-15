# 🍀 Clover Hollow

**A little place to belong.** A cozy Three.js town-life game with a populated village, Mayor Thistle's deed ceremony, and a character-scale two-wall dollhouse that you can furnish.

**Game URL (when Pages is enabled):** https://hambonesoftware.github.io/cloverHollow/

## GitHub Pages — one-time setup required

All three development PRs are merged. The complete production game passes Node tests and a Chromium WebGL playthrough. However, the first deployment failed because **GitHub Pages has not been enabled for this repository**.

1. Open [Clover Hollow Pages settings](https://github.com/hambonesoftware/cloverHollow/settings/pages).
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Open [Clover Hollow Actions](https://github.com/hambonesoftware/cloverHollow/actions/workflows/pages.yml) and rerun the failed workflow, or manually run it on main.
4. Verify the successful deployment and open the URL above.

The deployment workflow runs syntax checks, all Node tests, and an actual headless Chromium game smoke test before publishing. It uses Ubuntu 24.04 for Playwright compatibility.

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

The current release is a **playable foundation**, not yet a complete Animal Crossing or Stardew Valley-scale game. More activities, enterable shops, decorating collections, and villager stories can be added without replacing the core architecture.

## Quality checks

The GitHub Actions workflow in .github/workflows/pages.yml verifies the town, dollhouse, ViewModels, save/load and an end-to-end WebGL browser playthrough: town startup → deed → enter home → housewarming → furniture place/move/rotate → reload → leave home. Pages deployment only proceeds when these tests pass.
