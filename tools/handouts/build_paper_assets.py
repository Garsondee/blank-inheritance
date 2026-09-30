"""Build the small images that paper handouts print, from registered artwork.

A handout (a scene brief's `handouts[].body`, styled by
module/blank-inheritance/styles/bi-papers.css) prints the Directorate's own
marks: the watchtower in its letterhead and the lettered seal stamped over its
signature. Both come from approved artwork registered in
data/campaign/asset-registry.json (`directorate-seal`,
`directorate-seal-lettered`, approved 2026-09-23). The originals are 2048px
PNGs of a megabyte or more; a letterhead shows them at 64px and 116px, so this
writes WebPs at roughly three times that, enough for Ingram's 4K screen at 150%
and for nobody to wait on them.

The source path is read from the registry by id rather than written here, so
when the artwork moves only the registry changes. The outputs are committed
(module/blank-inheritance/assets/ui/handouts/), because the module ships them
to the server; this script is how they are made again, not a build step anyone
has to remember.

Usage:
    python tools/handouts/build_paper_assets.py           # write the WebPs
    python tools/handouts/build_paper_assets.py --check   # report, write nothing

Tested by test/handouts/test_build_paper_assets.py (stdlib unittest, run
separately from `npm test`, like the other Python tools).
"""

from __future__ import annotations

import argparse
import json
import os
import sys

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
REGISTRY = os.path.join(REPO_ROOT, "data", "campaign", "asset-registry.json")
OUT_DIR = os.path.join(REPO_ROOT, "module", "blank-inheritance", "assets", "ui", "handouts")

# registry id -> (output file, longest edge in px). Keep the names in step with
# what handout bodies reference; test/tier3-handouts-contract.test.mjs fails if
# a body points at a file that is not in the module.
OUTPUTS = {
    "directorate-seal": ("directorate-mark.webp", 360),
    "directorate-seal-lettered": ("directorate-seal.webp", 384),
}

# Lossless keeps the hand-cut edge of the stamp artwork crisp at small sizes;
# at these dimensions it still lands well under a hundred kilobytes.
WEBP_OPTIONS = {"lossless": True, "method": 6}


def registry_paths(registry_path: str = REGISTRY) -> dict[str, str]:
    """Each wanted registry id mapped to its artwork path (repo-relative)."""
    with open(registry_path, encoding="utf-8") as handle:
        registry = json.load(handle)
    found = {a["id"]: a["path"] for a in registry.get("assets", []) if a.get("id") in OUTPUTS}
    missing = sorted(set(OUTPUTS) - set(found))
    if missing:
        raise KeyError(f"asset-registry.json has no entry for: {', '.join(missing)}")
    return found


def fit(size: tuple[int, int], max_edge: int) -> tuple[int, int]:
    """Scale (w, h) down so the longest edge is max_edge; never scale up."""
    w, h = size
    scale = min(1.0, max_edge / max(w, h))
    return (max(1, round(w * scale)), max(1, round(h * scale)))


def build(*, check_only: bool = False, registry_path: str = REGISTRY, out_dir: str = OUT_DIR) -> list[dict]:
    from PIL import Image  # imported here so --help works without Pillow

    report = []
    for asset_id, rel_path in registry_paths(registry_path).items():
        name, edge = OUTPUTS[asset_id]
        src = os.path.join(REPO_ROOT, rel_path)
        if not os.path.exists(src):
            # artwork/ is gitignored, so a fresh clone has no originals. The
            # committed WebPs are still correct; there is just nothing to redo.
            report.append({"id": asset_id, "out": name, "status": "source missing", "src": rel_path})
            continue
        with Image.open(src) as image:
            image = image.convert("RGBA")
            target = fit(image.size, edge)
            dest = os.path.join(out_dir, name)
            if not check_only:
                os.makedirs(out_dir, exist_ok=True)
                image.resize(target, Image.LANCZOS).save(dest, "WEBP", **WEBP_OPTIONS)
            report.append({"id": asset_id, "out": name, "status": "checked" if check_only else "written", "size": target})
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="report what would be written, write nothing")
    args = parser.parse_args(argv)
    for row in build(check_only=args.check):
        print(f"{row['status']:>14}  {row['out']:<24} from {row['id']}" + (f"  {row['size'][0]}x{row['size'][1]}" if "size" in row else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
