"""Actual socket protocol regression: one world, 6 clients, no client position authority."""
import asyncio, os
os.environ['REDLINE_REQUIRE_AUTH']='0'
from aiohttp import ClientSession, web
from server import create_app

async def run():
  runner=web.AppRunner(create_app());await runner.setup();site=web.TCPSite(runner,'127.0.0.1',0);await site.start()
  addr=f'http://127.0.0.1:{site._server.sockets[0].getsockname()[1]}/ws';checks=0
  async def get(ws,typ,pred=lambda m:True):
    async with asyncio.timeout(8):
      while True:
        m=await ws.receive_json()
        if m.get('type')==typ and pred(m):return m
  async with ClientSession() as s:
    for course in ('grand','iron'):
      clients=[await s.ws_connect(addr) for _ in range(6)]
      for i,ws in enumerate(clients):await ws.send_json({'op':'join','room':'LOAD'+course,'course':course,'name':f'Pilot {i}','model':'kestrel'})
      joined=await asyncio.gather(*(get(ws,'joined') for ws in clients))
      assert len({m['world'] for m in joined})==1 and len({m['id'] for m in joined})==6
      checks+=2
      before=await get(clients[0],'snapshot',lambda m:len(m['players'])==6)
      assert len(before['players'])==6;checks+=1
      # Non-host attempts to start must never start the world.
      await clients[1].send_json({'op':'start'});
      try:message=await get(clients[1],'error');assert 'host' in message['message'];checks+=1
      except asyncio.TimeoutError:raise AssertionError('non-host command not rejected')
      await clients[0].send_json({'op':'start'})
      after=await get(clients[0],'snapshot',lambda m:m['startTick'] is not None and m['tick']>m['startTick']+2)
      assert after['world']==before['world'] and after['startTick'] is not None;checks+=1
      # Two pilots send incompatible commands. The worker never receives their alleged coordinate.
      await clients[0].send_json({'op':'input','input':{'seq':1,'throttle':1,'p':[1000000,1000000,1000000], 'finished':0}})
      await clients[2].send_json({'op':'input','input':{'seq':1,'throttle':-1,'lift':1,'gates':60}})
      snap=await get(clients[3],'snapshot',lambda m:m['tick']>after['tick']+7)
      assert snap['world']==joined[0]['world']
      assert all(max(abs(x) for x in p['p'])<1400 and p['gates']<60 for p in snap['players'])
      checks+=2
      # A disconnected user reconnects to the SAME player and world.
      await clients[5].close()
      re=await s.ws_connect(addr)
      await re.send_json({'op':'join','room':'LOAD'+course,'course':course,'token':joined[5]['token']})
      back=await get(re,'joined')
      assert back['id']==joined[5]['id'] and back['world']==joined[0]['world'];checks+=1
      await re.close()
      for client in clients:await client.close()
  await runner.cleanup()
  print({'shared_world_assertions':checks,'courses':2,'connections_per_room':6,'server_owned_worlds':2,'public_internet_tested':False})
asyncio.run(run())
