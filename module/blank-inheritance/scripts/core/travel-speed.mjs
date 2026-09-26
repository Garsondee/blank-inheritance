/**
 * Movement modes, speeds, and per-hop animated duration.
 *
 * core/travel-route.mjs plans WHERE a route goes and, per network hop,
 * WHICH REAL WAY it rides (`wayIds`, added 2026-09-23 alongside
 * tools/gazetteer/export_travel_graph.py's own new `wayClass` field). This
 * file turns that into WHAT KIND OF JOURNEY it is and HOW LONG IT TAKES TO
 * WATCH — the piece that was missing when the first real crossing read as
 * an outright failure: a fixed ~8-second animation for every journey made
 * a genuine ~6km cross-map trip look instantaneous and a genuine 300m walk
 * look sluggish. "It took seconds, yet the tokens had to travel from the
 * edges of the map to the middle" (Ingram, 2026-09-23) — speed has to come
 * from the route itself, not a constant.
 *
 * These speeds are DELIBERATELY NOT real-world accurate — true walking
 * pace (1.4 m/s) would make a real 3km trip take 36 real minutes to watch.
 * They ARE real-world-PROPORTIONATE: a car rides roughly 3x a walker's
 * pace here and a train roughly 1.5x a car's, the same relative order as
 * the real thing, compressed into a range a table can actually sit
 * through — a few seconds for a short hop, well under two minutes for the
 * longest plausible crossing on this 12400px (12.4km) sheet.
 */

export const MODES = Object.freeze({
  walk: { id: "walk", pxPerSecond: 45 },
  bike: { id: "bike", pxPerSecond: 95 },
  motorbike: { id: "motorbike", pxPerSecond: 150 },
  car: { id: "car", pxPerSecond: 150 },
  train: { id: "train", pxPerSecond: 230 }
});

const DEFAULT_MODE = "walk";

/**
 * The real OSM `highway=*`/`railway=*` tag value tools/gazetteer's
 * export_travel_graph.py carries per way (data/map/travel-graph.json's own
 * `wayClass`) -> which of MODES rides it. Anything not listed here
 * defaults to `walk` — the honest answer for an unclassified or unknown
 * tag is "a person can still walk it," never a guess at a faster mode.
 */
const WAY_CLASS_MODE = Object.freeze({
  // on foot
  footway: "walk",
  pedestrian: "walk",
  steps: "walk",
  path: "walk",
  living_street: "walk",
  platform: "walk",
  track: "walk",
  corridor: "walk",
  // pedal
  cycleway: "bike",
  // motor road
  residential: "car",
  unclassified: "car",
  service: "car",
  tertiary: "car",
  tertiary_link: "car",
  secondary: "car",
  secondary_link: "car",
  primary: "car",
  primary_link: "car",
  trunk: "car",
  trunk_link: "car",
  motorway: "motorbike",
  motorway_link: "motorbike",
  // rail
  rail: "train",
  light_rail: "train",
  subway: "train",
  narrow_gauge: "train",
  tram: "train"
});

/** A real `wayClass` tag (or `null`/unknown) -> one of MODES' own keys. */
export function modeForWayClass(wayClass) {
  return WAY_CLASS_MODE[wayClass] ?? DEFAULT_MODE;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * No single Foundry `TokenDocument#update` animation should dominate a
 * whole crossing. Found live 2026-09-23, Ingram's own real-time report
 * while watching an actual run: "I noticed the token didn't move along
 * roads, but rather in a straight line when I saw it move." Measured
 * directly against the real graph afterward: a real ~8.4km route rode a
 * single OSM way with sparse recorded nodes for one 23.3-SECOND hop, while
 * 154 of its other 175 hops were under half a second — Foundry animates
 * each hop as one linear glide for its own full duration, so that one
 * dominant hop reads as "a straight line replacing the road" while the
 * flurry of short ones around it flash by too fast to perceive at all. The
 * fix is not a routing bug (the surrounding trail genuinely does bend,
 * hop by hop, exactly as planned) — it is pacing: split anything longer
 * than this into several smaller, evenly-timed sub-hops ALONG THE SAME
 * straight segment (there is no additional real geometry between two
 * adjacent OSM nodes to subdivide BY), so the token keeps visibly,
 * regularly progressing instead of gliding once and looking like it
 * skipped the road's own shape.
 */
const MAX_HOP_MS = 1500;

/** One real hop, split into evenly-timed sub-hops along the SAME straight line if it would otherwise dominate the crossing (see MAX_HOP_MS). Never changes the path, only how often it is animated. */
function subdivideHop(from, to, mode, durationMs) {
  if (durationMs <= MAX_HOP_MS) return [{ to, durationMs, mode }];
  const steps = Math.ceil(durationMs / MAX_HOP_MS);
  const stepDurationMs = durationMs / steps;
  const subHops = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    subHops.push({
      to: { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t },
      durationMs: Math.round(stepDurationMs),
      mode
    });
  }
  return subHops;
}

/**
 * `segments` is `planRoute()`'s own `segments` array, in the SAME
 * (image-px/metre) space the route was planned in — never scene-space;
 * timing is a metric fact about the real distance ridden, not an accident
 * of however a hub scene happens to be scaled. `wayClass` is the real
 * graph's own map (data/map/travel-graph.json's `wayClass`, or `{}` for a
 * hand-built test fixture with no tags at all — everything then defaults
 * to `walk`, which is always correct if slower than intended).
 *
 * Returns one entry per hop (never the starting point itself, matching
 * core/travel-animation.mjs's own `hopDurations` contract so a caller can
 * swap one for the other): `[{to, durationMs, mode}, ...]` — a real
 * geometric hop longer than MAX_HOP_MS to animate becomes several of
 * these, back to back, rather than one. A "walk" segment (getting to the
 * network, or the last stretch off it) is always mode `walk` — there is no
 * way tag to consult for a leg this project's own router invented, not
 * rode.
 */
export function hopPlan(segments, { wayClass = {} } = {}) {
  const points = [];
  const hopModes = [];
  for (const segment of segments) {
    const isNetwork = segment.kind === "network";
    for (let i = 0; i < segment.points.length; i++) {
      const p = segment.points[i];
      if (points.length === 0) {
        points.push(p);
        continue;
      }
      const prev = points[points.length - 1];
      if (prev.x === p.x && prev.y === p.y) continue; // the shared seam point between two chained segments
      points.push(p);
      hopModes.push(isNetwork ? modeForWayClass(wayClass[segment.wayIds?.[i - 1]]) : DEFAULT_MODE);
    }
  }

  const hops = [];
  for (let i = 1; i < points.length; i++) {
    const mode = hopModes[i - 1];
    const dist = distance(points[i - 1], points[i]);
    const durationMs = Math.round((dist / MODES[mode].pxPerSecond) * 1000);
    hops.push(...subdivideHop(points[i - 1], points[i], mode, durationMs));
  }
  return hops;
}

/** Total animated duration of a whole `hopPlan()` result, in ms — for logging/testing "how long did this journey actually take." */
export function totalDurationMs(hops) {
  return hops.reduce((sum, hop) => sum + hop.durationMs, 0);
}
