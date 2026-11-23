/* REDLINE v45 · Copper Wraith: twin native rear ion engines, gyroscopic attitude jets,
   cinematic induction rings. Lightweight fixed-size GPU objects, no spawn allocations. */
const REDLINE_COPPER_FX=(()=>{
 const T=THREE;
 // Exhaust flows along local -Z; the source GLB faces +Z, and the game rotates it 180 degrees.
 const cone=new T.CylinderGeometry(.23,.018,1,22,20,true);cone.translate(0,-.5,0);
 const coreGeo=new T.CylinderGeometry(.105,.004,1,16,18,true);coreGeo.translate(0,-.5,0);
 const mat=(core)=>new T.ShaderMaterial({
  uniforms:{uTime:{value:0},uPower:{value:.55},uCore:{value:core?1:0},uBoost:{value:0}},
  transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,blending:T.AdditiveBlending,
  vertexShader:`uniform float uTime;uniform float uPower;varying float vT;varying float vSide;varying float vWave;
  void main(){vec3 p=position;float t=clamp(-p.y,0.0,1.0);vT=t;
   float noise=sin(t*27.0-uTime*29.0+position.x*17.0)*.075+sin(t*58.0-uTime*51.0+position.z*21.0)*.025;
   p.xz*=1.0+t*(.24+noise);p.x+=.075*t*t*sin(uTime*12.0+t*20.0);
   vec4 mv=modelViewMatrix*vec4(p,1.0);vec3 normalView=normalize(normalMatrix*normal);
   vSide=abs(dot(normalView,normalize(-mv.xyz)));vWave=noise;
   gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`uniform float uTime;uniform float uPower;uniform float uCore;uniform float uBoost;
  varying float vT;varying float vSide;varying float vWave;
  void main(){float t=vT;
    vec3 ice=vec3(.88,.99,1.0),ion=vec3(.20,.78,1.0),violet=vec3(.24,.36,.90),copper=vec3(1.0,.40,.11);
    vec3 col=mix(ice,ion,smoothstep(.07,.45,t));col=mix(col,violet,smoothstep(.48,1.0,t));
    col=mix(col,copper,(.08+.12*uBoost)*smoothstep(.42,.96,t));
    float diamonds=.76+.24*pow(.5+.5*cos(40.0*t-uTime*27.0),2.0);
    float tail=1.0-smoothstep(.50,1.0,t);
    float a=smoothstep(0.0,.038,t)*tail*diamonds*(.38+.62*clamp(uPower,0.0,1.8))*(.47+.53*pow(1.0-vSide,.65));
    a*=uCore>.5?1.35:.53;a*=.97+.27*vWave;
    gl_FragColor=vec4(col,clamp(a,0.0,.88));}`});
 const sparkCanvas=document.createElement('canvas');sparkCanvas.width=sparkCanvas.height=64;
 const ctx=sparkCanvas.getContext('2d'),rad=ctx.createRadialGradient(32,32,0,32,32,32);
 rad.addColorStop(0,'rgba(255,255,255,1)');rad.addColorStop(.2,'rgba(131,237,255,.87)');
 rad.addColorStop(.55,'rgba(40,112,255,.34)');rad.addColorStop(1,'rgba(36,85,250,0)');
 ctx.fillStyle=rad;ctx.fillRect(0,0,64,64);
 const texture=new T.CanvasTexture(sparkCanvas);
 const ringGeo=new T.TorusGeometry(.22,.035,6,28), thinRingGeo=new T.TorusGeometry(.18,.018,5,24);
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:0));
 function make(parent,showroom=false){
  const assembly=new T.Group();assembly.name='CopperWraith_ION_EffectRig';parent.add(assembly);
  const engines=[];
  for(const side of [-1,1]){
   const mount=new T.Group();mount.name='CopperWraith_Engine_'+(side<0?'L':'R');
   mount.position.set(side*.69,-.20,-1.595);mount.rotation.x=Math.PI/2;assembly.add(mount);
   const core=new T.Mesh(coreGeo,mat(true)),shell=new T.Mesh(cone,mat(false));
   core.renderOrder=10;shell.renderOrder=9;core.frustumCulled=false;shell.frustumCulled=false;
   mount.add(shell,core);
   const rim=new T.Mesh(ringGeo,new T.MeshBasicMaterial({color:0x88eaff,transparent:true,
       opacity:.70,depthWrite:false,blending:T.AdditiveBlending}));
   rim.rotation.x=Math.PI/2;rim.position.y=-.045;mount.add(rim);
   const shock=[];
   for(let n=0;n<3;n++){
    const diamond=new T.Mesh(thinRingGeo,new T.MeshBasicMaterial({color:n===0?0xe9ffff:0x73aaff,
     transparent:true,opacity:.12,depthWrite:false,blending:T.AdditiveBlending}));
    diamond.rotation.x=Math.PI/2;diamond.position.y=-(.58+n*.66);mount.add(diamond);shock.push(diamond);
   }
   const n=showroom?18:20,buff=new Float32Array(n*3);const geo=new T.BufferGeometry();
   geo.setAttribute('position',new T.BufferAttribute(buff,3).setUsage(T.DynamicDrawUsage));
   const particles=new T.Points(geo,new T.PointsMaterial({map:texture,size:showroom?.23:.24,
    color:0x9bdeff,opacity:.72,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));
   particles.frustumCulled=false;particles.renderOrder=11;mount.add(particles);
   engines.push({mount,core,shell,rim,shock,particles,buff,n,side,power:.5});
  }
  // Small lateral stabilizer flashes, active with steering/strafe/vertical input.
  const trim=[];
  for(const side of[-1,1])for(const high of[-1,1]){
   const pod=new T.Group();pod.name='CopperWraith_VectorMicrojet';
   pod.position.set(side*3.25,high*2.25,-.10);pod.rotation.z=side*Math.PI/2;
   const lens=new T.Sprite(new T.SpriteMaterial({map:texture,color:0x9ed5ff,
     transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0}));
   lens.scale.set(.45,.45,1);pod.add(lens);assembly.add(pod);trim.push({lens,side,high});
  }
  const induction=new T.Group();assembly.add(induction);
  const bands=[];
  for(let i=0;i<2;i++){
   const b=new T.Mesh(new T.TorusGeometry(1.56+i*.21,.018,5,96),new T.MeshBasicMaterial({
      color:i===0?0x84e9ff:0xd58a55,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));
   b.rotation.x=Math.PI/2;b.position.z=-.03+i*.06;induction.add(b);bands.push(b);
  }
  const illumination=new T.PointLight(0x69bfff,0,7,2);illumination.position.set(0,-.15,-1.66);assembly.add(illumination);
  return {assembly,engines,trim,bands,illumination,showroom};
 }
 function animate(rig,t,inputs=.62){if(!rig)return;
  const flying=typeof inputs!=='number',drive=flying?clamp(Math.abs(inputs.command?.drive||0),0,1):clamp(inputs,0,1.2);
  const lift=flying?clamp(Math.abs(inputs.command?.lift||0),0,1):.12;
  const steer=flying?clamp(inputs.command?.steer||0,-1,1):Math.sin(t*1.8)*.19;
  const boost=!!(flying&&inputs.boost);const vy=flying?clamp(Math.abs(inputs.vy||0)/64,0,1):0;
  const strafe=flying?clamp(Math.abs(inputs.strafe||0),0,1):0;
  rig.engines.forEach((e,i)=>{
   const desired=clamp(.31+drive*.70+lift*.25+vy*.35+(boost?.68:0)+(!flying?.25:0),.18,1.77);
   e.power+=(desired-e.power)*.17;const p=e.power;
   const length=3.3*(.32+.76*p)*(1+.045*Math.sin(t*32+i*1.7));
   e.core.scale.set(.82,length*.96,.82);e.shell.scale.set(1.13,length*1.20,1.13);
   e.mount.rotation.x=Math.PI/2+clamp(steer*.055,-.07,.07);
   e.mount.rotation.z=clamp((inputs?.command?.strafe||0)*.045,-.06,.06);
   for(const shader of[e.core.material,e.shell.material]){
    shader.uniforms.uTime.value=t+i*.13;shader.uniforms.uPower.value=p;shader.uniforms.uBoost.value=boost?1:0;
   }
   e.rim.material.opacity=.38+.37*Math.min(p/1.5,1);
   e.shock.forEach((ring,j)=>{ring.position.y=-(.65+j*.76)*length/2.9;
    ring.scale.setScalar(.75+.14*Math.sin(t*26+j*1.8+i));ring.material.opacity=.06+.16*p/1.8;});
   for(let j=0;j<e.n;j++){
    const age=(t*(.62+p*.28)+j/e.n+i*.37)%1,theta=j*2.399963+i*.3;
    const radial=.04+.32*age*age;
    e.buff[j*3]=Math.cos(theta)*radial;e.buff[j*3+1]=-.14-age*length*.97;
    e.buff[j*3+2]=Math.sin(theta)*radial;
   }
   e.particles.geometry.attributes.position.needsUpdate=true;
   e.particles.material.opacity=.24+Math.min(1.45,p)*.33;
  });
  for(const x of rig.trim){const intensity=flying?clamp(lift*.57+strafe*.30+Math.abs(steer)*.22+(boost?.18:0),0,1):.13;
   x.lens.material.opacity=.05+.56*intensity*(.80+.20*Math.sin(t*18+x.side*3+x.high));
   const sz=.32+intensity*.72;x.lens.scale.set(sz,sz,1);
  }
  rig.bands.forEach((ring,i)=>{ring.rotation.z=(i?-.42:.52)*t;
   ring.material.opacity=(boost?.12:.012)+(rig.showroom?.025:0);
   ring.scale.setScalar(1+.075*Math.sin(t*3+i));});
  rig.illumination.intensity=(rig.showroom?.3:.12)+(boost?.55:0);
 }
 return {make,animate,engineCount:2,trimCount:4};
})();
window.REDLINE_COPPER_FX=REDLINE_COPPER_FX;
