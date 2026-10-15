import json, numpy as np, sys
from shapely.geometry import Polygon, Point
from shapely.prepared import prep
d=json.load(open(sys.argv[1] if len(sys.argv)>1 else 'layout.json')); B=d['buildings']
xs=np.arange(640,1180,2.0); ys=np.arange(550,780,2.0); H=np.zeros((len(ys),len(xs)))
for b in B:
    P=Polygon(b['fp']); top=b['h']; x0,y0,x1,y1=P.bounds; pp=prep(P)
    for j,y in enumerate(ys):
        if y0<=y<=y1:
            for i,x in enumerate(xs):
                if x0<=x<=x1 and H[j,i]<top and pp.contains(Point(x,y)): H[j,i]=top
cov=H>0; a=cov.sum()*4; fl=(H[cov]-5)/3.3+1
print(f'coverage {a:.0f} m2 ({a/113881*100:.0f}%) | mean fl {fl.mean():.1f} median {np.median(fl):.1f} max {fl.max():.0f} ({H.max():.0f} m)')
for lo,hi,n in [(0,4,'1-3'),(4,8,'4-7'),(8,13,'8-12'),(13,19,'13-18'),(19,99,'19+')]:
    m=((fl>=lo)&(fl<hi)).sum()*4; print(f'  {n:6s}{m/a*100:5.1f}%')
s=d['stats']; print('GFA',s['new_gfa_m2'],'FAR',s['far'],'units',s['units'])
