# ---------- regenerate BOTH proposals on shared block lattice ----------
import json, math
import numpy as np
from shapely.geometry import Polygon, LineString, Point
from shapely.ops import unary_union, split

scene = json.load(open('scene.json'))
site = Polygon(scene['site_boundary']); S = site.area
xs=[p[0] for p in scene['site_boundary']]; ys=[p[1] for p in scene['site_boundary']]
x0,x1,y0,y1 = min(xs),max(xs),min(ys),max(ys)

# grid module from surrounding streets (same method as before)
def street_xs_ys():
    xs_ns, ys_ew = [], []
    for s in scene['streets']:
        pts = s['pts']; brgs = []
        for i in range(len(pts)-1):
            dx,dy = pts[i+1][0]-pts[i][0], pts[i+1][1]-pts[i][1]
            if math.hypot(dx,dy)>50: brgs.append(math.degrees(math.atan2(dx,dy))%180)
        if not brgs: continue
        b = sorted(brgs)[len(brgs)//2]
        near = [p for p in pts if (x0-500<p[0]<x1+500 and y0-500<p[1]<y1+500)]
        if not near: continue
        if b < 25 or b > 155: xs_ns.append(round(float(np.median([p[0] for p in near]))))
        elif 65 < b < 115: ys_ew.append(round(float(np.median([p[1] for p in near]))))
    return sorted(set(xs_ns)), sorted(set(ys_ew))
def modules(vals):
    mods=[b-a for a,b in zip(vals, vals[1:]) if 55 < b-a < 220]
    return int(np.median(mods)) if mods else 100
xsv, ysv = street_xs_ys()
mod_ns = modules(xsv); mod_ew = modules(ysv)
ns_l = [x for x in range(int(x0//50)*50+mod_ns, int(x1), mod_ns) if x0+45 < x < x1-45]
ew_l = [y for y in range(int(y0//50)*50+mod_ew, int(y1), mod_ew) if y0+45 < y < y1-45]
blocks=[site]
for x in ns_l:
    nxt=[]
    for b in blocks: nxt += list(split(b, LineString([(x,y0-200),(x,y1+200)])).geoms)
    blocks=[b for b in nxt if b.area>400]
for y in ew_l:
    nxt=[]
    for b in blocks: nxt += list(split(b, LineString([(x0-200,y),(x1+200,y)])).geoms)
    blocks=[b for b in nxt if b.area>1500]
blocks=[b for b in blocks if b.area>2500]

mp=np.array(scene['mall']); c=mp.mean(axis=0)
w,v=np.linalg.eigh(np.cov((mp-c).T)); ax=v[:,np.argmax(w)]; sd=ax/np.linalg.norm(ax)
spine=site.intersection(LineString([c-sd*2000, c+sd*2000]))
if spine.geom_type=='MultiLineString': spine=max(spine.geoms, key=lambda g:g.length)
spine_pts=[[round(x,1),round(y,1)] for x,y in spine.coords]
sc = spine.interpolate(0.5, normalized=True)
hp=None
for p in scene['parks']:
    if p['name']=='Holladay Park':
        hpp=np.array(p['pts']); hp=(hpp[:,0].mean(), hpp[:,1].mean())
binfo=[]
for b in blocks:
    bc=b.centroid
    binfo.append({'poly':b,'d_spine':bc.distance(spine),'broadway':(bc.y-y0)<(y1-y0)*0.42})
binfo.sort(key=lambda r:r['d_spine'])
spine_blocks=[r for r in binfo if r['d_spine']<35]
dev=[r for r in binfo if r['d_spine']>=35]
dev_sorted_area = sorted(dev, key=lambda r:-r['poly'].area)
plaza_b = max(dev, key=lambda r: -(r['poly'].centroid.x+r['poly'].centroid.y))['poly']
market_b = min(dev, key=lambda r: Point(hp).distance(r['poly'].centroid))['poly'] if hp else dev_sorted_area[0]['poly']

FL_H,GF_H=3.5,5.0
def build(variant):
    blds=[]
    def add(fp,fl,prog,name):
        if fp.geom_type=='MultiPolygon':
            for q in fp.geoms: add(q,fl,prog,name)
            return
        if fp.area<120 or fp.is_empty: return
        h=GF_H+(fl-1)*FL_H if fl>1 else GF_H
        blds.append({'fp':[[round(x,1),round(y,1)] for x,y in fp.exterior.coords],'fl':fl,'h':round(h,1),'prog':prog,'name':name})
    n_t=0
    if variant=='commons':
        tower_b=[r['poly'] for r in dev_sorted_area[:2]]
        for i,r in enumerate(dev):
            b=r['poly']
            band=b.buffer(-10); inner=b.buffer(-30); ring=band.difference(inner)
            trects=[]
            if any(b.equals(t) for t in tower_b):
                tc=b.centroid
                for sx,sy in ((-1,-1),(1,1)):
                    tr=Polygon([(tc.x+sx*40-16,tc.y+sy*32-16),(tc.x+sx*40+16,tc.y+sy*32-16),(tc.x+sx*40+16,tc.y+sy*32+16),(tc.x+sx*40-16,tc.y+sy*32+16)]).intersection(b)
                    if not tr.is_empty and tr.area>400: trects.append(tr)
            ring=ring.difference(spine.buffer(17)).difference(plaza_b.centroid.buffer(30)).difference(market_b.centroid.buffer(46))
            for tr in trects: ring=ring.difference(tr)
            fl = (8 if r['broadway'] else 6) + (i%4)
            prog = {'resi':0.40,'off':0.45,'ret':0.15} if r['broadway'] else {'resi':0.75,'off':0.10,'ret':0.15}
            add(ring.simplify(1.5), fl, prog, f"Perimeter block {chr(65+i%26)}")
            for tr in trects:
                add(tr, 24, {'resi':0.85,'off':0.05,'ret':0.10}, f"Resi Tower {n_t+1}"); n_t+=1
        for r in spine_blocks:
            b=r['poly']
            ring=b.buffer(-10).difference(b.buffer(-22)).difference(spine.buffer(20)).simplify(1.5)
            add(ring, 4, {'resi':0.70,'off':0.05,'ret':0.25}, "Spine podium")
    else:  # URG-intensity: slab-and-tower, podiums 9-13, 30-fl towers mid-site, Broadway edge held at 9-12
        tower_b=[r['poly'] for r in dev_sorted_area[:8]]
        for i,r in enumerate(dev):
            b=r['poly']
            band=b.buffer(-9); inner=b.buffer(-33); ring=band.difference(inner)
            trects=[]
            if any(b.equals(t) for t in tower_b):
                tc=b.centroid
                for sx,sy in ((-1,0),(1,0),(-1,0),(0,1)):
                    pass
                for sx,sy in ((-1,-1),(1,1),(1,-1)):
                    tr=Polygon([(tc.x+sx*42-19,tc.y+sy*34-19),(tc.x+sx*42+19,tc.y+sy*34-19),(tc.x+sx*42+19,tc.y+sy*34+19),(tc.x+sx*42-19,tc.y+sy*34+19)]).intersection(b)
                    if not tr.is_empty and tr.area>500: trects.append(tr)
                trects=trects[:3]
            ring=ring.difference(spine.buffer(17)).difference(plaza_b.centroid.buffer(30)).difference(market_b.centroid.buffer(46))
            for tr in trects: ring=ring.difference(tr)
            fl = (12 if r['broadway'] else 9) + (i%3)
            prog = {'resi':0.45,'off':0.40,'ret':0.15} if r['broadway'] else {'resi':0.80,'off':0.08,'ret':0.12}
            add(ring.simplify(1.5), fl, prog, f"Podium block {chr(65+i%26)}")
            for tr in trects:
                add(tr, 30, {'resi':0.88,'off':0.04,'ret':0.08}, f"Resi Tower {n_t+1}"); n_t+=1
        for r in spine_blocks:
            b=r['poly']
            ring=b.buffer(-9).difference(b.buffer(-24)).difference(spine.buffer(20)).simplify(1.5)
            add(ring, 6, {'resi':0.70,'off':0.05,'ret':0.25}, "Spine podium")
    mk_c=market_b.centroid
    market=Polygon([(mk_c.x-30,mk_c.y-18),(mk_c.x+30,mk_c.y-18),(mk_c.x+30,mk_c.y+18),(mk_c.x-30,mk_c.y+18)]).intersection(market_b)
    if market.is_empty: market=market_b
    add(market, 1, {'resi':0.0,'off':0.0,'ret':1.0}, "Market Hall")
    GFA=RESI=OFF=RET=0.0
    for b in blds:
        g=Polygon(b['fp']).area*b['fl']; GFA+=g
        RESI+=g*b['prog']['resi']; OFF+=g*b['prog']['off']; RET+=g*b['prog']['ret']
    UNITS=RESI*0.82/85; SPACES=UNITS*0.75+RET/300; LEV=SPACES*33/(S*0.55)
    stats={'site_m2':round(S),'site_acres':round(S/4046.86,1),'n_buildings':len(blds),'gfa_m2':round(GFA),'far':round(GFA/S,2),
     'resi_m2':round(RESI),'office_m2':round(OFF),'retail_m2':round(RET),'units':int(UNITS),'parking_spaces':int(SPACES),
     'parking_levels':round(LEV,1),'spine_len_m':round(spine.length),'mod_ns':mod_ns,'mod_ew':mod_ew,
     'note':'GFA=footprint x floors; parking 0.75 sp/unit below grade; units at 85 m2 gross, 0.82 efficiency'}
    out={'buildings':blds,'spine':{'pts':spine_pts,'width':26,'radius':12.5,'eave':6.0},
     'hub':{'x':round(sc.x,1),'y':round(sc.y,1),'size':40,'h':26},
     'market':{'fp':[[round(x,1),round(y,1)] for x,y in market.exterior.coords],'h':12},
     'plaza':{'x':round(plaza_b.centroid.x,1),'y':round(plaza_b.centroid.y,1),'r':28},'stats':stats}
    return out
p1 = build('commons'); p2 = build('urgmax')
json.dump(p1, open('proposal.json','w')); json.dump(p2, open('proposal2.json','w')); json.dump(p1, open('_p1.json','w'))
for nm,p in (('COMMONS',p1),('URG-MAX',p2)):
    st=p['stats']
    print(f"{nm}: GFA {st['gfa_m2']/1e6:.2f}M | FAR {st['far']} | units ~{st['units']:,} | bldgs {st['n_buildings']} | parking {st['parking_spaces']:,}")
