// Functional checks after the visual upgrade: stairs, collisions, hotspots, drawing-check modal, reference render,
// kitchen colour options, draw calls, plus straight-down orthographic renders of both floors for the drawing overlay.
// usage (from a folder with three@0.169.0 in node_modules; site served on :8765):  node verify.js <outDir>
const { chromium } = require('playwright');
const path = require('path');
const [OUT] = process.argv.slice(2);
const THREE_DIR = path.join(process.cwd(), 'node_modules/three');
const ok = (name, cond, extra='') => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const mk = async (w, h) => { const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })).newPage(); p.setDefaultTimeout(900000);
    await p.route('https://cdn.jsdelivr.net/npm/three@0.169.0/**', r => r.fulfill({ path: path.join(THREE_DIR, r.request().url().split('three@0.169.0/')[1]), contentType: 'application/javascript' }));
    await p.route(/assets\/(fly-|pano-)/, r => r.fulfill({ status: 404, body: '' })); return p; };
  const page = await mk(1344, 768);
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (['error', 'warning'].includes(m.type()) && !/404|Failed to load/.test(m.text())) errs.push(m.text()); });
  await page.goto('http://127.0.0.1:8765/index.html');
  await page.waitForFunction(() => window.__app && __app.mode === 'doll');
  await page.waitForFunction(() => __app.bake.done);
  await page.evaluate(() => __app.setQuality('fast', true));
  ok('hotspots', await page.evaluate(() => document.querySelectorAll('#hot .hs').length) === 9);
  ok('doll draw calls', true, JSON.stringify(await page.evaluate(() => { __app.renderOnce(); return __app.info(); })));
  // drawing check modal
  await page.evaluate(() => document.querySelector('#btnPlan').click()); await page.waitForTimeout(800);
  ok('drawing check modal', await page.evaluate(() => document.querySelector('#plan2d').classList.contains('show') && document.querySelectorAll('#planSvg rect').length >= 15 && document.querySelector('#planImg').complete));
  await page.evaluate(() => document.querySelector('#btnPlanClose').click());
  // walk: kitchen, reference render, kitchen colour options
  await page.evaluate(() => __app.enterRoom(__app.PLAN.rooms.find(r => r.id === 'kitchen')));
  await page.waitForFunction(() => __app.mode === 'walk' && !__app.cine.open);
  ok('reference render thumbnail', await page.evaluate(() => getComputedStyle(document.querySelector('#ref')).display !== 'none' && /ref-kitchen/.test(document.querySelector('#ref img').src)));
  const shot = async () => { await page.evaluate(() => __app.renderOnce()); return page.screenshot({ clip: { x: 760, y: 560, width: 300, height: 120 } }); };
  const px = async () => { const buf = await shot(); return buf.length; };
  const a = await shot();
  await page.evaluate(() => document.querySelector('#kitSeg button[data-c="charcoal"]').click()); const c = await shot();
  await page.evaluate(() => document.querySelector('#kitSeg button[data-c="sage"]').click());
  ok('kitchen colour option changes the cabinets', Buffer.compare(a, c) !== 0);
  ok('walk draw calls (kitchen)', true, JSON.stringify(await page.evaluate(() => { __app.renderOnce(); return __app.info(); })));
  // collisions: walk into the kitchen run, must stop short of it
  await page.evaluate(() => { __app.teleport(5.2, 7.0, 0, -Math.PI / 2); __app.walk('KeyW', true); });
  const hit = await page.evaluate(() => __app.sim(3)); await page.evaluate(() => __app.walk('KeyW', false));
  ok('collision with kitchen units', hit.x < 5.9 - 0.2 + 0.01, JSON.stringify(hit));
  // stairs up and down
  await page.evaluate(() => { __app.teleport(0.86, 7.75, 0, 0); __app.walk('KeyW', true); });
  const up = await page.evaluate(() => __app.sim(5)); await page.evaluate(() => __app.walk('KeyW', false));
  ok('stairs up to the first floor', up.l === 1 && Math.abs(up.y - 2.75) < 0.05, JSON.stringify(up));
  await page.evaluate(() => { __app.teleport(0.86, 3.9, 1, Math.PI); __app.walk('KeyW', true); });
  const down = await page.evaluate(() => __app.sim(5)); await page.evaluate(() => __app.walk('KeyW', false));
  ok('stairs down to the ground floor', down.l === 0 && Math.abs(down.y) < 0.05, JSON.stringify(down));
  ok('no console errors', errs.length === 0, JSON.stringify(errs.slice(0, 5)));
  // orthographic top-down renders (6.80 x 9.00 m) for the drawing overlay
  for (const L of [0, 1]){
    const p2 = await mk(680, 900); await p2.goto('http://127.0.0.1:8765/index.html');
    await p2.waitForFunction(() => window.__app && __app.mode === 'doll'); await p2.waitForFunction(() => __app.bake.done);
    await p2.evaluate(() => __app.setQuality('fast', true)); await p2.addStyleTag({ content:'body > *:not(canvas){display:none!important}' }); await p2.evaluate(L => __app.ortho(L), L); await p2.waitForTimeout(500);
    await p2.screenshot({ path: `${OUT}/ortho-${L}.png` }); await p2.context().close();
  }
  console.log('snaps', JSON.stringify(await page.evaluate(() => __app.snaps)));
  await b.close();
})();
