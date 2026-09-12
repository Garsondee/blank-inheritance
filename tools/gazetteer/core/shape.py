"""What shape is this building, how big is it, and how much story can it hold?

Written 2026-09-12 after a session of writing lore for adopted footprints
turned up the obvious problem: a 24 m^2 outline and a 3,876 m^2 outline were
being handed the same blank note field and the same invitation to write. One of
those is a bicycle store. Nothing in the tool said so, so the only thing
stopping three paragraphs of proprietor and history landing on a bike shed was
whoever was writing remembering to look.

So this module answers, from geometry alone, two questions the writer should
have had in front of them the whole time:

    What shape is it?   A long thin outline is a wall, a jetty, a terrace row
                        or a platform canopy -- a corridor, not a room. A
                        square one is a building you can stand inside. The
                        ratio decides, and the ratio is not the bounding box's:
                        a diagonal terrace has a nearly square axis-aligned
                        box and is still a corridor. Minimum-area rectangle,
                        found by rotating calipers on the convex hull.

    How much floor?     Footprint x storeys, with storeys taken from real
                        tagging where it exists and clearly marked as a guess
                        where it does not. Floor area is what bounds how many
                        distinct spaces a place can plausibly have, and the
                        number of distinct spaces is what bounds how much
                        scene it can carry.

capacity() turns those into a ceiling on design/location-depth.md's ladder. It
is advice, in the same sense depth.check()'s `overweight` is advice: it says
what the footprint will comfortably carry, and a deliberate exception (a shaft
down to something, a shrine that matters far past its size) is the writer's
call to make knowingly. The point is that it becomes a call instead of an
oversight.

Pure: no I/O, no georeference, no gpkg. Metres per pixel is 1.0 on this map and
is still passed explicitly, because a constant that is also a coincidence is
the kind of thing that survives until the day the map is re-exported at another
scale. Mirrored in core/shape.mjs and held to it by
test/fixtures/gazetteer-shape-cases.json.
"""

from __future__ import annotations

import math

#: Metres of height per storey where only a storey count is known. 3.3 is what
#: tools/city-map/citymap/parse.py already uses to turn `building:levels` into
#: `height_m`; the two must not disagree or the same building gets two heights
#: depending on which tool you asked.
LEVEL_HEIGHT_M = 3.3

#: Fraction of a footprint that ends up as usable interior once external walls,
#: structure, stairs and corridors are taken out. A planning rule-of-thumb;
#: used only to phrase advice, never to gate.
USABLE_FRACTION = 0.8

#: Floor area one group-sized space needs -- somewhere six people and a GM's
#: worth of trouble can occupy at once without it being a comedy.
ROOM_M2 = 20.0

# --- shape classes -----------------------------------------------------------
# Length:width ratio on the minimum-area rectangle, plus the width itself.
#
# The ratio alone was tried first and was wrong, which is worth recording
# because it is the intuitive version. Measured against the first session's 51
# outlines, a "past 6:1 it is a wall" rule capped the Permit Office -- 13 m
# wide, 82 m long, three storeys, 3,208 m2 of floor -- at a one-line entry. A
# 13 m wide slab is an office block; you can stand a group in it on any floor.
# What actually stops somewhere being a room is not being long. It is being
# NARROW. So the ratio only ever describes, and the width is what gates.

STRIP_ELONGATION = 3.0

#: The minimum-area rectangle's short side, below which there is no room in
#: there at all: a wall, a fence, a canopy, a jetty, a platform edge. Six
#: metres is one room's depth plus its walls -- narrower than that and any
#: interior is a corridor by construction.
SLIVER_WIDTH_M = 6.0

#: How much of its own minimum-area rectangle the outline fills. A plain
#: rectangle is ~1.0; an L-plan or a courtyard block is well under.
BLOCKY_RECTANGULARITY = 0.85
COMPLEX_RECTANGULARITY = 0.62

SHAPES = ("degenerate", "sliver", "strip", "blocky", "complex", "irregular")

# --- capacity ladder ---------------------------------------------------------
# Total floor area (footprint x storeys) needed to carry each depth rung.
# Calibrated against the first real session's 51 adopted outlines -- see
# test/gazetteer/test_shape.py for the measured spread these came from. They
# are ceilings on what a footprint will carry, not floors on what it must be
# given: nothing here ever demands that a place be written up.

CAPACITY_FLOORS = (
    (1500.0, "standing"),
    (200.0, "scene"),
    (30.0, "sketch"),
    (0.0, "named"),
)

_DEPTH_ORDER = ("named", "sketch", "scene", "standing")


class ShapeError(ValueError):
    """Geometry that cannot be measured."""


# --- primitive geometry ------------------------------------------------------

def _same(a, b, eps=1e-9):
    return abs(a[0] - b[0]) <= eps and abs(a[1] - b[1]) <= eps


def _open_ring(ring):
    """Ring as a list of points with any repeated closing point dropped."""
    pts = [(float(x), float(y)) for x, y in ring]
    while len(pts) > 1 and _same(pts[0], pts[-1]):
        pts.pop()
    return pts


def polygon_area(ring):
    """Unsigned shoelace area."""
    pts = _open_ring(ring)
    if len(pts) < 3:
        return 0.0
    total = 0.0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        total += x1 * y2 - x2 * y1
    return abs(total) / 2.0


def polygon_perimeter(ring):
    pts = _open_ring(ring)
    if len(pts) < 2:
        return 0.0
    total = 0.0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        total += math.hypot(x2 - x1, y2 - y1)
    return total


def convex_hull(points):
    """Andrew's monotone chain.

    Returns the hull's distinct vertices, or the 1-2 distinct input points when
    everything is collinear -- callers must cope with a degenerate hull rather
    than being handed a fabricated triangle.
    """
    pts = sorted(set((float(x), float(y)) for x, y in points))
    if len(pts) <= 2:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    upper = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    hull = lower[:-1] + upper[:-1]
    return hull if len(hull) >= 3 else pts


def _norm_angle(a):
    """Fold an axis direction into [0, pi) -- an axis has no arrowhead."""
    a = a % math.pi
    return a + math.pi if a < 0 else a


def min_area_rect(ring):
    """Minimum-area enclosing rectangle: (length, width, angle_rad).

    Rotating calipers over the convex hull. The minimum-area rectangle always
    has a side flush with a hull edge (Freeman and Shapira, 1975), so testing
    one orientation per hull edge is exhaustive, not a heuristic. That is the
    whole reason this is not just a bounding box: a terrace running at 40
    degrees to the page has a nearly square axis-aligned box and a 9:1 minimum
    rectangle, and only the second one is true about the building.

    `angle_rad` is the direction of the LONG side, measured from +x toward +y
    in the image's own frame, normalised to [0, pi).
    """
    hull = convex_hull(ring)
    if len(hull) < 3:
        if len(hull) < 2:
            return 0.0, 0.0, 0.0
        (x1, y1), (x2, y2) = hull[0], hull[-1]
        return (math.hypot(x2 - x1, y2 - y1), 0.0,
                _norm_angle(math.atan2(y2 - y1, x2 - x1)))

    best = None
    n = len(hull)
    for i in range(n):
        x1, y1 = hull[i]
        x2, y2 = hull[(i + 1) % n]
        dx, dy = x2 - x1, y2 - y1
        edge = math.hypot(dx, dy)
        if edge < 1e-12:
            continue
        ux, uy = dx / edge, dy / edge
        vx, vy = -uy, ux
        us = [p[0] * ux + p[1] * uy for p in hull]
        vs = [p[0] * vx + p[1] * vy for p in hull]
        du = max(us) - min(us)
        dv = max(vs) - min(vs)
        area = du * dv
        if best is None or area < best[0] - 1e-12:
            if du >= dv:
                best = (area, du, dv, math.atan2(uy, ux))
            else:
                best = (area, dv, du, math.atan2(vy, vx))

    if best is None:
        return 0.0, 0.0, 0.0
    _, long_side, short_side, angle = best
    return long_side, short_side, _norm_angle(angle)


# --- the measurement ---------------------------------------------------------

def classify(elongation, rectangularity, width_m):
    """The one headline label. See the threshold constants above.

    Order matters and is from most to least consequential. `sliver` needs BOTH
    narrow and long: a 5 x 5 m shed is narrow and is not a wall, it is just
    small, and floor area already says so. `complex` outranks `strip` because
    a plan filling a third of its own rectangle is telling you more about the
    building than its aspect ratio is.
    """
    if elongation is None or not math.isfinite(elongation) or elongation <= 0:
        return "degenerate"
    if width_m < SLIVER_WIDTH_M and elongation >= STRIP_ELONGATION:
        return "sliver"
    if rectangularity < COMPLEX_RECTANGULARITY:
        return "complex"
    if elongation >= STRIP_ELONGATION:
        return "strip"
    if rectangularity >= BLOCKY_RECTANGULARITY:
        return "blocky"
    return "irregular"


def _resolve_height(height_m, levels, height_source):
    """(levels, height_m, source) from whatever was supplied.

    Storeys are the primary quantity because floor area needs a count, not a
    height; a height is converted at LEVEL_HEIGHT_M and floored at one storey,
    since a building with a roof has at least one floor.
    """
    # An explicitly DEFAULTED height is not a measurement and must never be
    # multiplied. The store fills height_m in for every building, using a
    # per-type default (8 m, so two storeys) where nothing is tagged -- and two
    # thirds of this sheet is that default. Reading it as real turned a 24 m2
    # bicycle store into 48 m2 of floor across two levels, which is a number
    # invented by the tool and then presented to the writer as a fact. The
    # height is still reported, because it is what the renderer draws; it just
    # does not get to decide how many floors there are.
    if height_source == "typical":
        return 1, float(height_m) if height_m is not None else LEVEL_HEIGHT_M, "typical"
    if levels is not None:
        lv = max(1, int(round(float(levels))))
        h = float(height_m) if height_m is not None else lv * LEVEL_HEIGHT_M
        return lv, h, height_source or "levels"
    if height_m is not None:
        h = float(height_m)
        lv = max(1, int(round(h / LEVEL_HEIGHT_M)))
        return lv, h, height_source or "tagged"
    return 1, LEVEL_HEIGHT_M, "typical"


def metrics(ring, *, metres_per_px=1.0, height_m=None, levels=None,
            height_source=None):
    """Everything measurable about one footprint.

    `height_m` / `levels` come from real tagging where the outline was adopted
    from a real building. Pass `height_source` to say which: "tagged" (an
    explicit height), "levels" (a storey count), "typical" (a per-building-type
    default, i.e. not actually known), or None to let it be inferred from which
    arguments arrived. The distinction is load-bearing -- a defaulted height is
    a guess wearing a number's clothes, and floor area computed from it has to
    say so.
    """
    pts = _open_ring(ring)
    if len(pts) < 3:
        raise ShapeError("need at least 3 distinct points, got %d" % len(pts))

    mpp = float(metres_per_px)
    area_m2 = polygon_area(pts) * mpp * mpp
    perimeter_m = polygon_perimeter(pts) * mpp
    long_px, short_px, angle = min_area_rect(pts)
    length_m = long_px * mpp
    width_m = short_px * mpp

    rect_area = length_m * width_m
    rectangularity = (area_m2 / rect_area) if rect_area > 1e-9 else 0.0
    elongation = (length_m / width_m) if width_m > 1e-9 else float("inf")
    compactness = ((4.0 * math.pi * area_m2) / (perimeter_m ** 2)
                   if perimeter_m > 1e-9 else 0.0)

    lv, h, src = _resolve_height(height_m, levels, height_source)
    floor_area = area_m2 * lv

    return {
        "vertexCount": len(pts),
        "areaM2": round(area_m2, 1),
        "perimeterM": round(perimeter_m, 1),
        "lengthM": round(length_m, 1),
        "widthM": round(width_m, 1),
        "elongation": (round(elongation, 2)
                       if math.isfinite(elongation) else None),
        "rectangularity": round(rectangularity, 3),
        "compactness": round(compactness, 3),
        # Page-relative, not true north: the sheet is rotated 31 degrees and
        # this answers "does it run along the street as drawn", which is what
        # the person looking at the map is asking.
        "bearingDeg": round(math.degrees(angle), 1),
        "shape": classify(elongation, rectangularity, width_m),
        "levels": lv,
        "heightM": round(h, 1),
        "heightSource": src,
        "floorAreaM2": round(floor_area, 1),
        "floorAreaEstimated": src == "typical",
        # Zero when the plan is narrower than a room is deep. A 334 x 4 m
        # inspection line has 1,430 m2 of floor and therefore "57 rooms" by
        # division, which is arithmetic answering a question nobody asked: you
        # cannot stand six people in a circle anywhere inside it.
        "rooms": (0 if width_m < SLIVER_WIDTH_M
                  else int(floor_area * USABLE_FRACTION // ROOM_M2)),
    }


# --- the gate ----------------------------------------------------------------

def _min_depth(a, b):
    return a if _DEPTH_ORDER.index(a) <= _DEPTH_ORDER.index(b) else b


def _fmt(v):
    return ("%.0f" % v) if v >= 100 else ("%.1f" % v)


def _floor_phrase(floor, rooms):
    """What that much floor is, in buildings rather than in numbers.

    Takes `rooms` as well as area because the two can disagree: a long narrow
    canopy has the floor area of a warehouse and none of its rooms, and saying
    "several distinct spaces" about it would be the tool contradicting itself
    two lines before it says there is no room in there.
    """
    if floor < 30:
        return "a kiosk, a shed, a store, a shrine box"
    # Only reachable when the plan is too narrow, since anything this big has
    # the area for rooms and must therefore lack the width.
    if rooms == 0:
        return "no enclosed space wide enough to stand a group in"
    if floor < 200:
        return "a shop, a house, a single hall"
    if floor < 1500:
        return "a real building with several distinct spaces"
    return "a complex -- wings, floors, somewhere you can get lost"


def _rooms_phrase(rooms):
    """Room counts in bands. 733 is a true number and a useless sentence."""
    if rooms == 0:
        return None
    if rooms == 1:
        return ("Not enough usable floor for two group-sized spaces: treat it "
                "as one room.")
    if rooms <= 5:
        return "Room for %d group-sized spaces at %.0f m2 each." % (rooms, ROOM_M2)
    if rooms <= 20:
        return ("Room for a dozen or so group-sized spaces -- enough for a "
                "floor plan with a front, a back and somewhere staff go.")
    if rooms <= 100:
        return ("Dozens of group-sized spaces. This is a place with wings or "
                "floors that need naming, not one room to describe.")
    return ("Hundreds of group-sized spaces. Do not attempt to describe the "
            "whole of it -- write the few parts anyone will ever be in.")


def capacity(m):
    """How deep an entry this footprint will comfortably carry.

    Returns {maxDepth, reasons, floorAreaM2, rooms, shape}. `reasons` is the
    part worth reading: plain sentences saying what about the geometry set the
    ceiling, so the answer can be argued with rather than only obeyed.
    """
    reasons = []
    floor = m["floorAreaM2"]
    shape = m["shape"]

    ceiling = "named"
    for threshold, depth in CAPACITY_FLOORS:
        if floor >= threshold:
            ceiling = depth
            break

    qualifier = (" (storeys not known, counted as one)"
                 if m.get("floorAreaEstimated") else "")
    reasons.append("%s m2 of floor%s across %d level%s: %s."
                   % (_fmt(floor), qualifier, m["levels"],
                      "" if m["levels"] == 1 else "s",
                      _floor_phrase(floor, m["rooms"])))

    # The one shape cap. Too narrow to hold a room is the only geometric fact
    # that floor area cannot argue with: a 337 m long, 4 m wide inspection line
    # has 1,430 m2 of floor and nowhere to put six people facing each other.
    if m["widthM"] < SLIVER_WIDTH_M and shape == "sliver":
        ceiling = _min_depth(ceiling, "sketch")
        reasons.append(
            "%.0f m long and only %.1f m across: a wall, a jetty, a canopy or "
            "an inspection line. There is no room in there, so write the "
            "passage through it, not the inside of it."
            % (m["lengthM"], m["widthM"]))

    # Everything below describes rather than gates. A long plan and a
    # courtyard plan are both things the writer should know and neither is a
    # reason to write less.
    if shape == "strip" or (shape == "sliver" and m["elongation"]):
        reasons.append(
            "%.0f x %.0f m, %.1f to 1: it runs in a line. Write it as a row, "
            "a range or a frontage -- movement along it, not around it."
            % (m["lengthM"], m["widthM"], m["elongation"]))
    if m["rectangularity"] < COMPLEX_RECTANGULARITY:
        reasons.append(
            "The plan fills only %.0f%% of its own bounding rectangle -- an L, "
            "a U, a cross or a courtyard. Free interior structure; use it."
            % (100 * m["rectangularity"]))
    elif shape == "blocky":
        reasons.append(
            "A plain %.0f%% rectangle: no plan features to lean on, so "
            "whatever makes it distinctive has to be put there."
            % (100 * m["rectangularity"]))

    rooms_line = _rooms_phrase(m["rooms"])
    if rooms_line:
        reasons.append(rooms_line)

    if m.get("floorAreaEstimated"):
        reasons.append("No storey count in the source data, so this is a "
                       "single-storey reading; a real multi-storey building "
                       "would carry more.")

    return {
        "maxDepth": ceiling,
        "reasons": reasons,
        "floorAreaM2": floor,
        "rooms": m["rooms"],
        "shape": shape,
    }


def check(item_depth, m):
    """Does a declared depth exceed what the footprint will carry?

    Returns {ok, declared, maxDepth, reasons, ...}. `ok` false means the
    declaration is bigger than the building -- a thing to know before writing,
    not after.
    """
    cap = capacity(m)
    declared = item_depth if item_depth in _DEPTH_ORDER else "named"
    ok = _DEPTH_ORDER.index(declared) <= _DEPTH_ORDER.index(cap["maxDepth"])
    return {
        "ok": ok,
        "declared": declared,
        "maxDepth": cap["maxDepth"],
        "reasons": cap["reasons"],
        "shape": cap["shape"],
        "floorAreaM2": cap["floorAreaM2"],
        "rooms": cap["rooms"],
    }
