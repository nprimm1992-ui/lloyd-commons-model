"""Project layout footprints onto references/site_ref/ref_04.jpg using the solved camera (tools/cam.json).
Usage: python tools/overlay_ref.py [--north] -> out/ref04_footprints.png"""
import json, sys, os, numpy as np
from PIL import Image, ImageDraw
from shapely.geometry import Polygon
os.makedirs('out', exist_ok=True)
cam = json.load(open('tools/cam.json'))
im = Image.open('references/site_ref/ref_04.jpg').convert('RGB'); W_, H_ = im.size
pos, tgt = np.array(cam['pos']), np.array(cam['tgt']); fov = np.radians(cam['fov'])
f = (tgt - pos) / np.linalg.norm(tgt - pos); r = np.cross(f, [0, 0, 1]); r /= np.linalg.norm(r); u = np.cross(r, f)
fy = (H_ / 2) / np.tan(fov / 2)
def P(X):
    d = np.asarray(X, float) - pos; z = d @ f
    return np.c_[W_ / 2 + fy * (d @ r) / z, H_ / 2 - fy * (d @ u) / z]
d = json.load(open('layout.json')); dr = ImageDraw.Draw(im)
north = '--north' in sys.argv
cols = [(255, 255, 0), (0, 255, 255), (255, 0, 255), (255, 140, 0), (140, 255, 140), (120, 160, 255), (255, 80, 80)]
for i, b in enumerate([b for b in d['buildings'] if b['z0'] == 0 and (b.get('north_ref') or not north)]):
    c = cols[i % 7]
    for z, w in ((0, 2), (b['h'], 1)):
        pts = P([[x, y, z] for x, y in b['fp']]); dr.line([tuple(q) for q in pts] + [tuple(pts[0])], fill=c, width=w)
    p = Polygon(b['fp']); cc = P([[p.centroid.x, p.centroid.y, 0]])[0]; dr.text((cc[0] - 25, cc[1]), b['name'][:18], fill=c)
im.save('out/ref04_footprints.png'); print('out/ref04_footprints.png')
