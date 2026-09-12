/**
 * What shape is this building, how big is it, how much story can it hold?
 * — browser half.
 *
 * The twin of core/shape.py, held to it by test/fixtures/gazetteer-shape-cases.json
 * which both suites assert against. Read the Python module's docstring for the
 * argument; this file is the same arithmetic and the same sentences.
 *
 * Why a twin rather than a server call: the inspector shows this the moment a
 * shape is selected and updates it while vertices are dragged. A round trip
 * per drag frame would be the wrong shape, and the numbers have to agree with
 * whatever the promotion path computes or the tool is lying in one of the two
 * places.
 *
 * Pure arithmetic, no imports, no browser globals — the same rule the grid and
 * depth pairs live under.
 */

/** Metres per storey where only a storey count is known. Matches parse.py. */
export const LEVEL_HEIGHT_M = 3.3;

/** Fraction of a footprint that ends up usable interior. Advice only. */
export const USABLE_FRACTION = 0.8;

/** Floor area one group-sized space needs. */
export const ROOM_M2 = 20.0;

/** Length:width past which a plan reads as a line rather than a block. */
export const STRIP_ELONGATION = 3.0;

/**
 * The minimum-area rectangle's short side, below which there is no room in
 * there at all. Six metres is one room's depth plus its walls. This, not the
 * ratio, is what gates — see shape.py for the measurement that settled it.
 */
export const SLIVER_WIDTH_M = 6.0;

export const BLOCKY_RECTANGULARITY = 0.85;
export const COMPLEX_RECTANGULARITY = 0.62;

export const SHAPES = ["degenerate", "sliver", "strip", "blocky", "complex", "irregular"];

/** Total floor area needed to carry each depth rung. Mirrors CAPACITY_FLOORS. */
export const CAPACITY_FLOORS = [
  [1500.0, "standing"],
  [200.0, "scene"],
  [30.0, "sketch"],
  [0.0, "named"],
];

const DEPTH_ORDER = ["named", "sketch", "scene", "standing"];

// --- primitive geometry ------------------------------------------------------

function same(a, b, eps = 1e-9) {
  return Math.abs(a[0] - b[0]) <= eps && Math.abs(a[1] - b[1]) <= eps;
}

function openRing(ring) {
  const pts = ring.map(([x, y]) => [Number(x), Number(y)]);
  while (pts.length > 1 && same(pts[0], pts[pts.length - 1])) pts.pop();
  return pts;
}

export function polygonArea(ring) {
  const pts = openRing(ring);
  if (pts.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    total += x1 * y2 - x2 * y1;
  }
  return Math.abs(total) / 2;
}

export function polygonPerimeter(ring) {
  const pts = openRing(ring);
  if (pts.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    total += Math.hypot(x2 - x1, y2 - y1);
  }
  return total;
}

/** Andrew's monotone chain. Falls back to the distinct points when collinear. */
export function convexHull(points) {
  const seen = new Set();
  const pts = [];
  for (const [x, y] of points) {
    const key = `${Number(x)},${Number(y)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pts.push([Number(x), Number(y)]);
  }
  pts.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  if (pts.length <= 2) return pts;

  const cross = (o, a, b) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i -= 1) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  return hull.length >= 3 ? hull : pts;
}

function normAngle(a) {
  const m = a % Math.PI;
  return m < 0 ? m + Math.PI : m;
}

/**
 * Minimum-area enclosing rectangle: [length, width, angleRad].
 *
 * Rotating calipers over the convex hull. The minimum-area rectangle always
 * has a side flush with a hull edge, so one orientation per hull edge is
 * exhaustive. This is the whole reason it is not a bounding box: a terrace at
 * 40 degrees to the page has a nearly square axis-aligned box and a 9:1
 * minimum rectangle, and only the second is true about the building.
 */
export function minAreaRect(ring) {
  const hull = convexHull(ring);
  if (hull.length < 3) {
    if (hull.length < 2) return [0, 0, 0];
    const [x1, y1] = hull[0];
    const [x2, y2] = hull[hull.length - 1];
    return [Math.hypot(x2 - x1, y2 - y1), 0, normAngle(Math.atan2(y2 - y1, x2 - x1))];
  }

  let best = null;
  for (let i = 0; i < hull.length; i += 1) {
    const [x1, y1] = hull[i];
    const [x2, y2] = hull[(i + 1) % hull.length];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const edge = Math.hypot(dx, dy);
    if (edge < 1e-12) continue;
    const ux = dx / edge;
    const uy = dy / edge;
    const vx = -uy;
    const vy = ux;
    let uMin = Infinity; let uMax = -Infinity;
    let vMin = Infinity; let vMax = -Infinity;
    for (const p of hull) {
      const u = p[0] * ux + p[1] * uy;
      const v = p[0] * vx + p[1] * vy;
      if (u < uMin) uMin = u;
      if (u > uMax) uMax = u;
      if (v < vMin) vMin = v;
      if (v > vMax) vMax = v;
    }
    const du = uMax - uMin;
    const dv = vMax - vMin;
    const area = du * dv;
    if (best === null || area < best[0] - 1e-12) {
      best = du >= dv
        ? [area, du, dv, Math.atan2(uy, ux)]
        : [area, dv, du, Math.atan2(vy, vx)];
    }
  }
  if (best === null) return [0, 0, 0];
  return [best[1], best[2], normAngle(best[3])];
}

// --- the measurement ---------------------------------------------------------

/**
 * The one headline label, most to least consequential.
 *
 * `sliver` needs BOTH narrow and long: a 5 x 5 m shed is narrow and is not a
 * wall, it is just small, and floor area already says so.
 */
export function classify(elongation, rectangularity, widthM) {
  if (elongation === null || !Number.isFinite(elongation) || elongation <= 0) return "degenerate";
  if (widthM < SLIVER_WIDTH_M && elongation >= STRIP_ELONGATION) return "sliver";
  if (rectangularity < COMPLEX_RECTANGULARITY) return "complex";
  if (elongation >= STRIP_ELONGATION) return "strip";
  if (rectangularity >= BLOCKY_RECTANGULARITY) return "blocky";
  return "irregular";
}

function resolveHeight(heightM, levels, heightSource) {
  // An explicitly DEFAULTED height is not a measurement and must never be
  // multiplied -- see shape.py for the case that caught it (a 24 m2 bicycle
  // store reported as 48 m2 across two levels, both invented by the tool).
  if (heightSource === "typical") {
    return [1, (heightM !== null && heightM !== undefined) ? Number(heightM) : LEVEL_HEIGHT_M, "typical"];
  }
  if (levels !== null && levels !== undefined) {
    const lv = Math.max(1, Math.round(Number(levels)));
    const h = (heightM !== null && heightM !== undefined) ? Number(heightM) : lv * LEVEL_HEIGHT_M;
    return [lv, h, heightSource || "levels"];
  }
  if (heightM !== null && heightM !== undefined) {
    const h = Number(heightM);
    return [Math.max(1, Math.round(h / LEVEL_HEIGHT_M)), h, heightSource || "tagged"];
  }
  return [1, LEVEL_HEIGHT_M, "typical"];
}

const round = (v, places) => {
  const f = 10 ** places;
  return Math.round(v * f) / f;
};

/** Everything measurable about one footprint. Mirrors shape.py's metrics(). */
export function metrics(ring, opts = {}) {
  const {
    metresPerPx = 1.0, heightM = null, levels = null, heightSource = null,
  } = opts;

  const pts = openRing(ring);
  if (pts.length < 3) {
    throw new Error(`need at least 3 distinct points, got ${pts.length}`);
  }

  const mpp = Number(metresPerPx);
  const areaM2 = polygonArea(pts) * mpp * mpp;
  const perimeterM = polygonPerimeter(pts) * mpp;
  const [longPx, shortPx, angle] = minAreaRect(pts);
  const lengthM = longPx * mpp;
  const widthM = shortPx * mpp;

  const rectArea = lengthM * widthM;
  const rectangularity = rectArea > 1e-9 ? areaM2 / rectArea : 0;
  const elongation = widthM > 1e-9 ? lengthM / widthM : Infinity;
  const compactness = perimeterM > 1e-9
    ? (4 * Math.PI * areaM2) / (perimeterM ** 2) : 0;

  const [lv, h, src] = resolveHeight(heightM, levels, heightSource);
  const floorArea = areaM2 * lv;

  return {
    vertexCount: pts.length,
    areaM2: round(areaM2, 1),
    perimeterM: round(perimeterM, 1),
    lengthM: round(lengthM, 1),
    widthM: round(widthM, 1),
    elongation: Number.isFinite(elongation) ? round(elongation, 2) : null,
    rectangularity: round(rectangularity, 3),
    compactness: round(compactness, 3),
    // Page-relative, not true north: the sheet is rotated 31 degrees and this
    // answers "does it run along the street as drawn".
    bearingDeg: round((angle * 180) / Math.PI, 1),
    shape: classify(elongation, rectangularity, widthM),
    levels: lv,
    heightM: round(h, 1),
    heightSource: src,
    floorAreaM2: round(floorArea, 1),
    floorAreaEstimated: src === "typical",
    // Zero when the plan is narrower than a room is deep — a 334 x 4 m
    // inspection line has the floor area of a warehouse and nowhere to stand
    // six people facing each other.
    rooms: widthM < SLIVER_WIDTH_M
      ? 0 : Math.floor((floorArea * USABLE_FRACTION) / ROOM_M2),
  };
}

// --- the gate ----------------------------------------------------------------

function minDepth(a, b) {
  return DEPTH_ORDER.indexOf(a) <= DEPTH_ORDER.indexOf(b) ? a : b;
}

function fmt(v) {
  return v >= 100 ? v.toFixed(0) : v.toFixed(1);
}

function floorPhrase(floor, rooms) {
  if (floor < 30) return "a kiosk, a shed, a store, a shrine box";
  if (rooms === 0) return "no enclosed space wide enough to stand a group in";
  if (floor < 200) return "a shop, a house, a single hall";
  if (floor < 1500) return "a real building with several distinct spaces";
  return "a complex -- wings, floors, somewhere you can get lost";
}

/** Room counts in bands. 733 is a true number and a useless sentence. */
function roomsPhrase(rooms) {
  if (rooms === 0) return null;
  if (rooms === 1) {
    return "Not enough usable floor for two group-sized spaces: treat it as one room.";
  }
  if (rooms <= 5) return `Room for ${rooms} group-sized spaces at ${ROOM_M2.toFixed(0)} m2 each.`;
  if (rooms <= 20) {
    return "Room for a dozen or so group-sized spaces -- enough for a floor plan with a front, a back and somewhere staff go.";
  }
  if (rooms <= 100) {
    return "Dozens of group-sized spaces. This is a place with wings or floors that need naming, not one room to describe.";
  }
  return "Hundreds of group-sized spaces. Do not attempt to describe the whole of it -- write the few parts anyone will ever be in.";
}

/** How deep an entry this footprint will comfortably carry. */
export function capacity(m) {
  const reasons = [];
  const floor = m.floorAreaM2;
  const { shape } = m;

  let ceiling = "named";
  for (const [threshold, depth] of CAPACITY_FLOORS) {
    if (floor >= threshold) { ceiling = depth; break; }
  }

  const qualifier = m.floorAreaEstimated ? " (storeys not known, counted as one)" : "";
  reasons.push(`${fmt(floor)} m2 of floor${qualifier} across ${m.levels} level${m.levels === 1 ? "" : "s"}: ${floorPhrase(floor, m.rooms)}.`);

  // The one shape cap: too narrow to hold a room is the only geometric fact
  // floor area cannot argue with.
  if (m.widthM < SLIVER_WIDTH_M && shape === "sliver") {
    ceiling = minDepth(ceiling, "sketch");
    reasons.push(`${m.lengthM.toFixed(0)} m long and only ${m.widthM.toFixed(1)} m across: a wall, a jetty, a canopy or an inspection line. There is no room in there, so write the passage through it, not the inside of it.`);
  }

  // Everything below describes rather than gates.
  if (shape === "strip" || (shape === "sliver" && m.elongation)) {
    reasons.push(`${m.lengthM.toFixed(0)} x ${m.widthM.toFixed(0)} m, ${m.elongation.toFixed(1)} to 1: it runs in a line. Write it as a row, a range or a frontage -- movement along it, not around it.`);
  }
  if (m.rectangularity < COMPLEX_RECTANGULARITY) {
    reasons.push(`The plan fills only ${(100 * m.rectangularity).toFixed(0)}% of its own bounding rectangle -- an L, a U, a cross or a courtyard. Free interior structure; use it.`);
  } else if (shape === "blocky") {
    reasons.push(`A plain ${(100 * m.rectangularity).toFixed(0)}% rectangle: no plan features to lean on, so whatever makes it distinctive has to be put there.`);
  }

  const roomsLine = roomsPhrase(m.rooms);
  if (roomsLine) reasons.push(roomsLine);

  if (m.floorAreaEstimated) {
    reasons.push("No storey count in the source data, so this is a single-storey reading; a real multi-storey building would carry more.");
  }

  return {
    maxDepth: ceiling, reasons, floorAreaM2: floor, rooms: m.rooms, shape,
  };
}

/** Does a declared depth exceed what the footprint will carry? */
export function check(itemDepth, m) {
  const cap = capacity(m);
  const declared = DEPTH_ORDER.includes(itemDepth) ? itemDepth : "named";
  return {
    ok: DEPTH_ORDER.indexOf(declared) <= DEPTH_ORDER.indexOf(cap.maxDepth),
    declared,
    maxDepth: cap.maxDepth,
    reasons: cap.reasons,
    shape: cap.shape,
    floorAreaM2: cap.floorAreaM2,
    rooms: cap.rooms,
  };
}
