"""A photosensitivity check for a rendered video, after WCAG 2.2 success criterion 2.3.1 (three flashes or below
threshold), so the reduced-motion opening can be shown to have no flashing rather than just said to.

- A general flash is a pair of opposing changes in relative luminance of at least 0.1 (of 1.0) where the darker
  state is below 0.8.
- A red flash is a pair of opposing changes of at least 20 in (R - G - B) x 320 (linear light) in saturated red
  (red at least 0.8 of R + G + B).
- More than three flashes in any one second fails, where they cover at least a quarter of a 10-degree field of
  view. For a 4:3 picture on a typical screen that is about a quarter of a ninth of the picture, so the picture is
  checked in overlapping windows that size.
"""
import numpy as np

AREA_W, AREA_H = 1 / 6, 1 / 6            # a window: a quarter of a 10-degree field, about a sixth of the picture each way
STRIDE = 0.5                              # windows overlap by half


def linear(rgb):
    """sRGB 0..1 to linear light."""
    return np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)


def window_means(img, fx=AREA_W, fy=AREA_H, stride=STRIDE):
    """Means of `img` (H, W[, C]) over overlapping windows fx by fy of the picture: shape (rows, cols[, C])."""
    h, w = img.shape[:2]
    wh, ww = max(1, int(round(h * fy))), max(1, int(round(w * fx)))
    sy, sx = max(1, int(round(wh * stride))), max(1, int(round(ww * stride)))
    c = np.cumsum(np.cumsum(np.pad(img, ((1, 0), (1, 0)) + ((0, 0),) * (img.ndim - 2)), axis=0), axis=1)
    ys = np.arange(0, h - wh + 1, sy)
    xs = np.arange(0, w - ww + 1, sx)
    y0, x0 = ys[:, None], xs[None, :]
    tot = c[y0 + wh, x0 + ww] - c[y0, x0 + ww] - c[y0 + wh, x0] + c[y0, x0]
    return tot / (wh * ww)


def measures(frame_u8):
    """Per window: mean relative luminance, and mean saturated-red flash value, for one RGB frame (uint8)."""
    rgb = linear(frame_u8.astype(np.float32) / 255.0)
    lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
    total = rgb.sum(axis=2) + 1e-6
    saturated = rgb[..., 0] / total >= 0.8
    red = np.where(saturated, np.clip((rgb[..., 0] - rgb[..., 1] - rgb[..., 2]) * 320.0, 0, None), 0.0)
    return window_means(lum), window_means(red)


def transitions(series, step, dark=None):
    """Frame indices where a series makes a counted transition: a rise or fall of at least `step` from its last
    extreme, alternating direction (with `dark`, the darker end must be below it)."""
    out = []
    lo = hi = float(series[0])
    last = 0
    for n in range(1, len(series)):
        x = float(series[n])
        lo, hi = min(lo, x), max(hi, x)
        if last != 1 and x - lo >= step and (dark is None or lo < dark):
            out.append(n)
            last, lo, hi = 1, x, x
        elif last != -1 and hi - x >= step and (dark is None or x < dark):
            out.append(n)
            last, lo, hi = -1, x, x
    return out


def worst_second(events, fps=24):
    """The most transitions in any one second, and the frame where that second starts."""
    best, at = 0, 0
    j = 0
    for i in range(len(events)):
        while events[i] - events[j] >= fps:
            j += 1
        if i - j + 1 > best:
            best, at = i - j + 1, events[j]
    return best, at


def check(frames, fps=24):
    """Check a sequence of RGB frames (uint8). Returns a report: the most general and red flashes in any second
    in any window, where, and whether it passes (no more than three of either in any second)."""
    lums, reds = [], []
    for f in frames:
        lum, red = measures(f)
        lums.append(lum)
        reds.append(red)
    lums, reds = np.array(lums), np.array(reds)
    report = {"frames": len(lums), "general": (0, 0, None), "red": (0, 0, None)}
    for name, stack, step, dark in (("general", lums, 0.1, 0.8), ("red", reds, 20.0, None)):
        for r in range(stack.shape[1]):
            for c in range(stack.shape[2]):
                n, at = worst_second(transitions(stack[:, r, c], step, dark), fps)
                if n > report[name][0]:
                    report[name] = (n, at, (r, c))
    report["general_flashes"] = report["general"][0] // 2
    report["red_flashes"] = report["red"][0] // 2
    report["passes"] = report["general_flashes"] <= 3 and report["red_flashes"] <= 3
    return report


def read_video(path, ffmpeg, width=192, crop_pillarbox=True):
    """Decode a video's frames small (the 4:3 picture only, when it sits between side bars), as uint8 RGB."""
    import subprocess
    vf = "crop=ih*4/3:ih," if crop_pillarbox else ""
    h = width * 3 // 4
    proc = subprocess.Popen([ffmpeg, "-v", "error", "-i", path, "-vf", f"{vf}scale={width}:{h}:flags=area",
                             "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    size = width * h * 3
    while True:
        buf = proc.stdout.read(size)
        if len(buf) < size:
            break
        yield np.frombuffer(buf, np.uint8).reshape(h, width, 3)
    proc.wait()
