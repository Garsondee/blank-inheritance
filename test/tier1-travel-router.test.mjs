// Tier 1 -- the cached router (core/travel-route.mjs#createRouter) against the router the game has always used (`planRoute`).
//
// The claim: createRouter is planRoute made fast, not a different router. The Location Editor previews journeys with it and says "this is the route
// the tokens will take", so the two must agree exactly: the same snap onto the network, the same shortest path (including which of two equal paths),
// the same refusal to ride a road that does not help, the same walk where the network runs out. Checked on hand-made graphs (the shapes the existing
// route tests are built on), on seeded random graphs full of ties and stubs and separate networks, and on real journeys across the real graph.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAdjacency, componentSizes, createRouter, planRoute, routerFor, MIN_TRUSTED_COMPONENT_SIZE, nearestNode } from "../module/blank-inheritance/scripts/core/travel-route.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** What planRoute returns: everything but the router's own `meta`. */
const shape = ({ distance, usedNetwork, segments }) => ({ distance, usedNetwork, segments });
const same = (graph, start, end, note = "") => {
  const router = createRouter(graph);
  assert.deepEqual(shape(router.plan({ start, end })), shape(planRoute({ graph, start, end })), `the two routers disagree ${note}: ${JSON.stringify({ start, end })}`);
};

// a small L-shaped road, a second separate network, and a two-node stub, like tier1-travel-route's own fixtures
const lGraph = {
  nodeXy: { 1: [0, 0], 2: [0, 100], 3: [100, 100], 4: [100, 200] },
  wayNodes: { w1: [1, 2, 3, 4] },
  wayClass: { w1: "residential" }
};

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A grid of roads (every edge the same length: a field of exact ties), a few separate networks, and some stubs, all numbered by chance. */
function randomGraph(seed) {
  const rand = mulberry32(seed);
  const nodeXy = {};
  const wayNodes = {};
  let next = 100;
  const grid = 6 + Math.floor(rand() * 5);
  const id = (gx, gy) => 1000 + gx * 100 + gy;
  for (let gx = 0; gx < grid; gx++) for (let gy = 0; gy < grid; gy++) nodeXy[id(gx, gy)] = [gx * 50, gy * 50];
  for (let gx = 0; gx < grid; gx++) {
    wayNodes[`row${gx}`] = Array.from({ length: grid }, (_, gy) => id(gx, gy));
    wayNodes[`col${gx}`] = Array.from({ length: grid }, (_, gy) => id(gy, gx));
  }
  // knock out a few hops: a grid with gaps, so some routes must go round
  for (let k = 0; k < grid; k++) {
    const gx = Math.floor(rand() * (grid - 1));
    const gy = Math.floor(rand() * (grid - 1));
    wayNodes[`gap${k}`] = [id(gx, gy), id(gx + 1, gy + 1)];
  }
  // separate networks (big enough to be trusted, and too small), and two-node stubs
  for (let net = 0; net < 3; net++) {
    const size = net === 0 ? MIN_TRUSTED_COMPONENT_SIZE + 3 : 5;
    const ox = 1000 + net * 700;
    const oy = -400 + net * 300;
    const ids = [];
    for (let i = 0; i < size; i++) {
      nodeXy[next] = [ox + i * 40, oy + (i % 2) * 20];
      ids.push(next++);
    }
    wayNodes[`net${net}`] = ids;
  }
  for (let s = 0; s < 3; s++) {
    nodeXy[next] = [rand() * 300, 400 + rand() * 100];
    nodeXy[next + 1] = [rand() * 300, 400 + rand() * 100];
    wayNodes[`stub${s}`] = [next, next + 1];
    next += 2;
  }
  const points = Array.from({ length: 24 }, () => ({ x: Math.round(rand() * 1600 - 200), y: Math.round(rand() * 900 - 300) }));
  return { graph: { nodeXy, wayNodes }, points };
}

test("on the hand-made L-shaped road the two routers agree for starts and ends on the road, beside it, far from it and on top of a node", () => {
  const points = [{ x: 0, y: 0 }, { x: 100, y: 200 }, { x: 40, y: 30 }, { x: 130, y: 180 }, { x: -500, y: 50 }, { x: 900, y: 900 }, { x: 0, y: 100 }];
  for (const start of points) for (const end of points) same(lGraph, start, end, "on the L-shaped road");
});

test("with no graph at all both walk straight, and say why", () => {
  const router = createRouter({});
  const result = router.plan({ start: { x: 0, y: 0 }, end: { x: 30, y: 40 } });
  assert.deepEqual(shape(result), shape(planRoute({ start: { x: 0, y: 0 }, end: { x: 30, y: 40 } })));
  assert.equal(result.meta.reason, "no-graph");
  assert.equal(router.nearestNode({ x: 1, y: 1 }), null);
});

test("on seeded random graphs full of exact ties, stubs and separate networks, every start and end gives the same route from both routers", () => {
  let compared = 0;
  let rode = 0;
  let disconnected = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const { graph, points } = randomGraph(seed);
    const router = createRouter(graph);
    for (let i = 0; i < points.length; i += 2) {
      const start = points[i];
      const end = points[i + 1];
      const mine = router.plan({ start, end });
      assert.deepEqual(shape(mine), shape(planRoute({ graph, start, end })), `seed ${seed}, ${JSON.stringify({ start, end })}`);
      compared++;
      if (mine.usedNetwork) rode++;
      if (mine.meta.connected === false) disconnected++;
    }
  }
  assert.ok(compared >= 140);
  assert.ok(rode > 20, "the random graphs are not all plain walks");
  assert.ok(disconnected > 3, "and some of them leave the network where it runs out");
});

test("asking the same router again from the same starting point gives the same answer, and the shortest-path table is kept (the speed-up) up to its limit", () => {
  const { graph, points } = randomGraph(77);
  const router = createRouter(graph, { cacheSize: 3 });
  const first = router.plan({ start: points[0], end: points[1] });
  assert.deepEqual(router.plan({ start: points[0], end: points[1] }), first);
  assert.equal(router.stats().cachedTables, 1, "one start, one table");
  router.plan({ start: points[0], end: points[2] });
  assert.equal(router.stats().cachedTables, 1, "a second end from the same start reuses it");
  for (let i = 2; i < 12; i++) router.plan({ start: { x: points[i].x + 3, y: points[i].y }, end: points[0] });
  assert.ok(router.stats().cachedTables <= 3, "the oldest tables are let go");
  assert.deepEqual(shape(router.plan({ start: points[0], end: points[1] })), shape(planRoute({ graph, start: points[0], end: points[1] })), "and a table let go is simply made again, identically");
});

test("meta says how the route met the network: the walks at each end, the ride, whether the destination's network is connected, and why a walk was chosen", () => {
  const router = createRouter(lGraph);
  const rides = router.plan({ start: { x: -30, y: 0 }, end: { x: 130, y: 200 } });
  assert.equal(rides.usedNetwork, true);
  assert.equal(rides.meta.startWalk, 30);
  assert.equal(rides.meta.endWalk, 30);
  assert.equal(rides.meta.networkMetres, 300);
  assert.equal(rides.meta.connected, true);
  assert.equal(rides.meta.reason, null);

  const walks = router.plan({ start: { x: 0, y: 0 }, end: { x: 5, y: 5 } });
  assert.equal(walks.usedNetwork, false);
  assert.ok(["stub", "not-shorter"].includes(walks.meta.reason));

  // a destination on a different network: the ride stops where the network does, and says so
  const two = { nodeXy: { ...lGraph.nodeXy, 10: [1000, 0], 11: [1000, 100] }, wayNodes: { ...lGraph.wayNodes, w2: [10, 11] } };
  const far = createRouter(two, {}).plan({ start: { x: 0, y: 0 }, end: { x: 1000, y: 60 } });
  assert.equal(far.meta.connected, false);
});

test("nearestNode finds what the linear scan over the TRUSTED nodes finds, including from far outside the graph and from exactly between two nodes", () => {
  const { graph } = randomGraph(5);
  const router = createRouter(graph);
  const sizes = componentSizes(buildAdjacency(graph), Object.keys(graph.nodeXy));
  const trusted = Object.fromEntries(Object.entries(graph.nodeXy).filter(([id]) => sizes.get(id) >= MIN_TRUSTED_COMPONENT_SIZE));
  assert.ok(Object.keys(trusted).length > 50 && Object.keys(trusted).length < Object.keys(graph.nodeXy).length, "the graph has untrusted stubs for the router to skip");
  const rand = mulberry32(9);
  for (let i = 0; i < 80; i++) {
    const p = { x: Math.round(rand() * 3000 - 1000), y: Math.round(rand() * 2000 - 800) };
    const hit = router.nearestNode(p);
    const brute = nearestNode(trusted, p);
    assert.equal(hit.id, brute.id, JSON.stringify(p));
    assert.equal(hit.dist, brute.dist);
  }
  assert.equal(router.nearestNode({ x: 25, y: 0 }).dist, 25, "a point between two nodes is 25 from each: the first in the graph's own order");
});

test("routerFor builds one router per graph object and hands the same one back", () => {
  assert.equal(routerFor(lGraph), routerFor(lGraph));
  assert.notEqual(routerFor(lGraph), routerFor({ ...lGraph }));
});

/* ---------------------------------------------------------------- the real graph */

const graphPath = path.join(repo, "data", "map", "travel-graph.json");
const haveGraph = existsSync(graphPath);

function realPlaces() {
  const dir = path.join(repo, "data", "locations");
  const out = [];
  for (const file of ["candidate-gate", "intake-infirmary", "the-drill-hall", "main-school-complex", "the-quartermasters-stores", "island-platforms", "long-hall", "old-landing", "the-proving-ground", "landing-end", "seaward-platform"]) {
    const doc = JSON.parse(readFileSync(path.join(dir, `${file}.json`), "utf8"));
    out.push({ id: file, point: { x: doc.derived.centroidPx[0], y: doc.derived.centroidPx[1] } });
  }
  return out;
}

test("on the real graph the cached router takes the same journeys as planRoute: a spread of real places, there and back", { skip: !haveGraph && "data/map/travel-graph.json is not here" }, () => {
  const graph = JSON.parse(readFileSync(graphPath, "utf8"));
  const places = realPlaces();
  const router = createRouter(graph);
  // planRoute takes about 0.7 s a call on this graph, so the everyday suite holds four journeys; BI_SLOW=1 holds all of them.
  const pairs = [];
  for (let a = 0; a < places.length; a++) for (let b = 0; b < places.length; b++) if (a !== b) pairs.push([places[a], places[b]]);
  const chosen = process.env.BI_SLOW ? pairs : [pairs[1], pairs[12], pairs[27], pairs[44]];
  for (const [from, to] of chosen) {
    assert.deepEqual(shape(router.plan({ start: from.point, end: to.point })), shape(planRoute({ graph, start: from.point, end: to.point })), `${from.id} -> ${to.id}`);
  }
  const stats = router.stats();
  assert.ok(stats.nodes > 60000 && stats.largestComponent > 60000, JSON.stringify(stats));
});

test("on the real graph a route costs milliseconds once the router is built, not most of a second", { skip: !haveGraph && "data/map/travel-graph.json is not here" }, () => {
  const graph = JSON.parse(readFileSync(graphPath, "utf8"));
  const places = realPlaces();
  const router = createRouter(graph);
  router.plan({ start: places[0].point, end: places[1].point }); // builds the first table
  const t0 = performance.now();
  for (let i = 0; i < places.length; i++) router.plan({ start: places[0].point, end: places[i].point }); // one start: tables reused
  const perRoute = (performance.now() - t0) / places.length;
  assert.ok(perRoute < 100, `${perRoute.toFixed(1)} ms a route from a known start (planRoute takes about 700)`);
});
