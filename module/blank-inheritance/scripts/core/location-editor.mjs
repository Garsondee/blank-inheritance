/**
 * The Location Editor's rules -- the pure half, shared by the Foundry panel
 * (foundry/location-editor.mjs, foundry/location-edits.mjs) and the repo-side
 * puller (tools/location-sync/), exactly the way core/scene-edits.mjs is
 * imported directly by both module/blank-inheritance/scripts/foundry/ and
 * tools/scene-edits/. design/location-editor.md is the design; nothing here
 * touches Foundry globals, the filesystem, or Python.
 *
 * Three shapes live here:
 *   1. PANEL FIELDS -- the metadata a GM edits while looking at the map
 *      (design/location-editor.md §3): a curated subset of location.schema.json,
 *      deliberately smaller than the whole file (cross-refs, realWorld and
 *      standing-depth prose stay Claude's own job, edited directly in the
 *      repo -- see the design doc for why).
 *   2. GEOMETRY -- plain {x,y} rings (already extracted from a Region
 *      document by the Foundry half, which is the only place PIXI/Foundry
 *      polygon objects may be touched) reduced to what a harvest record needs.
 *   3. RECORDS -- one immutable JSON file per save, `op` "create" | "update" |
 *      "geometry", mirroring core/scene-edits.mjs's record doctrine but
 *      whole-document rather than beat-path-addressed, because a location's
 *      panel fields are small enough to save as one unit the same way the old
 *      gazetteer's own Review mode already did (server.py's
 *      EDITABLE_LOCATION_FIELDS, saved whole, not per field).
 */

export const TIERS = Object.freeze(["region", "site", "point"]);

/** Which tiers each edit mode shows/allows drawing. design/location-editor.md §2. */
export const MODE_TIERS = Object.freeze({
  areas: Object.freeze(["region"]),
  places: Object.freeze(["site", "point"])
});

export function modeForTier(tier) {
  for (const [mode, tiers] of Object.entries(MODE_TIERS)) if (tiers.includes(tier)) return mode;
  return null;
}

export const CLASSIFICATIONS = Object.freeze([null, "public", "internal", "secret", "classified", "top-secret", "omega-zero"]);
export const DEPTHS = Object.freeze(["named", "sketch", "scene", "standing"]);

/* ------------------------------------------------------------------ */
/*  Panel fields                                                       */
/* ------------------------------------------------------------------ */

/** The blank form: every field the panel edits, at its schema default. */
export function emptyFields() {
  return {
    name: null,
    nameJa: null,
    kind: "",
    tags: [],
    rank: null,
    classification: null,
    depth: "named",
    lore: { summary: "", playerFacing: "", gmOnly: "" },
    scene: { hooks: [], activities: [] },
    note: ""
  };
}

/** Pull the panel-editable subset out of a full data/locations/<id>.json document. */
export function fieldsFromLocationDoc(doc) {
  const blank = emptyFields();
  if (!doc || typeof doc !== "object") return blank;
  return {
    name: doc.name ?? null,
    nameJa: doc.nameJa ?? null,
    kind: doc.kind ?? "",
    tags: Array.isArray(doc.tags) ? [...doc.tags] : [],
    rank: doc.rank ?? null,
    classification: doc.classification ?? null,
    depth: DEPTHS.includes(doc.depth) ? doc.depth : "named",
    lore: {
      summary: doc.lore?.summary ?? "",
      playerFacing: doc.lore?.playerFacing ?? "",
      gmOnly: doc.lore?.gmOnly ?? ""
    },
    scene: {
      hooks: Array.isArray(doc.scene?.hooks) ? [...doc.scene.hooks] : [],
      activities: Array.isArray(doc.scene?.activities) ? [...doc.scene.activities] : []
    },
    note: doc.authoring?.note ?? ""
  };
}

/**
 * Merge a fields object onto a full location document, touching only the
 * panel-owned keys -- everything else on `doc` (derived, geometry, refs,
 * authoring.status, realWorld...) passes through untouched. Used by
 * tools/location-sync when applying a clean (non-clashing) "update" record.
 */
export function applyFieldsToDoc(doc, fields) {
  const out = { ...doc };
  out.name = fields.name ?? null;
  out.nameJa = fields.nameJa ?? null;
  out.kind = fields.kind ?? "";
  out.tags = Array.isArray(fields.tags) ? [...fields.tags] : [];
  out.rank = fields.rank ?? null;
  out.classification = fields.classification ?? null;
  out.depth = DEPTHS.includes(fields.depth) ? fields.depth : "named";
  out.lore = {
    ...(doc.lore ?? {}),
    summary: fields.lore?.summary ?? "",
    playerFacing: fields.lore?.playerFacing ?? "",
    gmOnly: fields.lore?.gmOnly ?? ""
  };
  out.scene = {
    ...(doc.scene ?? {}),
    hooks: Array.isArray(fields.scene?.hooks) ? [...fields.scene.hooks] : [],
    activities: Array.isArray(fields.scene?.activities) ? [...fields.scene.activities] : []
  };
  out.authoring = { ...(doc.authoring ?? { status: "drafted" }), note: fields.note ?? "" };
  return out;
}

/**
 * Field-by-field clash check for an "update" record: for every panel field,
 * did the repo's CURRENT value already move away from `before` (what the
 * panel loaded)? A field the record didn't actually change (its `before`
 * equals its own `after`) is never a clash, however the repo has drifted --
 * only a genuine three-way disagreement counts.
 *
 * Returns `{ clashes: string[], clean: string[] }`, dot-paths into the fields
 * object ("lore.summary", "tags", ...). `clean` is safe to apply;
 * `tools/location-sync` applies only those and reports `clashes` for a human.
 */
export function fieldClashes(repoFields, record) {
  const clashes = [];
  const clean = [];
  const before = record.before ?? emptyFields();
  const after = record.fields ?? emptyFields();
  for (const path of PANEL_FIELD_PATHS) {
    const b = getPath(before, path);
    const a = getPath(after, path);
    if (deepEqual(b, a)) continue; // this save didn't touch this field
    const current = getPath(repoFields, path);
    if (deepEqual(current, b)) clean.push(path);
    else clashes.push(path);
  }
  return { clashes, clean };
}

export const PANEL_FIELD_PATHS = Object.freeze([
  "name", "nameJa", "kind", "tags", "rank", "classification", "depth",
  "lore.summary", "lore.playerFacing", "lore.gmOnly",
  "scene.hooks", "scene.activities",
  "note"
]);

function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function setPath(obj, path, value) {
  const keys = path.split(".");
  let node = obj;
  for (let i = 0; i < keys.length - 1; i++) node = node[keys[i]] ??= {};
  node[keys[keys.length - 1]] = value;
}

/** Apply only the listed clean paths from `record.fields` onto `repoFields`, returning a new object. */
export function applyCleanPaths(repoFields, record, cleanPaths) {
  const out = JSON.parse(JSON.stringify(repoFields));
  for (const path of cleanPaths) setPath(out, path, getPath(record.fields, path));
  return out;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === "object" && typeof b === "object") {
    const ak = Object.keys(a), bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    return ak.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

/* ------------------------------------------------------------------ */
/*  Geometry -- plain {x,y} rings, already extracted from a Region      */
/* ------------------------------------------------------------------ */

/**
 * The signed-area centroid of a single ring (list of {x,y}, not necessarily
 * closed). Used only for a point-tier location's own harvested point (a
 * circle drawn as a stand-in for a pin, §2 of the design doc) -- never for
 * `derived.centroidPx`, which stays a repo-side, Python-computed field for
 * every tier, region/site included.
 */
export function ringCentroid(ring) {
  if (!ring || ring.length === 0) return null;
  if (ring.length === 1) return { x: ring[0].x, y: ring[0].y };
  let area = 0, cx = 0, cy = 0;
  for (let i = 0; i < ring.length; i++) {
    const p0 = ring[i];
    const p1 = ring[(i + 1) % ring.length];
    const cross = p0.x * p1.y - p1.x * p0.y;
    area += cross;
    cx += (p0.x + p1.x) * cross;
    cy += (p0.y + p1.y) * cross;
  }
  area /= 2;
  if (Math.abs(area) < 1e-9) {
    // Degenerate (a line, or a near-zero circle) -- fall back to the plain average.
    const n = ring.length;
    return { x: ring.reduce((s, p) => s + p.x, 0) / n, y: ring.reduce((s, p) => s + p.y, 0) / n };
  }
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

/** Point-in-polygon (even-odd rule), ring as [{x,y}, ...] -- draw.js#hitTestAt's own test, shared here so a single click (hit-test) and a lasso/box multi-select all use exactly the same rule. */
export function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/**
 * The point that stands in for a session item's location in a box/lasso
 * select -- its own point for point-tier, or its ring's centroid for a
 * polygon. `item.geometry.ringPx`/`pointPx` are `[x,y]` pairs (the session's
 * own storage shape, §3.4); this is the one place that reads them as `{x,y}`
 * to hand to `ringCentroid`.
 */
export function itemAnchorPoint(item) {
  if (item.geometry.kind === "point") {
    const [x, y] = item.geometry.pointPx;
    return { x, y };
  }
  return ringCentroid(item.geometry.ringPx.map(([x, y]) => ({ x, y })));
}

/**
 * Every session item whose anchor point falls inside the axis-aligned rect
 * `{x0,y0,x1,y1}` -- the Select tool's own drag-box gesture (design doc
 * §3.2's ported marquee, restricted here to session items only: adopting a
 * real, not-yet-drawn building this way needs the buildings index, Phase
 * 2/3, not yet built -- design doc §8).
 */
export function itemsInRect(items, rect) {
  return items
    .filter((item) => {
      const p = itemAnchorPoint(item);
      return p.x >= rect.x0 && p.x <= rect.x1 && p.y >= rect.y0 && p.y <= rect.y1;
    })
    .map((item) => item.localId);
}

/** Every session item whose anchor point falls inside the freehand `ring` (`[{x,y}, ...]`) -- the Lasso tool, same session-items-only scope as `itemsInRect`. */
export function itemsInPolygon(items, ring) {
  if (!ring || ring.length < 3) return [];
  return items
    .filter((item) => {
      const p = itemAnchorPoint(item);
      return pointInRing(p.x, p.y, ring);
    })
    .map((item) => item.localId);
}

function segmentIntersection(a, b, c, d) {
  const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]];
  const denom = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(denom) < 1e-12) return null;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / denom;
  const u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [a[0] + t * r[0], a[1] + t * r[1]];
}

function distanceToRing(p, ring) {
  let best = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
    best = Math.min(best, Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy)));
  }
  return best;
}

/**
 * How many times a drawn cut line meets a region's boundary (image px, `[x,y]`
 * pairs) -- the live half of design doc §10 phase 2c's check. A bisect must
 * meet it exactly twice; reconcile.py#bisect_region refuses anything else,
 * but only at pull time. An endpoint within `tolerance` of the boundary
 * counts as a meeting (bisect_region snaps such ends onto it). Distinct
 * meetings closer than `tolerance` are one. Not a full substitute for
 * shapely (a cut can meet the boundary twice and still divide it oddly on a
 * strongly concave shape), so a count of 2 is "plausible", not "certain".
 */
export function cutBoundaryMeetings(ring, cut, tolerance = 5) {
  const meetings = [];
  const add = (p) => { if (!meetings.some((m) => Math.hypot(m[0] - p[0], m[1] - p[1]) <= tolerance)) meetings.push(p); };
  for (let i = 0; i < cut.length - 1; i++) {
    for (let j = 0; j < ring.length; j++) {
      const hit = segmentIntersection(cut[i], cut[i + 1], ring[j], ring[(j + 1) % ring.length]);
      if (hit) add(hit);
    }
  }
  for (const end of [cut[0], cut[cut.length - 1]]) {
    if (distanceToRing(end, ring) <= tolerance) add(end);
  }
  return meetings.length;
}

/**
 * Shape a Region's extracted rings (see foundry/location-editor.mjs's
 * `ringsFromRegion`, which walks `RegionDocument#polygonTree` -- the only
 * place that touches a Foundry/PIXI object) into the `geometry` a harvest
 * record carries, given the tier the panel is authoring in.
 *
 * `shellRings` is `[{shell: [{x,y},...], holes: [[{x,y},...], ...]}, ...]` --
 * one entry per disjoint top-level shape. Every tier except a deliberately
 * multi-part region must resolve to exactly one; more than one shell is
 * refused rather than silently taking the largest, so a GM who drew two
 * separate buildings under one Region finds out immediately, not after
 * promotion split them unpredictably.
 */
export function geometryForRecord(tier, shellRings) {
  if (!Array.isArray(shellRings) || shellRings.length === 0) {
    return { ok: false, problems: ["Nothing is drawn -- select or draw a shape first."], geometry: null };
  }
  if (shellRings.length > 1) {
    return {
      ok: false,
      problems: ["This Region has more than one disconnected shape. Split it into separate Regions, one per location."],
      geometry: null
    };
  }
  const { shell, holes } = shellRings[0];
  if (!shell || shell.length < 3) {
    return { ok: false, problems: ["The drawn shape has fewer than 3 points."], geometry: null };
  }
  if (tier === "point") {
    const centre = ringCentroid(shell);
    return { ok: true, problems: [], geometry: { rings: [], point: [centre.x, centre.y] } };
  }
  const rings = [ptsToPairs(shell), ...holes.map(ptsToPairs)];
  return { ok: true, problems: [], geometry: { rings, point: null } };
}

function ptsToPairs(points) {
  return points.map((p) => [p.x, p.y]);
}

/* ------------------------------------------------------------------ */
/*  Records                                                             */
/* ------------------------------------------------------------------ */

export const RECORD_KIND = "location-edit";
export const RECORD_VERSION = 1;
export const RECORD_PREFIX = "location-edit-";
export const OPS = Object.freeze(["create", "update", "geometry", "split"]);

/** `<time>-<rand>`, matching core/scene-edits.mjs's own id shape exactly. */
export function makeRecordId(at, rand) {
  return `${String(at).replace(/[:.]/g, "")}-${rand}`;
}

export function recordFilename(record) {
  return `${RECORD_PREFIX}${record.id}.json`;
}

export function recordIdFromFilename(filename) {
  const m = /^location-edit-(.+)\.json$/.exec(filename);
  return m ? m[1] : null;
}

/**
 * Build one immutable record. `spec.at`/`spec.rand`/`spec.by` are supplied by
 * the caller (the Foundry half stamps wall-clock time and the acting user;
 * a test supplies fixed values) rather than read from a global clock here,
 * so this stays a pure function.
 */
export function makeRecord(spec) {
  const {
    at, rand, by = null, op, locationId = null, tier, draftId = null,
    geometry = null, fields = null, before = null
  } = spec;
  if (!OPS.includes(op)) throw new Error(`makeRecord: unknown op "${op}"`);
  if (!TIERS.includes(tier)) throw new Error(`makeRecord: unknown tier "${tier}"`);
  return {
    kind: RECORD_KIND,
    version: RECORD_VERSION,
    id: makeRecordId(at, rand),
    at,
    by,
    op,
    locationId,
    tier,
    draftId,
    geometry,
    fields,
    before
  };
}

/** Structural problems with a record, as a list. Empty means usable. Mirrors core/scene-edits.mjs#validateRecord's shape. */
export function validateRecord(record) {
  const problems = [];
  if (!record || typeof record !== "object") return ["not an object"];
  if (record.kind !== RECORD_KIND) problems.push(`kind is ${JSON.stringify(record.kind)}, not "${RECORD_KIND}"`);
  if (record.version !== RECORD_VERSION) problems.push(`version ${record.version} is not ${RECORD_VERSION}`);
  if (typeof record.id !== "string" || !record.id) problems.push("no id");
  if (typeof record.at !== "string") problems.push("no at");
  if (!OPS.includes(record.op)) problems.push(`op ${JSON.stringify(record.op)} is not one of ${OPS.join("/")}`);
  if (!TIERS.includes(record.tier)) problems.push(`tier ${JSON.stringify(record.tier)} is not one of ${TIERS.join("/")}`);
  if (record.op === "create" && record.locationId !== null) problems.push('op "create" must have locationId null');
  if (record.op !== "create" && typeof record.locationId !== "string") problems.push(`op "${record.op}" needs a locationId`);
  if ((record.op === "create" || record.op === "geometry" || record.op === "split") && !record.geometry) problems.push(`op "${record.op}" needs geometry`);
  if (record.op === "update" && record.geometry !== null) problems.push('op "update" must have geometry null');
  if ((record.op === "create" || record.op === "update") && !record.fields) problems.push(`op "${record.op}" needs fields`);
  if ((record.op === "geometry" || record.op === "split") && record.fields !== null) problems.push(`op "${record.op}" must have fields null`);
  return problems;
}

export function sortRecords(records) {
  return [...records].sort((a, b) => String(a.at).localeCompare(String(b.at)) || String(a.id).localeCompare(String(b.id)));
}

/* ------------------------------------------------------------------ */
/*  The session -- draft items not yet saved to the repo               */
/*                                                                      */
/*  Restored from tools/gazetteer/core/session.py's role (design/       */
/*  location-editor.md §3.4, §1.4): once shapes stopped being Foundry   */
/*  documents, a drawn-but-unsaved item needed its own place to live    */
/*  again, the same way it did in the browser tool. Pure data ops only  */
/*  -- foundry/location-editor.mjs autosaves the result into            */
/*  storage/location-draw-session.json after every call that returns a  */
/*  changed session.                                                    */
/* ------------------------------------------------------------------ */

export const SESSION_KIND = "location-draw-session";
export const SESSION_VERSION = 1;

export function emptySession() {
  return { kind: SESSION_KIND, version: SESSION_VERSION, nextLocalId: 1, items: {} };
}

/** True if `session` looks like something emptySession() could have produced or grown from. */
export function isValidSession(session) {
  return Boolean(
    session && typeof session === "object" &&
    session.kind === SESSION_KIND &&
    session.version === SESSION_VERSION &&
    session.items && typeof session.items === "object" &&
    Number.isInteger(session.nextLocalId)
  );
}

/**
 * Add a freshly-drawn item. `geometry` is already in scene pixels (converted
 * to image pixels only at save time, §4) -- `{kind:"polygon", ringPx, holesPx}`
 * or `{kind:"point", pointPx}`. Returns `{session, item}`; the caller (the
 * draw layer) decides what to do with the new item's `localId`.
 */
export function addDraftItem(session, { tier, geometry, name = null }) {
  if (!TIERS.includes(tier)) throw new Error(`addDraftItem: unknown tier "${tier}"`);
  const localId = `draft-${session.nextLocalId}`;
  const item = { localId, tier, geometry, name, locationId: null, locked: false, fields: emptyFields() };
  return {
    session: { ...session, nextLocalId: session.nextLocalId + 1, items: { ...session.items, [localId]: item } },
    item
  };
}

/** Replace one item's geometry (a vertex drag, a nudge, a re-adopt). */
export function updateItemGeometry(session, localId, geometry) {
  const item = session.items[localId];
  if (!item) return session;
  return { ...session, items: { ...session.items, [localId]: { ...item, geometry } } };
}

/** Replace one item's panel fields (name/lore/tags/... -- see `PANEL_FIELD_PATHS`) and/or its name label. */
export function updateItemFields(session, localId, fields) {
  const item = session.items[localId];
  if (!item) return session;
  return { ...session, items: { ...session.items, [localId]: { ...item, fields, name: fields.name ?? item.name } } };
}

/** Mark an item as linked to a real (possibly still-minting) location id, and locked against reshaping by accident. */
export function linkItemToLocation(session, localId, locationId) {
  const item = session.items[localId];
  if (!item) return session;
  return { ...session, items: { ...session.items, [localId]: { ...item, locationId, locked: true } } };
}

export function removeItem(session, localId) {
  if (!(localId in session.items)) return session;
  const items = { ...session.items };
  delete items[localId];
  return { ...session, items };
}

export function sessionItemList(session) {
  return Object.values(session.items).sort((a, b) => a.localId.localeCompare(b.localId));
}
