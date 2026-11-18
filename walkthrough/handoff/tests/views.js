// Before/after screenshots from fixed cameras: kitchen, living, primary bedroom (room eye -> look) and an exterior three-quarter view.
// usage (from a folder with three@0.169.0 in node_modules; site served on :8765):  node views.js <outDir> <tag> [hd]
// Fly-in videos and panoramas are blocked (404) so the page stays in the live 3D view.
const { chromium } = require('playwright');
const path = require('path');
const [OUT, TAG = 'after', Q = 'hd', ONLY = ''] = process.argv.slice(2);
const THREE_DIR = path.join(process.cwd(), 'node_modules/three');
const HIDE = '#top,#floors,#panel,#hot,#hint,#walkui,#joy,#panoUi,#btnPano,#cine,#snap,#ref,#toast,#hdBtn,#mini,#tourbar{display:none!important}';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await (await b.newContext({ viewport: { width: 1344, height: 768 }, deviceScaleFactor: 1 })).newPage();
  page.setDefaultTimeout(900000);
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  await page.route('https://cdn.jsdelivr.net/npm/three@0.169.0/**', r => r.fulfill({ path: path.join(THREE_DIR, r.request().url().split('three@0.169.0/')[1]), contentType: 'application/javascript' }));
  await page.route(/assets\/(fly-|pano-)/, r => r.fulfill({ status: 404, body: '' }));
  const t0 = Date.now();
  await page.goto('http://127.0.0.1:8765/' + (process.env.PAGE || 'index.html'));
  await page.waitForFunction(() => window.__app && __app.mode === 'doll');
  console.log(TAG, 'loaded', ((Date.now() - t0) / 1000).toFixed(0) + 's');
  await page.evaluate(q => { if (__app.setQuality) __app.setQuality(q, true); }, Q);       // new page only: lock quality (no fps watchdog)
  await page.waitForFunction(() => !__app.bake || __app.bake.done, null, { timeout: 900000 });   // new page only: wait for the AO bake
  await page.addStyleTag({ content: HIDE });
  const settle = async () => { await page.waitForTimeout(2500); if (await page.evaluate(() => !!__app.renderOnce)) await page.evaluate(() => __app.renderOnce()); };
  await settle(); await page.screenshot({ path: `${OUT}/${TAG}-doll.png` });
  for (const id of (ONLY === 'ext' ? ['kitchen'] : ['kitchen', 'living', 'primary'])) {
    await page.evaluate(id => __app.enterRoom(__app.PLAN.rooms.find(r => r.id === id)), id);
    await page.waitForFunction(() => __app.mode === 'walk' && !__app.cine.open);
    await settle(); await page.waitForTimeout(3000);
    await page.screenshot({ path: `${OUT}/${TAG}-${id}.png` }); console.log(TAG, id);
  }
  // exterior three-quarter, from the lawn at eye height looking at the rear corner (walk camera teleported outside the house)
  await page.evaluate(() => { __app.teleport(6.6, -6.5, 0, 2.601); });
  await settle(); await page.waitForTimeout(4000);
  await page.screenshot({ path: `${OUT}/${TAG}-exterior.png` }); console.log(TAG, 'exterior');
  console.log(TAG, 'errors', JSON.stringify(errs.filter(e => !/404|Failed to load resource/.test(e))));
  await b.close();
})();
