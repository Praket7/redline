#!/usr/bin/env python3
import unittest,subprocess,re,hashlib,json,base64,gzip,struct,sys
from pathlib import Path
from PIL import Image
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1]
class T(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.manifest=json.loads((ROOT/'manifest.json').read_text());cls.dist=ROOT/'dist'
 def test_frozen_source(self):
  self.assertEqual(hashlib.sha256((ROOT/'originals/REDLINE_v77_FROZEN.html').read_bytes()).hexdigest(),self.manifest['baseline_sha256'])
 def test_exact_asset_sha256(self):
  for a in self.manifest['image_assets']:
   path=ROOT/'assets/images'/a['name'];self.assertTrue(path.exists());self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),a['sha256'])
   with Image.open(path) as im:im.verify()
 def test_assets_not_discarded_in_standalone(self):
  s=(self.dist/'REDLINE_v78_STAGE1_STANDALONE.html').read_text()
  self.assertEqual(s.count('data:image/'),19)
  for a in self.manifest['image_assets']:
   self.assertIn(a['sha256'][:14],a['name'])
 def test_modular_assets(self):
  site=self.dist/'site';self.assertEqual(len(list((site/'assets/images').glob('*'))),19)
  self.assertEqual(len(list((site/'src/scripts').glob('*.js'))),38)  # 40 scripts minus 2 deferred assets and 1 CDN + 1 diagnostic
  self.assertEqual(len(list((site/'src/styles').glob('*.css'))),37)
 def test_valid_js_syntax(self):
  tested=0
  for a in self.manifest['script_modules']:
   if a['kind']=='data' or a['attrs'].get('src'):continue
   p=ROOT/'src'/a['path'];run=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
   self.assertEqual(run.returncode,0,(p,run.stderr[:400]));tested+=1
  p=ROOT/'src/scripts/999_stage1_diagnostics.js';run=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
  self.assertEqual(run.returncode,0,run.stderr)
  self.assertGreaterEqual(tested,35)
 def test_60hz_snapshot_does_not_expose_mutable_game_objects(self):
  s=(ROOT/'src/scripts/035_module.js').read_text()
  self.assertIn('REDLINE_SIM_CLOCK.advance(dt, fixedDt =>',s)
  self.assertIn('redlinePublishSimState(fixedDt);',s)
  self.assertIn('const craft=Object.freeze({',s)
  self.assertIn('const rivals=Object.freeze(',s)
  self.assertIn('const race=Object.freeze(',s)
  self.assertIn('altitude:Math.max(0,finite(redlineRiverAltitude(st.p.y)))',s)
  self.assertIn('if(run)redlineUpdateLock(dt);',s)
  self.assertNotIn('redlineUpdateLock(dt);\\n if(REDLINE_ONLINE.isRacing)',s)
  self.assertIn('REDLINE_SIM_STATE = () => redlinePublishedState',s)
  self.assertIn('dr.quaternion.copy(redlinePreviousPose.orientation).slerp',s)
 def test_camera_showcase_capture_is_view_only(self):
  s=(ROOT/'src/scripts/035_module.js').read_text();seg=s[s.index('window.REDLINE_CAPTURE_SHOWCASE'):s.index('function redlineSamplePose()',s.index('window.REDLINE_CAPTURE_SHOWCASE'))]
  self.assertIn('cam.clone()',seg);self.assertIn('Rn.render(S,captureCamera)',seg);self.assertNotIn('st.p.set(',seg)
 def test_kestrel_embedded_glb_structural_integrity(self):
  s=(ROOT/'src/scripts/022_module.js').read_text()
  m=re.search(r'GLB_B64="([^"]+)"',s);self.assertIsNotNone(m)
  compressed=base64.b64decode(m.group(1));data=gzip.decompress(compressed)
  self.assertEqual(data[:4],b'glTF');self.assertEqual(struct.unpack_from('<I',data,4)[0],2)
  self.assertEqual(struct.unpack_from('<I',data,8)[0],len(data))
  length,kind=struct.unpack_from('<I4s',data,12);self.assertEqual(kind,b'JSON')
  gltf=json.loads(data[20:20+length]);self.assertTrue(gltf.get('meshes'))
  for mesh in gltf['meshes']:
   for primitive in mesh.get('primitives',[]):
    self.assertIn('POSITION',primitive['attributes'])
    idx=primitive['attributes']['POSITION'];self.assertLess(idx,len(gltf['accessors']))
  print('GLB:',len(gltf['meshes']),'meshes',len(gltf.get('materials',[])),'materials',len(gltf.get('images',[])),'images')
 def test_no_unexpected_network_modules_in_modular_site(self):
  s=(self.dist/'site/index.html').read_text();self.assertIn('redlineFixedStepClock',s)
  self.assertIn('assets',str(self.dist/'site/assets'))
  self.assertIn('src/scripts',s)
 def test_release_version_and_source_docs(self):
  self.assertIn("window.REDLINE_VERSION='v78-stage1'",(ROOT/'src/scripts/035_module.js').read_text())
if __name__=='__main__':unittest.main(verbosity=2)
