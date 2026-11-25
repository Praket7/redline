#!/usr/bin/env python3
"""Rebuild v133 from the exact v132 standalone and original IRON_TIDE_Final(1).html."""
import argparse,base64,gzip,json,re,shutil,subprocess,sys
from pathlib import Path
a=argparse.ArgumentParser();a.add_argument("baseline",type=Path);a.add_argument("map",type=Path);a.add_argument("--out",type=Path,default=Path("v133-build"));o=a.parse_args()
p=o.out.resolve();w=p/"v133_work";w.mkdir(parents=True,exist_ok=True)
shutil.copyfile(o.baseline,p/"REDLINE_v132_AUDITED.html");shutil.copyfile(o.map,p/"IRON_TIDE_Final(1).html")
raw=o.map.read_text();m=re.search(r'alphabet="([^"]+)",text="([^"]+)",length=(\d+)',raw)
if not m:raise ValueError("Unsupported Iron Tide wrapper")
alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~'
decoded=gzip.decompress(base64.b85decode(m[2].translate(str.maketrans(m[1],alphabet)))[:int(m[3])]).decode()
(w/"iron.html").write_text(decoded)
for i,s in enumerate(re.finditer(r'<script\b([^>]*)>(.*?)</script>',decoded,re.S)):
    if len(s[2])<2000000:(w/f"iron{i}.js").write_text(s[2])
for i,s in enumerate(re.finditer(r'<script\b([^>]*)>(.*?)</script>',o.baseline.read_text(),re.S)):
    if i==36:(w/"engine.js").write_text(s[2])
    if i==22:(w/"red22.js").write_text(s[2])
    if i==4:(w/"red4.js").write_text(s[2])
payload=json.loads(gzip.decompress(base64.b64decode((Path(__file__).parent/"v133_iron_tide_source.b64").read_text())))
for name,source in payload.items():
    (w/name).write_text(source.replace("/mnt/data",str(p)))
subprocess.run([sys.executable,str(w/"build.py")],check=True)
print("Build output:",p)
