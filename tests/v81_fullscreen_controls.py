#!/usr/bin/env python3
"""Real Chromium/WebGL v81 screen-fit + remapped control acceptance test.
Runs the ACTUAL compact website, never a mocked Three.js renderer."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
import json,os,sys,traceback,shutil,time
ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'qa'
QA.mkdir(exist_ok=True)
root=ROOT/'dist/site-r187-compact'
assert root.is_dir(),str(root)
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(root)))
Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_address[1]}/index.html?redlineTest=1'
report={'state':'RUNNING','screens':[],'errors':[],'shaderErrors':[]}
try:
 with sync_playwright() as p:
  exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
  browser=p.chromium.launch(**({'executable_path':exe} if exe else {}),
   headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=browser.new_page(viewport={'width':960,'height':540},device_scale_factor=1)
  page.on('pageerror',lambda e:report['errors'].append(str(e)[:2000]))
  page.on('console',lambda m:report['shaderErrors'].append(m.text[:2000]) if m.type=='error' and ('WebGLProgram' in m.text or 'Shader Error' in m.text) else None)
  page.add_init_script("""try{
    localStorage.setItem('redline_raven_training_v22_done','1');
    localStorage.setItem('redline_v16_options',JSON.stringify({course:'grand',bots:3,autoPointerLock:false,hudMode:'race'}));
  }catch(e){}""")
  page.goto(url,wait_until='domcontentloaded',timeout=40000)
  page.wait_for_function("window.REDLINE_E2E?.status()?.ready===true",timeout=80000)
  assert page.evaluate("window.THREE.REVISION")=='187'
  preset=page.evaluate("()=>document.getElementById('quality')?.value")
  assert preset=='performance',f'fastest graphics preset must be default: {preset}'
  report['graphicsPreset']=preset

  def inspect(screen,size):
   s=page.evaluate("""()=>{
     const c=document.body.firstElementChild, a=document.getElementById('rlScreens');
     const x=c?.getBoundingClientRect(),y=a?.getBoundingClientRect();
     return {canvasTag:c?.tagName,canvas:{x:x?.x,y:x?.y,width:x?.width,height:x?.height},
       screens:{x:y?.x,y:y?.y,width:y?.width,height:y?.height},
       viewport:[innerWidth,innerHeight],screen:window.REDLINE_E2E?.status()?.screen,
       phase:window.REDLINE_BOOT_PHASE};
   }""")
   w,h=s['viewport']
   assert s['canvasTag']=='CANVAS',f'WebGL first body child missing: {s}'
   for key in (('canvas',) if screen.startswith(('RACE','FPV')) else ('canvas','screens')):
    a=s[key]
    assert abs(a['x'])<=1 and abs(a['y'])<=1 and abs(a['width']-w)<=1 and abs(a['height']-h)<=1, f'BLACK BARS / viewport mismatch in {screen} {size}: {s}'
   file=f'V81_{screen}_{size[0]}x{size[1]}.png'
   page.screenshot(path=str(QA/file),animations='disabled',timeout=30000)
   report['screens'].append({'kind':screen,'size':size,'metrics':s,'image':file})
   return s

  for size in [(960,540),(1600,900)]:
   page.set_viewport_size({'width':size[0],'height':size[1]})
   page.evaluate("window.REDLINE_E2E.screen('landing')")
   # Verify the settled intro hero, not a tiny transient first frame of fly-in.
   page.evaluate("()=>{for(let i=0;i<90;i++)window.REDLINE_SHOWROOM.update(.05)}")
   page.wait_for_timeout(240)
   inspect('TITLE',size)
   titleCamera=page.evaluate('()=>window.REDLINE_HANGAR_QA?.cameraFraming')
   assert titleCamera and abs(titleCamera['distance']-37)<.01 and .65<=titleCamera['screenFocus']<=.76, f'title hero camera not right-aligned: {titleCamera}'
   page.evaluate("window.REDLINE_E2E.screen('solo')")
   page.locator('button[data-model="kestrel"]').first.click()
   page.evaluate("()=>{for(let i=0;i<90;i++)window.REDLINE_SHOWROOM.update(.05)}")
   page.wait_for_timeout(250)
   inspect('SELECTION',size)
   camera=page.evaluate('()=>window.REDLINE_HANGAR_QA.cameraFraming')
   assert abs(camera['distance']-37)<.01,f'hangar model zoom instability: {camera}'
   if size[0]==960:
    for craft in ['blade','copper','spirit']:
     page.locator(f'button[data-model="{craft}"]').first.click()
     page.evaluate('()=>{for(let i=0;i<110;i++)window.REDLINE_SHOWROOM.update(.05)}')
     page.wait_for_function('(craft)=>window.REDLINE_SHOWROOM?.airframe===craft&&window.REDLINE_SHOWROOM?.selectedReady',arg=craft,timeout=35000)
     page.wait_for_timeout(160)
     inspect('SELECTION_'+craft.upper(),size)
     camera=page.evaluate('()=>window.REDLINE_HANGAR_QA.cameraFraming')
     assert abs(camera['distance']-37)<.01,f'per-craft camera zoom must stay fixed: {craft} {camera}'
  page.set_viewport_size({'width':960,'height':540})
  page.evaluate("window.REDLINE_E2E.screen('solo')")
  page.locator('button[data-model="kestrel"]').first.click()
  page.evaluate("()=>{for(let i=0;i<110;i++)window.REDLINE_SHOWROOM.update(.05)}")
  page.evaluate('()=>window.REDLINE_E2E.launch()')
  page.wait_for_function("window.REDLINE_E2E?.status()?.screen==='race'",timeout=40000)
  inspect('RACE_START',(960,540))
  page.evaluate("()=>{for(let i=0;window.REDLINE_UI_STATUS?.()?.mode==='count'&&i<100;i++)window.redlineSimulateFrame(.05)}")
  page.wait_for_function("window.REDLINE_UI_STATUS?.()?.mode==='run'",timeout=20000)
  page.keyboard.down('w')
  page.evaluate('()=>{for(let i=0;i<30;i++)window.redlineSimulateFrame(.05)}')
  page.keyboard.down('j')
  page.evaluate('()=>{for(let i=0;i<6;i++)window.redlineSimulateFrame(.05)}')
  speed=page.evaluate('()=>Math.abs(window.REDLINE_V272_RACE_QA()?.playerSpeed||0)')
  assert speed<=.05,f'J did not fully stop moving drone: speed={speed}'
  page.keyboard.up('j')
  page.keyboard.up('w')
  ammo0=page.evaluate('()=>window.REDLINE_V22_STATUS().ammo')
  page.keyboard.press('e')
  ammo1=page.evaluate('()=>window.REDLINE_V22_STATUS().ammo')
  assert ammo1<ammo0,f'E did not fire laser: {ammo0} -> {ammo1}'
  page.keyboard.press('f')
  ammo2=page.evaluate('()=>window.REDLINE_V22_STATUS().ammo')
  assert ammo2>ammo1,f'F did not reload: {ammo1} -> {ammo2}'
  report['controls']={'speedAfterJ':speed,'ammoBeforeE':ammo0,'ammoAfterE':ammo1,'ammoAfterF':ammo2}
  page.keyboard.press('p')
  page.wait_for_function("document.body.classList.contains('rl-cockpit')",timeout=15000)
  inspect('FPV',(960,540))
  ui=page.evaluate("""()=>{
   const items=['rlGameTop','rlPositions','maphud','rlFlowModule','navPointer'];
   const o={};
   for(const id of items){const e=document.getElementById(id);if(!e)continue;
     const s=getComputedStyle(e);
     o[id]={background:s.backgroundColor,image:s.backgroundImage,border:s.borderTopWidth};
   }
   return o;
  }""")
  for key,values in ui.items():
   assert values['background'] in ('rgba(0, 0, 0, 0)','transparent'),f'black background returned in FPV: {key} {values}'
   assert values['image']=='none',f'background gradient returned in FPV {key}'
  report['fpvUi']=ui
  assert not report['errors'] and not report['shaderErrors'],(report['errors'],report['shaderErrors'])
  report['state']='PASS'
  browser.close()
except Exception as e:
 report['state']='FAIL'
 report['reason']=str(e)
 report['traceback']=traceback.format_exc()[-3800:]
finally:
 server.shutdown()
 (QA/'V81_FULLSCREEN_CONTROLS_REPORT.json').write_text(json.dumps(report,indent=2))
 print(json.dumps({k:v for k,v in report.items() if k not in ('screens','traceback')},indent=2))
sys.exit(0 if report['state']=='PASS' else 2)
