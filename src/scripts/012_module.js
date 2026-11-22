

/* REDLINE v21 — remappable gameplay controls, browser/localStorage compatible.
 * W/A/S/D are always locked; Escape is the browser's pointer/unlock safety key.
 * Key conflicts are rejected, never silently swapped.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.REDLINE_BINDINGS=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';
 const STORAGE='redline_v21_keybindings';
 const DEFINITIONS=[
  {id:'climb',label:'Climb',group:'FLIGHT',main:'ArrowUp',alt:null},
  {id:'descend',label:'Descend',group:'FLIGHT',main:'ArrowDown',alt:null},
  {id:'boost',label:'Afterburner',group:'FLIGHT',main:'ShiftLeft',alt:'ShiftRight'},
  {id:'brake',label:'Air brake',group:'FLIGHT',main:'Space',alt:null},
  {id:'fire',label:'Fire lasers',group:'COMBAT',main:'KeyE',alt:'KeyF'},
  {id:'flowBoost',label:'Flow → boost',group:'COMBAT',main:'KeyB',alt:null},
  {id:'shield',label:'Energy shield',group:'COMBAT',main:'KeyJ',alt:null},
  {id:'emp',label:'EMP pulse',group:'COMBAT',main:'KeyH',alt:null},
  {id:'reload',label:'Recharge lasers',group:'COMBAT',main:'KeyZ',alt:null},
  {id:'recover',label:'Recover at checkpoint',group:'CAMERA & RACE',main:'KeyR',alt:null},
  {id:'view',label:'Toggle chase / FPV',group:'CAMERA & RACE',main:'KeyP',alt:null},
  {id:'cameraZoom',label:'Chase zoom',group:'CAMERA & RACE',main:'KeyC',alt:null},
  {id:'level',label:'Level flight pitch',group:'CAMERA & RACE',main:'KeyX',alt:null},
  {id:'center',label:'Center target reticle',group:'CAMERA & RACE',main:'Tab',alt:null},
  {id:'uiCursor',label:'UI cursor while aiming',group:'CAMERA & RACE',main:'KeyU',alt:null},
  {id:'restart',label:'Restart lap',group:'CAMERA & RACE',main:'Backspace',alt:null},
  {id:'ghost',label:'Toggle ghost',group:'CAMERA & RACE',main:'KeyG',alt:null},
  {id:'handling',label:'Easy / Sport / Expert',group:'PREFERENCES',main:'KeyV',alt:null},
  {id:'settings',label:'Open settings',group:'PREFERENCES',main:'KeyI',alt:null},
  {id:'hud',label:'Cycle HUD: Cinematic / Race / Tactical',group:'PREFERENCES',main:'KeyY',alt:null},
  {id:'mute',label:'Mute audio',group:'PREFERENCES',main:'KeyM',alt:null},
  {id:'time',label:'Time of day',group:'PREFERENCES',main:'KeyT',alt:null},
  {id:'livery',label:'Cycle drone finish',group:'PREFERENCES',main:'KeyL',alt:null},
  {id:'handlingLab',label:'Handling lab',group:'DEVELOPER',main:'F6',alt:null},
  {id:'stats',label:'Performance stats',group:'DEVELOPER',main:'F3',alt:null},
  {id:'shadows',label:'Shadow diagnostic',group:'DEVELOPER',main:'F9',alt:null},
  {id:'screenshot',label:'Capture frame',group:'DEVELOPER',main:'F8',alt:null}
 ];
 const reserved=new Set(['KeyW','KeyA','KeyS','KeyD','Escape','MetaLeft','MetaRight','ControlLeft','ControlRight','AltLeft','AltRight','F5','F11','F12']);
 const codes=/^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|F(?:[1-9]|10)|Arrow(?:Up|Down|Left|Right)|Shift(?:Left|Right)|Space|Tab|Backspace|Enter|Delete|Home|End|PageUp|PageDown|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Slash|Backquote|CapsLock)$/;
 const cloneDefaults=()=>Object.fromEntries(DEFINITIONS.map(d=>[d.id,{main:d.main,alt:d.alt}]));
 let bindings=cloneDefaults();let capture=null;let listeners=[];
 function validateMap(next){
  const used=new Map();
  for(const d of DEFINITIONS){
   const entry=next[d.id];if(!entry||!entry.main)return false;
   for(const slot of ['main','alt']){
    const code=entry[slot];if(!code)continue;
    if(!isAllowed(code)||used.has(code))return false;
    used.set(code,d.id);
   }
  }
  return true;
 }
 function isAllowed(code){return typeof code==='string'&&codes.test(code)&&!reserved.has(code);}
 try{
  const raw=root.localStorage?.getItem(STORAGE);
  if(raw){const parsed=JSON.parse(raw),candidate=cloneDefaults();
   for(const d of DEFINITIONS){
    if(!parsed[d.id]||['climb','descend','fire'].includes(d.id))continue;
    candidate[d.id]={main:parsed[d.id].main,alt:parsed[d.id].alt??null};
   }
   // v31 reserves E for primary fire, retaining F as the second fire key.
   // Altitude keys move to arrows; Q and E no longer control vertical movement.
   if(validateMap(candidate))bindings=candidate;
  }
 }catch(_e){}
 const persist=()=>{try{root.localStorage?.setItem(STORAGE,JSON.stringify(bindings));}catch(_e){}};
 function get(id){const b=bindings[id];return b?{...b}:null;}
 function label(code){
  if(!code)return '—';
  const names={Space:'SPACE',Tab:'TAB',Backspace:'BACKSPACE',Enter:'ENTER',Delete:'DEL',ShiftLeft:'L SHIFT',ShiftRight:'R SHIFT',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',BracketLeft:'[',BracketRight:']',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',Backslash:'\\',Minus:'-',Equal:'=',Backquote:'`'};
  if(names[code])return names[code];
  if(code.startsWith('Key'))return code.slice(3);
  if(code.startsWith('Digit'))return code.slice(5);
  if(code.startsWith('Numpad'))return 'NUM '+code.slice(6);
  return code.toUpperCase();
 }
 function display(id){const b=bindings[id];return b?[b.main,b.alt].filter(Boolean).map(label).join(' / '):'—';}
 function isActionCode(code,id){const b=bindings[id];return !!b&&(code===b.main||code===b.alt);}
 function actionFor(code){for(const d of DEFINITIONS)if(isActionCode(code,d.id))return d.id;return null;}
 function isDown(pressed,id){const b=bindings[id];return !!b&&!!(pressed[b.main]||(b.alt&&pressed[b.alt]));}
 function assign(id,slot,code){
  const d=DEFINITIONS.find(x=>x.id===id);
  if(!d||!['main','alt'].includes(slot))return {ok:false,message:'Unknown key binding.'};
  if(!code&&slot==='main')return {ok:false,message:'A primary key is required.'};
  if(code&&!isAllowed(code))return {ok:false,message:'That key is reserved by WASD or your browser. Try another.'};
  for(const other of DEFINITIONS)for(const s of ['main','alt']){
   if(other.id===id&&s===slot)continue;
   if(code&&bindings[other.id][s]===code)return {ok:false,message:label(code)+' is already assigned to '+other.label+'.'};
  }
  bindings[id][slot]=code||null;persist();notify();return {ok:true,message:d.label+' is now '+display(id)+'.'};
 }
 function reset(){bindings=cloneDefaults();persist();notify();return {ok:true,message:'Default controls restored.'};}
 function markup(){
  const groups=[...new Set(DEFINITIONS.map(d=>d.group))];
  return `<section class="rl-bind-panel" aria-label="Custom keyboard shortcuts">
   <div class="rl-bind-heading"><div><h3>KEYBINDINGS</h3><p>W/S drive forward and backward; A/D strafe. Move the locked mouse to steer or pitch; arrow keys provide vertical override. Select a key, then press its replacement. Changes save automatically.</p></div><button type="button" class="rl-bind-reset" data-key-reset="1">RESET ALL</button></div>
   <div class="rl-bind-locked"><span>LOCKED FLIGHT CONTROLS</span><b>W / A / S / D</b></div>
   ${groups.map(g=>`<h4 class="rl-bind-group">${g}</h4>`+DEFINITIONS.filter(d=>d.group===g).map(d=>`<div class="rl-bind-row"><span>${d.label}</span><div><button type="button" data-bind="${d.id}" data-slot="main" aria-label="Rebind ${d.label} primary key">${label(bindings[d.id].main)}</button><button type="button" data-bind="${d.id}" data-slot="alt" aria-label="Rebind ${d.label} alternative key">${label(bindings[d.id].alt)}</button></div></div>`).join('')).join('')}
   <p class="rl-bind-help">ESC cancels rebinding. While editing an alternative, DELETE clears it. Double-click or E fires lasers; F is an alternative. Escape releases the mouse.</p>
   <div class="rl-bind-status" role="status" aria-live="polite">Choose any key to customize its action.</div>
  </section>`;
 }
 function mount(parent){
  if(!parent)return;
  if(!parent.querySelector('.rl-bind-panel')){
   const shell=document.createElement('div');shell.innerHTML=markup();const panel=shell.firstElementChild;
   const footer=parent.querySelector('.rl-btnrow');if(footer&&footer.parentElement===parent)parent.insertBefore(panel,footer);else parent.appendChild(panel);
   panel.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.hasAttribute('data-key-reset')){reset();return;}
    if(!button.dataset.bind)return;
    capture={id:button.dataset.bind,slot:button.dataset.slot};updateControls();
   });
  }
  updateControls();
 }
 function updateControls(){
  if(typeof document==='undefined')return;
  for(const panel of document.querySelectorAll('.rl-bind-panel')){
   for(const b of panel.querySelectorAll('button[data-bind]')){
    const {bind,slot}=b.dataset;
    b.textContent=capture?.id===bind&&capture.slot===slot?'PRESS KEY…':label(bindings[bind][slot]);
    b.classList.toggle('rl-bind-waiting',capture?.id===bind&&capture.slot===slot);
   }
   const status=panel.querySelector('.rl-bind-status');if(status){status.textContent=capture?'Press a key for '+DEFINITIONS.find(d=>d.id===capture.id).label+' (ESC to cancel).':'Assignments save automatically. WASD cannot be changed.';}
  }
  const pair=document.querySelector('#rlRaceControlsPanel .rl-control-grid-live');
  if(pair)pair.innerHTML=manualHTML('race');
  const mapping={refuel:'flowBoost',shield:'shield',pulse:'emp',reload:'reload'};
  for(const [f,a]of Object.entries(mapping))for(const b of document.querySelectorAll(`[data-flow-action="${f}"]`)){
   const key=b.querySelector('.key');if(key)key.textContent=label(bindings[a].main);
   b.title=display(a)+' · '+(b.querySelector('.label')?.textContent||'').trim();
  }
  for(const b of document.querySelectorAll('[data-op="camera"]'))b.title=display('view')+' · Switch chase / FPV';
 }
 function manualHTML(type){
  const list=[['W / S','Forward / reverse'],['A / D','Strafe left / right'],...DEFINITIONS.filter(d=>d.group!=='DEVELOPER').map(d=>[display(d.id),d.label]),['MOUSE','Move freely: steer / pitch (locked by default)'],['DOUBLE-CLICK','Fire laser (double-tap recaptures after Esc)'],['ESC','Release mouse / close panel']];
  return list.map(([key,desc])=>type==='race'?`<div class="rl-control-pair"><span>${desc}</span><strong>${key}</strong></div>`:`<div class="rl-control-row"><span>${desc}</span><kbd class="rl-key">${key}</kbd></div>`).join('');
 }
 function showMessage(message,error){
  if(typeof document==='undefined')return;
  for(const el of document.querySelectorAll('.rl-bind-status')){el.textContent=message;el.style.color=error?'#ff5968':'#9df2cc';}
 }
 function notify(){for(const cb of listeners)try{cb();}catch(_e){} updateControls();}
 function onChange(cb){listeners.push(cb);return ()=>listeners=listeners.filter(x=>x!==cb);}
 function captured(){return !!capture;}
 function cancelCapture(){if(capture){capture=null;updateControls();}}
 function keydownCapture(e){
  if(!capture)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(e.code==='Escape'){capture=null;updateControls();showMessage('Key assignment canceled.',false);return;}
  const pending=capture;
  const chosen=e.code==='Delete'&&pending.slot==='alt'?null:e.code;
  const result=assign(pending.id,pending.slot,chosen);
  if(result.ok)capture=null;
  updateControls();showMessage(result.message,!result.ok);
 }
 if(root.addEventListener)root.addEventListener('keydown',keydownCapture,true);
 return {DEFINITIONS,STORAGE,get,label,display,isAllowed,validateMap,isActionCode,actionFor,isDown,assign,reset,mount,manualHTML,updateControls,isCapturing:captured,cancelCapture,onChange};
});


