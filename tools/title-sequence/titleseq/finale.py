"""The finale's own layers (design/opening-titles.md, the fifteenth round): the slow last four bars and the end card.

- door_open: the vault door splits along its seam and slides apart into light. Everything is built in the picture's
  own pixels (the leaves, the white-hot interior, the rays, the floor wash) and then given the camera, so a push in
  carries the whole effect with it.
- scope_hud: a radar scope and a lock-on reticle laid over a wide landscape: the scope's sweep turns, its contacts
  flare as it passes, the reticle closes onto its target and the readout types on, all on the beat.
- stained_wall: the end card's hangar wall, painted in code until the real art comes (a stained concrete wall in dim
  red-brown light, rust and water streaks, panel seams, flaking paint).
- motes: dust or embers drifting through a lit scene, soft and slow, in layers that move at different speeds.

Everything is deterministic for its parameters and time, and draws into the frame in place (see raster.py).
"""
import math

import numpy as np

from . import layers
from .hud import MINT, ORANGE, _clamp01, _mask, _out, fill_poly, line, paint, ring, rounded, strip, text_on
from .raster import H, W, grid, over, polar, rgb01, screen


def _frame_no(p):
    return int(round((p.get("_t", 0.0) + 0.5) * 24))


# ---------- door_open ----------

_door_geom_cache = {}


def _door_geom(iw, ih, cxd, cyd, rd):
    """Pixel coordinates, distance and angle from the door's centre, and the door's anti-aliased disc. Cached."""
    key = (iw, ih, round(cxd, 1), round(cyd, 1), round(rd, 1))
    if key not in _door_geom_cache:
        yy, xx = np.mgrid[0:ih, 0:iw].astype(np.float32)
        xx += 0.5
        yy += 0.5
        dist = np.hypot(xx - cxd, yy - cyd)
        ang = np.arctan2(yy - cyd, xx - cxd)
        disc = np.clip(rd - dist + 0.5, 0.0, 1.0).astype(np.float32)
        _door_geom_cache[key] = (xx, yy, dist, ang, disc)
    return _door_geom_cache[key]


def _shift_x(a, dx):
    """a moved right by dx pixels (negative: left), empty at the far side."""
    import cv2
    return cv2.warpAffine(a, np.float32([[1, 0, dx], [0, 1, 0]]), (a.shape[1], a.shape[0]),
                          flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)


def door_composite(src, o, cxd, cyd, rd, seam, rays=1.0, seed=7):
    """The vault picture with its door `o` open (0 closed, 1 wide), as a float RGB array in the picture's pixels."""
    from . import fx
    import cv2
    if o <= 1e-4:
        return src
    ih, iw = src.shape[:2]
    xx, yy, dist, ang, disc = _door_geom(iw, ih, cxd, cyd, rd)
    comp = src.copy()
    e = o * o * (3 - 2 * o)                                   # the leaves ease out of their latches and into the wall
    g = e * 1.35 * rd                                         # how far each leaf has slid
    # the room fills with light as the door opens
    warm = np.asarray(rgb01((255, 196, 120)), np.float32)
    white = np.asarray(rgb01((255, 248, 232)), np.float32)
    # 1. the light inside the doorway: white-hot at its centre, gold toward the rim, in vertical shafts
    centre = seam
    core = np.exp(-(((xx - centre) / (0.62 * rd)) ** 2 + ((yy - cyd) / (1.05 * rd)) ** 2)).astype(np.float32)
    shafts = 0.86 + 0.24 * np.sin(xx * 0.045 + np.sin(yy * 0.011) * 2.0) * np.sin(xx * 0.017 + 1.3)
    light = (white[None, None] * core[..., None] + warm[None, None] * (1 - core[..., None]) * 0.9)
    light = light * shafts[..., None].astype(np.float32) * (1.0 + 0.9 * e)
    comp = comp * (1 - disc[..., None]) + np.clip(light, 0, 1.4) * disc[..., None]
    # 2. the two leaves, each clipped to the doorway so it slides into the wall
    for sgn, side in ((-1, xx < seam), (1, xx >= seam)):
        leaf_a = _shift_x(disc * side, sgn * g) * disc
        leaf_rgb = _shift_x(src, sgn * g)
        comp = comp * (1 - leaf_a[..., None]) + leaf_rgb * leaf_a[..., None]
    # 3. the hot edges of the leaves, and the light they catch
    xl, xr = seam - g, seam + g
    hot = (np.exp(-((xx - xl) / 3.0) ** 2) + np.exp(-((xx - xr) / 3.0) ** 2)) * disc * min(1.0, e * 6)
    spill_l = np.exp(-np.clip(xl - xx, 0, None) / 55.0) * (xx < xl)
    spill_r = np.exp(-np.clip(xx - xr, 0, None) / 55.0) * (xx > xr)
    spill = (spill_l + spill_r) * disc * 0.55 * e
    comp = comp + (spill[..., None] * warm[None, None]) + hot[..., None] * white[None, None]
    # 4. rays leaving the doorway across the room, and a wash on the floor in front of it
    n = fx.periodic_noise(160, seed, smooth=2)
    ray = fx.sample_periodic(n, ang % (2 * np.pi)).astype(np.float32)
    reach = np.exp(-np.clip(dist - rd * 0.6, 0, None) / (rd * 3.2))
    rr = (np.clip(ray - 0.35, 0, 1) ** 1.3) * reach * (dist > rd * 0.55)
    comp = comp + (rr * 0.85 * e * rays)[..., None] * warm[None, None]
    floor = np.clip((yy - cyd - rd * 0.78) / (rd * 0.5), 0, 1)
    floor_light = np.exp(-(((xx - centre) / (rd * (0.6 + 1.6 * e))) ** 2)) * floor
    comp = comp + (floor_light * 0.7 * e)[..., None] * warm[None, None]
    # 5. a general lift of the room as it floods
    comp = comp + (0.10 * e) * warm[None, None] * (0.4 + 0.6 * np.exp(-dist / (rd * 3.0)))[..., None]
    return np.clip(comp, 0.0, 1.6).astype(np.float32)


def door_open(img, p):
    """The vault door opening into light. `src` is the picture; `open` runs 0 (closed) to 1 (wide open); `circle`
    [cx, cy, r] is the doorway as shares of the picture's width and height (r of its width); `seam` is the x of the
    line the two leaves part along. The picture takes the usual camera (zoom, cx, cy, ...), so a push in carries the
    effect with it."""
    src = layers.load_image(p["src"])
    ih, iw = src.shape[:2]
    cxd, cyd, rd = p.get("circle", (0.53, 0.565, 0.195))
    comp = door_composite(src, _clamp01(float(p.get("open", 0.0))), cxd * iw, cyd * ih, rd * iw,
                          float(p.get("seam", 0.481)) * iw, float(p.get("rays", 1.0)), int(p.get("seed", 7)))
    s, _ = layers.image_transform(iw, ih, p.get("fit", "cover"), p.get("zoom", 1.0))
    layers._place(img, p, comp, None, s, float(p.get("opacity", 1.0)))
    return img


# ---------- scope_hud ----------

def scope_hud(img, p):
    """A radar scope and a lock-on reticle over a picture.

    `scope` {cx, cy, r}: the scope's place; `contacts` [[range share, bearing degrees], ...]; `target` {x, y, w, h}
    (or target_x, target_y, target_w, target_h, which can be keyed so the reticle follows a pan): the reticle's box; `lines`: the readout, typed on one after another from
    `lines_at` seconds, a line every `line_gap`. Time is measured from the clip's own start: the scope and the
    reticle snap on at 0 and the reticle has closed on its target by `lock` seconds."""
    import cv2
    u = max(0.0, p["_t"] - p["_t0"])
    sc = p.get("scope", {"cx": 300, "cy": 330, "r": 190})
    cx, cy, r = float(sc["cx"]), float(sc["cy"]), float(sc["r"])
    lock = float(p.get("lock", 0.22))
    on = _out(u / 0.2)
    n = _frame_no(p)
    rng = np.random.default_rng(n * 7919 + int(p.get("seed", 0)))
    flick = 0.94 + 0.06 * rng.random()
    acc, org, fill, wht = _mask(), _mask(), _mask(), _mask()
    # --- the scope
    if on > 0.01:
        rr = r * (0.55 + 0.45 * on)
        ring(fill, (cx, cy), rr, -1, 150)
        for k in range(1, 5):
            ring(org, (cx, cy), rr * k / 4, 3 if k == 4 else 2, 255 if k == 4 else 120)
        line(org, (cx - rr, cy), (cx + rr, cy), 2, 150)
        line(org, (cx, cy - rr), (cx, cy + rr), 2, 150)
        for deg in range(0, 360, 10):
            a = math.radians(deg)
            L = 22 if deg % 30 == 0 else 11
            line(org, (cx + math.cos(a) * (rr - L), cy + math.sin(a) * (rr - L)),
                 (cx + math.cos(a) * rr, cy + math.sin(a) * rr), 2 if deg % 30 == 0 else 1, 230)
    sweep_deg = (u * float(p.get("sweep", 150.0)) + float(p.get("sweep0", 20.0))) % 360.0
    light = np.zeros((H, W), np.float32)
    if on > 0.5:
        d, th = polar(cx, cy)
        deg = np.degrees(th) % 360.0
        behind = (sweep_deg - deg) % 360.0
        inside = np.clip(rr - d + 0.5, 0, 1)
        light = (0.5 * np.exp(-behind / 38.0) + 1.1 * (behind < 1.6)) * inside
        for rng_share, bearing in p.get("contacts", [(0.62, -40.0), (0.45, 128.0), (0.8, 206.0)]):
            bx = cx + math.cos(math.radians(bearing)) * rng_share * r
            by = cy + math.sin(math.radians(bearing)) * rng_share * r
            since = (sweep_deg - bearing) % 360.0
            bright = 0.35 + 1.0 * math.exp(-since / 70.0)
            ring(wht, (bx, by), 7, -1, min(255, 255 * bright))
            ring(org, (bx, by), 13 + 4 * math.exp(-since / 40.0), 2, min(255, 200 * bright))
    # --- the reticle closing on its target
    tg = p.get("target")
    if "target_x" in p:                                  # keyed on their own, so the reticle can follow a pan
        tg = {"x": p["target_x"], "y": p["target_y"], "w": p["target_w"], "h": p["target_h"]}
    if tg and u >= 0:
        k = _out(u / lock)
        s = 1.0 + 1.5 * (1.0 - k)
        hw, hh = tg["w"] / 2.0 * s, tg["h"] / 2.0 * s
        tx, ty = float(tg["x"]), float(tg["y"])
        L = 0.26 * min(tg["w"], tg["h"]) * (0.7 + 0.3 * k)
        locked = u >= lock
        flash = locked and u < lock + 0.12
        for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            cxr, cyr = tx + sx * hw, ty + sy * hh
            m = wht if flash else acc
            line(m, (cxr, cyr), (cxr - sx * L, cyr), 5)
            line(m, (cxr, cyr), (cxr, cyr - sy * L), 5)
        if k > 0.3:
            line(acc, (tx - 18, ty), (tx + 18, ty), 3)
            line(acc, (tx, ty - 18), (tx, ty + 18), 3)
            for sx, sy in ((0, -1), (0, 1), (-1, 0), (1, 0)):
                line(org, (tx + sx * (hw - 8), ty + sy * (hh - 8)), (tx + sx * (hw + 12 * k), ty + sy * (hh + 12 * k)), 3)
    # --- the readout
    lines = p.get("lines", [])
    t0, gap = float(p.get("lines_at", 0.45)), float(p.get("line_gap", 0.2))
    lx, ly = float(p.get("lines_xy", (cx - r, cy + r + 46))[0]), float(p.get("lines_xy", (cx - r, cy + r + 46))[1])
    y = ly
    for i, text in enumerate(lines):
        kk = (u - (t0 + i * gap)) / 0.03
        if kk > 0:
            head = i == 0
            size = 40 if head else 32
            w_full = strip(text, font="grotesk-cn", size=size, spacing=3).shape[1]
            plate = rounded(lx - 10, y - size * 0.62, w_full + 24, size * 1.3, 8)
            fill_poly(fill, plate, 160)
            text_on(org, text, kk, lx + 2, y, "lm", font="grotesk-cn", size=size, spacing=3)
            y += size * 1.45
    over(img, rgb01((8, 12, 20)), fill.astype(np.float32) / 255.0 * 0.62)
    paint(img, org, ORANGE, flick)
    paint(img, acc, ORANGE, flick)
    paint(img, wht, (255, 246, 226), flick)
    if light.any():
        screen(img, rgb01(MINT)[None, None, :] * (np.clip(light, 0, 1.4) * 0.8 * flick)[..., None])
    from .hud import glow
    glow(img, org, ORANGE, 12.0, 0.5)
    glow(img, wht, (255, 240, 200), 12.0, 0.5)
    return img


# ---------- stained_wall ----------

_walls = {}


def _noise(h, w, sigma, seed):
    import cv2
    rng = np.random.default_rng(int(seed))
    n = rng.normal(0, 1, (max(2, h // 8), max(2, w // 8))).astype(np.float32)
    n = cv2.GaussianBlur(cv2.resize(n, (w, h), interpolation=cv2.INTER_CUBIC), (0, 0), max(0.5, sigma / 8))
    return n / (n.std() + 1e-6)


def _wall_base(seed, color):
    """The wall's fixed painting, as float RGB 0..1: cached."""
    import cv2
    key = (seed, tuple(color))
    if key in _walls:
        return _walls[key]
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    base = np.asarray(rgb01(color), np.float32)
    # poured concrete: faint large patches, fine grain, a little pitting
    shade = (1.0 + 0.055 * _noise(H, W, 300.0, seed) + 0.04 * _noise(H, W, 70.0, seed + 1)
             + 0.045 * _noise(H, W, 9.0, seed + 4) + 0.035 * _noise(H, W, 3.0, seed + 5))
    # each cast panel is a touch lighter or darker than its neighbours
    panel_w, panel_h = 330, 380
    tone = rng.normal(0, 0.035, (H // panel_h + 2, W // panel_w + 2)).astype(np.float32)
    shade = shade + cv2.resize(tone, (W + panel_w * 2, H + panel_h * 2), interpolation=cv2.INTER_NEAREST)[:H, :W]
    # water and rust streaks: columns of unequal darkness, running down from the top, broken by height
    col = cv2.GaussianBlur(rng.normal(0, 1, (1, W)).astype(np.float32), (0, 0), 4.0)[0]
    col = col / (col.std() + 1e-6)
    drip = np.clip(0.35 + 0.65 * _noise(H, W, 150.0, seed + 2), 0, 1)
    streak = np.clip(col[None, :] * 0.5 + 0.1, 0, 1) * drip * np.clip(1.0 - yy / (H * 1.15), 0.1, 1)
    shade = shade * (1.0 - 0.26 * streak)
    rust = np.clip(col[None, :] * 0.55 - 0.35, 0, 1) * drip * np.clip(yy / H, 0, 1) ** 0.7
    wall = base[None, None] * shade[..., None]
    wall = wall + rust[..., None] * np.asarray(rgb01((96, 44, 18)), np.float32)[None, None] * 0.55
    # form-tie holes in a loose grid, and the joints between cast panels: a dark groove with a pale lip
    seams = np.zeros((H, W), np.float32)
    for x in range(panel_w // 2, W + panel_w, panel_w):
        xj = x + int(rng.integers(-10, 11))
        seams += np.exp(-((xx - xj) / 1.8) ** 2) * (0.7 + 0.3 * np.sin(yy * 0.004 + x))
        seams -= 0.35 * np.exp(-((xx - xj - 3.5) / 1.8) ** 2)
    for y in range(panel_h // 2, H + panel_h, panel_h):
        yj = y + int(rng.integers(-8, 9))
        seams += np.exp(-((yy - yj) / 1.8) ** 2) * 0.6
        seams -= 0.3 * np.exp(-((yy - yj - 3.0) / 1.8) ** 2)
    holes = np.zeros((H, W), np.float32)
    for hx in range(panel_w // 2 + panel_w // 4, W, panel_w):
        for hy in range(panel_h // 2 + panel_h // 4, H, panel_h):
            cv2.circle(holes, (hx, hy), 7, 1.0, -1, cv2.LINE_AA)
    holes = cv2.GaussianBlur(holes, (0, 0), 1.6)
    wall = wall * (1.0 - 0.30 * np.clip(seams, 0, 1) - 0.34 * holes)[..., None] + 0.05 * np.clip(-seams, 0, 1)[..., None]
    # flaking paint: pale speckle where the surface is rough
    rough = _noise(H, W, 6.0, seed + 3)
    flake = np.clip((rough - 1.5) * 2.2, 0, 1)
    wall = wall * (1.0 - 0.2 * flake[..., None]) + 0.045 * flake[..., None]
    # light falling in from the upper left, and a deep vignette that holds the eye in the middle
    lit = 1.14 - 0.5 * np.clip(np.hypot((xx - W * 0.25) / (W * 1.0), (yy - H * 0.1) / (H * 1.1)), 0, 1.2)
    vig = 1.0 - 0.6 * np.clip(((xx - W / 2) / (W / 2)) ** 2 * 0.75 + ((yy - H / 2) / (H / 2)) ** 2 * 0.85, 0, 1.4)
    wall = wall * (lit * vig)[..., None]
    _walls[key] = np.clip(wall, 0.0, 1.0).astype(np.float32)
    return _walls[key]


def stained_wall(img, p):
    """A stained concrete wall in dim red-brown light (`color`, `seed`); `brightness` lifts or sinks it."""
    wall = _wall_base(int(p.get("seed", 111)), tuple(p.get("color", (92, 58, 46))))
    img[:] = np.clip(wall * float(p.get("brightness", 1.0)), 0.0, 1.0)
    return img


# ---------- motes ----------

def motes(img, p):
    """Dust or embers drifting through a lit scene: `n` soft points in three layers of depth (the near ones larger,
    brighter and faster), travelling toward `direction` (degrees on screen, 270 = up) at `speed` pixels a second,
    twinkling a little. `color`, `strength`, `seed`."""
    import cv2
    t = p["_t"]
    n = int(p.get("n", 70))
    rng = np.random.default_rng(int(p.get("seed", 5)))
    x0, y0 = rng.random(n) * W, rng.random(n) * H
    depth = rng.random(n)
    size = (1.2 + 5.0 * depth ** 1.5) * float(p.get("size", 1.0))
    speed = float(p.get("speed", 24.0)) * (0.4 + 1.2 * depth)
    th = math.radians(float(p.get("direction", 270.0)))
    sway = np.sin(t * (0.5 + rng.random(n)) + rng.random(n) * 6.28) * 14.0 * (0.3 + depth)
    x = (x0 + math.cos(th) * speed * t + sway * 0.7) % W
    y = (y0 + math.sin(th) * speed * t + sway * 0.3) % H
    tw = 0.65 + 0.35 * np.sin(t * (1.5 + 2.0 * rng.random(n)) + rng.random(n) * 6.28)
    inten = (0.35 + 0.65 * depth) * tw
    layer = np.zeros((H, W), np.float32)
    soft = np.zeros((H, W), np.float32)
    for i in range(n):
        target = soft if size[i] > 3.4 else layer
        cv2.circle(target, (int(round(x[i])), int(round(y[i]))), max(1, int(round(size[i]))), float(inten[i]), -1,
                   cv2.LINE_AA)
    layer = cv2.GaussianBlur(layer, (0, 0), 1.2)
    soft = cv2.GaussianBlur(soft, (0, 0), 4.5)
    total = np.clip(layer * 1.0 + soft * 0.9, 0, 1) * float(p.get("strength", 1.0))
    screen(img, rgb01(p.get("color", (255, 214, 150)))[None, None, :] * total[..., None])
    return img


# ---------- lens_flare ----------

def lens_flare(img, p):
    """A lens flare from a light at (cx, cy), often just inside a corner: a white-hot glint with four arms, an
    anamorphic streak that fades away along its length (`streak` pixels to each side, `thickness` across) and a few
    faint ghost discs strung along the line through the middle of the picture (`ghosts`: [[how far along that line,
    radius, strength], ...]). All warm: violet is kept for the rift. `strength` is the whole flare's brightness."""
    from . import fx
    cx, cy = float(p["cx"]), float(p["cy"])
    k = float(p.get("strength", 1.0))
    if k <= 0.003:
        return img
    color = tuple(p.get("color", (255, 196, 120)))
    yy, xx = grid()
    L, h = float(p.get("streak", 900.0)), float(p.get("thickness", 3.0))
    fade = np.exp(-(np.abs(xx - cx) / L) ** 1.4 * 3.0)
    core = np.exp(-((yy - cy) / h) ** 2) * fade
    halo = np.exp(-((yy - cy) / (h * 9.0)) ** 2) * fade * 0.22
    screen(img, ((core * 0.85 + halo) * k)[..., None] * rgb01(color)[None, None, :])
    fx.glow_dot(img, cx, cy, float(p.get("r_core", 16)), float(p.get("sigma", 70)), (255, 214, 150), k)
    fx.glint(img, cx, cy, float(p.get("arm", 250)), (255, 246, 220), 2.0, k)
    for f, r, a in p.get("ghosts", [[0.55, 60, 0.10], [1.05, 110, 0.07], [1.6, 45, 0.09]]):
        gx, gy = cx + f * (W / 2 - cx), cy + f * (H / 2 - cy)
        d = np.hypot(xx + 0.5 - gx, yy + 0.5 - gy)
        disc = np.clip(1.0 - d / r, 0, 1) ** 0.7 * 0.55 + np.exp(-((d - r) / 4.0) ** 2) * 0.45
        screen(img, (disc * a * k)[..., None] * rgb01((255, 190, 110))[None, None, :])
    return img
