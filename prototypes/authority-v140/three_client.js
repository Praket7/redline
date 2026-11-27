/* REDLINE 143/144 — opt-in Three.js authority view.
 * Reuses a scene and aircraft clone factory from the host game.
 * Does not run a competing authoritative simulation or modify the solo loop.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.REDLINE_THREE_CLIENT=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';
 function permitted(url){
  const parsed=new URL(url,root.location?.href||'http://localhost');
  return parsed.protocol==='wss:'||(parsed.protocol==='ws:'&&['localhost','127.0.0.1','[::1]'].includes(parsed.hostname));
 }
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 class Bridge{
  constructor({scene,THREE,modelFactory=null,localRig=null,input=null,flight=null,settings=null,onStatus=null,hideLocal=false}={}){
   if(!scene||!THREE)throw Error('A live Three.js scene and THREE are required');
   if(!root.REDLINE_NETCODE)throw Error('Load REDLINE_NETCODE before Bridge');
   this.scene=scene;this.THREE=THREE;this.modelFactory=modelFactory;this.localRig=localRig;this.input=input;
   this.onStatus=onStatus||(()=>{});this.hideLocal=hideLocal;this.objects=new Map();
   this.net=new root.REDLINE_NETCODE.Netcode({flight,settings});
   this.ws=null;this.token=null;this.id=null;this.room=null;this.course=null;this.seq=0;this.timer=null;
   this.lastSnapshotAt=0;this.lastFrameAt=0;this.connectionGeneration=0;this.disposed=false;this.host=false;this.reconnectAttempts=0;
  }
  fallback(model){
   const T=this.THREE,group=new T.Group(),material=new T.MeshStandardMaterial({color:model==='blade'?0xf58f50:model==='spirit'?0x96bfce:model==='copper'?0xf0af65:0xf05267,metalness:.48,roughness:.35});
   const body=new T.Mesh(new T.ConeGeometry(2.5,9,4),material);body.rotation.x=-Math.PI/2;group.add(body);
   for(const x of [-3,3])for(const z of [-3,3]){const rotor=new T.Mesh(new T.CylinderGeometry(1.7,1.7,.3,10),material);rotor.position.set(x,.4,z);group.add(rotor);}
   group.userData.redlineDebugFallback=true;return group;
  }
  createVisual(p){
   let item=null;
   if(this.modelFactory){try{item=this.modelFactory(p.model,p.id,p);}catch(e){this.onStatus('model_factory_error',e);}}
   if(!item||!item.isObject3D)item=this.fallback(p.model);
   item.name='REDLINE authority pilot '+p.name;this.scene.add(item);this.objects.set(p.id,item);return item;
  }
  connect({url,room,course,model='kestrel',name='Pilot',token=null}={}){
   if(this.disposed)throw Error('bridge disposed');
   if(!permitted(url))throw Error('Only WSS or loopback WS may be used');
   if(!/^[A-Za-z0-9]{3,20}$/.test(room)||!['grand','iron'].includes(course))throw Error('invalid room or course');
   this.room=room;this.course=course;this.token=token||this.token;
   this.intent={url,room,course,model,name};
   this.connectionGeneration++;
   const generation=this.connectionGeneration;
   if(this.ws){this.ws.onclose=null;this.ws.close();}
   const ws=new WebSocket(url);this.ws=ws;this.onStatus('connecting');
   ws.onopen=()=>{
    if(generation!==this.connectionGeneration)return;
    ws.send(JSON.stringify({op:'join',room,course,model,name,token:this.token||undefined}));
   };
   ws.onmessage=e=>{
    if(generation!==this.connectionGeneration)return;
    let data;try{data=JSON.parse(e.data);}catch{return;}
    if(data.type==='error'){this.onStatus('server_error',data.message);return;}
    if(data.type==='joined'){
     if(this.net.world&&this.net.world!==data.world){this.net.frames=[];this.net.pending=[];}
     this.id=data.id;this.token=data.token;this.seq=data.ack||0;this.host=!!data.host;this.reconnectAttempts=0;
     this.onStatus('joined',{id:this.id,world:data.world,host:this.host});return;
    }
    if(data.type==='snapshot'&&data.room===this.room&&data.course===this.course){
      if(this.id&&this.net.receive(data,this.id))this.lastSnapshotAt=performance.now();
    }
   };
   ws.onclose=()=>{
    if(generation!==this.connectionGeneration||this.disposed)return;
    this.onStatus('disconnected');
    this.id=null;
    this.reconnectAttempts++;
    // No aggressive reconnect storms; caller controls retry after repeated failure.
    if(this.reconnectAttempts<=5){
      const delay=Math.min(5000,400*2**(this.reconnectAttempts-1));
      setTimeout(()=>{if(!this.disposed&&generation===this.connectionGeneration)this.connect(this.intent);},delay);
    }
   };
   if(!this.timer)this.timer=setInterval(()=>this.sendInput(),1000/30);
   return this;
  }
  sendInput(){
   if(!this.id||!this.ws||this.ws.readyState!==WebSocket.OPEN)return;
   if(this.ws.bufferedAmount>65536){this.onStatus('backpressure');return;}
   const raw=this.input?.()||{};
   const seq=++this.seq;
   const data={seq};
   for(const k of ['throttle','steer','strafe','lift','pitch'])data[k]=clamp(Number.isFinite(raw[k])?raw[k]:0,k==='pitch'?-.31:-1,k==='pitch'?.31:1);
   for(const k of ['boost','brake','fire','shield','emp'])data[k]=raw[k]===true;
   if(Number.isFinite(raw.headingTarget))data.headingTarget=raw.headingTarget;
   this.net.submit(data,1/30);
   this.ws.send(JSON.stringify({op:'input',input:data}));
  }
  start(){if(this.host&&this.ws?.readyState===WebSocket.OPEN)this.ws.send(JSON.stringify({op:'start'}));}
  draw(now=performance.now()){
   if(!this.net.frames.length)return;
   const delta=this.lastFrameAt?clamp((now-this.lastFrameAt)/1000,0,.1):1/60;
   this.lastFrameAt=now;
   const newest=this.net.frames.at(-1);
   // Clock advances smoothly between 20 Hz authoritative packets.
   const estimatedTick=newest.tick+clamp((now-this.lastSnapshotAt)*.06,0,6);
   const target=estimatedTick-this.net.delayTicks;
   const present=new Set();
   for(const p of newest.players){
    if(p.id===this.id&&this.hideLocal)continue;
    let out;
    if(p.id===this.id){out=this.net.own(delta);}
    else out=this.net.remote(p.id,target);
    if(!out)continue;
    present.add(p.id);
    const object=this.objects.get(p.id)||this.createVisual(p);
    object.position.set(...out.p);
    object.rotation.order='YXZ';
    object.rotation.set(out.pitch||0,out.yaw||0,out.roll||0);
    object.visible=p.connected!==false;
    if(p.id===this.id&&this.localRig&&this.localRig!==object){
      this.localRig.position.copy(object.position);this.localRig.rotation.copy(object.rotation);
    }
   }
   for(const [id,obj]of this.objects)if(!present.has(id)){obj.parent?.remove(obj);this.objects.delete(id);}
  }
  dispose(){
   this.disposed=true;this.connectionGeneration++;
   if(this.timer){clearInterval(this.timer);this.timer=null;}
   if(this.ws){this.ws.onclose=null;this.ws.close();this.ws=null;}
   for(const object of this.objects.values())object.parent?.remove(object);
   this.objects.clear();this.onStatus('disposed');
  }
 }
 return Object.freeze({Bridge});
});
