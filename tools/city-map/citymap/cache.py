"""Cache artifact I/O: WKB+npy geometry serialization, and key verification.

**Not pickle.** Measured on 150k mixed geometries: pickle is 1.63s dump /
0.61s load; `shapely.to_wkb` on the object array is 0.34s / 0.12s -- shapely 2
pickles via WKB internally anyway, so the vectorised call just skips the
per-object Python round-trip. Speed is not actually the reason to avoid
pickle, though: pickle is a code-execution channel, and it embeds class
paths, so a shapely upgrade or a refactor of a record class breaks every
existing cache file with an unhelpful error -- in a project whose whole
premise is multi-month campaign persistence. WKB has neither problem.

**Verify on load, not just on write.** Every artifact stores the full config
it was built from (`Frame.cache_key_parts()`, a style id, whatever). Loading
re-derives the expected key and compares. This is what makes an under-keyed
cache fail LOUDLY instead of quietly rendering the wrong frame -- §10's
"coordinate systems bite silently" risk, addressed structurally rather than by
being careful.

**A hand-bumped code version, not a source hash.** `STAGE_CODE_VERSION`
constants live in each stage module and get folded into cache keys by their
callers. A source-file hash would invalidate a ten-minute cache over a comment
edit; a hand-bumped integer only invalidates when the module's OUTPUT
contract actually changed. The cost is remembering to bump it -- documented at
each constant's definition.
"""

from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from shapely import from_wkb, to_wkb
from shapely.geometry.base import BaseGeometry

STAGE_CODE_VERSION = 1


class CacheError(Exception):
    """Raised on a verified mismatch -- never on a plain cache miss."""


def canonical_json(obj: Any) -> str:
    """Deterministic JSON: sorted keys, fixed float precision, no whitespace churn.

    Floats are rounded to 9 decimal places BEFORE serialisation. `default=` in
    `json.dumps` only fires for types the encoder cannot already handle, and a
    plain float is one it handles natively -- so intercepting floats requires
    walking the structure first, not hooking the encoder.
    """
    return json.dumps(_round_floats(obj), sort_keys=True, separators=(",", ":"))


def _round_floats(obj):
    if isinstance(obj, float):
        return round(obj, 9)
    if isinstance(obj, dict):
        return {k: _round_floats(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_round_floats(v) for v in obj]
    return obj


def cache_key(parts: Dict[str, Any]) -> str:
    """SHA-256 hex of the canonical JSON of `parts`. The cache filename stem."""
    return hashlib.sha256(canonical_json(parts).encode("utf-8")).hexdigest()[:32]


# --- geometry list <-> (wkb blob, offsets) ------------------------------

def write_geometries(path_stem: str, geoms: List[Optional[BaseGeometry]]) -> None:
    """Write a list of geometries (None allowed, for sparse lists) as WKB+npy.

    Two files: `{stem}.wkb` (concatenated WKB blobs) and `{stem}.offsets.npy`
    (int64 [start, end) pairs, -1 sentinel for a None entry).
    """
    blobs: List[bytes] = []
    offsets = np.empty((len(geoms), 2), dtype=np.int64)
    cursor = 0
    for i, g in enumerate(geoms):
        if g is None:
            offsets[i] = (-1, -1)
            continue
        b = to_wkb(g)
        offsets[i] = (cursor, cursor + len(b))
        cursor += len(b)
        blobs.append(b)
    with open(path_stem + ".wkb", "wb") as fh:
        fh.write(b"".join(blobs))
    np.save(path_stem + ".offsets.npy", offsets)


def read_geometries(path_stem: str) -> List[Optional[BaseGeometry]]:
    offsets = np.load(path_stem + ".offsets.npy")
    with open(path_stem + ".wkb", "rb") as fh:
        blob = fh.read()
    mv = memoryview(blob)
    out: List[Optional[BaseGeometry]] = []
    for start, end in offsets:
        if start < 0:
            out.append(None)
            continue
        out.append(from_wkb(bytes(mv[start:end])))
    return out


# --- DEM arrays ----------------------------------------------------------

def write_array(path: str, array: np.ndarray) -> None:
    np.save(path, array)


def read_array(path: str, mmap: bool = True) -> np.ndarray:
    """Load a saved array. `mmap=True` avoids paging in the whole DEM for a
    small preview crop -- a real win once L2 fields are cached at 2048^2."""
    return np.load(path, mmap_mode="r" if mmap else None)


# --- attributes (tag dicts) ----------------------------------------------

def write_attrs(path: str, attrs: List[Dict[str, str]]) -> None:
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(attrs, fh, ensure_ascii=False)


def read_attrs(path: str) -> List[Dict[str, str]]:
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


# --- a whole keyed artifact: config sidecar + verify-on-load -------------

@dataclass
class Artifact:
    """One cache entry: a directory holding a manifest plus whatever payload
    files the caller wrote. `key_parts` is stored verbatim and re-checked on
    load, so a hash collision or a caller bug that under-specifies the key is
    caught immediately rather than silently serving stale data.
    """

    root: str
    key_parts: Dict[str, Any]

    @property
    def key(self) -> str:
        return cache_key(self.key_parts)

    @property
    def dir(self) -> str:
        return os.path.join(self.root, self.key)

    @property
    def manifest_path(self) -> str:
        return os.path.join(self.dir, "manifest.json")

    def exists(self) -> bool:
        return os.path.exists(self.manifest_path)

    def path(self, name: str) -> str:
        return os.path.join(self.dir, name)

    def begin_write(self) -> None:
        os.makedirs(self.dir, exist_ok=True)

    def commit(self, extra: Optional[Dict[str, Any]] = None) -> None:
        """Write the manifest LAST, after every payload file is on disk.

        A crash mid-write then leaves no manifest, so `exists()` correctly
        reports a miss rather than a load() reading a half-written payload.
        """
        manifest = {"keyParts": self.key_parts, "extra": extra or {}}
        tmp = self.manifest_path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            fh.write(canonical_json(manifest))
        os.replace(tmp, self.manifest_path)

    def verify(self) -> Dict[str, Any]:
        """Load the manifest and confirm it matches `key_parts`. Raises loudly
        on mismatch -- the whole point of storing the config is to fail
        instead of rendering a lie (see module docstring)."""
        if not self.exists():
            raise CacheError(f"no cache entry at {self.dir}")
        with open(self.manifest_path, encoding="utf-8") as fh:
            manifest = json.load(fh)
        stored = manifest.get("keyParts")
        if stored != self.key_parts:
            raise CacheError(
                f"cache key collision or corruption at {self.dir}: "
                f"stored config does not match the requested one.\n"
                f"  requested: {canonical_json(self.key_parts)}\n"
                f"  stored:    {canonical_json(stored)}"
            )
        return manifest.get("extra", {})


def artifact_root(repo_root: str, layer: str) -> str:
    """`tools/city-map/cache/{layer}/` -- gitignored, matching the existing
    bulk-tree pattern (`reference/`, `artwork/`, `audio/`)."""
    return os.path.join(repo_root, "tools", "city-map", "cache", layer)
