/* REDLINE v51 | SPIRIT NOCTURNE: aerodynamic recessed twin exhausts and attitude lights.
   Fixed GPU geometry. Visual-only; thrust calculation and collision shapes unchanged. */
const REDLINE_SPIRIT_FX=(()=>{
 const T=THREE,cl=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
 // Each recessed B-2 channel is at x = +/-5.35, +Z forward, x-width 52.4.
 const shellGeom=new T.CylinderGeometry(.75,.085,1,28,24,true);
 const coreGeom=new T.CylinderGeometry(.34,.023,1,24,24,true);
 shellGeom.translate(0,-.5,0);coreGeom.translate(0,-.5,0);
 const shader=core=>new T.ShaderMaterial({
  uniforms:{uTime:{value:0},uPower:{value:.3},uBoost:{value:0},uCore:{value:core?1:0}},
  transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,side:T.DoubleSide,
  vertexShader:`uniform float uTime,uPower;varying float vT,vEdge,vDistort;
    void main(){vec3 p=position;float f=clamp(-p.y,0.,1.);vT=f;
     float turbulence=sin(f*33.-uTime*39.+p.x*14.)*.064+sin(f*75.-uTime*58.+p.z*12.)*.028;
     p.xz*=1.+f*(.40+turbulence);p.x+=.055*f*f*sin(uTime*13.+f*24.);
     vDistort=turbulence;vec4 eye=modelViewMatrix*vec4(p,1.);
     vEdge=abs(dot(normalize(normalMatrix*normal),normalize(-eye.xyz)));
     gl_Position=projectionMatrix*eye;}`,
  fragmentShader:`uniform float uTime,uPower,uBoost,uCore;varying float vT,vEdge,vDistort;
    void main(){float p=clamp(uPower,0.,1.8),f=vT;
     vec3 hot=vec3(.96,1.,1.),mid=vec3(.25,.76,1.),tail=vec3(.12,.26,.75),burn=vec3(.32,.52,1.);
     vec3 color=mix(hot,mid,smoothstep(.02,.4,f));color=mix(color,tail,smoothstep(.44,1.,f));
     color=mix(color,burn,smoothstep(.25,.82,f)*uBoost*.70);
     float diamond=.68+.32*pow(.5+.5*cos(f*42.-uTime*27.),3.);
     float tapered=(1.-smoothstep(.46,1.,f))*smoothstep(0.,.018,f);
     float alpha=tapered*diamond*(.35+.72*p)*(.38+.62*pow(1.-vEdge,.65))*(uCore>.5?1.43:.72);
     alpha*=.98+.26*vDistort;gl_FragColor=vec4(color,clamp(alpha,0.,.94));}`});
 const texCanvas=document.createElement('canvas');texCanvas.width=texCanvas.height=64;
 const g=texCanvas.getContext('2d'),grad=g.createRadialGradient(32,32,0,32,32,32);
 grad.addColorStop(0,'rgba(255,255,255,1)');grad.addColorStop(.3,'rgba(169,210,255,.72)');
 grad.addColorStop(.65,'rgba(87,118,232,.22)');grad.addColorStop(1,'rgba(70,90,180,0)');
 g.fillStyle=grad;g.fillRect(0,0,64,64);const tex=new T.CanvasTexture(texCanvas);
 const ringGeo=new T.TorusGeometry(.70,.050,8,36),nodeGeo=new T.SphereGeometry(.07,7,6);
 const outletGeo=new T.CircleGeometry(.64,32);
 function make(parent,showroom=false){
  const root=new T.Group();root.name='SpiritNocturne_DualFlushExhaust';parent.add(root);
  const engines=[];
  for(const side of [-1,1]){
   const anchor=new T.Group();anchor.name='Spirit_Native_Exhaust_'+(side<0?'Port':'Starboard');
   // Native coordinates. Rear nozzle center sits inside the engine's actual exhaust recess (y .34-.78, z -6.2 to -4.4); -Z is aft.
   anchor.position.set(side*5.35,.54,-6.65);anchor.rotation.x=Math.PI/2;root.add(anchor);
   const core=new T.Mesh(coreGeom,shader(true)),shell=new T.Mesh(shellGeom,shader(false));
   core.frustumCulled=false;shell.frustumCulled=false;core.renderOrder=11;shell.renderOrder=10;
   anchor.add(shell,core);
   // Always-visible blue-white hot outlet; physically attached, not a floating sprite.
   const outlet=new T.Mesh(outletGeo,new T.MeshBasicMaterial({color:0x9deaff,transparent:true,opacity:.79,
     side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending,depthTest:true}));
   outlet.rotation.x=Math.PI/2;outlet.position.y=-.025;anchor.add(outlet);
   const halo=new T.Sprite(new T.SpriteMaterial({map:tex,color:0x79caff,transparent:true,
     opacity:.70,depthTest:true,depthWrite:false,blending:T.AdditiveBlending}));
   halo.position.y=-.20;halo.scale.set(2.6,2.6,1);anchor.add(halo);
   const diamonds=[];for(let k=0;k<2;k++){
    const ring=new T.Mesh(ringGeo,new T.MeshBasicMaterial({color:k?0x609be9:0xe1ecff,transparent:true,
     depthWrite:false,blending:T.AdditiveBlending,opacity:.05}));
    ring.rotation.x=Math.PI/2;anchor.add(ring);diamonds.push(ring);
   }
   const count=showroom?16:22,buff=new Float32Array(count*3),pg=new T.BufferGeometry();
   pg.setAttribute('position',new T.BufferAttribute(buff,3).setUsage(T.DynamicDrawUsage));
   const particles=new T.Points(pg,new T.PointsMaterial({map:tex,size:showroom?.56:.50,
    transparent:true,depthWrite:false,blending:T.AdditiveBlending,color:0x9fc9ff,opacity:.76}));
   particles.frustumCulled=false;anchor.add(particles);
   engines.push({anchor,core,shell,outlet,halo,diamonds,particles,buff,count,side,power:.38});
  }
  const stabilizers=[];
  for(const side of[-1,1])for(const fore of[-1,1]){
   const lens=new T.Sprite(new T.SpriteMaterial({map:tex,color:fore>0?0xb2ceff:0xaecbff,
      transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0}));
   lens.position.set(side*19.0,.01,fore>0?2.0:-3.8);lens.scale.set(.7,.7,1);root.add(lens);
   stabilizers.push({lens,side,fore});
  }
  const light=new T.PointLight(0x73bdff,0,24,2);light.position.set(0,.15,-7.4);root.add(light);
  return {root,engines,stabilizers,light,showroom};
 }
 function animate(rig,time,input=.56){if(!rig)return;
  const live=typeof input!=='number',cmd=live?(input.command||{}):{};
  const drive=live?cl(Math.abs(cmd.drive||0),0,1):cl(input,0,1.2);
  const lift=live?cl(Math.abs(cmd.lift||0),0,1):0;
  const steer=live?cl((cmd.steer||0),-1,1):Math.sin(time*.9)*.16;
  const strafe=live?cl((cmd.strafe||0),-1,1):0,boost=!!(live&&input.boost);
  const vertical=live?cl(Math.abs(input.vy||0)/70,0,1):0;
  for(const e of rig.engines){
   const target=cl(.57+drive*.54+lift*.30+vertical*.29+(boost?.75:0)+(!live?.14:0),.40,1.85);
   e.power+=(target-e.power)*.16;const p=e.power;
   const len=10.8*(.49+.62*p)*(1+.035*Math.sin(time*31+e.side));
   e.core.scale.set(.86,len*.90,.86);e.shell.scale.set(1.12,len*1.25,1.12);
   e.outlet.material.opacity=cl(.55+p*.21,0,.95);
   e.halo.material.opacity=cl(.35+p*.24,0,.90);
   e.halo.scale.setScalar(2.3+.48*p);
   // Nozzle direction responds to bank and strafing, but stays recessed in the authored trough.
   e.anchor.rotation.x=Math.PI/2+cl(steer*.042,-.07,.07);
   e.anchor.rotation.z=cl(strafe*.041,-.07,.07);
   for(const m of[e.core.material,e.shell.material]){
    m.uniforms.uTime.value=time;m.uniforms.uPower.value=p;m.uniforms.uBoost.value=boost?1:0;
   }
   e.diamonds.forEach((ring,k)=>{ring.position.y=-len*(.20+k*.29);ring.scale.setScalar(.78+.14*Math.sin(time*25+k));ring.material.opacity=.16+p*.10;});
   for(let j=0;j<e.count;j++){
    const age=(time*(.7+p*.32)+j/e.count+e.side*.12+10)%1;
    const angle=j*2.399963+e.side*.3,radial=.08+age*age*.65;
    e.buff[j*3]=Math.cos(angle)*radial;
    e.buff[j*3+1]=-.08-age*len*.87;
    e.buff[j*3+2]=Math.sin(angle)*radial;
   }
   e.particles.geometry.attributes.position.needsUpdate=true;
   e.particles.material.opacity=.35+cl(p*.35,0,.60);
  }
  for(const s of rig.stabilizers){const amount=live?cl(Math.abs(steer)*.55+Math.abs(strafe)*.35+lift*.26+(boost?.16:0),0,1):.18;
   s.lens.material.opacity=.055+amount*.41*(.86+.14*Math.sin(time*19+s.side*3+s.fore));
   const radius=.38+amount*.7;s.lens.scale.set(radius,radius,1);
  }
  rig.light.intensity=(rig.showroom?.58:.38)+(boost?.85:0);
 }
 return {make,animate,engineCount:2,stabilizerCount:4};
})();window.REDLINE_SPIRIT_FX=REDLINE_SPIRIT_FX;
