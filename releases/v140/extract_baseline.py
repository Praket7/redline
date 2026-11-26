#!/usr/bin/env python3
"""Extract reusable simulation inputs from an original REDLINE deployment ZIP.

Does not modify the source or make a deployable authoritative build.
Usage: python releases/v140/extract_baseline.py /path/to/REDLINE_v139_DEPLOY.zip --out /tmp/redline-baseline
"""
import argparse
import hashlib
import json
import pathlib
import re
import zipfile

def digest(data):
    return hashlib.sha256(data).hexdigest()

def unique(items, label):
    if len(items) != 1:
        raise ValueError(f"Expected one {label}; found {len(items)}")
    return items[0]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=pathlib.Path)
    parser.add_argument("--out", required=True, type=pathlib.Path)
    args = parser.parse_args()
    if args.out.exists() and any(args.out.iterdir()):
        raise SystemExit("Use a new or empty output directory.")
    with zipfile.ZipFile(args.archive) as z:
        bad = z.testzip()
        if bad:
            raise ValueError(f"Corrupt ZIP member: {bad}")
        members = z.namelist()
        html_name = unique([n for n in members if n.endswith("/index.html") or n == "index.html"], "index.html")
        pack_name = unique([n for n in members if n.endswith("/iron-tide.pack") or n == "iron-tide.pack"], "Iron Tide pack")
        html_bytes, pack = z.read(html_name), z.read(pack_name)
    h = html_bytes.decode("utf-8")
    blocks = re.findall(r"<script\b([^>]*)>(.*?)</script>", h, re.S)
    scripts = [body for attrs, body in blocks]
    route_script = unique([s for s in scripts if "window.RL133_ROUTE=" in s], "route registry")
    route = json.JSONDecoder().raw_decode(route_script.split("window.RL133_ROUTE=", 1)[1])[0]
    if route.get("revision") != 136 or len(route.get("gates", [])) != 20 or len(route.get("gateMeta", [])) != 20:
        raise ValueError("Unexpected Iron Tide route revision or gate count")
    flight = unique([s for s in scripts if "function stepFlight(" in s and "function speedEnvelope(" in s], "flight physics")
    engine = unique([s for s in scripts if "const REDLINE_ONLINE=(()=>{" in s and "function createIronCollisions(" in s], "game engine")
    versions = sorted(set(re.findall(r"window\.REDLINE_(?:VERSION|RELEASE)\s*=\s*['\"]([^'\"]+)", h)))
    if not any(v.startswith(("v138", "v139")) for v in versions):
        raise ValueError(f"Unsupported source version: {versions}")
    args.out.mkdir(parents=True, exist_ok=True)
    payloads = {"original-index.html": html_bytes, "iron-tide.pack": pack,
                "flight.js": flight.encode(), "engine.js": engine.encode(),
                "route.json": json.dumps(route, indent=2).encode()}
    for name, data in payloads.items():
        (args.out / name).write_bytes(data)
    report = {"versions": versions, "archive_sha256": digest(args.archive.read_bytes()),
              "route_revision": route["revision"], "iron_gates": len(route["gates"]),
              "files": {n: {"bytes": len(b), "sha256": digest(b)} for n, b in payloads.items()},
              "status": "source extraction only; no network or gameplay verification"}
    (args.out / "manifest.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    main()
