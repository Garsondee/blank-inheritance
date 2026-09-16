#!/usr/bin/env python3
"""Does the Photoshop master still register on the map frame's page square?

Everything downstream assumes it does: that image pixel (200, 200) is the
top-left corner of a 12000 m page centred on the frame, turned 31 degrees. If
that assumption is off -- because the master was cropped, resampled, or
re-exported at a different size between the render and the hand-finishing --
then every grid reference, every real-world lookup and every future Foundry map
pin is wrong by the same amount, consistently and invisibly.

No test can settle it, because the master is a painting. What settles it is
looking: this draws the real world's own geometry, projected through the
transform, on top of the picture, and you check whether the coastline follows
the coastline.

    python tools/gazetteer/calibrate.py

Writes an overview plus several 1:1 crops to tools/gazetteer/_calibration/.
The overview catches a rotation or a gross offset; the crops catch a metre.
Read them. If the ink sits on the painted features, calibration is `exact` and
the manifest already says so. If it is consistently displaced, the fix is to
record control points in data/map/campaign-map.json and switch calibration mode
to `affine` -- `fit_affine` below does the arithmetic.

Note that disagreement is not automatically drift. The op log sank Kobe
Airport, Port Island and Rokko Island, and the master is hand-painted on top of
that, so real-world features are expected to be missing or moved in those
places. Judge registration on ground the campaign has not deliberately changed:
the mountain front, the rail lines, the old shoreline west of the port.
"""

from __future__ import annotations

import argparse
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core import groundtruth  # noqa: E402
from core.georef import MapGeoref  # noqa: E402

Image.MAX_IMAGE_PIXELS = None  # a 12400^2 master trips Pillow's decompression guard

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_calibration")

#: Ink for each ground-truth class. Bright and unnatural on purpose -- this is
#: a measuring instrument, not a map. Anything that blends in cannot be judged.
INK = {
    "water": (0, 190, 255),
    "building": (255, 60, 60),
    "rail": (255, 0, 255),
    "road": (255, 220, 0),
    "green": (0, 230, 90),
    "industry": (255, 140, 0),
    "aeroway": (255, 255, 255),
}

#: Where to look. Chosen to be unmistakable and, where possible, on ground the
#: campaign has NOT edited -- so a disagreement means drift, not a design
#: decision. Grid references are from the manifest's own scheme.
DEFAULT_PROBES = [
    ("mountain-front", 135.1975, 34.7062,
     "Shin-Kobe Station sits hard against the mountain front. The break "
     "between dense city and steep ground is the sharpest edge on the map."),
    ("harbour-edge", 135.1876, 34.6825,
     "The Port Tower and the inner harbour quays. Built waterfront, unchanged "
     "by the op log."),
    ("city-grid", 135.1955, 34.6947,
     "Sannomiya. A dense regular street grid -- the best place to see a "
     "sub-metre offset, because a displaced grid beats against the painted one."),
    ("river-mouth", 135.1690, 34.6890,
     "The Minatogawa channel. A river is a hard, unambiguous line that no "
     "amount of painting moves."),
]


def draw_rings(draw, rings, colour, width=2, close=False):
    for pts in rings:
        if len(pts) == 1:
            x, y = pts[0]
            draw.ellipse([x - 3, y - 3, x + 3, y + 3], outline=colour, width=width)
        elif len(pts) >= 2:
            seq = list(pts) + [pts[0]] if close and pts[0] != pts[-1] else list(pts)
            draw.line([tuple(p) for p in seq], fill=colour, width=width)


def crop_probe(master, conn, georef, name, lon, lat, why, size=1400, out_dir=OUT_DIR):
    """One 1:1 crop with the real world's geometry inked over the painting."""
    cx, cy = georef.lonlat_to_image_px(lon, lat)
    half = size // 2
    x0 = int(round(cx)) - half
    y0 = int(round(cy)) - half
    x1, y1 = x0 + size, y0 + size

    tile = master.crop((x0, y0, x1, y1)).convert("RGB")
    overlay = Image.new("RGBA", tile.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    feats = groundtruth.features_in_image_rect(conn, georef, x0, y0, x1, y1)
    drawn = 0
    for feat in feats:
        kind = groundtruth.classify(feat.get("tags"), feat.get("area"))
        colour = INK.get(kind)
        if colour is None:
            continue
        rings = groundtruth.geom_to_image_rings(feat.get("geom"), georef)
        local = [[(px - x0, py - y0) for px, py in ring] for ring in rings]
        draw_rings(draw, local, colour + (255,), width=2,
                   close=kind in ("building", "water", "green", "industry"))
        drawn += 1

    # The reference grid, so the crop can be located by eye and so a whole-cell
    # offset is visible as well as a sub-cell one.
    step = georef.cell_px
    first = ((x0 - georef.border_px) // step + 1) * step + georef.border_px
    for gx in range(first, x1, step):
        draw.line([(gx - x0, 0), (gx - x0, size)], fill=(255, 255, 255, 90), width=1)
    first = ((y0 - georef.border_px) // step + 1) * step + georef.border_px
    for gy in range(first, y1, step):
        draw.line([(0, gy - y0), (size, gy - y0)], fill=(255, 255, 255, 90), width=1)

    tile = Image.alpha_composite(tile.convert("RGBA"), overlay).convert("RGB")

    banner = Image.new("RGB", (size, 58), (18, 18, 18))
    bd = ImageDraw.Draw(banner)
    bd.text((10, 6), "%s   %s   centre px (%d, %d)"
            % (name.upper(), georef.ref_at(cx, cy), cx, cy), fill=(255, 255, 255))
    bd.text((10, 24), why[:150], fill=(180, 180, 180))
    bd.text((10, 42), "ink: water=cyan  building=red  rail=magenta  road=yellow  "
                      "green=green  industry=orange", fill=(140, 140, 140))

    sheet = Image.new("RGB", (size, size + 58))
    sheet.paste(banner, (0, 0))
    sheet.paste(tile, (0, 58))

    path = os.path.join(out_dir, "probe-%s.png" % name)
    sheet.save(path)
    return path, drawn, len(feats)


def overview(master, conn, georef, out_dir=OUT_DIR, scale=8):
    """The whole page, reduced, with only water and rail inked.

    Catches the failures a crop cannot: a wrong rotation, a mirrored axis, a
    kilometre-scale offset. Two classes only, because at 1/8 scale 175,000
    building outlines are a solid block of colour.
    """
    w = georef.image_w // scale
    small = master.resize((w, w), Image.LANCZOS).convert("RGBA")
    overlay = Image.new("RGBA", small.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    conn_feats = groundtruth.features_in_image_rect(
        conn, georef, 0, 0, georef.image_w, georef.image_h)
    for feat in conn_feats:
        kind = groundtruth.classify(feat.get("tags"), feat.get("area"))
        if kind not in ("water", "rail"):
            continue
        tags = feat.get("tags") or {}
        # Streams and ditches are noise at this scale; keep the real channels
        # and the coastline, which are what registration is judged on.
        if kind == "water" and tags.get("waterway") in ("stream", "ditch", "drain"):
            continue
        colour = INK[kind] + (220,)
        for ring in groundtruth.geom_to_image_rings(feat.get("geom"), georef):
            draw_rings(draw, [[(px / scale, py / scale) for px, py in ring]],
                       colour, width=1, close=(kind == "water"))

    # The major grid, labelled -- this doubles as a proof sheet for the new
    # reference scheme, which is the other thing that needs looking at.
    major = georef.cell_px * georef.manifest["grid"]["cellsPerMajor"]
    for i in range(georef.cols // georef.manifest["grid"]["cellsPerMajor"] + 1):
        gx = (georef.border_px + i * major) / scale
        draw.line([(gx, 0), (gx, w)], fill=(255, 255, 255, 160), width=1)
        gy = (georef.border_px + i * major) / scale
        draw.line([(0, gy), (w, gy)], fill=(255, 255, 255, 160), width=1)
    letters = georef.manifest["grid"].get("majorColLetters", "ABCDEF")
    per = georef.manifest["grid"]["cellsPerMajor"]
    for r in range(georef.rows // per):
        for c in range(georef.cols // per):
            x = (georef.border_px + c * major + major / 2) / scale
            y = (georef.border_px + r * major + major / 2) / scale
            draw.text((x - 6, y - 6), "%s%d" % (letters[c], r + 1), fill=(255, 255, 255, 220))

    out = Image.alpha_composite(small, overlay).convert("RGB")
    path = os.path.join(out_dir, "overview.png")
    out.save(path)
    return path


def fit_affine(control_points, georef):
    """Least-squares affine from raw content px to corrected content px.

    Only needed if the probes show the master has drifted. Three control points
    determine an affine exactly; more are averaged. Returns (a, b, c, d, e, f)
    ready to paste into the manifest's calibration.matrix, plus the worst
    residual in pixels.

    `control_points` are {"imagePx": [x, y], "lonLat": [lon, lat]} -- where a
    feature IS on the picture, and where it OUGHT to be.
    """
    import numpy as np

    rows = []
    obs_x = []
    obs_y = []
    for cp in control_points:
        px, py = cp["imagePx"]
        raw_x = px - georef.border_px
        raw_y = py - georef.border_px
        want = georef.frame.lonlat_to_map(*cp["lonLat"])
        want_x, want_y = georef.tile.to_px(*want)
        rows.append((raw_x, raw_y, 1.0))
        obs_x.append(want_x)
        obs_y.append(want_y)

    if len(rows) < 3:
        raise ValueError("an affine fit needs at least 3 control points")

    a = np.array(rows, dtype=float)
    sol_x, *_ = np.linalg.lstsq(a, np.array(obs_x, dtype=float), rcond=None)
    sol_y, *_ = np.linalg.lstsq(a, np.array(obs_y, dtype=float), rcond=None)
    matrix = (float(sol_x[0]), float(sol_x[1]), float(sol_x[2]),
              float(sol_y[0]), float(sol_y[1]), float(sol_y[2]))

    worst = 0.0
    for (rx, ry, _), ox, oy in zip(rows, obs_x, obs_y):
        fx = matrix[0] * rx + matrix[1] * ry + matrix[2]
        fy = matrix[3] * rx + matrix[4] * ry + matrix[5]
        worst = max(worst, ((fx - ox) ** 2 + (fy - oy) ** 2) ** 0.5)
    return matrix, worst


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default=OUT_DIR)
    ap.add_argument("--size", type=int, default=1400, help="crop side in pixels (1:1)")
    ap.add_argument("--scale", type=int, default=8, help="overview reduction factor")
    ap.add_argument("--skip-overview", action="store_true")
    ap.add_argument("--at", metavar="LON,LAT", action="append", default=[],
                    help="an extra probe location; repeatable")
    args = ap.parse_args(argv)

    os.makedirs(args.out, exist_ok=True)
    georef = MapGeoref.load()

    image_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "..",
        georef.manifest["image"]["path"])
    image_path = os.path.normpath(image_path)
    if not os.path.exists(image_path):
        raise SystemExit("master image not found at %s (manifest image.path)" % image_path)

    print("master      %s" % image_path)
    master = Image.open(image_path)
    print("dimensions  %dx%d  (manifest says %dx%d)"
          % (master.width, master.height, georef.image_w, georef.image_h))
    if (master.width, master.height) != (georef.image_w, georef.image_h):
        print("  ** MISMATCH ** the manifest and the file disagree; fix the manifest first")
    print("scale       %s m/px, cell %d px = %d m"
          % (georef.metres_per_px, georef.cell_px,
             georef.cell_px * georef.metres_per_px))

    if not groundtruth.store_exists():
        raise SystemExit("no ground-truth store at %s" % groundtruth.GPKG_PATH)
    conn = groundtruth.open_store()

    probes = list(DEFAULT_PROBES)
    for i, spec in enumerate(args.at):
        lon, lat = (float(v) for v in spec.split(","))
        probes.append(("custom-%d" % (i + 1), lon, lat, "requested on the command line"))

    if not args.skip_overview:
        print("\noverview ...", end="", flush=True)
        path = overview(master, conn, georef, args.out, args.scale)
        print(" %s" % path)

    print()
    for name, lon, lat, why in probes:
        path, drawn, total = crop_probe(master, conn, georef, name, lon, lat,
                                        why, args.size, args.out)
        print("%-16s %-8s %5d/%-5d features inked   %s"
              % (name, georef.ref_at(*georef.lonlat_to_image_px(lon, lat)),
                 drawn, total, path))

    print("\nNow look at them. The ink is where the real world is; the painting is")
    print("where the map says it is. They should agree everywhere the campaign has")
    print("not deliberately changed the ground.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
