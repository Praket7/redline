# IRON TIDE / camera lab v1

Independent from REDLINE's race runtime; main remains untouched. This branch is based on the repository's v78.1 modular foundation, not the separately described v125 HTML. The 3 km dimensions and ceiling are intentionally taken from the supplied v125 specification.

## Run
From repository root: `npm install --ignore-scripts`, `python -m http.server 8000`, then open http://localhost:8000/iron-tide/. No CDN is required. The standalone viewer requires its sibling layout/world files and local Three.js dependency; it is not yet a one-file offline build.

Drag to look, WASD moves, Q/E descends/ascends, Shift accelerates, wheel changes FOV, H hides UI. Select any sector, orthographic plan, north or overview. Save PNG captures the real canvas. Course tour follows the same 32 gate centers; it is a camera path, not a race physics or clearance guarantee.

## Canonical geography
Coordinates in meters, +x east, -z north, y relative to sea level. South start, southeast container yard, east crane/dock, northeast ship, northern breakwater, western fabrication halls, southwest pipe racks. 115 m buffer; free camera ceiling 310 m. Top and overview cameras share geometry. Main path is not a final validated racing spline. Gates are suspended hoops; no ground legs. The 125 m peak is deliberately distinct from the 310 m ceiling.

## Evidence
The Iron Tide visual evidence workflow captures 11 presets, a clean overview, five route points, a JSON metrics report, and binary glTF assets merged by material. Uploads on failures too, so partial screenshots can be inspected. Run locally with `pip install playwright Pillow`, `python -m playwright install chromium`, `python tests/iron_tide_capture.py`. GLB exports are generated artifacts, not manually authored or committed binaries. Original procedural geometry and textures; no external texture rights claimed.

## Research / implementation decisions
- Hanwha Philly shipyard (https://hanwhaphillyshipyard.com/shipyard-tour/): real graving docks and gantry cranes; model scale loosely inspired by shipbuilding infrastructure, not a site replica.
- Three.js standard metallic/roughness shading (https://threejs.org/docs/pages/MeshStandardMaterial.html): seeded weathered color maps, environment lighting and shared materials. Current renderer is pinned to r128 so current docs are conceptual guidance, not an API compatibility guarantee.
- GLTFExporter (https://threejs.org/docs/pages/GLTFExporter.html): binary asset library; batch merged meshes by material and use GPU instances for repeated scenery in viewer.
- Chromium SwiftShader (https://github.com/chromium/chromium/blob/main/docs/gpu/swiftshader.md): repeatable capture on CI; does not establish player-device frame rates.

## Adversarial review / open release gates
- Initial plane would hide the dry dock: split sea into four pieces around the basin; raise final low checkpoint and narrow interior gates. Need actual swept clearance validation for all four crafts.
- No reference-image visual match claim: inspect captures, improve silhouettes and terrain composition, detailed ship bow/stern curvature, actual textured surfaces (UV tiling/decals), roughness and normal maps, shadows, water wave shader, sky/clouds, corrosion localization, rail/ladder consistency, meaningful variation and industrial clutter.
- Models are procedural modular first-pass assets, not photogrammetry. No AI, player collisions, race progress validation, alternative route logic, moving obstacles, or REDLINE course integration yet. Camera movement intentionally allows inspection through geometry.
- Performance metrics are scene counters, not a hardware benchmark. Real-device review and race playtesting required before merge.
