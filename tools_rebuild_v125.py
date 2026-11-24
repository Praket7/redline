from pathlib import Path
import sys, hashlib, json, gzip, base64
if len(sys.argv)!=3:
    raise SystemExit("Usage: python tools_rebuild_v125.py REDLINE_v124_OPTIMIZED.html index.html")
p=Path(sys.argv[1]); raw=p.read_bytes()
for name in ["v125_from_v124_delta.b64","v125_final_delta.b64"]:
    d=json.loads(gzip.decompress(base64.b64decode((Path(__file__).parent/"qa"/name).read_text())))
    assert hashlib.sha256(raw).hexdigest()==d["base"],"Wrong base HTML"
    lines=raw.decode("utf-8").splitlines(keepends=True)
    for i,j,v in reversed(d["ops"]):
        lines[i:j]=v.splitlines(keepends=True)
    raw="".join(lines).encode("utf-8")
    assert hashlib.sha256(raw).hexdigest()==d["target"],"Hash mismatch"
Path(sys.argv[2]).write_bytes(raw)
print("Exact v125 reproduced:",hashlib.sha256(raw).hexdigest())
