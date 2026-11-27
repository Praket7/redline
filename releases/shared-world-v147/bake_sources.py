from pathlib import Path
def instrument(s):
    grand='return{addGeometry,addCylinderProxy,contact,castRay,stats:()=>({triangles:triangles.length,cells:buckets.size})};'
    grand_new='''return{addGeometry,addCylinderProxy,contact,castRay,stats:()=>({triangles:triangles.length,cells:buckets.size}),
  exportVertices:()=>{const active=triangles.filter(t=>!t.owner||t.owner.alive);const out=new Float32Array(active.length*9);for(let i=0;i<active.length;i++)out.set(active[i].v,i*9);return out;}};'''
    iron='return {add,contact,castRay,stats:()=>({collisionInstances:refs.length,collisionCells:cells.size,indexedTriangles:triangles})};'
    iron_new='''return {add,contact,castRay,stats:()=>({collisionInstances:refs.length,collisionCells:cells.size,indexedTriangles:triangles}),
  exportVertices:()=>{let lengths=0;const entries=[];for(const r of refs){const p=r.g.attributes.position,idx=r.g.index?.array,count=idx?.length||p.count;entries.push({r,p,idx,count});lengths+=count;}const out=new Float32Array(lengths*3);let at=0;const xyz=new T.Vector3();for(const e of entries){for(let j=0;j<e.count;j++){xyz.fromBufferAttribute(e.p,e.idx?e.idx[j]:j).applyMatrix4(e.r.m);out[at++]=xyz.x;out[at++]=xyz.y;out[at++]=xyz.z;}}return out.slice(0,at);}};'''
    anchor='window.REDLINE_V86_AUDIT=Object.freeze'
    diagnostic='''window.REDLINE_COLLISION_BAKE=()=>({course:IRON?'iron':'grand',revision:IRON?136:37,
  source:'REDLINE_v139_DEPLOY',triangles:(IRON?ironCollisions:CLIFF_COLLIDER)?.exportVertices(),
  heightfield:IRON?null:{ns:NS,nv:NV,cell:CELL,ws:WS,h:Array.from(H)},
  stats:IRON?ironCollisions?.stats():CLIFF_COLLIDER.stats()});
'''
    for old,new in [(grand,grand_new),(iron,iron_new),(anchor,diagnostic+anchor)]:
        if s.count(old)!=1:raise RuntimeError(f'bake source anchor expected once: {old[:60]}')
        s=s.replace(old,new)
    return s
