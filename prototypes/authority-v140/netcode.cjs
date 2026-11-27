/* REDLINE 144 — transport-independent snapshot interpolation and bounded client prediction.
   Server states always win. This view never submits poses, hits or race results. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.REDLINE_NETCODE=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
 const angle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
 const mix=(a,b,t)=>a+(b-a)*t;
 const copy=o=>JSON.parse(JSON.stringify(o));
 const numeric=(n,d=0)=>Number.isFinite(n)?n:d;
 function interpolate(a,b,t){
   t=clamp(t,0,1);
   const out={...b};
   out.p=[0,1,2].map(i=>mix(numeric(a.p[i]),numeric(b.p[i]),t));
   for(const k of ['yaw','pitch','roll'])out[k]=angle(numeric(a[k]),numeric(b[k]),t);
   for(const k of ['speed','energy'])out[k]=mix(numeric(a[k]),numeric(b[k]),t);
   return out;
 }
 function fromWire(p){
   const f={x:p.p[0],y:p.p[1],z:p.p[2],yaw:p.yaw||0,pitch:p.pitch||0,roll:p.roll||0,
   speed:p.speed||0,energy:p.energy??1,vx:p.v?.[0]||0,vy:p.v?.[1]||0,vz:p.v?.[2]||0,
   turnRate:p.turnRate||0,steerFiltered:p.steerFiltered||0,strafeSpeed:p.strafeSpeed||0,
   bankVelocity:p.bankVelocity||0,boostLocked:p.boostLocked===true,_accumulator:0,
   _prevX:p.p[0],_prevY:p.p[1],_prevZ:p.p[2],renderX:p.p[0],renderY:p.p[1],renderZ:p.p[2]};
   return f;
 }
 class Netcode{
   constructor(options={}){
     this.frames=[];this.pending=[];this.world=null;this.self=null;this.maxFrames=12;
     this.delayTicks=options.delayTicks??7.2;this.maxExtrapolationTicks=options.maxExtrapolationTicks??6;
     this.local=null;this.visual=null;this.flight=options.flight||null;
     this.settings=options.settings||{handlingMode:'sport',thrust:80,agility:75,stability:70,ranked:false};
     this.corrections=0;this.discards=0;this.maxPending=64;this.lastAck=0;
   }
   receive(snapshot,id){
     if(!snapshot||!Number.isSafeInteger(snapshot.tick)||!Array.isArray(snapshot.players)||typeof snapshot.world!=='string')return false;
     if(this.world!==snapshot.world){this.frames=[];this.pending=[];this.local=null;this.visual=null;this.world=snapshot.world;this.lastAck=0;}
     if(this.frames.length&&snapshot.tick<=this.frames.at(-1).tick){this.discards++;return false;}
     const player=snapshot.players.find(p=>p.id===id);
     if(!player||!Array.isArray(player.p)||player.p.length!==3||!player.p.every(Number.isFinite))return false;
     this.self=id;
     this.frames.push(copy(snapshot));if(this.frames.length>this.maxFrames)this.frames.shift();
     const ack=Number.isSafeInteger(player.ack)?player.ack:0;
     if(ack<this.lastAck){this.discards++;return false;}
     this.lastAck=ack;
     this.pending=this.pending.filter(x=>x.input.seq>ack);
     // Reconciliation: replay only unacknowledged input, never an obsolete client pose.
     let f=fromWire(player);
     if(this.flight&&this.flight.stepFlight){
       for(const entry of this.pending){
         this.flight.stepFlight(f,entry.input,{...this.settings,airframe:player.model,shipyard:snapshot.course==='iron'},entry.dt);
       }
     }
     this.local=f;
     if(this.visual){
       const error=Math.hypot(this.visual.x-f.x,this.visual.y-f.y,this.visual.z-f.z);
       if(error>250||!Number.isFinite(error))this.visual={...f};
       else if(error>.05)this.corrections++;
     }else this.visual={...f};
     return true;
   }
   submit(input,dt=1/30){
     if(!this.self||!this.local||!Number.isSafeInteger(input?.seq)||input.seq<=this.lastAck)return false;
     if(this.pending.length>=this.maxPending)this.pending.shift();
     const duration=clamp(numeric(dt,1/30),1/120,1/15);
     this.pending.push({input:{...input},dt:duration});
     if(this.flight&&this.flight.stepFlight)this.flight.stepFlight(this.local,input,this.settings,duration);
     return true;
   }
   own(dt=1/60){
     if(!this.local)return null;
     const f=this.local,alpha=1-Math.exp(-Math.min(.1,Math.max(0,dt))*20);
     for(const k of ['x','y','z'])this.visual[k]=mix(this.visual[k],f[k],alpha);
     this.visual.yaw=angle(this.visual.yaw||0,f.yaw||0,alpha);
     this.visual.pitch=angle(this.visual.pitch||0,f.pitch||0,alpha);
     this.visual.roll=angle(this.visual.roll||0,f.roll||0,alpha);
     return {...this.visual,p:[this.visual.x,this.visual.y,this.visual.z]};
   }
   remote(id,targetTick){
     if(!this.frames.length)return null;
     const clock=Number.isFinite(targetTick)?targetTick:this.frames.at(-1).tick-this.delayTicks;
     const frames=this.frames;
     if(clock>frames.at(-1).tick){
       const last=frames.at(-1).players.find(p=>p.id===id);
       if(!last)return null;
       const lag=clamp(clock-frames.at(-1).tick,0,this.maxExtrapolationTicks)/60;
       return {...last,p:last.p.map((v,i)=>v+numeric(last.v?.[i])*lag),extrapolated:lag>0};
     }
     let lower=frames[0],upper=frames.at(-1);
     for(let i=1;i<frames.length;i++)if(frames[i].tick>=clock){lower=frames[i-1];upper=frames[i];break;}
     const a=lower.players.find(p=>p.id===id),b=upper.players.find(p=>p.id===id);
     if(!a&&!b)return null;if(!a)return b;if(!b)return a;
     if(upper.tick===lower.tick){
       const lag=clamp(clock-upper.tick,0,this.maxExtrapolationTicks)/60;
       return {...b,p:b.p.map((v,i)=>v+numeric(b.v?.[i])*lag),extrapolated:lag>0};
     }
     return interpolate(a,b,(clock-lower.tick)/(upper.tick-lower.tick));
   }
   getDiagnostics(){return {world:this.world,frames:this.frames.length,pending:this.pending.length,lastAck:this.lastAck,corrections:this.corrections,discarded:this.discards,delayTicks:this.delayTicks};}
 }
 return Object.freeze({Netcode,interpolate,fromWire,angle});
});
