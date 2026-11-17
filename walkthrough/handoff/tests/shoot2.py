import sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path('/home/claude/p2/site'); OUT = pathlib.Path('/home/claude/shots2'); OUT.mkdir(exist_ok=True)
w, h, tag = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
def route(r):
    u = r.request.url
    if 'three@0.169.0/' in u: r.fulfill(path='/home/claude/wt/node_modules/three/'+u.split('three@0.169.0/')[1], content_type='application/javascript')
    elif u.startswith('file://'): r.continue_()
    else: r.abort()
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width':w,'height':h}, has_touch=(tag=='m'), is_mobile=(tag=='m'))
    errs=[]; pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.route('**/*', route); pg.goto('file://'+str(ROOT/'index.html'))
    wait = lambda m: pg.wait_for_function(f"window.__app && __app.mode=='{m}'", timeout=120000)
    if tag=='ortho':
        pg.wait_for_timeout(3000)
        for L in (0,1):
            pg.evaluate(f'__app.ortho({L})'); pg.wait_for_timeout(300); pg.screenshot(path=str(OUT/f'ortho{L}.png'))
        print(errs); b.close(); sys.exit()
    wait('doll'); pg.wait_for_timeout(600); pg.screenshot(path=str(OUT/f'{tag}_doll0.png'))
    pg.evaluate('__app.setFloor(1)'); wait('doll'); pg.wait_for_timeout(1500); pg.screenshot(path=str(OUT/f'{tag}_doll1.png'))
    if tag=='d':
        pg.click('#btnPlan'); pg.wait_for_timeout(500); pg.screenshot(path=str(OUT/'d_check.png')); pg.click('#btnPlanClose')
    rooms = sys.argv[4].split(',') if len(sys.argv)>4 else ['living','dining','kitchen','wc','hall','landing','primary','bath','bed2']
    for rid in rooms:
        pg.evaluate(f"__app.enterRoom(__app.PLAN.rooms.find(r=>r.id=='{rid}'))"); wait('walk'); pg.wait_for_timeout(700)
        pg.screenshot(path=str(OUT/f'{tag}_{rid}.png'))
    if tag=='d':
        # stair test: from the hall, walk forward up the stairs
        pg.evaluate("__app.teleport(0.86,7.8,0,0)"); pg.evaluate("__app.walk('KeyW',true)")
        for i in range(40):
            pg.wait_for_timeout(500); P = pg.evaluate("({x:__app.P.x,z:__app.P.z,l:__app.P.level,y:__app.P.y})")
            if P['l']==1 and P['z']<3.9: break
        pg.evaluate("__app.walk('KeyW',false)"); print('after stairs', P); pg.screenshot(path=str(OUT/'d_stairs_top.png'))
        # walk back down
        pg.evaluate("__app.teleport(0.86,3.7,1,Math.PI)"); pg.evaluate("__app.walk('KeyW',true)")
        for i in range(40):
            pg.wait_for_timeout(500); P = pg.evaluate("({x:__app.P.x,z:__app.P.z,l:__app.P.level,y:__app.P.y})")
            if P['l']==0: break
        pg.evaluate("__app.walk('KeyW',false)"); print('after down', P)
        # wall test: walk into the living room side wall
        pg.evaluate("__app.teleport(1.0,1.5,0,Math.PI/2)"); pg.evaluate("__app.walk('KeyW',true)"); pg.wait_for_timeout(4000); pg.evaluate("__app.walk('KeyW',false)")
        print('wall test x (should stay >= 0.5):', pg.evaluate("__app.P.x"))
    print('\n'.join(errs[:10]) or 'no page errors')
    b.close()
