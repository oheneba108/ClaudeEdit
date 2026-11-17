// Authoring + validation for photoreal panoramas.
//   node pano3d.js shoot <outDir> [roomIds...]   -> <outDir>/pano3d-<id>.png (cylindrical 360, 4032x1728) + doll-g.png / doll-f.png
//   node pano3d.js check <outDir> <id> <panoPath> -> pano viewer vs live 3D at several headings (registration check)
//   node pano3d.js endframe <outDir> <id> <panoPath> -> <outDir>/end-<id>.png: the pano's start view at FOV 60, 1344x768 (video last frame)
// Needs: a static server on :8765 serving site/, and three@0.169.0 in ./node_modules (run from a folder that has it).
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const [cmd, OUT, ...rest] = process.argv.slice(2);
const THREE_DIR = path.join(process.cwd(), 'node_modules/three');
const HIDE = '#top,#floors,#panel,#hot,#hint,#walkui,#joy,#panoUi,#btnPano,#cine,#snap{display:none!important}';
async function open(w = 1344, h = 768) {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })).newPage();
  page.setDefaultTimeout(180000); page.on('pageerror', e => console.log('PAGEERROR', String(e)));
  await page.route('https://cdn.jsdelivr.net/npm/three@0.169.0/**', r => r.fulfill({ path: path.join(THREE_DIR, r.request().url().split('three@0.169.0/')[1]), contentType: 'application/javascript' }));
  await page.goto('http://127.0.0.1:8765/index.html');
  await page.waitForFunction(() => window.__app && __app.mode === 'doll', null, { timeout: 180000 });
  return { b, page };
}
const save = (f, dataUrl) => fs.writeFileSync(f, Buffer.from(dataUrl.split(',')[1], 'base64'));
const enter = async (page, id) => { await page.evaluate(id => __app.enterRoom(__app.PLAN.rooms.find(r => r.id === id)), id); await page.waitForFunction(() => __app.mode === 'walk', null, { timeout: 400000 }); await page.waitForTimeout(300); };
(async () => {
  if (cmd === 'shoot') {
    const { b, page } = await open();
    await page.addStyleTag({ content: HIDE });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/doll-g.png` });
    await page.evaluate(() => __app.setFloor(1)); await page.waitForFunction(() => __app.mode === 'doll', null, { timeout: 400000 }); await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/doll-f.png` });
    await page.evaluate(() => __app.setFloor(0)); await page.waitForFunction(() => __app.mode === 'doll', null, { timeout: 400000 }); await page.waitForTimeout(1500);
    const ids = rest.length ? rest : await page.evaluate(() => __app.PLAN.rooms.map(r => r.id));
    for (const id of ids) {
      const t0 = Date.now(); await enter(page, id);
      save(`${OUT}/pano3d-${id}.png`, await page.evaluate(id => __app.panoShot(id, 4032), id));
      console.log('shot', id, ((Date.now() - t0) / 1000).toFixed(1) + 's');
    }
    await b.close();
  } else if (cmd === 'check' || cmd === 'endframe') {
    const [id, panoPath] = rest;
    const { b, page } = await open();
    await page.addStyleTag({ content: HIDE });
    await enter(page, id);
    const url = 'data:image/' + (panoPath.endsWith('.png') ? 'png' : 'jpeg') + ';base64,' + fs.readFileSync(panoPath).toString('base64');
    await page.evaluate(([id, u]) => __app.panoNow(id, u), [id, url]);
    await page.waitForTimeout(600);
    if (cmd === 'endframe') { await page.screenshot({ path: `${OUT}/end-${id}.png` }); await b.close(); return; }
    const start = await page.evaluate(() => __app.view);
    const views = [[0, start.pitch], [1.2, 0.15], [-1.9, -0.2], [3.1, 0]];
    for (const [k, [dy, p]] of views.entries()) {
      await page.evaluate(v => { __app.view = v; }, { yaw: start.yaw + dy, pitch: p });
      await page.waitForTimeout(4000); await page.screenshot({ path: `${OUT}/chk-${id}-${k}-pano.png` });
    }
    await page.evaluate(() => __app.leavePano()); await page.waitForFunction(() => __app.mode === 'walk'); await page.waitForTimeout(900);
    for (const [k, [dy, p]] of views.entries()) {
      await page.evaluate(v => { __app.view = v; }, { yaw: start.yaw + dy, pitch: p });
      await page.waitForTimeout(4000); await page.screenshot({ path: `${OUT}/chk-${id}-${k}-3d.png` });
    }
    await b.close();
  }
})();
