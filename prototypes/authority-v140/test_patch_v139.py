from pathlib import Path
import patch_v139 as patch
assert patch.replace_once("HEAD body TAIL","body","injected")=="HEAD injected TAIL"
try:
    patch.replace_once("missing","body","x")
except ValueError:
    pass
else:
    raise AssertionError("missing anchor not rejected")
assert "exportTriangles" in patch.CLIFF_NEW
assert "exportTriangles" in patch.IRON_NEW
assert "window.REDLINE_V144_ATTACH" in patch.HOOK
print("v139 patcher structural assertions: 5")
