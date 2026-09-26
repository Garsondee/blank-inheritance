// Tier 1 — travel-animation (Layer 1 of ideas/entries/road-network-routing.json).
//
// The claim these tests hold up: sceneCalibration reads a REAL scene's
// tiles and gets the scale, the origin offset, AND the tile anchor right.
// The origin-from-tiles half was the bug this file originally existed to
// keep fixed (a scale-only model happened to look correct against a
// different, zero-offset scene first). The ANCHOR half was added
// 2026-09-23, after that same fixed-looking formula turned out to still be
// wrong: it read a Tile's own x/y as its top-left corner unconditionally,
// but Foundry v14's real TileDocument centre-anchors every Tile by default
// (common/documents/tile.mjs's own TextureData default, anchorX/anchorY
// 0.5) -- confirmed against the real remote hub scene's own four Tiles,
// every one of which reported anchor 0.5/0.5. That put every point this
// function produced a full half-tile off in both axes (3100px on this
// hub's 6200px tiles), which is what actually put the map's pins out in
// open water, a full grid square from the land they name -- found live,
// from the map's own baked-in grid references and a screenshot, because a
// check that only re-applied this SAME formula to invert itself could not
// catch a bug the formula itself carried on both sides.
//
// Also: a hop's share of the total travel time always equals its share of
// the route's total length -- a long straight stretch is not watched at
// the same speed as a short winding one -- and degenerate routes (a single
// point, a zero-length route) animate nothing rather than dividing by
// zero.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  sceneCalibration,
  toScenePoint,
  toImagePoint,
  flattenRoute,
  hopDurations
} from "../module/blank-inheritance/scripts/core/travel-animation.mjs";

// The real remote hub scene's own four Tile documents, read live
// 2026-09-23 -- x/y/width/height and the real texture anchor, all as
// actually stored, not assumed. Scene.padding is 0.25 on this document,
// giving a real sceneX/sceneY of 3100 -- which these tiles' own
// centre-anchored placement lands on exactly, confirmed independently via
// canvas.scene.dimensions live: four tiles centred so their combined
// TOP-LEFT-rendered footprint starts at (3100,3100), not their own
// declared (x,y).
const REAL_HUB_TILES = [
  { x: 6200, y: 6200, width: 6200, height: 6200, texture: { anchorX: 0.5, anchorY: 0.5 } }, // nw
  { x: 12400, y: 6200, width: 6200, height: 6200, texture: { anchorX: 0.5, anchorY: 0.5 } }, // ne
  { x: 6200, y: 12400, width: 6200, height: 6200, texture: { anchorX: 0.5, anchorY: 0.5 } }, // sw
  { x: 12400, y: 12400, width: 6200, height: 6200, texture: { anchorX: 0.5, anchorY: 0.5 } } // se
];
const MANIFEST_IMAGE_WIDTH = 12400; // data/map/campaign-map.json's image.width

test("sceneCalibration reads the real hub scene's centre-anchored tiles as a (3100,3100) origin at scale 1", () => {
  const cal = sceneCalibration(REAL_HUB_TILES, 12400, MANIFEST_IMAGE_WIDTH);
  assert.deepEqual(cal, { originX: 3100, originY: 3100, scale: 1 });
});

test("a top-left-anchored tile (anchor 0/0) is handled too -- x/y IS its top-left corner in that case", () => {
  const topLeftTiles = [
    { x: 0, y: 0, width: 6200, height: 6200, texture: { anchorX: 0, anchorY: 0 } },
    { x: 6200, y: 0, width: 6200, height: 6200, texture: { anchorX: 0, anchorY: 0 } },
    { x: 0, y: 6200, width: 6200, height: 6200, texture: { anchorX: 0, anchorY: 0 } },
    { x: 6200, y: 6200, width: 6200, height: 6200, texture: { anchorX: 0, anchorY: 0 } }
  ];
  const cal = sceneCalibration(topLeftTiles, 12400, MANIFEST_IMAGE_WIDTH);
  assert.deepEqual(cal, { originX: 0, originY: 0, scale: 1 });
});

test("a tile with no texture field at all still gets Foundry's own real default (centre-anchored), not top-left", () => {
  // Foundry's TileDocument sets this default itself (tile.mjs's own
  // TextureData initial value) -- a caller that forgot to read `texture`
  // off a plain fixture must still land on the SAME answer a real
  // TileDocument would, not silently fall back to the old, wrong top-left
  // assumption.
  const bareTiles = REAL_HUB_TILES.map(({ texture, ...rest }) => rest);
  const cal = sceneCalibration(bareTiles, 12400, MANIFEST_IMAGE_WIDTH);
  assert.deepEqual(cal, { originX: 3100, originY: 3100, scale: 1 });
});

test("toScenePoint/toImagePoint round-trip through the real hub scene's calibration", () => {
  const cal = sceneCalibration(REAL_HUB_TILES, 12400, MANIFEST_IMAGE_WIDTH);
  const imagePoint = { x: 100, y: 250 };
  const scenePoint = toScenePoint(imagePoint, cal);
  assert.deepEqual(scenePoint, { x: 3200, y: 3350 });
  assert.deepEqual(toImagePoint(scenePoint, cal), imagePoint);
});

test("sceneCalibration falls back to scale-only, zero-origin for a plain background scene with no tiles", () => {
  // The local test world's own "The City" scene: a single 6200x6200
  // background, Scene padding 0 -- confirmed live 2026-09-18.
  const cal = sceneCalibration([], 6200, MANIFEST_IMAGE_WIDTH);
  assert.deepEqual(cal, { originX: 0, originY: 0, scale: 0.5 });
});

test("flattenRoute drops the repeated seam between consecutive segments", () => {
  const segments = [
    { kind: "walk", points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] },
    { kind: "network", points: [{ x: 10, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 10 }] }
  ];
  assert.deepEqual(flattenRoute(segments), [
    { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 10 }
  ]);
});

test("hopDurations splits total time proportionally to each hop's share of the total distance", () => {
  // 0 -> 10 -> 40: hops of length 10 and 30, i.e. a 1:3 split of 4000ms.
  const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 40, y: 0 }];
  const hops = hopDurations(points, 4000);
  assert.equal(hops.length, 2);
  assert.equal(hops[0].durationMs, 1000);
  assert.equal(hops[1].durationMs, 3000);
  assert.deepEqual(hops.map((h) => h.to), [{ x: 10, y: 0 }, { x: 40, y: 0 }]);
});

test("hopDurations returns nothing for a single point -- no hop to animate", () => {
  assert.deepEqual(hopDurations([{ x: 5, y: 5 }], 1000), []);
});

test("hopDurations returns nothing for a zero-length route rather than dividing by zero", () => {
  const points = [{ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 }];
  assert.deepEqual(hopDurations(points, 1000), []);
});
