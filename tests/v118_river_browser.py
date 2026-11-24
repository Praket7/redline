import base64, functools, json, os, pathlib, threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
COURSE=os.environ.get('COURSE','grand')
OUT=ROOT/'qa/v118'/COURSE;OUT.mkdir(parents=True,exist_ok=True)
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
report={'course':COURSE,'cases':[],'scope':'actual Chromium SwiftShader rendering and controlled movement; not a hardware FPS benchmark'}
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for version,filename in [('v117','REDLINE_v117_SPILLWAY_REFINED.html'),('v118','REDLINE_v118_RIVER_REFINED.html')]:
   case={'version':version,'errors':[],'views':{}};report['cases'].append(case)
   page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
   page.on('pageerror',lambda e:case['errors'].append(str(e)))
   page.on('console',lambda m:case['errors'].append(m.text[:4000]) if 'Shader Error' in m.text or ('WebGLProgram' in m.text and 'ERROR' in m.text) else None)
   page.add_init_script("localStorage.setItem('redline_raven_training_v22_done','1');localStorage.setItem('redline_v16_options',JSON.stringify("+json.dumps({'model':'kestrel','course':COURSE,'bots':0,'autoPointerLock':False})+"));localStorage.setItem('redline_graphics_preset','performance')")
   try:
    page.goto(f'http://127.0.0.1:{server.server_port}/{filename}?redlineTest=1&cameraDebug=1',wait_until='domcontentloaded',timeout=120000)
    page.wait_for_function("window.REDLINE_E2E?.status()?.ready===true",timeout=180000)
    page.wait_for_function("document.getElementById('rlBootCurtain')?.classList.contains('rl-boot-done')",timeout=180000)
    page.evaluate("window.REDLINE_E2E.launch()")
    page.wait_for_function("window.REDLINE_E2E.status().screen==='race'",timeout=180000)
    page.evaluate("()=>{for(let i=0;i<120&&window.REDLINE_UI_STATUS()?.mode==='count';i++)window.redlineSimulateFrame(.05)}")
    page.wait_for_function("window.REDLINE_UI_STATUS()?.mode==='run'",timeout=90000)
    page.wait_for_function("window.REDLINE_HYDRO?.ready",timeout=90000)
    if version=='v118':
     case['river']=page.evaluate("window.REDLINE_V118_RIVER")
     assert case['river']['shoreMode']=='terrain-intersection' and case['river']['surfaceDrawCalls']==1
     assert case['river']['flowTextureBytes']==15600
     assert page.evaluate("window.REDLINE_STAGE3_SHORE.integrated&&window.REDLINE_STAGE3_SHORE.mesh===window.RV")
     before=page.evaluate("window.REDLINE_HYDRO.surfaceVersion")
     page.evaluate("()=>{for(let i=0;i<60;i++)window.redlineSimulateFrame(.05)}")
     assert page.evaluate("window.REDLINE_HYDRO.surfaceVersion")>before
    for name,t,alt,offset,look in [('slalom',.156,48,100,12),('river_bend',.31,40,80,9),('shoreline',.58,27,85,6),('wide',.725,130,200,25)]:
     view=page.evaluate("""([t,alt,off,look])=>{const i=Math.round(t*N)%N,c=cam.clone();c.position.set(PX[i]-TX[i]*off,alt,PZ[i]-TZ[i]*off);c.lookAt(new THREE.Vector3(PX[i],look,PZ[i]));c.updateMatrixWorld(true);const old=Rn.getRenderTarget();try{Rn.setRenderTarget(null);Rn.render(S,c);return {png:Rn.domElement.toDataURL('image/png'),calls:Rn.info.render.calls,triangles:Rn.info.render.triangles}}finally{Rn.setRenderTarget(old)}}""",[t,alt,offset,look])
     png=base64.b64decode(view.pop('png').split(',',1)[1]);assert len(png)>10000 and view['calls']>0
     (OUT/f'{version}_{name}.png').write_bytes(png);case['views'][name]=view
    page.keyboard.down('w');page.evaluate("()=>{for(let i=0;i<40;i++)window.redlineSimulateFrame(.05)}");page.keyboard.up('w')
    page.screenshot(path=str(OUT/f'{version}_gameplay.png'),timeout=120000)
    assert not case['errors'],case['errors']
    case['result']='PASS'
   except Exception as e:
    case['result']='FAIL';case['failure']=str(e)
    try:page.screenshot(path=str(OUT/f'{version}_failure.png'),timeout=30000)
    except Exception:pass
   finally:page.close()
  browser.close()
finally:
 server.shutdown();(OUT/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
if any(x['result']!='PASS' for x in report['cases']):raise SystemExit(1)
