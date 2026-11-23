# v78 release gates

| Stage 1 task | State | Evidence and remaining gate |
|---|---|---|
| 1 Frozen v77 | Done | SHA-256 original in manifest, original unchanged. |
| 2 Modular source/build | Done | 40 original scripts (including CDN and deferred blobs), with 28 missing initial-transfer files recovered from hash-verified split archives, 36 original styles, 19 extracted image assets, two output types. Deferred GLBs remain inline in generated HTML intentionally. |
| 3 Modern Three.js | Partial | Current known-good release stays pinned r128. Incremental modern renderer upgrade with visual comparisons tracked in [#2](https://github.com/Praket7/redline/issues/2). |
| 4 Full-game browser QA | WebGL smoke PASS | GitHub Actions [45089329040](https://github.com/Praket7/redline/actions/runs/45089329040) ran the actual engine for all four aircraft, tested real hangar selection, chase/FPV and speed/altitude/boost. Full race finish/replay soak is still outside this smoke suite. |
| 5 Graphics telemetry | Done, CPU-only | F8 dashboard: fps, p50/p95, CPU update/render, draw calls, triangles, geometry/texture counts. GPU timing not yet instrumented. |
| 6 Sim/render boundaries | Partial | Read-only 60Hz snapshot and existing render quaternion interpolation verified; deeper extraction tracked in [#3](https://github.com/Praket7/redline/issues/3). |
| 7 Unified FPV UI | Partial | All four actual FPV screenshot and instrument tests passed in CI; legacy stylesheet consolidation and cross-browser visual regression remain [#4](https://github.com/Praket7/redline/issues/4). |
| 8 Graphics QA scene | WebGL PASS | Fixed Raven Slalom camera generated real screenshot and metric report in [CI artifacts](https://github.com/Praket7/redline/actions/runs/45089329040). Geometry/material determinism across platforms needs further validation. |
| 9 Asset validation | Done structurally | All 4 GLBs, 19 extracted image assets pass structural checks; art warnings documented (missing NORMAL/UV data on some meshes). Not remodeled. |
| 10 Showcase sector | Done for Stage 1 | Raven Slalom at route fraction .156, camera capture hook, benchmark viewport 1600×900. Environment art overhaul is Stage 2. |

## Verified automated result

The merged Stage 1 branch passed [CI run 45089329040](https://github.com/Praket7/redline/actions/runs/45089329040): source, assets, all four true WebGL flight/hangar/FPV checks and live telemetry, and Raven benchmark. Software-rendering benchmark recorded 10.0 FPS median, median p95 frame time 322.7 ms, and 438 draw calls; **this is not a hardware performance pass**. No claim is made for modern Three.js, cross-browser Safari/Firefox, completion/replay endurance, or GPU-time measurement.

## Explicit constraints

Never replace a v77 working cockpit, flight controller or map solely to satisfy a numerical feature checklist. Full-game visual and navigation correctness remains a requirement before calling this a public release.

## Performance acceptance (targets, not measured results)

- Desktop 60 fps; optional lower tier 30 fps; target p95 frame time ≤ 16.7 ms at 60 fps target hardware under stable test conditions.
- No recurrent >100ms stalls at maximum normal flight speed.
- No unbounded texture or geometry growth after 20 aircraft and course switches.
- Validate full screen, narrow mobile layouts, and FPV/chase transitions.
- Compare renderer upgrade at one fixed point under identical lighting and resolution; gate on visible changes, not just compile success.

## Research basis

- Three.js migration: https://github.com/mrdoob/three.js/wiki/Migration-Guide
- Three.js renderer stats: https://threejs.org/docs/pages/WebGLRenderer
- glTF-Transform for reproducible model transformations: https://github.com/donmccurdy/glTF-Transform
- Playwright visual snapshot best practices: https://playwright.dev/docs/test-snapshots
- GameRTS regression research: https://scispace.com/papers/gamerts-a-regression-testing-framework-for-video-games-oeftnqkb
- Terrain evaluation controlled comparisons: https://www.alphaxiv.org/abs/2608.17390