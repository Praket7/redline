import os, asyncio, json
from pathlib import Path
os.environ['REDLINE_REQUIRE_AUTH']='0'
os.environ['REDLINE_COLLISION_STRICT']='1'
from aiohttp import web, ClientSession
from server import create_app
async def main():
    runner=web.AppRunner(create_app()); await runner.setup()
    site=web.TCPSite(runner,'127.0.0.1',0); await site.start()
    try:
        url=f'http://127.0.0.1:{site._server.sockets[0].getsockname()[1]}/health'
        async with ClientSession() as s:
            async with s.get(url,headers={'Origin':'https://redlin3.vercel.app'}) as r:
                assert r.status==200 and r.headers['Access-Control-Allow-Origin']=='https://redlin3.vercel.app'
                d=await r.json(); assert d['ok'] and d['protocol']==145 and d['version']==147
                assert d['authenticated'] is False
                for c in ('grand','iron'):
                    meta=json.loads((Path(__file__).parent/'collision_exports'/f'{c}.json').read_text())
                    assert d['maps'][c]==meta['float32_sha256']
            async with s.get(url,headers={'Origin':'https://example.invalid'}) as r:
                assert 'Access-Control-Allow-Origin' not in r.headers
        print('7 local readiness and origin checks passed')
    finally: await runner.cleanup()
asyncio.run(main())
