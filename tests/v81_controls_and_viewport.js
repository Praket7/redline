const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const bindingCode=fs.readFileSync(path.join(root,'src/scripts/012_module.js'),'utf8');
const ctx={module:{exports:{}},console,localStorage:{getItem:()=>null,setItem:()=>{}},addEventListener(){},window:{}};
ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(bindingCode,ctx);
const B=ctx.REDLINE_BINDINGS;
for(const [id,key] of [['fire','KeyE'],['reload','KeyF'],['shield','Space'],['brake','KeyJ']])
  assert.equal(B.get(id).main,key,'wrong mapping for '+id);
assert.equal(B.get('fire').alt,null,'E must be sole desktop fire mapping');
assert.equal(B.actionFor('KeyF'),'reload');
assert.equal(B.actionFor('KeyE'),'fire');
assert.equal(B.actionFor('KeyJ'),'brake');
assert.equal(B.actionFor('Space'),'shield');
assert.equal(B.assign('fire','alt','KeyG').ok,false,'firing alias must be rejected');
const src=fs.readFileSync(path.join(root,'src/scripts/035_module.js'),'utf8');
assert(src.includes('REDLINE_PLAYER_CRASH.t=1.05'),'hit respawn should be short');
assert(src.includes("REDLINE_LASER_INPUT.lastTrigger='E key'"),'E must fire in race input');
for(const forbidden of ["lastTrigger='classic click'","lastTrigger='double click'","lastTrigger='dblclick fallback'","gamepad?.fire||(touchLive&&touch.fire)"])
  assert(!src.includes(forbidden),'unexpected laser firing alias: '+forbidden);
assert(src.includes("emergencyStop:!!REDLINE_BINDINGS.isDown(K,'brake')"),'J must set full-stop input');
assert(src.includes('width:100vw;height:100dvh'),'renderer canvas must cover browser viewport');
const flight=fs.readFileSync(path.join(root,'src/scripts/006_module.js'),'utf8');
assert(flight.includes('if(input.emergencyStop){f.speed=0;f.vx=f.vy=f.vz=0;f.strafeSpeed=0;}'),'full stop must zero movement');
const builder=fs.readFileSync(path.join(root,'build.py'),'utf8');
assert(builder.includes("REDLINE_V81"),'v81 build flag missing');
assert(builder.includes("v81_authority.css.gz.b64"),'minimal FPV CSS missing');
assert(builder.includes("v81_narrow_hud.css"),'narrow HUD fix missing');
console.log('PASS v81 E-only fire / F reload / Space shield / J full stop, 1.05-sec laser-hit recovery, full viewport, transparent HUD build');
