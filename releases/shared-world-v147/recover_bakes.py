"""Rebuild original colliders from the exact deployed source. Fail closed on any hash drift."""
import asyncio, gzip, hashlib, json, pathlib, urllib.request, shutil
from playwright.async_api import async_playwright
from bake_sources import instrument
from ensure_three_utils import patch as fix_utils
ROOT=pathlib.Path(__file__).resolve().parent
SOURCE=ROOT/'original'
SOURCE.mkdir(exist_ok=True)
ORIGINS=['https://redlin3.vercel.app','https://redline-ee6pd8vtj-praket7-s-projects.vercel.app','https://redline-praket7-s-projects.vercel.app']
INPUTS={'index.html':'836bbd9b886168699661fe14b9452cd0693c24f54e2db2fe96cab9575e4198eb','iron-tide.pack':'4d8115faea7575e2cef2a27a3fa76d0d8d66d44e65ba67c6acd24d1ec2f4022a'}
EXPECTED={'grand':('eac5e7d34a3afdea842a1c3f42a755af797429846b027088a44219fef3e9136c',281300),'iron':('daccfc9e871a43ab0a45949f19aa521bf7980a1667ffb2d4b9ee5ceeff0c5ea5',2836700)}
def digest(data):return hashlib.sha256(data).hexdigest()
def fetch(name,expected):
    dest=SOURCE/name
    if dest.exists() and digest(dest.read_bytes())==expected:return
    suffixes=['/','/index.html','/src/index.html'] if name=='index.html' else ['/iron-tide.pack','/src/iron-tide.pack']
    for origin in ORIGINS:
        for suffix in suffixes:
            try:
                with urllib.request.urlopen(urllib.request.Request(origin+suffix,headers={'User-Agent':'REDLINE-release-recovery/1.0','Accept-Encoding':'identity'}),timeout=45) as r:
                    data=r.read(50*1024*1024)
                if digest(data)==expected:
                    dest.write_bytes(data);print('Original verified',name,flush=True);return
                print('Source hash mismatch',origin+suffix,len(data),flush=True)
            except Exception as e:print('Source unavailable',origin+suffix,type(e).__name__,flush=True)
    raise RuntimeError('Cannot recover exact original '+name)
async def bake(course):
    source=instrument(fix_utils((SOURCE/'index.html').read_text()))
    if course=='iron':
        changes=[("return ['raven','grand','iron'].includes(c)?c:'grand'}catch(_){return 'grand'}","return ['raven','grand','iron'].includes(c)?c:'iron'}catch(_){return 'iron'}"),('if(redlineUiBootSucceeded)setTimeout(v115Boot,20);','if(redlineUiBootSucceeded)window.__RL_START_BOOT=()=>v115Boot();'),('async function loadIronPack(){','async function loadIronPack(){if(window.RL133_BUILD_IRON)return;')]
        for a,b in changes:
            if source.count(a)!=1:raise RuntimeError('source anchor mismatch')
            source=source.replace(a,b)
        unpacked=ROOT/'iron_runtime.tmp.js'
        unpacked.write_bytes(gzip.decompress((SOURCE/'iron-tide.pack').read_bytes()))
    async with async_playwright() as p:
        br=await p.chromium.launch(headless=True,executable_path=shutil.which('chromium'),args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage'])
        page=await (await br.new_context(viewport={'width':760,'height':440},accept_downloads=True)).new_page()
        await page.set_content(source,wait_until='domcontentloaded',timeout=90000)
        if course=='iron':
            await page.add_script_tag(path=str(unpacked))
            await page.evaluate('() => {window.__RL_START_BOOT?.();return true}')
        await page.wait_for_function("['game-ready','hangar-ready'].includes(window.REDLINE_BOOT_PHASE)",timeout=120000)
        n=await page.evaluate("() => {const d=window.REDLINE_COLLISION_BAKE();window.__RL_EXPORT=d;return d.triangles.length/9}")
        expected,count=EXPECTED[course]
        if n!=count:raise RuntimeError(f'{course} triangle mismatch: {n}')
        async with page.expect_download(timeout=120000) as dl:
            await page.evaluate("() => {const a=document.createElement('a');a.download='mesh.f32';a.href=URL.createObjectURL(new Blob([window.__RL_EXPORT.triangles]));a.click()}")
        download=await dl.value
        out=ROOT/'authority/collision_exports';out.mkdir(parents=True,exist_ok=True)
        temp=out/(course+'.f32');await download.save_as(temp)
        raw=temp.read_bytes()
        if digest(raw)!=expected or len(raw)!=count*36:raise RuntimeError(f'{course} exact mesh hash mismatch: {digest(raw)}')
        meta=await page.evaluate("() => {const d=window.__RL_EXPORT;return {course:d.course,revision:d.revision,source:d.source,stats:d.stats,heightfield:d.heightfield}}")
        (out/(course+'.json')).write_text(json.dumps({**meta,'float32_sha256':expected,'float32_bytes':len(raw),'float32_triangles':count},separators=(',',':')))
        (out/(course+'.f32.gz')).write_bytes(gzip.compress(raw,compresslevel=6,mtime=0))
        temp.unlink()
        await br.close()
        if course=='iron':unpacked.unlink()
        print('Exact collider verified',course,count,expected,flush=True)
if __name__=='__main__':
    for name,expected in INPUTS.items():fetch(name,expected)
    for course in EXPECTED:asyncio.run(bake(course))
