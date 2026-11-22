#!/usr/bin/env python3
"""Lossless-source REDLINE packaging. No network calls or JavaScript AST rewriting.
From a frozen v77, produce separate browser resources and a complete standalone HTML.
"""
from pathlib import Path
import json,re,shutil,hashlib,os
ROOT=Path(__file__).resolve().parent
DIST=ROOT/'dist'
m=json.loads((ROOT/'manifest.json').read_text())
img={f'{{{{REDLINE_ASSET_{x["sha256"][:14]}}}}}':x for x in m['image_assets']}
styles={x['path']:x for x in m['style_modules']}
scripts={x['path']:x for x in m['script_modules']}
template=(ROOT/'template.html').read_text()
THREE_R128_URL='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
THREE_CANDIDATES=[ROOT/'vendor/three.r128.min.js', ROOT/'node_modules/three/build/three.min.js']
def available_three():
    for p in THREE_CANDIDATES:
        if p.is_file():
            data=p.read_text()
            if 'REVISION' not in data or '128' not in data[:5000]:
                raise RuntimeError('Unexpected Three.js bundle; expected pinned revision r128: '+str(p))
            return p, data
    if os.environ.get('REDLINE_REQUIRE_VENDOR') == '1':
        raise RuntimeError('Missing pinned Three.js r128 dependency. Run: npm install --ignore-scripts')
    return None,None


def fill(source,mode,kind):
 for token,info in img.items():
  if token not in source:continue
  if mode=='standalone':
   import base64
   data=(ROOT/'assets/images'/info['name']).read_bytes()
   val=f'data:image/{info["type"]};base64,'+base64.b64encode(data).decode('ascii')
  else:
   prefix='../../' if kind=='style' else ''
   val=prefix+'assets/images/'+info['name']
  source=source.replace(token,val)
 return source

def script_attrs(attrs):
 return ''.join(f' {k}="{v}"' for k,v in attrs.items() if k!='src')

def build(mode):
 assert mode in ('standalone','site')
 output=template
 three_path,three_src=available_three()
 for path,meta in styles.items():
  payload=fill((ROOT/'src'/path).read_text(),mode,'style')
  slot=f'<!-- REDLINE_MODULE_STYLE_{path} -->'
  if mode=='standalone':tag=f'<style{script_attrs(meta["attrs"])}>{payload}</style>'
  else:
   dest=DIST/'site/src'/path;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(payload)
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
    tag='<script data-redline-three="r128">'+three_src.replace('</script','<\\/script')+'</script>'
   else:
    vendor_dest=DIST/'site/vendor/three.r128.min.js';vendor_dest.parent.mkdir(parents=True,exist_ok=True)
    vendor_dest.write_text(three_src)
    tag='<script src="vendor/three.r128.min.js" data-redline-three="r128"></script>'
  elif meta['kind']=='data' or mode=='standalone':
   tag=f'<script{script_attrs(attrs)}'+(f' src="{attrs["src"]}"' if attrs.get('src') else '')+f'>{payload}</script>'
  elif attrs.get('src'):
   tag=f'<script{script_attrs(attrs)} src="{attrs["src"]}"></script>'
  else:
   dest=DIST/'site/src'/path;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(payload)
   tag=f'<script{script_attrs(attrs)} src="src/{path}"></script>'
  assert slot in output,path
  output=output.replace(slot,tag,1)
 # New foundational modules live at end of body after all existing game features.
 if mode=='standalone':
  css=fill((ROOT/'src/styles/999_stage1_authority.css').read_text(),mode,'style')
  js=fill((ROOT/'src/scripts/999_stage1_diagnostics.js').read_text(),mode,'script')
  addition=f'\n<style id="redline-stage1-authority">{css}</style>\n<script id="redline-stage1-diagnostics">{js}</script>\n'
 else:
  css_dest=DIST/'site/src/styles/999_stage1_authority.css';css_dest.write_text(fill((ROOT/'src/styles/999_stage1_authority.css').read_text(),mode,'style'))
  js_dest=DIST/'site/src/scripts/999_stage1_diagnostics.js';js_dest.write_text(fill((ROOT/'src/scripts/999_stage1_diagnostics.js').read_text(),mode,'script'))
  addition='\n<link rel="stylesheet" href="src/styles/999_stage1_authority.css">\n<script src="src/scripts/999_stage1_diagnostics.js"></script>\n'
 assert '</body>' in output
 output=output.replace('</body>',addition+'</body>')
 assert '<!-- REDLINE_MODULE_' not in output
 return output

def main():
 DIST.mkdir(parents=True,exist_ok=True)
 (DIST/'REDLINE_v78_STAGE1_STANDALONE.html').write_text(build('standalone'))
 site=DIST/'site';site.mkdir(exist_ok=True)
 (site/'index.html').write_text(build('site'))
 shutil.copytree(ROOT/'assets',site/'assets',dirs_exist_ok=True)
 # Optionally preserve external model data inside HTML only for now.
 result={
  'baseline_sha256':m['baseline_sha256'],
  'standalone_sha256':hashlib.sha256((DIST/'REDLINE_v78_STAGE1_STANDALONE.html').read_bytes()).hexdigest(),
  'site_html_sha256':hashlib.sha256((site/'index.html').read_bytes()).hexdigest(),
  'standalone_bytes':(DIST/'REDLINE_v78_STAGE1_STANDALONE.html').stat().st_size,
  'site_index_bytes':(site/'index.html').stat().st_size,
  'script_modules':len(m['script_modules']),
  'css_modules':len(m['style_modules']),
  'separate_image_assets':len(m['image_assets']),
  'three_dependency':str(available_three()[0]) if available_three()[0] else 'CDN fallback (not offline)',
  'offline_three_bundled':bool(available_three()[0])
 }
 (DIST/'BUILD_REPORT.json').write_text(json.dumps(result,indent=2))
 print(json.dumps(result,indent=2))
if __name__=='__main__':main()
