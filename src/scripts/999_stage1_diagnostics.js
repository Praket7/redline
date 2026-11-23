/* REDLINE v78 debug UI and runtime instrumentation. No simulation writes. */
(function(){'use strict';
 const counts={frames:0,errors:0};let samples=[];let opened=false;let node=null;let last=performance.now();
 const now=()=>performance.now();
 function pct(xs,p){if(!xs.length)return 0;const copy=xs.slice().sort((a,b)=>a-b);return copy[Math.min(copy.length-1,Math.floor(copy.length*p))]}
 function snap(){let r=window.REDLINE_STAGE1_LAST_RENDER||{};let s=window.REDLINE_SIM_STATE?.()||null;let profile=window.REDLINE_V42_PROFILE||{};let fps=samples.length?1000/(samples.reduce((a,b)=>a+b,0)/samples.length):0;
   return Object.freeze({version:window.REDLINE_VERSION||'unknown',phase:window.REDLINE_BOOT_PHASE||'unknown',screen:document.body.className,frames:counts.frames,runtimeErrors:counts.errors,simTick:s?.tick??null,fps:Math.round(fps),p50ms:+pct(samples,.5).toFixed(1),p95ms:+pct(samples,.95).toFixed(1),drawCalls:r.drawCalls??profile.drawCalls??null,triangles:r.triangles??profile.triangles??null,geometries:r.geometries??null,textures:r.textures??null,renderCPUms:r.renderCPUms??profile.renderSubmissionMs??null,updateCPUms:r.updateCPUms??profile.updateCPUms??null,quality:r.quality??null,dpr:window.devicePixelRatio||1,source:'rendered game telemetry; no GPU time assumed'});}
 function print(){if(!opened)return; if(!node){node=document.createElement('div');node.id='rl78Debug';node.setAttribute('role','status');node.setAttribute('aria-live','off');document.body.appendChild(node)} const s=snap();node.innerHTML='<div class="head">REDLINE / SYSTEM DIAGNOSTICS</div>'+Object.entries(s).filter(([k])=>k!=='source'&&k!=='screen').map(([k,v])=>`${k.padEnd(15)} ${String(v)}`).join('\n')+'<div class="sub">F8 hide · p50/p95 frame times · CPU submission ≠ GPU time</div>';}
 const tick=()=>{const n=now(),dt=n-last;last=n;if(dt>0&&dt<500){samples.push(dt);if(samples.length>180)samples.shift()}counts.frames++;if(opened&&counts.frames%12===0)print();requestAnimationFrame(tick)};
 window.REDLINE_STAGE1_DIAGNOSTICS=snap;
 window.REDLINE_STAGE1_TOGGLE=()=>{opened=!opened;if(node)node.hidden=!opened;if(opened)print();return opened};
 window.addEventListener('keydown',e=>{if(e.code==='F8'&&!e.repeat){e.preventDefault();window.REDLINE_STAGE1_TOGGLE()}});
 window.addEventListener('error',()=>{counts.errors++});
 window.REDLINE_STAGE1 = Object.freeze({build:'v78-stage1',baseline:'v77',showcase:Object.freeze({track:'grand',name:'Raven Slalom',routeFraction:.156,benchmarkCamera:'track-fixed',recommendedViewport:[1600,900],quality:'balanced'}),snapshot:()=>window.REDLINE_SIM_STATE?.()||null,diagnostics:snap,toggle:()=>window.REDLINE_STAGE1_TOGGLE()});
 requestAnimationFrame(tick);
})();
