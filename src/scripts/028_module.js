
/* REDLINE v31 — target acquisition state machine, independent of rendering.
 * Deliberate continuous line-of-sight requirement: brief tracking gaps pause,
 * rather than instantly erase, progress. A new opponent resets acquisition.
 */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.REDLINE_TARGET_LOCK=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
 function create(duration=5.5){
  return {
   duration:Math.max(1,duration),id:null,elapsed:0,grace:0,cooldown:0,ready:false,target:null,
   reset(){this.id=null;this.elapsed=0;this.grace=0;this.ready=false;this.target=null;},
   fire(){this.reset();this.cooldown=.65;},
   step(dt,candidate){
    dt=clamp(dt,0,.1);this.cooldown=Math.max(0,this.cooldown-dt);
    if(this.cooldown>0){this.reset();return this.snapshot();}
    if(!candidate){
     this.grace=Math.max(0,this.grace-dt);
     if(this.grace<=0)this.reset();
     return this.snapshot();
    }
    if(this.id!==candidate.id){this.reset();this.id=candidate.id;}
    this.target=candidate.target;
    this.grace=.42;
    this.elapsed=Math.min(this.duration,this.elapsed+dt);
    this.ready=this.elapsed>=this.duration-.00001;
    return this.snapshot();
   },
   snapshot(){return {id:this.id,elapsed:this.elapsed,progress:clamp(this.elapsed/this.duration,0,1),ready:this.ready,cooldown:this.cooldown,grace:this.grace};}
  };
 }
 return {create};
});

