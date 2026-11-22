/* REDLINE v39 / Resilient runtime error boundary.
   Recoverable network promises are logged in diagnostics, not shown as a
   full-screen "Game startup problem" overlay. Fatal renderer failures offer
   an explicit reload action and never hide the real underlying exception.
 */
(function(){
 'use strict';
 const history=[];let lastNotice=0;
 function record(reason,source,critical){
  const raw=String(reason&&reason.message||reason||'Unknown error');
  const entry={at:new Date().toISOString(),source,message:raw.slice(0,500),stack:String(reason?.stack||'').slice(0,2500),phase:window.REDLINE_BOOT_PHASE||'unknown',critical:!!critical};
  history.push(entry);if(history.length>30)history.shift();
  window.REDLINE_ERROR_HISTORY=history;
  if(critical)console.error('[REDLINE fatal]',reason);else console.warn('[REDLINE recovered]',reason);
  return entry;
 }
 function notice(entry){
  const now=Date.now();if(now-lastNotice<7000)return;lastNotice=now;
  const screens=document.getElementById('rlScreens');
  if(!screens||screens.classList.contains('hidden'))return;
  let el=document.getElementById('rlRecoveryNotice');
  if(!el){el=document.createElement('div');el.id='rlRecoveryNotice';el.setAttribute('role','status');
   el.style.cssText='position:fixed;left:18px;bottom:18px;z-index:95;max-width:360px;padding:10px 14px;background:rgba(18,16,20,.9);border:1px solid #e17b5555;color:#fff;font:12px Arial,sans-serif;pointer-events:none;';document.body.appendChild(el);}
  el.textContent='A temporary service issue was handled. Racing is still available.';
  window.setTimeout(()=>{el?.remove()},4500);
 }
 function fatal(reason){
  const entry=record(reason,'fatal',true);
  document.getElementById('rlBootCurtain')?.classList.add('rl-boot-done');
  let panel=document.getElementById('rlFatalRecovery');
  if(!panel){panel=document.createElement('div');panel.id='rlFatalRecovery';
   panel.style.cssText='position:fixed;inset:0;z-index:500;background:rgba(3,4,8,.95);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:16px;padding:28px;font:14px Arial,sans-serif';
   const h=document.createElement('h2');h.textContent=/WebGL|canvas|context lost|renderer/i.test(entry.message)?'REDLINE / RENDERER INTERRUPTED':'REDLINE / STARTUP INTERRUPTED';panel.appendChild(h);
   const explain=document.createElement('p');explain.textContent='An error interrupted startup. The technical details have been recorded for diagnosis.';panel.appendChild(explain);
   const button=document.createElement('button');button.textContent='RESTART REDLINE';button.style.cssText='padding:12px 22px;background:#e32a39;border:0;border-radius:5px;color:white;font-weight:900;cursor:pointer';
   button.addEventListener('click',()=>location.reload());panel.appendChild(button);document.body.appendChild(panel);}
  const desc=document.createElement('small');desc.textContent=entry.message;desc.style.cssText='max-width:650px;opacity:.7;word-break:break-word';
  panel.querySelector('small')?.remove();panel.appendChild(desc);
 }
 function isConnectivity(msg){return /fetch|network|timed out|abort|websocket|channel|supabase|heartbeat|realtime|connection|not found|429|401|403|503|offline|cdn/i.test(msg);}
 function handle(error,source='promise'){
  const message=String(error?.message||error||'Unknown error');
  if(isConnectivity(message)){notice(record(error,source,false));return;}
  // When the engine is running, render/UI errors can be non-fatal; keep telemetry
  // visible in devtools, but don't display a blanket crash screen for every promise.
  if(window.REDLINE_SHOWROOM_READY||window.redlineUI?.current==='race'){
    notice(record(error,source,false));return;
  }
  fatal(error);
 }
 window.addEventListener('error',e=>{
  if(e.target&&e.target!==window)return; // image, audio and script resource events
  handle(e.error||e.message,'window');
 });
 window.addEventListener('unhandledrejection',e=>{
  const msg=String(e.reason?.message||e.reason||'');
  if(isConnectivity(msg)){e.preventDefault();handle(e.reason,'async-network');}
  else handle(e.reason,'promise');
 });
 window.reportRedlineError=(error)=>handle(error,'explicit');
 window.reportRedlineFatal=fatal;
 window.REDLINE_ERROR_QA=()=>({history:history.slice(),fatal:!!document.getElementById('rlFatalRecovery'),phase:window.REDLINE_BOOT_PHASE||'unknown'});
})();
