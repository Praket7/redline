

/* Chase camera damping isolated from rendering and Three.js. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  if(root)root.REDLINE_CAMERA_RIG=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const mix=(a,b,t)=>a+(b-a)*t;
 function advance(actual,wanted,delta,tau){
   const alpha=1-Math.exp(-Math.max(0,delta)/Math.max(.005,tau));
   return mix(actual,wanted,alpha);
 }
 function follow(position,target,anchor,dt,cfg,opts={}){
   const isFirstPerson=!!opts.firstPerson;
   const snap=!!opts.snap||isFirstPerson||!Number.isFinite(position.x)||
     Math.hypot(position.x-target.x,position.y-target.y,position.z-target.z)>125;
   if(snap){position.x=target.x;position.y=target.y;position.z=target.z;return true;}
   const nowDist=Math.hypot(position.x-anchor.x,position.y-anchor.y,position.z-anchor.z);
   const targetDist=Math.hypot(target.x-anchor.x,target.y-anchor.y,target.z-anchor.z);
   const tau=targetDist<nowDist-3?cfg.cameraRecover:cfg.cameraFollow;
   position.x=advance(position.x,target.x,dt,tau);
   position.y=advance(position.y,target.y,dt,cfg.cameraVertical);
   position.z=advance(position.z,target.z,dt,tau);
   return false;
 }
 return {advance,follow};
});


