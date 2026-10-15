import json, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon as MPoly, Circle, FancyArrow
import numpy as np
S = json.load(open('scene.json')); P = json.load(open('proposal.json'))
fig, axes = plt.subplots(1, 2, figsize=(22, 12), dpi=200)
fig.patch.set_facecolor('#f2efe8')
def draw_base(ax, title):
    ax.set_facecolor('#eceadf')
    for s in S['streets']:
        w = {'motorway':6,'trunk':5,'primary':4,'secondary':3,'tertiary':2.5,'unclassified':1.6,'residential':1.6,'living_street':1.4,'busway':2,'motorway_link':3,'trunk_link':3,'primary_link':3,'secondary_link':2.5}.get(s['cls'],1.2)
        pts = np.array(s['pts']); ax.plot(pts[:,0], pts[:,1], color='#b7b3a6' if s['cls'] not in ('primary','secondary','motorway','trunk') else '#a3a099', lw=w, zorder=1, solid_capstyle='round')
    for r in S['rails']:
        if r['kind'] in ('rail','light_rail','tram'):
            pts = np.array(r['pts']); ax.plot(pts[:,0], pts[:,1], color='#3a3f45', lw=1.6, ls=(0,(5,3)), zorder=2)
    for p in S['parks']:
        ax.add_patch(MPoly(np.array(p['pts']), closed=True, fc='#a8c297', ec='#7e9c6e', lw=1, zorder=2))
        pts = np.array(p['pts']); ax.annotate(p['name'], (pts[:,0].mean(), pts[:,1].mean()), fontsize=7.5, color='#43523a', ha='center', zorder=8)
    for p in S['parking']:
        ax.add_patch(MPoly(np.array(p), closed=True, fc='#dcd7c9', ec='#b9b3a2', lw=0.5, zorder=2.5, hatch='...'))
    for b in S['context']:
        ax.add_patch(MPoly(np.array(b['fp']), closed=True, fc='#c5c4bd', ec='#9a998f', lw=0.3, zorder=3))
    sb = np.array(S['site_boundary']); ax.add_patch(MPoly(sb, closed=True, fc='none', ec='#b0452f', lw=2.2, ls=(0,(6,3)), zorder=6))
    ax.set_title(title, fontsize=13, fontweight='bold', color='#2c2f33', loc='left', pad=10)
    ax.set_aspect('equal'); ax.grid(True, which='both', color='#e0ddd2', lw=0.4, zorder=0)
    ax.tick_params(labelsize=6, colors='#8b897f')
draw_base(axes[0], 'A — EXISTING CONDITIONS (Oct 2026): Lloyd Center, closed 8 Aug 2026')
mall = np.array(S['mall']); axes[0].add_patch(MPoly(mall, closed=True, fc='#cbb9a4', ec='#93826d', lw=1, zorder=4))
mctr = mall.mean(axis=0); axes[0].annotate('Lloyd Center\n113,949 m\u00b2 footprint', (mctr[0], mctr[1]), ha='center', fontsize=9, color='#5d5344', zorder=9)
axes[1].set_facecolor('#ece8db')
draw_base(axes[1], 'B — LLOYD COMMONS PROPOSAL: grid reconnected, vault spine retained')
st = P['stats']
for b in P['buildings']:
    fp = np.array(b['fp']); pr = b['prog']
    dom = max(pr, key=pr.get)
    fc = {'resi':'#b0604a','off':'#54627a','ret':'#d2a05e'}[dom]
    axes[1].add_patch(MPoly(fp, closed=True, fc=fc, ec='#6d4a3e', lw=0.5, alpha=0.92, zorder=5))
sp = np.array(P['spine']['pts']); axes[1].plot(sp[:,0], sp[:,1], color='#8fb6c4', lw=11, zorder=4.5, solid_capstyle='round')
axes[1].plot(sp[:,0], sp[:,1], color='#5d8896', lw=1, zorder=4.6)
sctr = sp.mean(axis=0); axes[1].annotate('The Galleria Spine — retained vault, 515 m', (sctr[0], sctr[1]-30), ha='center', fontsize=8, color='#3d5560', zorder=9)
pl = P['plaza']; axes[1].add_patch(Circle((pl['x'],pl['y']), pl['r'], fc='#d6d0c2', ec='#a29b8a', lw=1, zorder=4.2))
axes[1].add_patch(Circle((pl['x'],pl['y']), 6, fc='#7fb2c9', ec='none', zorder=4.3))
mk = np.array(P['market']['fp']); axes[1].add_patch(MPoly(mk, closed=True, fc='#bd8f5a', ec='#7d5c39', lw=1, zorder=5))
for x in [758,837,916,995,1074]: axes[1].axvline(x, color='#9b6a4f', lw=0.9, ls=(0,(2,3)), zorder=3.5)
for y in [628,706]: axes[1].axhline(y, color='#9b6a4f', lw=0.9, ls=(0,(2,3)), zorder=3.5)
for ax in axes:
    xlim = (550,1250); ylim=(520,800)
    ax.set_xlim(xlim[0]+ (550-520)*0 - 0, xlim[1]); ax.set_ylim(ylim[0], ylim[1])
axes[1].set_xlim(550,1250); axes[1].set_ylim(520,800); axes[0].set_xlim(550,1250); axes[0].set_ylim(520,800)
axes[1].annotate('NEW interior streets: 79 m module\n(measured from surrounding grid)', (700, 535), fontsize=7.5, color='#7d4a33', zorder=9)
info = (f"LLOYD COMMONS — CONCEPT MASSING  |  site {st['site_acres']} ac ({st['site_m2']:,} m2)  |  GFA {st['gfa_m2']:,} m2  |  FAR {st['far']}:12  |  "
        f"~{st['units']:,} homes  |  parking {st['parking_spaces']:,} sp UG  |  datum: WGS84 local ENU  |  grid rot +0.23 deg  |  geodata: OpenStreetMap 2026-10-12")
fig.text(0.5, 0.045, info, ha='center', fontsize=9.5, color='#43464b',
         bbox=dict(boxstyle='round,pad=0.6', fc='#f7f5ee', ec='#b7b3a6'))
axes[0].annotate('', xy=(560,540), xytext=(660,540), arrowprops=dict(arrowstyle='-|>', color='#43464b'))
axes[0].text(565,548,'100 m', fontsize=7, color='#43464b')
plt.tight_layout(rect=[0,0.07,1,1])
plt.savefig('lloyd_tech_plan.png', bbox_inches='tight')
plt.savefig('lloyd_tech_plan.pdf', bbox_inches='tight')
print("tech plan saved")
