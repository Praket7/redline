const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../src/scripts/035_module.js','utf8');
const slice=(from,to)=>{const a=source.indexOf(from),b=source.indexOf(to,a);assert(a!==-1&&b>a,`missing ${from}/${to}`);return source.slice(a,b)};
// Execute the actual newly added simulation publisher, not a reimplementation.
const code=slice('let redlinePublishedState = null','function redlineSamplePose()');
const ctx={window:{},Object,Math,st:{p:{x:1,y:22,z:-18},yaw:Math.PI/4},time:3.6,REDLINE_WORLD:'grand',THREE:{Vector3:function(){},}};
vm.runInNewContext(code,ctx);
ctx.redlinePublishSimState(.0166666667);
let a=ctx.window.REDLINE_SIM_STATE();
assert.equal(a.tick,1);assert.equal(a.craft.x,1);assert.equal(a.craft.z,-18);
assert(Object.isFrozen(a));assert(Object.isFrozen(a.craft));assert(a.craft.position===undefined);
ctx.st.p.x=800;assert.equal(ctx.window.REDLINE_SIM_STATE().craft.x,1,'past snapshot must not track mutable player state');
ctx.redlinePublishSimState(.0166666667);assert.equal(ctx.window.REDLINE_SIM_STATE().craft.x,800);
assert.equal(ctx.window.REDLINE_SIM_STATE().tick,2);
// Existing interpolation must still restore authoritative pose after rendering.
assert(source.includes('finally {dr.position.copy(craft);cam.position.copy(view);dr.quaternion.copy(craftQ);cam.quaternion.copy(viewQ); }'));
console.log('PASS fixed tick snapshot immutable, independent, and render interpolation preserved');
