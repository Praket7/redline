"""Regression checks for the compatibility-preserving gateway patch."""
import asyncio
import os
import time
from unittest.mock import AsyncMock
os.environ['REDLINE_REQUIRE_AUTH']='0'
from server import Gateway,create_app
from aiohttp import web,ClientSession

async def main():
    g=Gateway()
    g.production=True
    g.lease_rpc=AsyncMock(return_value=False)
    room={'saving':True}
    snap={'world':'test','room':'TEST','course':'grand','revision':37,
          'tick':360,'startTick':60,'players':[{'id':'A','name':'A','model':'kestrel','finished':5,'gates':36}]}
    for i in range(1,9):
        before=time.monotonic()
        await g.persist_match(room,snap)
        assert not room['saving'] and not room.get('result_saved')
        assert min(30,2**i)-.01 <= room['save_retry_at']-before <= min(30,2**i)+1
        assert room['save_failures']==min(i,6)
    g.lease_rpc.return_value=True
    await g.persist_match(room,snap)
    assert room['result_saved'] and 'save_retry_at' not in room and 'save_failures' not in room
    runner=web.AppRunner(create_app())
    await runner.setup()
    site=web.TCPSite(runner,'127.0.0.1',0)
    await site.start()
    url=f'http://127.0.0.1:{site._server.sockets[0].getsockname()[1]}/ws'
    async def recv(ws,typ,pred=lambda _:True):
        async with asyncio.timeout(10):
            while True:
                d=await ws.receive_json()
                if d.get('type')=='error': raise AssertionError(d)
                if d.get('type')==typ and pred(d): return d
    try:
        async with ClientSession() as s:
            a=await s.ws_connect(url)
            await a.send_json({'op':'join','room':'RECONQA','course':'frost','model':'kestrel'})
            first=await recv(a,'joined')
            b=await s.ws_connect(url)
            await b.send_json({'op':'join','room':'RECONQA','course':'frost','model':'kestrel','token':first['token']})
            second=await recv(b,'joined')
            assert second['id']==first['id'] and second['world']==first['world']
            await recv(b,'snapshot',lambda d:any(p['id']==first['id'] and p['connected'] for p in d['players']))
            await asyncio.sleep(.15)
            d=await recv(b,'snapshot')
            assert len(d['players'])==1 and d['players'][0]['connected']
            await b.close()
            await a.close()
    finally:
        await runner.cleanup()
    print('GATEWAY_HARDENING_PASS: eight backoff failures, recovery, live-socket replacement, same world')
asyncio.run(main())
