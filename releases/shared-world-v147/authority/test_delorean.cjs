'use strict';
const assert=require('node:assert/strict'),F=require('./flight.cjs'),A=globalThis.REDLINE_AIRFRAMES,{World}=require('./world.cjs');
const d=A.stats('delorean','sport',80,75),k=A.stats('kestrel','sport',80,75),b=A.stats('blade','sport',80,75);
assert.equal(A.get('delorean').id,'delorean');assert(d.boostSpeed>k.boostSpeed&&d.boostSpeed>b.boostSpeed);assert(d.turnDeg<k.turnDeg);assert(d.strafe>b.strafe);
for(const course of ['grand','iron']){
 const w=new World(course,'TEST-DMC');let p=w.add('dmc','delorean','DMC',0);w.add('other','kestrel','Pilot',1);
 assert.equal(p.model,'delorean');assert.equal(w.snapshot().players[0].model,'delorean');w.start();
 assert.equal(w.snapshot().players.length,2);
}
console.log(JSON.stringify({dmc:d,kestrel:k,blade:b,assertions:10}));
