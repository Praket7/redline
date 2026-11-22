

/* REDLINE v25 Flight Passport — browser-local, dependency-free progression and UI.
 * No game engine references here: safe to test in Node and reuse in future UI frameworks.
 */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root){let storage=null;try{storage=root.localStorage}catch{}root.REDLINE_PRODUCT=api.create(storage);}
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const KEY='redline_flight_passport_v25';
 const TRAILS=[
  {name:'ION BLUE',hex:0x91e9ff,xp:0,desc:'Factory ion exhaust'},
  {name:'REDLINE',hex:0xff4860,xp:120,desc:'High-energy crimson'},
  {name:'SOLAR GOLD',hex:0xffc16d,xp:320,desc:'Warm radiant trail'},
  {name:'VIOLET ARC',hex:0xbc8cff,xp:650,desc:'Spectral violet exhaust'}
 ];
 const COURSES=[
  {id:'raven',name:'RAVEN SPRINT',eyebrow:'01 / THE FIRST FLIGHT',length:'4 GATES',format:'POINT-TO-POINT',difficulty:'BEGINNER',summary:'Four sectors. One clean line. Chase your own best flight.',traits:['Fast restart','Personal best ghost','Flight School'],gold:55,silver:72,bronze:100},
  {id:'grand',name:'GRAND GORGE',eyebrow:'02 / ENDURANCE',length:'12 GATES',format:'3 LAPS',difficulty:'ADVANCED',summary:'The entire canyon. Multiple racing lines, rivals and the Broken Spillway.',traits:['Long-form race','Competitive AI','Canyon Clash'],gold:245,silver:310,bronze:400}
 ];
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const validTime=t=>Number.isFinite(t)&&t>0&&t<3600;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const formatTime=t=>validTime(t)?`${Math.floor(t/60)}:${(t%60).toFixed(1).padStart(4,'0')}`:'—';
 const medalFor=(course,t)=>{const c=COURSES.find(x=>x.id===course);if(!c||!validTime(t))return null;return t<=c.gold?'GOLD':t<=c.silver?'SILVER':t<=c.bronze?'BRONZE':'FINISHER';};
 const level=xp=>Math.floor(Math.sqrt(Math.max(0,xp)/100))+1;
 const thresholdForLevel=lv=>100*Math.pow(Math.max(0,lv-1),2);
 function defaults(){return {version:25,callsign:'PILOT',xp:0,credits:0,races:0,wins:0,training:'new',trail:0,records:{raven:{best:null,plays:0,medal:null,sectors:[]},grand:{best:null,plays:0,medal:null,sectors:[]}},badges:[],lastResult:null};}
 function create(storage){
  let data=defaults(),seen=new Set(),runKey=0;
  try{const saved=JSON.parse(storage?.getItem(KEY)||'null');if(saved&&typeof saved==='object'){
    const base=defaults();data={...base,...saved,records:{raven:{...base.records.raven,...saved.records?.raven},grand:{...base.records.grand,...saved.records?.grand}}};
    data.xp=clamp(Number(data.xp)||0,0,999999);data.credits=clamp(Number(data.credits)||0,0,999999);
    data.callsign=String(data.callsign||'PILOT').replace(/[^a-zA-Z0-9 _-]/g,'').slice(0,16)||'PILOT';
    data.trail=clamp(Number(data.trail)||0,0,TRAILS.length-1);
  }}catch{}
  // Older local best-lap files remain authoritative for ghosts. Import best time for display only.
  for(const [course,key] of [['raven','redline_raven_sprint_v22_records'],['grand','redline_geologic_v3_records']]){
    try{const old=JSON.parse(storage?.getItem(key)||'null');if(validTime(Number(old?.best))&&(!validTime(data.records[course].best)||old.best<data.records[course].best)){
      data.records[course].best=Number(old.best);if(!data.records[course].medal)data.records[course].medal=medalFor(course,Number(old.best));
    }}catch{}
  }
  if(TRAILS[data.trail].xp>data.xp)data.trail=0;
  const save=()=>{try{storage?.setItem(KEY,JSON.stringify(data));return true}catch{return false}};
  function beginRun(){runKey++;return runKey;}
  function callsign(name){const safe=String(name||'').trim().replace(/[^a-zA-Z0-9 _-]/g,'').slice(0,16);if(!safe)return false;data.callsign=safe;save();return true;}
  function setTrail(i){i=Number(i);if(!Number.isInteger(i)||i<0||i>=TRAILS.length||data.xp<TRAILS[i].xp)return false;data.trail=i;save();return true;}
  function training(completed){if(completed&&data.training!=='complete'){
    data.training='complete';data.xp+=60;data.credits+=30;data.badges=[...new Set([...data.badges,'FLIGHT SCHOOL'])];save();return true;
   }if(!completed&&data.training==='new'){data.training='skipped';save();}return false;}
  function result(payload){
   const p=payload||{},time=Number(p.time),course=p.course;
   if(!COURSES.some(x=>x.id===course)||!validTime(time)||p.online)return null;
   const key=p.runId??runKey;if(seen.has(key))return data.lastResult;seen.add(key);
   const r=data.records[course],prior=r.best,personalBest=!validTime(prior)||time<prior-.0001;
   if(personalBest)r.best=time;
   r.plays++;data.races++;
   const rank=clamp(Number(p.rank)||99,1,99),won=rank===1&&Number(p.opponents)>0;
   if(won)data.wins++;
   r.medal=medalFor(course,r.best);
   const sectorTimes=Array.isArray(p.sectors)?p.sectors.filter(x=>Number.isFinite(x)&&x>=0).slice(0,12):[];
   if(personalBest&&sectorTimes.length)r.sectors=sectorTimes;
   const gain=40+(personalBest?55:0)+(won?25:rank<=3&&Number(p.opponents)>0?10:0)+(course==='grand'?30:0);
   data.xp+=gain;data.credits+=Math.round(gain*.5);
   if(data.races===1)data.badges=[...new Set([...data.badges,'FIRST FLIGHT'])];
   if(won)data.badges=[...new Set([...data.badges,'CANYON WINNER'])];
   if(r.medal==='GOLD')data.badges=[...new Set([...data.badges,course==='raven'?'RAVEN GOLD':'GORGE GOLD'])];
   data.lastResult={course,time,rank,priorBest:validTime(prior)?prior:null,personalBest,medal:medalFor(course,time),xp:gain,credits:Math.round(gain*.5),sectors:sectorTimes,runId:key};
   save();return {...data.lastResult};
  }
  function snapshot(){return JSON.parse(JSON.stringify(data));}
  function trailHex(){return TRAILS[data.trail]?.hex??TRAILS[0].hex;}
  function levelProgress(){const lv=level(data.xp),from=thresholdForLevel(lv),to=thresholdForLevel(lv+1);return {level:lv,percent:clamp((data.xp-from)/(to-from)*100,0,100),next:to-data.xp};}
  function passportRibbon(){const l=levelProgress();return `<div class="v25-passport-ribbon"><span class="v25-callsign">${esc(data.callsign)} <small>LEVEL ${l.level}</small></span><span class="v25-mini-meter"><i style="width:${l.percent}%"></i></span><span class="v25-passport-info">${data.races} RACES <b>·</b> ${data.wins} WINS</span><button class="v25-small-action" data-op="career">FLIGHT PASSPORT ↗</button></div>`;}
  const REDLINE_V34_RAVEN_ART='{{REDLINE_ASSET_53c0fc5de62e58}}';
  const REDLINE_V34_GORGE_ART='{{REDLINE_ASSET_e91a5fc1b6b91d}}';
  // v34: two visual decisions instead of a wall of course descriptions.
  // The Grand preview is a real in-game frame; Raven is explicitly labeled route art.
  function courseDeck(selected){
   const art=[REDLINE_V34_RAVEN_ART,REDLINE_V34_GORGE_ART];
   return `<div class="v25-course-deck rl34-course-deck" role="group" aria-label="Select a racing circuit">${COURSES.map((c,i)=>{
    const r=data.records[c.id],active=selected===c.id;
    return `<button type="button" class="v25-course-card rl34-course-card ${active?'selected':''}" data-course="${i}" aria-pressed="${active}"><span class="rl34-course-image"><img src="${art[i]}" alt="${i===0?'Illustrated Raven Sprint industrial coastal route':'Grand Gorge in-game canyon view'}" draggable="false"/><span class="rl34-image-label">${i===0?'ROUTE ART':'IN-GAME VIEW'}</span></span><span class="rl34-course-info"><span class="v25-course-num">0${i+1} / ${i===0?'SPRINT':'CIRCUIT'}</span><span class="v25-course-title">${esc(c.name)}</span><span class="v25-course-meta">${i===0?'4 GATES · POINT TO POINT':'12 GATES · 3 LAPS'}</span><span class="rl34-course-record">BEST ${formatTime(r.best)}<span>${active?'SELECTED':'SELECT ↗'}</span></span></span></button>`;
   }).join('')}</div>`;
  }
  function trailPicker(){return `<div class="v25-trail-grid" role="group" aria-label="Select boost trail color">${TRAILS.map((t,i)=>{const locked=data.xp<t.xp;return `<button type="button" class="v25-trail-card ${data.trail===i?'selected':''}" data-trail="${i}" ${locked?'disabled':''} aria-pressed="${data.trail===i}" title="${esc(t.desc)}"><span class="v25-trail-sample" style="--trail:#${t.hex.toString(16).padStart(6,'0')}"></span><span>${esc(t.name)}</span><small>${locked?`${t.xp} XP TO UNLOCK`:data.trail===i?'EQUIPPED':'AVAILABLE'}</small></button>`}).join('')}</div>`;}
  function garageModule(){return `<section class="v25-garage-personalize"><div class="v25-module-heading"><b>PILOT IDENTITY</b><span>LOCAL PROFILE / COSMETIC ONLY</span></div><label class="v25-call-label" for="v25Callsign">CALLSIGN</label><input id="v25Callsign" class="v25-callsign-input" type="text" maxlength="16" spellcheck="false" value="${esc(data.callsign)}" aria-label="Pilot callsign"/><p class="v25-sub">Your name appears on the Flight Passport and result card. Paint finishes and trails do not change drone speed.</p><div class="v25-module-heading"><b>BOOST TRAIL</b><span>${data.xp} FLIGHT XP</span></div>${trailPicker()}</section>`;}
  function careerScreen(){const l=levelProgress();return `<div class="rl-layout v25-career"><button class="rl-back" data-op="home">← MAIN MENU</button><div class="rl-overline">PILOT DEVELOPMENT / LOCAL SAVE</div><h1 class="rl-section-title">FLIGHT PASSPORT</h1><p class="rl-section-desc">Your racing history, best sectors, and earned visual rewards. All progress is stored on this device.</p><div class="v25-career-hero"><div><span class="v25-kicker">ACTIVE PILOT</span><h2>${esc(data.callsign)}</h2><p>LEVEL ${l.level} / ${data.xp} XP</p><div class="v25-progress"><i style="width:${l.percent}%"></i></div><small>${l.next} XP TO NEXT LEVEL</small></div><div class="v25-career-numbers"><span><b>${data.races}</b>RACES</span><span><b>${data.wins}</b>WINS</span><span><b>${data.credits}</b>FLIGHT MARKS</span></div></div><div class="v25-section-title">YOUR CIRCUITS</div><div class="v25-course-records">${COURSES.map(c=>{const r=data.records[c.id];return `<article><span class="v25-kicker">${esc(c.eyebrow)}</span><h3>${esc(c.name)}</h3><strong>${formatTime(r.best)}</strong><p>${r.plays} COMPLETED RUNS · ${r.medal||'NO MEDAL'}</p><p>MEDAL TARGETS: GOLD ${formatTime(c.gold)} · SILVER ${formatTime(c.silver)} · BRONZE ${formatTime(c.bronze)}</p></article>`}).join('')}</div><div class="v25-section-title">MILESTONES</div><div class="v25-badges">${['FIRST FLIGHT','FLIGHT SCHOOL','CANYON WINNER','RAVEN GOLD','GORGE GOLD'].map(b=>`<span class="${data.badges.includes(b)?'earned':'locked'}">${data.badges.includes(b)?'✦':'◇'} ${b}</span>`).join('')}</div><p class="v25-sub">Flight Marks are a career statistic; they cannot be purchased or spent. Cosmetic trails unlock automatically through XP. No gameplay advantages are tied to progression.</p><div class="rl-btnrow"><button class="rl-action primary" data-op="solo">CHOOSE YOUR NEXT RACE ↗</button><button class="rl-action" data-op="academy">OPEN FLIGHT SCHOOL</button></div></div>`;}
  function academyScreen(){return `<div class="rl-layout v25-academy"><button class="rl-back" data-op="solo">← BACK TO GARAGE</button><div class="rl-overline">FLIGHT ACADEMY / RAVEN SPRINT</div><h1 class="rl-section-title">LEARN TO FLY.</h1><p class="rl-section-desc">One system at a time. You can practice without losing race time, then begin a four-gate run with a fresh clock.</p><div class="v25-academy-layout"><div class="v25-academy-hero"><span class="v25-kicker">YOUR FIRST MISSION</span><h2>CONTROL THE CANYON</h2><p>Learn movement, altitude, camera views, aiming, Flow abilities, checkpoints and recovery. Each lesson points directly to the game interface.</p><div class="v25-lesson-row"><span>01 — MOVEMENT & ALTITUDE</span><span>02 — SPEED & CORNERS</span><span>03 — AIMING & COMBAT</span><span>04 — RACING & REPLAY</span></div><button class="rl-action primary" data-op="trainingFromGarage">${data.training==='complete'?'REPLAY GUIDED FLIGHT SCHOOL':'START GUIDED FLIGHT SCHOOL'} ↗</button></div><aside class="v25-academy-aside"><div class="v25-kicker">TRAINING STATUS</div><h3>${data.training==='complete'?'GRADUATED':data.training==='skipped'?'NOT COMPLETED':'READY TO LEARN'}</h3><p>Finish all 16 guided lessons to earn your Flight School badge and 60 XP. Skipping does not award the badge.</p><div class="v25-academy-check">✦ 16 CONTEXTUAL LESSONS</div><div class="v25-academy-check">✦ PAUSED PRACTICE WINDOWS</div><div class="v25-academy-check">✦ CUSTOM KEYBIND SUPPORT</div></aside></div></div>`;}
  function resultSummary(){const r=data.lastResult;if(!r)return '';const record=data.records[r.course];const l=levelProgress();const delta=validTime(r.priorBest)?r.time-r.priorBest:null;return `<section class="v25-result-module"><div class="v25-result-head"><span>FLIGHT PASSPORT / MISSION REPORT</span><span>LEVEL ${l.level} · ${data.xp} XP</span></div><div class="v25-result-tiles"><div><small>THIS FLIGHT</small><b>${formatTime(r.time)}</b><span>${r.medal}</span></div><div><small>PERSONAL BEST</small><b>${formatTime(record.best)}</b><span>${r.personalBest?'NEW RECORD':'RECORD STANDS'}</span></div><div><small>TIME VS PRIOR BEST</small><b>${delta===null?'FIRST RUN':(delta>0?'+':'')+delta.toFixed(1)+'s'}</b><span>${delta!==null&&delta<0?'FASTER FLIGHT':'KEEP CHASING'}</span></div><div><small>PROGRESSION</small><b>+${r.xp} XP</b><span>+${r.credits} FLIGHT MARKS</span></div></div>${r.sectors.length?`<div class="v25-splits">${r.sectors.map((t,i)=>`<span>SECTOR ${i+1}<b>${formatTime(t)}</b></span>`).join('')}</div>`:''}<div class="v25-result-goal">${r.course==='raven'?'NEXT CHALLENGE: FLY A CLEANER RAVEN SPRINT AND BEAT YOUR GHOST.':'NEXT CHALLENGE: RETURN TO THE CANYON AND IMPROVE YOUR ENDURANCE TIME.'}</div></section>`;}
  return {beginRun,callsign,setTrail,training,result,snapshot,levelProgress,trailHex,passportRibbon,courseDeck,garageModule,careerScreen,academyScreen,resultSummary,formatTime,medalFor,TRAILS,COURSES};
 }
 return {create,TRAILS,COURSES,medalFor,formatTime,level};
});


