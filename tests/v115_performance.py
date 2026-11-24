import functools,json,os,pathlib,statistics,threading,time
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'qa/v115';OUT.mkdir(parents=True,exist_ok=True)
W,H=int(os.environ.get('WIDTH','960')),int(os.environ.get('HEIGHT','540'))
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
report={'viewport':[W,H],'renderer':'Chromium SwiftShader, not hardware GPU','cases':[]}
def sample(page):
 return page.evaluate("""()=>new Promise(resolve=>{const times=[];let last=performance.now(),start=last;function frame(n){times.push(n-last);last=n;if(times.length>=45||n-start>=4500){const t=times.slice(1).sort((a,b)=>a-b);resolve({frames:t.length,median:t[Math.floor(t.length*.5)],p95:t[Math.min(t.length-1,Math.floor(t.length*.95))],max:t.at(-1),elapsed:n-start});}else requestAnimationFrame(frame)}requestAnimationFrame(frame)})""")
try:
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for version,fn in [('v114','REDLINE_v114_HANGAR_REFINED.html'),('v115','REDLINE_v115_SMOOTH.html')]:
   case={'version':version,'errors':[]};report['cases'].append(case)
   page=b.new_page(viewport={'width':W,'height':H},device_scale_factor=1)
   page.on('pageerror',lambda e:case['errors'].append(str(e)))
   page.on('console',lambda m:case['errors'].append(m.text[:500]) if 'Shader Error' in m.text or 'Race preparation failed' in m.text or 'REDLINE runtime exception' in m.text else None)
   page.add_init_script("localStorage.setItem('redline_raven_training_v22_done','1');localStorage.setItem('redline_v16_options',JSON.stringify({model:'spirit',course:'grand',bots:0,autoPointerLock:false}));localStorage.setItem('redline_graphics_preset','performance')")
   try:
    start=time.monotonic();page.goto(f'http://127.0.0.1:{server.server_port}/{fn}?redlineTest=1&cameraDebug=1',wait_until='domcontentloaded',timeout=120000)
    page.wait_for_function("window.REDLINE_E2E?.status()?.ready===true",timeout=180000)
    page.wait_for_function("document.getElementById('rlBootCurtain')?.classList.contains('rl-boot-done')",timeout=180000)
    case['bootWallSeconds']=time.monotonic()-start
    page.wait_for_function("window.REDLINE_SHOWROOM?.selectedReady",timeout=120000)
    page.evaluate("()=>{for(let i=0;i<110;i++)window.REDLINE_SHOWROOM.update(.05)}")
    before=page.evaluate("()=>window.REDLINE_V115_PERF?.()||null")
    case['homeFrames']=sample(page)
    after=page.evaluate("()=>window.REDLINE_V115_PERF?.()||null")
    if after and before:
     case['hangarCounters']={k:after[k]-before[k] for k in ['mainRenders','shadowUpdates','reflectionRenders','cameraUpdates']}
     assert after['mainRenders']>before['mainRenders']
     assert case['hangarCounters']['cameraUpdates']==0,'stable camera unexpectedly recalculated'
     assert case['hangarCounters']['shadowUpdates']<=case['hangarCounters']['mainRenders']
    page.screenshot(path=str(OUT/f'{version}_home_{W}.png'),timeout=120000)
    page.locator('.v111-start').click();page.wait_for_selector('.v111-fleet')
    page.locator('[data-model=copper]').click()
    page.wait_for_function("window.REDLINE_SHOWROOM?.airframe==='copper'&&window.REDLINE_SHOWROOM?.selectedReady",timeout=180000)
    page.evaluate("()=>{for(let i=0;i<110;i++)window.REDLINE_SHOWROOM.update(.05)}")
    case['fleetFrames']=sample(page)
    page.screenshot(path=str(OUT/f'{version}_fleet_{W}.png'),timeout=120000)
    assert page.evaluate("window.REDLINE_HANGAR_QA.bodyClearance")>=.679
    page.locator('[data-model=spirit]').click();page.wait_for_function("window.REDLINE_SHOWROOM?.airframe==='spirit'",timeout=120000)
    page.locator('[data-op=course-next]').click();page.wait_for_selector('.v111-tracks')
    start=time.monotonic();page.locator('[data-op=launch]').click()
    page.wait_for_function("window.REDLINE_E2E.status().screen==='race'",timeout=180000)
    case['launchWallSeconds']=time.monotonic()-start
    page.evaluate("()=>{for(let i=0;i<120&&window.REDLINE_UI_STATUS()?.mode==='count';i++)window.redlineSimulateFrame(.05)}")
    page.wait_for_function("window.REDLINE_UI_STATUS()?.mode==='run'",timeout=90000)
    a=page.evaluate("window.REDLINE_SIM_DIAGNOSTICS()")
    page.keyboard.down('w')
    page.evaluate("()=>{for(let i=0;i<30;i++)window.redlineSimulateFrame(.05)}")
    page.keyboard.up('w');z=page.evaluate("window.REDLINE_SIM_DIAGNOSTICS()")
    assert sum((z[k]-a[k])**2 for k in ['x','y','z'])>1,'flight motion missing'
    case['raceFrames']=sample(page)
    page.screenshot(path=str(OUT/f'{version}_race_{W}.png'),timeout=120000)
    if version=='v115':
     case['finalCounters']=page.evaluate("window.REDLINE_V115_PERF()")
     assert case['finalCounters']['warmRenders']>=1 and case['finalCounters']['bootSlices']>1 and case['finalCounters']['hiddenMenuSkips']>0
    assert not case['errors'],case['errors']
    case['result']='PASS'
   except Exception as e:
    case['result']='FAIL';case['failure']=str(e)
    try:page.screenshot(path=str(OUT/f'{version}_failure_{W}.png'),timeout=30000)
    except Exception:pass
   finally:page.close()
  b.close()
finally:
 server.shutdown();(OUT/f'report_{W}.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
if any(x['result']!='PASS' for x in report['cases']):raise SystemExit(1)
