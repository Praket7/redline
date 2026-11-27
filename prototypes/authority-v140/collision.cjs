'use strict';
/* Stage 142: deterministic collision queries on exported *rendered* triangles.
 * No procedural/box approximation may be called "exact." A validated export is
 * required for production; fixture and non-strict local demos may run without it.
 */
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
const add=(a,b,s=1)=>a.map((x,i)=>x+b[i]*s),length=a=>Math.hypot(...a);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function closest(p,a,b,c){
 const ab=sub(b,a),ac=sub(c,a),ap=sub(p,a),d1=dot(ab,ap),d2=dot(ac,ap);
 if(d1<=0&&d2<=0)return a;
 const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);
 if(d3>=0&&d4<=d3)return b;
 const vc=d1*d4-d3*d2;
 if(vc<=0&&d1>=0&&d3<=0)return add(a,ab,d1/(d1-d3));
 const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);
 if(d6>=0&&d5<=d6)return c;
 const vb=d5*d2-d1*d6;
 if(vb<=0&&d2>=0&&d6<=0)return add(a,ac,d2/(d2-d6));
 const va=d3*d6-d5*d4;
 if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0)return add(b,sub(c,b),(d4-d3)/((d4-d3)+(d5-d6)));
 const den=1/(va+vb+vc);
 return add(add(a,ab,vb*den),ac,vc*den);
}
class CollisionMesh{
 constructor(data){
  if(!data||!Array.isArray(data.triangles)||data.triangles.length>2000000)throw Error('invalid collision export');
  this.cellSize=64;this.tris=[];this.cells=new Map();this.source=data.source||'fixture';
  let idx=0;
  for(const v of data.triangles){
   if(!Array.isArray(v)||v.length!==9||!v.every(x=>Number.isFinite(x)&&Math.abs(x)<=100000))throw Error('invalid triangle');
   const a=v.slice(0,3),b=v.slice(3,6),c=v.slice(6,9),norm=cross(sub(b,a),sub(c,a)),n=length(norm);
   if(n<1e-8)continue;
   const min=[0,1,2].map(i=>Math.min(a[i],b[i],c[i])),max=[0,1,2].map(i=>Math.max(a[i],b[i],c[i]));
   this.tris.push({a,b,c,n:norm.map(x=>x/n),min,max});
   const x0=Math.floor((min[0]-10)/64),x1=Math.floor((max[0]+10)/64),z0=Math.floor((min[2]-10)/64),z1=Math.floor((max[2]+10)/64);
   if((x1-x0+1)*(z1-z0+1)>25000)throw Error('triangle spans too many cells');
   for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const key=x+','+z;const list=this.cells.get(key)||[];list.push(idx);this.cells.set(key,list);}
   idx++;
  }
  if(!this.tris.length)throw Error('empty collision export');
 }
 candidates(p,r){
  const ids=new Set(),x0=Math.floor((p[0]-r)/64),x1=Math.floor((p[0]+r)/64),z0=Math.floor((p[2]-r)/64),z1=Math.floor((p[2]+r)/64);
  for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++)for(const id of this.cells.get(x+','+z)||[])ids.add(id);
  return ids;
 }
 contact(p,r=4){
  if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite)||!(r>0&&r<=20))throw Error('invalid sphere query');
  let hit=null;
  for(const id of this.candidates(p,r)){
   const t=this.tris[id];
   if(p.some((x,i)=>x+r<t.min[i]||x-r>t.max[i]))continue;
   const q=closest(p,t.a,t.b,t.c),delta=sub(p,q),d=length(delta);
   if(d>=r)continue;
   const depth=r-d;
   if(!hit||hit.depth<depth)hit={depth,normal:d>1e-6?delta.map(x=>x/d):t.n,triangle:id,point:q};
  }
  return hit;
 }
 sweep(a,b,r=4){
  const dist=length(sub(b,a)),count=Math.ceil(dist/(r*.45));
  if(count>512)throw Error('swept path exceeds collision budget');
  const start=this.contact(a,r);
  if(start)return {t:0,p:a,contact:start};
  for(let i=1;i<=Math.max(1,count);i++){
   const t=i/Math.max(1,count),p=add(a,sub(b,a),t),hit=this.contact(p,r);
   if(hit){let lo=(i-1)/Math.max(1,count),hi=t;
     for(let j=0;j<8;j++){const mid=(lo+hi)/2;if(this.contact(add(a,sub(b,a),mid),r))hi=mid;else lo=mid;}
     return {t:lo,p:add(a,sub(b,a),lo),contact:hit};
   }
  }
  return null;
 }
 raycast(origin,dir,max=300){
  const magnitude=length(dir);if(magnitude<1e-8)throw Error('bad ray');const d=dir.map(x=>x/magnitude);
  let result=null,best=max;
  // Exact triangle intersection; use bounded broadphase from stepped ray cells.
  const visited=new Set(),steps=Math.max(1,Math.ceil(max/16));
  for(let k=0;k<=steps;k++){
   const p=add(origin,d,Math.min(max,k*16));
   for(const id of this.candidates(p,16)){
    if(visited.has(id))continue;visited.add(id);const t=this.tris[id],e1=sub(t.b,t.a),e2=sub(t.c,t.a),h=cross(d,e2),det=dot(e1,h);
    if(Math.abs(det)<1e-9)continue;const inv=1/det,s=sub(origin,t.a),u=inv*dot(s,h);
    if(u<0||u>1)continue;const q=cross(s,e1),v=inv*dot(d,q);
    if(v<0||u+v>1)continue;const range=inv*dot(e2,q);
    if(range>1e-6&&range<best){best=range;result={distance:range,triangle:id};}
   }
  }
  return result;
 }
}
function loadCourse(course,revision,strict=process.env.REDLINE_COLLISION_STRICT==='1'){
 const filename=path.join(__dirname,'collision_exports',course+'.json');
 if(!fs.existsSync(filename)){if(strict)throw Error('missing exact '+course+' collision export');return null;}
 const raw=fs.readFileSync(filename,'utf8'),data=JSON.parse(raw);
 if(data.course!==course||data.revision!==revision||!data.source?.startsWith('REDLINE CLIFF_COLLIDER'))throw Error('collision revision/source mismatch');
 const sha=crypto.createHash('sha256').update(JSON.stringify(data.triangles)).digest('hex');
 if(sha!==data.sha256)throw Error('collision geometry hash mismatch');
 return new CollisionMesh(data);
}
module.exports={CollisionMesh,loadCourse,closest};
