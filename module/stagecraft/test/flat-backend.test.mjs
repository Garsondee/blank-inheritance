// The flat backend, drawn in plain Node on a recording canvas (test/fake-canvas.mjs): it meets the renderer contract, draws
// what a snapshot says in the order depth says, answers clicks, and takes the chalk, the box and the bang. What it looks
// like to a person is checked live (tools/stagecraft/foundry-check.mjs); this holds what it does.

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertBackend } from "../scripts/render/contract.mjs";
import { FlatBackend } from "../scripts/render/flat/backend.mjs";
import { Stage, STEP } from "../scripts/core/stage.mjs";
import { describeScene } from "../scripts/core/scene.mjs";
import { wallGrid } from "../scripts/core/chalk.mjs";
import { paper } from "../scripts/skins/paper.mjs";
import { installFakeDom, fakeElement, calls } from "./fake-canvas.mjs";
import { RAW_SCENE, PEOPLE } from "./fixture.mjs";

const { scene } = describeScene(RAW_SCENE);

/** A backend with a painting and the fixture's cast loaded, on a 1280 x 720 window, and the stage that feeds it. */
async function table({ people = PEOPLE } = {}) {
  const dom = installFakeDom();
  const images = { loadImage: async (src) => (src === scene.painting.src ? { width: 3072, height: 1536, src } : null) };
  const backend = new FlatBackend({ images });
  const element = fakeElement();
  backend.mount(element, { pixelRatio: 2, width: 1280, height: 720 });
  await backend.load(scene, paper, people);
  const stage = new Stage(scene, people, { card: paper.size });
  stage.advance(0.5);
  const snapshot = () => stage.snapshot({ viewer: "u1" });
  const screen = () => backend.canvas.ctx;
  const winOf = (id) => {       // the middle of a card's picture, in window pixels
    const c = stage.snapshot().cards.find((x) => x.id === id);
    return backend.project({ X: c.x, Y: (c.lift ?? 0) + paper.size.h * c.scale * 0.5, Z: c.z });
  };
  return { dom, backend, element, stage, snapshot, screen, winOf };
}

test("it meets the renderer contract, says it needs no graphics card, and is not the three.js backend", () => {
  const dom = installFakeDom();
  const b = new FlatBackend({ images: { loadImage: async () => null } });
  assert.equal(assertBackend(b, "FlatBackend"), b);
  assert.equal(b.name, "flat");
  assert.equal(b.capabilities.lights, false);
  assert.equal(b.capabilities.shadows, false);
  assert.equal(b.capabilities.post, false);
  assert.equal(b.capabilities.chalk, true, "chalk is part of the base");
  assert.equal(b.capabilities.marks, true);
  assert.equal(b.capabilities.zoneOutlines, true);
  dom.restore();
});

test("mounting puts one canvas on the page, at the window's size and no more than one device pixel to a pixel", async () => {
  const t = await table();
  assert.equal(t.element.children.length, 1);
  assert.equal(t.backend.canvas.width, 1280, "the pixel ratio is capped at one: this is the cheap picture");
  assert.equal(t.backend.canvas.height, 720);
  t.backend.resize(1920, 1080, 2);
  assert.equal(t.backend.canvas.width, 1920);
  t.dom.restore();
});

test("nothing is drawn or picked before the room is loaded, or after it is let go", async () => {
  const dom = installFakeDom();
  const b = new FlatBackend({ images: { loadImage: async () => ({ width: 3072, height: 1536 }) } });
  b.mount(fakeElement(), { width: 800, height: 600 });
  const stage = new Stage(scene, PEOPLE, { card: paper.size });
  b.draw(stage.snapshot());
  assert.equal(b.pick(100, 100), null);
  assert.equal(calls(b.canvas.ctx, "drawImage").length, 0, "not loaded: nothing drawn");
  await b.load(scene, paper, PEOPLE);
  b.draw(stage.snapshot());
  assert.ok(calls(b.canvas.ctx, "drawImage").length > 0);
  b.dispose();
  const before = b.canvas.ctx.log.length;
  b.draw(stage.snapshot());
  assert.equal(b.canvas.ctx.log.length, before, "disposed: nothing more is drawn");
  assert.equal(b.canvas.removed, true, "and the canvas is gone from the page");
  b.dispose();
  dom.restore();
});

test("a painting that cannot be loaded is an error the host can act on, not a blank stage", async () => {
  const dom = installFakeDom();
  const b = new FlatBackend({ images: { loadImage: async () => null } });
  b.mount(fakeElement(), { width: 800, height: 600 });
  await assert.rejects(() => b.load(scene, paper, []), /could not be loaded/);
  dom.restore();
});

test("every card in the snapshot is drawn once, and further cards before nearer ones", async () => {
  const t = await table();
  t.backend.draw(t.snapshot());
  const images = calls(t.screen(), "drawImage").map((e) => e.args[0]);
  const faces = [...t.backend.views.values()].map((v) => v.face);
  for (const f of faces) assert.equal(images.filter((i) => i === f).length, 1, "each face once");
  const order = images.map((i) => faces.indexOf(i)).filter((i) => i >= 0).map((i) => [...t.backend.views.keys()][i]);
  const z = (id) => t.snapshot().cards.find((c) => c.id === id).z;
  for (let i = 1; i < order.length; i++) assert.ok(z(order[i - 1]) <= z(order[i]) + 1e-9, `${order[i - 1]} is drawn before ${order[i]}`);
  t.dom.restore();
});

test("a card turned right round shows its back, and the face is not drawn", async () => {
  const t = await table();
  const snap = t.snapshot();
  snap.cards.find((c) => c.id === "ana").yaw = 170;
  t.backend.draw(snap);
  const images = calls(t.screen(), "drawImage").map((e) => e.args[0]);
  const ana = t.backend.views.get("ana");
  assert.equal(images.includes(ana.back), true);
  assert.equal(images.includes(ana.face), false);
  t.dom.restore();
});

test("a held card is drawn on its stick, with a ring in the holder's colour, and a card at rest is not", async () => {
  const t = await table();
  t.backend.draw(t.snapshot());
  const rings = () => calls(t.screen(), "ellipse").filter((e) => e.args[0] === 0 && e.args[1] === 0 && e.args[2] === 21);
  assert.equal(rings().length, 0, "nobody is holding anything");
  t.stage.hold("ana", "u1");
  for (let i = 0; i < 40; i++) t.stage.step(STEP);
  t.backend.draw(t.snapshot());
  assert.equal(rings().length, 1, "one card is held");
  t.dom.restore();
});

test("a card stood behind a cut-out is drawn before it, and one in front is drawn after", async () => {
  const dom = installFakeDom();
  const images = { loadImage: async () => ({ width: 3072, height: 1536 }) };
  const b = new FlatBackend({ images });
  b.mount(fakeElement(), { width: 1280, height: 720 });
  await b.load(scene, paper, [{ id: "far", name: "Far" }, { id: "near", name: "Near" }]);
  const counterZ = b.occluders[0].z;
  const base = { lift: 0, lean: 0, yaw: 0, pitch: 0, grip: 0, breathe: 1, squash: 1, scale: 0.7 };
  b.draw({ t: 0, bonks: [], marks: [], zones: {}, cards: [
    { id: "near", x: 0, z: counterZ + 150, ...base },
    { id: "far", x: 0, z: counterZ - 150, ...base }
  ] });
  const log = b.canvas.ctx.log;
  const at = (pred) => log.findIndex(pred);
  const farFace = at((e) => e.call === "drawImage" && e.args[0] === b.views.get("far").face);
  const nearFace = at((e) => e.call === "drawImage" && e.args[0] === b.views.get("near").face);
  const counter = b.occluderBitmaps.get(b.occluders[0]);
  const over = at((e) => e.call === "drawImage" && e.args[0] === counter?.canvas);
  assert.ok(farFace >= 0 && nearFace >= 0 && over >= 0, "all three are drawn");
  assert.ok(farFace < over && over < nearFace, "far card, then the counter over it, then the near card");
  dom.restore();
});

test("a click lands on the card under it, the nearer one where two overlap, and on nothing in the empty room", async () => {
  const t = await table();
  t.backend.draw(t.snapshot());
  for (const id of ["ana", "cy", "ed"]) {
    const w = t.winOf(id);
    const hit = t.backend.pick(w.x, w.y);
    assert.equal(hit?.kind, "card", `${id}: ${JSON.stringify(hit)}`);
    assert.equal(hit.id, id);
    assert.ok(hit.point.y > 0, "with the height of the point grabbed, for the pointer to carry it by");
  }
  assert.equal(t.backend.pick(5, 5), null, "the sky");
  const snap = t.snapshot();
  const [a, b] = [snap.cards[0], snap.cards[1]];
  a.x = b.x; a.z = b.z + 60;                  // a is in front of b, on the same spot
  t.backend.draw(snap);
  const w = t.backend.project({ X: a.x, Y: 120, Z: a.z });
  assert.equal(t.backend.pick(w.x, w.y).id, a.id, "the front one");
  t.dom.restore();
});

test("the window maps onto the floor and the painting, and a point on the floor maps back", async () => {
  const t = await table();
  const w = t.backend.project({ X: 100, Y: 0, Z: -250 });
  const f = t.backend.floorAt(w.x, w.y, 0);
  assert.ok(Math.abs(f.x - 100) < 1e-6 && Math.abs(f.z + 250) < 1e-6);
  const p = t.backend.paintingAt(w.x, w.y);
  assert.ok(p.x > 0 && p.x < 1 && p.y > 0 && p.y < 1);
  assert.equal(t.backend.paintingAt(-9000, -9000), null);
  t.dom.restore();
});

/** A stand-in for the painted wall (render/paint/wall.mjs): its grid and the tiles that have paint, as canvases. */
function paintedWall(keys) {
  const grid = wallGrid(scene.painting);
  return { grid, composite: new Map(keys.map((k) => [k, document.createElement("canvas")])) };
}

test("chalk: the wall's tiles are laid on the painting where they belong, and hidden when the GM hides the wall", async () => {
  const t = await table();
  const wall = paintedWall(["c2r1", "c11r5"]);
  t.backend.setChalkTiles(wall, new Set(wall.composite.keys()), true);
  t.backend.draw(t.snapshot());
  const backdrop = () => t.backend.backdrop.ctx;
  const laid = (tile) => calls(backdrop(), "drawImage").filter((e) => e.args[0] === tile);
  const [first] = laid(wall.composite.get("c2r1"));
  assert.ok(first, "the tile is on the painting");
  // c2r1 is pixels 480..720 x 240..480 of a 2880 x 1440 wall: a twelfth of the painting across, a sixth down
  const map = t.backend.rig.map;
  const [iw, ih] = t.backend.rig.size;
  const [, x, y, w, h] = first.args;
  assert.ok(Math.abs(x - (map.ox + (iw * map.s) * (480 / 2880))) < 1e-6 && Math.abs(y - (map.oy + (ih * map.s) * (240 / 1440))) < 1e-6, "in its place");
  assert.ok(Math.abs(w - (iw * map.s) / 12) < 1e-6 && Math.abs(h - (ih * map.s) / 6) < 1e-6, "at its size");
  assert.equal(laid(wall.composite.get("c11r5")).length, 1, "the last tile too");
  backdrop().log.length = 0;
  t.backend.setChalkHidden(true);
  t.backend.draw(t.snapshot());
  assert.equal(laid(wall.composite.get("c2r1")).length, 0, "and gone when the GM hides it");
  assert.ok(calls(backdrop(), "drawImage").length > 0, "the rest of the backdrop was drawn again without it");
  t.dom.restore();
});

test("chalk being painted redraws only the places of the tiles that changed, never the whole backdrop", async () => {
  const t = await table();
  const wall = paintedWall(["c2r1"]);
  t.backend.setChalkTiles(wall, new Set(["c2r1"]), true);
  t.backend.draw(t.snapshot());
  const backdrop = () => t.backend.backdrop.ctx;
  const painted = () => calls(backdrop(), "drawImage").filter((e) => e.args[0] === t.backend.painting).length;
  const whole = painted();
  wall.composite.set("c3r1", document.createElement("canvas"));
  t.backend.setChalkTiles(wall, new Set(["c3r1"]));
  backdrop().log.length = 0;
  t.backend.draw(t.snapshot());
  assert.equal(calls(backdrop(), "clip").length, 1, "one place, clipped");
  assert.equal(painted(), 1, "the painting is drawn again only there");
  assert.ok(calls(backdrop(), "drawImage").some((e) => e.args[0] === wall.composite.get("c3r1")), "with the new paint");
  assert.ok(calls(backdrop(), "drawImage").some((e) => e.args[0] === wall.composite.get("c2r1")), "and its neighbour's, so no edge is left behind");
  backdrop().log.length = 0;
  t.backend.draw(t.snapshot());
  assert.equal(calls(backdrop(), "drawImage").length, 0, "nothing changed: nothing drawn");
  assert.ok(whole >= 1);
  t.dom.restore();
});

test("the box of chalk is there to pick only while it is shown", async () => {
  const t = await table({ people: PEOPLE.slice(0, 2) });        // nobody standing in front of the box
  t.backend.draw(t.snapshot());
  const none = t.backend.pick(0, 0);
  assert.equal(none, null);
  t.backend.setChalkBox(true);
  t.backend.draw(t.snapshot());
  const layout = t.backend.order.find((d) => d.kind === "box").layout;
  const stick = layout.sticks[1];
  const hit = t.backend.pick((stick.hit.x0 + stick.hit.x1) / 2, (stick.hit.y0 + stick.hit.y1) / 2);
  assert.equal(hit?.kind, "chalk");
  assert.equal(hit.colour, stick.colour);
  const e = layout.eraser.hit;
  assert.equal(t.backend.pick((e.x0 + e.x1) / 2, (e.y0 + e.y1) / 2)?.kind, "eraser");
  const m = layout.magic.hit;
  assert.equal(t.backend.pick((m.x0 + m.x1) / 2, (m.y0 + m.y1) / 2)?.kind, "magic");
  t.backend.setChalkBox(false);
  t.backend.draw(t.snapshot());
  assert.equal(t.backend.pick((stick.hit.x0 + stick.hit.x1) / 2, (stick.hit.y0 + stick.hit.y1) / 2), null, "put away");
  t.dom.restore();
});

test("marks are drawn only while a card is in hand, and only a handful", async () => {
  const t = await table();
  t.backend.draw(t.snapshot());
  const markDrawn = () => calls(t.screen(), "drawImage").filter((e) => e.args[0] === t.backend.markImage).length;
  assert.equal(markDrawn(), 0);
  t.stage.hold("ana", "u1");
  for (let i = 0; i < 40; i++) t.stage.step(STEP);
  t.screen().log.length = 0;
  t.backend.draw(t.snapshot());
  assert.ok(markDrawn() >= 1 && markDrawn() <= 6);
  t.dom.restore();
});

test("zone outlines are redrawn only when something changed", async () => {
  const t = await table();
  const zones = t.backend.zoneLayer.ctx;
  t.backend.draw(t.snapshot());
  const first = calls(zones, "clearRect").length;
  t.backend.draw(t.snapshot());
  t.backend.draw(t.snapshot());
  assert.equal(calls(zones, "clearRect").length, first, "nothing changed, nothing redrawn");
  t.backend.setZoneSetting("full");
  t.backend.draw(t.snapshot());
  assert.equal(calls(zones, "clearRect").length, first + 1, "a changed setting is");
  t.dom.restore();
});

test("a bang is drawn as impact lines, with a glow and sparks unless calm, and never more than three flashes a second", async () => {
  const t = await table();
  const snap = (extra = []) => ({ ...t.snapshot(), t: 10, bonks: [{ t: 10, x: 0, Z: -100 }, ...extra] });
  t.backend.draw(snap());
  assert.ok(calls(t.screen(), "drawImage").some((e) => e.args[0] === t.backend.impact), "the impact lines");
  const gradients = () => calls(t.screen(), "createRadialGradient").length;
  assert.equal(gradients(), 1, "a glow");
  t.screen().log.length = 0;
  t.backend.setCalm(true);
  t.backend.draw(snap());
  assert.ok(calls(t.screen(), "drawImage").some((e) => e.args[0] === t.backend.impact), "the lines stay in calm mode");
  assert.equal(gradients(), 0, "no glow");
  assert.equal(calls(t.screen(), "arc").length, 0, "no sparks");
  t.backend.setCalm(false);
  t.screen().log.length = 0;
  t.backend.flashes = [9.9, 9.95, 9.98];                  // three flashes have just begun
  t.backend.draw(snap());
  assert.equal(gradients(), 0, "the fourth is held back");
  t.dom.restore();
});

test("a person's emote is drawn beside them once it has loaded", async () => {
  const people = [{ id: "ana", name: "Ana", at: [0.3, 0.9], emote: { id: "music", t0: 0 } }];
  const t = await table({ people });
  await new Promise((r) => setTimeout(r, 5));               // the emote's picture loads
  const snap = t.snapshot();
  assert.ok(snap.cards[0].emote, "the engine says there is an emote");
  t.backend.draw(snap);
  assert.ok(calls(t.screen(), "drawImage").length > 3);
  t.dom.restore();
});

test("a card the cast gains is drawn, and one it loses is not", async () => {
  const t = await table({ people: PEOPLE.slice(0, 2) });
  await t.backend.addCard({ id: "newcomer", name: "New", at: [0.5, 0.9] });
  assert.ok(t.backend.views.has("newcomer"));
  t.backend.removeCard("ana");
  assert.equal(t.backend.views.has("ana"), false);
  t.stage.addCard({ id: "newcomer", name: "New", at: [0.5, 0.9] });
  t.backend.draw(t.snapshot());
  const images = calls(t.screen(), "drawImage").map((e) => e.args[0]);
  assert.ok(images.includes(t.backend.views.get("newcomer").face));
  t.dom.restore();
});

test("capturing the stage gives a picture", async () => {
  const t = await table();
  const blob = await t.backend.capture();
  assert.equal(blob.type, "image/png");
  t.dom.restore();
});

test("the still backdrop (painting, zones, chalk) is drawn once and copied every frame, and redrawn only when something about it changes", async () => {
  const t = await table();
  const painted = () => calls(t.backend.backdrop.ctx, "drawImage").filter((e) => e.args[0] === t.backend.painting).length;
  t.backend.draw(t.snapshot());
  const first = painted();
  assert.ok(first >= 1, "the painting is on the backdrop");
  for (let i = 0; i < 5; i++) { t.stage.advance(0.1); t.backend.draw(t.snapshot()); }
  assert.equal(painted(), first, "five more frames do not draw the painting again");
  const copies = () => calls(t.screen(), "drawImage").filter((e) => e.args[0] === t.backend.backdrop.canvas).length;
  assert.equal(copies(), 6, "but each of the six frames copies the backdrop");
  const wall = paintedWall(["c1r1"]);
  t.backend.setChalkTiles(wall, new Set(["c1r1"]), true);
  t.backend.draw(t.snapshot());
  assert.equal(painted(), first * 2, "a wall shown afresh redraws it");
  t.backend.resize(1920, 1080, 1);
  t.backend.draw(t.snapshot());
  assert.equal(t.backend.backdrop.canvas.width, 1920, "a new window size makes a new backdrop at that size");
  t.dom.restore();
});

test("a skin is handed the title block to lay a card's words out with, for the face and for the back", async () => {
  const dom = installFakeDom();
  const seen = [];
  const spy = { ...paper, face: (p, h) => { seen.push(["face", h]); return paper.face(p, h); }, back: (p, h) => { seen.push(["back", h]); return paper.back(p, h); } };
  const b = new FlatBackend({ images: { loadImage: async (src) => (src === scene.painting.src ? { width: 3072, height: 1536, src } : null) } });
  b.mount(fakeElement(), { width: 800, height: 600 });
  await b.load(scene, spy, PEOPLE);
  assert.equal(seen.length, PEOPLE.length * 2);
  for (const [, helpers] of seen) {
    assert.equal(typeof helpers.loadImage, "function");
    assert.equal(typeof helpers.titleBlock.fit, "function");
    assert.equal(typeof helpers.titleBlock.draw, "function");
  }
  assert.equal(new Set(seen.map(([, h]) => h.titleBlock)).size, 1, "one title block maker for the whole stage");
  dom.restore();
});

test("a card whose words change is drawn again, and only that card", async () => {
  const t = await table();
  const ana = t.backend.views.get("ana");
  const others = [...t.backend.views.values()].filter((v) => v.id !== "ana");
  const face = ana.face;
  const back = ana.back;
  await t.backend.refreshCard({ id: "ana", name: "Ana\nthe baker from the east gate" });
  const after = t.backend.views.get("ana");
  assert.notEqual(after.face, face, "a new face was drawn");
  assert.notEqual(after.back, back, "and a new back");
  assert.equal(after.person.name, "Ana\nthe baker from the east gate");
  assert.equal(after.face.width, paper.size.w, "at the card's own size, as the first was");
  assert.ok(others.every((v) => t.backend.views.get(v.id).face === v.face), "nobody else's face was touched");
  await t.backend.refreshCard({ id: "nobody", name: "x" });          // not on the stage: nothing happens, nothing throws
  t.backend.dispose?.();
  await t.backend.refreshCard({ id: "ana", name: "late" });          // after the stage is gone: nothing happens either
  t.dom.restore();
});

test("a card's picture is made once at its own size, however large the skin drew it", async () => {
  const t = await table();
  const v = t.backend.views.get("ana");
  assert.equal(v.face.width, paper.size.w, "the paper skin draws twice that size; the flat card keeps the smaller copy");
  assert.equal(v.face.height, paper.size.h);
  assert.notEqual(v.face, v.back);
  t.dom.restore();
});

test("an emote is drawn with its motion: a waving hand is turned, and in the calm version it is not", async () => {
  const people = [{ id: "ana", name: "Ana", at: [0.3, 0.9], emote: { id: "hand", t0: 0 } }];
  const t = await table({ people });
  await new Promise((r) => setTimeout(r, 5));               // the emote's picture loads
  const turnOfEmote = () => {
    t.screen().log.length = 0;
    t.backend.draw(t.snapshot());
    const log = t.screen().log;
    const at = log.findIndex((e) => e.call === "drawImage" && String(e.args[0]?._src ?? "").startsWith("data:image/svg+xml"));
    assert.ok(at > 0, "the emote is drawn");
    const transform = log.slice(0, at).reverse().find((e) => e.call === "setTransform");
    return transform.args[1];                                // the sine of the turn, times the pixel ratio
  };
  assert.ok(Math.abs(turnOfEmote()) > 0.05, "half a second in, the hand is mid-wave");
  t.stage.setCalm(true);
  assert.equal(turnOfEmote(), 0);
  t.dom.restore();
});

test("a screen that pans and zooms sees the stage through its own view: picking and projecting follow it", async () => {
  const { homeLook, zoomAt, viewOf } = await import("../scripts/core/look.mjs");
  const t = await table();
  t.backend.draw(t.snapshot());
  const id = PEOPLE[0].id;
  const before = t.winOf(id);
  assert.equal(t.backend.pick(before.x, before.y)?.id, id);
  // twice as close, about the window's middle: the card's middle moves twice as far from it
  const look = zoomAt(homeLook(1280, 720), 1280, 720, 640, 360, 2);
  t.backend.setView(viewOf(1280, 720, look));
  t.backend.draw(t.snapshot());
  const after = t.winOf(id);
  assert.ok(Math.abs((after.x - 640) - 2 * (before.x - 640)) < 0.5, `x: ${before.x} -> ${after.x}`);
  assert.ok(Math.abs((after.y - 360) - 2 * (before.y - 360)) < 0.5, `y: ${before.y} -> ${after.y}`);
  if (after.x > 0 && after.x < 1280 && after.y > 0 && after.y < 720) assert.equal(t.backend.pick(after.x, after.y)?.id, id, "picked where it is now drawn");
  // a resize goes back to the plain cover until the view is given again
  t.backend.resize(1280, 720, 2);
  assert.deepEqual(t.winOf(id), before);
  t.dom.restore();
});
