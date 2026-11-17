from playwright.sync_api import sync_playwright
def route(r):
    u=r.request.url
    if 'three@0.169.0/' in u: r.fulfill(path='/home/claude/wt/node_modules/three/'+u.split('three@0.169.0/')[1], content_type='application/javascript')
    elif u.startswith('file://'): r.continue_()
    else: r.abort()
HIDE = "#top,#panel,#floors,#hot,#hint,#walkui,#joy{display:none!important}"
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_page(viewport={'width':1344,'height':768})
    pg.route('**/*', route); pg.goto('file:///home/claude/p2/site/index.html')
    pg.wait_for_function("window.__app && __app.mode=='doll'", timeout=200000)
    pg.add_style_tag(content=HIDE); pg.wait_for_timeout(1500)
    pg.screenshot(path='/home/claude/gen/doll.png')
    pg.evaluate("__app.enterRoom(__app.PLAN.rooms.find(r=>r.id=='kitchen'))")
    pg.wait_for_function("__app.mode=='walk'", timeout=200000); pg.wait_for_timeout(1500)
    pg.screenshot(path='/home/claude/gen/kitchen3d.png')
    b.close()
