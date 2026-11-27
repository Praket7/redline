'use strict';
// Experimental single-room authority core. Not a hosted game server.
function createRoom({raceId,course,revision,roster,flight,world,settings={}}){
 const DT=1/60, modes={grand:37,iron:136}, gates={grand:36,iron:60};
 if(!raceId||modes[course]!==revision||!Array.isArray(roster)||roster.length<2||roster.length>6)throw Error("Invalid immutable room configuration");
 if(typeof flight?.createFlight!=="function"||typeof flight?.stepFlight!=="function"||!["spawn","resolve","crossings","combat"].every(k=>typeof world?.[k]==="function"))throw Error("Real flight and world adapters required");
 const keys=["throttle","steer","strafe","lift","pitch"], actions=["brake","boost","fire","shield","reload","emp"];
 const neutral=()=>Object.fromEntries([...keys.map(k=>[k,0]),...actions.map(k=>[k,false])]);
 const players=new Map();let tick=0,phase="lobby",events=[],eventId=0;
 const emit=(type,data)=>events.push({raceId,tick,id:++eventId,type,...data});
 for(const [slot,p] of roster.entries()){
  if(typeof p.id!=="string"||!p.id||players.has(p.id)||!["kestrel","blade","copper","spirit"].includes(p.model))throw Error("Invalid roster");
  const state=flight.createFlight();Object.assign(state,world.spawn(slot,roster.length));flight.resetTransients?.(state);
  players.set(p.id,{id:p.id,model:p.model,state,input:neutral(),lastSeq:-1,lastInputTick:0,connected:false,progress:0,finish:null,combat:{ammo:2,shield:false}});
 }
 function setConnected(id,connected){const p=players.get(id);if(!p)return false;p.connected=Boolean(connected);p.input=neutral();p.lastInputTick=tick;return true;}
 function start(){if(phase!=="lobby"||[...players.values()].some(p=>!p.connected))throw Error("All pilots must be connected before start");phase="racing";}
 function input(id,m){
  const p=players.get(id);if(phase!=="racing"||!p?.connected||p.finish!==null||!m||m.raceId!==raceId||!Number.isSafeInteger(m.seq)||m.seq<=p.lastSeq||m.seq<0)return false;
  if(Object.keys(m).some(k=>!["raceId","seq","headingTarget",...keys,...actions].includes(k)))return false;
  const x=neutral();
  for(const k of keys){if(m[k]===undefined)continue;if(!Number.isFinite(m[k])||Math.abs(m[k])>(k==="pitch"?.31:1))return false;x[k]=m[k];}
  for(const k of actions){if(m[k]===undefined)continue;if(typeof m[k]!=="boolean")return false;x[k]=m[k];}
  if(m.headingTarget!==undefined){if(!Number.isFinite(m.headingTarget)||Math.abs(m.headingTarget)>Math.PI)return false;x.headingTarget=m.headingTarget;}
  p.input=x;p.lastSeq=m.seq;p.lastInputTick=tick;return true;
 }
 function step(){
  if(phase!=="racing")return;tick++;
  const active=[...players.values()].filter(p=>p.finish===null);
  const previous=new Map(active.map(p=>[p.id,{x:p.state.x,y:p.state.y,z:p.state.z}]));
  for(const p of active){
   if(!p.connected||tick-p.lastInputTick>15)p.input=neutral();
   flight.stepFlight(p.state,p.input,{...settings,airframe:p.model,shipyard:course==="iron"},DT);
   world.resolve(p,previous.get(p.id),DT);
   if(!["x","y","z","yaw","pitch","roll"].every(k=>Number.isFinite(p.state[k])))throw Error("Nonfinite authoritative state");
  }
  // All aircraft move before shared combat is evaluated. Adapters are trusted server code.
  world.combat(active,DT,emit,tick);
  for(const p of active){
   const f=world.crossings(p,previous.get(p.id),p.progress);
   if(f!==null&&f!==undefined){
    if(!Number.isFinite(f)||f<0||f>1)throw Error("Invalid gate crossing fraction");
    p.progress++;emit("gate",{pilot:p.id,progress:p.progress});
    if(p.progress===gates[course]){p.finish=(tick-1+f)*DT;emit("finish",{pilot:p.id,time:p.finish});}
   }
  }
  if([...players.values()].every(p=>p.finish!==null))phase="finished";
 }
 function snapshot(){return {raceId,course,revision,tick,phase,players:[...players.values()].map(p=>({id:p.id,model:p.model,connected:p.connected,ack:p.lastSeq,progress:p.progress,finish:p.finish,pose:Object.fromEntries(["x","y","z","yaw","pitch","roll","vx","vy","vz","speed","energy"].map(k=>[k,p.state[k]])),combat:JSON.parse(JSON.stringify(p.combat))})),results:[...players.values()].filter(p=>p.finish!==null).sort((a,b)=>a.finish-b.finish||a.id.localeCompare(b.id)).map(p=>({id:p.id,time:p.finish}))};}
 function drainEvents(){const r=events;events=[];return r;}
 return {setConnected,start,input,step,snapshot,drainEvents};
}
module.exports={createRoom};
