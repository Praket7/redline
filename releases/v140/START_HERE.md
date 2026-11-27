# REDLINE v140 — continuation entry point
Read [HANDOFF.md](HANDOFF.md) in full before making changes. It contains the architecture, exact baseline recovery instructions, Supabase/Vercel details and mandatory release gates.

## Latest verified state (Nov 26, 2026)
Working branch: stage6/v140-authoritative-world. Existing authority core and SQL are committed, not deployed. Production v139 must remain intact until acceptance. This branch diverges from the old v133 integration branch; do not assume its historical main checkout is the current game.

The exact v139 standalone was recovered from ChatGPT Library again: REDLINE_v139_SHARED_WORLD.html, 43,084,113 bytes, SHA-256 4085caaa0690f91a5492561c232d663f95c66d79aacc6a514ee86c189b9f7781. The original reported v140 prototype archive was not recovered; do not misrepresent the replacement room core as that prototype.

New commit f44a66a8ea0dbd535448433f52a476029cb0287e adds authority/flight-parity.test.cjs. A local run using the recovered original v139 flight integrator and exact room.cjs (Git blob d3a621e3be4d10aa9c38492f1cd79e1bdc0f694e) passed 38,173 assertions, 720 room ticks and 5,760 reference substeps across all four models and both map settings. This is actual flight-module parity with synthetic world adapters, NOT combat, real map collision, WebSocket or GPU testing.

```sh
git clone https://github.com/Praket7/redline.git
cd redline
git switch stage6/v140-authoritative-world
python releases/v140/extract_standalone.py /path/to/REDLINE_v139_SHARED_WORLD.html --out /tmp/redline-v139
node releases/v140/authority/room.test.cjs
node releases/v140/authority/flight-parity.test.cjs /tmp/redline-v139/flight.cjs
```

The original stepFlight(...,1/60) internally executes two 120 Hz integration steps. Do not call it twice at 1/60. If doing collision per substep, step at 1/120 and account for crossing fractions. The game passes minAltitude=4.5 for Grand Gorge and -16.4 for Iron Tide; actual terrain floor and 310m ceiling are separate world-layer constraints. Current room core only forwards settings. Never ship the synthetic test adapters.

## Non-negotiable implementation sequence
1. Extract source and assets; obtain original v140 prototype if the user has it. Preserve v139 visual, UI and control changes. Do not blindly merge historical branches.
2. Export actual shared collision world for both courses, including Iron Tide's submerged dock and Grand Gorge dam. Match renderer coordinate frame, spawn slots, all gate planes, terrain and obstacles. Hash/version the collision pack; use swept collisions and parity tests.
3. Build a persistent authenticated game server, one exclusive room owner, 60 Hz room loop, shared 120 Hz flight physics, immutable race/course revision. Inputs only; reject client pose, victim, progress, finish, damage claims. Server owns all players and bots. Implement rate limiting, lease fencing, event deduplication, reconnection, DNF, rematch and crash-safe settlement. Add bounded logs and metrics.
4. Implement actual server-side combat and races: ray/segment hit and obstruction, shield, ammo, reload, EMP, recovery, all checkpoints and fractional crossing finish times. Supabase owns membership and durable results, not physics ticks. Audit existing results SQL and use server-only credentials, isolated protocol and idempotent results. Do not mutate production while testing.
5. Replace multiplayer movement path in original Three.js game, behind an explicit feature flag. Browser sends controls and renders the server's local and remote aircraft entities. Client interpolation/prediction only for display; never authoritative. Disable old pose/trace/finish pathways in new mode. No fallback to parallel local races. Preserve solo and UI.
6. Host persistent WSS service separately; Vercel remains static frontend at redlin3.vercel.app. Supabase project gudzbisvhrvmduvbtcrh. Use existing Vercel team praket7-s-projects, verify target. No server hosting provider has been provisioned here. Review current host constraints, budget and access before provisioning. Use secret env vars on server, not public repo or browser.
7. Prove two independently controlled rendered browsers/devices on public WSS in the same race, with visible actual models, overtaking, shield/laser/EMP, all laps and correct finish order, on both maps. Test 2–6 players, simultaneous rooms, RTT/jitter/loss, rejoin and wrong-room/invalid-input rejection. Record server tick p95/p99, latency, corrections, CPU/memory, screenshots and real device GPU performance. Green CI alone is insufficient.
8. Deliver tested server deployment, preview frontend, migration and rollback instructions, then production only after acceptance. Keep v139 rollback. Do not declare success based on mocked transport, SQL-only tests or Atelier commands that never returned results.

Direct git access failed DNS in this environment; GitHub connector writes succeeded. No public WSS server or new client integration has been completed. No production deployment or main merge was performed in this continuation. The original full handoff remains authoritative for details; this entry point adds the latest verification and corrects the integration order.
