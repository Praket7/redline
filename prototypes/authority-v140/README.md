# REDLINE v140 — authoritative simulation foundation (NOT production release)

This package contains an actual single-world fixed-step multiplayer prototype extracted from the recovered v139 flight code. It does not alter the deployed game. The browser test view is deliberately diagnostic, not the final Three.js game. Do not deploy this ZIP to Vercel as a replacement for REDLINE.

## Try the implemented prototype
Requires Node 22 and Python 3.11+ with aiohttp. From this folder:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python server.py
```

Open http://127.0.0.1:8787 in two tabs. Use the same room code/course, join as different names, then start with the first tab. Both aircraft appear in the same server-owned simulation. Open a separate tab for the other circuit; it must use another room code. Controls are listed on the lab page. No account, database key, or production data is needed for this local test.

Run `node test_world.cjs` and `python test_network.py` to reproduce tests. Local WebSocket tests exercise actual sockets, not a mocked broadcast. The server binds loopback only; do not expose this diagnostic gateway publicly.

## Authority contract
- A single persistent worker owns all player physics and match state. It runs a 60 Hz world loop using the original v139 120 Hz flight integrator. State snapshots are emitted at 20 Hz. Clients submit bounded control intents and monotonic sequence numbers, never coordinates, hits, checkpoint counts or finish times.
- Each room receives a unique world ID. Reconnecting with the server-issued random token preserves identity and world state. Stale inputs expire after 0.5 seconds. The host starts the countdown. The worker resolves gates, laser/shield/EMP effects, aircraft separation, ammo, and finish order. Finish timing is based on gate crossing fraction inside the server tick.
- The real 12 Grand Gorge and 20 Iron Tide gate planes are included. Iron Tide planes come from v139; Grand Gorge planes were read from the live v127 server validator. The original aircraft profiles and flight integration code are copied without modification.
- **Not complete:** full collision meshes, exact canyon terrain/wind, dam rules, environment events, AI, weapon obstruction, original Three.js UI/HUD, prediction/reconciliation, production authentication, reconnect across worker restart, orchestration, ranked integrity, persistence and two-device internet tests. The current prototype uses map bounds and coarse floor rules only; it must not be used for competitive matches. Local gateway limits are not a production security boundary.

## Supabase and hosted deployment
The existing REDLINE project is healthy. `redline_sync_room_v130` can validate room credentials and return course/roster/model metadata. A server-side adapter is included, but is not yet wired to this local diagnostic gateway. `redline_authority_matches_v140` already exists in production; RLS is enabled, anon/authenticated roles cannot insert, service_role can. No schema changes were applied and no production matches were written. Use Supabase for lobby identity, server assignment, records and results. Do NOT send v140 movement via the v139 pose/trace endpoints or run a physics loop inside each Edge Function invocation. Hosted Supabase Edge Functions are duration/CPU limited; Vercel Functions are not persistent WebSocket servers. Run the simulation on a persistent game host with TLS. Keep the website on Vercel. The server-only result writer and room lifecycle must be implemented and tested before production cutover.

## Required next integration
1. Export or port exact Grand Gorge and Iron Tide collision meshes into a headless authoritative physics adapter (including terrain, water, dam, world events and line of sight). Verify swept collision parity against v139 and full route flight.
2. Replace online mode in v139: submit inputs from the existing input collector, render server state using a buffered view with optional local prediction and server correction, consume authoritative combat events; remove local online finish and trace validation. Preserve solo mode. Do not use a second independent authoritative simulator on clients.
3. Wire membership verification to gateway, freeze model and map revision, allocate one worker per room, implement rate limiting, reconnect ownership, safe result writes, match cleanup, monitored deployment, and secure browser WSS configuration. Reject old-client protocol and fail closed if authoritative host is unavailable.
4. Release gate: two real browser clients on separate devices, same room/world ID, visible aircraft with actual assets, simultaneous turns, boost, collision, laser, shield, finish, reconnect, and packet-loss/latency tests on both circuits. Measure frame pacing and server tick deadline. Run 6-player stress and test that clients cannot invent position or result. Then deploy a preview before promoting redlin3.vercel.app.
