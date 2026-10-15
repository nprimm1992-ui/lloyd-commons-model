import json, urllib.request, concurrent.futures as cf, os
op=urllib.request.build_opener(); op.addheaders=[("User-Agent","Mozilla/5.0 LloydCommonsModel")]; urllib.request.install_opener(op)
SETS = ['red_brick','red_brick_03','large_red_bricks','concrete_wall_008','beige_wall_001','japanese_cedar_planks','corrugated_iron_02','box_profile_metal_sheet','large_grey_tiles','concrete_pavement_02','red_brick_pavers','asphalt_02','leafy_grass','aerial_grass_rock','gravel_concrete_02','grass_ground']
jobs=[]
for s in SETS:
    d=json.load(urllib.request.urlopen('https://api.polyhaven.com/files/'+s, timeout=20))
    for m,res in [('Diffuse','1k'),('nor_gl','1k'),('Rough','1k')]:
        if m in d: jobs.append((d[m][res]['jpg']['url'], '%s_%s.jpg'%(s,{'Diffuse':'diff','nor_gl':'nor','Rough':'rough'}[m])))
hd=json.load(urllib.request.urlopen('https://api.polyhaven.com/files/qwantani_late_afternoon_puresky', timeout=20))
jobs.append((hd['hdri']['1k']['hdr']['url'],'sky_1k.hdr'))
def get(j):
    u,f=j
    for a in range(4):
        try:
            if os.path.exists(f) and os.path.getsize(f) > 50000: break
            urllib.request.urlretrieve(u,f); break
        except Exception as e:
            if os.path.exists(f): os.remove(f)
    return f, os.path.getsize(f) if os.path.exists(f) else 0
with cf.ThreadPoolExecutor(4) as ex:
    for r in ex.map(get, jobs): pass
print(len(jobs),'files', sum(os.path.getsize(f) for _,f in jobs)//1024,'KB')
