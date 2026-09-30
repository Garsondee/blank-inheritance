"""Sound effects, and the title, drawn the manga way: glyph by glyph, black fill, a fat white border, a thin black edge.

Size is loudness, and each glyph is tilted and stepped along the direction of the sound
(design/research/manga/lettering-and-sound-effects.md §3.3). The three layers are drawn across ALL glyphs in turn (every
edge, then every border, then every fill), so neighbouring borders merge into one white shape and no glyph's border can
cover a neighbour's marks. Drawing glyph by glyph instead lost the two dots of ガ in the first spike, and a test holds
this now.

In the English edition the Japanese effect stays in the art and a small English subtitle sits beside it, the way
translated manga keep sound effects intact (§4.4).
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from . import fonts

_FONTS = {}


def _font(alias, size):
    path, idx = fonts.path_of(alias)
    key = (path, idx, int(size))         # by file, not alias, so re-pointing an alias never serves a stale face
    if key not in _FONTS:
        _FONTS[key] = ImageFont.truetype(path, int(size), index=idx)
    return _FONTS[key]


def glyph_layers(text, size_px, step=(0.8, 0.0), grow=0.1, angle=0.0, wobble=5.0, bounce=0.0, font="ja-display",
                 edge=0.17, border=0.12, seed=0, proportional=False, tracking=1.0):
    """Lay out the glyphs and return {"edge": [...], "border": [...], "fill": [...]}, each a list of (mask, (x, y))
    relative to the start point, plus the bounding box of everything. Japanese glyphs are all one width, so they step
    by `step`; Latin letters are not, so `proportional` steps each by its own advance (a fixed step spaced the first
    English title as EMI 'S PROMI SE)."""
    rng = np.random.default_rng(seed)
    layers = {"edge": [], "border": [], "fill": []}
    x = y = 0.0
    boxes = []
    for i, ch in enumerate(text):
        if ch.isspace():
            x += step[0] * size_px * 0.6
            y += step[1] * size_px * 0.6
            continue
        s = int(size_px * (1 + grow * i))
        f = _font(font, s)
        pad = int(s * 0.6)
        rot = angle + rng.uniform(-wobble, wobble)
        dy = bounce * s * (1 if i % 2 else -1)
        for key, stroke in (("edge", edge), ("border", border), ("fill", 0.0)):
            tile = Image.new("L", (s + 2 * pad, s + 2 * pad), 0)
            ImageDraw.Draw(tile).text((tile.width / 2, tile.height / 2), ch, font=f, anchor="mm", fill=255,
                                      stroke_width=int(round(s * stroke)), stroke_fill=255)
            tile = tile.rotate(rot, resample=Image.BICUBIC, fillcolor=0)
            gx = x + f.getlength(ch) / 2 if proportional else x
            pos = (int(gx - tile.width / 2), int(y + dy - tile.height / 2))
            layers[key].append((tile, pos))
            if key == "edge":
                boxes.append((pos[0], pos[1], pos[0] + tile.width, pos[1] + tile.height))
        if proportional:
            x += f.getlength(ch) * tracking
        else:
            x += step[0] * s
        y += step[1] * s
    box = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)) \
        if boxes else (0, 0, 0, 0)
    return layers, box


def draw(canvas, text, center, size_px, bounds=None, **kw):
    """Draw an effect centred on `center` (canvas pixels), shifted if need be to stay inside `bounds` (the inner
    frame: effects may break a panel's border, never the page's safe area). Returns its bounding box on the canvas."""
    layers, (bx0, by0, bx1, by1) = glyph_layers(text, size_px, **kw)
    ox = int(center[0] - (bx0 + bx1) / 2)
    oy = int(center[1] - (by0 + by1) / 2)
    if bounds is not None:
        ox += max(0, int(bounds[0]) - (ox + bx0)) - max(0, (ox + bx1) - int(bounds[2]))
        oy += max(0, int(bounds[1]) - (oy + by0)) - max(0, (oy + by1) - int(bounds[3]))
    for key, ink in (("edge", 0), ("border", 255), ("fill", 0)):
        for mask, (px, py) in layers[key]:
            canvas.paste(ink, (ox + px, oy + py), mask)
    return (ox + bx0, oy + by0, ox + bx1, oy + by1)


def subtitle(canvas, text, center, size_px, font="en-display", halo=0.28, angle=0.0):
    """The English edition's small gloss beside a Japanese effect or sign: capitals with a white halo, turned by
    `angle` degrees (-90 runs it down the page, beside a vertical sign). Returns its box on the canvas."""
    f = _font(font, size_px)
    w = int(f.getlength(text)) + 2 * int(size_px)
    h = int(size_px * 2.2)
    for key, stroke, ink in (("border", halo, 255), ("fill", 0.0, 0)):
        tile = Image.new("L", (w, h), 0)
        ImageDraw.Draw(tile).text((w / 2, h / 2), text, font=f, anchor="mm", fill=255,
                                  stroke_width=int(round(size_px * stroke)), stroke_fill=255)
        if angle:
            tile = tile.rotate(angle, resample=Image.BICUBIC, expand=True, fillcolor=0)
        x0, y0 = int(center[0] - tile.width / 2), int(center[1] - tile.height / 2)
        canvas.paste(ink, (x0, y0), tile)
    return (x0, y0, x0 + tile.width, y0 + tile.height)
