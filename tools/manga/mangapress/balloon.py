"""Balloons. The shape is the voice (design/research/manga/lettering-and-sound-effects.md §1):

- `oval`: ordinary speech.
- `burst`: shouting.
- `angular`: the cold, bureaucratic or mechanical voice. It is used for the Directorate's own loudspeakers, with a
  zigzag tail, while every person in the comic speaks in warm ovals.
- `wobbly`: a small, uncertain voice.
- `caption`: a narration box, the institution's printed voice.
- `none`: words on the art with a white halo and no balloon.

Every balloon is sized from its own text, so each edition gets balloons shaped for its own language: tall for
vertical Japanese, wide for English. The tail aims at the speaker's mouth and stops a little over halfway there, as
letterers do. It is joined to the body before the single outline is stroked, so the join never shows a seam
(tooling-landscape.md §4).
"""
import math

import cv2
import numpy as np
from PIL import Image, ImageDraw

SQRT2 = math.sqrt(2.0)
SHAPES = ("oval", "burst", "angular", "wobbly", "caption", "none")


def fit(boxes):
    """The smallest ellipse centred on (0, 0) containing every corner of every box. A letterer's lozenge of lines, or a
    set of vertical columns of different lengths, leaves the corners of its bounding box empty, so this hugs the words
    far closer than an ellipse through the bounding box would (tooling-landscape.md §4). Returns (a, b)."""
    corners = [(x, y) for (x0, y0, x1, y1) in boxes for x in (x0, x1) for y in (y0, y1)]
    best = None
    for k in np.geomspace(0.3, 3.5, 60):          # k is a / b
        b = max(math.sqrt((x / k) ** 2 + y ** 2) for x, y in corners)
        if best is None or k * b * b < best[0]:
            best = (k * b * b, k * b, b)
    return best[1], best[2]


def axes(text_w, text_h, pad, shape="oval", boxes=None):
    """Half-axes of the balloon: the tightest ellipse around the words (or around the text box when the words' own
    boxes aren't known), plus padding, kept from getting too skinny."""
    if shape == "caption":
        return text_w / 2 + pad, text_h / 2 + pad
    if boxes:
        a, b = fit(boxes)
    else:
        a, b = text_w / 2 * SQRT2, text_h / 2 * SQRT2
    a, b = a + pad, b + pad
    a = max(a, b / 1.9)
    b = max(b, a / 2.3)
    return a, b


# How far each shape reaches beyond its ellipse, so a balloon can be kept inside the inner frame before it is drawn.
REACH = {"burst": 1.32, "angular": 1.19, "wobbly": 1.05}


def extent(shape, text_w, text_h, pad, boxes=None):
    """Half-width and half-height of the balloon's body (tail excluded), in the same units as the text box."""
    a, b = axes(text_w, text_h, pad, shape, boxes)
    k = REACH.get(shape, 1.0)
    return a * k, b * k


def _rim(a, b, phi):
    """The point on the ellipse in direction phi from its centre."""
    r = 1.0 / math.hypot(math.cos(phi) / a, math.sin(phi) / b)
    return r * math.cos(phi), r * math.sin(phi)


def body_points(shape, a, b, seed=0):
    """The balloon's outline, as points around (0, 0). Every shape contains the whole ellipse (a, b), so it can never
    clip the words fitted inside it.

    Corners are spaced by the ellipse's own parameter t (the point a·cos t, b·sin t), not by direction from the
    centre. An ellipse is a stretched circle, so a corner clearance worked out on a circle then holds for every
    balloon, however long; spacing by direction bunched the corners up at the ends of a long balloon, and the straight
    edges between them cut into its tips (it clipped "PIER SEVEN")."""
    rng = np.random.default_rng(seed)
    if shape == "caption":
        return [(-a, -b), (a, -b), (a, b), (-a, b)]
    if shape == "burst":
        # Valleys sit on the ellipse and spikes stand out from it. An edge leaves its valley outward, so it clears the
        # curve, when spike reach × cos(gap) >= 1: 1.16 × cos(π/14 + 0.16) is about 1.08.
        n = int(np.clip((a + b) / (0.22 * min(a, b) + 1e-6), 14, 26))
        pts = []
        base = rng.uniform(0, 2 * math.pi)
        for k in range(2 * n):
            t = base + math.pi * k / n + rng.uniform(-0.08, 0.08)
            s = 1.0 if k % 2 == 0 else rng.uniform(1.16, REACH["burst"])
            pts.append((a * math.cos(t) * s, b * math.sin(t) * s))
        return pts
    if shape == "angular":
        # A straight edge cuts inside the curve, so the corners stand far enough out that the edge between the two
        # furthest-apart neighbours still clears it.
        n = 11
        gap = 2 * math.pi / n
        jitter = 0.18 * gap
        clear = 1.0 / math.cos((gap + 2 * jitter) / 2)
        base = rng.uniform(0, 2 * math.pi)
        pts = []
        for k in range(n):
            t = base + k * gap + rng.uniform(-jitter, jitter)
            s = clear * rng.uniform(1.0, 1.05)
            pts.append((a * math.cos(t) * s, b * math.sin(t) * s))
        return pts
    # the wobble only ever bulges outward, never in toward the words
    wob = REACH["wobbly"] - 1.0 if shape == "wobbly" else 0.0
    ph = rng.uniform(0, 2 * math.pi)
    pts = []
    for k in range(120):
        t = 2 * math.pi * k / 120
        s = 1 + wob * (0.5 + 0.5 * math.sin(9 * t + ph))
        pts.append((a * math.cos(t) * s, b * math.sin(t) * s))
    return pts


def _bezier(p, c, q, n=16):
    return [((1 - t) ** 2 * p[0] + 2 * (1 - t) * t * c[0] + t * t * q[0],
             (1 - t) ** 2 * p[1] + 2 * (1 - t) * t * c[1] + t * t * q[1]) for t in (i / n for i in range(n + 1))]


def tail_points(shape, a, b, target, stop=0.6, seed=0):
    """A tail from the rim toward `target` (relative to the centre), ending `stop` of the way from rim to mouth."""
    tx, ty = target
    phi = math.atan2(ty, tx)
    rim = _rim(a, b, phi)
    r = math.hypot(*rim)
    half = 0.2 * min(a, b)
    delta = half / r
    b1, b2 = _rim(a, b, phi - delta), _rim(a, b, phi + delta)
    # pull the base points a little inside, so the tail merges into the body instead of sitting on its edge
    b1 = (b1[0] * 0.9, b1[1] * 0.9)
    b2 = (b2[0] * 0.9, b2[1] * 0.9)
    tip = (rim[0] + stop * (tx - rim[0]), rim[1] + stop * (ty - rim[1]))
    if math.hypot(tip[0] - rim[0], tip[1] - rim[1]) < 2:
        return []
    if shape == "burst":
        return [b1, tip, b2]
    if shape == "angular":
        # a lightning zigzag: the loudspeaker's electric voice
        dx, dy = tip[0] - rim[0], tip[1] - rim[1]
        n = (-dy, dx)
        ln = math.hypot(*n) or 1.0
        n = (n[0] / ln, n[1] / ln)
        k = 0.22 * math.hypot(dx, dy)
        m1 = (rim[0] + dx * 0.4 + n[0] * k, rim[1] + dy * 0.4 + n[1] * k)
        m2 = (rim[0] + dx * 0.6 - n[0] * k, rim[1] + dy * 0.6 - n[1] * k)
        w = half * 0.45
        return [b1, (m1[0] - n[0] * w, m1[1] - n[1] * w), (m2[0] - n[0] * w * 0.5, m2[1] - n[1] * w * 0.5), tip,
                (m2[0] + n[0] * w * 0.5, m2[1] + n[1] * w * 0.5), (m1[0] + n[0] * w, m1[1] + n[1] * w), b2]
    # a gentle curve, bowed to one side, tapering to a point
    dx, dy = tip[0] - rim[0], tip[1] - rim[1]
    n = (-dy * 0.18, dx * 0.18)
    c1 = ((b1[0] + tip[0]) / 2 + n[0], (b1[1] + tip[1]) / 2 + n[1])
    c2 = ((b2[0] + tip[0]) / 2 + n[0], (b2[1] + tip[1]) / 2 + n[1])
    return _bezier(b1, c1, tip) + _bezier(tip, c2, b2)[1:]


def _stamp(canvas, fill_mask, origin, ink_mask=None):
    """Write white where fill_mask is set and black where ink_mask is set, clipped to the canvas."""
    ox, oy = origin
    h, w = fill_mask.shape
    x0, y0 = max(0, ox), max(0, oy)
    x1, y1 = min(canvas.width, ox + w), min(canvas.height, oy + h)
    if x1 <= x0 or y1 <= y0:
        return
    region = np.array(canvas.crop((x0, y0, x1, y1)))
    sl = (slice(y0 - oy, y1 - oy), slice(x0 - ox, x1 - ox))
    if ink_mask is not None:
        region[ink_mask[sl]] = 0
    region[fill_mask[sl]] = 255
    canvas.paste(Image.fromarray(region), (x0, y0))


def draw(canvas, shape, center, text_mask, target=None, line_px=4, pad_px=10, seed=0, stop=0.6, boxes=None):
    """Draw a balloon with its text. `center` and `target` are canvas pixels; `boxes` are the words' own line or
    column rectangles relative to the text's centre, for a tight fit. Returns the balloon's bounding box."""
    cx, cy = center
    tw, th = text_mask.size
    if shape == "none":
        halo = max(2, line_px * 2)
        m = np.array(text_mask) > 96
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * halo + 1, 2 * halo + 1))
        grown = cv2.dilate(m.astype(np.uint8), k) > 0
        ox, oy = int(cx - tw / 2), int(cy - th / 2)
        _stamp(canvas, grown, (ox, oy))
        canvas.paste(0, (ox, oy), text_mask)
        return (ox, oy, ox + tw, oy + th)
    a, b = axes(tw, th, pad_px, shape, boxes)
    body = body_points(shape, a, b, seed)
    tail = []
    if target is not None and shape != "caption":
        tail = tail_points(shape, a, b, (target[0] - cx, target[1] - cy), stop=stop, seed=seed)
    pts = body + tail
    margin = line_px * 2 + 4
    minx = int(math.floor(min(p[0] for p in pts))) - margin
    miny = int(math.floor(min(p[1] for p in pts))) - margin
    maxx = int(math.ceil(max(p[0] for p in pts))) + margin
    maxy = int(math.ceil(max(p[1] for p in pts))) + margin
    tile = Image.new("L", (maxx - minx, maxy - miny), 0)
    d = ImageDraw.Draw(tile)
    shift = lambda ps: [(x - minx, y - miny) for x, y in ps]
    d.polygon(shift(body), fill=255)
    if tail:
        d.polygon(shift(tail), fill=255)
    fill = np.array(tile) > 0
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * line_px + 1, 2 * line_px + 1))
    outline = cv2.dilate(fill.astype(np.uint8), k) > 0
    origin = (int(cx) + minx, int(cy) + miny)
    _stamp(canvas, fill, origin, ink_mask=outline)
    canvas.paste(0, (int(cx - tw / 2), int(cy - th / 2)), text_mask)
    return (origin[0], origin[1], origin[0] + tile.width, origin[1] + tile.height)
