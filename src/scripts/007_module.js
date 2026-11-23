
/* REDLINE v35 — wrap-safe heading-command pointer flight.
 * Pointer movement sets a desired HEADING instead of a fleeting angular
 * velocity. The flight controller catches up smoothly with a velocity-dependent
 * turn radius. A/D remain independent translation, not yaw.
 * Pitch retains its stable angle cap; mouse vertical response is more distinct.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.REDLINE_MOUSE_STICK=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const damp=(x,t,tau,dt)=>x+(t-x)*(1-Math.exp(-dt/Math.max(.001,tau)));
 const normalize=a=>Math.atan2(Math.sin(a),Math.cos(a));
 function create(){return {
  held:false,style:'classic',pendingX:0,pendingY:0,steer:0,command:0,pitch:0,headingTarget:0,lastYaw:0,
  begin(style='classic',heading=0){this.reset();this.held=true;this.style=style==='locked'?'locked':'classic';this.headingTarget=normalize(heading);this.lastYaw=heading;},
  align(heading){this.headingTarget=normalize(heading);this.lastYaw=heading;this.pendingX=0;this.steer=0;},
  feed(x,y){if(!this.held)return;this.pendingX+=clamp(Number(x)||0,-150,150);this.pendingY+=clamp(Number(y)||0,-150,150);},
  step(dt,sensitivity=1,pitchSensitivity=.9,currentYaw=this.lastYaw){
   dt=clamp(Number.isFinite(dt)?dt:1/60,1/240,.06);
   if(!this.held){this.reset();return;}
   const dx=this.pendingX,dy=this.pendingY;this.pendingX=this.pendingY=0;
   const scale=clamp(sensitivity,.25,2.5);
   if(this.style==='locked'){
    // Mouse right => nose right; yaw of this world decreases when turning right.
    // No frame-rate dependence: raw pixels are summed before each simulation step.
    // A boundless target can get >180 degrees ahead of the drone. The
    // shortest-angle controller then chooses the *opposite* direction and
    // reverses a held hard-left/right turn. Keep the command ahead of the
    // actual craft by at most ~83 degrees, preserving the pilot's sign.
    // Work in the craft's local heading frame BEFORE angle normalization.
    const yaw=Number.isFinite(currentYaw)?currentYaw:this.lastYaw;
    const ahead=normalize(this.headingTarget-yaw);
    const maxLead=1.45;
    const requested=clamp(ahead-dx*.0053*scale,-maxLead,maxLead);
    this.headingTarget=normalize(yaw+requested);
    this.lastYaw=yaw;
    // Around 5 degrees per 70 px at default sensitivity, clamped to 13 deg.
    this.pitch=clamp(this.pitch-dy*.00345*clamp(pitchSensitivity,.35,2.5),-.31,.31);
    this.command=0;
    this.steer=0; // headingTarget is the authoritative input in locked mode
   }else{
    const x=clamp(dx*scale/(Math.max(.5,dt*60)*12),-1,1);
    const y=clamp(-dy*scale/(Math.max(.5,dt*60)*19),-1,1);
    this.steer=damp(this.steer,x,Math.abs(x)>.01?.025:.070,dt);
    this.command=damp(this.command,y,Math.abs(y)>.01?.027:.070,dt);
    this.pitch=0;
   }
  },
  level(){this.pitch=0;this.pendingY=0;this.command=0;},
  reset(){this.held=false;this.style='classic';this.pendingX=this.pendingY=this.steer=this.command=this.pitch=this.headingTarget=this.lastYaw=0;}
 };}
 return {create,normalize};
});

