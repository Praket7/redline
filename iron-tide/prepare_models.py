"""Pack selected CC0, authored game-ready PBR meshes at build time.
Never require a third-party network connection at gameplay runtime.
Poly Haven API includes loose glTF buffers and textures; replace those
dependencies with data URIs and preserve source/provenance hashes.
"""
import base64, hashlib, json, mimetypes, pathlib, posixpath, urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
ASSETS={"crane_hoist":"overhead_crane","industrial_pipes":"modular_industrial_pipes_01"}
PACK,PROVENANCE={},{}
def fetch(url,limit=12*1024*1024):
    if not url.startswith(("https://api.polyhaven.com/","https://dl.polyhaven.org/","https://dl.polyhaven.com/")):
        raise ValueError("untrusted asset host")
    req=urllib.request.Request(url,headers={"User-Agent":"REDLINE-Stage3-ModelBuilder/1.0 (CC0 attribution)"})
    with urllib.request.urlopen(req,timeout=28) as response:
        data=response.read(limit+1)
    if len(data)>limit:raise ValueError("source exceeds per-file budget")
    return data
for role,asset in ASSETS.items():
    provenance={"source":"https://polyhaven.com/a/"+asset,"asset":asset,"license":"CC0"}
    try:
        info=json.loads(fetch("https://api.polyhaven.com/files/"+asset,3*1024*1024))
        info=info.get("files",info)
        variants=info.get("gltf",{})
        entry=(variants.get("1k") or variants.get("2k") or {}).get("gltf")
        if not entry:raise ValueError("missing 1k glTF variant")
        source=fetch(entry["url"],7*1024*1024)
        if entry.get("md5") and hashlib.md5(source).hexdigest()!=entry["md5"]:
            raise ValueError("glTF checksum mismatch")
        doc=json.loads(source)
        include=entry.get("include",{})
        total=len(source)
        deps={}
        for name,ref in include.items():
            if not isinstance(ref,dict) or "url" not in ref:continue
            raw=fetch(ref["url"])
            if ref.get("md5") and hashlib.md5(raw).hexdigest()!=ref["md5"]:
                raise ValueError("dependency checksum mismatch: "+name)
            total+=len(raw)
            if total>29*1024*1024:raise ValueError("asset exceeds 29 MB decoded budget")
            key=posixpath.normpath(name).lstrip("./")
            deps[key]=raw
            deps[posixpath.basename(key)]=raw
        def embed(uri):
            if uri.startswith("data:"):return uri
            key=posixpath.normpath(uri).lstrip("./")
            raw=deps.get(key) or deps.get(posixpath.basename(key))
            if raw is None:raise ValueError("glTF missing dependency: "+uri)
            mime=mimetypes.guess_type(key)[0] or "application/octet-stream"
            return "data:"+mime+";base64,"+base64.b64encode(raw).decode()
        for buffer in doc.get("buffers",[]):
            if "uri" in buffer:buffer["uri"]=embed(buffer["uri"])
        for image in doc.get("images",[]):
            if "uri" in image:image["uri"]=embed(image["uri"])
        json_text=json.dumps(doc,separators=(",",":"))
        PACK[role]=json_text
        provenance.update(status="downloaded",sha256=hashlib.sha256(source).hexdigest(),
                          embedded_dependencies=len(include),download_bytes=total)
    except Exception as exc:
        provenance.update(status="procedural fallback",reason=str(exc))
        print("CC0 model fallback:",role,exc)
    PROVENANCE[role]=provenance
(ROOT/"iron-tide/model-pack.js").write_text(
    "window.IRON_TIDE_MODELS="+json.dumps(PACK,separators=(",",":"))+";\n")
out=ROOT/"iron-tide-output"
out.mkdir(exist_ok=True)
(out/"model-provenance.json").write_text(json.dumps(PROVENANCE,indent=2))
print("CC0 3D models packed:",list(PACK))
