# Road markings derived from OpenStreetMap lane tags (osm_lane_tags.json), not invented.
# Executed inside gen_layout.py after _asphalt / ROAD_SURFACES exist.
# Rules (MUTCD / PBOT practice, right-hand traffic):
#   two-way   -> double solid yellow between opposing directions; centre two-way-left-turn lane -> solid+dashed yellow pair
#   same-direction lanes -> white dashed (3 m dash / 9 m gap)
#   cycleway=lane -> solid white bike-lane line (1.8 m lane at that curb)
#   cycleway=track -> separated, no carriageway paint
#   crossings: only nodes with marked/signalised crossing tags -> continental bars across that carriageway
#   stop bars: on every approach into a traffic_signals junction, approach half only, set back from the crosswalk
# Every mark is clipped to the modelled asphalt (minus junction boxes), so paint can never land off a road.
import json as _json, math as _m
from shapely.geometry import LineString as _LS, Point as _P
from shapely.ops import unary_union as _UU
_OSM = _json.load(open('osm_lane_tags.json'))
_FIT = [[1.001704, 0.000142], [0.0, 1.005062], [-0.001271, 0.181569]]  # raw OSM ENU -> scene (460 vertex pairs, rms 0.12 m)
def _T(p): return (p[0]*_FIT[0][0] + p[1]*_FIT[1][0] + _FIT[2][0], p[0]*_FIT[0][1] + p[1]*_FIT[1][1] + _FIT[2][1])
_LANE = 3.3; _BIKE = 1.8
_paint_zone = _asphalt.buffer(-0.25)
_near = SITE.buffer(160)
_named_w = []
for _r in _roads_all: _named_w.append((_LS(_r['pts']), _r['w']))
def _width_at(pt):
    best = None
    for L, w in _named_w:
        d = L.distance(pt)
        if d < 3 and (best is None or w > best): best = w
    return best or 9
_sig = [_T(n['xy']) for n in _OSM['nodes'] if n['tags'].get('highway') == 'traffic_signals']
_marked = []
for n in _OSM['nodes']:
    t = n['tags']
    if t.get('highway') != 'crossing': continue
    if t.get('crossing') in ('unmarked', 'no') or t.get('crossing:markings') == 'no': continue
    if t.get('crossing') in ('traffic_signals', 'marked', 'zebra', 'uncontrolled') or t.get('crossing:markings') not in (None, 'no') or t.get('crossing:signals') == 'yes':
        _marked.append(_T(n['xy']))
_junc = [_T(j) for j in _OSM['junctions']]
_jbox = []
for j in _junc:
    jp = _P(j)
    if not _near.contains(jp): continue
    has_x = any(_m.dist(j, c) < 16 for c in _marked) or any(_m.dist(j, s) < 2 for s in _sig)
    r = _width_at(jp) / 2 + (4.6 if has_x else 1.2)
    # radius = half the widest crossing carriageway + crosswalk band
    ws = sorted([w for L, w in _named_w if L.distance(jp) < 3], reverse=True)
    if ws: r = ws[0] / 2 + (4.6 if has_x else 1.2)
    _jbox.append(jp.buffer(r))
_jclear = _UU(_jbox) if _jbox else None
_zone = _paint_zone.difference(_jclear) if _jclear is not None else _paint_zone
def _parts(g):
    if g.is_empty: return []
    if g.geom_type == 'LineString': return [g]
    return [p for p in getattr(g, 'geoms', []) if p.geom_type == 'LineString']
def _clip(line):
    return [p for p in _parts(line.intersection(_zone)) if p.length > 1.5]
RM = {'white_dash': [], 'white_solid': [], 'yellow_solid': [], 'yellow_dash': [], 'stopbar': [], 'cross': [], 'audit': []}
def _dash(line, dash=3.0, gap=9.0):
    out = []; d = 1.0
    while d + dash <= line.length:
        a, b = line.interpolate(d), line.interpolate(d + dash); out.append([[round(a.x, 2), round(a.y, 2)], [round(b.x, 2), round(b.y, 2)]]); d += dash + gap
    return out
def _poly(l): return [[round(x, 2), round(y, 2)] for x, y in l.coords]
def _lanecfg(t):
    n = int(t.get('lanes', '2').split(';')[0]) if t.get('lanes', '').split(';')[0].isdigit() else 2
    one = t.get('oneway') in ('yes', '1', 'true')
    c = int(t.get('lanes:both_ways', '0')) if not one else 0
    if one: f, b = n, 0
    else:
        f = int(t['lanes:forward']) if 'lanes:forward' in t else None
        b = int(t['lanes:backward']) if 'lanes:backward' in t else None
        if f is None and b is None: f = (n - c + 1) // 2; b = n - c - f
        elif f is None: f = n - c - b
        elif b is None: b = n - c - f
    cyc = lambda side: t.get('cycleway:' + side) or t.get('cycleway:both') or t.get('cycleway')
    bl = cyc('left') == 'lane'; br = cyc('right') == 'lane'
    if one and t.get('cycleway') == 'lane' and not t.get('cycleway:left'): bl, br = False, True
    return one, f, b, c, bl, br
for w in _OSM['ways']:
    L = _LS([_T(p) for p in w['pts']])
    if L.length < 5 or not _near.intersects(L): continue
    if L.intersection(_paint_zone).length < 0.6 * L.length: continue  # real road not modelled here -> no paint
    t = w['tags']; one, f, b, c, bl, br = _lanecfg(t)
    nl = f + b + c
    if nl <= 0: continue
    wm = _width_at(L.interpolate(0.5, normalized=True))
    lane = min(_LANE, max(2.7, (wm - _BIKE * (bl + br) - 0.4) / nl))
    tot = lane * nl + _BIKE * (bl + br)
    if tot > wm - 0.3:  # still too wide: drop bike lanes before squeezing lanes below 2.7 m
        RM['audit'].append({'way': w['id'], 'name': w['name'], 'note': 'carriageway narrower than tagged cross-section', 'need': round(tot, 1), 'model_w': wm})
    left = tot / 2  # offsets measured to the LEFT of travel direction (+)
    pos = left
    cuts = []  # (offset, kind)
    if bl: pos -= _BIKE; cuts.append((pos, 'white_solid'))
    for i in range(b):
        pos -= lane
        if i < b - 1: cuts.append((pos, 'white_dash'))
    if not one:
        if c:
            cuts.append((pos, 'yellow_solid')); cuts.append((pos - 0.3, 'yellow_dash'))
            pos -= lane * c
            cuts.append((pos + 0.3, 'yellow_dash')); cuts.append((pos, 'yellow_solid'))
        elif b and f:
            cuts.append((pos + 0.15, 'yellow_solid')); cuts.append((pos - 0.15, 'yellow_solid'))
    for i in range(f):
        if i > 0: cuts.append((pos, 'white_dash'))
        pos -= lane
    if br: cuts.append((pos, 'white_solid'))
    for off, kind in cuts:
        try: oc = L.offset_curve(off)
        except Exception: continue
        for seg in _clip(oc):
            if kind.endswith('dash'): RM[kind].extend(_dash(seg))
            else: RM[kind].append(_poly(seg))
    w['_cfg'] = (one, f, b, c, bl, br, lane, tot)
    w['_L'] = L
# continental crosswalks: bars run parallel to traffic, 0.6 m wide, 0.6 m gaps, 3.0 m long
_ways_live = [w for w in _OSM['ways'] if '_L' in w]
for cpt in _marked:
    P = _P(cpt)
    if not _near.contains(P): continue
    cand = [(w['_L'].distance(P), w) for w in _ways_live]
    if not cand: continue
    d, w = min(cand, key=lambda q: q[0])
    if d > 1.6: continue
    L = w['_L']; s = L.project(P)
    a, b = L.interpolate(max(0, s - 1)), L.interpolate(min(L.length, s + 1))
    tx, ty = b.x - a.x, b.y - a.y; tl = _m.hypot(tx, ty) or 1; tx, ty = tx / tl, ty / tl
    nx, ny = -ty, tx
    q = L.interpolate(s)
    half = _width_at(q) / 2 - 0.4
    k = -half + 0.3
    while k <= half - 0.3:
        x, y = q.x + nx * k, q.y + ny * k
        if _paint_zone.contains(_P(x, y)): RM['cross'].append([round(x, 2), round(y, 2), round(-_m.atan2(ty, tx), 4), 3.0])
        k += 1.2
# stop bars on each approach into a signalised junction
for sp in _sig:
    S_ = _P(sp)
    if not _near.contains(S_): continue
    for w in _ways_live:
        L = w['_L']
        if L.distance(S_) > 1.5: continue
        one, f, b, c, bl, br, lane, tot = w['_cfg']
        s0 = L.project(S_)
        for sgn in (-1, 1):  # arm before (-1) or after (+1) the signal node along the way
            if (sgn < 0 and s0 < 6) or (sgn > 0 and L.length - s0 < 6): continue
            xs = [L.project(_P(c_)) for c_ in _marked if L.distance(_P(c_)) < 1.6]
            xs = [abs(x - s0) for x in xs if (x - s0) * sgn > 0 and abs(x - s0) < 20]
            back = (min(xs) + 1.5 + 1.2) if xs else (_width_at(S_) / 2 + 4.6 + 1.2)
            sl = s0 + sgn * back
            if not (0 < sl < L.length): continue
            p = L.interpolate(sl); a, b2 = L.interpolate(max(0, sl - 1)), L.interpolate(min(L.length, sl + 1))
            tx, ty = b2.x - a.x, b2.y - a.y; tl = _m.hypot(tx, ty) or 1; tx, ty = tx / tl, ty / tl; nx, ny = -ty, tx
            # traffic INTO the node: on arm before it travels forward (right half); after it travels backward (left half)
            if sgn < 0: lo, hi = (-tot / 2, tot / 2) if one else (-tot / 2, 0)
            else:
                if one: continue
                lo, hi = (0, tot / 2)
            A = (p.x + nx * lo, p.y + ny * lo); B = (p.x + nx * hi, p.y + ny * hi)
            seg = _LS([A, B]).intersection(_paint_zone.buffer(0.2))
            for pp in _parts(seg): RM['stopbar'].append(_poly(pp))
ROAD_DETAIL.update({k: v for k, v in RM.items() if k not in ('cross', 'audit')})
ROAD_DETAIL['center'] = []; ROAD_DETAIL['center_double'] = []; ROAD_DETAIL['parking'] = []  # legacy guessed dividers
ROAD_DETAIL['source'] = 'OSM lane tags (API 0.6 map extract 2026-10-14); marks clipped to modelled asphalt; concept routes unmarked'
ROAD_DETAIL['audit'] = RM['audit']
cross = RM['cross']
print('ROADMARKS', {k: len(v) for k, v in RM.items()})
