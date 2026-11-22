# Three.js migration: renderer safety gates

REDLINE v77 was built against `three.js r128` as a classic global `window.THREE`, with custom shaders, fixed-function tone mapping choices, physics-attached presentation meshes, deferred GLB decoding and transparent photographic cockpit overlays. The stable v78 release preserves r128. **Do not change to the latest Three.js just to increase the version number.**

The official [Three.js Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide) recommends migrating in increments of ten releases so API changes can be addressed while warnings are available.

## Incremental plan

1. Preserve fixed screenshots and camera samples from r128 across Hangar, Grand Gorge (Raven Slalom), Raven Sprint, all four cockpits, sunset, water, shadows and lasers.
2. Test r138 in `dist/experimental_renderer_r138_UNVERIFIED.html` (first generated canary). Check WebGL rendering and 60 Hz physics consistency before promotion.
3. Continue approximately r148, r158, r168, r178, r188 with capture and test gates at every hop. Do not assume the old global script build exists indefinitely. A module-based Three.js loader will be required.
4. Explicitly migrate `outputEncoding` and texture encoding to modern `outputColorSpace` and texture `colorSpace` at the relevant upgrade, and review lighting changes around r155. PBR brightness changes are intentional API semantics, not always a bug.
5. Move GLB loading to current `GLTFLoader`, then verify all four asset bundles. Add Meshopt/KTX2 only after the original renderer comparisons pass. Avoid replacing the actual aircraft models during a renderer upgrade.
6. Update tests and promote ONLY after no unexpected black materials, no cockpit depth/alpha artifacts, no broken custom shaders, no steering/physics change, stable FPS, and no boot crash on Chrome, Firefox and Safari.

## Current status

- r128 release: frozen, syntax and isolated tests pass; no full-game WebGL render in this environment.
- r138 canary: source generated, **unverified and unsupported** until run on a developer machine.
- r148+ modernization: **not implemented**. No claim of production migration.

References: [Three.js migration](https://github.com/mrdoob/three.js/wiki/Migration-Guide), [renderer statistics](https://threejs.org/docs/pages/WebGLRenderer), [Playwright screenshot tests](https://playwright.dev/docs/test-snapshots).
