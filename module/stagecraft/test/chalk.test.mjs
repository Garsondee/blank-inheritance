// The rules of chalk (core/chalk.mjs): where it may be used, how the wall is cut into tiles of pixels, and how layers and
// their history are kept in order. Pixels themselves are tested in the browser (tools/stagecraft/bench/chalk-check.mjs).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PALETTE, COLOURS, WALL, HISTORY, wallGrid, tileKey, parseTileKey, validTileKey, tileRect, tilesFor, toWall, toFraction,
  layerOrder, newestStep, overflowSteps, stepId, effectivePolicy, allowedAt, boxVisible, paintMask, nextOverride,
  boxOnPage, boxSpot
} from "../scripts/core/chalk.mjs";
import { describeScene } from "../scripts/core/scene.mjs";
import { makeRig, viewFor } from "../scripts/core/rigspace.mjs";
import { RAW_SCENE } from "./fixture.mjs";

const { scene } = describeScene(RAW_SCENE);
const zones = scene.zones;           // the back wall is the only chalk zone: x 0.05 to 0.45, y 0.2 to 0.62
const grid = wallGrid({ size: [1920, 960] });

test("the box finds a clear place: where the scene put it, unless the screen's furniture covers it there", () => {
  const rig = makeRig(scene.painting, scene.rig);
  const view = viewFor(2560, 1271);                          // the GM's screen where this was found
  const screen = { x0: view.ox, y0: view.oy, x1: view.ox + view.visW, y1: view.oy + view.visH };
  const at = [0.405, 0.978];
  const home = boxOnPage(rig, at);
  assert.ok(home && home.x1 > home.x0 && home.y1 > home.y0, "the box has an outline on the page");
  assert.deepEqual(boxSpot(rig, at), at, "nothing covers it: it stays where the scene put it");
  const onScreen = boxOnPage(rig, boxSpot(rig, at, [], screen));
  assert.ok(onScreen.y1 + 8 <= screen.y1 && onScreen.y0 >= screen.y0, "and it is always wholly on the screen, with a little room to spare");
  // a deck along the bottom of the screen, over the box, and a bar of buttons just above the deck
  const deck = { rect: [view.ox, home.y0 + (home.y1 - home.y0) * 0.5, view.ox + view.visW, view.oy + view.visH] };
  const bar = { rect: [home.x0 - 200, home.y0 - 60, home.x1 + 200, home.y0 + 10] };
  const spot = boxSpot(rig, at, [deck, bar], screen);
  assert.notDeepEqual(spot, at, "covered: it moves");
  const there = boxOnPage(rig, spot);
  const overlaps = (s, r) => !(s.rect[2] < r.x0 || s.rect[0] > r.x1 || s.rect[3] < r.y0 || s.rect[1] > r.y1);
  assert.ok(!overlaps(deck, there) && !overlaps(bar, there), `and nothing covers it where it went: ${spot}`);
  assert.ok(there.y1 <= screen.y1 && there.y0 >= screen.y0 && there.x0 >= screen.x0 && there.x1 <= screen.x1, "wholly on the screen");
  assert.ok(Math.abs(spot[0] - at[0]) <= 0.2 && at[1] - spot[1] <= 0.3, "and near where the scene put it");
  // where it can, it stands in front of nobody's card; where it cannot, clear of the deck still wins
  const went = boxOnPage(rig, spot);
  const card = { rect: [went.x0 - 10, went.y0 - 300, went.x1 + 10, went.y1] };
  const aside = boxSpot(rig, at, [deck, bar], screen, [card]);
  assert.ok(!overlaps(card, boxOnPage(rig, aside)) && !overlaps(deck, boxOnPage(rig, aside)) && !overlaps(bar, boxOnPage(rig, aside)), `clear of the card too: ${aside}`);
  assert.deepEqual(boxSpot(rig, at, [deck, bar], screen, [{ rect: [-1e5, -1e5, 1e5, 1e5] }]), spot);
  // a round dial in the way is avoided too
  const dial = { circle: [(home.x0 + home.x1) / 2, (home.y0 + home.y1) / 2, 120] };
  const round = boxOnPage(rig, boxSpot(rig, at, [dial], screen));
  const nx = Math.max(round.x0, Math.min(dial.circle[0], round.x1));
  const ny = Math.max(round.y0, Math.min(dial.circle[1], round.y1));
  assert.ok(Math.hypot(nx - dial.circle[0], ny - dial.circle[1]) > 120);
  // covered everywhere: it stays where the scene put it rather than wandering off
  assert.deepEqual(boxSpot(rig, at, [{ rect: [-1e5, -1e5, 1e5, 1e5] }], screen), at);
});

test("the wall is as tall as the reference page and as wide as the painting's shape, cut into tiles of 240", () => {
  assert.deepEqual(grid, { w: 2880, h: 1440, tile: 240, cols: 12, rows: 6 });
  const square = wallGrid({ size: [1000, 1000] });
  assert.deepEqual([square.w, square.h, square.cols, square.rows], [1440, 1440, 6, 6]);
  const odd = wallGrid({ size: [1700, 1000] });
  assert.equal(odd.w, 2448);
  assert.equal(odd.cols, 11, "a part tile at the end is still a tile");
  assert.equal(tileRect(odd, tileKey(10, 0)).w, 48, "and it is only as wide as what is left");
  assert.ok(wallGrid({ size: [10000, 100] }).w <= WALL.maxWidth, "a very wide painting is capped");
});

test("tile keys say where a tile is, and nothing else is a key", () => {
  assert.equal(tileKey(3, 2), "c3r2");
  assert.deepEqual(parseTileKey("c11r5"), { c: 11, r: 5 });
  for (const bad of ["c3", "r2c3", "c3r2x", "c-1r2", "", null, "c1234r1"]) assert.equal(parseTileKey(bad), null, String(bad));
  assert.equal(validTileKey(grid, "c11r5"), true);
  assert.equal(validTileKey(grid, "c12r5"), false, "off the end of the wall");
  assert.deepEqual(tileRect(grid, "c1r1"), { x: 240, y: 240, w: 240, h: 240 });
});

test("a rectangle of the wall touches the tiles under it, and only those, never off the wall", () => {
  assert.deepEqual(tilesFor(grid, { x0: 10, y0: 10, x1: 20, y1: 20 }), ["c0r0"]);
  assert.deepEqual(tilesFor(grid, { x0: 230, y0: 230, x1: 250, y1: 250 }), ["c0r0", "c1r0", "c0r1", "c1r1"]);
  assert.deepEqual(tilesFor(grid, { x0: -50, y0: -50, x1: 5, y1: 5 }), ["c0r0"]);
  assert.equal(tilesFor(grid, { x0: 0, y0: 0, x1: 99999, y1: 99999 }).length, 72);
  const p = toWall(grid, 0.5, 0.25);
  assert.deepEqual(p, { x: 1440, y: 360 });
  assert.deepEqual(toFraction(grid, p.x, p.y), { x: 0.5, y: 0.25 });
});

test("layers are drawn in the order their painters first painted, whoever's browser lists them first", () => {
  const a = { by: "u2", since: 20 };
  const b = { by: "u1", since: 10 };
  const c = { by: "u0", since: 20 };
  assert.deepEqual(layerOrder([a, b, c]).map((l) => l.by), ["u1", "u0", "u2"]);
  assert.deepEqual(layerOrder([c, a, b]).map((l) => l.by), ["u1", "u0", "u2"]);
});

test("the newest step on the wall, or in one painter's layer, is the one undo takes back", () => {
  const layers = [
    { by: "u1", history: { [stepId(100, "a")]: { at: 100 }, [stepId(300, "b")]: { at: 300 } } },
    { by: "u2", history: { [stepId(200, "c")]: { at: 200 } } },
    { by: "u3", history: {} }
  ];
  assert.equal(newestStep(layers).id, stepId(300, "b"));
  assert.equal(newestStep(layers).layer.by, "u1");
  assert.equal(newestStep(layers, { by: "u2" }).id, stepId(200, "c"));
  assert.equal(newestStep(layers, { by: "u3" }), null);
  assert.equal(newestStep([]), null);
});

test("a history keeps only its newest steps", () => {
  const history = Object.fromEntries(Array.from({ length: HISTORY + 3 }, (_, i) => [stepId(i * 10, "x"), { at: i * 10 }]));
  const drop = overflowSteps(history);
  assert.equal(drop.length, 3);
  assert.deepEqual(drop, [stepId(0, "x"), stepId(10, "x"), stepId(20, "x")], "the oldest go");
  assert.deepEqual(overflowSteps({}), []);
  assert.ok(stepId(5, "z") < stepId(40, "a"), "step ids sort by time as text");
});

test("the box's chalk comes in six colours, each a real colour", () => {
  assert.deepEqual(COLOURS, ["white", "yellow", "pink", "blue", "green", "orange"]);
  for (const hex of Object.values(PALETTE)) assert.match(hex, /^#[0-9a-f]{6}$/);
});

test("policy: off means no box and no painting; anywhere means everywhere; zones means only the chalk zones", () => {
  const off = effectivePolicy({ mode: "off" });
  const zonesOnly = effectivePolicy({ mode: "zones" });
  const anywhere = effectivePolicy({ mode: "anywhere" });
  const inside = [0.2, 0.4];
  const outside = [0.7, 0.4];
  assert.equal(allowedAt(off, zones, ...inside), false);
  assert.equal(boxVisible(off, zones), false);
  assert.equal(allowedAt(zonesOnly, zones, ...inside), true);
  assert.equal(allowedAt(zonesOnly, zones, ...outside), false);
  assert.equal(boxVisible(zonesOnly, zones), true);
  assert.equal(allowedAt(anywhere, zones, ...outside), true);
  assert.equal(boxVisible(zonesOnly, zones.filter((z) => z.kind !== "chalk")), false, "no chalk zone, no box");
});

test("in zones only, paint is kept inside the chalk zones' shapes; anywhere, nothing holds it in", () => {
  const mask = paintMask(effectivePolicy({ mode: "zones" }), zones);
  assert.equal(mask.length, 1);
  assert.deepEqual(mask[0], zones.find((z) => z.kind === "chalk").shape);
  assert.equal(paintMask(effectivePolicy({ mode: "anywhere" }), zones), null);
});

test("the GM's override replaces the authored mode, goes round, and returns to it when lifted", () => {
  const authored = { mode: "off" };
  assert.equal(effectivePolicy(authored, { mode: "anywhere" }).mode, "anywhere");
  assert.equal(effectivePolicy(authored, { mode: "zones" }).mode, "zones");
  assert.equal(effectivePolicy({ mode: "anywhere" }, { mode: "off" }).mode, "off");
  assert.equal(effectivePolicy({ mode: "anywhere" }, null).mode, "anywhere");
  assert.equal(effectivePolicy({ mode: "anywhere" }, { mode: "bogus" }).mode, "anywhere", "a bad override is ignored");
  assert.deepEqual([null, "off", "zones", "anywhere"].map(nextOverride), ["off", "zones", "anywhere", null]);
});

test("a locked wall freezes painting whatever the mode, by the scene or by the GM's live lock", () => {
  assert.equal(effectivePolicy({ mode: "anywhere", lock: true }).locked, true);
  assert.equal(allowedAt(effectivePolicy({ mode: "anywhere", lock: true }), zones, 0.2, 0.4), false);
  assert.equal(effectivePolicy({ mode: "anywhere", lock: true }, { locked: false }).locked, false, "the GM can lift a scene's lock");
  assert.equal(effectivePolicy({ mode: "anywhere" }, { locked: true }).locked, true);
  assert.equal(boxVisible(effectivePolicy({ mode: "anywhere", lock: true }), zones), false);
});
