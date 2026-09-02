-- The map's mutable state, as a real GeoPackage (SQLite + the OGC GeoPackage
-- table layout -- see gpkg.py's module docstring for why this replaced the
-- operation log as the state-reconstruction mechanism).
--
-- GeoPackage system tables (gpkg_spatial_ref_sys / gpkg_contents /
-- gpkg_geometry_columns) are populated so the file opens correctly in QGIS
-- and any other GDAL-based tool -- that's a deliberate, load-bearing
-- capability (design/map-editor plan's "QGIS as a free escape hatch"), not
-- decoration. Spatial indexing is a real SQLite R*Tree virtual table per
-- geometry column, maintained explicitly by gpkg.py's write helpers (not by
-- SQL triggers -- see that module's docstring for why) rather than left to
-- an extension this project doesn't otherwise need.

-- === GeoPackage required system tables =====================================

CREATE TABLE gpkg_spatial_ref_sys (
    srs_name TEXT NOT NULL,
    srs_id INTEGER NOT NULL PRIMARY KEY,
    organization TEXT NOT NULL,
    organization_coordsys_id INTEGER NOT NULL,
    definition TEXT NOT NULL,
    description TEXT
);

CREATE TABLE gpkg_contents (
    table_name TEXT NOT NULL PRIMARY KEY,
    data_type TEXT NOT NULL,
    identifier TEXT UNIQUE,
    description TEXT DEFAULT '',
    last_change DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    min_x DOUBLE, min_y DOUBLE, max_x DOUBLE, max_y DOUBLE,
    srs_id INTEGER,
    CONSTRAINT fk_gc_r_srs_id FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys(srs_id)
);

CREATE TABLE gpkg_geometry_columns (
    table_name TEXT NOT NULL,
    column_name TEXT NOT NULL,
    geometry_type_name TEXT NOT NULL,
    srs_id INTEGER NOT NULL,
    z TINYINT NOT NULL,
    m TINYINT NOT NULL,
    CONSTRAINT pk_geom_cols PRIMARY KEY (table_name, column_name),
    CONSTRAINT uk_gc_table_name UNIQUE (table_name),
    CONSTRAINT fk_gc_tn FOREIGN KEY (table_name) REFERENCES gpkg_contents(table_name),
    CONSTRAINT fk_gc_srs FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys(srs_id)
);

-- The two mandatory placeholder rows every GeoPackage must carry, plus the
-- one real projected CRS this project actually uses (JGD2011 / Japan Plane
-- Rectangular CS zone VI -- matches data/map/frames/kurose-12km.json's
-- crsEpsg). All stored geometry is SOURCE CRS (world.py's own invariant),
-- so 6674 is the only real spatial reference this file needs today.
INSERT INTO gpkg_spatial_ref_sys (srs_name, srs_id, organization, organization_coordsys_id, definition, description)
VALUES
    ('Undefined cartesian SRS', -1, 'NONE', -1, 'undefined', 'For use with local coordinates that have no georeferencing information'),
    ('Undefined geographic SRS', 0, 'NONE', 0, 'undefined', 'For use with GEOGCS coordinates that have no georeferencing information'),
    ('JGD2011 / Japan Plane Rectangular CS VI', 6674, 'EPSG', 6674,
     'PROJCS["JGD2011 / Japan Plane Rectangular CS VI",GEOGCS["JGD2011",DATUM["Japanese Geodetic Datum 2011",SPHEROID["GRS 1980",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",36],PARAMETER["central_meridian",136.0],PARAMETER["scale_factor",0.9999],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1]]',
     'EPSG:6674, the source CRS for this campaign''s map data');

-- === Feature store ===========================================================
-- was citymap.parse.Feature (areas AND lines -- buildings, roads, landuse,
-- rivers, everything tag-dispatched by the renderer).

CREATE TABLE feature (
    fid INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT UNIQUE NOT NULL,          -- ids.py stable id; identity, never changes
    geom GEOMETRY,                    -- GeoPackage Binary, SOURCE CRS (EPSG:6674)
    tags TEXT NOT NULL DEFAULT '{}',  -- JSON object, string -> string
    is_area INTEGER NOT NULL,         -- 0 or 1
    height_m REAL NOT NULL DEFAULT 0.0,
    origin TEXT NOT NULL DEFAULT 'osm',   -- 'osm' | 'hand' | 'tool:<name>' | 'tool:array:<group>'
    osm_way_id INTEGER,               -- raw OSM way id, roads only; correlates to road_way.way_id
    group_id TEXT,                    -- e.g. 'array:row-0007' -- select/re-space/delete as one unit
    created_at DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_feature_group ON feature(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX idx_feature_origin ON feature(origin);
CREATE INDEX idx_feature_osm_way ON feature(osm_way_id) WHERE osm_way_id IS NOT NULL;

INSERT INTO gpkg_contents (table_name, data_type, identifier, srs_id) VALUES ('feature', 'features', 'feature', 6674);
INSERT INTO gpkg_geometry_columns (table_name, column_name, geometry_type_name, srs_id, z, m) VALUES ('feature', 'geom', 'GEOMETRY', 6674, 0, 0);

CREATE VIRTUAL TABLE rtree_feature_geom USING rtree(id, minx, maxx, miny, maxy);

-- === Terrain edits ===========================================================
-- was World.terrain_edits. stack_order is mandatory: SQL rows have no
-- inherent order, but apply_terrain_edits (citymap/fields.py) blends each
-- edit against the ALREADY-ACCUMULATED result of prior edits and lets a
-- later edit win inside overlaps -- verified directly, that's what makes a
-- nested outer->inner stack of edits produce real terrace risers rather than
-- independent ramps against raw terrain. Losing this order silently breaks
-- terracing. Every read of this table must ORDER BY stack_order.

CREATE TABLE terrain_edit (
    fid INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT UNIQUE NOT NULL,
    geom GEOMETRY NOT NULL,           -- the benched/cut/filled area, SOURCE CRS
    target_elevation_m REAL NOT NULL,
    blend_m REAL NOT NULL DEFAULT 15.0,
    stack_order INTEGER NOT NULL,     -- application order; NOT a uniqueness constraint on its own
    group_id TEXT,                    -- ties a terrace's nested tiers together
    origin TEXT NOT NULL DEFAULT 'hand',
    created_at DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_terrain_edit_stack ON terrain_edit(stack_order);
CREATE INDEX idx_terrain_edit_group ON terrain_edit(group_id) WHERE group_id IS NOT NULL;

INSERT INTO gpkg_contents (table_name, data_type, identifier, srs_id) VALUES ('terrain_edit', 'features', 'terrain_edit', 6674);
INSERT INTO gpkg_geometry_columns (table_name, column_name, geometry_type_name, srs_id, z, m) VALUES ('terrain_edit', 'geom', 'POLYGON', 6674, 0, 0);

CREATE VIRTUAL TABLE rtree_terrain_edit_geom USING rtree(id, minx, maxx, miny, maxy);

-- === Road / rail graphs ======================================================
-- was RoadGraph (parse.py) -- two independent copies, one per network,
-- because a road and a railway that happen to end at the same point are a
-- coincidence, never a shared junction (see parse.py's own docstring on why
-- railways got their own graph). way_nodes' list order is preserved via
-- (way_id, seq) -- a plain UNIQUE constraint would let SQLite reorder rows
-- freely, but seq is read back with ORDER BY, same discipline as stack_order.

CREATE TABLE road_node (node_id INTEGER PRIMARY KEY, x REAL NOT NULL, y REAL NOT NULL);
CREATE TABLE road_way  (way_id INTEGER PRIMARY KEY, class TEXT NOT NULL);
CREATE TABLE road_way_node (
    way_id INTEGER NOT NULL REFERENCES road_way(way_id),
    seq INTEGER NOT NULL,
    node_id INTEGER NOT NULL REFERENCES road_node(node_id),
    PRIMARY KEY (way_id, seq)
);
CREATE INDEX idx_road_way_node_node ON road_way_node(node_id);

CREATE TABLE rail_node (node_id INTEGER PRIMARY KEY, x REAL NOT NULL, y REAL NOT NULL);
CREATE TABLE rail_way  (way_id INTEGER PRIMARY KEY, class TEXT NOT NULL);
CREATE TABLE rail_way_node (
    way_id INTEGER NOT NULL REFERENCES rail_way(way_id),
    seq INTEGER NOT NULL,
    node_id INTEGER NOT NULL REFERENCES rail_node(node_id),
    PRIMARY KEY (way_id, seq)
);
CREATE INDEX idx_rail_way_node_node ON rail_way_node(node_id);

-- === World-level singleton geometry (sea polygon) and lamps ================

CREATE TABLE world_geom (key TEXT PRIMARY KEY, geom GEOMETRY);  -- 'sea' -> SeaResult.sea_geom

CREATE TABLE lamp (
    fid INTEGER PRIMARY KEY AUTOINCREMENT,
    geom GEOMETRY NOT NULL
);
INSERT INTO gpkg_contents (table_name, data_type, identifier, srs_id) VALUES ('lamp', 'features', 'lamp', 6674);
INSERT INTO gpkg_geometry_columns (table_name, column_name, geometry_type_name, srs_id, z, m) VALUES ('lamp', 'geom', 'POINT', 6674, 0, 0);

-- === Narrative layer (NEW) ===================================================
-- Operation.when (ops/log.py) held session tags like "s09" and was read by
-- no tooling at all -- this table gives that idea a real, queryable home,
-- decoupled from being load-bearing for state reconstruction (unlike the
-- operation log it replaces).

CREATE TABLE annotation (
    id TEXT PRIMARY KEY,
    when_tag TEXT,             -- session/episode label, e.g. 's09'
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    geom GEOMETRY,              -- optional: pin to a location
    feature_ids TEXT NOT NULL DEFAULT '[]',  -- JSON array of feature.id
    created_at DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_annotation_when ON annotation(when_tag);

-- === Change log (NEW) ========================================================
-- Audit + undo. Deliberately NOT load-bearing for reconstructing current
-- state (that's the whole point of retiring the operation log) -- this is a
-- record of what happened, not a replay source.

CREATE TABLE change_log (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    ts DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    kind TEXT NOT NULL,        -- 'insert' | 'update' | 'delete'
    table_name TEXT NOT NULL,
    row_id TEXT NOT NULL,      -- the row's stable id (feature.id / terrain_edit.id / ...)
    before TEXT,               -- JSON snapshot, NULL for insert
    after TEXT,                -- JSON snapshot, NULL for delete
    batch_id TEXT,             -- groups a multi-row transaction into one undo step
    note TEXT
);
CREATE INDEX idx_change_log_batch ON change_log(batch_id) WHERE batch_id IS NOT NULL;

-- === Meta ====================================================================

CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT INTO meta (key, value) VALUES ('world_version', '0');
INSERT INTO meta (key, value) VALUES ('schema_version', '1');
