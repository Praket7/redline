"""Retrieve selected CC0 photographic PBR maps once at build time, not in game."""
import base64, hashlib, io, json, pathlib, urllib.request
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parents[1]
ASSETS = {"concrete":"cracked_concrete","asphalt":"aerial_asphalt_01","rust":"rusty_metal_sheet","paint":"rusty_metal_03","steel":"rusty_metal_04"}
PACK = {}
PROVENANCE = {}
def fetch(url):
    req=urllib.request.Request(url,headers={"User-Agent":"REDLINE-IronTide-asset-build/1.0 (CC0 texture retrieval)"})
    with urllib.request.urlopen(req,timeout=15) as resp:
        data=resp.read(12*1024*1024+1)
    if len(data)>12*1024*1024:
        raise ValueError("source image exceeds budget")
    return data
for role, asset in ASSETS.items():
    try:
        try:
            manifest=json.loads(fetch("https://api.polyhaven.com/files/"+asset))
            manifest=manifest.get("files",manifest)
        except Exception as exc:
            print("Asset manifest unavailable:",asset,exc)
            manifest={}
        maps={}
        details={}
        for channel in ("diff","nor_gl","rough"):
            entry=manifest.get(channel,{}).get("1k",{}).get("jpg") or {"url":f"https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/{asset}/{asset}_{channel}_1k.jpg"}
            data=fetch(entry["url"])
            if entry.get("md5") and hashlib.md5(data).hexdigest()!=entry["md5"]:
                raise ValueError("source hash mismatch")
            im=Image.open(io.BytesIO(data)).convert("RGB")
            im.thumbnail((1024,1024),Image.Resampling.LANCZOS)
            buf=io.BytesIO()
            im.save(buf,format="JPEG",quality=91,subsampling=0)
            maps[channel]="data:image/jpeg;base64,"+base64.b64encode(buf.getvalue()).decode()
            details[channel]={"url":entry["url"],"sha256":hashlib.sha256(data).hexdigest(),"size":im.size}
        PACK[role]=maps
        PROVENANCE[role]={"asset":asset,"license":"CC0","source":"https://polyhaven.com/a/"+asset,"maps":details,"status":"downloaded"}
    except Exception as exc:
        PROVENANCE[role]={"asset":asset,"status":"procedural fallback","reason":str(exc)}
        print("Texture fallback:",role,exc)
try:
    asset="industrial_sunset_02_puresky"
    try:
        manifest=json.loads(fetch("https://api.polyhaven.com/files/"+asset))
        manifest=manifest.get("files",manifest)
    except Exception:
        manifest={}
    entry=manifest.get("hdri",{}).get("1k",{}).get("hdr") or {"url":f"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/{asset}_1k.hdr"}
    data=fetch(entry["url"])
    if entry.get("md5") and hashlib.md5(data).hexdigest()!=entry["md5"]:
        raise ValueError("source HDR hash mismatch")
    if not data.startswith((b"#?RADIANCE",b"#?RGBE")):
        raise ValueError("invalid HDR header")
    PACK["sky"]={"hdr":"data:application/octet-stream;base64,"+base64.b64encode(data).decode()}
    PROVENANCE["sky"]={"asset":asset,"status":"downloaded","license":"CC0","source":"https://polyhaven.com/a/"+asset,"url":entry["url"],"sha256":hashlib.sha256(data).hexdigest()}
except Exception as exc:
    PROVENANCE["sky"]={"asset":"industrial_sunset_02_puresky","status":"procedural fallback","reason":str(exc)}
    print("Sky fallback:",exc)
(ROOT/"iron-tide/texture-pack.js").write_text("window.IRON_TIDE_TEXTURES="+json.dumps(PACK,separators=(",",":"))+";\n")
out=ROOT/"iron-tide-output"
out.mkdir(exist_ok=True)
(out/"texture-provenance.json").write_text(json.dumps(PROVENANCE,indent=2))
print("Photographic materials prepared:",list(PACK))
