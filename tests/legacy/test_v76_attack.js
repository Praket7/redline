const assert=require('assert');
class V { constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z} clone(){return new V(this.x,this.y,this.z)} add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this} sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this} addScaledVector(v,t){this.x+=v.x*t;this.y+=v.y*t;this.z+=v.z*t;return this} set(x,y,z){this.x=x;this.y=y;this.z=z;return this} copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this} dot(v){return this.x*v.x+this.y*v.y+this.z*v.z} lengthSq(){return this.dot(this)} length(){return Math.sqrt(this.lengthSq())} distanceTo(v){return this.clone().sub(v).length()} normalize(){const n=this.length()||1;this.x/=n;this.y/=n;this.z/=n;return this}}
const THREE={Vector3:V};
const window={REDLINE_BOT_COMBAT_STATUS:{shots:0,playerShots:0,hits:0,blocked:0,evaded:0,shielded:0,lastResult:'none'}};
const st={p:new V(125,0,0)};
const FL={vx:260,vy:0,vz:0};
const CLASH={shieldT:0};let time=2.0,wall=false,broken=0, emitted=0;
function laserWorldHit(from,dir,len){return wall?{point:from.clone().addScaledVector(dir,Math.min(32,len))}:null}
function clashBotEmitRedLasers(b,point){assert(point instanceof V);emitted++;}
function redlineLaserBreakup(label){broken++;return true;}
function clashGain(){}
const REDLINE_DESTRUCTION={DEBRIS_TIME:1,create:()=>({explode(){}})},S={};
const REDLINE_RIVAL_HITSCAN=(()=>{
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function closestDistance(a,b,p){
  const v=b.clone().sub(a),w=p.clone().sub(a),denom=v.lengthSq();
  const t=denom>1e-8?clamp(w.dot(v)/denom,0,1):0;
  return p.distanceTo(a.clone().addScaledVector(v,t));
 }
 function predict(from,target,velocity,boltSpeed=1250){
  const flight=clamp(from.distanceTo(target)/boltSpeed,0,.26);
  return {point:target.clone().addScaledVector(velocity,flight*.55),flight};
 }
 return Object.freeze({closestDistance,predict,hits:(a,b,p,radius)=>closestDistance(a,b,p)<=radius});
})();

function fireAtPlayer(b){
     b.burstT=.32;
     b.mesh.updateMatrixWorld(true);
     const from=b.mesh.localToWorld(new THREE.Vector3(0,.7,-2.9));
     const playerShot=!b.targetBot;
     const target=b.targetBot;
     const playerCenter=st.p.clone().add(new THREE.Vector3(0,.7,0));
     const current=playerShot?playerCenter:target.mesh.position.clone();
     const velocity=playerShot?new THREE.Vector3(FL.vx||0,FL.vy||0,FL.vz||0):new THREE.Vector3();
     const prediction=REDLINE_RIVAL_HITSCAN.predict(from,current,velocity);
     const end=prediction.point.clone();
     if(playerShot){
      // A real evasive change after the warning degrades accuracy; flying
      // straight at full boost no longer makes the pilot magically immune.
      const change=velocity.clone().sub(b.lockVelocity||velocity).length();
      const evasion=Math.min(38,change*.092);
      const jitter=(b.index===0?5.6:b.index===1?3.4:1.8);
      const travel=end.clone().sub(from);travel.y=0;
      if(travel.lengthSq()<.01)travel.set(0,0,-1);
      travel.normalize();
      const lateral=new THREE.Vector3(-travel.z,0,travel.x);
      end.addScaledVector(lateral,Math.sin(time*11.3+b.index*3.1)*jitter
        +Math.sin(time*3.7+b.index)*evasion);
      end.y+=Math.cos(time*7.1+b.index*1.4)*jitter*.45;
     }
     const delta=end.clone().sub(from),length=delta.length();
     // Raycast from the actual muzzle, respecting the canyon world collider.
     const blocked=length>1?laserWorldHit(from,delta.normalize(),Math.max(0,length-5)):null;
     clashBotEmitRedLasers(b,blocked?.point||end);
     b.lockPoint.copy(blocked?.point||end);
     const diag=window.REDLINE_BOT_COMBAT_STATUS;
     diag.shots++;diag.lastAttacker=b.label;
     if(playerShot)diag.playerShots++;
     if(blocked){diag.blocked++;diag.lastResult='terrain-blocked';}
     else if(playerShot){
      const radius=17;
      const intercepted=REDLINE_RIVAL_HITSCAN.hits(from,end,prediction.point,radius);
      if(!intercepted){diag.evaded++;diag.lastResult='evaded';clashGain(2,'LASER EVADED',false);}
      else if(CLASH.shieldT>0){diag.shielded++;diag.lastResult='shielded';}
      else if(redlineLaserBreakup(b.label)){diag.hits++;diag.lastResult='hit';}
      else {diag.lastResult='invulnerable';}
     }else if(target&&target.mesh.position.distanceTo(end)<17&&target.shieldT<=0&&!target.respawnT){
      target.stunT=Math.max(target.stunT,1.3);
      target.respawnT=REDLINE_DESTRUCTION.DEBRIS_TIME+.18;target.velocity=0;
      if(!target.debris)target.debris=REDLINE_DESTRUCTION.create(THREE,S);
      target.debris.explode(target.mesh.position,new THREE.Vector3());
      diag.lastResult='rival-hit';
     }
     b.targetBot=null;
}
function rival(index=1, v=new V(260,0,0)){return {label:'APEX',index,lockVelocity:v.clone(),lockPoint:st.p.clone(),targetBot:null,mesh:{position:new V(0,0,0),updateMatrixWorld(){},localToWorld(p){return this.position.clone().addScaledVector(p,1)}}};}
const h=REDLINE_RIVAL_HITSCAN;
assert.strictEqual(h.closestDistance(new V(0,0,0),new V(10,0,0),new V(5,3,0)),3);
const vv=new V(4,0,0),aa=new V(0,0,0);h.closestDistance(aa,new V(10,0,0),vv);assert.strictEqual(aa.x,0,'closestDistance must be pure');
const predicted=h.predict(new V(0,0,0),new V(100,0,0),new V(200,0,0));assert(predicted.point.x>100 && predicted.point.x<130);
// Straight-line high-speed travel must be vulnerable; previous v75 frozen-point logic missed it.
let b=rival(1);fireAtPlayer(b);assert.equal(window.REDLINE_BOT_COMBAT_STATUS.hits,1);assert.equal(broken,1);assert.equal(emitted,1);
// Shield is authoritative even if the solution intersects the player.
CLASH.shieldT=2;b=rival(1);fireAtPlayer(b);assert.equal(window.REDLINE_BOT_COMBAT_STATUS.shielded,1);assert.equal(broken,1);
// Terrain occlusion must protect the player.
CLASH.shieldT=0;wall=true;b=rival(1);fireAtPlayer(b);assert.equal(window.REDLINE_BOT_COMBAT_STATUS.blocked,1);assert.equal(broken,1);wall=false;
// A strong post-warning velocity reversal should dodge the predicted beam.
time=Math.PI/(2*3.7);FL.vx=300;b=rival(0,new V(-300,0,0));fireAtPlayer(b);assert.equal(window.REDLINE_BOT_COMBAT_STATUS.evaded,1);
console.log(JSON.stringify({pass:true,attackOutcomes:window.REDLINE_BOT_COMBAT_STATUS,predictedFlight:predicted.flight}));