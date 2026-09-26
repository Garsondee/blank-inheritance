"""Tile character portraits into a single labelled contact sheet.

Two problems, one tool.

The first is casting. There are dozens of candidate portraits sitting in
artwork/in-tray/character-portraits/ and their filenames are generated prompt
fragments, which are not a reliable description of what is actually in the
picture -- a file named "NERV_administrator" turned out to be a junior
technician in a lab coat, and "sea-fort" turned out to be a clifftop gun
emplacement rather than the harbour wall it was earmarked for. Every cast
therefore has to be made by looking at the image. Opening them one at a time
is slow; a numbered grid lets a whole tray be triaged at once and only the
real contenders opened full size.

The second is review. Once portraits are assigned, Ingram needs to see who was
cast as whom, together, to reject in bulk rather than one at a time. That is
the same grid with the NPC id under each face instead of an index.

    python tools/casting/contact_sheet.py --intray           # portrait candidates, numbered
    python tools/casting/contact_sheet.py --scenes --page 1  # backdrop candidates, numbered
    python tools/casting/contact_sheet.py --cast             # assignments, named

All three write into artwork/ by default; pass --out to put the sheet
somewhere else. A tray bigger than one readable sheet is paged with --page. Nothing here moves, modifies or deletes any artwork: it only
reads. Assignment stays a deliberate act in asset-registry.json.

Tested by test/casting/test_contact_sheet.py (Python stdlib unittest, run
separately from `npm test`, exactly like tools/token-ring's suite).
"""

from __future__ import annotations

import argparse
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
REGISTRY = os.path.join(ROOT, "data", "campaign", "asset-registry.json")
INTRAY = os.path.join(ROOT, "artwork", "in-tray", "character-portraits")
SCENE_INTRAY = os.path.join(ROOT, "artwork", "in-tray", "scenes")

IMAGE_SUFFIXES = (".png", ".jpg", ".jpeg", ".webp")

# Paper-register colours, matching design/visual-identity.md's light surfaces
# rather than inventing a palette: the sheet is meant to be read like a
# printed proof sheet, not like a UI.
PAPER = (232, 228, 218)
INK = (38, 36, 33)
RULE = (170, 164, 152)


def is_image(name: str) -> bool:
    return name.lower().endswith(IMAGE_SUFFIXES)


def collect_intray(intray: str = INTRAY, registry: str = REGISTRY) -> list[tuple[str, str]]:
    """Every unassigned candidate portrait in the in-tray, as (path, label).

    Files directly in the in-tray only -- the subdirectories (aliens/,
    enemies/, environment/, mitflits/, vehicles/) are separate trays with
    their own subjects and are not candidates for a human NPC's face.

    A file is skipped if the registry already points at it, so a sheet never
    offers something that has already been cast.
    """
    if not os.path.isdir(intray):
        return []
    already = set()
    if os.path.exists(registry):
        with open(registry, "r", encoding="utf-8") as handle:
            data = json.load(handle)
        for asset in data.get("assets", []):
            source = asset.get("sourceFilename")
            if source:
                already.add(source)
    names = sorted(n for n in os.listdir(intray) if is_image(n))
    return [(os.path.join(intray, n), n) for n in names if n not in already]


def collect_cast(registry: str = REGISTRY, root: str = ROOT) -> list[tuple[str, str]]:
    """Every assigned character portrait, as (path, label), sorted by label.

    Driven by asset-registry.json for the same reason crop_ring_subject.py is:
    the registry is the one durable record of who a picture belongs to.

    The label is the asset's own id rather than the npc ref, because one
    person can legitimately have several portraits -- Manako has three, one
    per reveal -- and a sheet that labelled all three "manako" would be no
    use for reviewing them.
    """
    if not os.path.exists(registry):
        return []
    with open(registry, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    out = []
    for asset in data.get("assets", []):
        if asset.get("category") != "character-portraits":
            continue
        assigned = asset.get("assignedTo") or {}
        if assigned.get("kind") not in ("npc", "creature"):
            continue
        path = os.path.join(root, asset.get("path", "").replace("/", os.sep))
        if os.path.exists(path):
            out.append((path, asset.get("id") or assigned.get("ref", "?")))
    out.sort(key=lambda pair: pair[1])
    return out


def page_of(entries: list, page: int, per_page: int) -> list:
    """One page of entries, 1-indexed.

    A tray of 150 backdrops tiled in one column-of-six sheet is 25 rows tall,
    which is unreadable at any sensible thumbnail size. Paging keeps a sheet to
    something that can actually be looked at. Page 0 or a per_page of 0 means
    'all of it' rather than 'none of it', so a caller that does not care about
    paging can leave both alone.
    """
    if per_page <= 0 or page <= 0:
        return list(entries)
    start = (page - 1) * per_page
    return list(entries[start:start + per_page])


def _font(size: int):
    for candidate in ("arial.ttf", "DejaVuSans.ttf", "LiberationSans-Regular.ttf"):
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _fit(image: Image.Image, cell: int) -> Image.Image:
    """Top-anchored square crop, then resize -- a portrait's subject is its face."""
    width, height = image.size
    side = min(width, height)
    left = (width - side) // 2
    top = 0 if height > width else (height - side) // 2
    return image.crop((left, top, left + side, top + side)).resize((cell, cell), Image.LANCZOS)


def build_sheet(entries: list[tuple[str, str]], cols: int = 6, cell: int = 220, title: str = "") -> Image.Image:
    """Tile (path, label) pairs into one labelled sheet.

    Pure given its inputs: it reads the image files and returns an Image,
    writing nothing. Raises ValueError on an empty list rather than producing
    a zero-sized image that a caller would then have to special-case.
    """
    if not entries:
        raise ValueError("nothing to tile")
    cols = max(1, cols)
    band = 34
    pad = 12
    header = 46 if title else pad
    rows = (len(entries) + cols - 1) // cols
    width = pad + cols * (cell + pad)
    height = header + rows * (cell + band + pad)

    sheet = Image.new("RGB", (width, height), PAPER)
    draw = ImageDraw.Draw(sheet)
    label_font = _font(15)
    if title:
        draw.text((pad, 14), title, fill=INK, font=_font(20))

    for index, (path, label) in enumerate(entries):
        col = index % cols
        row = index // cols
        x = pad + col * (cell + pad)
        y = header + row * (cell + band + pad)
        try:
            with Image.open(path) as source:
                sheet.paste(_fit(source.convert("RGB"), cell), (x, y))
        except OSError:
            # An unreadable file is worth seeing as a hole in the sheet, not
            # worth aborting a sheet of fifty others over.
            draw.rectangle([x, y, x + cell, y + cell], fill=RULE)
        draw.rectangle([x, y, x + cell, y + cell], outline=RULE)
        text = label if len(label) <= 30 else label[:29] + "…"
        draw.text((x + 2, y + cell + 8), text, fill=INK, font=label_font)

    return sheet


def _scratchpad() -> str:
    override = os.environ.get("BI_SCRATCHPAD")
    if override:
        return override
    return os.path.join(ROOT, "artwork")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--intray", action="store_true", help="tile unassigned portrait candidates, numbered")
    parser.add_argument("--scenes", action="store_true", help="tile unassigned backdrop candidates, numbered")
    parser.add_argument("--cast", action="store_true", help="tile assigned portraits, named")
    parser.add_argument("--cols", type=int, default=6)
    parser.add_argument("--cell", type=int, default=220)
    parser.add_argument("--page", type=int, default=0, help="1-indexed page; 0 means the whole tray")
    parser.add_argument("--per-page", dest="per_page", type=int, default=48)
    parser.add_argument("--out", default=None)
    args = parser.parse_args(argv)

    chosen = [name for name, on in (("intray", args.intray), ("scenes", args.scenes), ("cast", args.cast)) if on]
    if len(chosen) != 1:
        parser.error("choose exactly one of --intray, --scenes or --cast")
    mode = chosen[0]

    if mode == "cast":
        found = collect_cast()
        numbered = False
        default_name = "contact-sheet-cast.png"
        what = "assigned portraits"
    else:
        tray = INTRAY if mode == "intray" else SCENE_INTRAY
        found = collect_intray(tray)
        numbered = True
        default_name = f"contact-sheet-{mode}.png"
        what = "unassigned candidates"

    if not found:
        print("nothing to tile")
        return 1

    if numbered:
        found = [(path, f"{i + 1}. {name}") for i, (path, name) in enumerate(found)]
    shown = page_of(found, args.page, args.per_page)
    where = f" (page {args.page} of {(len(found) + args.per_page - 1) // args.per_page})" if args.page else ""
    title = f"{len(found)} {what}{where}"

    out = args.out or os.path.join(_scratchpad(), default_name)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    build_sheet(shown, cols=args.cols, cell=args.cell, title=title).save(out)
    print(f"{len(shown)} of {len(found)} -> {out}")
    for _, label in shown:
        print(f"  {label}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
