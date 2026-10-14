#!/usr/bin/env python
"""Export where the water is on the campaign map as one small static file Foundry can read.

    python tools/location-sync/export_land_grid.py              write data/map/land-grid.json
    python tools/location-sync/export_land_grid.py --check      exit 1 if that file is not what the land mask gives now
    python tools/location-sync/export_land_grid.py --stats      print what would be written, write nothing

Why this exists (design/location-editor.md section 16): the Location Editor checks that a token can walk a whole episode, and the commonest way a journey
breaks on this map is a stretch of "walk" that goes straight across open water (a token landing in the ocean, found live 2026-09-19 and 2026-09-23). The router
only ever walks where no road or rail is drawn, and it knows nothing of the sea, so the check needs the painted coastline. That is
tools/location-sync/landmask.py: the coastline here is authored, not OpenStreetMap's, so the painted PNG is the authority. Foundry cannot read the 245 MB PNG,
so this writes the coarse classification landmask.py already makes (a 25 m grid, 480 x 480) as a file about 30 KB long.

Format (version 1):
    { "kind": "land-grid", "version": 1, "cols": 480, "rows": 480, "step": 25, "origin": [212.5, 212.5],
      "runs": [[value, length], ...] }
`origin` is the centre of the first sample in image px; samples run along each row, then down; `value` is 1 for water and 0 for land. A point outside the grid (the
painted border) is simply not in it: the reader says "unknown", never "water".
"""

from __future__ import annotations

import argparse
import json
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO = os.path.abspath(os.path.join(_HERE, "..", ".."))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

OUTPUT = os.path.join(_REPO, "data", "map", "land-grid.json")
VERSION = 1


def read_mask(cache_path=None):
    """The land mask landmask.py keeps (rebuilt from the painted map when there is no cache), as a plain dict."""
    import landmask

    path = cache_path or landmask.DEFAULT_CACHE
    if not os.path.exists(path):
        landmask.build(cache_path=path)
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)["mask"]


def document(mask):
    runs = [[int(v), int(n)] for v, n in mask["runs"]]
    total = sum(n for _, n in runs)
    if total != mask["cols"] * mask["rows"]:
        raise ValueError("the runs cover %d samples, the grid has %d" % (total, mask["cols"] * mask["rows"]))
    return {
        "$schema": "../schema/land-grid.schema.json",
        "kind": "land-grid",
        "version": VERSION,
        "cols": int(mask["cols"]),
        "rows": int(mask["rows"]),
        "step": int(mask["step"]),
        "origin": [float(mask["origin"][0]), float(mask["origin"][1])],
        "runs": runs,
    }


def serialise(doc):
    return json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n"


def water_fraction(doc):
    total = doc["cols"] * doc["rows"]
    return sum(n for v, n in doc["runs"] if v == 1) / float(total)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--stats", action="store_true")
    args = parser.parse_args(argv)

    doc = document(read_mask())
    text = serialise(doc)
    summary = "%dx%d samples of %d m, %d runs, %.1f%% water, %.1f KB" % (doc["cols"], doc["rows"], doc["step"], len(doc["runs"]), 100 * water_fraction(doc), len(text) / 1024.0)
    if args.stats:
        print(summary)
        return 0
    if args.check:
        have = open(OUTPUT, encoding="utf-8").read() if os.path.exists(OUTPUT) else None
        if have == text:
            print("%s is current (%s)" % (os.path.relpath(OUTPUT, _REPO), summary))
            return 0
        print("%s is %s: run python tools/location-sync/export_land_grid.py" % (os.path.relpath(OUTPUT, _REPO), "missing" if have is None else "out of date"))
        return 1
    with open(OUTPUT, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)
    print("wrote %s (%s)" % (os.path.relpath(OUTPUT, _REPO), summary))
    return 0


if __name__ == "__main__":
    sys.exit(main())
