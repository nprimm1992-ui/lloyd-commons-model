import json, math
from shapely.geometry import Polygon, Point

core = json.load(open('core2.json'))
S = json.load(open('scene.json'))

net = Polygon(core['net_fp'][0]).buffer(0)
gal = Polygon(core['gallery_fp'][0]).buffer(0)
site = Polygon(S['site_boundary']).buffer(0)
mall = Polygon(S['mall']).buffer(0)

def ring_at(poly, off):
    """Return closed coord ring of polygon offset by off (neg = inward), as list."""
    q = poly.buffer(off)
    ext = q.exterior.coords[:-1]
    return [list(p) for p in ext]

def walk_ring(coords, spacing, off=0.0, poly=None, keep='inside'):
    """Emit points every `spacing` m along a closed ring, offset by `off`
    along the local normal; if poly given, force the offset side by `keep`."""
    pts = coords + [coords[0]]
    out, acc = [], 0
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        dx, dy = b[0] - a[0], b[1] - a[1]
        Lh = math.hypot(dx, dy)
        if Lh < 1e-6:
            continue
        nx, ny = -dy / Lh, dx / Lh
        t = 0.0
        while t <= Lh:
            if acc >= spacing:
                acc = 0
                px, py = a[0] + dx * t / Lh, a[1] + dy * t / Lh
                if poly is not None and off != 0:
                    p_in = [px + nx * off, py + ny * off]
                    p_out = [px - nx * off, py - ny * off]
                    inside_in = poly.contains(Point(p_in))
                    if keep == 'inside':
                        out.append(p_in if inside_in else p_out)
                    else:
                        out.append(p_in if not inside_in else p_out)
                else:
                    out.append([px + nx * off, py + ny * off])
            t += 1.0
            acc += 1
    return out

out = {}

# 1. ground esplanade loop: ring path of the core, for a 12 m paver ribbon
out['pave_loop'] = [ [list(p) for p in core['net_fp'][0]] + [list(core['net_fp'][0][0])] ]

# 2. roof paver walk: gallery edge offset 1.3 m inward
rw = ring_at(gal, -1.3)
out['roof_walk'] = [rw + [rw[0]]]

# 3. roof planter rows: along gallery edge, 1.6 m inward, every 9 m
out['planters'] = walk_ring(ring_at(gal, -1.6), 9, 0)

# 4. bollards: outside the colonnade line, +5.2 m off the core ring, every 16 m
out['bollards'] = walk_ring(ring_at(net, 5.2), 16, 0)

# 5. cafe clusters (table + umbrella): every 42 m on the esplanade, alternate side bias
out['cafe'] = walk_ring(ring_at(net, 4.6), 42, 0)

# 6. street trees: frontage streets only (same <=20 m rule as viewer), both sides
Wd = {'motorway':22,'trunk':20,'primary':17,'secondary':13,'tertiary':11,
      'unclassified':9,'residential':9,'living_street':7,'busway':9}
trees, seen = [], []
for st in S['streets']:
    pts = st['pts']
    mind = min(Point(p).distance(Polygon(S['site_boundary']).exterior) for p in pts)
    if mind > 20:
        continue
    w = Wd.get(st['cls'], 9)
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        dx, dy = b[0] - a[0], b[1] - a[1]
        Lh = math.hypot(dx, dy)
        if Lh < 1:
            continue
        nx, ny = -dy / Lh, dx / Lh
        t = 0.0
        while t <= Lh:
            for side in (1, -1):
                px = a[0] + dx * t / Lh + nx * side * (w / 2 + 2.2)
                py = a[1] + dy * t / Lh + ny * side * (w / 2 + 2.2)
                if mall.contains(Point(px, py)) or site.contains(Point(px, py)):
                    continue
                if trees and any(abs(px - q[0]) < 4 and abs(py - q[1]) < 4 for q in trees[-6:]):
                    continue
                trees.append([round(px, 1), round(py, 1)])
            t += 9.0
out['street_trees'] = trees

# 7. MAX platform: nearest light-rail point to site centroid
cx = sum(p[0] for p in S['site_boundary']) / len(S['site_boundary'])
cy = sum(p[1] for p in S['site_boundary']) / len(S['site_boundary'])
best = None
for r in S['rails']:
    if r['kind'] not in ('rail', 'light_rail', 'tram'):
        continue
    pts = r['pts']
    for i in range(len(pts)):
        d = math.hypot(pts[i][0] - cx, pts[i][1] - cy)
        if best is None or d < best[0]:
            best = (d, r, i)
out['rail'] = None
if best and best[0] < 400:
    d, r, i = best
    pts = r['pts']
    a = pts[max(0, i - 1)]
    b = pts[min(len(pts) - 1, i + 1)]
    dx, dy = b[0] - a[0], b[1] - a[1]
    Lh = math.hypot(dx, dy) or 1.0
    out['rail'] = {'x': round(pts[i][0], 1), 'y': round(pts[i][1], 1),
                   'dx': round(dx / Lh, 4), 'dy': round(dy / Lh, 4), 'dist': round(d, 1)}

json.dump(out, open('detail2.json', 'w'))
print('pave loops:', len(out['pave_loop']), '| roof walks:', len(out['roof_walk']),
      '| planters:', len(out['planters']), '| bollards:', len(out['bollards']),
      '| cafe:', len(out['cafe']), '| street trees:', len(out['street_trees']),
      '| rail:', out['rail'])
