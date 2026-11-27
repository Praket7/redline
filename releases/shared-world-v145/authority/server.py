"""REDLINE one-world gateway. Persistent process; do not deploy as a serverless function.

Supabase authenticates room membership. Exactly one Node worker simulates all rooms;
each room has exactly one World object. Clients send INPUT, never authoritative poses.
"""
import asyncio
import json
import os
import secrets
import time
from uuid import uuid4
from datetime import datetime, timedelta, timezone
from pathlib import Path
from aiohttp import ClientSession, ClientTimeout, WSMsgType, web

ROOT = Path(__file__).resolve().parent
MAX_ROOMS = 32
IDLE_TTL = 60.0
INPUT_HZ_LIMIT = 75

class Gateway:
    def __init__(self):
        self.rooms = {}
        self.pending = {}
        self.counter = 0
        self.proc = None
        self.reader_task = None
        self.sweeper_task = None
        self.http = None
        self.lock = asyncio.Lock()
        self.supabase_url = os.environ.get('SUPABASE_URL', '').rstrip('/')
        self.supabase_key = os.environ.get('SUPABASE_PUBLISHABLE_KEY', '')
        self.instance_id = str(uuid4())
        self.lease_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
        self.production = os.environ.get('REDLINE_REQUIRE_AUTH', '1') != '0'
        if self.production and (not self.supabase_url or not self.supabase_key or not self.lease_key):
            raise RuntimeError('Set Supabase URL, publishable key, and SERVER-ONLY service-role key; or REDLINE_REQUIRE_AUTH=0 for local tests only')

    async def launch(self, app):
        self.http = ClientSession(timeout=ClientTimeout(total=8))
        self.proc = await asyncio.create_subprocess_exec(
            'node', str(ROOT / 'worker.cjs'), stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, limit=2*1024*1024)
        self.reader_task = asyncio.create_task(self.reader())
        self.sweeper_task = asyncio.create_task(self.sweep())

    async def reader(self):
        try:
            async for raw in self.proc.stdout:
                message = json.loads(raw)
                if message.get('type') == 'reply':
                    fut = self.pending.pop(message.get('rid'), None)
                    if fut and not fut.done(): fut.set_result(message)
                    continue
                room = self.rooms.get(message.get('room'))
                if not room: continue
                if (message.get('type')=='snapshot' and room.get('started') and not room.get('result_saved')
                      and not room.get('saving') and message.get('players')
                      and all(p.get('finished') is not None for p in message['players'])):
                    room['saving']=True
                    asyncio.create_task(self.persist_match(room,message))
                encoded = json.dumps(message, separators=(',', ':'))
                for p in room['players'].values():
                    q = p.get('queue')
                    if q:
                        if q.full(): q.get_nowait()
                        q.put_nowait(encoded)
        finally:
            for future in self.pending.values():
                if not future.done(): future.set_exception(RuntimeError('authoritative worker stopped'))
            self.pending.clear()

    async def sweep(self):
        while True:
            await asyncio.sleep(5)
            now = time.monotonic()
            async with self.lock:
                for code, room in list(self.rooms.items()):
                    if self.production and room.get('world'):
                        stage='racing' if room['started'] else 'lobby'
                        try: ok=await self.lease_rpc('redline_authority_heartbeat_v145',{'p_code':code,'p_world':room['world'],'p_instance':self.instance_id,'p_state':stage})
                        except Exception: ok=False
                        if not ok:
                            # Fail closed if this server loses the single-world lease.
                            for player in room['players'].values():
                                if player.get('ws') and not player['ws'].closed:
                                    await player['ws'].close(code=1011,message=b'authority lease unavailable')
                            await self.command({'op':'delete','room':code},reply=True)
                            del self.rooms[code]
                            continue
                    active = any(p.get('ws') and not p['ws'].closed for p in room['players'].values())
                    if active: room['empty_since'] = None
                    else:
                        room['empty_since'] = room['empty_since'] or now
                        if now-room['empty_since'] > IDLE_TTL:
                            await self.command({'op': 'delete', 'room': code}, reply=True)
                            if self.production and room.get('world'):
                                try:await self.lease_rpc('redline_authority_release_v145',{'p_code':code,'p_world':room['world'],'p_instance':self.instance_id})
                                except Exception:pass
                            del self.rooms[code]

    async def command(self, m, reply=False):
        if not self.proc or self.proc.returncode is not None:
            raise RuntimeError('authority unavailable')
        future = None
        if reply:
            self.counter += 1
            m['rid'] = self.counter
            future = asyncio.get_running_loop().create_future()
            self.pending[self.counter] = future
        self.proc.stdin.write((json.dumps(m, separators=(',', ':'))+'\n').encode())
        await self.proc.stdin.drain()
        if future:
            try:
                value = await asyncio.wait_for(future, 4)
                if not value.get('ok'): raise ValueError(value.get('error', 'command rejected'))
                return value
            finally: self.pending.pop(m['rid'], None)



    async def persist_match(self, room, snapshot):
        try:
            if not self.production:
                room['result_saved']=True
                return
            completed=datetime.now(timezone.utc)
            started=completed-timedelta(seconds=max(0,(snapshot['tick']-snapshot['startTick'])/60))
            result=[{'id':p['id'],'name':p['name'],'model':p['model'],
                'finished_seconds':p['finished'],'gates':p['gates']} for p in snapshot['players']]
            result.sort(key=lambda r:(r['finished_seconds'],r['id']))
            payload={'world_id':snapshot['world'],'room_code':snapshot['room'],
                'course':snapshot['course'],'route_revision':snapshot['revision'],
                'started_at':started.isoformat(),'completed_at':completed.isoformat(),
                'results':result}
            async with self.http.post(self.supabase_url+'/rest/v1/redline_authority_matches_v140',
                json=payload,headers={'apikey':self.lease_key,'Authorization':'Bearer '+self.lease_key,
                'Content-Type':'application/json','Prefer':'resolution=ignore-duplicates,return=minimal'}) as response:
                if response.status not in (200,201,204):
                    raise RuntimeError('authority match persistence failed')
            room['result_saved']=True
        except Exception as exc:
            print('[AUTHORITY] match persistence failed',type(exc).__name__,flush=True)
        finally:room['saving']=False

    async def lease_rpc(self, function, payload):
        if not self.production:return True
        async with self.http.post(self.supabase_url+'/rest/v1/rpc/'+function,
            json=payload,headers={'apikey':self.lease_key,'Authorization':'Bearer '+self.lease_key,
                'Content-Type':'application/json'}) as response:
            value=await response.json(content_type=None)
            if response.status!=200:raise RuntimeError('database authority lease unavailable')
            return value is True

    async def authenticate(self, join):
        code = join['room']
        if not self.production:
            return {'code': code, 'course': join['course'], 'id': join.get('id') or None,
                    'host': None, 'stage': 'lobby', 'model': join.get('model','kestrel')}
        uid, secret = join.get('id'), join.get('secret')
        if not isinstance(uid, str) or not isinstance(secret, str) or len(secret) > 256:
            raise ValueError('missing room credentials')
        async with self.http.post(self.supabase_url+'/rest/v1/rpc/redline_sync_room_v130',
            json={'p_code':code,'p_id':uid,'p_secret':secret},
            headers={'apikey':self.supabase_key,'Content-Type':'application/json'}) as response:
            data = await response.json(content_type=None)
            if response.status != 200 or not isinstance(data, dict):
                raise ValueError('membership verification failed')
        room = data.get('room') or {}
        players = room.get('players') or []
        member = next((x for x in players if str(x.get('id')) == uid), None)
        if room.get('code') != code or not member:
            raise ValueError('room membership rejected')
        course = 'iron' if room.get('course') == 'iron' else 'grand'
        if course != join['course']:
            raise ValueError('course mismatch')
        if room.get('stage') not in ('lobby','countdown','racing'):
            raise ValueError('room not joinable')
        return {'code':code,'course':course,'id':uid,'host':room.get('host_id'),
                'stage':room.get('stage'),'model':join['model'], 'member':member,
                'players':players}

    async def socket(self, req):
        ws = web.WebSocketResponse(heartbeat=15, max_msg_size=4096)
        await ws.prepare(req)
        code = None; p = None; writer = None
        async def write(q):
            while True: await ws.send_str(await q.get())
        try:
            msg = await asyncio.wait_for(ws.receive_json(), 6)
            if not isinstance(msg,dict) or msg.get('op') != 'join': raise ValueError('invalid join')
            code = msg.get('room'); course = msg.get('course'); model = msg.get('model','kestrel')
            if not isinstance(code,str) or not code.isascii() or not code.isalnum() or not 3<=len(code)<=20:
                raise ValueError('invalid room code')
            if course not in ('grand','iron') or model not in ('kestrel','blade','copper','spirit'):
                raise ValueError('invalid course or aircraft')
            auth = await self.authenticate(msg)
            async with self.lock:
                room = self.rooms.get(code)
                if room is None:
                    if len(self.rooms) >= MAX_ROOMS: raise ValueError('game server is at capacity')
                    room = {'course':course,'players':{},'host':auth['host'], 'started':False,
                            'empty_since':None,'world':None,'lease_claimed':False,'result_saved':False,'saving':False}
                    self.rooms[code]=room
                if room['course'] != course: raise ValueError('room course changed')
                token = msg.get('token')
                p = next((v for v in room['players'].values() if token and
                    secrets.compare_digest(v['token'],str(token)) and
                    (not self.production or v['id']==auth['id'])), None)
                if not p:
                    if auth['stage']!='lobby' or room['started'] or len(room['players']) >= 6:
                        raise ValueError('race already started or room full')
                    pid = auth['id'] or secrets.token_hex(12)
                    if pid in room['players']: raise ValueError('existing pilot requires reconnect token')
                    slot = next((i for i in range(6) if all(x['slot']!=i for x in room['players'].values())),None)
                    if slot is None: raise ValueError('room full')
                    p={'id':pid,'slot':slot,'token':secrets.token_urlsafe(32),
                        'model':model,'name':str(msg.get('name') or 'Pilot')[:18],
                        'ws':None,'queue':None}
                    room['players'][pid]=p
                    if room['host'] is None:room['host']=pid
                if p['ws'] is not None: await p['ws'].close(code=4000, message=b'reconnected')
                reply = await self.command({'op':'join','room':code,'course':course,'id':p['id'],
                    'model':p['model'],'name':p['name'],'slot':p['slot']},True)
                room['world']=reply['world']
                if self.production and not room['lease_claimed']:
                    try:
                        claimed=await self.lease_rpc('redline_authority_claim_v145',
                            {'p_code':code,'p_world':room['world'],'p_course':course,
                             'p_revision':136 if course=='iron' else 37,'p_host':room['host'],
                             'p_instance':self.instance_id})
                    except Exception: claimed=False
                    if not claimed:
                        await self.command({'op':'delete','room':code},reply=True)
                        self.rooms.pop(code,None)
                        p=None
                        raise ValueError('another authority process owns this room or Supabase is unavailable')
                    room['lease_claimed']=True
                q = asyncio.Queue(maxsize=1)
                p.update(ws=ws,queue=q)
                room['empty_since']=None
                await ws.send_json({'type':'joined','id':p['id'],'token':p['token'],
                    'world':room['world'],'host':p['id']==room['host'],'ack':reply['ack'],
                    'protocol':145,'course':course})
                writer=asyncio.create_task(write(q))
            last=0;window=time.monotonic();count=0
            async for item in ws:
                if item.type != WSMsgType.TEXT: continue
                now = time.monotonic()
                if now-window>=1:count=0;window=now
                count+=1
                if count>INPUT_HZ_LIMIT: await ws.close(code=1008,message=b'rate limit');break
                try: data=json.loads(item.data)
                except (ValueError,TypeError): continue
                if not isinstance(data,dict): continue
                if data.get('op')=='input' and now-last>=.008:
                    last=now
                    await self.command({'op':'input','room':code,'id':p['id'],'input':data.get('input')})
                elif data.get('op')=='model' and not room['started']:
                    model_choice=data.get('model')
                    if model_choice not in ('kestrel','blade','copper','spirit'):raise ValueError('unknown model')
                    if self.production:
                        fresh=await self.authenticate(msg)
                        if fresh['stage']!='lobby':raise ValueError('model selection locked')
                    await self.command({'op':'model','room':code,'id':p['id'],'model':model_choice},True)
                    p['model']=model_choice
                elif data.get('op')=='start':
                    async with self.lock:
                        if room['host'] != p['id']: raise ValueError('host only')
                        if not room['started']:
                            online=sum(1 for v in room['players'].values() if v.get('ws') and not v['ws'].closed)
                            if online<2: raise ValueError('two connected players required')
                            await self.command({'op':'start','room':code},True)
                            room['started']=True
                            await ws.send_json({'type':'started','world':room['world']})
        except (ValueError,RuntimeError,asyncio.TimeoutError) as exc:
            if not ws.closed:await ws.send_json({'type':'error','message':str(exc)})
        finally:
            if writer:
                writer.cancel()
                await asyncio.gather(writer,return_exceptions=True)
            if p and p.get('ws') is ws:
                p.update(ws=None,queue=None)
                try: await self.command({'op':'disconnect','room':code,'id':p['id']})
                except Exception:pass
            await ws.close()
        return ws

    async def cleanup(self, app):
        if self.sweeper_task:
            self.sweeper_task.cancel()
            await asyncio.gather(self.sweeper_task,return_exceptions=True)
        if self.proc and self.proc.returncode is None:
            self.proc.terminate()
            await self.proc.wait()
        if self.reader_task:await self.reader_task
        if self.http:await self.http.close()

def create_app():
    gateway=Gateway()
    app=web.Application()
    app.on_startup.append(gateway.launch)
    app.on_cleanup.append(gateway.cleanup)
    app.router.add_get('/ws',gateway.socket)
    app.router.add_get('/health',lambda _:web.json_response({'ok':gateway.proc is not None and gateway.proc.returncode is None,'rooms':len(gateway.rooms),'version':145}))
    app.router.add_get('/',lambda _:web.json_response({'service':'REDLINE shared authority','version':145}))
    return app

if __name__=='__main__':
    web.run_app(create_app(),host=os.environ.get('HOST','0.0.0.0'),port=int(os.environ.get('PORT','8787')))
