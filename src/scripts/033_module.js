
window.REDLINE_SPIRIT_V66_ASSET_URL="{{REDLINE_ASSET_77fe6eb45a8aec}}";
/* REDLINE v66 / Spirit Nocturne photographic FPV flight deck.
 * The photograph is an authored cockpit-only alpha overlay. All telemetry is
 * sourced from authoritative flight state. No simulation mutations.
 */
(()=>{'use strict';
  const root=document.getElementById('rlPersistent');
  if(!root)return;
  const shell=document.createElement('div');
  shell.id='rl66SpiritOverlay';
  shell.setAttribute('role','img');
  shell.setAttribute('aria-label','Spirit Nocturne full B-2 style cockpit with live flight instruments');
  shell.innerHTML=`<svg id="rl66SpiritSVG" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <defs>
   <linearGradient id="rl66Panel" x1="0" x2=".13" y1="0" y2="1"><stop stop-color="#081621"/><stop offset=".28" stop-color="#030912"/><stop offset="1" stop-color="#02040a"/></linearGradient>
   <linearGradient id="rl66Blue" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#eafaff"/><stop offset=".55" stop-color="#8ccfff"/><stop offset="1" stop-color="#2985fa"/></linearGradient>
   <filter id="rl66TextGlow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#84c7ff" flood-opacity=".36"/></filter>
   <clipPath id="rl66SpeedClip"><path d="M402 716 L647 714 L637 845 L388 843Z"/></clipPath>
   <clipPath id="rl66AltClip"><path d="M1013 715 L1194 716 L1198 848 L1005 848Z"/></clipPath>
   <clipPath id="rl66BoostClip"><path d="M1216 724 L1430 726 L1422 846 L1214 845Z"/></clipPath>
  </defs>
  <image id="rl66Photo" x="0" y="0" width="1672" height="941" preserveAspectRatio="none" href=""/>
  <!-- Speed avionics: dark screen face retains the original photographic bezel. -->
  <g clip-path="url(#rl66SpeedClip)">
   <path d="M394 707H657V860H389Z" fill="url(#rl66Panel)"/>
   <path d="M413 728H632" stroke="#2c7098" stroke-opacity=".43"/>
   <text x="523" y="748" text-anchor="middle" class="rl66Label">SPEED</text>
   <text x="519" y="804" text-anchor="middle" class="rl66Big" id="rl66Speed">0</text>
   <text x="519" y="826" text-anchor="middle" class="rl66Unit">U/S</text>
   <rect x="422" y="833" width="198" height="5" rx="2" fill="#102d42"/>
   <rect x="422" y="833" width="0" height="5" rx="2" fill="url(#rl66Blue)" id="rl66SpeedFill"/>
  </g>
  <!-- The center display deliberately preserves the supplied Spirit flying wing graphic. -->
  <g clip-path="url(#rl66AltClip)">
   <path d="M999 705H1210V860H997Z" fill="url(#rl66Panel)"/>
   <path d="M1023 730H1181" stroke="#2c7098" stroke-opacity=".43"/>
   <text x="1105" y="748" text-anchor="middle" class="rl66Label">ALTITUDE</text>
   <text x="1100" y="796" text-anchor="middle" class="rl66Med" id="rl66Alt">0</text>
   <text x="1167" y="793" text-anchor="middle" class="rl66Unit">M</text>
   <path d="M1022 831q13 -13 26 -2t26 -6t28 2t27 -9t33 3t20 -9" fill="none" stroke="#3eaaff" stroke-width="2" opacity=".77"/>
   <path d="M1022 831q13 -13 26 -2t26 -6t28 2t27 -9t33 3t20 -9" fill="none" stroke="#439eff" opacity=".15" stroke-width="7"/>
  </g>
  <g clip-path="url(#rl66BoostClip)">
   <path d="M1207 718H1444V858H1205Z" fill="url(#rl66Panel)"/>
   <text x="1316" y="768" text-anchor="middle" class="rl66Label">BOOST</text>
   <g id="rl66BoostCells">
    <path data-boost="0" d="M1247 790h24l-4 23h-25Z" fill="url(#rl66Blue)"/>
    <path data-boost="1" d="M1278 790h24l-4 23h-25Z" fill="url(#rl66Blue)"/>
    <path data-boost="2" d="M1309 790h24l-4 23h-25Z" fill="url(#rl66Blue)"/>
    <path data-boost="3" d="M1340 790h24l-4 23h-25Z" fill="url(#rl66Blue)"/>
    <path data-boost="4" d="M1371 790h24l-4 23h-25Z" fill="url(#rl66Blue)"/>
   </g>
   <text x="1317" y="836" text-anchor="middle" class="rl66Tiny" id="rl66BoostText">100% RESERVE</text>
  </g>
  <!-- Subtle windshield avionics replace the still HUD values cut from the reference. -->
  <g id="rl66GlassHUD">
   <path d="M610 178H1062" stroke="#c3e8ff" stroke-opacity=".45" stroke-width="1"/>
   <g stroke="#d6ebff" stroke-opacity=".6" stroke-width="1">
    <path d="M640 170v16M687 173v10M733 173v10M780 170v16M834 166v20M887 170v16M935 173v10M982 173v10M1033 170v16"/>
   </g>
   <text x="836" y="158" class="rl66GlassLabel" text-anchor="middle" id="rl66Heading">000°</text>
   <g stroke="#e2f1ff" stroke-width="1.4" opacity=".82" fill="none">
    <path d="M810 217h15m23 0h15M836 202v10m0 10v10"/>
    <circle cx="836" cy="218" r="9"/>
   </g>
   <text x="364" y="419" text-anchor="middle" class="rl66GlassLabel">ALT</text>
   <text x="364" y="457" text-anchor="middle" class="rl66GlassValue" id="rl66GlassAlt">0 M</text>
   <text x="1303" y="419" text-anchor="middle" class="rl66GlassLabel">SPD</text>
   <text x="1303" y="457" text-anchor="middle" class="rl66GlassValue" id="rl66GlassSpeed">0 U/S</text>
  </g>
  </svg>`;
  root.insertBefore(shell,root.firstChild);
  const photo=shell.querySelector('#rl66Photo');
  const source=window.REDLINE_SPIRIT_V66_ASSET_URL||'assets/spirit_b2_cockpit_v66.webp';
  photo.setAttribute('href',source);
  const probe=new Image();let imageReady=false;
  probe.onload=()=>{imageReady=true;document.documentElement.dataset.spiritCockpitAsset='ready';};
  probe.onerror=()=>{imageReady=false;document.documentElement.dataset.spiritCockpitAsset='failed';};
  probe.src=source;
  const $=(id)=>shell.querySelector('#'+id);
  const cells=Array.from(shell.querySelectorAll('[data-boost]'));
  const clamp=(v,l,h)=>Math.min(h,Math.max(l,Number.isFinite(+v)?+v:l));
  let last=-Infinity;
  window.REDLINE_SPIRIT_COCKPIT=Object.freeze({
    ready:()=>imageReady&&!!$('rl66Speed'),
    get assetReady(){return imageReady;},
    update(s){
      if(!s||!Number.isFinite(s.speed))return;
      const t=performance.now();if(t-last<40)return;last=t;
      const speed=Math.round(clamp(Math.abs(s.speed),0,999));
      const alt=Math.round(clamp(s.altitude,0,999));
      const boost=clamp(s.boost,0,100);
      const hdg=((Math.round(clamp(s.heading,-100000,100000))%360)+360)%360;
      $('rl66Speed').textContent=speed;
      $('rl66Alt').textContent=alt;
      $('rl66GlassAlt').textContent=alt+' M';
      $('rl66GlassSpeed').textContent=speed+' U/S';
      $('rl66Heading').textContent=String(hdg).padStart(3,'0')+'°';
      $('rl66BoostText').textContent=Math.round(boost)+'% RESERVE';
      const max=Math.max(1,Number.isFinite(+s.speedRange)?+s.speedRange:300);
      $('rl66SpeedFill').setAttribute('width',(198*Math.min(1,speed/max)).toFixed(1));
      const fraction=boost/20;
      cells.forEach((el,i)=>el.style.opacity=(i+1<=fraction)?'.98':(i<fraction)?'.48':'.10');
    }
  });
})();

