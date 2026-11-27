"""Persistent transport for the authoritative Node simulation. Local test mode only;
Supabase membership adapter is provided separately, not enabled for production racing.
"""
import asyncio, json, os, secrets, time
from pathlib import Path
from aiohttp import web, WSMsgType, ClientSession, ClientTimeout

ROOT=Path(__file__).resolve().parent
class Gateway:
    def __init__(self):
        self.rooms={}; self.pending={}; self.proc=None; self.counter=0; self.reader=None; self.lock=asyncio.Lock(); self.sweeper=None
    async def launch(self,app):
        self.proc=await asyncio.create_subprocess_exec('node',str(ROOT/'worker.cjs'),stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,limit=1024*1024)
        self.reader=asyncio.create_task(self.read()); self.sweeper=asyncio.create_task(self.sweep())
    async def sweep(self):
        """Bounded, deterministic room cleanup; never evict a live race."""
        try:
            while True:
                await asyncio.sleep(5)
                now=time.monotonic()
                async with self.lock:
                    expired=[]
                    for code,room in list(self.rooms.items()):
                        connected=any(p.get('ws') is not None and not p['ws'].closed for p in room['players'].values())
                        if not connected and now-room['last_active']>=45:
                            expired.append(code)
                    for code in expired:
                        self.rooms.pop(code,None)
                        if self.proc and self.proc.returncode is None:
                            await self.command({'op':'delete','room':code})
        except asyncio.CancelledError:
            pass
    async def read(self):
        while line:=await self.proc.stdout.readline():
            m=json.loads(line)
            if m['type']=='reply':
                f=self.pending.pop(m.get('rid'),None)
                if f and not f.done():f.set_result(m)
            else:
                room=self.rooms.get(m['room'])
                if room:
                    # One exact serialized snapshot for every client; slow clients never block the tick loop.
                    encoded=json.dumps(m,separators=(',',':'))
                    for p in room['players'].values():
                        q=p.get('queue')
                        if q is None:continue
                        if q.full():q.get_nowait()
                        q.put_nowait(encoded)
        for f in self.pending.values():
            if not f.done():f.set_exception(RuntimeError('authority stopped'))
        self.pending.clear()
    async def command(self,m,reply=False):
        f=None
        if reply:
            self.counter+=1;m['rid']=self.counter;f=asyncio.get_running_loop().create_future();self.pending[self.counter]=f
        self.proc.stdin.write((json.dumps(m,separators=(',',':'))+'\n').encode());await self.proc.stdin.drain()
        if f:
            try:
                r=await asyncio.wait_for(f,3)
                if not r['ok']:raise ValueError(r['error'])
                return r
            finally:self.pending.pop(m['rid'],None)
    async def cleanup(self,app):
        if self.sweeper:
            self.sweeper.cancel();await asyncio.gather(self.sweeper,return_exceptions=True)
        if self.proc and self.proc.returncode is None:self.proc.terminate();await self.proc.wait()
        if self.reader:await self.reader
    async def socket(self,req):
        ws=web.WebSocketResponse(heartbeat=15,max_msg_size=2048);await ws.prepare(req);room=None;p=None;writer=None;key=None;code=None
        async def writer_loop(q):
            while True:await ws.send_str(await q.get())
        try:
            m=await asyncio.wait_for(ws.receive_json(),5)
            if not isinstance(m,dict):raise ValueError('invalid payload')
            if not self.proc or self.proc.returncode is not None:raise RuntimeError('authority unavailable')
            code=m.get('room');course=m.get('course');model=m.get('model','kestrel');name=str(m.get('name','Pilot'))[:18]
            if m.get('op')!='join' or not isinstance(code,str) or not code.isascii() or not code.isalnum() or not 3<=len(code)<=20 or course not in ('grand','iron') or model not in ('kestrel','blade','copper','spirit'):raise ValueError('invalid join')
            async with self.lock:
                room=self.rooms.get(code)
                if room is None:
                    if len(self.rooms)>=16:raise ValueError('server full')
                    room={'course':course,'players':{},'host':None,'started':False,'last_active':time.monotonic()};self.rooms[code]=room
                if course!=room['course']:raise ValueError('wrong course')
                token=m.get('token')
                if token is not None and (not isinstance(token,str) or len(token)>100):raise ValueError('bad reconnect token')
                p=next((v for v in room['players'].values() if token and secrets.compare_digest(v['token'],token)),None)
                if token and p is None:raise PermissionError('invalid reconnect token')
                if p is None:
                    if room['started'] or len(room['players'])>=6:raise ValueError('room full or started')
                    key=secrets.token_hex(12);slot=next(i for i in range(6) if all(x['slot']!=i for x in room['players'].values()));p={'id':key,'slot':slot,'token':secrets.token_urlsafe(32),'model':model,'name':name,'queue':None,'ws':None};room['players'][key]=p
                    if room['host'] is None:room['host']=key
                else:key=p['id'];model=p['model'];name=p['name']
                if p['ws'] is not None:await p['ws'].close(code=4000,message=b'replaced connection')
                r=await self.command({'op':'join','room':code,'course':course,'id':key,'slot':p['slot'],'name':name,'model':model},True)
                room['last_active']=time.monotonic()
                q=asyncio.Queue(maxsize=1);p.update(ws=ws,queue=q)
                await ws.send_json({'type':'joined','id':key,'token':p['token'],'world':r['world'],'host':room['host']==key,'ack':r['ack']});writer=asyncio.create_task(writer_loop(q))
            last=0.;window=time.monotonic();count=0
            async for msg in ws:
                if msg.type!=WSMsgType.TEXT:continue
                now=time.monotonic();count+=1
                if now-window>=1:window=now;count=1
                if count>90:await ws.close(code=1008,message=b'input rate exceeded');break
                d=json.loads(msg.data)
                if not isinstance(d,dict):raise ValueError('invalid message')
                if d.get('op')=='input' and now-last>=.008:
                    last=now;await self.command({'op':'input','room':code,'id':key,'input':d.get('input')})
                elif d.get('op')=='start' and room['host']==key:
                    async with self.lock:
                        if not room['started']:
                            if sum(bool(x.get('ws') and not x['ws'].closed) for x in room['players'].values())<2:raise ValueError('need two connected pilots')
                            await self.command({'op':'start','room':code},True);room['started']=True
        except (ValueError,PermissionError,RuntimeError,asyncio.TimeoutError,TypeError,KeyError,OverflowError) as e:
            if not ws.closed:await ws.send_json({'type':'error','message':str(e)})
        finally:
            if writer:writer.cancel();await asyncio.gather(writer,return_exceptions=True)
            if p and p['ws'] is ws:
                p.update(ws=None,queue=None)
                room['last_active']=time.monotonic()
                if room['host']==key:
                    room['host']=next((x['id'] for x in room['players'].values() if x.get('ws') and not x['ws'].closed),key)
                if self.proc and self.proc.returncode is None:
                    await self.command({'op':'disconnect','room':code,'id':key})
            await ws.close()
        return ws

def create_app():
    g=Gateway();app=web.Application();app.on_startup.append(g.launch);app.on_cleanup.append(g.cleanup);app.router.add_get('/ws',g.socket);app.router.add_get('/',lambda _:web.FileResponse(ROOT/'demo.html'));return app
if __name__=='__main__':web.run_app(create_app(),host='127.0.0.1',port=int(os.getenv('PORT','8787')))
