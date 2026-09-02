# -*- coding: utf-8 -*-
"""
REFERENCE ONLY -- not imported, not run, not maintained. Kept for one reason:
its "page furniture" drawing code (paper grain/vignette/dapple, road/place
labels, the cartouche, the compass rose -- see the bottom third of the file,
roughly from `INVENTED = [...]` on) has not yet been ported into `citymap/`.
`citymap/render.py` produces a correct, undecorated map; this file is the
source of truth for the remaining decorative pass until that porting happens,
at which point this file should be deleted.

Everything else in this file -- OSM parsing, sea classification, hillshade,
building shadows, contours, roads -- IS superseded. The clean, tested,
modular version lives in `citymap/`, and where this file's logic had a real
bug (concave shadow shapes, the sea polygon's hole-topology bug, the
golden-hour tint coupling, a terrain/building shadow-direction mismatch, an
Overpass relation with no size sanity check reconstructing Honshu itself, a
mountain-height NaN-fill plateau manufacturing phantom shadows over the open
sea), the fix and its regression test live in `citymap/` and `test/city-map/`
-- do not copy logic back out of this file without checking there first.

Original spike history: this is spike8.py, the last of eight iterative
checkpoints (spike.py through spike8.py) built directly in conversation with
the user against real Kobe/Kurose data on 2026-08-23.

Spike 7: recompose around a fortress island, plus a real cartography pass.

REFRAMING. Ingram's ask: the fortress island near the centre of the frame,
mountains one direction, open sea another, coastline running through so there's
a real "up the coast / down the coast" approach. Centre and Rokko Island's
position both came from Overpass (`relation["name:en"~"Port Island"]` etc,
2026-08-23) rather than guessed off a screenshot: Port Island's real centroid is
34.6664792N 135.2232901E, Rokko Island's is 34.6882524N 135.2713548E, ~5km
apart. New centre sits between Port Island and the mainland shore, with L
widened to 12km so the coastline's run and the mountains both stay legible and
Rokko Island falls at or past the frame edge rather than competing for the eye.

RESOLUTION. Checked actual free memory before touching this (Get-CimInstance
Win32_OperatingSystem: 16GB total, 5.1GB free at the time) rather than guessing
at how far "double it" could safely go. A literal doubling to a 32768 supersample
canvas extrapolates to an 8-10GB peak against measured 2-3GB at the previous
16384 -- too tight against 5.1GB free to risk losing a long render to a crash.
Landed on PX_OUT 8192->10240, SS unchanged at 2 (PX_DRAW 20480, ~1.6x the
proven area, ~3.3GB estimated peak): a real, visible step up, with headroom.

NEW THIS PASS, each driven by something Ingram asked for directly:
  - Water gets a real coastline stroke -- around the mainland AND around every
    island sitting in it, via the polygon's interior rings, not just its outer
    edge -- plus a shore-to-deep tonal gradient and a soft ripple texture ("a
    little oceanographic detail"). The gradient comes from a real distance
    transform (Felzenszwalb & Huttenlocher, ported from this project's own
    tools/map-generator/core/distance.mjs rather than re-derived, since scipy
    isn't installed and that algorithm is already proven correct here).
  - Every road end gets a rounded cap, so a real cul-de-sac and a frame-edge
    crop both read as a deliberate stop rather than a hard-clipped stub. A cap
    landing where two OSM way fragments actually continue into each other is
    drawn in the same colour as the road there, so it simply disappears.
  - A cartographic dress pass: a ruled border with distance ticks, a title
    cartouche with a real scale bar, and a compass rose built as radar-style
    concentric range rings, oriented by actually rotating true north (0,1) by
    the same ROT the whole city was rotated by -- not just stuck pointing "up".
    The title text is a deliberate placeholder ("SURVEY GRID"), not a proposed
    name -- naming this place is Ingram's call, not mine to make in a spike.

Everything else (OSM fetch/rotate/clip, sea-polygon construction, GSI hillshade
and contours, the landuse/water tag-coverage fixes) is spike 6, unchanged, kept
byte-identical where possible so the Overpass and DEM fetches hit cache.
"""
import json, math, os, random, sys, urllib.request, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from pyproj import Transformer
from shapely.geometry import Polygon, LineString, Point
from shapely import affinity
from shapely.ops import unary_union, polygonize
from shapely.strtree import STRtree
from shapely.prepared import prep

CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'osm-cache')
DEM_CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dem-cache')
os.makedirs(CACHE, exist_ok=True)
os.makedirs(DEM_CACHE, exist_ok=True)

FWD = Transformer.from_crs('EPSG:4326', 'EPSG:6674', always_xy=True)
INV = Transformer.from_crs('EPSG:6674', 'EPSG:4326', always_xy=True)

# --- decide the OUTPUT square first, in MAP space -----------------------------
# Between Port Island's real centroid (34.6665,135.2233) and the mainland shore,
# so the island sits centrally with open bay beyond it and the city+mountains
# on the landward side. See header for the Overpass-verified coordinates.
CENTER_LON, CENTER_LAT = 135.205, 34.678
ROT = 31.0
L = 12000.0
PX_OUT = 10240
SS = 2
PX = PX_OUT * SS

cx, cy = FWD.transform(CENTER_LON, CENTER_LAT)

def rot_pt(x, y, deg, ox=cx, oy=cy):
    r = math.radians(deg)
    dx, dy = x - ox, y - oy
    c, s = math.cos(r), math.sin(r)
    return (ox + dx * c - dy * s, oy + dx * s + dy * c)

half = L / 2
map_corners = [(cx - half, cy - half), (cx + half, cy - half),
               (cx + half, cy + half), (cx - half, cy + half)]

src_corners = [rot_pt(x, y, -ROT) for x, y in map_corners]
sxs = [p[0] for p in src_corners]
sys_ = [p[1] for p in src_corners]
PAD = 250.0
fminx, fmaxx = min(sxs) - PAD, max(sxs) + PAD
fminy, fmaxy = min(sys_) - PAD, max(sys_) + PAD
fetch_corners_src = [(fminx, fminy), (fmaxx, fminy), (fmaxx, fmaxy), (fminx, fmaxy)]
fetch_box_poly = Polygon(fetch_corners_src)

latlon = [INV.transform(x, y) for x, y in fetch_corners_src]
lons = [p[0] for p in latlon]
lats = [p[1] for p in latlon]
S, N = min(lats), max(lats)
W, E = min(lons), max(lons)
BBOX = f"{S},{W},{N},{E}"

HIGHWAY_CLASSES = (
    "motorway|motorway_link|trunk|trunk_link|primary|primary_link|"
    "secondary|secondary_link|tertiary|tertiary_link|"
    "residential|unclassified|service|living_street|pedestrian|footway|steps"
)
QUERY = f"""
[out:json][timeout:300];
(
  way["building"]({BBOX});
  way["highway"~"^({HIGHWAY_CLASSES})$"]({BBOX});
  way["railway"]({BBOX});
  way["waterway"]({BBOX});
  way["natural"]({BBOX});
  way["landuse"]({BBOX});
  way["leisure"]({BBOX});
  way["aeroway"]({BBOX});
  node["highway"="street_lamp"]({BBOX});
  relation["landuse"]({BBOX});
  relation["leisure"]({BBOX});
  relation["natural"]({BBOX});
  relation["aeroway"]({BBOX});
  relation["place"="island"]({BBOX});
);
out body geom;
"""

def fetch_osm():
    key = hashlib.sha1(QUERY.encode()).hexdigest()[:16]
    path = os.path.join(CACHE, f"{key}.json")
    if os.path.exists(path):
        print(f"  OSM cache hit ({os.path.getsize(path)/1048576:.0f} MB)")
        return json.load(open(path, encoding='utf-8'))
    print("  querying Overpass (large box, this can take several minutes)...")
    req = urllib.request.Request(
        'https://overpass-api.de/api/interpreter',
        data=QUERY.encode('utf-8'),
        headers={'User-Agent': 'blank-inheritance-mapgen/0.1 (private TTRPG project)'})
    raw = urllib.request.urlopen(req, timeout=900).read().decode('utf-8')
    open(path, 'w', encoding='utf-8').write(raw)
    print(f"  cached {len(raw)/1048576:.0f} MB")
    return json.loads(raw)

data = fetch_osm()

def height_of(t):
    for k, mult in (('height', 1.0), ('building:levels', 3.3)):
        v = t.get(k)
        if v:
            try:
                return max(2.5, float(str(v).split(';')[0].replace('m', '').strip()) * mult)
            except ValueError:
                pass
    b = t.get('building', 'yes')
    return {'house': 6.5, 'detached': 6.5, 'residential': 9.0, 'apartments': 22.0,
            'commercial': 18.0, 'retail': 10.0, 'industrial': 11.0, 'warehouse': 11.0,
            'office': 30.0, 'hotel': 34.0, 'school': 12.0, 'temple': 9.0,
            'shrine': 7.0, 'garage': 3.5, 'roof': 4.0}.get(b, 8.0)

feats, lamps_src = [], []
for el in data['elements']:
    t = el.get('tags', {})
    if el['type'] == 'node':
        if t.get('highway') == 'street_lamp':
            lamps_src.append(FWD.transform(el['lon'], el['lat']))
        continue
    g = el.get('geometry')
    if not g or len(g) < 2:
        continue
    pts = [FWD.transform(p['lon'], p['lat']) for p in g]
    closed = len(pts) > 3 and abs(pts[0][0] - pts[-1][0]) < 1e-6 and abs(pts[0][1] - pts[-1][1]) < 1e-6
    try:
        geom = Polygon(pts) if closed else LineString(pts)
        if closed and not geom.is_valid:
            geom = geom.buffer(0)
    except Exception:
        continue
    if geom.is_empty:
        continue
    feats.append({'g': geom, 't': t, 'area': closed, 'h': height_of(t) if 'building' in t else 0.0})

nb_fetched = sum(1 for f in feats if 'building' in f['t'])
nlink = sum(1 for f in feats if str(f['t'].get('highway', '')).endswith('_link'))
print(f"  {len(feats)} features fetched, {nb_fetched} buildings, {len(lamps_src)} lamps, {nlink} link/ramp segments")

# REGRESSION (found 2026-08-23, diagnosed with a small standalone Overpass probe
# centred on the gap in Port Island that was STILL washing out even after the
# closing-buffer carve-out fix below): large real landuse/leisure/natural areas
# are very often mapped in OSM as multipolygon RELATIONS, not simple closed
# ways -- confirmed directly for this exact spot (relation 10207368,
# landuse=industrial) and for Port Island's own coastline itself (relation
# 6421263, place=island, which has NO way-level equivalent at all). The main
# QUERY above only ever asked for way[...], so every one of these was silently
# invisible to land_content no matter how the carve-out buffer was tuned --
# there was nothing there to carve WITH. Fix: also fetch the equivalent
# relation[...] tags (now in QUERY) and reconstruct each multipolygon from its
# member way geometries the same way the coastline arrangement below already
# does -- polygonize() the outer-role members into ring(s), then subtract
# polygonize()'d inner-role members (holes) if any.
def polygon_from_relation(el):
    outer_lines, inner_lines = [], []
    for m in el.get('members', []):
        g = m.get('geometry')
        if not g or len(g) < 2:
            continue
        try:
            ln = LineString([FWD.transform(p['lon'], p['lat']) for p in g])
        except Exception:
            continue
        if not ln.is_empty:
            (inner_lines if m.get('role') == 'inner' else outer_lines).append(ln)
    if not outer_lines:
        return None
    try:
        outer = unary_union(list(polygonize(outer_lines)))
        if outer.is_empty:
            return None
        if inner_lines:
            inner = unary_union(list(polygonize(inner_lines)))
            if not inner.is_empty:
                outer = outer.difference(inner)
        return None if outer.is_empty else outer
    except Exception:
        return None

n_rel = 0
for el in data['elements']:
    if el.get('type') != 'relation' or el.get('tags', {}).get('type') != 'multipolygon':
        continue
    t = el.get('tags', {})
    if not (t.get('landuse') or t.get('leisure') or t.get('natural')
            or t.get('aeroway') or t.get('place') == 'island'):
        continue
    geom = polygon_from_relation(el)
    if geom is None or geom.is_empty:
        continue
    feats.append({'g': geom, 't': t, 'area': True, 'h': 0.0})
    n_rel += 1
print(f"  {n_rel} multipolygon relation(s) reconstructed from member geometry "
      f"(landuse/leisure/natural/aeroway/islands OSM maps as relations, not plain ways)")

# --- sea polygon from coastline direction (OSM: land is to the LEFT) ---------
sea_geom_src = None
land_content, land_tree = [], None  # bound here so the carve-out step below is always safe to reach
try:
    coast_segments_raw = [f['g'] for f in feats if f['t'].get('natural') == 'coastline' and not f['area']]
    original_segments = []
    for ln in coast_segments_raw:
        clipped = ln.intersection(fetch_box_poly)
        if clipped.is_empty:
            continue
        if clipped.geom_type == 'LineString':
            original_segments.append(clipped)
        elif hasattr(clipped, 'geoms'):
            original_segments.extend(p for p in clipped.geoms if p.geom_type == 'LineString')

    if original_segments:
        boundary_ring = LineString(list(fetch_box_poly.exterior.coords))
        arrangement = unary_union(original_segments + [boundary_ring])
        faces = list(polygonize(arrangement))

        def classify_by_coastline(face):
            rep = face.representative_point()
            best_seg, best_dist = None, float('inf')
            for seg in original_segments:
                dist = seg.distance(rep)
                if dist < best_dist:
                    best_dist, best_seg = dist, seg
            d = best_seg.project(rep)
            d0 = max(0.0, d - 1.0)
            d1 = min(best_seg.length, d + 1.0)
            p0, p1 = best_seg.interpolate(d0), best_seg.interpolate(d1)
            tangent = (p1.x - p0.x, p1.y - p0.y)
            origin = best_seg.interpolate(d)
            to_rep = (rep.x - origin.x, rep.y - origin.y)
            cross = tangent[0] * to_rep[1] - tangent[1] * to_rep[0]
            return 'sea' if cross < 0 else 'land'

        # REGRESSION (found 2026-08-23, first 12km-frame render): Port Island and
        # Kobe Airport rendered as swallowed by the sea. Root cause: large
        # reclaimed/artificial islands are not always double-mapped with a
        # separate natural=coastline way around them in OSM -- their edge is
        # often represented ONLY by the landuse/building polygons that fill
        # them, with no coastline LINE for the classifier to key off at all. A
        # face with no nearby coastline data simply falls through as "sea" by
        # default. Fix: an STRtree safety net -- any face the coastline test
        # calls "sea" gets checked against real building/landuse content within
        # it; if a meaningful fraction of its area is actually covered by real
        # land features, it is reclassified as land regardless of what the
        # (absent or misleading) coastline data implied. STRtree makes this
        # cheap: only a handful of candidate faces, and the tree turns "which
        # of 110k buildings are even near this face" into a fast query instead
        # of a linear scan.
        # Deliberately NOT keyed against the LANDUSE style dict here -- that is
        # defined further down the file (this runs before it), and more to the
        # point this safety net only needs "is there real mapped content here
        # that implies land", not "does it match one of our recognised style
        # buckets". Any landuse/leisure tag, or a natural=* that isn't water,
        # is a reasonable signal on its own.
        WATERY_NATURAL = {'water', 'coastline', 'bay', 'strait'}
        land_content = [f['g'] for f in feats if 'building' in f['t']]
        land_content += [f['g'] for f in feats
                          if f['area']
                          and (f['t'].get('landuse') or f['t'].get('leisure') or f['t'].get('aeroway')
                               or f['t'].get('place') == 'island'
                               or (f['t'].get('natural') and f['t']['natural'] not in WATERY_NATURAL))]
        # Kobe Airport's own paved surface was STILL washing out even after the
        # relation fix above (which only gets the terminal building + 4 aprons,
        # confirmed against this exact frame's cached data) -- the runway (1)
        # and every taxiway (39) are mapped as unclosed CENTERLINES, not area
        # polygons, so `f['area']` is False for all of them and they never
        # reach the check above no matter what tags they carry. Buffer them out
        # to a plausible real paved half-width so the pavement itself counts as
        # land content too, not just the odd apron next to it.
        AERO_HALF_WIDTH = {'runway': 30.0, 'taxiway': 15.0, 'taxilane': 15.0}
        for f in feats:
            if f['area']:
                continue
            hw = AERO_HALF_WIDTH.get(f['t'].get('aeroway'))
            if hw:
                land_content.append(f['g'].buffer(hw))
        land_tree = STRtree(land_content) if land_content else None

        # REGRESSION on the safety net ITSELF (found immediately on the next
        # run, 2026-08-23): an area-fraction test ("does real land content
        # cover >3% of this face's area") over-corrected and reclassified
        # EVERY face as land, deleting the ocean entirely. Cause: the real open
        # sea is one huge polygon whose edge legitimately touches hundreds of
        # small real structures -- piers, breakwaters, harbour buildings -- and
        # STRtree.query() is a bounding-box filter, not a precise one, so it
        # handed back most of the 114,946-feature tree for a face that size.
        # The CUMULATIVE sliver area from many small genuine edge structures
        # summed past the 3% threshold despite the face being almost entirely
        # open water.
        #
        # Fix: stop integrating area and sample POINTS instead. Take points
        # from well inside the face (rejection-sampled against its bounding
        # box) and ask whether each one individually lands inside a real
        # building or landuse polygon. A large island wrongly called "sea"
        # is SOLID land -- most interior points hit something real. The actual
        # open sea is mostly empty water even though its edge is busy -- most
        # interior points hit nothing. This is robust to exactly the
        # edge-clutter failure mode above, because points are drawn from the
        # face's INTERIOR, not integrated across its whole area including edges.
        srand = random.Random(1234)

        def classify(face):
            verdict = classify_by_coastline(face)
            if verdict != 'sea' or land_tree is None:
                return verdict
            minx, miny, maxx, maxy = face.bounds
            hits = checked = attempts = 0
            target, max_attempts = 40, 800
            while checked < target and attempts < max_attempts:
                attempts += 1
                pt = Point(minx + srand.random() * (maxx - minx), miny + srand.random() * (maxy - miny))
                if not face.contains(pt):
                    continue
                checked += 1
                for idx in land_tree.query(pt):
                    if land_content[idx].contains(pt):
                        hits += 1
                        break
            return 'land' if checked > 0 and hits / checked > 0.5 else 'sea'

        sea_faces = [f for f in faces if classify(f) == 'sea']
        print(f"  coastline: {len(sea_faces)} of {len(faces)} face(s) classified as sea "
              f"(land-content safety net checked against {len(land_content)} features)")
        if sea_faces:
            sea_geom_src = unary_union(sea_faces)
except Exception as e:
    print(f"  sea polygon construction failed, leaving ocean blank: {e}")

# REGRESSION on the FACE-level safety net (found 2026-08-23, immediately after
# fixing the point-sampling version above): Port Island rendered with real
# buildings and roads, but the whole island sat under a visible translucent
# blue wash -- the sea's depth-texture paste. Root cause: Port Island has no
# coastline data around it AT ALL, so polygonize() never carved it out as its
# own face in the first place -- it is not a separate face that got
# misclassified, it is simply INSIDE one huge combined sea face alongside all
# the genuinely-open water around it. Sampling points across that whole face
# correctly finds it is mostly open water (true) and votes "sea" for the
# entire undivided thing, Port Island included, because face-level
# classification is all-or-nothing per face and Port Island was never its own
# face to begin with.
#
# Fix: stop trying to get this right at the face level and carve real land
# OUT of the finished sea polygon directly, using the exact same land_content
# list, filtered through the STRtree to only the buildings/landuse that
# actually intersect the sea polygon (a real precise test this time, not a
# majority-of-samples vote) rather than every one of the 114,946 features.
if sea_geom_src is not None and not sea_geom_src.is_empty and land_tree is not None:
    try:
        area_before = sea_geom_src.area
        # PERFORMANCE (found 2026-08-23: this step alone took several minutes
        # on the real 12km frame). land_tree.query() is a bounding-box filter,
        # so for a sea polygon whose OWN bounding box spans most of the fetch
        # area it hands back a large fraction of all 114,946 land features --
        # then testing `sea_geom_src.intersects(candidate)` unprepared pays the
        # full cost of the sea polygon's real complexity (thousands of
        # vertices from the whole coastline arrangement) on EVERY single one of
        # those candidates. shapely.prepared.prep() builds an internal index
        # for the sea polygon ONCE, after which repeated intersects() calls
        # against it are cheap -- exactly this situation.
        prepared_sea = prep(sea_geom_src)
        overlapping = [land_content[i] for i in land_tree.query(sea_geom_src)
                        if prepared_sea.intersects(land_content[i])]
        if overlapping:
            # REGRESSION (found 2026-08-23, visually confirmed via full-res crop
            # after the carve above shipped): a 6m buffer is only enough to seal
            # slivers between touching polygons -- it does nothing for the very
            # real, very large gaps between separate mapped features on a sparse
            # reclaimed island: parking lots, yards, open storage, taxiways,
            # none of which have their own OSM polygon. Buildings on Port Island
            # rendered correctly; the paved/open ground BETWEEN them still fell
            # through to "sea" and got the depth-gradient wash. Fix: a proper
            # morphological closing -- buffer out far enough to bridge realistic
            # inter-building gaps (measured ~120-290m in the crop), then buffer
            # back in almost as far, so the net outward growth is tiny (~6m) but
            # gaps up to ~260m are bridged. 260m stays safely below the width of
            # genuine water features nearby (Port Island's own boat basin reads
            # ~400-700m across in the same crop), so real inlets still survive.
            land_here = unary_union(overlapping).buffer(130).buffer(-124)
            carved = sea_geom_src.difference(land_here)
            if not carved.is_empty:
                sea_geom_src = carved
            print(f"  sea polygon: carved out {len(overlapping)} real land feature(s) "
                  f"(e.g. Port Island, uncharted by coastline data), "
                  f"area {area_before/1e6:.2f}km2 -> {sea_geom_src.area/1e6:.2f}km2")
    except Exception as e:
        print(f"  land-carve-out of sea polygon failed, leaving the wash in place: {e}")

if sea_geom_src is not None and not sea_geom_src.is_empty:
    feats.append({'g': sea_geom_src, 't': {'__sea__': True}, 'area': True, 'h': 0.0})

# --- rotate into map space, THEN clip to the EXACT output square -------------
map_square = Polygon(map_corners)
kept = []
for f in feats:
    g = affinity.rotate(f['g'], ROT, origin=(cx, cy))
    g = g.intersection(map_square)
    if g.is_empty:
        continue
    f['g'] = g
    kept.append(f)
feats = kept

lamps = []
for lx, ly in lamps_src:
    p = affinity.rotate(Point(lx, ly), ROT, origin=(cx, cy))
    if map_square.contains(p):
        lamps.append(p)

nb2 = sum(1 for f in feats if 'building' in f['t'])
print(f"  {nb2} buildings survive clipping to the exact output square")

# --- raster setup ----------------------------------------------------------
ox, oy = cx - half, cy - half
scale = PX / L
mpp = L / PX
print(f"  drawing at {mpp:.3f} m/px over {L:.0f} m at {PX}x{PX} (supersample {SS}x, output {PX_OUT})")

def px(x, y):
    return ((x - ox) * scale, PX - (y - oy) * scale)

# The one light vector, shared by hillshade AND building shadows so the whole
# scene reads as lit from a single consistent source. Defined in TRUE geographic
# terms (bearing the light comes FROM) then rotated by the same ROT applied to
# the city, so it stays "upper-left" in the final image regardless of ROT.
LIGHT_AZIMUTH_DEG = 315.0
# Golden hour: dropped from 45 (found 2026-08-23 -- the reference art is all
# low, long, dramatic shadows, mountains throwing real shade into the valleys
# behind them). A 45-degree sun barely lets a hillside cast a shadow at all;
# this is what a low sun late in the day actually does.
LIGHT_ALTITUDE_DEG = 14.0
shadow_bearing = math.radians(LIGHT_AZIMUTH_DEG + 180.0)
geo_dx, geo_dy = math.sin(shadow_bearing), math.cos(shadow_bearing)
rr = math.radians(ROT)
shadow_dir_x = geo_dx * math.cos(rr) - geo_dy * math.sin(rr)
shadow_dir_y = geo_dx * math.sin(rr) + geo_dy * math.cos(rr)

PAPER = (234, 229, 214)
img = Image.new('RGB', (PX, PX), PAPER)
d = ImageDraw.Draw(img, 'RGBA')

def poly(dr, g, fill=None, outline=None, w=1):
    for p in (g.geoms if hasattr(g, 'geoms') else [g]):
        if p.geom_type != 'Polygon' or p.is_empty or len(p.exterior.coords) < 3:
            continue
        dr.polygon([px(*c) for c in p.exterior.coords], fill=fill, outline=outline, width=w)

def line(dr, g, color, w):
    for p in (g.geoms if hasattr(g, 'geoms') else [g]):
        if p.geom_type != 'LineString' or len(p.coords) < 2:
            continue
        dr.line([px(*c) for c in p.coords], fill=color, width=max(1, int(round(w))), joint='curve')

def stroke_rings(dr, g, color, w):
    """Stroke EVERY ring of a polygon, not just its outer boundary.

    The sea polygon has an interior ring wherever an island (Port Island
    included) sits inside it -- PIL's own polygon(outline=...) only draws the
    outer boundary, so a naive outline= would give the mainland coast a line
    and leave every island's shoreline bare. A coastline is a coastline whether
    it belongs to the mainland or a small island; this treats them the same.
    """
    for p in (g.geoms if hasattr(g, 'geoms') else [g]):
        if p.geom_type != 'Polygon':
            continue
        for ring in [p.exterior] + list(p.interiors):
            dr.line([px(*c) for c in ring.coords], fill=color, width=max(1, int(round(w))), joint='curve')

LANDUSE = {'industrial': (208, 200, 187), 'residential': (226, 221, 206), 'commercial': (224, 214, 201),
           'retail': (226, 212, 201), 'railway': (207, 197, 190), 'grass': (198, 210, 178),
           'forest': (170, 190, 158), 'cemetery': (189, 201, 177), 'farmland': (214, 212, 182),
           'meadow': (200, 212, 180), 'orchard': (188, 204, 166), 'quarry': (200, 192, 182),
           # Extended 2026-08-23 against the real tag survey of this exact fetch (see
           # spike6 changelog) -- 'wood'/'park'/'reservoir' etc. were silently unstyled,
           # invisible until real hillshade made blank patches stand out. landuse=reservoir
           # / water=* are deliberately NOT here -- the broadened water-fill rule below
           # draws over them, so giving them a land colour here would just be redundant.
           'wood': (170, 190, 158), 'scrub': (186, 200, 168), 'grassland': (196, 208, 176),
           'recreation_ground': (200, 213, 180), 'brownfield': (206, 199, 188),
           'construction': (206, 199, 188), 'religious': (218, 208, 196),
           'harbour': (203, 196, 187), 'education': (220, 213, 200),
           'sand': (223, 214, 190), 'shingle': (206, 200, 188),
           'park': (198, 213, 178), 'garden': (200, 214, 182), 'playground': (204, 216, 186),
           'dog_park': (198, 213, 178), 'common': (198, 213, 178), 'flowerbed': (202, 213, 184),
           'pitch': (188, 206, 168), 'sports_centre': (196, 210, 178), 'sports_hall': (206, 199, 188),
           'stadium': (196, 210, 178)}
ROAD = {'motorway': 22, 'motorway_link': 12, 'trunk': 19, 'trunk_link': 11,
        'primary': 15, 'primary_link': 9, 'secondary': 12, 'secondary_link': 7.5,
        'tertiary': 9.5, 'tertiary_link': 6.5,
        'residential': 6.5, 'unclassified': 6.0, 'living_street': 5.5, 'pedestrian': 4.5,
        'service': 3.6, 'footway': 1.8, 'steps': 2.0}
INK = (46, 41, 37)
SEA_SHALLOW = (156, 180, 190)
SEA_DEEP = (108, 138, 158)
COAST_INK = (58, 78, 84)
WATER_COLOR = (150, 172, 183)
CONTOUR_COLOR = (120, 92, 60)
CONTOUR_MAJOR = (96, 68, 40)

# =============================================================================
# A small exact Euclidean distance transform, for the sea's shore-to-deep tone.
#
# scipy isn't installed here and this project already has one proven-correct
# implementation of exactly this algorithm (Felzenszwalb & Huttenlocher 2012) in
# tools/map-generator/core/distance.mjs, from the earlier procedural-terrain
# work -- ported straight across rather than re-derived, for the same reason
# the contour case table was ported rather than rewritten: it is already known
# to be exact and isotropic, which a hand-rolled shortcut is not guaranteed to
# be. O(n) per row/column pass, two passes total.
# =============================================================================
def _edt_1d(f):
    n = len(f)
    d = np.empty(n)
    v = np.zeros(n, dtype=np.int64)
    z = np.empty(n + 1)
    k = 0
    z[0], z[1] = -1e20, 1e20
    for q in range(1, n):
        s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
        while s <= z[k]:
            k -= 1
            s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
        k += 1
        v[k] = q
        z[k] = s
        z[k + 1] = 1e20
    k = 0
    for q in range(n):
        while z[k + 1] < q:
            k += 1
        dq = q - v[k]
        d[q] = dq * dq + f[v[k]]
    return d

def edt_2d(seed_mask):
    """Distance in CELLS from every cell to the nearest True cell in seed_mask."""
    h, w = seed_mask.shape
    grid = np.where(seed_mask, 0.0, 1e20)
    for x in range(w):
        grid[:, x] = _edt_1d(grid[:, x])
    for y in range(h):
        grid[y, :] = _edt_1d(grid[y, :])
    return np.sqrt(grid)

# =============================================================================
# TERRAIN: fetch real GSI elevation, build a grid aligned to our output square
# =============================================================================
DEM_GRID = 2048  # ~5.9 m/cell over 12000 m -- close to dem5a's native ~5 m, no lost detail
DEM_ZOOM = 15

def tile_url(dataset, z, x, y):
    return f"https://cyberjapandata.gsi.go.jp/xyz/{dataset}/{z}/{x}/{y}.txt"

def fetch_dem_tile(dataset, z, x, y):
    path = os.path.join(DEM_CACHE, f"{dataset}_{z}_{x}_{y}.npy")
    if os.path.exists(path):
        return np.load(path)
    req = urllib.request.Request(tile_url(dataset, z, x, y),
                                  headers={'User-Agent': 'blank-inheritance-mapgen/0.1 (private TTRPG project)'})
    try:
        raw = urllib.request.urlopen(req, timeout=30).read().decode('utf-8')
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise
    rows = raw.strip().split('\n')
    arr = np.full((len(rows), len(rows[0].split(','))), np.nan, dtype=np.float32)
    for i, row in enumerate(rows):
        for j, v in enumerate(row.split(',')):
            if v != 'e':
                arr[i, j] = float(v)
    np.save(path, arr)
    return arr

def fetch_dem_tile_cached(z, x, y):
    """dem5a, falling back to dem5b -- GSI convention: a tile has one or the
    other, never both, so a 5a 404 legitimately means 'try 5b', not 'retry'."""
    for dataset in ('dem5a', 'dem5b'):
        arr = fetch_dem_tile(dataset, z, x, y)
        if arr is not None:
            return arr
    return None

# Build the output-square grid in MAP space, with the SAME row/col convention
# as the rendered image: row 0 = the map's "north" edge (largest map-y, which
# px() puts at the TOP of the image), so upsampling this array directly onto
# the canvas needs no further flip.
gy, gx = np.mgrid[0:DEM_GRID, 0:DEM_GRID]
grid_x_map = ox + (gx + 0.5) / DEM_GRID * L
grid_y_map = oy + L - (gy + 0.5) / DEM_GRID * L

# Inverse-rotate (map space -> source EPSG:6674), matching rot_pt's formula.
rr_inv = math.radians(-ROT)
c_inv, s_inv = math.cos(rr_inv), math.sin(rr_inv)
ddx = grid_x_map - cx
ddy = grid_y_map - cy
src_x = cx + ddx * c_inv - ddy * s_inv
src_y = cy + ddx * s_inv + ddy * c_inv

lon_grid, lat_grid = INV.transform(src_x.ravel(), src_y.ravel())
lon_grid = np.asarray(lon_grid).reshape(DEM_GRID, DEM_GRID)
lat_grid = np.asarray(lat_grid).reshape(DEM_GRID, DEM_GRID)

n_tiles = 2 ** DEM_ZOOM
xtile_frac = (lon_grid + 180.0) / 360.0 * n_tiles
lat_rad = np.radians(lat_grid)
ytile_frac = (1.0 - np.log(np.tan(lat_rad) + 1.0 / np.cos(lat_rad)) / np.pi) / 2.0 * n_tiles

tx_min, tx_max = int(np.floor(xtile_frac.min())), int(np.floor(xtile_frac.max()))
ty_min, ty_max = int(np.floor(ytile_frac.min())), int(np.floor(ytile_frac.max()))
print(f"  DEM: need z{DEM_ZOOM} tiles x[{tx_min}..{tx_max}] y[{ty_min}..{ty_max}] "
      f"({(tx_max-tx_min+1)*(ty_max-ty_min+1)} tiles)")

mosaic_w = (tx_max - tx_min + 1) * 256
mosaic_h = (ty_max - ty_min + 1) * 256
mosaic = np.full((mosaic_h, mosaic_w), np.nan, dtype=np.float32)
n_ok, n_missing = 0, 0
for ty in range(ty_min, ty_max + 1):
    for tx in range(tx_min, tx_max + 1):
        arr = fetch_dem_tile_cached(DEM_ZOOM, tx, ty)
        if arr is None:
            n_missing += 1
            continue
        n_ok += 1
        oy_m = (ty - ty_min) * 256
        ox_m = (tx - tx_min) * 256
        mosaic[oy_m:oy_m + arr.shape[0], ox_m:ox_m + arr.shape[1]] = arr
print(f"  DEM: {n_ok} tiles fetched, {n_missing} missing (expected over open water)")

# Bilinear-sample the mosaic at each grid point's continuous tile-space coord.
mx = (xtile_frac - tx_min) * 256 - 0.5
my = (ytile_frac - ty_min) * 256 - 0.5
mx = np.clip(mx, 0, mosaic_w - 1.001)
my = np.clip(my, 0, mosaic_h - 1.001)
x0 = np.floor(mx).astype(np.int32)
y0 = np.floor(my).astype(np.int32)
x1 = np.minimum(x0 + 1, mosaic_w - 1)
y1 = np.minimum(y0 + 1, mosaic_h - 1)
fx = mx - x0
fy = my - y0

def gather(yy, xx):
    return mosaic[yy, xx]

v00, v10, v01, v11 = gather(y0, x0), gather(y0, x1), gather(y1, x0), gather(y1, x1)
# If any of the 4 corners is no-data, the sample is no-data -- don't smear a
# real value into a coastline gap.
any_nan = np.isnan(v00) | np.isnan(v10) | np.isnan(v01) | np.isnan(v11)
elevation = (v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) +
             v01 * (1 - fx) * fy + v11 * fx * fy)
elevation = np.where(any_nan, np.nan, elevation)

valid_frac = 1.0 - np.isnan(elevation).mean()
if np.any(~np.isnan(elevation)):
    print(f"  DEM: {valid_frac*100:.0f}% of the output square has real elevation "
          f"(range {np.nanmin(elevation):.0f}-{np.nanmax(elevation):.0f} m)")
else:
    print("  DEM: no valid elevation in this square -- skipping hillshade/contours")

def horizon_shadow(elev, sdx, sdy, tan_alt, cellsize):
    """Real cast shadows from terrain occluding terrain -- a ridge throwing
    genuine shade across the valley behind it, not just each cell reporting
    its own local slope-facing (all plain Lambertian hillshade can ever give).
    This is what makes a low golden-hour sun actually read as golden hour
    ("mountains to throw long shadows which cause the valleys to become dark",
    2026-08-23) rather than just a dim wash.

    Standard heightfield horizon-shadow sweep: rotate the grid so the light's
    horizontal travel direction becomes a pure row-axis sweep, run an O(n)
    running-horizon scan down that axis, rotate the result back. Verified on a
    synthetic single-wall heightfield before wiring in (2026-08-23): 100% of
    the region directly behind the wall in the light's travel direction came
    back shadowed, 0% leaked to either side or in front of it.
    """
    h, w = elev.shape
    ang = math.degrees(math.atan2(sdx, sdy))
    fill = float(np.nanmin(elev))
    rot = Image.fromarray(elev, mode='F').rotate(-ang, expand=True, resample=Image.BICUBIC, fillcolor=fill)
    re = np.asarray(rot, dtype=np.float32)
    rh, rw = re.shape

    max_ray_source = np.full(rw, -1e9, dtype=np.float32)
    shadow_rot = np.zeros((rh, rw), dtype=bool)
    for r in range(rh):
        s = r * cellsize
        shadow_rot[r] = (max_ray_source - s * tan_alt) > re[r]
        max_ray_source = np.maximum(max_ray_source, re[r] + s * tan_alt)

    shadow_img = Image.fromarray((shadow_rot * 255).astype(np.uint8)).rotate(ang, expand=True, resample=Image.BICUBIC)
    sw, sh = shadow_img.size
    left, top = (sw - w) // 2, (sh - h) // 2
    return np.asarray(shadow_img.crop((left, top, left + w, top + h)), dtype=np.float32) / 255.0

# --- hillshade: Lambertian facing + real cast shadow, combined and colour-graded
if np.any(~np.isnan(elevation)):
    cellsize = L / DEM_GRID
    elev_filled = np.where(np.isnan(elevation), np.nanmean(elevation), elevation)
    # dz/dx: col increases with +map-x, straightforward central difference.
    dzdx = np.zeros_like(elev_filled)
    dzdx[:, 1:-1] = (elev_filled[:, 2:] - elev_filled[:, :-2]) / (2 * cellsize)
    dzdx[:, 0] = (elev_filled[:, 1] - elev_filled[:, 0]) / cellsize
    dzdx[:, -1] = (elev_filled[:, -1] - elev_filled[:, -2]) / cellsize
    # dz/dy: row increases with -map-y (row 0 = north), so this is negated.
    dzdrow = np.zeros_like(elev_filled)
    dzdrow[1:-1, :] = (elev_filled[2:, :] - elev_filled[:-2, :]) / 2.0
    dzdrow[0, :] = elev_filled[1, :] - elev_filled[0, :]
    dzdrow[-1, :] = elev_filled[-1, :] - elev_filled[-2, :]
    dzdy = -dzdrow / cellsize

    normal_len = np.sqrt(dzdx ** 2 + dzdy ** 2 + 1.0)
    nx, ny, nz = -dzdx / normal_len, -dzdy / normal_len, 1.0 / normal_len

    alt = math.radians(LIGHT_ALTITUDE_DEG)
    lx, ly = -shadow_dir_x * math.cos(alt), -shadow_dir_y * math.cos(alt)
    lz = math.sin(alt)
    dot = np.clip(nx * lx + ny * ly + nz * lz, 0.0, 1.0)

    tan_alt = math.tan(alt)
    occluded = horizon_shadow(elev_filled, shadow_dir_x, shadow_dir_y, tan_alt, cellsize)
    # PIL's GaussianBlur only accepts L/RGB/RGBA, not 32-bit float 'F' images
    # (found running this: "ValueError: image has wrong mode") -- round-trip
    # through 8-bit for the blur. This mask only needs a soft edge, not float
    # precision, so the quantisation is harmless.
    occluded_img = Image.fromarray((occluded * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.4))
    occluded = np.asarray(occluded_img, dtype=np.float32) / 255.0
    direct_ok = 1.0 - occluded  # 1 = sees the sun, 0 = a ridge is in the way

    # A cell only reads as "lit" if it BOTH faces the sun AND isn't occluded by
    # other terrain from reaching it at all -- this is the actual mountain/
    # valley effect: a valley floor can face squarely toward the sun's azimuth
    # and still be in shadow all the same, exactly like the real thing.
    lit = dot * direct_ok

    SHADOW_FLOOR = 0.30  # low -- valleys should read as genuinely dark, not just dim
    brightness = SHADOW_FLOOR + (1.0 - SHADOW_FLOOR) * lit

    # Golden-hour colour grade: warm gold in direct light, cool blue-grey only
    # in real CAST shadow -- not a flat grey Lambertian multiply. This is the
    # single biggest lever for the "golden hour" look versus a technically
    # correct but flat relief shade.
    #
    # REGRESSION (found 2026-08-23: Port Island rendered under a strong blue
    # wash despite sitting in full, direct, unoccluded light -- occlusion=0.0
    # confirmed by a standalone diagnostic against the real DEM). Root cause
    # was tying colour temperature to `lit` = dot*occlusion, same as
    # brightness. On PERFECTLY FLAT ground the surface normal points straight
    # up, so the Lambertian dot product is just sin(altitude) regardless of
    # occlusion -- at this golden-hour 14 degree altitude that is ~0.24, a low
    # number, so flat unshadowed land was blending mostly toward COOL. That is
    # correct physics for direct-light INTENSITY (a grazing-angle sun really
    # does light flat ground weakly) but wrong for colour: real golden-hour
    # light stays warm on anything the sun can actually reach, including flat
    # ground lit at a shallow angle -- only genuine cast shadow (behind a
    # ridge, deep in an alley) goes cool. Fix: colour temperature now follows
    # `direct_ok` (occlusion alone) instead of `lit` (occlusion x facing).
    # Brightness is UNCHANGED -- still `lit`, so flat/grazing-lit ground is
    # correctly dimmer, just no longer the wrong colour while it's at it.
    WARM = np.array([1.22, 1.04, 0.70], dtype=np.float32)
    COOL = np.array([0.82, 0.90, 1.10], dtype=np.float32)
    tint = COOL[None, None, :] * (1 - direct_ok[..., None]) + WARM[None, None, :] * direct_ok[..., None]
    # Encoded into a uint8 as (value/2)*255 so the WARM channel's 1.22 peak
    # (times brightness up to 1.0) fits with room to spare below the 2.0 cap.
    shade_rgb = np.clip(tint * brightness[..., None], 0, 2.0).astype(np.float32)
    shade_rgb = np.where(np.isnan(elevation)[..., None], 1.0, shade_rgb)

    shade_img = Image.fromarray((shade_rgb * 127.5).astype(np.uint8)).resize((PX, PX), Image.BICUBIC)
    shade_arr = np.asarray(shade_img, dtype=np.float32) / 127.5
    base = np.asarray(img, dtype=np.float32)
    base *= shade_arr
    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(img, 'RGBA')
    mean_occlusion = float(np.mean(occluded))
    del elev_filled, dzdx, dzdy, dzdrow, nx, ny, nz, dot, occluded, direct_ok, lit, tint, shade_rgb, shade_arr, base
    print(f"  hillshade + cast shadow applied, altitude {LIGHT_ALTITUDE_DEG:.0f} deg, "
          f"{mean_occlusion*100:.0f}% mean terrain self-occlusion")

# sea first: the base layer everything else draws on top of.
#
# Flat fill first as a safe fallback, then a shore-to-deep tonal gradient plus a
# soft ripple texture pasted on top (masked to the sea shape), then a stroke
# along every coastline ring -- mainland and islands both, via stroke_rings.
sea_polys = [f['g'] for f in feats if f['t'].get('__sea__')]

# REGRESSION (found 2026-08-24, tracked down with a pixel-checkpoint
# instrumentation of the real pipeline after Kobe Airport's runway/taxiway
# still rendered as sea-blue despite being provably 150m+ outside
# sea_geom_src by every geometric containment test): `poly()` fills a
# Polygon via PIL's ImageDraw.polygon() on `p.exterior.coords` ALONE -- it
# never looks at `.interiors`, so a HOLE in the geometry gets painted solid
# instead of left open. Carving an isolated island fully surrounded by sea
# (exactly Kobe Airport's topology: reachable only by a single bridge that
# is itself never in land_content, so nothing connects its carved patch back
# to the sea polygon's outer boundary) produces precisely that: a donut,
# sea-with-a-hole-where-the-island-is. Port Island happened to dodge this
# because its carved land stays chained to enough OTHER carved land nearby
# to reach the frame edge instead of forming a true interior ring, so it
# never became a hole in the first place -- pure topological luck, not a
# real fix. The depth-gradient/ripple TEXTURE below was ALREADY correctly
# hole-aware (it punches interiors out of its own mask, right below), which
# is exactly why it never repainted the hole -- but the FLAT fill underneath
# had already painted it solid, and with the texture correctly declining to
# touch it, nothing ever corrected that first mistake.
#
# Fix: build the hole-aware mask FIRST (this also folds in the older
# 2026-08-23 fix for blobby low-res gradient/ripple texture -- GRADIENT_RES
# stays modest since a soft fade doesn't need fine detail, RIPPLE_RES stays
# close to full canvas res, same fine/coarse split as the paper grain below)
# and paint the flat fill through that SAME mask via img.paste(), instead of
# the naive poly() sweep that can't see holes at all.
GRADIENT_RES = 2048
sea_mask_small = Image.new('L', (GRADIENT_RES, GRADIENT_RES), 0)
smd = ImageDraw.Draw(sea_mask_small)
small_scale = GRADIENT_RES / L

def px_small(x, y):
    return ((x - ox) * small_scale, GRADIENT_RES - (y - oy) * small_scale)

for g in sea_polys:
    for p in (g.geoms if hasattr(g, 'geoms') else [g]):
        if p.geom_type != 'Polygon' or p.is_empty:
            continue
        smd.polygon([px_small(*c) for c in p.exterior.coords], fill=255)
        for ring in p.interiors:
            smd.polygon([px_small(*c) for c in ring.coords], fill=0)

sea_bool = np.asarray(sea_mask_small, dtype=bool)
mask_img = Image.fromarray((sea_bool * 255).astype(np.uint8)).resize((PX, PX), Image.BICUBIC)

if sea_bool.any():
    flat_img = Image.new('RGB', (PX, PX), SEA_SHALLOW)
    img.paste(flat_img, (0, 0), mask_img)
    d = ImageDraw.Draw(img, 'RGBA')
    del flat_img

    if (~sea_bool).any():
        dist_cells = edt_2d(~sea_bool)  # distance FROM land, in small-grid cells
        dist_m = dist_cells * (L / GRADIENT_RES)
        depth_t = np.clip(dist_m / 900.0, 0, 1) ** 0.6  # 0 at shore, 1 by ~900m out
        depth_t = np.where(sea_bool, depth_t, 0.0).astype(np.float32)

        tone_small = np.empty((GRADIENT_RES, GRADIENT_RES, 3), dtype=np.float32)
        for c in range(3):
            tone_small[..., c] = SEA_SHALLOW[c] + (SEA_DEEP[c] - SEA_SHALLOW[c]) * depth_t[..., None][..., 0]
        tone_img = Image.fromarray(np.clip(tone_small, 0, 255).astype(np.uint8)).resize((PX, PX), Image.BICUBIC)
        tone = np.asarray(tone_img, dtype=np.float32)
        del tone_small, sea_mask_small, depth_t, dist_cells

        RIPPLE_RES = PX // 3  # same fine/small-upsample ratio as the paper grain
        rrng = np.random.default_rng(1951)  # distinct from the paper-grain seed (1950)
        ripple = rrng.normal(0, 1, (RIPPLE_RES, RIPPLE_RES)).astype(np.float32)
        ripple = (ripple - ripple.min()) / (ripple.max() - ripple.min())
        ripple_img = Image.fromarray((ripple * 255).astype(np.uint8)).resize((PX, PX), Image.BICUBIC)
        ripple = np.asarray(ripple_img, dtype=np.float32) / 255.0
        tone *= (0.94 + 0.06 * ripple)[..., None]
        del ripple

        tone_img = Image.fromarray(np.clip(tone, 0, 255).astype(np.uint8))
        del tone
        img.paste(tone_img, (0, 0), mask_img)
        d = ImageDraw.Draw(img, 'RGBA')
        print(f"  sea texture: depth gradient 0-{dist_m[sea_bool].max():.0f}m from shore, "
              f"ripple at {RIPPLE_RES}px native ({PX/RIPPLE_RES:.1f}x upsample, was {PX/256:.0f}x)")

for g in sea_polys:
    stroke_rings(d, g, COAST_INK, 2.0)

# REGRESSION (flagged 2026-08-23): landuse used to be drawn as a flat OPAQUE
# fill, which completely erased whatever hillshade was already sitting under
# it -- a park on a hillside rendered as a flat green blob with no relief at
# all, "planted over the top of the height data". Fix: draw all landuse into a
# separate buffer, then MULTIPLY it onto the image as a tint relative to bare
# paper (colour / PAPER, per channel) rather than replacing outright. A pixel
# that was darkened by hillshade or a mountain's cast shadow stays darkened;
# it just also picks up the landuse colour cast on top, exactly like real
# aerial imagery of vegetated terrain.
landuse_buf = Image.new('RGB', (PX, PX), PAPER)
landuse_mask = Image.new('L', (PX, PX), 0)
lud = ImageDraw.Draw(landuse_buf)
lmd = ImageDraw.Draw(landuse_mask)
for f in feats:
    lu = f['t'].get('landuse') or f['t'].get('natural') or f['t'].get('leisure')
    if f['area'] and lu in LANDUSE:
        poly(lud, f['g'], fill=LANDUSE[lu])
        poly(lmd, f['g'], fill=255)
lu_arr = np.asarray(landuse_buf, dtype=np.float32)
tint = lu_arr / np.asarray(PAPER, dtype=np.float32)
lu_mask_arr = (np.asarray(landuse_mask, dtype=np.float32) / 255.0)[..., None]
base_arr = np.asarray(img, dtype=np.float32)
base_arr = base_arr * (1 - lu_mask_arr) + np.clip(base_arr * tint, 0, 255) * lu_mask_arr
img = Image.fromarray(np.clip(base_arr, 0, 255).astype(np.uint8))
d = ImageDraw.Draw(img, 'RGBA')
del landuse_buf, landuse_mask, lu_arr, tint, lu_mask_arr, base_arr

hatch = Image.new('RGBA', (PX, PX), (0, 0, 0, 0))
hd = ImageDraw.Draw(hatch)
step = max(6, int(14 / mpp))
for i in range(-PX, PX * 2, step):
    hd.line([(i, 0), (i + PX, PX)], fill=(90, 80, 70, 60), width=1)
mask = Image.new('L', (PX, PX), 0)
md = ImageDraw.Draw(mask)
for f in feats:
    if f['area'] and f['t'].get('landuse') in ('industrial', 'quarry', 'railway'):
        poly(md, f['g'], fill=255)
img.paste(Image.alpha_composite(img.convert('RGBA'), hatch).convert('RGB'), (0, 0), mask)
del hatch, mask

# Broadened against the real tag survey: 'water=pond/river/basin/reservoir' is an
# attribute tag that often appears WITHOUT natural=water, and landuse=reservoir /
# leisure=swimming_pool are both real, common water bodies in this data that the
# original natural=water-only check silently missed.
for f in feats:
    t = f['t']
    if f['area'] and (
        t.get('natural') == 'water'
        or t.get('landuse') in ('basin', 'reservoir')
        or t.get('water') in ('reservoir', 'pond', 'river', 'lake', 'basin')
        or t.get('leisure') == 'swimming_pool'
    ):
        poly(d, f['g'], fill=WATER_COLOR)
        stroke_rings(d, f['g'], COAST_INK, 1.2)
for f in feats:
    if not f['area'] and f['t'].get('waterway') in ('river', 'stream', 'canal'):
        line(d, f['g'], WATER_COLOR, max(1, 8 / mpp))

# --- contours: real marching squares, ported from tools/map-generator/terrain/contour.mjs
# Edge ids: 0=top(tl-tr) 1=right(tr-br) 2=bottom(bl-br) 3=left(tl-bl).
CASES = {
    1: [(3, 2)], 2: [(2, 1)], 3: [(3, 1)], 4: [(0, 1)],
    6: [(0, 2)], 7: [(0, 3)], 8: [(0, 3)], 9: [(0, 2)],
    11: [(0, 1)], 12: [(3, 1)], 13: [(2, 1)], 14: [(3, 2)],
}

def contour_segments(elev, level):
    tl, tr, bl, br = elev[:-1, :-1], elev[:-1, 1:], elev[1:, :-1], elev[1:, 1:]
    valid = ~(np.isnan(tl) | np.isnan(tr) | np.isnan(bl) | np.isnan(br))
    at = np.where(valid, tl > level, False)
    art = np.where(valid, tr > level, False)
    ab = np.where(valid, bl > level, False)
    abr = np.where(valid, br > level, False)
    idx = (at.astype(np.uint8) << 3) | (art.astype(np.uint8) << 2) | (abr.astype(np.uint8) << 1) | ab.astype(np.uint8)
    crossing = valid & (idx != 0) & (idx != 15)
    rr_, cc_ = np.nonzero(crossing)
    segs = []
    for r, c in zip(rr_.tolist(), cc_.tolist()):
        i = int(idx[r, c])
        vtl, vtr, vbl, vbr = float(tl[r, c]), float(tr[r, c]), float(bl[r, c]), float(br[r, c])
        cen = (vtl + vtr + vbl + vbr) / 4
        if i == 5:
            pairs = [(0, 1), (2, 3)] if cen > level else [(0, 3), (2, 1)]
        elif i == 10:
            pairs = [(0, 3), (2, 1)] if cen > level else [(0, 1), (2, 3)]
        else:
            pairs = CASES.get(i)
        if not pairs:
            continue

        def pt(edge):
            if edge == 0:
                t = (level - vtl) / (vtr - vtl)
                return (c + t, r)
            if edge == 1:
                t = (level - vtr) / (vbr - vtr)
                return (c + 1, r + t)
            if edge == 2:
                t = (level - vbl) / (vbr - vbl)
                return (c + t, r + 1)
            t = (level - vtl) / (vbl - vtl)
            return (c, r + t)

        for a, b in pairs:
            segs.append((pt(a), pt(b)))
    return segs

def grid_to_map(col, row):
    x = ox + (col + 0.5) / DEM_GRID * L
    y = oy + L - (row + 0.5) / DEM_GRID * L
    return x, y

n_contour_segs = 0
if np.any(~np.isnan(elevation)):
    lo = int(np.ceil(np.nanmin(elevation) / 10.0)) * 10
    hi = int(np.nanmax(elevation))
    for level in range(max(10, lo), hi + 1, 10):
        segs = contour_segments(elevation, level)
        n_contour_segs += len(segs)
        major = (level % 50) == 0
        color = CONTOUR_MAJOR if major else CONTOUR_COLOR
        w = 1.6 if major else 1.0
        for (c0, r0), (c1, r1) in segs:
            x0m, y0m = grid_to_map(c0, r0)
            x1m, y1m = grid_to_map(c1, r1)
            d.line([px(x0m, y0m), px(x1m, y1m)], fill=color, width=max(1, int(round(w))))
    print(f"  contours: {n_contour_segs} segments drawn, 10m interval / 50m index")

def is_bridge(t):
    """REGRESSION (flagged 2026-08-23): every road was drawn in one pass before
    buildings, so a real elevated expressway crossing OVER a building rendered
    with the building on top -- physically backwards. bridge=* or a positive
    layer=* means the road is actually above the ground it crosses, and those
    segments need to be drawn AFTER buildings, not with everything else."""
    b = t.get('bridge')
    if b and b != 'no':
        return True
    try:
        if int(str(t.get('layer', 0))) > 0:
            return True
    except ValueError:
        pass
    return False

def draw_roads(dr, only_bridges):
    # Round every road end -- a real cul-de-sac AND a frame-edge crop both get
    # a soft terminus instead of a hard-clipped stub. A cap landing where two
    # OSM way fragments actually continue into each other is drawn in the SAME
    # colour the road already is there, so it disappears into the line rather
    # than showing as a bump; only genuine endpoints read as anything.
    for casing in (True, False):
        for f in feats:
            hw = f['t'].get('highway')
            if not hw or f['area'] or hw not in ROAD:
                continue
            if is_bridge(f['t']) != only_bridges:
                continue
            wm = ROAD[hw] / mpp
            if casing:
                w = wm + max(1.4, 2.2)
                color = INK
            else:
                tone = 246 if hw.split('_')[0] in ('motorway', 'trunk', 'primary') else 238
                w = wm
                color = (tone, tone - 4, tone - 12)
            line(dr, f['g'], color, w)
            r = w / 2
            for part in (f['g'].geoms if hasattr(f['g'], 'geoms') else [f['g']]):
                if part.geom_type != 'LineString' or len(part.coords) < 2:
                    continue
                for end_pt in (part.coords[0], part.coords[-1]):
                    ex, ey = px(*end_pt)
                    dr.ellipse([ex - r, ey - r, ex + r, ey + r], fill=color)

draw_roads(d, only_bridges=False)  # at-grade roads: under buildings, as before
for f in feats:
    if f['t'].get('railway') and not f['area']:
        line(d, f['g'], (72, 66, 60), max(1, 4.0 / mpp))

def shadow_sweep(g, dx, dy):
    """The TRUE swept shadow of a footprint along vector (dx,dy) -- the
    Minkowski sum of the polygon with the segment from (0,0) to (dx,dy).

    REGRESSION (flagged 2026-08-23): the previous version used
    unary_union([original, translated]).convex_hull. For any CONCAVE footprint
    (an L-shape, a courtyard, a notch -- extremely common in real building
    data) the convex hull fills in the concave part, so the shadow bulged
    across ground the building never actually occludes: "an illogical clipped
    version" of the real shape, exactly as reported.

    The correct construction sweeps every EDGE of the footprint, not just its
    two end positions: for each boundary edge, the quadrilateral connecting
    that edge to its translated copy is part of the swept volume. The union of
    the original polygon, the translated polygon, and every one of these
    edge-quads is exactly the Minkowski sum, and is correct for concave
    footprints because it is built from the boundary directly rather than
    inferred from a hull.
    """
    parts = []
    for p in (g.geoms if hasattr(g, 'geoms') else [g]):
        if p.geom_type != 'Polygon' or p.is_empty:
            continue
        shifted = affinity.translate(p, xoff=dx, yoff=dy)
        parts.append(p)
        parts.append(shifted)
        ring = list(p.exterior.coords)
        for i in range(len(ring) - 1):
            (x1, y1), (x2, y2) = ring[i], ring[i + 1]
            quad = Polygon([(x1, y1), (x2, y2), (x2 + dx, y2 + dy), (x1 + dx, y1 + dy)])
            if not quad.is_valid:
                quad = quad.buffer(0)
            if not quad.is_empty:
                parts.append(quad)
    if not parts:
        return g
    try:
        return unary_union(parts)
    except Exception:
        return g

shadow = Image.new('RGBA', (PX, PX), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow, 'RGBA')
for f in feats:
    if 'building' not in f['t'] or f['g'].is_empty:
        continue
    off = f['h'] * 0.55
    dx, dy = shadow_dir_x * off, shadow_dir_y * off
    swept = shadow_sweep(f['g'], dx, dy)
    poly(sd, swept, fill=(38, 32, 28, 92))
shadow = shadow.filter(ImageFilter.GaussianBlur(max(1.0, 1.4 / mpp)))
img = Image.alpha_composite(img.convert('RGBA'), shadow).convert('RGB')
del shadow
d = ImageDraw.Draw(img, 'RGBA')

nb = 0
for f in feats:
    if 'building' not in f['t'] or f['g'].is_empty:
        continue
    nb += 1
    k = min(1.0, f['h'] / 55.0)
    fill = (int(214 - 40 * k), int(207 - 40 * k), int(196 - 40 * k))
    poly(d, f['g'], fill=fill, outline=INK, w=1)

# Bridges/overpasses render ON TOP of everything they cross -- including the
# buildings just drawn -- because they physically ARE above it. Cast their own
# shadow onto the ground below first (same light direction as everything
# else), then redraw the bridge deck on top.
bridge_feats = [f for f in feats if f['t'].get('highway') in ROAD and not f['area'] and is_bridge(f['t'])]
if bridge_feats:
    BRIDGE_DECK_M = 8.0  # a plausible deck height for shadow-casting purposes
    boff = BRIDGE_DECK_M * 0.55
    bdx, bdy = shadow_dir_x * boff, shadow_dir_y * boff
    bshadow = Image.new('RGBA', (PX, PX), (0, 0, 0, 0))
    bsd = ImageDraw.Draw(bshadow, 'RGBA')
    for f in bridge_feats:
        wm = ROAD[f['t']['highway']] / mpp
        line(bsd, affinity.translate(f['g'], xoff=bdx, yoff=bdy), (30, 26, 22, 80), wm + 4)
    bshadow = bshadow.filter(ImageFilter.GaussianBlur(max(1.0, 1.2 / mpp)))
    img = Image.alpha_composite(img.convert('RGBA'), bshadow).convert('RGB')
    del bshadow
    d = ImageDraw.Draw(img, 'RGBA')
    draw_roads(d, only_bridges=True)
    print(f"  {len(bridge_feats)} bridge/overpass segment(s) redrawn on top of buildings with their own cast shadow")

for p in lamps:
    x, y = px(p.x, p.y)
    r = 2.5 * SS
    d.ellipse([x - r, y - r, x + r, y + r], fill=(236, 190, 96))

def find_font(size):
    for name in ('YuGothM.ttc', 'meiryo.ttc', 'msgothic.ttc', 'segoeui.ttf', 'arial.ttf'):
        p = os.path.join('C:\\Windows\\Fonts', name)
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()

font = find_font(max(13, int(17 / max(mpp, 0.6))))
placed = []
# English road names (2026-08-23, per "maybe we could start labelling things in
# English" -- see the city-naming note above the cartouche for the invented
# Kurose/Kaisen identity these are built from: real Japanese place-naming
# morphology -- -zaka for a hill road, -dori for a boulevard, -bashi for a
# bridge -- translated to English rather than left in Japanese script, so the
# map is actually readable. "Old Battery Road" nods at the coastal gun
# emplacements a real 1950s-divergence harbour city would still have.
INVENTED = ['Kagamiura Avenue', 'Isogami Slope', 'Third Pier Line', 'Haizaki Boulevard',
            'Aoyagibashi Street', 'Shiomi Slope', 'Nakasu Third District', 'Old Battery Road',
            'Shioji Line', 'Setomi Avenue', 'Bokai-cho', 'Lighthouse Approach']
labelled = 0
for f in feats:
    if labelled >= len(INVENTED):
        break
    hw = f['t'].get('highway')
    if hw not in ('motorway', 'trunk', 'primary', 'secondary') or f['area']:
        continue
    g = f['g'] if f['g'].geom_type == 'LineString' else None
    if g is None or g.length < 400:
        continue
    mid = g.interpolate(0.5, normalized=True)
    a = g.interpolate(0.45, normalized=True)
    bb = g.interpolate(0.55, normalized=True)
    X, Y = px(mid.x, mid.y)
    if any((X - lx) ** 2 + (Y - ly) ** 2 < 300 ** 2 for lx, ly in placed):
        continue
    ang = math.degrees(math.atan2(-(bb.y - a.y), bb.x - a.x))
    if ang > 90:
        ang -= 180
    if ang < -90:
        ang += 180
    txt = INVENTED[labelled]
    tmp = Image.new('RGBA', (700, 110), (0, 0, 0, 0))
    ImageDraw.Draw(tmp).text((10, 14), txt, font=font, fill=(30, 26, 22, 255),
                              stroke_width=3, stroke_fill=(238, 233, 219, 230))
    tmp = tmp.rotate(ang, expand=True, resample=Image.BICUBIC)
    img.paste(tmp, (int(X - tmp.width / 2), int(Y - tmp.height / 2)), tmp)
    placed.append((X, Y))
    labelled += 1

# =============================================================================
# CARTOGRAPHIC DRESS: ruled border + distance ticks, a title cartouche with a
# real scale bar, and a compass rose built as radar-style range rings.
#
# All drawn directly in PIXEL space, not through px() -- a map's border and
# title block belong to the PAGE, not to the rotated city inside it, exactly
# like a real printed survey sheet's margin stays square regardless of which
# way the grid inside it points.
#
# The title is a deliberate placeholder. Naming this place is Ingram's call.
# =============================================================================
DECO_INK = (40, 34, 28)
MARGIN = int(56 * SS)

d.rectangle([MARGIN, MARGIN, PX - MARGIN, PX - MARGIN], outline=DECO_INK, width=max(1, int(2 * SS)))
d.rectangle([MARGIN + int(7 * SS), MARGIN + int(7 * SS), PX - MARGIN - int(7 * SS), PX - MARGIN - int(7 * SS)],
            outline=DECO_INK, width=max(1, int(SS)))

tick_km_px = 1000 * scale
tick_minor, tick_major = int(10 * SS), int(18 * SS)
i = 0
while MARGIN + i * tick_km_px <= PX - MARGIN:
    p = MARGIN + i * tick_km_px
    tl = tick_major if i % 5 == 0 else tick_minor
    tw = max(1, int((1.6 if i % 5 == 0 else 1.1) * SS))
    d.line([(p, MARGIN), (p, MARGIN - tl)], fill=DECO_INK, width=tw)
    d.line([(p, PX - MARGIN), (p, PX - MARGIN + tl)], fill=DECO_INK, width=tw)
    d.line([(MARGIN, p), (MARGIN - tl, p)], fill=DECO_INK, width=tw)
    d.line([(PX - MARGIN, p), (PX - MARGIN + tl, p)], fill=DECO_INK, width=tw)
    i += 1

# --- title cartouche, bottom-left --------------------------------------------
cw, ch = int(600 * SS), int(230 * SS)
box_x, box_y = MARGIN + int(24 * SS), PX - MARGIN - int(24 * SS) - ch
CART_BG = (241, 236, 222)
d.rectangle([box_x, box_y, box_x + cw, box_y + ch], fill=CART_BG, outline=DECO_INK, width=max(1, int(2 * SS)))

# Named per Ingram's explicit permission (2026-08-23: "we create our own city
# name, prefecture names, you have full permission to write and imagine
# everything"), grounded in the campaign's own already-accepted setting
# identity (ideas/entries/golarion-grounding-touches.json: this is Golarion,
# a 1950s-divergence branch, cherry-picking real touches rather than either
# ignoring or slavishly following canon). Minkai is the real nation this sits
# in -- Golarion's Japan-equivalent, a confidently-known top-level fact.
# Everything below city/prefecture level is new invention filling a period the
# idea entry calls out as "hasn't really been explored much": not contradicting
# established Minkai lore, just not pinned to a specific documented event or
# city either. Fully open to revision -- Ingram's words, "I'll come in
# afterwards with what I do and don't like."
title_font = find_font(int(30 * SS))
sub_font = find_font(int(15 * SS))
tx0, ty0 = box_x + int(20 * SS), box_y + int(16 * SS)
d.text((tx0, ty0), "KUROSE", font=title_font, fill=DECO_INK)
d.text((tx0, ty0 + int(40 * SS)), "KAISEN PREFECTURE  ·  MINKAI  ·  PROVISIONAL NAMING", font=sub_font, fill=(96, 86, 74))
d.text((tx0, ty0 + int(64 * SS)),
       f"GRID ROT {ROT:.0f}°   {mpp:.2f} m/px   {L/1000:.1f} km FRAME",
       font=sub_font, fill=(96, 86, 74))
d.text((tx0, ty0 + int(86 * SS)),
       "TERRAIN: GSI  ·  PLANIMETRY: OSM CONTRIBUTORS (ODbL)  ·  FICTIONALISED",
       font=sub_font, fill=(96, 86, 74))

# REGRESSION (found 2026-08-23 checking this exact render): the first version
# used `1000 * scale` -- the MAIN MAP's metres-per-pixel scale -- for a bar
# meant to sit inside a small inset box. At this map's scale that was ~1700px
# per km, and three of them ran the bar straight through the cartouche box and
# on across the actual map for over 5000px. A legend scale bar has to be sized
# to the LEGEND, not the map: pick the largest "nice" round distance that fits
# the box's actual width, then compute pixels FROM that distance, not the
# other way around. Robust to L/PX/SS changing later, not just patched for
# this one configuration.
bar_y = ty0 + int(130 * SS)
NICE_DISTANCES_M = [50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000]
bar_budget_px = cw - int(40 * SS)
bar_budget_m = bar_budget_px * mpp
bar_m = max((m for m in NICE_DISTANCES_M if m <= bar_budget_m), default=NICE_DISTANCES_M[0])
bar_px_total = bar_m / mpp
n_seg = 4 if bar_m >= 1000 else 2
seg_px = bar_px_total / n_seg

d.text((tx0, bar_y - int(18 * SS)), "SCALE", font=sub_font, fill=(96, 86, 74))
for seg in range(n_seg):
    x0 = tx0 + seg * seg_px
    fillc = DECO_INK if seg % 2 == 0 else CART_BG
    d.rectangle([x0, bar_y, x0 + seg_px, bar_y + int(10 * SS)], fill=fillc, outline=DECO_INK, width=max(1, int(SS)))
d.text((tx0, bar_y + int(14 * SS)), "0", font=sub_font, fill=DECO_INK)
bar_label = f"{bar_m} m" if bar_m < 1000 else f"{bar_m/1000:g} km"
label_w = d.textlength(bar_label, font=sub_font)
d.text((tx0 + bar_px_total - label_w, bar_y + int(14 * SS)), bar_label, font=sub_font, fill=DECO_INK)

# --- compass rose as radar-style range rings, bottom-right ------------------
rose_r = int(120 * SS)
rose_cx = PX - MARGIN - int(40 * SS) - rose_r
rose_cy = PX - MARGIN - int(40 * SS) - rose_r
for frac, rw in ((1.0, 2.0), (0.68, 1.2), (0.38, 1.2)):
    rr_ = rose_r * frac
    d.ellipse([rose_cx - rr_, rose_cy - rr_, rose_cx + rr_, rose_cy + rr_], outline=DECO_INK, width=max(1, int(rw * SS)))
for deg in range(0, 360, 15):
    a = math.radians(deg)
    inner = rose_r * (0.90 if deg % 90 else 0.78)
    tw = max(1, int((1.6 if deg % 90 == 0 else 0.9) * SS))
    d.line([(rose_cx + math.sin(a) * inner, rose_cy - math.cos(a) * inner),
            (rose_cx + math.sin(a) * rose_r, rose_cy - math.cos(a) * rose_r)], fill=DECO_INK, width=tw)

def rot_dir(vx, vy):
    """A cardinal direction (vx,vy), where (0,1)=up the page, straight to a
    unit pixel-space direction.

    This USED to rotate (0,1) by -ROT to point at true geographic north --
    correct while this was still recognisably Kobe, wrong now (2026-08-23:
    "our fake North should point upwards"). This is a fictional city now, not
    a rotated real one; there is no true north to preserve, so the map's own
    up-the-page direction simply IS north for this world. Kept as a function
    (rather than inlining the four vectors) only so the N/E/S/W loop and the
    arrow-drawing code below don't need to change shape."""
    return (vx, -vy)

compass_font = find_font(int(20 * SS))
for label, (gx, gy) in (('N', (0, 1)), ('E', (1, 0)), ('S', (0, -1)), ('W', (-1, 0))):
    dxp, dyp = rot_dir(gx, gy)
    lx, ly = rose_cx + dxp * (rose_r + int(22 * SS)), rose_cy + dyp * (rose_r + int(22 * SS))
    d.text((lx, ly), label, font=compass_font, fill=DECO_INK, anchor='mm')

ndx, ndy = rot_dir(0, 1)
tip = (rose_cx + ndx * rose_r * 0.86, rose_cy + ndy * rose_r * 0.86)
perp = (-ndy, ndx)
bw = rose_r * 0.10
b1 = (rose_cx - ndx * rose_r * 0.12 + perp[0] * bw, rose_cy - ndy * rose_r * 0.12 + perp[1] * bw)
b2 = (rose_cx - ndx * rose_r * 0.12 - perp[0] * bw, rose_cy - ndy * rose_r * 0.12 - perp[1] * bw)
d.polygon([tip, b1, b2], fill=DECO_INK)
d.ellipse([rose_cx - int(4 * SS), rose_cy - int(4 * SS), rose_cx + int(4 * SS), rose_cy + int(4 * SS)], fill=DECO_INK)
print("  cartographic dress: border+ticks, cartouche+scale bar, radar compass rose")

img = img.resize((PX_OUT, PX_OUT), Image.LANCZOS)
PX = PX_OUT

rng = np.random.default_rng(1950)

def noise_layer(size, out_px):
    n = rng.normal(0, 1, (size, size)).astype(np.float32)
    n = (n - n.min()) / (n.max() - n.min())
    img8 = (n * 255).astype(np.uint8)
    return np.asarray(Image.fromarray(img8).resize((out_px, out_px), Image.BICUBIC), dtype=np.float32) / 255.0

fine = noise_layer(PX // 3, PX)
coarse = noise_layer(48, PX)
grain = 0.955 + 0.055 * fine + 0.05 * (coarse - 0.5)
del fine, coarse

small = 256
syy, sxx = np.mgrid[0:small, 0:small].astype(np.float32)
rr2 = np.sqrt(((sxx - small / 2) / (small / 2)) ** 2 + ((syy - small / 2) / (small / 2)) ** 2)
vig_small = np.clip(1.0 - 0.16 * np.clip(rr2 - 0.55, 0, None) ** 1.6 * 3.0, 0.72, 1.0).astype(np.float32)

# Dappled golden-hour light: replaces what used to be a flat left-right linear
# drift with real soft cloud-shadow noise -- two octaves, both low frequency,
# so it reads as light filtering unevenly through cloud rather than a smooth
# gradient or (at the other extreme) visible grain. Deliberately generated at
# the SAME small resolution as the vignette and upsampled the same way, since
# this needs to stay soft and large-scale, unlike the sea's ripple texture,
# which needed the opposite fix (see the sea-texture regression note above).
dapple_rng = np.random.default_rng(1952)
d1 = dapple_rng.normal(0, 1, (10, 10)).astype(np.float32)
d1 = np.asarray(Image.fromarray(((d1 - d1.min()) / (d1.max() - d1.min()) * 255).astype(np.uint8))
                .resize((small, small), Image.BICUBIC), dtype=np.float32) / 255.0
d2 = dapple_rng.normal(0, 1, (28, 28)).astype(np.float32)
d2 = np.asarray(Image.fromarray(((d2 - d2.min()) / (d2.max() - d2.min()) * 255).astype(np.uint8))
                .resize((small, small), Image.BICUBIC), dtype=np.float32) / 255.0
dapple_small = (0.92 + 0.11 * d1 + 0.05 * (d2 - 0.5)).astype(np.float32)
del d1, d2

# A stronger, deliberate warm cast overall -- the reference art is warm
# throughout, not just subtly warmer on one side (found 2026-08-23: the
# previous +/-0.02 drift was too weak to read as "golden hour" on its own;
# the hillshade's warm/cool tinting above is the main driver, this is the
# ambient wash tying the whole sheet together, including areas with no relief
# at all -- the open sea, reclaimed flat land).
warm_small = (1.06 + 0.05 * ((sxx / small) - 0.5) - 0.03 * ((syy / small) - 0.5)).astype(np.float32)

vig = np.asarray(Image.fromarray(vig_small, mode='F').resize((PX, PX), Image.BICUBIC), dtype=np.float32)
warm = np.asarray(Image.fromarray(warm_small, mode='F').resize((PX, PX), Image.BICUBIC), dtype=np.float32)
dapple = np.asarray(Image.fromarray(dapple_small, mode='F').resize((PX, PX), Image.BICUBIC), dtype=np.float32)
del syy, sxx, rr2, vig_small, warm_small, dapple_small

arr = np.asarray(img, dtype=np.float32)
arr[..., 0] *= grain * vig * dapple * warm
arr[..., 1] *= grain * vig * dapple
arr[..., 2] *= grain * vig * dapple * (2.05 - warm)
img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
del arr, grain, vig, warm, dapple

img.save(sys.argv[1])
print(f"  {nb} buildings, {labelled} labels, {len(lamps)} lamps, {n_contour_segs} contour segments -> {sys.argv[1]}")
print(f"  file size: {os.path.getsize(sys.argv[1])/1048576:.1f} MB")
