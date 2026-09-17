"""Derive the stage's portraits from the registered character artwork.

    python tools/assets/derive-stage-portraits.py [--force]

The theatre-of-the-mind stage looks a portrait up by the cast member's own id
(`modules/blank-inheritance/assets/stage/<id>.webp`). The masters live in
`artwork/character-portraits/` and are registered in
`data/campaign/asset-registry.json`; this turns the registered ones into the
WebP derivatives the module actually serves.

Both ends are gitignored bulk art (`artwork/` and `assets/stage/`), which is
why this script exists at all: without it the derivation is a thing somebody
did once on one machine, and a fresh clone stages every NPC as a nameplate
over an empty frame. Found exactly that way, 2026-09-17.

Only the PRIMARY portrait per NPC is derived -- an entry whose id matches the
npc it is assigned to. Detail shots (`shucks-mordant--hand-detail`) are
deliberately skipped: the stage wants a face, not a close-up of a hand.
"""

import argparse
import json
import os
import sys

try:
    from PIL import Image
except ImportError:  # pragma: no cover - a plain, actionable failure
    sys.exit("This needs Pillow: python -m pip install Pillow")

Image.MAX_IMAGE_PIXELS = None

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REGISTRY = os.path.join(REPO, "data", "campaign", "asset-registry.json")
OUT_DIR = os.path.join(REPO, "module", "blank-inheritance", "assets", "stage")
QUALITY = 88


def primary_npc_portraits(registry):
    """Registry entries that are an NPC's own main portrait."""
    for entry in registry.get("assets", []):
        if entry.get("kind") != "image" or entry.get("category") != "character-portraits":
            continue
        assigned = entry.get("assignedTo") or {}
        if assigned.get("kind") != "npc":
            continue
        if entry.get("id") != assigned.get("ref"):
            continue  # a detail shot, not the face
        yield assigned["ref"], entry["path"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="re-derive even when the output is newer than its master")
    args = parser.parse_args()

    with open(REGISTRY, encoding="utf8") as handle:
        registry = json.load(handle)
    os.makedirs(OUT_DIR, exist_ok=True)

    made = skipped = missing = 0
    for npc, rel in sorted(primary_npc_portraits(registry)):
        src = os.path.join(REPO, rel)
        dst = os.path.join(OUT_DIR, f"{npc}.webp")
        if not os.path.exists(src):
            print(f"  MISSING MASTER  {npc}: {rel}")
            missing += 1
            continue
        if not args.force and os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            skipped += 1
            continue
        with Image.open(src) as image:
            image.convert("RGB").save(dst, "WEBP", quality=QUALITY, method=6)
        print(f"  {npc}.webp  {os.path.getsize(dst) / 1024:.0f} KB")
        made += 1

    print(f"{made} derived, {skipped} already current, {missing} missing a master.")
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
