import os; os.makedirs('out', exist_ok=True)
import json, numpy as np
from scipy.optimize import least_squares
from PIL import Image, ImageDraw
from shapely.geometry import Polygon
W_,H_=951,1024
# world (x east, y north, h up) -> pixel in ref_04, read off the gridded reference
P=[((714,627,24),(395,655)),   # W vault west-end crown
   ((859,627,24),(540,418)),   # W vault crown at hall
   ((895,619,33),(563,348)),   # hall roof apex
   ((1076,611,24),(645,222)),  # E vault far-end crown
   ((668,585,0),(568,965)),    # fountain centre
   ((931,611,24),(598,300))]   # E vault crown leaving hall
def proj(p,X):
    cx,cy,cz,yaw,pit,fov=p
    f=np.array([np.cos(pit)*np.cos(yaw),np.cos(pit)*np.sin(yaw),np.sin(pit)])
    r=np.cross(f,[0,0,1]); r/=np.linalg.norm(r); u=np.cross(r,f)
    d=np.asarray(X,float)-[cx,cy,cz]; z=d@f
    fy=(H_/2)/np.tan(fov/2)
    return np.c_[W_/2+fy*(d@r)/z, H_/2-fy*(d@u)/z]
Xw=np.array([a for a,_ in P]); Uv=np.array([b for _,b in P],float)
res=lambda p:(proj(p,Xw)-Uv).ravel()
best=None
for yaw0 in np.radians([10,25,40]):
  for h0 in (250,350,450):
    r=least_squares(res,[560,500,h0,yaw0,np.radians(-35),np.radians(42)],bounds=([300,250,80,-1,-1.5,np.radians(20)],[900,700,900,1.6,-0.1,np.radians(70)]))
    if best is None or r.cost<best.cost: best=r
p=best.x; e=np.abs(res(p)).reshape(-1,2); err=np.hypot(e[:,0],e[:,1])
print('pos',p[:3].round(1),'yaw',np.degrees(p[3]).round(1),'pitch',np.degrees(p[4]).round(1),'fov',np.degrees(p[5]).round(1))
print('per-point px err',err.round(1),'rms',np.sqrt((err**2).mean()).round(1))
f=np.array([np.cos(p[4])*np.cos(p[3]),np.cos(p[4])*np.sin(p[3]),np.sin(p[4])]); t=-p[2]/f[2]; tgt=p[:3]+f*t
print('tgt on ground',tgt.round(1))
json.dump({'pos':p[:3].round(1).tolist(),'tgt':tgt.round(1).tolist(),'fov':float(np.degrees(p[5]).round(2))},open('tools/cam.json','w'))
# overlay model footprints (ground) + roofs onto the reference
d=json.load(open('layout.json')); B=d['buildings']
im=Image.open('references/site_ref/ref_04.jpg').convert('RGB'); dr=ImageDraw.Draw(im,'RGBA')
g=[b for b in B if b['z0']==0]
for b in g:
    fp=np.array(b['fp']); 
    pts=proj(p,np.c_[fp,np.zeros(len(fp))]); dr.polygon([tuple(q) for q in pts],outline=(255,0,255,255))
    c=Polygon(b['fp']).representative_point(); q=proj(p,[[c.x,c.y,0]])[0]
    if Polygon(b['fp']).area>250: dr.text((q[0]-6,q[1]-5),str(b['id']),fill=(255,255,0,255))
for k,s in enumerate(d['core']['vault']['segs']):
    x0,x1,y=s; pts=proj(p,[[x0,y-12,0],[x1,y-12,0],[x1,y+12,0],[x0,y+12,0]]); dr.polygon([tuple(q) for q in pts],outline=(0,255,255,255))
for (X,uv) in P:
    q=proj(p,[X])[0]; dr.ellipse([uv[0]-5,uv[1]-5,uv[0]+5,uv[1]+5],outline=(255,0,0,255),width=2); dr.line([tuple(uv),tuple(q)],fill=(255,0,0,255),width=2)
site=np.array(d['site']); dr.line([tuple(q) for q in proj(p,np.c_[site,np.zeros(len(site))])],fill=(255,255,255,200),width=1)
im.save('out/ref04_overlay.png'); print('overlay saved')
