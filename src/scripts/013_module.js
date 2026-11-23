

/* Optional Stage 1 handling laboratory. F6 toggles; no impact when hidden. */
(()=>{
 'use strict';
 const cfg=window.REDLINE_FLIGHT?.config;if(!cfg)return;
 const controls=[
   ['Steering rise','steerRise',.05,.28,.005,'s'],
   ['Steering release','steerRelease',.045,.27,.005,'s'],
   ['Turn acceleration','yawAccel',3,19,.2,'rad/s²'],
   ['Turn braking','yawBrake',3,19,.2,'rad/s²'],
   ['Yaw authority','yawSpeedScale',.55,1.3,.025,'×'],
   ['Lateral grip','lateralGrip',5,30,.25,'/s'],
   ['Max lateral accel','lateralAccel',350,2500,25,'u/s²'],
   ['Bank stiffness','bankStiffness',4,18,.25,'/s'],
   ['Bank damping','bankDamping',.45,1.5,.025,'ζ'],
   ['Camera follow','cameraFollow',.07,.4,.01,'s'],
   ['Camera lookahead','cameraLookahead',0,.16,.005,'s'],
 ];
 const p=document.createElement('aside');p.id='redline-handling-lab';
 p.style.cssText='position:fixed;z-index:200;left:15px;top:105px;width:min(330px,calc(100vw - 32px));max-height:calc(100vh - 130px);overflow:auto;color:#f6eef0;background:linear-gradient(155deg,rgba(20,10,15,.96),rgba(4,6,12,.96));border:1px solid rgba(255,70,94,.64);border-radius:12px;padding:14px 16px;box-shadow:0 18px 60px #000a;display:none;font-family:system-ui,sans-serif;pointer-events:auto';
 const title=document.createElement('div');title.style.cssText='font-weight:900;letter-spacing:.11em;color:#ff465f;font-size:13px;margin-bottom:4px';title.textContent='FLIGHT HANDLING LAB  ·  '+(window.REDLINE_BINDINGS?.display('handlingLab')||'F6');p.appendChild(title);
 window.REDLINE_BINDINGS?.onChange(()=>{title.textContent='FLIGHT HANDLING LAB  ·  '+window.REDLINE_BINDINGS.display('handlingLab');});
 const subtitle=document.createElement('div');subtitle.textContent='Live physics tuning (local to this tab). Not used for competitive timing.';subtitle.style.cssText='font-size:11px;color:#c9b8c0;margin-bottom:11px;line-height:1.45';p.appendChild(subtitle);
 const telemetry=document.createElement('pre');telemetry.style.cssText='font:11px/1.6 monospace;color:#ffecf0;background:#150d13;border-radius:6px;padding:8px;margin:0 0 10px';telemetry.textContent='Start a race for telemetry';p.appendChild(telemetry);
 const samples=[];
 const rows=[];
 for(const [label,key,min,max,step,unit] of controls){
   const wrap=document.createElement('label');wrap.style.cssText='display:block;margin:9px 0;font-size:11px;color:#ddd';
   const head=document.createElement('div');head.style.cssText='display:flex;justify-content:space-between;margin-bottom:3px';
   const value=document.createElement('b');value.style.color='#ff9bac';value.textContent=cfg[key].toFixed(2)+' '+unit;
   const name=document.createElement('span');name.textContent=label;head.append(name,value);
   const input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.step=step;input.value=cfg[key];input.style.cssText='width:100%;accent-color:#ff354f;cursor:pointer';
   input.addEventListener('input',()=>{cfg[key]=+input.value;value.textContent=cfg[key].toFixed(2)+' '+unit;});
   wrap.append(head,input);p.appendChild(wrap);rows.push({key,value,input,unit});
 }
 const footer=document.createElement('div');footer.style.cssText='display:flex;gap:8px;margin-top:11px';
 const button=(text,cb)=>{const b=document.createElement('button');b.textContent=text;b.style.cssText='background:#220c16;color:#fff;border:1px solid #a83249;border-radius:6px;padding:7px 10px;cursor:pointer;font-weight:800;font-size:11px';b.onclick=cb;return b;};
 footer.append(
   button('COPY TUNE',()=>{const values={};for(const x of rows)values[x.key]=cfg[x.key];navigator.clipboard?.writeText(JSON.stringify(values,null,2));}),
   button('EXPORT TRACE',()=>{
     if(!samples.length)return;
     const cols=['t','speed','yawRate','roll','steer','sideSlip','slipAngleDeg','physicsSteps','cameraLag','fps'];
     const csv=cols.join(',')+'\n'+samples.map(row=>cols.map(c=>Number(row[c]||0).toFixed(3)).join(',')).join('\n');
     const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
     const a=document.createElement('a');a.href=url;a.download='REDLINE_handling_trace.csv';a.click();
     setTimeout(()=>URL.revokeObjectURL(url),1000);
   }),
   button('RESET',()=>{Object.assign(cfg,defaults);for(const x of rows){x.input.value=cfg[x.key];x.value.textContent=cfg[x.key].toFixed(2)+' '+x.unit;}}),
   button('CLOSE',()=>{p.style.display='none';})
 );p.appendChild(footer);
 const defaults=Object.fromEntries(rows.map(x=>[x.key,cfg[x.key]]));
 document.body.appendChild(p);
 addEventListener('keydown',e=>{if(window.REDLINE_BINDINGS?.isActionCode(e.code,'handlingLab')){e.preventDefault();p.style.display=p.style.display==='none'?'block':'none';if(p.style.display!=='none')document.exitPointerLock?.();}});
 let prev=0;
 function poll(now){if(now-prev>100){
   prev=now;const s=window.REDLINE_HANDLING_STATUS?.();
   if(s&&Number.isFinite(s.speed)){
     if(samples.length>=3600)samples.shift();
     samples.push({t:now/1000,...s});
   }
   if(s&&p.style.display!=='none')telemetry.textContent='SPEED '+s.speed.toFixed(1)+' u/s   YAW '+s.yawRate.toFixed(2)+' rad/s\nBANK '+(s.roll*57.2958).toFixed(1)+'°   STEER '+s.steer.toFixed(2)+'\nSLIP '+s.sideSlip.toFixed(1)+' u/s ('+s.slipAngleDeg.toFixed(1)+'°)   STEPS '+s.physicsSteps+'\nCAM LAG '+s.cameraLag.toFixed(1)+'u   FPS '+(s.fps||0).toFixed(0);
 }requestAnimationFrame(poll);}requestAnimationFrame(poll);
})();


