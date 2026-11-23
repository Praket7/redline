#!/usr/bin/env python3
"""Real Chromium layout checks using shipped CSS; not a full WebGL gameplay test."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
import json,os,shutil
root=Path(__file__).resolve().parents[1];dist=root/'dist';out=root/'qa';out.mkdir(exist_ok=True)
css='\n'.join(p.read_text() for p in sorted((dist/'site/src/styles').glob('*.css')))
diagnostics=(dist/'site/src/scripts/999_stage1_diagnostics.js').read_text()
variants={'Kestrel':'rl67-kestrel-cockpit','Blade':'rl65-blade-cockpit','Copper':'rl62-tie-cockpit','Spirit':'rl63-spirit-cockpit'}
report=[]
with sync_playwright() as p:
 browser=p.chromium.launch(**({'executable_path':os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')} if (os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')) else {}),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(1600,900),(430,932)]:
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
  for name,cls in variants.items():
   html=f'''<!doctype html><html><head><style>{css}\n/* harness-only: draws representative UI box geometry without assets/Three.js */
body{{background:linear-gradient(140deg,#281b17,#1c2939);overflow:hidden}}
#rlGameTop{{position:fixed;width:235px;height:48px;background:#0a1220a6!important;color:white!important;padding:10px!important;display:block!important}}
#maphud{{display:block!important;width:175px;height:195px;background:#101b27cf!important;box-sizing:border-box!important}}
#maphud canvas{{width:150px;height:150px;background:#182b3b80}}
#rlPositions{{display:block!important;width:165px;height:106px;background:#080d17bd!important;color:white!important;padding:9px!important;box-sizing:border-box!important}}
#rlGameButtons{{position:fixed;top:10px;left:36%;color:white}}
</style></head><body class="rl-play rl-cockpit {cls}">
<div id="rlGameTop">REDLINE | LAP 01 / 03</div><div id="rlGameButtons">P VIEW &nbsp; R RESTART</div>
<div id="maphud"><div>RAVEN SPRINT</div><canvas></canvas></div>
<div id="rlPositions">1 SPECTRE<br>2 YOU<br>3 APEX</div>
<div id="rl68Telemetry">LEGACY TELEMETRY SHOULD BE HIDDEN</div>
</body></html>'''
   page.set_content(html,wait_until='domcontentloaded')
   rects=page.evaluate('''()=>Object.fromEntries(['rlGameTop','maphud','rlPositions','rl68Telemetry'].map(k=>{let e=document.getElementById(k),r=e.getBoundingClientRect();return [k,{x:r.x,y:r.y,w:r.width,h:r.height,display:getComputedStyle(e).display}]}))''')
   def overlap(a,b):return a['x'] < b['x']+b['w'] and a['x']+a['w'] > b['x'] and a['y']<b['y']+b['h'] and a['y']+a['h']>b['y']
   assert not overlap(rects['rlGameTop'],rects['maphud']),(name,width,'lap over map',rects)
   assert not overlap(rects['rlPositions'],rects['maphud']),(name,width,'leaderboard over map',rects)
   assert rects['rl68Telemetry']['display']=='none',(name,width,'legacy telemetry visible')
   screenshot=out/f'HUD_{name}_{width}.png';page.screenshot(path=str(screenshot),animations='disabled')
   report.append({'craft':name,'viewport':[width,height],'hud_bounds':rects,'result':'PASS (isolated CSS only)','screenshot':screenshot.name})
  page.close()
 # This test executes the real diagnostics UI independently, without loading Three.js.
 page=browser.new_page(viewport={'width':1280,'height':720})
 page.set_content('<html><body><div id="test">GAME SCENE</div><style>'+css+'</style></body></html>')
 page.evaluate('''()=>{window.REDLINE_VERSION='v78-stage1';window.REDLINE_SIM_STATE=()=>Object.freeze({tick:6});window.REDLINE_STAGE1_LAST_RENDER={drawCalls:56,triangles:18000,geometries:80,textures:18,quality:'balanced'}}''')
 page.add_script_tag(content=diagnostics)
 page.keyboard.press('F8');page.wait_for_timeout(350)
 assert page.evaluate('''()=>document.getElementById('rl78Debug')?.textContent?.includes('REDLINE / SYSTEM DIAGNOSTICS')''')
 page.screenshot(path=str(out/'HUD_DEBUG_1280.png'))
 browser.close()
(out/'HUD_LAYOUT_RESULTS.json').write_text(json.dumps(report,indent=2))
print('PASS',len(report),'CSS layouts + F8 debug runtime, all in isolated Chromium')
