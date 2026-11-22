

/* REDLINE Raven Sprint: deterministic race rules and smooth ghost playback. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.REDLINE_RAVEN=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const SPRINT_LAST_GATE=3;
const MAX_LAPS={raven:1,grand:3};
function gateCount(course){return course==='raven'?SPRINT_LAST_GATE+1:12;}
function maxLaps(course){return MAX_LAPS[course]||3;}
function isFinish(course,nextGate,lap){return course==='raven'?nextGate>=gateCount(course):nextGate>=12&&lap>=3;}
function ghostSample(frames,t){
 if(!Array.isArray(frames)||!frames.length)return null;
 if(t<=frames[0][0])return frames[0].slice();
 const n=frames.length;if(t>=frames[n-1][0])return frames[n-1].slice();
 let lo=0,hi=n-1;while(lo+1<hi){const mid=(lo+hi)>>1;if(frames[mid][0]<t)lo=mid;else hi=mid;}
 const a=frames[lo],b=frames[hi],dt=Math.max(1e-6,b[0]-a[0]),u=Math.max(0,Math.min(1,(t-a[0])/dt));
 const out=[t];
 // Hermite spatial interpolation with velocities derived from neighboring samples.
 for(let axis=1;axis<=3;axis++){
  const prev=frames[Math.max(0,lo-1)],next=frames[Math.min(n-1,hi+1)];
  const m0=(b[axis]-prev[axis])/Math.max(.0001,b[0]-prev[0]);
  const m1=(next[axis]-a[axis])/Math.max(.0001,next[0]-a[0]);
  const u2=u*u,u3=u2*u;
  const p=(2*u3-3*u2+1)*a[axis]+(u3-2*u2+u)*dt*m0+(-2*u3+3*u2)*b[axis]+(u3-u2)*dt*m1;
  // Constrain overshoot to an interpolation envelope for collision readability.
  const margin=Math.max(1,Math.abs(b[axis]-a[axis])*.18);
  out.push(Math.max(Math.min(a[axis],b[axis])-margin,Math.min(Math.max(a[axis],b[axis])+margin,p)));
 }
 const dyaw=Math.atan2(Math.sin(b[4]-a[4]),Math.cos(b[4]-a[4]));out.push(a[4]+dyaw*u);
 out.push((a[5]||0)+((b[5]||0)-(a[5]||0))*u);
 return out;
}
function createSectors(names){let last=0;const splits=[];return{
 push(time){if(!Number.isFinite(time)||time<last)return null;const value=time-last;last=time;splits.push(value);return value;},
 list(){return splits.slice();},
 reset(){last=0;splits.length=0;},
 names:names||[]
};}
function prettyDelta(now,best){if(!Number.isFinite(best)||!Number.isFinite(now))return 'SET FIRST TIME';const d=now-best;return (d>0?'+':'−')+Math.abs(d).toFixed(1)+'s';}
return {SPRINT_LAST_GATE,gateCount,maxLaps,isFinish,ghostSample,createSectors,prettyDelta};
});


