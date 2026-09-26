"""Procedural effects, built as look-alikes of effects measured in the source (design/opening-titles.md section 4).

Two families:
- cel: flat, hard-edged painted shapes (the blue raindrop ring at R01): bands, discs, droplets.
- light: glows, the airbrushed white rings (R05), sparkles and full-frame washes.

Everything draws into a frame in place (see raster.py) and is deterministic for a given seed.
"""
import math

import numpy as np

from .raster import W, H, add, over, polar, rgb01, screen


# ---------- noise ----------

def periodic_noise(n, seed, smooth=2):
    """Smooth noise around a circle: n samples in 0..1 that wrap round seamlessly."""
    rng = np.random.default_rng(seed)
    base = rng.random(n)
    if smooth > 0:
        k = np.hanning(2 * smooth + 3)[1:-1]
        k /= k.sum()
        ext = np.concatenate([base[-smooth:], base, base[:smooth]])
        base = np.convolve(ext, k, mode="valid")
    lo, hi = base.min(), base.max()
    return (base - lo) / (hi - lo + 1e-9)


def sample_periodic(arr, theta):
    """Linearly interpolate a periodic array at angles theta (radians)."""
    n = len(arr)
    x = theta * (n / (2 * np.pi))
    i0 = np.floor(x).astype(np.int64)
    f = (x - i0).astype(np.float32)
    i0 %= n
    return arr[i0] * (1 - f) + arr[(i0 + 1) % n] * f


def dash_mask(theta, coverage, seed, segments=48, soft=0.03, smooth=1):
    """1 where a ring is lit and 0 in its gaps: `coverage` of the circle lit, in irregular arcs.

    Few smoothed segments give long arcs; many unsmoothed segments give a fine, dotted break-up."""
    if coverage >= 0.999:
        return np.ones_like(theta)
    if coverage <= 0.001:
        return np.zeros_like(theta)
    noise = periodic_noise(segments, seed, smooth=smooth)
    thr = np.quantile(noise, 1.0 - coverage)
    v = sample_periodic(noise, theta)
    return np.clip((v - thr) / soft + 0.5, 0.0, 1.0)


def grain_field(seed, w=W, h=H):
    """Per-pixel uniform noise 0..1, fixed for a seed (used for sprayed, airbrushed edges)."""
    return np.random.default_rng(seed).random((h, w), dtype=np.float32)


# ---------- cel shapes ----------

def cel_band(img, cx, cy, r_in, r_out, color, wobble=0.0, wobble_seed=0, coverage=1.0,
             dash_seed=1, dash_segments=48, aa=1.0, dash_smooth=1):
    """A flat, hard-edged painted ring from r_in to r_out; optionally wobbly (hand-drawn) and broken into dashes."""
    d, th = polar(cx, cy)
    if wobble:
        k = 1.0 + wobble * (periodic_noise(24, wobble_seed, smooth=2) * 2.0 - 1.0)
        scale = sample_periodic(k, th)
        ri, ro = r_in * scale, r_out * scale
    else:
        ri, ro = r_in, r_out
    cov = np.clip(0.5 + (d - ri) / aa, 0, 1) * np.clip(0.5 + (ro - d) / aa, 0, 1)
    if coverage < 0.999:
        cov = cov * dash_mask(th, coverage, dash_seed, dash_segments, smooth=dash_smooth)
    over(img, rgb01(color), cov)
    return img


def _window(cx, cy, reach, w=W, h=H):
    x0, x1 = int(max(0, np.floor(cx - reach))), int(min(w, np.ceil(cx + reach) + 1))
    y0, y1 = int(max(0, np.floor(cy - reach))), int(min(h, np.ceil(cy + reach) + 1))
    if x0 >= x1 or y0 >= y1:
        return None
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    return (y0, y1, x0, x1), np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2), (yy - cy), (xx - cx)


def disc(img, cx, cy, r, color, aa=1.0):
    """A flat painted disc."""
    win = _window(cx, cy, r + 2)
    if win is None:
        return img
    (y0, y1, x0, x1), d, _, _ = win
    over(img[y0:y1, x0:x1], rgb01(color), np.clip(0.5 + (r - d) / aa, 0, 1))
    return img


def droplets(img, cx, cy, r_lo, r_hi, n, size_lo, size_hi, color, seed):
    """Splash droplets: n small flat discs scattered in the annulus r_lo..r_hi (biased toward r_hi)."""
    rng = np.random.default_rng(seed)
    ang = rng.random(n) * 2 * np.pi
    rad = r_lo + (r_hi - r_lo) * np.sqrt(rng.random(n))
    size = size_lo + (size_hi - size_lo) * rng.random(n) ** 2
    for a, rr, s in zip(ang, rad, size):
        disc(img, cx + rr * np.cos(a), cy + rr * np.sin(a), s, color)
    return img


# ---------- light ----------

def glow_dot(img, cx, cy, r_core, sigma, color, strength=1.0):
    """A small light: a solid core of radius r_core with a gaussian halo of width sigma (additive)."""
    win = _window(cx, cy, r_core + 4 * sigma + 2)
    if win is None:
        return img
    (y0, y1, x0, x1), d, _, _ = win
    core = np.clip(0.5 + (r_core - d), 0, 1)
    halo = np.exp(-np.maximum(d - r_core, 0) ** 2 / (2 * sigma * sigma)) * 0.6
    light = np.maximum(core, halo)[..., None] * rgb01(color) * strength
    add(img[y0:y1, x0:x1], light)
    return img


def glint(img, cx, cy, arm, color, width=1.2, strength=1.0):
    """A four-point sparkle: a bright core with thin horizontal and vertical arms (additive)."""
    win = _window(cx, cy, arm + 2)
    if win is None:
        return img
    (y0, y1, x0, x1), d, dy, dx = win
    horiz = np.exp(-(dy / width) ** 2) * np.exp(-np.abs(dx) / (arm / 3))
    vert = np.exp(-(dx / width) ** 2) * np.exp(-np.abs(dy) / (arm / 3))
    core = np.exp(-(d / (width * 1.8)) ** 2)
    light = np.clip(horiz + vert + core, 0, 1.5)[..., None] * rgb01(color) * strength
    add(img[y0:y1, x0:x1], light)
    return img


def airbrush_ring(img, cx, cy, r, band, glow=22.0, spray=36.0, inner_glow=30.0,
                  core=(255, 255, 255), halo=(205, 232, 255), seed=0, strength=1.0):
    """The R05 look: a white band from r - band to r with a crisp outer edge, a soft halo outside,
    and an airbrushed inner edge that breaks into spray over `spray` pixels.

    Measured on the source (R05, 12.69 s): a 48 px plateau at full white for r = 484, the outer halo falling
    to 1/e over about 22 px, a sprayed inner edge about 36 px deep.
    """
    d, _ = polar(cx, cy)
    inner = r - band
    outer_edge = np.clip(0.5 + (r - d) / 1.5, 0, 1)
    solid = np.clip(0.5 + (d - inner) / 1.5, 0, 1)
    # the spray: below `inner`, a grainy coverage that thins out toward inner - spray
    depth = np.clip((inner - d) / max(spray, 1e-3), 0, 1)       # 0 at the band, 1 at full spray depth
    grains = grain_field(seed)
    sprayed = (grains > depth ** 0.6).astype(np.float32) * (1 - depth) * (d < inner)
    coverage = np.maximum(solid, sprayed) * outer_edge * strength
    # halos (screen blended so they brighten without blowing out the colours underneath)
    out_halo = 0.5 * np.exp(-np.maximum(d - r, 0) / glow) * (d > r)
    in_halo = 0.35 * np.exp(-np.maximum(inner - d, 0) / inner_glow) * (d < inner)
    screen(img, (np.maximum(out_halo, in_halo) * strength)[..., None] * rgb01(halo))
    over(img, rgb01(core), np.clip(coverage, 0, 1))
    return img


def bloom(img, sigma, strength, threshold=0.0):
    """Film bloom: add a blurred copy of the frame's bright parts back over it (everything drawn so far)."""
    import cv2
    src = np.clip(img - threshold, 0, None) if threshold > 0 else img
    k = int(round(sigma * 6)) | 1
    img += cv2.GaussianBlur(src, (k, k), sigma) * strength
    return img


def wash(img, color, amount, mode="mix"):
    """Wash the whole frame toward a colour.

    mix:    toward a flat colour (the white-cyan and grey-green frames at the end of R05).
    screen: a light flashed over the picture, which lifts the darks and keeps the brights (R05's lavender frames
            are a warm light screened over blue)."""
    from .raster import mix
    amount = float(np.clip(amount, 0, 1))
    if mode == "screen":
        return screen(img, np.broadcast_to(rgb01(color) * amount, img.shape))
    return mix(img, color, amount)


def film_grain(img, seed, amount=0.012, soften=0.0):
    """A light, fixed-per-frame grain so procedural frames sit next to the scanned source."""
    rng = np.random.default_rng(seed)
    n = rng.normal(0.0, amount, img.shape[:2]).astype(np.float32)
    img += n[..., None]
    if soften > 0:
        import cv2
        k = int(max(3, round(soften * 6)) | 1)
        np.copyto(img, cv2.GaussianBlur(img, (k, k), soften))
    return img


def vhs(img, frame, strength=1.0, bleed=3.5, noise=0.018, jitter=0.6, head=1.0, lift=0.0, saturation=1.0,
        dropouts=0.0, dropout_opacity=0.4, halation=0.0, seed=0):
    """The finish of a 1990s broadcast tape over the whole picture, the same every time for a given frame.

    - Colour is smeared sideways and shifted a little right: tape keeps colour at a fraction of the detail it
      keeps brightness (`bleed`, in pixels).
    - Brightness is softened a touch, with the faint ringing a tape deck's sharpening leaves at edges.
    - Noise streaks along the scan lines, with slow blotches of colour noise under it (`noise`).
    - Every scan line is nudged sideways by a slow wobble (`jitter`, in pixels).
    - The last few lines tear sideways and fizz, where the video heads switch (`head`).
    - A tape's grade: blacks lifted (`lift`) and colour a little weaker (`saturation` below 1).
    - Now and then a dropout, a white streak where the tape lost its coating (`dropouts`: how many to expect in a
      frame, so 0.2 is one every five frames or so).
    - Halation: the brightest parts glow softly and warmly into what's round them, as they did on film and on a
      tube screen (`halation`, the glow's strength).
    `strength` scales all of it; 0 leaves the picture alone."""
    import cv2
    if strength <= 0:
        return img
    h, w = img.shape[:2]
    rng = np.random.default_rng((int(seed) * 1000003 + int(frame)) % (2 ** 32))
    if halation > 0:
        lum = 0.299 * img[..., 0] + 0.587 * img[..., 1] + 0.114 * img[..., 2]
        hot = img * np.clip((lum - 0.68) / 0.32, 0.0, 1.0)[..., None]
        glow = cv2.GaussianBlur(hot, (0, 0), 16.0) * np.float32([1.0, 0.9, 0.76]) * (halation * strength)
        np.copyto(img, 1.0 - (1.0 - img) * (1.0 - np.clip(glow, 0.0, 1.0)))
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    y = 0.299 * r + 0.587 * g + 0.114 * b
    u, v = b - y, r - y
    if bleed > 0:
        s = bleed * strength
        shift = np.float32([[1, 0, 0.6 * s], [0, 1, 0]])
        u = cv2.warpAffine(cv2.GaussianBlur(u, (0, 0), sigmaX=s, sigmaY=0.01), shift, (w, h), borderMode=cv2.BORDER_REPLICATE)
        v = cv2.warpAffine(cv2.GaussianBlur(v, (0, 0), sigmaX=s, sigmaY=0.01), shift, (w, h), borderMode=cv2.BORDER_REPLICATE)
    soft = cv2.GaussianBlur(y, (0, 0), sigmaX=0.8, sigmaY=0.01)
    y = soft + (soft - cv2.GaussianBlur(soft, (0, 0), sigmaX=2.5, sigmaY=0.01)) * 0.35 * strength
    if noise > 0:
        streaks = cv2.resize(rng.normal(0, 1, (h, max(1, w // 4))).astype(np.float32), (w, h), interpolation=cv2.INTER_LINEAR)
        streaks = cv2.GaussianBlur(streaks, (0, 0), sigmaX=0.01, sigmaY=0.9)   # soft lines, not one-pixel scratches
        y = y + streaks * noise * strength
        blotch = cv2.resize(rng.normal(0, 1, (max(1, h // 4), max(1, w // 16), 2)).astype(np.float32), (w, h),
                            interpolation=cv2.INTER_CUBIC)
        u = u + blotch[..., 0] * noise * 1.1 * strength
        v = v + blotch[..., 1] * noise * 1.1 * strength
    if saturation != 1.0:
        u, v = u * saturation, v * saturation
    if lift > 0:
        y = y * (1.0 - lift * strength) + lift * strength
    out = np.empty_like(img)
    out[..., 0] = y + v
    out[..., 2] = y + u
    out[..., 1] = (y - 0.299 * out[..., 0] - 0.114 * out[..., 2]) / 0.587
    offsets = np.zeros(h, np.float32)
    if jitter > 0:
        rows = np.arange(h, dtype=np.float32)
        phase = rng.random() * 2 * np.pi
        offsets += jitter * strength * np.sin(rows / h * 2 * np.pi * 1.5 + phase)
        offsets += rng.normal(0, 0.18 * jitter * strength, h).astype(np.float32)
    if head > 0:
        k = max(4, h // 90)
        offsets[-k:] += head * strength * np.linspace(4, 22, k) * (0.7 + 0.6 * rng.random())
        out[-k:] += rng.normal(0, 0.06 * head * strength, (k, w, 1)).astype(np.float32)
    if np.any(offsets):
        xx = np.broadcast_to(np.arange(w, dtype=np.float32)[None, :], (h, w))
        map_x = np.ascontiguousarray(xx - offsets[:, None])
        map_y = np.ascontiguousarray(np.broadcast_to(np.arange(h, dtype=np.float32)[:, None], (h, w)))
        out = cv2.remap(out, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    for _ in range(int(rng.poisson(dropouts * strength))):
        _soft_streak(out, int(rng.integers(0, h)), int(rng.integers(0, w)), int(rng.integers(12, 160)),
                     dropout_opacity)
    np.copyto(img, np.clip(out, 0.0, 1.0))
    return img


def vhs_damage(img, frame, band_y=540.0, band_h=70.0, tear=36.0, fizz=0.35, dropouts=8, strength=1.0, seed=0):
    """A burst of tape damage at one moment: a tracking band (its lines torn sideways, fizzing and washed out)
    centred on `band_y`, and `dropouts` white streaks where the tape lost its coating."""
    import cv2
    if strength <= 0:
        return img
    h, w = img.shape[:2]
    rng = np.random.default_rng((int(seed) * 7907 + int(frame)) % (2 ** 32))
    y0, y1 = int(max(0, band_y - band_h / 2)), int(min(h, band_y + band_h / 2))
    if y1 > y0 and tear > 0:
        n = y1 - y0
        shape = np.sin(np.linspace(0, np.pi, n)) ** 0.7                    # torn hardest in the middle of the band
        offsets = (tear * strength * shape * (0.6 + 0.8 * rng.random(n))).astype(np.float32)
        band = img[y0:y1]
        xx = np.broadcast_to(np.arange(w, dtype=np.float32)[None, :], (n, w))
        map_x = np.ascontiguousarray(xx - offsets[:, None])
        map_y = np.ascontiguousarray(np.broadcast_to(np.arange(n, dtype=np.float32)[:, None], (n, w)))
        torn = cv2.remap(band, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
        wash = fizz * strength * shape[:, None, None]
        torn = torn * (1 - wash * 0.5) + wash * 0.5 + rng.normal(0, 0.12 * fizz * strength, (n, w, 1)).astype(np.float32)
        img[y0:y1] = np.clip(torn, 0.0, 1.0)
    for _ in range(int(dropouts * strength)):
        _soft_streak(img, int(rng.integers(0, h)), int(rng.integers(0, w)), int(rng.integers(20, 220)), 0.55)
    return img


def tape_blank(img, t, strength=1.0, snow=0.0, seed=0):
    """Blank tape before the programme, its tracking not yet locked (Ingram: "start with a 'tracking issue' and add
    some blank space"): black with a faint sparkle, and while `strength` (how far off the tracking is) is up, two
    bands of smeared static rolling up the picture, with a pale line now and then. At 0 it is clean black.

    `snow` (0..1) turns the picture to an empty channel's static instead, for the flick through the channels
    before the set lands on the tape (Ingram: "as if it were changing channel")."""
    import cv2
    h, w = img.shape[:2]
    rng = np.random.default_rng((int(seed) * 104729 + int(round((t + 10.0) * 24))) % (2 ** 32))
    img[:] = 0.015
    sparkle = cv2.resize(rng.random((h // 2, w // 2)).astype(np.float32), (w, h), interpolation=cv2.INTER_NEAREST)
    img += (sparkle ** 6)[..., None] * (0.06 + 0.3 * strength)
    if snow > 0:                                           # grains a couple of pixels wide, smeared along the lines
        grains = cv2.resize(rng.random((h // 2, w // 2)).astype(np.float32), (w, h), interpolation=cv2.INTER_NEAREST)
        grains = cv2.GaussianBlur(grains, (0, 0), sigmaX=0.9, sigmaY=0.01)
        static = (0.06 + 0.85 * grains ** 1.6)[..., None]
        img *= 1.0 - snow
        img += static * snow
    if strength > 0:
        for height, speed, phase in ((130, 210.0, 0.0), (64, 290.0, 0.47)):
            centre = h * 1.1 - ((t * speed / h + phase) % 1.25) * h        # rolling up, wrapping from below
            y0, y1 = int(max(0, centre - height / 2)), int(min(h, centre + height / 2))
            if y1 <= y0:
                continue
            n = y1 - y0
            profile = np.sin(np.linspace(0, np.pi, n)) ** 0.6
            # a tracking band is a run of scan lines full of short white dashes, thickest in its middle
            dashes = cv2.resize(rng.random((n, max(1, w // 26))).astype(np.float32), (w, n),
                                interpolation=cv2.INTER_LINEAR)
            grain = cv2.resize(rng.random((n, max(1, w // 3))).astype(np.float32), (w, n),
                               interpolation=cv2.INTER_LINEAR)
            share = (0.12 + 0.5 * profile)[:, None]                    # how much of each line is dashed
            lit = np.clip((dashes - (0.72 - 0.5 * share)) / 0.12, 0.0, 1.0) * (rng.random((n, 1)) < 0.35 + 0.6 * profile[:, None])
            haze = (0.05 + 0.1 * grain) * profile[:, None]
            band = np.maximum(lit * (0.45 + 0.5 * grain), haze) * strength
            np.maximum(img[y0:y1], band[..., None], out=img[y0:y1])
        if rng.random() < 0.35 * strength:
            _soft_streak(img, int(rng.integers(0, h)), 0, w, 0.3 * strength)
    np.clip(img, 0.0, 1.0, out=img)
    return img


def light_column(img, t, cx=720.0, width=360.0, edge=(128, 22, 10), core=(236, 96, 26), streak=(255, 214, 120),
                 spark=(255, 244, 200), n=150, sparks=110, speed=240.0, boil=2, strength=1.0, seed=0, bloom=0.3,
                 vignette=0.3):
    """The column of orange light the Frame stands in (the source's R32–R35 and R102–R105), painted over the whole
    picture: a red field glowing orange toward the column's centre `cx`, full of thin vertical streaks of hot light
    rising in long dashes, with sparks drifting up through it. Streaks and sparks are re-drawn every `boil` frames
    (on twos, as the source's are). The same moment always draws the same."""
    import cv2
    h, w = img.shape[:2]
    boil = max(1, int(boil))
    k = int(round((t + 10.0) * 24)) // boil
    tq = k * boil / 24.0 - 10.0                                  # the time this drawing was made for
    xs = np.arange(w, dtype=np.float32)
    glow = np.exp(-0.5 * ((xs - cx) / width) ** 2)
    e, c = np.asarray(rgb01(edge), np.float32), np.asarray(rgb01(core), np.float32)
    field = np.empty((h, w, 3), np.float32)
    field[:] = (e[None, :] + (c - e)[None, :] * glow[:, None])[None]

    rng = np.random.default_rng(int(seed))                       # each streak's place and character is fixed...
    sx = cx + rng.normal(0, width * 0.75, n)
    sw = 0.7 + 4.5 * rng.random(n) ** 4                          # mostly hairlines, a few broad
    sb = 0.35 + 0.65 * rng.random(n)
    period = 160 + 520 * rng.random(n)
    phase = rng.random(n)
    flicker = np.random.default_rng(int(seed) * 7919 + k).random(n)    # ...and each drawing flickers a little
    hs = max(1, h // 8)
    ys = (np.arange(hs, dtype=np.float32) + 0.5) * (h / hs)
    lines = np.zeros((hs, w), np.float32)
    for i in range(n):
        x0, x1 = int(max(0, sx[i] - 4 * sw[i] - 2)), int(min(w, sx[i] + 4 * sw[i] + 3))
        if x1 <= x0:
            continue
        across = np.exp(-0.5 * ((xs[x0:x1] - sx[i]) / sw[i]) ** 2)
        rise = ((ys + speed * tq) / period[i] + phase[i]) % 1.0   # the dashes rise as time goes on
        along = (0.5 + 0.5 * np.cos(2 * np.pi * rise)) ** 3
        lines[:, x0:x1] += (sb[i] * (0.6 + 0.4 * flicker[i]) * along)[:, None] * across[None, :]
    lines = cv2.resize(lines, (w, h), interpolation=cv2.INTER_LINEAR)
    lit = np.clip(lines + 0.18 * glow[None, :] ** 3, 0.0, 1.0)[..., None]
    field += (np.asarray(rgb01(streak), np.float32) - field) * lit

    srng = np.random.default_rng(int(seed) + 1)
    px = cx + srng.normal(0, width * 0.9, sparks)
    py0 = srng.random(sparks) * h
    pv = 60 + 340 * srng.random(sparks)
    pr = 1 + 2 * srng.random(sparks) ** 2
    shown = np.random.default_rng(int(seed) * 104729 + k).random(sparks) < 0.85
    dots = np.zeros((h, w), np.float32)
    for i in np.nonzero(shown)[0]:
        y = (py0[i] - pv[i] * tq) % h                            # drifting up, round again from the bottom
        cv2.circle(dots, (int(round(px[i])), int(round(y))), int(round(pr[i])), 1.0, -1, cv2.LINE_AA)
    dots = np.clip(cv2.GaussianBlur(dots, (0, 0), 1.2) * 1.6, 0.0, 1.0)[..., None]
    field += (np.asarray(rgb01(spark), np.float32) - field) * dots
    for i in np.nonzero(shown & (pr > 2.5))[0][:8]:                  # the biggest sparks catch the light
        y = (py0[i] - pv[i] * tq) % h
        glint(field, px[i], y, 26 + 30 * (pr[i] - 2.5), spark, width=1.0, strength=0.9)

    # the column's heart glows hottest, and its sides fall away into shadow, top and bottom a little too
    heart = (glow ** 3)[None, :, None]
    field += (np.asarray(rgb01(streak), np.float32) - field) * heart * bloom
    ys_full = np.arange(h, dtype=np.float32)
    fall = (1.0 - vignette * (1.0 - glow) ** 1.5)[None, :] * (1.0 - 0.1 * ((ys_full / h - 0.5) * 2) ** 2)[:, None]
    field *= fall[..., None]

    s = float(np.clip(strength, 0.0, 1.0))
    img *= 1.0 - s
    img += field * s
    return img


def _drawing(t, boil):
    """The index of the drawing on screen at time t when an effect is re-drawn every `boil` frames."""
    return int(round((t + 10.0) * 24)) // max(1, int(boil))


def _smooth(h, w, sigma, seed):
    """Low-frequency noise, about unit spread, fixed for a seed."""
    import cv2
    n = np.random.default_rng(int(seed)).normal(0, 1, (max(1, h // 8), max(1, w // 8))).astype(np.float32)
    n = cv2.GaussianBlur(cv2.resize(n, (w, h), interpolation=cv2.INTER_CUBIC), (0, 0), max(0.5, sigma / 8))
    return n / (n.std() + 1e-6)


def field(img, color, gradient=0.14, vignette=0.22, mottle=0.03, seed=0):
    """A flat colour painted like a cel background: lighter toward the top by `gradient`, darker toward the corners
    by `vignette`, with a little unevenness in the paint (`mottle`). Covers the whole picture."""
    h, w = img.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    shade = 1.0 + gradient * (0.5 - yy / h)
    shade -= vignette * np.clip((((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2) / 2, 0, 1) ** 1.4
    if mottle:
        shade *= 1.0 + mottle * _smooth(h, w, 60.0, seed)
    img[:] = np.clip(np.asarray(rgb01(color), np.float32)[None, None] * shade[..., None], 0.0, 1.0)
    return img


def orb(img, cx, cy, r, color, light=(-0.5, -0.6), rim=(255, 236, 255), glow=0.6, mottle=0.16, strength=1.0,
        seed=0):
    """A glowing core drawn as a cel-shaded sphere (the source's R47, a red core; ours is violet, the Claimants'
    colour): two flat tones split by a hard terminator, an airbrushed gradient on the lit side, a specular spot, a
    thin rim of light on the dark side, a mottled skin, and a soft glow round it."""
    d, _ = polar(cx, cy)
    h, w = img.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    nx, ny = (xx - cx) / r, (yy - cy) / r
    inside = np.clip(r - d + 0.5, 0.0, 1.0)
    nz = np.sqrt(np.clip(1.0 - nx * nx - ny * ny, 0.0, 1.0))
    lx, ly = light
    lz = math.sqrt(max(0.05, 1.0 - lx * lx - ly * ly))
    lam = np.clip(nx * lx + ny * ly + nz * lz, 0.0, 1.0)
    tone = np.where(lam > 0.42, 1.0, 0.58) + 0.22 * lam                       # two cel tones plus airbrush
    if mottle:
        tone *= 1.0 + mottle * _smooth(h, w, r / 2.5, seed)
    base = np.asarray(rgb01(color), np.float32)
    body = np.clip(base[None, None] * tone[..., None], 0, 1)
    spec = np.clip((lam - 0.988) / 0.008, 0, 1)[..., None]                     # a small specular spot
    body = body + (1.0 - body) * spec * 0.8
    edge = np.clip((d / r - 0.86) / 0.1, 0, 1) * np.clip(-(nx * lx + ny * ly) * 1.6, 0, 1)
    body = body + (np.asarray(rgb01(rim), np.float32) - body) * (edge * 0.8)[..., None]
    over(img, body, inside * strength)
    halo = np.exp(-(np.clip(d - r, 0, None) / (0.45 * r)) ** 2) * (d > r * 0.98)
    screen(img, (halo * glow * strength)[..., None] * base)
    return img


def ray_fan(img, t, cx, cy, sectors, n=40, length=(300.0, 700.0), width=(6.0, 26.0), color=(255, 206, 110),
            unfurl=1.0, boil=2, blur=2.0, strength=1.0, seed=0):
    """Tapered rays of light fanning out from (cx, cy) across the given `sectors` ([from, to] in degrees, on screen:
    0 is right, 90 is down, 270 is up): the golden wings of R35, or a searchlight's glare. Each ray has its own
    length, width and brightness, grows with `unfurl` (0 to 1), fades toward its tip, and is re-drawn every `boil`
    frames with a flicker and a twitch, as drawn effects are."""
    import cv2
    h, w = img.shape[:2]
    rng = np.random.default_rng(int(seed))
    per = max(1, n // max(1, len(sectors)))
    ang = np.concatenate([a0 + (a1 - a0) * rng.random(per) for a0, a1 in sectors])
    k = len(ang)
    L = length[0] + (length[1] - length[0]) * rng.random(k) ** 0.7
    wd = width[0] + (width[1] - width[0]) * rng.random(k)
    b = 0.45 + 0.55 * rng.random(k)
    frng = np.random.default_rng(int(seed) * 7919 + _drawing(t, boil))
    flick = 0.7 + 0.6 * frng.random(k)
    ang = np.radians(ang + frng.normal(0, 0.7, k))
    rays = np.zeros((h, w), np.uint8)
    for i in np.argsort(b * flick):                                         # the brightest drawn last, on top
        L_i = L[i] * float(np.clip(unfurl, 0, 1.5))
        if L_i < 2:
            continue
        ca, sa = math.cos(ang[i]), math.sin(ang[i])
        tip = (cx + ca * L_i, cy + sa * L_i)
        px, py = -sa * wd[i] / 2, ca * wd[i] / 2
        pts = np.array([[cx + px, cy + py], [tip[0], tip[1]], [cx - px, cy - py]], np.float32)
        cv2.fillConvexPoly(rays, np.round(pts * 16).astype(np.int32), int(255 * min(1.0, b[i] * flick[i])),
                           lineType=cv2.LINE_AA, shift=4)
    m = rays.astype(np.float32) / 255.0
    d, _ = polar(cx, cy)
    m *= np.clip(1.0 - d / (float(np.max(L)) * max(0.05, float(unfurl)) + 1e-6), 0, 1) ** 0.6   # fading tips
    if blur:
        m = cv2.GaussianBlur(m, (0, 0), blur)
    glow = cv2.GaussianBlur(m, (0, 0), 14.0)
    screen(img, (np.clip(m + 0.6 * glow, 0, 1.5) * strength)[..., None] * np.asarray(rgb01(color), np.float32))
    return img


def arcs(img, t, cx, cy, r_in, r_out, n=7, color=(214, 170, 255), jag=0.35, boil=2, strength=1.0, seed=0):
    """Jagged arcs of light crackling outward from a ring between `r_in` and `r_out`, with a fork or two, re-drawn
    every `boil` frames: the rift's lightning."""
    import cv2
    h, w = img.shape[:2]
    rng = np.random.default_rng(int(seed) * 104729 + _drawing(t, boil))
    lines = np.zeros((h, w), np.uint8)

    def bolt(x, y, a, length, depth):
        steps = 9
        seg = length / steps
        pts = [(x, y)]
        for _ in range(steps):
            a += rng.normal(0, jag)
            x, y = x + math.cos(a) * seg, y + math.sin(a) * seg
            pts.append((x, y))
            if depth < 1 and rng.random() < 0.18:
                bolt(x, y, a + rng.choice([-0.9, 0.9]), length * 0.4, depth + 1)
        cv2.polylines(lines, [np.round(np.array(pts) * 16).astype(np.int32)], False, 255 if depth == 0 else 190,
                      2 if depth == 0 else 1, cv2.LINE_AA, shift=4)

    for _ in range(n):
        a = rng.random() * 2 * math.pi
        bolt(cx + math.cos(a) * r_in, cy + math.sin(a) * r_in, a, (r_out - r_in) * (0.6 + 0.6 * rng.random()), 0)
    m = lines.astype(np.float32) / 255.0
    glow = cv2.GaussianBlur(m, (0, 0), 6.0)
    screen(img, (np.clip(m + 1.2 * glow, 0, 1.5) * strength)[..., None] * np.asarray(rgb01(color), np.float32))
    return img


def radar(img, t, cx=720.0, cy=540.0, r=440.0, rings=4, sweep_speed=150.0, contacts=((0.62, -40.0), (0.45, 128.0),
          (0.8, 206.0)), color=(70, 255, 140), blip=(255, 190, 70), boil=2, strength=1.0):
    """A plotting-table radar scope (the source's R97 is a data screen; ours is a radar with three contacts): a dark
    phosphor disc with range rings, a crosshair and bearing ticks; a sweep turning at `sweep_speed` degrees a second,
    leaving a fading afterglow behind it; contacts (range as a share of the radius, bearing in screen degrees) that
    flare as the sweep crosses them and fade after. The sweep steps every `boil` frames, as a drawn effect."""
    import cv2
    h, w = img.shape[:2]
    d, th = polar(cx, cy)
    deg = np.degrees(th) % 360.0
    tq = _drawing(t, boil) * max(1, int(boil)) / 24.0 - 10.0
    sweep = (tq * sweep_speed) % 360.0
    behind = (sweep - deg) % 360.0                                           # degrees since the sweep passed
    col = np.asarray(rgb01(color), np.float32)
    disc = np.clip(r - d + 0.5, 0, 1)
    light = np.zeros((h, w), np.float32)
    light += 0.10 * np.clip(1 - d / r, 0, 1)                                # the phosphor's own faint glow
    for k in range(1, rings + 1):
        light += 0.42 * np.exp(-((d - r * k / rings) / 1.3) ** 2)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    light += 0.3 * (np.exp(-((xx - cx) / 1.1) ** 2) + np.exp(-((yy - cy) / 1.1) ** 2))
    tick = (np.abs(((deg + 5) % 10) - 5) < 0.35) & (d > r - 16)
    tick |= (np.abs(((deg + 15) % 30) - 15) < 0.3) & (d > r - 34)
    light += 0.5 * tick
    light += 0.55 * np.exp(-behind / 38.0) + 1.2 * (behind < 1.4)            # the afterglow, and the sweep itself
    light *= disc
    img[:] = np.asarray(rgb01((6, 12, 9)), np.float32)[None, None] * (1 - disc[..., None]) * 0.6
    img += (np.clip(light, 0, 1.6) * strength)[..., None] * col * disc[..., None]
    for rr, bearing in contacts:
        bx, by = cx + math.cos(math.radians(bearing)) * rr * r, cy + math.sin(math.radians(bearing)) * rr * r
        since = (sweep - bearing) % 360.0
        glow_dot(img, bx, by, 6.0, 10.0, blip, strength * (0.35 + 1.1 * math.exp(-since / 70.0)))
    img *= (0.94 + 0.06 * ((np.arange(h) % 3) == 0))[:, None, None]           # the tube's scan lines
    np.clip(img, 0, 1, out=img)
    return img


def data_bars(img, t, x, y, w, h, cols=10, segs=18, colors=((255, 76, 60), (76, 255, 140), (255, 206, 70),
              (90, 196, 255)), boil=2, strength=1.0, seed=0):
    """A readout panel of glowing segmented bars, one colour per column, their heights jumping every `boil` frames:
    the busy data screen of the source's R97, around our radar."""
    rng = np.random.default_rng(int(seed) * 7919 + _drawing(t, boil))
    cw, sh = w / cols, h / segs
    for c in range(cols):
        lit = int(rng.integers(2, segs + 1))
        colour = np.asarray(rgb01(colors[c % len(colors)]), np.float32)
        for s in range(segs):
            y1 = y + h - s * sh
            x0, x1 = x + c * cw + 3, x + (c + 1) * cw - 3
            a = (1.0 if s < lit else 0.12) * strength
            if y1 - sh + 2 < y1 - 2:
                over(img[int(y1 - sh + 2):int(y1 - 2), int(x0):int(x1)], colour, np.full((int(y1 - 2) - int(y1 - sh + 2), int(x1) - int(x0)), a, np.float32))
    return img


def streaks(img, t, angle=0.0, n=40, speed=2400.0, length=(160.0, 520.0), width=(3.0, 12.0), color=(255, 200, 110),
            band=(0.0, 1080.0), boil=2, strength=1.0, seed=0):
    """Speed streaks: tapered strokes all running one way (`angle` in screen degrees, 0 = rightward), thick at the
    head, as a charge's motion lines are drawn, scattered across `band` (the rows they may fill), flying at `speed`
    pixels a second and wrapping round, re-drawn every `boil` frames."""
    import cv2
    h, w = img.shape[:2]
    rng = np.random.default_rng(int(seed))
    L = length[0] + (length[1] - length[0]) * rng.random(n)
    wd = width[0] + (width[1] - width[0]) * rng.random(n)
    across = band[0] + (band[1] - band[0]) * rng.random(n)
    along0 = rng.random(n)
    sp = speed * (0.7 + 0.6 * rng.random(n))
    b = 0.5 + 0.5 * rng.random(n)
    tq = _drawing(t, boil) * max(1, int(boil)) / 24.0 - 10.0
    a = math.radians(angle)
    ca, sa = math.cos(a), math.sin(a)
    span = w + h + float(np.max(L))
    lines = np.zeros((h, w), np.uint8)
    for i in range(n):
        s = ((along0[i] * span + sp[i] * tq) % span) - span / 2            # the head's place along its line
        ox, oy = w / 2 - sa * (across[i] - h / 2), h / 2 + ca * (across[i] - h / 2)   # its line's middle
        hx, hy = ox + ca * s, oy + sa * s
        tx, ty = hx - ca * L[i], hy - sa * L[i]
        px, py = -sa * wd[i] / 2, ca * wd[i] / 2
        pts = np.array([[hx + px, hy + py], [hx - px, hy - py], [tx, ty]], np.float32)
        cv2.fillConvexPoly(lines, np.round(pts * 16).astype(np.int32), int(255 * b[i]), cv2.LINE_AA, shift=4)
    m = lines.astype(np.float32) / 255.0
    screen(img, (np.clip(m + 0.4 * cv2.GaussianBlur(m, (0, 0), 6.0), 0, 1.4) * strength)[..., None] *
           np.asarray(rgb01(color), np.float32))
    return img


def _soft_streak(img, y, x0, length, opacity, level=0.94):
    """A dropout: a pale horizontal streak, soft above and below and tapered at both ends, laid over the picture
    at `opacity` (Ingram: soften the lines, and lower their opacity)."""
    h, w = img.shape[:2]
    ys = np.arange(max(0, y - 3), min(h, y + 4))
    xs = np.arange(max(0, x0), min(w, x0 + length))
    if len(ys) == 0 or len(xs) == 0:
        return img
    across = np.exp(-((ys - y) / 0.9) ** 2 / 2)[:, None]
    along = np.sin(np.pi * (xs - x0 + 0.5) / max(1, length))[None, :] ** 0.6
    a = (opacity * across * along).astype(np.float32)[..., None]
    patch = img[ys[0]:ys[-1] + 1, xs[0]:xs[-1] + 1]
    patch += (level - patch) * a
    return img


_haze_noise = {}
_haze_grid = {}


def _periodic_noise(h, w, scale, seed):
    """Smooth noise that tiles seamlessly (low-passed in the frequency domain), unit spread, cached."""
    key = (h, w, round(float(scale), 2), int(seed))
    if key not in _haze_noise:
        white = np.random.default_rng(int(seed)).normal(0, 1, (h, w)).astype(np.float32)
        fy = np.fft.fftfreq(h)[:, None]
        fx = np.fft.rfftfreq(w)[None, :]
        sigma = scale / 2.0
        lowpass = np.exp(-2 * (np.pi * sigma) ** 2 * (fx ** 2 + fy ** 2))
        field = np.fft.irfft2(np.fft.rfft2(white) * lowpass, s=(h, w)).astype(np.float32)
        _haze_noise[key] = field / (field.std() + 1e-9)
    return _haze_noise[key]


def heat_haze(img, t, amp=1.6, scale=40.0, speed=45.0, y_hot=860.0, y_cool=260.0, seed=0):
    """High-summer heat shimmer, the way a rostrum camera got it: shooting through a moving sheet of ripple glass.

    Everything already drawn beneath it wobbles in small, smooth, irregular ripples (`amp` pixels, about `scale`
    pixels across) that rise at `speed` pixels a second, strongest below `y_hot` (the hot ground) and gone above
    `y_cool`. It's a camera effect, so it changes every frame."""
    import cv2
    if amp <= 0:
        return img
    h, w = img.shape[:2]
    if (h, w) not in _haze_grid:
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        _haze_grid[(h, w)] = (yy, xx)
    yy, xx = _haze_grid[(h, w)]

    def rising(field, v):                              # the ripples drift upward as time goes on
        return cv2.remap(field, xx, np.mod(yy + v * t, h).astype(np.float32), cv2.INTER_LINEAR,
                         borderMode=cv2.BORDER_WRAP)

    dx = 0.75 * rising(_periodic_noise(h, w, scale, seed), speed) + \
        0.35 * rising(_periodic_noise(h, w, scale * 0.55, seed + 1), speed * 1.7)
    dy = rising(_periodic_noise(h, w, scale, seed + 2), speed * 0.8)
    f = np.clip((yy - y_cool) / max(1e-6, y_hot - y_cool), 0.0, 1.0)
    mask = f * f * (3.0 - 2.0 * f)
    map_x = (xx + dx * amp * mask).astype(np.float32)
    map_y = (yy + dy * amp * 0.45 * mask).astype(np.float32)
    np.copyto(img, cv2.remap(img, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT))
    return img


def light_beam(img, x0, y0, x1, y1, width, glow, color, strength=1.0, core=(235, 250, 255)):
    """A bar of light from (x0, y0) to (x1, y1): a white-hot core `width` across, a coloured glow falling off over
    `glow` pixels (screen blended). The source's X beams and lens-flare lines are made of these."""
    from .raster import grid
    yy, xx = grid()
    dx, dy = x1 - x0, y1 - y0
    L2 = dx * dx + dy * dy or 1.0
    t = np.clip(((xx - x0) * dx + (yy - y0) * dy) / L2, 0, 1)
    d = np.sqrt((xx - (x0 + t * dx)) ** 2 + (yy - (y0 + t * dy)) ** 2)
    c = np.clip(1.0 - d / max(width / 2, 0.5), 0, 1) * strength
    g = np.exp(-d / max(glow, 1e-3)) * 0.85 * strength
    screen(img, (g[..., None] * rgb01(color)).clip(0, 1))
    screen(img, (c[..., None] * rgb01(core)).clip(0, 1))
    return img


def polygon_light(img, points, color, opacity=1.0, blur=0.0, blend="screen"):
    """A flat polygon of light (the source's R08 light planes), optionally softened, screened or painted over.

    `points` is one polygon ([[x, y], ...]) or several ([[[x, y], ...], ...]), drawn as one shape: the stripes of
    a hazard band, the light bars of a tunnel. Corners are placed to a sixteenth of a pixel, so a slow slide doesn't
    step."""
    import cv2
    polys = points if isinstance(points[0][0], (list, tuple)) else [points]
    mask = np.zeros(img.shape[:2], np.uint8)
    cv2.fillPoly(mask, [np.round(np.array(p, np.float64) * 16).astype(np.int32) for p in polys], 255,
                 lineType=cv2.LINE_AA, shift=4)
    m = mask.astype(np.float32) / 255.0
    if blur > 0:
        k = int(round(blur * 6)) | 1
        m = cv2.GaussianBlur(m, (k, k), blur)
    if blend == "over":
        over(img, rgb01(color), m * opacity)
    else:
        screen(img, (m[..., None] * rgb01(color) * opacity).clip(0, 1))
    return img


def upward_streaks(alpha, length):
    """Light trails rising from a mask: each pixel takes the brightest mask pixel below it, fading with distance."""
    decay = float(np.exp(-1.0 / max(length, 1e-3)))
    out = alpha.copy()
    for y in range(out.shape[0] - 2, -1, -1):
        np.maximum(out[y], out[y + 1] * decay, out=out[y])
    return out
