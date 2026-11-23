#!/usr/bin/env python3
"""Reconstruct byte-identical frozen v77 from compressed, tracked chunks.

Keeping a 22 MB HTML blob out of Git's text-diff history reduces noisy diffs,
while SHA-256 validation preserves the exact comparison/recovery baseline.
"""
from pathlib import Path
import gzip, hashlib, json
ROOT=Path(__file__).resolve().parent
manifest=json.loads((ROOT/'manifest.json').read_text())
expected=manifest['baseline_sha256']
dest=ROOT/'originals/REDLINE_v77_FROZEN.html'
if dest.exists() and hashlib.sha256(dest.read_bytes()).hexdigest()==expected:
 print('Frozen v77 baseline verified:',expected)
 raise SystemExit(0)
parts=sorted((ROOT/'originals/v77_archive').glob('part-*.bin'))
if not parts:
 raise SystemExit('No archived v77 baseline found; cannot pass baseline integrity gate')
compressed=b''.join(p.read_bytes() for p in parts)
raw=gzip.decompress(compressed)
actual=hashlib.sha256(raw).hexdigest()
if actual!=expected:
 raise SystemExit(f'Frozen v77 digest mismatch: expected {expected}, found {actual}')
dest.parent.mkdir(parents=True,exist_ok=True)
temp=dest.with_suffix('.tmp');temp.write_bytes(raw);temp.replace(dest)
print(f'Restored frozen v77 ({len(raw)} bytes); SHA-256 {actual}')
