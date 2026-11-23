const assert=require('assert');
class V{constructor(x=0,y=0,z=0){this.set(x,y,z)}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}clone(){return new V(this.x,this.y,this.z)}}
class Scale{constructor(n=1){this.n=n}copy(other){this.n=other.n;return this}multiplyScalar(n){this.n*=n;return this}clone(){return new Scale(this.n)}}
const rl46Clamp=v=>Math.max(0,Math.min(1,v));
const rl46Ease=v=>{const t=rl46Clamp(v);return t*t*(3-2*t)};
let elapsed=0,displayYaw=.45,garageRevealPose=null;
const model={position:new V(),rotation:new V(),scale:new Scale(1)};
const craft={position:new V(),rotation:new V(),scale:new Scale(1)};
const showroomHomeY=c=>c===craft?7.1:6.8;
function showroomSelectionArrival(t,craft,baseScale){
   // The previous craft has completely departed before the incoming appears.
   // Absolute poses make the animation independent of frame rate.
   const u=rl46Ease((t-.66)/.98),away=1-u;
   craft.position.set(5+5.2*away,showroomHomeY(craft)+1.2*away,4+39*away);
   craft.rotation.set(-.12*away,.50*away+displayYaw*u,.18*away);
   craft.scale.copy(baseScale).multiplyScalar(.69+.31*u);
  }
  
function showroomFlightIn(t){
   const u=rl46Ease(t/2.65),away=1-u;
   model.position.set(5+5*away,showroomHomeY(model)+1.1*away,4+36*away);
   model.rotation.set(-.10*away,.50*away,-.19*away);
  }
  
function showroomGarageReveal(t){
   const u=rl46Ease(t/1.45),away=1-u,arc=Math.sin(Math.PI*u);
   const p=garageRevealPose?.p,r=garageRevealPose?.r;
   model.position.set(5+(p?(p.x-5):4.5)*away+2.35*arc,
    showroomHomeY(model)+(p?(p.y-showroomHomeY(model)):1.2)*away+.62*arc,
    4+(p?(p.z-4):22)*away-3.5*arc);
   model.rotation.set((r?r.x:-.10)*away-.10*arc,
    (r?r.y:.55)*away+displayYaw*u+.22*arc,
    (r?r.z:.16)*away+.15*arc);
  }
  
const eq=(a,b,eps=1e-7)=>assert(Math.abs(a-b)<eps,`expected ${a} ≈ ${b}`);
// Three separate animation endpoints must agree with the same stationary pose.
showroomFlightIn(2.65);eq(model.position.x,5);eq(model.position.y,6.8);eq(model.position.z,4);
garageRevealPose={p:new V(9,8,15),r:new V(.2,.4,.1)};
showroomGarageReveal(1.45);eq(model.position.x,5);eq(model.position.y,6.8);eq(model.position.z,4);eq(model.rotation.y,displayYaw);
showroomSelectionArrival(1.64,craft,new Scale(1.93));eq(craft.position.x,5);eq(craft.position.y,7.1);eq(craft.position.z,4);eq(craft.scale.n,1.93);eq(craft.rotation.y,displayYaw);
// Near an arrival/reveal boundary, there must be no discontinuous upward jump.
showroomGarageReveal(1.448);const before=model.position.clone();showroomGarageReveal(1.452);const after=model.position.clone();assert(Math.abs(after.y-before.y)<.05);
const breatheAfter=t=>{const landedFor=Math.max(0,t-1.45);return .10*Math.sin(landedFor*1.3)*rl46Ease(landedFor/.85)};
eq(breatheAfter(1.45),0);assert(Math.abs(breatheAfter(1.451))<.0001);
console.log('PASS fly-in / garage reveal / model swap continuity and hover transition');