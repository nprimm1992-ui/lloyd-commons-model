"""Independent invariant audit of layout.json (separate from the asserts inside gen_layout.py).
Exit code 1 on any failure. Usage: python tools/check_invariants.py [layout.json]"""
import json, sys
from shapely.geometry import Polygon, LineString, box
from shapely.ops import unary_union

d = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'layout.json'))
B = d['buildings']; fails = []; ok = lambda c, m: c or fails.append(m)
ground = [(b['name'], Polygon(b['fp'])) for b in B if b['z0'] == 0]

# 1 ground footprints never overlap
for i in range(len(ground)):
    for j in range(i + 1, len(ground)):
        a = ground[i][1].intersection(ground[j][1]).area
        ok(a <= 0.5, f'overlap {ground[i][0]} x {ground[j][0]} = {a:.1f} m2')
# 2 height cap
ok(max(b['fl'] for b in B if b['z0'] == 0) <= 18 or d['stats']['max_fl'] <= 18, 'floor cap 18 exceeded')
ok(d['stats']['max_fl'] <= 18, f"stats.max_fl={d['stats']['max_fl']} > 18")
# 3 every upper tier sits on something
for b in B:
    if b['z0'] > 0.05:
        P = Polygon(b['fp'])
        sup = unary_union([Polygon(q['fp']) for q in B if abs(q['h'] - b['z0']) < 0.06 and q is not b]
                          + ([Polygon(x) for x in d['core']['bands']] if abs(b['z0'] - d['core']['POD_H']) < 0.06 else []))
        ok(not sup.is_empty and P.difference(sup.buffer(0.6)).area < 2.0, f'unsupported tier: {b["name"]}')
# 4 routes and lanes are clear of buildings
routes = {'Commons spine': (LineString([[633.4, 677], [1093, 677]]), 3.0),
          'Multnomah connector': (LineString([[1093, 541.6], [1093, 677]]), 3.5),
          '10th lane': (LineString([[712.4, 684], [712.4, 781.13]]), 4.5),
          'Pyramid lane': (LineString([[950, 684], [950, 779.97]]), 4.5)}
G = unary_union([p for _, p in ground])
for n, (ls, hw) in routes.items():
    a = ls.buffer(hw, cap_style=2).intersection(G).area
    ok(a < 0.05, f'{n} blocked by buildings ({a:.2f} m2)')
ok(box(737.5, 684, 746.5, 771.5).intersection(G).area < 0.05, 'keep strip x737.5-746.5 blocked')
# 5 north row: depth <= 64.5, sidewalk to spine >= 3.5 m
N = [Polygon(b['fp']) for b in B if b.get('north_ref') and b['z0'] == 0]
ok(len(N) >= 11, f'north row has {len(N)} ground stacks (expected 11)')
for comp in getattr(unary_union([p.buffer(0.01) for p in N]), 'geoms', [unary_union([p.buffer(0.01) for p in N])]):
    ok(comp.bounds[3] - comp.bounds[1] <= 64.55, f'north assembly depth {comp.bounds[3]-comp.bounds[1]:.1f} m > 64.5')
for p in N: ok(p.bounds[1] >= 683.9, f'north parcel inside spine sidewalk (y={p.bounds[1]:.1f})')
# 6 Pyramid Court: one record set, north tip <= 673
pyr = [b for b in B if b['name'] == 'Pyramid Court Building']
ok(len(pyr) == 1 and max(y for _, y in pyr[0]['fp']) <= 673.05, 'Pyramid Court missing or tip past y=673')

s = d['stats']
print(f"buildings={len(B)} ground={len(ground)} FAR={s['far']} units={s['units']} max_fl={s['max_fl']}")
if fails:
    print('INVARIANTS FAILED:'); [print('  -', f) for f in fails]; sys.exit(1)
print('INVARIANTS: PASS')
