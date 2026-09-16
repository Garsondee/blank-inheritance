"""Stage in-tray artwork into the Foundry module, by stable id.

`artwork/in-tray/` holds real, on-voice material under names like
`garsondee_a_japanese_1050s_military_doctor_portrait_1950s_han_172ffcd7-….png`
— a prompt fragment and a UUID. Nothing in there maps a picture to a
character, and the files are 2-7MB PNGs that have no business being served to
six players over a domestic connection.

This does the minimum that unblocks a real theatre-of-the-mind scene:

    read a manifest that names each image by a STABLE ID
    -> resize and re-encode it for the web
    -> write it into the module as <id>.<ext>

The id is the contract. When the real asset pipeline
(`ideas/entries/asset-review-pipeline.json`, status `accepted`) organises the
in-tray and every one of these source filenames changes, only the manifest's
`source` fields move — every scene, every actor, and every stylesheet that
points at `assets/stage/commander.webp` keeps working.

WHAT THIS IS NOT: it is not that pipeline. It does no cataloguing, no
deduplication, and no "assigned once, never double-used" bookkeeping. It
reads a hand-written manifest and resizes what it is told to.

Usage:
    python tools/stage-assets/stage_assets.py            # stage everything
    python tools/stage-assets/stage_assets.py --check    # report, write nothing

Tested by test/stage-assets/test_stage_assets.py (Python stdlib unittest, run
separately from `npm test` exactly like tools/city-map's suite).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass

# Longest edge of a staged image, by kind. Backgrounds are shown as a whole
# scene and portraits inside a frame roughly 200px wide on screen, so a
# portrait needs far less than it looks like it does — 2x the rendered size is
# enough for a high-DPI display and nothing is gained above it.
MAX_EDGE = {"background": 1920, "portrait": 768}

# WebP at this quality is visually indistinguishable from the source PNGs at
# these sizes and lands around 5% of the bytes. Foundry serves webp natively
# and PIXI loads it as a texture without special handling.
WEBP_QUALITY = 86

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEFAULT_MANIFEST = os.path.join(REPO_ROOT, "data", "campaign", "stage-demo.json")
DEFAULT_INTRAY = os.path.join(REPO_ROOT, "artwork", "in-tray")
DEFAULT_OUT = os.path.join(REPO_ROOT, "module", "blank-inheritance", "assets", "stage")


@dataclass(frozen=True)
class Item:
    """One image to stage: where it comes from, what it is called, how big."""

    stable_id: str
    source: str
    kind: str

    @property
    def out_name(self) -> str:
        return f"{self.stable_id}.webp"


def plan(manifest: dict) -> list[Item]:
    """Everything the manifest asks to be staged, portraits then backgrounds.

    Deliberately returns a plan rather than doing the work, so the ordering,
    the id derivation and the duplicate check are all testable without
    touching a filesystem or needing Pillow.
    """
    items: list[Item] = []
    for portrait in manifest.get("portraits", []):
        items.append(Item(stable_id=portrait["id"], source=portrait["source"], kind="portrait"))
    for scene in manifest.get("scenes", []):
        background = scene.get("background")
        if background:
            items.append(Item(stable_id=f"bg-{scene['id']}", source=background, kind="background"))

    seen: dict[str, str] = {}
    for item in items:
        if item.stable_id in seen and seen[item.stable_id] != item.source:
            raise ValueError(
                f"two different sources both claim the id {item.stable_id!r}: "
                f"{seen[item.stable_id]!r} and {item.source!r}"
            )
        seen[item.stable_id] = item.source
    return items


def fit(size: tuple[int, int], max_edge: int) -> tuple[int, int]:
    """Scale down to fit inside max_edge, preserving aspect. Never scales UP.

    Upscaling would quietly turn a small source into a large file that looks
    exactly as soft as the original — the worst of both, and invisible in a
    directory listing.
    """
    width, height = size
    if max(width, height) <= max_edge:
        return width, height
    ratio = max_edge / float(max(width, height))
    return max(1, round(width * ratio)), max(1, round(height * ratio))


def stage(manifest_path: str, intray: str, out_dir: str, *, check_only: bool = False) -> dict:
    with open(manifest_path, encoding="utf-8") as handle:
        manifest = json.load(handle)

    items = plan(manifest)
    report = {"staged": [], "missing": [], "skipped": [], "outDir": out_dir}

    if not check_only:
        os.makedirs(out_dir, exist_ok=True)

    for item in items:
        source_path = os.path.join(intray, item.source.replace("/", os.sep))
        if not os.path.exists(source_path):
            report["missing"].append({"id": item.stable_id, "source": item.source})
            continue

        target = os.path.join(out_dir, item.out_name)
        if check_only:
            report["skipped"].append({"id": item.stable_id, "target": item.out_name})
            continue

        # Imported lazily so --check and the unit tests run without Pillow.
        from PIL import Image

        with Image.open(source_path) as image:
            image = image.convert("RGB")
            new_size = fit(image.size, MAX_EDGE[item.kind])
            if new_size != image.size:
                image = image.resize(new_size, Image.LANCZOS)
            image.save(target, "WEBP", quality=WEBP_QUALITY, method=6)

        report["staged"].append(
            {
                "id": item.stable_id,
                "kind": item.kind,
                "target": item.out_name,
                "size": new_size,
                "bytes": os.path.getsize(target),
                "sourceBytes": os.path.getsize(source_path),
            }
        )

    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--manifest", default=DEFAULT_MANIFEST)
    parser.add_argument("--in-tray", dest="intray", default=DEFAULT_INTRAY)
    parser.add_argument("--out", dest="out_dir", default=DEFAULT_OUT)
    parser.add_argument("--check", action="store_true", help="report what would be staged, write nothing")
    args = parser.parse_args(argv)

    report = stage(args.manifest, args.intray, args.out_dir, check_only=args.check)

    for entry in report["staged"]:
        saved = 100 - round(100 * entry["bytes"] / max(1, entry["sourceBytes"]))
        print(
            f"  {entry['id']:<26} {entry['size'][0]:>5}x{entry['size'][1]:<5} "
            f"{entry['bytes'] // 1024:>5}KB  (-{saved}%)"
        )
    for entry in report["skipped"]:
        print(f"  would stage {entry['id']} -> {entry['target']}")
    for entry in report["missing"]:
        print(f"  MISSING {entry['id']}: {entry['source']}", file=sys.stderr)

    print(f"\n{len(report['staged'])} staged, {len(report['missing'])} missing -> {report['outDir']}")
    # A missing source is a real failure: a scene referencing an image that was
    # never written renders as a blank frame with no error anywhere.
    return 1 if report["missing"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
