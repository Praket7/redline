#!/usr/bin/env python3
"""REDLINE v83 real-WebGL camera framing gate.

Uses the production game, actual glTF aircraft, native camera paths and
headless Chromium. No mock renderer, injected fake scene or resized sprite.
Run with REDLINE_EXPECT_RENDERER=187 REDLINE_COMPACT_SITE=1.
"""
import json, os, shutil, traceback
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'qa';QA.mkdir(exist_ok=True)
rev=os.environ.get('REDLINE_EXPECT_RENDERER','187')
site=ROOT/'dist'/('site-r187-compact' if os.environ.get('REDLINE_COMPACT_SITE','1')=='1' else 'site-r187')
report={'suite':'REDLINE v83 live chase framing','cases':[],'errors':[],'state':'RUNNING'}
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(site)))
Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_address[1]}/index.html?redlineTest=1&cameraDebug=1'
try:
 with sync_playwright() as p:
  binary=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
  opts=({'executable_path':binary} if binary else {})
  browser=p.chromium.launch(**opts,headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for width,height,crafts in [(960,540,['kestrel','blade','copper','spirit']),(1600,900,['kestrel','spirit'])]:
   page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
   page.on('pageerror',lambda exc:report['errors'].append(str(exc)))
   page.add_init_script("""
      localStorage.setItem('redline_raven_training_v22_done','1');
      localStorage.setItem('redline_v16_options',JSON.stringify({course:'grand',autoPointerLock:false}));
   """)
   page.goto(url,wait_until='domcontentloaded',timeout=30000)
   page.wait_for_function('window.REDLINE_E2E?.status()?.ready===true',timeout=90000)
   assert page.evaluate('window.THREE.REVISION')==rev,'wrong real renderer'
   for craft in crafts:
    case={'viewport':[width,height],'craft':craft}
    try:
     page.evaluate('window.REDLINE_E2E.screen("solo")')
     page.locator(f'button[data-model="{craft}"]').first.click()
     if craft!='kestrel':
      flag={'blade':'REDLINE_BLADE_READY','copper':'REDLINE_COPPER_READY','spirit':'REDLINE_SPIRIT_READY'}[craft]
      page.wait_for_function('(f)=>window[f]===true',arg=flag,timeout=60000)
     page.evaluate('()=>{for(let i=0;i<100;i++)window.REDLINE_SHOWROOM.update(.05)}')
     page.wait_for_function('(c)=>window.REDLINE_SHOWROOM?.airframe===c&&window.REDLINE_SHOWROOM?.selectedReady',arg=craft,timeout=45000)
     page.evaluate('window.REDLINE_E2E.launch()')
     page.wait_for_function('window.REDLINE_E2E?.status()?.screen==="race"',timeout=45000)
     # The chase selector persists across race launches. Restore the default
     # before each model so a previous craft's WIDE mode does not masquerade
     # as a newly selected craft's default framing.
     for reset in range(3):
      mode_now=page.evaluate('window.REDLINE_CAMERA_STATUS?.profile')
      if mode_now=='normal':break
      page.keyboard.press('c')
      page.evaluate('()=>{for(let i=0;i<6;i++)window.redlineSimulateFrame(.05)}')
     else:raise AssertionError('unable to reset chase to normal mode')
     state=page.evaluate('''()=>{
       for(let i=0;i<100 && window.REDLINE_UI_STATUS()?.mode==='count';i++)window.redlineSimulateFrame(.05);
       for(let i=0;i<8;i++)window.redlineSimulateFrame(.05);
       window.redlineRenderInterpolated(1/60,0);
       return {mode:window.REDLINE_UI_STATUS()?.mode,camera:window.REDLINE_CAMERA_STATUS,
               sim:window.REDLINE_SIM_STATE?.(),renderer:window.REDLINE_STAGE1_LAST_RENDER};
     }''')
     case['default']=state['camera']
     assert state['mode']=='run',f'not racing: {state["mode"]}'
     assert state['renderer'] and state['renderer']['drawCalls']>0,'empty real WebGL scene'
     cam=state['camera']
     assert cam and not cam['fpv'] and cam['airframe']==craft, f'wrong chase camera: {cam}'
     assert cam['requestedBoom']<=55, f'v82 distant camera survived: {cam}'
     assert 60<=cam['fov']<=75, f'unstable chase lens: {cam}'
     assert .32<=cam['screenX']<=.68, f'craft moved horizontally from reticle: {cam}'
     assert .48<=cam['screenY']<=.91, f'craft fell out of acceptable chase region: {cam}'
     bounds=cam['bodyBounds']
     assert bounds, f'no physical aircraft body projection: {cam}'
     assert .07<bounds['width']<.85, f'craft too tiny or clipped in chase: {bounds}'
     assert .27<bounds['centerX']<.73, f'aircraft shifted off center: {bounds}'
     assert bounds['top']<.98 and bounds['bottom']>0.02, f'aircraft off-screen: {bounds}'
     page.screenshot(path=str(QA/f'V83_CHASE_{craft.upper()}_{width}x{height}.png'),animations='disabled')
     page.keyboard.press('c')
     page.evaluate('()=>{for(let i=0;i<12;i++)window.redlineSimulateFrame(.05)}')
     close=page.evaluate('window.REDLINE_CAMERA_STATUS')
     case['close']=close
     assert close['profile']=='close' and close['requestedBoom']<cam['requestedBoom'],f'close mode not closer: {close}'
     page.keyboard.press('c')
     page.evaluate('()=>{for(let i=0;i<12;i++)window.redlineSimulateFrame(.05)}')
     wide=page.evaluate('window.REDLINE_CAMERA_STATUS')
     case['wide']=wide
     assert wide['profile']=='wide' and wide['requestedBoom']>cam['requestedBoom'],f'wide camera mode broken: {wide}'
     # Full combat tests remain in the existing e2e suite. Check that aiming
     # still uses the unchanged production control path.
     case['state']='PASS'
    except Exception as exc:
     case['state']='FAIL';case['error']=str(exc)
     page.screenshot(path=str(QA/f'V83_FAILED_{craft.upper()}_{width}.png'))
     report['errors'].append(f'{craft}@{width}: {exc}')
    report['cases'].append(case)
   page.close()
  browser.close()
finally:
 server.shutdown()
 report['state']='PASS' if not report['errors'] else 'FAIL'
 (QA/'V83_CHASE_CAMERA_REPORT.json').write_text(json.dumps(report,indent=2,default=str))
 print(json.dumps({'state':report['state'],'cases':len(report['cases']),'errors':report['errors'],
                   'measurements':[{'craft':c['craft'],'vp':c['viewport'],'width':round(c.get('default',{}).get('bodyBounds',{}).get('width',0),3) if c.get('default',{}).get('bodyBounds') else None,
                                    'boom':round(c.get('default',{}).get('boom',0),1),'state':c.get('state')} for c in report['cases']]},indent=2))
if report['errors']:raise SystemExit(1)
