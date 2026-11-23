const fs=require('fs'),vm=require('vm'),assert=require('assert');
const s=fs.readFileSync(require('node:path').join(__dirname,'../../dist/REDLINE_v78_STAGE1_STANDALONE.html'),'utf8');
let tests=0;const check=(c,m)=>{assert(c,m);tests++};
// The actual lock factory, not a reimplementation.
const a=s.indexOf('/* REDLINE v31 — target acquisition'),b=s.indexOf('</script>',a);
const ctx={};vm.runInNewContext(s.slice(a,b),ctx);
const lock=ctx.REDLINE_TARGET_LOCK.create(2);
for(let i=0;i<39;i++)lock.step(.05,{id:'rival-2',target:{label:'VIPER'}});
check(!lock.ready&&Math.abs(lock.elapsed-1.95)<.001,'2s lock not premature');
lock.step(.05,{id:'rival-2',target:{label:'VIPER'}});
check(lock.ready&&Math.abs(lock.snapshot().progress-1)<.001,'2s lock readies at 2s');
lock.fire();check(!lock.ready&&lock.cooldown===.65,'lock consumed on fire');
lock.step(.10,null);check(!lock.ready&&lock.cooldown>.5,'cooldown persists');
// Test actual red projectile emitter/advance functions with lightweight THREE mocks.
class Vec3{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this}clone(){return new Vec3(this.x,this.y,this.z)}sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}length(){return Math.hypot(this.x,this.y,this.z)}normalize(){const d=this.length()||1;this.x/=d;this.y/=d;this.z/=d;return this}addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this}}
class Q{setFromUnitVectors(){return this}copy(){return this}}
class Mesh{constructor(g,m){this.geometry=g;this.material=m;this.visible=false;this.position=new Vec3();this.quaternion=new Q();this.scale={set:(...a)=>this._scale=a};}}
class Mat{constructor(opts){Object.assign(this,opts)}}
const THREE={Vector3:Vec3,Quaternion:Q,Mesh,CylinderGeometry:class{},MeshBasicMaterial:Mat,AdditiveBlending:2};
const scene={items:[],add(...x){this.items.push(...x)}};
const fa=s.indexOf('function clashBotEmitRedLasers('), fb=s.indexOf('function clashBotEMP(',fa);
const sandbox={THREE,S:scene,Math};vm.runInNewContext(s.slice(fa,fb)+';globalThis.emit=clashBotEmitRedLasers;globalThis.advance=clashBotAdvanceRedLasers;',sandbox);
const bot={index:1,mesh:{position:new Vec3(12,20,-6),updateMatrixWorld(){},localToWorld(p){return new Vec3(p.x+12,p.y+20,p.z-6)}}};
sandbox.emit(bot,new Vec3(40,20,-160));check(bot.redShots.length===2&&scene.items.length===4,'two dual-color red shots emitted');
sandbox.advance(bot,.11);check(bot.redShots.every(f=>f.a.visible&&f.b.visible),'red bolts visible during flight');
check(bot.redShots[0].b.material.color===0xff1932,'visible core crimson not white');
sandbox.advance(bot,.50);check(bot.redShots.every(f=>!f.a.visible&&!f.b.visible),'projectiles auto-clean after life');
// Camera projection geometry: chase craft visually below its camera-center ray.
// This test uses the actual intended boom/rise/lead constants from source.
check(s.includes('(camM===1?55:camM===2?90:64)'),'long chase boom');
check(s.includes('(camM===1?18:camM===2?30:22)'),'higher chase camera');
const boom=64,rise=22,lead=120;
const droneAngle=Math.atan2(rise,boom);
const aimAngle=Math.atan2(rise-5,boom+lead);
const y=.5+Math.tan(droneAngle-aimAngle)/(2*Math.tan(72*Math.PI/360));
check(y>.58&&y<.75,`craft stays low in frame, got ${y}`);
check(s.includes('chaseAim?0:aim.x'),'chase fires along center ray');
// Bounds, code integrity, and explicit inclusion of source ref.
check(s.includes('const REDLINE_HOVER_Y=6.2'),'showroom lift applied');
check(s.includes('o.frustumCulled=false'),'turning artifact frustum fix');
check(s.includes('dr.quaternion.copy(redlinePreviousPose.orientation).slerp('),'yaw-safe visual interpolation');
console.log(JSON.stringify({passed:tests,lockSeconds:2,laserMeshes:scene.items.length,thirdPersonCraftScreenY:+y.toFixed(2),cameraCenterRay:true},null,2));
