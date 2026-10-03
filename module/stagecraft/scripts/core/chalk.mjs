/**
 * Chalk: what players paint on a scene's wall (chalk.md). Pure.
 *
 * Since 2026-10-03 chalk is painted, not drawn as lines (Ingram: "raster preferred to vector"). The wall is a grid of
 * square tiles of pixels laid over the painting; everyone who paints has a layer of their own, so two people painting at
 * once never overwrite each other and a player's eraser touches only their own paint; the wall shows every layer, one
 * over another. A layer keeps only the tiles that have paint on them, each as a small picture, and a short history of what
 * its tiles held before each of its last strokes, so a stroke can be taken back. This file decides where chalk may be
 * used, how the wall is cut into tiles, and how layers and history are kept in order. Pixels are the renderer's
 * (render/paint/), and where layers are kept is the foundry layer's (chalk-store.mjs).
 */

import { pointInPolygon } from "./zones.mjs";

export const MODES = Object.freeze(["off", "zones", "anywhere"]);

/** The colours of the box's sticks of chalk, in the order they stand. Any other colour is magic chalk's. */
export const PALETTE = Object.freeze({ white: "#f2ecdc", yellow: "#eed46c", pink: "#eba0b8", blue: "#8fc0e0", green: "#97d09c", orange: "#eea060" });
export const COLOURS = Object.freeze(Object.keys(PALETTE));

/** Where the box of chalk stands when a scene does not say: well inside the visible middle. */
export const DEFAULT_BOX = Object.freeze([0.82, 0.84]);

/**
 * The box of chalk's measures, in world units (the pixels of the reference page at the front of the stage): the tray, a
 * stick, the larger shape a click can hit, and where the magic stick and the eraser lie.
 */
export const BOX = Object.freeze({
  width: 300, depth: 58, wall: 22,
  stick: Object.freeze({ radius: 8, height: 62, spacing: 27, first: -122 }),
  hit: Object.freeze({ radius: 13, height: 96 }),
  magic: Object.freeze({ x: 58, radius: 9, height: 70 }),
  eraser: Object.freeze({ x: 112 })
});

/* ---------------------------------------------------------------- where the box stands */

const BOX_YAW = (-10 * Math.PI) / 180;               // the box is set down a little askew (both pictures)
const BOX_TOP = 4 + BOX.hit.height - 14;             // the top of the shapes a click can hit, above the floor
const BOX_MARGIN = 8;                                // room kept between the box and whatever covers the stage

/**
 * The box's outline on the reference page (`rigspace.mjs`) when it stands at `at` (fractions of the painting): every part
 * of it a click can reach, from the floor to the top of the sticks. Null above the horizon.
 */
export function boxOnPage(rig, at) {
  const place = rig.standing(at);
  if (!place) return null;
  const c = Math.cos(BOX_YAW);
  const s = Math.sin(BOX_YAW);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const lx of [-BOX.width / 2, BOX.width / 2]) {
    for (const ly of [0, BOX_TOP]) {
      for (const lz of [-BOX.depth / 2, BOX.depth / 2]) {
        const p = rig.screenOf(place.X + lx * c + lz * s, ly, place.Z - lx * s + lz * c);
        x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
      }
    }
  }
  return { x0, y0, x1, y1 };
}

/** Does a shape ({ rect: [x0, y0, x1, y1] } or { circle: [cx, cy, r] }) touch a rectangle? */
function touches(shape, r) {
  if (shape.rect) { const [a, b, c, d] = shape.rect; return !(c < r.x0 || a > r.x1 || d < r.y0 || b > r.y1); }
  if (shape.circle) {
    const [cx, cy, radius] = shape.circle;
    const nx = Math.max(r.x0, Math.min(cx, r.x1));
    const ny = Math.max(r.y0, Math.min(cy, r.y1));
    return (nx - cx) ** 2 + (ny - cy) ** 2 <= radius ** 2;
  }
  return false;
}

/**
 * Where the box of chalk stands: where the scene put it, unless something on the screen covers it there (found live
 * 2026-10-03: on the GM's screen the adventure's deck and Foundry's macro bar lay over the box, and only three of its
 * sticks could be clicked); then the nearest place on the floor, further back or a little to one side, where nothing does
 * and it is wholly on the screen. `cover` is [{ rect } | { circle }] on the reference page; `screen` is the part of the page
 * the screen shows, { x0, y0, x1, y1 }. Returns [fx, fy]: the scene's own spot when nowhere is clear.
 */
export function boxSpot(rig, at, cover = [], screen = null) {
  const clear = (spot) => {
    const r = boxOnPage(rig, spot);
    if (!r) return false;
    const room = { x0: r.x0 - BOX_MARGIN, y0: r.y0 - BOX_MARGIN, x1: r.x1 + BOX_MARGIN, y1: r.y1 + BOX_MARGIN };
    if (screen && (room.x0 < screen.x0 || room.x1 > screen.x1 || room.y0 < screen.y0 || room.y1 > screen.y1)) return false;
    return !cover.some((shape) => touches(shape, room));
  };
  if (clear(at)) return [at[0], at[1]];
  const tries = [];
  for (let back = 0; back <= 30; back++) for (let side = -10; side <= 10; side++) tries.push([back / 100, side / 50]);
  // further back costs a little more than to one side, so the box stays near where the scene put it
  tries.sort((p, q) => p[0] * 1.2 + Math.abs(p[1]) - (q[0] * 1.2 + Math.abs(q[1])));
  for (const [back, side] of tries) {
    const spot = [Math.round((at[0] + side) * 1000) / 1000, Math.round((at[1] - back) * 1000) / 1000];
    if (spot[0] < 0.03 || spot[0] > 0.97) continue;
    if (clear(spot)) return spot;
  }
  return [at[0], at[1]];
}

/* ---------------------------------------------------------------- the wall: tiles of pixels */

/** The wall is as tall as the reference page (1440 pixels) and as wide as the painting's shape makes it, in tiles of 240. */
export const WALL = Object.freeze({ height: 1440, tile: 240, maxWidth: 4320 });

/** The grid of a painting's wall: { w, h, tile, cols, rows }. */
export function wallGrid(painting) {
  const [iw, ih] = painting?.size ?? [2, 1];
  const h = WALL.height;
  const w = Math.min(WALL.maxWidth, Math.max(WALL.tile, Math.round((h * iw) / ih)));
  return { w, h, tile: WALL.tile, cols: Math.ceil(w / WALL.tile), rows: Math.ceil(h / WALL.tile) };
}

export const tileKey = (c, r) => `c${c}r${r}`;

/** { c, r } from a tile's key, or null if it is not one. */
export function parseTileKey(key) {
  const m = /^c(\d{1,3})r(\d{1,3})$/.exec(String(key));
  return m ? { c: Number(m[1]), r: Number(m[2]) } : null;
}

/** Is this a key of a tile on this grid? */
export function validTileKey(grid, key) {
  const t = parseTileKey(key);
  return !!t && t.c < grid.cols && t.r < grid.rows;
}

/** A tile's rectangle on the wall, in wall pixels (the last column and row may be narrower). */
export function tileRect(grid, key) {
  const t = parseTileKey(key);
  if (!t) return null;
  const x = t.c * grid.tile;
  const y = t.r * grid.tile;
  return { x, y, w: Math.min(grid.tile, grid.w - x), h: Math.min(grid.tile, grid.h - y) };
}

/** The keys of the tiles a rectangle of the wall touches, clamped to the wall. */
export function tilesFor(grid, { x0, y0, x1, y1 }) {
  const c0 = Math.max(0, Math.floor(x0 / grid.tile));
  const r0 = Math.max(0, Math.floor(y0 / grid.tile));
  const c1 = Math.min(grid.cols - 1, Math.floor(x1 / grid.tile));
  const r1 = Math.min(grid.rows - 1, Math.floor(y1 / grid.tile));
  const out = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) out.push(tileKey(c, r));
  return out;
}

/** A point of the painting (fractions) as a point of the wall (pixels), and back. */
export const toWall = (grid, fx, fy) => ({ x: fx * grid.w, y: fy * grid.h });
export const toFraction = (grid, x, y) => ({ x: x / grid.w, y: y / grid.h });

/* ---------------------------------------------------------------- layers and their history */

/** How many of its last strokes a layer can take back (each keeps what its tiles held before, so a page grows with it). */
export const HISTORY = 8;

/** A step's id: unique, made by the painter's browser, and in time order when compared as text. */
export const stepId = (now, salt = "") => `${String(Math.floor(now)).padStart(14, "0")}-${salt}`;

/**
 * The layers of a scene in the order they are drawn, bottom first: by when each painter first painted here, then by who.
 * `layers` are [{ by, since, ... }].
 */
export function layerOrder(layers) {
  return [...layers].sort((a, b) => (a.since ?? 0) - (b.since ?? 0) || String(a.by).localeCompare(String(b.by)));
}

/**
 * The newest step in some layers' histories, or null: { layer, id, step }. `by` limits it to one painter's layer (a
 * player's own undo); without it, the newest on the whole wall (the GM's Undo).
 */
export function newestStep(layers, { by = null } = {}) {
  let best = null;
  for (const layer of layers) {
    if (by && layer.by !== by) continue;
    for (const [id, step] of Object.entries(layer.history ?? {})) {
      if (!step || typeof step !== "object") continue;
      if (!best || (step.at ?? 0) > (best.step.at ?? 0) || ((step.at ?? 0) === (best.step.at ?? 0) && id > best.id)) best = { layer, id, step };
    }
  }
  return best;
}

/** The ids of a history's oldest steps, past the newest `keep`. */
export function overflowSteps(history, keep = HISTORY) {
  const ids = Object.entries(history ?? {}).sort(([a, x], [b, y]) => (x?.at ?? 0) - (y?.at ?? 0) || (a < b ? -1 : a > b ? 1 : 0)).map(([id]) => id);
  return ids.slice(0, Math.max(0, ids.length - keep));
}

/* ---------------------------------------------------------------- where chalk may be used */

/** The mode and whether the wall is frozen, from the scene's authored policy and the GM's live override. */
export function effectivePolicy(chalk, override = null) {
  const mode = override?.mode && MODES.includes(override.mode) ? override.mode : chalk?.mode ?? "off";
  const locked = override?.locked === true || (override?.locked === undefined && chalk?.lock === true);
  return { mode, locked };
}

/** The GM's override button goes round: as the scene says (null), off, zones only, anywhere, and back to the scene. */
export const OVERRIDE_CYCLE = Object.freeze([null, "off", "zones", "anywhere"]);
export const nextOverride = (now) => OVERRIDE_CYCLE[(OVERRIDE_CYCLE.indexOf(now ?? null) + 1) % OVERRIDE_CYCLE.length];

/** May chalk touch this point of the painting? */
export function allowedAt(policy, zones, x, y) {
  if (policy.locked || policy.mode === "off") return false;
  if (policy.mode === "anywhere") return true;
  return zones.some((z) => z.kind === "chalk" && pointInPolygon(z.shape, x, y));
}

/** Is there a box of chalk to show at all? */
export function boxVisible(policy, zones) {
  if (policy.mode === "off" || policy.locked) return false;
  return policy.mode === "anywhere" || zones.some((z) => z.kind === "chalk");
}

/**
 * The shapes paint is kept inside, in fractions of the painting, or null when it may go anywhere: in "zones only" a
 * stroke is masked by the scene's chalk zones, so it stops exactly at a zone's edge, however it was drawn.
 */
export function paintMask(policy, zones) {
  if (policy.mode !== "zones") return null;
  return zones.filter((z) => z.kind === "chalk").map((z) => z.shape);
}
