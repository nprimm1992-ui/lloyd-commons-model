# ---------- FULL retained-core network (The-Lloyd-Commons v3.3: ~450,000 SF) ----------
import json, math
import numpy as np
from shapely.geometry import Polygon, LineString, Point, box
from shapely.ops import unary_union
from shapely import affinity

scene = json.load(open('scene.json')); P = json.load(open('proposal.json'))
mall = Polygon(scene['mall']).buffer(0)
if mall.geom_type == 'MultiPolygon': mall = max(mall.geoms, key=lambda g: g.area)
mall_b = mall.buffer(4)

sp = P['spine']['pts']; spine_line = LineString(sp)
hub = P['hub']; hx, hy = hub['x'], hub['y']
xs=[p[0] for p in scene['site_boundary']]; ys=[p[1] for p in scene['site_boundary']]
ew_line = LineString([(min(xs)-300, hy),(max(xs)+300, hy)])

# storefront line: erode building by 12 m -> interior facade line
A = mall.buffer(-12)
if A.geom_type == 'MultiPolygon': A = max(A.geoms, key=lambda g: g.area)

def build_network(w_ring):
    ring = A.difference(A.buffer(-w_ring))                       # ring corridor band
    ns_arm = spine_line.buffer(17).intersection(A)
    ew_arm = ew_line.buffer(13).intersection(A)
    net = unary_union([ring, ns_arm, ew_arm])
    # 4 anchor wing stubs toward the footprint's extreme corners
    ext = list(mall.exterior.coords)
    corners = [min(ext,key=lambda c:(c[0]+c[1])), max(ext,key=lambda c:(c[0]+c[1])),
               min(ext,key=lambda c:(c[0]-c[1])), max(ext,key=lambda c:(c[0]-c[1]))]
    for c in corners:
        cpt = Point(c); proj_dst = ring.exterior.project(cpt) if ring.geom_type=='Polygon' else 0
        p0 = ring.exterior.interpolate(proj_dst)
        seg = LineString([p0, cpt]).buffer(11)
        net = unary_union([net, seg.intersection(mall_b)])
    return net.buffer(1.2).buffer(-1.2).intersection(mall_b), ring, ns_arm, ew_arm

# tune ring width to hit ~41,500 m2 (450k SF)
lo, hi = 12.0, 30.0
for _ in range(22):
    w = (lo+hi)/2
    net, *_ = build_network(w)
    a = net.area
    if a < 40800: lo = w
    else: hi = w
net, ring, ns_arm, ew_arm = build_network((lo+hi)/2)
print(f"ring width {((lo+hi)/2):.1f} m -> network {net.area:,.0f} m2 = {net.area*10.7639:,.0f} SF (target ~450,000)")

# gallery bands (upper level 7.5-12.5 m): outer half of ring + both sides of N-S arm
gallery = mall.difference(mall.buffer(-12-((lo+hi)/2)/2)).intersection(mall_b)   # outer half ring
g_ns_1 = spine_line.buffer(16.4).difference(spine_line.buffer(10.4)).intersection(A)
g_ns_2 = spine_line.buffer(-10.4).difference(spine_line.buffer(-16.4)).intersection(A)
gallery = unary_union([gallery, g_ns_1, g_ns_2]).intersection(net)

# colonnade columns along storefront line + N-S arm edges
cols = []
def sample_line(geom, spacing=7.5):
    pts=[]
    if geom.is_empty: return pts
    lines = [geom] if geom.geom_type=='LineString' else list(geom.geoms)
    for ln in lines:
        n = max(2, int(ln.length/spacing))
        for i in range(n+1):
            p = ln.interpolate(i*spacing % ln.length if False else min(i*spacing, ln.length))
            pts.append((p.x, p.y))
    return pts
storefront = A.exterior
for d in np.arange(0, storefront.length, 7.5):
    p = storefront.interpolate(d); cols.append([round(p.x,1), round(p.y,1)])
for off in (16.0, -16.0):
    ln = spine_line.offset_curve(off)
    for d in np.arange(0, ln.length, 7.5):
        p = ln.interpolate(d)
        pt = Point(p.x, p.y)
        if net.contains(pt) or net.buffer(1).contains(pt): cols.append([round(p.x,1), round(p.y,1)])

# glass roofs: flat over ring + wings (net minus arms), barrels over N-S + E-W arms
ring_glass = net.difference(spine_line.buffer(20)).difference(ew_line.buffer(16))
ring_glass_fp = []
for g in (ring_glass.geoms if ring_glass.geom_type=='MultiPolygon' else [ring_glass]):
    if g.area > 60: ring_glass_fp.append([[round(x,1),round(y,1)] for x,y in g.exterior.coords])

# E-W arm vault extent
ew_in = ew_line.intersection(A)
ew_len = ew_in.length
# roof gardens on gallery tops + pods + bridges (from prior core.json)
old = json.load(open('core.json'))
def fp_of(g): return [[[round(x,1),round(y,1)] for x,y in gg.exterior.coords] for gg in (g.geoms if g.geom_type=='MultiPolygon' else [g]) if gg.area>60]
out = {'net_fp': fp_of(net), 'gallery_fp': fp_of(gallery), 'columns': cols,
       'ring_glass_fp': ring_glass_fp,
       'ew_vault': {'y': round(hy,1), 'x0': round(ew_in.bounds[0],1), 'x1': round(ew_in.bounds[2],1), 'radius': 9.5, 'eave': 5.0},
       'rink': old['rink'], 'zones': old['zones'], 'pods': old['pods'], 'bridges': old['bridges'],
       'mall_gross_sf': 1472000, 'core_documented_sf': 450000,
       'core_sf': round(net.area*10.7639), 'core_area_m2': round(net.area), 'ring_w': round((lo+hi)/2,1),
       'n_columns': len(cols)}
json.dump(out, open('core2.json','w'))
print(f"columns {len(cols)} | gallery polys {len(out['gallery_fp'])} | glass roofs {len(ring_glass_fp)} | EW vault {ew_len:.0f} m")
