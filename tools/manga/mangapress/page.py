"""One page, composed: art in its panels, borders, then everything anybody says or hears, then the page furniture.

Every item in the script is placed by fractions of its own panel (`at` is its centre, `tail` the speaker's mouth), so a
layout change never strands a balloon. An item may carry `ja` or `en` blocks that override its keys in that edition;
English balloons are wider than Japanese ones and sometimes need their own spot.

The `gm` notes in the script are never read here. collect_texts() lists every string this module draws, and a test
holds that no GM note is among them (design/propaganda-manga.md §3.3, rule 1).
"""
import os

from PIL import Image, ImageDraw, ImageFont

from . import art, balloon, fonts, geometry, letter_en, letter_ja, sfx

DRAW_ORDER = ("sfx", "mark", "sign", "caption", "balloon", "aori", "title")


def _edition(item, edition):
    """The item with its edition's overrides applied."""
    merged = {k: v for k, v in item.items() if k not in ("ja", "en")}
    merged.update(item.get(edition, {}))
    return merged


def _text(item, edition):
    t = item.get("text")
    if isinstance(t, dict):
        return t.get(edition)
    return t


def lettered(issue, page, edition):
    """Every string render_page() will draw for this page and edition, in drawing order, each with the font role that
    draws it: `dialogue` (kana and kanji routed to their own faces) or a font alias."""
    out = []
    hashira = page.get("hashira", {}).get(edition)
    if hashira:
        out.append((hashira, "ja-mincho" if edition == "ja" else "en-display"))
    for pid in _reading_order(issue, page):
        for raw in page["panels"].get(pid, {}).get("items", []):
            it = _edition(raw, edition)
            kind, t = it.get("kind"), _text(it, edition)
            if not t:
                continue
            if kind in ("sfx", "mark"):
                out.append((t, "ja-display"))
            elif kind == "sign":
                out.append((t, "ja-gothic"))
            elif edition == "ja":
                role = {"balloon": "ja-gothic" if it.get("shape") == "angular" else "dialogue",
                        "caption": "ja-mincho", "aori": "ja-mincho", "title": "ja-display"}[kind]
                out.append((t, role))
            else:
                role = "en-display" if kind != "balloon" or it.get("shape") == "angular" else "en-dialogue"
                out.append((t, role))
            if edition == "en" and kind in ("sfx", "sign") and it.get("sub"):
                out.append((it["sub"], "en-display"))
    return out


def collect_texts(issue, page, edition):
    """Every string render_page() will draw for this page and edition, in drawing order."""
    return [t for t, _ in lettered(issue, page, edition)]


def _reading_order(issue, page):
    fmt = geometry.Format.from_dict(issue["format"])
    return geometry.panel_rects(fmt, page)[1]


def _font(alias, size):
    path, idx = fonts.path_of(alias)
    return ImageFont.truetype(path, int(size), index=idx)


def _slate(w, h, code, ppm):
    """A panel whose art hasn't arrived: pale grey with its prompt code, so drafts always render whole."""
    img = Image.new("L", (w, h), 218)
    d = ImageDraw.Draw(img)
    d.text((w / 2, h / 2), code, font=_font("en-display", 3.2 * ppm), fill=110, anchor="mm")
    return img


def _art_path(issue, spec, art_root):
    root = art_root or os.path.join(fonts.REPO, issue.get("artDir", ""))
    return os.path.join(root, spec["art"]) if spec.get("art") else None


def _place(rect, frac):
    x0, y0, x1, y1 = rect
    return x0 + frac[0] * (x1 - x0), y0 + frac[1] * (y1 - y0)


def _clamp(center, ex, ey, bounds):
    """Shift a centre so a box reaching ex, ey either side stays inside bounds (the inner frame)."""
    x = min(max(center[0], bounds[0] + ex), bounds[2] - ex)
    y = min(max(center[1], bounds[1] + ey), bounds[3] - ey)
    return x, y


def _draw_item(canvas, it, edition, rect_px, ppm, lett, seed, bounds):
    """Draw one item. Balloons, captions and effects are kept inside `bounds`, the inner frame: they may break a
    panel's border, but nothing anyone says may leave the page's safe area (page-craft-and-print.md §1.1)."""
    kind = it.get("kind")
    text = _text(it, edition)
    cx, cy = _place(rect_px, it["at"])
    em_ja = lett["ja_em_mm"] * ppm * it.get("scale", 1.0)
    size_en = lett["en_size_mm"] * ppm * it.get("scale", 1.0)
    line = max(1, int(round(lett["line_mm"] * ppm)))
    if kind == "balloon":
        if not text:
            return
        shape = it.get("shape", "oval")
        if edition == "ja":
            mask, info = letter_ja.set_vertical(text, em_ja, max_cells=it.get("max_cells"),
                                                kana="ja-gothic" if shape == "angular" else "ja-kana",
                                                kanji="ja-gothic" if shape == "angular" else "ja-kanji")
            pad = lett["pad_em"] * em_ja
        else:
            font = "en-display" if shape == "angular" else "en-dialogue"
            mask, info = letter_en.set_horizontal(text, size_en, font=font, aspect=it.get("aspect", 1.45))
            pad = lett["pad_em"] * size_en
        target = _place(rect_px, it["tail"]) if it.get("tail") else None
        ex, ey = balloon.extent(shape, mask.width, mask.height, pad, info["boxes"])
        cx, cy = _clamp((cx, cy), ex + 2 * line, ey + 2 * line, bounds)
        balloon.draw(canvas, shape, (cx, cy), mask, target=target, line_px=line, pad_px=pad, seed=seed,
                     stop=it.get("stop", 0.6), boxes=info["boxes"])
    elif kind == "caption":
        if not text:
            return
        if edition == "ja":
            mask, _ = letter_ja.set_vertical(text, em_ja * it.get("caption_scale", 0.9), kana="ja-mincho",
                                             kanji="ja-mincho", route=False, max_cells=it.get("max_cells"))
            pad = 0.35 * em_ja
        else:
            mask, _ = letter_en.set_horizontal(text, size_en * 0.9, font="en-display", aspect=it.get("aspect", 3.0))
            pad = 0.4 * size_en
        ex, ey = balloon.extent("caption", mask.width, mask.height, pad)
        cx, cy = _clamp((cx, cy), ex + 2 * line, ey + 2 * line, bounds)
        balloon.draw(canvas, "caption", (cx, cy), mask, line_px=line, pad_px=pad, seed=seed)
    elif kind == "sfx":
        jp = it["text"]["ja"] if isinstance(it.get("text"), dict) else it.get("text")
        sfx.draw(canvas, jp, (cx, cy), it.get("size_mm", 5) * ppm, bounds=bounds,
                 step=tuple(it.get("step", (0.8, 0.0))), grow=it.get("grow", 0.08), angle=it.get("angle", 0.0),
                 wobble=it.get("wobble", 5.0), seed=seed)
        if edition == "en" and it.get("sub"):
            sx, sy = _place(rect_px, it.get("sub_at", it["at"]))
            sfx.subtitle(canvas, it["sub"], (sx, sy), it.get("sub_size_mm", 1.9) * ppm, angle=it.get("sub_angle", 0.0))
    elif kind == "mark":
        sfx.draw(canvas, it["text"], (cx, cy), it.get("size_mm", 5) * ppm, grow=0.0, wobble=0.0,
                 angle=it.get("angle", 0.0), seed=seed)
    elif kind == "sign":
        jp = it["text"]["ja"] if isinstance(it.get("text"), dict) else it.get("text")
        mask, _ = letter_ja.set_vertical(jp, it.get("size_mm", 2.0) * ppm, kana="ja-gothic", kanji="ja-gothic",
                                         route=False, pitch=1.2)
        canvas.paste(0, (int(cx - mask.width / 2), int(cy - mask.height / 2)), mask)
        if edition == "en" and it.get("sub"):
            sx, sy = _place(rect_px, it.get("sub_at", it["at"]))
            sfx.subtitle(canvas, it["sub"], (sx, sy), it.get("sub_size_mm", 1.6) * ppm, angle=it.get("sub_angle", 0.0))
    elif kind == "title":
        if edition == "ja":
            sfx.draw(canvas, text, (cx, cy), it.get("size_mm", 8) * ppm, bounds=bounds, step=(0.98, 0.0), grow=0.0,
                     wobble=4.0, bounce=0.06, seed=seed)
        else:
            sfx.draw(canvas, text, (cx, cy), it.get("size_mm", 7) * ppm, bounds=bounds, grow=0.0, wobble=2.0,
                     bounce=0.03, font="en-display", proportional=True, tracking=1.06, seed=seed)
    elif kind == "aori":
        if edition == "ja":
            mask, _ = letter_ja.set_horizontal(text, it.get("size_mm", 2.4) * ppm, font="ja-mincho")
        else:
            mask, _ = letter_en.set_horizontal(text, it.get("size_mm", 2.3) * ppm, font="en-display", caps=True,
                                               aspect=it.get("aspect", 12.0))
        balloon.draw(canvas, "none", (cx, cy), mask, line_px=max(2, line))
    else:
        raise ValueError(f"unknown item kind {kind!r}")


def _furniture(canvas, fmt, page, edition, ppm):
    trim = [v * ppm for v in geometry.trim_box(fmt)]
    inner = [v * ppm for v in geometry.inner_box(fmt, page["number"])]
    outer_left = geometry.spine_side(fmt, page["number"]) == "right"
    d = ImageDraw.Draw(canvas)
    # the page number, in the bottom outer corner
    nx = trim[0] + 7 * ppm if outer_left else trim[2] - 7 * ppm
    d.text((nx, trim[3] - 7 * ppm), str(page["number"]), font=_font("en-display", 2.6 * ppm), fill=0, anchor="mm")
    # the hashira: the editor's margin copy on the outer edge, clear of the inner frame
    text = page.get("hashira", {}).get(edition)
    if not text:
        return
    margin_c = (trim[0] + inner[0]) / 2 if outer_left else (inner[2] + trim[2]) / 2
    mid_y = (inner[1] + inner[3]) / 2
    if edition == "ja":
        mask, _ = letter_ja.set_vertical(text, 2.3 * ppm, kana="ja-mincho", kanji="ja-mincho", route=False, pitch=1.3)
    else:
        mask, _ = letter_en.set_horizontal(text, 2.1 * ppm, font="en-display", caps=True, aspect=40.0)
        mask = mask.rotate(90, expand=True)
    canvas.paste(0, (int(margin_c - mask.width / 2), int(mid_y - mask.height / 2)), mask)


def render_page(issue, page, edition, tone="flat", dpi=300, ss=2, proof=False, art_root=None):
    """Render one page in one edition. Returns a PIL image at `dpi` (greyscale, or RGB with the proof overlay)."""
    fmt = geometry.Format.from_dict(issue["format"])
    lett = issue["lettering"]
    ppm = geometry.px_per_mm(dpi) * ss
    cw, ch = geometry.canvas_mm(fmt)
    canvas = Image.new("L", (int(round(cw * ppm)), int(round(ch * ppm))), 255)
    rects, order = geometry.panel_rects(fmt, page)
    rects_px = {pid: tuple(v * ppm for v in r) for pid, r in rects.items()}

    for pid in order:
        spec = page["panels"].get(pid, {})
        x0, y0, x1, y1 = rects_px[pid]
        w, h = int(round(x1 - x0)), int(round(y1 - y0))
        path = _art_path(issue, spec, art_root)
        if path and os.path.exists(path):
            g = art.fit(art.load_grey(path), w, h, tuple(spec.get("focus", (0.5, 0.5))), spec.get("zoom", 1.0))
            g = art.tone(g, tone, cell_px=ppm * geometry.MM_PER_INCH / 60.0)
            tile = Image.fromarray((g * 255).round().astype("uint8"))
        else:
            tile = _slate(w, h, os.path.splitext(spec.get("art") or pid)[0], ppm)
        canvas.paste(tile, (int(round(x0)), int(round(y0))))

    d = ImageDraw.Draw(canvas)
    frame = max(1, int(round(fmt.frame * ppm)))
    for pid in order:
        x0, y0, x1, y1 = rects_px[pid]
        d.rectangle((round(x0), round(y0), round(x1) - 1, round(y1) - 1), outline=0, width=frame)

    bounds = tuple(v * ppm for v in geometry.inner_box(fmt, page["number"]))
    seed = 0
    for kind in DRAW_ORDER:
        for pid in order:
            for raw in page["panels"].get(pid, {}).get("items", []):
                it = _edition(raw, edition)
                seed += 1
                if it.get("kind") == kind:
                    _draw_item(canvas, it, edition, rects_px[pid], ppm, lett, seed, bounds)

    _furniture(canvas, fmt, page, edition, ppm)

    if proof:
        canvas = _proof(canvas, fmt, page, rects_px, order, ppm, edition)
    size = (int(round(canvas.width / ss)), int(round(canvas.height / ss)))
    return canvas.resize(size, Image.LANCZOS)


def _proof(canvas, fmt, page, rects_px, order, ppm, edition):
    """The proof view: trim in blue, inner frame in magenta, panels numbered in reading order, item anchors in red."""
    rgb = Image.merge("RGB", [canvas] * 3)
    d = ImageDraw.Draw(rgb)
    w = max(2, int(0.25 * ppm))
    d.rectangle([v * ppm for v in geometry.trim_box(fmt)], outline=(0, 150, 220), width=w)
    d.rectangle([v * ppm for v in geometry.inner_box(fmt, page["number"])], outline=(220, 40, 160), width=w)
    f = _font("en-display", 3.2 * ppm)
    for n, pid in enumerate(order, 1):
        x0, y0, x1, y1 = rects_px[pid]
        cx, cy = x0 + 5 * ppm, y0 + 5 * ppm
        d.ellipse((cx - 3.5 * ppm, cy - 3.5 * ppm, cx + 3.5 * ppm, cy + 3.5 * ppm), fill=(220, 40, 40))
        d.text((cx, cy), str(n), font=f, fill=(255, 255, 255), anchor="mm")
        d.text((x1 - 2 * ppm, y0 + 2 * ppm), pid, font=f, fill=(220, 40, 40), anchor="ra")
        for raw in page["panels"].get(pid, {}).get("items", []):
            it = _edition(raw, edition)
            ax, ay = _place((x0, y0, x1, y1), it["at"])
            r = 1.2 * ppm
            d.line((ax - r, ay, ax + r, ay), fill=(220, 40, 40), width=w)
            d.line((ax, ay - r, ax, ay + r), fill=(220, 40, 40), width=w)
            if it.get("tail"):
                tx, ty = _place((x0, y0, x1, y1), it["tail"])
                d.ellipse((tx - r, ty - r, tx + r, ty + r), outline=(40, 160, 40), width=w)
    return rgb


def lint(issue, page):
    """Problems with a page's words: characters a font cannot draw, in either edition. A missing glyph renders as
    nothing at all (the English margin line lost its star that way), so this runs before every render."""
    problems = []
    for edition in ("ja", "en"):
        for t, role in lettered(issue, page, edition):
            s = letter_ja.plain(t)
            if role == "dialogue":
                checks = (("ja-kanji", "".join(c for c in s if letter_ja.is_kanji(c))),
                          ("ja-kana", "".join(c for c in s if not letter_ja.is_kanji(c) and not c.isascii())))
            else:
                checks = ((role, s.upper() if role.startswith("en") else s),)
            for alias, chars in checks:
                gone = fonts.missing(alias, chars)
                if gone:
                    problems.append(f"{alias} cannot draw {''.join(gone)} (in {t!r})")
    return problems
