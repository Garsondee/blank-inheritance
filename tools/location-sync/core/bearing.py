"""Which way to walk, on the map you are actually looking at.

Ingram, 2026-09-13, on a real wrong description ("270 m NW of General
Hospital" that should have read SE): "Assume the north of this map is the
top... If we use these directions when making descriptions we'll end up
with contradictions." The page is rotated 31 degrees against true
geographic north (georef.py's own frame maths), but nobody reading a
description is holding a compass to the real city under Kobe -- they are
looking at the drawn map, where up is north because that is how the map is
drawn. Every compass direction that ever reaches prose -- a building's
bearing from a landmark, a journey's heading, anything a person or an NPC
would say out loud -- must be computed in image-pixel space, this module,
never converted through the real-world frame first.

This was tried the other way once already and documented as deliberate:
an EARLIER, now-deleted function in georef.py computed "true" bearing via
the source CRS specifically to avoid a feared error ("getting this wrong
would put every written direction a third of a quadrant out"), reasoning
that "north really is up" only in the rotated real-world frame. That
reasoning is backwards for anything story-facing -- north is up on the
PAGE, full stop, precisely because nothing in the fiction ever sees the
real-world rotation -- and it was never actually called from anywhere, so
it was removed rather than left as a trap for the next place that needed
a bearing and reached for the wrong one.

Pure: plain image-pixel deltas, no georeference, no I/O. Mirrored in
bearing.mjs for the browser, held to it by a shared fixture
(test/fixtures/gazetteer-bearing-cases.json), matching grid.py's own
precedent for exactly this kind of dual-implementation risk.
"""

from __future__ import annotations

import math

#: Sixteen-point compass, index 0 = north, going clockwise -- the ordering
#: bearing_to_point's arithmetic below assumes directly.
POINTS_16 = (
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
)

#: Eight-point compass -- what a breadcrumb or a short description actually
#: wants; sixteen points read as false precision in a sentence.
POINTS_8 = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")


def bearing_deg(from_px, to_px):
    """Compass bearing FROM `from_px` TO `to_px`, in page-relative degrees,
    0 = north (up on the image), clockwise. Image y increases downward, so
    "south" is +y -- the same convention core/shape.py's own bearingDeg
    field already uses for a footprint's long axis, extended here to the
    bearing BETWEEN two points rather than one shape's own orientation.

    The caller's argument order is the whole contract: "A is 200m NW of B"
    is a claim about B's bearing to A (start at B, head NW, arrive at A),
    so writing that sentence calls `bearing_deg(b, a)`, not `(a, b)` --
    reversing it silently flips every direction 180 degrees, which reads
    as plausible right up until someone checks it against the map.
    """
    dx = to_px[0] - from_px[0]
    dy = to_px[1] - from_px[1]
    if dx == 0 and dy == 0:
        # Two coincident points have no real direction between them.
        # atan2(0, -0.0) is IEEE 754-defined as +pi, not 0 -- a platform-
        # dependent trap (it shows up when `dy` is a float `-0.0`, not an
        # int `0`) rather than a meaningful bearing, so it is short-
        # circuited here instead of trusted.
        return 0.0
    deg = math.degrees(math.atan2(dx, -dy))  # atan2(east, north); north = -y
    return deg + 360.0 if deg < 0 else deg


def compass_point(deg, *, points=POINTS_8):
    """A bearing in degrees as one of `points` (8 or 16), for prose."""
    step = 360.0 / len(points)
    return points[int((deg % 360.0) / step + 0.5) % len(points)]


def distance_m(a_px, b_px, metres_per_px=1.0):
    """Straight-line ground distance between two image pixels."""
    return math.hypot(b_px[0] - a_px[0], b_px[1] - a_px[1]) * metres_per_px


def describe(from_px, to_px, metres_per_px=1.0, *, points=POINTS_8):
    """`{"distanceM": ..., "bearingDeg": ..., "compass": ...}` FROM
    `from_px` TO `to_px` -- the one call most callers actually want,
    bundling the three numbers a description needs together so the
    argument-order contract only has to be honoured in one place."""
    deg = bearing_deg(from_px, to_px)
    return {
        "distanceM": round(distance_m(from_px, to_px, metres_per_px), 1),
        "bearingDeg": round(deg, 1),
        "compass": compass_point(deg, points=points),
    }
