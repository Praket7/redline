// REDLINE v83 deterministic source-level guards. Real projection is tested by v83_chase_camera.py.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('src/scripts/035_module.js','utf8');
for(const key of ['REDLINE_V83_CHASE_PROFILES','redlineV83ChaseProfile','redlineV83ProjectedBody',
                 'collisionLimited:chaseCollisionLimited','reticleX:.5,reticleY:.5',
                 'const targetFov=cockpitLens?76:chaseProfile.fov']) {
 assert(source.includes(key),'missing chase safety/diagnostic: '+key);
}
assert(!source.includes('camM===1?55:camM===2?90:64'),'obsolete long boom still present');
assert(!source.includes('66.5+Math.min(8.5,Math.abs(st.spd)/28)'),'obsolete acceleration zoom still present');
const start=source.indexOf('const REDLINE_V83_CHASE_PROFILES='),end=source.indexOf('function redlineV83ChaseProfile',start);
const chunk=source.slice(start,end);
for(const craft of ['kestrel','blade','copper','spirit'])assert(chunk.includes(craft+':Object.freeze('),craft+' has no independent profile');
assert(source.includes('const cockpitLens=(redlineUI.config.view===1'),'FPV camera guard was lost');
assert(source.includes('const worldAimPoint=redlineUI.aimPoint()'),'existing muzzle convergence was lost');
console.log('PASS v83: airframe framing profiles, stable FOV, FPV separation, collision and aiming contracts');
