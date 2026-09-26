"""The title logo: 空白相続 drawn as blades, the wordmark, and 第一部.

The source's katakana logo is not a font. Every stroke is a straight-edged blade with sharp, angled cuts, some
shooting far past the rest as spikes, filled orange-to-red with a thin pale outline, laid over a wide white serif
wordmark. So 空白相続 is drawn the same way, stroke by stroke, following each kanji's real strokes.

A blade runs from P0 to P1 with width w (all in a 1000-unit box per character). `skew0`/`skew1` slant the cut at
each end along the stroke; `tip0`/`tip1` pull an end out into a point.
"""
import math

import numpy as np

# (x0, y0, x1, y1, width, skew0, skew1, tip0, tip1) per stroke, in a 1000 x 1000 box, y down.
# The four characters are drawn in stroke order; spikes (tips) are where the source's logo would throw a blade out.
GLYPHS = {
    # 空: the hole radical (dot, the roof with its hook, the two legs), then 工 with a long blade to the right
    "空": [
        (500, 40, 530, 150, 70, 0, 0, 40, 0),          # dot
        (170, 210, 150, 330, 62, 0, 0, 0, 60),          # roof, left drop
        (170, 220, 830, 200, 66, 0, 30, 0, 0),          # roof, top
        (830, 200, 800, 330, 62, 0, 0, 0, 50),          # roof, right hook
        (420, 300, 280, 470, 58, 0, 0, 0, 140),         # left leg, thrown out down-left
        (580, 300, 740, 450, 58, 0, 0, 0, 90),          # right leg
        (260, 600, 740, 590, 66, 20, 20, 0, 0),         # 工 top
        (500, 600, 500, 870, 70, 0, 0, 0, 0),           # 工 stem
        (90, 900, 900, 870, 74, 30, 0, 0, 260),         # 工 base: the long spike to the right
    ],
    # 白: the rising stroke on top (spiked), the box, the middle bar, the base
    "白": [
        (560, 140, 470, 20, 66, 0, 0, 0, 180),          # top stroke, thrown up and left
        (230, 250, 240, 930, 70, 0, 0, 0, 90),          # left side
        (230, 250, 790, 240, 68, 0, 0, 0, 0),           # top bar
        (790, 240, 770, 930, 70, 0, 0, 0, 120),         # right side, down
        (250, 580, 770, 575, 60, 0, 0, 0, 0),           # middle bar
        (230, 900, 780, 890, 66, 0, 0, 0, 0),           # base
    ],
    # 相: 木 (bar, stem spiked downward, left sweep, right flick), then 目
    "相": [
        (40, 330, 470, 310, 60, 0, 30, 0, 0),           # 木 bar
        (250, 60, 260, 960, 64, 0, 0, 90, 150),         # 木 stem, spiked both ends
        (240, 380, 60, 720, 56, 0, 0, 0, 120),          # 木 left sweep
        (290, 420, 430, 560, 50, 0, 0, 0, 40),          # 木 right flick
        (560, 150, 560, 900, 64, 0, 0, 0, 60),          # 目 left
        (560, 150, 900, 140, 62, 0, 0, 0, 0),           # 目 top
        (900, 140, 880, 910, 64, 0, 0, 0, 90),          # 目 right
        (580, 390, 880, 385, 52, 0, 0, 0, 0),           # 目 bar 1
        (580, 630, 880, 625, 52, 0, 0, 0, 0),           # 目 bar 2
        (560, 880, 890, 875, 60, 0, 0, 0, 0),           # 目 base
    ],
    # 続: 糸 (two strokes of the zigzag, the flick, the stem, two dots), then 売 (士, the roof, 儿 with its long tail)
    "続": [
        (230, 50, 110, 250, 50, 0, 0, 60, 0),           # 糸 zigzag 1
        (110, 250, 300, 360, 50, 0, 0, 0, 0),           # 糸 zigzag 2
        (300, 360, 90, 560, 52, 0, 0, 0, 0),            # 糸 zigzag 3
        (90, 560, 360, 520, 50, 0, 0, 0, 60),           # 糸 flick
        (230, 560, 240, 960, 56, 0, 0, 0, 110),         # 糸 stem, down
        (130, 700, 60, 860, 44, 0, 0, 0, 40),           # 糸 left dot
        (330, 700, 400, 840, 44, 0, 0, 0, 30),          # 糸 right dot
        (470, 150, 930, 140, 54, 0, 0, 0, 60),          # 士 bar
        (700, 30, 700, 300, 56, 0, 0, 50, 0),           # 士 stem
        (520, 300, 880, 295, 50, 0, 0, 0, 0),           # 士 short bar
        (460, 420, 450, 520, 48, 0, 0, 0, 40),          # roof left
        (460, 420, 920, 410, 52, 0, 0, 0, 0),           # roof top
        (920, 410, 900, 500, 48, 0, 0, 0, 40),          # roof right
        (620, 540, 470, 930, 54, 0, 0, 0, 120),         # 儿 left, thrown down-left
        (780, 540, 780, 880, 54, 0, 0, 0, 0),           # 儿 right, down
        (780, 880, 990, 850, 54, 0, 0, 0, 240),         # 儿 tail: the long spike out to the right
    ],
}


def blade_polygon(x0, y0, x1, y1, w, skew0=0, skew1=0, tip0=0, tip1=0):
    """A straight blade from (x0, y0) to (x1, y1): a parallelogram with slanted cuts, ends optionally pulled to points."""
    dx, dy = x1 - x0, y1 - y0
    length = math.hypot(dx, dy) or 1.0
    ux, uy = dx / length, dy / length
    nx, ny = -uy, ux
    h = w / 2.0
    a = (x0 + nx * h - ux * skew0, y0 + ny * h - uy * skew0)
    d = (x0 - nx * h + ux * skew0, y0 - ny * h + uy * skew0)
    b = (x1 + nx * h + ux * skew1, y1 + ny * h + uy * skew1)
    c = (x1 - nx * h - ux * skew1, y1 - ny * h - uy * skew1)
    pts = [a]
    if tip1:
        pts += [b, (x1 + ux * tip1, y1 + uy * tip1), c]
    else:
        pts += [b, c]
    pts.append(d)
    if tip0:
        pts.append((x0 - ux * tip0, y0 - uy * tip0))
    return pts


def styled_stroke(stroke, width_scale=1.6, skew_frac=0.45, rise=0.06, tip_scale=1.7):
    """The brush energy the source's blades have: fatter, ends cut on a hard slant, horizontals rising to the
    right, spikes thrown further."""
    x0, y0, x1, y1, w, s0, s1, t0, t1 = stroke
    w2 = w * width_scale
    if abs(x1 - x0) > 2 * abs(y1 - y0):            # a horizontal: lift its right-hand end
        lift = rise * abs(x1 - x0)
        if x1 > x0:
            y1 -= lift
        else:
            y0 -= lift
    return (x0, y0, x1, y1, w2, s0 + skew_frac * w2, s1 + skew_frac * w2, t0 * tip_scale, t1 * tip_scale)


def glyph_mask(ch, size, supersample=4, pad=0.5, **style):
    """The character's blades as an anti-aliased mask (float32 0..1). The canvas is padded by `pad` (a fraction of
    the character box) on every side, because spikes throw well outside the box."""
    import cv2
    box = size
    full = int(round(size * (1 + 2 * pad)))
    ss = supersample
    mask = np.zeros((full * ss, full * ss), np.uint8)
    k = box * ss / 1000.0
    off = pad * box * ss
    for stroke in GLYPHS[ch]:
        pts = np.array([[x * k + off, y * k + off] for x, y in blade_polygon(*styled_stroke(stroke, **style))],
                       np.int32)
        cv2.fillPoly(mask, [pts], 255, lineType=cv2.LINE_8)
    return cv2.resize(mask, (full, full), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0


def gradient(h, w, top, bottom):
    t = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None, None]
    return (np.asarray(top, np.float32) * (1 - t) + np.asarray(bottom, np.float32) * t) / 255.0 * np.ones((1, w, 1), np.float32)


# ---------- the composed logo (frame coordinates, 1440 x 1080) ----------

# where each kanji sits in the final logo: centre x, centre y, box size, turn (degrees)
LAYOUT = [("空", 250, 612, 318, -2.0), ("白", 560, 598, 290, 2.0), ("相", 868, 616, 318, -1.5), ("続", 1188, 606, 308, 1.0)]
SHEAR = -0.14                      # forward lean, as the source's katakana have
WORDMARK_Y = 432
BOOK_Y = 330
BOOK_SIZE = 96                     # about the size of the source's own small line (Ingram: "slightly bigger")
BOOK_FILL = (224, 64, 44)
FILL_TOP, FILL_BOTTOM = (242, 150, 40), (226, 42, 22)
OUTLINE = (255, 214, 200)

_parts = {}


def _font(path, size):
    from PIL import ImageFont
    return ImageFont.truetype(path, size)


def _text_mask(text, font_path, size, stretch=1.0, tracking=0):
    """A tight mask of a line of text (float32 0..1), with horizontal stretch and extra letter spacing."""
    from PIL import Image, ImageDraw
    f = _font(font_path, size)
    widths = [f.getlength(ch) for ch in text]
    asc, desc = f.getmetrics()
    im = Image.new("L", (int(sum(widths) + tracking * len(text)) + 20, asc + desc + 20), 0)
    d = ImageDraw.Draw(im)
    x = 10
    for ch, wd in zip(text, widths):
        d.text((x, 10), ch, font=f, fill=255)
        x += wd + tracking
    if stretch != 1.0:
        im = im.resize((int(im.width * stretch), im.height), Image.LANCZOS)
    im = im.crop(im.getbbox())
    return np.asarray(im, np.float32) / 255.0


def _place(canvas, mask, cx, cy):
    """Add `mask` into `canvas` (max) centred on (cx, cy), clipped to the canvas."""
    h, w = mask.shape
    x0, y0 = int(round(cx - w / 2)), int(round(cy - h / 2))
    X0, Y0 = max(0, x0), max(0, y0)
    X1, Y1 = min(canvas.shape[1], x0 + w), min(canvas.shape[0], y0 + h)
    if X0 < X1 and Y0 < Y1:
        np.maximum(canvas[Y0:Y1, X0:X1], mask[Y0 - y0:Y1 - y0, X0 - x0:X1 - x0], out=canvas[Y0:Y1, X0:X1])


def kanji_alpha(W=1440, H=1080):
    """All four blade kanji, placed, turned and leaned, as one mask."""
    import cv2
    canvas = np.zeros((H, W), np.float32)
    for ch, cx, cy, size, rot in LAYOUT:
        m = glyph_mask(ch, size)
        h, w = m.shape
        rm = cv2.getRotationMatrix2D((w / 2, h / 2), rot, 1.0)
        m = cv2.warpAffine(m, rm, (w, h), flags=cv2.INTER_LINEAR)
        _place(canvas, m, cx, cy)
    shear = np.array([[1, SHEAR, -SHEAR * H * 0.55], [0, 1, 0]], np.float64)
    return cv2.warpAffine(canvas, shear, (W, H), flags=cv2.INTER_LINEAR)


def render_parts(fonts_dir, W=1440, H=1080):
    """The logo's layers as RGBA float32 frames: wordmark, kanji (styled), kanji_alpha, book (第一部). Cached."""
    import cv2
    import os
    key = (fonts_dir, W, H)
    if key in _parts:
        return _parts[key]
    serif = os.path.join(fonts_dir, "NotoSerifCJKjp-Black.otf")
    parts = {}
    # the wordmark: wide heavy serif, the A's drawn as lambdas the way the source draws its A's without crossbars
    wm = _text_mask("BLΛNK INHERITΛNCE", serif, 104, stretch=1.08, tracking=2)
    if wm.shape[1] > 1300:
        wm = cv2.resize(wm, (1300, int(wm.shape[0] * 1300 / wm.shape[1])), interpolation=cv2.INTER_AREA)
    a = np.zeros((H, W), np.float32)
    _place(a, wm, W / 2, WORDMARK_Y)
    parts["wordmark"] = (np.broadcast_to(np.array([245, 241, 234], np.float32) / 255, (H, W, 3)).copy(), a)
    # the kanji: one orange-to-red gradient over the whole block, a thin pale outline, as the source's logo
    ka = kanji_alpha(W, H)
    ys = np.nonzero(ka.max(axis=1) > 0.5)[0]
    top, bot = (ys.min(), ys.max()) if len(ys) else (0, H)
    t = np.clip((np.arange(H, dtype=np.float32) - top) / max(1, bot - top), 0, 1)[:, None, None]
    fill = (np.array(FILL_TOP, np.float32) * (1 - t) + np.array(FILL_BOTTOM, np.float32) * t) / 255.0
    fill = np.broadcast_to(fill, (H, W, 3)).copy()
    k5 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    ring = np.clip(cv2.dilate(ka, k5) - cv2.erode(ka, k5) * 0.0 - ka, 0, 1)
    outline = np.clip(cv2.dilate(ka, k5), 0, 1)
    rgb = fill * ka[..., None] + (np.array(OUTLINE, np.float32) / 255) * (outline - ka)[..., None].clip(0, 1)
    alpha = np.maximum(ka, outline)
    rgb = np.where(alpha[..., None] > 0, rgb / np.maximum(alpha[..., None], 1e-6), 0)
    parts["kanji"] = (rgb.astype(np.float32), alpha.astype(np.float32))
    parts["kanji_alpha"] = (np.ones((H, W, 3), np.float32), ka.astype(np.float32))
    del ring
    # 第一部: above the wordmark, where the source's small line sits. A red fill with the same thin pale outline the
    # kanji carry, drawn outside the strokes only. (It was a red ring inside and outside every stroke of the heaviest
    # weight at 70 px, around a dark fill; the rings clogged the counters and it stopped reading.)
    bold = os.path.join(fonts_dir, "NotoSerifCJKjp-Bold.otf")
    bk = _text_mask("第一部", bold, BOOK_SIZE, stretch=1.4, tracking=4)
    m = np.zeros((H, W), np.float32)
    _place(m, bk, W / 2, BOOK_Y)
    grown = cv2.dilate(m, k5)                        # the outline is the glyph grown by two pixels, laid under it
    alpha = 1.0 - (1.0 - m) * (1.0 - grown)
    prem = (np.array(BOOK_FILL, np.float32) / 255 * m[..., None]
            + np.array(OUTLINE, np.float32) / 255 * (grown * (1.0 - m))[..., None])
    brgb = np.where(alpha[..., None] > 0, prem / np.maximum(alpha[..., None], 1e-6), 0)
    parts["book"] = (brgb.astype(np.float32), alpha.astype(np.float32))
    _parts[key] = parts
    return parts
