"""Mattes: cutting Ingram's art out of the plain backdrops Midjourney paints it on.

A matte spec is a small dict on an image or video layer, e.g. {"mode": "flat", "tol": [0.06, 0.14]}.

- "flat": the art sits on a flat or gently graded backdrop (the newcomer's grey, the Frame hand's cream). The
  backdrop's colour is fitted as a smooth surface to the image's border, robustly, so a figure touching an edge
  doesn't drag the fit. Each pixel's opacity follows its colour distance from that surface: below tol[0] it is
  backdrop, above tol[1] it is art.
- "dark": black ink on a light ground (the silhouettes, the crane jibs). Opacity follows how much darker than the
  backdrop a pixel is (0 = backdrop, 1 = black), eased between lo and hi, so a cast shadow (about half as dark) can
  be cut away while the ink stays.

Either way the result comes back premultiplied (colour already multiplied by opacity), with the backdrop's own
colour taken back out of every half-covered edge pixel. Pasted onto a new sky, a cut-out then keeps no grey fringe.

Options: "edges" picks which borders to sample for the backdrop (default "tblr"; use e.g. "lb" when the art runs
off the top and right), "keep": "largest" keeps only the biggest shape, "min_area" drops shapes smaller than that
many pixels (grain and dots, while the newcomer's passing gulls stay), "fill_holes" makes enclosed backdrop-coloured
patches solid (true for all of them, or a number: only those up to that many pixels), "erode" pulls the edge in by
whole pixels and "feather" softens it.
"""
import numpy as np

MODES = {"flat", "dark"}
_LUMA = np.array([0.2126, 0.7152, 0.0722], np.float32)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def _basis(u, v):
    return [np.ones_like(u), u, v, u * v, u * u, v * v]


def fit_backdrop(rgb, edges="tblr", border=6):
    """A smooth colour surface (a quadratic in x and y, per channel) fitted to the image's border pixels.

    Two passes: the first rejects samples far from the border's median colour (the art where it touches an edge),
    the second rejects samples far from the first fit, so a real gradient in the backdrop survives."""
    h, w = rgb.shape[:2]
    step = max(1, min(h, w) // 240)
    ys, xs = [], []
    along_x = np.arange(0, w, step)
    along_y = np.arange(0, h, step)
    for e in edges:
        for d in range(0, border, 2):
            if e == "t":
                ys.append(np.full_like(along_x, d)); xs.append(along_x)
            elif e == "b":
                ys.append(np.full_like(along_x, h - 1 - d)); xs.append(along_x)
            elif e == "l":
                ys.append(along_y); xs.append(np.full_like(along_y, d))
            elif e == "r":
                ys.append(along_y); xs.append(np.full_like(along_y, w - 1 - d))
    ys, xs = np.concatenate(ys), np.concatenate(xs)
    col = rgb[ys, xs].astype(np.float64)
    u, v = xs / max(1, w - 1), ys / max(1, h - 1)
    A = np.stack(_basis(u, v), axis=1)
    keep = np.linalg.norm(col - np.median(col, axis=0), axis=1) < 0.2
    if keep.sum() < 12:
        keep[:] = True
    coef = np.linalg.lstsq(A[keep], col[keep], rcond=None)[0]
    resid = np.linalg.norm(A @ coef - col, axis=1)
    keep2 = resid < max(0.05, 2.5 * np.median(resid[keep]))
    if keep2.sum() >= 12:
        coef = np.linalg.lstsq(A[keep2], col[keep2], rcond=None)[0]
    # evaluate the surface separably in float32: c0 + c1 u + c2 v + c3 uv + c4 u^2 + c5 v^2, one channel at a time
    # (stacking six full-size float64 planes cost over half a gigabyte on a large still)
    u = np.linspace(0, 1, w, dtype=np.float32)[None, :]
    v = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    c = coef.astype(np.float32)
    B = np.empty((h, w, 3), np.float32)
    for ch in range(3):
        B[..., ch] = (c[0, ch] + c[1, ch] * u + c[4, ch] * u * u) + (c[2, ch] * v + c[5, ch] * v * v) + c[3, ch] * (v * u)
    return np.clip(B, 0.0, 1.0, out=B)


def _largest_shape(a):
    import cv2
    m = (a > 0.5).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m, connectivity=8)
    if n <= 2:
        return a
    biggest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    region = cv2.dilate((lab == biggest).astype(np.uint8), np.ones((5, 5), np.uint8))
    return a * region


def _drop_specks(a, min_area):
    """Clear every separate shape smaller than min_area pixels (paper grain, compression dots)."""
    import cv2
    m = (a > 0.5).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m, connectivity=8)
    small = stats[:, cv2.CC_STAT_AREA] < min_area
    small[0] = False
    if not small.any():
        return a
    region = cv2.dilate(small[lab].astype(np.uint8), np.ones((3, 3), np.uint8))
    return np.where(region > 0, 0.0, a).astype(np.float32)


def _fill_holes(a, max_area=None):
    """Make enclosed backdrop-coloured patches solid (all of them, or only those of at most max_area pixels)."""
    import cv2
    inv = (a <= 0.5).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(inv, connectivity=4)
    outside = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    fill = np.ones(n, bool)
    fill[outside] = False
    fill[0] = False                                  # label 0 is the art itself
    if max_area is not None:
        fill &= stats[:, cv2.CC_STAT_AREA] <= max_area
    holes = fill[lab] & (inv == 1)
    return np.where(holes, 1.0, a).astype(np.float32)


def alpha_for(rgb, spec, backdrop=None):
    """The matte's opacity (float32, 0..1) and the backdrop it was measured against."""
    import cv2
    mode = spec.get("mode", "flat")
    if mode not in MODES:
        raise ValueError(f"unknown matte mode {mode!r}")
    B = backdrop if backdrop is not None else fit_backdrop(rgb, spec.get("edges", "tblr"))
    if mode == "flat":
        lo, hi = spec.get("tol", (0.06, 0.14))
        diff = rgb - B
        d = np.linalg.norm(diff, axis=2)
        a = smoothstep(lo, hi, d)
        # Distance alone saturates long before a high-contrast edge pixel is fully covered, which would leave a rim
        # of old backdrop. So at the edge, estimate the art's own colour F from the solid interior just inside it,
        # and take the pixel's opacity as how far it sits from the backdrop toward F (C = a*F + (1-a)*B, solved).
        core = cv2.erode((d > hi).astype(np.uint8), np.ones((3, 3), np.uint8)).astype(np.float32)
        weight = cv2.GaussianBlur(core, (0, 0), 2.0)
        F = cv2.GaussianBlur(rgb * core[..., None], (0, 0), 2.0) / np.maximum(weight, 1e-6)[..., None]
        fb = F - B
        proj = np.clip((diff * fb).sum(axis=2) / np.maximum((fb * fb).sum(axis=2), 1e-4), 0.0, 1.0)
        edge = (weight > 0.05) & (d > lo) & (core < 0.5)
        a = np.where(edge, proj, a)
    else:
        darkness = 1.0 - (rgb @ _LUMA) / np.maximum(B @ _LUMA, 1e-3)
        a = smoothstep(spec.get("lo", 0.55), spec.get("hi", 0.85), darkness)
    a = a.astype(np.float32)
    if spec.get("keep") == "largest":
        a = _largest_shape(a)
    if spec.get("min_area"):
        a = _drop_specks(a, int(spec["min_area"]))
    if spec.get("fill_holes"):
        fh = spec["fill_holes"]
        a = _fill_holes(a, None if fh is True else int(fh))
    if spec.get("erode"):
        k = 2 * int(spec["erode"]) + 1
        a = cv2.erode(a, np.ones((k, k), np.uint8))
    if spec.get("feather"):
        a = cv2.GaussianBlur(a, (0, 0), float(spec["feather"]))
    return np.clip(a, 0.0, 1.0), B


def cut_out(rgb, spec, backdrop=None):
    """The art, premultiplied, and its opacity: (rgb * alpha with the backdrop taken out of the edges, alpha).

    An edge pixel is a mix, C = a*F + (1-a)*B, of the art's colour F and the backdrop B; its premultiplied colour
    a*F is therefore C - (1-a)*B, which is what comes back (clipped to a valid 0..a)."""
    a, B = alpha_for(rgb, spec, backdrop)
    prem = rgb - (1.0 - a)[..., None] * B
    prem = np.minimum(np.clip(prem, 0.0, None), a[..., None])
    return prem.astype(np.float32), a
