"""The Place pass's eyes -- a captioned two-panel map crop of a scene's location.

    python tools/scene-signoff/place.py candidate-gate
    python tools/scene-signoff/place.py --scene episode-c1e1--the-road-in
    python tools/scene-signoff/place.py --scene episode-c1e2--the-board --candidates

Ingram's requirement, 2026-09-22: every scene needs a real location on the world
map, and before one is settled she wants to see "a screenshot of its location
with context so that I can see it and help decide if it's the right call".
Two panels, because "with context" means two different questions:

  SITE       the footprint and the block around it -- is this the right building?
  SITUATION  about three kilometres across -- is this the right part of the city?

A single zoom answers one of those and hides the other. A tight crop of the
wrong district looks perfectly reasonable.

Reuses tools/gazetteer/crop.py's window maths rather than reimplementing it, and
reads the same 12400x12400 painted sheet. That file is gitignored, so this skips
loudly (a clear, catchable error) rather than producing a blank image, per the
house rule the gazetteer's own map-touching modules follow.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.abspath(os.path.join(_HERE, "..", ".."))
sys.path.insert(0, os.path.join(_REPO_ROOT, "tools", "gazetteer"))

import crop as crop_mod  # noqa: E402  -- path set above on purpose

DATA = os.path.join(_REPO_ROOT, "data")
LOCATIONS = os.path.join(DATA, "locations")
SCENE_SET = os.path.join(DATA, "campaign", "scene-set.json")

#: The wide panel's window, in image px (= metres on this sheet). Roughly the
#: walk-across-a-district scale: enough to see the coast, the main roads and
#: which side of the base something is on.
SITUATION_PX = 3000

#: Each panel's rendered size. Two of these sit side by side, so the finished
#: image is 1600 wide plus the caption bar.
PANEL_PX = 800
CAPTION_PX = 96

VERMILION = (209, 64, 42)
INK = (24, 22, 20)
PAPER = (238, 233, 224)


class PlaceError(RuntimeError):
    """The crop cannot be produced as asked."""


def load_json(path):
    with open(path, encoding="utf8") as handle:
        return json.load(handle)


def load_location(location_id):
    path = os.path.join(LOCATIONS, "%s.json" % location_id)
    if not os.path.exists(path):
        raise PlaceError("no location file for %r" % location_id)
    return load_json(path)


def scene_set_index():
    """briefRef -> scene-set entry. The scene->map link lives here, not on the
    brief -- the same place play-sequence.mjs reads it from."""
    out = {}
    for entry in load_json(SCENE_SET).get("scenes", []):
        if entry.get("briefRef"):
            out[entry["briefRef"]] = entry
    return out


def item_for_location(location):
    """Recast a promoted location into the draft-item shape crop.py accepts.
    A location stores its footprint in `derived.imagePx` (rings of [x, y] in
    sheet pixels); a draft item stores one `ringPx`. Same numbers."""
    derived = location.get("derived") or {}
    rings = derived.get("imagePx") or []
    if rings and rings[0] and len(rings[0]) >= 3:
        return {"geometry": {"kind": "polygon", "ringPx": rings[0]}}
    centroid = derived.get("centroidPx")
    if centroid:
        return {"geometry": {"kind": "point", "pointPx": centroid}}
    raise PlaceError("location %r has no usable geometry to crop around" % location.get("id"))


def _font(size):
    from PIL import ImageFont

    for candidate in (
        "C:/Windows/Fonts/consola.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    ):
        if os.path.exists(candidate):
            try:
                return ImageFont.truetype(candidate, size)
            except OSError:
                continue
    return ImageFont.load_default()


def render_panels(location, *, image_path=None):
    """(site, situation) -- two PIL Images of the same place at two zooms."""
    from PIL import Image

    item = item_for_location(location)
    bbox = crop_mod.bounds_for_item(item)

    site = crop_mod.render(item, image_path=image_path, output_px=PANEL_PX)

    cx, cy = (bbox[0] + bbox[2]) / 2.0, (bbox[1] + bbox[3]) / 2.0
    # Falls back to the site panel only if the wide window lands entirely off
    # the sheet, which would mean the location's own coordinates are wrong.
    situation = _wide_panel(item, cx, cy, image_path=image_path) or site

    assert isinstance(site, Image.Image)
    return site, situation


def _wide_panel(item, cx, cy, *, image_path=None):
    """A SITUATION_PX-across window centred on (cx, cy), with the footprint
    marked. Drawn directly rather than through crop.py because crop.py clamps a
    small footprint's window down to roughly one block -- which is the point of
    the site panel and the opposite of the point of this one."""
    from PIL import Image, ImageDraw

    path = image_path or crop_mod.DEFAULT_IMAGE
    if not os.path.exists(path):
        raise PlaceError("no painted map at %s -- it is gitignored and a fresh clone does not have it" % path)

    half = SITUATION_PX / 2.0
    Image.MAX_IMAGE_PIXELS = None
    with Image.open(path) as full:
        width, height = full.size
        x0, y0 = max(0, int(cx - half)), max(0, int(cy - half))
        x1, y1 = min(width, int(cx + half)), min(height, int(cy + half))
        if x1 <= x0 or y1 <= y0:
            return None
        cropped = full.crop((x0, y0, x1, y1)).convert("RGB")

    scale = PANEL_PX / max(cropped.size)
    panel = cropped.resize(
        (max(1, round(cropped.size[0] * scale)), max(1, round(cropped.size[1] * scale))),
        Image.LANCZOS,
    )

    draw = ImageDraw.Draw(panel)
    sx, sy = (cx - x0) * scale, (cy - y0) * scale
    # A ring plus crosshairs: at this zoom a building footprint is a few pixels
    # across, so the mark has to be findable rather than accurate.
    draw.ellipse([sx - 14, sy - 14, sx + 14, sy + 14], outline=VERMILION, width=3)
    for dx, dy in ((-26, 0), (26, 0), (0, -26), (0, 26)):
        draw.line([sx + dx * 0.55, sy + dy * 0.55, sx + dx, sy + dy], fill=VERMILION, width=3)
    return panel


def compose(location, site, situation, *, scene_title=None):
    """The finished sheet: two panels side by side over one caption bar."""
    from PIL import Image, ImageDraw

    width = site.width + situation.width
    sheet = Image.new("RGB", (width, max(site.height, situation.height) + CAPTION_PX), PAPER)
    sheet.paste(site, (0, 0))
    sheet.paste(situation, (site.width, 0))

    draw = ImageDraw.Draw(sheet)
    draw.line([site.width, 0, site.width, site.height], fill=PAPER, width=4)

    label = _font(18)
    small = _font(15)

    def plate(x, y, text):
        """Vermilion on a paper plate. The first version wrote the labels
        straight onto the map and both landed on dark ground, which is a
        legibility fault in the one image whose entire job is to be looked at."""
        box = draw.textbbox((x, y), text, font=label)
        draw.rectangle([box[0] - 6, box[1] - 4, box[2] + 6, box[3] + 4], fill=PAPER)
        draw.text((x, y), text, font=label, fill=VERMILION)

    plate(12, 10, "SITE")
    plate(site.width + 12, 10, "SITUATION  (%d m across)" % SITUATION_PX)

    derived = location.get("derived") or {}
    y = max(site.height, situation.height) + 10
    name = location.get("name") or location.get("id")
    heading = "%s  (%s)" % (name, location.get("id"))
    if scene_title:
        heading = "%s   <-   %s" % (heading, scene_title)
    draw.text((14, y), heading, font=label, fill=INK)

    facts = [
        "grid %s" % (derived.get("ref") or "?"),
        "%s m2" % (("%.0f" % derived["areaM2"]) if derived.get("areaM2") else "?"),
        "tier %s" % (location.get("tier") or "?"),
        "depth %s" % (location.get("depth") or "unset"),
        "rank %s" % (location.get("rank") if location.get("rank") is not None else "unranked"),
        "within %s" % (derived.get("withinRegionRef") or "?"),
        "status %s" % ((location.get("authoring") or {}).get("status") or "?"),
    ]
    draw.text((14, y + 28), "   ".join(facts), font=small, fill=INK)
    neighbours = derived.get("neighbourRefs") or []
    if neighbours:
        draw.text((14, y + 52), "neighbours: %s" % ", ".join(neighbours[:6]), font=small, fill=INK)
    return sheet


def candidates_for(brief_id, *, limit=12):
    """Locations worth proposing for a scene that has none, ranked by how many
    words the brief's own `where`/title share with the location's name, region
    and lore. Deliberately a shortlist for a human to choose from, not a guess
    presented as an answer -- a guess recorded as a fact is how a map stops
    being trustworthy (data/schema/scene-set.schema.json)."""
    brief_path = os.path.join(DATA, "scene-briefs", "%s.json" % brief_id)
    if not os.path.exists(brief_path):
        raise PlaceError("no brief %r" % brief_id)
    brief = load_json(brief_path)

    text = " ".join(
        str(x or "")
        for x in (
            brief.get("title"),
            (brief.get("intro") or {}).get("where"),
            (brief.get("intro") or {}).get("firstThing"),
            (brief.get("intro") or {}).get("landmark"),
            brief.get("summary"),
        )
    ).lower()
    stop = {"the", "and", "a", "an", "of", "in", "on", "at", "to", "for", "with", "is", "it", "its", "their", "they"}
    words = {w.strip(".,;:!?\"'()") for w in text.split() if len(w) > 3} - stop

    scored = []
    for entry in sorted(os.listdir(LOCATIONS)):
        if not entry.endswith(".json"):
            continue
        loc = load_json(os.path.join(LOCATIONS, entry))
        haystack = " ".join(
            str(x or "")
            for x in (
                loc.get("name"),
                loc.get("kind"),
                (loc.get("lore") or {}).get("summary"),
                (loc.get("derived") or {}).get("withinRegionRef"),
                " ".join(loc.get("tags") or []),
            )
        ).lower()
        hits = sum(1 for w in words if w in haystack)
        if hits:
            scored.append((hits, loc))
    scored.sort(key=lambda pair: (-pair[0], pair[1].get("id")))
    return [(hits, loc) for hits, loc in scored[:limit]]


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("location", nargs="?", help="a location id from data/locations/")
    parser.add_argument("--scene", help="a scene brief id; resolves its location through scene-set.json")
    parser.add_argument("--candidates", action="store_true", help="list proposable locations instead of rendering")
    parser.add_argument("--out", help="where to write the PNG (default: alongside a temp dir)")
    parser.add_argument("--image", help="override the painted map path")
    opts = parser.parse_args(argv)

    scene_title = None
    location_id = opts.location

    if opts.scene:
        entry = scene_set_index().get(opts.scene)
        if entry is None:
            raise PlaceError("no scene-set entry with briefRef %r" % opts.scene)
        scene_title = entry.get("name")
        location_id = entry.get("locationRef")
        if opts.candidates or not location_id:
            if not location_id:
                print("%s has NO locationRef -- not finished until it has one.\n" % opts.scene)
            print("Candidate locations, best word-overlap first:")
            for hits, loc in candidates_for(opts.scene):
                derived = loc.get("derived") or {}
                print(
                    "  %2d  %-34s %-22s grid %-7s %s"
                    % (hits, loc.get("id"), (loc.get("name") or "")[:22], derived.get("ref") or "?",
                       (derived.get("withinRegionRef") or ""))
                )
            print("\nNothing here is chosen. Render one with: python tools/scene-signoff/place.py <id>")
            return 0

    if not location_id:
        parser.error("give a location id or --scene")

    location = load_location(location_id)
    site, situation = render_panels(location, image_path=opts.image)
    sheet = compose(location, site, situation, scene_title=scene_title)

    out = opts.out
    if not out:
        base = os.environ.get("TMP") or os.environ.get("TMPDIR") or "."
        out_dir = os.path.join(base, "signoff-place")
        os.makedirs(out_dir, exist_ok=True)
        out = os.path.join(out_dir, "%s.png" % location_id)
    sheet.save(out)
    print(out)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except PlaceError as exc:
        print("place: %s" % exc, file=sys.stderr)
        sys.exit(1)
    except crop_mod.CropError as exc:
        print("place: %s" % exc, file=sys.stderr)
        sys.exit(1)
