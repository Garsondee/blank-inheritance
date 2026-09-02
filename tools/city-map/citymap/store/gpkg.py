"""The map's mutable state store: a real GeoPackage, read/written directly as
SQLite -- replaces the operation log as the state-reconstruction mechanism
(see the map-editor plan's "The core decision: retire the operation log").

**Why raw sqlite3, not geopandas/pyogrio.** pyogrio (GeoPandas' modern
default engine) does not support incremental writes/appends to an existing
source -- confirmed against GeoPandas' own fiona-to-pyogrio migration notes.
A live editing store needs single-row UPDATE/INSERT/DELETE, so this module
talks to the file directly: `sqlite3` (stdlib) for the database, `shapely`
for geometry, and a small hand-rolled codec (below) for the one thing GDAL
normally hides -- the GeoPackage Binary (GPB) envelope around each WKB blob.

**The GPB codec is verified against a real GDAL-backed reader/writer**
(pyogrio via geopandas, dev-only tooling -- never imported by production
code, see the Phase 1 spike this module's tests are drawn from): a blob
written by GDAL round-trips correctly through `unpack_gpb`, and a blob
written by `pack_gpb` into a hand-created table (no GDAL involved in schema
creation) round-trips correctly back through GDAL/pyogrio. Both directions
matter -- this file must produce output any standard GeoPackage reader
(QGIS included) can open, and must correctly read files a chain including
GDAL will also touch.

**Why the R*Tree spatial index is maintained explicitly, not by SQL
triggers.** The GeoPackage RTree extension's reference triggers call
`ST_MinX`/`ST_MaxX`/`ST_IsEmpty` etc. -- SQL functions that come from
SpatiaLite or from GDAL's own internal registration when *it* opens the
file, neither of which a bare Python `sqlite3` connection has. Registering
Python equivalents via `create_function` would work, but re-derives spec
trigger boilerplate this project doesn't otherwise need. Instead: every
write in this module goes through one of the functions below, and each one
updates the matching `rtree_*` table in the same transaction as the base
table -- the "single choke point" the map-editor plan calls for anyway (so
every write can log to `change_log` and bump `meta.world_version` in the
same place). The real, spec-standard SQLite R*Tree module still does the
actual indexing (verified available in this Python's sqlite3 build) --
only its maintenance is explicit Python instead of implicit SQL triggers.
The cost: a write made OUTSIDE this module (a hand-edit in QGIS, say) will
not update the rtree table. `rebuild_rtree()` is the recovery path --
cheap, and exactly the tool for "I hand-fixed something in QGIS, now make
the index agree again."
"""

from __future__ import annotations

import json
import os
import sqlite3
import struct
from typing import Dict, List, Optional, Tuple

import shapely
from shapely.geometry import mapping as geom_to_geojson
from shapely.geometry import shape as geom_from_geojson
from shapely.geometry.base import BaseGeometry

STAGE_CODE_VERSION = 1

SOURCE_SRS_ID = 6674  # JGD2011 / Japan Plane Rectangular CS VI -- see schema.sql

_SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


class StoreError(Exception):
    pass


# --- GeoPackage Binary (GPB) codec ------------------------------------------
# OGC GeoPackage spec, Annex B. Header: 'G' 'P', version(u8), flags(u8),
# srs_id(i32), optional envelope, then a standard WKB geometry. We never
# write an envelope (indicator code 0) -- every reader needs the real
# geometry anyway, and skipping it keeps one write path instead of two.

_GPB_MAGIC = b"GP"
_ENVELOPE_SIZES = {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}


def pack_gpb(geom: Optional[BaseGeometry], srs_id: int = SOURCE_SRS_ID) -> bytes:
    """Geometry -> GeoPackage Binary blob, little-endian, no envelope."""
    flags = 0x01  # bit0=1 -> little-endian body; envelope bits stay 0 (=none)
    if geom is None or geom.is_empty:
        flags |= 0x01 << 4  # empty-geometry flag
        wkb = b""
    else:
        wkb = shapely.to_wkb(geom, byte_order=1)
    header = _GPB_MAGIC + bytes([0, flags]) + struct.pack("<i", srs_id)
    return header + wkb


def unpack_gpb(blob: Optional[bytes]) -> Tuple[Optional[BaseGeometry], Optional[int]]:
    """GeoPackage Binary blob -> (geometry, srs_id). geometry is None if the
    blob is None, empty, or carries no WKB body."""
    if blob is None:
        return None, None
    if blob[0:2] != _GPB_MAGIC:
        raise StoreError(f"not a GeoPackage geometry blob (bad magic {blob[0:2]!r})")
    flags = blob[3]
    endian = "<" if (flags & 0x01) else ">"
    envelope_code = (flags >> 1) & 0x07
    is_empty = bool(flags & 0x10)
    srs_id = struct.unpack(endian + "i", blob[4:8])[0]
    offset = 8 + _ENVELOPE_SIZES.get(envelope_code, 0)
    wkb = blob[offset:]
    geom = None if (is_empty or not wkb) else shapely.from_wkb(wkb)
    return geom, srs_id


# --- connection / schema ----------------------------------------------------

def connect(path: str) -> sqlite3.Connection:
    """Open an existing store. Foreign keys and WAL mode on -- WAL so a long
    read (a big bbox query) never blocks a concurrent short write."""
    conn = sqlite3.connect(path)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.row_factory = sqlite3.Row
    return conn


# GeoPackage-required SQLite PRAGMAs, verified empirically (not from memory
# of the spec) against a real GDAL-written file -- see the Phase 1 spike
# this module's tests are drawn from. Without these, the file's *contents*
# are still spec-correct (GDAL reads it fine, just with a warning), but a
# stricter reader could refuse to recognise it as a GeoPackage at all, which
# would break the "open it in QGIS" capability this store exists partly for.
_GPKG_APPLICATION_ID = 0x47504B47  # ASCII 'GPKG'
_GPKG_USER_VERSION = 10400          # GeoPackage version 1.4.0 (MMmmpp)


def create_store(path: str) -> sqlite3.Connection:
    """Create a brand-new store at `path` from schema.sql. Raises if a file
    already exists there -- this is a one-time bootstrap, never an
    overwrite-by-accident path."""
    if os.path.exists(path):
        raise StoreError(f"refusing to overwrite existing store: {path}")
    conn = sqlite3.connect(path)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute(f"PRAGMA application_id = {_GPKG_APPLICATION_ID}")
    conn.execute(f"PRAGMA user_version = {_GPKG_USER_VERSION}")
    with open(_SCHEMA_PATH, encoding="utf-8") as fh:
        conn.executescript(fh.read())
    conn.commit()
    conn.row_factory = sqlite3.Row
    return conn


# --- R*Tree maintenance (explicit -- see module docstring) -----------------

def _rtree_upsert(conn: sqlite3.Connection, rtree_table: str, fid: int,
                  geom: Optional[BaseGeometry]) -> None:
    conn.execute(f"DELETE FROM {rtree_table} WHERE id = ?", (fid,))
    if geom is not None and not geom.is_empty:
        minx, miny, maxx, maxy = geom.bounds
        conn.execute(f"INSERT INTO {rtree_table} (id, minx, maxx, miny, maxy) VALUES (?, ?, ?, ?, ?)",
                     (fid, minx, maxx, miny, maxy))


def _rtree_delete(conn: sqlite3.Connection, rtree_table: str, fid: int) -> None:
    conn.execute(f"DELETE FROM {rtree_table} WHERE id = ?", (fid,))


def rebuild_rtree(conn: sqlite3.Connection, table: str, geom_col: str, rtree_table: str) -> int:
    """Full rebuild of `rtree_table` from `table`'s current geometry column.
    The recovery path after any out-of-band write (a hand-edit made directly
    in QGIS, say) -- returns the number of rows indexed."""
    conn.execute(f"DELETE FROM {rtree_table}")
    n = 0
    for fid, blob in conn.execute(f"SELECT fid, {geom_col} FROM {table}"):
        geom, _ = unpack_gpb(blob)
        if geom is not None and not geom.is_empty:
            minx, miny, maxx, maxy = geom.bounds
            conn.execute(f"INSERT INTO {rtree_table} (id, minx, maxx, miny, maxy) VALUES (?, ?, ?, ?, ?)",
                         (fid, minx, maxx, miny, maxy))
            n += 1
    return n


# --- world_version / change_log ---------------------------------------------

def get_world_version(conn: sqlite3.Connection) -> int:
    row = conn.execute("SELECT value FROM meta WHERE key = 'world_version'").fetchone()
    return int(row["value"]) if row else 0


def _bump_world_version(conn: sqlite3.Connection) -> int:
    version = get_world_version(conn) + 1
    conn.execute("UPDATE meta SET value = ? WHERE key = 'world_version'", (str(version),))
    return version


def log_change(conn: sqlite3.Connection, kind: str, table_name: str, row_id: str,
               before: Optional[dict] = None, after: Optional[dict] = None,
               batch_id: Optional[str] = None, note: Optional[str] = None) -> None:
    conn.execute(
        "INSERT INTO change_log (kind, table_name, row_id, before, after, batch_id, note) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (kind, table_name, row_id,
         json.dumps(before, ensure_ascii=False) if before is not None else None,
         json.dumps(after, ensure_ascii=False) if after is not None else None,
         batch_id, note))


def undo_last_change(conn: sqlite3.Connection) -> Optional[dict]:
    """Reverse the most recent change_log entry -- or every row sharing its
    batch_id, as one step, if it was part of a multi-row transaction.

    Scope, stated plainly: this undoes exactly ONE step (Phase 4's "Ctrl+Z
    works", not Phase 11's later multi-step history scrubbing over a
    cursor). The reversal is itself appended as a NEW change_log row
    (before/after swapped, batch_id prefixed `undo:`) rather than deleting
    the row it undoes -- change_log stays append-only/auditable (a real
    "what happened, in order" log, not one that rewrites its own past), and
    as a direct, deliberate consequence: calling undo AGAIN immediately
    afterward reverses the reversal, i.e. acts as redo. That symmetry falls
    out of "always reverse whatever is now latest" for free, without a
    separate redo endpoint or a tracked cursor position.

    `update`/`insert`/`delete` on the `feature` table, `insert`/`delete`
    on `terrain_edit` (no `update` there -- nothing live patches an
    existing terrain_edit's geometry yet), and `update` on `world_geom`
    (the only kind set_world_geom ever logs -- it's always an upsert
    against an existing, already-meaningful key) are all implemented.
    Map-editor plan Phase 6 is what first produced a live feature `insert`
    (drawing a new road); Phase 7's terrace tool is what first produces a
    live `terrain_edit` insert; Phase 10's reclaim tool is what first
    produces a live `world_geom` update -- each addition extended this
    function exactly when a real write path needed it, per this function's
    own Phase 4-era note ("extend this function... when they exist", not
    before). Any OTHER (table_name, kind) combination still raises
    StoreError rather than guessing.

    Returns None if change_log is empty (nothing to undo), else
    {"undoneSeqs": [...], "featureIds": [...],
     "changes": [{"table", "featureId", "before", "after"}, ...]} --
    "table" is "feature" or "terrain_edit" so a caller (api/edits.py's POST
    /api/undo) can dispatch to the right live-sync path (a single feature
    patch vs. a full elevation/hillshade recompute); "before"/"after" are
    GeoJSON-geometry-or-None (None on the "after" side means the row no
    longer exists post-undo; None on "before" means it didn't exist
    pre-undo), in the SAME direction PATCH's own update_feature_geom return
    value uses. "featureIds" (kept under this name for both tables --
    renaming it would ripple needlessly given every value is already a
    real stable id either way) still lists every touched row's id
    regardless of table.
    """
    latest = conn.execute("SELECT * FROM change_log ORDER BY seq DESC LIMIT 1").fetchone()
    if latest is None:
        return None
    batch_id = latest["batch_id"]
    if batch_id is not None:
        rows = conn.execute("SELECT * FROM change_log WHERE batch_id = ? ORDER BY seq",
                            (batch_id,)).fetchall()
    else:
        rows = [latest]
    supported_kinds_by_table = {"feature": ("update", "insert", "delete"),
                               "terrain_edit": ("insert", "delete"),
                               "world_geom": ("update",)}
    for r in rows:
        allowed = supported_kinds_by_table.get(r["table_name"])
        if allowed is None or r["kind"] not in allowed:
            raise StoreError(
                f"undo not yet supported for change_log kind={r['kind']!r} "
                f"table={r['table_name']!r} (seq={r['seq']})")

    new_batch = f"undo:{batch_id or latest['seq']}"
    changes = []
    for r in rows:
        table = r["table_name"]
        before = json.loads(r["before"]) if r["before"] is not None else None
        after = json.loads(r["after"]) if r["after"] is not None else None

        if table == "world_geom" and r["kind"] == "update":
            restore_geom = geom_from_geojson(before["geom"]) if before and before.get("geom") else None
            set_world_geom(conn, r["row_id"], restore_geom, log=False)
            restore_geojson = {"geom": geom_to_geojson(restore_geom) if restore_geom is not None else None}
            log_change(conn, "update", "world_geom", r["row_id"], before=after, after=restore_geojson,
                      batch_id=new_batch, note=f"undo of change_log seq={r['seq']}")
            changes.append({"table": table, "featureId": r["row_id"], "before": after, "after": restore_geojson})
        elif table == "feature" and r["kind"] == "update":
            restore_geom = geom_from_geojson(before["geom"]) if before and before.get("geom") else None
            update_feature_geom(conn, r["row_id"], restore_geom, log=False)
            restore_geojson = {"geom": geom_to_geojson(restore_geom) if restore_geom is not None else None}
            log_change(conn, "update", "feature", r["row_id"], before=after, after=restore_geojson,
                      batch_id=new_batch, note=f"undo of change_log seq={r['seq']}")
            changes.append({"table": table, "featureId": r["row_id"], "before": after, "after": restore_geojson})
        elif table == "terrain_edit" and r["kind"] == "insert":
            delete_terrain_edit(conn, r["row_id"], log=False)
            log_change(conn, "delete", "terrain_edit", r["row_id"], before=after,
                      batch_id=new_batch, note=f"undo of change_log seq={r['seq']}")
            changes.append({"table": table, "featureId": r["row_id"], "before": after, "after": None})
        elif table == "terrain_edit" and r["kind"] == "delete":
            _reinsert_terrain_edit_from_snapshot(conn, r["row_id"], before)
            log_change(conn, "insert", "terrain_edit", r["row_id"], after=before,
                      batch_id=new_batch, note=f"undo of change_log seq={r['seq']}")
            changes.append({"table": table, "featureId": r["row_id"], "before": None, "after": before})
        elif table == "feature" and r["kind"] == "insert":
            # Reversing a creation: delete it. after (the insert's own
            # snapshot) is what gets logged as this new row's "before" --
            # a later undo of THIS row (redo) reinserts from exactly that.
            delete_feature(conn, r["row_id"], log=False)
            log_change(conn, "delete", "feature", r["row_id"], before=after,
                      batch_id=new_batch, note=f"undo of change_log seq={r['seq']}")
            changes.append({"table": table, "featureId": r["row_id"], "before": after, "after": None})
        elif table == "feature" and r["kind"] == "delete":
            # Reversing a deletion: recreate it from the delete's own
            # `before` snapshot, same real id.
            _reinsert_feature_from_snapshot(conn, r["row_id"], before)
            log_change(conn, "insert", "feature", r["row_id"], after=before,
                      batch_id=new_batch, note=f"undo of change_log seq={r['seq']}")
            changes.append({"table": table, "featureId": r["row_id"], "before": None, "after": before})

    return {"undoneSeqs": [r["seq"] for r in rows],
           "featureIds": [r["row_id"] for r in rows],
           "changes": changes}


# --- Feature CRUD -------------------------------------------------------------
# Mirrors citymap.parse.Feature exactly, so load.py can hand rows straight
# back into that dataclass with no shape translation.

def insert_feature(conn: sqlite3.Connection, *, id: str, geom: Optional[BaseGeometry],
                   tags: Dict[str, str], is_area: bool, height_m: float = 0.0,
                   origin: str = "osm", osm_way_id: Optional[int] = None,
                   group_id: Optional[str] = None, log: bool = True,
                   batch_id: Optional[str] = None) -> int:
    cur = conn.execute(
        "INSERT INTO feature (id, geom, tags, is_area, height_m, origin, osm_way_id, group_id) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (id, pack_gpb(geom), json.dumps(tags, ensure_ascii=False), int(is_area),
         height_m, origin, osm_way_id, group_id))
    fid = cur.lastrowid
    _rtree_upsert(conn, "rtree_feature_geom", fid, geom)
    if log:
        log_change(conn, "insert", "feature", id,
                  after={"id": id, "tags": tags, "isArea": is_area, "heightM": height_m,
                        "origin": origin, "groupId": group_id,
                        "geom": geom_to_geojson(geom) if geom is not None else None},
                  batch_id=batch_id)
    return fid


def _row_to_feature_kwargs(row: sqlite3.Row) -> dict:
    geom, _ = unpack_gpb(row["geom"])
    return dict(id=row["id"], geom=geom, tags=json.loads(row["tags"]),
               area=bool(row["is_area"]), height_m=row["height_m"],
               source=row["origin"], osm_way_id=row["osm_way_id"])


def get_feature_row(conn: sqlite3.Connection, feature_id: str) -> Optional[sqlite3.Row]:
    return conn.execute("SELECT * FROM feature WHERE id = ?", (feature_id,)).fetchone()


def get_feature_kwargs(conn: sqlite3.Connection, feature_id: str) -> Optional[dict]:
    """A single feature, shaped as citymap.parse.Feature constructor kwargs
    (same shape iter_all_features yields) -- the single-row counterpart a
    live edit needs to rebuild one Feature's MAP-space representation
    without iterating the whole table."""
    row = get_feature_row(conn, feature_id)
    return None if row is None else _row_to_feature_kwargs(row)


def update_feature_geom(conn: sqlite3.Connection, feature_id: str, new_geom: Optional[BaseGeometry], *,
                        log: bool = True, batch_id: Optional[str] = None,
                        note: Optional[str] = None) -> dict:
    """Patch an existing feature's geometry IN PLACE -- a real UPDATE against
    its existing `fid`, never a delete+reinsert. `feature.id` is not a
    column this function's SQL touches at all (the WHERE clause is the only
    place `id` appears), so there is no code path here that could rename a
    feature -- ids.py's stability contract is structurally enforced, not
    just conventionally honoured.

    Bumps `meta.world_version` (unlike insert_feature/import_osm.py's bulk
    path, which deliberately does not -- see those call sites' own
    reasoning). A single hand-edit is exactly the granularity world_version
    exists to track: resolve_fields_from_store's cache must miss the next
    time a process starts after this write, and this is the one place that
    decision belongs, not scattered across every route that calls this.

    Returns {"before": geojson-or-None, "after": geojson-or-None} -- both
    real GeoJSON geometry dicts (not GPB), suitable for a change_log
    snapshot AND for a caller that needs both bboxes to invalidate tiles.
    Raises StoreError if no feature has this id.
    """
    row = get_feature_row(conn, feature_id)
    if row is None:
        raise StoreError(f"no feature with id={feature_id!r}")
    fid = row["fid"]
    old_geom, _ = unpack_gpb(row["geom"])
    before = {"geom": geom_to_geojson(old_geom) if old_geom is not None else None}
    after = {"geom": geom_to_geojson(new_geom) if new_geom is not None else None}
    conn.execute(
        "UPDATE feature SET geom = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE fid = ?",
        (pack_gpb(new_geom), fid))
    _rtree_upsert(conn, "rtree_feature_geom", fid, new_geom)
    if log:
        log_change(conn, "update", "feature", feature_id, before=before, after=after,
                  batch_id=batch_id, note=note)
    _bump_world_version(conn)
    return {"before": before, "after": after}


def create_feature(conn: sqlite3.Connection, *, id: str, geom: Optional[BaseGeometry],
                   tags: Dict[str, str], is_area: bool, height_m: float = 0.0,
                   origin: str = "hand", batch_id: Optional[str] = None) -> int:
    """A single, live, hand-drawn feature creation -- map-editor plan
    Phase 6's `POST /api/features`. Thin wrapper over insert_feature: bulk
    import (import_osm.py) deliberately calls insert_feature directly with
    log=False/no version bump (230k per-row change_log entries would be
    pure waste for a one-time import) -- this is the OTHER caller, for the
    one-at-a-time granularity a real live edit needs, matching
    update_feature_geom's own log+bump-every-call default."""
    fid = insert_feature(conn, id=id, geom=geom, tags=tags, is_area=is_area,
                        height_m=height_m, origin=origin, log=True, batch_id=batch_id)
    _bump_world_version(conn)
    return fid


def delete_feature(conn: sqlite3.Connection, feature_id: str, *, log: bool = True,
                   bump: bool = True, batch_id: Optional[str] = None, note: Optional[str] = None) -> dict:
    """Delete a feature row entirely -- the reversal undo_last_change uses
    for an INSERT it's undoing (see that function), and available directly
    for whatever future tool needs a real delete (Phase 6 doesn't expose
    one itself -- drawing a road only ever inserts).

    Returns {"before": geojson-shaped snapshot} -- the full row, not just
    geometry, so a later undo-of-this-delete (redo) can fully reconstruct
    it via create_feature, matching insert_feature's own now-complete
    after-snapshot shape. Raises StoreError if no feature has this id.

    `bump` defaults to True (every caller before Phase 12, unchanged). Pass
    bump=False when deleting as one row of a larger batch that bumps
    world_version exactly once itself after the whole batch -- matching
    set_world_geom's own log/bump split and terrace.py's own explicit
    single end-of-batch _bump_world_version() call. Map-editor plan
    Phase 12 needs this: clearing several pre-existing features from
    underneath a new reclaim/terrace/foundation (or a standalone Clear
    Ground call) must bump the version once for the whole batch, not once
    per row deleted.
    """
    row = get_feature_row(conn, feature_id)
    if row is None:
        raise StoreError(f"no feature with id={feature_id!r}")
    fid = row["fid"]
    kwargs = _row_to_feature_kwargs(row)
    before = {
        "id": kwargs["id"], "tags": kwargs["tags"], "isArea": kwargs["area"],
        "heightM": kwargs["height_m"], "origin": kwargs["source"],
        "geom": geom_to_geojson(kwargs["geom"]) if kwargs["geom"] is not None else None,
    }
    conn.execute("DELETE FROM feature WHERE fid = ?", (fid,))
    _rtree_delete(conn, "rtree_feature_geom", fid)
    if log:
        log_change(conn, "delete", "feature", feature_id, before=before, batch_id=batch_id, note=note)
    if bump:
        _bump_world_version(conn)
    return {"before": before}


def _reinsert_feature_from_snapshot(conn: sqlite3.Connection, feature_id: str, snapshot: dict) -> None:
    """The exact inverse of delete_feature's own `before` snapshot shape --
    re-creates a feature undo_last_change is redoing after a delete (or,
    symmetrically, un-doing after an insert's reversal deleted it). Reuses
    the ORIGINAL id, not a freshly minted one -- redo must restore the
    same identity, not a lookalike.

    Bumps world_version itself -- insert_feature (called with log=False
    here) never does, by design, for the bulk importer's sake (see that
    function's own docstring), but this IS a real, single, live state
    change and must be tracked exactly like delete_feature/
    update_feature_geom's own unconditional bump right below theirs."""
    geom = geom_from_geojson(snapshot["geom"]) if snapshot.get("geom") else None
    insert_feature(conn, id=feature_id, geom=geom, tags=snapshot.get("tags", {}),
                   is_area=snapshot.get("isArea", False), height_m=snapshot.get("heightM", 0.0),
                   origin=snapshot.get("origin", "hand"), log=False)
    _bump_world_version(conn)


def iter_all_features(conn: sqlite3.Connection):
    """Every feature row, as plain dicts shaped like citymap.parse.Feature's
    constructor kwargs. Ordered by fid for deterministic iteration."""
    for row in conn.execute("SELECT * FROM feature ORDER BY fid"):
        yield _row_to_feature_kwargs(row)


def query_features_bbox(conn: sqlite3.Connection, minx: float, miny: float,
                        maxx: float, maxy: float, limit: Optional[int] = None) -> List[dict]:
    """Features whose bounding box intersects the query box -- an indexed
    R*Tree lookup, not a scan. `limit` is applied AFTER the count is known to
    the caller would need a separate COUNT(*) for an honest truncation flag;
    this function itself never silently drops rows without the caller asking."""
    sql = ("SELECT feature.* FROM feature JOIN rtree_feature_geom "
          "ON feature.fid = rtree_feature_geom.id "
          "WHERE rtree_feature_geom.maxx >= ? AND rtree_feature_geom.minx <= ? "
          "AND rtree_feature_geom.maxy >= ? AND rtree_feature_geom.miny <= ? "
          "ORDER BY feature.fid")
    params: list = [minx, maxx, miny, maxy]
    if limit is not None:
        sql += " LIMIT ?"
        params.append(limit)
    return [_row_to_feature_kwargs(row) for row in conn.execute(sql, params)]


def count_features_bbox(conn: sqlite3.Connection, minx: float, miny: float,
                        maxx: float, maxy: float) -> int:
    row = conn.execute(
        "SELECT COUNT(*) AS n FROM rtree_feature_geom "
        "WHERE maxx >= ? AND minx <= ? AND maxy >= ? AND miny <= ?",
        (minx, maxx, miny, maxy)).fetchone()
    return row["n"]


# --- TerrainEdit CRUD ---------------------------------------------------------

def insert_terrain_edit(conn: sqlite3.Connection, *, id: str, geom: BaseGeometry,
                        target_elevation_m: float, blend_m: float = 15.0,
                        stack_order: int, group_id: Optional[str] = None,
                        origin: str = "hand", log: bool = True,
                        batch_id: Optional[str] = None) -> int:
    cur = conn.execute(
        "INSERT INTO terrain_edit (id, geom, target_elevation_m, blend_m, stack_order, group_id, origin) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (id, pack_gpb(geom), target_elevation_m, blend_m, stack_order, group_id, origin))
    fid = cur.lastrowid
    _rtree_upsert(conn, "rtree_terrain_edit_geom", fid, geom)
    if log:
        log_change(conn, "insert", "terrain_edit", id,
                  after={"id": id, "targetElevationM": target_elevation_m,
                        "blendM": blend_m, "stackOrder": stack_order, "groupId": group_id,
                        "origin": origin,
                        "geom": geom_to_geojson(geom) if geom is not None else None},
                  batch_id=batch_id)
    return fid


def get_terrain_edit_row(conn: sqlite3.Connection, edit_id: str) -> Optional[sqlite3.Row]:
    return conn.execute("SELECT * FROM terrain_edit WHERE id = ?", (edit_id,)).fetchone()


def delete_terrain_edit(conn: sqlite3.Connection, edit_id: str, *, log: bool = True,
                        batch_id: Optional[str] = None, note: Optional[str] = None) -> dict:
    """Delete a terrain_edit row entirely -- the reversal undo_last_change
    uses for an INSERT it's undoing (map-editor plan Phase 7's terrace
    creation is the first live thing that inserts terrain_edit rows;
    mirrors delete_feature exactly, one table over).

    Returns {"before": geojson-shaped snapshot} for change_log/redo.
    Raises StoreError if no terrain_edit has this id."""
    row = get_terrain_edit_row(conn, edit_id)
    if row is None:
        raise StoreError(f"no terrain_edit with id={edit_id!r}")
    fid = row["fid"]
    geom, _ = unpack_gpb(row["geom"])
    before = {
        "id": row["id"], "targetElevationM": row["target_elevation_m"], "blendM": row["blend_m"],
        "stackOrder": row["stack_order"], "groupId": row["group_id"], "origin": row["origin"],
        "geom": geom_to_geojson(geom) if geom is not None else None,
    }
    conn.execute("DELETE FROM terrain_edit WHERE fid = ?", (fid,))
    _rtree_delete(conn, "rtree_terrain_edit_geom", fid)
    if log:
        log_change(conn, "delete", "terrain_edit", edit_id, before=before, batch_id=batch_id, note=note)
    _bump_world_version(conn)
    return {"before": before}


def _reinsert_terrain_edit_from_snapshot(conn: sqlite3.Connection, edit_id: str, snapshot: dict) -> None:
    """The exact inverse of delete_terrain_edit's own `before` snapshot --
    mirrors _reinsert_feature_from_snapshot one table over, including its
    explicit world_version bump (insert_terrain_edit itself never bumps,
    same bulk-import reasoning as insert_feature)."""
    geom = geom_from_geojson(snapshot["geom"]) if snapshot.get("geom") else None
    insert_terrain_edit(conn, id=edit_id, geom=geom,
                        target_elevation_m=snapshot["targetElevationM"], blend_m=snapshot["blendM"],
                        stack_order=snapshot["stackOrder"], group_id=snapshot.get("groupId"),
                        origin=snapshot.get("origin", "hand"), log=False)
    _bump_world_version(conn)


def terrain_edits_intersecting_bbox(conn: sqlite3.Connection, minx: float, miny: float,
                                    maxx: float, maxy: float) -> List[str]:
    """Ids of every terrain_edit whose bbox overlaps the given box -- an
    indexed R*Tree lookup, same shape as count_features_bbox. Exists so a
    feature-geometry PATCH can warn "N terrace/bench edits sit near where
    this building used to be, and did not move with it" -- see the
    map-editor plan's Phase 4 validation rules ("a bench/terrain-edit under
    a moved building doesn't follow it automatically -- surfaced as a
    prompt, not silently orphaned"). Informational only: this function
    never blocks or modifies anything, it only reports."""
    rows = conn.execute(
        "SELECT terrain_edit.id AS id FROM terrain_edit "
        "JOIN rtree_terrain_edit_geom ON terrain_edit.fid = rtree_terrain_edit_geom.id "
        "WHERE rtree_terrain_edit_geom.maxx >= ? AND rtree_terrain_edit_geom.minx <= ? "
        "AND rtree_terrain_edit_geom.maxy >= ? AND rtree_terrain_edit_geom.miny <= ?",
        (minx, maxx, miny, maxy)).fetchall()
    return [row["id"] for row in rows]


def iter_all_terrain_edits(conn: sqlite3.Connection):
    """Every terrain_edit row, ORDER BY stack_order -- see schema.sql's
    comment on why this order is load-bearing for correct terracing."""
    for row in conn.execute("SELECT * FROM terrain_edit ORDER BY stack_order, fid"):
        geom, _ = unpack_gpb(row["geom"])
        yield dict(id=row["id"], polygon=geom, target_elevation_m=row["target_elevation_m"],
                  blend_m=row["blend_m"], source=row["origin"])


# --- Road / rail graph bulk I/O ----------------------------------------------

def write_graph(conn: sqlite3.Connection, prefix: str, node_xy: Dict[int, Tuple[float, float]],
                way_nodes: Dict[int, List[int]], way_class: Dict[int, str]) -> None:
    """Bulk-write a RoadGraph's three tables (prefix='road' or 'rail').
    node_ways (RoadGraph's third dict) is NOT stored -- it's derivable from
    way_nodes and is rebuilt on load, exactly like RoadGraph already does
    from way_nodes in memory (parse.py's own degree()/junctions() etc. only
    ever read node_ways, never assume it was independently authored)."""
    conn.executemany(f"INSERT INTO {prefix}_node (node_id, x, y) VALUES (?, ?, ?)",
                     [(nid, x, y) for nid, (x, y) in node_xy.items()])
    conn.executemany(f"INSERT INTO {prefix}_way (way_id, class) VALUES (?, ?)",
                     [(wid, cls) for wid, cls in way_class.items()])
    rows = []
    for way_id, nodes in way_nodes.items():
        for seq, node_id in enumerate(nodes):
            rows.append((way_id, seq, node_id))
    conn.executemany(f"INSERT INTO {prefix}_way_node (way_id, seq, node_id) VALUES (?, ?, ?)", rows)


def read_graph(conn: sqlite3.Connection, prefix: str):
    """The inverse of write_graph -- returns (node_xy, way_nodes, way_class)
    ready to build a RoadGraph from."""
    node_xy = {row["node_id"]: (row["x"], row["y"])
              for row in conn.execute(f"SELECT node_id, x, y FROM {prefix}_node")}
    way_class = {row["way_id"]: row["class"]
                for row in conn.execute(f"SELECT way_id, class FROM {prefix}_way")}
    way_nodes: Dict[int, List[int]] = {}
    for row in conn.execute(f"SELECT way_id, seq, node_id FROM {prefix}_way_node ORDER BY way_id, seq"):
        way_nodes.setdefault(row["way_id"], []).append(row["node_id"])
    return node_xy, way_nodes, way_class


# --- world_geom (sea) / lamps -------------------------------------------------

def set_world_geom(conn: sqlite3.Connection, key: str, geom: Optional[BaseGeometry], *,
                   log: bool = True, bump: bool = True, batch_id: Optional[str] = None,
                   note: Optional[str] = None) -> dict:
    """Upsert world_geom[key] -- 'sea' is the only key any real caller uses
    today. import_osm.py's one-time bootstrap is the ORIGINAL caller
    (log=False, bump=False -- a fresh store has no prior change_log history
    to speak of, and must start at world_version=0, matching
    insert_feature's own bulk-import convention exactly); map-editor plan
    Phase 10's reclaim tool (and undo_last_change's own reversal of a
    world_geom change) are the LIVE writers, both wanting the default
    bump=True.

    `log` and `bump` are deliberately SEPARATE parameters, not one flag --
    a real bug caught by test_store_import_osm.py's own
    test_world_version_starts_at_zero_after_import: an earlier version of
    this function bumped unconditionally (matching update_feature_geom's
    convention, which never needed a bulk-import caller to begin with), so
    import_osm.py's log=False bootstrap call still silently bumped
    world_version once, breaking "a fresh import starts at version 0."
    undo_last_change's reversal call needs exactly the opposite
    combination (log=False, bump=True -- it must not add a SECOND
    change_log row for what is really one logical undo step, already
    logged by its own separate log_change call, but it does need the
    version bump so a cache keyed on world_version correctly misses).

    Returns {"before": geojson-or-None, "after": geojson-or-None}, the
    same shape update_feature_geom returns and for the same reason: a
    change_log snapshot, AND a caller (Phase 10's reclaim endpoint) that
    needs the CURRENT sea geometry to compute its own difference() against
    without a separate read.
    """
    old_geom = get_world_geom(conn, key)
    before = {"geom": geom_to_geojson(old_geom) if old_geom is not None else None}
    after = {"geom": geom_to_geojson(geom) if geom is not None else None}
    conn.execute("INSERT INTO world_geom (key, geom) VALUES (?, ?) "
                "ON CONFLICT(key) DO UPDATE SET geom = excluded.geom",
                (key, pack_gpb(geom) if geom is not None else None))
    if log:
        log_change(conn, "update", "world_geom", key, before=before, after=after,
                  batch_id=batch_id, note=note)
    if bump:
        _bump_world_version(conn)
    return {"before": before, "after": after}


def get_world_geom(conn: sqlite3.Connection, key: str) -> Optional[BaseGeometry]:
    row = conn.execute("SELECT geom FROM world_geom WHERE key = ?", (key,)).fetchone()
    if row is None:
        return None
    geom, _ = unpack_gpb(row["geom"])
    return geom


def insert_lamp(conn: sqlite3.Connection, geom: BaseGeometry) -> int:
    cur = conn.execute("INSERT INTO lamp (geom) VALUES (?)", (pack_gpb(geom),))
    return cur.lastrowid


def iter_all_lamps(conn: sqlite3.Connection):
    for row in conn.execute("SELECT geom FROM lamp ORDER BY fid"):
        geom, _ = unpack_gpb(row["geom"])
        if geom is not None:
            yield (geom.x, geom.y)
