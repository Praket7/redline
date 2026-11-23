const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..');
const ctx={console};ctx.globalThis=ctx;vm.createContext(ctx);
for(const name of ['006_module.js','007_module.js'])
 vm.runInContext(fs.readFileSync(root+'/src/scripts/'+name,'utf8'),ctx);
assert(ctx.REDLINE_AIRFRAMES && ctx.REDLINE_FLIGHT && ctx.REDLINE_MOUSE_STICK);
const mouse=ctx.REDLINE_MOUSE_STICK.create();
mouse.begin('locked',0);mouse.feed(0,-80);mouse.step(1/60,1,.9,0);
const up=mouse.pitch;mouse.level();mouse.feed(0,80);mouse.step(1/60,1,.9,0);
const down=mouse.pitch;mouse.reset();
assert(up>=.22&&up<=.31,'upward pitch should respond to one deliberate 80px motion');
assert(down<=-.22&&down>=-.31,'downward pitch should be symmetric');
const baseSettings={thrust:80,agility:75,stability:70,handlingMode:'easy',airframe:'kestrel'};
function simulate(pitch){
 const f=ctx.REDLINE_FLIGHT.createFlight();
 for(let i=0;i<40;i++)ctx.REDLINE_FLIGHT.stepFlight(f,{throttle:1,steer:0,strafe:0,lift:0,pitch,boost:false,brake:false},baseSettings,1/60);
 return {pitch:f.pitch,vy:f.vy,y:f.y,speed:f.speed};
}
const raised=simulate(.27),neutral=simulate(0),lowered=simulate(-.27);
assert(raised.pitch>.23,'visual aircraft pitch should follow the pilot rapidly');
assert(raised.vy>25&&raised.y>neutral.y+6,'positive pitch must cause actual upward flight');
assert(lowered.vy < -25 && lowered.y < neutral.y-6,'negative pitch must cause actual downward flight');
assert(Math.abs(raised.speed-neutral.speed)<.2,'up/down tuning must not alter forward speed');
console.log(JSON.stringify({state:'PASS',up,down,raised,neutral,lowered},null,2));