import json, os, sys
from PIL import Image

# Usage: python build_viewer.py [out.html] [preset]
#   default: dist/viewer.html (single file) + dist/model/ (drop-in /model page with compare renderings)
scene = json.load(open('scene.json'))
ctx = {'context': scene['context'], 'parks': scene['parks']}
layout = open('layout.json').read()
read = lambda p: open(p).read()
VENDOR = ['EffectComposer.js', 'RenderPass.js', 'ShaderPass.js', 'CopyShader.js', 'SAOShader.js', 'DepthLimitedBlurShader.js', 'UnpackDepthRGBAShader.js', 'SAOPass.js',
          'LuminosityHighPassShader.js', 'UnrealBloomPass.js', 'HorizontalTiltShiftShader.js', 'VerticalTiltShiftShader.js', 'RGBELoader.js']
libs = ''.join('<script>%s</script>' % read(p) for p in ['three.min.js', 'OrbitControls.js'] + ['vendor/' + v for v in VENDOR])
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">')

# Reference renderings for Compare: camera preset solved/fitted per rendering (see commons.js / app.js presets).
REFS = [
    {'id': 'aerial', 'title': 'Aerial overview', 'file': 'references/renders/aerial.webp', 'view': 'refaerial',
     'note': 'Master rendering (site_ref/ref_04). The camera is solved from it by tools/solve_cam.py.'},
    {'id': 'plaza', 'title': 'Fountain plaza', 'file': 'references/renders/plaza.webp', 'view': 'plazaref',
     'note': 'Plaza close-up rendering. Camera fitted to the fountain, the venue corner and the precast farm block.'},
    {'id': 'plan', 'title': 'Site plan', 'file': 'references/renders/siteplan.png', 'view': 'siteplan',
     'note': 'Development map. A top-down orthographic-style view at the same extent.'},
]


def page(refs_js='', view='', tex=False):
    pre = '<script>window.REFS=%s;</script>' % refs_js if refs_js else ''
    if tex:
        pre += '<script>window.TEX_BASE="tex/";window.TEXMAN=%s;</script>' % open('assets/tex_manifest.json').read()
    if view:
        pre += '<script>window.VIEW=%r;window.CLEAN=1;</script>' % view
    return f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Lloyd Commons — Interactive 3D Model</title><meta name="description" content="Explore the Lloyd Commons proposal for the Lloyd Center site in NE Portland: an interactive, rendering-faithful 3D model.">
<meta name="theme-color" content="#17181a">{FONTS}<style>{read('style.css')}</style></head><body>{read('body.html')}
{libs}{pre}<script>window.SCENE={json.dumps(ctx, separators=(',', ':'))};window.LAYOUT={layout};</script>
<script>{read('commons.js')}</script><script>{read('photo.js')}</script><script>{read('ui.js')}</script><script>{read('app.js')}</script></body></html>"""


os.makedirs('dist', exist_ok=True)
out = sys.argv[1] if len(sys.argv) > 1 else 'dist/viewer.html'
view = sys.argv[2] if len(sys.argv) > 2 else ''
html = page(view=view)
open(out, 'w').write(html)
print(out, 'bytes:', len(html))

if len(sys.argv) == 1:
    os.makedirs('dist/model/refs', exist_ok=True)
    refs = []
    for r in REFS:
        im = Image.open(r['file']).convert('RGB')
        w, h = im.size
        im.thumbnail((1800, 1800), Image.LANCZOS)
        im.save('dist/model/refs/%s.jpg' % r['id'], quality=84, optimize=True, progressive=True)
        refs.append({'id': r['id'], 'title': r['title'], 'src': 'refs/%s.jpg' % r['id'], 'aspect': round(w / h, 4), 'view': r['view'], 'note': r['note']})
    if not os.path.exists('dist/model/tex/sky.hdr'):
        import tools.prep_textures as pt; pt.run()
    m = page(refs_js=json.dumps(refs), tex=True)
    open('dist/model/index.html', 'w').write(m)
    open('dist/index.html', 'w').write('<!DOCTYPE html><meta http-equiv="refresh" content="0;url=model/"><a href="model/">Lloyd Commons 3D model</a>')
    print('dist/model/index.html bytes:', len(m), '· refs:', len(refs))
