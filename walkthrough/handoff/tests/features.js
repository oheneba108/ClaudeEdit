// Checks for the minimap, guided tour, HD toggle and the "Change something" panel (with mocked Claude replies, since the
// sample capability only exists inside the Claude app / claude.ai). Writes screenshots to <outDir>.
// usage (from a folder with three@0.169.0 in node_modules; site served on :8765):  node features.js <outDir> [part]
// parts: rooms | tour | hd | change | phone   (default: all)
const { chromium } = require('playwright');
const path = require('path');
const [OUT, PART = 'all'] = process.argv.slice(2);
const THREE_DIR = path.join(process.cwd(), 'node_modules/three');
const ok = (name, cond, extra = '') => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
const want = p => PART === 'all' || PART === p;

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const open = async (w, h, opts = {}) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: opts.dpr || 1, hasTouch: !!opts.touch, isMobile: !!opts.touch });
    const p = await ctx.newPage(); p.setDefaultTimeout(900000);
    await p.route('https://cdn.jsdelivr.net/npm/three@0.169.0/**', r => r.fulfill({ path: path.join(THREE_DIR, r.request().url().split('three@0.169.0/')[1]), contentType: 'application/javascript' }));
    await p.route(/assets\/(fly-|pano-)/, r => r.fulfill({ status: 404, body: '' }));
    p.errs = []; p.on('pageerror', e => p.errs.push(String(e))); p.on('console', m => { if (['error', 'warning'].includes(m.type()) && !/404|Failed to load/.test(m.text())) p.errs.push(m.type() + ': ' + m.text()); });
    await p.goto('http://127.0.0.1:8765/index.html');
    await p.waitForFunction(() => window.__app && __app.mode === 'doll');
    await p.waitForFunction(() => __app.bake.done);
    if (!opts.keepQuality) await p.evaluate(() => __app.setQuality('fast', true));
    return p;
  };
  const frames = (p, n = 3) => p.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const shot = async (p, file, clip) => { await p.evaluate(() => __app.renderOnce()); await frames(p, 2); await p.screenshot({ path: `${OUT}/${file}`, ...(clip ? { clip } : {}) }); };
  const enter = async (p, id) => { await p.evaluate(id => __app.enterRoom(__app.PLAN.rooms.find(r => r.id === id), { noCine: true }), id); await p.waitForFunction(() => __app.mode === 'walk' && !__app.cine.open); await frames(p, 2); };

  // ---------------- minimap: every room on both floors, outside, stairs; enlarged view
  if (want('rooms')) {
    const p = await open(1280, 800);
    await enter(p, 'hall');
    const rooms = await p.evaluate(() => __app.PLAN.rooms.map(r => ({ id: r.id, L: r.L, name: r.name, eye: [(r.rect[0] + r.rect[2]) / 2, (r.rect[1] + r.rect[3]) / 2] })));   // the centre of each room's main rectangle (some preset viewpoints look in from a doorway)
    for (const r of rooms) {
      await p.evaluate(r => { __app.teleport(r.eye[0], r.eye[1], r.L, 0); __app.sim(0.05); }, r);
      await frames(p, 2);
      const mm = await p.evaluate(() => ({ ...__app.mm, room: __app.room }));
      ok(`minimap in ${r.id}`, mm.room === r.id && mm.L === r.L && mm.name === r.name && /m² · 2.50 m ceiling/.test(mm.size), JSON.stringify(mm));
    }
    await p.evaluate(() => { __app.teleport(3.0, -1.6, 0, 0); __app.sim(0.05); }); await frames(p, 2);
    let mm = await p.evaluate(() => ({ ...__app.mm, room: __app.room }));
    ok('minimap outside on the terrace', mm.room === 'outside' && mm.name === 'Outside' && mm.size === 'Terrace', JSON.stringify(mm));
    await p.evaluate(() => { __app.teleport(3.0, -6, 0, 0); __app.sim(0.05); }); await frames(p, 2);
    mm = await p.evaluate(() => __app.mm); ok('minimap outside in the garden', mm.size === 'Garden', JSON.stringify(mm));
    // through the open half of the slider, from the living room out to the terrace
    await p.evaluate(() => { __app.teleport(5.2, 1.0, 0, 0); __app.walk('KeyW', true); });
    const out = await p.evaluate(() => __app.sim(2.5)); await p.evaluate(() => __app.walk('KeyW', false));
    ok('walk out through the open slider', out.z < -0.3, JSON.stringify(out));
    await p.evaluate(() => { __app.teleport(3.2, 1.0, 0, 0); __app.walk('KeyW', true); });
    const blocked = await p.evaluate(() => __app.sim(2.5)); await p.evaluate(() => __app.walk('KeyW', false));
    ok('closed half of the slider stops you', blocked.z > 0.28, JSON.stringify(blocked));
    // stairs: minimap follows the floor you're standing on
    await p.evaluate(() => { __app.teleport(0.86, 7.75, 0, 0); __app.walk('KeyW', true); });
    await p.evaluate(() => __app.sim(5)); await p.evaluate(() => __app.walk('KeyW', false)); await frames(p, 2);
    mm = await p.evaluate(() => ({ ...__app.mm, P: __app.P }));
    ok('minimap switches to the first floor after the stairs', mm.L === 1 && mm.P.level === 1 && mm.name === 'Landing', JSON.stringify(mm));
    // dot tracks the camera: the canvas pixel under the predicted dot position is orange
    await p.evaluate(() => { __app.teleport(4.6, 1.9, 1, 0.3); __app.sim(0.05); }); await frames(p, 3);
    const dot = await p.evaluate(() => { const c = document.querySelector('#mCanvas'), r = c.getBoundingClientRect(), s = __app.mm.h / 12.55;
      const x = (4.6 + 0.45) * s, y = (1.9 + 3.1) * s, k = c.width / r.width, d = c.getContext('2d').getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data; return [...d]; });
    ok('minimap dot at the camera position', dot[0] > 200 && dot[1] > 100 && dot[1] < 160 && dot[2] < 110, JSON.stringify(dot));
    await shot(p, 'mm-small.png');
    await p.evaluate(() => __app.mmToggleBig()); await frames(p, 2);
    await shot(p, 'mm-enlarged.png');
    await p.evaluate(() => { __app.teleport(4.2, 4.3, 0, 2.3); __app.sim(0.05); }); await frames(p, 3);
    await shot(p, 'mm-enlarged-ground.png');
    await p.evaluate(() => __app.mmToggleBig());
    // click on the minimap: walk to the kitchen
    const box = await p.evaluate(() => { const r = document.querySelector('#mCanvas').getBoundingClientRect(); return { x: r.left, y: r.top, s: __app.mm.h / 12.55 }; });
    await p.mouse.move(box.x + (4.7 + 0.45) * box.s, box.y + (7.0 + 3.1) * box.s); await frames(p, 2);
    mm = await p.evaluate(() => __app.mm); ok('minimap hover shows GO TO', mm.eyebrow === 'Go to' && mm.name === 'Kitchen', JSON.stringify(mm));
    await p.mouse.click(box.x + (4.7 + 0.45) * box.s, box.y + (7.0 + 3.1) * box.s);
    const go = await p.evaluate(() => { const t = __app.tour; const r = __app.tourSim(30); return { t, r }; });
    ok('minimap click walks to the clicked room', go.t.kind === 'go' && go.r.mode === 'walk' && go.r.seen.includes('kitchen') && go.r.nclips === 0, JSON.stringify(go));
    ok('no console errors (rooms)', p.errs.length === 0, JSON.stringify(p.errs.slice(0, 5)));
    await p.context().close();
  }

  // ---------------- guided tour
  if (want('tour')) {
    const p = await open(1280, 800);
    const plan = await p.evaluate(() => __app.planTour());
    ok('tour route: no collider hits on the curve', plan && plan.hits === 0, JSON.stringify(plan));
    ok('tour order', plan && plan.keys.map(k => k[0]).join(',') === 'hall,living,dining,kitchen,wc,landing,primary,bath,bed2,terrace');
    ok('room graph links every room', await p.evaluate(() => { const ids = new Set(__app.roomGraph.flat()); return ['hall','living','dining','kitchen','wc','landing','primary','bath','bed2','outside'].every(i => ids.has(i)); }), JSON.stringify(await p.evaluate(() => __app.roomGraph)));
    await p.evaluate(() => __app.startTour());
    await p.waitForFunction(() => __app.tour.on);
    ok('tour bar visible', await p.evaluate(() => getComputedStyle(document.querySelector('#tourbar')).display === 'flex'));
    // jump to the middle of the tour (upstairs, between landing and the primary bedroom) for the route screenshot
    await p.evaluate(() => { __app.tourPaused = true; });
    const mid = await p.evaluate(() => { const t = __app.tour; __app.tourPaused = false; __app.tourSeek(t.len * 0.42); __app.tourSim(1.6); __app.tourPaused = true; return __app.tour; });
    await frames(p, 3); await shot(p, 'tour-mid.png');
    ok('tour pauses', mid.paused === true);
    // run the whole tour (simulated time) and check rooms visited + no clipping
    const run = await p.evaluate(() => { __app.tourSeek(0); __app.tourPaused = false; return __app.tourSim(200); });
    const seen = run.seen.filter(Boolean);
    const need = ['hall', 'living', 'dining', 'kitchen', 'wc', 'stairs', 'landing', 'primary', 'bath', 'bed2', 'outside'];
    ok('tour visits every room on both floors and finishes outside', need.every(i => seen.includes(i)) && !run.on && run.mode === 'walk', JSON.stringify(run));
    ok('tour never clips into furniture or walls', run.nclips === 0, JSON.stringify(run.clips));
    await frames(p, 3);
    ok('finish toast', await p.evaluate(() => document.querySelector('#toast').textContent) === 'Tour finished. Keep walking, or go back to the plan.');
    // interaction ends the tour
    await p.evaluate(() => __app.startTour()); await p.waitForFunction(() => __app.tour.on);
    await p.keyboard.press('Space'); ok('Space pauses the tour', await p.evaluate(() => __app.tour.paused && __app.tour.on));
    await p.keyboard.press('KeyW'); await frames(p, 1);
    ok('a key press ends the tour into free walking', await p.evaluate(() => !__app.tour.on && __app.mode === 'walk'));
    await p.evaluate(() => __app.startTour()); await p.waitForFunction(() => __app.tour.on);
    await p.mouse.move(640, 300); await p.mouse.down(); await p.mouse.move(700, 310, { steps: 4 }); await p.mouse.up(); await frames(p, 1);
    ok('a drag ends the tour', await p.evaluate(() => !__app.tour.on && __app.mode === 'walk'));
    ok('no console errors (tour)', p.errs.length === 0, JSON.stringify(p.errs.slice(0, 5)));
    await p.context().close();
  }

  // ---------------- HD on vs off, same view
  if (want('hd')) {
    const p = await open(1280, 800);
    await enter(p, 'kitchen');
    await p.evaluate(() => __app.setQuality('hd', true)); await frames(p, 2);
    const hd = await p.evaluate(() => __app.quality); await shot(p, 'hd-on.png');
    await p.evaluate(() => document.querySelector('#hdBtn').click()); await frames(p, 2);
    const fast = await p.evaluate(() => ({ q: __app.quality, toast: document.querySelector('#toast').textContent, on: document.querySelector('#hdBtn').classList.contains('on') }));
    await shot(p, 'hd-off.png');
    ok('HD on: composer + pixel ratio', hd.hd === true, JSON.stringify(hd));
    ok('HD button toggles to fast mode with toast', fast.q.hd === false && fast.toast === 'Fast mode: lighter rendering for smoother walking' && !fast.on, JSON.stringify(fast));
    await p.evaluate(() => document.querySelector('#hdBtn').click()); await frames(p, 1);
    ok('HD button back on with toast', await p.evaluate(() => __app.quality.hd && document.querySelector('#toast').textContent === 'HD on: soft contact shadows and bloom'));
    ok('no console errors (hd)', p.errs.length === 0, JSON.stringify(p.errs.slice(0, 5)));
    await p.context().close();
  }

  // ---------------- change something (mocked Claude)
  if (want('change')) {
    const p = await open(1280, 800);
    await p.evaluate(() => localStorage.clear()); await p.addStyleTag({ content: '#panel{transition:none!important}' });
    ok('without Claude: unavailable note, apply disabled', await p.evaluate(() => !document.querySelector('#chgNA').hidden && document.querySelector('#chgNA').textContent === 'Open this page in the Claude app or on claude.ai to make changes' && document.querySelector('#chgApply').disabled));
    // mock: the page sends the prompt; the test edits the MODEL JSON in it like Claude would
    await p.exposeFunction('mockClaude', async prompt => {
      const model = JSON.parse(prompt.split('MODEL JSON:\n')[1]); const req = prompt.match(/The user asks: "(.*)"/)[1];
      const f = id => model.furniture.find(x => x.id === id);
      let changes = [];
      if (/sofa dark green/.test(req)) { f('living-sofa').color = 'darkGreen'; f('living-sofa').material = 'velvet'; changes = ['Changed the living room sofa to dark green velvet.']; }
      else if (/round table/.test(req)) { Object.assign(f('dining-table'), { shape: 'round', w: 1.1, d: 1.1, pedestals: 1, pedestalR: 0.22, chairs: 4 }); delete f('dining-table').pedestalOffset; changes = ['Replaced the oval dining table with a 1.1 m round pedestal table for four.']; }
      else if (/rug in bedroom 2/.test(req)) { model.furniture.push({ id: 'bed2-nook-rug', type: 'rug', level: 1, room: 'bed2', x: 1.55, z: 8.1, w: 1.5, d: 1.0, facing: 'N', color: 'rust' }); changes = ['Added a 1.5 × 1.0 m rust rug in the bedroom 2 desk nook.']; }
      else if (/primary bed against the right-hand wall/.test(req)) {
        Object.assign(f('primary-bed'), { x: 5.465, z: 1.45, facing: 'W' });
        Object.assign(f('primary-bedside-l'), { x: 6.325, z: 0.47, facing: 'W' }); Object.assign(f('primary-bedside-r'), { x: 6.325, z: 2.43, facing: 'W' });
        Object.assign(f('primary-vase'), { x: 6.36, z: 0.36 }); Object.assign(f('primary-books'), { x: 6.3, z: 2.5 });
        Object.assign(f('primary-wardrobe'), { x: 2.755, z: 1.2, facing: 'E' });
        changes = ['Moved the primary bed so its headboard is against the right-hand wall, with the bedside tables either side.', 'Moved the wardrobe to the left-hand wall to make room.'];
      }
      else if (/remove the wall/.test(req)) { changes = ["I can't remove that wall: walls, openings and room outlines are fixed in this model, so nothing was changed."]; }
      else if (/BREAK THE WALLS/.test(req)) { model.walls.pop(); changes = ['Removed a wall.']; }
      else if (/BAD TYPE/.test(req)) { model.furniture.push({ id: 'x', type: 'hotTub', level: 0, room: 'living', x: 2, z: 2, w: 1, d: 1, facing: 'N' }); }
      else if (/OUTSIDE/.test(req)) { Object.assign(f('living-armchair'), { x: 12, z: 2.5 }); changes = ['Moved the armchair.']; }
      model.changes = changes;
      return '```json\n' + JSON.stringify(model) + '\n```';
    });
    await p.evaluate(() => __app.mockSample(async (input, opts) => {
      if (/RATE/.test(input)) throw { code: 'rate_limited' };
      if (/SLOW/.test(input)) return new Promise((res, rej) => opts.signal.addEventListener('abort', () => rej({ code: 'cancelled' })));
      return { text: await window.mockClaude(input), truncated: false };
    }));
    ok('prompt wording and size', await p.evaluate(() => { const t = __app.buildPrompt('make the "sofa" green'); return t.startsWith('Below is the JSON model of a two-storey house.') && t.includes(`The user asks: "make the 'sofa' green"`) && t.includes('Allowed furniture types: rug, sofa') && new TextEncoder().encode(t).length < 200000; }),
       String(await p.evaluate(() => new TextEncoder().encode(__app.buildPrompt('x')).length)) + ' bytes');
    const cases = [
      ['sofa', 'living', 'make the living room sofa dark green'],
      ['table', 'dining', 'replace the dining table with a round table for four'],
      ['rug', 'bed2', 'add a rug in bedroom 2'],
      ['bed', 'primary', 'move the primary bed against the right-hand wall'],
      ['wall', 'kitchen', 'remove the wall between the kitchen and the hall'],
    ];
    const views = { living: [4.6, 2.9, 0, 1.0, 1.4], dining: [3.25, 4.95, 0, 6.2, 3.6], bed2: [3.4, 6.9, 1, 1.2, 8.2, -0.42], primary: [3.05, 3.0, 1, 5.6, 0.9], kitchen: [1.3, 8.2, 0, 4.6, 6.6] };
    const look = async room => { const v = views[room]; await p.evaluate(v => { __app.teleport(v[0], v[1], v[2], Math.atan2(-(v[3] - v[0]), -(v[4] - v[1]))); __app.view = { yaw: Math.atan2(-(v[3] - v[0]), -(v[4] - v[1])), pitch: v[5] ?? -0.12 }; __app.sim(0.02); }, v); await frames(p, 2); };
    await enter(p, 'living');
    for (const [tag, room, req] of cases) {
      await look(room); await p.waitForFunction(() => __app.bake.done); await shot(p, `chg-${tag}-before.png`);
      const before = await p.evaluate(() => JSON.stringify(__app.model));
      await p.fill('#chgText', req); await p.evaluate(() => { document.querySelector('#panel').classList.remove('hide', 'compact'); });
      await p.evaluate(() => document.querySelector('#chgApply').click());
      await p.waitForFunction(() => !document.querySelector('#chgApply').disabled || document.querySelector('#chgErr').hidden === false);
      await p.waitForFunction(() => __app.bake.done); await look(room);
      const res = await p.evaluate(() => ({ list: [...document.querySelectorAll('#chgList li')].map(l => l.textContent), err: document.querySelector('#chgErr').hidden ? '' : document.querySelector('#chgErr').textContent, toast: document.querySelector('#toast').textContent, hist: __app.history }));
      const after = await p.evaluate(() => JSON.stringify(__app.model));
      await p.evaluate(() => document.querySelector('#panel').classList.add('hide')); await p.waitForTimeout(700);
      await shot(p, `chg-${tag}-after.png`);
      await p.evaluate(() => document.querySelector('#panel').classList.remove('hide')); await p.waitForTimeout(700); await frames(p, 1);
      await p.screenshot({ path: `${OUT}/chg-${tag}-panel.png`, clip: { x: 1280 - 22 - 322, y: 72, width: 322, height: 700 } });
      await p.evaluate(() => document.querySelector('#panel').classList.add('hide')); await p.waitForTimeout(700);
      if (tag === 'wall') ok(`change "${req}" refused, nothing changed`, before === after && /can't remove that wall/.test(res.list[0] || '') && !res.err, JSON.stringify(res));
      else ok(`change "${req}" applied`, before !== after && res.list.length > 0 && !res.err && res.toast === res.list[0], JSON.stringify(res));
    }
    // malformed replies are rejected and the model is kept
    for (const bad of ['BREAK THE WALLS', 'BAD TYPE', 'RATE']) {
      const before = await p.evaluate(() => JSON.stringify(__app.model));
      await p.evaluate(t => __app.runChange(t), bad);
      const r = await p.evaluate(() => ({ err: document.querySelector('#chgErr').textContent, hidden: document.querySelector('#chgErr').hidden }));
      ok(`rejected: ${bad}`, !r.hidden && before === await p.evaluate(() => JSON.stringify(__app.model)), r.err);
    }
    await p.evaluate(t => __app.runChange(t), 'OUTSIDE'); const clamp = await p.evaluate(() => __app.model.furniture.find(f => f.id === 'living-armchair'));
    ok('moved item clamped inside its room', clamp.x <= 6.52 - clamp.d / 2 + 1e-6, JSON.stringify(clamp));
    await p.evaluate(() => __app.undo());
    // cancel
    const pr = p.evaluate(() => __app.runChange('SLOW'));
    await p.waitForFunction(() => !document.querySelector('#chgCancel').hidden);
    const steps = await p.evaluate(() => ({ s1: document.querySelector('#chgSteps .step[data-s="1"]').classList.contains('active'), dis: document.querySelector('#chgApply').disabled }));
    await p.evaluate(() => document.querySelector('#chgCancel').click()); await pr;
    ok('busy state, then Cancel aborts', steps.s1 && steps.dis && await p.evaluate(() => /Cancelled/.test(document.querySelector('#chgList').textContent) && !document.querySelector('#chgApply').disabled), JSON.stringify(steps));
    // undo and reload
    const h0 = await p.evaluate(() => __app.history);
    await p.evaluate(() => __app.undo()); await p.waitForFunction(() => __app.bake.done);
    const afterUndo = await p.evaluate(() => ({ h: __app.history, bed: __app.model.furniture.find(f => f.id === 'primary-bed').facing, sofa: __app.model.furniture.find(f => f.id === 'living-sofa').color }));
    ok('Undo restores the previous model', afterUndo.h === h0 - 1 && afterUndo.bed === 'S' && afterUndo.sofa === 'darkGreen', JSON.stringify(afterUndo));
    await p.reload(); await p.waitForFunction(() => window.__app && __app.mode === 'doll'); await p.waitForFunction(() => __app.bake.done);
    const reload = await p.evaluate(() => ({ h: __app.history, sofa: __app.model.furniture.find(f => f.id === 'living-sofa').color, table: __app.model.furniture.find(f => f.id === 'dining-table').shape, rug: !!__app.model.furniture.find(f => f.id === 'bed2-nook-rug') }));
    ok('changes survive a reload', reload.sofa === 'darkGreen' && reload.table === 'round' && reload.rug && reload.h === afterUndo.h, JSON.stringify(reload));
    await p.evaluate(() => __app.setQuality('fast', true)); await p.evaluate(() => __app.reset()); await p.waitForFunction(() => __app.bake.done);
    ok('Reset to the original design', await p.evaluate(() => JSON.stringify(__app.model.furniture) === JSON.stringify(__app.ORIGINAL_MODEL.furniture)));
    ok('no console errors (change)', p.errs.length === 0, JSON.stringify(p.errs.slice(0, 5)));
    await p.evaluate(() => localStorage.clear());
    await p.context().close();
  }

  // ---------------- phone
  if (want('phone')) {
    const p = await open(390, 844, { touch: true, keepQuality: true });
    const q = await p.evaluate(() => __app.quality); ok('phone defaults to fast mode', q.hd === false, JSON.stringify(q));
    await p.evaluate(() => __app.enterRoom(__app.PLAN.rooms.find(r => r.id === 'living'), { noCine: true })); await p.waitForFunction(() => __app.mode === 'walk');
    await frames(p, 3);
    const box = await p.evaluate(() => { const r = document.querySelector('#mini').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, size: getComputedStyle(document.querySelector('#mSize')).display }; });
    ok('phone minimap top-right, ~160 px map, size line hidden', box.x + box.w <= 390 && box.x > 200 && box.y < 120 && box.size === 'none', JSON.stringify(box));
    const top = await p.evaluate(() => { const els = [...document.querySelectorAll('#top .btn')].filter(e => getComputedStyle(e).display !== 'none'); return els.map(e => { const r = e.getBoundingClientRect(); return [e.id, Math.round(r.left), Math.round(r.right)]; }); });
    ok('phone top controls fit', top.every(([, l, r]) => l >= 0 && r <= 390), JSON.stringify(top));
    await shot(p, 'phone-walk.png');
    await p.evaluate(() => __app.mmToggleBig()); await frames(p, 2); await shot(p, 'phone-mm-big.png');
    await p.evaluate(() => __app.mmToggleBig());
    await p.evaluate(() => __app.startTour()); await p.waitForFunction(() => __app.tour.on); await p.evaluate(() => { __app.tourPaused = true; __app.tourSeek(__app.tour.len * 0.3); __app.tourSim(0.05); });
    await frames(p, 2); await shot(p, 'phone-tour.png');
    ok('no console errors (phone)', p.errs.length === 0, JSON.stringify(p.errs.slice(0, 5)));
    await p.context().close();
  }
  await b.close();
})();
