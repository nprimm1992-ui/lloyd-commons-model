import json, math, statistics
from shapely.geometry import Polygon, LineString
from shapely.ops import unary_union

RAW = json.load(open('osm_raw.json'))
els = RAW['elements']
LAT_REF, LON_REF = 45.5266, -122.6647
def mlat(lat): return 111132.95 - 559.85*math.cos(2*math.radians(lat)) + 1.175*math.cos(4*math.radians(lat))
def mlon(lat): return 111412.84*math.cos(math.radians(lat)) - 93.5*math.cos(3*math.radians(lat))
SXL, SYL = mlon(LAT_REF), mlat(LAT_REF)
LON0, LAT0 = LON_REF, LAT_REF   # origin refined later to mall centroid

def to_local_m(coords):
    return [((lon-LON0)*SXL, (lat-LAT0)*SYL) for lon, lat in coords]

blds, parks, retail_lu, parking, rails, streets = [], [], [], [], [], []
for e in els:
    tags = e.get('tags', {}); t = e['type']
    if t == 'way' and 'geometry' in e:
        pts = [(p['lon'], p['lat']) for p in e['geometry'] if isinstance(p, dict) and 'lat' in p]
        if len(pts) < 2: continue
        rec = {'tags': tags, 'pts': pts}
        if 'building' in tags: blds.append(rec)
        elif 'highway' in tags: streets.append(rec)
        elif 'railway' in tags: rails.append(rec)
        elif tags.get('leisure') in ('park','garden'): parks.append(rec)
        elif tags.get('landuse') in ('retail','commercial'): retail_lu.append(rec)
        elif tags.get('amenity') == 'parking': parking.append(rec)
    elif t == 'relation' and 'members' in e:
        outers = [[(p['lon'],p['lat']) for p in m['geometry'] if isinstance(p,dict) and 'lat' in p]
                  for m in e['members'] if m.get('role')=='outer' and 'geometry' in m]
        if not outers: continue
        rec = {'tags': tags, 'outers': outers}
        if 'building' in tags: blds.append(rec)
        elif tags.get('leisure') == 'park': parks.append(rec)

def to_poly_m(rec):
    polys = []
    if 'outers' in rec:
        for o in rec['outers']:
            if len(o) >= 4 and o[0] == o[-1]:
                polys.append(Polygon(to_local_m(o)))
    else:
        p = rec['pts']
        if len(p) >= 4 and p[0] == p[-1]:
            polys.append(Polygon(to_local_m(p)))
    polys = [q for q in polys if q.is_valid and q.area > 40]
    return unary_union(polys) if polys else None

mall_poly, mall_rec = None, None
for r in blds:
    p = to_poly_m(r)
    if p is None or p.area < 25000: continue
    d = math.hypot(p.centroid.x, p.centroid.y)
    if mall_poly is None or d < mall_d:
        mall_poly, mall_d, mall_rec = p, d, r
print(f"MALL: {mall_poly.area:,.0f} m2  ({mall_rec['tags'].get('name','-')})  centroid offset from ref: {mall_d:.0f} m")

site = unary_union([mall_poly])
for r in retail_lu:
    p = to_poly_m(r)
    if p and 'Lloyd' in r['tags'].get('name','') and p.distance(mall_poly) < 120: site = unary_union([site, p])
site = site.buffer(2).buffer(-2)
n_park_abs = 0
for r in parking:
    p = to_poly_m(r)
    if p and p.distance(site) < 15 and p.area > 300:
        site = unary_union([site, p]); n_park_abs += 1
site = site.simplify(1.0)
print(f"SITE: {site.area:,.0f} m2 = {site.area/4046.86:.1f} acres   (target 27.1-29.3 ac, absorbed {n_park_abs} parking fields)")

context = []
for r in blds:
    p = to_poly_m(r)
    if p is None or mall_poly.buffer(2).contains(p) or site.buffer(2).contains(p): continue
    tags = r['tags']; h = None
    try: h = float(tags.get('height','').replace('m','').strip())
    except: pass
    if h is None:
        try: h = float(tags.get('building:levels',''))*3.3
        except: pass
    if h is None: h = 24 if p.area > 4000 else 15 if p.area > 1500 else 8
    context.append({'fp': list(p.exterior.coords), 'h': min(h,163), 'name': tags.get('name','')[:40]})

veh = {'motorway','trunk','primary','secondary','tertiary','motorway_link','trunk_link','primary_link','secondary_link','unclassified','residential','living_street','busway'}
street_out, rail_out, park_out = [], [], []
angs = []
for r in streets:
    if r['tags'].get('highway') not in veh: continue
    line = LineString(to_local_m(r['pts']))
    if line.distance(site) > 450: continue
    street_out.append({'cls': r['tags']['highway'], 'name': r['tags'].get('name','')[:32], 'pts': [list(c) for c in line.coords]})
    if any(k in r['tags'].get('name','') for k in ('Multnomah','Broadway','Holladay','Halsey','Irving')):
        pts = to_local_m(r['pts'])
        for i in range(len(pts)-1):
            dx, dy = pts[i+1][0]-pts[i][0], pts[i+1][1]-pts[i][1]
            if math.hypot(dx,dy) > 40:
                b = math.degrees(math.atan2(dx,dy)) % 180
                if 60 < b < 120: angs.append(b)
grid_rot = (statistics.median(angs) - 90) if angs else 0.0
for r in rails:
    line = LineString(to_local_m(r['pts']))
    if line.distance(site) > 600: continue
    rail_out.append({'name': r['tags'].get('name','')[:30], 'kind': r['tags'].get('railway',''), 'pts': [list(c) for c in line.coords]})
for r in parks:
    p = to_poly_m(r)
    if p and p.distance(site) < 500: park_out.append({'name': r['tags'].get('name','')[:30], 'pts': [list(c) for c in p.exterior.coords]})

def polys_of(g):
    return [list(g.exterior.coords)] if g.geom_type == 'Polygon' else [list(q.exterior.coords) for q in g.geoms]

scene = {
 'meta': {'origin_lat': LAT0, 'origin_lon': LON0, 'crs': f"WGS84 (EPSG:4326) -> local ENU meters @ {LAT0:.5f},{LON0:.5f}",
          'grid_rot_deg': round(grid_rot,2), 'site_area_m2': round(site.area), 'mall_area_m2': round(mall_poly.area),
          'source': 'OpenStreetMap via Overpass API, fetched 2026-10-12'},
 'site_boundary': [list(c) for c in polys_of(site)[0]],
 'site_extra_rings': [[list(c) for c in pg] for pg in polys_of(site)[1:]],
 'mall': [list(c) for c in polys_of(mall_poly)[0]],
 'parking': [[list(c) for c in p.exterior.coords] for r in parking if (p:=to_poly_m(r)) and p.distance(site)<120 and p.area>200],
 'context': [{'fp': c['fp'], 'h': round(c['h'],1), 'name': c['name']} for c in context],
 'streets': street_out, 'rails': rail_out, 'parks': park_out,
}
json.dump(scene, open('scene.json','w'))
xs=[p[0] for p in scene['site_boundary']]; ys=[p[1] for p in scene['site_boundary']]
print(f"context={len(scene['context'])} streets={len(street_out)} rails={len(rail_out)} parks={[p['name'] for p in park_out]} parking={len(scene['parking'])}")
print(f"site extents: {max(xs)-min(xs):.0f} E-W x {max(ys)-min(ys):.0f} N-S m | grid rot {grid_rot:+.2f} deg")
print("rail lines:", [(r['name'], r['kind'], len(r['pts'])) for r in rail_out][:10])
