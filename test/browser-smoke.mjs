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
  assert.deepEqual(errors, [], 'No uncaught errors while playing');
  console.log('PASS: town rendering, deed, home entry, furniture placement/movement/rotation, housewarming, persisted reload, and exit.');
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
