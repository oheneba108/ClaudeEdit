import sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path('/home/claude/p2/site'); OUT = pathlib.Path('/home/claude/shots3'); OUT.mkdir(exist_ok=True)
w,h,tag = int(sys.argv[1]),int(sys.argv[2]),sys.argv[3]; rooms = sys.argv[4].split(',') if len(sys.argv)>4 and sys.argv[4] else []
def route(r):
    u=r.request.url
    if 'three@0.169.0/' in u: r.fulfill(path='/home/claude/wt/node_modules/three/'+u.split('three@0.169.0/')[1], content_type='application/javascript')
    elif u.startswith('file://'): r.continue_()
    else: r.abort()
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_page(viewport={'width':w,'height':h}, has_touch=(tag=='m'), is_mobile=(tag=='m'))
    errs=[]; pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
    pg.route('**/*', route); pg.goto('file://'+str(ROOT/'index.html'))
    wait=lambda m: pg.wait_for_function(f"window.__app && __app.mode=='{m}'", timeout=200000)
    wait('doll'); pg.wait_for_timeout(500); pg.screenshot(path=str(OUT/f'{tag}_doll0.png'))
    if tag=='m':
        pg.evaluate('__app.setFloor(1)'); wait('doll'); pg.wait_for_timeout(1500); pg.screenshot(path=str(OUT/f'{tag}_doll1.png'))
    for rid in rooms:
        pg.evaluate(f"__app.enterRoom(__app.PLAN.rooms.find(r=>r.id=='{rid}'))"); wait('walk'); pg.wait_for_timeout(500)
        pg.screenshot(path=str(OUT/f'{tag}_{rid}.png'))
    if tag=='d':
        pg.evaluate("__app.teleport(0.86,7.9,0,0)"); pg.evaluate("__app.walk('KeyW',true)")
        print('up 4s', pg.evaluate("__app.sim(4)")); pg.evaluate("__app.walk('KeyW',false)")
        pg.wait_for_timeout(800); pg.screenshot(path=str(OUT/'d_stairs_top.png'))
        pg.evaluate("__app.teleport(0.86,3.7,1,Math.PI)"); pg.evaluate("__app.walk('KeyW',true)")
        print('down 4s', pg.evaluate("__app.sim(4)")); pg.evaluate("__app.walk('KeyW',false)")
        pg.evaluate("__app.teleport(2.0,3.6,0,Math.PI/2)"); pg.evaluate("__app.walk('KeyW',true)")
        print('into WC wall from living (x must stay > 0.28+R and not cross 1.42 into the stair)', pg.evaluate("__app.sim(4)")); pg.evaluate("__app.walk('KeyW',false)")
        pg.evaluate("__app.teleport(4.5,6.5,0,-Math.PI/2)"); pg.evaluate("__app.walk('KeyW',true)")
        print('kitchen into cabinets (x must stay < 5.92-R)', pg.evaluate("__app.sim(4)")); pg.evaluate("__app.walk('KeyW',false)")
        pg.evaluate("__app.teleport(2.6,7.0,0,0)"); pg.evaluate("__app.walk('KeyW',true)")
        print('hall to WC door and in (z should reach < 5.8)', pg.evaluate("__app.sim(3)")); pg.evaluate("__app.walk('KeyW',false)")
        pg.evaluate("__app.teleport(1.9,4.6,1,Math.PI/2)"); pg.evaluate("__app.walk('KeyW',true)")
        print('landing into void (x must stay >= 1.44+R)', pg.evaluate("__app.sim(3)")); pg.evaluate("__app.walk('KeyW',false)")
        # all eyes free of colliders?
        print('eyes blocked:', pg.evaluate("__app.PLAN.rooms.filter(r=>{__app.teleport(r.eye[0],r.eye[1],r.L,0); const a=__app.sim(0.3); return Math.hypot(a.x-r.eye[0],a.z-r.eye[1])>0.05 && false; }).map(r=>r.id)"))
    print('\n'.join(errs[:10]) or 'no page errors'); b.close()
