/**
 * Turning a planRoute() polyline into motion — the pure half.
 *
 * Layer 1 of ideas/entries/road-network-routing.json: travel-route.mjs's
 * output is geometry in the campaign map's own full-image pixel space
 * (12400x12400 as exported by tools/gazetteer/export_travel_graph.py), not
 * Scene canvas space. Getting from one to the other needs both a scale AND
 * an origin offset — proven wrong once already, worth recording precisely so
 * it isn't re-guessed the same way: an early version of this file assumed a
 * scale-only relationship (`scale = scene.width / manifest.image.width`,
 * no offset), verified live 2026-09-18 against the LOCAL test world's own
 * map Scene ("The City": a single 6200x6200 background image, Scene
 * padding 0). That check passed, but it wasn't the scene Ingram actually
 * uses — "the remote server has the right version of the map... full
 * resolution and it's across four tiles... we need the full resolution for
 * it to look good." Reading the real remote Scene document directly (via
 * tools/pack-extractor against a copy of its LevelDB store — never guessed
 * from Foundry's `padding` field, which for this Scene is 0.25 and does
 * NOT match a naive `width * padding` offset) found four real Tile
 * documents, each a genuine, unscaled 6200x6200 PNG (confirmed against the
 * file's own PNG header, not assumed from the Tile document's width/height
 * alone) positioned at canvas (6300,6300) / (12500,6300) / (6300,12500) /
 * (12500,12500) — i.e. scale 1.0 (this scene uses the master at full
 * resolution, hence no scale error to begin with) but a REAL (6300, 6300)
 * origin offset that a scale-only model would have silently ignored, and
 * "The City" happens to be the one scene where that offset happens to be
 * zero, which is exactly how a scale-only assumption survives one working
 * example and then fails on the one that matters.
 *
 * `sceneCalibration` derives origin + scale from whatever the Scene
 * actually has, generically rather than from per-scene hardcoded numbers:
 * when the Scene has Tiles, the origin is the top-left corner of their
 * combined bounding box and the scale is that bounding box's width divided
 * by the master image's own width (so a 4-tile full-resolution layout comes
 * out to scale 1, and an N-tile layout of any size would too); with no
 * Tiles, it falls back to the single-background-image case this file
 * originally verified — origin (0,0), `scale = scene.width /
 * manifest.image.width`. A background image placed with nonzero padding
 * is not handled by that fallback and hasn't come up in practice.
 *
 * `hopDurations` deliberately does not animate anything itself — it turns a
 * route + a total travel time into a per-hop duration list, so the Foundry
 * adapter can drive Foundry's OWN per-Token update animation hop by hop
 * (`TokenDocument#update(data, {animation: {duration}})`) rather than this
 * module reimplementing tweening. Constant apparent speed along the whole
 * route: a hop's share of the total duration equals its share of the
 * route's total length, so a long straight stretch takes proportionally
 * longer to watch than a short one, not the same time as every other hop.
 */

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * `tiles` is a Scene's `tiles` contents as plain `{x, y, width, height,
 * texture: {anchorX, anchorY}}` objects (or anything read-alike — this
 * doesn't touch Foundry, so a live TileDocument works unchanged).
 * `sceneWidth` and `manifestImageWidth` are the Scene's own `width` and the
 * master map image's pixel width (data/map/campaign-map.json's
 * `image.width`). Returns `{originX, originY, scale}` for
 * `toScenePoint`/`toImagePoint` below.
 *
 * A Tile's own `x`/`y` is NOT its top-left corner in general — it is the
 * point on the tile selected by its texture anchor (Foundry v14
 * TileDocument's own TextureData field, common/documents/tile.mjs), which
 * **defaults to 0.5/0.5** — every Tile Foundry creates is centre-anchored
 * unless something explicitly overrides it, this hub's four real Tiles
 * included. Found live 2026-09-23: this function assumed top-left (x, y)
 * unconditionally, so every point it produced was a full half-tile-width
 * and half-tile-height off (3100px on this hub's 6200px tiles) — enough to
 * land a real, correctly-authored gazetteer location's pin a full grid
 * square away from the land it names, out in open water, while still
 * looking self-consistent under any check that only re-applied this same
 * (buggy) formula to invert itself. Genuine ground-truth cross-checks (the
 * map's own baked-in grid references, and a live screenshot) are what
 * caught it; a round-trip check through the same function could not.
 * core/travel-animation.mjs's own travel marker shares this function, so it
 * carried the identical bug the whole time, not just the map pins that
 * happened to surface it.
 */
export function sceneCalibration(tiles, sceneWidth, manifestImageWidth) {
  if (tiles.length === 0) {
    return { originX: 0, originY: 0, scale: sceneWidth / manifestImageWidth };
  }
  const topLeftX = (t) => t.x - t.width * (t.texture?.anchorX ?? 0.5);
  const topLeftY = (t) => t.y - t.height * (t.texture?.anchorY ?? 0.5);
  const originX = Math.min(...tiles.map(topLeftX));
  const originY = Math.min(...tiles.map(topLeftY));
  const extentX = Math.max(...tiles.map((t) => topLeftX(t) + t.width)) - originX;
  return { originX, originY, scale: extentX / manifestImageWidth };
}

/** Master-image pixel `{x,y}` -> this Scene's own canvas `{x,y}`. */
export function toScenePoint(point, calibration) {
  return {
    x: point.x * calibration.scale + calibration.originX,
    y: point.y * calibration.scale + calibration.originY
  };
}

/** The inverse of `toScenePoint` — Scene canvas `{x,y}` -> master-image pixel `{x,y}`. */
export function toImagePoint(point, calibration) {
  return {
    x: (point.x - calibration.originX) / calibration.scale,
    y: (point.y - calibration.originY) / calibration.scale
  };
}

/**
 * `segments` is `planRoute()`'s own `segments` array. Returns one flat,
 * de-duplicated point list (a segment's last point repeats the next
 * segment's first — that seam is dropped here rather than by the caller).
 */
export function flattenRoute(segments) {
  const points = [];
  for (const segment of segments) {
    for (const p of segment.points) {
      const last = points[points.length - 1];
      if (!last || last.x !== p.x || last.y !== p.y) points.push(p);
    }
  }
  return points;
}

/**
 * `points` (already flattened, in the space you want to animate in) and a
 * total travel time -> `[{to, durationMs}, ...]`, one entry per hop (i.e.
 * `points.length - 1` entries; `points[0]` is the starting position, never
 * itself a hop target). A route with zero length (every point coincides, or
 * fewer than two points) returns an empty list — there is nothing to
 * animate, not a division by zero.
 */
export function hopDurations(points, totalDurationMs) {
  if (points.length < 2) return [];
  const hopLengths = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = distance(points[i - 1], points[i]);
    hopLengths.push(d);
    total += d;
  }
  if (total === 0) return [];
  return hopLengths.map((d, i) => ({ to: points[i + 1], durationMs: (d / total) * totalDurationMs }));
}
