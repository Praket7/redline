'use strict';
const assert=require('node:assert/strict');const {World,crossing,input,HZ}=require('./world.cjs');let checks=0;function ck(v){assert(v);checks++;}
for(const course of ['grand','iron']){
 const w=new World(course);for(let i=0;i<6;i++)w.add('p'+i,['kestrel','blade','copper','spirit'][i%4],'Pilot '+i,i);ck(w.players.size===6);assert.throws(()=>w.add('extra','blade','Extra',0));checks++;w.start();for(let i=0;i<181;i++)w.step();
 // Exercise actual shared terrain along the open course, never disable the authority collider.
 // Isolated fixture positions to exercise server-only combat and ordered crossing; not client commands.
 const a=w.players.get('p0'),b=w.players.get('p1');for(const p of w.players.values()){p.f.x=800;p.f.y=100;p.f.z=800;}const base=course==='grand'?[109.78,100,-910.72]:[0,100,0];Object.assign(a.f,{x:base[0],y:base[1],z:base[2],yaw:0,pitch:0,speed:0});Object.assign(b.f,{x:base[0],y:base[1],z:base[2]-50,yaw:0,pitch:0,speed:100});
 w.accept(a.id,{seq:1,fire:true});w.accept(b.id,{seq:1,shield:true});w.step();ck(w.events.some(e=>e.type==='hit'&&e.id===b.id&&e.blocked));ck(a.ammo===1);ck(b.stunUntil===0);b.shieldUntil=0;b.shieldReady=w.tick+600;a.fireReady=0;w.accept(a.id,{seq:2,fire:true});w.accept(b.id,{seq:2,shield:false});w.step();ck(w.events.some(e=>e.type==='hit'&&e.id===b.id&&!e.blocked));ck(b.stunUntil>w.tick);ck(a.ammo===0);ck(!w.accept(a.id,{seq:1,throttle:1}));ck(!w.accept(a.id,{seq:3,throttle:NaN}));
 // Check each real gate's directional plane and ring; test complete 3-lap counters via controlled fixtures.
 for(const p of [a,b]){p.stunUntil=0;p.input={};p.gates=0;p.finished=null;}
 for(let lap=0;lap<3;lap++)for(const g of w.route.gates){const p=g.center.map((x,i)=>x-g.normal[i]*2),q=g.center.map((x,i)=>x+g.normal[i]*2);ck(crossing(p,q,g)!==null);ck(crossing(q,p,g)===null);}
 // Move through the actual last gate via the server physics. Timing uses crossing fraction, not packet arrival.
 const last=w.route.gates.at(-1);for(const [i,p] of [a,b].entries()){p.gates=w.route.gates.length*3-1;Object.assign(p.f,{x:last.center[0]-last.normal[0]*(i===0?.15:.45),y:last.center[1]-last.normal[1]*(i===0?.15:.45),z:last.center[2]-last.normal[2]*(i===0?.15:.45),yaw:Math.atan2(-last.normal[0],-last.normal[2]),speed:100,vx:last.normal[0]*100,vy:last.normal[1]*100,vz:last.normal[2]*100,pitch:0});p.input={throttle:1};p.last=w.tick;}
 w.step();ck(a.finished!==null&&b.finished!==null);ck(w.finish[0].id===a.id&&w.finish[0].time<w.finish[1].time);const prev=JSON.stringify(w.finish);w.step();ck(JSON.stringify(w.finish)===prev);
}
console.log(JSON.stringify({assertions:checks,courses:2,combat:'server-owned ray test, shield and ammo',finish:'same-tick crossing fraction; controlled fixture',full_environment_collision:false}));
