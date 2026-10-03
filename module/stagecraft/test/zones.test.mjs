import { test } from "node:test";
import assert from "node:assert/strict";
import { pointInPolygon, distanceToPolygon, centroid, zonesAt, zoneArea, outlineStates, outlineStrength, zoneChanges, OUTLINE, REST_STRENGTH } from "../scripts/core/zones.mjs";

const square = [[0.2, 0.2], [0.4, 0.2], [0.4, 0.4], [0.2, 0.4]];
const L = [[0, 0], [0.4, 0], [0.4, 0.2], [0.2, 0.2], [0.2, 0.4], [0, 0.4]];

test("point in polygon: inside, outside, and a concave shape", () => {
  assert.equal(pointInPolygon(square, 0.3, 0.3), true);
  assert.equal(pointInPolygon(square, 0.5, 0.3), false);
  assert.equal(pointInPolygon(L, 0.1, 0.3), true);
  assert.equal(pointInPolygon(L, 0.3, 0.3), false, "the notch of an L is outside it");
});

test("distance to a polygon's outline", () => {
  assert.ok(Math.abs(distanceToPolygon(square, 0.5, 0.3) - 0.1) < 1e-9);
  assert.ok(distanceToPolygon(square, 0.3, 0.3) - 0.1 < 1e-9, "from the middle it is the nearest edge");
  assert.ok(Math.abs(distanceToPolygon(square, 0.1, 0.1) - Math.hypot(0.1, 0.1)) < 1e-9, "from a corner it is the corner");
});

test("centroid and zonesAt", () => {
  const [cx, cy] = centroid(square);
  assert.ok(Math.abs(cx - 0.3) < 1e-9 && Math.abs(cy - 0.3) < 1e-9);
  const zones = [{ id: "a", shape: square }, { id: "b", shape: L }];
  assert.deepEqual(zonesAt(zones, 0.3, 0.3).map((z) => z.id), ["a"]);
  assert.deepEqual(zonesAt(zones, 0.1, 0.1).map((z) => z.id), ["b"]);
  assert.deepEqual(zonesAt(zones, 0.9, 0.9), []);
});

test("an outline is at rest with nothing held, near with a card in reach, and the target with a card over it", () => {
  const zones = [{ id: "a", shape: square }, { id: "far", shape: [[0.8, 0.8], [0.9, 0.8], [0.9, 0.9]] }];
  assert.deepEqual(outlineStates(zones, []), { a: OUTLINE.rest, far: OUTLINE.rest });
  assert.equal(outlineStates(zones, [{ x: 0.45, y: 0.3 }]).a, OUTLINE.near);
  assert.equal(outlineStates(zones, [{ x: 0.3, y: 0.3 }]).a, OUTLINE.target);
  assert.equal(outlineStates(zones, [{ x: 0.3, y: 0.3 }]).far, OUTLINE.rest);
  assert.equal(outlineStates(zones, [{ x: 0.6, y: 0.3 }], 0.3).a, OUTLINE.near, "reach is a parameter");
  assert.equal(outlineStates(zones, [{ x: 0.45, y: 0.3 }, { x: 0.3, y: 0.3 }]).a, OUTLINE.target, "the strongest state wins");
});

test("a zone drawn on the wall is acted on from the floor strip in front of it", () => {
  const wall = [[0.8, 0.2], [0.9, 0.2], [0.9, 0.5], [0.8, 0.5]];
  const strip = [[0.8, 0.85], [0.9, 0.85], [0.9, 0.95], [0.8, 0.95]];
  const door = { id: "door", shape: wall, floor: strip };
  assert.deepEqual(zonesAt([door], 0.85, 0.9).map((z) => z.id), ["door"], "standing on the strip is being at the door");
  assert.deepEqual(zonesAt([door], 0.85, 0.35), [], "the painted door itself is not somewhere a card stands");
  assert.equal(outlineStates([door], [{ x: 0.85, y: 0.9 }]).door, OUTLINE.target);
  assert.equal(outlineStates([door], [{ x: 0.85, y: 0.35 }]).door, OUTLINE.rest, "the wall is far from the strip");
  assert.equal(zoneArea({ shape: wall }), wall, "with no strip, the shape is the area");
});

test("subtle by default: faint at rest, loud only when it matters, and the player's setting is honoured", () => {
  const z = { id: "a", shape: square };
  assert.equal(outlineStrength(z, OUTLINE.rest, "faint"), REST_STRENGTH.faint);
  assert.ok(REST_STRENGTH.faint <= 0.25, "faint is a hairline, a fifth of full strength or less");
  assert.equal(outlineStrength(z, OUTLINE.rest, "off"), 0);
  assert.equal(outlineStrength(z, OUTLINE.rest, "full"), 1);
  assert.equal(outlineStrength(z, OUTLINE.near, "off"), 0.85, "near shows even when rest is off");
  assert.equal(outlineStrength(z, OUTLINE.target, "off"), 1);
  assert.equal(outlineStrength({ ...z, quiet: true }, OUTLINE.rest, "full"), 0, "a quiet zone never shows at rest");
  assert.equal(outlineStrength({ ...z, quiet: true }, OUTLINE.near, "faint"), 0.85);
  // a chalk zone is not drawn at rest: it means something only with chalk in hand, when the host lights it
  assert.equal(outlineStrength({ ...z, kind: "chalk" }, OUTLINE.rest, "full"), 0);
  // 2026-10-03: zones are hidden at rest unless a player asks for them, so the setting's first choice is "off"
  assert.equal(outlineStrength(z, OUTLINE.rest, "off"), 0, "the default: nothing at rest");
  assert.equal(outlineStrength({ ...z, kind: "chalk" }, OUTLINE.near, "faint"), 0.85);
});

test("entering and leaving are events, and a card that stays put makes none", () => {
  const before = new Map([["x", new Set(["a"])], ["y", new Set()]]);
  const now = new Map([["x", new Set(["a", "b"])], ["y", new Set()]]);
  assert.deepEqual(zoneChanges(before, now), [{ type: "zone", card: "x", zone: "b", entered: true }]);
  assert.deepEqual(zoneChanges(now, before), [{ type: "zone", card: "x", zone: "b", entered: false }]);
  assert.deepEqual(zoneChanges(before, before), []);
  assert.deepEqual(zoneChanges(new Map(), new Map([["n", new Set(["a"])]])), [{ type: "zone", card: "n", zone: "a", entered: true }], "a new card entering a zone");
  assert.deepEqual(zoneChanges(new Map([["g", new Set(["a"])]]), new Map()), [{ type: "zone", card: "g", zone: "a", entered: false }], "a card that was removed has left");
});
