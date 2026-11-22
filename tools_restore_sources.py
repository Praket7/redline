#!/usr/bin/env python3
"""Restore large original JS/GLB/cockpit payloads from Git-tracked binary parts.

This protects exact asset bytes while avoiding multi-megabyte Git object uploads
and text diffs for payloads that contain embedded binary or base64 model data.
"""
from pathlib import Path
import hashlib, json
ROOT=Path(__file__).resolve().parent

def restore_late_bundles():
 """Restore the missing binary payloads from content-addressed stage-1 archives.

 Avoid unsafe tar.extractall(), validate every restored path against the
 checked-in manifest, and reject missing/mismatched entries.
 """
 import tarfile
 manifest_path=ROOT/'bundles/late_manifest.json'
 if not manifest_path.exists():
  return
 manifest=json.loads(manifest_path.read_text())
 if manifest.get('version')!=1:
  raise SystemExit('Unknown Stage 1 archive format')
 expected={x['path']:x for x in manifest['files']}
 # Directly committed, SHA-256-verified payloads take priority over optional\n # restoration archives; avoid requiring duplicate archives in clean checkouts.\n if all((ROOT/x['path']).is_file() and (ROOT/x['path']).stat().st_size==x['bytes'] and hashlib.sha256((ROOT/x['path']).read_bytes()).hexdigest()==x['sha256'] for x in manifest['files']):\n  print('Stage 1 direct payloads verified:',len(manifest['files']))\n  return\n assert len(expected)==len(manifest['files']), 'duplicate archive path'
 archives={}
 for info in manifest['files']:
  name=info['archive']
  archives.setdefault(name,[]).append(info)
 restored=0
 for archive_name,items in sorted(archives.items()):
  path=ROOT/archive_name
  if not path.exists():
   parts=manifest.get('archive_parts',{}).get(path.name,[])
   if not parts:
    raise SystemExit('Missing Stage 1 binary archive and parts: '+archive_name)
   data=bytearray()
   for part in parts:
    part_path=ROOT/part['path']
    if not part_path.is_file():
     raise SystemExit('Missing Stage 1 archive part: '+part['path'])
    blob=part_path.read_bytes()
    if len(blob)!=part['size'] or hashlib.sha256(blob).hexdigest()!=part['sha256']:
     raise SystemExit('Corrupt Stage 1 archive part: '+part['path'])
    data.extend(blob)
   path.parent.mkdir(parents=True,exist_ok=True)
   path.write_bytes(data)
  expected_hash=manifest['archives'].get(path.name)
  if not expected_hash or hashlib.sha256(path.read_bytes()).hexdigest()!=expected_hash:
   raise SystemExit('Archive hash mismatch: '+archive_name)
  with tarfile.open(path,'r:gz') as archive:
   expected_members={x['path'] for x in items}
   got={m.name for m in archive.getmembers()}
   if got!=expected_members:
    raise SystemExit('Archive contents do not match manifest: '+archive_name)
   for item in items:
    rel=Path(item['path'])
    if rel.is_absolute() or '..' in rel.parts or len(rel.parts)<2:
     raise SystemExit('Invalid archive path: '+item['path'])
    target=ROOT/rel
    if target.is_file() and target.stat().st_size==item['bytes'] and hashlib.sha256(target.read_bytes()).hexdigest()==item['sha256']:
     continue
    member=archive.getmember(item['path'])
    if not member.isfile() or member.size!=item['bytes']:
     raise SystemExit('Invalid archive member: '+item['path'])
    raw=archive.extractfile(member).read()
    if len(raw)!=item['bytes'] or hashlib.sha256(raw).hexdigest()!=item['sha256']:
     raise SystemExit('Content hash mismatch: '+item['path'])
    target.parent.mkdir(parents=True,exist_ok=True)
    tmp=target.with_name(target.name+'.restore-tmp')
    tmp.write_bytes(raw);tmp.replace(target)
    restored+=1
 print('Stage 1 archived payloads verified:',len(expected),'restored:',restored)
restore_late_bundles()
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