For offline standalone and site builds, install the pinned three@0.128.0 from package.json.
`build.py` embeds the local npm distribution when present, and fails in strict CI if missing.
Preserving r128 is deliberate while testing the incremental renderer-upgrade canaries.
