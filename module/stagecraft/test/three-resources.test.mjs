// What the lit stage keeps on the graphics card, and how much it asks of it (found in the 2026-10-05 performance audit):
// a card that leaves frees what it made, what every card has the same of is made once, the shadow maps are drawn again only
// when something that casts a shadow has moved, and a window is drawn within a pixel budget. Built without a graphics card.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { Tracker } from "../scripts/render/three/support.mjs";
import { CardView } from "../scripts/render/three/cards.mjs";
import { ShadowWatch, STEPS } from "../scripts/render/three/shadows.mjs";
import { pixelRatioFor, tierSettings } from "../scripts/render/contract.mjs";

/* ---------------------------------------------------------------- scoped tracking */

/** A thing that counts how often it is freed, as a geometry, material or texture does. */
const thing = (extra = {}) => { const t = { disposed: 0, dispose() { this.disposed++; }, ...extra }; return t; };

test("a scope frees only what it made, and takes it out of the parent's list", () => {
  const root = new Tracker();
  const shared = root.add(thing());
  const scope = root.scoped();
  const mine = scope.add(thing());
  assert.equal(root.size, 2, "what a scope makes is the parent's too, so the scene's end frees it if the card never left");
  scope.disposeScope();
  assert.equal(mine.disposed, 1, "its own is freed");
  assert.equal(shared.disposed, 0, "what the parent held is not");
  assert.equal(root.size, 1, "and it is no longer in the parent's list");
  root.disposeAll();
  assert.equal(mine.disposed, 1, "the scene's end does not free it a second time");
  assert.equal(shared.disposed, 1);
});

test("a mesh in a scope leaves what the parent already holds to the parent", () => {
  const root = new Tracker();
  const sharedGeometry = root.add(new THREE.BoxGeometry(1, 1, 1));
  const map = root.add(new THREE.Texture());
  const scope = root.scoped();
  const own = new THREE.MeshBasicMaterial({ map });
  scope.mesh(new THREE.Mesh(sharedGeometry, own));
  let freed = { geometry: 0, material: 0, texture: 0 };
  sharedGeometry.addEventListener("dispose", () => freed.geometry++);
  own.addEventListener("dispose", () => freed.material++);
  map.addEventListener("dispose", () => freed.texture++);
  scope.disposeScope();
  assert.deepEqual(freed, { geometry: 0, material: 1, texture: 0 }, "the material was this scope's; the shape and the picture were shared");
});

/* ---------------------------------------------------------------- a card leaving */

const skin = {
  size: { w: 280, h: 468 }, thickness: 9, stick: { length: 134 },
  materials: { body: { color: 0xe7dfcd }, face: {}, back: {} },
  async face() { return { width: 560, height: 936 }; },
  async back() { return { width: 560, height: 936 }; }
};

function crowd() {
  const root = new Tracker();
  const pool = new Map();
  const softDot = root.add(new THREE.Texture());
  const ctx = {
    tracker: root, softDot, images: { loadImage: async () => null }, titleBlock: null, scene: new THREE.Scene(),
    emoteTexture: async () => null, lightAt: () => null,
    shared: (key, make) => { let v = pool.get(key); if (!v) { v = root.add(make()); pool.set(key, v); } return v; }
  };
  const make = async (id, colour = "#d44") => { const v = new CardView({ id, name: id, colour }, skin, ctx, 1); await v.build(); return v; };
  return { root, pool, softDot, make };
}

test("a card that leaves frees its own pictures, shapes and materials, and none of what the others stand on", async () => {
  const { root, softDot, make } = crowd();
  const a = await make("a");
  const afterOne = root.size;
  const b = await make("b", "#4ad");
  assert.ok(root.size > afterOne, "a second card brings its own face, back, blob and enamel");
  assert.ok(root.size - afterOne < afterOne, "but not a second set of everything: the brass, the lacquer and the shapes are shared");
  const sharedBody = [...root.items].find((x) => x.isBufferGeometry && x.type === "RoundedBoxGeometry");
  const faceA = a.faceTex;
  let freed = { face: 0, body: 0, blob: 0, softDot: 0 };
  faceA.addEventListener("dispose", () => freed.face++);
  sharedBody.addEventListener("dispose", () => freed.body++);
  a.blob.material.addEventListener("dispose", () => freed.blob++);
  softDot.addEventListener("dispose", () => freed.softDot++);
  a.dispose();
  assert.deepEqual(freed, { face: 1, body: 0, blob: 1, softDot: 0 }, "a's own are freed; the shared body and the shared dot are not");
  assert.equal(root.size, afterOne, "the tracker holds a's things no longer: only the first card's share was ever extra");
  assert.equal(b.faceTex.image.width, 560, "b is untouched");
  b.dispose();
  const bare = root.size;
  const c = await make("c");
  c.dispose();
  assert.equal(root.size, bare, "a card that comes and goes leaves nothing behind, however often");
});

test("an emote that is replaced frees its material; a card that goes with an emote up frees it too", async () => {
  const { root, make } = crowd();
  const card = await make("a");
  const tex = root.add(new THREE.Texture());
  card.ctx.emoteTexture = async () => tex;
  const before = root.size;
  await card.setEmote("shrug");
  assert.equal(root.size, before + 1, "one sprite material");
  await card.setEmote(null);
  assert.equal(root.size, before, "put away, it is freed");
  await card.setEmote("shrug");
  card.dispose();
  assert.ok(![...root.items].some((x) => x.isSpriteMaterial), "and with the card, whatever it was showing");
});

/* ---------------------------------------------------------------- the shadows */

const card = (over = {}) => ({ id: "a", x: 100, z: -200, lift: 0, lean: 0, yaw: 0, pitch: 0, grip: 0, breathe: 1, squash: 1, down: 0, ...over });

test("a still stage's shadows are not asked for again: a frame with the same cards says nothing is new", () => {
  const w = new ShadowWatch();
  const cards = [card(), card({ id: "b", x: -300 })];
  assert.equal(w.update(cards), true, "the first look is always news");
  for (let i = 0; i < 100; i++) assert.equal(w.update(cards.map((c) => ({ ...c }))), false);
});

test("a card that moves by a step, or leans, or is lifted, or a card that comes or goes, is news", () => {
  const w = new ShadowWatch();
  w.update([card(), card({ id: "b" })]);
  assert.equal(w.update([card({ x: 100 + STEPS.place * 1.2 }), card({ id: "b" })]), true, "a step sideways");
  assert.equal(w.update([card({ x: 100 + STEPS.place * 1.2, grip: 0.2 }), card({ id: "b" })]), true, "a stick coming out");
  assert.equal(w.update([card({ x: 100 + STEPS.place * 1.2, grip: 0.2, lean: 3 }), card({ id: "b" })]), true, "a lean");
  assert.equal(w.update([card({ x: 100 + STEPS.place * 1.2, grip: 0.2, lean: 3, down: 0.5 }), card({ id: "b" })]), true, "a fall");
  const same = [card({ x: 100 + STEPS.place * 1.2, grip: 0.2, lean: 3, down: 0.5 }), card({ id: "b" })];
  assert.equal(w.update(same), false);
  assert.equal(w.update([same[0]]), true, "someone left");
  assert.equal(w.update([same[0], card({ id: "c" })]), true, "someone came");
  assert.equal(w.update([card({ id: "d" }), card({ id: "c" })].map((c, i) => (i ? c : { ...same[0], id: "d" }))), true, "a different person in the same place");
});

test("a card held or walking moves by many steps a frame, so its shadow is drawn at every frame", () => {
  const w = new ShadowWatch();
  w.update([card()]);
  for (let i = 1; i <= 20; i++) assert.equal(w.update([card({ x: 100 + i * 3 })]), true, `a walking card, frame ${i}`);
});

test("the ambient life of a card at rest (its breathing and sway, under a degree) does not ask for new shadows; a hop or a lean of a few degrees does", () => {
  const w = new ShadowWatch();
  w.update([card()]);
  let news = 0;
  // a calm card: breathes 0.6 per cent over about four seconds and sways half a degree, 60 frames a second
  for (let i = 0; i < 600; i++) {
    const t = i / 60;
    if (w.update([card({ breathe: 1 + 0.006 * Math.sin(t * 1.4), lean: 0.5 * Math.sin(t * 2.2) })])) news++;
  }
  assert.ok(news <= 12, `${news} of 600 frames`);
  // a hop (a bouncy card, 6 units up and a lean of 2.5 degrees) is plainly news
  w.update([card()]);
  assert.equal(w.update([card({ lift: 6, lean: 2.5 })]), true);
});

/* ---------------------------------------------------------------- the pixel budget */

test("a window is drawn at the display's own scale, up to the cap and the pixel budget, and never under one to one", () => {
  const high = tierSettings("high");
  const px = (w, h, r) => w * h * r * r;
  assert.equal(pixelRatioFor(1280, 720, 1, high), 1);
  assert.equal(pixelRatioFor(2560, 1271, 1.5, high), 1.5, "the bench's own window (7.3 million pixels) is untouched");
  assert.equal(pixelRatioFor(1920, 1080, 2, high), 2, "full HD at twice is 8.3 million: within the budget");
  const crowded = pixelRatioFor(2560, 1440, 2, high);
  assert.ok(crowded < 2 && crowded > 1.4, `a 1440p window on a display scaled to 2 comes down to ${crowded.toFixed(2)}`);
  assert.ok(px(2560, 1440, crowded) <= high.maxPixels + 1, "and lands within the budget");
  assert.equal(pixelRatioFor(2560, 1440, 3, high), crowded, "the cap of 2 applies before the budget");
  assert.equal(pixelRatioFor(5120, 2880, 1, high), 1, "a window already over the budget is not drawn at less than one to one");
  assert.equal(pixelRatioFor(1280, 720, 0.75, high), 0.75, "a display that asks for less gets less");
  assert.equal(pixelRatioFor(1280, 720, undefined, high), 1, "and one that says nothing gets one to one");
  const low = tierSettings("low");
  assert.equal(pixelRatioFor(2560, 1440, 2, low), 1, "the light stage never draws above one to one");
});
