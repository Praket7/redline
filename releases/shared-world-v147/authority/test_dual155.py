"""Verify legacy and current worlds share one gateway without mixing simulation revisions."""
import os,asyncio
os.environ['REDLINE_REQUIRE_AUTH']='0'
os.environ['REDLINE_COLLISION_STRICT']='1'
from aiohttp import ClientSession,web
from server import create_app
async def main():
    runner=web.AppRunner(create_app());await runner.setup();site=web.TCPSite(runner,'127.0.0.1',0);await site.start()
    base=f'http://127.0.0.1:{site._server.sockets[0].getsockname()[1]}'
    async def recv(ws,kind,pred=lambda d:True):
        async with asyncio.timeout(15):
            while True:
                m=await ws.receive_json()
                if m.get('type')==kind and pred(m):return m
    async def join(s,code,rev):
        ws=await s.ws_connect(base+'/ws')
        d={'op':'join','room':code,'course':'grand','model':'kestrel'}
        if rev==153:d.update(physicsRevision=153,release=155)
        await ws.send_json(d);return ws
    try:
        async with ClientSession() as s:
            a=await join(s,'OLDTEST',150);j=await recv(a,'joined');assert j['physicsRevision']==150
            b=await join(s,'OLDTEST',150);assert (await recv(b,'joined'))['world']==j['world']
            c=await join(s,'NEWTEST',153);k=await recv(c,'joined');assert k['physicsRevision']==153 and k['world']!=j['world']
            d=await join(s,'NEWTEST',153);assert (await recv(d,'joined'))['world']==k['world']
            wrong=await join(s,'OLDTEST',153);assert 'revision' in (await recv(wrong,'error'))['message']
            await a.send_json({'op':'start'});await recv(a,'started')
            await c.send_json({'op':'start','format':'entry','bots':1,'difficulty':'club'});await recv(c,'started')
            old=await recv(b,'snapshot',lambda x:x.get('startTick') is not None)
            new=await recv(d,'snapshot',lambda x:x.get('startTick') is not None)
            assert 'flight' not in old['players'][0] and len(old['players'])==2
            assert new['format']=='entry' and new['gateTotal']==4 and sum(p.get('bot',False) for p in new['players'])==1
            assert all(len(p['flight'])==18 for p in new['players'])
            for w in [a,b,c,d,wrong]:await w.close()
    finally:await runner.cleanup()
    print('DUAL_PROTOCOL_PASS: independent legacy and revision-153 rooms, mixed-revision rejection, new format and AI')
asyncio.run(main())
