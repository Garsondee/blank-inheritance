#!/usr/bin/env python3
"""Draws the campaign map's reference-grid layers in the two-tier scheme.

    python tools/gazetteer/make_grid_layers.py

Replaces two layers that are already composited into the Photoshop master and
adds a third:

    23-grid-lines.png    12000x12000  cell hairlines + heavier 2 km major rules
    24-grid-labels.png   12000x12000  two-digit cell labels + major labels
    25-grid-border.png   12400x12400  the margin furniture: A-F, 1-6, ticks

The first two keep the filenames and dimensions the existing layers already
have, so recompositing is a straight swap rather than a re-layout. The third is
new: the 200 px painted margin has always been empty, and on a survey sheet the
margin is where you actually read a reference off.

**Why this has to happen at all.** The labels currently baked into the master
are the old scheme, and they disagree with the new one twice over: they read
"col,row" rather than a major plus two digits, and their rows count UP from the
frame's origin at the bottom of the page while the new scheme counts DOWN from
the top, the way a raster and a reading eye both do. Leaving them would put two
contradictory numbering systems on one sheet.

This does not run the renderer. Grid geometry needs no world, no DEM and no
OSM -- it is arithmetic on the page -- so this takes seconds where a render
takes minutes, and it keeps working now that the vector pipeline is retired.
The scheme itself lives in core/grid.py and is shared with the browser and the
server, so a label drawn here cannot disagree with a reference computed there.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

_HERE = os.path.dirname(os.path.abspath(__file__))
# core/ is a sibling of this script's PARENT (tools/location-sync/core/),
# not of map-production/ itself -- these map-production scripts moved into
# their own subdirectory when tools/gazetteer/ was retired
# (design/location-editor.md §10 phase 6); core/ did not move with them.
sys.path.insert(0, os.path.dirname(_HERE))

from core import grid  # noqa: E402

Image.MAX_IMAGE_PIXELS = None

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEFAULT_OUT = os.path.join(_REPO_ROOT, "tools", "city-map", "export", "layers-v2")
MANIFEST = os.path.join(_REPO_ROOT, "data", "map", "campaign-map.json")

TRANSPARENT = (0, 0, 0, 0)

# Black hairlines, matching what the retired renderer already put on this map.
# The reasoning is recorded at citymap/render_layers.py:160-179 and came from
# looking at a real render: thin black reads as a technical-drawing reference
# grid, where a bright colour reads as an overlay stuck on top. Kept a little
# under fully opaque so a line crossing detail never hides it outright.
CELL_LINE = (0, 0, 0, 150)
CELL_LINE_W = 1

# The major rule has to be findable from across the table at a glance while
# still being a drawn line rather than a bar. Three pixels at 1 m/px is a
# three-metre line -- invisible as a measurement, unmistakable as a division.
MAJOR_LINE = (0, 0, 0, 235)
MAJOR_LINE_W = 3

CELL_LABEL = (0, 0, 0, 190)
MAJOR_LABEL = (0, 0, 0, 130)
BORDER_INK = (28, 24, 16, 255)

# Windows system faces, same candidates and same order the existing map labels
# already use, so new page furniture sits in the same voice as the old.
FONT_DIR = "C:\\Windows\\Fonts"
FONT_CANDIDATES = ("YuGothM.ttc", "meiryo.ttc", "msgothic.ttc", "segoeui.ttf", "arial.ttf")
FONT_BOLD_CANDIDATES = ("YuGothB.ttc", "meiryob.ttc", "segoeuib.ttf", "arialbd.ttf") + FONT_CANDIDATES


def find_font(size, bold=False):
    for name in (FONT_BOLD_CANDIDATES if bold else FONT_CANDIDATES):
        path = os.path.join(FONT_DIR, name)
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, max(1, int(size)))
            except Exception:
                continue
    return ImageFont.load_default()


def _text_size(draw, text, font):
    bb = draw.textbbox((0, 0), text, font=font)
    return bb[2] - bb[0], bb[3] - bb[1]


def grid_lines_layer(cols, rows, cell_px, per_major):
    """Cell hairlines with heavier rules on the major boundaries.

    Content-area sized, origin at the content area's top-left -- the same
    footprint the layer it replaces already has, so it drops straight back into
    the Photoshop stack at the same position.

    Majors draw last so a major rule is never half-covered by the cell hairline
    sharing its position.
    """
    w, h = cols * cell_px, rows * cell_px
    layer = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(layer, "RGBA")

    for c in range(cols + 1):
        if c % per_major == 0:
            continue
        x = c * cell_px
        d.line([(x, 0), (x, h)], fill=CELL_LINE, width=CELL_LINE_W)
    for r in range(rows + 1):
        if r % per_major == 0:
            continue
        y = r * cell_px
        d.line([(0, y), (w, y)], fill=CELL_LINE, width=CELL_LINE_W)

    for c in range(0, cols + 1, per_major):
        x = min(c * cell_px, w - 1)
        d.line([(x, 0), (x, h)], fill=MAJOR_LINE, width=MAJOR_LINE_W)
    for r in range(0, rows + 1, per_major):
        y = min(r * cell_px, h - 1)
        d.line([(0, y), (w, y)], fill=MAJOR_LINE, width=MAJOR_LINE_W)
    return layer


def grid_labels_layer(cols, rows, cell_px, per_major, letters):
    """Two-digit cell labels, plus a major label in each 2 km square.

    Cell labels sit at the cell's top-right with a small inset -- the same
    corner the old "col,row" labels used, so the sheet's texture does not
    change, only what the numbers mean.

    The major label goes in the major square's top-left corner rather than
    ghosted across its middle. Across the middle is the more decorative choice
    and it washes over the artwork; in the corner it is findable and stays out
    of the way. The margin furniture is the primary finder anyway.
    """
    w, h = cols * cell_px, rows * cell_px
    layer = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(layer, "RGBA")

    # 0.13 of a cell: big enough to read zoomed in, small enough that sixty
    # columns of them never crowd the sheet at full view.
    cell_font = find_font(cell_px * 0.13)
    inset = max(2, int(round(cell_px * 0.035)))

    for r in range(rows):
        for c in range(cols):
            text = "%d%d" % (c % per_major, r % per_major)
            tw, _ = _text_size(d, text, cell_font)
            x = (c + 1) * cell_px - tw - inset
            y = r * cell_px + inset
            d.text((x, y), text, font=cell_font, fill=CELL_LABEL)

    major_font = find_font(cell_px * 0.34, bold=True)
    major_inset = max(4, int(round(cell_px * 0.10)))
    for mr in range(rows // per_major):
        for mc in range(cols // per_major):
            text = grid.major_label(mc, mr) if mc < len(letters) else "?"
            x = mc * per_major * cell_px + major_inset
            y = mr * per_major * cell_px + major_inset
            d.text((x, y), text, font=major_font, fill=MAJOR_LABEL)
    return layer


def grid_border_layer(image_w, image_h, border_px, cols, rows, cell_px, per_major, letters):
    """The margin furniture: major letters and numbers on all four sides.

    Full-image sized (margin included), so it composites at the origin rather
    than at the content offset -- the one layer here that is not content-area
    shaped, because its whole job is the part of the sheet outside the map.

    All four sides are labelled. On a sheet this size a reference read from the
    top edge is useless by the time your eye is at the bottom, which is why
    every real survey sheet repeats them.
    """
    layer = Image.new("RGBA", (image_w, image_h), TRANSPARENT)
    d = ImageDraw.Draw(layer, "RGBA")

    major_px = per_major * cell_px
    content_w, content_h = cols * cell_px, rows * cell_px
    b = border_px

    major_font = find_font(b * 0.42, bold=True)
    tick_font = find_font(b * 0.16)

    # Cell ticks: a short mark in the margin at every cell boundary, longer at
    # every major. This is what makes a reference countable off the edge
    # without a label for all sixty.
    for c in range(cols + 1):
        x = b + c * cell_px
        long_tick = (c % per_major == 0)
        t = int(b * (0.34 if long_tick else 0.16))
        wdt = 3 if long_tick else 1
        d.line([(x, b - t), (x, b)], fill=BORDER_INK, width=wdt)
        d.line([(x, b + content_h), (x, b + content_h + t)], fill=BORDER_INK, width=wdt)
    for r in range(rows + 1):
        y = b + r * cell_px
        long_tick = (r % per_major == 0)
        t = int(b * (0.34 if long_tick else 0.16))
        wdt = 3 if long_tick else 1
        d.line([(b - t, y), (b, y)], fill=BORDER_INK, width=wdt)
        d.line([(b + content_w, y), (b + content_w + t, y)], fill=BORDER_INK, width=wdt)

    # Major letters across the top and bottom margins, centred on their square.
    for mc in range(cols // per_major):
        text = letters[mc]
        tw, th = _text_size(d, text, major_font)
        cx = b + mc * major_px + major_px / 2 - tw / 2
        d.text((cx, b * 0.30 - th * 0.25), text, font=major_font, fill=BORDER_INK)
        d.text((cx, b + content_h + b * 0.30 - th * 0.25), text, font=major_font, fill=BORDER_INK)

    # Major numbers down the left and right margins.
    for mr in range(rows // per_major):
        text = str(mr + 1)
        tw, th = _text_size(d, text, major_font)
        cy = b + mr * major_px + major_px / 2 - th * 0.75
        d.text((b * 0.30 - tw * 0.25, cy), text, font=major_font, fill=BORDER_INK)
        d.text((b + content_w + b * 0.30 - tw * 0.25, cy), text, font=major_font, fill=BORDER_INK)

    # A key in the top-left corner block, where no tick can reach: the one
    # place on the sheet that can say how to read the thing. Spelled with the
    # canonical separator, so the sheet teaches the form that gets typed.
    key_font = find_font(b * 0.15)
    d.text((int(b * 0.10), int(b * 0.58)), "REF", font=tick_font, fill=BORDER_INK)
    d.text((int(b * 0.10), int(b * 0.72)), "C4" + grid.SEPARATOR + "73",
           font=key_font, fill=BORDER_INK)
    return layer


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default=DEFAULT_OUT)
    ap.add_argument("--manifest", default=MANIFEST)
    ap.add_argument("--only", choices=["lines", "labels", "border"], action="append",
                    help="draw just one layer; repeatable")
    args = ap.parse_args(argv)

    with open(args.manifest, encoding="utf-8") as fh:
        manifest = json.load(fh)
    g = manifest["grid"]
    cols, rows = int(g["cols"]), int(g["rows"])
    cell_px = int(g["cellPx"])
    per_major = int(g["cellsPerMajor"])
    letters = g.get("majorColLetters", grid.MAJOR_COL_LETTERS)
    border_px = int(manifest["border"]["px"])
    image_w = int(manifest["image"]["width"])
    image_h = int(manifest["image"]["height"])

    if cols * cell_px != int(manifest["content"]["width"]):
        raise SystemExit("manifest grid does not fill its content area")

    os.makedirs(args.out, exist_ok=True)
    wanted = set(args.only or ["lines", "labels", "border"])
    written = []

    if "lines" in wanted:
        print("grid lines  ...", end="", flush=True)
        img = grid_lines_layer(cols, rows, cell_px, per_major)
        path = os.path.join(args.out, "23-grid-lines.png")
        img.save(path)
        img.close()
        written.append(path)
        print(" %s" % path)

    if "labels" in wanted:
        print("grid labels ...", end="", flush=True)
        img = grid_labels_layer(cols, rows, cell_px, per_major, letters)
        path = os.path.join(args.out, "24-grid-labels.png")
        img.save(path)
        img.close()
        written.append(path)
        print(" %s" % path)

    if "border" in wanted:
        print("border      ...", end="", flush=True)
        img = grid_border_layer(image_w, image_h, border_px, cols, rows,
                                cell_px, per_major, letters)
        path = os.path.join(args.out, "25-grid-border.png")
        img.save(path)
        img.close()
        written.append(path)
        print(" %s" % path)

    sidecar = os.path.join(args.out, "grid-scheme.json")
    with open(sidecar, "w", encoding="utf-8", newline="\n") as fh:
        json.dump({
            "scheme": "two-tier",
            "describedBy": "tools/gazetteer/core/grid.py",
            "generatedBy": "tools/gazetteer/make_grid_layers.py",
            "example": "C4" + grid.SEPARATOR + "73",
            "reading": ("Major squares are %d cells (%d m) and are lettered %s "
                        "across and numbered 1-%d down. Inside a major, the two "
                        "digits are the cell's column then its row, each 0-%d, "
                        "counting right and down."
                        % (per_major, per_major * cell_px, letters,
                           rows // per_major, per_major - 1)),
            "grid": g,
            "border": manifest["border"],
            "content": manifest["content"],
            "layers": {
                "23-grid-lines.png": "content-area sized; composite at the content origin",
                "24-grid-labels.png": "content-area sized; composite at the content origin",
                "25-grid-border.png": "FULL image sized, margin included; composite at (0, 0)",
            },
            "supersedes": ("The previous 'col,row' labels, whose rows counted UP "
                           "from the frame origin. This scheme counts DOWN from "
                           "the top. Both layers must be replaced together."),
        }, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    written.append(sidecar)

    print("\nwrote %d files. 23 and 24 replace the layers already in the master;" % len(written))
    print("25 is new page furniture for the 200 px margin.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
