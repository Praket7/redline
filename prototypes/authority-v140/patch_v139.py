#!/usr/bin/env python3
"""Create a reversible, opt-in v139 shared-world inspection build.

The existing v139 HTML is not included in GitHub because it is a large,
user-owned standalone artifact. This patch adds no automatic network activity.
It preserves the input file and intentionally does NOT replace solo racing.
"""
from pathlib import Path
import argparse, hashlib

CLIFF_OLD="return{addGeometry,addCylinderProxy,contact,castRay,stats:()=>({triangles:triangles.length,cells:buckets.size})};"
CLIFF_NEW="return{addGeometry,addCylinderProxy,contact,castRay,stats:()=>({triangles:triangles.length,cells:buckets.size}),exportTriangles:()=>triangles.filter(t=>!t.owner||t.owner.alive).map(t=>t.v)};"
IRON_OLD="return {add,contact,castRay,stats:()=>({collisionInstances:refs.length,collisionCells:cells.size,indexedTriangles:triangles})};"
IRON_NEW="""return {add,contact,castRay,stats:()=>({collisionInstances:refs.length,collisionCells:cells.size,indexedTriangles:triangles}),
 exportTriangles:()=>{const out=[],a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
 for(const ref of refs){const pos=ref.g.attributes.position,ind=ref.g.index?.array,num=ind?.length||pos.count;
 for(let i=0;i<num;i+=3){const ia=ind?ind[i]:i,ib=ind?ind[i+1]:i+1,ic=ind?ind[i+2]:i+2;
 a.fromBufferAttribute(pos,ia).applyMatrix4(ref.m);b.fromBufferAttribute(pos,ib).applyMatrix4(ref.m);c.fromBufferAttribute(pos,ic).applyMatrix4(ref.m);
 if(a.distanceToSquared(b)<1e-10||b.distanceToSquared(c)<1e-10)continue;
 out.push([a.x,a.y,a.z,b.x,b.y,b.z,c.x,c.y,c.z]);}}
 return out;}};"""
EXPORT="""window.REDLINE_COLLIDER_EXPORT=()=>({source:'REDLINE CLIFF COLLIDER v139',course:IRON?'iron':'grand',revision:IRON?136:37,
 triangles:IRON?ironCollisions?.exportTriangles():CLIFF_COLLIDER.exportTriangles(),runtime:window.REDLINE_VERSION});
window.REDLINE_V142_SAVE=async()=>{
 const data=window.REDLINE_COLLIDER_EXPORT();
 if(!Array.isArray(data.triangles)||!data.triangles.length)throw Error('course collider not ready');
 const canonical=JSON.stringify(data.triangles),bytes=new TextEncoder().encode(canonical);
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 data.sha256=[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
 const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
 const a=document.createElement('a');a.download='redline_v139_'+data.course+'_collision.json';
 a.href=URL.createObjectURL(blob);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
 return {triangles:data.triangles.length,sha256:data.sha256};
};
"""
HOOK="""<script id="redline-v144-opt-in">
/* Lab-only adapter: preserves the original game and does not claim ranked authority. */
window.REDLINE_V144_ATTACH=function(config){
 if(window.REDLINE_V144_BRIDGE)window.REDLINE_V144_BRIDGE.dispose();
 const profile=(config&&config.model)||redlineActiveAirframe();
 const bridge=new window.REDLINE_THREE_CLIENT.Bridge({
   THREE,scene:S,hideLocal:true,flight:REDLINE_FLIGHT,
   settings:{thrust:P.t,agility:P.a,stability:P.s,handlingMode:'sport',ranked:false},
   modelFactory:(m)=>{
     const sources={kestrel:window.REDLINE_MODEL_TEMPLATE,blade:window.REDLINE_BLADE_TEMPLATE,
       copper:window.REDLINE_COPPER_TEMPLATE,spirit:window.REDLINE_SPIRIT_TEMPLATE};
     return sources[m]?.clone(true)||null;
   },
   input:()=>{
     const move=REDLINE_MOVE.vector();
     const touch=window.REDLINE_MOBILE_CONTROLS?.snapshot?.();
     return {throttle:touch?.enabled&&Math.abs(touch.throttle)>.001?touch.throttle:move.throttle,
       steer:REDLINE_MOUSE_ALT.held&&REDLINE_MOUSE_ALT.style==='classic'?REDLINE_MOUSE_ALT.steer:0,
       headingTarget:REDLINE_MOUSE_ALT.held&&REDLINE_MOUSE_ALT.style==='locked'?REDLINE_MOUSE_ALT.headingTarget:undefined,
       strafe:touch?.enabled&&Math.abs(touch.strafe)>.001?touch.strafe:move.strafe,
       lift:touch?.enabled&&touch.lift?touch.lift:REDLINE_BINDINGS.isDown(K,'climb')?1:REDLINE_BINDINGS.isDown(K,'descend')?-1:0,
       pitch:REDLINE_MOUSE_ALT.style==='locked'?REDLINE_MOUSE_ALT.pitch:st.pm,
       boost:REDLINE_BINDINGS.isDown(K,'boost')||!!touch?.boost,
       brake:REDLINE_BINDINGS.isDown(K,'brake')||!!touch?.brake,
       fire:!!touch?.fire,shield:false,emp:false};
   },
   onStatus:(event,detail)=>console.info('[REDLINE v144 lab]',event,detail||'')
 });
 window.REDLINE_V144_BRIDGE=bridge;
 bridge.connect({url:config.url,room:config.room,course:config.course,model:profile,name:config.name||'Pilot'});
 return bridge;
};
</script>
"""

def replace_once(source,needle,replacement):
    count=source.count(needle)
    if count!=1:raise ValueError(f"Expected one anchor, got {count}: {needle[:70]!r}")
    return source.replace(needle,replacement,1)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("original_html",type=Path)
    parser.add_argument("--output",type=Path,required=True)
    a=parser.parse_args()
    root=Path(__file__).resolve().parent
    source=a.original_html.read_text(encoding='utf-8')
    if "window.REDLINE_VERSION='v139'" not in source:raise ValueError("Requires exact v139 shared-world source")
    sha=hashlib.sha256(source.encode()).hexdigest()
    source=replace_once(source,CLIFF_OLD,CLIFF_NEW)
    source=replace_once(source,IRON_OLD,IRON_NEW)
    anchor="// Continuous distance-based racing line. Gates are validation only, never steering targets."
    source=replace_once(source,anchor,EXPORT+anchor)
    source=replace_once(source,"redlineRenderInterpolated(dt,stepResult.alpha);","window.REDLINE_V144_BRIDGE?.draw(n);\n    redlineRenderInterpolated(dt,stepResult.alpha);")
    netcode=(root/"netcode.cjs").read_text()
    bridge=(root/"three_client.js").read_text()
    source=replace_once(source,"</body>",f"<script id='redline-netcode-v144'>{netcode}</script><script id='redline-three-v143'>{bridge}</script>{HOOK}</body>")
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(source,encoding='utf-8')
    print(f"v139 base SHA-256: {sha}")
    print(f"Output: {a.output} ({a.output.stat().st_size:,} bytes)")
    print("Use REDLINE_V142_SAVE() only after the selected course has fully booted.")
    print("Use REDLINE_V144_ATTACH(config) for optional Three.js lab spectators; solo/ranked flow is unchanged.")
if __name__=="__main__":main()
