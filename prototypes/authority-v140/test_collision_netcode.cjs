'use strict';
const assert=require('node:assert/strict');
const {CollisionMesh}=require('./collision.cjs');
const {Netcode,interpolate}=require('./netcode.cjs');
let tests=0;const ck=x=>{assert.ok(x);tests++};
const wall=new CollisionMesh({source:'fixture',triangles:[
 [-10,-10,0,10,-10,0,-10,10,0],
 [10,-10,0,10,10,0,-10,10,0]
]});
ck(wall.tris.length===2);
ck(wall.contact([0,0,.5],1).depth>.4);
ck(wall.contact([0,0,3],1)===null);
const impact=wall.sweep([0,0,3],[0,0,-3],1);
ck(impact!==null&&impact.t>.25&&impact.t<.5);
ck(Math.abs(wall.raycast([0,0,3],[0,0,-1],5).distance-3)<1e-6);
ck(wall.raycast([0,0,3],[0,0,1],5)===null);
assert.throws(()=>new CollisionMesh({triangles:[[Infinity,0,0,0,0,0,1,0,0]]}));tests++;
const a={id:'A',p:[0,0,0],yaw:3.12,pitch:0,roll:0,speed:2,energy:1,v:[1,0,0],ack:0,model:'kestrel'};
const b={...a,p:[20,0,0],yaw:-3.12,ack:1};
const mid=interpolate(a,b,.5);
ck(mid.p[0]===10);
ck(Math.abs(Math.abs(mid.yaw)-Math.PI)<.05);
const s=(tick,p)=>({type:'snapshot',world:'world1',room:'ABC',course:'grand',tick,players:[p,{...p,id:'B',p:[tick,0,0]}]});
const net=new Netcode();
ck(net.receive(s(10,a),'A'));
ck(net.submit({seq:1,throttle:1}));
ck(net.pending.length===1);
ck(net.receive(s(20,b),'A'));
ck(net.pending.length===0&&net.lastAck===1);
ck(!net.receive(s(19,b),'A'));
const remote=net.remote('B',15);
ck(remote!==null&&Math.abs(remote.p[0]-15)<.01);
ck(net.getDiagnostics().discarded===1);
ck(net.receive({...s(21,b),world:'world2'},'A')&&net.world==='world2');
console.log(JSON.stringify({assertions:tests,stage142:'triangle contact, sweep and raycast fixtures',stage144:'snapshot ordering, interpolation, ack and reset',exactProductionGeometry:false}));
