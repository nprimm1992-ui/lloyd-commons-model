# ---------- Dec 21 solstice shadow study (corrected metrics) ----------
import json, math
import numpy as np
from shapely.geometry import Polygon, box
from shapely.ops import unary_union
from shapely import affinity
try:
    from shapely import constrained_delaunay_triangles as CDT
    HAS_CDT = True
except Exception:
    HAS_CDT = False
from shapely.ops import triangulate
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon as MPoly

LAT, LON = 45.5266, -122.6647
scene = json.load(open('scene.json')); P1 = json.load(open('proposal.json')); P2 = json.load(open('proposal2.json'))

def solar(dec_day, hour_pst):
    g = 2*math.pi/365*(dec_day-1)
    eqt = 229.18*(0.000075+0.001868*math.cos(g)-0.032077*math.sin(g)-0.014615*math.cos(2*g)-0.040849*math.sin(2*g))
    hs = hour_pst + (LON-(-120))/15 + eqt/60.0
    ha = math.radians(15*(hs-12)); lat = math.radians(LAT)
    dec = math.radians(-23.44)
    sin_alt = math.sin(lat)*math.sin(dec)+math.cos(lat)*math.cos(dec)*math.cos(ha)
    alt = math.degrees(math.asin(max(-1,min(1,sin_alt))))
    az = (180 + math.degrees(math.atan2(math.sin(ha), math.cos(ha)*math.sin(lat)-math.tan(dec)*math.cos(lat)))) % 360
    return az, alt
a,n = solar(355, 12.15)
assert abs(n-21.0)<0.6 and abs(a-180)<1.0, (a,n)
# direction sanity: noon shadow of a pole must fall due NORTH (+y)
L0 = 100/math.tan(math.radians(n)); dx0=-L0*math.sin(math.radians(a)); dy0=-L0*math.cos(math.radians(a))
assert dy0 > 95 and abs(dx0) < 5, (dx0, dy0)
print("sanity ok: noon az %.1f alt %.1f, 100 m pole shadow -> (%.1f, %.1f) N-pointing" % (a, n, dx0, dy0))

def shadow(fp, h, az, alt):
    if h <= 0 or alt <= 1.5: return None
    Lh = h/math.tan(math.radians(alt))
    dx = -Lh*math.sin(math.radians(az)); dy = -Lh*math.cos(math.radians(az))
    base = Polygon(fp)
    if not base.is_valid: base = base.buffer(0)
    if base.is_empty: return None
    tris = list(CDT(base).geoms) if HAS_CDT else triangulate(base)
    acc = None
    for t in tris:
        if t.area < 1: continue
        hull = t.union(affinity.translate(t, dx, dy)).convex_hull
        acc = hull if acc is None else unary_union([acc, hull])
    return acc

def spine_rect(P):
    sp = P['spine']['pts']; a0=np.array(sp[0]); a1=np.array(sp[-1])
    mid=(a0+a1)/2; L=np.linalg.norm(a1-a0); ang=math.atan2(a1[1]-a0[1], a1[0]-a0[0])
    ca,sa=math.cos(ang),math.sin(ang)
    return [[mid[0]+ca*L/2-sa*13, mid[1]+sa*L/2+ca*13],[mid[0]+ca*L/2+sa*13, mid[1]+sa*L/2-ca*13],
            [mid[0]-ca*L/2+sa*13, mid[1]-sa*L/2-ca*13],[mid[0]-ca*L/2-sa*13, mid[1]-sa*L/2+ca*13]], L

def scenario_shadow(P, az, alt, mall_mode=False):
    sh = []
    if mall_mode:
        s = shadow(scene['mall'], 15.0, az, alt)
        if s: sh.append(s)
    else:
        for b in P['buildings']:
            s = shadow(b['fp'], b['h'], az, alt)
            if s: sh.append(s)
        rect,_ = spine_rect(P)
        s = shadow(rect, 18.5, az, alt)
        if s: sh.append(s)
        m = shadow(P['market']['fp'], P['market']['h'], az, alt)
        if m: sh.append(m)
        hu = P['hub']
        s = shadow([(hu['x']-20,hu['y']-20),(hu['x']+20,hu['y']-20),(hu['x']+20,hu['y']+20),(hu['x']-20,hu['y']+20)], hu['h'], az, alt)
        if s: sh.append(s)
    return unary_union(sh) if sh else None

sb = np.array(scene['site_boundary'])
x0,x1 = sb[:,0].min(), sb[:,0].max(); y0,y1 = sb[:,1].min(), sb[:,1].max()
halsey = box(x0-10, y1, x1+10, y1+30)       # NE Halsey band, north of site
park_poly = None
for p in scene['parks']:
    if p['name']=='Holladay Park': park_poly = Polygon(p['pts'])
plaza = Polygon([(P1['plaza']['x']-28,P1['plaza']['y']-28),(P1['plaza']['x']+28,P1['plaza']['y']-28),(P1['plaza']['x']+28,P1['plaza']['y']+28),(P1['plaza']['x']-28,P1['plaza']['y']+28)])
srect,_ = spine_rect(P1)
HOURS = [9,10,11,12,13,14,15]
res = {}
for h in HOURS:
    az, alt = solar(355, h)
    row = {}
    for nm, P, mm in (('mall',None,True),('commons',P1,False),('max',P2,False)):
        sh = scenario_shadow(P, az, alt, mm)
        d = {'area': sh.area, 'halsey_pct': 100*sh.intersection(halsey).area/halsey.area} if sh else None
        if d and park_poly: d['park_pct'] = 100*sh.intersection(park_poly).area/park_poly.area
        elif park_poly: d['park_pct'] = 0.0
        if d and not mm:
            d['plaza_pct'] = 100*sh.intersection(plaza).area/plaza.area
            d['spineface_pct'] = 100*Polygon(srect).intersection(sh).area/Polygon(srect).area
        row[nm] = d
    res[h] = {'az': az, 'alt': alt, **row}
    f = lambda nm,k: f"{res[h][nm][k]:5.1f}" if res[h][nm] else "  n/a"
    print(f"{h:02d}:00 az {az:5.1f} alt {alt:4.1f} | Halsey mall {f('mall','halsey_pct')} com {f('commons','halsey_pct')} max {f('max','halsey_pct')} | Park com {f('commons','park_pct')} max {f('max','park_pct')} | Plaza com {f('commons','plaza_pct')} max {f('max','plaza_pct')}")
json.dump(res, open('shadow_results.json','w'))

fig = plt.figure(figsize=(22,13), dpi=200); fig.patch.set_facecolor('#f2efe8')
gs = fig.add_gridspec(2, 3, height_ratios=[1.35,1], hspace=0.22, wspace=0.14)
map_ax = [fig.add_subplot(gs[0,i]) for i in range(3)]
chart_ax = fig.add_subplot(gs[1,:])
def base(ax, title):
    ax.set_facecolor('#e8e4d6')
    for s in scene['streets']:
        wdt = {'motorway':5,'trunk':4,'primary':3.4,'secondary':2.6,'tertiary':2}.get(s['cls'],1.2)
        pts=np.array(s['pts']); ax.plot(pts[:,0],pts[:,1],color='#bcb8ab',lw=wdt,zorder=1)
    for b in scene['context']:
        ax.add_patch(MPoly(np.array(b['fp']),closed=True,fc='#c9c8c0',ec='#9a998f',lw=0.3,zorder=3))
    for p in scene['parks']:
        ax.add_patch(MPoly(np.array(p['pts']),closed=True,fc='#a8c297',ec='#7e9c6e',lw=0.8,zorder=2.5))
    ax.add_patch(MPoly(sb,closed=True,fc='#efe9da',ec='#b0452f',lw=1.6,ls=(0,(5,3)),zorder=5))
    ax.add_patch(MPoly(halsey.exterior.coords,closed=True,fc='#f5d7a8',ec='#c9982f',lw=1.2,alpha=0.55,zorder=4))
    if park_poly: ax.add_patch(MPoly(list(park_poly.exterior.coords),closed=True,fc='#bcd6a8',ec='#5e7a44',lw=1.2,zorder=4.1))
    ax.set_title(title,fontsize=11,fontweight='bold',loc='left',color='#2c2f33')
    ax.set_aspect('equal'); ax.set_xlim(x0-360,x1+360); ax.set_ylim(y0-240,y1+330); ax.tick_params(labelsize=6,colors='#8b897f')
titles = ['9:00 AM PST','12:00 PM PST (solar noon 12:09)','3:00 PM PST']
for i,hour in enumerate([9,12,15]):
    az,alt = solar(355,hour); ax = map_ax[i]
    base(ax, f"Dec 21 · {titles[i]} · sun az {az:.0f}° alt {alt:.1f}°")
    mall_sh = scenario_shadow(None, az, alt, True)
    if mall_sh:
        for g in (mall_sh.geoms if mall_sh.geom_type=='MultiPolygon' else [mall_sh]):
            ax.add_patch(MPoly(list(g.exterior.coords),closed=True,fc='#7d848d',ec='none',alpha=0.28,zorder=5.5))
    for nm,P,col,al,z in (('commons',P1,'#31404d',0.40,6),('max',P2,'#4a2f5e',0.32,6.2)):
        sh = scenario_shadow(P, az, alt, False)
        if sh:
            for g in (sh.geoms if sh.geom_type=='MultiPolygon' else [sh]):
                ax.add_patch(MPoly(list(g.exterior.coords),closed=True,fc=col,ec=col,alpha=al,lw=0,zorder=z))
    for b in P2['buildings']:
        if b['fl']>=30:
            fp=np.array(b['fp']); ax.plot(fp[:,0].mean(),fp[:,1].mean(),'^',color='#4a2f5e',ms=5,zorder=8)
    ax.text(x0-330, y1+272, f"shadow reach at alt {alt:.0f}°:  15 m mall → {15/math.tan(math.radians(alt)):.0f} m   |   105 m tower → {105/math.tan(math.radians(alt)):.0f} m", fontsize=8, color='#43464b', zorder=9)
    ax.text(x0-330, y1+245, "gray = existing mall shadow   ·   dark navy = Commons   ·   purple = URG-intensity   ·   ▲ = 30-fl tower", fontsize=8, color='#43464b', zorder=9)
hrs=HOURS; x=np.arange(len(hrs)); wdt=0.26
def arr(nm,k):
    return [res[h][nm][k] if res[h][nm] else 0 for h in hrs]
b1=chart_ax.bar(x-wdt, arr('mall','halsey_pct'), wdt, color='#9aa0a6', label='Existing mall — NE Halsey band')
b2=chart_ax.bar(x,    arr('commons','halsey_pct'), wdt, color='#b0604a', label='Lloyd Commons — NE Halsey band')
b3=chart_ax.bar(x+wdt, arr('max','halsey_pct'), wdt, color='#4a2f5e', label='URG-intensity — NE Halsey band')
chart_ax.plot(x, arr('mall','park_pct'),'o--',color='#6b7076',lw=1.4,ms=5,label='Holladay Park — mall')
chart_ax.plot(x, arr('commons','park_pct'),'o--',color='#d08a5f',lw=1.4,ms=5,label='Holladay Park — Commons')
chart_ax.plot(x, arr('max','park_pct'),'o--',color='#8a5aa0',lw=1.4,ms=5,label='Holladay Park — URG-intensity')
chart_ax.set_xticks(x); chart_ax.set_xticklabels([f'{h}:00' for h in hrs]); chart_ax.set_ylabel('% of area in shadow (Dec 21)',fontsize=10)
chart_ax.set_title('Solstice shadow exposure — NE Halsey 30 m band (bars) & Holladay Park (dashed). Plaza self-shading at noon: Commons %.0f%%, URG-intensity %.0f%%. Spine vault shadowed: Commons %.0f%%, URG-intensity %.0f%%.'
 % (res[12]['commons']['plaza_pct'], res[12]['max']['plaza_pct'], res[12]['commons']['spineface_pct'], res[12]['max']['spineface_pct']),
 fontsize=12,fontweight='bold',color='#2c2f33')
chart_ax.legend(fontsize=9,ncol=3,loc='upper right'); chart_ax.grid(axis='y',color='#e0ddd2'); chart_ax.set_facecolor('#f7f5ee')
for bars in (b1,b2,b3):
    for r in bars:
        if r.get_height()>0.5: chart_ax.text(r.get_x()+r.get_width()/2, r.get_height()+0.4, f'{r.get_height():.0f}', ha='center', fontsize=7, color='#43464b')
fig.suptitle('LLOYD COMMONS — DECEMBER SOLSTICE SHADOW STUDY  ·  Portland 45.53°N  ·  NOAA solar position, per-triangle prism shadows  ·  note: sun stays south — site cannot shadow Broadway; constraints are Halsey (AM), Holladay Park (PM), and self-shading  ·  geodata: OpenStreetMap 2026-10-12',
             fontsize=13,fontweight='bold',y=0.985,color='#23272b')
plt.savefig('lloyd_shadow_study.png',bbox_inches='tight'); plt.savefig('lloyd_shadow_study.pdf',bbox_inches='tight')
print("figure saved, HAS_CDT =", HAS_CDT)
