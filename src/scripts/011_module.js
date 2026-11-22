

/* REDLINE v26 — accessible HUD profiles, separate from gameplay.
 * Cinematic is intentionally speedometer-only in Chase and cockpit-only in FPV.
 * Race keeps lap/map, and Tactical restores the existing full interface.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.REDLINE_HUD=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const modes=['cinematic','race','tactical'];
 const labels={cinematic:'CINEMATIC · SPEEDOMETER ONLY',race:'RACE · CLEAN TIMING',tactical:'TACTICAL · ALL DATA'};
 function valid(mode){return modes.includes(mode)?mode:'cinematic';}
 function next(mode){return modes[(modes.indexOf(valid(mode))+1)%modes.length];}
 function apply(body,mode){const value=valid(mode);for(const m of modes)body.classList.toggle('rl-hud-'+m,m===value);return value;}
 return {modes,labels,valid,next,apply};
});


