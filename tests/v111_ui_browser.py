import json,os,pathlib,threading,functools
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
W=int(os.environ.get('WIDTH','1280'));H=int(os.environ.get('HEIGHT','720'))
OUT=ROOT/'qa/v111'/f'{W}x{H}';OUT.mkdir(parents=True,exist_ok=True)
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
report={'viewport':[W,H],'checks':[],'errors':[],'scope':'actual Chromium WebGL, controlled race checkpoint fixture'}
def check(ok,label):
    assert ok,label
    report['checks'].append(label)
def rect(page,sel):
    return page.locator(sel).first.bounding_box()
def disjoint(a,b):
    return a and b and (a['x']+a['width']<=b['x']+1 or b['x']+b['width']<=a['x']+1 or a['y']+a['height']<=b['y']+1 or b['y']+b['height']<=a['y']+1)
try:
 with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=b.new_page(viewport={'width':W,'height':H},device_scale_factor=1)
    page.on('pageerror',lambda e:report['errors'].append(str(e)))
    page.on('console',lambda m:report['errors'].append(m.text[:3000]) if 'Shader Error' in m.text else None)
    page.add_init_script("localStorage.setItem('redline_raven_training_v22_done','1');if(!localStorage.getItem('redline_v16_options'))localStorage.setItem('redline_v16_options',JSON.stringify({model:'copper',course:'grand',bots:3,autoPointerLock:false,hudMode:'tactical'}));localStorage.setItem('redline_graphics_preset','performance')")
    page.goto(f'http://127.0.0.1:{server.server_port}/REDLINE_v111_REFINED.html?redlineTest=1&cameraDebug=1',wait_until='domcontentloaded',timeout=120000)
    page.wait_for_function("window.REDLINE_E2E?.status()?.ready===true",timeout=150000)
    page.wait_for_function("document.getElementById('rlBootCurtain')?.classList.contains('rl-boot-done')",timeout=120000)
    def cap(name):page.wait_for_timeout(600);page.screenshot(path=str(OUT/(name+'.png')),timeout=120000)
    def step(n,dt=.05):page.evaluate("([n,dt])=>{for(let i=0;i<n;i++)window.redlineSimulateFrame(dt)}",[n,dt])
    def settle(craft):
        page.wait_for_function("(c)=>window.REDLINE_SHOWROOM?.airframe===c&&window.REDLINE_SHOWROOM?.selectedReady",arg=craft,timeout=90000)
        page.evaluate("()=>{for(let i=0;i<100;i++)window.REDLINE_SHOWROOM.update(.05)}")
        page.wait_for_timeout(500)
    check(page.evaluate("window.REDLINE_UI_RELEASE")== 'v111-interface','exact interface version')
    settle('copper');cap('home')
    check(page.locator('.v111-start').is_visible(),'functional home action')
    page.locator('.v111-start').hover();cap('home_hover')
    page.locator('.v111-start').click()
    page.wait_for_selector('.v111-fleet')
    for craft in ['copper','spirit','kestrel','blade']:
        page.locator(f'[data-model={craft}]').click();settle(craft)
        check(page.locator(f'[data-model={craft}]').get_attribute('aria-pressed')=='true',craft+' card selected')
        check(abs(page.evaluate("window.REDLINE_HANGAR_POSE_STATUS().modelY-window.REDLINE_HANGAR_POSE_STATUS().homeY"))<2,craft+' hover pose')
        cap('fleet_'+craft)
    page.locator('#rl45ModelTrack').focus();page.keyboard.press('ArrowDown')
    check(page.locator('[data-model=spirit]').get_attribute('aria-pressed')=='true','wrap to first airframe')
    page.locator('#rl45ModelTrack').focus();page.keyboard.press('ArrowDown')
    check(page.locator('[data-model=copper]').get_attribute('aria-pressed')=='true','vertical keyboard navigation')
    settle('copper')
    page.locator('[data-op=course-next]').click()
    page.wait_for_selector('.v111-tracks')
    cap('tracks')
    check(page.locator('.v111-track-card').count()==2,'both playable courses')
    page.locator('[data-op=track-prev]').click()
    check(page.locator('[data-course="0"]').get_attribute('aria-pressed')=='true','track carousel arrow')
    page.locator('[data-course="1"]').click()
    check(page.locator('[data-course="1"]').get_attribute('aria-pressed')=='true','track card click')
    page.locator('[data-v111-mode=trial]').click()
    check(page.locator('[data-bots="0"]').get_attribute('aria-pressed')=='true' and page.locator('#rlS2Ghost').input_value()=='off','time trial mode')
    page.locator('[data-v111-mode=ghost]').click()
    check(page.locator('[data-bots="0"]').get_attribute('aria-pressed')=='true' and page.locator('#rlS2Ghost').input_value()=='best','ghost mode')
    page.locator('[data-v111-mode=race]').click()
    page.locator('[data-bots="3"]').click()
    page.locator('[data-op=launch]').click()
    page.wait_for_function("window.REDLINE_E2E.status().screen==='race'",timeout=120000)
    page.evaluate("()=>{for(let i=0;i<120&&window.REDLINE_UI_STATUS()?.mode==='count';i++)window.redlineSimulateFrame(.05)}")
    page.wait_for_function("window.REDLINE_UI_STATUS()?.mode==='run'",timeout=90000)
    page.keyboard.down('w');step(35);page.keyboard.up('w');page.keyboard.down('j');step(5);page.keyboard.up('j')
    step(45)
    check(disjoint(rect(page,'#rlSprintTelemetry'),rect(page,'#rlPositions')),'split and live standings do not overlap')
    for action in ['refuel','shield','pulse','reload']:
        sel=f'#rlFlowModule [data-flow-action={action}]'
        check(disjoint(rect(page,sel+' .key'),rect(page,sel+' .label')),action+' key and label do not overlap')
    cap('race_tactical')
    page.keyboard.press('p');page.wait_for_function("document.body.classList.contains('rl-cockpit')")
    step(5);cap('fpv')
    page.keyboard.press('p')
    # Actual checkpoint processing, not an invented result or a complete manually flown course.
    for i in range(36):
        step(18,.0166666666667)
        prev=page.evaluate("window.REDLINE_E2E.stage1()")
        page.evaluate("window.REDLINE_E2E.stage2CheckpointFixture()")
        step(1,.0166666666667)
        post=page.evaluate("window.REDLINE_E2E.stage1()")
        assert (post['gate'],post['lap'])!=(prev['gate'],prev['lap']),f'gate {i}'
    page.wait_for_selector('.v111-results',timeout=90000)
    check(page.locator('.v111-standing.is-me').count()==1,'real player result row')
    check(page.locator('.v111-laps>div>div').count()==3,'three actual lap times')
    check(page.locator('[data-op=watchReplay]').count()==1,'one replay action')
    replay=rect(page,'[data-op=watchReplay]');check(replay['y']<H,'replay action above fold')
    cap('finish')
    page.locator('[data-op=v111-stats]').click();page.wait_for_timeout(400)
    check(page.locator('.rl-s2-summary details').get_attribute('open') is not None,'stats reveal opens sector data')
    check(page.locator('.rl-s2-grid > div').count()==36,'all 36 sector entries')
    cap('finish_stats')
    page.locator('[data-op=watchReplay]').click();page.wait_for_selector('#rlS2Replay')
    cap('replay')
    page.locator('[data-rp=close]').click()
    check(page.locator('.v111-results').is_visible(),'return to finish')
    check(not report['errors'],'no uncaught browser or shader errors')
    report['result']='PASS';b.close()
except Exception as e:
 report['result']='FAIL';report['failure']=str(e)
 try:page.screenshot(path=str(OUT/'failure.png'),timeout=30000)
 except Exception:pass
finally:
 server.shutdown();(OUT/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
if report['result']!='PASS':raise SystemExit(1)
