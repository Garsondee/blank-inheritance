// The flat backend, drawn in plain Node on a recording canvas (test/fake-canvas.mjs): it meets the renderer contract, draws
// what a snapshot says in the order depth says, answers clicks, and takes the chalk, the box and the bang. What it looks
// like to a person is checked live (tools/stagecraft/foundry-check.mjs); this holds what it does.

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertBackend } from "../scripts/render/contract.mjs";
import { FlatBackend } from "../scripts/render/flat/backend.mjs";
import { Stage, STEP } from "../scripts/core/stage.mjs";
import { describeScene } from "../scripts/core/scene.mjs";
import { makeStroke } from "../scripts/core/chalk.mjs";
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

test("chalk: a stroke is drawn on the wall, drawn again from the store after a rub, hidden when hidden, and the line being drawn has its own layer", async () => {
  const t = await table();
  const stroke = (id, y) => makeStroke({ id, scene: "sc", by: "u1", at: 1, colour: "yellow", size: "medium", points: [[0.1, y], [0.4, y + 0.1]] }).stroke;
  t.backend.addChalkStroke(stroke("a", 0.2));
  t.backend.addChalkStroke(stroke("a", 0.2));               // the same stroke twice is one stroke
  const kept = t.backend.keptLayer.ctx;
  assert.ok(calls(kept, "stroke").length > 0, "drawn on the kept layer");
  const once = calls(kept, "stroke").length;
  t.backend.addChalkStroke(stroke("b", 0.5));
  assert.ok(calls(kept, "stroke").length > once);
  const before = calls(kept, "clearRect").length;
  t.backend.removeChalkStrokes(["a"]);
  assert.equal(calls(kept, "clearRect").length, before + 1, "a rub redraws what is left");
  assert.equal(t.backend.strokes.size, 1);
  t.backend.setChalkPreview([[0.2, 0.2], [0.3, 0.3]], "pink", "medium");
  assert.ok(calls(t.backend.liveLayer.ctx, "stroke").length > 0, "the line in progress is on the live layer");
  t.backend.setChalkPreview(null);
  t.backend.draw(t.snapshot());
  const backdrop = () => t.backend.backdrop.ctx;
  const blitted = () => calls(backdrop(), "drawImage").filter((e) => e.args[0] === t.backend.keptLayer.canvas).length;
  assert.equal(blitted(), 1, "the wall is on the painting");
  backdrop().log.length = 0;
  t.backend.setChalkHidden(true);
  t.backend.draw(t.snapshot());
  assert.equal(blitted(), 0, "and gone when the GM hides it");
  assert.ok(calls(backdrop(), "drawImage").length > 0, "the rest of the backdrop was drawn again without it");
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
  t.backend.setChalkBox(false);
  t.backend.draw(t.snapshot());
  assert.equal(t.backend.pick((stick.hit.x0 + stick.hit.x1) / 2, (stick.hit.y0 + stick.hit.y1) / 2), null, "put away");
  t.dom.restore();
});

test("the stick of chalk in the hand follows the pointer, and the eraser is a different thing", async () => {
  const t = await table();
  t.backend.setChalkCursor({ x: 400, y: 300 }, "blue", false);
  t.backend.draw(t.snapshot());
  assert.ok(calls(t.screen(), "fillRect").some((e) => e.with.fillStyle === "#8fc0e0"), "a blue stick");
  t.screen().log.length = 0;
  t.backend.setChalkCursor({ x: 400, y: 300 }, "rub", false);
  t.backend.draw(t.snapshot());
  assert.ok(calls(t.screen(), "fillRect").some((e) => e.with.fillStyle === "#5b6670"), "a felt eraser");
  t.screen().log.length = 0;
  t.backend.setChalkCursor(null);
  t.backend.draw(t.snapshot());
  assert.equal(calls(t.screen(), "fillRect").some((e) => e.with.fillStyle === "#5b6670" && e.args[2] === 50 * 0.93 * t.backend.view.s), false, "put away");
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
  t.backend.addChalkStroke(makeStroke({ id: "q", scene: "sc", by: "u1", at: 1, colour: "white", size: "thin", points: [[0.1, 0.1], [0.2, 0.2]] }).stroke);
  t.backend.draw(t.snapshot());
  assert.equal(painted(), first * 2, "a new line of chalk redraws it");
  t.backend.resize(1920, 1080, 1);
  t.backend.draw(t.snapshot());
  assert.equal(t.backend.backdrop.canvas.width, 1920, "a new window size makes a new backdrop at that size");
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
