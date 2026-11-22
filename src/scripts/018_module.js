

/* REDLINE Stage 3: fully synthetic, original layered rotor, drive, airflow, river and impact audio.
   All audio is user-gesture initiated, gain-limited and mutes with the game setting. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.REDLINE_AUDIO=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function create(env=globalThis){let ctx=null,out=null,rotor=null,harmonic=null,wind=null,river=null,muted=false,volume=.6;
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function build(){if(ctx)return true;const AC=env.AudioContext||env.webkitAudioContext;if(!AC)return false;
  ctx=new AC();out=ctx.createGain();out.gain.value=volume;const limiter=ctx.createDynamicsCompressor();
  limiter.threshold.value=-14;limiter.knee.value=14;limiter.ratio.value=8;limiter.attack.value=.004;limiter.release.value=.16;
  out.connect(limiter);limiter.connect(ctx.destination);
  function oscillator(type,freq,gain){const s=ctx.createOscillator(),f=ctx.createBiquadFilter(),v=ctx.createGain();s.type=type;s.frequency.value=freq;f.type='lowpass';f.frequency.value=840;v.gain.value=gain;s.connect(f);f.connect(v);v.connect(out);s.start();return{s,f,v};}
  rotor=oscillator('sawtooth',78,.001);harmonic=oscillator('triangle',155,.001);
  const n=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.7),ctx.sampleRate),a=n.getChannelData(0);
  for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*(.75+.25*Math.sin(i*.0005));
  function noise(kind,frequency){const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=n;src.loop=true;f.type=kind;f.frequency.value=frequency;g.gain.value=.001;src.connect(f);f.connect(g);g.connect(out);src.start();return{src,f,g};}
  wind=noise('bandpass',480);river=noise('lowpass',170);return true;
 }
 function start(){try{if(build()&&ctx.state==='suspended')ctx.resume();return !!ctx}catch(e){return false}}
 function update(s={}){if(!ctx)return;const t=ctx.currentTime,v=cl(Math.abs(s.speed||0),0,360)/220,b=s.boost?1:0,on=s.active?1:0;
  out.gain.setTargetAtTime(muted?0:cl(volume,0,1)*.75,t,.08);
  rotor.s.frequency.setTargetAtTime(72+v*115+b*42,t,.055);rotor.f.frequency.setTargetAtTime(320+v*520+b*220,t,.09);
  rotor.v.gain.setTargetAtTime(on?(.014+v*.024+b*.018):.002,t,.1);
  harmonic.s.frequency.setTargetAtTime(144+v*230+b*80,t,.06);harmonic.v.gain.setTargetAtTime(on?(.006+v*.011):.001,t,.10);
  wind.f.frequency.setTargetAtTime(240+v*850+b*240,t,.11);wind.g.gain.setTargetAtTime(on?(.006+v*.021+b*.011):.001,t,.18);
  river.g.gain.setTargetAtTime(on?.006*cl(1-(s.altitude||70)/90,0,1):.0005,t,.3);
 }
 function play(type='laser'){if(!ctx||muted)return false;const t=ctx.currentTime,osc=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain();
  const spec={laser:[830,125,.19,.085],hit:[320,64,.27,.13],crash:[150,24,.55,.23],shield:[530,950,.15,.07],checkpoint:[480,1080,.16,.07],respawn:[140,630,.40,.075],boost:[280,460,.30,.06]};
  const [a,b,d,amp]=spec[type]||spec.laser;osc.type=type==='crash'?'sawtooth':'triangle';osc.frequency.setValueAtTime(a,t);osc.frequency.exponentialRampToValueAtTime(b,t+d);f.type='lowpass';f.frequency.value=1800;g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(amp,t+.018);g.gain.exponentialRampToValueAtTime(.0001,t+d);
  osc.connect(f);f.connect(g);g.connect(out);osc.start(t);osc.stop(t+d+.02);osc.onended=()=>{osc.disconnect();f.disconnect();g.disconnect()};return true;
 }
 return {start,update,play,setVolume(v){volume=clamp(+v||0,0,1)},setMuted(v){muted=!!v},get running(){return !!ctx&&ctx.state==='running'},get context(){return ctx}};
}
return {create};
});


