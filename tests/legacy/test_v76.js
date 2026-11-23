const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(require('node:path').join(__dirname,'../../dist/REDLINE_v78_STAGE1_STANDALONE.html'),'utf8');
let checks=0;
function check(x,message){assert(x,message);checks++;}
const policy=source.slice(source.indexOf('const REDLINE_RIVAL_DIRECTOR=(()=>{'),source.indexOf('const CLASH = {'));
// Deterministic test data: gameplay deliberately uses randomized rival phases.
let aiSeed=12345;const seededMath=Object.create(Math);
seededMath.random=()=>{aiSeed=(Math.imul(aiSeed,1664525)+1013904223)>>>0;return aiSeed/4294967296;};
const context={window:{},console,Math:seededMath};vm.runInNewContext(policy,context);
const dir=context.window.REDLINE_RIVAL_DIRECTOR;
check(!!dir&&dir.presets.length===3,'AI director exists');
const aiSource=source.slice(source.indexOf('(function(root,factory){const api=factory();if(typeof module'),source.indexOf('/*',source.indexOf('(function(root,factory){const api=factory();if(typeof module')));
// Both model and combat code must remain parsable and the pacing actually vary.
const dt=1/60, results=[];
for(let index=0;index<3;index++){
 const b={index,energy:1,boosting:false,stunT:0,velocity:0,progress:0}, modes=new Set(), changes=[];
 dir.reset(b);
 let total=0,boostTime=0,current=b.tempo,tempoSwitches=0;
 for(let i=0;i<60*180;i++){
  const gap=.018,straight=.78;
  const r=dir.step(b,dt,{gap,straight});
  check(r.mode==='fast'||r.mode==='medium','no slow bot tempo');
  modes.add(r.mode);
  if(r.mode!==current){tempoSwitches++;current=r.mode;}
  if(r.boost&&b.energy>0) {b.energy=Math.max(0,b.energy-dt*.16);b.boosting=true;boostTime+=dt;}
  else {b.energy=Math.min(1,b.energy+dt*.38);b.boosting=false;}
  const normalTop=300*(.92+.065*index),botExtra=Math.max(72*1.25,300*dir.presets[index].boost-normalTop);
  let target=normalTop*(r.mode==='fast'?1.0:.93)*r.speedFactor;
  if(b.boosting)target=normalTop+botExtra;
  target=Math.min(normalTop+(b.boosting?botExtra:0),target)*.96;
  b.velocity+=Math.max(-4.25,Math.min(4.25,target-b.velocity));
  total+=b.velocity*dt;
  b.progress+=b.velocity*dt/18000;
 }
 results.push({index,modes:[...modes],tempoSwitches,boostSeconds:+boostTime.toFixed(1),avgSpeed:+(total/180).toFixed(1),energy:+b.energy.toFixed(2)});
 check(modes.has('medium')&&modes.has('fast'),'rival varies pace');
 console.log('SWITCH',index,tempoSwitches);check(tempoSwitches>=5&&tempoSwitches<85,'rival phase lasts seconds');
 console.log('BOOST',index,boostTime.toFixed(2));check(boostTime>12&&boostTime<120,'rival uses limited burst boosts');
}
check(results[2].avgSpeed>300,'elite rival can beat nonstop 300 u/s pilot on favorable lines');
// Yaw wrapping: world poses must use quaternion slerp, not Euler interpolation.
check(source.includes('orientation:dr.quaternion.clone()'),'craft orientation sampled');
check(source.includes('dr.quaternion.copy(redlinePreviousPose.orientation).slerp('),'craft quaternion interpolation');
check(source.includes('cam.quaternion.copy(redlinePreviousPose.viewRotation).slerp('),'camera quaternion interpolation');
// Sight and combat invariants.
check(source.includes('REDLINE_TARGET_LOCK.create(2.0)'),'2-second lock');
check(!source.includes("status.elapsed.toFixed(1)+'/5.5'"),'no stale 5.5-second label');
check(source.includes('clashBotEmitRedLasers(b,blocked?.point||end)'),'laser shot on actual fire');
check(source.includes('color:0xff1932'),'bright RED projectile');
check(source.includes('laserWorldHit(from,delta.normalize(),Math.max(0,length-5))'),'rock-occluded AI projectile');
check(source.includes('chaseAim?0:aim.x'),'camera-center chase aiming');
check(source.includes('REDLINE_HOVER_Y=6.2'),'higher aircraft showroom');
check(source.includes('const craftRadius=43;'),'all selectable models retain a stable hangar focal distance');
check(source.includes('showroomCameraDistance=craftRadius;'),'switching models cannot trigger zoom pumping');
console.log(JSON.stringify({pass:checks,results},null,2));
