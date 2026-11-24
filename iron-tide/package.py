"""Package a fully offline HTML, including Three.js r128 and the canonical layout."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
folder=root/"iron-tide"
html=(folder/"index.html").read_text()
def script(contents):
    return "<script>"+contents.replace("</script","<\\/script")+"</script>"
for path in ("node_modules/three/build/three.min.js","node_modules/three/examples/js/utils/BufferGeometryUtils.js","node_modules/three/examples/js/exporters/GLTFExporter.js","node_modules/three/examples/js/loaders/RGBELoader.js"):
    marker='<script src="../'+path+'"></script>'
    assert marker in html,marker
    html=html.replace(marker,script((root/path).read_text()))
texture_marker='<script src="texture-pack.js"></script>'
assert texture_marker in html
html=html.replace(texture_marker,script((folder/"texture-pack.js").read_text()))
marker='<script src="world.js"></script>'
assert marker in html
html=html.replace(marker,script("window.IRON_TIDE_LAYOUT="+(folder/"layout.json").read_text()+";")+script((folder/"world.js").read_text()))
out=root/"iron-tide-output"
out.mkdir(exist_ok=True)
(out/"IRON_TIDE.html").write_text(html)
