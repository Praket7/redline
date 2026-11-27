#!/usr/bin/env python3
"""Recover the exact v139 standalone source and embedded Iron Tide pack."""
import argparse, base64, gzip, hashlib, json, pathlib, re

def sha(data):
    return hashlib.sha256(data).hexdigest()

def one(values, label):
    if len(values) != 1:
        raise ValueError(f'Expected one {label}, got {len(values)}')
    return values[0]

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('html', type=pathlib.Path)
    ap.add_argument('--out', required=True, type=pathlib.Path)
    args = ap.parse_args()
    if args.out.exists() and any(args.out.iterdir()):
        raise SystemExit('Use a new or empty output directory.')
    raw = args.html.read_bytes()
    h = raw.decode('utf-8')
    if sha(raw) != '4085caaa0690f91a5492561c232d663f95c66d79aacc6a514ee86c189b9f7781':
        raise ValueError('Input does not match the recovered v139 baseline SHA-256')
    blocks = re.findall(r'<script\b([^>]*)>(.*?)</script>', h, re.S)
    bodies = [b for _, b in blocks]
    route_body = one([b for b in bodies if 'window.RL133_ROUTE=' in b], 'route registry')
    route = json.JSONDecoder().raw_decode(route_body.split('window.RL133_ROUTE=', 1)[1])[0]
    if route.get('revision') != 136 or len(route.get('gates', [])) != 20 or len(route.get('gateMeta', [])) != 20:
        raise ValueError('Unexpected route')
    flight = one([b for b in bodies if 'function stepFlight(' in b and 'function speedEnvelope(' in b], 'flight module')
    engine = one([b for b in bodies if 'const REDLINE_ONLINE=(()=>{' in b and 'function createIronCollisions(' in b], 'engine')
    m = one(list(re.finditer(r'<script id="rl133IronPack"[^>]*data-length="(\d+)"[^>]*>(.*?)</script>', h, re.S)), 'embedded pack')
    a = one(re.findall(r'const text=embedded.textContent.trim\(\),alphabet="([^"]+)"', h), 'base85 alphabet')
    std = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_' + chr(96) + '{|}~'
    if len(a) != 85 or len(set(a)) != 85:
        raise ValueError('Invalid alphabet')
    pack = base64.b85decode(m[2].translate(str.maketrans(a, std)))[:int(m[1])]
    if sha(pack) != '4d8115faea7575e2cef2a27a3fa76d0d8d66d44e65ba67c6acd24d1ec2f4022a':
        raise ValueError('Embedded pack hash mismatch')
    gzip.decompress(pack)
    payloads = {'original-index.html': raw, 'iron-tide.pack': pack, 'flight.cjs': flight.encode(), 'engine.js': engine.encode(), 'route.json': json.dumps(route, indent=2).encode()}
    args.out.mkdir(parents=True, exist_ok=True)
    for name, data in payloads.items():
        (args.out / name).write_bytes(data)
    report = {'version': 'v139-shared-world', 'route_revision': 136, 'files': {n: {'bytes': len(b), 'sha256': sha(b)} for n, b in payloads.items()}, 'status': 'source recovery only; not a deployable v140 build'}
    (args.out / 'manifest.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    main()
