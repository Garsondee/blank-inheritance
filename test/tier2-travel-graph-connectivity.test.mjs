// Tier 2 — the exported travel graph's own connectivity, checked against
// real Episode One locations. 2026-09-19.
//
// Found live (Ingram): the map-travel marker "wiggled around outside the
// main island... landed in the ocean rather than where it needed to end
// up." Investigated precisely rather than guessed at:
//
//   1. RULED OUT — coordinate calibration. sceneCalibration()'s origin+scale
//      math, and georef.py's border-offset handling, both checked directly
//      against the real production numbers (the real Campaign Map Scene's
//      four Tiles, the real 12400x12400 manifest) and found correct.
//   2. RULED OUT — the routing algorithm. planRoute()'s own established,
//      deliberately-tested behavior ("ride the network even when it's
//      longer than walking", "leave the road as close as you can get on a
//      disconnected graph") is CORRECT and intentional — confirmed by
//      briefly trying a "prefer direct when routing doesn't shorten the
//      trip" fix and finding it broke three legitimate, deliberate existing
//      tests (tier1-travel-route.test.mjs) for exactly the behavior it's
//      supposed to have. Reverted; recorded here so the same fix isn't
//      re-attempted the same way.
//   3. CONFIRMED — a real, narrow, LOCALIZED graph connectivity gap. The
//      overall exported graph (data/map/travel-graph.json) is healthy: one
//      giant component holds 94.5% of all 64,307 nodes. But the nearest
//      graph node to BOTH The Errand's real location (the-general-store-416)
//      AND Canteen's real location (long-hall) is the SAME isolated 2-node,
//      1-edge fragment, completely disconnected from that main component.
//      Every route to or from either location dead-ends at this stub and
//      falls back to a long straight-line walk (87-88% of the total trip in
//      both cases measured) — which, on a real GIS-derived map, is free to
//      cross open water, exactly matching the reported symptom.
//
// This was a data problem (tools/gazetteer's exported road graph), not a
// code bug — pinned here as a KNOWN GAP so it would fail loudly the moment
// a fix landed, per this file's own original instruction.
//
// CORRECTION, 2026-09-23: claim #1 above ("ruled out... found correct") was
// wrong, discovered while fixing an apparently-unrelated map-pin bug that
// turned out to be the SAME root cause. sceneCalibration() read a real
// Tile's own x/y as its top-left corner unconditionally; Foundry v14
// centre-anchors every Tile by default (common/documents/tile.mjs), so the
// real top-left is (x - width*anchorX, y - height*anchorY), and every one
// of this map's real Tiles reports anchor 0.5/0.5. That put every point
// this function produced a full half-tile off in both axes — on this
// map's own 6200px tiles, 3100px, more than enough on its own to land a
// marker "in the ocean." The 2026-09-19 check against "the real production
// numbers" re-applied this same (buggy) formula rather than checking
// against independent ground truth, so it could not have caught this —
// see core/travel-animation.mjs's own sceneCalibration header and
// test/tier1-travel-animation.test.mjs for the actual fix and its
// regression coverage. This did NOT retract claim #3 at the time — the
// isolated graph fragment was real, independently confirmed, and unaffected
// by the calibration fix — the two bugs were compounding each other, not
// alternatives.
//
// FIXED, 2026-09-23, same day, a separate and much larger investigation:
// Ingram found the SAME underlying disease live, on a completely different
// pair of locations (Intake Infirmary / the Drill Hall) — a token walking
// in a dead-straight line across a street grid the rendered map plainly
// shows. Traced to the real root cause, all the way down: citymap/parse.py's
// parse_elements only adds a way to road_graph/rail_graph when Overpass
// returned a per-vertex `nodes` array of EXACTLY matching length; for a
// real, non-trivial set of ways (527 in the Intake/Drill-Hall
// neighbourhood alone, tens of thousands sheet-wide) it didn't, and those
// ways survived only as generic, renderer-visible Features — invisible to
// routing, structurally identical to The Errand/Canteen's own isolated
// stub. tools/gazetteer/export_travel_graph.py's new derive_gap_graph_from_
// features recovers them: real LineString geometry already sitting in
// data/map/kurose.gpkg, additive only (never touches a way the real OSM
// import already covers), connectivity reconstructed by exact-coordinate
// snapping (two ways that meet in reality share the same real point, so
// this invents no geometry, only identity) — with Kobe Airport's own
// op-0001 demolish polygon (buffered 50m, plus a blanket `aeroway` tag
// check) as a hard exclusion, so gap-filling can never quietly restore
// vehicle access to a place the campaign has deliberately put underwater.
// The Errand and Canteen were never this ticket's own target, but sit in
// the exact same disease and were fixed by the exact same cure — this
// file's own two KNOWN GAP tests below now fail on the OLD assertions and
// pass on the new ones, exactly as originally promised.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildAdjacency, nearestNode, planRoute } from "../module/blank-inheritance/scripts/core/travel-route.mjs";

const graph = JSON.parse(readFileSync(new URL("../data/map/travel-graph.json", import.meta.url), "utf8"));

// Real centroidPx values, read directly from the real location files this
// same investigation used live (data/locations/*.json's own derived.centroidPx).
const KIT_ISSUE = { x: 7059.84, y: 5165.07 };
const THE_ERRAND = { x: 7185.79, y: 6773.56 };
const CANTEEN = { x: 7085.33, y: 6514.21 };

function connectedComponents(adjacency, allNodeIds) {
  const visited = new Set();
  const components = [];
  for (const id of allNodeIds) {
    if (visited.has(id)) continue;
    const stack = [id];
    const comp = [];
    visited.add(id);
    while (stack.length) {
      const cur = stack.pop();
      comp.push(cur);
      for (const edge of adjacency.get(cur) ?? []) {
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          stack.push(edge.to);
        }
      }
    }
    components.push(comp);
  }
  return components.sort((a, b) => b.length - a.length);
}

test("the exported graph overall is healthy — most of the map is one connected component, so this is a localized gap, not a systemic export bug", () => {
  const allNodeIds = Object.keys(graph.nodeXy);
  const adjacency = buildAdjacency(graph);
  const components = connectedComponents(adjacency, allNodeIds);
  const largestFraction = components[0].length / allNodeIds.length;
  assert.ok(largestFraction > 0.9, `only ${(largestFraction * 100).toFixed(1)}% of nodes are in the largest component — this would mean the export itself is broadly broken, not narrowly gapped`);
});

test("FIXED 2026-09-23: The Errand and Canteen no longer share an isolated stub — each has its own close, real connection into the main network", () => {
  const allNodeIds = Object.keys(graph.nodeXy);
  const adjacency = buildAdjacency(graph);
  const components = connectedComponents(adjacency, allNodeIds);
  const largest = new Set(components[0]);

  const errandNode = nearestNode(graph.nodeXy, THE_ERRAND);
  const canteenNode = nearestNode(graph.nodeXy, CANTEEN);

  assert.notEqual(errandNode.id, canteenNode.id, "The Errand and Canteen are sharing a single nearest node again — the isolated-stub regression may be back");
  assert.ok(largest.has(errandNode.id), "The Errand's nearest node is no longer in the main connected component — the gap-fill regressed");
  assert.ok(largest.has(canteenNode.id), "Canteen's nearest node is no longer in the main connected component — the gap-fill regressed");
  // Real junctions, not a stub grown just big enough to pass: both must sit
  // within an easy walk of the real network, not merely "somewhere in the
  // giant component" (a component can be huge and still leave a specific
  // point stranded metres from its own nearest edge).
  assert.ok(errandNode.dist < 200, `The Errand's nearest network node is ${errandNode.dist.toFixed(0)}px away — too far to read as "connected" rather than "technically in the same component"`);
  assert.ok(canteenNode.dist < 200, `Canteen's nearest network node is ${canteenNode.dist.toFixed(0)}px away — too far to read as "connected" rather than "technically in the same component"`);
});

test("FIXED 2026-09-23: routing to/from The Errand or Canteen from Kit Issue rides real roads now, not a dominant straight-line walk", () => {
  function walkFraction(route) {
    const walked = route.segments
      .filter((s) => s.kind === "walk")
      .reduce((sum, s) => {
        let d = 0;
        for (let i = 1; i < s.points.length; i++) {
          d += Math.hypot(s.points[i].x - s.points[i - 1].x, s.points[i].y - s.points[i - 1].y);
        }
        return sum + d;
      }, 0);
    return walked / route.distance;
  }

  const toErrand = planRoute({ graph, start: KIT_ISSUE, end: THE_ERRAND });
  const toCanteen = planRoute({ graph, start: KIT_ISSUE, end: CANTEEN });

  assert.ok(toErrand.usedNetwork, "Kit Issue -> The Errand no longer rides the network at all");
  assert.ok(toCanteen.usedNetwork, "Kit Issue -> Canteen no longer rides the network at all");
  // Measured 2026-09-23 after the gap-fill: ~7% and ~6% (was 87-88%) --
  // asserting well below that measured value, not just "improved", so a
  // partial regression back toward all-walk still fails loudly.
  assert.ok(walkFraction(toErrand) < 0.3, `Kit Issue -> The Errand's walk fraction is back up to ${(walkFraction(toErrand) * 100).toFixed(0)}% — the connectivity gap may be regressing`);
  assert.ok(walkFraction(toCanteen) < 0.3, `Kit Issue -> Canteen's walk fraction is back up to ${(walkFraction(toCanteen) * 100).toFixed(0)}% — the connectivity gap may be regressing`);
});
