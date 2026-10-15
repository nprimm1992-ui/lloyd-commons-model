import sys
from PIL import Image

# usage: python3 tools/sbs.py reference.jpg shot.png out.jpg  -> side-by-side (reference left, model right)
r, s, o = sys.argv[1:4]
a = Image.open(s).convert('RGB'); b = Image.open(r).convert('RGB').resize(a.size)
c = Image.new('RGB', (a.width * 2, a.height)); c.paste(b, (0, 0)); c.paste(a, (a.width, 0))
c.thumbnail((1800, 1000)); c.save(o, quality=85)
