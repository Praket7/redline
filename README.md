# REDLINE

Browser-based FPV/third-person drone racing and combat game.

This repository is being prepared for the REDLINE Stage 1 production baseline. Source of truth is the modular v78 project, derived from the frozen v77 game. The first release preserves the four aircraft, AI, cockpit overlays, tracks, race logic, and flight feel.

**Release policy:** Do not label a build production-ready unless the full game has completed a real WebGL browser smoke test, not just JavaScript syntax and mocked UI tests.

## Stage 1 acceptance

- Reproducible builds and asset manifest
- Fixed-step simulation and render interpolation
- Diagnostics and test hooks
- Aircraft and source integrity tests
- Real WebGL boot/flight/FPV/third-person/end-of-race checks in CI
- Fixed-camera Raven Slalom visual benchmark
- Incremental Three.js upgrade after recorded visual comparisons

The full source is being added on a dedicated Stage 1 branch. See the accompanying release archive and QA report for local builds.

## Research

- [Three.js migration guidance](https://github.com/mrdoob/three.js/wiki/Migration-Guide)
- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots)
- [WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
