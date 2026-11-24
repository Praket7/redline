/* IRON TIDE independent camera lab; Three r128. Original procedural assets. */
(async function(){
'use strict';
const T=THREE, V=(x,y,z)=>new T.Vector3(x,y,z), layout=window.IRON_TIDE_LAYOUT || await (await fetch('layout.json')).json();
const scene=new T.Scene();scene.background=new T.Color(0xb1a9a2);scene.fog=new T.FogExp2(0x777b86,.00012);
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;renderer.physicallyCorrectLights=true;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;document.body.prepend(renderer.domElement);
const sun=new T.DirectionalLight(0xffb36f,2.85);sun.position.set(-1600,720,800);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-1850,right:1850,top:1850,bottom:-1850,near:10,far:5200});sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.00025;sun.shadow.normalBias=1.1;scene.add(sun,new T.HemisphereLight(0x9eafd1,0x69584a,1.02));
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
// Preserve photographic structure while grade-matching the red oxide, painted
// steel and rain-darkened asphalt palette. Paint/corrosion is not bare metal.
if(loadedMaterials.includes('asphalt'))m.road.color.setHex(0x92918b);
if(loadedMaterials.includes('concrete'))m.concrete.color.setHex(0xbab1a5);
if(loadedMaterials.includes('rust'))m.rust.color.setHex(0xc27d51);
if(loadedMaterials.includes('paint'))m.orange.color.setHex(0xedaa69);
if(loadedMaterials.includes('steel'))m.steel.color.setHex(0xb4b9b8);
for(const mat of Object.values(m))if(mat.isMeshStandardMaterial)mat.envMapIntensity=.72;
// Rebuild the albedo for intact paint over worn steel using the photographic map
// as a corrosion mask, rather than making every crane and container entirely rust.
function coat(mat,hex,wear){const src=mat.map.image;const c=document.createElement('canvas');c.width=c.height=Math.min(1024,src.width);const ctx=c.getContext('2d');ctx.drawImage(src,0,0,c.width,c.height);const image=ctx.getImageData(0,0,c.width,c.height),rgb=[(hex>>16)&255,(hex>>8)&255,hex&255];
 const W=c.width;for(let y=0;y<W;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4,r=image.data[i],g=image.data[i+1],b=image.data[i+2],lum=(r+g+b)/765;
 const oxide=T.MathUtils.clamp((r-b)/90+.18,0,1),patch=smoothCoat(x/W,y/W),exposed=Math.min(.83,wear*(.12+oxide*.68)*patch);
 const shade=.77+.37*lum;for(let k=0;k<3;k++){const base=rgb[k]*shade,metal=[r,g,b][k]*.77;image.data[i+k]=Math.round(base*(1-exposed)+metal*exposed)}}
 ctx.putImageData(image,0,0);const map=new T.CanvasTexture(c);map.wrapS=map.wrapT=T.RepeatWrapping;map.encoding=T.sRGBEncoding;map.anisotropy=mat.map.anisotropy;mat.map=map;mat.color.setHex(0xffffff);mat.metalness=.07;mat.roughness=.78;mat.normalScale.set(.28,.28);mat.needsUpdate=true}
function smoothCoat(x,y){const v=.5+.25*Math.sin(x*31.416+Math.sin(y*12.566)*1.8)+.15*Math.cos(y*25.133+Math.sin(x*18.85));return T.MathUtils.clamp(v,0,1)}
coat(m.orange,0xc96a2c,.63);coat(m.blue,0x3f6170,.45);coat(m.green,0x586d58,.39);coat(m.white,0xb9b5a5,.36);
 // Painted machinery is not bare, uniformly corroded steel. Preserve subtle
 // real photographic wear while using a much lower normal amplitude.
 if(loadedMaterials.includes('steel')){m.dark.map=m.steel.map;m.dark.normalMap=m.steel.normalMap;m.dark.roughnessMap=m.steel.roughnessMap;}
 coat(m.dark,0x3d4448,.28);m.dark.metalness=.15;m.dark.roughness=.95;m.dark.normalScale.set(.16,.16);
 m.wire=new T.MeshStandardMaterial({color:0x535960,metalness:.72,roughness:.43,envMapIntensity:.85});
// World ground maps tile at approximately industrial pavement scale instead of stretching.
for(const mat of [m.road,m.concrete]){mat.map.repeat.set(mat===m.road?12:1,mat===m.road?12:1);mat.normalMap.repeat.copy(mat.map.repeat);mat.roughnessMap.repeat.copy(mat.map.repeat);mat.normalScale.set(.2,.2)}
const asphalt=new T.MeshStandardMaterial({color:0x393b3d,roughness:.86});const apron=new T.MeshStandardMaterial({color:0x464744,roughness:.88});const tar=new T.MeshStandardMaterial({color:0x282b2b,roughness:.9});
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
if(texturePack.sky?.hdr&&T.RGBELoader){const sky=new T.RGBELoader().setDataType(T.FloatType);envTex=await sky.loadAsync(texturePack.sky.hdr);const pixels=envTex.image.data,stride=pixels.length/(envTex.image.width*envTex.image.height);if(stride!==3&&stride!==4)throw Error('Unexpected HDR pixel stride '+stride);// Locate the brightest compact source in the original linear HDR image.
 // RGBELoader r128 flips Y on upload; equirectUv uses atan(z,x) and asin(y).
 // A small elevation floor stabilizes the kilometre-scale shadow projection.
 let peak=-Infinity,peakIndex=0,average=0;
 for(let i=0;i<pixels.length;i+=stride){const lum=.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2];average+=lum;if(lum>peak){peak=lum;peakIndex=i/stride}}
 average/=pixels.length/stride;
 if(peak>Math.max(30,average*30)){
  const w=envTex.image.width,h=envTex.image.height;
  const phi=((peakIndex%w+.5)/w-.5)*Math.PI*2;
  const elev=Math.max(.085,(.5-(Math.floor(peakIndex/w)+.5)/h)*Math.PI);
  sun.position.set(Math.cos(phi)*Math.cos(elev),Math.sin(elev),Math.sin(phi)*Math.cos(elev)).multiplyScalar(2300);
  sun.intensity=2.35;sun.color.setHex(0xffb479);sun.shadow.normalBias=.65;
 }
 for(let i=0;i<pixels.length;i+=stride){pixels[i]*=.35;pixels[i+1]*=.29;pixels[i+2]*=.25}envTex.needsUpdate=true;envTex.mapping=T.EquirectangularReflectionMapping;skySource='industrial_sunset_02_puresky';}
const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromEquirectangular(envTex).texture;scene.background=envTex;pmrem.dispose();
const boxGeo=new T.BoxGeometry(1,1,1),cylGeo=new T.CylinderGeometry(1,1,1,12),sphereGeo=new T.SphereGeometry(1,12,8);const q=new T.Quaternion(),up=V(0,1,0);
const templates={},placementBounds=new Map(),placedSites=[];let target=null;const batches=new Map();
function part(g,mat,x,y,z,sx,sy,sz,rot){const mesh=new T.Mesh(g,mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);if(rot)mesh.quaternion.copy(rot);mesh.updateMatrix();if(target){target.push(mesh)}else{const key=g.uuid+mat.uuid;if(!batches.has(key))batches.set(key,{g,mat,matrices:[]});batches.get(key).matrices.push(mesh.matrix.clone())}return mesh}
const box=(mat,x,y,z,w,h,d)=>part(boxGeo,mat,x,y,z,w,h,d);
const cylinder=(mat,x,y,z,r,h)=>part(cylGeo,mat,x,y,z,r,h,r);
function beam(mat,a,b,w,d=w,round=false){const p=V(...a),r=V(...b),delta=r.clone().sub(p);q.setFromUnitVectors(up,delta.clone().normalize());const c=p.add(r).multiplyScalar(.5);return part(round?cylGeo:boxGeo,mat,c.x,c.y,c.z,w,delta.length(),d,q)}
function rail(x,y,z,length,axis='x'){const a=axis==='x'?[x-length/2,y,z]:[x,y,z-length/2],b=axis==='x'?[x+length/2,y,z]:[x,y,z+length/2];beam(m.yellow,a,b,.11);for(let i=0;i<=Math.ceil(length/4);i++){const t=i/Math.ceil(length/4),p=a.map((v,j)=>v+(b[j]-v)*t);beam(m.yellow,[p[0],y-1,p[2]],p,.10)}}
function define(name,fn){target=[];fn();const groups=new Map();for(const mesh of target){let g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(mesh.matrix);if(mesh.material.map&&!mesh.geometry.userData.keepUV){const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));if(ny>=nx&&ny>=nz)uv.setXY(i,x/4,z/4);else if(nx>=nz)uv.setXY(i,z/4,y/4);else uv.setXY(i,x/4,y/4)}}if(!groups.has(mesh.material))groups.set(mesh.material,[]);groups.get(mesh.material).push(g)}const group=new T.Group();group.name=name;for(const [mat,geos] of groups){const merged=T.BufferGeometryUtils.mergeBufferGeometries(geos);if(!merged)throw Error('merge failed '+name);const indexed=T.BufferGeometryUtils.mergeVertices(merged,0.0001);group.add(new T.Mesh(indexed,mat));merged.dispose();geos.forEach(g=>g.dispose())}templates[name]=group;placementBounds.set(name,new T.Box3().setFromObject(group));target=null;}
// Container stack support footprints: all tiers must be aligned and consecutive.
const containerSlots=[],stackIndex=new Map(),containerChunks=new Map(),containerLOD=[];
function reserveContainer(x,y,z,angle,scale){
 const a=Math.abs(Math.cos(angle)),b=Math.abs(Math.sin(angle)),hx=(6.15*a+1.27*b)*scale,hz=(6.15*b+1.27*a)*scale;
 const key=[x.toFixed(3),z.toFixed(3),hx.toFixed(3),hz.toFixed(3)].join(':');
 const stack=stackIndex.get(key);
 if(stack){if(Math.abs(y-stack.next)>.08)return false;stack.next=y+2.94*scale;return true}
 if(y>5.65)return false;
 for(const q of containerSlots)if(Math.abs(x-q.x)<hx+q.hx+.06&&Math.abs(z-q.z)<hz+q.hz+.06)return false;
 const q={x,z,hx,hz,next:y+2.94*scale};containerSlots.push(q);stackIndex.set(key,q);return true
}
function place(name,x,y,z,angle=0,scale=1){if(name.startsWith('container-')&&!reserveContainer(x,y,z,angle,scale))return false;const group=templates[name];const root=new T.Object3D();root.position.set(x,y,z);root.rotation.y=angle;root.scale.setScalar(scale);root.updateMatrix();if(name.startsWith('container-')){const requested=name.split('-').pop(),stack=containerSlots.find(q=>Math.abs(q.x-x)<.001&&Math.abs(q.z-z)<.001),col=stack?(stack.livery||(stack.livery=requested)):requested,key=[Math.floor(x/600),Math.floor(z/600),col].join(':');if(!containerChunks.has(key))containerChunks.set(key,{col,matrices:[],bounds:new T.Box3()});const chunk=containerChunks.get(key);chunk.matrices.push(root.matrix.clone());chunk.bounds.expandByPoint(V(x-7,y,z-7));chunk.bounds.expandByPoint(V(x+7,y+3,z+7));return true}const placementBox=placementBounds.get(name).clone().applyMatrix4(root.matrix);placedSites.push(placementBox);for(const mesh of group.children){let key=mesh.geometry.uuid+mesh.material.uuid;if(!batches.has(key))batches.set(key,{g:mesh.geometry,mat:mesh.material,matrices:[]});batches.get(key).matrices.push(root.matrix.clone())}}
// Dedicated cargo paint and UV atlas: localized chipping, runoff and scale markings.
// A paint-wear roughness atlas is separate from the visible color atlas.
 // Painted sheet is dielectric; the existing photographic normal map contributes
 // restrained micro-relief, not oversized corrugation displacement.
 function weatherRoughness(w,h,seed,base=.64){
  const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');
  const v=Math.round(base*255);ctx.fillStyle='rgb('+v+','+v+','+v+')';ctx.fillRect(0,0,w,h);
  let sd=seed;const random=()=>{sd=(Math.imul(sd,1664525)+1013904223)>>>0;return sd/4294967296};
  for(let i=0;i<1600;i++){const x=random()*w,y=random()*h,val=Math.floor(135+random()*95);ctx.fillStyle='rgba('+val+','+val+','+val+',.22)';ctx.fillRect(x,y,1+random()*w*.025,1+random()*h*.08)}
  const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(230,230,230,.18)');g.addColorStop(.20,'rgba(230,230,230,0)');g.addColorStop(.82,'rgba(235,235,235,0)');g.addColorStop(1,'rgba(235,235,235,.42)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t
 }
 const cargoSkin={},cargoSide={};
for(const [col,base,label] of [['rust','#703e34','IRON TIDE'],['blue','#344b55','NORTHLINE'],['green','#50584a','HARBOR'],['white','#878578','COASTAL']]){
 const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,1024,256);
 let sd=col.charCodeAt(0)*7919;const rand=()=>{sd=(Math.imul(sd,1664525)+1013904223)>>>0;return sd/4294967296};
 for(let i=0;i<4400;i++){const x=rand()*1024,y=rand()*256;ctx.fillStyle=rand()>.5?'rgba(220,216,199,.055)':'rgba(20,18,16,.07)';ctx.fillRect(x,y,1+rand()*3,1+rand()*4)}
 for(let i=0;i<28;i++){const x=i*36.6,g=ctx.createLinearGradient(x,0,x+36,0);g.addColorStop(0,'rgba(15,16,16,.17)');g.addColorStop(.23,'rgba(0,0,0,0)');g.addColorStop(.72,'rgba(255,255,255,.045)');g.addColorStop(1,'rgba(23,18,14,.16)');ctx.fillStyle=g;ctx.fillRect(x,0,36,256)}
 for(let i=0;i<220;i++){const x=rand()*1024,y=rand()>.68?rand()*256:rand()*22+234;ctx.fillStyle='rgba(82,35,16,'+(.12+rand()*.3)+')';ctx.fillRect(x,y,1+rand()*6,2+rand()*15)}
 for(let i=0;i<35;i++){const x=rand()*1024,y=rand()*256,g=ctx.createLinearGradient(x,y,x,y+48);g.addColorStop(0,'rgba(54,26,12,.32)');g.addColorStop(1,'rgba(54,26,12,0)');ctx.fillStyle=g;ctx.fillRect(x,y,2+rand()*5,48)}
 ctx.fillStyle=col==='white'?'#333f43':'#c6c5ba';ctx.globalAlpha=.72;ctx.font='bold 43px sans-serif';ctx.fillText(label,82,133);ctx.font='13px monospace';ctx.fillText('ITCU 421087 45G1',824,52);ctx.fillText('MAX GROSS 30480 KG',824,70);ctx.globalAlpha=1;
 const map=new T.CanvasTexture(c);map.encoding=T.sRGBEncoding;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 cargoSide[col]=new T.MeshStandardMaterial({map,metalness:.05,roughness:1,roughnessMap:weatherRoughness(512,128,col.charCodeAt(0)*537),normalMap:m.steel.normalMap,normalScale:new T.Vector2(.22,.22),envMapIntensity:.72});
 const tc=document.createElement('canvas');tc.width=tc.height=256;const tctx=tc.getContext('2d');tctx.fillStyle=base;tctx.fillRect(0,0,256,256);
 for(let i=0;i<2500;i++){const x=rand()*256,y=rand()*256;tctx.fillStyle=rand()>.52?'rgba(211,204,188,.06)':'rgba(20,18,16,.075)';tctx.fillRect(x,y,1+rand()*3,1+rand()*5)}
 for(let i=0;i<80;i++){const x=rand()*256,y=rand()*256,g=tctx.createLinearGradient(x,y,x,y+22);g.addColorStop(0,'rgba(78,36,19,.28)');g.addColorStop(1,'rgba(78,36,19,0)');tctx.fillStyle=g;tctx.fillRect(x,y,1+rand()*4,22)}
 const tile=new T.CanvasTexture(tc);tile.encoding=T.sRGBEncoding;tile.wrapS=tile.wrapT=T.RepeatWrapping;tile.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 cargoSkin[col]=new T.MeshStandardMaterial({map:tile,metalness:.06,roughness:1,roughnessMap:weatherRoughness(256,256,col.charCodeAt(0)*353,.70),normalMap:m.steel.normalMap,normalScale:new T.Vector2(.18,.18),envMapIntensity:.7});
}
for(const col of ['rust','blue','green','white'])define('container-'+col,()=>{
 const skin=cargoSkin[col];box(skin,0,1.45,0,12.1,2.9,2.36);
 for(const side of [-1,1]){
  const p=[],uv=[],idx=[];let k=0;
  for(let i=0;i<=28;i++){const base=-5.88+i*.42;for(const [dx,dz] of [[0,0],[.095,.075],[.24,.075],[.335,0]]){if(base+dx>5.95)continue;const x=base+dx,z=side*(1.19+dz);p.push(x,.17,z,x,2.72,z);const u=(x+5.88)/11.83;uv.push(side>0?u:1-u,0,side>0?u:1-u,1);if(k>0){const j=2*k;idx.push(...(side>0?[j-2,j,j+1,j-2,j+1,j-1]:[j-2,j+1,j,j-2,j-1,j+1]))}k++}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();g.userData.keepUV=true;part(g,cargoSide[col],0,0,0,1,1,1);
  for(const y of [.10,2.8])box(skin,0,y,side*1.23,12.2,.16,.14);
  for(const x of [-6,6]){box(skin,x,1.45,side*1.23,.22,2.9,.20);for(const y of [.12,2.78])box(m.dark,x,y,side*1.32,.13,.10,.04)}
 }
 for(const z of [-.62,.62]){box(skin,6.10,1.45,z,.11,2.55,1.16);for(const dz of [-.36,.36]){beam(m.steel,[6.22,.2,z+dz],[6.22,2.72,z+dz],.038,.038,true);for(const y of [.32,1.42,2.55])box(m.dark,6.23,y,z+dz,.09,.15,.12)}for(const y of [.4,2.5])box(m.steel,6.2,y,z,.16,.12,.26);box(m.yellow,6.22,1.22,z,.04,.17,.17)}
 for(let x=-5.75;x<5.9;x+=.42)box(skin,x,2.93,0,.14,.045,2.22);
 for(const z of [-.8,.8])for(const x of [-3.2,3.2])box(m.dark,x,.05,z,1.15,.11,.3);
});
for(const col of ['rust','blue','green','white'])define('container-far-'+col,()=>{box(cargoSkin[col],0,1.45,0,12.2,2.9,2.44);for(const s of [-1,1]){for(const y of [.13,2.77])box(m.steel,0,y,s*1.23,12.2,.12,.13);for(const x of [-6,6])box(m.steel,x,1.45,s*1.23,.18,2.9,.2)}});
define('goliath',()=>{for(const x of [-65,65]){for(const z of [-12,12]){beam(m.orange,[x,4,z],[x*.83,108,z*.68],4.4,5.2);box(m.dark,x,2,z,12,4,8);for(const dx of [-3,3])for(const dz of [-2,2])cylinder(m.rubber,x+dx,1,z+dz,1.2,1.6)}for(let y=12;y<100;y+=17){beam(m.steel,[x*(1-y/650),y,-12+y*.035],[x*(1-(y+17)/650),y+17,12-(y+17)*.035],.65);box(m.steel,x*(1-y/650),y,0,10,.65,25);rail(x*(1-y/650),y+1,12,10)}}for(const z of [-8,8]){box(m.orange,0,109,z,130,6,4);for(let x=-62;x<62;x+=10)beam(m.orange,[x,106,z],[x+10,116,z],.55)}box(m.steel,0,115,0,137,1.3,17);rail(0,116,8,137);rail(0,116,-8,137);box(m.orange,10,119,0,15,5,19);box(m.glass,19,114,9,7,4,5);for(const x of [5,15])beam(m.dark,[x,106,0],[x,65,0],.13,.13,true);box(m.yellow,10,64,0,14,2,5);});
define('luffing-crane',()=>{box(m.dark,0,2,0,14,4,16);for(const x of [-5,5])for(const z of [-5,5])beam(m.orange,[x,4,z],[x*.45,58,z*.45],1.1);for(let y=10;y<58;y+=8)for(const z of [-3,3])beam(m.orange,[-4,y,z],[4,y+8,z],.48);box(m.orange,0,59,0,9,3,11);box(m.glass,5,60,0,4,4,5);beam(m.orange,[0,59,0],[45,83,0],2);beam(m.orange,[0,59,0],[-18,68,0],2);beam(m.dark,[-18,68,0],[45,83,0],.12,.12,true);beam(m.dark,[45,83,0],[45,32,0],.12,.12,true);box(m.yellow,45,31,0,2,2,2);});
define('warehouse',()=>{const w=112,d=160,h=49;for(const x of [-w/2,w/2]){box(m.blue,x,h/2,0,1,h,d);for(let z=-d/2;z<=d/2;z+=10){box(m.steel,x,h/2,z,1.7,h,1.3);box(m.glass,x,h-12,z,1.15,6,6)}rail(x,h-2,0,d,'z')}for(let z=-d/2;z<=d/2;z+=16){for(const x of [-w/2,w/2]){beam(m.steel,[x,h,z],[0,h+12,z],1.2);beam(m.steel,[x,h,z],[0,h,z],.65);beam(m.steel,[x/2,h,z],[0,h+12,z],.55)}for(const side of [-1,1]){const angle=-side*Math.atan2(12,w/2);part(boxGeo,m.blue,side*w/4,h+6,z,Math.hypot(w/2,12)+.6,.65,15.95,new T.Quaternion().setFromAxisAngle(V(0,0,1),angle));for(let i=0;i<7;i++)box(m.steel,side*(4+i*7),h+12-(4+i*7)*12/(w/2)+.6,z,.18,.28,15.95)}}for(const x of [-w/2,w/2])box(m.orange,x*.8,30,0,1.6,2,d);box(m.orange,0,32,-18,w-18,3,4);box(m.dark,9,34,-18,9,3,6);beam(m.dark,[9,31,-18],[9,18,-18],.14,.14,true);box(m.yellow,9,17,-18,2,2,2);for(let z=-60;z<=60;z+=15)for(const x of [-36,36]){box(m.light,x,47,z,3,.4,1);box(m.dark,x,47.45,z,3.4,.35,1.4)}for(const x of [-w/2+5,w/2-5]){box(m.steel,x,20,0,5,.65,d-4);rail(x+(x<0?2.3:-2.3),21,0,d-4,'z');for(let z=-70;z<80;z+=14){beam(m.dark,[x,20,z],[x+(x<0?-4:4),15,z],.45);box(m.yellow,x,20.4,z,.35,.18,3)}}
 // Repeated structural bays carry continuous service lines, not free-floating pipes.
 // Keep the central flight corridor unchanged.
 for(const side of [-1,1]){
  const x=side*(w/2-3.4);
  for(const y of [9.2,10.5,12.1])for(let z=-76;z<76;z+=19){
   beam(y===10.5?m.rust:m.steel,[x,y,z],[x,y,z+19],y===10.5?.30:.18,y===10.5?.30:.18,true);
   beam(m.steel,[x,y,z],[side*(w/2-.8),y,z],.14);
  }
  for(let z=-68;z<=68;z+=34){
   box(m.dark,side*(w/2-5.4),1.4,z,3.4,2.8,6.4);
   box(m.steel,side*(w/2-5.4),2.9,z,3.8,.25,6.8);
   for(const dz of [-2.2,2.2])beam(m.orange,[side*(w/2-5),3.05,z+dz],[side*(w/2-5),5.8,z+dz],.16);
   for(let dz=-2;dz<=2;dz+=2)box(m.rust,side*(w/2-5.4),3.2,z+dz,3.1,.25,1.4);
   box(m.steel,side*(w/2-1.4),7.1,z,.8,1.5,1.2);
   beam(m.dark,[x,9.2,z],[x,6.7,z],.17,.17,true);
   beam(m.dark,[x,6.7,z],[side*(w/2-1.8),6.7,z],.17,.17,true);
  }
 }
});
define('pipe-rack',()=>{for(const z of [-9,9]){for(const x of [-35,0,35]){box(m.steel,x,17,z,1.8,34,1.8);beam(m.dark,[x,8,z],[x,28,-z],.6)}for(const y of [14,29])beam(m.steel,[-38,y,z],[38,y,z],1.5)}for(let i=0;i<4;i++){const y=30+i*2.7;beam(i%2?m.rust:m.steel,[-40,y,-5+i*3.3],[40,y,-5+i*3.3],1.05,1.05,true);for(let x=-35;x<=35;x+=10)beam(m.dark,[x-.45,y,-5+i*3.3],[x+.45,y,-5+i*3.3],1.18,1.18,true)}box(m.steel,0,39,8,76,.5,3);rail(0,40,9.5,76);
 // Stage 3: supported lower process headers, reducer collars, branch valves
 // and connected vertical takeoffs. Preserve the original overall rack width.
 for(const y of [11.9,19.9]){
  for(const z of [-9,9])beam(m.steel,[-35,y,z],[35,y,z],.65);
  for(const x of [-30,-10,10,30])beam(m.steel,[x,y,-9],[x,y,9],.40);
 }
 for(const z of [-5,5]){
  for(const y of [14,22]){
   beam(m.steel,[-35,y,z],[35,y,z],.68,.68,true);
   for(const x of [-30,-10,10,30]){
    beam(m.dark,[x-.20,y,z],[x+.20,y,z],.88,.88,true);
    beam(m.steel,[x,y-.8,z],[x,y-1.15,z],.25);
    box(m.steel,x,y-1.25,z,1.6,.24,1.5);
    beam(m.steel,[x,y-1.3,z],[x,y-2.1,z<0?-9:9],.29);
   }
  }
  for(const x of [-30,30]){
   beam(m.rust,[x,14,z],[x,30,z],.48,.48,true);
   for(const y of [14,22,29])beam(m.dark,[x,y-.18,z],[x,y+.18,z],.69,.69,true);
   box(m.dark,x,22,z,1.4,1.25,1.25);
   beam(m.steel,[x,22.5,z],[x,24.2,z],.16,.16,true);
   const wheel=new T.TorusGeometry(.55,.07,6,16);part(wheel,m.orange,x,24.3,z,1,1,1,new T.Quaternion().setFromAxisAngle(V(1,0,0),Math.PI/2));
   for(const a of [0,Math.PI/2])beam(m.orange,[x-.52*Math.cos(a),24.3,z-.52*Math.sin(a)],[x+.52*Math.cos(a),24.3,z+.52*Math.sin(a)],.07);
  }
 }
 for(const x of [-35,0,35]){box(m.concrete,x,.38,-9,3,.76,3);box(m.concrete,x,.38,9,3,.76,3)}
});
define('tank',()=>{
 // Welded vertical process/storage vessel; higher radial resolution at the
 // silhouette, real nozzles, roof access and supported ladder cage.
 const shellGeo=new T.CylinderGeometry(1,1,1,48),roofGeo=new T.CylinderGeometry(.15,1,1,48);
 const skirtGeo=new T.CylinderGeometry(1,1,1,32);
 part(skirtGeo,m.concrete,0,.55,0,15.7,1.1,15.7);
 part(shellGeo,m.white,0,17.4,0,15,32.7,15);
 part(roofGeo,m.steel,0,35.2,0,15.15,3.1,15.15);
 for(const y of [1.3,6.6,12,17.5,23,28.5,33.65]){
  const ring=new T.TorusGeometry(15.04,.09,6,64);part(ring,m.steel,0,y,0,1,1,1,new T.Quaternion().setFromAxisAngle(V(1,0,0),Math.PI/2));
 }
 for(let i=0;i<16;i++){const a=i*Math.PI/8;const x=Math.cos(a),z=Math.sin(a);beam(m.steel,[15.05*x,1.2,15.05*z],[15.05*x,33.5,15.05*z],.055);box(m.dark,15.38*x,.95,15.38*z,.38,.28,.38)}
 // Roof ring handrail and working platform.
 for(let i=0;i<32;i++){const a=i*Math.PI/16,b=(i+1)*Math.PI/16;
  const P=(theta,y)=>[14.7*Math.cos(theta),y,14.7*Math.sin(theta)];
  beam(m.yellow,P(a,34.4),P(a,35.55),.09);beam(m.yellow,P(a,35.55),P(b,35.55),.085);
  beam(m.steel,P(a,34.85),P(b,34.85),.06);
 }
 box(m.steel,0,37.05,0,4.2,.35,4.2);cylinder(m.dark,0,37.8,0,1.35,1.15);cylinder(m.steel,0,38.5,0,1.55,.25);
 for(const z of [-.52,.52])beam(m.yellow,[15.6,1.15,z],[15.6,34.6,z],.105);
 for(let y=1.45;y<34.5;y+=.48)beam(m.steel,[15.6,y,-.52],[15.6,y,.52],.07);
 for(let y=3.2;y<34.5;y+=3.1){
  beam(m.steel,[15.0,y,0],[15.6,y,0],.12);for(let i=0;i<8;i++){const a=-Math.PI/2+i*Math.PI/8,b=a+Math.PI/8;beam(m.steel,[15.62+.78*Math.cos(a),y,.78*Math.sin(a)],[15.62+.78*Math.cos(b),y,.78*Math.sin(b)],.065)}
 }
 for(const a of [-Math.PI/3,0,Math.PI/3]){const x=15.62+.78*Math.cos(a),z=.78*Math.sin(a);beam(m.steel,[x,3.2,z],[x,34.2,z],.06)}
 // Side inspection manway, nozzle and flanged discharge port.
 beam(m.steel,[0,3.6,14.9],[0,3.6,16.0],.85,.85,true);beam(m.dark,[0,3.6,15.95],[0,3.6,16.25],1.08,1.08,true);
 for(let i=0;i<10;i++){const a=i*Math.PI/5;beam(m.steel,[.91*Math.cos(a),3.6+.91*Math.sin(a),16.1],[.91*Math.cos(a),3.6+.91*Math.sin(a),16.38],.065,.065,true)}
 beam(m.rust,[0,6.0,14.9],[0,6.0,17.5],.48,.48,true);beam(m.steel,[0,6,16.8],[0,6,17.1],.66,.66,true);
 beam(m.rust,[0,6,17.5],[0,1.5,17.5],.48,.48,true);
});
define('ship-rib',()=>{for(const s of [-1,1]){const pts=[[0,1,s*5],[0,3,s*14],[0,9,s*25],[0,18,s*31],[0,34,s*32]];for(let i=0;i<pts.length-1;i++)beam(m.rust,pts[i],pts[i+1],1.5,1.1);box(m.steel,0,34,s*32,1.6,.8,3);beam(m.dark,[0,8,s*24],[0,18,s*31],.8)}box(m.steel,0,1,0,1.8,1.2,12)});
// Open-ended fabrication stage, rather than a falsely completed navigable ship.
// Transverse web frames intersect longitudinal shell stiffeners; all access decks
// and brackets are attached to the same lofted shell coordinate system.
define('ship-hull',()=>{
 const L=350,N=70,Y=[3.5,6,10,15,21,27,32],W=[.40,.61,.79,.91,.97,1,1];
 const outer=m.rust.clone(),inner=m.rust.clone();outer.color.setHex(0xa66e4b);inner.color.setHex(0x86634f);inner.roughness=.88;outer.roughness=.82;
 const seam=m.dark,flange=m.steel,primer=m.rust.clone();primer.color.setHex(0x755246);primer.roughness=.86;primer.metalness=.20;
 function profile(x,y){let k=0;while(k<Y.length-2&&y>Y[k+1])k++;let f=T.MathUtils.clamp((y-Y[k])/(Y[k+1]-Y[k]),0,1);const w=T.MathUtils.lerp(W[k],W[k+1],f);
 // Open cut ends retain a usable passage; elliptical shoulder blends into the parallel midbody.
 const u=Math.max(0,(Math.abs(x)-124)/51),taper=1-.58*u*u;return 32*w*taper}
 function P(x,y,side,offset=0){return [x,y,side*(profile(x,y)-offset)]}
 for(const side of [-1,1])for(const isInner of [false,true]){
  const verts=[],uv=[],indices=[];for(let j=0;j<Y.length;j++)for(let i=0;i<=N;i++){const x=-L/2+i*L/N,y=Y[j],p=P(x,y,side,isInner?.38:0);verts.push(...p);uv.push(x/12,y/8)}
  for(let j=0;j<Y.length-1;j++)for(let i=0;i<N;i++){const a=j*(N+1)+i,b=a+1,c=b+N+1,d=a+N+1;if((side>0)!==isInner)indices.push(a,b,c,a,c,d);else indices.push(a,c,b,a,d,c)}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.userData.keepUV=true;part(g,isInner?inner:outer,0,0,0,1,1,1);
 }
 for(const side of [-1,1]){
  // Continuous longitudinal stiffeners, top edge and shell plate seams.
  for(const y of [7,12,17,22,27,31.6])for(let x=-174;x<174;x+=8){
   const x2=Math.min(174,x+8),a=P(x,y,side,.45),b=P(x2,y,side,.45);beam(y===31.6?flange:primer,a,b,y===31.6?.7:.28,y===31.6?1:.42);
  }
  for(let x=-165;x<=165;x+=10){
   for(let j=0;j<Y.length-1;j++){const y=Y[j],y2=Y[j+1];beam(seam,P(x,y,side,-.05),P(x,y2,side,-.05),.075,.09);}
  }
  // Deep web frames: web and cap flange both follow the inner shell.
  for(let x=-155;x<=155;x+=10){
   for(let j=0;j<Y.length-1;j++){
    const y=Y[j],y2=Y[j+1],a=P(x,y,side,1.15),b=P(x,y2,side,1.15);
    beam(primer,a,b,.55,1.55);beam(flange,P(x,y,side,2.05),P(x,y2,side,2.05),.75,.18);
   }
   if(x%20===5){
    // Real gussets are triangular plates, not rectangular floating blocks.
    const a=P(x,16,side,2.05),b=P(x,20,side,2.05),c=P(x,16,side,5.1),p=[...a,...b,...c,...a,...c,...b];
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute([0,0,0,1,1,0,0,0,1,0,0,1],2));g.computeVertexNormals();part(g,primer,0,0,0,1,1,1);
   }
  }
  // Narrow work platforms follow the side, leaving a wide, clear central route.
  for(let x=-142;x<142;x+=8){
   const x2=Math.min(142,x+8),z=side*(profile(x+4,16)-3.4);
   box(flange,x+4,16,z,8,.28,3.4);
   beam(m.yellow,[x,17.15,z-side*1.55],[x2,17.15,z-side*1.55],.09);
   beam(m.yellow,[x,16.15,z-side*1.55],[x,17.15,z-side*1.55],.08);
   beam(seam,[x+4,15.9,z],[x+4,12,z+side*2],.34);
   if((x+142)%16===0){box(m.light,x+4,20,z+side,1,.32,.45);box(seam,x+4,20.22,z+side,1.2,.22,.6);beam(flange,[x+4,20.3,z+side],[x+4,20.3,side*(profile(x+4,20.3)-.45)],.15)}
  }
  for(const x of [-124,-64,0,64,124]){
   const z0=side*(profile(x,4)-1.5),z1=side*(profile(x,16)-3.5);
   // Inclined ladder remains inside the curved shell and ends at its access deck.
   for(const dx of [-.48,.48])beam(flange,[x+dx,3.75,z0],[x+dx,17.1,z1],.10);
   for(let i=0;i<=30;i++){const t=i/30,y=4+t*12.6,z=T.MathUtils.lerp(z0,z1,t);beam(flange,[x-.48,y,z],[x+.48,y,z],.065)}
   for(const t of [0,.33,.66,1]){const y=4+t*12.6,z=T.MathUtils.lerp(z0,z1,t),wall=side*(profile(x,y)-1);beam(seam,[x,y,z],[x,y,wall],.16)}

  }
 }
 // Attached service assemblies inside the shell. Each bracket is referenced
 // to the lofted wall profile, not an independently positioned object.
 for(const side of [-1,1]){
  for(let x=-146;x<146;x+=12){
   const x2=Math.min(x+12,146),y=13.4,z1=side*(profile(x,y)-2.0),z2=side*(profile(x2,y)-2.0);
   beam(m.dark,[x,y,z1],[x2,y,z2],.24,.24,true);
   beam(m.steel,[x,y-.7,z1],[x2,y-.7,z2],.10,.10,true);
   beam(m.steel,[x,y,z1],P(x,y,side,.4),.16);
   beam(m.rust,[x-.12,y,z1],[x+.12,y,z1],.34,.34,true);
  }
  for(const x of [-132,-72,-12,48,108]){
   const z=side*(profile(x,16)-2.9);
   box(m.dark,x,16.8,z,2.1,1.3,.85);
   box(m.steel,x,16.8,z-side*.47,1.8,1.05,.12);
   box(m.yellow,x+.64,17.05,z-side*.55,.18,.18,.08);
   // Ventilation duct runs from a fan housing down to the service deck.
   const ductZ=side*(profile(x,22)-1.55);
   beam(m.steel,[x,22,ductZ],[x+3,22,ductZ],.48,.48,true);
   beam(m.steel,[x+3,22,ductZ],[x+3,18.5,z],.48,.48,true);
   beam(m.dark,[x+2.8,22,ductZ],[x+3.2,22,ductZ],.56,.56,true);
   box(m.steel,x+3,18.3,z,.95,.55,.95);
   for(const dx of [-.25,0,.25])box(m.dark,x+3+dx,18,z,.11,.12,.7);
  }
 }
 // Stage 3: shipyard staging platforms, cable trays and ventilator risers,
 // attached to the actual lofted shell, outside the center flight corridor.
 for(const side of [-1,1]){
  for(const x of [-126,-86,-46,-6,34,74,114]){
   const z=side*(profile(x,24)-3.0);
   box(m.steel,x,23.8,z,5.4,.32,3.6);
   for(const dx of [-2.4,2.4])beam(m.steel,[x+dx,23.7,z],[x+dx,20.1,side*(profile(x+dx,20.1)-.5)],.28);
   rail(x,24.95,z-side*1.65,5.2);
   box(m.dark,x,24.8,z+side*.55,1.8,1.65,1.2);
   box(m.blue,x,24.85,z-side*.12,1.55,1.2,.18);
   for(const dz of [-.44,.44])beam(m.steel,[x-1.1,25.9,z+dz],[x+1.1,25.9,z+dz],.13,.13,true);
   beam(m.rust,[x,25.6,z+side*.42],P(x,27,side,.6),.24,.24,true);
  }
  for(let x=-144;x<144;x+=12){
   const z0=side*(profile(x,19.2)-1.15),z1=side*(profile(x+12,19.2)-1.15);
   for(const dy of [0,.32])beam(m.dark,[x,19.2+dy,z0],[x+12,19.2+dy,z1],.09);
   beam(m.steel,[x,19.2,z0],P(x,19.2,side,.42),.14);
  }
 }
 // Partial transverse bulkheads with center openings and overhead girders.
 for(const x of [-90,-20,50,120]){for(const side of [-1,1]){const z=side*(profile(x,22)-4.2);box(inner,x,22,z,.50,15,6.8);box(flange,x,22,z-side*3.5,.8,15,.4);for(const y of [17,22,27])box(flange,x,y,z,.7,.3,7.1);beam(primer,[x,27,z-side*3],[x,31,z-side*6],.65)}box(flange,x,32,0,1.05,.85,profile(x,32)*2-2);box(primer,x,32.6,0,1.6,.35,profile(x,32)*2-2)}
 // Inner bottom and parallel girders sit above the keel supports.
 for(let x=-174;x<174;x+=6){const z=Math.min(profile(x,4),profile(x+6,4))-.5;box(m.dark,x+3,3.22,0,6,.62,2*z);for(const side of [-1,1])box(flange,x+3,3.55,side*z*.58,6,.32,.42)}
 for(let x=-165;x<=165;x+=10){const z=profile(x,4)-.8;box(flange,x,3.75,0,.42,.85,z*2)}
 // Temporary top-edge handrails and suspended side cables are attached to plating.
 for(const side of [-1,1])for(let x=-165;x<165;x+=5){const a=P(x,32,side,.5),b=P(x+5,32,side,.5);beam(m.yellow,[a[0],33,a[2]],[b[0],33,b[2]],.08);beam(flange,a,[a[0],33,a[2]],.10)}
});
define('bollard',()=>{cylinder(m.dark,0,.55,0,1.2,1.1);cylinder(m.steel,0,1.3,0,.65,1.5);cylinder(m.dark,0,2.1,0,1,.32)});
define('caisson',()=>{box(m.concrete,0,5,0,18,12,17);box(m.dark,0,11.2,0,20,1.4,19);for(const x of [-5,5])beam(m.steel,[x,11.8,-5],[x,14,-5],.5)});
define('light-tower',()=>{beam(m.dark,[0,0,0],[0,28,0],.65,.65,true);box(m.steel,0,28,0,8,.7,1.2);for(let x=-3;x<=3;x+=2)box(m.light,x,27.7,0,1.2,.7,1)});
define('propeller',()=>{
 const bronze=new T.MeshStandardMaterial({color:0x97704a,metalness:.76,roughness:.43});
 const shaft=new T.Quaternion().setFromAxisAngle(V(0,0,1),Math.PI/2);
 part(cylGeo,m.steel,0,9,0,1.3,7,1.3,shaft);part(sphereGeo,bronze,2.3,9,0,1.8,1.7,1.7);
 const p=[],uv=[],idx=[],R=14,C=12;
 for(let j=0;j<=R;j++){const t=j/R,r=1.35+6.1*t,chord=(.6+2.6*Math.sin(Math.PI*t))*(1-.30*t),skew=.2+t*t*.75,pitch=.92-.52*t;
  for(let i=0;i<=C;i++){const angle=2*Math.PI*i/C,w=Math.cos(angle)*chord*.5,thickness=Math.sin(angle)*(.10+.16*Math.sin(Math.PI*t))*(1-.7*t);
   p.push(w*Math.sin(pitch)+thickness*Math.cos(pitch),r,skew+w*Math.cos(pitch)-thickness*Math.sin(pitch));uv.push(i/C,t)}
 }
 for(let j=0;j<R;j++)for(let i=0;i<C;i++){const a=j*(C+1)+i,b=a+C+1;idx.push(a,b,a+1,b,b+1,a+1)}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();bronze.side=T.DoubleSide;
 for(let i=0;i<5;i++)part(g,bronze,0,9,0,1,1,1,new T.Quaternion().setFromAxisAngle(V(1,0,0),i*Math.PI*2/5));
 box(m.dark,0,.75,0,8,1.5,14);for(const z of [-4,4]){box(m.steel,0,1.9,z,7,1,2.8);beam(m.steel,[0,2,z],[0,6,z*.45],.7)}
});
define('straddle-carrier',()=>{for(const x of [-3.8,3.8])for(const z of [-4.5,4.5]){box(m.orange,x,6,z,1.15,12,1.1);box(m.dark,x,1.5,z,2.8,2.7,2.7);for(const off of [-.75,.75])part(cylGeo,m.rubber,x+off,1.25,z,1.25,.62,1.25,new T.Quaternion().setFromAxisAngle(V(0,0,1),Math.PI/2))}for(const z of [-4.5,4.5]){box(m.orange,0,12,z,9.5,1.3,1.5);beam(m.dark,[-3.8,9,z],[0,12,z],.55);beam(m.dark,[3.8,9,z],[0,12,z],.55)}for(const x of [-3.8,3.8])box(m.orange,x,12,0,1,1,10);box(m.glass,4.2,10,3,2.5,2.8,2.4);box(m.dark,0,9,0,4,1,6);});
define('service-gantry',()=>{for(const x of [-24,24]){for(const z of [-4,4])box(m.steel,x,13,z,1.2,26,1.2);beam(m.steel,[x,2,-4],[x,24,4],.55);box(m.concrete,x,1,0,5,2,12)}for(const z of [-4,4]){box(m.orange,0,27,z,50,2,1.5);for(let x=-24;x<24;x+=6)beam(m.steel,[x,25,z],[x+6,29,z],.4)}box(m.steel,0,29,0,50,.6,9);rail(0,30,4.5,50);rail(0,30,-4.5,50);box(m.dark,10,26,0,5,2,6);});
define('lighthouse',()=>{cylinder(m.concrete,0,2,0,9,4);for(let i=0;i<6;i++)cylinder(i%2?m.white:m.rust,0,4+i*5+2.5,0,4.5-i*.28,5.05);cylinder(m.steel,0,34,0,4.5,1);cylinder(m.glass,0,37,0,2.8,5);cylinder(m.rust,0,40,0,3.6,1.5);for(let i=0;i<8;i++){const a=i*Math.PI/4;beam(m.dark,[Math.cos(a)*3,34,Math.sin(a)*3],[Math.cos(a)*3,40,Math.sin(a)*3],.15)}box(m.light,0,37,0,2,1,2);});
define('service-block',()=>{box(m.concrete,0,4,0,24,8,18);box(m.dark,0,8.2,0,25,.5,19);for(let x=-9;x<=9;x+=6){box(m.glass,x,5,9.06,3,2,.2);box(m.steel,x,5,9.22,3.2,.2,.3)}box(m.dark,0,2,-9.1,4,4,.2);box(m.steel,5,10,1,6,3,5);for(let z=-1;z<=3;z+=2)cylinder(m.dark,5,11.6,z,.8,.25);});
define('drydock-keel-block',()=>{box(m.concrete,0,1.1,0,5,2.2,3);box(m.dark,0,2.4,0,4,.5,2.6);for(const x of [-1.8,1.8])box(m.steel,x,2.1,0,.2,1.1,3.2);});
define('office-block',()=>{box(m.concrete,0,12,0,55,24,30);box(m.dark,0,24.4,0,56,.8,31);for(const z of [-15.1,15.1])for(let y=5;y<=20;y+=5)for(let x=-23;x<=23;x+=6){box(m.glass,x,y,z,4,2.5,.3);box(m.steel,x,y-1.4,z,4.4,.2,.6)}for(const x of [-27.7,27.7])for(let y=5;y<=20;y+=5)for(let z=-11;z<=11;z+=6)box(m.glass,x,y,z,.3,2.5,4);box(m.steel,-12,27,3,8,5,6);box(m.steel,12,25.8,-5,12,2.8,8)});
define('tugboat',()=>{const deck=26;for(let i=0;i<9;i++){let x=-18+i*4.5,w=7*Math.min(1,(19-Math.abs(x))/8+.25);box(m.blue,x,1.4,0,4.6,4.4,w*2);box(m.rust,x,-.9,0,4.6,.9,w*1.9);box(m.dark,x,3.7,0,4.6,.6,w*2)}box(m.white,-5,6.1,0,12,4.4,10);box(m.white,-4,10,0,9,3.3,8);box(m.glass,-4,10.3,4.1,8,1.8,.25);box(m.glass,-4,10.3,-4.1,8,1.8,.25);box(m.glass,.7,10.3,0,.2,1.8,7.5);cylinder(m.dark,-12,8,2,1.3,9);beam(m.steel,[-6,11,0],[-6,18,0],.17);beam(m.steel,[-10,15,0],[-2,15,0],.12);for(let x=-13;x<15;x+=4)for(const z of [-6.5,6.5])part(cylGeo,m.rubber,x,2,z,1.15,.55,1.15,new T.Quaternion().setFromAxisAngle(V(1,0,0),Math.PI/2));});
define('cargo-shed',()=>{
 // Clad workshop with raised seam roof, drainage, loading doors and roof vents.
 const W=65,D=100,H=24,roofRise=5.8;
 box(m.blue,0,11.8,0,W,23.6,D);box(m.concrete,0,.42,0,W+.4,.84,D+.4);
 for(const side of [-1,1]){
  const x=side*(W/2+.15),z=side*(D/2+.15);
  for(let zz=-48;zz<=48;zz+=4){box(m.steel,x,12,zz,.18,23.4,.17);if(zz%8===0)box(m.glass,x+side*.16,18,zz,.14,3.6,4.5)}
  for(let xx=-29;xx<=29;xx+=4)box(m.steel,xx,12,z,.17,23.4,.18);
  for(const xx of [-22,0,22]){
   box(m.dark,xx,7,z+side*.2,10.5,13,.26);box(m.steel,xx,7,z+side*.4,9.8,12.4,.14);
   for(let y=1;y<13;y+=.65)box(m.dark,xx,y,z+side*.49,9.7,.075,.08);
   for(const dx of [-5.2,5.2]){box(m.yellow,xx+dx,1,z+side*.55,.15,2,.17);box(m.steel,xx+dx,7,z+side*.42,.28,13.4,.32)}
   box(m.light,xx,14.8,z+side*.3,2.4,.28,.55);
  }
  // Roof slopes are structurally continuous instead of rectangular slabs.
  const angle=-side*Math.atan2(roofRise,W/2),rot=new T.Quaternion().setFromAxisAngle(V(0,0,1),angle);
  part(boxGeo,m.dark,side*W/4,H+roofRise/2,0,Math.hypot(W/2,roofRise)+1,.42,D+1.5,rot);
  for(let zz=-49;zz<=49;zz+=3)beam(m.steel,[0,H+roofRise+.25,zz],[side*(W/2+.4),H+.2,zz],.09,.14);
  beam(m.steel,[side*(W/2+.65),H, -51],[side*(W/2+.65),H,51],.26,.26,true);
  for(const zz of [-47,0,47])beam(m.steel,[side*(W/2+.65),H,zz],[side*(W/2+.65),.8,zz],.14,.14,true);
  for(const zz of [-34,0,34]){const xx=side*13,y=H+roofRise*(1-Math.abs(xx)/(W/2));box(m.steel,xx,y+.7,zz,6,1.8,9);box(m.dark,xx,y+1.7,zz,6.6,.32,9.6);for(let dz=-3;dz<=3;dz+=1.5)box(m.dark,xx,y+1,zz+dz,6.1,.17,.3)}
 }
 // Close both gable ends so the pitched roof has continuous supporting walls.
 for(const side of [-1,1]){const z=side*50.1,A=[-W/2,H,z],B=[W/2,H,z],C=[0,H+roofRise,z],p=side>0?[...A,...B,...C]:[...A,...C,...B];const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,.5,1],2));g.computeVertexNormals();part(g,m.blue,0,0,0,1,1,1)}
 beam(m.steel,[0,H+roofRise+.35,-51],[0,H+roofRise+.35,51],.28,.35);
 for(const zz of [-27,27]){box(m.steel,4,H+roofRise+.85,zz,2,2.5,2);box(m.dark,4,H+roofRise+2.2,zz,2.8,.3,2.8)}
});
/* Civil layout: separate slabs leave actual excavated dock unobstructed. */
const pavedSlabs=[];function slab(x,z,w,d){pavedSlabs.push([x,z,w,d]);box(m.concrete,x,1.8,z,w,6.4,d);box(m.road,x,5.04,z,w-8,.08,d-8)}
slab(0,650,2360,1100);slab(-425,-550,1510,1300);slab(1000,-985,360,410);slab(850,-125,660,450);slab(1140,-550,100,500);
box(m.concrete,850,-10,-550,400,4,400);for(const x of [655,1045]){box(m.concrete,x,-1,-550,10,12,400);rail(x,6,-550,400,'z')}box(m.concrete,850,-1,-747,390,12,9);box(m.dark,850,-3,-350,390,8,6);for(let z=-735;z<-365;z+=22)for(const x of [680,1020])box(m.light,x,0,z,2,.5,2);
for(const x of [660,1040])for(let z=-725;z<=-375;z+=35){box(m.dark,x,0,z,.3,12,.18);box(m.steel,x,5.2,z,1.2,.3,3);for(let i=0;i<20;i++)beam(m.orange,[x+(x<850?1:-1),-7+i*.65,z-1],[x+(x<850?1:-1),-7+i*.65,z+1],.09)}
for(const z of [-720,-380]){for(let k=0;k<20;k++)box(m.concrete,690, -7+k*.65,z+(z<-550?k:-k)*.75,5,.7,.85);}
slab(780,-920,700,250);slab(-900,-1230,500,150);slab(-1200,-920,110,450);slab(1120,720,180,480);slab(650,1250,650,80);slab(-650,1250,520,80);place('ship-hull',750,5,-920);place('propeller',550,5,-975);
// Keel and bilge blocks carry the open fabrication section above the apron.
for(let x=590;x<=910;x+=12){place('drydock-keel-block',x,5,-920,0,1.10);if(x>615&&x<885)for(const dz of [-8,8])place('drydock-keel-block',x,5,-920+dz,0,1.10)}

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
// Functional production districts, sized to the same civil footprint:
 // steel receiving -> plate preparation -> block fabrication -> coating -> outfitting.
 const districtPlan=[];
 // Rolled painted sheet cladding: baked seam shading, runoff and corrosion.
 // UVs are metre-projected by define(), so scale remains consistent per facade.
 function cladMaterial(base,roof=false){
  const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,512,512);
  let sd=base.charCodeAt(2)*113+173;const rand=()=>{sd=(Math.imul(sd,1664525)+1013904223)>>>0;return sd/4294967296};
  for(let x=0;x<512;x+=64){const g=ctx.createLinearGradient(x,0,x+64,0);g.addColorStop(0,'rgba(12,16,18,.40)');g.addColorStop(.07,'rgba(255,255,255,.12)');g.addColorStop(.20,'rgba(255,255,255,0)');g.addColorStop(.9,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(10,12,13,.20)');ctx.fillStyle=g;ctx.fillRect(x,0,64,512);
   for(let y=0;y<512;y+=128){ctx.fillStyle='rgba(16,19,20,.55)';ctx.fillRect(x+4,y+4,3,3)}
  }
  for(let i=0;i<210;i++){const x=rand()*512,y=rand()*512,h=10+rand()*115,g=ctx.createLinearGradient(x,y,x,y+h);g.addColorStop(0,'rgba(77,41,24,.18)');g.addColorStop(1,'rgba(77,41,24,0)');ctx.fillStyle=g;ctx.fillRect(x,y,1+rand()*4,h)}
  for(let i=0;i<3200;i++){const x=rand()*512,y=rand()*512;ctx.fillStyle=rand()>.55?'rgba(220,214,198,.045)':'rgba(9,12,14,.055)';ctx.fillRect(x,y,1+rand()*3,1+rand()*4)}
  const map=new T.CanvasTexture(c);map.encoding=T.sRGBEncoding;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  return new T.MeshStandardMaterial({map,roughness:1,roughnessMap:weatherRoughness(256,256,base.charCodeAt(2)*713,roof?.66:.75),normalMap:m.steel.normalMap,normalScale:new T.Vector2(.26,.26),metalness:roof?.18:.06,envMapIntensity:.68});
 }
 const cladding=cladMaterial('#53646a'),oxideCladding=cladMaterial('#755349'),roofMetal=cladMaterial('#464a4c',true);
 const translucentClerestory=new T.MeshStandardMaterial({color:0x57717b,roughness:.37,metalness:.18});
 define('plate-processing-hall',()=>{
  const W=76,L=116,H=28;
  box(m.concrete,0,.4,0,W+.6,.8,L+.6);
  for(const side of [-1,1]){
   box(cladding,side*W/2,H/2,0,.65,H,L);
   for(let z=-55;z<=55;z+=5){box(m.steel,side*(W/2+.34),H/2,z,.18,H,.23);if(z%10===0)box(translucentClerestory,side*(W/2+.46),H-5,z,.15,3.5,6)}
   box(cladding,0,H/2,side*L/2,W,H,.65);
   for(const x of [-24,0,24]){box(m.dark,x,7.2,side*(L/2+.4),15,14.4,.35);for(let y=.5;y<14;y+=.8)box(m.steel,x,y,side*(L/2+.62),14.8,.09,.09)}
   const x=side*19;part(boxGeo,roofMetal,x,H+3,0,Math.hypot(38,6)+.5,.5,L+1,new T.Quaternion().setFromAxisAngle(V(0,0,1),-side*Math.atan2(6,38)));
   for(let z=-54;z<56;z+=6)beam(m.steel,[0,H+6.3,z],[side*38,H+.3,z],.12);
   for(let z=-42;z<=42;z+=28){box(m.steel,side*16,H+4,z,5,2.5,8);box(m.dark,side*16,H+5.4,z,5.5,.3,8.5)}
  }
  box(translucentClerestory,0,H+6.6,0,8,1.5,L-8);
  for(let z=-50;z<=50;z+=5)box(m.steel,0,H+7.4,z,8.5,.15,.22);
  for(const x of [-24,24]){box(m.steel,x,H+1,30,3,6,3);box(m.dark,x,H+4.2,30,4,.3,4)}
 });
 define('coating-shop',()=>{
  box(oxideCladding,0,13,0,74,26,100);
  box(m.concrete,0,.4,0,75,.8,101);
  box(roofMetal,0,26.3,0,75,.65,101);
  for(const side of [-1,1]){
   for(let z=-47;z<=47;z+=4)box(m.steel,side*37.15,13,z,.15,26,.16);
   for(const x of [-22,0,22]){
    box(m.dark,x,9,side*50.3,17,18,.45);box(m.steel,x,9,side*50.6,15.8,17.2,.22);
    for(let y=1;y<18;y+=.8)box(m.dark,x,y,side*50.75,15.5,.08,.07);
    box(m.light,x,19.5,side*50.55,3,.4,.65);
   }
  }
  for(const x of [-22,0,22])for(const z of [-28,28]){
   box(m.steel,x,27.6,z,9,2.6,8);box(m.dark,x,29.1,z,9.5,.4,8.5);
   beam(m.steel,[x,29.4,z],[x,37,z],1.15,1.15,true);
   beam(m.dark,[x,37,z],[x,37.4,z],1.5,1.5,true);
  }
 });
 define('outfit-workshop',()=>{
  const W=62,D=88,H=19;
  box(cladding,0,H/2,0,W,H,D);
  box(roofMetal,0,H+.3,0,W+1,.6,D+1);
  box(m.concrete,0,.35,0,W+1,.7,D+1);
  for(const side of [-1,1]){
   for(let z=-40;z<=40;z+=4){box(m.steel,side*31.2,H/2,z,.17,H,.18);if(z%8===0)box(m.glass,side*31.36,H-5,z,.16,3.2,5.3)}
   for(const x of [-20,0,20]){box(m.dark,x,5,side*44.25,13,10,.3);box(m.steel,x,5,side*44.45,12.4,9.6,.15);for(let y=1;y<10;y+=.65)box(m.dark,x,y,side*44.57,12,.06,.09)}
  }
  box(m.concrete,23,5,-30,15,10,25);box(m.dark,23,10.3,-30,15.8,.6,25.8);
  for(const y of [3,7])for(const z of [-38,-30,-22])box(m.glass,30.6,y,z,.17,2,4);
  for(let z=-32;z<=32;z+=16){box(m.steel,-15,20,z,6,2,8);box(m.dark,-15,21.2,z,6.6,.35,8.5)}
 });
 // Explicitly stagger footprints and rotate service facilities around production lanes.
 for(const [x,z,kind,angle,scale] of [
 [-320,-1000,'plate-processing-hall',0,1],[-170,-1000,'outfit-workshop',0,1],[5,-1000,'coating-shop',0,1],[160,-1000,'outfit-workshop',Math.PI/2,.93],
 [-320,-820,'plate-processing-hall',0,1],[-170,-820,'cargo-shed',Math.PI/2,.9],[5,-820,'coating-shop',0,1],[160,-820,'cargo-shed',0,.9],
 [-320,-640,'cargo-shed',0,1],[-170,-640,'outfit-workshop',Math.PI/2,1],[5,-640,'plate-processing-hall',0,1],[160,-640,'outfit-workshop',0,.9],
 [-320,-460,'outfit-workshop',Math.PI/2,.9],[-170,-460,'plate-processing-hall',0,1],[5,-460,'cargo-shed',0,.9],[160,-460,'coating-shop',0,.9],
 [-320,-280,'cargo-shed',0,.86],[-170,-280,'outfit-workshop',0,1],[5,-280,'plate-processing-hall',Math.PI/2,.85],[160,-280,'cargo-shed',0,.85],
 [-320,-100,'outfit-workshop',0,.9],[-170,-100,'cargo-shed',Math.PI/2,.9],[5,-100,'outfit-workshop',0,.9],[160,-100,'coating-shop',0,.86]]){
  // Shared ground replaces one conspicuous square pad per building. A loading
  // strip sits only at the appropriate working frontage.
  box(apron,x,5.13,z+63,104*scale,.12,13);
  for(const dx of [-48,-24,0,24,48])box(m.yellow,x+dx*scale,5.205,z+63,.13,.026,11);
  place(kind,x,5.2,z,angle,scale);districtPlan.push({x,z,kind,angle,scale});
 }
 // Ground markings guide cargo flow between the workshops.
 for(const z of [-910,-730,-550,-370,-190]){box(asphalt,-80,5.24,z,605,.06,12);for(let x=-365;x<=205;x+=24)box(m.yellow,x,5.29,z,8,.025,.18)}
 for(const x of [-395,-245,-85,82,245]){box(asphalt,x,5.24,-550,12,.06,1080);for(let z=-1050;z<-70;z+=24)box(m.yellow,x,5.29,z,.18,.025,8)}
 
// North administration and receiving quarter has deliberately irregular frontage.
 for(const [x,z,kind,angle,scale] of [
 [-970,-1060,'office-block',Math.PI/2,1.2],[-810,-1050,'outfit-workshop',Math.PI/2,.92],[-650,-1075,'office-block',0,.85],[-490,-1050,'coating-shop',Math.PI/2,.72],
 [-1100,-900,'office-block',0,.9],[-970,-875,'service-block',Math.PI/2,1.4],[-810,-900,'cargo-shed',Math.PI/2,.85],[-650,-880,'outfit-workshop',0,.95],[-490,-890,'office-block',Math.PI/2,1.05]]){
  box(apron,x,5.12,z+48,90*scale,.12,17);place(kind,x,5.2,z,angle,scale);
  if(kind==='office-block')place('service-block',x+32,5.2,z+36);
 }
for(const x of [-460,-290,-120,50,220])for(const z of [350,530,710,870]){box(apron,x,5.13,z,128,.12,114);for(const dx of [-63,63])box(m.yellow,x+dx,5.21,z,.13,.025,114);for(let a=-48;a<=48;a+=16)for(let b=-42;b<=42;b+=14){const layers=1+Math.floor(rnd()*4);for(let j=0;j<layers;j++)place('container-far-'+['rust','blue','green','white'][Math.floor(rnd()*4)],x+a,5.25+j*2.94,z+b,Math.PI/2)}}
for(const x of [350,470,730,930,1100])for(const z of [570,670,800,930]){if(Math.abs(x-850)<60&&z===800)continue;for(let a=-26;a<=26;a+=13)for(let b=-16;b<=16;b+=8){const layers=2+Math.floor(rnd()*4);for(let j=0;j<layers;j++){if(!clearScenery(x+a,5+(j+1)*2.94,z+b))break;place('container-'+['rust','blue','green','white'][Math.floor(rnd()*4)],x+a,5+j*2.94,z+b)}}}
for(const z of [250,480,760]){box(asphalt,80,5.16,z,2100,.1,14);for(let x=-950;x<=1100;x+=40)box(m.yellow,x,5.25,z,16,.03,.22)}
for(const x of [-780,-390,90,570]){box(asphalt,x,5.16,650,14,.10,1080);for(let z=150;z<1170;z+=40)box(m.yellow,x,5.25,z,.22,.03,16)}
for(const x of [-1180,1180])for(let z=150;z<1150;z+=26){box(m.dark,x,3.7,z,2.2,1.8,8);box(m.concrete,x,4.9,z,3,.4,25)}
// Connected sea wall and harbor breakwaters, rather than floating caisson rows.
box(m.concrete,0,2,-1320,2280,5.2,26);box(m.dark,0,5,-1320,2280,.4,18);
for(let x=-1120;x<1120;x+=100){box(m.yellow,x,5.3,-1320,36,.06,.35);if(x%200===-120)place('light-tower',x,5,-1320)}
for(const x of [-820,-420,60,650,1020])place('tugboat',x,.5,(x===60||x===1020)?1270:1311,Math.PI*(rnd()>.5?0:1));
for(const z of [-1050,-840,-600,-400])place('tugboat',1210,.5,z,Math.PI/2);
// Planar reflected-scene buffers: one bounded-resolution capture shared by
// wet pavement, or by the harbor surface when viewing the waterfront.
const reflectionRT=new T.WebGLRenderTarget(768,480,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:true});
const reflectionFallback=new T.DataTexture(new Uint8Array([0,0,0,255]),1,1);reflectionFallback.needsUpdate=true;
const reflUniforms={uPortReflection:{value:reflectionRT.texture},uPortProjection:{value:new T.Matrix4()},uRoadReflect:{value:0},uSeaReflect:{value:0}};
const reflectionCamera=new T.PerspectiveCamera(),reflectionClip=new T.Plane(V(0,1,0),0),waterSurfaces=[],roadFilm=new T.Group(),seaFilm=new T.Group();
roadFilm.visible=seaFilm.visible=false;scene.add(roadFilm,seaFilm);
const reflectionCommon='uniform sampler2D uPortReflection;\nuniform mat4 uPortProjection;\nvec4 portSample(vec3 p,vec2 ripple){vec4 clip=uPortProjection*vec4(p,1.);vec2 uv=clip.xy/max(clip.w,.001)*.5+.5+ripple;vec2 edge=min(uv,1.-uv);float coverage=smoothstep(.006,.055,min(edge.x,edge.y))*step(.001,clip.w);return vec4(texture2D(uPortReflection,clamp(uv,vec2(.002),vec2(.998))).rgb,coverage);}\n';
let reflectionsEnabled=true,reflectionPasses=0,reflectionCalls=0,reflectionTriangles=0,lastReflectionTime=-Infinity,lastReflectionMode='',lastReflectionPlane=NaN;
function renderPortReflection(cam,plane){
 // Reflect the eye, view direction and up across the horizontal water layer.
 cam.updateMatrixWorld();const direction=cam.getWorldDirection(V(0,0,0)),worldUp=V(0,1,0).applyQuaternion(cam.quaternion);
 reflectionCamera.position.copy(cam.position);reflectionCamera.position.y=2*plane-cam.position.y;direction.y*=-1;worldUp.y*=-1;
 reflectionCamera.up.copy(worldUp);reflectionCamera.lookAt(reflectionCamera.position.clone().add(direction));
 reflectionCamera.projectionMatrix.copy(cam.projectionMatrix);reflectionCamera.projectionMatrixInverse.copy(cam.projectionMatrixInverse);reflectionCamera.updateMatrixWorld();
 reflUniforms.uPortProjection.value.multiplyMatrices(reflectionCamera.projectionMatrix,reflectionCamera.matrixWorldInverse);
 const oldTarget=renderer.getRenderTarget(),oldClips=renderer.clippingPlanes,oldGuide=guide.visible,oldHalos=fixtureHalos.visible;fixtureHalos.visible=false;roadFilm.visible=seaFilm.visible=false;
 const oldRoad=reflUniforms.uRoadReflect.value,oldSea=reflUniforms.uSeaReflect.value;
 reflUniforms.uRoadReflect.value=0;reflUniforms.uSeaReflect.value=0;reflUniforms.uPortReflection.value=reflectionFallback;
 for(const water of waterSurfaces)water.visible=false;
 guide.visible=false;reflectionClip.constant=-plane+.08;renderer.clippingPlanes=[reflectionClip];
 try{updateContainerLOD(reflectionCamera,true);renderer.setRenderTarget(reflectionRT);renderer.render(scene,reflectionCamera);reflectionCalls=renderer.info.render.calls;reflectionTriangles=renderer.info.render.triangles;reflectionPasses++}
 finally{renderer.setRenderTarget(oldTarget);renderer.clippingPlanes=oldClips;guide.visible=oldGuide;fixtureHalos.visible=oldHalos;for(const water of waterSurfaces)water.visible=true;reflUniforms.uRoadReflect.value=oldRoad;reflUniforms.uSeaReflect.value=oldSea;reflUniforms.uPortReflection.value=reflectionRT.texture;updateContainerLOD(cam)}
}
function updatePortReflection(cam){
 reflUniforms.uRoadReflect.value=0;reflUniforms.uSeaReflect.value=0;roadFilm.visible=seaFilm.visible=false;
 if(!reflectionsEnabled||!cam.isPerspectiveCamera||cam.position.y<6||cam.position.y>190)return;
 const p=cam.position,sea=!onLand(p.x,p.z);
 const plane=sea?-.25:5.24,now=performance.now();
 // Static camera captures are exact; continuous flight refreshes at most 8 Hz.
 const moving=tour||keys.size>0||drag;
 if(!moving||now-lastReflectionTime>125||lastReflectionMode!==mode||lastReflectionPlane!==plane){
  renderPortReflection(cam,plane);lastReflectionTime=now;lastReflectionMode=mode;lastReflectionPlane=plane;
 }
 if(lastReflectionPlane===plane){reflUniforms[sea?'uSeaReflect':'uRoadReflect'].value=1;roadFilm.visible=!sea;seaFilm.visible=sea}
}
// Approximate baked footprint occlusion, sampled in world coordinates.
 // The atlas is populated once after the complete static placement pass.
 const contactCanvas=document.createElement('canvas');contactCanvas.width=contactCanvas.height=2048;
 const contactCtx=contactCanvas.getContext('2d',{alpha:false});contactCtx.fillStyle='#fff';contactCtx.fillRect(0,0,2048,2048);
 const contactMap=new T.CanvasTexture(contactCanvas);contactMap.minFilter=T.LinearFilter;contactMap.magFilter=T.LinearFilter;contactMap.generateMipmaps=false;
 const contactUniform={value:contactMap};
 // Static irradiance approximation for the existing practical fixtures.
 // Shared atlas is world-space and costs one texture sample, not more lights.
 const yardLightCanvas=document.createElement('canvas');yardLightCanvas.width=yardLightCanvas.height=2048;
 const yardLightCtx=yardLightCanvas.getContext('2d',{alpha:false});yardLightCtx.fillStyle='#000';yardLightCtx.fillRect(0,0,2048,2048);
 const yardLightMap=new T.CanvasTexture(yardLightCanvas);yardLightMap.minFilter=T.LinearFilter;yardLightMap.magFilter=T.LinearFilter;yardLightMap.generateMipmaps=false;
 const yardLightUniform={value:yardLightMap},yardLightEnabled={value:1};let bakedLightPools=0;
 // Ground macro variation is evaluated in world space so large slabs and tiny props
// no longer share the same apparent UV scale. Preserve the original texture for GLB.
for(const mat of [m.road,asphalt,apron]){
 mat.onBeforeCompile=shader=>{
  shader.uniforms.uContact=contactUniform;shader.uniforms.uYardLight=yardLightUniform;shader.uniforms.uYardLightEnabled=yardLightEnabled;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vPavement;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvec4 pavementP=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\n pavementP=instanceMatrix*pavementP;\n#endif\n vPavement=(modelMatrix*pavementP).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vPavement;\nuniform sampler2D uContact;uniform sampler2D uYardLight;uniform float uYardLightEnabled;\nfloat wetHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float wetNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(wetHash(i),wetHash(i+vec2(1,0)),f.x),mix(wetHash(i+vec2(0,1)),wetHash(i+vec2(1,1)),f.x),f.y);}').replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nfloat wet=wetNoise(vPavement.xz*.045)*.7+wetNoise(vPavement.xz*.19)*.3;float puddle=smoothstep(.55,.82,wet);roughnessFactor=mix(roughnessFactor,.22,puddle*.75);diffuseColor.rgb*=mix(1.0,.68,puddle);').replace('#include <color_fragment>','#include <color_fragment>\nvec2 contactUV=vPavement.xz/3000.+.5;float contact=texture2D(uContact,vec2(contactUV.x,1.-contactUV.y)).r;diffuseColor.rgb*=mix(1.,contact,.78);').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nfloat yardIrr=texture2D(uYardLight,vec2(contactUV.x,1.-contactUV.y)).r;float surfaceFacing=smoothstep(.78,.98,abs(normalize(cross(dFdx(vPavement),dFdy(vPavement))).y));float level=1.-smoothstep(.5,1.5,abs(vPavement.y-5.22));totalEmissiveRadiance+=diffuseColor.rgb*vec3(2.6,1.35,.55)*yardIrr*surfaceFacing*level*uYardLightEnabled;');

 if(mat===m.road){shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',T.ShaderChunk.map_fragment.replace(/\bvUv\b/g,'(vPavement.xz/30.0)')).replace('#include <normal_fragment_maps>',T.ShaderChunk.normal_fragment_maps.replace(/\bvUv\b/g,'(vPavement.xz/30.0)')).replace('#include <roughnessmap_fragment>',T.ShaderChunk.roughnessmap_fragment.replace(/\bvUv\b/g,'(vPavement.xz/30.0)'));}
 };
}
// Metre-scale concrete projection for large civil slabs and retaining faces.
// The ordinary mesh UV is retained in exported GLBs; only the live world renderer
// chooses world-space UVs. A separate program key avoids cached shader confusion.
m.concrete.onBeforeCompile=shader=>{
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCivil;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvec4 civil=vec4(transformed,1.);\n#ifdef USE_INSTANCING\n civil=instanceMatrix*civil;\n#endif\n vCivil=(modelMatrix*civil).xyz;');
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vCivil;').replace('#include <map_fragment>','vec3 worldN=normalize(cross(dFdx(vCivil),dFdy(vCivil)));vec3 civilN=abs(worldN);vec2 civilUV=(civilN.y>=civilN.x&&civilN.y>=civilN.z?vCivil.xz:(civilN.x>=civilN.z?vCivil.zy:vCivil.xy))/8.0;\n'+T.ShaderChunk.map_fragment.replace(/\bvUv\b/g,'civilUV')).replace('#include <roughnessmap_fragment>',T.ShaderChunk.roughnessmap_fragment.replace(/\bvUv\b/g,'civilUV')).replace('#include <normal_fragment_maps>',T.ShaderChunk.normal_fragment_maps.replace(/\bvUv\b/g,'civilUV'));
};
m.concrete.customProgramCacheKey=()=> 'iron-tide-civil-v2';
// Native industrial kit: batched working-port models and practical lighting.
const fixturePositions=[];const warmGlow=new T.MeshBasicMaterial({color:0xffc285,toneMapped:false});
const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=64;const gc=glowCanvas.getContext('2d'),gg=gc.createRadialGradient(32,32,0,32,32,32);gg.addColorStop(0,'rgba(255,165,73,.65)');gg.addColorStop(.35,'rgba(255,132,45,.25)');gg.addColorStop(1,'rgba(255,132,45,0)');gc.fillStyle=gg;gc.fillRect(0,0,64,64);const glowMat=new T.MeshBasicMaterial({map:new T.CanvasTexture(glowCanvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,blending:T.AdditiveBlending});const flatGlow=new T.PlaneGeometry(1,1);flatGlow.rotateX(-Math.PI/2);
function pool(x,y,z,r){
  // On the main apron, light is painted into an irradiance atlas. Keep the
  // existing geometry glow for other heights (hull catwalks and drydock floor).
  if(y>=5.05&&y<=5.65&&Math.abs(x)<1500&&Math.abs(z)<1500){
   const k=2048/3000,cx=(x+1500)*k,cy=(z+1500)*k,rr=Math.max(2,r*k);
   const g=yardLightCtx.createRadialGradient(cx,cy,0,cx,cy,rr);
   g.addColorStop(0,'rgba(255,255,255,.60)');g.addColorStop(.26,'rgba(255,255,255,.40)');g.addColorStop(.60,'rgba(255,255,255,.11)');g.addColorStop(1,'rgba(255,255,255,0)');
   yardLightCtx.save();yardLightCtx.globalCompositeOperation='lighter';yardLightCtx.fillStyle=g;yardLightCtx.fillRect(cx-rr,cy-rr,2*rr,2*rr);yardLightCtx.restore();bakedLightPools++;
  }else part(flatGlow,glowMat,x,y,z,r*2,1,r*2)
 }
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
for(const x of [-950,-600,-240,220,590,1000]){if(x===-600||x===590)continue;place('workboat',x,0,1322,Math.PI*(x>0?1:0))}
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
// Layered coastal terrain: grounded silhouettes and a continuous shore,
// with low-amplitude fractal relief rather than a smooth featureless ridge.
const coastMat=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide});
function shoreline(x){return -2500-170*Math.sin(x*.0007)-90*Math.cos(x*.0025)-65*Math.sin(x*.009)}
function coastalHeight(x,z){const t=T.MathUtils.clamp((shoreline(x)-z)/2200,0,1);const ridge=Math.sin(Math.PI*t)**1.35;
 const large=.48+.24*Math.sin(x*.0008)+.13*Math.sin(x*.0019+1);
 const detail=.58+.25*smoothNoise(x*.004,z*.004)+.12*smoothNoise(x*.013,z*.013);
 return -3+ridge*(70+large*460)*detail}
const coastGeo=new T.BufferGeometry(),coastPos=[],coastColors=[],coastIndices=[],coastN=220,coastM=48;
for(let iz=0;iz<=coastM;iz++)for(let ix=0;ix<=coastN;ix++){
 const x=-6600+ix*60,t=iz/coastM,z=shoreline(x)-t*2200,height=coastalHeight(x,z);
 coastPos.push(x,height,z);const detail=smoothNoise(x*.012,z*.012),grass=smoothNoise(x*.003,z*.003),shore=T.MathUtils.smoothstep(t,.005,.065);
 const c=new T.Color().setRGB(.044+.025*detail+.012*grass,.055+.034*grass,.055+.021*detail);
 c.lerp(new T.Color(0x71675a),1-shore);coastColors.push(c.r,c.g,c.b)
}
for(let iz=0;iz<coastM;iz++)for(let ix=0;ix<coastN;ix++){const a=iz*(coastN+1)+ix,b=a+1,c=a+coastN+1,d=c+1;coastIndices.push(a,b,c,b,d,c)}
coastGeo.setAttribute('position',new T.Float32BufferAttribute(coastPos,3));coastGeo.setAttribute('color',new T.Float32BufferAttribute(coastColors,3));coastGeo.setIndex(coastIndices);coastGeo.computeVertexNormals();part(coastGeo,coastMat,0,0,0,1,1,1);
// Richer native industrial architecture: each kit has an inspectable/exportable model.
// Reserve the original gate centerline; reject whole footprint candidates, not just their centers.
function clearFootprint(x,z,w,d,top){for(const dx of [-w/2,0,w/2])for(const dz of [-d/2,0,d/2])if(!clearScenery(x+dx,top,z+dz))return false;return true}
const rawSteel=material('#8b9196',.68,.46,'steel'),primer=material('#b27250',.18,.75,'steel'),deck=material('#5a615d',.3,.66,'steel');
// Large crane paint must not resemble uniformly pitted raw rust.
// Preserve fine source variation but attenuate it to a plausible coating.
const gantryPaint=m.orange.clone();
{
 const source=m.orange.map.image,c=document.createElement('canvas');c.width=c.height=512;
 const ctx=c.getContext('2d');ctx.drawImage(source,0,0,512,512);
 const image=ctx.getImageData(0,0,512,512),px=image.data;
 for(let i=0;i<px.length;i+=4){const r=px[i],g=px[i+1],b=px[i+2],lum=(r*.2126+g*.7152+b*.0722-95);
  px[i]=Math.max(0,Math.min(255,164+lum*.22));px[i+1]=Math.max(0,Math.min(255,76+lum*.18));px[i+2]=Math.max(0,Math.min(255,39+lum*.14))}
 ctx.putImageData(image,0,0);
 const tex=new T.CanvasTexture(c);tex.encoding=T.sRGBEncoding;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 gantryPaint.map=tex;gantryPaint.roughness=1;gantryPaint.roughnessMap=weatherRoughness(256,256,9137,.71);gantryPaint.metalness=.08;gantryPaint.normalScale=new T.Vector2(.095,.095);gantryPaint.envMapIntensity=.74;
}
define('heavy-gantry-detail',()=>{
 // Paired portal legs with substantial box sections, base bogies and a real trolley walkway.
 for(const x of [-62,62]){for(const z of [-13,13]){
  beam(gantryPaint,[x,3,z],[x*.85,106,z*.65],5.6,6.2);
  // Rail-running bogie frame is elevated above the wheels. Axles run in X;
  // wheel treads align with the pair of longitudinal Z rails at +/-3.8 m.
  box(m.dark,x,3.22,z,12.5,.95,10.5);
  for(const dx of [-3.8,3.8]){
   box(m.steel,x+dx,2.98,z,1.4,.62,9.6);
   for(const dz of [-3.3,-1.1,1.1,3.3]){
    const wheelRot=new T.Quaternion().setFromAxisAngle(V(0,0,1),Math.PI/2),wy=1.90;
    part(cylGeo,m.steel,x+dx,wy,z+dz,1.18,.82,1.18,wheelRot);
    for(const rim of [-.43,.43])part(cylGeo,m.dark,x+dx+rim,wy,z+dz,1.24,.15,1.24,wheelRot);
    beam(m.steel,[x+dx-.78,wy,z+dz],[x+dx+.78,wy,z+dz],.24,.24,true);
    for(const h of [-.73,.73]){box(m.dark,x+dx+h,2.18,z+dz,.32,1.12,1.25);box(m.steel,x+dx+h,2.72,z+dz,.48,.24,1.5)}
   }
   box(m.blue,x+dx,2.78,z-4.55,1.55,.90,1.30);box(m.dark,x+dx,2.8,z+4.9,1.65,.55,.7);
  }
  for(const dx of [-5.1,5.1]){box(m.yellow,x+dx,3.78,z,.12,.15,9.4);for(const dz of [-4.5,4.5])beam(m.steel,[x+dx,3.55,z+dz],[x+dx,4.65,z+dz],.10)}
  beam(m.steel,[x-5,4.65,z-4.5],[x-5,4.65,z+4.5],.10);
  for(let y=13;y<=100;y+=15){const px=x*(1-y/700);box(rawSteel,px,y,z*.8,7,.65,7);for(const off of [-2.4,2.4])box(m.dark,px+off,y+.45,z*.8,.35,.3,6)}
 }
 for(let y=8;y<100;y+=14){const px=x*(1-y/700),px2=x*(1-(y+14)/700);beam(gantryPaint,[px,y,-12],[px2,y+14,12],1.5);beam(rawSteel,[px,y,12],[px2,y+14,-12],.65);}
 for(const off of [-.35,.35])beam(m.steel,[x-4,4,off],[x*.85-4,106,off],.12,.12,true);
 for(let y=4;y<105;y+=.75)beam(m.steel,[x*(1-y/700)-4,y,-.35],[x*(1-y/700)-4,y,.35],.065,.065,true);
 }
 for(const z of [-9,9]){
  box(gantryPaint,0,110,z,142,8,4.5);box(rawSteel,0,114.5,z,142,.7,5.8);box(m.dark,0,105.5,z,141,.55,4.8);
  for(let x=-68;x<70;x+=7){beam(rawSteel,[x,106,z-2.3],[x+6,114,z-2.3],.45);box(m.dark,x,110,z+2.35,.25,7.2,.35)}
  box(deck,0,115.2,z,144,.45,3);rail(0,116.4,z+1.5,142);
 }
 for(let x=-64;x<=64;x+=8)box(m.steel,x,112,0,1.25,1.4,19);
 box(gantryPaint,8,118,0,17,5.8,21);box(m.dark,8,121.2,0,18,.6,22);
 box(m.dark,19,114,12,6,4.5,4);box(m.glass,19,114.35,14.05,5.45,2.9,.15);for(const x of [17,19,21])box(m.steel,x,114.35,14.16,.12,2.95,.12);for(const x of [15.95,22.05])box(m.glass,x,114.35,12,.12,2.9,3.55);box(gantryPaint,19,116.38,12,6.5,.45,4.6);box(m.steel,19,111.4,12,7,.4,5);rail(19,112.55,14.45,7);
 for(const x of [2,14])for(const z of [-3,3])beam(m.dark,[x,113,z],[x,64,z],.12,.12,true);
 box(m.yellow,8,63,0,15,2.8,7);box(m.dark,8,61.1,0,11,.6,4);
 // Four reinforced lifting eyes, pin housings and clevises are attached to
 // the spreader beam, not suspended independently of it.
 for(const x of [2.3,13.7])for(const z of [-2.35,2.35]){
  box(rawSteel,x,64.6,z,1.25,.48,1.15);for(const dx of [-.38,.38])box(m.steel,x+dx,65.1,z,.23,1.05,.78);
  beam(m.wire,[x-.62,65.2,z],[x+.62,65.2,z],.17,.17,true);
  box(m.dark,x,61.1,z,1.18,.42,1.1);for(const dx of [-.35,.35])box(rawSteel,x+dx,60.5,z,.22,1.1,.64);
  beam(m.steel,[x-.5,60.25,z],[x+.5,60.25,z],.18,.18,true);
 }
 for(const x of [2.3,13.7]){box(m.dark,x,63,3.52,1.8,.78,.1);for(let dx=-.65;dx<=.65;dx+=.35)beam(m.yellow,[x+dx-.2,62.65,3.59],[x+dx+.2,63.35,3.59],.12)}

 // Cable sheaves, lifting shackles, trolley wheel housings and access platforms.
 for(const x of [1,15])for(const z of [-5.5,5.5]){part(cylGeo,m.dark,x,114,z,1.4,.6,1.4,new T.Quaternion().setFromAxisAngle(V(1,0,0),Math.PI/2));box(rawSteel,x,116,z,3.6,2.2,1.1)}
 for(const x of [-53,53])for(const z of [-9,9]){box(rawSteel,x,103.6,z,8,.65,8);rail(x,104.7,z+3.5,8);beam(m.steel,[x-3,103.2,z],[x,98,z],.48);}
 for(const z of [-6,6]){box(m.steel,8,62.9,z,16,.45,.55);for(const x of [1,15])beam(m.dark,[x,63.2,z],[x,60.8,z],.16,.16,true)}
 
 for(const x of [-54,54])for(const z of [-10,10])box(m.light,x,104,z,2,.5,2);
 // Upper trolley motors, drum shafts, cable reeving, access platforms and service hoist.
 for(const z of [-7,7]){box(m.steel,8,121.4,z,13,.6,3);beam(m.dark,[2,122.8,z],[14,122.8,z],1.1,1.1,true);for(const x of [2.6,13.4])beam(m.steel,[x-.24,122.8,z],[x+.24,122.8,z],1.35,1.35,true);for(const x of [0,16])box(m.dark,x,122.2,z,3.5,2.6,3.5)}
 for(const x of [3,13])for(const z of [-2.8,2.8]){beam(m.steel,[x,112,z],[x,64,z],.085,.085,true);beam(m.dark,[x+.5,112,z],[x+.5,64,z],.07,.07,true)}
 for(const x of [-55,55]){box(m.dark,x,111,0,6.5,4,12);box(gantryPaint,x,114,0,7,.5,13);rail(x,115,6.4,7)}
 box(gantryPaint,-45,118,0,7,3,5);beam(gantryPaint,[-45,120,0],[-32,129,0],.7);beam(m.dark,[-32,129,0],[-32,115,0],.065,.065,true);
 for(const x of [-61,61])for(const z of [-12,12]){box(m.steel,x,4.8,z,6,.65,4.6);box(gantryPaint,x,6.5,z,3.2,2.8,2.8);box(m.dark,x,6.5,z+1.45,2.5,1.6,.15)}
 // Switchback maintenance stairs on the outboard face of the eastern leg.
 // Landing supports follow the tapered columns; continuous stringers carry
 // the treads and terminate at the actual trolley service deck.
 const stairBase=5.15,stairTop=115.2,flights=16,rise=(stairTop-stairBase)/flights,run=12.4;
 const stairX=y=>62*(1-Math.min(y,106)/700)+4.2;
 for(let n=0;n<=flights;n++){
  const y=stairBase+n*rise,z=n%2?6.2:-6.2,x=stairX(y);
  box(deck,x,y-.16,z,2.9,.32,2.7);
  beam(rawSteel,[x-1.3,y-.18,z],[62*(1-Math.min(y,106)/700),y-1.3,z>0?9:-9],.32);
  for(const dz of [-1.15,1.15]){beam(m.yellow,[x+1.35,y,z+dz],[x+1.35,y+1.05,z+dz],.085);beam(m.yellow,[x-1.35,y,z+dz],[x-1.35,y+1.05,z+dz],.085)}
  beam(m.yellow,[x+1.35,y+1.05,z-1.15],[x+1.35,y+1.05,z+1.15],.075);
  if(n===flights){box(deck,(x+55)/2,y-.16,z,Math.abs(x-55)+2,.32,2.7);break}
  const nextY=y+rise,nextZ=-z,nextX=stairX(nextY),steps=Math.ceil(rise/.23);
  for(const dx of [-.92,.92]){
   beam(rawSteel,[x+dx,y-.28,z],[nextX+dx,nextY-.28,nextZ],.20,.36);
   beam(m.yellow,[x+dx*1.25,y+1.04,z],[nextX+dx*1.25,nextY+1.04,nextZ],.075);
   for(let k=0;k<=4;k++){const t=k/4,xx=T.MathUtils.lerp(x,nextX,t)+dx*1.25,yy=y+rise*t,zz=T.MathUtils.lerp(z,nextZ,t);beam(m.steel,[xx,yy,zz],[xx,yy+1.04,zz],.075)}
  }
  for(let k=1;k<steps;k++){const t=k/steps;box(deck,T.MathUtils.lerp(x,nextX,t),y+rise*t-.08,T.MathUtils.lerp(z,nextZ,t),2.0,.16,run/steps+.055)}
 }
 // Stage 3: connection plates, ribbed motor housings, access enclosures,
 // and bolted rail-running machinery, kept inside the original portal envelope.
 for(const side of [-1,1])for(const z of [-13,13]){
  const x=side*62;
  for(const dx of [-4.6,4.6])for(const dz of [-4.2,4.2]){
   box(m.steel,x+dx,3.85,z+dz,.65,.32,.65);
   cylinder(m.dark,x+dx,4.06,z+dz,.16,.18);
  }
  box(m.blue,x,7.1,z,2.3,2.1,2.4);
  for(let k=-4;k<=4;k++)box(m.steel,x+k*.22,7.1,z+1.23,.075,1.8,.13);
  beam(m.dark,[x,6.05,z],[x,4.2,z],.20,.20,true);
  box(m.yellow,x,8.2,z,2.45,.18,2.55);
 }
 for(const z of [-9,9])for(let x=-63;x<=63;x+=14){
  box(rawSteel,x,110,z+2.32,.52,7.5,.18);
  for(const y of [106.9,113.1])for(const dx of [-.16,.16])box(m.dark,x+dx,y,z+2.46,.15,.18,.16);
 }

 // Power supply bus and protective guard below the main girder.
 for(const z of [-11.5,11.5])for(let x=-63;x<63;x+=7){
  beam(m.wire,[x,104.9,z],[x+7,104.9,z],.14,.14,true);
  beam(m.steel,[x,104.9,z],[x,106.4,z],.15);
 }


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
 // Full-size vessels occupy true water berths, not concrete aprons.
 place('merchant-vessel',-1050,0,1232);
 place('merchant-vessel',-150,0,1232,Math.PI);
 place('merchant-vessel',-660,0,1312);
 for(const cx of [-515,-280])if(clearFootprint(cx,-1218,210,34,49)){
  place('merchant-vessel',cx,0,-1218,Math.PI);
  for(const dx of [-78,78]){beam(m.dark,[cx+dx,12,-1207],[cx+dx*1.1,5.6,-1194],.14,.14,true);place('bollard',cx+dx*1.1,5.15,-1194)}
  // Gangway joins the lower quay to the elevated ship deck.
  const a=[cx-40,5.4,-1197],b=[cx-40,12.4,-1209];
  beam(m.steel,a,b,2.5,.28);for(const side of [-1,1])beam(m.yellow,[a[0]+side*1.05,a[1]+1.05,a[2]],[b[0]+side*1.05,b[1]+1.05,b[2]],.08);
  for(let i=0;i<=7;i++){const t=i/7,x=a[0],y=a[1]+(b[1]-a[1])*t,z=a[2]+(b[2]-a[2])*t;box(m.steel,x,y,z,2.4,.14,1.3)}
 }
 // Working north waterfront: cranes and sheds are at the edge of the berth,
 // with maintained roadway and actual mooring infrastructure.
 for(const x of [-620,-380,-140,115,270])if(clearFootprint(x,-1150,26,26,90))place('lattice-boom-crane',x,5,-1150,-Math.PI/2,.9);
 for(const x of [-485,-235,15,245])if(clearFootprint(x,-1120,68,104,36))place('cargo-shed',x,5.2,-1120,Math.PI/2,.84);

 // Shipyard shore power and mooring points connect vessel to quay.
 for(const cx of [-1050,-150])for(const dx of [-76,76]){beam(m.dark,[cx+dx,12,1222],[cx+dx*1.12,5.7,1193],.16,.16,true);place('bollard',cx+dx*1.12,5.15,1193);}

place('heavy-gantry-detail',850,5,50);for(const x of [788,912]){box(m.concrete,x,5.22,50,9,.42,290);for(const off of [-3.8,3.8]){
  box(m.steel,x+off,5.56,50,.22,.32,290);
  for(let z=-92;z<195;z+=3.5)box(m.dark,x+off,5.46,z,1.0,.1,.4);
 }}
 // Large prefabricated hull sections are intentionally outside the high-altitude
 // crane route; their cross-sections communicate genuine shipyard scale.
 define('hull-section-module',()=>{
  const length=58,half=23,pts=[[0,2],[8,3],[16,10],[21,19],[23,28]];
  for(const sign of [-1,1])for(let i=0;i<pts.length-1;i++){
   const [z1,y1]=pts[i],[z2,y2]=pts[i+1],angle=sign*Math.atan2(y2-y1,z2-z1);
   // Plate normal follows the shell, with longitudinal seams and exposed edges.
   part(boxGeo,m.rust,0,(y1+y2)/2,sign*(z1+z2)/2,length,.66,Math.hypot(z2-z1,y2-y1),new T.Quaternion().setFromAxisAngle(V(1,0,0),-angle));
   for(let x=-28;x<=28;x+=7)beam(rawSteel,[x,y1,sign*z1],[x,y2,sign*z2],.78,1.15);
   beam(m.steel,[-29,y2,sign*z2],[29,y2,sign*z2],.4,.55);
  }
  for(let x=-28;x<=28;x+=7){box(m.dark,x,2,0,1.1,1.5,15);beam(m.steel,[x,3,-8],[x,3,8],.62);for(const side of [-1,1]){beam(m.orange,[x,5,side*11],[x,20,side*21],.75);box(m.steel,x,27,side*22,1.2,.45,2.1)}}
  for(const x of [-23,0,23])for(const z of [-7,7]){box(m.concrete,x,.5,z,5,1,4);box(m.dark,x,1.25,z,4.6,.5,3.4)}
 });
 for(const [x,z,a] of [[658,45,0],[664,-80,Math.PI/2],[1060,-75,Math.PI/2],[1100,70,0]])if(clearFootprint(x,z,60,50,36))place('hull-section-module',x,5.1,z,a);
 for(const [x,z,a] of [[625,-185,.2],[1090,-190,2.9],[565,185,1.3]])if(clearFootprint(x,z,20,20,80))place('lattice-boom-crane',x,5,z,a,.85);
 // Fabrication storage halls beside the high climb.
 for(const [x,z] of [[1100,120],[625,115],[1130,230],[595,-200]])if(clearFootprint(x,z,80,100,32))place('cargo-shed',x,5.2,z);
 
 // Rail-mounted drydock gantry on raised concrete runway strips.
 for(const x of [788,912]){box(m.concrete,x,-1.5,-535,15,13,350);box(m.concrete,x,5.42,-535,10,.84,350);for(const off of [-3.8,3.8]){box(m.steel,x+off,6.06,-535,.22,.32,350);for(let z=-702;z<-365;z+=3.5)box(m.dark,x+off,5.95,z,1.0,.10,.4)}}
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
 // Working terminal equipment: rubber-tyred yard cranes and ship-to-shore cranes
// based on real machinery arrangements; not simply freestanding decorative frames.
define('rtg-crane',()=>{
 const span=23.5,H=23;
 for(const x of [-span/2,span/2])for(const z of [-5,5]){
  box(m.orange,x,11.8,z,1.3,22.3,1.45);box(m.dark,x,2.25,z,3,2.1,3.2);
  for(const dx of [-1.05,1.05]){const q=new T.Quaternion().setFromAxisAngle(V(0,0,1),Math.PI/2);part(cylGeo,m.rubber,x+dx,.94,z,1.0,.64,1.0,q);part(cylGeo,m.steel,x+dx+(dx>0?.33:-.33),.94,z,.44,.12,.44,q)}
  box(m.orange,x,4,z,2.5,2.0,3.0);beam(m.steel,[x,4,z],[x,10,z*.7],.36);
 }
 for(const x of [-span/2,span/2]){box(m.orange,x,22,0,1.6,2.1,12);box(m.dark,x,4,0,2.6,1.4,9);rail(x,24,0,12,'z')}
 for(const z of [-4,4]){box(m.orange,0,H,z,26,2.2,1.55);box(m.steel,0,H+1.25,z,26,.25,1.2);rail(0,H+2.1,z+.7,25)}
 box(m.orange,0,24.5,0,5.2,2.1,10);box(m.dark,-3.2,21,4.8,2.8,2.7,2.6);box(m.glass,-3.2,21.35,6.13,2.45,1.68,.11);box(m.steel,-3.2,21.35,6.2,.08,1.68,.05);box(m.orange,-3.2,22.43,4.8,3,.23,2.8);
 box(m.dark,0,25.9,0,4,.75,6);for(const x of [-2.0,2.0])for(const z of [-3,3])for(const sign of [-1,1])beam(m.dark,[x,23,z+sign*.18],[x,17,z+sign*.18],.055,.055,true);
 box(m.yellow,0,16.9,0,2.65,.65,7);for(const x of [-1.2,1.2])for(const z of [-3.4,3.4])box(m.dark,x,16.4,z,.38,.4,.38);
 box(m.dark,span/2+1,5,0,2.1,3,5);box(m.light,-span/2,20,0,1.3,.4,.6);
});
define('quay-container-crane',()=>{
 // STS: waterside/landside portals, outreach boom, machinery house, trolley and spreader.
 for(const x of [-10,10])for(const z of [-12,12]){
  box(m.dark,x,1.4,z,4.7,2.8,5.0);
  for(const dz of [-1.6,0,1.6]){const q=new T.Quaternion().setFromAxisAngle(V(1,0,0),Math.PI/2);part(cylGeo,m.steel,x,.85,z+dz,1,.6,1,q)}
  beam(m.orange,[x,3,z],[x*.85,52,z*.8],2.1,2.5);
  box(m.steel,x,4,z,3.9,.5,4.2);
 }
 for(const x of [-9,9]){
  box(m.orange,x,49,0,1.9,3,29);beam(m.steel,[x,18,-11],[x,40,11],.65);
  beam(m.orange,[x,51,-10],[x*.68,78,-4],1.6);
  for(const z of [-25,0,25])box(m.steel,x,50,z,1.4,1.6,1);
 }
 for(const x of [-2.6,2.6]){
  box(m.orange,x,52,20,2.4,3.5,96);box(m.steel,x,54,20,1.5,.25,96);box(m.dark,x,50,20,1.7,.2,96);
  for(let z=-25;z<67;z+=7)box(m.steel,x,52,z,.23,3.5,1.8);
  beam(m.dark,[x,78,-4],[x,54,66],.11,.11,true);beam(m.dark,[x,78,-4],[x,54,-27],.11,.11,true);
 }
 beam(m.orange,[-6,78,-4],[6,78,-4],1.5);box(m.dark,0,56,-18,9,5,16);box(m.blue,0,58.7,-18,9.5,.45,16.5);
 box(m.orange,0,49,42,7.5,3.6,8);box(m.dark,4.2,48,42,2.8,3.2,4);box(m.glass,5.64,48.4,42,.11,2.2,3.56);box(m.glass,4.2,48.4,44.04,2.45,2.2,.11);box(m.steel,5.72,48.4,42,.055,2.2,.08);box(m.orange,4.2,49.72,42,3.1,.25,4.3);
 for(const x of [-1.3,1.3])for(const z of [39,45])beam(m.dark,[x,48,z],[x,27,z],.08,.08,true);
 box(m.yellow,0,26.5,42,3.2,1.0,12);for(const x of [-1.5,1.5])for(const z of [36,48])box(m.dark,x,25.8,z,.35,.55,.35);
 box(m.steel,7,50,16,1.8,.42,85);rail(7.9,51,16,85,'z');for(const z of [-12,12,45])box(m.light,0,48,z,1.5,.45,1.1);
});
function openGround(x,z,w,d){return !containerSlots.some(q=>Math.abs(x-q.x)<w/2+q.hx+1&&Math.abs(z-q.z)<d/2+q.hz+1)}
let rtgCount=0;
for(const z of [580,680,780,880,980])for(const x of [300,405,520,650,770,900,1045]){
 if(rtgCount>=9)break;
 if(clearFootprint(x,z,29,16,33)&&openGround(x-11.75,z,4,14)&&openGround(x+11.75,z,4,14)){place('rtg-crane',x,5.18,z);rtgCount++}
}
// Rail foundations and wharf cranes above the southern berth. All lie seaward
// of the launch route; the cantilever extends over the vessel loading area.
for(const x of [-710,-230,270,770]){
 if(clearFootprint(x,1174,24,29,85)){place('quay-container-crane',x,5.16,1174);for(const z of [1162,1186])box(m.steel,x,5.25,z,85,.17,.28)}
}
// Foundry and process district equipment: functional assembly layouts, not loose boxes.
define('steel-forming-press',()=>{
 box(m.dark,0,.55,0,9,1.1,6.5);box(m.steel,0,1.2,0,8.3,.35,5.6);
 for(const x of [-3.5,3.5])for(const z of [-2.5,2.5]){box(m.steel,x,5,z,.9,9,.9);box(m.dark,x,1.4,z,1.3,.45,1.3)}
 box(m.blue,0,9.2,0,9,2.2,6.2);for(const x of [-2.3,2.3]){cylinder(m.dark,x,7.2,0,.65,2.9);cylinder(m.steel,x,5.1,0,.28,2.8)}
 box(m.steel,0,3.9,0,7.4,.8,4.8);box(m.orange,0,2,0,7,.5,4.5);
 box(m.dark,4.8,2.1,0,1.9,3.4,3);box(m.glass,4.8,3.1,1.55,1.4,.85,.12);
 for(const z of [-2,2]){beam(m.rust,[4.9,4,z],[4.9,8,z],.12,.12,true);beam(m.steel,[4.9,8,z],[2.3,8,z],.12,.12,true)}
 for(const x of [-4.3,4.3])box(m.yellow,x,.17,0,.18,.15,6.4);
});
define('roller-conveyor',()=>{
 for(const x of [-2.25,2.25]){box(m.steel,x,1.65,0,.45,.5,26);for(let z=-12;z<=12;z+=4){box(m.dark,x,.8,z,.5,1.6,.5);box(m.steel,x,.18,z,1.1,.36,1.1)}}
 for(let z=-12;z<=12;z+=.85){beam(m.steel,[-2.4,1.85,z],[2.4,1.85,z],.19,.19,true);for(const x of [-2.28,2.28])box(m.dark,x,1.85,z,.32,.32,.28)}
 box(m.orange,2.8,1.7,8,.65,.7,2.1);
});
define('process-pump-skid',()=>{
 box(m.steel,0,.24,0,8.3,.48,5.4);for(const z of [-1.3,1.3]){
  beam(m.steel,[-2.6,1.5,z],[.6,1.5,z],.65,.65,true);beam(m.dark,[-2.8,1.5,z],[-2.55,1.5,z],.8,.8,true);
  part(sphereGeo,m.blue,1.45,1.5,z,1.03,1.12,1.1);beam(m.steel,[1.45,1.7,z],[1.45,3.4,z],.33,.33,true);beam(m.steel,[1.45,3.4,z],[3.8,3.4,z],.33,.33,true);
  for(const x of [-2.4,-1.2,.2])box(m.dark,x,.62,z,1.05,.6,.95);
 }
 for(const z of [-1.3,1.3])beam(m.rust,[3.8,3.4,z],[3.8,1.15,z],.35,.35,true);beam(m.steel,[3.8,1.15,-1.8],[3.8,1.15,1.8],.48,.48,true);
 for(const z of [-1.8,1.8]){beam(m.dark,[3.8,1.0,z],[3.8,1.7,z],.57,.57,true);cylinder(m.yellow,3.8,2.1,z,.24,1)}
});
for(const center of [-650,-450,-170,100]){
 for(const x of [-916,-844])for(const dz of [-35,22]){if(clearFootprint(x,center+dz,11,30,17)){place('steel-forming-press',x,5.2,center+dz);place('roller-conveyor',x,5.22,center+dz+16)}}
}
for(const [x,z] of [[-1040,465],[-1040,650],[-610,470],[-580,640],[-960,760]]){
 if(clearFootprint(x,z,20,14,13)){for(const off of [-5,5])place('process-pump-skid',x,5.2,z+off);for(const y of [8.3,10.7]){beam(m.steel,[x-10,y,z-6],[x+10,y,z-6],.4,.4,true);beam(m.steel,[x+10,y,z-6],[x+10,y,z+8],.4,.4,true)}pool(x,5.29,z,13)}
}
// Connected dock work zones: cargo inspection platform, piping, forklifts and
// terminal trailers, arranged around existing access paths rather than scattered.
define('terminal-tractor',()=>{
 // Yard tractor: short wheelbase, elevated single cab and exposed rear chassis.
 const body=m.white,paint=m.orange,tire=m.rubber,glass=m.glass.clone();glass.color.setHex(0x25343a);glass.roughness=.16;glass.metalness=.25;
 const wheelQ=new T.Quaternion().setFromAxisAngle(V(0,0,1),Math.PI/2);
 for(const x of [-.69,.69])box(m.dark,x,.79,0,.20,.36,5.15);
 for(let z=-2.3;z<2.5;z+=1.0)box(m.steel,0,.78,z,1.6,.23,.24);
 for(const z of [-1.55,1.53]){beam(m.steel,[-1.1,.56,z],[1.1,.56,z],.17,.17,true);
  for(const x of [-1.03,1.03]){
   const side=Math.sign(x);part(cylGeo,tire,x,.57,z,.57,.35,.57,wheelQ);part(cylGeo,m.dark,x+side*.19,.57,z,.41,.08,.41,wheelQ);part(cylGeo,m.steel,x+side*.24,.57,z,.285,.055,.285,wheelQ);
   for(let i=0;i<8;i++){const ang=i*Math.PI/4;part(cylGeo,m.dark,x+side*.279,.57+.19*Math.cos(ang),z+.19*Math.sin(ang),.032,.024,.032,wheelQ)}
   if(z>0)part(cylGeo,tire,x-side*.34,.57,z,.57,.29,.57,wheelQ)
   for(let i=0;i<16;i++){const ang=i*Math.PI/8,q=new T.Quaternion().setFromAxisAngle(V(1,0,0),ang);part(boxGeo,tire,x,.57+Math.cos(ang)*.565,z+Math.sin(ang)*.565,.29,.025,.105,q)}
  }
 }
 // Cab shell has softened corners, separate window openings, A-pillars and roof cap.
 box(body,-.12,1.46,-1.35,2.15,1.16,2.12);
 const shape=new T.Shape();shape.moveTo(-1.08,-.45);shape.lineTo(1.08,-.45);shape.lineTo(1.08,.26);shape.lineTo(.91,.48);shape.lineTo(-.91,.48);shape.lineTo(-1.08,.26);shape.closePath();
 const shell=new T.ExtrudeGeometry(shape,{depth:1.92,bevelEnabled:true,bevelSize:.055,bevelThickness:.055,bevelSegments:2,steps:1});shell.translate(0,0,-.96);part(shell,body,-.12,2.63,-1.35,1,1,1);
 box(glass,-.12,2.69,-2.38,1.83,.72,.07);box(m.dark,-.12,2.69,-2.43,.055,.72,.035);
 for(const x of [-1.23,.99]){box(glass,x,2.68,-1.42,.055,.65,1.56);box(m.dark,x,2.68,-1.42,.074,.69,.055);box(body,x,2.28,-1.42,.1,.14,1.8)}
 box(body,-.12,3.17,-1.35,2.31,.20,2.19);box(paint,-.12,3.28,-1.35,2.31,.07,2.19);
 // Bumper, radiator intake, headlamps, wipers, mirror arms and entry steps.
 box(m.dark,0,.86,-2.47,2.38,.46,.24);box(m.dark,-.12,1.46,-2.43,1.31,.58,.08);
 for(let y=1.23;y<1.73;y+=.08)box(m.steel,-.12,y,-2.49,1.22,.024,.055);
 for(const x of [-.89,.75]){box(m.steel,x,1.38,-2.47,.39,.36,.1);box(m.light,x,1.39,-2.535,.29,.24,.055)}
 for(const x of [-.54,.37])beam(m.dark,[x,2.38,-2.44],[x+.3,2.9,-2.44],.022);
 for(const side of [-1,1]){const x=-.12+side*1.09;beam(m.dark,[x,2.72,-2.06],[x+side*.39,2.76,-2.06],.045,.045,true);box(m.dark,x+side*.39,2.75,-2.03,.19,.38,.12);box(m.steel,x+side*.13,.91,-1.3,.35,.13,.58);box(m.steel,x+side*.13,.66,-1.3,.35,.12,.56)}
 for(const x of [-.77,.77]){beam(m.dark,[x,1.17,1.4],[x,1.75,1.4],.23,.23,true);box(m.steel,x,1.3,1.4,.45,.2,.75)}
 // Fifth wheel plate and hydraulic lift, actual trailer coupling height.
 box(m.dark,0,1.12,1.36,1.8,.25,1.55);cylinder(m.steel,0,1.43,1.36,.82,.20);box(m.dark,0,1.53,1.78,.19,.045,.68);
 beam(m.dark,[0,.88,.7],[0,1.35,1.28],.15,.15,true);beam(m.steel,[.93,1.25,-.3],[.93,3.3,-.3],.12,.12,true);beam(m.dark,[.93,3.3,-.3],[.93,3.4,-.56],.13,.13,true);
 for(const x of [-.98,.98]){box(m.dark,x,1.24,1.53,.44,.16,1.49);box(m.rust,x,.85,2.43,.22,.28,.12)}
 box(m.yellow,-.48,3.41,-1.34,.22,.18,.22);
});
define('cargo-trailer',()=>{
 box(m.steel,0,1.4,0,2.6,.42,13.0);for(const x of [-1.1,1.1])box(m.dark,x,1.03,0,.25,.42,12.7);
 for(const z of [3.6,5.05])for(const x of [-1.1,1.1]){const rot=new T.Quaternion().setFromAxisAngle(V(0,0,1),Math.PI/2);part(cylGeo,m.rubber,x,.72,z,.7,.46,.7,rot);part(cylGeo,m.steel,x+(x>0?.24:-.24),.72,z,.28,.12,.28,rot)}
 for(const x of [-1,1])box(m.steel,x,.85,-3.2,.16,1.45,.18);for(const z of [-6.25,6.25])for(const x of [-1.12,1.12])box(m.yellow,x,1.7,z,.18,.18,.19);
});
for(const [x,z] of [[-875,1143],[-570,1140],[-55,1153],[390,1145],[870,1145],[1000,1120]]){
 if(clearFootprint(x,z,6,23,11)&&openGround(x,z,6,23)){place('terminal-tractor',x,5.22,z,Math.PI/2);place('cargo-trailer',x+9,5.22,z,Math.PI/2)}
}
// Northern berth finger piers and loading infrastructure interrupt the overly
// empty sea corridor; stays clear of the original checkpoint-center route.
for(const [x,z] of [[500,-1150],[100,-1190],[-340,-1180]]){
 if(clearFootprint(x,z,90,34,22)){
  box(m.concrete,x,1.4,z,90,5.5,34);box(m.road,x,4.3,z,88,.2,32);
  for(const dx of [-40,-20,0,20,40]){place('bollard',x+dx,4.5,z-15);box(m.dark,x+dx,2,z-17,2,3,.5)}
  for(const dx of [-24,24])lamp(x+dx,4.5,z+7);
  if(clearFootprint(x,z,24,16,26))place('maintenance-bay',x,4.5,z);
 }
}
// Northwest pier occupies this area; move small craft to real open water rather than through concrete.
for(const x of [-1050,-800])if(clearFootprint(x,-1360,130,40,36))place('workboat',x,0,-1360,.02,.95);
// New container-wall placements use segment-versus-inflated-box tests. The
// conservative 13 m clearance protects the existing ring openings and gives
// camera users the close walls suggested by the reference. This is not a
// swept-volume audit of the original world or any particular REDLINE craft.
function routeBoxClear(x,z,w,d,lo,hi,clearance=13){
 const mn=[x-w/2-clearance,lo-clearance,z-d/2-clearance],mx=[x+w/2+clearance,hi+clearance,z+d/2+clearance];
 for(let i=0;i<routePoints.length;i++){
  const a=routePoints[i],b=routePoints[(i+1)%routePoints.length];let t0=0,t1=1;
  for(let k=0;k<3;k++){const delta=b[k]-a[k];if(Math.abs(delta)<1e-8){if(a[k]<mn[k]||a[k]>mx[k]){t0=1;t1=0;break}}else{let n=(mn[k]-a[k])/delta,f=(mx[k]-a[k])/delta;if(n>f){const tmp=n;n=f;f=tmp}t0=Math.max(t0,n);t1=Math.min(t1,f);if(t0>t1)break}}
  if(t0<=t1)return false;
 }
 return true
}
let corridorStacks=0;
for(let i=4;i<=6;i++){
 const a=routePoints[i],b=routePoints[i+1],dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len,angle=Math.atan2(-dz,dx),w=12.4*Math.abs(Math.cos(angle))+2.6*Math.abs(Math.sin(angle)),d=12.4*Math.abs(Math.sin(angle))+2.6*Math.abs(Math.cos(angle));
 for(const side of [-1,1])for(const offset of [21,34])for(let k=20;k<len-15;k+=16){
  const x=a[0]+dx*k/len+nx*offset*side,z=a[2]+dz*k/len+nz*offset*side;
  if(!openGround(x,z,w,d))continue;
  let added=false;
  for(let h=0;h<7+(Math.round(k/16)%3);h++){
   const y=5+h*2.94;if(!routeBoxClear(x,z,w,d,y,y+2.94))break;
   if(place('container-'+['rust','blue','green','white'][(i+h+Math.round(k/16))%4],x,y,z,angle))added=true;else break
  }
  if(added)corridorStacks++;
 }
}
// Tidal wall equipment: rubber fenders are supported on steel backing plates.
define('quay-fender',()=>{box(m.steel,0,0,0,2.7,3,.24);box(m.rubber,0,0,.52,2.3,2.7,.82);for(const x of [-.95,.95])for(const y of [-1.12,1.12])box(m.steel,x,y,.98,.18,.18,.12)});
for(let x=-1160;x<1160;x+=21)place('quay-fender',x,2.6,1200.14);
for(let z=-1150;z<-830;z+=21)place('quay-fender',330.15,2.6,z,Math.PI/2);
for(let z=-750;z<-360;z+=21)place('quay-fender',330.15,2.6,z,Math.PI/2);
// Quay coping, mooring ropes, tidal staining, drain channels and riprap.
const stain=new T.MeshStandardMaterial({color:0x353b35,roughness:.95,metalness:0}),foam=new T.MeshBasicMaterial({color:0xc3d5d8,transparent:true,opacity:.22,depthWrite:false});
for(let x=-1160;x<=1160;x+=25){box(stain,x,1.2,1200.05,24.8,1.5,.16);box(rawSteel,x,5.25,1195,24.5,.14,.25);if(x%100===-60)place('bollard',x,5.15,1194);place('breakwater-armour',x,0,-1342);box(foam,x,-.12,-1354,11,.04,1.1)}
for(const x of [-1178,1178])for(let z=125;z<1200;z+=25){box(stain,x,1.5,z,.15,1.8,24.8);box(rawSteel,x,5.25,z,.25,.12,24.5)}
for(const x of [655,1045])for(let z=-734;z<-365;z+=15){box(stain,x+(x<850?5.1:-5.1),-4.5,z,.12,4,14.8);box(rawSteel,x+(x<850?6:-6),-2,z,.55,.5,14.8);box(m.dark,x+(x<850?5.2:-5.2),-2.2,z,.25,1.1,1.1)}
for(const [x,z] of [[-900,1270],[-420,1270],[60,1270],[650,1270],[1020,1270]]){beam(m.dark,[x-12,3,z-4],[x-18,5.5,1195],.12,.12,true);beam(m.dark,[x+12,3,z-4],[x+18,5.5,1195],.12,.12,true)}
// Hero close-range equipment with believable mechanical assemblies and shared
// material slots. All modules are exported as native GLB assets.
define('process-manifold',()=>{
 const fl=m.steel,pipe=m.green,base=m.dark;
 for(const x of [-7,7])for(const z of [-3,3]){box(m.concrete,x,.25,z,2,.5,2);box(fl,x,2,z,.35,3.5,.35)}
 for(const z of [-3,3])beam(fl,[-8,3.6,z],[8,3.6,z],.38);
 for(const z of [-2.2,0,2.2]){
  beam(pipe,[-8,4.1,z],[8,4.1,z],.62,.62,true);
  for(const x of [-6,-2,2,6]){
   beam(fl,[x-.20,4.1,z],[x+.20,4.1,z],.79,.79,true);
   for(let i=0;i<8;i++){const a=i*Math.PI/4;beam(base,[x-.26,4.1+.71*Math.cos(a),z+.71*Math.sin(a)],[x+.26,4.1+.71*Math.cos(a),z+.71*Math.sin(a)],.07,.07,true)}
  }
  cylinder(m.rust,0,4.65,z,.78,1.5);cylinder(fl,0,5.6,z,.33,.4);cylinder(base,0,6.1,z,.12,.8);
  const wheel=new T.TorusGeometry(.64,.065,6,20);part(wheel,m.yellow,0,6.6,z,1,1,1,new T.Quaternion().setFromAxisAngle(V(1,0,0),Math.PI/2));
  for(const a of [0,Math.PI/3,2*Math.PI/3])beam(m.yellow,[-.56*Math.cos(a),6.6,z-.56*Math.sin(a)],[.56*Math.cos(a),6.6,z+.56*Math.sin(a)],.065);
 }
 box(fl,7,1.3,0,2.4,2.2,2.1);box(m.glass,7,1.7,1.1,1.1,.55,.12);box(m.yellow,7,2.55,0,2.6,.3,2.3);
});
define('hydraulic-power-unit',()=>{
 box(m.dark,0,.22,0,5.8,.44,3.2);box(m.steel,-.7,.95,0,3.4,1.4,2.6);box(m.yellow,-.7,1.76,0,3.5,.18,2.7);
 beam(m.blue,[1,1.05,0],[2.5,1.05,0],.62,.62,true);for(let x=1;x<2.5;x+=.18)beam(m.steel,[x,1.05,0],[x+.06,1.05,0],.67,.67,true);
 for(const z of [-.7,.7]){beam(m.dark,[-1,1.9,z],[-1,2.7,z],.10,.10,true);beam(m.dark,[-1,2.7,z],[1.65,2.7,z],.10,.10,true);beam(m.dark,[1.65,2.7,z],[1.65,1.55,z],.10,.10,true);cylinder(m.steel,-1,1.9,z,.18,.22)}
 for(const x of [-2,2])box(m.steel,x,.55,0,.28,.30,3.1);
});
define('quay-fender',()=>{
 box(m.steel,0,2,0,.4,4,3);for(const y of [1,3]){for(const z of [-1,1])beam(m.steel,[-.28,y,z],[.28,y,z],.12,.12,true)}
 for(const z of [-.9,.9])beam(m.rubber,[.3,.2,z],[1.4,3.8,z],.62);
 box(m.rubber,1.5,2,0,.65,3.8,2.75);
});
define('fabrication-rack',()=>{
 for(const x of [-6,6])for(const z of [-2.8,2.8]){box(m.steel,x,2.5,z,.38,5,.38);box(m.dark,x,.17,z,.8,.34,.8)}
 for(const y of [1,2.8,4.5])for(const z of [-2.8,2.8])beam(m.orange,[-6,y,z],[6,y,z],.32);
 for(const z of [-2.8,2.8])beam(m.steel,[-6,.3,z],[6,5,z],.16);
 for(let y=1.2;y<5;y+=1.8)for(let z=-2.1;z<=2.1;z+=.8)box(m.steel,0,y,z,11.6,.26,.65);
});
for(const z of [390,550,690,790])for(const x of [-1010,-610])if(clearFootprint(x,z,18,9,14)){place('process-manifold',x,5.25,z,Math.PI/2);place('hydraulic-power-unit',x+10,5.25,z+10)}
for(const center of [-650,-450,-170,100])for(const x of [-920,-840])for(const dz of [-48,12,54]){const z=center+dz;if(clearFootprint(x,z,13,7,11)){place('fabrication-rack',x,5.25,z,Math.PI/2);place('hydraulic-power-unit',x,5.25,z+9)}}
for(let x=-1150;x<1150;x+=22)place('quay-fender',x,0,1200.4,-Math.PI/2);
for(const x of [695,1005])for(let z=-710;z<-375;z+=65)place('hydraulic-power-unit',x,-7.8,z);
// Warm work-light banks, mounted on the actual gantry legs, drydock walls
// and foundry structural beams; emissive lenses and physically decaying lights.
 for(const z of [50,-535])for(const x of [788,912])for(const side of [-1,1]){
  const zz=z+side*12;box(m.dark,x,18,zz,1.35,.85,.8);box(warmGlow,x,17.53,zz,.96,.12,.64);fixturePositions.push([x,17.35,zz]);pool(x,5.32,zz,23);
 }
 for(const x of [776,924])for(let z=-700;z<-380;z+=32){
  box(m.dark,x,3.2,z,.75,.5,1.3);box(warmGlow,x+(x<850?.43:-.43),3.2,z,.1,.35,1.0);fixturePositions.push([x+(x<850?.6:-.6),3.2,z]);pool(x+(x<850?6:-6),-7.7,z,14);
 }
 for(const z of [-650,-450,-170,100])for(const x of [-915,-845])for(const dz of [-48,-12,24,60]){
  const zz=z+dz;box(m.dark,x,19.3,zz,1.2,.42,.6);box(warmGlow,x,19.04,zz,1.0,.1,.4);fixturePositions.push([x,18.9,zz]);pool(x,5.34,zz,19);
 }
 // Flight-height density pass: complete work cells rather than scatter props.
 // Grounded additions are accepted only if their whole transformed model bounds
 // avoid existing template footprints, stacked cargo and the protected centerline.
 let newWorkCells=0,newProcessTowers=0;
 function siteAvailable(name,x,z,angle=0,scale=1){
  const root=new T.Object3D();root.position.set(x,5.25,z);root.rotation.y=angle;root.scale.setScalar(scale);root.updateMatrix();
  const bounds=placementBounds.get(name).clone().applyMatrix4(root.matrix),c=bounds.getCenter(V(0,0,0)),size=bounds.getSize(V(0,0,0));
  if(bounds.min.x<-1175||bounds.max.x>1175||bounds.min.z<105||bounds.max.z>1195)return false;
  if(!clearFootprint(c.x,c.z,size.x+3,size.z+3,bounds.max.y)||!openGround(c.x,c.z,size.x+2,size.z+2))return false;
  return !placedSites.some(b=>bounds.min.x<b.max.x+1.5&&bounds.max.x>b.min.x-1.5&&bounds.min.z<b.max.z+1.5&&bounds.max.z>b.min.z-1.5&&bounds.min.y<b.max.y+.5&&bounds.max.y>b.min.y-.5);
 }
 define('quayside-workcell',()=>{
  const W=24,D=19,H=19;
  box(m.concrete,0,.3,0,W+.5,.6,D+.5);
  for(const x of [-11.6,11.6])for(const z of [-9,9]){
   box(m.steel,x,H/2,z,.65,H,.65);box(m.concrete,x,.4,z,1.7,.8,1.7);
   box(m.steel,x,1,z,1.05,.25,1.05);
  }
  for(const z of [-9,9]){
   box(m.steel,0,H-.7,z,W,1.3,.8);
   for(let x=-11;x<=8;x+=4)beam(m.steel,[x,H-3,z],[x+3,H-.2,z],.24);
  }
  box(cladding,0,13,-9.2,W,11.5,.5);
  for(let x=-10;x<=10;x+=2)box(m.steel,x,13,-9.47,.12,11.2,.15);
  for(const side of [-1,1]){
   const angle=-side*Math.atan2(2.2,W/2);
   part(boxGeo,roofMetal,side*W/4,H+1.1,0,Math.hypot(W/2,2.2)+.5,.35,D+1,new T.Quaternion().setFromAxisAngle(V(0,0,1),angle));
   for(let z=-8;z<=8;z+=2)beam(m.steel,[0,H+2.45,z],[side*12,H+.2,z],.1);
   box(m.orange,side*10.1,14,0,.8,1,D-1);
  }
  box(m.orange,0,15,0,W-3,1.6,1.2);box(m.dark,4,14.1,0,2.7,.9,2.1);
  for(const z of [-.45,.45])beam(m.dark,[4,13.8,z],[4,8,z],.065,.065,true);
  box(m.yellow,4,7.8,0,2.4,.4,1.1);
  // Fabrication table, raw steel plates and material racks.
  for(const x of [-6,6]){box(m.dark,x,1.6,-4,7,3,3);box(m.steel,x,3.2,-4,7.5,.3,3.5);for(let i=0;i<5;i++)box(m.rust,x,3.4+i*.14,-4,6.4,.12,2.8)}
  for(const x of [-7,7]){box(m.light,x,H-2.2,5,1.6,.22,.65);box(m.dark,x,H-1.9,5,1.8,.4,.8)}
  box(m.glass,-7,11,-9.52,4,3,.18);box(m.glass,6,11,-9.52,4,3,.18);
 });
 define('fractionation-service-tower',()=>{
  const rad=2.8,H=36,cg=new T.CylinderGeometry(1,1,1,32);
  box(m.concrete,0,.5,0,9,1,9);
  part(cg,m.steel,0,H/2+1,0,rad,H,rad);
  for(let y=4;y<=35;y+=6){
   const ring=new T.TorusGeometry(rad+.06,.08,5,32);part(ring,m.dark,0,y,0,1,1,1,new T.Quaternion().setFromAxisAngle(V(1,0,0),Math.PI/2));
   for(let a=0;a<Math.PI*2;a+=Math.PI/2){const x=Math.cos(a)*rad,z=Math.sin(a)*rad;box(m.steel,x,y,z,.2,.35,.2)}
  }
  for(const y of [11,23,35]){
   box(m.steel,3.6,y,0,2.6,.3,6);
   rail(4.8,y+1.1,0,6,'z');beam(m.steel,[2.6,y-2.5,-2.3],[4.6,y,-2.3],.24);beam(m.steel,[2.6,y-2.5,2.3],[4.6,y,2.3],.24);
   box(m.light,3.4,y+2,0,.4,.2,.45);
  }
  for(const z of [-.45,.45])beam(m.yellow,[4,1,z],[4,36,z],.08);
  for(let y=1.5;y<36;y+=.48)beam(m.steel,[4,y,-.45],[4,y,.45],.055);
  for(const z of [-1.4,1.4]){beam(m.rust,[-2.5,5,z],[-4,5,z],.34,.34,true);beam(m.rust,[-4,5,z],[-4,30,z],.34,.34,true);beam(m.rust,[-4,30,z],[-2.5,30,z],.34,.34,true);for(let y=6;y<30;y+=5)beam(m.steel,[-4,y,z],[-2.4,y,z],.18)}
  cylinder(m.steel,0,37.9,0,1.1,1.8);cylinder(m.dark,0,39,0,1.3,.4);
 });
 for(const z of [1038,1125])for(let x=-1070;x<=160;x+=47){
  if(newWorkCells>=22)break;
  const angle=z<1080?0:Math.PI;
  if(siteAvailable('quayside-workcell',x,z,angle,.9)){
   place('quayside-workcell',x,5.25,z,angle,.9);newWorkCells++;
   for(const dx of [-6,6]){fixturePositions.push([x+dx,20,z]);pool(x+dx,5.33,z,13)}
  }
 }
 for(const x of [-1110,-1020,-980,-930,-780,-730,-590,-515])for(const z of [465,550,630,715,795]){
  if(newProcessTowers>=16)break;
  if(siteAvailable('fractionation-service-tower',x,z,Math.PI/2,.88)){place('fractionation-service-tower',x,5.25,z,Math.PI/2,.88);newProcessTowers++;pool(x,5.33,z,11)}
 }
 // Drydock floor detailing: longitudinal drainage and segmented keel tracks.
 // No protrusions above the existing floor clearance envelope.
 for(const x of [810,890])for(let z=-730;z<-375;z+=14){box(m.dark,x,-7.92,z,1.15,.13,13.8);for(let dz=-5;dz<=5;dz+=2)box(m.steel,x,-7.83,z+dz,1.05,.06,.12)}
 for(let z=-728;z<-370;z+=9){for(const x of [820,880])box(m.concrete,x,-7.64,z,4,.5,3.2);if(z%27===-8)for(const x of [805,895])box(m.yellow,x,-7.88,z,.12,.025,8.5)}
 // Small staged steel handling cells are validated against established geometry.
 let transferStations=0;
 define('steel-transfer-station',()=>{
  for(const x of [-8,8])for(const z of [-4,4]){box(m.concrete,x,.35,z,1.7,.7,1.7);box(m.steel,x,2.7,z,.48,4.8,.48)}
  for(const z of [-4,4]){beam(m.steel,[-8,5.1,z],[8,5.1,z],.55,.8);for(const x of [-6,0,6])beam(m.dark,[x,1,z],[x+1.5,5,z],.2)}
  for(const x of [-5,0,5]){box(m.dark,x,.5,0,2.8,1,6);for(let y=0;y<5;y++)box(m.rust,x,1.1+y*.15,0,2.6,.12,5.8)}
  box(m.orange,0,5.3,0,3,.55,8.8);box(m.dark,0,4.8,0,1.4,.55,1.7);beam(m.dark,[0,4.5,0],[0,2.6,0],.075,.075,true);box(m.yellow,0,2.4,0,1.5,.3,1)
 });
 for(const z of [1019,1147,405,705,825])for(let x=-1090;x<160;x+=54){
  if(transferStations>=12)break;
  if(siteAvailable('steel-transfer-station',x,z,0,.9)){place('steel-transfer-station',x,5.25,z,0,.9);transferStations++}
 }
 // Two working pile-supported finger piers on the west shore break the
 // rectangular silhouette. Their deck connects directly to the main quay.
 let westernPiers=0;
 for(const [z,w] of [[-610,52],[-250,38]]){
  const x=-1260,L=160;
  if(!clearFootprint(x,z,L,w,7))continue;
  box(m.concrete,x,4.34,z,L,1.4,w);
  box(m.road,x,5.07,z,L-2,.08,w-2);
  pavedSlabs.push([x,z,L,w]);
  for(let xx=-1334;xx<=-1186;xx+=18)for(const zz of [z-w*.37,z,z+w*.37]){
   cylinder(m.concrete,xx,1.0,zz,1.55,7.4);
   box(m.steel,xx,3.46,zz,4,.25,4);
  }
  for(const zz of [z-w/2,z+w/2]){
   box(m.concrete,x,4.5,zz,L,.9,1.1);
   for(let xx=-1330;xx<-1180;xx+=18){
    box(m.rubber,xx,2.6,zz,.8,3.4,.8);
    if(xx%36<0)place('bollard',xx,5.15,zz+(zz<z?1.9:-1.9));
   }
   box(m.yellow,x,5.15,zz+(zz<z?2:-2),L-8,.024,.16);
  }
  // Protected pier head and shore power station.
  box(m.concrete,-1340,4.4,z,1.8,1.05,w);
  rail(-1338,5.3,z,w-3,'z');
  place('hydraulic-power-unit',-1318,5.15,z-5);
  place('welding-skid',-1309,5.15,z+6,Math.PI/2);
  lamp(-1325,5.12,z+8);westernPiers++;
 }
 // Workboat berths beside, not inside, the new piers.
 place('merchant-vessel',-1271,0,-550,0,.72);
 place('workboat',-1265,0,-205,Math.PI,.8);
 for(const [x,z,zz] of [[-1271,-550,-584],[-1265,-205,-231]])for(const dx of [-35,35]){
  beam(m.dark,[x+dx,7,z],[x+dx*1.12,5.45,zz],.10,.10,true);
  place('bollard',x+dx*1.12,5.15,zz);
 }
 // Real shipyard block fabrication: raised adjustable pins, curved shell panels,
 // welded longitudinal sections and transport cradles. Templates remain GLB-exportable.
 define('curved-panel-jig',()=>{
  const L=30,W=14;
  for(const x of [-12,-6,0,6,12])for(const z of [-5,0,5]){
   const y=1.3+z*z*.047;box(m.concrete,x,.3,z,2,.6,2);box(m.steel,x,y/2+.3,z,.32,y,.32);box(m.orange,x,y+.32,z,.9,.18,.9)
  }
  for(const z of [-5,0,5])beam(m.dark,[-15,.9,z],[15,.9,z],.5);
  for(let z=-7;z<7;z+=1){const y1=1.65+z*z*.047,y2=1.65+(z+1)*(z+1)*.047;
   part(boxGeo,m.rust,0,(y1+y2)/2,z+.5,L,.18,Math.hypot(1,y2-y1),new T.Quaternion().setFromAxisAngle(V(1,0,0),-Math.atan2(y2-y1,1)));
   if(z%2===0)beam(m.steel,[-15,y1+.3,z],[15,y1+.3,z],.18,.44)
  }
  for(const x of [-12,0,12])for(let z=-7;z<7;z+=1)beam(m.steel,[x,1.9+z*z*.047,z],[x,1.9+(z+1)*(z+1)*.047,z+1],.32);
 });
 define('block-transport-cradle',()=>{
  for(const z of [-3,3]){box(m.dark,0,.65,z,18,1.3,1.4);for(const x of [-7,0,7])box(m.concrete,x,.25,z,2.5,.5,2)}
  for(const x of [-7,-3,3,7]){box(m.steel,x,1.7,0,.65,.9,8);for(const z of [-3,3]){beam(m.orange,[x,2,z],[x,5,z*.65],.65);beam(m.steel,[x,2,z],[x,4,0],.4)}}
  box(m.rust,0,4,0,17,.32,5);for(const z of [-2,-1,0,1,2])beam(m.steel,[-8.5,4.4,z],[8.5,4.4,z],.2,.55);
  for(const x of [-6,0,6])box(m.rust,x,5.6,0,.3,3.1,5.1);
 });
 let fabricationJigs=0;
 for(const z of [1035,1125,420,705,825])for(let x=-1085;x<=150;x+=43){
  if(fabricationJigs>=18)break;
  const name=fabricationJigs%2?'block-transport-cradle':'curved-panel-jig',angle=(fabricationJigs%3)*Math.PI/2;
  if(siteAvailable(name,x,z,angle,.9)){place(name,x,5.25,z,angle,.9);fabricationJigs++}
 }
 // Dense gantry-side block assembly stations. The gantry rails and protected
 // flight line remain clear; buildings must fit on a single real concrete slab.
 define('gantry-service-hall',()=>{
  const W=36,D=54,H=27;
  box(m.concrete,0,.28,0,W,.56,D);
  for(const x of [-17,17])for(const z of [-26,-13,0,13,26]){
   box(m.steel,x,H/2,z,.72,H,.72);box(m.concrete,x,.52,z,1.8,1.04,1.8);
   beam(m.steel,[x,2,z],[x,10,z+((z===26)?-4:4)],.28)
  }
  for(const x of [-17,17]){box(cladding,x,18,0,.4,17,54);box(m.steel,x,26.8,0,.65,1,54);
   for(let z=-24;z<=24;z+=6)box(m.glass,x*1.015,23,z,.12,3.8,4.5);
   box(m.orange,x*.92,13.7,0,.65,1.2,52);
   for(let z=-24;z<=24;z+=12)beam(m.steel,[x,11,z],[x*.92,13.7,z],.3);
  }
  for(const z of [-26,-13,0,13,26]){
   beam(m.steel,[-17,27,z],[0,31,z],.48);beam(m.steel,[0,31,z],[17,27,z],.48);beam(m.steel,[-17,27,z],[17,27,z],.42);
   for(const x of [-11,0,11])beam(m.steel,[x,27,z],[x,31-Math.abs(x)*4/17,z],.20);
  }
  for(const side of [-1,1])part(boxGeo,roofMetal,side*9,29,0,Math.hypot(18,4)+.4,.36,55,new T.Quaternion().setFromAxisAngle(V(0,0,1),-side*Math.atan2(4,18)));
  box(m.orange,0,14.4,-7,32,1.5,1.3);box(m.dark,5,13.4,-7,3,.75,2.2);
  for(const x of [4.65,5.35])beam(m.dark,[x,13,-7],[x,5.5,-7],.075,.075,true);box(m.yellow,5,5.3,-7,2.1,.45,1.15);
  for(const x of [-11,11])for(const z of [-18,0,18]){
   box(m.dark,x,.7,z,4.8,1.4,9);box(m.steel,x,1.5,z,5,.20,9);
   for(let y=0;y<5;y++)box(m.rust,x,1.65+y*.21,z,4.5,.17,8.7);
   box(m.light,x,25,z,1.8,.24,.55);
  }
 });
 define('winch-service-skid',()=>{
  box(m.dark,0,.28,0,9,.56,5);for(const x of [-3,3])box(m.steel,x,.8,0,.75,1,4.5);
  for(const x of [-2.4,2.4]){box(m.steel,x,1.75,0,.55,2.5,3.3);beam(m.dark,[x-1.0,.6,-1.7],[x,2.4,-1.7],.27)}
  const rot=new T.Quaternion().setFromAxisAngle(V(0,0,1),Math.PI/2);
  part(cylGeo,m.steel,0,2.35,0,1.25,4.4,1.25,rot);
  for(const x of [-2.15,2.15])part(cylGeo,m.dark,x,2.35,0,1.68,.24,1.68,rot);
  for(let x=-1.95;x<2;x+=.16)part(cylGeo,m.wire,x,2.35,0,1.32,.075,1.32,rot);
  beam(m.steel,[-3.1,2.35,0],[3.4,2.35,0],.32,.32,true);box(m.blue,3.35,2.35,0,1.9,1.6,1.7);
  box(m.orange,3.35,3.25,0,1.95,.16,1.75);
  // Motor cooling fins and coupling guard are seated on the housing.
  for(let x=2.65;x<4.12;x+=.18)box(m.blue,x,2.37,0,.10,1.73,1.84);
  box(m.steel,2.42,2.35,0,.26,1.32,1.32);box(m.dark,2.17,2.35,0,.28,1.08,1.08);
  box(m.steel,-3.4,1.2,1.7,1.25,1.6,1.25);
  box(m.glass,-3.4,1.7,2.36,.75,.38,.09);
  beam(m.wire,[0,3.67,0],[0,3.2,2.2],.075,.075,true);
  beam(m.wire,[0,3.2,2.2],[0,.55,2.2],.075,.075,true);
 });
 function craneSite(name,x,z,scale=1){
  const b=placementBounds.get(name).clone().applyMatrix4(new T.Matrix4().makeScale(scale,scale,scale)).translate(V(x,5.25,z));
  const c=b.getCenter(V(0,0,0)),v=b.getSize(V(0,0,0));
  const supported=pavedSlabs.some(([sx,sz,w,d])=>b.min.x>=sx-w/2+3&&b.max.x<=sx+w/2-3&&b.min.z>=sz-d/2+3&&b.max.z<=sz+d/2-3);
  if(!supported||!openGround(c.x,c.z,v.x+3,v.z+3)||!clearFootprint(c.x,c.z,v.x+6,v.z+6,b.max.y))return false;
  if([788,912].some(rx=>b.min.x<rx+8&&b.max.x>rx-8&&b.min.z<200&&b.max.z>-300))return false;
  return !placedSites.some(a=>b.min.x<a.max.x+2&&b.max.x>a.min.x-2&&b.min.z<a.max.z+2&&b.max.z>a.min.z-2&&b.min.y<a.max.y+.3&&b.max.y>a.min.y-.3);
 }
 let craneServiceSites=0,winchSites=0;
 for(const z of [190,130,70,10,-50,-110,-170,-230,-290])for(const x of [548,600,698,742,964,1016,1070,1130]){
  if(craneServiceSites>=10)break;
  // Keep the Goliath foreground inspection apron open instead of blocking the crane's base.
  if(x>=964&&z>=90)continue;
  if(craneSite('gantry-service-hall',x,z,.82)){place('gantry-service-hall',x,5.25,z,0,.82);craneServiceSites++;
   for(const dx of [-11,11])for(const dz of [-18,18]){fixturePositions.push([x+dx*.82,5.25+24.75*.82,z+dz*.82]);pool(x+dx*.82,5.34,z+dz*.82,15)}
  }
 }
 for(const z of [210,150,90,30,-30,-90,-150,-210,-270])for(const x of [575,675,730,965,1035,1125]){
  if(winchSites>=18)break;
  if(craneSite('winch-service-skid',x,z)){place('winch-service-skid',x,5.25,z);winchSites++}
 }
 // Physically mounted inside-hull work lamps, in actual world coordinates
 // matching the shell's local catwalk profile. No freestanding light geometry.
 let hullWorkLights=0;
 for(let lx=-138;lx<=138;lx+=16)for(const side of [-1,1]){
  const u=Math.max(0,(Math.abs(lx)-124)/51),w=32*(1-.58*u*u)*(.91+(.97-.91)/6),z=-920+side*(w-3.4);
  const x=750+lx;
  // Register the existing hull template's lens, not a second floating fixture.
  fixturePositions.push([x,24.75,z+side]);pool(x,21.18,z,4);hullWorkLights++;
 }
 // Container-lane work lighting, attached to freestanding steel poles on
 // existing clear pavement. Avoid obstructing the protected racing corridor.
 let laneLightCount=0;
 for(const z of [590,690,790,890,990,1090])for(const x of [370,470,570,670,770,870,970,1070]){
  if(laneLightCount>=24)break;
  if(!openGround(x+1,z,7,5)||!clearFootprint(x+1,z,7,5,18))continue;
  if(placedSites.some(b=>x+4>b.min.x&&x-2<b.max.x&&z+3>b.min.z&&z-3<b.max.z))continue;
  if(fixturePositions.some(p=>Math.hypot(p[0]-x,p[2]-z)<28))continue;
  lamp(x,5.22,z);laneLightCount++;
 }
 const worldBatches=[];// Connect the process equipment to supported ground-level headers. These
// are below the visual racing corridor and leave the gate coordinates intact.
for(const z of [500,675])for(const [xa,xb] of [[-1050,-990],[-560,-490]]){
 const zz=z+19.2,y=6.5;
 beam(m.rust,[xa,y,zz],[xb,y,zz],.52,.52,true);
 for(let x=xa;x<=xb;x+=10){box(m.concrete,x,5.42,zz,1.5,.65,1.5);box(m.steel,x,5.95,zz,.45,.8,.45);beam(m.steel,[x-.15,y,zz],[x+.15,y,zz],.65,.65,true)}
 for(const x of [xa,xb])beam(m.rust,[x,y,z+17.5],[x,y,zz],.48,.48,true);
 const x=(xa+xb)/2;place('hydraulic-power-unit',x,5.25,zz+5);place('process-manifold',x,5.25,zz+13);
}
// Low industrial equipment and loading bays in the inter-building spaces.
 for(const {x,z,kind} of districtPlan){for(const dx of [-22,22]){
  const xx=x+dx,zz=z+66;if(clearFootprint(xx,zz,12,9,13)){place('fabrication-rack',xx,5.25,zz);place('welding-skid',xx+8,5.25,zz+4);place('pallet-load',xx-8,5.25,zz-4)}
 }if(clearFootprint(x,z+67,5,5,19))lamp(x,5.2,z+67)}
 // Distant port skyline on the actual far shoreline, outside the racing boundary.
 // Low silhouettes are intentionally cheaper than detailed playable architecture.
 // Far-shore buildings form irregular waterfront clusters, seated on terrain.
 // Baked silhouette materials avoid overexposed white blocks in the HDR light.
 const horizonMat=new T.MeshBasicMaterial({color:0x17252e,toneMapped:false}),horizonRoof=new T.MeshBasicMaterial({color:0x111e27,toneMapped:false}),horizonWindows=new T.MeshBasicMaterial({color:0x51443b,toneMapped:false});
 for(let i=0;i<48;i++){
  const x=-3600+i*148+24*Math.sin(i*2.7),z=shoreline(x)-110-85*Math.abs(Math.sin(i*.73)),ground=coastalHeight(x,z);
  const w=45+45*Math.abs(Math.sin(i*1.38)),d=36+35*Math.abs(Math.cos(i*.95)),h=14+38*Math.abs(Math.sin(i*1.83));
  if(i%7===0)continue;box(horizonMat,x,ground+h/2-4,z,w,h+8,d);
  box(horizonRoof,x,ground+h+.4,z,w+1,1,d+1);
  if(i%3===0){box(horizonMat,x+w*.25,ground+h+9,z,9,18,10);box(horizonRoof,x+w*.25,ground+h+18,z,10,1,11)}
  for(let dx=-w*.38;dx<w*.4;dx+=14)if((Math.floor(dx/14)+i)%3===0)box(horizonWindows,x+dx,ground+h*.62,z+d/2+.15,4.5,1.6,.25);
 }
 // Distinct far-shore industrial profiles rather than a regular city-block row.
 for(const cx of [-2460,-1180,1180,2540]){const z=shoreline(cx)-80,y=coastalHeight(cx,z);for(let dx=-50;dx<=50;dx+=50){const x=cx+dx,yy=coastalHeight(x,z);cylinder(horizonMat,x,yy+13,z,17,28);part(sphereGeo,horizonRoof,x,yy+27,z,17,2,17)}
  for(const dx of [-75,75]){const x=cx+dx,yy=coastalHeight(x,z-60);beam(horizonRoof,[x,yy,z-60],[x,yy+72,z-60],2.8,2.8,true);beam(horizonMat,[x,yy+67,z-60],[x,yy+67,z-5],1.2)}
 }
 // Short dock-side industrial service piers, connected to existing perimeter slab.
 for(const x of [-1160,1180])for(const z of [220,510,870]){
  const side=Math.sign(x),xx=x+side*13;box(m.concrete,xx,1.65,z,26,6.7,46);box(m.road,xx,5.06,z,24,.08,44);
  for(const dz of [-17,17]){place('bollard',xx,5.2,z+dz);box(m.dark,xx+side*12,2.2,z+dz,.9,4,3)}
 }
 // Port service lanes: painted edge lines, drainage grates, cable covers,
 // and grounded, directional floodlight structures instead of isolated light blobs.
 const drainMat=new T.MeshStandardMaterial({color:0x303639,metalness:.55,roughness:.72});
 define('dock-floodlight',()=>{
  box(m.concrete,0,.40,0,2.8,.8,2.8);box(m.dark,0,.96,0,1.7,.32,1.7);
  beam(m.steel,[0,1,0],[0,19,0],.42,.42,true);
  for(const x of [-.56,.56])beam(m.steel,[x,1.2,0],[x*.5,4.1,0],.15);
  box(m.steel,0,18.9,0,4.5,.28,.7);
  for(const x of [-1.55,0,1.55]){
   box(m.dark,x,18.8,.30,1.25,.78,.65);
   box(warmGlow,x,18.64,.67,1.06,.46,.10);
   beam(m.steel,[x-.5,18.4,.1],[x+.5,18.4,.1],.12);
  }
  box(m.dark,0,1.7,.36,.65,1.2,.28);
 });
 for(const [x,z] of [[-1010,1128],[-730,1128],[-430,1128],[-100,1128],[420,1146],[720,1146],[1105,1146],[640,-235],[1095,-235],[-1100,380],[-1095,810],[-690,850]]){
  if(!clearFootprint(x,z,5,5,25))continue;
  place('dock-floodlight',x,5.2,z);
  fixturePositions.push([x,23.6,z+.72]);pool(x,5.38,z+6,18);
 }
 // Thin drain channels are positioned beside the launch roadway, not over
 // the inspection route. Vary surface marks by location and keep them flat.
 for(const z of [1045,1118])for(let x=-1140;x<1135;x+=25){
  box(drainMat,x,5.29,z,19,.055,.56);
  for(let dx=-8;dx<=8;dx+=2)box(m.steel,x+dx,5.325,z,.10,.025,.48);
  if(x%100===-40){box(m.yellow,x,5.32,z+2.2,10,.025,.17)}
 }
 for(const z of [1010,1150])for(let x=-1130;x<=1130;x+=36){
  if(clearFootprint(x,z,5,3,6.3)){box(m.dark,x,5.31,z,4,.16,1.4);box(m.yellow,x,5.42,z,3.6,.025,.25)}
 }
 // STAGE 3: production-specific buildings, not interchangeable rectangular sheds.
 // Each kit uses existing packed PBR materials and shared geometry helpers.
 define('stage3-boiler-house',()=>{
  const W=46,D=56,H=24;
  box(m.concrete,0,.35,0,W,.7,D);
  box(cladding,0,12,0,W-2,23,D-2);
  box(m.rust,0,2.3,0,W-1,3,D-1);
  box(roofMetal,0,24,0,W,.55,D);
  for(const x of [-22,22])for(const z of [-24,-12,0,12,24]){
   box(m.steel,x,12,z,.6,24,.75);
   box(m.concrete,x,.6,z,1.6,1.2,1.6);
   box(m.glass,x*1.006,19,z,.12,3.6,7.2);
   box(m.steel,x*1.012,19,z,.16,.16,7.3);
  }
  for(const x of [-14,0,14]){
   box(m.dark,x,5,-27.15,9,8,.28);
   box(m.steel,x,8.9,-27.38,9.4,.42,.45);
   for(let y=2;y<9;y+=.7)box(m.steel,x,y,-27.35,8.7,.13,.12);
   box(m.orange,x-4.7,1.25,-27.6,.24,2.5,.24);
  }
  for(const x of [-12,12]){
   cylinder(m.rust,x,31,10,2.2,14);
   cylinder(m.dark,x,38,10,2.45,.6);
   for(const y of [26,32,37])cylinder(m.steel,x,y,10,2.35,.34);
   box(m.steel,x,24.6,10,5.5,1.2,5.5);
   for(const z of [7.5,12.5])beam(m.steel,[x-3,24.6,z],[x+3,28,z],.38);
  }
  for(const x of [-15,0,15]){
   box(m.dark,x,25.3,-13,8,2.6,5.5);
   box(m.steel,x,26.8,-13,8.4,.4,5.9);
   for(let z=-15;z<=-11;z+=.6)box(m.steel,x,25.4,z,8.1,.14,.1);
  }
  for(const x of [-17,17]){box(m.light,x,10,-27.7,1.8,.55,.75);beam(m.steel,[x,10.4,-27.5],[x,11,-26.9],.18)}
 });
 define('stage3-outfitting-annex',()=>{
  // Stepped roof heights, side clerestory and a recessed transfer/loading bay.
  box(m.concrete,0,.3,0,64,.6,38);
  box(cladding,-9,10,0,44,19,36);
  box(m.white,22,6.5,0,18,12,36);
  box(roofMetal,-9,19.7,0,45,.5,37);
  box(roofMetal,22,12.8,0,19,.5,37);
  for(const z of [-18,18]){
   for(const x of [-29,-21,-13,-5,3,11,16,24,30]){
    box(m.steel,x,x<=11?10:6.3,z,.42,x<=11?19:12,.46);
    if(x<=11){box(m.glass,x+1.6,16.3,z*1.01,4.8,3.1,.12);box(m.steel,x+1.6,16.3,z*1.017,.12,3.1,.15)}
   }
   for(const x of [19,26]){box(m.glass,x,8.2,z*1.01,4.6,2.8,.15);box(m.steel,x,8.2,z*1.017,.14,2.9,.15)}
  }
  for(const x of [-24,-10,4]){
   box(m.dark,x,5,-18.25,9,8.5,.28);
   for(let y=1.2;y<=9;y+=.55)box(m.steel,x,y,-18.45,8.8,.12,.12);
   box(m.orange,x,9.5,-18.55,9.5,.32,.5);
   for(const dx of [-4.6,4.6])box(m.yellow,x+dx,1.25,-18.8,.23,2.5,.23);
   box(m.light,x,11,-18.5,1.6,.4,.6);
  }
  box(m.steel,22,12.4,0,17,.35,4);rail(22,13.55,1.8,17);
  for(const z of [-12,0,12]){
   box(m.dark,26,13.4,z,5.6,1.5,4);
   for(let dx=-2;dx<=2;dx+=.5)box(m.steel,26+dx,14.2,z,.15,.16,3.8);
  }
 });
 define('stage3-electrical-substation',()=>{
  // Transformer bay: connected bushings, cable bus, cooling fins and plinth.
  box(m.concrete,0,.3,0,23,.6,16);
  for(const x of [-6,6]){
   box(m.dark,x,.85,0,8,.5,8);
   box(m.blue,x,2.7,0,6.8,3.4,5.4);
   for(const z of [-3,3])for(let dx=-2.9;dx<=2.9;dx+=.5)box(m.steel,x+dx,2.8,z,.17,2.9,.72);
   box(m.steel,x,4.45,0,7.1,.3,5.8);
   for(const dx of [-2,0,2]){
    cylinder(m.dark,x+dx,5.2,0,.27,1.4);
    for(let y=4.7;y<5.8;y+=.22)cylinder(m.white,x+dx,y,0,.44,.12);
    cylinder(m.steel,x+dx,5.98,0,.19,.18);
    beam(m.wire,[x+dx,6.05,0],[x+dx,7.3,3.6],.12,.12,true);
   }
  }
  for(const x of [-10,0,10])for(const z of [4,7])beam(m.steel,[x,.6,z],[x,7.8,z],.23);
  for(const z of [4,7])beam(m.steel,[-10,7.8,z],[10,7.8,z],.28);
  for(const x of [-8,0,8])box(m.dark,x,1.7,-6,2.4,2.2,1.0);
 });

 // REFERENCE STAGES 1–2: replace the previous rectangular placement set,
 // keeping its authored GLB templates and material library. The new civil
 // geography and ordered gates come from one canonical JSON source.
 batches.clear();placedSites.length=0;containerSlots.length=0;stackIndex.clear();containerChunks.clear();
 fixturePositions.length=0;pavedSlabs.length=0;districtPlan.length=0;
 yardLightCtx.fillStyle='#000';yardLightCtx.fillRect(0,0,2048,2048);bakedLightPools=0;
 part(coastGeo,coastMat,0,0,0,1,1,1);
 const referenceSolids=[],referenceHeroes=[],referenceCivil=[],referenceDistricts=new Set();let shoreMeters=0,referenceShips=0,referenceOffshore=0,referenceBridge=0;
 const land=layout.land,dock=layout.dryDock;
 function onLand(x,z){return land.some(([a,b,c,d])=>x>=a&&x<=b&&z>=c&&z<=d)}
 function supported(b){return land.some(([a,c,d,e])=>b.min.x>=a+1&&b.max.x<=c-1&&b.min.z>=d+1&&b.max.z<=e-1)}
 const segments=routePoints.map((a,i)=>[a,routePoints[(i+1)%routePoints.length]]);
 for(const alt of layout.alternates){const path=[routePoints[alt.from],...alt.via,routePoints[alt.to]];for(let i=1;i<path.length;i++)segments.push([path[i-1],path[i]])}
 // Conservative swept-segment vs expanded AABB; solid assets cannot intrude.
 function intersectsSegment(b,a,c,margin=9){let lo=0,hi=1;for(let k=0;k<3;k++){const axis=['x','y','z'][k],d=c[k]-a[k],mn=b.min[axis]-margin,mx=b.max[axis]+margin;if(Math.abs(d)<1e-8){if(a[k]<mn||a[k]>mx)return false;continue}let u=(mn-a[k])/d,v=(mx-a[k])/d;if(u>v)[u,v]=[v,u];lo=Math.max(lo,u);hi=Math.min(hi,v);if(lo>hi)return false}return true}
 function footprint(name,x,y,z,angle=0,scale=1){const o=new T.Object3D();o.position.set(x,y,z);o.rotation.y=angle;o.scale.setScalar(scale);o.updateMatrix();return placementBounds.get(name).clone().applyMatrix4(o.matrix)}
 function routeClear(b){return !segments.some(([a,c])=>intersectsSegment(b,a,c))}
 function hero(name,x,y,z,angle=0,scale=1){place(name,x,y,z,angle,scale);referenceHeroes.push({name,x,y,z,angle,scale,bounds:footprint(name,x,y,z,angle,scale)})}
 function civilBox(mat,x,y,z,w,h,d){box(mat,x,y,z,w,h,d);referenceCivil.push(new T.Box3(V(x-w/2,y-h/2,z-d/2),V(x+w/2,y+h/2,z+d/2)))}
 function safe(name,x,z,angle=0,scale=1,district='yard'){
  if(!templates[name])throw Error('missing reference asset '+name);
  const b=footprint(name,x,5.25,z,angle,scale);
  if(!supported(b)||!routeClear(b)||placedSites.some(p=>p.intersectsBox(b))||containerSlots.some(q=>b.min.x<q.x+q.hx&&b.max.x>q.x-q.hx&&b.min.z<q.z+q.hz&&b.max.z>q.z-q.hz))return false;
  place(name,x,5.25,z,angle,scale);referenceSolids.push(b);referenceDistricts.add(district);return true
 }
 // Separate working peninsulas and true, navigable central water basins.
 for(const [a,b,c,d] of land){
  slab((a+b)/2,(c+d)/2,b-a,d-c);
  // Surface expansion joints, drainage channels and broken painted markings.
  for(let x=a+18;x<b-8;x+=24)box(tar,x,5.095,(c+d)/2,.07,.015,d-c-8);
  for(let z=c+18;z<d-8;z+=24)box(tar,(a+b)/2,5.095,z,b-a-8,.015,.07);
  for(const [edge,sign,axis,lo,hi] of [[a,-1,'x',c,d],[b,1,'x',c,d],[c,-1,'z',a,b],[d,1,'z',a,b]]){
   for(let p=lo+10;p<hi-4;p+=20){const x=axis==='x'?edge:p,z=axis==='z'?edge:p;if(onLand(x+(axis==='x'?sign*3:0),z+(axis==='z'?sign*3:0)))continue;
    const dryEdge=x>=dock.minX-1&&x<=dock.maxX+1&&z>=dock.minZ-1&&z<=dock.maxZ+1;if(dryEdge)continue;
    box(m.dark,x,1.6,z,axis==='x'?.28:19.8,2.0,axis==='z'?.28:19.8);
    box(m.concrete,x,5.15,z,axis==='x'?.8:19.8,.35,axis==='z'?.8:19.8);
    box(m.yellow,x-sign*(axis==='x'?1.5:0),5.36,z-sign*(axis==='z'?1.5:0),axis==='x'?.14:19.6,.035,axis==='z'?.14:19.6);
    if(Math.round(p/20)%3===0)place('bollard',x-sign*(axis==='x'?3:0),5.25,z-sign*(axis==='z'?3:0));
    shoreMeters+=20;
   }
  }
 }
 // Central graving dock: genuinely excavated to -20 m, not a painted recess.
 civilBox(m.concrete,850,-22,-180,320,4,600);
 for(const x of [695,1005]){civilBox(m.concrete,x,-7.5,-180,10,25,600);rail(x,6.1,-180,600,'z');for(let z=-460;z<115;z+=22){
  box(m.dark,x+(x<850?5.1:-5.1),-8,z,.28,20,1.2);
  box(m.steel,x+(x<850?7:-7),-8,z,3.8,.5,16);
  rail(x+(x<850?8.5:-8.5),-6.8,z,16,'z');
  box(warmGlow,x+(x<850?5.4:-5.4),-4,z,.25,.5,1.3);fixturePositions.push([x+(x<850?6:-6),-4,z]);
 }}
 for(const z of [-475,115])civilBox(m.concrete,850,-7.5,z,310,25,10);
 for(const x of [810,890])for(let z=-455;z<100;z+=18)box(m.dark,x,-19.88,z,1.1,.15,17.8);
 // The open hull axis coincides with the low-level Dry Dock racing corridor.
 hero('ship-hull',850,-19,-120,Math.PI/2);referenceShips++;
 for(let z=-277;z<=37;z+=13)for(const x of [840,860])place('drydock-keel-block',x,-20,z,0,.7);
 for(let z=-260;z<=20;z+=24)for(const side of [-1,1]){fixturePositions.push([850+side*20,1.2,z]);pool(850+side*20,-2.5,z,4)}
 // The center pier is a ship assembly/outfitting spine, with two long berths.
 for(const [x,z,a,scale] of [[245,-150,Math.PI/2,1.55],[-250,-260,Math.PI/2,1.25],[275,230,Math.PI/2,.92],[-380,600,0,.86],[-1252,870,Math.PI/2,1.25],[-1305,160,Math.PI/2,.95]]){
  place('merchant-vessel',x,0,z,a,scale);referenceShips++;
 }
 for(const [x,z] of [[-500,440],[400,-420],[455,555],[370,720]]){place('workboat',x,0,z,Math.PI/2,.65);referenceShips++}
 // Start waterfront: quay road with tightly clustered logistics equipment.
 for(const x of [-1130,-975,-820,-580,-390,-180])for(const z of [780,980]){
  if(safe('outfit-workshop',x,z,Math.PI/2,.82,'launch'))lamp(x+36,5.25,z+38);
 }
 // Stacks in longitudinal blocks, preserving actual road corridors and altitude.
 let referenceCargo=0;
 for(const [cx,cz] of [[-1130,420],[-850,400],[-1120,100],[-790,100],[-1140,-190],[-790,-200],[-1000,640],[-430,925]]){
  for(let a=-60;a<=60;a+=15)for(let b=-50;b<=50;b+=10){
   const x=cx+a,z=cz+b,tiers=3+Math.floor(rnd()*4),bb=new T.Box3(V(x-6.2,5,z-1.3),V(x+6.2,5+tiers*2.94,z+1.3));
   if(!supported(bb)||!routeClear(bb)||placedSites.some(p=>p.intersectsBox(bb)))continue;
   const col=['rust','blue','green','white'][Math.floor(rnd()*4)];
   for(let j=0;j<tiers;j++)place('container-'+col,x,5.25+j*2.94,z);
   referenceSolids.push(bb);referenceCargo++;
  }
 }
 referenceDistricts.add('container');
 for(const [x,z] of [[-1110,545],[-850,240],[-800,-70],[-1160,-350]])safe('rtg-crane',x,z,0,.72,'container');
 // Crane ascent: hero gantry and supporting shops sit on the western quay.
 hero('heavy-gantry-detail',-900,5.25,-575);referenceDistricts.add('crane');
 for(const rx of [-962,-838])for(const dx of [-3.8,3.8])box(m.steel,rx+dx,5.62,-575,.55,.72,118);
 for(const [x,z] of [[-1170,-850],[-750,-950],[-1150,-440],[-750,-390]])safe('gantry-service-hall',x,z,0,.8,'crane');
 for(const [x,z] of [[-1130,-780],[-730,-730],[-1100,-1030],[-740,-540]])safe('winch-service-skid',x,z,0,1,'crane');
 // Sky bridge is a deliberately stylized high-level race landmark, constructed
 // with supported steel towers, X bracing and an open upper transfer deck.
 define('reference-sky-bridge',()=>{
  const W=360,H=207;
  for(const x of [-150,150])for(const z of [-12,12]){
   box(m.concrete,x,1.5,z,12,3,12);beam(m.steel,[x,3,z],[x,H,z],2.8,3.4);
   for(let y=12;y<H-10;y+=18)beam(m.orange,[x,y,z],[x,y+18,-z],.75);
  }
  for(const z of [-9,9]){
   beam(m.orange,[-180,H,z],[180,H,z],2.4,3.4);
   beam(m.steel,[-180,H-10,z],[180,H-10,z],1.8,2.1);
   for(let x=-180;x<180;x+=18){beam(m.steel,[x,H-10,z],[x+18,H,z],.8);beam(m.orange,[x,H,z],[x+18,H-10,z],.6)}
  }
  box(roofMetal,0,H+.4,0,W,.8,39);rail(0,H+1.7,-19,W);rail(0,H+1.7,19,W);
  // Open rectangular flight passage above the service deck, with actual
  // transfer-frame connections. 40 m clear width, 43 m clear height.
  for(const z of [-22,22]){
   for(const x of [-168,-112,-56,0,56,112,168]){
    beam(m.steel,[x,H,z],[x,H+44,z],1.3,1.6);
    beam(m.steel,[x,H,z],[x,H-7,z*.41],.75);
   }
   beam(m.orange,[-180,H+44,z],[180,H+44,z],1.9,2.1);
   beam(m.steel,[-180,H+30,z],[180,H+30,z],.75);
   for(let x=-168;x<168;x+=28)beam(m.orange,[x,H+30,z],[x+28,H+44,z],.55);
  }
  for(const x of [-168,-112,-56,0,56,112,168]){
   beam(m.steel,[x,H+44,-22],[x,H+44,22],1.4,1.7);
   for(const z of [-18,18]){box(m.light,x,H+41,z,1.25,.25,.7);beam(m.steel,[x,H+41,z],[x,H+44,z],.19)}
  }
  for(let x=-160;x<=160;x+=40){box(m.light,x,H-9,0,2.5,.6,2);box(m.steel,x,H-8.5,0,3,.4,2.4)}
 });
 hero('reference-sky-bridge',-270,5.25,-1070);referenceBridge=1;referenceDistricts.add('sky');
 // North and central production quarters follow material receiving -> plate
 // preparation -> coating -> outfitting, facing the central deep-water quays.
 const shopKinds=['plate-processing-hall','coating-shop','outfit-workshop','cargo-shed'];
 for(const [x,z] of [[-570,-880],[-390,-830],[-180,-830],[45,-850],[250,-850],[450,-1050],[650,-900],[1040,-1000],[1040,-780],[-90,-500],[80,-330],[-90,-100],[75,100],[-90,330],[110,420]]){
  const kind=shopKinds[districtPlan.length%shopKinds.length];if(safe(kind,x,z,0,1.08,'fabrication')){districtPlan.push({x,z,kind});lamp(x+36,5.25,z+50)}
 }
 for(const [x,z] of [[-550,-1150],[170,-1150],[380,-740],[740,-730],[1120,-560]])safe('lattice-boom-crane',x,z,0,.8,'fabrication');
 // East-side foundry and pipe grid, using aligned service corridors.
 // Traversable open-ended foundry. Centerline passes above the overhead
 // lifting trolley and below the roof structure; actual mesh rays verify it.
 hero('warehouse',1080,5.25,340,0,1.10);referenceDistricts.add('foundry');
 for(const [x,z] of [[740,300],[730,500],[1140,665]]){if(safe('warehouse',x,z,0,.84,'foundry'))lamp(x,5.25,z+48)}
 for(const x of [1040,1120])for(let z=270;z<=410;z+=22){
  fixturePositions.push([x,56.5,z]);pool(x,5.36,z,20);
 }
 for(const [x,z] of [[740,640],[1160,760],[790,870],[1070,1000]])safe('pipe-rack',x,z,Math.PI/2,.85,'pipes');
 for(const [x,z] of [[725,730],[760,775],[1190,840],[1110,870],[900,930],[1130,590]])safe('tank',x,z,0,.72,'pipes');
 for(const [x,z] of [[1100,280],[1150,380],[780,570],[770,800],[1050,850]])safe('process-manifold',x,z,0,1,'pipes');
 // Offshore platform on piles in open water, not a concrete island.
 define('reference-offshore-platform',()=>{
  // Fixed jacket structure with two service levels and topside machinery.
  // Local bounds stay within the original deck width and height envelope.
  for(const x of [-24,24])for(const z of [-19,19]){
   cylinder(m.steel,x,5,z,2.3,22);
   for(const y of [1,9,15])cylinder(m.rust,x,y,z,2.48,.65);
   beam(m.orange,[x,-3,z],[x,15,-z],.75);
   beam(m.steel,[x,-3,z],[-x,15,z],.75);
  }
  for(const y of [5,14]){for(const x of [-24,24])beam(m.steel,[x,y,-19],[x,y,19],.62);for(const z of [-19,19])beam(m.steel,[-24,y,z],[24,y,z],.62)}
  box(m.steel,0,16,0,58,2.0,48);box(m.dark,0,17.2,0,56,.45,46);
  for(const z of [-22,22]){rail(0,18.5,z,56);box(m.rust,0,15.8,z,58,1.2,.55)}
  for(const x of [-28,28]){rail(x,18.5,0,44,'z');box(m.rust,x,15.8,0,.55,1.2,46)}
  // Underdeck access walkways and structural supports.
  for(const side of [-1,1]){
   const x=side*23;
   box(m.steel,x,10.5,0,4,.35,39);rail(x-side*1.8,11.65,0,38,'z');
   for(const z of [-16,0,16])beam(m.steel,[x-side*1.9,10.3,z],[x,7,z],.35);
   for(const z of [-15,15]){
    const y0=10.7,y1=17.45;
    for(const dx of [-.85,.85])beam(m.steel,[x+dx,y0,z],[x+dx,y1,z-6],.19);
    for(let k=1;k<=30;k++)box(m.steel,x,y0+(y1-y0)*k/30,z-6*k/30,1.7,.12,.23);
   }
  }
  for(const x of [-16,16]){
   box(m.blue,x,22,-8,13,9,15);box(m.steel,x,26.7,-8,14,.5,16);box(m.glass,x,23,.05,10,2.2,.12);
   for(const dx of [-4,0,4])box(m.steel,x+dx,23,.13,.14,2.3,.14);
   box(m.dark,x,18.2,-8,13.2,.7,15.2);
   box(m.dark,x,27.75,-10,5,1.6,4);
   for(let dx=-2;dx<=2;dx+=.5)box(m.steel,x+dx,28.6,-10,.13,.12,3.8);
   for(const z of [-14,-4])box(m.light,x,20,z,1.1,.3,.6);
  }
  // Raised pipe/service deck, supported by posts and gusseted beams.
  for(const x of [-18,0,18])for(const z of [7,18]){
   box(m.steel,x,21,z,.6,7.5,.6);box(m.dark,x,17.5,z,1.4,.32,1.4);
   beam(m.steel,[x,21,z],[x+2.2,24.5,z],.30);
  }
  box(m.steel,0,24.8,12.5,40,.4,13);
  for(const z of [6.5,18.5])rail(0,26,z,39);
  for(const z of [9,14]){
   beam(m.rust,[-18,26.2,z],[18,26.2,z],.65,.65,true);
   for(const x of [-16,-6,6,16])beam(m.steel,[x-.22,26.2,z],[x+.22,26.2,z],.83,.83,true);
   for(const x of [-17,17])beam(m.steel,[x,26.2,z],[x,18.2,z],.46,.46,true);
  }
  // Upper lifting portal and hoist remain clear above the work deck.
  for(const x of [-22,22]){beam(m.steel,[x,18,14],[x,34,14],.65);beam(m.steel,[x,27,14],[x+(x<0?3:-3),33,14],.45)}
  beam(m.orange,[-22,34,14],[22,34,14],1.2);
  box(m.dark,10,33.2,14,3,1.0,2);
  beam(m.wire,[10,32.7,14],[10,26.8,14],.12,.12,true);box(m.yellow,10,26.5,14,2,.65,2);
  // Access ladder cage, hose reels and attached floodlights.
  for(const z of [-.65,.65])beam(m.yellow,[-27.2,17.45,z],[-27.2,26,z],.10);
  for(let y=17.7;y<25;y+=.42)beam(m.steel,[-27.2,y,-.65],[-27.2,y,.65],.065);
  box(m.steel,-24,24.8,0,8,.4,2.5);box(m.steel,-20.1,24.8,3.5,2.3,.4,7);
  beam(m.steel,[-26,24.6,0],[-24,17.45,0],.35);
  rail(-24,26,-1.15,8);rail(-19.1,26,3.5,7,'z');
  for(const x of [-22,22])for(const z of [-18,18]){
   beam(m.steel,[x,17.45,z],[x,20,z],.18);box(m.light,x,20,z,1.2,.4,1.1);box(m.dark,x,20.3,z,1.4,.23,1.2)
  }
 });

 for(const [x,z] of [[850,1230],[440,1340]]){hero('reference-offshore-platform',x,0,z,0,1.5);referenceOffshore++;for(const dx of [-33,33])fixturePositions.push([x+dx,28.5,z+27])}
 referenceDistricts.add('offshore');
 // Stage 3: distinctive utility buildings and service yards placed before infill.
 // Use the same supported-footprint and main/alternate swept-AABB rejection
 // as the canonical layout; no hardcoded route changes or remote mesh dependency.
 const stage3Sites={boiler:0,annex:0,substation:0};
 for(const [x,z,a] of [[-1160,-720,0],[-745,-820,Math.PI/2],[-470,-980,0],[285,-990,Math.PI/2],[1020,-870,0],[735,440,0],[1175,600,Math.PI/2]]){
  if(safe('stage3-boiler-house',x,z,a,.85,'utilities')){stage3Sites.boiler++;}
 }
 for(const [x,z,a] of [[-1170,-530,0],[-740,-470,Math.PI/2],[-1130,870,0],[-520,850,0],[75,-1150,0],[1060,-590,0],[760,260,Math.PI/2],[1150,485,0]]){
  if(safe('stage3-outfitting-annex',x,z,a,.86,'outfitting')){stage3Sites.annex++;}
 }
 for(const [x,z,a] of [[-1200,-625,0],[-700,-730,0],[-1220,620,0],[-470,-1180,0],[470,-1170,0],[1180,-740,0],[1170,160,0],[730,590,0],[1170,895,0],[-95,490,0]]){
  if(safe('stage3-electrical-substation',x,z,a,1,'utilities'))stage3Sites.substation++;
 }

 // Pack each production district with staggered, large-scale buildings and
 // connected service roads. Avoid the centerline and existing model bounds.
 let additionalHalls=0,additionalTanks=0,additionalRacks=0,additionalCranes=0;
 const facadeKinds=['cargo-shed','plate-processing-hall','outfit-workshop','coating-shop','gantry-service-hall'];
 for(const [a,b,c,d] of land){
  for(let x=a+54;x<b-53;x+=106)for(let z=c+67;z<d-60;z+=134){
   if(additionalHalls>=104)break;
   const ix=Math.round((x+1400)/53),iz=Math.round((z+1400)/67),k=facadeKinds[(ix*3+iz*7)%facadeKinds.length],angle=(ix+iz)%3===0?Math.PI/2:0;
   if(safe(k,x,z,angle,.80+((ix+iz)%4)*.085,'fabrication')){
    additionalHalls++;districtPlan.push({x,z,kind:k});
    const lx=x+40,lz=z+45;if(onLand(lx,lz)&&routeClear(new T.Box3(V(lx-2,5,lz-2),V(lx+4,18,lz+2))))lamp(lx,5.25,lz);
   }
  }
 }
 // Actual refinery blocks flank the southeastern flight corridor.
 for(const z of [615,690,765,840,915,990,1065])for(const x of [715,770,825,885,945,1005,1065,1125,1190]){
  if(additionalTanks>=25)break;
  if(safe('tank',x,z,0,.82,'pipes'))additionalTanks++;
 }
 for(const x of [740,810,910,1010,1100,1195])for(const z of [600,735,870,1000]){
  if(additionalRacks>=16)break;
  if(safe('pipe-rack',x,z,Math.PI/2,1.05,'pipes'))additionalRacks++;
 }
 // Pair the outer and inner berth with real quayside lifting equipment.
 for(const [x,z,angle] of [[-1190,735,Math.PI/2],[-1200,1030,Math.PI/2],[-690,-320,Math.PI/2],[-685,230,Math.PI/2],[600,-550,Math.PI/2],[680,290,Math.PI/2],[1150,-820,0],[-310,-690,0],[150,-710,0]])if(safe('quay-container-crane',x,z,angle,.75,'quays'))additionalCranes++;
 // Land-edge access roads and rail tracks connect fabrication to dock aprons.
 for(const [a,b,c,d] of land){
  if(b-a<95||d-c<90)continue;
  const x=(a+b)/2,z=(c+d)/2;
  box(asphalt,x,5.105,z,10,.018,d-c-10);
  for(let zz=c+10;zz<d-10;zz+=18)box(m.yellow,x,5.126,zz,.13,.014,7.8);
  for(const zz of [c+14,d-14]){
   box(asphalt,x,5.11,zz,b-a-10,.018,8);
   for(let xx=a+12;xx<b-12;xx+=18)box(m.yellow,xx,5.13,zz,7.8,.014,.13);
  }
 }
 // Populate the narrow quays with connected equipment and practical light poles.
 for(const [a,b,c,d] of land){for(let x=a+35;x<b-25;x+=80)for(let z=c+35;z<d-25;z+=100){
  if(referenceSolids.length>1300)break;
  const kind=['fabrication-rack','hydraulic-power-unit','welding-skid','pipe-bundle','curved-panel-jig','steel-transfer-station'][Math.abs(Math.floor(x+z))%6];safe(kind,x,z,0,.85,'services');
  const lb=new T.Box3(V(x-2,5,z-2),V(x+4,18,z+2));
  if(supported(lb)&&routeClear(lb)&&!placedSites.some(p=>p.intersectsBox(lb))&&!containerSlots.some(q=>Math.abs(q.x-x)<q.hx+4&&Math.abs(q.z-z)<q.hz+3)&&!fixturePositions.some(p=>Math.hypot(p[0]-x,p[2]-z)<40)){lamp(x,5.25,z);referenceSolids.push(lb)}
 }}
 // Explicit start reference, with attached quay fixtures and visible light pools.
 for(const x of [-1140,-1020,-900,-780])lamp(x,5.25,1075);
 // Quay furniture and cargo handling equipment adjacent to the launch vessel.
 for(let z=735;z<=1060;z+=25){const x=-1188;place('bollard',x,5.25,z);if(z%50===35)lamp(x+8,5.25,z);if(z%75===60)safe('terminal-tractor',x+30,z,Math.PI/2,.85,'launch')}
 for(let z=760;z<=1050;z+=35){box(m.steel,-1198,5.35,z,.45,.25,34);if(z%70===60)box(m.dark,-1199,2.1,z,1.0,3.2,4.5)}
 // Riprap and irregular sea-facing headlands add a non-rectangular silhouette.
 for(const [cx,cz,axis] of [[-1265,440,'z'],[-1285,-425,'z'],[-420,-1240,'x'],[485,-1225,'x'],[1245,-565,'z'],[1265,720,'z'],[1000,1125,'x']])for(let i=-5;i<=5;i++){const x=cx+(axis==='x'?i*11:0),z=cz+(axis==='z'?i*11:0);if(!onLand(x,z)){const a=(i*2.399+cx*.01);part(sphereGeo,m.concrete,x,.5,z,5.5+Math.abs(Math.sin(a))*3,2.4+Math.abs(Math.cos(a))*2,5.0+Math.abs(Math.sin(a+1))*3,new T.Quaternion().setFromAxisAngle(up,a))}}
 // Inspect actual hero meshes using a center ray and four radial offsets.
 // This finite sample is not continuous collision certification.
 function heroClearance(){const hits=[],ray=new T.Raycaster(),radius=2.5;let tested=0;for(const item of referenceHeroes){const root=templates[item.name].clone();root.position.set(item.x,item.y,item.z);root.rotation.y=item.angle;root.scale.setScalar(item.scale);root.updateMatrixWorld(true);const sides=new Map();for(const m of root.children){if(!sides.has(m.material))sides.set(m.material,m.material.side);m.material.side=T.DoubleSide;}try{for(let i=0;i<routePoints.length;i++){const a=routePoints[i],b=routePoints[(i+1)%routePoints.length];if(!intersectsSegment(item.bounds,a,b,radius))continue;const start=V(...a),end=V(...b),dir=end.clone().sub(start),len=dir.length();dir.normalize();const u=V(0,1,0).cross(dir);if(u.lengthSq()<.001)u.set(1,0,0);u.normalize();const v=dir.clone().cross(u).normalize();for(const [du,dv] of [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]]){tested++;ray.set(start.clone().addScaledVector(u,du).addScaledVector(v,dv),dir);ray.near=.04;ray.far=len-.04;const h=ray.intersectObject(root,true)[0];if(h)hits.push({asset:item.name,segment:i+1,offset:[du,dv],distance:Math.round(h.distance*10)/10})}}}finally{for(const [m,side] of sides)m.side=side;}}const civilHits=referenceCivil.flatMap((b,i)=>routePoints.map((a,j)=>intersectsSegment(b,a,routePoints[(j+1)%routePoints.length],radius)?{wall:i,segment:j+1}:null).filter(Boolean));return {tested,radius,hits,civilHits}}
 const referenceAudit={sectors:layout.sectors.length,gates:routePoints.length,landPieces:land.length,landArea:land.reduce((sum,[a,b,c,d])=>sum+(b-a)*(d-c),0),shoreMeters,centralBasins:[[-420,-350],[420,-350],[-420,150],[420,150]].every(([x,z])=>!onLand(x,z)),dryDockFloor:dock.floor,ships:referenceShips,offshorePlatforms:referenceOffshore,skyBridges:referenceBridge,districts:[...referenceDistricts],solidPlacements:referenceSolids.length,solidRouteConflicts:referenceSolids.filter(b=>!routeClear(b)).length,alternateCorridors:layout.alternates.length,containerStacks:referenceCargo,additionalHalls,additionalTanks,additionalRacks,additionalCranes,stage3Sites};
  // Bounded, deterministic ground-contact approximation (not ray-traced AO).
 // Rasterize supported footprints only, so boats and the drydock void do not
 // darken the surrounding pavement. One texture sample, no extra scene pass.
 let contactFootprints=0;
 function stampContact(x,z,w,d,height){
  if(height<.3||w<.3||d<.3||w>400||d>400)return;
  const k=2048/3000,pad=Math.min(7,1.3+height*.06),px=(x+1500)*k,py=(z+1500)*k;
  // Four inexpensive nested footprints avoid a per-object full-canvas blur.
  for(const [f,alpha] of [[1,.035],[.7,.055],[.4,.075],[.12,.11]]){
   const r=pad*f;contactCtx.fillStyle='rgba(0,0,0,'+alpha+')';
   contactCtx.fillRect(px-(w/2+r)*k,py-(d/2+r)*k,(w+2*r)*k,(d+2*r)*k);
  }contactFootprints++;
 }
 for(const b of placedSites){if(b.min.y<4.7||b.min.y>6.0)continue;const c=b.getCenter(V(0,0,0)),v=b.getSize(V(0,0,0));stampContact(c.x,c.z,v.x,v.z,v.y)}
 for(const q of containerSlots)stampContact(q.x,q.z,q.hx*2,q.hz*2,q.next-5);
 contactCtx.filter='none';contactMap.needsUpdate=true;yardLightMap.needsUpdate=true;
 for(const [key,b] of batches){const mesh=new T.InstancedMesh(b.g,b.mat,b.matrices.length);mesh.name='batch-'+key;mesh.frustumCulled=false;for(let i=0;i<b.matrices.length;i++)mesh.setMatrixAt(i,b.matrices[i]);mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=b.mat!==glowMat&&b.mat!==warmGlow;mesh.receiveShadow=b.mat!==glowMat;scene.add(mesh);b.g.computeBoundingBox();const bounds=new T.Box3(),temp=new T.Box3();for(const matrix of b.matrices)bounds.union(temp.copy(b.g.boundingBox).applyMatrix4(matrix));worldBatches.push({mesh,bounds})}
// Build container LODs in spatial chunks. Every container keeps the exact same
// transform and color when changing mesh detail. Low models cast the static shadow.
// All colors within a spatial tile use a single LOD decision. Far rail
// geometry is identical across cargo liveries, so submit it once per tile.
const lodTiles=new Map();let sharedRailBatches=0;
for(const [key,chunk] of containerChunks){const id=key.slice(0,key.lastIndexOf(':'));if(!lodTiles.has(id))lodTiles.set(id,{chunks:[],bounds:new T.Box3()});const tile=lodTiles.get(id);tile.chunks.push(chunk);tile.bounds.union(chunk.bounds)}
function makeContainerMesh(model,matrices,lod){
 const mesh=new T.InstancedMesh(model.geometry,model.material,matrices.length);mesh.frustumCulled=false;
 for(let i=0;i<matrices.length;i++)mesh.setMatrixAt(i,matrices[i]);mesh.instanceMatrix.needsUpdate=true;
 mesh.castShadow=lod==='low';mesh.receiveShadow=true;mesh.visible=lod==='low';scene.add(mesh);return mesh
}
for(const tile of lodTiles.values()){
 const variants={high:[],low:[]},rails=[];let railModel=null;
 for(const chunk of tile.chunks){
  for(const model of templates['container-'+chunk.col].children)variants.high.push(makeContainerMesh(model,chunk.matrices,'high'));
  for(const model of templates['container-far-'+chunk.col].children){
   if(model.material===m.steel){railModel=railModel||model;rails.push(...chunk.matrices)}
   else variants.low.push(makeContainerMesh(model,chunk.matrices,'low'))
  }
 }
 if(railModel){variants.low.push(makeContainerMesh(railModel,rails,'low'));sharedRailBatches++}
 containerLOD.push({bounds:tile.bounds,center:tile.bounds.getCenter(V(0,0,0)),high:variants.high,low:variants.low});
}
const lodFrustum=new T.Frustum(),lodMatrix=new T.Matrix4();let lodInitialized=false;
function updateContainerLOD(cam,reflectionLowDetail=false){cam.updateMatrixWorld();lodFrustum.setFromProjectionMatrix(lodMatrix.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse));for(const batch of worldBatches)batch.mesh.visible=!lodInitialized||lodFrustum.intersectsBox(batch.bounds);for(const item of containerLOD){const visible=!lodInitialized||lodFrustum.intersectsBox(item.bounds),detail=!reflectionLowDetail&&lodInitialized&&cam.position.distanceToSquared(item.center)<520**2;for(const mesh of item.high)mesh.visible=visible&&detail;for(const mesh of item.low)mesh.visible=visible&&!detail}lodInitialized=true}
const waterTex=texture('#888888','steel');waterTex.repeat.set(70,70);const waterMat=new T.MeshStandardMaterial({color:0x142a31,roughness:.46,metalness:.02,envMapIntensity:.40,bumpMap:waterTex,bumpScale:.6});
// World-position ripples avoid the previous giant repeated bump texture.
waterMat.bumpMap=null;
waterMat.onBeforeCompile=shader=>{
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSea;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvSea=(modelMatrix*vec4(transformed,1.0)).xyz;');
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vSea;\nfloat seaHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float seaNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(seaHash(i),seaHash(i+vec2(1.,0.)),f.x),mix(seaHash(i+vec2(0.,1.)),seaHash(i+vec2(1.,1.)),f.x),f.y);}').replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nvec2 seaP=vSea.xz;vec2 a=seaP*.31,b=vec2(seaP.x+seaP.y,seaP.y-seaP.x)*.87;float af=1.-smoothstep(.5,2.2,length(fwidth(a))),bf=1.-smoothstep(.5,2.2,length(fwidth(b)));vec2 rip=vec2(seaNoise(a+vec2(.17,0.))-seaNoise(a-vec2(.17,0.)),seaNoise(a+vec2(0.,.17))-seaNoise(a-vec2(0.,.17)))*.15*af;vec2 rb=vec2(seaNoise(b+vec2(.19,0.))-seaNoise(b-vec2(.19,0.)),seaNoise(b+vec2(0.,.19))-seaNoise(b-vec2(0.,.19)));rip+=rb*.075*bf;normal=normalize(normal+mat3(viewMatrix)*vec3(rip.x,0.,rip.y));').replace('#include <color_fragment>','#include <color_fragment>\nfloat seaRip=seaNoise(vSea.xz*.027);diffuseColor.rgb*=.92+.08*seaRip;');

};
// Four water planes deliberately exclude the excavated basin [650,1050] x [-750,-350].
function waterTile(x,z,w,d){const water=new T.Mesh(new T.PlaneGeometry(w,d),waterMat);water.rotation.x=-Math.PI/2;water.position.set(x,-.25,z);waterSurfaces.push(water);scene.add(water)}
waterTile(-9655,0,20690,40000);waterTile(10505,0,18990,40000);waterTile(850,-10240,320,19520);waterTile(850,10060,320,19880);
// Thin dielectric films above the existing PBR substrate, not a fake
// sky-only highlight. The world-projected capture contains the actual scene.
// Explicit separate mesh visibility also makes reflection A/B tests reliable.
const filmVertex='varying vec3 vFilm;void main(){vFilm=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vFilm,1.);}';
const filmNoise='float fh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float fn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(fh(i),fh(i+vec2(1,0)),f.x),mix(fh(i+vec2(0,1)),fh(i+vec2(1,1)),f.x),f.y);}';
function filmMaterial(sea){
 const frag='varying vec3 vFilm;\n'+reflectionCommon+filmNoise+'\nvoid main(){vec3 v=normalize(cameraPosition-vFilm);float f=.025+.975*pow(1.-clamp(v.y,0.,1.),5.);vec2 p=vFilm.xz;float m=fn(p*.044)*.72+fn(p*.20)*.28;vec2 noise=vec2(fn(p*.33),fn(p.yx*.37))-.5;'+
 (sea?'float alpha=clamp(.13+f*.64,0.,.75);vec4 reflected=portSample(vFilm,noise*.013);alpha*=reflected.a*smoothstep(.012,.065,v.y);vec3 col=reflected.rgb*vec3(.88,.94,.96);':'float fine=fn(p*.57);float wet=smoothstep(.54,.81,m*.84+fine*.16);float alpha=wet*clamp(.035+f*.74,0.,.66);vec4 reflected=portSample(vec3(vFilm.x,5.24,vFilm.z),noise*.004);alpha*=reflected.a;if(alpha<.008)discard;vec3 col=reflected.rgb*vec3(.80,.82,.80);')+
 '\ngl_FragColor=vec4(col,alpha);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}';
 return new T.ShaderMaterial({uniforms:{uPortReflection:reflUniforms.uPortReflection,uPortProjection:reflUniforms.uPortProjection},vertexShader:filmVertex,fragmentShader:frag,transparent:true,depthWrite:false,side:T.FrontSide,polygonOffset:true,polygonOffsetFactor:-1});
}
const pavementFilmMaterial=filmMaterial(false),waterFilmMaterial=filmMaterial(true);
function addFilm(group,mat,x,y,z,w,d){const mesh=new T.Mesh(new T.PlaneGeometry(w,d),mat);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);mesh.renderOrder=4;group.add(mesh)}
for(const [x,z,w,d] of pavedSlabs)addFilm(roadFilm,pavementFilmMaterial,x,5.365,z,w-1,d-1);
for(const water of waterSurfaces){const w=water.geometry.parameters.width,d=water.geometry.parameters.height;addFilm(seaFilm,waterFilmMaterial,water.position.x,-.22,water.position.z,w,d)}
// Aircraft gates are free-standing in the air, not arches with ground legs.
const gates=layout.sectors.flatMap((s,i)=>s.gates.map(p=>({p:V(...p),sector:i}))).map((g,i)=>({...g,index:i+1}));
const guide=new T.Group();guide.name='aerial-route';scene.add(guide);
// A single instanced set of industrial beacons replaces 64 individual ring
// submissions. Inner radius remains 9.65 m (5.79 m for confined sectors).
const edgeGeo=new T.TorusGeometry(10.5,.65,10,64);
const edgeMat=new T.MeshStandardMaterial({color:0x27323a,metalness:.55,roughness:.48});
const stripes=[];
for(const z of [-.58,.58]){const g=new T.TorusGeometry(10.35,.18,8,64);g.translate(0,0,z);stripes.push(g)}
// Solid red inner edge remains within the original opening envelope.
stripes.push(new T.TorusGeometry(10,.35,8,64));
const stripeGeo=T.BufferGeometryUtils.mergeBufferGeometries(stripes);
const gateMat=new T.MeshBasicMaterial({color:0xff392e,toneMapped:false});
const fittings=[];
for(let k=0;k<8;k++){const theta=k*Math.PI/4;const g=new T.BoxGeometry(1.25,1.7,1.5);g.rotateZ(theta-Math.PI/2);g.translate(10.62*Math.cos(theta),10.62*Math.sin(theta),0);fittings.push(g)}
const fittingGeo=T.BufferGeometryUtils.mergeBufferGeometries(fittings),fittingMat=new T.MeshStandardMaterial({color:0x9c6440,metalness:.45,roughness:.68});
const gateMeshes=[[edgeGeo,edgeMat],[stripeGeo,gateMat],[fittingGeo,fittingMat]].map(([g,m])=>{const mesh=new T.InstancedMesh(g,m,gates.length);mesh.frustumCulled=false;guide.add(mesh);return mesh});
const gateTransform=new T.Object3D();
for(let i=0;i<gates.length;i++){const g=gates[i],next=gates[(i+1)%gates.length],prev=gates[(i+gates.length-1)%gates.length],tangent=next.p.clone().sub(prev.p).normalize();gateTransform.position.copy(g.p);gateTransform.quaternion.setFromUnitVectors(V(0,0,1),tangent);gateTransform.scale.setScalar(g.sector===5||g.sector===6||g.sector===7?.6:1);gateTransform.updateMatrix();for(const mesh of gateMeshes)mesh.setMatrixAt(i,gateTransform.matrix)}
for(const mesh of gateMeshes)mesh.instanceMatrix.needsUpdate=true;
const route=new T.LineLoop(new T.BufferGeometry().setFromPoints(gates.map(g=>g.p)),new T.LineBasicMaterial({color:0xff4935,toneMapped:false,transparent:true,opacity:.96}));guide.add(route);for(const alt of layout.alternates){const pts=[gates[alt.from].p,...alt.via.map(p=>V(...p)),gates[alt.to].p];const line=new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineDashedMaterial({color:0xffc05d,toneMapped:false,dashSize:12,gapSize:8,transparent:true,opacity:.85}));line.computeLineDistances();guide.add(line)}
// Separate asset inspection scene shares the exact merged source models and lighting.
const assetScene=new T.Scene();assetScene.background=new T.Color(0x303941);assetScene.environment=scene.environment;assetScene.add(new T.HemisphereLight(0xc0d8ed,0x49413c,1.35));const assetSun=new T.DirectionalLight(0xffcf99,3.1);assetSun.position.set(-160,100,80);assetScene.add(assetSun);const assetFloor=new T.Mesh(new T.PlaneGeometry(2000,2000),new T.MeshStandardMaterial({color:0x45494b,roughness:.8}));assetFloor.rotation.x=-Math.PI/2;assetFloor.position.y=-.1;assetScene.add(assetFloor);let inspected=null;const assetCamera=new T.PerspectiveCamera(42,1,.1,4000);
function assetView(name,angle=0){const source=templates[name];if(!source)throw Error('unknown asset '+name);if(inspected)assetScene.remove(inspected);inspected=source.clone();assetScene.add(inspected);const bounds=new T.Box3().setFromObject(inspected),center=bounds.getCenter(V(0,0,0)),size=bounds.getSize(V(0,0,0)),r=Math.max(size.x,size.y,size.z);assetCamera.aspect=innerWidth/innerHeight;assetCamera.updateProjectionMatrix();const elongated=size.x>size.z*2.5;const delta=(elongated?V(r*.34,r*.40,r*.93):V(r*.85,r*.58,r*.95)).applyAxisAngle(up,angle);assetCamera.position.copy(center).add(delta);assetCamera.lookAt(center);active=assetCamera;mode='asset-'+name;tour=false;render()}
// Keep only a small fixed-size set of real practical point lights active near
// the camera. Distant fixtures retain their emissive meshes and baked glow pools.
// Soft optical highlights are a single depth-tested world-space point batch.
 // They are not photographic overlays and disappear behind opaque geometry.
 const fixtureGeo=new T.BufferGeometry();
 fixtureGeo.setAttribute('position',new T.Float32BufferAttribute(fixturePositions.flat(),3));
 const fixtureHaloMat=new T.ShaderMaterial({uniforms:{uViewportHeight:{value:900}},vertexShader:`
 uniform float uViewportHeight;
 varying float vFade;
 void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;
 float d=max(1.,-p.z);gl_PointSize=clamp(uViewportHeight*1.8/d,1.,28.);
 vFade=1.-smoothstep(350.,1800.,d);}
 `,fragmentShader:`
 varying float vFade;
 void main(){float r=length(gl_PointCoord-.5)*2.;float a=exp(-r*r*7.)*vFade*.26;
 if(r>1.)discard;gl_FragColor=vec4(1.,.51,.19,a);}
 `,transparent:true,depthWrite:false,blending:T.AdditiveBlending});
 const fixtureHalos=new T.Points(fixtureGeo,fixtureHaloMat);fixtureHalos.frustumCulled=false;fixtureHalos.renderOrder=5;scene.add(fixtureHalos);
 const practical=Array.from({length:6},()=>{const p=new T.PointLight(0xffb771,0,95,2);scene.add(p);return p});
function updatePractical(camera){
 const pos=camera.position,dir=camera.getWorldDirection(V(0,0,0));
 const nearby=fixturePositions.map(p=>{const dx=p[0]-pos.x,dy=p[1]-pos.y,dz=p[2]-pos.z,d=dx*dx+dy*dy+dz*dz,dot=(dx*dir.x+dy*dir.y+dz*dir.z)/Math.max(1,Math.sqrt(d));return {p,d,score:d*(dot<-.25?2.5:1)}});
 nearby.sort((a,b)=>a.score-b.score);
 for(let i=0;i<practical.length;i++){const f=nearby[i],light=practical[i];if(f&&f.d<160**2){
  light.position.set(...f.p);const [x,y,z]=f.p,insideHull=Math.abs(x-850)<32&&z>-305&&z<75&&y<15;
  // Tight hull fixtures need less output than tall exterior floodlights.
  light.intensity=insideHull?290:820;light.distance=insideHull?35:95;light.color.setHex(insideHull?0xffaa64:0xffb771);
 }else light.intensity=0}
}
const camera=new T.PerspectiveCamera(57,1,.5,12000),top=new T.OrthographicCamera(-1650,1650,1650,-1650,1,10000);let active=camera,mode='overview',tour=false,dist=0,drag=false,yaw=0,pitch=0;const keys=new Set(),tmp=V(0,0,0);let last=performance.now();const presets={overview:[[-1700,1420,1720],[0,30,0]],north:[[1620,1320,-1700],[0,25,0]],top:[[0,4200,0],[0,0,0]],'1-launch':[[-1170,28,1080],[-1190,29,775]],'2-containers':[[-1030,28,420],[-950,32,100]],'3-crane':[[-1100,39,-395],[-900,85,-575]],'4-skybridge':[[-500,236,-1070],[-140,236,-1070]],'5-drop':[[850,285,-650],[850,-3,-315]],'6-drydock':[[850,-2,-308],[850,-4,-50]],'7-foundry':[[1080,44,230],[1080,43,490]],'8-pipes':[[850,38,690],[1070,50,950]],'9-offshore':[[1050,45,1320],[440,26,1290]],'10-final':[[100,28,1110],[-900,35,1080]]};
function resize(){const a=innerWidth/innerHeight;renderer.setSize(innerWidth,innerHeight);fixtureHaloMat.uniforms.uViewportHeight.value=renderer.domElement.height;camera.aspect=a;camera.updateProjectionMatrix();const h=1580*Math.max(1,1/a);top.left=-h*a;top.right=h*a;top.top=h;top.bottom=-h;top.updateProjectionMatrix()}
function angles(){camera.rotation.order='YXZ';yaw=camera.rotation.y;pitch=camera.rotation.x}
function setView(id){if(!presets[id])throw Error('unknown view '+id);tour=false;mode=id;active=id==='top'?top:camera;scene.fog.density=id==='top'?0:.00012;const [p,l]=presets[id];active.position.set(...p);active.up.set(0,id==='top'?0:1,id==='top'?-1:0);active.lookAt(...l);if(active===camera)angles();document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===id));render()}
function render(){if(active!==assetCamera){scene.fog.density=active.isOrthographicCamera?0:T.MathUtils.lerp(.00024,.000095,T.MathUtils.clamp(active.position.y/280,0,1));fixtureHalos.visible=active.isPerspectiveCamera&&active.position.y<260;updatePractical(active);updateContainerLOD(active);updatePortReflection(active)}renderer.render(active===assetCamera?assetScene:scene,active);document.getElementById('readout').textContent=mode.toUpperCase()+' / '+active.position.toArray().map(Math.round).join(' · ')+' m'}
const lengths=gates.map((g,i)=>g.p.distanceTo(gates[(i+1)%gates.length].p)),total=lengths.reduce((a,b)=>a+b,0);
function coursePoint(s){s=((s%total)+total)%total;let i=0;while(s>=lengths[i]&&i<lengths.length-1){s-=lengths[i++]};return gates[i].p.clone().lerp(gates[(i+1)%gates.length].p,s/lengths[i])}
function sampleCourse(s){active=camera;mode='course';camera.position.copy(coursePoint(s));camera.lookAt(coursePoint(s+28));angles()}
function tick(t){const dt=Math.min(.05,(t-last)/1000);last=t;if(tour){dist=(dist+dt*42)%total;sampleCourse(dist)}else if(active===camera&&keys.size){const step=dt*(keys.has('ShiftLeft')||keys.has('ShiftRight')?160:45);camera.getWorldDirection(tmp);if(keys.has('KeyW'))camera.position.addScaledVector(tmp,step);if(keys.has('KeyS'))camera.position.addScaledVector(tmp,-step);tmp.cross(up).normalize();if(keys.has('KeyD'))camera.position.addScaledVector(tmp,step);if(keys.has('KeyA'))camera.position.addScaledVector(tmp,-step);if(keys.has('KeyE'))camera.position.y+=step;if(keys.has('KeyQ'))camera.position.y-=step;camera.position.x=T.MathUtils.clamp(camera.position.x,-1385,1385);camera.position.z=T.MathUtils.clamp(camera.position.z,-1385,1385);camera.position.y=T.MathUtils.clamp(camera.position.y,layout.minAltitude,layout.ceiling);mode='free'}if(tour||keys.size)render();requestAnimationFrame(tick)}
addEventListener('resize',()=>{resize();assetCamera.aspect=innerWidth/innerHeight;assetCamera.updateProjectionMatrix();render()});addEventListener('keydown',e=>{if(e.code==='KeyH'&&!e.repeat)document.body.classList.toggle('clean');keys.add(e.code)});addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();drag=false});renderer.domElement.addEventListener('pointerdown',e=>{if(active!==camera)return;drag=true;tour=false;renderer.domElement.setPointerCapture(e.pointerId)});renderer.domElement.addEventListener('pointerup',()=>drag=false);renderer.domElement.addEventListener('pointercancel',()=>drag=false);renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;yaw-=e.movementX*.003;pitch=T.MathUtils.clamp(pitch-e.movementY*.003,-1.5,1.5);camera.rotation.set(pitch,yaw,0,'YXZ');mode='free';render()});renderer.domElement.addEventListener('wheel',e=>{if(active!==camera)return;e.preventDefault();camera.fov=T.MathUtils.clamp(camera.fov+e.deltaY*.025,28,88);camera.updateProjectionMatrix();render()},{passive:false});
for(const id of Object.keys(presets)){const b=document.createElement('button');b.dataset.view=id;b.textContent=id; b.onclick=()=>setView(id);document.getElementById('views').append(b)}
document.getElementById('tour').onclick=()=>{tour=!tour;if(tour){dist=0;sampleCourse(0)}};document.getElementById('route').onclick=()=>{guide.visible=!guide.visible;render()};document.getElementById('capture').onclick=()=>{render();const a=document.createElement('a');a.download='iron-tide-'+mode+'.png';a.href=renderer.domElement.toDataURL('image/png');a.click()};
renderer.shadowMap.needsUpdate=true;resize();setView('overview');requestAnimationFrame(tick);
// Native model audit checks finite mesh data, non-empty geometry, bounds, and
// material usage. It does not substitute for engineering or gameplay clearance validation.
function assetAudit(){const out={};for(const [name,group] of Object.entries(templates)){const bounds=new T.Box3().setFromObject(group),size=bounds.getSize(V(0,0,0));let verts=0,tris=0,bad=0,degenerate=0;
 for(const mesh of group.children){const g=mesh.geometry,p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv'),idx=g.index;verts+=p.count;tris+=(idx?idx.count:p.count)/3;
 for(const attr of [p,n,uv])if(attr){for(const v of attr.array)if(!Number.isFinite(v))bad++}
 const a=V(0,0,0),b=V(0,0,0),c=V(0,0,0);for(let i=0;i<(idx?idx.count:p.count);i+=3){const k=idx?idx.getX(i):i,l=idx?idx.getX(i+1):i+1,m=idx?idx.getX(i+2):i+2;a.fromBufferAttribute(p,k);b.fromBufferAttribute(p,l);c.fromBufferAttribute(p,m);if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-14)degenerate++}
 }out[name]={vertices:verts,triangles:tris,nonfinite:bad,degenerate,meters:size.toArray(),materials:group.children.length}}return out}
window.IRON_TIDE={assetView,assetAudit,referenceAudit(){return {...referenceAudit,lapMeters:total}},heroClearance,bakedLights(v){yardLightEnabled.value=v?1:0;render()},detailView(id){const views={gantryBase:[[-990,14,-520],[-962,23,-575]],hullServices:[[850,-2,-280],[868,0,-165]],craneWorkshops:[[-1120,35,-740],[-1040,22,-575]],yardLight:[[-1050,12,1088],[-1020,5,1075]]};if(!views[id])throw Error('unknown detail view '+id);tour=false;mode='detail-'+id;active=camera;camera.position.set(...views[id][0]);camera.up.set(0,1,0);camera.lookAt(...views[id][1]);angles();render()},reflections(v){reflectionsEnabled=!!v;render()},projectGates(){return gates.map(g=>{const p=g.p.clone().project(active);return {index:g.index,sector:g.sector,x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2,altitude:g.p.y}})},views:Object.keys(presets),setView,clean(v){document.body.classList.toggle('clean',v)},route(v){guide.visible=v;render()},course(s){tour=false;sampleCourse(s);render()},stats(){return {gates:gates.length,lapMeters:total,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,assets:Object.keys(templates),containerStacks:containerSlots.length,containerChunks:containerChunks.size,containerLODTiles:containerLOD.length,sharedRailBatches,referenceAudit,photoMaterials:loadedMaterials.slice(),skySource,districtBuildings:districtPlan.length,contactFootprints,bakedLightPools,reflectionPasses,reflectionCalls,reflectionTriangles,fixtureCount:fixturePositions.length,haloCount:fixtureGeo.attributes.position.count,sunDirection:sun.position.clone().normalize().toArray(),reflectionActive:reflUniforms.uRoadReflect.value?'pavement':reflUniforms.uSeaReflect.value?'water':'off',view:mode,position:active.position.toArray(),revision:T.REVISION}},async exportAsset(name){const group=templates[name];if(!group)throw Error('unknown asset');return new Promise((resolve,reject)=>{try{new T.GLTFExporter().parse(group,buffer=>{if(!(buffer instanceof ArrayBuffer)){reject(Error('not binary'));return}const bytes=new Uint8Array(buffer);let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));resolve(btoa(s))},{binary:true,maxTextureSize:name.startsWith('container-')||name==='ship-hull'?512:256,onlyVisible:true})}catch(e){reject(e)}})}};
})().catch(e=>{console.error(e);const el=document.getElementById('error');el.style.display='block';el.textContent=String(e.stack||e)});
