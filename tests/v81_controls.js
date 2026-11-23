const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(root+'/src/scripts/012_module.js','utf8');
const world=fs.readFileSync(root+'/src/scripts/035_module.js','utf8');
const css=fs.readFileSync(root+'/src/styles/999_stage1_authority.css','utf8');
const past={
  brake:{main:'Space',alt:null},
  shield:{main:'KeyJ',alt:null},
  reload:{main:'KeyZ',alt:null},
  fire:{main:'KeyE',alt:'KeyF'}
};
const storage={'redline_v21_keybindings':JSON.stringify(past)};
const context={console,localStorage:{getItem:key=>storage[key]||null,setItem:(k,v)=>{storage[k]=v}}};
vm.runInNewContext(code,context,{filename:'012_module.js'});
const b=context.REDLINE_BINDINGS;
for(const [action,key] of Object.entries({brake:'KeyJ',shield:'Space',reload:'KeyF',fire:'KeyE'})){
 assert.equal(b.get(action).main,key,'unexpected '+action+' default after old localStorage migration');
 assert.equal(b.actionFor(key),action,'key collision '+key);
}
assert.equal(b.get('fire').alt,null,'F must never be an alternate trigger');
assert.equal(b.assign('fire','alt','KeyZ').ok,false,'E-only fire key cannot be customized');
assert.equal(b.assign('fire','main','KeyR').ok,false,'E-only fire is invariant');
assert.equal(b.isDown({KeyJ:true},'brake'),true);
assert.equal(b.isDown({Space:true},'shield'),true);
assert.equal(b.isDown({KeyF:true},'reload'),true);
assert.equal(b.isDown({KeyF:true},'fire'),false);
assert.equal(b.actionFor('KeyZ'),null,'old reload shortcut must be removed');
assert(world.includes('REDLINE_PLAYER_CRASH.t=1.15;'),'player respawn delay must be 1.15 s');
assert(world.includes('if(hardStop){FL.speed=FL.vx=FL.vy=FL.vz=FL.strafeSpeed=0;FL.x=p.x;FL.y=p.y;FL.z=p.z;'),'J must stop momentum in fixed step');
assert(world.includes('if(!hardStop){p.x+=w[0]*cp*dt;'),'wind must not drift a fully stopped player');
assert(world.includes("window.REDLINE_LASER_INPUT.lastTrigger='KeyE'"),'keyboard fire should report KeyE');
assert(!world.includes("lastTrigger='double click'")&&!world.includes("lastTrigger='dblclick fallback'"),'mouse gestures may not fire');
assert(world.includes('const craftRadius=43;')&&world.includes('showroomCameraDistance=craftRadius;'),'single stable hangar zoom');
assert(world.includes('camera.setViewOffset(w,h,w*.5-focusX,0,w,h);'),'projection must not stretch the full viewport');
assert(world.includes('Rn.setSize(innerWidth,innerHeight,false);'),'renderer size must not overwrite viewport CSS dimensions');
assert(css.includes('width:100vw!important;height:100dvh!important'),'canvas must be full bleed');
for(const el of ['#rlGameTop','#rlPositions','#maphud','#rlFlowModule'])assert(css.includes(el),'transparent FPV HUD selector missing '+el);
console.log('PASS v81: keybinding migration, exclusive E fire, J stop, 1.15 s respawn, fixed camera projection, full-bleed renderer, FPV transparent HUD');
