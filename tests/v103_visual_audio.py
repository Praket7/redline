import base64,functools,json,math,os,pathlib,statistics,threading,time
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
COURSE=os.environ.get('COURSE','grand')
OUT=ROOT/'qa/v103'/COURSE
OUT.mkdir(parents=True,exist_ok=True)
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
report={'course':COURSE,'checks':[],'cases':[],'errors':[],'renderer':'Chromium / SwiftShader; CPU submission metrics are not hardware GPU FPS'}
def check(x,m):
    if not x: raise AssertionError(m)
    report['checks'].append(m)
def png(data,path):
    path.write_bytes(base64.b64decode(data.split(',',1)[1]))
    assert path.stat().st_size>10000,path
def step(page,n=10,dt=.05):
    page.evaluate("([n,dt])=>{for(let i=0;i<n;i++)window.redlineSimulateFrame(dt)}",[n,dt])
def capture_view(page,kind):
    # Both releases use the actual production scene and the same camera formula.
    return page.evaluate("""(kind)=>{
      const c=cam.clone();
      if(kind==='dam'){
        const root=window.REDLINE_DAM_LIVE?.root;
        if(!root)return null;
        root.updateMatrixWorld(true);c.position.copy(root.localToWorld(new THREE.Vector3(0,116,-190)));
        c.lookAt(root.localToWorld(new THREE.Vector3(0,99,0)));
      }else{
        const i=Math.round(.156*N)%N;
        c.position.set(PX[i]-TX[i]*180,150,PZ[i]-TZ[i]*180);
        c.lookAt(new THREE.Vector3(PX[i],35,PZ[i]));
      }
      c.updateMatrixWorld(true);
      const old=Rn.getRenderTarget(),vs=[];
      try{
        Rn.setRenderTarget(null);
        for(let i=0;i<4;i++){const t=performance.now();Rn.render(S,c);vs.push(performance.now()-t);}
        return {png:Rn.domElement.toDataURL('image/png'),calls:Rn.info.render.calls,triangles:Rn.info.render.triangles,times:vs.slice(1),width:Rn.domElement.width,height:Rn.domElement.height};
      }finally{Rn.setRenderTarget(old);}
    }""",kind)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
  for version,filename in [('v93','REDLINE_v93_STAGE2.html'),('v103','REDLINE_v103_STAGE3.html')]:
   errors=[];case={'version':version,'errors':errors,'views':{}}
   report['cases'].append(case)
   page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('console',lambda m:errors.append(m.text[:3500]) if ('WebGLProgram' in m.text and ('ERROR' in m.text or 'error' in m.text)) or 'Shader Error' in m.text else None)
   page.add_init_script("localStorage.setItem('redline_raven_training_v22_done','1');localStorage.setItem('redline_v16_options',JSON.stringify("+json.dumps({'model':'kestrel','course':COURSE,'bots':0,'autoPointerLock':False,'hudMode':'race','volume':65})+"));localStorage.setItem('redline_graphics_preset','performance')")
   try:
    page.goto(f'http://127.0.0.1:{server.server_port}/{filename}?redlineTest=1&cameraDebug=1',wait_until='domcontentloaded',timeout=120000)
    page.wait_for_function("window.REDLINE_E2E?.status()?.ready===true",timeout=150000)
    page.wait_for_function("document.getElementById('rlBootCurtain')?.classList.contains('rl-boot-done')",timeout=120000)
    page.wait_for_function("window.REDLINE_SHOWROOM?.selectedReady",timeout=90000)
    page.evaluate("()=>{for(let i=0;i<100;i++)window.REDLINE_SHOWROOM.update(.05)}")
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT/f'{version}_home.png'),timeout=90000)
    page.locator('[data-op=solo]').first.click()
    page.wait_for_function("window.REDLINE_UI_STATUS()?.screen==='solo'",timeout=90000)
    page.evaluate("()=>{for(let i=0;i<100;i++)window.REDLINE_SHOWROOM.update(.05)}")
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT/f'{version}_selection.png'),timeout=90000)
    check(abs(page.evaluate("window.REDLINE_HANGAR_POSE_STATUS().modelY-window.REDLINE_HANGAR_POSE_STATUS().homeY"))<2,version+' approved hangar pose retained')
    page.evaluate("window.REDLINE_E2E.launch()")
    page.wait_for_function("window.REDLINE_E2E.status().screen==='race'",timeout=90000)
    page.evaluate("()=>{for(let i=0;window.REDLINE_UI_STATUS()?.mode==='count'&&i<120;i++)window.redlineSimulateFrame(.05)}")
    page.wait_for_function("window.REDLINE_UI_STATUS()?.mode==='run'",timeout=60000)
    page.keyboard.down('w');step(page,40);page.keyboard.up('w')
    page.keyboard.down('j');step(page,6);page.keyboard.up('j')
    page.wait_for_timeout(1000)
    page.screenshot(path=str(OUT/f'{version}_race.png'),timeout=90000)
    check(page.evaluate("window.REDLINE_STAGE1_LAST_RENDER.drawCalls")>0,version+' actual WebGL rendered')
    for kind in (['canyon','dam'] if COURSE=='grand' else ['canyon']):
      view=capture_view(page,kind)
      assert view,kind
      png(view.pop('png'),OUT/f'{version}_{kind}_performance.png')
      case['views'][kind]=view
      check(view['calls']>0 and view['triangles']>0,version+' '+kind+' real scene')
    if version=='v103':
      state=page.evaluate("window.REDLINE_V103_STATUS()")
      case['remaster']=state
      check(0<state['surfaceInstances']<=1152 and 0<state['surfaceBatches']<=12,'bounded real terrain instance batches')
      if COURSE=='grand':check(state['damDetails']>0,'dam facade details constructed')
      check(state['materials']>0 and state['particleCapacity']==144,'model material pass and bounded particle pool')
      check(page.evaluate("window.REDLINE_V23_STATUS().audioReady"),'actual Web Audio context running')
      sound=page.evaluate("""async()=>{const a=REDLINE_AUDIO_ENGINE,begin=a.status().played;
       for(const type of ['laser','hit','crash','shield','checkpoint','respawn','boost','reload','emp','refuel','finish','rival','ui','splash'])a.play(type);
       await new Promise(r=>setTimeout(r,850));return {before:begin,after:a.status(),state:a.context.state}}""")
      case['audio']=sound
      check(sound['state']=='running' and sound['after']['played']>sound['before'] and sound['after']['voices']<=14 and sound['after']['music'] is False,'real sound effects scheduled and voice cap respected; no music')
      page.evaluate("REDLINE_AUDIO_ENGINE.setMuted(true)")
      check(page.evaluate("REDLINE_AUDIO_ENGINE.play('laser')") is False,'mute suppresses SFX')
      page.evaluate("REDLINE_AUDIO_ENGINE.setMuted(false)")
      for quality in ['balanced','ultra']:
       page.evaluate("""q=>{const e=document.getElementById('quality');e.value=q;e.dispatchEvent(new Event('change',{bubbles:true}));}""",quality)
       page.wait_for_timeout(600)
       view=capture_view(page,'canyon')
       png(view.pop('png'),OUT/f'v103_canyon_{quality}.png')
       case['views'][quality]=view
       check(view['calls']>0 and page.evaluate("window.REDLINE_V103_STATUS().quality")==quality,quality+' quality renders')
      page.evaluate("""()=>{const e=document.getElementById('quality');e.value='performance';e.dispatchEvent(new Event('change',{bubbles:true}));}""")
      page.keyboard.press('p');page.wait_for_function("document.body.classList.contains('rl-cockpit')")
      page.screenshot(path=str(OUT/'v103_fpv.png'),timeout=90000)
    check(not errors,version+' no page/shader errors')
    case['result']='PASS'
   except Exception as e:
    case['result']='FAIL';case['reason']=str(e);report['errors'].append(version+': '+str(e))
    try:page.screenshot(path=str(OUT/f'{version}_failure.png'),timeout=30000)
    except Exception:pass
   finally:page.close()
  browser.close()
finally:
 server.shutdown();(OUT/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
if report['errors'] or len(report['cases'])!=2:raise SystemExit(1)
