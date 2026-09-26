/**
 * Point-to-point travel routing — the pure half.
 *
 * Layer 0 of ideas/entries/road-network-routing.json (status `accepted`,
 * required for Session 0/1 by GitHub issue #140): given a start point, an
 * end point, and a road/rail graph in tools/city-map's own exported shape
 * (`{nodeXy, wayNodes}` — see tools/city-map/citymap/world.py; `nodeWays`
 * and `wayClass` exist in that export too but neither is read here, since
 * restricting a mode to its own graph — a train to rail, a car to road — is
 * explicitly a later layer, not this one), produce one travelling route.
 *
 * **The governing rule is "ride the network as far as it usefully goes,
 * walk the rest" — not "find the geometrically shortest path."** Those are
 * different goals: a straight line is *always* the shortest possible path
 * between two points, so a router that simply minimised total distance
 * would never choose to follow a road at all, which is the opposite of
 * what this exists for (the point is to LOOK like real GPS movement along
 * real infrastructure — "the appearance of logical movement," Ingram's own
 * framing, not a shortest-path solver). So this always snaps the start to
 * its nearest network node and rides from there: to the node nearest the
 * true destination when the network actually reaches that neighbourhood,
 * or — when it doesn't — to whichever *reachable* node ends up closest to
 * the destination, which is Ingram's own "leaving a road once you get as
 * close as possible" rule for a disconnected graph, applied uniformly
 * rather than as a special case. Either way, the last stretch from wherever
 * the network runs out to the true destination point is a plain walk. This
 * is also why crossing open water needs no special handling: nothing here
 * knows what land or water even is, and "walk across the ocean" only ever
 * happens because no way happens to be drawn there — the same fallback a
 * severed land bridge would trigger.
 *
 * **Verified gotcha:** `nodeXy`'s own keys are strings (JSON object keys
 * always are), but the node ids *inside* a `wayNodes` array are raw JSON
 * numbers — confirmed directly against a real exported graph
 * (tools/city-map/cache/replayed-world/.../graph.json, 178,950 nodes).
 * `buildAdjacency` below is the only place this matters, and coerces with
 * `String()` once on the way in, so nothing downstream has to know.
 *
 * **What this deliberately does NOT do, all later layers:** know about
 * transit modes (walk/drive/rail/ferry) or which graph a mode may use;
 * convert between the campaign map's pixel/grid space
 * (data/schema/campaign-map.schema.json) and this graph's own projected
 * metres — confirmed empirically to be a different space (real coordinates
 * run negative, five to six digits); animate anything at all — this
 * returns geometry only, and never touches a Foundry Token, Scene, or
 * canvas (design/testing-strategy.md §1's pure-core rule). The caller owns
 * getting `start`, `end`, and `graph` into the same coordinate space before
 * calling this, and owns turning the returned segments into motion.
 */

const EMPTY_GRAPH = Object.freeze({ nodeXy: Object.freeze({}), wayNodes: Object.freeze({}) });

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function point(nodeXy, id) {
  const xy = nodeXy[id];
  return xy ? { x: xy[0], y: xy[1] } : null;
}

function walkSegment(a, b) {
  return { kind: "walk", points: [a, b] };
}

/**
 * `{nodeXy, wayNodes}` -> `Map<nodeId, Array<{to: nodeId, dist}>>`.
 * Undirected: every consecutive pair in a way's node list gets an edge both
 * ways, since nothing in this export carries oneway direction.
 */
export function buildAdjacency({ nodeXy = {}, wayNodes = {} } = {}) {
  const adjacency = new Map();
  const link = (fromId, toId) => {
    const a = point(nodeXy, fromId);
    const b = point(nodeXy, toId);
    if (!a || !b) return; // a way referencing a node the export didn't carry -- skip, don't throw
    if (!adjacency.has(fromId)) adjacency.set(fromId, []);
    adjacency.get(fromId).push({ to: toId, dist: distance(a, b) });
  };
  for (const nodeIds of Object.values(wayNodes)) {
    for (let i = 0; i < nodeIds.length - 1; i++) {
      const a = String(nodeIds[i]);
      const b = String(nodeIds[i + 1]);
      link(a, b);
      link(b, a);
    }
  }
  return adjacency;
}

/**
 * `wayNodes` -> `Map<"nodeA|nodeB", wayId>`, undirected (the key always
 * puts the numerically/lexically smaller id first, so a hop can be looked
 * up regardless of which direction the route rides it). Lets a planned
 * route's own node-id sequence be traced back to which REAL way each hop
 * belongs to — core/travel-speed.mjs's own job, not this file's; this only
 * exposes the fact.
 *
 * First way wins when two ways happen to share an edge (rare, and any real
 * answer beats none) — the same "don't invent, don't throw" spirit as
 * `buildAdjacency`'s own missing-node handling above.
 */
export function buildEdgeWayIndex(wayNodes = {}) {
  const index = new Map();
  for (const [wayId, nodeIds] of Object.entries(wayNodes)) {
    for (let i = 0; i < nodeIds.length - 1; i++) {
      const a = String(nodeIds[i]);
      const b = String(nodeIds[i + 1]);
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (!index.has(key)) index.set(key, wayId);
    }
  }
  return index;
}

/**
 * A reconstructed node-id path -> one way id per hop (`pathIds.length - 1`
 * entries), via `edgeWayIndex`. `null` for a hop with no known way — should
 * not happen for a path Dijkstra actually rode (every edge it can traverse
 * came from some way), but never throws if it does.
 */
export function wayIdsForPath(pathIds, edgeWayIndex) {
  const ids = [];
  for (let i = 0; i < pathIds.length - 1; i++) {
    const a = String(pathIds[i]);
    const b = String(pathIds[i + 1]);
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    ids.push(edgeWayIndex.get(key) ?? null);
  }
  return ids;
}

/** Nearest graph node to `p` ({x,y}), as `{id, dist}` — or null if `nodeXy` is empty. */
export function nearestNode(nodeXy, p) {
  let best = null;
  for (const [id, xy] of Object.entries(nodeXy || {})) {
    const d = distance(p, { x: xy[0], y: xy[1] });
    if (!best || d < best.dist) best = { id, dist: d };
  }
  return best;
}

/**
 * Every node's own connected-component size, as `Map<nodeId, size>` — a
 * node with no adjacency entry at all is its own size-1 component. Used by
 * `planRoute` to tell a real (if small) local road network apart from a
 * disconnected stub that only LOOKS like network data; see
 * `MIN_TRUSTED_COMPONENT_SIZE`'s own comment for why that distinction
 * matters and how the threshold was picked.
 */
export function componentSizes(adjacency, nodeIds) {
  const sizeById = new Map();
  const seen = new Set();
  for (const start of nodeIds) {
    if (seen.has(start)) continue;
    const members = [start];
    seen.add(start);
    for (let i = 0; i < members.length; i++) {
      for (const edge of adjacency.get(members[i]) || []) {
        if (!seen.has(edge.to)) {
          seen.add(edge.to);
          members.push(edge.to);
        }
      }
    }
    for (const id of members) sizeById.set(id, members.length);
  }
  return sizeById;
}

/**
 * A component below this size is treated as "not really road network" when
 * choosing what to snap onto — never when riding one already reached.
 *
 * Found diagnosing #174 (a token "landing in the ocean" between The Errand
 * and Canteen): both locations' geometrically-nearest node turned out to be
 * the SAME isolated 2-node way, a hand-drawn map-editor road sketch that
 * reaches toward an offshore construction site and never snapped to
 * anything (causeway routing isn't built yet — ideas/entries/
 * offshore-construction.json phase b/c). Since the two disconnected
 * endpoints of that stub are trivially "reachable" from each other,
 * `planRoute` happily rode the 264m water-crossing sketch between them
 * instead of using the real street grid a short walk away on each end.
 *
 * The real exported graph (measured 2026-09-19, `data/map/travel-graph.json`,
 * 64,307 nodes) has one dominant component (60,786 nodes) plus a handful of
 * genuine secondary networks (455, 436, 186, 99 nodes — real local road
 * clusters, not artifacts) — then a sharp drop to nothing bigger than 20
 * nodes for the rest of the long tail (116 of those are exactly 2-node
 * stubs like the one above). Any threshold between 21 and 98 draws the same
 * line; 25 sits comfortably inside that gap rather than against either edge.
 */
export const MIN_TRUSTED_COMPONENT_SIZE = 25;

/**
 * `nodeXy` restricted to nodes whose own connected component is large
 * enough to trust as real network (see `MIN_TRUSTED_COMPONENT_SIZE`) — or
 * the original, unfiltered `nodeXy` if that restriction would leave nothing
 * at all (a small synthetic graph with no dominant component, which every
 * existing hand-built test fixture in this project is, on purpose: filtering
 * must never invent a requirement those fixtures never agreed to).
 */
function trustedNodeXy(nodeXy, adjacency) {
  const ids = Object.keys(nodeXy);
  const sizes = componentSizes(adjacency, ids);
  const trusted = {};
  for (const id of ids) {
    if (sizes.get(id) >= MIN_TRUSTED_COMPONENT_SIZE) trusted[id] = nodeXy[id];
  }
  return Object.keys(trusted).length > 0 ? trusted : nodeXy;
}

/**
 * Dijkstra, single-source, over the WHOLE reachable component — Layer 0
 * needs distances to every node near the destination, not just to one
 * target, to pick the best exit point when the destination isn't reachable
 * (see `planRoute`). A binary heap because the real export is not small
 * (178,950 nodes measured); a plain linear-scan priority queue here would
 * be quadratic.
 */
export function shortestPathsFrom(adjacency, sourceId) {
  const dist = new Map([[sourceId, 0]]);
  const prev = new Map([[sourceId, null]]);
  const settled = new Set();
  const heap = [{ id: sourceId, d: 0 }];

  const siftDown = () => {
    let i = 0;
    const n = heap.length;
    for (;;) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && heap[l].d < heap[smallest].d) smallest = l;
      if (r < n && heap[r].d < heap[smallest].d) smallest = r;
      if (smallest === i) break;
      [heap[smallest], heap[i]] = [heap[i], heap[smallest]];
      i = smallest;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      siftDown();
    }
    return top;
  };
  const push = (id, d) => {
    heap.push({ id, d });
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent].d <= heap[i].d) break;
      [heap[parent], heap[i]] = [heap[i], heap[parent]];
      i = parent;
    }
  };

  while (heap.length > 0) {
    const { id, d } = pop();
    if (settled.has(id)) continue;
    settled.add(id);
    if (d > dist.get(id)) continue;
    for (const edge of adjacency.get(id) || []) {
      const next = d + edge.dist;
      if (!dist.has(edge.to) || next < dist.get(edge.to)) {
        dist.set(edge.to, next);
        prev.set(edge.to, id);
        push(edge.to, next);
      }
    }
  }
  return { dist, prev };
}

/** Source-to-target node id list (inclusive), by walking `prev` backward. */
export function reconstructPath(prev, targetId) {
  const path = [targetId];
  let cur = targetId;
  while (prev.get(cur)) {
    cur = prev.get(cur);
    path.push(cur);
  }
  return path.reverse();
}

/**
 * The whole trip. `start`/`end` are `{x,y}` in the SAME space as `graph`'s
 * own `nodeXy` (see the coordinate-space note above — this function does
 * not check or convert). Returns `{distance, usedNetwork, segments}`, where
 * each segment is `{kind: "walk"|"network", points: [{x,y}, ...]}` and
 * segments chain (a segment's last point is the next segment's first).
 * Zero-length walk legs (the start/end point already sits exactly on a
 * node) are dropped rather than emitted as a degenerate segment, and a
 * "network" leg shorter than two points (nothing to ride at all — the
 * nearest node is an isolated stub, or both ends snap to the same node)
 * collapses to a plain walk rather than a pointless one-point detour.
 */
export function planRoute({ graph = EMPTY_GRAPH, start, end }) {
  const direct = { distance: distance(start, end), usedNetwork: false, segments: [walkSegment(start, end)] };

  const adjacency = buildAdjacency(graph);
  const snapXy = trustedNodeXy(graph.nodeXy || {}, adjacency);

  const entry = nearestNode(snapXy, start);
  if (!entry) return direct; // no graph data at all -- pure walk is the only option

  const { dist, prev } = shortestPathsFrom(adjacency, entry.id);

  const goal = nearestNode(snapXy, end);
  let exitId;
  if (dist.has(goal.id)) {
    exitId = goal.id; // the network reaches the destination's own neighbourhood -- ride all the way there
  } else {
    // Disconnected from the destination's component: leave the network at
    // whichever reachable node leaves the shortest walk remaining, not
    // necessarily the furthest-travelled one.
    exitId = null;
    let bestRemaining = Infinity;
    for (const nodeId of dist.keys()) {
      const remaining = distance(point(graph.nodeXy, nodeId), end);
      if (remaining < bestRemaining) {
        bestRemaining = remaining;
        exitId = nodeId;
      }
    }
  }

  const pathIds = reconstructPath(prev, exitId);
  if (pathIds.length < 2) return direct; // nothing usable to ride -- an isolated node, or both ends snap to the same one

  const networkPoints = pathIds.map((id) => point(graph.nodeXy, id));
  const onRamp = networkPoints[0];
  const offRamp = networkPoints[networkPoints.length - 1];
  const lastLeg = distance(offRamp, end);

  // Getting to the network and back off it again is its own cost, separate
  // from however nice a road the middle of the trip rides -- if THAT alone
  // (ignoring the ridden distance entirely, which can only add more on top)
  // already isn't shorter than walking straight there, no ridden distance in
  // the middle can rescue the trip. This deliberately does NOT compare the
  // ridden leg itself against the direct line -- the L-shaped-road test
  // above prizes exactly that "ride even though it's the long way round" --
  // it only catches the case where the road never usefully gets you toward
  // the destination at all, and both ends are stuck walking most of the way
  // regardless. Found live (#174): The Errand and Canteen sit 244px apart,
  // but the nearest trusted road to each is 1000px+ away in opposite
  // directions, so the old code walked 1329px, rode 3800px, walked another
  // 1110px -- a 6239px round trip for a 244px errand -- instead of just
  // walking there.
  if (entry.dist + lastLeg >= direct.distance) return direct;

  // Which real way each ridden hop belongs to — additive; every existing
  // caller keeps reading `.points` exactly as before. core/travel-speed.mjs
  // turns this into a mode (walk/bike/car/train) per hop.
  const wayIds = wayIdsForPath(pathIds, buildEdgeWayIndex(graph.wayNodes));

  const segments = [];
  if (entry.dist > 0) segments.push(walkSegment(start, onRamp));
  segments.push({ kind: "network", points: networkPoints, wayIds });
  if (lastLeg > 0) segments.push(walkSegment(offRamp, end));

  return { distance: entry.dist + dist.get(exitId) + lastLeg, usedNetwork: true, segments };
}
