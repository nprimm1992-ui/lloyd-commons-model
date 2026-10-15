# ---------- retained civic core geometry (per The-Lloyd-Commons v3.3) ----------
import json, math
import numpy as np
from shapely.geometry import Polygon, LineString, Point, box
from shapely.ops import unary_union
from shapely import affinity
scene = json.load(open('scene.json')); P = json.load(open('proposal.json'))
mall = Polygon(scene['mall'])
mall_b = mall.buffer(6)
sp = P['spine']['pts']
spine_line = LineString(sp)
# hub = spine midpoint; E-W cross arm through hub
hub = P['hub']; hx, hy = hub['x'], hub['y']
xs=[p[0] for p in scene['site_boundary']]; ys=[p[1] for p in scene['site_boundary']]
ew_line = LineString([(xs[0]-300, hy),(xs[-1]+300, hy)])
# core network: N-S arm (34 m) + E-W arm (26 m) + rink at crossing, clipped to building
ns_arm = spine_line.buffer(17)
ew_arm = ew_line.buffer(13)
rink = box(hx-30.5, hy-14, hx+30.5, hy+14)          # 61 x 28 m NHL-scale rink
core = unary_union([ns_arm, ew_arm, rink]).intersection(mall_b)
core = core.buffer(1.5).buffer(-1.5)
# roof commons = core roof minus 3 courtyard cuts (ellipses along the spine)
cuts = []
for t in (0.28, 0.5, 0.72):
    pt = spine_line.interpolate(t, normalized=True)
    cuts.append(Point(pt.x, pt.y).buffer(11))
cuts_u = unary_union(cuts)
roof_area = core.area
core_pieces = []
for g in (core.geoms if core.geom_type=='MultiPolygon' else [core]):
    core_pieces.append([[round(x,1),round(y,1)] for x,y in g.exterior.coords])
roof_pieces = core.difference(cuts_u)
roof_out = []
for g in (roof_pieces.geoms if roof_pieces.geom_type=='MultiPolygon' else [roof_pieces]):
    if g.area > 40: roof_out.append([[round(x,1),round(y,1)] for x,y in g.exterior.coords])
# greenhouse pods on roof (3 small glass vaults along spine)
pods = []
for t in (0.36, 0.58, 0.66):
    pt = spine_line.interpolate(t, normalized=True)
    pods.append({'x': round(pt.x,1), 'y': round(pt.y,1), 'w': 14, 'd': 6})
# sky bridges: connect 3 nearest perimeter bars to core roof
c0 = core.centroid
cands = sorted(P['buildings'], key=lambda b: Polygon(b['fp']).distance(core))[:3]
bridges = []
for b in cands:
    bc = Polygon(b['fp']).centroid
    p0 = core.exterior.interpolate(core.exterior.project(Point(bc.x, bc.y)))
    bridges.append({'x0': round(p0.x,1), 'y0': round(p0.y,1), 'x1': round(bc.x,1), 'y1': round(bc.y,1), 'h': 13})
# zone anchor points (labels)
sp_mid = spine_line.interpolate(0.22, normalized=True)
sp_south = spine_line.interpolate(0.82, normalized=True)
zones = {'anchors': [round(sp_mid.x,1), round(sp_mid.y,1)], 'enterprise': [round(sp_south.x,1), round(sp_south.y,1)],
         'activation': [round(P['venue']['base_fp'][0][0],1), round(P['venue']['base_fp'][0][1],1)]}
core_area = core.area
out = {'core_fp': core_pieces, 'core_area_m2': round(core_area), 'core_sf': round(core_area*10.7639),
       'roof_fp': roof_out, 'pods': pods, 'bridges': bridges, 'rink': {'x': round(hx,1), 'y': round(hy,1), 'w': 61, 'd': 28},
       'zones': zones,
       'mall_gross_m2': 136760, 'mall_gross_sf': 1472000, 'core_documented_sf': 450000}
json.dump(out, open('core.json','w'))
print(f"core network: {core_area:,.0f} m2 = {core_area*10.7639:,.0f} SF modeled (documented ~450,000 SF) | roof pieces {len(roof_out)} | bridges {len(bridges)} | rink 61x28")
