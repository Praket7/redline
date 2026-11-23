# REDLINE v80 — Lightweight Flight & Hangar Release

## Objective
Reduce r187 browser download/memory/fragment workload **without** weakening the core simulation or sacrificing the four complete craft meshes. Increase vertical mouse pitch sensitivity without changing horizontal yaw. Make the hangar more detailed, lit and legible, and ensure its selection animation does not clip aircraft wings/thrusters.

## Research and techniques
- Three.js official [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer) documents device pixel ratio, GPU draw-call statistics and shadow-map controls. v80 starts at 0.86 device pixels per CSS pixel and caps Balanced settings below the earlier release. This reduces fragment shading; it does not reduce geometry counts.
- Three.js [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh) supports rendering repeated mechanical panels/fasteners using substantially fewer draw calls; v80 batches floor panels, bolt heads and seams into three instance draws and runway lighting into two additional batches.
- Three.js [shadows guide](https://threejs.org/manual/pages/shadows.html) documents shadow map size/rendering cost. v80 reduces the default directional shadow map resolution and hangar shadow map from 2048 to 1024, while preserving responsive high-detail options.
- Google's [Choosing image formats](https://web.dev/articles/choose-the-right-image-format) describes WebP support for alpha transparency and lossy compression. v80 transforms seven oversized cockpit image assets to high-quality WebP, with original craft GLBs/terrain maps left bit-identical.
- Unity's [automotive showroom reference](https://unity.com/blog/industry/take-a-ride-with-the-auto-showroom-sample-template-and-volvo-xc40-recharge) supports multiple soft studio light sources and visibly grounded hero craft presentation. v80 adjusts hangar lighting and positioning and adds realistic floor infrastructure at low draw-call cost.
- Input controls respect user comfort: pitch is bounded to ±0.31 rad and input response is faster, but yaw and forward speed remain unchanged.

## Verified local and GitHub CI results
- Old r187 standalone: 22,726,275 bytes.
- Compact v80 standalone: 15,684,046 bytes (30.99% smaller).
- Seven image assets optimized in the build; six of those are embedded in the actual standalone HTML. The remaining seventh is used in hosted assets. Decoded alpha has been verified.
- The four GLB models remain byte-identical to the r187 baseline.
- A controlled pitch simulation with 80px mouse movement produces approximately ±0.2484 rad commanded pitch. After 40 simulation frames, up/down vertical speeds are approximately ±39.28 game units/s while forward speeds are identical; this is a deterministic unit test, not a human usability test.

## Acceptance gates
1. Full Chromium/WebGL aircraft and hangar selection for Kestrel, Blade, Copper and Spirit, using the actual models rather than merely changing model labels.
2. Full FPV with changing, real speed, altitude and boost for all four aircraft; red laser combat and navigation unchanged.
3. Hangar aircraft position/camera footprint within viewport and stable poses on switching, with physically modeled deck details verified.
4. True standalone HTML WebGL startup, not only the modular site.
5. Raven Slalom actual WebGL capture and visual regression against the verified r128 baseline.
6. Record software-renderer frame timing; do **not** represent SwiftShader FPS as target desktop hardware FPS.

## Notes for players
Use **Graphics → Performance** if the computer has an integrated GPU or starts dropping frames. The **F8** diagnostics can show live CPU/frame timings, draw calls and current render scale. The game remains CPU/GPU-intensive due to its full terrain and four detailed craft; download compression alone does not guarantee a particular FPS. The browser may need one initial asset decode pass after launching.

## Next optimization options (not included)
- Progressive texture decoding and separate glTF downloads to avoid parsing a single huge HTML.
- LOD group refinement for distant canyon/pillars and occlusion culling.
- Reducing overdraw from multiple transparent cockpit/glass layers.
- Per-aircraft material consolidation and texture atlasing after visual regression coverage.
