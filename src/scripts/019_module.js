

/* REDLINE Flight School: practice-first, skippable, context-targeted onboarding. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.REDLINE_FLIGHT_SCHOOL=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const steps=[
 {title:'WELCOME TO RAVEN SPRINT',target:'#rlGameTop',keys:'ONE SHORT RUN',desc:'This is a four-checkpoint sprint through the opening canyon. You will learn the controls one system at a time. The timed race starts only after this lesson; practice does not affect your record.'},
 {title:'THROTTLE AND REVERSE',target:'#rlSpeedBox',keys:'W · S',desc:'Hold W to move forward and S to slow, brake into reverse only once you have nearly stopped. Start gently: you do not need to hold boost to be competitive.'},
 {title:'STEER AND STRAFE',target:'#rlReticle',keys:'MOUSE · A · D',desc:'Once the mouse is captured, move left and right to steer and up/down to pitch. A and D move sideways without changing your heading.'},
 {title:'CHANGE HEIGHT',target:'#rlSpeedBox',keys:'MOUSE ↑ ↓ · ARROW UP / DOWN',desc:'Move the locked mouse up/down to pitch into climbs and dives. Arrow Up and Down are optional lift controls. Adjust your height before checkpoint rings and avoid canyon cliffs.'},
 {title:'AIR BRAKE AND RECOVERY',target:'#rlSpeedBox',keys:'SPACE · R',desc:'Hold Space to slow sharply before a tight turn. If you are stuck or miss a gate, use your recovery key (R by default) to return near the next checkpoint with a small time penalty.'},
 {title:'AFTERBURNER AND BOOST FUEL',target:'#rlBoostLinear',keys:'SHIFT',desc:'Hold Shift to use your normal boost energy. The long horizontal bar near the speed gauge falls as you boost and refills when you release. Boost works best on clear straights, not into blind corners.'},
 {title:'NAVIGATION AND CHECKPOINTS',target:'#maphud',keys:'MAP · ◇ POINTER',desc:'The top-down map shows the course and the next required ring. The floating pointer tells you which ring is next and whether it is above or below you. Never fly past a ring and assume it counted.'},
 {title:'MOUSE AIM AND PRECISION FIRE',target:'#rlReticle',keys:'MOVE MOUSE · TAB',desc:'Move the mouse left and right to turn, or up and down to pitch the drone. Double-click to fire the centered laser; W/S accelerate and reverse, A/D strafe. Escape releases the mouse; double-tap to recapture.'},
 {title:'LASERS: TWO SHOTS PER LOAD',target:'#rlFlowModule',keys:'DOUBLE CLICK · E / F',desc:'In Canyon Clash you get TWO laser charges per load. Double-click while locked, or press E (F also works). Shots are deliberately narrow; being close, aiming carefully and timing the shot matter more than spamming.'},
 {title:'FLOW IS A DIFFERENT RESOURCE',target:'#rlFlowModule',keys:'◈ TACTICAL FLOW',desc:'The red Flow meter fills when you fly cleanly through gates, pass rivals and take risky lines. Flow is not the same as the white Boost fuel bar. Spending Flow activates combat abilities and recharges your resources.'},
 {title:'SPEND FLOW WISELY',target:'#rlFlowModule',keys:'B · J · H · Z',desc:'B spends 25 Flow to refill boost energy. J spends 24 for a shield. H spends 42 for a short-range EMP pulse. Z spends 30 to reload TWO lasers. These abilities are for Canyon Clash; Time Attack is a clean run.'},
 {title:'CHASE AND COCKPIT VIEWS',target:'#rlGameButtons',keys:'P · C',desc:'P changes between chase camera and cockpit view. C cycles chase distance. Choose whichever gives the clearest view of the next gate; you can switch in mid-flight.'},
 {title:'DRONE FINISH, GHOST AND TIMES',target:'#rlGameButtons',keys:'L · G',desc:'L cycles your drone finish. G toggles your best-time ghost when one exists. The translucent drone is an exact playback of an earlier run, not an AI rival. Chase it to beat your own record.'},
 {title:'CONTROLS AND SETTINGS IN RACE',target:'#rlGameButtons',keys:'U · I · ? CONTROLS',desc:'Press U to toggle a virtual mouse cursor while your mouse is locked. Move the mouse and click SETTINGS, P VIEW or CONTROLS without losing flight capture. Opening a panel releases capture for normal menu interaction; click the game to re-arm afterward.'},
 {title:'MORE HELPFUL SHORTCUTS',target:'#rlGameButtons',keys:'Y · M · T · V · F6',desc:'Y cycles between CINEMATIC (lap, map, speed and boost), RACE (small timing and map), and TACTICAL (all HUD panels). M mutes audio, T changes time of day, V cycles handling and F6 opens the advanced tuner. All optional actions can be remapped.'},
 {title:'RACE THE CLOCK',target:'#rlGameTop',keys:'BACKSPACE · G',desc:'After training, you will start at the sprint line with a fresh clock. Hit four gates in order. Watch sector splits and your personal-best difference, then immediately retry with Backspace or the RESTART button. You can replay Flight School anytime.'}
];
const css=`
#ravenSchool{position:fixed;inset:0;z-index:210;pointer-events:none;display:none;font-family:system-ui,Arial,sans-serif;color:#fff}
#ravenSchool.active{display:block}
#ravenSchool .ravenShade{position:absolute;inset:0;background:#0008;backdrop-filter:blur(3px)}
#ravenSchool .ravenArrow{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2;overflow:visible}#ravenSchool .ravenArrow > path{stroke:#ff425b;stroke-width:3;fill:none;stroke-linecap:round;filter:drop-shadow(0 0 7px #f93853)}#ravenSchool .ravenAim{position:fixed;z-index:1;pointer-events:none;border:2px solid #ff4559;border-radius:12px;box-shadow:0 0 0 6px #ff3b4940,0 0 28px #e82c4f66;transition:all .25s ease}
#ravenSchool .ravenAim::after{content:'◆';position:absolute;top:-11px;right:-9px;font-size:15px;color:#ff6276;text-shadow:0 0 10px #ff4256}
#ravenSchool .ravenCard{box-sizing:border-box;position:absolute;z-index:3;left:clamp(14px,5vw,85px);top:clamp(125px,18vh,200px);width:min(470px,calc(100vw - 30px));max-height:calc(100vh - 140px);overflow:auto;background:linear-gradient(140deg,#10080deF,#180c13ec);border:1px solid #fa4d647f;border-left:4px solid #f93b56;border-radius:12px;box-shadow:0 16px 90px #000c,0 0 55px #dd14371c;backdrop-filter:blur(19px);padding:23px 25px;pointer-events:auto}
#ravenSchool .ravenKicker{color:#ff778a;font-size:10px;font-weight:900;letter-spacing:2.6px}
#ravenSchool .ravenTitle{font:italic 950 clamp(21px,3vw,34px)/1.1 Arial,sans-serif;letter-spacing:-.4px;margin:11px 0 15px;color:#fff}
#ravenSchool .ravenBody{font:500 13px/1.65 system-ui,sans-serif;color:#e2ccd3;margin-bottom:18px}
#ravenSchool .ravenKeys{display:inline-flex;gap:9px;color:#fff;font:900 15px ui-monospace,monospace;padding:11px 14px;background:#3f1223;border:1px solid #fb445b;border-radius:7px;letter-spacing:1.2px;margin-bottom:19px}
#ravenSchool .ravenProgress{height:4px;width:100%;background:#47202c;border-radius:20px;margin:3px 0 20px;overflow:hidden}
#ravenSchool .ravenProgress i{display:block;height:100%;background:linear-gradient(90deg,#b71936,#ff6a7b);transition:width .25s}
#ravenSchool .ravenActions{display:flex;gap:8px;flex-wrap:wrap}
#ravenSchool button{font:900 11px system-ui,Arial,sans-serif;letter-spacing:.8px;padding:11px 13px;border:1px solid #fb6374;border-radius:6px;background:#b31937;color:#fff;cursor:pointer}
#ravenSchool button.secondary{background:#120b10;border-color:#814456;color:#ead3dc}
#ravenSchool button:focus-visible{outline:2px solid #fff;outline-offset:2px}
#ravenSchool .ravenFoot{display:flex;gap:10px;justify-content:space-between;align-items:center;color:#ac929c;font:700 10px/1.4 system-ui;margin-top:13px}
#ravenSchool:not(.practicing) button[data-guide="finishPractice"]{display:none}
#ravenSchool.practicing .ravenShade{display:none}
#ravenSchool.practicing .ravenAim,#ravenSchool.practicing .ravenArrow{display:none}
#ravenSchool.practicing .ravenCard{left:50%;top:auto;bottom:18px;transform:translateX(-50%);width:min(580px,calc(100vw - 24px));padding:10px 14px;max-height:170px}
#ravenSchool.practicing .ravenTitle{font-size:17px;margin:5px 0}
#ravenSchool.practicing .ravenBody{font-size:10px;line-height:1.35;margin:3px 0 5px}
#ravenSchool.practicing .ravenKeys,#ravenSchool.practicing .ravenProgress,#ravenSchool.practicing button[data-guide="practice"],#ravenSchool.practicing button[data-guide="skip"]{display:none}
#ravenSchool.practicing .ravenKicker{font-size:8px}
#ravenSchool.practicing .ravenFoot{margin-top:5px}
@media(max-width:650px){#ravenSchool .ravenCard{left:12px;top:110px;padding:16px;max-height:calc(100vh - 130px)}#ravenSchool .ravenBody{font-size:12px}#ravenSchool .ravenTitle{font-size:21px}}
@media(prefers-reduced-motion:reduce){#ravenSchool *{transition:none!important;animation:none!important}}
`;
function tutorialKeyLabel(s){
 const B=globalThis.REDLINE_BINDINGS;
 if(!B?.display)return s.keys;
 const replacing={
   'AIR BRAKE AND RECOVERY':[['SPACE','brake'],['R','recover']],
   'BOOST AND BOOST ENERGY':[['SHIFT','boost']],
   'FIRE A LASER':[['F','fire']],
   'FLOW ABILITIES':[['B','flowBoost'],['J','shield'],['H','emp'],['Z','reload']],
   'CHASE AND COCKPIT VIEWS':[['P','view'],['C','cameraZoom']],
   'DRONE FINISH, GHOST AND TIMES':[['L','livery'],['G','ghost']],
   'CONTROLS AND SETTINGS IN RACE':[['U','uiCursor'],['I','settings']],
   'MORE HELPFUL SHORTCUTS':[['Y','hud'],['M','mute'],['T','time'],['V','handling']],
   'RACE THE CLOCK':[['BACKSPACE','restart'],['G','ghost']]
 };
 let keys=s.keys;
 for(const [original,action] of replacing[s.title]||[]){
   try{const display=B.display(action);if(display&&display!==original)keys=keys.replace(new RegExp('\\b'+original+'\\b','g'),display);}catch{}
 }
 return keys;
}
function create(options={}){
 let active=false,index=0,practicing=false,practiceLeft=0,used=new Set(),el=null,highlight=null;
 function element(){if(!el){const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);el=document.createElement('div');el.id='ravenSchool';el.setAttribute('aria-label','Raven Sprint Flight School');el.innerHTML='<div class="ravenShade"></div><svg class="ravenArrow" aria-hidden="true"><defs><marker id="ravenArrowHead" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#ff4560" stroke="none"/></marker></defs><path id="ravenGuidePath" marker-end="url(#ravenArrowHead)"/></svg><div class="ravenAim"></div><div class="ravenCard" role="dialog" aria-label="Flight school tutorial" aria-modal="true"></div>';document.body.appendChild(el);highlight=el.querySelector('.ravenAim');el.addEventListener('click',e=>{const b=e.target.closest('[data-guide]');if(!b)return;const op=b.dataset.guide;if(op==='next')next();else if(op==='practice')practice();else if(op==='skip')finish(true);else if(op==='finishPractice')stopPractice();});}return el;}
 function render(){if(!active)return;const s=steps[index],root=element();root.classList.toggle('practicing',practicing);root.classList.add('active');const card=root.querySelector('.ravenCard');const esc=v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 card.innerHTML=`<div class="ravenKicker">REDLINE / FLIGHT SCHOOL · ${index+1} OF ${steps.length}</div><div class="ravenTitle">${esc(s.title)}</div><div class="ravenBody">${esc(s.desc)}</div><div class="ravenKeys">${esc(tutorialKeyLabel(s))}</div><div class="ravenProgress"><i style="width:${100*(index+1)/steps.length}%"></i></div><div class="ravenActions"><button data-guide="next">${index===steps.length-1?'START SPRINT':'NEXT LESSON →'}</button><button data-guide="practice" class="secondary">TRY IT FOR 8 SECONDS</button><button data-guide="finishPractice" class="secondary">${practicing?'END PRACTICE':'BACK TO LESSON'}</button><button data-guide="skip" class="secondary">SKIP TUTORIAL</button></div><div class="ravenFoot"><span>${practicing?`PRACTICE TIME ${Math.ceil(practiceLeft)}s`:'NO RACE TIME OR PENALTY DURING TRAINING'}</span><span>${used.size?'DETECTED: '+Array.from(used).slice(-2).join(' · '):'LEARN ONE SYSTEM AT A TIME'}</span></div>`;
 if(!practicing)position();}
 function position(){if(!active||practicing)return;const rect=document.querySelector(steps[index].target)?.getBoundingClientRect();if(!rect||!rect.width){highlight.style.display='none';return;}highlight.style.display='block';highlight.style.left=Math.max(2,rect.left-8)+'px';highlight.style.top=Math.max(2,rect.top-8)+'px';highlight.style.width=rect.width+16+'px';highlight.style.height=rect.height+16+'px';const card=el.querySelector('.ravenCard')?.getBoundingClientRect();const arrow=el.querySelector('#ravenGuidePath');if(card&&arrow){const sx=card.right,sy=card.top+Math.min(card.height*.50,100);const tx=rect.left+rect.width*.5,ty=rect.top+rect.height*.5;const bend=Math.max(35,Math.min(145,Math.abs(tx-sx)*.42));arrow.setAttribute('d',`M${sx} ${sy} C${sx+bend} ${sy},${tx-bend} ${ty},${tx} ${ty}`);}}
 function start(){active=true;practicing=false;practiceLeft=0;index=0;used.clear();element();options.onPause?.();render();window.addEventListener('resize',position);}
 function next(){if(!active)return;if(practicing)stopPractice();if(index>=steps.length-1){finish(false);return;}index++;used.clear();render();}
 function practice(){if(!active)return;practicing=true;practiceLeft=8;options.onResume?.();render();}
 function stopPractice(){if(!active)return;practicing=false;practiceLeft=0;options.onPause?.();render();}
 function tick(dt){if(!active)return;if(practicing){practiceLeft=Math.max(0,practiceLeft-Math.max(0,dt));if(practiceLeft<=0)stopPractice();else{const foot=el.querySelector('.ravenFoot span');if(foot)foot.textContent='PRACTICE TIME '+Math.ceil(practiceLeft)+'s';}}else position();}
 function noteAction(action){if(!active)return;used.add(action);if(practicing){const foot=el?.querySelector('.ravenFoot span:last-child');if(foot)foot.textContent='DETECTED: '+Array.from(used).slice(-2).join(' · ');}}
 function finish(skipped=false){if(!active)return;active=false;practicing=false;practiceLeft=0;el?.classList.remove('active','practicing');window.removeEventListener('resize',position);options.onFinish?.(skipped);}
 return {start,tick,noteAction,finish,next,practice,get active(){return active},get practicing(){return practicing},get step(){return index},get total(){return steps.length},steps};
}
return {create,steps};
});


