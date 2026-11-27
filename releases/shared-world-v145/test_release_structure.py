"""Static integration checks for the exact uploaded v139 source + authority cutover."""
from pathlib import Path
import hashlib
from patch_v139_single_world import patch
root=Path(__file__).parent
original=(root/'original/REDLINE_v139_DEPLOY/index.html').read_text()
client=(root/'site/shared_world_client.js').read_text()
html=(root/'site/index.html').read_text()
assert html == patch(original,client), 'generated game differs from source-plus-patch'
checks=0
def verify(ok,name):
 global checks
 assert ok,name
 checks+=1
verify('window.REDLINE_AUTHORITY_WSS' in (root/'site/authority-config.js').read_text(),'explicit endpoint')
verify('REDLINE_SHARED_WORLD=createRedlineSharedWorld()' in html,'shared online mode')
verify('REDLINE_SHARED_WORLD.racing){' in html,'online local update bypass')
verify('SHARED.connect(cred,room' in html,'lobby gateway cutover')
verify('SHARED.start()' in html,'host start via authority')
verify('SHARED.queueAbility' in html,'online combat input routed to authority')
verify('if(SHARED.enabled)return;' in html,'old finish/broadcast bypass')
verify('resultsOverlay(msg)' in html,'server-verified results')
verify('Every aircraft, including the local one, is drawn against the SAME tick.' in html,'shared tick local and remote interpolation')
verify('oldLayer' not in client and "send('pose'" not in client,'no local pose publication')
verify('input:{seq:++state.seq,...cmd}' in client,'client controls not poses')
verify('new WebSocket(url)' in client,'persistent WSS transport')
verify('state.world!==m.world' in client,'reject wrong world on reconnect')
verify('TERRAIN MESH MISMATCH' in client,'reject missing or mismatched authority collision hash')
verify('REDLINE_WORLD' in client and 'COURSE NOT LOADED' in client,'course check')
verify('redlineUI.config.bots=0' in client,'no parallel client AI simulation')
verify('redline_authority_claim_v145' in (root/'authority/server.py').read_text(),'single authority lease claim')
verify('redline_authority_heartbeat_v145' in (root/'authority/server.py').read_text(),'lease heartbeat')
verify('redline_authority_matches_v140' in (root/'authority/server.py').read_text(),'result ledger adapter')
original_pack=(root/'original/REDLINE_v139_DEPLOY/iron-tide.pack').read_bytes()
pack=(root/'site/iron-tide.pack').read_bytes()
verify(hashlib.sha256(original_pack).digest()==hashlib.sha256(pack).digest(),'binary course preserved')
verify('REDLINE_MODEL_TEMPLATE' in html,'original aircraft assets preserved')
verify('createIronCollisions' in html,'original Iron render collision source preserved')
verify('CLIFF_COLLIDER' in html,'original Grand render collision source preserved')
for course, expected in [('grand',281300),('iron',2836700)]:
 import json
 path=root/'authority/collision_exports'
 meta=json.loads((path/(course+'.json')).read_text())
 verify(meta['course']==course and meta['float32_triangles']==expected,course+' extracted source triangle count')
 verify((path/(course+'.f32.gz')).is_file(),course+' packaged collision binary')
print({'integration_static_assertions':checks,'original_source_sha256':hashlib.sha256(original.encode()).hexdigest(),'patched_html_sha256':hashlib.sha256(html.encode()).hexdigest(),'source_colliders_exported_to_server':True,'browser_3d_verified':False,'original_static_collider_exports_verified':True})
