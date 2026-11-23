#!/usr/bin/env python3
"""Full REDLINE WebGL smoke test. Never claims to pass with a mock renderer.

Runs four actual aircraft in the compiled site with pinned r128. Records real canvas
captures and probes the fixed simulation, chase view, FPV HUD and browser errors.
Usage: python tests/full_game_e2e.py
"""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from threading import Thread
import json, os, sys, time, traceback, shutil

ROOT = Path(__file__).resolve().parents[1]
QA = ROOT / 'qa'; QA.mkdir(exist_ok=True)
report = {'test': 'REDLINE Stage 1 full-engine WebGL smoke', 'state': 'NOT_RUN', 'cases': [], 'errors': [], 'requestFailures': []}
renderer_revision=os.environ.get('REDLINE_EXPECT_RENDERER','128')
site_path=ROOT / 'dist' / ('site-r187-compact' if renderer_revision=='187' and os.environ.get('REDLINE_COMPACT_SITE')=='1' else ('site-r187' if renderer_revision=='187' else 'site'))
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(site_path)))
Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_address[1]}/index.html?redlineTest=1'
browser=None; page=None
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(
            **({'executable_path':os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')} if (os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')) else {}), headless=True,
            args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        page = browser.new_page(viewport={'width':960 if renderer_revision=='187' else 1600,'height':540 if renderer_revision=='187' else 900}, device_scale_factor=1)
        page.on('pageerror', lambda e: report['errors'].append(str(e)))
        report['consoleShaderErrors']=[]
        page.on('console',lambda m:report['consoleShaderErrors'].append(m.text[:6000])
                if m.type=='error' and ('WebGLProgram' in m.text or 'Shader Error' in m.text or 'VALIDATE_STATUS' in m.text) else None)
        page.on('requestfailed', lambda r: report['requestFailures'].append({'url':r.url,'failure':r.failure}))
        # Suppress a one-time tutorial overlay; no game-state objects are modified.
        page.add_init_script("""
          try {
            localStorage.setItem('redline_raven_training_v22_done','1');
            localStorage.setItem('redline_v16_options',JSON.stringify({course:'grand',autoPointerLock:false}));
          } catch (e) {}
        """)
        page.goto(url,wait_until='domcontentloaded',timeout=25000)
        page.wait_for_function('window.REDLINE_E2E?.status()?.ready===true', timeout=60000)
        report['state']='RUNNING'
        # Renderer must be a real Three.js WebGLRenderer.
        check=page.evaluate('''()=>({three:window.THREE?.REVISION||null,canvases:[...document.querySelectorAll('canvas')].length,
             gl:[...document.querySelectorAll('canvas')].some(c=>!!(c.getContext('webgl2')||c.getContext('webgl'))),phase:window.REDLINE_BOOT_PHASE||null})''')
        report['engine']=check
        assert check['three']==renderer_revision,f'wrong Three renderer: expected {renderer_revision}, got {check}'
        assert check['gl'],f'no actual WebGL context: {check}'
        for craft in ['kestrel','blade','copper','spirit']:
            case={'craft':craft,'state':'RUNNING'}
            try:
                # Exercise the *real* aircraft selector. Directly rewriting the
                # config without clicking caused four misleading Kestrel screenshots.
                page.evaluate('()=>window.REDLINE_E2E.screen("solo")')
                page.locator(f'button[data-model="{craft}"]').first.click()
                # Advance the actual hangar update in deterministic steps: software
                # WebGL often cannot display 100 transition frames in CI time.
                # The production animation and model-switch code are still used.
                if craft!='kestrel':
                    flag={'blade':'REDLINE_BLADE_READY','copper':'REDLINE_COPPER_READY','spirit':'REDLINE_SPIRIT_READY'}[craft]
                    page.wait_for_function('(f)=>window[f]===true',arg=flag,timeout=45000)
                page.evaluate('()=>{for(let i=0;i<100;i++) window.REDLINE_SHOWROOM.update(.05)}')
                page.wait_for_function(
                    '(name)=>window.REDLINE_SHOWROOM?.airframe === name && window.REDLINE_SHOWROOM?.selectedReady',
                    arg=craft,timeout=45000)
                case['hangarAirframe']=page.evaluate('()=>window.REDLINE_SHOWROOM.airframe')
                case['hangarPose']=page.evaluate('()=>window.REDLINE_HANGAR_POSE_STATUS?.()')
                case['hangarDecor']=page.evaluate('()=>window.REDLINE_HANGAR_QA?.decorations')
                case['hangarFootprint']=page.evaluate('()=>window.REDLINE_HANGAR_QA?.projectedFootprint')
                case['hangarCamera']=page.evaluate('()=>window.REDLINE_HANGAR_QA?.cameraFraming')
                assert case['hangarCamera'] and case['hangarCamera']['airframe']==craft, f'hangar camera not tracking selected craft: {case}'
                if craft=='blade':
                    assert abs(case['hangarCamera']['distance']-43)<.01 and case['hangarCamera']['screenFocus']<=.78, f'Blade must use same stable camera distance: {case}'
                if craft=='spirit':
                    assert abs(case['hangarCamera']['distance']-43)<.01, f'Spirit must use same stable camera distance: {case}'
                case['hangarCTA']=page.evaluate('''()=>{
                    let e=document.querySelector('.rl45-continue');
                    if(!e)return null;
                    let b=e.getBoundingClientRect(),s=getComputedStyle(e);
                    return {top:b.top,bottom:b.bottom,left:b.left,display:s.display,viewportHeight:innerHeight};
                }''')
                if page.viewport_size['height']<=640:
                    assert case['hangarCTA'] and 0<=case['hangarCTA']['top']<case['hangarCTA']['bottom']<=page.viewport_size['height']+8, f'Continue button hidden below fold: {craft}: {case}'
                assert case['hangarDecor'] and case['hangarDecor']['panels']==16 and case['hangarDecor']['bolts']==64, f'hangar detail missing: {craft}: {case}'
                if case['hangarFootprint']:
                    fp=case['hangarFootprint']
                    # Approximate 3D AABB projection includes out-of-bounds
                    # hidden flame/FX helper extents and overstates apparent size.
                    # Verify a real set of meshes were measured; use the actual
                    # captured hangar screenshot to judge screen crop/overlap.
                    assert fp.get('heroParts',0)>=1, f'no body mesh projected: {craft}: {fp}'
                    if craft=='spirit' and fp.get('viewport')==[960,540]:
                        assert 385<=fp['left'] and fp['right']<=948, f'Spirit wing overlaps text or clips screen: {fp}'
                    assert fp.get('viewport',[0,0])[0]>0 and fp['viewport'][1]>0
                assert case['hangarAirframe']==craft,f'hangar shows wrong aircraft: {case}'
                page.screenshot(path=str(QA/f'FULL_HANGAR_{craft.upper()}.png'),animations='disabled')
                page.evaluate('()=>window.REDLINE_E2E.launch()')
                page.wait_for_function("window.REDLINE_E2E?.status()?.screen==='race'",timeout=30000)
                # SwiftShader may render only a few complex frames per wall-clock
                # second. Advance the *real* production fixed-step simulation
                # during the countdown rather than waiting for 64 slow rAF draws.
                countdown = page.evaluate('''() => {
                  if (typeof window.redlineSimulateFrame !== 'function') throw Error('real 60Hz simulation unavailable');
                  let steps=0;
                  while (window.REDLINE_UI_STATUS()?.mode==='count' && steps<100) {
                    window.redlineSimulateFrame(.05); steps++;
                  }
                  return {steps,mode:window.REDLINE_UI_STATUS()?.mode,tick:window.REDLINE_SIM_STATE?.()?.tick};
                }''')
                case['countdown']=countdown
                assert countdown['mode']=='run',f'countdown failed in real simulation: {countdown}'
                page.wait_for_function('window.REDLINE_E2E?.status()?.renderer?.drawCalls>0', timeout=30000)
                before=page.evaluate('()=>window.REDLINE_E2E.status()')
                assert before['simulation'] and before['renderer'],f'no game simulation or render state: {craft}'
                page.keyboard.down('w')
                page.evaluate('''() => {
                  for(let i=0;i<30;i++) window.redlineSimulateFrame(.05);
                }''')
                page.keyboard.up('w')
                page.wait_for_timeout(350)
                after=page.evaluate('()=>window.REDLINE_E2E.status()')
                case['tickDelta']=after['simulation']['tick']-before['simulation']['tick']
                case['drawCalls']=after['renderer']['drawCalls']
                case['triangles']=after['renderer']['triangles']
                case['craftMotion']=sum(abs(after['simulation']['craft'][k]-before['simulation']['craft'][k]) for k in ('x','y','z'))
                assert case['tickDelta']>=25,f'fixed-tick game did not advance: {craft}: {case}'
                assert case['drawCalls']>0 and case['triangles']>0, f'3D render was empty: {craft}: {case}'
                assert case['craftMotion']>0.05,f'no flight motion under thrust: {craft}: {case}'
                page.screenshot(path=str(QA/f'FULL_CHASE_{craft.upper()}.png'),animations='disabled')
                # The production P control updates both flight camera and FPV CSS.
                # Do not set config.view alone; it bypasses the real UI transition.
                page.keyboard.press('p')
                page.wait_for_function("document.body.classList.contains('rl-cockpit')",timeout=10000)
                # Draw the real scene immediately; software WebGL can be far
                # slower than real-time at 1600x900 on CI hosts.
                page.evaluate('()=>window.redlineRenderInterpolated(1/60,0)')
                page.wait_for_timeout(250)
                page.screenshot(path=str(QA/f'FULL_FPV_{craft.upper()}.png'),animations='disabled')
                case['fpvClass']=page.evaluate('()=>document.body.className')
                assert 'rl-cockpit' in case['fpvClass'],f'FPV class not activated: {craft}'
                expected_class={'kestrel':'rl67-kestrel-cockpit','blade':'rl65-blade-cockpit','copper':'rl62-tie-cockpit','spirit':'rl63-spirit-cockpit'}[craft]
                assert expected_class in case['fpvClass'],f'Incorrect FPV cockpit: {craft}: {case["fpvClass"]}'
                case['hudVisible']=page.evaluate('''()=>{
                   const candidates=['rl74FpvHud','rl70TieHud','rl63SpiritDeck','rl65BladeDash','rl67KestrelPhoto'];
                   return candidates.filter(id=>{const el=document.getElementById(id);return el&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'})}''')
                # Use the *actual* instrument IDs. Checking unrelated legacy
                # ids incorrectly reported that three live cockpit panels were absent.
                case['liveHud']=page.evaluate('''(name)=>{
                  const cap=name[0].toUpperCase()+name.slice(1);
                  const ids=name==='copper'
                    ? ['rl70TieHud','rl70Speed','rl70Alt','rl70Boost']
                    : ['rl74'+cap,'v74'+cap+'Speed','v74'+cap+'Alt','v74'+cap+'Boost'];
                  const [root,speed,alt,boost]=ids.map(id=>document.getElementById(id));
                  const rect=root?.getBoundingClientRect();
                  return {ids,visible:!!root&&getComputedStyle(root).display!=='none'&&rect.width>0&&rect.height>0,
                    speed:Number(speed?.textContent),altitude:Number(alt?.textContent),
                    boost:boost?.textContent||'',live:root?.dataset?.live||null};
                }''',craft)
                assert case['liveHud']['visible'],f'cockpit overlay missing in real FPV: {craft}: {case["liveHud"]}'
                assert case['liveHud']['speed']>0,f'speed is not wired to live flight state: {craft}: {case["liveHud"]}'
                assert case['liveHud']['altitude']>=0,f'altitude invalid: {craft}: {case["liveHud"]}'
                assert '%' in case['liveHud']['boost'],f'boost readout missing: {craft}: {case["liveHud"]}'
                assert not after['fatal'],f'fatal game error: {craft}: {after["fatal"]}'
                # Confirm scene continued in FPV.
                afterFpv=page.evaluate('()=>window.REDLINE_E2E.status()')
                assert afterFpv['simulation']['tick']>=after['simulation']['tick'], 'simulation regressed'
                # Verify the panel comes from the same authoritative fixed-step state,
                # not baked-in artwork or a second, independently changing counter.
                if afterFpv['simulation'].get('craft'):
                    sim=afterFpv['simulation']['craft']
                    case['instrumentError']={
                      'speed':abs(case['liveHud']['speed']-sim['speed']),
                      'altitude':abs(case['liveHud']['altitude']-sim['altitude']),
                    }
                    assert case['instrumentError']['speed']<=30,f'FPV speed stale or disconnected: {craft}: {case["instrumentError"]}'
                    assert case['instrumentError']['altitude']<=20,f'FPV altitude stale or disconnected: {craft}: {case["instrumentError"]}'
                case['reticleClear']=page.evaluate('''()=>{
                  const c=document.getElementById('rlReticle'), m=document.getElementById('maphud');
                  if(!c||!m)return false;
                  const a=c.getBoundingClientRect(),b=m.getBoundingClientRect();
                  return a.right<b.left||b.right<a.left||a.bottom<b.top||b.bottom<a.top;
                }''')
                assert case['reticleClear'],f'minimap overlaps central aiming reticle for {craft}'
                page.keyboard.press('p')
                page.wait_for_function("!document.body.classList.contains('rl-cockpit')",timeout=10000)
                case['state']='PASS'
            except Exception as exc:
                case['state']='FAIL';case['error']=str(exc)
                try:page.screenshot(path=str(QA/f'FULL_FAILURE_{craft.upper()}.png'))
                except Exception:pass
                report['cases'].append(case)
                raise
            report['cases'].append(case)
            page.evaluate('()=>window.REDLINE_E2E.screen("landing")')
            page.wait_for_timeout(450)
        assert not report['errors'], 'uncaught page exceptions: '+str(report['errors'][:5])
        report['state']='PASS'
except Exception as exc:
    reason=str(exc)
    report['state']='BLOCKED' if 'ERR_BLOCKED_BY_ADMINISTRATOR' in reason else 'FAIL'
    report['reason']=reason[:1600]
    report['traceback']=traceback.format_exc()[-4500:]
finally:
    if browser:
        try:browser.close()
        except Exception:pass
    server.shutdown()
    (QA/'FULL_GAME_E2E_REPORT.json').write_text(json.dumps(report,indent=2))
    print(json.dumps({k:v for k,v in report.items() if k!='traceback'},indent=2)[:8000])
sys.exit(0 if report['state']=='PASS' else 2)