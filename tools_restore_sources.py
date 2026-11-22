#!/usr/bin/env python3
"""Restore large original JS/GLB/cockpit payloads from Git-tracked binary parts.

This protects exact asset bytes while avoiding multi-megabyte Git object uploads
and text diffs for payloads that contain embedded binary or base64 model data.
"""
from pathlib import Path
import hashlib, json
ROOT=Path(__file__).resolve().parent
INDEX=ROOT/'bundles/chunks.json'
if not INDEX.exists():
 print('No chunk index in this source tree; using existing source files.')
 raise SystemExit(0)
entries=json.loads(INDEX.read_text())
for item in entries:
 target=ROOT/item['path']
 if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()==item['sha256']:
  continue
 data=b''.join((ROOT/'bundles/chunks'/name).read_bytes() for name in item['parts'])
 actual=hashlib.sha256(data).hexdigest()
 if len(data)!=item['size'] or actual!=item['sha256']:
  raise SystemExit('Corrupt or missing source payload: '+item['path'])
 target.parent.mkdir(parents=True,exist_ok=True)
 tmp=target.with_suffix(target.suffix+'.tmp');tmp.write_bytes(data);tmp.replace(target)
 print('Restored',item['path'],len(data),'bytes')
print('Restored/verified',len(entries),'oversized source payloads')
