
/* REDLINE 27.6: explicit digital translation controls.
   A/D control local right/left translation independent of yaw and throttle.
   Keep the key state separate from remappable shortcuts and mouse steering.
*/
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.REDLINE_MOVE_KEYS=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const CODES=new Set(['KeyW','KeyA','KeyS','KeyD']);
 const FALLBACK={w:'KeyW',a:'KeyA',s:'KeyS',d:'KeyD'};
 const normalize=(code,key)=>CODES.has(code)?code:(FALLBACK[String(key||'').toLowerCase()]||null);
 function create(){
  const down=new Set();
  return {
   press(code,key){const c=normalize(code,key);if(!c)return false;down.add(c);return true;},
   release(code,key){const c=normalize(code,key);if(!c)return false;down.delete(c);return true;},
   clear(){down.clear();},
   isDown(code){return down.has(code);},
   vector(){return {throttle:Number(down.has('KeyW'))-Number(down.has('KeyS')),strafe:Number(down.has('KeyD'))-Number(down.has('KeyA'))};}
  };
 }
 return {create,normalize};
});

