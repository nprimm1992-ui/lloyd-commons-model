#!/usr/bin/env python3
"""Lloyd Commons superblock layout v3.

One coherent parti distilled from the full reference set:
  * glass barrel-vault galleria on the real mall axis (rink court y = 674.9)
  * music venue terminates the WEST end, tall mixed-use cluster the EAST end,
    curved perimeter road beyond the east cluster (site boundary curve)
  * retained 3-level podium bands flank the vault; roof commons park sits on
    those podium roofs in the MIDDLE of the galleria (vault ~1/3, decks ~2/3)
  * faceted octagonal crossing pavilion over the rink
  * perimeter blocks N + S stepping DOWN toward the galleria; towers at corners
  * fountain plaza at the SW corner beside the venue
Coordinates: local metres, x = east, y = north (same frame as scene.json).
"""
import json, math, random
from shapely.geometry import Polygon, box, Point, LineString
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

random.seed(11)
S = json.load(open('scene.json'))
SITE = orient(Polygon(S['site_boundary']).buffer(0), 1.0)


def polys(g):
    if g is None or g.is_empty:
        return []
    if g.geom_type == 'Polygon':
        return [orient(g, 1.0)] if g.area > 1 else []
    return [orient(p, 1.0) for p in getattr(g, 'geoms', []) if p.geom_type == 'Polygon' and p.area > 1]


def big(g):
    ps = polys(g)
    return max(ps, key=lambda p: p.area) if ps else None


def C(p):
    return [[round(x, 2), round(y, 2)] for x, y in list(p.exterior.coords)[:-1]]


def octagon(cx, cy, R):
    return Polygon([(cx + R * math.cos(math.pi / 8 + k * math.pi / 4),
                     cy + R * math.sin(math.pi / 8 + k * math.pi / 4)) for k in range(8)])


# ------------------------------------------------------------------ core parti v7 (traced from ref6 plan, rotated 180 deg)
from shapely import affinity
VX0, VX1 = 738.0, 1100.0         # vault W end (venue face) / E end (east portal)
RX, HY = 919.0, 659.0            # crossing hall centre
PHX, PHY, PCH = 36.0, 32.0, 10.0 # ref9 aerial: hall LONG axis runs WITH the galleria; vaults enter the chamfered short faces (72 x 64 m)
HALL_EAVE, HALL_TOP = 26.5, 33.0 # eave just above vault crowns (24 m); low hip to a long flat ridge-plateau
TOP_HX, TOP_HY, TOP_CH = 23.0, 9.0, 3.5    # plateau: long narrow ridge cap along the axis (ref9 k8)
AXW, AXE = 667.0, 651.0          # wing axes: W wing sits ~16 m north of E wing (ref jog at the pyramid)
AX = (AXW + AXE) / 2
VH, BD = 12.0, 38.0             # atrium half-width (24 m), shop-block depth: blocks run RIGHT UP to the vault (one building)
LE = VH                          # no open-air lanes any more
BD_S = 26.0                      # slimmer southern retail wing permits the deeper southward placement
POD_H = 14.0                     # 3 retail levels (0 / 5 / 9.5) -> vault springs from the roof at 14 m
BAL = 4.5                        # interior balcony depth (ref: deep walkways)
HALL = orient(Polygon([(RX - PHX + PCH, HY - PHY), (RX + PHX - PCH, HY - PHY), (RX + PHX, HY - PHY + PCH), (RX + PHX, HY + PHY - PCH),
                       (RX + PHX - PCH, HY + PHY), (RX - PHX + PCH, HY + PHY), (RX - PHX, HY + PHY - PCH), (RX - PHX, HY - PHY + PCH)]), 1.0)
PAV = HALL
WINGS = [(VX0, RX - PHX, AXW), (RX + PHX, VX1, AXE)]   # equal 147 m wings
PS = AXW - LE - BD_S; PN = AXW + LE + BD               # W wing faces 617 / 717
vaults, lanes_l, bands_l, kiosk_side = [], [], [], []
for x0, x1, ax in WINGS:
    vaults.append(box(x0, ax - VH, x1, ax + VH))
    lanes_l += [box(x0, ax - LE, x1, ax - VH), box(x0, ax + VH, x1, ax + LE)]
    bands_l += [box(x0, ax - LE - BD_S, x1, ax - LE), box(x0, ax + LE, x1, ax + LE + BD)]
band_u = unary_union(bands_l)
void = unary_union(vaults)
lanes = unary_union(lanes_l)
PARK_X = (RX - PHX - 82, RX + PHX + 82)                 # roof commons: inner 82 m of each band, hugging the pyramid
park = band_u.intersection(box(PARK_X[0], 0, PARK_X[1], 2000)).difference(HALL.buffer(1.5)).buffer(-0.6, join_style=2)
other_roof = band_u.difference(park.buffer(0.01))
link = box(VX1, AXE - 14, 1106, AXE + 14)
guards = []
for x0, x1, ax in WINGS:
    for sd in (-1, 1):
        y = ax + sd * LE
        gx0, gx1 = max(x0, PARK_X[0]), min(x1, PARK_X[1])
        if x0 < RX: gx1 = min(gx1, RX - PHX - 1.5)
        else: gx0 = max(gx0, RX + PHX + 1.5)
        guards.append([gx0, gx1, y, sd])

core = {
    'AX': AX, 'RX': RX, 'VX0': VX0, 'VX1': VX1, 'PS': PS, 'PN': PN, 'VH': VH, 'POD_H': POD_H, 'LE': LE,
    'AXW': AXW, 'AXE': AXE,
    'pav': {'x': RX, 'y': HY, 'hx': PHX, 'hy': PHY, 'ch': PCH, 'drum': POD_H, 'eave': HALL_EAVE, 'apex': HALL_TOP, 'ov': 2.2},
    'vault': {'x0': VX0, 'x1': VX1, 'y': AX, 'half': VH, 'spring': POD_H, 'rise': 10.0,
              'segs': [[x0, x1, ax] for x0, x1, ax in WINGS]},
    'rink': {'x': RX, 'y': HY, 'w': 30, 'd': 50},
    'bands': [C(p) for p in polys(band_u)],
    'floor': [C(p) for p in polys(unary_union([void, HALL]))],
    'lanes': [C(p) for p in polys(lanes)],
    'park': [C(p) for p in polys(park)],
    'roof_other': [C(p) for p in polys(other_roof)],
    'link': C(orient(link, 1.0)),
    'pav_fp': C(orient(HALL, 1.0)),
    'guards': guards, 'BAL': BAL, 'levels': [5.0, 9.5],
    'hall_frame': [],
}
_ro = orient(HALL.buffer(-0.3, join_style=2), 1.0)
_ri2 = orient(HALL.buffer(-12.0, join_style=1).buffer(6.0, join_style=1), 1.0)     # level 2 ring: 6 m deep
_ri3 = orient(HALL.buffer(-17.0, join_style=1).buffer(6.0, join_style=1), 1.0)     # level 3 food-court ring: 11 m deep
_top = orient(Polygon([(RX - TOP_HX + TOP_CH, HY - TOP_HY), (RX + TOP_HX - TOP_CH, HY - TOP_HY), (RX + TOP_HX, HY - TOP_HY + TOP_CH), (RX + TOP_HX, HY + TOP_HY - TOP_CH),
                       (RX + TOP_HX - TOP_CH, HY + TOP_HY), (RX - TOP_HX + TOP_CH, HY + TOP_HY), (RX - TOP_HX, HY + TOP_HY - TOP_CH), (RX - TOP_HX, HY - TOP_HY + TOP_CH)]), 1.0)
core['hall_ring'] = [C(_ro), C(_ri2)]
core['hall_rings'] = [[C(_ro), C(_ri2)], [C(_ro), C(_ri3)]]
core['hall_top'] = C(_top)  # legacy footprint, not used by the revised roof
# Reference-led narrow transverse ridge; dimensions remain concept assumptions.
# Every patch is one material only: no opaque roof below skylight panes.
_rfp = orient(affinity.rotate(HALL.buffer(2.2, join_style=2),90,origin=(RX,HY)),1.0)
# Roof-local axes rotated clockwise 90 degrees, refitted to the unchanged hall envelope.
_hx, _hy, _end = PHY + 2.2, PHX + 2.2, 7.0
_rxy = lambda u,v: (RX+v,HY-u)
core['roof_surface'] = {'hx': PHX+2.2, 'hy': PHY+2.2, 'end': _end, 'ridge_axis': 'x', 'rotation_deg': 90}
core['roof_patches'], core['roof_lines'] = [], []
_roofedges = set()
_roofcoords = lambda pp: [[round(x,8),round(y,8)] for x,y in list(pp.exterior.coords)[:-1]]
_roofpolys = lambda g: [] if g.is_empty else ([g] if g.geom_type=='Polygon' else [p for p in g.geoms if p.geom_type=='Polygon'])
_zroof = lambda x,y: HALL_EAVE + (HALL_TOP-HALL_EAVE)*max(0,min(1,(_hx-abs(x-RX))/_hx,(_hy-abs(y-HY))/_end))
for sd in (-1,1):
    # Broad pitches meet a line ridge; their short ends are clipped by hip facets.
    zone = Polygon([(RX,HY-_hy+_end),(RX+sd*_hx,HY-_hy),(RX+sd*_hx,HY+_hy),(RX,HY+_hy-_end)])
    for j in range(26):
        u0,u1 = j/26,(j+1)/26
        for k in range(14):
            v0,v1 = k/14,(k+1)/14
            def qp(u,v): return (RX+sd*_hx*(1-v),HY-_hy+2*_hy*u)
            patch = Polygon([qp(u0,v0),qp(u1,v0),qp(u1,v1),qp(u0,v1)]).intersection(zone).intersection(_rfp)
            if patch.is_empty or patch.area < 0.001: continue
            u,v=(u0+u1)/2,(v0+v1)/2
            glazed = (2/26 < u < 24/26 and 1/14 < v < 13/14 and not (9/26 < u < 17/26 and 5/14 < v < 9/14)) if sd==1 else (5/26 < u < 21/26 and 1/14 < v < 13/14)
            for pp in _roofpolys(patch):
                pts = _roofcoords(orient(pp,1.0))
                core['roof_patches'].append({'glass':glazed,'pts':[[x,y,round(_zroof(x,y),5)] for x,y in pts]})
                if glazed:
                    for a,b in zip(pts,pts[1:]+pts[:1]):
                        key = tuple(sorted((tuple(a),tuple(b))))
                        if key not in _roofedges:
                            _roofedges.add(key)
                            core['roof_lines'].append([[a[0],a[1],_zroof(*a)+0.055],[b[0],b[1],_zroof(*b)+0.055]])
for sd in (-1,1):
    zone=Polygon([(RX,HY+sd*(_hy-_end)),(RX-_hx,HY+sd*_hy),(RX+_hx,HY+sd*_hy)]).intersection(_rfp)
    for pp in polys(zone):
        core['roof_patches'].append({'glass':False,'pts':[[x,y,round(_zroof(x,y),5)] for x,y in _roofcoords(orient(pp,1.0))]})
core['roof_eave'] = _roofcoords(_rfp)
core['roof_ridge'] = [[RX,HY-_hy+_end,HALL_TOP],[RX,HY+_hy-_end,HALL_TOP]]
# Extract glazing perimeter edges for continuous raised flashing, separate from pane mullions.
_glass=unary_union([Polygon([(p[0],p[1]) for p in q['pts']]) for q in core['roof_patches'] if q['glass']])
core['roof_flashings']=[]
for pp in _roofpolys(_glass):
    for ring in [pp.exterior]+list(pp.interiors):
        pts=list(ring.coords)
        for a,b in zip(pts,pts[1:]):
            core['roof_flashings'].append([[*a,_zroof(*a)+0.10],[*b,_zroof(*b)+0.10]])
core['roof_hips']=[]
for sd in (-1,1):
    a=(RX,HY+sd*(_hy-_end))
    for sx in (-1,1):
        seg=LineString([a,(RX+sx*_hx,HY+sd*_hy)]).intersection(_rfp)
        b=seg.coords[-1]
        core['roof_hips'].append([[*a,HALL_TOP],[*b,_zroof(*b)]])
# Standing-seam ribs on opaque fields follow the slope, not a stretched generic texture.
core['roof_seams']=[]
_metal=unary_union([Polygon([(p[0],p[1]) for p in q['pts']]) for q in core['roof_patches'] if not q['glass']])
for yy in [HY-_hy+0.65*k for k in range(int(2*_hy/0.65)+1)]:
    line=LineString([(RX-_hx,yy),(RX+_hx,yy)]).intersection(_metal)
    for seg in ([line] if line.geom_type=='LineString' else getattr(line,'geoms',[])):
        if seg.geom_type=='LineString' and seg.length>0.1:
            pts=list(seg.coords)
            for a,b in zip(pts,pts[1:]):
                core['roof_seams'].append([[*a,_zroof(*a)+0.025],[*b,_zroof(*b)+0.025]])
_rot3=lambda p: [round(RX+(p[1]-HY),8),round(HY-(p[0]-RX),8),p[2]]
for q in core['roof_patches']: q['pts']=[_rot3(p) for p in q['pts']]
for key in ('roof_lines','roof_flashings','roof_hips','roof_seams'):
    core[key]=[[_rot3(p) for p in line] for line in core[key]]
core['roof_ridge']=[_rot3(p) for p in core['roof_ridge']]
core['roof_eave']=[_rot3([*p,0])[:2] for p in core['roof_eave']]
_rink = orient(box(RX - 11, HY - 15, RX + 11, HY + 15).buffer(6.0, resolution=10), 1.0)
core['rink_fp'] = C(_rink)
# arches: glulam tied arches spanning ACROSS the hall (ref9 k5/k7), on columns at the ring edge
core['hall_arches'] = {'xs': [RX + 8.0 * k for k in range(-3, 4)], 'half': PHY - 3.0, 'spring': 22.0, 'crown': 30.9, 'ridge_axis': 'x'}
# food court on the level-3 ring (ref9: 3rd-floor food court looking down to the rink)
_fc = _ro.buffer(-1.6).difference(_ri3.buffer(1.4))
core['food_tables'] = []
for _x in [RX - PHX + 3 + 3.6 * k for k in range(21)]:
    for _y in [HY - PHY + 3 + 3.6 * k for k in range(18)]:
        if _fc.contains(Point(_x, _y)) and not any(abs(_y - a) < VH + 1 and abs(_x - (RX - PHX if a == AXW else RX + PHX)) < 3 for a in (AXW, AXE)):
            core['food_tables'].append([round(_x, 1), round(_y, 1)])
# escalators: ground -> level 2 at both ends of the rink (x0, y, x1, z0, z1)
core['escalators'] = [[RX + 19.5, HY + 17.0, RX + 29.0, 0.0, 5.0], [RX - 19.5, HY - 17.0, RX - 29.0, 0.0, 5.0],
                      [RX + 19.5, HY - 17.0, RX + 29.0, 0.0, 5.0], [RX - 19.5, HY + 17.0, RX - 29.0, 0.0, 5.0]]
_fi = HALL.buffer(-0.8, join_style=2)
for xx in [RX - PHX + 4 + 8 * k for k in range(9)]:
    seg = LineString([(xx, HY - 60), (xx, HY + 60)]).intersection(_fi)
    if not seg.is_empty: core['hall_frame'].append([[round(c, 2) for c in seg.coords[0]], [round(c, 2) for c in seg.coords[-1]]])
for yy in [HY - PHY + 4 + 8 * k for k in range(8)]:
    seg = LineString([(RX - 60, yy), (RX + 60, yy)]).intersection(_fi)
    if not seg.is_empty: core['hall_frame'].append([[round(c, 2) for c in seg.coords[0]], [round(c, 2) for c in seg.coords[-1]]])

# ------------------------------------------------------------------ venue (west terminus, ref: dark fly tower + timber boxes)
def bx(x0, y0, x1, y1):
    return C(orient(box(x0, y0, x1, y1), 1.0))
VXa, VXb, VYa, VYb = 645.0, 738.0, 627.0, 707.0
vx = lambda x: round(VXa + (x - 643) * (VXb - VXa) / 47.0, 1)
vy = lambda y: round(VYa + (y - 630) * (VYb - VYa) / 82.0, 1)
vb = lambda x0, y0, x1, y1: bx(vx(x0), vy(y0), vx(x1), vy(y1))
venue = {
    'foot': bx(VXa, VYa, VXb, VYb),
    'vols': [
        {'fp': bx(VXa, VYa, VXb, VYb), 'z0': 0.0, 'h': 9.0, 'mat': 'venueBase'},
        {'fp': vb(654, 652, 684, 702), 'z0': 9.0, 'h': 30.0, 'mat': 'darkPanel'},
        {'fp': vb(643, 630, 663, 662), 'z0': 9.0, 'h': 22.0, 'mat': 'copper'},
        {'fp': vb(663, 630, 690, 648), 'z0': 13.0, 'h': 25.0, 'mat': 'copper'},
        {'fp': vb(643, 684, 659, 712), 'z0': 9.0, 'h': 19.5, 'mat': 'copper'},
        {'fp': vb(674, 694, 690, 712), 'z0': 9.0, 'h': 23.5, 'mat': 'copper'},
        {'fp': vb(684, 652, 690, 694), 'z0': 9.0, 'h': 16.0, 'mat': 'glassBox'},
    ],
    'terrace': vb(663, 648, 690, 652), 'terrace_z': 9.0,
    'canopy': bx(vx(664), VYa - 3.5, vx(688), VYa), 'canopy_z': 5.2,
}

# ------------------------------------------------------------------ buildings
B = []
def add(name, kind, poly, fl, z0=0.0, mat='brickRed', roof='meadow', prog=(0.85, 0.0, 0.15), ftf=3.3, gf=5.0, base=True):
    poly = orient(poly, 1.0)
    h = (gf + ftf * (fl - 1)) if z0 == 0 else (z0 + ftf * fl)
    ins = big(poly.buffer(-0.45, join_style=2))
    rec = {'id': len(B), 'name': name, 'kind': kind, 'fp': C(poly), 'inset': C(ins), 'z0': round(z0, 2), 'h': round(h, 2), 'fl': fl,
           'mat': mat, 'roof': roof, 'base': bool(base and z0 == 0), 'prog': {'resi': prog[0], 'off': prog[1], 'ret': prog[2]}}
    B.append(rec); return rec
def stepped(name, poly, fl, mat, prog=(0.85, 0.0, 0.15), step=3.0, top_fl=2, roof='meadow'):
    lo = add(name, 'bar', poly, fl - top_fl, mat=mat, roof='terrace', prog=prog)
    add(name + ' (setback)', 'step', big(orient(poly, 1.0).buffer(-step, join_style=2)), top_fl, z0=lo['h'], mat=mat, roof=roof, prog=prog, base=False)
def tower(name, pod, shaft, fl, mat, prog=(0.9, 0.0, 0.1), pod_fl=3, pod_mat='charcoal', roof='pv'):
    p = add(name + ' podium', 'podium', pod, pod_fl, mat=pod_mat, roof='meadow', prog=(0.3, 0.0, 0.7))
    add(name, 'tower', shaft, fl - pod_fl, z0=p['h'], mat=mat, roof=roof, prog=prog, base=False)
def ins(p, d=3.5):
    return big(p.buffer(-d, join_style=2))

# SOUTH ROW (Holladay Park side) — ONE line between NE Multnomah (y 556) and the galleria bands, abutting them.
add('Rooftop Farm Building', 'farm', box(703, 556, 792, 589), 5, mat='brickBrown', roof='farm', prog=(0.6, 0.0, 0.4), ftf=3.6)
add('Galleria South Mid-rise', 'bar', Polygon([(742, 601), (754, 589), (800, 589), (800, PS), (742, PS)]), 9, mat='stone', roof='pv', prog=(0.8, 0.1, 0.1))
add('Holladay Green Podium', 'podium', box(806, 589, RX - PHX, PS), 3, mat='charcoal', roof='meadow', prog=(0.2, 0.2, 0.6))
add('Holladay Glass Tower', 'tower', box(798, 556, 830, 589), 14, mat='darkglass', roof='pv')
tower('Holladay Brick Tower', box(834, 556, RX - PHX, 589), box(838, 559, RX - PHX - 4, 586), 17, 'brickRed', pod_fl=2)
add('South Hall Entry', 'entry', box(RX - 14, 560, RX + 14, 605), 2, mat='curtain', roof='membrane', prog=(0.0, 0.2, 0.8), ftf=4.5)
_fs = big(box(RX - PHX, 605, RX + PHX, HY).difference(HALL))
add('Hall South Flank (food hall + service)', 'flank', _fs, 3, mat='buff', roof='membrane', prog=(0.0, 0.1, 0.9), ftf=4.5)
E_S = AXE - LE - BD_S
tower('Holladay PV Tower', box(945, 556, 992, E_S), box(948, 559, 989, E_S - 3), 20, 'stone', pod_fl=2)
add('SE Courtyard Block S', 'bar', box(998, 556, 1062, 571), 6, mat='terracotta', roof='meadow')
add('SE Courtyard Block N', 'bar', box(998, 586, 1062, E_S), 5, mat='terracotta', roof='meadow')
add('SE Courtyard Block E', 'bar', box(1048, 571, 1062, 586), 5, mat='terracotta', roof='meadow')
stepped('SE Terrace Building', box(1068, 556, 1098, E_S), 8, 'stone', step=3.5, top_fl=2)
dk = Polygon([(1104, 558), (1140, 558), (1140, 598), (1124, 614), (1104, 614)])
tower('SE Dark Tower', dk, ins(dk, 3.0), 24, 'darkglass', pod_fl=2)

# EAST cluster at the galleria's east end; curved road beyond.
tower('Axis Terminus Tower', box(1106, 622, 1146, 676), box(1110, 627, 1142, 671), 30, 'terracotta', prog=(0.35, 0.55, 0.10))
tower('East Tower N', box(1062, 706, 1098, 742), box(1066, 710, 1094, 738), 24, 'darkglass')

# NORTH SIDE — row 1 = galleria podium bands; Commons St (y 724); row 2 = Halsey blocks split by two N-S lanes.
_fn = big(box(RX - PHX, HY, RX + PHX, 713).difference(HALL))
add('Hall North Flank (food hall + service)', 'flank', _fn, 3, mat='buff', roof='membrane', prog=(0.0, 0.1, 0.9), ftf=4.5)
rot = affinity.rotate(box(-19, -15, 19, 15), 38, origin=(0, 0)); rot = affinity.translate(rot, 988, 727)
add('Pyramid Court Building', 'bar', rot, 9, mat='stone', roof='pv', prog=(0.7, 0.2, 0.1))
add('NE Terrace Block', 'bar', box(1016, 706, 1056, 742), 6, mat='brickOrange', roof='meadow')
add('Halsey Green Bar E', 'bar', box(1000, 750, 1044, 770), 4, mat='buff', roof='meadow')
tower('NW Dark Glass Tower', box(645, 733, 692, 770), box(649, 737, 688, 766), 22, 'darkglass')
stepped('NW Court Block', box(698, 733, 734, 770), 9, 'brickBrown', step=3.5, top_fl=2)
tower('Halsey White Tower', box(751, 733, 786, 770), box(754, 736, 783, 767), 20, 'tower', pod_fl=2)
add('Commons Brown Bar', 'bar', box(792, 733, 806, 770), 6, mat='brickBrown', roof='meadow')
add('Commons PV Block', 'bar', box(842, 733, 880, 754), 8, mat='terracotta', roof='pv')
add('Halsey Green Bar W', 'bar', box(806, 758, 880, 770), 4, mat='buff', roof='meadow')
add('Hall-side North Block', 'bar', box(886, 733, 940, 754), 10, mat='darkglass', roof='pv', prog=(0.6, 0.3, 0.1))
add('Halsey Green Bar C', 'bar', box(886, 758, 940, 770), 4, mat='brickRed', roof='meadow')

# ------------------------------------------------------------------ southward civic-core relocation
# Move 25% closer to the site south boundary, preserving the site and road coordinates.
SOUTH_SHIFT = 40.0  # 12.825 m further south than the previous delivered revision
OLD_HY, OLD_PS, OLD_ES = HY, PS, E_S
_move_ring=lambda pts:[[x,round(y-SOUTH_SHIFT,8)] for x,y in pts]
_move3=lambda pts:[[p[0],round(p[1]-SOUTH_SHIFT,8),*p[2:]] for p in pts]
for key in ('bands','floor','lanes','park','roof_other'):
    core[key]=[_move_ring(p) for p in core[key]]
for key in ('link','pav_fp','hall_top','rink_fp','roof_eave'):
    core[key]=_move_ring(core[key])
core['hall_ring']=[_move_ring(p) for p in core['hall_ring']]
core['hall_rings']=[[_move_ring(p) for p in ring] for ring in core['hall_rings']]
for key in ('roof_lines','roof_flashings','roof_hips','roof_seams'):
    core[key]=[_move3(line) for line in core[key]]
core['roof_ridge']=_move3(core['roof_ridge'])
for q in core['roof_patches']:q['pts']=_move3(q['pts'])
core['hall_frame']=[_move_ring(line) for line in core['hall_frame']]
core['food_tables']=_move_ring(core['food_tables'])
core['escalators']=[[a,b-SOUTH_SHIFT,c,d,e] for a,b,c,d,e in core['escalators']]
core['guards']=[[a,b,y-SOUTH_SHIFT,sd] for a,b,y,sd in core['guards']]
core['pav']['y']-=SOUTH_SHIFT
core['vault']['y']-=SOUTH_SHIFT
core['vault']['segs']=[[a,b,y-SOUTH_SHIFT] for a,b,y in core['vault']['segs']]
for key in ('AX','AXW','AXE','PS','PN'):core[key]-=SOUTH_SHIFT
HALL=affinity.translate(HALL,yoff=-SOUTH_SHIFT);PAV=HALL
HY-=SOUTH_SHIFT;AXW-=SOUTH_SHIFT;AXE-=SOUTH_SHIFT;AX-=SOUTH_SHIFT;PS-=SOUTH_SHIFT;PN-=SOUTH_SHIFT;E_S-=SOUTH_SHIFT
WINGS=[(a,b,y-SOUTH_SHIFT) for a,b,y in WINGS]
for name in ('bands_l','lanes_l','vaults'):
    globals()[name]=[affinity.translate(p,yoff=-SOUTH_SHIFT) for p in globals()[name]]
for name in ('band_u','void','lanes','park','other_roof','link','_fc'):
    globals()[name]=affinity.translate(globals()[name],yoff=-SOUTH_SHIFT)
guards=core['guards']
# Fit the existing southern single row into the reduced depth; preserve floor counts and x layout.
_south_names={'Rooftop Farm Building','Galleria South Mid-rise','Holladay Green Podium','Holladay Glass Tower','Holladay Brick Tower podium','Holladay Brick Tower','South Hall Entry','Hall South Flank (food hall + service)','Holladay PV Tower podium','Holladay PV Tower','SE Courtyard Block S','SE Courtyard Block N','SE Courtyard Block E','SE Terrace Building','SE Terrace Building (setback)'}
for r in B:
    poly=Polygon(r['fp'])
    if r['name'] in _south_names:
        upper=OLD_HY-PHY if r['name'] in ('South Hall Entry','Hall South Flank (food hall + service)') else OLD_PS if poly.centroid.x< RX-PHX else OLD_ES
        factor=(upper-SOUTH_SHIFT-556)/(upper-556)
        poly=affinity.scale(poly,xfact=1,yfact=factor,origin=(0,556))
    elif r['name']=='Hall North Flank (food hall + service)':
        poly=affinity.translate(poly,yoff=-SOUTH_SHIFT)
    elif r['name'].startswith('SE Dark Tower'):
        poly=poly.intersection(box(0,0,2000,AXE-14-0.5))
    r['fp']=C(orient(poly,1.0));r['inset']=C(big(poly.buffer(-0.45,join_style=2)))
# Corrected direction: retain the pre-undo north/south baseline, move entire core west.
WEST_SHIFT=24.0
_wring=lambda pts:[[round(x-WEST_SHIFT,8),y] for x,y in pts]
_w3=lambda pts:[[round(p[0]-WEST_SHIFT,8),*p[1:]] for p in pts]
for key in ('bands','floor','lanes','park','roof_other'):core[key]=[_wring(p) for p in core[key]]
for key in ('pav_fp','hall_top','rink_fp','roof_eave'):core[key]=_wring(core[key])
core['hall_ring']=[_wring(p) for p in core['hall_ring']]
core['hall_rings']=[[_wring(p) for p in ring] for ring in core['hall_rings']]
for key in ('roof_lines','roof_flashings','roof_hips','roof_seams'):core[key]=[_w3(p) for p in core[key]]
core['roof_ridge']=_w3(core['roof_ridge'])
for q in core['roof_patches']:q['pts']=_w3(q['pts'])
core['hall_frame']=[_wring(line) for line in core['hall_frame']]
core['food_tables']=_wring(core['food_tables'])
core['escalators']=[[a-WEST_SHIFT,b,c-WEST_SHIFT,d,e] for a,b,c,d,e in core['escalators']]
core['guards']=[[a-WEST_SHIFT,b-WEST_SHIFT,y,sd] for a,b,y,sd in core['guards']]
core['pav']['x']-=WEST_SHIFT;core['rink']['x']-=WEST_SHIFT
core['hall_arches']['xs']=[x-WEST_SHIFT for x in core['hall_arches']['xs']]
for key in ('RX','VX0','VX1'):core[key]-=WEST_SHIFT
for key in ('x0','x1'):core['vault'][key]-=WEST_SHIFT
core['vault']['segs']=[[a-WEST_SHIFT,b-WEST_SHIFT,y] for a,b,y in core['vault']['segs']]
RX-=WEST_SHIFT;VX0-=WEST_SHIFT;VX1-=WEST_SHIFT
WINGS=[(a-WEST_SHIFT,b-WEST_SHIFT,y) for a,b,y in WINGS]
PARK_X=(PARK_X[0]-WEST_SHIFT,PARK_X[1]-WEST_SHIFT)
HALL=affinity.translate(HALL,xoff=-WEST_SHIFT);PAV=HALL
for name in ('bands_l','lanes_l','vaults'):globals()[name]=[affinity.translate(p,xoff=-WEST_SHIFT) for p in globals()[name]]
for name in ('band_u','void','lanes','park','other_roof','_fc'):globals()[name]=affinity.translate(globals()[name],xoff=-WEST_SHIFT)
# Remove the extra parcel-facing southern edge of the WEST podium, not merely its planting.
PARCEL_STRIP=box(VX0,AXW-LE-BD_S,RX-PHX,AXW-LE-BD_S+10)
# Bound BOTH west terraces to their parcel edges; avoid the oversized independent northern slab.
NORTH_PARCEL_STRIP=box(VX0,AXW+LE+20,RX-PHX,AXW+LE+BD)
RELEASE=unary_union([PARCEL_STRIP,NORTH_PARCEL_STRIP])
core['parcel_release']=[C(p) for p in polys(RELEASE)]
bands_l=[p.difference(RELEASE) for p in bands_l]
band_u=unary_union(bands_l)
park=park.difference(RELEASE);other_roof=other_roof.difference(RELEASE)
core['bands']=[C(p) for p in polys(band_u)]
core['park']=[C(p) for p in polys(park)]
core['roof_other']=[C(p) for p in polys(other_roof)]
# Retain the east-tower attachment via a longer low-rise connector, not a moved tower.
link=box(VX1,AXE-14,1106,AXE+14);core['link']=C(link)
guards=core['guards']
_wcore=unary_union(bands_l+vaults+[HALL,link])
for r in B:
    poly=Polygon(r['fp'])
    if r['kind'] in ('flank','entry'):poly=affinity.translate(poly,xoff=-WEST_SHIFT)
    if poly.intersection(_wcore).area>0.01:poly=big(poly.difference(_wcore))
    assert poly is not None, 'West move removes entire building '+r['name']
    r['fp']=C(orient(poly,1.0));r['inset']=C(big(poly.buffer(-0.45,join_style=2)))
# Trim translated hall flanks against stationary frontage, rather than moving neighboring towers.
_static=unary_union([Polygon(r['fp']) for r in B if r['z0']==0 and r['kind'] not in ('flank','entry')])
for r in B:
    if r['kind'] in ('flank','entry'):
        poly=big(Polygon(r['fp']).difference(_static));assert poly is not None
        r['fp']=C(poly);r['inset']=C(big(poly.buffer(-0.45,join_style=2)))
# Smaller venue preserves west wall; shortened east edge joins translated galleria.
_old_v=(VXa,VXb,VYa,VYb)
VXa,VXb,VYa,VYb=646.0,VX0-10.0,614.0,664.0
_vpoly=lambda pts: [[round(VXa+(x-_old_v[0])*(VXb-VXa)/93,8),round(VYa+(y-_old_v[2])*(VYb-VYa)/80,8)] for x,y in pts]
venue['foot']=_vpoly(venue['foot'])
for q in venue['vols']:
    q['fp']=_vpoly(q['fp']);q['z0']*=0.75;q['h']*=0.75
venue['terrace']=_vpoly(venue['terrace']);venue['canopy']=_vpoly(venue['canopy'])
venue['terrace_z']*=0.75;venue['canopy_z']*=0.75
# Reference: separate stepped upper venue masses; continuous low base, not a tall black docking frame.
venue['vols'].append({'fp':bx(VXb,AXW-VH,VX0,AXW+VH),'z0':0.0,'h':6.75,'mat':'glassBox'})
venue['foot']=C(unary_union([Polygon(venue['foot']),box(VXb,AXW-VH,VX0,AXW+VH)]))
core['west_portal']={'x':VX0,'y':AXW,'half':VH,'spring':POD_H,'rise':10.0}
# Lower dark auditorium volume, brighter stacked timber boxes, terrace toward fountain.
for q in venue['vols']:
    if q['mat']=='darkPanel' and q['z0']>0:q['h']=25.5
    elif q['mat']=='copper':q['h']=min(q['h'],23.5)
core['placement_revision']={'south_shift_m':SOUTH_SHIFT,'west_shift_m':WEST_SHIFT,'undone_last_south_shift_m':12,'venue_old_m':[93,80],'venue_previous_m':[36,48],'venue_new_m':[58,50],'venue_upper_vault_gap_m':10,'parcel_strip_removed_m':[10,18],'southern_retail_depth_m':BD_S}
# ------------------------------------------------------------------ reference-led perimeter envelope articulation
# Civic geometry is frozen; tiers are nested in accepted parcel envelopes.
_cascade_names={'Galleria South Mid-rise','Commons PV Block','Hall-side North Block','NE Terrace Block','NW Court Block','Pyramid Court Building','SE Courtyard Block S','SE Terrace Building'}
# Existing stepped blocks already have crowns; preserve them rather than stacking duplicate floors.
_cascade_names-={'NW Court Block','SE Terrace Building'}
_perimeter_snapshot=list(B)
for r in _perimeter_snapshot:
    if r['kind'] in ('flank','entry','step'):continue
    fp=Polygon(r['fp']);x0,y0,x1,y1=fp.bounds
    # Keep the street wall; terrace upper floors back toward the outer street edge.
    if r['name'] in _cascade_names and r['fl']>=6:
        original_fl=r['fl'];original_h=r['h'];base_fl=max(3,original_fl-4)
        base_h=5+3.3*(base_fl-1)
        if r['z0']>0:base_h=r['z0']+3.3*base_fl
        r['fl']=base_fl;r['h']=round(base_h,2);r['roof']='meadow'
        inset=big(fp.buffer(-1.2,join_style=2))
        if inset is None:continue
        # More setback on the civic-facing edge than on the street-facing edge.
        depth=y1-y0;cut=min(4.0,depth*0.18)
        tier=big(inset.intersection(box(x0,y0+cut,x1,y1))) if y0>HY else big(inset.intersection(box(x0,y0,x1,y1-cut)))
        if tier is None:tier=inset
        first=add(r['name']+' terrace tier','step',tier,2,z0=r['h'],mat=r['mat'],roof='meadow',prog=tuple(r['prog'][k] for k in ('resi','off','ret')),base=False)
        crown=big(tier.buffer(-min(2.0,depth*0.08),join_style=2))
        if crown is not None:add(r['name']+' crown','step',crown,2,z0=first['h'],mat=r['mat'],roof='pv',prog=tuple(r['prog'][k] for k in ('resi','off','ret')),base=False)
    # Replace monolithic tower crowns with a faceted lower shaft and setback upper shaft.
    elif r['kind']=='tower' and r['fl']>=11:
        # Corner clipping preserves the parcel boundary and does not invade neighbors.
        cx,cy=fp.centroid.x,fp.centroid.y;ch=min(4.5,(x1-x0)*0.12,(y1-y0)*0.16)
        wedge=Polygon([(x0+ch,y0),(x1,y0),(x1,y1-ch),(x1-ch,y1),(x0,y1),(x0,y0+ch)])
        shaped=big(fp.intersection(wedge))
        if shaped is None:continue
        old_fl=r['fl'];old_h=r['h'];lower_fl=old_fl-4
        r['fp']=C(shaped);r['inset']=C(big(shaped.buffer(-0.45,join_style=2)))
        r['fl']=lower_fl;r['h']=round(old_h-13.2,2);r['roof']='meadow'
        upper=big(shaped.buffer(-1.5,join_style=2))
        if upper is not None:
            add(r['name']+' upper setback','step',upper,4,z0=r['h'],mat=r['mat'],roof='pv',prog=tuple(r['prog'][k] for k in ('resi','off','ret')),base=False)
# Fountain-side farm: L-shaped planted upper terrace, slender faceted corner mass.
_farm=next(r for r in B if r['name']=='Rooftop Farm Building')
_fpoly=Polygon(_farm['fp']);fx0,fy0,fx1,fy1=_fpoly.bounds
_farm['roof']='farm'
_elbow=big(_fpoly.buffer(-0.8,join_style=2).difference(box(fx0+28,fy0+3,fx1-3,fy1+1)))
if _elbow is not None:
    _ft=add('Fountain farm L-shaped terrace','step',_elbow,2,z0=_farm['h'],mat='brickBrown',roof='farm',prog=(0.65,0,0.35),base=False)
    _corner=big(_elbow.intersection(Polygon([(fx0+1,fy0+2),(fx0+19,fy0+1),(fx0+28,fy0+6),(fx0+28,fy1-1),(fx0+1,fy1-1)])))
    if _corner is not None:add('Fountain faceted corner crown','step',_corner,4,z0=_ft['h'],mat='stone',roof='pv',prog=(0.8,0,0.2),base=False)
# Low podium stitches only across genuine parcel gaps; never cross the protected lanes.
_perimeter_links=[('Halsey west podium stitch',box(692,738,698,765)),('Halsey central podium stitch',box(786,740,792,766)),('Northeast podium stitch',box(1056,711,1062,737)),('East backdrop podium stitch',box(1106,676,1142,706))]
_keep=unary_union([_wcore,Polygon(venue['foot']),Point(668,585).buffer(25),box(633,719.5,955,728.5),box(737.5,724,746.5,781),box(945.5,724,954.5,781)])
_existing=unary_union([Polygon(r['fp']) for r in B if r['z0']==0])
for name,p in _perimeter_links:
    clean=big(p.intersection(SITE.buffer(-2.1)).difference(_keep).difference(_existing))
    if clean is not None and clean.area>15:
        add(name,'podium',clean,3,mat='buff',roof='meadow',prog=(0.2,0.2,0.6))
        _existing=unary_union([_existing,clean])
# Tighten the park-facing perimeter toward the fountain, without moving the civic assembly.
PLAZA_FRAME_SHIFT=8.0
for r in B:
    poly=Polygon(r['fp'])
    if poly.centroid.y<600 and r['kind'] not in ('flank','entry'):
        poly=affinity.translate(poly,xoff=-PLAZA_FRAME_SHIFT)
        r['fp']=C(orient(poly,1.0));r['inset']=C(big(poly.buffer(-0.45,join_style=2)))
# Reference-led park-side rebuild: deep west farm block and integrated stepped parcels.
# Remove derivative sliver masses from the earlier compression, preserving civic flanks/entry.
_remove_prefix=('Rooftop Farm Building','Galleria South Mid-rise','Holladay Green Podium','Holladay Glass Tower','Holladay Brick Tower','Holladay PV Tower','SE Courtyard Block','SE Terrace Building','SE Dark Tower','Fountain farm','Fountain faceted')
B[:]=[r for r in B if not r['name'].startswith(_remove_prefix)]
_core_now=unary_union(bands_l+vaults+[HALL,link])
_fixed_ground=unary_union([Polygon(r['fp']) for r in B if r['z0']==0])
_blockers=unary_union([_core_now,_fixed_ground,Polygon(venue['foot']),Point(668,585).buffer(25.5)])
def parkbase(name,shape,fl,mat,roof='meadow'):
    clean=big(shape.intersection(SITE.buffer(-2.1)).difference(_blockers))
    assert clean is not None, name+' has no usable site footprint'
    return add(name,'podium',clean,fl,mat=mat,roof=roof,prog=(0.65,0,0.35))
# Broad faceted farm plate facing fountain, with progressively narrower agricultural terraces.
_f=parkbase('Parkside farm podium',Polygon([(695,559),(701,556),(790,556),(790,586),(718,589),(695,583)]),4,'brickBrown','farm')
_fp=Polygon(_f['fp'])
_t1=big(_fp.intersection(box(702,559,786,586)))
_a=add('Parkside farm terrace','step',_t1,2,z0=_f['h'],mat='brickBrown',roof='farm',prog=(0.7,0,0.3),base=False)
_t2=big(_t1.intersection(Polygon([(704,560),(740,560),(755,572),(755,584),(714,584),(704,576)])))
_b=add('Fountain faceted midrise','step',_t2,3,z0=_a['h'],mat='stone',roof='meadow',base=False)
_c=big(_t2.buffer(-2,join_style=2))
add('Fountain midrise crown','step',_c,2,z0=_b['h'],mat='stone',roof='pv',base=False)
# Solid park streetwall with wider footprint plates, rather than alternating needle towers.
_h=parkbase('Parkside west residential base',box(798,556,859,589),3,'buff')
_hfp=Polygon(_h['fp'])
_hs=big(_hfp.buffer(-1.2,join_style=2))
_hlo=add('Parkside west residential slab','tower',_hs,8,z0=_h['h'],mat='terracotta',roof='meadow',base=False)
add('Parkside west residential crown','step',big(_hs.buffer(-2.2,join_style=2)),3,z0=_hlo['h'],mat='terracotta',roof='pv',base=False)
# Right of civic entry: shared streetwall base, terrace floors project over attached retail roof,
# outside the occupied roof-commons extent. Lower podium is not duplicated under those floors.
_e=parkbase('Parkside east residential base',box(941,556,986,573),3,'stone')
_ep=Polygon(_e['fp']);_es=big(_ep.buffer(-1,join_style=2))
_el=add('Parkside east residential slab','tower',_es,10,z0=_e['h'],mat='stone',roof='meadow',base=False)
add('Parkside east residential crown','step',big(_es.buffer(-1.5,join_style=2)),3,z0=_el['h'],mat='stone',roof='pv',base=False)
# Courtyard parcel: genuinely linked U-base and two broad roof terraces.
_u=parkbase('Parkside courtyard podium',unary_union([box(994,556,1054,563),box(994,563,1005,573),box(1043,563,1054,573)]),4,'terracotta')
for name,shape in [('Parkside courtyard west wing',box(995,557,1004,572)),('Parkside courtyard east wing',box(1044,557,1053,572))]:
    q=big(Polygon(_u['fp']).intersection(shape))
    if q is not None:add(name,'step',q,3,z0=_u['h'],mat='terracotta',roof='meadow',base=False)
_s=parkbase('Parkside southeast terrace base',box(1060,556,1090,573),4,'buff')
# A full-depth upper floorplate sits over the existing retail plinth, outside park's eastern edge.
_sp=Polygon([(1062,558),(1088,558),(1088,588),(1082,594),(1062,594)])
# Fix: the slab used to float at 16.5 m over a 1.6 m void and 226 m2 of open ground (x1076-1087.5, y573-594).
# The base now extends under that overhang to the same height, and the slab bears directly on base + core band.
_sx=big(box(1076,573,1087.5,594).difference(unary_union([Polygon(q['fp']) for q in B if q['z0']==0])).difference(_blockers))
if _sx is not None:
    _sxr=add('Parkside southeast terrace base north bay','podium',_sx,4,mat='buff',roof='meadow',prog=(0.65,0,0.35))
_sl=add('Parkside southeast broad slab','tower',_sp,8,z0=_s['h'],mat='stone',roof='meadow',base=False)
# Where the slab overhangs the core retail band (roof POD_H=14.0) a 0.9 m transfer deck closes the gap to the 14.9 m base roof.
_tdk=big(_sp.intersection(unary_union([Polygon(x) for x in bands_l])) if 'bands_l' in globals() else None)
if _tdk is not None:
    _tr=add('Parkside southeast transfer deck','step',_tdk,1,z0=POD_H,mat='buff',roof='meadow',base=False); _tr['h']=_s['h']; _tr['fl']=0
add('Parkside southeast crown','step',big(_sp.buffer(-2,join_style=2)),3,z0=_sl['h'],mat='stone',roof='pv',base=False)
_d=parkbase('Parkside curved-corner podium',Polygon([(1096,558),(1132,558),(1132,591),(1115,596),(1096,596)]),3,'charcoal')
_dp=big(Polygon(_d['fp']).buffer(-1.8,join_style=2))
_dl=add('Parkside curved-corner tower','tower',_dp,15,z0=_d['h'],mat='darkglass',roof='meadow',base=False)
add('Parkside curved-corner crown','step',big(_dp.buffer(-1.8,join_style=2)),4,z0=_dl['h'],mat='darkglass',roof='pv',base=False)
# Close all residual park-side base gaps with real shared-wall extensions.
_attachment_shapes={
 'Parkside farm podium':box(714,580,790,599),
 'Parkside west residential base':box(798,578,859,599),
 'Parkside curved-corner podium':box(1096,590,1106,599),
}
_attachment_core=unary_union(bands_l+[HALL,link])
for r in B:
    if r['name'] in _attachment_shapes:
        other=unary_union([Polygon(q['fp']) for q in B if q['z0']==0 and q['id']!=r['id']])
        ext=_attachment_shapes[r['name']].difference(_attachment_core).difference(other)
        poly=big(unary_union([Polygon(r['fp']),ext]))
        assert poly is not None
        r['fp']=C(poly);r['inset']=C(big(poly.buffer(-0.45,join_style=2)))
core['park_side_attachments']=[]
for r in B:
    if r['name'].startswith('Parkside') and r['z0']==0:
        p=Polygon(r['fp']);shared=p.boundary.intersection(_attachment_core.boundary).length
        assert p.distance(_attachment_core)<0.001 and shared>=5, (r['name'],shared)
        core['park_side_attachments'].append({'name':r['name'],'gap_m':p.distance(_attachment_core),'shared_wall_m':round(shared,3)})
# Frame the existing crossing with intact building returns, not a large diagonal void.
for name,shape in [('Parkside west residential base',box(859,556,863,599)),('South Hall Entry',box(871,557.75,883,577.39))]:
    r=next(q for q in B if q['name']==name)
    obstacles=unary_union([_attachment_core]+[Polygon(q['fp']) for q in B if q['z0']==0 and q['id']!=r['id']])
    p=big(unary_union([Polygon(r['fp']),shape.difference(obstacles)]))
    r['fp']=C(p);r['inset']=C(big(p.buffer(-0.45,join_style=2)))
# Taller continuous returns frame the entrance, supported by their existing bases.
for name,shape,mat in [('Entrance west residential return',box(851,558,863,577),'terracotta'),('Entrance east residential return',box(871,558,883,577),'brickRed')]:
    parent=next(r for r in B if r['name']==('Parkside west residential base' if 'west' in name else 'South Hall Entry'))
    p=big(shape.intersection(Polygon(parent['fp'])))
    blocked=unary_union([Polygon(q['fp']) for q in B if q['z0']>=parent['h']-0.05 and q['h']>parent['h']])
    p=big(p.difference(blocked))
    if p is not None:
        lo=add(name,'tower',p,7,z0=parent['h'],mat=mat,roof='meadow',base=False)
        top=big(p.buffer(-1.0,join_style=2))
        if top is not None:add(name+' crown','step',top,2,z0=lo['h'],mat=mat,roof='pv',base=False)
# A distinct flat-fronted lobby terminates the slot; main civic roof remains behind it.
core['entrance_lobby']={'x':867,'y0':595,'y1':599,'half':4,'height':18,'levels':[5,9.5],'stair_radius':1.45}
# Protected open-to-sky entrance: retained park crossing x=867, straight slot between intact returns.
ENTRANCE_AXIS=LineString([(867,550.3),(867,595)])
BREEZEWAY=ENTRANCE_AXIS.buffer(4.0,cap_style=2,join_style=2).intersection(SITE)
# The destination is the hall facade; no corridor cut through the hall or accepted skylights.
BREEZEWAY=BREEZEWAY.difference(_attachment_core)
# Millimetre safety margin absorbs centimetre serialization at angled passage edges.
_BREEZEWAY_CUT=BREEZEWAY.buffer(0.02,join_style=2)
_revised=[]
for r in B:
    p=Polygon(r['fp']);cut=p.difference(_BREEZEWAY_CUT)
    pieces=polys(cut)
    if not pieces:continue
    for i,piece in enumerate(pieces):
        q=dict(r);q['fp']=C(piece);q['inset']=C(big(piece.buffer(-0.45,join_style=2)))
        if i:q['name']+=' entrance-side return'
        _revised.append(q)
B[:]=_revised
core['entrance_breezeway']={'axis':[[867,550.3],[867,595]],'width_m':8,'fp':[C(p) for p in polys(BREEZEWAY)],'open_to_sky':True,'crosswalk_x':867}
for r in B:assert Polygon(r['fp']).intersection(BREEZEWAY).area<0.01,r['name']
# Ground footprints plus elevated podium-sharing floorplates have distinct collision semantics.
core['park_side_revision']={'method':'integrated deep farm / streetwall / podium-sharing east slab','farm_depth_m':33,'civic_geometry_unchanged':True}
# Fountain farm architectural detail, clipped to actual exposed terraces.
_fountain_names=('Parkside farm','Fountain faceted','Fountain midrise')
FD={'beds':[],'posts':[],'beams':[],'planters':[],'canopies':[],'rails':[]}
for r in B:
    if not r['name'].startswith(_fountain_names):continue
    fp=Polygon(r['fp']);r['fountain_detail']=True
    above=unary_union([Polygon(q['fp']).buffer(0.6) for q in B if q['z0']>=r['h']-0.05 and q['h']>r['h']+0.1])
    exposed=fp.buffer(-0.8,join_style=2).difference(above)
    for pp in polys(exposed):
        x0,y0,x1,y1=pp.bounds
        for yy in [y0+1+2.4*k for k in range(max(0,int((y1-y0)/2.4)))]:
            cut=LineString([(x0+0.7,yy),(x1-0.7,yy)]).intersection(pp.buffer(-0.6))
            for seg in ([cut] if cut.geom_type=='LineString' else getattr(cut,'geoms',[])):
                if seg.geom_type=='LineString' and seg.length>2:FD['beds'].append([list(seg.coords[0]),list(seg.coords[-1]),r['h']+0.15])
        # Open trellis only where the complete bay fits; no blanket greenhouse lid.
        for xx in [x0+1+6*k for k in range(max(0,int((x1-x0)/6)))]:
            for yy in [y0+1+4*k for k in range(max(0,int((y1-y0)/4)))]:
                if pp.contains(box(xx,yy,xx+5,yy+3)):
                    for a,b in ((xx,yy),(xx+5,yy),(xx,yy+3),(xx+5,yy+3)):FD['posts'].append([a,b,r['h']+0.12])
                    for a,b in (((xx,yy),(xx+5,yy)),((xx,yy+3),(xx+5,yy+3)),((xx,yy),(xx,yy+3)),((xx+5,yy),(xx+5,yy+3))):FD['beams'].append([a,b,r['h']+2.8])
    # Facade planter boxes on exposed plaza-side faces, not generic cantilever balconies.
    pts=list(orient(fp,1).exterior.coords)
    for a,b in zip(pts,pts[1:]):
        dx,dy=b[0]-a[0],b[1]-a[1];L=math.hypot(dx,dy)
        if L<3:continue
        nx,ny=dy/L,-dx/L
        # only fountain-facing and south street-facing edges
        if nx>-0.15 and ny>-0.2:continue
        ang=math.atan2(dy,dx)
        for t in [2+4*k for k in range(max(0,int((L-2)/4)))]:
            px,py=a[0]+dx*t/L+nx*0.28,a[1]+dy*t/L+ny*0.28
            if r['z0']==0:FD['canopies'].append([px+nx*0.45,py+ny*0.45,4.3,ang])
            for z in [max(5.3,r['z0']+0.5)+3.3*k for k in range(r['fl'])]:
                if z<r['h']-0.7:FD['planters'].append([px,py,z,ang])
LY_FOUNTAIN_DETAIL=FD
# North/east reference refinement: retain parcel street walls, reshape upper slabs and crowns.
_NE_NAMES=('NW Dark Glass Tower','NW Court Block','Halsey White Tower','Commons Brown Bar','Commons PV Block','Halsey Green Bar','Hall-side North Block','Pyramid Court Building','NE Terrace Block','East Tower N','Axis Terminus Tower')
for r in B:
    if not r['name'].startswith(_NE_NAMES):continue
    p=Polygon(r['fp']);x0,y0,x1,y1=p.bounds
    if r['name'].startswith(('Axis Terminus Tower','East Tower N')) and r['z0']>0:
        # Rounded contour, nested in original accepted shaft; no ground parcel encroachment.
        rad=min(3.0,(x1-x0)/8,(y1-y0)/8)
        shaped=big(p.buffer(-rad,join_style=1).buffer(rad,resolution=6,join_style=1).intersection(p))
    elif r['z0']>0 and r['name'].startswith(('Commons PV Block','Hall-side North Block','NE Terrace Block','NW Court Block')):
        # Offset upper blocks rather than identical concentric inset rectangles.
        d=min(3.5,(y1-y0)*0.16)
        shaped=big(p.intersection(box(x0+(1.5 if 'crown' in r['name'] else 0),y0+d,x1,y1)))
    else:shaped=p
    if shaped is not None:
        r['fp']=C(shaped);r['inset']=C(big(shaped.buffer(-0.45,join_style=2)))
    r['north_east_detail']=True
# Make low Halsey bars layered garden-front street walls, not uniformly flat rectangles.
for r in list(B):
    if r['name'] in ('Commons Brown Bar','Halsey Green Bar W','Halsey Green Bar C','Halsey Green Bar E'):
        p=Polygon(r['fp']);x0,y0,x1,y1=p.bounds
        old_h=r['h'];r['h']=round(old_h-3.3,2);r['fl']-=1;r['roof']='meadow'
        upper=big(p.buffer(-0.8,join_style=2).intersection(box(x0,y0+min(2.5,(y1-y0)*0.16),x1,y1)))
        if upper is not None:
            q=add(r['name']+' garden crown','step',upper,1,z0=r['h'],mat=r['mat'],roof='pv',prog=tuple(r['prog'][k] for k in ('resi','off','ret')),base=False)
            q['north_east_detail']=True
# Bring the northern parcel assemblies inward; move all nested tiers together.
NORTH_SHIFT=48.0
NE_SHIFT=36.0
for r in B:
    if not r.get('north_east_detail') and r['name'] not in ('Halsey west podium stitch','Halsey central podium stitch','Northeast podium stitch'):continue
    if r['name'].startswith('Axis Terminus'):continue
    dy=NE_SHIFT if r['name'].startswith(('Pyramid Court','NE Terrace','East Tower N','Halsey Green Bar E','Northeast podium')) else NORTH_SHIFT
    p=affinity.translate(Polygon(r['fp']),yoff=-dy)
    r['fp']=C(p);r['inset']=C(big(p.buffer(-0.45,join_style=2)))
# Only the rotated-axis parcel attaches to the retail north edge; others remain separate.
_rot=next(r for r in B if r['name']=='Pyramid Court Building')
_rotp=Polygon(_rot['fp']);_northcore=unary_union(bands_l+[HALL,link])
_others=unary_union([Polygon(r['fp']) for r in B if r['z0']==0 and r['id']!=_rot['id']])
_join=box(980,661,992,690).difference(_northcore).difference(_others)
_rp=big(unary_union([_rotp,_join]));_rot['fp']=C(_rp);_rot['inset']=C(big(_rp.buffer(-0.45,join_style=2)))
for r in B:
    if r['z0']==0 and (r.get('north_east_detail') or 'podium stitch' in r['name']) and not r['name'].startswith('Axis Terminus'):
        p=Polygon(r['fp']);gap=p.distance(_northcore)
        if r['name']=='Pyramid Court Building':assert gap<0.001 and p.boundary.intersection(_northcore.boundary).length>5
        else:assert gap>=4,(r['name'],gap)
# Restore Halsey frontage via deep courtyard parcels, not another blanket translation.
NORTH_COURTS=[]
_depth_parcels=[('NW Court Block',698,734,722,770,'brickBrown'),('Halsey Green Bar W',806,880,722,770,'buff'),('Halsey Green Bar C',886,940,722,770,'brickRed'),('Halsey Green Bar E',1000,1044,734,770,'buff')]
for parent,x0,x1,front,back,mat in _depth_parcels:
    base=next(r for r in B if r['name']==parent)
    # Open court remains within a U envelope; two connecting arms plus street-facing rear bar.
    wing=min(10,(x1-x0)*0.22)
    env=unary_union([box(x0,front,x0+wing,back),box(x0,back-12,x1,back)])  # L return keeps courtyard open; renderer stores exterior rings only
    obstacles=unary_union([Polygon(r['fp']) for r in B if r['z0']==0 and r['id']!=base['id']]+[box(737.5,676,746.5,781),box(945.5,676,954.5,781)])
    basep=big(unary_union([Polygon(base['fp']),env.difference(obstacles)]))
    assert basep is not None and basep.geom_type=='Polygon'
    base['fp']=C(basep);base['inset']=C(big(basep.buffer(-0.45,join_style=2)))
    # Mid-rise Halsey bar sits on the extended base, stepped back at its crown.
    rear=big(box(x0+1,back-11,x1-1,back-1).intersection(basep))
    if rear is not None:
        q=add(parent+' Halsey rear bar','step',rear,3,z0=base['h'],mat=mat,roof='meadow',prog=(0.8,0.1,0.1),base=False);q['north_east_detail']=True
        crown=big(rear.buffer(-1.0,join_style=2))
        if crown is not None:
            q2=add(parent+' Halsey crown','step',crown,2,z0=q['h'],mat=mat,roof='pv',prog=(0.8,0.1,0.1),base=False);q2['north_east_detail']=True
    court=box(x0+wing+1,front+1,x1-wing-1,back-13)
    NORTH_COURTS.append(C(court))
# Narrow L returns reconnect the two corner-tower parcels to the northern street line.
for parent in ('NW Dark Glass Tower podium','Halsey White Tower podium'):
    r=next(q for q in B if q['name']==parent);p=Polygon(r['fp']);x0,y0,x1,y1=p.bounds
    env=unary_union([box(x0,y1-1,x0+10,770),box(x0,758,x1,770)])
    other=unary_union([Polygon(q['fp']) for q in B if q['z0']==0 and q['id']!=r['id']])
    p=big(unary_union([p,env.difference(other)]));r['fp']=C(p);r['inset']=C(big(p.buffer(-0.45,join_style=2)))
    rear=big(box(x0+1,759,x1-1,769).intersection(p))
    if rear is not None:
        q=add(parent+' streetwall return','step',rear,4,z0=r['h'],mat=r['mat'],roof='meadow',prog=(0.8,0,0.2),base=False);q['north_east_detail']=True
# Close construction seams between front slabs and rear courtyard parcels.
SEAM_LINKS=[]
for parent,shape in [('Halsey Green Bar W',box(842,706,880,710)),('Halsey Green Bar C',box(886,706,940,710)),('Halsey Green Bar E',box(1000,706,1044,714))]:
    r=next(q for q in B if q['name']==parent)
    other=unary_union([Polygon(q['fp']) for q in B if q['z0']==0 and q['id']!=r['id']])
    clean=shape.difference(other)
    p=big(unary_union([Polygon(r['fp']),clean]));assert p is not None
    r['fp']=C(p);r['inset']=C(big(p.buffer(-0.45,join_style=2)))
    SEAM_LINKS.append(parent)
# Separate right returns preserve courtyard holes in the exterior-ring renderer.
for parent,x0,x1,front,back,mat in _depth_parcels:
    wing=min(10,(x1-x0)*0.22)
    shape=box(x1-wing,front,x1,back-12)
    other=unary_union([Polygon(q['fp']) for q in B if q['z0']==0])
    clean=big(shape.difference(other))
    if clean is not None and clean.area>1:
        par=next(q for q in B if q['name']==parent)
        q=add(parent+' courtyard side return','podium',clean,par['fl'],mat=mat,roof='meadow',prog=(0.7,0.1,0.2));q['north_east_detail']=True
# Assert actual shared edges between paired front/rear masses, not only distance zero.
PARCEL_ADJACENCY=[]
for a,b in [('Commons PV Block','Halsey Green Bar W'),('Hall-side North Block','Halsey Green Bar C'),('NE Terrace Block','Halsey Green Bar E')]:
    pa=Polygon(next(q['fp'] for q in B if q['name']==a));pb=Polygon(next(q['fp'] for q in B if q['name']==b))
    length=pa.boundary.intersection(pb.boundary).length
    assert pa.distance(pb)<0.001 and length>=5,(a,b,length)
    PARCEL_ADJACENCY.append({'front':a,'rear':b,'shared_wall_m':round(length,3)})
# Tighten northern civic frontage without shifting accepted tower shafts or streetwall crowns.
for name,south in [('NW Court Block',674),('Halsey White Tower podium',674),('Commons Brown Bar',674),('Commons PV Block',674),('Hall-side North Block',680),('Halsey west podium stitch',674),('Halsey central podium stitch',674)]:
    r=next(q for q in B if q['name']==name);p=Polygon(r['fp']);x0,y0,x1,y1=p.bounds
    ext=box(x0,south,x1,min(y0+1,707))
    # Explicit positive separation from civic envelopes, and exclusion of other parcels.
    others=unary_union([Polygon(q['fp']) for q in B if q['z0']==0 and q['id']!=r['id']])
    ext=ext.difference(_northcore.buffer(5,join_style=2)).difference(others)
    p=big(unary_union([p,ext]));assert p is not None
    r['fp']=C(p);r['inset']=C(big(p.buffer(-0.45,join_style=2)))
# Civic-facing shoulder terraces: split the front strip from tall bases, keep shafts fixed.
for name,depth in [('NW Court Block',7),('Commons Brown Bar',6),('Commons PV Block',6),('Hall-side North Block',3)]:
    r=next(q for q in B if q['name']==name);p=Polygon(r['fp']);x0,y0,x1,y1=p.bounds
    front=big(p.intersection(box(x0,y0,x1,y0+depth)))
    if name=='Commons PV Block' and front is not None:
        reserved=LineString([(852,667),(855,676.5),(935,676.5)]).buffer(3.2,cap_style=2,join_style=2)
        front=big(front.difference(reserved))
    rear=big(p.difference(box(x0,y0,x1,y0+depth)))
    if front is None or rear is None:continue
    r['fp']=C(rear);r['inset']=C(big(rear.buffer(-0.45,join_style=2)))
    q=add(name+' civic shoulder','podium',front,2,mat=r['mat'],roof='meadow',prog=(0.2,0.1,0.7));q['north_east_detail']=True
# East cluster: continuous low podium bridge between northeast tower and terminus backdrop.
_eastbridge=box(1098,676,1106,696)
_used=unary_union([Polygon(q['fp']) for q in B if q['z0']==0])
_clean=big(_eastbridge.difference(_used))
if _clean is not None:
    q=add('East cluster low podium connector','podium',_clean,3,mat='buff',roof='meadow',prog=(0.1,0.2,0.7));q['north_east_detail']=True
# Unequal crown setbacks follow parcel-specific scale rather than a repeated roof stamp.
for r in B:
    if 'Halsey crown' not in r['name']:continue
    p=Polygon(r['fp']);x0,y0,x1,y1=p.bounds
    inset=2.2 if r['name'].startswith('Halsey Green Bar W') else 1.2
    clipped=big(p.intersection(box(x0+inset,y0,x1-inset,y1-0.6)))
    if clipped is not None:r['fp']=C(clipped);r['inset']=C(big(clipped.buffer(-0.45,join_style=2)))
# North parcel assembly depth limited to 1.5x the 43 m main south-side depth.
NORTH_TARGET_DEPTH=64.5
# Preserve prior compression for smaller assemblies; cap the broad ones to the proportion.
_NORTH_GROUND=[r for r in B if r['z0']==0 and (r.get('north_east_detail') or 'podium stitch' in r['name']) and not r['name'].startswith(('Axis Terminus','East backdrop','East cluster'))]
_ng_union=unary_union([Polygon(r['fp']) for r in _NORTH_GROUND])
_ng_parts=polys(_ng_union)
NORTH_DEPTH_REVISION=[]
_north_pivots={}
for r in B:
    if not (r.get('north_east_detail') or 'podium stitch' in r['name']) or r['name'].startswith(('Axis Terminus','East backdrop','East cluster')):continue
    p=Polygon(r['fp'])
    component=max(_ng_parts,key=lambda g:g.intersection(p).area)
    pivot=component.bounds[1]
    _north_pivots[r['name']]=pivot
    factor=min(0.75,NORTH_TARGET_DEPTH/(component.bounds[3]-pivot))
    q=affinity.scale(p,xfact=1,yfact=factor,origin=(0,pivot))
    r['fp']=C(q);r['inset']=C(big(q.buffer(-0.45,join_style=2)))
    NORTH_DEPTH_REVISION.append({'name':r['name'],'pivot_y':pivot,'old_depth_m':p.bounds[3]-p.bounds[1],'new_depth_m':q.bounds[3]-q.bounds[1]})
for i,(parent,*_) in enumerate(_depth_parcels):
    p=Polygon(NORTH_COURTS[i]);pivot=_north_pivots[parent]
    component=next(g for g in _ng_parts if g.intersection(Polygon(next(r['fp'] for r in _NORTH_GROUND if r['name']==parent))).area>1)
    factor=min(0.75,NORTH_TARGET_DEPTH/(component.bounds[3]-pivot))
    NORTH_COURTS[i]=C(affinity.scale(p,xfact=1,yfact=factor,origin=(0,pivot)))
# Preserve precise diagonal parcel boundary after assembly-specific compression.
_rp=Polygon(next(r['fp'] for r in B if r['name']=='Pyramid Court Building'))
_he=next(r for r in B if r['name']=='Halsey Green Bar E')
_hp=big(Polygon(_he['fp']).difference(_rp));_he['fp']=C(_hp);_he['inset']=C(big(_hp.buffer(-0.45,join_style=2)))
# The service diversion stays fixed: recut its shoulder notch after depth scaling.
_reserved=LineString([(852,667),(855,676.5),(935,676.5)]).buffer(3.2,cap_style=2,join_style=2)
for _sh in B:
    if _sh['name'].startswith('Commons PV Block'):
        _sp=big(Polygon(_sh['fp']).difference(_reserved));assert _sp is not None
        _sh['fp']=C(_sp);_sh['inset']=C(big(_sp.buffer(-0.45,join_style=2)))
# Close Halsey frontage by translating reduced north parcel assemblies, not shifting mapped roads.
HALSEY_FRONTAGE_SHIFTS={}
for r in B:
    if not (r.get('north_east_detail') or 'podium stitch' in r['name']):continue
    if r['name'].startswith(('Axis Terminus','East Tower','East cluster','East backdrop','NE Terrace','Pyramid Court','Northeast podium')):continue
    if r['name'].startswith('Halsey Green Bar E'):dy=35.5
    elif r['name'].startswith(('Hall-side','Halsey Green Bar C')):dy=25.5
    else:dy=31.5
    p=affinity.translate(Polygon(r['fp']),yoff=dy)
    r['fp']=C(p);r['inset']=C(big(p.buffer(-0.45,join_style=2)))
    HALSEY_FRONTAGE_SHIFTS[r['name']]=dy
for i,(parent,*_) in enumerate(_depth_parcels):
    NORTH_COURTS[i]=C(affinity.translate(Polygon(NORTH_COURTS[i]),yoff=HALSEY_FRONTAGE_SHIFTS[parent]))
# Western Commons spur aligns with the actual 10th/Halsey node; local parcel edge accommodates bend.
WEST_10TH_ROUTE=[[712.4,677],[712.4,781.13]]
_west_corridor=LineString(WEST_10TH_ROUTE).buffer(5.8,cap_style=2,join_style=2)
_street_returns=[]
for r in list(B):
    p=Polygon(r['fp'])
    if p.intersection(_west_corridor).area>0.01:
        pieces=polys(p.difference(_west_corridor));assert pieces,r['name']
        for i,cut in enumerate(sorted(pieces,key=lambda p:p.area,reverse=True)):
            q=r if i==0 else dict(r)
            q['fp']=C(cut);q['inset']=C(big(cut.buffer(-0.45,join_style=2)))
            if i:q['name']+=' 10th-side return';q['id']=len(B)+len(_street_returns);_street_returns.append(q)
B.extend(_street_returns)
# Authorized southeast street opening through the eastern retail wing.
SE_STREET_X=1093.0
SE_OPENING=box(SE_STREET_X-5.5,542,SE_STREET_X+5.5,713)
bands_l=[q for p in bands_l for q in polys(p.difference(SE_OPENING))]
band_u=unary_union(bands_l);core['bands']=[C(p) for p in polys(band_u)]
park=park.difference(SE_OPENING);other_roof=other_roof.difference(SE_OPENING)
core['park']=[C(p) for p in polys(park)];core['roof_other']=[C(p) for p in polys(other_roof)]
link=big(link.difference(SE_OPENING));core['link']=C(link)
_newB=[]
for r in B:
    for i,p in enumerate(polys(Polygon(r['fp']).difference(SE_OPENING))):
        q=dict(r);q['fp']=C(p);q['inset']=C(big(p.buffer(-0.45,join_style=2)))
        if i:q['name']+=' southeast street return'
        _newB.append(q)
B[:]=_newB
# Reference galleria cross-section (ref_04 close-up): vault | ~13 m paved promenade with market canopies | 2-storey
# liner with intensive green roof. Built entirely on the existing 14 m band roof: no footprint or attachment change.
PROM_W=13.0; LINER_FL=2; LINER_H=7.4
_prom=[]
for x0,x1,ax in WINGS:
    _prom+= [box(x0,ax-VH-PROM_W,x1,ax-VH), box(x0,ax+VH,x1,ax+VH+PROM_W)]
_prom_u=unary_union(_prom).intersection(unary_union(bands_l))
_liner_u=unary_union(bands_l).difference(_prom_u.buffer(0.01)).difference(HALL.buffer(2.0))
LINERS=[C(orient(p,1.0)) for p in polys(_liner_u.buffer(-0.4,join_style=2)) if p.area>120]
PROMENADE=[C(orient(p,1.0)) for p in polys(_prom_u.difference(HALL.buffer(1.5))) if p.area>40]
core['liners']={'fp':LINERS,'z0':POD_H,'h':POD_H+LINER_H,'fl':LINER_FL}
core['promenade']=PROMENADE
_liner_shape=unary_union([Polygon(p) for p in LINERS]).buffer(0.8)
# User: Multnomah connector turned too late (jog at y 712). It now meets the straight Commons shared access at y 677,
# so the NE Terrace / East Tower N assembly steps north 11 m (all tiers together) to clear the extended route corridor.
ROUTE_SHIFT_Y=11.0
ROUTE_SHIFTED=('East Tower N','NE Terrace Block','Northeast podium stitch')
for r in B:
    if r['name'].startswith(ROUTE_SHIFTED):
        p=affinity.translate(Polygon(r['fp']),yoff=ROUTE_SHIFT_Y); r['fp']=C(p); r['inset']=C(big(p.buffer(-0.45,join_style=2)))
# Terrace kit clipped to exposed roof plates; no random greenery inside upper floorplates.
ND={'beds':[],'rails':[],'pergola_posts':[],'pergola_beams':[],'facade_planters':[]}
for r in B:
    if not r.get('north_east_detail'):continue
    p=Polygon(r['fp']);upper=unary_union([Polygon(q['fp']).buffer(0.6) for q in B if q['z0']>=r['h']-0.05 and q['h']>r['h']+0.1])
    exposed=p.buffer(-0.65,join_style=2).difference(upper)
    if r['roof']=='meadow':
        for pp in polys(exposed):
            x0,y0,x1,y1=pp.bounds
            for yy in [y0+1.1+3*k for k in range(max(0,int((y1-y0)/3)))]:
                cut=LineString([(x0+0.8,yy),(x1-0.8,yy)]).intersection(pp.buffer(-0.5))
                for seg in ([cut] if cut.geom_type=='LineString' else getattr(cut,'geoms',[])):
                    if seg.geom_type=='LineString' and seg.length>2:ND['beds'].append([list(seg.coords[0]),list(seg.coords[-1]),r['h']+0.15])
            if pp.area>70:
                ctr=pp.representative_point();xx,yy=ctr.x-2.5,ctr.y-1.5
                if pp.contains(box(xx,yy,xx+5,yy+3)):
                    for a,b in ((xx,yy),(xx+5,yy),(xx,yy+3),(xx+5,yy+3)):ND['pergola_posts'].append([a,b,r['h']+0.1])
                    for a,b in (((xx,yy),(xx+5,yy)),((xx,yy+3),(xx+5,yy+3)),((xx,yy),(xx,yy+3)),((xx+5,yy),(xx+5,yy+3))):ND['pergola_beams'].append([a,b,r['h']+2.7])
    # Planters follow inward-facing wall normals, leaving perimeter access clear.
    pts=list(orient(p,1).exterior.coords)
    for a,b in zip(pts,pts[1:]):
        dx,dy=b[0]-a[0],b[1]-a[1];L=math.hypot(dx,dy)
        if L<7:continue
        nx,ny=dy/L,-dx/L
        if ny>-0.3 and nx>-0.3:continue
        for t in [3+6*k for k in range(max(0,int((L-3)/6)))]:
            for z in [max(5.4,r['z0']+0.5)+6.6*k for k in range(max(1,r['fl']//2))]:
                if z<r['h']-1:ND['facade_planters'].append([a[0]+dx*t/L+nx*0.25,a[1]+dy*t/L+ny*0.25,z,math.atan2(dy,dx)])
# ------------------------------------------------------------------ reference height redistribution (ref_04 block inventory)
# Target total floors per ground-rooted stack. Reference reads as a mid-rise field (9-16 fl) with an 18-floor cap;
# footprints are untouched, every tier of a stack is rescaled together and snapped to whole 3.3 m floors.
REF_TARGET_FL={
 'NW Dark Glass Tower podium':16,'Halsey White Tower podium':14,'NW Court Block':12,'NW Court Block 10th-side return':11,
 'Halsey Green Bar W':13,'Commons Brown Bar':10,'Commons PV Block':11,'Halsey Green Bar C':12,'Hall-side North Block':10,
 'Halsey Green Bar E':12,'Pyramid Court Building':10,'NE Terrace Block':11,'East Tower N podium':18,'Axis Terminus Tower podium':18,
 'Parkside west residential base':12,'Parkside farm podium':9,'Parkside east residential base':14,'Parkside courtyard podium':8,
 'Parkside southeast terrace base':12,'Parkside curved-corner podium':16,
}
REF_CAP_FL=18
_grounds=[r for r in B if r['z0']==0]
_tiers=[r for r in B if r['z0']>0]
_gp={id(r):Polygon(r['fp']) for r in B}
def _parent(t):
    cands=[q for q in B if q is not t and abs(q['h']-t['z0'])<0.12 and _gp[id(q)].intersects(_gp[id(t)])]
    if not cands: cands=[q for q in _grounds if _gp[id(q)].intersects(_gp[id(t)])]
    return max(cands,key=lambda q:_gp[id(q)].intersection(_gp[id(t)]).area) if cands else None
_root={}
def _rootof(r,depth=0):
    if r['z0']==0 or depth>20: return r
    if id(r) in _root: return _root[id(r)]
    p=_parent(r); rr=_rootof(p,depth+1) if p is not None else r
    _root[id(r)]=rr; return rr
_stacks={}
for r in B: _stacks.setdefault(id(_rootof(r)),[]).append(r)
HEIGHT_REVISION=[]
_maps={}
for rid,members in _stacks.items():
    g=next(m for m in members if m['z0']==0) if any(m['z0']==0 for m in members) else members[0]
    top=max(m['h'] for m in members); fl0=round((top-5)/3.3)+1
    tgt=REF_TARGET_FL.get(g['name'],min(fl0,REF_CAP_FL))
    tgt=min(tgt,REF_CAP_FL)
    bnds=sorted({round(v,2) for m in members for v in (m['z0'],m['h'])})
    # tiers bearing on the civic-core band roof keep their bearing plane (no penetration of the 14 m roof)
    _band=unary_union(bands_l)
    lock=max([m['z0'] for m in members if m['z0']>0 and _gp[id(m)].intersection(_band).area>1.0]+[5.0])
    k=(5+3.3*(tgt-1)-lock)/max(0.1,top-lock)
    M={};prev=None
    for b in bnds:
        if b<=lock+0.01 or prev is None: M[b]=b
        else:
            d=b-prev
            M[b]=M[prev]+(d if d<1.0 else 3.3*max(1,round(d*k/3.3)))
        prev=b
    # trim/extend top to hit target exactly
    adj=(5+3.3*(tgt-1))-M[bnds[-1]] if bnds[-1]>5 else 0
    if abs(adj)>0.05:
        hi=[b for b in bnds if b>5]
        if hi:
            sp=hi[-1]; 
            lo=[b for b in bnds if b<sp]; base=M[lo[-1]] if lo else 5
            if M[sp]+adj-base>=3.29: M[sp]+=adj
    for m in members: _maps[id(m)]=M
    HEIGHT_REVISION.append({'stack':g['name'],'old_fl':fl0,'new_fl':round((M[bnds[-1]]-5)/3.3)+1,'old_top_m':round(top,1),'new_top_m':round(M[bnds[-1]],1),'tiers':len(members)})
_old={id(r):(r['z0'],r['h']) for r in B}
def _Mz(r,z):
    M=_maps[id(r)]; z0,h=_old[id(r)]
    return M.get(round(z,2),z)
for r in B:
    z0,h=_old[id(r)]
    nz0=_Mz(r,z0); nh=_Mz(r,h)
    r['z0']=round(nz0,2); r['h']=round(nh,2)
    r['fl']=max(1,(round((nh-5)/3.3)+1) if z0==0 else round((nh-nz0)/3.3))
# remap pre-computed roof/facade detail with the same per-tier affine map
def _remap_pt(x,y,z):
    pt=Point(x,y); best=None
    inside=[r for r in B if _old[id(r)][0]-0.1<=z<=_old[id(r)][1]+0.1 and _gp[id(r)].buffer(0.7).contains(pt)]
    if inside:
        r=max(inside,key=lambda r:_old[id(r)][0]); z0,h=_old[id(r)]
        return r['z0']+(z-z0)*((r['h']-r['z0'])/max(0.01,h-z0)), r
    below=[r for r in B if _old[id(r)][1]<=z+0.01 and _gp[id(r)].buffer(0.7).contains(pt)]
    if below:
        r=max(below,key=lambda r:_old[id(r)][1]); return r['h']+(z-_old[id(r)][1]), r
    return z, None
def _remap_list(lst,kind):
    out=[]
    for it in lst:
        if kind=='seg':
            a,b,z=it; mx,my=(a[0]+b[0])/2,(a[1]+b[1])/2; nz,_=_remap_pt(mx,my,z); out.append([a,b,round(nz,3)])
        elif kind=='pt':
            x,y,z=it[0],it[1],it[2]; nz,_=_remap_pt(x,y,z); out.append([x,y,round(nz,3)]+list(it[3:]))
    return out
for key,kind in (('beds','seg'),('beams','seg'),('posts','pt'),('planters','pt')):
    if key in FD: FD[key]=_remap_list(FD[key],kind)
for key,kind in (('beds','seg'),('pergola_beams','seg'),('pergola_posts','pt'),('facade_planters','pt')):
    if key in ND: ND[key]=_remap_list(ND[key],kind)
# support check: every elevated tier rests on something at its new z0
_unsupported=[]
for r in B:
    if r['z0']<=0: continue
    P=_gp[id(r)]
    sup=[q for q in B if q is not r and abs(q['h']-r['z0'])<0.12 and _gp[id(q)].intersection(P).area>0.25*P.area]
    # tiers that bear on the 14 m civic band roof (accepted pre-revision condition) are carried by the band
    on_band=P.intersection(unary_union(bands_l)).area>0.25*P.area and r['z0']>=POD_H-0.01 and r['z0']==_old[id(r)][0]
    if not sup and not on_band: _unsupported.append((r['name'],r['z0']))
HEIGHT_REVISION_GAPS=_unsupported
print('HEIGHT stacks', len(HEIGHT_REVISION), '| unsupported tiers', len(_unsupported))
for h in sorted(HEIGHT_REVISION,key=lambda h:-h['old_top_m']):
    if h['old_fl']!=h['new_fl']: print('  %-42s %2d fl -> %2d fl  (%5.1f -> %5.1f m, %d tiers)'%(h['stack'][:42],h['old_fl'],h['new_fl'],h['old_top_m'],h['new_top_m'],h['tiers']))
for u in _unsupported: print('  UNSUPPORTED', u)
# Per-block facade materials from the ref_04 inventory (stack-wide, mapped through the projected footprint overlay).
REF_MAT={
 'Halsey Green Bar W':'darkglass','Commons Brown Bar':'darkglass','Halsey Green Bar C':'brickBrown','Commons PV Block':'brickRed',
 'Hall-side North Block':'brickBrown','Halsey Green Bar E':'darkglass','Pyramid Court Building':'stone','NE Terrace Block':'buff',
 'NW Dark Glass Tower podium':'brickRed','Halsey White Tower podium':'terracotta','NW Court Block':'brickBrown',
 'Axis Terminus Tower podium':'brickRed','East Tower N podium':'darkglass','South Hall Entry':'brickRed',
 'Parkside west residential base':'brickRed','Parkside farm podium':'stone','Parkside east residential base':'stone',
 'Parkside courtyard podium':'brickBrown','Parkside southeast terrace base':'charcoal','Parkside curved-corner podium':'darkglass',
}
MAT_REVISION=[]
for rid,members in _stacks.items():
    g=next((m for m in members if m['z0']==0),None)
    if g is None: continue
    key=next((k for k in REF_MAT if g['name']==k or g['name'].startswith(k+' ')),None)
    if key is None: continue
    for m in members: m['mat']=REF_MAT[key]
    MAT_REVISION.append({'stack':g['name'],'mat':REF_MAT[key],'tiers':len(members)})
print('MATERIAL stacks', len(MAT_REVISION))
# ------------------------------------------------------------------ NORTH PERIMETER REDESIGN (ref_04 left half, ref_03 top row)
# The north row had decayed into ~60 slivers (2-6 m shoulders, stitches, crowns) that read as noise. Replaced by five
# reference-matched perimeter parcels between the Commons route (y 677) and NE Halsey: big podium-and-tower masses,
# stepped green terraces, bronze-finned dark glass / deep brick / light precast facades, PV crowns, open green courts.
# Invariants kept: lanes (10th x 708-717, keep strip 737.5-746.5, Pyramid lane 945.5-954.5) clear; >=3.5 m sidewalk to the
# Commons route; north assemblies <= 64.5 m deep; >= 4 m off the core; <= 18 floors.
_NZ=box(640,680,1090,778)
_KEEP_N=('Pyramid','Hall North Flank','East cluster','East backdrop','Axis Terminus')
_old_n=[r for r in B if _NZ.contains(Polygon(r['fp']).centroid) and not r['name'].startswith(_KEEP_N)]
_old_names=sorted(set(r['name'] for r in _old_n))
B[:]=[r for r in B if r not in _old_n]
_NSAFE=SITE.buffer(-2.3)
NORTH_PARCELS=[]
def _nstack(name,tiers,prog=(0.82,0.08,0.10)):
    z=0.0; below=None; recs=[]; polys_=[]
    for i,t_ in enumerate(tiers):
        poly,fl,mat,roof,kind,tag=t_[:6]
        if len(t_)>6: z=recs[t_[6]]['h']; below=polys_[t_[6]]   # tier sits on an earlier (not the previous) tier
        p=big(poly.intersection(_NSAFE)) if i==0 else big(poly.intersection(below.buffer(-0.01)))
        assert p is not None and p.area>40,(name,tag)
        rec=add(name if i==0 else name+' '+tag,kind,p,fl,z0=z,mat=mat,roof=roof,prog=prog if i else (0.35,0.15,0.50) if kind=='podium' else prog,base=(i==0))
        rec['north_ref']=True; recs.append(rec); polys_.append(p); z=rec['h']; below=p
    NORTH_PARCELS.append({'name':name,'floors':sum(t[1] for t in tiers),'top_m':round(z,1),'ground_m2':round(Polygon(recs[0]['fp']).area)})
    return recs
YC,Y1=684.0,771.5   # user: Commons-facing blocks pulled in to the shared Commons route (3.5 m sidewalk kept); Halsey-facing blocks stay on Halsey
# P1  west corner (9th / Halsey): brick podium on the Commons, bronze-finned dark-glass tower stepping to a PV crown; separate Halsey brick wing
_nstack('Halsey Bronze Tower',[(box(645,YC,704,744),4,'refBrick','meadow','podium','podium'),
    (box(649,688,687,722),12,'refBronze','meadow','tower','shaft'),
    (box(649,693.5,681,722),2,'refBronze','pv','step','crown')])
_nstack('Halsey Bronze Tower Halsey wing',[(box(648,750,701,Y1),6,'refBrick','meadow','bar','base')],prog=(0.85,0.0,0.15))
# P2  10th Ave brick slab between the Commons lane and the keep strip, small brick bar holding the Halsey corner
_nstack('Tenth Avenue Brick Slab',[(box(720.5,YC,733.5,748),7,'refBrick','meadow','bar','base'),
    (box(720.5,689.5,733.5,741.5),2,'refBrick','pv','step','crown')])
_nstack('Tenth Avenue Halsey Bar',[(box(720.5,753,733.5,Y1),5,'refBrick','meadow','bar','base')])
# P3  precast tower + garden bar on the Commons, Halsey brick courts on Halsey (open green court between)
_nstack('Halsey Precast Tower',[(box(750.5,YC,782,720.5),4,'refPrecast','meadow','podium','podium'),
    (box(752.5,686,780,718.5),9,'refPrecast','meadow','tower','shaft'),
    (box(754.5,688,778,716.5),1,'refPrecast','pv','step','crown')])
_nstack('Commons Garden Bar',[(box(788,YC,842,702.5),5,'refSand','meadow','bar','base'),
    (box(800,685.5,842,702.5),2,'refSand','meadow','step','terrace')],prog=(0.7,0.2,0.1))
_nstack('Halsey Brick Courts',[(box(750.5,744,842,Y1),6,'brickBrown','meadow','bar','base'),
    (box(808,746.5,840,769.5),4,'brickBrown','pv','step','tower',0)])
# P4  hall-side brick tower + low precast bar on the Commons, Halsey dark-glass bar with green-topped tower
_nstack('Commons Brick Tower',[(box(896,YC,941,716.5),4,'refBrick','meadow','podium','podium'),
    (box(898,686,939,714.5),11,'brickBrown','meadow','tower','shaft'),
    (box(902,688.5,935,712.5),1,'brickBrown','pv','step','crown')])
_nstack('Commons Low Bar',[(box(848,YC,890,700.5),4,'refPrecast','meadow','bar','base')],prog=(0.5,0.3,0.2))
_nstack('Halsey Glass Bar',[(box(848,748,941,Y1),6,'darkglass','meadow','bar','base'),
    (box(850,750,890,769.5),6,'darkglass','meadow','step','tower')])
# P5  northeast: stepped terrace block, bronze tower on brick podium, Halsey east courts
_nstack('NE Terrace Block',[(box(962,684,1030,704),6,'refSand','meadow','bar','base'),
    (box(980,685.5,1030,702.5),2,'refSand','meadow','step','terrace'),
    (box(1000,687,1030,701),2,'refSand','pv','step','crown')])
_nstack('NE Bronze Tower',[(box(1036,684,1086,716),3,'refBrick','meadow','podium','podium'),
    (box(1050,686,1084,714),13,'refBronze','meadow','tower','shaft'),
    (box(1052,688,1082,712),2,'refBronze','pv','step','crown')])
_nstack('Halsey East Courts',[(box(962,742,1068,Y1),7,'refBrick','meadow','bar','base'),
    (box(964,744,1000,769),5,'refBrick','pv','step','tower'),
    (box(1030,744,1066,769),3,'refBrick','meadow','step','east wing',0)])
_ng=[Polygon(r['fp']) for r in B if r.get('north_ref') and r['z0']==0]
for comp in polys(unary_union([p.buffer(0.01) for p in _ng])):
    assert comp.bounds[3]-comp.bounds[1]<=NORTH_TARGET_DEPTH+0.05,('north depth',comp.bounds)
for p in _ng:
    assert p.distance(_northcore)>=4,'north parcel too close to core'
    assert p.bounds[1]>=683.9,'north parcel inside Commons route sidewalk'
    for k in (box(707.9,676,716.9,781),box(737.5,676,746.5,781),box(945.5,676,954.5,781)): assert p.intersection(k).area<0.05,'north parcel blocks a lane'
assert max(r['fl'] if r['z0']==0 else 0 for r in B if r.get('north_ref'))<=18
# open green courts and paseos for the new parcels; stale north courts / ND details dropped
NORTH_COURTS=[C(orient(b_,1.0)) for b_ in (box(752.5,723,780,741.5),box(790,705,840,741.5),box(850,703,888,745.5),box(898,719,939,745.5),box(968,720,1062,738))]
for _k in ND:
    ND[_k]=[q for q in ND[_k] if not (q and isinstance(q[0],(list,tuple)) and _NZ.contains(Point(q[0][0],q[0][1])))
             and not (q and isinstance(q[0],(int,float)) and _NZ.contains(Point(q[0],q[1])))]
# planter edges on every stepped green terrace (exposed roof under a higher tier)
for r in [q for q in B if q.get('north_ref') and q['roof']=='meadow']:
    p=Polygon(r['fp']); up=unary_union([Polygon(q['fp']) for q in B if q.get('north_ref') and abs(q['z0']-r['h'])<0.05])
    if up.is_empty: continue
    ex=p.buffer(-1.0,join_style=2).difference(up.buffer(1.2,join_style=2))
    for pp in polys(ex):
        if pp.area<20: continue
        cs=list(pp.exterior.coords)
        for a_,b_ in zip(cs,cs[1:]):
            if math.dist(a_,b_)>3 and p.exterior.distance(LineString([a_,b_]).interpolate(0.5,normalized=True))<1.6:
                ND['beds'].append([[round(a_[0],2),round(a_[1],2)],[round(b_[0],2),round(b_[1],2)],r['h']+0.15])
NORTH_REDESIGN={'removed':len(_old_n),'removed_names':_old_names,'parcels':NORTH_PARCELS}
print('NORTH REDESIGN removed',len(_old_n),'records; new stacks',len(NORTH_PARCELS),[ (p['name'],p['floors']) for p in NORTH_PARCELS])
# ------------------------------------------------------------------ Pyramid Court: rebuilt onto the crossing hall (ref_03 / ref9 c1)
# Reference: a 45-degree-rotated mid-rise stands directly on the hall's NE chamfer, beside the east vault wing; its SW face is the
# hall's shared wall, a low podium meets the hall at band height and the shaft sets back so the hall's clerestory stays exposed.
# Diamond = rectangle in the chamfer frame: face along the chamfer line x+y=1572 from the hall corner (921,651) to (945,627),
# depth 30 m to the NE. Stays south of the Commons route (y 674) so the Pyramid lane and route are untouched.
_t=(2**-0.5,-(2**-0.5)); _n=(2**-0.5,2**-0.5); _A=(921.0+0.25*_n[0],651.0+0.25*_n[1]); _FACE=33.9; _DEP=30.0
def _pc(u,v): return (_A[0]+_t[0]*u+_n[0]*v,_A[1]+_t[1]*u+_n[1]*v)
PYR_TILT=-8.0; PYR_BACK=(4.0,0.0)   # user: back it off the core and tilt the face away from the hall (hall end of the face swings out)
def _pyr_x(g): return affinity.translate(affinity.rotate(g,PYR_TILT,origin=_pc(_FACE,0)),*PYR_BACK)
PYR_FP=orient(_pyr_x(Polygon([_pc(0,0),_pc(_FACE,0),_pc(_FACE,_DEP),_pc(0,_DEP)])),1.0)
# Integration: a low glazed connector fills the opened wedge at band height, so the tower reads as part of Lloyd Commons.
_face_hall=LineString([(921.0,651.0),(931.0,641.0)])
_wedge=Polygon(list(_face_hall.coords)+[tuple(PYR_FP.exterior.coords[i]) for i in (1,0)]).convex_hull
_old_pyr=unary_union([Polygon(r['fp']) for r in B if r['name'].startswith('Pyramid Court Building')])
B[:]=[r for r in B if not r['name'].startswith('Pyramid Court Building')]
for r in B:  # yield the hall-corner strip of the north flank to the new building
    if r['name'].startswith('Hall North Flank') and Polygon(r['fp']).intersects(PYR_FP):
        p=big(Polygon(r['fp']).difference(PYR_FP).difference(_wedge)); r['fp']=C(orient(p,1.0)); r['inset']=C(big(p.buffer(-0.45,join_style=2)))
_wedge=big(_wedge.difference(HALL).difference(PYR_FP).difference(unary_union([Polygon(r['fp']) for r in B if r['z0']==0 and not r['name'].startswith('Pyramid Court Building')])))
# carve the building out of the north band, its roof park, liners and promenade (core stays contiguous around it)
bands_l=[q for p in bands_l for q in polys(p.difference(PYR_FP).difference(_wedge)) if q.area>4]
band_u=unary_union(bands_l); core['bands']=[C(p) for p in polys(band_u)]
park=park.difference(PYR_FP).difference(_wedge); other_roof=other_roof.difference(PYR_FP).difference(_wedge)
core['park']=[C(p) for p in polys(park)]; core['roof_other']=[C(p) for p in polys(other_roof)]
_lin=unary_union([Polygon(p) for p in core['liners']['fp']]).difference(PYR_FP.buffer(3.0,join_style=2)).difference(_wedge.buffer(1.0))
core['liners']['fp']=[C(orient(p,1.0)) for p in polys(_lin) if p.area>120]
_pro=unary_union([Polygon(p) for p in core['promenade']]).difference(PYR_FP.buffer(0.3,join_style=2)).difference(_wedge.buffer(0.3))
core['promenade']=[C(orient(p,1.0)) for p in polys(_pro) if p.area>20]
_pod=add('Pyramid Court Building','podium',PYR_FP,3,mat='stone',roof='meadow',prog=(0.2,0.3,0.5),ftf=4.5)   # 0-14 m, = band roof
_sh=big(PYR_FP.intersection(_pyr_x(Polygon([_pc(3.2,3.4),_pc(_FACE-0.6,3.4),_pc(_FACE-0.6,_DEP-0.6),_pc(3.2,_DEP-0.6)]))))
add('Pyramid Court Building shaft','tower',_sh,8,z0=_pod['h'],mat='stone',roof='pv',prog=(0.7,0.25,0.05),base=False)  # 14-40.4 m
_cr=big(_sh.buffer(-2.4,join_style=2))
add('Pyramid Court Building crown','step',_cr,1,z0=round(_pod['h']+3.3*8,2),mat='stone',roof='pv',prog=(0.7,0.3,0.0),base=False)
if _wedge is not None and _wedge.area>8:
    add('Pyramid Court Building hall connector','podium',_wedge,3,mat='curtain',roof='meadow',prog=(0.0,0.0,1.0),ftf=4.5)  # 14 m = band roof
for r in B:
    if r['name'].startswith('Pyramid Court Building'): r['north_east_detail']=False; r['hall_attached']=True
assert PYR_FP.intersection(HALL).area<0.05 and 2.5<PYR_FP.distance(HALL)<9, 'Pyramid must stand off the hall, not enter it'
assert _wedge is not None and _wedge.distance(HALL)<0.3 and _wedge.distance(PYR_FP)<0.3, 'connector must join hall and tower'
assert PYR_FP.bounds[3]<=673.0, 'Pyramid must clear the Commons route'
# remove stale detail that belonged to the old free-standing diamond
for _k in ND:
    ND[_k]=[q for q in ND[_k] if not (isinstance(q,list) and q and isinstance(q[0],(list,tuple)) and _old_pyr.buffer(1).contains(Point(q[0][0],q[0][1])))
             and not (isinstance(q,list) and q and isinstance(q[0],(int,float)) and _old_pyr.buffer(1).contains(Point(q[0],q[1])))]
STREET_KEEP_PYR_NOTE='box(931,664,955,670) legacy strip superseded: Commons route (y 674-680) is gated separately'
PYRAMID_REVISION={'fp':C(PYR_FP),'connector_fp':C(_wedge),'tilt_deg':PYR_TILT,'standoff_m':round(PYR_FP.distance(HALL),1),'connector_m2':round(_wedge.area),'shared_wall_m':round(PYR_FP.exterior.intersection(HALL.buffer(0.3)).length,1),'area_m2':round(PYR_FP.area),
                  'rotation_deg':45+PYR_TILT,'height_m':round(_pod['h']+3.3*9,1),'old_area_m2':round(_old_pyr.area)}
print('PYRAMID', PYRAMID_REVISION)
# ------------------------------------------------------------------ collision gate
foot = [(r['name'], Polygon(r['fp'])) for r in B if r['z0'] == 0]
CORE_FP = unary_union(bands_l + lanes_l + vaults + [HALL, link])
VEN_FP = Polygon(venue['foot'])
PLAZA_C, PLAZA_R = (668.0, 585.0), 25.0
PLAZA_FP = Point(*PLAZA_C).buffer(PLAZA_R)
STREET_KEEP = [box(698, 664, 859, 670), box(737.5, 676, 746.5, 781), box(945.5, 676, 954.5, 781)]
errs = []
SAFE = SITE.buffer(-2.0)
for n, p in foot:
    if not SAFE.contains(p): errs.append('OFFSITE/street-edge %s (%.0f m2 out)' % (n, p.difference(SAFE).area))
    for tag, g in (('CORE', CORE_FP), ('VENUE', VEN_FP), ('PLAZA', PLAZA_FP)) + tuple(('STREET', s) for s in STREET_KEEP):
        if p.intersection(g).area > 0.5: errs.append('%s overlaps %s (%.0f m2)' % (n, tag, p.intersection(g).area))
for i in range(len(foot)):
    for j in range(i + 1, len(foot)):
        a = foot[i][1].intersection(foot[j][1]).area
        if a > 0.5: errs.append('%s x %s overlap %.0f m2' % (foot[i][0], foot[j][0], a))
for g, tag in ((CORE_FP, 'core'), (VEN_FP, 'venue'), (PLAZA_FP, 'plaza')):
    if not SITE.buffer(0.5).contains(g): errs.append('%s not inside site' % tag)
if VEN_FP.intersection(CORE_FP).area > 0.5: errs.append('venue overlaps core')
if VEN_FP.intersection(PLAZA_FP).area > 0.5: errs.append('venue overlaps fountain plaza')
assert not HEIGHT_REVISION_GAPS, 'UNSUPPORTED TIERS: %r'%HEIGHT_REVISION_GAPS
assert not errs, 'LAYOUT COLLISIONS:\n  ' + '\n  '.join(errs)
CORE_BUILT = unary_union(bands_l + vaults + [HALL, link])
BLD_U = unary_union([p for _, p in foot] + [CORE_BUILT, VEN_FP])

# ------------------------------------------------------------------ open spaces
_se_y=lambda y:556+(y-556)*(E_S-556)/(OLD_ES-556)
courtyards = [C(orient(box(998-PLAZA_FRAME_SHIFT, _se_y(571), 1048-PLAZA_FRAME_SHIFT, _se_y(586)), 1.0))]
courtyards += NORTH_COURTS
courtyards=[C(orient(p,1.0)) for c_ in courtyards for p in polys(Polygon(c_).difference(BLD_U.buffer(0.5,join_style=2))) if p.area>40]
curve_park = big(SITE.intersection(box(1088, 560, 1180, 780)).difference(BLD_U.buffer(4)))
PASEOS = [(792, 798, 556, 589), (RX - PHX, RX - 22, 556, PS), (992, 998, 556, E_S), (1062, 1068, 556, E_S), (1098, 1104, 556, E_S),
          (786, 792, 733, 770), (880, 886, 733, 770)]
PASEOS=[(a,b,c,min(d,PS if a<RX-PHX else E_S)) if c==556 else (a,b,c,d) for a,b,c,d in PASEOS]
PASEOS=[(a-PLAZA_FRAME_SHIFT,b-PLAZA_FRAME_SHIFT,c,d) if c==556 else (a,b,c,d) for a,b,c,d in PASEOS]
PASEOS=[q for q in PASEOS if not (q[2]>700 and q[0]<1000)]+[(782,788,684,744),(842,848,684,771.5),(890,896,684,748),(1030,1036,684,716),(737.5,746.5,684,771.5)]
paseos = [C(orient(box(a, c, b, d), 1.0)) for a, b, c, d in PASEOS]
paseos=[C(orient(p,1.0)) for c_ in paseos for p in polys(Polygon(c_).difference(BLD_U.buffer(0.3,join_style=2))) if p.area>20]
esplanades = [C(orient(box(RX + PHX, AXE + LE + BD, 1060, 704), 1.0))]   # pyramid court forecourt north of E band

def inside_open(x, y, pad=1.5):
    p = Point(x, y); return SITE.buffer(-1).contains(p) and BLD_U.distance(p) > pad

# ------------------------------------------------------------------ trees
T = {'street': [], 'esplanade': [], 'paseo': [], 'court': [], 'plaza': [], 'grove': [], 'deck': []}
ring = LineString(list(SITE.buffer(4.5, join_style=2).exterior.coords)); d = 4.0
while d < ring.length:
    p = ring.interpolate(d); T['street'].append([round(p.x, 1), round(p.y, 1)]); d += 7.2
T['atrium'] = []
x = 650                                                    # tree-lined Commons St (north sidewalk + venue side)
while x < 952:
    if all(abs(x - c) > 7 for c in (742,)): T['street'].append([round(x, 1), 730.6])
    x += 8.0
for xc in (742, 950):                                      # N-S lanes
    for side in (-6.2, 6.2):
        y = 734
        while y < 772:
            if inside_open(xc + side, y, 0.6): T['street'].append([xc + side, round(y, 1)])
            y += 8.0
mc = LineString([[648, 552.6], [1160, 552.6]]); dd2 = 4.0
while dd2 < mc.length:
    p = mc.interpolate(dd2)
    T['street'].append([round(p.x, 1), round(p.y, 1)]); dd2 += 7.4
for a, b, c, dd in PASEOS:
    xm = (a + b) / 2; y = c + 3
    while y < dd - 2:
        T['paseo'].append([round(xm, 1), round(y, 1)]); y += 9
for c in courtyards:
    minx, miny, maxx, maxy = Polygon(c).bounds; n = max(2, int((maxx - minx) / 12))
    for k in range(n):
        T['court'].append([round(minx + (k + 0.5) * (maxx - minx) / n, 1), round((miny + maxy) / 2 + (2.5 if k % 2 else -2.5), 1)])
for k in range(14):
    a = k / 14 * 2 * math.pi + 0.2; x, y = PLAZA_C[0] + 31 * math.cos(a), PLAZA_C[1] + 31 * math.sin(a)
    if inside_open(x, y, 2): T['plaza'].append([round(x, 1), round(y, 1)])
x = 960                                                    # forecourt north of E band
while x < 1056:
    if inside_open(x, 702.5, 0.5): T['esplanade'].append([round(x, 1), 702.5])
    x += 9
if curve_park is not None:
    tries = 0
    while len(T['grove']) < 90 and tries < 12000:
        tries += 1; minx, miny, maxx, maxy = curve_park.bounds
        x, y = random.uniform(minx, maxx), random.uniform(miny, maxy)
        if curve_park.buffer(-2).contains(Point(x, y)) and all(math.hypot(x - a, y - b) > 6.0 for a, b in T['grove']):
            T['grove'].append([round(x, 1), round(y, 1)])

# ------------------------------------------------------------------ roof commons park furniture
P = {'beds': [], 'pergolas': [], 'pods': [], 'posts': [], 'bulbs': [], 'benches': [], 'walks': []}
park_polys = polys(park)
for pp in park_polys:
    minx, miny, maxx, maxy = pp.bounds; cy = (miny + maxy) / 2
    P['walks'].append([[minx + 2, cy + 3 * math.sin(k * 0.9)] if False else [minx + 2 + k * (maxx - minx - 4) / 10, cy + 3.2 * math.sin(k * 0.95)] for k in range(11)])
    x = minx + 10; k = 0
    while x < maxx - 8:
        bx_, by_ = x, cy + (5.5 if k % 2 else -5.5)
        if pp.buffer(-3.5).contains(Point(bx_, by_)):
            P['beds'].append({'x': round(bx_, 1), 'y': round(by_, 1), 'rx': 5.5 + (k % 3), 'ry': 3.0})
            T['deck'].append([round(bx_ + 1.2, 1), round(by_, 1)])
        if k % 3 == 1 and pp.buffer(-4).contains(Point(x + 9, cy)): P['benches'].append({'x': round(x + 9, 1), 'y': round(cy + 2.2, 1)})
        x += 17; k += 1
    if maxx - minx > 50: P['pergolas'].append({'x': round((minx + maxx) / 2, 1), 'y': round(cy, 1), 'w': 9.0, 'd': 5.5})
    ext = LineString(list(pp.buffer(-1.2, join_style=2).exterior.coords)); posts = []; dd = 0.0
    while dd < ext.length:
        q = ext.interpolate(dd); posts.append((q.x, q.y)); dd += 12.0
    for i in range(len(posts)):
        a, b = posts[i], posts[(i + 1) % len(posts)]; P['posts'].append([round(a[0], 1), round(a[1], 1)])
        for tt in (0.2, 0.4, 0.6, 0.8):
            sag = 1.0 * (1 - abs(2 * tt - 1)); P['bulbs'].append([round(a[0] + (b[0] - a[0]) * tt, 1), round(a[1] + (b[1] - a[1]) * tt, 1), round(3.9 - sag, 2)])
for gx0, gx1, gy, sd in guards:                            # promenade along the vault glass (ref: rooftop market walk)
    yy = gy + sd * 4.6
    P['walks'].append([[gx0 + 1, yy], [gx1 - 1, yy]])

# Promenade cleanup: nothing from the old roof-park layer may sit inside a liner volume.
_inL=lambda x,y:_liner_shape.contains(Point(x,y))
T['deck']=[q for q in T['deck'] if not _inL(q[0],q[1])]
for x0,x1,ax in WINGS:
    for sd in (-1,1):
        yy=ax+sd*(VH+4.2); x=x0+5
        while x<x1-4:
            if not HALL.buffer(3).contains(Point(x,yy)) and not _inL(x,yy): T['deck'].append([round(x,1),round(yy,1)])
            x+=11
for key in ('beds','pergolas','benches'):
    P[key]=[q for q in P[key] if not _inL(q['x'] if isinstance(q,dict) else q[0], q['y'] if isinstance(q,dict) else q[1])]
P['posts']=[q for q in P['posts'] if not _inL(q[0],q[1])]
P['bulbs']=[q for q in P['bulbs'] if not _inL(q[0],q[1])]
P['walks']=[]
# ------------------------------------------------------------------ street furniture + people
F = {'cafe': [], 'benches': [], 'lamps': [], 'bollards': [], 'racks': []}
KIOSK = []
INT = {'tables': [], 'carts': [], 'pots': [], 'bridges': [], 'benches': []}
for x0, x1, ax in WINGS:
    for sd in (-1, 1):                                     # rooftop market tents along the vault promenade
        yk = ax + sd * (VH + 10.2); x = x0 + 8; xe = x1 - 5
        if x0 < RX: xe = min(xe, RX - PHX - 5)
        else: x = max(x, RX + PHX + 7)
        while x < xe:
            KIOSK.append([round(x, 1), round(yk, 1), sd, POD_H]); x += 9.5
    x = x0 + 12; k = 0                                     # atrium floor: potted trees, harvest tables, planter carts
    while x < x1 - 8:
        INT['pots'].append([round(x, 1), round(ax + (1.6 if k % 2 else -1.6), 1)]); T['atrium'].append([round(x, 1), round(ax + (1.6 if k % 2 else -1.6), 1)])
        INT['tables'].append([round(x + 7, 1), round(ax - 2.2, 1)]); INT['tables'].append([round(x + 7, 1), round(ax + 2.2, 1)])
        INT['carts'].append([round(x + 13, 1), round(ax + (-4.2 if k % 2 else 4.2), 1)])
        INT['benches'].append([round(x + 3.5, 1), round(ax + (-4.6 if k % 2 else 4.6), 1)])
        x += 18; k += 1
    for bx_ in (x0 + 5, (x0 + x1) / 2, x1 - 5):            # cross-bridges at both balcony levels
        if abs(bx_ - (RX - PHX)) < 6 or abs(bx_ - (RX + PHX)) < 6: continue
        INT['bridges'].append([round(bx_, 1), ax, 1 if x0 < RX else -1])
for k in range(16):
    a = k / 16 * 2 * math.pi; F['bollards'].append([round(PLAZA_C[0] + 28.5 * math.cos(a), 1), round(PLAZA_C[1] + 28.5 * math.sin(a), 1)])
for a, b, c, dd in PASEOS[:5]:
    for k in range(3): F['racks'].append([round((a + b) / 2 + 1.5, 1), round(558 + k * 2.2, 1), 1.5708])
x = 652
while x < 950:
    F['lamps'].append([round(x, 1), 731.8]); x += 24

PPL = []
def ppl_line(x0, y0, x1, y1, n, jit, z=0.0):
    for _ in range(n):
        t = random.random(); PPL.append([round(x0 + (x1 - x0) * t + random.uniform(-jit, jit), 1), round(y0 + (y1 - y0) * t + random.uniform(-jit, jit), 1), z])
for x0, x1, ax in WINGS:
    ppl_line(x0 + 3, ax, x1 - 3, ax, 70, 6.5)                          # atrium floor
    for sd in (-1, 1):
        ppl_line(x0 + 2, ax + sd * (VH - 1.4), x1 - 2, ax + sd * (VH - 1.4), 26, 0.5, 5.0)   # level 2 balcony
        ppl_line(x0 + 2, ax + sd * (VH - 1.4), x1 - 2, ax + sd * (VH - 1.4), 18, 0.5, 9.5)   # level 3 balcony
        if (x0 < RX):
            ppl_line(max(x0, PARK_X[0]) + 3, ax + sd * (VH + 4.6), RX - PHX - 3, ax + sd * (VH + 4.6), 30, 1.0, POD_H)
        else:
            ppl_line(RX + PHX + 3, ax + sd * (VH + 4.6), min(x1, PARK_X[1]) - 3, ax + sd * (VH + 4.6), 30, 1.0, POD_H)
for a, b, c, dd in PASEOS: ppl_line((a + b) / 2, c, (a + b) / 2, dd, 8, 1.5)
ppl_line(650, 731, 950, 731, 60, 1.0); ppl_line(650, 717.5, 735, 717.5, 18, 0.8)
for _ in range(70):
    a = random.random() * 2 * math.pi; r = random.uniform(15, 26)
    PPL.append([round(PLAZA_C[0] + r * math.cos(a), 1), round(PLAZA_C[1] + r * math.sin(a), 1), 0.0])
for _ in range(40): PPL.append([round(RX + random.uniform(-13, 13), 1), round(HY + random.uniform(-23, 23), 1), 0.0])
for _ in range(50): PPL.append([round(RX + random.uniform(-PHX + 6, PHX - 6), 1), round(HY + random.choice((-1, 1)) * random.uniform(27, PHY - 6), 1), 0.0])
for pp in park_polys:
    minx, miny, maxx, maxy = pp.bounds; ppl_line(minx + 3, (miny + maxy) / 2, maxx - 3, (miny + maxy) / 2, int((maxx - minx) / 4), 3.0, POD_H)
ppl_line(960, 702.5, 1050, 702.5, 25, 1.2)
for _ in range(34):                                          # food-court deck (L3)
    _b = _fc.bounds; _x = random.uniform(_b[0], _b[2]); _y = random.uniform(_b[1], _b[3])
    if _fc.contains(Point(_x, _y)): PPL.append([round(_x, 1), round(_y, 1), 9.5])
# Align generated internal-row streetscape with inward northern movement (not external Halsey trees).
T['street']=[[x,y-48 if abs(y-730.6)<0.2 else y] for x,y in T['street']]
F['lamps']=[[x,y-48 if abs(y-731.8)<0.2 else y] for x,y in F['lamps']]
PPL=[[x,y-48,z] if z==0 and 715<y<733 and 645<x<955 else [x,y,z] for x,y,z in PPL]
# Keep breezeway clear of fixed furniture and trees; pedestrians are allowed.
for key in F:F[key]=[q for q in F[key] if not BREEZEWAY.buffer(1).contains(Point(q[0],q[1]))]
for key in T:
    if key not in ('deck','atrium'):T[key]=[q for q in T[key] if not BREEZEWAY.buffer(2).contains(Point(q[0],q[1]))]
PPL = [p for p in PPL if SITE.contains(Point(p[0], p[1])) and (p[2] > 0 or void.contains(Point(p[0], p[1])) or HALL.contains(Point(p[0], p[1])) or BLD_U.distance(Point(p[0], p[1])) > 0.6)]
for k in list(F): F[k] = [q for q in F[k] if BLD_U.distance(Point(q[0], q[1])) > 0.5]

LABELS = [['Glass Galleria · 2 × %d m' % round(RX - PHX - VX0), 812, AXW, 30, 1], ['Crossing Hall · Ice Rink', RX, HY, 42, 1],
          ['Roof Commons Park', 860, PS + 12, 18, 0.9], ['Music Venue', (VXa+VXb)/2, AXW, 32, 0.9], ['Fountain Plaza', PLAZA_C[0], PLAZA_C[1], 14, 0.85],
          ['Rooftop Farm', 748-PLAZA_FRAME_SHIFT, 564, 24, 0.8], ['Axis Terminus Tower', 1126, 649, 112, 0.85], ['Commons shared access', 820, 677, 6, 0.7]]
if curve_park is not None: LABELS.append(['Curve Park', 1150, 700, 14, 0.8])
# ------------------------------------------------------------------ streets
WD = {'primary': 17, 'secondary': 13, 'tertiary': 11, 'unclassified': 9, 'residential': 9}
streets = []
for st in S['streets']:
    ls = LineString(st['pts'])
    if ls.distance(SITE) < 30:
        streets.append({'pts': [[round(x, 1), round(y, 1)] for x, y in st['pts']],
                        'w': WD.get(st['cls'], 9), 'name': st.get('name', ''), 'syn': False})
# Multnomah east extension now supplied by actual OSM centerlines; no parallel synthetic duplicate.
# Carriageway widths from OSM lane tags: Multnomah 2-5 lanes (bike tracks sit behind the curb) -> 15 m;
# 9th Ave 4 lanes -> 14 m; Halsey 2-3 lanes -> 11 m (unchanged). Clearance to every building checked >= 3.5 m sidewalk.
for _s in streets:
    if 'Multnomah' in _s['name']: _s['w'] = 15
    elif '9th Avenue' in _s['name'] and max(p[1] for p in _s['pts']) <= 782.5: _s['w'] = 14
bring = list(SITE.buffer(7.0, join_style=1).exterior.coords)[:-1]
cond = [(x >= 1040 and y >= 548) for x, y in bring]
n = len(bring)
start = next(i for i in range(n) if (not cond[i - 1]) and cond[i])
seq, i = [], start
while cond[i % n] and len(seq) <= n:
    seq.append(bring[i % n]); i += 1
if seq[0][1] < seq[-1][1]:
    seq.reverse()
curve = [[926, 780.5], [1000, 780.7]] + [[round(x, 1), round(y, 1)] for x, y in seq] + [[1192, 543.5]]
streets.append({'pts': curve, 'w': 12, 'name': 'curved perimeter road', 'syn': True})
COMMONS_ROUTE=[[633.4,677],[1093,677]]   # one straight shared-access spine, 10th lane to the Multnomah connector
SE_ROUTE=[[1093,541.6],[1093,677]]        # straight north from Multnomah, T-junction onto the spine
streets.append({'pts':COMMONS_ROUTE,'w':6,'name':'Commons shared access (concept)','syn':True})
streets.append({'pts': WEST_10TH_ROUTE, 'w': 9, 'name': 'Commons lane W', 'syn': True})
streets.append({'pts': [[950, 677], [950, 779.97]], 'w': 9, 'name': 'Pyramid lane', 'syn': True})
streets.append({'pts':SE_ROUTE,'w':7,'name':'Southeast connection (concept)','syn':True})
# No additional internal rear road: existing Commons through-route and mapped streets retained.
# Assert the complete carriageway, not just centerline, excludes protected building footprints.
_common_pavement=LineString(COMMONS_ROUTE).buffer(3,cap_style=2,join_style=2)
_obstacles=unary_union([Polygon(r['fp']) for r in B if r['z0']==0]+[CORE_BUILT,VEN_FP])
assert _common_pavement.intersection(_obstacles).area<0.05, 'Commons route penetrates a building'
assert LineString(SE_ROUTE).buffer(3.5,cap_style=2,join_style=2).intersection(_obstacles).area<0.05,'SE route blocked'
assert LineString(COMMONS_ROUTE).distance(LineString(WEST_10TH_ROUTE))<0.001
assert LineString(WEST_10TH_ROUTE).buffer(4.5,cap_style=2,join_style=2).intersection(_obstacles).area<0.05
assert LineString(COMMONS_ROUTE).distance(LineString([[950,677],[950,779.97]]))<0.001
assert LineString(SE_ROUTE).distance(LineString(COMMONS_ROUTE))<0.001 and SE_ROUTE[-1] in COMMONS_ROUTE[-1:], 'SE connector must T into the straight spine'
_spine=LineString(COMMONS_ROUTE).buffer(3.5,cap_style=2,join_style=2)
assert _spine.intersection(_obstacles).area<0.05, 'extended spine blocked'

cross = []


def zebra(x, y, ang, width, n_len=3.0):
    # Continental crosswalk: short bars PARALLEL to traffic (ladder rungs you drive across),
    # repeated across the road width. Bars span the crossing's 3 m depth along the road.
    nx, ny = -math.sin(ang), math.cos(ang)
    o = -width / 2 + 0.8
    while o <= width / 2 - 0.8:
        cross.append([round(x + nx * o, 2), round(y + ny * o, 2), round(ang, 4), 3.0])
        o += 1.1


for x,y in ((722.4,781.13),(960.0,779.97)):
    zebra(x, y, 0.0, 11)
for x in (795, RX - 28, 995, 1065):
    zebra(x, 543.4, 0.0, 11)
zebra(633.8, 676, math.pi / 2, 11)  # existing west-side crossing retained
for y in (596.0,):
    zebra(633.8, y, math.pi / 2, 11)
cross = []  # roads blank: all painted markings removed per user request

rails = []
for r in S['rails']:
    ls = LineString(r['pts'])
    if ls.distance(SITE) < 200 and r['kind'] in ('light_rail', 'platform'):
        rails.append({'pts': [[round(x, 1), round(y, 1)] for x, y in r['pts']], 'kind': r['kind']})

# ------------------------------------------------------------------ PV + rooftop kit
roofkit = {'pv': [], 'mech': []}
for r in B:
    if r['roof'] not in ('pv', 'meadow'):
        continue
    poly = Polygon(r['inset'])
    blockers=unary_union([Polygon(q['fp']).buffer(0.8) for q in B if q['z0']>=r['h']-0.05 and q['h']>r['h']+0.1 and Polygon(q['fp']).intersects(poly)])
    exposed=poly.difference(blockers)
    if exposed.is_empty:continue
    minx, miny, maxx, maxy = poly.bounds
    cx, cy = poly.centroid.x, poly.centroid.y
    mx,my=round(cx+(maxx-minx)*0.22,1),round(cy,1)
    if exposed.contains(box(mx-2,my-1.5,mx+2,my+1.5)):
        roofkit['mech'].append([mx,my,r['h'],4.0,3.0,2.6])
    if r['roof'] == 'pv':
        yy = miny + 2.5
        while yy < maxy - 2.0:
            xx = minx + 2.5
            while xx < maxx - 2.5:
                if exposed.buffer(-1.2).contains(Point(xx, yy)) and abs(xx - (cx + (maxx - minx) * 0.22)) > 4:
                    roofkit['pv'].append([round(xx, 1), round(yy, 1), r['h']])
                xx += 2.3
            yy += 2.6

for r in B:
    if r['kind'] == 'flank':
        p = Polygon(r['inset']); minx, miny, maxx, maxy = p.bounds; cy = (miny + maxy) / 2
        for xx, sx in ((minx + 9, 7.0), (maxx - 10, 5.0), ((minx + maxx) / 2, 4.0)):
            roofkit['mech'].append([round(xx, 1), round(cy + (2 if cy > HY else -2), 1), r['h'], sx, 4.0, 2.8])

# ------------------------------------------------------------------ stats
site_m2 = SITE.area
tot = {'gfa': 0, 'resi': 0, 'off': 0, 'ret': 0}
for r in B:
    g = Polygon(r['fp']).area * r['fl']
    tot['gfa'] += g
    tot['resi'] += g * r['prog']['resi']; tot['off'] += g * r['prog']['off']; tot['ret'] += g * r['prog']['ret']
core_gla = sum(Polygon(c).area for c in core['bands']) * 3 + PAV.area + void.area
venue_gfa = sum(Polygon(v['fp']).area * max(1, round((v['h'] - v['z0']) / 6)) for v in venue['vols'])
grand = tot['gfa'] + core_gla + venue_gfa + Polygon(core['link']).area * 3
units = tot['resi'] * 0.82 / 85.0
ground_built = unary_union([p for _, p in foot] + [CORE_BUILT, VEN_FP]).area
stats = {
    'site_m2': round(site_m2), 'site_ac': round(site_m2 / 4046.86, 1),
    'core_gla_m2': round(core_gla), 'core_gla_sf': round(core_gla * 10.7639),
    'park_m2': round(park.area), 'vault_len': round(sum(x1 - x0 for x0, x1, _ in WINGS)), 'pav_d': '%dx%d' % (2 * PHX, 2 * PHY),
    'new_gfa_m2': round(tot['gfa']), 'total_gfa_m2': round(grand), 'far': round(grand / site_m2, 2),
    'resi_m2': round(tot['resi']), 'office_m2': round(tot['off']), 'retail_m2': round(tot['ret'] + core_gla),
    'units': int(round(units, -1)), 'n_buildings': len([r for r in B if r['kind'] != 'step']),
    'ground_open_pct': round(100 * (1 - ground_built / site_m2), 1),
    'max_fl': max(round((r['h']-5)/3.3)+1 for r in B),
    'trees': sum(len(v) for v in T.values()), 'people': len(PPL),
}


# ------------------------------------------------------------------ surrounding road network, MAX station, Holladay Park
CENTER = SITE.centroid
ctx_streets, ctx_trees, cars = [], [], []
# Near-site and context filters must be disjoint: each source way renders exactly once.
seen_trees = []
WD2 = dict(WD); WD2.update({'motorway': 22, 'trunk': 18, 'tram': 5})
for st in S['streets']:
    ls = LineString(st['pts'])
    dist = ls.distance(SITE)
    if not (dist < 480 and dist >= 30): continue
    pts_ = [[round(x, 1), round(y, 1)] for x, y in st['pts']]
    ctx_streets.append({'pts': pts_, 'w': WD2.get(st['cls'], 9), 'name': st.get('name', ''), 'cls': st['cls']})
# One continuous asphalt union across near/context segments; sidewalks are its difference.
_roads_all=streets+ctx_streets
_asphalt=unary_union([LineString(r['pts']).buffer(r['w']/2,cap_style=2,join_style=1) for r in _roads_all])
_asphalt=_asphalt.buffer(0.35,join_style=2).buffer(-0.35,join_style=2)  # close sub-metre seams between OSM segments (they drew curbs across the road)
_walk=unary_union([LineString(r['pts']).buffer(r['w']/2+3.5,cap_style=2,join_style=1) for r in _roads_all]).difference(_asphalt).difference(_obstacles)
# Street-scale detailing on all near/context roads, clipped at actual network junctions.
_rd_lines=[LineString(r['pts']) for r in _roads_all]
_junction_points=[]
for i,a in enumerate(_rd_lines):
    for b in _rd_lines[i+1:]:
        hit=a.intersection(b)
        if hit.geom_type=='Point':_junction_points.append(hit)
        elif hit.geom_type=='MultiPoint':_junction_points.extend(hit.geoms)
ROAD_DETAIL={'center':[],'center_double':[],'stopbar':[],'curbs':[],'parking':[],'junctions':[[p.x,p.y] for p in _junction_points]}
_jkeep=unary_union([p.buffer(8) for p in _junction_points])
_ARTERIAL=('Halsey','Multnomah','Broadway','Weidler')
for r,line in zip(_roads_all,_rd_lines):
    if line.length<5:continue
    _is_arterial=r['w']>=10 and any(k in r.get('name','') for k in _ARTERIAL)
    if _is_arterial:
        # Reference vocabulary: double solid yellow centerline with junction breaks.
        for sd in (-1,1):
            off=line.parallel_offset(0.26*sd)
            for part in ([off] if off.geom_type=='LineString' else getattr(off,'geoms',[])):
                clear=part.difference(_jkeep)
                for seg in ([clear] if clear.geom_type=='LineString' else getattr(clear,'geoms',[])):
                    if seg.geom_type=='LineString' and seg.length>2:ROAD_DETAIL['center_double'].append([[x,y] for x,y in seg.coords])
    elif r['w']>=12:
        d=6
        while d+3<line.length:
            a,b=line.interpolate(d),line.interpolate(d+3)
            if LineString([a,b]).distance(_jkeep)>0.2:ROAD_DETAIL['center'].append([[a.x,a.y],[b.x,b.y]])
            d+=10
    # White dashed same-direction dividers only where a second travel lane exists.
    if r['w']>=13 and not any(k in r.get('name','') for k in ('Broadway','Weidler')):
        for sd in (-1,1):
            off=line.parallel_offset(3.3*sd)
            for part in ([off] if off.geom_type=='LineString' else getattr(off,'geoms',[])):
                clear=part.difference(_jkeep)
                for seg in ([clear] if clear.geom_type=='LineString' else getattr(clear,'geoms',[])):
                    if seg.geom_type=='LineString' and seg.length>2:ROAD_DETAIL['parking'].append([[x,y] for x,y in seg.coords])
# Stop bars before each shifted junction crosswalk, split by approach half-width (right-hand traffic).
for cx,cy,ang in ((722.4,781.13,0.0),(960.0,779.97,0.0)):
    for sd in (-1,1):
        bx,by=cx+sd*3.2,cy
        for i,yy in enumerate((cy-11/2+0.6,cy,cy+11/2-0.6)):
            if (sd==-1 and i==0) or (sd==1 and i==2):ROAD_DETAIL['stopbar'].append([[bx,yy],[bx,cy] if i==0 else [bx,cy] if i==2 else [bx,yy]])
ROAD_DETAIL['stopbar']=[[(cx-3.2,cy-4.9),(cx-3.2,cy)] for cx,cy,_ in ((722.4,781.13,0),(960.0,779.97,0))]+[[(cx+3.2,cy),(cx+3.2,cy+4.9)] for cx,cy,_ in ((722.4,781.13,0),(960.0,779.97,0))]
# Aerial-grounded physical treatment: concrete junction collars and wheel-track wear bands.
ROAD_DETAIL['collars']=[]
for p in _junction_points:
    hit=Polygon(p.buffer(6.5)).intersection(_asphalt)
    for pp in ([hit] if hit.geom_type=='Polygon' else hit.geoms):
        if pp.area>12:ROAD_DETAIL['collars'].append({'outer':[[x,y] for x,y in list(pp.exterior.coords)[:-1]],'holes':[[[x,y] for x,y in list(i.coords)[:-1]] for i in pp.interiors]})
ROAD_DETAIL['wear']=[]  # wear bands removed: continuous lane clutter read as railroad tracks
# Curb follows UNION boundary: no artificial curb drawn through an intersection.
for pp in ([_asphalt] if _asphalt.geom_type=='Polygon' else _asphalt.geoms):
    for ring in [pp.exterior]+list(pp.interiors):
        pts=list(ring.coords)
        for a,b in zip(pts,pts[1:]):
            if math.dist(a,b)>0.15:ROAD_DETAIL['curbs'].append([list(a),list(b)])
# Roads blank: drop every painted marking (center dashes, double-yellow, stop bars); keep physical curbs/collars.
ROAD_DETAIL['center']=[];ROAD_DETAIL['center_double']=[];ROAD_DETAIL['stopbar']=[]
# Avoid fixed objects in the new through carriageway; leave park and rooftop planting untouched.
_new_access_pavement=unary_union([_common_pavement,LineString(WEST_10TH_ROUTE).buffer(4.5,cap_style=2,join_style=2),LineString(SE_ROUTE).buffer(3.5,cap_style=2,join_style=2)])
for key in T:
    if key not in ('deck','atrium'):T[key]=[q for q in T[key] if not _new_access_pavement.buffer(0.6).contains(Point(q[0],q[1]))]
for key in F:F[key]=[q for q in F[key] if not _new_access_pavement.buffer(0.6).contains(Point(q[0],q[1]))]
def roadpoly(g):
    return [{'outer':[[x,y] for x,y in list(p.exterior.coords)[:-1]],'holes':[[[x,y] for x,y in list(i.coords)[:-1]] for i in p.interiors]} for p in ( [g] if g.geom_type=='Polygon' else g.geoms) if p.geom_type=='Polygon']
ROAD_SURFACES={'asphalt':roadpoly(_asphalt),'sidewalk':roadpoly(_walk)}
_rm_ns=dict(globals()); exec(open('road_marks.py').read(), _rm_ns); cross=_rm_ns['cross']  # isolated namespace: no global clobbering
for _k in T:
    if _k not in ('deck','atrium'): T[_k]=[q for q in T[_k] if not _asphalt.buffer(0.8).contains(Point(q[0],q[1]))]
for _k in F: F[_k]=[q for q in F[_k] if not _asphalt.buffer(0.3).contains(Point(q[0],q[1]))]
def tree_ok(x, y, d=4.0):
    if len(seen_trees) > 0 and any(abs(x - a) < d and abs(y - b) < d for a, b in seen_trees[-80:]): return False
    return True
for st in ctx_streets:
    if st['cls'] in ('motorway',): continue
    ls = LineString(st['pts'])
    if ls.length < 20: continue
    for sd in (-1, 1):
        off = ls.parallel_offset(st['w'] / 2 + 3.4, sd if st['cls'] != 'tram' else 0)
        if off.is_empty: continue
        d = 3.0
        while d < off.length:
            p = off.interpolate(d)
            x, y = p.x, p.y
            if SITE.buffer(7).contains(Point(x, y)): d += 6; continue
            if tree_ok(x, y): seen_trees.append((round(x, 1), round(y, 1)))
            d += 10.5
        if len(seen_trees) > 760: break
    if len(seen_trees) > 760: break
ctx_trees = [[x, y] for x, y in seen_trees]
# parked cars along the two edges of the site ring
mcars = LineString([[648, 543.4], [1160, 543.4]])
d = 4.0
while d < mcars.length:
    if rnd := 1: pass
    p = mcars.interpolate(d)
    if random.random() < 0.62: cars.append([round(p.x, 1), 537.6, 0.0])
    d += 6.4
hchars = LineString([[648, 780.6], [1100, 780.6]])
d = 4.0
while d < hchars.length:
    p = hchars.interpolate(d)
    if random.random() < 0.6: cars.append([round(p.x, 1), 786.6, 0.0])
    d += 6.8

cars = []  # removed: OSM tags no kerbside parking on these frontages; old positions sat in travel lanes / on sidewalk
# MAX corridor: tracks (rail strips live in G.rails), platforms grouped into stations, canopies, catenary
lr = [LineString(r['pts']) for r in S['rails'] if r['kind'] == 'light_rail' and LineString(r['pts']).distance(SITE) < 620]
plat = [orient(Polygon(r['pts']), 1.0) for r in S['rails'] if r['kind'] == 'platform' and Polygon(r['pts']).distance(SITE) < 620]
stations = []
used = [False] * len(plat)
for i, p in enumerate(plat):
    if used[i]: continue
    grp = [p]; used[i] = True
    for j in range(i + 1, len(plat)):
        if not used[j] and p.distance(plat[j]) < 40: grp.append(plat[j]); used[j] = True
    if max(g.distance(SITE) for g in grp) > 320: continue
    tracks = [l for l in lr if l.distance(p) < 30]
    stations.append({'plats': [C(g) for g in grp], 'x': sum(g.centroid.x for g in grp) / len(grp),
                     'y': sum(g.centroid.y for g in grp) / len(grp), 'track_y': min(((l.interpolate(0.5).y if l.length else 0) for l in tracks), default=386.0)})
# catenary poles along the corridor
cat = []
for l in lr:
    d = 8.0
    while d < l.length:
        p = l.interpolate(d)
        cat.append([round(p.x, 1), round(p.y, 1)]); d += 30
# Holladay Park: paths, centre fountain circle, playground, grove, benches
PARK = orient(Polygon(S['parks'][0]['pts']), 1.0)
hp_paths = []
ring_in = PARK.buffer(-2.6, join_style=2)
hp_paths.append(C(ring_in))
minx, miny, maxx, maxy = PARK.bounds
cxs, cys = (minx + maxx) / 2, (miny + maxy) / 2
for a, b in [((minx, miny), (maxx, maxy)), ((minx, maxy), (maxx, miny))]:
    seg = LineString([a, b]).intersection(ring_in.buffer(-1.2))
    try:
        if not seg.is_empty:
            if seg.geom_type == 'LineString': hp_paths.append([[round(x, 1), round(y, 1)] for x, y in seg.coords])
            else:
                for g in seg.geoms: hp_paths.append([[round(x, 1), round(y, 1)] for x, y in g.coords])
    except Exception: pass
ploop = LineString(list(ring_in.exterior.coords))
hp_walk_line = lambda pth: [Point(x, y) for x, y in pth]
pg_x, pg_y = round(maxx - 15, 1), round(maxy - 14, 1)
hp_trees = []
n = 0
while n < 400 and len(hp_trees) < 130:
    x = random.uniform(minx + 3, maxx - 3); y = random.uniform(miny + 3, maxy - 3)
    p = Point(x, y)
    if ring_in.buffer(-2).contains(p) and ploop.distance(p) > 4.6 and math.hypot(x - cxs, y - cys) > 22 and math.hypot(x - pg_x, y - pg_y) > 13 and all((x - a) ** 2 + (y - b) ** 2 > 45 for a, b in hp_trees):
        hp_trees.append([round(x, 1), round(y, 1)])
    n += 1
hp_fountain = (round(cxs, 1), round(cys, 1))
hp_bench = []
d = 8.0
while d < ploop.length - 8:
    p = ploop.interpolate(d)
    if random.random() < 0.5: hp_bench.append([round(p.x, 1), round(p.y, 1)])
    d += 16
ctx_net = {
    'streets': ctx_streets, 'trees': ctx_trees, 'cars': cars, 'stations': stations, 'catenary': cat,
    'signals': [[634, 544], [634, 781], [790, 543], [926, 780.5], [790, 781], [1192, 543.5]],
    'busstops': [[712, 552.0], [868, 552.0], [995, 552.0], [634.0, 660]],
    'park': {'poly': C(PARK), 'paths': hp_paths, 'trees': hp_trees, 'fountain': list(hp_fountain),
             'playground': [pg_x, pg_y], 'benches': hp_bench},
    'labels': [['NE Broadway', 800, 872, 8], ['NE Weidler St', 780, 855, 6], ['NE Lloyd Blvd', 760, 322, 7],
               ['NE Grand Ave', 322, 640, 7], ['Martin Luther King Jr Blvd', 334, 560, 7], ['NE Halsey St', 700, 790, 6],
               ['Holladay Park', cxs, cys, 9], ['MAX · Lloyd Center / NE 11th Ave', 836, 372, 8], ['Banfield Fwy (I-84)', 660, 120, 8]],
}

KIOSK=[k for k in KIOSK if not _inL(k[0],k[1]) and not HALL.buffer(2).contains(Point(k[0],k[1]))]
# ------------------------------------------------------------------ procedural context infill (OSM gap fill; concept context, not survey)
# OSM maps ~0 buildings N/NE/E of the site within 700 m; ref_04 shows continuous mid-rise urban fabric there.
# Seeded parcels fill street-block interiors that contain no mapped building. Kept off roads, rails, park and site.
import random as _rr
_rg=_rr.Random(4417)
_road_mask=unary_union([_asphalt.buffer(4.0),_walk.buffer(1.0)]+[LineString(r['pts']).buffer(9) for r in S['rails']]+[LineString(s_['pts']).buffer(max(6,s_.get('w',10)/2+5)) for s_ in ctx_streets])
_mapped=unary_union([Polygon(b_['fp']).buffer(4) for b_ in S['context'] if len(b_.get('fp',[]))>=3])
_keep_out=unary_union([_road_mask,_mapped,SITE.buffer(14),PARK.buffer(6)])
CTX_INFILL=[]
_ring=Point(908,663).buffer(760).difference(Point(908,663).buffer(150))
for gx in range(120,1700,46):
    for gy in range(-100,1450,40):
        cx_,cy_=gx+_rg.uniform(-5,5),gy+_rg.uniform(-5,5)
        if not _ring.contains(Point(cx_,cy_)): continue
        w_,d_=_rg.uniform(22,38),_rg.uniform(18,30)
        fp_=box(cx_-w_/2,cy_-d_/2,cx_+w_/2,cy_+d_/2)
        if fp_.intersects(_keep_out): continue
        dist=Point(cx_,cy_).distance(SITE)
        fl_=_rg.choice([3,4,4,5,6,7,8,10,12]) if dist<320 else _rg.choice([2,3,3,4,5,6])
        CTX_INFILL.append({'fp':C(orient(fp_,1.0)),'h':round(5+3.3*(fl_-1),1),'name':'context infill (procedural)'})
        _keep_out=_keep_out.union(fp_.buffer(6))
CTX_INFILL=[]  # megablock focus: procedural off-site infill disabled
print('CTX infill parcels', len(CTX_INFILL))
esplanades=[C(orient(p,1.0)) for e in esplanades for p in polys(Polygon(e).difference(unary_union([Polygon(r['fp']) for r in B if r['z0']==0]))) if p.area>30]
_RTE=unary_union([LineString(COMMONS_ROUTE).buffer(3.5,cap_style=2),LineString(SE_ROUTE).buffer(4.0,cap_style=2)])
PPL=[p for p in PPL if not (p[2]<1 and _RTE.contains(Point(p[0],p[1])))]
_PYR_CLR=unary_union([Polygon(PYRAMID_REVISION['fp']),Polygon(PYRAMID_REVISION['connector_fp'])]).buffer(1.2,join_style=2)
KIOSK=[k for k in KIOSK if not _PYR_CLR.contains(Point(k[0],k[1]))]
PPL=[p for p in PPL if not _PYR_CLR.contains(Point(p[0],p[1]))]
P['bulbs']=[q for q in P['bulbs'] if not _PYR_CLR.contains(Point(q[0],q[1]))]
esplanades=[C(orient(p,1.0)) for e in esplanades for p in polys(Polygon(e).difference(Polygon(PYRAMID_REVISION['fp']).buffer(0.3,join_style=2))) if p.area>30]
_NB=unary_union([Polygon(r['fp']) for r in B if r.get('north_ref') and r['z0']==0]).buffer(0.8,join_style=2)
for _k in T:
    if _k not in ('deck','atrium'): T[_k]=[q for q in T[_k] if not _NB.contains(Point(q[0],q[1]))]
for _k in F: F[_k]=[q for q in F[_k] if not _NB.contains(Point(q[0],q[1]))]
PPL=[p for p in PPL if not (p[2]<1 and _NB.contains(Point(p[0],p[1])))]
out = {'kiosks': KIOSK, 'core': core, 'venue': venue, 'buildings': B, 'courtyards': courtyards,
       'curve_park': C(curve_park) if curve_park is not None else None,
       'paseos': paseos, 'esplanades': esplanades,
       'plaza': {'x': PLAZA_C[0], 'y': PLAZA_C[1], 'r': PLAZA_R},
       'trees': T, 'park': P, 'furniture': F, 'people': PPL, 'streets': streets, 'cross': cross,
       'rails': rails, 'fountain_detail':LY_FOUNTAIN_DETAIL, 'north_east_detail':ND, 'parcel_adjacency':PARCEL_ADJACENCY, 'north_depth_revision':NORTH_DEPTH_REVISION, 'height_revision':HEIGHT_REVISION, 'pyramid_revision':PYRAMID_REVISION, 'north_redesign':NORTH_REDESIGN, 'road_surfaces':ROAD_SURFACES, 'road_detail':ROAD_DETAIL, 'roofkit': roofkit, 'stats': stats, 'labels': LABELS, 'ctx_net': ctx_net, 'ctx_infill': CTX_INFILL, 'interior': INT,
       'site': C(SITE)}
json.dump(out, open('layout.json', 'w'), separators=(',', ':'))
print('collision gate: PASS (0 overlaps, %d footprints)' % len(foot))
print('buildings', len(B), '| trees', {k: len(v) for k, v in T.items()}, '| people', len(PPL))
print('park polys', len(park_polys), '| beds', len(P['beds']), '| posts', len(P['posts']), '| bulbs', len(P['bulbs']),
      '| pergolas', len(P['pergolas']), '| pods', len(P['pods']))
print('streets', len(streets), '| crosswalk stripes', len(cross), '| rails', len(rails), '| pv', len(roofkit['pv']))

print('STATS', json.dumps(stats))
