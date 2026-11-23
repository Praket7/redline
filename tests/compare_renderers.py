#!/usr/bin/env python3
"""Compare two real-renderer Raven Slalom captures from the same fixed camera.
Records quantitative differences and fails only obviously blank/damaged images.
Dynamic sky/water/AI frames are not pixel-deterministic, so full-scene pixel
identity is NOT an acceptance gate.
"""
from pathlib import Path
import json,math
from PIL import Image,ImageChops,ImageStat,ImageFilter
root=Path(__file__).resolve().parents[1]
qa=root/'qa'
a=qa/'SHOWCASE_RAVEN_SLALOM_R128.png'
b=qa/'SHOWCASE_RAVEN_SLALOM_R187.png'
if not (a.is_file() and b.is_file()):
    raise SystemExit('Missing real r128/r187 WebGL captures')
x=Image.open(a).convert('RGB')
y=Image.open(b).convert('RGB')
if x.size!=y.size:raise SystemExit('Camera/view dimensions differ')
stat=ImageStat.Stat(ImageChops.difference(x,y))
mae=sum(stat.mean)/3
rmse=math.sqrt(sum(v*v for v in stat.rms)/3)
psnr=round(20*math.log10(255/max(rmse,1e-8)),3)
edge=ImageStat.Stat(y.filter(ImageFilter.FIND_EDGES))
dx=sum(edge.stddev)/3
result={'reference':'r128','candidate':'r187','shape':[y.height,y.width,3],'mean_abs_difference':round(mae,3),
        'psnr_db':psnr,'candidate_mean_luma':round(sum(ImageStat.Stat(y).mean)/3,3),
        'candidate_edge_activity':round(dx,3),'reference_mean_luma':round(sum(ImageStat.Stat(x).mean)/3,3),
        'model':'same fixed camera; lighting/timing still dynamic'}
def cliff_coverage(im):
    w,h=im.size
    panel=im.crop((int(w*.05),int(h*.20),int(w*.23),int(h*.80)))
    colors=panel.getdata()
    count=sum(1 for red,green,blue in colors if red>green*1.18 and red>blue*1.2 and red>55)
    return count/(panel.width*panel.height)

result['r128_cliff_coverage']=round(cliff_coverage(x),3)
result['r187_cliff_coverage']=round(cliff_coverage(y),3)
(qa/'RENDERER_COMPARE.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
# Diagnose broken/blank scenes, without asserting that different PBR engines
# must produce pixel-identical photos.
if result['r128_cliff_coverage']>.5 and result['r187_cliff_coverage']<.4:
    raise SystemExit('MAJOR REGRESSION: canyon cliffs disappeared in modern renderer')
if result['candidate_edge_activity']<2 or result['candidate_mean_luma']<3:
    raise SystemExit('r187 scene likely blank or missing most geometry')
