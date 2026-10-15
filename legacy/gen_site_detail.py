# ---------- site-detail enrichment v2: bars + parapets + rooftops + courtyards ----------
import json, math
import numpy as np
from shapely.geometry import Polygon, LineString, Point
from shapely.ops import unary_union, split
from shapely import affinity
scene = json.load(open('scene.json'))
site = Polygon(scene['site_boundary']); S = site.area
P0 = json.load(open('proposal2.json'))  # to recover spine/market/plaza/hub geometry
Pc = json.load(open('_commons_cache.json')) if False else None
# rebuild commons base from gen_proposals output (regenerate quickly if missing)
import os
if not os.path.exists('_p1.json'):
    raise SystemExit('run gen_proposals.py first')
P1 = json.load(open('_p1.json'))
blds = P1['buildings']
new_blds, roofs, courtyards, parapets, rooftops = [], [], [], [], []
def pca_angle(fp):
    pts = np.array(fp); c = pts.mean(axis=0)
    w,v = np.linalg.eigh(np.cov((pts-c).T))
    a = v[:, np.argmax(w)]
    return math.atan2(a[1], a[0])
def bars_from_ring(fp, fl, prog, name):
    poly = Polygon(fp); c = poly.centroid
    bb = poly.bounds
    cuts = [LineString([(bb[0]-100, c.y+(bb[3]-bb[1])*0.28), (bb[2]+100, c.y+(bb[3]-bb[1])*0.28)]),
            LineString([(bb[0]-100, c.y-(bb[3]-bb[1])*0.28), (bb[2]+100, c.y-(bb[3]-bb[1])*0.28)])]
    pieces=[poly]
    for ln in cuts:
        nxt=[]
        for p in pieces: nxt += list(split(p, ln).geoms)
        pieces = nxt
    bars = [p for p in pieces if p.area > 220]
    bars = [affinity.scale(b, xfact=0.86, yfact=0.86, origin=b.centroid) for b in bars]
    court = poly.difference(unary_union(bars)) if len(bars)>1 else None
    out=[]
    for k,b in enumerate(bars):
        out.append({'fp':[[round(x,1),round(y,1)] for x,y in b.exterior.coords],'fl':fl,'h':round(5.0+(fl-1)*3.5,1),'prog':prog,'name':f'{name} \u00b7 bar {k+1}'})
    return out, court, poly.area - sum(b.area for b in bars)
idx=0
for b in blds:
    if b['fl'] <= 7 and 'Tower' not in b['name'] and b['name'] != 'Market Hall':
        bars, court, court_area = bars_from_ring(b['fp'], b['fl'], b['prog'], b['name'].replace('Perimeter block ','Block ').replace('Spine podium','Spine'))
        for bar in bars:
            bar_idx = len(new_blds)
            new_blds.append(bar)
            fpoly = Polygon(bar['fp'])
            ang = pca_angle(bar['fp'])
            # parapet ring (thin, at roof)
            inner = fpoly.buffer(-0.55)
            if not inner.is_empty and inner.area > 5:
                ring = fpoly.difference(inner)
                for g in (ring.geoms if ring.geom_type=='MultiPolygon' else [ring]):
                    parapets.append({'fp':[[round(x,1),round(y,1)] for x,y in g.exterior.coords],'h':0.75,'at':bar['h'],'bar':bar_idx})
            # rooftop items on flat low bars
            c = fpoly.centroid
            if 'Tower' not in bar['name'] and bar['fl'] >= 3:
                # PV array: two tilted panels long-axis aligned
                dx,dy = math.cos(ang), math.sin(ang)
                for off in (-7, 7):
                    px, py = c.x+dx*off, c.y+dy*off
                    rooftops.append({'kind':'pv','x':round(px,1),'y':round(py,1),'w':12,'d':5,'rot':round(ang,3),'at':bar['h'],'bar':bar_idx})
                rooftops.append({'kind':'pent','x':round(c.x+dx*16,1),'y':round(c.y+dy*16,1),'w':5.5,'d':4.2,'rot':round(ang,3),'at':bar['h'],'bar':bar_idx})
            if court is not None and not court.is_empty and court_area > 200:
                for g in (court.geoms if court.geom_type=='MultiPolygon' else [court]):
                    if g.area > 150:
                        courtyards.append({'fp':[[round(x,1),round(y,1)] for x,y in g.exterior.coords],'area':round(g.area),'bar':bar_idx})
                court = None
    else:
        new_blds.append(b)
    idx+=1
# green roofs on podium-height bars (visual decks)
for j,b in enumerate(new_blds):
    if b['fl'] <= 7 and b['name'] != 'Market Hall':
        roofs.append({'fp': b['fp'], 'h': b['h'], 'kind': 'farm' if 'Spine' in b['name'] else 'green'})
# trees (same placement rules as before, plus courtyards)
trees = []
def add_tree(x,y,s=1.0):
    if site.contains(Point(x,y)): trees.append([round(float(x),1), round(float(y),1), round(float(s),2)])
xs=[p[0] for p in scene['site_boundary']]; ys=[p[1] for p in scene['site_boundary']]
x0,x1,y0,y1 = min(xs),max(xs),min(ys),max(ys)
for x in [758,837,916,995,1074]:
    for y in np.arange(540, 790, 34): add_tree(x+4.5, y, 0.85+0.35*np.random.rand())
for y in [628,706]:
    for x in np.arange(570, 1230, 34): add_tree(x, y+4.5, 0.85+0.35*np.random.rand())
pl = P1['plaza']
for k in range(14):
    a = k/14*2*math.pi; add_tree(pl['x']+math.cos(a)*23, pl['y']+math.sin(a)*23, 1.0)
sp = P1['spine']['pts']
for i in range(0, len(sp)-6, 6):
    a = np.array(sp[i]); b = np.array(sp[i+3]); d = b-a; L = np.linalg.norm(d); n = np.array([-d[1],d[0]])/L
    for sgn in (1,-1):
        p = a + n*sgn*20; add_tree(p[0], p[1], 0.9+0.2*np.random.rand())
for c in courtyards:
    cc = np.array(c['fp']); m = cc.mean(axis=0)
    for dx,dy in ((-6,-4),(7,4)): add_tree(m[0]+dx, m[1]+dy, 0.8)
mkc = Polygon(P1['market']['fp']).centroid
for dx in (-20,20): add_tree(mkc.x+dx, mkc.y-26, 0.8)
# venue + stalls (same as before)
vx, vy = pl['x']-46, pl['y']
venue_base = Polygon([(vx-22,vy-16),(vx+8,vy-16),(vx+8,vy+16),(vx-22,vy+16)]).intersection(site)
if venue_base.is_empty: venue_base = Polygon([(vx-18,vy-14),(vx+6,vy-14),(vx+6,vy+14),(vx-18,vy+14)])
vb=[[round(x,1),round(y,1)] for x,y in venue_base.exterior.coords]
venue = {'base_fp': vb, 'base_h': 12, 'upper_fp': [[vx-14,vy-10],[vx+4,vy-10],[vx+4,vy+10],[vx-14,vy+10]], 'upper_h': 22, 'name':'Music Venue'}
stalls = []
for k in range(8):
    stalls.append({'x': round(mkc.x-60+k*15,1), 'y': round(mkc.y-34,1)})
FP = sum(Polygon(b['fp']).area for b in new_blds)
vault_strip = P1['stats']['spine_len_m'] * 26
open_space = S - FP - vault_strip
st = dict(P1['stats']); st['n_buildings'] = len(new_blds)
st['open_space_m2'] = round(max(open_space,0)); st['open_space_pct'] = round(100*max(open_space,0)/S,1)
st['courtyard_m2'] = sum(c['area'] for c in courtyards); st['n_courtyards'] = len(courtyards)
st['trees'] = len(trees)
st['gfa_m2'] = round(sum(Polygon(b['fp']).area*b['fl'] for b in new_blds))
RESI = sum(Polygon(b['fp']).area*b['fl']*b['prog']['resi'] for b in new_blds)
OFF = sum(Polygon(b['fp']).area*b['fl']*b['prog']['off'] for b in new_blds)
RET = sum(Polygon(b['fp']).area*b['fl']*b['prog']['ret'] for b in new_blds)
st['resi_m2']=round(RESI); st['office_m2']=round(OFF); st['retail_m2']=round(RET)
st['units']=int(RESI*0.82/85); st['far']=round(st['gfa_m2']/S,2)
st['parking_spaces']=int(st['units']*0.75+RET/300); st['parking_levels']=round(st['parking_spaces']*33/(S*0.55),1)
out = {'buildings': new_blds, 'spine': P1['spine'], 'hub': P1['hub'], 'market': P1['market'], 'plaza': P1['plaza'],
       'roofs': roofs, 'trees': trees, 'courtyards': courtyards, 'parapets': parapets, 'rooftops': rooftops,
       'venue': venue, 'stalls': stalls, 'stats': st}
json.dump(out, open('proposal.json','w'))
print(f"v2: {len(new_blds)} bars, {len(parapets)} parapets, {len(rooftops)} rooftop items, {len(courtyards)} courtyards, {len(roofs)} green roofs, {len(trees)} trees, FAR {st['far']}, units {st['units']:,}, open {st['open_space_pct']}%")
