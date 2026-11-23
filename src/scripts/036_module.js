
/* REDLINE v30 — optional, lightweight ambient menu pointer response.
   Never changes race controls or captures a pointer; only updates CSS variables. */
(()=>{
 'use strict';
 const root=document.getElementById('rlScreens');
 if(!root||typeof window==='undefined')return;
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 let queued=false,px=65,py=55;
 function flush(){queued=false;if(document.body.classList.contains('rl-menu')&&!reduced?.matches){
   root.style.setProperty('--rl30-pointer-x',px.toFixed(1)+'%');
   root.style.setProperty('--rl30-pointer-y',py.toFixed(1)+'%');
 }}
 root.addEventListener('pointermove',e=>{
   if(!document.body.classList.contains('rl-menu')||reduced?.matches)return;
   const r=root.getBoundingClientRect();if(!r.width||!r.height)return;
   px=Math.max(0,Math.min(100,((e.clientX-r.left)/r.width)*100));
   py=Math.max(0,Math.min(100,((e.clientY-r.top)/r.height)*100));
   if(!queued){queued=true;requestAnimationFrame(flush)}
 },{passive:true});
 root.addEventListener('pointerleave',()=>{
   if(!queued){queued=true;px=65;py=55;requestAnimationFrame(flush)}
 },{passive:true});
})();

