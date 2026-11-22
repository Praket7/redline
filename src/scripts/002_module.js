/* REDLINE v48: opt-in touchscreen flight interface.
 * Never injects controls or alters desktop input unless the PRIMARY pointer is coarse.
 * Pointer Events allow independent simultaneous joystick / altitude / bank gestures.
 */
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.REDLINE_MOBILE_CONTROLS=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const ACTIONS=['up','down','bankLeft','bankRight','boost','brake','fire'];
 // Controller math is independent from DOM and can be regression-tested in Node.
 function createState(){
  let active=false,stickId=null,throttle=0,strafe=0;
  const held=new Map(),pointerAction=new Map();
  function stick(x,y,radius=1){
   let ux=x/Math.max(radius,1e-6),uy=y/Math.max(radius,1e-6);
   const radiusNormalized=Math.hypot(ux,uy);
   if(radiusNormalized<0.105){throttle=0;strafe=0;return {x:0,y:0};}
   const magnitude=clamp((radiusNormalized-0.105)/(1-0.105),0,1);
   const normalizer=magnitude/radiusNormalized;
   ux*=normalizer;uy*=normalizer;
   // Y screen coordinates increase DOWN; forward is positive throttle.
   throttle=clamp(-uy,-1,1);strafe=clamp(ux,-1,1);
   return {x:ux,y:uy};
  }
  function press(action,id){
   if(!active||!ACTIONS.includes(action)||pointerAction.has(id))return false;
   pointerAction.set(id,action);held.set(action,(held.get(action)||0)+1);return true;
  }
  function release(id){
   if(!pointerAction.has(id))return false;
   const action=pointerAction.get(id);pointerAction.delete(id);
   const count=(held.get(action)||0)-1;if(count>0)held.set(action,count);else held.delete(action);
   return true;
  }
  function reset(){stickId=null;throttle=0;strafe=0;held.clear();pointerAction.clear();}
  function setActive(next){if(active===!!next)return false;active=!!next;if(!active)reset();return true;}
  function beginStick(id){if(!active||stickId!==null)return false;stickId=id;return true;}
  function moveStick(id,x,y,radius){if(stickId!==id||!active)return null;return stick(x,y,radius);}
  function endStick(id){if(stickId!==id)return false;stickId=null;throttle=0;strafe=0;return true;}
  function snapshot(){
   const read=key=>held.has(key);
   return {
    enabled:active,throttle,strafe,lift:Number(read('up'))-Number(read('down')),
    steer:Number(read('bankRight'))-Number(read('bankLeft')),
    boost:read('boost'),brake:read('brake'),fire:read('fire')
   };
  }
  return {setActive,beginStick,moveStick,endStick,press,release,reset,snapshot,get active(){return active;},get stickId(){return stickId;}};
 }
 const state=createState();
 let mounted=false,available=false,container=null,base=null,knob=null,readoutSpeed=null,readoutAlt=null,lastTelemetry=0;
 const pointers=new Map();
 const rootDocument=root?.document;
 const coarse=()=>!!(root?.matchMedia?.('(pointer: coarse)').matches && (root?.navigator?.maxTouchPoints>0 || 'ontouchstart' in root));
 function updateKnob(pos){
  if(!knob)return;
  const move=pos||{x:0,y:0};const travel=base?base.clientWidth*.305:38;
  knob.style.transform=`translate3d(${(move.x*travel).toFixed(1)}px,${(move.y*travel).toFixed(1)}px,0)`;
  base?.classList.toggle('rl48-engaged',state.stickId!==null);
 }
 function renderAction(action){
  const b=container?.querySelector(`[data-touch-action="${action}"]`);if(!b)return;
  const pressed=[...pointers.values()].some(p=>p.type==='button'&&p.action===action);
  b.classList.toggle('rl48-pressed',!!pressed);
  b.setAttribute('aria-pressed',String(!!pressed));
 }
 function finishPointer(id){
  const pointer=pointers.get(id);if(!pointer)return;
  pointers.delete(id);
  if(pointer.type==='stick'){state.endStick(id);updateKnob(null);}
  else{state.release(id);renderAction(pointer.action);}
 }
 function reset(){state.reset();for(const id of [...pointers.keys()])pointers.delete(id);updateKnob(null);for(const key of ACTIONS)renderAction(key);}
 function setActive(next){
  if(!available)return false;
  const changed=state.setActive(next);
  if(changed&&!next)reset();
  if(container){container.classList.toggle('rl48-active',state.active);container.setAttribute('aria-hidden',String(!state.active));}
  return changed;
 }
 function updateStick(e){
  if(state.stickId!==e.pointerId||!base)return;
  const rect=base.getBoundingClientRect();
  const radius=Math.min(rect.width,rect.height)*.36;
  const pos=state.moveStick(e.pointerId,e.clientX-(rect.left+rect.width*.5),e.clientY-(rect.top+rect.height*.5),radius);
  if(pos)updateKnob(pos);
 }
 function attachHandlers(){
  base.addEventListener('pointerdown',e=>{
   if(!state.active||!state.beginStick(e.pointerId))return;
   e.preventDefault();e.stopPropagation();
   pointers.set(e.pointerId,{type:'stick'});
   try{base.setPointerCapture(e.pointerId);}catch(_e){}
   updateStick(e);
  },{passive:false});
  base.addEventListener('pointermove',e=>{if(state.stickId===e.pointerId){e.preventDefault();updateStick(e);}}, {passive:false});
  base.addEventListener('pointerup',e=>finishPointer(e.pointerId));
  base.addEventListener('pointercancel',e=>finishPointer(e.pointerId));
  base.addEventListener('lostpointercapture',e=>finishPointer(e.pointerId));
  container.querySelectorAll('[data-touch-action]').forEach(button=>{
   const action=button.dataset.touchAction;
   button.addEventListener('pointerdown',e=>{
    if(!state.active||!state.press(action,e.pointerId))return;
    e.preventDefault();e.stopPropagation();
    pointers.set(e.pointerId,{type:'button',action});renderAction(action);
    try{button.setPointerCapture(e.pointerId);}catch(_e){}
   },{passive:false});
   for(const eventName of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(eventName,e=>finishPointer(e.pointerId));
   // Do not allow synthetic clicks on the HUD to trigger game-menu buttons.
   button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});
  });
  // Safari fallback if capture is cancelled or unavailable: release globally.
  rootDocument.addEventListener('pointermove',e=>{if(state.stickId===e.pointerId&&!base?.hasPointerCapture?.(e.pointerId))updateStick(e);}, {passive:false});
  for(const eventName of ['pointerup','pointercancel'])rootDocument.addEventListener(eventName,e=>finishPointer(e.pointerId));
  root?.addEventListener?.('blur',reset);
  root?.addEventListener?.('pagehide',reset);
  root?.addEventListener?.('orientationchange',reset);
  rootDocument?.addEventListener?.('visibilitychange',()=>{if(rootDocument.hidden)reset();});
 }
 function mount(){
  if(mounted||!rootDocument||!coarse())return false;
  mounted=true;available=true;
  rootDocument.body.classList.add('rl48-touch-device');
  container=rootDocument.createElement('aside');
  container.id='rl48TouchControls';
  container.setAttribute('aria-label','Touchscreen flight controls');
  container.setAttribute('aria-hidden','true');
  container.innerHTML=`
    <div class="rl48-touch-left">
      <div class="rl48-thumb-label">DRIVE <span>/ STRAFE</span></div>
      <div class="rl48-joystick" role="application" aria-label="Virtual joystick: drag upward to accelerate, downward to reverse, sideways to strafe, and diagonally to combine movement">
        <span class="rl48-stick-ring"></span><span class="rl48-stick-axis rl48-stick-axis-x"></span><span class="rl48-stick-axis rl48-stick-axis-y"></span>
        <span class="rl48-stick-knob"><span class="rl48-stick-core"></span></span>
      </div>
      <button type="button" class="rl48-quick rl48-brake" data-touch-action="brake" aria-label="Hold air brake" aria-pressed="false">BRAKE <span>▾</span></button>
    </div>
    <div class="rl48-touch-telemetry" aria-label="Current speed and altitude"><div><small>SPEED</small><strong id="rl48MobileSpeed">0</strong><small>U/S</small></div><div><small>ALT</small><strong id="rl48MobileAlt">0</strong><small>M</small></div></div>
    <div class="rl48-touch-right">
      <div class="rl48-thumb-label">FLIGHT <span>/ ATTITUDE</span></div>
      <div class="rl48-action-grid">
        <button type="button" data-touch-action="up" aria-pressed="false" aria-label="Hold to climb"><strong>↑</strong><small>CLIMB</small></button>
        <button type="button" data-touch-action="down" aria-pressed="false" aria-label="Hold to descend"><strong>↓</strong><small>DESCEND</small></button>
        <button type="button" data-touch-action="bankLeft" aria-pressed="false" aria-label="Hold to turn and bank left"><strong>↶</strong><small>BANK LEFT</small></button>
        <button type="button" data-touch-action="bankRight" aria-pressed="false" aria-label="Hold to turn and bank right"><strong>↷</strong><small>BANK RIGHT</small></button>
      </div>
      <div class="rl48-action-bottom">
        <button type="button" class="rl48-quick rl48-boost" data-touch-action="boost" aria-pressed="false">BOOST <span>↗</span></button>
        <button type="button" class="rl48-quick rl48-fire" data-touch-action="fire" aria-pressed="false">FIRE <span>◆</span></button>
      </div>
    </div>`;
  rootDocument.body.appendChild(container);
  base=container.querySelector('.rl48-joystick');knob=container.querySelector('.rl48-stick-knob');
  readoutSpeed=container.querySelector('#rl48MobileSpeed');
  readoutAlt=container.querySelector('#rl48MobileAlt');
  attachHandlers();return true;
 }
 function setTelemetry(speed,altitude){
  if(!available||!state.active)return;
  const now=Date.now();if(now-lastTelemetry<180)return;lastTelemetry=now;
  if(readoutSpeed)readoutSpeed.textContent=String(Math.round(Math.abs(Number(speed)||0)));
  if(readoutAlt)readoutAlt.textContent=String(Math.round(Math.max(0,Number(altitude)||0)));
 }
 function snapshot(){return available?state.snapshot():null;}
 // No desktop DOM, CSS, or event listeners are changed by this module.
 if(rootDocument){if(rootDocument.readyState==='loading')rootDocument.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
 return {get available(){return available;},mount,setActive,snapshot,reset,setTelemetry,createState};
});
