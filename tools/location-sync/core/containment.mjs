/**
 * Which region a building stands in, and which regions border each other —
 * browser half.
 *
 * The twin of core/containment.py, held to it by
 * test/fixtures/gazetteer-containment-cases.json which both suites assert
 * against. Read the Python module's docstring for the argument; this file is
 * the same arithmetic.
 *
 * Why a twin rather than a server round trip: the inspector's breadcrumb and
 * the session list's tree grouping need this on every render — a selection
 * change, a vertex drag, a filter keystroke — and a fetch per keystroke would
 * be the wrong shape. The server independently recomputes and persists the
 * same fields at save time (core/session.py's derive_draft), so the two only
 * ever have to agree, never hand off state to each other.
 *
 * Pure arithmetic, no imports, no browser globals — the same rule the grid,
 * depth and shape pairs live under.
 */

/** Matches PROXIMATE_TOLERANCE_PX in containment.py exactly. */
export const PROXIMATE_TOLERANCE_PX = 6.0;

function openRing(ring) {
  const pts = (ring || []).map(([x, y]) => [Number(x), Number(y)]);
  while (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0]
    && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
  return pts;
}

/** Even-odd ray casting. */
export function pointInRing(x, y, ring) {
  const pts = openRing(ring);
  let inside = false;
  const n = pts.length;
  for (let i = 0; i < n; i += 1) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % n];
    if ((y0 > y) !== (y1 > y)) {
      const t = (y - y0) / (y1 - y0);
      if (x < x0 + t * (x1 - x0)) inside = !inside;
    }
  }
  return inside;
}

/** Inside the outer ring and outside every hole. */
export function pointInPolygon(x, y, ring, holes = []) {
  if (!pointInRing(x, y, ring)) return false;
  return !holes.some((hole) => pointInRing(x, y, hole));
}

export function polygonArea(ring) {
  const pts = openRing(ring);
  if (pts.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    total += x0 * y1 - x1 * y0;
  }
  return Math.abs(total) / 2;
}

/** The point a containment test is run against, for any item geometry. See
 *  containment.py's centroid_of for why this is the vertex mean, not the
 *  true area centroid. */
export function centroidOf(geometry) {
  if (geometry.kind === "point") {
    const [x, y] = geometry.pointPx;
    return [Number(x), Number(y)];
  }
  const pts = openRing(geometry.ringPx);
  if (!pts.length) throw new Error("empty geometry has no centroid");
  return [
    pts.reduce((s, p) => s + p[0], 0) / pts.length,
    pts.reduce((s, p) => s + p[1], 0) / pts.length,
  ];
}

function distancePointToSegment(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  if (dx === 0 && dy === 0) return Math.hypot(px - x0, py - y0);
  let t = ((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}

function minVertexToRingDistance(vertex, ring) {
  const [x, y] = vertex;
  const pts = openRing(ring);
  if (!pts.length) return Infinity;
  let best = Infinity;
  const n = pts.length;
  for (let i = 0; i < n; i += 1) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % n];
    const d = distancePointToSegment(x, y, x0, y0, x1, y1);
    if (d < best) best = d;
  }
  return best;
}

function bboxesClose(ringA, ringB, tolerance) {
  const ax = ringA.map((p) => p[0]); const ay = ringA.map((p) => p[1]);
  const bx = ringB.map((p) => p[0]); const by = ringB.map((p) => p[1]);
  return !(Math.max(...ax) + tolerance < Math.min(...bx)
    || Math.max(...bx) + tolerance < Math.min(...ax)
    || Math.max(...ay) + tolerance < Math.min(...by)
    || Math.max(...by) + tolerance < Math.min(...ay));
}

/** Do these two region outlines share a border? See containment.py's
 *  are_adjacent for the reasoning (bbox reject, then both directions). */
export function areAdjacent(ringA, ringB, tolerance = PROXIMATE_TOLERANCE_PX) {
  if (!bboxesClose(ringA, ringB, tolerance)) return false;
  const a = openRing(ringA);
  const b = openRing(ringB);
  for (const vertex of a) {
    if (minVertexToRingDistance(vertex, b) <= tolerance) return true;
  }
  for (const vertex of b) {
    if (minVertexToRingDistance(vertex, a) <= tolerance) return true;
  }
  return false;
}

/** Every ring that is part of a region's OWN edge: its exterior, and every
 *  hole cut into it. See containment.py's _boundary_rings for the real bug
 *  this exists to fix -- an island sitting in another region's hole shares
 *  its whole outline with that hole, which is missed if only exterior rings
 *  are ever compared. */
function boundaryRings(ring, holes) {
  return [ring, ...holes];
}

/**
 * Containment and adjacency across one draft's worth of items. See
 * containment.py's compute() docstring for the return shape and the rules
 * (smaller region wins an overlap, locked items get no special treatment).
 */
export function compute(items, { tolerance = PROXIMATE_TOLERANCE_PX } = {}) {
  const regions = items.filter((it) => it.tier === "region"
    && it.geometry && it.geometry.kind === "polygon");
  const others = items.filter((it) => it.tier === "site" || it.tier === "point");

  const regionRings = new Map();
  for (const region of regions) {
    const geom = region.geometry;
    regionRings.set(region.localId, [geom.ringPx || [], geom.holesPx || []]);
  }

  const out = {};
  for (const region of regions) out[region.localId] = { containsRefs: [], neighbourRefs: [] };

  for (const item of others) {
    let centroid;
    try {
      centroid = centroidOf(item.geometry);
    } catch (err) {
      out[item.localId] = { withinRegionRef: null };
      continue;
    }
    const [cx, cy] = centroid;
    const candidates = [];
    for (const [localId, [ring, holes]] of regionRings) {
      if (ring.length < 3) continue;
      if (pointInPolygon(cx, cy, ring, holes)) candidates.push([polygonArea(ring), localId]);
    }
    let winner = null;
    if (candidates.length) {
      candidates.sort((a, b) => a[0] - b[0]);
      winner = candidates[0][1];
    }
    out[item.localId] = { withinRegionRef: winner };
    if (winner !== null) out[winner].containsRefs.push(item.localId);
  }

  for (const entry of Object.values(out)) {
    if (entry.containsRefs) entry.containsRefs.sort();
  }

  const regionIds = [...regionRings.keys()];
  for (let i = 0; i < regionIds.length; i += 1) {
    const aId = regionIds[i];
    const [ringA, holesA] = regionRings.get(aId);
    if (ringA.length < 3) continue;
    const boundariesA = boundaryRings(ringA, holesA);
    for (let j = i + 1; j < regionIds.length; j += 1) {
      const bId = regionIds[j];
      const [ringB, holesB] = regionRings.get(bId);
      if (ringB.length < 3) continue;
      const boundariesB = boundaryRings(ringB, holesB);
      const touching = boundariesA.some((ba) => ba.length >= 3
        && boundariesB.some((bb) => bb.length >= 3 && areAdjacent(ba, bb, tolerance)));
      if (touching) {
        out[aId].neighbourRefs.push(bId);
        out[bId].neighbourRefs.push(aId);
      }
    }
  }
  for (const localId of regionIds) out[localId].neighbourRefs.sort();

  return out;
}
