/* REDLINE v41 / Race Result Presentation
 * Shared by solo and online results. Pure HTML formatter: no game state mutations.
 */
(function(root){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const time=v=>{
  if(!Number.isFinite(v)||v<0)return '—';
  const minutes=Math.floor(v/60),seconds=(v%60).toFixed(1).padStart(4,'0');
  return `${minutes}:${seconds}`;
 };
 const ordinal=n=>n%100>=11&&n%100<=13?'TH':n%10===1?'ST':n%10===2?'ND':n%10===3?'RD':'TH';
 function render(data={}){
  const online=!!data.online,trial=!!data.trial,rank=Math.max(1,Math.round(Number(data.rank)||1));
  const rows=(Array.isArray(data.rows)?data.rows:[]).slice(0,12);
  const playerTime=Number.isFinite(data.time)?data.time:null;
  const best=Number.isFinite(data.best)?data.best:null;
  const xp=Math.max(0,Math.round(Number(data.xp)||0));
  const place=String(rank).padStart(2,'0');
  const rankedLabel=trial?'TIME TRIAL':rank===1?'RACE WINNER':rank<=3?'PODIUM FINISH':'RACE COMPLETE';
  const circuit=esc(data.course||'GRAND GORGE');
  const title=online?'LIVE RACE RESULTS':'OFFICIAL RACE RESULTS';
  const tagline=online?'PRIVATE LOBBY · UNRANKED':`${esc(data.airframe||'KESTREL X4')} · ${circuit}`;
  const rivals=rows.length>1;
  const firstFinished=rows.find(r=>Number.isFinite(r.time))?.time;
  const standings=rows.map((r,i)=>{
   const me=!!r.me,valid=Number.isFinite(r.time);
   const delta=valid&&Number.isFinite(firstFinished)?Math.max(0,r.time-firstFinished):null;
   const stamp=valid?time(r.time):'RACING';
   const gap=valid&&i>0&&delta>0?`<small class="rl41-gap">+${delta.toFixed(1)}s</small>`:'';
   return `<div class="rl41-standing ${me?'is-me':''}" ${me?'aria-current="true"':''}>
     <span class="rl41-standing-rank">${String(i+1).padStart(2,'0')}</span>
     <span class="rl41-standing-name">${esc(r.name||'PILOT')}${me&&String(r.name||'').toUpperCase()!=='YOU'?'<i>YOU</i>':''}</span>
     <span class="rl41-standing-clock">${stamp}${gap}</span>
    </div>`;
  }).join('');
  const sectors=(Array.isArray(data.sectors)?data.sectors:[]).filter(x=>Number.isFinite(x)&&x>=0).slice(0,12);
  const details=(!online&&(sectors.length||data.medal||Number.isFinite(data.priorBest)))?`<details class="rl41-detail">
    <summary>FLIGHT DATA <span>EXPAND <span aria-hidden="true">+</span></span></summary>
    <div class="rl41-detail-body">
     <div class="rl41-detail-stats">
      ${data.medal?`<span><small>MEDAL</small><b>${esc(data.medal)}</b></span>`:''}
      ${Number.isFinite(data.priorBest)?`<span><small>PREVIOUS BEST</small><b>${time(data.priorBest)}</b></span>`:''}
      ${Number.isFinite(data.priorBest)&&playerTime!==null?`<span><small>DELTA</small><b>${playerTime-data.priorBest>0?'+':''}${(playerTime-data.priorBest).toFixed(1)}s</b></span>`:''}
     </div>
     ${sectors.length?`<div class="rl41-sector-grid">${sectors.map((x,i)=>`<span><small>S${String(i+1).padStart(2,'0')}</small><b>${time(x)}</b></span>`).join('')}</div>`:''}
    </div>
   </details>`:'';
  const buttons=online?
   `<button class="rl-action primary" data-op="net-new"><b>NEW PARTY</b><span class="rl-arrow">↗</span></button>
    <button class="rl-action" data-op="net-leave-home"><b>MAIN MENU</b><span class="rl-arrow">⌂</span></button>`:
   `<button class="rl-action primary" data-op="replay"><b>RACE AGAIN</b><span class="rl-arrow">↻</span></button>
    <button class="rl-action" data-op="solo"><b>CHANGE DRONE</b><span class="rl-arrow">↗</span></button>
    <button class="rl-action rl41-home-btn" data-op="home"><b>MAIN MENU</b><span class="rl-arrow">⌂</span></button>`;
  const badges=[
   data.personalBest?'<span class="rl41-chip hot">★ NEW PERSONAL BEST</span>':'',
   best!==null?`<span class="rl41-chip">BEST <strong>${time(best)}</strong></span>`:'',
   !online?`<span class="rl41-chip">XP <strong>+${xp}</strong></span>`:'',
   online&&data.room?`<span class="rl41-chip">ROOM <strong>${esc(data.room)}</strong></span>`:''
  ].filter(Boolean).join('');
  return `<div class="rl-layout rl41-result">
   <div class="rl41-result-heading"><span class="rl41-eyebrow">REDLINE <b>/</b> ${title}</span><span class="rl41-mode">${tagline}</span></div>
   <div class="rl41-results-grid">
    <section class="rl41-hero" aria-label="Your race result">
     <span class="rl41-hero-kicker">${rankedLabel}</span>
     <div class="rl41-place-line"><strong class="rl41-place">${place}</strong><span class="rl41-ordinal">${trial?'SOLO':ordinal(rank)}<small>${trial?'SESSION':'PLACE'}</small></span></div>
     <div class="rl41-red-rule" aria-hidden="true"></div>
     <div class="rl41-time-caption">TOTAL RACE TIME</div>
     <div class="rl41-big-time">${playerTime!==null?time(playerTime):(online?'PENDING':'—')}<span>${playerTime!==null?'MIN:SEC / RACE CLOCK':''}</span></div>
     <div class="rl41-chips">${badges}</div>
     <div class="rl41-hero-footer">${online?'RACE VERIFIED · LIVE UPDATES':'FLIGHT COMPLETE · NEXT RUN READY'}</div>
    </section>
    <section class="rl41-board" aria-label="Race standings">
     <header class="rl41-board-title"><span>FINAL ORDER</span><b>${String(rows.length).padStart(2,'0')} PILOTS</b></header>
     ${rivals?`<div class="rl41-board-list">${standings}</div>`:`<div class="rl41-solo-status"><span class="rl41-solo-check">✓</span><span>FLIGHT RECORDED<small>BEAT YOUR TIME ON THE NEXT RUN</small></span></div>`}
     ${online?'<p class="rl41-online-note">Movement is client-reported. Private playtest results are unranked.</p>':''}
    </section>
   </div>
   ${details}
   <footer class="rl41-result-footer"><div class="rl41-result-actions">${buttons}</div><span class="rl41-build-mark">REDLINE / FLIGHT SYSTEMS</span></footer>
  </div>`;
 }
 root.REDLINE_RESULT_VIEW=render;
 root.REDLINE_RESULT_FORMAT_TIME=time;
})(typeof window!=='undefined'?window:globalThis);
