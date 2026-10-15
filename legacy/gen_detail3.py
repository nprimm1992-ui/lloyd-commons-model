import json, math
from shapely.geometry import Polygon, Point

core = json.load(open('core2.json'))
S = json.load(open('scene.json'))
PR = json.load(open('proposal.json'))

gal = Polygon(core['gallery_fp'][0]).buffer(0)
net = Polygon(core['net_fp'][0]).buffer(0)
site = Polygon(S['site_boundary']).buffer(0)
mall = Polygon(S['mall']).buffer(0)

def ring_at(poly, off):
    q = poly.buffer(off)
    if q.geom_type == 'MultiPolygon':
        q = max(q.geoms, key=lambda g: g.area)
    return [list(p) for p in q.exterior.coords[:-1]]

def segs(coords, spacing, keep_poly=None):
    """Emit {x,y,rot} every `spacing` m along closed ring; rot mirrors the proven beam formula."""
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
                px, py = a[0] + dx * t / Lh, a[1] + dy * t / Lh
                if keep_poly is not None and not keep_poly.contains(Point(px, py)):
                    t += 1.0; acc += 1; continue
                rot = math.atan2(-(dx), dy)
                out.append({'x': round(px, 1), 'y': round(py, 1), 'r': round(rot, 3)})
            t += 1.0; acc += 1
    return out

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

out = {}

# 1. balcony fascia segments along gallery edge (inset 0.35)
out['fascia'] = segs(ring_at(gal, -0.35), 3.5)

# 2. festoon: posts on deck perimeter every 12 m; bulbs along chords post->post + post->inner
posts = pts_on(ring_at(gal, -1.0), 12)
inner = pts_on(ring_at(gal, -5.0), 12)
spans = []
for i in range(len(posts)):
    a, b = posts[i], posts[(i + 1) % len(posts)]
    spans.append([a, b])
    if i % 2 == 0 and i < len(inner):
        spans.append([a, inner[i]])
bulbs = []
for a, b in spans:
    for tt in (0.2, 0.35, 0.5, 0.65, 0.8):
        px = a[0] + (b[0] - a[0]) * tt
        py = a[1] + (b[1] - a[1]) * tt
        hz = 15.9 - 1.15 * (1 - abs(2 * tt - 1))  # catenary sag, strung at ~15.9
        bulbs.append({'px': round(px, 1), 'py': round(py, 1), 'hz': round(hz, 2)})
out['posts'] = [[round(p[0], 1), round(p[1], 1)] for p in posts]
out['bulbs'] = bulbs

# 3. esplanade benches + light poles
out['benches'] = segs(ring_at(net, 7.8), 30)
out['poles'] = pts_on(ring_at(net, 2.2), 35)

# 4. bike racks: ring around plaza + row at MAX
pl = PR['plaza']
racks = []
for k in range(8):
    a = k / 8 * 2 * math.pi
    racks.append([round(pl['x'] + math.cos(a) * 26, 1), round(pl['y'] + math.sin(a) * 26, 1)])
if out.get('rail') is None and 'rail' in json.load(open('detail2.json')):
    R = json.load(open('detail2.json'))['rail']
    for k in range(5):
        lo = -14 + k * 7
        racks.append([round(R['x'] + R['dx'] * lo - R['dy'] * 3.2, 1),
                      round(R['y'] + R['dy'] * lo + R['dx'] * 3.2, 1)])
out['racks'] = racks

# 5. crosswalks at 4 axis/street junctions (nearest frontage street vertex to each ring extreme)
Wd = {'motorway':22,'trunk':20,'primary':17,'secondary':13,'tertiary':11,
      'unclassified':9,'residential':9,'living_street':7,'busway':9}
ring = list(net.exterior.coords)
xs = [p[0] for p in ring]; ys = [p[1] for p in ring]
extremes = [min(ring, key=lambda p: p[0]), max(ring, key=lambda p: p[0]),
            min(ring, key=lambda p: p[1]), max(ring, key=lambda p: p[1])]
cross, cross_n = [], 0
for ex in extremes:
    best = None
    for st in S['streets']:
        pts = st['pts']
        mind = min(Point(p).distance(net) for p in pts)
        if mind > 20: continue
        for i, p in enumerate(pts):
            d = math.hypot(p[0] - ex[0], p[1] - ex[1])
            if best is None or d < best[0]:
                best = (d, st, i)
    if not best: continue
    d, st, i = best
    pts = st['pts']
    a = pts[max(0, i - 1)]; b = pts[min(len(pts) - 1, i + 1)]
    dx, dy = b[0] - a[0], b[1] - a[1]
    Lh = math.hypot(dx, dy) or 1.0
    ux, uy = dx / Lh, dy / Lh
    nx, ny = -uy, ux
    w = Wd.get(st['cls'], 9)
    rot = math.atan2(-(ux), uy)
    off = -w / 2 + 1.0
    while off <= w / 2 - 1.0:
        cross.append({'x': round(pts[i][0] + nx * off, 1), 'y': round(pts[i][1] + ny * off, 1),
                      'r': round(rot, 3), 'len': round(w - 2, 1)})
        off += 1.15; cross_n += 1
out['cross'] = cross
out['cross_n'] = cross_n

# 6. courtyard trees: 4 per courtyard polygon
cyt = []
for cc in PR.get('courtyards', []):
    poly = Polygon(cc['fp']).buffer(-1.5)
    if poly.is_empty: continue
    c = poly.centroid
    pts = [[c.x, c.y]]
    for k in range(3):
        a = k / 3 * 2 * math.pi + 0.5
        p = Point(c.x + math.cos(a) * 5, c.y + math.sin(a) * 5)
        if poly.contains(p): pts.append([p.x, p.y])
    for p in pts: cyt.append([round(p[0], 1), round(p[1], 1)])
out['cyt'] = cyt

json.dump(out, open('detail3.json', 'w'))
print('fascia:', len(out['fascia']), '| festoon posts:', len(out['posts']), 'bulbs:', len(out['bulbs']),
      '| benches:', len(out['benches']), '| poles:', len(out['poles']), '| racks:', len(out['racks']),
      '| crosswalk stripes:', cross_n, '| courtyard trees:', len(cyt))
