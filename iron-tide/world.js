/* IRON TIDE independent camera lab; Three r128. Original procedural assets. */
(async function(){
'use strict';
const T=THREE, V=(x,y,z)=>new T.Vector3(x,y,z), layout=window.IRON_TIDE_LAYOUT || await (await fetch('layout.json')).json();
const scene=new T.Scene();scene.background=new T.Color(0xb1a9a2);scene.fog=new T.FogExp2(0x777b86,.00012);
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.14;renderer.physicallyCorrectLights=true;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;document.body.prepend(renderer.domElement);
const sun=new T.DirectionalLight(0xffbd80,3.25);sun.position.set(-1600,720,800);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-1850,right:1850,top:1850,bottom:-1850,near:10,far:5200});sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.00025;sun.shadow.normalBias=1.1;scene.add(sun,new T.HemisphereLight(0xa9c6ef,0x74615a,1.20));
let seed=89423;function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
function texture(base,kind){
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,256,256);
 for(let i=0;i<9000;i++){const a=rnd()*.15;ctx.fillStyle=rnd()>.5?'rgba(255,255,255,'+a+')':'rgba(0,0,0,'+a+')';ctx.fillRect(rnd()*256,rnd()*256,1+rnd()*5,1+rnd()*5)}
 if(kind==='steel'){for(let i=0;i<180;i++){ctx.fillStyle='rgba(74,36,19,'+(rnd()*.24)+')';ctx.fillRect(rnd()*256,rnd()*256,1+rnd()*3,4+rnd()*50)}}
 if(kind==='concrete'){ctx.strokeStyle='#18191b38';for(let i=0;i<12;i++){let x=rnd()*256,y=rnd()*256;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+10,y+23);ctx.lineTo(x+8,y+45);ctx.stroke()}}
 const surfaceSeed=seed;for(let i=0;i<120;i++){const x=rnd()*256,y=rnd()*256,r=4+rnd()*48,g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,kind==='steel'?'rgba(73,28,12,.30)':'rgba(9,15,22,.32)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}seed=surfaceSeed;
 const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t
}
function relief(kind){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');const im=ctx.createImageData(128,128);for(let i=0;i<im.data.length;i+=4){const v=Math.floor(110+rnd()*65);im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255}ctx.putImageData(im,0,0);ctx.strokeStyle='#666';for(let i=0;i<45;i++){let x=rnd()*128,y=rnd()*128;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+rnd()*6,y+8+rnd()*35);ctx.stroke()}const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;return t}
function normalFromHeight(height,strength){const src=height.image,n=src.width,p=src.getContext('2d').getImageData(0,0,n,n).data,c=document.createElement('canvas');c.width=c.height=n;const ctx=c.getContext('2d'),im=ctx.createImageData(n,n),get=(x,y)=>p[(((y+n)%n)*n+(x+n)%n)*4]/255;for(let y=0;y<n;y++)for(let x=0;x<n;x++){const dx=(get(x-1,y)-get(x+1,y))*strength,dy=(get(x,y+1)-get(x,y-1))*strength,len=Math.hypot(dx,dy,1),i=(y*n+x)*4;im.data[i]=(dx/len*.5+.5)*255;im.data[i+1]=(dy/len*.5+.5)*255;im.data[i+2]=(1/len*.5+.5)*255;im.data[i+3]=255}ctx.putImageData(im,0,0);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;return t}
const material=(color,metalness,roughness,kind)=>{const r=relief(kind);return new T.MeshStandardMaterial({color:0xffffff,map:texture(color,kind),metalness,roughness,roughnessMap:r,normalMap:normalFromHeight(r,kind==='steel'?.65:1),normalScale:new T.Vector2(.7,.7)})};
const m={concrete:material('#625d57',0,.71,'concrete'),road:material('#55575a',0,.58,'concrete'),rust:material('#945641',.32,.71,'steel'),orange:material('#cb7b37',.25,.59,'steel'),steel:material('#818d95',.55,.51,'steel'),dark:material('#343c3d',.45,.74,'steel'),blue:material('#365a68',.45,.65,'steel'),green:material('#566355',.4,.7,'steel'),white:material('#b5b5a9',.3,.63,'steel'),rubber:new T.MeshStandardMaterial({color:0x202527,roughness:.9}),yellow:new T.MeshStandardMaterial({color:0xdba448,roughness:.65}),glass:new T.MeshStandardMaterial({color:0x365464,metalness:.4,roughness:.22}),light:new T.MeshStandardMaterial({color:0xffc78b,emissive:0xffa34a,emissiveIntensity:2}),red:new T.MeshStandardMaterial({color:0xff5350,emissive:0xff302b,emissiveIntensity:2})};
// Photographic CC0 maps, packed as data URIs at build time. Use CanvasTexture so
// GLTFExporter serializes the same maps; no runtime network requests.
const texturePack=window.IRON_TIDE_TEXTURES||{},loadedMaterials=[];
async function photoMap(uri,srgb){const im=new Image();await new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=()=>reject(Error('packed texture could not decode'));im.src=uri});const c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(srgb)t.encoding=T.sRGBEncoding;return t}
for(const [key,mat] of [['concrete',m.concrete],['asphalt',m.road],['rust',m.rust],['paint',m.orange],['steel',m.steel]]){const pack=texturePack[key];if(!pack)continue;const [diff,nor,rough]=await Promise.all([photoMap(pack.diff,true),photoMap(pack.nor_gl,false),photoMap(pack.rough,false)]);mat.map.dispose();mat.normalMap.dispose();mat.roughnessMap.dispose();mat.map=diff;mat.normalMap=nor;mat.roughnessMap=rough;mat.normalScale.set(.55,.55);mat.roughness=1;mat.needsUpdate=true;loadedMaterials.push(key)}
// World ground maps tile at approximately industrial pavement scale instead of stretching.
for(const mat of [m.road,m.concrete]){mat.map.repeat.set(12,12);mat.normalMap.repeat.set(12,12);mat.roughnessMap.repeat.set(12,12);mat.normalScale.set(.2,.2)}
const asphalt=new T.MeshStandardMaterial({color:0x333a3c,roughness:.86});const apron=new T.MeshStandardMaterial({color:0x65605a,roughness:.88});const tar=new T.MeshStandardMaterial({color:0x282b2b,roughness:.9});
const env=document.createElement('canvas');env.width=512;env.height=256;const e=env.getContext('2d'),grad=e.createLinearGradient(0,0,0,256);grad.addColorStop(0,'#182a49');grad.addColorStop(.45,'#af8677');grad.addColorStop(.52,'#f0ad76');grad.addColorStop(.65,'#4b4b56');grad.addColorStop(1,'#171b23');e.fillStyle=grad;e.fillRect(0,0,512,256);
// Layered seeded cloud silhouettes in the same equirectangular sky used for reflections.
for(let layer=0;layer<3;layer++)for(let i=0;i<85;i++){const x=rnd()*512,y=45+rnd()*65,rx=8+rnd()*32,ry=2+rnd()*8;e.fillStyle=layer===0?'rgba(28,36,57,.32)':layer===1?'rgba(72,70,91,.28)':'rgba(248,161,102,.18)';e.beginPath();e.ellipse(x,y,rx,ry,0,0,Math.PI*2);e.fill()}
let glow=e.createRadialGradient(120,95,1,120,95,60);glow.addColorStop(0,'#fff3d2');glow.addColorStop(1,'#fff3d200');e.fillStyle=glow;e.fillRect(0,0,512,256);// Fractal cloud opacity painted onto the equirectangular sky (not screen-space art).
const skySeed=seed, cloudNoise=(x,y)=>{const k=Math.sin(x*127.1+y*311.7)*43758.5453123;return k-Math.floor(k)};
function smoothNoise(x,y){let i=Math.floor(x),j=Math.floor(y),u=x-i,v=y-j;u=u*u*(3-2*u);v=v*v*(3-2*v);const a=cloudNoise(i,j),b=cloudNoise(i+1,j),c=cloudNoise(i,j+1),d=cloudNoise(i+1,j+1);return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v}
const skyPixels=e.getImageData(0,0,512,256);
for(let y=12;y<128;y++)for(let x=0;x<512;x++){let u=x/512*7,v=y/256*10,n=0,a=.5;for(let o=0;o<5;o++){n+=a*smoothNoise(u,v);u*=2;v*=2;a*=.5}const opacity=T.MathUtils.clamp((n-.36)*1.8,0,.65)*Math.sin(y/128*Math.PI),i=(y*512+x)*4;const edge=T.MathUtils.clamp((y-65)/55,0,1),cloud=[38+edge*100,47+edge*39,65+edge*20];for(let k=0;k<3;k++)skyPixels.data[i+k]=skyPixels.data[i+k]*(1-opacity)+cloud[k]*opacity}
e.putImageData(skyPixels,0,0);seed=skySeed;
let envTex=new T.CanvasTexture(env),skySource='procedural';envTex.mapping=T.EquirectangularReflectionMapping;envTex.encoding=T.sRGBEncoding;
if(texturePack.sky?.hdr&&T.RGBELoader){const sky=new T.RGBELoader().setDataType(T.FloatType);envTex=await sky.loadAsync(texturePack.sky.hdr);envTex.mapping=T.EquirectangularReflectionMapping;skySource='industrial_sunset_02_puresky';}
const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromEquirectangular(envTex).texture;scene.background=envTex;pmrem.dispose();
const boxGeo=new T.BoxGeometry(1,1,1),cylGeo=new T.CylinderGeometry(1,1,1,12),sphereGeo=new T.SphereGeometry(1,12,8);const q=new T.Quaternion(),up=V(0,1,0);
const templates={};let target=null;const batches=new Map();
function part(g,mat,x,y,z,sx,sy,sz,rot){const mesh=new T.Mesh(g,mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);if(rot)mesh.quaternion.copy(rot);mesh.updateMatrix();if(target){target.push(mesh)}else{const key=g.uuid+mat.uuid;if(!batches.has(key))batches.set(key,{g,mat,matrices:[]});batches.get(key).matrices.push(mesh.matrix.clone())}return mesh}
const box=(mat,x,y,z,w,h,d)=>part(boxGeo,mat,x,y,z,w,h,d);
const cylinder=(mat,x,y,z,r,h)=>part(cylGeo,mat,x,y,z,r,h,r);
function beam(mat,a,b,w,d=w,round=false){const p=V(...a),r=V(...b),delta=r.clone().sub(p);q.setFromUnitVectors(up,delta.clone().normalize());const c=p.add(r).multiplyScalar(.5);return part(round?cylGeo:boxGeo,mat,c.x,c.y,c.z,w,delta.length(),d,q)}
function rail(x,y,z,length,axis='x'){const a=axis==='x'?[x-length/2,y,z]:[x,y,z-length/2],b=axis==='x'?[x+length/2,y,z]:[x,y,z+length/2];beam(m.yellow,a,b,.11);for(let i=0;i<=Math.ceil(length/4);i++){const t=i/Math.ceil(length/4),p=a.map((v,j)=>v+(b[j]-v)*t);beam(m.yellow,[p[0],y-1,p[2]],p,.10)}}
function define(name,fn){target=[];fn();const groups=new Map();for(const mesh of target){let g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(mesh.matrix);if(mesh.material.map){const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));if(ny>=nx&&ny>=nz)uv.setXY(i,x/4,z/4);else if(nx>=nz)uv.setXY(i,z/4,y/4);else uv.setXY(i,x/4,y/4)}}if(!groups.has(mesh.material))groups.set(mesh.material,[]);groups.get(mesh.material).push(g)}const group=new T.Group();group.name=name;for(const [mat,geos] of groups){const merged=T.BufferGeometryUtils.mergeBufferGeometries(geos);if(!merged)throw Error('merge failed '+name);const indexed=T.BufferGeometryUtils.mergeVertices(merged,0.0001);group.add(new T.Mesh(indexed,mat));merged.dispose();geos.forEach(g=>g.dispose())}templates[name]=group;target=null;}
// Container stack support footprints: all tiers must be aligned and consecutive.
const containerSlots=[],stackIndex=new Map();
function reserveContainer(x,y,z,angle,scale){
 const a=Math.abs(Math.cos(angle)),b=Math.abs(Math.sin(angle)),hx=(6.15*a+1.27*b)*scale,hz=(6.15*b+1.27*a)*scale;
 const key=[x.toFixed(3),z.toFixed(3),hx.toFixed(3),hz.toFixed(3)].join(':');
 const stack=stackIndex.get(key);
 if(stack){if(Math.abs(y-stack.next)>.08)return false;stack.next=y+2.94*scale;return true}
 if(y>5.65)return false;
 for(const q of containerSlots)if(Math.abs(x-q.x)<hx+q.hx+.06&&Math.abs(z-q.z)<hz+q.hz+.06)return false;
 const q={x,z,hx,hz,next:y+2.94*scale};containerSlots.push(q);stackIndex.set(key,q);return true
}
function place(name,x,y,z,angle=0,scale=1){if(name.startsWith('container-')&&!reserveContainer(x,y,z,angle,scale))return false;const group=templates[name];const root=new T.Object3D();root.position.set(x,y,z);root.rotation.y=angle;root.scale.setScalar(scale);root.updateMatrix();for(const mesh of group.children){let key=mesh.geometry.uuid+mesh.material.uuid;if(!batches.has(key))batches.set(key,{g:mesh.geometry,mat:mesh.material,matrices:[]});batches.get(key).matrices.push(root.matrix.clone())}}
for(const col of ['rust','blue','green','white'])define('container-'+col,()=>{box(m[col],0,1.45,0,12.2,2.9,2.44);for(const side of [-1,1]){for(let x=-5.9;x<6;x+=.42)box(m[col],x,1.45,side*1.25,.12,2.62,.10);for(const y of [.1,2.8])box(m.steel,0,y,side*1.24,12.3,.15,.14);for(const x of [-6,6])box(m.steel,x,1.45,side*1.24,.19,2.9,.20)}for(const z of [-.64,.64]){box(m.dark,6.14,1.45,z,.08,2.65,1.12);for(const dz of [-.35,.35])beam(m.steel,[6.23,.18,z+dz],[6.23,2.75,z+dz],.04,.04,true);box(m.steel,6.25,1.22,z,.18,.12,.28)}});
for(const col of ['rust','blue','green','white'])define('container-far-'+col,()=>{box(m[col],0,1.45,0,12.2,2.9,2.44);for(const s of [-1,1]){for(const y of [.13,2.77])box(m.steel,0,y,s*1.23,12.2,.12,.13);for(const x of [-6,6])box(m.steel,x,1.45,s*1.23,.18,2.9,.2)}});
define('goliath',()=>{for(const x of [-65,65]){for(const z of [-12,12]){beam(m.orange,[x,4,z],[x*.83,108,z*.68],4.4,5.2);box(m.dark,x,2,z,12,4,8);for(const dx of [-3,3])for(const dz of [-2,2])cylinder(m.rubber,x+dx,1,z+dz,1.2,1.6)}for(let y=12;y<100;y+=17){beam(m.steel,[x*(1-y/650),y,-12+y*.035],[x*(1-(y+17)/650),y+17,12-(y+17)*.035],.65);box(m.steel,x*(1-y/650),y,0,10,.65,25);rail(x*(1-y/650),y+1,12,10)}}for(const z of [-8,8]){box(m.orange,0,109,z,130,6,4);for(let x=-62;x<62;x+=10)beam(m.orange,[x,106,z],[x+10,116,z],.55)}box(m.steel,0,115,0,137,1.3,17);rail(0,116,8,137);rail(0,116,-8,137);box(m.orange,10,119,0,15,5,19);box(m.glass,19,114,9,7,4,5);for(const x of [5,15])beam(m.dark,[x,106,0],[x,65,0],.13,.13,true);box(m.yellow,10,64,0,14,2,5);});
define('luffing-crane',()=>{box(m.dark,0,2,0,14,4,16);for(const x of [-5,5])for(const z of [-5,5])beam(m.orange,[x,4,z],[x*.45,58,z*.45],1.1);for(let y=10;y<58;y+=8)for(const z of [-3,3])beam(m.orange,[-4,y,z],[4,y+8,z],.48);box(m.orange,0,59,0,9,3,11);box(m.glass,5,60,0,4,4,5);beam(m.orange,[0,59,0],[45,83,0],2);beam(m.orange,[0,59,0],[-18,68,0],2);beam(m.dark,[-18,68,0],[45,83,0],.12,.12,true);beam(m.dark,[45,83,0],[45,32,0],.12,.12,true);box(m.yellow,45,31,0,2,2,2);});
define('warehouse',()=>{const w=112,d=160,h=49;for(const x of [-w/2,w/2]){box(m.blue,x,h/2,0,1,h,d);for(let z=-d/2;z<=d/2;z+=10){box(m.steel,x,h/2,z,1.7,h,1.3);box(m.glass,x,h-12,z,1.15,6,6)}rail(x,h-2,0,d,'z')}for(let z=-d/2;z<=d/2;z+=16){for(const x of [-w/2,w/2]){beam(m.steel,[x,h,z],[0,h+12,z],1.2);beam(m.steel,[x,h,z],[0,h,z],.65);beam(m.steel,[x/2,h,z],[0,h+12,z],.55)}for(const side of [-1,1]){const angle=-side*Math.atan2(12,w/2);part(boxGeo,m.blue,side*w/4,h+6,z,Math.hypot(w/2,12)+.6,.65,15.95,new T.Quaternion().setFromAxisAngle(V(0,0,1),angle));for(let i=0;i<7;i++)box(m.steel,side*(4+i*7),h+12-(4+i*7)*12/(w/2)+.6,z,.18,.28,15.95)}}for(const x of [-w/2,w/2])box(m.orange,x*.8,30,0,1.6,2,d);box(m.orange,0,32,-18,w-18,3,4);box(m.dark,9,34,-18,9,3,6);beam(m.dark,[9,31,-18],[9,18,-18],.14,.14,true);box(m.yellow,9,17,-18,2,2,2);for(let z=-60;z<=60;z+=15)for(const x of [-36,36]){box(m.light,x,47,z,3,.4,1);box(m.dark,x,47.45,z,3.4,.35,1.4)}for(const x of [-w/2+5,w/2-5]){box(m.steel,x,20,0,5,.65,d-4);rail(x+(x<0?2.3:-2.3),21,0,d-4,'z');for(let z=-70;z<80;z+=14){beam(m.dark,[x,20,z],[x+(x<0?-4:4),15,z],.45);box(m.yellow,x,20.4,z,.35,.18,3)}}});
define('pipe-rack',()=>{for(const z of [-9,9]){for(const x of [-35,0,35]){box(m.steel,x,17,z,1.8,34,1.8);beam(m.dark,[x,8,z],[x,28,-z],.6)}for(const y of [14,29])beam(m.steel,[-38,y,z],[38,y,z],1.5)}for(let i=0;i<4;i++){const y=30+i*2.7;beam(i%2?m.rust:m.steel,[-40,y,-5+i*3.3],[40,y,-5+i*3.3],1.05,1.05,true);for(let x=-35;x<=35;x+=10)beam(m.dark,[x-.45,y,-5+i*3.3],[x+.45,y,-5+i*3.3],1.18,1.18,true)}box(m.steel,0,39,8,76,.5,3);rail(0,40,9.5,76);});
define('tank',()=>{cylinder(m.white,0,17,0,15,34);part(sphereGeo,m.steel,0,34,0,15,3,15);for(let y=2;y<34;y+=5){const ring=new T.TorusGeometry(15.1,.14,5,48);part(ring,m.steel,0,y,0,1,1,1,new T.Quaternion().setFromAxisAngle(V(1,0,0),Math.PI/2))}for(const z of [-.4,.4])beam(m.orange,[15.4,0,z],[15.4,34,z],.1);for(let y=1;y<34;y+=.6)beam(m.orange,[15.4,y,-.4],[15.4,y,.4],.065);});
define('ship-rib',()=>{for(const s of [-1,1]){const pts=[[0,1,s*5],[0,3,s*14],[0,9,s*25],[0,18,s*31],[0,34,s*32]];for(let i=0;i<pts.length-1;i++)beam(m.rust,pts[i],pts[i+1],1.5,1.1);box(m.steel,0,34,s*32,1.6,.8,3);beam(m.dark,[0,8,s*24],[0,18,s*31],.8)}box(m.steel,0,1,0,1.8,1.2,12)});
define('ship-hull',()=>{const L=350;for(const s of [-1,1]){
// Lofted side shell: continuous tapered panels, rising chines, open construction ends.
const p=[],uv=[],levels=[[4,.38],[8,.67],[16,.9],[25,1],[32,1]];
function pt(x,k){const [y,w]=levels[k],taper=Math.min(1,(L/2-Math.abs(x))/43+.23);return [x,y,s*32*w*taper]}
function tri(a,b,c){for(const v of [a,b,c]){p.push(...v);uv.push(v[0]/5,v[1]/5)}}
for(let i=0;i<35;i++){const a=-175+i*10,b=a+10;for(let k=0;k<levels.length-1;k++){const A=pt(a,k),B=pt(b,k),C=pt(b,k+1),D=pt(a,k+1);if(s>0){tri(A,B,C);tri(A,C,D);tri(A,C,B);tri(A,D,C)}else{tri(A,C,B);tri(A,D,C);tri(A,B,C);tri(A,C,D)}}const A=pt(a,4),B=pt(b,4);beam(m.steel,A,B,.8,1.4)}
const shell=new T.BufferGeometry();shell.setAttribute('position',new T.Float32BufferAttribute(p,3));shell.setAttribute('uv',new T.Float32BufferAttribute(uv,2));shell.computeVertexNormals();part(shell,m.rust,0,0,0,1,1,1);for(let x=-140;x<145;x+=14){const z=s*31;box(m.steel,x,19,z,1.2,26,2.2);beam(m.rust,[x,5,s*14],[x,18,s*29],1.6);beam(m.rust,[x,18,s*29],[x,32,s*31],1.4)}rail(0,34,s*32,280)}box(m.dark,0,3,0,340,2,46);for(let x=-145;x<146;x+=14){box(m.steel,x,5,0,1.8,2,45);for(const s of [-1,1])box(m.orange,x,12,s*22,1.4,14,2)}});
define('bollard',()=>{cylinder(m.dark,0,.55,0,1.2,1.1);cylinder(m.steel,0,1.3,0,.65,1.5);cylinder(m.dark,0,2.1,0,1,.32)});
define('caisson',()=>{box(m.concrete,0,5,0,18,12,17);box(m.dark,0,11.2,0,20,1.4,19);for(const x of [-5,5])beam(m.steel,[x,11.8,-5],[x,14,-5],.5)});
define('light-tower',()=>{beam(m.dark,[0,0,0],[0,28,0],.65,.65,true);box(m.steel,0,28,0,8,.7,1.2);for(let x=-3;x<=3;x+=2)box(m.light,x,27.7,0,1.2,.7,1)});
define('propeller',()=>{beam(m.steel,[-4,9,0],[4,9,0],2,2,true);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const qq=new T.Quaternion().setFromAxisAngle(V(1,0,0),a);part(sphereGeo,m.orange,0,9+Math.cos(a)*5,Math.sin(a)*5,1,5,1.9,qq)}box(m.dark,0,1,0,11,2,14)});
define('straddle-carrier',()=>{for(const x of [-3.8,3.8])for(const z of [-4.5,4.5]){box(m.orange,x,6,z,1.15,12,1.1);box(m.dark,x,1.5,z,2.8,2.7,2.7);for(const off of [-.75,.75])part(cylGeo,m.rubber,x+off,1.25,z,1.25,.62,1.25,new T.Quaternion().setFromAxisAngle(V(0,0,1),Math.PI/2))}for(const z of [-4.5,4.5]){box(m.orange,0,12,z,9.5,1.3,1.5);beam(m.dark,[-3.8,9,z],[0,12,z],.55);beam(m.dark,[3.8,9,z],[0,12,z],.55)}for(const x of [-3.8,3.8])box(m.orange,x,12,0,1,1,10);box(m.glass,4.2,10,3,2.5,2.8,2.4);box(m.dark,0,9,0,4,1,6);});
define('service-gantry',()=>{for(const x of [-24,24]){for(const z of [-4,4])box(m.steel,x,13,z,1.2,26,1.2);beam(m.steel,[x,2,-4],[x,24,4],.55);box(m.concrete,x,1,0,5,2,12)}for(const z of [-4,4]){box(m.orange,0,27,z,50,2,1.5);for(let x=-24;x<24;x+=6)beam(m.steel,[x,25,z],[x+6,29,z],.4)}box(m.steel,0,29,0,50,.6,9);rail(0,30,4.5,50);rail(0,30,-4.5,50);box(m.dark,10,26,0,5,2,6);});
define('lighthouse',()=>{cylinder(m.concrete,0,2,0,9,4);for(let i=0;i<6;i++)cylinder(i%2?m.white:m.rust,0,4+i*5+2.5,0,4.5-i*.28,5.05);cylinder(m.steel,0,34,0,4.5,1);cylinder(m.glass,0,37,0,2.8,5);cylinder(m.rust,0,40,0,3.6,1.5);for(let i=0;i<8;i++){const a=i*Math.PI/4;beam(m.dark,[Math.cos(a)*3,34,Math.sin(a)*3],[Math.cos(a)*3,40,Math.sin(a)*3],.15)}box(m.light,0,37,0,2,1,2);});
define('service-block',()=>{box(m.concrete,0,4,0,24,8,18);box(m.dark,0,8.2,0,25,.5,19);for(let x=-9;x<=9;x+=6){box(m.glass,x,5,9.06,3,2,.2);box(m.steel,x,5,9.22,3.2,.2,.3)}box(m.dark,0,2,-9.1,4,4,.2);box(m.steel,5,10,1,6,3,5);for(let z=-1;z<=3;z+=2)cylinder(m.dark,5,11.6,z,.8,.25);});
define('drydock-keel-block',()=>{box(m.concrete,0,1.1,0,5,2.2,3);box(m.dark,0,2.4,0,4,.5,2.6);for(const x of [-1.8,1.8])box(m.steel,x,2.1,0,.2,1.1,3.2);});
define('office-block',()=>{box(m.concrete,0,12,0,55,24,30);box(m.dark,0,24.4,0,56,.8,31);for(const z of [-15.1,15.1])for(let y=5;y<=20;y+=5)for(let x=-23;x<=23;x+=6){box(m.glass,x,y,z,4,2.5,.3);box(m.steel,x,y-1.4,z,4.4,.2,.6)}for(const x of [-27.7,27.7])for(let y=5;y<=20;y+=5)for(let z=-11;z<=11;z+=6)box(m.glass,x,y,z,.3,2.5,4);box(m.steel,-12,27,3,8,5,6);box(m.steel,12,25.8,-5,12,2.8,8)});
define('tugboat',()=>{const deck=26;for(let i=0;i<9;i++){let x=-18+i*4.5,w=7*Math.min(1,(19-Math.abs(x))/8+.25);box(m.blue,x,1.4,0,4.6,4.4,w*2);box(m.rust,x,-.9,0,4.6,.9,w*1.9);box(m.dark,x,3.7,0,4.6,.6,w*2)}box(m.white,-5,6.1,0,12,4.4,10);box(m.white,-4,10,0,9,3.3,8);box(m.glass,-4,10.3,4.1,8,1.8,.25);box(m.glass,-4,10.3,-4.1,8,1.8,.25);box(m.glass,.7,10.3,0,.2,1.8,7.5);cylinder(m.dark,-12,8,2,1.3,9);beam(m.steel,[-6,11,0],[-6,18,0],.17);beam(m.steel,[-10,15,0],[-2,15,0],.12);for(let x=-13;x<15;x+=4)for(const z of [-6.5,6.5])part(cylGeo,m.rubber,x,2,z,1.15,.55,1.15,new T.Quaternion().setFromAxisAngle(V(1,0,0),Math.PI/2));});
define('cargo-shed',()=>{box(m.blue,0,12,0,65,24,100);box(m.dark,0,24.5,0,67,1,102);for(const x of [-32.7,32.7])for(let z=-48;z<=48;z+=8){box(m.steel,x,12,z,.3,24,.5);box(m.glass,x,18,z,.4,4,5)}for(const z of [-50.2,50.2])for(let x=-24;x<=24;x+=12){box(m.steel,x,8,z,8,16,.5);for(let y=1;y<15;y+=2)box(m.dark,x,y,z+.1,7.5,.12,.4)}for(let z=-35;z<=35;z+=18)box(m.glass,0,25.2,z,8,.5,12)});
/* Civil layout: separate slabs leave actual excavated dock unobstructed. */
function slab(x,z,w,d){box(m.concrete,x,1.8,z,w,6.4,d);box(m.road,x,5.04,z,w-8,.08,d-8)}
slab(0,650,2360,1100);slab(-425,-550,1510,1300);slab(1000,-985,360,410);slab(850,-125,660,450);slab(1140,-550,100,500);
box(m.concrete,850,-10,-550,400,4,400);for(const x of [655,1045]){box(m.concrete,x,-1,-550,10,12,400);rail(x,6,-550,400,'z')}box(m.concrete,850,-1,-747,390,12,9);box(m.dark,850,-3,-350,390,8,6);for(let z=-735;z<-365;z+=22)for(const x of [680,1020])box(m.light,x,0,z,2,.5,2);
for(const x of [660,1040])for(let z=-725;z<=-375;z+=35){box(m.dark,x,0,z,.3,12,.18);box(m.steel,x,5.2,z,1.2,.3,3);for(let i=0;i<20;i++)beam(m.orange,[x+(x<850?1:-1),-7+i*.65,z-1],[x+(x<850?1:-1),-7+i*.65,z+1],.09)}
for(const z of [-720,-380]){for(let k=0;k<20;k++)box(m.concrete,690, -7+k*.65,z+(z<-550?k:-k)*.75,5,.7,.85);}
slab(780,-920,700,250);slab(-900,-1230,500,150);slab(-1200,-920,110,450);slab(1120,720,180,480);slab(650,1250,650,80);slab(-650,1250,520,80);place('ship-hull',750,5,-920);place('propeller',550,5,-975);
/* legacy gantry retained as inspectable template, replaced in world by heavy-gantry-detail */place('luffing-crane',1100,5,-250);place('luffing-crane',400,5,-990,Math.PI);place('luffing-crane',-1100,5,950,.6);
for(const z of [550,650,760,900])for(let x=230;x<=1100;x+=42){if(Math.abs(x-600)<35||Math.abs(x-850)<38||Math.abs(x-1020)<26)continue;const h=2+Math.floor(rnd()*5),orientation=rnd()>.85?Math.PI/2:0;for(let j=0;j<h;j++)place('container-'+['rust','blue','green','white'][Math.floor(rnd()*4)],x,5+j*2.94,z,orientation)}
for(const z of [-650,-450,-170,100]){place('warehouse',-880,5,z);place('warehouse',-540,5,z)}
for(const z of [430,590,750]){place('pipe-rack',-850,5,z,Math.PI/2);place('pipe-rack',-650,5,z)}
for(const x of [-1050,-990,-560,-490])for(const z of [500,675])place('tank',x,5,z);
for(let x=-1100;x<=1110;x+=40){place('bollard',x,5,1190);place('caisson',x,0,-1320)}
for(let z=-1180;z<=1150;z+=120){place('light-tower',-1140,5,z);if(z>200)place('light-tower',1140,5,z)}
for(let x=-1050;x<1100;x+=60){box(m.yellow,x,5.12,1040,15,.06,.32);box(m.yellow,x,5.12,1120,15,.06,.32)}
// Keep functional support buildings, equipment and dry dock fixtures away from the racing centers.
for(const z of [-710,-665,-620,-575,-530,-485,-440,-395])for(const x of [725,980])place('drydock-keel-block',x,-8,z);
for(const z of [620,825,985]){place('straddle-carrier',470,5,z,Math.PI/2);place('straddle-carrier',930,5,z)}
for(const z of [-275,245,430])place('service-gantry',680,5,z,Math.PI/2);
for(const z of [-760,-490,-230,200,390,970])place('service-block',-360,5,z);
for(const x of [100,270,430])place('service-block',x,5,320);
place('lighthouse',-1120,0,-1320);
for(let i=0;i<100;i++){const x=-1175+i*23.5,z=-1340-rnd()*25;part(sphereGeo,m.concrete,x,1,z,8+rnd()*7,4+rnd()*5,7+rnd()*6,new T.Quaternion().setFromAxisAngle(up,rnd()*Math.PI))}
for(let x=-1110;x<1140;x+=45){box(m.dark,x,5.13,1180,20,.08,.35);box(m.steel,x,5.23,1185,18,.15,.18)}
// Dense industrial districts are placed away from the eight primary flight corridors.
// Check low scenery against the linear inspection path; not a full craft swept-volume test.
const routePoints=layout.sectors.flatMap(s=>s.gates);
function clearScenery(x,top,z){for(let i=0;i<routePoints.length;i++){const a=routePoints[i],b=routePoints[(i+1)%routePoints.length],dx=b[0]-a[0],dz=b[2]-a[2],den=dx*dx+dz*dz,t=den?T.MathUtils.clamp(((x-a[0])*dx+(z-a[2])*dz)/den,0,1):0,px=a[0]+dx*t,pz=a[2]+dz*t,py=a[1]+(b[1]-a[1])*t;if(Math.hypot(x-px,z-pz)<23&&top>py-12)return false}return true}
for(const x of [-320,-170,5,160])for(const z of [-1000,-820,-640,-460,-280,-100]){box(apron,x,5.12,z,125,.14,145);place('cargo-shed',x,5.2,z,(x===160?Math.PI/2:0));}
for(const x of [-1110,-970,-810,-650,-490])for(const z of [-1060,-890]){if(x===-1110&&z===-1060)continue;box(apron,x,5.12,z,115,.15,125);place('office-block',x,5.2,z);place('service-block',x+32,5.2,z+36);}
for(const x of [-460,-290,-120,50,220])for(const z of [350,530,710,870]){box(apron,x,5.13,z,140,.15,146);for(let a=-48;a<=48;a+=16)for(let b=-42;b<=42;b+=14){const layers=1+Math.floor(rnd()*4);for(let j=0;j<layers;j++)place('container-far-'+['rust','blue','green','white'][Math.floor(rnd()*4)],x+a,5.25+j*2.94,z+b,Math.PI/2)}}
for(const x of [350,470,730,930,1100])for(const z of [570,670,800,930]){if(Math.abs(x-850)<60&&z===800)continue;for(let a=-26;a<=26;a+=13)for(let b=-16;b<=16;b+=8){const layers=2+Math.floor(rnd()*4);for(let j=0;j<layers;j++){if(!clearScenery(x+a,5+(j+1)*2.94,z+b))break;place('container-'+['rust','blue','green','white'][Math.floor(rnd()*4)],x+a,5+j*2.94,z+b)}}}
for(const z of [250,480,760]){box(asphalt,80,5.16,z,2100,.1,14);for(let x=-950;x<=1100;x+=40)box(m.yellow,x,5.25,z,16,.03,.22)}
for(const x of [-780,-390,90,570]){box(asphalt,x,5.16,650,14,.10,1080);for(let z=150;z<1170;z+=40)box(m.yellow,x,5.25,z,.22,.03,16)}
for(const x of [-1180,1180])for(let z=150;z<1150;z+=26){box(m.dark,x,3.7,z,2.2,1.8,8);box(m.concrete,x,4.9,z,3,.4,25)}
// Connected sea wall and harbor breakwaters, rather than floating caisson rows.
box(m.concrete,0,2,-1320,2280,5.2,26);box(m.dark,0,5,-1320,2280,.4,18);
for(let x=-1120;x<1120;x+=100){box(m.yellow,x,5.3,-1320,36,.06,.35);if(x%200===-120)place('light-tower',x,5,-1320)}
for(const x of [-820,-420,60,650,1020])place('tugboat',x,.5,1270,Math.PI*(rnd()>.5?0:1));
for(const z of [-1050,-840,-600,-400])place('tugboat',1210,.5,z,Math.PI/2);
// Ground macro variation is evaluated in world space so large slabs and tiny props
// no longer share the same apparent UV scale. Preserve the original texture for GLB.
for(const mat of [m.road,asphalt,apron]){
 mat.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vPavement;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvec4 pavementP=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\n pavementP=instanceMatrix*pavementP;\n#endif\n vPavement=(modelMatrix*pavementP).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vPavement;\nfloat wetHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float wetNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(wetHash(i),wetHash(i+vec2(1,0)),f.x),mix(wetHash(i+vec2(0,1)),wetHash(i+vec2(1,1)),f.x),f.y);}').replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nfloat wet=wetNoise(vPavement.xz*.045)*.7+wetNoise(vPavement.xz*.19)*.3;float puddle=smoothstep(.50,.78,wet);roughnessFactor=mix(roughnessFactor,.19,puddle*.72);diffuseColor.rgb*=mix(1.0,.62,puddle);');
 if(mat===m.road){shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',T.ShaderChunk.map_fragment.replace(/\bvUv\b/g,'(vPavement.xz/30.0)')).replace('#include <normal_fragment_maps>',T.ShaderChunk.normal_fragment_maps.replace(/\bvUv\b/g,'(vPavement.xz/30.0)'));}
 };
}
// Native industrial kit: batched working-port models and practical lighting.
const fixturePositions=[];const warmGlow=new T.MeshBasicMaterial({color:0xffbc73});
const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=64;const gc=glowCanvas.getContext('2d'),gg=gc.createRadialGradient(32,32,0,32,32,32);gg.addColorStop(0,'rgba(255,165,73,.65)');gg.addColorStop(.35,'rgba(255,132,45,.25)');gg.addColorStop(1,'rgba(255,132,45,0)');gc.fillStyle=gg;gc.fillRect(0,0,64,64);const glowMat=new T.MeshBasicMaterial({map:new T.CanvasTexture(glowCanvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,blending:T.AdditiveBlending});const flatGlow=new T.PlaneGeometry(1,1);flatGlow.rotateX(-Math.PI/2);
function pool(x,y,z,r){part(flatGlow,glowMat,x,y,z,r*2,1,r*2)}
function lamp(x,y,z){fixturePositions.push([x+2,y+11.6,z]);beam(m.dark,[x,y,z],[x,y+12,z],.25);beam(m.steel,[x,y+12,z],[x+2,y+12,z],.19);box(m.dark,x+2,y+11.9,z,1.5,.4,.75);box(warmGlow,x+2,y+11.66,z,1.2,.12,.52);pool(x+2,y+.20,z,13)}
define('welding-skid',()=>{box(m.dark,0,.22,0,5,.44,2.5);box(m.orange,0,1.3,0,3.8,1.8,2);for(const z of [-1.02,1.02]){for(let x=-1.4;x<1.5;x+=.20)box(m.dark,x,1.45,z,.08,.65,.07);box(m.steel,0,.75,z,3.6,.15,.08)}for(const x of [-1.5,1.5]){box(m.dark,x,2.25,0,.2,.20,1.8);box(m.steel,x,.25,0,.22,.42,2.7)}cylinder(m.dark,1.7,2.45,.5,.12,.6)});
define('workboat',()=>{
 // Closed tapered hull built from cross sections with separately colored boot stripe.
 const n=32, rows=[[-2.0,.35],[0,.72],[2.2,1],[4.2,1],[5, .96]];
 function hullPoint(i,j){const x=-61+122*i/n, taper=Math.sqrt(Math.max(.001,1-Math.pow(Math.abs(x)/61,5)));return [x,rows[j][0],rows[j][1]*10*taper]}
 for(let j=0;j<rows.length-1;j++){const points=[];for(let i=0;i<n;i++){for(const sign of [-1,1]){const p=(a,b)=>{const v=hullPoint(a,b);v[2]*=sign;return v};let A=p(i,j),B=p(i+1,j),C=p(i+1,j+1),D=p(i,j+1);if(sign===1)points.push(...A,...B,...C,...A,...C,...D);else points.push(...A,...C,...B,...A,...D,...C)}}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));geo.setAttribute('uv',new T.Float32BufferAttribute(new Array(points.length/3*2).fill(0),2));geo.computeVertexNormals();part(geo,j<1?m.rust:j===1?m.dark:m.blue,0,0,0,1,1,1)}
 for(let i=0;i<n;i++){const a=hullPoint(i,4),b=hullPoint(i+1,4);box(m.dark,(a[0]+b[0])/2,5,(0),122/n+.03,.25,(a[2]+b[2]));}
 box(m.white,-35,12,0,23,13,18);box(m.glass,-35,16,9.1,19,3,.25);box(m.glass,-35,16,-9.1,19,3,.25);box(m.dark,-44,22,0,4,10,5);
 for(let x=-12;x<=35;x+=12){box(m.rust,x,8,0,10,5,16);for(const z of [-8,8])rail(x,11,z,10)}
 for(const x of [-49,49]){beam(m.steel,[x,6,0],[x,25,0],.3);box(m.light,x,25,0,.7,.6,.7)}
});
define('workshop-kit',()=>{box(m.dark,0,.35,0,10,.7,5);for(const x of [-3,0,3]){box(m.rust,x,1.4,0,2.7,2,2);for(const z of [-1.1,1.1])box(m.steel,x,1.1,z,2.6,.12,.14)}for(let x=-4;x<=4;x+=2){beam(m.steel,[x,.7,-2],[x,.7,2],.23);box(m.yellow,x,2.45,0,.25,.10,1.8)}});
for(let x=-1100;x<=1080;x+=42){if(clearScenery(x,18,1155))lamp(x,5.15,1155);for(const z of [1060,1100])box(m.steel,x,5.29,z,42,.12,.15);if(clearScenery(x,9,1020))place('welding-skid',x,5.25,1020,Math.PI/2)}
for(const x of [-950,-600,-240,220,590,1000])place('workboat',x,0,1322,Math.PI*(x>0?1:0));
for(const x of [695,1005])for(let z=-720;z<-360;z+=27){lamp(x,-7.8,z);if(clearScenery(x,-2,z))place('welding-skid',x,-7.8,z,Math.PI/2)}
for(const x of [660,1040])for(let z=-310;z<=360;z+=48){if(clearScenery(x,19,z))lamp(x,5.16,z);box(m.steel,x,5.25,z,.22,.12,48)}
for(const x of [-1010,-750,-670,-420,320,490,780,1080])for(let z=320;z<1000;z+=48){const xx=x+(rnd()-.5)*12,zz=z+(rnd()-.5)*16;if(clearScenery(xx,18,zz)){if(rnd()<.40)lamp(xx,5.26,zz);else place(rnd()<.5?'welding-skid':'workshop-kit',xx,5.26,zz,rnd()*Math.PI)}}
for(const x of [-940,-820,-600,-480])for(const z of [-650,-450,-170,100])for(let dz=-62;dz<65;dz+=20){if(clearScenery(x,12,z+dz)){place('workshop-kit',x,5.2,z+dz,Math.PI/2);pool(x,5.22,z+dz,9)}}
for(let x=-1080;x<1080;x+=54){if(clearScenery(x,18,-1318))lamp(x,5.24,-1318)}
for(const x of [-950,-720,-420,220,520,960]){if(clearScenery(x,72,1160))place('luffing-crane',x,5,1160,Math.PI/2,.8)}
for(const z of [-1100,-900,-680,-460,-240,180]){if(clearScenery(1150,85,z))place('luffing-crane',1150,5,z,Math.PI/2,.9)}
for(let x=-1050;x<1100;x+=48){const z=1000;if(clearScenery(x,15,z))place('container-far-'+['rust','blue','green','white'][Math.floor(rnd()*4)],x,5.2,z,Math.PI/2)}
for(let x=600;x<=900;x+=14)for(const z of [-950,-890]){box(m.dark,x,32,z,1.7,.5,1.7);box(warmGlow,x,32.4,z,.85,.25,.85);pool(x,8.2,z,8)}
// Sector-specific work areas: deliberately leave the existing inspection route open.
define('fabrication-canopy',()=>{
 for(const x of [-25,25])for(const z of [-15,15]){box(m.steel,x,8,z,1.2,16,1.2);box(m.concrete,x,.4,z,3,.8,3)}
 for(const z of [-15,15]){beam(m.steel,[-26,16,z],[26,16,z],1.1);for(let x=-25;x<25;x+=10)beam(m.dark,[x,16,z],[x+10,12,z],.5)}
 for(let x=-25;x<=25;x+=5)for(const sign of [-1,1])beam(m.steel,[x,16,sign*16],[x,21,0],.4);
 for(const sign of [-1,1]){const r=new T.Quaternion().setFromAxisAngle(V(1,0,0),sign*Math.atan2(5,16));part(boxGeo,m.blue,0,18.5,sign*8,54,.45,Math.hypot(16,5),r)}
 for(let x=-20;x<=20;x+=10){box(m.light,x,15.5,0,2,.24,.5);box(m.dark,x,1.2,-9,5,2.4,3)}
});
for(const x of [-600,-460,-320,-180,-40])if(clearScenery(x,27,950)){place('fabrication-canopy',x,5.2,950);pool(x,5.28,950,19)}
// Deep berth: retaining walls and maintenance staging tighten the actual drydock composition.
for(const x of [775,925]){
 box(m.concrete,x,-2,-550,3.2,12,330);
 box(m.steel,x,4.2,-550,5,.35,330);rail(x,5.25,-550,330,'z');
 for(let z=-706;z<-390;z+=16){box(m.dark,x,-1.8,z,4.1,10,.85);box(m.steel,x,3.9,z,5,.4,1.1);if(z%32===-2){box(warmGlow,x+(x<850?1.9:-1.9),2.5,z,.22,.7,1.1);pool(x+(x<850?7:-7),-7.75,z,9)}}
}
// Longitudinal catwalks and rib-mounted work lamps leave the ship's center unobstructed.
for(const z of [-945,-895]){
 box(m.steel,750,16,z,265,.45,3.4);rail(750,17,z+(z<-920?1.7:-1.7),265);
 for(let x=620;x<885;x+=14){beam(m.dark,[x,15.6,z],[x,9,z+(z<-920?-3:3)],.5);box(warmGlow,x,17.8,z,.9,.28,.5);pool(x,5.95,z,7)}
}
// Interior equipment is against the walls, not in the race line.
for(const center of [-650,-450,-170,100])for(const x of [-916,-844])for(let dz=-55;dz<=55;dz+=22){
 const z=center+dz;if(clearScenery(x,11,z)){place('welding-skid',x,5.24,z,Math.PI/2);pool(x,5.31,z,10)}
}
for(const center of [-650,-450,-170,100])for(let dz=-55;dz<=55;dz+=25)for(const x of [-906,-854]){
 const z=center+dz;box(warmGlow,x,43,z,2.6,.35,.5);fixturePositions.push([x,42.5,z]);pool(x,5.32,z,14)
}
// Pipe district: heavy valves, flanges and ground-level process equipment.
for(const z of [410,570,730])for(const x of [-920,-580]){
 if(!clearScenery(x,13,z))continue;
 for(const dz of [-16,16]){box(m.concrete,x,5.8,z+dz,10,1.6,7);beam(m.steel,[x-5,9,z+dz],[x+5,9,z+dz],2,2,true);for(const dx of [-3,3])beam(m.dark,[x+dx-.3,9,z+dz],[x+dx+.3,9,z+dz],2.4,2.4,true);cylinder(m.rust,x,11,z+dz,.6,3);box(m.yellow,x,12.5,z+dz,2,.25,.35)}
 pool(x,5.25,z,10)
}
// Distant coastline outside the playable footprint gives the port a geographical context.
const coastMat=new T.MeshStandardMaterial({color:0x353b43,roughness:1,metalness:0});
const coastGeo=new T.BufferGeometry(),coastPos=[],coastColors=[],coastIndices=[],coastN=160,coastM=32;
for(let iz=0;iz<=coastM;iz++)for(let ix=0;ix<=coastN;ix++){const x=-6400+ix*80,t=iz/coastM,shore=-2500-170*Math.sin(x*.0007)-90*Math.cos(x*.0025),z=shore-t*2200;
 const ridge=Math.sin(Math.PI*t)**1.6,large=.48+.24*Math.sin(x*.0008)+.13*Math.sin(x*.0019+1),small=.65+.35*smoothNoise(x*.002,z*.002);
 const height=-3+ridge*(70+large*460)*small;coastPos.push(x,height,z);const v=.25+.15*small+.09*ridge;coastColors.push(v*.79,v*.88,v);}
for(let iz=0;iz<coastM;iz++)for(let ix=0;ix<coastN;ix++){const a=iz*(coastN+1)+ix,b=a+1,c=a+coastN+1,d=c+1;coastIndices.push(a,b,c,b,d,c)}
coastGeo.setAttribute('position',new T.Float32BufferAttribute(coastPos,3));coastGeo.setAttribute('color',new T.Float32BufferAttribute(coastColors,3));coastGeo.setIndex(coastIndices);coastGeo.computeVertexNormals();coastMat.side=T.DoubleSide;coastMat.color.setHex(0xffffff);coastMat.vertexColors=true;part(coastGeo,coastMat,0,0,0,1,1,1);
// Richer native industrial architecture: each kit has an inspectable/exportable model.
// Reserve the original gate centerline; reject whole footprint candidates, not just their centers.
function clearFootprint(x,z,w,d,top){for(const dx of [-w/2,0,w/2])for(const dz of [-d/2,0,d/2])if(!clearScenery(x+dx,top,z+dz))return false;return true}
const rawSteel=material('#8b9196',.68,.46,'steel'),primer=material('#b27250',.18,.75,'steel'),deck=material('#5a615d',.3,.66,'steel');
define('heavy-gantry-detail',()=>{
 // Paired portal legs with substantial box sections, base bogies and a real trolley walkway.
 for(const x of [-62,62]){for(const z of [-13,13]){
  beam(m.orange,[x,3,z],[x*.85,106,z*.65],5.6,6.2);
  box(m.dark,x,1.5,z,15,3,10);
  for(const dx of [-5,-1.7,1.7,5])for(const dz of [-3.8,3.8])part(cylGeo,m.rubber,x+dx,1.35,z+dz,1.3,.75,1.3,new T.Quaternion().setFromAxisAngle(V(1,0,0),Math.PI/2));
  for(let y=13;y<=100;y+=15){const px=x*(1-y/700);box(rawSteel,px,y,z*.8,7,.65,7);for(const off of [-2.4,2.4])box(m.dark,px+off,y+.45,z*.8,.35,.3,6)}
 }
 for(let y=8;y<100;y+=14){const px=x*(1-y/700),px2=x*(1-(y+14)/700);beam(m.orange,[px,y,-12],[px2,y+14,12],1.5);beam(rawSteel,[px,y,12],[px2,y+14,-12],.65);}
 for(const off of [-.35,.35])beam(m.steel,[x-4,4,off],[x*.85-4,106,off],.12,.12,true);
 for(let y=4;y<105;y+=.75)beam(m.steel,[x*(1-y/700)-4,y,-.35],[x*(1-y/700)-4,y,.35],.065,.065,true);
 }
 for(const z of [-9,9]){
  box(m.orange,0,110,z,142,8,4.5);box(rawSteel,0,114.5,z,142,.7,5.8);box(m.dark,0,105.5,z,141,.55,4.8);
  for(let x=-68;x<70;x+=7){beam(rawSteel,[x,106,z-2.3],[x+6,114,z-2.3],.45);box(m.dark,x,110,z+2.35,.25,7.2,.35)}
  box(deck,0,115.2,z,144,.45,3);rail(0,116.4,z+1.5,142);
 }
 for(let x=-64;x<=64;x+=8)box(m.steel,x,112,0,1.25,1.4,19);
 box(m.orange,8,118,0,17,5.8,21);box(m.dark,8,121.2,0,18,.6,22);
 box(m.glass,19,114,12,6,4.5,4);box(m.steel,19,111.4,12,7,.4,5);
 for(const x of [2,14])for(const z of [-3,3])beam(m.dark,[x,113,z],[x,64,z],.12,.12,true);
 box(m.yellow,8,63,0,15,2.8,7);box(m.dark,8,61.1,0,11,.6,4);
 for(const x of [-54,54])for(const z of [-10,10])box(m.light,x,104,z,2,.5,2);
});
define('lattice-boom-crane',()=>{
 box(m.dark,0,1.8,0,13,3.6,13);cylinder(m.steel,0,4,0,5,1.2);box(m.orange,-2,7,0,11,5,7);
 for(const x of [-3.2,3.2])for(const z of [-3.2,3.2])beam(m.orange,[x,10,z],[x*.52,51,z*.52],.72);
 for(let y=10;y<49;y+=5.5)for(const z of [-2.5,2.5]){beam(m.orange,[-3,y,z],[3,y+5.5,z],.42);beam(m.steel,[3,y,z],[-3,y+5.5,z],.25)}
 box(m.glass,4.5,48,0,4.7,3.5,4.6);box(m.orange,4.5,50,0,5.4,.6,5.2);
 const A=[0,51,0],B=[55,80,0];for(const z of [-1.65,1.65]){beam(m.orange,[A[0],A[1]-2,z],[B[0],B[1],z*.25],.64);beam(m.orange,[A[0],A[1]+2,z],[B[0],B[1],z*.25],.54);for(let i=0;i<11;i++){let a=i/11,b=(i+1)/11;beam(m.orange,[55*a,49+31*a,z*(1-a*.75)],[55*b,53+27*b,z*(1-b*.75)],.33)}}
 beam(m.steel,[-18,58,0],[0,63,0],1.2);box(m.dark,-17,57,0,8,5,6);
 beam(m.dark,[-17,61,0],[55,80,0],.12,.12,true);for(const z of [-.65,.65])beam(m.dark,[55,79,z],[55,30,z],.09,.09,true);box(m.yellow,55,29,0,2.5,2,2.5);
});
define('pipe-bundle',()=>{for(const x of [-5,0,5])box(deck,x,.3,0,.65,.6,5.2);for(let r=0;r<3;r++)for(let i=0;i<5-r;i++){let z=(i-(4-r)/2)*1.05;beam(rawSteel,[-6,.95+r*.88,z],[6,.95+r*.88,z],.48,.48,true);for(const x of [-5.8,5.8])beam(m.dark,[x-.12,.95+r*.88,z],[x+.12,.95+r*.88,z],.53,.53,true)}});
define('pallet-load',()=>{for(const x of [-1.5,0,1.5])box(deck,x,.14,0,.22,.28,2.4);for(let x=-1.7;x<=1.7;x+=.36)box(m.steel,x,.36,0,.28,.15,2.4);for(const z of [-.55,.55]){box(primer,0,1.15,z,2.8,1.4,1);for(const x of [-.85,.85])box(m.dark,x,1.16,z, .08,1.43,1.03)}});
define('utility-cart',()=>{box(m.dark,0,.5,0,3.6,.4,2);box(m.orange,-.65,1.3,0,2.1,1.1,1.8);box(m.glass,-.9,2.1,0,1.5,.8,1.65);for(const x of [-1.2,1.2])for(const z of [-.95,.95])part(cylGeo,m.rubber,x,.45,z,.48,.27,.48,new T.Quaternion().setFromAxisAngle(V(1,0,0),Math.PI/2));box(m.steel,1.5,.9,0,.55,.4,1.9)});
define('industrial-barrier',()=>{box(m.concrete,0,.25,0,3.5,.5,1.15);for(const x of [-1.4,1.4])box(m.yellow,x,1,0,.19,1.5,.18);box(m.yellow,0,1.42,0,3.1,.16,.16);for(let x=-1.4;x<1.5;x+=.5)beam(m.dark,[x,.7,0],[x+.3,1.4,0],.12)});
define('maintenance-bay',()=>{for(const x of [-9,9])for(const z of [-7,7]){box(m.steel,x,4,z,.45,8,.45);box(m.concrete,x,.2,z,1.5,.4,1.5)}for(const z of [-7,7]){box(m.steel,0,8,z,19,.7,.6);for(let x=-9;x<=9;x+=3)beam(rawSteel,[x,7,z],[x+2,8.3,z],.18)}
 box(m.blue,0,8.5,0,20,.3,15);for(let x=-8;x<=8;x+=4)box(m.light,x,8.1,0,1.3,.2,.45);box(m.dark,0,1,-5,10,2,1.5);for(let x=-4;x<=4;x+=2)box(m.orange,x,1.2,-4,1.5,1.8,1.2);
});
define('breakwater-armour',()=>{const g=new T.IcosahedronGeometry(1,1);for(let i=0;i<7;i++){const a=i*2.399,r=3+(i%3)*1.8;part(g,m.concrete,Math.cos(a)*r,1.2+(i%3)*.6,Math.sin(a)*r,2.5+(i%2),2.1,2.9,new T.Quaternion().setFromAxisAngle(up,a))}});
// Purpose-built ship silhouettes: lofted longitudinal sections, bridge, coamings,
// loading booms and deck machinery. No race volume is inferred from this visual mesh.
define('merchant-vessel',()=>{
 const length=208, stations=40, sections=[[-4,.28],[-1,.68],[2,.94],[8,1],[11.8,.96]];
 const hullmat=new T.MeshStandardMaterial({color:0x334d5b,metalness:.26,roughness:.66});
 const bootmat=new T.MeshStandardMaterial({color:0x722c27,metalness:.2,roughness:.73});
 const topmat=new T.MeshStandardMaterial({color:0x384144,metalness:.38,roughness:.58});
 function width(x){const q=x/(length/2);return 16.3*Math.sqrt(Math.max(.0005,1-Math.abs(q)**(q>0?3.8:9)))}
 function P(i,j,side){const x=-length/2+i*length/stations;return [x,sections[j][0]+(i>stations-5?Math.pow((i-stations+5)/5,2)*2.4:0),side*width(x)*sections[j][1]]}
 for(let j=0;j<sections.length-1;j++){const p=[],uv=[];for(let i=0;i<stations;i++)for(const side of [-1,1]){const A=P(i,j,side),B=P(i+1,j,side),C=P(i+1,j+1,side),D=P(i,j+1,side);for(const v of (side>0?[A,B,C,A,C,D]:[A,C,B,A,D,C])){p.push(...v);uv.push(v[0]/6,v[1]/6)}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();part(g,j===0?bootmat:j===1?m.dark:hullmat,0,0,0,1,1,1)}
 const deckP=[],deckUv=[];for(let i=0;i<stations;i++){const A=P(i,4,-1),B=P(i,4,1),C=P(i+1,4,1),D=P(i+1,4,-1);for(const v of [A,B,C,A,C,D]){deckP.push(...v);deckUv.push(v[0]/6,v[2]/6)}}
 const dg=new T.BufferGeometry();dg.setAttribute('position',new T.Float32BufferAttribute(deckP,3));dg.setAttribute('uv',new T.Float32BufferAttribute(deckUv,2));dg.computeVertexNormals();part(dg,topmat,0,0,0,1,1,1);
 for(let i=0;i<stations;i++)for(const side of [-1,1]){const a=P(i,4,side),b=P(i+1,4,side);beam(m.steel,[a[0],a[1]+1,a[2]],[b[0],b[1]+1,b[2]],.12,.12,true);beam(m.steel,a,[a[0],a[1]+1,a[2]],.12)}
 for(const x of [-42,-10,22,54]){box(m.rust,x,13.2,0,26,2.6,23);box(m.dark,x,14.6,0,25,.3,22);for(let dx=-10;dx<=10;dx+=5)box(m.steel,x+dx,14.85,0,.18,.18,21)}
 for(let y=15;y<=27;y+=4){box(m.white,-73,y,0,28-(y-15)*.5,3.8,24);for(const z of [-12.1,12.1])for(let x=-83;x<=-63;x+=4)box(m.glass,x,y+.55,z,2.4,1.2,.18)}
 box(m.white,-73,29,0,31,3,25);box(m.glass,-73,29.2,12.6,28,1.6,.18);box(m.glass,-57.4,29.2,0,.18,1.6,24);
 box(m.dark,-87,34,0,7,7,8);box(m.rust,-87,37.8,0,8,.7,9);beam(m.steel,[-73,31,0],[-73,48,0],.22);beam(m.steel,[-78,43,0],[-68,43,0],.16);box(m.light,-73,47.9,0,.6,.45,.6);
 for(const x of [-27,6,38]){cylinder(m.steel,x,17,0,1.35,7);beam(m.orange,[x,20,0],[x+16,33,0],1.1);beam(m.dark,[x+16,33,0],[x+16,16,0],.1,.1,true);box(m.yellow,x+16,15.5,0,1.4,1.2,1.4)}
 for(const x of [-95,90])for(const z of [-5,5]){cylinder(m.dark,x,13,z,.85,1.3);cylinder(m.steel,x,13.8,z,1.1,.35)}
});
place('merchant-vessel',480,0,-550,Math.PI/2);
place('merchant-vessel',390,0,-1030,Math.PI/2,.72);
place('heavy-gantry-detail',850,5,50);
 // Rail-mounted drydock gantry on raised concrete runway strips.
 for(const x of [788,912]){box(m.concrete,x,-1.5,-535,15,13,350);box(m.steel,x,5.15,-535,1.3,.3,350);for(let z=-702;z<-365;z+=9)box(m.dark,x,5.31,z,3,.22,.65)}
 place('heavy-gantry-detail',850,5.5,-535);
 define('dock-transfer-portal',()=>{
  for(const z of [-48,48]){box(m.concrete,0,1.25,z,12,2.5,10);for(const x of [-4.5,4.5]){box(m.orange,x,32,z,3,64,3);for(let y=8;y<60;y+=10)beam(m.steel,[x,y,z-2],[x,y+10,z+2],.65)}box(m.steel,0,63,z,12,2,9)}
  for(const x of [-4,4]){box(m.orange,x,65,0,2.7,3.8,103);for(let z=-46;z<48;z+=8){beam(m.steel,[x,63,z],[x,71,z+8],.65);beam(m.orange,[x,71,z],[x,63,z+8],.55)}box(m.steel,x,71,0,1.1,1.1,103);rail(x,72,0,101,'z')}
  box(m.dark,0,67,0,10,.9,103);for(let z=-40;z<=40;z+=16)box(m.light,0,62,z,1.6,.5,1.6);
  box(m.glass,-6,57,42,4,5,6);box(m.dark,-6,54,42,5,.5,7);
 });
 for(const x of [-810,-490,-140])place('dock-transfer-portal',x,5.1,1080);
 
for(const [x,z,a] of [[-1030,1160,.45],[-410,1180,1.1],[340,1175,1.3],[1060,-290,2.8],[1130,-900,3.0],[250,-1050,1.1]])if(clearFootprint(x,z,18,18,75))place('lattice-boom-crane',x,5,z,a);
for(const [cx,cz] of [[-990,1015],[-760,1015],[-470,1015],[-150,1015],[350,920],[650,735],[1010,870],[960,-255],[685,-620],[1020,-605],[-950,-540],[-820,20],[-960,530],[-615,685]]){
 for(let i=0;i<13;i++){const x=cx+(i%4-1.5)*13,z=cz+(Math.floor(i/4)-1)*12;if(!clearFootprint(x,z,12,6,10))continue;const kind=['pipe-bundle','pallet-load','utility-cart','welding-skid','industrial-barrier'][i%5];place(kind,x,cz<-350&&cz>-750&&cx>650&&cx<1050?-7.8:5.29,z,(i%4)*Math.PI/2)}
 if(clearFootprint(cx,cz+24,20,16,15)&&!(cz<-350&&cz>-750&&cx>650))place('maintenance-bay',cx,5.26,cz+24);
}
// Container walls in offset groups: close silhouettes without a constant-height grid.
for(const [cx,cz] of [[430,1020],[540,920],[720,860],[780,710],[950,690],[1050,570]]){
 for(let i=0;i<7;i++){const x=cx+(i-3)*14,z=cz+((i%2)?14:-14);for(let h=0;h<8;h++){if(!clearFootprint(x,z,13,3,5+(h+1)*2.94))break;place('container-'+['rust','blue','green','white'][(i+h)%4],x,5+h*2.94,z,0)}}
}
// Flight-facing industrial street walls: elevated maintenance decks and varied sheds.
define('dock-transfer-hall',()=>{
 const W=70,D=37,H=24;for(const x of [-W/2,W/2])for(const z of [-D/2,D/2]){box(m.steel,x,H/2,z,1.35,H,1.35);box(m.concrete,x,.55,z,3,1.1,3)}
 for(const z of [-D/2,D/2]){box(m.blue,0,H-3,z,W,6,.55);for(let x=-W/2+2;x<W/2;x+=4)box(rawSteel,x,H-3,z,.23,5.8,.75);box(m.orange,0,H-6.3,z,W,.55,.7);for(let x=-W/2+3;x<W/2;x+=10)box(m.glass,x,H-2,z,5,1.6,.6)}
 for(let x=-W/2;x<=W/2;x+=7){for(const z of [-D/2,D/2])beam(rawSteel,[x,H,z],[x,H+6,0],.65);beam(m.steel,[x,H,-D/2],[x,H,D/2],.6);beam(m.steel,[x,H,-D/2],[x,H+6,0],.35)}
 for(const side of [-1,1]){const a=side*Math.atan2(6,D/2);part(boxGeo,m.blue,0,H+3,side*D/4,W+2,.48,Math.hypot(D/2,6)+1,new T.Quaternion().setFromAxisAngle(V(1,0,0),a))}
 for(const x of [-27,0,27]){box(m.orange,x,13,0,2,1.5,D-3);box(m.dark,x,12,0,3,1.3,4);beam(m.dark,[x,11.5,0],[x,5.5,0],.1,.1,true);box(m.yellow,x,5,0,1.2,.75,1.2)}
 for(let x=-27;x<=27;x+=9){box(m.light,x,H-7,-D/2+.6,2,.3,.5);box(m.dark,x,1.1,-D/2+3,6,2,2)}
});
for(const [x,z] of [[-1060,1005],[-820,995],[-580,995],[-340,995],[-100,995],[130,1000],[200,1155],[490,1155],[715,1155],[1030,1155]]){
 if(clearFootprint(x,z,74,41,36)){place('dock-transfer-hall',x,5.25,z);for(let j=-2;j<=2;j++){if(clearFootprint(x+j*12,z+24,12,8,11))place('pipe-bundle',x+j*12,5.28,z+24);pool(x+j*12,5.31,z+20,8)}}
}
// Service passage on the central dock sides; retain the wet channel in between.
for(const x of [340,620])for(let z=-755;z<-360;z+=28){box(m.concrete,x,1.3,z,10,5.4,28);box(deck,x,4.2,z,10,.4,28);if(z%56<-20)place('bollard',x,4.4,z);if(clearFootprint(x,z,10,12,10))place('pallet-load',x,4.42,z+5)}
for(let x=585;x<910;x+=14)for(const z of [-942,-898]){
 box(m.steel,x,10.5,z,1.1,3.8,1.2);box(m.rust,x,12.6,z,1.5,.45,2.3);
 if(x%28===25)box(m.yellow,x,17.1,z,.35,.4,.45);
}
// Dry dock mechanical service galleries: platforms, stair flights, pipe penetrations,
 // fender posts and railings outside the central dive corridor.
for(const x of [752,948]){const side=x<850?-1:1;for(let z=-715;z<-365;z+=36){
 box(m.concrete,x,-7.35,z,13,1.3,30);box(m.steel,x,-6.58,z,12,.25,29);
 for(const dx of [-4.5,4.5]){box(m.dark,x+dx,-2,z,.65,8,.65);beam(m.steel,[x+dx,-5.8,z-12],[x+dx,1.8,z+12],.35)}
 box(m.steel,x,1.9,z,11.8,.45,29);rail(x-side*5.6,3,z,29,'z');
 box(m.rust,x+side*4,-3,z,2.8,4.5,6);for(let dz=-8;dz<=8;dz+=4){beam(m.dark,[x-4,-4,z+dz],[x+4,-4,z+dz],.32,.32,true);beam(m.steel,[x+3.5,-4,z+dz],[x+4.2,-4,z+dz],.44,.44,true)}
 box(m.light,x,3.35,z,1.2,.25,.65);pool(x,-6.39,z,8);
 if(z%72<-30){for(let j=0;j<14;j++)box(m.steel,x+side*3,-6.4+j*.58,z-12+j*1.3,3.2,.22,1.4);beam(m.yellow,[x+side*4.6,-5.35,z-12],[x+side*4.6,2.2,z+5],.10)}
}}
 // Connected utility conduits alongside outer dock faces.
for(const x of [767,933]){for(let z=-730;z<-375;z+=28){beam(m.steel,[x,-.6,z],[x,-.6,z+28],.6,.6,true);beam(m.rust,[x,1.3,z],[x,1.3,z+28],.36,.36,true);box(m.dark,x,-.6,z,.65,1.5,.5)}}
 // Offset secondary container walls along the technical-sector gate directions.
 for(let i=4;i<=6;i++){const a=routePoints[i],b=routePoints[i+1],dx=b[0]-a[0],dz=b[2]-a[2],l=Math.hypot(dx,dz),nx=-dz/l,nz=dx/l;
  for(const side of [-1,1])for(let k=1;k<=5;k++){const t=k/6,x=a[0]+dx*t+nx*36*side,z=a[2]+dz*t+nz*36*side;
   for(let h=0;h<7+(k%3);h++){if(!clearFootprint(x,z,14,14,5+(h+1)*2.94))break;place('container-'+['rust','blue','green','white'][(h+k+i)%4],x,5+h*2.94,z,Math.PI/2)}
  }
 }
 // Quay coping, mooring ropes, tidal staining, drain channels and riprap.
const stain=new T.MeshStandardMaterial({color:0x353b35,roughness:.95,metalness:0}),foam=new T.MeshBasicMaterial({color:0xc3d5d8,transparent:true,opacity:.22,depthWrite:false});
for(let x=-1160;x<=1160;x+=25){box(stain,x,1.2,1200.05,24.8,1.5,.16);box(rawSteel,x,5.25,1195,24.5,.14,.25);if(x%100===-60)place('bollard',x,5.15,1194);place('breakwater-armour',x,0,-1342);box(foam,x,-.12,-1354,11,.04,1.1)}
for(const x of [-1178,1178])for(let z=125;z<1200;z+=25){box(stain,x,1.5,z,.15,1.8,24.8);box(rawSteel,x,5.25,z,.25,.12,24.5)}
for(const x of [655,1045])for(let z=-734;z<-365;z+=15){box(stain,x+(x<850?5.1:-5.1),-4.5,z,.12,4,14.8);box(rawSteel,x+(x<850?6:-6),-2,z,.55,.5,14.8);box(m.dark,x+(x<850?5.2:-5.2),-2.2,z,.25,1.1,1.1)}
for(const [x,z] of [[-900,1270],[-420,1270],[60,1270],[650,1270],[1020,1270]]){beam(m.dark,[x-12,3,z-4],[x-18,5.5,1195],.12,.12,true);beam(m.dark,[x+12,3,z-4],[x+18,5.5,1195],.12,.12,true)}
for(const [key,b] of batches){const mesh=new T.InstancedMesh(b.g,b.mat,b.matrices.length);mesh.name='batch-'+key;mesh.frustumCulled=false;for(let i=0;i<b.matrices.length;i++)mesh.setMatrixAt(i,b.matrices[i]);mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=b.mat!==glowMat&&b.mat!==warmGlow;mesh.receiveShadow=b.mat!==glowMat;scene.add(mesh)}
const waterTex=texture('#888888','steel');waterTex.repeat.set(70,70);const waterMat=new T.MeshStandardMaterial({color:0x203b49,roughness:.36,metalness:.28,bumpMap:waterTex,bumpScale:.6});
// World-position ripples avoid the previous giant repeated bump texture.
waterMat.bumpMap=null;
waterMat.onBeforeCompile=shader=>{
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSea;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvSea=(modelMatrix*vec4(transformed,1.0)).xyz;');
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vSea;').replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nvec2 seaP=vSea.xz; vec2 w1=vec2(.32,.19),w2=vec2(-.61,1.13),w3=vec2(.91,.74);float p1=dot(seaP,w1),p2=dot(seaP,w2),p3=dot(seaP,w3);float a1=1.-smoothstep(.4,2.0,fwidth(p1)),a2=1.-smoothstep(.4,2.0,fwidth(p2)),a3=1.-smoothstep(.4,2.0,fwidth(p3));vec2 rip=.09*cos(p1)*w1*a1+.045*sin(p2)*w2*a2+.035*cos(p3)*w3*a3;normal=normalize(normal+mat3(viewMatrix)*vec3(rip.x,0.,rip.y));').replace('#include <color_fragment>','#include <color_fragment>\nfloat seaRip=sin(vSea.x*.022+sin(vSea.z*.013)*2.0)*cos(vSea.z*.024);diffuseColor.rgb*=.93+.07*seaRip;');
};
// Four water planes deliberately exclude the excavated basin [650,1050] x [-750,-350].
function waterTile(x,z,w,d){const water=new T.Mesh(new T.PlaneGeometry(w,d),waterMat);water.rotation.x=-Math.PI/2;water.position.set(x,-.25,z);scene.add(water)}
waterTile(-9675,0,20650,40000);waterTile(10525,0,18950,40000);waterTile(850,-10375,400,19250);waterTile(850,9825,400,20350);
// Aircraft gates are free-standing in the air, not arches with ground legs.
const gates=layout.sectors.flatMap((s,i)=>s.gates.map((p,j)=>({p:V(...p),sector:i,index:i*4+j+1})));
const guide=new T.Group();guide.name='aerial-route';scene.add(guide);const gateGeo=new T.TorusGeometry(10,.35,8,48);const edgeGeo=new T.TorusGeometry(10.5,.19,6,48),edgeMat=new T.MeshStandardMaterial({color:0x2b343b,metalness:.65,roughness:.42});const gateMat=new T.MeshBasicMaterial({color:0xff3d35,toneMapped:false});for(let i=0;i<gates.length;i++){const g=gates[i],next=gates[(i+1)%gates.length],prev=gates[(i+gates.length-1)%gates.length];const tangent=next.p.clone().sub(prev.p).normalize();const mesh=new T.Mesh(gateGeo,gateMat);if(g.sector===3||g.sector===4||g.sector===6)mesh.scale.setScalar(.6);mesh.position.copy(g.p);mesh.quaternion.setFromUnitVectors(V(0,0,1),tangent);mesh.name='CP'+g.index;guide.add(mesh);const edge=new T.Mesh(edgeGeo,edgeMat);edge.position.copy(mesh.position);edge.quaternion.copy(mesh.quaternion);edge.scale.copy(mesh.scale);guide.add(edge)}
const route=new T.LineLoop(new T.BufferGeometry().setFromPoints(gates.map(g=>g.p)),new T.LineBasicMaterial({color:0xff6456,transparent:true,opacity:.85}));guide.add(route);
// Separate asset inspection scene shares the exact merged source models and lighting.
const assetScene=new T.Scene();assetScene.background=new T.Color(0x303941);assetScene.environment=scene.environment;assetScene.add(new T.HemisphereLight(0xc0d8ed,0x49413c,1.35));const assetSun=new T.DirectionalLight(0xffcf99,3.1);assetSun.position.set(-160,100,80);assetScene.add(assetSun);const assetFloor=new T.Mesh(new T.PlaneGeometry(2000,2000),new T.MeshStandardMaterial({color:0x45494b,roughness:.8}));assetFloor.rotation.x=-Math.PI/2;assetFloor.position.y=-.1;assetScene.add(assetFloor);let inspected=null;const assetCamera=new T.PerspectiveCamera(42,1,.1,4000);
function assetView(name){const source=templates[name];if(!source)throw Error('unknown asset '+name);if(inspected)assetScene.remove(inspected);inspected=source.clone();assetScene.add(inspected);const bounds=new T.Box3().setFromObject(inspected),center=bounds.getCenter(V(0,0,0)),size=bounds.getSize(V(0,0,0)),r=Math.max(size.x,size.y,size.z);assetCamera.aspect=innerWidth/innerHeight;assetCamera.updateProjectionMatrix();assetCamera.position.copy(center).add(V(r*1.05,r*.68,r*1.1));assetCamera.lookAt(center);active=assetCamera;mode='asset-'+name;tour=false;render()}
// Keep only a small fixed-size set of real practical point lights active near
// the camera. Distant fixtures retain their emissive meshes and baked glow pools.
const practical=Array.from({length:4},()=>{const p=new T.PointLight(0xffbe77,0,75,2);scene.add(p);return p});
function updatePractical(camera){const pos=camera.position;const nearby=fixturePositions.map(p=>({p,d:(p[0]-pos.x)**2+(p[1]-pos.y)**2+(p[2]-pos.z)**2})).sort((a,b)=>a.d-b.d).slice(0,practical.length);for(let i=0;i<practical.length;i++){const f=nearby[i],light=practical[i];if(f&&f.d<160**2){light.position.set(...f.p);light.intensity=420}else light.intensity=0}}
const camera=new T.PerspectiveCamera(57,1,.5,12000),top=new T.OrthographicCamera(-1650,1650,1650,-1650,1,10000);let active=camera,mode='overview',tour=false,dist=0,drag=false,yaw=0,pitch=0;const keys=new Set(),tmp=V(0,0,0);let last=performance.now();const presets={overview:[[-1600,1400,1720],[0,20,0]],north:[[1450,1300,-1720],[0,20,0]],top:[[0,4200,0],[0,0,0]],'1-launch':[[-1000,34,1108],[-650,42,1080]],'2-containers':[[384,25,1000],[620,32,850]],'3-crane':[[1000,35,210],[850,100,50]],'4-dive':[[850,137,-280],[850,0,-650]],'5-hull':[[925,27,-920],[600,24,-920]],'6-breakwater':[[350,30,-1250],[-600,30,-1280]],'7-foundry':[[-880,26,-558],[-880,29,-500]],'8-pipes':[[-970,65,320],[-760,32,740]]};
function resize(){const a=innerWidth/innerHeight;renderer.setSize(innerWidth,innerHeight);camera.aspect=a;camera.updateProjectionMatrix();const h=1580*Math.max(1,1/a);top.left=-h*a;top.right=h*a;top.top=h;top.bottom=-h;top.updateProjectionMatrix()}
function angles(){camera.rotation.order='YXZ';yaw=camera.rotation.y;pitch=camera.rotation.x}
function setView(id){if(!presets[id])throw Error('unknown view '+id);tour=false;mode=id;active=id==='top'?top:camera;scene.fog.density=id==='top'?0:.00012;const [p,l]=presets[id];active.position.set(...p);active.up.set(0,id==='top'?0:1,id==='top'?-1:0);active.lookAt(...l);if(active===camera)angles();document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===id));render()}
function render(){if(active!==assetCamera)updatePractical(active);renderer.render(active===assetCamera?assetScene:scene,active);document.getElementById('readout').textContent=mode.toUpperCase()+' / '+active.position.toArray().map(Math.round).join(' · ')+' m'}
const lengths=gates.map((g,i)=>g.p.distanceTo(gates[(i+1)%gates.length].p)),total=lengths.reduce((a,b)=>a+b,0);
function coursePoint(s){s=((s%total)+total)%total;let i=0;while(s>=lengths[i]&&i<lengths.length-1){s-=lengths[i++]};return gates[i].p.clone().lerp(gates[(i+1)%gates.length].p,s/lengths[i])}
function sampleCourse(s){active=camera;mode='course';camera.position.copy(coursePoint(s));camera.lookAt(coursePoint(s+28));angles()}
function tick(t){const dt=Math.min(.05,(t-last)/1000);last=t;if(tour){dist=(dist+dt*42)%total;sampleCourse(dist)}else if(active===camera&&keys.size){const step=dt*(keys.has('ShiftLeft')||keys.has('ShiftRight')?160:45);camera.getWorldDirection(tmp);if(keys.has('KeyW'))camera.position.addScaledVector(tmp,step);if(keys.has('KeyS'))camera.position.addScaledVector(tmp,-step);tmp.cross(up).normalize();if(keys.has('KeyD'))camera.position.addScaledVector(tmp,step);if(keys.has('KeyA'))camera.position.addScaledVector(tmp,-step);if(keys.has('KeyE'))camera.position.y+=step;if(keys.has('KeyQ'))camera.position.y-=step;camera.position.x=T.MathUtils.clamp(camera.position.x,-1385,1385);camera.position.z=T.MathUtils.clamp(camera.position.z,-1385,1385);camera.position.y=T.MathUtils.clamp(camera.position.y,-5,310);mode='free'}if(tour||keys.size)render();requestAnimationFrame(tick)}
addEventListener('resize',()=>{resize();assetCamera.aspect=innerWidth/innerHeight;assetCamera.updateProjectionMatrix();render()});addEventListener('keydown',e=>{if(e.code==='KeyH'&&!e.repeat)document.body.classList.toggle('clean');keys.add(e.code)});addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();drag=false});renderer.domElement.addEventListener('pointerdown',e=>{if(active!==camera)return;drag=true;tour=false;renderer.domElement.setPointerCapture(e.pointerId)});renderer.domElement.addEventListener('pointerup',()=>drag=false);renderer.domElement.addEventListener('pointercancel',()=>drag=false);renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;yaw-=e.movementX*.003;pitch=T.MathUtils.clamp(pitch-e.movementY*.003,-1.5,1.5);camera.rotation.set(pitch,yaw,0,'YXZ');mode='free';render()});renderer.domElement.addEventListener('wheel',e=>{if(active!==camera)return;e.preventDefault();camera.fov=T.MathUtils.clamp(camera.fov+e.deltaY*.025,28,88);camera.updateProjectionMatrix();render()},{passive:false});
for(const id of Object.keys(presets)){const b=document.createElement('button');b.dataset.view=id;b.textContent=id; b.onclick=()=>setView(id);document.getElementById('views').append(b)}
document.getElementById('tour').onclick=()=>{tour=!tour;if(tour){dist=0;sampleCourse(0)}};document.getElementById('route').onclick=()=>{guide.visible=!guide.visible;render()};document.getElementById('capture').onclick=()=>{render();const a=document.createElement('a');a.download='iron-tide-'+mode+'.png';a.href=renderer.domElement.toDataURL('image/png');a.click()};
renderer.shadowMap.needsUpdate=true;resize();setView('overview');requestAnimationFrame(tick);
window.IRON_TIDE={assetView,projectGates(){return gates.map(g=>{const p=g.p.clone().project(active);return {index:g.index,sector:g.sector,x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2,altitude:g.p.y}})},views:Object.keys(presets),setView,clean(v){document.body.classList.toggle('clean',v)},route(v){guide.visible=v;render()},course(s){tour=false;sampleCourse(s);render()},stats(){return {gates:gates.length,lapMeters:total,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,assets:Object.keys(templates),containerStacks:containerSlots.length,photoMaterials:loadedMaterials.slice(),skySource,view:mode,position:active.position.toArray(),revision:T.REVISION}},async exportAsset(name){const group=templates[name];if(!group)throw Error('unknown asset');return new Promise((resolve,reject)=>{try{new T.GLTFExporter().parse(group,buffer=>{if(!(buffer instanceof ArrayBuffer)){reject(Error('not binary'));return}const bytes=new Uint8Array(buffer);let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));resolve(btoa(s))},{binary:true,maxTextureSize:256,onlyVisible:true})}catch(e){reject(e)}})}};
})().catch(e=>{console.error(e);const el=document.getElementById('error');el.style.display='block';el.textContent=String(e.stack||e)});
