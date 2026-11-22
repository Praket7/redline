
/* Kestrel X4: reference-image cockpit + live state; no mutation of simulation. */
(()=>{
 const shell=document.createElement('div');shell.id='rl67KestrelOverlay';shell.setAttribute('aria-hidden','true');
 shell.innerHTML=`<svg id="rl67KestrelSVG" viewBox="0 0 1536 865" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
 <defs><linearGradient id="k67Screen" x2="0" y2="1"><stop stop-color="#071522"/><stop offset="1" stop-color="#01060d"/></linearGradient><filter id="k67Glow"><feGaussianBlur stdDeviation="3"/></filter></defs>
 <image id="k67Photo" width="1536" height="865" href=""/>
 <!-- Replace photographed instrument values with genuine flight telemetry. -->
 <path d="M315 618H576V757H304Z" fill="url(#k67Screen)" opacity=".97"/>
 <path d="M598 617H898V766H594Z" fill="url(#k67Screen)" opacity=".97"/>
 <path d="M902 620H1060V759H899Z" fill="url(#k67Screen)" opacity=".97"/>
 <path d="M1068 620H1246V762H1065Z" fill="url(#k67Screen)" opacity=".97"/>
 <!-- Kestrel X4 hologram: four vector pods, fuselage, arms, and rotor disks. -->
 <g transform="translate(448 715)" stroke="#a9dfff" fill="none" stroke-linejoin="round" stroke-linecap="round">
  <g opacity=".27" stroke-width="5" filter="url(#k67Glow)"><path d="M-72 -28L-23 -8 0 -46 23 -8 72 -28M-72 28L-23 8 0 46 23 8 72 28"/></g>
  <g stroke-width="1.6"><path d="M-72 -28L-23 -8 0 -46 23 -8 72 -28M-72 28L-23 8 0 46 23 8 72 28"/><path d="M0 -53L21 -14 18 34 0 51 -18 34 -21 -14Z"/><path d="M0 -51V51M-19 -13H19M-17 33H17"/></g>
  <g stroke-width="1.5"><circle cx="-73" cy="-29" r="16"/><circle cx="73" cy="-29" r="16"/><circle cx="-73" cy="29" r="16"/><circle cx="73" cy="29" r="16"/><circle cx="-73" cy="-29" r="5"/><circle cx="73" cy="-29" r="5"/><circle cx="-73" cy="29" r="5"/><circle cx="73" cy="29" r="5"/></g>
 </g>
 <text x="450" y="655" text-anchor="middle" class="k67-small">KESTREL X4 · VECTOR PODS</text>
 <text x="747" y="678" text-anchor="middle" class="k67-label">SPEED</text><text id="k67Speed" x="747" y="740" text-anchor="middle" class="k67-value">0</text><text x="747" y="763" text-anchor="middle" class="k67-small">U/S</text>
 <text x="980" y="678" text-anchor="middle" class="k67-label">ALTITUDE</text><text id="k67Alt" x="980" y="733" text-anchor="middle" style="font:600 39px Arial;fill:#eaf6ff">0</text><text x="980" y="756" text-anchor="middle" class="k67-small">METERS</text>
 <text x="1158" y="683" text-anchor="middle" class="k67-label">BOOST</text>
 <g id="k67Boost">${Array.from({length:5},(_,i)=>`<rect data-cell="${i}" x="${1094+i*25}" y="707" width="19" height="27" rx="1" fill="#ff354c"/>`).join('')}</g>
 <text id="k67BoostLabel" x="1158" y="754" text-anchor="middle" class="k67-small">100%</text>
 </svg>`;
 document.body.appendChild(shell);
 const photo=shell.querySelector('#k67Photo');photo.setAttribute('href',window.REDLINE_KESTREL_V67_ASSET_URL);
 const img=new Image();let loaded=false;img.onload=()=>{loaded=true};img.src=window.REDLINE_KESTREL_V67_ASSET_URL;
 const el=id=>shell.querySelector('#'+id);
 window.REDLINE_KESTREL_COCKPIT=Object.freeze({ready:()=>loaded,update:s=>{
  const speed=Math.max(0,Number(s.speed)||0),alt=Math.max(0,Number(s.altitude)||0),boost=Math.max(0,Math.min(100,Number(s.boost)||0));
  el('k67Speed').textContent=String(Math.round(speed));el('k67Alt').textContent=String(Math.round(alt));
  el('k67BoostLabel').textContent=Math.round(boost)+'%';
  for(const cell of shell.querySelectorAll('[data-cell]')){const n=Number(cell.getAttribute('data-cell'));cell.setAttribute('opacity',boost>=n*20+8?'1':'.15')}
 }});
})();
