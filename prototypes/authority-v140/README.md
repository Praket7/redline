# REDLINE 141–144 development integration

This branch adds a hardened local gateway, a triangle-collision engine, an opt-in Three.js shared-world renderer and client-side prediction/interpolation. **It is not a production multiplayer release.** The existing game and live Supabase tables remain unchanged.

### Status and honest boundaries

| Stage | Code delivered | Release blocker |
| --- | --- | --- |
| 141 | Room TTL, reconnect-token validation, quorum on race start, host reassignment, rate limits and WebSocket regression suite | Continuous-host crash recovery, authenticated room membership and network hardening |
| 142 | Sphere/triangle contact, swept sphere test, raycast obstruction, SHA-256 validation of geometry exports | Actual v139 Grand and Iron collision exports MUST be captured and certified, including movable objects, surface and collision parity |
| 143 | Opt-in Three.js scene bridge with one world, peer avatars, server events, race controls and model-factory hook | Attach original four craft assets to live v139 scene and disable legacy online pose-authority; real browser visual and input testing |
| 144 | Server-ack input history replay, 20 Hz snapshot buffer with 120 ms interpolation, bounded extrapolation and visual correction | Latency, jitter, packet loss, mobile/control integration and deterministic physics parity validation |

### Run

```bash
python -m pip install -r requirements.txt
python server.py
# open http://127.0.0.1:8787 in two tabs
node test_world.cjs
node test_collision_netcode.cjs
python test_network.py
python test_gateway.py
```

The gateway binds localhost; clients may only use WSS or localhost WS. No Supabase service credentials are used.

### Geometry export contract

`collision.cjs` loads `collision_exports/grand.json` or `collision_exports/iron.json`, each with:

```json
{"source":"REDLINE CLIFF COLLIDER v139","course":"grand","revision":37,"sha256":"sha256-of-JSON.stringify(triangles)","triangles":[[0,0,0,1,0,0,0,1,0]]}
```

Those sample coordinates are illustrative only; NEVER ship that example as map data. Each triangle must be world-space coordinates drawn from the actual v139 collider, not a visually similar proxy. For Iron Tide the source uses transformed instance geometries. No real export has been committed. Set `REDLINE_COLLISION_STRICT=1` to make missing exports fail closed.

### Browser adapter

The UMD scripts `netcode.cjs` and `three_client.js` can be loaded after Three.js. To render the networked race in a Three.js scene:

```js
const bridge = new REDLINE_THREE_CLIENT.Bridge({
  THREE, scene,
  modelFactory: (model, id) => existingAircraftModels[model]?.clone(),
  input: () => ({ throttle, steer, strafe, lift, pitch, boost, brake, fire, shield, emp }),
  flight: REDLINE_FLIGHT
});
bridge.connect({url:"wss://YOUR-PERSISTENT-GAME-SERVER/ws",room:"ROOM123",course:"grand"});
function frame(time) { bridge.draw(time); renderer.render(scene,camera); requestAnimationFrame(frame); }
```

This interface is NOT currently installed as the active gameplay loop in v139. Do not replace the solo flight loop with it until local/player physics is gated in online mode. The fallback aircraft are debug geometry, not game assets. No Vercel Function or Supabase Edge Function can substitute for a persistent authoritative match process without runtime limitations.

### Research
- Gabriel Gambetta: https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html
- Gabriel Gambetta snapshot interpolation: https://www.gabrielgambetta.com/entity-interpolation.html
- Three.js geometry BVH spatial queries: https://gkjohnson.github.io/tools/docs/three-mesh-bvh/
- Supabase WebSocket handling: https://supabase.com/docs/guides/functions/websockets

Do not mark stages 142 or 143 complete until the original v139 environment runs in a real WebGL renderer with extracted collision meshes and separate physical clients.


### v139 source patch and collision capture

The latest v139 standalone HTML was recovered from the user's project files (SHA-256 `95e70d59772cf1698fc431ae605eba610da0f51d08aa0386e6aa2bd12f057f8d`). It is **not** the older v78 source found on the GitHub main branch. No replacement of that 43 MB original is committed.

```bash
python patch_v139.py path/to/REDLINE_v139_SHARED_WORLD.html --output REDLINE_v139_v144_LAB.html
```

This creates a modified **copy**. It adds `REDLINE_V142_SAVE()` to extract the exact visible collision-triangle sources after Grand Gorge or Iron Tide has initialized, and the opt-in `REDLINE_V144_ATTACH({url,room,course,model,name})` shared-world lab adapter, whose peers use cloned original craft templates when available. The local engine's solo/competitive score path remains untouched. Neither command runs automatically. The generated file requires working WebGL and a secured browser context for SHA-256 exports.

The exporter must be run on both courses. Check the exported hash and source revision before placing each downloaded file at `collision_exports/{course}.json`. Dynamic collider owners, heightfields, water and exact movement parity still require explicit examination; a triangle export alone is **not** a collision-certification result.

### Supabase schema review

A non-disruptive migration named `redline_authority_runtime_lifecycle_v141` was applied to the existing REDLINE Multiplayer project on 2026-11-27. The new, initially empty `public.redline_authority_runtime_v141` records server-owned world IDs, course/revision, lifecycle state, host identity and heartbeat/expiry. RLS is enabled, anon/authenticated table privileges are revoked, and service_role has CRUD. No production race was started and no result was inserted. The migration is mirrored under `supabase/migrations/`. Until a persistent authenticated authority host consumes it, it is metadata infrastructure only.
