#!/usr/bin/env python3
"""Real WebGL Raven Slalom benchmark; never substitute static mock data.
Run on a normal development computer with three.js CDN reachable.
"""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
import json,sys,time,statistics,base64,os,shutil
r=Path(__file__).resolve().parents[1];o=r/'qa';o.mkdir(exist_ok=True)
renderer_revision=os.environ.get('REDLINE_EXPECT_RENDERER','128')
site_path=r/'dist'/('site-r187-compact' if renderer_revision=='187' and os.environ.get('REDLINE_COMPACT_SITE')=='1' else ('site-r187' if renderer_revision=='187' else 'site'))
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(site_path)))
Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_address[1]}/index.html?redlineTest=1'
report={'test':'raven-slalom-60hz','state':'UNTESTED','reference':'fixed camera / 1600 x 900 / balanced graphics','samples':[]}
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(**({'executable_path':os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')} if (os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')) else {}),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=browser.new_page(viewport={'width':1600,'height':900},device_scale_factor=1)
  # Match the passing E2E fixture: skip first-run training without mocking flight.
  page.add_init_script("""
    try {
      localStorage.setItem('redline_raven_training_v22_done','1');
      localStorage.setItem('redline_v16_options',JSON.stringify({course:'grand',autoPointerLock:false}));
    } catch (e) {}
  """)
  shader_errors=[]
  page.on('console',lambda m:shader_errors.append(m.text[:6000])
          if m.type=='error' and ('WebGLProgram' in m.text or 'Shader Error' in m.text or 'VALIDATE_STATUS' in m.text) else None)
  page.goto(url,wait_until='domcontentloaded',timeout=12000)
  page.wait_for_function('window.REDLINE_E2E?.status()?.ready === true',timeout=35000)
  page.evaluate('()=>window.REDLINE_E2E.select("kestrel")')
  page.wait_for_timeout(1000)
  page.evaluate('()=>window.REDLINE_E2E.launch()')
  # UI setup is asynchronous: wait for the actual race screen before
  # advancing the production simulation. Without this gate the test
  # may observe the prior menu state (`ready`) and skip the countdown.
  page.wait_for_function("window.REDLINE_E2E?.status()?.screen === 'race'",timeout=30000)
  # Advance the real 60 Hz race countdown, independent of software GPU frame speed.
  countdown=page.evaluate("""() => {
    let steps=0;
    while(window.REDLINE_UI_STATUS?.()?.mode==='count' && steps<100){
      window.redlineSimulateFrame(.05);steps++;
    }
    return {steps,mode:window.REDLINE_UI_STATUS?.()?.mode};
  }""")
  assert countdown['mode']=='run',f'Game never reached run state: {countdown}'
  page.wait_for_function('window.REDLINE_E2E?.status()?.renderer?.drawCalls > 0',timeout=35000)
  capture=page.evaluate('()=>window.REDLINE_E2E.showcase()')
  if not capture or not capture.get('dataURL','').startswith('data:image/png;base64,'):
   raise RuntimeError('showcase screenshot was not produced by actual WebGL renderer')
  (o/'SHOWCASE_RAVEN_SLALOM_LIVE.png').write_bytes(base64.b64decode(capture['dataURL'].split(',',1)[1]))
  page.wait_for_timeout(1000)
  for _ in range(120):
   page.wait_for_timeout(100)
   sample=page.evaluate('()=>window.REDLINE_STAGE1_DIAGNOSTICS()')
   if sample:report['samples'].append(sample)
  report['summary']={'fpsMedian':statistics.median([x['fps'] for x in report['samples']]),'frameP95MedianMs':statistics.median([x['p95ms'] for x in report['samples']]),'callsMedian':statistics.median([x['drawCalls'] for x in report['samples'] if x['drawCalls'] is not None]),'sampleCount':len(report['samples'])}
  report['state']='PASS';browser.close()
except Exception as exc:
 report['state']='BLOCKED' if 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(exc) else 'FAIL';report['reason']=str(exc)[:1000]
finally:
 report['consoleShaderErrors']=locals().get('shader_errors',[])
 server.shutdown();(o/'BENCHMARK_RESULTS.json').write_text(json.dumps(report,indent=2))
 print(json.dumps({k:v for k,v in report.items() if k!='samples'},indent=2))
sys.exit(0 if report['state']=='PASS' else 2)
