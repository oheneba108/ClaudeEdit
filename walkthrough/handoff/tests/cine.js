// Test the photoreal fly-in overlay: enter Kitchen from the dollhouse, video -> still -> Walk around -> 3D
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const OUT = process.argv[2], VW = +process.argv[3] || 1344, VH = +process.argv[4] || 768, TAG = process.argv[5] || 'desk';
const THREE_DIR = path.join(__dirname, 'node_modules/three');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1, hasTouch: TAG === 'phone', isMobile: TAG === 'phone' });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.route('https://cdn.jsdelivr.net/npm/three@0.169.0/**', r => {
    const rel = r.request().url().split('three@0.169.0/')[1];
    r.fulfill({ path: path.join(THREE_DIR, rel), contentType: 'application/javascript' });
  });
  await page.goto('http://127.0.0.1:8765/index.html');
  await page.waitForFunction(() => window.__app && __app.mode === 'doll', null, { timeout: 120000 });
  await page.evaluate(() => __app.enterRoom(__app.PLAN.rooms.find(r => r.id === 'kitchen')));
  await page.waitForTimeout(500);
  const s0 = await page.evaluate(() => ({ cine: __app.cine, vid: (v => ({ err: v.error && v.error.code, rs: v.readyState, t: v.currentTime, rate: v.playbackRate }))(document.querySelector('#cineVid')) }));
  console.log('t+0.5s', JSON.stringify(s0));
  await page.screenshot({ path: `${OUT}/${TAG}-1-video.png` });
  await page.waitForFunction(() => __app.cine.still, null, { timeout: 30000 });
  await page.waitForFunction(() => __app.mode === 'walk', null, { timeout: 60000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${TAG}-2-still.png` });
  await page.click('#cineWalk');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${TAG}-3-walk.png` });
  console.log('after walk', JSON.stringify(await page.evaluate(() => ({ mode: __app.mode, cine: __app.cine, cineDisplay: getComputedStyle(document.querySelector('#cine')).display }))));
  // Back to plan path, and charcoal option should skip the overlay
  await page.evaluate(() => __app.toDollhouse());
  await page.waitForFunction(() => __app.mode === 'doll', null, { timeout: 60000 });
  await page.evaluate(() => document.querySelector('#kitSeg button[data-c="charcoal"]').click());
  await page.evaluate(() => __app.enterRoom(__app.PLAN.rooms.find(r => r.id === 'kitchen')));
  await page.waitForTimeout(400);
  console.log('charcoal -> cine', JSON.stringify(await page.evaluate(() => __app.cine)));
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
