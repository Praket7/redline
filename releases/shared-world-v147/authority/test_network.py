import asyncio, json
from aiohttp import web, ClientSession
from server import create_app
async def main():
    runner=web.AppRunner(create_app());await runner.setup();site=web.TCPSite(runner,'127.0.0.1',0);await site.start();port=site._server.sockets[0].getsockname()[1]
    checks=0
    async def recv(ws,kind,pred=lambda d:True):
        async with asyncio.timeout(8):
            while True:
                d=await ws.receive_json()
                if d.get('type')==kind and pred(d):return d
    async with ClientSession() as s:
        for course in ('grand','iron'):
            a=await s.ws_connect(f'http://127.0.0.1:{port}/ws');b=await s.ws_connect(f'http://127.0.0.1:{port}/ws');room='QA'+course
            for w,n in [(a,'A'),(b,'B')]:await w.send_json(dict(op='join',room=room,course=course,name=n))
            ja,jb=await asyncio.gather(recv(a,'joined'),recv(b,'joined'));assert ja['world']==jb['world'] and ja['id']!=jb['id'];checks+=1
            v=await recv(a,'snapshot',lambda d:len(d['players'])==2);p0={p['id']:p['p'] for p in v['players']};await a.send_json({'op':'start'})
            v=await recv(a,'snapshot',lambda d:d['startTick'] is not None and d['tick']>d['startTick']);
            # Both independent network connections submit controls, never positions.
            for seq in range(1,31):
                await a.send_json({'op':'input','input':{'seq':seq,'throttle':1,'p':[9999,9999,9999]}})
                await b.send_json({'op':'input','input':{'seq':seq,'strafe':1,'lift':1,'shield':True}})
                await asyncio.sleep(.035)
            va,vb=await asyncio.gather(recv(a,'snapshot',lambda d:all(p['ack']==30 for p in d['players'])),recv(b,'snapshot',lambda d:all(p['ack']==30 for p in d['players'])))
            assert va['world']==vb['world']==ja['world'];checks+=1
            for v in (va,vb):
                p={p['id']:p for p in v['players']};assert p[ja['id']]['p']!=p0[ja['id']] and p[jb['id']]['p'][1]>p0[jb['id']][1];assert max(abs(x) for x in p[ja['id']]['p'])<1400;assert p[jb['id']]['shield'];checks+=3
            await a.send_json({'op':'input','input':{'seq':1,'throttle':-1}});await asyncio.sleep(.1);v=await recv(b,'snapshot',lambda d:d['tick']>vb['tick']);assert next(p for p in v['players'] if p['id']==ja['id'])['ack']==30;checks+=1
            await a.close();await recv(b,'snapshot',lambda d:any(p['id']==ja['id'] and not p['connected'] for p in d['players']));c=await s.ws_connect(f'http://127.0.0.1:{port}/ws');await c.send_json(dict(op='join',room=room,course=course,token=ja['token']));j=await recv(c,'joined');assert j['world']==ja['world'] and j['id']==ja['id'] and j['ack']==30;checks+=1
            await c.close();await b.close()
    await runner.cleanup();print(json.dumps({'network_assertions':checks,'courses':2,'transport':'actual localhost WebSocket connections','production_internet':False}))
asyncio.run(main())
