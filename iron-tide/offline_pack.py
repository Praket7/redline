"""Lossless JPEG coefficient repacking and single-file offline compression."""
import base64, gzip, hashlib, io, json, re, subprocess, tempfile
from pathlib import Path
from PIL import Image

# Python's RFC1924 base85 alphabet with HTML-significant angle brackets replaced.
ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;[=]?@^_`{|}~'
assert len(ALPHABET) == 85 and len(set(ALPHABET)) == 85

def pack_html(html, c_source):
    raw = html.encode('utf-8')
    audit = {'input_bytes': len(raw), 'jpeg_images': 0, 'jpeg_input_bytes': 0, 'jpeg_output_bytes': 0}
    with tempfile.TemporaryDirectory() as tmp:
        exe = Path(tmp) / 'jpeg-repack'
        subprocess.run(['cc', '-O2', str(c_source), '-ljpeg', '-o', str(exe)], check=True)
        cache = {}
        def repack(match):
            uri = match.group(0)
            if uri in cache:
                return cache[uri]
            source = base64.b64decode(uri.split(',', 1)[1])
            encoded = subprocess.run([str(exe)], input=source, capture_output=True, check=True).stdout
            with Image.open(io.BytesIO(source)) as a, Image.open(io.BytesIO(encoded)) as b:
                assert a.size == b.size and a.mode == b.mode and a.tobytes() == b.tobytes(), 'JPEG decoded pixel mismatch'
                # ICC profiles and EXIF metadata affect display orientation/colors.
                for marker in ('icc_profile', 'exif'):
                    assert a.info.get(marker) == b.info.get(marker), f'JPEG {marker} mismatch'
            encoded = min((source, encoded), key=len)
            audit['jpeg_images'] += 1
            audit['jpeg_input_bytes'] += len(source)
            audit['jpeg_output_bytes'] += len(encoded)
            cache[uri] = 'data:image/jpeg;base64,' + base64.b64encode(encoded).decode('ascii')
            return cache[uri]
        html = re.sub(r'data:image/jpeg;base64,[A-Za-z0-9+/=]+', repack, html)
    data = html.encode('utf-8')
    payload = gzip.compress(data, compresslevel=9, mtime=0)
    assert gzip.decompress(payload) == data
    encoded = base64.b85encode(payload, pad=True).decode('ascii').translate(str.maketrans('<>', '[]'))
    # The wrapper uses native streaming gzip decoding, no network or external libraries.
    wrapper = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>IRON TIDE — REDLINE</title><style>body{margin:0;display:grid;place-items:center;min-height:100vh;background:#10171e;color:#dae0e5;font:15px system-ui}#error{color:#fca5a5}</style></head><body><div id="loading">Loading IRON TIDE…</div><pre id="error" style="display:none"></pre><script>
(async()=>{try{
const alphabet=__ALPHABET__,text=__PAYLOAD__,length=__LENGTH__;
const lut=new Uint8Array(128);for(let i=0;i<85;i++)lut[alphabet.charCodeAt(i)]=i;
const bytes=new Uint8Array(text.length/5*4);let o=0;
for(let i=0;i<text.length;i+=5){let n=0;for(let j=0;j<5;j++)n=n*85+lut[text.charCodeAt(i+j)];bytes[o++]=n>>>24;bytes[o++]=n>>>16;bytes[o++]=n>>>8;bytes[o++]=n;}
if(typeof DecompressionStream!=='function')throw Error('Open this offline scene in a current Chrome, Edge, Firefox or Safari browser.');
const stream=new Blob([bytes.subarray(0,length)]).stream().pipeThrough(new DecompressionStream('gzip'));
const html=await new Response(stream).text();document.open();document.write(html);document.close();
}catch(e){document.getElementById('error').style.display='block';document.getElementById('error').textContent=String(e);}})();
</script></body></html>'''
    result = wrapper.replace('__ALPHABET__', json.dumps(ALPHABET)).replace('__PAYLOAD__', json.dumps(encoded)).replace('__LENGTH__', str(len(payload)))
    audit.update({'repacked_bytes': len(data), 'gzip_bytes': len(payload), 'offline_bytes': len(result.encode('utf-8')), 'expanded_sha256': hashlib.sha256(data).hexdigest(), 'pixel_exact': True})
    return result, audit

if __name__ == '__main__':
    import sys
    html, audit = pack_html(Path(sys.argv[1]).read_text(), Path(__file__).with_name('jpeg_repack.c'))
    Path(sys.argv[2]).write_text(html)
    print(json.dumps(audit, indent=2))
