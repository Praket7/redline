/* REDLINE v61 — one authoritative flight profile registry.
 * Real performance facts are inspirations, never direct conversions of game-world u/s.
 * All UI metrics derive from the same tuning inputs used by REDLINE_FLIGHT.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.REDLINE_AIRFRAMES=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const profiles=Object.freeze({
    kestrel:Object.freeze({id:'kestrel',name:'KESTREL X4',role:'PRECISION QUAD',description:'Tight lines and immediate corrections. Fast yaw, fast climb, short-run boost.',
      cruise:.91,boost:.90,accel:1.01,turn:1.28,turnG:1.30,yawResponse:1.14,grip:1.17,lateral:1.13,
      strafe:1.07,strafeTau:.083,vertical:1.17,bank:1.02,brake:1.10,coast:.88,boostDrain:.145,boostRegen:.42,accent:'#ff505c'}),
    blade:Object.freeze({id:'blade',name:'BLADE NOIR',role:'GRAVITY HOVERCRAFT',description:'Explosive launch, fast sideways moves and controlled hover-drift. Slower pivots.',
      cruise:1.10,boost:1.05,accel:1.27,turn:.88,turnG:.88,yawResponse:.86,grip:.77,lateral:.92,
      strafe:1.26,strafeTau:.115,vertical:.83,bank:.64,brake:1.14,coast:1.16,boostDrain:.215,boostRegen:.35,accent:'#ff9c62'}),
    copper:Object.freeze({id:'copper',name:'COPPER WRAITH',role:'ION INTERCEPTOR',description:'Aggressive directional turns with the hardest burst. Strong boost, weaker strafe.',
      cruise:1.14,boost:1.25,accel:1.13,turn:1.13,turnG:1.07,yawResponse:1.25,grip:.94,lateral:1.03,
      strafe:.67,strafeTau:.125,vertical:1.03,bank:1.25,brake:.98,coast:1.07,boostDrain:.285,boostRegen:.31,accent:'#f0a46e'}),
    delorean:Object.freeze({id:'delorean',name:'DELOREAN DMC-12',role:'REAR-BIASED VECTOR HOVER',description:'Four wheel-mounted ion jets. Heavy turn-in, deliberate drift, powerful strafing and a strong time-drive boost.',
      cruise:1.04,boost:1.30,accel:.92,turn:.84,turnG:.97,yawResponse:.78,grip:.99,lateral:.96,
      strafe:1.34,strafeTau:.15,vertical:.91,bank:.58,brake:1.18,coast:1.19,boostDrain:.18,boostRegen:.32,accent:'#72dfff'}),
    spirit:Object.freeze({id:'spirit',name:'SPIRIT NOCTURNE',role:'LONG-RANGE FLYING WING',description:'Highest sustained straight-line speed; responsive banking and tighter directional control.',
      cruise:1.28,boost:.71,accel:.77,turn:1.04,turnG:1.18,yawResponse:1.36,grip:1.32,lateral:1.24,
      strafe:.48,strafeTau:.18,vertical:.67,bank:.43,brake:.74,coast:1.35,boostDrain:.10,boostRegen:.27,accent:'#a6c3cb'})
  });
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function get(id){return profiles[id]||profiles.kestrel;}
  function rawEnvelope(mode='easy',thrust=80){
    const t=clamp(thrust,0,100)/100;
    return {
      maxCruise:mode==='easy'?112+t*24:153+t*43,
      boostExtra:mode==='easy'?48:72,
      acceleration:mode==='easy'?94+t*20:115+t*32
    };
  }
  function envelope(mode='easy',thrust=80,id='kestrel'){
    const p=get(id),b=rawEnvelope(mode,thrust);
    return {maxCruise:b.maxCruise*p.cruise,boostExtra:b.boostExtra*p.boost,acceleration:b.acceleration*p.accel};
  }
  function stats(id='kestrel',mode='easy',thrust=80,agility=75){
    const p=get(id),e=envelope(mode,thrust,id),a=clamp(agility,0,100)/100;
    const lateralBudget=(mode==='easy'?318:mode==='sport'?362:391)*(.88+a*.22)*p.turnG;
    const mechanicalRate=(mode==='easy'?2.82:mode==='sport'?3.08:3.34)*(.76+a*.32)*p.turn;
    const turnCap=Math.min(mechanicalRate,lateralBudget/120);
    const strafe=(mode==='easy'?66:mode==='sport'?78:88)*p.strafe;
    return {name:p.name,role:p.role,description:p.description,
      cruise:Math.round(e.maxCruise),boostSpeed:Math.round(e.maxCruise+e.boostExtra),
      acceleration:Math.round(e.acceleration),turnDeg:Math.round(turnCap*180/Math.PI),
      strafe:Math.round(strafe),boostSeconds:+(1/p.boostDrain).toFixed(1),rechargeSeconds:+(1/p.boostRegen).toFixed(1),
      yawMultiplier:p.turn,turnAcceleration:p.turnG,accent:p.accent};
  }
  return Object.freeze({get,envelope,stats,all:profiles});
});


/* REDLINE Flight Feel Remaster — isolated, testable arcade flight dynamics.
 * Runs in browsers and Node. Coordinates: forward=(-sin(yaw),0,-cos(yaw)).
 * Units follow the existing game world. These are perceptual handling values,
 * not a claim that a drone flies at hundreds of real-world m/s.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  if(root)root.REDLINE_FLIGHT=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const AIRFRAMES=(typeof globalThis!=='undefined'&&globalThis.REDLINE_AIRFRAMES)||(typeof require==='function'?require('./09_airframe_profiles.js'):null);
  const C={
    fixedHz:120, maxSteps:8,
    steerRise:0.043,steerRelease:0.064,
    // Faster angular braking reduces the tail of a released turn, not its peak yaw authority.
    yawAccel:13.8,yawBrake:26.0,
    yawSpeedScale:1.0,
    // Slight arcade traction assist keeps the velocity vector close to the nose.
    lateralGrip:14.8,lateralAccel:810,
    headingGain:5.55,turnAccelerationEasy:318,turnAccelerationSport:362,turnAccelerationExpert:391,
    bankStiffness:14.8,bankDamping:1.04,bankAngle:0.60,
    pitchResponse:11.4,
    cameraFollow:0.115,cameraRecover:0.038,cameraVertical:0.16,
    cameraLookahead:0.055
  };
  function speedEnvelope(mode='easy',thrust=80,airframe='kestrel'){
    return AIRFRAMES.envelope(mode,thrust,airframe);
  }
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const approach=(v,t,max)=>v<t?Math.min(t,v+max):Math.max(t,v-max);
  const damp=(v,t,tau,dt)=>v+(t-v)*(1-Math.exp(-dt/Math.max(0.008,tau)));
  function createFlight(){return {
    x:0,y:86,z:600,yaw:0,speed:0,vx:0,vz:0,vy:0,roll:0,pitch:0,
    turnRate:0,steerFiltered:0,strafeSpeed:0,bankVelocity:0,ax:0,ay:0,az:0,yawAccel:0,energy:1,boosting:false,
    boostLocked:false,throttle:0,lift:0,distance:0,_accumulator:0,
    _prevX:0,_prevY:86,_prevZ:600,renderX:0,renderY:86,renderZ:600
  };}
  function resetTransients(f){
    f.turnRate=0;f.steerFiltered=0;f.strafeSpeed=0;f.bankVelocity=0;f.ax=f.ay=f.az=f.yawAccel=0;f._accumulator=0;
    f._prevX=f.x;f._prevY=f.y;f._prevZ=f.z;
    f.renderX=f.x;f.renderY=f.y;f.renderZ=f.z;
  }
  function spring(value,velocity,target,omega,zeta,dt){
    const a=omega*omega*(target-value)-2*zeta*omega*velocity;
    velocity+=a*dt;value+=velocity*dt;
    return [value,velocity];
  }
  function integrateStep(f,input,settings,dt){
    const previousVX=f.vx,previousVY=f.vy,previousVZ=f.vz,previousTurnRate=f.turnRate;
    const thrust=(settings.thrust??65)/100, agility=(settings.agility??55)/100, stability=(settings.stability??70)/100;
    // The old 220+ u/s cruise and 330+ u/s boost are too fast to learn in a
    // narrow canyon. Easy is forgiving; Sport is the maximum speed.
    const mode=settings.handlingMode==='easy'?'easy':'sport';
    const easy=mode==='easy',sport=mode==='sport';
    const profile=AIRFRAMES.get(settings.airframe);
    const {maxCruise,boostExtra,acceleration}=speedEnvelope(mode,settings.thrust??65,settings.airframe);
    const airBrake=(easy?300:sport?260:215)*profile.brake;
    // Retain some coast, but shed speed sooner than the heavier v35 profile.
    const coastTau=(easy?1.22:sport?1.50:1.85)*profile.coast;
    const liftSpeed=(easy?25+thrust*6:sport?37+thrust*18:42+thrust*28)*profile.vertical;
    const finite=x=>Number.isFinite(x)?x:0;
    const drive=clamp(finite(input.throttle),-1,1);
    const steer=clamp(finite(input.steer),-1,1);
    const strafe=clamp(finite(input.strafe),-1,1);
    f.throttle=Math.abs(drive);f.lift=clamp(input.lift||0,-1,1);
    if(!input.boost)f.boostLocked=false;
    const canBoost=!!input.boost&&drive>0&&!input.brake&&!f.boostLocked&&f.energy>0;
    f.boosting=canBoost;
    f.energy=clamp(f.energy+(canBoost?-profile.boostDrain:profile.boostRegen)*dt,0,1);
    if(canBoost&&f.energy<=0){f.energy=0;f.boosting=false;f.boostLocked=true;}
    const reverseMaximum=easy?36:sport?45:45+thrust*16;
    const reversing=drive!==0&&f.speed!==0&&Math.sign(drive)!==Math.sign(f.speed);
    if(input.brake)f.speed=approach(f.speed,0,airBrake*dt);
    else if(reversing)f.speed=approach(f.speed,0,(settings.ranked?(easy?220:177):(easy?420:440)*profile.brake)*dt);
    else if(drive===0)f.speed=damp(f.speed,0,coastTau,dt);
    else f.speed=approach(f.speed,drive>0?maxCruise*drive:-reverseMaximum*Math.abs(drive),(drive>0?acceleration:72)*dt);
    if(f.boosting)f.speed=approach(f.speed,maxCruise+boostExtra,(easy?160:224)*dt);
    // Quadratic aerodynamic drag resists high-speed travel without abruptly
    // snapping a coasting pilot to zero velocity. Keep explicit air braking.
    const aeroDecel=.00024*f.speed*Math.abs(f.speed)*dt;
    f.speed=Math.abs(aeroDecel)>=Math.abs(f.speed)?0:f.speed-aeroDecel;
    f.reversing=drive<0&&f.speed<0;

    // A physical curve is defined by heading and the velocity vector.
    // Max feasible yaw rate is bounded by |a_lateral| / speed, because
    // a_lateral = v * yawRate and minimum turn radius is v^2/a_lateral.
    // A mouse-controlled heading target gives a predictable direction change
    // even after the physical mouse stops, instead of a twitch that springs back.
    const tau=Math.abs(steer)>Math.abs(f.steerFiltered)?C.steerRise:C.steerRelease;
    f.steerFiltered=damp(f.steerFiltered||0,steer,tau,dt);
    const speedAbs=Math.abs(f.speed);
    const lateralBudget=(easy?C.turnAccelerationEasy:sport?C.turnAccelerationSport:C.turnAccelerationExpert)*(.88+agility*.22)*profile.turnG;
    const mechanicalRate=(easy?2.82:sport?3.08:3.34)*(.76+agility*.32)*profile.turn;
    const turnRateCap=Math.min(mechanicalRate,lateralBudget/Math.max(25,speedAbs));
    const headingCommand=Number.isFinite(input.headingTarget)?input.headingTarget:null;
    let desiredRate;
    if(headingCommand!==null){
      const error=Math.atan2(Math.sin(f.yaw-headingCommand),Math.cos(f.yaw-headingCommand));
      desiredRate=clamp(error*C.headingGain,-turnRateCap,turnRateCap);
    }else desiredRate=f.steerFiltered*turnRateCap;
    const braking=Math.abs(desiredRate)<Math.abs(f.turnRate)||desiredRate*f.turnRate<0;
    const response=(braking?C.yawBrake:C.yawAccel)*(.88+agility*.20);
    f.turnRate=approach(f.turnRate||0,desiredRate,response*dt*profile.yawResponse);
    // Keep yaw rate bounded if velocity changes quickly under boost.
    f.turnRate=clamp(f.turnRate,-turnRateCap,turnRateCap);
    f.yaw-=f.turnRate*dt;
    f.turnRadius=Math.abs(f.turnRate)>0.025?speedAbs/Math.abs(f.turnRate):Infinity;
    f.turnLimitRadius=speedAbs>5?speedAbs*speedAbs/lateralBudget:0;
    const maxTurn=mechanicalRate;

    // Easy corner assist trims speed progressively as a turn builds. It NEVER
    // teleports, freezes, or instantly rotates the craft; players remain in
    // control and can disable assist from Settings.
    if(easy&&settings.assist!==false&&drive>0){
      const spiritHeadingDemand=profile.id==='spirit'&&headingCommand!==null?Math.abs(desiredRate)/Math.max(.01,turnRateCap):0;
      const cornerDemand=clamp(Math.max(Math.abs(f.steerFiltered),spiritHeadingDemand)-.10,0,.90)/.90;
      const safeTurnSpeed=(maxCruise+(f.boosting?boostExtra:0))*(1-.065*cornerDemand);
      if(f.speed>safeTurnSpeed)f.speed=approach(f.speed,safeTurnSpeed,165*dt);
    }

    // Velocity must turn with the NOSE. The previous 350 u/s² cap was far below
    // the acceleration required for a 338 u/s boost turn (~800 u/s²), so the
    // nose rotated while momentum kept travelling almost straight (40°+ slip).
    // v36: quicker bounded lateral correction reduces the lingering sideways
    // drift after steering, while preserving a small readable slip. This is ARCADE control,
    // not a force-calibrated six-DOF quadrotor model.
    // Strafe is an independent world-velocity component. A/D slide sideways
    // without rotating the nose; the yaw input belongs to RMB or gamepad.
    const strafeMax=(easy?66:sport?78:88)*profile.strafe;
    // Blade is more precise in translational control, without increasing its yaw rate.
    const strafeTau=profile.strafeTau*(strafe?1:1.36)*(settings.ranked?1:1.13);
    f.strafeSpeed=damp(f.strafeSpeed||0,strafe*strafeMax,strafeTau,dt);
    const wantedX=-Math.sin(f.yaw)*f.speed+Math.cos(f.yaw)*f.strafeSpeed;
    const wantedZ=-Math.cos(f.yaw)*f.speed-Math.sin(f.yaw)*f.strafeSpeed;
    // Do not weaken lateral grip at boost speed; higher speed needs MORE
    // centripetal authority to hold the same yaw response, not less.
    const grip=C.lateralGrip*(.80+stability*.40)*profile.grip*(settings.ranked?1:drive<0&&f.speed>=0?1.25:.92);
    let dvx=(wantedX-f.vx)*(1-Math.exp(-grip*dt));
    let dvz=(wantedZ-f.vz)*(1-Math.exp(-grip*dt));
    const maxLateral=C.lateralAccel*(.72+agility*.28)*profile.lateral*dt;
    const delta=Math.hypot(dvx,dvz);
    if(delta>maxLateral){const ratio=maxLateral/delta;dvx*=ratio;dvz*=ratio;}
    f.vx+=dvx;f.vz+=dvz;
    // Shallow nose angle has significant vertical flight authority: a small
    // visual pitch must not mean almost no climb. This is assisted arcade
    // altitude control rather than full thrust-vector quadrotor aerodynamics.
    const commandedPitch=clamp(Number.isFinite(input.pitch)?input.pitch:0,-.31,.31);
    const ranked=settings.ranked===true,verticalScale=ranked?profile.vertical:Math.sqrt(profile.vertical);
    const vPitch=Math.min(230,Math.abs(f.speed));
    // Retain fine pitch control at low speed in tight apertures; extra authority rises smoothly at speed.
    const pitchGain=ranked?0:clamp((vPitch-65)/110,0,1);
    const closePitch=!ranked&&settings.shipyard&&Math.abs(input.throttle||0)>.1?.58+.42*clamp(vPitch/85,0,1):1;
    const pitchClimb=Math.sin(commandedPitch)*(50+vPitch*1.18)*profile.vertical*(1+pitchGain*.22)*closePitch;
    const verticalLimit=(ranked?96:settings.shipyard?116:108)*verticalScale;
    // A dedicated climb/descend command always wins over opposing mouse pitch.
    const pitchContribution=f.lift*pitchClimb<0?0:pitchClimb;
    const directLift=ranked?(settings.shipyard?Math.max(liftSpeed,(easy?48:65)*profile.vertical):liftSpeed):(settings.shipyard?(easy?49:67):(easy?42:62))*verticalScale;
    const wantedY=clamp(f.lift*directLift+pitchContribution,-verticalLimit,verticalLimit);
    f.vy=damp(f.vy,wantedY,1/((5.3+stability*6)*profile.vertical*(ranked?1:.88)),dt);
    f.x+=f.vx*dt;f.z+=f.vz*dt;
    const minAltitude=Number.isFinite(settings.minAltitude)?settings.minAltitude:4.5;
    const maxAltitude=Number.isFinite(settings.maxAltitude)?settings.maxAltitude:430;
    f.y=clamp(f.y+f.vy*dt,minAltitude,maxAltitude);
    if((f.y===minAltitude&&f.vy<0)||(f.y===maxAltitude&&f.vy>0))f.vy=0;

    // Bank follows ACTUAL angular rate, not the key's Boolean state.
    // When the key releases, the body retains angular momentum briefly.
    const bankTarget=-clamp(f.turnRate/Math.max(.01,maxTurn),-1,1)*C.bankAngle*profile.bank*(easy?.7:sport?.85:1)-strafe*.13+f.lift*.010;
    [f.roll,f.bankVelocity]=spring(f.roll||0,f.bankVelocity||0,bankTarget,C.bankStiffness,C.bankDamping,dt);
    f.roll=clamp(f.roll,-.82,.82);
    // Pilot-owned pitch overrides the former hardcoded forward-lean bias.
    // Pointer-locked vertical mouse motion is persistent nose attitude, not a
    // short-lived lift impulse; FPV reads this same rendered pitch.
    const pilotPitch=clamp(Number.isFinite(input.pitch)?input.pitch:0,-.31,.31);
    const targetPitch=pilotPitch;
    f.pitch=damp(f.pitch,targetPitch,1/C.pitchResponse,dt);
    // Post-integration acceleration is the authoritative signal for the
    // v26 visual rotor allocation. Record it without changing motion.
    f.ax=(f.vx-previousVX)/dt;f.ay=(f.vy-previousVY)/dt;f.az=(f.vz-previousVZ)/dt;
    f.yawAccel=(f.turnRate-previousTurnRate)/dt;
    f.distance+=Math.hypot(f.vx,f.vy,f.vz)*dt;
  }
  function stepFlight(f,input,settings,frameDelta){
    let dt=clamp(Number.isFinite(frameDelta)?frameDelta:0,0,.05);
    const fixed=1/C.fixedHz;
    f._accumulator=clamp((f._accumulator||0)+dt,0,fixed*C.maxSteps);
    let steps=0;
    while(f._accumulator+1e-12>=fixed && steps<C.maxSteps){
      f._prevX=f.x;f._prevY=f.y;f._prevZ=f.z;
      integrateStep(f,input,settings,fixed);
      f._accumulator-=fixed;steps++;
    }
    // Interpolated display position is one substep behind simulation state.
    // Gameplay/collision/network state continues to use f.x/y/z exactly.
    const alpha=clamp(f._accumulator/fixed,0,1);
    f.renderX=f._prevX+(f.x-f._prevX)*alpha;
    f.renderY=f._prevY+(f.y-f._prevY)*alpha;
    f.renderZ=f._prevZ+(f.z-f._prevZ)*alpha;
    return steps;
  }
  return {config:C,clamp,damp,stepFlight,createFlight,resetTransients,integrateStep,speedEnvelope};
});


