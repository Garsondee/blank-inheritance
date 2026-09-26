"""Picture layers: images and video clips (Ingram's Midjourney art) with camera moves, typeset text, and dust.

Images are addressed by a focus point: `cx`, `cy` are the point of the image (0..1 of its width and height) that
sits at frame position `px`, `py` (default: the frame's centre). `zoom` 1.0 means the image just covers the 4:3
picture ("cover") or just fits inside it ("contain"); `rot` is degrees clockwise. Moving `cx`/`cy` over time pans or
tilts; raising `zoom` pushes in. That is all the "cheap animation" a still needs.

Before placing, a layer may `crop` its art ([x0, y0, x1, y1], fractions of the image; cx/cy then refer to the
crop) and cut it out of its backdrop with a `matte` (see matte.py). After placing, `fill` repaints it one flat
colour (a silhouette), `levels` [black, white] stretches its tones, `gamma` bends them, then `tint`, `brightness`
and `lift` grade it.
A video layer does all the same to the clip's frame that is showing (see video_frame_index for the timing).
"""
import json
import math
import os

import numpy as np

from .raster import W, H, over, screen, rgb01

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
FONT_DIR = os.path.join(ROOT, "third-party", "fonts")
FONTS = {
    "mincho-black": "NotoSerifCJKjp-Black.otf",
    "mincho-bold": "NotoSerifCJKjp-Bold.otf",
    "mincho-medium": "NotoSerifCJKjp-Medium.otf",
    "grotesk-cn": "texgyreheroscn-bold.otf",
    "grotesk": "texgyreheros-bold.otf",
}

class _ByteCache:
    """A dict that forgets its least recently used entries once their arrays add up to more than `limit` bytes.
    Renders run in time order, so art from earlier shots drops out as later shots need the room. (A full draft
    touches some twenty full-size stills at about 58 MB each; kept forever, they ran a 16 GB machine out of memory.)"""

    def __init__(self, limit):
        from collections import OrderedDict
        self.limit, self.used, self.d = limit, 0, OrderedDict()

    @staticmethod
    def _size(v):
        if isinstance(v, np.ndarray):
            return v.nbytes
        if isinstance(v, tuple):
            return sum(_ByteCache._size(x) for x in v)
        return 0

    def __contains__(self, k):
        return k in self.d

    def __getitem__(self, k):
        self.d.move_to_end(k)
        return self.d[k]

    def __setitem__(self, k, v):
        if k in self.d:
            self.used -= self._size(self.d.pop(k))
        self.d[k] = v
        self.used += self._size(v)
        while self.used > self.limit and len(self.d) > 1:
            _, old = self.d.popitem(last=False)
            self.used -= self._size(old)

    def clear(self):
        self.d.clear()
        self.used = 0


_images = _ByteCache(int(os.environ.get("BI_TITLESEQ_CACHE_MB", "1200")) * 2 ** 20)
_texts = {}


# ---------- images ----------

def _resolve(path):
    return path if os.path.isabs(path) else os.path.join(ROOT, path)


def load_image(path, level=1.0):
    """The image as float32 RGB 0..1, pre-shrunk by `level` (1, 1/2, 1/4...) with area averaging, cached."""
    import cv2
    key = ("img", path, level)
    if key not in _images:
        full_key = ("img", path, 1.0)
        if full_key in _images:
            full = _images[full_key]
        else:
            bgr = cv2.imread(_resolve(path), cv2.IMREAD_COLOR)
            if bgr is None:
                raise FileNotFoundError(path)
            full = bgr[..., ::-1].astype(np.float32) / 255.0
            _images[full_key] = full
        if level != 1.0:
            h, w = full.shape[:2]
            _images[key] = cv2.resize(full, (max(1, round(w * level)), max(1, round(h * level))),
                                      interpolation=cv2.INTER_AREA)
        else:
            return full
    return _images[key]


def _level_for(scale):
    """The smallest power-of-two shrink that still keeps the final resample a reduction of at most 2x."""
    level = 1.0
    while level / 2 >= scale:
        level /= 2
    return level


def _affine(s, rot, u, v, px, py):
    """Pixel-centre affine map (2x3) from image to frame: the image's continuous point (u, v) lands on the frame's
    continuous point (px, py), scaled by s and turned rot degrees clockwise. Pixel i's centre is at i + 0.5."""
    th = math.radians(rot)
    a, b = s * math.cos(th), s * math.sin(th)
    tx = px - 0.5 + a * (0.5 - u) - b * (0.5 - v)
    ty = py - 0.5 + b * (0.5 - u) + a * (0.5 - v)
    return np.array([[a, -b, tx], [b, a, ty]], np.float64)


def image_transform(iw, ih, fit="cover", zoom=1.0, cx=0.5, cy=0.5, rot=0.0, px=W / 2, py=H / 2):
    """The overall scale and the pixel-centre affine map (2x3) from native image pixels to frame pixels."""
    s0 = max(W / iw, H / ih) if fit == "cover" else min(W / iw, H / ih)
    s = s0 * zoom
    return s, _affine(s, rot, cx * iw, cy * ih, px, py)


def _coverage(iw, ih, s, rot, u, v, px, py):
    """How much of each frame pixel the image covers: 1 inside, 0 outside, a one-pixel anti-aliased edge between.
    Worked out exactly rather than by warping a mask, so an image that covers the frame covers it to the last pixel."""
    from .raster import grid
    yy, xx = grid()
    th = math.radians(rot)
    c, sn = math.cos(th), math.sin(th)
    dx, dy = xx + 0.5 - px, yy + 0.5 - py
    uu = (c * dx + sn * dy) / s + u
    vv = (-sn * dx + c * dy) / s + v
    edge = np.minimum(np.minimum(uu, iw - uu), np.minimum(vv, ih - vv)) * s
    return np.clip(edge + 0.5, 0.0, 1.0).astype(np.float32)


BLENDS = {"normal", "screen", "add"}
_sources = _images                                   # one memory budget for raw stills and their cut-outs


def _spec(v):
    return None if v is None else json.dumps(v, sort_keys=True)


def _crop(rgb, crop):
    if not crop:
        return rgb
    h, w = rgb.shape[:2]
    x0, y0, x1, y1 = crop
    return np.ascontiguousarray(rgb[int(round(y0 * h)):int(round(y1 * h)), int(round(x0 * w)):int(round(x1 * w))])


def load_keyed(path):
    """Art that carries its own alpha (a PNG cut out by hand, such as the Directorate's approved seal): premultiplied
    float32 RGB and the alpha. Opaque files come back with an alpha of 1 everywhere."""
    import cv2
    im = cv2.imread(_resolve(path), cv2.IMREAD_UNCHANGED)
    if im is None:
        raise FileNotFoundError(path)
    if im.ndim == 2:
        im = cv2.cvtColor(im, cv2.COLOR_GRAY2BGR)
    px = im.astype(np.float32) / (65535.0 if im.dtype == np.uint16 else 255.0)
    rgb = np.ascontiguousarray(px[..., 2::-1][..., :3]) if px.shape[2] == 4 else np.ascontiguousarray(px[..., ::-1])
    alpha = np.ascontiguousarray(px[..., 3]) if px.shape[2] == 4 else np.ones(px.shape[:2], np.float32)
    return np.ascontiguousarray(rgb * alpha[..., None]), alpha


def load_source(path, crop=None, matte=None, level=1.0, keyed=False):
    """An image layer's art: float32 RGB 0..1 and its alpha (None when opaque), cropped, cut out by `matte` (or by
    its own alpha, when `keyed`) and pre-shrunk by `level`. A cut-out's RGB is premultiplied, so shrinking and
    warping never drag the old backdrop's colour into its edge. Cached."""
    import cv2
    base = ("src", path, _spec(crop), _spec(matte), bool(keyed))
    if not crop and not matte and not keyed:       # plain art: the image cache already holds exactly this
        return load_image(path, level), None
    if (base, 1.0) in _sources:
        full = _sources[(base, 1.0)]
    else:
        if keyed:
            rgb, alpha = load_keyed(path)
            rgb, alpha = _crop(rgb, crop), _crop(alpha, crop)
        else:
            rgb = _crop(load_image(path), crop)
            alpha = None
            if matte:
                from . import matte as mt
                rgb, alpha = mt.cut_out(rgb, matte)
        full = (rgb, alpha)
        _sources[(base, 1.0)] = full
    if level == 1.0:
        return full
    if (base, level) not in _sources:
        rgb, alpha = full
        h, w = rgb.shape[:2]
        size = (max(1, round(w * level)), max(1, round(h * level)))
        rgb = cv2.resize(rgb, size, interpolation=cv2.INTER_AREA)
        alpha = None if alpha is None else cv2.resize(alpha, size, interpolation=cv2.INTER_AREA)
        _sources[(base, level)] = (rgb, alpha)
    return _sources[(base, level)]


def draw_image(img, p):
    opacity = float(p.get("opacity", 1.0))
    if opacity <= 0:
        return img
    crop, matte, keyed = p.get("crop"), p.get("matte"), bool(p.get("keyed"))
    full, _ = load_source(p["src"], crop, matte, keyed=keyed)
    ih, iw = full.shape[:2]
    s, _ = image_transform(iw, ih, p.get("fit", "cover"), p.get("zoom", 1.0))
    src, alpha = load_source(p["src"], crop, matte, _level_for(s), keyed)
    return _place(img, p, src, alpha, s * iw / src.shape[1], opacity)


def _place(img, p, src, alpha, s_l, opacity):
    """Warp art (native pixels, scale s_l to the frame) into place, grade it and blend it into img."""
    import cv2
    lh, lw = src.shape[:2]
    cx, cy, rot = p.get("cx", 0.5), p.get("cy", 0.5), p.get("rot", 0.0)
    px, py = p.get("px", W / 2), p.get("py", H / 2)
    if p.get("flip_x"):
        src = np.ascontiguousarray(src[:, ::-1])
        alpha = None if alpha is None else np.ascontiguousarray(alpha[:, ::-1])
        cx = 1.0 - cx
    m = _affine(s_l, rot, cx * lw, cy * lh, px, py)
    warped = cv2.warpAffine(src, m, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    a = _coverage(lw, lh, s_l, rot, cx * lw, cy * lh, px, py)
    if alpha is not None:                          # cut-out art arrives premultiplied: take the alpha back out
        wa = cv2.warpAffine(alpha, m, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        warped = np.clip(warped / np.maximum(wa, 1e-4)[..., None], 0.0, 1.0)
        a = a * wa
    if "fill" in p:
        warped[:] = rgb01(p["fill"])
    if "levels" in p:
        lo, hi = p["levels"]
        warped = np.clip((warped - lo) / (hi - lo), 0.0, 1.0)
    if "gamma" in p:                               # above 1 deepens the mid-tones (a sky's blue) and spares the whites
        warped = np.power(np.clip(warped, 0.0, 1.0), float(p["gamma"]))
    if "tint" in p:
        warped *= rgb01(p["tint"])
    if "brightness" in p:
        warped *= float(p["brightness"])
    if "lift" in p:
        warped = warped * (1.0 - float(p["lift"])) + float(p["lift"])
    blend = p.get("blend", "normal")
    if blend == "screen":
        screen(img, np.clip(warped, 0, 1) * (a * opacity)[..., None])
    elif blend == "add":
        img += warped * (a * opacity)[..., None]
    else:
        over(img, warped, a * opacity)
    return img


# ---------- video ----------

VIDEO_MODES = {"once", "loop", "pingpong"}
_videos = {}
_backdrops = {}
_frames = {}


def load_video(path):
    """Every frame of a clip as uint8 RGB (or RGBA), decoded once and kept (Midjourney clips are short and small).

    `path` is a video file, or a folder of numbered PNGs with their own alpha: a clip Ingram has keyed herself, off a
    green screen, which beats anything a matte can do with a painted backdrop."""
    import cv2
    if path not in _videos:
        full = _resolve(path)
        frames = []
        if os.path.isdir(full):
            for name in sorted(n for n in os.listdir(full) if n.lower().endswith(".png")):
                im = cv2.imread(os.path.join(full, name), cv2.IMREAD_UNCHANGED)
                if im is None:
                    continue
                if im.ndim == 2:
                    im = cv2.cvtColor(im, cv2.COLOR_GRAY2BGR)
                order = [2, 1, 0, 3] if im.shape[2] == 4 else [2, 1, 0]
                frames.append(np.ascontiguousarray(im[..., order]))
        else:
            cap = cv2.VideoCapture(full)
            while True:
                ok, fr = cap.read()
                if not ok:
                    break
                frames.append(np.ascontiguousarray(fr[..., ::-1]))
            cap.release()
        if not frames:
            raise FileNotFoundError(path)
        _videos[path] = frames
    return _videos[path]


def video_frame_index(n_frames, elapsed, speed=1.0, hold=1, mode="once", offset=0):
    """Which of a clip's n_frames shows `elapsed` of our frames after the layer began.

    `hold` draws each picture for that many of our frames (3 = "on threes", as limited animation is shot);
    `speed` is the clip's frames per our frame (1/3 with hold 3 plays every clip frame once, three times slower);
    `offset` is the clip frame to start on. Past the end, "once" holds the last frame, "loop" starts again and
    "pingpong" plays back the other way."""
    k = (int(elapsed) // max(1, int(hold))) * max(1, int(hold))
    i = int(math.floor(offset + k * speed + 1e-9))
    if n_frames <= 1:
        return 0
    if mode == "loop":
        return i % n_frames
    if mode == "pingpong":
        period = 2 * (n_frames - 1)
        m = i % period
        return m if m < n_frames else period - m
    return min(max(i, 0), n_frames - 1)


def video_source(path, index, crop=None, matte=None):
    """One frame of a clip as float32 RGB (premultiplied when it has an alpha) and its alpha. A matte's backdrop is fitted
    once, on the first frame, and reused for every frame, so the edge of the cut-out never shimmers."""
    key = (path, index, _spec(crop), _spec(matte))
    if key not in _frames:
        frames = load_video(path)
        px = _crop(frames[index].astype(np.float32) / 255.0, crop)
        rgb, alpha = px[..., :3], None
        if px.shape[2] == 4:                       # already keyed: use its own alpha, premultiplied, and no matte
            alpha = np.ascontiguousarray(px[..., 3])
            rgb = np.ascontiguousarray(rgb * alpha[..., None])
        elif matte:
            from . import matte as mt
            bkey = (path, _spec(crop), _spec(matte))
            if bkey not in _backdrops:
                first = _crop(frames[0].astype(np.float32) / 255.0, crop)
                _backdrops[bkey] = mt.fit_backdrop(first, matte.get("edges", "tblr"))
            rgb, alpha = mt.cut_out(rgb, matte, _backdrops[bkey])
        if len(_frames) >= 32:
            _frames.pop(next(iter(_frames)))
        _frames[key] = (rgb, alpha)
    return _frames[key]


def draw_video(img, p, t):
    opacity = float(p.get("opacity", 1.0))
    if opacity <= 0:
        return img
    frames = load_video(p["src"])
    elapsed = math.floor((t - p.get("_t0", 0.0)) * 24 + 0.5)
    idx = video_frame_index(len(frames), elapsed, p.get("speed", 1.0), p.get("hold", 1), p.get("mode", "once"),
                            p.get("offset", 0))
    src, alpha = video_source(p["src"], idx, p.get("crop"), p.get("matte"))
    ih, iw = src.shape[:2]
    s, _ = image_transform(iw, ih, p.get("fit", "cover"), p.get("zoom", 1.0))
    return _place(img, p, src, alpha, s, opacity)


# ---------- text ----------

def font(alias, size):
    from PIL import ImageFont
    return ImageFont.truetype(os.path.join(FONT_DIR, FONTS.get(alias, alias)), int(size))


def _item_strip(it):
    """One item's glyphs as an 8-bit mask cropped to its ink: set (across, or down when `vertical`), stretched,
    fitted exactly to its `box` [width, height] when it has one (so a line can be made as tall and narrow as the
    source's title cards), then thickened by `weight` pixels, which also rounds its corners a little, as type shot
    on an optical printer came out."""
    from PIL import Image, ImageDraw
    f = font(it.get("font", "mincho-black"), it["size"])
    text, spacing = it["text"], it.get("spacing", 0)
    if it.get("vertical"):
        step = it["size"] + spacing
        col_w = int(max(f.getlength(ch) for ch in text)) + 8
        strip = Image.new("L", (max(1, col_w), step * len(text) + 8), 0)
        d = ImageDraw.Draw(strip)
        for i, ch in enumerate(text):
            d.text((col_w / 2, 4 + i * step + it["size"] / 2), ch, font=f, fill=255, anchor="mm")
    else:
        # draw each glyph onto its own strip so letter spacing and horizontal stretch are exact
        asc, desc = f.getmetrics()
        strip_w = int(sum(f.getlength(ch) for ch in text) + spacing * max(0, len(text) - 1)) + 8
        strip = Image.new("L", (max(1, strip_w), asc + desc + 8), 0)
        d = ImageDraw.Draw(strip)
        x = 4
        for ch in text:
            d.text((x, 4), ch, font=f, fill=255)
            x += f.getlength(ch) + spacing
    stretch = it.get("stretch", 1.0)
    if stretch != 1.0:
        strip = strip.resize((max(1, int(strip.width * stretch)), strip.height), Image.LANCZOS)
    strip = strip.crop(strip.getbbox() or (0, 0, 1, 1))
    r = int(round(it.get("weight", 0)))
    if it.get("box"):
        bw, bh = (int(round(v)) for v in it["box"])
        strip = strip.resize((max(1, bw - 2 * r), max(1, bh - 2 * r)), Image.LANCZOS)
    if r > 0:
        import cv2
        arr = np.pad(np.asarray(strip, np.uint8), r)
        arr = cv2.dilate(arr, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1)))
        strip = Image.fromarray(arr)
    return strip


def _smooth_noise(h, w, sigma, seed):
    """Low-frequency noise, about unit spread, fixed for a seed."""
    import cv2
    n = np.random.default_rng(int(seed)).normal(0, 1, (max(1, h // 8), max(1, w // 8))).astype(np.float32)
    n = cv2.GaussianBlur(cv2.resize(n, (w, h), interpolation=cv2.INTER_CUBIC), (0, 0), sigma)
    return n / (n.std() + 1e-6)


def render_text(items, color=(236, 236, 228), shadow=0.55, shadow_blur=4.0, shadow_offset=(3, 3), soften=0.0,
                mottle=0.0, spray=0.0, seed=0):
    """Typeset `items` onto a transparent 4:3 frame. Each item: text, font (alias), size, x, y, and optionally
    anchor (PIL anchor, default 'mm'), stretch (horizontal scale, as the source compresses its type), spacing
    (extra pixels between characters), vertical (set top to bottom, one character under the next, as Japanese
    credits often are), box and weight (see _item_strip).

    The finish, for type that should look shot on film rather than set on a screen: `soften` blurs its edge by that
    many pixels; `mottle` varies the ink's density a little across the letters; `spray` adds a paint overspray
    halo, as a stencil leaves. Returns (rgb, alpha, shadow) float32. Cached, since type doesn't change per frame."""
    from PIL import Image, ImageFilter
    key = json.dumps([items, color, shadow, shadow_blur, shadow_offset, soften, mottle, spray, seed], sort_keys=True,
                     ensure_ascii=False)
    if key in _texts:
        return _texts[key]
    mask = Image.new("L", (W, H), 0)
    for it in items:
        strip = _item_strip(it)
        anchor = it.get("anchor", "mm")
        ax = {"l": 0, "m": strip.width / 2, "r": strip.width}[anchor[0]]
        ay = {"t": 0, "m": strip.height / 2, "b": strip.height}[anchor[1]]
        mask.paste(255, (int(round(it["x"] - ax)), int(round(it["y"] - ay))), strip)
    if soften > 0:
        mask = mask.filter(ImageFilter.GaussianBlur(soften))
    a = np.asarray(mask, np.float32) / 255.0
    if spray > 0:
        import cv2
        grain = np.clip(0.5 + 0.9 * np.random.default_rng(int(seed) + 7).random((H, W)).astype(np.float32), 0, 1.4)
        halo = cv2.GaussianBlur(a, (0, 0), 5.0) * grain * spray
        a = np.maximum(a, np.clip(halo, 0.0, 1.0))
    rgb = np.empty((H, W, 3), np.float32)
    rgb[:] = rgb01(color)
    if mottle > 0:
        rgb *= np.clip(1.0 + mottle * _smooth_noise(H, W, 10.0, seed + 11), 0.0, 2.0)[..., None]
        np.clip(rgb, 0.0, 1.0, out=rgb)
    sh = None
    if shadow > 0:
        sh = np.asarray(mask.filter(ImageFilter.GaussianBlur(shadow_blur)), np.float32) / 255.0
        sh = np.roll(np.roll(sh, shadow_offset[1], axis=0), shadow_offset[0], axis=1) * shadow
    _texts[key] = (rgb, a, sh)
    return _texts[key]


_glows = {}


def draw_text(img, p):
    """Type over the picture. Besides render_text's finish: `glow` adds the halation of bright type on film (a soft
    light around the letters, `glow_sigma` pixels wide); `weave` jitters the whole layer by up to that many pixels
    from frame to frame, as film does in the gate; `flicker` varies its brightness by up to that share per frame."""
    import cv2
    opacity = float(p.get("opacity", 1.0))
    if opacity <= 0:
        return img
    rgb, a, sh = render_text(p["items"], tuple(p.get("color", (236, 236, 228))), p.get("shadow", 0.55),
                             p.get("shadow_blur", 4.0), tuple(p.get("shadow_offset", (3, 3))), p.get("soften", 0.0),
                             p.get("mottle", 0.0), p.get("spray", 0.0), p.get("seed", 0))
    n = int(round((p.get("_t", 0.0) + 0.5) * 24))
    rng = np.random.default_rng((int(p.get("seed", 0)) * 7919 + n) % (2 ** 32))
    if p.get("flicker"):
        opacity *= 1.0 + float(p["flicker"]) * (2.0 * rng.random() - 1.0)
    weave = int(p.get("weave", 0))
    dx, dy = (int(v) for v in rng.integers(-weave, weave + 1, 2)) if weave else (0, 0)
    shift = (lambda m: np.roll(np.roll(m, dy, axis=0), dx, axis=1)) if (dx or dy) else (lambda m: m)
    if sh is not None:
        over(img, np.zeros(3, np.float32), shift(sh) * opacity)
    over(img, shift(rgb), shift(a) * opacity)
    if p.get("glow"):
        sigma = float(p.get("glow_sigma", 10.0))
        gkey = (id(a), sigma)
        if gkey not in _glows:
            _glows[gkey] = cv2.GaussianBlur(a, (0, 0), sigma)
        screen(img, shift(rgb) * (shift(_glows[gkey]) * float(p["glow"]) * opacity)[..., None])
    return img


# ---------- the VCR's on-screen display ----------

_osd = {}


def osd_mask(text, icon=None, bar=None, font_px=15, block=4):
    """A VCR character-generator caption as a 0/1 mask: `text` set small with no smoothing, an optional play icon
    (the ▶) after it, an optional TRACKING meter under it (`bar` 0..1: that share of 16 segments lit, the rest
    hollow), all blown up in square `block`-pixel blocks, the way the deck's chunky type looked."""
    from PIL import Image, ImageDraw
    key = (text, icon, None if bar is None else round(float(bar), 3), font_px, block)
    if key in _osd:
        return _osd[key]
    f = font("grotesk-cn", font_px)
    im = Image.new("L", (int(f.getlength(text)) + 8, font_px + 8), 0)
    d = ImageDraw.Draw(im)
    d.fontmode = "1"
    d.text((2, 1), text, font=f, fill=255)
    im = im.crop(im.getbbox() or (0, 0, 1, 1))
    small = (np.asarray(im) > 127).astype(np.float32)
    hgt = small.shape[0]
    if icon == "play":
        tw = max(3, int(round(hgt * 0.8)))
        yy, xx = np.mgrid[0:hgt, 0:tw]
        tri = (np.abs(yy - (hgt - 1) / 2) <= (hgt / 2) * (1 - xx / tw) + 0.25).astype(np.float32)
        small = np.hstack([small, np.zeros((hgt, 3), np.float32), tri])
    if bar is not None:
        segs, sw, sh, gap = 16, 3, 4, 1
        row = np.zeros((sh, segs * (sw + gap)), np.float32)
        lit = int(round(float(np.clip(bar, 0, 1)) * segs))
        for i in range(segs):
            x = i * (sw + gap)
            if i < lit:
                row[:, x:x + sw] = 1.0
            else:
                row[0, x:x + sw] = row[-1, x:x + sw] = 1.0
                row[:, x] = row[:, x + sw - 1] = 1.0
        width = max(small.shape[1], row.shape[1])
        pad = lambda a: np.hstack([a, np.zeros((a.shape[0], width - a.shape[1]), np.float32)])
        small = np.vstack([pad(small), np.zeros((3, width), np.float32), pad(row)])
    _osd[key] = np.kron(small, np.ones((block, block), np.float32))
    return _osd[key]


def draw_osd(img, p):
    """The VCR's own caption laid over the picture: chunky green blocks with a hard black shadow one block down and
    right. (Drawn after the tape finish when the layer says `above_finish`, since the deck adds it after playback.)"""
    opacity = float(p.get("opacity", 1.0))
    if opacity <= 0:
        return img
    block = int(p.get("block", 4))
    m = osd_mask(p.get("text", ""), p.get("icon"), p.get("bar"), int(p.get("font_px", 15)), block)
    mh, mw = m.shape
    anchor = p.get("anchor", "lt")
    x = p.get("x", 60) - {"l": 0, "m": mw / 2, "r": mw}[anchor[0]]
    y = p.get("y", 60) - {"t": 0, "m": mh / 2, "b": mh}[anchor[1]]
    for dx, dy, colour in ((block, block, (0, 0, 0)), (0, 0, p.get("color", (72, 255, 72)))):
        x0, y0 = int(round(x + dx)), int(round(y + dy))
        X0, Y0, X1, Y1 = max(0, x0), max(0, y0), min(img.shape[1], x0 + mw), min(img.shape[0], y0 + mh)
        if X0 < X1 and Y0 < Y1:
            a = m[Y0 - y0:Y1 - y0, X0 - x0:X1 - x0] * opacity
            over(img[Y0:Y1, X0:X1], rgb01(colour), a)
    return img


# ---------- slates: text-only cards standing in for art still to come ----------

_slates = {}


def _wrap(text, f, width):
    """Break `text` into lines no wider than `width` pixels in font `f`."""
    lines, cur = [], ""
    for word in text.split():
        trial = f"{cur} {word}".strip()
        if cur and f.getlength(trial) > width:
            lines.append(cur)
            cur = word
        else:
            cur = trial
    return lines + ([cur] if cur else [])


def _balanced_lines(words, n):
    """Break `words` into `n` lines as even in length as can be (the longest line as short as possible)."""
    n = max(1, min(n, len(words)))
    best, best_cost = [words], float("inf")

    def walk(i, k, acc):
        nonlocal best, best_cost
        if k == 1:
            lines = acc + [words[i:]]
            cost = max(len(" ".join(l)) for l in lines)
            if cost < best_cost:
                best, best_cost = lines, cost
            return
        for j in range(i + 1, len(words) - k + 2):
            walk(j, k - 1, acc + [words[i:j]])
    walk(0, n, [])
    return [" ".join(l) for l in best]


def _block_mask(lines, width, max_h, gap, weight):
    """Lines of heavy condensed capitals, each fitted to the same `width` (a justified block, as the source's title
    cards are set), no taller than `max_h`: an 8-bit mask and its size."""
    strips = []
    for line in lines:
        s = _item_strip({"text": line, "font": "grotesk-cn", "size": 160, "x": 0, "y": 0})
        aspect = s.width / max(1, s.height)
        h = min(max_h, width / aspect)
        strips.append(_item_strip({"text": line, "font": "grotesk-cn", "size": 160, "x": 0, "y": 0,
                                   "box": [h * aspect, h], "weight": weight}))
    bw = max(s.width for s in strips)
    bh = sum(s.height for s in strips) + gap * (len(strips) - 1)
    from PIL import Image
    block = Image.new("L", (bw, bh), 0)
    y = 0
    for s in strips:
        block.paste(255, ((bw - s.width) // 2, y), s)
        y += s.height + gap
    return block


def render_slate(code, text, color=(22, 22, 26), bg=True, prompt=None):
    """A slate: the text-only card that holds a shot's place until its art comes (Ingram: "use some blank text only
    cards... Then we can go back and fill in the blanks"), set as a title card in its own right.

    - The words, in heavy condensed capitals, justified into a block of up to four lines. A short lead-in before a
      colon ("Portrait:", "Lead beat 4:") is set small in amber above it.
    - The shot's code in amber at the top left, huge and faint behind the words, and the prompt that makes its art
      at the bottom left, so it always reads as a stand-in.
    - A thin frame with corner ticks, over a field in the shot's intended colour, shaded like a painted cel: lighter
      above, darker at the corners, with a little unevenness. Without `bg`, only the type and frame, outlined in black,
      over whatever is beneath.
    Returns (premultiplied rgb, alpha), cached."""
    import cv2
    from PIL import Image, ImageDraw
    key = json.dumps([code, text, list(color), bool(bg), prompt, 3], ensure_ascii=False)
    if key in _slates:
        return _slates[key]
    prem = np.zeros((H, W, 3), np.float32)                        # premultiplied colour and its coverage
    alpha = np.zeros((H, W), np.float32)
    seed = sum(ord(ch) for ch in code)
    if bg:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        shade = 1.08 - 0.18 * (yy / H)
        shade -= 0.1 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) ** 1.5
        shade *= 1.0 + 0.025 * _smooth_noise(H, W, 30.0, seed)
        prem[:] = np.clip(np.asarray(rgb01(color), np.float32)[None, None] * shade[..., None], 0, 1)
        alpha[:] = 1.0

    def paint(mask, colour, a=1.0):
        m = np.asarray(mask, np.float32) / 255.0 * a
        prem[:] = prem * (1 - m[..., None]) + np.asarray(rgb01(colour), np.float32) * m[..., None]
        alpha[:] = alpha * (1 - m) + m

    def place(strip, x, y):
        m = Image.new("L", (W, H), 0)
        m.paste(255, (int(round(x)), int(round(y))), strip)
        return m

    if bg:                                                        # the code, huge and faint, behind everything
        big = _item_strip({"text": code, "font": "grotesk-cn", "size": 200, "x": 0, "y": 0, "box": [560, 380]})
        paint(place(big, W - 90 - big.width, H - 110 - big.height), (255, 255, 255), 0.07)
    frame = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(frame)
    d.rectangle((44, 44, W - 45, H - 45), outline=110, width=2)
    for x0, y0, sx, sy in ((44, 44, 1, 1), (W - 45, 44, -1, 1), (44, H - 45, 1, -1), (W - 45, H - 45, -1, -1)):
        for lx, ly in ((46, 5), (5, 46)):                         # a corner tick: two short bars
            xa, ya = x0 + sx * lx, y0 + sy * ly
            d.rectangle((min(x0, xa), min(y0, ya), max(x0, xa), max(y0, ya)), fill=230)

    kicker, body = None, text
    if ": " in text and len(text.split(": ", 1)[0].split()) <= 3:
        kicker, body = text.split(": ", 1)
    chars = len(body)
    n = 1 if chars <= 14 else 2 if chars <= 34 else 3 if chars <= 62 else 4
    block = _block_mask(_balanced_lines(body.upper().split(), n), 1120, 190, 18, 3)
    bx, by = (W - block.width) / 2, (H - block.height) / 2 + (24 if kicker else 0)
    body_mask = place(block, bx, by)
    pale = bg and (0.299 * color[0] + 0.587 * color[1] + 0.114 * color[2]) > 150
    # on a pale card the words go dark and the labels deeper, so they still read
    ink_colour, amber, grey = ((28, 26, 24), (168, 96, 16), (84, 84, 84)) if pale else         ((246, 244, 238), (255, 196, 60), (196, 196, 196))
    labels = [(place(_item_strip({"text": code, "font": "grotesk-cn", "size": 46, "x": 0, "y": 0, "weight": 1}),
                     76, 70), amber)]
    if kicker:                                                    # the lead-in, centred, sitting on the block
        k = _item_strip({"text": kicker.upper(), "font": "grotesk-cn", "size": 60, "x": 0, "y": 0, "weight": 1})
        labels.append((place(k, (W - k.width) / 2, by - 30 - k.height), amber))
    if prompt:
        labels.append((place(_item_strip({"text": prompt, "font": "grotesk-cn", "size": 36, "x": 0, "y": 0}),
                             76, H - 100), grey))
    ink = np.asarray(body_mask, np.uint8)
    for m, _ in labels:
        ink = np.maximum(ink, np.asarray(m, np.uint8))
    if bg:                                                        # on a card: a soft shadow, as printed type casts
        shadow = cv2.GaussianBlur(np.roll(np.roll(ink, 5, axis=0), 5, axis=1).astype(np.float32), (0, 0), 6.0)
        paint(Image.fromarray(np.clip(shadow, 0, 255).astype(np.uint8)), (0, 0, 0), 0.22 if pale else 0.5)
    else:                                                         # over an effect: a black outline, to stay legible
        paint(Image.fromarray(cv2.dilate(ink, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))), (0, 0, 0), 0.85)
    paint(frame, (236, 236, 228), 0.5)
    paint(body_mask, ink_colour)
    for m, colour in labels:
        paint(m, colour)
    _slates[key] = (np.ascontiguousarray(prem), np.ascontiguousarray(alpha))
    return _slates[key]


def draw_slate(img, p):
    opacity = float(p.get("opacity", 1.0))
    if opacity <= 0:
        return img
    rgb, a = render_slate(p.get("code", ""), p.get("text", ""), tuple(p.get("color", (22, 22, 26))),
                          p.get("bg", True), p.get("prompt"))
    img *= 1.0 - (a * opacity)[..., None]
    img += rgb * opacity
    return img


# ---------- dust ----------

def draw_dust(img, p, t):
    """Specks and streaks flying out from a point (the source's R03/R04 dust), deterministic in time.

    Each particle starts at a random radius and angle from (ox, oy) and moves outward at its own speed, wrapping
    back to the inner radius when it leaves the frame, so the field is steady. Streak length follows speed.

    - `travel` (seconds' worth of flight, keyed) replaces the time since the layer began, so the field can speed
      up with a camera move and slow again without jumping.
    - `swirl` curves every path (radians turned per 1000 px flown outward).
    - `style: "hand"` draws each streak as a hand-inked speed line: a wedge, thin at its tail and broad at its
      head, with an uneven, slightly bent edge that is re-drawn every `boil` frames (2: on twos), and its own
      brightness. The origin (ox, oy) may be keyed to follow what the camera is looking at."""
    import cv2
    n = int(p.get("n", 80))
    rng = np.random.default_rng(p.get("seed", 0))
    ox, oy = p.get("ox", W / 2), p.get("oy", H / 2)
    ang = rng.random(n) * 2 * np.pi
    r0 = rng.random(n)
    speed = p.get("speed_lo", 60) + (p.get("speed_hi", 300) - p.get("speed_lo", 60)) * rng.random(n) ** 2
    size = p.get("size_lo", 1.0) + (p.get("size_hi", 2.2) - p.get("size_lo", 1.0)) * rng.random(n)
    bright = 0.45 + 0.55 * rng.random(n)
    rmax = math.hypot(W, H) / 2 + 40
    rmin = p.get("r_min", 30)
    span = rmax - rmin
    travel = float(p["travel"]) if "travel" in p else t - p.get("_t0", 0.0)
    r = rmin + np.mod(r0 * span + speed * travel, span)
    streak = p.get("streak", 1.4) * speed / 24.0
    swirl = float(p.get("swirl", 0.0)) / 1000.0
    hand = p.get("style") == "hand"
    if hand:                                           # this drawing's wobble: new every `boil` frames
        drawing = int(math.floor((t + 0.5) * 24 + 0.5)) // max(1, int(p.get("boil", 2)))
        jig = np.random.default_rng((int(p.get("seed", 0)) * 7919 + drawing) % (2 ** 32))
        bend = jig.normal(0.0, 1.0, n) * float(p.get("bend", 1.6))
        wob = 0.75 + 0.5 * jig.random(n)
    layer = np.zeros((H, W), np.uint8)
    for i in range(n):
        rt = max(rmin, r[i] - streak[i])
        a1, a0 = ang[i] + swirl * r[i], ang[i] + swirl * rt
        x1, y1 = ox + r[i] * math.cos(a1), oy + r[i] * math.sin(a1)
        x0, y0 = ox + rt * math.cos(a0), oy + rt * math.sin(a0)
        if not hand:
            cv2.line(layer, (int(x0 * 16), int(y0 * 16)), (int(x1 * 16), int(y1 * 16)), 255,
                     max(1, int(round(size[i]))), cv2.LINE_AA, 4)
            continue
        dx, dy = x1 - x0, y1 - y0
        ln = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / ln, dx / ln                     # the streak's sideways direction
        head = size[i] * wob[i] * 1.3                  # half-widths: a broad head, a hairline tail
        tail = head * 0.12
        mx, my = x0 + dx * 0.55 + nx * bend[i], y0 + dy * 0.55 + ny * bend[i]
        mid = (head + tail) * 0.5
        pts = [(x0 + nx * tail, y0 + ny * tail), (mx + nx * mid, my + ny * mid), (x1 + nx * head, y1 + ny * head),
               (x1 + dx / ln * head * 0.8, y1 + dy / ln * head * 0.8),
               (x1 - nx * head, y1 - ny * head), (mx - nx * mid, my - ny * mid), (x0 - nx * tail, y0 - ny * tail)]
        cv2.fillPoly(layer, [np.round(np.array(pts) * 16).astype(np.int32)], int(255 * bright[i]),
                     lineType=cv2.LINE_AA, shift=4)
    light = layer.astype(np.float32)[..., None] / 255.0 * rgb01(p.get("color", (255, 255, 255))) * \
        float(p.get("opacity", 0.8))
    screen(img, light)
    return img


# ---------- the logo ----------

def draw_logo(img, p):
    """A piece of the title logo (wordmark, kanji or book, from logo.py), optionally tinted."""
    from . import logo
    opacity = float(p.get("opacity", 1.0))
    if opacity <= 0:
        return img
    rgb, a = logo.render_parts(FONT_DIR)[p["part"]]
    if "tint" in p:
        rgb = rgb * rgb01(p["tint"])
    dx, dy = int(round(p.get("dx", 0))), int(round(p.get("dy", 0)))
    if dx or dy:                                   # the same piece, moved (the wordmark sits centred before the logo)
        rgb = np.roll(np.roll(rgb, dy, axis=0), dx, axis=1)
        a = np.roll(np.roll(a, dy, axis=0), dx, axis=1)
    over(img, rgb, a * opacity)
    return img


_streak_cache = {}


def draw_logo_light(img, p):
    """The logo's kanji as blue light with rays rising off every stroke (the source's R08 reveal)."""
    import cv2
    from . import fx, logo
    strength = float(p.get("strength", 1.0))
    if strength <= 0:
        return img
    a = logo.render_parts(FONT_DIR)["kanji_alpha"][1]
    length = float(p.get("length", 120))
    key = round(length)
    if key not in _streak_cache:
        _streak_cache[key] = fx.upward_streaks(a, length)
    streaks = _streak_cache[key]
    glow = cv2.GaussianBlur(a, (0, 0), float(p.get("glow", 6)))
    light = (streaks * 0.75 + glow * 0.6 + a * 0.9) * strength
    screen(img, (light[..., None] * rgb01(p.get("color", (70, 175, 255)))).clip(0, 1))
    return img
