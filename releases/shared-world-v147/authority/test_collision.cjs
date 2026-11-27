'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('./collision.cjs');
const {World}=require('./world.cjs');
let assertions=0;const ck=(v,msg)=>{assert(v,msg);assertions++;};
for(const course of ['grand','iron']){
 const c=C.get(course),meta=JSON.parse(fs.readFileSync(path.join(__dirname,'collision_exports',course+'.json')));
 ck(c.triangles===meta.float32_triangles,course+' triangles');
 ck(c.stats().hash===meta.float32_sha256,course+' hash');
 ck(c.cells.size>100,course+' spatial index');
 ck(c.triangles=== (course==='grand'?281300:2836700),'expected source geometry');
 ck(Number.isFinite(c.vertices[0])&&c.vertices.length===c.triangles*9,'vertex integrity');
 let hit=false,beam=false;
 for(let t=0;t<Math.min(c.triangles,5000);t+=47){
  const i=t*9,V=c.vertices;
  const a=[V[i],V[i+1],V[i+2]],b=[V[i+3],V[i+4],V[i+5]],d=[V[i+6],V[i+7],V[i+8]];
  const o=a.map((v,j)=>(v+b[j]+d[j])/3);
  const x=b.map((v,j)=>v-a[j]),y=d.map((v,j)=>v-a[j]);
  const n=[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]];
  const len=Math.hypot(...n);if(len<1e-3)continue;
  const normal=n.map(v=>v/len),p=o.map((v,j)=>v+normal[j]*.3);
  hit ||= !!c.contact(p,1);
  const origin=o.map((v,j)=>v+normal[j]*15);
  beam ||= !!c.raycast(origin,normal.map(v=>-v),35);
  if(hit&&beam)break;
 }
 ck(hit,course+' collider contact');ck(beam,course+' occlusion raycast');
 if(course==='grand'){
  const h=meta.heightfield;ck(c.height(0,0)===c.floor(0,0),'single renderer-derived heightfield');
  ck(c.height(-h.ws/2,-h.ws/2)===h.h[0],'heightfield origin');
 }else ck(c.floor(0,0)===null,'iron uses authored dock/land slabs');
 const world=new World(course,'collision-test');ck(world.collider===c,'same in-memory static world collider');
 const snapshot=world.snapshot();ck(snapshot.collisionVerified&&snapshot.collisionHash===meta.float32_sha256,'authority snapshot verifies geometry');
}
console.log(JSON.stringify({collision_assertions:assertions,grand_triangles:281300,iron_triangles:2836700,
 trusted_source:'REDLINE v139 runtime collider export',dynamic_collision_coverage:false,continuous_sweep_certificate:false}));
