# REDLINE v140 — authoritative multiplayer handoff

Prepared: November 26, 2026. This is an engineering handoff, not a claim that multiplayer is finished.

## Start here

Repository: https://github.com/Praket7/redline
Working branch: stage6/v140-authoritative-world
Production: https://redlin3.vercel.app (leave v139 running until acceptance passes).
Supabase project reference: gudzbisvhrvmduvbtcrh
Vercel team: praket7-s-projects; project: redline.

The user's non-negotiable requirement is a single authoritative race simulation per room, not independent browser physics with periodic pose reconciliation. Both human pilots must actually see, race, overtake, collide where appropriate, shoot, shield and finish against one another. Network messages still have to carry inputs and server state; the prohibition is against independently authoritative client worlds, not against data transport.

## What exists, and what does not

- The branch was based on main at 562a4e20af1475f359e0db6f1cadb61a9f600d53. It already contained releases/v140/supabase/authority_results_v140.sql.
- The live Supabase results table was inspected read-only on November 26: RLS enabled; anon and authenticated INSERT denied; service_role INSERT allowed. Do not grant browsers write access.
- releases/v140/extract_baseline.py was added in commit e89ad6db41de1b128a1d39e2f49ddffc426636d9. It was run successfully against the original uploaded REDLINE_v138_DEPLOY(3).zip, and its Git blob was independently checked against the local copy. It extracts the actual flight module, engine, route, and assets without overwriting the baseline.
- A previous session reported a prototype archive named REDLINE_v140_AUTHORITY_FOUNDATION.zip with a 60 Hz authority loop, original flight integrator, up to six pilots, input-only messages, movement, weapons, checkpoints and reconnect; reported 218 simulation checks and 20 real WebSocket assertions. Those are prior-session reports, not independently reproduced here. The archive is not recoverable in the current session. The original prototype server source is NOT present in this branch. A newly implemented, distinct room contract core now exists (see next section). Obtain the original ZIP from the user's downloads or prior chat if available, then inspect and commit the actual files. Otherwise implement the authority core from the verified baseline.
- **Recovered exact v139 standalone HTML in the subsequent session:** `REDLINE_v139_SHARED_WORLD.html`, 43,084,113 bytes, SHA-256 `4085caaa0690f91a5492561c232d663f95c66d79aacc6a514ee86c189b9f7781`. It is in the user's ChatGPT file library (search the exact filename). The embedded compressed Iron Tide pack is 16,525,050 bytes, SHA-256 `4d8115faea7575e2cef2a27a3fa76d0d8d66d44e65ba67c6acd24d1ec2f4022a`. The standalone file is not committed to this public repo. Extract using the instructions below. The v138 upload is an independently inspectable fallback, not a substitute for v139 changes. Preserve the v139 mountain relief, first-lap faint red navigation arrow, stronger S braking, mouse defaults (35 horizontal / 65 vertical), smoother controls, map art, hangar, and UI. Do not silently regress to v138.
- Prior v139 database tests and simulated relay tests do not prove real two-device gameplay. The user actually tried v139 and reported missing/glitching opponents, recovery prompts, and wrong finish placement. Treat this as a confirmed product failure requiring architectural correction.

## Newly committed room-authority foundation

- `releases/v140/authority/room.cjs` (commit `c3ade6528499b1613136cab3099aa71e81c03e98`): one room state, immutable course/revision, two to six admitted aircraft, fixed 60 Hz ticks, input-only messages, epoch/sequence/type/range validation, neutral controls on disconnect or input timeout, server-owned checkpoint counts and fractional finish times, snapshots and event IDs. It requires injected flight and world adapters and has no production transport.
- `releases/v140/authority/room.test.cjs` (commit `08e2542ee94b56ac38fd1869d2cf8f07ea3cff0c`): 224 assertions passed when running the exact fixture logic before committing. Run `node releases/v140/authority/room.test.cjs` again in the checkout. These are contract tests using synthetic flight and gate fixtures; not evidence of real aircraft, collisions, combat, WebSocket or live internet behavior.
- The exact recovered v139 source uses the original 120 Hz flight integrator; a 60 Hz room tick should execute two physics substeps. Both UMD modules (airframe registry followed by flight) are in script 9; when loaded as CommonJS, the exported module is REDLINE_FLIGHT and globalThis.REDLINE_AIRFRAMES contains the registry. The recovered engine is script 38. Do not use fixture adapters in production.
- Remaining core gaps: authenticate connections outside the room object, lock host controls and all transitions, prevent duplicate room ownership with a lease, validate/sanitize spawn and world adapters, implement real collision and combat event semantics, separate edge-triggered actions from held controls, bound event replay, handle DNF/timeout and rematch, process collision/checkpoint ordering correctly, add persistence and crash recovery, and implement actual transport. The core is explicitly a starter, not the missing original prototype.
- Branch ancestry warning: compared to `stage6/v133-iron-tide`, the pre-update v140 branch was 3 commits ahead and 213 behind, diverging at `562a4e20af1475f359e0db6f1cadb61a9f600d53`. Do not assume this branch contains the v139 visual/gameplay changes. Rebuild from the recovered v139 release, then integrate modular changes deliberately rather than merging old stage branches blindly.

## Recover the actual source

Clone and check out the working branch; do not merge into main until the new system passes acceptance.

    git clone https://github.com/Praket7/redline.git
    cd redline
    git switch stage6/v140-authoritative-world
    python releases/v140/extract_baseline.py "/path/to/REDLINE_v139_DEPLOY.zip" --out /tmp/redline-v139

If the standalone v139 HTML is available instead of its deployment ZIP, run:

    python releases/v140/extract_standalone.py "/path/to/REDLINE_v139_SHARED_WORLD.html" --out /tmp/redline-v139

This preserves the original HTML and recovers the binary Iron Tide pack, route JSON, actual flight module and engine. The helper is for source recovery only. If only v138 is available, run the ZIP command with the v138 archive. The helper refuses ambiguous scripts, a wrong Iron Tide route, a corrupt ZIP or a nonempty destination. Its manifest identifies the source version and hashes. It is source recovery only, not a server or deployment command.

Verified v138 fallback hashes:
- ZIP: 55cd3c0524e9a9c2546d733f6e74799fc8b08e31bc96a39035bff91dbb88d4a9
- index.html (22,418,853 bytes): 4586f0e439ebdff9e68b6082b67773266986ab22d7c08e4c8fa8b10d8317d64a
- iron-tide.pack (16,518,797 bytes): f9e8966d03a48c81490f4e19f65803a5433a66ee9184ac311d1cf2f2e129759c

The extracted flight.js contains REDLINE_AIRFRAMES, speedEnvelope and stepFlight. The engine.js contains REDLINE_ONLINE, connect, receivePose, captureTrace, drawRemote, tick, prepareRace, update(dt), redlineGridPosition, fire, createIronCollisions, buildIronTide, and ironRivalPlan. Search these names instead of trusting old v82 line numbers. In v138 the flight module is script 9 and engine is script 38 (zero-based); use signature discovery rather than hardcoded indices.

The route.json includes points, fractions, gates, gateMeta, land, dock and revision. Iron Tide v136 uses 20 mandatory white rings per lap, 60 crossings per standard race. Grand Gorge uses 12 rings per lap, 36 crossings. Keep the actual gate centers, normals, radii and order. Keep the 310 m ceiling and below-sea-level dry dock floor behavior. Preserve all four aircraft and Sport as the maximum speed setting. Raven Sprint remains a separate solo mode unless deliberately implemented.

## Architecture — the replacement, not another v139 patch

One persistent game-server process owns each live room, with an exclusive room lease/fencing token if multiple workers exist. Clients send controls; server advances a common world on a monotonic fixed timestep. Every player sees the same race ID, room state, course revision, spawn slots, aircraft entities, authoritative checkpoint counts, combat events and finish order. The browser renders and interpolates server snapshots. Optional local prediction is only a temporary rendering aid and must never decide collisions, shots, damage, gate crossings or official results.

Use a long-lived WebSocket-capable process/container on a host that supports persistent connections and continuous execution. A managed game server or dedicated Node service is suitable. Vercel continues serving the static HTML and assets; Supabase continues to own identity/membership, durable lobby metadata, match records, ranks and results. Do not attempt to run the high-frequency physics loop through Postgres RPC calls, Realtime row updates, or time-limited Edge Functions. Verify the chosen hosting service's current limits, costs, TLS/WSS support and region; no game-server hosting provider is chosen or provisioned here.

Initial targets: 60 Hz authority ticks, reuse the verified flight integrator with its required substeps (confirm actual baseline), 20–30 Hz snapshots, input sequence numbers, per-player last accepted sequence, monotonic tick IDs, bounded snapshot buffers, and one immutable race ID per start/rematch. Profile rather than assume these rates meet latency and CPU budgets.

Protocol design:
- HELLO: short-lived membership proof, room and protocol version; server verifies membership and immutable course revision. Do not send service-role keys or put durable secrets in URLs/logs.
- INPUT: monotonic sequence, bounded normalized throttle/steer/pitch/lift/strafe and discrete brake/boost/fire/reload/shield/EMP commands. Reject pose, progress, victim, damage and finish assertions from clients. Rate-limit, deduplicate, reject nonfinite values and stale epochs, clear held controls on disconnect or timeout.
- SNAPSHOT: authoritative tick, world/race ID, each pilot's model, pose, velocity, damage, shield, boost/ammo, lap, gate, finish, and last acknowledged input. Render both the local and remote aircraft from the same state stream.
- EVENT: server-assigned event ID and tick for shots, hits, shield blocks, collision/respawn, gate crossings and results; deliver reliably, deduplicate and avoid stale-race events.
- REJOIN: authenticated race membership and last acknowledged event; return full current snapshot. Reconnection must not respawn the player at an advantageous position, erase progress, or create duplicate aircraft.

Do not run both the legacy REDLINE_ONLINE path and the new authority path for the same race. Behind an explicit feature flag, disable local authoritative update(dt), client trace scoring, peer pose writes, and legacy client-side combat decisions in authoritative multiplayer. Keep the offline solo engine functional. Do not silently fall back to separate local races if the game server disconnects: surface reconnecting status and restore the server-owned state. Do not block the game render loop on per-frame HTTP or database requests.

## Implementation order

1. Recover the original v140 prototype ZIP, v139 release, test reports and any prior patches. Verify source hashes, inspect files, run tests, and commit to this branch. If recovery fails, write a fresh modular server with documented provenance. Never call a newly invented prototype the recovered source.
2. Port the actual flight integrator and all model profiles; share pure simulation modules between client (if prediction is used) and server. Preserve solo feel, S braking and tuning. Use a stable seeded RNG for authority-controlled bots if they are enabled.
3. Export actual collision geometry for both maps from the source scene builders, including transformed instances, dry dock floors, terrain and dam. Build a server-side spatial index/BVH and sweep the aircraft collider over movement. No simplified open-box arena or invisible arbitrary walls in the release. Compare sampled world-space collision queries against the shipped renderer. Include terrain updates in the asset/version manifest.
4. Allocate one authoritative room on server with an immutable course/revision/seed and spawn grid. Wire create/join/ready/start/countdown, readiness of loaded assets and admission. All participants connect to the same authority instance; create/join must be nonblocking. Preserve shared room codes and lobby UI.
5. Connect original Three.js game renderer/HUD/camera to server entities. Ensure real aircraft GLB models, bank, FPV/chase, shields, lasers, radar, names and ranking are correct; local player and opponents must occupy exactly the same coordinate system. No fake bot as opponent. Interpolate snapshots with bounded prediction/reconciliation and clear reconnect behavior. Do not remove the current game's visuals or controls to make an easier demo.
6. Implement server ray/segment hit testing, wall occlusion, cooldown/ammunition, shield/EMP and damage/respawn. Derive shot origin from server pose and validate aim against accepted controls. Determine hit target and event on server. Handle collisions, misses and simultaneous events; do not trust client-submitted target IDs.
7. Implement swept directed 3D gate crossing and server tick-based crossing times. Compute fractional crossing time within tick, then order finishes deterministically (tie-break documented). Gate counts depend on route revision, never client-reported progress. Write durable results once with idempotency keyed by race_id; test duplicate delivery and crash recovery. Restrict any ranked settlement to verified server results; keep ranked disabled for new authority mode until abuse/security tests pass.
8. Add hosted preview and CI. A second, genuinely independent browser/device must connect through the public WSS endpoint. Inspect actual WebGL screenshots/videos with Atelier if available, but a queued command is not an image or benchmark. Run the network tests without depending on Atelier; use real Playwright/Chromium with usable WebGL or actual hardware. Record raw test artifacts. Promote only after all P0 gates pass.

## Supabase and security

Keep the current v137/v139 RPCs and existing production room flow intact until cutover. Inspect the live definitions and migrations before changing anything. In particular redline_create_room_v137, redline_join_room_v137, redline_live_pose_v139 and redline_trace_batch_sync_v139 were prior flows, NOT a server authority. Do not reuse old client trace RPCs to authorize an authoritative result. Use separate protocol/version namespace and race IDs to prevent cross-version rooms and dual writes.

The existing authority_results_v140.sql defines an RLS-protected results table with a unique race_id, room_code, course, route_revision, JSON result and finished_at. Audit the room-code format constraint and any existing lobby-code format before integration. Add an idempotent trusted settlement path and strict server membership validation. Do not assume the table alone solves race authority, rankings or reconnect.

Keep secret values in server-side environment configuration only. Use least privilege, short-lived proofs, authorization checks on every room transition, controlled CORS/origin and WebSocket message limits, no cross-room leaks, no public result INSERT, and secret redaction. Review the live Supabase skill/security docs and run advisors after migrations. Use a staging project or rollback-only QA transactions for destructive simulations; don't insert fake leaderboard results into production. Document migration/rollback scripts and service deployment separately.

## Acceptance — evidence required before calling it done

P0 tests, all mandatory on both Grand Gorge and Iron Tide:
- Two separate browser/device sessions with different pilot identities join the exact same room and race ID, see both actual aircraft and can independently accelerate, brake, turn, climb, descend and overtake. Screenshots from each view show the other player's model and position. Capture server state and both client views at matching ticks.
- Hold one pilot still while the other circles and passes; verify neither is a ghost, duplicate, timer-only competitor or local bot. Confirm one simulation advances the room regardless of client FPS or tab focus.
- Shoot and miss, shoot a shield, shoot an unshielded target, shoot with a wall between pilots, EMP/reload/ammo/cooldown, simultaneous combat, respawn. Both clients see the same authoritative outcome and event IDs.
- Complete an entire race under normal networking, with player A winning. Repeat when A's client messages are delayed/reordered and when both finish nearly simultaneously. Official order is based on server crossing time, not packet arrival or client clock.
- Exercise room creation, code join, loading readiness, disconnect/rejoin, host leaving, rematch, finish retry and spectators as applicable; wrong room, wrong revision, stale packets, fake pose/finish, invalid credentials, duplicate fire and result requests must fail safely.
- Real WebSocket tests for 2–6 pilot rooms, multiple simultaneous rooms, rate limits, connection churn and bounded memory. Introduce 50/100/200 ms RTT, jitter and packet loss/reconnect. Measure input-to-render latency, remote interpolation error, correction spikes, server tick p95/p99, bandwidth, dropped snapshots and CPU/memory. Set justified budgets; no promise of zero latency.
- Preserve solo, map selection, hangar, music, controls, assets and route-clearance tests. Check actual GPU FPS/frame times and screenshot parity. First-lap guidance must disappear after the completed lap; preserve v139 mountain visual changes.
- Verify full deployment archive, dependency lockfiles, reproducible build, staging migrations, production target and rollback. Require green CI plus actual two-device internet test evidence, not only syntax checks, local in-memory relays, mock renderer or SQL transaction tests.

Suggested target: server tick p95 under 16.7 ms at intended room load (measure on chosen host); record realistic interpolation latency and frame-time percentiles. Treat targets as proposed until measured. Avoid declaring performance or visual parity from mocks.

## Final deployment

Commit modular code, test fixtures, route/collision hashes, server setup instructions, release notes and QA report. Provide a separate server deployment (WSS) and a Vercel static client package configured with the public server URL. Never put service-role secrets or private room credentials in the public bundle. Test on preview before production. Confirm Vercel project/domain via connector or CLI; deploy only the extracted release directory, never all of Downloads. Keep an immutable v139 rollback package. No production promotion or main merge was performed in this handoff pass.

## Fresh-agent instruction

Start from this branch. Recover or reconstruct the missing prototype, implement the complete authoritative replacement, host it, wire the original UI, and prove real two-human combat racing on both maps. Do not deliver another synchronized-client-world patch. Report exact code commits, server endpoint/health, migration status, test counts and evidence with distinctions between mock, local network and live internet. Fix failed gates rather than counting them as passed. If unable to access an artifact, host, GPU or independent device, say so and preserve the next actionable step.
