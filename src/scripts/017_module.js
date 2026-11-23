

/* REDLINE Stage 3: additional grounded near-field geology, shoreline and vehicle microdetail.
   Deterministic, no remote asset requests, designed for Three.js r128. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.REDLINE_VISUALS=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const hash=(a,b)=>{const x=Math.sin(a*127.113+b*311.71)*43758.5453;return x-Math.floor(x)};
function createNearField(THREE,scene,route,ground,collider,rockMaterial){
 const {px,pz,tx,tz,fw,N}=route;
 const vertices=[],uv=[],colors=[],indices=[];let pieces=0;
 // Eroded, stacked outcrops are authored from paired multi-angle rings, not thin paper cliffs.
 const palette=[0x75452f,0x9f603e,0xb5764f,0x995a3d,0x6c3b2f,0xbd8960];
 for(let k=0;k<52;k++){
  // Keep the first sector and gates unobstructed: details stand on the high bank.
  const i=Math.round((.035+k/52*.29)*N),side=k%2?1:-1;
  const width=fw[i]||60,bank=width*(.86+.18*hash(k,1));
  const x=px[i]-tz[i]*side*bank,z=pz[i]+tx[i]*side*bank;
  const base=ground(x,z);if(!Number.isFinite(base)||base<4)continue;
  const height=8+hash(k,2)*21,rad=3.0+hash(k,3)*5.5;
  const steps=13,rays=13,offset=vertices.length/3,rot=hash(k,8)*6.283;
  for(let y=0;y<=steps;y++){
   const t=y/steps;const edge=1-.38*t+.09*Math.sin(t*14+k);
   const erosion=1+.14*Math.sin(t*47+k*.9)+.11*Math.cos(t*29-k);
   const s=rad*edge*erosion;
   for(let j=0;j<rays;j++){
    const a=(j/rays)*Math.PI*2+rot;
    const facet=1+.10*Math.sin(a*5.1+k)+.085*Math.sin(a*9-k*.7);
    const xx=Math.cos(a)*s*facet,zz=Math.sin(a)*s*facet;
    const worldX=x+xx+Math.sin(t*4+k)*.58,worldZ=z+zz+Math.cos(t*3+k)*.45;
    // Anchor the entire irregular footprint into the *real* terrain heightfield.
    const foot=ground(worldX,worldZ);
    const yy=base-2+height*t+(Number.isFinite(foot)?foot-base:0)*Math.pow(1-t,3)+Math.sin(a*4+k)*.24;
    vertices.push(worldX,yy,worldZ);
    uv.push(j/(rays-1),t*3.4);
    const c=new THREE.Color(palette[Math.min(palette.length-1,Math.floor(t*palette.length))]);
    c.multiplyScalar(.75+.20*hash(j,k)+.13*Math.sin(t*72+2*k));
    colors.push(c.r,c.g,c.b);
   }
  }
  for(let y=0;y<steps;y++)for(let j=0;j<rays;j++){
   const a=offset+y*rays+j,b=offset+y*rays+(j+1)%rays,c=offset+(y+1)*rays+j,d=offset+(y+1)*rays+(j+1)%rays;
   indices.push(a,c,b,b,c,d);
  }
  // Solid weathered top cap — no visible hollow towers from above.
  const top=vertices.length/3;
  vertices.push(x,base-2+height-.45,z);uv.push(.5,.5);
  const cTop=new THREE.Color(palette[palette.length-1]);colors.push(cTop.r,cTop.g,cTop.b);
  for(let j=0;j<rays;j++)indices.push(top,offset+steps*rays+(j+1)%rays,offset+steps*rays+j);
  pieces++;
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
 const mat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.96,metalness:0,side:THREE.DoubleSide});
 const rock=new THREE.Mesh(geo,rockMaterial||mat);rock.name='Stage3_Eroded_Bank_Outcrops';rock.castShadow=true;rock.receiveShadow=true;
 scene.add(rock);rock.updateMatrixWorld(true);
 // These rocks sit well outside the usable air corridor, but should still be physical.
 if(collider?.addGeometry)collider.addGeometry(geo,rock.matrixWorld);
 return {mesh:rock,pieces,triangles:indices.length/3};
}
function createShoreline(THREE,scene,route,waterHeight){
 const {px,pz,tx,tz,fw,N}=route,verts=[],uvs=[],indices=[];let n=0;
 for(const side of [-1,1]){
  const start=n;
  for(let k=0;k<=N;k+=2){
   const i=Math.min(k,N-1),half=fw[i]*.56;
   for(let j=0;j<2;j++){
    const distance=half-(j===0?0:2.3+hash(i,5)*2.4);
    const x=px[i]-tz[i]*distance*side,z=pz[i]+tx[i]*distance*side;
    verts.push(x,waterHeight+.12,z);uvs.push(j,(k/2)*.32);n++;
   }
   if(k>0){const a=n-4;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:{value:0}},
  vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec2 v;uniform float time;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){float wave=sin(v.y*5.0-time*2.3+sin(v.y*.9)*2.0);float fine=sin(v.y*15.0+time*.65);float flecks=h(floor(v*vec2(16.,9.)));float w=smoothstep(-.55,.85,wave*.66+fine*.25+(flecks-.5)*.3);float coast=1.-smoothstep(.15,1.,v.x);float alpha=(.11+.35*w)*coast;gl_FragColor=vec4(mix(vec3(.22,.48,.48),vec3(.82,.88,.84),w),alpha);}' });
 const mesh=new THREE.Mesh(geo,material);mesh.frustumCulled=false;mesh.renderOrder=2;mesh.name='Stage3_River_Shoreline_Foam';scene.add(mesh);
 return {mesh,update(t,levelAt){
  material.uniforms.time.value=t;
  if(typeof levelAt==='function'){
   const a=geo.attributes.position;let k=0;
   for(const side of[-1,1])for(let i=0;i<=N;i+=2){
    const waterY=levelAt(Math.min(i,N-1),side)+.065;
    a.setY(k++,waterY);a.setY(k++,waterY);
   }
   a.needsUpdate=true;
  }
 },vertices:verts.length/3};
}
function detailDrone(THREE,drone){
 if(drone.userData.redlineStage3Detailed)return 0;drone.userData.redlineStage3Detailed=true;
 const alloy=new THREE.MeshStandardMaterial({color:0x39434e,metalness:.87,roughness:.26});
 const trim=new THREE.MeshStandardMaterial({color:0xc4d4dd,metalness:.72,roughness:.22});
 const led=new THREE.MeshBasicMaterial({color:0xe72f42,toneMapped:false});
 let parts=0;function place(g,m,p,rotation){const x=new THREE.Mesh(g,m);x.position.set(...p);if(rotation)x.rotation.set(...rotation);x.castShadow=true;drone.add(x);parts++;return x;}
 // Four bevel-like armature seams and turbine rim accents; remain attached to GLB.
 for(const side of [-1,1]){
  place(new THREE.BoxGeometry(.12,.07,3.4),trim,[side*1.35,.22,.2],[0,side*.23,0]);
  place(new THREE.BoxGeometry(.20,.09,.63),led,[side*1.05,.38,-1.12]);
  for(let s=0;s<3;s++)place(new THREE.SphereGeometry(.095,8,6),alloy,[side*(.65+s*.34),.54,-.92]);
 }
 // Protective grille: do not add another glass shell over the original single-piece GLB canopy.
 place(new THREE.BoxGeometry(1.95,.075,.10),trim,[0,.06,-1.85]);
 // GLB node "One piece polarized canopy" supplies the only glazing surface.
 const antenna=place(new THREE.CylinderGeometry(.045,.07,.92,8),alloy,[0,1.22,1.26]);antenna.rotation.z=.12;
 place(new THREE.SphereGeometry(.13,8,8),led,[.11,1.71,1.26]);
 return parts;
}
return {createNearField,createShoreline,detailDrone};
});


