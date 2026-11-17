// End-to-end test of photoreal mode: dollhouse -> fly-in video -> 360 pano (drag) -> Walk around -> Photoreal 360 button -> Plan.
// usage (from a folder with three@0.169.0 in node_modules; site served on :8765):
//   node cine.js <outDir> <width> <height> <tag> [roomId]
const { chromium } = require('playwright');
const path = require('path');
const [OUT, W, H, TAG = 'desk', ROOM = 'kitchen'] = process.argv.slice(2);
const THREE_DIR = path.join(process.cwd(), 'node_modules/three');
const log = (...a) => console.log(TAG, ROOM, ...a);
(async () => {
  const phone = TAG === 'phone';
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: +W || 1344, height: +H || 768 }, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone });
  const page = await ctx.newPage(); page.setDefaultTimeout(400000);
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.route('https://cdn.jsdelivr.net/npm/three@0.169.0/**', r => r.fulfill({ path: path.join(THREE_DIR, r.request().url().split('three@0.169.0/')[1]), contentType: 'application/javascript' }));
  await page.goto('http://127.0.0.1:8765/index.html');
  await page.waitForFunction(() => window.__app && __app.mode === 'doll');
  const L = await page.evaluate(id => __app.PLAN.rooms.find(r => r.id === id).L, ROOM);
  if (L) { await page.evaluate(() => __app.setFloor(1)); await page.waitForFunction(() => __app.mode === 'doll'); }
  await page.evaluate(id => __app.enterRoom(__app.PLAN.rooms.find(r => r.id === id)), ROOM);
  await page.waitForTimeout(300);
  log('video', JSON.stringify(await page.evaluate(() => ({ cine: __app.cine, v: (v => ({ err: v.error && v.error.code, src: v.currentSrc.split('/').pop(), rate: v.playbackRate }))(document.querySelector('#cineVid')) }))));
  await page.screenshot({ path: `${OUT}/${TAG}-${ROOM}-1-video.png` });
  await page.waitForFunction(() => __app.pano !== null && !__app.cine.open);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/${TAG}-${ROOM}-2-pano.png` });
  const v0 = await page.evaluate(() => __app.view);
  // drag to look around (mouse or touch both arrive as pointer events)
  await page.mouse.move(600, 400); await page.mouse.down(); await page.mouse.move(300, 360, { steps: 6 }); await page.mouse.up();
  await page.waitForTimeout(3000);
  const v1 = await page.evaluate(() => __app.view);
  log('drag yaw', v0.yaw.toFixed(3), '->', v1.yaw.toFixed(3), 'pitch', v1.pitch.toFixed(3));
  await page.screenshot({ path: `${OUT}/${TAG}-${ROOM}-3-pano-dragged.png` });
  await page.click('#panoWalk');
  await page.waitForFunction(() => __app.mode === 'walk'); await page.waitForTimeout(3000);
  const v2 = await page.evaluate(() => __app.view);
  log('walk keeps heading', Math.abs(v2.yaw - v1.yaw) < 1e-6, 'mode', await page.evaluate(() => __app.mode));
  await page.screenshot({ path: `${OUT}/${TAG}-${ROOM}-4-walk.png` });
  const btn = await page.evaluate(() => getComputedStyle(document.querySelector('#btnPano')).display);
  log('photoreal button', btn);
  await page.click('#btnPano'); await page.waitForFunction(() => __app.pano !== null); await page.waitForTimeout(2000);
  log('back in pano', await page.evaluate(() => __app.pano));
  await page.click('#panoBack'); await page.waitForFunction(() => __app.mode === 'doll');
  log('back to plan ok');
  if (!L) {   // cabinet gate: kitchen/dining/living photoreal only with sage
    await page.evaluate(() => document.querySelector('#kitSeg button[data-c="charcoal"]').click());
    await page.evaluate(id => __app.enterRoom(__app.PLAN.rooms.find(r => r.id === id)), ROOM);
    await page.waitForTimeout(300);
    log('charcoal -> cine', JSON.stringify(await page.evaluate(() => __app.cine)));
  }
  log('errors', JSON.stringify(errs));
  await b.close();
})();
