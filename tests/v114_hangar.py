import functools,json,os,pathlib,threading
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
W=int(os.environ.get('WIDTH','1525'));H=int(os.environ.get('HEIGHT','780'))
OUT=ROOT/'qa/v114'/f'{W}x{H}';OUT.mkdir(parents=True,exist_ok=True)
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
report={'viewport':[W,H],'cases':[],'errors':[]}
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=browser.new_page(viewport={'width':W,'height':H},device_scale_factor=1)
  page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.on('console',lambda m:report['errors'].append(m.text[:3000]) if 'Shader Error' in m.text or 'Optional hangar reflection disabled' in m.text else None)
  page.add_init_script("localStorage.setItem('redline_raven_training_v22_done','1');localStorage.setItem('redline_v16_options',JSON.stringify({model:'spirit',course:'grand',bots:0,autoPointerLock:false}));localStorage.setItem('redline_graphics_preset','performance')")
  page.goto(f'http://127.0.0.1:{server.server_port}/REDLINE_v114_HANGAR_REFINED.html?redlineTest=1&cameraDebug=1',wait_until='domcontentloaded',timeout=120000)
  page.wait_for_function("window.REDLINE_E2E?.status()?.ready===true",timeout=150000)
  page.wait_for_function("document.getElementById('rlBootCurtain')?.classList.contains('rl-boot-done')",timeout=120000)
  def settle(craft):
   page.wait_for_function("(c)=>window.REDLINE_SHOWROOM?.airframe===c&&window.REDLINE_SHOWROOM?.selectedReady",arg=craft,timeout=90000)
   page.evaluate("()=>{for(let i=0;i<110;i++)window.REDLINE_SHOWROOM.update(.05)}")
   page.wait_for_timeout(1000)
  def capture(name):
   page.screenshot(path=str(OUT/(name+'.png')),timeout=120000)
   state=page.evaluate("()=>({pose:window.REDLINE_HANGAR_POSE_STATUS(),camera:window.REDLINE_HANGAR_QA.cameraFraming,clearance:window.REDLINE_HANGAR_QA.bodyClearance,reflection:window.REDLINE_HANGAR_QA.reflection,release:window.REDLINE_HANGAR_QA.release})")
   assert state['release']=='v114-hangar-refined',state
   assert state['clearance']>=.679,state
   assert state['reflection']['frames']>0 and state['reflection']['error'] is None,state
   report['cases'].append({'name':name,**state})
  settle('spirit');capture('home_spirit')
  page.locator('.v111-start').click()
  page.wait_for_selector('.v111-fleet')
  base=None
  for craft in ['spirit','copper','kestrel','blade','copper']:
   page.locator(f'[data-model={craft}]').click();settle(craft);capture('fleet_'+craft)
   now=page.evaluate("()=>({p:window.REDLINE_SHOWROOM.camera.position.toArray(),q:window.REDLINE_SHOWROOM.camera.quaternion.toArray(),m:window.REDLINE_SHOWROOM.camera.projectionMatrix.toArray()})")
   if base is None:base=now
   else:assert now==base,'model-dependent camera jump'
  assert not report['errors'],report['errors']
  report['result']='PASS'
  browser.close()
except Exception as e:
 report['result']='FAIL';report['failure']=str(e)
 try:page.screenshot(path=str(OUT/'failure.png'),timeout=30000)
 except Exception:pass
finally:
 server.shutdown();(OUT/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
if report.get('result')!='PASS':raise SystemExit(1)
