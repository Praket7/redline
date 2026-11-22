
/* Live display layer: reads state; never modifies physics, simulation, or input. */
(()=>{
 const root=document.getElementById('rlPersistent');
 if(!root)return;
 const holder=document.createElement('div');
 holder.id='rl74Cockpit';holder.setAttribute('aria-hidden','true');
 holder.innerHTML=window.__REDLINE_V74_MARKUP__;
 root.insertBefore(holder,root.firstChild);
 delete window.__REDLINE_V74_MARKUP__;
 const el=id=>document.getElementById(id);
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,Number(n)||0));
 const update=(air,s)=>{
  if(!s)return;
  if(air!=='blade'&&air!=='spirit'&&air!=='kestrel')return;
  const cap=air[0].toUpperCase()+air.slice(1),prefix='v74'+cap;
  const speed=Math.max(0,Number(s.speed)||0);
  const altitude=Math.max(0,Number(s.altitude)||0);
  const boost=clamp(s.boost,0,100);
  const maxSpeed=Math.max(140,Number(s.maxSpeed)||240);
  const txt=(suffix,value)=>{const node=el(prefix+suffix);if(node)node.textContent=String(value)};
  txt('Speed',Math.round(speed));txt('Alt',Math.round(altitude));txt('Boost',Math.round(boost)+'%');
  const fill=el(prefix+'SpeedFill');
  if(fill)fill.setAttribute('width',String(Math.round(247*clamp(speed/maxSpeed,0,1))));
  const arc=el(prefix+'Arc');
  if(arc)arc.setAttribute('stroke-dasharray',Math.round(clamp(speed/maxSpeed,0,1)*100)+' 100');
  const bars=el(prefix+'Bars');
  if(bars)Array.from(bars.children).forEach((r,i)=>{
   const on=boost>=i*20+8;
   r.setAttribute('opacity',on?'1':'.16');
  });
 };
 window.REDLINE_V74_COCKPITS=Object.freeze({update,ready:()=>!!el('rl74Kestrel'),version:'v74'});
})();
