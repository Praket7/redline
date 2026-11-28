'use strict';
// Exact v149 browser collision factory and its original data, checked as a unit.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),vm=require('node:vm');
const HASH='6ea7228a3b3f0d9b96202b961d9dfbea8c1a9ba946532ded913ca3358d41ee74', SCALE=3;
let cached;
const normalize=v=>{const n=Math.hypot(...v);return n>1e-9?v.map(x=>x/n):[0,1,0]};
function load(){
 if(cached)return cached;
 const dir=path.join(__dirname,'frost_bundle'),packed=Buffer.concat(Array.from({length:7},(_,i)=>fs.readFileSync(path.join(dir,String(i).padStart(2,'0')+'.bin'))));
 if(crypto.createHash('sha256').update(packed).digest('hex')!==HASH)throw Error('Frost Vein collision bundle checksum mismatch');
 const assets=JSON.parse(zlib.inflateSync(packed,{maxOutputLength:32*1024*1024}));
 const read=n=>Buffer.from(assets[n],'base64'),json=n=>JSON.parse(read(n));
 const sandbox={window:{},atob:s=>Buffer.from(s,'base64').toString('latin1')};
 vm.runInNewContext(read('collision.js').toString('utf8'),sandbox,{filename:'frost-collision-v149.js',timeout:10000});
 const meta=json('glacier14.json'),ice=read('glacier14-field.i8'),village=zlib.gunzipSync(read('village.f32.gz'),{maxOutputLength:32*1024*1024});
 if(ice.length!==meta.shape.reduce((a,b)=>a*b,1)||village.length%36)throw Error('Invalid Frost Vein fields');
 const source=sandbox.window.FROST_CREATE_COLLISION(sandbox.window.FROST_SEED,sandbox.window.FROST_TERRAIN,meta,new Int8Array(ice.buffer,ice.byteOffset,ice.length),new Float32Array(village.buffer,village.byteOffset,village.length/4),json('collision.json'));
 const r=json('route.json');if(r.revision!==149||r.gateMeta.length!==40||r.gates.length!==40)throw Error('Invalid Frost Vein route');
 const route={revision:149,laps:1,gates:r.gateMeta.map(({center,normal})=>({center,normal,radius:31})),dock:r.dock,land:r.land};
 const height=(x,z)=>source.height(x/SCALE,z/SCALE)*SCALE;
 const hit=(p,r=2.4)=>source.hit(p.map(x=>x/SCALE),r/SCALE);
 const contact=(p,r,previous)=>{const h=hit(p,r);if(!h)return null;let n;
  if(h==='ground')n=normalize([height(p[0]-1,p[2])-height(p[0]+1,p[2]),2,height(p[0],p[2]-1)-height(p[0],p[2]+1)]);
  else if(previous&&!hit(previous,r)&&Math.hypot(...previous.map((x,i)=>x-p[i]))>1e-4)n=normalize(previous.map((x,i)=>x-p[i]));
  else n=normalize(p.map((_,i)=>{const a=p.slice(),b=p.slice();a[i]+=r;b[i]-=r;return Number(!!hit(b,r))-Number(!!hit(a,r));}));
  return {nx:n[0],ny:n[1],nz:n[2],depth:r,ground:h==='ground',kind:h};};
 const raycast=(o,d,max=300)=>{for(let t=1.25;t<=max;t+=1.25){const p=o.map((x,i)=>x+d[i]*t);if(hit(p,.3))return {distance:t,point:p};}return null;};
 cached={hash:HASH,route,height,hit,contact,raycast,stats:()=>({course:'frost',hash:HASH,revision:149,gates:40,villageBins:source.bins})};return cached;
}
module.exports={load,HASH};
