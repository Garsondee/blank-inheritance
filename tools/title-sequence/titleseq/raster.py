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
