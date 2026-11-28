'use strict';
// REDLINE v146: offline-baked v139 world-space triangle collision snapshots.
// Vertices exported from the actual visual game's collider, not copied from visual-only meshes.
// Static geometry is an immutable authority asset; no client may upload or change it.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const CACHE=new Map(),CELL=64,EPS=1e-9;
const min=(a,b,c)=>Math.min(a,b,c),max=(a,b,c)=>Math.max(a,b,c);
const key=(x,z)=>x+','+z;
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
class Collider{
 constructor(course){
  const dir=path.join(__dirname,'collision_exports'),meta=JSON.parse(fs.readFileSync(path.join(dir,course+'.json'),'utf8'));
  if(meta.course!==course||meta.revision!==(course==='iron'?136:37)||meta.source!=='REDLINE_v139_DEPLOY')throw Error('collision source/revision mismatch');
  const packed=fs.readFileSync(path.join(dir,course+'.f32.gz')),raw=zlib.gunzipSync(packed);
  if(raw.byteLength!==meta.float32_bytes||crypto.createHash('sha256').update(raw).digest('hex')!==meta.float32_sha256)throw Error('collision mesh hash mismatch');
  if(raw.byteLength%36||!raw.byteLength||raw.byteLength/36!==meta.float32_triangles)throw Error('invalid collision triangle count');
  this.triangles=meta.float32_triangles;
  this.vertices=new Float32Array(raw.buffer,raw.byteOffset,raw.length/4);
  this.cells=new Map();this.oversized=[];this.marks=new Uint32Array(this.triangles);this.serial=0;
  this.bounds=new Float32Array(this.triangles*6);
  const counts=new Map();
  for(let i=0;i<this.triangles;i++){
   const j=i*9,a=this.vertices,b=i*6;
   const x0=min(a[j],a[j+3],a[j+6]),x1=max(a[j],a[j+3],a[j+6]);
   const y0=min(a[j+1],a[j+4],a[j+7]),y1=max(a[j+1],a[j+4],a[j+7]);
   const z0=min(a[j+2],a[j+5],a[j+8]),z1=max(a[j+2],a[j+5],a[j+8]);
   if(!Number.isFinite(x0+x1+y0+y1+z0+z1))throw Error('nonfinite collision vertices');
   this.bounds.set([x0,x1,y0,y1,z0,z1],b);
   const xL=Math.floor((x0-10)/CELL),xR=Math.floor((x1+10)/CELL),zL=Math.floor((z0-10)/CELL),zR=Math.floor((z1+10)/CELL);
   if((xR-xL+1)*(zR-zL+1)>256){this.oversized.push(i);continue;}
   for(let x=xL;x<=xR;x++)for(let z=zL;z<=zR;z++){
    const k=key(x,z);counts.set(k,(counts.get(k)||0)+1);
   }
  }
  for(const [k,n] of counts){this.cells.set(k,new Uint32Array(n));counts.set(k,0);}
  for(let i=0;i<this.triangles;i++){
   const b=i*6,a=this.bounds;
   const xL=Math.floor((a[b]-10)/CELL),xR=Math.floor((a[b+1]+10)/CELL),zL=Math.floor((a[b+4]-10)/CELL),zR=Math.floor((a[b+5]+10)/CELL);
   if((xR-xL+1)*(zR-zL+1)>256)continue;
   for(let x=xL;x<=xR;x++)for(let z=zL;z<=zR;z++){
    const k=key(x,z),at=counts.get(k);this.cells.get(k)[at]=i;counts.set(k,at+1);
   }
  }
  this.heightfield=meta.heightfield;this.course=course;this.metadata=meta;this.hash=meta.float32_sha256;this.hash=meta.float32_sha256;
 }
 _mark(){if(++this.serial>=0xfffffffe){this.marks.fill(0);this.serial=1;}return this.serial;}
 candidates(minX,maxX,minZ,maxZ,fn){
  const serial=this._mark();
  const visit=i=>{if(this.marks[i]!==serial){this.marks[i]=serial;fn(i);}};
  for(const i of this.oversized)visit(i);
  for(let x=Math.floor(minX/CELL);x<=Math.floor(maxX/CELL);x++)for(let z=Math.floor(minZ/CELL);z<=Math.floor(maxZ/CELL);z++){
   const list=this.cells.get(key(x,z));if(list)for(let i=0;i<list.length;i++)visit(list[i]);
  }
 }
 height(x,z){return this.floor(x,z);}
 height(x,z){return this.floor(x,z);}
 floor(x,z){
  if(this.course==='iron')return null; // iron ground uses authored route slabs
  const h=this.heightfield;const fx=clamp((x+h.ws/2)/h.cell,0,h.ns-.00001),fz=clamp((z+h.ws/2)/h.cell,0,h.ns-.00001);
  const i=clamp(Math.floor(fx),0,h.ns-1),j=clamp(Math.floor(fz),0,h.ns-1),a=fx-i,b=fz-j,v=h.h,n=h.nv;
  return (v[j*n+i]*(1-a)+v[j*n+i+1]*a)*(1-b)+(v[(j+1)*n+i]*(1-a)+v[(j+1)*n+i+1]*a)*b;
 }
 // Ericson (Real-Time Collision Detection), closest point on triangle.
 contact(p,r=4,previous=null){
  if(!p.every(Number.isFinite)||!(r>0))return null;
  let depth=0,best=null;const V=this.vertices,B=this.bounds,px=p[0],py=p[1],pz=p[2],r2=r*r;
  this.candidates(px-r,px+r,pz-r,pz+r,(id)=>{
   const k=id*6;if(py+r<B[k+2]||py-r>B[k+3]||px+r<B[k]||px-r>B[k+1]||pz+r<B[k+4]||pz-r>B[k+5])return;
   const i=id*9,ax=V[i],ay=V[i+1],az=V[i+2],bx=V[i+3],by=V[i+4],bz=V[i+5],cx=V[i+6],cy=V[i+7],cz=V[i+8];
   const abx=bx-ax,aby=by-ay,abz=bz-az,acx=cx-ax,acy=cy-ay,acz=cz-az,apx=px-ax,apy=py-ay,apz=pz-az;
   const d1=abx*apx+aby*apy+abz*apz,d2=acx*apx+acy*apy+acz*apz;
   let x,y,z;
   if(d1<=0&&d2<=0){x=ax;y=ay;z=az;}
   else{
    const bpx=px-bx,bpy=py-by,bpz=pz-bz,d3=abx*bpx+aby*bpy+abz*bpz,d4=acx*bpx+acy*bpy+acz*bpz;
    if(d3>=0&&d4<=d3){x=bx;y=by;z=bz;}
    else{
     const vc=d1*d4-d3*d2;
     if(vc<=0&&d1>=0&&d3<=0){const t=d1/(d1-d3);x=ax+t*abx;y=ay+t*aby;z=az+t*abz;}
     else{
      const cpx=px-cx,cpy=py-cy,cpz=pz-cz,d5=abx*cpx+aby*cpy+abz*cpz,d6=acx*cpx+acy*cpy+acz*cpz;
      if(d6>=0&&d5<=d6){x=cx;y=cy;z=cz;}
      else{
       const vb=d5*d2-d1*d6;
       if(vb<=0&&d2>=0&&d6<=0){const t=d2/(d2-d6);x=ax+t*acx;y=ay+t*acy;z=az+t*acz;}
       else{
        const va=d3*d6-d5*d4;
        if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){const t=(d4-d3)/((d4-d3)+(d5-d6));x=bx+t*(cx-bx);y=by+t*(cy-by);z=bz+t*(cz-bz);}
        else{const denom=va+vb+vc;if(Math.abs(denom)<EPS)return;const v=vb/denom,w=vc/denom;x=ax+v*abx+w*acx;y=ay+v*aby+w*acy;z=az+v*abz+w*acz;}
       }
      }
     }
    }
   }
   let nx=px-x,ny=py-y,nz=pz-z,ds=nx*nx+ny*ny+nz*nz;if(ds>=r2)return;
   const distance=Math.sqrt(ds),penetration=r-distance;if(penetration<=depth)return;
   if(distance>1e-5){nx/=distance;ny/=distance;nz/=distance;}
   else{
    nx=aby*acz-abz*acy;ny=abz*acx-abx*acz;nz=abx*acy-aby*acx;
    const n=Math.hypot(nx,ny,nz);if(n<1e-8)return;nx/=n;ny/=n;nz/=n;
    if(previous&&((previous[0]-x)*nx+(previous[1]-y)*ny+(previous[2]-z)*nz)<0){nx=-nx;ny=-ny;nz=-nz;}
   }
   depth=penetration;best={depth,nx,ny,nz,triangle:id};
  });return best;
 }
 // Conservative bounded subdivision. This is a sampled sweep, not a mathematical TOI solver.
 sweep(a,b,r){const length=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const steps=Math.ceil(length/Math.max(.5,r*.4));if(steps>512)throw Error('movement exceeds swept-collision budget');
  for(let i=1;i<=Math.max(1,steps);i++){const t=i/Math.max(1,steps),p=a.map((v,j)=>v+(b[j]-v)*t),c=this.contact(p,r,a);if(c)return {t:(i-1)/Math.max(1,steps),contact:c,p:a.map((v,j)=>v+(b[j]-v)*(i-1)/Math.max(1,steps))};}return null;
 }
 raycast(o,d,maxDist=300){const len=Math.hypot(...d);if(!len||!Number.isFinite(len)||maxDist<=0)return null;d=d.map(v=>v/len);
  let best=maxDist,hit=null;const end=o.map((v,i)=>v+d[i]*maxDist),V=this.vertices,B=this.bounds;
  this.candidates(Math.min(o[0],end[0])-1,Math.max(o[0],end[0])+1,Math.min(o[2],end[2])-1,Math.max(o[2],end[2])+1,(id)=>{
   const k=id*6;if(B[k+2]>Math.max(o[1],end[1])+1||B[k+3]<Math.min(o[1],end[1])-1)return;
   const i=id*9,ax=V[i],ay=V[i+1],az=V[i+2],e1x=V[i+3]-ax,e1y=V[i+4]-ay,e1z=V[i+5]-az,e2x=V[i+6]-ax,e2y=V[i+7]-ay,e2z=V[i+8]-az;
   const hx=d[1]*e2z-d[2]*e2y,hy=d[2]*e2x-d[0]*e2z,hz=d[0]*e2y-d[1]*e2x,det=e1x*hx+e1y*hy+e1z*hz;
   if(Math.abs(det)<EPS)return;const inv=1/det,sx=o[0]-ax,sy=o[1]-ay,sz=o[2]-az,u=inv*(sx*hx+sy*hy+sz*hz);if(u<0||u>1)return;
   const qx=sy*e1z-sz*e1y,qy=sz*e1x-sx*e1z,qz=sx*e1y-sy*e1x,v=inv*(d[0]*qx+d[1]*qy+d[2]*qz);if(v<0||u+v>1)return;
   const t=inv*(e2x*qx+e2y*qy+e2z*qz);if(t>1.25&&t<best){best=t;hit={distance:t,point:o.map((v,i)=>v+d[i]*t),triangle:id};}
  });return hit;
 }
 stats(){return {course:this.course,triangles:this.triangles,cells:this.cells.size,oversized:this.oversized.length,hash:this.metadata.float32_sha256};}
}
function get(course){if(course==='frost')return require('./frost.cjs').load();if(!CACHE.has(course))CACHE.set(course,new Collider(course));return CACHE.get(course);}
function load(course,strict=false){
 try{return get(course);}catch(err){
  if(!strict && err && err.code==='ENOENT')return null; // source-only CI has no baked binary assets
  throw err; // corrupted or revision-mismatched release assets must fail closed
 }
}
module.exports={Collider,get,load};
