# Lantern Quarter — independent entertainment worker

## Integration contract

```js
import {createEntertainmentDistrict} from './districts/entertainment/index.js';
const district=createEntertainmentDistrict(scene,{sites:lanternSites,seed:42,quality:'medium'});
// Once per frame:
district.update(dt,gameDaySeconds);
// UI/MVVM consumes district.interactables; district itself owns no saves or rewards.
// On unload:
district.dispose();
```

Each site is `{id,district,x,z,w,d,name,kind,entrance,seed}`. Supported kinds: `theater`, `music`, `arcade`, `festival`, `garden`, `promenade` (or descriptive names). Site x/z are center positions; +Z is the front. Supply `entrance:{x,z}` in **world coordinates**, at a point already approved as walkable by Worker 1. When absent, the fallback entrance is at `{x:site.x,z:site.z+site.d/2+.85}`. Do not use the fallback to overwrite Worker 1's navmesh. The models are visual and do not mutate navigation or game state.

The `interactables` array contains `{id,siteId,kind,label,x,z,radius,action}`. Recognized actions: `ring-toss`, `firefly-rhythm`, `theater-encore`, `visit-garden`, `visit-promenade`. The latter two are scenic visits. All interactive game state is handled externally.

## Pure activities

```js
import {startActivity,activityPrompt,advanceActivity,cancelActivity,restartActivity} from '../../activities/entertainment/index.js';
let state=startActivity('ring-toss',{seed:123});
const prompt=activityPrompt(state); // {type:'aim',target:0..1,hint}
state=advanceActivity(state,playerAim); // 0..1
state=cancelActivity(state); // or restartActivity(state)
```

The same API supports `firefly-rhythm` (timed normalized 0..1 taps) and `theater-encore` (choice 0,1,2). States: `active`, `complete`, `cancelled`; `startActivity` begins a fresh state. Winning returns a reward string, but the caller decides whether and how to persist it. No petals, purchases, or random paid outcomes.

## Events and crowds

`district.events(gameDaySeconds,dayIndex)` returns scheduled matinee, concert and festival events. The day is 1320 seconds (22 minutes). `district.attendance(siteId,gameDaySeconds,dayIndex)` returns suggested crowd coordinates; NPC routing and actual attendance are owned by Worker 1. Event themes rotate every three days. `district.update(dt,gameDaySeconds)` adjusts lanterns and animated fireflies.

## Visual and performance notes

Uses the established `roundedBox` and `fairyMaterial` toolkit, curved roof surfaces, reusable geometry/material caches, and no per-venue point lights or external assets. Quality `low` disables firefly animation; medium/high enable it. Renderer shadows and post-processing remain controlled by the application.

The enclosed theater/music/arcade interiors include visible stages, seats, props and game cabinets. They are modeled as a unified exterior group; a separate cutaway/interior camera or visibility toggle should be supplied by the application. This worker does **not** add interior navigation or UI. The preview below uses a cutaway camera and activity overlay.

Run `npm run serve` and open `/src/districts/entertainment/preview.html`. Run tests with `node --test src/activities/entertainment/entertainment.test.js`.

No generated screenshots are committed; capture day and night from the preview in a browser. The worker has not verified browser WebGL rendering.
