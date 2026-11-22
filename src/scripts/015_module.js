

/* REDLINE tactical parity: identical boost energy drain/recharge for human and AI. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.REDLINE_AI=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function cruise(mode='easy',thrust=80){
 const e=globalThis.REDLINE_FLIGHT?.speedEnvelope?.(mode,thrust);
 if(e)return e.maxCruise;
 const t=thrust/100;return mode==='easy'?112+t*24:mode==='sport'?153+t*43:157+t*79;
}
function boostExtra(mode='easy'){return globalThis.REDLINE_FLIGHT?.speedEnvelope?.(mode,80)?.boostExtra??(mode==='easy'?48:mode==='sport'?72:118);}
function stepEnergy(state,dt,request){
 if(!request)state.boostLocked=false;
 const active=!!request&&!state.boostLocked&&(state.energy??0)>0;
 state.energy=clamp((state.energy??1)+(active?-.16:.38)*dt,0,1);
 if(active&&state.energy<=0){state.boostLocked=true;state.energy=0;}
 state.boosting=active&&!state.boostLocked;
 return state.boosting;
}
function chooseBoost(state,{straight=0,urgency=0,threat=0}={}){
 // Hysteresis creates readable bursts instead of one-frame oscillations.
 // No free energy: the human and rivals still use the same drain/recharge.
 if(state.boostPlanActive){
  if(state.energy<.075||straight<.46||threat>.64)state.boostPlanActive=false;
 }else if(state.energy>.20&&straight>.58&&urgency>.25&&threat<.54){
  state.boostPlanActive=true;
 }
 return !!state.boostPlanActive;
}

// Smooth player ability over seconds, not frames; this is for pace decisions only.
function smoothSpeed(previous,speed,dt,responseSeconds=3.4){
 const valid=Number.isFinite(speed)?clamp(speed,0,450):0;
 if(!Number.isFinite(previous)||previous<=0)return valid;
 return previous+(valid-previous)*(1-Math.exp(-Math.max(0,dt)/responseSeconds));
}
function competitiveTarget({base=100,player=0,playerProgress=0,botProgress=0,index=0,cruiseCap=120,boostCap=50,boosting=false}={}){
 // Adaptive throttle ONLY: progress is never advanced artificially.
 // Faster players demand harder races, but each rival stays inside the
 // player-equivalent cruise/boost speed envelope and spends real energy.
 const distance=clamp(playerProgress-botProgress,-.18,.18);
 const personality=[.988,1.025,1.065][index]||1;
 const catchUp=clamp(distance*.35,-.015,.052);
 const playerMatch=player*(boosting?1.015:.975);
 const plan=base*(boosting?1.205:1.025);
 const commanded=Math.max(plan,playerMatch)*(personality+catchUp);
 const permitted=cruiseCap+(boosting?boostCap:0);
 return clamp(commanded,0,permitted);
}
function spendFlow(bot,cost){if((bot.flow||0)<cost)return false;bot.flow-=cost;return true;}
function gainFlow(bot,amount){bot.flow=clamp((bot.flow||0)+amount,0,100);return bot.flow;}
function targetPace(mode,thrust=80,personality=1){return cruise(mode,thrust)*clamp(personality,.84,1.08);}
function steerLaneOffset(current,desired,dt,rate=2){return current+(desired-current)*(1-Math.exp(-rate*dt));}
return {cruise,boostExtra,stepEnergy,chooseBoost,smoothSpeed,competitiveTarget,spendFlow,gainFlow,targetPace,steerLaneOffset};
});


