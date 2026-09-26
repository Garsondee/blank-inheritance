// Tier 1 — travel-route (Layer 0 of ideas/entries/road-network-routing.json).
//
// The claim these tests hold up: a route always prefers riding the network
// over a shortcut straight line (proven with an L-shaped road where the
// ridden route is deliberately LONGER than the direct distance), a
// disconnected graph still rides as far toward the destination as it can
// rather than giving up, and the exported graph's real quirk -- numeric
// node ids inside `wayNodes` against string keys in `nodeXy` -- is exercised
// directly rather than assumed fixed.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildAdjacency,
  buildEdgeWayIndex,
  wayIdsForPath,
  nearestNode,
  shortestPathsFrom,
  reconstructPath,
  planRoute,
  componentSizes,
  MIN_TRUSTED_COMPONENT_SIZE
} from "../module/blank-inheritance/scripts/core/travel-route.mjs";

test("buildAdjacency links consecutive way nodes both ways, coercing numeric ids to nodeXy's string keys", () => {
  const graph = {
    nodeXy: { 1: [0, 0], 2: [3, 4], 3: [3, 10] },
    wayNodes: { w1: [1, 2, 3] } // real exports carry these as numbers, not strings
  };
  const adjacency = buildAdjacency(graph);

  assert.deepEqual(adjacency.get("1"), [{ to: "2", dist: 5 }]);
  assert.deepEqual(adjacency.get("2"), [{ to: "1", dist: 5 }, { to: "3", dist: 6 }]);
  assert.deepEqual(adjacency.get("3"), [{ to: "2", dist: 6 }]);
  assert.equal(adjacency.get(1), undefined, "numeric key must miss -- proves the lookup actually coerced to a string, not accidentally matched");
});

test("buildAdjacency skips a way node the export didn't carry, rather than throwing", () => {
  const graph = { nodeXy: { 1: [0, 0] }, wayNodes: { w1: [1, 2] } }; // node 2 has no nodeXy entry
  assert.doesNotThrow(() => buildAdjacency(graph));
  // No valid edge ever got recorded FROM "1" -- consumers already treat a
  // missing key the same as an empty edge list (`shortestPathsFrom`'s own
  // `adjacency.get(id) || []`), so there is nothing further to assert here.
  assert.equal(buildAdjacency(graph).get("1"), undefined);
});

test("nearestNode finds the closest point and returns null on an empty graph", () => {
  const nodeXy = { A: [0, 0], B: [10, 0], C: [5, 5] };
  assert.deepEqual(nearestNode(nodeXy, { x: 1, y: 0 }), { id: "A", dist: 1 });
  assert.equal(nearestNode({}, { x: 1, y: 0 }), null);
});

test("shortestPathsFrom takes the cheaper multi-hop route over a longer direct edge", () => {
  const adjacency = new Map([
    ["A", [{ to: "B", dist: 10 }, { to: "D", dist: 100 }]],
    ["B", [{ to: "A", dist: 10 }, { to: "C", dist: 10 }]],
    ["C", [{ to: "B", dist: 10 }, { to: "D", dist: 10 }]],
    ["D", [{ to: "A", dist: 100 }, { to: "C", dist: 10 }]]
  ]);
  const { dist, prev } = shortestPathsFrom(adjacency, "A");
  assert.equal(dist.get("D"), 30);
  assert.deepEqual(reconstructPath(prev, "D"), ["A", "B", "C", "D"]);
});

test("planRoute walks straight when there is no graph at all", () => {
  const start = { x: 0, y: 0 };
  const end = { x: 30, y: 40 };
  const result = planRoute({ start, end });
  assert.equal(result.usedNetwork, false);
  assert.equal(result.distance, 50);
  assert.deepEqual(result.segments, [{ kind: "walk", points: [start, end] }]);
});

test("planRoute rides an L-shaped road even though it is longer than the straight line, then walks the last stretch", () => {
  const graph = {
    nodeXy: { A: [0, 0], B: [0, 100], C: [100, 100] },
    wayNodes: { w1: ["A", "B", "C"] }
  };
  const start = { x: 0, y: 0 }; // exactly on A
  const end = { x: 100, y: 110 }; // 10 past C
  const result = planRoute({ graph, start, end });

  assert.equal(result.usedNetwork, true);
  assert.equal(result.segments.length, 2);
  assert.deepEqual(result.segments[0], {
    kind: "network",
    points: [{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 }],
    wayIds: ["w1", "w1"] // both hops ride the same single way
  });
  assert.deepEqual(result.segments[1], { kind: "walk", points: [{ x: 100, y: 100 }, end] });
  assert.equal(result.distance, 210); // 100 + 100 ridden, 10 walked -- straight-line would have been ~148.7
  assert.ok(result.distance > Math.hypot(end.x - start.x, end.y - start.y), "the whole point is that it is NOT the shortcut");
});

test("planRoute on a disconnected graph rides as far toward the destination as its own component allows", () => {
  const graph = {
    nodeXy: { A: [0, 0], B: [0, 100], C: [500, 500], D: [500, 600] },
    wayNodes: { w1: ["A", "B"], w2: ["C", "D"] } // two components, never joined
  };
  const start = { x: 0, y: 0 }; // on A, component 1
  const end = { x: 500, y: 610 }; // right next to D, component 2 -- unreachable
  const result = planRoute({ graph, start, end });

  assert.equal(result.usedNetwork, true);
  // B, not A: B is reachable and closer to `end` than A is, even though
  // neither can actually reach component 2 -- "leave the road as close as
  // you can get," never "give up because the destination is unreachable."
  assert.deepEqual(result.segments[0], {
    kind: "network",
    points: [{ x: 0, y: 0 }, { x: 0, y: 100 }],
    wayIds: ["w1"]
  });
  assert.deepEqual(result.segments[1].points, [{ x: 0, y: 100 }, end]);
  const expected = 100 + Math.hypot(end.x - 0, end.y - 100);
  assert.equal(result.distance, expected);
});

test("planRoute drops degenerate walk legs when both ends already sit on the network", () => {
  const graph = { nodeXy: { A: [0, 0], B: [0, 100] }, wayNodes: { w1: ["A", "B"] } };
  const result = planRoute({ graph, start: { x: 0, y: 0 }, end: { x: 0, y: 100 } });

  assert.equal(result.segments.length, 1);
  assert.equal(result.segments[0].kind, "network");
  assert.equal(result.distance, 100);
});

test("planRoute collapses to a plain walk when start and end snap to the same node", () => {
  const graph = { nodeXy: { A: [0, 0], B: [0, 100] }, wayNodes: { w1: ["A", "B"] } };
  const start = { x: 1, y: 1 };
  const end = { x: -1, y: -1 };
  const result = planRoute({ graph, start, end });

  assert.equal(result.usedNetwork, false);
  assert.equal(result.distance, Math.hypot(end.x - start.x, end.y - start.y));
});

test("componentSizes maps every node to the size of the component it belongs to, including a node with no edges at all", () => {
  const adjacency = new Map([
    ["A", [{ to: "B", dist: 1 }]],
    ["B", [{ to: "A", dist: 1 }]],
    ["C", [{ to: "D", dist: 1 }]],
    ["D", [{ to: "C", dist: 1 }]]
  ]);
  const sizes = componentSizes(adjacency, ["A", "B", "C", "D", "E"]); // E has no adjacency entry at all
  assert.equal(sizes.get("A"), 2);
  assert.equal(sizes.get("B"), 2);
  assert.equal(sizes.get("C"), 2);
  assert.equal(sizes.get("D"), 2);
  assert.equal(sizes.get("E"), 1, "a node absent from adjacency is its own size-1 component, not left out");
});

test("planRoute #174 regression: does not snap onto a tiny disconnected stub just because it is geometrically nearest, when a real network is only a short walk further away", () => {
  // A "real" network: a straight chain comfortably over MIN_TRUSTED_COMPONENT_SIZE,
  // built rather than hand-listed so the test states its own actual requirement
  // (enough nodes to count as trusted) instead of a magic node count.
  const nodeXy = {};
  const wayNodes = { chain: [] };
  for (let i = 0; i < MIN_TRUSTED_COMPONENT_SIZE + 1; i++) {
    const id = `chain-${i}`;
    nodeXy[id] = [100, i * 10];
    wayNodes.chain.push(id);
  }
  // A 2-node stub, disconnected from the chain, sitting right next to both
  // start and end -- exactly #174's real shape (The Errand and Canteen both
  // nearest the same isolated map-editor road sketch, far nearer than any
  // real street).
  nodeXy["stub-a"] = [0, 0];
  nodeXy["stub-b"] = [0, 5];
  wayNodes.stub = ["stub-a", "stub-b"];

  const graph = { nodeXy, wayNodes };
  const start = { x: 0, y: 1 }; // ~1 unit from stub-a, ~100 units from the chain
  const end = { x: 0, y: 4 }; // ~1 unit from stub-b, ~100 units from the chain
  const result = planRoute({ graph, start, end });

  assert.equal(result.usedNetwork, false, "should walk straight between two points near an untrustworthy stub, not ride the stub");
  assert.equal(result.distance, 3, "start and end are 3 apart -- riding the stub would report ~7 instead");
  assert.deepEqual(result.segments, [{ kind: "walk", points: [start, end] }], "should be a single direct walk, not a detour via the stub's own nodes");
});

test("planRoute #174 regression: walks straight between two nearby points when reaching the network at all costs more than just walking there, even though a path technically exists", () => {
  // Two points 10 apart, but the only road is 1000 away from EACH of them --
  // reaching it and coming back off it again already costs more than the
  // direct trip, before a single unit of the ridden road is even counted.
  // This is The Errand/Canteen's real real shape (244px apart, nearest
  // trusted road 1000px+ from each), scaled down for a small fixture.
  const graph = { nodeXy: { A: [1000, 0], B: [1000, 100] }, wayNodes: { w1: ["A", "B"] } };
  const start = { x: 0, y: 0 }; // 1000 from A
  const end = { x: 10, y: 0 }; // 1000+ from A, 10 from start
  const result = planRoute({ graph, start, end });

  assert.equal(result.usedNetwork, false, "the round trip to reach the road and back costs far more than the 10-unit direct walk");
  assert.equal(result.distance, 10);
});

test("planRoute still rides the network when reaching it costs less than walking direct, even on a short hop", () => {
  // Same shape as the L-road test's own philosophy, just a shorter hop: the
  // road is genuinely on the way, so riding it is still the right call.
  const graph = { nodeXy: { A: [0, 0], B: [100, 0] }, wayNodes: { w1: ["A", "B"] } };
  const start = { x: 0, y: 1 }; // 1 unit from A
  const end = { x: 100, y: 1 }; // 1 unit from B
  const result = planRoute({ graph, start, end });

  assert.equal(result.usedNetwork, true);
  assert.equal(result.distance, 102); // 1 + 100 + 1
});

test("planRoute still rides a small network when it is the ONLY network (no dominant component to prefer instead)", () => {
  // Same shape as the L-road/disconnected-graph tests above: every existing
  // hand-built fixture in this file is smaller than MIN_TRUSTED_COMPONENT_SIZE
  // on purpose, so this pins that the size guard backs off entirely rather
  // than refusing to route at all when nothing meets the threshold.
  const graph = { nodeXy: { A: [0, 0], B: [0, 100] }, wayNodes: { w1: ["A", "B"] } };
  const result = planRoute({ graph, start: { x: 0, y: 0 }, end: { x: 0, y: 100 } });

  assert.equal(result.usedNetwork, true);
  assert.equal(result.distance, 100);
});

/* ------------------------------------------------------------------ */
/*  buildEdgeWayIndex / wayIdsForPath (2026-09-23) -- which real way a   */
/*  planned route's own hops actually ride, for core/travel-speed.mjs.  */
/* ------------------------------------------------------------------ */

test("buildEdgeWayIndex stores one canonical (smaller-id-first) key per hop, not one per node", () => {
  const index = buildEdgeWayIndex({ w1: ["A", "B", "C"] });
  assert.equal(index.get("A|B"), "w1");
  assert.equal(index.get("B|C"), "w1");
  assert.equal(index.size, 2, "one entry per hop, not per node");
});

test("wayIdsForPath finds the same way regardless of which direction the path actually travels the edge", () => {
  // The index itself only ever stores the canonical direction (the test
  // above) -- it is wayIdsForPath's own job to normalise a real path's
  // direction to that same key, which is what "regardless of direction"
  // actually means here.
  const index = buildEdgeWayIndex({ w1: ["A", "B"] });
  assert.deepEqual(wayIdsForPath(["A", "B"], index), ["w1"]);
  assert.deepEqual(wayIdsForPath(["B", "A"], index), ["w1"]);
});

test("buildEdgeWayIndex keeps the first way when two ways happen to share an edge, rather than silently overwriting it", () => {
  const index = buildEdgeWayIndex({ w1: ["A", "B"], w2: ["A", "B"] });
  assert.equal(index.get("A|B"), "w1");
});

test("wayIdsForPath returns one way id per hop, in path order, and null for a hop with no known way", () => {
  const index = buildEdgeWayIndex({ w1: ["A", "B"], w2: ["B", "C"] });
  assert.deepEqual(wayIdsForPath(["A", "B", "C"], index), ["w1", "w2"]);
  assert.deepEqual(wayIdsForPath(["A", "Z"], index), [null]);
});

test("planRoute's own network segment carries wayIds when a route rides two different ways back to back", () => {
  const graph = {
    nodeXy: { A: [0, 0], B: [0, 100], C: [100, 100] },
    wayNodes: { w1: ["A", "B"], w2: ["B", "C"] } // two separate ways, joined at B
  };
  const result = planRoute({ graph, start: { x: 0, y: 0 }, end: { x: 100, y: 100 } });
  assert.equal(result.usedNetwork, true);
  assert.deepEqual(result.segments[0].wayIds, ["w1", "w2"]);
});
