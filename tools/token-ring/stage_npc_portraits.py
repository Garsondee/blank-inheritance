"""Resize assigned character portraits into Actor/frame art.

Sibling to crop_ring_subject.py in this same directory, and driven by the
exact same data/campaign/asset-registry.json entries (`plan()` below is a
thin wrapper around that module's own `plan()` -- same eligibility, same
primary/companion tie-break, so the two scripts never disagree about which
portrait belongs to which npc/creature id). Where crop_ring_subject.py
produces a circle-masked square for the Dynamic Token Ring, this produces an
ordinary rectangular resize for everything else that shows a portrait: the
Actor's own `img` field (sheet icon, Actors directory) and the Theatre-of-
Mind character frame, which both want the source portrait's real aspect
ratio, not a token-shaped crop.

Reuses tools/stage-assets/stage_assets.py's own resize/WebP-encode approach
(max-edge fit, quality 86, never upscales) rather than reinventing image
handling -- that script's own manifest-driven contract (data/campaign/
stage-demo.json) is untouched; this is a second, registry-driven producer
writing into the same modules/blank-inheritance/assets/stage/ directory,
keyed by npc/creature id instead of a hand-written portrait id.

The output id is the assignedTo.ref, same convention as crop_ring_subject.py,
so core/generators/npc.mjs's caller (foundry/sync.mjs) can construct the
Foundry-relative path by convention ("modules/blank-inheritance/assets/
stage/<id>.webp") with no lookup table.

Usage:
    python tools/token-ring/stage_npc_portraits.py            # stage everything
    python tools/token-ring/stage_npc_portraits.py --check    # report, write nothing

Tested by test/token-ring/test_stage_npc_portraits.py (Python stdlib
unittest, run separately from `npm test`, exactly like this directory's other
suite).
"""

from __future__ import annotations

import argparse
import json
import os
import sys

from crop_ring_subject import plan as ring_subject_plan

# Longest edge of a staged portrait. Same figure and same reasoning as
# tools/stage-assets/stage_assets.py's own "portrait" MAX_EDGE: shown in a
# sheet header or a frame roughly 200px wide on screen, so 2x that for a
# high-DPI display is already generous.
MAX_EDGE = 768

# Same figure as this project's other two staging tools, for the same
# reason: visually indistinguishable from the source PNGs at this size, a
# fraction of the bytes.
WEBP_QUALITY = 86

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEFAULT_REGISTRY = os.path.join(REPO_ROOT, "data", "campaign", "asset-registry.json")
DEFAULT_OUT = os.path.join(REPO_ROOT, "module", "blank-inheritance", "assets", "stage")


def fit(size: tuple[int, int], max_edge: int) -> tuple[int, int]:
    """Scale down to fit inside max_edge, preserving aspect. Never scales UP.

    Identical logic to tools/stage-assets/stage_assets.py's own `fit` --
    small and stable enough that duplicating it here is simpler than adding a
    shared import between two directories for four lines of arithmetic.
    """
    width, height = size
    if max(width, height) <= max_edge:
        return width, height
    ratio = max_edge / float(max(width, height))
    return max(1, round(width * ratio)), max(1, round(height * ratio))


def plan(registry: dict) -> list:
    """Every asset-registry portrait assigned to an npc/creature, reusing
    crop_ring_subject's own eligibility and primary/companion tie-break so
    the two scripts can never stage a different portrait for the same id."""
    return ring_subject_plan(registry)


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

        # Imported lazily so --check and the unit tests run without Pillow.
        from PIL import Image

        with Image.open(source_path) as image:
            image = image.convert("RGB")
            new_size = fit(image.size, MAX_EDGE)
            if new_size != image.size:
                image = image.resize(new_size, Image.LANCZOS)
            image.save(target, "WEBP", quality=WEBP_QUALITY, method=6)

        report["staged"].append(
            {
                "id": item.stable_id,
                "target": item.out_name,
                "size": new_size,
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
        print(
            f"  {entry['id']:<26} {entry['size'][0]:>5}x{entry['size'][1]:<5} "
            f"{entry['bytes'] // 1024:>5}KB  (-{saved}%)"
        )
    for entry in report["skipped"]:
        print(f"  would stage {entry['id']} -> {entry['target']}")
    for entry in report["missing"]:
        print(f"  MISSING {entry['id']}: {entry['source']}", file=sys.stderr)

    print(f"\n{len(report['staged'])} staged, {len(report['missing'])} missing -> {report['outDir']}")
    return 1 if report["missing"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
