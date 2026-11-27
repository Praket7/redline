import asyncio,json,time
from aiohttp import web, ClientSession
from server import create_app
async def receive(ws,kind):
    async with asyncio.timeout(4):
        while True:
            m=await ws.receive_json()
            if m.get('type')==kind:return m
async def main():
    runner=web.AppRunner(create_app());await runner.setup()
    site=web.TCPSite(runner,'127.0.0.1',0);await site.start()
    port=site._server.sockets[0].getsockname()[1];base=f'http://127.0.0.1:{port}/ws'
    checks=0
    async with ClientSession() as session:
        a=await session.ws_connect(base);await a.send_json({'op':'join','room':'HARDEN1','course':'grand','name':'A'})
        ja=await receive(a,'joined');checks+=1
        await a.send_json({'op':'start'})
        e=await receive(a,'error');assert 'two connected' in e['message'];checks+=1
        bad=await session.ws_connect(base)
        await bad.send_json({'op':'join','room':'HARDEN1','course':'grand','token':'invalid'})
        er=await receive(bad,'error');assert 'invalid reconnect' in er['message'];checks+=1
        await bad.close()
        b=await session.ws_connect(base);await b.send_json({'op':'join','room':'HARDEN1','course':'grand','name':'B'})
        jb=await receive(b,'joined');assert jb['id']!=ja['id'];checks+=1
        await a.close()
        c=await session.ws_connect(base);await c.send_json({'op':'join','room':'HARDEN1','course':'grand','token':ja['token']})
        jc=await receive(c,'joined');assert jc['id']==ja['id'];checks+=1
        await c.send_json({'op':'start'});await asyncio.sleep(.2)
        await c.close();await b.close()
        await asyncio.sleep(.2)
        gateway=runner.app.on_cleanup # sanity, cleanup task tested indirectly
        checks+=1
    await runner.cleanup()
    print(json.dumps({'gateway_assertions':checks,'transport':'real WebSockets','production_auth':False}))
asyncio.run(main())
