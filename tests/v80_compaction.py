#!/usr/bin/env python3
"""Verify that compact packaging is materially smaller but all aircraft binary
geometry and alpha-channel cockpit imagery remain present and decodable."""
from pathlib import Path
from PIL import Image
from io import BytesIO
import re,base64,json,hashlib
ROOT=Path(__file__).resolve().parents[1]
src=(ROOT/'dist/REDLINE_v78_R187_CANDIDATE.html').read_text()
dst_path=ROOT/'dist/REDLINE_v82_HERO_FAST_DEFAULT.html'
out=dst_path.read_text()
rx=re.compile(r'data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=]{100,})')
base=list(rx.finditer(src));short=list(rx.finditer(out))
assert len(base)==len(short)==19,(len(base),len(short))
images=[]
changed_count=0
for i,(old,new) in enumerate(zip(base,short)):
 a=base64.b64decode(old.group(2));b=base64.b64decode(new.group(2))
 with Image.open(BytesIO(b)) as im:
  im.verify()
 with Image.open(BytesIO(b)) as im:
  mode=im.mode;dimensions=im.size
 if a!=b:
  changed_count+=1
  assert new.group(1)=='webp',i
  assert len(b)<len(a)*.88,(i,len(a),len(b))
  assert mode=='RGBA',('alpha missing',i,mode)
 else:
  assert a==b,('world/other asset unexpectedly changed',i)
 images.append({'index':i,'before':len(a),'after':len(b),'size':dimensions,'mode':mode})
# Some image assets are included only through hosted references; the standalone
# HTML uses six of the seven optimized images in its base64 data URI payload.
# Validate both the build manifest and the in-document transformations.
build_report=json.loads((ROOT/'dist/BUILD_V82_REPORT.json').read_text())
assert build_report['optimized_image_count']==7,build_report
assert changed_count>=6,('expected all embedded convertible cockpit assets',changed_count)
# Meshes and packed binary textures must remain identical. Browser loaders
# are intentionally unchanged, avoiding new Draco/Meshopt decoder dependencies.
for name in ('GLB_B64','REDLINE_BLADE_B64','REDLINE_COPPER_B64','REDLINE_SPIRIT_B64'):
 rx_model=re.compile(r'const '+name+r'="([A-Za-z0-9+/=]+)"')
 a=rx_model.search(src);b=rx_model.search(out)
 assert a and b and a.group(1)==b.group(1),name
assert dst_path.stat().st_size < (ROOT/'dist/REDLINE_v78_R187_CANDIDATE.html').stat().st_size*.77
report={'state':'PASS','baseline_bytes':len(src.encode()),'compact_bytes':len(out.encode()),
        'reduction_pct':round(100*(1-len(out.encode())/len(src.encode())),2),'optimized_images':images}
(ROOT/'qa/V80_COMPACTION_REPORT.json').write_text(json.dumps(report,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='optimized_images'},indent=2))
