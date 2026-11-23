#!/usr/bin/env python3
"""Generates first ten-version upgrade candidate (r128 -> r138) without modifying release."""
from pathlib import Path
import re
r=Path(__file__).resolve().parent
source=(r/'dist/REDLINE_v78_STAGE1_STANDALONE.html').read_text()
new=source.replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','https://cdnjs.cloudflare.com/ajax/libs/three.js/r138/three.min.js').replace('three@0.128.0','three@0.138.0')
assert new!=source
name=r/'dist/experimental_renderer_r138_UNVERIFIED.html';name.write_text(new)
print('wrote',name.name,'no render verification')
