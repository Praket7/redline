# IRON TIDE / camera lab v1

Independent from REDLINE's race runtime; main remains untouched. This branch is based on the repository's v78.1 modular foundation, not the separately described v125 HTML. The 3 km dimensions and ceiling are intentionally taken from the supplied v125 specification.

## Run
From repository root: `npm install --ignore-scripts`, `python -m http.server 8000`, then open http://localhost:8000/iron-tide/. No CDN is required. The source viewer uses sibling files; `python iron-tide/package.py` builds an offline single HTML with engine, layout and geometry inlined. CI uploads it.

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

## Iterative visual findings
The first real CI capture was reviewed: excessive fog flattened the aerial image and caused the top-down contrast check to fail; the port read as sparse slabs rather than a working shipyard. The next revisions reduced fog, removed fog from the top view, tiled pavement, added industrial districts and a connected breakwater, and introduced lower-detail container meshes for remote scenery. Indexed merged geometry, generated normal maps and roughness maps are intended to make the GLB library more useful; the capture pipeline must verify it. The current 32-gate linear route is approximately 8.43 km because it traverses the 3 km footprint; earlier concept-art lap distances were not geometrically measured. Main racing line runs from 5 to 125 m relative to sea level, not 310 m. 

Reference art is a quality target, not evidence: check whole-map composition, crane/ship silhouettes, building placement, texture repetition, interior clearances, gate readability and meaningful scale in real captures. The first render did not pass that bar. No merge until approved visual review and gameplay integration.

## Architectural remaster / photographic texture pack
New native mesh kits: heavy Goliath portal with trolley, access ladders and bogies; lattice jib cranes; pipe bundles, utility carts, pallet loads, maintenance bays, armour rocks and safety barriers. Clustered work zones use a sampled footprint check against the original 32-gate route. This is a visual exclusion check, not proof of craft clearance. Sea ripples are attenuated using fragment derivatives to reduce high-frequency aliasing in aerial views. The capture report lists photographic materials actually decoded. 

Optional build-time CC0 source maps: Poly Haven aerial_asphalt_01, cracked_concrete, rusty_metal_sheet, rusty_metal_03, rusty_metal_04. Source IDs and actual download results are written in texture-provenance.json. Run python iron-tide/prepare_textures.py before packaging to fetch them; without network the committed procedural fallback still works. CC0 license: https://polyhaven.com/license. Do not infer downloaded textures from the presence of the script; inspect the report. 
