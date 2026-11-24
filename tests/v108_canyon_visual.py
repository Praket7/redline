import base64,functools,json,os,pathlib,threading
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'qa/v108';OUT.mkdir(parents=True,exist_ok=True)
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
report={'cases':[],'errors':[],'scope':'actual Chromium WebGL scene, fixed comparison cameras; software renderer, no hardware FPS claim'}
def require(cond,msg):
    if not cond:raise AssertionError(msg)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for version,filename in [('v104','REDLINE_v104_GRAND_CANYON.html'),('v108','REDLINE_v108_FRACTURED_CANYON.html')]:
   errors=[];case={'version':version,'errors':errors,'views':{}}
   report['cases'].append(case)
   page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('console',lambda m:errors.append(m.text[:3000]) if 'Shader Error' in m.text or ('WebGLProgram' in m.text and 'ERROR' in m.text) else None)
   page.add_init_script("localStorage.setItem('redline_raven_training_v22_done','1');localStorage.setItem('redline_v16_options',JSON.stringify({model:'kestrel',course:'grand',bots:0,autoPointerLock:false,hudMode:'race'}));localStorage.setItem('redline_graphics_preset','ultra')")
   try:
    page.goto(f'http://127.0.0.1:{server.server_port}/{filename}?redlineTest=1&cameraDebug=1',wait_until='domcontentloaded',timeout=120000)
    page.wait_for_function("window.REDLINE_E2E?.status()?.ready===true",timeout=150000)
    page.wait_for_function("document.getElementById('rlBootCurtain')?.classList.contains('rl-boot-done')",timeout=120000)
    page.evaluate("window.REDLINE_E2E.screen('solo')")
    page.evaluate("window.REDLINE_E2E.launch()")
    page.wait_for_function("window.REDLINE_E2E.status().screen==='race'",timeout=120000)
    page.evaluate("()=>{for(let i=0;i<120&&window.REDLINE_UI_STATUS()?.mode==='count';i++)window.redlineSimulateFrame(.05)}")
    page.wait_for_function("window.REDLINE_UI_STATUS()?.mode==='run'",timeout=90000)
    page.keyboard.down('w');page.evaluate("()=>{for(let i=0;i<30;i++)window.redlineSimulateFrame(.05)}");page.keyboard.up('w')
    page.keyboard.down('j');page.evaluate("()=>{for(let i=0;i<6;i++)window.redlineSimulateFrame(.05)}");page.keyboard.up('j')
    page.evaluate("()=>{for(let i=0;i<45;i++)window.redlineSimulateFrame(.05)}")
    page.screenshot(path=str(OUT/f'{version}_gameplay.png'),timeout=120000)
    for name,t,y,offset,aimy in [('slalom',.156,135,180,45),('crosswind',.31,170,100,100),('ironwall',.725,155,100,100),('rim',.85,345,200,205)]:
     view=page.evaluate("""([t,y,offset,aimy])=>{
       const i=Math.round(t*N)%N,c=cam.clone();
       c.position.set(PX[i]-TX[i]*offset,y,PZ[i]-TZ[i]*offset);
       c.lookAt(new THREE.Vector3(PX[i],aimy,PZ[i]));c.updateMatrixWorld(true);
       const old=Rn.getRenderTarget();
       try{Rn.setRenderTarget(null);Rn.render(S,c);return {png:Rn.domElement.toDataURL('image/png'),drawCalls:Rn.info.render.calls,triangles:Rn.info.render.triangles,width:Rn.domElement.width,height:Rn.domElement.height}}
       finally{Rn.setRenderTarget(old)}
     }""",[t,y,offset,aimy])
     png=base64.b64decode(view.pop('png').split(',',1)[1]);require(len(png)>10000,'invalid actual render')
     require(view['drawCalls']>0 and view['triangles']>0,'empty scene')
     (OUT/f'{version}_{name}.png').write_bytes(png);case['views'][name]=view
    if version=='v108':
     state=page.evaluate("()=>({release:window.REDLINE_RELEASE,formations:window.REDLINE_GC_FORMATIONS,landmarks:window.REDLINE_GC_LANDMARKS,collider:CLIFF_COLLIDER.stats()})")
     case['geology']=state
     require(state['release']=='v108-fractured-canyon','wrong release')
     require(state['formations']['geometryTypes']==4,'missing distinct geology')
     require(state['landmarks']['count']>=6,'missing rim formations')
    require(not errors,str(errors))
    case['result']='PASS'
   except Exception as e:
    case['result']='FAIL';case['failure']=str(e);report['errors'].append(str(e))
    try:page.screenshot(path=str(OUT/f'{version}_failure.png'),timeout=30000)
    except Exception:pass
   finally:page.close()
  browser.close()
finally:
 server.shutdown();(OUT/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
if report['errors'] or len(report['cases'])!=2:raise SystemExit(1)
