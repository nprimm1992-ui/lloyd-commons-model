"""Compress the CC0 Poly Haven scans in assets/tex_src into web textures + a manifest.
Output: dist/model/tex/{1k,512}/<key>_{d,n,r}.jpg, dist/model/tex/sky.hdr, assets/tex_manifest.json
Run tools/fetch_textures.py first if assets/tex_src is empty."""
import json, os, shutil
from PIL import Image, ImageStat

SRC = 'assets/tex_src'
SETS = {  # key: (poly haven id, real-world tile size in metres)
    'brickRed': ('red_brick', 2.2), 'brickDark': ('red_brick_03', 2.2), 'brickOrange': ('large_red_bricks', 2.6),
    'concrete': ('concrete_wall_008', 3.5), 'plaster': ('beige_wall_001', 3.0), 'cedar': ('japanese_cedar_planks', 2.4),
    'ribbed': ('corrugated_iron_02', 2.0), 'boxprofile': ('box_profile_metal_sheet', 2.0), 'tiles': ('large_grey_tiles', 4.0),
    'pavement': ('concrete_pavement_02', 4.0), 'brickpave': ('red_brick_pavers', 1.6), 'asphalt': ('asphalt_02', 5.0),
    'leafy': ('leafy_grass', 5.0), 'sedum': ('aerial_grass_rock', 6.0), 'gravel': ('gravel_concrete_02', 3.0), 'grass': ('grass_ground', 5.0),
}
OUT = 'dist/model/tex'


def run():
    man = {'credit': 'Textures and sky: Poly Haven (polyhaven.com), CC0', 'sets': {}}
    for res, size in (('1k', 1024), ('512', 512)):
        os.makedirs(os.path.join(OUT, res), exist_ok=True)
    total = 0
    for key, (pid, tile) in SETS.items():
        d = Image.open(os.path.join(SRC, pid + '_diff.jpg')).convert('RGB')
        avg = [round(v) for v in ImageStat.Stat(d.resize((64, 64))).mean]
        maps = {'d': d}
        for suf, tag in (('nor', 'n'), ('rough', 'r')):
            p = os.path.join(SRC, '%s_%s.jpg' % (pid, suf))
            if os.path.exists(p):
                maps[tag] = Image.open(p).convert('L' if tag == 'r' else 'RGB')
        for res, size in (('1k', 1024), ('512', 512)):
            for tag, im in maps.items():
                s = size if tag != 'r' else size // 2
                f = os.path.join(OUT, res, '%s_%s.jpg' % (key, tag))
                im.resize((s, s), Image.LANCZOS).save(f, quality={'d': 80, 'n': 84, 'r': 72}[tag], optimize=True, progressive=True)
                total += os.path.getsize(f)
        man['sets'][key] = {'id': pid, 'tile': tile, 'avg': avg, 'maps': sorted(maps.keys())}
    shutil.copy(os.path.join(SRC, 'sky_1k.hdr'), os.path.join(OUT, 'sky.hdr'))
    total += os.path.getsize(os.path.join(OUT, 'sky.hdr'))
    json.dump(man, open('assets/tex_manifest.json', 'w'), indent=1)
    print('textures:', len(SETS), 'sets ·', round(total / 1e6, 1), 'MB (1k + 512 + sky)')


if __name__ == '__main__':
    run()
