"""The Directorate's own screens: HUD layers drawn in code, in the orange-on-black language of a control room.

Three layers (design/opening-titles.md, the fourteenth round):

- cast_card: one of the six players' cards in the verse (R11). A portrait in a slanted window that assembles from
  slats on the beat, a lock-on reticle that snaps onto the face, and plates that type the player's name beside the
  character's. Art is any rectangle: nothing is cut out, so the real portraits can drop in as they come.
- tab_panel: a control panel seen at an angle (R22), rows of chevron tabs that lock to and release from each other,
  turning from red to green on the beats.
- status_wall: a wall of status plates, rulers and crosshairs that the camera pans across at speed (R44).

Everything is deterministic for its parameters and time, and draws into the frame in place (see raster.py). Shapes
are drawn with OpenCV into 8-bit masks (anti-aliased), then painted onto the float frame.
"""
import math

import numpy as np

from . import layers
from .raster import W, H, over, rgb01, screen

ORANGE = (255, 150, 32)
INK_DARK = (14, 8, 8)
MINT = (104, 250, 196)
RED = (158, 18, 30)
_FIX = 4                                     # sub-pixel bits for cv2's shifted drawing


def _clamp01(x):
    return 0.0 if x < 0.0 else 1.0 if x > 1.0 else x


def _out(x):                                 # arrives fast, settles
    x = _clamp01(x)
    return 1.0 - (1.0 - x) ** 3


def _in(x):                                  # leaves slowly, then fast
    x = _clamp01(x)
    return x ** 3


def _fx(pts):
    return np.round(np.asarray(pts, np.float64) * (1 << _FIX)).astype(np.int32)


# ---------- masks ----------

def _mask(h=H, w=W):
    return np.zeros((h, w), np.uint8)


def fill_poly(m, pts, value=255):
    import cv2
    cv2.fillPoly(m, [_fx(pts)], int(value), cv2.LINE_AA, _FIX)


def outline_poly(m, pts, thick=3, closed=True, value=255):
    import cv2
    cv2.polylines(m, [_fx(pts)], closed, int(value), int(thick), cv2.LINE_AA, _FIX)


def line(m, p0, p1, thick=2, value=255):
    import cv2
    cv2.line(m, tuple(int(v) for v in _fx(p0)), tuple(int(v) for v in _fx(p1)), int(value), int(thick),
             cv2.LINE_AA, _FIX)


def ring(m, c, r, thick=3, value=255):
    import cv2
    cv2.circle(m, tuple(int(v) for v in _fx(c)), int(round(r * (1 << _FIX))), int(value), int(thick),
               cv2.LINE_AA, _FIX)


def rounded(x, y, w, h, r, n=5):
    """A rounded rectangle's outline as points."""
    pts = []
    for cx, cy, a0 in ((x + w - r, y + r, -90), (x + w - r, y + h - r, 0), (x + r, y + h - r, 90),
                       (x + r, y + r, 180)):
        for k in range(n + 1):
            a = math.radians(a0 + 90.0 * k / n)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


_strips = {}


def strip(text, font="grotesk-cn", size=40, spacing=0, stretch=1.0, weight=0):
    """Type as an 8-bit mask cropped to its ink (cached)."""
    key = (text, font, size, spacing, stretch, weight)
    if key not in _strips:
        s = layers._item_strip({"text": text, "font": font, "size": size, "spacing": spacing, "stretch": stretch,
                                "weight": weight, "x": 0, "y": 0})
        _strips[key] = np.asarray(s, np.uint8)
    return _strips[key]


def put(m, s, x, y, anchor="lm", opacity=1.0):
    """Paint a strip into mask m with its anchor at (x, y)."""
    h, w = s.shape
    ax = {"l": 0.0, "m": w / 2.0, "r": float(w)}[anchor[0]]
    ay = {"t": 0.0, "m": h / 2.0, "b": float(h)}[anchor[1]]
    x0, y0 = int(round(x - ax)), int(round(y - ay))
    xa, ya = max(x0, 0), max(y0, 0)
    xb, yb = min(x0 + w, m.shape[1]), min(y0 + h, m.shape[0])
    if xa >= xb or ya >= yb:
        return
    sub = s[ya - y0:yb - y0, xa - x0:xb - x0]
    if opacity < 1.0:
        sub = (sub * opacity).astype(np.uint8)
    np.maximum(m[ya:yb, xa:xb], sub, out=m[ya:yb, xa:xb])


def text_on(m, text, k, x, y, anchor="lm", **kw):
    """The first k characters of text (a typewriter's progress); k may be fractional."""
    k = int(max(0, min(len(text), math.floor(k))))
    if k > 0:
        put(m, strip(text[:k], **kw), x, y, anchor)


def paint(img, m, color, opacity=1.0):
    a = m.astype(np.float32) * (opacity / 255.0)
    over(img, rgb01(color), a)


def glow(img, m, color, sigma=14.0, strength=0.6):
    """The halation of bright ink on a tube: a soft light round the mask, added to the frame."""
    import cv2
    h, w = m.shape
    small = cv2.resize(m, (w // 2, h // 2), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
    blur = cv2.GaussianBlur(small, (0, 0), sigma / 2.0)
    big = cv2.resize(blur, (w, h), interpolation=cv2.INTER_LINEAR)
    screen(img, rgb01(color)[None, None, :] * (big * strength)[..., None])


# ---------- cast_card ----------

_WINDOW = [(150.0, 150.0), (950.0, 150.0), (80.0, 950.0)]          # TL, TR, BL: the window is a parallelogram
SLATS = 8


def _window(side):
    """The window's top-left, top-right and bottom-left corners; on the right-hand side it is mirrored, so it
    leans the other way."""
    tl, tr, bl = _WINDOW
    if side == "r":
        return (W - tr[0], tr[1]), (W - tl[0], tl[1]), (W - tr[0] + (tl[0] - bl[0]), bl[1])
    return tl, tr, bl


def _uv(win, u, v):
    tl, tr, bl = win
    return (tl[0] + u * (tr[0] - tl[0]) + v * (bl[0] - tl[0]), tl[1] + u * (tr[1] - tl[1]) + v * (bl[1] - tl[1]))


_scribbles = {}


def _scribble(seed, n=520):
    """A closed, tangled waveform, as a psychograph is drawn: a few sines of unrelated frequencies."""
    if seed not in _scribbles:
        rng = np.random.default_rng(int(seed))
        t = np.linspace(0, 2 * math.pi, n)
        f = rng.integers(3, 9, 4)
        ph = rng.random(4) * 6.28
        x = np.sin(f[0] * t + ph[0]) + 0.55 * np.sin((f[1] + 4) * t + ph[1]) + 0.2 * rng.normal(0, 1, n).cumsum() / 20
        y = np.cos(f[2] * t + ph[2]) + 0.5 * np.sin((f[3] + 5) * t + ph[3])
        x, y = x / np.abs(x).max(), y / np.abs(y).max()
        _scribbles[seed] = np.stack([x, y], 1)
    return _scribbles[seed]


def _art(src, crop=None):
    full, _ = layers.load_source(src, crop, None, 1.0, False)
    return full


def cast_card(img, p):
    """One player's card. See the module docstring; parameters:

    src, crop, focus [fx, fy], zoom, zoom_to: the portrait (any rectangle), covering the window and pushing slowly;
    side: l or r, which side the window sits on (the plates take the other); accent: the card's colour;
    number, of: the card's place in the cast; player: {kana, roman}; name: the character's name, or null while it
    has not been made (the plate then reads 未登録 UNREGISTERED); target [u, v]: where the reticle locks (in the
    window); dur, out: the card's length and how long it takes to leave, in seconds; seed.
    """
    import cv2
    u = max(0.0, p["_t"] - p["_t0"])
    dur, out_t = float(p.get("dur", 2.4)), float(p.get("out", 0.22))
    side = p.get("side", "l")
    accent = tuple(p.get("accent", (255, 80, 60)))
    mir = side == "r"
    win = _window(side)
    tl, tr, bl = win
    t_exit = dur - out_t
    leaving = u >= t_exit
    n = _frame_no(p)
    rng = np.random.default_rng(n * 7919 + int(p.get("seed", 0)))
    flick = 0.94 + 0.06 * rng.random()

    # 1. the portrait in its window, assembled from slats
    slat_m = _mask()
    rev = []
    for i in range(SLATS):
        k = (SLATS - 1 - i) if mir else i                       # the sweep runs toward the plates' side
        if not leaving:
            r = _out((u - 0.02 - k * 0.028) / 0.2)
        else:
            r = 1.0 - _in((u - t_exit - (SLATS - 1 - k) * 0.012) / 0.13)       # all gone by the clip's end
        rev.append(r)
        if r > 0.001:
            u0, u1 = i / SLATS - 0.002, (i + 1) / SLATS + 0.002
            fill_poly(slat_m, [_uv(win, u0, 0), _uv(win, u1, 0), _uv(win, u1, r), _uv(win, u0, r)])
    if max(rev) <= 0.001:
        return img
    art = _art(p["src"], p.get("crop"))
    ih, iw = art.shape[:2]
    xs = [pt[0] for pt in (tl, tr, bl, (bl[0] + tr[0] - tl[0], bl[1]))]
    ys = [150.0, 950.0]
    bw, bh = max(xs) - min(xs), ys[1] - ys[0]
    z0, z1 = float(p.get("zoom", 1.04)), float(p.get("zoom_to", 1.14))
    z = z0 + (z1 - z0) * _clamp01(u / dur)
    s = max(bw / iw, bh / ih) * z
    fx, fy = p.get("focus", (0.5, 0.5))
    wcx, wcy = (min(xs) + max(xs)) / 2.0, (ys[0] + ys[1]) / 2.0
    tx, ty = wcx - s * fx * iw, wcy - s * fy * ih
    # the picture always covers the window: a focus near an edge slides as far as the art allows, never past it
    tx = min(min(xs), max(tx, max(xs) - s * iw))
    ty = min(ys[0], max(ty, ys[1] - s * ih))
    warped = cv2.warpAffine(art, np.float32([[s, 0, tx], [0, s, ty]]), (W, H), flags=cv2.INTER_LINEAR,
                            borderMode=cv2.BORDER_REPLICATE)
    hit = 0.0 if p.get("calm") else max(math.exp(-u / 0.07), math.exp(-abs(u - 0.4) / 0.05) * 0.6)   # the beat's pulse
    warped = np.clip(warped * (flick + 0.18 * hit), 0, 1)
    over(img, warped, slat_m.astype(np.float32) / 255.0)

    # 2. the window's frame, its ruler and the corner brackets
    acc = _mask()
    wht = _mask()
    org = _mask()
    fill = _mask()
    vis = _clamp01((u - 0.02) / 0.12) * (1.0 if not leaving else 1.0 - _in((u - t_exit) / 0.1))
    if vis > 0:
        quad = [_uv(win, 0, 0), _uv(win, 1, 0), _uv(win, 1, 1), _uv(win, 0, 1)]
        outline_poly(acc, quad, 6, True, 255 * vis)
        inner = [_uv(win, 0.012, 0.012), _uv(win, 0.988, 0.012), _uv(win, 0.988, 0.988), _uv(win, 0.012, 0.988)]
        outline_poly(wht, inner, 2, True, 150 * vis)
        for cu, cv_, du, dv in ((0, 0, 1, 1), (1, 0, -1, 1), (1, 1, -1, -1), (0, 1, 1, -1)):
            c = _uv(win, cu, cv_)
            for e in ((du * 70.0, 0.0), (0.0, dv * 70.0)):
                line(wht, (c[0] - du * 14, c[1] - dv * 14), (c[0] - du * 14 + e[0], c[1] - dv * 14 + e[1]), 3,
                     255 * vis)
        # a ruler of ticks along the window's outer edge, as a plotting screen has
        edge_u = 1.0 if mir else 0.0
        for k in range(0, 41):
            v = k / 40.0
            a = _uv(win, edge_u, v)
            d = -1 if not mir else 1
            line(org, (a[0] + d * 14, a[1]), (a[0] + d * (34 if k % 5 == 0 else 24), a[1]), 2 if k % 5 == 0 else 1,
                 200 * vis)

    # 3. the lock-on reticle, snapping onto the face on the beat
    tu, tv = p.get("target", (0.5, 0.36))
    lock = _clamp01((u - 0.4) / 0.14) if not leaving else 0.0
    if lock > 0:
        c = _uv(win, tu, tv)
        r = 150.0 - (150.0 - 62.0) * _out(lock)
        spin = math.radians((u - 0.4) * 55.0)
        ring(acc, c, r, 3, 255)
        ring(acc, c, r + 12, 1, 170)
        for k in range(4):
            a = spin + k * math.pi / 2
            line(acc, (c[0] + math.cos(a) * (r - 22), c[1] + math.sin(a) * (r - 22)),
                 (c[0] + math.cos(a) * (r + 30), c[1] + math.sin(a) * (r + 30)), 3, 255)
        for k in range(4):
            a = math.pi / 4 + k * math.pi / 2
            line(wht, (c[0] + math.cos(a) * (r + 6), c[1] + math.sin(a) * (r + 6)),
                 (c[0] + math.cos(a) * (r + 18), c[1] + math.sin(a) * (r + 18)), 2, 255)
        line(acc, (c[0] - 12, c[1]), (c[0] + 12, c[1]), 2, 255)
        line(acc, (c[0], c[1] - 12), (c[0], c[1] + 12), 2, 255)

    # 4. the plates beside it
    pw = 400.0
    px = 985.0 if not mir else W - 985.0 - pw                       # the plates' left edge
    tag = f"{int(p.get('number', 1)):02d}"
    of = f"/{int(p.get('of', 6)):02d}"
    exit_w = 1.0 if not leaving else 1.0 - _in((u - t_exit) / 0.16)

    def plate(y, h, t0, draw):
        prog = _out((u - t0) / 0.16) * exit_w
        if prog <= 0.001:
            return
        rx = int(round(pw * prog))
        f_roi, o_roi = _mask(int(h) + 4, int(pw) + 4), _mask(int(h) + 4, int(pw) + 4)
        body = rounded(2, 2, pw, h, 14)
        fill_poly(f_roi, body, 235)
        outline_poly(o_roi, body, 3)
        draw(o_roi, u - t0)
        x0 = int(round(px)) - 2
        y0 = int(round(y)) - 2
        if mir:                                                  # the wipe runs in from the window's side
            f_roi[:, :max(0, int(pw) + 2 - rx)] = 0
            o_roi[:, :max(0, int(pw) + 2 - rx)] = 0
        else:
            f_roi[:, rx + 2:] = 0
            o_roi[:, rx + 2:] = 0
        h_, w_ = f_roi.shape
        xa, xb = max(x0, 0), min(x0 + w_, W)
        ya, yb = max(y0, 0), min(y0 + h_, H)
        if xa < xb and ya < yb:
            np.maximum(fill[ya:yb, xa:xb], f_roi[ya - y0:yb - y0, xa - x0:xb - x0], out=fill[ya:yb, xa:xb])
            np.maximum(org[ya:yb, xa:xb], o_roi[ya - y0:yb - y0, xa - x0:xb - x0], out=org[ya:yb, xa:xb])

    pl = p.get("player", {})
    kana, roman = pl.get("kana", ""), pl.get("roman", "")

    def draw_player(m, tt):
        put(m, strip("出演", "mincho-bold", 38, 3, 0.82), 22, 40, "lm")
        put(m, strip("PLAYER", "grotesk-cn", 30, 8), 112, 40, "lm")
        text_on(m, kana, (tt - 0.04) / 0.045, 22, 116, "lm", font="mincho-black", size=88, spacing=2, stretch=0.82)
        text_on(m, roman.upper(), (tt - 0.14) / 0.04, 22, 192, "lm", font="grotesk-cn", size=52, spacing=14)

    name = p.get("name")

    def draw_name(m, tt):
        put(m, strip("役名", "mincho-bold", 38, 3, 0.82), 22, 40, "lm")
        put(m, strip("CHARACTER", "grotesk-cn", 30, 8), 112, 40, "lm")
        if name:
            text_on(m, name, (tt - 0.04) / 0.04, 22, 112, "lm", font="grotesk-cn", size=76, spacing=6)
        else:
            text_on(m, "未登録", (tt - 0.04) / 0.06, 22, 114, "lm", font="mincho-black", size=92, spacing=6, stretch=0.82)
            text_on(m, "UNREGISTERED", (tt - 0.16) / 0.03, 22, 180, "lm", font="grotesk-cn", size=36, spacing=9)

    scrib = _scribble(int(p.get("seed", 0)) + 11)

    def draw_wave(m, tt):
        put(m, strip("波形", "mincho-bold", 38, 3, 0.82), 22, 38, "lm")
        put(m, strip("WAVEFORM", "grotesk-cn", 30, 8), 96, 38, "lm")
        gx0, gy0, gx1, gy1 = 22.0, 70.0, pw - 22.0, 280.0
        for k in range(5):                                           # the graph's rules
            line(m, (gx0 + (gx1 - gx0) * k / 4, gy0), (gx0 + (gx1 - gx0) * k / 4, gy1), 1, 120)
        for k in range(5):
            line(m, (gx0, gy0 + (gy1 - gy0) * k / 4), (gx1, gy0 + (gy1 - gy0) * k / 4), 1, 80)
        cx, cy = (gx0 + gx1) / 2, (gy0 + gy1) / 2
        k = int(len(scrib) * _clamp01((tt - 0.05) / 0.9))
        if k > 2:
            pts = np.stack([cx + scrib[:k, 0] * (gx1 - gx0) / 2 * 0.92, cy + scrib[:k, 1] * (gy1 - gy0) / 2 * 0.92], 1)
            outline_poly(m, pts, 2, False)

    plate(150.0, 230.0, 0.10, draw_player)
    plate(410.0, 210.0, 0.20, draw_name)
    plate(650.0, 300.0, 0.30, draw_wave)

    # the card's number, big, above the plates, and its ghost behind the window
    tag_k = _clamp01((u - 0.05) / 0.12) * exit_w
    if tag_k > 0:
        put(org, strip(tag, "grotesk-cn", 84, 6), px, 84, "lm", tag_k)
        put(org, strip(of, "grotesk-cn", 40, 6), px + 130, 98, "lm", tag_k)

    # 5. paint: dark plate bodies, then ink, then accent and white; halation last
    fa = fill.astype(np.float32) / 255.0
    over(img, rgb01(INK_DARK), fa * 0.86)
    paint(img, org, ORANGE, flick)
    paint(img, acc, accent, flick)
    paint(img, wht, (240, 240, 232), 0.92 * flick)
    glow(img, org, ORANGE, 16.0, 0.55)
    glow(img, acc, accent, 18.0, 0.6)
    if hit > 0.2:
        edge = _mask()
        outline_poly(edge, [_uv(win, 0, 0), _uv(win, 1, 0), _uv(win, 1, 1), _uv(win, 0, 1)], 10, True, 255 * hit)
        paint(img, edge, (255, 255, 255), 0.5 * hit)
    return img


def _frame_no(p):
    return int(round((p.get("_t", 0.0) + 0.5) * 24))


# ---------- tab_panel ----------

PW, PH = 2000, 1600
_panel_static = {}


def _panel_base(rows, seed):
    """The panel's fixed drawing: rails, labels, binary boxes, the bracket lines. Cached."""
    key = (rows, seed)
    if key in _panel_static:
        return _panel_static[key]
    ink = np.zeros((PH, PW), np.uint8)
    cx = PW // 2
    pitch, y0 = 96, 150
    outline_poly(ink, [(40, 60), (PW - 40, 60), (PW - 40, PH - 60), (40, PH - 60)], 3, True, 150)
    for k in range(0, PW, 100):
        line(ink, (k, 60), (k, PH - 60), 1, 28)
    for k in range(60, PH, 100):
        line(ink, (40, k), (PW - 40, k), 1, 28)
    rng = np.random.default_rng(seed)
    for r in range(rows):
        y = y0 + r * pitch
        put(ink, strip(f"A{131 + r:04d}", "grotesk-cn", 30, 3), 130, y + 44, "lm", 0.9)
        box = rounded(330, y + 18, 120, 52, 8)
        outline_poly(ink, box, 2, True, 220)
        put(ink, strip(format(int(rng.integers(0, 32)), "05b"), "grotesk-cn", 28, 4), 390, y + 44, "mm", 0.9)
        line(ink, (452, y + 44), (cx - 470, y + 44), 1, 120)
        line(ink, (cx - 470, y + 44), (cx - 470, y + 70), 1, 120)
        put(ink, strip(f"MT-{1351 + r}", "grotesk-cn", 24, 2), PW - 170, y + 44, "rm", 0.8)
    _panel_static[key] = ink
    return ink


def tab_panel(img, p):
    """A control panel seen at an angle: rows of chevron tabs, each pair locked together (red, a latch across the
    gap) until an event releases them (green, the pair slides apart) or latches them again. `events` is a list of
    {t, rows, to} (t in track seconds, to 1 = release, 0 = lock); `quad` is where the panel's four corners land in
    the frame, so a keyed quad is the camera's move. `flip` is how long a change takes."""
    import cv2
    rows = int(p.get("rows", 14))
    flip = float(p.get("flip", 0.14))
    t = p["_t"]
    ink = _panel_base(rows, int(p.get("seed", 0)))
    canvas = np.zeros((PH, PW, 3), np.uint8)
    canvas[:] = (6, 7, 10)
    a = ink.astype(np.float32)[..., None] / 255.0
    canvas[:] = (canvas * (1 - a) + np.asarray(ORANGE, np.float32) * a).astype(np.uint8)

    v0, v1, te = np.zeros(rows), np.zeros(rows), np.full(rows, -1e9)      # each row's last move: from, to, when
    for e in sorted(p.get("events", []), key=lambda e: e["t"]):
        if e["t"] > t:
            break
        for r in e["rows"]:
            if 0 <= r < rows:
                v0[r] = v0[r] + (v1[r] - v0[r]) * _clamp01((e["t"] - te[r]) / flip)
                v1[r], te[r] = float(e["to"]), e["t"]
    cx = PW // 2
    pitch, y0, tw, th, drop = 96, 150, 420, 54, 46
    lab_lock, lab_free, num_light, num_dark = (np.zeros((PH, PW), np.uint8) for _ in range(4))
    for r in range(rows):
        k = _clamp01((t - te[r]) / flip)
        v = v0[r] + (v1[r] - v0[r]) * k                           # 0 locked .. 1 released
        e = v * v * (3 - 2 * v)
        gap = 10 + 130 * e
        y = y0 + r * pitch
        col = np.asarray(RED, np.float32) * (1 - e) + np.asarray(MINT, np.float32) * e
        flash = math.sin(math.pi * k) * 0.8 if (0 < k < 1 and v0[r] != v1[r]) else 0.0
        col = col * (1 - flash) + 255 * flash
        edge = np.asarray((255, 120, 44), np.float32) * (1 - e) + np.asarray((40, 150, 110), np.float32) * e
        for sgn in (-1, 1):
            x_in = cx + sgn * gap / 2
            x_out = cx + sgn * (gap / 2 + tw)
            pts = [(x_out, y), (x_in, y + drop), (x_in, y + drop + th), (x_out, y + th)]
            cv2.fillPoly(canvas, [_fx(pts)], tuple(float(c) for c in col), cv2.LINE_AA, _FIX)
            cv2.polylines(canvas, [_fx(pts)], True, tuple(float(c) for c in edge), 3, cv2.LINE_AA, _FIX)
            nx = x_out - sgn * 34
            cv2.rectangle(canvas, (int(nx - 9), int(y + 8)), (int(nx + 9), int(y + 26)), ORANGE, -1, cv2.LINE_AA)
        if e < 0.5:                                              # the latch across the gap
            cv2.rectangle(canvas, (int(cx - gap / 2 - 6), int(y + drop + 14)), (int(cx + gap / 2 + 6), int(y + drop + th - 14)),
                          (255, 150, 32), -1, cv2.LINE_AA)
        released = e > 0.5
        put(lab_free if released else lab_lock, strip("FREE" if released else "LOCK", "grotesk-cn", 26, 4),
            cx + gap / 2 + tw + 90, y + drop + 28, "lm")
        put(num_dark if released else num_light, strip(f"MT-{1351 + r}", "grotesk-cn", 26, 3),
            cx - gap / 2 - tw / 2 + 26, y + drop / 2 + th / 2 + 6, "mm")
    for m8, col, amt in ((lab_lock, ORANGE, 1.0), (lab_free, MINT, 1.0), (num_light, (255, 214, 170), 0.9),
                         (num_dark, (6, 40, 30), 0.9)):
        a8 = m8.astype(np.float32)[..., None] * (amt / 255.0)
        canvas[:] = (canvas * (1 - a8) + np.asarray(col, np.float32) * a8).astype(np.uint8)

    quad = np.float32(p.get("quad", [[-260, 120], [1760, -160], [1660, 1260], [-200, 1000]]))
    src = np.float32([[0, 0], [PW, 0], [PW, PH], [0, PH]])
    m = cv2.getPerspectiveTransform(src, quad)
    out = cv2.warpPerspective(canvas, m, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT,
                              borderValue=(0, 0, 0))
    img[:] = out.astype(np.float32) / 255.0
    img *= (0.95 + 0.05 * ((np.arange(H) % 3) == 0))[:, None, None]       # the tube's scan lines
    return img


# ---------- status_wall ----------

WW, WH = 6400, 1200
_walls = {}


def _lemniscate(m, cx, cy, a, thick=2, value=255, squash=0.55):
    t = np.linspace(0, 2 * math.pi, 240)
    d = 1 + np.sin(t) ** 2
    pts = np.stack([cx + a * np.cos(t) / d, cy + a * squash * np.sin(t) * np.cos(t) / d], 1)
    outline_poly(m, pts, thick, True, value)


def _wall(seed, focus_x, label):
    key = (seed, focus_x, label)
    if key in _walls:
        return _walls[key]
    import cv2
    c = np.zeros((WH, WW, 3), np.uint8)
    c[:] = (5, 6, 8)
    orange, green = _mask(WH, WW), _mask(WH, WW)
    wave = [_mask(WH, WW) for _ in range(3)]
    # rulers, top and bottom
    for y in (150, WH - 150):
        line(green, (0, y), (WW, y), 3, 255)
        for x in range(0, WW, 12):
            line(green, (x, y), (x, y + (30 if x % 120 == 0 else 14) * (1 if y < 600 else -1)), 2, 255)
    # status plates along both edges
    for i, x in enumerate(range(40, WW, 640)):
        for y, word in ((14, "CRADLE"), (WH - 130, "COUPLING")):
            outline_poly(orange, rounded(x, y, 600, 112, 14), 4)
            put(orange, strip(f"{word} STATUS: FR-{(i * 3 + (0 if y < 600 else 1)) % 14 + 1:02d}", "grotesk-cn", 40, 1),
                x + 300, y + 56, "mm")
    # crosshairs with plain labels
    rows = (330, 600, 870)
    for j, y in enumerate(rows):
        for i, x in enumerate(range(260, WW, 410)):
            if abs(x - focus_x) < 420 and j == 1:
                continue
            line(orange, (x - 90, y), (x + 90, y), 5)
            line(orange, (x, y - 90), (x, y + 90), 5)
            put(orange, strip(f"{'ABC'[j]}{'+-'[(i + j) % 2]}{(i * 7 + j) % 3:02d}", "grotesk-cn", 36, 1), x + 18, y - 70, "lm")
    # interference loops, three families, tinted differently along the wall
    rng = np.random.default_rng(seed)
    for k, cxw in enumerate(range(900, WW, 1800)):
        for a in (140, 210, 280, 350):
            _lemniscate(wave[k % 3], cxw + (a - 245) * 0.6, 600, a * 1.1, 3, 255, 0.75)
        _lemniscate(wave[k % 3], cxw + 90, 600, 520, 3, 255, 0.75)
    # the focus: one plate, large, where the camera comes to rest
    fx = focus_x
    for r_ in (310, 250):
        body = rounded(fx - r_ * 0.9, 600 - r_ * 0.36, r_ * 1.8, r_ * 0.72, 26)
        outline_poly(orange, body, 6 if r_ == 310 else 3)
    put(orange, strip(label, "grotesk-cn", 112, 6), fx, 600, "mm")
    layers_ = ((orange, ORANGE), (green, MINT), (wave[0], (235, 205, 80)), (wave[1], (110, 210, 255)),
               (wave[2], (200, 110, 255)))
    for m, col in layers_:
        a = (m.astype(np.float32) / 255.0)[..., None] * (0.85 if m is wave[0] or m is wave[1] or m is wave[2] else 1.0)
        c[:] = (c * (1 - a) + np.asarray(col, np.float32) * a).astype(np.uint8)
    _walls[key] = c
    return c


def status_wall(img, p):
    """A wall of status plates, rulers, crosshairs and interference loops that the camera crosses at speed.
    `x` is the left edge of the view in the wall's own pixels (a keyed move is the pan), `zoom` the scale, `blur`
    the motion smear in pixels, `label` the plate the pan comes to rest on at `focus_x`."""
    import cv2
    wall = _wall(int(p.get("seed", 0)), float(p.get("focus_x", 3600.0)), p.get("label", "FRAME 01"))
    s = 0.9 * float(p.get("zoom", 1.0))
    x = float(p.get("x", 0.0))
    ty = (H - WH * s) / 2.0
    out = cv2.warpAffine(wall, np.float32([[s, 0, -x * s], [0, s, ty]]), (W, H), flags=cv2.INTER_LINEAR,
                         borderMode=cv2.BORDER_CONSTANT, borderValue=(5, 6, 8))
    k = int(p.get("blur", 0))
    if k > 1:
        out = cv2.blur(out, (k, 1))
    img[:] = out.astype(np.float32) / 255.0
    img *= (0.95 + 0.05 * ((np.arange(H) % 3) == 0))[:, None, None]
    return img
