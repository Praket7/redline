'use strict';
const assert=require('node:assert/strict');const {createRoom}=require('./room.cjs');
function verify(createRoom,assert){
 let n=0;const ck=(v,m)=>{assert(v,m);n++};
 const flight={createFlight:()=>({x:0,y:20,z:0,yaw:0,pitch:0,roll:0,vx:0,vy:0,vz:0,speed:0,energy:1}),stepFlight:(s,i,settings,dt)=>{s.x+=i.throttle*dt*60;s.y+=i.lift*dt*60;}};
 const world={spawn:(i)=>({z:i*10}),resolve(){},combat(){},crossings:(p,prev)=>p.state.x>prev.x?.5:null};
 for(const [course,revision,total] of [["grand",37,36],["iron",136,60]]){
 const room=createRoom({raceId:"r",course,revision,roster:[{id:"a",model:"kestrel"},{id:"b",model:"spirit"}],flight,world});
 ck(room.setConnected("a",true),"A joined");ck(room.setConnected("b",true),"B joined");room.start();
 ck(!room.input("a",{raceId:"r",seq:0,x:1000}),"pose rejected");
 ck(!room.input("a",{raceId:"old",seq:0,throttle:1}),"old epoch");
 ck(!room.input("a",{raceId:"r",seq:0,throttle:Infinity}),"nonfinite");
 ck(!room.input("a",{raceId:"r",seq:0,fire:1}),"boolean validation");
 ck(room.input("a",{raceId:"r",seq:0,throttle:1}),"input");
 ck(!room.input("a",{raceId:"r",seq:0,throttle:1}),"duplicate");
 room.step();ck(room.snapshot().players[0].pose.x===1&&room.snapshot().players[1].pose.x===0,"independent movement");
 room.setConnected("a",false);room.step();ck(room.snapshot().players[0].pose.x===1,"disconnect clears controls");
 room.setConnected("a",true);ck(room.snapshot().players[0].progress===1,"reconnect retains progress");
 for(let i=1;i<total;i++){ck(room.input("a",{raceId:"r",seq:i,throttle:1}),"input A");room.step();}
 ck(room.snapshot().players[0].progress===total,"finish A");ck(room.snapshot().phase==="racing","B still racing");
 for(let i=0;i<total;i++){ck(room.input("b",{raceId:"r",seq:i,throttle:1}),"input B");room.step();}
 ck(room.snapshot().phase==="finished","complete");ck(room.snapshot().results[0].id==="a","server finish order");
 ck(room.drainEvents().filter(e=>e.type==="finish").length===2,"finish events once");ck(room.drainEvents().length===0,"events drained");
 }
 return n;
}
console.log(verify(createRoom,assert)+' fixture assertions passed');
