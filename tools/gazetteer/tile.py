#!/usr/bin/env python3
"""Slices the campaign map into a tile pyramid the browser can pan over.

    python tools/gazetteer/tile.py

The master is 12400x12400 and 110 MB. A browser will not hold that as one
image, so the annotation tool reads tiles instead. Re-run this after any
Photoshop export; the manifest records which master the current pyramid was
built from, so a stale pyramid is detected rather than guessed at.

**The scheme, because it has to match the client exactly.** Tiles are square
and the pyramid is indexed so that at the top zoom one tile pixel is one image
pixel:

    tile (x, y, z) covers image pixels starting at
        (x * TILE * 2^(maxZoom - z),  y * TILE * 2^(maxZoom - z))
    and spanning TILE * 2^(maxZoom - z) of them, downsampled to TILE square.

maxZoom is the smallest z where one tile pixel is one image pixel or finer:
2^maxZoom * TILE >= the longer side. For a 12400 px master at TILE 512 that is
z=5, which gives 25x25 tiles at the top and one tile covering everything at
z=0 -- 864 tiles in total.

The edge tiles are deliberately NOT padded out to a power of two. Padding would
make the arithmetic marginally simpler and would also mean the client cannot
tell "off the edge of the map" from "black", which matters here because the
map's own painted margin is part of the picture. Tiles past the edge are simply
not written, and the client treats a missing tile as empty.

Coordinates stay image pixels the whole way through -- the client uses a
Leaflet CRS.Simple with a transformation of 1/2^maxZoom, so a LatLng of
(imageY, imageX) lands exactly on that pixel at every zoom. That is what makes
a grid reference computable in the browser without asking the server.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import shutil
import sys
import time

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

Image.MAX_IMAGE_PIXELS = None

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MANIFEST = os.path.join(_REPO_ROOT, "data", "map", "campaign-map.json")
DEFAULT_TILE_DIR = os.path.join(_REPO_ROOT, "tools", "gazetteer", "_tiles")

TILE = 512
#: Quality 90 rather than the usual 80: this map is fine hairlines, contour
#: lines and small type, and lossy compression smears exactly those first. At
#: 90 the whole pyramid is still a fraction of the master's 110 MB.
WEBP_QUALITY = 90


def max_zoom_for(size_px, tile=TILE):
    """Smallest z where one tile pixel is one image pixel or finer."""
    z = 0
    while tile * (2 ** z) < size_px:
        z += 1
    return z


def tiles_across(size_px, zoom, max_zoom, tile=TILE):
    """How many tiles cover the image along one axis at this zoom."""
    span = tile * (2 ** (max_zoom - zoom))
    return int(math.ceil(size_px / float(span)))


def file_sha256(path, chunk=1 << 22):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for block in iter(lambda: fh.read(chunk), b""):
            h.update(block)
    return h.hexdigest()


def build_pyramid(master, out_dir, tile=TILE, quality=WEBP_QUALITY, progress=None):
    """Write every tile. Returns (max_zoom, tile_count).

    Each zoom level is rendered from a single downsample of the master rather
    than from the level above. Downsampling repeatedly compounds softening, and
    on a map that means contour lines and hairline grid rules dissolve a level
    or two down -- which is precisely the zoom where you are trying to see the
    shape of a district.
    """
    w, h = master.size
    max_zoom = max_zoom_for(max(w, h), tile)
    count = 0

    for z in range(max_zoom + 1):
        factor = 2 ** (max_zoom - z)
        level_w = max(1, int(math.ceil(w / float(factor))))
        level_h = max(1, int(math.ceil(h / float(factor))))
        level = master if factor == 1 else master.resize((level_w, level_h), Image.LANCZOS)

        nx = int(math.ceil(level_w / float(tile)))
        ny = int(math.ceil(level_h / float(tile)))
        for tx in range(nx):
            col_dir = os.path.join(out_dir, str(z), str(tx))
            os.makedirs(col_dir, exist_ok=True)
            for ty in range(ny):
                box = (tx * tile, ty * tile,
                       min((tx + 1) * tile, level_w), min((ty + 1) * tile, level_h))
                piece = level.crop(box)
                if piece.size != (tile, tile):
                    # An edge tile is padded to a full tile so the client never
                    # has to special-case its size. Transparent, not black, so
                    # "past the edge of the sheet" is visibly nothing rather
                    # than visibly something.
                    full = Image.new("RGBA", (tile, tile), (0, 0, 0, 0))
                    full.paste(piece, (0, 0))
                    piece = full
                piece.convert("RGBA").save(os.path.join(col_dir, "%d.webp" % ty),
                                           quality=quality, method=4)
                count += 1
        if level is not master:
            level.close()
        if progress:
            progress(z, max_zoom, nx * ny, count)

    return max_zoom, count


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--manifest", default=MANIFEST)
    ap.add_argument("--out", default=DEFAULT_TILE_DIR)
    ap.add_argument("--tile", type=int, default=TILE)
    ap.add_argument("--quality", type=int, default=WEBP_QUALITY)
    ap.add_argument("--force", action="store_true",
                    help="rebuild even if the pyramid is already current")
    args = ap.parse_args(argv)

    with open(args.manifest, encoding="utf-8") as fh:
        manifest = json.load(fh)

    image_path = os.path.normpath(os.path.join(_REPO_ROOT, manifest["image"]["path"]))
    if not os.path.exists(image_path):
        raise SystemExit("master not found at %s" % image_path)

    print("hashing master ...", end="", flush=True)
    digest = file_sha256(image_path)
    print(" %s" % digest[:16])

    recorded = (manifest.get("image") or {}).get("sha256")
    if recorded and recorded != digest:
        print("  ** the master has changed since the manifest was written **")
        print("     manifest: %s" % recorded[:16])
        print("     on disk:  %s" % digest[:16])
        print("     Calibration was checked against the recorded one. If the")
        print("     change was only painting, update the hash. If the export")
        print("     size or crop changed, re-run calibrate.py first.")

    tiles_meta = manifest.get("tiles") or {}
    if (not args.force and tiles_meta.get("builtFromSha256") == digest
            and os.path.isdir(args.out)):
        print("pyramid is already current for this master; nothing to do (--force to rebuild)")
        return 0

    master = Image.open(image_path)
    print("master %dx%d" % master.size)

    if os.path.isdir(args.out):
        print("clearing %s" % args.out)
        shutil.rmtree(args.out)
    os.makedirs(args.out, exist_ok=True)

    started = time.time()

    def report(z, max_z, level_tiles, total):
        print("  z%-2d %5d tiles  (%d so far)" % (z, level_tiles, total), flush=True)

    print("building ...")
    max_zoom, count = build_pyramid(master, args.out, args.tile, args.quality, report)
    elapsed = time.time() - started

    size_bytes = sum(os.path.getsize(os.path.join(root, f))
                     for root, _, files in os.walk(args.out) for f in files)
    print("%d tiles, maxZoom %d, %.1f MB, %.1fs"
          % (count, max_zoom, size_bytes / 1e6, elapsed))

    manifest["tiles"] = {
        "dir": os.path.relpath(args.out, _REPO_ROOT).replace("\\", "/"),
        "tileSize": args.tile,
        "maxZoom": max_zoom,
        "format": "webp",
        "builtFromSha256": digest,
        "builtDate": time.strftime("%Y-%m-%d"),
    }
    manifest["image"]["sha256"] = digest
    with open(args.manifest, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    print("manifest updated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
