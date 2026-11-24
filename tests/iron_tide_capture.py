#!/usr/bin/env python3
"""Headless real WebGL capture and export; exits nonzero on missing/invalid evidence."""
import base64, json, math, pathlib, struct, subprocess, sys, time
from playwright.sync_api import sync_playwright
from PIL import Image, ImageStat
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "iron-tide-output"
OUT.mkdir(exist_ok=True)
(OUT / "glb").mkdir(exist_ok=True)
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
    assert len(pts) == 32 and len({tuple(p) for p in pts}) == 32
    assert all(abs(x) <= 1385 and abs(z) <= 1385 and -5 <= y <= 310 for x,y,z in pts)
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
        views = page.evaluate("IRON_TIDE.views")
        assert len(views) == 11
        page.evaluate("IRON_TIDE.clean(true)")
        results = {}
        for view in views:
            page.evaluate("(id) => IRON_TIDE.setView(id)", view)
            # A real rendered canvas screenshot, not an illustration.
            page.wait_for_timeout(250)
            path = OUT / (view + ".png")
            page.locator("canvas").screenshot(path=str(path), timeout=90000)
            with Image.open(path) as im:
                assert im.size == (1440,900)
                assert max(ImageStat.Stat(im.convert("RGB")).stddev) > 8, "blank/flat screenshot: " + view
            stats = page.evaluate("IRON_TIDE.stats()")
            assert stats["gates"] == 32 and stats["revision"] == "128"
            assert 0 < stats["drawCalls"] < 400, stats
            assert 0 < stats["triangles"] < 5000000, stats
            results[view] = stats
        # Same-world camera evidence with no visual route overlay.
        page.evaluate("IRON_TIDE.setView('overview'); IRON_TIDE.route(false)")
        page.locator("canvas").screenshot(path=str(OUT / "overview-clean.png"), timeout=90000)
        page.evaluate("IRON_TIDE.route(true); IRON_TIDE.setView('1-launch')")
        before = page.evaluate("IRON_TIDE.stats().position")
        page.keyboard.down("KeyW"); page.wait_for_timeout(500); page.keyboard.up("KeyW")
        after = page.evaluate("IRON_TIDE.stats().position")
        assert math.dist(before,after) > .1, (before,after)
        for frac in [0,.2,.4,.6,.8]:
            page.evaluate("(f) => IRON_TIDE.course(IRON_TIDE.stats().lapMeters*f)", frac)
            page.locator("canvas").screenshot(path=str(OUT / ("flight-%02d.png" % (frac*100))), timeout=90000)
        assets = page.evaluate("IRON_TIDE.stats().assets")
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
        assert page.evaluate("IRON_TIDE.stats().gates") == 32
        assert not errors, errors
        browser.close()
finally:
    server.terminate()
    server.wait(timeout=10)
