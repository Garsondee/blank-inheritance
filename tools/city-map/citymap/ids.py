"""Deterministic, stable feature IDs.

Two hard requirements, both load-bearing for the life of the campaign:

1. **Cross-language identity.** This must produce byte-identical digests to
   `foundry/blank-inheritance/scripts/core/ids.mjs`'s `deriveFoundryId`, because
   the same feature has to carry the same id whether it was named here (Python,
   map generation) or there (JS, Foundry sync). The algorithm is therefore fixed
   and must not be "improved": SHA-256 over the exact byte string
   `blank-inheritance:{source_id}`, hex, truncated to 16 characters. Hex digits
   are already a subset of [a-zA-Z0-9], which is what Foundry's `_id` pattern
   requires, so plain truncation is valid. `test/city-map/test_ids.py` asserts
   the two implementations agree.

2. **Frame invariance.** IDs are derived in SOURCE CRS, before any rotation or
   clipping. design/map-generation.md §4 says a re-import must reproduce ids or
   "every recorded scar detaches from what it damaged", and §10 lists that as a
   named risk. Deriving an id from post-rotation geometry would satisfy the
   letter of that and still break it in practice: the frame's rotation and
   extent are exactly the parameters an art-direction loop sweeps, and rotating
   the frame would silently rename every feature in the city. So the geometry
   component of an id is always source-CRS coordinates.

Never use a counter. Counters depend on iteration order, so inserting one
feature upstream renumbers everything after it.
"""

import hashlib

# Quantisation for geometry-derived ids, in metres of the source CRS. Two
# different OSM exports of the same untouched building can differ in the last
# floating-point digit; without quantisation that would mint a new id and
# detach the feature's history. 1 mm is far below any real positional accuracy
# (GSI's DEM is 5 m, OSM building corners are metre-scale at best) while still
# being tight enough that two genuinely distinct features never collide.
_QUANT_M = 0.001


def derive_id(source_id: str) -> str:
    """The canonical 16-char id for a source id string.

    Mirrors `deriveFoundryId` in ids.mjs exactly -- see module docstring.
    """
    payload = f"blank-inheritance:{source_id}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()[:16]


def content_hash(text: str) -> str:
    """Full SHA-256 hex of a string, for cache keys and change detection.

    Mirrors `contentHash` in ids.mjs (which hashes `JSON.stringify(obj)`);
    callers here pass already-serialised canonical JSON so that the two sides
    agree on separators and key order.
    """
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def osm_feature_id(osm_type: str, osm_id: int) -> str:
    """Stable id for a feature that came straight from OSM.

    Keyed on OSM's own type+id rather than geometry, because that is stable
    across the small coordinate churn of a data refresh. §10 warns that ids can
    still shift if OSM itself renumbers (a way split in two, say) -- that is a
    real residual risk this cannot solve, and is why `geometry_feature_id`
    exists for anything we synthesise ourselves.
    """
    return derive_id(f"osm:{osm_type}:{osm_id}")


def geometry_feature_id(kind: str, coords_source_crs, extra: str = "") -> str:
    """Stable id for a feature we synthesised, derived from its own geometry.

    `coords_source_crs` is an iterable of (x, y) pairs in the SOURCE CRS --
    never map space, never pixels (see module docstring, requirement 2).
    """
    parts = [f"{round(x / _QUANT_M)},{round(y / _QUANT_M)}" for x, y in coords_source_crs]
    return derive_id(f"{kind}:{extra}:" + ";".join(parts))


def op_feature_id(op_id: str, role: str, index: int = 0) -> str:
    """Stable id for a feature produced by an operation-log entry.

    Namespaced by the op's own id so that replaying the log reproduces the same
    ids every time, and so a later `override`/`rename`/`demolish` op can still
    bind to what an earlier op built. The compound-source-string convention
    matches how scene.mjs derives embedded-document ids
    (`${source.id}:token:${actorSourceId}`).
    """
    return derive_id(f"op:{op_id}:{role}:{index}")
