#!/usr/bin/env python3
"""Lossless-source REDLINE packaging. No network calls or JavaScript AST rewriting.
From a frozen v77, produce separate browser resources and a complete standalone HTML.
"""
from pathlib import Path
import json,re,shutil,hashlib,os
ROOT=Path(__file__).resolve().parent
DIST=ROOT/'dist'
THREE_VARIANT=os.environ.get('REDLINE_THREE_VARIANT','r128')
COMPACT_ASSETS=os.environ.get('REDLINE_COMPACT','0')=='1' and THREE_VARIANT=='r187'
if THREE_VARIANT not in ('r128','r187'):
 raise RuntimeError('Unknown renderer variant: '+THREE_VARIANT)
SITE_ROOT=DIST/('site-r187-compact' if COMPACT_ASSETS else ('site-r187' if THREE_VARIANT=='r187' else 'site'))
m=json.loads((ROOT/'manifest.json').read_text())
img={f'{{{{REDLINE_ASSET_{x["sha256"][:14]}}}}}':x for x in m['image_assets']}
styles={x['path']:x for x in m['style_modules']}
scripts={x['path']:x for x in m['script_modules']}
template=(ROOT/'template.html').read_text()
asset_cache={}
compact_manifest=[]

def asset_content(index,info):
 key=info['sha256']
 if key in asset_cache:return asset_cache[key]
 data=(ROOT/'assets/images'/info['name']).read_bytes()
 mime=info['type']
 name=info['name']
 if COMPACT_ASSETS:
  from tools.compact_image_assets import optimize_image
  out,mime,changed=optimize_image(index,data,mime)
  if changed:
   data=out
   name='v80-'+key[:14]+'.webp'
   compact_manifest.append({'index':index,'name':name,'original_bytes':info['bytes'],'compressed_bytes':len(data)})
 asset_cache[key]=(name,mime,data)
 return asset_cache[key]
THREE_R128_URL='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
THREE_CANDIDATES=([ROOT/'vendor/three.r187.compat.js'] if THREE_VARIANT=='r187' else
 [ROOT/'vendor/three.r128.min.js', ROOT/'node_modules/three/build/three.min.js'])
def available_three():
    for p in THREE_CANDIDATES:
        if p.is_file():
            data=p.read_text()
            if THREE_VARIANT=='r128' and ('REVISION' not in data or '128' not in data[:5000]):
                raise RuntimeError('Unexpected Three.js bundle; expected pinned r128: '+str(p))
            if THREE_VARIANT=='r187' and len(data)<100000:
                raise RuntimeError('Modern renderer bundle missing or unexpectedly small')
            return p, data
    if os.environ.get('REDLINE_REQUIRE_VENDOR') == '1':
        raise RuntimeError('Missing renderer: '+THREE_VARIANT+'. Run npm install, then node tools/build-modern-renderer.cjs for r187.')
    return None,None


def fill(source,mode,kind):
 for index,(token,info) in enumerate(img.items()):
  if token not in source:continue
  name,mime,data=asset_content(index,info)
  if mode=='standalone':
   import base64
   val=f'data:image/{mime};base64,'+base64.b64encode(data).decode('ascii')
  else:
   prefix='../../' if kind=='style' else ''
   val=prefix+'assets/images/'+name
  source=source.replace(token,val)
 return source

def script_attrs(attrs):
 return ''.join(f' {k}="{v}"' for k,v in attrs.items() if k!='src')

def build(mode):
 assert mode in ('standalone','site')
 output=template
 three_path,three_src=available_three()
 # The first 35 styles are contiguous in template.html: combine them
 # without changing their order or the later 035/999 cascade positions.
 # This reduces dozens of blocking CSS requests to one in hosted builds.
 if mode=='site':
  core_css='\n'.join(fill((ROOT/'src'/p).read_text(),mode,'style')
    for p in styles if int(p.split('/')[-1][:3])<35)
  target=SITE_ROOT/'src/styles/000_redline-core-bundle.css'
  target.parent.mkdir(parents=True,exist_ok=True)
  target.write_text(core_css)
 for path,meta in styles.items():
  payload=fill((ROOT/'src'/path).read_text(),mode,'style')
  slot=f'<!-- REDLINE_MODULE_STYLE_{path} -->'
  if mode=='standalone':tag=f'<style{script_attrs(meta["attrs"])}>{payload}</style>'
  elif int(path.split('/')[-1][:3])<35:
   tag='<link rel="stylesheet" href="src/styles/000_redline-core-bundle.css">' if path.startswith('styles/000_') else ''
  else:
   dest=SITE_ROOT/'src'/path;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(payload)
   tag=f'<link rel="stylesheet" href="src/{path}">'
  assert slot in output,path
  output=output.replace(slot,tag,1)
 for path,meta in scripts.items():
  payload=fill((ROOT/'src'/path).read_text(),mode,'script')
  slot=f'<!-- REDLINE_MODULE_SCRIPT_{path} -->'
  attrs=meta['attrs']
  # Two asset-data scripts are read via textContent by the v77 loader; keep
  # them in the output HTML until an async streaming decoder can be tested.
  if attrs.get('src') == THREE_R128_URL and three_src:
   if mode=='standalone':
    tag=f'<script data-redline-three="{THREE_VARIANT}">'+three_src.replace('</script','<\\/script')+'</script>'
   else:
    vendor_dest=SITE_ROOT/'vendor'/('three.r187.compat.js' if THREE_VARIANT=='r187' else 'three.r128.min.js')
    vendor_dest.parent.mkdir(parents=True,exist_ok=True)
    vendor_dest.write_text(three_src)
    tag=f'<script src="vendor/{vendor_dest.name}" data-redline-three="{THREE_VARIANT}"></script>'
  elif meta['kind']=='data' or mode=='standalone':
   tag=f'<script{script_attrs(attrs)}'+(f' src="{attrs["src"]}"' if attrs.get('src') else '')+f'>{payload}</script>'
  elif attrs.get('src'):
   tag=f'<script{script_attrs(attrs)} src="{attrs["src"]}"></script>'
  else:
   dest=SITE_ROOT/'src'/path;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(payload)
   tag=f'<script{script_attrs(attrs)} src="src/{path}"></script>'
  assert slot in output,path
  output=output.replace(slot,tag,1)
 # New foundational modules live at end of body after all existing game features.
 if mode=='standalone':
  css=fill((ROOT/'src/styles/999_stage1_authority.css').read_text(),mode,'style')
  js=fill((ROOT/'src/scripts/999_stage1_diagnostics.js').read_text(),mode,'script')
  addition=f'\n<style id="redline-stage1-authority">{css}</style>\n<script id="redline-stage1-diagnostics">{js}</script>\n'
 else:
  css_dest=SITE_ROOT/'src/styles/999_stage1_authority.css';css_dest.write_text(fill((ROOT/'src/styles/999_stage1_authority.css').read_text(),mode,'style'))
  js_dest=SITE_ROOT/'src/scripts/999_stage1_diagnostics.js';js_dest.write_text(fill((ROOT/'src/scripts/999_stage1_diagnostics.js').read_text(),mode,'script'))
  addition='\n<link rel="stylesheet" href="src/styles/999_stage1_authority.css">\n<script src="src/scripts/999_stage1_diagnostics.js"></script>\n'
 assert '</body>' in output
 output=output.replace('</body>',addition+'</body>')
 assert '<!-- REDLINE_MODULE_' not in output
 return output

def main():
 DIST.mkdir(parents=True,exist_ok=True)
 if SITE_ROOT.exists():shutil.rmtree(SITE_ROOT) # no stale CSS/JS from prior variants
 html_name='REDLINE_v81_FULLSCREEN_CONTROLS_FPV.html' if COMPACT_ASSETS else ('REDLINE_v78_R187_CANDIDATE.html' if THREE_VARIANT=='r187' else 'REDLINE_v78_STAGE1_STANDALONE.html')
 (DIST/html_name).write_text(build('standalone'))
 site=SITE_ROOT;site.mkdir(exist_ok=True)
 (site/'index.html').write_text(build('site'))
 shutil.copytree(ROOT/'assets',site/'assets',dirs_exist_ok=True)
 if COMPACT_ASSETS:
  for index,info in enumerate(img.values()):
   name,mime,data=asset_content(index,info)
   if name != info['name']:(site/'assets/images'/name).write_bytes(data)
 # Optionally preserve external model data inside HTML only for now.
 result={
  'baseline_sha256':m['baseline_sha256'],
  'standalone_sha256':hashlib.sha256((DIST/html_name).read_bytes()).hexdigest(),
  'site_html_sha256':hashlib.sha256((site/'index.html').read_bytes()).hexdigest(),
  'standalone_bytes':(DIST/html_name).stat().st_size,
  'site_index_bytes':(site/'index.html').stat().st_size,
  'script_modules':len(m['script_modules']),
  'css_modules':len(m['style_modules']),
  'separate_image_assets':len(m['image_assets']),
  'three_dependency':str(available_three()[0]) if available_three()[0] else 'CDN fallback (not offline)',
  'offline_three_bundled':bool(available_three()[0])
 }
 result['renderer_variant']=THREE_VARIANT
 result['compact_assets']=COMPACT_ASSETS
 result['image_reduction_bytes']=sum(x['original_bytes']-x['compressed_bytes'] for x in compact_manifest)
 result['optimized_image_count']=len(compact_manifest)
 (DIST/('BUILD_V81_REPORT.json' if COMPACT_ASSETS else ('BUILD_R187_REPORT.json' if THREE_VARIANT=='r187' else 'BUILD_REPORT.json'))).write_text(json.dumps(result,indent=2))
 print(json.dumps(result,indent=2))
if __name__=='__main__':main()
