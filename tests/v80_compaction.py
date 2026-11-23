#!/usr/bin/env python3
"""Verify that compact packaging is materially smaller but all aircraft binary
geometry and alpha-channel cockpit imagery remain present and decodable."""
from pathlib import Path
from PIL import Image
from io import BytesIO
import re,base64,json,hashlib
ROOT=Path(__file__).resolve().parents[1]
src=(ROOT/'dist/REDLINE_v78_R187_CANDIDATE.html').read_text()
dst_path=ROOT/'dist/REDLINE_v80_LIGHTWEIGHT_HANGAR_PITCH.html'
out=dst_path.read_text()
rx=re.compile(r'data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=]{100,})')
base=list(rx.finditer(src));short=list(rx.finditer(out))
assert len(base)==len(short)==19,(len(base),len(short))
modified={1,4,5,6,16,17,18}
images=[]
for i,(old,new) in enumerate(zip(base,short)):
 a=base64.b64decode(old.group(2));b=base64.b64decode(new.group(2))
 with Image.open(BytesIO(b)) as im:
  im.verify()
 with Image.open(BytesIO(b)) as im:
  mode=im.mode;dimensions=im.size
 if i in modified:
  assert new.group(1)=='webp',i
  assert len(b)<len(a)*.88,(i,len(a),len(b))
  assert mode=='RGBA',('alpha missing',i,mode)
 else:
  assert a==b,('world/other asset unexpectedly changed',i)
 images.append({'index':i,'before':len(a),'after':len(b),'size':dimensions,'mode':mode})
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
