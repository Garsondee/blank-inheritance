"""Where is the water, according to the map Ingram actually painted?

This exists because of one standing constraint, stated plainly (2026-09-11):
"the map I've drawn isn't the same as the real data, there's a missing airport
and I've changed a large island into a smaller fort." So the coastline cannot
come from OpenStreetMap. OSM knows about an airport that is under the sea on
this map, and about an island that has been replaced by a fort a fraction of
its size. Asking it where the water is would produce regions that tessellate
beautifully over a world nobody is playing in.

The painted PNG is the authority. It is read directly, at a coarse sample
step, and classified on two properties, because one is not enough:

    blue-dominant   blue exceeds red. Sea is +8. Bare ground, city and quay
                    are all strongly negative (-24 to -53).
    bright          and then brightness separates the sea from the only other
                    blue-dominant thing on the map, which is forest.

The second test was added after the first version tinted half the northern
uplands as ocean. Painted forest is rgb(72, 71, 76): blue-dominant by +4, and
dark. Sea is rgb(180, 189, 188) and light. Over 230,400 samples the two form
clean separate peaks -- 20,139 samples at brightness 70-79, 93,261 at 200-209
-- with the bins between 120 and 139 holding seven samples in total. The
threshold sits in that empty band, so it is a real boundary in the painting
rather than a number chosen to make the answer come out.

What comes out is two shapely geometries that together cover the content area
exactly, with no gaps and no overlaps -- which is the property the region
tessellation is then built on top of, so it has to hold here first.

Separate from tools/gazetteer/coverage.py on purpose. Coverage answers "do
these regions tile the sheet" and is forbidden from consulting anything about
the world, so that a tessellation cannot be declared complete by the same
opinions that drew it. This module is allowed to look at the map, because the
map is the thing being described.
"""

from __future__ import annotations

import json
import os

from shapely.geometry import box
from shapely.ops import unary_union

from core import grid

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

DEFAULT_IMAGE = os.path.join(_REPO_ROOT, "artwork", "in-tray", "campaign-map.png")
DEFAULT_CACHE = os.path.join(os.path.dirname(__file__), "_cache", "landmask.json")

#: Content area, matching coverage.py's DEFAULT_EXTENT exactly. Regions must
#: tile this, so the mask has to be measured over the same rectangle.
DEFAULT_EXTENT = (
    float(grid.BORDER_PX),
    float(grid.BORDER_PX),
    float(grid.BORDER_PX + grid.GRID_COLS * grid.CELL_PX),
    float(grid.BORDER_PX + grid.GRID_ROWS * grid.CELL_PX),
)

#: Image pixels per sample. 25 m is finer than any district boundary needs to
#: be and keeps the whole grid at 480x480, which fits in memory as plain lists.
DEFAULT_STEP = 25

#: How much bluer than red a sample must be to count as water. Sea measures
#: +8; every painted ground cover is strongly negative (-24 bare upland, -47
#: dense city, -53 quay). Only forest also comes out positive, at +4, which is
#: what the brightness test below is for.
WATER_BLUE_EXCESS = 3

#: Brightness -- max(r, g, b) -- above which a blue-dominant sample is sea
#: rather than forest. Measured: forest peaks at 70-79, sea at 200-209, and
#: the bins from 120 to 139 hold seven samples out of 230,400. Anything from
#: about 120 to 195 gives the same classification.
WATER_MIN_BRIGHTNESS = 140

#: Specks smaller than this are dropped, in square metres. A boat, a jetty
#: highlight or a roof painted in a cool grey should not become an island, and
#: a puddle of shadow in a dock should not become a sea.
MIN_FEATURE_M2 = 20000.0

#: Pixel reads per axis inside each sample block, majority-voted. Not an
#: efficiency knob -- a correctness one. The sheet has grid-tick dots printed
#: over open sea on a 200 px pitch, and a single centre read at DEFAULT_STEP
#: landed on one every eighth row exactly, classifying a dotted line of ocean
#: as land the whole height of the sheet. (The grid RULES are innocent, which
#: is worth recording because they are the obvious suspect: measured in open
#: water at y=400, the line is one pixel wide and still reads as water.)
#: Three offsets per axis at 1/6, 1/2 and 5/6 of the block cannot all land on
#: the same small mark, so the ground outvotes the overlay. The same holds for
#: contour lines, roads and any other hairline drawn on top.
SAMPLES_PER_CELL = 3

#: Staircase smoothing, in metres. At DEFAULT_STEP the coastline comes out as
#: 25 m steps; simplifying at one and a half steps removes the stair without
#: moving the line anywhere it was not already.
SIMPLIFY_M = 37.5


class Mask:
    """A binary raster: 1 where the painted map is water."""

    def __init__(self, bits, cols, rows, step, origin):
        self.bits = bits
        self.cols = cols
        self.rows = rows
        self.step = step
        self.origin = origin  # (x0, y0) in image px of sample (0, 0)

    def __getitem__(self, cr):
        c, r = cr
        return self.bits[r * self.cols + c]

    @property
    def water_fraction(self):
        return sum(self.bits) / float(len(self.bits)) if self.bits else 0.0

    def to_json(self):
        return {
            "cols": self.cols, "rows": self.rows, "step": self.step,
            "origin": list(self.origin),
            # Run-length encoded: the raw grid is 230k characters and most of
            # it is one long run of sea.
            "runs": _rle(self.bits),
        }

    @classmethod
    def from_json(cls, doc):
        return cls(_unrle(doc["runs"]), doc["cols"], doc["rows"], doc["step"],
                   tuple(doc["origin"]))


def _rle(bits):
    runs = []
    if not bits:
        return runs
    current = bits[0]
    length = 0
    for b in bits:
        if b == current:
            length += 1
        else:
            runs.append([current, length])
            current, length = b, 1
    runs.append([current, length])
    return runs


def _unrle(runs):
    out = []
    for value, length in runs:
        out.extend([value] * length)
    return out


def sample(image_path=None, step=DEFAULT_STEP, extent=None,
           blue_excess=WATER_BLUE_EXCESS,
           min_brightness=WATER_MIN_BRIGHTNESS,
           per_cell=SAMPLES_PER_CELL, furniture=None):
    """Read the painted map and classify every sample block.

    A majority of several pixel reads per block rather than a mean of the
    block: a mean over a block straddling a quay lands between the two classes
    and there is no third class for it to land in, whereas a vote still comes
    out as one side or the other and is what overrules the printed grid.

    `furniture` is a list of (x0, y0, x1, y1, ground) rectangles that are page
    furniture rather than terrain -- the legend cartouche, most obviously. They
    are forced to the stated ground instead of read, because reading them
    classifies a cream-coloured printed box as three square kilometres of
    reclaimed land sitting in the middle of the bay.
    """
    from PIL import Image  # local: keeps the module importable without PIL

    Image.MAX_IMAGE_PIXELS = None
    x0, y0, x1, y1 = extent or DEFAULT_EXTENT
    image = Image.open(image_path or DEFAULT_IMAGE).convert("RGB")
    px = image.load()
    width, height = image.size
    furniture = list(furniture or [])

    cols = int((x1 - x0) // step)
    rows = int((y1 - y0) // step)
    n = max(1, int(per_cell))
    offsets = [int(step * (2 * i + 1) / (2.0 * n)) for i in range(n)]
    needed = (n * n) // 2 + 1
    bits = []
    for r in range(rows):
        cell_y = int(y0) + r * step
        for c in range(cols):
            cell_x = int(x0) + c * step
            forced = _furniture_ground(furniture, cell_x + step / 2.0,
                                       cell_y + step / 2.0)
            if forced is not None:
                bits.append(1 if forced == "water" else 0)
                continue
            wet = 0
            for dy in offsets:
                sy = min(height - 1, cell_y + dy)
                for dx in offsets:
                    sx = min(width - 1, cell_x + dx)
                    red, green, blue = px[sx, sy]
                    if ((blue - red) >= blue_excess
                            and max(red, green, blue) >= min_brightness):
                        wet += 1
            bits.append(1 if wet >= needed else 0)
    return Mask(bits, cols, rows, step, (x0 + step / 2.0, y0 + step / 2.0))


def _furniture_ground(furniture, x, y):
    """The declared ground under a page-furniture rectangle, or None."""
    for fx0, fy0, fx1, fy1, ground in furniture:
        if fx0 <= x < fx1 and fy0 <= y < fy1:
            return ground
    return None


def furniture_from_manifest(manifest_path=None):
    """Page-furniture rectangles declared in data/map/campaign-map.json.

    Kept in the manifest rather than in this module because where the legend
    sits is a fact about the painting, and the painting is re-exported by hand.
    A rectangle hard-coded here would go stale silently the first time the
    cartouche moved; one in the manifest sits next to the image hash that also
    changes when it does.
    """
    path = manifest_path or os.path.join(
        _REPO_ROOT, "data", "map", "campaign-map.json")
    try:
        with open(path, encoding="utf-8") as fh:
            doc = json.load(fh)
    except (OSError, ValueError):
        return []
    out = []
    for entry in doc.get("pageFurniture") or []:
        rect = entry.get("rect")
        if not rect or len(rect) != 4:
            continue
        out.append((float(rect[0]), float(rect[1]), float(rect[2]),
                    float(rect[3]), entry.get("ground", "water")))
    return out


def _runs_to_boxes(mask, value, extent):
    """Horizontal runs of one class, as boxes clipped to the extent.

    Merging each row's runs before building geometry is the difference between
    unioning ~100,000 unit squares and unioning a few thousand rectangles.
    """
    x0, y0, x1, y1 = extent
    step = mask.step
    boxes = []
    for r in range(mask.rows):
        c = 0
        while c < mask.cols:
            if mask[c, r] != value:
                c += 1
                continue
            start = c
            while c < mask.cols and mask[c, r] == value:
                c += 1
            boxes.append(box(
                max(x0, x0 + start * step), max(y0, y0 + r * step),
                min(x1, x0 + c * step), min(y1, y0 + (r + 1) * step)))
    return boxes


def _drop_specks(geom, min_area):
    """Remove parts and holes smaller than min_area, keeping it valid."""
    if geom.is_empty:
        return geom
    from shapely.geometry import MultiPolygon, Polygon

    parts = list(getattr(geom, "geoms", [geom]))
    kept = []
    for part in parts:
        if part.area < min_area:
            continue
        holes = [ring for ring in part.interiors
                 if Polygon(ring).area >= min_area]
        kept.append(Polygon(part.exterior, holes))
    if not kept:
        return geom if geom.area >= min_area else geom.buffer(0).difference(geom)
    return kept[0] if len(kept) == 1 else MultiPolygon(kept)


def to_polygons(mask, extent=None, min_feature_m2=MIN_FEATURE_M2,
                simplify_m=SIMPLIFY_M, metres_per_px=1.0):
    """(land, water) covering the extent exactly.

    Water is built from the mask and land is the extent minus it, rather than
    both being built independently. That is deliberate: two independently
    rasterised geometries would agree to within a rounding error, and "within
    a rounding error" is exactly the sliver that later shows up as a gap in
    the coverage report.
    """
    extent = extent or DEFAULT_EXTENT
    sheet = box(*extent)
    min_area_px2 = min_feature_m2 / (metres_per_px ** 2)

    water = unary_union(_runs_to_boxes(mask, 1, extent))
    if simplify_m:
        water = water.simplify(simplify_m / metres_per_px, preserve_topology=True)
    water = water.buffer(0).intersection(sheet)
    water = _drop_specks(water, min_area_px2).buffer(0)

    land = sheet.difference(water).buffer(0)
    # Islands and lakes below the threshold have already gone from `water`;
    # this second pass removes the same size of speck from the land side,
    # then hands the difference straight back so the two still sum to `sheet`.
    land = _drop_specks(land, min_area_px2).buffer(0)
    water = sheet.difference(land).buffer(0)
    return land, water


class ClipError(ValueError):
    pass


def clip_ring_to_shore(ring_px, land, water, *, kind, min_area_px2=1.0):
    """A hand-drawn ring, trimmed to the real painted coastline.

    Districts were voronoi-seeded (2026-09-11), so most run straight out over
    open water at the map's edges rather than following the shore -- Ingram's
    own words, 2026-09-12: "increase the resolution of these district borders
    and the ocean borders." `land`/`water` are landmask.load()'s own output,
    which is the authoritative shore for this exact reason (design/
    map-generation.md: OSM's coastline is wrong here on purpose -- a buried
    airport, a shrunk island -- so only the painted map can answer this).

    Which target to clip against follows the region's own declared `kind`:
    a land district is intersected with `land`, a water region (The Open Sea,
    The Inner Harbour, ...) with `water`. Clipping the wrong one would trim a
    bay down to its own headlands.

    A clip that empties the shape, or splits it into several disconnected
    pieces, is refused rather than silently returning a MultiPolygon a
    session item's ringPx cannot represent -- the caller is expected to
    report this as "needs a look," not a shape a person never drew.
    """
    from shapely.geometry import Polygon
    from shapely.ops import unary_union

    target = water if kind == "water" else land
    ring = Polygon(ring_px)
    if not ring.is_valid:
        ring = ring.buffer(0)
    clipped = ring.intersection(unary_union(target))
    clipped = _drop_specks(clipped, min_area_px2) if not clipped.is_empty else clipped

    if clipped.is_empty:
        raise ClipError("clipping to the shore leaves nothing -- "
                        "this shape may not actually touch %s" % kind)
    parts = list(getattr(clipped, "geoms", [clipped]))
    parts = [p for p in parts if p.area >= min_area_px2]
    if len(parts) > 1:
        raise ClipError("clipping to the shore splits this into %d separate "
                        "pieces -- needs a look before this can be applied "
                        "automatically" % len(parts))

    poly = parts[0]
    exterior = [[round(x, 1), round(y, 1)] for x, y in poly.exterior.coords[:-1]]
    holes = [[[round(x, 1), round(y, 1)] for x, y in interior.coords[:-1]]
            for interior in poly.interiors]
    return {
        "ringPx": exterior, "holesPx": holes,
        "areaPx2": round(poly.area, 1),
        "areaChangePx2": round(poly.area - ring.area, 1),
    }


def build(image_path=None, step=DEFAULT_STEP, extent=None, cache_path=None):
    """Sample, cache the raster, and return (mask, land, water)."""
    mask = sample(image_path=image_path, step=step, extent=extent,
                  furniture=furniture_from_manifest())
    path = cache_path or DEFAULT_CACHE
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump({
            "note": ("Land/water classification of the painted campaign map. "
                     "Regenerate with tools/gazetteer/landmask.py after any "
                     "re-export from Photoshop -- the coastline is authored, "
                     "not derived, so a new export can move it."),
            "source": os.path.basename(image_path or DEFAULT_IMAGE),
            "blueExcess": WATER_BLUE_EXCESS,
            "minBrightness": WATER_MIN_BRIGHTNESS,
            "mask": mask.to_json(),
        }, fh)
    land, water = to_polygons(mask, extent=extent)
    return mask, land, water


def load(cache_path=None):
    """(mask, land, water) from the cache, without re-reading the 12400 px PNG."""
    path = cache_path or DEFAULT_CACHE
    with open(path, encoding="utf-8") as fh:
        doc = json.load(fh)
    mask = Mask.from_json(doc["mask"])
    land, water = to_polygons(mask)
    return mask, land, water


def main(argv=None):
    import argparse
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--image", default=None)
    parser.add_argument("--step", type=int, default=DEFAULT_STEP)
    args = parser.parse_args(argv)

    mask, land, water = build(image_path=args.image, step=args.step)
    total = land.area + water.area
    print("sampled %dx%d at %d px" % (mask.cols, mask.rows, mask.step))
    print("water %.1f%% of samples" % (100 * mask.water_fraction))
    print("land  %10.0f px2 (%.1f%%)  parts %d"
          % (land.area, 100 * land.area / total, len(getattr(land, "geoms", [land]))))
    print("water %10.0f px2 (%.1f%%)  parts %d"
          % (water.area, 100 * water.area / total, len(getattr(water, "geoms", [water]))))
    x0, y0, x1, y1 = DEFAULT_EXTENT
    print("sum vs sheet: %.4f px2 of difference"
          % abs(total - (x1 - x0) * (y1 - y0)))


if __name__ == "__main__":
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    main()
