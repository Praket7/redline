'use strict';
// Actual recovered v139 flight module + fixture world. Not a map/transport test.
const assert=require('node:assert/strict');
const path=require('node:path');
const {createRoom}=require('./room.cjs');
if(!process.argv[2])throw Error('Usage: node flight-parity.test.cjs /path/to/extracted/flight.cjs');
const flight=require(path.resolve(process.argv[2]));
const dt=1/60, models=['kestrel','blade','copper','spirit'];
let assertions=0,ticks=0,substeps=0;
const check=(value,message)=>{assert(value,message);assertions++};
const fields=['x','y','z','yaw','pitch','roll','vx','vy','vz','speed','energy'];
check(flight.config.fixedHz===120,'baseline fixed step');
for(const [course,revision,minAltitude] of [['grand',37,4.5],['iron',136,-16.4]]){
 const settings={thrust:80,agility:75,stability:70,handlingMode:'sport',minAltitude,ranked:false};
 const roster=models.map((model,i)=>({id:'pilot-'+i,model}));
 const spawn=i=>({x:10*i,y:85,z:600,yaw:0});
 const fixture={spawn,resolve(){},crossings(){return null},combat(){}};
 const room=createRoom({raceId:'test-'+course,course,revision,roster,flight,world:fixture,settings});
 const reference=roster.map((p,i)=>{const s=Object.assign(flight.createFlight(),spawn(i));flight.resetTransients(s);return s});
 roster.forEach(p=>check(room.setConnected(p.id,true),'connected'));room.start();
 for(let tick=0;tick<360;tick++){
  for(let i=0;i<roster.length;i++){
   const controls={throttle:tick<180?(i%2===0?1:.45):tick<240?-1:0,steer:i%2===0?.3:-.2,strafe:i%2===0?.1:-.1,lift:tick<180?-1:1,pitch:0,brake:tick>=300,boost:tick<60};
   check(room.input(roster[i].id,{raceId:'test-'+course,seq:tick,...controls}),'input accepted');
   const steps=flight.stepFlight(reference[i],controls,{...settings,airframe:roster[i].model,shipyard:course==='iron'},dt);
   check(steps===2,'two actual 120Hz steps per room tick');substeps+=steps;
  }
  room.step();ticks++;const snapshot=room.snapshot();
  check(snapshot.tick===tick+1,'single authoritative tick');
  for(let i=0;i<reference.length;i++)for(const key of fields){const value=snapshot.players[i].pose[key];check(Number.isFinite(value)&&Math.abs(value-reference[i][key])<1e-9,'actual flight parity '+key);}
 }
 check(room.snapshot().players[0].pose.x!==room.snapshot().players[1].pose.x,'distinct aircraft');
 check(!room.input(roster[0].id,{raceId:'test-'+course,seq:361,x:999}),'client pose rejected');
}
console.log(JSON.stringify({assertions,ticks,referenceSubsteps:substeps,scope:'actual v139 integrator; synthetic world; no combat, transport or GPU'},null,2));
