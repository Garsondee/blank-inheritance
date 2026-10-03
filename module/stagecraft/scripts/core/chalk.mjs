/**
 * Chalk: the strokes players leave on a scene's wall (chalk.md). Pure.
 *
 * A stroke is a line in fractions of the painting, so it sits on the art at any screen size and in any renderer.
 * This file decides what a stroke is, where chalk may be used, how strokes merge when several people draw at once,
 * what a rub-out does to them, and when a full wall must forget its oldest strokes. Where strokes are kept is the
 * foundry layer's business (a `ChalkStore`); nothing here knows.
 */

import { pointInPolygon } from "./zones.mjs";

export const LIMITS = Object.freeze({
  pointsPerStroke: 400,
  strokesPerScene: 800,
  quantum: 1000,          // points are kept to a thousandth of the painting
  simplify: 0.0015,       // nearly straight runs lose their middle points
  densify: 0.004          // the longest gap tested when rubbing out or clipping
});

export const COLOURS = Object.freeze(["white", "yellow", "pink", "blue", "green", "orange"]);
// fractions of the painting's width. Each is 35% under what it first was (0.0016, 0.003, 0.0055): she found the first lines
// too fat. Medium is what a stick draws unless asked otherwise.
export const SIZES = Object.freeze({ thin: 0.00104, medium: 0.00195, thick: 0.00358 });

/**
 * How a line of chalk is built up, from the outside in (chalk.md §5). Numbers only, so a test can hold the look to what she
 * asked for: a solid core, and only a slight fuzz outside it. A layer is the line stroked at `scale` times its width and
 * `alpha` opaque; the bites are the short streaks the wall shows through, and they are kept to the edge so the core stays whole.
 */
export const LOOK = Object.freeze({
  floor: 1.8,                                  // the narrowest a line is drawn, in pixels of the wall
  layers: Object.freeze([
    Object.freeze({ scale: 1.5, alpha: 0.06 }),   // a faint dusting
    Object.freeze({ scale: 1.26, alpha: 0.3 }),   // the soft edge
    Object.freeze({ scale: 1.0, alpha: 0.96 })    // the solid core
  ]),
  highlight: Object.freeze({ scale: 0.45, alpha: 0.22, lighten: 0.4 }),   // a brighter line down the middle
  bites: Object.freeze({
    from: 0.55, to: 0.8,                       // how far from the middle of the line a bite is centred, in widths
    every: 2.4,                                // one bite for this many pixels along the line
    long: [1.2, 3.6], thick: [0.3, 0.7],       // half a bite, along and across, in pixels
    alpha: [0.25, 0.75]
  })
});
export const MODES = Object.freeze(["off", "zones", "anywhere"]);
export const DEFAULT_BOX = Object.freeze([0.82, 0.84]);      // where the box of chalk stands when a scene does not say: well inside the visible middle

/** The box of chalk's measures, in world units (the pixels of the reference page at the front of the stage): the tray, a stick, and the larger shape a click can hit. */
export const BOX = Object.freeze({ width: 252, depth: 58, wall: 22, stick: { radius: 8, height: 62, spacing: 27, first: -98 }, hit: { radius: 13, height: 96 } });

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const q = (v) => Math.round(clamp01(v) * LIMITS.quantum);

/** Flat integers [x0, y0, x1, y1, ...] from points in fractions: the form strokes are stored in. */
export function quantise(points) {
  const out = [];
  for (const [x, y] of points) out.push(q(x), q(y));
  return out;
}

export function dequantise(flat) {
  const out = [];
  for (let i = 0; i + 1 < flat.length; i += 2) out.push([flat[i] / LIMITS.quantum, flat[i + 1] / LIMITS.quantum]);
  return out;
}

function perpendicular([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  const u = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + u * dx), py - (ay + u * dy));
}

/** Douglas-Peucker: drop the points that a straight line would pass within `eps` of. Keeps both ends. */
export function simplify(points, eps = LIMITS.simplify) {
  if (points.length < 3) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let worst = -1;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      const d = perpendicular(points[i], points[a], points[b]);
      if (d > worst) { worst = d; at = i; }
    }
    if (worst > eps) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return points.filter((_, i) => keep[i]);
}

/** Add points so no gap is longer than `gap`. */
export function densify(points, gap = LIMITS.densify) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    out.push(points[i]);
    if (i + 1 >= points.length) break;
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    const n = Math.floor(Math.hypot(bx - ax, by - ay) / gap);
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / (n + 1), ay + ((by - ay) * k) / (n + 1)]);
  }
  return out;
}

/** Thin a list of points evenly down to at most `n`, keeping both ends. */
function thin(points, n) {
  if (points.length <= n) return points;
  const out = [];
  for (let i = 0; i < n; i++) out.push(points[Math.round((i * (points.length - 1)) / (n - 1))]);
  return out;
}

/**
 * A stroke from a drawn path (points in fractions). Returns { ok, stroke, problems }.
 * The path is simplified, capped and quantised; a path that comes to nothing is not a stroke.
 */
export function makeStroke({ id, scene, by, at, colour = "white", size = "medium", points }) {
  const problems = [];
  if (!id) problems.push("a stroke needs an id");
  if (!scene) problems.push("a stroke needs a scene");
  if (!by) problems.push("a stroke needs the user who drew it");
  if (!COLOURS.includes(colour)) problems.push(`colour "${colour}" is not one of ${COLOURS.join(", ")}`);
  if (!(size in SIZES)) problems.push(`size "${size}" is not one of ${Object.keys(SIZES).join(", ")}`);
  if (!Array.isArray(points) || points.some((p) => !Array.isArray(p) || !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) problems.push("points must be a list of [x, y] fractions");
  if (problems.length) return { ok: false, stroke: null, problems };
  let pts = simplify(points.map(([x, y]) => [clamp01(x), clamp01(y)]));
  pts = thin(pts, LIMITS.pointsPerStroke);
  // a dot is a stroke of one point drawn twice, so a tap with the chalk leaves a mark
  if (pts.length === 1) pts = [pts[0], [pts[0][0] + 0.0005, pts[0][1]]];
  if (pts.length < 2) return { ok: false, stroke: null, problems: ["a stroke needs at least one point"] };
  return { ok: true, problems, stroke: { id, scene, by, at: at ?? 0, colour, size, p: quantise(pts) } };
}

export const pointsOf = (stroke) => dequantise(stroke.p);

export function strokeBounds(stroke) {
  const pts = pointsOf(stroke);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
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
 * Cut a drawn path to where chalk is allowed, so a line stops cleanly at a zone's edge instead of being refused.
 * Returns a list of paths (each a list of points); empty when nothing was allowed.
 */
export function clipPath(points, policy, zones) {
  if (policy.locked || policy.mode === "off") return [];
  if (policy.mode === "anywhere") return [points];
  const runs = [];
  let run = [];
  for (const p of densify(points)) {
    if (allowedAt(policy, zones, p[0], p[1])) run.push(p);
    else if (run.length) { runs.push(run); run = []; }
  }
  if (run.length) runs.push(run);
  return runs.filter((r) => r.length >= 1);
}

/* ---------------------------------------------------------------- several hands, one wall */

/** Merge the strokes of many pages into one wall: duplicates (same id) collapse, the order is by time then id. */
export function mergePages(pages) {
  const byId = new Map();
  for (const page of pages) for (const s of page.strokes ?? page) byId.set(s.id, s);
  return [...byId.values()].sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * Rub out along a path. Parts of strokes within `radius` of the path are removed; a stroke cut in two becomes two
 * strokes (`id.1`, `id.2`). `canTouch(stroke)` says whose strokes this hand may rub. Returns { removed, added }:
 * ids to delete and strokes to add; apply both.
 */
export function eraseAlong(strokes, path, radius, canTouch = () => true) {
  const removed = [];
  const added = [];
  const near = (x, y) => {
    for (let i = 0; i < path.length; i++) {
      const a = path[i];
      const b = path[i + 1] ?? a;
      if (perpendicular([x, y], a, b) <= radius) return true;
    }
    return false;
  };
  for (const s of strokes) {
    if (!canTouch(s)) continue;
    const dense = densify(pointsOf(s), radius / 2);
    const gone = dense.map(([x, y]) => near(x, y));
    if (!gone.some(Boolean)) continue;
    removed.push(s.id);
    let run = [];
    let n = 0;
    const flush = () => {
      if (run.length >= 2) {
        const r = makeStroke({ id: `${s.id}.${++n}`, scene: s.scene, by: s.by, at: s.at, colour: s.colour, size: s.size, points: run });
        if (r.ok) added.push(r.stroke);
      }
      run = [];
    };
    dense.forEach((p, i) => (gone[i] ? flush() : run.push(p)));
    flush();
  }
  return { removed, added };
}

/**
 * Keep a wall within its caps. Returns { keep, overflow }: the newest strokes to keep and the oldest, which a store
 * may bake into a picture of the wall and then forget as vectors (chalk.md §4.3).
 */
export function trimToCaps(strokes, max = LIMITS.strokesPerScene) {
  if (strokes.length <= max) return { keep: strokes, overflow: [] };
  const sorted = mergePages([strokes]);
  return { keep: sorted.slice(sorted.length - max), overflow: sorted.slice(0, sorted.length - max) };
}
