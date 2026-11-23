import json, os, pathlib, threading, functools, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'qa/v86'; OUT.mkdir(parents=True,exist_ok=True)
report={'cases':[], 'errors':[], 'renderer':'Chromium SwiftShader (not hardware GPU)'}
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/REDLINE_v86_AUDITED.html?redlineTest=1&cameraDebug=1'
def require(condition, message):
    if not condition: raise AssertionError(message)
def snapshot(page):
    return page.evaluate("()=>({ui:window.REDLINE_UI_STATUS(), sim:window.REDLINE_SIM_STATE(), diag:window.REDLINE_SIM_DIAGNOSTICS(), race:window.REDLINE_E2E.stage1(), render:window.REDLINE_STAGE1_LAST_RENDER})")
def step(page,n=20,dt=.05):
    return page.evaluate("([n,dt])=>{for(let i=0;i<n;i++)window.redlineSimulateFrame(dt);return window.REDLINE_SIM_DIAGNOSTICS()}",[n,dt])
try:
  with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    for craft in ['kestrel','blade','copper','spirit']:
      case={'craft':craft,'checks':[],'errors':[]}
      report['cases'].append(case)
      page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
      page.on('pageerror',lambda e:case['errors'].append(str(e)))
      page.on('console',lambda msg:case['errors'].append(msg.text) if msg.type=='error' and ('Shader Error' in msg.text or 'WebGLProgram' in msg.text) else None)
      page.add_init_script("localStorage.setItem('redline_raven_training_v22_done','1');localStorage.setItem('redline_v16_options',JSON.stringify("+json.dumps({'model':craft,'course':'grand','bots':3,'autoPointerLock':False,'hudMode':'race'})+"));")
      try:
        page.goto(url,wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function("window.REDLINE_E2E?.status()?.ready===true",timeout=120000)
        require(page.evaluate('window.REDLINE_V86_AUDIT.version')=='v86','Wrong release')
        require(page.evaluate('window.THREE.REVISION')=='187','Wrong Three renderer')
        page.wait_for_function("(c)=>window.REDLINE_SHOWROOM?.airframe===c&&window.REDLINE_SHOWROOM?.selectedReady",arg=craft,timeout=90000)
        page.evaluate("()=>{for(let i=0;i<100;i++)window.REDLINE_SHOWROOM.update(.05)}")
        page.screenshot(path=str(OUT/f'{craft}_home.png'),timeout=90000)
        case['checks'].append('saved aircraft boot/home')
        page.evaluate("window.REDLINE_E2E.screen('solo')")
        page.wait_for_function("(c)=>window.REDLINE_SHOWROOM?.airframe===c&&window.REDLINE_SHOWROOM?.selectedReady",arg=craft,timeout=90000)
        page.evaluate("()=>{for(let i=0;i<100;i++)window.REDLINE_SHOWROOM.update(.05)}")
        pose=page.evaluate("window.REDLINE_HANGAR_POSE_STATUS()")
        case['hangar']=pose
        require(pose['airframe']==craft and abs(pose['modelY']-pose['homeY'])<2,'Incorrect first-selection hover pose')
        page.screenshot(path=str(OUT/f'{craft}_selection.png'),timeout=90000)
        case['checks'].append('first aircraft selection pose')
        page.evaluate("window.REDLINE_E2E.launch()")
        page.wait_for_function("window.REDLINE_E2E.status().screen==='race'",timeout=90000)
        page.evaluate("()=>{for(let i=0;window.REDLINE_UI_STATUS()?.mode==='count'&&i<120;i++)window.redlineSimulateFrame(.05)}")
        page.wait_for_function("window.REDLINE_UI_STATUS()?.mode==='run'",timeout=30000)
        before=snapshot(page)
        page.keyboard.down('w');step(page,30);page.keyboard.up('w')
        after=snapshot(page)
        require(after['diag']['ticks']>before['diag']['ticks'],'Simulation did not advance')
        require(sum((after['diag'][k]-before['diag'][k])**2 for k in ['x','y','z'])>1,'Craft did not move')
        case['checks'].append('actual W movement')
        page.screenshot(path=str(OUT/f'{craft}_chase.png'),timeout=90000)
        ammo0=page.evaluate("window.REDLINE_E2E.stage1().ammo")
        page.keyboard.press('e')
        ammo1=page.evaluate("window.REDLINE_E2E.stage1().ammo")
        require(ammo1<ammo0,'E failed to fire')
        page.keyboard.press('f')
        ammo2=page.evaluate("window.REDLINE_E2E.stage1().ammo")
        require(ammo2>ammo1,'F failed to reload')
        case['checks'].append('E fire/F reload')
        page.keyboard.down('j');step(page,6);page.keyboard.up('j')
        require(abs(page.evaluate("window.REDLINE_V272_RACE_QA().playerSpeed"))<=.05,'J failed to stop')
        case['checks'].append('J full stop')
        page.keyboard.press('p')
        page.wait_for_function("document.body.classList.contains('rl-cockpit')",timeout=20000)
        step(page,8)
        page.screenshot(path=str(OUT/f'{craft}_fpv.png'),timeout=90000)
        case['checks'].append('P cockpit')
        page.keyboard.press('p')
        page.evaluate("window.redlineUI.openRacePanel('settings')")
        require(page.evaluate("window.REDLINE_UI_STATUS().mode")=='pause','Settings did not pause')
        frozen=snapshot(page);step(page,20,.2);still=snapshot(page)
        require(frozen['diag']['ticks']==still['diag']['ticks'],'Paused tick advanced')
        require(frozen['race']['raceT']==still['race']['raceT'],'Paused timer advanced')
        page.screenshot(path=str(OUT/f'{craft}_pause.png'),timeout=90000)
        page.evaluate("window.redlineUI.closeRacePanel(false)")
        step(page,8)
        require(page.evaluate("window.REDLINE_SIM_DIAGNOSTICS().ticks")>still['diag']['ticks'],'Resume failed')
        case['checks'].append('pause freezes ticks and timer; resume works')
        page.keyboard.down('w')
        step(page,100)
        page.keyboard.up('w')
        state=snapshot(page)
        require(state['render']['drawCalls']>0,'No actual render')
        require(all(abs(state['diag'][k])<1e7 for k in ['x','y','z']),'Invalid positions')
        case['last']=state
        case['checks'].append('continued simulation/render')
        require(not case['errors'],str(case['errors']))
        case['result']='PASS'
      except Exception as e:
        case['result']='FAIL';case['failure']=str(e)
        try:page.screenshot(path=str(OUT/f'{craft}_failure.png'),timeout=30000)
        except Exception:pass
      finally:page.close()
    browser.close()
finally:
  server.shutdown()
  (OUT/'report.json').write_text(json.dumps(report,indent=2,default=str))
  print(json.dumps(report,default=str))
if any(c['result']!='PASS' for c in report['cases']) or len(report['cases'])!=4:raise SystemExit(1)
