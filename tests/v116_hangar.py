import base64,functools,json,pathlib,threading,time
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'qa/v116';OUT.mkdir(parents=True,exist_ok=True)
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
report={'checks':[],'errors':[],'scope':'cold-cache actual Chromium/WebGL on SwiftShader'}
def check(x,m):
 assert x,m
 report['checks'].append(m)
try:
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=b.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
  page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.on('console',lambda m:report['errors'].append(m.text[:3000]) if 'Shader Error' in m.text or 'Optional hangar reflection disabled' in m.text else None)
  page.add_init_script("localStorage.setItem('redline_raven_training_v22_done','1');localStorage.setItem('redline_v16_options',JSON.stringify({model:'copper',course:'grand',bots:0,autoPointerLock:false}));localStorage.setItem('redline_graphics_preset','performance')")
  page.goto(f'http://127.0.0.1:{server.server_port}/REDLINE_v116_HANGAR_STABLE.html?redlineTest=1&cameraDebug=1',wait_until='domcontentloaded',timeout=120000)
  page.wait_for_function("window.REDLINE_E2E?.status()?.ready===true",timeout=180000)
  page.wait_for_function("document.getElementById('rlBootCurtain')?.classList.contains('rl-boot-done')",timeout=180000)
  page.wait_for_function("window.REDLINE_SHOWROOM?.selectedReady",timeout=120000)
  check(page.evaluate("window.REDLINE_HANGAR_QA.release")=='v116-hangar-stable','exact release')
  page.locator('.v111-start').click()
  page.wait_for_selector('.v111-fleet')
  started=time.monotonic()
  page.wait_for_function("Object.keys(window.REDLINE_V112_THUMBNAILS?.().generated||{}).length===4 && [...document.querySelectorAll('.v112-model-preview img')].every(i=>i.complete&&i.naturalWidth>0)",timeout=240000)
  report['previewReadySeconds']=time.monotonic()-started
  thumbs=page.evaluate("""async()=>{const out=[];for(const el of document.querySelectorAll('.v112-model-preview img')){await el.decode();const c=document.createElement('canvas');c.width=el.naturalWidth;c.height=el.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(el,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;let zero=0,solid=0;for(let i=3;i<p.length;i+=4){if(p[i]===0)zero++;if(p[i]>180)solid++;}out.push({id:el.closest('[data-model]').dataset.model,zero,solid,total:p.length/4,png:el.src});}return out;}""")
  for x in thumbs:
   (OUT/(x['id']+'.png')).write_bytes(base64.b64decode(x.pop('png').split(',',1)[1]))
  report['thumbnails']=thumbs
  check(len(thumbs)==4 and all(x['zero']>x['total']*.08 and x['solid']>100 for x in thumbs),'four genuine transparent thumbnails without selecting missing models')
  check(not page.evaluate("Object.keys(window.REDLINE_V112_THUMBNAILS().errors).length"),'no retained preview errors')
  page.screenshot(path=str(OUT/'fleet_copper.png'),timeout=120000)
  for craft in ['spirit','blade','kestrel','copper']:
   page.locator(f'[data-model={craft}]').click()
   page.wait_for_function("(c)=>window.REDLINE_SHOWROOM?.airframe===c&&window.REDLINE_SHOWROOM?.selectedReady",arg=craft,timeout=120000)
   page.evaluate("()=>{for(let i=0;i<110;i++)window.REDLINE_SHOWROOM.update(.05)}")
   page.wait_for_timeout(500)
   check(page.evaluate("window.REDLINE_HANGAR_QA.bodyClearance")>=.679,craft+' ground clearance')
   check(page.evaluate("window.REDLINE_HANGAR_QA.reflection.frames>0&&window.REDLINE_HANGAR_QA.reflection.error===null"),craft+' reflection rendered')
   page.screenshot(path=str(OUT/f'fleet_{craft}.png'),timeout=120000)
  perf=page.evaluate("window.REDLINE_V115_PERF()");report['perf']=perf
  check(perf['thumbnailRenders']==4,'exactly four preview renders on cold cache')
  check(not report['errors'],'no page or GLSL errors')
  report['result']='PASS';b.close()
except Exception as e:
 report['result']='FAIL';report['failure']=str(e)
 try:page.screenshot(path=str(OUT/'failure.png'),timeout=30000)
 except Exception:pass
finally:
 server.shutdown();(OUT/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
if report.get('result')!='PASS':raise SystemExit(1)
