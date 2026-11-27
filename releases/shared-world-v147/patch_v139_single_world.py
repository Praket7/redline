"""Convert the uploaded v139 HTML to a single-authority online client, preserving solo mode.
Use ONLY against the exact v139 deployment file; fail on unexpected source drift.
"""
from pathlib import Path
import argparse


def patch(source, client):
    text=source
    def one(old,new,expected=1):
        nonlocal text
        n=text.count(old)
        if n!=expected:raise RuntimeError(f'Expected {expected} occurrences, got {n}: {old[:160]}')
        text=text.replace(old,new)
    one('const REDLINE_ONLINE=(()=>{',client+'\nconst REDLINE_SHARED_WORLD=createRedlineSharedWorld();\nconst REDLINE_ONLINE=(()=>{')
    one(" const URL='https://gudzbisvhrvmduvbtcrh.supabase.co';",
        " const SHARED=REDLINE_SHARED_WORLD;\n const URL='https://gudzbisvhrvmduvbtcrh.supabase.co';")
    one(' const peers=()=>room?.players||[];',
        ' const peers=()=>SHARED.enabled&&SHARED.members.length?SHARED.members:(room?.players||[]);')
    one(" function networkLabel(){", " function networkLabel(){if(SHARED.enabled)return SHARED.showStatus();")
    one(' async function create(){\n  if(partyBusy||rankBusy)return;partyBusy=true;',
        " async function create(){\n  if(partyBusy||rankBusy)return;partyBusy=true;")
    one(' async function join(){\n  if(partyBusy||rankBusy)return;partyBusy=true;',
        " async function join(){\n  if(partyBusy||rankBusy)return;partyBusy=true;")
    one(' async function create(){\n  if(partyBusy||rankBusy)return;partyBusy=true;\n  try{',
        ' async function create(){\n  if(partyBusy||rankBusy)return;partyBusy=true;\n  try{await SHARED.ensureAuthority();')
    one(' async function join(){\n  if(partyBusy||rankBusy)return;partyBusy=true;\n  try{',
        ' async function join(){\n  if(partyBusy||rankBusy)return;partyBusy=true;\n  try{await SHARED.ensureAuthority();')
    one("connect();redlineUI.go('lobby');setStatus('LOBBY');selectJoinedModel().then(()=>poll().catch(()=>{}));",
        "await SHARED.connect(cred,room,name,redlineActiveAirframe());redlineUI.go('lobby');setStatus('LOBBY');selectJoinedModel().then(()=>poll().catch(()=>{}));",2)
    one("   if(room.stage==='lobby'){connect();redlineUI.go('lobby');",
        "   if(room.stage==='lobby'){await SHARED.connect(cred,room,own()?.name||'PILOT',redlineActiveAirframe());redlineUI.go('lobby');")
    one("   else if(room.stage==='finished'||data.forfeited||own()?.finished_ms!=null){started=true;racing=true;connect();redlineUI.go('results');}",
        "   else if(room.stage==='finished'||data.forfeited||own()?.finished_ms!=null){started=true;racing=false;redlineUI.go('results');}")
    one("   else if(room.stage==='countdown'||room.stage==='racing'){connect();prepareRace(room,data.self);",
        "   else if(room.stage==='countdown'||room.stage==='racing'){await SHARED.connect(cred,room,own()?.name||'PILOT',redlineActiveAirframe());SHARED.enterRace();")
    one(" async function poll(){\n  if(!cred||leaving||roomPollBusy)return;",
        " async function poll(){\n  if(SHARED.enabled&&SHARED.racing)return room;\n  if(!cred||leaving||roomPollBusy)return;")
    one("  try{setStatus('ARMING');const t=Date.now();const d=await rpc('redline_start_room',secrets());setClock(d,t,Date.now());updateRoom(d);setStatus('COUNTDOWN');}",
        "  try{setStatus('ARMING');if(!SHARED.connected)throw Error('Every player must connect to the shared authority first.');SHARED.start();setStatus('START REQUESTED');}")
    one(' async function leave(silent=false){\n  if(!cred)return;',
        ' async function leave(silent=false){\n  SHARED.close();\n  if(!cred)return;')
    one(' function prepareRace(view,resumeState=null){',
        ' function prepareRace(view,resumeState=null){if(SHARED.enabled){SHARED.enterRace();return;}')
    one(' function countdownRemain(){',
        ' function countdownRemain(){if(SHARED.enabled)return SHARED.startRemaining;')
    one(' async function finish(){',
        ' async function finish(){if(SHARED.enabled)return;')
    one(' function tick(now){\n  if(!racing||!cred)return;',
        ' function tick(now){\n  if(SHARED.enabled){if(SHARED.remote)SHARED.remote.draw(now);return;}\n  if(!racing||!cred)return;')
    one(' function captureCheckpoint(previous,current,dt){if(!racing)return;',
        ' function captureCheckpoint(previous,current,dt){if(SHARED.enabled)return;if(!racing)return;')
    one(" function ability(kind){\n  if(!racing||ranked()||kind!=='pulse')return;",
        " function ability(kind){\n  if(SHARED.enabled){if(kind==='pulse')SHARED.queueAbility('emp');return;}\n  if(!racing||ranked()||kind!=='pulse')return;")
    one(' function drawRemote(now){\n  if(!racing)return;', ''' function drawRemote(now){
  // Every aircraft, including the local one, is drawn against the SAME tick.
  // Bypass v139's second interpolation buffer so rivals never lag a different world.
  if(SHARED.enabled){
   for(const [id,r] of remote){
    const pilot=SHARED.sampled(id),member=SHARED.members.find(p=>p.id===id);
    const visible=!!(pilot&&member?.connected&&pilot.finished==null);
    r.model.visible=visible;
    if(r.shield)r.shield.visible=visible&&pilot.shield===true;
    if(!visible)continue;
    r.model.position.set(...pilot.p);
    r.model.rotation.set(pilot.pitch,pilot.yaw,pilot.roll,'YXZ');
    const distance=Math.hypot(st.p.x-pilot.p[0],st.p.y-pilot.p[1],st.p.z-pilot.p[2]);
    updateRemoteDetail(r,distance);
    if(distance<350)for(const rotor of r.rotors)rotor.rotation.y+=.45;
   }
   return;
  }
  if(!racing)return;''')
    one(' function broadcastVolley(rays){',
        ' function broadcastVolley(rays){if(SHARED.enabled)return;')
    one('rankLobbyModels.set(cred.id,model);updateRoom(d);rankRefresh(true).catch(()=>{});',
        'rankLobbyModels.set(cred.id,model);SHARED.setModel(model);updateRoom(d);rankRefresh(true).catch(()=>{});')
    one("  minimapRivals:()=>{\n   if(!racing)return [];",
        "  minimapRivals:()=>{\n   if(SHARED.enabled)return SHARED.minimap();\n   if(!racing)return [];")
    one("  remoteCount:()=>remote.size,remoteMeshCount:",
        "  remoteCount:()=>remote.size,remoteMeshCount:")
    one('verifiedGates:()=>traceGateCount,',
        'verifiedGates:()=>SHARED.enabled?(SHARED.currentSelf?.gates||0):traceGateCount,')
    one('  create,join,resume,leave,poll,ready,start,finish,bind,menuHTML,lobbyHTML,resultHTML,updateLobbyInPlace,tick,hitRay,ability,standings,countdownRemain,',
        '  create,join,resume,leave,poll,ready,start,finish,bind,menuHTML,lobbyHTML,resultHTML,updateLobbyInPlace,tick,hitRay,ability,standings:((progress)=>SHARED.enabled?SHARED.standings():standings(progress)),countdownRemain,')
    one("function fire(){if(REDLINE_ONLINE.isRacing&&REDLINE_ONLINE.isRanked())return;",
        "function fire(){if(REDLINE_SHARED_WORLD.racing){REDLINE_SHARED_WORLD.queueAbility('fire');return;}if(REDLINE_ONLINE.isRacing&&REDLINE_ONLINE.isRanked())return;")
    one('function update(dt){\n // Touch controls exist only on primary coarse-pointer devices.',
        'function update(dt){\n if(REDLINE_SHARED_WORLD.racing){window.REDLINE_MOBILE_CONTROLS?.setActive?.(redlineUI?.current===\'race\'&&(mode===\'run\'||mode===\'count\')&&!redlineUI.racePanelOpen?.());REDLINE_SHARED_WORLD.update(dt);return;}\n // Touch controls exist only on primary coarse-pointer devices.')
    # Dedicated authoritative pose feed replaces legacy client-to-client state broadcast.
    one('  if(!racing||!v||v.id===cred?.id||!peers().some(p=>p.id===v.id))return;',
        '  if(!racing&&!SHARED.enabled||!v||v.id===cred?.id||!peers().some(p=>p.id===v.id))return;')
    one("  return {get startSlot(){", "  SHARED.bindRemote({pose:receivePose,draw:drawRemote});\n  return {get startSlot(){")
    one('get isRacing(){return racing}',
        'get isRacing(){return SHARED.enabled?SHARED.racing:racing}')
    # The original ranked queue uses client-authoritative physics, so disable it instead of silently using a second world.
    one("async function rankQueue(){if(rankBusy||partyBusy)return;",
        "async function rankQueue(){showError('Ranked racing is disabled until the shared-world authoritative ranked rules are certified.');return;if(rankBusy||partyBusy)return;")
    if '<head>' not in text:raise RuntimeError('Missing HTML head')
    text=text.replace('<head>', '<head><script src="./authority-config.js"></script>', 1)
    from ensure_three_utils import patch as supply_geometry_utils
    return supply_geometry_utils(text)

if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('--source',required=True)
    ap.add_argument('--client',default='site/shared_world_client.js')
    ap.add_argument('--out',required=True)
    a=ap.parse_args()
    src=Path(a.source).read_text(encoding='utf-8')
    client=Path(a.client).read_text(encoding='utf-8')
    patched=patch(src,client)
    Path(a.out).write_text(patched,encoding='utf-8')
    print(f'Wrote {a.out} ({len(patched):,} characters)')
