#!/usr/bin/env python3
"""Compare two real-renderer Raven Slalom captures from the same fixed camera.
Records quantitative differences and fails only obviously blank/damaged images.
Dynamic sky/water/AI frames are not pixel-deterministic, so full-scene pixel
identity is NOT an acceptance gate.
"""
from pathlib import Path
import json,math
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1]
qa=root/'qa'
a=qa/'SHOWCASE_RAVEN_SLALOM_R128.png'
b=qa/'SHOWCASE_RAVEN_SLALOM_R187.png'
if not (a.is_file() and b.is_file()):
    raise SystemExit('Missing real r128/r187 WebGL captures')
x=np.array(Image.open(a).convert('RGB'),dtype=np.float32)
y=np.array(Image.open(b).convert('RGB'),dtype=np.float32)
if x.shape!=y.shape:raise SystemExit('Camera/view dimensions differ')
mae=float(np.abs(x-y).mean())
mse=float(np.square(x-y).mean())
rmse=math.sqrt(mse)
psnr=round(20*math.log10(255/max(rmse,1e-8)),3)
dx=np.abs(np.diff(y,axis=0)).mean()+np.abs(np.diff(y,axis=1)).mean()
result={'reference':'r128','candidate':'r187','shape':list(x.shape),'mean_abs_difference':round(mae,3),
        'psnr_db':psnr,'candidate_mean_luma':round(float(y.mean()),3),
        'candidate_edge_activity':round(float(dx),3),'reference_mean_luma':round(float(x.mean()),3),
        'model':'same fixed camera; lighting/timing still dynamic'}
(qa/'RENDERER_COMPARE.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
# Diagnose broken/blank scenes, without asserting that different PBR engines
# must produce pixel-identical photos.
if result['candidate_edge_activity']<2 or result['candidate_mean_luma']<3:
    raise SystemExit('r187 scene likely blank or missing most geometry')
