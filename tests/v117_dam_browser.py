import base64,functools,json,pathlib,threading
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'qa/v117';OUT.mkdir(parents=True,exist_ok=True)
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
report={'cases':[],'scope':'actual Chromium WebGL software renderer, same camera positions in both versions'}
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for version,filename in [('v116','REDLINE_v116_HANGAR_STABLE.html'),('v117','REDLINE_v117_SPILLWAY_REFINED.html')]:
   case={'version':version,'errors':[],'views':{}};report['cases'].append(case)
   page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
   page.on('pageerror',lambda e:case['errors'].append(str(e)))
   page.on('console',lambda m:case['errors'].append(m.text[:4000]) if 'Shader Error' in m.text or ('WebGLProgram' in m.text and 'ERROR' in m.text) else None)
   page.add_init_script("localStorage.setItem('redline_raven_training_v22_done','1');localStorage.setItem('redline_v16_options',JSON.stringify({model:'copper',course:'grand',bots:0,autoPointerLock:false}));localStorage.setItem('redline_graphics_preset','performance')")
   try:
    page.goto(f'http://127.0.0.1:{server.server_port}/{filename}?redlineTest=1&cameraDebug=1',wait_until='domcontentloaded',timeout=120000)
    page.wait_for_function("window.REDLINE_E2E?.status()?.ready===true",timeout=180000)
    page.wait_for_function("document.getElementById('rlBootCurtain')?.classList.contains('rl-boot-done')",timeout=180000)
    page.evaluate("window.REDLINE_E2E.launch()")
    page.wait_for_function("window.REDLINE_E2E.status().screen==='race'",timeout=180000)
    page.wait_for_function("window.REDLINE_DAM_LIVE?.built===true",timeout=120000)
    page.evaluate("()=>{for(let i=0;i<120&&window.REDLINE_UI_STATUS()?.mode==='count';i++)window.redlineSimulateFrame(.05)}")
    page.wait_for_function("window.REDLINE_UI_STATUS()?.mode==='run'",timeout=90000)
    case['dam']=page.evaluate("window.REDLINE_DAM_QA")
    if version=='v117':
     qa=page.evaluate("window.REDLINE_V117_DAM_ATTACHMENTS")
     assert len(qa['galleries'])>20 and all(x['rearOverlap']>1 and x['anchored'] for x in qa['galleries'])
     assert all(x['wallTop']>=x['roofBottom'] for x in qa['foundation'])
    assert all(x['connectedToRiver'] for x in case['dam']['connectedOutlets'])
    for name,position,target in [('overview',[0,126,-300],[0,92,-10]),('side',[170,95,-110],[65,84,-30]),('gate',[20,95,-145],[45,92,-30]),('outlet',[-95,78,-145],[-66,74,-50]),('powerhouse',[192,46,-97],[157,28,-58])]:
     view=page.evaluate("""([p,t])=>{const root=window.REDLINE_DAM_LIVE.root,c=cam.clone();root.updateMatrixWorld(true);c.position.copy(root.localToWorld(new THREE.Vector3(...p)));c.lookAt(root.localToWorld(new THREE.Vector3(...t)));c.updateMatrixWorld(true);const old=Rn.getRenderTarget();try{Rn.setRenderTarget(null);Rn.render(S,c);return {png:Rn.domElement.toDataURL('image/png'),calls:Rn.info.render.calls,triangles:Rn.info.render.triangles}}finally{Rn.setRenderTarget(old)}}""",[position,target])
     png=base64.b64decode(view.pop('png').split(',',1)[1]);assert len(png)>10000 and view['calls']>0 and view['triangles']>0
     (OUT/f'{version}_{name}.png').write_bytes(png);case['views'][name]=view
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
