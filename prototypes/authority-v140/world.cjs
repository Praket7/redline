'use strict';
const {randomUUID}=require('node:crypto');
const F=require('./flight.cjs'),routes=require('./routes.json'),{loadCourse}=require('./collision.cjs');
const HZ=60,dt=1/HZ,MAX=6;const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),sub=(a,b)=>a.map((x,i)=>x-b[i]);
const pos=f=>[f.x,f.y,f.z];const models=new Set(['kestrel','blade','copper','spirit']);
function crossing(a,b,g){const u=dot(sub(a,g.center),g.normal),v=dot(sub(b,g.center),g.normal);if(u>=0||v<0||v===u)return null;const t=-u/(v-u),p=a.map((x,i)=>x+(b[i]-x)*t);return Math.hypot(...sub(p,g.center))<g.radius*.96?t:null;}
function input(v){if(!v||typeof v!=='object'||!Number.isSafeInteger(v.seq)||v.seq<1)return null;const a={seq:v.seq};for(const k of ['throttle','steer','strafe','lift','pitch']){if(v[k]!==undefined&&!Number.isFinite(v[k]))return null;a[k]=clamp(v[k]||0,k==='pitch'?-.31:-1,k==='pitch'?.31:1);}if(v.headingTarget!==undefined){if(!Number.isFinite(v.headingTarget))return null;a.headingTarget=Math.atan2(Math.sin(v.headingTarget),Math.cos(v.headingTarget));}for(const k of ['boost','brake','fire','shield','emp'])a[k]=v[k]===true;return a;}
class World{
 constructor(course,room='local'){if(!routes[course])throw Error('unknown course');this.course=course;this.route=routes[course];this.room=room;this.id=randomUUID();this.tick=0;this.startTick=null;this.players=new Map();this.events=[];this.finish=[];this.collider=loadCourse(course,this.route.revision);}
 add(id,model,name,slot){if(this.players.has(id)){let p=this.players.get(id);p.connected=true;p.last=this.tick;p.input={seq:p.seq};return p;}if(this.startTick!==null||this.players.size>=MAX||!models.has(model)||!Number.isInteger(slot)||slot<0||slot>=MAX||[...this.players.values()].some(p=>p.slot===slot))throw Error('room unavailable');const g=this.route.gates.at(-1),f=F.createFlight(),side=[-g.normal[2],0,g.normal[0]],lane=(slot-2.5)*(this.course==='iron'?2.5:12);[f.x,f.y,f.z]=g.center.map((x,i)=>x+side[i]*lane-g.normal[i]*8);f.yaw=Math.atan2(-g.normal[0],-g.normal[2]);F.resetTransients(f);const p={id,model,name,slot,f,seq:0,input:{},last:this.tick,connected:true,gates:0,ammo:2,reload:0,shieldUntil:0,shieldReady:0,fireReady:0,empReady:0,stunUntil:0,finished:null};this.players.set(id,p);return p;}
 start(){if(this.startTick!==null||this.players.size<2)throw Error('need two pilots');this.startTick=this.tick+3*HZ;}
 accept(id,raw){const p=this.players.get(id),v=input(raw);if(!p||!p.connected||!v||v.seq<=p.seq)return false;p.seq=v.seq;p.input=v;p.last=this.tick;return true;}
 disconnect(id){const p=this.players.get(id);if(p){p.connected=false;p.input={};}}
 emit(type,fields){this.events.push({tick:this.tick,type,...fields});if(this.events.length>128)this.events.shift();}
 floor(x,z){if(this.course==='grand')return 4.5;const {dock:d,land}=this.route;if(x>=d.minX&&x<=d.maxX&&z>=d.minZ&&z<=d.maxZ)return d.floor+3.6;return land.some(([a,b,c,e])=>x>=a&&x<=b&&z>=c&&z<=e)?8.6:3.35;}
 // Prototype bounds only. Full environment BVH / terrain / occlusion adapter is a release blocker.
 move(p,cmd){const f=p.f,a=pos(f);F.stepFlight(f,cmd,{thrust:80,agility:75,stability:70,handlingMode:'sport',airframe:p.model,shipyard:this.course==='iron',minAltitude:this.course==='iron'?-16.4:4.5,ranked:false},dt);f.x=clamp(f.x,-1380,1380);f.z=clamp(f.z,-1380,1380);f.y=clamp(f.y,this.floor(f.x,f.z),310);if(this.collider){
  const impact=this.collider.sweep(a,pos(f),4);
  if(impact){[f.x,f.y,f.z]=impact.p;
   const n=impact.contact.normal,velocity=[f.vx,f.vy,f.vz],toward=dot(velocity,n);
   if(toward<0){f.vx-=toward*n[0];f.vy-=toward*n[1];f.vz-=toward*n[2];}
   f.speed*=.38;this.emit('terrain_hit',{id:p.id,triangle:impact.contact.triangle});
  }
 }
 const b=pos(f),total=this.route.gates.length*3,g=this.route.gates[p.gates%this.route.gates.length],t=crossing(a,b,g);if(p.gates<total&&t!==null){p.gates++;this.emit('gate',{id:p.id,gates:p.gates});if(p.gates===total){p.finished=(this.tick-this.startTick-1+t)/HZ;this.finish.push({id:p.id,time:p.finished});this.finish.sort((a,b)=>a.time-b.time||a.id.localeCompare(b.id));this.emit('finish',{id:p.id,time:p.finished});}}}
 combat(p,cmd){if(cmd.shield&&this.tick>=p.shieldReady){p.shieldUntil=this.tick+2*HZ;p.shieldReady=this.tick+8*HZ;this.emit('shield',{id:p.id});}if(p.ammo<2&&this.tick>=p.reload){p.ammo++;p.reload=this.tick+90;}if(cmd.fire&&p.ammo&&this.tick>=p.fireReady){p.ammo--;p.reload=this.tick+90;p.fireReady=this.tick+20;const f=p.f,origin=pos(f),pitch=f.pitch,d=[-Math.sin(f.yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(f.yaw)*Math.cos(pitch)];let hit=null,dist=300;for(const q of this.players.values()){if(q===p||q.finished!==null)continue;const r=sub(pos(q.f),origin),along=dot(r,d),off=Math.hypot(...r.map((x,i)=>x-d[i]*along));if(along>0&&along<dist&&off<5){hit=q;dist=along;}}const obstruction=this.collider?.raycast(origin,d,dist);
 if(obstruction&&obstruction.distance<dist){hit=null;dist=obstruction.distance;}
 this.emit('laser',{id:p.id,origin,end:origin.map((x,i)=>x+d[i]*dist),hit:hit?.id||null});if(hit){const blocked=this.tick<hit.shieldUntil;if(!blocked){hit.stunUntil=this.tick+45;hit.f.speed*=.38;hit.f.vx*=.38;hit.f.vy*=.38;hit.f.vz*=.38;}this.emit('hit',{id:hit.id,attacker:p.id,blocked});}}if(cmd.emp&&this.tick>=p.empReady){p.empReady=this.tick+10*HZ;for(const q of this.players.values())if(q!==p&&q.finished===null&&Math.hypot(...sub(pos(q.f),pos(p.f)))<60&&this.tick>=q.shieldUntil){q.stunUntil=this.tick+HZ;q.f.energy=0;}this.emit('emp',{id:p.id,origin:pos(p.f)});}}
 step(){this.tick++;if(this.startTick===null||this.tick<=this.startTick)return;const active=[];for(const p of this.players.values()){if(p.finished!==null)continue;const cmd=p.connected&&this.tick-p.last<=30?p.input:{};const effective=this.tick<p.stunUntil?{brake:true}:cmd;this.move(p,effective);active.push([p,effective]);} // all pilots advance before any combat is resolved
 for(const [p,c] of active)if(p.finished===null&&c.shield&&this.tick>=p.shieldReady){p.shieldUntil=this.tick+2*HZ;p.shieldReady=this.tick+8*HZ;this.emit('shield',{id:p.id});}
 for(const [p,c] of active)if(p.finished===null)this.combat(p,c);
 // Shared aircraft separation. No client can decide a different outcome.
 const ps=active.map(x=>x[0]);for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const a=ps[i],b=ps[j],d=sub(pos(a.f),pos(b.f)),n=Math.hypot(...d);if(n<4){if(n<=0.001){d[0]=a.id.localeCompare(b.id)<0?-1:1;n=1;}const k=(4-n)/2/n;for(const [idx,key] of ['x','y','z'].entries()){a.f[key]+=d[idx]*k;b.f[key]-=d[idx]*k;}a.f.speed*=.85;b.f.speed*=.85;}}
 }
 snapshot(){return {world:this.id,room:this.room,course:this.course,revision:this.route.revision,collisionVerified:!!this.collider,tick:this.tick,startTick:this.startTick,players:[...this.players.values()].map(p=>({id:p.id,model:p.model,name:p.name,slot:p.slot,p:pos(p.f),yaw:p.f.yaw,pitch:p.f.pitch,roll:p.f.roll,speed:p.f.speed,energy:p.f.energy,v:[p.f.vx,p.f.vy,p.f.vz],turnRate:p.f.turnRate,steerFiltered:p.f.steerFiltered,strafeSpeed:p.f.strafeSpeed,bankVelocity:p.f.bankVelocity,boostLocked:p.f.boostLocked,shield:this.tick<p.shieldUntil,ammo:p.ammo,gates:p.gates,finished:p.finished,ack:p.seq,connected:p.connected})),finish:this.finish,events:this.events};}
}
module.exports={World,crossing,input,HZ,dt};
