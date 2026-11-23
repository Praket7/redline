

// v52: Initialize FPS telemetry before all boot callbacks (prevents TDZ at startup).
window.REDLINE_VERSION='v78-stage1';
// v59: Publish an initialized UI binding before building any engine subsystem.
// This prevents early callbacks from observing a lexical temporal dead zone.
let redlineUI=null;
let liveFPS=60;
const REDLINE_WORLD = (()=>{try{return JSON.parse(localStorage.getItem('redline_v16_options')||'{}').course==='raven'?'raven':'grand'}catch(_){return 'grand'}})();
window.REDLINE_WORLD=REDLINE_WORLD;
const $=i=>document.getElementById(i),cl=(v,a,b)=>Math.min(b,Math.max(a,v)),sm=(a,b,x)=>{x=cl((x-a)/(b-a),0,1);return x*x*(3-2*x)},mv=(c,t,r)=>c<t?Math.min(t,c+r):Math.max(t,c-r);
const hash=(x,y)=>{const h=Math.sin(x*127.1+y*311.7)*43758.5453;return h-Math.floor(h)};
function vn(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return(hash(ix,iy)*(1-u)+hash(ix+1,iy)*u)*(1-v)+(hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v}
const fbm=(x,y)=>vn(x,y)*.55+vn(x*2.1,y*2.1)*.3+vn(x*4.3,y*4.3)*.15;
const REDLINE_MOBILE=/(iPhone|iPad|iPod|Android|Mobile)/i.test((typeof navigator!=='undefined'&&navigator.userAgent)||'')||((typeof navigator!=='undefined'&&navigator.maxTouchPoints>1)&&innerWidth<960);
window.REDLINE_MOBILE=REDLINE_MOBILE;
window.REDLINE_BOOT_PHASE='renderer';
// Limit GPU startup allocations on tile-based mobile browsers; desktop quality is untouched.
const Rn=new THREE.WebGLRenderer({antialias:!REDLINE_MOBILE,alpha:false,powerPreference:'high-performance'});
Rn.setPixelRatio(Math.min(devicePixelRatio,REDLINE_MOBILE?.68:.68));Rn.setSize(innerWidth,innerHeight,false);
Rn.shadowMap.enabled=true;Rn.shadowMap.type=THREE.PCFSoftShadowMap;Rn.toneMapping=THREE.ACESFilmicToneMapping;Rn.outputEncoding=THREE.sRGBEncoding;Rn.toneMappingExposure=.93;
Rn.domElement.style.cssText='position:fixed;left:0;top:0;width:100vw;height:100dvh;display:block;margin:0;padding:0;max-width:none;max-height:none';document.body.prepend(Rn.domElement);
const S=new THREE.Scene(),cam=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.5,6000);S.fog=new THREE.Fog(0xd08a68,250,3200);
const lin=h=>new THREE.Color(h).convertSRGBToLinear();
let RTg;try{
 // Mobile: a standard 8-bit color target avoids an unsupported half-float multisample buffer.
 RTg=REDLINE_MOBILE?new THREE.WebGLRenderTarget(1,1,{type:THREE.UnsignedByteType,format:THREE.RGBAFormat})
   :new THREE.WebGLMultisampleRenderTarget(1,1,{type:THREE.HalfFloatType,format:THREE.RGBAFormat});
}catch(e){RTg=new THREE.WebGLRenderTarget(1,1,{type:THREE.UnsignedByteType})}
const pU={t:{value:RTg.texture},sp:{value:new THREE.Vector2(.5,.5)},k:{value:1}},pS=new THREE.Scene(),pC=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
pS.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:pU,depthTest:false,depthWrite:false,vertexShader:'varying vec2 u;void main(){u=uv;gl_Position=vec4(position.xy,0.,1.);}',
 fragmentShader:'uniform sampler2D t;uniform vec2 sp;uniform float k;varying vec2 u;void main(){vec3 c=max(min(texture2D(t,u).rgb,vec3(30.)),0.);vec2 d=(sp-u)*.96/56.;vec2 p=u;vec3 r=vec3(0.);float w=1.;for(int i=0;i<56;i++){p+=d;vec3 s=max(min(texture2D(t,p).rgb,vec3(30.)),0.);float l=max(max(s.r,s.g),s.b);r+=s*smoothstep(1.,3.,l)*w;w*=.97;}float g=pow(max(1.-length(u-sp)*1.2,0.),3.);c+=r*k/56.*vec3(1.,.8,.55)*2.4+vec3(1.,.7,.4)*g*k*.25;c=mix(vec3(dot(c,vec3(.3,.59,.11))),c,1.3);gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}'})));
function rsz(){const r=Rn.getPixelRatio();RTg.setSize(Math.floor(innerWidth*r),Math.floor(innerHeight*r))}rsz();
function post(){cam.updateMatrixWorld();const v=cam.position.clone().addScaledVector(sunDir,1000),fw=new THREE.Vector3();cam.getWorldDirection(fw);const a=fw.dot(sunDir);v.project(cam);pU.sp.value.set(v.x*.5+.5,v.y*.5+.5);pU.k.value=cl(a*1.6+.3,0,1)*(v.z<1?1:0);
 Rn.setRenderTarget(RTg);Rn.render(S,cam);Rn.setRenderTarget(null);Rn.render(pS,pC)}
// ---- sky, sun, time of day
const SU={sd:{value:new THREE.Vector3()},hz:{value:new THREE.Color()},zn:{value:new THREE.Color()},cc:{value:new THREE.Color()},tm:{value:0}};
const sky=new THREE.Mesh(new THREE.SphereGeometry(4000,24,12),new THREE.ShaderMaterial({uniforms:SU,side:THREE.BackSide,depthWrite:false,fog:false,
 vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'varying vec3 v;uniform vec3 sd,hz,zn,cc;uniform float tm;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}float fb(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+7.;a*=.5;}return s;}void main(){vec3 d=normalize(v);float y=max(d.y,0.);vec3 c=mix(hz,zn,pow(y,.4));float s=max(dot(d,sd),0.);c+=vec3(1.,.55,.25)*pow(s,6.)*.5*(1.-y);vec2 uv=d.xz/(y+.12)*.9+vec2(tm*.004,tm*.002);float k=fb(uv*1.4);k=smoothstep(.42,.78,k+fb(uv*4.)*.25-.1);k*=smoothstep(0.,.12,y);float lit=clamp(pow(s,3.)*.8+.35*(1.-y),0.,1.);vec3 c2=mix(cc*.35,cc*1.5+vec3(.5,.2,.05)*pow(s,2.),lit);c=mix(c,c2,k*.92);c+=vec3(1.,.8,.55)*(pow(s,900.)*14.+pow(s,60.)*1.2+pow(s,12.)*.35);gl_FragColor=vec4(c,1.);}'}));
sky.renderOrder=-1;S.add(sky);
const envS=new THREE.Scene();envS.add(new THREE.Mesh(sky.geometry,sky.material));const pmg=new THREE.PMREMGenerator(Rn);
function envUp(){}
// REDLINE v10.5: balanced sunlight and ambient bounce in the canyon.
// Primary shadow is the only real-time shadow pass (the cool fill light casts none).
const hemi=new THREE.HemisphereLight(0xc9dbf5,0x806354,.88),sun=new THREE.DirectionalLight(0xfff2df,2.52);
S.add(hemi,sun,sun.target);
const fill=new THREE.DirectionalLight(0xaec9ec,.31),amb=new THREE.AmbientLight(0xe5d3c2,.105);
S.add(fill,amb);
// Previous version: a 520m/1024px map and 1.5 WORLD UNITS of normal bias;
// both produced conspicuous disconnected/striped canyon shadows.
sun.castShadow=true;
const SHADOW_HALF_SPAN=178;
sun.shadow.mapSize.set(REDLINE_MOBILE?768:1280,REDLINE_MOBILE?768:1280);
Object.assign(sun.shadow.camera,{left:-SHADOW_HALF_SPAN,right:SHADOW_HALF_SPAN,top:SHADOW_HALF_SPAN,bottom:-SHADOW_HALF_SPAN,near:20,far:1550});
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias=-.00017;
sun.shadow.normalBias=.19;
sun.shadow.radius=2.6;
// Inspection mode: press F9 to compare lighting with and without cast shadows.
let redlineShadowsVisible=true;
const shadowAlignedTarget=new THREE.Vector3(),shadowEast=new THREE.Vector3(),shadowNorth=new THREE.Vector3();
function positionStableSun(anchor){
 // Snap the directional shadow-map projection in LIGHT space. Smoothly moving a
 // 3D camera otherwise moves the shadow texel grid and produces shimmering.
 shadowAlignedTarget.copy(anchor);
 shadowEast.set(0,1,0).cross(sunDir).normalize();
 shadowNorth.copy(sunDir).cross(shadowEast).normalize();
 const texel=(2*SHADOW_HALF_SPAN)/sun.shadow.mapSize.x;
 const u=shadowAlignedTarget.dot(shadowEast),v=shadowAlignedTarget.dot(shadowNorth);
 shadowAlignedTarget.addScaledVector(shadowEast,Math.round(u/texel)*texel-u);
 shadowAlignedTarget.addScaledVector(shadowNorth,Math.round(v/texel)*texel-v);
 sun.target.position.copy(shadowAlignedTarget);
 sun.position.copy(shadowAlignedTarget).addScaledVector(sunDir,750);
 sun.target.updateMatrixWorld();sun.updateMatrixWorld();
}
const TOD=[['MORNING',22,110,0xffc890,2.2,'#f4b48a','#4a6fb0',0xcfa28a,'#ffc0a0'],['NOON',62,160,0xfff2dc,2.65,'#c8d8e6','#3d78c8',0xbccbd6,'#ffffff'],['SUNSET',30,250,0xffd5a1,2.04,'#e7b996','#6185c2',0xb5a9a0,'#ffe0b9']];let tod=1,sunDir=new THREE.Vector3();
function setTod(i){const[n,el,az,lc,li,hz,zn,fg,cc]=TOD[i],e=el*Math.PI/180,a=az*Math.PI/180;sunDir.set(Math.cos(e)*Math.sin(a),Math.sin(e),Math.cos(e)*Math.cos(a));
 SU.sd.value.copy(sunDir);SU.hz.value.set(hz);SU.zn.value.set(zn);sun.color.setHex(lc);sun.intensity=li*.92*(Number(THREE.REVISION)>=155?Math.PI:1);S.fog.color.setHex(fg);hemi.color.set(zn);SU.cc.value.set(cc);if(window.envUp)envUp();msg(n,900)}
let mt;function msg(t,ms){$('msg').textContent=t;clearTimeout(mt);mt=setTimeout(()=>$('msg').textContent='',ms||1200)}
if(REDLINE_WORLD==='raven'){
 TOD[1]=['STORMLINE',48,151,0xe3eaf6,2.45,'#a5b4c1','#537391',0x778e9d,'#e6eef4'];
 hemi.intensity=.87;fill.intensity=.37;amb.intensity=.10;
}
setTod(1);
if(Number(THREE.REVISION)>=155){hemi.intensity*=Math.PI;fill.intensity*=Math.PI;amb.intensity*=Math.PI;}
try{
 const rCanvas=document.createElement('canvas');rCanvas.width=512;rCanvas.height=256;
 const g=rCanvas.getContext('2d');
 const skyG=g.createLinearGradient(0,0,0,256);
 skyG.addColorStop(0,'#b7cad8');skyG.addColorStop(.34,'#6d8da9');
 skyG.addColorStop(.51,REDLINE_WORLD==='raven'?'#cbd1d7':'#f1c09b');
 skyG.addColorStop(.55,'#48525c');skyG.addColorStop(1,'#17212a');
 g.fillStyle=skyG;g.fillRect(0,0,512,256);
 const light=g.createRadialGradient(390,71,0,390,71,72);
 light.addColorStop(0,'rgba(255,255,255,1)');light.addColorStop(.20,'rgba(255,245,223,.8)');light.addColorStop(1,'rgba(255,255,255,0)');
 g.fillStyle=light;g.fillRect(270,0,245,150);
 const tex=new THREE.CanvasTexture(rCanvas);tex.mapping=THREE.EquirectangularReflectionMapping;tex.encoding=THREE.sRGBEncoding;
 const probe=pmg.fromEquirectangular(tex);S.environment=probe.texture;tex.dispose();
}catch(e){console.warn('Environment reflection probe unavailable',e)}
// ---- authored canyon racing path: folded canyon meanders, hairpins and a rim traverse
// Coordinates form a simple closed spline without self-intersections (unlike a figure eight).
const COURSE_KNOTS=REDLINE_WORLD==='raven'?[
 // STORMLINE: separate high-speed coastal/industrial circuit, a broad sweeping
 // course with longer open throttle sections instead of Grand Gorge hairpins.
 [-1160,-850],[-865,-1040],[-535,-1120],[-155,-1040],[220,-920],
 [600,-730],[950,-455],[1160,-120],[1120,260],[920,635],
 [570,930],[190,1070],[-220,1040],[-565,835],[-900,520],
 [-1120,185],[-1210,-180],[-1150,-535]
]:[
 [-1110,-850],[-780,-1090],[-450,-940],[-240,-720],[20,-810],[240,-1050],
 [570,-1080],[850,-950],[1060,-720],[890,-520],[590,-520],[450,-280],
 [760,-60],[1030,140],[1070,450],[910,780],[610,990],[380,760],
 [120,510],[-140,620],[-370,940],[-720,1060],[-1090,760],
 [-1170,430],[-870,220],[-620,-80],[-890,-370],[-1130,-570]
];
const cv=new THREE.CatmullRomCurve3(COURSE_KNOTS.map(q=>new THREE.Vector3(q[0],0,q[1])),true,'catmullrom',.38);
const N=520,PX=[],PZ=[],TX=[],TZ=[],FW=[],DD=[];
const KT=[0,.07,.15,.23,.31,.40,.48,.57,.66,.76,.84,.91,1];
const KF=[100,112,62,90,115,65,120,72,80,62,105,70,100];
const wid=t=>{for(let i=0;i<KT.length-1;i++)if(t<=KT[i+1])return KF[i]+(KF[i+1]-KF[i])*sm(0,1,(t-KT[i])/(KT[i+1]-KT[i]));return KF[0]};
for(let i=0;i<=N;i++){
 const t=i/N,p=cv.getPointAt(t),d=cv.getTangentAt(t);
 PX.push(p.x);PZ.push(p.z);TX.push(d.x);TZ.push(d.z);
 // v17.5: wide, eased approach to Raven Slalom. The heightfield, river, route
 // walls and most flight-navigation logic all derive from FW. Avoid the old
 // steep pinch in the course at t≈.15, which made sharp canyon beaks visible.
 const ravenBlend=1-sm(.024,.087,Math.abs(t-.15));
 // Dedicated, softly blended open river channel through Crosswind Cut.
 // Expands both the terrain's course width and the actual river mesh.
 const crosswindWidth=sm(.215,.255,t)*(1-sm(.436,.480,t));
 FW.push((wid(t)+43*ravenBlend+24*crosswindWidth)*1.13);
 DD.push(325+30*Math.sin(t*15)+18*Math.sin(t*41));
}
const WS=3000,NS=420,NV=NS+1,CELL=WS/NS,H=new Float32Array(NV*NV);
const TC=(REDLINE_WORLD==='raven'?['#313a44','#35434d','#40505b','#52636d','#3a4b57','#566a75','#81919c','#a2acb0','#c4c7c5']:['#5a332e','#743a30','#944633','#b35b41','#854336','#bb6849','#c78459','#d5a17a','#e0ba94']).map(lin),SAND=lin(REDLINE_WORLD==='raven'?'#7b8990':'#997662'),DUST=lin(REDLINE_WORLD==='raven'?'#a8b6c0':'#c6a180'),SCRUB=lin(REDLINE_WORLD==='raven'?'#60716c':'#736c52'),BIOME_TINT=(REDLINE_WORLD==='raven'?['#8a9da3','#4a5964','#577482','#687f8a','#bac4c4']:['#d4b397','#713629','#7e5651','#8f5d48','#d1a781']).map(lin),c=new THREE.Color();
function gh(x,z){const fx=cl((x+WS/2)/CELL,0,NS-.00001),fz=cl((z+WS/2)/CELL,0,NS-.00001),i=cl(Math.floor(fx),0,NS-1),j=cl(Math.floor(fz),0,NS-1),a=fx-i,b=fz-j;return(H[j*NV+i]*(1-a)+H[j*NV+i+1]*a)*(1-b)+(H[(j+1)*NV+i]*(1-a)+H[(j+1)*NV+i+1]*a)*b}
// v42: exact nearest-route search with a coarse spatial grid. The search
// expands until the entire unvisited region is farther than the best point;
// otherwise it falls back to the original scan. The result is mathematically
// identical to v41, including points far outside the track.
const REDLINE_NEAREST_ROUTE=(()=>{
 const size=96,buckets=new Map(),key=(ix,iz)=>ix+2048*iz;
 for(let i=0;i<N;i++){
  const cell=key(Math.floor(PX[i]/size),Math.floor(PZ[i]/size));
  let list=buckets.get(cell);if(!list){list=[];buckets.set(cell,list)}
  list.push(i);
 }
 function fullScan(x,z){let best=1e12,index=0;
  for(let i=0;i<N;i++){
   const dx=x-PX[i],dz=z-PZ[i],d=dx*dx+dz*dz;
   if(d<best){best=d;index=i;}
  }
  return index;
 }
 function lookup(x,z){
  const ix=Math.floor(x/size),iz=Math.floor(z/size),qx=x-ix*size,qz=z-iz*size;
  let best=1e12,index=0;
  for(let ring=0;ring<=2;ring++){
   const lx=ix-ring,rx=ix+ring,lz=iz-ring,rz=iz+ring;
   for(let gx=lx;gx<=rx;gx++)for(let gz=lz;gz<=rz;gz++){
    if(ring>0&&gx!==lx&&gx!==rx&&gz!==lz&&gz!==rz)continue;
    const candidates=buckets.get(key(gx,gz));if(!candidates)continue;
    for(let j=0;j<candidates.length;j++){
     const i=candidates[j],dx=x-PX[i],dz=z-PZ[i],d=dx*dx+dz*dz;
     if(d<best||(d===best&&i<index)){best=d;index=i;}
    }
   }
   const safe=Math.min(qx+ring*size,(ring+1)*size-qx,qz+ring*size,(ring+1)*size-qz);
   if(safe*safe>best)return index;
  }
  return fullScan(x,z);
 }
 return {lookup,fullScan};
})();
const near=(x,z)=>REDLINE_NEAREST_ROUTE.lookup(x,z);
function tn(x,y,P,Q){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),m=(a,b)=>((a%b)+b)%b,h=(i,j)=>hash(m(i,P),m(j,Q));return(h(ix,iy)*(1-u)+h(ix+1,iy)*u)*(1-v)+(h(ix,iy+1)*(1-u)+h(ix+1,iy+1)*u)*v}
function tex(fx,fy,oct,ridge,ns){const Z=256,h=new Float32Array(Z*Z);for(let j=0;j<Z;j++)for(let i=0;i<Z;i++){let v=0,a=.5;for(let o=0;o<oct;o++){const k=1<<o;let n=tn(i/Z*fx*k,j/Z*fy*k,fx*k,fy*k);if(ridge)n=1-Math.abs(2*n-1);v+=a*n;a*=.5}h[j*Z+i]=v}
 const mk=f=>{const cv=document.createElement('canvas');cv.width=cv.height=Z;const g=cv.getContext('2d'),im=g.createImageData(Z,Z);for(let j=0;j<Z;j++)for(let i=0;i<Z;i++)f(im.data,(j*Z+i)*4,i,j);g.putImageData(im,0,0);const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t},HH=(i,j)=>h[((j+Z)%Z)*Z+(i+Z)%Z];
 return{a:mk((d,p,i,j)=>{const g=cl(.55+.9*(h[j*Z+i]-.4),0,1)*255;d[p]=d[p+1]=d[p+2]=g;d[p+3]=255}),n:mk((d,p,i,j)=>{const x=(HH(i-1,j)-HH(i+1,j))*ns,y=(HH(i,j-1)-HH(i,j+1))*ns,l=Math.hypot(x,y,1);d[p]=(x/l*.5+.5)*255;d[p+1]=(y/l*.5+.5)*255;d[p+2]=(1/l*.5+.5)*255;d[p+3]=255})}}
const RT=tex(8,8,5,true,3.2),WT=tex(10,2,4,false,3),rep=(t,x,y,enc)=>{const c2=t.clone();c2.repeat.set(x,y);c2.needsUpdate=true;if(enc)c2.encoding=THREE.sRGBEncoding;return c2},TA=rep(RT.a,260,260,1),TN=rep(RT.n,260,260);
const glow=m=>m;
const tri=m=>{
 m.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRockWorld; varying vec3 vRockNormal;');
  s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvRockWorld=(modelMatrix*vec4(transformed,1.0)).xyz;vRockNormal=normalize(mat3(modelMatrix)*normal);');
  s.fragmentShader=s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vRockWorld; varying vec3 vRockNormal;');
  s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>', `
    vec3 blend=pow(abs(normalize(vRockNormal)),vec3(5.));
    blend/=max(.00001,blend.x+blend.y+blend.z);
    // Triplanar world units: no top-down texture stretching along vertical cliff faces.
    float large=dot(blend,vec3(texture2D(map,vRockWorld.zy*.050).r,texture2D(map,vRockWorld.xz*.050).r,texture2D(map,vRockWorld.xy*.050).r));
    float fine=dot(blend,vec3(texture2D(map,vRockWorld.zy*.30).r,texture2D(map,vRockWorld.xz*.30).r,texture2D(map,vRockWorld.xy*.30).r));
    float cross=sin(vRockWorld.y*.33+sin(vRockWorld.x*.009+vRockWorld.z*.013)*2.4);
    float lamina=sin(vRockWorld.y*1.75+sin(vRockWorld.x*.032-vRockWorld.z*.017)*1.4);
    float grain=mix(large,fine,.44);
    float oxides=(.91+.07*cross+.025*lamina);
    // Joints are not painted stripes: irregular, narrow vertical fissures
    // broken up by the adjacent rock's joint offsets.
    float joint=abs(sin(vRockWorld.x*.075 + sin(vRockWorld.z*.031)*2.1
                         + sin(vRockWorld.y*.028)*.75));
    float joint2=abs(sin(vRockWorld.z*.095-sin(vRockWorld.x*.041)*1.9));
    float fissure=smoothstep(.985,.997,joint)*.62 + smoothstep(.989,.998,joint2)*.28;
    float seam=pow(1.-abs(sin(vRockWorld.y*.26+
                    sin(vRockWorld.x*.015+vRockWorld.z*.012)*2.3)),15.);
    float desertVarnish=.93+.07*sin(vRockWorld.x*.012+vRockWorld.z*.018);
    diffuseColor.rgb *= clamp((.74+.40*grain)*oxides*desertVarnish - .17*fissure -.08*seam,.47,1.09);
    `);
 };
 return m;
};
// REDLINE PBR v5 - user-provided assets.
const REDLINE_PBR_DATA = {
 'cliff_albedo': '{{REDLINE_ASSET_4b5ccdccf1ad39}}',
 'cliff_normal': '{{REDLINE_ASSET_674af82fcd3f2f}}',
 'cliff_rough': '{{REDLINE_ASSET_ba1a9d606cc4de}}',
 'bank_albedo': '{{REDLINE_ASSET_a3f32f43159613}}',
 'bank_normal': '{{REDLINE_ASSET_8d6c43e6bfc1f0}}',
 'bank_rough': '{{REDLINE_ASSET_67e5e3815357e6}}',
 'bank_ao': '{{REDLINE_ASSET_3a7bb1cf69dd96}}'
};


const PBR_TEX={};
for(const k of Object.keys(REDLINE_PBR_DATA)){
 const t=new THREE.TextureLoader().load(REDLINE_PBR_DATA[k]);
 t.wrapS=t.wrapT=THREE.RepeatWrapping;
 t.anisotropy=Math.min(4,Rn.capabilities.getMaxAnisotropy());
 t.encoding=THREE.LinearEncoding; // shader performs sRGB -> linear for albedo explicitly
 PBR_TEX[k]=t;
}
// Shader-based world-space triplanar PBR. MeshStandardMaterial handles direct
// lighting, shadows and energy-conserving specular BRDF. The custom hook supplies
// consistent albedo, roughness and tangent-space normal data on vertical cliffs.
// V6 — reduced-lookups, large-scale art-directed rock/shore PBR.
// Separate macro colour and fine normal frequency; do not wallpaper the same photo every 14 metres.
function pbrTerrain(bankBlend=false,geologyColors=false){
 const m=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.94,metalness:0,
   vertexColors:geologyColors,side:THREE.DoubleSide});
 m.onBeforeCompile=sh=>{
   for(const name of ['cliff_albedo','cliff_normal','cliff_rough'])sh.uniforms[name]={value:PBR_TEX[name]};
   if(bankBlend)for(const name of ['bank_albedo','bank_normal','bank_rough','bank_ao'])sh.uniforms[name]={value:PBR_TEX[name]};
   const bankAttr=bankBlend?'attribute float bankFactor; varying float vBankFactor;':'';
   sh.vertexShader=sh.vertexShader.replace('#include <common>',
    '#include <common>\nvarying vec3 vPbrWorld; varying vec3 vPbrGeometryN;\n'+bankAttr);
   sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    #ifdef USE_INSTANCING
     vPbrWorld=(modelMatrix*instanceMatrix*vec4(transformed,1.0)).xyz;
     vPbrGeometryN=normalize(mat3(modelMatrix*instanceMatrix)*normal);
    #else
     vPbrWorld=(modelMatrix*vec4(transformed,1.0)).xyz;
     vPbrGeometryN=normalize(mat3(modelMatrix)*normal);
    #endif
    ${bankBlend?'vBankFactor=bankFactor;':''}`);
   const defs=`
    uniform sampler2D cliff_albedo,cliff_normal,cliff_rough;
    ${bankBlend?'uniform sampler2D bank_albedo,bank_normal,bank_rough,bank_ao;':''}
    varying vec3 vPbrWorld; varying vec3 vPbrGeometryN;
    ${bankBlend?'varying float vBankFactor;':''}
    float landHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float landNoise(vec2 p){vec2 a=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(landHash(a),landHash(a+vec2(1.,0.)),f.x),
                 mix(landHash(a+vec2(0.,1.)),landHash(a+vec2(1.,1.)),f.x),f.y);}
    // Walls sample x/y or z/y, top surfaces sample x/z. Exactly one principal projection.
    vec2 rockProject(vec3 p,vec3 n){
      if(abs(n.y)>.73)return p.xz;
      return abs(n.x)>abs(n.z)?p.zy:p.xy;
    }
    vec3 rockWorldNormal(vec3 tangent,vec3 geom){
      if(abs(geom.y)>.73)return normalize(vec3(tangent.x,tangent.z*sign(geom.y),tangent.y));
      if(abs(geom.x)>abs(geom.z))return normalize(vec3(tangent.z*sign(geom.x),tangent.y,tangent.x));
      return normalize(vec3(tangent.x,tangent.y,tangent.z*sign(geom.z)));
    }
   `;
   sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+defs);
   // Vertex colours are used as controlled stratigraphic tints rather than fully multiplying the albedo.
   if(geologyColors)sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>','');
   const mixExpr=bankBlend?'smoothstep(.15,.87,vBankFactor)':'0.0';
   sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>',`
     vec3 geoN=normalize(vPbrGeometryN), P=vPbrWorld;
     vec2 unit=rockProject(P,geoN);
     vec2 warp=vec2(sin(P.x*.006+P.z*.004+P.y*.001),
                    cos(P.z*.008-P.x*.002+P.y*.0015))*.037;
     vec2 cliffMacroUv=unit*.011+warp+vec2(.13,.28);
     vec2 cliffDetailUv=unit*.049+warp*2.1+vec2(.57,.09);
     vec3 bigColor=texture2D(cliff_albedo,cliffMacroUv).rgb;
     vec3 smallColor=texture2D(cliff_albedo,cliffDetailUv).rgb;
     vec3 albedo=mix(bigColor,smallColor,.19);
     float macro=landNoise(P.xz*.0038+P.y*.0012);
     float strataPhase=P.y*.17+.60*sin(P.x*.009+P.z*.005);
     float darkBed=pow(.5+.5*cos(strataPhase),17.);
     albedo*=mix(.85,1.15,macro)*(1.-.13*darkBed);
     ${geologyColors?`#ifdef USE_COLOR
       vec3 original=clamp(${Number(THREE.REVISION)>=180?'vColor.rgb':'vColor'},vec3(.06),vec3(.95));
       float intensity=dot(original,vec3(.299,.587,.114));
       vec3 hue=clamp(original/max(intensity,.06),vec3(.70),vec3(1.38));
       albedo*=mix(vec3(1.),hue,.39)*mix(.87,1.09,smoothstep(.09,.38,intensity));
      #endif`:''}
     float bankMix=${mixExpr};
     ${bankBlend?`vec2 bankUv=P.xz*.047+warp*.5;
       vec3 bankColor=texture2D(bank_albedo,bankUv).rgb;
       bankColor*=mix(.87,1.,texture2D(bank_ao,bankUv).r)*vec3(1.11,1.055,.92);
       albedo=mix(albedo,bankColor,bankMix);
     `:''}
     // Embedded image albedos are sRGB; manual linearization before Standard BRDF.
     diffuseColor.rgb*=pow(clamp(albedo,vec3(.005),vec3(1.)),vec3(2.2));
   `);
   sh.fragmentShader=sh.fragmentShader.replace('#include <roughnessmap_fragment>',
     `#include <roughnessmap_fragment>
      float authoredRough=texture2D(cliff_rough,cliffDetailUv).r;
      ${bankBlend?'authoredRough=mix(authoredRough,texture2D(bank_rough,bankUv).r,bankMix);':''}
      roughnessFactor*=clamp(authoredRough,.75,1.0);
     `);
   sh.fragmentShader=sh.fragmentShader.replace('#include <normal_fragment_maps>',
     `#include <normal_fragment_maps>
      vec3 tangent=texture2D(cliff_normal,cliffDetailUv).rgb*2.-1.;
      vec3 relief=rockWorldNormal(tangent,geoN);
      ${bankBlend?`vec3 sandT=texture2D(bank_normal,bankUv).rgb*2.-1.;
        vec3 sandN=normalize(vec3(sandT.x,sandT.z*sign(geoN.y),sandT.y));
        relief=normalize(mix(relief,sandN,bankMix));
      `:''}
      normal=normalize(mix(normal,mat3(viewMatrix)*relief,.47));
     `);
 };
 m.customProgramCacheKey=()=>`REDLINE_V6_${bankBlend?1:0}_${geologyColors?1:0}`;
 return m;
}

const OB=[],PK=[],GP=[],GT=[],GM=[],rockMat=pbrTerrain(false),fragMat=new THREE.MeshStandardMaterial({color:0xab5940,emissive:0x361308,emissiveIntensity:.08,roughness:.8});
const WF=[],TRS=[],ZL=[],CON=[],ARCH=[],RIVER_ROCKS=[],SWINGERS=[];let WFM,BRG;
function EXTRA(dt,run,p,previous){
 updateBrokenSpillway(dt);
 if(WFM){WFM.uniforms.tm.value=time;WFM.uniforms.fogc.value.copy(S.fog.color);WF.forEach((w,k)=>w.sp.forEach((s,i)=>{const ph=(time*.32+i*.26+k*.13)%1;s.position.y=w.by+.5+ph*2.6;s.material.opacity=.12*(1-ph)*Math.min(1,ph*7);s.scale.setScalar(3.3+ph*5.2)}))}st.wet=Math.max(0,(st.wet||0)-dt*1.5);
 updateCanyonFlocks(dt,time);
 ZL.forEach(z=>{z.car.position.copy(z.cur.getPoint(.5+.45*Math.sin(time*z.sp+z.ph)));z.car.position.y-=4});
 for(const h of SWINGERS){h.angle=Math.sin(time*1.1+h.phase)*1.95;h.arm.rotation.z=h.angle;}
 $('wet').style.opacity=Math.min(1,st.wet)*.45;if(!run)return;
 for(const w of WF)for(const q of w.pts)if(Math.abs(q.y-p.y)<30&&Math.hypot(q.x-p.x,q.z-p.z)<24){st.vy-=45*dt;st.wet=1.2;if(Math.hypot(q.x-p.x,q.z-p.z)<10)st.spd*=1-.9*dt;break}
  for(const a of ARCH)if(p.distanceToSquared(a)<18*18){hitFx();msg('SANDSTONE ARCH',500);break}
  for(const t of TRS){const dx=p.x-t.x,dz=p.z-t.z,d=Math.hypot(dx,dz)||1;if(d<t.r+8&&p.y>t.y-2&&p.y<t.y+t.h){p.x+=dx/d*(t.r+8-d);p.z+=dz/d*(t.r+8-d);hitFx();redlineImpactKick(p,{nx:dx/d,ny:.16,nz:dz/d},previous)}}
 for(const h of SWINGERS){
  const dx=p.x-h.x,dz=p.z-h.z,ax=dx*h.tx+dz*h.tz;
  if(Math.abs(ax)>11)continue;
  const lat=dx*(-h.tz)+dz*h.tx,up=p.y-h.y;
  const along=cl((lat*Math.cos(h.angle)+up*Math.sin(h.angle))/h.length,0,1);
  const dist=Math.hypot(lat-Math.cos(h.angle)*along*h.length,up-Math.sin(h.angle)*along*h.length);
  if(dist<9){
   const nearestLat=Math.cos(h.angle)*along*h.length,nearestUp=Math.sin(h.angle)*along*h.length;
   let dLat=lat-nearestLat,dUp=up-nearestUp,n=Math.hypot(dLat,dUp);
   if(n<.0001){dLat=0;dUp=1;n=1;}
   const push=(9-dist)+.15;
   p.x+=-h.tz*dLat/n*push;p.z+=h.tx*dLat/n*push;p.y+=dUp/n*push;
   hitFx();msg('IRONWALL SWING ARM',700);
  }
 }
 // Large hawks and ravens are moving, telegraphed obstacles with swept hit tests.
 checkBirdStrikes(p,previous,dt);
 for(const z of ZL){if(z.car.position.distanceTo(p)<13)hitFx();for(const q of z.pts)if(q.distanceTo(p)<9){hitFx();msg('CABLE!',500);break}}
 if(BRG){const rx=p.x-BRG.x,rz=p.z-BRG.z,a=rx*BRG.tx+rz*BRG.tz,l=rx*BRG.nx+rz*BRG.nz;if(Math.abs(a)<7&&Math.abs(l-(BRG.off||0))<BRG.h&&Math.abs(p.y-BRG.y)<8){hitFx();p.y+=p.y>BRG.y?1:-1;msg('BRIDGE!',500)}}}
const CU={tm:{value:0}};let BG;
function ftex(){const c=document.createElement('canvas');c.width=64;c.height=256;const g=c.getContext('2d');
 for(let y=0;y<256;y++){const t=y/255,w=(Math.sin(Math.PI*Math.pow(t,.7))*.5+.04)*60*(1-.25*t);for(let x=0;x<w;x++){const sh=.5+.5*Math.sin(x*3.1+y*.9+hash(x,y)*3),l=14+sh*12+(1-t)*6+(x/w>.8?10:0);g.fillStyle='rgb('+(l+7)+','+(l+4)+','+l+')';g.fillRect(32+x,y,1,1);g.fillRect(31-x,y,1,1)}}
 g.fillStyle='#6a5d4c';g.fillRect(31,0,2,256);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return t}
function fb(){const P=[],U=[],A=[],Q=[],I=[];let n=0;return{
 fe(rx,rz,ang,len,w,up,pc,sf,fl,y0){const dx=Math.cos(ang),dz=Math.sin(ang),px=-dz,pz=dx;
  for(let i=0;i<=5;i++){const t=i/5,cx=rx+dx*len*t,cz=rz+dz*len*t,y=(y0||0)+up*t*t;for(const s of[-1,1]){P.push(cx+px*w/2*s,y,cz+pz*w/2*s);U.push(s<0?0:1,1-t);A.push(sf,fl);Q.push(pc)}}
  for(let i=0;i<5;i++){const a=n+i*2;I.push(a,a+1,a+2,a+1,a+3,a+2)}n+=12},
 geo(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setAttribute('ag',new THREE.Float32BufferAttribute(A,2));g.setAttribute('pc',new THREE.Float32BufferAttribute(Q,1));g.setIndex(I);g.computeVertexNormals();return g}}}
const sg=(rx,ry,rz,x,y,z,wr)=>{const g=new THREE.SphereGeometry(1,18,12),p=g.attributes.position;if(wr)for(let i=0;i<p.count;i++){const k=1+(vn(p.getX(i)*5+3,p.getY(i)*5+p.getZ(i)*4)-.5)*wr;p.setXYZ(i,p.getX(i)*k,p.getY(i)*k,p.getZ(i)*k)}g.scale(rx,ry,rz);g.translate(x,y,z);g.computeVertexNormals();return g};

// REDLINE v9: photorealism-conscious bird silhouettes and instanced canyon flocks.
// A unified low-poly hawk/raven mesh replaces ~20+ draw calls per previous bird.
const BIRD_FLOCKS=[];let birdFlockTick=0;
function buildCanyonBirdGeometry(kind){
 const pos=[],nor=[],cols=[],lifts=[];
 const hawk=kind===0;
 const palette=hawk?{
  body:0x5e4635, head:0x776044,wing:0x6b5039,edge:0x332820,under:0xb4a18a,tail:0x9c5737,beak:0xd7ba79
 }:{body:0x252b32,head:0x323940,wing:0x28303a,edge:0x171d22,under:0x4b4f51,tail:0x20252b,beak:0x34383a};
 function tri(a,b,c,color,wa=0,wb=wa,wc=wa){
  const ab=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
  const ac=new THREE.Vector3(c[0]-a[0],c[1]-a[1],c[2]-a[2]);
  const n=ab.cross(ac).normalize(),cc=new THREE.Color(color);
  for(const [v,w] of [[a,wa],[b,wb],[c,wc]]){
   pos.push(v[0],v[1],v[2]);nor.push(n.x,n.y,n.z);cols.push(cc.r,cc.g,cc.b);lifts.push(w);
  }
 }
 function quad(a,b,c,d,color,wa=0,wb=wa,wc=wb,wd=wa){tri(a,b,c,color,wa,wb,wc);tri(a,c,d,color,wa,wc,wd)}
 function append(g,color){
  const p=g.getAttribute('position'),n=g.getAttribute('normal'),idx=g.getIndex();
  const count=idx?idx.count:p.count,cc=new THREE.Color(color);
  for(let i=0;i<count;i++){
   const j=idx?idx.getX(i):i;pos.push(p.getX(j),p.getY(j),p.getZ(j));
   nor.push(n.getX(j),n.getY(j),n.getZ(j));cols.push(cc.r,cc.g,cc.b);lifts.push(0);
  }
 }
 append(sg(.16,.12,.42,0,0,0,.08),palette.body);
 append(sg(.10,.10,.14,0,.03,-.37,.08),palette.head);
 // Hooked beak, pointed in the direction of flight (-Z)
 append(new THREE.ConeGeometry(.045,.15,6).rotateX(-Math.PI/2).translate(0,.008,-.54),palette.beak);
 // Broad fanned tail for a soaring hawk; narrower pointed wedge for ravens.
 const tailWide=hawk?.30:.15,tailBack=hawk?.68:.87;
 quad([-tailWide,.01,.37],[tailWide,.01,.37],[tailWide*(hawk?.88:.45),.018,tailBack],[-tailWide*(hawk?.88:.45),.018,tailBack],palette.tail);
 // Distinct wing planform: broad inner wing, angled wrist, feathered outer primaries.
 for(const side of [-1,1]){
  const m=(x,y,z)=>[side*x,y,z],
        root=m(.13,.04,-.25),front=m(.60,.045,-.40),wrist=m(hawk?1.13:1.22,.05,-.26),
        tip=m(hawk?1.50:1.67,.055,-.08),trailing=m(hawk?1.24:1.37,.035,.29),elbow=m(.67,.03,.30),base=m(.14,.03,.22);
  tri(root,front,base,palette.wing,0,.45,0);
  tri(front,elbow,base,palette.under,.45,.48,0);
  quad(front,wrist,trailing,elbow,palette.wing,.45,.83,.85,.48);
  tri(wrist,tip,trailing,palette.edge,.83,1,.85);
  // Seven separated primary feathers with alternating dark tips, rather than
  // an unbroken triangular cartoon wing.
  for(let i=0;i<7;i++){
   const u=i/7,v=(i+1)/7,x=.78+u*.56,x2=.78+v*.56;
   const z=.26+u*.12,z2=.26+v*.12;
   tri(m(x,.03,z),m(x2,.03,z2),m(x+.13+u*.12,.025,z+.22+(1-u)*.13),i%2?palette.edge:palette.wing,.60+u*.31,.65+v*.3,.73+u*.25);
  }
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
 g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
 g.setAttribute('flapWeight',new THREE.Float32BufferAttribute(lifts,1));
 g.computeBoundingSphere();return g;
}
function initCanyonFlocks(){
 for(const [kind,count] of [[0,7],[1,11]]){
  const material=new THREE.MeshLambertMaterial({color:0xffffff,vertexColors:true,side:THREE.DoubleSide});
  material.onBeforeCompile=shader=>{
   shader.uniforms.birdFlightTime={value:0};material.userData.birdTime=shader.uniforms.birdFlightTime;
   shader.vertexShader=shader.vertexShader.replace('#include <common>',
     '#include <common>\nattribute float flapWeight; uniform float birdFlightTime;');
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
     `#include <begin_vertex>
      #ifdef USE_INSTANCING
      float phase=instanceMatrix[3].x*.029+instanceMatrix[3].z*.011;
      #else
      float phase=0.;
      #endif
      float flap=sin(birdFlightTime*${kind===0?'1.35':'3.5'}+phase);
      transformed.y+=flapWeight*(${kind===0?'0.07+0.12':'0.08+0.24'}*flap);
      transformed.z+=flapWeight*flapWeight*.045*flap;`);
  };
  const mesh=new THREE.InstancedMesh(buildCanyonBirdGeometry(kind),material,count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
  const states=[];
  const hazardRoutes=kind===0?[
   [.119,70], [.259,112], [.438,97], [.553,113], [.701,83], [.824,64], [.921,114]
  ]:[
   [.096,81], [.178,62], [.291,106], [.354,75], [.474,66], [.520,91],
   [.599,97], [.679,75], [.762,76], [.855,96], [.954,92]
  ];
  for(let k=0;k<count;k++){
   const seed=kind*97+k,[anchor,altitude]=hazardRoutes[k];
   states.push({anchor,u:anchor,altitude,
    lateral:(hash(seed,17)*1.2-.6),phase:hash(seed,31)*6.283,
    scale:(kind===0?7.1:5.5)*(0.89+.19*hash(seed,43)),
    position:new THREE.Vector3(),prev:new THREE.Vector3(),radius:0,
    cooldown:0,kind});
  }
  BIRD_FLOCKS.push({kind,mesh,states});S.add(mesh);
 }
 updateCanyonFlocks(1,0);
}
const _birdDummy=new THREE.Object3D();
function updateCanyonFlocks(dt,now){
 birdFlockTick+=dt;
 if(birdFlockTick<1/12 && now!==0){
  for(const f of BIRD_FLOCKS)if(f.mesh.material.userData.birdTime)
   f.mesh.material.userData.birdTime.value=now;
  return;
 }
 birdFlockTick=0;
 const drone=now===0?null:st.p;
 for(const flock of BIRD_FLOCKS){
  flock.states.forEach((b,i)=>{
   const phase=now*.42+b.phase;
   b.u=(b.anchor+Math.sin(now*.28+b.phase)*.006+1)%1;
   const j=Math.floor(b.u*N)%N,w=FW[j];
   const lateral=w*(b.lateral*.42+Math.sin(now*.58+b.phase)*.30);
   const x=PX[j]-TZ[j]*lateral,z=PZ[j]+TX[j]*lateral;
   b.prev.copy(b.position);
   b.position.set(x,b.altitude+Math.sin(now*.65+b.phase)*6.5,z);
   b.radius=b.scale*(b.kind===0?1.60:1.75);
   _birdDummy.position.copy(b.position);
   _birdDummy.rotation.set(.08*Math.sin(phase),Math.atan2(-TX[j],-TZ[j])+.3*Math.sin(now*.2+b.phase),
                           .16*Math.sin(now*.68+b.phase),'YXZ');
   // Cull distant flock members without shadow rendering or expensive CPU LOD.
   const visible=!drone || b.position.distanceToSquared(drone)<850*850;
   _birdDummy.scale.setScalar(visible?b.scale:0);
   _birdDummy.updateMatrix();
   flock.mesh.setMatrixAt(i,_birdDummy.matrix);
  });
  flock.mesh.instanceMatrix.needsUpdate=true;
  if(flock.mesh.material.userData.birdTime)flock.mesh.material.userData.birdTime.value=now;
 }
}
function checkBirdStrikes(p,previous,dt){
 if(st.ic>0)return;
 for(const flock of BIRD_FLOCKS){
  for(const b of flock.states){
   if(b.cooldown>time || Math.abs(p.y-b.position.y)>b.radius+9)continue;
   const r=b.radius+6.5;
   // Swept sphere-vs-flight-segment, so a fast drone does not tunnel through birds.
   const ax=previous.x,ay=previous.y,az=previous.z;
   const dx=p.x-ax,dy=p.y-ay,dz=p.z-az,len2=dx*dx+dy*dy+dz*dz;
   const t=len2>1e-5?cl(((b.position.x-ax)*dx+(b.position.y-ay)*dy+
                     (b.position.z-az)*dz)/len2,0,1):0;
   const sx=ax+dx*t-b.position.x,sy=ay+dy*t-b.position.y,sz=az+dz*t-b.position.z;
   if(sx*sx+sy*sy+sz*sz>r*r)continue;
   b.cooldown=time+1.5;
   const separation=new THREE.Vector3(p.x-b.position.x,p.y-b.position.y,p.z-b.position.z);
   if(separation.lengthSq()<1e-5)separation.set(-1,.3,0);
   separation.normalize();
   p.addScaledVector(separation,Math.min(4.0,Math.max(1.2,r-Math.sqrt(sx*sx+sy*sy+sz*sz))));
   hitFx();msg(b.kind===0?'HAWK STRIKE — AVOID THE WINGSPAN':'RAVEN STRIKE — EVASIVE ACTION',900);
   return;
  }
 }
}

function mkBird(g){
 if(!BG){const fm=new THREE.MeshStandardMaterial({map:ftex(),alphaTest:.4,side:THREE.DoubleSide,roughness:.75});
  fm.onBeforeCompile=s=>{s.uniforms.tm=CU.tm;s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 ag;attribute float pc;varying float vPc;uniform float tm;').replace('#include <begin_vertex>','#include <begin_vertex>\nfloat sf=ag.x;transformed.y+=sf*sf*.12*sin(tm*1.1+sf*2.)+ag.y*.04*sin(tm*3.+transformed.x*9.);vPc=pc;');
   s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying float vPc;').replace('#include <color_fragment>','#include <color_fragment>\nif(!gl_FrontFacing)diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.9,.88,.82),vPc);')};
  const dk=new THREE.MeshStandardMaterial({color:lin('#1c1814'),roughness:.85}),sk=new THREE.MeshStandardMaterial({color:lin('#d4683c'),roughness:.65}),bk=new THREE.MeshStandardMaterial({color:lin('#dcd2b4'),roughness:.45}),ey=new THREE.MeshStandardMaterial({color:0x080504,roughness:.1}),lg=new THREE.MeshStandardMaterial({color:lin('#8c8a82'),roughness:.8});
  const w=fb(),t=fb(),PI=Math.PI;
  for(let j=0;j<14;j++){const f=j/13;w.fe(.18+.78*f,-.02,PI/2-.18*f,.46+.06*(1-f),.09,.01,0,(.18+.78*f)/1.5,0)}
  for(let i=0;i<9;i++)w.fe(.9+.02*i,-.08+.015*i,.05+i*.13,.5+.14*Math.sin((i+.5)/9*PI),.1,.07+.05*(1-i/8),0,1,1);
  for(let r=0;r<3;r++)for(let j=0;j<16;j++){const f=j/15,x=.15+.8*f;w.fe(x,-.05+r*.08,PI/2-.12*f,.24-r*.03,.08,.006,(r<2&&j>2&&j<12)?1:0,x/1.5,0,.004*(r+1))}
  for(let j=0;j<16;j++){const f=j/15,x=.12+.8*f;w.fe(x,-.1,PI/2,.12,.07,.004,0,x/1.5,0,.012)}
  for(let i=0;i<12;i++)t.fe(0,0,PI/2+(i-5.5)*.065,.4,.1,0,0,0,.4);
  const nk=new THREE.CylinderGeometry(.04,.055,.2,10).rotateX(-PI/2).translate(0,.02,-.1),bg=new THREE.ConeGeometry(.034,.12,10).rotateX(-PI/2).translate(0,0,-.37),bp=bg.attributes.position;
  for(let i=0;i<bp.count;i++){const z=bp.getZ(i);bp.setY(i,bp.getY(i)-Math.pow(Math.max(0,-.34-z),2)*9)}bg.computeVertexNormals();
  const lgf=x=>new THREE.CylinderGeometry(.012,.012,.2,6).rotateX(PI/2).translate(x,-.09,.28);
  BG={fm,wing:w.geo(),tail:t.geo(),body:[[sg(.17,.14,.4,0,0,.02,.06),dk],[sg(.15,.1,.12,0,.05,-.36,.1),dk],[lgf(.05),lg],[lgf(-.05),lg]],head:[[nk,sk],[sg(.06,.065,.085,0,.015,-.25,.28),sk],[bg,bk],[sg(.012,.012,.012,.05,.03,-.24),ey],[sg(.012,.012,.012,-.05,.03,-.24),ey]]}}
 const add=(p,b)=>{const o=new THREE.Mesh(b[0],b[1]);p.add(o);return o};
 BG.body.forEach(b=>add(g,b));
 const hd=new THREE.Group();hd.position.set(0,.06,-.4);BG.head.forEach(b=>add(hd,b));g.add(hd);
 const tl=new THREE.Group();tl.position.set(0,0,.38);add(tl,[BG.tail,BG.fm]);g.add(tl);
 const p1=new THREE.Group(),p2=new THREE.Group();p1.position.set(0,.07,-.12);p2.position.copy(p1.position);add(p1,[BG.wing,BG.fm]);add(p2,[BG.wing,BG.fm]).scale.x=-1;g.add(p1,p2);
 return{p1,p2,hd,tl}}
const GATES=REDLINE_WORLD==='raven'?[
 [.195,87,30,'BREAKWATER'],[.395,95,30,'TURBINE RUN'],
 [.605,115,31,'STORMLINE SPAN'],[.825,91,32,'COASTAL FINISH']
]:[
 [0.075,91,29,'CANYON ENTRY'],[.156,86,28,'RAVEN SLALOM'],
 [.240,116,28,'RIM CLIMB'],[.322,64,27,'CROSSWIND CUT'],
 [.404,101,28,'NEEDLE PASS'],[.486,56,27,'LOW LINE'],
 [.565,113,29,'SKY BRIDGE'],[.646,64,28,'SCARLET SWITCHBACK'],
 [.725,80,29,'IRONWALL'],[.803,52,27,'THE NARROWS'],
 [.883,123,29,'THERMAL RISE'],[0,84,31,'FINISH / ENTRY']
 ];

// OPTIONAL CHALLENGE: a carved 3D canyon ravine between existing checkpoints.
// Shorter than the hairpin river course, with a narrow clearance and sidewind.
const CUT_A=.253,CUT_B=.311;
const cutA=cv.getPointAt(CUT_A),cutB=cv.getPointAt(CUT_B);
const cutDir=cutB.clone().sub(cutA).normalize();
const cutN=new THREE.Vector3(-cutDir.z,0,cutDir.x);
const oldMiddle=cv.getPointAt((CUT_A+CUT_B)*.5),cutMid=cutA.clone().lerp(cutB,.5);
const cutAway=Math.sign(oldMiddle.clone().sub(cutMid).dot(cutN))||1;
const CUT_POINTS=[];
for(let k=0;k<=36;k++){
 const u=k/36,q=cutA.clone().lerp(cutB,u);
 q.addScaledVector(cutN,-cutAway*(30*Math.sin(Math.PI*u)+8*Math.sin(Math.PI*u*2)));
 CUT_POINTS.push(q);
}
const CUT_BOUNDS={minX:Math.min(...CUT_POINTS.map(p=>p.x))-90,maxX:Math.max(...CUT_POINTS.map(p=>p.x))+90,
 minZ:Math.min(...CUT_POINTS.map(p=>p.z))-90,maxZ:Math.max(...CUT_POINTS.map(p=>p.z))+90};
function cutNearest(x,z){
 if(x<CUT_BOUNDS.minX||x>CUT_BOUNDS.maxX||z<CUT_BOUNDS.minZ||z>CUT_BOUNDS.maxZ)return null;
 let nearest=1e15,out=null;
 for(let j=0;j<CUT_POINTS.length-1;j++){
  const a=CUT_POINTS[j],b=CUT_POINTS[j+1],dx=b.x-a.x,dz=b.z-a.z;
  const u=cl(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1),ex=x-a.x-u*dx,ez=z-a.z-u*dz,d=ex*ex+ez*ez;
  if(d<nearest){nearest=d;const ll=Math.hypot(dx,dz)||1;out={d:Math.sqrt(d),u:(j+u)/(CUT_POINTS.length-1),tx:dx/ll,tz:dz/ll}}
 }
 return out;
}

// River surface: continuously advected flow in river-tangent UV coordinates.
// This is game-oriented shallow-water behaviour (not a Navier–Stokes solver).
const WATER_HEIGHT = 2.25;
const RIVER_UNIFORMS = {
  tm:{value:0}, sd:{value:sunDir}, sunTint:{value:new THREE.Color(1,.9,.78)},
  atmosphere:{value:new THREE.Color(.60,.41,.34)}, sceneColor:{value:null}, refractEnabled:{value:0},screenSize:{value:new THREE.Vector2(1,1)}
};

// SOLVED SHALLOW-WATER HYDRODYNAMICS — finite-volume Rusanov flux for
// (depth, streamwise momentum, transverse momentum). Cell-area weighting
// conserves volume as the channel changes width. Sources: bathymetric
// pressure, bed shear, external imposed-head drive around the closed loop.
// This is a genuine 2D depth-integrated physics solver. It is not a 3D
// Navier–Stokes / spray / gas entrainment simulation.
const HYDRO={nx:260,ny:15,g:9.81,dt:1/50,acc:0,ready:false,
 init(){
  const {nx,ny}=this,num=nx*ny;
  this.h=new Float32Array(num);this.mx=new Float32Array(num);this.my=new Float32Array(num);
  this.b=new Float32Array(num);this.dh=new Float32Array(num);
  this.dmx=new Float32Array(num);this.dmy=new Float32Array(num);this.foam=new Float32Array(num);
  // v42: 3900 cells, 50 solver steps/sec. No fresh flux arrays or state
  // buffers during racing. Prevents recurring GC stalls on slower machines.
  this.fluxScratch=new Float64Array(3);
  this.nextH=new Float32Array(num);this.nextMx=new Float32Array(num);this.nextMy=new Float32Array(num);
  this.w=new Float32Array(nx);this.area=new Float32Array(nx);this.dx=new Float32Array(nx);
  let dist=0;
  for(let i=0;i<nx;i++){
   const k=Math.floor(i*N/nx),k2=Math.floor(((i+1)%nx)*N/nx);
   const ll=Math.hypot(PX[k2]-PX[k],PZ[k2]-PZ[k]);
   this.dx[i]=Math.max(8,ll);this.w[i]=FW[k]*1.12/ny;this.area[i]=this.w[i]*this.dx[i];dist+=this.dx[i];
   for(let j=0;j<ny;j++){
    const a=i*ny+j,u=(j+.5)/ny*2-1;
    // Depth and bathymetry: a deeper thalweg and rock-promoted shallows.
    const bed=-3.8+2.5*Math.pow(Math.abs(u),2.7)+.40*Math.sin(i*.078+u*4)
              +.27*Math.sin(i*.27+u*12.3)+.23*Math.cos(i*.14-u*7.1);
    let obstruction=0;
    for(let rr=0;rr<RIVER_ROCKS.length;rr++){
     const r=RIVER_ROCKS[rr],idx=near(r.x,r.z);
     const ii=Math.round(idx/nx*N); // coarse exclusion; precise rocks stay game colliders
     if(Math.abs(idx-k)>8)continue;
     const across=(r.x-PX[k])*(-TZ[k])+(r.z-PZ[k])*TX[k];
     const widthHalf=FW[k]*.56;
     const side=widthHalf*u;
     const ds=(across-side)/Math.max(6,r.r*1.7);
     const along=(idx-k)/5;
     obstruction=Math.max(obstruction,2.6*Math.exp(-ds*ds*2.5-along*along));
    }
    this.b[a]=bed+obstruction;
    this.h[a]=Math.max(.12,WATER_HEIGHT-this.b[a]);
    this.mx[a]=this.h[a]*3.8;this.my[a]=0;
  }}
  // Geometry is already laid out on the periodic river centerline.
  this.mesh=window.RV;this.geo=this.mesh.geometry;
  this.pos=this.geo.attributes.position;this.vel=this.geo.attributes.flowSpeed;
  this.depth=this.geo.attributes.depth;this.foamAttribute=this.geo.attributes.foam;
  this.pos.setUsage(THREE.DynamicDrawUsage);this.vel.setUsage(THREE.DynamicDrawUsage);
  this.depth.setUsage(THREE.DynamicDrawUsage);this.foamAttribute.setUsage(THREE.DynamicDrawUsage);
  this.ready=true;this.surface();window.REDLINE_HYDRO=this;
 },
 flux(hl,ml,vl,hr,mr,vr,axis,out){
   const ul=ml/Math.max(.08,hl),ur=mr/Math.max(.08,hr),
       wl=vl/Math.max(.08,hl),wr=vr/Math.max(.08,hr);
   const c=Math.max(Math.abs(ul)+Math.sqrt(this.g*hl),Math.abs(ur)+Math.sqrt(this.g*hr));
   out[0]=.5*(ml+mr)-.5*c*(hr-hl);
   out[1]=.5*(ml*ul+mr*ur+.5*this.g*(hl*hl+hr*hr))-.5*c*(mr-ml);
   out[2]=.5*(vl*ul+vr*ur)-.5*c*(vr-vl);
   return out;
 },
 step(dt){
  if(!this.ready)this.init();
  this.acc=Math.min(.10,this.acc+dt);
  let count=0;
  while(this.acc>=this.dt&&count++<5){this.solve(this.dt);this.acc-=this.dt}
  if(count>1)this.surface();
 },
 solve(dt){
  const nx=this.nx,ny=this.ny,n=nx*ny,g=this.g;
  const dh=this.dh,dmx=this.dmx,dmy=this.dmy,h=this.h,mx=this.mx,my=this.my,b=this.b;
  dh.fill(0);dmx.fill(0);dmy.fill(0);
  // x-oriented fluxes: periodic. Fluxes applied pairwise to conserve volume.
  for(let i=0;i<nx;i++){
   const ip=(i+1)%nx,dx=.5*(this.dx[i]+this.dx[ip]);
   const fw=.5*(this.w[i]+this.w[ip]);
   for(let j=0;j<ny;j++){
    const a=i*ny+j,z=ip*ny+j,hl=h[a],hr=h[z];
    const f=this.flux(hl,mx[a],my[a],hr,mx[z],my[z],0,this.fluxScratch);
    const scaleA=dt*fw/this.area[i],scaleB=dt*fw/this.area[ip];
    dh[a]-=scaleA*f[0];dh[z]+=scaleB*f[0];
    dmx[a]-=scaleA*f[1];dmx[z]+=scaleB*f[1];
    dmy[a]-=scaleA*f[2];dmy[z]+=scaleB*f[2];
   }
  }
  // y-oriented fluxes: transmissive internal faces, zero flux into rock banks.
  for(let i=0;i<nx;i++){
   const f=dt*this.dx[i]/this.area[i];
   for(let j=0;j<ny-1;j++){
    const a=i*ny+j,z=a+1,hl=h[a],hr=h[z];
    // Rotate the vector components: transverse is flux-normal here.
    const flux=this.flux(hl,my[a],mx[a],hr,my[z],mx[z],1,this.fluxScratch);
    dh[a]-=f*flux[0];dh[z]+=f*flux[0];
    dmy[a]-=f*flux[1];dmy[z]+=f*flux[1];
    dmx[a]-=f*flux[2];dmx[z]+=f*flux[2];
   }
  }
  const nextH=this.nextH,nextMx=this.nextMx,nextMy=this.nextMy;
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){
   const a=i*ny+j,im=((i+nx-1)%nx)*ny+j,ip=((i+1)%nx)*ny+j,
         jm=i*ny+Math.max(0,j-1),jp=i*ny+Math.min(ny-1,j+1);
   const hh=Math.max(.08,h[a]+dh[a]);
   let ux=(mx[a]+dmx[a])/Math.max(hh,.08),uy=(my[a]+dmy[a])/Math.max(hh,.08);
   const slopeX=(b[ip]-b[im])/Math.max(1,this.dx[i]+this.dx[(i+nx-1)%nx]);
   const slopeY=(b[jp]-b[jm])/Math.max(1,this.w[i]*(j>0&&j<ny-1?2:1));
   // Background head gradient through periodic corridor emulates discharge.
   ux+=dt*(-g*slopeX + .115-.036*ux);
   uy+=dt*(-g*slopeY - .11*uy);
   ux=Math.max(-16,Math.min(16,ux));uy=Math.max(-8,Math.min(8,uy));
   nextH[a]=hh;nextMx[a]=ux*hh;nextMy[a]=uy*hh;
   // Foam production depends on physical local currents and obstruction gradients.
   const bSlope=Math.abs(b[ip]-b[a])/this.dx[i]+Math.abs(b[jp]-b[a])/this.w[i];
   const turbulence=Math.abs(my[a]/Math.max(hh,.08))*.035+
         Math.abs(mx[ip]/Math.max(h[ip],.08)-mx[im]/Math.max(h[im],.08))*.016;
   this.foam[a]=Math.min(.9,this.foam[a]*.987+dt*(Math.max(0,bSlope-.036)*.25+turbulence));
  }
  this.h=nextH;this.mx=nextMx;this.my=nextMy;
  this.nextH=h;this.nextMx=mx;this.nextMy=my;
 },
 surface(){
  if(!this.ready)return;
  const ny=this.ny,nx=this.nx,pos=this.pos,velocity=this.vel,depth=this.depth,fo=this.foamAttribute;
  for(let i=0;i<=nx;i++)for(let j=0;j<ny;j++){
   const k=(i%nx)*ny+j,idx=i*ny+j;
   let depthVal=this.h[k],speed=Math.hypot(this.mx[k],this.my[k])/Math.max(.08,depthVal);
   const level=this.b[k]+depthVal;
   pos.setY(idx,level+.020*Math.sin(i*.19+j*.71+time*.9));
   velocity.setX(idx,Math.max(.35,Math.min(2.3,speed/4.2)));
   depth.setX(idx,Math.max(.08,depthVal));
   fo.setX(idx,this.foam[k]);
  }
  pos.needsUpdate=true;velocity.needsUpdate=true;depth.needsUpdate=true;fo.needsUpdate=true;
  this.geo.computeVertexNormals();this.geo.attributes.normal.needsUpdate=true;
 },
 velocityNear(x,z){
  if(!this.ready)return [0,0];const i=Math.floor(near(x,z)/N*this.nx)%this.nx,
    k=Math.floor(i*N/this.nx),lat=(x-PX[k])*(-TZ[k])+(z-PZ[k])*TX[k],
    j=Math.min(this.ny-1,Math.max(0,Math.floor((lat/(FW[k]*.56)*.5+.5)*this.ny)));
  const p=i*this.ny+j,h=Math.max(.08,this.h[p]);return [this.mx[p]/h,this.my[p]/h];
 },
 stats(){
  let v=0,min=Infinity,max=-Infinity;
  for(let i=0;i<this.nx;i++)for(let j=0;j<this.ny;j++){
   const k=i*this.ny+j,d=this.h[k];v+=d*this.area[i];min=Math.min(min,d);max=Math.max(max,d);
  }return {volume:v,minDepth:min,maxDepth:max};
 }
};

function createRiverMaterial(){
 return new THREE.ShaderMaterial({uniforms:RIVER_UNIFORMS,side:THREE.DoubleSide,
  transparent:false,depthWrite:true,
  vertexShader:`
   uniform float tm;
   attribute vec2 current;attribute float flowSpeed;attribute float depth;attribute float foam;
   varying vec2 vUv;varying vec3 vWorld;varying vec3 vNormal;
   varying vec2 vCurrent;varying float vFlowSpeed,vDepth,vFoam;
   void main(){
    vUv=uv;vCurrent=current;vFlowSpeed=flowSpeed;vDepth=depth;vFoam=foam;
    vec3 p=position;
    // Sub-grid capillary effects layered over the finite-volume free surface.
    float micro=sin(uv.y*7.1-tm*4.1*flowSpeed+uv.x*17.0);
    p.y+=.045*micro+.025*sin(uv.y*25.5-tm*9.2*flowSpeed);
    vWorld=(modelMatrix*vec4(p,1.0)).xyz;
    vNormal=normalize(mat3(modelMatrix)*normal);
    gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.0);
   }`,
  fragmentShader:`
   uniform float tm;uniform vec3 sd,sunTint,atmosphere; uniform sampler2D sceneColor; uniform float refractEnabled;uniform vec2 screenSize;
   varying vec2 vUv;varying vec3 vWorld;varying vec3 vNormal;
   varying vec2 vCurrent;varying float vFlowSpeed,vDepth,vFoam;
   float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float ns(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(hs(i),hs(i+vec2(1.,0.)),f.x),
      mix(hs(i+vec2(0.,1.)),hs(i+vec2(1.,1.)),f.x),f.y);}
   void main(){
    float sp=max(.3,vFlowSpeed),s=tm*sp;
    vec2 q1=vec2(vUv.x*15.,vUv.y*12.-s*2.5),q2=vec2(vUv.x*37.,vUv.y*32.-s*5.2);
    vec2 q3=vec2(vUv.x*68.,vUv.y*51.-s*8.7);
    float a=ns(q1),b=ns(q2),c=ns(q3);
    float rip=sin(q1.y*3.+2.*a)*.44+sin(q2.y*2.6+q2.x*.8)*.32;
    vec3 dir=normalize(vec3(vCurrent.x,0.,vCurrent.y));
    vec3 side=vec3(-dir.z,0.,dir.x);
    vec3 normal=normalize(vNormal+side*(.085*rip+.075*(b-.5))+
          dir*(.08*sin(q3.y+q3.x)+.05*(c-.5)));
    vec3 view=normalize(cameraPosition-vWorld),light=normalize(sd);
    float angle=clamp(dot(normal,view),0.,1.);
    // Schlick Fresnel with F0~0.020 for air-to-water interface.
    float fres=.02+.98*pow(1.-angle,5.);
    // Approximate physically based underwater extinction and bottom tint.
    float path=vDepth/max(.18,angle);
    vec3 extinction=exp(-vec3(.25,.12,.095)*path);
    vec3 bed=vec3(.36,.27,.18)*(0.65+.35*ns(vUv*vec2(38.,70.)));
    vec3 deep=vec3(.014,.120,.145),water=mix(deep,bed,extinction);
    vec3 sky=mix(vec3(.16,.35,.56),vec3(.66,.75,.81),pow(max(normal.y,0.),1.7));
    vec3 warm=vec3(.56,.33,.20);
    sky=mix(sky,warm,clamp((1.-sd.y)*.33,0.,.30));
    float glint=pow(max(dot(reflect(-light,normal),view),0.),170.)*2.1;
    float glintFine=pow(max(dot(reflect(-light,normal),view),0.),420.)*1.5;
    vec3 color=mix(water,sky,clamp(fres*.88+.16,0.,.94));
    // Refraction of the scene through the numerical water surface (Ultra only).
    vec2 screenUV=gl_FragCoord.xy/max(screenSize,vec2(1.));
    vec2 offset=vec2(rip,ns(q2)-.5)*(.005+.003*sp)*max(.3,1.-vDepth/15.);
    vec3 behind=texture2D(sceneColor,clamp(screenUV+offset,vec2(.003),vec2(.997))).rgb;
    float transmit=(1.-fres)*exp(-vDepth*.25)*.47*refractEnabled;
    color=mix(color,behind,transmit);
    color+=sunTint*(glint+glintFine)*(.25+.65*angle);
    float edge=clamp(min(vUv.x,1.-vUv.x)*2.,0.,1.);
    float bank=pow(1.-smoothstep(0.,.115,edge),1.1);
    float breaking=pow(max(0.,sin(q1.y*3.1+2.5*a)),7.)*.33;
    float filaments=smoothstep(.68,.87,b)*smoothstep(.38,.66,c);
    float foam=clamp(vFoam*.93+bank*(.17+.22*a)+
       (breaking+filaments*.16)*(.22+.24*sp)*max(.18,1.-.7*edge),0.,.85);
    color=mix(color,vec3(.78,.85,.84),foam);
    // Depth tint is sea-green in pools and gold on the shallow margins.
    color=mix(color,vec3(.35,.34,.25),.09*(1.-edge)*(1.-foam));
    float haze=clamp((length(vWorld-cameraPosition)-750.)/2150.,0.,.32);
    gl_FragColor=vec4(mix(color,atmosphere,haze),1.0);
   }`
 });
}

// Hand-built, instanced riparian cottonwoods and twisted junipers.
// Shared branch/leaf geometry keeps the draw calls low even with hundreds of stems.
function makeLeafClusterTexture(){
 const cvs=document.createElement('canvas');cvs.width=cvs.height=128;
 const cx=cvs.getContext('2d');cx.clearRect(0,0,128,128);
 for(let l=0;l<135;l++){
  const a=hash(l,831)*Math.PI*2,rad=Math.sqrt(hash(l,832))*.44;
  const x=64+Math.cos(a)*rad*105,y=65+Math.sin(a)*rad*100;
  const rot=hash(l,833)*Math.PI*2,w=4+hash(l,834)*6,h=8+hash(l,835)*9;
  cx.save();cx.translate(x,y);cx.rotate(rot);
  cx.fillStyle=['#98a96b','#879957','#66834a','#b4a46b','#a7b77b'][l%5];
  cx.beginPath();cx.ellipse(0,0,w,h,0,0,Math.PI*2);cx.fill();
  cx.strokeStyle='rgba(224,218,139,.35)';cx.lineWidth=.7;cx.beginPath();cx.moveTo(0,-h*.7);cx.lineTo(0,h*.7);cx.stroke();cx.restore();
 }
 const tx=new THREE.CanvasTexture(cvs);tx.encoding=THREE.sRGBEncoding;tx.anisotropy=4;return tx;
}
function buildTreePrototype(kind,seed){
 const p=[],co=[],ind=[],lp=[],lu=[],lc=[],li=[];
 const isCot=kind==='cottonwood',H=isCot?28:17,R=isCot?.66:1.0;
 const woodColor=isCot?[[.26,.20,.15],[.33,.25,.19],[.41,.30,.23]]:[[.27,.21,.17],[.36,.27,.19],[.30,.24,.21]];
 let v=0,nl=0;
 function branch(a,b,r0,r1,tag){
  const x=b[0]-a[0],y=b[1]-a[1],z=b[2]-a[2],ll=Math.hypot(x,y,z)||1;
  const dx=x/ll,dy=y/ll,dz=z/ll;
  let ux=-dz,uy=0,uz=dx;const UL=Math.hypot(ux,uz)||1;ux/=UL;uz/=UL;
  const vx=dy*uz,vy=dz*ux-dx*uz,vz=-dy*ux;
  const n=7,k0=v;
  for(let j=0;j<2;j++){const rad=j?r1:r0,C=j?b:a;
   for(let i=0;i<n;i++){
    const ang=i*2*Math.PI/n,w=1+.09*Math.sin(i*3+seed*7+tag),cs=Math.cos(ang)*rad*w,sn=Math.sin(ang)*rad*w;
    p.push(C[0]+ux*cs+vx*sn,C[1]+uy*cs+vy*sn,C[2]+uz*cs+vz*sn);
    const tone=woodColor[(i+tag)%woodColor.length];co.push(...tone.map(val=>val*(.82+.24*hash(i+tag,j+seed))));
   }
  }
  for(let i=0;i<n;i++){const j=(i+1)%n;ind.push(k0+i,k0+j,k0+n+i,k0+j,k0+n+j,k0+n+i)}v+=n*2;
 }
 const leafGreen=isCot?[[.34,.45,.24],[.48,.51,.26],[.55,.48,.24],[.41,.54,.30]]:[[.17,.28,.22],[.20,.32,.24],[.25,.31,.22],[.29,.36,.26]];
 function card(center,wide,tall,angle,slant,tag){
  const wx=Math.cos(angle)*wide*.5,wz=Math.sin(angle)*wide*.5;
  const xx=-Math.sin(angle)*wide*.5*.3,zz=Math.cos(angle)*wide*.5*.3;
  const bot=[center[0]-wx,center[1]-tall*.5,center[2]-wz],tbot=[center[0]+wx,center[1]-tall*.5,center[2]+wz];
  const top=[center[0]-wx+xx*slant,center[1]+tall*.5,center[2]-wz+zz*slant],ttop=[center[0]+wx+xx*slant,center[1]+tall*.5,center[2]+wz+zz*slant];
  lp.push(...bot,...tbot,...top,...ttop);lu.push(0,0,1,0,0,1,1,1);
  const tone=leafGreen[(tag+seed)%leafGreen.length];for(let j=0;j<4;j++)lc.push(...tone.map(s=>s*(.89+hash(tag,j)*.21)));
  li.push(nl,nl+1,nl+2,nl+1,nl+3,nl+2);nl+=4;
 }
 const sway=(t,d)=>Math.sin(t*2.3+seed*4+d)*(.27+(isCot?.12:.28)*t);
 for(let i=0;i<9;i++){
  const a=i/9,b=(i+1)/9;
  branch([sway(a,0)*a,H*a,sway(a,2)*a],[sway(b,0)*b,H*b,sway(b,2)*b],(1.35*(1-a*.84))*R,(1.35*(1-b*.84))*R,i);
 }
 const branchCount=isCot?20:26;
 for(let i=0;i<branchCount;i++){
  const h=(.31+.64*hash(i,seed+1))*H,az=i*2.399+seed*.8,dist=(isCot?7.8:5.7)*(.40+.67*hash(i,seed+2));
  const rad=h/H,ax=sway(rad,0)*rad,az0=sway(rad,2)*rad;
  const tip=[ax+Math.cos(az)*dist,h+dist*(isCot?.38:.36),az0+Math.sin(az)*dist];
  const node=[ax+Math.cos(az)*dist*.48,h+dist*.37,az0+Math.sin(az)*dist*.48];
  branch([ax,h,az0],node,(.24+.18*(1-rad))*R,.17*R,i+12);
  branch(node,tip,.18*R,.035*R,i+40);
  for(let j=0;j<4;j++){
   const aa=az+((j-1.5)*1.22),off=(j-1.5)*1.7;
   const cen=[tip[0]+Math.cos(aa)*1.55,tip[1]+off*.95,tip[2]+Math.sin(aa)*1.55];
   const spread=isCot?5.3:3.9;
   for(let k=0;k<3;k++)card([cen[0]+Math.cos(aa+k)*.65,cen[1]+Math.sin(k+i)*.8,cen[2]+Math.sin(aa+k)*.65],spread*(.75+hash(k,i)*.45),spread*(.75+hash(i,k)*.45),aa+k*1.047,.2,i+j+k);
  }
 }
 const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(p,3));wg.setAttribute('color',new THREE.Float32BufferAttribute(co,3));wg.setIndex(ind);wg.computeVertexNormals();
 const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(lp,3));lg.setAttribute('uv',new THREE.Float32BufferAttribute(lu,2));lg.setAttribute('color',new THREE.Float32BufferAttribute(lc,3));lg.setIndex(li);lg.computeVertexNormals();
 return {wood:wg,leaves:lg,height:H};
}
function plantRealTrees(lat){
 const leafTexture=makeLeafClusterTexture();
 const woodMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.98,side:THREE.DoubleSide});
 const leafMat=new THREE.MeshStandardMaterial({vertexColors:true,map:leafTexture,alphaTest:.38,side:THREE.DoubleSide,roughness:.9,depthWrite:true});
 const variants=[['cottonwood',0,48],['cottonwood',3,48],['juniper',5,45],['juniper',9,45]];
 for(let g=0;g<variants.length;g++){
  const [kind,seed,max]=variants[g],p=buildTreePrototype(kind,seed);
  const trunks=new THREE.InstancedMesh(p.wood,woodMat,max),foliage=new THREE.InstancedMesh(p.leaves,leafMat,max);
  const matrix=new THREE.Matrix4(),quat=new THREE.Quaternion(),euler=new THREE.Euler(),scale=new THREE.Vector3();
  let count=0;
  for(let j=0;j<max*25 && count<max;j++){
   const k=j+g*1213,i=Math.floor(hash(k,513)*N),side=hash(k,514)<.5?-1:1;
   const band=kind==='cottonwood'?(.76+hash(k,515)*.60):(1.6+hash(k,515)*1.65);
   const offset=side*FW[i]*band,[x,z]=lat(i,offset),y=gh(x,z);
   const d=2.5,grad=Math.hypot(gh(x+d,z)-gh(x-d,z),gh(x,z+d)-gh(x,z-d))/(d*2);
   if(grad>(kind==='cottonwood'?.72:.65)||y<(kind==='cottonwood'?1:12)||y>(kind==='cottonwood'?85:230))continue;
   // Sparse growth in the arid highlands, denser near the river margins.
   const sz=(kind==='cottonwood'?.72:.76)+hash(k,516)*.52;
   euler.set(0,hash(k,518)*Math.PI*2,0);quat.setFromEuler(euler);scale.set(sz,sz*(.85+.3*hash(k,520)),sz);
   matrix.compose(new THREE.Vector3(x,y-.4,z),quat,scale);
   trunks.setMatrixAt(count,matrix);foliage.setMatrixAt(count,matrix);
   TRS.push({x,z,y,h:p.height*sz,r:kind==='cottonwood'?2.4*sz:2.1*sz});
   count++;
  }
  trunks.count=foliage.count=count;
  trunks.castShadow=trunks.receiveShadow=true;foliage.castShadow=true;foliage.receiveShadow=true;
  trunks.instanceMatrix.needsUpdate=true;foliage.instanceMatrix.needsUpdate=true;
  S.add(trunks,foliage);
 }
}


// REDLINE v4.2: collision is built from the exact rendered cliff and ledge triangles.
// A world-space 2-D spatial hash keeps sphere/triangle checks local. The same
// triangle soup also protects the chase camera from clipping through ledges.
const CLIFF_COLLIDER=(()=>{
 const cellSize=64, buckets=new Map(), triangles=[], tmp=new THREE.Triangle();
 // v42 allocation-free duplicate suppression; same per-query triangle order.
 const contactMarks=[];let contactSerial=0;
 const a=new THREE.Vector3(), b=new THREE.Vector3(), c=new THREE.Vector3();
 const projected=new THREE.Vector3(), normal=new THREE.Vector3(), delta=new THREE.Vector3();
 const worldA=new THREE.Vector3(),worldB=new THREE.Vector3(),worldC=new THREE.Vector3();
 const key=(i,j)=>i+','+j;
 function triangle(ax,ay,az,bx,by,bz,cx,cy,cz,owner){
  const i=triangles.length;
  const minX=Math.min(ax,bx,cx),maxX=Math.max(ax,bx,cx);
  const minZ=Math.min(az,bz,cz),maxZ=Math.max(az,bz,cz);
  const minY=Math.min(ay,by,cy),maxY=Math.max(ay,by,cy);
  // Skip zero-area triangles; otherwise their normals would be unstable.
  a.set(ax,ay,az);b.set(bx,by,bz);c.set(cx,cy,cz);
  if(b.clone().sub(a).cross(c.clone().sub(a)).lengthSq()<1e-7)return;
  triangles.push({v:[ax,ay,az,bx,by,bz,cx,cy,cz],minX,maxX,minY,maxY,minZ,maxZ,owner});
  // 10 m padding covers the drone collision radius and low-precision cameras.
  const l=Math.floor((minX-10)/cellSize),r=Math.floor((maxX+10)/cellSize);
  const t=Math.floor((minZ-10)/cellSize),bt=Math.floor((maxZ+10)/cellSize);
  for(let x=l;x<=r;x++)for(let z=t;z<=bt;z++){
   const k=key(x,z);let list=buckets.get(k);
   if(!list){list=[];buckets.set(k,list)}list.push(i);
  }
 }
 function addGeometry(geo,matrix,owner){
  const pos=geo.attributes.position,ind=geo.index?.array;
  if(!pos)return;
  const count=ind?ind.length:pos.count;
  for(let n=0;n<count;n+=3){
   const p=ind?ind[n]:n,q=ind?ind[n+1]:n+1,r=ind?ind[n+2]:n+2;
   worldA.fromBufferAttribute(pos,p);worldB.fromBufferAttribute(pos,q);worldC.fromBufferAttribute(pos,r);
   if(matrix){worldA.applyMatrix4(matrix);worldB.applyMatrix4(matrix);worldC.applyMatrix4(matrix)}
   triangle(worldA.x,worldA.y,worldA.z,worldB.x,worldB.y,worldB.z,worldC.x,worldC.y,worldC.z,owner);
  }
 }
 function addCylinderProxy(geo,matrix,owner){
  const pos=geo.attributes.position,around=32,levels=48,step=2;
  const point=(row,col)=>{
   const k=row*(around+1)+col;
   return new THREE.Vector3(pos.getX(k),pos.getY(k),pos.getZ(k)).applyMatrix4(matrix);
  };
  const push=(p,q,r)=>triangle(p.x,p.y,p.z,q.x,q.y,q.z,r.x,r.y,r.z,owner);
  for(let row=0;row<levels;row+=step)for(let col=0;col<around;col+=step){
   const a=point(row,col),b=point(row,col+step),c=point(row+step,col),d=point(row+step,col+step);
   push(a,b,c);push(b,d,c);
  }
  const topCenter=new THREE.Vector3(0,pos.getY(0),0).applyMatrix4(matrix),
        bottomCenter=new THREE.Vector3(0,pos.getY(levels*(around+1)),0).applyMatrix4(matrix);
  for(let col=0;col<around;col+=step){
   push(topCenter,point(0,col),point(0,col+step));
   push(bottomCenter,point(levels,col+step),point(levels,col));
  }
 }
 function contact(point,radius,previous){
  let depth=0,nx=0,ny=0,nz=0;const mark=++contactSerial;
  const minX=Math.floor((point.x-radius)/cellSize),maxX=Math.floor((point.x+radius)/cellSize);
  const minZ=Math.floor((point.z-radius)/cellSize),maxZ=Math.floor((point.z+radius)/cellSize);
  for(let ix=minX;ix<=maxX;ix++)for(let iz=minZ;iz<=maxZ;iz++){
   const list=buckets.get(key(ix,iz));if(!list)continue;
   for(let h=0;h<list.length;h++){
    const id=list[h];if(contactMarks[id]===mark)continue;contactMarks[id]=mark;
    const T=triangles[id];if(T.owner&&!T.owner.alive)continue;if(point.y+radius<T.minY||point.y-radius>T.maxY ||
        point.x+radius<T.minX||point.x-radius>T.maxX ||
        point.z+radius<T.minZ||point.z-radius>T.maxZ)continue;
    const v=T.v;a.set(v[0],v[1],v[2]);b.set(v[3],v[4],v[5]);c.set(v[6],v[7],v[8]);
    tmp.set(a,b,c);tmp.closestPointToPoint(point,projected);
    delta.subVectors(point,projected);const ds=delta.lengthSq();
    if(ds>=radius*radius)continue;
    const distance=Math.sqrt(ds),penetration=radius-distance;
    if(penetration<=depth)continue;
    if(distance>0.0001)normal.copy(delta).multiplyScalar(1/distance);
    else{
     tmp.getNormal(normal);
     if(previous && ((previous.x-projected.x)*normal.x+(previous.y-projected.y)*normal.y+(previous.z-projected.z)*normal.z)<0)normal.negate();
    }
    depth=penetration;nx=normal.x;ny=normal.y;nz=normal.z;
   }
  }
  return depth>0?{depth,nx,ny,nz}:null;
 }

 // Cast against exactly the triangles used for cliff collision, including projecting ledges.
 // Traverse the spatial hash along the ray and test each triangle at most once.
 function castRay(origin,direction,maxDistance=420){
  const ray=new THREE.Ray(origin,direction),hitPoint=new THREE.Vector3(),seen=new Set();
  const step=cellSize*.32;
  let nearest=maxDistance,found=null,foundOwner=null;
  for(let t=0;t<=Math.min(maxDistance,nearest);t+=step){
   const x=origin.x+direction.x*t,z=origin.z+direction.z*t;
   const ix=Math.floor(x/cellSize),iz=Math.floor(z/cellSize);
   for(let ox=-1;ox<=1;ox++)for(let oz=-1;oz<=1;oz++){
    const bucket=buckets.get(key(ix+ox,iz+oz));if(!bucket)continue;
    for(let k=0;k<bucket.length;k++){
     const id=bucket[k];if(seen.has(id))continue;seen.add(id);
     const tri=triangles[id],v=tri.v;if(tri.owner&&!tri.owner.alive)continue;
     // Broad-phase height rejection limits triangle intersection work.
     const endY=origin.y+direction.y*nearest;
     if(Math.max(origin.y,endY)<tri.minY-1||Math.min(origin.y,endY)>tri.maxY+1)continue;
     a.set(v[0],v[1],v[2]);b.set(v[3],v[4],v[5]);c.set(v[6],v[7],v[8]);
     if(!ray.intersectTriangle(a,b,c,false,hitPoint))continue;
     const distance=origin.distanceTo(hitPoint);
     if(distance>1.25&&distance<nearest){nearest=distance;found=hitPoint.clone();foundOwner=tri.owner||null}
    }
   }
  }
  return found?{distance:nearest,point:found,kind:foundOwner?'rock':'cliff',obstacle:foundOwner}:null;
 }
 return{addGeometry,addCylinderProxy,contact,castRay,stats:()=>({triangles:triangles.length,cells:buckets.size})};
})();
function resolveVisibleWall(point,previous,radius=7.5,contactInfo=null){
 let hit=false;
 for(let attempt=0;attempt<4;attempt++){
  const c=CLIFF_COLLIDER.contact(point,radius,previous);
  if(!c)break;hit=true;
  if(contactInfo&&attempt===0){contactInfo.nx=c.nx;contactInfo.ny=c.ny;contactInfo.nz=c.nz;}
  point.x+=c.nx*(c.depth+.15);point.y+=c.ny*(c.depth+.15);point.z+=c.nz*(c.depth+.15);
  const toward=FL.vx*c.nx+FL.vy*c.ny+FL.vz*c.nz;
  if(toward<0){FL.vx-=toward*c.nx;FL.vy-=toward*c.ny;FL.vz-=toward*c.nz}
 }
 return hit;
}

// ART-DIRECTED GEOLOGY — sectional bedrock facade independent of the collision heightfield.
// Dips, resistant caprock, concave undercuts and canyon-wall underhangs are authored by
// discrete stratigraphic surfaces. Unlike a heightfield this mesh can fold back under itself.
const WATERFALL_PROFILES=[];
function buildBeddedCliffs(){
 const strata=[.024,.043,.065,.093,.13,.177,.213,.247,.285,.31,.326,.348,
               .382,.431,.463,.51,.55,.59,.622,.646,.667,.694,.733,.775,
               .811,.85,.885,.913,.95,.975];
 const bandColor=['#5b4138','#704536','#7b4939','#96583c','#b48158','#bd8864',
  '#c39573','#8d5c4a','#674338','#79493c','#9b5f46','#bc805e',
  '#bc9670','#a87c5f','#b08065','#b69b7d','#bc9674','#cba780','#b78f75',
  '#a87b64','#b58e74','#b99072','#c8a889','#cbb399','#af8066','#b98b70',
  '#b18b79','#bda78d','#c1a990','#bdab90'].map(lin);
 const g=new THREE.BufferGeometry(),vertex=[],colors=[],uv=[],ind=[],wallRadii=[];
 // Dense faces near the path, no repeated generic extruded towers.
 const steps=360,ringN=strata.length;
 for(let side of[-1,1]){
  const offset=vertex.length/3;
  for(let i=0;i<=steps;i++){
   const at=Math.floor(i*N/steps),px=PX[at],pz=PZ[at],nx=-TZ[at]*side,nz=TX[at]*side;
   const maxY=Math.min(350,DD[at]*1.012),width=FW[at];
   const broad=10*Math.sin(i*.097+side*1.6)+5*Math.sin(i*.29+side*4.2);
   for(let j=0;j<ringN;j++){
    const fraction=strata[j],Y=2.6+maxY*fraction;
    // Find the visible face of the existing canyon at this stratigraphic height.
    let lo=width*.65,hi=width+255;
    for(let it=0;it<11;it++){
     const d=(lo+hi)*.5,hh=gh(px+nx*d,pz+nz*d);
     if(hh<Y)lo=d;else hi=d;
    }
    // Thin resistant beds project; softer beds retreat. Facade is inset toward
    // the channel so it is not swallowed by the existing terrain polygons.
    const resistant=(j%7===0||j%11===0)?1:0;
    const seam=Math.abs(Math.sin(fraction*43.7+side*2.3));
    // Smooth geological lips by the Raven entry instead of producing giant
    // fractured shelves over a high-speed flight lane. Keep detail elsewhere.
    const ravenSoft=1-sm(.026,.085,Math.abs(i/steps-.148));
    const overhang=((resistant?9.5:0) + 6.5*Math.sin(fraction*21.0+side*1.8))*(1-.82*ravenSoft);
    const fracture=(5.0*(vn(i*.12+j*.23,side*9+j*.54)-.5)
                 +3.7*Math.sin(i*.42+j*.71+side)
                 +4.5*(1.-Math.abs(2.*vn(i*.045+j*.49,side*12+j*.19)-1.)))*(1-.72*ravenSoft);
    // Preserve the original authored canyon face at waterfalls. The prior
    // waterfallReveal/spillFace override fabricated thin rock panels to prop
    // up cascades; these caused a visible seam and an unnatural empty gap.
    // Both the rendered cliff and its collider now use the original geology.
    const d=Math.max(width*.56+18,hi-8.0-overhang-fracture+broad*.15);
    wallRadii.push(d);
    let y=Y+2.5*(vn(i*.17+j*.38,side*5+j*.9)-.5);
    // Fade the old closed geologic facade into the ground before and after
    // Crosswind. This hides the strip endpoints with no abrupt paper edges.
    const rockFade=0;
    const faceX=px+nx*d,faceZ=pz+nz*d;
    if(rockFade>0)y+=(Math.min(y,gh(faceX,faceZ)-14)-y)*rockFade;
    vertex.push(faceX,y,faceZ);
    uv.push(i*.07,j*.15);
    const local=.85+.20*vn(i*.093+j*.81,side*10+j*.1);
    const darkSeam=(seam<.085?.79:1);
    const mineral=(j%9===1?.91:1);
    const c2=bandColor[j].clone().multiplyScalar(local*darkSeam*mineral);
    colors.push(c2.r,c2.g,c2.b);
    if(i<steps&&j<ringN-1){const q=offset+i*ringN+j;
      if(side===1)ind.push(q,q+ringN,q+1,q+1,q+ringN,q+ringN+1);
      else ind.push(q,q+1,q+ringN,q+1,q+ringN+1,q+ringN);
    }
   }
  }
 }
 // P0 GEOLOGY: turn the formerly single-surface facade into a closed sandstone mass.
 // Each of the two continuous cliff sides receives a buried back, a capped crest,
 // a closed bottom and sealed route-end faces. Every seam reuses indexed vertices.
 const facadeFrontVertices=vertex.length/3;
 const perSide=(steps+1)*ringN;
 const quad=(a,b,c,d,flip)=>{if(flip)ind.push(a,d,c,a,c,b);else ind.push(a,b,c,a,c,d)};
 for(let s=0;s<2;s++){
  const side=s===0?-1:1,front=s*perSide,back=vertex.length/3;
  for(let i=0;i<=steps;i++){
   const at=Math.floor(i*N/steps),nx=-TZ[at]*side,nz=TX[at]*side;
   for(let j=0;j<ringN;j++){
    const f=front+i*ringN+j,x=vertex[f*3],y=vertex[f*3+1],z=vertex[f*3+2];
    // Back of the rock penetrates the underlying heightfield; the closed crest
    // avoids paper edges while the textured front keeps its original silhouette.
    const bulk=62+11*Math.sin(i*.17+j*.23+side);
    const xb=x+nx*bulk,zb=z+nz*bulk;
    const blend=gh(xb,zb)-13;
    let yb=y+cl(blend-y,-20,24);
    const rockFade=0;
    if(rockFade>0)yb+=(Math.min(yb,gh(xb,zb)-16)-yb)*rockFade;
    vertex.push(xb,yb,zb);uv.push(i*.07+.31,j*.15);
    const k=f*3;colors.push(colors[k]*.84,colors[k+1]*.83,colors[k+2]*.81);
   }
  }
  for(let i=0;i<steps;i++)for(let j=0;j<ringN-1;j++){
   const a=back+i*ringN+j,b=a+ringN,c=a+1,d=b+1;
   // Reversed winding on the back surface.
   if(side===1)ind.push(a,c,b,c,d,b);
   else ind.push(a,b,c,c,b,d);
  }
  const flip=side===-1;
  for(let i=0;i<steps;i++){
   const f=front+i*ringN,b=back+i*ringN;
   quad(f+ringN,f,b,b+ringN,flip); // base, buried in earth
   quad(f+ringN-1,f+ringN+ringN-1,b+ringN+ringN-1,b+ringN-1,flip); // crown
  }
  for(let j=0;j<ringN-1;j++){
   quad(front+j,front+j+1,back+j+1,back+j,flip); // start cap
   const e=front+steps*ringN+j,be=back+steps*ringN+j;
   quad(e+1,e,be,be+1,flip); // end cap
  }
 }
 // Crosswind Cut / v17.7: NO MORE VERTEX-RELAXATION OR STRETCHED CLIFFS.
 // Delete triangles in the problematic route span instead of pushing
 // their corners across other branches of the river. The underlying terrain
 // remains the continuous, collision-solid canyon bank.
 const cwQ0=Math.floor(.207*N),cwQ1=Math.ceil(.487*N);
 const cwPts=[];
 let cwMinX=Infinity,cwMaxX=-Infinity,cwMinZ=Infinity,cwMaxZ=-Infinity;
 for(let q=cwQ0;q<=cwQ1;q+=2){
  const o={x:PX[q],z:PZ[q],t:q/N,r:FW[q]*.56+22};cwPts.push(o);
  cwMinX=Math.min(cwMinX,o.x-o.r);cwMaxX=Math.max(cwMaxX,o.x+o.r);
  cwMinZ=Math.min(cwMinZ,o.z-o.r);cwMaxZ=Math.max(cwMaxZ,o.z+o.r);
 }
 // At the route intersections the offending faces can originate from a
 // different spline branch, so remove faces by spatial overlap as well as
 // by their authored route indices. This applies to front/back/cap alike.
 const protectedRiver=(x,z)=>{
  if(x<cwMinX||x>cwMaxX||z<cwMinZ||z>cwMaxZ)return false;
  for(let k=0;k<cwPts.length-1;k++){
   const a=cwPts[k],b=cwPts[k+1],dx=b.x-a.x,dz=b.z-a.z;
   const v=cl(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);
   const t=a.t+(b.t-a.t)*v;
   const blend=sm(.211,.251,t)*(1-sm(.446,.487,t));
   if(blend<.001)continue;
   const rad=(a.r+(b.r-a.r)*v)*blend;
   const ox=x-(a.x+dx*v),oz=z-(a.z+dz*v);
   if(ox*ox+oz*oz<rad*rad)return true;
  }
  return false;
 };
 const vertexCount=vertex.length/3;
 const excluded=new Uint8Array(vertexCount);
 for(let i=0;i<vertexCount;i++)if(vertex[i*3+1]>WATER_HEIGHT-12)
  excluded[i]=protectedRiver(vertex[i*3],vertex[i*3+2])?1:0;
 const kept=[];let crosswindRemoved=0,riverOverlapRemoved=0;
 const rockRow=q=>Math.floor((q%perSide)/ringN)/steps;
 for(let p=0;p<ind.length;p+=3){
  const a=ind[p],b=ind[p+1],c=ind[p+2];
  const centerRow=(rockRow(a)+rockRow(b)+rockRow(c))/3;
  // Delete the complete Crosswind rock volume, not just the exposed facade.
  // Erase the entire bad closed-rock strip, INCLUDING the previously warped
  // entrance/exit transition rows. Keeping these was causing paper-thin fins.
  const authoredSpan=centerRow>=.165&&centerRow<=.630;
  let overlaps=excluded[a]||excluded[b]||excluded[c];
  if(!overlaps){
   const ax=vertex[a*3],az=vertex[a*3+2],bx=vertex[b*3],bz=vertex[b*3+2],cx=vertex[c*3],cz=vertex[c*3+2];
   if(protectedRiver((ax+bx+cx)/3,(az+bz+cz)/3))overlaps=true;
   // Protect the river also from long closed-mass triangles crossing
   // its channel despite all three corners being outside the river.
   else if(Math.max(Math.hypot(ax-bx,az-bz),Math.hypot(bx-cx,bz-cz),Math.hypot(cx-ax,cz-az))>35){
    overlaps=protectedRiver((ax+bx)/2,(az+bz)/2)||protectedRiver((bx+cx)/2,(bz+cz)/2)||protectedRiver((cx+ax)/2,(cz+az)/2);
   }
  }
  if(authoredSpan||overlaps){crosswindRemoved++;if(overlaps)riverOverlapRemoved++}
  else kept.push(a,b,c);
 }
 ind.length=0;for(let q=0;q<kept.length;q++)ind.push(kept[q]);
 // The visible rock mesh and the cliff collision hash BOTH read 'ind' here.
 const crosswindDiagnostics={removedTriangles:crosswindRemoved,
  spatialOverlapTriangles:riverOverlapRemoved,remainingTriangles:ind.length/3,
  protectedRoute:[.165,.630],terrainProfile:'continuous-bank-solid-terrain'};
 g.setAttribute('position',new THREE.Float32BufferAttribute(vertex,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 g.setIndex(ind);g.computeVertexNormals();
 // Each rim cascade follows a measured cross-section of the rendered bedrock,
 // not the heightfield or an arbitrary diagonal across the river.
 const wallPos=g.attributes.position;
 for(const [k,tt] of [.03,.06,.08,.72,.79,.90].entries()){
  const side=k%2?1:-1, row=Math.round(tt*steps), routeIndex=Math.round(tt*N)%N;
  const base=(side===-1?0:(steps+1)*ringN)+row*ringN;
  const nx=-TZ[routeIndex]*side,nz=TX[routeIndex]*side;
  const series=[];
  for(let j=0;j<ringN;j++){
   const q=base+j;
   const x=wallPos.getX(q),z=wallPos.getZ(q),y=wallPos.getY(q);
   series.push({y, d:(x-PX[routeIndex])*nx+(z-PZ[routeIndex])*nz});
  }
  WATERFALL_PROFILES.push({k,tt,side,i:routeIndex,series});
 }
 const mat=pbrTerrain(false,true);
 const wall=new THREE.Mesh(g,mat);wall.receiveShadow=true;wall.castShadow=true;
 wall.frustumCulled=false;S.add(wall);CLIFF_COLLIDER.addGeometry(g);
 // Deep-shadowed contact ledges at selected competent strata. Intermittent
 // plates are irregular and have spatially varied thickness.
 const cap=pbrTerrain(false);
 const plateGeo=new THREE.BoxGeometry(1,1,1);
 const ledges=new THREE.InstancedMesh(plateGeo,cap,440),M=new THREE.Matrix4(),Q=new THREE.Quaternion(),E=new THREE.Euler();
 let placed=0;
 for(let side of[-1,1])for(let t=0;t<220;t++){
  const a=Math.floor((t+.5)*N/220),depth=FW[a]+35+hash(t,side+12)*85;
  // Keep the new rounded Raven passage free of raised, protruding shelf meshes.
  if((a/N>.062&&a/N<.219)||(a/N>.15&&a/N<.65))continue;
  // Do not place rock shelf meshes in front of rim-to-river waterfall corridors.
  if([.03,.06,.08,.18,.205,.495,.52,.60,.72,.90].some((u,k)=>side===(k%2?1:-1)&&Math.abs(a/N-u)<.017))continue;
  const x=PX[a]-side*TZ[a]*depth,z=PZ[a]+side*TX[a]*depth,y=gh(x,z);
  if(y<55||y>300||hash(t,side+3)<.17)continue;
  const radius=5+hash(t,71)*15,thick=.75+hash(t,75)*1.7;
  E.set(0,Math.atan2(TX[a],TZ[a]),(hash(t,84)-.5)*.13);Q.setFromEuler(E);
  M.compose(new THREE.Vector3(x,y+2,z),Q,new THREE.Vector3(radius,thick,radius*.55));
  ledges.setMatrixAt(placed++,M);CLIFF_COLLIDER.addGeometry(plateGeo,M);
 }
 ledges.count=placed;ledges.receiveShadow=true;ledges.castShadow=true;S.add(ledges);
 window.REDLINE_GEOLOGY={strata:ringN,facadeVertices:facadeFrontVertices,closedGeologyVertices:vertex.length/3,
 rockLedges:placed,radiusTable:new Float32Array(wallRadii),strataFractions:strata,
 steps,crosswindDiagnostics,maxElevations:DD.slice(0,N).map(v=>Math.min(350,v*1.012))};
 window.REDLINE_CROSSWIND_QA=crosswindDiagnostics;
}

// REDLINE V18: THE BROKEN SPILLWAY / CROSSWIND HYDROELECTRIC COMPLEX
// Fictional abandoned facility informed by the construction of Glen Canyon and Hoover dams.
// Everything important to navigation is solid in CLIFF_COLLIDER; the required central breach stays open.
const REDLINE_DAM={built:false,locationT:.369,visualGroups:[],jets:[],lights:[],mist:[],pillars:[],stats:{},passedThisLap:false,lastNotice:-1000,successfulPasses:0};
// REDLINE v18.4 / STANDALONE-ASSET REBUILD PORT
// Standalone Blender asset rev5 dimensions re-expressed in in-game local axes:
// Blender (X,Y,Z) => game local (X,Z,Y). All structures use these dimensions.
function buildBrokenSpillway(){
 if(REDLINE_DAM.built)return;
 const i=Math.round(REDLINE_DAM.locationT*N),root=new THREE.Group();
 root.name='REDLINE / BROKEN SPILLWAY / ASSET REV5 / CONTIGUOUS DAM';
 root.position.set(PX[i],0,PZ[i]);root.rotation.y=Math.atan2(TX[i],TZ[i]);
 S.add(root);root.updateMatrixWorld(true);REDLINE_DAM.root=root;
 const rgba=(rr,gg,bb)=>`rgb(${rr},${gg},${bb})`;
 function texture(kind,size=512){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d');let data=ctx.createImageData(size,size);
  const rough=document.createElement('canvas');rough.width=rough.height=size;
  const rctx=rough.getContext('2d');let norm=rctx.createImageData(size,size);
  const vals=new Float32Array(size*size);
  const rs=(x,y,s)=>hash(Math.floor(x),Math.floor(y)*37+s*71);
  const fract=v=>v-Math.floor(v);
  // Hierarchical aggregate, construction lift bands, efflorescence, rain streaks.
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const k=y*size+x,o=k*4;
   let macro=rs(x/102,y/102,3)*.35+rs(x/36,y/36,9)*.23+rs(x/12,y/12,7)*.19+rs(x/2,y/2,11)*.09;
   const crack=Math.abs(Math.sin(x*.028+Math.sin(y*.014)*2.3))<.024?.08:0;
   const pour=Math.min(.095,Math.exp(-Math.pow(((y+16*x/size)%108)/2.6,2))*.13);
   const stain=Math.pow(rs(x/20,1,5),4)*(.08+.31*(y/size));
   let r,g,b;
   if(kind==='sandstone'){
    const bed=Math.sin(y*.20+x*.015+Math.sin(x*.035)*2.1)*.11;
    const cross=Math.sin(y*.061+x*.042+Math.sin(x*.008)*2.5)*.085;
    const v=.61+macro*.42+bed+cross;
    r=220*v;g=124*v;b=68*v;
   }else if(kind==='rust'){
    const v=.54+macro*.65-stain*.3;
    r=144*v;g=90*v;b=60*v;
   }else{
    const white=.80+macro*.31-stain*.48-pour-crack;
    const lime=rs(x/61,y/21,15)*.10;
    const v=white+lime;
    r=178*v;g=169*v;b=155*v;
   }
   data.data[o]=Math.max(0,Math.min(255,r));data.data[o+1]=Math.max(0,Math.min(255,g));data.data[o+2]=Math.max(0,Math.min(255,b));data.data[o+3]=255;
   vals[k]=macro+(kind==='concrete'?(pour+crack)*.6:0);
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const k=y*size+x,o=k*4, left=vals[y*size+(x+size-1)%size],right=vals[y*size+(x+1)%size],up=vals[((y+size-1)%size)*size+x],dn=vals[((y+1)%size)*size+x];
   let dx=(left-right)*1.2,dy=(up-dn)*1.2,mag=Math.hypot(dx,dy,1);
   norm.data[o]=Math.floor(128+127*dx/mag);norm.data[o+1]=Math.floor(128+127*dy/mag);norm.data[o+2]=Math.floor(128+127/mag);norm.data[o+3]=255;
  }
  ctx.putImageData(data,0,0);rctx.putImageData(norm,0,0);
  const map=new THREE.CanvasTexture(canvas),normal=new THREE.CanvasTexture(rough);
  for(const t of [map,normal]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;t.needsUpdate=true;}
  map.encoding=THREE.sRGBEncoding;
  return {map,normal};
 }
 const concreteTexture=texture('concrete'),rustTexture=texture('rust');
 const makeMat=(color,metal=.05,rough=.84,tex=null)=>new THREE.MeshStandardMaterial({
  color,metalness:metal,roughness:rough,...(tex?{map:tex.map,normalMap:tex.normal,normalScale:new THREE.Vector2(.29,.29)}:{})
 });
 const MAT={
  CONCRETE:makeMat(0xcfc9c1,.018,.89,concreteTexture),
  BLEACHED:makeMat(0xe4dbd0,.015,.92,concreteTexture),
  STAIN:makeMat(0x8a837d,.05,.97,concreteTexture),
  EXPOSED:makeMat(0xa59b90,.012,.99,concreteTexture),
  RUST:makeMat(0xb7977c,.57,.65,rustTexture),
  STEEL:makeMat(0x3d505c,.67,.46),
  SHADOW:makeMat(0x080f14,.13,.87),
  BRASS:makeMat(0xbca165,.62,.43),
  GLASS:new THREE.MeshPhysicalMaterial({color:0x284753,metalness:.10,roughness:.23,transparent:true,opacity:.74,side:THREE.DoubleSide}),
  OCHRE:makeMat(0xb18d4d,.36,.68),
  WET:makeMat(0x524e4b,.03,.43,concreteTexture)
 };
 const unit=new THREE.BoxGeometry(1,1,1),C=new THREE.Quaternion(),T=new THREE.Matrix4(),CW=new THREE.Matrix4();
 const batches=new Map(),tubeBatches=new Map(),tubeG=new THREE.CylinderGeometry(1,1,1,12,1);
 let colliderCounts=0,wallPanels=0,decorations=0,meshes=0;
 function box(mat,x,y,z,sx,sy,sz,solid=false){
  if(Math.min(sx,sy,sz)<=0)return;
  T.compose(new THREE.Vector3(x,y,z),C,new THREE.Vector3(sx,sy,sz));
  if(!batches.has(mat))batches.set(mat,[]);batches.get(mat).push(T.clone());decorations++;
  if(solid){CW.multiplyMatrices(root.matrixWorld,T);CLIFF_COLLIDER.addGeometry(unit,CW.clone());colliderCounts++}
 }
 function beam(mat,a,b,r,solid=false){
  let av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av),len=delta.length();
  if(len<=.0001)return;
  let q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  T.compose(av.add(bv).multiplyScalar(.5),q,new THREE.Vector3(r,len,r));
  if(!tubeBatches.has(mat))tubeBatches.set(mat,[]);tubeBatches.get(mat).push(T.clone());
  if(solid&&r>1){CW.multiplyMatrices(root.matrixWorld,T);CLIFF_COLLIDER.addGeometry(tubeG,CW.clone());colliderCounts++}
 }
 function front(x,y){return -12-17*(1-(x/220)**2)+.045*(205-y)}
 function thickness(y){return 12+Math.max(0,205-y)*.17}
 // A monolithic water-retaining shell: real thickness front to back, curved in plan,
 // expanded toward foundation, and kept separate around both floodgate portals.
 function shell(id,x0,x1,y0,y1){
  let verts=[],uv=[],ix=[],nx=Math.max(5,Math.ceil((x1-x0)/7)),ny=Math.max(6,Math.ceil((y1-y0)/8));
  const idx=(side,j,k)=>side*(nx+1)*(ny+1)+j*(nx+1)+k;
  for(let side=0;side<2;side++)for(let j=0;j<=ny;j++)for(let k=0;k<=nx;k++){
   const x=x0+(x1-x0)*k/nx,y=y0+(y1-y0)*j/ny;
   verts.push(x,y,front(x,y)+(side?thickness(y):0));
   uv.push(x/55,y/44);
  }
  for(let side=0;side<2;side++)for(let j=0;j<ny;j++)for(let k=0;k<nx;k++){
   const a=idx(side,j,k),b=idx(side,j,k+1),c=idx(side,j+1,k+1),d=idx(side,j+1,k);
   if(side===0)ix.push(d,c,b,d,b,a);else ix.push(a,b,c,a,c,d);
  }
  for(let j=0;j<ny;j++)for(const k of[0,nx]){
   const a=idx(0,j,k),b=idx(1,j,k),c=idx(1,j+1,k),d=idx(0,j+1,k);
   if(k===0)ix.push(a,b,c,a,c,d);else ix.push(a,c,b,a,d,c);
  }
  for(let k=0;k<nx;k++)for(const j of[0,ny]){
   const a=idx(0,j,k),b=idx(0,j,k+1),c=idx(1,j,k+1),d=idx(1,j,k);
   if(j===0)ix.push(a,b,c,a,c,d);else ix.push(a,c,b,a,d,c);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();
  const m=new THREE.Mesh(g,MAT.CONCRETE);m.name='MONOLITHIC_POUR / '+id;m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;
  root.add(m);root.updateMatrixWorld(true);m.updateMatrixWorld(true);CLIFF_COLLIDER.addGeometry(g,m.matrixWorld);colliderCounts++;wallPanels++;meshes++;
 }
 // Balanced breach: 84m wide at lower elevations and a load-bearing lintel at 173m.
 // The maintenance bypass is an actual physical void in the EAST shell, NOT a fake label.
 for(const [name,a,b,lo,hi] of [
  ['west1',-215,-152,-8,212],['west2',-152,-95,-8,212],['west3',-95,-59,-8,212],
  ['east1',59,92,-8,212],['eastTunnelFloor',92,126,-8,49],
  ['eastTunnelRoof',92,126,111,212],['east2',126,165,-8,212],['east3',165,215,-8,212],
  ['breachJambW',-59,-42,-8,177],['breachJambE',42,59,-8,177],
  ['floodgateLintel',-42,42,173,212]
 ])shell(name,a,b,lo,hi);
 // Retreat pockets on both floodgate sides; slender guide lights signal the right route.
 for(const side of[-1,1]){
  for(let y=24;y<166;y+=16){box('STEEL',side*46,y,-31,3,14,2);box('RUST',side*43.7,y,-32,1.8,12,.8);}
  box('STAIN',side*51,196,-19,12,16,30,true);
  box('RUST',side*44,180,-31,6,4,5);
  // Deeply seated gate winch; reinforced upper bearing assemblies.
  box('STEEL',side*51,217,-22,12,13,12);
  beam('RUST',[side*46,212,-28],[side*46,173,-28],.45);
  for(let yy=40;yy<=144;yy+=26)box('OCHRE',side*40.6,yy,-32,.8,2.1,1.2);
 }
 // Measurable structural bridge across the breach, not disconnected concrete plates.
 for(const z of[-35,-1]){
  for(const y of[195,209])beam('STEEL',[-53,y,z],[53,y,z],1.6,true);
  for(let k=0;k<9;k++){
   const a=-53+k*(106/9),b=a+106/9;
   beam('STEEL',[a,195,z],[b,209,z],.9);
   beam('STEEL',[a,209,z],[b,195,z],.9);
  }
 }
 for(let k=0;k<11;k++){
  const x=-53+k*10.6;beam('STEEL',[x,206,-36],[x,206,0],.85);
  box('STEEL',x,191,-17.5,9.8,1.1,29);
 }
 // Engineered crest road seated against the same curved concrete shell.
 for(let x=-210;x<211;x+=12){if(Math.abs(x)<43)continue;
  box('CONCRETE',x,212,front(x,212)+6,12.2,3,18);
  for(const s of[-1,1]){
   box('BLEACHED',x,217,front(x,212)+6+s*10,11.5,5,1.4);
   beam('STEEL',[x-4,220,front(x,212)+6+s*11],[x+4,220,front(x,212)+6+s*11],.14);
  }
 }
 // A powerhouse is a founded, continuous reinforced-concrete volume on BOTH sides.
 for(const side of [-1,1]){
  const cx=side*157,zz=front(cx,20)-34;
  box('STAIN',cx,11,zz+8,80,27,41,true);box('CONCRETE',cx,43,zz+9,82,4,45,true);
  for(let k=-1;k<=1;k++){
   const x=cx+k*21;
   box('STEEL',x,26,zz-14,15,9,1.5);
   box('SHADOW',x,27,zz-14.9,13,7,.5);
   beam('STEEL',[x-6,25,zz-16],[x+6,25,zz-16],.22);
   box('STEEL',x,49,zz-6,8,9,11);
   box('SHADOW',x,54,zz-6,9,1,10);
  }
  // 3 penstocks per powerhouse, rigid anchors and flange rings.
  for(let n=0;n<3;n++){
   const x=cx+(n-1)*27;const yt=194,yb=26;
   const zt=front(x,yt)-9,zb=front(x,yb)-10;
   beam('STEEL',[x,yt,zt],[x,yb,zb],3.2);
   for(const y of[55,95,137,174]){
    const z=front(x,y)-10;
    beam('RUST',[x,y-1,z],[x,y+1,z],4.0);
    box('STAIN',x,y,z+5,6,6,10);
   }
   beam('RUST',[x,24,zb-3],[x,24,zb-7],4.6);
   box('SHADOW',x,23,zb-8,6,6,.5);
  }
  // Crest intake hoist towers tied into the top roadway.
  const twX=side*150,twZ=front(twX,208)+7;
  box('CONCRETE',twX,220,twZ,38,9,27,true);
  for(const dx of[-15,15])for(const dz of[-11,11])box('STAIN',twX+dx,238,twZ+dz,3.7,30,3.7);
  box('BLEACHED',twX,255,twZ,41,4,30);
  box('GLASS',twX,241,twZ-12.6,28,14,.7);
  // Continuous service galleries tied to the penstock support wall.
  for(const y of[65,130])for(let j=0;j<8;j++){
   const x=side*(76+j*17);const z=front(x,y)-7;
   box('STEEL',x,y,z,15,1.15,13);
   beam('STEEL',[x,y-10,z+5],[x,y,z],.65);
   beam('STEEL',[x-7.5,y+5,z-7.5],[x+7.5,y+5,z-7.5],.20);
  }
 }
 // Key material weathering: banks, pitted wall exposure, fracture profiles.
 const chips=new THREE.DodecahedronGeometry(1,1),chipM=new THREE.Matrix4(),chipQ=new THREE.Quaternion(),chipList=[];
 for(const side of[-1,1])for(let k=0;k<110;k++){
  const x=side*(62+hash(k,42)*148),y=12+hash(k,43)*184;
  const z=front(x,y)-.5-hash(k,44)*.7,r=1+hash(k,47)*3;
  chipM.compose(new THREE.Vector3(x,y,z),chipQ,new THREE.Vector3(r*1.8,r*.52,r*.32));chipList.push(chipM.clone());
 }
 const flakes=new THREE.InstancedMesh(chips,MAT.EXPOSED,chipList.length);
 for(let k=0;k<chipList.length;k++)flakes.setMatrixAt(k,chipList[k]);flakes.count=chipList.length;flakes.castShadow=true;flakes.receiveShadow=true;root.add(flakes);
 // Fractured inner jambs remain OUTSIDE protected centerline (abs(x)<=32).
 const damage=new THREE.DodecahedronGeometry(1,1);
 const cracks=new THREE.InstancedMesh(damage,MAT.CONCRETE,38);
 for(let k=0;k<38;k++){
  const side=k%2?-1:1,y=18+hash(k,94)*160,x=side*(64+hash(k,95)*8),z=front(x,y)-2;
  const sx=2+hash(k,96)*3,sy=3+hash(k,97)*7,sz=2+hash(k,98)*2;
  T.compose(new THREE.Vector3(x,y,z),C,new THREE.Vector3(sx,sy,sz));cracks.setMatrixAt(k,T);
 }cracks.castShadow=true;root.add(cracks);
 // V27.2 — DAM WATER: The prior 148m cyan rectangles started without an outlet
 // and terminated without a visible impact. Spill mouths now connect to solid
 // concrete; all ribbons terminate on the sampled river surface with turbulence.
 // The two flanking outlets intentionally remain outside the 84m racing throat.
 const fallMistCanvas=document.createElement('canvas');fallMistCanvas.width=fallMistCanvas.height=64;
 const fallMistContext=fallMistCanvas.getContext('2d');
 const fallMistGradient=fallMistContext.createRadialGradient(32,32,2,32,32,32);
 fallMistGradient.addColorStop(0,'rgba(237,250,252,.85)');
 fallMistGradient.addColorStop(.4,'rgba(204,233,238,.35)');
 fallMistGradient.addColorStop(1,'rgba(180,218,228,0)');
 fallMistContext.fillStyle=fallMistGradient;fallMistContext.fillRect(0,0,64,64);
 const mistTexture=new THREE.CanvasTexture(fallMistCanvas);
 const fallMaterial=new THREE.ShaderMaterial({
  uniforms:{tm:{value:0}},transparent:true,depthWrite:false,side:THREE.DoubleSide,
  vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 vUv;uniform float tm;
   float noise(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   void main(){
    vec2 uv=vUv;
    float run=uv.y*85.-tm*10.5;
    float flow=sin(run+uv.x*17.)*.5+.5;
    float fine=sin(run*2.1+uv.x*67.+sin(uv.y*34.))*.5+.5;
    float grains=noise(floor(vec2(uv.x*31.,run*1.5)));
    float streak=clamp(.25+flow*.45+fine*.22+grains*.12,0.,1.);
    float edge=smoothstep(0.,.085,uv.x)*(1.-smoothstep(.915,1.,uv.x));
    float breakup=1.-smoothstep(.68,1.,uv.y)*(.26+.22*grains);
    float air=clamp(.55+.19*flow+.17*fine,0.,1.);
    vec3 blue=vec3(.44,.64,.70),white=vec3(.84,.94,.94);
    vec3 color=mix(blue,white,streak);
    float bottomFoam=smoothstep(.83,1.,uv.y)*(.15+.12*fine);
    gl_FragColor=vec4(mix(color,white,bottomFoam),air*edge*breakup);
   }`
 });
 const waterImpactMaterial=new THREE.MeshBasicMaterial({color:0xe2f0ec,transparent:true,opacity:.41,
  depthWrite:false,side:THREE.DoubleSide});
 const outletQA=[];
 const waterY=WATER_HEIGHT+.12;
 for(const side of[-1,1]){
  const sourceX=side*66, sourceY=137.6;
  const mouthZ=front(sourceX,140)-22;
  // The housing's rear face penetrates the curved dam, rather than floating
  // forward of the wall. Its inset aperture is the actual waterfall source.
  box('STAIN',sourceX,140.8,mouthZ+12,25,18,26,true);
  box('SHADOW',sourceX,138.6,mouthZ-1.3,18.2,8.5,1.6);
  box('STEEL',sourceX,143.3,mouthZ-2.4,21,1.5,3);
  for(const bank of[-1,1]){
   box('STEEL',sourceX+bank*10.0,139,mouthZ-2.7,1.6,9.5,3.6);
   box('WET',sourceX+bank*12.0,130,mouthZ+8,2.1,12,12);
  }
  box('WET',sourceX,133.9,mouthZ+8.2,17.8,2.2,15);
  // The landing point is sampled from the real heightfield, not guessed. Move
  // toward the river center until water is actually visible under the spray.
  let footX=side*52,footZ=mouthZ-11.5,footTerrain=Infinity;
  for(let trial=0;trial<8;trial++){
   const wp=root.localToWorld(new THREE.Vector3(footX,waterY,footZ));
   footTerrain=gh(wp.x,wp.z);
   if(footTerrain<=WATER_HEIGHT-.15)break;
   if(trial<7)footX-=side*5;
  }
  // Re-measure the exact final splash point after the river search.
  {const wp=root.localToWorld(new THREE.Vector3(footX,waterY,footZ));footTerrain=gh(wp.x,wp.z);}
  let verts=[],uv=[],faces=[],rows=72,cols=14;
  for(let row=0;row<=rows;row++)for(let column=0;column<=cols;column++){
   const t=row/rows,u=column/cols,down=t*t*(3-2*t);
   const centerX=sourceX+(footX-sourceX)*down;
   // Only a modest outward displacement: gravity, not a diagonal water beam.
   const centerZ=mouthZ-2+(footZ-(mouthZ-2))*Math.sqrt(t);
   const halfWidth=8.25+3.4*t+.35*Math.sin(t*14+side);
   const shear=.28*Math.sin(t*28+u*10+side)*Math.sin(Math.PI*t);
   const x=centerX+(u-.5)*2*halfWidth+shear;
   const y=sourceY+(waterY-sourceY)*t+.28*Math.sin(t*23+u*7)*Math.sin(Math.PI*t);
   const z=centerZ+.25*Math.sin(t*19+u*14)*Math.sin(Math.PI*t);
   verts.push(x,y,z);uv.push(u,t);
   if(row<rows&&column<cols){const a=row*(cols+1)+column,b=a+cols+1;
    faces.push(a,b,a+1,a+1,b,b+1)}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setIndex(faces);geometry.computeVertexNormals();
  const sheet=new THREE.Mesh(geometry,fallMaterial);
  sheet.name='REDLINE / Dam overflow / Connected from concrete mouth to river';
  sheet.frustumCulled=false;sheet.renderOrder=4;root.add(sheet);REDLINE_DAM.jets.push(sheet);
  // River-surface contact: asymmetric shallow ripples plus drifting spray.
  const impact=new THREE.Mesh(new THREE.RingGeometry(3.6,10.8,36).rotateX(-Math.PI/2),waterImpactMaterial);
  impact.position.set(footX,waterY+.04,footZ);impact.scale.set(1.2,1,.84);
  impact.renderOrder=5;root.add(impact);
  for(let j=0;j<5;j++){
   const spray=new THREE.Sprite(new THREE.SpriteMaterial({map:mistTexture,color:0xc8e6ed,
    transparent:true,depthWrite:false,opacity:.23}));
   const angle=j*2.39996+side*.6,r=2+j*.98;
   spray.position.set(footX+Math.cos(angle)*r,waterY+1.7+j*.36,footZ+Math.sin(angle)*r);
   spray.scale.set(7+j*1.2,5.2+j*.8,1);root.add(spray);
   REDLINE_DAM.mist.push({mesh:spray,seed:j+side*7});
  }
  outletQA.push({side,mouth:[sourceX,sourceY,mouthZ-2],riverImpact:[footX,waterY,footZ],
   impactTerrainHeight:footTerrain,connectedToRiver:footTerrain<=WATER_HEIGHT-.15,
   sourceInsideConcreteAperture:true,visibleImpactFoam:true,
   lateralDrift:Math.abs(footX-sourceX),forwardDrift:Math.abs(footZ-mouthZ+2)});
 }
 REDLINE_DAM.waterfallQA=outletQA;
 window.REDLINE_DAM_WATERFALL_QA=outletQA;
 // One draw call per material for medium-scale repeating elements.
 for(const [mat,arr]of batches){
  const m=new THREE.InstancedMesh(unit,MAT[mat],arr.length);
  for(let j=0;j<arr.length;j++)m.setMatrixAt(j,arr[j]);
  m.instanceMatrix.needsUpdate=true;m.frustumCulled=false;m.receiveShadow=true;m.castShadow=['CONCRETE','STAIN','STEEL'].includes(mat);root.add(m);meshes++;
 }
 for(const [mat,arr]of tubeBatches){
  const m=new THREE.InstancedMesh(tubeG,MAT[mat],arr.length);
  for(let j=0;j<arr.length;j++)m.setMatrixAt(j,arr[j]);
  m.instanceMatrix.needsUpdate=true;m.frustumCulled=false;m.receiveShadow=true;m.castShadow=mat!=='GLASS';root.add(m);meshes++;
 }
 REDLINE_DAM.built=true;
 REDLINE_DAM.stats={t:REDLINE_DAM.locationT,damAssembly:'Standalone Blender rev5 architectural re-creation + baked procedural PBR in game',mainBreachWidth:84,mainBreachMinTop:173,
  secondaryTunnel:{x:107,width:34,height:62},checkpointEnforced:true,geometryColliders:colliderCounts,curvedDamPanels:wallPanels,
  instancedDrawCalls:meshes,castConcreteDamagePieces:chips?chipList.length+38:0,proceduralJets:REDLINE_DAM.jets.length,connectedOutlets:REDLINE_DAM.waterfallQA,
  openingCore:{x:[-32,32],y:[10,165]},auxiliaryCore:{x:[95,119],y:[58,97]},inGameExport:'native THREE BufferGeometry asset port',
  waterReference:'river',altitudeLimit:310};
 window.REDLINE_DAM_QA=REDLINE_DAM.stats;window.REDLINE_DAM_LIVE=REDLINE_DAM;
}

// V18.3 mandatory floodgate passage: a player who flies over or around the
// crest cannot claim the next checkpoint. No invisible collision wall, no
// forced teleport; it is an explicit race rule with a visible gate throat.
function redlineCheckDamRoute(previous,now){
 if(!REDLINE_DAM.built||gate!==4||REDLINE_DAM.passedThisLap)return;
 const a=REDLINE_DAM.root.worldToLocal(previous.clone());
 const b=REDLINE_DAM.root.worldToLocal(now.clone());
 if(!(a.z<0&&b.z>=0))return;
 const u=Math.max(0,Math.min(1,-a.z/Math.max(0.0001,b.z-a.z)));
 const x=a.x+(b.x-a.x)*u,y=a.y+(b.y-a.y)*u;
 const primary=Math.abs(x)<=32&&y>=10&&y<=165;
 const auxiliary=x>=95&&x<=119&&y>=58&&y<=97;
 if(primary||auxiliary){
  REDLINE_DAM.passedThisLap=true;REDLINE_DAM.successfulPasses++;
  msg(primary?'SPILLWAY CLEARED  /  RACE LINE VALID':'MAINTENANCE BYPASS  /  RACE LINE VALID',1100);
 }else if(time-REDLINE_DAM.lastNotice>2.1){
  REDLINE_DAM.lastNotice=time;
  msg('MISSED THE DAM GATE  /  FLY THROUGH THE OPEN PORTAL',1800);
 }
}
// High-density but readable sandstone hoodoo fields. Individual spires sit on
// the terrain, use a single instanced mesh, and share low-poly collision proxies.
function buildGrandGorgePillars(){
 const geom=new THREE.CylinderGeometry(1,1,1,24,34,false);
 const p=geom.attributes.position;
 for(let n=0;n<p.count;n++){
  const y=p.getY(n)+.5,angle=Math.atan2(p.getZ(n),p.getX(n));
  // Weathered pedestal, narrow undermined shaft and irregular protective cap.
  const bottom=1+.46*Math.exp(-y*13),top=1+.38*sm(.81,.94,y),
   neck=.70+.29*Math.pow(Math.abs(y-.52)*2,1.9),
   layered=1+.075*Math.sin(y*76+angle*2)+.036*Math.sin(y*151+angle*6),
   erosion=1+(vn(angle*2.2+6,y*31)-.5)*.20;
  const radius=bottom*top*neck*layered*erosion;
  p.setX(n,p.getX(n)*radius);p.setZ(n,p.getZ(n)*radius);
 }
 geom.computeVertexNormals();
 const total=216,mesh=new THREE.InstancedMesh(geom,rockMat,total);
 mesh.name='REDLINE / Hoodoo Forest / 216 independently placed sandstone pillars';
 mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;
 const low=new THREE.CylinderGeometry(.82,1.13,1,10,4),matrix=new THREE.Matrix4(),quat=new THREE.Quaternion(),position=new THREE.Vector3(),scale=new THREE.Vector3(),tone=new THREE.Color();
 let count=0,high=0,nearChannel=0;
 // Distribute actual accepted positions evenly around the WHOLE closed circuit.
 // A naive first-N candidate loop crowded only the opening sectors.
 const candidates=[];
 for(let j=0;j<460;j++){
  const t=.017+(j+.5)*(.966/460)+(hash(j,912)-.5)*.001;
  if(Math.abs(t-.369)<.061||GATES.some(g=>Math.abs(g[0]-t)<.016))continue;
  candidates.push({j,t});
 }
 for(let slot=0;slot<total;slot++){
  const entry=candidates[Math.floor((slot+.5)*candidates.length/total)];
  if(!entry)break;
  const {j,t}=entry;
  const i=Math.floor(t*N)%N,sgn=j%2?1:-1;
  const a=FW[i]*(.60+hash(j,913)*.68),l=sgn*a;
  const x=PX[i]-TZ[i]*l,z=PZ[i]+TX[i]*l,y0=gh(x,z)-3;
  if(!Number.isFinite(y0))continue;
  const nearStart=Math.abs(t-.15)<.038;
  const rad=nearStart?5.5+hash(j,914)*5:6.3+hash(j,914)*10.7;
  let height=42+hash(j,915)*157;
  const isSkyline=j%8===0||j%23===0;
  if(isSkyline){height=Math.max(28,WATER_HEIGHT+REDLINE_MAX_ALTITUDE_ABOVE_RIVER-y0+3);high++;}
  // Ensure visual and physical clearance across playable sky. Other columns
  // may still be substantial, but must NOT form an impassable lattice.
  if(y0+height>WATER_HEIGHT+REDLINE_MAX_ALTITUDE_ABOVE_RIVER+12)height=WATER_HEIGHT+REDLINE_MAX_ALTITUDE_ABOVE_RIVER+12-y0;
  if(height<18)continue;
  scale.set(rad,height,rad);position.set(x,y0+height*.5,z);quat.setFromAxisAngle(new THREE.Vector3(0,1,0),hash(j,916)*6.283);
  matrix.compose(position,quat,scale);mesh.setMatrixAt(count,matrix);
  tone.setHSL(.055+hash(j,917)*.045,.37+hash(j,918)*.18,.43+hash(j,919)*.13);
  mesh.setColorAt(count,tone);
  // Inexpensive collision proxy follows the visible base/cap envelope, unlike
  // a 300m-tall bounding sphere (which would incorrectly hit distant lasers).
  CLIFF_COLLIDER.addGeometry(low,matrix);
  REDLINE_DAM.pillars.push({t,x,z,base:y0,top:y0+height,radius:rad,high:isSkyline});
  if(a<FW[i]*.78)nearChannel++;
  count++;
 }
 mesh.count=count;mesh.instanceMatrix.needsUpdate=true;
 S.add(mesh);
 REDLINE_DAM.stats.pillarCount=count;
 REDLINE_DAM.stats.ceilingPillars=high;
 REDLINE_DAM.stats.pillarsNearRiver=nearChannel;
 REDLINE_DAM.stats.pillarDrawCalls=1;
 REDLINE_DAM.stats.pillarCollider='independent low-polygon mesh surrogates';
}
function updateBrokenSpillway(dt){
 if(!REDLINE_DAM.built)return;
 for(const jet of REDLINE_DAM.jets)jet.material.uniforms.tm.value=time;
 for(const spray of REDLINE_DAM.mist){
  spray.mesh.material.opacity=.18+.055*Math.sin(time*1.6+spray.seed*2.1);
  const sc=1+.07*Math.sin(time*1.4+spray.seed);
  spray.mesh.scale.x=(7+(Math.abs(spray.seed)%5)*1.2)*sc;
 }
 for(const l of REDLINE_DAM.lights){
  const value=.45+.55*Math.sin(time*2.6+l.phase);
  l.mesh.material.color.setHex(value>.52?0xff764b:0x5e2920);
 }
}

function build(){
 const geo=new THREE.PlaneGeometry(WS,WS,NS,NS);geo.rotateX(-Math.PI/2);
 const pos=geo.attributes.position,col=new Float32Array(NV*NV*3),bankWeights=new Float32Array(NV*NV),terrainNearest=new Uint16Array(NV*NV);
 for(let j=0;j<NV;j++)for(let i=0;i<NV;i++){
  const k=j*NV+i,x=pos.getX(k),z=pos.getZ(k),bi=near(x,z);
  terrainNearest[k]=bi;
  const dx=x-PX[bi],dz=z-PZ[bi];
  const warped=(fbm(x*.0065,z*.0065)-.5)*48+(fbm(x*.022,z*.022)-.5)*14;
  const d=Math.max(0,Math.hypot(dx,dz)+warped),f=FW[bi],D=DD[bi];
  bankWeights[k]=1-sm(f*.56,f*1.47,d);
  const u=(d-f)/(179+20*(fbm(x*.005,z*.005)-.5));
  let y;
  if(u<=0){
   const bed=(fbm(x*.06,z*.06)-.5)*2.7;
   y=-3.5+4*sm(f*.32,f,Math.max(0,d))+bed;
   c.copy(SAND).lerp(DUST,cl(.18+.22*fbm(x*.024,z*.024),0,1));
  }else{
   // Three continuous, irregular erosion benches; never quantized stair steps.
   const bench=.46*sm(-.02,.20,u)+.33*sm(.12,.45,u)+.21*sm(.31,.77,u);
   const r=fbm(x*.018,z*.018),rg=1-Math.abs(2*vn(x*.024,z*.024)-1);
   y=-1+D*bench;
   y+=(r-.5)*((u<.80)?17:28)+rg*rg*9*sm(.08,.24,u);
   y+=Math.max(0,u-.78)*18+(fbm(x*.007,z*.007)-.5)*13*sm(.5,.85,u);
   // Interlocking buttresses, tributary rills and sedimentary ledges.
   // These change silhouette, contact shadows and terrain collisions together.
   const wall=sm(.04,.32,u);
   const buttress=Math.sin(x*.016+Math.sin(z*.008)*2.2)*Math.sin(z*.014+x*.003);
   const drain=1-Math.abs(2*fbm(x*.017+z*.004,z*.016-x*.003)-1);
   const gully=Math.pow(cl(drain,0,1),6);
   y+=wall*(buttress*11-gully*(13+8*sm(.45,.85,u)));
   y+=wall*3.8*Math.sin(y*.092+Math.sin(x*.011+z*.014)*2.0)*sm(.13,.6,u);
   // Rock colors follow common stratigraphic elevations, not arbitrary vertex noise.
   const layer=cl((y+10)/380*8+(fbm(x*.003,z*.003)-.5)*.16,0,7.999);
   const b=Math.floor(layer);c.copy(TC[b]).lerp(TC[b+1],sm(0,1,layer-b));
   const shadow=.88+.07*sm(.08,.45,u)+.065*(r-.5)-.11*gully;
   c.multiplyScalar(shadow);
   // Oxide-rich cross beds and undercut bands track the rock's elevation.
   const iron=.5+.5*Math.sin(y*.094+Math.sin(x*.013-z*.008)*2.1);
   c.multiplyScalar(.89+.12*iron);
   if(u>.85)c.lerp(SCRUB,.15*sm(.84,1.3,u));
   // Geographic bands of sandstone: pale river benches, ferric needle formations,
   // dusty gray windcut, and exposed golden rock on the high rim.
   const region=bi/N;
   const amber=sm(.14,.21,region)*(1-sm(.29,.36,region));
   const needle=sm(.32,.39,region)*(1-sm(.45,.51,region));
   const windcut=sm(.46,.54,region)*(1-sm(.61,.67,region));
   const ironZone=sm(.63,.69,region)*(1-sm(.79,.86,region));
   const rim=sm(.82,.88,region);
   c.lerp(BIOME_TINT[0],.13*amber);
   c.lerp(BIOME_TINT[1],.19*needle);
   c.lerp(BIOME_TINT[2],.16*windcut);
   c.lerp(BIOME_TINT[3],.16*ironZone);
   c.lerp(BIOME_TINT[4],.11*rim);
  }
  // Cut into the same terrain heightfield so shortcut walls have true collision.
  const cut=cutNearest(x,z);
  if(cut){
   const width=26-6*Math.sin(Math.PI*cut.u)+3*Math.sin(cut.u*17),
    floor=3.8+19*Math.pow(Math.sin(Math.PI*cut.u),1.2),r=Math.max(0,cut.d-(width-5));
   const maxH=floor+260*Math.pow(r/36,1.45);
   if(maxH<y){
    y=maxH+(fbm(x*.07,z*.07)-.5)*Math.min(3.2,r*.08);
    c.copy(TC[1]).lerp(TC[4],cl(.25+floor/75+.22*fbm(x*.014,z*.014),0,1));
   }
  }
  // CROSSWIND 17.7: open canyon, no rock ceiling, no pinched waterline.
  // Reshape the existing collision-solid heightfield into smoothly rising
  // banks; cover the *entire* water surface edge-to-edge on both shores.
  const courseT=bi/N,channelFade=sm(.213,.255,courseT)*(1-sm(.445,.487,courseT));
  if(channelFade>.00001){
   const rawDist=Math.hypot(dx,dz);
   const riverHalf=FW[bi]*.56;
   const bankDist=Math.max(0,rawDist-riverHalf);
   // Flowing water is fixed at WATER_HEIGHT, so never raise terrain through it.
   const bankY=WATER_HEIGHT-6+266*sm(0,235,bankDist);
   const shorelineFade=1-sm(135,235,bankDist);
   const blend=channelFade*shorelineFade;
   y+=(bankY-y)*blend;
   if(rawDist<=riverHalf+22){
    const bankColor=SAND.clone().lerp(DUST,.20+.2*sm(0,27,bankDist));
    c.lerp(bankColor,channelFade);
   }
  }
  // V17.8: a pair of broad, continuous erosion shoulders replace stray
  // post-Crosswind rock extrusions. This is the SAME terrain/collision mesh,
  // and it tapers into the native canyon at both route ends. No river blockage.
  const shoulderBlend=sm(.445,.493,courseT)*(1-sm(.548,.595,courseT));
  if(shoulderBlend>0){
   const shore=Math.max(0,Math.hypot(dx,dz)-FW[bi]*.56);
   const center=93+9*Math.sin(bi*.017);
   const spread=(shore-center)/70;
   const rise=shoulderBlend*sm(25,49,shore)*Math.exp(-spread*spread)*(8+4*Math.sin(bi*.024+.6));
   y+=rise;
   c.lerp(DUST,.075*shoulderBlend*sm(25,49,shore)*Math.exp(-spread*spread));
  }
  const mottle=.93+.12*vn(x*.06+y*.01,z*.06)+.045*Math.sin(y*.46+fbm(x*.02,z*.02)*6);
  c.multiplyScalar(mottle);
  H[k]=y;pos.setY(k,y);col[k*3]=c.r;col[k*3+1]=c.g;col[k*3+2]=c.b;
 }
 
// v17.11: Crosswind heightfield continuity repair. Grid vertices and H[]
 // are the same geometry and collision surface. Suppress only unnaturally
 // isolated needle discontinuities across nearby vertices in the cut area.
 // Preserve larger coherent sandstone cliffs and normal step changes elsewhere.
 let repairedTerrainVertices=0,maximumRepairedDelta=0;
 const target=new Uint8Array(H.length);
 for(let j=1;j<NS;j++)for(let i=1;i<NS;i++){
  const k=j*NV+i,x=pos.getX(k),z=pos.getZ(k),bi=terrainNearest[k],u=bi/N;
  if(u<.145||u>.662)continue;
  const d=Math.hypot(x-PX[bi],z-PZ[bi]);
  if(d>FW[bi]*.56+265)continue;
  target[k]=1;
 }
 // Each pass replaces extreme single-cell peaks/crevices by the 3x3 median.
 // Median filtering targets the long razor triangles without indiscriminately
 // flattening the wider cliff forms or producing an artificial straight wall.
 for(let pass=0;pass<4;pass++){
  const snap=new Float32Array(H),corrections=[];
  for(let j=2;j<NS-1;j++)for(let i=2;i<NS-1;i++){
   const k=j*NV+i;if(!target[k])continue;
   const ring=[snap[k-1-NV],snap[k-NV],snap[k+1-NV],
    snap[k-1],snap[k],snap[k+1],
    snap[k-1+NV],snap[k+NV],snap[k+1+NV]];
   ring.sort((a,b)=>a-b);
   const med=ring[4],delta=snap[k]-med;
   if(Math.abs(delta)>31){
    const fixed=med+Math.sign(delta)*20;
    corrections.push([k,fixed,Math.abs(delta)]);
   }
  }
  if(!corrections.length)break;
  for(const [k,v,d] of corrections){H[k]=v;pos.setY(k,v);repairedTerrainVertices++;maximumRepairedDelta=Math.max(maximumRepairedDelta,d);}
 }
 window.REDLINE_TERRAIN_REPAIR_QA={repairedTerrainVertices,maximumRepairedDelta,
  passCount:4,region:[.145,.662],grid:NV,collider:'same terrain heightfield H'};
 geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.computeVertexNormals();const nm=geo.attributes.normal;
 for(let k=0;k<NV*NV;k++)if(nm.getY(k)>.92&&H[k]>6){for(let q=0;q<3;q++)col[k*3+q]+=(DUST.getHex?[DUST.r,DUST.g,DUST.b][q]-col[k*3+q]:0)*.08}
 geo.setAttribute('bankFactor',new THREE.BufferAttribute(bankWeights,1));const t=new THREE.Mesh(geo,pbrTerrain(true,true));t.castShadow=false;t.receiveShadow=true;S.add(t);buildBeddedCliffs();
 {const vs=[],uv=[],flow=[],speeds=[],depth=[],foams=[],ix=[],
   nx=HYDRO.nx,ny=HYDRO.ny;let L=0;
  for(let i=0;i<=nx;i++){
   const k=Math.round(i*N/nx);
   if(i){const prev=Math.round((i-1)*N/nx);L+=Math.hypot(PX[k]-PX[prev],PZ[k]-PZ[prev]);}
   const half=FW[k]*.56;
   for(let j=0;j<ny;j++){
    const side=j/(ny-1)*2-1;
    vs.push(PX[k]-TZ[k]*half*side,WATER_HEIGHT,PZ[k]+TX[k]*half*side);
    uv.push(j/(ny-1),L/40);
    flow.push(TX[k],TZ[k]);speeds.push(1);depth.push(4);foams.push(0);
    if(i<nx&&j<ny-1){const a=i*ny+j;ix.push(a,a+ny,a+1,a+1,a+ny,a+ny+1);}
   }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vs,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setAttribute('current',new THREE.Float32BufferAttribute(flow,2));
  g.setAttribute('flowSpeed',new THREE.Float32BufferAttribute(speeds,1));
  g.setAttribute('depth',new THREE.Float32BufferAttribute(depth,1));
  g.setAttribute('foam',new THREE.Float32BufferAttribute(foams,1));
  g.setIndex(ix);g.computeVertexNormals();
  window.RV=new THREE.Mesh(g,createRiverMaterial());RV.frustumCulled=false;RV.renderOrder=1;S.add(RV);
  window.REDLINE_STAGE3_SHORE=REDLINE_VISUALS.createShoreline(THREE,S,{px:PX,pz:PZ,tx:TX,tz:TZ,fw:FW,N},WATER_HEIGHT);
 }
  const lat=(i,l)=>[PX[i]-TZ[i]*l,PZ[i]+TX[i]*l];
 const stage3Cliff=REDLINE_VISUALS.createNearField(THREE,S,{px:PX,pz:PZ,tx:TX,tz:TZ,fw:FW,N},gh,CLIFF_COLLIDER,pbrTerrain(false,true));
 window.REDLINE_STAGE3_GEO_QA={outcrops:stage3Cliff.pieces,triangles:stage3Cliff.triangles,shoreVertices:REDLINE_STAGE3_SHORE.vertices};
 function rock(x,z,rt,rb,h,mat,fr){
  const bankIndex=near(x,z),channelT=bankIndex/N;
  if(channelT>.15&&channelT<.65&&Math.hypot(x-PX[bankIndex],z-PZ[bankIndex])<FW[bankIndex]*.56+48)return;
  const y0=gh(x,z)-4,g=new THREE.CylinderGeometry(rt,rb,h,32,48);g.translate(0,h/2,0);const p=g.attributes.position,cc=[];
  for(let i=0;i<p.count;i++){const px=p.getX(i),py=p.getY(i),pz=p.getZ(i),a=Math.atan2(pz,px),q=py/h,fl=1+.55*Math.exp(-py/(h*.08)),cap=1+.3*sm(.82,.88,q)*(1-.6*sm(.96,1,q)),bd=1+.1*Math.sin(q*34+vn(x,z)*6)*(q<.82?1:.3),fu=.8+.4*(1-Math.abs(2*vn(a*2.5+x,py*.03+z)-1)),n=fl*cap*bd*fu*(1+(vn(a*3+x,py*.08+z)-.5)*.3);p.setX(i,px*n);p.setZ(i,pz*n);
   c.copy(TC[cl(Math.floor((y0+py)/340*7),0,6)]).multiplyScalar(1.3*(.78+.4*vn(py*.1,a*3))*(.82+.28*vn(a*7+x,py*.02))*(q<.04?.8:1));cc.push(c.r,c.g,c.b)}
  g.setAttribute('color',new THREE.Float32BufferAttribute(cc,3));g.computeVertexNormals();const m=new THREE.Mesh(g,mat);m.position.set(x,y0,z);m.castShadow=m.receiveShadow=true;S.add(m);
  const record={x,z,r:(rt+rb)*.525,top:y0+h,m,fr,alive:true,dying:0};
  OB.push(record);m.updateMatrixWorld(true);
  // World-space mesh collision uses the same displaced triangles the player sees.
  CLIFF_COLLIDER.addCylinderProxy(g,m.matrixWorld,record);
 }
 for(let k=0;k<30;k++){
  const u=.135+k*.0053;
  // Previously the early needles could be placed directly inside the narrow
  // opening; keep the Raven approach clear and preserve hazards farther on.
  if(u<.214||(u>.215&&u<.485))continue;
  const i=Math.round(u*N),[x,z]=lat(i,(hash(k,1)-.5)*1.6*FW[i]);
  rock(x,z,3+hash(k,2)*3,4+hash(k,3)*4,70+hash(k,4)*140,rockMat)
 }
 // The old five-rock .375 cluster was directly inside the Crosswind opening.
 // Removed: this section needs clear water from shore to shore.
 // v17.8: remove the old six giant in-river CylinderGeometry rock stacks
 // beyond Crosswind. These were standalone extrusions, not joined cliff ridges.
 // The collision-solid terrain already provides continuous natural banks.
 // Restored split-line rock hazards: each forms a visible slalom or altitude decision.
 for(let j=0;j<7;j++){
   const u=[.182,.286,.355,.454,.531,.668,.830][j];
   const i=Math.floor(u*N),sd=j%2?-1:1;
   const [x,z]=lat(i,sd*FW[i]*(.29+.07*hash(j,821)));
   if(u<.215||u>.55)rock(x,z,7+hash(j,822)*3,10+hash(j,823)*4,60+hash(j,824)*45,rockMat,false);
 }
 // Slalom needles in the dangerous ravine: no rock closes the corridor completely.
 for(let q=0;q<7;q++){
   const j=Math.round((.17+q*.105)*36),p=CUT_POINTS[j],d=CUT_POINTS[Math.min(36,j+1)].clone().sub(CUT_POINTS[Math.max(0,j-1)]).normalize();
   const sign=q%2?1:-1,px=-d.z,pz=d.x,offset=sign*(15+hash(q,227)*5);
   rock(p.x+px*offset,p.z+pz*offset,3.5+hash(q,228)*2,5.5,39+hash(q,229)*22,rockMat,false);
 }
 for(const k of[0,36]){
   const q=CUT_POINTS[k];
   const lamp=new THREE.Mesh(new THREE.OctahedronGeometry(4.4,0),new THREE.MeshStandardMaterial({color:0xffa050,emissive:0xe94b12,emissiveIntensity:1.5,roughness:.35}));
   lamp.position.set(q.x,gh(q.x,q.z)+36,q.z);S.add(lamp);
   const beam=new THREE.Mesh(new THREE.CylinderGeometry(.35,.85,35,8),new THREE.MeshStandardMaterial({color:0x524237,metalness:.6,roughness:.48}));
   beam.position.set(q.x,gh(q.x,q.z)+17,q.z);beam.castShadow=true;S.add(beam);
 }


  // Authored geologic landmarks: displaced, color-layered sandstone fins and arches.
  function fin(i,sgn,height,rad){
   const [x,z]=lat(i,sgn*(FW[i]+37+hash(i,3)*54)),y0=gh(x,z)-6;
   const rings=17,sides=26,v=[],colors=[],ix=[];
   const angle=hash(i,sgn)*6.283,cc=new THREE.Color();
   for(let h=0;h<=rings;h++){
    const f=h/rings,Y=height*f;
    const sh=1.08-.68*f+.13*Math.sin(f*19+hash(i,2)*4)+.06*Math.sin(f*47);
    for(let t=0;t<=sides;t++){
     const a=t/sides*Math.PI*2,noise=vn(x*.06+Math.cos(a)*2+f*3,z*.06+Math.sin(a)*2)-.5;
     const rr=rad*sh*(1+.23*noise+.09*Math.sin(a*5+f*10));
     v.push(Math.cos(a)*rr,Y,Math.sin(a)*rr*.61);
     cc.copy(TC[Math.min(8,Math.floor(f*8))]).multiplyScalar(.89+.18*vn(a*3+f*11,i));
     colors.push(cc.r,cc.g,cc.b);
     if(h<rings&&t<sides){const q=h*(sides+1)+t;ix.push(q,q+1,q+sides+1,q+1,q+sides+2,q+sides+1)}
    }
   }
   const topCenter=v.length/3;v.push(0,height,0);colors.push(.7,.43,.27);
   const bottomCenter=v.length/3;v.push(0,0,0);colors.push(.50,.25,.16);
   for(let t=0;t<sides;t++){
    const topRow=rings*(sides+1);
    ix.push(topCenter,topRow+t+1,topRow+t);
    ix.push(bottomCenter,t,t+1);
   }
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(ix);g.computeVertexNormals();
   const m=new THREE.Mesh(g,pbrTerrain(false));
   m.position.set(x,y0,z);m.rotation.y=angle;m.castShadow=m.receiveShadow=true;S.add(m);
   m.updateMatrixWorld(true);CLIFF_COLLIDER.addGeometry(g,m.matrixWorld);
  }
  for(let n=0;n<22;n++){const i=Math.floor(((n+.3)/22)*N)%N;
   if(i/N>.15&&i/N<.65)continue;
   fin(i,n%2?1:-1,48+hash(n,12)*110,17+hash(n,13)*30)}
  function sandstoneArch(tt,span,rise){
   const i=Math.floor(tt*N),startY=gh(PX[i],PZ[i])+22;
   const pts=[];
   for(let n=0;n<=20;n++){
    const u=n/20,l=(u-.5)*span;
    pts.push(new THREE.Vector3(PX[i]-TZ[i]*l,startY+rise*Math.pow(Math.sin(Math.PI*u),.76),PZ[i]+TX[i]*l));
   }
   const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),66,11,10,false),
     new THREE.MeshStandardMaterial({color:lin('#aa5e42'),roughness:1,map:rep(RT.a,10,1,1)}));
   tube.castShadow=tube.receiveShadow=true;S.add(tube);
   tube.updateMatrixWorld(true);CLIFF_COLLIDER.addGeometry(tube.geometry,tube.matrixWorld);
   ARCH.push(...pts.slice(1,-1));
  }
  sandstoneArch(.11,FW[Math.floor(.11*N)]*2.8,95);
  sandstoneArch(.60,FW[Math.floor(.60*N)]*2.8,105);
  // v17.11: Remove the rejected v17.9 suspended sandstone arch entirely.
  // The channel is intentionally unobstructed until the new dam landmark is
  // blockout-tested and confirmed passable in a GPU-accelerated browser.
  // Scree, chips and broken talus sit mostly on the lower apron and ledges.
  const screeCount=2000,rockGeom=new THREE.IcosahedronGeometry(1,0),rockMaterial=new THREE.MeshStandardMaterial({color:lin('#bd7a57'),roughness:1});
  const talus=new THREE.InstancedMesh(rockGeom,rockMaterial,screeCount),matrix=new THREE.Matrix4(),quat=new THREE.Quaternion(),rot=new THREE.Euler();
  const tones=[lin('#8a4a3b'),lin('#ad6046'),lin('#bd7757'),lin('#d89b70')],ic=new THREE.Color();let drawn=0;
  for(let q=0;q<screeCount*3&&drawn<screeCount;q++){
   const i=Math.floor(hash(q,37)*N),side=hash(q,38)<.5?-1:1,l=side*(FW[i]+hash(q,39)*165),[x,z]=lat(i,l);
   const y=gh(x,z),s=1.5+Math.pow(hash(q,40),2)*8.5;
   if(y<5||y>330)continue;
   if(i/N>.205&&i/N<.54&&Math.abs(l)<FW[i]*.72+25)continue;
   rot.set(hash(q,41)*5,hash(q,42)*6,hash(q,43)*5);quat.setFromEuler(rot);
   matrix.compose(new THREE.Vector3(x,y+s*.2,z),quat,new THREE.Vector3(s,s*.4,s*.8));talus.setMatrixAt(drawn,matrix);
   if(s>5.5&&Math.abs(l)<FW[i]+50)CLIFF_COLLIDER.addGeometry(rockGeom,matrix);
   ic.copy(tones[Math.floor(hash(q,44)*tones.length)]);talus.setColorAt(drawn,ic);drawn++;
  }
  talus.count=drawn;talus.castShadow=false;talus.receiveShadow=true;S.add(talus);

  // Fractured gravel and small sandstone chips along both channel margins.
  const pebGeo=new THREE.DodecahedronGeometry(1,1),pebMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0});
  const pebbles=new THREE.InstancedMesh(pebGeo,pebMat,720),pebM=new THREE.Matrix4(),pebQ=new THREE.Quaternion(),pebE=new THREE.Euler(),pebC=new THREE.Color();
  const pebTones=[0xb88968,0xc49b78,0x8b6150,0x9f735a,0xdec1a0];
  for(let k=0;k<720;k++){
    const i=Math.floor(hash(k,401)*N),sd=hash(k,402)>.5?1:-1;
    const l=sd*FW[i]*(.59+hash(k,403)*.52),pt=lat(i,l),y=gh(pt[0],pt[1]);
    const sc=.45+Math.pow(hash(k,404),2)*2.5;
    // Exposed river-beds have only natural bank gravel, not floating fragments.
    if(i/N>.205&&i/N<.54&&Math.abs(l)<FW[i]*.56+8){
     pebM.compose(new THREE.Vector3(pt[0],WATER_HEIGHT-12,pt[1]),new THREE.Quaternion(),new THREE.Vector3(.001,.001,.001));
     pebbles.setMatrixAt(k,pebM);continue;
    }
    pebE.set(hash(k,405)*6.28,hash(k,406)*6.28,hash(k,407)*6.28);pebQ.setFromEuler(pebE);
    pebM.compose(new THREE.Vector3(pt[0],y+sc*.12,pt[1]),pebQ,new THREE.Vector3(sc,sc*.32,sc*.72));
    pebbles.setMatrixAt(k,pebM);pebC.setHex(pebTones[Math.floor(hash(k,408)*pebTones.length)]);pebbles.setColorAt(k,pebC);
  }
  pebbles.receiveShadow=true;pebbles.castShadow=false;S.add(pebbles);
  // Flood-scoured river rocks and locally broken surface around narrow bends.
 const driftRockMat=pbrTerrain(false);
 const floodRockGeo=new THREE.DodecahedronGeometry(1,1);
 const riverStones=new THREE.InstancedMesh(floodRockGeo,driftRockMat,72),ri=new THREE.Matrix4(),rq=new THREE.Quaternion(),re=new THREE.Euler();
 for(let j=0;j<72;j++){
  const i=Math.floor((.055+.89*hash(j,83))*N),sg=hash(j,84)<.5?-1:1,l=sg*(FW[i]*(.37+.20*hash(j,85)));
  const [x,z]=lat(i,l),y=gh(x,z),scale=2.4+hash(j,86)*5.7;
  re.set(hash(j,87)*3,hash(j,88)*5,hash(j,89)*3);rq.setFromEuler(re);
  ri.compose(new THREE.Vector3(x,y+scale*.45,z),rq,new THREE.Vector3(scale,scale*.65,scale*1.20));
  riverStones.setMatrixAt(j,ri);
  RIVER_ROCKS.push({x,z,top:y+scale*1.1,r:scale*.82});
 }
 riverStones.castShadow=true;riverStones.receiveShadow=true;S.add(riverStones);

function redlineBuildStormline(){
 if(REDLINE_WORLD!=='raven')return;
 const steel=new THREE.MeshStandardMaterial({color:0x303b46,metalness:.75,roughness:.41});
 const alloy=new THREE.MeshStandardMaterial({color:0x647a86,metalness:.80,roughness:.31});
 const guard=new THREE.MeshStandardMaterial({color:0x8d9ca1,metalness:.50,roughness:.56});
 const stripe=new THREE.MeshStandardMaterial({color:0xf1a65b,emissive:0x4d2010,emissiveIntensity:.24,metalness:.50,roughness:.42});
 const box=(g,w,h,d,x,y,z,m)=>{const obj=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);obj.position.set(x,y,z);obj.castShadow=true;obj.receiveShadow=true;g.add(obj);return obj};
 for(const [j,t] of [.115,.265,.515,.725].entries()){
  const k=Math.floor(t*N),width=Math.max(56,Math.min(90,FW[k]*.77));
  const root=new THREE.Group();root.position.set(PX[k],0,PZ[k]);root.rotation.y=Math.atan2(-TX[k],-TZ[k]);S.add(root);
  const yHigh=Math.max(142,gh(PX[k],PZ[k])+98);
  for(const sign of[-1,1]){
   const xx=sign*width,worldX=PX[k]-TZ[k]*xx,worldZ=PZ[k]+TX[k]*xx;
   const base=gh(worldX,worldZ);const top=yHigh-base;
   const pillar=box(root,4.5,top,5.2,xx,base+top/2,0,steel);
   box(root,7,4,8,xx,base+top-2,0,alloy);
   const foot=box(root,13,2.5,13,xx,base+1,0,guard);
   for(let h=base+12;h<yHigh-15;h+=22)box(root,7,.65,7,xx,h,0,stripe);
  }
  box(root,width*2+14,4.0,6,0,yHigh,0,steel);
  box(root,width*2+8,1.1,6.4,0,yHigh-2.3,0,stripe);
  for(let r=0;r<5;r++)box(root,2.2,11,4,-width+width*r/2,yHigh+6,0,alloy);
  // The suspended engineering span visibly connects both sides and touches ground;
  // collision with the high overhead gantry isn't required to finish the route.
 }
}

 // REDLINE V18: both complex assets register their geometry and colliders after
 // the terrain, cliffs and river have been assembled.
 buildBrokenSpillway();
 buildGrandGorgePillars();
 redlineBuildStormline();
 // Solar powered ground markers make shortcut choices apparent before entry.
 for(let j=0;j<16;j++){
  const i=Math.round((.205+j/15*.125)*N)%N;
  const l=j%2?-FW[i]*.82:FW[i]*.82,[x,z]=lat(i,l),y=gh(x,z);
  const marker=new THREE.Mesh(new THREE.BoxGeometry(1.3,3,7),new THREE.MeshStandardMaterial({color:0x565350,roughness:.7,metalness:.2,emissive:0x6a3210,emissiveIntensity:.22}));
  marker.position.set(x,y+2,z);marker.rotation.y=Math.atan2(-TX[i],-TZ[i]);S.add(marker);
 }
 for(let i=0;i<6;i++){const ix=Math.round([.05,.2,.33,.5,.7,.85][i]*N),[x,z]=lat(ix,0),m=new THREE.Mesh(new THREE.SphereGeometry(2.6,16,12),new THREE.MeshBasicMaterial({color:0x8fffd0}));m.position.set(x,gh(x,z)+48,z);S.add(m);PK.push({m,t:0})}
  for(let k=0;k<GATES.length;k++){
  const [t,y,r,name]=GATES[k],i=Math.round(t*N)%N,x=PX[i],z=PZ[i];
  const m=new THREE.Mesh(new THREE.TorusGeometry(r,1.1,10,64),new THREE.MeshStandardMaterial({color:0x2fd8ff,emissive:0x168b99,emissiveIntensity:.9,metalness:.4,roughness:.35,transparent:true,opacity:.83}));
  m.position.set(x,y,z);m.lookAt(x+TX[i],y,z+TZ[i]);S.add(m);
  for(const side of[-1,1]){const lamp=new THREE.Mesh(new THREE.SphereGeometry(2.4,10,8),new THREE.MeshBasicMaterial({color:0xffb56a}));lamp.position.set(x-TZ[i]*r*side,y+TX[i]*r*side*.08,z+TX[i]*r*side);S.add(lamp)}
  GP.push(new THREE.Vector3(x,y,z));GT.push(new THREE.Vector3(TX[i],0,TZ[i]));GM.push(m);
 }
 // Named visual signature for each sector; gate orientation follows local track tangent.
 
function scatter(g,mt,n,mi,ma,sc,hm){const im=new THREE.InstancedMesh(g,mt,n),m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler();let cn=0;
  for(let k=0;k<n*3&&cn<n;k++){const i=Math.floor(hash(k,7)*N),l=(hash(k,9)*2-1)*FW[i]*ma,[x,z]=lat(i,l),h=gh(x,z);if(Math.abs(l)<FW[i]*mi||h<1||h>hm)continue;const s=sc*(.6+hash(k,3));
   e.set(hash(k,4)*6,hash(k,5)*6,0);q.setFromEuler(e);m.compose(new THREE.Vector3(x,h,z),q,new THREE.Vector3(s,s*.8,s));im.setMatrixAt(cn++,m)}
  im.count=cn;im.castShadow=im.receiveShadow=true;S.add(im)}
 scatter(new THREE.IcosahedronGeometry(2.4,0),new THREE.MeshStandardMaterial({color:lin('#907b5a'),roughness:1}),460,.45,1.15,1,18);
 scatter(new THREE.DodecahedronGeometry(3,0),new THREE.MeshStandardMaterial({color:lin('#a47758'),roughness:1}),1400,.2,1.4,2.2,60);
 WFM=new THREE.ShaderMaterial({uniforms:{tm:{value:0},fogc:{value:new THREE.Color(0xd08a68)},sd:{value:sunDir}},transparent:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-4,
  vertexShader:'attribute float ft;varying vec2 vUv;varying vec3 vW;varying float vF;void main(){vUv=uv;vF=ft;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
  fragmentShader:'varying vec2 vUv;varying vec3 vW;varying float vF;uniform float tm;uniform vec3 fogc,sd;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}float fb(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n(p);p=p*2.1+3.;a*=.5;}return s;}void main(){float u=vUv.x,v=vUv.y;float flow=v*.085+tm*5.7;float coarse=fb(vec2(u*17.+n(vec2(u*5.,flow*.12))*.8,flow*.43));float fine=fb(vec2(u*66.+coarse*1.7,flow*1.35));float ropes=smoothstep(.42,.73,coarse*.72+fine*.34);float stray=n(vec2(u*32.,flow*.78));float edge=smoothstep(0.,.055,u)*(1.-smoothstep(.945,1.,u));edge*=.69+.31*stray;float aeration=clamp(ropes*.7+fine*.42,0.,1.);float foot=1.-smoothstep(0.,21.,v);float source=smoothstep(0.,4.,max(vF,0.));float a=clamp((.20+.46*aeration+.30*foot)*edge,0.,.81)*(.92+.08*source);vec3 col=mix(vec3(.20,.31,.35),vec3(.76,.82,.82),aeration);col=mix(col,vec3(.88,.91,.90),foot*.55);col*=.81+.29*max(sd.y,0.);float d=length(cameraPosition-vW);float fog=smoothstep(300.,3200.,d);col=mix(col,fogc,fog);gl_FragColor=vec4(col,a*(1.-fog*.55));}'});
 // Complete rim-to-river waterfalls: top anchor from the ACTUAL cliff mesh,
 // wall-following descent, and a narrow impact point precisely at water level.
 // The base touches (but does not paint over) the river; no bank-terminating sheet.
 const waterfallHeightAt=(profile,y)=>{
  const v=profile.series;
  if(y<=v[0].y)return v[0].d;
  if(y>=v[v.length-1].y)return v[v.length-1].d;
  for(let n=1;n<v.length;n++)if(y<=v[n].y){
   const t=cl((y-v[n-1].y)/(v[n].y-v[n-1].y||1),0,1);
   return v[n-1].d+(v[n].d-v[n-1].d)*t;
  }
  return v[v.length-1].d;
 };
 // Shared rendering materials. Pools are wet patches on the original terrain:
 // no supporting cylinder, extra cliff panel, or fabricated rock feeder wall.
 const FALL_SOURCE_WATER=new THREE.MeshStandardMaterial({color:0x467f87,
  roughness:.23,metalness:.08,transparent:true,opacity:.87,side:THREE.DoubleSide,
  emissive:0x082830,emissiveIntensity:.13,depthWrite:false});
 // Trace against the visible existing cliff. The first solid surface from the
 // river side is either the bedded rock or the original heightfield. Sampling
 // both avoids placing water behind projecting natural stone layers.
 function terrainCliffFace(i,side,y,alongShift,lim){
  const ox=-TZ[i]*side,oz=TX[i]*side,tx=TX[i],tz=TZ[i];
  const bx=PX[i]+tx*alongShift,bz=PZ[i]+tz*alongShift;
  const d0=Math.max(2,FW[i]*.52),d1=Math.min(FW[i]+260,Math.max(lim+24,d0+24));
  const sample=d=>gh(bx+ox*d,bz+oz*d);
  if(sample(d0)>=y)return d0;
  let previous=d0;
  for(let d=d0+7;d<=d1+7;d+=7){
   const here=Math.min(d,d1);
   if(sample(here)>=y){
    let lo=previous,hi=here;
    for(let n=0;n<7;n++){
     const mid=(lo+hi)*.5;
     if(sample(mid)>=y)hi=mid;else lo=mid;
    }
    return hi;
   }
   previous=here;
   if(here>=d1)break;
  }
  return Infinity;
 }
 // The existing bedded wall profiles have true world coordinates. Follow them
 // with a small visual offset (1.25 m), rather than inventing a support wall.
 WATERFALL_PROFILES.forEach(({k,side,i,series,tt})=>{
  const f=FW[i],half=7.5+hash(k,9)*5.8;
  const rim=series[series.length-1],waterY=WATER_HEIGHT+.15;
  const sourceY=rim.y+.24,riverEdge=f*.56,footD=f*.535;
  const outX=-TZ[i]*side,outZ=TX[i]*side,alongX=TX[i],alongZ=TZ[i];
  const topSample=waterfallHeightAt({series},sourceY);
  const fallRockD=y=>waterfallHeightAt({series},y);
  const smoothT=x=>{x=cl(x,0,1);return x*x*(3-2*x)};
  const surfaceDistance=(y,lateral)=>{
   const bed=fallRockD(y);
   const terrain=terrainCliffFace(i,side,y,lateral,bed);
   return Math.max(riverEdge*.75,Math.min(bed,terrain)-1.25);
  };
  // A waterfall follows the exterior rock, including natural undercuts.
  // At the last few metres it enters the river, not a suspended shelf.
  const slices=80,vs=[],uv=[],distFromTop=[],indices=[],points=[];
  let runLength=0,maxDrift=0;
  for(let j=0;j<=slices;j++){
   const t=j/slices,y=waterY+(sourceY-waterY)*t;
   const width=(2.4+(half-2.4)*smoothT(t/.10))*(1+.025*Math.sin(t*24+k*2.3));
   const blend=smoothT(t/.105);
   const rawLeft=surfaceDistance(y,width),rawRight=surfaceDistance(y,-width);
   const dl=footD+(rawLeft-footD)*blend;
   const dr=footD+(rawRight-footD)*blend;
   const lx=PX[i]+outX*dl+alongX*width,lz=PZ[i]+outZ*dl+alongZ*width;
   const rx=PX[i]+outX*dr-alongX*width,rz=PZ[i]+outZ*dr-alongZ*width;
   const point=new THREE.Vector3((lx+rx)*.5,y,(lz+rz)*.5);
   if(j)runLength+=point.distanceTo(points[j-1]);
   points.push(point);
   vs.push(lx,y,lz,rx,y,rz);
   uv.push(0,runLength,1,runLength);
   if(j){const q=(j-1)*2;indices.push(q,q+1,q+2,q+1,q+3,q+2)}
   maxDrift=Math.max(maxDrift,Math.abs((dl+dr)*.5-(riverEdge+13)));
  }
  for(let j=0;j<=slices;j++)distFromTop.push(runLength-uv[j*4+1],runLength-uv[j*4+1]);
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(vs,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setAttribute('ft',new THREE.Float32BufferAttribute(distFromTop,1));
  g.setIndex(indices);g.computeVertexNormals();
  const curtain=new THREE.Mesh(g,WFM);curtain.renderOrder=3;
  curtain.frustumCulled=false;S.add(curtain);
  const foot=points[0],lip=points[points.length-1];
  const sp=[];
  for(let q=0;q<3;q++){
   const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:blob,
    color:0x83bfce,transparent:true,depthWrite:false,opacity:.11}));
   spr.position.set(foot.x+(hash(k,q)-.5)*3.2,waterY+.85,
                    foot.z+(hash(q,k)-.5)*3.2);
   spr.scale.setScalar(2.8+hash(q,k+8)*2.6);S.add(spr);sp.push(spr);
  }
  // P1 WATER: choose a terrain-backed pool with a downhill runoff path to the
  // authentic rim. The feeder is built from ground samples all the way to the
  // support edge, rather than jumping vertically in its final 16 percent.
  const lipD=(lip.x-PX[i])*outX+(lip.z-PZ[i])*outZ;
  const poolRadius=Math.min(4.6,half*.39),poolDepth=3.15;
  const terrainAt=(d,l=0)=>gh(PX[i]+outX*d+alongX*l,PZ[i]+outZ*d+alongZ*l);
  const rimTerrainD=terrainCliffFace(i,side,sourceY,0,Math.max(rim.d+70,lipD+65));
  const supportD=Number.isFinite(rimTerrainD)?Math.max(lipD+1.4,rimTerrainD+1.6):lipD+11.5;
  let chosen=null;
  for(let c=0;c<15;c++){
   const back=7+c*2.6,d=supportD+back,x=PX[i]+outX*d,z=PZ[i]+outZ*d;
   const elev=terrainAt(d),h1=terrainAt(d,poolRadius*.73),h2=terrainAt(d,-poolRadius*.73),
    h3=terrainAt(d+poolDepth*.76),h4=terrainAt(d-poolDepth*.76);
   const relief=Math.max(elev,h1,h2,h3,h4)-Math.min(elev,h1,h2,h3,h4);
   const shore=terrainAt(supportD);
   const lowerPenalty=Math.max(0,shore-elev)*9.0;
   const score=relief*3.2+Math.abs(elev-shore)*1.8+lowerPenalty+back*.095;
   if(!chosen||score<chosen.score)chosen={x,z,d,elev,back,relief,score};
  }
  const poolX=chosen.x,poolZ=chosen.z,pondY=chosen.elev+.12;
  const poolGeo=new THREE.CircleGeometry(1,40).rotateX(-Math.PI/2);
  const poolPos=poolGeo.attributes.position;
  for(let p=0;p<poolPos.count;p++){
   const u=poolPos.getX(p),v=poolPos.getZ(p),w=p?1+.046*Math.sin(p*2.41+k):1;
   const x=poolX+alongX*u*poolRadius*w+outX*v*poolDepth*w;
   const z=poolZ+alongZ*u*poolRadius*w+outZ*v*poolDepth*w;
   poolPos.setXYZ(p,x,gh(x,z)+.12,z);
  }
  poolPos.needsUpdate=true;poolGeo.computeVertexNormals();
  const pond=new THREE.Mesh(poolGeo,FALL_SOURCE_WATER);
  pond.renderOrder=2;pond.receiveShadow=true;S.add(pond);
  // The first 16 segments cling to measured sandstone. The final five segments
  // form a short spill-over lip; elevation change is distributed smoothly, not
  // hidden in a single suspended triangular ribbon.
  const feederVerts=[],feederIndices=[],numFeed=21,groundSamples=[];
  const spillStart=16,entryX=PX[i]+outX*supportD,entryZ=PZ[i]+outZ*supportD;
  const entryY=gh(entryX,entryZ)+.12;
  for(let q=0;q<=numFeed;q++){
   let xx,zz,yy;
   if(q<=spillStart){
    const u=q/spillStart;
    xx=poolX+(entryX-poolX)*u;zz=poolZ+(entryZ-poolZ)*u;
    yy=gh(xx,zz)+.12;
   }else{
    const u=(q-spillStart)/(numFeed-spillStart),ease=u*u*(3-2*u);
    xx=entryX+(lip.x-entryX)*u;zz=entryZ+(lip.z-entryZ)*u;
    yy=entryY+(lip.y-entryY)*ease;
   }
   groundSamples.push(yy-gh(xx,zz));
   const ww=poolRadius*(.37-.13*(q/numFeed));
   feederVerts.push(xx+alongX*ww,yy,zz+alongZ*ww,
                    xx-alongX*ww,yy,zz-alongZ*ww);
   if(q){const v=(q-1)*2;feederIndices.push(v,v+1,v+2,v+1,v+3,v+2)}
  }
  const feedGeo=new THREE.BufferGeometry();
  feedGeo.setAttribute('position',new THREE.Float32BufferAttribute(feederVerts,3));
  feedGeo.setIndex(feederIndices);feedGeo.computeVertexNormals();
  const feeder=new THREE.Mesh(feedGeo,FALL_SOURCE_WATER);
  feeder.renderOrder=2;S.add(feeder);
  // A shallow ring of turbulent water at the foot makes the transition to the
  // river readable. It uses the already loaded waterfall/spray materials.
  const foamRing=new THREE.Mesh(new THREE.RingGeometry(2.9,6.5,36).rotateX(-Math.PI/2),
   new THREE.MeshBasicMaterial({color:0xc7edf0,transparent:true,opacity:.35,depthWrite:false,side:THREE.DoubleSide}));
  foamRing.position.set(foot.x,waterY+.06,foot.z);foamRing.scale.set(1.25,1,.83);S.add(foamRing);
  const feederEnd=new THREE.Vector3(feederVerts[feederVerts.length-6],feederVerts[feederVerts.length-5],feederVerts[feederVerts.length-4]);
  const mouthGap=feederEnd.distanceTo(new THREE.Vector3(lip.x+alongX*poolRadius*.24,lip.y,lip.z+alongZ*poolRadius*.24));
  const supportRise=entryY-lip.y;
  (window.REDLINE_SOURCE_POOLS||=[]).push({fall:k,poolX,poolY:pondY,poolZ,
   lipX:lip.x,lipY:lip.y,lipZ:lip.z,
   movedBackMeters:chosen.back,terrainRelief:chosen.relief,
   sourceLipDelta:entryY-lip.y,feederEndGap:mouthGap,
   supportedByExistingTerrain:true,addedSupportWalls:0});
  WF.push({pts:points,sp,by:waterY,foot,source:lip,profile:tt,
   geometry:g,puddle:pond,feeder,foamRing});
  (window.REDLINE_WATERFALL_QA ||= []).push({fall:k,top:sourceY,bottom:waterY,
   segments:slices,maxDrift,sourceSupported:true,bankTouch:true,
   artificialRockPanels:0,targetCliffClearance:1.25,
   sourceRelief:chosen.relief,spillStartDistance:supportD-lipD,
   poolToSpillRun:chosen.back,sourceLipDelta:supportRise,feederEndGap:mouthGap,
   horizontalRun:Math.hypot(lip.x-foot.x,lip.z-foot.z)});
 });
 plantRealTrees(lat);
  [[.1,70],[.22,40],[.34,95],[.44,55],[.58,85],[.68,35],[.74,70],[.86,60]].forEach(([tt,hy],k)=>{const i=Math.round(tt*N),f=FW[i],anc=s=>{let l=f*.7;for(;l<f+170;l+=2){const[x,z]=lat(i,l*s);if(gh(x,z)>hy+6)break}const[x,z]=lat(i,l*s);return new THREE.Vector3(x,hy,z)},A=anc(1),B=anc(-1),pts=[];
  for(let s=0;s<=12;s++){const q=A.clone().lerp(B,s/12);q.y-=7*Math.sin(Math.PI*s/12);pts.push(q)}
  const cur=new THREE.CatmullRomCurve3(pts),cab=new THREE.Mesh(new THREE.TubeGeometry(cur,32,.35,5),new THREE.MeshStandardMaterial({color:0x2a2a2e,metalness:.9,roughness:.35}));cab.castShadow=true;S.add(cab);
  const car=new THREE.Group();car.add(new THREE.Mesh(new THREE.BoxGeometry(3,3,5),new THREE.MeshStandardMaterial({color:0xb23a2a,metalness:.5,roughness:.5})),new THREE.Mesh(new THREE.SphereGeometry(.7,8,8),new THREE.MeshBasicMaterial({color:0xffd07a})));car.children[1].position.y=2.2;car.traverse(o=>{o.castShadow=true});S.add(car);
  ZL.push({pts,cur,car,sp:.25+hash(k,2)*.2,ph:hash(k,3)*6})});
 // P1 OLD CROSSING: a supported steel-and-timber service bridge instead of
 // an ungrounded single cuboid. End bearings are sampled from the cliff banks.
 {
  const i=Math.round(.7*N),nx=-TZ[i],nz=TX[i],by=78;
  const cx=PX[i],cz=PZ[i],bank=(sgn)=>{
   const st=FW[i]*.45,en=FW[i]+195;
   let d=en;
   for(let v=st;v<=en;v+=2){const x=cx+sgn*nx*v,z=cz+sgn*nz*v;if(gh(x,z)>=by-1.3){d=v;break}}
   return d;
  };
  const left=bank(-1),right=bank(1),length=left+right+10,mid=(right-left)*.5;
  const root=new THREE.Group();root.position.set(cx,0,cz);
  root.rotation.y=Math.atan2(-nz,nx);S.add(root);root.updateMatrixWorld(true);
  const weathered=new THREE.MeshStandardMaterial({color:0x494c4e,metalness:.74,roughness:.61}),
    timber=new THREE.MeshStandardMaterial({color:0x7b553b,roughness:.88,metalness:.03,map:rep(RT.a,17,1,1)}),
    stone=new THREE.MeshStandardMaterial({color:0x957964,roughness:.96,map:PBR_TEX?.cliff_albedo||null});
  const solid=(w,h,d,x,y,z,mat,coll=false)=>{
   const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);
   m.castShadow=true;m.receiveShadow=true;root.add(m);
   if(coll){root.updateMatrixWorld(true);m.updateMatrixWorld(true);CLIFF_COLLIDER.addGeometry(m.geometry,m.matrixWorld)}
   return m;
  };
  // Bearing sockets and tapered foundations merge into the measured rock at both banks.
  const anchors=[];
  for(const [sgn,dist] of [[-1,left],[1,right]]){
   const x=sgn*dist,p=new THREE.Vector3(x,0,0).applyMatrix4(root.matrixWorld);
   const terrain=gh(p.x,p.z),baseY=terrain-8,seatY=by-2;
   const h=Math.max(4,seatY-baseY),top=Math.max(seatY,baseY+4);
   solid(15,h,16,x-2*sgn,baseY+h/2,0,stone,true);
   solid(18,4,18,x-2*sgn,seatY,0,weathered,true);
   solid(24,5,23,x+sgn*3,terrain-4,0,stone);
   anchors.push({side:sgn,x: p.x,z:p.z,terrain,foundationBottom:baseY,deck:by});
  }
  // Continuous load-carrying beams; simple static meshes share their colliders.
  solid(length,2.6,2.0,mid,by-1.8,-5.0,weathered,true);
  solid(length,2.6,2.0,mid,by-1.8,5.0,weathered,true);
  solid(length,1.3,12.4,mid,by,0,timber,true);
  // Railing bays, diagonals and crossbracing use instancing for browser performance.
  const bays=Math.max(10,Math.min(40,Math.ceil(length/12))),step=length/bays;
  const plankGeo=new THREE.BoxGeometry(.60,.48,12.8),planks=new THREE.InstancedMesh(plankGeo,timber,bays*2+1);
  const postGeo=new THREE.BoxGeometry(.76,5.2,.76),posts=new THREE.InstancedMesh(postGeo,weathered,(bays+1)*2);
  const plankO=new THREE.Object3D(),postO=new THREE.Object3D();
  for(let j=0;j<=bays*2;j++){plankO.position.set(mid-length/2+j*length/(bays*2),by+.85,0);plankO.updateMatrix();planks.setMatrixAt(j,plankO.matrix)}
  let pi=0;
  for(let j=0;j<=bays;j++)for(const side of[-1,1]){
   postO.position.set(mid-length/2+j*step,by+4.1,side*5.3);postO.updateMatrix();posts.setMatrixAt(pi++,postO.matrix);
  }
  planks.castShadow=planks.receiveShadow=true;posts.castShadow=true;
  planks.instanceMatrix.needsUpdate=true;posts.instanceMatrix.needsUpdate=true;root.add(planks,posts);
  for(const side of[-1,1]){
   solid(length,1.1,.75,mid,by+6.6,side*5.3,weathered);
   solid(length,.55,.72,mid,by+3.5,side*5.3,weathered);
   for(let j=0;j<bays;j++){
    const x=mid-length/2+(j+.5)*step;
    const diag=solid(.58,Math.hypot(step,4.9),.45,x,by+4.1,side*5.3,weathered);
    diag.rotation.z=(j%2?1:-1)*Math.atan2(step,4.9);
   }
  }
  root.updateMatrixWorld(true);
  BRG={x:cx,z:cz,tx:TX[i],tz:TZ[i],nx,nz,y:by,h:length*.5,off:mid};
  window.REDLINE_P1_CROSSING={span:length,anchorDistances:[left,right],anchors,grounded:anchors.every(a=>a.foundationBottom<a.terrain)};
 }
 // Industrial wind-cutters: moving obstacles during the Ironwall sector. // Industrial wind-cutters: moving obstacles during the Ironwall sector.
 for(let j=0;j<2;j++){
  const ix2=Math.floor((.739+j*.029)*N),x=PX[ix2],z=PZ[ix2],ty=74+j*15;
  const yaw=Math.atan2(-TX[ix2],-TZ[ix2]);
  const group=new THREE.Group();group.position.set(x,ty,z);group.rotation.y=yaw;
  const axle=new THREE.Mesh(new THREE.CylinderGeometry(2.6,2.6,4,16).rotateX(Math.PI/2),
    new THREE.MeshStandardMaterial({color:0x4a4945,metalness:.68,roughness:.49}));
  group.add(axle);
  const arm=new THREE.Group(),metal=new THREE.MeshStandardMaterial({color:0x575d5f,metalness:.72,roughness:.46}),
        caution=new THREE.MeshStandardMaterial({color:0xc58b4c,metalness:.51,roughness:.52});
  const blade=new THREE.Mesh(new THREE.BoxGeometry(37,2.8,2.4),metal);
  blade.position.x=18.5;blade.castShadow=true;arm.add(blade);
  for(let k=0;k<5;k++){
   const stripe=new THREE.Mesh(new THREE.BoxGeometry(3.1,3.1,2.7),caution);
   stripe.position.x=6.2+k*7;stripe.castShadow=true;arm.add(stripe);
  }
  group.add(arm);
  const beacon=new THREE.Mesh(new THREE.SphereGeometry(2.3,14,10),new THREE.MeshStandardMaterial({color:0xdb9359,emissive:0x8e471a,emissiveIntensity:.65}));
  beacon.position.y=2;group.add(beacon);
  group.castShadow=true;S.add(group);
  SWINGERS.push({x,z,y:ty,tx:TX[ix2],tz:TZ[ix2],arm,length:37,angle:0,phase:j*1.8});
 }
 initCanyonFlocks();
 // Instanced birds are now size-appropriate moving race hazards; 18 instead of 46.
}
/* REDLINE v39 BLADE NOIR · six independent orange plasma exhausts.
   The GLB is +Z forward. These jets stay in GLB local coordinates and rotate
   with their vehicle mount; REDLINE's physics body remains -Z forward. */
const REDLINE_BLADE_EXHAUST=(()=>{
 // V39: mounted, gimbaled jet exhaust — six independent exhaust sockets.
 // One pair of lightweight shader shells + one shared-geometry particle pool per jet.
 // Shaders use scroll bands, a bright potential core, turbulent taper and feathered edges;
 // no expensive volumetric raymarch or shadow-casting exhaust meshes.
 const sockets=[
  {name:'FRONT_PORT',p:[-3.17,-1.76,4.68],rear:false,rotor:'PF'},
  {name:'FRONT_STARBOARD',p:[3.17,-1.76,4.68],rear:false,rotor:'SF'},
  {name:'REAR_PORT',p:[-3.17,-1.76,-3.58],rear:false,rotor:'PR'},
  {name:'REAR_STARBOARD',p:[3.17,-1.76,-3.58],rear:false,rotor:'SR'},
  {name:'AFT_PORT',p:[-1.97,-.76,-5.50],rear:true,rotor:'PR'},
  {name:'AFT_STARBOARD',p:[1.97,-.76,-5.50],rear:true,rotor:'SR'}
 ];
 let sparkTex=null;
 function sparkTexture(){
  if(sparkTex)return sparkTex;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=48;
  const ctx=canvas.getContext('2d');const grad=ctx.createRadialGradient(24,24,0,24,24,23);
  grad.addColorStop(0,'rgba(255,252,226,1)');grad.addColorStop(.28,'rgba(255,191,71,.9)');
  grad.addColorStop(.68,'rgba(255,73,10,.32)');grad.addColorStop(1,'rgba(255,30,0,0)');
  ctx.fillStyle=grad;ctx.fillRect(0,0,48,48);sparkTex=new THREE.CanvasTexture(canvas);return sparkTex;
 }
 const plumeGeo=new THREE.CylinderGeometry(.27,.028,1,18,18,true);
 plumeGeo.translate(0,-.5,0); // nozzle anchored at y=0; exhaust streams towards negative Y
 const coreGeo=new THREE.CylinderGeometry(.128,.009,1,14,16,true);coreGeo.translate(0,-.5,0);
 const jetVertex=`
  uniform float uTime; uniform float uThrust;
  varying float vDown; varying float vFacing; varying float vNoise;
  void main(){
    float q=clamp(-position.y,0.0,1.0);
    vec3 p=position;vDown=q;
    // Advect several scales of turbulence through the plume, rather than
    // producing a solid cone or stationary stripes.
    float coarse=sin(q*16.0-uTime*21.0+position.x*17.0);
    float fine=sin(q*43.0-uTime*46.0+position.z*24.0);
    float helix=sin(q*21.0-uTime*17.0+atan(position.z,position.x)*2.0);
    float distortion=(coarse*.10+fine*.045+helix*.035)*q;
    p.xz *= 1.0+q*(.12+distortion)*clamp(uThrust,.35,1.8);
    p.x+=q*q*.055*sin(uTime*12.0+q*18.0);
    p.z+=q*q*.05*cos(uTime*11.0+q*20.0);
    vec4 mv=modelViewMatrix*vec4(p,1.0);
    vec3 n=normalize(normalMatrix*normal);
    vFacing=abs(dot(n,normalize(-mv.xyz)));
    vNoise=coarse*.45+fine*.20+helix*.20;
    gl_Position=projectionMatrix*mv;
  }`;
 const jetFragment=`
  uniform float uTime; uniform float uThrust; uniform float uCore;
  varying float vDown; varying float vFacing; varying float vNoise;
  void main(){
   float q=clamp(vDown,0.0,1.0);
   vec3 whiteHot=vec3(1.0,.97,.83);
   vec3 golden=vec3(1.0,.70,.27);
   vec3 orange=vec3(1.0,.32,.045);
   vec3 ember=vec3(.68,.095,.015);
   vec3 col=mix(whiteHot,golden,smoothstep(.04,.28,q));
   col=mix(col,orange,smoothstep(.20,.58,q));
   col=mix(col,ember,smoothstep(.58,1.0,q));
   // Soft periodic compression rings resemble imperfect jet shock diamonds.
   float rings=.76+.24*pow(.5+.5*cos(q*57.0-uTime*34.0),2.0);
   float turbulence=clamp(.91+.18*vNoise,.53,1.27);
   float limb=pow(clamp(1.0-vFacing,0.0,1.0),.60);
   float start=smoothstep(.0,.035,q);
   float tail=1.0-smoothstep(.52,1.0,q);
   float luminance=(.30+.70*clamp(uThrust,0.0,1.8));
   float alpha=start*tail*rings*turbulence*luminance*(.25+.75*limb);
   alpha*=uCore>.5?1.12:.57;
   gl_FragColor=vec4(col,clamp(alpha,0.0,.86));
  }`;
 const matOptions={vertexShader:jetVertex,fragmentShader:jetFragment,
  transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,
  side:THREE.DoubleSide};
 const shader=(core)=>new THREE.ShaderMaterial({...matOptions,uniforms:{
  uTime:{value:0},uThrust:{value:.5},uCore:{value:core?1:0}}});
 const ringGeo=new THREE.TorusGeometry(.265,.043,6,24);
 const ringMat=new THREE.MeshBasicMaterial({color:0xffa640,transparent:true,opacity:.84,
  blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,Number.isFinite(v)?v:0));
 function make(parent,showroom=false,customSockets=null){
  const tex=sparkTexture();const emitters=[];
  const activeSockets=customSockets||sockets;
  for(let n=0;n<activeSockets.length;n++){
   const spec=activeSockets[n],origin=new THREE.Group();origin.name='Blade_Noir_Thruster_'+spec.name;
   origin.position.set(...spec.p);parent.add(origin);
   const gimbal=new THREE.Group();gimbal.name=spec.name+'_Gimbal';origin.add(gimbal);
   const core=new THREE.Mesh(coreGeo,shader(true)),shell=new THREE.Mesh(plumeGeo,shader(false));
   core.frustumCulled=false;shell.frustumCulled=false;
   core.renderOrder=8;shell.renderOrder=7;gimbal.add(shell,core);
   const rim=new THREE.Mesh(ringGeo,ringMat);rim.rotation.x=Math.PI/2;rim.position.y=-.03;gimbal.add(rim);
   const count=showroom?12:20,buffer=new Float32Array(count*3);
   const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.BufferAttribute(buffer,3));
   const points=new THREE.Points(geom,new THREE.PointsMaterial({map:tex,color:0xff9b35,
     size:showroom?.32:.38,sizeAttenuation:true,transparent:true,depthWrite:false,
     blending:THREE.AdditiveBlending,opacity:.72}));
   points.frustumCulled=false;points.renderOrder=9;gimbal.add(points);
   emitters.push({origin,gimbal,core,shell,rim,points,buffer,count,rear:spec.rear,
    index:spec.followMount?Math.max(0,['PF','SF','PR','SR'].indexOf(spec.rotor)):n,rotor:spec.rotor,name:spec.name,followMount:!!spec.followMount,exhaustLevel:0.5});
  }
  return emitters;
 }
 function animate(emitters,t,inputs=.60){
  if(!emitters)return;
  const flight=typeof inputs==='number'?null:inputs;
  const level=flight?0.55:inputs;
  const mix=flight?.mix;
  const lift=clamp(Math.abs(flight?.command?.lift||0),0,1);
  const vertical=clamp(Math.abs(flight?.vy||0)/45,0,1.5);
  const boost=flight?.boost?1:0;
  const drive=clamp(Math.abs(flight?.command?.drive||0),0,1);
  const yawAccel=clamp((flight?.yawAccel||0)/14,-1,1);
  for(const e of emitters){
   const rotor=mix?.rotors?.[e.rotor];
   const desired=flight?clamp(.35+(rotor?.thrust||.60)*.48+lift*.60+
    vertical*.50+boost*.37+(e.rear?drive*.55:0),.30,1.75):clamp(level,.2,1.4);
   e.exhaustLevel+=(desired-e.exhaustLevel)*.22;
   const power=e.exhaustLevel;
   // The model faces +Z in its native GLB, opposite to the game's -Z.
   // Invert Kestrel gimbal components, keeping the exhaust reaction aligned
   // with forward/strafe acceleration. The aft pair adds rearward fixed bias.
   const tx=e.followMount?0:(flight?clamp(-(rotor?.tiltX||0)*.86+(e.rear?1.10:0),-.44,1.48):(e.rear?1.10:0));
   const tz=e.followMount?0:(flight?clamp(-(rotor?.tiltZ||0)*.89 + (e.index%2===0?-1:1)*yawAccel*.028,-.48,.48):0);
   e.gimbal.rotation.x+=(tx-e.gimbal.rotation.x)*.19;
   e.gimbal.rotation.z+=(tz-e.gimbal.rotation.z)*.19;
   const len=(e.rear?5.2:(e.followMount?3.95:3.45))*(.36+power*.94);
   const flutter=1+.035*Math.sin(t*37+e.index*2.71)+.018*Math.sin(t*79-e.index);
   e.core.scale.set(.90,len*.92*flutter,.90);
   e.shell.scale.set(1.24,len*1.27*flutter,1.24);
   e.core.material.uniforms.uTime.value=t+e.index*.13;
   e.core.material.uniforms.uThrust.value=power;
   e.shell.material.uniforms.uTime.value=t+e.index*.13;
   e.shell.material.uniforms.uThrust.value=power;
   e.rim.material.opacity=.55+.20*Math.min(power,1.4);
   const pos=e.buffer;
   for(let i=0;i<e.count;i++){
    const age=(t*(.69+power*.38)+i/e.count+e.index*.151)%1;
    const angle=i*2.399963+e.index*1.79;
    const radius=(.08+Math.pow(age,1.34)*.60)*(1+.19*Math.sin(t*9+i));
    pos[i*3]=Math.cos(angle)*radius;
    pos[i*3+1]=-.12-age*len*.98;
    pos[i*3+2]=Math.sin(angle)*radius;
   }
   e.points.geometry.attributes.position.needsUpdate=true;
   e.points.material.opacity=clamp(.38+power*.24,0,.88);
  }
 }
 return {make,animate,sockets};
})();

// ---- Kestrel drone (nose = local -Z)
// Low-cost ghost silhouette: replays only the fastest lap; it cannot collide.
const ghostCraft=new THREE.Group();
const ghostMat=new THREE.MeshBasicMaterial({color:0x72ecff,transparent:true,opacity:.30,depthWrite:false,side:THREE.DoubleSide});
const ghostBody=new THREE.Mesh(new THREE.ConeGeometry(1.9,9.6,5).rotateX(-Math.PI/2),ghostMat);
ghostBody.position.z=-.3;ghostCraft.add(ghostBody);
for(const side of[-1,1]){
 const wing=new THREE.Mesh(new THREE.BoxGeometry(6.4,.12,1.5),ghostMat);
 wing.position.set(side*3.3,0,1.1);ghostCraft.add(wing);
}
ghostCraft.scale.setScalar(1.8);ghostCraft.visible=false;ghostCraft.renderOrder=7;S.add(ghostCraft);
let kestrelGameArt=null,bladeGameArt=null,bladeGameJets=null,kestrelGameJets=[];
let copperGameArt=null,copperGameFx=null,copperGameLoading=null;
let spiritGameArt=null,spiritGameFx=null,spiritGameLoading=null;
function redlineActiveAirframe(){const m=window.redlineUI?.config?.model;return ['blade','copper','spirit'].includes(m)?m:'kestrel';}
function redlineAirframeLabel(model=redlineActiveAirframe()){
 return model==='spirit'?'SPIRIT NOCTURNE':model==='copper'?'COPPER WRAITH':model==='blade'?'BLADE NOIR':'KESTREL X4';
}
function redlineSyncAirframe(){const selected=redlineActiveAirframe(),blade=selected==='blade',copper=selected==='copper',spirit=selected==='spirit';
 // If a selected GLB has not finished parsing, keep the Kestrel fallback visible.
 if(kestrelGameArt)kestrelGameArt.visible=(selected==='kestrel')||(blade&&!bladeGameArt)||(copper&&!copperGameArt)||(spirit&&!spiritGameArt);
 if(bladeGameArt)bladeGameArt.visible=blade;
 if(copperGameArt)copperGameArt.visible=copper;
 if(spiritGameArt)spiritGameArt.visible=spirit;
 for(const light of BL.s)light.visible=selected==='kestrel';
 if(BL.brakeAssembly)BL.brakeAssembly.visible=selected==='kestrel';
 if(CLASH.liveryRoot)CLASH.liveryRoot.visible=selected==='kestrel';
 for(const jet of kestrelGameJets)jet.origin.visible=selected==='kestrel';
 window.REDLINE_BLADE_STATUS={selection:selected,ready:!!bladeGameArt,jets:bladeGameJets?.length||0,
     kestrelJets:kestrelGameJets.length,sharedFlight:true,gameModel:bladeGameArt?.name||null};
 window.REDLINE_COPPER_STATUS={selection:selected,ready:!!copperGameArt,engines:copperGameFx?.engines?.length||0,
     gameModel:copperGameArt?.name||null,sharedFlight:true,loading:!!copperGameLoading};
 window.REDLINE_SPIRIT_STATUS={selection:selected,ready:!!spiritGameArt,engines:spiritGameFx?.engines?.length||0,sharedFlight:true,loading:!!spiritGameLoading};
}
const dr=new THREE.Group(),dm=new THREE.MeshStandardMaterial({color:0x0b0d10,metalness:.3,roughness:.32}),cu=new THREE.MeshStandardMaterial({color:0xc27a46,metalness:1,roughness:.28}),cy=new THREE.MeshBasicMaterial({color:0x8fefff});
{const sh=new THREE.Shape(),Rp=[[1,3.8],[1.6,1.2],[3.6,-1.4],[3.4,-2.3],[1.8,-2.8],[1.9,-5.6]];sh.moveTo(0,5.7);Rp.forEach(p=>sh.lineTo(p[0],p[1]));sh.lineTo(0,-5.6);Rp.slice().reverse().forEach(p=>sh.lineTo(-p[0],p[1]));sh.closePath();
 const hg=new THREE.ExtrudeGeometry(sh,{depth:.8,bevelEnabled:true,bevelSize:.15,bevelThickness:.15,bevelSegments:2});hg.rotateX(-Math.PI/2);dr.add(new THREE.Mesh(hg,dm));
 const bx=(w,h,d,x,y,z,ry,m)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m||cu);o.position.set(x,y,z);o.rotation.y=ry||0;dr.add(o);return o};
 bx(.1,.1,9,0,1.08,.2);[1,-1].forEach(s=>{bx(.12,.1,4.2,s*2.55,.98,-.1,s*.52);bx(.1,.1,3,s*.7,1.05,-3.2,s*.2)});bx(.4,.25,.2,0,.7,5.6,0,new THREE.MeshBasicMaterial({color:0xff5a4a}));
 const cn=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),new THREE.MeshStandardMaterial({color:0x4d7c8c,transparent:true,opacity:.40,depthWrite:false,roughness:.08,metalness:.07,side:THREE.FrontSide}));cn.scale.set(.95,.52,2.3);cn.position.set(0,1.06,-.9);dr.add(cn)}
// Four independent tilt-rotor nacelles, driven by horizontal commands only.
const VECTOR_PODS=[];
let lastVectorCommand={drive:0,steer:0,lift:0,brake:false};
let lastRotorOutput=REDLINE_THRUST.mix({},{});
function animateVectorPods(dt){
 // Flight physics owns body position and yaw. This solver only allocates
 // visible four-rotor thrust from the acceleration the physics actually made.
 const out=REDLINE_THRUST.mix(FL,{throttle:lastVectorCommand.drive,
   steer:lastVectorCommand.steer,lift:lastVectorCommand.lift,
   brake:lastVectorCommand.brake},dt);
 lastRotorOutput=out;
 const alpha=1-Math.exp(-Math.min(.05,Math.max(0,dt))*15.2);
 for(const pod of VECTOR_PODS){
  const motor=out.rotors[pod.tag];if(!motor)continue;
  // Movable engine housing, NOT its load-bearing connector or linkage.
  // Keep a visible vectored-exhaust response while limiting open seams at the fixed mount.
  const xTarget=THREE.MathUtils.clamp(motor.tiltX*1.48,-.38,.38);
  const zTarget=THREE.MathUtils.clamp(motor.tiltZ*1.45,-.35,.35);
  pod.gimbal.rotation.x+=(xTarget-pod.gimbal.rotation.x)*alpha;
  pod.gimbal.rotation.z+=(zTarget-pod.gimbal.rotation.z)*alpha;
  // The suspension arm never yaws or tilts; yaw loads change individual pod thrust.
  pod.gimbal.rotation.y+=(0-pod.gimbal.rotation.y)*alpha;
 }
 // Render identical force-driven vectors on the low-detail fallback drone.
 if(!VECTOR_PODS.length)POD.forEach((g,i)=>{
  const rotor=out.rotors[['SF','PF','SR','PR'][i]];
  if(!rotor)return;
  g.rotation.x+=(rotor.tiltX-g.rotation.x)*alpha;
  g.rotation.z+=(rotor.tiltZ-g.rotation.z)*alpha;
 });
}
const POD=[],NZ=[];[[3.3,-2.6],[-3.3,-2.6],[3.3,2.3],[-3.3,2.3]].forEach(([px,pz])=>{const g=new THREE.Group(),tl=new THREE.Group(),s=Math.sign(px),L=Math.abs(px)-1.6,arm=new THREE.Mesh(new THREE.BoxGeometry(L,.24,.3),dm);arm.position.set(s*(1.6+L/2),.5,pz);dr.add(arm);
 g.position.set(px,.5,pz);tl.add(new THREE.Mesh(new THREE.CylinderGeometry(1.25,1.25,.45,28),dm));const rg=new THREE.Mesh(new THREE.TorusGeometry(1.05,.08,8,40),cy);rg.rotation.x=Math.PI/2;rg.position.y=.24;tl.add(rg);
 const hb=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.5,12),cu);hb.position.y=.25;tl.add(hb);const nz=new THREE.Mesh(new THREE.CylinderGeometry(.5,.28,.9,16,1,true),new THREE.MeshBasicMaterial({color:0x8fefff,transparent:true,opacity:.5,side:THREE.DoubleSide}));nz.position.y=-.65;tl.add(nz);
 g.add(tl);dr.add(g);POD.push(tl);NZ.push(nz)});
// fallback drone stays visible until detailed asset loads
const FLM=[],BL={m:new THREE.MeshBasicMaterial({color:0x5a0c0a}),s:[],brakeAssembly:null};var MIX,LAS=[];
{const PI=Math.PI,DS=THREE.DoubleSide;
 const gc=document.createElement('canvas');gc.width=gc.height=64;{const g=gc.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.35,'rgba(255,255,255,.4)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64)}const gt=new THREE.CanvasTexture(gc);
 const ft=(a,b,c)=>{const cv=document.createElement('canvas');cv.width=8;cv.height=64;const g=cv.getContext('2d'),r=g.createLinearGradient(0,0,0,64);r.addColorStop(0,a);r.addColorStop(.5,b);r.addColorStop(1,c);g.fillStyle=r;g.fillRect(0,0,8,64);return new THREE.CanvasTexture(cv)},
  fmat=t=>new THREE.MeshBasicMaterial({map:t,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:DS}),
  m1=fmat(ft('rgba(120,190,255,0)','rgba(190,225,255,.7)','rgba(255,255,255,1)')),m2=fmat(ft('rgba(255,60,20,0)','rgba(255,120,30,.55)','rgba(255,230,160,.95)')),
  FC=new THREE.ConeGeometry(.3,1,16,1,true).rotateX(PI).translate(0,-.5,0),FO=new THREE.ConeGeometry(.5,1,16,1,true).rotateX(PI).translate(0,-.5,0);
 parseGLB(THREE,GLB_AB).then(KM=>{dr.clear();
  if(CLASH.liveryRoot)dr.add(CLASH.liveryRoot);
  POD.length=0;NZ.length=0;VECTOR_PODS.length=0;
  KM.scene.traverse(o=>{const n=o.userData.gltfName||'';if(/plasma flame core|Plasma downwash halo/i.test(n))o.visible=false;const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms)if(m&&m.name==='03 / iridescent titanium copper')m.color.copy(lin('#a66d48'))});
  KM.scene.traverse(o=>{
   if(!o.isMesh)return;
   const mats=Array.isArray(o.material)?o.material:[o.material];
   const main=mats[0],name=(main?.name||'').toLowerCase();
   const luminous=/photonic|plasma|ion cyan|hover flame|brake light/.test(name);
   o.castShadow=!luminous&&main?.type!=='MeshBasicMaterial';
   o.receiveShadow=!luminous;
   for(const m of mats){if(!m?.isMeshStandardMaterial)continue;
    if(/ceramic black|graphite carbon/.test(m.name||''))m.roughness=Math.max(.32,m.roughness);
    else if(/bead blasted titanium/.test(m.name||''))m.roughness=Math.max(.30,m.roughness);
    else if(/smoked canopy/.test(m.name||'')){
     // v43: true clear cockpit glazing; preserve a subtle blue-grey reflection
     // but do not hide the modeled seat and instruments beneath an opaque dome.
     m.color.setHex(0x8aabbc);m.transparent=true;m.opacity=.47;m.depthWrite=false;
     m.side=THREE.FrontSide;m.roughness=.09;m.metalness=.06;m.needsUpdate=true;
     o.castShadow=false;o.receiveShadow=false;o.renderOrder=9;
    }
    // Shared game reflection probe: Kestrel receives the same specular
    // treatment as Blade Noir; retain original normal/roughness textures.
    if(!luminous && /copper|titanium|outer abrasion rim|machined/i.test(m.name||'')){
      m.metalness=Math.max(.66,m.metalness);m.roughness=Math.min(.30,m.roughness);
    }
    m.envMapIntensity=luminous?.65:(/canopy/i.test(m.name||'')?1.85:1.55);m.needsUpdate=true;
   }
  });
  dr.add(KM.scene);kestrelGameArt=KM.scene;
  // The Blender asset contains named parts for every actual nacelle. Group
  // only nacelle hardware around its original rotation center; keep suspension
  // arms fixed to the hull. Reparenting retains original world positions and
  // the impeller animation continues targeting its existing glTF node.
  const pads=[['PF',-3.7,-2.35],['PR',-3.7,2.35],
              ['SF', 3.7,-2.35],['SR', 3.7,2.35]];
  for(const [tag,x,z] of pads){
    const hub=KM.scene.getObjectByName('gltf_node_'+({PF:76,PR:119,SF:156,SR:191}[tag]));
    if(!hub||!hub.parent){console.warn('No tilt gimbal hardware for',tag);continue}
    const root=hub.parent,pivot=new THREE.Vector3(x,0,z);
    const gimbal=new THREE.Group();gimbal.name='TiltRotor_'+tag;
    gimbal.position.copy(pivot);root.add(gimbal);
    const targets=[];
    for(const obj of root.children.slice()){
      if(obj===gimbal||!obj.userData.gltfName)continue;
      const name=obj.userData.gltfName;
      const tagged=name.startsWith(tag+' ')||name.startsWith(tag+' /');
      const sharedRing=/^Upper nacelle (cyan containment ring|fine etched inner ring)/i.test(name);
      if(!tagged&&!sharedRing)continue;
      // Explicit asset semantics beat radial proximity: pistons, wishbones,
      // clamps and joints were previously reparented and lifted from the hull.
      // Only the actual engine assembly may move about this pivot.
      const movable=/lift impeller rotor|copper rim inlay|cyan ion containment ring|hub bearing|inner luminous circuit|lift throat glow|lower venturi bell|nacelle upper clamshell|outer abrasion rim|stator hub|venturi vane|^Upper nacelle (cyan containment ring|fine etched inner ring)/i.test(name);
      if(!movable)continue;
      const radial=Math.hypot(obj.position.x-x,obj.position.z-z);
      if(radial>1.05)continue;
      targets.push(obj);
    }
    targets.forEach(obj=>{gimbal.add(obj);obj.position.sub(pivot)});
    VECTOR_PODS.push({tag,gimbal,side:Math.sign(x),parts:targets.length});
  }
  // Four warm afterburner plumes attached to actual tilting Kestrel nacelles.
  // Exhaust inherits the nacelle's rotation exactly; no double vectoring.
  kestrelGameJets=VECTOR_PODS.flatMap(p=>REDLINE_BLADE_EXHAUST.make(p.gimbal,false,[
    {name:'KESTREL_'+p.tag,p:[0,-1.04,0],rear:false,rotor:p.tag,followMount:true}
  ]));
  window.REDLINE_KESTREL_JET_COUNT=kestrelGameJets.length;
  // Public diagnostics for testing: rigid arms stay attached to the GLB chassis.
  window.REDLINE_TILT_PODS=VECTOR_PODS.map(p=>({name:p.tag,parts:p.parts,movable:'nacelle-only',armRigid:true}));
  MIX=new THREE.AnimationMixer(KM.scene);
  for(const c of KM.animations){if(c.name.includes('lift impeller rotor'))MIX.clipAction(c).play();else if(c.name.includes('Laser bay hinge'))LAS.push(MIX.clipAction(c))}
  [[-3.55,-2.91],[3.55,-2.91],[-3.55,2.91],[3.55,2.91]].forEach(([x,z])=>{const fl=new THREE.Group();fl.name='REDLINE_RUNTIME_LEGACY_EXHAUST';const nacelle=VECTOR_PODS.find(p=>Math.sign(x)===p.side&&Math.sign(z)===(p.tag.endsWith('F')?-1:1));
   if(nacelle){fl.position.set(0,-.8,0);nacelle.gimbal.add(fl)}
   else{fl.position.set(x,-.8,z);dr.add(fl)}
   const core=new THREE.Mesh(FC,m1),outer=new THREE.Mesh(FO,m2);fl.add(core,outer);
   const gs=new THREE.Sprite(new THREE.SpriteMaterial({map:gt,color:0xffa050,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,opacity:.7}));gs.scale.setScalar(3);fl.add(gs);
   // Low-cost vent mist is also a child of the tilting nacelle. Its downwash
   // therefore tracks the same vector as the flames without a second solver.
   const mist=new THREE.Sprite(new THREE.SpriteMaterial({map:gt,color:0x9eb6bb,
    transparent:true,opacity:.13,depthWrite:false}));
   mist.position.set(0,-2.7,.05);mist.scale.set(3.5,4.6,1);fl.add(mist);
   FLM.push({core,outer,gs,mist,tag:(x<0?'P':'S')+(z<0?'F':'R'),fan:{rotation:{y:0}},sd:Math.sign(x)})});
  const brakeAssembly=new THREE.Group();brakeAssembly.name='Kestrel_Only_RearBrakeLights';
  [-1,1].forEach(s=>{const b=new THREE.Mesh(new THREE.BoxGeometry(.8,.1,.08),BL.m);b.position.set(s*.62,.63,5.7);brakeAssembly.add(b);
   const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:gt,color:0xff2a1a,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,opacity:.3}));sp.position.set(s*.62,.63,5.9);sp.scale.setScalar(2);brakeAssembly.add(sp);BL.s.push(sp)});
  BL.brakeAssembly=brakeAssembly;dr.add(brakeAssembly);
  window.REDLINE_MODEL_TEMPLATE=KM.scene.clone(true);
  // The showroom gets its OWN jets. Strip runtime plume shells copied with
  // the cloned GLB so that no double flames/particles appear around Kestrel.
  window.REDLINE_MODEL_TEMPLATE.traverse(node=>{
   for(const child of node.children.slice())
    if(child.name==='REDLINE_RUNTIME_LEGACY_EXHAUST'||child.name?.startsWith('Blade_Noir_Thruster_'))node.remove(child);
  });
  window.REDLINE_MODEL_CLIPS=KM.animations;window.dispatchEvent(new Event('redline-drone-loaded'));
   redlineSyncAirframe();
   // Mobile defers the unselected Blade so Kestrel appears sooner.
   if(window.redlineUI?.config?.model==='blade')loadBladeFlightArt().catch(()=>{});
 }).catch(e=>console.warn('Kestrel GLB failed',e));}
// Kestrel is the primary showroom craft. Blade remains selectable, but its
// mesh buffers and PNGs are decoded only when a mobile user actually selects it.
let bladeGameLoading=null;
function loadBladeFlightArt(){
 if(bladeGameArt)return Promise.resolve(bladeGameArt);
 if(bladeGameLoading)return bladeGameLoading;
 if(!window.REDLINE_BLADE_ASSET)return Promise.reject(new Error('Blade Noir asset unavailable'));
 bladeGameLoading=parseGLB(THREE,window.REDLINE_BLADE_ASSET.loadBuffer()).then(BM=>{
     const bladeRoot=new THREE.Group();bladeRoot.name='REDLINE_Blade_Noir_v9_Flight';
     const art=new THREE.Group();art.name='Blade_Noir_GLTF_Z_Forward_Adaptor';
     art.rotation.y=Math.PI;art.add(BM.scene);bladeRoot.add(art);
     bladeGameJets=REDLINE_BLADE_EXHAUST.make(BM.scene,false);
     BM.scene.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;
       const mats=Array.isArray(o.material)?o.material:[o.material];
       for(const mat of mats){if(!mat?.isMeshStandardMaterial)continue;
        mat.envMapIntensity=1.6;
        if(/paint|armor/i.test(mat.name||'')){mat.roughness=Math.min(.27,mat.roughness);mat.metalness=Math.max(.85,mat.metalness);}
        if(/glass/i.test(mat.name||'')){mat.roughness=.11;mat.transparent=true;mat.opacity=.70;mat.depthWrite=false;mat.side=THREE.DoubleSide;}
       }
     });
     bladeGameArt=bladeRoot;dr.add(bladeGameArt);
     // Clone after the optional visual emitters are added: the showroom builds
     // its own jets; only the original 31-mesh authored GLB is stored here.
     window.REDLINE_BLADE_TEMPLATE=BM.scene.clone(true);
     // Remove gameplay-only particle rigs from the showroom copy.
     for(const child of window.REDLINE_BLADE_TEMPLATE.children.slice())if(child.name?.startsWith('Blade_Noir_Thruster_'))window.REDLINE_BLADE_TEMPLATE.remove(child);
     window.REDLINE_BLADE_READY=true;
     redlineSyncAirframe();
     window.dispatchEvent(new Event('redline-blade-loaded'));
     return bladeGameArt;
   }).catch(error=>{console.error('Blade Noir glTF parse failed',error);
     window.REDLINE_BLADE_ERROR=String(error);bladeGameLoading=null;throw error;});
 return bladeGameLoading;
}
// Third game airframe is intentionally lazy: avoid decoding 7 MB of glTF data
// until the pilot selects Copper Wraith. The two existing aircraft boot unchanged.
let copperAssetFetch=null;
function redlineEnsureCopperAsset(){
 if(window.REDLINE_COPPER_ASSET)return Promise.resolve(window.REDLINE_COPPER_ASSET);
 if(copperAssetFetch)return copperAssetFetch;
 copperAssetFetch=new Promise((resolve,reject)=>{
  const hold=document.getElementById('redlineCopperDeferred');
  const code=hold?.textContent?.trim()||'';
  const script=document.createElement('script');
  const finish=()=>window.REDLINE_COPPER_ASSET?resolve(window.REDLINE_COPPER_ASSET):reject(new Error('Copper model script did not initialize'));
  if(code){
   // Standalone HTML: this string was transported as inert text so Safari
   // did not have to parse 9.5MB of unselected aircraft JS during startup.
   script.textContent=code;document.head.appendChild(script);finish();
  }else{
   // Vercel deployment: Copper JS is neither downloaded nor parsed until selected.
   script.src=hold?.getAttribute('data-src')||'scripts/19c_copper_wraith_glb.js';
   script.async=true;script.onload=finish;script.onerror=()=>reject(new Error('Unable to fetch Copper Wraith model script'));
   document.head.appendChild(script);
  }
 }).catch(error=>{copperAssetFetch=null;throw error;});
 return copperAssetFetch;
}
function loadCopperFlightArt(){
 if(copperGameArt)return Promise.resolve(copperGameArt);
 if(copperGameLoading)return copperGameLoading;
 copperGameLoading=redlineEnsureCopperAsset().then(asset=>parseGLB(THREE,asset.loadBuffer())).then(CM=>{
   const art=new THREE.Group();art.rotation.y=Math.PI;
   const wrapper=new THREE.Group();wrapper.name='REDLINE_Copper_Wraith_v4_Flight';
   CM.scene.traverse(o=>{if(!o.isMesh)return;
     o.castShadow=true;o.receiveShadow=true;
     for(const m of(Array.isArray(o.material)?o.material:[o.material])){
      if(!m?.isMeshStandardMaterial)continue;
      m.envMapIntensity=1.72;
      if(/glass|viewport/i.test(m.name||'')){m.transparent=true;m.opacity=.69;
       m.depthWrite=false;m.roughness=.065;m.side=THREE.DoubleSide;o.castShadow=false;o.renderOrder=9;}
     }
   });
   window.REDLINE_COPPER_TEMPLATE=CM.scene.clone(true);
   // Guard against rotating glTF child-mesh frustum flicker.
   CM.scene.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
   copperGameFx=REDLINE_COPPER_FX.make(CM.scene,false);
   art.add(CM.scene);wrapper.add(art);copperGameArt=wrapper;dr.add(wrapper);
   window.REDLINE_COPPER_READY=true;
   redlineSyncAirframe();
   window.dispatchEvent(new Event('redline-copper-loaded'));
   return wrapper;
 }).catch(e=>{window.REDLINE_COPPER_ERROR=String(e);copperGameLoading=null;
  console.error('Copper Wraith model failed to load',e);throw e;});
 return copperGameLoading;
}
// Fourth aircraft: lazy game GLB and deterministic cached import. Keeps v47 mobile startup fast.
let spiritAssetFetch=null;
function redlineEnsureSpiritAsset(){
 if(window.REDLINE_SPIRIT_ASSET)return Promise.resolve(window.REDLINE_SPIRIT_ASSET);
 if(spiritAssetFetch)return spiritAssetFetch;
 spiritAssetFetch=new Promise((resolve,reject)=>{
  const holder=document.getElementById('redlineSpiritDeferred');
  const text=holder?.textContent?.trim()||'',script=document.createElement('script');
  const success=()=>window.REDLINE_SPIRIT_ASSET?resolve(window.REDLINE_SPIRIT_ASSET):reject(new Error('Spirit GLB source did not initialize'));
  if(text){script.textContent=text;document.head.appendChild(script);success();}
  else{script.src=holder?.getAttribute('data-src')||'scripts/19e_spirit_nocturne_glb.js';script.async=true;
   script.onload=success;script.onerror=()=>reject(new Error('Failed loading Spirit Nocturne model source'));
   document.head.appendChild(script);}
 }).catch(err=>{spiritAssetFetch=null;throw err;});
 return spiritAssetFetch;
}
function loadSpiritFlightArt(){
 if(spiritGameArt)return Promise.resolve(spiritGameArt);
 if(spiritGameLoading)return spiritGameLoading;
 spiritGameLoading=redlineEnsureSpiritAsset().then(asset=>parseGLB(THREE,asset.loadBuffer())).then(BM=>{
  // Original +Z is nose forward; game nose is -Z. Preserve aspect ratio.
  const adapter=new THREE.Group();adapter.rotation.y=Math.PI;adapter.scale.setScalar(.275);
  BM.scene.traverse(o=>{if(!o.isMesh)return;
   const mats=Array.isArray(o.material)?o.material:[o.material];
   const translucent=mats.some(m=>/glass/i.test(m?.name||''));
   o.castShadow=!translucent;o.receiveShadow=!translucent;
   for(const m of mats){if(!m?.isMeshStandardMaterial)continue;
    const name=(m.name||'').toLowerCase();
    m.envMapIntensity=/glass/.test(name)?.78:/skin|carbon|wing|black_edge/.test(name)?.43:.66;
    if(/glass/i.test(m.name||'')){m.transparent=true;m.opacity=.57;m.depthWrite=false;
     m.roughness=Math.max(.10,Math.min(.16,m.roughness));m.side=THREE.DoubleSide;o.renderOrder=9;}
    if(/skin|carbon|wing|black_edge/i.test(m.name||'')){
     m.metalness=Math.min(.14,m.metalness);m.roughness=Math.max(.46,m.roughness);
     if(m.isMeshPhysicalMaterial){m.clearcoat=Math.min(.22,m.clearcoat);m.clearcoatRoughness=Math.max(.48,m.clearcoatRoughness);}
    }
    if(/bevel|gunmetal/i.test(name)){m.roughness=Math.max(.44,m.roughness);m.metalness=Math.min(.5,m.metalness);}
   }
  });
  // Clone BEFORE adding the runtime exhaust: hangar has its own rig.
  window.REDLINE_SPIRIT_TEMPLATE=BM.scene.clone(true);
  spiritGameFx=REDLINE_SPIRIT_FX.make(BM.scene,false);
  adapter.add(BM.scene);
  const wrapper=new THREE.Group();wrapper.name='REDLINE_Spirit_Nocturne_v4_Flight';wrapper.add(adapter);
  dr.add(wrapper);spiritGameArt=wrapper;
  window.REDLINE_SPIRIT_READY=true;redlineSyncAirframe();
  window.dispatchEvent(new Event('redline-spirit-loaded'));
  return wrapper;
 }).catch(err=>{window.REDLINE_SPIRIT_ERROR=String(err);spiritGameLoading=null;
  console.error('Spirit Nocturne model load failed',err);throw err;});
 return spiritGameLoading;
}

// Existing startup still loads Kestrel and Blade; only a persisted Copper selection
// triggers its heavier GLB after the page has initialized.
setTimeout(()=>{if(window.redlineUI?.config?.model==='blade')loadBladeFlightArt().catch(()=>{});if(window.redlineUI?.config?.model==='copper')loadCopperFlightArt().catch(()=>{});if(window.redlineUI?.config?.model==='spirit')loadSpiritFlightArt().catch(()=>{});},1100);
function FLAME(bo,top,steer,dt){
 const braking=(K.KeyS&&st.spd>2)||REDLINE_BINDINGS.isDown(K,'brake');
 const frame=lastRotorOutput;
 FLM.forEach((fl,i)=>{
  // When the detailed nacelles load, the new feathered jets replace the old
  // triangle cones. Keep the old visuals only as an asset-load fallback.
  const legacyVisible=kestrelGameJets.length===0;
  for(const fx of [fl.core,fl.outer,fl.gs,fl.mist])if(fx)fx.visible=legacyVisible;
  if(!legacyVisible)return;
  const motor=frame?.rotors[fl.tag];
  const thrust=motor?.thrust??.60;
  // Per-rotor intensity follows allocated thrust, vertical lift and yaw
  // differential. Random variation is tiny and visual only, not game physics.
  const fluctuation=1+.033*Math.sin(time*36+i*2.7);
  const strength=cl(thrust,0,1.48);
  const length=(1.6+3.8*strength+(bo?.75:0))*fluctuation;
  const width=.78+.26*strength;
  fl.core.scale.set(width,length*.56,width);
  fl.outer.scale.set(width*1.15,length,width*1.15);
  fl.core.rotation.y+=dt*(7+7*strength);
  fl.outer.rotation.y-=dt*(5+4*strength);
  fl.gs.material.opacity=cl(.22+.42*strength,.05,.94);
  fl.gs.scale.setScalar(2+3*strength);
  if(fl.mist){fl.mist.material.opacity=.06+.11*strength;
   fl.mist.position.y=-2.1-.65*strength;
   fl.mist.scale.set(2.6+strength,3.2+strength*2,1);}
  fl.fan.rotation.y+=dt*(10+44*strength);
 });
 BL.m.color.setHex(braking?0xff2418:0x5a0c0a);
 BL.s.forEach(s=>s.material.opacity=braking?.95:.28);
}
const hl=new THREE.PointLight(0xfff0d8,2.2,300,1.4);hl.position.set(0,8,-10);dr.add(hl);dr.traverse(o=>{if(!o.isMesh)return;
  const m=Array.isArray(o.material)?o.material[0]:o.material;
  const materialName=(m?.name||'').toLowerCase();
  const luminous=/plasma|photonic|ion cyan|hover flame|brake light/.test(materialName);
  o.castShadow=!luminous&&m?.type!=='MeshBasicMaterial';
  o.receiveShadow=!luminous;
  if(m&&m.isMeshStandardMaterial&&!luminous){
   if(/ceramic black|graphite carbon/.test(materialName))m.roughness=Math.max(.30,m.roughness);
   if(/bead blasted titanium/.test(materialName))m.roughness=Math.max(.32,m.roughness);
   if(/canopy/.test(materialName)){m.roughness=.09;m.metalness=.06;m.envMapIntensity=1.55;}
   m.needsUpdate=true;
  }
 });REDLINE_VISUALS.detailDrone(THREE,dr);dr.scale.setScalar(1.8);S.add(dr);
// Soft height-dependent contact shadow complements the existing sun shadow,
// avoiding the disconnected floating look at low altitude without extra shadow passes.
const rl41ShadowCanvas=document.createElement('canvas');rl41ShadowCanvas.width=rl41ShadowCanvas.height=128;
const rl41Ctx=rl41ShadowCanvas.getContext('2d');
const rl41Gradient=rl41Ctx.createRadialGradient(64,64,2,64,64,62);
rl41Gradient.addColorStop(0,'rgba(0,0,0,.42)');rl41Gradient.addColorStop(.55,'rgba(0,0,0,.17)');rl41Gradient.addColorStop(1,'rgba(0,0,0,0)');
rl41Ctx.fillStyle=rl41Gradient;rl41Ctx.fillRect(0,0,128,128);
const rl41Contact=new THREE.Mesh(new THREE.PlaneGeometry(22,18),
 new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(rl41ShadowCanvas),transparent:true,opacity:0,
 depthTest:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
rl41Contact.rotation.x=-Math.PI/2;rl41Contact.renderOrder=4;S.add(rl41Contact);
const rl41JetBounce=new THREE.PointLight(0xff983a,0,65,2);
rl41JetBounce.castShadow=false;S.add(rl41JetBounce);

// Speed impact: anisotropic exhaust streaks, an ignition pulse, and synthesized engine/wind.
const BOOSTFX=new THREE.Group();S.add(BOOSTFX);
const BOOST_TRAILS=[];
for(let j=0;j<18;j++){
 const a=j*2.39996,r=7+hash(j,974)*5;
 // Gradient alpha along the streak: fade at the end nearest the Kestrel,
 // build intensity outward, soften the distant tip. A shared normalized
 // geometry makes the shader independent of each streak's world length.
 const mat=new THREE.MeshBasicMaterial({color:j%5===0?0xffb35a:0x93eaff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});
 mat.onBeforeCompile=(shader)=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float rlTrailAxis;');
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nrlTrailAxis=position.z+0.5;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float rlTrailAxis;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',
   '#include <color_fragment>\ndiffuseColor.a *= smoothstep(0.03,0.43,rlTrailAxis) * (1.0 - 0.52*smoothstep(0.78,1.0,rlTrailAxis));');
 };
 mat.customProgramCacheKey=()=> 'redline-v32-nearship-gradient';
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(.085,.085,1),mat);
 mesh.userData.trailLength=6+hash(j,976)*16;
 mesh.position.set(Math.cos(a)*r,Math.sin(a)*r*.65,9+hash(j,977)*16);BOOSTFX.add(mesh);BOOST_TRAILS.push(mesh);
}
const BOOST_PULSE=new THREE.Mesh(new THREE.TorusGeometry(5.8,.19,7,48),new THREE.MeshBasicMaterial({color:0xc6f8ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
BOOST_PULSE.position.z=7;BOOST_PULSE.visible=false;BOOSTFX.add(BOOST_PULSE);
let boostPreviously=false,pulseAge=9,engineAudio=null,soundMuted=false;
const REDLINE_AUDIO_ENGINE=REDLINE_AUDIO.create(window);
// Start only on a real gesture, respecting browser autoplay policies.
window.addEventListener('pointerdown',()=>REDLINE_AUDIO_ENGINE.start(),{once:true,passive:true});
window.addEventListener('keydown',()=>REDLINE_AUDIO_ENGINE.start(),{once:true,passive:true});
function startEngineAudio(){REDLINE_AUDIO_ENGINE.start();REDLINE_AUDIO_ENGINE.setMuted(soundMuted);}
function soundFrame(v,bo,active){
 REDLINE_AUDIO_ENGINE.setMuted(soundMuted);
 REDLINE_AUDIO_ENGINE.setVolume((redlineUI?.config?.volume??65)/100);
 REDLINE_AUDIO_ENGINE.update({speed:v,boost:bo,active,altitude:redlineRiverAltitude(st.p.y)});
}
function boostFrame(bo,dt,p){
 BOOSTFX.position.copy(p);BOOSTFX.quaternion.copy(dr.quaternion);BOOSTFX.scale.copy(dr.scale);
 if(!bo){boostPreviously=false;pulseAge=9;BOOSTFX.visible=false;BOOST_PULSE.visible=false;
  BOOST_TRAILS.forEach(m=>{m.visible=false;m.material.opacity=0;});return;}

 if(bo&&!boostPreviously){pulseAge=0;BOOST_PULSE.visible=true;REDLINE_AUDIO_ENGINE.play('boost');}
 boostPreviously=bo;pulseAge+=dt;
 BOOSTFX.visible=bo||pulseAge<.34;
 BOOST_TRAILS.forEach((m,i)=>{
  // The legacy Kestrel starburst floats outside the much wider flying wing.
  // Spirit has native recessed afterburners, so never show detached rods.
  m.visible=bo&&redlineActiveAirframe()!=='spirit';
  if(m.visible){m.material.opacity=.22+.34*hash(i,970)+Math.random()*.12;
   m.scale.z=m.userData.trailLength*(.86+Math.random()*.65);m.position.z=11+(i%4)*4+Math.random()*4;
  }
 });
 if(pulseAge<.34){BOOST_PULSE.visible=redlineActiveAirframe()!=='spirit';BOOST_PULSE.scale.setScalar(.75+pulseAge*4);
  BOOST_PULSE.material.opacity=.76*(1-pulseAge/.34);
 }else BOOST_PULSE.visible=false;
}


// REDLINE PHOTONIC LANCES -- two nose-mounted, layered emissive beams.
// Reuse geometry/materials instead of rebuilding GPU objects for every shot.
const LASER_GROUPS=[],LASER_DISTANCE=410,LASER_DURATION=.42;
const laserAxis=new THREE.Vector3(0,1,0);
const laserGeom=[new THREE.CylinderGeometry(.24,.24,1,12),
                 new THREE.CylinderGeometry(.66,.66,1,12),
                 new THREE.CylinderGeometry(1.42,1.42,1,12)];
const flareCanvas=document.createElement('canvas');flareCanvas.width=flareCanvas.height=128;
{const ctx=flareCanvas.getContext('2d'),r=ctx.createRadialGradient(64,64,0,64,64,64);
 r.addColorStop(0,'rgba(255,255,245,1)');r.addColorStop(.09,'rgba(255,135,85,.97)');
 r.addColorStop(.24,'rgba(255,26,14,.70)');r.addColorStop(.55,'rgba(255,8,0,.16)');
 r.addColorStop(1,'rgba(255,0,0,0)');ctx.fillStyle=r;ctx.fillRect(0,0,128,128)}
const laserFlare=new THREE.CanvasTexture(flareCanvas);
function makeLaserFx(){
 const parts=[new THREE.Mesh(laserGeom[0],new THREE.MeshBasicMaterial({color:0xffe1ba,transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending})),
  new THREE.Mesh(laserGeom[1],new THREE.MeshBasicMaterial({color:0xff190a,transparent:true,opacity:.82,depthWrite:false,blending:THREE.AdditiveBlending})),
  new THREE.Mesh(laserGeom[2],new THREE.MeshBasicMaterial({color:0xff0806,transparent:true,opacity:.26,depthWrite:false,blending:THREE.AdditiveBlending}))];
 const sprMat=(opacity)=>new THREE.SpriteMaterial({map:laserFlare,color:0xff3314,transparent:true,
  blending:THREE.AdditiveBlending,depthWrite:false,opacity});
 const muzzle=new THREE.Sprite(sprMat(1)),impact=new THREE.Sprite(sprMat(1));
 const ring=new THREE.Mesh(new THREE.RingGeometry(1.1,1.85,32),
  new THREE.MeshBasicMaterial({color:0xff3b11,transparent:true,opacity:.85,
   blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false}));
 const sparkPos=new Float32Array(12*3),sparkGeo=new THREE.BufferGeometry();
 sparkGeo.setAttribute('position',new THREE.BufferAttribute(sparkPos,3));
 const sparks=new THREE.Points(sparkGeo,new THREE.PointsMaterial({color:0xff8c3e,size:1.7,
  map:laserFlare,transparent:true,opacity:1,blending:THREE.AdditiveBlending,
  depthWrite:false,sizeAttenuation:true}));
 parts.forEach(m=>{m.visible=false;m.frustumCulled=false;m.renderOrder=9;S.add(m)});
 for(const m of[muzzle,impact,ring,sparks]){m.visible=false;m.frustumCulled=false;m.renderOrder=10;S.add(m)}
 const fx={parts,muzzle,impact,ring,sparks,sparkPos,life:0,length:0,from:new THREE.Vector3(),
  to:new THREE.Vector3(),forward:new THREE.Vector3(),hit:false,seed:Math.random()*99};
 LASER_GROUPS.push(fx);return fx;
}
[-1,1].forEach(()=>makeLaserFx());
function placeLaser(start,end,hit,index){
 const fx=LASER_GROUPS[index],dir=end.clone().sub(start),distance=dir.length();
 if(distance<.05)return;
 dir.normalize();fx.from.copy(start);fx.to.copy(end);fx.forward.copy(dir);fx.length=distance;
 fx.hit=hit;fx.life=LASER_DURATION;
 const mid=start.clone().addScaledVector(dir,distance*.5),q=new THREE.Quaternion().setFromUnitVectors(laserAxis,dir);
 fx.parts.forEach(p=>{p.visible=true;p.position.copy(mid);p.quaternion.copy(q);p.scale.set(1,distance,1)});
 fx.muzzle.position.copy(start);fx.muzzle.scale.set(9,9,1);fx.muzzle.visible=true;
 fx.impact.position.copy(end);fx.impact.scale.set(12,12,1);fx.impact.visible=hit;
 fx.ring.position.copy(end);fx.ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dir.clone().negate());
 fx.ring.visible=hit;fx.ring.scale.setScalar(1);
 fx.sparks.position.copy(end);fx.sparks.visible=hit;
}

function keepLaserMuzzlesAttached(){
 dr.updateMatrixWorld(true);
 for(let i=0;i<LASER_GROUPS.length;i++){
  const fx=LASER_GROUPS[i];if(fx.life<=0)continue;
  const start=dr.localToWorld(new THREE.Vector3((i===0?-1:1)*2.55,.60,-2.45));
  // Shot endpoint remains the one actually raycast at trigger time; do not switch
  // back to drone heading and DO NOT perform new collision rays for an old shot.
  const end=fx.to.clone();const vector=end.clone().sub(start),dist=Math.max(.01,vector.length());
  const direction=vector.normalize();const mid=start.clone().addScaledVector(direction,dist*.5);
  const q=new THREE.Quaternion().setFromUnitVectors(laserAxis,direction);
  fx.parts.forEach(part=>{part.position.copy(mid);part.quaternion.copy(q);part.scale.set(1,dist,1)});
  fx.muzzle.position.copy(start);
  // Impact flashes and sparks stay on the original target even as the player moves.
 }
}
function advanceLaserFX(dt){
 for(const fx of LASER_GROUPS){if(fx.life<=0)continue;
  fx.life-=dt;const fraction=Math.max(0,fx.life/LASER_DURATION);
  if(fraction<=0){fx.parts.forEach(o=>o.visible=false);for(const o of[fx.muzzle,fx.impact,fx.ring,fx.sparks])o.visible=false;continue}
  // The core remains bright briefly, while the outer bloom decays quickly.
  fx.parts[0].material.opacity=Math.min(1,fraction*3);
  fx.parts[1].material.opacity=.85*Math.min(1,fraction*3.5);
  fx.parts[2].material.opacity=.33*fraction;
  fx.muzzle.material.opacity=fraction*1.2;fx.muzzle.scale.setScalar(5+10*fraction);
  if(fx.hit){fx.impact.material.opacity=Math.min(1,fraction*2.8);
   fx.impact.scale.setScalar(7+15*(1-fraction));
   fx.ring.material.opacity=.8*fraction;
   fx.ring.scale.setScalar(1+6*(1-fraction));
   const a=fx.sparkPos;
   for(let i=0;i<12;i++){
    const angle=i*2.399963+fx.seed,spread=(1-fraction)*(4+i%3*2);
    a[3*i]=Math.cos(angle)*spread;a[3*i+1]=Math.sin(angle*1.6)*spread;
    a[3*i+2]=Math.sin(angle)*spread;
   }
   fx.sparks.geometry.attributes.position.needsUpdate=true;
   fx.sparks.material.opacity=fraction*.95;
  }
 }
}
// REDLINE v17.12: collision response that separates the craft from the surface,
// then briefly pushes it away. Keep this independent from forward throttle so
// the player can still steer, lift, reverse and escape a bad approach.
function redlineEscapeCandidate(q){
 if(q.y<gh(q.x,q.z)+8.2 || q.y>WATER_HEIGHT+REDLINE_MAX_ALTITUDE_ABOVE_RIVER)return false;
 if(CLIFF_COLLIDER.contact(q,8.0))return false;
 for(const o of OB)if(o.alive&&q.y<o.top+6&&Math.hypot(q.x-o.x,q.z-o.z)<o.r+8.5)return false;
 for(const r of RIVER_ROCKS)if(q.y<r.top+6&&Math.hypot(q.x-r.x,q.z-r.z)<r.r+7.5)return false;
 return true;
}
function redlineImpactKick(point,normal,previous){
 if(mode!=='run')return false;
 st.lastContactFrame=time;
 if(time<(st.nextKickAt||-Infinity))return false;
 const n=new THREE.Vector3(normal.nx??normal.x??0,normal.ny??normal.y??0,normal.nz??normal.z??0);
 if(n.lengthSq()<.00001)n.subVectors(previous,point);
 if(n.lengthSq()<.00001)n.set(-Math.sin(st.yaw),.15,-Math.cos(st.yaw));
 n.normalize();
 // A shallow lift prevents ledges and wall corners from holding the drone in place.
 if(n.y>-.45&&n.y<.24){n.y=.24;n.normalize()}
 for(const offset of [3.5,2,1]){
  const q=point.clone().addScaledVector(n,offset);
  if(redlineEscapeCandidate(q)){point.copy(q);break}
 }
 const toward=FL.vx*n.x+FL.vy*n.y+FL.vz*n.z;
 if(toward<0){FL.vx-=toward*n.x;FL.vy-=toward*n.y;FL.vz-=toward*n.z}
 const easyCrash=window.redlineUI?.config?.handlingMode==='easy'&&window.redlineUI?.config?.beginnerAssist;FL.speed*=easyCrash?.50:.18;FL.vx*=easyCrash?.56:.35;FL.vz*=easyCrash?.56:.35;FL.vy*=easyCrash?.65:.5;
 st.vy=FL.vy;
 st.lastImpactNormal=n.clone();
 st.kickVelocity=n.multiplyScalar(easyCrash?7:27);  st.kickRemaining=easyCrash?.16:.30;  st.nextKickAt=time+(easyCrash?.20:.34);
 return true;
}
function redlineCheckDislodge(point,previous,dt){
 const active=st.lastContactFrame===time&&point.distanceTo(previous)<Math.max(3.5,Math.abs(FL.speed)*dt*.35);
 const trying=!!(K.KeyW||K.KeyS||K.KeyA||K.KeyD||REDLINE_BINDINGS.isDown(K,'climb')||REDLINE_BINDINGS.isDown(K,'descend'));
 st.blockedFor=active&&trying?(st.blockedFor||0)+dt:Math.max(0,(st.blockedFor||0)-dt*3);
 if(st.blockedFor<.65 || time<(st.nextDislodgeAt||-Infinity))return false;
 // Prefer the already visited safe position, then search close-by tangential
 // positions and slightly higher clearances. Never teleport into another solid.
 const candidates=[];
 if(st.lastFreePoint&&point.distanceTo(st.lastFreePoint)<18)candidates.push(st.lastFreePoint.clone());
 for(const distance of [5,9,13])for(const lift of [2,7])for(let k=0;k<12;k++){
  const a=k*Math.PI/6;
  candidates.push(point.clone().add(new THREE.Vector3(Math.cos(a)*distance,lift,Math.sin(a)*distance)));
 }
 const valid=candidates.filter(redlineEscapeCandidate);
 if(!valid.length){st.blockedFor=.3;st.nextDislodgeAt=time+.5;return false}
 const outward=st.lastImpactNormal||new THREE.Vector3(0,1,0);
 const preferred=valid.filter(q=>q.clone().sub(point).dot(outward)>2);
 const options=preferred.length?preferred:valid;
 options.sort((a,b)=>a.distanceToSquared(point)-b.distanceToSquared(point));
 const target=options[0],away=target.clone().sub(point);point.copy(target);
 away.y=Math.max(away.y,2);away.normalize();
 st.kickVelocity=away.multiplyScalar(18);st.kickRemaining=.24;
 FL.speed=0;FL.vx=FL.vy=FL.vz=0;st.vy=0;
 st.blockedFor=0;st.nextDislodgeAt=time+1;
 msg('AUTO DISLODGE  /  FLY CLEAR',700);
 return true;
}
function laserZap(){REDLINE_AUDIO_ENGINE.play('laser');}
// Uses the same cliff triangle spatial hash as collision, then samples the actual
// terrain heightfield. First impact wins. Shoots do not pierce canyon walls.
function laserWorldHit(origin,direction,maxDistance=LASER_DISTANCE){
 let best=CLIFF_COLLIDER.castRay(origin,direction,maxDistance),limit=best?.distance??maxDistance;
 // Sampled heightfield collision, refined by binary search at the crossing.
 let prev=1.5;
 for(let d=4;d<=limit+3;d+=3.3){
  const distance=Math.min(d,limit);
  const x=origin.x+direction.x*distance,z=origin.z+direction.z*distance;
  if(origin.y+direction.y*distance<=gh(x,z)+.6){
   let lo=prev,hi=distance;
   for(let k=0;k<8;k++){
    const mid=(lo+hi)*.5,X=origin.x+direction.x*mid,Z=origin.z+direction.z*mid;
    if(origin.y+direction.y*mid<=gh(X,Z)+.6)hi=mid;else lo=mid;
   }
   if(hi<limit&&hi>1.25){limit=hi;best={distance:hi,
    point:origin.clone().addScaledVector(direction,hi),kind:'ground'}};break;
  }
  prev=distance;if(distance>=limit)break;
 }
 // Solid rocks and race obstacles. The ray is evaluated before applying damage.
 const ray=new THREE.Ray(origin,direction),tmp=new THREE.Vector3(),sphere=new THREE.Sphere();
 for(const o of OB){if(!o.alive)continue;
  const h=o.top-o.m.position.y,cy=o.m.position.y+Math.max(0,h)*.5;
  sphere.center.set(o.x,cy,o.z);sphere.radius=Math.max(o.r+2,Math.abs(h)*.46);
  if(ray.intersectSphere(sphere,tmp)){
   const d=origin.distanceTo(tmp);if(d>1.25&&d<limit){limit=d;
    best={distance:d,point:tmp.clone(),kind:'rock',obstacle:o}}
  }
 }
 for(const r of RIVER_ROCKS){sphere.center.set(r.x,r.top-r.r*.5,r.z);sphere.radius=r.r*1.1;
  if(ray.intersectSphere(sphere,tmp)){
   const d=origin.distanceTo(tmp);if(d>1.25&&d<limit){limit=d;
    best={distance:d,point:tmp.clone(),kind:'boulder'}}
  }
 }
 return best;
}

// dust carried by the wind
const DN=320,dp=new Float32Array(DN*3);for(let i=0;i<DN*3;i++)dp[i]=(Math.random()-.5)*160;const dgm=new THREE.BufferGeometry();dgm.setAttribute('position',new THREE.BufferAttribute(dp,3));
const bcv=document.createElement('canvas');bcv.width=bcv.height=64;{const g=bcv.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,.9)');gr.addColorStop(.4,'rgba(255,255,255,.35)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64)}
const blob=new THREE.CanvasTexture(bcv),dust=new THREE.Points(dgm,new THREE.PointsMaterial({map:blob,color:0xe0c09a,size:2.2,sizeAttenuation:false,transparent:true,opacity:.2,depthWrite:false}));dust.frustumCulled=false;S.add(dust);
const SPRAY=[];
for(let i=0;i<12;i++){
 const mesh=new THREE.Mesh(new THREE.RingGeometry(1,1.22,30).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xccece0,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
 mesh.visible=false;S.add(mesh);SPRAY.push({mesh,life:0,dx:0,dz:0});
}
function splashAt(x,z,bi){
 const s=SPRAY.find(o=>o.life<=0)||SPRAY[0];s.life=1.2;s.dx=TX[bi]*7;s.dz=TZ[bi]*7;
 s.mesh.position.set(x,WATER_HEIGHT+.42,z);s.mesh.scale.setScalar(1);s.mesh.visible=true;
}
const PL=[];for(let i=0;i<50;i++){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:blob,color:0xcaa078,transparent:true,depthWrite:false,opacity:0}));m.visible=false;S.add(m);PL.push({m,l:0,v:new THREE.Vector3()})}

const radar=$('radar'),rgx=radar.getContext('2d');let radarFrame=0;
// v50: transparent world-true tactical route. No backdrop, labels or false
// "off-course" badges. The original course arrays and race gate order are
// authoritative; nearest segment projection is independent of flight height.
let redlineRadarRouteCache=null;
function radarRouteBackground(finishIndex){
 const w=radar.width,h=radar.height,key=finishIndex+'_'+w+'_'+h;
 if(redlineRadarRouteCache?.key===key)return redlineRadarRouteCache;
 const cv=document.createElement('canvas');cv.width=w;cv.height=h;
 const ctx=cv.getContext('2d'),pad=36;
 let minx=Infinity,maxx=-Infinity,minz=Infinity,maxz=-Infinity;
 for(let i=0;i<=finishIndex;i++){
  minx=Math.min(minx,PX[i]);maxx=Math.max(maxx,PX[i]);
  minz=Math.min(minz,PZ[i]);maxz=Math.max(maxz,PZ[i]);
 }
 const scale=Math.min((w-pad*2)/Math.max(1,maxx-minx),(h-pad*2)/Math.max(1,maxz-minz));
 const offx=(w-(maxx-minx)*scale)/2,offy=(h-(maxz-minz)*scale)/2;
 const cvt=(x,z)=>[offx+(x-minx)*scale,offy+(z-minz)*scale];
 ctx.clearRect(0,0,w,h);ctx.lineJoin='round';ctx.lineCap='round';
 ctx.beginPath();for(let i=0;i<=finishIndex;i+=2){
  const x=offx+(PX[i]-minx)*scale,y=offy+(PZ[i]-minz)*scale;
  if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);
 }
 if(finishIndex===N)ctx.closePath();
 // Contour-only readout with a dark separation stroke against bright cliffs.
 ctx.strokeStyle='rgba(0,0,0,.88)';ctx.lineWidth=13;ctx.stroke();
 ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=5.4;ctx.stroke();
 return redlineRadarRouteCache={key,canvas:cv,cvt,scale,offx,offy,minx,minz};
}
function redlineRadarProject(x,z,maxIndex=N){
 // Exact nearest-SEGMENT search, not nearest vertex. This matters at hairpins
 // and when the racing line crosses close to a neighbouring canyon section.
 const limit=Math.max(1,Math.min(N,maxIndex));
 let best={d2:Infinity,index:0,t:0,x:PX[0],z:PZ[0]};
 for(let i=0;i<limit;i++){
  const j=i+1,ax=PX[i],az=PZ[i],dx=PX[j]-ax,dz=PZ[j]-az;
  const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));
  const qx=ax+dx*t,qz=az+dz*t,d2=(x-qx)*(x-qx)+(z-qz)*(z-qz);
  if(d2<best.d2)best={d2,index:i,t,x:qx,z:qz};
 }
 return best;
}
// v53 BOOT ORDER: Initialize the multiplayer controller BEFORE first radar/flight
// consumer. Its constructor creates only shared remote-aircraft geometries;
// all reads of redlineUI, game state and the network remain deferred until use.
// Keep this block as one unit to preserve private multiplayer behavior.
/* REDLINE v37 private multiplayer: server-reconciled position samples and ordered
   checkpoint detection. Live positions remain client reported: this reduces
   casual finish forgery but is NOT cheat-proof authoritative physics. */
const REDLINE_ONLINE=(()=>{
 const URL='https://gudzbisvhrvmduvbtcrh.supabase.co';
 const KEY='sb_publishable_2tdrLZcCTCBoqMuTgVDZxQ_Us-ZWKO1';
 const RECONNECT_KEY='redline_v37_session';
 let cred=null,room=null,socket=null,socketOK=false,roomClockOffset=0;
 let channelTopic='',refSeq=0,joinRef=null,connectionGeneration=0,lastSnapshotTime=0,lastPoll=0;
 let status='OFFLINE',error='',started=false,racing=false,finishing=false,leaving=false;
 let traceSeq=0,traceBusy=null,traceQueue=Promise.resolve(),traceGateCount=0,traceError='',lastTraceAt=0;
 let pollTimer=0,retryTimer=0,reconnectDelay=1000,beatTimer=0;
 const snapshots=new Map(),remote=new Map(),recentHits=new Set(),lastShotBy=new Map(),lastEMPBy=new Map();
 const safeText=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmtCode=c=>String(c||'').replace(/[^0-9a-f]/gi,'').toUpperCase().replace(/^(.{4})(.{1,6})$/,'$1-$2');
 const own=()=>room?.players?.find(p=>p.id===cred?.id);
 const isHost=()=>!!cred&&room?.host_id===cred.id;
 const peers=()=>room?.players||[];
 const label=p=>p.id===cred?.id?'YOU':p.name;
 const clip=(n,min,max)=>Number.isFinite(+n)?Math.max(min,Math.min(max,+n)):min;
 const setStatus=(s,msg='')=>{status=s;error=msg;if(redlineUI?.current==='lobby')updateLobbyInPlace();};
 const options={method:'POST',cache:'no-store',headers:{'apikey':KEY,'Content-Type':'application/json','Accept':'application/json'}};
 async function rpc(name,args){
  const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),8500);
  try{
   const res=await fetch(URL+'/rest/v1/rpc/'+name,{...options,body:JSON.stringify(args),signal:ctl.signal});
   const body=await res.text();let data;try{data=body?JSON.parse(body):null}catch{data=body;}
   if(!res.ok)throw new Error((data&&data.message)||('Network error '+res.status));
   return data;
  }catch(e){throw new Error(e.name==='AbortError'?'Supabase timed out. Try again.':e.message)}
  finally{clearTimeout(timer)}
 }
 const secrets=()=>({p_code:cred?.code,p_id:cred?.id,p_secret:cred?.secret});
 function persist(){try{if(cred)sessionStorage.setItem(RECONNECT_KEY,JSON.stringify(cred));else sessionStorage.removeItem(RECONNECT_KEY);}catch(e){}}
 function remember(value){cred={code:value.room.code,id:value.id,secret:value.secret};room=value.room;persist();setClock(room);}
 function setClock(view,t0=Date.now(),t1=Date.now()){
  if(view?.server_at){const ideal=Date.parse(view.server_at)-(t0+t1)/2; if(Number.isFinite(ideal))roomClockOffset=roomClockOffset*.25+ideal*.75;}
 }
 function updateRoom(view){
  if(!view||!Array.isArray(view.players))return;
  const prevStage=room?.stage,prevIds=new Set((room?.players||[]).map(p=>p.id));
  room=view;
  const alive=new Set(view.players.map(p=>p.id));
  for(const id of snapshots.keys())if(!alive.has(id)){snapshots.delete(id);removeRemote(id)}
  if(view.stage==='countdown'||view.stage==='racing'){
   if(!started&&redlineUI?.ready){prepareRace(view);}
  }
  if(redlineUI?.current==='lobby')updateLobbyInPlace();
  if(redlineUI?.current==='results'&&racing){redlineUI.show('results');}
 }
 async function create(){
  try{
   if(cred)await leave(true);
   const name=(document.getElementById('rlOnlineName')?.value||'PILOT').trim().slice(0,18);
   if(!name)throw new Error('Enter a pilot name.');
   try{localStorage.setItem('redline_mp_pilot_name',name)}catch(e){}
   setStatus('CREATING');const start=Date.now();const data=await rpc('redline_create_room_v37',{p_name:name,p_skin:redlineUI.config.skin});
   remember(data);setClock(data.room,start,Date.now());started=false;racing=false;finishing=false;
   connect();redlineUI.go('lobby');setStatus('LOBBY');poll();
  }catch(e){setStatus('ERROR',e.message);showError(e.message)}
 }
 async function join(){
  try{
   if(cred)await leave(true);
   const name=(document.getElementById('rlOnlineName')?.value||'PILOT').trim().slice(0,18);
   const code=(document.getElementById('rlOnlineCode')?.value||'').replace(/[^0-9A-F]/gi,'').toUpperCase();
   if(!name)throw new Error('Enter a pilot name.');if(code.length!==10)throw new Error('Enter the 10-character room code.');
   try{localStorage.setItem('redline_mp_pilot_name',name)}catch(e){}
   setStatus('JOINING');const start=Date.now();const data=await rpc('redline_join_room_v37',{p_code:code,p_name:name,p_skin:redlineUI.config.skin});
   remember(data);setClock(data.room,start,Date.now());started=false;racing=false;finishing=false;
   connect();redlineUI.go('lobby');setStatus('LOBBY');poll();
  }catch(e){setStatus('ERROR',e.message);showError(e.message)}
 }
 async function resume(){
  if(cred)return;
  let saved;try{saved=JSON.parse(sessionStorage.getItem(RECONNECT_KEY)||'null')}catch{}
  if(!saved?.code||!saved.id||!saved.secret)return;
  cred=saved;
  try{await poll();if(room){connect();if(room.stage==='lobby')redlineUI.go('lobby');}}
  catch(e){cred=null;persist();}
 }
 async function poll(){
  if(!cred||leaving)return;
  const sent=Date.now();
  try{
   const data=await rpc('redline_get_room',secrets());setClock(data,sent,Date.now());updateRoom(data);
   if(status==='ERROR'||status==='RECONNECTING')setStatus(socketOK?'ONLINE':'CONNECTING');
   lastPoll=Date.now();return data;
  }catch(e){setStatus('RECONNECTING',e.message);throw e}
 }
 function startPolling(){if(pollTimer)clearInterval(pollTimer);
  pollTimer=setInterval(()=>{if(cred&&!leaving)poll().catch(()=>{});},1700);
 }
 async function ready(){if(!cred||room?.stage!=='lobby')return;
  try{setStatus('SYNCING');const d=await rpc('redline_set_ready',{...secrets(),p_ready:!own()?.ready});updateRoom(d);setStatus('LOBBY');}
  catch(e){setStatus('ERROR',e.message);showError(e.message)}
 }
 async function start(){if(!cred||!isHost())return;
  try{setStatus('ARMING');const t=Date.now();const d=await rpc('redline_start_room',secrets());setClock(d,t,Date.now());updateRoom(d);setStatus('COUNTDOWN');}
  catch(e){setStatus('ERROR',e.message);showError(e.message)}
 }
 async function leave(silent=false){
  if(!cred)return;
  const old=cred;leaving=true;cred=null;room=null;started=false;racing=false;finishing=false;
  disconnect();for(const id of remote.keys())removeRemote(id);snapshots.clear();lastShotBy.clear();lastEMPBy.clear();persist();
  clearInterval(pollTimer);pollTimer=0;setStatus('OFFLINE');
  try{await rpc('redline_leave_room',{p_code:old.code,p_id:old.id,p_secret:old.secret});}catch(e){if(!silent)showError('Room disconnected; your old slot may take a moment to expire.');}
  leaving=false;
 }
 function disconnect(){
  connectionGeneration++;socketOK=false;joinRef=null;
  if(socket){socket.onclose=socket.onerror=socket.onmessage=socket.onopen=null;try{socket.close()}catch{}}
  socket=null;if(retryTimer)clearTimeout(retryTimer);retryTimer=0;if(beatTimer)clearInterval(beatTimer);beatTimer=0;
 }
 function rawSend(topic,event,payload){
  if(!socket||socket.readyState!==WebSocket.OPEN)return false;
  const ref=String(++refSeq);if(event==='phx_join')joinRef=ref;socket.send(JSON.stringify({topic,event,payload,ref,join_ref:topic==='phoenix'?null:joinRef}));return true;
 }
 function connect(){
  if(!cred||!room?.topic)return;
  disconnect();startPolling();
  const gen=connectionGeneration;channelTopic='realtime:rl_'+room.topic;setStatus('CONNECTING');
  const url=URL.replace(/^http/,'ws')+'/realtime/v1/websocket?apikey='+encodeURIComponent(KEY)+'&vsn=1.0.0';
  try{socket=new WebSocket(url)}catch(e){queueReconnect(gen);return}
  socket.onopen=()=>{
   if(gen!==connectionGeneration)return;
   rawSend(channelTopic,'phx_join',{config:{broadcast:{ack:false,self:false}}});
   beatTimer=setInterval(()=>rawSend('phoenix','heartbeat',{}),23000);
  };
  socket.onmessage=e=>{
   if(gen!==connectionGeneration)return;
   let packet;try{packet=JSON.parse(e.data)}catch{return}
   if(packet.event==='phx_reply'&&packet.topic===channelTopic){
    if(packet.ref===joinRef&&packet.payload?.status==='ok'){socketOK=true;reconnectDelay=1000;setStatus(room?.stage==='lobby'?'LOBBY':'ONLINE');}
    else{setStatus('RECONNECTING','Realtime channel refused');try{socket.close()}catch{}}
   }
   if(packet.event==='broadcast'&&packet.topic===channelTopic&&socketOK){
    const body=packet.payload;
    if(body?.event==='pose')receivePose(body.payload);
    if(body?.event==='shot')receiveShot(body.payload);
    if(body?.event==='emp')receiveEMP(body.payload);
   }
  };
  socket.onerror=()=>{setStatus('RECONNECTING','Network socket unavailable');};
  socket.onclose=()=>{if(gen===connectionGeneration){socketOK=false;setStatus('RECONNECTING');queueReconnect(gen)}};
 }
 function queueReconnect(gen){
  if(gen!==connectionGeneration||!cred)return;
  if(retryTimer)clearTimeout(retryTimer);
  retryTimer=setTimeout(()=>{if(gen===connectionGeneration&&cred)connect();},reconnectDelay);
  reconnectDelay=Math.min(10000,Math.round(reconnectDelay*1.5));
 }
 function send(event,payload){if(!cred||!socketOK)return false;
  return rawSend(channelTopic,'broadcast',{event,payload:{...payload,id:cred.id}});
 }
 // Client poses are not trusted as finish assertions. Postgres validates their
 // consecutive displacement and intersects them with immutable server gates.
 function sendTrace(force=false){
  if(!racing||!cred||(!force&&mode!=='run'))return Promise.resolve(null);
  if(!force&&traceBusy)return Promise.resolve(null);
  const work=traceQueue.catch(()=>{}).then(async()=>{
   const args={...secrets(),p_seq:++traceSeq,p_x:+st.p.x.toFixed(3),
     p_y:+st.p.y.toFixed(3),p_z:+st.p.z.toFixed(3)};
   const pending=rpc('redline_trace_v37',args);
   traceBusy=pending;
   try{
    const res=await pending;
    traceGateCount=Math.max(traceGateCount,res?.validated_gates||0);
    traceError='';return res;
   }catch(e){traceError=e.message;throw e;}
   finally{if(traceBusy===pending)traceBusy=null;}
  });
  traceQueue=work;
  return work;
 }
 function captureCheckpoint(){
  if(!racing)return;
  // Force a sample as close as possible to the actual 3D gate crossing.
  // If a telemetry packet is pending, keep the request sequence ordered.
  sendTrace(true).catch(e=>setStatus('CHECKPOINT SYNC',e.message));
 }

 function receivePose(v){
  if(!racing||!v||v.id===cred?.id||!peers().some(p=>p.id===v.id))return;
  if(!Array.isArray(v.p)||v.p.length!==3||v.p.some(n=>!Number.isFinite(n)))return;
  const [x,y,z]=v.p;if(Math.abs(x)>6000||Math.abs(z)>6000||y<0||y>400)return;
  let state=snapshots.get(v.id);
  if(!Number.isSafeInteger(v.seq)||v.seq<0||v.seq>1000000000||(state&&v.seq<=state.seq))return;
  if(!state){state={seq:-1,frames:[],progress:0,lap:1,gate:0,updated:0};snapshots.set(v.id,state);}
  const now=performance.now();const prev=state.frames.at(-1);
  if(prev&&now-prev.recv<180&&Math.hypot(x-prev.p[0],y-prev.p[1],z-prev.p[2])>180)return;
  state.seq=v.seq;state.updated=now;state.lap=clip(v.lap,1,3);state.gate=clip(v.gate,0,11);
  state.progress=clip(v.progress,0,3);state.spd=clip(v.speed,-350,350);
   state.model=['kestrel','blade','copper','spirit'].includes(v.model)?v.model:'kestrel';
   if(remote.has(v.id)&&remote.get(v.id).airframe!==state.model){removeRemote(v.id);}
  state.frames.push({recv:now,p:[x,y,z],yaw:clip(v.yaw,-100,100),pitch:clip(v.pitch,-6,6),roll:clip(v.roll,-6,6)});
  if(state.frames.length>6)state.frames.shift();
  if(!remote.has(v.id))makeRemote(v.id,state.model);
 }
 // v37: low-cost network aircraft. Shared geometry/materials avoid cloning the
 // player's 243-mesh GLB and avoid per-peer GPU material allocations.
 const remoteParts=(()=>{
  const body=new THREE.BoxGeometry(5.6,1.4,7.0),nose=new THREE.ConeGeometry(1.4,2.4,6);
  nose.rotateX(-Math.PI/2);
  const arm=new THREE.BoxGeometry(12.0,.38,.62);
  const boom=new THREE.BoxGeometry(.58,.3,10.8);
  const rotor=new THREE.CylinderGeometry(2.5,2.5,.10,10);
  const hub=new THREE.CylinderGeometry(.72,.72,.55,10);
  const canopy=new THREE.BoxGeometry(3.6,.9,3.5);
  const dark=new THREE.MeshStandardMaterial({color:0x1c2530,metalness:.6,roughness:.42});
  const blades=new THREE.MeshStandardMaterial({color:0x34383b,metalness:.35,roughness:.6,side:THREE.DoubleSide});
  const glass=new THREE.MeshStandardMaterial({color:0x356270,metalness:.35,roughness:.19,emissive:0x122f36,emissiveIntensity:.5});
  const colors=['#e8404b','#53d9dc','#ffae62','#ad83fc','#81e7a5','#ffd06f'].map(color=>new THREE.MeshStandardMaterial({color,metalness:.53,roughness:.34}));
  const tieSphere=new THREE.SphereGeometry(2.35,16,12);
  const tiePanel=new THREE.BoxGeometry(.24,6.65,4.25);
  const tieRim=new THREE.BoxGeometry(.45,6.86,.18);
  const tiePylon=new THREE.BoxGeometry(3.0,.52,.46);
  const tieGlass=new THREE.CircleGeometry(1.19,28);
  const wingShape=new THREE.Shape();wingShape.moveTo(0,5.8);wingShape.lineTo(3.6,3.6);wingShape.lineTo(12.1,-2.5);wingShape.lineTo(9.4,-2.2);wingShape.lineTo(6.1,-3.5);wingShape.lineTo(3.5,-3.0);wingShape.lineTo(0,-4.6);wingShape.lineTo(-3.5,-3.0);wingShape.lineTo(-6.1,-3.5);wingShape.lineTo(-9.4,-2.2);wingShape.lineTo(-12.1,-2.5);wingShape.lineTo(-3.6,3.6);wingShape.closePath();
  const spiritWing=new THREE.ExtrudeGeometry(wingShape,{depth:.24,bevelEnabled:false});spiritWing.rotateX(-Math.PI/2);
  return {body,nose,arm,boom,rotor,hub,canopy,dark,blades,glass,colors,
   tieSphere,tiePanel,tieRim,tiePylon,tieGlass,spiritWing};
 })();
 function makeRemote(id,airframe='kestrel'){
  if(remote.has(id))return;
  const p=peers().find(p=>p.id===id);if(!p)return;
  const model=new THREE.Group();model.name='MP_RIVAL_'+id;
  const shared=remoteParts,paint=shared.colors[((p.slot||1)-1)%6];
  const mesh=(geometry,material,x=0,y=0,z=0)=>{
   const m=new THREE.Mesh(geometry,material);m.castShadow=false;m.receiveShadow=false;
   m.position.set(x,y,z);model.add(m);return m;
  };
   const rotors=[];
   if(airframe==='spirit'){
    mesh(shared.spiritWing,shared.dark,0,0,0);
    mesh(shared.canopy,shared.glass,0,.40,-1.45).scale.set(.70,.56,.9);
    for(const x of[-2.2,2.2])mesh(shared.hub,paint,x,.05,3.7).scale.set(.55,.24,.35);
   }else if(airframe==='copper'){
    // Distinct TIE profile, 2 vertical wings and spherical cab, not a generic quad.
    mesh(shared.tieSphere,shared.dark,0,0,0);
    for(const side of[-1,1]){
     mesh(shared.tiePylon,paint,side*2.10,0,0);
     mesh(shared.tiePanel,shared.blades,side*4.15,0,0);
     for(const z of[-2.08,2.08])mesh(shared.tieRim,paint,side*4.15,0,z);
    }
    const glass=mesh(shared.tieGlass,shared.glass,0,.03,-2.24);
    glass.rotation.y=Math.PI;
    mesh(shared.hub,paint,0,-.5,1.56);
   }else if(airframe==='blade'){
    // Deliberately lightweight silhouette, not a 31-mesh GLB per remote pilot.
    mesh(shared.body,shared.dark,0,0,1);
    const left=mesh(shared.boom,paint,-3.2,-.20,-1.0);left.scale.set(1.6,.85,1.05);
    const right=mesh(shared.boom,paint,3.2,-.20,-1.0);right.scale.copy(left.scale);
    mesh(shared.nose,shared.dark,0,-.22,-4.35);
    mesh(shared.canopy,shared.glass,0,1.05,-.6);
    mesh(shared.arm,shared.dark,0,-.35,2.6);
    for(const x of[-3.2,3.2])for(const z of[-3,3])mesh(shared.hub,paint,x,-.7,z);
    for(const x of[-2,2])mesh(shared.hub,shared.dark,x,-.4,4.65);
   }else{
   mesh(shared.body,paint);mesh(shared.nose,paint,0,.05,-4.5);
  mesh(shared.canopy,shared.glass,0,1.0,-.9);
  mesh(shared.arm,shared.dark,0,.06,-1.7);
  mesh(shared.arm,shared.dark,0,.06,2.1);
  mesh(shared.boom,shared.dark,-3.1,-.1,0);
  mesh(shared.boom,shared.dark,3.1,-.1,0);

  for(const x of [-5.4,5.4])for(const z of [-4.2,4.2]){
    mesh(shared.hub,paint,x,.5,z);
    const blade=mesh(shared.rotor,shared.blades,x,.88,z);
    rotors.push(blade);
  }
   } // end Kestrel proxy branch
  const cv=document.createElement('canvas');cv.width=256;cv.height=48;const ct=cv.getContext('2d');
  ct.fillStyle='rgba(0,0,0,.78)';ct.fillRect(0,5,256,38);
  ct.strokeStyle=['#ff354d','#4edcec','#ffae62','#bf79ff','#81f5a4','#ffd06f'][((p.slot||1)-1)%6];
  ct.lineWidth=3;ct.strokeRect(1.5,6.5,253,36);
  ct.fillStyle='#fff';ct.textAlign='center';ct.font='bold 19px Arial';ct.fillText(p.name.slice(0,18),128,32);
  const tex=new THREE.CanvasTexture(cv);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false,depthWrite:false}));
  sprite.position.set(0,10,0);sprite.scale.set(32,6,1);model.add(sprite);
  S.add(model);remote.set(id,{model,tex,sprite,rotors,airframe,meshCount:model.children.filter(o=>o.isMesh).length});
 }
 function removeRemote(id){
  const r=remote.get(id);if(!r)return;
  S.remove(r.model);r.tex.dispose();r.sprite.material.dispose();remote.delete(id);
 }
 function drawRemote(now){
  if(!racing)return;
  const target=now-110;
  for(const [id,r]of remote){
   const state=snapshots.get(id),frames=state?.frames;
   if(!frames?.length){r.model.visible=false;continue;}
   const age=now-state.updated;
   if(age>4500){r.model.visible=false;continue;}
   let a=frames[0],b=frames.at(-1);
   for(let k=1;k<frames.length;k++)if(frames[k].recv>=target){a=frames[k-1];b=frames[k];break;}
   const t=a===b?1:clip((target-a.recv)/Math.max(1,b.recv-a.recv),0,1);
   const x=a.p[0]+(b.p[0]-a.p[0])*t,y=a.p[1]+(b.p[1]-a.p[1])*t,z=a.p[2]+(b.p[2]-a.p[2])*t;
   r.model.visible=true;r.model.position.set(x,y,z);
   // At long distances the craft uses the same cheap proxy; rotor animation
   // is skipped to save per-object transforms when the aircraft is far away.
   if(Math.hypot(st.p.x-x,st.p.y-y,st.p.z-z)<350){for(let k=0;k<r.rotors.length;k++)r.rotors[k].rotation.y+=.45;}
   const delta=Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw));
   r.model.rotation.set(a.pitch+(b.pitch-a.pitch)*t,a.yaw+delta*t,a.roll+(b.roll-a.roll)*t,'YXZ');
  }
 }
 let packetSeq=0;
 function tick(now){
  if(!racing||!cred)return;
  drawRemote(now);
  if(mode==='run'&&now-lastTraceAt>=185){
   lastTraceAt=now;
   sendTrace(false).catch(e=>setStatus('TRACE RETRY',e.message));
  }
  if(mode==='run'&&socketOK&&now-lastSnapshotTime>88){
   lastSnapshotTime=now;
   send('pose',{seq:++packetSeq,p:[+st.p.x.toFixed(2),+st.p.y.toFixed(2),+st.p.z.toFixed(2)],
     yaw:+st.yaw.toFixed(4),pitch:+st.pv.toFixed(3),roll:+st.roll.toFixed(3),
     speed:Math.round(st.spd),model:redlineActiveAirframe(),lap:lap,gate:gate,progress:+continuousHumanProgressNet().toFixed(5)});
  }
 }
 function continuousHumanProgressNet(){
  const i=near(st.p.x,st.p.z);let u=i/N;
  if(gate===11&&u<.12)u+=1;else if(gate===0&&u>.92)u=0;
  return Math.max(0,(lap-1)+u);
 }
 function standings(progress){
  const entries=[{key:'pilot',label:'YOU',progress,me:true,color:'#ff4d60',short:'P'}];
  for(const p of peers())if(p.id!==cred?.id){const v=snapshots.get(p.id);
   entries.push({key:'mp_'+p.id,label:p.name,progress:p.finished_ms!==null&&p.finished_ms!==undefined?3.001+(600000-p.finished_ms)/600000:v?.progress||0,
    me:false,color:['#ff5062','#4edcec','#ffae62','#bf79ff','#81f5a4','#ffd06f'][(p.slot-1)%6],short:p.name[0]?.toUpperCase()||'R'});
  }
  return entries;
 }
 // Every damaging network event requires a fresh, single-use ticket issued
 // to the attacker by the server after positional, range and cooldown checks.
 async function issueHit(kind,target,coords){
  if(!racing||!cred)return;
  try{
   const proof=await rpc('redline_claim_hit_v37',{...secrets(),p_target:target,p_kind:kind});
   if(!proof?.accepted||!proof.ticket)return;
   send(kind==='laser'?'shot':'emp',{
    ticket:proof.ticket,shot:proof.ticket,target,from:coords,origin:coords,time:Date.now()
   });
  }catch(e){if(/Invalid room credentials/.test(e.message))setStatus('COMBAT OFFLINE',e.message);}
 }
 function hitRay(origin,ray,existing){
  if(!racing||!cred)return existing;
  let limit=existing?.distance??LASER_DISTANCE,hit=existing;
  const candidate=new THREE.Vector3(),impact=new THREE.Vector3(),sphere=new THREE.Sphere();
  for(const [id,r] of remote){if(!r.model.visible)continue;
   sphere.center.copy(r.model.position);sphere.radius=10.5;
   if(new THREE.Ray(origin,ray).intersectSphere(sphere,impact)){
    const d=origin.distanceTo(impact);if(d>1&&d<limit){limit=d;hit={distance:d,point:impact.clone(),kind:'remotePilot',id};}
   }
  }
  if(hit?.kind==='remotePilot'){
   const victim=peers().find(p=>p.id===hit.id);
   issueHit('laser',hit.id,[origin.x,origin.y,origin.z]);
   clashGain(7,'PILOT TAG',false);redlineUI.notify('DIRECT HIT',(victim?.name||'RIVAL')+' // LASER CONNECTED','success');
  }
  return hit;
 }
 // v37: receiver-side sanity checks for unauthenticated broadcast combat.
 // This is abuse reduction, NOT authoritative hit detection.
 function plausibleAttackOrigin(v,maxAge=1400){
  if(!v||!Array.isArray(v.from)&&!Array.isArray(v.origin))return null;
  const coords=Array.isArray(v.from)?v.from:v.origin;
  if(coords.length!==3||coords.some(n=>!Number.isFinite(n)))return null;
  const state=snapshots.get(v.id),latest=state?.frames?.at(-1);
  if(!latest||performance.now()-state.updated>maxAge)return null;
  const a=new THREE.Vector3(...coords),b=new THREE.Vector3(...latest.p);
  return a.distanceTo(b)<=45?a:null;
 }
 async function receiveShot(v){
  if(!racing||v?.target!==cred?.id||!peers().some(p=>p.id===v.id))return;
  const shot=String(v.shot||'');if(!shot||shot.length>100||recentHits.has(shot))return;
  const from=plausibleAttackOrigin(v);if(!from)return;
  const distance=from.distanceTo(st.p);
  if(distance<3||distance>LASER_DISTANCE+26)return;
  const aim=st.p.clone().sub(from).normalize();
  const wall=laserWorldHit(from,aim,Math.max(1,distance-22));
  if(wall&&wall.distance<distance-22)return;
  const now=performance.now();
  if(now-(lastShotBy.get(v.id)||-Infinity)<290)return;
  if(!/^[0-9a-f-]{36}$/i.test(String(v.ticket||'')))return;
  try{
   const response=await rpc('redline_consume_hit_v37',{
    ...secrets(),p_ticket:v.ticket,p_attacker:v.id,p_kind:'laser'
   });
   if(!response?.accepted)return;
  }catch(_){return;}
  lastShotBy.set(v.id,now);recentHits.add(shot);if(recentHits.size>70)recentHits.clear();
  const attacker=peers().find(p=>p.id===v.id);
  if(CLASH.shieldT>0.1){redlineUI.notify('SHIELD BLOCKED',attacker?.name||'INCOMING LASER','success');return;}
  FL.vx*=.65;FL.vz*=.65;FL.speed*=.65;st.shake=Math.max(st.shake,.62);
  redlineUI.notify('LASER HIT',(attacker?.name||'RIVAL')+' // PROPULSION DISRUPTED','warning');
 }
 function ability(kind){
  if(!racing||kind!=='pulse')return;
  const coords=[st.p.x,st.p.y,st.p.z];
  for(const peer of peers()){
   if(peer.id===cred?.id)continue;
   const target=snapshots.get(peer.id);
   if(!target?.frames?.length||performance.now()-target.updated>1400)continue;
   if(Math.hypot(...coords.map((v,i)=>v-target.frames.at(-1).p[i]))<=145)
    issueHit('emp',peer.id,coords);
  }
 }

 async function receiveEMP(v){
  if(!racing||!v||v.target!==cred?.id||v.id===cred?.id||!peers().some(p=>p.id===v.id))return;
  const from=plausibleAttackOrigin(v);if(!from)return;
  const now=performance.now();if(now-(lastEMPBy.get(v.id)||-Infinity)<6000)return;
  if(!/^[0-9a-f-]{36}$/i.test(String(v.ticket||'')))return;
  try{
   const response=await rpc('redline_consume_hit_v37',{
    ...secrets(),p_ticket:v.ticket,p_attacker:v.id,p_kind:'emp'
   });
   if(!response?.accepted)return;
  }catch(_){return;}
  lastEMPBy.set(v.id,now);
  if(from.distanceTo(st.p)>145||CLASH.shieldT>0)return;
  FL.vx*=.45;FL.vz*=.45;FL.speed*=.45;st.shake=Math.max(st.shake,.9);
  redlineUI.notify('EMP IMPACT','PROPULSION INTERRUPTED','warning');
 }
 function prepareRace(view){
  if(started||!cred||!redlineUI?.ready||!view?.started_at)return;
  started=true;racing=true;finishing=false;packetSeq=0;lastSnapshotTime=0;traceSeq=0;traceGateCount=0;traceError='';lastTraceAt=0;traceBusy=null;traceQueue=Promise.resolve();
  redlineUI.config.course='grand';redlineUI.config.bots=0;CLASH.gameMode='clash';reset();
  redlineUI.applySettings?.();startEngineAudio();
  mode='count';cd=Math.max(.06,(Date.parse(view.started_at)-Date.now()-roomClockOffset)/1000);
  redlineUI.show('race');redlineUI.updateMouseUnlocked();
  setStatus('RACING');
 }
 function countdownRemain(){if(!started||!room?.started_at)return null;
  return (Date.parse(room.started_at)-(Date.now()+roomClockOffset))/1000;
 }
 async function finish(){
  if(!racing||finishing||!cred)return;
  finishing=true;
  try{
   if(traceBusy)await traceBusy.catch(()=>{});
   await sendTrace(true);
   if(traceGateCount<36)throw new Error('Server verified '+traceGateCount+'/36 checkpoints. Finish requires a complete validated route.');
   const data=await rpc('redline_finish_room_v37',secrets());updateRoom(data);
  }catch(e){finishing=false;showError('Server verification pending: '+e.message);} 
 }
 function resultHTML(){
  const participants=peers().slice().sort((a,b)=>{
   if(a.finished_ms!==null&&b.finished_ms===null)return -1;
   if(b.finished_ms!==null&&a.finished_ms===null)return 1;
   return (a.finished_ms??Infinity)-(b.finished_ms??Infinity);
  });
  const index=participants.findIndex(p=>p.id===cred?.id);
  const rank=Math.max(1,index+1);
  const me=participants.find(p=>p.id===cred?.id);
  const mapped=participants.map(p=>({
   name:label(p),me:p.id===cred?.id,
   time:Number.isFinite(p.finished_ms)?p.finished_ms/1000:null
  }));
  return window.REDLINE_RESULT_VIEW({online:true,rank,
   course:'GRAND GORGE',airframe:redlineAirframeLabel(),
   time:Number.isFinite(me?.finished_ms)?me.finished_ms/1000:null,
   room:fmtCode(cred?.code),rows:mapped});
 }
 function menuHTML(){
  const name=localStorage.getItem('redline_mp_pilot_name')||'PILOT';
  return `<div class="rl-layout rl-net"><button class="rl-back" data-op="home">‹ &nbsp; BACK</button><div class="rl-overline">REDLINE / REALTIME PRIVATE ROOMS</div><h1 class="rl-section-title">RACE TOGETHER.</h1><p class="rl-section-desc">Create a private party, share your code, and race up to six live pilots through Grand Gorge. No email or registration required. Results validate a plausible course trace but remain unranked.</p>
    <div class="rl-net-grid"><section class="rl-net-panel"><div class="rl-field-label">PILOT CALLSIGN <span>1–18 CHARACTERS</span></div><input class="rl-net-input" id="rlOnlineName" maxlength="18" autocomplete="nickname" value="${safeText(name)}" placeholder="Your racer name"><div class="rl-net-tip">Choose one of four aircraft in Hangar. Handling varies by airframe; controls are shared.</div><button class="rl-action primary" data-op="net-create"><b>CREATE PRIVATE ROOM</b><span class="rl-arrow">›</span></button></section>
    <section class="rl-net-panel"><div class="rl-field-label">JOIN WITH A ROOM CODE <span>10 CHARACTERS</span></div><input class="rl-net-input code" id="rlOnlineCode" placeholder="ABCD-123456" maxlength="11" inputmode="text" autocomplete="off"><div class="rl-net-tip">Get the code from the host, then join the same six-player race.</div><button class="rl-action" data-op="net-join"><b>JOIN A ROOM</b><span class="rl-arrow">›</span></button></section></div>
    <p class="rl-net-status" id="rlNetError" role="status">${safeText(error||'SERVER: '+status)}</p></div>`;
 }
 function lobbyHTML(){
  if(!cred||!room)return menuHTML();
  const self=own(),host=isHost(),members=peers();
  const allReady=members.length>=2&&members.every(p=>p.ready&&p.online),hostBtn=host?`<button class="rl-action primary" data-op="net-start" ${allReady?'':'disabled'}><b>START ONLINE RACE</b><span>${allReady?'7 SEC COUNTDOWN':'WAIT FOR READY'}</span></button>`:'';
  return `<div class="rl-layout rl-net lobby"><button class="rl-back" data-op="net-leave">‹ &nbsp; LEAVE ROOM</button><div class="rl-overline">REDLINE NETWORK / GRAND GORGE</div><h1 class="rl-section-title">PRIVATE LOBBY.</h1><div class="rl-net-roomrow"><div><span class="rl-net-label">ROOM CODE / SHARE WITH FRIENDS</span><div class="rl-net-code">${fmtCode(room.code)}</div></div><button class="rl-net-copy" data-op="net-copy">COPY CODE <span>↗</span></button></div>
  <p class="rl-net-muted">${host?'YOU ARE THE HOST':'WAITING FOR HOST'} · ${members.length}/6 PILOTS · ${safeText(status)} ${socketOK?'● LIVE':'○ CONNECTING'}</p>
  <div class="rl-net-pilots">${Array.from({length:6},(_,i)=>{const p=members.find(x=>x.slot===i+1);return `<div class="rl-net-pilot ${p?'occupied':''}"><div class="rl-net-slot">${String(i+1).padStart(2,'0')}</div><div class="rl-net-racer">${p?safeText(label(p)):'AWAITING PILOT'} ${p?.id===room.host_id?'<small>HOST</small>':''}</div><div class="rl-net-ready">${p?(p.online?(p.ready?'READY':'NOT READY'):'OFFLINE'):'—'}</div></div>`}).join('')}</div>
  <div class="rl-net-actions">${hostBtn}<button class="rl-action" data-op="net-ready"><b>${self?.ready?'MARK NOT READY':'READY UP'}</b><span>${self?.ready?'✓ READY':'SET READY'}</span></button></div>
  <p class="rl-net-tip">The race starts for everyone at the same scheduled instant. All pilots must mark Ready and stay connected.</p>
  <p class="rl-net-status" id="rlNetError" role="status">${safeText(error||'ROOM STATUS: '+room.stage.toUpperCase())}</p></div>`;
 }
 function updateLobbyInPlace(){
  if(redlineUI?.current!=='lobby'||!room)return;
  // Never erase the complete menu/header or destroy the user's current control.
  // Only refresh the live lobby slots and actions when relevant data changes.
  const el=document.querySelector('#rlScreens .rl-net');if(!el)return;
  const next=document.createElement('div');next.innerHTML=lobbyHTML();
  for(const sel of ['.rl-net-pilots','.rl-net-actions','.rl-net-muted','.rl-net-status']){
   const old=el.querySelector(sel),fresh=next.querySelector(sel);
   if(old&&fresh&&old.outerHTML!==fresh.outerHTML)old.replaceWith(fresh);
  }
 }
 function showError(msg){console.warn('[REDLINE ONLINE]',msg);const el=document.getElementById('rlNetError');if(el)el.textContent=msg;}
 function bind(op){switch(op){
  case'net-create':create();return true;case'net-join':join();return true;
  case'net-ready':ready();return true;case'net-start':start();return true;
  case'net-copy':if(cred)navigator.clipboard?.writeText(fmtCode(cred.code)).then(()=>setStatus('CODE COPIED')).catch(()=>{});return true;
  case'net-leave':leave().then(()=>redlineUI.go('multiplayer'));return true;
  case'net-leave-home':leave().then(()=>redlineUI.go('landing'));return true;
  case'net-new':leave().then(()=>redlineUI.go('multiplayer'));return true;
  default:return false;
 }}
  return {get startSlot(){return own()?.slot||1},get startCount(){return Math.max(2,peers().filter(p=>p.online!==false).length)},get active(){return !!cred},get isRacing(){return racing},get room(){return room},get connected(){return socketOK},get startedAt(){return room?.started_at},
  minimapRivals:()=>{
   if(!racing)return [];const now=performance.now(),rivals=[];
   for(const [id,r] of remote){
    const data=snapshots.get(id);
    if(!data?.frames?.length)continue;
    const p=(r.model.visible?[r.model.position.x,r.model.position.y,r.model.position.z]:data.frames.at(-1).p);
    const slot=peers().find(p=>p.id===id)?.slot||1;
    rivals.push({id,x:p[0],z:p[2],stale:now-data.updated>4500,color:['#ff5062','#4edcec','#ffae62','#bf79ff','#81f5a4','#ffd06f'][(slot-1)%6]});
   }return rivals;
  },
  remoteCount:()=>remote.size,remoteMeshCount:()=>[...remote.values()].reduce((n,r)=>n+r.meshCount,0),verifiedGates:()=>traceGateCount,
  traceStatus:()=>({gates:traceGateCount,error:traceError,sequence:traceSeq,pending:!!traceBusy}),captureCheckpoint,
  create,join,resume,leave,poll,ready,start,finish,bind,menuHTML,lobbyHTML,resultHTML,updateLobbyInPlace,tick,hitRay,ability,standings,countdownRemain};
})();


// REDLINE v56 NAVIGATION: one shared world→canvas transform for course,
// rendered player, AI and network aircraft. The canvas is always transparent.
// The visual aircraft root, not a potentially stale simulation cache, owns the
// player marker position. The same source drives chase and cockpit views.
let redlineNavFrame=0,redlineNavLastTs=0;
const redlineNavWorldTmp=new THREE.Vector3();
const redlineNavHistory=[];
function redlineNavWorld(mesh, fallback){
 if(mesh&&typeof mesh.getWorldPosition==='function'){
  mesh.getWorldPosition(redlineNavWorldTmp);
  if(Number.isFinite(redlineNavWorldTmp.x)&&Number.isFinite(redlineNavWorldTmp.z))
   return {x:redlineNavWorldTmp.x,z:redlineNavWorldTmp.z};
 }
 if(mesh?.position&&Number.isFinite(mesh.position.x)&&Number.isFinite(mesh.position.z))
  return {x:mesh.position.x,z:mesh.position.z};
 return fallback&&Number.isFinite(fallback.x)&&Number.isFinite(fallback.z)?{x:fallback.x,z:fallback.z}:null;
}
function redlineNavDrawMarker(x,z,color,size,fillShape='dot'){
 if(!Number.isFinite(x)||!Number.isFinite(z))return null;
 const [rawx,rawy]=redlineRadarCurrentRoute.cvt(x,z);
 if(!Number.isFinite(rawx)||!Number.isFinite(rawy))return null;
 const px=Math.max(15,Math.min(radar.width-15,rawx)),py=Math.max(15,Math.min(radar.height-15,rawy));
 rgx.save();rgx.translate(px,py);
 rgx.beginPath();
 if(fillShape==='diamond'){
  rgx.moveTo(0,-size);rgx.lineTo(size*.9,0);rgx.lineTo(0,size);rgx.lineTo(-size*.9,0);rgx.closePath();
 }else rgx.arc(0,0,size,0,Math.PI*2);
 rgx.shadowColor=color;rgx.shadowBlur=7;rgx.fillStyle=color;rgx.fill();rgx.shadowBlur=0;rgx.strokeStyle='rgba(0,0,0,.95)';rgx.lineWidth=2.7;rgx.stroke();
 rgx.restore();return [px,py];
}
let redlineRadarCurrentRoute=null;
function drawRadar(){
 const w=radar.width,h=radar.height,finishIndex=sprintMode()?Math.round(GATES[3][0]*N):N;
 const route=radarRouteBackground(finishIndex),cvt=route.cvt;
 redlineRadarCurrentRoute=route;
 rgx.clearRect(0,0,w,h);rgx.drawImage(route.canvas,0,0);
 // v58: v36 used the authoritative flight position, not the cosmetic
 // vehicle root. The root may still be at its previous pose during a reset,
 // and can deliberately be hidden in first-person mode.
 const player=Number.isFinite(st.p.x)&&Number.isFinite(st.p.z)
  ?{x:st.p.x,z:st.p.z}:redlineNavWorld(dr,null);
 if(!player)return;
 const [rawx,rawy]=cvt(player.x,player.z);
 const x=Math.max(15,Math.min(w-15,rawx)),y=Math.max(15,Math.min(h-15,rawy));
 const next=GATES[Math.min(gate,GATES.length-1)];
 if(next){const k=Math.round(next[0]*N)%N;redlineNavDrawMarker(PX[k],PZ[k],'#ffffff',7);}
 const rivals=[];
 // Capture all active AI, not only meshes passing the camera frustum test.
 // Source positions are the same Three.js world matrices used for rendering.
 if(CLASH.initialized&&CLASH.gameMode==='clash')for(const b of CLASH.bots){
  if(b.index>=redlineUI.config.bots)continue;
  const pos=redlineNavWorld(b.mesh,null);if(!pos)continue;
  const color=['#ffae78','#63eaff','#c89aff'][b.index%3];
  const pix=redlineNavDrawMarker(pos.x,pos.z,color,8.2,'diamond');
  if(pix)rivals.push({id:b.index,type:'AI',world:[pos.x,pos.z],pixel:pix,x:pix[0],y:pix[1],color});
 }
 if(REDLINE_ONLINE.isRacing)for(const o of REDLINE_ONLINE.minimapRivals()){
  const color=o.stale?'#8c9ba3':o.color||'#63eaff';
  const pix=redlineNavDrawMarker(o.x,o.z,color,8.2,'diamond');
  if(pix)rivals.push({id:o.id,type:'ONLINE',world:[o.x,o.z],pixel:pix,x:pix[0],y:pix[1],color,stale:!!o.stale});
 }
 // A short breadcrumb gives a visual proof of movement even on narrow maps.
 const last=redlineNavHistory[redlineNavHistory.length-1];
 if(!last||Math.hypot(player.x-last.x,player.z-last.z)>6){
  redlineNavHistory.push({x:player.x,z:player.z});if(redlineNavHistory.length>12)redlineNavHistory.shift();
 }
 if(redlineNavHistory.length>1){
  rgx.save();rgx.lineCap='round';rgx.lineWidth=2.7;
  for(let i=1;i<redlineNavHistory.length;i++){
   const a=redlineNavHistory[i-1],b=redlineNavHistory[i];
   const [ax,ay]=cvt(a.x,a.z),[bx,by]=cvt(b.x,b.z);
   rgx.beginPath();rgx.moveTo(ax,ay);rgx.lineTo(bx,by);
   rgx.strokeStyle=`rgba(255,90,105,${(i/redlineNavHistory.length*.50).toFixed(3)})`;rgx.stroke();
  }rgx.restore();
 }
 // Position on the real map, never snapped to the road.
 rgx.save();rgx.translate(x,y);rgx.rotate(-st.yaw);
 rgx.shadowColor='rgba(245,36,55,.9)';rgx.shadowBlur=12;
 rgx.beginPath();rgx.moveTo(0,-12);rgx.lineTo(8,8);rgx.lineTo(0,4);rgx.lineTo(-8,8);rgx.closePath();
 rgx.fillStyle='#f42d43';rgx.fill();rgx.shadowBlur=0;rgx.lineWidth=2.4;rgx.strokeStyle='#ffffff';rgx.stroke();rgx.restore();
 const nearest=redlineRadarProject(player.x,player.z,finishIndex);
 const before=window.REDLINE_NAV_STATUS,stamp=performance.now();
 window.REDLINE_NAV_STATUS={frame:++redlineNavFrame,timestamp:stamp,ageMs:0,
  x:player.x,z:player.z,physicsX:st.p.x,physicsZ:st.p.z,
  playerPixel:[x,y],trueWorldPixel:[x,y],rawWorldPixel:[rawx,rawy],edgeClamped:x!==rawx||y!==rawy,rivalCount:rivals.length,rivalPixels:rivals,
  nearestSegment:nearest.index,nearestDistance:Math.sqrt(nearest.d2),offRoad:Math.sqrt(nearest.d2)>FW[nearest.index]*1.6,
  nextGate:gate,mode:CLASH.gameMode,configuredBots:redlineUI.config.bots,
  raceMode:mode,online:REDLINE_ONLINE.isRacing,source:'authoritative-flight-position',displayModelWorld:[dr?.position?.x??null,dr?.position?.z??null],
  distanceSinceLastFrame:before?Math.hypot(player.x-before.x,player.z-before.z):0,
  background:'transparent',coordinateSpace:'world',staticRoute:false};
 redlineNavLastTs=stamp;
}
window.REDLINE_MAP_STATE=()=>{
 const element=document.getElementById('maphud'),canvas=document.getElementById('radar');
 const styles=element?getComputedStyle(element):null;
 return {version:'v60',screen:window.redlineUI?.current||null,
  display:styles?.display,visibility:styles?.visibility,opacity:styles?.opacity,
  zIndex:styles?.zIndex,bounds:element?(()=>{const r=element.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})():null,
  canvas:[canvas?.width||0,canvas?.height||0],lastFrame:window.REDLINE_NAV_STATUS?.frame||0,
  lastUpdateMs:performance.now()-redlineNavLastTs};
};
window.REDLINE_NAV_DIAGNOSTICS=()=>({...(window.REDLINE_NAV_STATUS||{}),
 ageMs:performance.now()-redlineNavLastTs,
 droneWorld:dr.getWorldPosition(new THREE.Vector3()).toArray(),
 flight:[FL.x,FL.y,FL.z],
 bots:CLASH.bots.map(b=>({name:b.label,shown:b.mesh.visible,world:b.mesh.getWorldPosition(new THREE.Vector3()).toArray(),progress:b.progress})),
 onlineRivals:REDLINE_ONLINE.minimapRivals()});
// ---- state, input
const P={t:80,a:75,s:70};['t','a','s'].forEach(k=>$('s'+k).oninput=e=>{P[k]=+e.target.value;$('n'+k).textContent=P[k]});
const quality=$('quality');
// Fastest preset is the first-launch default. Respect a player who explicitly
// selected Balanced or Ultra in a previous visit, rather than forcing it back.
let qualityTier='performance',maxRenderDpr=.68;
try{const saved=localStorage.getItem('redline_graphics_preset');if(['performance','balanced','ultra'].includes(saved)){
 qualityTier=saved;maxRenderDpr=saved==='ultra'?1.40:saved==='balanced'?.94:.68;
}}catch(_){}
quality.value=qualityTier;
Rn.setPixelRatio(Math.min(devicePixelRatio,maxRenderDpr));Rn.setSize(innerWidth,innerHeight,false);
Rn.shadowMap.enabled=qualityTier!=='performance';
quality.addEventListener('change',()=>{
 qualityTier=quality.value;
 try{localStorage.setItem('redline_graphics_preset',qualityTier)}catch(_){}
 const factor=qualityTier==='performance'?.68:qualityTier==='ultra'?1.40:.94;
 Rn.setPixelRatio(Math.min(devicePixelRatio,factor));Rn.setSize(innerWidth,innerHeight,false);rsz();
 Rn.shadowMap.enabled=qualityTier!=='performance';
 sun.shadow.mapSize.set(qualityTier==='ultra'?2048:1024,qualityTier==='ultra'?2048:1024);sun.shadow.camera.updateProjectionMatrix();if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}
 maxRenderDpr=factor;adaptiveDesiredDpr=Rn.getPixelRatio();
 msg('GRAPHICS: '+qualityTier.toUpperCase(),1100);
});
const REDLINE_DEBRIS=REDLINE_DESTRUCTION.create(THREE,S,{groundHeight:gh,waterHeight:WATER_HEIGHT});
const REDLINE_VCURSOR=REDLINE_VIRTUAL_CURSOR.create(document);
const REDLINE_PLAYER_CRASH={t:0,deathCount:0,restore:null,get active(){return this.t>0}};
window.REDLINE_PLAYER_CRASH=REDLINE_PLAYER_CRASH;
window.REDLINE_DEBRIS=REDLINE_DEBRIS;
function redlineLaserBreakup(attacker){
 if(REDLINE_PLAYER_CRASH.active||st.ic>0||CLASH.shieldT>0||mode!=='run')return false;
 REDLINE_PLAYER_CRASH.restore={point:st.p.clone(),heading:st.yaw,lap,gate};
  REDLINE_PLAYER_CRASH.t=1.15;REDLINE_PLAYER_CRASH.deathCount++;
 REDLINE_AUDIO_ENGINE.play('crash');
 const velocity=new THREE.Vector3(FL.vx,FL.vy,FL.vz);
 REDLINE_DEBRIS.explode(st.p,velocity,st.yaw);
 FL.speed=0;FL.vx=0;FL.vz=0;FL.vy=0;FL.strafeSpeed=0;st.shake=Math.max(st.shake,.50);st.ic=1.35;
 document.body.classList.add('rl-destroyed');dr.visible=false;
 clashTV('DRONE DISABLED','LASER STRIKE · RAPID REBUILD','danger',850);
 redlineUI.notify('DRONE DISABLED','Reconstructing at strike location','danger');
 return true;
}
const REDLINE_MOUSE_ALT=REDLINE_MOUSE_STICK.create();
const REDLINE_MOVE=REDLINE_MOVE_KEYS.create();
window.REDLINE_MOVE_QA=()=>({keys:{w:REDLINE_MOVE.isDown('KeyW'),a:REDLINE_MOVE.isDown('KeyA'),s:REDLINE_MOVE.isDown('KeyS'),d:REDLINE_MOVE.isDown('KeyD')},command:REDLINE_MOVE.vector(),strafeSpeed:FL.strafeSpeed||0,lateralWorldVelocity:{x:FL.vx,z:FL.vz},yaw:FL.yaw,position:{x:FL.x,y:FL.y,z:FL.z}});
window.REDLINE_MOUSE_ALT=REDLINE_MOUSE_ALT;
const FL=createFlight(),st={p:new THREE.Vector3(),yaw:0,pv:0,roll:0,spd:0,vy:0,pm:0,boost:100,las:2,cd:0,bt:0,ic:0,shake:0,wind:[0,0,0]},K={};let mode='load',cd=0,lap=1,gate=0,pd=NaN,raceT=0,lapT=0,best=Infinity,camM=0,locked=false,time=0;
let prevPlayerPosition=new THREE.Vector3(),lastCheckpointTime=0,PB=Infinity,sectorSplits=[],liveGhost=[],bestGhost=[],ghostAccumulator=0,ghostVisible=true;
// V6 mouse steering: low-sensitivity mouse changes craft yaw and pitch.
// The camera follows the craft; it never orbits independently in race mode.
let cameraOrbitYaw=0,cameraOrbitPitch=0,mousePitch=0;
let cameraRigReset=true;let activeFlightSteps=0;
// v83 chase framing: the flight camera is deliberately independent of the
// showroom/FPV lenses. Values are world units, not CSS/model scale hacks.
// Profiles were tuned for readable aircraft silhouettes, then collision
// correction retains the existing cameraClearance/CLIFF_COLLIDER safety sweep.
const REDLINE_V83_CHASE_PROFILES=Object.freeze({
 kestrel:Object.freeze({close:[17,3.8],normal:[23,5.0],wide:[41,9.0]}),
 blade:Object.freeze({close:[18.5,4.1],normal:[25,5.4],wide:[44,9.6]}),
 copper:Object.freeze({close:[20,4.3],normal:[27,5.8],wide:[47,10.1]}),
 spirit:Object.freeze({close:[27,5.7],normal:[35,7.5],wide:[54,11.6]})
});
function redlineV83ChaseProfile(craft,mode){
 const source=REDLINE_V83_CHASE_PROFILES[craft]||REDLINE_V83_CHASE_PROFILES.kestrel;
 const preset=mode===1?'close':mode===2?'wide':'normal';
 const [boom,rise]=source[preset];
 return {craft,preset,boom,rise,fov:68};
}
window.REDLINE_V83_CHASE_PROFILES=REDLINE_V83_CHASE_PROFILES;
// Only compute GLB world-space bounds in opt-in QA/debug modes to avoid
// traversing potentially expensive meshes every frame on real GPUs.
const redlineV83MeasureCamera=new URLSearchParams(location.search).has('cameraDebug')
  ||new URLSearchParams(location.search).has('redlineTest');
function redlineV83ProjectedBody(camera){
 const craft=redlineActiveAirframe();
 const root=craft==='spirit'?spiritGameArt:craft==='copper'?copperGameArt:craft==='blade'?bladeGameArt:kestrelGameArt;
 if(!root||!root.visible)return null;
 // Measure authored aircraft surface, not procedural thruster plumes or
 // particles. A Box3.setFromObject(root) includes runtime exhaust and can
 // claim the aircraft extends several screen-heights below the viewport.
 root.updateWorldMatrix(true,true);
 const box=new THREE.Box3().makeEmpty(),meshBounds=new THREE.Box3();
 let bodyMeshes=0;
 root.traverse(node=>{
  if(!node.isMesh||!node.visible||!node.geometry)return;
  for(let part=node;part&&part!==root;part=part.parent){
   if(/thruster|afterburner|exhaust|flame|particle|plume|mist|laser|beam|trail|spark|_jet|_fx/i.test(part.name||''))return;
  }
  if(!node.geometry.boundingBox)node.geometry.computeBoundingBox();
  meshBounds.copy(node.geometry.boundingBox).applyMatrix4(node.matrixWorld);
  if(!meshBounds.isEmpty()&&[meshBounds.min.x,meshBounds.min.y,meshBounds.min.z,
    meshBounds.max.x,meshBounds.max.y,meshBounds.max.z].every(Number.isFinite)){
    box.union(meshBounds);bodyMeshes++;
  }
 });
 if(!bodyMeshes||box.isEmpty())return null;
 const min=box.min,max=box.max;
 let xMin=Infinity,xMax=-Infinity,yMin=Infinity,yMax=-Infinity;
 for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z]){
  const point=new THREE.Vector3(x,y,z).project(camera);
  if(!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.z<=-1||point.z>=1)return null;
  const sx=.5+.5*point.x,sy=.5-.5*point.y;
  xMin=Math.min(xMin,sx);xMax=Math.max(xMax,sx);
  yMin=Math.min(yMin,sy);yMax=Math.max(yMax,sy);
 }
 return {left:xMin,right:xMax,top:yMin,bottom:yMax,
  width:xMax-xMin,height:yMax-yMin,
  centerX:(xMin+xMax)/2,centerY:(yMin+yMax)/2,
  clipped:xMin<0||xMax>1||yMin<0||yMax>1};
}

const MOUSE_STEER_SENS=.0009, MOUSE_PITCH_SENS=.0009; // legacy values; v27.5 flight uses bounded drag axes
try{const v=JSON.parse(localStorage.getItem('redline_geologic_v3_records')||'{}');PB=Number(v.best)||Infinity;bestGhost=Array.isArray(v.ghost)?v.ghost:[]}catch(e){}
let lastSectors=[];
const recordKey=()=>window.redlineUI?.config.course==='raven'&&!REDLINE_ONLINE.isRacing?'redline_raven_sprint_v22_records':'redline_geologic_v3_records';
function loadBestForCourse(){try{const raw=JSON.parse(localStorage.getItem(recordKey())||'{}');PB=Number(raw.best)||Infinity;bestGhost=Array.isArray(raw.ghost)?raw.ghost:[]}catch(e){PB=Infinity;bestGhost=[]}}
const sprintMode=()=>window.redlineUI?.config.course==='raven'&&!REDLINE_ONLINE.isRacing;
const sprintGateCount=()=>REDLINE_RAVEN.gateCount(sprintMode()?'raven':'grand');
const sprintMaxLaps=()=>REDLINE_RAVEN.maxLaps(sprintMode()?'raven':'grand');
const fmt=s=>isFinite(s)?Math.floor(s/60)+':'+(s%60).toFixed(1).padStart(4,'0'):'--';
const trackDistance=(()=>{let d=0;for(let i=1;i<PX.length;i++)d+=Math.hypot(PX[i]-PX[i-1],PZ[i]-PZ[i-1]);return d})();
const MEDALS={bronze:trackDistance/58,silver:trackDistance/82,gold:trackDistance/108};
function storeBest(){try{localStorage.setItem(recordKey(),JSON.stringify({best:PB,ghost:bestGhost,sectors:lastSectors}))}catch(e){}}
function medalFor(t){return t<=MEDALS.gold?'GOLD':t<=MEDALS.silver?'SILVER':t<=MEDALS.bronze?'BRONZE':'FINISHED'};

const laserAimIndicator=document.createElement('div');
laserAimIndicator.id='laserAimIndicator';
laserAimIndicator.textContent='⊕';
Object.assign(laserAimIndicator.style,{position:'fixed',pointerEvents:'none',
 color:'#ff5d42',font:'bold 25px monospace',textShadow:'0 0 7px #ff2618,0 0 14px #f008',
 transform:'translate(-50%,-50%)',zIndex:'14',display:'none'});
document.body.appendChild(laserAimIndicator);
function updateLaserAimIndicator(){
 laserAimIndicator.style.display='none';return;
 cam.updateMatrixWorld(true);
 if(mode!=='run'){laserAimIndicator.style.display='none';return}
 const dir=new THREE.Vector3(-Math.sin(st.yaw),0,-Math.cos(st.yaw));
 const p=dr.position.clone().addScaledVector(dir,145);
 p.y+=1.0;p.project(cam);
 if(!Number.isFinite(p.x)||Math.abs(p.x)>.99||Math.abs(p.y)>.99||p.z>1){
  laserAimIndicator.style.display='none';return;
 }
 laserAimIndicator.style.display='none';
 laserAimIndicator.style.left=((p.x*.5+.5)*innerWidth).toFixed(1)+'px';
 laserAimIndicator.style.top=((1-(p.y*.5+.5))*innerHeight).toFixed(1)+'px';
}
const fwd=()=>new THREE.Vector3(-Math.sin(st.yaw)*Math.cos(st.pv),Math.sin(st.pv),-Math.cos(st.yaw)*Math.cos(st.pv));
addEventListener('keydown',e=>{
 if(REDLINE_BINDINGS.isCapturing())return;
 if(window.REDLINE_GUIDE?.active)REDLINE_GUIDE.noteAction(REDLINE_BINDINGS.actionFor(e.code)||e.code);
 if(e.code==='Escape'&&window.redlineUI?.racePanelOpen?.()){e.preventDefault();redlineUI.closeRacePanel(false);return;}
 if(e.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
 const action=REDLINE_BINDINGS.actionFor(e.code);
 if(action||['KeyW','KeyA','KeyS','KeyD','Escape'].includes(e.code))e.preventDefault();
 // In-race settings are a real UI: do not fire, boost, recover or change the
 // camera while the user is choosing controls or tuning the game.
 if(window.redlineUI?.racePanelOpen?.()){
  if(e.code==='Escape'){redlineUI.closeRacePanel(false);e.preventDefault();}
  return;
 }
 if(window.redlineUI && redlineUI.current!=='race' && action!=='settings')return;
 // Movement updates before the key-repeat guard; a key held across pointer
 // capture or a screen transition must still reach the flight controller.
 REDLINE_MOVE.press(e.code,e.key);
 K[e.code]=true;
 if(e.repeat)return;
 if(action==='brake'&&mode==='run'){
  // J is an immediate full stop, not a gradual airbrake. Hold to stay still.
  FL.speed=FL.vx=FL.vy=FL.vz=FL.strafeSpeed=0;
  st.spd=0;st.vy=0;
 }
 if(action==='cameraZoom'){cameraRigReset=true;camM=(camM+1)%3;msg(['CHASE CAMERA','CLOSE CHASE','WIDE CHASE'][camM],600)}
 if(action==='level'){REDLINE_MOUSE_ALT.level();mousePitch=0;st.pm=0;cameraOrbitYaw=0;cameraOrbitPitch=0;msg('FLIGHT PITCH LEVEL',700)}
 if(action==='mute'){soundMuted=!soundMuted;REDLINE_AUDIO_ENGINE.setMuted(soundMuted);msg(soundMuted?'SOUND OFF':'SOUND ON',600)}
 if(action==='time'){tod=(tod+1)%3;setTod(tod)}
 if(action==='fire'&&mode==='run'){window.REDLINE_LASER_INPUT.lastTrigger='KeyE';window.REDLINE_LASER_INPUT.triggers++;fire();}
 if(action==='emp')clashFlowAction('pulse');
 if(action==='shield'&&mode==='run')clashFlowAction('shield');
 if(action==='flowBoost')clashFlowAction('refuel');
 if(action==='reload')clashFlowAction('reload');
 if(action==='livery')clashCycleLivery();
 if(action==='settings'&&window.redlineUI){if(redlineUI.current==='race')redlineUI.openRacePanel('settings');else redlineUI.go('settings');}
 if(action==='uiCursor'&&(mode==='run'||mode==='count')&&locked){REDLINE_VCURSOR.set(!REDLINE_VCURSOR.active);document.body.classList.toggle('rl-hud-peek',REDLINE_VCURSOR.active);msg(REDLINE_VCURSOR.active?'UI CURSOR · TOP MENU REVEALED':'MOUSE AIM READY',800);}
 if(action==='hud'&&redlineUI.current==='race'){const nextMode=REDLINE_HUD.next(redlineUI.config.hudMode);redlineUI.setHudMode(nextMode);msg('HUD · '+nextMode.toUpperCase()+'  /  Y TO CHANGE',1000);}
 if(e.code==='Escape'&&window.redlineUI?.racePanelOpen?.()){e.preventDefault();redlineUI.closeRacePanel(false);return;}
 if(action==='view'&&(mode==='run'||mode==='count')){cameraRigReset=true;redlineUI.config.view=1-redlineUI.config.view;redlineUI.show('race')}
 if(action==='center'&&(mode==='run'||mode==='count')){redlineUI.aim.x=0;redlineUI.aim.y=0;}
 if(action==='recover'&&mode==='run')recover();
 if(e.code==='Escape'&&(mode==='run'||mode==='count')&&redlineUI.current==='race'){e.preventDefault();if(document.pointerLockElement===Rn.domElement)document.exitPointerLock?.();redlineUI.updateMouseUnlocked();}
 if(action==='ghost'){ghostVisible=!ghostVisible;msg(ghostVisible?'GHOST ENABLED':'GHOST HIDDEN',750)}
 if(action==='handling'){
  const sequence=['easy','sport','expert'],currentMode=redlineUI.config.handlingMode||'easy';
  const next=sequence[(sequence.indexOf(currentMode)+1)%sequence.length];
  redlineUI.setHandlingMode(next);msg('HANDLING: '+next.toUpperCase(),1000);
 }
 if(action==='restart'&&mode==='run')restartSprint();
 if(action==='stats')$('devStats').classList.toggle('hide');
 if(action==='shadows'){redlineShadowsVisible=!redlineShadowsVisible;sun.castShadow=redlineShadowsVisible;msg(redlineShadowsVisible?'SUN SHADOWS ON':'SUN SHADOWS OFF (DIAGNOSTIC)',1200)}
 if(action==='screenshot')captureNextFrame=true;
});
addEventListener('keyup',e=>{K[e.code]=false;REDLINE_MOVE.release(e.code,e.key);});
addEventListener('blur',()=>{for(const key of Object.keys(K))K[key]=false;REDLINE_MOVE.clear();REDLINE_MOUSE_ALT.reset();});
// Browsers require a user gesture for pointer lock. Race-launch clicks request
// it immediately; after Esc a touchpad double-tap/double-click recaptures.
function redlineLockedFlight(){return window.redlineUI?.config?.mouseControlMode!=='classic';}
function redlineCenterAim(){return window.redlineUI?.config?.centeredAim!==false;}
function redlineActivateMouse(){
 if(redlineLockedFlight())REDLINE_MOUSE_ALT.begin('locked',FL.yaw);
 else REDLINE_MOUSE_ALT.reset();
 if(redlineCenterAim()&&window.redlineUI?.aim){redlineUI.aim.x=0;redlineUI.aim.y=0;}
}
document.addEventListener('pointerlockchange',()=>{
 locked=document.pointerLockElement===Rn.domElement;
 if(locked){redlineActivateMouse();if(window.REDLINE_LASER_INPUT)REDLINE_LASER_INPUT.lastDown=-Infinity;}
 else{REDLINE_MOUSE_ALT.reset();if(window.REDLINE_LASER_INPUT)REDLINE_LASER_INPUT.lastDown=-Infinity;REDLINE_VCURSOR.set(false);document.body.classList.remove('rl-hud-peek');}
 if(window.redlineUI)window.redlineUI.updateMouseUnlocked();
});
addEventListener('focus',()=>{if(document.pointerLockElement===Rn.domElement&&redlineLockedFlight()&&!REDLINE_MOUSE_ALT.held)redlineActivateMouse();});
addEventListener('mousemove',e=>{
 if(!locked||(mode!=='run'&&mode!=='count'))return;
 const mx=cl(e.movementX,-100,100),my=cl(e.movementY,-100,100);
 if(REDLINE_VCURSOR.active){REDLINE_VCURSOR.move(mx,my);return;}
 if(redlineLockedFlight()){
  if(!REDLINE_MOUSE_ALT.held||REDLINE_MOUSE_ALT.style!=='locked')REDLINE_MOUSE_ALT.begin('locked',FL.yaw);
  REDLINE_MOUSE_ALT.feed(mx,my);
  if(redlineCenterAim()){redlineUI.aim.x=0;redlineUI.aim.y=0;}
  else redlineUI.mouseAim(mx,my);
  if(window.REDLINE_GUIDE?.active)REDLINE_GUIDE.noteAction('MOUSE STEER');
  return;
 }
 // Optional Classic mode preserves right-mouse steering and free reticle.
 if(REDLINE_MOUSE_ALT.held){REDLINE_MOUSE_ALT.feed(mx,my);return;}
 if(!redlineCenterAim())redlineUI.mouseAim(mx,my);
});
Rn.domElement.addEventListener('contextmenu',e=>{if(mode==='run'||mode==='count')e.preventDefault();});
addEventListener('mouseup',e=>{if(e.button===2&&window.redlineUI?.config?.mouseControlMode==='classic')REDLINE_MOUSE_ALT.reset();});
// E is the exclusive keyboard/mouse laser trigger. Mouse gestures only
// reacquire pointer lock so aiming never unexpectedly consumes ammunition.
const REDLINE_LASER_INPUT={lastDown:-Infinity,lastTrigger:'none',triggers:0};
window.REDLINE_LASER_INPUT=REDLINE_LASER_INPUT;
document.addEventListener('mousedown',e=>{
 if(redlineUI?.current!=='race'||(mode!=='run'&&mode!=='count'))return;
 if(e.button===2){
  e.preventDefault();
  if(!redlineLockedFlight())REDLINE_MOUSE_ALT.begin('classic',FL.yaw);
  if(!locked)Rn.domElement.requestPointerLock?.();
 }
},true);
Rn.domElement.addEventListener('dblclick',e=>{
 if(e.button!==0||(mode!=='run'&&mode!=='count'))return;
 e.preventDefault();
 if(!locked)Rn.domElement.requestPointerLock?.();
});
window.REDLINE_MOUSE_LOCK_STATUS=()=>({locked:document.pointerLockElement===Rn.domElement,mode:window.redlineUI?.config?.mouseControlMode||'locked',centeredAim:redlineCenterAim(),pitchSensitivity:window.redlineUI?.config?.pitchSensitivity||90,pitch:REDLINE_MOUSE_ALT.pitch,headingTarget:REDLINE_MOUSE_ALT.headingTarget,yaw:FL.yaw,turnRate:FL.turnRate,turnRadius:FL.turnRadius,laserShots:window.REDLINE_LASER_DIAGNOSTICS?.shots||0});
$('ov').onclick=null; // v16: menu state owns launching, not the legacy fullscreen overlay.
addEventListener('resize',()=>{rsz();Rn.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()});
function restartSprint(){if(REDLINE_ONLINE.isRacing)return;REDLINE_GUIDE?.finish(true);reset();mode='count';cd=.65;redlineUI.goUntil=0;redlineUI.show('race');redlineUI.notify('RUN RESTARTED','Fresh timer · same course · best ghost preserved','success');}
// All entrants start at the same longitudinal station in a single transverse lineup.
// Slot order is stable for online rooms; AI uses the exact same position function.
function redlineGridPosition(slot,count){
 const players=Math.max(1,Math.min(6,Math.round(count||1)));
 const laneWidth=Math.min(104,Math.max(42,FW[0]*.78));
 const spacing=Math.min(13.5,laneWidth/Math.max(players,2));
 const lane=(cl(slot,0,players-1)-(players-1)*.5)*spacing;
 const x=PX[0]-TZ[0]*lane,z=PZ[0]+TX[0]*lane;
 return {x,y:Math.max(86,gh(x,z)+28),z,lane,slot,players,spacing};
}
window.REDLINE_GRID_POSITION=(slot,count)=>redlineGridPosition(slot,count);
function reset(){REDLINE_LOCK_STATE.reset();REDLINE_MOUSE_ALT.reset();REDLINE_MOVE.clear();REDLINE_PRODUCT.beginRun();loadBestForCourse();lastSectors=[];window.REDLINE_DEBRIS?.clear();document.body.classList.remove('rl-destroyed');cameraRigReset=true;activeFlightSteps=0;if(window.redlineUI?.resetTiming)redlineUI.resetTiming();REDLINE_DAM.passedThisLap=false;REDLINE_DAM.lastNotice=-1000;cameraOrbitYaw=0;cameraOrbitPitch=0;mousePitch=0;lap=1;gate=0;raceT=lapT=0;pd=NaN;lastCheckpointTime=0;sectorSplits=[];liveGhost=[];ghostAccumulator=0;const onlineGrid=REDLINE_ONLINE.isRacing;const slot=onlineGrid?Math.max(0,REDLINE_ONLINE.startSlot-1):0;const count=onlineGrid?REDLINE_ONLINE.startCount:Math.max(1,redlineUI.config.bots+1);const start=redlineGridPosition(slot,count);st.p.set(start.x,start.y,start.z);
 // Synchronize the visible aircraft BEFORE the first race HUD frame. This
 // also prevents the initial radar draw from reflecting the last menu pose.
 dr.position.copy(st.p);
 redlineNavHistory.length=0;redlineNavLastTs=0;
 window.REDLINE_GRID_QA={course:REDLINE_WORLD,online:onlineGrid,slot,count,player:start,opponents:[]};st.kickRemaining=0;st.kickVelocity=new THREE.Vector3();st.nextKickAt=-Infinity;st.blockedFor=0;st.lastContactFrame=-Infinity;st.lastFreePoint=null;st.lastImpactNormal=null;prevPlayerPosition.copy(st.p);boostPreviously=false;pulseAge=9;st.yaw=Math.atan2(-TX[0],-TZ[0]);Object.assign(st,{spd:0,vy:0,pm:0,boost:100,las:2,laserRecharge:0,pv:0,roll:0});FL.x=st.p.x;FL.y=st.p.y;FL.z=st.p.z;FL.yaw=st.yaw;FL.speed=0;FL.vx=FL.vz=FL.vy=0;FL.energy=1;FL.boosting=false;FL.boostLocked=false;FL.roll=FL.pitch=FL.turnRate=0;REDLINE_FLIGHT.resetTransients(FL);
 REDLINE_PLAYER_CRASH.t=0;REDLINE_PLAYER_CRASH.restore=null;document.body.classList.remove('rl-destroyed');REDLINE_VCURSOR.set(false);
 OB.forEach(o=>{o.alive=true;o.dying=0;o.m.visible=true;o.m.scale.setScalar(1)});PK.forEach(k=>{k.t=0;k.m.visible=true});gateCols();resetClash()}
function gateCols(){GM.forEach((m,i)=>{const cur=i==gate;m.material.color.setHex(cur?0xff9a2a:0x2fd8ff);m.material.opacity=cur?.95:.35})}
function redlineCombatRespawn(){
 // A laser hit is distinct from a missed checkpoint: preserve lap and gate progress.
 const at=REDLINE_PLAYER_CRASH.restore;
 let desired=at?.point?.clone()||st.p.clone();
 // Keep the place of impact. Only search a tiny local safety envelope if embedded in rock.
 const candidates=[desired.clone()];
 for(const up of [4,8,12])candidates.push(desired.clone().add(new THREE.Vector3(0,up,0)));
 for(const distance of [5,9,13])for(let i=0;i<8;i++){
  const ang=i*Math.PI/4;
  candidates.push(desired.clone().add(new THREE.Vector3(Math.cos(ang)*distance,6,Math.sin(ang)*distance)));
 }
 const valid=candidates.find(q=>redlineEscapeCandidate(q));
 if(valid)desired=valid;
 else if(st.lastFreePoint&&st.lastFreePoint.distanceTo(desired)<24)desired=st.lastFreePoint.clone();
 desired.y=Math.max(desired.y,gh(desired.x,desired.z)+10.5);
 st.p.copy(desired);st.yaw=at?.heading??st.yaw;st.vy=0;st.spd=0;st.ic=1.0;
 FL.x=st.p.x;FL.y=st.p.y;FL.z=st.p.z;FL.yaw=st.yaw;
 FL.speed=55;FL.vx=-Math.sin(st.yaw)*55;FL.vz=-Math.cos(st.yaw)*55;FL.vy=0;st.spd=55;REDLINE_FLIGHT.resetTransients(FL);
 if(REDLINE_MOUSE_ALT.held&&REDLINE_MOUSE_ALT.style==='locked')REDLINE_MOUSE_ALT.align(FL.yaw);
 st.kickRemaining=0;st.blockedFor=0;st.lastContactFrame=-Infinity;
 cameraRigReset=true;pd=NaN;prevPlayerPosition.copy(st.p);
 REDLINE_PLAYER_CRASH.restore=null;
 document.body.classList.remove('rl-destroyed');dr.visible=true;
 REDLINE_DEBRIS.clear();
 window.REDLINE_LAST_COMBAT_RESPAWN={requested:at?.point?.toArray()||null,actual:st.p.toArray(),sameGate:gate===at?.gate,sameLap:lap===at?.lap};
 REDLINE_AUDIO_ENGINE.play('respawn');clashSpeak('REBUILT · RETURN TO RACE',1100);
}
function recover(){
 cameraRigReset=true;
 const g=Math.min(gate,GATES.length-1),needsDam=gate===4&&!REDLINE_DAM.passedThisLap;
 let heading;
 if(needsDam){
  // River centerline ~70m upstream of the actual dam, not the NEXT ring
  // behind it. Returning to Needle Pass would be a soft lock after skipping
  // the now-required floodgate checkpoint.
  heading=Math.round(.361*N)%N;
  st.p.set(PX[heading],Math.max(90,gh(PX[heading],PZ[heading])+34),PZ[heading]);
 }else if(gate>=0){
  st.p.copy(GP[g]).addScaledVector(GT[g],-58);
  st.p.y=Math.max(st.p.y,gh(st.p.x,st.p.z)+34);
  heading=Math.round(GATES[g][0]*N)%N;
 }else{
  heading=0;st.p.set(PX[0],Math.max(86,gh(PX[0],PZ[0])+26),PZ[0]);
 }
 st.yaw=Math.atan2(-TX[heading],-TZ[heading]);st.spd=0;st.vy=0;
 FL.speed=0;FL.vx=FL.vz=FL.vy=0;FL.x=st.p.x;FL.y=st.p.y;FL.z=st.p.z;FL.yaw=st.yaw;REDLINE_FLIGHT.resetTransients(FL);if(REDLINE_MOUSE_ALT.held&&REDLINE_MOUSE_ALT.style==='locked')REDLINE_MOUSE_ALT.align(FL.yaw);
 st.kickRemaining=0;st.blockedFor=0;redlineEnforceAltitudeCeiling();
 raceT+=2;lapT+=2;pd=NaN;prevPlayerPosition.copy(st.p);
 redlineUI.aim.x=0;redlineUI.aim.y=0;
 msg(needsDam?'RETURNED TO SPILLWAY APPROACH  +2s':'RETURNED TO NEXT RING  +2s');
 redlineUI.notify('CHECKPOINT RECOVERY',needsDam?'Fly through the floodgate · +2 seconds':'Next missed ring · +2 seconds','success');
}
// v75 targeting: 2.0 seconds of uninterrupted visible tracking, no wall penetration.
const REDLINE_LOCK_STATE=REDLINE_TARGET_LOCK.create(2.0);
let REDLINE_LOCK_CANDIDATE=null;
const REDLINE_LOCK_WIDGET=document.createElement('div');
REDLINE_LOCK_WIDGET.id='rlTargetLock';
REDLINE_LOCK_WIDGET.setAttribute('aria-label','Laser target lock progress');
REDLINE_LOCK_WIDGET.innerHTML='<div class="lock-name"><span id="rlLockAction">TRACKING</span><strong id="rlLockName">RIVAL</strong><span id="rlLockClock">0.0/2.0</span></div><div class="lock-progress"><i id="rlLockFill"></i></div>';
document.body.appendChild(REDLINE_LOCK_WIDGET);
function redlineAcquireLockCandidate(){
 if(mode!=='run'||CLASH.gameMode!=='clash'||window.REDLINE_GUIDE?.active)return null;
 if(redlineUI.current!=='race'||REDLINE_PLAYER_CRASH.active||st.las<1)return null;
 cam.updateMatrixWorld(true);
 const aim=redlineUI.config.view===1?(redlineUI.aim||{x:0,y:0}):{x:0,y:0};
 let candidate=null,closest=.135;
 for(const b of CLASH.bots){
  if(b.index>=redlineUI.config.bots||!b.mesh.visible||b.respawnT>0||b.stunT>0)continue;
  const point=b.mesh.position.clone();
  const range=point.distanceTo(st.p);
  if(range<12||range>Math.min(LASER_DISTANCE-12,425))continue;
  const projected=point.clone().project(cam);
  if(projected.z<=-1||projected.z>=1)continue;
  const delta=Math.hypot(projected.x-aim.x,projected.y-aim.y);
  if(delta>=closest)continue;
  candidate={id:'rival-'+b.index,target:b,point,delta};closest=delta;
 }
 if(!candidate)return null;
 // Both an unobstructed view and an unobstructed physical shot are required.
 const origin=st.p.clone().add(new THREE.Vector3(0,.7,0));
 const diff=candidate.point.clone().sub(origin),distance=diff.length();
 if(distance<=12)return null;
 const blocked=laserWorldHit(origin,diff.normalize(),Math.max(0,distance-11));
 return blocked?null:candidate;
}
function redlineUpdateLock(dt){
 const candidate=redlineAcquireLockCandidate();
 const status=REDLINE_LOCK_STATE.step(dt,candidate);
 REDLINE_LOCK_CANDIDATE=candidate;
 const visible=mode==='run'&&redlineUI.current==='race'&&(candidate||status.id);
 REDLINE_LOCK_WIDGET.classList.toggle('is-active',!!visible);
 REDLINE_LOCK_WIDGET.classList.toggle('is-ready',status.ready);
 if(!visible)return;
 const target=candidate?.target||REDLINE_LOCK_STATE.target;
 const name=target?.label||'RIVAL';
 document.getElementById('rlLockAction').textContent=status.ready?'LOCKED': 'LOCKING';
 document.getElementById('rlLockName').textContent=name;
 document.getElementById('rlLockClock').textContent=status.ready?'E TO FIRE':status.elapsed.toFixed(1)+'/2.0';
 document.getElementById('rlLockFill').style.width=(100*status.progress).toFixed(1)+'%';
}
window.REDLINE_LOCK_STATUS=()=>({...REDLINE_LOCK_STATE.snapshot(),targetLabel:REDLINE_LOCK_STATE.target?.label||null});
function fire(){
 if(st.las<1||st.cd>0||REDLINE_PLAYER_CRASH.active)return;
 const verified=REDLINE_LOCK_STATE.ready?redlineAcquireLockCandidate():null;
 const guidedRival=verified&&verified.id===REDLINE_LOCK_STATE.id?verified.target:null;
 st.las--;st.cd=.38;st.laserRecharge=1.45;st.bt=LASER_DURATION;laserZap();
 if(guidedRival)REDLINE_LOCK_STATE.fire();
 window.REDLINE_LASER_DIAGNOSTICS={shots:(window.REDLINE_LASER_DIAGNOSTICS?.shots||0)+1,ammo:st.las,lastAt:performance.now(),input:window.REDLINE_LASER_INPUT?.lastTrigger||'keyboard'};
 LAS.forEach(a=>{a.stop();a.reset();a.setLoop(THREE.LoopOnce,1);
  a.clampWhenFinished=true;a.play()});
 dr.updateMatrixWorld(true);
 // Heading-locked dual forward cannons: the trajectory is level relative
 // to the world, not tilted with the fuselage or projected down from camera.
 // Muzzle positions still move with the real drone model.
 let destroyed=false;
 const worldAimPoint=redlineUI.aimPoint();
 [-1,1].forEach((side,index)=>{
  const start=dr.localToWorld(new THREE.Vector3(side*2.55,.60,-2.45));
  const goal=guidedRival&&guidedRival.mesh.visible?guidedRival.mesh.position.clone():worldAimPoint;
  const forward=redlineUI.aimRay(start,goal);
  const hit=clashWeaponHit(start,forward,laserWorldHit(start,forward,LASER_DISTANCE),index,guidedRival);
  const end=hit?hit.point:start.clone().addScaledVector(forward,LASER_DISTANCE);
  placeLaser(start,end,!!hit,index);
  LASER_GROUPS[index].muzzleSide=side;
  LASER_GROUPS[index].flightHeading=st.yaw;
  if(hit?.obstacle?.fr&&hit.obstacle.alive){hit.obstacle.alive=false;
   hit.obstacle.dying=.4;destroyed=true}
 });
 if(destroyed)msg('SEAL SHATTERED',900);
}
function hitFx(){if(st.ic<=0){REDLINE_AUDIO_ENGINE.play('hit');const gentle=redlineUI.config.beginnerAssist;const factor=gentle?.76:.35;FL.speed*=factor;FL.vx*=factor;FL.vz*=factor;st.ic=gentle?.26:.5;st.shake=gentle?.30:1;msg('IMPACT',500);redlineUI.notify('HULL CONTACT',gentle?'Flight assist stabilized the drone':'Velocity disrupted','danger')}}
const SEC=[['RAVEN SWITCHBACKS',.17],['EMBER RIDGE',.32],['THE NEEDLES',.48],['WIND CUT',.65],['IRONWALL',.82],['THERMAL FINISH',1.01]];
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REDLINE // CANYON CLASH  — opt-in single-player action racing systems.
// Original canyon physics, glTF drone, water and rock collision are preserved.
// All set pieces are deterministic, have counterplay, and cannot close the main course.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// REDLINE v75 // Race Director (v76 combat integration).  State changes at readable, multi-second intervals.
// All speeds are world-units/second. No progress teleportation, no unlimited energy.
const REDLINE_RIVAL_DIRECTOR=(()=>{
 const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
 const presets=[
  {cruise:.93,boost:1.13,aggression:.69},
  {cruise:.985,boost:1.24,aggression:.80},
  {cruise:1.04,boost:1.36,aggression:.91}
 ];
 function reset(b){b.tempo='fast';b.tempoTimer=2.3+b.index*.71;b.boostWindow=0;b.boostRest=.7+b.index*.45;b.paceJitter=1;b.raceShots=0;}
 function step(b,dt,{gap=0,straight=1}={}){
  const preset=presets[b.index]||presets[1];
  b.tempoTimer=Math.max(0,(b.tempoTimer||0)-dt);
  if(b.tempoTimer===0){
   b.tempo=(Math.random()<(.63+clip(gap,0,.13)*1.3+preset.aggression*.09))?'fast':'medium';
   b.tempoTimer=2.6+Math.random()*3.7;
   b.paceJitter=.98+Math.random()*.055;
  }
  const hadBoostWindow=(b.boostWindow||0)>0;
  b.boostRest=Math.max(0,(b.boostRest||0)-dt);
  b.boostWindow=Math.max(0,(b.boostWindow||0)-dt);
  if(hadBoostWindow&&b.boostWindow===0)b.boostRest=1.4+Math.random()*2.2;
  if(b.boostWindow===0&&b.boostRest===0&&b.energy>.30&&
     (b.tempo==='fast'||gap>.012)&&straight>.32&&b.stunT<=0){
   b.boostWindow=1.0+.35*b.index+Math.random()*.85;
   b.boostRest=0;
  }
  const boost=b.boostWindow>0&&b.energy>.05&&straight>.24&&b.stunT<=0;
  const speedFactor=(b.tempo==='fast'?1.055:.925)*b.paceJitter*preset.cruise;
  return {mode:b.tempo,speedFactor,boost,boostMultiplier:preset.boost};
 }
 return Object.freeze({presets,reset,step});
})();
window.REDLINE_RIVAL_DIRECTOR=REDLINE_RIVAL_DIRECTOR;

// REDLINE v76 - Swept, predictive rifle targeting shared by all three rivals.
// Attacks still obey sightlines, the telegraph, shield, and crash cooldown.
const REDLINE_RIVAL_HITSCAN=(()=>{
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function closestDistance(a,b,p){
  const v=b.clone().sub(a),w=p.clone().sub(a),denom=v.lengthSq();
  const t=denom>1e-8?clamp(w.dot(v)/denom,0,1):0;
  return p.distanceTo(a.clone().addScaledVector(v,t));
 }
 function predict(from,target,velocity,boltSpeed=1250){
  const flight=clamp(from.distanceTo(target)/boltSpeed,0,.26);
  return {point:target.clone().addScaledVector(velocity,flight*.55),flight};
 }
 return Object.freeze({closestDistance,predict,hits:(a,b,p,radius)=>closestDistance(a,b,p)<=radius});
})();
window.REDLINE_RIVAL_HITSCAN=REDLINE_RIVAL_HITSCAN;
// REDLINE v77: an enemy can acquire or retain a laser lock only inside its
// actual nose-forward firing cone. The nose is the model's local -Z axis.
// A fixed cone, not a rear-facing auto-aim turret: turning to face the player
// is required before firing, and a target moving behind cancels the lock.
const REDLINE_RIVAL_FIRE_ARC=(()=>{
 const HALF_ANGLE_DEG=55;
 const COS_HALF_ANGLE=Math.cos(HALF_ANGLE_DEG*Math.PI/180);
 function canFire(yaw,origin,target){
  if(!Number.isFinite(yaw)||!origin||!target)return false;
  const dx=target.x-origin.x,dz=target.z-origin.z;
  const length=Math.hypot(dx,dz);
  if(!(length>1e-4))return false;
  // Three.js Euler yaw rotates local -Z to (-sin(yaw), 0, -cos(yaw)).
  const alignment=((-Math.sin(yaw))*dx + (-Math.cos(yaw))*dz)/length;
  return alignment>=COS_HALF_ANGLE;
 }
 function canEngage(bot,target){return canFire(bot.mesh.rotation.y,bot.mesh.position,target);}
 // A modest accuracy reduction. The faster APEX/VIPER retain their advantage.
 function spread(index,time){
  const lateral=[15.5,15.2,14.7][Math.max(0,Math.min(2,index|0))];
  return {lateral:Math.sin(time*11.3+index*3.1)*lateral,
   vertical:Math.cos(time*7.1+index*1.4)*lateral*.45};
 }
 return Object.freeze({HALF_ANGLE_DEG,COS_HALF_ANGLE,canFire,canEngage,spread,HIT_RADIUS:15});
})();
window.REDLINE_RIVAL_FIRE_ARC=REDLINE_RIVAL_FIRE_ARC;
window.REDLINE_BOT_COMBAT_STATUS={shots:0,playerShots:0,hits:0,blocked:0,evaded:0,shielded:0,
 outsideArc:0,cancelledLocks:0,lastResult:'none'};


const CLASH = {
 flow:40, gameMode:'clash', combo:1, comboUntil:0, closeAward:0, lowAward:0, gateAwards:0,
 bots:[], stage:[], pickups:[], events:[], skyline:[], wave:null, pulseT:0, shieldT:0,
 marks:[], lastMode:'', lastPlace:4, encounter:0, eventAnnouncement:'',
 incomingFire:0, seed:97, eventClock:0, effects:[], finished:false,liveryIndex:0,liveryMaterial:null,wins:0,
 afterImpact:0, ghostWins:0, initialized:false, frameHud:0, tvUntil:0, tvKind:'',damageFlashUntil:0, botStats:[]
};
const clashShell=document.createElement('section');clashShell.id='clashShell';clashShell.innerHTML=`
  <div class="clash-head"><span class="clash-eyebrow">REDLINE // CANYON CLASH</span><span id="clashRank">P4 <small>/ 4 PILOTS</small></span></div>
  <div class="clash-energy"><div class="clash-small"><span>FLOW ENERGY <b id="clashFlowNum">40</b></span><span id="clashCombo">×1 COMBO</span></div><div class="clash-track"><div id="clashFlowFill"></div></div></div>
  <div id="clashMiniObjective">FLY CLOSE · THREAD GATES · OUTRACE RIVALS</div>
  <div class="clash-controls">B <span>REFUEL</span> · SPACE <span>SHIELD</span> · F <span>RELOAD</span> · E <span>FIRE</span></div>
  <div class="clash-rivals" id="clashRivals"></div>
`;
document.body.appendChild(clashShell);
// The single HTML also includes a pure time-attack mode with existing ghost replay.
const clashModes=document.createElement('div');clashModes.id='clashModes';
clashModes.innerHTML='<div class="mode-caption">CHOOSE YOUR RUN</div><button class="mode-btn chosen" data-run="clash">CANYON CLASH <small>3 FAST AI RIVALS · LASERS · EMP</small></button><button class="mode-btn" data-run="trial">TIME ATTACK <small>GHOSTS · MEDALS · PRECISION</small></button>';
$('ov').appendChild(clashModes);
clashModes.addEventListener('click',e=>{
 const b=e.target.closest('[data-run]');if(!b)return;e.stopPropagation();
 CLASH.gameMode=b.dataset.run;clashModes.querySelectorAll('button').forEach(el=>el.classList.toggle('chosen',el===b));
});
const clashEventEl=document.createElement('div');clashEventEl.id='clashEvent';document.body.appendChild(clashEventEl);
const clashImpactEl=document.createElement('div');clashImpactEl.id='clashImpact';clashImpactEl.textContent='✦';document.body.appendChild(clashImpactEl);
const clashTVEl=document.createElement('div');clashTVEl.id='clashTV';clashTVEl.setAttribute('role','status');clashTVEl.setAttribute('aria-live','polite');clashTVEl.innerHTML='<span id="clashTVSignal">REDLINE // TELEMETRY</span><strong id="clashTVTitle">SYSTEM READY</strong><span id="clashTVDetail">FLIGHT COMPUTER ONLINE</span>';
document.body.appendChild(clashTVEl);
const clashDamageVignette=document.createElement('div');clashDamageVignette.id='clashDamageVignette';document.body.appendChild(clashDamageVignette);
const clashTips=document.createElement('div');clashTips.id='clashTips';clashTips.textContent='SHOOT AMBER SWITCHES TO OPEN ROUTES · RISKY LINES BUILD FLOW';document.body.appendChild(clashTips);
const clashCSS=document.createElement('style');clashCSS.textContent=`
#clashShell{position:fixed;left:12px;top:192px;width:246px;z-index:8;pointer-events:none;border:1px solid #c48b5170;background:linear-gradient(135deg,#101820df,#151d24cb);box-shadow:0 18px 38px #02050a7a, inset 0 1px #f7c78226;backdrop-filter:blur(9px);border-radius:10px;padding:11px 12px 10px;box-sizing:border-box;font:11px ui-monospace,SFMono-Regular,Menlo,monospace;color:#e8e3d6}
.clash-head,.clash-small{display:flex;justify-content:space-between;align-items:center;gap:8px}.clash-eyebrow{font-size:10px;font-weight:900;letter-spacing:1.6px;color:#f5b978}#clashRank{font-weight:900;font-size:20px;color:#ffdfae}#clashRank small{font-size:9px;color:#aeb8bb}
.clash-energy{margin-top:12px}.clash-small{font-size:10px;color:#f4e4cf;letter-spacing:1px}.clash-small b{font-size:14px;color:#ffc075}#clashCombo{color:#93e8cd}.clash-track{height:9px;margin-top:6px;border-radius:6px;background:#354047;overflow:hidden;box-shadow:inset 0 1px 4px #0009}#clashFlowFill{height:100%;width:40%;border-radius:6px;background:linear-gradient(90deg,#c45433,#ffb05b,#ffe4a0);box-shadow:0 0 16px #ffaa4888;transition:width .16s}
#clashMiniObjective{margin-top:9px;color:#f2cda1;font-size:9px;letter-spacing:.5px;line-height:1.5;min-height:26px}#clashShell .clash-controls{font-size:10px;border-top:1px solid #eee3c12e;margin-top:6px;padding-top:8px;color:#fdd0a2;line-height:1.5}#clashShell .clash-controls span{color:#b2c3c7}
.clash-rivals{border-top:1px solid #eee3c126;margin-top:7px;padding-top:7px;display:flex;flex-direction:column;gap:5px}.clash-rival{display:flex;align-items:center;gap:7px;color:#bbc3c5;font-size:10px;letter-spacing:.3px}.clash-dot{width:6px;height:6px;border-radius:2px;box-shadow:0 0 8px currentColor}.clash-rival b{margin-left:auto;color:#efdcc5;font-size:10px}
#clashEvent{position:fixed;left:50%;top:112px;transform:translateX(-50%);z-index:12;max-width:min(72vw,600px);pointer-events:none;border:1px solid #efb16b99;background:#13202bdc;color:#ffd59a;padding:9px 18px;border-radius:5px;text-align:center;font-weight:800;font-size:12px;letter-spacing:1.7px;box-shadow:0 12px 32px #000a;opacity:0;transition:opacity .2s}#clashImpact{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:12;pointer-events:none;font-size:34px;color:#f9d18e;text-shadow:0 0 8px #ff5441,0 0 20px #ff9052;opacity:0;transition:opacity .08s}#clashTips{position:fixed;top:83px;left:50%;transform:translateX(-50%);z-index:7;pointer-events:none;color:#ffddae;font-size:10px;letter-spacing:1.25px;text-shadow:0 2px 9px #000;font-weight:700;white-space:nowrap}
#clashTV{position:fixed;top:23%;left:50%;transform:translate(-50%,-16px) scale(.96);width:min(84vw,490px);min-height:84px;box-sizing:border-box;display:flex;flex-direction:column;gap:5px;justify-content:center;align-items:center;z-index:19;pointer-events:none;opacity:0;border:1px solid #8ce4fb88;border-left:5px solid #ffbb70;background:linear-gradient(105deg,#030d18ec,#14212cee,#06111ded);box-shadow:0 8px 45px #000a,0 0 28px #4bc5fe30;overflow:hidden;padding:11px 22px;text-align:center;transition:opacity .11s,transform .14s}
#clashTV::after{content:'';pointer-events:none;position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0px,transparent 3px,#d3f8ff0c 4px);opacity:.8}#clashTV.active{opacity:1;transform:translate(-50%,0) scale(1)}
#clashTV #clashTVSignal{font:700 9px ui-monospace,Consolas,monospace;letter-spacing:4px;color:#88d8ff}#clashTV #clashTVTitle{font:1000 clamp(19px,3vw,29px) ui-monospace,Consolas,monospace;letter-spacing:2.4px;color:#f8f6ed;text-shadow:0 0 20px #67caff88}#clashTV #clashTVDetail{font:700 10px ui-monospace,Consolas,monospace;letter-spacing:1.6px;color:#a9bac8}
#clashTV.danger{border-color:#ff685f;border-left-color:#ff433c;box-shadow:0 10px 54px #68090077,0 0 40px #ff493148}#clashTV.danger #clashTVTitle{color:#ffd1c3;text-shadow:0 0 15px #ff433cb0}#clashTV.danger #clashTVSignal{color:#ff8776}
#clashTV.warning{border-left-color:#ffcd65}#clashTV.success{border-left-color:#57f1ca}
#clashDamageVignette{position:fixed;inset:0;z-index:18;pointer-events:none;opacity:0;box-shadow:inset 0 0 130px 38px #ff2323aa,inset 0 0 35px 7px #ff3828a6;transition:opacity .12s}
#clashShell.trial{width:215px}#clashShell.trial .clash-energy,#clashShell.trial .clash-controls,#clashShell.trial .clash-rivals{display:none}#clashTips{transition:opacity .45s}#clashModes{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:25px 0 5px;max-width:740px}#clashModes .mode-caption{width:100%;text-align:center;letter-spacing:3px;color:#c09c77;font-weight:900;font-size:11px}.mode-btn{font:700 13px ui-monospace,Menlo,monospace;background:#111923b8;color:#e4d3c1;border:1px solid #796f5c;padding:14px 19px;border-radius:7px;min-width:245px;cursor:pointer;letter-spacing:1.3px;text-align:left}.mode-btn small{display:block;color:#9db5bd;font-size:10px;margin-top:5px}.mode-btn.chosen{border-color:#ffb86f;background:#393024bc;box-shadow:inset 0 0 18px #dc6a3122,0 0 22px #e7954b22;color:#ffe5c1}.mode-btn:hover{border-color:#ffe0a0}#racePanel{top:94px}#section{font-size:12px;letter-spacing:3px;top:16px}#set{opacity:.2;transform:translateX(calc(100% - 18px));transition:opacity .2s,transform .2s}#set:hover,#set.clash-open{opacity:1;transform:translateX(0)}#set::before{content:'⚙';position:absolute;left:-15px;top:50%;transform:translateY(-50%);color:#ffc987;font-size:15px}#tp{padding:9px 13px;border:1px solid #d8a47844}#sp{background:#111b24df;border:1px solid #d8a47844}
#ov{background:linear-gradient(115deg,#090e16e9,#15120de4 65%,#0a1017e9);backdrop-filter:blur(12px);z-index:25}#ov::before{content:'// ARCADE FLIGHT · TACTICAL CANYON RACING';color:#e3a96d;font-size:12px;letter-spacing:5px;margin-bottom:18px}#ov h1{font-size:clamp(38px,7vw,86px)!important;letter-spacing:.18em!important;text-shadow:0 6px 36px #000,0 0 52px #db6c2940;margin:0 0 18px!important;color:#f7d3a6!important}#ov p{max-width:680px;font-size:14px!important;letter-spacing:.4px;color:#efe8de!important;line-height:1.9!important}#ov p b{color:#ffbc72}
@media(max-width:800px){#clashShell{left:8px;top:173px;width:170px;padding:7px;font-size:9px}#clashShell .clash-controls{font-size:8px}.clash-eyebrow{font-size:7px}#clashRank{font-size:13px}#clashMiniObjective{font-size:8px}#clashRivals{display:none}#maphud{top:165px}#clashTips{display:none}#clashEvent{top:95px;font-size:9px}}

/* v13.3 UX pass: restore cockpit readability, protect the flight corridor. */
.redline-clash-mode #racePanel{display:none}
#clashShell{top:100px;width:228px;padding:9px 10px}
#clashShell .clash-controls{letter-spacing:.2px}
#rlMobileSettings{display:none}
@media(max-width:1050px){
 #clashTV.active{top:43%;width:min(70vw,430px);min-height:66px}
}
@media(min-width:761px) and (max-width:1050px){#clashTV.active{top:55%;width:min(64vw,405px)}}
@media(max-width:760px){
 #section{display:none}
 #racePanel{display:none}
 #tp{max-width:225px;padding:5px 7px;font-size:10px;line-height:1.5;box-sizing:border-box}
 #wd{padding:5px 7px;font-size:9px}
 #clashShell{top:105px;left:8px;width:167px;padding:8px;border-radius:7px}
 .clash-eyebrow{font-size:8px;letter-spacing:.7px}
 #clashRank{font-size:15px}
 #clashShell .clash-controls{font-size:8px;line-height:1.65}
 #clashShell .clash-rivals{display:none}
 #clashMiniObjective{font-size:8px;line-height:1.3;min-height:0}
 #maphud{top:105px;right:8px;left:auto;padding:4px}
 #maphud canvas{width:110px;height:110px}
 #maphud .lbl{font-size:7px;letter-spacing:.5px}
 #clashEvent{top:65px;max-width:78vw;font-size:9px;letter-spacing:.4px;padding:5px 8px}
 #clashTV.active{top:41%;width:calc(100vw - 24px);min-height:66px;padding:8px}
 #clashTV #clashTVTitle{font-size:18px;letter-spacing:1.0px}
 #clashTV #clashTVSignal{font-size:8px;letter-spacing:2px}
 #clashTV #clashTVDetail{font-size:9px;letter-spacing:.4px;max-width:95%}
 #clashTips{display:none}
 #sp{left:8px;bottom:8px;max-width:182px;padding:6px 7px;font-size:10px;box-sizing:border-box}
 #sp b{font-size:27px}
 #bc{left:auto;right:8px;bottom:8px;transform:none;width:168px;padding:6px;box-sizing:border-box;font-size:10px}
 #bar{width:100%;height:7px}
 #set{display:none;right:8px;bottom:116px;left:auto;z-index:28;opacity:1;transform:none!important;padding:10px;background:#111c27f7;border:1px solid #b88c5f;font-size:11px}
 #set.clash-open{display:block}
 #set::before{display:none}
 #rlMobileSettings{display:block;position:fixed;right:8px;bottom:72px;z-index:30;background:#1b2934e8;color:#ffdfae;border:1px solid #b88c5f88;border-radius:7px;width:34px;height:32px;font-size:18px;cursor:pointer}
 #navPointer{max-width:62vw;white-space:normal;text-align:center;line-height:1.3;font-size:8px}
 #ov{box-sizing:border-box;padding:15px 12px;overflow:auto}
 #ov::before{font-size:9px;letter-spacing:1.5px;margin-bottom:9px}
 #ov h1{font-size:clamp(24px,8vw,38px)!important;letter-spacing:.06em!important;line-height:1.1!important;margin-bottom:8px!important}
 #ov p{font-size:11px!important;line-height:1.55!important;margin:2px 0!important}
 #clashModes{margin:12px 0 0;gap:7px}
 .mode-btn{padding:10px 13px;min-width:min(86vw,300px);font-size:11px}
 .mode-btn small{font-size:9px;margin-top:3px}
}
@media(max-width:760px) and (max-height:700px){#clashTV.active{top:62%}}
@media(prefers-reduced-motion:reduce){#clashTV,#clashEvent,#clashShell,#set{transition:none!important}}
`;document.head.appendChild(clashCSS);
const rlMobileSettings=document.createElement('button');rlMobileSettings.id='rlMobileSettings';rlMobileSettings.type='button';rlMobileSettings.setAttribute('aria-label','Toggle flight and graphics settings');rlMobileSettings.textContent='⚙';document.body.appendChild(rlMobileSettings);rlMobileSettings.addEventListener('click',e=>{e.stopPropagation();$('set').classList.toggle('clash-open')});
function clashSpeak(text,duration=1300){CLASH.eventAnnouncement=text;CLASH.eventClock=time+duration/1000;clashEventEl.textContent=text;clashEventEl.style.opacity='1'}
function clashHitMark(){clashImpactEl.style.opacity='1';CLASH.lastHit=time+.18}
function clashTV(title,detail='TACTICAL SYSTEM UPDATE',kind='warning',duration=1050){
 // Only race-defining events receive a large announcement. Incidental hits,
 // hull scrapes, EMP warnings and ordinary status changes use the restrained
 // event ticker instead of blocking the flight corridor.
 const major=/^(DRONE DISABLED|RACE COMPLETE|VICTORY|FINAL LAP|RACE FINISHED|FINISH LINE)/i.test(title);
 if(!major){clashSpeak((title+' · '+detail).replace(/\s*\/\/\s*/g,' · '),Math.min(duration,1050));return;}
 if((CLASH.tvUntil||0)>time&&CLASH.tvKind==='danger'&&kind!=='danger')return;
 CLASH.tvUntil=time+Math.min(duration,1600)/1000;CLASH.tvKind=kind;
 $('clashTVSignal').textContent='';
 $('clashTVTitle').textContent=title;$('clashTVDetail').textContent=detail;
 clashTVEl.className='active '+kind;
 if(kind==='danger'){CLASH.damageFlashUntil=time+.3;clashDamageVignette.style.opacity='.65'}
}
function clashBotSparks(b,color=0xff9e56){
 b.damageT=.55;b.damageFx.visible=true;b.damageFx.material.color.setHex(color);
 b.damageFx.scale.setScalar(1);b.damageFx.position.copy(b.mesh.position);
}
function clashGain(n,reason,combo=true){
 const before=CLASH.flow;CLASH.flow=cl(CLASH.flow+n,0,100);
 if(combo&&n>0){CLASH.combo=Math.min(4,CLASH.combo+1);CLASH.comboUntil=time+7;}
 if(CLASH.flow>before+1&&reason)clashSpeak('+'+Math.round(CLASH.flow-before)+' FLOW  ·  '+reason,660);
}
function clashSpend(n){if(CLASH.flow<n)return false;CLASH.flow-=n;return true}
function clashFlowAction(kind){
 if(mode!=='run')return;
 if(CLASH.gameMode!=='clash'){clashSpeak('TACTICAL SYSTEMS DISABLED IN TIME ATTACK',900);return;}
 if(kind==='reload'){
  if(st.las>=2){clashSpeak('LASER CELLS ALREADY FULL');return;}
  if(!clashSpend(30)){clashSpeak('NEED 30 FLOW TO RECHARGE LASERS');return;}
  st.las=2;clashSpeak('FLOW → TWO LASER CELLS RECHARGED',1350);redlineUI.notify('LASERS RELOADED','Two precision shots ready · 30 Flow','success');
 }else if(kind==='refuel'){
  if(FL.energy>=.93){clashSpeak('BOOST TANK ALREADY FULL');return;}
  if(!clashSpend(25)){clashSpeak('NEED 25 FLOW TO REFUEL');return;}
  FL.energy=cl(FL.energy+.52,0,1);clashSpeak('FLOW → BOOST +52%  ·  RELEASE SHIFT TO RE-ARM',1300);
 }else if(kind==='shield'){
  if(CLASH.shieldT>.3)return;
  if(!clashSpend(24)){clashSpeak('NEED 24 FLOW FOR SHIELD');return;}
  CLASH.shieldT=3.5;clashSpeak('AEGIS SHIELD  ·  3.5 SEC',1500);clashTV('AEGIS SHIELD','INCOMING LASERS AND EMP BLOCKED','success',950);
 }else if(kind==='pulse'){
  if(CLASH.gameMode!=='clash'){clashSpeak('EMP AVAILABLE IN CANYON CLASH MODE');return;}
  if(!clashSpend(42)){clashSpeak('NEED 42 FLOW FOR EMP');return;}
  CLASH.pulseT=.58;if(REDLINE_ONLINE.isRacing)REDLINE_ONLINE.ability('pulse');for(const b of CLASH.bots){if(CLASH.gameMode==='clash'&&b.mesh.position.distanceTo(st.p)<220&&!b.shieldT){b.stunT=1.65;b.shieldT=1.8;clashBotSparks(b,0xaa83ff);clashGain(4,null,false)}}
  clashSpeak('REDLINE EMP  //  RIVALS DISRUPTED',1400);clashTV('EMP DISCHARGED','RIVALS IN RANGE STUNNED','success',1000);
 }
}
function clashCreateRival(color,label,phase,targetLap,index){
 const obj=new THREE.Group(),main=new THREE.MeshStandardMaterial({color:0x111a22,metalness:.81,roughness:.28}),acc=new THREE.MeshStandardMaterial({color,metalness:.62,roughness:.24,emissive:color,emissiveIntensity:.48}),glass=new THREE.MeshPhysicalMaterial({color:0x8fcfe4,metalness:.22,roughness:.12,transparent:true,opacity:.91});
 const body=new THREE.Mesh(new THREE.ConeGeometry(2.9,10,7).rotateX(-Math.PI/2),main);body.scale.set(1.3,.77,1);obj.add(body);
 const hull=new THREE.Mesh(new THREE.BoxGeometry(5.2,1.2,6.7),main);hull.position.z=0;obj.add(hull);
 const cockpit=new THREE.Mesh(new THREE.SphereGeometry(2.4,14,10),glass);cockpit.scale.set(.73,.55,1.55);cockpit.position.set(0,1.1,-.5);obj.add(cockpit);
 const wings=new THREE.Mesh(new THREE.BoxGeometry(11,.5,1.3),main);wings.position.set(0,-.45,.7);obj.add(wings);
 const dorsal=new THREE.Mesh(new THREE.BoxGeometry(1.2,.23,6.1),acc);dorsal.position.set(0,.86,.55);obj.add(dorsal);
 for(const side of[-1,1]){
  const winglet=new THREE.Mesh(new THREE.BoxGeometry(3.0,.22,2.2),main);
  winglet.position.set(side*4.8,-.28,1.5);winglet.rotation.z=side*.17;obj.add(winglet);
  const accentPlate=new THREE.Mesh(new THREE.BoxGeometry(1.7,.16,4.2),acc);
  accentPlate.position.set(side*2.15,.54,-.42);accentPlate.rotation.y=side*.07;obj.add(accentPlate);
  const rudder=new THREE.Mesh(new THREE.BoxGeometry(.28,2.1,2.6),main);
  rudder.position.set(side*2.55,.66,3.3);rudder.rotation.z=side*.15;obj.add(rudder);
  const navLight=new THREE.Mesh(new THREE.SphereGeometry(.31,7,6),new THREE.MeshBasicMaterial({color:side<0?0xff5a4d:0x74eafb}));
  navLight.position.set(side*5.8,-.28,1.5);obj.add(navLight);
 }
 const blade=new THREE.Mesh(new THREE.BoxGeometry(1.4,.16,9),acc);blade.position.set(0,-.2,1);obj.add(blade);
 const glow=new THREE.Mesh(new THREE.CylinderGeometry(.68,.73,1.7,12),acc);glow.rotation.x=Math.PI/2;glow.position.set(0,-.4,4);obj.add(glow);
 for(const x of[-2.35,2.35]){const nozzle=new THREE.Mesh(new THREE.CylinderGeometry(.24,.36,1.1,10),acc);nozzle.rotation.x=Math.PI/2;nozzle.position.set(x,-.34,-4.35);obj.add(nozzle)}
 const rotors=[];
 for(const x of[-4.5,4.5])for(const z of[-2.3,2.7]){
  const pod=new THREE.Group();pod.position.set(x,-.55,z);
  pod.add(new THREE.Mesh(new THREE.TorusGeometry(1.45,.31,8,16).rotateX(Math.PI/2),main));
  const eye=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,.32,12),acc);eye.rotation.x=Math.PI/2;pod.add(eye);
  const jet=new THREE.Mesh(new THREE.ConeGeometry(.60,2.7,8),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.49,blending:THREE.AdditiveBlending,depthWrite:false}));jet.rotation.x=Math.PI;jet.position.y=-1.5;pod.add(jet);obj.add(pod);rotors.push(pod);
 }
 obj.scale.setScalar(1.55);obj.traverse(m=>{if(m.isMesh){m.castShadow=false;m.receiveShadow=false}});S.add(obj);
 const sight=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,1,8),new THREE.MeshBasicMaterial({color:0xd70b22,transparent:true,opacity:.42,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));sight.visible=false;S.add(sight);
 const damageFx=new THREE.Mesh(new THREE.IcosahedronGeometry(10,1),new THREE.MeshBasicMaterial({color:0xff9e56,transparent:true,opacity:.5,wireframe:true,blending:THREE.AdditiveBlending,depthWrite:false}));damageFx.visible=false;S.add(damageFx);
 const shield=new THREE.Mesh(new THREE.SphereGeometry(12.5,16,10),new THREE.MeshBasicMaterial({color:0x69f0fd,wireframe:true,transparent:true,opacity:.31,blending:THREE.AdditiveBlending,depthWrite:false}));shield.visible=false;S.add(shield);
 const empRing=new THREE.Mesh(new THREE.TorusGeometry(1,.18,7,28),new THREE.MeshBasicMaterial({color:0x9b7cff,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false}));empRing.rotation.x=Math.PI/2;empRing.visible=false;S.add(empRing);
 return {mesh:obj,rotors,sight,damageFx,shield,empRing,label,color,index,phase,progress:phase,
  targetLap,lapGoal:targetLap,lapClock:0,lastLapSeconds:0,completedLaps:0,lapTimes:[],lapRate:0,paceNorm:1,speed:0,velocity:0,measuredPlayerSpeed:0,
  lane:(index-1)*13,baseLane:(index-1)*13,desiredLane:(index-1)*13,laneBias:0,laneAmp:0,lanePhase:0,lineStyle:0,evasionTime:0,evasionCooldown:2+index,evasionSide:index%2?-1:1,
  lastPosition:new THREE.Vector3(),stunT:0,shieldT:0,shieldCooldown:5+index*3,
  flow:40,ammo:2,energy:1,boosting:false,boostLocked:false,respawnT:0,lastFlowGate:-1,
  fireT:3.7+index*1.4,telegraphT:0,burstT:0,lockPoint:new THREE.Vector3(),targetBot:null,
  empCooldown:12+index*3,empWindup:0,empT:0,damageT:0,hitCount:0,passAward:-1,passLap:-1,lastRelative:null};
}
function clashBotFactor(u,index){
 const k=((Math.floor((u%1+1)%1*N))%N+N)%N;
 const left=(k+N-7)%N,right=(k+7)%N;
 const dot=cl(TX[left]*TX[right]+TZ[left]*TZ[right],-1,1);
 const bend=cl(Math.acos(dot)/1.20,0,1);
 return 1.13-.17*bend+.024*Math.sin(u*Math.PI*6+index*2.1);
}
function clashBotPaceNorm(index){
 let total=0;for(let j=0;j<N;j++)total+=1/clashBotFactor((j+.5)/N,index);
 return total/N;
}
function clashBotRouteWindow(t,a,z){
 if(t<=a||t>=z)return 0;
 const u=(t-a)/(z-a);return Math.sin(Math.PI*u)**2;
}
function clashBotNewLapGoal(b,initial=false){
 const band=1+(Math.random()-.5)*.065;
 const cruise=REDLINE_AI.cruise(redlineUI.config.handlingMode,P.t);
 const skill=[1.15,1.235,1.32][b.index]||1.16;
  b.lapGoal=trackDistance/(cruise*1.025*skill)*band;
 const archetypes=[-.82,.08,.78];
 b.lineStyle=cl(archetypes[b.index%archetypes.length]+(Math.random()-.5)*.34,-1,1);
 b.laneAmp=5.5+Math.random()*5.0;
 b.laneBias=(Math.random()-.5)*5.0;
 b.lanePhase=Math.random()*Math.PI*2;
 b.routeChoices=Array.from({length:6},()=>Math.random()<.22?(Math.random()<.5?-1:1):0);
 b.ironwallRoute=Math.random()<.50?'high':'low';
 b.rimRoute=Math.random()<.50?'high':'low';
 // One consistent racing decision per sector. Do not randomly oscillate across the track every frame.
 if(initial)b.baseLane=(b.index-1)*9+b.laneBias*.25;
}

// P0 NAVIGATION: these checks use the same rock triangle hash and heightfield as
// the player. The bot cannot earn progress if swept movement was blocked.
function clashBotSweptClear(from,to,radius=8.5){
 const length=from.distanceTo(to),count=Math.max(1,Math.ceil(length/1.7));
 for(let s=1;s<=count;s++){
  const p=from.clone().lerp(to,s/count);
  if(p.y<gh(p.x,p.z)+radius+2.0)return false;
  if(CLIFF_COLLIDER.contact(p,radius,from))return false;
  for(const o of OB){if(!o.alive)continue;
   if(Math.hypot(p.x-o.x,p.z-o.z)<o.r+radius+1&&p.y<o.top+radius)return false;
  }
  if(CLASH.gameMode==='clash')for(const e of CLASH.events){
   if(!e.root.visible)continue;
   if(e.kind==='ravine'){
    if(clashEmberContact(e,p,radius))return false;
   }else if(e.kind==='ironwall'&&e.state==='active'){
    const local=e.root.worldToLocal(p.clone());
    if(Math.abs(local.z)<11+radius*.5&&Math.abs(local.x)<24+radius*.5&&Math.abs(local.y-e.gate.position.y)<10+radius*.5)return false;
   }
  }
 }
 return true;
}
function clashBotGroundedProgress(from,to,oldProgress){
 const moved=Math.hypot(to.x-from.x,to.z-from.z);
 if(moved<.0001)return oldProgress;
 const ref=Math.floor((((oldProgress%1)+1)%1)*N),cycle=Math.floor(oldProgress);
 let best=oldProgress,bestDist=Infinity;
 for(let dj=-12;dj<=15;dj++){
  const j0=ref+dj,j=((j0%N)+N)%N,k=(j+1)%N;
  const x0=PX[j],z0=PZ[j],dx=PX[k]-x0,dz=PZ[k]-z0,L=dx*dx+dz*dz;
  const f=L>1e-6?cl(((to.x-x0)*dx+(to.z-z0)*dz)/L,0,1):0;
  const px=x0+f*dx,pz=z0+f*dz,dist=(px-to.x)**2+(pz-to.z)**2;
  let u=cycle+(j+f)/N;
  if(u-oldProgress>.5)u-=1;
  if(u-oldProgress<-.5)u+=1;
  // Project only in the neighborhood of the last physically attained course point.
  if(u<oldProgress-.018||u>oldProgress+.025)continue;
  if(dist<bestDist){bestDist=dist;best=u}
 }
 const allowed=moved/Math.max(1,trackDistance)*1.22;
 return oldProgress+cl(best-oldProgress,0,allowed);
}
function clashBotAdvanceUntilCollision(from,target,maxTravel,radius){
 const delta=target.clone().sub(from),distance=delta.length(),travel=Math.min(distance,Math.max(0,maxTravel));
 const wanted=from.clone().addScaledVector(delta,travel/Math.max(distance,1e-8));
 let last=from.clone(),blocked=false;
 const count=Math.max(1,Math.ceil(travel/3.5));
 for(let s=1;s<=count;s++){
  const p=from.clone().lerp(wanted,s/count);
  if(!clashBotSweptClear(last,p,radius)){blocked=true;break}
  last.copy(p);
 }
 return {point:last,blocked,moved:from.distanceTo(last)};
}
function clashBotPhysicalStep(b,dt,target,radius=8.5){
 const from=b.mesh.position.clone();
 const advance=clashBotAdvanceUntilCollision(from,target,b.velocity*dt,radius);
 b.mesh.position.copy(advance.point);
 b.progress=clashBotGroundedProgress(from,advance.point,b.progress);
 b.speed=advance.moved/Math.max(dt,.0001);
 b.stuckT=advance.blocked?Math.min(6,(b.stuckT||0)+dt):Math.max(0,(b.stuckT||0)-dt*3);
 b.blockedSeconds=(b.blockedSeconds||0)+(advance.blocked?dt:0);
 b.movementSeconds=(b.movementSeconds||0)+dt;
 b.movementDistance=(b.movementDistance||0)+advance.moved;
 b.navHold=Math.max(0,(b.navHold||0)-dt);
 return {blocked:advance.blocked,moved:advance.moved,position:advance.point};
}
function clashBotSafeRoute(b,u,proposed,lane,dt=1/60){
 const i=Math.floor((((u%1)+1)%1)*N),out=proposed.clone();
 const center=clashPathAt(u);
 const options=[
  [lane,0],[lane,22],[lane,45],
  [cl(lane-16,-FW[i]*.29,FW[i]*.29),28],
  [cl(lane+16,-FW[i]*.29,FW[i]*.29),28],
  [0,55],[0,85]
 ];
 for(const [candidateLane,alt] of options){
  const p=out.clone();p.x=center.x-TZ[i]*candidateLane;p.z=center.z+TX[i]*candidateLane;
  p.y=Math.max(out.y+alt,gh(p.x,p.z)+24,b.navHold>0?b.navAltitude||0:0);
  // Preview the EXACT same physical substeps as the movement controller.
  // This avoids false-safe long rays whose samples skipped a narrow obstruction.
  const move=clashBotAdvanceUntilCollision(b.mesh.position,p,b.velocity*dt,8.5);
  const preview=p.clone().sub(b.mesh.position);
  const previewLen=preview.length();
  if(previewLen>0.01)preview.multiplyScalar(Math.min(1,Math.max(13,b.velocity*.135)/previewLen));
  preview.add(b.mesh.position);
  if(!move.blocked&&clashBotSweptClear(b.mesh.position,preview,8.5))
   return {point:p,lane:candidateLane,clear:true};
 }
 // If all forward candidates fail, keep a recovery altitude for long enough
 // to pass the obstacle. Without a hold the pilot climbs then dives back into
 // the same rock on the next frame, a previously reproduced deadlock.
 if(!(b.navHold>0)){b.navHold=2.5;b.navAltitude=Math.max(proposed.y+88,b.mesh.position.y+62);}
 const p=b.mesh.position.clone();p.y=Math.min(b.navAltitude,p.y+30);
 if(clashBotSweptClear(b.mesh.position,p,8.5))return {point:p,lane:b.lane,clear:true,recovery:true};
 return {point:b.mesh.position.clone(),lane:b.lane,clear:false};
}
function clashBotVisualBeam(b,to,bright){
 b.mesh.updateMatrixWorld(true);
 const from=b.mesh.localToWorld(new THREE.Vector3(0,1.2,-4));
 const delta=to.clone().sub(from),len=Math.max(.1,delta.length());
 b.sight.position.copy(from).addScaledVector(delta,.5);
 b.sight.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
 b.sight.scale.set(bright?2.5:1,len,bright?2.5:1);
 b.sight.material.opacity=bright?.72:.23+.06*Math.sin(time*20+b.index);
}

// Two finite-life RED laser pulses are emitted on fire, not a white aiming line.
// Muzzles and endpoints are frozen in world space until the effect dissipates.
function clashBotEmitRedLasers(b,end){
 if(!b.redShots){
  b.redShots=[-1,1].map(()=>{
   const outer=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,1,8),
    new THREE.MeshBasicMaterial({color:0x960413,transparent:true,opacity:.70,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
   const core=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,1,8),
    new THREE.MeshBasicMaterial({color:0xff1932,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
   outer.visible=false;core.visible=false;outer.frustumCulled=false;core.frustumCulled=false;
   outer.renderOrder=12;core.renderOrder=13;S.add(outer,core);
   return {a:outer,b:core,origin:new THREE.Vector3(),end:new THREE.Vector3(),age:0,duration:.36};
  });
 }
 b.mesh.updateMatrixWorld(true);
 for(let i=0;i<2;i++){
  const fx=b.redShots[i],side=i===0?-1:1;
  fx.origin.copy(b.mesh.localToWorld(new THREE.Vector3(side*2.0,.25,-2.9)));
  fx.end.copy(end);fx.age=0;fx.duration=.34+Math.random()*.09;
 }
 b.raceShots=(b.raceShots||0)+1;
}
function clashBotAdvanceRedLasers(b,dt){
 if(!b.redShots)return;
 const up=new THREE.Vector3(0,1,0);
 for(const fx of b.redShots){
  fx.age+=dt;
  if(fx.age>=fx.duration){fx.a.visible=false;fx.b.visible=false;continue;}
  // Visible moving energy body with a finite afterglow rather than a static ray.
  const v=fx.end.clone().sub(fx.origin),dist=v.length();if(dist<.02)continue;
  const dir=v.normalize(),travel=Math.min(dist,fx.age*1450);
  const length=Math.max(.7,Math.min(dist*.46,25));
  const mid=fx.origin.clone().addScaledVector(dir,Math.max(length*.5,travel-length*.5));
  const q=new THREE.Quaternion().setFromUnitVectors(up,dir);
  const opacity=Math.min(1,fx.age*17)*(1-fx.age/fx.duration);
  for(const m of [fx.a,fx.b]){m.visible=true;m.position.copy(mid);m.quaternion.copy(q);m.scale.set(1,length,1);}
  fx.a.material.opacity=.78*opacity;fx.b.material.opacity=.98*opacity;
 }
}

function clashBotEMP(b){
 b.empT=.58;b.empRing.visible=true;b.empRing.position.copy(b.mesh.position);
 clashBotSparks(b,0x9f82ff);
 // Pulse targets are local, telegraphed, and shields fully negate the player effect.
 if(b.mesh.position.distanceTo(st.p)<136&&CLASH.shieldT<=0&&st.ic<=0){
  FL.speed*=.82;FL.vx*=.84;FL.vz*=.84;CLASH.flow=Math.max(0,CLASH.flow-16);
  st.shake=Math.max(st.shake,.48);clashTV('EMP IMPACT','-16 FLOW  //  PROPULSION DISRUPTED','danger',1350);
 }
 for(const other of CLASH.bots){if(other===b||other.shieldT>0||other.mesh.position.distanceTo(b.mesh.position)>=128)continue;
  other.stunT=Math.max(other.stunT,.8);clashBotSparks(other,0x9f82ff);
 }
}
function clashRouteHeight(u){
 const marks=[[0,84],...GATES.filter(g=>g[0]>0).map(g=>[g[0],g[1]]),[1,84]];
 for(let i=0;i<marks.length-1;i++)if(u<=marks[i+1][0]){
  const a=marks[i],b=marks[i+1],t=sm(0,1,(u-a[0])/(b[0]-a[0]));return a[1]+(b[1]-a[1])*t;
 }return 84;
}
function clashPathAt(u){const wrap=((u%1)+1)%1,k=wrap*N,i=Math.floor(k),f=k-i;return new THREE.Vector3(PX[i]+(PX[i+1]-PX[i])*f,clashRouteHeight(wrap),PZ[i]+(PZ[i+1]-PZ[i])*f)}
function clashBeaconMesh(color){
 const g=new THREE.Group(),core=new THREE.Mesh(new THREE.OctahedronGeometry(7.2,1),new THREE.MeshStandardMaterial({color,metalness:.3,roughness:.22,emissive:color,emissiveIntensity:2.1}));g.add(core);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(10,.85,8,28),new THREE.MeshStandardMaterial({color:0xf5c28b,metalness:.72,roughness:.22,emissive:0xbd6e2d,emissiveIntensity:.3}));g.add(ring);g.userData.core=core;g.userData.ring=ring;return g;
}
function clashRockGateLeafGeometry(side,seed,bottom,top){
 const rings=10,segments=16,verts=[],uv=[],idx=[];
 for(let j=0;j<=rings;j++){
  const u=j/rings,y=bottom+(top-bottom)*u;
  const shoulder=.86+.17*Math.sin(Math.PI*u)+.07*Math.sin(u*18+seed);
  for(let q=0;q<segments;q++){
   const a=2*Math.PI*q/segments,noise=1+.077*Math.sin(a*5+u*17+seed)+.043*Math.sin(a*9-u*23+seed*1.3);
   const rx=(13.6+2.3*Math.sin(Math.PI*u*1.2))*shoulder*noise,
    rz=(9.0+1.4*Math.sin(u*12+seed))*shoulder*noise;
   verts.push(Math.cos(a)*rx+1.2*Math.sin(u*6+seed),
    y+((j===0||j===rings)?0:.7*Math.sin(a*6+seed+u*8)),
    Math.sin(a)*rz+.75*Math.sin(u*8+seed));
   uv.push(q/segments,u*5.0);
  }
 }
 for(let j=0;j<rings;j++)for(let q=0;q<segments;q++){
  const n=(q+1)%segments,a=j*segments+q,b=j*segments+n,c=(j+1)*segments+q,d=(j+1)*segments+n;
  idx.push(a,c,b,b,c,d);
 }
 const bottomCenter=verts.length/3;verts.push(0,bottom,0);uv.push(.5,0);
 const topCenter=verts.length/3;verts.push(0,top,0);uv.push(.5,1);
 for(let q=0;q<segments;q++){
  const n=(q+1)%segments;
  idx.push(bottomCenter,q,n);
  idx.push(topCenter,rings*segments+n,rings*segments+q);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.setIndex(idx);g.computeVertexNormals();return g;
}
function clashEmberContact(e,point,radius=8){
 if(e.kind!=='ravine')return false;
 const p=e.root.worldToLocal(point.clone());
 if(Math.abs(p.z)>11+radius)return false;
 return e.slabs.some(s=>Math.abs(p.x-s.slab.position.x)<17.7+radius&&
  p.y>s.bottom+s.slab.position.y-3-radius&&p.y<s.top+s.slab.position.y+3+radius);
}
function clashMakeRouteEvent(){
 const a=CUT_POINTS[6],b=CUT_POINTS[11],d=new THREE.Vector3(b.x-a.x,0,b.z-a.z).normalize(),forwardHeading=Math.atan2(d.x,d.z);
 const mid=CUT_POINTS[8],base=Math.max(gh(mid.x,mid.z)+23,74);
 const root=new THREE.Group();root.position.set(mid.x,base,mid.z);root.rotation.y=forwardHeading;S.add(root);
 const stone=new THREE.MeshStandardMaterial({color:0xb0674d,roughness:.9,metalness:0,map:PBR_TEX?.cliff_albedo||null});
 const mask=new THREE.MeshStandardMaterial({color:0x303945,metalness:.78,roughness:.29,emissive:0x8a4c22,emissiveIntensity:.12});
 const slabs=[],leafDiagnostics=[];
 root.updateMatrixWorld(true);
 for(const side of[-1,1]){
  const slab=new THREE.Group();slab.position.x=side*11;root.add(slab);
  const floorSamples=[];
  for(let q=0;q<16;q++){
   const a=2*Math.PI*q/16;
   const p=root.localToWorld(new THREE.Vector3(side*11+14.5*Math.cos(a),0,10*Math.sin(a)));
   floorSamples.push(gh(p.x,p.z));
  }
  const lowTerrain=Math.min(...floorSamples),bottom=lowTerrain-root.position.y-9,top=Math.max(27,bottom+43);
  const geo=clashRockGateLeafGeometry(side,side*1.7+12,bottom,top);
  const rock=new THREE.Mesh(geo,rockMat);rock.castShadow=true;rock.receiveShadow=true;slab.add(rock);
  // Mechanism brackets at the seam reveal that these heavy stone leaves move.
  const spine=new THREE.Mesh(new THREE.BoxGeometry(1.8,top-bottom-3,3.7),mask);
  spine.position.set(-side*11,(top+bottom)*.5,0);spine.castShadow=true;slab.add(spine);
  for(const h of[.28,.57,.83]){
   const band=new THREE.Mesh(new THREE.CylinderGeometry(1.4,1.4,4.3,10),mask);
   band.position.set(-side*10.5,bottom+(top-bottom)*h,0);band.rotation.x=Math.PI/2;slab.add(band);
  }
  slabs.push({slab,side,bottom,top});leafDiagnostics.push({side,bottomWorld:root.position.y+bottom,terrainMinimum:lowTerrain,burial:lowTerrain-root.position.y-bottom,vertices:geo.attributes.position.count});
 }
 window.REDLINE_P1_EMBER={leaves:leafDiagnostics};
 const beacon=clashBeaconMesh(0xff8f37);beacon.position.set(31,20,17);root.add(beacon);
 const glare=new THREE.PointLight(0xff8840,1.2,53);beacon.add(glare);
 const echo=new THREE.Mesh(new THREE.TorusGeometry(29,.7,8,32),new THREE.MeshBasicMaterial({color:0xffa64a,transparent:true,opacity:.48}));echo.rotation.y=Math.PI/2;root.add(echo);
 return {kind:'ravine',name:'EMBER GATE',root,beacon,slabs,echo,state:'closed',open:0,timer:0,cooldown:0,warning:0,position:beacon.getWorldPosition(new THREE.Vector3())};
}
function clashMakeRockfallEvent(){
 const t=.748,pos=clashPathAt(t),q=Math.floor(t*N),v=new THREE.Vector3(TX[q],0,TZ[q]).normalize();
 const root=new THREE.Group();root.position.set(pos.x,pos.y-25,pos.z);root.rotation.y=Math.atan2(v.x,v.z);S.add(root);
 const steel=new THREE.MeshStandardMaterial({color:0x4a5962,roughness:.34,metalness:.9});
 const edge=new THREE.MeshStandardMaterial({color:0x8f765b,roughness:.48,metalness:.62});
 const glow=new THREE.MeshStandardMaterial({color:0xf1a653,metalness:.38,roughness:.28,emissive:0xff6b1b,emissiveIntensity:.92});
 const glass=new THREE.MeshBasicMaterial({color:0xff8b43,transparent:true,opacity:.17,depthWrite:false,side:THREE.DoubleSide});
 const masonry=new THREE.MeshStandardMaterial({color:0x8f6d55,roughness:.92,metalness:.06,map:PBR_TEX?.cliff_albedo||null,normalMap:PBR_TEX?.cliff_normal||null,normalScale:new THREE.Vector2(.8,.8)});
 const bars=[],staticColliders=[];
 const addBox=(parent,w,h,d,x,y,z,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m};
 const span=116,deckY=58,sideZ=10.5;
 const bridge=new THREE.Group();root.add(bridge);
 const archMat=steel;
 // P1 FOUNDATION: each bearing samples the actual canyon and is buried into
 // the bank. Its upper surface meets the steel deck end, rather than stopping
 // more than 30 units below the bridge and appearing detached.
 const foundationDiagnostics=[];
 root.updateMatrixWorld(true);
 for(const side of[-1,1]){
  const lx=side*(span*.5-3);
  const world=root.localToWorld(new THREE.Vector3(lx,0,0));
  const terrain=gh(world.x,world.z),bottom=terrain-root.position.y-12,top=deckY-2.2;
  const foot=bottom<=top-7?bottom:top-10;
  const height=top-foot;
  const abut=new THREE.Group();abut.position.x=lx;bridge.add(abut);
  staticColliders.push(addBox(abut,24,height,25,0,foot+height*.5,0,masonry));
  staticColliders.push(addBox(abut,30,Math.max(8,height*.39),31,side*1.6,foot+Math.max(8,height*.39)*.5,0,rockMat));
  const seat=addBox(abut,21,3.3,23,side*1.5,deckY-2.4,0,steel);staticColliders.push(seat);
  // Broad fractured sandstone foot merges visually with the existing bedrock.
  const collar=addBox(abut,35,7,33,side*2.5,terrain-root.position.y-2.1,0,rockMat);
  collar.rotation.y=side*.045;
  const face=addBox(abut,4.5,Math.min(42,height*.78),17,-side*10,foot+height*.54,0,edge);face.rotation.z=side*.035;
  for(const yy of[deckY-13,deckY-7]){
   const lamp=addBox(abut,2.1,1.35,5,-side*11,yy,0,glow);lamp.castShadow=false;
  }
  foundationDiagnostics.push({side,terrain,foundationBottom:root.position.y+foot,
   bearingY:root.position.y+top,deckUndersideY:root.position.y+deckY-1.2,
   burial:terrain-(root.position.y+foot)});
 }
 window.REDLINE_P1_IRONWALL={foundations:foundationDiagnostics};
 const deck=new THREE.Group();deck.position.y=deckY;bridge.add(deck);
 staticColliders.push(addBox(deck,span,2.4,20,0,0,0,steel));
 addBox(deck,span,0.8,14,0,1.6,0,edge);
 addBox(deck,span,1.0,1.4,0,-2.1,-8.7,steel);
 addBox(deck,span,1.0,1.4,0,-2.1,8.7,steel);
 for(let j=0;j<=12;j++){
  const x=-span/2+j*(span/12);
  addBox(deck,1.0,15,1.0,x,4,sideZ,steel);
  addBox(deck,1.0,15,1.0,x,4,-sideZ,steel);
  if(j<12){
   const dx=x+span/24;
   const a=addBox(deck,1.0,18,.8,dx,4,sideZ,steel);a.rotation.z=j%2?.63:-.63;
   const b=addBox(deck,1.0,18,.8,dx,4,-sideZ,steel);b.rotation.z=j%2?-.63:.63;
  }
 }
 addBox(deck,span,1.2,1.0,0,11.5,sideZ,steel);
 addBox(deck,span,1.2,1.0,0,11.5,-sideZ,steel);
 for(let j=0;j<=6;j++){
  const x=-span/2+j*(span/6);
  addBox(deck,1.2,1.2,21,x,11.5,0,steel);
  if(j<6){const brace=addBox(deck,1.0,1.0,23,x+span/12,11.5,0,steel);brace.rotation.x=j%2?.58:-.58}
 }
 const buildArch=(side)=>{
  // Deck arch rises towards the center, with load-bearing vertical spandrels from arch to deck.
  const pts=[new THREE.Vector3(-span/2,-33,side*8.2),new THREE.Vector3(-span/4,-15.5,side*8.2),new THREE.Vector3(0,-8,side*8.2),new THREE.Vector3(span/4,-15.5,side*8.2),new THREE.Vector3(span/2,-33,side*8.2)];
  const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal');
  const rib=new THREE.Mesh(new THREE.TubeGeometry(curve,44,1.25,10,false),archMat);rib.castShadow=true;rib.receiveShadow=true;deck.add(rib);staticColliders.push(rib);
  const deckBearing=-2.2;
  for(let j=0;j<=12;j++){
   const u=j/12,pt=curve.getPoint(u),h=deckBearing-pt.y;if(h<=1)continue;
   addBox(deck,.96,h,.96,pt.x,pt.y+h*.5,side*8.2,edge);
   if(j<12){const q=curve.getPoint((j+1)/12),mid=pt.clone().add(q).multiplyScalar(.5);
    const height=deckBearing-mid.y;
    // Triangulated spandrels prevent every panel from looking like disconnected sticks.
    const diag=addBox(deck,1.0,Math.hypot(q.x-pt.x,height),.72,mid.x,mid.y+height*.48,side*8.2,steel);
    diag.rotation.z=(j%2?-1:1)*Math.atan2(Math.abs(q.x-pt.x),Math.max(1,height));
   }
  }
 };
 buildArch(1);buildArch(-1);
 // Riveted panel joints are instanced: many visible details without hundreds of draw calls.
 const rivetGeo=new THREE.CylinderGeometry(.27,.27,.18,7);rivetGeo.rotateX(Math.PI/2);
 const rivets=new THREE.InstancedMesh(rivetGeo,edge,112),bolt=new THREE.Object3D();let rivetCount=0;
 for(const side of[-1,1])for(let j=0;j<=12;j++)for(const yy of[1.5,11.3])for(const offset of[-1.3,1.3]){
  const x=-span/2+j*(span/12)+offset;bolt.position.set(x,deckY+yy,side*(sideZ+.5));bolt.rotation.set(0,0,0);bolt.updateMatrix();rivets.setMatrixAt(rivetCount++,bolt.matrix);
 }
 rivets.count=rivetCount;rivets.instanceMatrix.needsUpdate=true;bridge.add(rivets);
 // Suspended guide frame from the deck to the moving hazard, inspired by a canyon arch bridge service gantry.
 for(const x of[-27,-15,15,27]){addBox(root,1.4,26,1.4,x,44,0,steel)}
 const gate=new THREE.Group();gate.position.set(0,31,0);root.add(gate);
 addBox(gate,60,3.2,5.6,0,0,0,steel);
 addBox(gate,54,1.1,6.4,0,6.7,0,edge);addBox(gate,54,1.1,6.4,0,-6.7,0,edge);
 addBox(gate,2.0,14.5,4.8,-29,0,0,steel);addBox(gate,2.0,14.5,4.8,29,0,0,steel);
 for(let j=0;j<=10;j++){
  const x=-26+j*5.2;addBox(gate,.8,12.2,2.2,x,0,0,edge);
  if(j<10){const d=addBox(gate,.85,15.0,1.3,x+2.6,0,0,steel);d.rotation.z=j%2?.62:-.62}
 }
 for(const y of[-2.9,-.9,1.1,3.1]){const filament=addBox(gate,51,.34,1.2,0,y,2.45,glow);filament.castShadow=false;bars.push(filament)}
 const membrane=addBox(gate,53.5,10.8,.15,0,0,1.08,glass);membrane.castShadow=false;membrane.receiveShadow=false;
 const catwalk=addBox(root,70,1.1,8,0,48,0,edge);catwalk.castShadow=true;
 for(const x of[-31,-20,-9,9,20,31])addBox(root,1.0,3.0,7.0,x,50,0,steel);
 const warningRing=new THREE.Mesh(new THREE.TorusGeometry(31,1.2,8,48),new THREE.MeshBasicMaterial({color:0xffa546,transparent:true,opacity:.23,depthWrite:false,side:THREE.DoubleSide}));warningRing.rotation.y=Math.PI/2;warningRing.position.set(0,30,8);root.add(warningRing);
 const beacon=clashBeaconMesh(0x43d9e9);beacon.position.set(-33,27,14);root.add(beacon);
 const leftBeacon=clashBeaconMesh(0xff9733);leftBeacon.scale.setScalar(.54);leftBeacon.position.set(33,27,14);root.add(leftBeacon);
 // Collision is registered only for physically substantial, static members. The moving shutter
 // uses the existing event collision code and must not leave a stale static collider behind.
 root.updateMatrixWorld(true);
 const colliderOwner={alive:CLASH.gameMode==='clash'};
 for(const part of staticColliders)CLIFF_COLLIDER.addGeometry(part.geometry,part.matrixWorld,colliderOwner);
 const point=beacon.getWorldPosition(new THREE.Vector3());
 return {kind:'ironwall',name:'IRONWALL NAVAJO ARCH',root,beacon,secondBeacon:leftBeacon,gate,membrane,warningRing,colliderOwner,position:point,state:'idle',timer:0,cooldown:0,phase:0};
}
function clashSpawnPickup(t,alt=0){
 const p=clashPathAt(t),idx=Math.floor(t*N),lateral=FW[idx]*(hash(t*100,22)>.5?-.25:.25);
 p.x+=-TZ[idx]*lateral;p.z+=TX[idx]*lateral;p.y=Math.max(p.y+alt,gh(p.x,p.z)+20);
 const g=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:0x73fdd9,emissive:0x42bfb2,emissiveIntensity:2.0,roughness:.27,metalness:.5});
 const ring=new THREE.Mesh(new THREE.TorusGeometry(12,.9,7,32),mat);g.add(ring);
 const shard=new THREE.Mesh(new THREE.OctahedronGeometry(4,0),mat);g.add(shard);g.position.copy(p);S.add(g);
 return {mesh:g,ring,shard,t,alt,delay:0,value:12};
}

// REDLINE v12 — TWO optional SKYLINE VELOCITY GATES. Never seal a mandatory route.
// Rotating half-arm is readable before entry; skilled traversal earns Flow and boost.
function clashMakeSkylineGate(t,side){
 const i=Math.floor(t*N),p=clashPathAt(t),across=FW[i]*.28*side;
 p.x+=-TZ[i]*across;p.z+=TX[i]*across;
 p.y=Math.max(p.y+19,gh(p.x,p.z)+29);
 const root=new THREE.Group();root.position.copy(p);
 root.rotation.y=Math.atan2(-TX[i],-TZ[i]);S.add(root);
 const stone=new THREE.MeshStandardMaterial({color:0x69767a,metalness:.56,roughness:.38,emissive:0x17343a,emissiveIntensity:.23});
 const trim=new THREE.MeshStandardMaterial({color:0x84cfce,emissive:0x2c756d,emissiveIntensity:.65,metalness:.47,roughness:.3});
 const bladeMat=new THREE.MeshStandardMaterial({color:0x9e714b,emissive:0x834126,emissiveIntensity:.32,metalness:.45,roughness:.43});
 const ring=new THREE.Mesh(new THREE.TorusGeometry(22,1.30,8,36),stone);root.add(ring);
 const inset=new THREE.Mesh(new THREE.TorusGeometry(18.3,.45,6,36),trim);root.add(inset);
 const pivot=new THREE.Group();root.add(pivot);
 const blade=new THREE.Mesh(new THREE.BoxGeometry(18,1.4,1.8),bladeMat);blade.position.x=-9;pivot.add(blade);
 // Small upper/lower markers guide aim but don't block the track.
 for(const a of[-1,1]){const marker=new THREE.Mesh(new THREE.OctahedronGeometry(2.0,0),trim);
  marker.position.set(a*20,0,0);root.add(marker)}
 root.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false}});
 return {root,pivot,ring,inset,blade,t,side,angle:0,lastRewardLap:-1,hitUntil:0,position:p,wasNear:false};
}
function clashUpdateSkyline(dt,run,oldP){
 // Skyline hoops and rejected suspended arch both removed. No ghost collision,
 // wind bonus or phantom timing reward in the repaired Crosswind corridor.
}

function clashInstallLivery(){
 const mat=new THREE.MeshBasicMaterial({color:0xff763b,transparent:true,opacity:.84,blending:THREE.AdditiveBlending,depthWrite:false});
 CLASH.liveryMaterial=mat;const rr=[];
 const liveryRoot=new THREE.Group();liveryRoot.name='Kestrel_Only_RaceLivery';
 CLASH.liveryRoot=liveryRoot;dr.add(liveryRoot);
 for(const x of[-2.9,2.9]){
  const strip=new THREE.Mesh(new THREE.BoxGeometry(.20,.07,3.3),mat);strip.position.set(x,.9,.45);liveryRoot.add(strip);rr.push(strip);
 }
 const shield=new THREE.Mesh(new THREE.SphereGeometry(11,22,14),new THREE.MeshBasicMaterial({color:0x5ce7ff,transparent:true,opacity:.18,wireframe:true,depthWrite:false,blending:THREE.AdditiveBlending}));shield.visible=false;S.add(shield);CLASH.shieldFx=shield;
 const wave=new THREE.Mesh(new THREE.SphereGeometry(1,18,12),new THREE.MeshBasicMaterial({color:0x7ef8ef,wireframe:true,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));wave.visible=false;S.add(wave);CLASH.wave=wave;
}
function clashCycleLivery(){
 CLASH.liveryIndex=(CLASH.liveryIndex+1)%4;
 const opts=[['SCARLET',0xff763b],['GLACIER',0x70dbff],['EMBER',0xffd081],['VIOLET',0xc69cf9]];
 const name=opts[CLASH.liveryIndex][0];if(CLASH.liveryMaterial)CLASH.liveryMaterial.color.setHex(opts[CLASH.liveryIndex][1]);
 try{localStorage.setItem('redline_clash_livery',String(CLASH.liveryIndex))}catch(e){}
 clashSpeak('KESTREL LIVERY  //  '+name,1100);
}
function initClash(){
 if(CLASH.initialized)return;CLASH.initialized=true;
 CLASH.bots.push(clashCreateRival(0x59f5ed,'SPECTRE',-.022,42.0,0));
 CLASH.bots.push(clashCreateRival(0xffab4e,'APEX',-.040,44.6,1));
 CLASH.bots.push(clashCreateRival(0xd889ff,'VIPER',-.065,47.3,2));
 for(const b of CLASH.bots)b.paceNorm=clashBotPaceNorm(b.index);
 CLASH.events.push(clashMakeRouteEvent(),clashMakeRockfallEvent());
 // v17.9: Remove BOTH optional Skyline Velocity Gates. Their floating steel
 // hoops/rotating bars were confusing and are not required checkpoints.
 CLASH.skyline.length=0;
 for(const t of[.12,.26,.44,.58,.73,.93])CLASH.pickups.push(clashSpawnPickup(t,t>.75?16:0));
 clashInstallLivery();
 try{
  CLASH.liveryIndex=Math.max(0,Math.min(3,Number(localStorage.getItem('redline_clash_livery'))||0));
  CLASH.wins=Math.max(0,Number(localStorage.getItem('redline_clash_wins'))||0);
  CLASH.liveryMaterial.color.setHex([0xff763b,0x70dbff,0xffd081,0xc69cf9][CLASH.liveryIndex]);
 }catch(e){}
}
function resetClash(){
 if(window.REDLINE_BOT_COMBAT_STATUS)Object.assign(window.REDLINE_BOT_COMBAT_STATUS,{shots:0,playerShots:0,hits:0,blocked:0,evaded:0,shielded:0,lastResult:'none'});
 CLASH.flow=40;CLASH.displaced=false;CLASH.combo=1;CLASH.comboUntil=0;CLASH.closeAward=0;CLASH.lowAward=0;CLASH.gateAwards=0;CLASH.shieldT=0;CLASH.pulseT=0;CLASH.finished=false;CLASH.afterImpact=0;CLASH.lastPlace=1;
 CLASH.bots.forEach((b,i)=>{b.progress=0;b.stunT=0;b.shieldT=0;b.fireT=3.4+i*1.1+Math.random()*1.3;b.telegraphT=0;b.empCooldown=9+i*2.5+Math.random()*2.5;b.empWindup=0;b.empT=0;b.shieldCooldown=4.5+i*1.8+Math.random()*1.2;b.damageT=0;
 b.evasionTime=0;b.evasionCooldown=2+i;b.evasionSide=i%2?-1:1;b.targetBot=null;b.sprintFinishSec=null;b.lapClock=0;b.lastLapSeconds=0;b.completedLaps=0;b.lapTimes=[];b.velocity=0;b.speed=0;clashBotNewLapGoal(b,true);const grid=redlineGridPosition(i+1,Math.max(1,redlineUI.config.bots+1));b.lane=grid.lane;b.desiredLane=b.lane;
 b.empRing.visible=false;b.shield.visible=false;b.damageFx.visible=false;b.sight.visible=false;b.flow=40;b.ammo=2;b.energy=1;b.boosting=false;b.boostLocked=false;b.boostPlanActive=false;b.boostSeconds=0;b.blockedSeconds=0;b.movementSeconds=0;b.movementDistance=0;b.respawnT=0;b.lastFlowGate=-1;if(b.debris)b.debris.clear();
 const t=0,ii=0,spawn=new THREE.Vector3(grid.x,grid.y,grid.z);
  if(window.REDLINE_GRID_QA)window.REDLINE_GRID_QA.opponents.push({slot:i+1,position:[grid.x,grid.y,grid.z]});
 b.mesh.position.copy(spawn);b.mesh.rotation.y=Math.atan2(-TX[ii],-TZ[ii]);
 b.velocity=0;b.stuckT=0;b.speed=0;b.measuredPlayerSpeed=0; // shared start acceleration; no AI head start
 b.passAward=-1;b.lastRelative=null;b.passLap=-1;b.sight.visible=false;b.burstT=0;REDLINE_RIVAL_DIRECTOR.reset(b);
  if(b.redShots)for(const fx of b.redShots){fx.a.visible=false;fx.b.visible=false;}b.mesh.visible=CLASH.gameMode==='clash'&&b.index<redlineUI.config.bots});
 CLASH.events.forEach(ev=>{ev.root.visible=CLASH.gameMode==='clash';if(ev.colliderOwner)ev.colliderOwner.alive=CLASH.gameMode==='clash';ev.state=ev.kind==='ravine'?'closed':'idle';ev.timer=0;ev.open=0;ev.cooldown=0;ev.warning=0;ev.phase=0});
 CLASH.pickups.forEach(o=>{o.delay=0;o.mesh.visible=CLASH.gameMode==='clash'});
 CLASH.skyline.forEach(g=>{g.lastRewardLap=-1;g.hitUntil=0;g.root.visible=CLASH.gameMode==='clash'});
 clashEventEl.style.opacity=0;clashImpactEl.style.opacity=0;clashTVEl.className='';clashDamageVignette.style.opacity='0';
 CLASH.tvUntil=0;CLASH.damageFlashUntil=0;
}
// Ray origin is the physical moving muzzle; environmental target must be before rock hit.
function clashWeaponHit(origin,direction,worldHit,index,guidedRival=null){
 let hit=worldHit,dist=hit?.distance??LASER_DISTANCE;
 const ray=new THREE.Ray(origin,direction),sphere=new THREE.Sphere(),point=new THREE.Vector3();
 for(const e of CLASH.events){
  if(CLASH.gameMode!=='clash'||e.cooldown>0)continue;
  e.beacon.getWorldPosition(sphere.center);sphere.radius=11;
  if(ray.intersectSphere(sphere,point)){
   const d=origin.distanceTo(point);if(d>1&&d<dist){hit={distance:d,point:point.clone(),kind:'clashTarget',event:e};dist=d}
  }
 }
 for(const b of CLASH.bots){
  if(CLASH.gameMode!=='clash'||!b.mesh.visible||b.respawnT>0)continue;
  sphere.center.copy(b.mesh.position);sphere.radius=8.4;
  if(ray.intersectSphere(sphere,point)){
   const d=origin.distanceTo(point);if(d>1&&d<dist){hit={distance:d,point:point.clone(),kind:b.shieldT>0?'clashShield':'clashRival',rival:b};dist=d}
  }
 }
 // A completed lock directs the real muzzle to the rival's current position.
 // Environmental ray hits have priority, so guided rounds never pass through rock.
 if(guidedRival&&guidedRival.mesh.visible&&guidedRival.respawnT<=0){
  const guidedPoint=guidedRival.mesh.position.clone();
  const targetDistance=origin.distanceTo(guidedPoint);
  const environmentalBlock=worldHit&&worldHit.distance<targetDistance-10;
  if(!environmentalBlock&&targetDistance<LASER_DISTANCE&&targetDistance>1){
   hit={distance:targetDistance,point:guidedPoint,kind:guidedRival.shieldT>0?'clashShield':'clashRival',rival:guidedRival};
  }
 }
 if(hit?.kind==='clashTarget'){
  const e=hit.event;
  if(e.cooldown<=0){
   if(!clashSpend(25)){clashSpeak('NEED 25 FLOW FOR CANYON SWITCH',1000);e.cooldown=.5}
   else if(e.kind==='ravine'){e.state='opening';e.timer=1.35;e.cooldown=17;clashSpeak('EMBER GATE OPENING  //  SHORTCUT ACTIVE',1800);clashGain(8,null,false)}
   else{e.state='warning';e.timer=1.55;e.cooldown=14;clashSpeak('IRONWALL ARCH  ·  1.5s WARNING',1700);clashGain(8,null,false)}
   clashHitMark();
  }
 }else if(hit?.kind==='clashShield'){
  const b=hit.rival;clashBotSparks(b,0x78e8ff);clashSpeak(b.label+' SHIELD ABSORBED LASER',850);clashHitMark();
 }else if(hit?.kind==='clashRival'){
  const b=hit.rival;b.stunT=Math.max(b.stunT,1.65);b.hitCount++;b.respawnT=REDLINE_DESTRUCTION.DEBRIS_TIME+.18;b.velocity=0;b.speed=0;
  if(!b.debris)b.debris=REDLINE_DESTRUCTION.create(THREE,S);b.debris.explode(b.mesh.position,new THREE.Vector3());b.mesh.visible=false;
  clashBotSparks(b);clashGain(7,'RIVAL TAG',false);clashSpeak(b.label+' HIT  //  SHIELDS DOWN',1100);clashTV('DIRECT HIT',b.label+' // PROPULSION INTERRUPTED','success',850);clashHitMark();
 }
 return REDLINE_ONLINE.isRacing?REDLINE_ONLINE.hitRay(origin,direction,hit):hit;
}
function clashStep(dt,run,oldP){
 if(!CLASH.initialized)return;
 CLASH.frameHud+=dt;
 if(CLASH.eventClock<time)clashEventEl.style.opacity=0;
 if(CLASH.lastHit<time)clashImpactEl.style.opacity=0;
 if((CLASH.tvUntil||0)<time)clashTVEl.className='';
 if((CLASH.damageFlashUntil||0)<time)clashDamageVignette.style.opacity='0';
 CLASH.shieldT=Math.max(0,CLASH.shieldT-dt);CLASH.pulseT=Math.max(0,CLASH.pulseT-dt);
 if(CLASH.shieldFx){CLASH.shieldFx.visible=run&&CLASH.shieldT>0;CLASH.shieldFx.position.copy(st.p);CLASH.shieldFx.rotation.y+=dt*.9}
 if(CLASH.wave){CLASH.wave.visible=run&&CLASH.pulseT>0;if(CLASH.wave.visible){let t=1-CLASH.pulseT/.58;CLASH.wave.position.copy(st.p);CLASH.wave.scale.setScalar(4+210*t);CLASH.wave.material.opacity=.38*(1-t)}}
 for(const e of CLASH.events){
  e.root.visible=CLASH.gameMode==='clash';
  if(e.colliderOwner)e.colliderOwner.alive=CLASH.gameMode==='clash';
  if(CLASH.gameMode!=='clash')continue;
  e.cooldown=Math.max(0,e.cooldown-dt);e.beacon.userData.core.rotation.y+=dt*1.25;e.beacon.userData.core.rotation.z+=dt*.64;e.beacon.userData.ring.rotation.y+=dt*.9;
  if(e.kind==='ravine'){
   if(e.state==='opening'){e.open=Math.min(1,e.open+dt/1.35);if(e.open>=1){e.state='open';e.timer=12}}
   else if(e.state==='open'){e.timer-=dt;if(e.timer<=0){e.state='closing';clashSpeak('EMBER GATE CLOSING  //  TAKE MAIN ROUTE',1200)}}
   else if(e.state==='closing'){e.open=Math.max(0,e.open-dt/2.6);if(e.open<=0)e.state='closed'}
   for(const s of e.slabs){
    s.slab.position.x=s.side*(11+e.open*25);
    s.slab.rotation.y=s.side*e.open*.22;
    // A moving rock leaf stays buried in the bank as it slides open.
    let floor=Infinity;
    for(let q=0;q<16;q++){
     const a=q*Math.PI/8;
     const sample=e.root.localToWorld(new THREE.Vector3(s.slab.position.x+14.5*Math.cos(a),0,10*Math.sin(a)));
     floor=Math.min(floor,gh(sample.x,sample.z));
    }
    s.slab.position.y=floor-e.root.position.y-9-s.bottom;
   }
   e.echo.material.opacity=(1-e.open)*(.18+.20*Math.sin(time*3));e.echo.rotation.z+=dt*.15;
   if(run&&clashEmberContact(e,st.p,7.5)){
    st.p.copy(oldP);CLASH.displaced=true;FL.vx*=-.13;FL.vz*=-.13;FL.speed=Math.min(FL.speed,15);hitFx();clashSpeak('EMBER ROCK GATE CONTACT  ·  SHOOT SWITCH',1000);clashTV('ROUTE BLOCKED','FIRE AT AMBER SWITCH TO OPEN','warning',900);
   }
  }else{
   if(e.state==='warning'){e.timer-=dt;e.warning=1.55-e.timer;if(e.timer<=0){e.state='active';e.timer=4.9;clashSpeak('IRONWALL MOVING  //  CLIMB OR DIVE',1100)}}
   else if(e.state==='active'){e.timer-=dt;if(e.timer<=0){e.state='return';e.timer=1.4}}
   else if(e.state==='return'){e.timer-=dt;if(e.timer<=0)e.state='idle'}
   const active=e.state==='active',height=active?(17+12*Math.sin(time*2.2)):31;
   e.gate.position.y+=(height-e.gate.position.y)*Math.min(1,dt*8);
   e.warningRing.material.opacity=e.state==='warning'?.82:(active?.43:.14);if(e.membrane)e.membrane.material.opacity=active?.32:(e.state==='warning'?.13:.06);
   e.warningRing.rotation.z+=dt*.28;
   if(run&&active){const local=e.root.worldToLocal(st.p.clone());if(Math.abs(local.z)<11&&Math.abs(local.x)<24&&Math.abs(local.y-e.gate.position.y)<10){st.p.copy(oldP);CLASH.displaced=true;FL.vx*=.35;FL.vz*=.35;hitFx();clashSpeak('SHUTTER CONTACT  ·  ALTITUDE MATTERS',850);clashTV('IRONWALL CONTACT','CLIMB ABOVE TRUSS OR DIVE BELOW','danger',1000)}}
  }
 }
 if(!run){if(CLASH.frameHud>.22){clashHUD();CLASH.frameHud=0}return}
 clashUpdateSkyline(dt,run,oldP);
 const impact=st.ic>0; if(impact&&CLASH.afterImpact<=0){CLASH.combo=1;CLASH.comboUntil=0;CLASH.afterImpact=.9}CLASH.afterImpact=Math.max(0,CLASH.afterImpact-dt);
 if(CLASH.comboUntil&&time>CLASH.comboUntil){CLASH.combo=1;CLASH.comboUntil=0}
 const idx=near(st.p.x,st.p.z),dx=st.p.x-PX[idx],dz=st.p.z-PZ[idx],dist=Math.abs(-TZ[idx]*dx+TX[idx]*dz),speed=Math.abs(st.spd),height=st.p.y;
 if(speed>96&&st.ic<=0&&time>CLASH.closeAward&&dist>FW[idx]*.53&&dist<FW[idx]*.84&&height>gh(st.p.x,st.p.z)+14&&height<gh(st.p.x,st.p.z)+160){CLASH.closeAward=time+2.6;clashGain(2*CLASH.combo,'CLIFF SKIM',false)}
 if(speed>120&&height>WATER_HEIGHT+5&&height<WATER_HEIGHT+23&&dist<FW[idx]*.5&&time>CLASH.lowAward){CLASH.lowAward=time+3.5;clashGain(3*CLASH.combo,'RIVER RUN',false)}
 for(const pick of CLASH.pickups){
  if(CLASH.gameMode!=='clash'){pick.mesh.visible=false;continue;}
  if(pick.delay>0){pick.delay-=dt;if(pick.delay<=0)pick.mesh.visible=true}
  if(pick.mesh.visible){pick.mesh.rotation.y+=dt*.7;pick.ring.rotation.z=Math.sin(time*1.4+pick.t*20)*.2;pick.shard.rotation.x+=dt*.9;
   if(pick.mesh.position.distanceTo(st.p)<13){pick.delay=26;pick.mesh.visible=false;clashGain(pick.value,'FLOW LINE');}}
 }
 for(const b of CLASH.bots){
  if(CLASH.gameMode!=='clash'||b.index>=redlineUI.config.bots||window.REDLINE_GUIDE?.active){b.mesh.visible=false;b.sight.visible=false;b.shield.visible=false;b.damageFx.visible=false;b.empRing.visible=false;continue;}
  if(b.respawnT>0){b.respawnT=Math.max(0,b.respawnT-dt);b.mesh.visible=b.respawnT===0;if(b.redShots)for(const fx of b.redShots){fx.a.visible=false;fx.b.visible=false;}if(b.debris)b.debris.update(dt);if(b.respawnT===0){b.velocity=23;b.speed=23;b.stunT=1.3;b.fireT=2.3;}continue;}
  b.mesh.visible=true;
  b.stunT=Math.max(0,b.stunT-dt);b.shieldT=Math.max(0,b.shieldT-dt);
  b.shieldCooldown=Math.max(0,b.shieldCooldown-dt);b.empCooldown=Math.max(0,b.empCooldown-dt);
  b.damageT=Math.max(0,b.damageT-dt);b.empT=Math.max(0,b.empT-dt);
  b.shield.visible=b.shieldT>0;b.shield.position.copy(b.mesh.position);b.shield.rotation.y+=dt*.8;
  b.damageFx.visible=b.damageT>0;if(b.damageFx.visible){b.damageFx.position.copy(b.mesh.position);b.damageFx.scale.setScalar(1+(0.55-b.damageT)*1.5);b.damageFx.material.opacity=cl(b.damageT/.55,0,.65)}
  b.empRing.visible=b.empT>0;if(b.empRing.visible){const phase=1-b.empT/.58;b.empRing.position.copy(b.mesh.position);b.empRing.scale.setScalar(9+phase*146);b.empRing.material.opacity=(1-phase)*.7}
  // A calibrated lap rate, not teleportation or artificial rubber-banding.
  // Speed changes with local curvature; its inverse-speed integral is normalized to the target lap.
  if(sprintMode()&&Number.isFinite(b.sprintFinishSec)){b.velocity=0;b.speed=0;continue;}
  const oldProgress=b.progress,cruise=clashBotFactor((b.progress%1+1)%1,b.index);
  const stunned=b.stunT>0?.68:1;
  const raceMode=redlineUI.config.handlingMode||'easy';
  const bendFactor=Math.max(0,Math.min(1,(cruise-.90)/.22));
  const playerProgressLocal=((lap-1)+near(st.p.x,st.p.z)/N);
  const urgent=(b.progress<playerProgressLocal-.004)?1:.64;
  const gap=playerProgressLocal-b.progress;
  const rhythm=REDLINE_RIVAL_DIRECTOR.step(b,dt,{gap,straight:Math.max(bendFactor,.44)});
  REDLINE_AI.stepEnergy(b,dt,rhythm.boost);
  if(b.boosting)b.boostSeconds+=dt;
  const cruiseCap=REDLINE_AI.cruise(raceMode,P.t),boostCap=REDLINE_AI.boostExtra(raceMode);
  const pilotEnvelope=REDLINE_AIRFRAMES.stats(redlineActiveAirframe(),raceMode,P.t,P.a);
  const pilotTop=Math.max(pilotEnvelope.boostSpeed,cruiseCap+boostCap);
  // Sustained medium / fast are both competitive. Boost briefly exceeds a
  // fully boosted human; progress is earned by the physical swept movement.
  const rivalCruise=Math.max(cruiseCap*1.05,pilotTop*(.92+.065*b.index));
  const rivalBoost=Math.max(boostCap*1.25,pilotTop*rhythm.boostMultiplier-rivalCruise);
  const allowed=rivalCruise+(b.boosting?rivalBoost:0);
  const localCourseFactor=clashBotFactor((b.progress%1+1)%1,b.index);
  const previewIndex=(Math.floor(((b.progress%1+1)%1)*N)+8)%N;
  const previewAhead=(previewIndex+10)%N;
  const headingDot=cl(TX[previewIndex]*TX[previewAhead]+TZ[previewIndex]*TZ[previewAhead],-1,1);
  const curvature=Math.acos(headingDot),cornerPace=1-Math.min(.10,curvature*.15);
  b.measuredPlayerSpeed=REDLINE_AI.smoothSpeed(b.measuredPlayerSpeed,Math.abs(FL.speed||st.spd),dt,2.9);
  const competitive=REDLINE_AI.competitiveTarget({
   base:rivalCruise*localCourseFactor,player:b.measuredPlayerSpeed,
   playerProgress:playerProgressLocal,botProgress:b.progress,index:b.index,
   cruiseCap:rivalCruise,boostCap:rivalBoost,boosting:b.boosting
  });
  const fastFloor=rivalCruise*(rhythm.mode==='fast'?.96:.89);
  const desiredSpeed=Math.min(allowed,Math.max(fastFloor,competitive*rhythm.speedFactor))
   *cornerPace*(b.stunT>0?.68:1);
  b.targetSpeed=desiredSpeed;
  const accel=(raceMode==='easy'?220:raceMode==='sport'?255:285)*dt;
  b.velocity+=cl(desiredSpeed-b.velocity,-accel*1.5,accel);
  // Earn Flow from real course progress only, never from wall-clock time.
  const flownGate=Math.floor(Math.max(0,b.progress)*12);
  if(flownGate>b.lastFlowGate){REDLINE_AI.gainFlow(b,Math.min(10,Math.max(0,(flownGate-b.lastFlowGate)*10)));b.lastFlowGate=flownGate;}
  if(b.energy<.24&&b.flow>=25&&b.progress>0){REDLINE_AI.spendFlow(b,25);b.energy=Math.min(1,b.energy+.52);}
  // Race-start acceleration is earned; no invisible instantaneous speed assignment.
  // Speed-dependent pure-pursuit horizon keeps the aircraft advancing through
  // sharp turns even when a wide lateral line crosses the nearest path segment.
  const futureProgress=b.progress+Math.max(14,Math.min(26,b.velocity*.10))/trackDistance;
  const t=((futureProgress%1)+1)%1,i=Math.floor(t*N),ahead=Math.min(.021,Math.max(.006,b.velocity*.30/trackDistance));
  // Adaptive lookahead: heading uses a future point; position tracks the racing line with a tactical lateral offset.
  const aheadP=clashPathAt(t+ahead),p=clashPathAt(t);
  const nearPlayer=b.mesh.position.distanceTo(st.p)<150;
  let avoid=0;
  for(const other of CLASH.bots){if(other===b||other.index>=redlineUI.config.bots)continue;
   const delta=other.progress-b.progress;
   if(delta>0&&delta<.023&&Math.abs(other.lane-b.lane)<21)avoid+=(b.index%2===0?-20:20);
  }
  if(nearPlayer&&st.p.distanceTo(p)<32&&st.spd>75)avoid+=(b.index%2===0?-15:15);
  const tangentAhead=(i+8)%N;
  const bendSign=Math.sign(TX[tangentAhead]*TZ[i]-TZ[tangentAhead]*TX[i])||1;
  const lineChoice=-bendSign*b.lineStyle*FW[i]*.13;
  const windows=[[.045,.165],[.205,.33],[.37,.50],[.53,.67],[.68,.81],[.83,.97]];
  let choiceShift=0;
  for(let j=0;j<windows.length;j++)choiceShift+=(b.routeChoices?.[j]||0)*clashBotRouteWindow(t,...windows[j])*FW[i]*.18;
  // Apex-first line: set up outside the bend, cut across its center through
  // the corner, and let the existing damped steering smoothly unwind on exit.
  const sweep=Math.sin(t*Math.PI*10+b.lanePhase)*b.laneAmp*.55;
  const cornerAmount=cl(Math.abs(TX[tangentAhead]*TZ[i]-TZ[tangentAhead]*TX[i])*3.0,0,1);
  const apexOffset=cl(-bendSign*b.lineStyle*FW[i]*.075*cornerAmount,-FW[i]*.09,FW[i]*.09);
  // Timed, bounded evasive maneuvers—not jitter or instantaneous teleportation.
  b.evasionCooldown=Math.max(0,b.evasionCooldown-dt);
  b.evasionTime=Math.max(0,b.evasionTime-dt);
  const threatened=REDLINE_LOCK_STATE.id==='rival-'+b.index&&REDLINE_LOCK_STATE.elapsed>.83&&b.mesh.position.distanceTo(st.p)<400;
  if(threatened&&b.evasionTime===0&&b.evasionCooldown===0){
   b.evasionTime=1.25;b.evasionCooldown=5.6+b.index*.6;
   b.evasionSide*=-1;
  }
  const evasion=b.evasionTime>0?b.evasionSide*9*Math.sin(Math.PI*b.evasionTime/1.25)**2:0;
  b.desiredLane=cl(b.baseLane+b.laneBias*.40+lineChoice+apexOffset+choiceShift+avoid+sweep*.70+evasion,-FW[i]*.34,FW[i]*.34);
  b.lane=REDLINE_AI.steerLaneOffset(b.lane,b.desiredLane,dt,2.4);
  p.x+=-TZ[i]*b.lane;p.z+=TX[i]*b.lane;
  // Routes are real, smooth 3D alternatives: river skim, rim traverse, and high/low Ironwall approach.
  const rim=clashBotRouteWindow(t,.52,.655);
  const iron=clashBotRouteWindow(t,.695,.80);
  const low=clashBotRouteWindow(t,.37,.50);
  p.y+=rim*(b.rimRoute==='high'?26:-11);
  p.y+=low*(b.index===0?-13:(b.index===2?18:5));
  p.y+=iron*(b.ironwallRoute==='high'?62:-29);
  p.y=Math.max(p.y+3.5*Math.sin(t*Math.PI*4+b.index+b.lanePhase*.25),gh(p.x,p.z)+23);
  // A sampled 3D route must be free BEFORE the bot moves. Recovery is physical
  // ascent/side-stepping, never an unseen teleport through the rock.
  const nav=clashBotSafeRoute(b,t,p,b.lane,dt);
  if(nav.clear&&nav.lane!==b.lane)b.lane+=(nav.lane-b.lane)*Math.min(1,dt*4);
  const step=clashBotPhysicalStep(b,dt,nav.point,8.5);
  if(!nav.clear)b.velocity*=Math.max(.6,1-dt*.8);
  if(sprintMode()&&b.progress>=GATES[3][0]&&!Number.isFinite(b.sprintFinishSec)){b.sprintFinishSec=raceT;b.velocity=0;}
  if(oldProgress<0&&b.progress>=0)b.lapClock=0;
  else if(oldProgress>=0&&b.completedLaps<3)b.lapClock+=dt;
  if(b.progress>=1&&Math.floor(b.progress)>Math.max(0,Math.floor(oldProgress))){
   b.lastLapSeconds=b.lapClock;b.lapTimes.push(b.lastLapSeconds);b.completedLaps=Math.floor(b.progress);b.lapClock=0;clashBotNewLapGoal(b,false);
   if(b.completedLaps===3)clashSpeak(b.label+' FINISHES  ·  '+fmt(b.lapTimes.reduce((a,c)=>a+c,0)),1900);
  }
  const direction=aheadP.clone().sub(b.mesh.position);direction.y=0;
  const desiredYaw=direction.lengthSq()>1?Math.atan2(-direction.x,-direction.z):Math.atan2(-TX[i],-TZ[i]);
  const yawError=Math.atan2(Math.sin(desiredYaw-b.mesh.rotation.y),Math.cos(desiredYaw-b.mesh.rotation.y));
  const turn=cl(Math.atan2(TX[(i+6)%N]*TZ[i]-TZ[(i+6)%N]*TX[i],TX[(i+6)%N]*TX[i]+TZ[(i+6)%N]*TZ[i]),-.65,.65);
  // Velocity-dependent predictive pursuit: lead the bend, turn gradually, and bank into it.
  b.mesh.rotation.y+=yawError*Math.min(1,dt*(5+b.speed/125));
  b.mesh.rotation.z+=(turn*.47-b.mesh.rotation.z)*Math.min(1,dt*9);
  b.mesh.rotation.x=cl((aheadP.y-p.y)*.004,-.16,.16);
  for(const rotor of b.rotors)rotor.rotation.x+=(clashBotFactor(t,b.index)-1)*dt*.4;
  const separation=b.mesh.position.distanceTo(st.p);
  if(separation<14&&st.ic<=0&&CLASH.shieldT<=0){
   const rebound=st.p.clone().sub(b.mesh.position);if(rebound.lengthSq()<.1)rebound.set(1,0,0);
   rebound.normalize();st.p.addScaledVector(rebound,14-separation+.3);CLASH.displaced=true;
   FL.vx*=.82;FL.vz*=.82;FL.speed*=.82;st.ic=.28;st.shake=Math.max(st.shake,.38);
   clashTV('RIVAL CONTACT',b.label+' // THRUST DISRUPTED','danger',880);
  }
  // Bots defend themselves and choose tactical moments for EMP, with enough warning to counter it.
  const opponentDist=separation;
  if(b.shieldCooldown<=0&&b.shieldT<=0&&(opponentDist<155||b.stunT>.2)&&REDLINE_AI.spendFlow(b,24)){
   b.shieldT=3.5;b.shieldCooldown=14+b.index*1.4;
  }
  if(b.empCooldown<=0&&b.empWindup<=0&&b.stunT<=0&&opponentDist<185&&REDLINE_AI.spendFlow(b,42)){
   b.empWindup=1.0;b.empCooldown=16+b.index*2.0;
   if(opponentDist<155)clashTV('EMP CHARGING',b.label+' // EVASIVE MANEUVER OR SHIELD','warning',1000);
  }
  if(b.empWindup>0){b.empWindup-=dt;if(b.empWindup<=0)clashBotEMP(b)}
  // Choose actual targets: prefer the player in view, otherwise fight a nearby rival.
  b.fireT-=dt;
  let nearest=null,nearestD=680;
  // Prefer engaging the human whenever visible in the combat envelope.
  if(!REDLINE_PLAYER_CRASH.active&&opponentDist<nearestD&&REDLINE_RIVAL_FIRE_ARC.canEngage(b,st.p)){
   nearest=st;nearestD=opponentDist;
  }
  for(const other of CLASH.bots){if(other===b||other.index>=redlineUI.config.bots||other.shieldT>0)continue;
   const d=other.mesh.position.distanceTo(b.mesh.position);
   if(d<nearestD && REDLINE_RIVAL_FIRE_ARC.canEngage(b,other.mesh.position) &&
    (!nearest || nearest!==st || opponentDist>560)){
    nearest=other;nearestD=d;
   }
  }
  if(b.ammo<=0&&b.fireT<=0){if(b.flow>=30)REDLINE_AI.spendFlow(b,30);b.ammo=2;b.fireT=.7+Math.random()*.3;}
  if(b.fireT<=0&&nearest&&b.stunT<=0&&b.empWindup<=0&&b.ammo>0){
   b.ammo--;b.fireT=1.10+Math.random()*.95+b.index*.10;b.telegraphT=.44+Math.random()*.22;b.targetBot=nearest===st?null:nearest;
   const target=nearest===st?st.p:nearest.mesh.position;
   b.lockPoint.copy(target);
   if(nearest===st){
    // Predict once at lock acquisition, then freeze point so evasive movement can beat the shot.
    b.lockPoint.x+=cl(FL.vx*.16,-42,42);b.lockPoint.z+=cl(FL.vz*.16,-42,42);
     b.lockVelocity=new THREE.Vector3(FL.vx||0,FL.vy||0,FL.vz||0);
    clashTV('INCOMING LASER',b.label+' // TARGET LOCK · DODGE OR J SHIELD','warning',1050);
   }
  }
  if(b.telegraphT>0){
   const lockedTarget=b.targetBot?b.targetBot.mesh.position:st.p;
   if(!REDLINE_RIVAL_FIRE_ARC.canEngage(b,lockedTarget)){
    b.telegraphT=0;b.targetBot=null;b.burstT=0;
    b.ammo=Math.min(2,b.ammo+1);
    b.fireT=Math.max(b.fireT,.28);
    const diag=window.REDLINE_BOT_COMBAT_STATUS;
    diag.outsideArc++;diag.cancelledLocks++;diag.lastResult='target-left-forward-arc';
   }
  }
  if(b.telegraphT>0){
   b.telegraphT-=dt;
   if(b.telegraphT<=0){
     b.burstT=.32;
     b.mesh.updateMatrixWorld(true);
     const from=b.mesh.localToWorld(new THREE.Vector3(0,.7,-2.9));
     const playerShot=!b.targetBot;
     const target=b.targetBot;
     const playerCenter=st.p.clone().add(new THREE.Vector3(0,.7,0));
     const current=playerShot?playerCenter:target.mesh.position.clone();
     const velocity=playerShot?new THREE.Vector3(FL.vx||0,FL.vy||0,FL.vz||0):new THREE.Vector3();
     const prediction=REDLINE_RIVAL_HITSCAN.predict(from,current,velocity);
     const end=prediction.point.clone();
     if(playerShot){
      // A real evasive change after the warning degrades accuracy; flying
      // straight at full boost no longer makes the pilot magically immune.
      const change=velocity.clone().sub(b.lockVelocity||velocity).length();
      const evasion=Math.min(38,change*.092);
      const spread=REDLINE_RIVAL_FIRE_ARC.spread(b.index,time);
      const travel=end.clone().sub(from);travel.y=0;
      if(travel.lengthSq()<.01)travel.set(0,0,-1);
      travel.normalize();
      const lateral=new THREE.Vector3(-travel.z,0,travel.x);
      end.addScaledVector(lateral,spread.lateral
        +Math.sin(time*3.7+b.index)*evasion);
      end.y+=spread.vertical;
     }
     // Clamp a stray jittered point back toward the nose so that even the
     // drawn bolts cannot appear to fire backward or sideways outside the arc.
     if(!REDLINE_RIVAL_FIRE_ARC.canFire(b.mesh.rotation.y,from,end)){
      end.copy(prediction.point);
      if(!REDLINE_RIVAL_FIRE_ARC.canFire(b.mesh.rotation.y,from,end)){
       // An extremely close target may be in front of the hull but behind
       // the muzzle. In that case send the bolt straight ahead, never aft.
       const yaw=b.mesh.rotation.y;
       end.copy(from).add(new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)).multiplyScalar(65));
      }
     }
     const delta=end.clone().sub(from),length=delta.length();
     // Raycast from the actual muzzle, respecting the canyon world collider.
     const blocked=length>1?laserWorldHit(from,delta.normalize(),Math.max(0,length-5)):null;
     clashBotEmitRedLasers(b,blocked?.point||end);
     b.lockPoint.copy(blocked?.point||end);
     const diag=window.REDLINE_BOT_COMBAT_STATUS;
     diag.shots++;diag.lastAttacker=b.label;
     if(playerShot)diag.playerShots++;
     if(blocked){diag.blocked++;diag.lastResult='terrain-blocked';}
     else if(playerShot){
      const radius=REDLINE_RIVAL_FIRE_ARC.HIT_RADIUS;
      const intercepted=REDLINE_RIVAL_FIRE_ARC.canFire(b.mesh.rotation.y,from,current)
       && REDLINE_RIVAL_HITSCAN.hits(from,end,prediction.point,radius);
      if(!intercepted){diag.evaded++;diag.lastResult='evaded';clashGain(2,'LASER EVADED',false);}
      else if(CLASH.shieldT>0){diag.shielded++;diag.lastResult='shielded';}
      else if(redlineLaserBreakup(b.label)){diag.hits++;diag.lastResult='hit';}
      else {diag.lastResult='invulnerable';}
     }else if(target&&REDLINE_RIVAL_FIRE_ARC.canFire(b.mesh.rotation.y,from,target.mesh.position)
      &&target.mesh.position.distanceTo(end)<17&&target.shieldT<=0&&!target.respawnT){
      target.stunT=Math.max(target.stunT,1.3);
      target.respawnT=REDLINE_DESTRUCTION.DEBRIS_TIME+.18;target.velocity=0;
      if(!target.debris)target.debris=REDLINE_DESTRUCTION.create(THREE,S);
      target.debris.explode(target.mesh.position,new THREE.Vector3());
      diag.lastResult='rival-hit';
     }
     b.targetBot=null;
   }
  }
  b.burstT=Math.max(0,b.burstT-dt);
  clashBotAdvanceRedLasers(b,dt);
  b.sight.visible=(b.telegraphT>0||b.burstT>0);
  if(b.sight.visible)clashBotVisualBeam(b,b.lockPoint,b.burstT>0);
 }
 // Each overtake is rewarded once until a rival completes another lap.
 const playerProgress=(lap-1)+(idx/N);let ahead=0;
 for(const b of CLASH.bots){if(b.index>=redlineUI.config.bots)continue;if(CLASH.gameMode==='clash'&&b.progress>playerProgress)ahead++;
  const relative=b.progress-playerProgress;
  if(CLASH.gameMode==='clash'&&b.lastRelative!==null&&b.lastRelative>0&&relative<=0&&
     Math.abs(relative)<.018&&b.mesh.position.distanceTo(st.p)<85&&speed>90&&b.passLap!==lap){
    b.passLap=lap;clashGain(6,'CLEAN OVERTAKE');
  }
  b.lastRelative=relative;
 }
 CLASH.lastPlace=1+ahead;
 if(CLASH.frameHud>.20){clashHUD();CLASH.frameHud=0}
}
function clashHUD(){
 $('clashFlowFill').style.width=Math.round(CLASH.flow)+'%';$('clashFlowNum').textContent=Math.round(CLASH.flow);
 $('clashCombo').textContent='×'+CLASH.combo+' COMBO';$('clashRank').innerHTML=CLASH.gameMode==='clash'?'P'+CLASH.lastPlace+' <small>/ '+(redlineUI.config.bots+1)+' PILOTS</small>':'SOLO <small>TIME ATTACK</small>';
 clashShell.classList.toggle('trial',CLASH.gameMode==='trial');
 document.body.classList.toggle('redline-clash-mode',CLASH.gameMode==='clash');
 clashTips.style.opacity=CLASH.gameMode==='trial'||(mode==='run'&&raceT>16)?'0':'1';
 const event=CLASH.gameMode==='clash'?CLASH.events.find(e=>e.cooldown<2&&e.position.distanceTo(st.p)<240):null;
 const nearbySky=CLASH.gameMode==='clash'?CLASH.skyline.find(g=>g.position.distanceTo(st.p)<150):null;
 const text=event?('◆ '+event.name+'  ·  SHOOT AMBER/BLUE CORE  ·  25 FLOW'):
  (CLASH.shieldT>0?'◆ AEGIS SHIELD  ·  '+CLASH.shieldT.toFixed(1)+'s':
  (CLASH.pulseT>0?'◆ EMP DISCHARGED':nearbySky?'◇ SKYLINE GATE · OPTIONAL · +16 FLOW':'FLY CLEAN · CHOOSE YOUR RACING LINE'));
 $('clashMiniObjective').textContent=CLASH.gameMode==='trial'?'CHASE YOUR GHOST · BEAT YOUR BEST LAP':text;
 $('clashRivals').innerHTML=CLASH.gameMode==='clash'?CLASH.bots.filter(b=>b.index<redlineUI.config.bots).sort((a,b)=>b.progress-a.progress).map(b=>{
  const pct=Math.floor(((b.progress%1)+1)%1*100),lapNo=Math.min(3,Math.floor(Math.max(0,b.progress))+1);
  const pace=b.lastLapSeconds>0?fmt(b.lastLapSeconds):b.lapGoal.toFixed(0)+'s GOAL';
  return `<div class="clash-rival"><span class="clash-dot" style="background:#${b.color.toString(16).padStart(6,'0')};color:#${b.color.toString(16).padStart(6,'0')}"></span>${b.label}<b>L${lapNo} ${pct}% · ${pace}</b></div>`
 }).join(''):'<div class="clash-rival">CHASE YOUR BEST GHOST · G KEY</div>';
}
function clashGateReward(n){if(mode!=='run'||CLASH.gameMode!=='clash')return;const amt=10+Math.min(10,Math.max(0,CLASH.combo-1)*3);clashGain(amt,'CLEAN GATE '+n)}
function clashLapResult(){const place=CLASH.lastPlace;
 if(!CLASH.finished){CLASH.finished=true;if(place===1&&CLASH.gameMode==='clash'){CLASH.wins++;try{localStorage.setItem('redline_clash_wins',String(CLASH.wins))}catch(e){}}}const bonus=CLASH.gameMode==='trial'?'TIME ATTACK COMPLETE':place===1?'WINNER · CANYON ACE':place===2?'PODIUM FINISH':place===3?'ON THE PODIUM':'RACE COMPLETE';return `${bonus}<br><span style="font-size:14px">${CLASH.gameMode==='clash'?(redlineUI.config.bots+1)+' PILOTS · ':''}${GATES.length} GATES · ${Math.round(CLASH.flow)} FLOW BANKED${CLASH.gameMode==='clash'?' · '+CLASH.wins+' CLASH WINS':''}</span>`}
// Explicit optional debug snapshot used by browser-side playtests.
window.REDLINE_P1_STATUS=()=>({waterfalls:window.REDLINE_WATERFALL_QA||[],pools:window.REDLINE_SOURCE_POOLS||[],ironwall:window.REDLINE_P1_IRONWALL||null,crossing:window.REDLINE_P1_CROSSING||null,ember:window.REDLINE_P1_EMBER||null});
window.REDLINE_V23_STATUS=()=>({geology:window.REDLINE_STAGE3_GEO_QA||null,shoreline:!!window.REDLINE_STAGE3_SHORE,audioReady:REDLINE_AUDIO_ENGINE.running,breakupPieces:REDLINE_DEBRIS.count,breakupRemaining:REDLINE_DEBRIS.remaining,breakupFocus:REDLINE_DEBRIS.active?REDLINE_DEBRIS.focus.toArray():null,restartCountdown:.65});
window.REDLINE_V22_STATUS=()=>({course:redlineUI.config.course,sprint:sprintMode(),gates:sprintGateCount(),sprintRecord:PB,sectors:sectorSplits.slice(),lastSectors:lastSectors.slice(),crash:REDLINE_PLAYER_CRASH.t,ammo:st.las,ghostFrames:bestGhost.length,ai:CLASH.bots.map(b=>({name:b.label,energy:b.energy,flow:b.flow,ammo:b.ammo,boosting:b.boosting,sprintFinish:b.sprintFinishSec}))});
window.REDLINE_V272_RACE_QA=()=>({playerSpeed:Math.abs(FL.speed),playerProgress:(lap-1)+near(st.p.x,st.p.z)/N,routeLength:trackDistance,bots:CLASH.bots.map(b=>({name:b.label,progress:b.progress,actualSpeed:b.speed,targetSpeed:b.targetSpeed||0,boosting:b.boosting,boostShare:(b.boostSeconds||0)/Math.max(0.01,b.movementSeconds||0),energy:b.energy,blockedSeconds:b.blockedSeconds||0,flightSeconds:b.movementSeconds||0,distance:b.movementDistance||0,laps:b.lapTimes.slice(),tempo:b.tempo||'fast',shots:b.raceShots||0}))});
window.REDLINE_CLASH_STATUS=()=>({flow:CLASH.flow,combo:CLASH.combo,place:CLASH.lastPlace,bots:CLASH.bots.map(b=>({name:b.label,progress:b.progress,stun:b.stunT,goalLap:b.lapGoal,route:b.ironwallRoute,lane:b.lane,lastLap:b.lastLapSeconds,speed:b.speed,stuck:b.stuckT||0,position:[b.mesh.position.x,b.mesh.position.y,b.mesh.position.z],laps:b.lapTimes.slice(),shots:b.fireT,emp:b.empCooldown,shield:b.shieldT})),events:CLASH.events.map(e=>({name:e.name,state:e.state,opening:e.open||0})),skyline:CLASH.skyline.map(g=>({t:g.t,lastRewardLap:g.lastRewardLap,visible:g.root.visible})),physics:{x:FL.x,y:FL.y,z:FL.z,speed:FL.speed}});

function wind(p,bi){const tx=TX[bi],tz=TZ[bi],f=FW[bi],t=bi/N,l=((p.x-PX[bi])*-tz+(p.z-PZ[bi])*tx)/f,nar=cl((90-f)/45,0,1),g=Math.sin(time*.9+bi*.31)*Math.sin(time*.37+bi*.11),cw=g*13*nar+Math.sin(time*.5)*2;
 let wx=tx*3-tz*cw,wz=tz*3+tx*cw,wy=Math.exp(-Math.pow((Math.abs(l)-1.05)/.35,2))*(l>0?3:1)*(1+.5*Math.sin(time*.8));
 if(t>.84)wy+=18*Math.exp(-Math.pow((l-.7)/.45,2))*sm(.84,.88,t)*(1-sm(.99,1,t));
  for(const o of OB){if(!o.alive)continue;const dx=p.x-o.x,dz=p.z-o.z,d=Math.hypot(dx,dz)+.01,R=o.r+55;if(d<R&&p.y<o.top+20){const k=(1-d/R)*7;wx+=-dz/d*k+Math.sin(time*3+d*.2)*k*.3;wz+=dx/d*k}}
  const cc=cutNearest(p.x,p.z);
  if(cc&&cc.d<45&&p.y<130){
   const squeeze=1-sm(17,45,cc.d);
   wx+=cc.tx*(8+4*Math.sin(time*1.8))*squeeze+cc.tz*Math.sin(time*3.1+cc.u*17)*8*squeeze;
   wz+=cc.tz*(8+4*Math.sin(time*1.8))*squeeze-cc.tx*Math.sin(time*3.1+cc.u*17)*8*squeeze;
  }
  return[wx,wy,wz]}
 // Visibility along the ray from craft to desired orbit camera, including actual
 // rendered cliff polygons and protruding ledges (not only the heightfield).
 function cameraClearance(anchor,back,d,rise){
  const count=Math.max(16,Math.ceil(d/1.75));
  for(let i=2;i<=count;i++){
   const fraction=i/count,t=d*fraction;
   const x=anchor.x-back.x*t,z=anchor.z-back.z*t,y=anchor.y+rise*fraction;
   if(gh(x,z)>y-3.5 || CLIFF_COLLIDER.contact(new THREE.Vector3(x,y,z),3.0))
    return Math.max(5,d*(i-2)/count);
  }
  return d;
 }

function readGamepad(){
 if(!navigator.getGamepads)return null;
 const gp=[...navigator.getGamepads()].find(p=>p&&p.connected);if(!gp)return null;
 const dead=v=>Math.abs(v)<.13?0:Math.sign(v)*(Math.abs(v)-.13)/.87;
 return {steer:dead(gp.axes[0]||0),throttle:-dead(gp.axes[1]||0),lift:-dead(gp.axes[3]||0),
         boost:!!gp.buttons[5]?.pressed,brake:!!gp.buttons[4]?.pressed,
         fire:!!gp.buttons[0]?.pressed,start:!!gp.buttons[9]?.pressed};
}
// REDLINE v17.12: one fixed river-surface datum for BOTH telemetry and flight ceiling.
// Terrain/obstacle height still governs collision clearance, NOT altitude readouts.
const REDLINE_MAX_ALTITUDE_ABOVE_RIVER=310;
function redlineRiverAltitude(y){return Math.max(0,y-WATER_HEIGHT)}
function redlineEnforceAltitudeCeiling(){
 const ceiling=WATER_HEIGHT+REDLINE_MAX_ALTITUDE_ABOVE_RIVER;
 if(st.p.y>ceiling){
  st.p.y=ceiling;
  // Prevent continued climb impulses, jitter, or upward velocity accumulating at the ceiling.
  st.vy=Math.min(0,st.vy);
  FL.vy=Math.min(0,FL.vy);
 }
}
window.REDLINE_HANDLING_STATUS=()=>({
 speed:FL.speed,yawRate:FL.turnRate||0,roll:FL.roll||0,steer:FL.steerFiltered||0,
 sideSlip:Math.sin(st.yaw)*FL.vz-Math.cos(st.yaw)*FL.vx,
 slipAngleDeg:Math.hypot(FL.vx,FL.vz)>1e-6?Math.atan2(Math.sin(st.yaw)*FL.vz-Math.cos(st.yaw)*FL.vx,-Math.sin(st.yaw)*FL.vx-Math.cos(st.yaw)*FL.vz)*180/Math.PI:0,
 physicsSteps:activeFlightSteps,cameraLag:cam.position.distanceTo(dr.position),
 fps:liveFPS,config:{...REDLINE_FLIGHT.config}
});
window.REDLINE_ALTITUDE_STATUS=()=>({altitudeMeters:redlineRiverAltitude(st.p.y),riverDatum:WATER_HEIGHT,ceilingMeters:REDLINE_MAX_ALTITUDE_ABOVE_RIVER,worldCeiling:WATER_HEIGHT+REDLINE_MAX_ALTITUDE_ABOVE_RIVER,clearanceAboveTerrain:st.p.y-gh(st.p.x,st.p.z),impactKickRemaining:st.kickRemaining||0,blockedFor:st.blockedFor||0});
function redlineShoreWaterLevel(i,side){
 const p=(Math.floor(i/N*HYDRO.nx)%HYDRO.nx)*HYDRO.ny+(side<0?0:HYDRO.ny-1);
 return HYDRO.b[p]+HYDRO.h[p];
}
function update(dt){
 // Touch controls exist only on primary coarse-pointer devices. Keep them
 // inactive outside a live race, during pause, and behind settings dialogs.
 window.REDLINE_MOBILE_CONTROLS?.setActive?.(
   redlineUI?.current==='race' && (mode==='run'||mode==='count') && !redlineUI.racePanelOpen?.());
 if(mode==='pause')return;
 REDLINE_DEBRIS.update(dt);
 if(REDLINE_PLAYER_CRASH.t>0){
  REDLINE_PLAYER_CRASH.t=Math.max(0,REDLINE_PLAYER_CRASH.t-dt);
  if(REDLINE_PLAYER_CRASH.t===0){
   redlineCombatRespawn();
  }
 }
 if(window.REDLINE_GUIDE?.active)REDLINE_GUIDE.tick(dt); // Freeze flight, AI and environmental timers without zeroing momentum.
 const th=P.t/100,ag=P.a/100,sb=P.s/100,top=157+79*th,bst=275+79*th,run=mode=='run',p=st.p;st.cd-=dt;st.ic-=dt;st.bt-=dt;advanceLaserFX(dt);
 if(run&&st.las<2){st.laserRecharge=(st.laserRecharge??1.45)-dt; if(st.laserRecharge<=0){st.las=Math.min(2,st.las+1);st.laserRecharge=st.las<2?1.45:0;}}
 if(run)redlineUpdateLock(dt); // 60Hz authoritative combat targeting; independent of GPU FPS.
 let steer=0,bo=false;const hardStop=mode==='run'&&REDLINE_BINDINGS.isDown(K,'brake');const gamepad=readGamepad();if(mode==='ready'&&gamepad?.start&&redlineUI.current==='landing'){redlineUI.go('solo');}FL.x=p.x;FL.y=p.y;FL.z=p.z;FL.yaw=st.yaw;
 REDLINE_MOUSE_ALT.step(dt,(redlineUI?.config?.mouseSensitivity||50)/50,(redlineUI?.config?.pitchSensitivity||90)/100,FL.yaw);
 if(run){
  const move=REDLINE_MOVE.vector();
  const touch=window.REDLINE_MOBILE_CONTROLS?.snapshot?.();
  const touchLive=!!(touch?.enabled);
  const touchSteering=touchLive&&Math.abs(touch.steer)>.001;
  const inp={
   throttle:touchLive&&Math.abs(touch.throttle)>.001?touch.throttle:move.throttle||(gamepad?.throttle||0),
   steer:touchSteering?touch.steer:(REDLINE_MOUSE_ALT.held&&REDLINE_MOUSE_ALT.style==='classic'?REDLINE_MOUSE_ALT.steer:(gamepad?.steer||0)),
   // Turning via touch buttons takes precedence over mouse heading hold.
   headingTarget:!touchSteering&&REDLINE_MOUSE_ALT.held&&REDLINE_MOUSE_ALT.style==='locked'?REDLINE_MOUSE_ALT.headingTarget:undefined,
   strafe:touchLive&&Math.abs(touch.strafe)>.001?touch.strafe:move.strafe,
   lift:touchLive&&touch.lift!==0?touch.lift:(REDLINE_BINDINGS.isDown(K,'climb')?1:REDLINE_BINDINGS.isDown(K,'descend')?-1:(Math.abs(REDLINE_MOUSE_ALT.command)>.045?REDLINE_MOUSE_ALT.command:(gamepad?.lift||0))),
   pitch:REDLINE_MOUSE_ALT.style==='locked'?REDLINE_MOUSE_ALT.pitch:st.pm,
   boost:!!(REDLINE_BINDINGS.isDown(K,'boost')||gamepad?.boost||(touchLive&&touch.boost)),
   brake:!!(REDLINE_BINDINGS.isDown(K,'brake')||gamepad?.brake||(touchLive&&touch.brake))};
  if((st.kickRemaining||0)>.12&&inp.throttle>0)inp.throttle=0;
  if(hardStop){inp.throttle=0;inp.steer=0;inp.strafe=0;inp.lift=0;inp.boost=false;inp.brake=true;FL.speed=FL.vx=FL.vy=FL.vz=FL.strafeSpeed=0;}
  if(REDLINE_PLAYER_CRASH.active){inp.throttle=0;inp.steer=0;inp.strafe=0;inp.lift=0;inp.boost=false;inp.brake=true;FL.speed=0;FL.vx=FL.vz=FL.vy=0;FL.strafeSpeed=0;} // Briefly stop thrusting back into the wall.
  lastVectorCommand={drive:inp.throttle,steer:inp.steer,strafe:inp.strafe,lift:inp.lift,brake:inp.brake};
  if((gamepad?.fire||(touchLive&&touch.fire))&&st.cd<=0)fire();
  activeFlightSteps=stepFlight(FL,inp,{thrust:P.t,agility:P.a,stability:P.s,handlingMode:redlineUI.config.handlingMode||'easy',assist:redlineUI.config.beginnerAssist,airframe:redlineActiveAirframe()},dt);if(hardStop){FL.speed=FL.vx=FL.vy=FL.vz=FL.strafeSpeed=0;FL.x=p.x;FL.y=p.y;FL.z=p.z;FL.renderX=p.x;FL.renderY=p.y;FL.renderZ=p.z;st.kickRemaining=0;}steer=-inp.steer;bo=FL.boosting}
 else{REDLINE_MOVE.clear();activeFlightSteps=0;FL._accumulator=0;lastVectorCommand={drive:0,steer:0,lift:0,brake:false};FL.ax=FL.ay=FL.az=FL.yawAccel=0;FL.speed=0;FL.vx=FL.vz=0;FL.strafeSpeed=0;FL.vy=Math.sin(time*1.3)*1.2;FL.roll*=.9;FL.pitch*=.9}
 st.spd=FL.speed;st.vy=FL.vy;st.yaw=FL.yaw;st.boost=FL.energy*100;
 window.REDLINE_MOBILE_CONTROLS?.setTelemetry?.(FL.speed,redlineRiverAltitude(st.p.y));
 const flightRenderOffset=new THREE.Vector3(FL.renderX-FL.x,FL.renderY-FL.y,FL.renderZ-FL.z);const oldP=p.clone();const v=FL.speed,bi=near(p.x,p.z),w=wind(p,bi);st.wind=w;const cp=1-.55*sb,f=fwd();
 if(run)p.set(FL.x,FL.y,FL.z);else p.y+=FL.vy*dt;
 if(mode==='ready'){const y=gh(PX[0],PZ[0]);p.set(PX[0],y+15+Math.max(0,37-time*5)+Math.sin(time*.9)*.7,PZ[0]);}
 if(!hardStop){p.x+=w[0]*cp*dt;p.z+=w[2]*cp*dt;p.y+=w[1]*cp*dt;}
 if(run&&(st.kickRemaining||0)>0){
  const kickStep=Math.min(dt,st.kickRemaining);
  p.addScaledVector(st.kickVelocity,kickStep);
  st.kickRemaining=Math.max(0,st.kickRemaining-dt);
  st.kickVelocity.multiplyScalar(Math.exp(-2.3*dt));
 }
 if(run){
  // Continuous movement samples 4 m apart; last safe point protects against tunneling.
  const wanted=p.clone(),distance=oldP.distanceTo(wanted),steps=Math.min(22,Math.max(1,Math.ceil(distance/4.0)));
  let valid=oldP.clone(),collision=false,cliffImpact=false,impactNormal=null;
  const radius=7.5;
  for(let j=1;j<=steps;j++){
   const q=oldP.clone().lerp(wanted,j/steps),clear=gh(q.x,q.z)+3.6;
   const cliffContact=CLIFF_COLLIDER.contact(q,radius,oldP);
   if(cliffContact){collision=true;cliffImpact=true;impactNormal=cliffContact;break}
   if(q.y<clear){collision=true;impactNormal={nx:0,ny:1,nz:0};break}valid.copy(q);
  }
  if(collision){p.copy(valid);
   if(cliffImpact){
    const attempted=wanted.clone().sub(valid);
    const magnitude=attempted.length();
    if(magnitude>0.001){attempted.multiplyScalar(1/magnitude);
     const toward=FL.vx*attempted.x+FL.vy*attempted.y+FL.vz*attempted.z;
     if(toward>0){FL.vx-=toward*attempted.x;FL.vy-=toward*attempted.y;FL.vz-=toward*attempted.z}
    }
    resolveVisibleWall(p,oldP,radius);
   }else{
    const eps=5,gx=gh(p.x+eps,p.z)-gh(p.x-eps,p.z),gz=gh(p.x,p.z+eps)-gh(p.x,p.z-eps);
    const n=new THREE.Vector3(-gx/(2*eps),1,-gz/(2*eps)).normalize();
    const velocity=new THREE.Vector3(FL.vx,FL.vy,FL.vz),incoming=velocity.dot(n);
    if(incoming<0)velocity.addScaledVector(n,-incoming);
    FL.vx=velocity.x;FL.vy=velocity.y;FL.vz=velocity.z;p.addScaledVector(n,1.75);
   }
   if(distance>6)hitFx();
   redlineImpactKick(p,impactNormal||{nx:0,ny:1,nz:0},oldP);
  }
 }
 if(run&&redlineUI.config.beginnerAssist&&Math.abs(st.spd)>45){const direction=new THREE.Vector3(FL.vx,FL.vy,FL.vz);if(direction.lengthSq()>1){direction.normalize();const probe=oldP.clone().addScaledVector(direction,Math.min(29,Math.max(12,Math.abs(st.spd)*.12)));if(probe.y<gh(probe.x,probe.z)+14||CLIFF_COLLIDER.contact(probe,11,oldP)){const decel=Math.min(Math.abs(FL.speed),55*dt);const factor=Math.abs(FL.speed)>1e-5?(Math.abs(FL.speed)-decel)/Math.abs(FL.speed):1;FL.vx*=factor;FL.vz*=factor;FL.speed*=factor;}}}
 if(run){const R=8;let px=0,pz=0,hit=false;for(const[ox,oz]of[[0,0],[R,0],[-R,0],[0,R],[0,-R]]){const hh=gh(p.x+ox,p.z+oz);if(hh>p.y-2.5){hit=true;if(ox||oz){px-=ox;pz-=oz}}}
  if(hit){const hh=gh(p.x,p.z),gx=gh(p.x+4,p.z)-gh(p.x-4,p.z),gz=gh(p.x,p.z+4)-gh(p.x,p.z-4);if(Math.hypot(gx,gz)/8<.9){p.y=Math.max(p.y,hh+2.5)}else{const l=Math.hypot(gx,gz)||1;p.x-=gx/l*4;p.z-=gz/l*4;
     const inward=(FL.vx*gx+FL.vz*gz)/l;
     if(inward>0){FL.vx-=gx/l*inward;FL.vz-=gz/l*inward}
     if(Math.abs(st.spd)>18)hitFx();redlineImpactKick(p,{nx:-gx/l,ny:.2,nz:-gz/l},oldP)}if(st.vy<0)st.vy=0;
    if(Math.abs(st.spd)<12){st.wallTime=(st.wallTime||0)+dt;if(st.wallTime>1.6&&time>(st.wallHelpAt||0)+3){st.wallHelpAt=time;msg('WALL CONTACT · STEER AWAY OR PRESS R',1300)}}
    else st.wallTime=0;
   }else st.wallTime=0
  for(const o of OB){if(!o.alive)continue;const dx=p.x-o.x,dz=p.z-o.z,d=Math.hypot(dx,dz)||1;if(d<o.r+9&&p.y<o.top+3){p.x+=dx/d*(o.r+9-d);p.z+=dz/d*(o.r+9-d);hitFx();redlineImpactKick(p,{nx:dx/d,ny:.2,nz:dz/d},oldP)}}
  // Resolve against the same triangles the renderer displays, including overhangs.
  // This is also important when stationary or during low-speed turning.
  const wallNormal={};if(resolveVisibleWall(p,oldP,7.5,wallNormal)){hitFx();redlineImpactKick(p,wallNormal,oldP)}
  // River boulders influence the waterline racing line and are not just decoration.
  if(p.y<WATER_HEIGHT+23)for(const r of RIVER_ROCKS){const dx=p.x-r.x,dz=p.z-r.z,d=Math.hypot(dx,dz)||1;
   if(d<r.r+7&&p.y<r.top+6){p.x+=dx/d*(r.r+7-d);p.z+=dz/d*(r.r+7-d);hitFx();redlineImpactKick(p,{nx:dx/d,ny:.2,nz:dz/d},oldP)}
  }
 }
  if(run){
   const a=p.x-PX[bi],b=p.z-PZ[bi],across=Math.abs(-TZ[bi]*a+TX[bi]*b);
   // Flying below the waterline is no longer frictionless: bounce, slowed thrust,
   // river-directed drift and a visible spray wake.
   if(across<FW[bi]*.54&&p.y<WATER_HEIGHT+4.5){
    p.y=Math.max(p.y,WATER_HEIGHT+3.0);
    FL.vy=Math.max(FL.vy,13);
    FL.speed*=Math.max(.80,1-dt*3.5);
    FL.vx*=Math.max(.85,1-dt*2.8);FL.vz*=Math.max(.85,1-dt*2.8);
    const channel=HYDRO.velocityNear(p.x,p.z),sideX=-TZ[bi],sideZ=TX[bi];
    p.x+=(TX[bi]*channel[0]+sideX*channel[1])*dt*1.25;
    p.z+=(TZ[bi]*channel[0]+sideZ*channel[1])*dt*1.25;
    if((st.splashT||0)<=time){splashAt(p.x,p.z,bi);st.splashT=time+.33;msg('WATER CONTACT  /  CURRENT DRAG',450)}
   }
  }
 if(p.y<4.5){p.y=4.5;st.vy=Math.max(0,st.vy)}redlineEnforceAltitudeCeiling();st.spd=FL.speed;FL.vy=st.vy;FL.x=p.x;FL.y=p.y;FL.z=p.z;
 const gust=Math.hypot(w[0],w[1],w[2]),wob=gust*.0025*(1-sb*.6);
 st.roll=FL.roll+Math.sin(time*2.3)*wob;st.pv=FL.pitch+Math.sin(time*1.7)*wob;
 soundFrame(st.spd,bo,run);animateVectorPods(dt);FLAME(bo,top,steer,dt);
  redlineSyncAirframe();
  const active=redlineActiveAirframe();
  const activeJetArray=active==='blade'?bladeGameJets:active==='kestrel'?kestrelGameJets:null;
  if(activeJetArray?.length){
   REDLINE_BLADE_EXHAUST.animate(activeJetArray,time,{mix:lastRotorOutput,
     command:lastVectorCommand,vy:FL.vy,boost:bo,yawAccel:FL.yawAccel});
  }
  if(active==='spirit'&&spiritGameFx){
   REDLINE_SPIRIT_FX.animate(spiritGameFx,time,{command:lastVectorCommand,vy:FL.vy,boost:bo,yawAccel:FL.yawAccel});
  }
  if(active==='copper'&&copperGameFx){
   REDLINE_COPPER_FX.animate(copperGameFx,time,{command:lastVectorCommand,
    vy:FL.vy,boost:bo,yawAccel:FL.yawAccel});
  }
 // obstacles dying, pickups
 EXTRA(dt,run,p,oldP);
 if(run){const lateWall={};if(resolveVisibleWall(p,oldP,7.5,lateWall))redlineImpactKick(p,lateWall,oldP)}
 clashStep(dt,run&&!window.REDLINE_GUIDE?.active,oldP);
 if(run&&CLASH.displaced){resolveVisibleWall(p,oldP,7.5);p.y=Math.max(p.y,gh(p.x,p.z)+7.5);CLASH.displaced=false;}
 if(run){redlineCheckDislodge(p,oldP,dt);if(st.lastContactFrame!==time&&redlineEscapeCandidate(p))st.lastFreePoint=p.clone()}
 // Final cap after collisions, water effects and combat have moved the craft.
 redlineEnforceAltitudeCeiling();
 st.spd=FL.speed;st.boost=FL.energy*100;
 // Single authoritative position for physics, rendered drone, boost FX and chase camera.
 // Tree/arch collisions may have displaced p in EXTRA, so sync AFTER resolving them.
 FL.x=p.x;FL.y=p.y;FL.z=p.z;
 dr.position.copy(p);
 // Lightweight local reflection: shadow fades as clearance grows, and nearby
 // rock receives a little afterburner light without six costly dynamic lamps.
 const groundY=gh(p.x,p.z),clearance=Math.max(0,p.y-groundY);
 rl41Contact.visible=clearance<68;
 if(rl41Contact.visible){rl41Contact.position.set(p.x,groundY+.35,p.z);
  rl41Contact.rotation.y=-st.yaw;
  rl41Contact.material.opacity=.40*Math.pow(1-clearance/68,1.6);
  const spread=1+Math.min(1.0,clearance/60);
  rl41Contact.scale.set(spread,spread,1);
 }
 const motors=lastRotorOutput?.rotors;
 const enginePower=motors?((motors.PF?.thrust||0)+(motors.PR?.thrust||0)+
   (motors.SF?.thrust||0)+(motors.SR?.thrust||0))*.25:.55;
 rl41JetBounce.position.set(p.x,p.y-3.5,p.z+3.5);
 rl41JetBounce.intensity=Math.min(.85,.14+.42*enginePower+(bo?.22:0));
 // The render pose may trail the authoritative simulation by one fixed step.
 // Suppress extrapolation after contacts and ensure the visual craft is never
 // drawn inside collidable canyon rock.
 if(run && flightRenderOffset.lengthSq()<9 && oldP.distanceTo(p)<8 && !CLIFF_COLLIDER.contact(p.clone().add(flightRenderOffset),3))dr.position.add(flightRenderOffset);
 dr.rotation.set(st.pv,st.yaw,st.roll,'YXZ');boostFrame(bo,dt,p);keepLaserMuzzlesAttached();
 OB.forEach(o=>{if(o.dying>0){o.dying-=dt;o.m.scale.setScalar(Math.max(.001,o.dying/.4));if(o.dying<=0)o.m.visible=false}});
 PK.forEach(k=>{k.m.rotation.y+=dt*2;if(k.t>0){k.t-=dt;if(k.t<=0)k.m.visible=true}else if(run&&k.m.position.distanceTo(p)<9){st.las=2;k.t=10;k.m.visible=false;msg('TWO LASERS RECHARGED',700)}});
 // race
 if(run&&!window.REDLINE_GUIDE?.active)redlineCheckDamRoute(prevPlayerPosition,p);
 if(run&&!window.REDLINE_GUIDE?.active){raceT+=dt;lapT+=dt;const rel=p.clone().sub(GP[gate]),gd=rel.dot(GT[gate]);
  const prevd=prevPlayerPosition.clone().sub(GP[gate]).dot(GT[gate]);
  const fraction=prevd<0&&gd>=0?(-prevd/Math.max(1e-6,gd-prevd)):0;
  const through=prevPlayerPosition.clone().lerp(p,fraction);
  const aperture=through.distanceTo(GP[gate]);
  const validRing=prevd<0&&gd>=0&&aperture<GATES[gate][2]*.96;
  // Needle Pass cannot award a split when the dam was bypassed above or
  // around the walls; otherwise the entire 3D set piece can be skipped.
  const crossed=validRing&&(gate!==4||REDLINE_DAM.passedThisLap);
  if(validRing&&gate===4&&!REDLINE_DAM.passedThisLap&&time-REDLINE_DAM.lastNotice>2.1){
   REDLINE_DAM.lastNotice=time;
   msg('INVALID LINE — RETURN THROUGH THE SPILLWAY GATE',2200);
  }
  if(crossed){if(REDLINE_ONLINE.isRacing)REDLINE_ONLINE.captureCheckpoint();REDLINE_AUDIO_ENGINE.play('checkpoint');clashGateReward(gate+1);sectorSplits.push(lapT-lastCheckpointTime);lastCheckpointTime=lapT;gate++;pd=NaN;
   if(gate===4){REDLINE_DAM.passedThisLap=false;REDLINE_DAM.lastNotice=-1000;}
   if(gate>=sprintGateCount()){const sprintFinal=sprintMode();gate=0;REDLINE_DAM.passedThisLap=false;best=Math.min(best,lapT);lastSectors=sectorSplits.slice();
    if(lapT<PB){PB=lapT;bestGhost=liveGhost.slice();storeBest();msg('NEW PERSONAL BEST  ·  '+fmt(lapT)+'  '+medalFor(lapT),2200)}
    else msg('LAP '+lap+'  '+fmt(lapT)+'  ·  '+medalFor(lapT),1800);
    liveGhost=[];ghostAccumulator=0;lapT=0;lastCheckpointTime=0;sectorSplits=[];lap++;
    if(lap>sprintMaxLaps()){mode='done';clashLapResult();redlineUI.results();return}}
    else{msg('GATE '+gate+'/'+sprintGateCount()+'  ·  SPLIT '+fmt(sectorSplits.at(-1)),850);if(sprintMode())redlineUI.notify('SECTOR '+gate+' COMPLETE',fmt(sectorSplits.at(-1))+' · CHASE YOUR GHOST','success');};gateCols()}else pd=gd}

 if(run&&!window.REDLINE_GUIDE?.active){
  ghostAccumulator+=dt;
  if(ghostAccumulator>=1/30){ghostAccumulator=0;
   if(liveGhost.length<6000)liveGhost.push([+lapT.toFixed(2),+p.x.toFixed(2),+p.y.toFixed(2),+p.z.toFixed(2),+st.yaw.toFixed(4),+st.roll.toFixed(3)]);
  }
 }
 ghostCraft.visible=ghostVisible&&!window.REDLINE_GUIDE?.active&&(mode==='run'||mode==='count')&&bestGhost.length>2;
 if(ghostCraft.visible){
  const sample=REDLINE_RAVEN.ghostSample(bestGhost,lapT);
  if(sample){ghostCraft.position.set(sample[1],sample[2],sample[3]);ghostCraft.rotation.y=sample[4];ghostCraft.rotation.z=sample[5]||0;}
 }
 prevPlayerPosition.copy(p);
 if(mode=='count'){const onlineCountdown=REDLINE_ONLINE.isRacing?REDLINE_ONLINE.countdownRemain():null;cd=onlineCountdown!==null?Math.max(0,onlineCountdown):cd-dt;if(cd<=0){mode='run';lapT=raceT=0;redlineUI.goUntil=performance.now()+850}}
 // dust
 const a=dgm.attributes.position.array,vx=-Math.sin(st.yaw)*v,vz=-Math.cos(st.yaw)*v;for(let i=0;i<DN;i++){a[i*3]+=(w[0]-vx)*dt;a[i*3+1]+=(w[1]-st.vy)*dt;a[i*3+2]+=(w[2]-vz)*dt;for(let q=0;q<3;q++){if(a[i*3+q]>80)a[i*3+q]-=160;if(a[i*3+q]<-80)a[i*3+q]+=160}}dgm.attributes.position.needsUpdate=true;dust.position.copy(p);
 // camera: follow the final visible drone position, not an earlier physics value.
 // The boom remains directly behind the nose vector. Camera and aim share its
 // horizontal axis, which guarantees the drone cannot drift off-centre in yaw.
 if(MIX)MIX.update(dt*(bo?1.65:1));SU.tm.value=time;RIVER_UNIFORMS.tm.value=time;HYDRO.step(dt);REDLINE_STAGE3_SHORE.update(time,redlineShoreWaterLevel);RIVER_UNIFORMS.atmosphere.value.copy(S.fog.color);RIVER_UNIFORMS.sunTint.value.copy(sun.color);
 SPRAY.forEach(s=>{if(s.life>0){s.life-=dt;s.mesh.position.x+=s.dx*dt;s.mesh.position.z+=s.dz*dt;
  s.mesh.scale.setScalar(1+(1.2-s.life)*8);s.mesh.material.opacity=Math.max(0,s.life/1.2)*.58;
  if(s.life<=0)s.mesh.visible=false}});const gy=gh(p.x,p.z),al=p.y-gy;
 if(run&&al<35&&Math.abs(st.spd)>20&&Math.random()<dt*60){const q=PL.find(o=>o.l<=0);
   if(q){q.l=1.6;q.m.position.set(p.x+(Math.random()-.5)*6,gy+1,p.z+(Math.random()-.5)*6);q.v.set((Math.random()-.5)*10-Math.sin(st.yaw)*v*.15,3+Math.random()*3,(Math.random()-.5)*10-Math.cos(st.yaw)*v*.15);q.m.visible=true}}
 PL.forEach(q=>{if(q.l>0){q.l-=dt;q.m.position.addScaledVector(q.v,dt);q.v.multiplyScalar(1-dt*.8);q.m.scale.setScalar(6+(1.6-q.l)*14);q.m.material.opacity=Math.max(0,q.l/1.6)*.1*cl(1-al/35,0,1);if(q.l<=0)q.m.visible=false}});
 // REDLINE v6: mouse-steered aircraft with centered chase camera.
 // Camera tracks heading; mouse movement changes only aiming reticle.
 cameraOrbitYaw=0;cameraOrbitPitch=0;
  const orbitHeading=new THREE.Vector3(-Math.sin(st.yaw),0,-Math.cos(st.yaw));
 const anchor=dr.position.clone();
 if(REDLINE_PLAYER_CRASH.active&&REDLINE_DEBRIS.active)anchor.lerp(REDLINE_DEBRIS.focus,.57);
 const chaseProfile=redlineV83ChaseProfile(redlineActiveAirframe(),camM);
 let chaseCollisionLimited=false;
 let targetCamera;
 if(mode==='ready'||mode==='load'||mode==='done'){
   const an=time*.15;targetCamera=new THREE.Vector3(anchor.x+Math.cos(an)*38,anchor.y+11,anchor.z+Math.sin(an)*38);
 }else{
   // No speed-based boom expansion: boosting must not shrink the player craft.
   // Terrain/ledge collision may still shorten the boom for visibility.
   const desired=chaseProfile.boom;
   const rise=chaseProfile.rise;
   const safe=cameraClearance(anchor,orbitHeading,desired,rise);
   chaseCollisionLimited=safe<desired-.5;
   targetCamera=anchor.clone().addScaledVector(orbitHeading,-safe);
   targetCamera.y+=rise*safe/desired;
   targetCamera.y=Math.max(targetCamera.y,gh(targetCamera.x,targetCamera.z)+6);
   // Bounded velocity lead smooths the chase boom without changing the aim ray.
   const planarVelocity=new THREE.Vector3(FL.vx,0,FL.vz);
   if(planarVelocity.lengthSq()>9&&redlineUI.config.view!==1){
    planarVelocity.normalize();
    targetCamera.addScaledVector(planarVelocity,Math.min(1.25,Math.abs(st.spd)*REDLINE_FLIGHT.config.cameraLookahead*.085));
   }
   // Camera shell itself must not intersect the visible ledge meshes.
   for(let tries=0;tries<4;tries++){
     const hit=CLIFF_COLLIDER.contact(targetCamera,3);
     if(!hit)break;
     targetCamera.add(new THREE.Vector3(hit.nx,hit.ny,hit.nz).multiplyScalar(hit.depth+.35));
   }
 }
 if((mode==='run'||mode==='count')&&redlineUI.config.view===1){targetCamera=anchor.clone().addScaledVector(orbitHeading,4.6);targetCamera.y+=2.0;}
 // Chase follows a damped physical rig, FPV remains attached to the cockpit.
 const isFPV=(mode==='run'||mode==='count')&&redlineUI.config.view===1;
 REDLINE_CAMERA_RIG.follow(cam.position,targetCamera,anchor,dt,REDLINE_FLIGHT.config,{firstPerson:isFPV,snap:cameraRigReset});
 cameraRigReset=false;
 if(!isFPV){
  // Prefer an immediate corrective move over allowing a damped camera to enter
  // the actual terrain or the collidable cliff geometry.
  if(gh(cam.position.x,cam.position.z)>cam.position.y-6 || CLIFF_COLLIDER.contact(cam.position,3))cam.position.copy(targetCamera);
 }
 st.shake=Math.max(0,st.shake-dt*2);
 // Only vertical camera shake: never a horizontal change in framing.
 cam.position.y+=(Math.sin(time*83.0)*.46+Math.sin(time*129.0)*.19)*st.shake*(redlineUI.config.handlingMode==='easy'?.08:.20);
 const fpvForward=new THREE.Vector3(-Math.sin(st.yaw)*Math.cos(st.pv),Math.sin(st.pv),-Math.cos(st.yaw)*Math.cos(st.pv));
 // The third-person sight stays centered while the craft sits BELOW it.
 // Camera-center rays are still used by the actual weapon solver (aimPoint).
 if(!isFPV&&redlineUI?.aim){redlineUI.aim.x=0;redlineUI.aim.y=0;}
 const lookAt=isFPV?anchor.clone().addScaledVector(fpvForward,160).add(new THREE.Vector3(0,2,0)):
   anchor.clone().addScaledVector(fpvForward,96).add(new THREE.Vector3(0,1.7,0));
 cam.lookAt(lookAt);dr.visible=!REDLINE_PLAYER_CRASH.active&&!(redlineUI.config.view===1&&(mode==='run'||mode==='count'));updateLaserAimIndicator();
 // Stabilize physical cockpit instrument panel and sealed canopy under boost.
 // Fixed chase lens preserves craft scale through acceleration/boost.
 // FPV remains on its independent, stable 76-degree cockpit lens.
 const cockpitLens=(redlineUI.config.view===1&&(mode==='run'||mode==='count'));
 const targetFov=cockpitLens?76:chaseProfile.fov;
 cam.fov+=(targetFov-cam.fov)*(1-Math.exp(-dt*(cockpitLens?15:6)));cam.updateProjectionMatrix();
 // Debuggable crosshair invariant: when the game is running, the visible drone's
 // world anchor should remain at x≈0 in normalized screen coordinates.
 cam.updateMatrixWorld();
 const focal=dr.position.clone().project(cam);
 // Off-screen indicator indicates the actual next REQUIRED ring, not a shortcut guess.
 const damIsNext=gate===4&&!REDLINE_DAM.passedThisLap;
 const goal=damIsNext?REDLINE_DAM.root.localToWorld(new THREE.Vector3(0,97,-12)):GP[gate].clone();
 const forwardToGate=goal.clone().sub(p);
 const nextDistance=forwardToGate.length();const aimProjection=goal.project(cam);
 const bearing=forwardToGate.clone().normalize().dot(fwd());
 const pointer=$('navPointer');
 pointer.classList.toggle('hide',nextDistance<40||!Number.isFinite(aimProjection.x));
 const displayX=cl((aimProjection.x*.5+.5)*innerWidth,104,innerWidth-104);
 const displayY=cl((-.5*aimProjection.y+.5)*innerHeight,105,innerHeight-140);
 pointer.style.left=displayX+'px';pointer.style.top=displayY+'px';
 const pBehind=bearing<-.25;
 pointer.textContent=(pBehind?'↶ ':'◇ ')+(damIsNext?'SPILLWAY FLOODGATE':GATES[gate][3])+' · '+Math.round(nextDistance)+'m'+(goal.y-p.y>22?' ↑':goal.y-p.y< -22?' ↓':'');
 if(pBehind){pointer.style.opacity=.78}else pointer.style.opacity=1;
 window.REDLINE_CAMERA_STATUS={x:focal.x,y:focal.y,screenX:(1+focal.x)*.5,
  screenY:(1-focal.y)*.5,boom:cam.position.distanceTo(anchor),
  requestedBoom:chaseProfile.boom,collisionLimited:chaseCollisionLimited,
  profile:chaseProfile.preset,airframe:chaseProfile.craft,
  bodyBounds:(!isFPV&&redlineV83MeasureCamera)?redlineV83ProjectedBody(cam):null,
  reticleX:.5,reticleY:.5,fov:cam.fov,fpv:isFPV,
  mode:camM,altitude:redlineRiverAltitude(p.y),cameraOrbitYaw,cameraOrbitPitch,
  droneYaw:st.yaw,rockTriangles:CLIFF_COLLIDER.stats().triangles};
 const perf=$('devStats');if(!perf.classList.contains('hide')&&Math.floor(time*3)!==Math.floor((time-dt)*3)){
  perf.textContent='CAM X '+focal.x.toFixed(3)+' / Y '+focal.y.toFixed(3)+' | BOOM '+cam.position.distanceTo(anchor).toFixed(1)
      +' | FPS '+liveFPS.toFixed(0)+' / DPR '+Rn.getPixelRatio().toFixed(2)+' | SHADOW '+(redlineShadowsVisible?'ON':'OFF')+' | WATER '+(HYDRO.ready?HYDRO.stats().maxDepth.toFixed(1):'--')+'m | DRAW '+Rn.info.render.calls+' | TRI '+Rn.info.render.triangles+' | GATES '+gate+' / '+GATES.length;
 }
 fill.position.set(-sunDir.x*180,110,-sunDir.z*180);sky.position.copy(cam.position);positionStableSun(p);
 try {
  redlineUI.frame(dt);
 // v42: render non-interactive text readouts at 20 Hz; input/camera/physics stay full rate.
 if(time-redlineLastHudAt>=.05 || mode!==redlineLastHudMode){redlineLastHudAt=time;redlineLastHudMode=mode;
 // hud
 $('v').textContent=Math.round(Math.abs(st.spd));$('speedMode').style.opacity=bo?'1':'0';$('al').textContent=Math.round(redlineRiverAltitude(p.y));$('bf').style.width=st.boost+'%';$('ls').textContent='◆'.repeat(Math.max(0,st.las))+'◇'.repeat(Math.max(0,2-st.las))+'  lasers';
 $('pb').textContent=fmt(PB);$('medal').textContent=Number.isFinite(PB)?medalFor(PB):'NO MEDAL';$('lp').textContent=Math.min(lap,sprintMaxLaps())+'/'+sprintMaxLaps();$('tm').textContent=fmt(raceT);$('bs').textContent=fmt(best);$('gt').textContent=(gate+1)+'/'+sprintGateCount();$('sc').textContent=SEC.find(s=>bi/N<s[1])[0];
 const cutSense=cutNearest(p.x,p.z);$('routeHint').textContent=(gate===4&&!REDLINE_DAM.passedThisLap&&bi/N>.31&&bi/N<.425)?'SPILLWAY  ·  PASS THROUGH THE MAIN FLOODGATE OR SERVICE TUNNEL':(cutSense&&cutSense.d<155&&gate===3)?'⚡ RAVINE CUT  ·  NARROW SHORTCUT  ·  CROSSWIND':(bi/N>.69&&bi/N<.80)?'IRONWALL · MOVING CROSSBARS AHEAD · CLIMB OR TIME YOUR PASS':'';$('gateName').textContent=GATES[gate][3];$('section').textContent=SEC.find(s=>bi/N<s[1])[0]+' / REDLINE EXPEDITION';$('ws').textContent=Math.round(gust);const ang=Math.atan2(-w[0],-w[2])-st.yaw;$('ar').style.transform='rotate('+(-ang-Math.PI/2)+'rad)'}
 }
 catch (hudError) {
   window.REDLINE_HUD_LAST_ERROR=String(hudError?.message||hudError);
   if (!window.REDLINE_HUD_LAST_LOG || performance.now()-window.REDLINE_HUD_LAST_LOG>2000) {
    window.REDLINE_HUD_LAST_LOG=performance.now();
    console.warn('[REDLINE HUD] noncritical panel update failed',hudError);
   }
  }
 }
 // Radar is drawn by presentation loop, not game-state/HUD updates.
/* REDLINE v60 navigation scheduler. v36-inspired direct loop integration.
   Neither HUD text throttling nor a UI closure owns the radar's heartbeat. */
let redlineNavErrors = 0;
let redlineNavLastWarn = -Infinity;
function redlineNavigationFrame(now) {
  // The presentation layer is the sole owner of map painting. Simulation
  // state (st.p) and published bot/network telemetry are read-only here.
  if (!document.body.classList.contains('rl-play')) return;
  radarFrame++;
  if (redlineNavLastTs && now - redlineNavLastTs < 33) return;
  try {
    const beforeFrame = window.REDLINE_NAV_STATUS?.frame || 0;
    drawRadar();
    if ((window.REDLINE_NAV_STATUS?.frame || 0) <= beforeFrame) {
      throw new Error('Radar draw completed without publishing a new navigation frame');
    }
    window.REDLINE_NAV_LAST_ERROR = null;
    window.REDLINE_NAV_FALLBACK_USED = false;
  } catch (error) {
    redlineNavErrors += 1;
    window.REDLINE_NAV_LAST_ERROR = String(error && error.message || error);
    // A separate v36-style direct-canvas fallback is intentionally independent
    // of the cached radar background, projection cache, and network markers.
    try {
      redlineDrawRadarFallback();
      window.REDLINE_NAV_FALLBACK_USED = true;
    } catch (fallbackError) {
      window.REDLINE_NAV_FALLBACK_ERROR = String(fallbackError && fallbackError.message || fallbackError);
    }
    if (now - redlineNavLastWarn > 2000) {
      redlineNavLastWarn = now;
      console.warn('[REDLINE navigation] primary draw failed; using direct canvas fallback', error);
    }
  }
  window.REDLINE_NAV_SCHEDULER = {
    frame: radarFrame, errors: redlineNavErrors,
    lastAttempt: now, fallback: !!window.REDLINE_NAV_FALLBACK_USED,
    actualMapFrame: window.REDLINE_NAV_STATUS?.frame || 0
  };
}
/* Self-contained direct canvas path modeled on the known-working v36 radar.
   Does not call radarRouteBackground() or redlineNavDrawMarker(). */
function redlineDrawRadarFallback() {
  const w = radar.width, h = radar.height, pad = 36;
  const end = sprintMode() ? Math.round(GATES[3][0] * N) : N;
  let minx = Infinity, maxx = -Infinity, minz = Infinity, maxz = -Infinity;
  for (let i = 0; i <= end; i++) {
    minx = Math.min(minx, PX[i]); maxx = Math.max(maxx, PX[i]);
    minz = Math.min(minz, PZ[i]); maxz = Math.max(maxz, PZ[i]);
  }
  const scale = Math.min((w - 2 * pad) / Math.max(1, maxx - minx),
    (h - 2 * pad) / Math.max(1, maxz - minz));
  const ox = (w - (maxx - minx) * scale) / 2;
  const oz = (h - (maxz - minz) * scale) / 2;
  const convert = (x, z) => [ox + (x - minx) * scale, oz + (z - minz) * scale];
  rgx.clearRect(0, 0, w, h);
  rgx.lineCap = 'round'; rgx.lineJoin = 'round'; rgx.beginPath();
  for (let i = 0; i <= end; i += 2) {
    const [px, py] = convert(PX[i], PZ[i]);
    if (i === 0) rgx.moveTo(px, py); else rgx.lineTo(px, py);
  }
  if (end === N) rgx.closePath();
  rgx.lineWidth = 13; rgx.strokeStyle = 'rgba(0,0,0,.88)'; rgx.stroke();
  rgx.lineWidth = 5.4; rgx.strokeStyle = 'rgba(255,255,255,.95)'; rgx.stroke();
  const mark = (x, z, color, radius) => {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const [rawX, rawY] = convert(x, z);
    const px=Math.max(15,Math.min(w-15,rawX)),py=Math.max(15,Math.min(h-15,rawY));
    rgx.beginPath(); rgx.arc(px, py, radius, 0, Math.PI * 2);
    rgx.fillStyle = color; rgx.fill();
    rgx.lineWidth = 2; rgx.strokeStyle = '#0a0a0b'; rgx.stroke();
  };
  const next = GATES[Math.min(gate, GATES.length - 1)];
  if (next) { const k = Math.round(next[0] * N) % N; mark(PX[k], PZ[k], '#ffffff', 7); }
  let rivals = 0;
  if (CLASH.initialized && CLASH.gameMode === 'clash') {
    for (const bot of CLASH.bots) {
      if (bot.index >= (redlineUI?.config?.bots ?? 0)) continue;
      const p = bot.mesh.position; mark(p.x, p.z, '#ffae78', 6); rivals++;
    }
  }
  if (REDLINE_ONLINE.isRacing) {
    for (const pilot of REDLINE_ONLINE.minimapRivals()) {
      mark(pilot.x, pilot.z, pilot.stale ? '#8c9ba3' : (pilot.color || '#63eaff'), 6);
      rivals++;
    }
  }
  const [rawX, rawY] = convert(st.p.x, st.p.z);
  const px=Math.max(15,Math.min(w-15,rawX)),py=Math.max(15,Math.min(h-15,rawY));
  rgx.save(); rgx.translate(px, py); rgx.rotate(-st.yaw);
  rgx.beginPath(); rgx.moveTo(0, -12); rgx.lineTo(8, 8);
  rgx.lineTo(0, 5); rgx.lineTo(-8, 8); rgx.closePath();
  rgx.fillStyle = '#f42d43'; rgx.fill(); rgx.lineWidth = 2;
  rgx.strokeStyle = '#fff'; rgx.stroke(); rgx.restore();
  redlineNavLastTs = performance.now();
  window.REDLINE_NAV_STATUS = {
    ...(window.REDLINE_NAV_STATUS || {}),
    frame: ++redlineNavFrame, timestamp: redlineNavLastTs,
    x: st.p.x, z: st.p.z, playerPixel: [px, py],
    edgeClamped: rawX !== px || rawY !== py,
    physicsX: st.p.x, physicsZ: st.p.z,
    rivalCount: rivals, mode: CLASH.gameMode,
    configuredBots: redlineUI?.config?.bots ?? 0,
    source: 'v36-direct-canvas-fallback'
  };
}
let redlineLastHudAt=-1,redlineLastHudMode='';
let refractionTarget=null;
function drawRedlineScene(dt=1/60){
 if(REDLINE_ONLINE.isRacing)REDLINE_ONLINE.tick(performance.now());
 REDLINE_COCKPIT3D.update(performance.now());
 let reuseUltraShadows=false;
 if(qualityTier==='ultra'&&window.RV){
  const scale=Rn.getPixelRatio();
  const w=Math.max(16,Math.round(innerWidth*scale*.62)),
        h=Math.max(16,Math.round(innerHeight*scale*.62));
  if(!refractionTarget)refractionTarget=new THREE.WebGLRenderTarget(w,h,{depthBuffer:true});
  else if(refractionTarget.width!==w||refractionTarget.height!==h)refractionTarget.setSize(w,h);
  RV.visible=false;const cockpitShown=REDLINE_COCKPIT3D.group.visible;REDLINE_COCKPIT3D.group.visible=false;
  try{Rn.setRenderTarget(refractionTarget);Rn.render(S,cam)}finally{
   Rn.setRenderTarget(null);RV.visible=true;REDLINE_COCKPIT3D.group.visible=cockpitShown;
  }
  RIVER_UNIFORMS.sceneColor.value=refractionTarget.texture;
  RIVER_UNIFORMS.screenSize.value.set(innerWidth*scale,innerHeight*scale);
  RIVER_UNIFORMS.refractEnabled.value=1;
  // The prepass already refreshed this frame's directional shadow texture.
  // THREE r128 otherwise redraws the *entire* shadow scene in both renders.
  // Reuse exactly the same current-frame shadow for the final scene.
  Rn.shadowMap.autoUpdate=false;
  reuseUltraShadows=true;
 }else RIVER_UNIFORMS.refractEnabled.value=0;
 try{Rn.render(S,cam)}finally{
  if(reuseUltraShadows)Rn.shadowMap.autoUpdate=true;
 }
}
// Lightweight real frame CPU timings, updated at most once every 2 seconds.
const REDLINE_FRAME_TIMING={samples:0,updateMs:0,renderMs:0,maxUpdateMs:0,maxRenderMs:0};
let captureNextFrame=false;
let adaptiveBegin=performance.now(),adaptiveFrames=0,adaptiveDesiredDpr=Rn.getPixelRatio();
function adaptQuality(now){
 if(mode!=='run')return;
 adaptiveFrames++;
 if(now-adaptiveBegin<1900)return;
 liveFPS=adaptiveFrames*1000/Math.max(1,now-adaptiveBegin);
 const current=Rn.getPixelRatio();
 // Accumulate small improvements, but only resize when the resolution change
 // is meaningful. Canvas resize happens before rendering the next frame.
 if(liveFPS<49)adaptiveDesiredDpr=Math.max(.58,adaptiveDesiredDpr-.13);
 else if(liveFPS>59)adaptiveDesiredDpr=Math.min(Math.min(devicePixelRatio,maxRenderDpr),adaptiveDesiredDpr+.025);
 adaptiveDesiredDpr=Math.min(Math.min(devicePixelRatio,maxRenderDpr),adaptiveDesiredDpr);
 if(Math.abs(adaptiveDesiredDpr-current)>.045){
  Rn.setPixelRatio(adaptiveDesiredDpr);Rn.setSize(innerWidth,innerHeight,false);rsz();
 }
 adaptiveFrames=0;adaptiveBegin=now;
 window.REDLINE_PERFORMANCE={fps:liveFPS,ratio:Rn.getPixelRatio(),draws:Rn.info.render.calls,triangles:Rn.info.render.triangles,world:REDLINE_WORLD,shadowSize:sun.shadow.mapSize.x};
 window.REDLINE_V37_PERF={...window.REDLINE_PERFORMANCE,remotePilots:REDLINE_ONLINE.remoteCount(),remoteMeshes:REDLINE_ONLINE.remoteMeshCount(),validatedGates:REDLINE_ONLINE.verifiedGates()};
}
let consecutiveLoopErrors=0;let lastLoopFailure=0;
const REDLINE_SIM_CLOCK = window.REDLINE_FIXED_CLOCK.create({hz:60,maxSteps:4});
let redlinePreviousPose = null, redlineCurrentPose = null;
/* Stage 1: read-only, primitive snapshot of each authoritative 60 Hz tick.
 * Render, replay and benchmark utilities can observe it without accessing or
 * mutating THREE.Object3D, st.p, or the visual interpolation. */
let redlinePublishedState = null, redlinePublishedIndex = 0;
window.REDLINE_SIM_STATE = () => redlinePublishedState;
function redlinePublishSimState(fixedDt){
  const finite=n=>Number.isFinite(Number(n))?Number(n):0;
  // Snapshot all primitive presentation values at the same simulation tick;
  // renderers and cockpit HUDs never receive a mutable Vector3 or a bot mesh.
  const craft=Object.freeze({
    x:finite(st.p.x),y:finite(st.p.y),z:finite(st.p.z),
    yaw:finite(st.yaw),pitch:finite(st.pv),roll:finite(st.roll),
    speed:Math.abs(finite(st.spd)),verticalSpeed:finite(st.vy),
    altitude:Math.max(0,finite(redlineRiverAltitude(st.p.y))),
    boost:Math.max(0,Math.min(100,finite(st.boost))),
    laserAmmo:Math.max(0,Math.round(finite(st.las)))
  });
  const rivals=Object.freeze(((CLASH?.initialized && Array.isArray(CLASH.bots))?CLASH.bots:[])
    .filter(b=>b && b.index < (redlineUI?.config?.bots??0))
    .map(b=>Object.freeze({
      id:b.index,progress:finite(b.progress),speed:Math.abs(finite(b.speed)),
      x:finite(b.mesh?.position?.x),y:finite(b.mesh?.position?.y),z:finite(b.mesh?.position?.z)
    })));
  const race=Object.freeze({mode,lap,gate,elapsed:finite(raceT),
    playing:redlineUI?.current==='race',rivals:rivals.length});
  redlinePublishedState=Object.freeze({
    tick:++redlinePublishedIndex,time,stepSeconds:fixedDt,
    world:REDLINE_WORLD,craft,race,rivals
  });
}
/* Reproducible fixed camera at the official RAVEN SLALOM checkpoint fraction.
 * Only the render camera is cloned; simulation state never moves for capture. */
window.REDLINE_CAPTURE_SHOWCASE = () => {
 const k=Math.round(.156*N)%N;
 const look=new THREE.Vector3(PX[k],35,PZ[k]);
 const position=new THREE.Vector3(PX[k]-TX[k]*180,150,PZ[k]-TZ[k]*180);
 const captureCamera=cam.clone();captureCamera.position.copy(position);captureCamera.lookAt(look);
 const target=Rn.getRenderTarget();
 try{Rn.setRenderTarget(null);Rn.render(S,captureCamera);return Object.freeze({dataURL:Rn.domElement.toDataURL('image/png'),point:'RAVEN SLALOM',routeFraction:.156,world:REDLINE_WORLD})}
 finally{Rn.setRenderTarget(target)}
};
function redlineSamplePose() {
  return {position:st.p.clone(),camera:cam.position.clone(),orientation:dr.quaternion.clone(),viewRotation:cam.quaternion.clone(),yaw:st.yaw};
}
function redlineSimulateFrame(dt) {
  const result = REDLINE_SIM_CLOCK.advance(dt, fixedDt => {
    redlinePreviousPose = redlineCurrentPose || redlineSamplePose();
    time += fixedDt;
    update(fixedDt);
    redlinePublishSimState(fixedDt);
    redlineCurrentPose = redlineSamplePose();
  });
  return result;
}
function redlineRenderInterpolated(dt, alpha) {
  // Restore authoritative render nodes immediately after drawing. Game state
  // never sees the interpolated pose and is safe for AI/replay/network reads.
  if (!redlinePreviousPose || !redlineCurrentPose || mode==='pause') {
    drawRedlineScene(dt); return;
  }
  const craft=dr.position.clone(),view=cam.position.clone(),craftQ=dr.quaternion.clone(),viewQ=cam.quaternion.clone();
  const blend=Math.max(0,Math.min(1,alpha));
  dr.position.lerpVectors(redlinePreviousPose.position,redlineCurrentPose.position,blend);
  cam.position.lerpVectors(redlinePreviousPose.camera,redlineCurrentPose.camera,blend);
  // Quaternion interpolation avoids the 2π discontinuity in yaw/roll on a turn.
  if(redlinePreviousPose.orientation&&redlineCurrentPose.orientation)
    dr.quaternion.copy(redlinePreviousPose.orientation).slerp(redlineCurrentPose.orientation,blend);
  if(redlinePreviousPose.viewRotation&&redlineCurrentPose.viewRotation)
    cam.quaternion.copy(redlinePreviousPose.viewRotation).slerp(redlineCurrentPose.viewRotation,blend);
  try { drawRedlineScene(dt); }
  finally {dr.position.copy(craft);cam.position.copy(view);dr.quaternion.copy(craftQ);cam.quaternion.copy(viewQ); }
}
window.REDLINE_SIM_DIAGNOSTICS = () => ({
  cameraChaseAimCenter:true,rotationInterpolation:true,
  hz:REDLINE_SIM_CLOCK.hz,ticks:REDLINE_SIM_CLOCK.ticks,
  alpha:REDLINE_SIM_CLOCK.alpha,droppedSeconds:REDLINE_SIM_CLOCK.droppedSeconds,
  x:st.p.x,y:st.p.y,z:st.p.z,yaw:st.yaw,
  interpolatedDisplayOnly:true,physicsInternalHz:REDLINE_FLIGHT.config.fixedHz
});
let last=performance.now();function loop(n){try{
   const dt=Math.min(.05,Math.max(0,(n-last)/1000));last=n;
  const inMenu=window.REDLINE_SHOWROOM&&redlineUI.current!=='race';
  if(inMenu){
   REDLINE_SIM_CLOCK.reset();redlinePreviousPose=null;redlineCurrentPose=null;
   time+=dt;
   REDLINE_SHOWROOM.update(dt);
   Rn.setRenderTarget(null);
   // V17.3: reserve the live 3D showroom for the intro and vehicle selector.
   // Other pages keep the red/black graphic background, not a drone under their text.
   if(redlineUI.current==='landing'||redlineUI.current==='solo'){
    Rn.domElement.style.visibility='visible';
    Rn.render(REDLINE_SHOWROOM.scene,REDLINE_SHOWROOM.camera);
    // Desktop keeps its full cinematic reveal. Mobile enters the usable menu
    // after its first safe render, even while the optional aircraft GLB finishes.
    if((REDLINE_SHOWROOM.ready&&REDLINE_SHOWROOM.selectedReady)||(REDLINE_MOBILE&&redlineUI?.current)){
     const curtain=document.getElementById('rlBootCurtain');
     if(curtain&&!curtain.classList.contains('rl-boot-done'))curtain.classList.add('rl-boot-done');
     window.REDLINE_BOOT_PHASE=REDLINE_SHOWROOM.ready&&REDLINE_SHOWROOM.selectedReady?'hangar-ready':'mobile-menu-ready';
    }
   }else{
    // v55: don't clear the WebGL drawing buffer on menu page changes.
    // Hide the canvas instead; the styled HTML menu stays visible underneath.
    Rn.domElement.style.visibility='hidden';
   }
  }
  else{
   Rn.domElement.style.visibility='visible';
    const tUpdate=performance.now();
    const stepResult=redlineSimulateFrame(dt);
    const updateMs=performance.now()-tUpdate;
    // v36 reliability: render-layer navigation is scheduled unconditionally
    // for an active race; it does not depend on HUD refresh or simulation ticks.
    redlineNavigationFrame(n);
    // v55: resize before rendering to avoid a blank drawing buffer.
    adaptQuality(n);
    const tRender=performance.now();
    redlineRenderInterpolated(dt,stepResult.alpha);
    const renderMs=performance.now()-tRender;
    window.REDLINE_STAGE1_LAST_RENDER=Object.freeze({
      drawCalls:Rn.info.render.calls,triangles:Rn.info.render.triangles,
      geometries:Rn.info.memory.geometries,textures:Rn.info.memory.textures,
      renderCPUms:renderMs,updateCPUms:updateMs,quality:qualityTier
    });
   REDLINE_FRAME_TIMING.samples++;
   REDLINE_FRAME_TIMING.updateMs+=updateMs;
   REDLINE_FRAME_TIMING.renderMs+=renderMs;
   REDLINE_FRAME_TIMING.maxUpdateMs=Math.max(REDLINE_FRAME_TIMING.maxUpdateMs,updateMs);
   REDLINE_FRAME_TIMING.maxRenderMs=Math.max(REDLINE_FRAME_TIMING.maxRenderMs,renderMs);
   if(REDLINE_FRAME_TIMING.samples>=90){
    const info={updateCPUms:REDLINE_FRAME_TIMING.updateMs/REDLINE_FRAME_TIMING.samples,
      renderSubmissionMs:REDLINE_FRAME_TIMING.renderMs/REDLINE_FRAME_TIMING.samples,
      worstUpdateMs:REDLINE_FRAME_TIMING.maxUpdateMs,worstRenderSubmissionMs:REDLINE_FRAME_TIMING.maxRenderMs,
      fps:liveFPS,drawCalls:Rn.info.render.calls,triangles:Rn.info.render.triangles,
      waterAllocationsPerStep:0,nearLookup:'exact-grid'};
    window.REDLINE_V42_PROFILE=info;
    REDLINE_FRAME_TIMING.samples=0;REDLINE_FRAME_TIMING.updateMs=0;REDLINE_FRAME_TIMING.renderMs=0;
    REDLINE_FRAME_TIMING.maxUpdateMs=0;REDLINE_FRAME_TIMING.maxRenderMs=0;
   }
  }

  if(captureNextFrame){captureNextFrame=false;try{
    const data=Rn.domElement.toDataURL('image/png');
    if(data.length>1000){const a=document.createElement('a');a.href=data;a.download='REDLINE_v10_capture.png';a.click();msg('SCREENSHOT SAVED',900)}
    else msg('SCREENSHOT UNSUPPORTED',900);
  }catch(err){console.warn('Capture unavailable',err);msg('SCREENSHOT FAILED',900)}}
  consecutiveLoopErrors=0;
  requestAnimationFrame(loop)}catch(err){
    console.error('REDLINE runtime exception',err);
    if(n-lastLoopFailure>7000)consecutiveLoopErrors=0;
    lastLoopFailure=n;consecutiveLoopErrors++;
    if(consecutiveLoopErrors<=2){
      window.REDLINE_LOOP_RETRY_COUNT=(window.REDLINE_LOOP_RETRY_COUNT||0)+1;
      requestAnimationFrame(loop);
    }else if(window.reportRedlineFatal)window.reportRedlineFatal(err);
    else reportRedlineError(err);
  }}
/* REDLINE v16 frontend controller, inlined after the game engine declarations. */
redlineUI=(()=>{
 const root=document.getElementById('rlShell'),screens=document.getElementById('rlScreens'),persistent=document.getElementById('rlPersistent');
 const read=()=>{try{return JSON.parse(localStorage.getItem('redline_v16_options')||'{}')}catch(e){return {}}};
 const saved=read();
 const config={course:'grand',bots:3,skin:0,model:'kestrel',view:0,brightness:100,volume:70,mouseSensitivity:50,pitchSensitivity:90,mouseControlMode:'locked',centeredAim:true,autoPointerLock:true,aimAssist:false,beginnerAssist:true,handlingMode:'easy',hudScale:'normal',hudMode:'cinematic',reducedMotion:false,...saved};
 // Migration: v27.7 saved 210% as the default. Do not keep its excessive pitch setting.
 if(config.pitchSensitivity>=200)config.pitchSensitivity=90;
  if(!['kestrel','blade','copper','spirit'].includes(config.model))config.model='kestrel';
 config.bots=Math.max(0,Math.min(3,Math.round(Number(config.bots)||0)));if(!['raven','grand'].includes(config.course))config.course='raven';if(!['easy','sport','expert'].includes(config.handlingMode))config.handlingMode='easy';
 let current='landing',backScreen='landing',ready=false,fromPause=false,history=[],frameClock=0,notificationTime=0,lastCountdown='',goUntil=0,lastSelect='landing',lastAimTarget=null;
 let openPanel=null,prePanelMode=null;const raceTiming=new Map();
 const aim={x:0,y:0,lock:false};
 const colors=['#f15a43','#b8c4ce','#e7bd6f','#94778f'];
 const uid=()=> 'PREVIEW BUILD';
 const save=()=>{try{localStorage.setItem('redline_v16_options',JSON.stringify(config))}catch(e){}};
 const esc=(v)=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const droneArt=()=>'';
 const head=()=>`<div class="rl-header"><button class="rl-brand-small" data-op="home" aria-label="REDLINE home">RED<span>LINE</span></button><button class="rl-subtle-btn rl-header-controls" data-op="controls">CONTROLS <span style="color:#f04d55">?</span></button><button class="rl-sign-btn" data-op="career">FLIGHT PASSPORT&nbsp; ↗</button></div>`;
 const title=(category,heading,subtitle)=>`<div class="rl-overline">${category}</div><h1 class="rl-section-title">${heading}</h1><p class="rl-section-desc">${subtitle}</p>`;
 function renderLanding(){return `<main class="rl-layout rl-home"><div class="rl-hero-copy"><div class="rl-overline">HIGH PERFORMANCE / NO LIMITS</div><h1 class="rl-logo">REDLINE</h1><div class="rl-rule"></div><p class="rl-tagline">Find the line.<br>Own the sky.</p><div class="rl-stack"><button class="rl-action primary" data-op="solo"><b>START RACING</b><span class="rl-arrow">↗</span></button><button class="rl-action" data-op="academy"><b>FLIGHT SCHOOL</b><span class="rl-arrow">↗</span></button><button class="rl-action" data-op="mp"><b>PRIVATE MULTIPLAYER <small class="rl-alpha-label">ALPHA</small></b><span class="rl-arrow">↗</span></button><button class="rl-action" data-op="settings"><b>SETTINGS</b><span class="rl-arrow">↗</span></button></div><div class="rl-home-progress">${REDLINE_PRODUCT.passportRibbon()}</div><div class="v25-hero-meta"><span>02 TRACKS</span><span>TIME ATTACK</span><span>LIVE GHOSTS</span></div></div><div class="rl-footer-mark">${redlineAirframeLabel(config.model)} <span> / </span> CHASE THE PERFECT RUN</div></main>`;}
 function meter(name,n){return `<div class="rl-stat-row"><span>${name}</span><div class="rl-meter"><i style="width:${n}%"></i></div><b>${n}</b></div>`}
  const courseChoices=[
  {name:'RAVEN SPRINT',subtitle:'4 gates · one timed sprint · ghost',live:true},
  {name:'GRAND GORGE',subtitle:'12 gates · 3 laps · endurance',live:true},
  {name:'COURSE 03',subtitle:'Not built',live:false}
 ];
 const finishNames=['EMBER','SILVER','SAND','VIOLET'];
 const courseThumb='{{REDLINE_ASSET_b0165594a2eb8d}}';
 const craftThumb='{{REDLINE_ASSET_4bd3b82a39afd7}}';
 function pickWheel(kind){
  const courseWheel=kind==='course';
  const items=courseWheel?courseChoices:finishNames.map((name,i)=>({name:'KESTREL X4',subtitle:name,live:true,finish:i}));
  return `<div class="rl-field rl-wheel-field"><div class="rl-wheel-header"><div class="rl-field-label" style="margin:0">${courseWheel?'COURSE':'VEHICLE / FINISH'} <span>${courseWheel?'02 / 02':'01 / 01 MODEL'}</span></div><div class="rl-wheel-controls"><button class="rl-wheel-arrow" type="button" data-wheel-nav="${kind}" data-direction="-1" aria-label="Scroll ${kind} left">‹</button><button class="rl-wheel-arrow" type="button" data-wheel-nav="${kind}" data-direction="1" aria-label="Scroll ${kind} right">›</button></div></div>
   <div class="rl-wheel-track" data-wheel="${kind}" tabindex="0" aria-label="Scroll to choose ${kind==='course'?'course':'vehicle finish'}">
    ${items.map((item,i)=>`<button class="rl-pick-card" type="button" ${!item.live?'disabled aria-disabled="true"':''} ${item.live?`data-${courseWheel?'course':'skin'}="${courseWheel?i:item.finish}"`:''} aria-pressed="${item.live&&(courseWheel?i===(config.course==='raven'?0:1):i===config.skin)}" title="${item.name} / ${item.subtitle}"><img src="${courseWheel?courseThumb:craftThumb}" alt="${courseWheel?'Grand Gorge racecourse screenshot':'Kestrel X4 in-game preview'}" draggable="false" loading="eager"/><span class="rl-pick-name">${item.name}${!courseWheel?' / '+item.subtitle:''}</span>${!courseWheel?`<span class="rl-pick-finish" style="background:${colors[i]}"></span>`:''}<span class="rl-pick-state">${!item.live?'LOCKED':courseWheel?(i===(config.course==='raven'?0:1)?'SELECTED':'SELECT'):i===config.skin?'EQUIPPED':'SELECT'}</span></button>`).join('')}
   </div><div class="rl-pick-sub">${courseWheel?'Stormline Sprint is a separate coastal industrial course with four sweeping sectors and ghosts. Grand Gorge is the full three-lap red canyon circuit.':'Four finishes for the same playable Kestrel X4. Click to update the live 3D hangar model.'}</div></div>`;
 }
  function renderAirframeStats(id){
    const stats=REDLINE_AIRFRAMES.stats(id,config.handlingMode,P.t,P.a);
    const items=[['CRUISE',stats.cruise,'U/S',stats.cruise/310*100],['BOOST TARGET',stats.boostSpeed,'U/S',stats.boostSpeed/350*100],['TURN @ 120',stats.turnDeg,'°/S',stats.turnDeg/190*100],['STRAFE',stats.strafe,'U/S',stats.strafe/115*100],['ACCEL',stats.acceleration,'U/S²',stats.acceleration/190*100]];
    return `<div class="rl61-spec-top"><b>${stats.role}</b><span>${String(config.handlingMode).toUpperCase()} / ENGINE DATA</span></div>
      <div class="rl61-spec-grid">${items.map(([label,value,unit,pct])=>`<div class="rl61-spec"><span>${label}</span><strong>${value}<small>${unit}</small></strong><i><em style="width:${Math.max(3,Math.min(100,pct)).toFixed(0)}%"></em></i></div>`).join('')}</div>
      <div class="rl61-spec-foot"><span>BOOST HOLD <b>${stats.boostSeconds}S</b></span><span>RECHARGE <b>${stats.rechargeSeconds}S</b></span></div>`;
  }
  function renderSolo(){const active=config.model,blade=active==='blade';
  const crafts=[
   {id:'kestrel',no:'01',name:'KESTREL X4',type:'VECTOR / FOUR-ROTOR',note:'Precise response. Four independently vectored lift units.'},
   {id:'blade',no:'02',name:'BLADE NOIR',type:'STEALTH / SIX-JET',note:'High-speed canyon racing with six articulated afterburners.'},
   {id:'copper',no:'03',name:'COPPER WRAITH',type:'INTERCEPTOR / TWIN ION',note:'Twin ion engines. Gyroscopic control with high-energy boost.'},
   {id:'spirit',no:'04',name:'SPIRIT NOCTURNE',type:'STEALTH / FLYING WING',note:'Wide flying-wing silhouette. Dual recessed exhausts and precision flight control.'}
  ];const select=crafts.find(x=>x.id===active)||crafts[0];
  return `<div class="rl-layout rl-garage v25-garage rl-vehicle-page rl34-vehicle-page rl38-vehicle-page rl45-vehicle-page">
    <header class="rl45-head"><button class="rl45-back" data-op="home" aria-label="Return to main menu">← BACK</button><div class="rl45-mark">REDLINE <span>/ HANGAR</span></div><span class="rl45-step">01 / 02</span></header>
    <div class="rl45-layout rl-select-layout">
     <aside class="rl-select-panel rl45-panel">
      <div class="rl45-kicker">THE FLEET <span>FOUR DISTINCT AIRFRAMES</span></div>
      <h1 class="rl45-title" id="rl38VehicleTitle">${select.name}</h1>
      <p class="rl45-deck-sub">ENGINEERED FOR THE EDGE OF CONTROL.</p>
      <div class="rl45-scroll-heading"><span>CHOOSE YOUR MACHINE</span><span class="rl45-count" id="rl45Count">${select.no} / 04</span></div>
      <div class="rl45-scroll-chrome"><button class="rl45-arrow" type="button" data-op="model-prev" aria-label="Previous aircraft">‹</button>
       <div class="rl45-airframe-track" id="rl45ModelTrack" role="group" aria-label="Scroll horizontally or use the mouse wheel to select an airframe" tabindex="0">
       ${crafts.map(c=>`<button type="button" class="rl45-airframe ${active===c.id?'selected':''}" data-model="${c.id}" aria-pressed="${active===c.id}">
        <span class="rl45-card-no">${c.no}</span><span class="rl45-card-name">${c.name}</span><span class="rl45-card-type">${c.type}</span><span class="rl45-card-status">${active===c.id?'SELECTED':'SELECT'} <span>↗</span></span></button>`).join('')}
       </div><button class="rl45-arrow" type="button" data-op="model-next" aria-label="Next aircraft">›</button></div>
      <div class="rl45-scroll-instruction"><span>↔</span> SCROLL TO BROWSE <span class="rl45-progress"><i id="rl45Progress" style="transform:translateX(${active==='spirit'?300:active==='copper'?200:active==='blade'?100:0}%)"></i></span></div>
      <p class="rl38-airframe-description rl45-description" id="rl38AirframeDescription">${REDLINE_AIRFRAMES.get(active).description}</p>
       <div id="rl61HangarSpecs" class="rl61-performance">${renderAirframeStats(active)}</div>
      <div id="rl38FinishOptions" ${active!=='kestrel'?'hidden':''}><div class="rl45-options-label">KESTREL FINISH <span id="rl34FinishCount">${String(config.skin+1).padStart(2,'0')} / 04</span></div>
       <div class="rl34-finishes" role="group" aria-label="Select Kestrel finish">${finishNames.map((name,i)=>`<button class="rl34-finish" type="button" data-skin="${i}" aria-pressed="${i===config.skin}" aria-label="Select ${name} finish"><span class="rl34-finish-swatch" style="--finish-color:${['#c77e58','#dce4e9','#d7be83','#a792cd'][i]}"></span><span>${name}</span></button>`).join('')}</div>
      </div>
      <details class="rl34-more-options rl45-advanced"><summary>PILOT / TRAIL SETTINGS <span>＋</span></summary>${REDLINE_PRODUCT.garageModule()}</details>
      <div class="rl-select-actions rl45-actions"><button class="rl45-continue" data-op="course-next"><b>CONTINUE TO CIRCUIT</b><span>↗</span></button></div>
      <div class="rl45-bottom-meta">LIVE 3D HANGAR <span>·</span> DRAG THE MODEL TO ORBIT</div>
     </aside>
     <section class="rl-model-stage rl45-stage" aria-label="Interactive 3D ${select.name} aircraft, drag to rotate" title="Drag to rotate aircraft">
       <div class="rl-model-readout rl45-model-readout"><span class="rl45-readout-kicker">AIRFRAME / LIVE VIEW</span><h3 id="rl38ModelLabel">${select.name}</h3><span class="rl-flyer-label" id="rl3DFinish">${active==='spirit'?'GRAPHITE BLACK · LOW-IR DUAL EXHAUST':active==='copper'?'TWIN ION · COPPER / GRAPHITE':active==='blade'?'MIDNIGHT BLACK · SIX JETS':finishNames[config.skin]+' / LIVERY '+String(config.skin+1).padStart(2,'0')}</span></div>
       <span class="rl45-stage-mark">REDLINE<span>©</span></span>
     </section>
    </div>
   </div>`;
 }

 function renderCourses(){return `<div class="rl-layout rl-track-select rl34-course-page"><button class="rl-back" data-op="solo">← VEHICLE</button>
 <div class="rl34-course-top"><span class="rl-overline">02 / CIRCUIT</span><h1>SELECT TRACK<span class="rl34-title-period">.</span></h1></div>
 <div class="rl-track-picker">${REDLINE_PRODUCT.courseDeck(config.course)}</div>
 <div class="rl-track-controls"><div class="rl-field"><div class="rl-field-label">AI RIVALS <span id="rlBotCount">${config.bots===0?'SOLO':config.bots+' RIVALS'}</span></div><div class="rl-number-row">${[0,1,2,3].map(x=>`<button class="rl-chip" data-bots="${x}" aria-pressed="${config.bots===x}">${x}</button>`).join('')}</div></div>
 <button class="rl-action primary" data-op="launch"><b>RACE ${config.course==='raven'?'RAVEN SPRINT':'GRAND GORGE'}</b><span class="rl-arrow">↗</span></button></div></div>`;}
 function settingRow(label,id,type,attr,value,summary){return `<div class="rl-setting"><label for="${id}">${label}</label>${type==='range'?`<input id="${id}" type="range" min="${attr[0]}" max="${attr[1]}" value="${value}">`:type==='check'?`<input id="${id}" type="checkbox" ${value?'checked':''}>`:`<select id="${id}">${attr.map(k=>`<option ${k===value?'selected':''}>${k}</option>`).join('')}</select>`}<strong id="${id}Out">${type==='range'?value+'%':type==='check'?(value?'ON':'OFF'):''}</strong></div>${summary?`<div class="rl-setting-note" style="margin:-8px 0 17px 170px">${summary}</div>`:''}`}
 function renderSettings(){return `<div class="rl-layout"><button class="rl-back" data-op="back">← BACK</button>${title('SYSTEM / CONFIGURATION','SETTINGS','Personalize comfort, clarity and flight handling. Changes apply immediately and are stored locally in your browser.')}<div class="rl-settings-panel">${settingRow('FLIGHT HANDLING','rlHandlingMode','select',['easy','sport','expert'],config.handlingMode,'Easy is recommended: lower speed, smoother cornering, softer impacts. Sport and Expert restore faster racing.')}${settingRow('BRIGHTNESS','rlBrightness','range',[65,145],config.brightness,'Scene exposure; keep enough detail in shadowed canyon walls.')}${settingRow('MASTER VOLUME','rlVolume','range',[0,100],config.volume,'Engine, laser and ambient audio.')}${settingRow('MOUSE STEERING','rlSensitivity','range',[15,100],config.mouseSensitivity,'Move the mouse left and right to turn while captured.')}${settingRow('PITCH SENSITIVITY','rlPitchSensitivity','range',[30,180],config.pitchSensitivity,'Mouse down pitches the nose downward. Mouse up pitches upward. FPV follows the nose.')}${settingRow('MOUSE FLIGHT MODE','rlMouseControlMode','select',['locked','classic'],config.mouseControlMode,'Locked: steer freely; E fires only. Classic: hold right mouse to steer. Mouse double-click recaptures only.')}${settingRow('CENTERED AIM','rlCenteredAim','check',null,config.centeredAim,'Keep the targeting reticle fixed at screen center.')}${settingRow('CAPTURE ON RACE START','rlAutoPointerLock','check',null,config.autoPointerLock,'Request pointer lock from the race-start click (requires browser permission).')}${settingRow('AIM ASSIST','rlAimAssist','check',null,config.aimAssist,'Adds gentle magnetic assistance around visible moving rivals.')}${settingRow('FLIGHT ASSIST','rlFlightAssist','check',null,config.beginnerAssist,'Automatically slows dangerous turns and approaching walls in Easy mode; softens collision recovery.')}${settingRow('HUD SIZE','rlHudSize','select',['normal','large'],config.hudScale,'Increase important race telemetry for legibility.')}${settingRow('RACE HUD','rlHudMode','select',['cinematic','race','tactical'],REDLINE_HUD.valid(config.hudMode),'Cinematic keeps lap, transparent minimap, speed and boost without panel clutter. Race adds checkpoints; Tactical restores combat systems. Press Y to switch.')}${settingRow('REDUCE MOTION','rlMotion','check',null,config.reducedMotion,'Reduces decorative menu and result animations.')}<div class="rl-btnrow" style="margin-top:20px"><button class="rl-action primary" data-op="back">SAVE & RETURN <span class="rl-arrow">✓</span></button></div></div></div>`}
 function renderControls(){return `<div class="rl-layout"><button class="rl-back" data-op="back">← BACK</button>${title('FLIGHT MANUAL','CONTROLS','Move the mouse freely to steer and pitch the drone once the pointer is captured. Double-tap to capture after Esc; E fires, F reloads, SPACE shields, and J stops immediately. W/S drive, A/D strafe, and arrow keys control elevation. In Easy mode, the drone automatically slows for sharp turns.')}<div class="rl-controls-grid">${REDLINE_BINDINGS.manualHTML('menu')}</div><p class="rl-muted-text" style="margin-top:25px;max-width:690px">All keys except WASD can be changed from Settings. If you get lost, use your recovery key to return near the next gate.</p><div class="rl-btnrow" style="margin-top:20px;max-width:440px"><button class="rl-action primary" data-op="settings">CHANGE KEYBINDS <span class="rl-arrow">›</span></button><button class="rl-action" data-op="back">RETURN <span class="rl-arrow">↗</span></button></div></div>`}
 function renderMP(){return REDLINE_ONLINE.menuHTML()}
 function renderLobby(){return REDLINE_ONLINE.lobbyHTML()}
 function renderLoading(){return `<div class="rl-layout" style="display:flex;align-items:center"><div><div class="rl-overline">RACE PREPARATION / LOADING</div><h1 class="rl-section-title" style="margin-top:20px;font-size:clamp(52px,9vw,118px)">${config.course==='raven'?'RAVEN SPRINT':'GRAND GORGE'}</h1><p class="rl-section-desc">Calibrating ${redlineAirframeLabel(config.model)} controls and initializing the selected race session.</p><div class="rl-progress"></div><p class="rl-overline" style="color:#e85b61">FLIGHT COMPUTER / ARMING</p></div></div>`}
 function podium(rank){return rank===1?'1ST':rank===2?'2ND':rank===3?'3RD':`${rank}TH`}
 function renderResults(){
  if(REDLINE_ONLINE.isRacing)return REDLINE_ONLINE.resultHTML();
  const player={name:'YOU',progress:config.course==='raven'?.33:3,finish:raceT,me:true};
  const bots=CLASH.gameMode==='trial'?[]:CLASH.bots.filter(b=>b.index<config.bots).map(b=>({
   name:b.label,progress:b.progress,finish:config.course==='raven'?b.sprintFinishSec:
    (b.completedLaps>=3?b.lapTimes.reduce((a,c)=>a+c,0):null),me:false
  }));
  const rows=[player,...bots].sort((a,b)=>{
   if(a.finish!==null&&b.finish===null)return -1;
   if(a.finish===null&&b.finish!==null)return 1;
   return a.finish!==null?a.finish-b.finish:b.progress-a.progress;
  });
  const rank=rows.findIndex(x=>x.me)+1;
  const progress=REDLINE_PRODUCT.snapshot(),record=progress.records?.[config.course];
  const last=progress.lastResult?.course===config.course?progress.lastResult:null;
  return window.REDLINE_RESULT_VIEW({online:false,trial:CLASH.gameMode==='trial',rank,
   course:config.course==='raven'?'STORMLINE SPRINT':'GRAND GORGE',
   airframe:redlineAirframeLabel(config.model),time:raceT,
   rows:rows.map(x=>({name:x.name,me:x.me,time:Number.isFinite(x.finish)?x.finish:null})),
   best:Number.isFinite(record?.best)?record.best:null,
   priorBest:Number.isFinite(last?.priorBest)?last.priorBest:null,
   medal:last?.medal||null,personalBest:!!last?.personalBest,
   xp:last?.xp||0,sectors:lastSectors});
 }
 function setHandlingMode(value){if(!['easy','sport','expert'].includes(value))return;config.handlingMode=value;applySettings();for(const id of ['rlHandlingMode','rlRaceHandlingMode']){const el=$(id);if(el)el.value=value;}}
 function setHudMode(value){config.hudMode=REDLINE_HUD.valid(value);applySettings();syncRaceSettings();return config.hudMode;}
 function applySettings(){
  config.mouseControlMode=config.mouseControlMode==='classic'?'classic':'locked';
  config.pitchSensitivity=cl(Number(config.pitchSensitivity)||90,30,180);
  if(document.pointerLockElement===Rn.domElement&&mode==='run'&&window.REDLINE_MOUSE_ALT){
   const desired=config.mouseControlMode==='locked'?'locked':'classic';
   if(desired==='locked'&&REDLINE_MOUSE_ALT.style!=='locked')REDLINE_MOUSE_ALT.begin('locked',FL.yaw);
   else if(desired==='classic'&&REDLINE_MOUSE_ALT.style==='locked')REDLINE_MOUSE_ALT.reset();
  }
  if(config.centeredAim){aim.x=0;aim.y=0;}
  save();const trail=REDLINE_PRODUCT.trailHex();for(const mesh of BOOST_TRAILS){mesh.material.color.setHex(trail);}BOOST_PULSE.material.color.setHex(trail);Rn.toneMappingExposure=.93*config.brightness/100;
  document.body.classList.toggle('rl-reduced-motion',!!config.reducedMotion);
  document.body.classList.toggle('rl-large-hud',config.hudScale==='large');
  config.hudMode=REDLINE_HUD.apply(document.body,config.hudMode);
  REDLINE_AUDIO_ENGINE.setVolume(config.volume/100);REDLINE_AUDIO_ENGINE.setMuted(soundMuted);
  if(CLASH.liveryMaterial){CLASH.liveryIndex=config.skin;CLASH.liveryMaterial.color.setHex([0xff763b,0x70dbff,0xffd081,0xc69cf9][config.skin]);}
 }
 function show(screen){
  if(screen!=='settings')REDLINE_BINDINGS.cancelCapture();
  current=screen;
  if(screen!=='solo')garageExitSerial++;
  document.body.dataset.redlineScreen=screen;
  document.body.classList.toggle('rl-menu',screen!=='race');document.body.classList.toggle('rl-play',screen==='race');
  document.body.classList.toggle('rl-showroom-active',screen==='landing'||screen==='solo'||screen==='academy'||screen==='career');
  root.style.display='block';
  const playing=screen==='race';if(!playing&&openPanel){closeRacePanel(false);}screens.classList.toggle('hidden',playing);persistent.classList.toggle('hidden',!playing);
  if(!playing){screens.innerHTML=head()+({'landing':renderLanding,'solo':renderSolo,'course':renderCourses,'career':()=>REDLINE_PRODUCT.careerScreen(),'academy':()=>REDLINE_PRODUCT.academyScreen(),'settings':renderSettings,'controls':renderControls,'multiplayer':renderMP,'lobby':renderLobby,'loading':renderLoading,'results':renderResults}[screen]||renderLanding)();screens.scrollTop=0;if(screen==='solo')updateGarageChoices(false);if(screen==='solo'&&config.model==='blade'&&!window.REDLINE_BLADE_READY)loadBladeFlightArt().catch(()=>{});if(screen==='solo'&&config.model==='copper'&&!window.REDLINE_COPPER_READY)loadCopperFlightArt().catch(()=>{});if(screen==='solo'&&config.model==='spirit'&&!window.REDLINE_SPIRIT_READY)loadSpiritFlightArt().catch(()=>{});if(screen==='settings')REDLINE_BINDINGS.mount(screens.querySelector('.rl-settings-panel'));}
  document.body.classList.toggle('rl-cockpit',playing&&config.view===1);
  document.body.classList.toggle('rl-online-race',playing&&REDLINE_ONLINE.isRacing);
  $('rlCockpitVis').style.display=playing&&config.view===1?'block':'none';
  if(!playing&&screen!=='loading'){if(document.pointerLockElement===Rn.domElement)document.exitPointerLock?.();}
  if(playing){
   aim.x=0;aim.y=0;lastAimTarget=null;
   redlineNavLastTs=0;
   radarFrame=0;
   redlineRadarRouteCache=null;
   redlineNavHistory.length=0;
   // The map is an always-visible race instrument, including countdown/pause.
   // If a route isn't ready yet, the regular flight loop retries on next frame.
   try{drawRadar()}catch(err){console.warn('REDLINE radar awaiting race state',err)}
  }
  updateMouseUnlocked();REDLINE_BINDINGS.updateControls();
  if(!playing)window.REDLINE_MOBILE_CONTROLS?.setActive?.(false);
 }
 function go(target){if(current==='race'&&(target==='settings'||target==='controls')){openRacePanel(target);return;}if(target==='settings'||target==='controls'){
   history.push(current);if(current==='race'&&mode==='run'){fromPause=true;mode='pause'}show(target);
  }else{history.length=0;fromPause=false;show(target);if(target==='landing'||target==='solo'||target==='multiplayer'||target==='lobby'){if(mode!=='load')mode='ready';}}
 }
 function back(){const prev=history.pop()||'landing';if(prev==='race'&&fromPause){fromPause=false;mode='run';show('race');requestPointer()}else show(prev)}
 function requestPointer(){
  // Pointer lock is a desktop mouse feature; the mobile HUD has multitouch input.
  if(window.REDLINE_MOBILE_CONTROLS?.available)return;
  try{Rn.domElement.requestPointerLock?.()}catch(e){}
 }
 function launch(){if(!ready){notify('ENVIRONMENT STILL LOADING','Try again when the game is ready','warning');return}if(current==='loading')return;
  // The pilot must not enter the race as an invisible (still-loading) Spirit.
  if(config.model==='spirit'&&!window.REDLINE_SPIRIT_READY){
   show('loading');loadSpiritFlightArt().then(()=>{if(current==='loading'){
    show('course');launch();}}).catch(()=>{if(current==='loading')show('course');console.error('Spirit race launch deferred: asset unavailable');});return;
  }
  // Rebuild the full 3D world only when the selected course differs.
  if(!REDLINE_ONLINE.isRacing&&config.course!==REDLINE_WORLD){
   try{sessionStorage.setItem('redline_v27_launch_after_world_swap','1')}catch(_){}
   save();show('loading');window.location.reload();return;
  }
  history.length=0;fromPause=false;if(config.autoPointerLock)requestPointer();show('loading');
  setTimeout(()=>{CLASH.gameMode=config.bots===0?'trial':'clash';reset();applySettings();startEngineAudio();mode='count';cd=3.2;goUntil=0;show('race');if(config.autoPointerLock)requestPointer();},650);
 }
 function notify(title,detail='',kind='warning'){
 if(current!=='race')return;
 // Game flow remains visible without forcing the player to look away from
 // the gates. The main announcement is reserved for race-defining outcomes.
 const major=/^(DRONE DISABLED|RACE COMPLETE|VICTORY|RACE FINISHED|FINAL LAP|FINISH LINE)/i.test(title);
 if(!major){
  clashSpeak((title+(detail?' · '+detail:'')).replace(/\s*\/\/\s*/g,' · '),
   /HULL|CONTACT|FLOW|GATE|SECTOR|RELOADED|CHECKPOINT/i.test(title)?680:950);
  return;
 }
 const el=$('rlToast');
 el.className='';void el.offsetWidth;
 el.innerHTML='<b>'+esc(title)+'</b><small>'+esc(detail)+'</small>';
 el.className='visible '+kind+' notice';
 notificationTime=performance.now()+1250;
}
 function results(){if(REDLINE_ONLINE.isRacing)REDLINE_ONLINE.finish();else REDLINE_PRODUCT.result({course:redlineUI.config.course,time:raceT,rank:CLASH.gameMode==='trial'?1:CLASH.lastPlace,opponents:redlineUI.config.bots,sectors:lastSectors});document.body.classList.remove('rl-cockpit');show('results');}

function syncRaceSettings(){
 const v={rlRaceBrightness:config.brightness,rlRaceVolume:config.volume,rlRaceSensitivity:config.mouseSensitivity,rlRacePitchSensitivity:config.pitchSensitivity,rlRaceMouseControlMode:config.mouseControlMode,rlRaceCenteredAim:config.centeredAim,rlRaceAutoPointerLock:config.autoPointerLock,rlRaceHudSize:config.hudScale,rlRaceHudMode:REDLINE_HUD.valid(config.hudMode),rlRaceAimAssist:config.aimAssist,rlRaceFlightAssist:config.beginnerAssist,rlRaceHandlingMode:config.handlingMode,rlRaceMotion:config.reducedMotion};
 for(const [id,value]of Object.entries(v)){const el=$(id);if(!el)continue;if(el.type==='checkbox')el.checked=!!value;else el.value=value;const out=$(id+'Out');if(out)out.textContent=el.type==='range'?value+'%':'';}
}
function racePanelOpen(){return !!openPanel}
function openRacePanel(which){
 if(current!=='race')return;
 if(openPanel===which){closeRacePanel(true);return;}
 if(!openPanel){prePanelMode=REDLINE_ONLINE.isRacing?null:mode;if(!REDLINE_ONLINE.isRacing&&(mode==='run'||mode==='count'))mode='pause';}
 openPanel=which;
 window.REDLINE_MOBILE_CONTROLS?.setActive?.(false);
 for(const [name,id]of [['controls','rlRaceControlsPanel'],['settings','rlRaceSettingsPanel']]){
  const el=$(id);el?.classList.toggle('open',name===which);if(el)el.setAttribute('aria-hidden',String(name!==which));
 }
 $('rlRaceShade').classList.add('open');$('rlRaceShade').classList.toggle('settings-mode',which==='settings');$('rlRaceShade').setAttribute('aria-hidden','false');
 root.querySelectorAll('#rlGameButtons [data-op="controls"],#rlGameButtons [data-op="settings"]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.op===which)));
 if(which==='settings'){syncRaceSettings();REDLINE_BINDINGS.mount($('rlRaceSettingsPanel'));}
 if(document.pointerLockElement===Rn.domElement)document.exitPointerLock?.();
 REDLINE_VCURSOR.set(false);
}
function closeRacePanel(refocus=true){
 if(!openPanel)return;
 openPanel=null;
 $('rlRaceShade').classList.remove('open','settings-mode');$('rlRaceShade').setAttribute('aria-hidden','true');
 for(const id of ['rlRaceControlsPanel','rlRaceSettingsPanel']){$(id).classList.remove('open');$(id).setAttribute('aria-hidden','true');}
 root.querySelectorAll('#rlGameButtons [aria-expanded]').forEach(b=>b.setAttribute('aria-expanded','false'));
 if(prePanelMode!==null){mode=prePanelMode;prePanelMode=null;}REDLINE_BINDINGS.cancelCapture();
 // Opening panels releases the pointer. Closing from a click can recapture it.
 if(refocus&&current==='race')requestPointer();
 updateMouseUnlocked();
}
function resetTiming(){raceTiming.clear()}
function continuousHumanProgress(){
 const idx=near(st.p.x,st.p.z);let u=idx/N;
 // The final ring sits at spline t=0; allow progress beyond lap end while approaching it.
 if(gate===11&&u<.12)u+=1;
 else if(gate===0&&u>.92)u=0;
 return Math.max(0,lap-1+u);
}
function recordProgress(key,progress,t){
 let h=raceTiming.get(key);if(!h){h=[];raceTiming.set(key,h)}
 const last=h[h.length-1];
 // Avoid timing spikes due to nearest-spline projection occasionally moving backward.
 const p=last?Math.max(last.p,progress):progress;
 if(!last||t-last.t>=.085){h.push({p,t});if(h.length>2100)h.shift();}
}
function crossingTime(key,progress){
 const h=raceTiming.get(key);if(!h||h.length<2)return null;
 if(progress<h[0].p-.0001||progress>h[h.length-1].p+.0001)return null;
 for(let i=h.length-1;i>0;i--){const a=h[i-1],b=h[i];if(a.p<=progress&&b.p>=progress&&b.p>a.p+.000001)
  return a.t+(b.t-a.t)*Math.max(0,Math.min(1,(progress-a.p)/(b.p-a.p)));}
 return null;
}
function estimatedInterval(row,player){
 if(row.me)return 'RACING';
 const ahead=row.progress>player.progress;
 // Real elapsed time at the SAME track position (not metres converted using arbitrary speed).
 const clock=ahead?crossingTime(row.key,player.progress):crossingTime('pilot',row.progress);
 if(clock!==null&&raceT>=clock){return (ahead?'+':'−')+Math.min(999,raceT-clock).toFixed(1)+'s';}
 // Before enough history exists, transparently label the estimate with ≈.
 const observed=row.bot?.lastLapSeconds||row.bot?.lapGoal||45;
 const samplePace=Number.isFinite(best)&&best>12&&best<200?best:45;
 const pace=(observed+samplePace)*.5;
 return '≈'+(ahead?'+':'−')+Math.min(999,Math.abs(row.progress-player.progress)*pace).toFixed(1)+'s';
}

 function onClick(e){const el=e.target.closest('button');if(!el||!root.contains(el)||el.disabled)return;
  if(el.dataset.op?.startsWith('net-')&&REDLINE_ONLINE.bind(el.dataset.op))return;
  const skin=el.dataset.skin,bots=el.dataset.bots,course=el.dataset.course,modelChoice=el.dataset.model;
  if(el.dataset.trail!==undefined){if(REDLINE_PRODUCT.setTrail(el.dataset.trail)){screens.querySelectorAll('[data-trail]').forEach(b=>{const active=Number(b.dataset.trail)===REDLINE_PRODUCT.snapshot().trail;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});applySettings();}return;}
  if(el.dataset.op==='model-prev'||el.dataset.op==='model-next'){
    const order=['kestrel','blade','copper','spirit'],index=order.indexOf(config.model);
    screens.querySelector(`[data-model="${order[(index+(el.dataset.op==='model-next'?1:3))%4]}"]`)?.click();
    return;
  }
  if(el.dataset.wheelNav){const row=screens.querySelector(`[data-wheel="${el.dataset.wheelNav}"]`);if(row){const dir=Number(el.dataset.direction)||1;row.scrollBy({left:dir*(row.clientWidth*.80),behavior:'smooth'});}return;}
  if(course!==undefined){config.course=Number(course)===0?'raven':'grand';save();updateGarageChoices();return;}
  if(modelChoice!==undefined){
    if(!['kestrel','blade','copper','spirit'].includes(modelChoice))return;
    config.model=modelChoice;save();
    if(modelChoice==='blade'&&!window.REDLINE_BLADE_READY)loadBladeFlightArt().catch(()=>{});
    if(modelChoice==='copper'&&!window.REDLINE_COPPER_READY)loadCopperFlightArt().catch(()=>{});
    if(modelChoice==='spirit'&&!window.REDLINE_SPIRIT_READY)loadSpiritFlightArt().catch(()=>{});
    redlineSyncAirframe();updateGarageChoices();return;
  }
  if(skin!==undefined){config.skin=+skin;applySettings();updateGarageChoices();return}
  if(bots!==undefined){config.bots=+bots;save();updateGarageChoices();return}
  if(el.dataset.flowAction){clashFlowAction(el.dataset.flowAction);return;}
  if(el.dataset.op==='trainingFromGarage'){if(REDLINE_ONLINE.isRacing){notify('FLIGHT SCHOOL IS SOLO','Leave the multiplayer session before training','warning');return;}config.course='raven';save();localStorage.removeItem('redline_raven_training_v22_done');launch();return;}
  switch(el.dataset.op){case'career':go('career');break;case'academy':go('academy');break;case'home':if(mode==='run')mode='pause';if(REDLINE_ONLINE.active)REDLINE_ONLINE.leave(true);redlineGarageExit('landing');break;case'solo':if(REDLINE_ONLINE.active)REDLINE_ONLINE.leave(true);go('solo');break;case'course-next':if(['copper','spirit'].includes(config.model)&&!(config.model==='spirit'?window.REDLINE_SPIRIT_READY:window.REDLINE_COPPER_READY)){el.disabled=true;el.querySelector('b').textContent='LOADING '+redlineAirframeLabel(config.model);(config.model==='spirit'?loadSpiritFlightArt():loadCopperFlightArt()).then(()=>redlineGarageExit('course')).catch(()=>{el.disabled=false;el.querySelector('b').textContent='RETRY MODEL LOAD';});}else redlineGarageExit('course');break;case'mp':if(REDLINE_WORLD!=='grand'){
   config.course='grand';save();
   try{sessionStorage.setItem('redline_v27_online_after_swap','1')}catch(_){}
   show('loading');window.location.reload();
  }else go(REDLINE_ONLINE.active?'lobby':'multiplayer');break;case'lobby':go('lobby');break;case'back':back();break;case'controls':go('controls');break;case'settings':go('settings');break;case'closePanel':closeRacePanel(true);break;case'auth':break;case'launch':launch();break;case'replay':if(REDLINE_ONLINE.active){REDLINE_ONLINE.leave(true);go('multiplayer')}else launch();break;case'tutorial':REDLINE_GUIDE.start();break;case'restartRun':restartSprint();break;case'camera':config.view=1-config.view;applySettings();show('race');requestPointer();break;case'pause':if(mode==='run')go('settings');else if(mode==='pause')back();break;case'center':aim.x=0;aim.y=0;break}
 }
 // v46: one cancellable handoff owns BOTH the page fade and the 3D departure.
 let garageExitSerial=0;
 function redlineGarageExit(target){
  if(current!=='solo'||config.reducedMotion){go(target);return;}
  const page=screens.querySelector('.rl45-vehicle-page');
  if(!page){go(target);return;}
  if(page.classList.contains('rl45-leaving'))return;
  const serial=++garageExitSerial;
  page.classList.add('rl45-leaving');
  window.REDLINE_SHOWROOM?.beginExit?.();
  // Time matches rl46-page-exit; never use animationend (can be lost on tab change).
  setTimeout(()=>{if(serial===garageExitSerial&&current==='solo')go(target);},640);
 }
 const REDLINE_GARAGE_ORDER=['kestrel','blade','copper','spirit'];
 const redlineWheelGesture={sum:0,locked:false,last:0,unlockTimer:0};
 let redlineScrollSource='program',redlineScrollGuardUntil=0,redlineScrollSettleTimer=0;
 function redlineStepModel(direction){
  if(current!=='solo'||screens.querySelector('.rl45-leaving'))return;
  const index=Math.max(0,REDLINE_GARAGE_ORDER.indexOf(config.model));
  const next=REDLINE_GARAGE_ORDER[(index+(direction>0?1:3))%4];
  if(next!==config.model)screens.querySelector(`[data-model="${next}"]`)?.click();
 }
 function redlineModelScroll(e){
  if(current!=='solo')return false;
  const deck=e.target.closest?.('.rl45-airframe-track, .rl45-stage');
  if(!deck)return false;
  // No native scroll on mouse wheel: browser momentum, CSS snap and the UI
  // selector must never compete for control of the same horizontal position.
  e.preventDefault();
  if(screens.querySelector('.rl45-leaving'))return true;
  const raw=Math.abs(e.deltaY)>Math.abs(e.deltaX)?e.deltaY:e.deltaX;
  const delta=raw*(e.deltaMode===1?24:e.deltaMode===2?200:1);
  if(Math.abs(delta)<.01)return true;
  const now=performance.now();
  if(now-redlineWheelGesture.last>300){redlineWheelGesture.sum=0;redlineWheelGesture.locked=false;}
  redlineWheelGesture.last=now;
  if(!redlineWheelGesture.locked){
   redlineWheelGesture.sum+=delta;
   if(Math.abs(redlineWheelGesture.sum)>=45){
    redlineWheelGesture.locked=true;
    redlineStepModel(redlineWheelGesture.sum>0?1:-1);
   }
  }
  clearTimeout(redlineWheelGesture.unlockTimer);
  redlineWheelGesture.unlockTimer=setTimeout(()=>{redlineWheelGesture.sum=0;redlineWheelGesture.locked=false;},305);
  return true;
 }
 // Touch gestures deliberately select only once AFTER kinetic scrolling settles.
 function redlineScheduleScrollSettle(track){
  clearTimeout(redlineScrollSettleTimer);
  redlineScrollSettleTimer=setTimeout(()=>{
   if(current!=='solo'||track!==screens.querySelector('#rl45ModelTrack'))return;
   const center=track.scrollLeft+track.clientWidth*.5;
   let closest=null,dist=Infinity;
   for(const b of track.querySelectorAll('[data-model]')){
    const mid=b.offsetLeft-track.offsetLeft+b.clientWidth*.5;
    const d=Math.abs(mid-center);
    if(d<dist){closest=b;dist=d;}
   }
   redlineScrollSource='program';
   if(closest&&closest.dataset.model!==config.model)closest.click();
   else redlineCenterSelectedModel(true);
  },175);
 }
 function redlineCenterSelectedModel(smooth=true){
  clearTimeout(redlineScrollSettleTimer);
  const track=screens.querySelector('#rl45ModelTrack');
  const target=track?.querySelector(`[data-model="${config.model}"]`);
  if(!track||!target)return;
  const left=target.offsetLeft-track.offsetLeft-(track.clientWidth-target.clientWidth)/2;
  redlineScrollGuardUntil=performance.now()+(smooth?800:100);
  redlineScrollSource='program';
  track.scrollTo({left,behavior:config.reducedMotion||!smooth?'instant':'smooth'});
 }
 function updateGarageChoices(animateScroll=true){
  screens.querySelectorAll('[data-course]').forEach(b=>{const chosen=Number(b.dataset.course)===(config.course==='raven'?0:1);b.classList.toggle('selected',chosen);b.setAttribute('aria-pressed',String(chosen));const state=b.querySelector('.rl-pick-state');if(state)state.textContent=chosen?'SELECTED':'SELECT';const record=b.querySelector('.rl34-course-record span');if(record)record.textContent=chosen?'SELECTED':'SELECT ↗';});
  screens.querySelectorAll('[data-skin]').forEach(b=>{const active=Number(b.dataset.skin)===config.skin;b.setAttribute('aria-pressed',String(active));const label=b.querySelector('.rl-pick-state');if(label)label.textContent=active?'EQUIPPED':'SELECT';});
  screens.querySelectorAll('[data-bots]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.bots)===config.bots)));
  const botCount=$('rlBotCount');if(botCount)botCount.textContent=config.bots===0?'TIME ATTACK':config.bots+' RIVALS';
  const launchButton=screens.querySelector('.rl-track-controls [data-op=launch] b, .rl-select-actions [data-op=launch] b');if(launchButton)launchButton.textContent='RACE '+(config.course==='raven'?'RAVEN SPRINT':'GRAND GORGE');
  const info={kestrel:{title:'KESTREL X4',no:'01',note:'Precise response. Four independently vectored lift units.',tag:'VECTOR ROTOR / FOUR LIFTS'},
    blade:{title:'BLADE NOIR',no:'02',note:'High-speed canyon racing with six articulated afterburners.',tag:'MIDNIGHT BLACK · SIX JETS'},
    copper:{title:'COPPER WRAITH',no:'03',note:'Twin ion engines. Gyroscopic control with high-energy boost.',tag:'TWIN ION · COPPER / GRAPHITE'},
    spirit:{title:'SPIRIT NOCTURNE',no:'04',note:'Dual recessed exhausts. Stealth flying wing with precise high-speed handling.',tag:'GRAPHITE BLACK · LOW-IR DUAL EXHAUST'}};
  const selected=info[config.model]||info.kestrel;
  screens.querySelectorAll('[data-model]').forEach(b=>{
    const chosen=b.dataset.model===config.model;
    b.classList.toggle('selected',chosen);b.setAttribute('aria-pressed',String(chosen));
    const chip=b.querySelector('.rl45-card-status');if(chip)chip.innerHTML=chosen?'SELECTED <span>✓</span>':'SELECT <span>↗</span>';
  });
  const head=$('rl38VehicleTitle');if(head)head.textContent=selected.title;
  const number=$('rl45Count');if(number)number.textContent=selected.no+' / 04';
  const modelLabel=$('rl38ModelLabel');if(modelLabel)modelLabel.textContent=selected.title;
  const finishPane=$('rl38FinishOptions');if(finishPane)finishPane.hidden=config.model!=='kestrel';
  const description=$('rl38AirframeDescription');if(description)description.textContent=REDLINE_AIRFRAMES.get(config.model).description;
   const specs=$('rl61HangarSpecs');if(specs)specs.innerHTML=renderAirframeStats(config.model);
  const stage=screens.querySelector('.rl-model-stage');if(stage)stage.setAttribute('aria-label','Interactive 3D '+selected.title+' aircraft; drag to rotate');
  redlineCenterSelectedModel(animateScroll);
  const progress=$('rl45Progress');if(progress)progress.style.transform='translateX('+(['kestrel','blade','copper','spirit'].indexOf(config.model)*100)+'%)';
   const gaugeMax=REDLINE_AIRFRAMES.stats(config.model,config.handlingMode,P.t,P.a).boostSpeed;
   const speedMarks=[0,.25,.5,.75,1].map(f=>String(Math.round(f*gaugeMax)));
  document.querySelectorAll('#rlSpeedDial .rl-gauge-labels text').forEach((mark,i)=>{if(i<speedMarks.length)mark.textContent=speedMarks[i]});
  const finishCount=$('rl34FinishCount');if(finishCount)finishCount.textContent=String(config.skin+1).padStart(2,'0')+' / 04';
  const finish=$('rlGarageFinish');if(finish)finish.textContent='KESTREL X4 / '+finishNames[config.skin]+' FINISH';
  const label=$('rl3DFinish');if(label)label.textContent=config.model==='spirit'?'GRAPHITE BLACK · LOW-IR DUAL EXHAUST':config.model==='copper'?'TWIN ION · COPPER / GRAPHITE':config.model==='blade'?'MIDNIGHT BLACK · SIX JETS':finishNames[config.skin]+' / LIVERY '+String(config.skin+1).padStart(2,'0');
 }
 function updateMouseUnlocked(){const hint=$('rlMouseUnlock');if(!hint)return;
  const live=current==='race'&&(mode==='run'||mode==='count');
  hint.classList.toggle('visible',live&&document.pointerLockElement!==Rn.domElement);
  Rn.domElement.style.cursor=live&&document.pointerLockElement!==Rn.domElement?'crosshair':'';
 }
 function onWheel(e){if(redlineModelScroll(e))return;const row=e.target.closest('.rl-wheel-track');if(!row)return;
  if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){e.preventDefault();row.scrollLeft+=e.deltaY;}
 }
 function onChange(e){if(e.target.id==='v25Callsign'){if(e.type==='change'){REDLINE_PRODUCT.callsign(e.target.value);e.target.value=REDLINE_PRODUCT.snapshot().callsign;}return;}const id=e.target.id.replace(/^rlRace/,'rl'),v=e.target.value,ck=e.target.checked;
  if(id==='rlHandlingMode'){config.handlingMode=['easy','sport','expert'].includes(v)?v:'easy';}else if(id==='rlBrightness')config.brightness=Number(v);else if(id==='rlVolume')config.volume=Number(v);else if(id==='rlSensitivity')config.mouseSensitivity=Number(v);else if(id==='rlPitchSensitivity')config.pitchSensitivity=Number(v);else if(id==='rlMouseControlMode')config.mouseControlMode=v==='classic'?'classic':'locked';else if(id==='rlCenteredAim')config.centeredAim=ck;else if(id==='rlAutoPointerLock')config.autoPointerLock=ck;
  else if(id==='rlAimAssist')config.aimAssist=ck;else if(id==='rlFlightAssist')config.beginnerAssist=ck;else if(id==='rlHudSize')config.hudScale=v;else if(id==='rlHudMode')config.hudMode=REDLINE_HUD.valid(v);else if(id==='rlMotion')config.reducedMotion=ck;
  const out=document.getElementById(e.target.id+'Out');if(out)out.textContent=e.target.type==='range'?v+'%':e.target.type==='checkbox'?(ck?'ON':'OFF'):'';
  applySettings();
 }
 function target(){
  if(current!=='race'||mode!=='run')return null;
  // Choose a reachable target near the player's independent screen reticle.
  let best=null,bestDist=config.view===1?.065:.105;
  for(const b of CLASH.bots){if(!b.mesh.visible)continue;
   const point=b.mesh.position.clone(),projected=point.clone().project(cam);
   const d=Math.hypot(projected.x-aim.x,projected.y-aim.y);
   if(projected.z<1&&projected.z>-1&&d<bestDist&&point.distanceTo(st.p)<LASER_DISTANCE){bestDist=d;best={point,mesh:b.mesh,type:'rival',velocity:b.velocity};}
  }
  for(const e of CLASH.events){if(!e.root.visible||e.cooldown>0)continue;
   const point=e.beacon.getWorldPosition(new THREE.Vector3()),pr=point.clone().project(cam);
   const d=Math.hypot(pr.x-aim.x,pr.y-aim.y);
   if(pr.z<1&&pr.z>-1&&d<bestDist&&point.distanceTo(st.p)<LASER_DISTANCE){bestDist=d;best={point,mesh:null,type:'switch',velocity:0};}
  }
  lastAimTarget=best;return best;
 }
 function aimPoint(){
  cam.updateMatrixWorld(true);
  const chaseAim=config.view!==1;
  const ndc=new THREE.Vector2(chaseAim?0:aim.x,chaseAim?0:aim.y),r=new THREE.Raycaster();r.setFromCamera(ndc,cam);
  const cameraHit=laserWorldHit(r.ray.origin,r.ray.direction,LASER_DISTANCE);
  let point=cameraHit?cameraHit.point.clone():r.ray.at(LASER_DISTANCE,new THREE.Vector3());
  const best=target();
  if(config.aimAssist&&best&&bestDistWithin(best)){
   const candidate=best.point.clone();
   if(best.type==='rival'&&best.mesh){
    const face=new THREE.Vector3(-Math.sin(best.mesh.rotation.y),0,-Math.cos(best.mesh.rotation.y));
    const flightDistance=candidate.distanceTo(st.p),lead=Math.min(.22,flightDistance/2600);
    candidate.addScaledVector(face,Math.max(0,best.velocity||0)*lead);
   }
   if(!cameraHit||cameraHit.distance>=r.ray.origin.distanceTo(candidate)-7)point=candidate;
  }
  return point;
 }
 function aimRay(muzzle,aimPointOverride){return (aimPointOverride||aimPoint()).clone().sub(muzzle).normalize()}
 function bestDistWithin(best){const p=best.point.clone().project(cam);return Math.hypot(p.x-aim.x,p.y-aim.y)<(config.view===1?.054:.092)}
 function updateReticlePosition(){const el=$('rlReticle'),hint=$('rlAimHint');if(!el||!hint)return;
  const x=50+aim.x*50,y=50-aim.y*50;
  el.style.left=`clamp(20px, ${x}%, calc(100% - 20px))`;el.style.top=`clamp(20px, ${y}%, calc(100% - 20px))`;hint.style.left=el.style.left;hint.style.top=`clamp(52px, calc(${y}% + 30px), calc(100% - 35px))`;
 }
 function mouseAim(mx,my){if(config.centeredAim){aim.x=0;aim.y=0;updateReticlePosition();return;}const sensitivity=config.mouseSensitivity/50,dead=.7;
  aim.x=Math.max(-1,Math.min(1,aim.x+(Math.abs(mx)<dead?0:mx)*.00165*sensitivity));
  aim.y=Math.max(-1,Math.min(1,aim.y-(Math.abs(my)<dead?0:my)*.00165*sensitivity));
  updateReticlePosition();
 }
 function frame(dt){
  if(current!=='race')return;
  frameClock+=dt;
  if(frameClock<.08)return;frameClock=0;
  $('rlSpeedValue').textContent=Math.round(Math.abs(st.spd));
  // Sweep 264 degrees clockwise. Keep the flight engine's existing U/S units.
  const speedFill=Math.max(0,Math.min(1,Math.abs(st.spd)/REDLINE_AIRFRAMES.stats(redlineActiveAirframe(),config.handlingMode,P.t,P.a).boostSpeed));
  const gaugeDash=(speedFill*73.333).toFixed(3)+' 100';
  $('rlSpeedArc').setAttribute('stroke-dasharray',gaugeDash);
  $('rlSpeedArcGlow').setAttribute('stroke-dasharray',gaugeDash);
  $('rlSpeedNeedle').setAttribute('transform','rotate('+(132+264*speedFill).toFixed(2)+' 120 120)');
  $('rlBoostArc').setAttribute('stroke-dasharray',Math.max(0,Math.min(100,st.boost)).toFixed(1)+' 100');
  $('rlAltValue').textContent=Math.round(redlineRiverAltitude(st.p.y));
  $('rlBoostValue').textContent=Math.round(st.boost)+'%';
  $('rlSprintSplit').textContent=sprintMode()?('GATE '+Math.min(gate+1,sprintGateCount())+' / '+sprintGateCount()+' · '+(sectorSplits.length?'SECTOR '+sectorSplits.length+' '+fmt(sectorSplits.at(-1)):'CHASE FOUR GATES')):('GATE '+Math.min(gate+1,sprintGateCount())+' / '+sprintGateCount());$('rlSprintDelta').textContent=REDLINE_RAVEN.prettyDelta(lapT,PB);document.body.classList.toggle('rl-raven',sprintMode());
   $('rlLap').textContent=String(Math.min(lap,sprintMaxLaps())).padStart(2,'0');$('rlLapTotal').textContent='/ '+String(sprintMaxLaps()).padStart(2,'0');$('rlRaceTime').textContent=fmt(raceT);
  updateReticlePosition();
  const picked=target();$('rlReticle').classList.toggle('lock',!!picked);
  $('rlAimHint').textContent=picked?('TARGET '+(picked.type==='rival'?'ACQUIRED':'SWITCH')):(raceT<9?'MOUSE AIM  •  E FIRE':'');
  /* updateReticlePosition keeps both crosshair and label in the viewport */
  $('rlCameraMode').textContent=config.view?'FPV':'CHASE';

const humanProgress=continuousHumanProgress();
const pilots=REDLINE_ONLINE.isRacing?REDLINE_ONLINE.standings(humanProgress):[{key:'pilot',label:'YOU',progress:humanProgress,me:true,color:'#ff4d60',short:'P'},...CLASH.bots.filter(b=>CLASH.gameMode==='clash'&&b.index<config.bots).map(b=>({key:'bot'+b.index,label:b.label,progress:b.progress,me:false,color:'#'+b.color.toString(16).padStart(6,'0'),short:b.label[0],bot:b}))];
if(mode==='run')for(const r of pilots)recordProgress(r.key,r.progress,raceT);
const list=pilots.sort((a,b)=>b.progress-a.progress||Number(b.me)-Number(a.me));
const me=list.findIndex(b=>b.me),player=list[me];
  $('rlPosition').textContent=(me+1)+' / '+list.length;
  document.body.classList.toggle('rl-online-race',REDLINE_ONLINE.isRacing);
  if(REDLINE_ONLINE.isRacing){$('rlOnlineRoom').textContent=REDLINE_ONLINE.room?.code?.replace(/^(....)/,'$1-')||'';$('rlOnlineState').textContent=REDLINE_ONLINE.connected?'CONNECTED':'RECONNECTING';$('rlOnlineHud').classList.toggle('disconnected',!REDLINE_ONLINE.connected);}
// Three centered broadcast rows. P1 shows two behind; last place shows two ahead.
const start=Math.min(Math.max(0,me-1),Math.max(0,list.length-3));
const shown=list.slice(start,start+3);
const rows=shown.map((r,i)=>{const gap=estimatedInterval(r,player);return `<div class="rl-pos-row ${r.me?'me':''}" style="--pilot-color:${r.color}"><span class="rl-pos-rank">${start+i+1}</span><span class="rl-racer-icon">${r.short}</span><span class="rl-pos-name">${esc(r.label)}</span><span class="rl-pos-gap ${gap.startsWith('≈')?'approx':''}">${gap}</span></div>`}).join('');
$('rlPositions').innerHTML=`<div class="rl-stand-header"><span>RACE ORDER</span><strong>POS ${me+1}/${list.length}</strong></div>${rows}<div class="rl-stand-footer"><span>${CLASH.gameMode==='trial'?'TIME ATTACK':'LIVE INTERVALS'}</span><span>GAPS IN SECONDS</span></div>`;
const flow=CLASH.gameMode==='clash'?Math.max(0,Math.min(100,CLASH.flow)):0;
$('rlFlowCount').textContent=Math.round(flow);$('rlFlowFill').style.width=flow+'%';
const fm=$('rlFlowModule');fm.classList.toggle('trial',CLASH.gameMode!=='clash');
$('rlFlowDescription').textContent=CLASH.gameMode==='clash'?'CLEAN GATES · NEAR MISSES · OVERTAKES':'FLOW ABILITIES OFF IN TIME ATTACK';
for(const b of fm.querySelectorAll('[data-flow-action]')){
 const kind=b.dataset.flowAction,cost=kind==='refuel'?25:kind==='shield'?24:kind==='pulse'?42:30;
 const ready=CLASH.gameMode==='clash'&&flow>=cost&&(kind!=='refuel'||FL.energy<.93)&&(kind!=='reload'||st.las<2)&&(kind!=='shield'||CLASH.shieldT<=.3);
 b.disabled=!ready;b.setAttribute('aria-label',`${kind} — ${cost} Flow${ready?' available':' unavailable'}`);
}
$('rlAmmoCharges').textContent='◆'.repeat(Math.max(0,st.las))+'◇'.repeat(Math.max(0,2-st.las));
$('rlBoostLinearFill').style.width=Math.max(0,Math.min(100,st.boost))+'%';
$('rlBoostStatus').textContent=st.boost>96?'READY':st.boost<12?'LOW':'RECHARGING';
$('rlFpAlt').textContent=Math.round(redlineRiverAltitude(st.p.y));
$('rlFpBoost').textContent=Math.round(st.boost)+'%';
$('rlFpBoostFill').style.width=Math.max(0,Math.min(100,st.boost))+'%';
const fpvSpec=$('rl61CockpitReadout');if(fpvSpec){
 const profile=REDLINE_AIRFRAMES.get(redlineActiveAirframe());
 fpvSpec.dataset.airframe=profile.id;
 $('rl61FPVModel').textContent=profile.name;
 $('rl61FPVSpeed').textContent=Math.round(Math.abs(st.spd));
 $('rl61FPVBoost').textContent=Math.round(st.boost)+'%';
 $('rl61FPVTurn').textContent=(Math.abs(FL.turnRate||0)*180/Math.PI).toFixed(0)+'°/S';
 $('rl61FPVHeading').textContent=String(Math.round(((st.yaw*180/Math.PI)%360+360)%360)).padStart(3,'0')+'°';
 $('rl61FPVAlt').textContent=Math.round(redlineRiverAltitude(st.p.y));
 $('rl61FPVBoostFill').style.width=Math.max(0,Math.min(100,st.boost))+'%';
}
  if(mode==='count'||goUntil>performance.now()){const el=$('rlCountdown');el.style.display='grid';const n=mode==='count'?String(Math.max(1,Math.ceil(cd))):'GO';if(n!==lastCountdown){el.innerHTML='<b>'+n+'</b>';lastCountdown=n}}else{$('rlCountdown').style.display='none';lastCountdown=''}
  if(notificationTime&&performance.now()>notificationTime){$('rlToast').className='';notificationTime=0}
  $('rlTutorial').style.display=mode==='run'&&raceT<9&&!window.REDLINE_GUIDE?.active?'block':'none';
 }
 function readyUp(){ready=true;applySettings();mode='ready';document.body.classList.add('rl-menu');show('landing');REDLINE_ONLINE.resume().catch(()=>{});
  try{if(sessionStorage.getItem('redline_v27_launch_after_world_swap')==='1'){
   sessionStorage.removeItem('redline_v27_launch_after_world_swap');
   setTimeout(()=>{if(!REDLINE_ONLINE.isRacing)launch();},160);
  }}catch(_){}
  try{if(sessionStorage.getItem('redline_v27_online_after_swap')==='1'){
   sessionStorage.removeItem('redline_v27_online_after_swap');
   setTimeout(()=>go('multiplayer'),150);
  }}catch(_){}
 }
 function init(){$('rlRaceShade').addEventListener('click',()=>closeRacePanel(true));root.addEventListener('click',onClick);root.addEventListener('input',onChange);root.addEventListener('change',onChange);screens.addEventListener('wheel',onWheel,{passive:false});
   screens.addEventListener('keydown',e=>{
    if(current!=='solo'||!e.target.closest?.('#rl45ModelTrack'))return;
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
     e.preventDefault();redlineStepModel(e.key==='ArrowRight'?1:-1);
    }
   });
   screens.addEventListener('pointerdown',e=>{
    if(e.target.closest?.('#rl45ModelTrack')){
     redlineScrollSource='touch';redlineScrollGuardUntil=0;
     clearTimeout(redlineScrollSettleTimer);
    }
   },true);
   screens.addEventListener('pointerup',e=>{
    const track=e.target.closest?.('#rl45ModelTrack');
    if(track&&redlineScrollSource==='touch')redlineScheduleScrollSettle(track);
   },true);
   screens.addEventListener('pointercancel',()=>{redlineScrollSource='program';},true);
   screens.addEventListener('scroll',e=>{
    const track=e.target;
    if(track?.id!=='rl45ModelTrack'||current!=='solo')return;
    if(redlineScrollSource==='touch'&&performance.now()>=redlineScrollGuardUntil){
     redlineScheduleScrollSettle(track);
    }
   },true);
  show('landing');}
 return {init,config,setHandlingMode,setHudMode,openRacePanel,aim,readyUp,show,go,back,launch,notify,results,frame,mouseAim,aimPoint,aimRay,target,requestPointer,updateMouseUnlocked,resetTiming,racePanelOpen,closeRacePanel,get current(){return current},get ready(){return ready},get goUntil(){return goUntil},set goUntil(v){goUntil=v},get frameClock(){return frameClock}};
})();
/* Opt-in full-game browser harness. Does not run unless requested by URL.
 * All methods use the existing UI controller and simulation, never mocked flight state. */
if(new URLSearchParams(location.search).has('redlineTest')){
 window.REDLINE_E2E=Object.freeze({
  status:()=>({ready:!!redlineUI?.ready,screen:redlineUI?.current,boot:window.REDLINE_BOOT_PHASE,version:window.REDLINE_VERSION,
    simulation:window.REDLINE_SIM_STATE?.()||null,renderer:window.REDLINE_STAGE1_LAST_RENDER||null,
    fatal:window.REDLINE_LAST_ERROR||null}),
  select:(model)=>{if(!['kestrel','blade','copper','spirit'].includes(model))throw Error('unknown airframe');
    redlineUI.config.model=model;redlineUI.show('solo');return model},
  launch:()=>{redlineUI.launch();return redlineUI.current},
  view:(fpv)=>{redlineUI.config.view=fpv?1:0;return redlineUI.config.view},
  screen:(name)=>{if(!['landing','solo','results'].includes(name))throw Error('unknown screen');redlineUI.show(name);return redlineUI.current},
  showcase:()=>window.REDLINE_CAPTURE_SHOWCASE?.()
 });
}

// v59: Controller constructed, but no UI callbacks have run yet.
// Publish it before any immediate or asynchronous consumer can reference it.
window.redlineUI=redlineUI;
window.REDLINE_BOOT_PHASE='ui-controller-published';
const REDLINE_GUIDE=REDLINE_FLIGHT_SCHOOL.create({
 onPause:()=>{document.body.classList.add('rl-hud-guide');mode='pause';if(document.pointerLockElement===Rn.domElement)document.exitPointerLock?.();},
 onResume:()=>{document.body.classList.add('rl-hud-guide');mode='run';try{Rn.domElement.requestPointerLock?.();}catch(e){}},
 onFinish:(skipped)=>{document.body.classList.remove('rl-hud-guide');REDLINE_PRODUCT.training(!skipped);try{localStorage.setItem('redline_raven_training_v22_done','1')}catch(e){};
  reset();mode='count';cd=3.2;redlineUI.goUntil=0;redlineUI.show('race');redlineUI.requestPointer();}
});
window.REDLINE_GUIDE=REDLINE_GUIDE;

/* REDLINE v17.6 / true camera-mounted 3D cockpit: fixed airframe, shaped canopy, instrumentation, hardware. */
const REDLINE_COCKPIT3D=(()=>{
 const group=new THREE.Group();group.name='Kestrel_X4_3D_Cockpit';cam.add(group);S.add(cam);group.visible=false;
 const anodized=new THREE.MeshStandardMaterial({color:0x0a0d12,metalness:.8,roughness:.33,emissive:0x070609,emissiveIntensity:.15,depthTest:true});
 const trim=new THREE.MeshStandardMaterial({color:0x2b343b,metalness:.88,roughness:.28});
 const black=new THREE.MeshStandardMaterial({color:0x060709,metalness:.25,roughness:.59});
 const gasket=new THREE.MeshStandardMaterial({color:0x1a1e23,metalness:.09,roughness:.97});
 const light=new THREE.MeshBasicMaterial({color:0xf32639,toneMapped:false});
 const white=new THREE.MeshBasicMaterial({color:0xe9dacc,toneMapped:false});
 function piece(g,m,x,y,z,rx=0,ry=0,rz=0){const obj=new THREE.Mesh(g,m);obj.position.set(x,y,z);obj.rotation.set(rx,ry,rz);obj.castShadow=false;obj.receiveShadow=false;obj.frustumCulled=false;group.add(obj);return obj;}
 function beam(a,b,r,m=anodized){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p);
  const tube=piece(new THREE.CylinderGeometry(r,r,d.length(),10),m,...p.clone().add(q).multiplyScalar(.5).toArray());
  tube.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return tube;}
 function trace(points,r,m){for(let i=1;i<points.length;i++)beam(points[i-1],points[i],r,m);}
 // V17.8: continuous screen-covering aircraft capsule frame. Screen-space
 // anchors are converted to camera-local 3D at a reference field of view;
 // only this frame scales with the live FOV/aspect, NOT the instruments.
 const canopy=new THREE.Group();canopy.name='Sealed_Adaptive_Canopy';group.add(canopy);
 const REF_FOV=76,REF_ASPECT=16/9,refTan=Math.tan(REF_FOV*Math.PI/360);
 const P=(nx,ny,z=-1.78)=>new THREE.Vector3(nx*REF_ASPECT*refTan*(-z),ny*refTan*(-z),z);
 const polished=new THREE.MeshStandardMaterial({color:0x667078,metalness:.93,roughness:.19,emissive:0x07090d,emissiveIntensity:.09});
 const edgeLight=new THREE.MeshBasicMaterial({color:0x9ba2a5,transparent:true,opacity:.47,depthWrite:false});
 const sealMat=new THREE.MeshStandardMaterial({color:0x08090c,metalness:.08,roughness:.82});
 // Smooth curves, rather than square-ended disconnected cylindrical segments.
 function flexBeam(nodes,r,mat=anodized,detail=90){
  const path=new THREE.CatmullRomCurve3(nodes.map(n=>P(...n)),false,'centripetal',.28);
  const mesh=new THREE.Mesh(new THREE.TubeGeometry(path,detail,r,12,false),mat);
  mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;canopy.add(mesh);
  return mesh;
 }
 function roundJoint(node,r=.09,material=anodized){
  const obj=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),material);
  obj.position.copy(P(...node));obj.frustumCulled=false;canopy.add(obj);
  return obj;
 }
 const upper=[[-1.10,.985,-1.90],[-.84,.982,-1.85],[-.46,.979,-1.81],[0,.980,-1.80],[.46,.979,-1.81],[.84,.982,-1.85],[1.10,.985,-1.90]];
 const lower=[[-1.10,-.81,-1.72],[-.87,-.66,-1.73],[-.67,-.55,-1.72],[0,-.52,-1.73],[.67,-.55,-1.72],[.87,-.66,-1.73],[1.10,-.81,-1.72]];
 flexBeam(upper,.049,anodized);flexBeam(upper.map(n=>[n[0],n[1]-.065,n[2]+.023]),.018,polished);
 flexBeam(lower,.046,anodized);flexBeam(lower.map(n=>[n[0],n[1]+.033,n[2]-.023]),.018,polished);
 for(const sign of [-1,1]){
  // Two fully connected perimeter hoops enclose the side glass. No free ends.
  const outer=[[sign*1.09,.985,-1.90],[sign*1.09,.72,-1.86],[sign*1.07,.29,-1.83],[sign*1.06,-.18,-1.81],[sign*1.08,-.54,-1.77],[sign*1.10,-.81,-1.72]];
  const forward=[[sign*.86,.982,-1.85],[sign*.84,.76,-1.81],[sign*.77,.40,-1.78],[sign*.70,.04,-1.76],[sign*.72,-.32,-1.73],[sign*.75,-.55,-1.72]];
  flexBeam(outer,.047,anodized);flexBeam(outer.map(n=>[n[0]-sign*.025,n[1],n[2]-.026]),.018,polished);
  flexBeam(forward,.052,anodized);flexBeam(forward.map(n=>[n[0]-sign*.022,n[1],n[2]-.034]),.020,polished);
  // Tie the interior vertical frame into the roof and lower instrument brow.
  flexBeam([[sign*.84,.982,-1.85],[sign*.91,.983,-1.88],[sign*1.09,.985,-1.90]],.07,sealMat,30);
  flexBeam([[sign*.67,-.55,-1.72],[sign*.80,-.62,-1.72],[sign*.87,-.66,-1.73]],.073,anodized,30);
  // Supporting transverse span and small metallic gusset tie every strut.
  flexBeam([[sign*.78,.76,-1.81],[sign*.87,.73,-1.83],[sign*1.09,.72,-1.86]],.046,trim,28);
  flexBeam([[sign*.64,-.32,-1.73],[sign*.85,-.42,-1.77],[sign*1.08,-.54,-1.77]],.049,trim,36);
  for(const j of [forward[0],forward[2],forward[5],outer[1],outer[4],outer[5]]){
   roundJoint(j,.075,anodized);roundJoint([j[0],j[1],j[2]+.035],.028,polished);
  }
  // A matte side-wall airframe skirt bridges the screen border to dashboard.
  const skirtPoints=[[sign*1.10,-.81,-1.72],[sign*.87,-.66,-1.73],[sign*.61,-.72,-1.63],[sign*.59,-1.10,-1.63],[sign*1.12,-1.10,-1.74]];
  const coords=[],ind=[];for(const node of skirtPoints){const v=P(...node);coords.push(v.x,v.y,v.z)}
  for(let i=1;i<skirtPoints.length-1;i++)ind.push(0,i,i+1);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));geo.setIndex(ind);geo.computeVertexNormals();
  const panel=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x101319,side:THREE.DoubleSide,metalness:.58,roughness:.36}));panel.frustumCulled=false;canopy.add(panel);
  flexBeam([[sign*.87,-.66,-1.73],[sign*.61,-.72,-1.63],[sign*.59,-1.10,-1.63]],.043,trim,30);
  flexBeam([[sign*1.09,.72,-1.86],[sign*1.07,.29,-1.83],[sign*1.06,-.18,-1.81]],.015,edgeLight,42);
 }
 // Subtle sealed glass: primarily clear at the center, with edge tint,
 // a restrained reflection streak and fine red optical treatment.
 // It draws in the same camera scene; game HUD stays as separate HTML above it.
 const pane=new THREE.Mesh(
  new THREE.PlaneGeometry(2.18*REF_ASPECT*refTan*2.05,2.12*refTan*2.05),
  new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,side:THREE.DoubleSide,
   uniforms:{uTime:{value:0}},
   vertexShader:'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
   fragmentShader:`varying vec2 vUv;uniform float uTime;
    void main(){
      vec2 q=vUv*2.0-1.0;
      float rim=pow(clamp(max(abs(q.x),abs(q.y)),0.0,1.0),4.0);
      float top=pow(clamp(q.y,0.0,1.0),3.0);
      float glint=exp(-pow((q.x+q.y*.29-.60)*24.0,2.0))*.021;
      float second=exp(-pow((q.x+q.y*.25+.65)*48.0,2.0))*.008;
      float a=.008+rim*.034+top*.011+glint+second;
      gl_FragColor=vec4(.27,.31,.34,a);
    }`})
 );
 pane.name='Curved_Canopy_Glass_Sheen';pane.position.z=-2.05;pane.renderOrder=110;pane.frustumCulled=false;canopy.add(pane);
 // A tiny polished bottom lip seals the dashboard and roof-side hull at the edge.
 const heel=[[-1.10,-.93,-1.70],[-.94,-.82,-1.70],[-.78,-.72,-1.66],[-.58,-.67,-1.63]];
 for(const sign of [-1,1])flexBeam(heel.map(n=>[n[0]*sign,n[1],n[2]]),.031,trim,42);
 let lastFov=0,lastAspect=0;
 function adjustCanopy(){
  const a=cam.aspect,f=Math.tan(cam.fov*Math.PI/360);
  if(Math.abs(f-lastFov)<.00002&&Math.abs(a-lastAspect)<.00002)return;
  canopy.scale.set(a/REF_ASPECT*f/refTan,f/refTan,1);lastFov=f;lastAspect=a;
 }
 // Lower airframe dashboard follows a shaped contour rather than a flat triangle.
 const contour=new THREE.Shape();contour.moveTo(-1.72,-1.28);contour.lineTo(-1.72,-.79);
 contour.quadraticCurveTo(-1.67,-.57,-1.42,-.55);contour.lineTo(-.90,-.56);
 contour.quadraticCurveTo(-.49,-.38,0,-.45);contour.quadraticCurveTo(.49,-.38,.90,-.56);
 contour.lineTo(1.42,-.55);contour.quadraticCurveTo(1.67,-.57,1.72,-.79);
 contour.lineTo(1.72,-1.28);contour.closePath();
 piece(new THREE.ExtrudeGeometry(contour,{depth:.16,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:10}),black,0,0,-1.62);
 // A curved metallic brow and rubber top seal emphasize the windshield horizon.
 trace([[-1.67,-.63,-1.40],[-1.16,-.55,-1.42],[-.77,-.55,-1.45],[0,-.45,-1.50],[.77,-.55,-1.45],[1.16,-.55,-1.42],[1.67,-.63,-1.40]],.055,trim);
 trace([[-1.67,-.69,-1.38],[-1.16,-.61,-1.39],[0,-.52,-1.44],[1.16,-.61,-1.39],[1.67,-.69,-1.38]],.027,gasket);
 // Twin side switch banks, with real individual raised toggles and illuminated keys.
 for(const side of[-1,1]){
  const bank=piece(new THREE.BoxGeometry(.48,.24,.085),anodized,side*1.31,-.87,-1.36,-.12,side*.22,0);
  for(let r=0;r<2;r++)for(let c=0;c<4;c++){
   const x=side*(1.14+c*.105),y=-.815-r*.095;
   piece(new THREE.BoxGeometry(.055,.043,.027),(r===0&&c===1)?light:trim,x,y,-1.294);
  }
  for(let i=0;i<3;i++){
   const x=side*(1.16+i*.14);
   piece(new THREE.CylinderGeometry(.014,.014,.07,8),white,x,-1.09,-1.27,Math.PI/2);
  }
 }
 const cvs=document.createElement('canvas');cvs.width=1300;cvs.height=340;
 const ctx=cvs.getContext('2d');
 const tex=new THREE.CanvasTexture(cvs);tex.encoding=THREE.sRGBEncoding;
 tex.minFilter=THREE.LinearFilter;tex.magFilter=THREE.LinearFilter;
 const displayMat=new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,toneMapped:false,transparent:false});
 piece(new THREE.PlaneGeometry(2.38,.62),displayMat,0,-.865,-1.425);
 // Individual inset dials and mounting screws around the working display.
 for(const x of[-1.17,-.68,-.18,.36,.91,1.19]){
  piece(new THREE.CylinderGeometry(.018,.018,.013,10),trim,x,-.55,-1.405,Math.PI/2);
 }
 for(const x of[-1.05,1.05]){for(const y of[-1.16,-.62]){
  piece(new THREE.SphereGeometry(.023,8,6),trim,x,y,-1.38);
 }}
 // Instrument art: real-time analog faces, readable legends, lamp states and track display.
 let lastPaint=0;
 function paint(){
  const w=cvs.width,h=cvs.height;
  ctx.clearRect(0,0,w,h);
  const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#171d21');bg.addColorStop(.3,'#060a0e');bg.addColorStop(1,'#161b1e');
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#3d4a50';ctx.lineWidth=8;ctx.strokeRect(7,7,w-14,h-14);
  ctx.strokeStyle='#6d333a';ctx.lineWidth=2;ctx.strokeRect(20,19,w-40,h-37);
  const txt=(a,x,y,size=19,color='#dce0dd',align='center')=>{ctx.fillStyle=color;ctx.textAlign=align;ctx.font=`700 ${size}px Arial`;ctx.fillText(a,x,y)};
  function dial(cx,cy,r,label,val,min,max,units){
   const g=ctx.createRadialGradient(cx-r*.3,cy-r*.3,7,cx,cy,r);g.addColorStop(0,'#253039');g.addColorStop(.62,'#081015');g.addColorStop(1,'#010407');
   ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
   ctx.strokeStyle='#89939a';ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle='#252c31';ctx.lineWidth=8;ctx.stroke();
   for(let n=0;n<=12;n++){
    const a=(135+n*270/12)*Math.PI/180;
    const inner=r*(n%3===0?.70:.80);ctx.beginPath();ctx.moveTo(cx+inner*Math.cos(a),cy+inner*Math.sin(a));ctx.lineTo(cx+r*.90*Math.cos(a),cy+r*.90*Math.sin(a));
    ctx.strokeStyle=n>=10?'#f34a52':'#d4dbdb';ctx.lineWidth=n%3===0?4:2;ctx.stroke();
   }
   const frac=Math.min(1,Math.max(0,(val-min)/(max-min)));
   const a=(135+270*frac)*Math.PI/180;ctx.beginPath();ctx.moveTo(cx-7*Math.cos(a),cy-7*Math.sin(a));ctx.lineTo(cx+r*.68*Math.cos(a),cy+r*.68*Math.sin(a));
   ctx.strokeStyle='#ff3e4b';ctx.lineWidth=5;ctx.stroke();
   ctx.beginPath();ctx.arc(cx,cy,7,0,Math.PI*2);ctx.fillStyle='#dedbd5';ctx.fill();
   txt(label,cx,cy-r-18,16,'#ff7c83');txt(String(Math.round(val)),cx,cy+43,32,'#f8f7f1');txt(units,cx,cy+64,13,'#b9c6c7');
  }
  const speed=Math.abs(st.spd),alt=redlineRiverAltitude(st.p.y);
  dial(151,175,90,'AIRSPEED',speed,0,redlineActiveAirframe()==='blade'?405:redlineActiveAirframe()==='copper'?378:340,'U/S');
  dial(378,175,88,'ALTITUDE',alt,0,310,'METERS');
  dial(1139,175,90,'BOOST',st.boost,0,100,'%');
  // Functional central glass flight display.
  const x=505,y=56,bw=507,bh=227;
  const gl=ctx.createLinearGradient(x,y,x+bw,y+bh);gl.addColorStop(0,'#11242b');gl.addColorStop(.62,'#061218');gl.addColorStop(1,'#0b1218');
  ctx.fillStyle=gl;ctx.fillRect(x,y,bw,bh);ctx.strokeStyle='#53656b';ctx.lineWidth=5;ctx.strokeRect(x,y,bw,bh);
  ctx.strokeStyle='#1f343b';ctx.lineWidth=1;
  for(let i=1;i<7;i++){ctx.beginPath();ctx.moveTo(x+10+i*bw/7,y+8);ctx.lineTo(x+10+i*bw/7,y+bh-8);ctx.stroke()}
  for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(x+8,y+i*bh/4);ctx.lineTo(x+bw-8,y+i*bh/4);ctx.stroke()}
  txt(redlineAirframeLabel()+'  /  FLIGHT COMPUTER',x+22,y+26,17,'#eef0e9','left');
  txt('ACTIVE',x+bw-22,y+26,15,'#7de7c6','right');
  ctx.strokeStyle='#f04955';ctx.lineWidth=3;
  const mid=x+bw*.5,horizon=y+bh*.52+Math.min(28,Math.max(-28,st.pv*70));
  ctx.beginPath();ctx.moveTo(mid-115,horizon);ctx.lineTo(mid-30,horizon);ctx.moveTo(mid+30,horizon);ctx.lineTo(mid+115,horizon);ctx.stroke();
  ctx.beginPath();ctx.moveTo(mid-23,horizon);ctx.lineTo(mid,horizon+12);ctx.lineTo(mid+23,horizon);ctx.stroke();
  txt('HDG '+String(Math.round(((st.yaw*180/Math.PI)%360+360)%360)).padStart(3,'0'),x+24,y+bh-22,17,'#e4d9ce','left');
  txt('FLOW '+String(Math.round(st.boost))+'%',x+bw-24,y+bh-22,17,'#f2878d','right');
  txt('REDLINE / RACE SYSTEMS',w*.5,25,15,'#ed5260');
  // Physical-looking alarm annunciators below the MFD.
  for(let k=0;k<9;k++){
   const lightX=x+14+k*54;
   ctx.fillStyle=(k<3&&st.boost<20)?'#d72230':k===6?'#c44e2a':'#263b39';ctx.fillRect(lightX,y+bh+10,42,9);
   ctx.strokeStyle='#617172';ctx.strokeRect(lightX,y+bh+10,42,9);
  }
  tex.needsUpdate=true;
 }
  // v61: three genuinely separate camera-attached cockpit constructions.
  // All use the same state telemetry; decorative structures never mutate flight state.
  const stockCockpitChildren=group.children.slice();
  const alternateCockpits={};
  const visualReadouts={};
  function makeDistinctCockpit(id){
    const model=REDLINE_AIRFRAMES.get(id);
    const root=new THREE.Group();root.name='REDLINE_'+id.toUpperCase()+'_COCKPIT';group.add(root);
    const cabin=new THREE.Group();root.add(cabin);
    const frameMat=new THREE.MeshStandardMaterial({color:id==='spirit'?0x1c262b:id==='blade'?0x171820:0x181a20,metalness:.73,roughness:.4});
    const lipMat=new THREE.MeshStandardMaterial({color:id==='spirit'?0x5a6670:id==='blade'?0x434950:0x6e6960,metalness:.87,roughness:.25});
    const glow=new THREE.MeshBasicMaterial({color:id==='spirit'?0x9fc6bf:id==='blade'?0xf47b55:0xf4a66b,toneMapped:false});
    const dark=new THREE.MeshBasicMaterial({color:0x080a0d,side:THREE.DoubleSide});
    function line(nodes,r=.034,mat=frameMat){
      const curve=new THREE.CatmullRomCurve3(nodes.map(n=>P(...n)),false,'centripetal');
      const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(3,nodes.length*8),r,8,false),mat);
      mesh.frustumCulled=false;cabin.add(mesh);return mesh;
    }
    function flat(nodes,mat=dark){
      const coords=[],index=[];for(const n of nodes){let p=P(...n);coords.push(p.x,p.y,p.z)}
      for(let i=1;i<nodes.length-1;i++)index.push(0,i,i+1);
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));geo.setIndex(index);geo.computeVertexNormals();
      const mesh=new THREE.Mesh(geo,mat);mesh.frustumCulled=false;cabin.add(mesh);return mesh;
    }
    if(id==='blade'){
      // Jailbreak Blade / retro-futurist hovercar: low visor, shallow angled pillars.
      line([[-1.12,.98,-1.9],[-.84,.84,-1.84],[0,.87,-1.86],[.84,.84,-1.84],[1.12,.98,-1.9]],.052);
      for(const side of [-1,1]){
        line([[side*.84,.84,-1.84],[side*.77,.43,-1.78],[side*.95,-.58,-1.73]],.066);
        line([[side*1.12,.98,-1.90],[side*1.13,.18,-1.80],[side*1.02,-.78,-1.75]],.055);
        line([[side*.75,-.56,-1.68],[side*1.08,-.78,-1.75]],.026,lipMat);
        flat([[side*.68,-.69,-1.62],[side*1.10,-.75,-1.73],[side*1.12,-1.1,-1.8],[side*.65,-1.1,-1.62]]);
      }
      line([[-1.10,-.72,-1.73],[-.58,-.59,-1.67],[0,-.52,-1.63],[.58,-.59,-1.67],[1.10,-.72,-1.73]],.057,lipMat);
      line([[-.68,-.66,-1.61],[0,-.62,-1.60],[.68,-.66,-1.61]],.016,glow);
    }else if(id==='copper'){
      // TIE-inspired round armored cockpit with an eight-sided radial viewport.
      const ring=[[-.72,.91,-1.9],[.72,.91,-1.9],[1.00,.50,-1.9],[1.00,-.40,-1.9],[.72,-.77,-1.9],[-.72,-.77,-1.9],[-1.00,-.40,-1.9],[-1.00,.50,-1.9],[-.72,.91,-1.9]];
      line(ring,.085);line(ring.map(n=>[n[0]*.965,n[1]*.96,n[2]+.018]),.019,lipMat);
      for(const sign of[-1,1]){
        line([[sign*.72,.91,-1.90],[sign*.50,.55,-1.83],[sign*.46,.27,-1.82]],.056);
        line([[sign*1.0,.5,-1.90],[sign*.72,.29,-1.84],[sign*.55,.14,-1.81]],.058);
        line([[sign*1.0,-.40,-1.90],[sign*.72,-.29,-1.83],[sign*.58,-.16,-1.81]],.058);
        line([[sign*.72,-.77,-1.90],[sign*.43,-.47,-1.79]],.053);
        flat([[sign*.83,-.68,-1.8],[sign*1.05,-.72,-1.86],[sign*1.1,-1.11,-1.89],[sign*.58,-1.1,-1.7]]);
      }
      line([[-1.02,-.80,-1.87],[0,-.67,-1.76],[1.02,-.80,-1.87]],.087,lipMat);
      line([[-.62,-.69,-1.77],[0,-.66,-1.75],[.62,-.69,-1.77]],.02,glow);
    }else{
      // B-2 inspired wide two-crew flight deck; broad divided windows and three MFD stations.
      line([[-1.16,.98,-1.89],[-.70,.94,-1.86],[0,.93,-1.86],[.70,.94,-1.86],[1.16,.98,-1.89]],.060);
      for(const sign of[-1,1]){
        line([[sign*1.16,.98,-1.89],[sign*1.08,.26,-1.82],[sign*1.04,-.72,-1.75]],.071);
        line([[sign*.56,.94,-1.86],[sign*.58,.26,-1.77],[sign*.60,-.58,-1.71]],.046,lipMat);
        flat([[sign*.92,-.67,-1.74],[sign*1.14,-.73,-1.8],[sign*1.14,-1.1,-1.83],[sign*.70,-1.1,-1.7]]);
      }
      line([[.22,.93,-1.86],[.23,.3,-1.77],[.23,-.53,-1.69]],.049);
      line([[-1.14,-.72,-1.74],[-.61,-.60,-1.72],[0,-.55,-1.67],[.61,-.60,-1.72],[1.14,-.72,-1.74]],.058,lipMat);
      for(const x of[-.66,0,.66]){
        line([[x-.20,-.74,-1.66],[x+.20,-.74,-1.66],[x+.20,-1.01,-1.66],[x-.20,-1.01,-1.66],[x-.20,-.74,-1.66]],.021,glow);
      }
    }
    flat([[-1.15,-.85,-1.77],[1.15,-.85,-1.77],[1.18,-1.12,-1.77],[-1.18,-1.12,-1.77]]);
    // Different secondary instrument clusters reinforce cabin purpose without
    // covering the center of the flight window or the live primary readout.
    function smallScreen(x,y,w,h,label){
      const cv=document.createElement('canvas');cv.width=256;cv.height=128;
      const cc=cv.getContext('2d');cc.fillStyle='#071016';cc.fillRect(0,0,256,128);
      cc.strokeStyle=model.accent;cc.lineWidth=5;cc.strokeRect(3,3,250,122);
      cc.fillStyle=model.accent;cc.font='bold 24px monospace';cc.fillText(label,17,38);
      cc.fillStyle='#a8c3bd';cc.font='17px monospace';cc.fillText('●  SYSTEM ACTIVE',17,76);
      for(let k=0;k<5;k++){cc.fillStyle=k%2?'#45565c':model.accent;cc.fillRect(16+k*47,96,33,9)}
      const tt=new THREE.CanvasTexture(cv);tt.encoding=THREE.sRGBEncoding;
      const mm=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tt,toneMapped:false,side:THREE.DoubleSide}));
      mm.position.set(x,y,-1.39);mm.frustumCulled=false;root.add(mm);
    }
    if(id==='blade'){
      // Blade's original two-seat hovercar used four illuminated subsidiary screens.
      smallScreen(-1.21,-.83,.28,.22,'HOVER L');smallScreen(1.21,-.83,.28,.22,'HOVER R');
      smallScreen(-.55,-1.18,.34,.19,'V-LIFT');smallScreen(.55,-1.18,.34,.19,'VECTOR');
    }else if(id==='copper'){
      // Fighter-style triangular proximity monitors to either side of the octagonal port.
      smallScreen(-1.18,-.80,.31,.29,'PROX L');smallScreen(1.18,-.80,.31,.29,'PROX R');
      line([[-.39,-.22,-1.80],[-.16,-.22,-1.80],[0,-.28,-1.80],[.16,-.22,-1.80],[.39,-.22,-1.80]],.017,glow);
    }else{
      smallScreen(-1.26,-.90,.32,.30,'NAV SYS');smallScreen(1.26,-.90,.32,.30,'MISSION');
      line([[-.40,-.57,-1.70],[.40,-.57,-1.70]],.019,glow);
    }
    // Dynamic instrument MFD integrated into physical cockpit, not a floating speedometer.
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=240;
    const ctx=canvas.getContext('2d'),tex=new THREE.CanvasTexture(canvas);tex.encoding=THREE.sRGBEncoding;
    tex.minFilter=THREE.LinearFilter;tex.magFilter=THREE.LinearFilter;
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(id==='spirit'?2.25:1.95,.45),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,toneMapped:false}));
    panel.position.set(0,-.85,-1.47);panel.frustumCulled=false;root.add(panel);
    alternateCockpits[id]=root;
    function paint(){
      const w=canvas.width,h=canvas.height,co=model.accent;
      ctx.clearRect(0,0,w,h);ctx.fillStyle=id==='blade'?'#100d12':id==='spirit'?'#07151a':'#130e0c';ctx.fillRect(0,0,w,h);
      ctx.strokeStyle=co;ctx.lineWidth=3;ctx.strokeRect(4,4,w-8,h-8);
      ctx.font='bold 22px monospace';ctx.textAlign='left';ctx.fillStyle=co;
      ctx.fillText(model.name+'  /  '+model.role,24,35);
      const params=[['SPEED',String(Math.round(Math.abs(st.spd)))+' U/S'],['BOOST',Math.round(st.boost)+'%'],['TURN',Math.round(Math.abs(FL.turnRate||0)*180/Math.PI)+'°/S'],['ALT',Math.round(redlineRiverAltitude(st.p.y))+' M']];
      params.forEach(([label,v],i)=>{const x=24+i*250;ctx.fillStyle='#99a8aa';ctx.font='17px monospace';ctx.fillText(label,x,91);ctx.fillStyle='#f5f2ec';ctx.font='bold 40px monospace';ctx.fillText(v,x,144);});
      ctx.fillStyle='#333940';ctx.fillRect(24,176,976,12);ctx.fillStyle=co;ctx.fillRect(24,176,976*Math.max(0,Math.min(100,st.boost))/100,12);
      ctx.fillStyle='#aab3b3';ctx.font='17px monospace';ctx.fillText('HDG '+Math.round(((st.yaw*180/Math.PI)%360+360)%360)+'°',24,217);
      ctx.textAlign='right';ctx.fillText(id==='spirit'?'STEALTH FLIGHT · LONG RANGE':id==='blade'?'HOVER · LATERAL VECTOR':'ION VECTOR · TARGET TRACK',1000,217);
      tex.needsUpdate=true;
    }
    visualReadouts[id]=paint;
    return root;
  }
  for(const id of ['blade','copper','spirit'])makeDistinctCockpit(id);
  let currentInterior='';
  function setInterior(id){
    if(currentInterior===id)return;
    currentInterior=id;
    const stock=id==='kestrel';for(const child of stockCockpitChildren)child.visible=stock;
    for(const [key,root]of Object.entries(alternateCockpits))root.visible=(key===id);
    group.name='REDLINE_'+id.toUpperCase()+'_FPV_COCKPIT';
  }
 function update(now){const live=redlineUI.current==='race'&&(mode==='run'||mode==='count')&&redlineUI.config.view===1;
   const id=live?redlineActiveAirframe():null;
   const image=document.getElementById('rl62TieOverlay');
   const referenceReady=!!(image&&image.complete&&image.naturalWidth>0);
   const tieViewport=!!(live&&id==='copper'&&referenceReady);
   const spiritViewport=!!(live&&id==='spirit'&&window.REDLINE_SPIRIT_COCKPIT?.ready());
   const bladeViewport=!!(live&&id==='blade'&&window.REDLINE_BLADE_COCKPIT?.ready());
   const kestrelViewport=!!(live&&id==='kestrel'&&window.REDLINE_KESTREL_COCKPIT?.ready());
   document.body.classList.toggle('rl67-kestrel-cockpit',kestrelViewport);
   document.body.classList.toggle('rl62-tie-cockpit',tieViewport);
   document.body.classList.toggle('rl63-spirit-cockpit',spiritViewport);
   document.body.classList.toggle('rl65-blade-cockpit',bladeViewport);
   // All HUD variants sample the same immutable fixed-tick simulation state.
   const presented=window.REDLINE_SIM_STATE?.()?.craft;
   const liveSpeed=presented?.speed??Math.abs(st.spd);
   const liveAltitude=presented?.altitude??redlineRiverAltitude(st.p.y);
   const liveBoost=presented?.boost??st.boost;
   // v74: image HUD reads exactly the same simulation data as the other readouts.
   if(live&&window.REDLINE_V74_COCKPITS?.ready()){
     const specs=REDLINE_AIRFRAMES.stats(id,redlineUI.config.handling||'sport',redlineUI.config.thrust||80,redlineUI.config.agility||75);
     window.REDLINE_V74_COCKPITS.update(id,{
       speed:liveSpeed,altitude:liveAltitude,boost:liveBoost,
       maxSpeed:specs?.boostSpeed||260,
     });
   }

   // Shared, authoritative flight readouts for all four photographic cockpits.
   if(live){
     if(tieViewport){
       const finite=n=>Number.isFinite(Number(n))?Number(n):0;
       const set=(id,value)=>{const e=document.getElementById(id);if(e)e.textContent=value;};
       const pct=Math.max(0,Math.min(100,finite(liveBoost)));
       set('rl70Speed',String(Math.round(Math.abs(finite(st.spd)))));
       set('rl70Alt',String(Math.round(finite(liveAltitude))));
       set('rl70Boost',Math.round(pct)+'%');
       const tieHud=document.getElementById('rl70TieHud');
       if(tieHud) tieHud.dataset.live='true';
       const bars=document.querySelectorAll('#rl70Bars i');
       bars.forEach((bar,i)=>bar.classList.toggle('on',pct>(i*20+1)));
     }
     const write=(name,value)=>{const el=document.getElementById(name);if(el)el.textContent=value;};
     const safe=n=>Number.isFinite(+n)?+n:0;
     const boost=Math.max(0,Math.min(100,safe(liveBoost)));
     write('rl68Speed',Math.round(Math.abs(safe(st.spd)))+' u/s');
     write('rl68Alt',Math.round(safe(liveAltitude))+' m');
     write('rl68Boost',Math.round(boost)+'%');
     write('rl68Heading','HDG '+String(((Math.round(safe(st.yaw)*180/Math.PI)%360)+360)%360).padStart(3,'0')+'°');
     write('rl68Turn','TURN '+Math.round(Math.abs(safe(FL.turnRate)*180/Math.PI))+'°/S');
     const fill=document.getElementById('rl68BoostFill');if(fill)fill.style.width=boost+'%';
   }
   // The real HUD stays bound to the simulation; presentation cannot mutate it.
   // If the alternate presentation is absent, retain the original 3D interior.
   group.visible=live&&!tieViewport&&!spiritViewport&&!bladeViewport&&!kestrelViewport;
   if(kestrelViewport)window.REDLINE_KESTREL_COCKPIT.update({speed:liveSpeed,altitude:liveAltitude,boost:liveBoost});
   if(spiritViewport)window.REDLINE_SPIRIT_COCKPIT.update({
     speed:liveSpeed, altitude:liveAltitude,
     heading:st.yaw*180/Math.PI, turn:(FL.turnRate||0)*180/Math.PI,
     boost:liveBoost, flow:CLASH.gameMode==='clash'?CLASH.flow:0,
     ammo:st.las,
    speedRange:REDLINE_AIRFRAMES.stats('spirit',redlineUI.config.handling||'sport',redlineUI.config.thrust||80,redlineUI.config.agility||75).boostSpeed
   });
   if(bladeViewport)window.REDLINE_BLADE_COCKPIT.update({
     speed:liveSpeed,altitude:liveAltitude,
     heading:st.yaw*180/Math.PI,turn:(FL.turnRate||0)*180/Math.PI,
     boost:liveBoost,flow:CLASH.gameMode==='clash'?CLASH.flow:0,
     speedRange:REDLINE_AIRFRAMES.stats('blade',redlineUI.config.handling||'sport',redlineUI.config.thrust||80,redlineUI.config.agility||75).boostSpeed
   });
   if(live&&!tieViewport&&!spiritViewport&&!bladeViewport&&!kestrelViewport){
     setInterior(id);adjustCanopy();
     // The alternate viewport groups use the same FOV scaling as the existing cockpit.
     const a=cam.aspect,f=Math.tan(cam.fov*Math.PI/360);
     for(const root of Object.values(alternateCockpits))root.children[0].scale.set(a/REF_ASPECT*f/refTan,f/refTan,1);
     if(now-lastPaint>85){lastPaint=now;if(id==='kestrel')paint();else visualReadouts[id]?.();}
   }
  }
 return {group,update};
})();

/* REDLINE HANGAR V17 — actual embedded Kestrel GLB, shared GPU context. */
const REDLINE_SHOWROOM=(()=>{
 const REDLINE_HOVER_Y=6.2;
 const scene=new THREE.Scene();scene.background=null;scene.environment=null;
 // REDLINE v33 — dark architectural detailing tunnel, based on the supplied reference.
 // All fixtures are real geometry; illumination is kept to a small, fixed light budget.
 function installStudioProbe(){try{
  const cv=document.createElement('canvas');cv.width=1024;cv.height=512;
  const ctx=cv.getContext('2d');
  const g=ctx.createLinearGradient(0,0,0,512);
  g.addColorStop(0,'#03060a');g.addColorStop(.36,'#20242a');g.addColorStop(.51,'#090b10');g.addColorStop(1,'#020306');
  ctx.fillStyle=g;ctx.fillRect(0,0,1024,512);
  function softbox(x,y,w,h,opacity){
   const gl=ctx.createRadialGradient(x+w/2,y+h/2,4,x+w/2,y+h/2,Math.max(w*1.5,h*3));
   gl.addColorStop(0,`rgba(255,255,255,${opacity})`);
   gl.addColorStop(.3,`rgba(235,244,255,${opacity*.62})`);
   gl.addColorStop(1,'rgba(158,195,222,0)');
   ctx.fillStyle=gl;ctx.fillRect(x-w,y-2*h,w*3,h*5);
   ctx.fillStyle=`rgba(249,251,255,${opacity*.83})`;ctx.fillRect(x,y,w,h);
  }
  softbox(44,116,246,23,.96);softbox(543,112,332,24,.94);
  softbox(308,180,24,178,.73);softbox(890,165,26,182,.74);
  softbox(439,34,104,12,.48);
  const t=new THREE.CanvasTexture(cv);t.mapping=THREE.EquirectangularReflectionMapping;t.encoding=THREE.sRGBEncoding;
  const probe=pmg.fromEquirectangular(t);scene.environment=probe.texture;t.dispose();
  window.REDLINE_HANGAR_QA.probeReady=true;
 }catch(error){console.warn('Showroom reflection probe unavailable',error);}}
 scene.background=new THREE.Color(0x08101a);
 scene.fog=new THREE.Fog(0x0a1119,100,255);
 const camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.15,250);
 const industrial=new THREE.MeshStandardMaterial({color:0x242d32,metalness:.82,roughness:.34});
 const matte=new THREE.MeshStandardMaterial({color:0x111820,metalness:.28,roughness:.77});
 const black=new THREE.MeshStandardMaterial({color:0x040608,metalness:.24,roughness:.66});
 const red=new THREE.MeshBasicMaterial({color:0xb92332,toneMapped:false});
 const dullRed=new THREE.MeshBasicMaterial({color:0x461a24,toneMapped:false});
 // Repeating photographs of concrete are avoided; this is a real, nonuniform
 // procedural floor texture. Fine grain, expansion joints, and worn wet patches
 // read as satin-black polished concrete under white studio fixtures.
 function makeFloorTexture(tx,ty){
  const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');
  const base=ctx.createLinearGradient(0,0,512,512);
  base.addColorStop(0,'#22272c');base.addColorStop(.45,'#10161c');base.addColorStop(1,'#242a2d');
  ctx.fillStyle=base;ctx.fillRect(0,0,512,512);
  let seed=49052;const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
  for(let i=0;i<15000;i++){
   const v=rnd();ctx.fillStyle=v>.60?'rgba(171,189,191,.035)':'rgba(0,0,0,.085)';
   ctx.fillRect(rnd()*512,rnd()*512,.8+rnd()*2.2,.8+rnd()*3.5);
  }
  for(let i=0;i<9;i++){
   const x=rnd()*512,y=rnd()*512,rx=35+rnd()*100,ry=12+rnd()*51;
   const g=ctx.createRadialGradient(x,y,3,x,y,rx);
   g.addColorStop(0,'rgba(129,155,164,.08)');g.addColorStop(.63,'rgba(72,89,101,.045)');g.addColorStop(1,'rgba(0,0,0,0)');
   ctx.fillStyle=g;ctx.save();ctx.translate(x,y);ctx.scale(1,ry/rx);ctx.translate(-x,-y);ctx.fillRect(x-rx,y-rx,rx*2,rx*2);ctx.restore();
  }
  ctx.strokeStyle='rgba(2,5,8,.65)';ctx.lineWidth=2;
  for(const v of [0,256,511]){ctx.beginPath();ctx.moveTo(v,0);ctx.lineTo(v,512);ctx.stroke();ctx.beginPath();ctx.moveTo(0,v);ctx.lineTo(512,v);ctx.stroke();}
  const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(tx,ty);
  tex.encoding=THREE.sRGBEncoding;tex.anisotropy=4;return tex;
 }
 const floorMat=new THREE.MeshStandardMaterial({color:0x30383e,map:makeFloorTexture(3.5,7.5),metalness:.18,roughness:.44,envMapIntensity:.47});
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(120,225),floorMat);
 floor.rotation.x=-Math.PI/2;floor.position.set(5,-1.2,37);floor.receiveShadow=true;scene.add(floor);
 const apron=new THREE.Mesh(new THREE.PlaneGeometry(160,90),floorMat);
 apron.rotation.x=-Math.PI/2;apron.position.set(5,-1.215,-78);apron.receiveShadow=true;scene.add(apron);
 const stripeMat=new THREE.MeshStandardMaterial({color:0x35383d,metalness:.75,roughness:.29});
 for(const side of [-1,1]){
  const inlay=new THREE.Mesh(new THREE.BoxGeometry(.10,.018,175),stripeMat);
  inlay.position.set(5+side*10,-1.175,31);scene.add(inlay);
 }
 // A nearly flush turntable integrates with the floor instead of looking like a hologram.
 const pad=new THREE.Group();pad.position.set(5,-1.06,4);scene.add(pad);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(8.2,8.23,.12,80),new THREE.MeshStandardMaterial({color:0x0e161d,metalness:.47,roughness:.34,envMapIntensity:.74}));
 base.receiveShadow=true;pad.add(base);
 const steelRim=new THREE.Mesh(new THREE.TorusGeometry(8.23,.047,7,96),new THREE.MeshStandardMaterial({color:0x70777d,metalness:.90,roughness:.22}));
 steelRim.rotation.x=Math.PI/2;steelRim.position.y=.092;pad.add(steelRim);
 const fireRing=new THREE.Mesh(new THREE.TorusGeometry(7.90,.014,5,96),dullRed);
 fireRing.rotation.x=Math.PI/2;fireRing.position.y=.096;pad.add(fireRing);
 const pillarMat=new THREE.MeshStandardMaterial({color:0x141a1e,metalness:.76,roughness:.42});
 function strut(a,b,r=.15,material=pillarMat){
  const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p);
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),7),material);
  m.position.copy(p).add(q).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
  m.castShadow=false;scene.add(m);return m;
 }
 // The reference has an arched ceiling, not a white trapezoidal aircraft tent.
 const ySide=16.2,yRidge=31.6,sideLeft=-24,sideRight=34,zFront=-37,zBack=116;
 const halfWidth=(sideRight-sideLeft)*.5,centerX=5;
 function archY(x){
  const t=Math.min(1,Math.abs(x-centerX)/halfWidth);
  return ySide+(yRidge-ySide)*Math.sqrt(Math.max(0,1-t*t));
 }
 function makeWallTexture(){
  const c=document.createElement('canvas');c.width=c.height=256;const cx=c.getContext('2d');
  cx.fillStyle='#101419';cx.fillRect(0,0,256,256);
  for(let i=0;i<256;i+=5){cx.strokeStyle=i%20?'rgba(124,144,153,.018)':'rgba(180,196,201,.037)';cx.beginPath();cx.moveTo(i,0);cx.lineTo(i,256);cx.stroke()}
  for(let i=0;i<120;i++){const x=(i*63)%256,y=(i*137)%256;cx.fillStyle='rgba(165,173,178,.022)';cx.fillRect(x,y,3,6)}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(4,5);t.encoding=THREE.sRGBEncoding;return t;
 }
 const wallMap=makeWallTexture();
 const roofMat=new THREE.MeshStandardMaterial({color:0x1c232b,map:wallMap,roughness:.83,metalness:.18,side:THREE.DoubleSide});
 const wallMat=new THREE.MeshStandardMaterial({color:0x1a2129,map:wallMap,roughness:.74,metalness:.22,side:THREE.DoubleSide});
 const wallBack=new THREE.MeshStandardMaterial({color:0x090d13,metalness:.2,roughness:.86,side:THREE.DoubleSide});
 const ribs=[],leds=[],glowEdges=[];
 const addSegment=(arr,a,b,w,d)=>arr.push({a,b,w,d});
 // Batched geometries keep light strips cheap even with a long perspective tunnel.
 function batchedBeams(name,segments,material){
  const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,segments.length),temp=new THREE.Object3D();
  mesh.name=name;mesh.frustumCulled=false;
  const yAxis=new THREE.Vector3(0,1,0);
  segments.forEach((s,i)=>{
   const a=new THREE.Vector3(...s.a),b=new THREE.Vector3(...s.b),vec=b.clone().sub(a);
   temp.position.copy(a).add(b).multiplyScalar(.5);temp.quaternion.setFromUnitVectors(yAxis,vec.clone().normalize());
   temp.scale.set(s.w,vec.length(),s.d);temp.updateMatrix();mesh.setMatrixAt(i,temp.matrix);
  });mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);return mesh;
 }
 const roofVerts=[],roofUV=[];
 const arcSteps=22,bays=13;
 for(let bay=0;bay<bays;bay++){
  const z0=zFront+(zBack-zFront)*bay/bays,z1=zFront+(zBack-zFront)*(bay+1)/bays;
  for(let j=0;j<arcSteps;j++){
   const x0=sideLeft+(sideRight-sideLeft)*j/arcSteps,x1=sideLeft+(sideRight-sideLeft)*(j+1)/arcSteps;
   const a=[x0,archY(x0),z0],b=[x1,archY(x1),z0],c=[x1,archY(x1),z1],d=[x0,archY(x0),z1];
   roofVerts.push(...a,...b,...c,...a,...c,...d);
   roofUV.push(j/arcSteps,bay/bays,(j+1)/arcSteps,bay/bays,(j+1)/arcSteps,(bay+1)/bays,
              j/arcSteps,bay/bays,(j+1)/arcSteps,(bay+1)/bays,j/arcSteps,(bay+1)/bays);
  }
 }
 const roofGeo=new THREE.BufferGeometry();roofGeo.setAttribute('position',new THREE.Float32BufferAttribute(roofVerts,3));
 roofGeo.setAttribute('uv',new THREE.Float32BufferAttribute(roofUV,2));roofGeo.computeVertexNormals();
 const roof=new THREE.Mesh(roofGeo,roofMat);roof.receiveShadow=true;scene.add(roof);
 for(const side of[-1,1]){
  const x=side<0?sideLeft:sideRight;
  const sidewall=new THREE.Mesh(new THREE.PlaneGeometry(zBack-zFront,ySide+1.2),wallMat);
  sidewall.rotation.y=Math.PI/2;sidewall.position.set(x,(ySide-1.2)/2,(zFront+zBack)/2);
  sidewall.receiveShadow=true;scene.add(sidewall);
  // dark recessed slots and continuous light rails along both walls
  for(const y of[2.5,7.6,13.1]){
   addSegment(glowEdges,[x-side*.12,y,zFront+5],[x-side*.12,y,zBack-8],.16,.10);
  }
 }
 for(let i=0;i<=bays;i++){
  const z=zFront+(zBack-zFront)*i/bays;
  for(let j=0;j<arcSteps;j++){
   const x0=sideLeft+(sideRight-sideLeft)*j/arcSteps,x1=sideLeft+(sideRight-sideLeft)*(j+1)/arcSteps;
   const a=[x0,archY(x0)-.12,z],b=[x1,archY(x1)-.12,z];
   addSegment(ribs,a,b,.30,.23);
   // Every second rib is a continuous white architectural light band.
   if(i%2===0&&i<bays){
    addSegment(leds,[x0,archY(x0)-.50,z-.16],[x1,archY(x1)-.50,z-.16],.15,.09);
   }
  }
  for(const x of[sideLeft,sideRight])addSegment(ribs,[x,-1.13,z],[x,ySide,z],.29,.22);
 }
 batchedBeams('ShadowBlack_Tunnel_Ribs',ribs,new THREE.MeshStandardMaterial({color:0x222b31,metalness:.74,roughness:.37}));
 const brightLED=new THREE.MeshBasicMaterial({color:0xe9f3ff,toneMapped:false});
 batchedBeams('CoolWhite_LED_Vault_Bands',leds,brightLED);
 batchedBeams('Continuous_Wall_Light_Rails',glowEdges,new THREE.MeshBasicMaterial({color:0x9aafb9,toneMapped:false}));
 // Suspended slim light panels echo the reference's rectangular ceiling lights.
 const ceilingFixtures=[];
 for(let i=0;i<10;i++){
  const z=zFront+8+i*14.6;
  for(const x of[-7,17]){
   addSegment(ceilingFixtures,[x,27.4,z-2.2],[x,27.4,z+2.2],.18,.20);
  }
 }
 batchedBeams('Suspended_Linear_Ceiling_LEDs',ceilingFixtures,new THREE.MeshBasicMaterial({color:0xf4f7fa,toneMapped:false}));
 // End wall recedes into black; door frame supplies architectural depth.
 const rearShade=new THREE.Mesh(new THREE.PlaneGeometry(sideRight-sideLeft,ySide+4),wallBack);
 rearShade.position.set(5,9,zBack-.8);scene.add(rearShade);
 const equipmentMat=new THREE.MeshStandardMaterial({color:0x151b20,metalness:.65,roughness:.37});
 const trim=new THREE.MeshStandardMaterial({color:0x53616a,metalness:.8,roughness:.28});
 const rubber=new THREE.MeshStandardMaterial({color:0x090c0e,roughness:.94});
 for(const side of[-1,1]){
  for(const z of[6,42,77]){
   const x=5+side*23.5;
   const cabinet=new THREE.Mesh(new THREE.BoxGeometry(2.4,1.8,3.7),equipmentMat);
   cabinet.position.set(x,-.18,z);cabinet.castShadow=false;cabinet.receiveShadow=true;scene.add(cabinet);
   const handle=new THREE.Mesh(new THREE.BoxGeometry(.13,.8,.10),trim);handle.position.set(x-side*.45,.06,z-1.91);scene.add(handle);
   for(const dx of[-.8,.8])for(const dz of[-1.25,1.25]){
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.19,9),rubber);
    wheel.rotation.z=Math.PI/2;wheel.position.set(x+dx,-1,z+dz);scene.add(wheel);
   }
  }
 }
 // Floor-specific diffused glow hints at reflections without a costly SSR pass.
 const reflectCanvas=document.createElement('canvas');reflectCanvas.width=128;reflectCanvas.height=256;
 const cx=reflectCanvas.getContext('2d');const glow=cx.createLinearGradient(0,0,128,0);
 glow.addColorStop(0,'rgba(215,229,238,0)');glow.addColorStop(.36,'rgba(222,238,245,.015)');
 glow.addColorStop(.5,'rgba(242,248,254,.13)');glow.addColorStop(.64,'rgba(222,238,245,.015)');glow.addColorStop(1,'rgba(215,229,238,0)');
 cx.fillStyle=glow;cx.fillRect(0,0,128,256);
 const reflTex=new THREE.CanvasTexture(reflectCanvas);
 for(const x of[-12,-4,14,22]){
  const mir=new THREE.Mesh(new THREE.PlaneGeometry(2.8,115),new THREE.MeshBasicMaterial({map:reflTex,transparent:true,opacity:.45,depthWrite:false,side:THREE.DoubleSide}));
  mir.rotation.x=-Math.PI/2;mir.position.set(x,-1.165,23);mir.renderOrder=1;scene.add(mir);
 }

 // V80 hangar: architectural hardware authored as 5 batches, not dozens of draws.
 // Each accent follows the actual platform, runway or wall, without affecting
 // the vehicle model's root, collision shape, material or selected-airframe state.
 const detailBolt=new THREE.MeshStandardMaterial({color:0x87949b,metalness:.86,roughness:.30});
 const detailPanel=new THREE.MeshStandardMaterial({color:0x313c46,metalness:.69,roughness:.41,envMapIntensity:1.05});
 const detailTread=new THREE.MeshStandardMaterial({color:0x141c24,metalness:.42,roughness:.71});
 function hangarInstances(name,geometry,material,arr){
  const mesh=new THREE.InstancedMesh(geometry,material,arr.length),dummy=new THREE.Object3D();mesh.name=name;
  for(let i=0;i<arr.length;i++){
   const [x,y,z,sx,sy,sz,ry=0]=arr[i];
   dummy.position.set(x,y,z);dummy.rotation.set(0,ry,0);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;scene.add(mesh);return mesh;
 }
 const panelInstances=[],boltInstances=[],treadInstances=[];
 for(const side of[-1,1])for(let bay=0;bay<8;bay++){
  const z=-26+bay*17.2,x=5+side*15.5;
  panelInstances.push([x,-1.133,z,5.1,.032,6.4]);
  for(const dx of[-2.15,2.15])for(const dz of[-2.7,2.7])boltInstances.push([x+dx,-1.106,z+dz,.11,.10,.11]);
  treadInstances.push([x,-1.108,z+4.0,4.7,.016,.07]);
 }
 hangarInstances('Maintenance_Deck_Panels',new THREE.BoxGeometry(1,1,1),detailPanel,panelInstances);
 hangarInstances('Recessed_Steel_Fasteners',new THREE.CylinderGeometry(.5,.5,1,8),detailBolt,boltInstances);
 hangarInstances('Panel_Seams',new THREE.BoxGeometry(1,1,1),detailTread,treadInstances);
 const stageAccents=[],safetyBars=[];
 for(const side of[-1,1])for(let k=0;k<12;k++){
  const z=-32+k*11.4,x=5+side*10.4;
  stageAccents.push({a:[x,-1.095,z],b:[x,-1.095,z+4.3],w:.09,d:.07});
  safetyBars.push({a:[x+side*1.6,-1.085,z+5.1],b:[x+side*1.6,-1.085,z+5.75],w:.13,d:.10});
 }
 batchedBeams('Runway_Edge_Cool_White',stageAccents,new THREE.MeshBasicMaterial({color:0xb9dcef,toneMapped:false}));
 batchedBeams('Runway_Safety_Red',safetyBars,new THREE.MeshBasicMaterial({color:0xff263a,toneMapped:false}));
 const marking=document.createElement('canvas');marking.width=1024;marking.height=192;
 const mctx=marking.getContext('2d');mctx.clearRect(0,0,1024,192);
 mctx.fillStyle='#dfe9f2';mctx.font='900 italic 126px Arial';mctx.fillText('REDLINE',42,128);
 mctx.fillStyle='#f04453';mctx.fillRect(44,155,465,8);
 mctx.font='500 30px Arial';mctx.fillStyle='#a9b8c5';mctx.fillText('AIRFRAME TEST FACILITY  /  BAY 04',44,186);
 const markingTexture=new THREE.CanvasTexture(marking);markingTexture.colorSpace=THREE.SRGBColorSpace;
 const markingMesh=new THREE.Mesh(new THREE.PlaneGeometry(17,3.2),new THREE.MeshBasicMaterial({map:markingTexture,transparent:true,depthWrite:false}));
 markingMesh.position.set(5,16,zBack-1.5);markingMesh.rotation.y=Math.PI;scene.add(markingMesh);
 const hangarDecorationStats={panels:panelInstances.length,bolts:boltInstances.length,runwayLights:stageAccents.length+safetyBars.length,batchedDraws:5};

 // Lighting is carefully constrained: three photographic studio sources, two
 // low-intensity practicals, plus faint ambient. Lights don't cast tunnel shadows.
 const ambient=new THREE.HemisphereLight(0xb5cde5,0x10151d,.31);scene.add(ambient);if(Number(THREE.REVISION)>=155)ambient.intensity*=Math.PI;
 const key=new THREE.SpotLight(0xf6f8ff,Number(THREE.REVISION)>=155?5.3*135:5.3,115,Math.PI*.33,.8,1.15);
 key.position.set(-13,24,-15);key.target.position.set(5,2.6,4);scene.add(key,key.target);
 key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.bias=-.0002;key.shadow.normalBias=.035;
 key.shadow.camera.near=.5;key.shadow.camera.far=115;
 const rim=new THREE.SpotLight(0xb6d5ff,Number(THREE.REVISION)>=155?3.5*135:3.5,105,Math.PI*.29,.78,1.18);
 rim.position.set(20,23,30);rim.target.position.set(5,2.6,4);scene.add(rim,rim.target);
 const fill=new THREE.SpotLight(0xffffff,Number(THREE.REVISION)>=155?1.7*125:1.7,100,Math.PI*.41,.86,1.2);
 fill.position.set(18,16,-21);fill.target.position.set(5,2.3,4);scene.add(fill,fill.target);
 for(const x of[-11,21]){
  const practical=new THREE.PointLight(0xe0f0ff,Number(THREE.REVISION)>=155 ? .62*100 : .62,38,2);
  practical.position.set(x,20,0);scene.add(practical);
 }
 // Low-frequency penumbra reinforces the actual cast shadow, not an opaque disk.
 function softShadowTex(){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  const g=x.createRadialGradient(64,64,8,64,64,63);
  g.addColorStop(0,'rgba(0,0,0,.66)');g.addColorStop(.48,'rgba(0,0,0,.38)');g.addColorStop(1,'rgba(0,0,0,0)');
  x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);
 }
 const shadowMap=softShadowTex();
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(18,18),new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,opacity:.35,depthWrite:false}));
 shadow.rotation.x=-Math.PI/2;shadow.position.set(5,-.925,4);scene.add(shadow);
 const penumbra=new THREE.Mesh(new THREE.PlaneGeometry(23,23),new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,opacity:.09,depthWrite:false}));
 penumbra.rotation.x=-Math.PI/2;penumbra.position.set(5,-.934,4);scene.add(penumbra);
 const ceilingProfile=x=>archY(x);
  window.REDLINE_HANGAR_QA={theme:'black-led-detailing-tunnel',eave:ySide,ridge:yRidge,front:zFront,rear:zBack,ledArchCount:Math.ceil(bays/2),roofSegments:arcSteps,clearanceAt:x=>ceilingProfile(x),roomForEntranceAtCenter:ceilingProfile(5)-21};
 window.REDLINE_HANGAR_QA.decorations=hangarDecorationStats;
 let model=null,mixer=null,materialOverrides=[],ready=false,elapsed=0,screen='landing',lastScreen='',displayYaw=0,framingSample=0,showroomCameraDistance=43,showroomFocusFraction=.76;
 let kestrelShowroom=null,bladeShowroom=null,bladeShowroomJets=null,copperShowroom=null,copperShowroomFx=null,spiritShowroom=null,spiritShowroomFx=null,visibleAirframe='kestrel',selectedAirframeArriving=false;
 let showroomSwitch=null,showroomExit=null,garageRevealPose=null;
 let showroomSelectionInitialized=false;
 let showroomDrag=false,lastDragX=0;
 document.addEventListener('pointerdown',e=>{const stage=e.target.closest?.('.v25-garage .rl-model-stage');if(!stage||!model)return;showroomDrag=true;lastDragX=e.clientX;stage.setPointerCapture?.(e.pointerId);});
 document.addEventListener('pointermove',e=>{if(!showroomDrag||!model)return;const dx=Math.max(-85,Math.min(85,e.clientX-lastDragX));lastDragX=e.clientX;displayYaw+=dx*.008;});
 document.addEventListener('pointerup',()=>{showroomDrag=false;});document.addEventListener('pointercancel',()=>{showroomDrag=false;});
 // Real 3D turbine exhaust; each flame travels with its animated GLB rotor gimbal.
 const showroomExhaust=[];let kestrelShowroomJets=[];
 const exhaustCore=new THREE.MeshBasicMaterial({color:0x9ff6ff,transparent:true,opacity:.37,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
 const exhaustHalo=new THREE.MeshBasicMaterial({color:0xf5e5e0,transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
 const exGeo=new THREE.ConeGeometry(.55,2.55,18,1,true);
 const haloGeo=new THREE.ConeGeometry(.89,2.75,18,1,true);
 const glowGeo=new THREE.CircleGeometry(2.2,44);
 const glowMat=new THREE.MeshBasicMaterial({color:0xa8b9c6,transparent:true,opacity:.09,depthWrite:false,blending:THREE.AdditiveBlending});
 const landingGlow=new THREE.Mesh(glowGeo,glowMat);landingGlow.rotation.x=-Math.PI/2;landingGlow.position.set(5,-.87,4);scene.add(landingGlow);
 // Slower cinematic runway reveal: two large rotating halo arcs and a clean precision grid.
 const haloRingMat=new THREE.MeshBasicMaterial({color:0xe52239,transparent:true,opacity:.17,depthWrite:false,blending:THREE.AdditiveBlending});
 const haloArcA=new THREE.Mesh(new THREE.TorusGeometry(10.2,.035,5,128,Math.PI*1.4),haloRingMat.clone());
 const haloArcB=new THREE.Mesh(new THREE.TorusGeometry(11.6,.025,5,128,Math.PI*1.12),haloRingMat.clone());
 haloArcA.rotation.x=haloArcB.rotation.x=Math.PI/2;
 haloArcA.position.set(5,-.86,4);haloArcB.position.set(5,-.85,4);scene.add(haloArcA,haloArcB);
 const padTicks=new THREE.Group();scene.add(padTicks);
 for(let k=0;k<48;k++){const a=k*Math.PI/24,needle=new THREE.Mesh(new THREE.BoxGeometry(.09,.016,k%6===0?.77:.32),k%6===0?red:dullRed);
  needle.position.set(5+Math.cos(a)*9.8,-.84,4+Math.sin(a)*9.8);needle.rotation.y=-a+Math.PI/2;padTicks.add(needle)}
 const showroomDust=new THREE.Group();showroomDust.position.set(5,-.86,4);scene.add(showroomDust);
 const dustMat=new THREE.MeshBasicMaterial({color:0xbac3c7,transparent:true,opacity:.1,depthWrite:false,side:THREE.DoubleSide});
 for(let k=0;k<8;k++){
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.3+k*.75,.024,4,48),dustMat.clone());
  ring.rotation.x=Math.PI/2;ring.position.y=.003+k*.007;showroomDust.add(ring)
 }
 function attachModel(){
  if(model||!window.REDLINE_MODEL_TEMPLATE)return;
  model=window.REDLINE_MODEL_TEMPLATE.clone(true);
  model.name='Redline_Real_Kestrel_X4_Showroom';kestrelShowroom=model;
  // 19% larger physical model, then tighter composition below. It remains inside
  // the geometry-derived roof clearance envelope even during the 6-second approach.
  model.scale.setScalar(2.70);REDLINE_VISUALS.detailDrone(THREE,model);scene.add(model);
  // v54: never flash the default Kestrel while a saved craft is loading.
  model.visible=false;
  window.REDLINE_HANGAR_QA.modelLocalBounds=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).toArray();
  // A showroom-only material palette prevents the polished garage finish from
  // mutating the in-race aircraft. Cache by source material, not mesh (243 meshes).
  // Subtle deterministic micro-roughness: tiny highlights reveal curvature.
  // Only applied in the hangar, without modifying the in-race craft.
  // Deterministic brushed-metal microtexture. Correlated directional grain and
  // sparse fine scratches replace a repetitive sine pattern that shimmered in motion.
  const microCanvas=document.createElement('canvas');microCanvas.width=microCanvas.height=256;
  const microCtx=microCanvas.getContext('2d');
  const micro=microCtx.createImageData(256,256);let microSeed=120493;
  const noise=()=>{microSeed=(1664525*microSeed+1013904223)>>>0;return microSeed/4294967296;};
  const rows=Array.from({length:256},()=>noise());
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
   const i=y*256+x;
   const grain=rows[y]*17+(noise()-.5)*23+Math.sin(x*.035+y*.1)*3;
   const v=Math.max(170,Math.min(242,198+grain));
   micro.data[i*4]=v;micro.data[i*4+1]=v;micro.data[i*4+2]=v;micro.data[i*4+3]=255;
  }
  microCtx.putImageData(micro,0,0);
  const microRoughness=new THREE.CanvasTexture(microCanvas);
  microRoughness.wrapS=microRoughness.wrapT=THREE.RepeatWrapping;
  microRoughness.repeat.set(5.2,5.2);microRoughness.anisotropy=4;
  const materialCache=new Map();
  model.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;
   if(!o.material)return;
   const mats=Array.isArray(o.material)?o.material:[o.material];
   const changed=mats.map(mat=>{
    if(materialCache.has(mat))return materialCache.get(mat);
    const name=mat.name||'';
    const studioPaint=/bead blasted|iridescent|ceramic black|forged graphite/i.test(name);
    const glass=/polarized smoked canopy/i.test(name);
    // Never call MeshPhysicalMaterial.copy(MeshStandardMaterial): the physical
    // copy method accesses clearcoatNormalScale and other properties absent
    // on a standard material, aborting attachment and trapping the boot curtain.
    const copy=(mat.isMeshStandardMaterial&&(studioPaint||glass))
     ?new THREE.MeshPhysicalMaterial({
       name:mat.name,color:mat.color.clone(),map:mat.map,normalMap:mat.normalMap,
       normalScale:mat.normalScale?.clone(),roughnessMap:mat.roughnessMap,
       metalnessMap:mat.metalnessMap,metalness:mat.metalness,roughness:mat.roughness,
       emissive:mat.emissive.clone(),emissiveMap:mat.emissiveMap,
       emissiveIntensity:mat.emissiveIntensity,side:mat.side,
       transparent:mat.transparent,opacity:mat.opacity,alphaTest:mat.alphaTest,
       depthWrite:mat.depthWrite,depthTest:mat.depthTest,
       wireframe:mat.wireframe,vertexColors:mat.vertexColors,
       flatShading:mat.flatShading,envMapIntensity:mat.envMapIntensity||1,
       clearcoat:studioPaint?.74:1,clearcoatRoughness:studioPaint?.14:.06
      })
     :mat.clone();
    if(studioPaint){
      copy.roughness=Math.max(.21,Math.min(.38,copy.roughness*.97));
      copy.clearcoat=.82;copy.clearcoatRoughness=.12;copy.envMapIntensity=1.48;
      if(/bead blasted titanium/i.test(name))copy.color.setHex(0x4a606c);
      else if(/ceramic black/i.test(name))copy.color.setHex(0x151e28);
      else if(/forged graphite/i.test(name))copy.color.setHex(0x202c35);
      copy.roughnessMap=microRoughness;
    }
    else if(glass){
      // v43: matching clear Kestrel / Blade showroom glazing, single front
      // surface with depth-write disabled to avoid sorting artifacts.
      copy.color.setHex(0x8aabbc);copy.transparent=true;copy.opacity=.47;
      copy.depthWrite=false;copy.depthTest=true;copy.side=THREE.FrontSide;
      copy.metalness=.06;copy.roughness=.085;copy.clearcoat=1;
      copy.clearcoatRoughness=.05;copy.envMapIntensity=1.80;copy.needsUpdate=true;
      o.castShadow=false;o.receiveShadow=false;o.renderOrder=9;
    }
    else if(copy.isMeshStandardMaterial){copy.envMapIntensity=.95;}
    if(name==='03 / iridescent titanium copper')materialOverrides.push(copy);
    materialCache.set(mat,copy);return copy;
   });
   o.material=Array.isArray(o.material)?changed:changed[0];
  });
  window.REDLINE_HANGAR_QA.studioMaterialCount=materialCache.size;
  window.REDLINE_HANGAR_QA.canopyMode='v43-low-profile-clear-glass';
  // Match the physical rotors rather than creating a fake drone or disembodied jets.
  for(const tag of ['PF','PR','SF','SR']){
   const rotor=model.getObjectByName('TiltRotor_'+tag);
   if(!rotor)continue;
   // The Kestrel uses the same feathered afterburner material as Blade Noir.
   // Attach each jet to its real animated gimbal for accurate vectoring.
   kestrelShowroomJets.push(...REDLINE_BLADE_EXHAUST.make(rotor,true,[
     {name:'SHOWROOM_KX4_'+tag,p:[0,-1.31,0],rear:false,rotor:tag,followMount:true}
   ]));
  }
  mixer=new THREE.AnimationMixer(model);
  for(const clip of(window.REDLINE_MODEL_CLIPS||[]))if(/lift impeller rotor/i.test(clip.name))mixer.clipAction(clip).play();
  elapsed=0; // GLB may finish loading late: never skip the user's 3D fly-in.
  ready=true;window.REDLINE_SHOWROOM_READY=true;
  // Build the costly reflection probe only AFTER the first successful hangar
  // frame, so a slow PMREM compile cannot hold the initialization overlay up.
  if(!window.REDLINE_STUDIO_PROBE_QUEUED){
   window.REDLINE_STUDIO_PROBE_QUEUED=true;
   setTimeout(()=>{if(window.REDLINE_SHOWROOM?.ready)installStudioProbe();},1700);
  }
 }
 function attachBladeShowroom(){
  if(bladeShowroom||!window.REDLINE_BLADE_TEMPLATE)return;
  bladeShowroom=new THREE.Group();bladeShowroom.name='Blade_Noir_v9_CLOSED_Real_3D_Showroom';
  const art=new THREE.Group();art.rotation.y=Math.PI;
  const actual=window.REDLINE_BLADE_TEMPLATE.clone(true);
  art.add(actual);bladeShowroom.add(art);bladeShowroom.scale.setScalar(1.93);
  bladeShowroomJets=REDLINE_BLADE_EXHAUST.make(actual,true);
  actual.traverse(o=>{if(!o.isMesh)return;
   o.castShadow=true;o.receiveShadow=true;
   // Showroom-only material instances avoid mutating the in-game model.
   const mats=Array.isArray(o.material)?o.material:[o.material];
   const copies=mats.map(m=>{const n=m.clone();
    if(n.isMeshStandardMaterial){n.envMapIntensity=2.05;
      if(/paint|armor|machined|engine/i.test(n.name||'')){n.metalness=Math.max(.72,n.metalness);n.roughness=Math.min(.24,n.roughness);}
      if(/glass/i.test(n.name||'')){n.roughness=.08;n.transparent=true;n.opacity=.74;n.depthWrite=false;n.side=THREE.DoubleSide;}
     }return n;});
   o.material=Array.isArray(o.material)?copies:copies[0];
  });
  bladeShowroom.visible=false;scene.add(bladeShowroom);
 }
 function attachCopperShowroom(){
  if(copperShowroom||!window.REDLINE_COPPER_TEMPLATE)return;
  copperShowroom=new THREE.Group();copperShowroom.name='Copper_Wraith_v4_Real_3D_Showroom';
  const adapter=new THREE.Group();adapter.rotation.y=Math.PI;
  const actual=window.REDLINE_COPPER_TEMPLATE.clone(true);
  adapter.add(actual);copperShowroom.add(adapter);copperShowroom.scale.setScalar(2.48);
  actual.traverse(o=>{if(!o.isMesh)return;
    o.castShadow=true;o.receiveShadow=true;
    const src=Array.isArray(o.material)?o.material:[o.material];
    const mats=src.map(m=>{const n=m.clone();if(n.isMeshStandardMaterial){
      n.envMapIntensity=2.25;
      if(/metal|bronze|armor|plating|carbon/i.test(n.name||'')){
        n.metalness=Math.max(.72,n.metalness);n.roughness=Math.min(.28,n.roughness);
      }
      if(/glass|viewport/i.test(n.name||'')){
        n.transparent=true;n.opacity=.72;n.depthWrite=false;n.roughness=.06;
        n.side=THREE.DoubleSide;o.castShadow=false;o.renderOrder=9;
      }
    }return n;});o.material=Array.isArray(o.material)?mats:mats[0];
  });
  copperShowroomFx=REDLINE_COPPER_FX.make(actual,true);
  copperShowroom.visible=false;scene.add(copperShowroom);
 }
 function attachSpiritShowroom(){
  if(spiritShowroom||!window.REDLINE_SPIRIT_TEMPLATE)return;
  spiritShowroom=new THREE.Group();spiritShowroom.name='Spirit_Nocturne_v4_3D_Showroom';
  const adapter=new THREE.Group();adapter.rotation.y=Math.PI;
  // Scale original 52.4-wide wing into same framing as the other models.
  adapter.scale.setScalar(.25);
  const actual=window.REDLINE_SPIRIT_TEMPLATE.clone(true);adapter.add(actual);
  spiritShowroom.add(adapter);spiritShowroom.scale.setScalar(2.58);
  const cache=new Map();actual.traverse(o=>{if(!o.isMesh)return;
   o.castShadow=true;o.receiveShadow=true;
   const src=Array.isArray(o.material)?o.material:[o.material];
   const mats=src.map(mat=>{if(cache.has(mat))return cache.get(mat);
    const m=mat.clone();if(m.isMeshStandardMaterial){
     const name=(m.name||'').toLowerCase();
     m.envMapIntensity=/glass/.test(name)?.90:/skin|carbon|wing|black_edge/.test(name)?.47:.72;
     if(/glass/i.test(m.name||'')){m.transparent=true;m.opacity=.59;m.depthWrite=false;
      m.roughness=Math.max(.10,m.roughness);m.side=THREE.DoubleSide;o.castShadow=false;o.renderOrder=9;}
     else if(/skin|carbon|wing|black_edge/i.test(name)){
      m.metalness=Math.min(.15,m.metalness);m.roughness=Math.max(.46,m.roughness);
      if(m.isMeshPhysicalMaterial){m.clearcoat=Math.min(.22,m.clearcoat);m.clearcoatRoughness=Math.max(.48,m.clearcoatRoughness);}
     }
     else if(/bevel|gunmetal/i.test(name)){m.roughness=Math.max(.44,m.roughness);}
    }cache.set(mat,m);return m;});o.material=Array.isArray(o.material)?mats:mats[0];
  });
  spiritShowroomFx=REDLINE_SPIRIT_FX.make(actual,true);
  spiritShowroom.visible=false;scene.add(spiritShowroom);
 }
 
  const rl46Clamp=v=>Math.max(0,Math.min(1,v));
  const rl46Ease=v=>{const t=rl46Clamp(v);return t*t*(3-2*t);};
  const rl46ModelChoices=()=>({kestrel:kestrelShowroom,blade:bladeShowroom,copper:copperShowroom,spirit:spiritShowroom});
   // V76: Calibrate once at the unanimated, full-scale rest pose. Frame-by-frame
   // AABB floor/roof adjustments made arrivals pop vertically as yaw/scale changed.
   const showroomHomeHeights=new WeakMap();
   function showroomHomeY(craft){
    if(!craft)return REDLINE_HOVER_Y;
    const cached=showroomHomeHeights.get(craft);if(cached!==undefined)return cached;
    const p=craft.position.clone(),r=craft.rotation.clone(),sc=craft.scale.clone();
    let home=REDLINE_HOVER_Y;
    try{
     craft.position.set(5,REDLINE_HOVER_Y,4);craft.rotation.set(0,0,0);
     scene.updateMatrixWorld(true);
     const bounds=new THREE.Box3().setFromObject(craft);
     const roof=Math.min(ceilingProfile(bounds.min.x),ceilingProfile(bounds.max.x))-2.2;
     const floorLift=Math.max(0,.55-bounds.min.y);
     const roofRoom=Math.max(0,roof-bounds.max.y);
     home+=Math.min(floorLift,roofRoom);
    }finally{
     craft.position.copy(p);craft.rotation.copy(r);craft.scale.copy(sc);
     scene.updateMatrixWorld(true);
    }
    showroomHomeHeights.set(craft,home);
    return home;
   }
   window.REDLINE_HANGAR_POSE_STATUS=()=>({airframe:visibleAirframe,homeY:showroomHomeY(model),
     modelY:model?.position.y??null,modelScale:model?.scale?.toArray()??null,
     modelYaw:model?.rotation.y??null,switchTime:showroomSwitch?.t??null,
     landingElapsed:elapsed,screen});
  function showroomOnly(craft){
   for(const choice of Object.values(rl46ModelChoices()))if(choice)choice.visible=choice===craft;
  }
  function selectShowroomAirframe(){
   const value=window.redlineUI?.config.model;
   const desired=['blade','copper','spirit'].includes(value)?value:'kestrel';
   const choices=rl46ModelChoices(),chosen=choices[desired];
   if(!showroomSelectionInitialized){
    // The saved selection owns the very FIRST frame. No Kestrel placeholder.
    showroomOnly(null);
    if(!chosen)return; // The lazy GLB is still decoding; hangar stays empty.
    model=chosen;visibleAirframe=desired;showroomSelectionInitialized=true;
    model.position.set(5,showroomHomeY(model),4);model.rotation.set(0,displayYaw,0);
    showroomOnly(model);elapsed=0;
    window.REDLINE_HANGAR_QA.currentAirframe=visibleAirframe;
    return;
   }
   if(!chosen||showroomExit)return;
   if(showroomSwitch){
    const tx=showroomSwitch;
    // The latest choice wins until the arrival begins; afterwards it is queued.
    if(!tx.entered)tx.toId=desired;
    else if(desired!==tx.toId)tx.pending=desired;
    return;
   }
   if(desired===visibleAirframe)return;
   if(!model||screen!=='solo'||window.redlineUI?.config.reducedMotion){
    model=chosen;visibleAirframe=desired;
    model.position.set(5,showroomHomeY(model),4);model.rotation.set(0,displayYaw,0);
    showroomOnly(model);
    window.REDLINE_HANGAR_QA.currentAirframe=visibleAirframe;
    return;
   }
   showroomOnly(model);
   showroomSwitch={from:model,fromId:visibleAirframe,toId:desired,t:0,entered:false,
    pending:null,fromP:model.position.clone(),fromR:model.rotation.clone(),
    fromScale:model.scale.clone(),incoming:null,inScale:null};
   elapsed=8;
  }
  function showroomSelectionArrival(t,craft,baseScale){
   // The previous craft has completely departed before the incoming appears.
   // Absolute poses make the animation independent of frame rate.
   const u=rl46Ease((t-.66)/.98),away=1-u;
   craft.position.set(5+5.2*away,showroomHomeY(craft)+1.2*away,4+39*away);
   craft.rotation.set(-.12*away,.50*away+displayYaw*u,.18*away);
   craft.scale.copy(baseScale).multiplyScalar(.69+.31*u);
  }
  function updateShowroomSwitch(dt){
   const tx=showroomSwitch;if(!tx)return;
   tx.t+=dt;
   const depart=rl46Ease(tx.t/.64);
   tx.from.position.copy(tx.fromP);
   tx.from.position.x+=5.8*depart;
   tx.from.position.y+=.82*depart;
   tx.from.position.z+=41*depart;
   tx.from.rotation.set(tx.fromR.x-.16*depart,tx.fromR.y+.57*depart,tx.fromR.z-.21*depart);
   tx.from.scale.copy(tx.fromScale).multiplyScalar(1-.38*depart);
   if(tx.t>=.66&&!tx.entered){
    // Strict handoff, never simultaneous visibility or shared spawn space.
    tx.from.visible=false;
    tx.from.scale.copy(tx.fromScale);
    const next=rl46ModelChoices()[tx.toId];
    if(next){
     tx.incoming=next;tx.inScale=next.scale.clone();tx.entered=true;
     showroomOnly(tx.incoming);
    }
   }
   if(tx.entered)showroomSelectionArrival(tx.t,tx.incoming,tx.inScale);
   if(tx.t>=1.64&&tx.entered){
    model=tx.incoming;visibleAirframe=tx.toId;
    model.position.set(5,showroomHomeY(model),4);model.rotation.set(0,displayYaw,0);
    model.scale.copy(tx.inScale);
    showroomOnly(model);
    const queued=tx.pending;
    showroomSwitch=null;elapsed=8;selectedAirframeArriving=false;
    window.REDLINE_HANGAR_QA.currentAirframe=visibleAirframe;
    window.REDLINE_HANGAR_QA.modelLocalBounds=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).toArray();
    // The next update resolves the user's final scroll choice, not an old tap.
    if(queued&&queued!==visibleAirframe&&window.redlineUI?.config.model!==queued){
     // Ignore stale queued choices; config.model is authoritative.
    }
   }
  }
  function showroomFlightIn(t){
   const u=rl46Ease(t/2.65),away=1-u;
   model.position.set(5+5*away,showroomHomeY(model)+1.1*away,4+36*away);
   model.rotation.set(-.10*away,.50*away+displayYaw*u,-.19*away);
  }
  function showroomGarageReveal(t){
   const u=rl46Ease(t/1.45),away=1-u,arc=Math.sin(Math.PI*u);
   const p=garageRevealPose?.p,r=garageRevealPose?.r;
   model.position.set(5+(p?(p.x-5):4.5)*away+2.35*arc,
    showroomHomeY(model)+(p?(p.y-showroomHomeY(model)):1.2)*away+.62*arc,
    4+(p?(p.z-4):22)*away-3.5*arc);
   model.rotation.set((r?r.x:-.10)*away-.10*arc,
    (r?r.y:.55)*away+displayYaw*u+.22*arc,
    (r?r.z:.16)*away+.15*arc);
  }
  function beginExit(){
   if(showroomExit||window.redlineUI?.config.reducedMotion)return;
   // Exit the one visible aircraft, even if model swapping was interrupted.
   const part=showroomSwitch?.entered?showroomSwitch.incoming:showroomSwitch?.from||model;
   showroomOnly(part);
   showroomExit={t:0,parts:part?[{o:part,p:part.position.clone(),r:part.rotation.clone(),scale:part.scale.clone()}]:[]};
  }
  function updateShowroomExit(dt){
   if(!showroomExit)return;showroomExit.t+=dt;
   const u=rl46Ease(showroomExit.t/.64);
   for(const part of showroomExit.parts){
    part.o.position.copy(part.p);
    part.o.position.x+=7*u;part.o.position.y+=.5*u;part.o.position.z+=35*u;
    part.o.rotation.set(part.r.x-.09*u,part.r.y+.65*u,part.r.z-.23*u);
    part.o.scale.copy(part.scale).multiplyScalar(1-.35*u);
   }
  }
 // V82 camera correction: measure the visible aircraft mesh, not its pivot or
 // its exhaust planes. Geometry is cached and camera fitting is performed ONLY
 // on page, model or viewport change. Idle rotation never changes zoom.
 const heroLocalPoints=new WeakMap();
 let heroCameraState=null,heroPoseAnchor='';
 const HERO_BASE_SCALE={kestrel:2.70,blade:1.93,copper:2.48,spirit:2.58};
 function getHeroLocalPoints(craft){
  if(!craft)return [];
  const cached=heroLocalPoints.get(craft);if(cached)return cached;
  craft.updateMatrixWorld(true);
  const inverse=craft.matrixWorld.clone().invert(), matrix=new THREE.Matrix4();
  const points=[],q=new THREE.Vector3();
  craft.traverse(o=>{
   if(!o.isMesh||!o.geometry||!o.visible)return;
   const mats=Array.isArray(o.material)?o.material:[o.material];
   if(!mats.some(m=>m&&m.visible!==false&&(!m.transparent||m.opacity>=.16)))return;
   if(/exhaust|plume|trail|beam|particle|spark|halo|thruster.?flare|smoke|fire|jet.?glow/i.test(o.name||''))return;
   if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
   const box=o.geometry.boundingBox;if(!box||box.isEmpty())return;
   matrix.multiplyMatrices(inverse,o.matrixWorld);
   for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
    q.set(x,y,z).applyMatrix4(matrix);
    if(Number.isFinite(q.x)&&Number.isFinite(q.y)&&Number.isFinite(q.z))points.push(q.clone());
   }
  });
  heroLocalPoints.set(craft,points);
  return points;
 }
 function heroSafeRectangle(mode,w,h){
  const compact=w<=720;
  if(compact){
   // Small screens have a vertically stacked selector, not a horizontal bay.
   return {left:w*.15,right:w*.85,top:h*.16,bottom:h*.63};
  }
  const headerGap=Math.max(74,Math.min(116,h*.14));
  const copy=mode==='solo'
   ? document.querySelector('.rl-garage .rl45-panel,.rl-garage .rl-select-panel')
   : document.querySelector('.rl-home .rl-hero-copy');
  const edge=copy?.getBoundingClientRect().right||0;
  const left=Math.min(w*.73,Math.max(mode==='solo'?w*.435:w*.50,edge+Math.max(19,w*.017)));
  let bottom=h-Math.max(26,Math.min(70,h*.095));
  // The aircraft must also stay ABOVE the large lower-right model label,
  // not just to the right of the controls. Hidden short-screen labels have
  // zero height and therefore cannot impose a spurious empty zone.
  if(mode==='solo'){
   const label=document.querySelector('.rl-garage .rl45-model-readout');
   const rect=label?.getBoundingClientRect();
   if(rect&&rect.height>18&&rect.width>35&&rect.top>headerGap+100)
    bottom=Math.min(bottom,rect.top-Math.max(15,h*.023));
  }
  return {left,right:w-Math.max(18,Math.min(46,w*.025)),
    top:headerGap,bottom};
 }
 function fitShowroomHero(craft,airframe,mode,w,h){
  const bounds=heroSafeRectangle(mode,w,h);
  const verts=getHeroLocalPoints(craft);
  const frameKey=[mode,airframe,w,h,Math.round(bounds.left),Math.round(bounds.right),Math.round(bounds.top),Math.round(bounds.bottom),verts.length].join(':');
  if(heroCameraState?.key===frameKey)return heroCameraState;
  // The real cockpit/body is sampled at all eight yaw orientations. An orbiting
  // model therefore cannot grow past the available right-side showcase area.
  const scales=HERO_BASE_SCALE[airframe]||1.93;
  const home=showroomHomeY(craft);
  const pt=new THREE.Vector3();
  camera.fov=44;camera.clearViewOffset();camera.aspect=w/h;camera.updateProjectionMatrix();
  const samples=Array.from({length:8},(_,i)=>[Math.cos(i*Math.PI/4),Math.sin(i*Math.PI/4)]);
  function footprint(distance){
   camera.position.set(5+Math.cos(-1.2)*distance,19.2,4+Math.sin(-1.2)*distance);
   camera.lookAt(new THREE.Vector3(5,REDLINE_HOVER_Y+1,4));
   camera.updateMatrixWorld(true);
   let l=Infinity,r=-Infinity,t=Infinity,b=-Infinity;
   const poses=[];
   for(const [c,si] of samples){
    let pl=Infinity,pr=-Infinity,ptop=Infinity,pbottom=-Infinity;
    for(const v of verts){
     const xx=v.x*scales,zz=v.z*scales;
     pt.set(5+xx*c+zz*si,home+v.y*scales,4-xx*si+zz*c).project(camera);
     const x=(pt.x+1)*w*.5,y=(1-pt.y)*h*.5;
     if(x<pl)pl=x;if(x>pr)pr=x;if(y<ptop)ptop=y;if(y>pbottom)pbottom=y;
    }
    poses.push({l:pl,r:pr,t:ptop,b:pbottom});
    if(pl<l)l=pl;if(pr>r)r=pr;if(ptop<t)t=ptop;if(pbottom>b)b=pbottom;
   }
   if(!Number.isFinite(l))return {l:w*.5,r:w*.5,t:h*.5,b:h*.5,poses:[]};
   return {l,r,t,b,poses};
  }
  // Choose a broad, legible three-quarter presentation using the actual
  // aircraft silhouette, not the union of eight different orientations.
  // That union was roughly twice the visible body and left it tiny on screen.
  const overview=footprint(72);
  let preferredIndex=0,bestScore=-Infinity;
  overview.poses.forEach((pose,i)=>{
   const pw=pose.r-pose.l,ph=pose.b-pose.t;
   const score=pw+.12*ph;
   if(Number.isFinite(score)&&score>bestScore){bestScore=score;preferredIndex=i;}
  });
  const limitW=(bounds.right-bounds.left)*.83;
  const limitH=(bounds.bottom-bounds.top)*.79;
  let lo=26,hi=130;
  for(let i=0;i<15;i++){
   const mid=(lo+hi)*.5,pose=footprint(mid).poses[preferredIndex];
   if(!pose||pose.r-pose.l>limitW||pose.b-pose.t>limitH)lo=mid;
   else hi=mid;
  }
  // The GLB's conservatively sampled mesh extents are larger than its actual
  // visible painted silhouette (particularly Kestrel's rotor and FX hierarchy).
  // The original geometric fit therefore pulled the craft far into the tunnel.
  // Enforce per-craft art-direction limits verified by full WebGL screenshots.
  const isWide=w>=1200;
  const calibratedCap=mode==='landing'
   ? (airframe==='kestrel'?(isWide?56:56):airframe==='spirit'?(isWide?56:72):130)
   : (airframe==='kestrel'?(isWide?62:55):130);
  const distance=Math.max(26,Math.min(130,hi,calibratedCap));
  const box=footprint(distance);
  const best=box.poses[preferredIndex]||box;
  const desiredX=(bounds.left+bounds.right)*.5;
  const desiredY=(bounds.top+bounds.bottom)*.5;
  // Center the actual aircraft root, not the conservative body+FX union.
  // The 3D pivot is the stable target for landing, selection and switching.
  const offsetX=w*.5-desiredX;
  const offsetY=h*.5-desiredY+(mode==='solo'?18:0);
  heroCameraState={key:frameKey,distance,offsetX,offsetY,bounds,
   selected:airframe,mode,measured:[best.l,best.r,best.t,best.b],
   preferredYaw:preferredIndex*Math.PI/4,
   restMeasured:[best.l,best.r,best.t,best.b],
   unionMeasured:[box.l,box.r,box.t,box.b],
   screenFocus:desiredX/w,pointCount:verts.length,lockedRestPose:true,
   calibratedCap,geometryFitDistance:hi,anchorBased:true};
  return heroCameraState;
 }
 function update(dt){
  // The showroom is a presentation feature, not a reason to block every menu.
  // A partial model is still usable if a nonessential polish effect fails.
   try{attachModel();attachBladeShowroom();attachCopperShowroom();attachSpiritShowroom();selectShowroomAirframe();}catch(err){
   console.error('REDLINE hangar model polish failed',err);
   if(model){ready=true;window.REDLINE_SHOWROOM_READY=true;
     window.REDLINE_HANGAR_QA=window.REDLINE_HANGAR_QA||{};
     window.REDLINE_HANGAR_QA.partialModelError=String(err).slice(0,220);
   } else throw err;
  }
  const now=window.redlineUI?window.redlineUI.current:(window.REDLINE_UI_STATUS?.().screen||'landing');
  // Use the real UI state; returning home replays the flight-in.
  if(now!==lastScreen){
   if(now==='solo'){
    // Only continue the physical pose when the previous page showed the hangar.
    garageRevealPose=(lastScreen==='landing'&&model)?{p:model.position.clone(),r:model.rotation.clone()}:null;
   }else{
    // Restore object transforms before reusing any model after an interrupted exit.
    if(showroomExit)for(const part of showroomExit.parts)part.o.scale.copy(part.scale);
    if(showroomSwitch){
     showroomSwitch.from.scale.copy(showroomSwitch.fromScale);
     if(showroomSwitch.incoming)showroomSwitch.incoming.scale.copy(showroomSwitch.inScale);
     showroomSwitch.from.visible=false;
     if(showroomSwitch.incoming)showroomSwitch.incoming.visible=false;
     const desired=window.redlineUI?.config.model;
     const direct=rl46ModelChoices()[desired];
     if(direct){model=direct;model.visible=true;visibleAirframe=desired;}
    }
    showroomSwitch=null;showroomExit=null;
    // A page change must end with one selected aircraft, even after scroll spam.
    if(showroomSelectionInitialized)showroomOnly(model);
   }
   screen=now;lastScreen=now;elapsed=(now==='landing'||now==='solo')?0:8;
   selectedAirframeArriving=false;if(now==='landing')displayYaw=0;
  }
  elapsed+=Math.min(.06,Math.max(0,dt));
  if(window.redlineUI?.config.reducedMotion)elapsed=8;
  // v57: Kestrel may be parsed before a SAVED alternate aircraft. Keep
  // every showroom mesh invisible until the selected craft itself exists.
  // v54 only hid Kestrel inside selectShowroomAirframe(); the generic
  // if(model) branch below immediately undid that hide on the same frame.
  if(!showroomSelectionInitialized)showroomOnly(null);
  if(model&&showroomSelectionInitialized){
   const currentlyVisible=showroomSwitch?(showroomSwitch.entered?showroomSwitch.incoming:showroomSwitch.from):model;
   if(!showroomExit)showroomOnly(currentlyVisible);
   const skin=window.redlineUI?.config.skin??0;
   const bladeActive=visibleAirframe==='blade',copperActive=visibleAirframe==='copper',spiritActive=visibleAirframe==='spirit';
   const trail=window.REDLINE_PRODUCT?.trailHex?.()??0x91e9ff;for(const f of showroomExhaust){f.core.material.color.setHex(trail);}
   const accent=[0xe59c5e,0x8fc7e8,0xd6bb6d,0xb5a2ef][skin]||0xe59c5e;
   if(!bladeActive&&!copperActive&&!spiritActive)for(const mat of materialOverrides)mat.color.lerp(new THREE.Color(accent),Math.min(1,dt*3.8));
   if(screen==='solo'&&showroomExit)updateShowroomExit(Math.min(.06,Math.max(0,dt)));
   else if(showroomSwitch)updateShowroomSwitch(Math.min(.06,Math.max(0,dt)));
   else if(screen==='landing'&&elapsed<2.65)showroomFlightIn(elapsed);
   else if(screen==='solo'&&elapsed<1.45)showroomGarageReveal(elapsed);
   else{
    const landedFor=Math.max(0,elapsed-(screen==='landing'?2.65:1.45));
     const breathe=.10*Math.sin(landedFor*1.3)*rl46Ease(landedFor/.85);
     model.position.set(5,showroomHomeY(model)+breathe,4);
     // A stale interrupted arrival must never leave the selected aircraft at
     // 62–69% of its real size. Selection changes animate scale; idle does not.
     const properScale=HERO_BASE_SCALE[visibleAirframe];
     if(properScale&&Math.abs(model.scale.x-properScale)>1e-4)
      model.scale.setScalar(properScale);
    // A gently turning MODEL gives a showroom orbit without rotating the walls,
    // ceiling, ground or fixed red luminaires in the frame.
    if(!window.redlineUI?.config.reducedMotion){
     const spinEase=Math.max(0,Math.min(1,(elapsed-(screen==='landing'?2.65:1.45))/1.8));
     // Keep the resting 3/4 showcase pose fixed. Dragging still rotates the craft,
     // but passive auto-spin previously caused a narrow, off-center silhouette.
    }
    model.rotation.set(0,displayYaw,0);
   }
    // V76: animation is sole owner of position. Do not mutate the craft here.
    // This passive diagnostic makes future clearance issues observable.
    if((window.REDLINE_HANGAR_QA.sampleCounter=(window.REDLINE_HANGAR_QA.sampleCounter||0)+1)%30===0){
     const bounds=new THREE.Box3().setFromObject(model);
     const roofSafe=Math.min(ceilingProfile(bounds.min.x),ceilingProfile(bounds.max.x))-2.2;
     window.REDLINE_HANGAR_QA.lastClearance=roofSafe-bounds.max.y;
     window.REDLINE_HANGAR_QA.floorClearance=bounds.min.y-.55;
     window.REDLINE_HANGAR_QA.heightCorrectionApplied=0;
    }
   const entryU=screen==='solo'?rl46Clamp(elapsed/1.45):rl46Clamp(elapsed/2.65);
   const entryBurn=(screen==='solo'||screen==='landing')&&entryU<1?(1.12-.48*rl46Ease(entryU)):0;
   if(bladeActive){
     // Spool the visible exhaust down into idle as the craft finishes its approach.
     REDLINE_BLADE_EXHAUST.animate(bladeShowroomJets,elapsed,entryBurn||(.58+.14*Math.sin(elapsed*2.3)));
   }else if(!copperActive&&!spiritActive){
    for(const side of['PF','PR','SF','SR']){const pod=model.getObjectByName('TiltRotor_'+side);if(pod){pod.rotation.x=.12*Math.sin(elapsed*.77+side.length);pod.rotation.z=.085*Math.sin(elapsed*.61+(side[0]==='P'?0:2))}}
   }
   if(mixer&&kestrelShowroom?.visible)mixer.update(dt);
   if(kestrelShowroom?.visible&&kestrelShowroomJets.length)
    REDLINE_BLADE_EXHAUST.animate(kestrelShowroomJets,elapsed,entryBurn||(.61+.10*Math.sin(elapsed*2.3)));
   if(bladeShowroom?.visible&&bladeShowroomJets&&!bladeActive)
    REDLINE_BLADE_EXHAUST.animate(bladeShowroomJets,elapsed,1.02);
   if(spiritShowroom?.visible&&spiritShowroomFx){
    const incoming=showroomSwitch?.entered&&showroomSwitch.toId==='spirit';
    const thrust=incoming?1.24-.46*rl46Clamp((showroomSwitch.t-.28)/.98):entryBurn||(.55+.12*Math.sin(elapsed*1.8));
    REDLINE_SPIRIT_FX.animate(spiritShowroomFx,elapsed,thrust);
   }
   if(copperShowroom?.visible&&copperShowroomFx){
    const incoming=showroomSwitch?.entered&&showroomSwitch.toId==='copper';
    const thrust=incoming?1.25-.45*rl46Clamp((showroomSwitch.t-.28)/.98):entryBurn||(.58+.10*Math.sin(elapsed*2.1));
    REDLINE_COPPER_FX.animate(copperShowroomFx,elapsed,thrust);
   }
   for(let j=0;!bladeActive&&!copperActive&&!spiritActive&&j<showroomExhaust.length;j++){
    const jet=showroomExhaust[j],pulse=1+.07*Math.sin(elapsed*17+j*1.5);
    jet.core.scale.set(.78*pulse,1.06*pulse,.78*pulse);
    jet.halo.scale.set(pulse, .86+.07*Math.cos(elapsed*11+j),pulse);
    jet.core.material.opacity=.27+.12*Math.sin(elapsed*10+j*.8)**2;
    jet.halo.material.opacity=.10+.06*Math.sin(elapsed*5+j)**2;
   }
  }
  const landMix=Math.max(0,Math.min(1,(elapsed-(screen==='landing'?1.9:.65))/1.4));
  landingGlow.material.opacity=(.012+landMix*.026)*(.94+.06*Math.sin(elapsed*1.1));
  shadow.material.opacity=.23*landMix;penumbra.material.opacity=.07*landMix;
  haloArcA.rotation.z+=dt*.18;haloArcB.rotation.z-=dt*.12;
  haloArcA.material.opacity=landMix*.009;haloArcB.material.opacity=landMix*.006;
  // Bring up the key during the landing reveal without flattening the side fill.
  key.intensity=(4.6+landMix*.7)*(Number(THREE.REVISION)>=155?135:1);rim.intensity=(3.15+landMix*.35)*(Number(THREE.REVISION)>=155?135:1);
  showroomDust.children.forEach((ring,j)=>{
   const progress=(elapsed*.23+j/8)%1;
   ring.scale.setScalar(1+progress*2.65);
   ring.material.opacity=.028*(1-progress)*landMix;
  });
  // A truly LOCKED architectural view. The hangar must never orbit or sway;
  // only the Kestrel root animates after fly-in, while the platform stays fixed.
  const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);
  if(model&&(screen==='solo'||screen==='landing')){
   const frame=fitShowroomHero(model,visibleAirframe,screen,w,h);
   const poseKey=screen+':'+visibleAirframe;
   if(heroPoseAnchor!==poseKey&&!showroomDrag){
    displayYaw=frame.preferredYaw;
    heroPoseAnchor=poseKey;
    // Landing and selection fly-ins incorporate this yaw progressively.
    // At rest, synchronize the visible model immediately, never the camera.
    if(elapsed>(screen==='landing'?2.65:1.45)&&!showroomSwitch)
     model.rotation.y=displayYaw;
   }
   showroomCameraDistance=frame.distance;
   showroomFocusFraction=frame.screenFocus;
   camera.fov=44;
   camera.position.set(5+Math.cos(-1.2)*frame.distance,19.2,4+Math.sin(-1.2)*frame.distance);
   camera.lookAt(new THREE.Vector3(5,REDLINE_HOVER_Y+1,4));
   camera.setViewOffset(w,h,frame.offsetX,frame.offsetY,w,h);
   window.REDLINE_HANGAR_QA.cameraFraming={distance:frame.distance,
    screenFocus:frame.screenFocus,airframe:visibleAirframe,mode:screen,
    safeBounds:frame.bounds,offsetX:frame.offsetX,offsetY:frame.offsetY,
    measured:frame.measured,pointCount:frame.pointCount,stable:true,
    anchorBased:frame.anchorBased,calibratedCap:frame.calibratedCap,
    geometryFitDistance:frame.geometryFitDistance,preferredYaw:frame.preferredYaw};
  }else{
   camera.clearViewOffset();camera.aspect=w/h;camera.fov=44;camera.updateProjectionMatrix();
  }
  // Diagnose the true on-screen footprint of the aircraft and roof clearance.
  framingSample+=dt;
  if(model&&framingSample>.55){
   framingSample=0;
   // Screenshot framing excludes non-visual geometry, invisible components,
   // and transparent exhaust helpers that inflate a full Box3.
   model.updateMatrixWorld(true);
   const box=new THREE.Box3(),tmp=new THREE.Box3(),p=new THREE.Vector3();
   let heroParts=0;
   model.traverse(obj=>{
    if(!obj.isMesh||!obj.visible||!obj.geometry)return;
    const mat=Array.isArray(obj.material)?obj.material[0]:obj.material;
    if(!mat||mat.visible===false||(mat.transparent&&mat.opacity<.14))return;
    if(/exhaust|plume|trail|beam|particle|sparks|halo|thruster.?flare/i.test(obj.name))return;
    if(!obj.geometry.boundingBox)obj.geometry.computeBoundingBox();
    if(!obj.geometry.boundingBox)return;
    tmp.copy(obj.geometry.boundingBox).applyMatrix4(obj.matrixWorld);
    if(!tmp.isEmpty()){box.union(tmp);heroParts++;}
   });
   if(!heroParts)box.setFromObject(model);
   let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
   for(const x of[box.min.x,box.max.x])for(const y of[box.min.y,box.max.y])for(const z of[box.min.z,box.max.z]){
    p.set(x,y,z).project(camera);
    minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);
   }
   window.REDLINE_HANGAR_QA.projectedFootprint={
    left:Math.round((minX+1)*w*.5),right:Math.round((maxX+1)*w*.5),
    top:Math.round((1-maxY)*h*.5),bottom:Math.round((1-minY)*h*.5),
    viewport:[w,h],screen,heroParts
   };
  }
  if(!window.redlineUI?.config.reducedMotion)fireRing.rotation.z+=dt*.06;
 }
  return{scene,camera,update,beginExit,get ready(){return ready},get selectedReady(){return showroomSelectionInitialized&&!!model?.visible},get model(){return model},get airframe(){return visibleAirframe}};
})();
window.REDLINE_SHOWROOM=REDLINE_SHOWROOM;
window.addEventListener('redline-drone-loaded',()=>REDLINE_SHOWROOM.update(.016));
window.addEventListener('redline-blade-loaded',()=>REDLINE_SHOWROOM.update(.016));
window.addEventListener('redline-copper-loaded',()=>REDLINE_SHOWROOM.update(.016));
window.addEventListener('redline-spirit-loaded',()=>REDLINE_SHOWROOM.update(.016));


window.REDLINE_UI_STATUS=()=>({screen:redlineUI.current,ready:redlineUI.ready,mode,view:redlineUI.config.view?'cockpit':'chase',bots:redlineUI.config.bots,aim:{x:redlineUI.aim.x,y:redlineUI.aim.y},assist:redlineUI.config.beginnerAssist,rank:CLASH.lastPlace});


function redlineStartGate(){
 const t=.006,index=Math.round(t*N)%N,center=new THREE.Vector3(PX[index],0,PZ[index]);
 const group=new THREE.Group();group.position.copy(center);group.rotation.y=Math.atan2(-TX[index],-TZ[index]);S.add(group);
 const width=Math.max(33,Math.min(58,FW[index]*.72));
 const steel=new THREE.MeshStandardMaterial({color:0x28343c,roughness:.46,metalness:.78});
 const stripe=document.createElement('canvas');stripe.width=512;stripe.height=64;const g=stripe.getContext('2d');
 for(let i=0;i<16;i++)for(let j=0;j<2;j++){g.fillStyle=(i+j)%2?'#181c24':'#f2f4ef';g.fillRect(i*32,j*32,32,32)}
 const tx=new THREE.CanvasTexture(stripe);tx.wrapS=THREE.RepeatWrapping;tx.wrapT=THREE.RepeatWrapping;
 const check=new THREE.MeshStandardMaterial({map:tx,roughness:.67,side:THREE.DoubleSide});
 const crossHeight=Math.max(110,gh(center.x,center.z)+48);
 for(const side of [-1,1]){
  const point=group.localToWorld(new THREE.Vector3(side*width*.5,0,0));
  const floor=gh(point.x,point.z)-8,span=Math.max(14,crossHeight-floor);
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.72,1.25,span,10),steel);post.position.set(side*width*.5,floor+span*.5,0);post.castShadow=true;group.add(post);
  const signal=new THREE.Mesh(new THREE.SphereGeometry(1.7,10,8),new THREE.MeshBasicMaterial({color:side<0?0x56f4df:0xff6b58}));signal.position.set(side*width*.5,crossHeight+1.5,0);group.add(signal);
 }
 const over=new THREE.Mesh(new THREE.BoxGeometry(width+4,3.2,2.5),check);over.position.set(0,crossHeight,0);over.castShadow=true;group.add(over);
 const title=document.createElement('canvas');title.width=512;title.height=64;const c=title.getContext('2d');c.fillStyle='#111a22';c.fillRect(0,0,512,64);c.fillStyle='#ff5e53';c.font='bold 41px Arial';c.textAlign='center';c.fillText('REDLINE // START',256,44);
 const label=new THREE.Mesh(new THREE.PlaneGeometry(30,3.75),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(title),transparent:true,side:THREE.DoubleSide}));label.position.set(0,crossHeight-3.8,-1.5);group.add(label);
 window.REDLINE_START_GATE={width,height:crossHeight,position:center.toArray()};
}

// v59: All top-level systems are declared before the controller and engine start.
// This is deliberately AFTER REDLINE_SHOWROOM initialization, not inside the
// controller's IIFE (which previously re-entered code while it was in its TDZ).
let redlineUiBootSucceeded=false;
try{
 window.REDLINE_BOOT_PHASE='ui-initializing';
 redlineUI.init();
 window.REDLINE_BOOT_PHASE='ui-initialized';
 redlineUiBootSucceeded=true;
}catch(err){window.REDLINE_BOOT_PHASE='ui-init-failed';console.error('[REDLINE UI INIT]',err?.stack||err);window.reportRedlineFatal?.(err);}
if(redlineUiBootSucceeded)setTimeout(()=>{try{window.REDLINE_BOOT_PHASE='world-building';build();initClash();redlineStartGate();mode='ready';reset();redlineUI.readyUp();window.REDLINE_BOOT_PHASE='game-ready';}catch(err){console.error('REDLINE canyon initialization failed',err);reportRedlineError(err);return;}requestAnimationFrame(n=>{last=n;loop(n)})},60);

