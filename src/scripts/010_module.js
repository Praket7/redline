

/* REDLINE v26 — force-aware visual quadrotor allocation.
 * Visual-only mixer: models four thrust vectors from measured velocity change,
 * lift command and the requested body torques. It NEVER changes flight physics.
 * Coordinates: +X right, -Z forward, +Y up. Front rotor z<0, port x<0.
 */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.REDLINE_THRUST=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
 const rotorTags=['PF','PR','SF','SR'];
 function mix(f={},input={},dt=1/60){
  // Use the actual acceleration from the fixed-step flight model, not a
  // cosmetic tilt based on whether a key is being held down.
  const yaw=f.yaw||0;
  const ax=clamp(f.ax||0,-2000,2000),az=clamp(f.az||0,-2000,2000),ay=clamp(f.ay||0,-500,500);
  const forward=-Math.sin(yaw)*ax-Math.cos(yaw)*az;
  const right=Math.cos(yaw)*ax-Math.sin(yaw)*az;
  // The world uses arcade units; 260 u/s² is our apparent hover thrust scale.
  // -X nacelle tilt -> reaction force towards -Z (forward).
  const forwardTilt=clamp(-Math.atan2(forward,320),-.43,.43);
  const sideTilt=clamp(-Math.atan2(right,320),-.40,.40);
  const steer=clamp(input.steer||0,-1,1);
  const yawAccel=clamp((f.yawAccel||0)/11,-1,1);
  const yawRate=clamp((f.turnRate||0)/2.8,-1,1);
  const bank=clamp(f.roll||0,-.82,.82),bankMotion=clamp(f.bankVelocity||0,-3,3);
  const rollDemand=clamp(-bank*.16+bankMotion*.09,-.27,.27);
  const pitchDemand=clamp((f.pitch||0)*-.15,-.13,.13);
  const yawDemand=clamp(yawAccel*.21+yawRate*.08,-.27,.27);
  const lift=clamp(input.lift||0,-1,1);
  const drive=clamp(input.throttle||0,-1,1);
  const boost=!!f.boosting;
  const brake=!!input.brake;
  // Collective hover always remains active. A lift climb demands more work
  // from all four nacelles, and braking reduces the forward vector.
  const collective=clamp(.61+Math.max(0,lift)*.27+Math.max(0,ay)*.0006+
   Math.max(0,drive)*.11+(boost?.19:0)-(brake?.08:0),.28,1.28);
  const output={forwardAccel:forward,sideAccel:right,forwardTilt,sideTilt,collective,rotors:{}};
  for(const tag of rotorTags){
   const side=tag[0]==='P'?-1:1;
   const front=tag[1]==='F'?-1:1;
   // Opposite-spinning diagonal rotor pairs supply yaw moment. Fore/aft
   // and left/right differentials contribute pitch and roll authority.
   const spin=side*front;
   const thrust=clamp(collective+side*rollDemand+front*pitchDemand+
    spin*yawDemand,.19,1.48);
   // Each vector is allowed its own trim. Coordinated turning is visually
   // distinct from a banked hull with four permanently vertical flames.
   const tiltX=clamp(forwardTilt+side*yawDemand*.24+front*pitchDemand*.20,-.49,.49);
   const tiltZ=clamp(sideTilt+front*yawDemand*.28+side*rollDemand*.17,-.46,.46);
   output.rotors[tag]={tag,side,front,thrust,tiltX,tiltZ,spin};
  }
  return output;
 }
 return {mix,rotorTags,clamp};
});


