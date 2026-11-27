# REDLINE v145 — One Shared World (v139 graphical game + v140 authoritative engine)

## What this changes

This is a source-level replacement for v139's browser-to-browser pose mirroring. It preserves the original `REDLINE_v139_DEPLOY` Three.js environment, four aircraft templates, user interface and Iron Tide asset pack. Multiplayer flights now run in **one persistent authoritative Node world per room** at a 60 Hz simulation cadence. Each connected client sends **control inputs only**, and receives the same world identity, tick, positions, checkpoint progress and combat outcomes from that world. Online local physics is bypassed; solo mode still uses its original physics.

Supabase remains the source of truth for room membership. The Python aiohttp WebSocket service uses the existing v130 room-authentication RPC to validate a member's UUID and room secret, and writes completed authoritative matches to the existing v140 ledger. A new v145 service-role-only database lease enforces one active authority instance for a room. If lease ownership is lost, the server disconnects players rather than allowing divergent races. Nothing here uses the Supabase pose-relay RPC for online movement.

**Important:** Every player still renders their own local graphical *view* of the same map. That is unavoidable in a networked 3D game. Only one process computes the authoritative state. Network messages to deliver the same state are still necessary; this removes duplicated independent authoritative simulations, not the laws of network transmission.

## Deployment (two separate services)

1. Deploy `authority/` as a **persistent** Docker WebSocket server (Render, Fly.io, a VM, etc.), never a Vercel serverless function. `authority/render.yaml` is an example for a GitHub checkout at `releases/shared-world-v145/authority` and may require a paid Render plan; no such hosting is provisioned by this package.
2. Set `REDLINE_REQUIRE_AUTH=1`, `SUPABASE_URL=https://gudzbisvhrvmduvbtcrh.supabase.co`, `SUPABASE_PUBLISHABLE_KEY=<your publishable key>`, and **server-side only** `SUPABASE_SERVICE_ROLE_KEY=<your service-role key>`. Never put the service-role key in client HTML, Vercel public variables or GitHub. Use a private secret manager. Keep exactly one persistent deployment active for reliable ownership; Supabase lease fencing still protects against split-brain.
3. Apply `supabase/migrations/redline_single_authority_lease_v145.sql` if deploying to a different database. **This migration has already been applied to the supplied REDLINE Supabase project**, so do not reapply it unnecessarily.
4. Change `site/authority-config.js` to `window.REDLINE_AUTHORITY_WSS = 'wss://YOUR-AUTHORITY-HOST/ws';` and deploy the complete `site/` folder to your existing static site. The included `iron-tide.pack` must remain next to `index.html`.
5. The public gateway `/health` endpoint should return `ok: true`; test two real devices against the **same** lobby. Host and guest should see one world UUID and consistent snapshots. Test both courses, all four aircraft, reconnect, race completion, shooting, shields, network interruptions and mobile controls.

The default WSS address is blank **intentionally**. Multiplayer fails closed rather than falling back to v139's divergent client-owned pose mirroring.

## Automated verification

```bash
cd authority
pip install -r requirements.txt
REDLINE_REQUIRE_AUTH=0 python test_network.py
python test_shared_world.py
node test_world.cjs
cd ..
python test_release_structure.py
node --check site/shared_world_client.js
```

The `REDLINE_REQUIRE_AUTH=0` override is **local fixture testing only** and must never be used for a public deployment. The tests open real localhost WebSockets with two and six clients, cover Grand and Iron routes, same world identity, same authoritative snapshots, server-only input processing, host-only start and player reconnection. They do **not** exercise real Supabase credentials or a publicly hosted WebSocket server.

## Unverified / release blockers

- No public persistent WSS server has been provisioned or tested against this package, so the static site cannot yet serve working multiplayer until `authority-config.js` is configured.
- The authoritative server currently uses coarse world-boundary and floor collision, **not** the full original Grand Gorge and Iron Tide 3D collision meshes. Complex terrain/dam/wall/contact and weapon-occlusion parity must be exported and verified before competitive release.
- Runtime Three.js multiplayer, visuals, mobile and FPV behavior have not been verified using two real devices. The automated tests verify source insertion and protocol behavior, not a visual parity certificate.
- The input path is server-authoritative with a shared tick interpolation buffer for local and remote aircraft; visual jitter may remain under high latency. The full predictive reconciliation layer is not enabled (that is a deliberate trade-off against client-side divergent physics).
- No full-match server-generated leaderboard/finish persistence end-to-end fixture has been run, and `public.redline_authority_matches_v140` only records fully completed worlds. The in-game result overlay reads snapshots and is not a substitute for complete server-side results settlement.
- **Ranked mode is disabled** until full authoritative physics parity and replay abuse resistance are established.
- Supabase's existing older `SECURITY DEFINER` RPC exposure advisories predate this change and warrant a separate permission/security audit. The new v145 RPCs have no anon/auth execute grants.

Do not claim production readiness on the basis of passing local tests alone.

## Source regeneration

To reproduce the modified HTML from the **included original v139 HTML**:

```bash
python patch_v139_single_world.py --source original/REDLINE_v139_DEPLOY/index.html --out site/index.html
```

The patcher asserts exact source anchors before modification, so it will refuse to mutate a different game revision silently. The downloadable archive includes the untouched v139 source in `original/`, the v145 game in `site/`, and the full patcher. The GitHub branch stores source and tests, but does not duplicate the large original embedded visual assets or game HTML; use the downloadable archive for an immediately deployable static directory.

## Research and rationale

- Gabriel Gambetta, **Client-Side Prediction and Server Reconciliation**: https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html
- Gabriel Gambetta, **Entity Interpolation**: https://www.gabrielgambetta.com/entity-interpolation.html
- Supabase, **Realtime Broadcast**: https://supabase.com/docs/guides/realtime/broadcast
- Supabase, **Realtime quotas and rate limits**: https://supabase.com/docs/guides/realtime/quotas

A central fixed-rate simulation with input-only upstream traffic is the correct architectural response to the reported split-world behavior. Supabase is used for validated membership and authority fencing, not for frame-by-frame motion replication.
