'use strict';
const {randomUUID}=require('node:crypto');
const F=require('./flight.cjs'),routes=require('./routes.json'),COLLISION=require('./collision.cjs');
const HZ=60,dt=1/HZ,MAX=6;const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),sub=(a,b)=>a.map((x,i)=>x-b[i]);
const pos=f=>[f.x,f.y,f.z];const models=new Set(['kestrel','blade','copper','spirit','delorean']);
function crossing(a,b,g){const u=dot(sub(a,g.center),g.normal),v=dot(sub(b,g.center),g.normal);if(u>=0||v<0||v===u)return null;const t=-u/(v-u),p=a.map((x,i)=>x+(b[i]-x)*t);return Math.hypot(...sub(p,g.center))<g.radius*.96?t:null;}
function input(v){if(!v||typeof v!=='object'||!Number.isSafeInteger(v.seq)||v.seq<1)return null;const a={seq:v.seq};for(const k of ['throttle','steer','strafe','lift','pitch']){if(v[k]!==undefined&&!Number.isFinite(v[k]))return null;a[k]=clamp(v[k]||0,k==='pitch'?-.31:-1,k==='pitch'?.31:1);}if(v.headingTarget!==undefined){if(!Number.isFinite(v.headingTarget))return null;a.headingTarget=Math.atan2(Math.sin(v.headingTarget),Math.cos(v.headingTarget));}for(const k of ['boost','brake','fire','shield','emp'])a[k]=v[k]===true;return a;}
class World{
 constructor(course,room='local'){if(!routes[course]&&course!=='frost')throw Error('unknown course');this.course=course;this.route=course==='frost'?require('./frost.cjs').load().route:routes[course];this.room=room;this.id=randomUUID();this.collider=COLLISION.load(course,process.env.REDLINE_COLLISION_STRICT==='1');this.tick=0;this.startTick=null;this.players=new Map();this.events=[];this.finish=[];}
 add(id,model,name,slot){if(this.players.has(id)){let p=this.players.get(id);p.connected=true;p.last=this.tick;p.input={seq:p.seq};return p;}if(this.startTick!==null||this.players.size>=MAX||!models.has(model)||!Number.isInteger(slot)||slot<0||slot>=MAX||[...this.players.values()].some(p=>p.slot===slot))throw Error('room unavailable');const g=this.route.gates.at(-1),f=F.createFlight(),side=[-g.normal[2],0,g.normal[0]],lane=(slot-2.5)*(this.course==='frost'?7:this.course==='iron'?2.5:12);[f.x,f.y,f.z]=g.center.map((x,i)=>x+side[i]*lane+g.normal[i]*(this.course==='frost'?8:-8));f.yaw=Math.atan2(-g.normal[0],-g.normal[2]);F.resetTransients(f);const p={id,model,name,slot,f,seq:0,input:{},last:this.tick,connected:true,gates:0,ammo:2,reload:0,shieldUntil:0,shieldReady:0,fireReady:0,empReady:0,stunUntil:0,finished:null};this.players.set(id,p);return p;}
 start(){if(this.startTick!==null||[...this.players.values()].filter(p=>p.connected).length<2)throw Error('need two connected pilots');this.startTick=this.tick+3*HZ;}
 accept(id,raw){const p=this.players.get(id),v=input(raw);if(!p||!p.connected||!v||v.seq<=p.seq)return false;p.seq=v.seq;p.input=v;p.last=this.tick;return true;}
 disconnect(id){const p=this.players.get(id);if(p){p.connected=false;p.input={};}}
 emit(type,fields){this.events.push({tick:this.tick,type,...fields});if(this.events.length>128)this.events.shift();}
 floor(x,z){if(this.course==='frost')return this.collider.height(x,z)+3.6;if(this.course==='grand')return this.collider?.height(x,z)+3.6||4.5;const {dock:d,land}=this.route;if(x>=d.minX&&x<=d.maxX&&z>=d.minZ&&z<=d.maxZ)return d.floor+3.6;return land.some(([a,b,c,e])=>x>=a&&x<=b&&z>=c&&z<=e)?8.6:3.35;}
 // Online race movement uses the same baked Grand Gorge cliff triangles +
 // renderer heightfield as v139, with bounded 4-metre continuous samples.
 // Static collider meshes for both courses must exist and pass SHA-256 at world creation.
 // Moving/destructible obstacle transitions require additional parity checks.
 move(p,cmd){
  const f=p.f,a=pos(f);
  F.stepFlight(f,cmd,{thrust:80,agility:75,stability:70,handlingMode:'sport',airframe:p.model,
    shipyard:this.course!=='grand',minAltitude:this.course==='frost'?-90:this.course==='iron'?-16.4:4.5,maxAltitude:this.course==='frost'?1560:430,ranked:false},dt);
  const bound=this.course==='frost'?4950:1380;f.x=clamp(f.x,-bound,bound);f.z=clamp(f.z,-bound,bound);
  f.y=clamp(f.y,this.course==='frost'?-90:this.course==='iron'?-16.4:0,this.course==='frost'?1560:310);
  const wanted=pos(f),distance=Math.hypot(...sub(wanted,a)),
    radius=this.course==='grand'?7.5:2.4,
    steps=Math.max(1,Math.ceil(distance/(this.course==='grand'?3.0:1.0)));
  if(steps>512)throw Error('server displacement exceeds collision sweep budget');
  let valid=a,collision=null;
  for(let i=1;i<=steps;i++){
   const q=a.map((x,j)=>x+(wanted[j]-x)*i/steps);
   if(this.collider){const contact=this.collider.contact(q,radius,a);
    if(contact){collision=contact;break;}
   }
   if(q[1]<this.floor(q[0],q[2])){collision={nx:0,ny:1,nz:0,ground:true};break;}
   valid=q;
  }
  if(collision){
   // Reject the obstructed displacement instead of letting the browser claim
   // an unverified point or tunnelling across a wall in one render frame.
   [f.x,f.y,f.z]=valid;
   if(collision.ground){f.y=Math.max(f.y,this.floor(f.x,f.z)+.01);if(f.vy<0)f.vy=0;}
   else{
    const attempted=sub(wanted,valid),length=Math.hypot(...attempted);
    if(length>1e-4){const n=attempted.map(x=>x/length);
     const toward=f.vx*n[0]+f.vy*n[1]+f.vz*n[2];
     if(toward>0){f.vx-=toward*n[0];f.vy-=toward*n[1];f.vz-=toward*n[2];}
    }
    const c=this.collider.contact(pos(f),radius,a);
    if(c){f.x+=c.nx*(c.depth+.05);f.y+=c.ny*(c.depth+.05);f.z+=c.nz*(c.depth+.05);}
   }
   f.speed=Math.hypot(f.vx,f.vz)*Math.sign(f.speed||1);
  }
  const b=pos(f),total=this.route.gates.length*(this.route.laps||3),
    g=this.route.gates[p.gates%this.route.gates.length],t=crossing(a,b,g);
  if(p.gates<total&&t!==null){p.gates++;
   this.emit('gate',{id:p.id,gates:p.gates});
   if(p.gates===total){p.finished=(this.tick-this.startTick-1+t)/HZ;
    this.finish.push({id:p.id,time:p.finished});
    this.finish.sort((a,b)=>a.time-b.time||a.id.localeCompare(b.id));
    this.emit('finish',{id:p.id,time:p.finished});}
  }
 }
 combat(p,cmd){if(cmd.shield&&this.tick>=p.shieldReady){p.shieldUntil=this.tick+2*HZ;p.shieldReady=this.tick+8*HZ;this.emit('shield',{id:p.id});}if(p.ammo<2&&this.tick>=p.reload){p.ammo++;p.reload=this.tick+90;}if(cmd.fire&&p.ammo&&this.tick>=p.fireReady){p.ammo--;p.reload=this.tick+90;p.fireReady=this.tick+20;const f=p.f,origin=pos(f),pitch=f.pitch,d=[-Math.sin(f.yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(f.yaw)*Math.cos(pitch)];let hit=null,dist=this.collider?.raycast(origin,d,300)?.distance??300;for(const q of this.players.values()){if(q===p||q.finished!==null)continue;const r=sub(pos(q.f),origin),along=dot(r,d),off=Math.hypot(...r.map((x,i)=>x-d[i]*along));if(along>0&&along<dist&&off<5){hit=q;dist=along;}}this.emit('laser',{id:p.id,origin,end:origin.map((x,i)=>x+d[i]*dist),hit:hit?.id||null});if(hit){const blocked=this.tick<hit.shieldUntil;if(!blocked){hit.stunUntil=this.tick+45;hit.f.speed*=.38;hit.f.vx*=.38;hit.f.vy*=.38;hit.f.vz*=.38;}this.emit('hit',{id:hit.id,attacker:p.id,blocked});}}if(cmd.emp&&this.tick>=p.empReady){p.empReady=this.tick+10*HZ;for(const q of this.players.values())if(q!==p&&q.finished===null&&Math.hypot(...sub(pos(q.f),pos(p.f)))<60&&this.tick>=q.shieldUntil){q.stunUntil=this.tick+HZ;q.f.energy=0;}this.emit('emp',{id:p.id,origin:pos(p.f)});}}
 step(){this.tick++;if(this.startTick===null||this.tick<=this.startTick)return;const active=[];for(const p of this.players.values()){if(p.finished!==null)continue;const cmd=p.connected&&this.tick-p.last<=30?p.input:{};const effective=this.tick<p.stunUntil?{brake:true}:cmd;this.move(p,effective);active.push([p,effective]);} // all pilots advance before any combat is resolved
 for(const [p,c] of active)if(p.finished===null&&c.shield&&this.tick>=p.shieldReady){p.shieldUntil=this.tick+2*HZ;p.shieldReady=this.tick+8*HZ;this.emit('shield',{id:p.id});}
 for(const [p,c] of active)if(p.finished===null)this.combat(p,c);
 // Shared aircraft separation. No client can decide a different outcome.
 const ps=active.map(x=>x[0]);for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const a=ps[i],b=ps[j],d=sub(pos(a.f),pos(b.f)),n=Math.hypot(...d);if(n<4){const beforeA=pos(a.f),beforeB=pos(b.f);const k=(4-n)/2,axis=n>.001?d.map(v=>v/n):[(a.slot<b.slot)?-1:1,0,0];for(const [idx,key] of ['x','y','z'].entries()){a.f[key]+=axis[idx]*k;b.f[key]-=axis[idx]*k;}for(const item of [a,b]){const r=this.course==='grand'?7.5:2.4;for(let j=0;j<3;j++){const c=this.collider?.contact(pos(item.f),r);if(!c)break;item.f.x+=c.nx*(c.depth+.03);item.f.y+=c.ny*(c.depth+.03);item.f.z+=c.nz*(c.depth+.03);}}if(this.course==='frost'){if(this.collider.contact(pos(a.f),2.4)||a.f.y<this.floor(a.f.x,a.f.z))[a.f.x,a.f.y,a.f.z]=beforeA;if(this.collider.contact(pos(b.f),2.4)||b.f.y<this.floor(b.f.x,b.f.z))[b.f.x,b.f.y,b.f.z]=beforeB;}a.f.speed*=.85;b.f.speed*=.85;}}
 }
 snapshot(){return {world:this.id,room:this.room,course:this.course,revision:this.route.revision,collisionVerified:!!this.collider,collisionHash:this.collider?.hash||null,tick:this.tick,startTick:this.startTick,players:[...this.players.values()].map(p=>({id:p.id,model:p.model,name:p.name,slot:p.slot,p:pos(p.f),yaw:p.f.yaw,pitch:p.f.pitch,roll:p.f.roll,speed:p.f.speed,energy:p.f.energy,shield:this.tick<p.shieldUntil,ammo:p.ammo,gates:p.gates,finished:p.finished,ack:p.seq,connected:p.connected})),finish:this.finish,events:this.events};}
}
module.exports={World,crossing,input,HZ,dt};
