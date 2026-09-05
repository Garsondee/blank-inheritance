// Tier 1 — map-marker placement geometry.
//
// The claim these tests hold up: a marker CARD always lands inside the
// visible band, clear of every exclusion it is given, joined to its DOT by a
// stem — at any console size. Every bug in the console series so far was
// "something slid under something else"; for markers that is now a
// property checked here rather than a screenshot checked by eye.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  placeMarker,
  layoutMarkers,
  rectsIntersect,
  stemTo,
  visibleBand,
  fixFrom
} from "../module/blank-inheritance/scripts/core/marker-layout.mjs";

const inside = (r, b) => r.x0 >= b.x0 - 1e-9 && r.y0 >= b.y0 - 1e-9 && r.x1 <= b.x1 + 1e-9 && r.y1 <= b.y1 + 1e-9;
const SIZE = { w: 320, h: 430 };
const BAND_1080 = visibleBand({ width: 1892, height: 1064, topRail: 54, chassis: 214 });
const BAND_4K = visibleBand({ width: 3812, height: 2144, topRail: 54, chassis: 214 });

test("visibleBand excludes the top rail, the chassis and a margin", () => {
  assert.deepEqual(BAND_1080, { x0: 8, y0: 62, x1: 1884, y1: 842 });
});

test("a card sits to the right of its dot, vertically centred, when there is room", () => {
  const p = placeMarker({ anchor: { x: 600, y: 500 }, size: SIZE, bounds: BAND_4K });
  assert.equal(p.side, "right");
  assert.equal(p.x, 626);
  assert.equal(p.y, 500 - 215);
  assert.equal(Math.round(p.stem.length), 26);
  assert.equal(p.stem.angle, 0);
});

test("a card near the right edge flips to the left", () => {
  const p = placeMarker({ anchor: { x: 1800, y: 500 }, size: SIZE, bounds: BAND_1080 });
  assert.equal(p.side, "left");
  assert.equal(p.rect.x1, 1800 - 26);
  assert.ok(inside(p.rect, BAND_1080));
});

test("a card whose dot is under the chassis is lifted into the band and keeps its stem", () => {
  // The Pier dot at --y:.79 of a 1064px console is 840px down; a 430px card
  // centred on it would run 200px under the chassis. It must not.
  const anchor = { x: 946, y: 840 };
  const p = placeMarker({ anchor, size: SIZE, bounds: BAND_1080 });
  assert.ok(inside(p.rect, BAND_1080), `card ${JSON.stringify(p.rect)} leaves the band`);
  assert.equal(p.rect.y1, BAND_1080.y1);
  // Still attached: the stem ends on the card's perimeter, not in space.
  assert.equal(p.stem.x2, p.rect.x0);
  assert.ok(p.stem.y2 >= p.rect.y0 && p.stem.y2 <= p.rect.y1);
});

test("a card is pushed out of an exclusion rect (the floating rail)", () => {
  const rail = { x0: 0, y0: 62, x1: 268, y1: 842 };
  const p = placeMarker({ anchor: { x: 40, y: 300 }, size: SIZE, bounds: BAND_1080, exclusions: [rail] });
  assert.ok(!rectsIntersect(p.rect, rail), "card still overlaps the rail");
  assert.ok(inside(p.rect, BAND_1080));
});

test("a card is pushed out of the banner lane", () => {
  const lane = { x0: 500, y0: 54, x1: 1400, y1: 126 };
  const p = placeMarker({ anchor: { x: 900, y: 80 }, size: SIZE, bounds: BAND_1080, exclusions: [lane] });
  assert.ok(!rectsIntersect(p.rect, lane), "card still overlaps the banner lane");
  assert.ok(p.rect.y0 >= lane.y1);
});

test("a stem to a rect that contains the anchor has zero length", () => {
  const s = stemTo({ x: 10, y: 10 }, { x0: 0, y0: 0, x1: 20, y1: 20 });
  assert.equal(s.length, 0);
});

test("layoutMarkers separates cards that would overlap, every card stays in the band", () => {
  const items = [
    { id: "a", anchor: { x: 700, y: 400 }, size: SIZE },
    { id: "b", anchor: { x: 720, y: 440 }, size: SIZE },
    { id: "c", anchor: { x: 740, y: 480 }, size: SIZE }
  ];
  const out = layoutMarkers(items, BAND_4K);
  assert.equal(out.length, 3);
  for (const p of out) assert.ok(inside(p.rect, BAND_4K), `${p.id} leaves the band`);
  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      assert.ok(!rectsIntersect(out[i].rect, out[j].rect), `${out[i].id} overlaps ${out[j].id}`);
    }
  }
  assert.ok(out.every((p) => p.overlaps.length === 0));
});

test("higher-priority cards keep their place; the lower one moves", () => {
  const items = [
    { id: "low", anchor: { x: 700, y: 400 }, size: SIZE, priority: 1 },
    { id: "high", anchor: { x: 700, y: 400 }, size: SIZE, priority: 5 }
  ];
  const out = layoutMarkers(items, BAND_4K);
  const high = out.find((p) => p.id === "high");
  const low = out.find((p) => p.id === "low");
  const solo = placeMarker({ anchor: { x: 700, y: 400 }, size: SIZE, bounds: BAND_4K });
  assert.deepEqual(high.rect, solo.rect, "the priority card was moved");
  assert.ok(!rectsIntersect(high.rect, low.rect));
});

test("an impossible fit is reported as an overlap, not hidden", () => {
  // Three tall cards in a band only one card tall, all at the same x: two
  // cannot be placed cleanly. The layout must say so.
  const tiny = { x0: 0, y0: 0, x1: 400, y1: 440 };
  const items = ["a", "b", "c"].map((id) => ({ id, anchor: { x: 10, y: 200 }, size: SIZE }));
  const out = layoutMarkers(items, tiny);
  assert.ok(out.some((p) => p.overlaps.length > 0), "an overlap was silently accepted");
  for (const p of out) assert.ok(inside(p.rect, tiny), "a card left the band while being separated");
});

test("the six prototype dots all land inside the 1080p band, clear of rails and lane", () => {
  const W = 1892, H = 1064;
  const dots = { fort: [0.76, 0.27], causeway: [0.59, 0.39], contact: [0.40, 0.55], shelter: [0.20, 0.69], pier: [0.50, 0.79], mast: [0.27, 0.21] };
  const band = visibleBand({ width: W, height: H, topRail: 54, chassis: 214 });
  const rails = [{ x0: 0, y0: 54, x1: 12 + 244 + 12, y1: H - 214 }, { x0: W - 268, y0: 54, x1: W, y1: H - 214 }];
  const lane = { x0: W / 2 - 420, y0: 54, x1: W / 2 + 420, y1: 54 + 72 };
  const items = Object.entries(dots).map(([id, [x, y]]) => ({ id, anchor: { x: x * W, y: y * H }, size: { w: 320, h: 300 } }));
  const out = layoutMarkers(items, band, [...rails, lane]);
  for (const p of out) {
    assert.ok(inside(p.rect, band), `${p.id} leaves the band: ${JSON.stringify(p.rect)}`);
    for (const ex of [...rails, lane]) assert.ok(!rectsIntersect(p.rect, ex), `${p.id} overlaps an exclusion`);
  }
});

test("fixFrom gives a bearing clockwise from north and a range in scene units", () => {
  const north = fixFrom({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.1 });
  assert.equal(north.bearing, 0);
  const east = fixFrom({ x: 0.5, y: 0.5 }, { x: 0.9, y: 0.5 }, { scale: 10 });
  assert.equal(east.bearing, 90);
  assert.ok(Math.abs(east.range - 4) < 1e-9);
  const sw = fixFrom({ x: 0.5, y: 0.5 }, { x: 0.1, y: 0.9 }, { aspect: 1 });
  assert.equal(sw.bearing, 225);
});
