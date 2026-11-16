// Full in-browser acceptance smoke test for the merged Three.js game.
// Run with: npm install --no-save playwright && npx playwright install chromium
//           node test/browser-smoke.mjs
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const types = { '.html': 'text/html', '.js': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403);response.end();return;
    }
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404);response.end('Not found');
  }
});
await new Promise(resolveReady => server.listen(0, '127.0.0.1', resolveReady));
const url = 'http://127.0.0.1:' + server.address().port + '/?integration-test=1';
let browser, page;
const errors = [];
try {
  browser = await chromium.launch({ headless: true, args: [
    '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'
  ] });
  const context = await browser.newContext({
    viewport: { width: 1240, height: 800 }, ignoreHTTPSErrors: true
  });
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__cloverTest), { timeout: 60000 });
  assert.ok(await page.evaluate(() => window.__cloverTest.actorCount() >= 15),
    'Outdoor town should have residents and ambient visitors');

  // Integration acceptance for all three independent Clover Hollow 4.0 PRs:
  // real mounted downtown props, actual outfits/poses, valid activity stations,
  // and the active lighting engine. Unused source modules must fail this check.
  const visuals=await page.evaluate(()=>window.__cloverTest.worldVisuals());
  assert.ok(visuals.downtownProps>=30,
    'Worker 1 procedural storefront props must render in the playable downtown');
  assert.ok(visuals.dressedCitizens>=15,
    'Worker 2 occupation outfits must be mounted on the actual NPC models');
  assert.ok(visuals.professions>=6,
    'The live society must include multiple recognizable professions');
  assert.ok(visuals.registeredStations>=2,
    'Worker 1 activity stations must reach Worker 2 through Worker 3');
  // Eight registered Old Town buildings plus the existing Mayor's Office
  // are the nine actual downtown structures; do not invent a tenth site.
  assert.ok(visuals.lightingActive&&visuals.districtBuildings>=9,
    'Worker 3 lighting and all nine downtown landmarks must be mounted');
  const pipState=await page.evaluate(()=>window.__cloverTest.npcState('pip'));
  assert.equal(pipState.occupation,'baker');
  assert.ok(typeof pipState.pose==='string');
  const gfx=await page.evaluate(()=>window.__cloverTest.graphics());
  assert.ok(['low','medium','high'].includes(gfx.quality));
  assert.ok(gfx.drawCalls>0&&gfx.triangles>0,
    'Graphics profiler must measure actual rendered triangles and draw calls');

  // Welcome -> property choice -> official deed.
  await page.locator('[data-action="welcome"]').click();
  await page.locator('[data-action="lot:0"]').click();
  assert.equal(await page.evaluate(() => window.__cloverTest.state().deed), 0);
  await page.locator('#modal-host [data-action="dismiss"]').click();

  // Move to a valid sidewalk point beside the chosen cottage.
  assert.equal(await page.evaluate(() => window.__cloverTest.townPosition(8, 39)), true);
  await page.locator('#toolbar [data-action="interact"]').click();
  await page.waitForFunction(() => window.__cloverTest.currentScene() === 'home');
  assert.equal(await page.evaluate(() => window.__cloverTest.roomFurnitureCount()), 4,
    'The dollhouse should render all four original placements');
  const hit = await page.evaluate(() => window.__cloverTest.testFloorHit());
  assert.ok(hit && Number.isFinite(hit.x) && Number.isFinite(hit.z),
    'Dollhouse floor must support raycast positioning');

  await page.locator('#modal-host [data-action="celebrate"]').click();
  assert.equal(await page.evaluate(() => window.__cloverTest.state().story.housewarming), true);

  // Place and rotate a chair using the same viewmodel and UI actions as players.
  await page.locator('#toolbar [data-action="decorate"]').click();
  await page.locator('#panel-host [data-action="place:chair"]').first().click();
  assert.equal(await page.evaluate(() => window.__cloverTest.previewAt(0, -0.5).valid), true);
  await page.locator('#decor-host [data-action="confirm"]').click();
  assert.equal(await page.evaluate(() =>
    window.__cloverTest.state().placements.some(p => p.id === 'item-1' && p.type === 'chair')), true);

  await page.locator('#panel-host [data-action="move:item-1"]').click();
  assert.equal(await page.evaluate(() => window.__cloverTest.previewAt(.5, -.5).valid), true);
  await page.locator('#decor-host [data-action="rotate"]').click();
  await page.locator('#decor-host [data-action="confirm"]').click();
  const beforeReload = await page.evaluate(() => window.__cloverTest.state());
  const moved = beforeReload.placements.find(p => p.id === 'item-1');
  assert.deepEqual({x:moved.x,z:moved.z,r:moved.r},{x:.5,z:-.5,r:1});

  // Fresh module load must recover the deed, home, gift, and furniture arrangement.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__cloverTest));
  const afterReload = await page.evaluate(() => window.__cloverTest.state());
  assert.equal(afterReload.deed, 0);
  assert.equal(afterReload.scene, 'home');
  assert.equal(afterReload.story.housewarming, true);
  assert.equal(afterReload.gifts['Clover Hollow Deed'], 1);
  assert.ok(afterReload.placements.some(p => p.id === 'item-1' &&
    p.x === .5 && p.z === -.5 && p.r === 1));
  assert.equal(await page.evaluate(() => window.__cloverTest.roomFurnitureCount()), 5);
  await page.locator('#toolbar [data-action="leave"]').click();
  assert.equal(await page.evaluate(() => window.__cloverTest.state().scene), 'town');

  await mkdir(resolve(root,'test-results'),{recursive:true});
  // Validate the actual merged downtown and entertainment factory output.
  const districtInfo=await page.evaluate(()=>window.__cloverTest.districts());
  assert.ok(districtInfo.downtown>=12,'downtown service interactables must be mounted');
  assert.ok(districtInfo.entertainment>=5,'entertainment venue interactions must be mounted');
  assert.ok(districtInfo.sites.length>=14,'downtown, venues, festival green and gardens must all be registered');

  // Post Office: the first registered service is receiving mail. A real
  // UI click must award a one-time keepsake through the existing save model.
  assert.equal(await page.evaluate(()=>window.__cloverTest.townPosition(-60,-83)),true);
  await page.locator('#toolbar [data-action="interact"]').click();
  await page.locator('#modal-host [data-action="district-item:0"]').click();
  assert.equal(await page.evaluate(()=>
    window.__cloverTest.state().gifts['Mabel’s Friendly Letter']),1);
  await page.locator('#modal-host [data-action="dismiss"]').click();

  // The newly registered Town Hall is a different destination from the mayor,
  // and its public calendar should be a real interactive menu.
  assert.equal(await page.evaluate(()=>window.__cloverTest.townPosition(-2,-94.5)),true);
  await page.locator('#toolbar [data-action="interact"]').click();
  await page.locator('#modal-host [data-action="district-item:0"]').click();
  assert.match(await page.locator('#modal-host').innerText(),/Moonbeam Matinee/);
  await page.locator('#modal-host [data-action="dismiss"]').click();
  await page.screenshot({path:resolve(root,'test-results/downtown-desktop.png')}).catch(()=>{});

  // Lantern Quarter: play the actual model-driven theatre game through its
  // mobile-friendly choice buttons, claim reward, then replay another venue.
  assert.equal(await page.evaluate(()=>window.__cloverTest.townPosition(21,-83.5)),true);
  await page.locator('#toolbar [data-action="interact"]').click();
  await page.locator('#modal-host [data-action="district-item:0"]').click();
  for(let round=0;round<3;round++){
    const prompt=await page.evaluate(()=>window.__cloverTest.festivalPrompt());
    assert.ok(prompt,'theatre activity must expose an active round');
    await page.locator('#modal-host [data-action="activity-choice:'+prompt.target+'"]').click();
  }
  assert.equal(await page.evaluate(()=>
    window.__cloverTest.state().gifts['Moonbeam playbill']),1);
  await page.locator('#modal-host [data-action="dismiss"]').click();

  assert.equal(await page.evaluate(()=>window.__cloverTest.townPosition(40,-83.5)),true);
  await page.locator('#toolbar [data-action="interact"]').click();
  await page.locator('#modal-host [data-action="district-item:0"]').click();
  assert.equal(await page.evaluate(()=>window.__cloverTest.moonringState().active),true,
    'the arcade must open a playable Three.js booth instead of a modal quiz');
  for(let round=0;round<5;round++){
    const state=await page.evaluate(()=>window.__cloverTest.moonringState());
    assert.equal(state.mode,'aiming','ring must be aimed in the real 3D world');
    const targetAim=[-.8,0,.8][state.target];
    const button=targetAim<0?'toss-left':'toss-right';
    for(let click=0;click<Math.round(Math.abs(targetAim)/.2);click++)
      await page.locator('#world-game [data-action="'+button+'"]').click();
    await page.locator('#world-game [data-action="toss-throw"]').click();
    assert.equal(await page.evaluate(()=>window.__cloverTest.moonringState().mode),'flying',
      'pressing THROW must launch the ring into the world');
    await page.waitForFunction(r=>window.__cloverTest.moonringState().round>r,round,{timeout:30000});
  }
  assert.equal(await page.evaluate(()=>
    window.__cloverTest.state().gifts['Moonring ribbon']),1);
  assert.equal(await page.evaluate(()=>window.__cloverTest.moonringState().mode),'finished');
  await page.screenshot({path:resolve(root,'test-results/lantern-quarter-desktop.png')}).catch(()=>{});

  // Public festival and garden are genuine walk-through destinations. They
  // must remain interactable without adding solid building collisions.
  assert.equal(await page.evaluate(()=>window.__cloverTest.townPosition(31,-96)),true);
  await page.waitForTimeout(250);
  await page.screenshot({path:resolve(root,'test-results/festival-green-desktop.png')}).catch(()=>{});
  await page.locator('#toolbar [data-action="interact"]').click();
  assert.match(await page.locator('#modal-host').innerText(),/Lantern Festival Green/);
  await page.locator('#modal-host [data-action="district-item:0"]').click();
  assert.equal(await page.evaluate(()=>window.__cloverTest.moonringState().mode),'aiming');
  await page.locator('#world-game [data-action="toss-exit"]').click();
  assert.equal(await page.evaluate(()=>window.__cloverTest.moonringState().mode),'idle');

  assert.equal(await page.evaluate(()=>window.__cloverTest.townPosition(20,-131)),true);
  await page.locator('#toolbar [data-action="interact"]').click();
  assert.match(await page.locator('#modal-host').innerText(),/Starlight Gardens/);
  await page.locator('#modal-host [data-action="district-item:0"]').click();
  assert.match(await page.locator('#modal-host').innerText(),/Fireflies drift/);
  await page.locator('#modal-host [data-action="dismiss"]').click();

    // Physical town adventure: start the cart, catch actual animated apples,
  // carry them back one by one, and verify lasting changes to the saved world.
  assert.equal(await page.evaluate(()=>window.__cloverTest.townPosition(12,17)),true);
  await page.locator('#toolbar [data-action="interact"]').click();
  assert.equal(await page.evaluate(()=>window.__cloverTest.marketState().phase),'started');
  await page.waitForFunction(()=>window.__cloverTest.marketState().elapsed>=.85,{timeout:15000});
  for(const [x,z] of [[16,18],[14,23],[10,26]]){
    assert.equal(await page.evaluate(([px,pz])=>window.__cloverTest.townPosition(px,pz),[x,z]),true);
    await page.locator('#toolbar [data-action="interact"]').click();
    assert.ok(Number.isInteger(await page.evaluate(()=>window.__cloverTest.marketState().carrying)),
      'the three-dimensional apple must be carried by the player');
    assert.equal(await page.evaluate(()=>window.__cloverTest.townPosition(6,17)),true);
    await page.locator('#toolbar [data-action="interact"]').click();
    assert.equal(await page.evaluate(()=>window.__cloverTest.marketState().carrying),null);
  }
  assert.equal(await page.evaluate(()=>window.__cloverTest.marketState().phase),'completed');
  assert.equal(await page.evaluate(()=>window.__cloverTest.state().gifts['Apple Cart Rescue Ribbon']),1);
  assert.equal(await page.evaluate(()=>window.__cloverTest.townPosition(49,17)),true);
  await page.locator('#toolbar [data-action="interact"]').click();
  assert.equal(await page.evaluate(()=>window.__cloverTest.state().gifts['The Creekside Four-Leaf Clover']),1);
  await page.screenshot({path:resolve(root,'test-results/market-game-desktop.png')});

  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.__cloverTest));
  assert.equal(await page.evaluate(()=>window.__cloverTest.marketState().phase),'completed',
    'a completed rescue survives reloads without changing the save schema');
  assert.equal(await page.evaluate(()=>window.__cloverTest.marketState().found),true,
    'the creek discovery must not reappear after being collected');
  assert.equal(await page.evaluate(()=>
    window.__cloverTest.state().gifts['Mabel’s Friendly Letter']),1);
  assert.equal(await page.evaluate(()=>
    window.__cloverTest.state().gifts['Moonbeam playbill']),1);
  assert.equal(await page.evaluate(()=>
    window.__cloverTest.state().gifts['Moonring ribbon']),1);

  // Real pointer gestures must move the camera, not accidentally open dialogue.
  const cameraBefore=await page.evaluate(()=>window.__cloverTest.camera());
  await page.mouse.move(520,470);
  await page.mouse.down();
  await page.mouse.move(650,490,{steps:8});
  await page.mouse.up();
  const cameraDragged=await page.evaluate(()=>window.__cloverTest.camera());
  assert.ok(Math.abs(cameraDragged.yaw-cameraBefore.yaw)>.20,'mouse camera orbit should move freely outdoors');
  await page.mouse.wheel(0,-250);
  const cameraZoomed=await page.evaluate(()=>window.__cloverTest.camera());
  assert.ok(cameraZoomed.zoom<cameraDragged.zoom,'wheel should zoom into the town');

  // Release the desktop WebGL context before opening a second software-rendered
  // Three.js scene. Two simultaneous large towns can exhaust SwiftShader memory.
  await page.screenshot({path:resolve(root,'test-results/town-desktop.png')});
  await page.close();
  page=null;

  // Exercise the actual touch events on a portrait-sized screen.
  // DPR 1 preserves touch/mobile layout while keeping headless software GL viable.
  const mobileContext=await browser.newContext({
    viewport:{width:390,height:844},
    deviceScaleFactor:1,isMobile:true,hasTouch:true
  });
  const mobile=await mobileContext.newPage();
  mobile.on('pageerror',error=>errors.push('mobile: '+error.message));
  await mobile.goto(url,{waitUntil:'domcontentloaded'});
  await mobile.waitForFunction(()=>Boolean(window.__cloverTest),{timeout:60000});
  await mobile.locator('[data-action="welcome"]').click();
  await mobile.locator('[data-action="lot:0"]').click();
  await mobile.locator('#modal-host [data-action="dismiss"]').click();
  assert.match((await mobile.evaluate(()=>window.__cloverTest.marketPrompt()))?.title??'',/delivery/i,
    'the nearby adventure should be discoverable without a quest screen');
  const zone=mobile.locator('#move-zone');
  assert.equal(await zone.isVisible(),true,'portrait touch movement zone must be visible');
  const rect=await zone.boundingBox();
  assert.ok(rect&&rect.width>=120&&rect.height>=100,'floating joystick must fit a thumb');
  const beforeTouch=await mobile.evaluate(()=>window.__cloverTest.playerPosition());
  const origin={x:rect.x+rect.width*.42,y:rect.y+rect.height*.5};
  const cdp=await mobileContext.newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent',{
    type:'touchStart',
    touchPoints:[{x:origin.x,y:origin.y,id:7}]
  });
  await cdp.send('Input.dispatchTouchEvent',{
    type:'touchMove',
    touchPoints:[{x:origin.x+36,y:origin.y,id:7}]
  });
  await mobile.waitForTimeout(650);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const afterTouch=await mobile.evaluate(()=>window.__cloverTest.playerPosition());
  assert.ok(Math.hypot(afterTouch.x-beforeTouch.x,afterTouch.z-beforeTouch.z)>.25,
    'touch joystick should move the player in the actual Three.js town');
  await mkdir(resolve(root,'test-results'),{recursive:true});
  assert.equal(await mobile.evaluate(()=>window.__cloverTest.townPosition(12,17)),true);
  await mobile.waitForTimeout(250);
  assert.equal(await mobile.locator('#world-prompt').isVisible(),true,
    'mobile gameplay must expose an in-world proximity prompt');
  await mobile.locator('.interact-touch').click();
  assert.equal(await mobile.evaluate(()=>window.__cloverTest.marketState().phase),'started');
  await mobile.screenshot({path:resolve(root,'test-results/market-game-phone.png')});
  const phoneSite=await mobile.evaluate(()=>window.__cloverTest.townPosition(-39,-94));
  assert.equal(phoneSite,true,'phone should navigate to the Old Town pedestrian lane');
  await mobile.waitForTimeout(350);
  await mobile.screenshot({path:resolve(root,'test-results/downtown-phone-portrait.png')});
  assert.equal(await mobile.evaluate(()=>window.__cloverTest.townPosition(31,-102)),true);
  await mobile.waitForTimeout(350);
  await mobile.screenshot({path:resolve(root,'test-results/lantern-quarter-phone-portrait.png')});
  await mobile.screenshot({path:resolve(root,'test-results/town-phone-portrait.png')});
  await mobileContext.close();
  assert.deepEqual(errors, [], 'No uncaught errors while playing');
  console.log('PASS: town, deed, decorating, post office, Town Hall, theatre, arcade, persistent keepsakes, camera gestures and mobile joystick.');
} catch (error) {
  await mkdir(resolve(root, 'test-results'), { recursive: true });
  if (page) await page.screenshot({ path: resolve(root,'test-results/browser-failure.png'), fullPage: true }).catch(() => {});
  console.error('Browser smoke failure:', error);
  console.error('Uncaught page errors:', errors);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await new Promise(resolveDone => server.close(resolveDone));
}
