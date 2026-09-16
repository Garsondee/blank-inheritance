# -*- coding: utf-8 -*-
"""Non-OSM geo-referenced sources, ingested into map space.

Right now that means one thing: Japan's official designated emergency
evacuation sites (指定緊急避難場所), published by GSI as plain GeoJSON per
municipality. This is deliberately a separate module from `acquire.py` --
that one owns the single Overpass query and the GSI DEM tiles, both of which
are inputs to the cached World/Fields pipeline. Evacuation sites are neither:
they are a small, slow-moving point set that is drawn but never routed over,
never clipped against, and never part of a cache key.

**Why not OpenStreetMap.** Measured over the real Kurose frame before writing
any of this: `emergency=assembly_point` returns ZERO features, and the 77
`amenity=shelter` hits are overwhelmingly bus and picnic shelters
(`shelter_type` says so). The official data returns 413 sites for the same
box, each carrying which hazards it is actually designated for. There was no
contest.

**Licence.** GSI content terms, which apply PDL 1.0: free use including
modification, with attribution (出典：国土地理院ウェブサイト). One condition
travels downstream and is worth restating wherever this is displayed:
designation is PER HAZARD TYPE and the published data may not be current, so
this must never be presented as authoritative evacuation guidance. On a
fictionalised campaign map that is academic -- the city is renamed and the
coastline has been edited -- but the notice is part of the terms, so
`ATTRIBUTION` below carries it.
"""

from __future__ import annotations

import json
import os
import urllib.request
from typing import Dict, List, Optional, Tuple

STAGE_CODE_VERSION = 1

USER_AGENT = "blank-inheritance-mapgen/0.1 (private TTRPG project)"

# `_2` is the designated-emergency-evacuation-site file; `_1` is the separate
# "designated shelter" (指定避難所) set. Confirmed by schema (only _2 carries
# the eight hazard columns) rather than assumed from the suffix.
GSI_EVACUATION_URL = ("https://hinanmap.gsi.go.jp/hinanjocp/defaultFtpData/"
                     "geoJSON/{municipality_code}_2.geojson")

# The municipalities whose own site lists reach into the Kurose frame. Swept
# from all 41 Hyōgo municipalities; exactly these three contribute.
KUROSE_MUNICIPALITIES = ("28100", "28204", "28206")   # 神戸市, 西宮市, 芦屋市

ATTRIBUTION = (
    "出典：国土地理院ウェブサイト（https://hinanmap.gsi.go.jp/）指定緊急避難場所データ"
    " / Processed for this project. Designation is per hazard type and the "
    "source data may not be current; not authoritative evacuation guidance."
)

# The eight legal hazard categories from 災害対策基本法 49-4, in the order this
# project ranks them. Coastal inundation leads deliberately: this is a port
# city campaign, and "is this site safe from the water" is the question that
# actually matters at the table. A site is flagged for several of these at
# once (the real distribution runs 1 to 6 per site), so a precedence order is
# the only way to pick one symbol per point.
HAZARD_FIELDS = (
    "津波",                    # tsunami
    "高潮",                    # storm surge
    "洪水",                    # flood
    "崖崩れ、土石流及び地滑り",  # landslide / debris flow
    "内水氾濫",                # inland (drainage) flooding
    "大規模な火事",            # large-scale fire
    "地震",                    # earthquake
    "火山現象",                # volcanic phenomena
)

WATER_HAZARDS = frozenset({"津波", "高潮", "洪水", "内水氾濫"})

NAME_FIELD = "施設・場所名"


class ExternalDataError(RuntimeError):
    pass


def fetch_evacuation_geojson(municipality_code: str, cache_dir: str,
                             timeout: int = 120) -> dict:
    """One municipality's site list, cached on disk by code.

    Cached rather than refetched because these files change on the order of
    months (GSI publishes a per-municipality update date), while a render
    might run many times an hour.
    """
    os.makedirs(cache_dir, exist_ok=True)
    path = os.path.join(cache_dir, f"gsi-evacuation-{municipality_code}.geojson")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    url = GSI_EVACUATION_URL.format(municipality_code=municipality_code)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    raw = urllib.request.urlopen(request, timeout=timeout).read().decode("utf-8")
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        fh.write(raw)
    os.replace(tmp, path)
    return json.loads(raw)


def primary_hazard(properties: dict) -> Optional[str]:
    """The highest-precedence hazard this site is designated for, or None.

    GSI writes the string "1" for designated and "" for not -- not booleans,
    and not null -- so the truth test is explicitly against "1" rather than
    Python truthiness, which would also accept any other non-empty string.
    """
    for field in HAZARD_FIELDS:
        if str(properties.get(field, "")).strip() == "1":
            return field
    return None


def hazard_count(properties: dict) -> int:
    return sum(1 for field in HAZARD_FIELDS
               if str(properties.get(field, "")).strip() == "1")


def parse_evacuation_features(geojson: dict) -> List[dict]:
    """GeoJSON -> [{lon, lat, name, primary, count, water}], dropping anything
    without a usable Point geometry. The source carries no `crs` member; its
    coordinates are JGD2011 lon/lat, which is sub-decimetre from WGS84 and so
    is treated as EPSG:4326 here (the difference is far below one pixel even
    at this project's largest export)."""
    out = []
    for feature in geojson.get("features", []) or []:
        geometry = feature.get("geometry") or {}
        if geometry.get("type") != "Point":
            continue
        coords = geometry.get("coordinates") or []
        if len(coords) < 2:
            continue
        props = feature.get("properties") or {}
        primary = primary_hazard(props)
        out.append({
            "lon": float(coords[0]),
            "lat": float(coords[1]),
            "name": props.get(NAME_FIELD) or "",
            "primary": primary,
            "count": hazard_count(props),
            "water": primary in WATER_HAZARDS if primary else False,
        })
    return out


def load_evacuation_sites(cache_dir: str,
                          municipalities: Tuple[str, ...] = KUROSE_MUNICIPALITIES
                          ) -> List[dict]:
    sites: List[dict] = []
    for code in municipalities:
        sites.extend(parse_evacuation_features(fetch_evacuation_geojson(code, cache_dir)))
    return sites


# --- 用途地域 (legal land-use zoning), 国土数値情報 A29 ----------------------
# One 10 MB national-standard zip covers all of Hyōgo and ships a GeoJSON per
# municipality, so no shapefile driver is needed. This is the dataset
# design/map-generation.md §5 wanted from PLATEAU -- and PLATEAU turns out not
# to cover Kobe at all (verified against the full G-Spatial package index;
# Hyōgo's PLATEAU cities are Himeji, Kakogawa, Miki, Asago and Tatsuno). A29
# is the route that actually exists here.
#
# Licence: 出典：国土交通省国土数値情報ダウンロードサイト. Modified use must say
# so: 「国土数値情報（用途地域データ）」（国土交通省）をもとに作成.
ZONING_URL = "https://nlftp.mlit.go.jp/ksj/gml/data/A29/A29-19/A29-19_28_GML.zip"
ZONING_ATTRIBUTION = (
    "「国土数値情報（用途地域データ）」（国土交通省）をもとに作成 "
    "(Land-use zoning derived from MLIT National Land Numerical Information, A29-19.)"
)
ZONE_NAME_FIELD = "A29_005"       # 用途地域名
ZONE_COVERAGE_FIELD = "A29_006"   # 建蔽率 %
ZONE_FAR_FIELD = "A29_007"        # 容積率 %


def fetch_zoning_geojson(cache_dir: str, municipalities: Tuple[str, ...] = KUROSE_MUNICIPALITIES,
                         timeout: int = 300) -> Dict[str, dict]:
    """{municipality_code: geojson} for the zip's per-municipality members.

    The zip is downloaded once and its members cached individually, because
    the archive's own directory name is CP932-mojibaked when read as UTF-8 --
    matching on the numeric code inside the member name sidesteps having to
    guess the right decoding for a path we only need to look up by number.
    """
    import io
    import zipfile

    os.makedirs(cache_dir, exist_ok=True)
    out: Dict[str, dict] = {}
    missing = []
    for code in municipalities:
        path = os.path.join(cache_dir, f"ksj-zoning-{code}.geojson")
        if os.path.exists(path):
            with open(path, encoding="utf-8") as fh:
                out[code] = json.load(fh)
        else:
            missing.append(code)
    if not missing:
        return out

    request = urllib.request.Request(ZONING_URL, headers={"User-Agent": USER_AGENT})
    blob = urllib.request.urlopen(request, timeout=timeout).read()
    archive = zipfile.ZipFile(io.BytesIO(blob))
    for code in missing:
        member = next((n for n in archive.namelist()
                      if n.endswith(".geojson") and code in n), None)
        if member is None:
            raise ExternalDataError(f"zoning archive has no member for municipality {code}")
        geojson = json.loads(archive.read(member).decode("utf-8"))
        path = os.path.join(cache_dir, f"ksj-zoning-{code}.geojson")
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(geojson, fh, ensure_ascii=False)
        os.replace(tmp, path)
        out[code] = geojson
    return out


def _iter_polygon_rings(geometry: dict):
    """Exterior rings only. Zoning polygons are administrative areas that
    tile the city without holes; an interior ring here would mean a hole in
    the zoning itself, which the source does not model."""
    gtype = geometry.get("type")
    coords = geometry.get("coordinates") or []
    if gtype == "Polygon":
        if coords:
            yield coords[0]
    elif gtype == "MultiPolygon":
        for part in coords:
            if part:
                yield part[0]


def load_zoning(cache_dir: str, frame,
                municipalities: Tuple[str, ...] = KUROSE_MUNICIPALITIES) -> List[dict]:
    """Zoning polygons in MAP space, clipped to the frame square.

    Returns [{geom, zone, coverage, far}] with `geom` a shapely Polygon (or
    MultiPolygon, after clipping) ready for the renderer's own draw helpers.
    """
    from shapely.geometry import Polygon as _Polygon
    from shapely.geometry import box as _box

    square = _box(frame.cx - frame.extent_m / 2.0, frame.cy - frame.extent_m / 2.0,
                 frame.cx + frame.extent_m / 2.0, frame.cy + frame.extent_m / 2.0)
    out = []
    for geojson in fetch_zoning_geojson(cache_dir, municipalities).values():
        for feature in geojson.get("features", []) or []:
            props = feature.get("properties") or {}
            zone = props.get(ZONE_NAME_FIELD)
            if not zone:
                continue
            for ring in _iter_polygon_rings(feature.get("geometry") or {}):
                if len(ring) < 4:
                    continue
                try:
                    poly = _Polygon([frame.lonlat_to_map(float(x), float(y)) for x, y, *_ in ring])
                except Exception:
                    continue
                if not poly.is_valid:
                    poly = poly.buffer(0)
                if poly.is_empty:
                    continue
                clipped = poly.intersection(square)
                if clipped.is_empty:
                    continue
                out.append({
                    "geom": clipped,
                    "zone": zone,
                    "coverage": props.get(ZONE_COVERAGE_FIELD),
                    "far": props.get(ZONE_FAR_FIELD),
                })
    return out


def sites_to_map_space(sites: List[dict], frame) -> List[dict]:
    """Project to MAP space and drop anything outside the frame square.

    Done here, once per render, rather than per tile: `frame.lonlat_to_map`
    runs a real pyproj transform per call, and a tiled export would otherwise
    repeat all 413 of them for every one of its tiles.
    """
    half = frame.extent_m / 2.0
    out = []
    for site in sites:
        mx, my = frame.lonlat_to_map(site["lon"], site["lat"])
        if abs(mx - frame.cx) > half or abs(my - frame.cy) > half:
            continue
        placed = dict(site)
        placed["map_x"], placed["map_y"] = mx, my
        out.append(placed)
    return out
