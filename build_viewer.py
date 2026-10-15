import json, sys
import os; os.makedirs('dist', exist_ok=True)
scene = json.load(open('scene.json'))
ctx = {'context': scene['context'], 'parks': scene['parks']}
layout = open('layout.json').read()
three = open('three.min.js').read()
orbit = open('OrbitControls.js').read()
commons = open('commons.js').read()
app = open('app.js').read()
css = open('style.css').read()
body = open('body.html').read()
html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lloyd Commons — Superblock Concept</title><style>{css}</style></head><body>{body}
<script>{three}</script><script>{orbit}</script>
<script>window.SCENE={json.dumps(ctx, separators=(',', ':'))};window.LAYOUT={layout};</script>
<script>{commons}</script><script>{app}</script></body></html>"""
out = sys.argv[1] if len(sys.argv) > 1 else 'dist/viewer.html'
view = sys.argv[2] if len(sys.argv) > 2 else ''
if view: html = html.replace('<script>window.SCENE', '<script>window.VIEW=%r;window.CLEAN=1;</script><script>window.SCENE' % view)
open(out, 'w').write(html)
print(out, "bytes:", len(html))
