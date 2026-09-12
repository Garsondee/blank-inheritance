"""Regenerate test/fixtures/gazetteer-containment-cases.json.

Not part of the tool. Run by hand when the tolerance or the algorithm
changes, then read the diff before committing it -- the fixture is what holds
the Python and JS implementations together.

    python tools/gazetteer/_make_containment_fixture.py

The real-session case is copied out of the first drawing session's regions
rather than invented, for the same reason shape.py's fixture does: it is the
case that actually broke (an island sitting in another region's hole,
originally invisible to a naive exterior-to-exterior adjacency test), and an
invented case is the case that agrees with whatever the code already does.
"""

import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core import containment  # noqa: E402

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_OUT = os.path.join(_ROOT, "test", "fixtures", "gazetteer-containment-cases.json")
_DRAFT = os.path.join(_ROOT, "data", "map", "gazetteer-drafts",
                      "session-20260911-144323.json")


def region(local_id, ring, holes=None, name=""):
    geom = {"kind": "polygon", "ringPx": ring}
    if holes:
        geom["holesPx"] = holes
    return {"localId": local_id, "tier": "region", "name": name, "geometry": geom}


def site(local_id, ring):
    return {"localId": local_id, "tier": "site", "name": "",
            "geometry": {"kind": "polygon", "ringPx": ring}}


def point(local_id, xy):
    return {"localId": local_id, "tier": "point", "name": "",
            "geometry": {"kind": "point", "pointPx": xy}}


def real_islands_and_their_sea():
    """The exact case that exposed the hole-adjacency bug: item-214 (a land
    region) sits precisely in item-211's (a water region) hole."""
    with io.open(_DRAFT, encoding="utf-8") as fh:
        draft = json.load(fh)
    by_id = {i["localId"]: i for i in draft["items"]}
    river = by_id["item-214"]
    sea = by_id["item-211"]
    return [
        {"localId": "sea", "tier": "region", "name": "The Open Sea",
         "geometry": {"kind": "polygon",
                     "ringPx": sea["geometry"]["ringPx"],
                     "holesPx": sea["geometry"].get("holesPx") or []}},
        {"localId": "river-island", "tier": "region", "name": "The River Island",
         "geometry": {"kind": "polygon", "ringPx": river["geometry"]["ringPx"]}},
    ]


CASES = [
    {
        "name": "two adjacent unit squares share a border",
        "why": "The baseline: A and B share the whole edge x=10, and each "
               "contains the site drawn inside it.",
        "items": [
            region("a", [[0, 0], [10, 0], [10, 10], [0, 10]]),
            region("b", [[10, 0], [20, 0], [20, 10], [10, 10]]),
            site("s-in-a", [[2, 2], [4, 2], [4, 4], [2, 4]]),
            site("s-in-b", [[12, 2], [14, 2], [14, 4], [12, 4]]),
        ],
    },
    {
        "name": "two distant squares are not neighbours",
        "why": "A and C do not touch; nothing should link them.",
        "items": [
            region("a", [[0, 0], [10, 0], [10, 10], [0, 10]]),
            region("c", [[100, 100], [110, 100], [110, 110], [100, 110]]),
        ],
    },
    {
        "name": "an unclaimed point has no containing region",
        "why": "A point far from every region comes back with "
               "withinRegionRef null, not an error and not a guess.",
        "items": [
            region("a", [[0, 0], [10, 0], [10, 10], [0, 10]]),
            point("p-outside", [500, 500]),
        ],
    },
    {
        "name": "an overlap is won by the smaller region",
        "why": "A mid-session tessellation is not always clean yet. Where two "
               "regions genuinely overlap, the smaller is the more specific "
               "answer -- the same rule core/location.py already uses for "
               "promoted locations.",
        "items": [
            region("big", [[0, 0], [100, 0], [100, 100], [0, 100]]),
            region("small", [[40, 40], [60, 40], [60, 60], [40, 60]]),
            site("s-mid", [[48, 48], [52, 48], [52, 52], [48, 52]]),
        ],
    },
    {
        "name": "a hole excludes the building sitting in it",
        "why": "A donut region with a site in its hole must not claim that "
               "site -- the hole is the whole point of drawing one.",
        "items": [
            region("donut", [[0, 0], [100, 0], [100, 100], [0, 100]],
                  holes=[[[40, 40], [60, 40], [60, 60], [40, 60]]]),
            site("s-in-hole", [[48, 48], [52, 48], [52, 52], [48, 52]]),
        ],
    },
    {
        "name": "real: an island sitting in another region's hole",
        "why": "The bug this module was written to catch. A first version "
               "tested only exterior-to-exterior pairs and reported The River "
               "Island (a real 13-vertex land region) as having ZERO "
               "neighbours, despite sharing its entire outline with The Open "
               "Sea's hole. Fixed by testing every boundary ring -- exterior "
               "AND holes -- on both sides.",
        "items": real_islands_and_their_sea(),
    },
]


def main():
    out = {
        "note": ("Shared fixture for tools/gazetteer/core/containment.py and "
                 "core/containment.mjs. Both test suites assert every case. "
                 "Regenerate with tools/gazetteer/_make_containment_fixture.py "
                 "and read the diff -- see that file's docstring."),
        "generatedBy": "tools/gazetteer/_make_containment_fixture.py",
        "tolerance": containment.PROXIMATE_TOLERANCE_PX,
        "cases": [],
    }
    for case in CASES:
        result = containment.compute(case["items"])
        out["cases"].append({
            "name": case["name"],
            "why": case["why"],
            "items": case["items"],
            "result": result,
        })
    with io.open(_OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("wrote %s (%d cases)" % (_OUT, len(out["cases"])))


if __name__ == "__main__":
    main()
