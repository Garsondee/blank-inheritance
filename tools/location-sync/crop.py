"""A labelled crop of the painted map around one item -- so Claude can see
what it is describing without a hand-written throwaway script.

This is Stage 5 of the original Gazetteer plan ("Crops and a contact sheet"),
built now (2026-09-12, V2) because the actual cost of not having it was
measured: six manual crop-and-render scripts written by hand in a single
session, each a slightly different one-off, just so a conversation could look
at a shape before writing about it. `/api/crop/<localId>.png` replaces every
one of them with a real endpoint.

What it draws: a square window of the painted map around the item's own
bounding box, padded so the surrounding streets and neighbours are visible for
context, with the item's own outline traced in vermilion and a grid-reference
tick in the corner. Deliberately not fancier than that -- a scale bar and a
compass rose are page furniture for a finished map, not a working tool's debug
view, and every extra thing drawn is one more thing that can go stale against
the real render pipeline in tools/city-map/.

Not pure: touches PIL and the 12400x12400 painted PNG directly, same as
landmask.py. Skips loudly (raises a clear, catchable error) when the map is
absent, per the house rule -- this file is gitignored and a fresh clone does
not have it.
"""

from __future__ import annotations

import os

_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.abspath(os.path.join(_HERE, "..", ".."))
DEFAULT_IMAGE = os.path.join(_REPO_ROOT, "artwork", "in-tray", "campaign-map.png")

#: Context around the item's own bounding box, as a fraction of its longest
#: side. 0.6 puts roughly the surrounding block or two in frame -- enough to
#: see what a building faces onto without the crop being mostly unrelated
#: streets three blocks away.
CONTEXT_FRACTION = 0.6

#: Never crop tighter than this many image px (= metres) across, even for a
#: tiny shed -- a 24 m2 crop with no context at all is unreadable, and this
#: is roughly one city block on this sheet.
MIN_WINDOW_PX = 120

#: Never crop wider than this -- a district-sized region gets a real overview
#: instead of an enormous, slow-to-generate image nobody can usefully read at
#: chat-image resolution anyway.
MAX_WINDOW_PX = 3000

#: The rendered PNG's own pixel size, regardless of how much ground the crop
#: covers. Fixed so every crop is the same size to look at.
OUTPUT_PX = 900


class CropError(ValueError):
    """The crop cannot be produced as asked."""


def _ring_bbox(ring):
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    return min(xs), min(ys), max(xs), max(ys)


def bounds_for_item(item):
    """(x0, y0, x1, y1) in image px -- the item's own footprint, or a small
    box around a point. Never zero-area: a point or a degenerate ring still
    gets a real window to sit in the middle of."""
    geom = item.get("geometry") or {}
    if geom.get("kind") == "point":
        x, y = geom["pointPx"]
        half = MIN_WINDOW_PX / 4.0
        return x - half, y - half, x + half, y + half
    ring = geom.get("ringPx") or []
    if len(ring) < 2:
        raise CropError("geometry has no usable extent to crop around")
    return _ring_bbox(ring)


def window_for_bounds(bbox, *, context_fraction=CONTEXT_FRACTION,
                      min_window=MIN_WINDOW_PX, max_window=MAX_WINDOW_PX):
    """The square crop window (x0, y0, x1, y1) in image px, centred on the
    item, padded for context, and clamped to a sane size in both directions."""
    x0, y0, x1, y1 = bbox
    cx, cy = (x0 + x1) / 2.0, (y0 + y1) / 2.0
    span = max(x1 - x0, y1 - y0)
    window = span * (1.0 + 2 * context_fraction)
    window = max(min_window, min(max_window, window))
    half = window / 2.0
    return cx - half, cy - half, cx + half, cy + half


def render(item, *, image_path=None, output_px=OUTPUT_PX,
          outline_rgb=(209, 64, 42)):
    """A PIL Image: the painted map cropped around `item`, with its own
    outline traced. Raises CropError if the map is not available or the
    item has no usable geometry -- never returns a blank image silently."""
    from PIL import Image, ImageDraw

    path = image_path or DEFAULT_IMAGE
    if not os.path.exists(path):
        raise CropError(
            "no painted map at %s -- it is gitignored and a fresh clone does "
            "not have it" % path)

    bbox = bounds_for_item(item)
    x0, y0, x1, y1 = window_for_bounds(bbox)

    Image.MAX_IMAGE_PIXELS = None
    with Image.open(path) as full:
        width, height = full.size
        cx0, cy0 = max(0, int(x0)), max(0, int(y0))
        cx1, cy1 = min(width, int(x1)), min(height, int(y1))
        if cx1 <= cx0 or cy1 <= cy0:
            raise CropError("crop window falls entirely outside the sheet")
        cropped = full.crop((cx0, cy0, cx1, cy1)).convert("RGB")

    scale = output_px / max(cropped.size)
    out_size = (max(1, round(cropped.size[0] * scale)),
               max(1, round(cropped.size[1] * scale)))
    resized = cropped.resize(out_size, Image.LANCZOS)

    geom = item.get("geometry") or {}
    if geom.get("kind") == "polygon" and len(geom.get("ringPx") or []) >= 3:
        draw = ImageDraw.Draw(resized)
        pts = [((px - cx0) * scale, (py - cy0) * scale) for px, py in geom["ringPx"]]
        draw.polygon(pts, outline=outline_rgb, width=3)
    elif geom.get("kind") == "point":
        draw = ImageDraw.Draw(resized)
        px, py = geom["pointPx"]
        sx, sy = (px - cx0) * scale, (py - cy0) * scale
        r = 6
        draw.ellipse([sx - r, sy - r, sx + r, sy + r], outline=outline_rgb, width=3)

    return resized


def render_to_bytes(item, *, image_path=None, output_px=OUTPUT_PX, fmt="PNG"):
    """render(), encoded -- what the server route actually sends."""
    import io as _io

    image = render(item, image_path=image_path, output_px=output_px)
    buf = _io.BytesIO()
    image.save(buf, format=fmt)
    return buf.getvalue()
