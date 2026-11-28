import asyncio, os
os.environ['REDLINE_REQUIRE_AUTH']='0'
os.environ['REDLINE_COLLISION_STRICT']='1'
from aiohttp import ClientSession, web
from server import create_app
async def main():
    runner=web.AppRunner(create_app());await runner.setup()
    site=web.TCPSite(runner,'127.0.0.1',0);await site.start()
    base=f'http://127.0.0.1:{site._server.sockets[0].getsockname()[1]}'
    async def recv(w,t,pred=lambda _:True):
        async with asyncio.timeout(15):
            while True:
                d=await w.receive_json()
                if d.get('type')==t and pred(d):return d
    async def join(s,code,rev=None):
        w=await s.ws_connect(base+'/ws')
        packet={'op':'join','room':code,'course':'frost'}
        if rev is not None: packet.update(physicsRevision=rev,release=155)
        await w.send_json(packet)
        return w
    try:
        async with ClientSession() as s:
            a=await join(s,'OLDWORLD');j=await recv(a,'joined');assert j['physicsRevision']==150
            b=await join(s,'OLDWORLD');await recv(b,'joined')
            c=await join(s,'OLDWORLD',153);assert 'revision' in (await recv(c,'error'))['message'];await c.close()
            c=await join(s,'NEWWORLD',153);j2=await recv(c,'joined');assert j2['physicsRevision']==153 and j2['world']!=j['world']
            d=await join(s,'NEWWORLD',153);await recv(d,'joined')
            await a.send_json({'op':'start'});await recv(a,'started')
            await c.send_json({'op':'start','format':'ascent','bots':1,'difficulty':'club'});await recv(c,'started')
            old=await recv(b,'snapshot',lambda m:m['startTick'] is not None and m['tick']>m['startTick'])
            new=await recv(d,'snapshot',lambda m:m['startTick'] is not None and m['tick']>m['startTick']+5)
            assert len(old['players'])==2 and len(new['players'])==3 and new['format']=='ascent' and new['physicsRevision']==153
            assert any(p.get('bot') for p in new['players'])
            for w in (a,b,c,d):await w.close()
    finally:await runner.cleanup()
    print('PASS: simultaneous legacy and v155 worlds, revision isolation, online AI and variant start')
asyncio.run(main())
