import json, matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon as MPoly, Circle, Rectangle
import numpy as np
S = json.load(open('scene.json')); P = json.load(open('proposal.json'))
fig, ax = plt.subplots(figsize=(20,11.5), dpi=200); fig.patch.set_facecolor('#f4f1e9'); ax.set_facecolor('#e9e6da')
sb = np.array(S['site_boundary']); x0,x1=sb[:,0].min(),sb[:,0].max(); y0,y1=sb[:,1].min(),sb[:,1].max()
for s in S['streets']:
    pts=np.array(s['pts']); ax.plot(pts[:,0],pts[:,1],color='#c9c5b8',lw=1.4,zorder=1)
for b in S['context']:
    fp=np.array(b['fp']); ax.add_patch(MPoly(fp,closed=True,fc='#d8d7d0',ec='#b5b4ac',lw=0.3,zorder=2))
ax.add_patch(MPoly(sb,closed=True,fc='#f0ece0',ec='#b0452f',lw=2.4,ls=(0,(6,3)),zorder=4))
for x in [758,837,916,995,1074]:
    ax.plot([x,x],[y0-20,y1+20],color='#ffffff',lw=7,zorder=4.4,solid_capstyle='round')
    ax.plot([x,x],[y0-20,y1+20],color='#b9b3a2',lw=0.8,zorder=4.45)
for y in [628,706]:
    ax.plot([x0-20,x1+20],[y,y],color='#ffffff',lw=7,zorder=4.4)
    ax.plot([x0-20,x1+20],[y,y],color='#b9b3a2',lw=0.8,zorder=4.45)
sp=np.array(P['spine']['pts']); ax.plot(sp[:,0],sp[:,1],color='#9dbecb',lw=13,zorder=5,solid_capstyle='round')
ax.plot(sp[:,0],sp[:,1],color='#57798a',lw=1,zorder=5.05)
for t in P['trees']:
    ax.add_patch(Circle((t[0],t[1]),2.6,fc='#7ca05f',ec='#4f7040',lw=0.5,zorder=6))
for b in P['buildings']:
    fp=np.array(b['fp']); pr=b['prog']; dom=max(pr,key=pr.get)
    fc={'resi':'#c07a5e','off':'#71839c','ret':'#dcae72'}[dom]
    ax.add_patch(MPoly(fp,closed=True,fc=fc,ec='#6d4a3e',lw=0.6,zorder=7))
    ax.annotate(f"{b['fl']}",(fp[:,0].mean(),fp[:,1].mean()),fontsize=6.5,color='#3d342c',ha='center',va='center',zorder=9)
for r in P['roofs']:
    fp=np.array(r['fp']); ax.add_patch(MPoly(fp,closed=True,fc='#8fae6a',ec='#5e7a44',lw=0.4,alpha=0.55,zorder=7.5,hatch='oo'))
pl=P['plaza']
ax.add_patch(Circle((pl['x'],pl['y']),28,fc='#ddd7c8',ec='#a29b8a',lw=1,zorder=6.2))
ax.add_patch(Circle((pl['x'],pl['y']),20,fc='#e6e1d2',ec='#b5ae9c',lw=0.7,zorder=6.25))
ax.add_patch(Circle((pl['x'],pl['y']),14,fc='#8fb9cc',ec='#4e6d7c',lw=1.2,zorder=6.3))
ax.add_patch(Circle((pl['x'],pl['y']),5,fc='#5e93ab',ec='none',zorder=6.35))
mk=np.array(P['market']['fp']); ax.add_patch(MPoly(mk,closed=True,fc='#bd8f5a',ec='#7d5c39',lw=1.2,zorder=7.2))
v=P['venue']; vb=np.array(v['base_fp']); ax.add_patch(MPoly(vb,closed=True,fc='#4a4f57',ec='#2e3238',lw=1,zorder=7.3))
vu=np.array(v['upper_fp']); ax.add_patch(MPoly(vu,closed=True,fc='#c99e6a',ec='#8a6238',lw=1,zorder=7.35))
for s in P['stalls']:
    ax.add_patch(Rectangle((s['x']-5,s['y']-3.5),10,7,fc='#efe9dc',ec='#8a7350',lw=0.8,zorder=7.4))
letters={}
for b in P['buildings']:
    nm=b['name'].split(' ·')[0]
    if nm.startswith('Block') and nm not in letters:
        fp=np.array(b['fp']); letters[nm]=1
        ax.annotate(nm,(fp[:,0].mean(),fp[:,1].min()-9),fontsize=8,color='#5d4a3a',ha='center',zorder=10,fontweight='bold')
ax.annotate('THE GALLERIA SPINE — retained vault 515 m',(sp[:,0].mean(),sp[:,1].mean()+22),fontsize=10,color='#3d5560',ha='center',fontweight='bold',zorder=10)
ax.annotate('MARKET HALL',(mk[:,0].mean(),mk[:,1].mean()),fontsize=8.5,color='#4a3826',ha='center',va='center',fontweight='bold',zorder=10)
ax.annotate('MUSIC VENUE',(vb[:,0].mean(),vb[:,1].mean()),fontsize=7,color='#e8e4da',ha='center',va='center',fontweight='bold',zorder=10)
ax.annotate('FOUNTAIN PLAZA',(pl['x'],pl['y']-40),fontsize=8,color='#4a4a42',ha='center',zorder=10)
st=P['stats']
ax.set_xlim(x0-60,x1+60); ax.set_ylim(y0-70,y1+60); ax.set_aspect('equal')
ax.set_title('LLOYD COMMONS — SITE PLAN (concept massing, courtyard-block fabric)',fontsize=15,fontweight='bold',loc='left',color='#23272b',pad=12)
ax.tick_params(labelsize=6,colors='#8b897f')
ax.annotate('',xy=(x0+10,y0-45),xytext=(x0+160,y0-45),arrowprops=dict(arrowstyle='-|>',color='#43464b'))
ax.text(x0+55,y0-40,'100 m',fontsize=7,color='#43464b')
ax.text(x1-380,y0-40,f"site {st['site_acres']} ac · GFA {st['gfa_m2']:,} m² · FAR {st['far']}:12 · ~{st['units']:,} homes (85 m²/u)\nopen space {st['open_space_pct']}% ({st['open_space_m2']:,} m² incl. {st['courtyard_m2']:,} m² courtyards) · {st['trees']} new trees · parking {st['parking_spaces']:,} UG",fontsize=9,color='#43464b')
from matplotlib.lines import Line2D
from matplotlib.patches import Patch
handles=[Patch(fc='#c07a5e',ec='#6d4a3e'),Patch(fc='#71839c',ec='#6d4a3e'),Patch(fc='#dcae72',ec='#6d4a3e'),Patch(fc='#8fae6a',ec='#5e7a44',hatch='oo'),Circle((0,0),1,fc='#9dbecb',ec='#57798a'),Circle((0,0),1,fc='#7ca05f',ec='#4f7040'),Patch(fc='#4a4f57',ec='#2e3238')]
ax.legend(handles,['Residential-led','Office-led','Retail podium','Green roof / farm','Galleria vault','Tree canopy','Music venue'],loc='upper left',fontsize=8,ncol=7,framealpha=0.9)
plt.tight_layout()
plt.savefig('lloyd_site_plan.png',bbox_inches='tight'); plt.savefig('lloyd_site_plan.pdf',bbox_inches='tight')
print('site plan saved')
