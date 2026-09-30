"""English lettering: capitals, centred, in the letterer's lozenge.

A comic letterer breaks lines so the block fills an oval: short lines at the top and bottom, the longest in the
middle, never hyphenated (design/research/manga/lettering-and-sound-effects.md §4.2). This does the same by trying
every line count and, for each, finding the breaks whose widths best match the chords of an ellipse (a small dynamic
programme, the Knuth-Plass idea cut down to one balloon; design/research/manga/tooling-landscape.md §4). A `/` in the
script forces a break.
"""
import math

from PIL import Image, ImageDraw, ImageFont

from . import fonts

_FONTS = {}


def _font(alias, size):
    path, idx = fonts.path_of(alias)
    key = (path, idx, int(size))         # by file, not alias, so re-pointing an alias never serves a stale face
    if key not in _FONTS:
        _FONTS[key] = ImageFont.truetype(path, int(size), index=idx)
    return _FONTS[key]


def _chords(n):
    """Relative line widths for n lines laid in an ellipse: widest in the middle, never zero at the ends."""
    c = n / (n + 1.0)
    return [math.sqrt(max(0.05, 1 - ((2 * (k + 0.5) / n - 1) * c) ** 2)) for k in range(n)]


def _best_breaks(widths, space, targets):
    """Split words (by width) into len(targets) lines whose widths are closest to the targets. Returns index lists."""
    m, n = len(widths), len(targets)
    inf = float("inf")
    cost = [[inf] * (m + 1) for _ in range(n + 1)]
    back = [[0] * (m + 1) for _ in range(n + 1)]
    cost[0][0] = 0.0
    for k in range(1, n + 1):
        for j in range(k, m + 1):
            for i in range(k - 1, j):
                if cost[k - 1][i] == inf:
                    continue
                w = sum(widths[i:j]) + space * (j - i - 1)
                c = cost[k - 1][i] + (targets[k - 1] - w) ** 2
                if c < cost[k][j]:
                    cost[k][j], back[k][j] = c, i
    if cost[n][m] == inf:
        return None, inf
    lines, j = [], m
    for k in range(n, 0, -1):
        i = back[k][j]
        lines.append((i, j))
        j = i
    return lines[::-1], cost[n][m]


def lozenge(words, measure, space, line_h, aspect=1.45, max_lines=7):
    """Choose the line count and breaks that best fill an ellipse about `aspect` times as wide as it is tall."""
    widths = [measure(w) for w in words]
    total = sum(widths) + space * (len(words) - 1)
    best = None
    for n in range(1, min(max_lines, len(words)) + 1):
        chords = _chords(n)
        widest = total / sum(chords)
        if widest < max(widths):
            widest = max(widths)
        targets = [widest * c for c in chords]
        lines, fit = _best_breaks(widths, space, targets)
        if lines is None:
            continue
        shape = fit / (widest ** 2)
        ratio = widest / (n * line_h)
        score = shape + 0.35 * (math.log(ratio / aspect)) ** 2
        if best is None or score < best[0]:
            best = (score, [" ".join(words[i:j]) for i, j in lines])
    return best[1] if best else [" ".join(words)]


def set_horizontal(text, size_px, font="en-dialogue", caps=True, aspect=1.45, line_gap=1.08):
    """Set an English line for a balloon. Returns (mask, info) with ink at 255."""
    s = text.upper() if caps else text
    f = _font(font, size_px)
    line_h = size_px * line_gap
    if "/" in s:
        lines = [part.strip() for part in s.split("/") if part.strip()]
    else:
        lines = lozenge(s.split(), f.getlength, f.getlength(" "), line_h, aspect=aspect)
    w = int(max(f.getlength(l) for l in lines)) + 4
    h = int(line_h * len(lines) + size_px * 0.15)
    img = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(img)
    boxes = []
    for i, l in enumerate(lines):
        d.text((w / 2, (i + 0.5) * line_h + size_px * 0.05), l, font=f, fill=255, anchor="mm")
        lw = f.getlength(l)
        # each line's own rectangle, relative to the block's centre, so a balloon can hug the lozenge
        cap_top = (i + 0.5) * line_h + size_px * 0.05 - size_px * 0.42
        boxes.append((-lw / 2, cap_top - h / 2, lw / 2, cap_top + size_px * 0.84 - h / 2))
    return img, {"w": w, "h": h, "lines": lines, "boxes": boxes}
