

/* Mouse-locked UI cursor: movementX/Y moves a visual cursor; clicks are routed to top HUD actions. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.REDLINE_VIRTUAL_CURSOR=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function create(document){let x=0,y=0,active=false;
 const el=document.createElement('div');el.id='rlVirtualCursor';el.setAttribute('aria-hidden','true');
 const label=document.createElement('div');label.id='rlVirtualCursorHint';label.textContent='UI CURSOR ACTIVE · CLICK TOP BUTTONS · U TO AIM';document.body.append(el,label);
 const css=document.createElement('style');css.textContent=`#rlVirtualCursor{display:none;position:fixed;z-index:180;width:19px;height:19px;pointer-events:none;border:2px solid #fff;border-radius:50%;background:#fa385550;box-shadow:0 0 0 4px #fa385533,0 0 22px #f53b58;transform:translate(-50%,-50%)}#rlVirtualCursorHint{display:none;position:fixed;z-index:179;left:50%;top:72px;transform:translateX(-50%);padding:7px 15px;border:1px solid #fa5367;background:#160a11ed;color:#fff;font:900 10px system-ui;letter-spacing:1px;border-radius:6px;pointer-events:none}body.rl-play #rlVirtualCursor.rl-active,body.rl-play #rlVirtualCursorHint.rl-active{display:block}@media(max-width:600px){#rlVirtualCursorHint{font-size:8px;top:65px}}`;document.head.append(css);
 function paint(){const key=globalThis.REDLINE_BINDINGS?.display?.('uiCursor')||'U';label.textContent='UI CURSOR ACTIVE · CLICK TOP BUTTONS · '+key+' TO AIM';el.style.left=x+'px';el.style.top=y+'px';el.classList.toggle('rl-active',active);label.classList.toggle('rl-active',active);}
 function set(value){active=!!value;if(active){x=window.innerWidth*.52;y=42;}paint();return active;}
 function move(dx,dy){if(!active)return;x=Math.max(8,Math.min(window.innerWidth-8,x+dx));y=Math.max(8,Math.min(window.innerHeight-8,y+dy));paint();}
 function click(){if(!active)return false;const target=document.elementFromPoint(x,y)?.closest?.('#rlGameButtons button[data-op]');if(target&&['controls','settings','camera','tutorial','restartRun'].includes(target.dataset.op)){target.click();if(target.dataset.op!=='camera')set(false);return true;}return false;}
 return {set,move,click,get active(){return active},get position(){return {x,y}}};
}
return {create};
});


