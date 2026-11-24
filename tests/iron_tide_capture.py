#!/usr/bin/env python3
"""Headless real WebGL capture and export; exits nonzero on missing/invalid evidence."""
import base64, json, math, pathlib, struct, subprocess, sys, time
from playwright.sync_api import sync_playwright
from PIL import Image, ImageStat, ImageDraw, ImageFont, ImageChops
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "iron-tide-output"
OUT.mkdir(exist_ok=True)
(OUT / "glb").mkdir(exist_ok=True)
def capture(page, path):
    # Canvas is rendered synchronously by the camera API; read its actual framebuffer
    # rather than waiting for Playwright compositor stability on software WebGL.
    encoded = page.evaluate("document.querySelector('canvas').toDataURL('image/png').split(',')[1]")
    path.write_bytes(base64.b64decode(encoded))

server = subprocess.Popen([sys.executable, "-m", "http.server", "8765", "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    import urllib.request
    for _ in range(50):
        try:
            urllib.request.urlopen("http://127.0.0.1:8765/iron-tide/", timeout=1).close()
            break
        except OSError:
            time.sleep(.2)
    else:
        raise RuntimeError("local server did not start")
    layout = json.loads((ROOT / "iron-tide/layout.json").read_text())
    pts = [p for s in layout["sectors"] for p in s["gates"]]
    assert len(layout['sectors']) == 10 and len(pts) == 38 and len({tuple(p) for p in pts}) == 38
    assert layout['dryDock']['floor'] == -20 and len(layout['alternates']) == 4
    assert all(abs(x) <= 1385 and abs(z) <= 1385 and -20 <= y <= 310 for x,y,z in pts)
    assert max(p[1] for p in pts) - min(p[1] for p in pts) >= 100
    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
        page = browser.new_page(viewport={"width":1440,"height":900}, device_scale_factor=1, accept_downloads=True)
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.goto("http://127.0.0.1:8765/iron-tide/", wait_until="load", timeout=90000)
        page.wait_for_function("window.IRON_TIDE || document.getElementById('error').style.display === 'block'", timeout=90000)
        assert page.evaluate("Boolean(window.IRON_TIDE)"), page.locator("#error").inner_text()
        audit = page.evaluate("IRON_TIDE.assetAudit()")
        required = {"ship-hull", "heavy-gantry-detail", "rtg-crane", "quay-container-crane", "propeller", "container-rust", "terminal-tractor", "cargo-trailer"}
        required.update({"reference-sky-bridge","reference-offshore-platform","plate-processing-hall","coating-shop","outfit-workshop","process-manifold","hydraulic-power-unit","tank","steel-transfer-station","curved-panel-jig","block-transport-cradle","gantry-service-hall","winch-service-skid"})
        required.update({"stage3-boiler-house","stage3-outfitting-annex","stage3-electrical-substation","pipe-rack","stage3-quay-workbay","stage3-forklift","stage3-hose-skid","stage3-outfitting-vessel","stage3-dock-jib"})
        assert required.issubset(audit), required-set(audit)
        for name, info in audit.items():
            assert info["nonfinite"] == 0 and info["triangles"] > 0 and all(math.isfinite(v) and v > 0 for v in info["meters"]), (name,info)
        (OUT / "mesh-audit.json").write_text(json.dumps(audit,indent=2))
        views = page.evaluate("IRON_TIDE.views")
        assert len(views) == 13
        page.evaluate("IRON_TIDE.clean(true)")
        results = {}
        provenance = json.loads((OUT / "texture-provenance.json").read_text()) if (OUT / "texture-provenance.json").exists() else {}
        expected_photos = [k for k in ["concrete","asphalt","rust","paint","steel","door","roof"] if provenance.get(k,{}).get("status") == "downloaded"]
        expected_sky = "industrial_sunset_02_puresky" if provenance.get("sky",{}).get("status") == "downloaded" else "procedural"
        for view in views:
            page.evaluate("(id) => IRON_TIDE.setView(id)", view)
            # A real rendered canvas screenshot, not an illustration.
            page.wait_for_timeout(250)
            path = OUT / (view + ".png")
            capture(page, path)
            with Image.open(path) as im:
                assert im.size == (1440,900)
                assert max(ImageStat.Stat(im.convert("RGB")).stddev) > 8, "blank/flat screenshot: " + view
            stats = page.evaluate("IRON_TIDE.stats()")
            assert stats["gates"] == 38 and stats["revision"] == "128"
            ref = stats["referenceAudit"]
            assert ref["centralBasins"] and ref["landPieces"] >= 18 and ref["dryDockFloor"] == -20, ref
            assert ref["sectors"] == 10 and ref["gates"] == 38 and ref["alternateCorridors"] == 4, ref
            assert ref["offshorePlatforms"] == 2 and ref["skyBridges"] == 1 and ref["ships"] >= 8, ref
            assert ref["solidRouteConflicts"] == 0 and ref["solidPlacements"] > 100 and ref["containerStacks"] > 100, ref
            assert ref["additionalHalls"] > 25 and ref["additionalTanks"] > 0 and ref["additionalRacks"] > 0, ref
            assert sum(ref["stage3Sites"].values()) >= 3, ref
            assert ref["lookdevSites"]["workbays"] > 0 and ref["lookdevSites"]["forklifts"] > 0 and ref["lookdevSites"]["hoseSkids"] > 0, ref
            assert ref["quayDetails"] > 20 and ref["lookdevSites"]["dockJibs"] > 0, ref
            assert stats["bakedLightPools"] > 20 and stats["contactFootprints"] > 100, stats
            assert stats["sharedRailBatches"] > 0, stats
            assert stats["photoMaterials"] == expected_photos, stats
            assert stats["skySource"] == expected_sky, stats
            assert 0 < stats["drawCalls"] < 400, stats
            assert 0 < stats["triangles"] < 5000000, stats
            with Image.open(path) as im:
                lum=ImageStat.Stat(im.convert("L"))
                stats["imageLuminanceMean"]=round(lum.mean[0],3)
                stats["imageLuminanceStddev"]=round(lum.stddev[0],3)
            results[view] = stats
        (OUT / "reference-audit.json").write_text(json.dumps(page.evaluate("IRON_TIDE.referenceAudit()"),indent=2))
        hero_clearance = page.evaluate("IRON_TIDE.heroClearance()")
        (OUT / "hero-clearance.json").write_text(json.dumps(hero_clearance,indent=2))
        assert hero_clearance["tested"] > 0 and not hero_clearance["hits"] and not hero_clearance["civilHits"], hero_clearance
        # Verify true reflected-scene contribution, not merely a flag or a glossy material.
        reflection_report = {}
        for view, expected in [("1-launch","pavement"),("9-offshore","water")]:
            page.evaluate("(id) => IRON_TIDE.setView(id)",view)
            page.evaluate("IRON_TIDE.reflections(true)")
            capture(page,OUT / (view+"-reflection-on.png"))
            st=page.evaluate("IRON_TIDE.stats()")
            assert st["reflectionActive"] == expected and st["reflectionPasses"] > 0 and st["dualReflection"], st
            page.evaluate("IRON_TIDE.reflections(false)")
            capture(page,OUT / (view+"-reflection-off.png"))
            with Image.open(OUT / (view+"-reflection-on.png")) as a, Image.open(OUT / (view+"-reflection-off.png")) as b:
                diff=ImageChops.difference(a.convert("RGB"),b.convert("RGB"))
                mean=sum(ImageStat.Stat(diff).mean)/3
                assert mean > .02, ("reflection produced no meaningful framebuffer change",view,mean)
            reflection_report[view]={"plane":expected,"mean_rgb_difference":mean,"passes":st["reflectionPasses"]}
        page.evaluate("IRON_TIDE.reflections(true)")
        (OUT / "reflection-audit.json").write_text(json.dumps(reflection_report,indent=2))
        # Verify actual framebuffer contribution of the new baked yard lighting.
        page.evaluate("IRON_TIDE.detailView('yardLight'); IRON_TIDE.bakedLights(true)")
        capture(page,OUT/"yard-light-on.png")
        page.evaluate("IRON_TIDE.bakedLights(false)")
        capture(page,OUT/"yard-light-off.png")
        with Image.open(OUT/"yard-light-on.png") as a, Image.open(OUT/"yard-light-off.png") as b:
            delta=sum(ImageStat.Stat(ImageChops.difference(a.convert("RGB"),b.convert("RGB"))).mean)/3
            assert delta>.02, ("baked yard lights did not change framebuffer",delta)
        (OUT/"yard-light-audit.json").write_text(json.dumps({"mean_rgb_difference":delta}))
        page.evaluate("IRON_TIDE.bakedLights(true)")
        for detail in ["gantryBase","hullServices","craneWorkshops","quaySurface","offshoreDetail"]:
            page.evaluate("(id) => IRON_TIDE.detailView(id)",detail)
            capture(page,OUT/("detail-"+detail+".png"))
        page.evaluate("IRON_TIDE.setView('top')")
        projected = page.evaluate("IRON_TIDE.projectGates()")
        # Overlay exact projected points on the rendered orthographic view.
        with Image.open(OUT / "top.png").convert("RGB") as im:
            board = Image.new("RGB", (1800, 900), "#13191d")
            board.paste(im,(0,0))
            draw = ImageDraw.Draw(board)
            font = ImageFont.load_default(size=16)
            tiny = ImageFont.load_default(size=12)
            draw.line([(round(p["x"]),round(p["y"])) for p in projected+[projected[0]]], fill="#ff563f", width=3, joint="curve")
            for p in projected:
                x,y = round(p["x"]), round(p["y"])
                draw.ellipse((x-9,y-9,x+9,y+9), fill="#a72e2e", outline="white",width=1)
                draw.text((x,y),str(p["index"]),font=tiny,anchor="mm",fill="white")
            draw.text((1460,25),"REDLINE / IRON TIDE",font=ImageFont.load_default(size=24),fill="white")
            draw.text((1460,62),"3,000 m x 3,000 m | 38 airborne gates",font=tiny,fill="#d1d9df")
            for i,sector in enumerate(layout["sectors"]):
                y = 100+i*73
                draw.text((1460,y),f'{i+1:02d}  {sector["name"]}',font=font,fill="#ff7468")
                draw.text((1460,y+25),f'CP {1+sum(len(s["gates"]) for s in layout["sectors"][:i]):02d}-{sum(len(s["gates"]) for s in layout["sectors"][:i+1]):02d}  |  Altitude: '+ " / ".join(str(p[1]) for p in sector["gates"])+" m",font=tiny,fill="#e1e7ec")
            draw.text((1460,853),"North is up. Render + actual gate projection.",font=tiny,fill="#a5b0b9")
            board.save(OUT / "top-annotated.png")
        # Same-world camera evidence with no visual route overlay.
        page.evaluate("IRON_TIDE.setView('overview'); IRON_TIDE.route(false)")
        capture(page, OUT / "overview-clean.png")
        # Capture both ends of the same real model at fixed angles; no generated artwork.
        (OUT / "hero-models").mkdir(exist_ok=True)
        for name in sorted(required):
            for angle, suffix in [(0,"front"),(math.pi,"rear")]:
                page.evaluate("([n,a]) => IRON_TIDE.assetView(n,a)",[name,angle])
                capture(page,OUT / "hero-models" / (name+"-"+suffix+".png"))
        if "--preview" in sys.argv:
            assert not errors, errors
            (OUT / "preview-report.json").write_text(json.dumps({"views":results,"layout":layout},indent=2))
            browser.close()
            raise SystemExit(0)
        page.evaluate("IRON_TIDE.route(true); IRON_TIDE.setView('1-launch')")
        before = page.evaluate("IRON_TIDE.stats().position")
        page.keyboard.down("KeyW"); page.wait_for_timeout(500); page.keyboard.up("KeyW")
        after = page.evaluate("IRON_TIDE.stats().position")
        assert math.dist(before,after) > .1, (before,after)
        for frac in [0,.2,.4,.6,.8]:
            page.evaluate("(f) => IRON_TIDE.course(IRON_TIDE.stats().lapMeters*f)", frac)
            capture(page, OUT / ("flight-%02d.png" % (frac*100)))
        assets = page.evaluate("IRON_TIDE.stats().assets")
        (OUT / "assets").mkdir(exist_ok=True)
        for name in assets:
            page.evaluate("(n) => IRON_TIDE.assetView(n)", name)
            path = OUT / "assets" / (name + ".png")
            capture(page, path)
            with Image.open(path) as im:
                assert max(ImageStat.Stat(im.convert("RGB")).stddev) > 4, "flat asset: " + name
        exported = {}
        for name in assets:
            data = base64.b64decode(page.evaluate("(n) => IRON_TIDE.exportAsset(n)",name))
            magic, version, size = struct.unpack_from("<4sII",data)
            assert magic == b"glTF" and version == 2 and size == len(data)
            n, kind = struct.unpack_from("<II",data,12)
            assert kind == 0x4e4f534a
            doc = json.loads(data[20:20+n])
            assert doc["meshes"] and doc["materials"]
            (OUT / "glb" / (name+".glb")).write_bytes(data)
            exported[name] = {"bytes":len(data),"meshes":len(doc["meshes"]),"materials":len(doc["materials"])}
        assert not errors, errors
        (OUT / "report.json").write_text(json.dumps({"views":results,"assets":exported,"renderer":"Chromium SwiftShader (software; not real-device performance)","layout":layout},indent=2))
        page.goto("http://127.0.0.1:8765/iron-tide-output/IRON_TIDE.html", wait_until="load", timeout=90000)
        page.wait_for_function("Boolean(window.IRON_TIDE)", timeout=90000)
        assert page.evaluate("IRON_TIDE.stats().gates") == 38
        assert not errors, errors
        browser.close()
finally:
    server.terminate()
    server.wait(timeout=10)
