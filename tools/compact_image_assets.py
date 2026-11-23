"""Repeatable cockpit image compression without changing aircraft mesh payloads.

Use high-quality alpha-aware WebP on seven very large transparent cockpit
textures. World albedo/normal/roughness atlases and four GLB model blobs remain
bit-exact, avoiding material and geometry regressions.
"""
from io import BytesIO
from PIL import Image

SELECTED = frozenset({1,4,5,6,16,17,18})

def optimize_image(index:int, source:bytes, mime:str):
    if index not in SELECTED:
        return source, mime, False
    image=Image.open(BytesIO(source))
    if max(image.size)>1600:
        image.thumbnail((1600,1600),Image.Resampling.LANCZOS)
    out=BytesIO()
    image.save(out,format='WEBP',quality=90,method=3,exact=True)
    converted=out.getvalue()
    if len(converted)>len(source)*.88:
        return source,mime,False
    return converted,'webp',True
