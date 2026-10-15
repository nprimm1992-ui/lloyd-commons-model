import json, math
from shapely.geometry import Polygon, Point

core = json.load(open('core2.json'))
D2 = json.load(open('detail2.json'))
gal = Polygon(core['gallery_fp'][0]).buffer(0)
rink = core['rink']
C = Point(rink['x'], rink['y'])

park = gal.intersection(C.buffer(85))
if park.geom_type == 'MultiPolygon':
    park = max(park.geoms, key=lambda g: g.area)
park_fp = [[round(x,1), round(y,1)] for x, y in park.exterior.coords[:-1]]

def ring_at(poly, off):
    q = poly.buffer(off)
    if q.geom_type == 'MultiPolygon':
        q = max(q.geoms, key=lambda g: g.area)
    return [list(p) for p in q.exterior.coords[:-1]]

def pts_on(coords, spacing):
    pts = coords + [coords[0]]
    out, acc = [], 0
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        dx, dy = b[0] - a[0], b[1] - a[1]
        Lh = math.hypot(dx, dy)
        if Lh < 1e-6: continue
        t = 0.0
        while t <= Lh:
            if acc >= spacing:
                acc = 0
                out.append([a[0] + dx * t / Lh, a[1] + dy * t / Lh])
            t += 1.0; acc += 1
    return out

def segs(coords, spacing):
    pts = coords + [coords[0]]
    out, acc = [], 0
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        dx, dy = b[0] - a[0], b[1] - a[1]
        Lh = math.hypot(dx, dy)
        if Lh < 1e-6: continue
        t = 0.0
        while t <= Lh:
            if acc >= spacing:
                acc = 0
                out.append({'x': round(a[0] + dx * t / Lh, 1), 'y': round(a[1] + dy * t / Lh, 1),
                            'r': round(math.atan2(-dx, dy), 3)})
            t += 1.0; acc += 1
    return out

edge = ring_at(park, 0)
planters = segs(ring_at(park, -1.4), 7)
walk = [ring_at(park, -1.3) + [ring_at(park, -1.3)[0]]]
posts = pts_on(ring_at(park, -1.0), 11)
bulbs = []
for i in range(len(posts)):
    a, b = posts[i], posts[(i + 1) % len(posts)]
    for tt in (0.25, 0.5, 0.75):
        px = a[0] + (b[0] - a[0]) * tt
        py = a[1] + (b[1] - a[1]) * tt
        hz = 16.3 - 1.1 * (1 - abs(2 * tt - 1))
        bulbs.append({'px': round(px, 1), 'py': round(py, 1), 'hz': round(hz, 2)})

# pergolas (3) + deck trees (8) at hand-picked offsets along the NS arm, kept if inside park
inner = park.buffer(-2.5)
def inside(x, y): return inner.contains(Point(x, y))
pergs = []
for oy in (-52, 30, 62):
    if inside(rink['x'], rink['y'] + oy):
        pergolas.append if False else pergs.append({'x': round(rink['x'],1), 'y': round(rink['y'] + oy,1), 'w': 6.5, 'd': 4.2, 'r': 0})
trees = []
for k, oy in enumerate(range(-70, 71, 18)):
    ox = 3.2 if k % 2 else -3.2
    if inside(rink['x'] + ox, rink['y'] + oy):
        trees.append([round(rink['x'] + ox,1), round(rink['y'] + oy,1)])
pods = []
for oy in (-38, 64):
    if park.buffer(-4).contains(Point(rink['x'], rink['y'] + oy)):
        pods.append({'x': round(rink['x'],1), 'y': round(rink['y'] + oy,1), 'w': 8})

out = {'fp': park_fp, 'area': round(park.area), 'pergs': pergs, 'trees': trees, 'pods': pods, 'bridges': []}
json.dump(out, open('roofpark.json', 'w'))

# scope detail2 roof items to the park
D2['roof_walk'] = walk
D2['planters'] = [ [p['x'], p['y']] for p in planters ]
D2['posts'] = [[round(p[0],1), round(p[1],1)] for p in posts]
D2['bulbs'] = bulbs
json.dump(D2, open('detail2.json', 'w'))
print('park area:', out['area'], 'm2 | planters:', len(planters), '| posts:', len(posts), 'bulbs:', len(bulbs),
      '| pergolas:', len(pergs), '| deck trees:', len(trees), '| pods:', len(pods))
