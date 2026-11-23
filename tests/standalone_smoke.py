#!/usr/bin/env python3
"""Smoke-test the exact downloadable standalone REDLINE HTML in real Chromium/WebGL.
The site smoke tests all 4 airframes; this catches packaging-only crashes.
"""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import json, os, shutil, sys, traceback
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'qa'; QA.mkdir(exist_ok=True)
rev=os.environ.get('REDLINE_EXPECT_RENDERER','187')
file=os.environ.get('REDLINE_STANDALONE_FILE') or ('REDLINE_v78_R187_CANDIDATE.html' if rev=='187' else 'REDLINE_v78_STAGE1_STANDALONE.html')
assert (ROOT/'dist'/file).exists(),f'missing standalone artifact {file}'
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_address[1]}/{file}?redlineTest=1'
report={'artifact':file,'revision':rev,'status':'NOT_RUN','errors':[],'consoleShaderErrors':[]}
try:
 with sync_playwright() as p:
  chromium=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
  opts=({'executable_path':chromium} if chromium else {})
  browser=p.chromium.launch(**opts,headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=browser.new_page(viewport={'width':960,'height':540})
  page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.on('console',lambda m:report['consoleShaderErrors'].append(m.text[:2500]) if m.type=='error' and 'WebGLProgram' in m.text else None)
  page.add_init_script("""try{localStorage.setItem('redline_raven_training_v22_done','1');localStorage.setItem('redline_v16_options',JSON.stringify({course:'grand',autoPointerLock:false}));}catch(e){}""")
  page.goto(url,wait_until='domcontentloaded',timeout=35000)
  page.wait_for_function('window.REDLINE_E2E?.status()?.ready===true',timeout=65000)
  actual=page.evaluate('()=>window.THREE.REVISION')
  assert actual==rev,f'wrong revision {actual}'
  page.evaluate("()=>window.REDLINE_E2E.screen('solo')")
  page.locator('button[data-model="kestrel"]').first.click()
  page.wait_for_function('window.REDLINE_SHOWROOM?.selectedReady===true',timeout=25000)
  page.evaluate('()=>window.REDLINE_E2E.launch()')
  page.wait_for_function("window.REDLINE_E2E?.status()?.screen==='race'",timeout=30000)
  page.evaluate("""()=>{let i=0;while(window.REDLINE_UI_STATUS?.()?.mode==='count'&&i++<100)window.redlineSimulateFrame(.05)}""")
  page.wait_for_function('window.REDLINE_E2E?.status()?.renderer?.drawCalls>0',timeout=40000)
  state=page.evaluate('()=>window.REDLINE_E2E.status()')
  assert state['renderer']['triangles']>0
  assert state['simulation']['tick']>0
  assert not report['errors'],f'JavaScript errors: {report["errors"][:3]}'
  assert not report['consoleShaderErrors'],f'WebGL shader errors: {report["consoleShaderErrors"][:3]}'
  report.update({'status':'PASS','drawCalls':state['renderer']['drawCalls'],'triangles':state['renderer']['triangles'],'simTick':state['simulation']['tick']})
  page.screenshot(path=str(QA/f'STANDALONE_R{rev}_FLIGHT.png'),animations='disabled')
  browser.close()
except Exception as e:
 report['status']='FAIL';report['reason']=str(e)[:2000];report['traceback']=traceback.format_exc()[-3000:]
finally:
 server.shutdown();(QA/f'STANDALONE_R{rev}_REPORT.json').write_text(json.dumps(report,indent=2))
 print(json.dumps({k:v for k,v in report.items() if k!='traceback'},indent=2))
sys.exit(0 if report['status']=='PASS' else 2)
