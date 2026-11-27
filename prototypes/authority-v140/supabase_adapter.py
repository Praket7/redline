"""Future hosted gateway adapter, not enabled by local diagnostic server.
Never pass the service key to the browser. This is separate from the v139 pose RPC.
"""
import os
from aiohttp import ClientSession, ClientTimeout
class SupabaseMembership:
    def __init__(self,base=None,key=None):
        self.base=(base or os.environ['SUPABASE_URL']).rstrip('/')
        self.key=key or os.environ['SUPABASE_PUBLISHABLE_KEY']
    async def verify(self,code,pilot_id,secret):
        async with ClientSession(timeout=ClientTimeout(total=5)) as s:
            async with s.post(self.base+'/rest/v1/rpc/redline_sync_room_v130',headers={'apikey':self.key,'Content-Type':'application/json'},json={'p_code':code,'p_id':pilot_id,'p_secret':secret}) as r:
                if r.status!=200:raise PermissionError('room credential rejected')
                data=await r.json()
        room=data.get('room',{});player=next((p for p in room.get('players',[]) if p.get('id')==pilot_id),None)
        if room.get('code')!=code or not player or data.get('ranked') is not False or room.get('course') not in ('grand','iron'):raise PermissionError('unsupported room or pilot')
        model=next((m.get('model') for m in data.get('models',[]) if m.get('id')==pilot_id),'kestrel')
        if model not in ('kestrel','blade','copper','spirit'):raise PermissionError('invalid aircraft')
        return {'room':room,'player':player,'model':model}
