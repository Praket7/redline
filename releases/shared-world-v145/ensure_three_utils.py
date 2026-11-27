"""Restore geometry utility methods required by Iron Tide when using embedded r187 THREE.
The already-shipped v139 bundle contains the BufferGeometryUtils implementation,
but exposes it only along a skipped legacy-loader path. Reuse its original source.
"""
from pathlib import Path

def patch(text):
    if 'id="redline-r187-buffer-utils"' in text:return text
    start=text.index('( function () {\n\n\tclass BufferGeometryUtils')
    end=text.index('} )();',text.index('THREE.BufferGeometryUtils = BufferGeometryUtils;',start))+len('} )();')
    original=text[start:end]
    marker='</script>\n<script>if(!window.THREE)'
    if text.count(marker)!=2:raise RuntimeError('expected r187 → legacy fallback boundary once')
    addition='<script id="redline-r187-buffer-utils">if(window.THREE&&!window.THREE.BufferGeometryUtils){'+original+'}</script>\n'
    return text.replace(marker,'</script>\n'+addition+'<script>if(!window.THREE)',1)
if __name__=='__main__':
    import sys
    p=Path(sys.argv[1]);text=p.read_text();out=patch(text);p.write_text(out);print('Geometry utils added',len(out)-len(text))
