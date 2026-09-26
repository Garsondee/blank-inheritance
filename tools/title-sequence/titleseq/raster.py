"""Frame buffers and blending.

A frame is a float32 array (H, W, 3) with values 0..1, in the 4:3 picture area (1440 x 1080). It is only turned
into bytes, and put between the black side bars, at the very end.
"""
import numpy as np

W, H = 1440, 1080           # the visible 4:3 picture
OUT_W, OUT_H = 1920, 1080   # the delivered 16:9 frame

_grid_cache = {}


def canvas(color=(0, 0, 0), w=W, h=H):
    img = np.empty((h, w, 3), np.float32)
    img[:] = np.asarray(color, np.float32) / 255.0
    return img


def rgb01(color):
    """A colour given as 0..255 (the way the source was measured) as 0..1."""
    return np.asarray(color, np.float32) / 255.0


def grid(w=W, h=H):
    """Cached pixel-centre coordinate grids (yy, xx)."""
    key = (w, h)
    if key not in _grid_cache:
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        _grid_cache[key] = (yy, xx)
    return _grid_cache[key]


def polar(cx, cy, w=W, h=H):
    """Distance and angle (radians, 0..2pi) of every pixel from (cx, cy)."""
    yy, xx = grid(w, h)
    dx, dy = xx - cx, yy - cy
    return np.sqrt(dx * dx + dy * dy), np.mod(np.arctan2(dy, dx), 2 * np.pi)


def add(base, light):
    """Additive light (glows, flares). Clipped at the end, not here, so stacked light can bloom."""
    base += light
    return base


def screen(base, layer):
    np.copyto(base, 1.0 - (1.0 - np.clip(base, 0, 1)) * (1.0 - np.clip(layer, 0, 1)))
    return base


def over(base, rgb, alpha):
    """Paint a colour (or an image) over base with coverage alpha (H, W) in 0..1."""
    a = alpha[..., None]
    np.copyto(base, base * (1.0 - a) + np.asarray(rgb, np.float32) * a)
    return base


def mix(base, color, amount):
    """Wash the whole frame toward a flat colour by amount (0..1)."""
    np.copyto(base, base * (1.0 - amount) + rgb01(color) * amount)
    return base


def halftone(rgb, cell=9.0, angle=45.0, ink=(16, 14, 14), paper=(236, 232, 220), softness=0.8):
    """Manga screentone: a picture's darkness as round ink dots on paper, on a grid `cell` pixels apart turned
    `angle` degrees, laid out on the frame so the dots stay one size however the picture is cropped.

    A dot's area follows the darkness around its centre (the picture blurred over about a cell), so a mid-grey is
    half ink, blacks close up solid and whites stay paper. Dots grow area-true to a half-cell radius, then on to
    the cell's corners; their edges are anti-aliased over `softness` pixels."""
    import math

    import cv2
    h, w = rgb.shape[:2]
    lum = np.clip(rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114, 0.0, 1.0).astype(np.float32)
    mean = cv2.GaussianBlur(lum, (0, 0), cell * 0.4)
    yy, xx = grid(w, h)
    th = math.radians(angle)
    c, s = math.cos(th), math.sin(th)
    u, v = c * xx + s * yy, -s * xx + c * yy
    cu, cv_ = (np.floor(u / cell) + 0.5) * cell, (np.floor(v / cell) + 0.5) * cell
    sx, sy = (c * cu - s * cv_).astype(np.float32), (s * cu + c * cv_).astype(np.float32)   # each cell's centre
    dark = np.clip(1.0 - cv2.remap(mean, sx, sy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE), 0.0, 1.0)
    quarter = math.pi / 4                                   # the ink a half-cell dot covers
    r = np.where(dark < quarter, cell * np.sqrt(dark / math.pi),
                 cell * (0.5 + (dark - quarter) / (1.0 - quarter) * (math.sqrt(0.5) - 0.5)))
    a = np.clip((r - np.hypot(u - cu, v - cv_)) / softness + 0.5, 0.0, 1.0)[..., None]
    return rgb01(paper) * (1.0 - a) + rgb01(ink) * a


def to_uint8(img):
    return (np.clip(img, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8)


def pillarbox(picture_u8):
    """Put the 4:3 picture between black side bars in the 1920 x 1080 delivery frame."""
    h, w = picture_u8.shape[:2]
    out = np.zeros((OUT_H, OUT_W, 3), np.uint8)
    x0 = (OUT_W - w) // 2
    y0 = (OUT_H - h) // 2
    out[y0:y0 + h, x0:x0 + w] = picture_u8
    return out
