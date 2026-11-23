#!/usr/bin/env python3
"""Restore missing source and binary payloads from Git-tracked verified archives.

A committed editable game source file is authoritative. Archived source from the
initial v77 import is used only when that file is absent; it NEVER overwrites
a newer commit. Binary assets, by contrast, must match the recorded SHA-256.
"""
from pathlib import Path
import hashlib
import json
import tarfile

ROOT = Path(__file__).resolve().parent
# This large engine file was later committed as ordinary source and is edited
# directly; its original SHA belongs only to the frozen v77 restoration.
EDITABLE_SOURCE = frozenset({"src/scripts/035_module.js"})

def sha256(data):
    return hashlib.sha256(data).hexdigest()

def verified_file(item):
    target=ROOT/item["path"]
    if not target.is_file():return False
    if item["path"] in EDITABLE_SOURCE:return True
    return target.stat().st_size==item["bytes"] and sha256(target.read_bytes())==item["sha256"]

def restore_late():
    manifest_path=ROOT/"bundles/late_manifest.json"
    if not manifest_path.exists():return
    manifest=json.loads(manifest_path.read_text())
    if manifest.get("version")!=1:raise RuntimeError("Unsupported restoration manifest")
    entries=manifest["files"]
    if len({e["path"] for e in entries})!=len(entries):
        raise RuntimeError("Duplicate restoration path")
    remaining=[e for e in entries if not verified_file(e)]
    if not remaining:
        print("Verified existing Stage 1 payloads:",len(entries))
        return
    by_archive={}
    for entry in remaining:by_archive.setdefault(entry["archive"],[]).append(entry)
    for archive_name, items in sorted(by_archive.items()):
        archive_path=ROOT/archive_name
        if not archive_path.exists():
            parts=manifest.get("archive_parts",{}).get(archive_path.name,[])
            if not parts:raise RuntimeError("Missing archive parts: "+archive_name)
            chunks=[]
            for item in parts:
                data=(ROOT/item["path"]).read_bytes()
                if len(data)!=item["size"] or sha256(data)!=item["sha256"]:
                    raise RuntimeError("Bad archive part "+item["path"])
                chunks.append(data)
            archive_path.parent.mkdir(parents=True,exist_ok=True)
            archive_path.write_bytes(b"".join(chunks))
        if sha256(archive_path.read_bytes())!=manifest["archives"][archive_path.name]:
            raise RuntimeError("Bad archive digest: "+archive_name)
        with tarfile.open(archive_path,"r:gz") as archive:
            for item in items:
                rel=Path(item["path"])
                if rel.is_absolute() or ".." in rel.parts:
                    raise RuntimeError("Unsafe archive path")
                member=archive.getmember(item["path"])
                if not member.isfile() or member.size!=item["bytes"]:
                    raise RuntimeError("Invalid archive member: "+item["path"])
                data=archive.extractfile(member).read()
                if sha256(data)!=item["sha256"]:raise RuntimeError("Bad asset: "+item["path"])
                target=ROOT/rel
                target.parent.mkdir(parents=True,exist_ok=True)
                target.with_suffix(target.suffix+".restoring").write_bytes(data)
                target.with_suffix(target.suffix+".restoring").replace(target)
    print("Verified/restored Stage 1 payloads:",len(entries),"restored:",len(remaining))

def restore_chunks():
    index=ROOT/"bundles/chunks.json"
    if not index.exists():return
    entries=json.loads(index.read_text())
    for item in entries:
        if verified_file({"path":item["path"],"bytes":item["size"],"sha256":item["sha256"]}):
            continue
        data=b"".join((ROOT/"bundles/chunks"/name).read_bytes() for name in item["parts"])
        if len(data)!=item["size"] or sha256(data)!=item["sha256"]:
            raise RuntimeError("Invalid compressed chunk: "+item["path"])
        target=ROOT/item["path"]
        target.parent.mkdir(parents=True,exist_ok=True)
        target.with_suffix(target.suffix+".restoring").write_bytes(data)
        target.with_suffix(target.suffix+".restoring").replace(target)
    print("Verified/restored chunked payloads:",len(entries))

if __name__=="__main__":
    restore_late()
    restore_chunks()
