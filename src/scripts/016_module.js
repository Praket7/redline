

/* Real geometry parts with gravity, ground contact and a short settling period.
   Animation-only: game owns health, respawn, and race penalties. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.REDLINE_DESTRUCTION=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const GRAVITY=100,DEBRIS_TIME=3.25,BOUNCE=.18;
function create(THREE,scene,options={}){
 const dark=new THREE.MeshStandardMaterial({color:0x141f2b,metalness:.75,roughness:.32});
 const metal=new THREE.MeshStandardMaterial({color:0xa2b0b9,metalness:.84,roughness:.22});
 const red=new THREE.MeshStandardMaterial({color:0xc52239,metalness:.58,roughness:.36,emissive:0x3e080f});
 const glass=new THREE.MeshStandardMaterial({color:0x265365,metalness:.28,roughness:.12,transparent:true,opacity:.85});
 const frame=new THREE.Group();frame.name='REDLINE_Physical_Breakup';scene.add(frame);
 const defs=[
 ['fuselage',new THREE.BoxGeometry(2.7,.54,3.5),dark,[0,0,0]],
 ['canopy',new THREE.SphereGeometry(1.1,12,8),glass,[0,.52,-.55]],
 ['nose',new THREE.ConeGeometry(.72,1.2,10),red,[0,.12,-2.1]],
 ['tail',new THREE.BoxGeometry(1.15,.24,1.7),metal,[0,.1,1.7]],
 ['leftWing',new THREE.BoxGeometry(3.1,.15,.85),dark,[-2.55,.02,-.4]],
 ['rightWing',new THREE.BoxGeometry(3.1,.15,.85),dark,[2.55,.02,-.4]],
 ['portPylon',new THREE.CylinderGeometry(.20,.23,2.3,8),metal,[-3.6,-.15,-1.1]],
 ['starboardPylon',new THREE.CylinderGeometry(.20,.23,2.3,8),metal,[3.6,-.15,-1.1]],
 ['leftRotor',new THREE.TorusGeometry(.85,.20,8,18),dark,[-4.1,-.15,-2.0]],
 ['rightRotor',new THREE.TorusGeometry(.85,.20,8,18),dark,[4.1,-.15,-2.0]],
 ['rearLeftRotor',new THREE.TorusGeometry(.85,.20,8,18),dark,[-3.6,-.15,1.65]],
 ['rearRightRotor',new THREE.TorusGeometry(.85,.20,8,18),dark,[3.6,-.15,1.65]],
 ['leftBlade',new THREE.BoxGeometry(2.6,.06,.17),metal,[-4.1,.1,-2.0]],
 ['rightBlade',new THREE.BoxGeometry(2.6,.06,.17),metal,[4.1,.1,-2.0]],
 ['rearLeftBlade',new THREE.BoxGeometry(2.6,.06,.17),metal,[-3.6,.1,1.65]],
 ['rearRightBlade',new THREE.BoxGeometry(2.6,.06,.17),metal,[3.6,.1,1.65]],
 ['ventA',new THREE.BoxGeometry(1.15,.11,.44),red,[-.9,.39,.72]],
 ['ventB',new THREE.BoxGeometry(1.15,.11,.44),red,[.9,.39,.72]],
 ['chassisA',new THREE.BoxGeometry(.4,.37,1.3),dark,[-1.2,-.38,0]],
 ['chassisB',new THREE.BoxGeometry(.4,.37,1.3),dark,[1.2,-.38,0]]
 ];
 const debris=defs.map(([name,g,m,offset],i)=>{const mesh=new THREE.Mesh(g,m);mesh.name='Destroyed_'+name;mesh.visible=false;mesh.castShadow=true;frame.add(mesh);return{mesh,offset:new THREE.Vector3(...offset),velocity:new THREE.Vector3(),spin:new THREE.Vector3(),age:0,settled:false,hitWater:false,id:i}});
 let remaining=0,focus=new THREE.Vector3(),yaw=0,lastOrigin=new THREE.Vector3();
 function explode(origin,vel=new THREE.Vector3(),direction=0){remaining=DEBRIS_TIME;yaw=direction;lastOrigin.copy(origin);focus.copy(origin);
  for(const d of debris){const i=d.id,a=i*2.399963;
   d.age=0;d.settled=false;d.hitWater=false;d.mesh.visible=true;d.mesh.scale.setScalar(1);
   d.mesh.position.copy(d.offset).applyAxisAngle(new THREE.Vector3(0,1,0),yaw).add(origin);
   d.mesh.rotation.set(.12*i,yaw+a*.18,.08*i);
   const impulse=7+(i*11%13);d.velocity.set(Math.cos(a)*impulse+vel.x*.13,6+(i%6)*4+Math.min(8,vel.y*.12),Math.sin(a)*impulse+vel.z*.13);
   d.spin.set((i%5-2)*2.3,(i%3-1)*3.2,(i%7-3)*1.2);
  }
 }
 function update(dt){if(remaining<=0)return;dt=Math.min(.05,Math.max(0,dt));remaining=Math.max(0,remaining-dt);focus.set(0,0,0);let count=0;
  for(const d of debris){if(!d.mesh.visible)continue;d.age+=dt;
   const p=d.mesh.position;
   if(!d.settled){d.velocity.y-=GRAVITY*dt;d.velocity.x*=Math.exp(-.54*dt);d.velocity.z*=Math.exp(-.54*dt);p.addScaledVector(d.velocity,dt);
    const y0=typeof options.groundHeight==='function'?options.groundHeight(p.x,p.z):0;
    const water=Number.isFinite(options.waterHeight)?options.waterHeight:-Infinity;
    const floor=Math.max(Number.isFinite(y0)?y0:0,water);
    if(p.y<=floor+.45){p.y=floor+.45;
     if(water>y0&&!d.hitWater){d.hitWater=true;options.onWaterContact?.(p.clone());}
     if(Math.abs(d.velocity.y)>9){d.velocity.y=Math.abs(d.velocity.y)*BOUNCE;d.velocity.x*=.57;d.velocity.z*=.57;}
     else {d.velocity.y=0;d.velocity.x*=.42;d.velocity.z*=.42;d.settled=true;}
    }
    d.mesh.rotation.x+=d.spin.x*dt;d.mesh.rotation.y+=d.spin.y*dt;d.mesh.rotation.z+=d.spin.z*dt;
   }
   if(remaining<.48)d.mesh.scale.setScalar(Math.max(.001,remaining/.48));
   focus.add(p);count++;
  }
  if(count)focus.multiplyScalar(1/count);
  if(remaining===0)clear();
 }
 function clear(){remaining=0;for(const d of debris){d.mesh.visible=false;d.mesh.scale.setScalar(1);d.settled=false;}}
 return {explode,update,clear,get active(){return remaining>0},get remaining(){return remaining},get duration(){return DEBRIS_TIME},get focus(){return focus.clone()},get count(){return debris.length},get parts(){return debris}};
}
return {create,GRAVITY,DEBRIS_TIME,BOUNCE};
});


