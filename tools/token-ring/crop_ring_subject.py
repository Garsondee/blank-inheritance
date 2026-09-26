"""Circle-crop assigned character portraits into Dynamic Token Ring subject textures.

Foundry v14's Dynamic Token Ring does NOT crop or mask the subject portrait
for you (confirmed 2026-09-18 against the real v14.367 source,
client/canvas/rendering/shaders/samplers/primary/token-ring.mjs: the subject
is composited straight over the ring/background with plain alpha blending --
wherever the subject is opaque, it fully occludes the ring beneath it). Supply
a plain square photo and its corners cover the ring; the ring only reads
correctly if the corners are transparent. This does that: a top-anchored
square crop, masked to an antialiased circle, resized to a token-appropriate
size.

Driven directly by data/campaign/asset-registry.json rather than a separate
hand-written manifest (unlike tools/stage-assets/, which predates the
registry's use for this purpose) -- an npc/creature's assigned portrait IS
the input, and asset-registry.json is already the one durable record of that
assignment (CLAUDE.md). Only entries with category "character-portraits" and
an assignedTo.kind of "npc" or "creature" are in scope; kid/Frame portraits
aren't assigned yet (data/characters/ is still draft).

The output id is the assignedTo.ref -- an npc/creature's own repo id -- so
core/generators/token-ring.mjs's caller (foundry/sync.mjs) can construct the
Foundry-relative subject path by convention
("modules/blank-inheritance/assets/tokens/<id>.webp") with no lookup table.

Usage:
    python tools/token-ring/crop_ring_subject.py            # crop everything assigned
    python tools/token-ring/crop_ring_subject.py --check    # report, write nothing

Tested by test/token-ring/test_crop_ring_subject.py (Python stdlib unittest,
run separately from `npm test`, exactly like tools/stage-assets's suite).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass

# Final square size of a staged ring subject texture. 512 matches this
# project's one other precedent for a portrait output size
# (core/induction-portrait.mjs's OUTPUT_WIDTH) -- big enough for a close-up
# high-DPI ring, small enough that ~30 of these cost nothing to ship.
OUTPUT_SIZE = 512

# Diameter of the opaque photo circle, as a fraction of OUTPUT_SIZE -- NOT
# 1.0. Two real bugs were found live 2026-09-18, checked directly against a
# running Foundry v14 world, and both had to be fixed, not just one:
#   1. The portrait belongs on prototypeToken.texture.src, never
#      ring.subject.texture (a distinct-subject override, not "the
#      portrait") -- see core/generators/token-ring.mjs's header.
#   2. Even on the right field, an edge-to-edge circle leaves no room for
#      the ring bezel to render at all. There is no general "Foundry
#      auto-shrinks it for you" behavior to rely on here -- the default
#      mystery-man icon's ring only ever looked fine because THAT
#      SPECIFIC artwork already has margin baked in around its own
#      silhouette, not because of anything Foundry does for an arbitrary
#      texture. This fraction is this tool's equivalent of that margin.
# 0.78 confirmed live: large enough that the portrait still reads clearly,
# small enough that the bronze bezel is unambiguously visible around it.
SUBJECT_DIAMETER_FRACTION = 0.78

# How far down the SOURCE image (as a fraction of its own shorter edge) the
# square crop starts, before that square is resized to OUTPUT_SIZE. 0 means
# "start the crop flush with the top of the source image." Every source
# portrait used so far (garsondee's 1950s gouache character art) frames the
# head at or very near the top of the canvas with room below for shoulders/
# chest, so a top-anchored square reliably captures a head-and-shoulders
# crop without needing face detection. Override per item when a particular
# source photo is framed differently -- see plan()'s `topFraction` handling.
DEFAULT_TOP_FRACTION = 0.0

# WebP quality for a lossy RGBA save. Same figure as tools/stage-assets/ for
# the same reason: visually indistinguishable from the source at this size,
# a fraction of the bytes.
WEBP_QUALITY = 86

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEFAULT_REGISTRY = os.path.join(REPO_ROOT, "data", "campaign", "asset-registry.json")
DEFAULT_OUT = os.path.join(REPO_ROOT, "module", "blank-inheritance", "assets", "tokens")

# assignedTo.kind values this tool stages a ring subject for. Anything else
# (a "scene"/"location"/"moment" asset-registry entry) is out of scope.
ELIGIBLE_ASSIGNED_KINDS = {"npc", "creature"}


@dataclass(frozen=True)
class Item:
    """One portrait to circle-crop: where it comes from, what its ring subject id is."""

    stable_id: str
    source: str
    top_fraction: float

    @property
    def out_name(self) -> str:
        return f"{self.stable_id}.webp"


def plan(registry: dict, overrides: dict[str, float] | None = None) -> list[Item]:
    """Every asset-registry portrait assigned to an npc/creature, as ring-subject items.

    A ref can legitimately have MORE THAN ONE character-portrait asset
    assigned to it -- a real case in this project's own registry:
    shucks-mordant has both his primary portrait and a companion hand-detail
    shot, both assigned to the same npc ref. The established naming
    convention (asset-assignment-process) is that the PRIMARY asset's own
    `id` matches the ref exactly; anything else (a `--suffix` variant) is a
    companion/detail shot, not what belongs in a token ring. So: prefer the
    asset whose `id` equals its own ref when more than one candidate exists,
    and only raise when that still leaves a genuine tie -- e.g. two
    differently-sourced assets BOTH claiming the exact-match id, which would
    mean the registry itself is inconsistent.

    Returns a plan rather than doing the work, same reason as
    tools/stage-assets/stage_assets.py's plan(): the id derivation and the
    tie-breaking are testable without touching a filesystem or Pillow.
    `overrides` is a stable_id -> topFraction map for the rare source photo
    that isn't well served by DEFAULT_TOP_FRACTION.
    """
    overrides = overrides or {}
    candidates: dict[str, list[dict]] = {}
    for asset in registry.get("assets", []):
        if asset.get("category") != "character-portraits":
            continue
        assigned = asset.get("assignedTo") or {}
        if assigned.get("kind") not in ELIGIBLE_ASSIGNED_KINDS:
            continue
        ref = assigned.get("ref")
        if not ref:
            continue
        candidates.setdefault(ref, []).append(asset)

    items: list[Item] = []
    for ref, assets in candidates.items():
        if len(assets) > 1:
            exact = [a for a in assets if a.get("id") == ref]
            if len(exact) == 1:
                assets = exact
            else:
                sources = [a["path"] for a in assets]
                raise ValueError(
                    f"{len(assets)} character-portrait assets all claim the ring subject id {ref!r} "
                    f"with no single one whose own id matches it exactly to prefer as primary: {sources} "
                    f"-- resolve the ambiguity in asset-registry.json (name the primary asset's id "
                    f"the same as its assignedTo.ref)."
                )
        items.append(Item(stable_id=ref, source=assets[0]["path"], top_fraction=overrides.get(ref, DEFAULT_TOP_FRACTION)))
    return items


def top_anchored_square_box(width: int, height: int, top_fraction: float) -> tuple[int, int, int, int]:
    """The (left, top, right, bottom) box of a square crop, anchored `top_fraction`
    of the shorter edge down from the top, horizontally centered.

    Pure geometry, no image I/O -- the part of this tool that's cheap to unit test
    exhaustively without Pillow.
    """
    if width <= 0 or height <= 0:
        raise ValueError(f"top_anchored_square_box needs a positive image size, got {width}x{height}.")
    size = min(width, height)
    left = (width - size) // 2
    top = min(round(top_fraction * size), height - size)
    return left, top, left + size, top + size


def crop_ring_subject(
    source_path: str, target_path: str, *, top_fraction: float = DEFAULT_TOP_FRACTION, diameter_fraction: float = SUBJECT_DIAMETER_FRACTION
) -> None:
    """Read one source portrait, write one circle-masked WebP ring subject texture.

    The photo circle is drawn at `diameter_fraction` of the full OUTPUT_SIZE
    canvas, centered, with a transparent margin around it -- NOT edge-to-edge.
    Confirmed live 2026-09-18 (Ingram's own observation, checked directly
    against a running Foundry world): an edge-to-edge circle leaves no room
    for the ring bezel to render at all on a token with an explicit
    `texture.src` portrait. Foundry's default mystery-man icon's ring shows
    fine only because THAT SPECIFIC artwork happens to already have margin
    baked in around its own silhouette -- there is no general "shrink to fit
    the ring" behavior a caller can rely on, so this tool has to do it.
    """
    # Imported lazily so --check and the unit tests' pure-geometry cases run without Pillow.
    from PIL import Image, ImageDraw

    with Image.open(source_path) as source:
        source = source.convert("RGB")
        box = top_anchored_square_box(*source.size, top_fraction)
        subject_size = round(OUTPUT_SIZE * diameter_fraction)
        square = source.resize((subject_size, subject_size), Image.LANCZOS, box=box)

    # Antialiased circular alpha mask, at the subject's own (inset) size --
    # drawn at 4x and downsampled, since PIL's ImageDraw has no built-in AA.
    supersample = 4
    big = subject_size * supersample
    mask_big = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask_big).ellipse((0, 0, big - 1, big - 1), fill=255)
    mask = mask_big.resize((subject_size, subject_size), Image.LANCZOS)

    subject = square.convert("RGBA")
    subject.putalpha(mask)

    # Paste the (smaller) masked circle onto a full-size transparent canvas,
    # centered -- this is what actually reserves the margin the ring bezel
    # renders into.
    canvas_image = Image.new("RGBA", (OUTPUT_SIZE, OUTPUT_SIZE), (0, 0, 0, 0))
    offset = (OUTPUT_SIZE - subject_size) // 2
    canvas_image.paste(subject, (offset, offset), subject)
    canvas_image.save(target_path, "WEBP", quality=WEBP_QUALITY, method=6)


def stage(registry_path: str, out_dir: str, *, check_only: bool = False) -> dict:
    with open(registry_path, encoding="utf-8") as handle:
        registry = json.load(handle)

    items = plan(registry)
    report = {"staged": [], "missing": [], "skipped": [], "outDir": out_dir}

    if not check_only:
        os.makedirs(out_dir, exist_ok=True)

    for item in items:
        source_path = os.path.join(REPO_ROOT, item.source.replace("/", os.sep))
        if not os.path.exists(source_path):
            report["missing"].append({"id": item.stable_id, "source": item.source})
            continue

        target = os.path.join(out_dir, item.out_name)
        if check_only:
            report["skipped"].append({"id": item.stable_id, "target": item.out_name})
            continue

        crop_ring_subject(source_path, target, top_fraction=item.top_fraction)
        report["staged"].append(
            {
                "id": item.stable_id,
                "target": item.out_name,
                "bytes": os.path.getsize(target),
                "sourceBytes": os.path.getsize(source_path),
            }
        )

    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--registry", default=DEFAULT_REGISTRY)
    parser.add_argument("--out", dest="out_dir", default=DEFAULT_OUT)
    parser.add_argument("--check", action="store_true", help="report what would be staged, write nothing")
    args = parser.parse_args(argv)

    report = stage(args.registry, args.out_dir, check_only=args.check)

    for entry in report["staged"]:
        saved = 100 - round(100 * entry["bytes"] / max(1, entry["sourceBytes"]))
        print(f"  {entry['id']:<26} {OUTPUT_SIZE}x{OUTPUT_SIZE}  {entry['bytes'] // 1024:>5}KB  (-{saved}%)")
    for entry in report["skipped"]:
        print(f"  would stage {entry['id']} -> {entry['target']}")
    for entry in report["missing"]:
        print(f"  MISSING {entry['id']}: {entry['source']}", file=sys.stderr)

    print(f"\n{len(report['staged'])} staged, {len(report['missing'])} missing -> {report['outDir']}")
    return 1 if report["missing"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
