"""Ingram's Midjourney art: cropped to its panel, and given one consistent printed look across the whole issue.

Midjourney is asked for clean ink and flat greys, never for screentone (design/research/manga/
midjourney-and-the-print-look.md §4.1), and the tone is decided here, the same way for every panel:

- `art`: her greys as drawn, only levelled. The truest to the picture.
- `flat`: greys quantised to a few flat steps, with soft edges, the way a screen edition of a manga looks. Flat greys
  never shimmer when Foundry scales the page to a window (§4.6), so this is the screen default.
- `dots`: black, white and round 45-degree screentone dots at three densities: the look of print. Dots must be made at
  the final resolution and never resized afterwards, so this belongs to print renders.
"""
import math

import cv2
import numpy as np

TONES = ("art", "flat", "dots")

# Flat grey steps (value: 0 is ink, 1 is paper) and the thresholds between them.
FLAT_STEPS = (0.0, 0.36, 0.70, 1.0)
FLAT_EDGES = (0.19, 0.46, 0.80)
# Dot coverage for each grey band, as a fraction of each cell inked (10/25/40 %, per the printers' 10-80 % range).
DOT_BANDS = ((0.19, 0.40), (0.46, 0.25), (0.72, 0.10))


def load_grey(path):
    """Luminance in 0..1, levelled so the darkest percent is ink and the lightest percent is paper. Reads through
    numpy so paths with spaces or non-ASCII characters work on Windows."""
    data = np.fromfile(path, dtype=np.uint8)
    im = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if im is None:
        raise FileNotFoundError(path)
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    lo, hi = np.percentile(g, 0.8), np.percentile(g, 99.5)
    return np.clip((g - lo) / max(hi - lo, 1e-3), 0.0, 1.0)


def crop_box(img_w, img_h, aspect, focus=(0.5, 0.5), zoom=1.0):
    """The largest box with `aspect` (width / height) that fits the image, shrunk by `zoom`, centred as near `focus`
    (fractions of the image) as the edges allow. Returns (x0, y0, x1, y1) in image pixels."""
    if img_w / img_h > aspect:
        h = img_h
        w = h * aspect
    else:
        w = img_w
        h = w / aspect
    w, h = w / zoom, h / zoom
    cx = min(max(focus[0] * img_w, w / 2), img_w - w / 2)
    cy = min(max(focus[1] * img_h, h / 2), img_h - h / 2)
    return (cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2)


def fit(g, width, height, focus=(0.5, 0.5), zoom=1.0):
    """Crop `g` to the panel's shape around the focus point and resample it to width x height pixels."""
    ih, iw = g.shape
    x0, y0, x1, y1 = crop_box(iw, ih, width / height, focus, zoom)
    part = g[int(round(y0)):int(round(y1)), int(round(x0)):int(round(x1))]
    interp = cv2.INTER_AREA if part.shape[1] > width else cv2.INTER_LANCZOS4
    return np.clip(cv2.resize(part, (int(width), int(height)), interpolation=interp), 0.0, 1.0)


def _smoothstep(x, e, w):
    t = np.clip((x - (e - w)) / (2 * w), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def flat(g, softness=0.025):
    """Quantise to FLAT_STEPS with soft transitions, so ink lines keep their anti-aliasing."""
    out = np.full_like(g, FLAT_STEPS[0])
    for edge, lo, hi in zip(FLAT_EDGES, FLAT_STEPS[:-1], FLAT_STEPS[1:]):
        out += (hi - lo) * _smoothstep(g, edge, softness)
    return out


def dots(g, cell_px, angle=45.0):
    """Black, white and AM screentone: round dots on a rotated grid, their area set by the grey band."""
    h, w = g.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    t = math.radians(angle)
    u = (xx * math.cos(t) + yy * math.sin(t)) / cell_px
    v = (-xx * math.sin(t) + yy * math.cos(t)) / cell_px
    du, dv = u - np.floor(u) - 0.5, v - np.floor(v) - 0.5
    r = np.sqrt(du * du + dv * dv)
    # each lighter band overwrites the darker one before it (the bands are listed dark to light)
    coverage = np.zeros_like(g)
    for edge, cov in DOT_BANDS:
        coverage = np.where(g >= edge, cov, coverage)
    coverage = np.where(g >= 0.9, 0.0, coverage)
    ink = (g < DOT_BANDS[0][0]) | (r < np.sqrt(coverage / math.pi))
    return np.where(ink, 0.0, 1.0).astype(np.float32)


def tone(g, mode, cell_px=6.0):
    if mode == "art":
        return g
    if mode == "flat":
        return flat(g)
    if mode == "dots":
        return dots(g, cell_px)
    raise ValueError(f"unknown tone {mode!r}; expected one of {TONES}")
