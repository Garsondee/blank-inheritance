"""Japanese lettering, set vertically: columns read right to left, one character per em square.

What it does, and where each rule comes from (design/research/manga/lettering-and-sound-effects.md §2):

- **Authored breaks first.** A slash in the script ends a column. Manga letterers break at phrase boundaries by hand;
  the machine only wraps a column that is still too long.
- **Line-break rules (禁則).** No column may start with a closing mark, a small kana, the long-vowel bar or an
  exclamation; none may end with an opening bracket; a reading (ruby) group and a paired ellipsis never split (W3C
  JLReq §3.1.7–3.1.10).
- **Kana and kanji in different faces** (アンチゴチ): kana in the antique-style face, kanji in the gothic, chosen per
  character.
- **縦中横.** `!!`, `!?`, `?!` and two-digit numbers sit side by side inside one square.
- **Furigana.** `{黒瀬|くろせ}` puts the reading at half size to the right of its characters, centred on them, as a
  youth magazine's balloons carry on every kanji.
- **Vertical forms** come from the fonts themselves, through fonts.vertical_copy().
"""
import re
import unicodedata
from dataclasses import dataclass, field

from PIL import Image, ImageDraw, ImageFont

from . import fonts

# Characters that may not begin a column, and those that may not end one (JLReq §3.1.7-3.1.9).
NO_START = set("、。，．・：；？！!?)）］｝〕〉》」』】〙〗〟’”ー…‥〜～ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ々〻ゝゞヽヾ")
NO_END = set("(（［｛〔〈《「『【〘〖〝‘“")
TCY_PAIRS = {"!!", "!?", "?!", "??"}
RUBY = re.compile(r"\{([^|{}]+)\|([^{}]+)\}")


@dataclass
class Cell:
    text: str                 # one character, or a two-character 縦中横 run
    tcy: bool = False
    group: int = -1           # ruby group id, -1 for none


@dataclass
class Setting:
    columns: list             # list of lists of Cell, rightmost column first
    rubies: dict = field(default_factory=dict)   # group id -> reading


def is_kanji(ch):
    return ch in "々〆〇" or unicodedata.name(ch, "").startswith("CJK UNIFIED IDEOGRAPH")


def _cells(s, group=-1):
    """Split plain text into em squares, joining 縦中横 pairs."""
    s = s.replace("！", "!").replace("？", "?")
    out, i = [], 0
    while i < len(s):
        two = s[i:i + 2]
        if two in TCY_PAIRS or (len(two) == 2 and two.isascii() and two.isdigit()):
            out.append(Cell(two, tcy=True, group=group))
            i += 2
            continue
        ch = s[i]
        if ch == "!":
            ch = "！"
        elif ch == "?":
            ch = "？"
        out.append(Cell(ch, group=group))
        i += 1
    return out


def parse(text):
    """Script text to columns of cells. `/` ends a column; `{base|reading}` marks furigana."""
    setting = Setting(columns=[])
    gid = 0
    for chunk in text.split("/"):
        cells, pos = [], 0
        for m in RUBY.finditer(chunk):
            cells += _cells(chunk[pos:m.start()])
            cells += _cells(m.group(1), group=gid)
            setting.rubies[gid] = m.group(2)
            gid += 1
            pos = m.end()
        cells += _cells(chunk[pos:])
        if cells:
            setting.columns.append(cells)
    return setting


def _may_break_before(cells, i):
    """True if a column may end after cells[i-1] and the next begin with cells[i]."""
    a, b = cells[i - 1], cells[i]
    if not b.tcy and b.text in NO_START:
        return False
    if b.tcy:                                  # an exclamation pair still may not open a column
        return False
    if not a.tcy and a.text in NO_END:
        return False
    if a.group >= 0 and a.group == b.group:    # never split a ruby group
        return False
    if a.text == b.text and a.text in "…‥―":  # paired ellipses and dashes stay together
        return False
    return True


def wrap(setting, max_cells):
    """Break any column longer than `max_cells`, pulling a forbidden starter back into the previous column."""
    if not max_cells:
        return setting
    out = []
    for col in setting.columns:
        rest = list(col)
        while len(rest) > max_cells:
            cut = max_cells
            while cut > 1 and not _may_break_before(rest, cut):
                cut -= 1
            if cut <= 1:                       # nothing legal: overrun rather than break a rule
                cut = max_cells
            out.append(rest[:cut])
            rest = rest[cut:]
        out.append(rest)
    return Setting(columns=out, rubies=setting.rubies)


def plain(text):
    """The words a reader sees, without markup: what coverage checks and tests compare against."""
    return RUBY.sub(lambda m: m.group(1) + m.group(2), text).replace("/", "")


_FONT_CACHE = {}


def _font(path, size):
    key = (path, int(size))
    if key not in _FONT_CACHE:
        _FONT_CACHE[key] = ImageFont.truetype(path, int(size))
    return _FONT_CACHE[key]


def set_vertical(text, em_px, pitch=1.55, ruby_scale=0.5, kana="ja-kana", kanji="ja-kanji", max_cells=None,
                 route=True):
    """Set `text` as a block of vertical columns. Returns (mask, info): an L image with ink at 255, and the block's
    geometry. `pitch` is the distance between column centres in ems (1.55 leaves room for furigana); `route=False` sets
    everything in the kana face (for single-face captions)."""
    setting = wrap(parse(text), max_cells)
    em = int(round(em_px))
    kana_font = _font(fonts.vertical_copy(kana), em)
    kanji_font = _font(fonts.vertical_copy(kanji), em)
    ruby_font = _font(fonts.vertical_copy(kana), max(4, int(round(em * ruby_scale))))
    tcy_path, tcy_idx = fonts.path_of(kanji)
    tcy_font = ImageFont.truetype(tcy_path, int(em * 0.86), index=tcy_idx)
    asc_kana = fonts.metrics(kana)[0]
    asc_kanji = fonts.metrics(kanji)[0]

    has_ruby = bool(setting.rubies)
    ruby_w = int(round(em * (ruby_scale + 0.06))) if has_ruby else 0
    step = int(round(em * pitch))
    ncols = len(setting.columns)
    nmax = max((len(c) for c in setting.columns), default=0)
    width = em + (ncols - 1) * step + ruby_w
    height = nmax * em
    pad = em // 4
    img = Image.new("L", (width + 2 * pad, height + 2 * pad), 0)
    d = ImageDraw.Draw(img)
    boxes = []
    for ci, col in enumerate(setting.columns):
        x0 = pad + width - ruby_w - em - ci * step
        with_ruby = any(c.group >= 0 for c in col)
        # the column's own rectangle (its furigana included), relative to the block's centre
        boxes.append((x0 - img.width / 2, pad - img.height / 2,
                      x0 + em + (ruby_w if with_ruby else 0) - img.width / 2, pad + len(col) * em - img.height / 2))
        spans = {}
        for ri, cell in enumerate(col):
            y0 = pad + ri * em
            if cell.tcy:
                d.text((x0 + em / 2, y0 + em / 2), cell.text, font=tcy_font, fill=255, anchor="mm")
            else:
                use_kanji = route and is_kanji(cell.text)
                f, asc = (kanji_font, asc_kanji) if use_kanji else (kana_font, asc_kana)
                d.text((x0, y0 + asc * em), cell.text, font=f, fill=255, anchor="ls")
            if cell.group >= 0:
                s, e = spans.get(cell.group, (ri, ri))
                spans[cell.group] = (min(s, ri), max(e, ri))
        # furigana: centred on its characters, to the right of the column
        r_em = ruby_font.size
        for gid, (s, e) in spans.items():
            reading = setting.rubies[gid]
            span = (e - s + 1) * em
            ystart = pad + s * em + (span - len(reading) * r_em) / 2
            xr = x0 + em + int(em * 0.04)
            for k, ch in enumerate(reading):
                d.text((xr, ystart + k * r_em + asc_kana * r_em), ch, font=ruby_font, fill=255, anchor="ls")
    info = {"w": img.width, "h": img.height, "columns": ncols, "cells": nmax, "em": em, "boxes": boxes}
    return img, info


def set_horizontal(text, em_px, font="ja-mincho"):
    """Japanese set left to right on one line: the hype line under the title. No furigana (the editor's own line)."""
    f = _font(fonts.path_of(font)[0], int(round(em_px)))
    s = plain(text)
    w = int(f.getlength(s)) + 4
    h = int(em_px * 1.3)
    img = Image.new("L", (w, h), 0)
    ImageDraw.Draw(img).text((2, h / 2), s, font=f, fill=255, anchor="lm")
    return img, {"w": w, "h": h}
