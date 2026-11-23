/* REDLINE deterministic fixed timestep test. Uses shipped gameplay clock,
 * not a rewritten test clock or mocked browser physics. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const script=fs.readFileSync(__dirname+'/../src/scripts/030_redlineFixedStepClock.js','utf8');
const ctx={window:{},Object,Math};vm.runInNewContext(script,ctx);
const fixed=ctx.window.REDLINE_FIXED_CLOCK;
function trace(wallFrames){
 const clock=fixed.create({hz:60,maxSteps:4});let time=0,x=0,v=0,steps=0;
 const onStep=(dt,tick)=>{
   // Input depends on *tick*, not browser render frequency.
   const thrust=(tick%113)<66?1:.18;
   v+=((thrust*8)-v*.11)*dt;
   x+=v*dt;
   steps++;
 };
 for(const dt of wallFrames) clock.advance(dt,onStep);
 return {x,v,steps,ticks:clock.ticks,dropped:clock.droppedSeconds,alpha:clock.alpha};
}
const sixty=trace(Array(120).fill(1/60));
const thirty=trace(Array(60).fill(1/30));
assert.equal(sixty.ticks,120);assert.equal(thirty.ticks,120);
assert.equal(sixty.x,thirty.x);assert.equal(sixty.v,thirty.v);
assert.equal(sixty.dropped,0);assert.equal(thirty.dropped,0);
const overloaded=fixed.create({hz:60,maxSteps:4});let calls=0;
overloaded.advance(1,()=>calls++);
assert.equal(calls,4);assert(overloaded.droppedSeconds>.9);
console.log('PASS actual fixed simulation clock: 30 vs 60 render Hz deterministic for 120 ticks; overload bounded');
