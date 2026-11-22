
(function(){
 const start=Date.now();
 window.REDLINE_BOOT_WATCHDOG_VERSION=47;
 window.REDLINE_BOOT_WATCHDOG=setTimeout(function(){
  const curtain=document.getElementById('rlBootCurtain');
  if(!curtain||curtain.classList.contains('rl-boot-done'))return;
  if(window.REDLINE_SHOWROOM_READY || window.REDLINE_UI_STATUS?.().ready){curtain.classList.add('rl-boot-done');return;}
  curtain.classList.add('rl-boot-done');
  const message=(window.REDLINE_MOBILE?'Mobile startup: ':'')+(!window.THREE?'Three.js did not load. Check your connection or browser restrictions.':
    !window.REDLINE_SHOWROOM?'The hangar scene could not be initialized.':
    !window.REDLINE_MODEL_TEMPLATE?'The drone model has not finished loading.':'The hangar render did not complete.');
  console.warn('REDLINE startup watchdog:',message,Date.now()-start);
  // Menus are usable even if the decorative showroom cannot finish.
  let banner=document.getElementById('rlBootRecovery');
  if(!banner){banner=document.createElement('div');banner.id='rlBootRecovery';
   banner.setAttribute('role','status');banner.style.cssText='position:fixed;right:18px;bottom:16px;z-index:99;background:#140b10e9;color:#fff;padding:12px 16px;max-width:370px;border-left:3px solid #f03c4e;font:12px Arial,sans-serif;';document.body.appendChild(banner);}
  banner.textContent=message+' Try opening the deployed HTTPS site in Safari rather than an HTML preview.';
  banner.style.maxWidth='350px';
 },10000);
})();
