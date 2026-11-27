/* REDLINE v145 ONE-WORLD client.
 * Every online ship comes from the SAME persistent authoritative World.
 * This client never submits positions, never simulates online collisions and
 * never asserts hits, checkpoint progress or race finishes.
 */
function createRedlineSharedWorld(){
 const state={enabled:false,racing:false,connected:false,world:null,course:null,id:null,host:false,
   ws:null,token:null,seq:0,tick:-1,startTick:null,snapshots:[],members:[],currentSelf:null,
   eventsSeen:new Set(),beams:[],pending:{fire:false,emp:false,shield:false},nextSend:0,
   lastSeen:0,lastTickWall:0, status:'OFFLINE',resumeAttempts:0, reconnectTimer:null,
   socketGeneration:0, remote:null, lastHud:0, finishing:false};
 const limit=(n,a,b)=>Math.max(a,Math.min(b,n));
 const angles=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
 const cfg=()=>typeof window.REDLINE_AUTHORITY_WSS==='string'?window.REDLINE_AUTHORITY_WSS.trim():'';
 const saveKey='redline_v145_gateway_reconnect';
 let outcomeShown=false;
 const validURL=()=>{
   const url=cfg(); if(!url)throw Error('Single-world server not configured. Deploy the persistent authority and set REDLINE_AUTHORITY_WSS in authority-config.js.');
   const p=new URL(url,location.href);
   if(p.protocol!=='wss:'&&!(p.protocol==='ws:'&&['localhost','127.0.0.1'].includes(p.hostname)))throw Error('A public multiplayer server must use WSS.');
   if(!/\/ws\/?$/.test(p.pathname))throw Error('The authority endpoint must end with /ws.');
   return p.toString();
 };
 const send=(op,extra={})=>{
   if(!state.ws||state.ws.readyState!==WebSocket.OPEN||state.ws.bufferedAmount>64000)return false;
   state.ws.send(JSON.stringify({op,...extra}));return true;
 };
 const gameNow=()=>performance.now();
 const showStatus=()=>state.connected?'ONE SHARED WORLD · '+state.members.filter(p=>p.connected).length+' PILOTS':'SHARED SERVER · '+state.status;
 function disconnect(){
   state.socketGeneration++;clearTimeout(state.reconnectTimer);state.reconnectTimer=null;
   const ws=state.ws;state.ws=null;state.connected=false;state.status='OFFLINE';
   if(ws){ws.onclose=ws.onerror=ws.onmessage=ws.onopen=null;ws.close();}
 }
 async function connect(credentials,view,name,model){
   const url=validURL();
   const resuming=state.enabled&&state.racing&&state.id===credentials.id;
   disconnect();state.enabled=true;if(!resuming){state.racing=false;state.world=null;state.snapshots=[];state.eventsSeen.clear();state.tick=-1;outcomeShown=false;}state.course=view.course==='iron'?'iron':'grand';
   if(!resuming)state.members=[];state.id=credentials.id;state.roomStart=view.started_at||state.roomStart||null;
   state.pending={fire:false,emp:false,shield:false};if(!resuming)state.finishing=false;
   const gen=state.socketGeneration;
   let persisted=null;try{persisted=JSON.parse(sessionStorage.getItem(saveKey)||'null');}catch{}
   const token=persisted?.room===credentials.code&&persisted?.id===credentials.id?persisted.token:null;
   await new Promise((resolve,reject)=>{
     const ws=new WebSocket(url);state.ws=ws;
     const timer=setTimeout(()=>{if(ws.readyState!==WebSocket.CLOSED)ws.close();reject(Error('Shared-world gateway handshake timed out'));},9000);
     let joined=false;
     ws.onopen=()=>ws.send(JSON.stringify({op:'join',room:credentials.code,course:state.course,
       id:credentials.id,secret:credentials.secret,model,name,token}));
     ws.onmessage=e=>{
       let m;try{m=JSON.parse(e.data);}catch{return;}
       if(m.type==='error'){
         state.status='REJECTED';if(!joined){clearTimeout(timer);reject(Error(m.message||'Gateway rejected membership'));}else console.warn('[ONE WORLD]',m.message);return;
       }
       if(m.type==='joined'){
         if(m.protocol!==145||m.id!==credentials.id||m.course!==state.course){clearTimeout(timer);reject(Error('Authority protocol/identity mismatch'));ws.close();return;}
         if(resuming&&state.world!==m.world){clearTimeout(timer);reject(Error('Authority world changed during reconnect. Rejoin a new race; cannot merge two worlds.'));ws.close();return;}
         state.id=m.id;state.host=m.host;state.world=m.world;state.seq=m.ack||0;
         state.connected=true;state.status='CONNECTED';state.lastSeen=gameNow();joined=true;
         try{sessionStorage.setItem(saveKey,JSON.stringify({room:credentials.code,id:m.id,token:m.token}));}catch{}
         clearTimeout(timer);resolve();return;
       }
       if(m.type==='snapshot')onSnapshot(m);
     };
     ws.onerror=()=>{if(!joined){clearTimeout(timer);reject(Error('Cannot reach shared-world server'));}};
     ws.onclose=()=>{
       if(!joined){clearTimeout(timer);reject(Error('Shared-world connection closed'));return;}
       if(gen!==state.socketGeneration)return;
       state.connected=false;state.status='RECONNECTING';
       // Stop showing old movement after an outage. Keep last authoritative scene frozen.
       reconnect(credentials,view,name,model);
     };
   });
   return true;
 }
 function reconnect(credentials,view,name,model){
   if(!state.enabled||state.resumeAttempts>=8){state.status='RECONNECT FAILED';return;}
   clearTimeout(state.reconnectTimer);
   const delay=Math.min(6500,750*Math.pow(1.5,state.resumeAttempts++));
   state.reconnectTimer=setTimeout(()=>{
     if(!state.enabled)return;
     connect(credentials,view,name,model).then(()=>{state.resumeAttempts=0;})
       .catch(err=>{console.warn('[ONE WORLD] reconnect',err.message);state.connected=false;state.status='RECONNECTING';reconnect(credentials,view,name,model);});
   },delay);
 }
 function resultsOverlay(msg){
   if(outcomeShown||!state.racing)return;
   const mine=msg.players.find(p=>p.id===state.id);
   if(mine?.finished==null||!Number.isFinite(mine.finished))return;
   outcomeShown=true;state.finishing=true;mode='done';
   const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   const rows=msg.players.slice().sort((a,b)=>(a.finished??Infinity)-(b.finished??Infinity));
   const rank=rows.findIndex(p=>p.id===state.id)+1;
   const overlay=document.createElement('section');overlay.id='rl145AuthoritativeResults';
   overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Server-verified race results');
   overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(5,8,14,.95);color:#eef4fa;display:grid;place-items:center;font:15px system-ui,sans-serif;';
   const panel=document.createElement('div');panel.style.cssText='background:#101723;border:1px solid #34404a;border-radius:20px;padding:30px;max-width:540px;width:min(90vw,540px);max-height:85vh;overflow:auto';
   panel.innerHTML='<small style="color:#ff5b6a;letter-spacing:.18em">REDLINE / ONE SHARED WORLD</small><h2 style="font-size:36px;margin:14px 0">FINISH · #'+rank+'</h2><p>Server-verified finish: '+mine.finished.toFixed(3)+' seconds</p><p style="color:#b1beca">All aircraft below raced in one authoritative world. Final results update when remaining pilots finish.</p>'+
     rows.map((p,i)=>'<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #34404a"><span>'+(i+1)+'. '+esc(p.name)+(p.id===state.id?' · YOU':'')+'</span><b>'+(p.finished==null?'RACING':p.finished.toFixed(3)+'s')+'</b></div>').join('')+
     '<button id="rl145Leave" style="margin-top:24px;width:100%;padding:15px;border:0;border-radius:10px;background:#e74756;color:#fff;font-weight:700;cursor:pointer">RETURN TO MULTIPLAYER</button>';
   overlay.append(panel);document.body.append(overlay);
   panel.querySelector('#rl145Leave').addEventListener('click',()=>window.REDLINE_ONLINE.leave().then(()=>{overlay.remove();redlineUI.go('multiplayer');}));
   REDLINE_AUDIO_ENGINE.musicFinish?.();
 }
 function onSnapshot(msg){
   if(!state.connected || msg.world!==state.world||msg.course!==state.course || !Number.isInteger(msg.tick)||msg.tick<=state.tick)return;
   const routeRevision=state.course==='iron'?136:37;
   if(msg.revision!==routeRevision){disconnect();state.status='ROUTE REVISION MISMATCH';return;}
   if(msg.collisionVerified!==true||msg.collisionHash!==window.REDLINE_COLLISION_HASHES?.[state.course]){disconnect();state.status='TERRAIN MESH MISMATCH';return;}
   if(!Array.isArray(msg.players)||msg.players.some(p=>!Array.isArray(p.p)||p.p.length!==3||!p.p.every(Number.isFinite)))return;
   state.tick=msg.tick;state.startTick=msg.startTick;state.lastSeen=state.lastTickWall=gameNow();
   state.currentSelf=msg.players.find(p=>p.id===state.id)||null;
   state.members=msg.players.map(p=>({id:p.id,model:p.model,name:p.name,slot:p.slot+1,
     online:p.connected,connected:p.connected,ready:!!(window.REDLINE_ONLINE?.room?.players||[]).find(x=>x.id===p.id)?.ready,finished_ms:p.finished==null?null:p.finished*1000}));
   state.snapshots.push({at:state.lastSeen,tick:msg.tick,players:msg.players});
   if(state.snapshots.length>14)state.snapshots.shift();
   if(state.remote)for(const p of msg.players){
     if(p.id===state.id)continue;
     state.remote.pose({...p,seq:msg.tick,race:state.roomStart,lap:Math.floor(p.gates/(state.course==='iron'?20:12))+1,
       gate:p.gates%(state.course==='iron'?20:12),progress:p.gates/(state.course==='iron'?20:12)},true,Date.now());
   }
   for(const e of (msg.events||[])){
     if(e.tick<msg.tick-60)continue;
     const key=e.tick+':'+e.type+':'+(e.id||'')+':'+(e.attacker||'');
     if(state.eventsSeen.has(key))continue;
     state.eventsSeen.add(key);
     if(e.type==='laser'&&Array.isArray(e.origin)&&Array.isArray(e.end)){
       const pts=[new THREE.Vector3(...e.origin),new THREE.Vector3(...e.end)];
       const geom=new THREE.BufferGeometry().setFromPoints(pts);
       const line=new THREE.Line(geom,new THREE.LineBasicMaterial({color:0xff3754,depthTest:true,transparent:true,opacity:.95}));
       S.add(line);state.beams.push({line,until:gameNow()+210});
     }
     if(e.type==='hit'&&e.id===state.id){st.shake=Math.max(st.shake,1);redlineUI.notify?.('DIRECT HIT','SERVER-VERIFIED IMPACT','warning');}
     if(e.type==='gate'&&e.id===state.id)REDLINE_AUDIO_ENGINE.play('checkpoint');
     if(e.type==='finish'&&e.id===state.id)state.finishing=true;
   }
   if(state.eventsSeen.size>2000)state.eventsSeen.clear();
   if(msg.startTick!=null&&!state.racing)enterRace();
   resultsOverlay(msg);
 }
 function bindRemote(hooks){state.remote=hooks;}
 // Visual interpolation uses the same world snapshots as every other browser.
 // No independent client physics or position publication occurs.
 function sampled(id){
   const history=state.snapshots;if(!history.length)return null;
   const elapsed=limit((gameNow()-state.lastTickWall)/1000,0,.06);
   const renderTick=state.tick-6+elapsed*60;let a=history[0],b=history.at(-1);
   for(let i=0;i<history.length-1;i++)if(history[i].tick<=renderTick&&history[i+1].tick>=renderTick){a=history[i];b=history[i+1];break;}
   if(renderTick>=history.at(-1).tick)a=b=history.at(-1);
   const p=a.players.find(p=>p.id===id),q=b.players.find(p=>p.id===id);
   if(!p)return q||null;if(!q||a.tick===b.tick)return p;
   const t=limit((renderTick-a.tick)/(b.tick-a.tick),0,1);
   return {...q,p:p.p.map((v,i)=>v+(q.p[i]-v)*t),yaw:angles(p.yaw,q.yaw,t),
     pitch:angles(p.pitch,q.pitch,t),roll:angles(p.roll,q.roll,t),speed:p.speed+(q.speed-p.speed)*t};
 }
 function enterRace(){
   if(state.racing||!state.connected||state.startTick==null||!redlineUI?.ready)return false;
   if(state.course!==REDLINE_WORLD){state.status='COURSE NOT LOADED';return false;}
   state.racing=true;state.finishing=false;
   redlineUI.config.bots=0;REDLINE_S4.clear();reset();redlineSyncAirframe();
   startEngineAudio();mode='count';cd=3.2;raceT=0;lapT=0;
   redlineUI.show('race');redlineUI.updateMouseUnlocked();
   return true;
 }
 function start(){if(!state.connected||!state.host)throw Error('The host must be connected');if(!send('start'))throw Error('Could not send the start command to the authority');}
 function setModel(model){if(state.enabled&&state.connected)send('model',{model});}
 function close(){disconnect();document.getElementById('rl145AuthoritativeResults')?.remove();outcomeShown=false;state.enabled=false;state.racing=false;state.members=[];state.snapshots=[];state.currentSelf=null;
   for(const b of state.beams){S.remove(b.line);b.line.geometry.dispose();b.line.material.dispose();}state.beams=[];}
 function queueAbility(kind){if(kind==='fire'||kind==='shield'||kind==='emp')state.pending[kind]=true;}
 function update(dt){
   if(!state.enabled||!state.racing)return;
   const now=gameNow();
   if(state.connected&&state.startTick!==null&&state.tick>=state.startTick)mode='run';else mode='count';
   const held=redlineUI?.racePanelOpen?.();const gp=held?null:readGamepad();
   REDLINE_MOUSE_ALT.step(dt,(redlineUI.config.mouseSensitivity||40)/50,(redlineUI.config.pitchSensitivity||72)/100,st.yaw);
   const mov=REDLINE_MOVE.vector(),touch=window.REDLINE_MOBILE_CONTROLS?.snapshot?.(),touched=!!touch?.enabled;
   const steering=touched&&Math.abs(touch.steer)>.001;
   const cmd={
     throttle:touched&&Math.abs(touch.throttle)>.001?touch.throttle:mov.throttle||(gp?.throttle||0),
     strafe:touched&&Math.abs(touch.strafe)>.001?touch.strafe:mov.strafe,
     steer:steering?touch.steer:((REDLINE_MOUSE_ALT.held&&REDLINE_MOUSE_ALT.style==='classic')?REDLINE_MOUSE_ALT.steer:(gp?.steer||0)),
     headingTarget:!steering&&REDLINE_MOUSE_ALT.held&&REDLINE_MOUSE_ALT.style==='locked'?REDLINE_MOUSE_ALT.headingTarget:undefined,
     lift:touched&&touch.lift!==0?touch.lift:(REDLINE_BINDINGS.isDown(K,'climb')?1:REDLINE_BINDINGS.isDown(K,'descend')?-1:(Math.abs(REDLINE_MOUSE_ALT.command)>.045?REDLINE_MOUSE_ALT.command:(gp?.lift||0))),
     pitch:REDLINE_MOUSE_ALT.style==='locked'?REDLINE_MOUSE_ALT.pitch:st.pm,
     boost:!!(REDLINE_BINDINGS.isDown(K,'boost')||gp?.boost||(touched&&touch.boost)),
     brake:!!(REDLINE_BINDINGS.isDown(K,'brake')||gp?.brake||(touched&&touch.brake)),
     fire:!!(state.pending.fire||(gp?.fire)||(touched&&touch.fire)),
     shield:!!state.pending.shield,emp:!!state.pending.emp
   };
   if(held||mode!=='run')Object.assign(cmd,{throttle:0,strafe:0,steer:0,lift:0,boost:false,fire:false,shield:false,emp:false,brake:true});
   if(state.connected&&now-state.nextSend>=33){state.nextSend=now;
     send('input',{input:{seq:++state.seq,...cmd}});
     state.pending.fire=state.pending.shield=state.pending.emp=false;
   }
   // The authoritative snapshots are the ONLY input to online world pose.
   const own=sampled(state.id);
   if(own){
     st.p.set(...own.p);st.yaw=own.yaw;st.pv=own.pitch;st.roll=own.roll;st.spd=own.speed;
     st.boost=limit((own.energy||0)*100,0,100);st.las=own.ammo||0;
     FL.x=own.p[0];FL.y=own.p[1];FL.z=own.p[2];FL.yaw=own.yaw;FL.speed=own.speed;
     dr.position.copy(st.p);dr.rotation.set(st.pv,st.yaw,st.roll,'YXZ');
     gate=own.gates%(state.course==='iron'?20:12);lap=1+Math.floor(own.gates/(state.course==='iron'?20:12));
     raceT=Math.max(0,(state.tick-state.startTick)/60);lapT=raceT;
     const forward=new THREE.Vector3(-Math.sin(st.yaw),0,-Math.cos(st.yaw));
     const isFPV=redlineUI.config.view===1;
     const desired=st.p.clone().addScaledVector(forward,isFPV?1.1:-26).add(new THREE.Vector3(0,isFPV?2.5:10,0));
     cam.position.lerp(desired,limit(dt*(isFPV?22:7),0,1));
     const target=st.p.clone().addScaledVector(forward,70).add(new THREE.Vector3(0,2,0));
     cam.lookAt(target);dr.visible=!isFPV;
     window.REDLINE_MOBILE_CONTROLS?.setTelemetry?.(st.spd,redlineRiverAltitude(st.p.y));
     if(own.finished!=null&&!state.finishing)state.finishing=true;
   }
   for(let i=state.beams.length-1;i>=0;i--){const b=state.beams[i];if(now>b.until){S.remove(b.line);b.line.geometry.dispose();b.line.material.dispose();state.beams.splice(i,1);}}
   // Remote aircraft are drawn by drawRedlineScene from the same snapshot buffer.
   if(!state.connected&&now-state.lastSeen>800)state.status='CONNECTION LOST';
   if(now-state.lastHud>=50){state.lastHud=now;
     for(const [id,value] of [['v',Math.round(Math.abs(st.spd))],['al',Math.round(redlineRiverAltitude(st.p.y))],['lp',lap+'/3'],['gt',(gate+1)+'/'+(state.course==='iron'?20:12)],['tm',raceT.toFixed(2)],['ls','◆'.repeat(st.las)+'◇'.repeat(2-st.las)+' lasers']]){
       const el=document.getElementById(id);if(el)el.textContent=value;
     }
     const bar=document.getElementById('bf');if(bar)bar.style.width=st.boost+'%';
     const word=document.getElementById('rlOnlineState');if(word)word.textContent=showStatus();
   }
   try{redlineUI.frame(dt);}catch(e){if(!state.hudWarn){state.hudWarn=true;console.warn('[ONE WORLD HUD]',e);}}
   if(!IRON)positionStableSun(st.p);sky.position.copy(cam.position);
 }
 return Object.assign(state,{connect,close,update,enterRace,bindRemote,queueAbility,start,setModel,showStatus,validURL,
   get enabled(){return state.enabled;},get racing(){return state.racing;},sampled,disconnect,
   get startRemaining(){return state.startTick==null?null:Math.max(0,(state.startTick-state.tick)/60);},
   minimap:()=>state.members.filter(p=>p.id!==state.id).map(p=>{const v=sampled(p.id);return v?{id:p.id,x:v.p[0],z:v.p[2],stale:!p.online,color:'#4edcec'}:null}).filter(Boolean),
   standings:()=>state.members.map(p=>{const snapshot=state.snapshots.at(-1)?.players.find(x=>x.id===p.id);return {key:p.id,label:p.id===state.id?'YOU':p.name,progress:(snapshot?.gates||0)/(state.course==='iron'?20:12),me:p.id===state.id,color:p.id===state.id?'#ff4d60':'#4edcec',short:p.name?.slice(0,1)||'P'};}).sort((a,b)=>b.progress-a.progress)
 });
}
