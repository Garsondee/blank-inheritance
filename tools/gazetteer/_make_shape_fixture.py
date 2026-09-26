"""Regenerate test/fixtures/gazetteer-shape-cases.json.

Not part of the tool. Run by hand when a threshold or an advice sentence
changes, then read the diff before committing it -- the fixture is what holds
the Python and JS implementations together, so a fixture regenerated without
being looked at converts a disagreement into an agreement to be wrong.

    python tools/gazetteer/_make_shape_fixture.py

The real-building cases are copied out of the first drawing session rather than
invented, because the invented ones are the ones that agree with whatever the
code already does.
"""

import io
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core import shape  # noqa: E402

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_OUT = os.path.join(_ROOT, "test", "fixtures", "gazetteer-shape-cases.json")
_DRAFT = os.path.join(_ROOT, "data", "map", "gazetteer-drafts",
                      "session-20260911-144323.json")


def rotate(ring, deg):
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    return [[round(x * c - y * s, 6), round(x * s + y * c, 6)] for x, y in ring]


def circle(radius, n=32):
    """The same construction draw.js's own Circle draft tool uses -- n
    points evenly spaced around a centre. 32 is that tool's own point
    count, so this case is the actual shape a hand-drawn bunker or
    watchtower produces, not a mathematical idealisation of one."""
    return [[round(radius * math.cos(2 * math.pi * i / n), 6),
             round(radius * math.sin(2 * math.pi * i / n), 6)]
            for i in range(n)]


def ellipse(a, b, n=32):
    """An oval, deliberately NOT a circle -- proves CIRCLE_MAX_ELONGATION
    is doing real work, not just CIRCLE_COMPACTNESS alone: an oval this
    elongated still has fairly high compactness, and an oval is a strip
    with rounded ends, something drawn as a corridor, not a room."""
    return [[round(a * math.cos(2 * math.pi * i / n), 6),
             round(b * math.sin(2 * math.pi * i / n), 6)]
            for i in range(n)]


def real(local_id):
    with io.open(_DRAFT, encoding="utf-8") as fh:
        draft = json.load(fh)
    for item in draft["items"]:
        if item["localId"] == local_id:
            return [[round(x, 2), round(y, 2)]
                    for x, y in item["geometry"]["ringPx"]]
    raise KeyError(local_id)


CASES = [
    {
        "name": "axis-aligned square",
        "why": "The baseline. A square is 1:1, fills its own rectangle, and "
               "has the isoperimetric quotient pi/4.",
        "ring": [[0, 0], [10, 0], [10, 10], [0, 10]],
        "opts": {},
    },
    {
        "name": "terrace rotated 40 degrees",
        "why": "The case that makes a minimum-area rectangle necessary. Its "
               "axis-aligned bounding box is 49.8 x 43.2 -- near enough square "
               "to look like a block. It is a 60 x 6 m terrace.",
        "ring": rotate([[0, 0], [60, 0], [60, 6], [0, 6]], 40),
        "opts": {},
    },
    {
        "name": "small shed, narrow but not a sliver",
        "why": "5 x 5 m is under SLIVER_WIDTH_M and is not a wall. Proves the "
               "sliver test needs elongation as well as narrowness.",
        "ring": [[0, 0], [5, 0], [5, 5], [0, 5]],
        "opts": {},
    },
    {
        "name": "L-plan",
        "why": "Fills well under COMPLEX_RECTANGULARITY of its own rectangle.",
        "ring": [[0, 0], [30, 0], [30, 10], [10, 10], [10, 30], [0, 30]],
        "opts": {},
    },
    {
        "name": "metres per pixel of 2",
        "why": "The same square at a different map scale. Lengths double, "
               "areas quadruple, every ratio is unchanged.",
        "ring": [[0, 0], [10, 0], [10, 10], [0, 10]],
        "opts": {"metres_per_px": 2.0},
    },
    {
        "name": "three storeys from a tagged storey count",
        "why": "Floor area is footprint x storeys and is not estimated.",
        "ring": [[0, 0], [20, 0], [20, 20], [0, 20]],
        "opts": {"levels": 3, "height_source": "levels"},
    },
    {
        "name": "height tagged in metres, storeys inferred",
        "why": "22 m over 3.3 m per storey rounds to 7.",
        "ring": [[0, 0], [20, 0], [20, 20], [0, 20]],
        "opts": {"height_m": 22.0, "height_source": "tagged"},
    },
    {
        "name": "a defaulted height does not become storeys",
        "why": "The store fills height_m in for every building and two thirds "
               "of this sheet gets the per-type default. Read as a real "
               "height it makes 8 m into two floors and doubles the floor "
               "area of a shed. `typical` means not known.",
        "ring": [[0, 0], [20, 0], [20, 20], [0, 20]],
        "opts": {"height_m": 8.0, "height_source": "typical"},
    },
    {
        "name": "a bunker: circle, 32 points, 8 m radius",
        "why": "Asked for directly, after a session of hand-drawing bunkers "
               "(big circles) and watchtowers (small ones) with the new "
               "Circle tool: without CIRCLE_COMPACTNESS every one of these "
               "fell through to \"irregular\", which reads as an odd, "
               "asymmetric plan -- backwards for the one shape that is MORE "
               "regular than a plain rectangle, not less.",
        "ring": circle(8.0),
        "opts": {},
    },
    {
        "name": "a watchtower: circle, 32 points, 2.5 m radius",
        "why": "The small end of the same shape -- proves the circle check "
               "is about the RING'S geometry, not the building's size; a "
               "watchtower's footprint is a bicycle-store-sized circle, not "
               "a bicycle-store-sized rectangle.",
        "ring": circle(2.5),
        "opts": {},
    },
    {
        "name": "an oval, not a circle: 20 x 8 m",
        "why": "Proves CIRCLE_MAX_ELONGATION is doing real work, not just "
               "CIRCLE_COMPACTNESS alone -- this still has fairly high "
               "compactness, and an oval is a strip with rounded ends, "
               "something to write as a passage through, not a room.",
        "ring": ellipse(10.0, 4.0),
        "opts": {},
    },
    {
        "name": "real: Baggage Inspection (item-159)",
        "why": "334 m long, 4.3 m across, 1430 m2 of floor. The sliver cap "
               "exists for this: area alone would call it a scene location.",
        "ring": real("item-159"),
        "opts": {},
    },
    {
        "name": "real: North Tower (item-128)",
        "why": "15 tagged storeys over a 5:1 footprint. Elongated and still a "
               "standing location, which is why elongation does not gate.",
        "ring": real("item-128"),
        "opts": {"levels": 15, "height_source": "levels"},
    },
    {
        "name": "real: bicycle store (item-172)",
        "why": "24 m2. The smallest thing in the first session and the reason "
               "this module was written -- and, it turns out, a genuinely "
               "round footprint (0.986 compactness on its own 17 points): "
               "before CIRCLE_COMPACTNESS this fell through to \"irregular\" "
               "even though a real building was sitting right there proving "
               "the check was missing.",
        "ring": real("item-172"),
        "opts": {},
    },
]


def main():
    out = {
        "note": ("Shared fixture for tools/gazetteer/core/shape.py and "
                 "core/shape.mjs. Both test suites assert every case. "
                 "Regenerate with tools/gazetteer/_make_shape_fixture.py and "
                 "read the diff -- see that file's docstring."),
        "generatedBy": "tools/gazetteer/_make_shape_fixture.py",
        "cases": [],
    }
    for case in CASES:
        m = shape.metrics(case["ring"], **case["opts"])
        out["cases"].append({
            "name": case["name"],
            "why": case["why"],
            "ring": case["ring"],
            "opts": case["opts"],
            "metrics": m,
            "capacity": shape.capacity(m),
        })
    with io.open(_OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("wrote %s (%d cases)" % (_OUT, len(out["cases"])))


if __name__ == "__main__":
    main()
