import sys, time, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path('/home/claude/wt')
OUT = pathlib.Path('/home/claude/shots'); OUT.mkdir(exist_ok=True)
w, h = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (1440, 900)
tag = sys.argv[3] if len(sys.argv) > 3 else 'd'

def route(r):
    u = r.request.url
    if 'cdn.jsdelivr.net/npm/three@0.169.0/' in u:
        rel = u.split('three@0.169.0/')[1]
        r.fulfill(path=str(ROOT / 'node_modules/three' / rel), content_type='application/javascript')
    elif u.startswith('file://'):
        r.continue_()
    else:
        r.abort()

with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': w, 'height': h}, has_touch=(tag == 'm'), is_mobile=(tag == 'm'))
    errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    pg.route('**/*', route)
    pg.goto('file://' + str(ROOT / 'index.html'))
    pg.wait_for_function("window.__app && __app.mode=='doll'", timeout=90000); pg.wait_for_timeout(800)
    pg.screenshot(path=str(OUT / f'{tag}_1_doll.png'))
    if tag == 'd':
        pg.click('#btnPlan'); pg.wait_for_timeout(500)
        pg.screenshot(path=str(OUT / f'{tag}_2_plan.png')); pg.click('#btnPlanClose')
    for rid in ['hall', 'kitchen', 'lounge', 'dining']:
        pg.evaluate(f"__app.enterRoom(__app.PLAN.rooms.find(r=>r.id=='{rid}'))")
        pg.wait_for_function("__app.mode=='walk'", timeout=90000); pg.wait_for_timeout(600)
        pg.screenshot(path=str(OUT / f'{tag}_3_{rid}.png'))
    pg.evaluate('__app.toDollhouse()'); pg.wait_for_function("__app.mode=='doll'", timeout=90000)
    print('mode', pg.evaluate('__app.mode'))
    print('\n'.join(errs[:20]) or 'no console errors')
    b.close()
