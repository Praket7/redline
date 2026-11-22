#!/usr/bin/env python3
"""Strict structural GLB validation plus conservative artistic quality warnings."""
from pathlib import Path
import re,base64,gzip,json,struct,hashlib
ROOT=Path(__file__).resolve().parent
models=[('Kestrel','scripts/022_module.js','GLB_B64'),('Blade','scripts/023_module.js','REDLINE_BLADE_B64'),('Copper','data/024_redlineCopperDeferred.js','REDLINE_COPPER_B64'),('Spirit','data/026_redlineSpiritDeferred.js','REDLINE_SPIRIT_B64')]
report={}
for name,file,key in models:
 code=(ROOT/'src'/file).read_text();m=re.search(r'const\s+'+key+r'="([A-Za-z0-9+/=]+)"',code)
 assert m,('Missing model',name)
 raw=gzip.decompress(base64.b64decode(m[1]));assert raw[:4]==b'glTF',name
 version,total=struct.unpack_from('<II',raw,4);assert version==2 and total==len(raw),name
 chunk_len,chunk_name=struct.unpack_from('<I4s',raw,12);assert chunk_name==b'JSON'
 gltf=json.loads(raw[20:20+chunk_len]);assert gltf['meshes']
 accessors=gltf.get('accessors',[]); materials=gltf.get('materials',[]);warnings=[]
 meshes=0;primitives=0;vertices=0;missing_normals=0;missing_uv=0;estimated_triangles=0
 for mesh in gltf['meshes']:
  meshes+=1
  for prim in mesh['primitives']:
   primitives+=1;assert 'POSITION' in prim.get('attributes',{}),(name,'position missing')
   pidx=prim['attributes']['POSITION'];assert 0<=pidx<len(accessors)
   verts=accessors[pidx].get('count',0);vertices+=verts
   missing_normals+=int('NORMAL' not in prim['attributes']);missing_uv+=int('TEXCOORD_0' not in prim['attributes'])
   mindex=prim.get('material');assert mindex is None or 0<=mindex<len(materials)
   if prim.get('mode',4)==4:estimated_triangles+=(accessors[prim['indices']]['count'] if 'indices' in prim else verts)//3
 for idx,mat in enumerate(materials):
  rough=mat.get('pbrMetallicRoughness',{}).get('roughnessFactor',1)
  metal=mat.get('pbrMetallicRoughness',{}).get('metallicFactor',1)
  if not(0<=rough<=1 and 0<=metal<=1):warnings.append(f'material {idx}: invalid roughness/metallic')
 if missing_normals:warnings.append(f'{missing_normals} primitives missing NORMAL attribute (may be procedural intentionally)')
 if missing_uv:warnings.append(f'{missing_uv} primitives missing TEXCOORD_0 (may be procedural intentionally)')
 out={'glb_sha256':hashlib.sha256(raw).hexdigest(),'glb_bytes':len(raw),'meshes':meshes,'primitives':primitives,'vertices':vertices,'estimated_triangles':estimated_triangles,'materials':len(materials),'textures':len(gltf.get('textures',[])),'embedded_images':len(gltf.get('images',[])),'warnings':warnings,'structural_validation':'PASS'}
 report[name]=out
 print(name,out)
(ROOT/'qa/MODEL_AUDIT.json').write_text(json.dumps(report,indent=2))
